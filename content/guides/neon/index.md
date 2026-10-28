---
title : "Replicating to Neon Object Storage"
date: 2026-10-27T00:00:00Z
layout: docs
menu:
  docs:
    parent: "replica-guides"
weight: 437
---

This guide will show you how to use [Neon Object Storage][neon-storage] as a
database replica path for Litestream. Neon Object Storage provides an
S3-compatible API that works with Litestream's S3 replica type. You will need a
[Neon][neon] account and the [Neon CLI][neon-cli] to complete this guide.

{{< since version="0.5.18" >}} Litestream automatically detects Neon storage
endpoints and configures the required settings for you.

Object storage is part of a Neon branch: each branch has its own storage
endpoint and its own buckets, so the endpoint you use selects the branch that
Litestream replicates to.


## Setup

### Install the Neon CLI

If you haven't already, install the Neon CLI by following the [installation
instructions][neon-cli-install]. Once installed, authenticate with your
account:

```sh
neon login
```

### Create a storage bucket

Create a bucket on the branch you want to replicate to:

```sh
neon buckets create BUCKETNAME --project-id PROJECT_ID --branch BRANCH
```

Buckets are private by default. Litestream doesn't need public access, so keep
the default.

### Generate S3 access keys

Neon issues S3 access keys as branch-scoped credentials. Create one with read
and write access to the branch's storage:

```sh
neon credentials create --name litestream --scope storage:read --scope storage:write \
  --project-id PROJECT_ID --branch BRANCH
```

The credential's `token_id` (`nak_...`) is your **Access Key ID** and
`s3_secret_access_key` is your **Secret Access Key**.

### Find your storage endpoint

Your S3 endpoint is specific to your branch and looks like this:

```
https://<BRANCH_ID>.storage.<CELL>.<REGION>.aws.neon.tech
```

For example, `https://br-cool-darkness-a1b2c3d4.storage.c-6.us-east-2.aws.neon.tech`.

To look it up, run `neon env pull --service object-storage`, which writes the
endpoint to `AWS_ENDPOINT_URL_S3` in your `.env` file along with a set of
access keys.

Give Litestream the endpoint through the replica URL or the `endpoint:` config
field shown below — not the `AWS_ENDPOINT_URL_S3` variable, which bypasses Neon
auto-detection (see [Environment Variables](#environment-variables)).


## Usage

### Command line usage

You can replicate to Neon Object Storage from the command line by setting
environment variables with your S3 access keys:

```sh
export AWS_ACCESS_KEY_ID=your-access-key-id
export AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

Then specify your bucket as a subdomain of your branch's storage endpoint.
Litestream splits the host into the bucket name, the endpoint, and the region:

```sh
litestream replicate /path/to/db s3://BUCKETNAME.BRANCH_ID.storage.CELL.REGION.aws.neon.tech/db
```

You can later restore your database from Neon Object Storage to a local `my.db`
path:

```sh
litestream restore -o my.db s3://BUCKETNAME.BRANCH_ID.storage.CELL.REGION.aws.neon.tech/db
```

You can also pass the endpoint as a query parameter. Always quote the URL in
this form, because your shell interprets the `?` as a glob pattern: `zsh`
aborts with `no matches found`, and other shells may mangle the URL.

```sh
litestream replicate /path/to/db "s3://BUCKETNAME/db?endpoint=BRANCH_ID.storage.CELL.REGION.aws.neon.tech"
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
      url: s3://BUCKETNAME.BRANCH_ID.storage.CELL.REGION.aws.neon.tech/db
```

Or you can expand your configuration into multiple fields:

```yaml
dbs:
  - path: /path/to/local/db
    replica:
      type: s3
      bucket: BUCKETNAME
      path:   db
      endpoint: BRANCH_ID.storage.CELL.REGION.aws.neon.tech
```

You may also specify your credentials on a per-replica basis:

```yaml
dbs:
  - path: /path/to/local/db
    replica:
      type: s3
      bucket: BUCKETNAME
      path:   db
      endpoint: BRANCH_ID.storage.CELL.REGION.aws.neon.tech
      access-key-id: your-access-key-id
      secret-access-key: your-secret-access-key
```


## Auto-Detection

When Litestream detects a `*.storage.*.neon.tech` endpoint, it automatically
applies the following settings:

- **Path-style addressing** — Sets `force-path-style: true` as required by
  Neon Object Storage, which doesn't serve virtual-hosted bucket URLs
- **Payload signing** — Enables `sign-payload: true` for request authentication
- **Region** — Takes the region from the host when the bucket is prefixed to
  the branch endpoint in the replica URL

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
      endpoint: BRANCH_ID.storage.CELL.REGION.aws.neon.tech
      region: REGION
      force-path-style: true
      sign-payload: true
```

Keep `force-path-style: true`. With virtual-hosted URLs, requests fail with a
TLS certificate error because Neon's certificate doesn't cover
`BUCKETNAME.BRANCH_ID.storage...` hostnames.


## Environment Variables

Litestream supports standard AWS environment variables for Neon S3
credentials:

| Variable | Description |
|----------|-------------|
| `AWS_ACCESS_KEY_ID` | Your Neon credential's token ID (starts with `nak_`) |
| `AWS_SECRET_ACCESS_KEY` | Your Neon credential's S3 secret access key |

{{< alert icon="⚠️" text="<strong>Do not set the endpoint with <code>AWS_ENDPOINT_URL_S3</code>.</strong> The AWS SDK honors it, but Litestream's own endpoint field stays empty, so <a href='#auto-detection'>Neon auto-detection</a> is skipped and requests use virtual-hosted URLs, which Neon doesn't support. Set the endpoint in the replica URL or the <code>endpoint:</code> field in your config file instead." >}}

You can also use the Litestream-specific environment variables:

| Variable | Description |
|----------|-------------|
| `LITESTREAM_ACCESS_KEY_ID` | Your Neon credential's token ID (starts with `nak_`) |
| `LITESTREAM_SECRET_ACCESS_KEY` | Your Neon credential's S3 secret access key |


## Branching

When you create a child branch, it starts with a copy of its parent's buckets
and objects. Running `litestream restore` against the child branch's storage
endpoint reads the replica as it was when the branch was created, and writes on
either branch stay isolated. This is a quick way to test a restore without
touching your production replica.

Credentials created on a parent branch also work on its child branches.


## See Also

- [S3-Compatible Services](/guides/s3-compatible) - Other S3-compatible providers
- [Troubleshooting](/docs/troubleshooting) - Common issues and solutions
- [Configuration Reference](/reference/config) - Complete configuration options


[neon]: https://neon.com/
[neon-storage]: https://neon.com/docs/storage/overview
[neon-cli]: https://neon.com/docs/cli
[neon-cli-install]: https://neon.com/docs/cli/install
