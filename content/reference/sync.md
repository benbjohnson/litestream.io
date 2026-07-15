---
title : "Command: sync"
date: 2026-02-20T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 542
---

{{< since version="0.5.9" >}} The `sync` command forces an immediate
WAL-to-LTX sync for a database managed by the Litestream daemon. By default
it triggers the sync and returns immediately (fire-and-forget). With the
`-wait` flag it blocks until the sync completes, including remote replication.

The `sync` command communicates with a running `litestream replicate` process
over the IPC control socket. The daemon must already be running.


## Usage

```
litestream sync [arguments] DB_PATH
```


## Arguments

```
-socket PATH
    Path to the control socket.
    Defaults to /var/run/litestream.sock

-wait
    Block until sync completes including remote replication.
    Defaults to false (fire-and-forget).

-timeout SECONDS
    Maximum time to wait in seconds, best-effort.
    Defaults to 30.

-json
    Output raw JSON instead of human-readable text.
```


## Behavior

The `sync` command operates in two modes:

- **Fire-and-forget** (default): Triggers WAL-to-LTX conversion and returns
  immediately. The output reports the current local transaction ID but does
  not include the remote replication position.

- **Blocking** (`-wait`): Blocks until both WAL-to-LTX conversion and
  LTX-to-remote replication complete. The output additionally reports the
  transaction ID confirmed replicated to remote storage.


## Output

{{< since version="0.5.12" >}} By default, the `sync` command prints
human-readable `key: value` lines. Use the `-json` flag for machine-readable
output. Earlier versions printed the raw JSON response from the
[`POST /sync`](/reference/ipc#post-sync) IPC endpoint.

| Field | Description |
|-------|-------------|
| `db_path` | Absolute path to the database file |
| `txid` | Current local transaction ID |
| `replica_txid` | Transaction ID confirmed replicated to remote storage; only present with `-wait` |
| `duration_ms` | Time the sync request took in milliseconds |

The `replica_txid` field only appears when `-wait` is set. Its value matches
`txid` since the command blocks until replication completes. Without `-wait`,
the field is omitted because the newly synced data has not yet been confirmed
replicated to remote storage.


## Examples

### Basic sync

Trigger an immediate sync for a database:

```
$ litestream sync /path/to/my.db
db_path: /path/to/my.db
txid: 42
duration_ms: 2
```

### Sync and wait for completion

Block until the sync finishes, including remote replication:

```
$ litestream sync -wait /path/to/my.db
db_path: /path/to/my.db
txid: 42
replica_txid: 42
duration_ms: 150
```

### JSON output

Use `-json` for machine-readable output suitable for scripting:

```
$ litestream sync -json /path/to/my.db
{
  "db_path": "/path/to/my.db",
  "txid": 42,
  "duration_ms": 2
}
```

### Sync with custom timeout and socket

Specify a longer timeout and a non-default socket path:

```
$ litestream sync -wait -timeout 60 -socket /tmp/litestream.sock /path/to/my.db
```


## See Also

- [JSON Output Reference](/reference/json-output#sync--json) — Schema for `-json` output
- [IPC Endpoints](/reference/ipc) — Unix socket endpoints including `POST /sync`
- [Command: replicate](/reference/replicate) — Start the replication daemon
- [Configuration Reference](/reference/config) — Complete configuration options
