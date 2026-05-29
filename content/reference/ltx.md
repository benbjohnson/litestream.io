---
title : "Command: ltx"
date: 2025-01-21T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 535
---

{{< since version="0.5.0" >}} The `ltx` command lists LTX (Litestream Transaction
Log) files available for a database or replica. This command is not typically
used in normal usage and is mainly used for debugging.

## Usage

### List by database

This command lists all LTX files for a database specified in the Litestream
configuration file:

```
litestream ltx [arguments] DB_PATH
```

### List by replica URL

This command lists all LTX files for a replica URL. This approach is useful
when you do not have a configuration file.

```
litestream ltx [arguments] REPLICA_URL
```

## Arguments

```
-level LEVEL
    View LTX files at a specific compaction level.
    Accepts a level number (0-9) or "all" to show all levels.
    When set to "all", output includes a level column.

-config PATH
    Specifies the configuration file.
    Defaults to /etc/litestream.yml

-no-expand-env
    Disables environment variable expansion in configuration file.

-json
    Output raw JSON instead of human-readable text.
```


## Output

When the `-json` flag is used, the command returns an array of objects with the
following fields:

| Field | Description |
|-------|-------------|
| `level` | Compaction level (0-9) |
| `min_txid` | Minimum transaction ID covered by the LTX file |
| `max_txid` | Maximum transaction ID covered by the LTX file |
| `size` | Size of the LTX file in bytes |
| `timestamp` | Creation timestamp in RFC3339 format |

When no LTX files are found, the command outputs an empty array (`[]`).


## Examples

### Database LTX files

List all LTX files for the `/var/lib/db` database:

```
$ litestream ltx /var/lib/db
```

### View a specific compaction level

List only L0 (uncompacted) LTX files:

```
$ litestream ltx -level 0 /var/lib/db
```

### View all compaction levels

List LTX files across all levels (output includes a `level` column):

```
$ litestream ltx -level all /var/lib/db
```

### Replica URL LTX files

Lists all LTX files for a replica URL:

```
$ litestream ltx s3://mybkt.litestream.io/db
```

### JSON output

Output raw JSON instead of human-readable text:

```
$ litestream ltx -json /var/lib/db
[
  {
    "level": 0,
    "min_txid": "0000000000000001",
    "max_txid": "0000000000000005",
    "size": 4096,
    "timestamp": "2025-01-21T12:00:00Z"
  }
]
```
