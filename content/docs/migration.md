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

### Upgrading to v0.5.0+

{{< since version="0.5.0" >}} includes MCP support and NATS replication.

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
# Download latest stable release (check https://github.com/benbjohnson/litestream/releases)
wget https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-v0.3.13-linux-amd64.tar.gz

# Extract and install
tar -xzf litestream-v0.3.13-linux-amd64.tar.gz
sudo mv litestream /usr/local/bin/
sudo chmod +x /usr/local/bin/litestream

# Verify installation
litestream version
```

### Upgrading from v0.3.x to v0.5.0+

#### Key Changes

1. **SQLite Driver Change**:
   - Migration from `mattn/go-sqlite3` (cgo-based) to `modernc.org/sqlite` (pure Go)
   - No cgo requirement for main binary (simpler builds, better cross-compilation)
   - **PRAGMA configuration syntax changed** (see [SQLite Driver Migration](#sqlite-driver-migration) below)

2. **Command Changes**:
   - `litestream wal` → `litestream ltx` (WAL command renamed to LTX)
   - New `mcp-addr` configuration option for Model Context Protocol support
   - NATS replica support with JetStream

3. **Configuration Changes**:
   - Single `replica` field replaces `replicas` array (backward compatible)
   - New global configuration sections: `levels`, `snapshot`, `exec`
   - Extended replica configuration options

#### Migration Steps

1. **Update configuration format**:

```yaml
# OLD FORMAT (still supported, but only with a single replica)
dbs:
  - path: /var/lib/app.db
    replicas:
      - url: s3://my-bucket/app
        retention: 72h

# NEW FORMAT (recommended)
dbs:
  - path: /var/lib/app.db
    replica:
      url: s3://my-bucket/app
      retention: 72h
```

1. **Override default settings**:

```yaml
# Add MCP support (disabled by default)
mcp-addr: ":3001"

# Override global snapshot configuration (defaults: interval=24h, retention=24h)
snapshot:
  interval: 24h
  retention: 168h

# Add level-based retention (no default levels configured)
levels:
  - interval: 1h
    retention: 24h
  - interval: 24h
    retention: 168h
```

1. **Update command usage**:

```bash
# OLD: Query WAL information
litestream wal /path/to/db.sqlite

# NEW: Query LTX information
litestream ltx /path/to/db.sqlite
```

1. **Restart services**:

```bash
# Restart Litestream with new configuration
sudo systemctl restart litestream

# Verify it's working
sudo systemctl status litestream
litestream databases
```

### Age Encryption Migration

{{< alert icon="⚠️" text="**Important**: Age encryption is not available in v0.5.0+. If you are upgrading from v0.3.x with Age encryption configured, your replica will be rejected with an explicit error message." >}}

#### Who is Affected

If you meet **any** of the following conditions, this section applies to you:

- Running v0.3.x with Age encryption enabled
- Have Age encryption configured in your `litestream.yml`
- Have existing Age-encrypted backups in S3, GCS, Azure, or other storage

#### Why Age Encryption Was Disabled

Age encryption was removed from v0.5.0+ as part of the LTX storage layer refactor. The core issue is that **Age encrypts entire files as a single unit**, which doesn't align with Litestream's new architecture.

Litestream's v0.5+ uses the LTX format which allows **per-page encryption** - the ability to fetch and decrypt individual pages from storage (S3, GCS, etc.) without needing the entire file. This is more efficient and provides better integration with cloud storage.

The feature was not maintained and has been disabled to prevent accidental data loss from misconfigured encryption (users believing their data was encrypted when it wasn't being encrypted at all).

#### Upgrade Options

Choose the option that best fits your situation:

#### Option 1: Stay on v0.3.x

If you need Age encryption, remain on v0.3.x until the feature is restored:

```bash
# Check your current version
litestream version

