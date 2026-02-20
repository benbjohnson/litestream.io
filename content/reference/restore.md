---
title : "Command: restore"
date: 2021-02-01T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 540
---

The `restore` command recovers a database from a replica. By default, it
attempts to restore the latest data. However, it can also restore databases
to a specific point-in-time if it is covered by the WAL time range. It can
also run in follow mode (`-f`) to continuously restore new data as it becomes
available, enabling read-only database replicas.

Restoration will only run if the output database file does not exist so you
cannot accidentally overwrite your running database.

{{< alert icon="⚠️" text="**Age Encryption Note**: Age encryption is not available in v0.5.0+. If you are attempting to restore from an Age-encrypted replica created with v0.3.x, the restore will fail. Please review the [migration guide](/docs/migration/#age-encryption-migration) for upgrade options." >}}


## Usage

### With a database path

This command will restore a database specified in the Litestream configuration
file to its original location.

```
litestream restore [arguments] DB_PATH
```


### With a replica URL

This command will restore from a replica without using the Litestream
configuration file. It is useful if you don't have a configuration file such
as on a development machine.

```
litestream restore [arguments] REPLICA_URL
```


## Arguments

```
-o PATH
    Output path of the restored database.
    Defaults to original DB path.

-if-db-not-exists
    Returns exit code of 0 if the database already exists.

-if-replica-exists
    Returns exit code of 0 if no backups are found. This flag allows the restore
    command to succeed gracefully when no matching backup files are available,
    which is useful for automation and conditional restore scenarios.

-parallelism NUM
    Determines the number of WAL files downloaded in parallel.
    Defaults to 8

-txid TXID
    Restore up to a specific hex-encoded transaction ID (inclusive).
    Defaults to use the highest available transaction.

-timestamp TIMESTAMP
    Restore to a specific point-in-time.
    Defaults to use the latest available backup.

-f
    Continuously restores new data as it becomes available.
    The restored database should only be opened in read-only mode.
    Incompatible with -txid and -timestamp.

-follow-interval DURATION
    Sets the polling interval for follow mode.
    Defaults to 1s.

-config PATH
    Specifies the configuration file.
    Defaults to /etc/litestream.yml

-no-expand-env
    Disables environment variable expansion in configuration file.
```


## Conditional Restore Behavior

### Using -if-replica-exists

The `-if-replica-exists` flag modifies the restore command's behavior when no
backup files are found. Without this flag, the command will fail with a
non-zero exit code if no matching backups exist. With the flag enabled, the
command succeeds (exit code 0) and logs "no matching backups found" instead.

This flag is particularly useful for:

- **Automation scripts**: Prevent automated restore processes from failing when
  backups don't exist yet
- **Conditional operations**: Create scripts that attempt restoration but
  continue with alternative logic if no backups are available
- **Idempotent deployments**: Build deployment scripts that can safely run
  restore operations without breaking when backups aren't present
- **Testing environments**: Allow test environments to attempt restoration
  without failing if the backup source hasn't been populated

### Exit Code Behavior

The command returns different exit codes based on the presence of backups:

| Scenario | Without flag | With -if-replica-exists |
|----------|-------------|------------------------|
| Backups found and restored | Exit 0 | Exit 0 |
| No backups found | Exit 1 (error) | Exit 0 (success) |
| Other errors | Exit 1 (error) | Exit 1 (error) |

Note that this flag only affects the behavior when `ErrTxNotAvailable` is
returned (no matching backup files). Other errors will still result in a
non-zero exit code.

### Interaction with Other Flags

The `-if-replica-exists` flag works alongside other restore flags:

- **-if-db-not-exists**: Combined with `-if-replica-exists`, you can create
  truly idempotent restore operations that succeed whether the database exists,
  doesn't exist, or has no backups available
- **-timestamp**: When used with point-in-time restore, the flag will succeed
  gracefully if no backups exist at the specified timestamp

### Important Notes

- The flag only suppresses the "no backups found" error; other restore errors
  will still return non-zero exit codes
- When the flag is used and no backups are found, a log message is emitted:
  "no matching backups found"


## Follow Mode

{{< since version="0.5.8" >}} The `-f` flag enables follow mode, which
continuously polls for new LTX files after the initial restore is complete.
This keeps the restored database up-to-date as new transactions are replicated,
enabling read-only database replicas that stay in sync with the primary.

{{< alert icon="⚠️" text="The restored database must only be opened in **read-only mode** (e.g. `PRAGMA query_only = ON` or `?mode=ro`). Writing to the database while follow mode is running will cause conflicts." >}}

Follow mode runs indefinitely until stopped with `Ctrl+C` (SIGINT), at which
point it shuts down cleanly. The polling interval can be adjusted with
`-follow-interval` (default: `1s`).

