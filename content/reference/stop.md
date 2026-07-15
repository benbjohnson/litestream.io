---
title : "Command: stop"
date: 2026-05-28T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 549
---

{{< since version="0.5.7" >}} The `stop` command pauses replication for a
database without removing it from the daemon. The database remains registered
and can be resumed with the `start` command. Before stopping, it performs a
final sync to ensure all data is replicated.

The `stop` command communicates with a running `litestream replicate` process
over the IPC control socket. The daemon must already be running.


## Usage

```
litestream stop [arguments] DB_PATH
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

The `stop` command is **idempotent**. If the database is already stopped, the
command returns `already_stopped` status and exits successfully (exit code 0).
This allows scripts to safely call `stop` without checking the current
replication state.

The `stop` command always waits for shutdown and final sync to complete before
returning. The database remains registered with the daemon and can be resumed
using the `start` command.


## Output

By default, the command displays a human-readable confirmation:

```
status: stopped
db_path: /path/to/my.db
state: stopped
txid: 42
socket: /var/run/litestream.sock
```

With `-json`, the response is a JSON object:

| Field | Description |
|-------|-------------|
| `status` | Either `stopped` or `already_stopped` |
| `db_path` | Absolute path to the database file |
| `state` | Current state after command: `stopped` |
| `txid` | Final transaction ID after sync |
| `socket` | Control socket path used |


## Examples

### Stop replication

```
$ litestream stop /path/to/my.db
status: stopped
db_path: /path/to/my.db
state: stopped
txid: 42
socket: /var/run/litestream.sock
```

### Idempotent stop

Calling `stop` on an already-stopped database succeeds:

```
$ litestream stop /path/to/my.db
status: already_stopped
db_path: /path/to/my.db
state: stopped
txid: 42
socket: /var/run/litestream.sock
```

### JSON output

```
$ litestream stop -json /path/to/my.db
{
  "status": "stopped",
  "db_path": "/path/to/my.db",
  "state": "stopped",
  "txid": 42,
  "socket": "/var/run/litestream.sock"
}
```

### Custom timeout

Wait up to 60 seconds for the final sync:

```
$ litestream stop -timeout 60 /path/to/my.db
```


## See Also

- [Command: start](/reference/start) — Resume replication for a database
- [Command: unregister](/reference/unregister) — Remove a database from the daemon entirely
- [Command: replicate](/reference/replicate) — Start the replication daemon
