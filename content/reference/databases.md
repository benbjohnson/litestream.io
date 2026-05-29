---
title : "Command: databases"
date: 2021-02-01T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 510
---

The `databases` command lists all databases in the configuration file as well
as list their associated replicas.

## Usage

```
litestream databases [arguments]
```

## Arguments

```
-config PATH
    Specifies the configuration file.
    Defaults to /etc/litestream.yml

-no-expand-env
    Disables environment variable expansion in configuration file.

-json
    Output raw JSON instead of human-readable text.
```


## Example

This example shows a single database `/var/lib/db` defined in the configuration
file with two replicas named `"file"` and `"s3"`:

```
$ litestream databases
path         replicas
/var/lib/db  file,s3
```


## JSON Output

{{< since version="0.5.12" >}} With the `-json` flag, the `databases` command
writes a JSON array to stdout:

```
$ litestream databases -json
[
  {
    "path": "/var/lib/db",
    "replica": "s3"
  }
]
```

When no databases are configured, the command emits an empty array (`[]`).

See the [JSON Output Reference](/reference/json-output#databases--json) for the
complete schema documentation.


## See Also

- [JSON Output Reference](/reference/json-output#databases--json) — Schema for `-json` output
- [Configuration Reference](/reference/config) — Complete configuration options

