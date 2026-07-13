---
title : "Replicating to Tigris (Fly.io)"
date: 2025-12-03T00:00:00Z
layout: docs
menu:
  docs:
    parent: "replica-guides"
weight: 435
---

This guide will show you how to use [Tigris][tigris] as a database replica path
for Litestream. Tigris is [Fly.io][flyio]'s globally distributed S3-compatible
object storage. You will need a Fly.io account to complete this guide.

{{< since version="0.5.4" >}} Litestream automatically detects Tigris endpoints,
configures the required settings, and enables strong consistency for you.


## Setup

### Install the Fly CLI

If you haven't already, install the Fly CLI by following the [installation
instructions][fly-install]. Once installed, authenticate with your account:

```sh
fly auth login
```

### Create a Tigris bucket

Use the Fly CLI to create a new storage bucket:

```sh
fly storage create
```

You'll be prompted to choose a name for your bucket. After creation, Fly.io
will display your credentials:

```
Your project (my-bucket) is ready.

Set the following secrets on your app:
AWS_ACCESS_KEY_ID=tid_xxxxxxxxxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=tsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_ENDPOINT_URL_S3=https://fly.storage.tigris.dev
AWS_REGION=auto
BUCKET_NAME=my-bucket
```

Save these values for use in your Litestream configuration. Give Litestream the
endpoint through the `endpoint=` query parameter or the `endpoint:` config field
shown below — not the `AWS_ENDPOINT_URL_S3` variable, which bypasses Tigris
auto-detection (see [Environment Variables](#environment-variables)).


## Usage

### Command line usage

You can replicate to Tigris from the command line by setting environment
variables with the credentials from bucket creation:

```sh
export AWS_ACCESS_KEY_ID=tid_xxxxxxxxxxxxxxxxxxxx
export AWS_SECRET_ACCESS_KEY=tsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Then specify your bucket with the Tigris endpoint as a replica URL. Always
quote the URL, because your shell interprets the `?` and `&` characters: in
`zsh` the unquoted `?` fails glob expansion (`no matches found`), and in
`sh`/`bash` the `&` backgrounds Litestream with the URL truncated, running
`region=auto` as a separate command.

```sh
litestream replicate /path/to/db "s3://BUCKETNAME?endpoint=fly.storage.tigris.dev&region=auto"
```

You can later restore your database from Tigris to a local `my.db` path:

```sh
litestream restore -o my.db "s3://BUCKETNAME?endpoint=fly.storage.tigris.dev&region=auto"
```

### Configuration file usage

Litestream is typically run as a background service which uses a configuration
file. You can configure a replica for your database using the `url` format:

```yaml
access-key-id: tid_xxxxxxxxxxxxxxxxxxxx
secret-access-key: tsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

dbs:
  - path: /path/to/local/db
    replica:
      url: s3://BUCKETNAME?endpoint=fly.storage.tigris.dev&region=auto
```

Or you can expand your configuration into multiple fields:

```yaml
dbs:
  - path: /path/to/local/db
    replica:
      type: s3
      bucket: BUCKETNAME
      path:   db
      endpoint: fly.storage.tigris.dev
      region: auto
```

You may also specify your credentials on a per-replica basis:

```yaml
dbs:
  - path: /path/to/local/db
    replica:
      type: s3
      bucket: BUCKETNAME
      path:   db
      endpoint: fly.storage.tigris.dev
      region: auto
      access-key-id: tid_xxxxxxxxxxxxxxxxxxxx
      secret-access-key: tsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```


## Supported Endpoints

Litestream recognizes the following Tigris endpoints:

- `fly.storage.tigris.dev` — Primary Tigris endpoint
- `t3.storage.dev` — Alternate Tigris endpoint


## Auto-Detection

When Litestream detects a Tigris endpoint, it automatically applies
Tigris-specific settings:

- **Strong consistency** — Sets `X-Tigris-Consistent: true` header on all
  requests, ensuring read-after-write consistency
- **Payload signing** — Enables `sign-payload: true` as required by Tigris
- **Content-MD5 disabled** — Sets `require-content-md5: false` since Tigris
  doesn't support Content-MD5 headers on DELETE operations

These settings are applied automatically and ensure reliable replication and
restore operations.


## Manual Override

If you need to override the auto-detected settings for payload signing or
Content-MD5, you can specify them explicitly in your configuration:

```yaml
dbs:
  - path: /path/to/local/db
    replica:
      type: s3
      bucket: BUCKETNAME
      path:   db
      endpoint: fly.storage.tigris.dev
      region: auto
      sign-payload: true
      require-content-md5: false
```

Note that strong consistency (`X-Tigris-Consistent: true`) is always enabled
for Tigris endpoints and cannot be disabled.


## Environment Variables

Litestream supports standard AWS environment variables for Tigris credentials:

| Variable | Description |
|----------|-------------|
| `AWS_ACCESS_KEY_ID` | Your Tigris access key (starts with `tid_`) |
| `AWS_SECRET_ACCESS_KEY` | Your Tigris secret key (starts with `tsec_`) |
| `AWS_REGION` | Set to `auto` |

{{< alert icon="⚠️" text="**Do not set the endpoint with `AWS_ENDPOINT_URL_S3`.** The AWS SDK honors it, but Litestream's own endpoint field stays empty, so [Tigris auto-detection](#auto-detection) is skipped — the `X-Tigris-Consistent` header and Tigris-specific defaults are never applied. Set the endpoint with the `endpoint=` query parameter on the replica URL, or the `endpoint:` field in your config file, instead." >}}

You can also use the Litestream-specific environment variables:

| Variable | Description |
|----------|-------------|
| `LITESTREAM_ACCESS_KEY_ID` | Your Tigris access key |
| `LITESTREAM_SECRET_ACCESS_KEY` | Your Tigris secret key |


## Running on Fly.io

When deploying your application on Fly.io with Litestream, you can attach the
Tigris bucket directly to your app. The credentials will be automatically
injected as secrets:

```sh
fly storage create --app my-app
```

Then configure Litestream to use these environment variables in your
`litestream.yml`:

```yaml
dbs:
  - path: /data/myapp.db
    replica:
      url: s3://${BUCKET_NAME}?endpoint=fly.storage.tigris.dev&region=auto
```


## Global Distribution

Tigris automatically stores objects in the region where they're written. When
requested from other regions, objects are cached close to the requesting user.
This provides CDN-like behavior without additional configuration, which is
beneficial for distributed applications using Litestream for database
replication.


## See Also

- [S3-Compatible Services](/guides/s3-compatible) - Other S3-compatible providers
- [Troubleshooting](/docs/troubleshooting) - Common issues and solutions
- [Configuration Reference](/reference/config) - Complete configuration options


[tigris]: https://www.tigrisdata.com/
[flyio]: https://fly.io/
[fly-install]: https://fly.io/docs/flyctl/install/
