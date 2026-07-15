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
SQLite databases. You can specify your database & replica in a configuration
file or you can replicate a single database file by specifying its path and its
replica in the command line arguments.


## Usage

### Using a configuration file

This command format will read all options from the configuration file. This
is the recommended approach for production systems.

```
litestream replicate [arguments]
```


### Replicate a single file (Command-line mode)

This command format sets up replication for a single database file `DB_PATH`
to a single replica URL without a configuration file. {{< since version="0.5.0" >}} Multiple replicas per database are no longer supported in command-line mode.
Credentials must be passed via environment variables.

```
litestream replicate [arguments] DB_PATH REPLICA_URL
```

#### When to use command-line mode

Command-line mode is convenient for:

- Simple deployments with a single database
- Development and testing
- Container environments where you prefer environment variables over config files
- CI/CD pipelines with dynamically generated credentials

**Not recommended for production** because:

- Only supports a single database (use config file for multiple databases)
- Limited configuration options (no retention tuning, snapshot intervals, etc.)
- All configuration is command-line only (harder to track in version control)
- Config file mode offers better operational visibility

#### Command-line mode examples

**Basic S3 replication:**

```bash
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
litestream replicate /var/lib/mydb.db s3://mybucket/mydb
```

**With Litestream-specific AWS credentials:**

```bash
export LITESTREAM_ACCESS_KEY_ID=your-access-key
export LITESTREAM_SECRET_ACCESS_KEY=your-secret-key
litestream replicate /var/lib/mydb.db s3://mybucket/mydb
```

**Google Cloud Storage with Application Default Credentials:**

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
litestream replicate /var/lib/mydb.db gs://mybucket/mydb
```

**Azure Blob Storage:**

```bash
export LITESTREAM_AZURE_ACCOUNT_KEY=your-account-key
litestream replicate /var/lib/mydb.db abs://account@myaccount.blob.core.windows.net/container/mydb
```

**Kubernetes with secret injection:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: app
    image: myapp:latest
    env:
    - name: AWS_ACCESS_KEY_ID
      valueFrom:
        secretKeyRef:
          name: aws-credentials
          key: access-key-id
    - name: AWS_SECRET_ACCESS_KEY
      valueFrom:
        secretKeyRef:
          name: aws-credentials
          key: secret-access-key
    - name: LITESTREAM_REPLICA_URL
      value: s3://mybucket/mydb
    - name: DATABASE_PATH
      value: /data/mydb.db
    command:
    - sh
    - -c
    - "litestream replicate $DATABASE_PATH $LITESTREAM_REPLICA_URL & exec myapp"
```

#### Configuration file mode vs command-line mode

| Feature | Config File | Command-line |
|---------|-------------|--------------|
| **Recommended for** | Production | Development/Testing |
| **Number of databases** | Multiple | Single only |
| **Retention configuration** | Full control | Not supported |
| **Snapshot intervals** | Customizable | Default only |
| **Metrics endpoint** | Configurable | Not supported |
| **Multiple replicas per DB** | Single replica | Not supported |
| **Credential management** | File + env vars | Environment variables only |
| **Operability** | Excellent | Limited |
| **Restart behavior** | Persistent config | Command-line only |

#### Passing credentials to command-line mode

Command-line mode **only** supports authentication via environment variables.
You cannot embed credentials in the replica URL for security reasons.

```bash
# ✓ Correct: Credentials via environment variables
export AWS_ACCESS_KEY_ID=key
litestream replicate /var/lib/db.db s3://bucket/db

# ✗ Wrong: Credentials in URL won't work
litestream replicate /var/lib/db.db s3://key:secret@bucket/db
```

For complex deployments with multiple databases or advanced configuration,
use a [configuration file]({{< ref "config" >}}) instead.


## Arguments

{{< alert icon="⚠️" text="**Flag Position**: All flags (such as `-exec`, `-config`) must appear *before* the positional arguments (`DB_PATH` and `REPLICA_URL`). Placing flags after the positional arguments will result in an error." >}}

