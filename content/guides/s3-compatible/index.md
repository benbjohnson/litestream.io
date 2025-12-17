---
title: "Replicating to S3-Compatible Services"
date: 2025-12-04T00:00:00Z
layout: docs
menu:
  docs:
    parent: "replica-guides"
weight: 410
---

This guide covers how to use Litestream with S3-compatible storage providers
beyond Amazon S3. Many cloud providers and self-hosted solutions implement the
S3 API, allowing you to use Litestream's S3 replica type with minimal
configuration changes.

## Automatic Provider Detection

**New in v0.5.0:** Litestream automatically detects S3-compatible providers based
on the endpoint URL and configures the appropriate settings. This eliminates
the need to manually specify options like `force-path-style` or `sign-payload`
for most providers.

| Provider | Endpoint Pattern | Auto-detected Settings |
|----------|------------------|----------------------|
| Backblaze B2 | `*.backblazeb2.com` | `sign-payload: true`, `force-path-style: true` |
| Filebase | `*.filebase.com` | `sign-payload: true`, `force-path-style: true` |
| MinIO | `*.minio.*` | `sign-payload: true`, `force-path-style: true` |
| DigitalOcean Spaces | `*.digitaloceanspaces.com` | `sign-payload: true` |
| Scaleway | `*.scw.cloud` | `sign-payload: true` |
| Cloudflare R2 | `*.r2.cloudflarestorage.com` | `sign-payload: true` |
| Tigris | `*.tigris.dev` | `sign-payload: true`, consistency header |

Auto-detection means you can use simpler configurations without worrying about
provider-specific quirks. The provider examples below show configurations that
work with both older Litestream versions and v0.5.0+. If you're using v0.5.0+,
you can omit the `force-path-style` setting for auto-detected providers.

## Overview

S3-compatible services implement Amazon's S3 API, enabling tools built for AWS
S3 to work with alternative storage providers. Litestream supports these
services through the `endpoint` configuration option, which redirects API
requests to your chosen provider.

Key benefits of S3-compatible storage:

- **Cost savings**: Many providers offer lower prices than AWS S3
- **Data sovereignty**: Choose where your data is stored
- **No vendor lock-in**: Switch providers without changing your workflow
- **Self-hosted options**: Run your own object storage with MinIO

## Configuration Methods

You can configure S3-compatible replicas using either URL parameters or explicit
configuration fields.

### URL Format with Endpoint Parameter

The simplest approach uses the `endpoint` query parameter in the replica URL:

```yaml
dbs:
  - path: /path/to/db
    replica:
      url: s3://mybucket/db?endpoint=s3.us-west-1.wasabisys.com
      access-key-id: ${ACCESS_KEY}
      secret-access-key: ${SECRET_KEY}
```

### Explicit Configuration Fields

For more control, specify each field separately:

```yaml
dbs:
  - path: /path/to/db
    replica:
      type: s3
      bucket: mybucket
      path: db
      endpoint: s3.us-west-1.wasabisys.com
      region: us-west-1
      access-key-id: ${ACCESS_KEY}
      secret-access-key: ${SECRET_KEY}
```

### Default HTTPS Behavior

Litestream uses HTTPS by default when connecting to endpoints. If your endpoint
URL doesn't include a scheme, HTTPS is assumed:

```yaml
# These are equivalent:
endpoint: s3.provider.com
endpoint: https://s3.provider.com
```

For local development with HTTP (not recommended for production):

```yaml
endpoint: http://localhost:9000
```

## Provider-Specific Configuration

Each S3-compatible provider has unique requirements. The sections below provide
configuration examples and notes for popular providers.

### MinIO

