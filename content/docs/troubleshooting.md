---
title: "Troubleshooting"
description: "Common issues and solutions when using Litestream"
lead: "Find solutions to common problems when using Litestream for SQLite replication."
date: 2025-08-21T00:00:00+00:00
lastmod: 2025-08-21T00:00:00+00:00
draft: false
images: []
layout: docs
menu:
  docs:
    parent: "help"
weight: 999
toc: true
---

## Configuration Issues

### Invalid Configuration File

**Error**: `yaml: unmarshal errors` or `cannot parse config`

**Solution**: Validate your YAML syntax:

- Check indentation (use spaces, not tabs)
- Ensure proper nesting of configuration sections
- Validate string values are properly quoted when containing special characters

```yaml
# ❌ Invalid - mixed tabs and spaces
dbs:
  - path: /path/to/db.sqlite
  replica:
    url: s3://bucket/path

# ✅ Valid - consistent spacing
dbs:
  - path: /path/to/db.sqlite
    replica:
      url: s3://bucket/path
```

## Managing Credentials Securely

Properly securing credentials is critical for Litestream deployments. This section
covers best practices for credential management across different deployment scenarios.

### Best Practices

1. **Never commit credentials to version control** — Use `.gitignore` to exclude
   configuration files containing sensitive data
2. **Prefer environment variables** — Litestream supports environment variable
   expansion in configuration files
3. **Use secret management systems** — For production, use Kubernetes Secrets,
   Docker Secrets, or HashiCorp Vault
4. **Minimize credential exposure** — Provide only the permissions needed for your
   use case (principle of least privilege)
5. **Rotate credentials regularly** — Update access keys and secrets periodically
6. **Audit access** — Monitor credential usage through cloud provider logs

### Environment Variable Expansion

Litestream automatically expands `$VAR` and `${VAR}` references in configuration files.
This is the simplest way to pass credentials without embedding them in files:

```yaml
dbs:
  - path: /var/lib/mydb.db
    replica:
      url: s3://mybucket/db
      access-key-id: ${AWS_ACCESS_KEY_ID}
      secret-access-key: ${AWS_SECRET_ACCESS_KEY}
```

```bash
# Set environment variables before running Litestream
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
litestream replicate
```

To disable environment variable expansion if it conflicts with your values:

```bash
litestream replicate -no-expand-env
```

### Kubernetes Secrets

For Kubernetes deployments, mount credentials as environment variables from Secrets:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: litestream-aws-credentials
type: Opaque
stringData:
  access-key-id: AKIAIOSFODNN7EXAMPLE
  secret-access-key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest
        env:
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: litestream-aws-credentials
              key: access-key-id
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: litestream-aws-credentials
              key: secret-access-key
        volumeMounts:
        - name: litestream-config
          mountPath: /etc/litestream
          readOnly: true
      volumes:
      - name: litestream-config
        configMap:
          name: litestream-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: litestream-config
data:
  litestream.yml: |
    dbs:
      - path: /data/myapp.db
        replica:
          url: s3://mybucket/myapp
          access-key-id: ${AWS_ACCESS_KEY_ID}
          secret-access-key: ${AWS_SECRET_ACCESS_KEY}
```

For GCS with workload identity (recommended for Kubernetes on GKE):

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: litestream-sa
  annotations:
    iam.gke.io/gcp-service-account: litestream@your-project.iam.gserviceaccount.com
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      serviceAccountName: litestream-sa
      containers:
      - name: app
        image: myapp:latest
        env:
        - name: GOOGLE_APPLICATION_CREDENTIALS
          value: /var/run/secrets/cloud.google.com/service_account/key.json
```

### Docker Secrets

For Docker Swarm deployments, use Docker Secrets:

```yaml
version: '3.8'
services:
  myapp:
    image: myapp:latest
    environment:
      AWS_ACCESS_KEY_ID_FILE: /run/secrets/aws_access_key_id
      AWS_SECRET_ACCESS_KEY_FILE: /run/secrets/aws_secret_access_key
    secrets:
      - aws_access_key_id
      - aws_secret_access_key
    configs:
      - source: litestream_config
        target: /etc/litestream.yml

configs:
  litestream_config:
    file: ./litestream.yml

secrets:
  aws_access_key_id:
    external: true
  aws_secret_access_key:
    external: true
```

