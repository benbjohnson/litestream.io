---
title : "Replicating to Supabase Storage"
date: 2026-02-20T00:00:00Z
layout: docs
menu:
  docs:
    parent: "replica-guides"
weight: 436
---

This guide will show you how to use [Supabase Storage][supabase-storage] as a
database replica path for Litestream. Supabase Storage provides an
S3-compatible API that works with Litestream's S3 replica type. You will need a
[Supabase][supabase] account to complete this guide.

{{< since version="0.5.9" >}} Litestream automatically detects Supabase
endpoints and configures the required settings for you.


## Setup

### Create a storage bucket

1. Log in to the [Supabase Dashboard][supabase-dashboard]
2. Select your project (or create a new one)
3. Navigate to **Storage** in the left sidebar
4. Click **New bucket** to create a bucket for your Litestream replicas

### Generate S3 access keys

Supabase provides S3-compatible access keys for each project:

1. In your project dashboard, go to **Settings** > **Storage**
2. Scroll to the **S3 Access Keys** section
3. Click **Generate new key** to create a new access key pair
4. Save the **Access Key ID** and **Secret Access Key** — you won't be able to
   see the secret key again

Your S3 endpoint will be:

```
https://<PROJECT_REF>.supabase.co/storage/v1/s3
```

Where `<PROJECT_REF>` is your project's reference ID, visible in your project's
URL or in **Settings** > **General**.


## Usage

### Command line usage

You can replicate to Supabase Storage from the command line by setting
environment variables with your S3 access keys:

```sh
export AWS_ACCESS_KEY_ID=your-access-key-id
export AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

Then specify your bucket with the Supabase endpoint as a replica URL:

```sh
litestream replicate /path/to/db s3://BUCKETNAME/db?endpoint=PROJECT_REF.supabase.co/storage/v1/s3
```

You can later restore your database from Supabase Storage to a local `my.db`
path:

```sh
litestream restore -o my.db s3://BUCKETNAME/db?endpoint=PROJECT_REF.supabase.co/storage/v1/s3
```

### Configuration file usage

Litestream is typically run as a background service which uses a configuration
file. You can configure a replica for your database using the `url` format:

```yaml
access-key-id: your-access-key-id
secret-access-key: your-secret-access-key

dbs:
  - path: /path/to/local/db
    replica:
      url: s3://BUCKETNAME/db?endpoint=PROJECT_REF.supabase.co/storage/v1/s3
```

Or you can expand your configuration into multiple fields:

```yaml
dbs:
  - path: /path/to/local/db
    replica:
      type: s3
      bucket: BUCKETNAME
      path:   db
      endpoint: PROJECT_REF.supabase.co/storage/v1/s3
```

You may also specify your credentials on a per-replica basis:

```yaml
dbs:
  - path: /path/to/local/db
    replica:
      type: s3
      bucket: BUCKETNAME
      path:   db
      endpoint: PROJECT_REF.supabase.co/storage/v1/s3
      access-key-id: your-access-key-id
      secret-access-key: your-secret-access-key
```


## Auto-Detection

When Litestream detects a `*.supabase.co` endpoint, it automatically applies
the following settings:

- **Path-style addressing** — Sets `force-path-style: true` as required by
  Supabase Storage's S3 API
- **Payload signing** — Enables `sign-payload: true` for request authentication

These settings are applied automatically and ensure reliable replication and
restore operations. You do not need to set them manually.


## Manual Override

If you need to override the auto-detected settings, you can specify them
explicitly in your configuration:

```yaml
dbs:
  - path: /path/to/local/db
    replica:
      type: s3
      bucket: BUCKETNAME
      path:   db
      endpoint: PROJECT_REF.supabase.co/storage/v1/s3
      force-path-style: true
      sign-payload: true
```


## Environment Variables

Litestream supports standard AWS environment variables for Supabase S3
credentials:

| Variable | Description |
|----------|-------------|
| `AWS_ACCESS_KEY_ID` | Your Supabase S3 access key |
| `AWS_SECRET_ACCESS_KEY` | Your Supabase S3 secret key |

You can also use the Litestream-specific environment variables:

| Variable | Description |
|----------|-------------|
| `LITESTREAM_ACCESS_KEY_ID` | Your Supabase S3 access key |
| `LITESTREAM_SECRET_ACCESS_KEY` | Your Supabase S3 secret key |


## See Also

- [S3-Compatible Services](/guides/s3-compatible) - Other S3-compatible providers
- [Troubleshooting](/docs/troubleshooting) - Common issues and solutions
- [Configuration Reference](/reference/config) - Complete configuration options


[supabase]: https://supabase.com/
[supabase-storage]: https://supabase.com/storage
[supabase-dashboard]: https://supabase.com/dashboard
