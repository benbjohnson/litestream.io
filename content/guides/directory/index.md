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


## Configuration

Directory replication uses the `directory` field instead of `path` in your
database configuration. Litestream will scan the directory and replicate all
matching SQLite databases.

```yaml
dbs:
  - directory: /var/lib/tenants
    pattern: "*.db"
    recursive: true
    replica:
      type: s3
      bucket: backups
      path: tenants
```


### Configuration options

Directory configurations support the following options:

- `directory`—Absolute path to the directory containing databases
- `pattern`—Glob pattern to match database files (default: `*.db`)
- `recursive`—Scan subdirectories when `true` (default: `false`)

All standard database options like `monitor-interval` and `checkpoint-interval`
are also supported and apply to each discovered database.


### Pattern matching

The `pattern` field accepts glob patterns to filter which files are replicated:

```yaml
dbs:
  # Match only .db files
  - directory: /var/lib/data
    pattern: "*.db"
    replica:
      url: s3://mybucket/data

  # Match SQLite files with different extensions
  - directory: /var/lib/data
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
  - directory: /var/lib/databases
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
  - directory: /var/lib/databases
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
| `/var/lib/databases/tenant1.db` | `backups/prod/tenant1.db/ltx/...` |
| `/var/lib/databases/team-a/db2.db` | `backups/prod/team-a/db2.db/ltx/...` |

The relative path from the directory root is appended to the configured replica
path, preserving the directory structure.


## Use cases

### Multi-tenant applications

For applications where each tenant has their own database file:

```yaml
dbs:
  - directory: /var/lib/tenants
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
  - directory: /var/lib/customers
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
  - directory: /var/lib/tenants
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

- **Discovery timing**: Litestream discovers databases when it starts. New
  databases created after startup will not be replicated until Litestream is
  restarted.

- **Database validation**: Only files with valid SQLite headers are replicated.
  Files matching the pattern but not containing SQLite data are skipped.

- **Storage backend compatibility**: Directory replication works with all
  storage backends including S3, GCS, Azure Blob Storage, SFTP, and local files.

- **Unique paths**: Each database must have a unique relative path within the
  directory. Litestream uses the relative path to generate unique replica paths.