Then read these in your startup script:

```bash
#!/bin/sh
export AWS_ACCESS_KEY_ID=$(cat /run/secrets/aws_access_key_id)
export AWS_SECRET_ACCESS_KEY=$(cat /run/secrets/aws_secret_access_key)
exec litestream replicate
```

### Azure with Managed Identity

For Azure deployments, use managed identity instead of shared keys:

```yaml
# Pod with Azure managed identity
apiVersion: aad.banzaicloud.com/v1
kind: AzureIdentity
metadata:
  name: litestream-identity
spec:
  type: 0  # Managed Service Identity
  resourceID: /subscriptions/{subscription}/resourcegroups/{resourcegroup}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/litestream
  clientID: {client-id}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    metadata:
      labels:
        aadpodidbinding: litestream-identity
    spec:
      containers:
      - name: app
        image: myapp:latest
        volumeMounts:
        - name: litestream-config
          mountPath: /etc/litestream
          readOnly: true
      volumes:
      - name: litestream-config
        configMap:
          name: litestream-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: litestream-config
data:
  litestream.yml: |
    dbs:
      - path: /data/myapp.db
        replica:
          url: abs://account@myaccount.blob.core.windows.net/container/db
          # Managed identity authentication (no keys needed)
```

### Credential Security Checklist

- ✅ Credentials stored in environment variables or secret management systems
- ✅ Configuration files never committed to version control with credentials
- ✅ Credentials have minimal required permissions
- ✅ Access is logged and auditable
- ✅ Credentials rotated on a regular schedule
- ✅ Development and production credentials are separate
- ✅ Database backup location is restricted to authorized users
- ✅ Network access to cloud storage is restricted to necessary services

### Database Path Issues

**Error**: `no such file or directory` or `database is locked`

**Solution**:

1. Ensure the database path exists and is accessible
2. Check file permissions (Litestream needs read/write access)
3. Verify the database isn't being used by another process without proper `busy_timeout`

```sql
-- Set busy timeout in your application
PRAGMA busy_timeout = 5000;
```

### MCP Server Won't Start

**Error**: `bind: address already in use`

**Solution**: Check if another process is using the MCP port:

```bash
# Check what's using port 3001
lsof -i :3001

# Use a different port in configuration
mcp-addr: ":3002"
```

## Replication Issues

### S3 Connection Failures

**Error**: `NoCredentialsProviders` or `access denied`

**Solution**:

1. Verify AWS credentials are properly configured:

   ```bash
   # Check AWS credentials
   aws configure list
   ```

