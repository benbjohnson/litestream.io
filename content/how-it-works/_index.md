---
title : "How it works"
date: 2021-02-01T00:00:00Z
layout: docs
menu:
  docs:
    parent: "general"
weight: 130
---

Litestream is a streaming replication tool for SQLite databases. It runs as a
separate background process and continuously copies write-ahead log pages from
disk to a replica. This asynchronous replication provides disaster recovery
similar to what is available with database servers like Postgres or MySQL.

Each database replicates to a single replica destination. If you need multiple
backup destinations, see the [replica settings](/reference/config/#legacy-multiple-replicas)
section of the configuration reference for alternatives.


## Understanding the WAL

SQLite has a journaling mode called "WAL" (write-ahead log) which writes
database page changes to a separate `-wal` file first before later copying
those pages back into the main database file. This lets SQLite provide safe,
atomic transactions because it can simply delete WAL pages if a transaction gets
rolled back. If pages were written directly to the database file then there
would be no way to get back the original page data on rollback.

The WAL also allows read transactions to have their own snapshot view of the
database at the time the transaction started because there can be multiple
instances of the same database page spread across the database file & WAL.

However, the WAL continually grows so eventually pages have to be moved back to
the database file so the WAL can be restarted. This process is called
_checkpointing_ and can only be done when no transactions are active. That is
the crux of what lets Litestream replicate SQLite.


## From WAL to LTX

Litestream works by effectively taking over the checkpointing process. It starts
a long-running read transaction to prevent any other process from checkpointing
and restarting the WAL file. Instead, it continually reads new WAL pages and
manually calls out to SQLite to perform checkpoints as necessary.

New WAL pages are packaged into _LTX files_ (Litestream Transaction files).
Each sync assigns the next monotonically incrementing _transaction ID_ (TXID)
to the batch of new WAL pages—which may span one or more SQLite write
transactions—and writes them as an LTX file along with checksums to ensure
consistency. LTX files are named after the TXID range they cover—for example,
`0000000000000001-0000000000000005.ltx` covers TXIDs 1 through 5.

LTX files are staged in a hidden directory next to your database (e.g.
`/var/lib/.db-litestream` for a database at `/var/lib/db`) and then uploaded to
the replica, where they are organized by compaction level under an `ltx/`
prefix.

For more information about Litestream's checkpoint strategy and configuration
options, see the [WAL Truncate Threshold Configuration
guide](/guides/wal-truncate-threshold).


## Compaction & snapshots

Litestream writes LTX files continuously as transactions occur, so the lowest
level—called _L0_—accumulates many small files. To keep restores fast, a
background compaction process periodically merges files from one level into
larger files at the next level:

- **L0** — raw transaction files written continuously during replication.
- **L1, L2, L3** — compacted files, merged every 30 seconds, 5 minutes, and
  1 hour by default.
- **Snapshot level** — a full copy of the database, created every 24 hours by
  default.

This tiered approach means recent changes are available at fine granularity
while older history is consolidated into fewer, larger files. Compaction
intervals and snapshot frequency are configurable—see the
[Configuration Reference](/reference/config) for details, and the
[`ltx` command](/reference/ltx) for inspecting files at each level.


## Restoring a database

To restore a database, Litestream fetches the latest snapshot at or before the
requested point in time and then applies each subsequent LTX file in TXID order
to bring the database up to that point. Because TXIDs form a contiguous
sequence, Litestream can verify that no transactions are missing before
restoring—any gap in the sequence would otherwise result in a corrupted
database file.

Earlier v0.3.x releases tracked replication state using randomly-generated
"generation" IDs and a directory of shadow WAL files. Litestream v0.5 replaces
both concepts with TXID-based LTX files. See the
[Migration Guide](/docs/migration) if you are upgrading from v0.3.x.


## Retention

The time to restore a database from backup is directly related to the number
and size of LTX files since the last snapshot. To avoid having these files grow
without bound, Litestream performs new snapshots of the data periodically and
removes old LTX files.

This process is broken up into two steps. First, a snapshot interval is set to
re-snapshot the database on a regular basis. This allows you to keep copies of
your database at multiple points in time.

The second step is retention enforcement. This periodically runs and removes any
snapshots older than the retention period as well as any LTX files older than
the oldest snapshot. By default, the retention period is 24 hours. Litestream
will always ensure there is at least one snapshot retained.

This two-step process allows for more use cases such as snapshotting every day
but retaining snapshots for a week.


## Read replicas with VFS

For read-only workloads, the optional `litestream-vfs` extension can serve
queries directly from replica storage without restoring a full database file.
It builds a page index from LTX files, fetches pages on-demand, and keeps the
index fresh by polling for new files. See [Read Replicas with VFS](/how-it-works/vfs)
and the [VFS guide](/guides/vfs) for details.


## See Also

- [Getting Started](/getting-started) - Hands-on tutorial with MinIO
- [Tips & Caveats](/tips) - Important production considerations
- [Troubleshooting](/docs/troubleshooting) - Common issues and solutions
- [Configuration Reference](/reference/config) - Complete configuration options
