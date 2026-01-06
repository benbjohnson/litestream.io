---
title : "Directory Watcher"
date: 2025-12-04T00:00:00Z
layout: docs
menu:
  docs:
    parent: "infrastructure-guides"
weight: 340
---

This guide will show you how to use the directory watcher feature for automatic
database discovery. This is useful for multi-tenant applications where databases
are dynamically created and removed at runtime.

{{< since version="0.5.0" >}}


## Overview

Litestream supports two modes for managing multiple databases in a directory:

1. **[Static directory replication](/guides/directory)** scans a directory at
   startup and replicates all matching databases. New databases require a
   restart to be picked up.

2. **Directory watcher** monitors a directory in real-time and automatically
   starts replication for new databases within seconds. Deleted databases are
   cleanly removed from replication.

The directory watcher is ideal for:

- Multi-tenant SaaS applications with per-tenant databases
- Dynamic provisioning scenarios where databases are created on demand
- High-concurrency environments with rapid database creation


## Configuration

Enable directory watching by adding `watch: true` to your directory configuration:

```yaml
dbs:
  - dir: /var/lib/app/tenants
    pattern: "*.db"
    watch: true
    replica:
      type: s3
      bucket: my-backup-bucket
      path: tenants
```

### Configuration options

| Field | Description | Default |
|-------|-------------|---------|
| `dir` | Directory path to monitor | Required |
| `pattern` | Glob pattern for database files (e.g., `*.db`, `*.sqlite`) | Required |
| `recursive` | Monitor subdirectories | `false` |
| `watch` | Enable real-time monitoring | `false` |

### Pattern matching

The `pattern` field uses standard glob patterns to match database files:

- `*.db` matches all files ending in `.db`
- `*.sqlite` matches all files ending in `.sqlite`
- `tenant-*.db` matches files like `tenant-001.db`, `tenant-abc.db`


## Example configurations

### Flat directory structure

For applications that store all tenant databases in a single directory:

```yaml
dbs:
  - dir: /var/lib/app/databases
    pattern: "*.db"
    watch: true
    replica:
      url: s3://mybucket/databases
```

Directory structure:

```
/var/lib/app/databases/
├── tenant-001.db
├── tenant-002.db
└── tenant-003.db
```

Replica structure:

```
s3://mybucket/databases/
├── tenant-001.db/
├── tenant-002.db/
└── tenant-003.db/
```

### Nested directory structure

For applications that isolate tenants in subdirectories, enable `recursive`:

```yaml
dbs:
  - dir: /var/lib/app/tenants
    pattern: "*.db"
    recursive: true
    watch: true
    replica:
      url: s3://mybucket/tenants
```

Directory structure:

```
/var/lib/app/tenants/
├── acme-corp/
│   └── data.db
├── globex/
│   └── data.db
└── initech/
    └── data.db
```

Replica structure:

```
s3://mybucket/tenants/
├── acme-corp/data.db/
├── globex/data.db/
└── initech/data.db/
```

### Multiple patterns

To replicate different database types with different configurations, use
separate directory entries:

```yaml
dbs:
  - dir: /var/lib/app/tenants
    pattern: "*.db"
    watch: true
    replica:
      url: s3://mybucket/primary
      sync-interval: 1s

  - dir: /var/lib/app/analytics
    pattern: "*.sqlite"
    watch: true
    replica:
      url: s3://mybucket/analytics
      sync-interval: 10s
```


## Behavior

### Database discovery

When a new SQLite database file is created that matches the configured pattern:

1. The directory watcher detects the file creation event
2. Litestream validates that the file is a valid SQLite database
3. Replication begins automatically within seconds
4. The database appears in logs and metrics

Files that do not pass SQLite validation are ignored, preventing non-database
files from being picked up.

### Database removal

When a database file is deleted:

1. The directory watcher detects the file removal event
2. Litestream stops replication for that database
3. Resources are cleaned up
4. The replica data remains in storage (not deleted)

