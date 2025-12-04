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


## Global settings

### Global replica defaults

{{< since version="0.5.0" >}} Global replica defaults allow you to set default
settings at the top level of your configuration file. These defaults are
automatically inherited by all replicas while still allowing per-replica
overrides. This eliminates configuration duplication across multiple databases.

See the [Global Replica Defaults Guide]({{< ref "global-defaults" >}}) for
detailed usage examples and best practices.

**Universal settings** (apply to all replica types):

```yaml
sync-interval: 1s
validation-interval: 6h
retention: 168h
retention-check-interval: 1h
snapshot-interval: 1h
```

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
concurrent-writes: 4
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

**Age encryption settings:**

```yaml
age:
  identities:
    - /etc/litestream/age-identity.txt
  recipients:
    - age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Per-replica settings always override global defaults:

```yaml
# Global defaults
region: us-west-2
retention: 168h

dbs:
  - path: /db1.sqlite
    replica:
      type: s3
      bucket: bucket1
      # Uses global region (us-west-2) and retention (168h)

  - path: /db2.sqlite
    replica:
      type: s3
      bucket: bucket2
      region: us-east-1  # Overrides global region
      # Still uses global retention (168h)
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

- `path`—Absolute path to the SQLite database file
- `meta-path`—Path to store Litestream metadata (defaults to `<path>-litestream`)
- `monitor-interval`—How often to check for changes (default: `1s`)
- `checkpoint-interval`—How often to perform WAL checkpoints (default: `1m`)
- `busy-timeout`—SQLite busy timeout (default: `1s`)
- `min-checkpoint-page-count`—Minimum pages before checkpointing (default: `1000`)
- `max-checkpoint-page-count`—Maximum pages before forcing checkpoint (default: `10000`)
- `replica`—Single replica configuration (replaces deprecated `replicas` array)

Example with database-level options:

```yaml
dbs:
  - path: /var/lib/myapp.db
    meta-path: /var/lib/myapp-litestream
    monitor-interval: 500ms
    checkpoint-interval: 30s
    busy-timeout: 5s
    min-checkpoint-page-count: 500
    max-checkpoint-page-count: 5000
    replica:
      url: s3://mybucket/myapp
      sync-interval: 1s
```


## Replica settings

Litestream supports six types of replicas:

- `"abs"` replicates a database to an Azure Blob Storage container.
- `"file"` replicates a database to another local file path.
- `"gs"` replicates a database to a Google Cloud Storage bucket.
- `"nats"` replicates a database to a NATS JetStream Object Store.
- `"s3"` replicates a database to an S3-compatible bucket.
- `"sftp"` replicates a database to a remote server via SFTP.

All replicas have unique name which is specified by the `"name"` field. If a
name is not specified then the name defaults to the replica type. The name is
only needed when using multiple replicas of the same type on a database.

The following replica settings are also available for all replica types:

- `url`—Short-hand form of specifying a replica location. Setting this field
  will apply changes to multiples fields including `bucket`, `path`, `region`, etc.

- `retention`—The amount of time that snapshot & LTX files will be kept. After
  the retention period, a new snapshot will be created and the old one will be
  removed. LTX files that exist before the oldest snapshot will also be removed.
  Defaults to `24h`.

- `retention-check-interval`—Specifies how often Litestream will check if
  retention needs to be enforced. Defaults to `1h`.

- `snapshot-interval`—Specifies how often new snapshots will be created. This is
  used to reduce the time to restore since newer snapshots will have fewer LTX
  frames to apply. Retention still applies to these snapshots.

  If you do not set a snapshot interval then a new snapshot will be created
  whenever retention is performed. Retention occurs every 24 hours by default.


- `validation-interval`—When specified, Litestream will automatically restore
  and validate that the data on the replica matches the local copy. Disabled by
  default. Enabling this will significantly increase the cost of running
  Litestream as S3 services charge for downloads.

