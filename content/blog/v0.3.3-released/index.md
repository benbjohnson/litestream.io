---
title: "Litestream v0.3.3 Released"
description: "The newest version of Litestream brings support for Windows and support for S3-compatible storage such as MinIO. It also includes a dozen quality-of-life fixes and expands documentation."
date: 2021-03-16T00:00:00Z
draft: false
weight: 50
contributors: ["Ben Johnson"]
---

The newest version of Litestream brings support for Windows and support for
S3-compatible storage such as MinIO. It also includes over a dozen
quality-of-life fixes and expands documentation.

Beyond code changes, we've opened up a Slack channel & started office hours to
help folks get up and running. Let's run through some of these changes.


## Slack & office hours

While Litestream has an active [GitHub Discussions board][discussion] and
[Issues section][issues], sometimes you want to have synchronous communication
to quickly figure out an issue or just to get up and running.

We now have our own [Litestream Slack][slack] with over two dozen Litestreamers
(or Litestreamites or whatever name you might call us) chatting about SQLite and
how to best configure, run, and backup our applications. It's been a great way
to quickly discuss new features, hear about use cases, and talk about
documentation changes.

But sometimes text communication can be limiting so I've introduced weekly 
office hours for Litestream every Friday. [Sign up on Calendly][calendly] to
book a 20 minute spot to discuss anything SQLite or Litestream related. I've
already had a great discussion with [Simon Willison][simonw] about his
[Datasette][datasette] project where we brainstormed ways to improve performance
and to scale out.

[discussion]: https://github.com/benbjohnson/litestream/discussions
[issues]: https://github.com/benbjohnson/litestream/issues
[slack]: https://join.slack.com/t/litestream/shared_invite/zt-n0j4s3ci-lx1JziR3bV6L2NMF723H3Q
[calendly]: https://calendly.com/benbjohnson/litestream
[simonw]: https://twitter.com/simonw
[datasette]: https://datasette.io/


## Windows support

_Note: Windows support has been removed in v0.4.0_

~~Litestream now ships with prebuilt binaries for Windows so you can run it as a
standalone application or as a background Windows Service. It integrates in
with the Windows Event Log so you can it can collect and manage log events.~~

~~You can find a guide for running _Litestream as a Windows Service_ in
the documentation section of the web site. We'd love to hear feedback on the
setup and if anything could be improved.~~



## S3-compatible storage

AWS S3's API has become the de facto API for object storage and most platforms
support it. The previous version of Litestream was built to use this API but it 
needed a few tweaks to support all S3-compatible storage solutions. It also adds
some built-in support for several popular services so they can easily be used as
a replica URL in Litestream.

For this release, Litestream has been tested on [MinIO][minio], [Backblaze
B2][b2], [DigitalOcean Spaces][do], & [Linode Object Storage][linode].

So why would you choose a different object storage backend besides AWS S3? It
depends on your use case.

MinIO works great if you need to manage your own object storage solution. It's
easy to get started—so easy that we've updated our [_Getting Started_][gs]
section to use it. 

Backblaze B2 is a great solution if you want to reduce your AWS S3 spend. It's
pricing is significantly cheaper than the major cloud providers. Litestream is
already quite cheap to run on AWS but you may already have a Backblaze account
for other storage.

DigitalOcean & Linode object storage have been integrated because many
developers already run on these platforms since they provide low-cost VPS
servers. Adding in their object storage platforms makes it easy to run
everything in one place.

You can find walkthroughs for each of these platforms in our [Guides][guides]
section.

[minio]: https://min.io/
[b2]: https://www.backblaze.com/b2
[do]: https://www.digitalocean.com/products/spaces/
[linode]: https://www.linode.com/products/object-storage/
[gs]: /getting-started/
[guides]: /guides/


## Snapshot interval