2. Ensure IAM permissions include required S3 actions:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:GetObject",
           "s3:PutObject",
           "s3:DeleteObject",
           "s3:ListBucket"
         ],
         "Resource": [
           "arn:aws:s3:::your-bucket",
           "arn:aws:s3:::your-bucket/*"
         ]
       }
     ]
   }
   ```

### S3 Signature Errors

**Error**: `SignatureDoesNotMatch` or similar signature mismatch errors

**Solution**:

This error typically occurs with Litestream versions prior to v0.5.5 when using
AWS S3 or certain S3-compatible providers.

1. **Upgrade to v0.5.5 or later** — The default `sign-payload` setting changed
   from `false` to `true`, which resolves most signature issues.

2. If you cannot upgrade, explicitly enable payload signing:

   ```yaml
   dbs:
     - path: /path/to/db.sqlite
       replica:
         url: s3://bucket/path
         sign-payload: true
   ```

3. Or via URL query parameter:

   ```yaml
   replica:
     url: s3://bucket/path?sign-payload=true
   ```

### Azure Blob Storage Permission Errors

**Error**: `AuthorizationPermissionMismatch` or `no matching backup files available`

When using Microsoft Entra ID authentication (Managed Identity, Service Principal, or
Azure CLI), you must have the correct **Storage Blob Data** role assigned. Standard
Azure roles like Owner or Contributor manage the storage account but do **not** grant
access to blob data.

| Error Message | Likely Cause |
|---------------|--------------|
| `AuthorizationPermissionMismatch` | Missing Storage Blob Data role |
| `AuthorizationFailure` | Authentication issue or wrong account |
| `no matching backup files available` | Often a permissions issue (prior to v0.5.7, the actual error was hidden) |

**Solution**:

1. Verify you have the correct role assigned:

   | Operation | Minimum Required Role |
   |-----------|----------------------|
   | Backup (write) | Storage Blob Data Contributor |
   | Restore (read-only) | Storage Blob Data Reader |

2. Assign the role via Azure CLI:

   ```bash
   az role assignment create \
       --role "Storage Blob Data Contributor" \
       --assignee <your-email-or-object-id> \
       --scope "/subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.Storage/storageAccounts/<storage-account>"
   ```

3. Wait up to 10 minutes for role assignments to take effect.

4. Verify your authentication is working:

   ```bash
   # For Azure CLI auth
   az login
   az storage blob list --account-name <storage-account> --container-name <container> --auth-mode login
   ```

See the [Azure Blob Storage guide](/guides/azure/#required-azure-roles) for detailed
role assignment instructions.

### NATS Connection Issues

**Error**: `connection refused` or `authentication failed`

**Solution**:

1. Verify NATS server is running and accessible:

   ```bash
   # Test NATS connectivity
   nats server check --server nats://localhost:4222
   ```

2. Check authentication credentials:

   ```yaml
   dbs:
     - path: /path/to/db.sqlite
       replica:
         type: nats
         url: nats://localhost:4222/bucket
         # Use appropriate auth method
         username: user
         password: pass
   ```

### S3-Compatible Upload Errors

**Error**: `InvalidContentEncoding`, `MalformedTrailerError`, or similar errors
when uploading to S3-compatible providers

**Solution**:

This error occurs with Litestream versions prior to v0.5.4 when using S3-compatible
providers (Tigris, Backblaze B2, MinIO, DigitalOcean Spaces, etc.). AWS SDK Go v2
v1.73.0+ introduced aws-chunked encoding that many providers don't support.

1. **Upgrade to v0.5.4 or later** — Litestream automatically disables aws-chunked
   encoding for all S3-compatible providers.

2. See the [S3-Compatible Guide](/guides/s3-compatible/#upload-encoding-errors)
   for more details.

### Slow Replication

**Symptoms**: High lag between database changes and replica updates

**Solution**:

1. Check sync intervals in configuration:

   ```yaml
   dbs:
     - path: /path/to/db.sqlite
       # Reduce intervals for faster sync
       monitor-interval: 1s
       checkpoint-interval: 1m
       replica:
         sync-interval: 1s
   ```

2. Monitor system resources (CPU, memory, network)
3. Consider using local file replica for testing performance

### File Retention and Cleanup Issues

**Symptoms**: LTX files accumulating in your S3 or R2 bucket despite having
retention configured, or files not being deleted as expected.

This section explains how Litestream's retention timing works and covers known
issues with certain S3-compatible providers.

#### Understanding Retention Timing

Litestream uses a tiered file structure for replicas. Understanding when each
file type is eligible for deletion helps diagnose retention issues:

| File Type | Retention Trigger | Dependencies |
|-----------|-------------------|--------------|
| **L0 (WAL segments)** | After `l0-retention` (default 5m) | Must be compacted into L1 first |
| **L1/L2/L3 (compacted)** | When `EnforceSnapshotRetention()` runs | Snapshot age > `retention` |
| **L9 (snapshots)** | When snapshot age > `retention` | None |

The effective cleanup delay is approximately: `snapshot.interval` + `snapshot.retention`

**Example timing with default configuration:**

- Configuration: `interval=30m` + `retention=1h`
- First snapshot created at T+30m (age: 0)
- Second snapshot created at T+1h (first snapshot age: 30m)
- First snapshot becomes eligible for deletion at T+1h30m (age exceeds 1h)
- **Result**: Minimum 1.5 hours before L1+ cleanup begins

This means files will accumulate during this period. This is expected behavior,
not a bug. Note that retention enforcement only runs when Litestream creates a
new snapshot, not continuously in the background.

#### Verifying Retention Is Working

Use Litestream's Prometheus metrics to monitor retention status:

```promql
# L0 file retention status (v0.5.x)
litestream_l0_retention_files_total{status="eligible"}      # Ready for deletion
litestream_l0_retention_files_total{status="not_compacted"} # Awaiting L1 compaction
litestream_l0_retention_files_total{status="too_recent"}    # Within retention window

