---
title : "Tips & Caveats"
date: 2021-03-10T00:00:00Z
layout: docs
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
remove your database and recreate it, you should delete the `-litestream`
directory next to your database file and restart Litestream.



## Synchronous PRAGMA

SQLite must call `fsync()` to flush data to disk to ensure transactions are
durable. While in WAL journaling mode, fsync calls can be relaxed in exchange
for durability without risking data corruption.

To do this, you can change the `SYNCHRONOUS` mode to `"NORMAL"`:

```
PRAGMA synchronous = NORMAL;
```

This mode will ensure that the `fsync()` calls are only called when the WAL
becomes full and has to checkpoint to the main database file. This is safe as
the WAL file is append only.


## Data loss window

Litestream performs _asynchronous replication_ which means that changes are
replicated out-of-band from the transaction that wrote the changes. This is how
many replication tools work including [PostgreSQL's log-shipping
replication][pg]. Asynchronous replication is typically much faster than
synchronous replication but it trades off durability of recent writes.

By default, Litestream will replicate new changes to an S3 replica every 10
seconds. This can be reasonably configured down to 1 second with the
[`sync-timeout`][s3-replica] configuration setting. During this time where data
has not yet been replicated, a catastrophic crash on your server will result in
the loss of data in that time window.

For more typical shutdown scenarios, when Litestream receives a signal to close,
it will attempt to synchronize all outstanding WAL changes to the S3 replica before terminating.

Synchronous replication is on the Litestream roadmap but has not yet been
implemented.

[pg]: https://www.postgresql.org/docs/9.3/warm-standby.html
[s3-replica]: http://localhost:1313/reference/config/#s3-replica


