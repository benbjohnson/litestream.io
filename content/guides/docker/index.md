---
title : "Running in a Docker container"
date: 2021-03-08T00:00:00Z
layout: docs
menu:
  docs:
    parent: "infrastructure-guides"
weight: 300
---

This guide will show you how to run Litestream within a Docker container either
as a sidecar or within the same container as your application. You will need a
[Docker][docker] installed on your machine for this guide.

{{< alert icon="❗️" text="The host and container must use the same OS. For example, running SQLite on macOS and running Litestream on Linux will not work as they use different locking mechanisms." >}}


[docker]: https://www.docker.com/


## Overview

Docker is a common tool for deploying applications and Litestream can be easily
integrated into your workflow. Docker typically recommends running one
application per container and Litestream can be run as a sidecar to another
container. However, some deployment models do not support this so we'll show
you how to run your application & Litestream in the same container as well.


## Hardened scratch image

{{< since version="0.5.9" >}} Litestream publishes a hardened, scratch-based
Docker image alongside the default Debian-based image. The scratch variant
contains only the statically-linked Litestream binary — no shell, no package
manager, and no OS distribution files.

### Tag strategy

| Variant | Tags | Base |
|---------|------|------|
| Default (Debian) | `latest`, `0.5.9` | `debian:bookworm-slim` |
| Hardened (Scratch) | `latest-scratch`, `0.5.9-scratch` | `scratch` |

Existing users are unaffected — the default tags (`latest`, version numbers)
continue to produce the Debian image.

### When to use the scratch image

- You need the smallest possible image with a minimal attack surface
- Your security policy requires containers with no shell access
- You want to reduce CVE surface area from OS packages

{{< alert icon="⚠️" text="The scratch image omits the loadable VFS extension (.so). VFS extensions require glibc, which is not available in a scratch image. If your workflow depends on custom VFS extensions, use the default Debian image instead." >}}

### Pulling the scratch image

```sh
docker pull litestream/litestream:latest-scratch
```

Replace `litestream/litestream` with `litestream/litestream:latest-scratch` (or
a version-pinned tag like `0.5.9-scratch`) in your Dockerfiles and run commands.


## Running as a sidecar

Litestream provides an [official image][image] via Docker Hub. You can use it
with a configuration file or with a replica URL.


### Using a configuration file

Typically, it's recommended to run Litestream using a configuration file as it
provides more configuration options. First, create your configuration file:

```yml
access-key-id:     YOUR_ACCESS_KEY_ID
secret-access-key: YOUR_SECRET_ACCESS_KEY

dbs:
  - path: /data/db
    replica:
      url: s3://BUCKET/db
```

Note that the database `path` is using the `/data` path in your Docker container.
Also, you can specify access key & secret key via environment variables instead.

Next, you'll need to attach both your data directory and your configuration
file via a volume:

```sh
docker run \
  -v /local/path/to/data:/data \
  -v /local/path/to/litestream.yml:/etc/litestream.yml \
  litestream/litestream replicate
```

You can also use named volumes instead of absolute paths. See Docker's [Use
volumes][volumes] documentation for more information about which one to use.

Now that Litestream is running, you can start your application and mount the
same data volume.


### Using a replica URL

For basic replication of a single database, you can set your S3 credentials via
environment variables, mount a volume to read from, and specify the path and
replica as arguments:

```sh
docker run \
  --env LITESTREAM_ACCESS_KEY_ID \
  --env LITESTREAM_SECRET_ACCESS_KEY \
  -v /local/path/to/data:/data \
  litestream/litestream replicate /data/db s3://BUCKET/db
```

This command will use the `LITESTREAM_ACCESS_KEY_ID` and `LITESTREAM_SECRET_ACCESS_KEY`
environment variables in your current session and pass those into your Docker
container. You can also set the values explicitly using the `-e` flag.

The command then mounts a volume from your localpath to the `/data` directory
inside the container.

Finally, the `replicate` command will replicate data from the `db` database file
in your `/data` volume to an S3 bucket. You'll need to replace `BUCKET` with the
name of your bucket.

[image]: https://hub.docker.com/r/litestream/litestream



## CA Certificates

{{< since version="0.5.8" >}} Litestream embeds a fallback root CA certificate
bundle. The Go TLS stack automatically uses this embedded bundle when the system
certificate store is unavailable or empty.

This means minimal container images (`scratch`, `distroless`, `busybox`) **no
longer need CA certificates copied or installed** for HTTPS connections to cloud
storage providers (S3, GCS, Azure, etc.). You can remove these steps from your
Dockerfiles:

