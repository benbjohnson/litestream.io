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

### Replica URL LTX files

Lists all LTX files for a single replica URL:

```
$ litestream ltx s3://mybkt.litestream.io/db
```
