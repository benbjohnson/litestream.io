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


## Write mode architecture

When write mode is enabled (`LITESTREAM_WRITE_ENABLED=true`), the VFS transitions
from read-only to read-write by adding a local write buffer and sync mechanism.

### Write buffer design

- **Local buffer file**: All writes go to a local SQLite database file that
  serves as a write buffer. This file captures dirty pages before they are
  synced to remote storage.

- **Dirty page tracking**: The VFS maintains a bitmap of which database pages
  have been modified since the last sync. Only dirty pages are packaged into
  LTX files.

- **Crash recovery**: The buffer file persists uncommitted changes. On restart,
  buffered writes can be recovered and synced.

### Sync process

At each sync interval (default 1 second):

1. **Check for conflicts**: The VFS polls for new LTX files from other sources.
   If new files are detected, a conflict is raised before uploading.

2. **Package dirty pages**: Modified pages are read from the buffer and
   packaged into a new LTX file with proper transaction ordering.

3. **Upload to replica**: The new LTX file is uploaded to the configured
   replica location.

4. **Reset buffer**: After successful upload, the dirty page bitmap is cleared
   and the buffer is ready for the next batch.

### Conflict detection

Since write mode assumes a single writer, the VFS uses optimistic conflict
detection:

- Before each sync, check if the remote TXID has advanced unexpectedly.
- If another writer has uploaded new LTX files, the sync is aborted.
- The application receives a conflict error and must decide how to proceed.

This approach avoids the complexity of distributed locking while providing
safety through detection. Applications can implement retry logic, external
locking, or accept last-writer-wins semantics depending on their requirements.

### Transaction handling during sync

- **In-flight transactions**: Active transactions continue using the local
  buffer while sync runs in the background.

- **Commit visibility**: Local commits are immediately visible to the same
  connection but not to remote readers until the next sync completes.

- **Sync isolation**: The sync process reads a consistent snapshot of dirty
  pages without blocking ongoing writes.


## Hydration mechanism

When hydration is enabled (`LITESTREAM_HYDRATION_ENABLED=true`), the VFS
restores the complete database to a local file while continuing to serve
reads from cache and remote storage.

### Streaming compaction

Hydration builds the local database through streaming compaction:

1. **Compute restore plan**: Like the standard VFS, determine the sequence of
   LTX files needed to reconstruct the database.

2. **Stream pages to disk**: Instead of building only an in-memory index, write
   the actual page data to a local SQLite database file.

3. **Incremental processing**: Process LTX files one at a time, applying their
   pages to the local file. Memory usage stays bounded regardless of database
   size.

4. **Handle page overwrites**: When newer LTX files update the same pages,
   overwrite the local file's pages to maintain consistency.

### Read path evolution

The VFS read path changes as hydration progresses:

| Phase | Page lookup | Source |
|-------|-------------|--------|
| Before hydration | Index → Remote LTX | Object storage |
| During hydration | Index → Remote LTX or cache | Object storage + cache |
| After hydration | Index → Local file | Local disk |

The transition is transparent: applications continue using the same connection
while the underlying read path improves.

### Incremental update application

After initial hydration completes:

1. **Continue polling**: The VFS keeps polling for new LTX files from the primary.

2. **Apply to local file**: New pages are written to the hydrated file, keeping
   it synchronized with the replica.

3. **Cache invalidation**: The in-memory cache is updated to reflect new data,
   but reads now come from the local file.

This ensures the hydrated database stays current without requiring re-hydration.

### Memory management

Hydration is designed for bounded memory usage:

- **No full-database buffering**: Pages are written directly to disk via streaming I/O.
- **LTX streaming**: Each LTX file is processed and released before moving to the next.
- **Index overhead only**: Memory usage is similar to standard VFS operation—just the page index plus cache.

A 10GB database can be hydrated with the same memory footprint as serving it
read-only via standard VFS.


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
- [VFS Write Mode Guide](/guides/vfs-write-mode) - Enable writes with remote sync
- [VFS Hydration Guide](/guides/vfs-hydration) - Background restoration to local file
- [VFS Extension Reference](/reference/vfs) - Complete API and configuration
- [Troubleshooting](/docs/troubleshooting) - Common issues and solutions

