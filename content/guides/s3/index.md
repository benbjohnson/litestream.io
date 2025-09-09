---
title : "Replicating to Amazon S3"
date: 2021-03-08T00:00:00Z
layout: docs
menu:
  docs:
    parent: "replica-guides"
weight: 400
---

This guide will show you how to use Amazon S3 or S3-compatible storage as a database replica path for
Litestream. You can use Amazon S3 directly, or any S3-compatible storage provider such as
MinIO, Wasabi, Backblaze B2, Tigris, DigitalOcean Spaces, or other compatible services.

For Amazon S3, you will need an [Amazon AWS](https://aws.amazon.com/) account to
complete the AWS-specific setup sections. For other providers, you'll need an account
with your chosen S3-compatible storage service.

## Setup

### Create an IAM user

You will need to set up a user with programmatic access to work with Amazon S3.
From the [AWS Console](https://console.aws.amazon.com/), go to the IAM service.
Next, click _Users_ from the left-hand navigation and then click the _Add User_
button.

Enter a name for your user and make sure to enable _Programmatic Access_. Then
click the _Next_ button.

<figure>
	<img src="iam_0.png" alt="Screenshot of creating an IAM user">
</figure>

On the permissions screen, click on _"Attach existing policies directly"_, then
search for "S3" and choose `AmazonS3FullAccess`. You can also specify a [more
restrictive policy](#restrictive-iam-policies) as described later in this guide.

<figure>
	<img src="iam_1.png" alt="Screenshot of attaching policy to IAM user">
</figure>

Then click the _Next_ button twice and then click the _Create user_ button. This
will create the user and display credentials for programmatic access. You will
need to save the _"Access key ID"_ and _"Secret access key"_ for later use
in this guide.

<figure>
	<img src="iam_2.png" alt="Screenshot of AWS credentials for created user">
</figure>


### Create a bucket

Once you have a user created, go to the [S3 service](https://s3.console.aws.amazon.com/)
in the AWS Console. Click the _"Create bucket"_ button.

You'll need to choose a globally unique bucket name and choose a region to
store the bucket data.

<figure>
	<img src="s3_0.png" alt="Screenshot of AWS S3 create bucket UI">
</figure>

Then click the _"Create bucket"_ button at the bottom of the screen. Your bucket
has now been created.


## Usage

### Command line usage

You can replicate to S3 from the command line by setting environment variables
with the credentials you obtained after creating your IAM user:

```sh
export AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxxxxx
export AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/xxxxxxxxx
```

Then you can specify your bucket as a replica URL on the command line. For
example, you can replicate a database to your bucket with the following command.

Be sure to replace `/path/to/db` with the local file path of your database, replace
`BUCKETNAME` with the name of your bucket, and replace `PATHNAME` with the path
you want to store your replica within your bucket.

```sh
litestream replicate /path/to/db s3://BUCKETNAME/PATHNAME
```

You can later restore your database from S3 to a local `my.db` path with the
following command.

```sh
litestream restore -o my.db s3://BUCKETNAME/PATHNAME
```

### Configuration file usage

Litestream is typically run as a background service which uses a configuration
file. You can configure a replica for your database using the `url` format:

```yaml
access-key-id: AKIAxxxxxxxxxxxxxxxx
secret-access-key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/xxxxxxxxx

dbs:
  - path: /path/to/local/db
    replica:
      url: s3://BUCKETNAME/PATHNAME
```

Or you can expand your configuration into multiple fields:

```yaml
dbs:
  - path: /path/to/local/db
    replica:
      type: s3
      bucket: BUCKETNAME
      path:   PATHNAME
      region: us-east-1   # optional, set to your region
```

You may also specify your AWS credentials on a per-replica basis:

```yaml
dbs:
  - path: /path/to/local/db
    replica:
      url: s3://BUCKETNAME/PATHNAME
      access-key-id: AKIAxxxxxxxxxxxxxxxx
      secret-access-key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/xxxxxxxxx
```

{{< since version="0.5.0" >}} Litestream v0.5.0+ uses AWS SDK v2, which maintains compatibility with existing authentication methods.

## S3-Compatible Storage Providers

{{< since version="0.5.0" >}} Litestream supports custom S3-compatible storage endpoints using URL query parameters, enabling you to use any S3-compatible storage service directly from the command line without requiring a configuration file.

### URL Format

You can specify custom endpoints using query parameters in the replica URL:

```
s3://bucket/path?endpoint=<endpoint>&region=<region>&forcePathStyle=<true|false>&skipVerify=<true|false>
```

### Query Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `endpoint` | Custom S3-compatible endpoint URL | - |
| `region` | AWS region (may be required by some services) | `us-east-1` for custom endpoints |
| `forcePathStyle` | Use path-style addressing instead of virtual-hosted style | `true` for custom endpoints |
| `skipVerify` | Skip TLS certificate verification ⚠️ | `false` |

⚠️ **Security Warning**: Only use `skipVerify=true` for development or when you trust the self-signed certificate.

### Provider Examples

#### MinIO

MinIO is a popular self-hosted S3-compatible storage server.

```bash
# Replicate to MinIO
litestream replicate /path/to/db.sqlite \
  "s3://mybucket/db?endpoint=localhost:9000&forcePathStyle=true"

# Restore from MinIO
litestream restore -o restored.db \
  "s3://mybucket/db?endpoint=localhost:9000"
```

#### Tigris (Fly.io)

Tigris is a globally distributed S3-compatible storage service by Fly.io.

```bash
# Replicate to Tigris
litestream replicate /path/to/db.sqlite \
  "s3://my-tigris-bucket/db?endpoint=fly.storage.tigris.dev&region=auto"

# Restore from Tigris
litestream restore -o restored.db \
  "s3://my-tigris-bucket/db?endpoint=fly.storage.tigris.dev&region=auto"
```

#### Wasabi

Wasabi is a low-cost S3-compatible cloud storage service.

```bash
# Replicate to Wasabi
litestream replicate /path/to/db.sqlite \
  "s3://mybucket/db?endpoint=s3.wasabisys.com&region=us-east-1"

# Restore from Wasabi
litestream restore -o restored.db \
  "s3://mybucket/db?endpoint=s3.wasabisys.com&region=us-east-1"
```

#### Self-Hosted with Custom Certificate

For development environments or internal services with self-signed certificates:

```bash
# ⚠️ Development only - skips certificate verification
litestream replicate /path/to/db.sqlite \
  "s3://mybucket/db?endpoint=storage.internal.company.com&skipVerify=true"
```

### Supported Providers

The following S3-compatible providers have been tested with Litestream:

- **MinIO** - Self-hosted object storage server
- **Tigris** - Fly.io's globally distributed storage
- **Wasabi** - Low-cost cloud storage
- **Backblaze B2** - Using S3-compatible API
- **DigitalOcean Spaces** - Managed object storage
- **Scaleway Object Storage** - European cloud storage
- **Ceph** - With S3 gateway enabled
- Any other storage service implementing the S3 API

### Configuration File Alternative

You can also configure custom endpoints using the traditional configuration file approach:

```yaml
dbs:
  - path: /path/to/db.sqlite
    replicas:
      - type: s3
        bucket: mybucket
        path: db
        endpoint: localhost:9000
        region: us-east-1
        force-path-style: true
        skip-verify: false
        access-key-id: YOUR_ACCESS_KEY
        secret-access-key: YOUR_SECRET_KEY
```

### Backward Compatibility

All existing S3 URLs continue to work without modification. The new query parameter feature is purely additive:

```bash
# Standard AWS S3 - works exactly as before
litestream replicate /path/to/db.sqlite s3://mybucket/db

# AWS S3 with explicit region - also unchanged
litestream replicate /path/to/db.sqlite s3://mybucket.s3.us-west-2.amazonaws.com/db
```


## Restrictive IAM Policies

While specifying `AmazonS3FullAccess` is an easy way to get up and running, you
may want to specify a more restrictive policy in order to limit abuse if your
credentials are compromised.

### Replication Policy (Read-Write)

The following policy provides the minimum permissions needed for Litestream to
replicate databases to S3. This includes creating, updating, and deleting
replica files. Please replace `<BUCKET>` with the name of your bucket.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetBucketLocation",
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::<BUCKET>"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:GetObject"
            ],
            "Resource": [
                "arn:aws:s3:::<BUCKET>/*"
            ]
        }
    ]
}
```

### Restoration Policy (Read-Only)

If you only need to restore databases from existing S3 replicas (without
creating new replicas), you can use this more restrictive read-only policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetBucketLocation",
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::<BUCKET>"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject"
            ],
            "Resource": [
                "arn:aws:s3:::<BUCKET>/*"
            ]
        }
    ]
}
```

### Path-Specific Policies

For additional security, you can restrict access to a specific path within your
bucket by modifying the resource ARNs. For example, to limit access to the
`litestream/` directory:

```json
"Resource": [
    "arn:aws:s3:::<BUCKET>/litestream/*"
]
```

Thanks to [Martin](https://github.com/maluio) for contributing the original policy and
to [cariaso](https://github.com/benbjohnson/litestream/issues/76#issuecomment-783926359)
for additional policy insights.
