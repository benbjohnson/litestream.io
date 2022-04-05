---
title: "Litestream v0.3.5 Released"
description: "The newest version of Litestream adds a slew of new replication destinations, improves Kubernetes integration, & standardizes the S3 sync interval."
date: 2021-06-03T00:00:00Z
draft: false
weight: 50
contributors: ["Ben Johnson"]
---

The main focus of this latest release has been on improving the replica code so
we can easily add new replication destinations. Additionally, we've improved
Docker integration, made quality-of-life improvements for running
Litestream in Kubernetes, adjusted the default S3 sync interval, updated
some metrics, and made a bunch  of smaller bug fixes.


## Improved replica code

Originally, Litestream only had `s3` and `file` replica types. These
had a lot of similar code but there were enough small differences in how they
behaved that we didn't try to abstract the code too much. For example, `file`
replicas don't need to worry about batching WAL segments because writes are
free. In contrast, S3 charges $0.000005 per PUT request which can add up with
frequent uploads.

After working with both implementations and planning out future replica
implementations, it became clear how to separate them. Litestream now has a
`Replica` type for managing WAL position, snapshot frequency, & retention while
the new `ReplicaClient` type provides a "dumb" client interface to the external
replica. This client is "dumb" in the sense that it is entirely stateless so  it
makes it easy to add new client types.


### Azure Blob Storage

[Azure][] is one of the largest cloud providers after AWS and, sadly, does not
support the S3 API in their blob storage service. Users could add a translation
layer to convert S3 requests to Azure's API but that's a poor experience.