The `-f` flag is incompatible with `-txid` and `-timestamp` because follow mode
is designed to continuously track the latest state rather than restore to a
fixed point.


## Examples

### Database restore

Restore the latest replica for the `/var/lib/db` database to its original
location:

```
$ litestream restore /var/lib/db
```

### Replica URL restore

Restore from an S3 replica URL to `/tmp/my.db`:

```
$ litestream restore -o /tmp/my.db s3://mybkt.litestream.io/my.db
```

### Restore to new path

Restores the `/var/lib/db` database to `/tmp/db` instead of its original location:

```
$ litestream restore -o /tmp/db /var/lib/db
```

### Point-in-time restore


Restore the `/var/lib/db` database to a specific point-in-time:

```
$ litestream restore -timestamp 2020-01-01T00:00:00Z /var/lib/db
```

### Follow mode

Continuously restore new data from an S3 replica to maintain a read-only
replica:

```
$ litestream restore -f -o /tmp/read-replica.db s3://mybkt/db
```

### Follow mode with custom interval

Use a longer polling interval to reduce the frequency of replica checks:

```
$ litestream restore -f -follow-interval 5s -o /tmp/read-replica.db s3://mybkt/db
```

### Conditional restore in automation

Use `-if-replica-exists` to allow restore operations to succeed even when no
backups are available:

```
$ litestream restore -if-replica-exists /var/lib/db
```

If backups exist, the database is restored. If no backups are found, the
command exits successfully (exit code 0) with a log message.

### Idempotent deployment script

Combine `-if-db-not-exists` and `-if-replica-exists` for fully idempotent
restore operations:

```
$ litestream restore -if-db-not-exists -if-replica-exists /var/lib/db
```

This command will succeed in these scenarios:

- Database exists: exits successfully without overwriting
- Database doesn't exist, backups available: restores the database
- Database doesn't exist, no backups: exits successfully without error

Note: Other errors (network failures, permission issues, corruption, etc.) will
still cause the command to fail with a non-zero exit code.

### Shell script with error handling

Example script that attempts restoration with fallback logic:

```sh
#!/bin/bash
set -e

# Attempt to restore from backup
if litestream restore -if-replica-exists -o /var/lib/app.db s3://mybkt/app.db; then
  echo "Restore completed or no backups found"

  # Check if database exists after restore attempt
  if [ ! -f /var/lib/app.db ]; then
    echo "No backups available, initializing new database"
    # Initialize new database
    sqlite3 /var/lib/app.db < schema.sql
  fi
else
  echo "Restore failed with error"
  exit 1
fi

# Start application
./start-app.sh
```

### Automation with explicit error checking

Script that distinguishes between "no backups" and actual errors:

```sh
#!/bin/bash

# Attempt restore without the flag to detect actual errors
if litestream restore /var/lib/db 2>&1 | grep -q "no matching backup files"; then
  echo "No backups found, proceeding with empty database"
  # Initialize database or take alternative action
elif [ $? -eq 0 ]; then
  echo "Database restored successfully"
else
  echo "Restore failed with error"
  exit 1
fi
```

Alternatively, use the flag for simpler logic:

```sh
#!/bin/bash
set -e

# With -if-replica-exists, this succeeds when no backups are found
# (but other errors like network failures will still cause it to fail)
litestream restore -if-replica-exists /var/lib/db

# Check if we got a database or need to initialize
if [ -f /var/lib/db ]; then
  echo "Database restored from backup"
else
  echo "No backups found, initializing new database"
  # Initialize database
fi
```


## Format Detection

{{< since version="0.5.8" >}} The `restore` command automatically detects whether
backups are in v0.3.x format or LTX format and restores from whichever has the
best available data. This works transparently for both file and S3 backends.

| Scenario | Behavior |
|----------|----------|
| With `-timestamp` | Uses format with best snapshot before timestamp |
| Without `-timestamp` | Uses format with most recent backup overall |
| Only v0.3.x exists | Uses v0.3.x restore |
| Only LTX exists | Uses LTX restore |
| Both exist, v0.3.x newer | Uses v0.3.x restore |
| Both exist, LTX newer | Uses LTX restore |

The `-timestamp` flag works across both formats, selecting the format that
has the closest snapshot before the requested time.

This eliminates the need for manual format handling when migrating from v0.3.x
to v0.5.x — simply run `litestream restore` and it will use the best available
backup regardless of format.


## See Also

- [Configuration Reference](/reference/config) - Complete configuration options
- [Troubleshooting](/docs/troubleshooting) - Recovery and restore issues
- [Getting Started](/getting-started) - Tutorial including restore examples

