---
title : "IPC Endpoints"
date: 2026-02-12T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 545
---

{{< since version="0.5.8" >}} Litestream exposes IPC (Inter-Process Communication)
endpoints via a Unix domain socket. These endpoints allow local tools and scripts
to query database status and collect profiling data without exposing an HTTP port.

## Socket Path

The IPC socket is created at:

```
/var/run/litestream.sock
```

The socket is automatically created when Litestream starts replication and
removed on shutdown.


## Endpoints

### GET /list

Returns all databases currently tracked by the Litestream daemon, along with their
last sync time.

**Example:**

```bash
$ curl --unix-socket /var/run/litestream.sock \
    http://localhost/list
{"databases":[{"path":"/path/to/my.db","status":"active","last_sync_at":"2026-02-12T00:00:00Z"}]}
```

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

Forces an immediate WAL-to-LTX sync for a database. Without `wait`, the sync
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
{"status":"synced_local","path":"/path/to/my.db","txid":42}
```

**Example (blocking):**

```bash
$ curl --unix-socket /var/run/litestream.sock \
    -X POST http://localhost/sync \
    -H "Content-Type: application/json" \
    -d '{"path":"/path/to/my.db","wait":true,"timeout":60}'
{"status":"synced","path":"/path/to/my.db","txid":42}
```

**Response statuses:**

| Status | Description |
|--------|-------------|
| `synced_local` | WAL-to-LTX sync completed (fire-and-forget mode) |
| `synced` | Full sync including remote replication completed (blocking mode) |
| `no_change` | Database was already up to date |

**CLI equivalent:** `litestream sync -socket /var/run/litestream.sock /path/to/my.db`

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
