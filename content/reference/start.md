---
title : "Command: start"
date: 2026-03-23T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 535
---

{{< since version="0.5.8" >}} The `start` command tells a running Litestream
daemon to enable replication for a specific database. It communicates with the
`litestream replicate` process over the IPC control socket.

{{< alert icon="⚠️" text="<strong>Looking to start the Litestream daemon?</strong> The <code>start</code> command does <em>not</em> start the daemon. Use <a href=\"/reference/replicate\"><code>litestream replicate</code></a> to start the replication daemon. The <code>start</code> command only enables replication for a database that is already configured in the daemon." >}}


## Usage

```
litestream start [arguments] DB_PATH
```

The daemon must already be running via [`litestream replicate`](/reference/replicate).
If no daemon is running, the command will fail with a connection error.


## Arguments

```
-timeout SECONDS
    Maximum time to wait in seconds.
    Defaults to 30.

-socket PATH
    Path to the control socket.
    Defaults to /var/run/litestream.sock
```


## Examples

### Start replicating a database

Tell the running daemon to enable replication for a database:

```bash
$ litestream start /path/to/my.db
```

### Use a custom socket path and timeout

```bash
$ litestream start -timeout 60 -socket /tmp/litestream.sock /path/to/my.db
```


## How it works

The `start` command sends a request to the daemon's IPC control socket
(`POST /start`) to enable replication for a configured database. The database
must already be known to the daemon — either from the configuration file or
from a prior [`register`](/reference/ipc#post-register) call.

To later stop replicating the database, use [`litestream stop`](/reference/stop).


## See Also

- [Command: replicate](/reference/replicate) — Start the replication daemon
- [Command: stop](/reference/stop) — Stop replicating a specific database
- [Command: sync](/reference/sync) — Force an immediate sync for a database
- [IPC Endpoints](/reference/ipc) — Unix socket endpoints including `POST /start`