We've added native support for [Azure Blob Storage][] in the latest release. It
uses the [official Azure SDK](https://github.com/Azure/azure-sdk-for-go) and you
can use it by specifying the `abs` replica type.

If you're using replica URLs, you can specify it like this:

```
abs://STORAGEACCOUNT@CONTAINERNAME/PATH
```

However, if you use the Litestream [config file][config] then you can break it out like
this:

```yml
dbs:
  - path: /path/to/local/db
    replicas:
      - type: abs
        account-name: STORAGEACCOUNT
        account-key:  ACCOUNTKEY
        bucket:       CONTAINERNAME
        path:         PATH
```

You'll need to set the `LITESTREAM_AZURE_ACCOUNT_KEY` environment variable if
you are using the URL format. You can find more details on our [_Replicating to
Azure Blob Storage guide_](/guides/azure).

[Azure]: https://azure.microsoft.com/en-us/
[Azure Blob Storage]: https://azure.microsoft.com/en-us/services/storage/blobs/
[config]: /reference/config

### Google Cloud Storage

[Google Cloud Storage] was originally supported in Litestream via its
S3-compatible API, however, it turns out that it's not all that compatible.
We've integrated the native [Google Cloud SDK][] to provide a replica client
for Google Cloud Storage which you can specify using the `gs` replica type.

The replica URL format looks like:

```
gs://BUCKET/PATH
```

While the configuration file usage looks like:

```yml
dbs:
  - path: /path/to/local/db
    replicas:
      - type:   gs
        bucket: BUCKET
        path:   PATH
```

You'll need to make sure the path to your service account key JSON file is set
to the `GOOGLE_APPLICATION_CREDENTIALS` environment variable. You can find more
details on our [_Replicating to Google Cloud Storage guide_](/guides/gs).

[Google Cloud Storage]: https://cloud.google.com/storage
[Google Cloud SDK]: https://cloud.google.com/go/storage


### SFTP

If there's one thing we love it's old school technology. Tried & true. SQLite is
a perfect example!

[Mia Bennett](https://github.com/chillfox) posted on the Litestream [discussion
board][] to suggest adding SFTP support to be able to replicate to [rsync.net][]
and we jumped on it. Huge shout out to [John Kozubik][] from rsync.net for
providing a test account!

SFTP is an FTP-like protocol that runs over SSH so it's secure and pretty easy
to setup. It's typically secured via password or SSH key file. You can use both
with Litestream.

You can specify an SFTP replica destination via replica URL:

```
sftp://USER:PASSWORD@HOST:PORT/PATH
```

Or you can use the configuration file format:

```yml
dbs:
  - path: /path/to/local/db
    replicas:
      - type:     sftp
        host:     HOST:PORT
        user:     USER
        password: PASSWORD
        path:     PATH
```

If you are using an SSH key file, you can specify its path in the config only:

```yml
dbs:
  - path: /path/to/local/db
    replicas:
      - url: sftp://USER@HOST:PORT/PATH
        key-path: /path/to/id_rsa
```

[rsync.net]: https://www.rsync.net/
[discussion board]: https://github.com/benbjohnson/litestream/discussions
[John Kozubik]: https://john.kozubik.com


## Improved Docker integration

The previous version of Litestream added quality-of-life improvements to
integrate with Docker by using [s6][] for process supervision. This worked
well but it added an additional layer of complexity for most applications 
that only need to run a single application process.

We've added subprocess execution into Litestream so you can run a single
process as a child of Litestream. This process will be monitored and Litestream
will automatically shutdown when the process exits.

You can run a child process by providing your command and args with the `-exec`
flag:

```sh
litestream replicate -exec "myapp -myflag myarg"
```

or you can specify it in your config file:

```sh
dbs:
  - path: /path/to/db
    exec: myapp -myflag myarg
```

You can find a full, working example of a Dockerized application running with
subprocess execution at the [Litestream/Docker example repo][litestream-docker-example].

[s6]: https://skarnet.org/software/s6/
[litestream-docker-example]: https://github.com/benbjohnson/litestream-docker-example


## Kubernetes deployments

Since the early days of Litestream, folks have been asking how to run it as a 
sidecar in Kubernetes. It seemed like an odd request since Litestream is meant
to simplify application deployments and [Kubernetes][] is anything by simple.
Litestream also constrains applications to a single node so it complicates 
Kubernetes deployments where most pods are stateless.

However, it turns out there are some great use cases for running Litestream in
Kubernetes. Most applications have peripheral services don't require zero
downtime or extremely high traffic. Worker and monitoring services are good
examples. Being able to run against a local SQLite database greatly simplifies
the deployment & development process.

[Sam Weston](https://twitter.com/cablespaghetti) did some great work to get
Litestream working in a Kubernetes StatefulSet with a single replica. You can
find details about configuring it and setting up autorecovery on the [_Running
in a Kubernetes Cluster guide_](/guides/kubernetes/).

[Kubernetes]: https://kubernetes.io/


## S3 sync interval changes

One of the goals of Litestream was to let you run your application on a single
server and pay almost nothing to replicate it. The goal was to target $1 per
month. S3 charges $0.000005 per upload so if Litestream uploads every 10 seconds
(or 260,000 times per month) then it would cost you about $1.30 per month. So we
picked a default sync interval of 10 seconds.

However, replicating every 10 seconds is not a great experience when folks were
going through the [Getting Started](/getting-started) tutorial so we changed
the the default to be 1 second if you were running via the command line args.

This is obviously confusing.

After some usage by the community, it became obvious that the original 10 second
sync interval was too conservative. Most applications don't have a continuous
stream of writes 24/7. For example, [Michael Lynch][] wrote about his experience
in a [blog post][] where his costs were only $0.03/month.

So we've standardized the sync interval for S3 to replicate every 1 second
regardless of if you're using the config or command line args. If you do have a
heavy, constant write load then you may want to adjust your replica's
`sync-interval` property to a higher interval.

[Michael Lynch]: https://twitter.com/deliberatecoder
[blog post]: https://mtlynch.io/litestream/


## Replica metrics

The original S3 replica had two Prometheus metrics that it published to track
the number of operations and the number of bytes used by those operations:

```
litestream_s3_operation_total{"operation"}
litestream_s3_operation_bytes{"operation"}
```

However, we have a lot more replica types now and it didn't make sense to have
separate metrics for each one. These have now been consolidated into generic
metrics with a `"replica_type"` label:

```
litestream_replica_operation_total{"replica_type","operation"}
litestream_replica_operation_bytes{"replica_type","operation"}
```

Note that each replica type reports a little differently because of how the
native library implements LIST, GET, and PUT commands.


## Miscellaneous fixes

We've fixed a few minor bugs in the latest version:

- Support older versions of Linux ([#199](https://github.com/benbjohnson/litestream/pull/199))
- Add support for [Filebase](https://filebase.com/) replica URLs ([#210](https://github.com/benbjohnson/litestream/pull/210))


## Conclusion

The latest release of Litestream greatly expands the number of replica
destinations and provides some quality of life improvements for Kubernetes
users. We're excited for the next release (v0.4.0) where we will be focused on
[live read replicas](https://github.com/benbjohnson/litestream/issues/8) to allow
users to run multiple nodes and distribute query load between them. It creates
some fantastic opportunities for building large read-heavy applications or for
reducing client latency by creating a globally-distributed SQLite database.

If you're interested in hearing more, please [join our Slack][slack], [book an
office hours][calendly], or [follow Litestream on Twitter][twitter] for updates.

[slack]: https://join.slack.com/t/litestream/shared_invite/zt-n0j4s3ci-lx1JziR3bV6L2NMF723H3Q
[calendly]: https://calendly.com/benbjohnson/litestream
[twitter]: https://twitter.com/litestreamio
