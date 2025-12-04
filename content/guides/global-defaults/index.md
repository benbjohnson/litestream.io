---
title: "Global Replica Defaults"
date: 2025-12-03T00:00:00Z
layout: docs
menu:
  docs:
    parent: "replica-guides"
weight: 350
---

{{< since version="0.5.0" >}} Global replica defaults eliminate configuration
duplication by allowing you to set default settings at the top level of your
configuration file. These defaults are automatically inherited by all replicas
while still allowing per-replica overrides.

## Overview

When managing multiple databases with Litestream, you often need the same
credentials, regions, and timing settings across all replicas. Previously, this
required duplicating settings for each database entry. Global defaults solve
this by letting you define shared settings once.

### Before: Verbose configuration with duplication

```yaml
dbs:
  - path: /db1.sqlite
    replica:
      type: s3
      access-key-id: AKIAxxxxxxxxxxxxxxxx
      secret-access-key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/xxxxxxxxx
      region: us-west-2
      endpoint: custom.endpoint.com
      retention: 168h
      bucket: bucket1

  - path: /db2.sqlite
    replica:
      type: s3
      access-key-id: AKIAxxxxxxxxxxxxxxxx      # duplicated
      secret-access-key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/xxxxxxxxx   # duplicated
      region: us-west-2           # duplicated
      endpoint: custom.endpoint.com # duplicated
      retention: 168h             # duplicated
      bucket: bucket2
```

### After: Clean configuration with global defaults

```yaml
# Global defaults inherited by all replicas
access-key-id: AKIAxxxxxxxxxxxxxxxx
secret-access-key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/xxxxxxxxx
region: us-west-2
endpoint: custom.endpoint.com
retention: 168h

dbs:
  - path: /db1.sqlite
    replica:
      type: s3
      bucket: bucket1

  - path: /db2.sqlite
    replica:
      type: s3
      bucket: bucket2
```

## Supported Global Settings

Global defaults support settings across all replica types. Settings are applied
to replicas where they are relevant.

### Universal Settings

These settings apply to all replica types:

| Setting | Description | Default |
|---------|-------------|---------|
| `sync-interval` | How often to push frames to replica | `1s` |
| `validation-interval` | How often to validate replica integrity | disabled |
| `retention` | How long to keep snapshots and LTX files | `24h` |
| `retention-check-interval` | How often to check retention | `1h` |
| `snapshot-interval` | How often to create new snapshots | matches retention |

### S3 and S3-Compatible Settings

These settings apply to S3, Backblaze B2, DigitalOcean Spaces, and other
S3-compatible services:

| Setting | Description |
|---------|-------------|
| `access-key-id` | AWS access key or equivalent |
| `secret-access-key` | AWS secret key or equivalent |
| `region` | Bucket region |
| `endpoint` | Custom endpoint URL for S3-compatible services |
| `bucket` | Default bucket name |
| `force-path-style` | Use path-style URLs instead of virtual-hosted |
| `skip-verify` | Disable TLS verification |

### Azure Blob Storage Settings

| Setting | Description |
|---------|-------------|
| `account-name` | Azure storage account name |
| `account-key` | Azure storage account key |

### SFTP Settings

| Setting | Description |
|---------|-------------|
| `host` | SFTP server hostname and port |
| `user` | Username for authentication |
| `password` | Password for authentication |
| `key-path` | Path to SSH private key file |
| `concurrent-writes` | Number of concurrent upload operations |

### NATS JetStream Settings

| Setting | Description |
|---------|-------------|
| `jwt` | JWT token for NATS 2.0 authentication |
| `seed` | Seed for NATS 2.0 authentication |
| `creds` | Path to NATS credentials file |
| `nkey` | NKey for signature-based authentication |
| `username` | Username for basic authentication |
| `password` | Password for basic authentication |
| `token` | Token for simple authentication |
| `tls` | Enable TLS encryption |
| `root-cas` | List of CA certificate file paths |
| `client-cert` | Client certificate for mutual TLS |
| `client-key` | Client private key for mutual TLS |
| `max-reconnects` | Maximum reconnection attempts |
| `reconnect-wait` | Wait time between reconnection attempts |
| `timeout` | Connection timeout |

### Age Encryption Settings

| Setting | Description |
|---------|-------------|
| `age.identities` | List of age secret keys or identity file paths |
| `age.recipients` | List of age public keys |

## Override Behavior

Individual replicas can override any global default. Per-replica settings always
take precedence over global defaults.

```yaml
# Global defaults
region: us-west-2
retention: 168h
sync-interval: 30s

dbs:
  # This replica uses all global defaults
  - path: /db1.sqlite
    replica:
      type: s3
      bucket: bucket1

  # This replica overrides region but keeps other defaults
  - path: /db2.sqlite
    replica:
      type: s3
      bucket: bucket2
      region: us-east-1  # Overrides global region

  # This replica overrides multiple settings
  - path: /db3.sqlite
    replica:
      type: s3
      bucket: bucket3
      region: eu-west-1
      retention: 720h    # 30 days instead of 7
      sync-interval: 1s  # More frequent sync
```