# If you've already upgraded to v0.5, downgrade to latest v0.3
wget https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-v0.3.13-linux-amd64.tar.gz
tar -xzf litestream-v0.3.13-linux-amd64.tar.gz
sudo mv litestream /usr/local/bin/
sudo systemctl restart litestream
```

#### Option 2: Upgrade to v0.5.0+ (Remove Age Encryption)

If you can migrate away from Age encryption:

1. **Validate your current backups are accessible**:

   ```bash
   litestream restore -o /tmp/test-restore.db /var/lib/app.db
   ```

2. **Remove Age encryption from configuration**:

   ```yaml
   # REMOVE this entire section from your litestream.yml
   age:
     identities:
       - /etc/litestream/age-identity.txt
     recipients:
       - age1xxxxxxxxxxxxx

   # Your replica should look like:
   replica:
     url: s3://my-bucket/app
     # No 'age' section
   ```

3. **Migrate existing encrypted backups** (optional):

   ```bash
   # Decrypt and restore from v0.3.x backup
   litestream restore -o /tmp/decrypted.db /var/lib/app.db

   # Stop replication
   sudo systemctl stop litestream

   # Delete old encrypted replica (careful!)
   # Example for S3:
   aws s3 rm s3://my-bucket/app --recursive

   # Update configuration and restart
   sudo systemctl start litestream
   ```

4. **Verify new backups are working**:

   ```bash
   # Wait a few minutes for replication to occur
   litestream databases

   # Test restore functionality
   litestream restore -o /tmp/verify.db /var/lib/app.db
   ```

#### Option 3: Use Unencrypted Backups Temporarily

While Age encryption is unavailable, use standard unencrypted replication:

```yaml
dbs:
  - path: /var/lib/app.db
    replica:
      url: s3://my-bucket/app
      retention: 72h
```

For encryption at rest, consider:

- S3 Server-Side Encryption (SSE-S3, SSE-KMS)
- Google Cloud Storage encryption
- Azure Blob Storage encryption
- Encrypted storage volumes at the provider level

#### Frequently Asked Questions

**Q: Will my v0.3.x Age-encrypted backups still work with v0.5?**

A: No. If you have v0.3.x Age-encrypted backups and try to restore with v0.5, the restore will fail because Age encryption is not available in v0.5. You must either stay on v0.3.x to restore the backups or decrypt them first while still on v0.3.x.

**Q: Do I need to re-encrypt existing backups?**

A: No, your existing v0.3.x Age-encrypted backups remain encrypted in storage. The issue only affects upgrading to v0.5.0+. If you stay on v0.3.x, your backups continue to work normally.

**Q: What if I'm already using Age encryption in production?**

A: Do not upgrade to v0.5.0+ at this time. Stay on v0.3.x. Monitor the [Litestream releases](https://github.com/benbjohnson/litestream/releases) page for updates on Age encryption restoration.

**Q: When will encryption be restored?**

A: Encryption support will be re-implemented **directly in the LTX format** to support per-page encryption. This is planned work but no timeline has been announced. The implementation is complex and requires careful design to work efficiently with cloud storage providers.

If you need encryption immediately, you can:

- Stay on v0.3.x with Age encryption
- Use provider-level encryption (S3 SSE-KMS, GCS encryption, Azure encryption, etc.)
- Use database-level encryption (SQLCipher)

See [issue #458](https://github.com/benbjohnson/litestream/issues/458) (LTX Support) for the tracking issue on encryption and other planned LTX features.

#### Validation Before Upgrading

Before upgrading to v0.5.0+, if you use Age encryption:

```bash
# Check if you have Age encryption in your config
grep -n "age:" /etc/litestream.yml

