---
title: "Litestream v0.3.4 Released"
description: "The newest version of Litestream updates its license, adds Docker & ARM support, and improves recovery performance."
date: 2021-04-24T00:00:00Z
draft: false
weight: 50
contributors: ["Ben Johnson"]
---

Over the last month, we've been focused on stability & quality-of-life changes
to Litestream. We now have an [official Litestream Docker
image][litestream-docker] so you can run your backups as a sidecar to your
existing Docker image. We've also provided an [example Dockerfile][Dockerfile]
for those wanting to bundle their application with Litestream into a single
Docker container using [s6][s6-overlay].

We've added support for ARMv6, ARMv7, & ARM64 which means you can take advantage
of Litestream on a tiny [Raspberry Pi Zero][rpi] or on a beefy [64-core Graviton
EC2 machine][graviton].

Our license has changed as well! We've move from a restrictive, copyleft GPLv3
license to a permissive Apache 2 license.

Finally, we've significantly improved the recovery performance and fixed up a
handful of bugs. Thanks to everyone who reported bugs, gave feedback, and helped
with testing!

[Dockerfile]: https://github.com/benbjohnson/litestream-s6-example/blob/main/Dockerfile
[s6-overlay]: https://github.com/just-containers/s6-overlay
[rpi]: https://www.raspberrypi.org/products/raspberry-pi-zero/
[graviton]: https://aws.amazon.com/ec2/graviton/


## Docker support

The most frequent question asked about Litestream since the project started has
been, _"how do I run this on Docker?"_ Whether you like Docker or not, the fact
is that much of the tech world has moved to containerized deployments.

In traditional applications, developers deploy their stateless, single-process
application within a Docker container and it connects to a stateful database.
However, with Litestream, not only is the container stateful but Litestream also
runs as a separate process.

There are a couple ways to Dockerize your application depending on your needs.
Let's take a look at some common use cases.


### Shared volume, sidecar replication

