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
1. Implement retry logic in replica configuration:
   ```yaml
   dbs:
     - path: /path/to/db.sqlite
       replica:
         url: s3://bucket/path
         # Add connection tuning
         sync-interval: 10s
         retention: 168h
   ```

2. Check network stability and firewall rules
3. Consider using regional endpoints for cloud storage

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
- **GitHub Discussions**: [github.com/benbjohnson/litestream/discussions](https://github.com/benbjohnson/litestream/discussions)
- **Slack Community**: [Join Litestream Slack](https://join.slack.com/t/litestream/shared_invite/zt-3ed89j5s4-KODYR5v93N_0vHE_kDWCyg)
- **Documentation**: Review [Configuration Reference]({{< ref "/reference/config" >}})

### Reporting Issues

When reporting issues on GitHub, the bug report template will ask for:
- **Bug Description**: Clear description of the issue
- **Environment**: Litestream version, operating system, installation method, storage backend
- **Steps to Reproduce**: Numbered steps, expected vs actual behavior
- **Configuration**: Your `litestream.yml` file (remove sensitive data)
- **Logs**: Relevant log output with debug level enabled
- **Additional Context**: Recent changes, related issues, workarounds attempted

## Common Error Reference

| Error Message | Common Cause | Solution |
|---------------|--------------|----------|
| `database is locked` | No busy timeout set | Add `PRAGMA busy_timeout = 5000;` |
| `no such file or directory` | Incorrect database path | Verify path exists and permissions |
| `NoCredentialsProviders` | Missing AWS credentials | Configure AWS credentials |
| `connection refused` | Service not running | Check if target service is accessible |
| `yaml: unmarshal errors` | Invalid YAML syntax | Validate configuration file syntax |
| `bind: address already in use` | Port conflict | Change MCP port or stop conflicting service |

## Next Steps

- [Configuration Reference]({{< ref "/reference/config" >}})
- [Installation Guide]({{< ref "/install" >}})
- [Getting Started]({{< ref "/getting-started" >}})
- [Tips & Caveats]({{< ref "/tips" >}})
