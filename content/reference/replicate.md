---
title : "Command: replicate"
date: 2021-02-01T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 530
---

The `replicate` command starts a server to monitor & continuously replicate
SQLite databases. You can specify your database & replicas in a configuration
file or you can replicate a single database file by specifying its path and its
replicas in the command line arguments.


## Usage

### Using a configuration file

This command format will read all options from the configuration file. This
is the recommended approach for production systems.

```
litestream replicate [arguments]
```


### Replicate a single file (command-line mode)

This command format sets up replication for a single database file `DB_PATH`
and replicates it to one or more replica URLs. This approach is useful for:

- Simple deployments with a single database
- Testing Litestream functionality
- Environments where credentials must be managed via environment variables
- Docker/Kubernetes deployments using secrets

```sh
litestream replicate [arguments] DB_PATH REPLICA_URL [REPLICA_URL...]
```

**Example:**

```sh
export LITESTREAM_ACCESS_KEY_ID="your-key"
export LITESTREAM_SECRET_ACCESS_KEY="your-secret"
litestream replicate /var/lib/db.sqlite s3://mybucket/db
```

#### When to use each approach

| Feature | Command-Line Mode | Config File Mode |
|---------|-------------------|------------------|
| Number of databases | Single | Multiple |
| Replica settings | Default only | Customizable |
| Sync interval customization | Default only | Per-replica |
| Retention policies | Default only | Customizable |
| Metrics endpoint | Not available | Configurable |
| MCP server | Not available | Configurable |
| Exec command | Via `-exec` flag | Via config |
| Credential management | Environment variables | Config file + env var expansion |

**Recommendations:**

- **Command-line mode**: Simple single-database deployments, testing,
  environments requiring credential management via environment variables
- **Config file mode**: Production systems, multiple databases, custom
  intervals/retention, metrics, or advanced features


## Arguments

```
-config PATH
    Specifies the configuration file.
    Defaults to /etc/litestream.yml

-exec CMD
    Executes a subcommand. Litestream will exit when the child
    process exits. Useful for simple process management.

-no-expand-env
    Disables environment variable expansion in configuration file.
```
