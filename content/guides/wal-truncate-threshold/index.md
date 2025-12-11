---
title : "WAL Truncate Threshold Configuration"
date: 2025-01-15T00:00:00Z
layout: docs
menu:
  docs:
    parent: "help"
weight: 820
---

This guide explains Litestream's 3-tier checkpoint strategy and how to configure WAL truncate thresholds to prevent write blocking while managing disk space. Understanding these settings is critical for production deployments, especially applications with long-lived read transactions.

## Background

SQLite's WAL (write-ahead log) grows as database pages are modified. To prevent unbounded growth, the WAL must be periodically truncated through checkpointing. However, aggressive checkpointing can block database writes when read transactions are active.

Litestream uses a carefully designed 3-tier checkpoint strategy that balances WAL size management with write availability:

1. **Emergency truncation** (checked first) prevents unbounded WAL growth at a high threshold (~500MB), but will block writers and readers when triggered
2. **Non-blocking checkpoints** run frequently to keep WAL small under normal operation (~4MB), never blocking the application
3. **Time-based checkpoints** provide regular cleanup even when WAL is small, also non-blocking

This strategy prioritizes catching runaway WAL growth first, then attempts regular non-blocking cleanup. The emergency truncation threshold is set very high so that under normal conditions, the non-blocking checkpoints keep the WAL small and the blocking checkpoint rarely runs.

## Understanding the 3-Tier Checkpoint Strategy

Litestream uses three complementary checkpoint mechanisms, evaluated in this order after each sync:

### 1. TruncatePageN (TRUNCATE, Blocking) - Emergency Brake

```yaml
truncate-page-n: 121359  # Default: ~500MB
```

- **Trigger:** WAL exceeds 121,359 pages (~500MB)
- **Mode:** TRUNCATE checkpoint via `sqlite3_wal_checkpoint_v2()`
- **Behavior:** **Blocking**—waits for all active writers AND readers to complete before truncating WAL
- **Purpose:** Emergency brake to prevent unbounded WAL growth
- **Priority:** Checked first to prevent runaway WAL growth
- **Important:** Inherits RESTART semantics from SQLite, meaning both readers and writers can block this checkpoint

### 2. MinCheckpointPageN (PASSIVE, Non-Blocking)

```yaml
min-checkpoint-page-count: 1000  # Default: ~4MB
```

- **Trigger:** WAL exceeds 1,000 pages (~4MB)
- **Mode:** PASSIVE checkpoint via `sqlite3_wal_checkpoint_v2()`
- **Behavior:** Non-blocking—returns SQLITE_BUSY if readers or writers are active, which Litestream handles gracefully by logging "passive checkpoint skipped" and continuing without interrupting the application
- **Purpose:** Keep WAL small under normal operation

### 3. CheckpointInterval (PASSIVE, Non-Blocking)

```yaml
checkpoint-interval: 1m  # Default: 1 minute
```

- **Trigger:** 1 minute elapsed since last checkpoint attempt
- **Mode:** PASSIVE checkpoint
- **Behavior:** Non-blocking—returns SQLITE_BUSY if readers or writers are active, which Litestream handles gracefully
- **Purpose:** Time-based cleanup even when WAL is small
- **Condition:** Only runs if WAL has at least 1 page

## Configuration

### YAML Configuration

```yaml
dbs:
  - path: /path/to/db

    # Regular non-blocking checkpoint (~4MB threshold)
    min-checkpoint-page-count: 1000

    # Time-based non-blocking checkpoint (every 1 minute)
    checkpoint-interval: 1m

    # Emergency blocking checkpoint (~500MB threshold)
    truncate-page-n: 121359

    replicas:
      - url: s3://mybucket/db
```

### Disabling Checkpoints

You can disable time-based and emergency checkpoints by setting them to `0`:

```yaml
dbs:
  - path: /path/to/db
    checkpoint-interval: 0             # Disable time-based checkpoints
    truncate-page-n: 0                 # Disable TRUNCATE checkpoints
```

**Note:** The `min-checkpoint-page-count` option cannot be set to `0`—Litestream requires a minimum value of at least `1`. PASSIVE checkpoints based on page count are always enabled.

## Trade-offs

### Default Settings (All Enabled)

**Configuration:**
```yaml
min-checkpoint-page-count: 1000
checkpoint-interval: 1m
truncate-page-n: 121359
```

**Advantages:**
- Prevents unbounded WAL growth
- Regular PASSIVE checkpoints keep WAL small (~4MB typical)
- Fast restore times (smaller WAL)
- Minimal disk space usage

**Disadvantages:**
- TruncatePageN can block writes and readers if WAL hits ~500MB (rare but possible)
- Long-running read transactions will cause extended blocking until they complete
- May cause write pauses in extreme cases

**Best for:** Most applications with typical read/write patterns and short-lived transactions

### Disabling TruncatePageN (Recommended for Long-Read Apps)

**Configuration:**
```yaml
min-checkpoint-page-count: 1000
checkpoint-interval: 1m
truncate-page-n: 0  # Disable blocking checkpoints
```

**Advantages:**
- Never blocks writes under any circumstances
- Safe for applications with long-lived read transactions (minutes to hours)
- Eliminates "priority inversion" risk

**Disadvantages:**
- WAL can grow unbounded if read transactions prevent checkpointing
- Requires disk space monitoring and alerting
- Slower restore times if WAL grows large
- Increased storage costs

**Best for:**
- Applications with long-lived read transactions
- Analytics workloads with long queries
- Zero-tolerance for write blocking
- Environments with ample disk space

### Disabling Time-Based and Emergency Checkpoints

**Configuration:**
```yaml
checkpoint-interval: 0
truncate-page-n: 0
```

