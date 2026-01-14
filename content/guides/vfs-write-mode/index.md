---
title: "VFS Write Mode"
date: 2026-01-13T00:00:00Z
layout: docs
menu:
  docs:
    parent: "replica-guides"
weight: 406
---

VFS write mode enables remote-first SQLite databases where writes sync back to
object storage. Instead of the default read-only behavior, write mode buffers
changes locally and periodically pushes them as new LTX files to the replica.

{{< alert icon="⚠️" text="Write mode assumes a single writer. Multiple concurrent writers will trigger conflict detection. Use distributed locking or application-level coordination if your workload requires concurrent writes from multiple processes." >}}


## When to use write mode

- Edge deployments where local disk is ephemeral but you need write capability.
- Serverless functions that modify a database and need durability beyond the function lifetime.
- Development and testing environments with remote-backed databases.
- Scenarios where the database should persist in object storage as the source of truth.

Write mode is ideal when you want the convenience of remote storage with the
ability to make changes, and can tolerate eventual consistency with the remote
replica.


## When NOT to use write mode

- High-concurrency write workloads requiring distributed locking.
- Applications where multiple processes need simultaneous write access.
- Latency-sensitive writes (sync interval adds delay before remote visibility).
- Production workloads requiring strong consistency guarantees.

For high-write throughput or multi-writer scenarios, use a local SQLite database
with standard Litestream replication instead.


## Prerequisites

- VFS extension built with write mode support (included in standard builds).
- A configured replica URL pointing to object storage.
- Sufficient local disk space for the write buffer.
- Understanding of the single-writer constraint.


## Configuration

Enable write mode with environment variables:

```sh
# Enable write mode
export LITESTREAM_WRITE_ENABLED=true

# Set replica URL (required)
export LITESTREAM_REPLICA_URL="s3://mybucket/mydb"

# Sync interval: how often to push changes to remote (default: 1s)
export LITESTREAM_SYNC_INTERVAL=1s

# Write buffer path: local file for crash recovery (default: temp file)
export LITESTREAM_BUFFER_PATH=/var/lib/litestream/buffer.db
```

### Configuration options

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `LITESTREAM_WRITE_ENABLED` | boolean | `false` | Enable write mode |
| `LITESTREAM_SYNC_INTERVAL` | duration | `1s` | How often to sync writes to remote |
| `LITESTREAM_BUFFER_PATH` | string | temp file | Local write buffer path for crash recovery |

### Sync interval trade-offs

| Interval | Pros | Cons |
|----------|------|------|
| 100ms | Low latency to remote visibility | Higher API costs, more network traffic |
| 1s (default) | Balanced cost/latency | 1 second delay before remote sees changes |
| 10s | Lower API costs | Higher latency, more data at risk on crash |


## How it works

Write mode operates through a local write buffer that captures all database
modifications before syncing them to remote storage:

1. **Write capture**: All SQLite writes go to a local buffer file instead of
   failing with a read-only error.

2. **Dirty page tracking**: The VFS tracks which database pages have been
   modified since the last sync.

3. **Periodic sync**: At each sync interval, dirty pages are packaged into a new
   LTX file and uploaded to the replica.

4. **Conflict detection**: Before uploading, the VFS checks if new LTX files
   appeared from another source. If so, a conflict is raised.

5. **Buffer cleanup**: After successful sync, the buffer is reset for the next
   batch of writes.

The write buffer provides crash recovery: if the process terminates before
syncing, buffered writes are preserved and can be recovered on restart.


## Creating new databases

Write mode can create databases from scratch without requiring an existing
replica. When opening a database path that does not exist remotely:

```sh
export LITESTREAM_WRITE_ENABLED=true
export LITESTREAM_REPLICA_URL="s3://mybucket/newdb"

sqlite3
sqlite> .load ./dist/litestream-vfs sqlite3_litestreamvfs_init
sqlite> .open 'file:newdb.db?vfs=litestream'
sqlite> CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);
sqlite> INSERT INTO users (name) VALUES ('Alice');
```

The first sync will create the initial LTX files in the replica location. The
database filename in the connection string is a logical name; the actual storage
location is determined by `LITESTREAM_REPLICA_URL`.


## Conflict handling

Since write mode assumes a single writer, conflicts occur when another process
writes to the same replica:

### Detection

The VFS detects conflicts by checking for new LTX files before uploading:

- If new files appeared since the last poll, a conflict is detected.
- The current sync is aborted and an error is returned to the application.

### Resolution strategies

1. **Retry with refresh**: Re-read the remote state and reapply your changes.

2. **Application-level locking**: Use external coordination (Redis, etcd, etc.)
   to ensure only one writer is active.

