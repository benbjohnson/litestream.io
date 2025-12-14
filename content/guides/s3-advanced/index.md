---
title: "S3 Advanced Configuration"
date: 2025-12-03T00:00:00Z
layout: docs
menu:
  docs:
    parent: "replica-guides"
weight: 405
---

This guide covers advanced S3 configuration options for tuning multipart upload
performance. These settings control how Litestream uploads data to S3 and
S3-compatible storage services.

{{< since version="0.5.0" >}} Part size and concurrency configuration options
were added in Litestream v0.5.0.

## Overview

When Litestream uploads files to S3, it uses multipart uploads for efficient
data transfer. Two key settings control this behavior:

- **Part Size**: The size of each chunk uploaded to S3
- **Concurrency**: The number of parts uploaded simultaneously

Understanding these settings helps you optimize performance for your specific
network conditions, storage provider, and resource constraints.

## Configuration Options

### Part Size

The `part-size` field controls the size of each part in multipart uploads.
Litestream accepts human-readable size strings.

```yaml
dbs:
  - path: /path/to/db
    replica:
      type: s3
      bucket: mybucket
      path: db
      part-size: 10MB
```

**Supported formats:**

- Bytes: `5242880` (numeric value in bytes)
- Kilobytes: `5120KB` or `5120K`
- Megabytes: `5MB` or `5M`
- Gigabytes: `1GB` or `1G`
- Decimal values: `1.5MB`

**Defaults and limits:**

| Setting | Value |
|---------|-------|
| Default | 5 MiB (AWS SDK default) |
| Minimum | 5 MiB (S3 requirement) |
| Maximum | 5 GiB |

The final part of an upload may be smaller than the minimum size.

### Concurrency

The `concurrency` field controls how many parts are uploaded in parallel.

```yaml
dbs:
  - path: /path/to/db
    replica:
      type: s3
      bucket: mybucket
      path: db
      concurrency: 10
```

**Defaults:**

| Setting | Value |
|---------|-------|
| Default | 5 concurrent uploads |

## Provider Requirements

Different S3-compatible providers have specific requirements for multipart
uploads.

### AWS S3

AWS S3 uses the standard multipart upload limits:

- Minimum part size: 5 MiB
- Maximum part size: 5 GiB
- Maximum parts per upload: 10,000

The default settings work well for most AWS S3 use cases.

### Backblaze B2

Backblaze B2's S3-compatible API requires a **minimum part size of 5 MB**.
The defaults work correctly, but if you customize the part size, ensure it
meets this minimum.

```yaml
dbs:
  - path: /path/to/db
    replica:
      type: s3
      bucket: mybucket
      path: db
      endpoint: s3.us-west-000.backblazeb2.com
      force-path-style: true
      part-size: 10MB  # Must be >= 5MB for B2
```

Backblaze recommends 100 MB part sizes for optimal performance with large files.

### MinIO

MinIO follows standard S3 multipart upload limits. The default settings work
without modification.

### Other S3-Compatible Services

Check your provider's documentation for specific multipart upload requirements.
Most services follow the standard S3 limits (5 MiB minimum part size).

## Performance Tuning

### When to Increase Part Size

Larger part sizes may improve performance when:

- You have high bandwidth and low latency connections
- You're uploading large database snapshots
- You want to reduce the total number of API requests (cost savings)

```yaml
part-size: 50MB
```

### When to Decrease Part Size

Smaller part sizes may be beneficial when:

- You have unreliable network connections (smaller retries on failure)
- Memory is constrained
- You want faster feedback on upload progress

Note: You cannot go below 5 MiB due to S3's minimum requirement.

### When to Increase Concurrency

Higher concurrency improves throughput when:

- You have high bandwidth connections
- Network latency is high (parallel uploads hide latency)
- You're not CPU or memory constrained

```yaml
concurrency: 10
```

### When to Decrease Concurrency

Lower concurrency may be appropriate when:

- Memory is limited (each concurrent part uses memory)
- CPU resources are constrained
- You want to limit network bandwidth usage

```yaml
concurrency: 2
```

## Configuration Examples

### High-Performance Configuration

For servers with fast network connections and ample resources:

```yaml
dbs:
  - path: /path/to/db
    replica:
      type: s3
      bucket: mybucket
      path: db
      part-size: 50MB
      concurrency: 10
```

### Resource-Constrained Configuration

For embedded devices or containers with limited memory:

```yaml
dbs:
  - path: /path/to/db
    replica:
      type: s3
      bucket: mybucket
      path: db
      part-size: 5MB
      concurrency: 2
```

### Backblaze B2 Optimized

Following Backblaze's recommendations for optimal performance:

```yaml
dbs:
  - path: /path/to/db
    replica:
      type: s3
      bucket: mybucket
      path: db
      endpoint: s3.us-west-000.backblazeb2.com
      force-path-style: true
      part-size: 100MB
      concurrency: 5
```

## Cost Considerations

Part size affects the number of API requests made to your storage provider:

- **Larger parts** = fewer PUT requests = lower request costs
- **Smaller parts** = more PUT requests = higher request costs

For high-volume databases with frequent syncs, consider larger part sizes to
reduce the total number of API calls.

## Troubleshooting

### Upload Failures with Small Part Size

If you see errors about part size being too small, ensure your `part-size`
is at least 5 MiB:

```yaml
part-size: 5MB  # Minimum allowed
```

### Memory Issues

If Litestream uses too much memory during uploads, reduce concurrency:

```yaml
concurrency: 2
```

Each concurrent upload buffers a part in memory before sending.

### Slow Uploads

For slow uploads, try:

1. Increasing concurrency to better utilize bandwidth:

   ```yaml
   concurrency: 10
   ```

2. Adjusting part size based on your network conditions

### Provider-Specific Errors

If you receive errors from your storage provider about invalid part sizes,
verify you meet their minimum requirements. Backblaze B2 and some other
providers have a strict 5 MB minimum.


## See Also

- [Replicating to Amazon S3](/guides/s3) - Basic S3 setup guide
- [S3-Compatible Services](/guides/s3-compatible) - Other S3-compatible providers
- [Troubleshooting](/docs/troubleshooting) - Common issues and solutions
- [Configuration Reference](/reference/config) - Complete configuration options
