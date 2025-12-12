---
title : "VFS Extension"
date: 2025-11-20T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 550
---

The Litestream VFS provides read-only access to a replicated SQLite database
directly from object storage. It registers a VFS named `litestream`, fetches
pages on-demand, and continuously polls the replica for new LTX files. The VFS
is built separately from the main `litestream` binary and requires CGO.
Pre-built binaries are available in
[GitHub releases](https://github.com/benbjohnson/litestream/releases).


## Build requirements

- Go 1.25+ with a working CGO toolchain (gcc/clang).
- Build with the VFS & extension tags using the repository Makefile (handles platform flags):

```sh
make vfs
```

- Manual Linux build:

```sh
CGO_ENABLED=1 go build -tags "vfs,SQLITE3VFS_LOADABLE_EXT" -buildmode=c-archive -o dist/litestream-vfs.a ./cmd/litestream-vfs
cp dist/litestream-vfs.h src/litestream-vfs.h
gcc -DSQLITE3VFS_LOADABLE_EXT -fPIC -shared -o dist/litestream-vfs.so src/litestream-vfs.c dist/litestream-vfs.a -lpthread -ldl -lm
```

- macOS requires the extra frameworks in the Makefile; prefer `make vfs`.
- Use `.dylib` (macOS) or `.dll` (Windows) if your platform expects it.
- SQLite entrypoint symbol: `sqlite3_litestreamvfs_init`.
- The shared library registers the `litestream` VFS when loaded into SQLite.
- Go applications can link directly by importing `github.com/benbjohnson/litestream`
  with `-tags vfs` and registering the VFS via `sqlite3vfs.RegisterVFS`.


## Supported storage backends

- The loadable extension bundles the S3 replica client (AWS S3 & S3-compatible endpoints via custom `LITESTREAM_S3_ENDPOINT`).
- Go applications can use any `ReplicaClient` (S3, GCS, Azure Blob Storage, SFTP, file, etc.) when building with `-tags vfs`.
- SQLite clients must support loadable extensions.


## VFS registration & usage

- VFS name: `litestream`
- Open URIs with `vfs=litestream`, for example:

```sh
sqlite3
sqlite> .load ./dist/litestream-vfs sqlite3_litestreamvfs_init
sqlite> .open 'file:replica.db?vfs=litestream'
```

- The VFS forces connections to be read-only and rewrites the header so SQLite
  reports `DELETE` journal mode, matching SQLite expectations for external VFSes.
- Temporary files are stored in a private directory created by the VFS and
  cleaned up automatically.


## Configuration (environment variables)

The extension uses the AWS SDK default credential chain plus the following
variables to describe the replica location:

- `LITESTREAM_S3_BUCKET` (required) — bucket containing the replica.
- `LITESTREAM_S3_PATH` (required) — prefix/path to the database replica.
- `LITESTREAM_S3_REGION` — defaults to the bucket's region, or `us-east-1` when using a custom endpoint.
- `LITESTREAM_S3_ENDPOINT` — custom endpoint for S3-compatible storage.
- `LITESTREAM_S3_FORCE_PATH_STYLE` — `true` to force path-style URLs (default `false`).
- `LITESTREAM_S3_SKIP_VERIFY` — `true` to skip TLS verification (default `false`; testing only).
- `LITESTREAM_LOG_LEVEL` — `DEBUG` or `INFO` (default).
- Standard AWS variables such as `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
  `AWS_PROFILE`, and role-based credentials are honored by the SDK.

VFS runtime tuning is set in code (Go) by adjusting `VFS.PollInterval` (default
`1s`) and `VFS.CacheSize` (default `10MB`).


## PRAGMAs & SQL functions

The VFS extension registers custom PRAGMAs and SQL functions for observability
and time travel queries.

### PRAGMA litestream_txid

Returns the current transaction ID as a 16-character hexadecimal string.

```sql
PRAGMA litestream_txid;
-- Returns: 0000000000000042
```

### PRAGMA litestream_lag

Returns the number of seconds since the last successful poll for new LTX files.
Useful for monitoring replica freshness and alerting on stale replicas.

```sql
PRAGMA litestream_lag;
-- Returns: 2
```

A value of `-1` indicates the VFS has not completed its initial poll.

### PRAGMA litestream_time

Gets or sets the point-in-time view for time travel queries.

**Get current time:**

```sql
PRAGMA litestream_time;
-- Returns: 2024-01-15T10:30:00.123456789Z (RFC3339Nano format)
```

**Set to specific timestamp:**

```sql
PRAGMA litestream_time = '2024-01-15T10:30:00Z';
```

**Set to relative time:**

```sql
PRAGMA litestream_time = '5 minutes ago';
PRAGMA litestream_time = 'yesterday';
PRAGMA litestream_time = '2 hours ago';
```

**Reset to latest:**

```sql
PRAGMA litestream_time = 'latest';
```

> **Note**: Time travel requires `l0-retention` to be configured on the primary
> so historical LTX files remain available.

### SQL function equivalents

The same functionality is available via SQL functions:

| Function | Description |
|----------|-------------|
| `litestream_txid()` | Returns current transaction ID |
| `litestream_lag()` | Returns seconds since last poll |
| `litestream_time()` | Returns current view timestamp |
| `litestream_set_time(value)` | Sets the time travel point |

Example:

```sql
SELECT litestream_txid(), litestream_lag(), litestream_time();
SELECT litestream_set_time('10 minutes ago');
```


## Performance characteristics

- On-demand page fetch with LRU caching sized by `CacheSize` (default 10MB).
- Polling cadence controlled by `PollInterval` (default 1s) to discover new LTX files.
- Page fetch retries: up to 6 attempts with backoff for transient network/read errors.
- Supports SQLite page sizes from 512 to 65536 bytes (auto-detected from LTX headers).
- Two-index isolation: incoming LTX pages are staged while readers hold locks,
  then swapped in to keep long-running reads consistent. See
  [How it works: VFS](/how-it-works/vfs/#memory-implications-of-long-held-transactions)
  for memory considerations with long-held transactions.


## Limitations & constraints

- Read-only: write attempts return `litestream is a read only vfs`.
- CGO-only: requires a CGO-enabled SQLite driver (`github.com/mattn/go-sqlite3`) and `-tags vfs`.
- Requires contiguous LTX coverage. Missing L0 files (e.g., aggressive retention) will error until new files appear.
- Initial snapshot required: the VFS waits for available backup files before serving reads.
- Network latency adds to first-page reads; place consumers close to the replica endpoint.


## Architecture overview

The VFS derives a restore plan from the replica, detects the database page size,
builds an in-memory page index from LTX files, and serves pages directly from
remote storage. A polling loop keeps the index fresh by reading new L0/L1 files,
and cached pages are invalidated when newer frames arrive. See
[How it works: VFS](/how-it-works/vfs) for a deeper explanation.
