---
title: "Migration Guide"
description: "Guide for upgrading Litestream and migrating between configurations"
lead: "Learn how to migrate between Litestream versions and replica configurations."
date: 2025-08-21T00:00:00+00:00
lastmod: 2025-08-21T00:00:00+00:00
draft: false
images: []
menu:
  docs:
    parent: "help"
weight: 800
toc: true
---

## Overview

This guide covers upgrading Litestream versions, migrating configuration formats, and switching between replica types. Follow the appropriate section based on your current setup and target version.

## Version Upgrades

### Upgrading to v0.4.0+

{{< since version="0.4.0" >}} introduces significant new features including MCP support and NATS replication.

#### Pre-Upgrade Checklist

1. **Backup your current setup**:
   ```bash
   # Stop Litestream
   sudo systemctl stop litestream
   
   # Backup configuration
   cp /etc/litestream.yml /etc/litestream.yml.backup
   
   # Backup binary
   cp $(which litestream) /usr/local/bin/litestream.backup
   ```

2. **Review configuration changes** (see Configuration Migration below)

3. **Test in staging environment** before upgrading production

#### Installation

Download and install the new version:

```bash
# Download latest release
wget https://github.com/benbjohnson/litestream/releases/download/v0.4.0/litestream-v0.4.0-linux-amd64.tar.gz

# Extract and install
tar -xzf litestream-v0.4.0-linux-amd64.tar.gz
sudo mv litestream /usr/local/bin/
sudo chmod +x /usr/local/bin/litestream

# Verify installation
litestream version
```

### Upgrading from v0.3.x to v0.4.0+

#### Key Changes

1. **Command Changes**:
   - `litestream wal` → `litestream ltx` (WAL command renamed to LTX)
   - New `mcp-addr` configuration option for Model Context Protocol support
   - Enhanced NATS replica support with JetStream

2. **Configuration Changes**:
   - Single `replica` field replaces `replicas` array (backward compatible)
   - New global configuration sections: `levels`, `snapshot`, `exec`
   - Extended replica configuration options

#### Migration Steps

1. **Update configuration format**:

```yaml
# OLD FORMAT (still supported)
dbs:
  - path: /var/lib/app.db
    replicas:
      - url: s3://my-bucket/app
        retention: 72h
      - type: file
        path: /backup/app

# NEW FORMAT (recommended)
dbs:
  - path: /var/lib/app.db
    replica:
      url: s3://my-bucket/app
      retention: 72h
```

2. **Add new optional features**:

```yaml
# Add MCP support (optional)
mcp-addr: ":3001"

# Add global snapshot configuration (optional)
snapshot:
  interval: 24h
  retention: 168h

# Add level-based retention (optional)
levels:
  - interval: 1h
    retention: 24h
  - interval: 24h
    retention: 168h
```

3. **Update command usage**:

```bash
# OLD: Query WAL information
litestream wal /path/to/db.sqlite

# NEW: Query LTX information  
litestream ltx /path/to/db.sqlite
```

4. **Restart services**:

```bash
# Restart Litestream with new configuration
sudo systemctl restart litestream

# Verify it's working
sudo systemctl status litestream
litestream databases
```

## Configuration Migration

### Single Replica vs Multiple Replicas

The new configuration format uses a single `replica` field instead of a `replicas` array:

```yaml
# Multiple replicas (OLD - still supported)
dbs:
  - path: /var/lib/app.db
    replicas:
      - url: s3://primary-bucket/app
      - url: s3://secondary-bucket/app
      - type: file
        path: /local/backup

# Single replica (NEW - recommended)
dbs:
  - path: /var/lib/app.db
    replica:
      url: s3://primary-bucket/app
  - path: /var/lib/app.db  # Separate entry for each replica
    replica:
      url: s3://secondary-bucket/app
  - path: /var/lib/app.db
    replica:
      type: file
      path: /local/backup
```

### Global Configuration Sections

New global sections provide better control:

```yaml
# Global snapshot configuration
snapshot:
  interval: 24h
  retention: 168h

# Global level-based retention
levels:
  - interval: 5m
    retention: 1h
  - interval: 1h
    retention: 24h
  - interval: 24h
    retention: 168h

# Global exec hooks
exec:
  - cmd: ["/usr/local/bin/notify", "Litestream started"]

# Enable MCP server
mcp-addr: ":3001"

dbs:
  - path: /var/lib/app.db
    replica:
      url: s3://my-bucket/app
```

## Replica Type Migration

### Migrating from File to S3

1. **Prepare S3 bucket and credentials**:
   ```bash
   # Create S3 bucket
   aws s3 mb s3://my-litestream-backups
   
   # Configure credentials
   aws configure
   ```

2. **Update configuration**:
   ```yaml
   dbs:
     - path: /var/lib/app.db
       replica:
         # OLD: File replica
         # type: file  
         # path: /backup/app
         
         # NEW: S3 replica
         url: s3://my-litestream-backups/app
         region: us-east-1
   ```

3. **Perform initial sync**:
   ```bash
   # Stop current replication
   sudo systemctl stop litestream
   
   # Start with new configuration
   sudo systemctl start litestream
   
   # Verify replication
   litestream databases
   ```

### Migrating from S3 to NATS

1. **Set up NATS server with JetStream**:
   ```bash
   # Start NATS with JetStream enabled
   nats-server -js
   ```