# S3/R2 operation tracking
rate(litestream_replica_operation_total{operation="DELETE"}[5m])
litestream_replica_operation_errors_total{operation="DELETE"}
```

If `DELETE` operations show errors or the `eligible` count keeps growing while
actual deletions don't occur, the issue may be with your storage provider.

#### Cloudflare R2 Silent Deletion Failures

Cloudflare R2 has a known issue where `DeleteObjects` API calls may return
HTTP 200 with objects listed as "Deleted", but the files are not actually
removed from storage. This is documented in [Cloudflare Community forums](https://community.cloudflare.com/t/r2-delete-objects-command-does-not-delete-objects/537479).

**Symptoms:**

- Litestream logs show successful deletions
- Prometheus metrics show DELETE operations succeeding
- Files remain in R2 bucket when checked manually

**Verification:**

```bash
# After Litestream reports deletion, check if files still exist
# Using rclone (configure R2 remote first):
rclone ls r2:your-bucket/path/to/replica | grep "filename-that-should-be-deleted"

# Or using AWS CLI with R2 endpoint:
aws s3 ls s3://your-bucket/path/to/replica \
  --endpoint-url https://ACCOUNT_ID.r2.cloudflarestorage.com | grep "filename"
```

If files that should have been deleted are still present, R2's silent deletion
bug is likely occurring.

##### Workaround: R2 Object Lifecycle Rules

Configure [R2 Object Lifecycle rules](https://developers.cloudflare.com/r2/buckets/object-lifecycles/)
as a fallback cleanup mechanism:

1. Go to **Cloudflare Dashboard** → **R2** → **Your Bucket** → **Settings**
2. Click **Object Lifecycle Rules** → **Add rule**
3. Configure:
   - **Rule name**: `litestream-cleanup`
   - **Prefix filter**: Your Litestream replica path (e.g., `backups/mydb/`)
   - **Action**: Delete objects
   - **Days after object creation**: Set based on your retention needs (e.g., 7 days)

Example using AWS SDK:

```javascript
{
  ID: "litestream-cleanup",
  Status: "Enabled",
  Filter: { Prefix: "backups/mydb/" },
  Expiration: { Days: 7 }
}
```

**Important considerations:**

- Objects are typically removed within 24 hours of expiration
- This is a fallback, not a replacement for Litestream's retention
- Set lifecycle days higher than your Litestream retention to avoid premature deletion

#### R2 Bucket Versioning

If R2 bucket versioning is enabled, deleted objects become "delete markers"
rather than being permanently removed. Check your bucket settings:

1. **Cloudflare Dashboard** → **R2** → **Your Bucket** → **Settings**
2. Look for **Bucket versioning** setting
3. If enabled, previous versions of objects are retained

To clean up versioned objects, you may need to delete specific versions or
configure lifecycle rules that handle versioned objects.

#### Adjusting Retention Configuration

If files are accumulating faster than expected, consider adjusting your
retention settings. Snapshot and retention settings are configured globally,
not per-replica:

```yaml
# Global snapshot settings (not per-replica)
snapshot:
  interval: 1h      # How often to create snapshots
  retention: 24h    # How long to keep snapshots

dbs:
  - path: /path/to/db.sqlite
    replica:
      url: s3://bucket/path