```
-config PATH
    Specifies the configuration file.
    Defaults to /etc/litestream.yml

-exec CMD
    Executes a subcommand. Litestream will exit when the child
    process exits. Useful for simple process management.

-once
    Replicate once and exit. This performs a single sync of all
    databases and their replicas, then exits. Cannot be used with -exec.

-force-snapshot
    Force a snapshot to be taken for all databases. Requires -once.

-enforce-retention
    Enforce retention policies for old snapshots. Requires -once.

-log-level LEVEL
    Sets the log level. Overrides the config file setting.
    Valid values: trace, debug, info, warn, error

-no-expand-env
    Disables environment variable expansion in configuration file.

-restore-if-db-not-exists
    Restores the database from the replica if it doesn't exist.
```

### Flag ordering example

```
# ✅ Correct: flags before positional arguments
litestream replicate -exec "myapp serve" /path/to/db s3://mybucket/db

# ❌ Incorrect: flags after positional arguments
litestream replicate /path/to/db s3://mybucket/db -exec "myapp serve"
# Error: flag "-exec" must be positioned before DB_PATH and REPLICA_URL arguments
```


## Run-once mode

{{< since version="0.5.6" >}} The `-once` flag performs a single sync of all
databases and their replicas, then exits instead of running as a continuous
server. This is useful for cron jobs, CI/CD pipelines, and backup scripts where
you want a one-time replication rather than a long-running process.

```bash
litestream replicate -once /var/lib/mydb.db s3://mybucket/mydb
```

`-once` cannot be combined with `-exec`, since `-exec` manages a long-running
child process.

Two flags refine run-once behavior and both **require** `-once`:

- `-force-snapshot`—Forces a new snapshot to be taken for all databases.
  Useful for creating a complete backup before maintenance or when migrating
  databases between hosts.
- `-enforce-retention`—Applies the configured snapshot retention policy,
  removing snapshots older than the retention period.

```bash
# Force a fresh snapshot during a one-time sync
litestream replicate -once -force-snapshot /var/lib/mydb.db s3://mybucket/mydb

# Apply retention while syncing once
litestream replicate -once -enforce-retention /var/lib/mydb.db s3://mybucket/mydb
```

Using `-force-snapshot` or `-enforce-retention` without `-once` returns an error.


## Restore if the database does not exist

{{< since version="0.5.6" >}} The `-restore-if-db-not-exists` flag restores the
database from its replica before replication starts if the local database file
is missing. On first start with no existing backup, replication proceeds
normally.

```bash
litestream replicate -restore-if-db-not-exists /var/lib/mydb.db s3://mybucket/mydb
```


## Log level

{{< since version="0.5.7" >}} The `-log-level` flag sets the logging verbosity
and overrides the [`logging`]({{< ref "config#logging" >}}) setting from the
configuration file. Valid values are `trace`, `debug`, `info`, `warn`, and
`error`.

```bash
litestream replicate -log-level debug /var/lib/mydb.db s3://mybucket/mydb
```


## Control socket

{{< since version="0.5.7" >}} The daemon can expose a Unix domain control
socket that the daemon control commands ([`info`]({{< ref "info" >}}),
[`list`]({{< ref "list" >}}), [`sync`]({{< ref "sync" >}}), and others) and
the local [IPC endpoints]({{< ref "ipc" >}}) connect to. The socket is
disabled by default. Enable it with a `socket` block in the configuration
file:

```yaml
socket:
  enabled: true
```

See the [`socket` configuration]({{< ref "config#control-socket" >}}) for the
socket path and permission options.


## See Also

- [Configuration Reference](/reference/config) - Complete configuration options
- [IPC Endpoints](/reference/ipc) - Unix socket endpoints for local status queries and profiling
- [Troubleshooting](/docs/troubleshooting) - Common issues and solutions
- [Getting Started](/getting-started) - Tutorial for setting up replication
