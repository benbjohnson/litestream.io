---
title : "Replicating to a Local File Path"
date: 2025-12-04T00:00:00Z
layout: docs
menu:
  docs:
    parent: "replica-guides"
weight: 470
---

This guide will show you how to use Litestream to replicate your SQLite database
to another file on your local filesystem. File-based replication is useful for:

- Creating local backups on a separate disk or partition
- Testing Litestream before setting up cloud storage
- Replicating to network-attached storage (NAS)
- Development and debugging workflows


## Usage

### Command line usage

You can replicate to a local file path from the command line by specifying both
the source database and the destination URL using the `file://` scheme:

```sh
litestream replicate /path/to/db file:///path/to/replica
```

The replica path should be a directory where Litestream will store its
replication data. Litestream does not create a simple copy of your database—it
stores WAL segments and snapshots that allow point-in-time recovery.

You can later restore your database from the file replica to a new location:

```sh
litestream restore -o /path/to/restored.db file:///path/to/replica
```


### Configuration file usage

Litestream is typically run as a background service which uses a [configuration
file][]. You can configure a file replica by specifying a local path:

```yaml
dbs:
  - path: /var/lib/myapp/data.db
    replica:
      path: /backup/litestream/data
```

If no `type` field is specified and a `url` is not used, Litestream assumes the
replica type is `file`.

You can also explicitly specify the type:

```yaml
dbs:
  - path: /var/lib/myapp/data.db
    replica:
      type: file
      path: /backup/litestream/data
```


## Use cases

### Local backup to a separate disk

To protect against disk failure, replicate to a different physical disk:

```yaml
dbs:
  - path: /mnt/primary/app.db
    replica:
      path: /mnt/backup/litestream/app
```

### Network-attached storage (NAS)

Replicate to a mounted NAS for centralized backup:

```yaml
dbs:
  - path: /var/lib/app/data.db
    replica:
      path: /mnt/nas/backups/litestream/data
```

### Development and testing

File replication is useful for testing your backup and restore process locally
before deploying to production with cloud storage:

```sh
# Create a test database
sqlite3 ./dev.db "PRAGMA journal_mode=WAL; CREATE TABLE test(x);"

# Start replication (use $PWD for current directory)
litestream replicate ./dev.db file://$PWD/replica

# In another terminal, make changes to dev.db
# Then test restoration
litestream restore -o ./restored.db file://$PWD/replica
```

Note: The `file://` URL scheme requires an absolute path. Use `$PWD` to
reference the current working directory. For relative paths, use a configuration
file instead.


## Considerations

- **Disk failure**: File replicas on the same disk as your database do not
  protect against disk failure. Use a separate disk or combine with cloud
  storage for better durability.

- **Storage space**: Litestream retains historical data based on your
  [retention settings][]. Monitor disk space on your replica destination.

- **Network mounts**: When replicating to network-attached storage, ensure the
  mount is reliable and has sufficient bandwidth. Network interruptions may
  cause temporary replication delays.


[configuration file]: /reference/config
[retention settings]: /reference/config#retention-period