2. **Update configuration**:
   ```yaml
   dbs:
     - path: /var/lib/app.db
       replica:
         # OLD: S3 replica
         # url: s3://my-bucket/app
         
         # NEW: NATS replica
         type: nats
         url: nats://localhost:4222/my-app-bucket
         # Add authentication if needed
         username: litestream
         password: ${NATS_PASSWORD}
   ```

3. **Create NATS bucket**:
   ```bash
   # Create JetStream bucket
   nats stream create my-app-bucket \
     --subjects="my-app-bucket.>" \
     --storage=file \
     --retention=limits \
     --max-age=168h
   ```

### Migrating Between Cloud Providers

#### S3 to Google Cloud Storage

```yaml
dbs:
  - path: /var/lib/app.db
    replica:
      # OLD: AWS S3
      # url: s3://aws-bucket/app
      # region: us-east-1
      
      # NEW: Google Cloud Storage
      url: gs://gcs-bucket/app
      # Set up Application Default Credentials
```

#### S3 to Azure Blob Storage

```yaml
dbs:
  - path: /var/lib/app.db
    replica:
      # OLD: AWS S3
      # url: s3://aws-bucket/app
      
      # NEW: Azure Blob Storage
      url: abs://storage-account/container/app
      account-name: ${AZURE_STORAGE_ACCOUNT}
      account-key: ${AZURE_STORAGE_KEY}
```

## Data Migration

### Copying Existing Backups

When changing replica types, you may want to preserve existing backups:

1. **Export current backups**:
   ```bash
   # List available LTX files
   litestream ltx /var/lib/app.db
   
   # Restore latest to temporary file
   litestream restore -o /tmp/app-backup.db /var/lib/app.db
   ```

2. **Initialize new replica with existing data**:
   ```bash
   # Stop replication
   sudo systemctl stop litestream
   
   # Update configuration to new replica type
   # Start replication (will sync current database)
   sudo systemctl start litestream
   ```

### Zero-Downtime Migration

For production systems requiring zero downtime:

1. **Set up parallel replication**:
   ```yaml
   dbs:
     # Keep existing replica
     - path: /var/lib/app.db
       replica:
         url: s3://old-bucket/app
     
     # Add new replica type  
     - path: /var/lib/app.db
       replica:
         type: nats
         url: nats://localhost:4222/new-bucket
   ```

2. **Monitor both replicas**:
   ```bash
   # Watch replication status
   watch -n 5 'litestream databases'
   ```

3. **Switch over when new replica is synchronized**:
   ```yaml
   dbs:
     # Remove old replica, keep new one
     - path: /var/lib/app.db
       replica:
         type: nats
         url: nats://localhost:4222/new-bucket
   ```

## Command-Line Migration

### Script Updates

Update any scripts using deprecated commands:

```bash
#!/bin/bash

# OLD commands
# litestream wal /var/lib/app.db
# litestream databases -replica s3

# NEW commands  
litestream ltx /var/lib/app.db
litestream databases
```

### Cron Job Updates

Update cron jobs and systemd timers:

```bash
# OLD cron job
# 0 2 * * * litestream wal -path /var/lib/app.db

# NEW cron job
0 2 * * * litestream ltx /var/lib/app.db
```

## Testing Migration

### Validation Steps

After migration, validate your setup:

1. **Verify configuration**:
   ```bash
   litestream databases
   ```

2. **Test restore functionality**:
   ```bash
   litestream restore -o /tmp/test-restore.db /var/lib/app.db
   sqlite3 /tmp/test-restore.db "PRAGMA integrity_check;"
   ```

3. **Monitor replication**:
   ```bash
   # Watch for replication activity
   tail -f /var/log/litestream.log
   ```

### Rollback Plan

Always have a rollback plan:

1. **Keep old binary available**:
   ```bash
   # Quick rollback if needed
   sudo cp /usr/local/bin/litestream.backup /usr/local/bin/litestream
   sudo cp /etc/litestream.yml.backup /etc/litestream.yml
   sudo systemctl restart litestream
   ```

2. **Restore from backup if needed**:
   ```bash
   litestream restore -o /var/lib/app-recovered.db /var/lib/app.db
   ```

## Common Migration Issues

### Configuration Validation Errors

**Error**: `yaml: unmarshal errors`
**Solution**: Validate YAML syntax and check for unsupported options

### Missing Dependencies

**Error**: MCP server fails to start
**Solution**: Ensure all required ports are available and firewall rules permit access

### Permission Issues

**Error**: `permission denied` when accessing new replica locations  
**Solution**: Verify credentials and access permissions for new replica type

## Getting Help

### Migration Support

- **Documentation**: [Configuration Reference]({{< ref "/reference/config" >}})
- **Community**: [GitHub Discussions](https://github.com/benbjohnson/litestream/discussions)
- **Issues**: [Report migration problems](https://github.com/benbjohnson/litestream/issues)

### Professional Services

For complex migrations or production environments, consider:
- Reviewing migration plan with the community
- Testing in staging environment first
- Planning maintenance windows for critical systems

## Next Steps

After migration:

- [Enable MCP integration]({{< ref "/reference/mcp" >}})
- [Troubleshooting Guide]({{< ref "/docs/troubleshooting" >}})
- [Configuration Reference]({{< ref "/reference/config" >}})
