---
title: "AWS SDK v2 Migration"
date: 2025-12-04T00:00:00Z
layout: docs
menu:
  docs:
    parent: "replica-guides"
weight: 401
---

Litestream v0.5.0 uses [AWS SDK for Go v2][aws-sdk-v2] for all S3 operations.
This upgrade brings improved performance, better reliability, and enhanced
configuration options while maintaining full backward compatibility with
existing configurations.

[aws-sdk-v2]: https://aws.github.io/aws-sdk-go-v2/

## What Changed?

The upgrade from AWS SDK v1 to v2 introduces several improvements:

- **Connection pooling** reduces latency for subsequent requests
- **Adaptive retry mode** with up to 10 attempts for better resilience
- **CRC32 checksum validation** ensures data integrity automatically
- **Modern credential chain** with improved IAM role support
- **24-hour HTTP timeout** for long-running operations on large databases
- **Configurable multipart uploads** for better upload performance

## Backward Compatibility

All existing Litestream configurations continue to work without modification.
The SDK upgrade is transparent to users with standard configurations.

### What Still Works

- Environment variable authentication (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
- Configuration file credentials (`access-key-id`, `secret-access-key`)
- IAM roles on EC2, ECS, and Lambda
- S3-compatible storage providers (MinIO, DigitalOcean Spaces, Backblaze B2)
- All existing replica URL formats

## New Configuration Options

{{< since version="0.5.0" >}} The following configuration options are new in v0.5.0:

### Multipart Upload Settings

For large databases, you can tune multipart upload behavior:

```yaml
dbs:
  - path: /var/lib/db
    replica:
      type: s3
      bucket: mybucket
      path: mydb
      region: us-east-1
      part-size: 10485760    # 10MB per part (default: 5MB)
      concurrency: 10        # Concurrent part uploads (default: 5)
```

- **`part-size`** — Size of each part in multipart uploads in bytes. Minimum is
  5MB (5242880 bytes). Larger parts can improve throughput for high-bandwidth
  connections.

- **`concurrency`** — Number of concurrent parts to upload. Higher values use
  more memory but can improve upload speed.

**Memory considerations:** Multipart uploads buffer data in memory. Required
memory is approximately `part-size × concurrency`. For example, 10MB parts with
10 concurrent uploads requires ~100MB of memory.

## Authentication

The SDK v2 credential chain looks for credentials in this order:

1. Explicit credentials in configuration file
2. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
3. Shared credentials file (`~/.aws/credentials`)
4. Shared config file (`~/.aws/config`)
5. ECS task IAM role
6. EC2 instance IAM role

### IAM Roles (Recommended)

When running on AWS infrastructure, the SDK automatically uses IAM roles:

```yaml
dbs:
  - path: /var/lib/db
    replica:
      url: s3://mybucket/mydb
      region: us-east-1
      # No credentials needed - uses IAM role
```

### Environment Variables

```sh
export AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxxxxx
export AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/xxxxxxxxx
export AWS_REGION=us-east-1
```

### Configuration File

Per-replica credentials:

```yaml
dbs:
  - path: /var/lib/db
    replica:
      url: s3://mybucket/mydb
      region: us-east-1
      access-key-id: AKIAxxxxxxxxxxxxxxxx
      secret-access-key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/xxxxxxxxx
```

Global credentials:

```yaml
access-key-id: AKIAxxxxxxxxxxxxxxxx
secret-access-key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/xxxxxxxxx

dbs:
  - path: /var/lib/db
    replica:
      url: s3://mybucket/mydb
```

## Performance Improvements

### Connection Pooling

SDK v2 maintains a pool of HTTP connections, eliminating connection setup
overhead for subsequent requests. This is especially beneficial during
continuous replication.

### Adaptive Retry Mode

The SDK uses adaptive retry mode with up to 10 attempts. This automatically
handles transient failures with exponential backoff, improving reliability
during network issues or service throttling.

### Checksum Validation

All uploads automatically include CRC32 checksums. S3 validates these during
upload, ensuring data integrity without additional configuration.

## Troubleshooting

### Timeout Errors

Large database operations may require extended timeouts. Litestream uses a
24-hour HTTP timeout by default, but very large databases or slow connections
may still encounter issues.

If you see timeout errors, verify:

- Network connectivity to S3 endpoint
- Bucket region matches your configuration
- No firewall blocking long-lived connections

### Region Detection Issues

If the SDK can't determine the bucket region:

```yaml
dbs:
  - path: /var/lib/db
    replica:
      url: s3://mybucket/mydb
      region: us-east-1  # Explicitly specify
```

### Multipart Upload Failures

For large databases with upload failures:

```yaml
dbs:
  - path: /var/lib/db
    replica:
      url: s3://mybucket/mydb
      part-size: 10485760  # Increase to 10MB
      concurrency: 3       # Reduce concurrent uploads
```

Reducing concurrency can help on constrained networks. Increasing part size
reduces the total number of parts (S3 limits uploads to 10,000 parts).

### S3-Compatible Services

When using S3-compatible services like MinIO, you may see checksum warnings.
Some services don't fully implement AWS checksum features. These warnings are
informational and don't indicate data corruption.

## Breaking Changes

There are no breaking changes. All v0.3.x configurations work with v0.5.0
without modification.

## References

- [AWS SDK for Go v2 Documentation][aws-sdk-v2]
- [Amazon S3 Guide](/guides/s3)
- [Configuration Reference](/reference/config)