```

Shorter `snapshot.interval` values create more frequent snapshots, which allows
older data to be cleaned up sooner. See the
[Configuration Reference](/reference/config/#retention-period) for details on
how retention works.

## Database Issues

### WAL Mode Problems

**Error**: `database is not in WAL mode`

**Solution**: Litestream requires WAL mode. Enable it in your application:

```sql
-- Enable WAL mode
PRAGMA journal_mode = WAL;
```

Or let Litestream enable it automatically by ensuring proper database permissions.

### Database Locks

**Error**: `database is locked` or `SQLITE_BUSY`

**Solution**:

1. Set busy timeout in your application (see above)
2. Ensure no long-running transactions are blocking checkpoints
3. Check for applications holding exclusive locks

### WAL Growth and Checkpoint Blocking

**Symptoms**: WAL file growing excessively large or writes timing out

**Solution**:

1. Check if you have long-lived read transactions preventing checkpoints
2. Review checkpoint configuration in your config file
3. Consider disabling `truncate-page-n` if you have long-running queries:

   ```yaml
   dbs:
     - path: /path/to/db.sqlite
       truncate-page-n: 0  # Disable blocking checkpoints
   ```

4. Monitor WAL file size and disk space

For detailed guidance on checkpoint configuration and trade-offs, see the [WAL
Truncate Threshold Configuration guide](/guides/wal-truncate-threshold).

### Corruption Detection

**Error**: `database disk image is malformed`

**Solution**:

1. Stop Litestream replication
2. Run SQLite integrity check:

   ```bash
   sqlite3 /path/to/db.sqlite "PRAGMA integrity_check;"
   ```

3. If corrupted, restore from latest backup:

   ```bash
   litestream restore -o /path/to/recovered.db /path/to/db.sqlite
   ```

## Performance Issues

### High CPU Usage

**Symptoms**: Litestream consuming excessive CPU (100%+ sustained)

**Common Causes**:

1. **Unbounded WAL growth** — Long-running read transactions blocking checkpoints
2. **State corruption** — Tracking files mismatched with replica state
3. **Blocked checkpoints** — Application holding read locks

**Diagnosis**:

```bash
# Check CPU usage over time
pidstat -p $(pgrep litestream) 1 5

# Check WAL file size (large WAL indicates checkpoint blocking)
ls -lh /path/to/db.sqlite-wal

# Check for blocking processes
sqlite3 /path/to/db.sqlite "PRAGMA wal_checkpoint(PASSIVE);"
# Result: status|log|checkpointed
# status=1 means checkpoint was blocked
```

**Solutions**:

1. **Reduce monitoring frequency**:

   ```yaml
   dbs:
     - path: /path/to/db.sqlite
       monitor-interval: 10s
       replica:
         # ... (other replica settings)
         sync-interval: 5m
   ```

2. **Fix blocked checkpoints** — Kill long-running read connections in your application

3. **Reset corrupted state** — See [Recovering from corrupted tracking state](#recovering-from-corrupted-tracking-state)

### Memory Issues

**Symptoms**: High memory usage or out-of-memory errors

**Solution**:

1. Monitor snapshot sizes and retention policies
2. Adjust retention settings:

   ```yaml
   snapshot:
     interval: 24h
     retention: 72h  # Keep fewer snapshots
   ```

## Network and Connectivity

### Intermittent Network Failures

**Error**: `connection reset by peer` or `timeout`

**Solution**:

1. Adjust sync interval to reduce frequency of requests during outages:

   ```yaml
   dbs:
     - path: /path/to/db.sqlite
       replica:
         url: s3://bucket/path
         sync-interval: 10s
   ```

2. Check network stability and firewall rules
3. Consider using regional endpoints for cloud storage
4. For production, use a configuration file to persist your settings (see [Configuration Reference]({{< ref "config" >}}))

### DNS Resolution Issues

**Error**: `no such host` or DNS timeouts

**Solution**:

1. Test DNS resolution:

   ```bash
   nslookup s3.amazonaws.com
   ```

2. Use IP addresses instead of hostnames if needed
3. Check `/etc/resolv.conf` configuration

## Logging and Debugging

### Enabling Debug Logging

Add debug logging to your configuration:

```yaml
logging:
  level: debug
  type: text
  stderr: true
