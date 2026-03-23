---
title : "Command: stop"
date: 2026-03-23T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 537
---

{{< since version="0.5.7" >}} The `stop` command tells a running Litestream
daemon to disable replication for a specific database. It communicates with the
`litestream replicate` process over the IPC control socket.

{{< alert icon="⚠️" text="<strong>This does not stop the Litestream daemon.</strong> To stop the daemon itself, terminate the <a href=\"/reference/replicate\"><code>litestream replicate</code></a> process (e.g. via <code>systemctl stop litestream</code> or <code>Ctrl-C</code>). The <code>stop</code> command only disables replication for a single database on an <em>already running</em> daemon." >}}


## Usage

```
litestream stop [arguments] DB_PATH
```

The daemon must already be running via [`litestream replicate`](/reference/replicate)
with the IPC control socket enabled. If the socket is not enabled or no daemon is
running, the command will fail with a connection error.

To enable the control socket, add this to your configuration file:

```yaml
socket:
  enabled: true
  path: /var/run/litestream.sock
```

The `stop` command always waits for shutdown and a final sync before returning.


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

### Stop replicating a database

Tell the running daemon to disable replication for a database:

```bash
$ litestream stop /path/to/my.db
```

### Use a custom socket path and timeout

```bash
$ litestream stop -timeout 60 -socket /tmp/litestream.sock /path/to/my.db
```


## How it works

The `stop` command sends a request to the daemon's IPC control socket
(`POST /stop`) to disable replication for a database. The daemon performs a
final sync before disabling, then continues running and replicating any
remaining databases. The database remains in the daemon's configuration and
can be re-enabled later.

To later resume replication, use [`litestream start`](/reference/start).


## See Also

- [Command: replicate](/reference/replicate) — Start the replication daemon
- [Command: start](/reference/start) — Start replicating a specific database
- [Command: sync](/reference/sync) — Force an immediate sync for a database
- [IPC Endpoints](/reference/ipc) — Unix socket endpoints including `POST /stop`
