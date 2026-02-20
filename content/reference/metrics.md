---
title : "Prometheus Metrics"
date: 2021-02-01T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 506
---

Litestream exposes metrics in [Prometheus](https://prometheus.io/) format for
monitoring replication health and performance. Metrics are disabled by default
and require enabling the HTTP server.

## Enabling Metrics

Add an `addr` field to your configuration file to enable the metrics endpoint:

```yaml
addr: ":9090"
```

Metrics will be available at `http://localhost:9090/metrics`.


## Database Metrics

These metrics track the state and operations of each replicated database. All
database metrics include a `db` label containing the absolute path to the
database file.

### litestream_db_size

**Type:** Gauge

The current size of the database file in bytes.

```
litestream_db_size{db="/var/lib/myapp.db"} 4194304
```


### litestream_wal_size

**Type:** Gauge

The current size of the WAL (Write-Ahead Log) file in bytes.

```
litestream_wal_size{db="/var/lib/myapp.db"} 32768
```


### litestream_total_wal_bytes

**Type:** Counter

Total number of bytes written to the shadow WAL since Litestream started. This
metric is cumulative and only increases.

```
litestream_total_wal_bytes{db="/var/lib/myapp.db"} 1048576
```


### litestream_txid

**Type:** Gauge

The current transaction ID (TXID) of the database. This value increases with
each SQLite transaction.

```
litestream_txid{db="/var/lib/myapp.db"} 42
```


### litestream_sync_count

**Type:** Counter

Number of sync operations performed. A sync operation copies WAL frames to the
shadow WAL for replication.

```
litestream_sync_count{db="/var/lib/myapp.db"} 150
```


### litestream_sync_error_count

**Type:** Counter

Number of errors that have occurred during sync, including database
initialization failures. Monitor this metric for replication health—any
non-zero growth indicates issues with the sync process.

```
litestream_sync_error_count{db="/var/lib/myapp.db"} 0
```


### litestream_sync_seconds

**Type:** Counter

Cumulative time spent syncing shadow WAL, in seconds. Divide by `litestream_sync_count`
to get average sync duration.

```
litestream_sync_seconds{db="/var/lib/myapp.db"} 0.523
```


### litestream_checkpoint_count

**Type:** Counter
**Labels:** `db`, `mode`

Number of checkpoint operations performed. The `mode` label indicates the
checkpoint type: `passive` or `truncate`.

```
litestream_checkpoint_count{db="/var/lib/myapp.db",mode="passive"} 60
litestream_checkpoint_count{db="/var/lib/myapp.db",mode="truncate"} 1
```


### litestream_checkpoint_error_count

**Type:** Counter
**Labels:** `db`, `mode`

Number of checkpoint errors that have occurred, grouped by checkpoint mode.

```
litestream_checkpoint_error_count{db="/var/lib/myapp.db",mode="passive"} 0
litestream_checkpoint_error_count{db="/var/lib/myapp.db",mode="truncate"} 0
```


### litestream_checkpoint_seconds

**Type:** Counter
**Labels:** `db`, `mode`

Cumulative time spent checkpointing, in seconds, grouped by checkpoint mode.

```
litestream_checkpoint_seconds{db="/var/lib/myapp.db",mode="passive"} 1.234
```


## Replica Metrics

These metrics track operations performed against replicas (S3, GCS, Azure, etc.).

### litestream_replica_operation_total

**Type:** Counter
**Labels:** `replica_type`, `operation`

The number of replica operations performed. The `replica_type` label indicates
the storage backend (e.g., `s3`, `gcs`, `abs`, `file`). The `operation` label
indicates the operation type.

```
litestream_replica_operation_total{replica_type="s3",operation="put"} 100
litestream_replica_operation_total{replica_type="s3",operation="get"} 25
litestream_replica_operation_total{replica_type="s3",operation="delete"} 10
```


### litestream_replica_operation_bytes

**Type:** Counter
**Labels:** `replica_type`, `operation`

The number of bytes transferred by replica operations.

```
litestream_replica_operation_bytes{replica_type="s3",operation="put"} 52428800
litestream_replica_operation_bytes{replica_type="s3",operation="get"} 4194304
```


## Example Prometheus Queries

### Replication Lag

Calculate the average sync duration over the last 5 minutes:

```promql
rate(litestream_sync_seconds[5m]) / rate(litestream_sync_count[5m])
```

### Sync Error Rate

Calculate the sync error rate:

```promql
rate(litestream_sync_error_count[5m])
```

### Data Transfer Rate

Calculate bytes uploaded to S3 per second:

```promql
rate(litestream_replica_operation_bytes{operation="put"}[5m])
```

### Database Growth

Track database size growth:

```promql
litestream_db_size
```


## Alerting Examples

Example Prometheus alerting rules:

```yaml
groups:
  - name: litestream
    rules:
      - alert: LitestreamSyncErrors
        expr: increase(litestream_sync_error_count[5m]) > 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Litestream sync errors detected"
          description: "Database {{ $labels.db }} has sync errors"

      - alert: LitestreamReplicationStopped
        expr: increase(litestream_sync_count[10m]) == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Litestream replication appears stopped"
          description: "No sync operations for database {{ $labels.db }}"
```


## Grafana Dashboard

A basic Grafana dashboard can visualize these metrics. Key panels to include:

- Database size over time (`litestream_db_size`)
- Sync operations per second (`rate(litestream_sync_count[1m])`)
- Sync error rate (`rate(litestream_sync_error_count[1m])`)
- Replica bytes transferred (`rate(litestream_replica_operation_bytes[1m])`)
- WAL size (`litestream_wal_size`)
