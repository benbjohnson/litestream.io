---
title : "Replicating to Alibaba Cloud OSS"
date: 2025-12-03T00:00:00Z
layout: docs
menu:
  docs:
    parent: "replica-guides"
weight: 405
---

{{< since version="0.5.0" >}} This guide will show you how to use Litestream's
native [Alibaba Cloud OSS][] support to replicate your database. You will need
an [Alibaba Cloud][] account to complete this guide.

[Alibaba Cloud OSS]: https://www.alibabacloud.com/product/object-storage-service
[Alibaba Cloud]: https://www.alibabacloud.com/


## Setup

### Create a bucket

In the [OSS Console][], click the _"Create Bucket"_ button. Enter a unique
bucket name and select your preferred region (e.g., `cn-hangzhou`, `us-west-1`).
Remember your bucket name and region as you'll need those later.

[OSS Console]: https://oss.console.aliyun.com/


### Create access credentials

From the [RAM Console][], navigate to _"AccessKey Management"_ under your
account. Click _"Create AccessKey"_ to generate a new key pair. You will need
to save the _"AccessKey ID"_ and _"AccessKey Secret"_ for later use in this
guide.

[RAM Console]: https://ram.console.aliyun.com/


## Usage

### Command line usage

You can replicate to [Alibaba Cloud OSS][] from the command line by setting
your credentials via environment variables:

```sh
export OSS_ACCESS_KEY_ID=xxxxxxxxxxxxxxxx
export OSS_ACCESS_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

You can then specify your replica as a replica URL on the command line. For
example, you can replicate a database to your bucket with the following
command. _Replace the placeholders for your bucket, region, & path._

```sh
litestream replicate /path/to/db oss://BUCKET.oss-REGION.aliyuncs.com/PATH
```

You can later restore your database from Alibaba Cloud OSS to a local `my.db`
path with the following command.

```sh
litestream restore -o my.db oss://BUCKET.oss-REGION.aliyuncs.com/PATH
```

### Configuration file usage

Litestream is typically run as a background service which uses a [configuration
file][]. You can configure a replica for your database using the `url` format.

```yaml
dbs:
  - path: /path/to/local/db
    replica:
      url: oss://BUCKET.oss-REGION.aliyuncs.com/PATH
      access-key-id: xxxxxxxxxxxxxxxx
      secret-access-key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Or you can expand your configuration into multiple fields:

```yaml
dbs:
  - path: /path/to/local/db
    replica:
      type:   oss
      bucket: BUCKET
      region: REGION
      path:   PATH
```

You can also use the `OSS_ACCESS_KEY_ID` and `OSS_ACCESS_KEY_SECRET` environment
variables instead of specifying the credentials in your configuration file.


## Advanced Options

Alibaba Cloud OSS replicas support additional configuration options for
multipart uploads:

```yaml
dbs:
  - path: /path/to/local/db
    replica:
      type:        oss
      bucket:      BUCKET
      region:      REGION
      path:        PATH
      part-size:   10485760  # 10MB part size for multipart uploads
      concurrency: 5         # Number of parallel upload workers
```


## See Also

- [Troubleshooting](/docs/troubleshooting) - Common issues and solutions
- [Configuration Reference](/reference/config) - Complete configuration options


[configuration file]: /reference/config
