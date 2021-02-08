---
title : "Configuration File"
date: 2021-02-01T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 300
---

The YAML configuration file provides a way to list databases and replicas that
Litestream should manage. In addition, there are global variables that can be
applied to all replicas.

The default path for the configuration file is `/etc/litestream.yml`.


## Global settings

### AWS credentials

If you are using AWS S3 replication, it can be useful to specify your
credentials in one place instead of for each replica:

```yaml
access-key-id:     AKIAxxxxxxxxxxxxxxxx
secret-access-key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/xxxxxxxxx
```

You can also specify the AWS region, however, it will be looked up on startup
so it is not necessary.

```yaml
region: us-east1
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

Litestream currently supports two types of replicas:

- `"s3"` replicates a database to an S3 bucket.
- `"file"` replicates a database to another local file path.

All replicas have unique name which is specified by the `"name"` field. If a 
name is not specified then the name defaults to the replica type.


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
        region: us-east1
        access-key-id: AKIAxxxxxxxxxxxxxxxx
        secret-access-key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/xxxxxxxxx
```

The S3 replica also specifies a `sync-interval` which specifies how often WAL
files are pushed to S3. Most of your replication cost will be S3 `PUT` calls
so setting this too low may be expensive. By default, it is set to `10s`.


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