```

### Reading Logs

Common log locations:

- **Linux systemd**: `journalctl -u litestream`
- **Docker**: `docker logs container_name`
- **Windows Service**: Event Viewer → Application → Litestream
- **Command Line**: stdout/stderr

### Important Log Messages

Look for these key messages:

- `initialized db`: Database successfully loaded
- `replicating to`: Replica configuration loaded
- `sync error`: Replication issues
- `checkpoint completed`: Successful WAL checkpoint

## LTX Replication Errors

{{< since version="0.5.7" >}} LTX (Litestream Transaction Log) errors occur when
local tracking state becomes inconsistent with the replica. These errors are
commonly reported after unclean shutdowns, OOM kills, or manual state
manipulation.

### Common Error Messages

#### "cannot close, expected page"

```
level=ERROR msg="sync error" error="cannot close, expected page N but found M"
```

This occurs when Litestream detects a mismatch between expected and actual page
numbers during sync. The local tracking state references pages that don't match
the current database state.

#### "nonsequential page numbers in snapshot transaction"

```
level=ERROR msg="sync error" error="nonsequential page numbers in snapshot transaction"
```

This indicates the snapshot transaction contains pages that are out of order,
typically caused by an incomplete or corrupted snapshot write.

#### "non-contiguous transaction files"

```
level=ERROR msg="sync error" error="non-contiguous transaction files"
```

LTX files must form a contiguous sequence. A gap in the sequence means one or
more transaction files are missing, usually from an unclean shutdown or
partial write.

#### Sync retry backoff loops

```
level=WARN msg="retrying sync" attempt=1 error="..." backoff=1s
level=WARN msg="retrying sync" attempt=2 error="..." backoff=2s
level=WARN msg="retrying sync" attempt=3 error="..." backoff=4s
```

Repeated retry messages with increasing backoff indicate Litestream is stuck
trying to sync with a persistent LTX error.

### Recovery Options

There are two ways to recover from LTX errors:

#### Option 1: Manual Reset

Use the [`litestream reset`]({{< ref "/reference/reset" >}}) command to clear
local state and force a fresh snapshot:

```bash
# Stop Litestream
sudo systemctl stop litestream

# Reset local state for the affected database
litestream reset /var/lib/db

# Restart Litestream
sudo systemctl start litestream
```

After restart, Litestream will create a fresh snapshot. See the
[`reset` command reference]({{< ref "/reference/reset" >}}) for details.

#### Option 2: Automatic Recovery

Enable the [`auto-recover`]({{< ref "/reference/config#auto-recover" >}}) option
on your replica to have Litestream automatically reset when LTX errors occur:

```yaml
dbs:
  - path: /var/lib/db
    replica:
      url: s3://mybucket/db
      auto-recover: true
```

This is recommended for unattended deployments where manual intervention is
impractical. See the [configuration reference]({{< ref "/reference/config#auto-recover" >}})
for guidance on when to enable this option.

### Preventing LTX Errors

- **Use proper shutdown procedures** — Always stop Litestream gracefully with
  `SIGTERM` before shutting down the system
- **Set busy timeout** — Prevents checkpoint blocking that can lead to state
  corruption:

  ```sql
  PRAGMA busy_timeout = 5000;
  ```

- **Avoid in-place VACUUM** — Use `VACUUM INTO` instead (see
  [Operations That Invalidate Tracking State](#operations-that-invalidate-tracking-state))
- **Monitor replication** — Use Prometheus metrics to detect sync errors early


## Recovery and Restore

### Point-in-Time Recovery

List available restore points:

```bash
litestream ltx /path/to/db.sqlite
```

Restore to specific time:

```bash
litestream restore -timestamp 2025-01-01T12:00:00Z -o restored.db /path/to/db.sqlite
```

### Backup Validation

Verify backup integrity:

```bash
# Restore to temporary location
litestream restore -o /tmp/test.db /path/to/db.sqlite

# Run integrity check
sqlite3 /tmp/test.db "PRAGMA integrity_check;"
```

## Operations That Invalidate Tracking State

Litestream maintains internal tracking state in `.{filename}-litestream` directories
(e.g., `.db.sqlite-litestream` for a database file named `db.sqlite`) to efficiently
replicate changes. Certain operations can corrupt or invalidate
this tracking, leading to high CPU usage, replication errors, or state mismatch
between local tracking and remote replicas.

### Operations to avoid

| Operation | Why It's Problematic | Safe Alternative |
|-----------|----------------------|------------------|
| In-place `VACUUM` | Rewrites entire database, invalidating page tracking | Use `VACUUM INTO 'new.db'` |
| Manual checkpoint while Litestream is stopped | Large WAL changes database state without tracking | Let Litestream manage checkpoints |
| Deleting `.sqlite-litestream` directory | Creates local/remote state mismatch | Delete both local tracking AND remote replica |
| Restoring database while Litestream is running | Overwrites database without updating tracking | Stop Litestream before restore |

### In-place VACUUM

The SQLite `VACUUM` command rewrites the entire database file. Litestream tracks
changes at the page level, so a full rewrite invalidates all tracking state.

```sql
-- Dangerous: Invalidates Litestream tracking
VACUUM;

