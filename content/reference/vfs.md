---
title : "VFS Extension"
date: 2025-11-20T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 505
---

The Litestream VFS provides read-only access to a replicated SQLite database
directly from object storage. It registers a VFS named `litestream`, fetches
pages on-demand, and continuously polls the replica for new LTX files. The VFS
is built separately from the main `litestream` binary and requires CGO.
Pre-built binaries are available in
[GitHub releases](https://github.com/benbjohnson/litestream/releases).


## Build requirements

- Go 1.24+ with a working CGO toolchain (gcc/clang).
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

The loadable extension supports all Litestream replica backends via the
`LITESTREAM_REPLICA_URL` environment variable:

- **S3** — AWS S3 and S3-compatible storage (MinIO, R2, Tigris, etc.)
- **GCS** — Google Cloud Storage
- **ABS** — Azure Blob Storage
- **SFTP** — SSH File Transfer Protocol
- **File** — Local filesystem
- **NATS** — NATS JetStream
- **WebDAV** — WebDAV and WebDAVS servers
- **Alibaba OSS** — Alibaba Cloud Object Storage Service

Go applications can use any `ReplicaClient` when building with `-tags vfs`.
SQLite clients must support loadable extensions.


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

### Replica URL

Set `LITESTREAM_REPLICA_URL` to specify the replica location using a URL format:

| Scheme | Backend | Example |
|--------|---------|---------|
| `s3://` | AWS S3 / S3-compatible | `s3://mybucket/db` or `s3://mybucket/db?endpoint=s3.us-west-2.amazonaws.com` |
| `gs://` | Google Cloud Storage | `gs://mybucket/db` |
| `abs://` | Azure Blob Storage | `abs://mycontainer/db` |
| `sftp://` | SFTP | `sftp://user@host/path/db` |
| `file://` | Local filesystem | `file:///backups/db` |
| `nats://` | NATS JetStream | `nats://server/subject` |
| `webdav://` | WebDAV | `webdav://server/path/db` |
| `webdavs://` | WebDAV (TLS) | `webdavs://server/path/db` |
| `oss://` | Alibaba OSS | `oss://mybucket/db` |

For S3-compatible storage, append query parameters:

```sh
# MinIO example
LITESTREAM_REPLICA_URL="s3://mybucket/db?endpoint=minio.example.com"

# Cloudflare R2 example
LITESTREAM_REPLICA_URL="s3://mybucket/db?endpoint=<account>.r2.cloudflarestorage.com"
```

### Other configuration

- `LITESTREAM_LOG_LEVEL` — `DEBUG` or `INFO` (default).
- Standard cloud provider credentials (AWS, GCP, Azure) are honored by their
  respective SDKs. For example: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
  `AWS_PROFILE`, `GOOGLE_APPLICATION_CREDENTIALS`, `AZURE_STORAGE_ACCOUNT`.

### Legacy S3 configuration

The following S3-specific variables are still supported for backwards
compatibility but `LITESTREAM_REPLICA_URL` is preferred:

- `LITESTREAM_S3_BUCKET` — bucket containing the replica.
- `LITESTREAM_S3_PATH` — prefix/path to the database replica.
- `LITESTREAM_S3_REGION` — defaults to the bucket's region, or `us-east-1` when using a custom endpoint.
- `LITESTREAM_S3_ENDPOINT` — custom endpoint for S3-compatible storage.
- `LITESTREAM_S3_FORCE_PATH_STYLE` — `true` to force path-style URLs (default `false`).
- `LITESTREAM_S3_SKIP_VERIFY` — `true` to skip TLS verification (default `false`; testing only).

### Runtime tuning

VFS runtime tuning is set in code (Go) by adjusting `VFS.PollInterval` (default
`1s`) and `VFS.CacheSize` (default `10MB`).


### Write mode configuration

Write mode enables the VFS to sync writes back to object storage instead of
being read-only. See the [VFS Write Mode Guide](/guides/vfs-write-mode) for
usage details.

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `LITESTREAM_WRITE_ENABLED` | boolean | `false` | Enable write mode |
| `LITESTREAM_SYNC_INTERVAL` | duration | `1s` | How often to sync writes to remote |
| `LITESTREAM_BUFFER_PATH` | string | temp file | Local write buffer path for crash recovery |

Write mode assumes a single writer. Multiple concurrent writers trigger conflict
detection.


### Hydration configuration

Hydration restores the full database to a local file in the background while
the VFS continues serving reads. See the [VFS Hydration Guide](/guides/vfs-hydration)
for usage details.

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `LITESTREAM_HYDRATION_ENABLED` | boolean | `false` | Enable background hydration |
| `LITESTREAM_HYDRATION_PATH` | string | temp file | Local file path for hydrated database |

Once hydration completes, all reads are served from the local file instead of
remote storage.

{{< since version="0.5.8" >}} When `LITESTREAM_HYDRATION_PATH` is set to an
explicit path, the hydration file persists across connection restarts. A
companion `.meta` file (e.g. `hydrated.db.meta`) is written alongside the
hydration file to track the current transaction ID (TXID). On the next open, if
both files exist, hydration resumes from the saved TXID instead of performing a
full restore. See the [VFS Hydration Guide](/guides/vfs-hydration/#persistence--resume-behavior)
for details.


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

### Hydration monitoring functions

These functions are available when hydration is enabled:

| Function | Description |
|----------|-------------|
| `litestream_hydration_progress()` | Returns hydration progress as percentage (0-100) |
| `litestream_hydration_status()` | Returns status: `idle`, `restoring`, `catching_up`, `complete` |

Example:

```sql
SELECT litestream_hydration_status(), litestream_hydration_progress();
-- Returns: restoring, 45
```

### Write mode functions

These functions are available when write mode is enabled:

| Function | Description |
|----------|-------------|
| `litestream_write_buffer_size()` | Returns current write buffer size in bytes |

Example:

```sql
SELECT litestream_write_buffer_size();
-- Returns: 8192
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

- **Default read-only**: Write attempts return `litestream is a read only vfs` unless
  [write mode](/guides/vfs-write-mode) is enabled with `LITESTREAM_WRITE_ENABLED=true`.
- **Write mode constraints**: When enabled, write mode assumes a single writer. Multiple
  concurrent writers trigger conflict detection (not prevention). Applications must handle
  conflicts. See [conflict handling](/guides/vfs-write-mode#conflict-handling).
- **CGO-only**: Requires a CGO-enabled SQLite driver (`github.com/mattn/go-sqlite3`) and `-tags vfs`.
- **Contiguous LTX coverage**: Missing L0 files (e.g., aggressive retention) will error until new files appear.
- **Initial snapshot required**: The VFS waits for available backup files before serving reads.
- **Network latency**: First-page reads incur network latency; place consumers close to the replica endpoint.
- **Hydration disk space**: When [hydration](/guides/vfs-hydration) is enabled, requires local disk space for the full database.


## Architecture overview

The VFS derives a restore plan from the replica, detects the database page size,
builds an in-memory page index from LTX files, and serves pages directly from
remote storage. A polling loop keeps the index fresh by reading new L0/L1 files,
and cached pages are invalidated when newer frames arrive. See
[How it works: VFS](/how-it-works/vfs) for a deeper explanation.
