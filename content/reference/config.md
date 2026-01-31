---
title : "Configuration File"
date: 2021-02-01T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 500
---

The YAML configuration file provides a way to list databases and replicas that
Litestream should manage. In addition, there are global variables that can be
applied to all replicas.

The default path for the configuration file is `/etc/litestream.yml`.

### Variable expansion

By default, Litestream will perform environment variable expansion within the
config file before reading it. Any references to `$VAR` or `${VAR}` formatted
variables will be replaced with their environment variable values. If no value
is set then it will be replaced with an empty string.

This can cause issues if you have a value in a configuration file which has a
dollar sign followed by characters—for example, a password. In this case, you
can set the `-no-expand-env` flag on any `litestream` command to disable
expansion.

### Environment Variables

Litestream supports environment variables for configuring authentication credentials.
There are two types:

1. **Auto-read variables** — Automatically read and applied by Litestream
2. **Expansion-only variables** — Must be explicitly referenced in config using `${VAR}` syntax

This distinction avoids the need to embed sensitive data in configuration files, which is
especially useful in containerized environments, Kubernetes, and secret management systems.

#### Auto-read Environment Variables

Litestream automatically reads and applies these variables without config changes:

| Variable | Purpose | Notes |
|----------|---------|-------|
| `AWS_ACCESS_KEY_ID` | AWS S3 access key | Standard AWS SDK variable |
| `AWS_SECRET_ACCESS_KEY` | AWS S3 secret key | Standard AWS SDK variable |
| `LITESTREAM_ACCESS_KEY_ID` | AWS S3 access key | Sets `AWS_ACCESS_KEY_ID` if unset; config file takes precedence |
| `LITESTREAM_SECRET_ACCESS_KEY` | AWS S3 secret key | Sets `AWS_SECRET_ACCESS_KEY` if unset; config file takes precedence |
| `LITESTREAM_AZURE_ACCOUNT_KEY` | Azure Blob Storage key | Read by ABS replica if not specified in config |
| `LITESTREAM_CONFIG` | Config file path | Overrides default `/etc/litestream.yml` |

**AWS Credential Precedence (highest to lowest):**

1. Credentials in config file (replica-level or global)
2. `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` environment variables
3. `LITESTREAM_ACCESS_KEY_ID` / `LITESTREAM_SECRET_ACCESS_KEY` environment variables

#### Expansion-only Variables (must use `${VAR}` syntax)

These variables are **not** automatically read. To use them, explicitly reference them
in your config file using `${VAR}` syntax. Litestream will expand them before parsing
the configuration:

**Examples:**

```yaml
dbs:
  - path: /var/lib/mydb.db
    replica:
      type: nats
      url: nats://nats.example.com:4222/my-bucket
      username: litestream
      password: ${NATS_PASSWORD}

  - path: /var/lib/mydb2.db
    replica:
      type: sftp
      host: backup.example.com:22
      user: backup
      password: ${SFTP_PASSWORD}
      path: /backups/mydb2

  - path: /var/lib/mydb3.db
    replica:
      url: s3://mybucket/mydb3
      access-key-id: ${AWS_ACCESS_KEY_ID}
      secret-access-key: ${AWS_SECRET_ACCESS_KEY}
```

Set the variables before running Litestream:

```bash
export NATS_PASSWORD=your-nats-password
export SFTP_PASSWORD=your-sftp-password
export AWS_ACCESS_KEY_ID=your-key-id
export AWS_SECRET_ACCESS_KEY=your-secret-key
litestream replicate
```

#### Google Cloud Storage Authentication

GCS authentication uses Google's [Application Default Credentials (ADC)](https://cloud.google.com/docs/authentication/application-default-credentials) chain.
The `GOOGLE_APPLICATION_CREDENTIALS` environment variable is **optional** — use it only when explicitly providing a service account key file.

ADC automatically supports:

- GKE workload identity (recommended for Kubernetes)
- Metadata server (for Google Compute Engine instances)
- `gcloud auth application-default login` (local development)
- Service account key file (via `GOOGLE_APPLICATION_CREDENTIALS`)


## Global settings

### Global replica defaults

{{< since version="0.5.0" >}} Global replica defaults allow you to set default
settings at the top level of your configuration file. These defaults are
automatically inherited by all replicas while still allowing per-replica
overrides. This eliminates configuration duplication across multiple databases.

See the [Global Replica Defaults Guide]({{< ref "global-defaults" >}}) for
detailed usage examples and best practices.

**Timing settings** (apply to all replica types):

```yaml
sync-interval: 1s
validation-interval: 6h
```

Note: Snapshot and retention settings are configured separately under the
`snapshot:` section, not as global replica defaults.

**S3 and S3-compatible settings:**

```yaml
access-key-id: AKIAxxxxxxxxxxxxxxxx
secret-access-key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/xxxxxxxxx
region: us-west-2
endpoint: https://custom.endpoint.com
bucket: default-bucket
force-path-style: false
skip-verify: false
```

