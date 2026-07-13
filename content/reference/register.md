---
title : "Command: register"
date: 2026-05-28T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 546
---

{{< since version="0.5.8" >}} The `register` command dynamically adds a
database to a running Litestream daemon without requiring a restart. This
enables runtime database management for applications that create databases
on-the-fly.

The `register` command communicates with a running `litestream replicate` process
over the IPC control socket. The daemon must already be running.


## Usage

```
litestream register [arguments] DB_PATH
```


## Arguments

```
-replica URL
    Replica destination URL (e.g., s3://bucket/prefix, file:///backup/path).
    Required.

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

The `register` command is **idempotent**. If the database is already registered
with the daemon, the command returns `already_registered` status and exits
successfully (exit code 0). This allows scripts to safely call `register`
without checking whether the database is already being replicated.


## Output

By default, the command displays a human-readable confirmation:

```
status: registered
db_path: /path/to/my.db
replica: s3://mybucket/my.db
socket: /var/run/litestream.sock
```

With `-json`, the response is a JSON object:

| Field | Description |
|-------|-------------|
| `status` | Either `registered` or `already_registered` |
| `db_path` | Absolute path to the database file |
| `replica` | Replica URL that was registered |
| `socket` | Control socket path used |


## Examples

### Register with S3 replica

```
$ litestream register -replica s3://mybucket/db /path/to/my.db
status: registered
db_path: /path/to/my.db
replica: s3://mybucket/db
socket: /var/run/litestream.sock
```

### Register with file replica

```
$ litestream register -replica file:///backup/my.db /path/to/my.db
status: registered
db_path: /path/to/my.db
replica: file:///backup/my.db
socket: /var/run/litestream.sock
```

### Idempotent registration

Calling `register` on an already-registered database succeeds:

```
$ litestream register -replica s3://mybucket/db /path/to/my.db
status: already registered
db_path: /path/to/my.db
replica: s3://mybucket/db
socket: /var/run/litestream.sock
```

### JSON output

```
$ litestream register -json -replica s3://mybucket/db /path/to/my.db
{
  "status": "registered",
  "db_path": "/path/to/my.db",
  "replica": "s3://mybucket/db",
  "socket": "/var/run/litestream.sock"
}
```

### Custom socket path

```
$ litestream register -socket /tmp/litestream.sock -replica s3://mybucket/db /path/to/my.db
```


## See Also

- [IPC Endpoints](/reference/ipc) — Unix socket endpoints including `POST /register`
- [Command: unregister](/reference/unregister) — Remove a database from the daemon
- [Command: replicate](/reference/replicate) — Start the replication daemon
- [Configuration Reference](/reference/config) — Complete configuration options
