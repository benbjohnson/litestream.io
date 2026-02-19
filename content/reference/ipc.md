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
{"databases":[{"path":"/path/to/my.db","last_sync":"2026-02-12T00:00:00Z"}]}
```

**CLI equivalent:** `litestream list -socket /var/run/litestream.sock`

---

### GET /info

Returns information about the running Litestream daemon including version, PID, and uptime.

**Example:**

```bash
$ curl --unix-socket /var/run/litestream.sock \
    http://localhost/info
{"version":"0.5.8","pid":12345,"uptime":3600}
```

---

### POST /add

Dynamically registers a new database with the Litestream daemon without restarting.

**Request body (JSON):**

| Field | Required | Description |
|-------|----------|-------------|
| `path` | Yes | Absolute path to the SQLite database file |
| `url` | Yes | Replica destination URL (e.g. `s3://bucket/path`) |

**Example:**

```bash
$ curl --unix-socket /var/run/litestream.sock \
    -X POST http://localhost/add \
    -H "Content-Type: application/json" \
    -d '{"path":"/path/to/my.db","url":"s3://mybucket/my.db"}'
```

**CLI equivalent:** `litestream add -socket /var/run/litestream.sock /path/to/my.db s3://mybucket/my.db`

---

### POST /remove

Dynamically unregisters a database from the Litestream daemon without restarting.

**Request body (JSON):**

| Field | Required | Description |
|-------|----------|-------------|
| `path` | Yes | Absolute path to the SQLite database file |

**Example:**

```bash
$ curl --unix-socket /var/run/litestream.sock \
    -X POST http://localhost/remove \
    -H "Content-Type: application/json" \
    -d '{"path":"/path/to/my.db"}'
```

**CLI equivalent:** `litestream remove -socket /var/run/litestream.sock /path/to/my.db`

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