**Azure Blob Storage settings:**

```yaml
account-name: myazureaccount
account-key: ${AZURE_ACCOUNT_KEY}
```

**SFTP settings:**

```yaml
host: backup.example.com:22
user: backupuser
password: ${SFTP_PASSWORD}
key-path: /etc/litestream/sftp_key
concurrent-writes: true
```

**NATS JetStream settings:**

```yaml
username: litestream
password: ${NATS_PASSWORD}
tls: true
root-cas:
  - /etc/ssl/certs/nats-ca.crt
max-reconnects: -1
reconnect-wait: 2s
timeout: 10s
```

Per-replica settings always override global defaults:

```yaml
# Global defaults
region: us-west-2
sync-interval: 30s

dbs:
  - path: /db1.sqlite
    replica:
      type: s3
      bucket: bucket1
      # Uses global region and sync-interval

  - path: /db2.sqlite
    replica:
      type: s3
      bucket: bucket2
      region: us-east-1  # Overrides global region
```

### AWS credentials

If you are using AWS S3 replication, it can be useful to specify your
credentials in one place instead of for each replica:

```yaml
access-key-id:     AKIAxxxxxxxxxxxxxxxx
secret-access-key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/xxxxxxxxx
```


### Metrics

Litestream produces a continuous stream of metrics that are exported as a
[Prometheus](https://prometheus.io/) endpoint. These are disabled by default
as it requires an HTTP server to start. You can enable it by setting a bind
address in the config:

```yaml
addr: ":9090"
```

When you start Litestream with this setting enabled, you'll see metrics at
[http://localhost:9090/metrics](http://localhost:9090/metrics)


### MCP (Model Context Protocol)

{{< since version="0.5.0" >}} Litestream includes built-in support for the Model Context Protocol (MCP),
allowing AI assistants to interact with your databases and replicas. Enable the MCP server
by setting a bind address:

```yaml
mcp-addr: ":3001"
```

When enabled, the MCP server will start alongside replication and provide AI tools at
[http://localhost:3001](http://localhost:3001). See the [MCP command reference]({{< ref "mcp" >}}) for available tools and usage.


### Logging

{{< since version="0.3.12" >}} Log `type` can be set to either "text" or "json".
Logging `level` can be set to "debug", "info", "warn" or "error". By setting
`stderr` to `true` logs will be written to stderr instead of stdout.

The defaults are shown below:

```yaml
logging:
  level: info
  type: text
  stderr: false
```


### L0 Retention

{{< since version="0.5.0" >}} L0 retention controls how long L0 (level 0) files
are kept after being compacted into L1 files. This setting is important when
using VFS (Virtual File System) read replicas, as it prevents race conditions
where L0 files could be deleted before VFS has time to fetch newly created L1
files.

**Background**: Litestream uses a tiered compaction system where transaction
data flows from L0 to higher levels. L0 files contain the most recent
transactions and are periodically compacted into L1 files. Without retention,
L0 files would be deleted immediately after compaction, which can cause issues
for VFS clients that haven't yet discovered the new L1 files.

The defaults are shown below:

```yaml
l0-retention: 5m
l0-retention-check-interval: 15s
```

**Configuration options:**

- `l0-retention`—Minimum time to retain L0 files after they have been compacted
  into L1. The file must meet both criteria before deletion: it must be
  compacted into L1 AND the retention period must have elapsed. Defaults to `5m`.

- `l0-retention-check-interval`—How frequently Litestream checks for expired L0
  files. This should be more frequent than the L1 compaction interval to ensure
  timely cleanup. Defaults to `15s`.

**When to adjust these values:**

| Scenario | Recommendation |
|----------|----------------|
| High-latency VFS clients | Increase `l0-retention` to allow more time for L1 discovery |
| Storage-constrained environments | Use default or slightly lower retention if VFS latency is low |
| Frequent database writes | Default values typically sufficient |
| Infrequent writes with VFS | Consider increasing retention to ensure L1 file availability |

**Example configuration:**

```yaml
# Extended retention for high-latency VFS environments
l0-retention: 10m
l0-retention-check-interval: 30s

dbs:
  - path: /var/lib/app.db
    replica:
      url: s3://mybucket/app
```

**Monitoring**: When L0 retention is enforced, Litestream logs debug messages.
Enable debug logging to monitor retention behavior:

```yaml
logging:
  level: debug

l0-retention: 5m
l0-retention-check-interval: 15s
```


## Database settings

Litestream can monitor one or more database files that are specified in the
configuration file. Database files are also referenced in `litestream` commands
by their absolute path.

Each database configuration includes the database path and replica configuration.
{{< since version="0.5.0" >}} Database configuration has been simplified to use a single
`replica` field instead of the deprecated `replicas` array.

```yaml
dbs:
  - path: /var/lib/db1
    replica:
      url: s3://mybkt.litestream.io/db1

  - path: /var/lib/db2
    replica:
      url: nats://nats.example.com:4222/my-bucket
      username: litestream
      password: ${NATS_PASSWORD}
```

### Database configuration options

Each database supports the following configuration options:

- `path`—Absolute path to the SQLite database file. {{< since version="0.5.0" >}}
  Litestream automatically strips `sqlite://` and `sqlite3://` prefixes, allowing
  you to use the same `DATABASE_URL` with Litestream and other SQLite tools. See
  [SQLite Connection String Prefixes](#sqlite-connection-string-prefixes) below.
- `meta-path`—Path to store Litestream metadata (defaults to `<path>-litestream`)
- `monitor-interval`—How often to check for changes (default: `1s`)
- `checkpoint-interval`—How often to perform WAL checkpoints using PASSIVE mode (default: `1m`, non-blocking)
- `busy-timeout`—SQLite busy timeout (default: `1s`)
- `min-checkpoint-page-count`—Minimum pages before PASSIVE checkpoint (default: `1000`, ~4MB, non-blocking)
- `truncate-page-n`—{{< since version="0.5.0" >}} Emergency threshold for TRUNCATE checkpoint (default: `121359`, ~500MB, **blocks both readers and writers**). Set to `0` to disable. See the [WAL Truncate Threshold Guide](/guides/wal-truncate-threshold) for details.
- `replica`—Single replica configuration (replaces deprecated `replicas` array)

{{< alert icon="⚠️" text="The max-checkpoint-page-count field has been removed in v0.5.0 due to safety concerns with RESTART checkpoints. Use truncate-page-n instead." >}}

### Directory replication

{{< since version="0.5.0" >}} Instead of specifying a single database `path`, you can
configure Litestream to replicate all databases in a directory using the `dir` field:

```yaml
dbs:
  - dir: /var/lib/app/tenants
    pattern: "*.db"
    replica:
      url: s3://mybucket/tenants
```

Directory configuration options:

- `dir`—Directory path to scan for databases
- `pattern`—Glob pattern for matching database files (e.g., `*.db`, `*.sqlite`)
- `recursive`—Scan subdirectories recursively (default: `false`)
- `watch`—Enable real-time directory monitoring (default: `false`)

When `watch` is enabled, Litestream monitors the directory for new databases and
automatically starts replication within seconds. Deleted databases are cleanly
removed from replication. This is useful for multi-tenant applications with
dynamic database provisioning.

```yaml
dbs:
  - dir: /var/lib/app/tenants
    pattern: "*.db"
    recursive: true
    watch: true
    replica:
      url: s3://mybucket/tenants
```

Replica paths are automatically namespaced by the database's relative path within
the directory. For example, `/var/lib/app/tenants/acme/data.db` would replicate to
`s3://mybucket/tenants/acme/data.db/`.

See the [Directory Watcher Guide]({{< ref "directory-watcher" >}}) for detailed
configuration examples and use cases.

Example with database-level options:

```yaml
dbs:
  - path: /var/lib/myapp.db
    meta-path: /var/lib/myapp-litestream
    monitor-interval: 500ms
    checkpoint-interval: 30s
    busy-timeout: 5s
    min-checkpoint-page-count: 500
    truncate-page-n: 50000  # ~200MB emergency truncation
    replica:
      url: s3://mybucket/myapp
      sync-interval: 1s
```

### SQLite Connection String Prefixes

{{< since version="0.5.0" >}} Litestream automatically strips `sqlite://` and
`sqlite3://` prefixes from database paths. This allows you to use a single
`DATABASE_URL` environment variable across Litestream and other SQLite tools
that require the protocol prefix.

```yaml
# All of these path values are equivalent:
#   /data/app.db
#   sqlite:///data/app.db
#   sqlite3:///data/app.db

dbs:
  - path: sqlite3:///data/app.db
```

This is particularly useful when working with tools like Django, Prisma, or
other ORMs that expect connection string URLs:

```sh
# Set once, use everywhere
export DATABASE_URL=sqlite3:///data/app.db

# Works with Litestream
litestream replicate $DATABASE_URL s3://backup-bucket/db

# Also works with other tools expecting the prefix
python manage.py migrate  # Django
prisma migrate deploy     # Prisma
```


### Directory configuration

{{< since version="0.5.0" >}} Litestream can replicate all SQLite databases in a
directory using the `dir` field instead of `path`. This is useful for
multi-tenant applications where each tenant has their own database.

```yaml
dbs:
  - dir: /var/lib/tenants
    pattern: "*.db"
    recursive: true
    replica:
      type: s3
      bucket: backups
      path: tenants
```

Directory configurations support the following options:

- `dir`—Absolute path to the directory containing databases
- `pattern`—Glob pattern to match database files (required)
- `recursive`—Scan subdirectories when `true` (default: `false`)
- `watch`—Enable real-time monitoring for new databases (default: `false`).
  See [Directory Watcher](/guides/directory-watcher) for details.

Each discovered database gets a unique replica path by appending its relative
path from the directory root:

| Local database path | Replica path |
|---------------------|--------------|
| `/var/lib/tenants/tenant1.db` | `backups/tenants/tenant1.db/ltx/...` |
| `/var/lib/tenants/team-a/db2.db` | `backups/tenants/team-a/db2.db/ltx/...` |

Litestream validates the SQLite header of each matched file to ensure only
actual SQLite databases are replicated.

See the [Directory Replication Guide]({{< ref "directory" >}}) for detailed
usage examples.


## Replica settings

Litestream supports seven types of replicas:

- `"abs"` replicates a database to an Azure Blob Storage container.
- `"file"` replicates a database to another local file path.
- `"gs"` replicates a database to a Google Cloud Storage bucket.
- `"nats"` replicates a database to a NATS JetStream Object Store.
- `"oss"` replicates a database to an Alibaba Cloud OSS bucket.
- `"s3"` replicates a database to an S3-compatible bucket.
- `"sftp"` replicates a database to a remote server via SFTP.
- `"webdav"` replicates a database to a WebDAV server.

{{< since version="0.5.0" >}} Each database now supports only a single replica. The `name` field
is deprecated legacy from v0.3.x where multiple replicas were supported.

The following replica settings are available for all replica types:

- `url`—Short-hand form of specifying a replica location. Setting this field
  will apply changes to multiples fields including `bucket`, `path`, `region`, etc.

- `sync-interval`—Frequency in which frames are pushed to the replica. Defaults
  to `1s`. Decreasing this value (increasing sync frequency) can significantly
  increase cloud storage costs due to more frequent PUT requests. See the
  [Cost Considerations](#cost-considerations) section below for details.

- `validation-interval`—{{< alert icon="⚠️" text="Currently non-functional in v0.5.x. When enabled in future versions, Litestream will automatically restore and validate that replica data matches the local copy. This will significantly increase cloud storage costs due to restore downloads." >}}


### S3 replica

The easiest way to configure an S3 replica is to use the `url` field:

```yaml
dbs:
  - path: /var/lib/db
    replica:
      url: s3://mybkt.litestream.io/db
```

{{< since version="0.5.0" >}} You can also use S3 access point ARNs for VPC-only
configurations and simplified access control:

```yaml
dbs:
  - path: /var/lib/db
    replica:
      url: s3://arn:aws:s3:us-east-2:123456789012:accesspoint/my-access-point/database-backups
```

When using access point ARNs, the region is automatically extracted from the
ARN. You can override it with an explicit `region` setting if needed. See the
[S3 Access Points guide]({{< ref "s3#using-s3-access-points" >}}) for detailed
configuration and IAM policy examples.

You can break this out into separate fields as well:

```yaml
dbs:
  - path: /var/lib/db
    replica:
      type: s3
      bucket: mybkt.litestream.io
      path: db
```

In addition, you can specify the region and AWS credentials:

```yaml
dbs:
  - path: /var/lib/db
    replica:
      url: s3://mybkt.litestream.io/db
      region: us-east-1
      access-key-id: AKIAxxxxxxxxxxxxxxxx
      secret-access-key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/xxxxxxxxx
```

The following settings are specific to S3 replicas:

- `access-key-id`—Replica-specific authentication key. If not specified, the
  global key or the `LITESTREAM_ACCESS_KEY_ID` environment variable will be used
  instead. The `AWS_ACCESS_KEY_ID` variable can also be used.

- `secret-access-key`—Replica-specific secret key. If not specified, the global
  secret or the `LITESTREAM_SECRET_ACCESS_KEY` environment variable will be used
  instead. The `AWS_SECRET_ACCESS_KEY` variable can also be used.

- `bucket`—Specifies the name of the remote bucket to replicate to.

- `path`—Specifies the path to use within the bucket.

- `region`—Specifies the bucket's region. Only used for AWS S3 & Backblaze B2.

- `endpoint`—Specifies the endpoint URL of the S3-compatible service. Only
  required for non-AWS services.

- `force-path-style`—Uses the path style which is required by non-AWS services.
  This is automatically enabled if `endpoint` is set.

- `skip-verify`—Disables TLS verification. This is useful when testing against
  a local node such as MinIO and you are using self-signed certificates.

- `part-size`—{{< since version="0.5.0" >}} Size of each part in multipart uploads. Accepts
  human-readable sizes like `5MB`, `10MB`, or `1GB`. Default is 5 MiB. Minimum
  is 5 MiB (S3 requirement), maximum is 5 GiB. See the
  [S3 Advanced Configuration Guide]({{< ref "s3-advanced" >}}) for tuning recommendations.

- `concurrency`—{{< since version="0.5.0" >}} Number of parts to upload in parallel during
  multipart uploads. Default is 5. Higher values improve throughput on fast
  networks but use more memory. See the
  [S3 Advanced Configuration Guide]({{< ref "s3-advanced" >}}) for tuning recommendations.

- `sign-payload`—{{< since version="0.5.0" >}} Signs the request payload.
  {{< since version="0.5.5" >}} Defaults to `true` for compatibility with AWS S3
  and most S3-compatible providers. Previously defaulted to `false`, which caused
  `SignatureDoesNotMatch` errors with some configurations. Set to `false` only if
  your specific provider requires unsigned payloads.

- `require-content-md5`—{{< since version="0.5.0" >}} Adds Content-MD5 header to
  requests. Some S3-compatible providers don't support this header on certain
  operations. Automatically disabled for Tigris endpoints. Defaults to `true`.

These options can also be set via URL query parameters:

```
s3://bucket/path?sign-payload=true&require-content-md5=false
```

#### S3-Compatible Provider Requirements

Different S3-compatible storage providers have varying requirements for payload
signing and Content-MD5 headers. The table below shows the recommended settings
for popular providers:

| Provider | sign-payload | require-content-md5 | Notes |
|----------|--------------|---------------------|-------|
| AWS S3 | `true` | `true` | Defaults work |
| Backblaze B2 | `true` | `true` | Defaults work |
| Tigris (Fly.io) | `true` | `false` | Requires signed payloads |
| OCI Object Storage | `true` | `true` | Requires Content-MD5 |
| Filebase | `true` | `true` | Defaults work |
| MinIO | `true` | `true` | Defaults work |
| DigitalOcean Spaces | `true` | `true` | Defaults work |


### Tigris (Fly.io) Configuration

{{< since version="0.5.0" >}} [Tigris](https://www.tigrisdata.com/) is Fly.io's
globally distributed S3-compatible object storage. Litestream automatically
detects Tigris endpoints and applies required configuration settings.

```yaml
dbs:
  - path: /var/lib/db
    replica:
      type: s3
      bucket: mybucket
      path:   db
      endpoint: fly.storage.tigris.dev
      region: auto
```

When using the `fly.storage.tigris.dev` endpoint, Litestream automatically
configures:

- `sign-payload: true` — Required by Tigris for request authentication
- `require-content-md5: false` — Tigris doesn't support Content-MD5 on DELETE

See the [Tigris Guide]({{< ref "tigris" >}}) for detailed setup instructions.


### MinIO Configuration

MinIO is an S3-compatible object storage service. The main difference from AWS S3
is that MinIO requires specifying an `endpoint` parameter pointing to your MinIO
server. Additionally, when using MinIO, you must create access keys in the MinIO
console before configuring Litestream.

#### Local MinIO (Docker)

For local testing with MinIO running on your machine via Docker, you can use
command-line environment variables:

```yaml
access-key-id:     minioadmin
secret-access-key: minioadmin
```

Command-line replication to local MinIO:

```sh
export LITESTREAM_ACCESS_KEY_ID=minioadmin
export LITESTREAM_SECRET_ACCESS_KEY=minioadmin
litestream replicate mydb.db s3://mybkt.localhost:9000/mydb.db
```

#### Remote MinIO Server

For remote MinIO servers, you **must** use a configuration file and specify the
`endpoint` parameter. Config file values take precedence over environment variables,
so credentials specified in the config file will override any `AWS_*` or `LITESTREAM_*`
environment variables.

Configuration file example with remote MinIO:

```yaml
dbs:
  - path: /var/lib/mydb.db
    replica:
      type: s3
      bucket: mybkt
      path: mydb.db
      endpoint: https://minio.example.com:9000
      region: us-east-1
      access-key-id: myaccesskey
      secret-access-key: mysecretkey
```

Or using the URL shorthand form:

```yaml
dbs:
  - path: /var/lib/mydb.db
    replica:
      url: s3://mybkt/mydb.db
      endpoint: https://minio.example.com:9000
      region: us-east-1
      access-key-id: myaccesskey
      secret-access-key: mysecretkey
```

#### Key Points for MinIO Configuration

1. **Endpoint**: Required for non-AWS S3 services. Should be the full URL to your
   MinIO server (e.g., `https://minio.example.com:9000` or
   `http://minio.local:9000`).

2. **Region**: While MinIO ignores the region parameter, Litestream still requires
   it. You can use any value such as `us-east-1`.

3. **Access Keys**: These must be created in the MinIO console before use. The
   default MinIO installation uses `minioadmin` / `minioadmin` but you should
   change these credentials in production.

4. **TLS Certificate**: If using self-signed certificates, add `skip-verify: true`
   to your replica configuration (not recommended for production).

5. **Environment Variables**: Config file values take precedence over environment
   variables. If you specify credentials in the config file (like `access-key-id`),
   they will override any `LITESTREAM_*` or `AWS_*` environment variables. To use
   environment variables instead, leave the config fields empty.


### File replica

File replicas can be configured using the `"path"` field:

```yaml
dbs:
  - path: /var/lib/db
    replica:
      path: /backup/db
```

If no `"type"` field is specified and a `"url"` is not used then `"file"` is
assumed.


### Google Cloud Storage (GCS) replica

GCS replicas can be configured using the `url` field:

```yaml
dbs:
  - path: /var/lib/db
    replica:
      url: gs://mybucket.example.com/db
```

Or by specifying individual fields:

```yaml
dbs:
  - path: /var/lib/db
    replica:
      type: gs
      bucket: mybucket.example.com
      path: db
```

GCS authentication uses Google Application Default Credentials (ADC). Set the
`GOOGLE_APPLICATION_CREDENTIALS` environment variable to point to your service
account key file, or use workload identity in GKE environments.


### Azure Blob Storage (ABS) replica

{{< since version="0.5.0" >}} Updated to use Azure SDK v2 with support for Managed Identity and service principal authentication. See the [Azure SDK v2 Migration Guide](/docs/migration/#azure-sdk-v2-migration) for details.

ABS replicas can be configured using the `url` field:

```yaml
dbs:
  - path: /var/lib/db
    replica:
      url: abs://account@myaccount.blob.core.windows.net/container/db
```

Or by specifying individual fields:

```yaml
dbs:
  - path: /var/lib/db
    replica:
      type: abs
      account-name: myaccount
      account-key: ${AZURE_ACCOUNT_KEY}
      bucket: container
      path: db
      endpoint: https://myaccount.blob.core.windows.net/
```

The following settings are specific to ABS replicas:

- `account-name`—Azure storage account name
- `account-key`—Azure storage account key. Can be set via `LITESTREAM_AZURE_ACCOUNT_KEY` environment variable or injected via `${VAR}` syntax in config
- `bucket`—Container name within the storage account
- `path`—Path within the container
- `endpoint`—Custom endpoint URL (optional)


### SFTP replica

SFTP replicas allow replication to remote servers via SSH File Transfer Protocol:

```yaml
dbs:
  - path: /var/lib/db
    replica:
      url: sftp://user:password@example.com:22/backup/db
```

Or with individual fields:

```yaml
dbs:
  - path: /var/lib/db
    replica:
      type: sftp
      host: example.com:22
      user: backup-user
      password: ${SFTP_PASSWORD}
      key-path: /etc/litestream/sftp_key
      path: /backup/db
```

The following settings are specific to SFTP replicas:

- `host`—SFTP server hostname and port
- `user`—Username for authentication
- `password`—Password for authentication (not recommended for production)
- `key-path`—Path to SSH private key file for key-based authentication
- `path`—Remote path where replica files will be stored
- `concurrent-writes`—Enables concurrent writes for improved throughput (defaults
  to `true`). When enabled, failed uploads must restart from the beginning. Set
  to `false` to allow resuming failed transfers from the last successful chunk.
  See the [SFTP Guide]({{< ref "sftp" >}}) for guidance on when to disable.


### NATS JetStream Object Store replica

{{< since version="0.5.0" >}} NATS JetStream Object Store provides distributed storage.

NATS replicas can be configured using the `url` field:

```yaml
dbs:
  - path: /var/lib/db
    replica:
      url: nats://nats.example.com:4222/my-bucket
      username: litestream
      password: ${NATS_PASSWORD}
```

Or with individual fields:

```yaml
dbs:
  - path: /var/lib/db
    replica:
      type: nats
      bucket: my-bucket
      username: litestream
      password: ${NATS_PASSWORD}

      # TLS configuration (auto-enables TLS when specified)
      root-cas:
        - /etc/ssl/certs/nats-ca.crt
      client-cert: /etc/ssl/certs/nats-client.crt
      client-key: /etc/ssl/private/nats-client.key

      # Connection tuning
      max-reconnects: -1
      reconnect-wait: 2s
      timeout: 10s
```

The following settings are specific to NATS replicas:

**Connection Settings:**

- `bucket`—NATS JetStream Object Store bucket name (must be pre-created)
- `max-reconnects`—Maximum reconnection attempts (-1 for unlimited)
- `reconnect-wait`—Wait time between reconnection attempts
- `timeout`—Connection timeout

**Authentication Options (choose one):**

- `username` & `password`—Basic username/password authentication
- `jwt` & `seed`—JWT token and seed for NATS 2.0 authentication
- `creds`—Path to NATS credentials file
- `nkey`—NKey for signature-based authentication
- `token`—Simple token authentication

**TLS Options:**

TLS is automatically enabled when `client-cert`/`client-key` or `root-cas` are
configured. All certificate files must be in PEM format.

- `root-cas`—List of CA certificate file paths for server verification
- `client-cert`—Client certificate file path for mutual TLS authentication
- `client-key`—Client private key file path for mutual TLS authentication
  (must be specified with `client-cert`)

See the [NATS Integration Guide]({{< ref "nats" >}}) for detailed TLS setup instructions.


### Alibaba Cloud OSS replica

{{< since version="0.5.0" >}} Native Alibaba Cloud OSS support using the official SDK.

OSS replicas can be configured using the `url` field:

```yaml
dbs:
  - path: /var/lib/db
    replica:
      url: oss://mybucket.oss-cn-hangzhou.aliyuncs.com/db
```

Or by specifying individual fields:

```yaml
dbs:
  - path: /var/lib/db
    replica:
      type: oss
      bucket: mybucket
      region: cn-hangzhou
      path: db
```

The following settings are specific to OSS replicas:

- `access-key-id`—Alibaba Cloud AccessKey ID. Can also use `OSS_ACCESS_KEY_ID` environment variable.
- `secret-access-key`—Alibaba Cloud AccessKey Secret. Can also use `OSS_ACCESS_KEY_SECRET` environment variable.
- `bucket`—OSS bucket name
- `region`—OSS region (e.g., cn-hangzhou, us-west-1)
- `path`—Path within the bucket
- `part-size`—Part size for multipart uploads (default: 5MB)
- `concurrency`—Number of parallel upload workers (default: 1)

See the [Alibaba Cloud OSS Guide]({{< ref "alibaba-oss" >}}) for detailed setup instructions.


### WebDAV replica

{{< since version="0.5.0" >}} WebDAV replicas allow replication to any RFC 4918 compliant WebDAV server,
including Nextcloud, ownCloud, and Apache mod_dav.

WebDAV replicas can be configured using the `url` field:

```yaml
dbs:
  - path: /var/lib/db
    replica:
      url: webdavs://user:password@example.com/backup/db
```

Or with individual fields:

```yaml
dbs:
  - path: /var/lib/db
    replica:
      type: webdav
      webdav-url: https://example.com/webdav
      webdav-username: ${WEBDAV_USERNAME}
      webdav-password: ${WEBDAV_PASSWORD}
      path: /litestream/backups
```

The following settings are specific to WebDAV replicas:

- `webdav-url`—WebDAV server URL (use `https://` for production)
- `webdav-username`—Username for HTTP Basic authentication
- `webdav-password`—Password for HTTP Basic authentication
- `path`—Remote path where replica files will be stored

**URL Schemes:**

- `webdav://`—HTTP (not recommended for production)
- `webdavs://`—HTTPS (recommended for production)

**Environment Variables:**

You can use environment variables with standard Litestream substitution:

- `${WEBDAV_USERNAME}` or `${LITESTREAM_WEBDAV_USERNAME}`
- `${WEBDAV_PASSWORD}` or `${LITESTREAM_WEBDAV_PASSWORD}`

See the [WebDAV Guide]({{< ref "webdav" >}}) for detailed setup instructions.


### Legacy Multiple Replicas

{{< alert icon="⚠️" text="Multiple replicas per database are deprecated. Use a single replica configuration instead." >}}

Previous versions supported multiple replicas per database using the `replicas` array.
This has been simplified to use a single `replica` field:

**Deprecated (v0.3.x and earlier):**

```yaml
dbs:
  - path: /local/path/to/db
    replicas:
      - name: my_aws_replica
        url: s3://myawsbucket/db
      - name: my_do_replica
        url: s3://mybkt.nyc3.digitaloceanspaces.com/db
```

**Current (v0.5.0+):**

```yaml
dbs:
  - path: /local/path/to/db
    replica:
      url: s3://myawsbucket/db
```

If you need multiple backup destinations, consider using your cloud provider's
cross-region replication features or multiple Litestream instances.


### Retention period

Replicas maintain a snapshot of the database as well as a contiguous sequence of
LTX page updates. These updates take up space so new snapshots are created and
old LTX files are dropped through a process called "retention".

Retention is controlled globally via the `snapshot.retention` field in the root
configuration, not per-replica. See the [Complete Configuration Example](#complete-configuration-example)
section for an example of how to configure snapshot settings.

Duration values can be specified using second (`s`), minute (`m`), or hour (`h`)
but days, weeks, & years are not supported.


### Validation interval

{{< alert icon="⚠️" text="The `validation-interval` field is currently non-functional in v0.5.x. It is defined in the configuration schema but has no effect. When this feature is implemented in a future release, it will periodically restore replicas and compare checksums to the primary database, but this will significantly increase costs due to restore downloads." >}}

### Encryption

{{< alert icon="⚠️" text="**Age Encryption Not Available in v0.5.0+**: Age encryption was removed during the LTX storage layer refactor. Encryption will be re-implemented directly in LTX to support per-page encryption (more efficient for cloud storage). Configuration will be explicitly rejected with an error message. If you are using Age encryption with v0.3.x, please review the [migration guide](/docs/migration/#age-encryption-migration) before upgrading." >}}

{{< since version="0.3.10" >}} Client-side encryption can be enabled per replica by adding an `age` section to
the replica configuration with corresponding `identities` and `recipients`
fields.

{{< alert icon="❗️" text="When enabling encryption restoring requires matching age identity to restore from the replica." >}}

```yaml
dbs:
  - path: /var/lib/db
    replica:
      url: s3://mybkt.litestream.io/db
      age:
        identities:
          - AGE-SECRET-KEY-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
        recipients:
          - age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

To generate keys, refer to the
age [README](https://github.com/FiloSottile/age/blob/main/README.md)
how to install and use the command line tools.

As of now identities must be a superset of recipients but key rotation can be
achieved by adding a new identity while changing the recipient list to only have
a key for it.

Note that enabling encryption after replication has already been done can
confuse Litestream so it is recommended the replica is empty when doing so.
Restoring from a replica that has mixed encrypted and non-encrypted files will
fail.

#### Identity Files

{{< since version="0.5.0" >}} You can also reference identity files instead of embedding keys directly:

```yaml
dbs:
  - path: /var/lib/db
    replica:
      url: s3://mybkt.litestream.io/db
      age:
        identities:
          - /etc/litestream/age-identity.txt
        recipients:
          - age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Cost Considerations

Understanding the cost implications of Litestream configuration is important for
managing cloud storage expenses. The primary cost drivers vary by configuration:

### Sync Interval Costs

The `sync-interval` setting primarily affects **PUT request costs**, not storage costs.
Litestream only uploads frames when the database changes, but frequent intervals
mean more frequent requests when changes occur.

**PUT Request Cost Examples (AWS S3 pricing: $0.000005 per request):**

- `sync-interval: 1s` with constant writes: ~2,592,000 requests/month = **$12.96/month**
- `sync-interval: 10s` with constant writes: ~259,200 requests/month = **$1.30/month**  
- `sync-interval: 1m` with constant writes: ~43,200 requests/month = **$0.22/month**

_Note: Actual costs depend on your database write patterns. Litestream batches
writes by time interval, so costs scale with write frequency._

### Storage vs Request Costs

**Request Costs (Primary Driver):**

- PUT operations for uploading frames and snapshots
- GET operations for restores and validation
- LIST operations for cleanup and maintenance

**Storage Costs (Usually Minimal):**

- LTX files (containing SQLite page updates and metadata)
- Snapshot files (full database copies)
- Typically much lower than request costs for active databases

**Transfer Costs:**

- Ingress: Often free (AWS S3, Google Cloud)
- Egress: Charged for restores and validation
- Varies significantly by cloud provider

### Retention Impact

The `retention` setting affects storage costs by controlling:

- How long LTX frames are kept (affects storage volume)
- When new snapshots are created (affects PUT requests)
- Storage cleanup frequency (affects LIST requests)

Shorter retention periods reduce storage costs but may increase snapshot creation
frequency. Longer retention periods increase storage but reduce snapshot overhead.

### Provider-Specific Considerations

Different S3-compatible providers have varying pricing models:

- **AWS S3**: Charges for PUT requests, ingress typically free
- **Backblaze B2**: Lower storage costs, different request pricing
- **DigitalOcean Spaces**: Includes egress allowance
- **MinIO/Self-hosted**: Only infrastructure costs

Always consult your provider's current pricing documentation for accurate estimates.

## Complete Configuration Example

Example showing available configuration options:

```yaml
# Global settings
access-key-id: ${AWS_ACCESS_KEY_ID}
secret-access-key: ${AWS_SECRET_ACCESS_KEY}

# Metrics endpoint
addr: ":9090"

# MCP server for AI integration  
mcp-addr: ":3001"

# Subcommand to execute
exec: "myapp -config /etc/myapp.conf"

# Logging configuration
logging:
  level: info
  type: text
  stderr: false

# Compaction levels
levels:
  - interval: 5m
  - interval: 1h
  - interval: 24h

# Global snapshot settings
snapshot:
  interval: 1h
  retention: 24h

# L0 retention settings (for VFS support)
l0-retention: 5m
l0-retention-check-interval: 15s

# Database configurations
dbs:
  # S3 replica
  - path: /var/lib/app1.db
    monitor-interval: 1s
    checkpoint-interval: 1m
    replica:
      url: s3://mybucket/app1
      region: us-east-1
      sync-interval: 1s

  # NATS replica with mTLS
  - path: /var/lib/app2.db
    replica:
      type: nats
      url: nats://nats.example.com:4222/app2-bucket
      username: litestream
      password: ${NATS_PASSWORD}
      root-cas:
        - /etc/ssl/certs/nats-ca.crt
      client-cert: /etc/ssl/certs/litestream-client.crt
      client-key: /etc/ssl/private/litestream-client.key
      max-reconnects: -1
      reconnect-wait: 2s

  # File replica for local backup
  - path: /var/lib/app3.db
    replica:
      path: /backup/app3
```

## Migration from v0.3.x

If you're upgrading from Litestream v0.3.x, note these breaking changes:

1. **Multiple replicas deprecated**: Use single `replica` field instead of `replicas` array
2. **LTX terminology**: References to "WAL" are now "LTX" (Litestream Transaction Log)
3. **Updated cloud clients**: AWS SDK v2, Azure SDK v2 with potential authentication changes
4. **New replica types**: NATS and SFTP support added
5. **MCP integration**: New AI assistant capabilities

See the [Migration Guide]({{< ref "migration" >}}) for detailed upgrade instructions.
