---
title: "VFS Hydration"
date: 2026-01-13T00:00:00Z
layout: docs
menu:
  docs:
    parent: "replica-guides"
weight: 407
---

VFS hydration restores the entire database to a local file in the background
while the VFS continues serving reads from the cache and remote storage. Once
hydration completes, all reads are served from the local file, eliminating
remote fetch latency entirely.


## When to use hydration

- Read-heavy workloads where remote latency impacts performance.
- Large databases where the cache cannot hold the full working set.
- Latency-sensitive applications that need local-disk performance after startup.
- Long-running processes that benefit from full local access after initial warm-up.

Hydration is ideal when you want the quick startup of VFS (no upfront restore)
combined with the performance of a local database once the background restore
completes.


## When NOT to use hydration

- Small databases that fit entirely in the VFS cache (hydration adds no benefit).
- Limited local disk space (hydration requires space for the full database).
- Short-lived processes that terminate before hydration completes.
- Time travel queries (hydration is temporarily paused during time travel).

For small databases or disk-constrained environments, the default VFS caching
is usually sufficient.


## Prerequisites

- VFS extension built (same as standard VFS usage).
- A configured replica URL pointing to object storage.
- Sufficient local disk space for the fully restored database.
- Stable network connection during hydration.


## Configuration

Enable hydration with environment variables:

```sh
# Enable hydration
export LITESTREAM_HYDRATION_ENABLED=true

# Set replica URL (required)
export LITESTREAM_REPLICA_URL="s3://mybucket/mydb"

# Hydration file path (default: temp file)
export LITESTREAM_HYDRATION_PATH=/var/lib/litestream/hydrated.db
```

### Configuration options

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `LITESTREAM_HYDRATION_ENABLED` | boolean | `false` | Enable background hydration |
| `LITESTREAM_HYDRATION_PATH` | string | temp file | Local file path for hydrated database |

If `LITESTREAM_HYDRATION_PATH` is not set, hydration uses a temporary file that
is cleaned up when the VFS closes. Set an explicit path to persist the hydrated
database across restarts.


## How it works

Hydration runs as a non-blocking background process while the VFS remains fully
operational:

1. **Streaming compaction**: The VFS reads LTX files and applies them to build
   a complete SQLite database file locally.

2. **Non-blocking reads**: During hydration, reads are served from the VFS cache
   or fetched from remote storage as usual. Applications experience no interruption.

3. **Incremental updates**: As new LTX files arrive from the primary, they are
   applied to the hydrated file to keep it current.

4. **Read path transition**: Once hydration completes, the VFS switches to
   serving reads directly from the local file instead of remote storage.

5. **Continuous sync**: After initial hydration, the VFS continues applying new
   LTX files to the local file, keeping it synchronized with the replica.

### Read path evolution

| Phase | Read Source | Latency |
|-------|-------------|---------|
| Pre-hydration | Remote storage + cache | Network latency (5-50ms+ per page miss) |
| During hydration | Remote storage + cache | Network latency (unchanged) |
| Post-hydration | Local file | Local disk latency (<1ms) |

The transition happens automatically and is transparent to the application.


## Performance benefits

Hydration significantly improves read latency once complete:

| Scenario | Without Hydration | With Hydration |
|----------|-------------------|----------------|
| Cache hit | <1ms | <1ms |
| Cache miss (indexed lookup) | 5-50ms | <1ms |
| Sequential scan (100MB) | 500ms-5s | <100ms |
| Cold start, random reads | High latency | High initially, then <1ms |

The benefit is most noticeable for:

- Sequential scans and large aggregations (no longer fetch each page remotely).
- Random access patterns that exceed cache size.
- Any workload after hydration completes.


## Memory usage

Hydration uses streaming compaction with bounded memory:

- LTX files are processed incrementally; the entire database is never loaded into memory.
- Memory usage is proportional to the compaction buffer, not the database size.
- The local hydration file is written directly to disk via streaming I/O.

A 10GB database can be hydrated with minimal additional memory beyond the
standard VFS cache.


## Interaction with time travel

Hydration and time travel have specific interactions:

- **During time travel**: Hydration is paused. The VFS serves historical data
  directly from LTX files in remote storage.

- **After time travel ends**: Hydration resumes from where it left off when you
  return to `latest`.

- **Hydration progress**: Time travel does not reset hydration progress. The
  local file remains valid for the current state.

If your workload uses frequent time travel queries, hydration may provide
limited benefit since those queries always read from remote LTX files.


## Examples

### Python

