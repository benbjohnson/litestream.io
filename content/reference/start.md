---
title : "Command: start"
date: 2026-05-28T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 548
---

{{< since version="0.5.7" >}} The `start` command resumes replication for a
database that was previously stopped via the `stop` command. The database must
already be registered with the daemon.

The `start` command communicates with a running `litestream replicate` process
over the IPC control socket. The daemon must already be running with the
control socket enabled. The socket is disabled by default; enable it by
setting `enabled: true` in the [`socket` block]({{< ref "config#control-socket" >}})
of the configuration file.

{{< alert icon="💡" text="The <code>start</code> command is different from <code>litestream replicate</code>. Use <code>replicate</code> to launch the daemon process. Use <code>start</code> to resume replication for a specific database on an already-running daemon." >}}


## Usage

```
litestream start [arguments] DB_PATH
```


## Arguments

```
-socket PATH
    Path to the control socket.
    Defaults to /var/run/litestream.sock

-timeout SECONDS
    Maximum time to wait in seconds.
    Defaults to 30.

-json
    Output raw JSON instead of human-readable text.
```


## Behavior

The `start` command is **idempotent**. If the database is already running
(replicating), the command returns `already_running` status and exits
successfully (exit code 0). This allows scripts to safely call `start`
without checking the current replication state.


## Output

By default, the command displays a human-readable confirmation:

```
status: started
db_path: /path/to/my.db
state: running
txid: 42
socket: /var/run/litestream.sock
```

With `-json`, the response is a JSON object:

| Field | Description |
|-------|-------------|
| `status` | Either `started` or `already_running` |
| `db_path` | Absolute path to the database file |
| `state` | Current state after command: `running` |
| `txid` | Current transaction ID |
| `socket` | Control socket path used |


## Examples

### Start replication

```
$ litestream start /path/to/my.db
status: started
db_path: /path/to/my.db
state: running
txid: 42
socket: /var/run/litestream.sock
```

### Idempotent start

Calling `start` on an already-running database succeeds:

```
$ litestream start /path/to/my.db
status: already_running
db_path: /path/to/my.db
state: running
txid: 42
socket: /var/run/litestream.sock
```

### JSON output

```
$ litestream start -json /path/to/my.db
{
  "status": "started",
  "db_path": "/path/to/my.db",
  "state": "running",
  "txid": 42,
  "socket": "/var/run/litestream.sock"
}
```

### Custom socket path

```
$ litestream start -socket /tmp/litestream.sock /path/to/my.db
```


## See Also

- [Command: stop](/reference/stop) — Stop replication for a database
- [Command: replicate](/reference/replicate) — Start the replication daemon
- [Command: list](/reference/list) — List all managed databases
