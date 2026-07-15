---
title : "IPC Endpoints"
date: 2026-02-12T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 545
---

{{< since version="0.5.7" >}} Litestream exposes IPC (Inter-Process Communication)
endpoints via a Unix domain socket. These endpoints allow local tools and scripts
to query database status and collect profiling data without exposing an HTTP port.

## Enabling the Socket

The control socket is **disabled by default**. Enable it with a `socket` block
in your configuration file:

```yaml
socket:
  enabled: true            # default: false
  path: /var/run/litestream.sock
  permissions: 0600
```

The `path` defaults to `/var/run/litestream.sock` and `permissions` defaults to
`0600`.

Once enabled, the socket is created when the Litestream daemon starts and
removed on shutdown. The CLI commands and `curl` examples below assume the
default path; pass `-socket <path>` (or `--unix-socket <path>`) if you changed it.


## Endpoints

### GET /list

Returns all databases currently tracked by the Litestream daemon, along with their
last sync time.

**Example:**

```bash
$ curl --unix-socket /var/run/litestream.sock \
    http://localhost/list
{"databases":[{"path":"/path/to/my.db","status":"replicating","last_sync_at":"2026-02-12T00:00:00Z"}]}
```

**Status values:**

| Status | Description |
|--------|-------------|
| `replicating` | Database is open and actively replicating to a replica |
| `open` | Database is open but has no replica monitoring enabled |
| `stopped` | Database is registered but replication is not running |

**CLI equivalent:** `litestream list -socket /var/run/litestream.sock`

---

### GET /info

Returns information about the running Litestream daemon including version, PID, and uptime.

**Example:**

```bash
$ curl --unix-socket /var/run/litestream.sock \
    http://localhost/info
{"version":"0.5.8","pid":12345,"uptime_seconds":3600,"started_at":"2026-02-12T00:00:00Z","database_count":1}
```

---

### POST /register

Dynamically registers a new database with the Litestream daemon without restarting.

**Request body (JSON):**

| Field | Required | Description |
|-------|----------|-------------|
| `path` | Yes | Absolute path to the SQLite database file |
| `replica_url` | Yes | Replica destination URL (e.g. `s3://bucket/path`) |

**Example:**

```bash
$ curl --unix-socket /var/run/litestream.sock \
    -X POST http://localhost/register \
    -H "Content-Type: application/json" \
    -d '{"path":"/path/to/my.db","replica_url":"s3://mybucket/my.db"}'
```

**CLI equivalent:** `litestream register -socket /var/run/litestream.sock -replica s3://mybucket/my.db /path/to/my.db`

---

### POST /unregister

Dynamically unregisters a database from the Litestream daemon without restarting.

**Request body (JSON):**

| Field | Required | Description |
|-------|----------|-------------|
| `path` | Yes | Absolute path to the SQLite database file |

**Example:**

```bash
$ curl --unix-socket /var/run/litestream.sock \
    -X POST http://localhost/unregister \
    -H "Content-Type: application/json" \
    -d '{"path":"/path/to/my.db"}'
```

**CLI equivalent:** `litestream unregister -socket /var/run/litestream.sock /path/to/my.db`

---

### POST /start

Starts replication for a database that is registered but stopped, without
restarting the daemon.

**Request body (JSON):**

| Field | Required | Description |
|-------|----------|-------------|
| `path` | Yes | Absolute path to the SQLite database file |
| `timeout` | No | Maximum wait time in seconds. If omitted, the request runs without a timeout. |

**Example:**

```bash
$ curl --unix-socket /var/run/litestream.sock \
    -X POST http://localhost/start \
    -H "Content-Type: application/json" \
    -d '{"path":"/path/to/my.db"}'
{"status":"started","path":"/path/to/my.db","txid":42}
```

**Response statuses:**

| Status | Description |
|--------|-------------|
| `started` | Replication was started for the database |
| `already_running` | Database was already open. {{< since version="0.5.12" >}} |

**CLI equivalent:** `litestream start -socket /var/run/litestream.sock /path/to/my.db`

---

### POST /stop

Stops replication for a database without unregistering it or restarting the
daemon.

**Request body (JSON):**

| Field | Required | Description |
|-------|----------|-------------|
| `path` | Yes | Absolute path to the SQLite database file |
| `timeout` | No | Maximum wait time in seconds (default: `30`) |

**Example:**

```bash
$ curl --unix-socket /var/run/litestream.sock \
    -X POST http://localhost/stop \
    -H "Content-Type: application/json" \
    -d '{"path":"/path/to/my.db"}'
{"status":"stopped","path":"/path/to/my.db","txid":42}
```

**Response statuses:**

| Status | Description |
|--------|-------------|
| `stopped` | Replication was stopped for the database |
| `already_stopped` | Database was already stopped. {{< since version="0.5.12" >}} |

**CLI equivalent:** `litestream stop -socket /var/run/litestream.sock /path/to/my.db`

---

### GET /txid

Returns the current transaction ID for a database.

**Query parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `path` | Yes | Absolute path to the database file |

**Example:**

```bash
$ curl --unix-socket /var/run/litestream.sock \
    "http://localhost/txid?path=/path/to/my.db"
{"txid":42}
```

### POST /sync

{{< since version="0.5.9" >}} Forces an immediate WAL-to-LTX sync for a database. Without `wait`, the sync
is triggered and the request returns immediately (fire-and-forget). With `wait`
set to `true`, the request blocks until both local and remote replication
complete.

**Request body (JSON):**