Litestream works by backing up a point-in-time snapshot of your database and
then incrementally backing up new write-ahead log (WAL) frames. When you need
to restore your database, Litestream pulls down that snapshot and then replays
every WAL frame that has been written since. You can set a retention period so
that your database will re-snapshot periodically and remove old WAL frames.

That normally works well but sometimes you may wish to snapshot more often but
still retain changes for a longer period. This helps improve recovery time as
the database doesn't need to replay as many WAL frames.

The newest version of Litestream now includes a separate ["snapshot interval"
configuration setting][snapshot]:

```yaml
dbs:
  - path: /path/to/db
    replicas:
      - url: s3://mybkt.litestream.io/db
        retention: 24h
        snapshot-interval: 4h
```

In this example configuration file, we are keeping our backups for 24 hours but
we'll re-snapshot the database every 4 hours. This means that we'll have 6 full
snapshots of our database in S3 at any given time. When we restore, we'll only
need to restore up to four hours of WAL frames instead of a full day's worth.

[snapshot]: https://github.com/benbjohnson/litestream/pull/84


## Quality-of-life improvements

The primary goal of Litestream is to keep your SQLite data safely backed up
without you having to think about it too much. Set it and forget it. To this
end, quality-of-life improvements and documentation are top priorities because
they make running Litestream even easier.

Some of these improvements include [making smarter defaults with the
configuration][120] and [preventing misuse of the config & command line flags][94], 
You can read the full changelog of improvements on the [release page][release].

[94]: https://github.com/benbjohnson/litestream/pull/94
[120]: https://github.com/benbjohnson/litestream/pull/120
[release]: https://github.com/benbjohnson/litestream/releases/tag/v0.3.3


## Bug fixes

The previous version of Litestream has generally been stable but there were a
few bugs that folks encountered that have been fixed.

### Failure to retry on init error

There was a bug where Litestream would would not attempt to [reinitialize
the connection with a database if it failed on startup][82]. Database failures
can happen for many reasons and many of them are temporary so Litestream retries
all actions periodically. Litestream will now correctly retry even if an error
occurs on startup.

[82]: https://github.com/benbjohnson/litestream/pull/82


### Fix locks on operating systems without OFD locks

[Open file descriptor (OFD) locks][ofd] are locks that are handled per file
descriptor. If you lock a file descriptor then unlocking the same file on a
different descriptor won't affect the first one. That makes sense.

Unfortunately, that's not how all operating systems work. Some operating systems
lock per-process so you can mess up your locks if you have multiple file
descriptors for the same file.

This is a problem for Litestream as it requires a lock on the file to prevent
SQLite from deleting the WAL file. The lock handling has been [fixed for non-OFD
lock operating systems][93] so they are now safe to use.

[ofd]: https://www.gnu.org/software/libc/manual/html_node/Open-File-Description-Locks.html
[93]: https://github.com/benbjohnson/litestream/pull/93


## Conclusion

The latest version of Litestream includes huge improvements for usability and
helping folks run it on more systems. But the work isn't done yet!

Upcoming work on the next version of Litestream (v0.3.4) will include better
support for ARM architectures and documentation on running Litestream in Docker
& Kubernetes. You can find a full list of upcoming work on the [v0.3.4
milestone][v0.3.4]

The next major work will be on [live read replication][replica] for Litestream
v0.4.0. This will allow users to scale out their single-node SQLite database to
multiple servers.

_Yes, you will be able to run a cluster of SQLite servers!_

Sounds ridiculous, sure, but there are actually some really great use cases.
First, it lets you cheaply scale up a service to multiple servers to improve
your query performance. Second, it opens up some exciting possibilities
for moving read queries to the edge to get extremely low latency requests.

If you're interested in hearing more, please [join our Slack][slack], [book an
office hours][calendly], or [follow Litestream on Twitter][twitter] for updates.

[v0.3.4]: https://github.com/benbjohnson/litestream/milestone/5
[replica]: https://github.com/benbjohnson/litestream/issues/8
[twitter]: https://twitter.com/litestreamio