- `sync-interval`—Frequency in which frames are pushed to the replica. Defaults
  to `1s`. Decreasing this value (increasing sync frequency) can significantly
  increase cloud storage costs due to more frequent PUT requests. See the
  [Cost Considerations](#cost-considerations) section below for details.

- `age`—Client-side encryption with [age](https://age-encryption.org), see
  [Encryption](#encryption) for configuration details. Defaults to off.


### S3 replica

The easiest way to configure an S3 replica is to use the `url` field:

```yaml
dbs:
  - path: /var/lib/db
    replicas:
      - url: s3://mybkt.litestream.io/db
```

However, you can break this out into separate fields as well:

```yaml
dbs:
  - path: /var/lib/db
    replicas:
      - type:   s3
        bucket: mybkt.litestream.io
        path:   db
```

In addition, you can specify the region and AWS credentials per-replica:

```yaml
dbs:
  - path: /var/lib/db
    replicas:
      - url: s3://mybkt.litestream.io/db
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
`endpoint` parameter. Environment variables take precedence over config file
values, so ensure any conflicting environment variables are unset before running
Litestream.

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

5. **Environment Variables**: Environment variables take precedence over config
   file values. If you're using a config file with inline credentials, unset any
   conflicting `LITESTREAM_*` or `AWS_*` environment variables first.


### File replica

File replicas can be configured using the `"path"` field:

```yaml
dbs:
  - path: /var/lib/db
    replicas:
      - path: /backup/db
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

{{< since version="0.5.0" >}} Updated to use Azure SDK v2.

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
- `account-key`—Azure storage account key or use `AZURE_STORAGE_KEY` environment variable
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
      
      # TLS configuration
      tls: true
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

- `tls`—Enable TLS encryption
- `root-cas`—List of CA certificate file paths
- `client-cert`—Client certificate for mutual TLS
- `client-key`—Client private key for mutual TLS

See the [NATS Integration Guide]({{< ref "nats" >}}) for detailed setup instructions.


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
SQLite WAL page updates. These updates take up space so new snapshots are
created and old WAL files are dropped through a process called "retention".

The default retention period is `24h`. You can change that with the `retention`
field. Retention is enforced periodically and defaults to every `1h`. This can
be changed with the `retention-check-interval` field.

```
dbs:
  - path: /var/lib/db
    replicas:
      - url: s3://mybkt.litestream.io/db
        retention: 4h
```

Duration values can be specified using second (`s`), minute (`m`), or hour (`h`)
but days, weeks, & years are not supported.


### Validation interval

Because Litestream performs physical replication, the resulting database files
restored from replicas will match byte-for-byte. Litestream has an option to
periodically validate replicas by restoring them and comparing their checksum
to the primary database's checksum.

_Please note that frequently restoring from S3 can be expensive._

It can be enabled by setting the `validation-interval` field:

```
dbs:
  - path: /var/lib/db
    replicas:
      - url: s3://mybkt.litestream.io/db
        validation-interval: 6h
```

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

# Database configurations
dbs:
  # S3 replica with encryption
  - path: /var/lib/app1.db
    monitor-interval: 1s
    checkpoint-interval: 1m
    replica:
      url: s3://mybucket/app1
      region: us-east-1
      sync-interval: 1s
      retention: 72h
      age:
        identities:
          - /etc/litestream/age-identity.txt
        recipients:
          - age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  
  # NATS replica with TLS
  - path: /var/lib/app2.db
    replica:
      type: nats
      url: nats://nats.example.com:4222/app2-bucket
      username: litestream
      password: ${NATS_PASSWORD}
      tls: true
      root-cas:
        - /etc/ssl/certs/nats-ca.crt
      max-reconnects: -1
      reconnect-wait: 2s
      
  # File replica for local backup
  - path: /var/lib/app3.db
    replica:
      path: /backup/app3
      retention: 168h  # 1 week
```

## Migration from v0.3.x

If you're upgrading from Litestream v0.3.x, note these breaking changes:

1. **Multiple replicas deprecated**: Use single `replica` field instead of `replicas` array
2. **LTX terminology**: References to "WAL" are now "LTX" (Litestream Transaction Log)
3. **Updated cloud clients**: AWS SDK v2, Azure SDK v2 with potential authentication changes
4. **New replica types**: NATS and SFTP support added
5. **MCP integration**: New AI assistant capabilities

See the [Migration Guide]({{< ref "migration" >}}) for detailed upgrade instructions.
