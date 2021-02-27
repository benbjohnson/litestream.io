---
title : "Replicating to Backblaze B2"
date: 2021-02-27T00:00:00Z
layout: docs
menu:
  docs:
    parent: "guides"
weight: 350
---

This guide will show you how to use Backblaze B2 as a database replica path for
Litestream.

## Create a bucket

To begin, you'll need a bucket to store your data. If you don't already have one
set up in Backblaze, follow the steps below:

1. From your Backblaze dashboard, go to My Account > Buckets
1. Click "Create a Bucket"
1. Enter a unique name for "Bucket Unique Name" and leave the remaining fields as their defaults.
1. Click "Create a Bucket"
1. Copy the bucket details to the appropriate places in your `litestream.yml` file:

![Screenshot of bucket settings in Backblaze B2](bucket.png)

```yaml
dbs:
  - path: path-to-your-db-file
    replicas:
      - type: s3
        bucket: your-bucket-name
        path: db # change to whatever path you want
        endpoint: s3.us-west-000.backblazeb2.com # change this
        force-path-style: true
```

## Create a user

Next, create a user with programmatic access to the bucket you just created.

1. From your Backblaze dashboard, go to My Account > App Keys
1. Click "Add Application Key"
1. In "Name of Key" enter any unique name
1. Under "Allow access to Bucket(s)" select the bucket you created above.
1. Leave the remaining fields as their defaults.
1. Click "Create new key"
1. Copy the credentials to the appropriate places in your `litestream.yml` file
    * The `keyID` field is your `access-key-id`
    * The `applicationKey` field is your `secret-access-key`

![Screenshot of user keys settings in Backblaze](user-keys.png)

```yaml
access-key-id: your-backblaze-keyID
secret-access-key: your-backblaze-applicationKey
```

## Configuration file

Your final `litestream.yml` configuration file should look like this:

```yaml
access-key-id: your-backblaze-keyID
secret-access-key: your-backblaze-applicationKey

dbs:
  - path: path-to-your-db-file
    replicas:
      - type: s3
        bucket: your-bucket-name
        path: db # change to whatever path you want
        endpoint: s3.us-west-000.backblazeb2.com # change this
        force-path-style: true
```