[MinIO](https://min.io/) is a high-performance, self-hosted object storage
server. It's ideal for development, testing, or running your own S3-compatible
infrastructure.

**Configuration:**

```yaml
dbs:
  - path: /path/to/db
    replica:
      type: s3
      bucket: mybucket
      path: db
      endpoint: https://minio.example.com:9000
      region: us-east-1
      access-key-id: ${MINIO_ACCESS_KEY}
      secret-access-key: ${MINIO_SECRET_KEY}
```

**Notes:**

- Create access keys in the MinIO Console before configuring Litestream
- The `region` field is required but MinIO ignores the value; use `us-east-1`
- For self-signed certificates, add `skip-verify: true` (not for production)
- Default credentials for new installations are `minioadmin`/`minioadmin`

See the [Configuration Reference](/reference/config/#minio-configuration) for
detailed MinIO setup instructions.

### Backblaze B2

[Backblaze B2](https://www.backblaze.com/cloud-storage) offers affordable cloud
storage with S3-compatible API access. B2 charges only for storage and downloads,
with free uploads.

**Configuration:**

```yaml
access-key-id: ${B2_KEY_ID}
secret-access-key: ${B2_APPLICATION_KEY}

dbs:
  - path: /path/to/db
    replica:
      type: s3
      bucket: my-bucket
      path: db
      endpoint: s3.us-west-004.backblazeb2.com
      region: us-west-004
      force-path-style: true
```

**Notes:**

- Endpoint format: `s3.<region>.backblazeb2.com`
- The `region` must match your bucket's region exactly
- **Litestream v0.5.0+** automatically detects B2 and sets `force-path-style: true`
  and `sign-payload: true`; you can omit these settings
- For older versions, set `force-path-style: true` manually
- Create application keys with access limited to specific buckets for security
- B2 requires minimum 5 MB part sizes for multipart uploads (Litestream default)

See the [Backblaze B2 Guide](/guides/backblaze/) for detailed setup instructions.

### Wasabi

[Wasabi](https://wasabi.com/) provides S3-compatible storage with no egress fees
and predictable pricing.

**Configuration:**

```yaml
dbs:
  - path: /path/to/db
    replica:
      type: s3
      bucket: mybucket
      path: db
      endpoint: s3.us-east-1.wasabisys.com
      region: us-east-1
      access-key-id: ${WASABI_ACCESS_KEY}
      secret-access-key: ${WASABI_SECRET_KEY}
```

**Regional Endpoints:**

| Region | Endpoint |
|--------|----------|
| US East 1 (N. Virginia) | `s3.us-east-1.wasabisys.com` |
| US East 2 (N. Virginia) | `s3.us-east-2.wasabisys.com` |
| US West 1 (Oregon) | `s3.us-west-1.wasabisys.com` |
| EU Central 1 (Amsterdam) | `s3.eu-central-1.wasabisys.com` |
| EU Central 2 (Frankfurt) | `s3.eu-central-2.wasabisys.com` |
| EU West 1 (London) | `s3.eu-west-1.wasabisys.com` |
| EU West 2 (Paris) | `s3.eu-west-2.wasabisys.com` |
| AP Northeast 1 (Tokyo) | `s3.ap-northeast-1.wasabisys.com` |
| AP Northeast 2 (Osaka) | `s3.ap-northeast-2.wasabisys.com` |
| AP Southeast 1 (Singapore) | `s3.ap-southeast-1.wasabisys.com` |
| AP Southeast 2 (Sydney) | `s3.ap-southeast-2.wasabisys.com` |

**Notes:**

- Use the endpoint matching your bucket's region
- Wasabi is 100% S3 API compatible
- No egress fees make it cost-effective for frequent restores

### Cloudflare R2

[Cloudflare R2](https://developers.cloudflare.com/r2/) provides S3-compatible
object storage with zero egress fees and global distribution.

**Configuration:**

```yaml
dbs:
  - path: /path/to/db
    replica:
      type: s3
      bucket: mybucket
      path: db
      endpoint: ${CF_ACCOUNT_ID}.r2.cloudflarestorage.com
      region: auto
      access-key-id: ${R2_ACCESS_KEY}
      secret-access-key: ${R2_SECRET_KEY}
```

**Notes:**

- Find your Account ID in the Cloudflare dashboard under R2
- Region should be set to `auto` (or `us-east-1` for compatibility)
- Create API tokens in the R2 section with "Object Read & Write" permissions
- R2 supports both path-style and virtual-hosted style addressing
- Jurisdiction-specific endpoints available for EU data residency:
  `${ACCOUNT_ID}.eu.r2.cloudflarestorage.com`

### DigitalOcean Spaces

[DigitalOcean Spaces](https://www.digitalocean.com/products/spaces/) provides
simple, scalable object storage with a CDN included.

**Configuration:**

```yaml
dbs:
  - path: /path/to/db
    replica:
      type: s3
      bucket: my-space
      path: db
      endpoint: nyc3.digitaloceanspaces.com
      region: nyc3
      access-key-id: ${DO_SPACES_KEY}
      secret-access-key: ${DO_SPACES_SECRET}
```

**Regional Endpoints:**

| Region | Endpoint |
|--------|----------|
| New York 3 | `nyc3.digitaloceanspaces.com` |
| San Francisco 3 | `sfo3.digitaloceanspaces.com` |
| Amsterdam 3 | `ams3.digitaloceanspaces.com` |
| Singapore 1 | `sgp1.digitaloceanspaces.com` |
| Frankfurt 1 | `fra1.digitaloceanspaces.com` |
| Sydney 1 | `syd1.digitaloceanspaces.com` |

**Notes:**

- Generate Spaces access keys in the API section of the DigitalOcean console
- Connection resets may appear in logs; Litestream handles these automatically

See the [DigitalOcean Spaces Guide](/guides/digitalocean/) for detailed setup.

### Linode Object Storage

[Linode Object Storage](https://www.linode.com/products/object-storage/)
provides S3-compatible storage across multiple regions.

**Configuration:**

```yaml
dbs:
  - path: /path/to/db
    replica:
      type: s3
      bucket: mybucket
      path: db
      endpoint: us-east-1.linodeobjects.com
      region: us-east-1
      access-key-id: ${LINODE_ACCESS_KEY}
      secret-access-key: ${LINODE_SECRET_KEY}
```

**Regional Endpoints:**

| Region | Endpoint |
|--------|----------|
| Newark, NJ | `us-east-1.linodeobjects.com` |
| Atlanta, GA | `us-southeast-1.linodeobjects.com` |
| Dallas, TX | `us-central-1.linodeobjects.com` |
| Frankfurt, DE | `eu-central-1.linodeobjects.com` |
| Singapore, SG | `ap-south-1.linodeobjects.com` |

See the [Linode Guide](/guides/linode/) for detailed setup instructions.

### OCI Object Storage

[Oracle Cloud Infrastructure Object Storage](https://docs.oracle.com/en-us/iaas/Content/Object/home.htm)
provides S3-compatible API access to OCI buckets.

**Configuration:**

```yaml
dbs:
  - path: /path/to/db
    replica:
      type: s3
      bucket: mybucket
      path: db
      endpoint: ${OCI_NAMESPACE}.compat.objectstorage.${OCI_REGION}.oraclecloud.com
      region: us-east-1
      access-key-id: ${OCI_ACCESS_KEY}
      secret-access-key: ${OCI_SECRET_KEY}
```

**Notes:**

- Find your namespace in the OCI Console under Tenancy Details
- Create Customer Secret Keys for S3 compatibility (not standard API keys)
- Set region to `us-east-1` or leave blank if your client doesn't support OCI
  region identifiers
- Endpoint format includes your namespace:
  `<namespace>.compat.objectstorage.<region>.oraclecloud.com`

**Example Endpoints:**

- US Phoenix: `<namespace>.compat.objectstorage.us-phoenix-1.oraclecloud.com`
- US Ashburn: `<namespace>.compat.objectstorage.us-ashburn-1.oraclecloud.com`
- EU Frankfurt: `<namespace>.compat.objectstorage.eu-frankfurt-1.oraclecloud.com`

### Vultr Object Storage

[Vultr Object Storage](https://www.vultr.com/products/object-storage/) provides
S3-compatible storage with simple, predictable pricing (no API request charges).

**Configuration:**

```yaml
dbs:
  - path: /path/to/db
    replica:
      type: s3
      bucket: mybucket
      path: db
      endpoint: ewr1.vultrobjects.com
      region: ewr1
      access-key-id: ${VULTR_ACCESS_KEY}
      secret-access-key: ${VULTR_SECRET_KEY}
```

**Regional Endpoints:**

| Region | Endpoint |
|--------|----------|
| New Jersey | `ewr1.vultrobjects.com` |
| Los Angeles | `lax1.vultrobjects.com` |
| Singapore | `sgp1.vultrobjects.com` |
| Amsterdam | `ams1.vultrobjects.com` |
| Bangalore | `blr1.vultrobjects.com` |
| Delhi NCR | `del1.vultrobjects.com` |
| Honolulu | `hnl1.vultrobjects.com` |

**Notes:**

- No charges for API requests, only storage and egress
- HTTPS required for all connections
- Virtual-hosted style addressing preferred

### Scaleway Object Storage

[Scaleway Object Storage](https://www.scaleway.com/en/object-storage/) provides
S3-compatible storage in European data centers.

**Configuration:**

```yaml
dbs:
  - path: /path/to/db
    replica:
      type: s3
      bucket: mybucket
      path: db
      endpoint: s3.fr-par.scw.cloud
      region: fr-par
      access-key-id: ${SCW_ACCESS_KEY}
      secret-access-key: ${SCW_SECRET_KEY}
```

**Regional Endpoints:**

| Region | Endpoint |
|--------|----------|
| Paris | `s3.fr-par.scw.cloud` |
| Amsterdam | `s3.nl-ams.scw.cloud` |
| Warsaw | `s3.pl-waw.scw.cloud` |

See the [Scaleway Guide](/guides/scaleway/) for detailed setup instructions.

### Tigris (Fly.io)

[Tigris](https://www.tigrisdata.com/) is Fly.io's globally distributed
S3-compatible object storage with automatic geographic distribution and
CDN-like caching.

**Configuration:**

```yaml
dbs:
  - path: /path/to/db
    replica:
      type: s3
      bucket: mybucket
      path: db
      endpoint: fly.storage.tigris.dev
      region: auto
      access-key-id: ${TIGRIS_ACCESS_KEY}
      secret-access-key: ${TIGRIS_SECRET_KEY}
```

**Notes:**

- Litestream v0.5.0+ automatically detects Tigris and configures required settings
- Region should be set to `auto`
- Objects are automatically distributed globally and cached near requesters
- Create buckets using `fly storage create` via the Fly CLI

See the [Tigris Guide](/guides/tigris/) for detailed setup instructions.

### Filebase

[Filebase](https://filebase.com/) provides S3-compatible access to decentralized
storage networks including IPFS and Sia.

**Configuration:**

```yaml
dbs:
  - path: /path/to/db
    replica:
      type: s3
      bucket: mybucket
      path: db
      endpoint: s3.filebase.com
      region: us-east-1
      access-key-id: ${FILEBASE_ACCESS_KEY}
      secret-access-key: ${FILEBASE_SECRET_KEY}
```

**Notes:**

- Single global endpoint: `s3.filebase.com`
- Region must be set to `us-east-1`
- Only supports AWS Signature Version 4
- Rate limit of 100 requests per second
- Provides decentralized storage with IPFS pinning

## Provider Compatibility Matrix

The following table summarizes configuration requirements for each provider.
Providers marked with ✓ in the "Auto-detected" column have their settings
automatically configured in Litestream v0.5.0+ based on the endpoint URL.

| Provider | Endpoint Required | Region | force-path-style | Auto-detected |
|----------|-------------------|--------|------------------|---------------|
| AWS S3 | No | Yes | No | — |
| MinIO | Yes | Optional | Auto | ✓ |
| Backblaze B2 | Yes | Yes | Auto | ✓ |
| Wasabi | Yes | Yes | No | — |
| Cloudflare R2 | Yes | `auto` | No | ✓ |
| DigitalOcean Spaces | Yes | Yes | No | ✓ |
| Linode | Yes | Yes | No | — |
| OCI | Yes | `us-east-1` | No | — |
| Vultr | Yes | Yes | No | — |
| Scaleway | Yes | Yes | No | ✓ |
| Tigris | Yes | `auto` | No | ✓ |
| Filebase | Yes | `us-east-1` | Auto | ✓ |

## Advanced Configuration Options

These options help with compatibility across different S3 implementations:

### force-path-style

Some providers require path-style URLs instead of virtual-hosted style. This is
automatically enabled when you set an `endpoint`, but can be explicitly
controlled:

```yaml
replica:
  type: s3
  bucket: mybucket
  endpoint: s3.provider.com
  force-path-style: true
```

### skip-verify

Disable TLS certificate verification for self-signed certificates (development
only):

```yaml
replica:
  type: s3
  bucket: mybucket
  endpoint: https://minio.local:9000
  skip-verify: true
```

**Warning:** Never use `skip-verify: true` in production environments.

### Performance Tuning

For large databases or high-throughput scenarios, tune multipart upload settings:

```yaml
replica:
  type: s3
  bucket: mybucket
  endpoint: s3.provider.com
  part-size: 10MB
  concurrency: 10
```

See the [Configuration Reference](/reference/config/#s3-replica) for all
available S3 replica options.

## Troubleshooting

### Authentication Errors

**Symptom:** `AccessDenied` or `SignatureDoesNotMatch` errors

**Solutions:**

1. Verify access key and secret key are correct
2. Check that credentials have appropriate bucket permissions
3. Ensure your system clock is synchronized (signatures are time-sensitive)
4. Confirm the region matches your bucket's actual region

### Connection Errors

**Symptom:** `connection refused` or timeout errors

**Solutions:**

1. Verify the endpoint URL is correct
2. Check that HTTPS is supported (or use `http://` for local development)
3. Ensure firewall rules allow outbound connections on port 443
4. For self-hosted services, confirm the service is running

### Invalid Endpoint

**Symptom:** `InvalidEndpoint` or hostname resolution errors

**Solutions:**

1. Remove the scheme from the endpoint if specifying separately
2. Include the port number if using a non-standard port
3. Verify DNS resolution for the endpoint hostname

### Region Mismatch

**Symptom:** `PermanentRedirect` or `AuthorizationHeaderMalformed` errors

**Solutions:**

1. Ensure the `region` field matches the bucket's actual region
2. For providers that ignore region, try `us-east-1`
3. Check provider documentation for region identifiers

### Connection Resets

**Symptom:** `connection reset by peer` errors in logs

**Solutions:**

Some providers (notably DigitalOcean Spaces) may reset connections occasionally.
Litestream handles these automatically through retries. If you see these errors
but replication continues, no action is needed.

## Environment Variables

Use environment variables to keep credentials out of configuration files:

```yaml
dbs:
  - path: /path/to/db
    replica:
      type: s3
      bucket: ${BUCKET_NAME}
      path: db
      endpoint: ${S3_ENDPOINT}
      region: ${S3_REGION}
      access-key-id: ${S3_ACCESS_KEY}
      secret-access-key: ${S3_SECRET_KEY}
```

Standard AWS environment variables are also supported:

- `AWS_ACCESS_KEY_ID` or `LITESTREAM_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY` or `LITESTREAM_SECRET_ACCESS_KEY`

Litestream-specific variables take precedence over AWS variables.


## See Also

- [Replicating to Amazon S3](/guides/s3) - AWS S3 setup guide
- [S3 Advanced Configuration](/guides/s3-advanced) - Multipart uploads, storage classes
- [Troubleshooting](/docs/troubleshooting) - Common issues and solutions
- [Configuration Reference](/reference/config) - Complete configuration options
