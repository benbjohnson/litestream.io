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
```


## Behavior

The `sync` command operates in two modes:

- **Fire-and-forget** (default): Triggers WAL-to-LTX conversion and returns
  immediately. The response status will be `synced_local` if changes were
  synced, or `no_change` if the database was already up to date.

- **Blocking** (`-wait`): Blocks until both WAL-to-LTX conversion and
  LTX-to-remote replication complete. The response status will be `synced`
  when complete, or `no_change` if the database was already up to date.


## Output

The `sync` command returns JSON output with the following fields:

| Field | Description |
|-------|-------------|
| `status` | Sync status: `synced_local`, `synced`, or `no_change` |
| `path` | Absolute path to the database file |
| `txid` | Current local transaction ID |
| `replicated_txid` | Transaction ID confirmed replicated to remote storage |

The `replicated_txid` field indicates the transaction ID that has been durably
replicated to remote storage:

- With `-wait`: Returns the confirmed replicated transaction ID, allowing you
  to verify that writes have been durably replicated to remote storage.
- Without `-wait`: Returns `0` since remote replication is not awaited in
  fire-and-forget mode.


## Examples

### Basic sync

Trigger an immediate sync for a database:

```
$ litestream sync /path/to/my.db
{"status":"synced_local","path":"/path/to/my.db","txid":42,"replicated_txid":0}
```

### Sync and wait for completion

Block until the sync finishes, including remote replication:

```
$ litestream sync -wait /path/to/my.db
{"status":"synced","path":"/path/to/my.db","txid":42,"replicated_txid":42}
```

### Sync with custom timeout and socket

Specify a longer timeout and a non-default socket path:

```
$ litestream sync -wait -timeout 60 -socket /tmp/litestream.sock /path/to/my.db
```


## See Also

- [IPC Endpoints](/reference/ipc) — Unix socket endpoints including `POST /sync`
- [Command: replicate](/reference/replicate) — Start the replication daemon
- [Configuration Reference](/reference/config) — Complete configuration options