-- Safe: Creates new file, preserves original
VACUUM INTO '/path/to/compacted.db';
```

If you must use in-place `VACUUM`:

1. Stop Litestream
2. Run `VACUUM`
3. Delete the `.sqlite-litestream` tracking directory
4. Delete the remote replica data (start fresh)
5. Restart Litestream

### Symptoms of corrupted tracking state

- **High CPU usage** (100%+) even when database is idle
- **Repeated log messages** with identical transaction IDs
- **"timeout waiting for db initialization"** warnings
- **Missing LTX file errors**:

  ```
  level=ERROR msg="monitor error" error="open .../ltx/0/0000000000000001.ltx: no such file or directory"
  ```

- **Local/remote state mismatch**:

  ```
  level=INFO msg="detected database behind replica" db_txid=0000000000000000 replica_txid=0000000000000001
  ```


## Recovering from Corrupted Tracking State

When Litestream's tracking state becomes corrupted, a complete state reset is
required. This procedure removes all local tracking and remote replica data,
forcing a fresh snapshot.

{{< alert icon="⚠️" text="**Warning**: This procedure deletes your replica history. You will lose the ability to do point-in-time recovery to timestamps before the reset. Only proceed if you have confirmed tracking corruption." >}}

### Recovery procedure

```bash
# 1. Stop Litestream
sudo systemctl stop litestream

# 2. Kill any processes holding database connections
# (application-specific - check for zombie processes)
lsof /path/to/db.sqlite

# 3. Checkpoint the database to clear WAL
sqlite3 /path/to/db.sqlite "PRAGMA wal_checkpoint(TRUNCATE);"
# Verify: result should be "0|0|0" (success)

# 4. Remove local Litestream tracking
rm -rf /path/to/.db.sqlite-litestream

# 5. Remove remote replica data (start fresh)
# For S3:
aws s3 rm s3://bucket/path/db.sqlite --recursive

# For GCS:
gsutil rm -r gs://bucket/path/db.sqlite

# For Azure:
az storage blob delete-batch --source container --pattern "path/db.sqlite/*"

# 6. Restart Litestream
sudo systemctl start litestream
```

### Verifying recovery

After restarting, verify Litestream has recovered:

```bash
# Check CPU usage is normal (should be near 0% when idle)
pidstat -p $(pgrep litestream) 1 5

# Check logs for successful snapshot
journalctl -u litestream -f
# Should see: "snapshot written" or similar
```

### Preventing future issues

1. **Avoid in-place VACUUM** — Use `VACUUM INTO` instead
2. **Set busy timeout** — Prevent checkpoint blocking:

   ```sql
   PRAGMA busy_timeout = 5000;
   ```

3. **Monitor WAL size** — Alert if WAL exceeds 50% of database size
4. **Kill zombie connections** — Ensure application processes don't hold long-lived read locks


## Getting Help

### Before Asking for Help

1. **Check the logs** for error messages (use debug level)
2. **Test with minimal config** to isolate the issue
3. **Verify versions**: Ensure you're using compatible Litestream version
4. **Search existing issues** on GitHub

### Where to Get Help

- **GitHub Issues**: [github.com/benbjohnson/litestream/issues](https://github.com/benbjohnson/litestream/issues)
- **Documentation**: Review [Configuration Reference]({{< ref "/reference/config" >}})

### Reporting Issues

When reporting issues on GitHub, the bug report template will ask for:

- **Bug Description**: Clear description of the issue
- **Environment**: Litestream version, operating system, installation method, storage backend
- **Steps to Reproduce**: Numbered steps, expected vs actual behavior
- **Configuration**: Your `litestream.yml` file (remove sensitive data)
- **Logs**: Relevant log output with debug level enabled
- **Additional Context**: Recent changes, related issues, workarounds attempted

## SQLite Driver Issues (v0.5.0+)

{{< since version="0.5.0" >}} Litestream migrated from `mattn/go-sqlite3` to `modernc.org/sqlite`. This section covers issues specific to this change.

### PRAGMA Configuration Errors

**Error**: PRAGMAs not taking effect or `unknown pragma` errors

**Solution**: v0.5.0+ uses different PRAGMA syntax in connection strings:

```text
# OLD (v0.3.x - mattn/go-sqlite3):
file:/path/to/db?_busy_timeout=5000

