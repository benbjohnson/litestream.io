---
title : "VFS Read Replicas"
date: 2025-11-20T00:00:00Z
layout: docs
menu:
  docs:
    parent: "replica-guides"
weight: 405
---

Litestream's Virtual File System (VFS) lets you read a replicated database
directly from object storage without restoring it to local disk first. Queries
fetch pages on-demand, cache them locally, and stay in sync by polling for new
LTX files.

{{< alert icon="⚠️" text="The VFS is read-only and requires CGO. Pre-built binaries are available in [GitHub releases](https://github.com/benbjohnson/litestream/releases), or build from source with the `-tags vfs` build tag." >}}


## When to use the VFS

- Serve read-only workloads from a remote replica (analytics, dashboards, reporting).
- Distribute read replicas near users without copying the full database.
- Validate backups or run ad-hoc queries without restoring a full copy.
- Keep warm replicas on ephemeral compute where local disk is limited.
- Avoid when you need low-latency high-concurrency writes—the VFS is read-only and network-bound.


## Prerequisites

- Go 1.25+ with CGO enabled (compiler toolchain installed).
- A Litestream-managed replica already syncing to object storage.
- SQLite clients that support loadable extensions (CLI, Python, Node, etc.) or a Go application built with CGO.
- Supported page sizes: 512–65536 bytes (auto-detected from LTX headers).


## Build the `litestream-vfs` extension

Build the shared library that registers the VFS inside SQLite. From the
`litestream` repository root:

```sh
# Recommended (handles platform-specific flags)
make vfs

# Manual build (Linux-style toolchain)
CGO_ENABLED=1 go build -tags "vfs,SQLITE3VFS_LOADABLE_EXT" -buildmode=c-archive -o dist/litestream-vfs.a ./cmd/litestream-vfs
gcc -shared -o dist/litestream-vfs.so src/litestream-vfs.c dist/litestream-vfs.a
```

- macOS requires the additional frameworks used in `Makefile`; prefer `make vfs`.
- Use `.dylib` on macOS or `.dll` on Windows if your environment expects it.
- The output registers a VFS called `litestream`. Keep the `.so/.dylib/.dll` near your application.
- The loadable extension currently ships with the S3 replica client (including S3-compatible endpoints).

The SQLite entrypoint symbol is `sqlite3_litestreamvfs_init`; pass this when
loading the extension if your client requires it.


## Configure the replica target

Set the storage connection for the VFS. The extension uses the AWS SDK, so any
standard AWS credential sources are supported in addition to these variables:

- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` — optional; falls back to the AWS default chain.
- `LITESTREAM_S3_BUCKET` (required) — bucket containing the replica.
- `LITESTREAM_S3_PATH` (required) — prefix/path to the database replica.
- `LITESTREAM_S3_REGION` — defaults to the bucket's region (or `us-east-1` with a custom endpoint).
- `LITESTREAM_S3_ENDPOINT` — for S3-compatible stores (MinIO, R2, etc).
- `LITESTREAM_S3_FORCE_PATH_STYLE` — `true` for path-style URLs (default: `false`).
- `LITESTREAM_S3_SKIP_VERIFY` — `true` to skip TLS verification for testing (default: `false`).
- `LITESTREAM_LOG_LEVEL` — `DEBUG` or `INFO` (default).


## Using the VFS as a loadable extension

### SQLite CLI

```sh
export AWS_ACCESS_KEY_ID=AKIAxxxx
export AWS_SECRET_ACCESS_KEY=xxxx
export LITESTREAM_S3_BUCKET=my-backups
export LITESTREAM_S3_PATH=prod.db

sqlite3
sqlite> .load ./dist/litestream-vfs sqlite3_litestreamvfs_init
sqlite> .open 'file:prod.db?vfs=litestream'
sqlite> SELECT count(*) FROM users LIMIT 10;
```

> **Note**: The macOS system SQLite has extension loading disabled. Install
> SQLite via Homebrew (`brew install sqlite3`) and use the Homebrew version,
> or use the Python/Node.js examples below instead.

### Python (`sqlite3`)

```python
import sqlite3

# Load the VFS extension first (registers the "litestream" VFS globally)
loader = sqlite3.connect(":memory:")
loader.enable_load_extension(True)
loader.load_extension("./dist/litestream-vfs.so", entrypoint="sqlite3_litestreamvfs_init")
loader.close()

# Now connect using the registered VFS
conn = sqlite3.connect("file:prod.db?vfs=litestream", uri=True, check_same_thread=False)

for row in conn.execute("SELECT name, country FROM customers LIMIT 5"):
    print(row)
```

### Node.js (`better-sqlite3`)

```js
const Database = require("better-sqlite3");
// better-sqlite3 >= 9 supports loadExtension
const db = new Database("file:prod.db?vfs=litestream", { fileMustExist: false });
db.loadExtension("./dist/litestream-vfs", "sqlite3_litestreamvfs_init");