The first use case is to keep your application as a single-process container
and mount a persistent volume for your database. You can then use the [official
Litestream Docker image][litestream-docker] ([#156][]) to mount the
same volume and replicate from there.

You can find documentation for running a shared volume in the [_Running as a
sidecar_][sidecar] section of our [Docker guide][docker-guide].

[litestream-docker]: https://hub.docker.com/r/litestream/litestream/
[sidecar]: /guides/docker/#running-as-a-sidecar
[docker-guide]: /guides/docker/
[#156]: https://github.com/benbjohnson/litestream/pull/156


### Single container, multiple processes

Not all deployments support a sidecar container. For example, [fly.io][]
provides an excellent, simple platform for deploying applications but the caveat
is that those applications need to be in a single container.

Fortunately, there's a great solution called [s6-overlay][] for running your
application as well as Litestream in a single container. It uses a simple init
system called [s6][] that forwards signals, restarts background processes, and
allows you to teardown the container when your main application finishes.

You can run this setup with a mounted volume to persist your database between
deployments or you can run this ephemerally so that your database is restored
from S3 on each deploy. Personally, I recommend using a persistent disk as it
will minimize downtime during deployments. However, if you have a small,
low-write database then an ephemeral disk can work just fine. You can find 
an example of this ephemeral method on Michael Lynch's [logpaste][] project.

You can find an example application & walkthrough on the
[litestream-s6-example][] repository.

[fly.io]: https://fly.io/
[s6]: http://skarnet.org/software/s6/overview.html
[litestream-s6-example]: https://github.com/benbjohnson/litestream-s6-example
[logpaste]: https://github.com/mtlynch/logpaste

### Making Docker sing

Building a Dockerfile for Litestream was pretty straightforward, however, making
it something developers want to use is an entirely different story. We've added
a bunch of small improvements that make deploying much simpler.

First, we've added a `-if-replica-exists` flag to the `restore` command
([#131][]). This will cause Litestream to exit successfully if there are no
replicas available to restore from. This simple change makes it easy to create
an initialization script that will restore if a database replica is available
but otherwise will let the application create a new database on the first run.

Next, we fixed up the shutdown process for Litestream so that it will flush all
outstanding writes ([#132][]) and it will correctly catch `SIGTERM` ([#133][]).
These two fixes allow users to run an empheral disk to help ensure recent writes
get backed up.

In the Docker world, environment variables work better than configuration files,
however, Litestream needs configuration files for complex configuration options.
To support both of these options, we've added environment variable expansion in
configuration files ([#157][]). This means you can bundle a config into your
container and define your own environment variables that will be evaluated
before your configuration file is read.

Finally, we've shrunk down the binary sizes on the release builds ([#159][]) and
have included static builds in our releases ([#130][]). Docker container sizes
can easily explode into the hundreds of megabytes or even gigabytes. The Linux
amd64 binary for Litestream is now 17.4MB.

[#130]: https://github.com/benbjohnson/litestream/pull/130
[#131]: https://github.com/benbjohnson/litestream/pull/131
[#132]: https://github.com/benbjohnson/litestream/pull/132
[#133]: https://github.com/benbjohnson/litestream/pull/133
[#157]: https://github.com/benbjohnson/litestream/pull/157
[#159]: https://github.com/benbjohnson/litestream/pull/159


## ARM support

SQLite is sometimes called an "edge database" in that it can be run on small ARM
devices  far away from data centers. Not only do these devices have limited
resources but can also have intermittent internet connections.

We've added release builds for 32-bit ARM (`arm6`, `arm7`) and 64-bit ARM
(`arm64`) ([#148][], [#151][]). The 32-bit ARM processors are typically found in
smaller or older devices like the [Raspberry Pi Zero][rpi] while the 64-bit
processors are gaining popularity in data centers such as AWS' new [Graviton
series][graviton].

Apple recently released their Apple Silicon M1 chip and we do not have a release
build for it yet but we are planning to add it in the future. If you are
interested in using Litestream with the new Macs, please add a comment or add a
reaction on [issue #175][#175] and that'll help us prioritize it.

[#148]: https://github.com/benbjohnson/litestream/pull/148
[#151]: https://github.com/benbjohnson/litestream/pull/151
[#175]: https://github.com/benbjohnson/litestream/pull/175


## Open & permissive licensing

When Litestream first started, it used [GPLv3][]. The GPL is known for what's
called a "copyleft" provision which means that anyone who changes the code or
creates a derivative work needs to release their code as open source as well.
I've always used very permissive licenses (e.g. [MIT][]) in other projects but I
felt that I could try using GPL for Litestream because it's a standalone
library.

However, I found the license to be overly restrictive. While Litestream started
as a separate standalone tool, I would like to release it as an embeddable
library in the future. A GPL license would require anyone who includes
Litestream in their application to also release their code as open source which
seemed unreasonable. Even an LGPL license would be restrictive as  Go uses
static compilation.

I've had many people theorize why I open sourced Litestream—some think I want
to make it into a business, others think I want acclaim. The reason I open
sourced Litestream is actually quite simple—I think the best software is
software that gets used. Open source is a fantastic means of distribution and
the more people that use Litestream, give feedback, & share ideas, the better
it will be.

The GPL is antithetical to my goal. It restricts usage rather than encourages
it. Because of that, I've changed Litestream to an [Apache 2][APLv2] license
([#168][]). After researching and asking around, I found it to be the best
choice for a permissive license. While the MIT & BSD licenses are wonderful in
their simplicity, the Apache 2 license seems to be more friendly to lawyers who,
at the end of the day, are really who licenses are for.

[GPLv3]: https://www.gnu.org/licenses/gpl-3.0.en.html
[MIT]: https://opensource.org/licenses/MIT
[APLv2]: https://www.apache.org/licenses/LICENSE-2.0
[#168]: https://github.com/benbjohnson/litestream/pull/168


## Improved restore performance

Hopefully you don't ever need to restore your database because of a catastrophic
event but, when you do, you want it to be fast. Litestream's recovery process
involves downloading a snapshot of your database and then replaying all
subsequent WAL files into that database.

Previously, Litestream would download a WAL file and then apply it, download
another file and apply it, etc. The download time would typically dominate the
restore time because applying the WAL file may only take a couple milliseconds.
The constant switching also meant that there wasn't always a file being
downloaded so the network device would not be saturated.

The latest version of Litestream now downloads WAL files in parallel and queues
them up on disk to be processed ([#167][]). By default, it will download 8 files
in parallel. This change has improved recovery time by 3-4x. You can increase
the number of parallel downloads by setting the `-parallelism` flag:

```sh
$ litestream restore -parallelism 16 /path/to/db
```

If you need faster recovery, you should also consider setting the
`snapshot-interval` for your replica to a lower duration (e.g. `1h`).

There was also an poor usability when recovering by index. Previously, the
`-index` flag in the `restore` command would accept a decimal number, however,
Litestream reports the index as a hexadecimal number everywhere else. We've
fixed it so that `-index` now accepts the hex-formatted number ([#165][]):

```sh
$ litestream restore -generation xxxxxxxxxxxxxxxx -index 000002bc /path/to/db
```

We've also improved logging for restores to help identify bottlenecks ([#162][],
[#164][]), removed the `-dry-run` flag as it complicated the code ([#163][]), 
and fixed a bug around snapshot selection when recovering by index ([#166][]).

[#162]: https://github.com/benbjohnson/litestream/pull/162
[#163]: https://github.com/benbjohnson/litestream/pull/163
[#164]: https://github.com/benbjohnson/litestream/pull/164
[#165]: https://github.com/benbjohnson/litestream/pull/165
[#166]: https://github.com/benbjohnson/litestream/pull/166
[#167]: https://github.com/benbjohnson/litestream/pull/167


## Reduced lock contention

Litestream is able to run as a separate process because SQLite is built as a
multi-process database. However, applications typically need to set a timeout on
their connection called `busy_timeout` to avoid returning an error if another
process obtains a brief write lock at the same time they want a write lock. You
can read more about it in our [Tips & Caveats](/tips) section on our site.

Originally, Litestream would frequently obtain a very brief write lock to ensure
the WAL was at the end of a transaction before copying it to Litestream's shadow
WAL. However, we later updated Litestream to validate transaction boundaries
itself so this lock was no longer needed. We updated Litestream to remove this
lock ([#104][]) but found some timing issues when obtaining snapshots so we had
to remove it ([#108][]).

We've done more testing and have been able to successfully remove the lock again
by adding some additional read locks around snapshots ([#170][]). While there
is still a write lock during checkpointing, write locks will be significantly
less frequent.

[#104]: https://github.com/benbjohnson/litestream/pull/104
[#108]: https://github.com/benbjohnson/litestream/pull/108
[#170]: https://github.com/benbjohnson/litestream/pull/170


## Other bug fixes

First of all, thanks to everyone who reports bugs to our [GitHub repo][gh]. It 
makes a world of difference and we prioritize those to be fixed first. In this
relase, we've fixed the following bugs & usability issues:

- Added `skip-verify` to replicas to allow use with MinIO self-signed certificates ([#141][])
- Removed confusing reference to "wal" in error message when invalid databases are opened ([#154][])
- Omitted load extensions from static builds to avoid warning messages ([#158][])
- Fix flakey WAL filesystem timestamp test ([#161][])

We've also started allowing for setting `LITESTREAM_ACCESS_KEY_ID` &
`LITESTREAM_SECRET_ACCESS_KEY` environment variables instead of the original
`AWS` prefixed versions ([#169][]). The AWS-prefixed versions still work but
some users where confused to use those for non-AWS S3-compatible services:

```sh
export LITESTREAM_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxxxxx
export LITESTREAM_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

[gh]: https://github.com/benbjohnson/litestream
[#141]: https://github.com/benbjohnson/litestream/pull/141
[#154]: https://github.com/benbjohnson/litestream/pull/154
[#158]: https://github.com/benbjohnson/litestream/pull/158
[#161]: https://github.com/benbjohnson/litestream/pull/161
[#169]: https://github.com/benbjohnson/litestream/pull/169



## Conclusion

We continue to focus on stability & usability with Litestream v0.3.4. We've
expanded our deployment options to include Docker containers & ARM processors,
we've opened up our code by switching to a permissive Apache 2 license, and
we've significantly improved our time to restore.

Upcoming work on the next version of Litestream ([v0.3.5][]) will include a
refactor of the replica system to make it easier to add new replica types
([#135][]). This will enable better support for major cloud vendor storage such
as Azure Blob Storage ([#134][]) & Google Cloud Storage ([#69][]) as well as
older protocols such as SFTP ([#140][]).

If you're interested in hearing more, please [join our Slack][slack], [book an
office hours][calendly], or [follow Litestream on Twitter][twitter] for updates.

[#135]: https://github.com/benbjohnson/litestream/pull/135
[#134]: https://github.com/benbjohnson/litestream/pull/134
[#69]: https://github.com/benbjohnson/litestream/pull/69
[#140]: https://github.com/benbjohnson/litestream/pull/140
[v0.3.5]: https://github.com/benbjohnson/litestream/milestone/6
[replica]: https://github.com/benbjohnson/litestream/issues/8
[slack]: https://join.slack.com/t/litestream/shared_invite/zt-n0j4s3ci-lx1JziR3bV6L2NMF723H3Q
[calendly]: https://calendly.com/benbjohnson/litestream
[twitter]: https://twitter.com/litestreamio
