---
title : "Command: unregister"
date: 2026-05-28T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 547
---

{{< since version="0.5.8" >}} The `unregister` command dynamically removes a
database from a running Litestream daemon without requiring a restart. Before
completing, it performs a final sync to ensure all data is replicated.

The `unregister` command communicates with a running `litestream replicate` process
over the IPC control socket. The daemon must already be running.


## Usage

```
litestream unregister [arguments] DB_PATH
```


## Arguments

```
-socket PATH
    Path to the control socket.
    Defaults to /var/run/litestream.sock

-timeout SECONDS
    Maximum time to wait in seconds.
    Defaults to 30.

-dry-run
    Preview what would be unregistered without changing the daemon.

-json
    Output raw JSON instead of human-readable text.
```


## Behavior

The `unregister` command is **idempotent**. If the database is not currently
registered with the daemon, the command returns `already_unregistered` status
and exits successfully (exit code 0). This allows scripts to safely call
`unregister` without checking whether the database is currently being replicated.

When unregistering a database, Litestream performs a final sync to ensure all
pending changes are replicated before removing the database from management.


## Output

By default, the command displays a human-readable confirmation:

```
status: unregistered
db_path: /path/to/my.db
final_txid: 42
socket: /var/run/litestream.sock
```

With `-json`, the response is a JSON object:

| Field | Description |
|-------|-------------|
| `status` | Either `unregistered` or `already_unregistered` |
| `db_path` | Absolute path to the database file |
| `final_txid` | Last transaction ID synced before unregistering |
| `socket` | Control socket path used |


## Examples

### Unregister a database

```
$ litestream unregister /path/to/my.db
status: unregistered
db_path: /path/to/my.db
final_txid: 42
socket: /var/run/litestream.sock
```

### Dry run

Preview what would be unregistered without making changes:

```
$ litestream unregister -dry-run /path/to/my.db
Dry run: unregister request preview
  database: /path/to/my.db
  socket: /var/run/litestream.sock
  replicas: daemon-managed replica for this database
  final sync: daemon close will sync the database and replica before the command completes
  timeout: 30s
No unregister request was sent.
```

### Idempotent unregistration

Calling `unregister` on an already-unregistered database succeeds:

```
$ litestream unregister /path/to/my.db
status: already_unregistered
db_path: /path/to/my.db
final_txid: 0
socket: /var/run/litestream.sock
```

### JSON output

```
$ litestream unregister -json /path/to/my.db
{
  "status": "unregistered",
  "db_path": "/path/to/my.db",
  "final_txid": 42,
  "socket": "/var/run/litestream.sock"
}
```

### Custom timeout

Wait up to 60 seconds for the final sync to complete:

```
$ litestream unregister -timeout 60 /path/to/my.db
```


## See Also

- [IPC Endpoints](/reference/ipc) — Unix socket endpoints including `POST /unregister`
- [Command: register](/reference/register) — Add a database to the daemon
- [Command: replicate](/reference/replicate) — Start the replication daemon