# NEW (v0.5.0+ - modernc.org/sqlite):
file:/path/to/db?_pragma=busy_timeout(5000)
```

See the [SQLite Driver Migration]({{< ref "/docs/migration#sqlite-driver-migration" >}}) guide for complete syntax.

### Busy Timeout Not Working

**Error**: `SQLITE_BUSY` errors despite setting busy timeout

**Solution**: Verify you're using the correct syntax for v0.5.0+:

```text
# Correct v0.5.0+ syntax
?_pragma=busy_timeout(5000)

# Incorrect (v0.3.x syntax - won't work in v0.5.0+)
?_busy_timeout=5000
```

### Build Errors with CGO

**Error**: CGO-related build errors when building Litestream

**Solution**: v0.5.0+ does not require cgo for the main binary:

```bash
# Explicitly disable cgo if you're seeing cgo errors
CGO_ENABLED=0 go build ./cmd/litestream
```

### Performance Differences

**Symptoms**: Different performance characteristics after upgrading

**Solution**: While `modernc.org/sqlite` is highly optimized:

1. Benchmark your specific workload if performance is critical
2. The pure Go driver performs comparably for most use cases
3. For VFS/experimental features, the cgo driver is still available

## Common Error Reference

| Error Message | Common Cause | Solution |
|---------------|--------------|----------|
| `database is locked` | No busy timeout set | Add `PRAGMA busy_timeout = 5000;` |
| `no such file or directory` | Incorrect database path | Verify path exists and permissions |
| `NoCredentialsProviders` | Missing AWS credentials | Configure AWS credentials |
| `SignatureDoesNotMatch` | Unsigned payload (pre-v0.5.5) | Upgrade to v0.5.5+ or set `sign-payload: true` |
| `InvalidContentEncoding` | aws-chunked encoding (pre-v0.5.4) | Upgrade to v0.5.4+ for S3-compatible providers |
| `MalformedTrailerError` | aws-chunked encoding (pre-v0.5.4) | Upgrade to v0.5.4+ for S3-compatible providers |
| `AuthorizationPermissionMismatch` (Azure) | Missing Storage Blob Data role | Assign Storage Blob Data Contributor/Reader role |
| `no matching backup files available` (Azure) | Permission issue (pre-v0.5.7) | Check Azure RBAC roles; upgrade to v0.5.7+ for better errors |
| `connection refused` | Service not running | Check if target service is accessible |
| `yaml: unmarshal errors` | Invalid YAML syntax | Validate configuration file syntax |
| `bind: address already in use` | Port conflict | Change MCP port or stop conflicting service |
| PRAGMA not taking effect | Wrong syntax for v0.5.0+ | Use `_pragma=name(value)` syntax |
| LTX files accumulating (R2) | R2 silent deletion bug | Use R2 Object Lifecycle rules as fallback |
| Files not deleted despite retention | Retention timing or provider bug | Check retention timing math; verify deletions |
| `cannot close, expected page` | Corrupted local tracking state | Run `litestream reset` or enable `auto-recover` |
| `nonsequential page numbers in snapshot transaction` | Incomplete snapshot write | Run `litestream reset` or enable `auto-recover` |
| `non-contiguous transaction files` | Missing LTX files after unclean shutdown | Run `litestream reset` or enable `auto-recover` |

## Next Steps

- [Configuration Reference]({{< ref "/reference/config" >}})
- [Installation Guide]({{< ref "/install" >}})
- [Getting Started]({{< ref "/getting-started" >}})
- [Tips & Caveats]({{< ref "/tips" >}})
