---
title : "Replicating to an SFTP Server"
date: 2021-06-02T00:00:00Z
layout: docs
menu:
  docs:
    parent: "replica-guides"
weight: 460
---

This guide will show you how to use Litestream to replicate to a remote SFTP
server. You will need to have an SFTP server already set up and running.


## Usage

### Command line usage

You can specify your SFTP replica using a replica URL on the command line. For
example, you can replicate a database to an SFTP server with the following
command. _Replace the placeholders with your username, password, server, & path._

```sh
litestream replicate /path/to/db sftp://USER:PASSWORD@HOST:PORT/PATH
```

You can later restore your database from SFTP to a local `my.db` path with the
following command.

```sh
litestream restore -o my.db sftp://USER:PASSWORD@HOST:PORT/PATH
```

Note that the port is optional if you are using the default SSH port (`22`).
Also note that that the `PATH` should be an absolute path and not relative to
the present working directory. If you need to use a relative path, you must use
a configuration file.


### Configuration file usage

Litestream is typically run as a background service which uses a [configuration
file][]. You can configure a replica for your database using the `url` format.

```yaml
dbs:
  - path: /path/to/local/db
    replica:
      url: sftp://USER:PASSWORD@HOST:PORT/PATH
```

Or you can expand your configuration into multiple fields:

```yaml
dbs:
  - path: /path/to/local/db
    replica:
      type:     sftp
      host:     HOST:PORT
      user:     USER
      password: PASSWORD
      path:     PATH
      host-key: HOSTKEY
```

The `path` is treated as a relative path from the present working directory
unless there is a leading slash.

You can also specify an SSH key file path instead of using a password The key
file path should point to your private key.

```yaml
dbs:
  - path: /path/to/local/db
    replica:
      url: sftp://USER@HOST:PORT/PATH
      key-path: /path/to/id_rsa
```


## Concurrent Writes

By default, Litestream enables concurrent writes for SFTP connections, which
improves upload throughput by allowing multiple write operations to proceed
simultaneously.

### Trade-offs

Concurrent writes offer better performance but with a trade-off:

- **Enabled (default)**: Higher throughput during replication, but if an upload
  fails, Litestream must re-upload the entire file from the beginning.

- **Disabled**: Slightly slower uploads, but failed transfers can resume from
  the last successfully written chunk.

### When to disable concurrent writes

Consider disabling concurrent writes if you have:

- **Unreliable network connections**: If your connection to the SFTP server
  frequently drops, disabling concurrent writes allows Litestream to resume
  interrupted uploads rather than starting over.

- **Very large databases**: For databases several gigabytes in size,
  re-uploading from scratch after a failure can be costly in terms of time
  and bandwidth.

- **Bandwidth constraints**: In environments where bandwidth is limited or
  metered, the ability to resume partial uploads may be more important than
  raw throughput.

### Configuration

To disable concurrent writes, add the `concurrent-writes` option to your
configuration:

```yaml
dbs:
  - path: /path/to/local/db
    replica:
      type:              sftp
      host:              HOST:PORT
      user:              USER
      password:          PASSWORD
      path:              PATH
      concurrent-writes: false
```

The `concurrent-writes` option accepts `true` (default) or `false`.

### Host Keys

The `host-key` option specifies the expected public host key of the SFTP server.
If not set, the key of the host will not be verified and instead a warning will be logged:

> sftp host key not verified host=example.com

You can obtain the host key by running
> ssh-keyscan example.com

Then set the value in your configuration:

> sftp:
>  host: example.com
>  host-key: "ecdsa-sha2-nistp256 ..."

If there is a `host-key` mismatch Litestream will abort with an error.

## See Also

- [Troubleshooting](/docs/troubleshooting) - Common issues and solutions
- [Configuration Reference](/reference/config) - Complete configuration options


[configuration file]: /reference/config
