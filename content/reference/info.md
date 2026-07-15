---
title : "Command: info"
date: 2026-05-28T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 543
---

{{< since version="0.5.8" >}} The `info` command displays information about a
running Litestream daemon, including version, process ID, uptime, and the number
of databases being managed.

The `info` command communicates with a running `litestream replicate` process
over the IPC control socket. The daemon must already be running with the
control socket enabled. The socket is disabled by default; enable it by
setting `enabled: true` in the [`socket` block]({{< ref "config#control-socket" >}})
of the configuration file.


## Usage

```
litestream info [arguments]
```


## Arguments

```
-socket PATH
    Path to the control socket.
    Defaults to /var/run/litestream.sock

-timeout SECONDS
    Maximum time to wait in seconds.
    Defaults to 10.

-json
    Output raw JSON instead of human-readable text.
```


## Output

By default, the `info` command displays daemon information in a human-readable
format:

```
$ litestream info
Litestream 0.5.12
  PID:        12345
  Uptime:     1h30m0s
  Started at: 2026-05-28T10:00:00Z
  Databases:  3
```

With the `-json` flag, it returns a JSON object:

| Field | Description |
|-------|-------------|
| `version` | Litestream version string |
| `pid` | Process ID of the daemon |
| `uptime_seconds` | Daemon uptime in seconds |
| `started_at` | ISO 8601 timestamp of when the daemon started |
| `database_count` | Number of databases currently managed |


## Examples

### Basic daemon info

```
$ litestream info
Litestream 0.5.12
  PID:        12345
  Uptime:     1h30m0s
  Started at: 2026-05-28T10:00:00Z
  Databases:  3
```

### JSON output

```
$ litestream info -json
{
  "version": "0.5.12",
  "pid": 12345,
  "uptime_seconds": 5400,
  "started_at": "2026-05-28T10:00:00Z",
  "database_count": 3
}
```

### Custom socket path

```
$ litestream info -socket /tmp/litestream.sock
```


## See Also

- [JSON Output Reference](/reference/json-output#info--json) — Schema for `-json` output
- [IPC Endpoints](/reference/ipc) — Unix socket endpoints including `GET /info`
- [Command: list](/reference/list) — List all managed databases
- [Command: replicate](/reference/replicate) — Start the replication daemon
