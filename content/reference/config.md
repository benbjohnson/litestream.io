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

Each database accepts two options—its path and a list of replicas:

```yaml
dbs:
  - path: /var/lib/db1
    replicas:
      - url: s3://mybkt.litestream.io/db1

  - path: /var/lib/db2
    replicas:
      - path: /backup/db2
      - url:  s3://mybkt.litestream.io/db2
```


## Replica settings

Litestream currently supports three types of replicas:

- `"abs"` replicates a database to an Azure Blob Storage container.
- `"file"` replicates a database to another local file path.
- `"s3"` replicates a database to an S3-compatible bucket.

All replicas have unique name which is specified by the `"name"` field. If a
name is not specified then the name defaults to the replica type. The name is
only needed when using multiple replicas of the same type on a database.

The following replica settings are also available for all replica types:

- `url`—Short-hand form of specifying a replica location. Setting this field
  will apply changes to multiples fields including `bucket`, `path`, `region`, etc.

- `retention`—The amount of time that snapshot & WAL files will be kept. After
  the retention period, a new snapshot will be created and the old one will be
  removed. WAL files that exist before the oldest snapshot will also be removed.
  Defaults to `24h`.

- `retention-check-interval`—Specifies how often Litestream will check if
  retention needs to be enforced. Defaults to `1h`.

- `snapshot-interval`—Specifies how often new snapshots will be created. This is
  used to reduce the time to restore since newer snapshots will have fewer WAL
  frames to apply. Retention still applies to these snapshots.

  If you do not set a snapshot interval then a new snapshot will be created
  whenever retention is performed. Retention occurs every 24 hours by default.


- `validation-interval`—When specified, Litestream will automatically restore
  and validate that the data on the replica matches the local copy. Disabled by
  default. Enabling this will significantly increase the cost of running
  Litestream as S3 services charge for downloads.

- `sync-interval`—Frequency in which frames are pushed to the replica. Defaults
  to `1s`. Increasing frequency can increase cloud storage costs significantly.

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
    replicas:
      - type: s3
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
    replicas:
      - url: s3://mybkt/mydb.db
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


### Multiple replicas

You can specify multiple replicas for a database, however, each one must have
a unique name. For example, this configuration below is for replicating to
AWS S3 & to DigitalOcean Spaces. Both of these use the "s3" replica type so
their default name would be "s3". Instead, we can name them each unique names,
`my_aws_replica` & `my_do_replica`.

```yaml
dbs:
  - path: /local/path/to/db
    replicas:
      - name: my_aws_replica
        url: s3://myawsbucket/db
      - name: my_do_replica
        url: s3://mybkt.nyc3.digitaloceanspaces.com/db
```


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

{{< since version="0.3.10" >}} Client-side encryption can be enabled per replica by adding an `age` section to
the replica configuration with corresponding `identities` and `recipients`
fields.

{{< alert icon="❗️" text="When enabling encryption restoring requires matching age identity to restore from the replica." >}}

```
dbs:
  - path: /var/lib/db
    replicas:
      - url: s3://mybkt.litestream.io/db
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