- `COPY --from=... /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/`
- `RUN apk add --no-cache ca-certificates`
- `RUN apt-get install -y ca-certificates`

This simplifies container setup and reduces image size.


## Running in the same container

If you are deploying to a service like [Fly.io][fly] that only uses a single
container, you can bundle both your application and Litestream together using
Litestream's built-in process supervision. You can specify your application's
process and flags by passing them to the `-exec` flag:

```sh
litestream replicate -exec "myapp -myflag myarg"
```

Or you can pass them in via the config file:

```sh
exec: myapp -myflag myarg
dbs:
  - path: /path/to/db
```

Litestream will monitor your application's process and automatically shutdown
when it closes. You can find an example application in the
[litestream-docker-example][] repository.

If you need to monitor multiple application processes, you can also use [s6][]
as a process supervisor. s6 provides a simple init system for managing multiple
processes. It is wrapped by the [s6-overlay] project to provide this service to
Docker containers. You can find a small example application in the
[litestream-s6-example][] repository.

## Volume storage considerations

SQLite uses [WAL mode][wal] for concurrent read access and durability. WAL mode
relies on shared memory (`mmap`) and file locking to coordinate between
processes. This has important implications for how you configure Docker volumes.

### Supported configurations

**Local volumes (recommended)**: Docker volumes backed by local storage on the
host machine work correctly with SQLite and Litestream. This includes:

- Named volumes (`docker volume create mydata`)
- Bind mounts to local directories (`-v /local/path:/container/path`)
- Block storage devices (AWS EBS, GCE Persistent Disk, etc.)

**Same-kernel containers**: When running Docker on Linux, multiple containers
sharing a volume will work correctly because they share the same kernel and can
coordinate locks properly. This is the standard sidecar pattern—your application
and Litestream containers both mount the same volume and access the same
database file.

### Unsupported configurations

{{< alert icon="⚠️" text="Network filesystems and cross-OS volumes can cause database corruption. Avoid these configurations." >}}

**Network-mounted volumes**: SQLite's locking mechanism does not work reliably
over network filesystems:

- NFS (all versions)
- SMB/CIFS
- GlusterFS
- Other distributed filesystems

The [SQLite documentation][sqlite-nfs] explicitly warns against using SQLite on
network filesystems because `fcntl()` file locking does not work correctly
across network boundaries. Even if operations appear to succeed, data corruption
can occur silently.

**Docker Desktop (macOS/Windows)**: When running Docker Desktop on macOS or
Windows, the Linux containers run inside a virtual machine. Volumes mounted from
the host filesystem use a network filesystem layer to bridge the VM boundary.
This can cause WAL mode failures and database corruption.

For development on macOS or Windows:

- Use a named Docker volume instead of bind-mounting from the host
- Or disable WAL mode (not recommended for production)

### Why sidecar containers work

When your application and Litestream run as separate containers sharing the same
volume, they can safely access the same SQLite database because:

1. Both containers run on the same Docker host
2. The shared volume uses local storage (not network-mounted)
3. Both processes see the same kernel and can coordinate file locks

This is fundamentally different from mounting a database over a network
filesystem, where lock coordination cannot work correctly.

### Best practices

1. **Use local storage**: Always store SQLite databases on local volumes—either
   named volumes or locally-attached block storage.

2. **Single writer**: Ensure only one process writes to the database at a time.
   Litestream coordinates with your application through SQLite's locking, but
   only one Litestream instance should replicate a given database.

3. **Set busy_timeout**: Configure your application with
   `PRAGMA busy_timeout = 5000;` to handle brief lock contention during
   Litestream checkpoints.

4. **Avoid network mounts**: Never place SQLite databases on NFS, SMB, or other
   network filesystems—even when using Litestream.

5. **Test your configuration**: If you're unsure whether your storage supports
   proper locking, run SQLite's integrity check after writes:
   `PRAGMA integrity_check;`


## See Also

- [Getting Started](/getting-started) - Introduction to Litestream basics
- [How It Works](/how-it-works) - Understanding WAL, checkpoints, and replication
- [Troubleshooting](/docs/troubleshooting) - Common issues and solutions
- [Configuration Reference](/reference/config) - Complete configuration options


[fly]: https://fly.io/
[litestream-docker-example]: https://github.com/benbjohnson/litestream-docker-example
[s6]: http://skarnet.org/software/s6
[s6-overlay]: https://github.com/just-containers/s6-overlay
[litestream-s6-example]: https://github.com/benbjohnson/litestream-s6-example
[volumes]: https://docs.docker.com/storage/volumes/
[wal]: https://sqlite.org/wal.html
[sqlite-nfs]: https://www.sqlite.org/faq.html#q5