3. **Partition by writer**: Assign different replica paths to different writers.

4. **Accept last-writer-wins**: For idempotent operations, simply retry after
   refreshing.

Example conflict handling in Go:

```go
for retries := 0; retries < 3; retries++ {
    _, err := db.Exec("INSERT INTO events (data) VALUES (?)", eventData)
    if err == nil {
        break
    }
    if strings.Contains(err.Error(), "conflict") {
        // Refresh connection and retry
        time.Sleep(100 * time.Millisecond)
        continue
    }
    return err
}
```


## Examples

### Python

```sh
export LITESTREAM_WRITE_ENABLED=true
export LITESTREAM_REPLICA_URL="s3://mybucket/app.db"
export AWS_ACCESS_KEY_ID=AKIAxxxx
export AWS_SECRET_ACCESS_KEY=xxxx
python app.py
```

```python
import sqlite3

# Load VFS extension
loader = sqlite3.connect(":memory:")
loader.enable_load_extension(True)
loader.load_extension("./dist/litestream-vfs.so", entrypoint="sqlite3_litestreamvfs_init")
loader.close()

# Connect with write mode enabled (via environment variable)
conn = sqlite3.connect("file:app.db?vfs=litestream", uri=True)

# Writes now sync to S3
conn.execute("CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY, msg TEXT)")
conn.execute("INSERT INTO logs (msg) VALUES (?)", ("Application started",))
conn.commit()

# Query as normal
for row in conn.execute("SELECT * FROM logs"):
    print(row)
```

### Go

```go
package main

import (
    "context"
    "database/sql"
    "log"
    "os"
    "time"

    _ "github.com/mattn/go-sqlite3"
    "github.com/psanford/sqlite3vfs"

    "github.com/benbjohnson/litestream"
    "github.com/benbjohnson/litestream/s3"
)

func main() {
    client := s3.NewReplicaClient()
    client.AccessKeyID = os.Getenv("AWS_ACCESS_KEY_ID")
    client.SecretAccessKey = os.Getenv("AWS_SECRET_ACCESS_KEY")
    client.Region = "us-east-1"
    client.Bucket = "mybucket"
    client.Path = "app.db"
    if err := client.Init(context.Background()); err != nil {
        log.Fatal(err)
    }

    vfs := litestream.NewVFS(client, nil)
    vfs.WriteEnabled = true
    vfs.SyncInterval = 1 * time.Second
    vfs.BufferPath = "/tmp/litestream-buffer.db"

    if err := sqlite3vfs.RegisterVFS("litestream", vfs); err != nil {
        log.Fatal(err)
    }

    db, err := sql.Open("sqlite3", "file:app.db?vfs=litestream")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Create table and insert data
    db.Exec("CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, ts TEXT)")
    db.Exec("INSERT INTO events (ts) VALUES (datetime('now'))")

    // Query
    rows, _ := db.Query("SELECT * FROM events")
    defer rows.Close()
    for rows.Next() {
        var id int
        var ts string
        rows.Scan(&id, &ts)
        log.Printf("Event %d: %s", id, ts)
    }
}
```

### Docker Compose

```yaml
version: '3.8'

services:
  app:
    image: myapp:latest
    environment:
      - LITESTREAM_WRITE_ENABLED=true
      - LITESTREAM_REPLICA_URL=s3://mybucket/app.db
      - LITESTREAM_SYNC_INTERVAL=1s
      - LITESTREAM_BUFFER_PATH=/data/buffer.db
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
    volumes:
      - litestream-buffer:/data

volumes:
  litestream-buffer:
```

The volume ensures the write buffer persists across container restarts,
enabling crash recovery.


## Limitations & constraints

- **Single-writer assumption**: No distributed locking; conflicts detected but not prevented.
- **Sync latency**: Changes are not immediately visible to other readers until sync completes.
- **Buffer disk space**: Write buffer requires local disk proportional to write volume between syncs.
- **Crash window**: Uncommitted changes in the buffer since the last sync may be lost on crash (size depends on sync interval).
- **Conflict resolution**: Application must handle conflicts; no automatic merge or resolution.


## Troubleshooting

- **"conflict detected" errors**: Another writer modified the replica. Implement retry logic or use external locking.
- **Slow syncs**: Reduce write volume, increase sync interval, or use faster storage backend.
- **Buffer growth**: Writes are faster than syncs. Increase sync frequency or reduce write rate.
- **Permission errors on buffer path**: Ensure the buffer directory exists and is writable.


## See Also

- [VFS Read Replicas Guide](/guides/vfs) - Read-only VFS usage
- [VFS Extension Reference](/reference/vfs) - Complete configuration reference
- [How it works: VFS](/how-it-works/vfs) - Architecture details
