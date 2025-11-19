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

The VFS maintains a main index and a pending index. When readers hold shared
locks, new LTX pages are staged in the pending index; once locks drop, pending
entries replace or merge into the main index and cached pages are invalidated.
This ensures long-running readers see a consistent snapshot while newer commits
become visible to subsequent connections.


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