```sh
export LITESTREAM_HYDRATION_ENABLED=true
export LITESTREAM_REPLICA_URL="s3://mybucket/analytics.db"
export LITESTREAM_HYDRATION_PATH=/tmp/analytics-hydrated.db
export AWS_ACCESS_KEY_ID=AKIAxxxx
export AWS_SECRET_ACCESS_KEY=xxxx
python analytics.py
```

```python
import sqlite3

# Load VFS extension
loader = sqlite3.connect(":memory:")
loader.enable_load_extension(True)
loader.load_extension("./dist/litestream-vfs.so", entrypoint="sqlite3_litestreamvfs_init")
loader.close()

# Connect - hydration starts automatically in the background
conn = sqlite3.connect("file:analytics.db?vfs=litestream", uri=True)

# Reads work immediately (from cache/remote during hydration)
cursor = conn.execute("SELECT COUNT(*) FROM events")
print(f"Total events: {cursor.fetchone()[0]}")

# After hydration completes, this scan is served from local disk
cursor = conn.execute("SELECT date(ts), COUNT(*) FROM events GROUP BY 1")
for row in cursor:
    print(f"{row[0]}: {row[1]} events")
```

### Go

```go
package main

import (
    "context"
    "database/sql"
    "log"
    "os"

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
    client.Path = "analytics.db"
    if err := client.Init(context.Background()); err != nil {
        log.Fatal(err)
    }

    vfs := litestream.NewVFS(client, nil)
    vfs.HydrationEnabled = true
    vfs.HydrationPath = "/tmp/analytics-hydrated.db"

    if err := sqlite3vfs.RegisterVFS("litestream", vfs); err != nil {
        log.Fatal(err)
    }

    db, err := sql.Open("sqlite3", "file:analytics.db?vfs=litestream")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Query immediately - uses cache/remote during hydration
    var count int
    db.QueryRow("SELECT COUNT(*) FROM events").Scan(&count)
    log.Printf("Total events: %d", count)

    // After hydration, large scans are fast
    rows, _ := db.Query(`
        SELECT date(ts), COUNT(*)
        FROM events
        GROUP BY 1
        ORDER BY 1 DESC
        LIMIT 30
    `)
    defer rows.Close()
    for rows.Next() {
        var date string
        var eventCount int
        rows.Scan(&date, &eventCount)
        log.Printf("%s: %d events", date, eventCount)
    }
}
```


## Monitoring hydration progress

If implemented in your Litestream build, these SQL functions can monitor
hydration status:

```sql
-- Get hydration progress as percentage (0-100)
SELECT litestream_hydration_progress();
-- Returns: 75

-- Get hydration status
SELECT litestream_hydration_status();
-- Returns: idle | restoring | catching_up | complete
```

| Status | Meaning |
|--------|---------|
| `idle` | Hydration not enabled or not started |
| `restoring` | Initial database restoration in progress |
| `catching_up` | Applying recent LTX files after initial restore |
| `complete` | Hydration finished, all reads served locally |

Check if your build includes these functions by attempting to call them. If not
available, monitor the hydration file size as a rough progress indicator.


## Combining with write mode

Hydration can be used together with write mode. When both are enabled:

- The hydrated local file receives both remote updates and local writes.
- Write buffer syncs happen independently of hydration.
- Local writes are immediately visible in the hydrated file.

```sh
export LITESTREAM_WRITE_ENABLED=true
export LITESTREAM_HYDRATION_ENABLED=true
export LITESTREAM_REPLICA_URL="s3://mybucket/app.db"
export LITESTREAM_BUFFER_PATH=/data/buffer.db
export LITESTREAM_HYDRATION_PATH=/data/hydrated.db
```

This combination provides:

- Quick startup (no full restore required).
- Local disk performance once hydrated.
- Write capability with remote persistence.


## Limitations & constraints

- **Disk space**: Requires space for the full database locally.
- **Hydration time**: Large databases take time to hydrate (network-bound).
- **Time travel**: Pauses hydration and reads from remote during time travel.
- **No partial hydration**: The entire database is hydrated; cannot hydrate specific tables.


## Troubleshooting

- **Slow hydration**: Check network bandwidth to replica storage. Consider running in the same region.
- **Disk full errors**: Ensure sufficient space for the hydration file (database size + overhead).
- **Hydration not starting**: Verify `LITESTREAM_HYDRATION_ENABLED=true` is set before VFS initialization.
- **Stale data after restart**: If using a temp file path, hydration restarts from scratch. Use a persistent path.


## See Also

- [VFS Read Replicas Guide](/guides/vfs) - Standard VFS usage
- [VFS Write Mode Guide](/guides/vfs-write-mode) - Write mode configuration
- [VFS Extension Reference](/reference/vfs) - Complete configuration reference
- [How it works: VFS](/how-it-works/vfs) - Architecture details
