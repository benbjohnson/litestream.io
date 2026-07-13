---
title : "Command: databases"
date: 2021-02-01T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 510
---

The `databases` command lists all databases in the configuration file along with
their associated replica.

## Usage

```
litestream databases [arguments]
```

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

By default, the `databases` command prints an aligned, human-readable table with
one row per database:

| Column | Description |
|--------|-------------|
| `path` | Path to the SQLite database |
| `replica` | Type of the configured replica |


### JSON output

{{< since version="0.5.12" >}} With the `-json` flag, the `databases` command
writes a JSON array to stdout with one object per database:

| Field | Type | Description |
|-------|------|-------------|
| `path` | string | Path to the SQLite database |
| `replica` | string | Type of the configured replica |

When no databases are configured, the command emits an empty JSON array (`[]`).

See the [JSON Output Reference](/reference/json-output#databases--json) for the
complete schema documentation.


## Examples

### List all databases

This example shows a single database `/var/lib/db` defined in the configuration
file with a `file` replica:

```
$ litestream databases
path         replica
/var/lib/db  file
```

### JSON output

Use `-json` for machine-readable output suitable for scripting:

```
$ litestream databases -json
[
  {
    "path": "/var/lib/db",
    "replica": "file"
  }
]
```


## See Also

- [JSON Output Reference](/reference/json-output#databases--json) — Schema for `-json` output
- [Command: status](/reference/status) — Report local replication status
- [Configuration Reference](/reference/config) — Complete configuration options
