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

This command lists all LTX files across all replicas for a database specified
in the Litestream configuration file:

```
litestream ltx [arguments] DB_PATH
```

### List by replica URL

This command lists all LTX files for a single replica URL. This approach is
useful when you do not have a configuration file.

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

-replica NAME
    Optional, filter by a specific replica.
```

## Examples

### Database LTX files

List all LTX files across all replicas for the `/var/lib/db` database:

```
$ litestream ltx /var/lib/db
```

### Filter by replica name

Lists all LTX files for the `/var/lib/db` database but filters by the `s3` replica:

```
$ litestream ltx -replica s3 /var/lib/db
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

Lists all LTX files for a single replica URL:

```
$ litestream ltx s3://mybkt.litestream.io/db
```
