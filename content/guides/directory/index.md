---
title : "Replicating Directories"
date: 2025-12-04T00:00:00Z
layout: docs
menu:
  docs:
    parent: "replica-guides"
weight: 475
---

This guide will show you how to use Litestream to replicate entire directories
of SQLite databases. Directory replication is useful for:

- Multi-tenant applications where each tenant has their own database
- Applications managing multiple SQLite databases
- Batch replication without listing each database individually

{{< since version="0.5.3" >}}


## Configuration

Directory replication uses the `dir` field instead of `path` in your
database configuration. Litestream will scan the directory and replicate all
matching SQLite databases.

```yaml
dbs:
  - dir: /var/lib/tenants
    pattern: "*.db"
    recursive: true
    replica:
      type: s3
      bucket: backups
      path: tenants
```


### Configuration options

Directory configurations support the following options:

- `dir`—Absolute path to the directory containing databases
- `pattern`—Glob pattern to match database files (required)
- `recursive`—Scan subdirectories when `true` (default: `false`)
- `watch`—Enable real-time monitoring for new databases (default: `false`).
  See [Directory Watcher](/guides/directory-watcher) for details.
- `meta-dir`—{{< since version="0.5.13" >}} Root directory for per-database
  metadata. See [Metadata location](#metadata-location) below.

All standard database options like `monitor-interval` and `checkpoint-interval`
are also supported and apply to each discovered database.


### Pattern matching

The `pattern` field accepts glob patterns to filter which files are replicated:

```yaml
dbs:
  # Match only .db files
  - dir: /var/lib/data
    pattern: "*.db"
    replica:
      url: s3://mybucket/data

  # Match SQLite files with different extensions
  - dir: /var/lib/data
    pattern: "*.sqlite"
    replica:
      url: s3://mybucket/data
```

Litestream validates the SQLite header of each matched file to ensure only
actual SQLite databases are replicated.


### Recursive scanning

Enable recursive scanning to include databases in subdirectories:

```yaml
dbs:
  - dir: /var/lib/databases
    pattern: "*.db"
    recursive: true
    replica:
      url: s3://mybucket/backups
```

The directory structure is preserved in the replica path.


## Replica path behavior

Each database in a directory gets a unique replica path by appending its
relative path from the directory root. This ensures isolated storage with no
collision risk.

**Example configuration:**

```yaml
dbs:
  - dir: /var/lib/databases
    pattern: "*.db"
    recursive: true
    replica:
      type: s3
      bucket: backups
      path: prod
```

**Resulting replica paths:**

| Local database path | Replica path |
|---------------------|--------------|
| `/var/lib/databases/tenant1.db` | `backups/prod/tenant1.db/0000/...` |
| `/var/lib/databases/team-a/db2.db` | `backups/prod/team-a/db2.db/0000/...` |

The relative path from the directory root is appended to the configured replica
path, preserving the directory structure.


## Metadata location

{{< since version="0.5.13" >}} Litestream keeps a small amount of local metadata
for each database (transaction tracking state) in a hidden directory named
`.<database>-litestream`, placed next to each database file by default. To gather
every database's metadata under a single root instead—keeping the per-database
metadata directories out of the data directory or on separate storage—use the
`meta-dir` field:

```yaml
dbs:
  - dir: /var/lib/tenants
    pattern: "*.db"
    recursive: true
    meta-dir: /var/lib/litestream-meta
    replica:
      url: s3://mybucket/tenants
```

Each database receives a unique metadata directory under the root, mirroring its
relative path:

| Local database path | Metadata directory |
|---------------------|--------------------|
| `/var/lib/tenants/tenant1.db` | `/var/lib/litestream-meta/tenant1.db-litestream` |
| `/var/lib/tenants/team-a/db2.db` | `/var/lib/litestream-meta/team-a/db2.db-litestream` |

The `meta-dir` field is only valid with `dir:` and cannot be combined with
`meta-path`. Using it with a single `path:` database fails with
`'meta-dir' can only be used with a directory`, and setting both `meta-path` and
`meta-dir` fails with `cannot specify both 'meta-path' and 'meta-dir'`.


## Use cases

### Multi-tenant applications

For applications where each tenant has their own database file:

```yaml
dbs:
  - dir: /var/lib/tenants
    pattern: "*.db"
    replica:
      url: s3://mybucket/tenants
```

Each tenant's database is replicated independently, allowing for per-tenant
restores if needed.


### Organized by customer tier

With recursive scanning, you can organize databases by tier or region:

```yaml
dbs:
  - dir: /var/lib/customers
    pattern: "*.db"
    recursive: true
    replica:
      url: s3://mybucket/customers
```

**Directory structure:**

```text
/var/lib/customers/
├── enterprise/
│   ├── acme.db
│   └── globex.db
├── standard/
│   ├── initech.db
│   └── umbrella.db
└── trial/
    └── newcorp.db
```

All databases are replicated with their paths preserved:
`enterprise/acme.db`, `standard/initech.db`, etc.


### Mixed configuration

You can combine directory and single-database configurations:

```yaml
dbs:
  # Single critical database with specific settings
  - path: /var/lib/app/main.db
    checkpoint-interval: 30s
    replica:
      url: s3://mybucket/main
      sync-interval: 500ms

  # Directory of tenant databases with default settings
  - dir: /var/lib/tenants
    pattern: "*.db"
    replica:
      url: s3://mybucket/tenants
```


## Restoring databases

To restore a database from a directory replica, specify the full replica path
including the database filename:

```sh
# Restore a specific tenant database
litestream restore -o /tmp/tenant1.db s3://mybucket/tenants/tenant1.db
```

For recursive directories, include the subdirectory path:

```sh
# Restore from a subdirectory
litestream restore -o /tmp/acme.db s3://mybucket/customers/enterprise/acme.db
```


## Considerations

- **Discovery timing**: By default, Litestream discovers databases at startup.
  New databases created after startup require a restart to be replicated. To
  enable automatic discovery of new databases, use the
  [Directory Watcher](/guides/directory-watcher) feature with `watch: true`.

- **Database validation**: Only files with valid SQLite headers are replicated.
  Files matching the pattern but not containing SQLite data are skipped.

- **Storage backend compatibility**: Directory replication works with all
  storage backends including S3, GCS, Azure Blob Storage, SFTP, and local files.

- **Unique paths**: Each database must have a unique relative path within the
  directory. Litestream uses the relative path to generate unique replica paths.


## Next steps

- **Dynamic database discovery**: For applications that create databases at
  runtime, see the [Directory Watcher](/guides/directory-watcher) guide to
  enable automatic replication of new databases without restarting Litestream.


## See Also

- [Configuration Reference](/reference/config) - Complete configuration options
- [Troubleshooting](/docs/troubleshooting) - Common issues and solutions