| Field | Required | Description |
|-------|----------|-------------|
| `path` | Yes | Absolute path to the SQLite database file |
| `wait` | No | Block until sync completes including remote replication (default: `false`) |
| `timeout` | No | Maximum wait time in seconds, best-effort (default: `30`) |

**Example (fire-and-forget):**

```bash
$ curl --unix-socket /var/run/litestream.sock \
    -X POST http://localhost/sync \
    -H "Content-Type: application/json" \
    -d '{"path":"/path/to/my.db"}'
{"status":"synced_local","path":"/path/to/my.db","txid":42,"replicated_txid":40}
```

**Example (blocking):**

```bash
$ curl --unix-socket /var/run/litestream.sock \
    -X POST http://localhost/sync \
    -H "Content-Type: application/json" \
    -d '{"path":"/path/to/my.db","wait":true,"timeout":60}'
{"status":"synced","path":"/path/to/my.db","txid":42,"replicated_txid":42}
```

**Response fields:**

| Field | Description |
|-------|-------------|
| `status` | Sync status (see table below) |
| `path` | Absolute path to the database file |
| `txid` | Current local transaction ID |
| `replicated_txid` | Last transaction ID confirmed replicated to remote storage. In fire-and-forget mode, this may lag behind `txid` since the newly synced data has not yet been replicated. |

**Response statuses:**

| Status | Description |
|--------|-------------|
| `synced_local` | WAL-to-LTX sync completed (fire-and-forget mode) |
| `synced` | Full sync including remote replication completed (blocking mode) |
| `no_change` | Database was already up to date |

**CLI equivalent:** `litestream sync -socket /var/run/litestream.sock /path/to/my.db`

---

### GET /debug/sync-status

{{< since version="0.5.12" >}} Returns detailed sync diagnostics for the
databases tracked by the daemon. This is useful for observing in-progress sync
and checkpoint operations. Without the `path` parameter, diagnostics for all
databases are returned.

**Query parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `path` | No | Absolute path to a single database. Returns `404` if the path is not registered. |

**Example (all databases):**

```bash
$ curl --unix-socket /var/run/litestream.sock \
    http://localhost/debug/sync-status
{"databases":[{"path":"/path/to/my.db","active":true,"operation":"sync","phase":"write_ltx_from_wal","started_at":"2026-02-12T00:00:00Z","updated_at":"2026-02-12T00:00:01Z","elapsed_seconds":1.2,"txid":42,"wal_size":32768,"last_synced_wal_offset":16384}]}
```

**Example (single database):**

```bash
$ curl --unix-socket /var/run/litestream.sock \
    "http://localhost/debug/sync-status?path=/path/to/my.db"
```

**Response fields:**

Each entry in `databases` contains the following fields. `path` and `active`
are always present; the remaining fields are omitted when empty or zero. When
`active` is `false`, the operation-specific fields describe the most recently
completed operation rather than work in progress.

| Field | Description |
|-------|-------------|
| `path` | Absolute path to the database file |
| `active` | Whether a sync or checkpoint operation is currently in progress |
| `operation` | Operation type: `sync` or `checkpoint` |
| `phase` | Fine-grained phase within the operation (e.g. `starting`, `write_ltx_from_wal`, `checkpoint_exec`) |
| `started_at` | Timestamp when the operation started |
| `updated_at` | Timestamp of the most recent phase transition |
| `elapsed_seconds` | Seconds elapsed since the operation started |
| `txid` | LTX transaction ID being generated by the operation (may be `0` before it is assigned) |
| `wal_size` | WAL size in bytes; during sync phases this reflects the WAL bytes being processed rather than the full file size |
| `last_synced_wal_offset` | Byte offset of the last WAL data synced to LTX |
| `snapshotting` | Whether a full snapshot is in progress |
| `checkpoint_mode` | Checkpoint mode when a checkpoint is running (e.g. `PASSIVE`, `RESTART`, `TRUNCATE`) |
| `reason` | Why a full snapshot was required (e.g. WAL truncated or salt reset), when applicable |
| `error` | Error message if the last operation failed |

---

### /debug/pprof/*

Standard Go [pprof](https://pkg.go.dev/net/http/pprof) endpoints for runtime
profiling. These allow you to collect CPU profiles, heap snapshots, and
goroutine dumps without running a separate HTTP server.

**CPU profile:**

```bash
$ curl --unix-socket /var/run/litestream.sock \
    http://localhost/debug/pprof/profile > cpu.pprof
```

**Heap profile:**

```bash
$ curl --unix-socket /var/run/litestream.sock \
    http://localhost/debug/pprof/heap > heap.pprof
```

**Goroutine dump:**

```bash
$ curl --unix-socket /var/run/litestream.sock \
    "http://localhost/debug/pprof/goroutine?debug=2"
```

**Available pprof paths:**

| Path | Description |
|------|-------------|
| `/debug/pprof/profile` | CPU profile (30s default) |
| `/debug/pprof/heap` | Heap memory profile |
| `/debug/pprof/goroutine` | Goroutine stack traces |
| `/debug/pprof/allocs` | Memory allocation profile |
| `/debug/pprof/block` | Blocking profile |
| `/debug/pprof/mutex` | Mutex contention profile |
| `/debug/pprof/threadcreate` | Thread creation profile |
| `/debug/pprof/trace` | Execution trace |

Use `go tool pprof` to analyze collected profiles:

```bash
go tool pprof cpu.pprof
go tool pprof heap.pprof
```


## See Also

- [Configuration Reference](/reference/config) - Complete configuration options
- [Metrics](/reference/metrics) - Prometheus metrics reference
