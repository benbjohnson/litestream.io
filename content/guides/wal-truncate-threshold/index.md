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

1. **Non-blocking checkpoints** run frequently to keep WAL small under normal operation
2. **Time-based checkpoints** provide regular cleanup even when WAL is small
3. **Emergency truncation** prevents unbounded WAL growth at a much higher threshold

This strategy prioritizes write availability while still managing disk space. The key insight is that blocking checkpoints should be rare, reserved only for exceptional circumstances when the WAL has grown very large.

## Understanding the 3-Tier Checkpoint Strategy

Litestream uses three complementary checkpoint mechanisms, evaluated in this order after each sync:

### 1. MinCheckpointPageN (PASSIVE, Non-Blocking)

```yaml
min-checkpoint-page-count: 1000  # Default: ~4MB
```

- **Trigger:** WAL exceeds 1,000 pages (~4MB)
- **Mode:** PASSIVE checkpoint via `sqlite3_wal_checkpoint_v2()`
- **Behavior:** Non-blocking—fails silently if readers or writers are active
- **Purpose:** Keep WAL small under normal operation

### 2. CheckpointInterval (PASSIVE, Non-Blocking)

```yaml
checkpoint-interval: 1m  # Default: 1 minute
```

- **Trigger:** 1 minute elapsed since last checkpoint attempt
- **Mode:** PASSIVE checkpoint
- **Behavior:** Non-blocking—fails silently if readers or writers are active
- **Purpose:** Time-based cleanup even when WAL is small
- **Condition:** Only runs if WAL has at least 1 page

### 3. TruncatePageN (TRUNCATE, Blocking)

```yaml
truncate-page-n: 121359  # Default: ~500MB
```

- **Trigger:** WAL exceeds 121,359 pages (~500MB)
- **Mode:** TRUNCATE checkpoint via `sqlite3_wal_checkpoint_v2()`
- **Behavior:** **Blocking**—waits for active writers to complete, then truncates WAL
- **Purpose:** Emergency brake to prevent unbounded WAL growth
- **Safety:** Set much higher than PASSIVE thresholds to minimize blocking risk

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

Set any checkpoint to `0` to disable:

```yaml
dbs:
  - path: /path/to/db
    min-checkpoint-page-count: 0      # Disable PASSIVE checkpoints
    checkpoint-interval: 0             # Disable time-based checkpoints
    truncate-page-n: 0                 # Disable TRUNCATE checkpoints
```

### CLI Flags

Checkpoints can also be configured via command-line flags:

```sh
litestream replicate \
  -min-checkpoint-page-count=1000 \
  -checkpoint-interval=1m \
  -truncate-page-n=121359 \
  /path/to/db s3://mybucket/db
```

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
- TruncatePageN can block writes if WAL hits ~500MB (rare but possible)
- May cause brief write pauses in extreme cases

**Best for:** Most applications with typical read/write patterns

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

### Disabling All Checkpoints

**Configuration:**
```yaml
min-checkpoint-page-count: 0
checkpoint-interval: 0
truncate-page-n: 0
```

**Not recommended.** This configuration disables all Litestream-initiated checkpoints. Only use if:
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
WAL_SIZE=$(stat -f%z /path/to/db-wal 2>/dev/null || echo 0)
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

**Log Messages:**
```
checkpoint truncate: pages=121359 mode=TRUNCATE
```

**Solutions:**
1. Increase `truncate-page-n` threshold: `truncate-page-n: 250000`
2. Disable blocking checkpoints: `truncate-page-n: 0`
3. Reduce read transaction duration in your application

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
