---
title : "Command: list"
date: 2026-05-28T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 544
---

{{< since version="0.5.12" >}} The `list` command displays all databases
currently managed by a running Litestream daemon, along with their replication
status and last sync time.

The `list` command communicates with a running `litestream replicate` process
over the IPC control socket. The daemon must already be running.


## Usage

```
litestream list [arguments]
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

By default, the `list` command displays databases in a human-readable format
showing the path, status, and last sync time:

```
$ litestream list
/var/lib/app.db [replicating] (last sync: 2026-05-28T10:30:00Z)
/var/lib/users.db [replicating] (last sync: 2026-05-28T10:29:45Z)
```

With the `-json` flag, it returns a JSON object with a `databases` array:

| Field | Description |
|-------|-------------|
| `databases` | Array of database summary objects |

Each database summary contains:

| Field | Description |
|-------|-------------|
| `path` | Absolute path to the database file |
| `status` | Current status: `replicating`, `open`, or `stopped` |
| `last_sync_at` | ISO 8601 timestamp of last successful sync (omitted if never synced) |


## Database Status Values

| Status | Description |
|--------|-------------|
| `replicating` | Database is open with active replication monitoring |
| `open` | Database is open but replication monitoring is disabled |
| `stopped` | Replication for this database has been stopped |


## Examples

### List all databases

```
$ litestream list
/var/lib/app.db [replicating] (last sync: 2026-05-28T10:30:00Z)
/var/lib/users.db [replicating] (last sync: 2026-05-28T10:29:45Z)
```

### JSON output

```
$ litestream list -json
{
  "databases": [
    {
      "path": "/var/lib/app.db",
      "status": "replicating",
      "last_sync_at": "2026-05-28T10:30:00Z"
    },
    {
      "path": "/var/lib/users.db",
      "status": "replicating",
      "last_sync_at": "2026-05-28T10:29:45Z"
    }
  ]
}
```

### Empty database list

```
$ litestream list
No databases configured
```

### Custom socket path

```
$ litestream list -socket /tmp/litestream.sock
```


## See Also

- [JSON Output Reference](/reference/json-output#list--json) — Schema for `-json` output
- [IPC Endpoints](/reference/ipc) — Unix socket endpoints including `GET /list`
- [Command: info](/reference/info) — Show daemon information
- [Command: databases](/reference/databases) — List databases from config file (offline)
