---
title : "Command: status"
date: 2026-05-28T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 541
---

{{< since version="0.5.6" >}} The `status` command reports the local
replication status of the databases defined in your configuration file. It
inspects each database on disk and prints the latest local transaction ID and
current WAL file size, making it useful for quick health checks and scripting.

The `status` command reads directly from the local database and LTX files. It
does not require a running `litestream replicate` daemon and does not contact
remote storage.


## Usage

```
litestream status [arguments] [database path]
```

If a database path is provided, only that database's status is shown.
Otherwise, all databases in the configuration file are displayed.


## Arguments

```
-config PATH
    Specifies the configuration file.
    Defaults to /etc/litestream.yml

-json
    Output raw JSON instead of human-readable text.

-no-expand-env
    Disables environment variable expansion in configuration file.
```


## Output

By default, the `status` command prints an aligned, human-readable table with
one row per database:

| Column | Description |
|--------|-------------|
| `database` | Path to the SQLite database |
| `status` | Current local replication status |
| `local txid` | Latest local transaction ID, or `-` if unavailable |
| `wal size` | Current WAL file size, or `-` if unavailable |

The `status` column reports one of the following values:

| Status | Description |
|--------|-------------|
| `ok` | The database has been initialized and has local LTX data |
| `not initialized` | The database file exists but has no local LTX data yet |
| `no database` | No database file exists at the configured path |
| `error` | The local transaction ID could not be read |


### JSON output

{{< since version="0.5.12" >}} With the `-json` flag, the `status` command
writes a JSON array to stdout with one object per database:

| Field | Type | Description |
|-------|------|-------------|
| `database` | string | Path to the SQLite database |
| `status` | string | Current local replication status: `ok`, `not initialized`, `no database`, or `error` |
| `local_txid` | string | Latest local transaction ID, or `-` if unavailable |
| `wal_size` | string | Current WAL file size as human-readable text, or `-` if unavailable |

When no databases are configured, or none match the supplied database path, the
command emits `null`.


## Examples

### Show status for all databases

Display the status of every database in the configuration file:

```
$ litestream status
database           status       local txid        wal size
/var/lib/app.db    ok           0000000000000004  32 kB
/var/lib/cache.db  no database  -                 -
```

### Show status for a single database

Provide a database path to limit output to just that database:

```
$ litestream status /var/lib/app.db
database         status  local txid        wal size
/var/lib/app.db  ok      0000000000000004  32 kB
```

### JSON output

Use `-json` for machine-readable output suitable for scripting:

```
$ litestream status -json
[
  {
    "database": "/var/lib/app.db",
    "status": "ok",
    "local_txid": "0000000000000004",
    "wal_size": "32 kB"
  }
]
```


## See Also

- [Command: databases](/reference/databases) — List databases specified in the config file
- [Command: sync](/reference/sync) — Force an immediate WAL-to-LTX sync for a database
- [Configuration Reference](/reference/config) — Complete configuration options
