---
title : "Command: reset"
date: 2026-02-01T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 545
---

{{< since version="0.5.7" >}} The `reset` command clears local Litestream
state for a database, forcing a fresh snapshot on the next replication sync.
This is useful for recovering from corrupted or missing LTX files without
modifying the database itself.

The `reset` command only removes Litestream's internal tracking files from
the metadata directory (`.db-litestream`). It does **not** modify, delete,
or otherwise alter your SQLite database file.


## Usage

```
litestream reset [arguments] DB_PATH
```


## Arguments

```
-config PATH
    Specifies the configuration file.
    Defaults to /etc/litestream.yml

-no-expand-env
    Disables environment variable expansion in configuration file.
```


## When to Use

Use `litestream reset` when you encounter replication errors related to
corrupted or missing LTX files. Common error messages that indicate a reset
is needed:

- `cannot close, expected page`
- `nonsequential page numbers in snapshot transaction`
- `non-contiguous transaction files`
- Repeated sync retry backoff loops in logs

These errors typically occur after:

- Unclean shutdowns (power loss, OOM kills, `SIGKILL`)
- Corrupted local metadata
- Manual deletion of tracking files without clearing the remote replica

{{< alert icon="⚠️" text="After a reset, Litestream will create a fresh snapshot on the next sync. This means you will lose the ability to do point-in-time recovery to timestamps before the reset." >}}

For automatic recovery without manual intervention, see the
[`auto-recover`]({{< ref "config#auto-recover" >}}) configuration option.


## Examples

### Reset with a database path

Reset local state for a database specified in the configuration file:

```
$ litestream reset /var/lib/db
```

### Reset with a custom config file

Specify a non-default configuration file:

```
$ litestream reset -config /etc/myapp/litestream.yml /var/lib/db
```

### Full recovery workflow

When encountering LTX replication errors, follow these steps:

```bash
# 1. Stop Litestream
sudo systemctl stop litestream

# 2. Reset local state
litestream reset /var/lib/db

# 3. Restart Litestream (will create a fresh snapshot)
sudo systemctl start litestream
```


## See Also

- [`auto-recover` configuration](/reference/config#auto-recover) - Automatic reset on LTX errors
- [LTX Replication Errors](/docs/troubleshooting#ltx-replication-errors) - Troubleshooting guide
- [Recovering from Corrupted Tracking State](/docs/troubleshooting#recovering-from-corrupted-tracking-state)
