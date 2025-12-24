---
title: "Using Litestream as a Go Library"
date: 2025-12-23T00:00:00Z
layout: docs
menu:
  docs:
    parent: "replica-guides"
weight: 406
---

Litestream can be embedded directly into your Go application as a library,
giving you programmatic control over database replication without running a
separate process. This approach is useful when you need tighter integration
with your application lifecycle or want to customize replication behavior.

{{< alert icon="⚠️" text="The Litestream library API is not considered stable and may change between versions. The CLI interface is recommended for production use cases where API stability is important." >}}


## When to use the library

- Embed replication directly in your Go application without managing a separate Litestream process.
- Implement custom restore-on-startup patterns for ephemeral or containerized deployments.
- Integrate replication lifecycle with your application's graceful shutdown handling.
- Manage multiple databases from a single application with unified compaction.
- Avoid when you need a stable, well-documented interface—the CLI is more mature.


## Prerequisites

- Go 1.21 or later.
- A SQLite driver. The examples use [`modernc.org/sqlite`](https://pkg.go.dev/modernc.org/sqlite) (pure Go, no CGO required).
- Familiarity with Litestream concepts from the [Getting Started](/getting-started) guide.


## Installation

Add Litestream to your Go module:

```sh
go get github.com/benbjohnson/litestream
```

Import the packages you need:

```go
import (
    "github.com/benbjohnson/litestream"
    "github.com/benbjohnson/litestream/file"  // For file backend
    "github.com/benbjohnson/litestream/s3"    // For S3 backend
)
```


## Core concepts

The library uses three main types:

- **`DB`**: Wraps a SQLite database path and manages its replica.
- **`Replica`**: Handles replication to a specific backend (S3, file, etc.).
- **`Store`**: Manages one or more databases and runs background compaction.

The typical lifecycle is:

1. Create a `DB` wrapper for your SQLite database path.
2. Create a replica client for your storage backend.
3. Attach the replica to the database.
4. Create a `Store` with compaction levels.
5. Open the store (starts replication and compaction monitors).
6. Open your application's SQLite connection separately.
7. Close the store on shutdown.


## Basic usage

This example replicates a SQLite database to the local filesystem:

```go
package main

import (
    "context"
    "database/sql"
    "fmt"
    "log"
    "time"

    _ "modernc.org/sqlite"

    "github.com/benbjohnson/litestream"
    "github.com/benbjohnson/litestream/file"
)

func main() {
    ctx := context.Background()
    dbPath := "./myapp.db"
    replicaPath := "./replica"

    // 1. Create the Litestream DB wrapper
    db := litestream.NewDB(dbPath)

    // 2. Create a replica client (file-based)
    client := file.NewReplicaClient(replicaPath)

    // 3. Create a replica and attach it to the database
    replica := litestream.NewReplicaWithClient(db, client)
    db.Replica = replica
    client.Replica = replica // Preserves file permissions

    // 4. Create compaction levels (L0 required, plus at least one more)
    levels := litestream.CompactionLevels{
        {Level: 0},
        {Level: 1, Interval: 10 * time.Second},
    }

    // 5. Create a Store to manage the database and background compaction
    store := litestream.NewStore([]*litestream.DB{db}, levels)

    // 6. Open the store (starts replication and compaction monitors)
    if err := store.Open(ctx); err != nil {
        log.Fatalf("open store: %v", err)
    }
    defer func() {
        if err := store.Close(context.Background()); err != nil {
            log.Printf("close store: %v", err)
        }
    }()

    // 7. Open your app's SQLite connection separately
    sqlDB, err := sql.Open("sqlite", dbPath)
    if err != nil {
        log.Fatalf("open sqlite: %v", err)
    }
    defer sqlDB.Close()

    // Configure WAL mode and busy timeout
    sqlDB.ExecContext(ctx, `PRAGMA journal_mode = wal;`)
    sqlDB.ExecContext(ctx, `PRAGMA busy_timeout = 5000;`)

    // Use sqlDB for your application queries
    fmt.Println("Replication started. Database ready for use.")
}
```


## S3 backend with restore-on-startup

For production deployments, you typically want to restore from backup if the
local database doesn't exist. This pattern works well with ephemeral containers:

```go
package main

import (
    "context"
    "database/sql"
    "errors"
    "log"
    "os"
    "time"

    _ "modernc.org/sqlite"

    "github.com/benbjohnson/litestream"
    "github.com/benbjohnson/litestream/s3"
)

const dbPath = "./myapp.db"

func main() {
    ctx := context.Background()

    // Configure S3 client
    client := s3.NewReplicaClient()
    client.Bucket = os.Getenv("LITESTREAM_BUCKET")
    client.Path = os.Getenv("LITESTREAM_PATH")
    client.Region = os.Getenv("AWS_REGION")
    client.AccessKeyID = os.Getenv("AWS_ACCESS_KEY_ID")
    client.SecretAccessKey = os.Getenv("AWS_SECRET_ACCESS_KEY")

    // Restore from S3 if local database doesn't exist
    if err := restoreIfNotExists(ctx, client, dbPath); err != nil {
        log.Fatalf("restore: %v", err)
    }

    // Set up replication (same pattern as basic example)
    db := litestream.NewDB(dbPath)
    replica := litestream.NewReplicaWithClient(db, client)
    db.Replica = replica

    levels := litestream.CompactionLevels{
        {Level: 0},
        {Level: 1, Interval: 10 * time.Second},
    }
    store := litestream.NewStore([]*litestream.DB{db}, levels)

    if err := store.Open(ctx); err != nil {
        log.Fatalf("open store: %v", err)
    }
    defer store.Close(context.Background())

    // Open app database and continue...
    sqlDB, _ := sql.Open("sqlite", dbPath)
    defer sqlDB.Close()
    sqlDB.ExecContext(ctx, `PRAGMA journal_mode = wal;`)
    sqlDB.ExecContext(ctx, `PRAGMA busy_timeout = 5000;`)

    log.Println("Database ready with S3 replication")
}

func restoreIfNotExists(ctx context.Context, client *s3.ReplicaClient, dbPath string) error {
    // Check if database already exists
    if _, err := os.Stat(dbPath); err == nil {
        log.Println("Local database found, skipping restore")
        return nil
    } else if !os.IsNotExist(err) {
        return err
    }

    log.Println("Local database not found, attempting restore from S3...")

    // Initialize the client
    if err := client.Init(ctx); err != nil {
        return fmt.Errorf("init s3 client: %w", err)
    }

    // Create a replica (without DB) for restore
    replica := litestream.NewReplicaWithClient(nil, client)

    // Set up restore options
    opt := litestream.NewRestoreOptions()
    opt.OutputPath = dbPath

    // Attempt restore
    if err := replica.Restore(ctx, opt); err != nil {
        // No backup exists - that's OK for a fresh deployment
        if errors.Is(err, litestream.ErrTxNotAvailable) ||
           errors.Is(err, litestream.ErrNoSnapshots) {
            log.Println("No backup found, will create new database")
            return nil
        }
        return err
    }

    log.Println("Database restored from S3")
    return nil
}
```

Set the required environment variables:

```sh
export LITESTREAM_BUCKET="my-backup-bucket"
export LITESTREAM_PATH="databases/myapp"
export AWS_REGION="us-east-1"
export AWS_ACCESS_KEY_ID="AKIAxxxx"
export AWS_SECRET_ACCESS_KEY="xxxx"
```


## Supported backends

The library supports all Litestream replica backends:

| Backend | Client Package | URL Scheme |
|---------|---------------|------------|
| Local filesystem | `github.com/benbjohnson/litestream/file` | `file://` |
| Amazon S3 | `github.com/benbjohnson/litestream/s3` | `s3://` |
| Google Cloud Storage | `github.com/benbjohnson/litestream/gcs` | `gs://` |
| Azure Blob Storage | `github.com/benbjohnson/litestream/abs` | `abs://` |
| Alibaba Cloud OSS | `github.com/benbjohnson/litestream/oss` | `oss://` |
| SFTP | `github.com/benbjohnson/litestream/sftp` | `sftp://` |
| NATS JetStream | `github.com/benbjohnson/litestream/nats` | `nats://` |
| WebDAV | `github.com/benbjohnson/litestream/webdav` | `webdav://` |

You can also create a client from a URL:

```go
client, err := litestream.NewReplicaClientFromURL("s3://my-bucket/path")
```


## Configuration options

### Compaction levels

Compaction reduces the number of files in your replica by merging smaller files:

```go
levels := litestream.CompactionLevels{
    {Level: 0},                                    // Required: L0 files
    {Level: 1, Interval: 10 * time.Second},        // Compact every 10s
    {Level: 2, Interval: 1 * time.Minute},         // Optional: longer retention
}
```

### Database options

Configure monitoring and checkpointing behavior:

```go
db := litestream.NewDB(dbPath)
db.MonitorInterval = 1 * time.Second      // How often to check for changes
db.CheckpointInterval = 30 * time.Second  // WAL checkpoint frequency
db.MinCheckpointPageN = 1000              // Minimum pages before checkpoint
```

### Replica options

Configure sync behavior:

```go
replica := litestream.NewReplicaWithClient(db, client)
replica.SyncInterval = 1 * time.Second  // How often to sync to replica
```


## Graceful shutdown

Always close the store before your application exits to ensure all pending
writes are flushed to the replica:

```go
// Handle shutdown signals
sigCh := make(chan os.Signal, 1)
signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

<-sigCh
log.Println("Shutting down...")

// Close the store with a timeout context if needed
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

if err := store.Close(ctx); err != nil {
    log.Printf("close store: %v", err)
}
```


## Troubleshooting

- **"database is locked" errors**: Ensure you set `PRAGMA busy_timeout` on your
  application's SQLite connection. A value of 5000ms (5 seconds) works well.

- **WAL mode not enabled**: The application must enable WAL mode on its own
  connection. Litestream requires WAL mode for replication.

- **No replication occurring**: Verify the store is opened successfully and
  that your replica client has valid credentials.

- **Restore fails with "no snapshots"**: This is expected for a fresh
  deployment with no prior backups. Handle `ErrNoSnapshots` gracefully.


## See also

- [Working examples](https://github.com/benbjohnson/litestream/tree/main/_examples/library) in the Litestream repository
- [VFS Read Replicas](/guides/vfs) for read-only access to replicated data
- [Configuration Reference](/reference/config) for CLI configuration options
- [How It Works](/how-it-works) for background on Litestream internals
