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

For secure connections to your NATS server, Litestream supports several TLS
options including custom CA certificates and client certificates for mutual TLS
(mTLS) authentication.

#### Basic TLS

When connecting to a NATS server with TLS enabled, Litestream will
automatically enable TLS when you configure client certificates or custom CA
certificates:

```yaml
replica:
  type: nats
  url: nats://secure.nats.example.com:4222/BUCKETNAME
  root-cas:
    - /etc/ssl/certs/nats-ca.crt
```

#### Custom Root CA Certificates

If your NATS server uses certificates signed by a private or custom Certificate
Authority (CA), you need to provide the CA certificate so Litestream can verify
the server's identity:

```yaml
replica:
  type: nats
  url: nats://nats.example.com:4222/BUCKETNAME
  root-cas:
    - /etc/ssl/certs/custom-ca.pem
```

You can specify multiple CA certificates if needed:

```yaml
replica:
  type: nats
  url: nats://nats.example.com:4222/BUCKETNAME
  root-cas:
    - /etc/ssl/certs/ca1.pem
    - /etc/ssl/certs/ca2.pem
```

Common scenarios requiring custom CA certificates:

- Self-signed certificates for development or testing
- Internal PKI with private CA
- Intermediate CA certificates not in system trust store

#### Client Certificates (Mutual TLS)

For environments requiring mutual TLS (mTLS) authentication, where both the
client and server verify each other's identity, configure client certificates:

```yaml
replica:
  type: nats
  url: nats://nats.example.com:4222/BUCKETNAME
  client-cert: /etc/ssl/certs/litestream-client.pem
  client-key: /etc/ssl/private/litestream-client.key
```

Both `client-cert` and `client-key` must be specified together. The certificate
and key files should be in PEM format.

#### Full mTLS Configuration

A complete mutual TLS setup with both client authentication and custom CA:

```yaml
replica:
  type: nats
  url: nats://nats.example.com:4222/BUCKETNAME
  root-cas:
    - /etc/ssl/certs/nats-ca.pem
  client-cert: /etc/ssl/certs/litestream-client.pem
  client-key: /etc/ssl/private/litestream-client.key
```

#### Environment Variable Configuration

You can use environment variables for certificate paths:

```yaml
replica:
  type: nats
  url: nats://nats.example.com:4222/BUCKETNAME
  root-cas:
    - ${NATS_CA_CERT}
  client-cert: ${NATS_CLIENT_CERT}
  client-key: ${NATS_CLIENT_KEY}
```

#### Certificate Requirements

- **Format**: All certificates must be in PEM format
- **Permissions**: Certificate files should be readable by the Litestream process
- **Key permissions**: Private key files should have restricted permissions (e.g., `600`)
- **Validation**: Both client certificate and key must be provided together

#### NATS Server Configuration

For reference, your NATS server should be configured to require TLS and
optionally verify client certificates. Example NATS server configuration:

```conf
# Enable TLS
tls {
  cert_file: "/etc/nats/server-cert.pem"
  key_file: "/etc/nats/server-key.pem"
  ca_file: "/etc/nats/ca.pem"
  verify: true  # Require client certificates
}
```

See the [NATS TLS documentation](https://docs.nats.io/running-a-nats-service/configuration/securing_nats/tls)
for complete server configuration options.

#### Troubleshooting TLS

Common TLS issues and solutions:

**Certificate validation errors:**

- Verify the CA certificate matches what signed the server certificate
- Check certificate expiration dates
- Ensure hostname in certificate matches the server URL

**Client certificate rejected:**

- Confirm both `client-cert` and `client-key` are specified
- Verify the client certificate was signed by a CA trusted by the server
- Check file permissions on the key file

**Connection timeouts:**

- Verify the NATS server is listening on the expected port with TLS enabled
- Check firewall rules allow the connection
- Try increasing the `timeout` configuration option

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


## See Also

- [Troubleshooting](/docs/troubleshooting) - Common issues and solutions
- [Configuration Reference](/reference/config) - Complete configuration options