## Multi-Replica-Type Configuration

Global defaults work seamlessly when you have databases replicating to different
storage backends. Each replica type uses the global settings relevant to it.

```yaml
# Global settings apply to appropriate replica types
access-key-id: AKIAxxxxxxxxxxxxxxxx       # Used by S3 replicas
secret-access-key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/xxxxxxxxx
account-name: myazureaccount              # Used by ABS replicas
account-key: ${AZURE_ACCOUNT_KEY}
host: backup.example.com:22               # Used by SFTP replicas
user: backupuser
sync-interval: 1m                         # Used by all replicas
retention: 168h                           # Used by all replicas

dbs:
  # S3 replica uses access-key-id, secret-access-key, sync-interval, retention
  - path: /app1.sqlite
    replica:
      type: s3
      bucket: s3-backups

  # ABS replica uses account-name, account-key, sync-interval, retention
  - path: /app2.sqlite
    replica:
      type: abs
      bucket: azure-container

  # SFTP replica uses host, user, sync-interval, retention
  - path: /app3.sqlite
    replica:
      type: sftp
      path: /backup/app3
      key-path: /etc/litestream/sftp_key
```

## Common Use Cases

### Multi-Tenant Deployments

For applications managing multiple tenant databases with shared infrastructure:

```yaml
access-key-id: ${AWS_ACCESS_KEY_ID}
secret-access-key: ${AWS_SECRET_ACCESS_KEY}
region: us-west-2
retention: 720h        # 30 days
sync-interval: 10s

dbs:
  - path: /data/tenant1.db
    replica:
      type: s3
      bucket: backups
      path: tenant1

  - path: /data/tenant2.db
    replica:
      type: s3
      bucket: backups
      path: tenant2

  - path: /data/tenant3.db
    replica:
      type: s3
      bucket: backups
      path: tenant3
```

### Development and Production Environments

Use environment variables with global defaults for environment-specific
configuration:

```yaml
access-key-id: ${LITESTREAM_ACCESS_KEY_ID}
secret-access-key: ${LITESTREAM_SECRET_ACCESS_KEY}
region: ${LITESTREAM_REGION}
endpoint: ${LITESTREAM_ENDPOINT}  # Empty in production, set for local MinIO

dbs:
  - path: /var/lib/app.db
    replica:
      type: s3
      bucket: ${LITESTREAM_BUCKET}
```

### Global Encryption

Apply encryption consistently across all replicas:

```yaml
age:
  identities:
    - /etc/litestream/age-identity.txt
  recipients:
    - age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

retention: 168h
sync-interval: 1s

dbs:
  - path: /db1.sqlite
    replica:
      type: s3
      bucket: encrypted-backups
      path: db1

  - path: /db2.sqlite
    replica:
      type: s3
      bucket: encrypted-backups
      path: db2
```

## Best Practices

### Use environment variables for credentials

Avoid hardcoding credentials in configuration files:

```yaml
access-key-id: ${AWS_ACCESS_KEY_ID}
secret-access-key: ${AWS_SECRET_ACCESS_KEY}
```

### Keep replica-specific settings with the replica

Settings like `bucket` and `path` that are unique to each replica should remain
in the replica configuration:

```yaml
# Good: Shared settings are global
region: us-west-2
retention: 168h

dbs:
  - path: /db1.sqlite
    replica:
      type: s3
      bucket: bucket1   # Unique to this replica
      path: db1         # Unique to this replica
```

### Document your configuration

When using global defaults, add comments to clarify which settings are global
and why:

```yaml
# Global S3 settings for all database replicas
# All databases use the same AWS account and region
access-key-id: ${AWS_ACCESS_KEY_ID}
secret-access-key: ${AWS_SECRET_ACCESS_KEY}
region: us-west-2

# Global timing settings
# 7-day retention with hourly sync
retention: 168h
sync-interval: 1h

dbs:
  # ...
```

## Backward Compatibility

Existing Litestream configurations continue to work unchanged. Global defaults
are purely additive. If you have per-replica settings defined, they continue to
take precedence.

The legacy `replicas:` array format also continues to work, though single
`replica` configuration is recommended for new deployments.

## Troubleshooting

### Verifying global defaults are applied

Run Litestream with debug logging to see resolved configuration:

```sh
litestream replicate -config /etc/litestream.yml -log-level debug
```

### Understanding override precedence

Settings are applied in this order (later values override earlier):

1. Built-in defaults
2. Global configuration settings
3. Per-replica settings

### Common mistakes

**Missing type field**: When using global defaults, ensure each replica still
specifies its `type` or uses a `url` that implies the type:

```yaml
# Wrong: No type specified
dbs:
  - path: /db.sqlite
    replica:
      bucket: mybucket

# Correct: Type specified
dbs:
  - path: /db.sqlite
    replica:
      type: s3
      bucket: mybucket

# Also correct: URL implies type
dbs:
  - path: /db.sqlite
    replica:
      url: s3://mybucket/db
```