const rows = db.prepare("SELECT COUNT(*) AS n FROM orders").get();
console.log(rows.n);
```


## Using the VFS from Go

Use the VFS directly in a Go application (CGO-enabled, using `github.com/mattn/go-sqlite3`):

```go
package main

import (
	"context"
	"database/sql"
	"log/slog"
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
	client.Bucket = "my-backups"
	client.Path = "prod.db"
	if err := client.Init(context.Background()); err != nil {
		panic(err)
	}

	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	vfs := litestream.NewVFS(client, logger)
	vfs.PollInterval = 500 * time.Millisecond
	vfs.CacheSize = 32 * 1024 * 1024

	if err := sqlite3vfs.RegisterVFS("litestream", vfs); err != nil {
		panic(err)
	}

	db, err := sql.Open("sqlite3", "file:prod.db?vfs=litestream")
	if err != nil {
		panic(err)
	}
	defer db.Close()

	_ = db.QueryRow("SELECT COUNT(*) FROM users").Scan(new(int))
}
```

You can swap the `s3` client for any `ReplicaClient` (GCS, Azure, SFTP, file)
as long as your application includes the right credentials and uses `-tags vfs`.


## Observability & time travel

The VFS extension provides SQL PRAGMAs and functions for monitoring replica
health and querying historical database states.

### Monitoring PRAGMAs

Check the current state of your VFS replica:

```sql
-- Get current transaction ID (16-character hex string)
PRAGMA litestream_txid;
-- Returns: 0000000000000042

-- Get seconds since last successful poll (useful for alerting)
PRAGMA litestream_lag;
-- Returns: 2

-- Get current view timestamp (RFC3339Nano format)
PRAGMA litestream_time;
-- Returns: 2024-01-15T10:30:00.123456789Z
```

### Time travel queries

Query the database as it existed at a specific point in time. This requires
`l0-retention` to be configured on the primary so historical LTX files remain
available.

```sql
-- Set view to a specific timestamp
PRAGMA litestream_time = '2024-01-15T10:30:00Z';

-- Use relative time expressions
PRAGMA litestream_time = '5 minutes ago';
PRAGMA litestream_time = 'yesterday';
PRAGMA litestream_time = '2 hours ago';

-- Reset to the latest (current) data
PRAGMA litestream_time = 'latest';
```

After setting the time, subsequent queries will return data as of that point
in time. Use `'latest'` to return to real-time data.

### SQL functions

Alternative syntax using SQL functions instead of PRAGMAs:

```sql
SELECT litestream_txid();           -- Returns current TXID
SELECT litestream_lag();            -- Returns seconds since last poll
SELECT litestream_time();           -- Returns current view timestamp
SELECT litestream_set_time('5 minutes ago');  -- Set time travel point
```

> **Note**: Time travel requires sufficient L0 retention on the primary. Configure
> `l0-retention` in your Litestream config to keep historical data available.
> See the [L0 retention configuration](/reference/config#l0-retention-vfs-read-replicas).


## Performance tuning

- **Cache size** (`CacheSize`, default 10MB): keep frequently read pages near the application.
  - Small DBs (<100MB): 5–10MB
  - Medium (100MB–1GB): 10–50MB
  - Large (>1GB): 50–100MB+
- **Poll interval** (`PollInterval`, default 1s): how often to fetch new LTX files.
  - 100–500ms for low-latency reads; expect more API calls.
  - 5–10s to reduce API calls; expect higher lag before new writes appear.
- **Placement**: run the VFS client in the same region as the replica to avoid cross-region latency.
- **Query shapes**: indexed point/lookups & repeated reads are fastest; large table scans incur extra storage I/O.


## Limitations & constraints

- Read-only: write attempts fail with `litestream is a read only vfs`.
- CGO-only: requires `-tags vfs` and a CGO-enabled SQLite driver.
- Network-bound latency: first access to a page incurs storage/network latency before it is cached.
- High concurrency: designed for modest fan-out; very high reader counts will increase object-store requests.
- Consistency: requires contiguous LTX files. Missing L0 files (e.g., after aggressive retention) will surface errors until new compactions appear.


## Troubleshooting

- **"page not found" / non-contiguous errors**: ensure VFS retention is configured on the primary (`l0-retention` long enough) and the replica has no gaps.
- **Slow queries**: reduce poll interval, enlarge cache, or run closer to the object store endpoint.
- **TLS/endpoint issues with S3-compatible stores**: set `LITESTREAM_S3_ENDPOINT` and, if needed for testing only, `LITESTREAM_S3_SKIP_VERIFY=true`.
- **No data visible**: VFS waits for an initial snapshot; confirm replication is running and the replica path is correct.


## Common use cases

- Low-touch read replicas for BI/reporting without managing extra disks.
- Geographic fan-out of read-only endpoints near users.
- Backup verification and disaster-recovery drills without restores.
- Inspecting historical data while the primary continues to accept writes.
