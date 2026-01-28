---
title: "Troubleshooting"
description: "Common issues and solutions when using Litestream"
lead: "Find solutions to common problems when using Litestream for SQLite replication."
date: 2025-08-21T00:00:00+00:00
lastmod: 2025-08-21T00:00:00+00:00
draft: false
images: []
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

**Symptoms**: Litestream consuming excessive CPU

**Solution**:

1. Increase monitoring intervals:

   ```yaml
   dbs:
     - path: /path/to/db.sqlite
       monitor-interval: 10s  # Reduce frequency
   ```

2. Check for database hotspots (frequent small transactions)
3. Consider batch operations in your application

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
| `connection refused` | Service not running | Check if target service is accessible |
| `yaml: unmarshal errors` | Invalid YAML syntax | Validate configuration file syntax |
| `bind: address already in use` | Port conflict | Change MCP port or stop conflicting service |
| PRAGMA not taking effect | Wrong syntax for v0.5.0+ | Use `_pragma=name(value)` syntax |

## Next Steps

- [Configuration Reference]({{< ref "/reference/config" >}})
- [Installation Guide]({{< ref "/install" >}})
- [Getting Started]({{< ref "/getting-started" >}})
- [Tips & Caveats]({{< ref "/tips" >}})
