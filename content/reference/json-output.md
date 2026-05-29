---
title : "JSON Output Reference"
date: 2026-05-28T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 560
---

Litestream commands that accept `-json` write a JSON document to stdout. This
reference documents the stable output schemas and shared conventions for CLI
consumers.


## Shared Conventions

### Stable Contract

The fields documented on this page are the stable output contract for CLI
consumers. New fields may be added in future releases, so **consumers must
ignore unknown fields**. Existing fields will not be removed or change type
within a major version.


### Empty Arrays

{{< since version="0.5.12" >}} Commands that return an array (`databases`,
`status`, `ltx`) emit `[]` for an empty result, not `null`. This simplifies
scripted parsing since consumers can rely on array iteration without null checks.


### Idempotent Status Values

Runtime commands use `status` values that name the completed state. When a
command is already in its requested state, the status uses `already_<state>`:

| Command | Normal Status | Already-in-State Status |
|---------|---------------|------------------------|
| `register` | `registered` | `already_registered` |
| `unregister` | `unregistered` | `already_unregistered` |
| `start` | `started` | `already_running` |
| `stop` | `stopped` | `already_stopped` |

These idempotent commands exit 0 in both cases, making them safe for repeated
execution in automation scripts.


### Errors and Exit Codes

{{< since version="0.5.12" >}} Top-level CLI user errors are written to
**stderr** as plain text with optional hints, not slog-framed stdout records:

```
Error: database path required
Try: litestream register -replica s3://bucket/prefix /path/to/db
```

This keeps stdout clean for JSON parsing. The `Try:` hint appears for commands
that require arguments and suggests correct usage.

Explicit `-help` requests exit 0 with usage written to stdout. Commands that
fail due to missing arguments or validation errors exit non-zero.


## Command Schemas

### databases -json

{{< since version="0.5.12" >}} Outputs an array of databases loaded from the
configuration file.

```json
[
  {
    "path": "/var/lib/app.db",
    "replica": "s3"
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `path` | string | SQLite database path |
| `replica` | string | Replica client type configured for the database |

When no databases are configured, the command emits an empty array (`[]`).

See also: [Command: databases](/reference/databases)


### info -json

{{< since version="0.5.12" >}} Outputs daemon process information from the
control socket.

```json
{
  "version": "v0.5.12",
  "pid": 12345,
  "uptime_seconds": 5400,
  "started_at": "2026-05-28T10:00:00Z",
  "database_count": 3
}
```

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Litestream version reported by the daemon |
| `pid` | number | Daemon process ID |
| `uptime_seconds` | number | Daemon uptime in seconds |
| `started_at` | string | Daemon start time in RFC 3339 format |
| `database_count` | number | Number of databases currently managed by the daemon |

See also: [Command: info](/reference/info)


### list -json

{{< since version="0.5.12" >}} Outputs databases managed by the running daemon.

```json
{
  "databases": [
    {
      "path": "/var/lib/app.db",
      "status": "replicating",
      "last_sync_at": "2026-05-28T10:30:00Z"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `databases` | array | Managed database summaries |
| `databases[].path` | string | SQLite database path |
| `databases[].status` | string | Current daemon state: `replicating`, `open`, or `stopped` |
| `databases[].last_sync_at` | string | Last successful replica sync time in RFC 3339 format; omitted if never synced |

When no databases are managed, `databases` is an empty array.

See also: [Command: list](/reference/list)


### ltx -json

Outputs LTX file metadata for the selected database or replica URL.

```json
[
  {
    "level": 0,
    "min_txid": "0000000000000001",
    "max_txid": "0000000000000004",
    "size": 8192,
    "timestamp": "2026-04-24T12:00:00Z"
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `level` | number | LTX compaction level (0-9) |
| `min_txid` | string | Minimum transaction ID in the LTX file |
| `max_txid` | string | Maximum transaction ID in the LTX file |
| `size` | number | LTX file size in bytes |
| `timestamp` | string | LTX file creation time in RFC 3339 format |

{{< since version="0.5.12" >}} When no LTX files are found, the command emits
an empty array (`[]`).

See also: [Command: ltx](/reference/ltx)


### restore -json

{{< since version="0.5.12" >}} Outputs a final summary object after a restore
completes. Restore logs are written to stderr so stdout remains parseable JSON.

```json
{
  "db_path": "/tmp/my.db",
  "replica": "s3",
  "txid": "0000000000000004",
  "duration_ms": 125,
  "integrity_check": "none"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `db_path` | string | Restored database path |
| `replica` | string | Replica client type used for the restore |
| `txid` | string | Restored transaction ID, when available |
| `duration_ms` | number | Restore duration in milliseconds |
| `integrity_check` | string | Integrity check mode: `none`, `quick`, or `full` |


### restore -dry-run -json

{{< since version="0.5.12" >}} When `-dry-run` is combined with `-json`,
`restore` outputs the restore plan instead of the final restore summary.

```json
{
  "source": "s3://mybkt/my.db",
  "target_path": "/tmp/my.db",
  "replica": "s3",
  "min_txid": "0000000000000001",
  "max_txid": "0000000000000004",
  "files": [
    {
      "level": 9,
      "name": "0000000000000001-0000000000000004.ltx",
      "min_txid": "0000000000000001",
      "max_txid": "0000000000000004",
      "size": 8192,
      "timestamp": "2026-04-24T12:00:00Z"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `source` | string | Database path or replica URL passed to `restore` |
| `target_path` | string | Database path that would be written by a restore |
| `replica` | string | Replica client type used to build the plan |
| `min_txid` | string | Minimum transaction ID included in the plan |
| `max_txid` | string | Maximum transaction ID included in the plan |
| `files` | array | LTX files that would be fetched |
| `files[].level` | number | LTX compaction level |
| `files[].name` | string | LTX file name |
| `files[].min_txid` | string | Minimum transaction ID in the file |
| `files[].max_txid` | string | Maximum transaction ID in the file |
| `files[].size` | number | File size in bytes |
| `files[].timestamp` | string | File creation time in RFC 3339 format |

See also: [Command: restore](/reference/restore)


### status -json

{{< since version="0.5.12" >}} Outputs replication status for configured
databases.

```json
[
  {
    "database": "/var/lib/app.db",
    "status": "ok",
    "local_txid": "0000000000000004",
    "wal_size": "32 kB"
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `database` | string | SQLite database path |
| `status` | string | Current local replication status: `ok`, `not initialized`, `no database`, or `error` |
| `local_txid` | string | Latest local transaction ID, or `-` if unavailable |
| `wal_size` | string | Current WAL file size as human-readable text, or `-` if unavailable |

When no databases are configured, the command emits an empty array (`[]`).

See also: [Command: status](/reference/status)


## See Also

- [Command: databases](/reference/databases) — List databases from config file
- [Command: info](/reference/info) — Show daemon information
- [Command: list](/reference/list) — List databases managed by the daemon
- [Command: ltx](/reference/ltx) — List LTX files for a database
- [Command: restore](/reference/restore) — Recover database from a replica
- [Command: status](/reference/status) — Report local replication status