**Not recommended for most use cases.** This configuration disables time-based and emergency checkpoints, leaving only page-count-based PASSIVE checkpoints active. Only use if:
- Your application manages checkpoints explicitly
- You have external monitoring for WAL growth
- You understand the risks of unbounded WAL growth

## When to Disable TruncatePageN

Consider setting `truncate-page-n: 0` if your application has:

### Long-Lived Read Transactions

Applications that hold read transactions for extended periods:
- Analytics queries (minutes to hours)
- Batch processing with long-running reads
- Reporting dashboards with complex queries
- Data export operations

**Why it matters:** TRUNCATE checkpoints will block writes until all read transactions complete. Long-lived readers cause extended write outages.

### Zero Write-Blocking Tolerance

Mission-critical write paths that cannot tolerate any blocking:
- Real-time data ingestion
- High-frequency trading systems
- IoT sensor data collection
- Live monitoring systems

**Trade-off:** Accept unbounded WAL growth in exchange for guaranteed write availability.

### Disk Space Monitoring

If you disable TruncatePageN, you **must** implement:

1. **Disk space monitoring** - Alert when WAL size exceeds thresholds
2. **WAL size tracking** - Monitor `<database>-wal` file size
3. **Automated cleanup** - Stop long-lived read transactions or restart application
4. **Capacity planning** - Provision disk space for worst-case WAL growth

Example monitoring script:

```sh
#!/bin/bash
WAL_FILE="/path/to/db-wal"

# Cross-platform file size (works on Linux and macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
  WAL_SIZE=$(stat -f%z "$WAL_FILE" 2>/dev/null || echo 0)
else
  WAL_SIZE=$(stat -c%s "$WAL_FILE" 2>/dev/null || echo 0)
fi

WAL_SIZE_MB=$((WAL_SIZE / 1024 / 1024))

if [ $WAL_SIZE_MB -gt 5000 ]; then
  echo "CRITICAL: WAL size is ${WAL_SIZE_MB}MB"
  # Alert or take action
fi
```

## Upgrading to v0.5.0

### Configuration Changes

Litestream v0.5.0 replaces the `max-checkpoint-page-count` field with `truncate-page-n` for better control over blocking checkpoints.

**If you have `max-checkpoint-page-count` in your configuration:**

```yaml
# ❌ This field no longer exists
dbs:
  - path: /path/to/db
    max-checkpoint-page-count: 10000  # Remove this line
```

**Update to the new configuration:**

```yaml
dbs:
  - path: /path/to/db
    checkpoint-interval: 1m
    min-checkpoint-page-count: 1000
    truncate-page-n: 121359  # Higher threshold (~500MB)
    # Or set to 0 to disable blocking checkpoints entirely
```

**Choose your configuration based on your needs:**
   - **Applications with long-lived read transactions:** Set `truncate-page-n: 0`
   - **Need to limit WAL size:** Use default `truncate-page-n: 121359`
   - **Zero tolerance for write blocking:** Set `truncate-page-n: 0`

### Verification

After upgrading, verify checkpoint behavior:

```sh
# Check Litestream logs for checkpoint activity
tail -f /var/log/litestream.log | grep checkpoint

# Monitor WAL file size
watch -n 5 'ls -lh /path/to/db-wal'
```

## Troubleshooting

### Detecting WAL Growth Issues

**Symptoms:**
- WAL file continuously growing
- Disk space warnings
- Slow restore times

**Diagnosis:**
```sh
# Check WAL size
ls -lh /path/to/db-wal

# Check for long-lived read transactions (if you have SQLite access)
sqlite3 /path/to/db "PRAGMA wal_checkpoint(PASSIVE);"
```

**Solutions:**
1. If WAL is large but not growing: Wait for read transactions to complete
2. If WAL continuously grows: Set `truncate-page-n: 121359` (or lower)
3. If you have long-lived reads: Keep `truncate-page-n: 0` and monitor disk

### Detecting Write Blocking

**Symptoms:**
- Application write timeouts
- "database is locked" errors
- Increased write latency
- Blocking occurs when TRUNCATE checkpoint waits for active readers and writers

**Log Messages:**
```
checkpoint truncate: pages=121359 mode=TRUNCATE
```

**Root Cause:**
TRUNCATE checkpoints inherit RESTART semantics from SQLite, meaning they wait for both all active readers AND writers to complete before truncating the WAL. Long-lived read transactions will cause extended blocking periods.

**Solutions:**
1. Increase `truncate-page-n` threshold: `truncate-page-n: 250000`
2. Disable blocking checkpoints: `truncate-page-n: 0`
3. Reduce read transaction duration in your application
4. Review application for long-running queries or batch operations

### Performance Optimization

**Too many PASSIVE checkpoint attempts:**
```yaml
# Increase threshold to reduce checkpoint frequency
min-checkpoint-page-count: 5000  # ~20MB
checkpoint-interval: 5m          # Every 5 minutes
```

**WAL growing too large:**
```yaml
# Decrease thresholds for more aggressive checkpointing
min-checkpoint-page-count: 500   # ~2MB
checkpoint-interval: 30s         # Every 30 seconds
truncate-page-n: 50000           # ~200MB emergency threshold
```

## Further Reading

- [Configuration Reference](/reference/config) - All configuration options
- [How It Works](/how-it-works) - Litestream architecture and checkpointing
- [Troubleshooting](/docs/troubleshooting) - Common issues and solutions
- [SQLite WAL Mode](https://www.sqlite.org/wal.html) - Understanding WAL internals
- [SQLite Checkpointing](https://www.sqlite.org/c3ref/wal_checkpoint_v2.html) - Checkpoint modes explained
