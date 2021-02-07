---
title : "Running as a systemd Service"
date: 2021-02-01T00:00:00Z
layout: docs
menu:
  docs:
    parent: "getting-started"
weight: 220
---

This tutorial will get you running Litestream as a systemd service on Debian-based
operating systems such as Ubuntu. Running as a background service means that
Litestream will always run in the background and restart automatically if the
server restarts.

This tutorial assumes you have read the [Replicating a Single Database](/getting-started/basic/)
tutorial already. We'll be using the `"mybkt.litestream.io"` bucket and AWS
credentials that you in that tutorial. This tutorial also assumes you are
comfortable with the command line and have followed the 
[Litestream install instructions for Debian systems](/install/debian/).


## Configuration

When running as a systemd service, we'll configure Litestream using a
configuration file instead of command line flags so we don't need to edit the
service definition. The default path for the Litestream configuration is
`/etc/litestream.yml`

Litestream monitors one or more _databases_ and each of those databases replicates
to one or more _replicas_. First, we'll create a basic configuration file. Make
sure to replace replace your AWS credentials with your own, the bucket name with
your bucket name, and update `MYUSER` to your local Linux username.

```
sudo cat > /etc/litestream.yml <<EOF
access-key-id:     AKIAxxxxxxxxxxxxxxxx
secret-access-key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/xxxxxxxxx

dbs:
  - path: /home/MYUSER/friends.db
    replicas:
      - url: s3://mybkt.litestream.io/friends.db
EOF

```

This configuration specifies that we want want Litestream to monitor our
`friends.db` database in our home directory and continuously replicate it to
our `mybkt.litestream.io` S3 bucket.

After changing our configuration, we'll need to restart the Litestream service
for it to register the change:

```
sudo systemctl restart litestream
```

## Writing to our database

TODO


## Recovering our database

TODO
