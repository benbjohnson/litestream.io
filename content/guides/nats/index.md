---
title : "Replicating to NATS JetStream"
date: 2025-01-21T00:00:00Z
layout: docs
menu:
  docs:
    parent: "replica-guides"
weight: 470
---

This guide will show you how to use NATS JetStream Object Store as a replica
destination for Litestream. You will need a NATS server with JetStream enabled
to complete this guide.

## Setup

### Install NATS Server

**Using Docker:**

```bash
# Run NATS server with JetStream enabled
docker run -d --name nats-server \
  -p 4222:4222 \
  nats:alpine \
  -js
```

**Using Binary:**

```bash
# Download and install NATS server
curl -L https://github.com/nats-io/nats-server/releases/latest/download/nats-server-v2.10.7-linux-amd64.zip -o nats-server.zip
unzip nats-server.zip
sudo mv nats-server-v2.10.7-linux-amd64/nats-server /usr/local/bin/
```

### Create Object Store Bucket

Install the NATS CLI tool:

```bash
# Using Go
go install github.com/nats-io/natscli/nats@latest

# Using curl
curl -sf https://binaries.nats.dev/nats-io/natscli/nats@latest | sh
sudo mv nats /usr/local/bin/
```

Create an object store bucket for Litestream:

```bash
# Create object store bucket
nats object store add litestream-backups

# Verify bucket creation
nats object store list
```

## Usage

### Command line usage

You can replicate to NATS JetStream from the command line by setting your
NATS server URL via an environment variable:

```sh
export NATS_URL=nats://localhost:4222
```

You can then specify your bucket as a replica URL on the command line. For
example, you can replicate a database to your bucket with the following
command. Replace the placeholders for your server and bucket name.

```sh
litestream replicate /path/to/db nats://localhost:4222/BUCKETNAME
```

You can later restore your database from NATS to a local `my.db` path with
the following command:

```sh
litestream restore -o my.db nats://localhost:4222/BUCKETNAME
```

### Configuration file usage

Litestream is typically run as a background service which uses a configuration
file. You can configure a replica for your database using the `url` format:

```yaml
dbs:
  - path: /path/to/local/db
    replica:
      type: nats
      url: nats://localhost:4222/BUCKETNAME
```

### Authentication

If your NATS server requires authentication, you can specify credentials:

```yaml
dbs:
  - path: /path/to/local/db
    replica:
      type: nats
      url: nats://localhost:4222/BUCKETNAME
      username: myuser
      password: mypassword
```

Alternatively, you can use other authentication methods:

```yaml
# JWT authentication
replica:
  type: nats
  url: nats://localhost:4222/BUCKETNAME
  jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  seed: "SUACSL3UAHUDXKFSNVMJEGGJUQJNAIKBEM364ZYIJUUXI3YCJRYGSREX"

# Credentials file
replica:
  type: nats
  url: nats://localhost:4222/BUCKETNAME
  creds: /etc/litestream/nats.creds

# Token authentication
replica:
  type: nats
  url: nats://localhost:4222/BUCKETNAME
  token: "my-secret-token"
```

### TLS Configuration

For secure connections, enable TLS:

```yaml
replica:
  type: nats
  url: nats://secure.nats.example.com:4222/BUCKETNAME
  tls: true
```

You can also specify custom CA certificates or client certificates:

```yaml
replica:
  type: nats
  url: nats://nats.example.com:4222/BUCKETNAME
  tls: true
  root-cas:
    - /etc/ssl/certs/nats-ca.crt
  client-cert: /etc/ssl/certs/litestream.crt
  client-key: /etc/ssl/private/litestream.key
```

## Connection Options

You can configure connection behavior for reliability:

```yaml
replica:
  type: nats
  url: nats://nats.example.com:4222/BUCKETNAME
  max-reconnects: -1        # Unlimited reconnections
  reconnect-wait: 2s        # Wait between reconnection attempts
  timeout: 10s              # Connection timeout
```