Replica data is preserved to allow recovery if needed. See
[Restoring databases](#restoring-databases) for recovery instructions. Use your
storage provider's lifecycle policies to manage old replica cleanup.

### Directory removal

When an entire directory is removed (in recursive mode):

1. All databases within that directory are removed from replication
2. Directory watches are cleaned up
3. Replica data remains in storage

### Restart behavior

On Litestream restart:

1. The directory is scanned for existing databases
2. All matching databases begin replication
3. Directory watching resumes for new files
4. Previously replicated databases that no longer exist are not cleaned up
   from storage


## Restoring databases

When using directory watcher mode, databases are not individually specified in
the configuration file. This means the standard `litestream restore <db-path>`
command won't work because Litestream can't find the database definition.

### Restoring a single database

To restore a database from a directory watcher replica, use the replica URL
directly instead of the database path:

```bash
litestream restore -o /path/to/database.sqlite s3://mybucket/databases/database.sqlite
```

If your replica requires credentials, set them via environment variables first:

```bash
export LITESTREAM_ACCESS_KEY_ID=your-access-key
export LITESTREAM_SECRET_ACCESS_KEY=your-secret-key

litestream restore -o /var/lib/app/databases/tenant-001.db \
  s3://mybucket/databases/tenant-001.db
```

### Restore path structure

The replica path follows your configuration. For a flat directory structure:

| Configuration | Database Path | Replica URL |
|---------------|---------------|-------------|
| `url: s3://mybucket/databases` | `/var/lib/app/databases/tenant-001.db` | `s3://mybucket/databases/tenant-001.db` |

For a nested directory structure with `recursive: true`:

| Configuration | Database Path | Replica URL |
|---------------|---------------|-------------|
| `url: s3://mybucket/tenants` | `/var/lib/app/tenants/acme/data.db` | `s3://mybucket/tenants/acme/data.db` |

### Listing available databases

To see what databases are available for restore, list the replica storage:

```bash
# For S3
aws s3 ls s3://mybucket/databases/

# For GCS
gsutil ls gs://mybucket/databases/

# For Azure Blob Storage
az storage blob list --container-name mycontainer --prefix databases/
```

### Restoring multiple databases

There is no built-in command to restore all databases at once. To restore
multiple databases, iterate over your replica storage and restore each one:

```bash
#!/bin/bash
export LITESTREAM_ACCESS_KEY_ID=your-access-key
export LITESTREAM_SECRET_ACCESS_KEY=your-secret-key

# List and restore all databases from S3
for db in $(aws s3 ls s3://mybucket/databases/ | awk '{print $2}' | sed 's/\/$//'); do
  echo "Restoring $db..."
  litestream restore -o "/var/lib/app/databases/$db" "s3://mybucket/databases/$db"
done
```

### Point-in-time restore

Point-in-time restore works the same way, using the replica URL:

```bash
litestream restore \
  -timestamp 2026-01-01T12:00:00Z \
  -o /var/lib/app/databases/tenant-001.db \
  s3://mybucket/databases/tenant-001.db
```


## Differences from static directory replication

| Feature | Static (`watch: false`) | Watcher (`watch: true`) |
|---------|-------------------------|-------------------------|
| New database detection | Requires restart | Automatic |
| Database removal | Requires restart | Automatic |
| Empty directory on startup | Error | Allowed |
| Resource usage | Lower | Slightly higher |
| Use case | Fixed set of databases | Dynamic provisioning |


## Troubleshooting

### Verifying database discovery

Check Litestream logs for database discovery messages:

```
INFO added database to replication path=/var/lib/app/tenants/tenant-001.db
```

### Debugging pattern matching

If databases are not being discovered, verify:

1. The `pattern` matches your file extensions
2. The `dir` path is correct and accessible
3. For nested structures, `recursive: true` is set
4. Files are valid SQLite databases (not empty or corrupted)

### Common issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Database not detected | Pattern mismatch | Verify glob pattern matches file extension |
| Subdirectory databases missing | Recursive disabled | Set `recursive: true` |
| Permission denied | Insufficient access | Verify Litestream has read access to directory |
| File not a SQLite database | Invalid file | Ensure files have valid SQLite headers |


## Performance considerations

The directory watcher adds minimal overhead:

- Uses filesystem events (fsnotify) rather than polling
- Only validates files that match the configured pattern
- SQLite validation reads only the file header

For high-volume provisioning scenarios (many databases created simultaneously),
the watcher has been tested with 20+ concurrent database creations.


## Limitations

- The `watch` option requires a `dir` configuration; it cannot be used with
  single database `path` configurations
- Pattern matching uses glob syntax, not regular expressions
- Directory watching is not available on all platforms (requires fsnotify
  support)


## See Also

- [Directory Replication](/guides/directory) - Static directory replication
- [Configuration Reference](/reference/config) - Complete configuration options
- [Troubleshooting](/docs/troubleshooting) - Common issues and solutions
