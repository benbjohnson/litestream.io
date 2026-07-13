---
title : "Tips & Caveats"
date: 2021-03-10T00:00:00Z
layout: docs
menu:
  docs:
    parent: "general"
weight: 120
---

Running an application that uses SQLite and Litestream can require some small
tweaks to optimize performance and usability. There are also some important
caveats to know.


## Busy timeout

SQLite is built to run as a multi-process embedded database and Litestream acts
as just another process. However, Litestream requires periodic but short write
locks on the database when checkpointing occurs. SQLite will return an error by
default if your application tries to obtain a write lock at the same time.

To prevent this, your application will need to set the [`busy_timeout`
][busy_timeout] pragma when it initializes the database connection. This pragma
will wait up to a given number of milliseconds before failing a query if it is
blocked on a write. It is recommended to set this to 5 seconds:

```
PRAGMA busy_timeout = 5000;
```

[busy_timeout]: https://www.sqlite.org/pragma.html#pragma_busy_timeout


## WAL journal mode

Litestream only works with the SQLite [WAL journaling mode][wal]. This is the
recommended mode for most applications as it generally performs better and
allows for concurrent read access. Litestream will automatically set the
database mode to `WAL` if it has not already been enabled by the application.

[wal]: https://sqlite.org/wal.html


## Foreign Key Constraints

Foreign key constraints are disabled by default in SQLite for backwards
compatibility. However, foreign keys are an important feature for maintaining
data integrity and are considered a best practice. It is recommended to enable
them by setting the [`foreign_keys` pragma][foreign_keys] when you initialize
your database connection:

```
PRAGMA foreign_keys = ON;
```

This pragma must be set on each database connection, as it does not persist
across connections. Enabling foreign key constraints will ensure that your
application cannot accidentally create orphaned records that violate foreign
key relationships.

[foreign_keys]: https://www.sqlite.org/pragma.html#pragma_foreign_keys


## Deleting SQLite databases

If you're deleting and recreating a SQLite database from scratch, there are 3
files which must be deleted:

- Database file
- Shared memory file (`-shm`)
- WAL file (`-wal`)

If you delete your database file but not your WAL file then SQLite will try to
apply those old WAL pages to your new database. Litestream also tracks changes
via the WAL so it can cause replication issues if the WAL file is leftover.

Additionally, Litestream currently does not track database deletions. If you
remove your database and recreate it, you should clear Litestream's local
metadata and restart. Run [`litestream reset`](/reference/reset) on the database
path, or delete the `.<filename>-litestream` metadata directory next to your
database file (for example, `.mydb.sqlite-litestream` for `mydb.sqlite`).



## Synchronous PRAGMA

SQLite must call `fsync()` to flush data to disk to ensure transactions are
durable. While in WAL journaling mode, fsync calls can be relaxed in exchange
for durability without risking data corruption.

To do this, you can change the [`synchronous`][synchronous] mode to `NORMAL`
(it typically [defaults][synchronous_default] to `FULL`):

```
PRAGMA synchronous = NORMAL;
```

This mode will ensure that the `fsync()` calls are only called when the WAL
becomes full and has to checkpoint to the main database file. This is safe as
the WAL file is append only.

[synchronous]: https://www.sqlite.org/pragma.html#pragma_synchronous
[synchronous_default]: https://github.com/sqlite/sqlite/blob/86fbbbf96440fddc6e691213495b563f2584fce1/src/sqliteInt.h#L1268-L1286


## Data loss window

Litestream performs _asynchronous replication_ which means that changes are
replicated out-of-band from the transaction that wrote the changes. This is how
many replication tools work including [PostgreSQL's log-shipping
replication][pg]. Asynchronous replication is typically much faster than
synchronous replication but it trades off durability of recent writes.

By default, Litestream will replicate new changes to an S3 replica every
second. During this time where data has not yet been replicated, a catastrophic
crash on your server will result in the loss of data in that time window.

For more typical shutdown scenarios, when Litestream receives a signal to close,
it will attempt to synchronize all outstanding WAL changes to the S3 replica before terminating.

Synchronous replication is on the Litestream roadmap but has not yet been
implemented.

## Increase snapshots frequency to improve restore performance

By default, Litestream takes a full snapshot of each database every `24h` and
retains snapshots for `24h`. Between snapshots, changes are stored as
incremental LTX files, and a restore replays every LTX file recorded since the
most recent snapshot.

If you're writing data often then these incremental files build up between
snapshots and increase your restore time. If you have frequent writes, it is
recommended to take snapshots more often by lowering the global
`snapshot.interval` setting:

```yaml
snapshot:
  interval: 1h
  retention: 24h
```

The `snapshot` block is a global setting that applies to all databases; you can
also override it per database under an individual `dbs` entry. With a `1h`
interval and `24h` retention you will keep a rolling set of 24 snapshots. See
the [configuration reference](/reference/config) for details.


## Disable autocheckpoints for high write load servers

> **Note:** Checkpoint detection improvements in v0.5.0+ reduce the need for full snapshots when checkpoints occur.

By default, SQLite allows any process to perform a checkpoint. A checkpoint is
when pages that are written to the WAL are copied back to the main database
file. Litestream works by controlling this checkpointing process and
replicating the pages before they get copied back into the main database.
Litestream prevents other processes from checkpointing by maintaining a read
lock on the database in between its checkpoint requests.

However, under high load with many small write transactions (e.g. tens of
thousands per second), the application's SQLite instance can perform a
checkpoint in between Litestream-initiated checkpoints and cause Litestream
to miss a WAL update. When Litestream detects this it takes a fresh full
snapshot to ensure consistency.

To prevent this, it is recommended to run your application with
autocheckpointing disabled. To do this, run the following PRAGMA when you
open your SQLite connection:

```
PRAGMA wal_autocheckpoint = 0;
```

For more information about Litestream's checkpoint strategy and configuring
WAL truncate thresholds, see the [WAL Truncate Threshold Configuration
guide](/guides/wal-truncate-threshold).

## Multiple applications replicating into location can corrupt

Multiple applications replicating into the same bucket & path can cause situations
where you will be unable to restore. It is _your_ responsibility to ensure you
do not have multiple applications replicating concurrently. In the off-chance
that it does happen, and you're unable to restore, recover from the replica as
follows.

First, attempt a normal restore with [`litestream restore`](/reference/restore),
which reconstructs the database from the most recent snapshot and the LTX files
recorded since. You can inspect the LTX files stored in a replica with the
[`litestream ltx`](/reference/ltx) command to understand its state.

If the local Litestream metadata has become inconsistent, run
[`litestream reset`](/reference/reset) on the database to clear the local
tracking state. Litestream will take a fresh full snapshot on the next sync.

Once you have a restored copy, it's a good idea to perform an integrity check on
the database using `sqlite3`:

```
$ sqlite3 /path/to/db
sqlite> PRAGMA integrity_check;
ok
```

Use this restored file as your application's database file and continue
replicating it again with Litestream.


## See Also

- [How It Works](/how-it-works) - Understanding WAL, snapshots, and replication internals
- [Troubleshooting](/docs/troubleshooting) - Common issues and solutions
- [Configuration Reference](/reference/config) - Complete configuration options


[pg]: https://www.postgresql.org/docs/9.3/warm-standby.html


