---
title : "Read Replicas with VFS"
date: 2025-11-20T00:00:00Z
layout: docs
menu:
  docs:
    parent: "general"
weight: 135
---

The Litestream VFS serves SQLite reads directly from replica storage instead of
restoring a full database file. It builds an index from LTX files, fetches pages
on-demand, and keeps a cached view in sync by polling for new frames.


## Replica layout & restore plan

Replicas store snapshots plus incremental LTX files on two levels:

- **L0**: raw transactional files generated during replication.
- **L1+**: compacted LTX files that merge older L0 segments.

The VFS computes a restore plan before opening a connection. It looks for a
contiguous LTX sequence, fails fast on gaps, and waits if no snapshot exists
yet. The database page size (512–65536 bytes) is detected from LTX headers.


## Page-based access

For each LTX file in the plan, the VFS reads the page index and builds an
in-memory map of page number to LTX offset. Reads consult the map, fetch the
page bytes from storage, and cache them in an LRU cache sized by `CacheSize`
(default 10MB). The first page is rewritten to present `DELETE` journal mode so
SQLite treats the replica as a read-only rollback-journal database.


## Polling & L0/L1 coordination

A polling loop (default every 1s) scans for new LTX files:

- L0 is checked first; gaps at L0 are tolerated by deferring to higher levels.
- L1 compactions replace the page index when commits shrink (e.g., after vacuum).
- File descriptor & network usage stay bounded by closing LTX streams after page
  indexes are ingested.

Retention of recent L0 files on the primary (`l0-retention`) is important so VFS
replicas can see fresh writes before they are compacted.


## Two-index transaction isolation

The VFS maintains two in-memory page indexes to provide snapshot isolation
without blocking primary database writes:

- **Main index**: Maps page numbers to LTX file offsets for the current
  connection's view. Readers query this index during transactions.
- **Pending index**: Accumulates new LTX page entries that arrive while a read
  transaction holds a shared lock.

When a connection acquires a shared lock (starting a read transaction), the VFS
continues polling for new LTX files but stages their page entries in the pending
index rather than the main index. This mirrors SQLite's own transaction
isolation semantics: a read transaction sees a consistent snapshot of the
database as it existed when the transaction started.

When the lock is released (transaction ends), the pending entries atomically
merge into the main index, and any cached pages for updated page numbers are
invalidated. The next transaction sees the fresh data.


### Memory implications of long-held transactions

Because the pending index accumulates page entries during active read
transactions, holding a transaction open during sustained write activity causes
memory growth proportional to the write rate and transaction duration:

| Write Rate | Transaction Duration | Approximate Pending Entries |
|------------|---------------------|----------------------------|
| 100 writes/sec | 30 seconds | ~3,000 entries |
| 500 writes/sec | 60 seconds | ~30,000 entries |
| 1,000 writes/sec | 60 seconds | ~60,000 entries |

Each pending entry is a small map entry (page number to LTX offset), so memory
overhead is modest—typically a few bytes per entry. However, sustained
high-write scenarios with long-held transactions can accumulate tens of
thousands of entries.

This behavior is working as designed and mirrors SQLite's own semantics where
long-running read transactions prevent resource cleanup (WAL checkpointing on
the primary, pending index cleanup on VFS replicas).


### Mitigations already in place

- **L0 retention**: The primary's `l0-retention` setting ensures LTX files
  remain available even as new files arrive, giving VFS clients time to
  discover and index them.
- **Bounded index growth**: Normal page reuse means the same logical pages are
  updated repeatedly, limiting unique entries.
- **Design intent**: The VFS targets read-replica workloads with moderate query
  load, not high-concurrency OLTP scenarios.

See the [VFS guide](/guides/vfs/#transaction-duration--memory) for practical
recommendations on transaction duration.


## Performance model

- First access to a page incurs network/object-store latency; hot pages are
  served from the VFS cache.
- Polling frequency controls replication lag versus API call volume.
- Sequential scans across large tables will generate sustained remote reads;
  indexed lookups and repeated queries benefit most from caching.
- Placing the VFS client in the same region as the replica minimizes added
  latency (typically 5–50ms over local disk).


## Compared to restore-first workflows

The `restore` command downloads a full snapshot plus WAL/ltx chain, trading
startup time and disk space for local performance. The VFS avoids the download
and disk cost but introduces network latency and relies on contiguous replica
history. Choose VFS for light-weight read replicas and rapid spin-up; choose
restore for low-latency, write-capable workloads on local disk.


## See Also

- [VFS Read Replicas Guide](/guides/vfs) - Step-by-step setup and usage
- [VFS Extension Reference](/reference/vfs) - Complete API and configuration
- [Troubleshooting](/docs/troubleshooting) - Common issues and solutions