# If the above returns results, you MUST:
# 1. Stay on v0.3.x, OR
# 2. Remove Age encryption configuration before upgrading
```

### SQLite Driver Migration

{{< since version="0.5.0" >}} Litestream v0.5.0 migrated from [mattn/go-sqlite3](https://github.com/mattn/go-sqlite3) (cgo-based) to [modernc.org/sqlite](https://pkg.go.dev/modernc.org/sqlite) (pure Go). This change provides significant benefits but requires attention to PRAGMA configuration syntax.

#### Why This Change Was Made

The migration to `modernc.org/sqlite` provides several benefits:

- **No cgo requirement**: The main Litestream binary no longer requires a C compiler or cgo toolchain to build
- **Easier cross-compilation**: Build for any platform without complex cross-compilation toolchains
- **Signed macOS releases**: Enables automatic signing of Apple Silicon Mac releases
- **Simpler deployment**: No C library dependencies to manage

{{< alert icon="💡" text="The VFS feature (litestream-vfs) still uses cgo-based drivers for performance reasons and remains experimental." >}}

#### PRAGMA Configuration Changes

The most significant change is how PRAGMAs are configured in database connection strings. The `modernc.org/sqlite` driver uses a different syntax than `mattn/go-sqlite3`.

##### Syntax Comparison

| PRAGMA | mattn/go-sqlite3 (v0.3.x) | modernc.org/sqlite (v0.5.0+) |
|--------|---------------------------|------------------------------|
| busy_timeout | `?_busy_timeout=5000` | `?_pragma=busy_timeout(5000)` |
| journal_mode | `?_journal_mode=WAL` | `?_pragma=journal_mode(WAL)` |
| synchronous | `?_synchronous=NORMAL` | `?_pragma=synchronous(NORMAL)` |
| foreign_keys | `?_foreign_keys=1` | `?_pragma=foreign_keys(1)` |
| cache_size | `?_cache_size=2000` | `?_pragma=cache_size(2000)` |

##### Connection String Examples

**v0.3.x (mattn/go-sqlite3):**

```text
file:/path/to/db.sqlite?_busy_timeout=5000&_journal_mode=WAL&_synchronous=NORMAL
```

**v0.5.0+ (modernc.org/sqlite):**

```text
file:/path/to/db.sqlite?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)
```

##### Multiple PRAGMAs

The `_pragma` parameter can be specified multiple times:

```text
file:/path/to/db.sqlite?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=foreign_keys(1)
```

#### Impact on Litestream Users

For most Litestream users, this change is transparent. Litestream handles database connections internally and has been updated to use the new syntax. However, if you:

- **Use Litestream as a library**: Update your connection strings to use the new `_pragma=name(value)` syntax
- **Pass custom DSN options**: Review and update your database paths
- **Build Litestream from source**: Note that cgo is no longer required for the main binary

#### For Library Users

If you embed Litestream as a library and need to configure SQLite pragmas:

```go
// v0.3.x style (mattn/go-sqlite3) - NO LONGER WORKS
// dsn := "file:/path/to/db?_busy_timeout=5000"

// v0.5.0+ style (modernc.org/sqlite)
dsn := "file:/path/to/db?_pragma=busy_timeout(5000)"
```

#### Building from Source

v0.5.0+ simplifies the build process:

```bash
# v0.3.x required cgo
CGO_ENABLED=1 go build ./cmd/litestream

# v0.5.0+ does not require cgo for main binary
CGO_ENABLED=0 go build ./cmd/litestream
```

Cross-compilation is now straightforward:

```bash
# Build for Linux on macOS (or any platform)
GOOS=linux GOARCH=amd64 go build ./cmd/litestream
GOOS=linux GOARCH=arm64 go build ./cmd/litestream
GOOS=windows GOARCH=amd64 go build ./cmd/litestream
```

#### Driver Selection for Library Users

If you use Litestream as a library and need the cgo-based driver (for VFS support or performance testing):

```go
import (
    // Pure Go driver (default in v0.5.0+)
    _ "modernc.org/sqlite"

    // OR cgo-based driver (for VFS/experimental features)
    // _ "github.com/mattn/go-sqlite3"
)
```

Build tags control which driver is compiled:

```bash
# Default: modernc.org/sqlite
go build ./cmd/litestream

# VFS binary with mattn/go-sqlite3
go build -tags=cgo ./cmd/litestream-vfs
```

#### Common PRAGMA Reference

Here are commonly used PRAGMAs with the v0.5.0+ syntax:

```text
# Recommended production settings
?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)&_pragma=foreign_keys(1)

# Individual PRAGMAs:
_pragma=busy_timeout(5000)      # Wait 5 seconds for locks
_pragma=journal_mode(WAL)       # Write-ahead logging (required by Litestream)
_pragma=synchronous(NORMAL)     # Balance safety and performance
_pragma=foreign_keys(1)         # Enable foreign key constraints
_pragma=cache_size(-64000)      # 64MB cache (negative = KB)
_pragma=mmap_size(268435456)    # 256MB memory-mapped I/O
```

See the [SQLite PRAGMA documentation](https://www.sqlite.org/pragma.html) for the complete list.

#### Troubleshooting Driver Issues

**Error**: `unknown pragma` or PRAGMA not taking effect

**Solution**: Ensure you're using the `_pragma=name(value)` syntax, not the old `_name=value` syntax.

**Error**: Build failures with cgo errors

**Solution**: For v0.5.0+, you don't need cgo. Ensure `CGO_ENABLED=0` or simply don't set it (defaults work).

**Error**: Performance differences after upgrade

**Solution**: While `modernc.org/sqlite` is highly optimized, some workloads may see slight differences. If performance is critical, benchmark your specific use case. The pure Go implementation performs comparably to cgo for most workloads.

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
