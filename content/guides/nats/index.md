---
title: "NATS JetStream Integration"
date: 2025-01-21T00:00:00Z
layout: docs
menu:
  docs:
    parent: "guides"
weight: 350
---

Litestream supports NATS JetStream Object Store as a replica destination, providing a powerful, distributed, and highly available storage backend for your SQLite database replicas. This guide walks you through setting up NATS JetStream and configuring Litestream to use it for database replication.

## What is NATS JetStream?

NATS JetStream is a distributed streaming platform that provides persistent messaging and storage capabilities. The Object Store feature allows you to store large objects (like database files) with high availability, replication, and strong consistency guarantees.

### Benefits of NATS Object Store

- **High Availability**: Built-in clustering and failover capabilities
- **Geographic Distribution**: Replicate data across multiple regions
- **Strong Consistency**: ACID-compliant storage with configurable durability
- **Scalability**: Handles large files and high throughput
- **Security**: Built-in authentication, authorization, and encryption
- **Monitoring**: Rich metrics and observability features

## Prerequisites

- NATS Server 2.10.0 or later with JetStream enabled
- Litestream v0.4.0 or later with NATS support
- Basic understanding of NATS concepts (subjects, streams, consumers)

## Step 1: NATS Server Setup

### Install NATS Server

**Using Docker:**

```bash
# Run NATS server with JetStream enabled
docker run -d --name nats-server \
  -p 4222:4222 \
  -p 8222:8222 \
  nats:alpine \
  -js \
  -m 8222
```

**Using Binary:**

```bash
# Download and install NATS server
curl -L https://github.com/nats-io/nats-server/releases/latest/download/nats-server-v2.10.7-linux-amd64.zip -o nats-server.zip
unzip nats-server.zip
sudo mv nats-server-v2.10.7-linux-amd64/nats-server /usr/local/bin/
```

**Using Package Manager:**

```bash
# Ubuntu/Debian
curl -fSsL https://packagecloud.io/install/repositories/synadia/nats-server/script.deb.sh | sudo bash
sudo apt install nats-server

# CentOS/RHEL
curl -fSsL https://packagecloud.io/install/repositories/synadia/nats-server/script.rpm.sh | sudo bash
sudo yum install nats-server
```

### Configure NATS Server

Create a `nats-server.conf` configuration file:

```hocon
# Basic server configuration
server_name: nats-litestream
listen: 0.0.0.0:4222
http_port: 8222

# Enable JetStream
jetstream: {
  # Store directory
  store_dir: "/var/lib/nats/jetstream"
  
  # Memory and disk limits
  max_memory_store: 1GB
  max_file_store: 10GB
}

# Authentication (optional but recommended)
authorization: {
  users: [
    {
      user: "litestream"
      password: "secure-password"
      permissions: {
        publish: "litestream.>"
        subscribe: "litestream.>"
      }
    }
  ]
}

# Logging
log_file: "/var/log/nats/nats-server.log"
log_size_limit: 10MB
debug: false
trace: false
```

### Start NATS Server

```bash
# Start with configuration file
nats-server -c nats-server.conf

# Or with Docker
docker run -d --name nats-server \
  -p 4222:4222 \
  -p 8222:8222 \
  -v $(pwd)/nats-server.conf:/nats-server.conf \
  -v /var/lib/nats:/var/lib/nats \
  nats:alpine \
  -c /nats-server.conf
```

## Step 2: Create Object Store Bucket

### Install NATS CLI

```bash
# Using Go
go install github.com/nats-io/natscli/nats@latest

# Using curl
curl -sf https://binaries.nats.dev/nats-io/natscli/nats@latest | sh
sudo mv nats /usr/local/bin/
```

### Create Object Store Bucket

```bash
# Connect to NATS server
export NATS_URL=nats://litestream:secure-password@localhost:4222

# Create object store bucket for Litestream
nats object store add litestream-backups \
  --description "Litestream database replicas" \
  --storage file \
  --replicas 3 \
  --max-bucket-size 1GB \
  --ttl 30d

# Verify bucket creation
nats object store list
nats object store info litestream-backups
```

### Bucket Configuration Options

```bash
# Advanced bucket configuration
nats object store add litestream-backups \
  --description "Production Litestream replicas" \
  --storage file \              # Storage type: file or memory
  --replicas 3 \                # Number of replicas
  --max-bucket-size 10GB \      # Maximum bucket size
  --max-object-size 100MB \     # Maximum individual object size
  --ttl 0 \                     # Time to live (0 = never expire)
  --placement-cluster cluster1   # Placement constraints
```

## Step 3: Configure Litestream for NATS

### Basic NATS Configuration

Create or update your `litestream.yml` configuration:

```yaml
dbs:
  - path: /var/lib/myapp.db
    replica:
      type: nats
      url: nats://localhost:4222/litestream-backups
      username: litestream
      password: secure-password
```

### URL Format

The NATS URL format is:

```
nats://[username:password@]host:port/bucket-name
```

Examples:

```yaml
# Basic connection
url: nats://localhost:4222/my-bucket

# With authentication
url: nats://user:pass@nats.example.com:4222/my-bucket

# Custom port
url: nats://nats.example.com:14222/my-bucket
```

### Complete Configuration Example

```yaml
dbs:
  - path: /var/lib/myapp.db
    replica:
      type: nats
      url: nats://nats.example.com:4222/litestream-backups
      
      # Authentication options
      username: litestream
      password: secure-password
      
      # TLS configuration
      tls: true
      root-cas: 
        - /etc/ssl/certs/nats-ca.crt
      client-cert: /etc/ssl/certs/nats-client.crt
      client-key: /etc/ssl/private/nats-client.key
      
      # Connection options
      max-reconnects: -1        # Unlimited reconnections
      reconnect-wait: 2s        # Wait between reconnection attempts
      timeout: 10s              # Connection timeout
      
      # Replica options
      sync-interval: 1s         # How often to sync changes
      retention: 24h            # How long to keep old snapshots
      snapshot-interval: 1h     # How often to create snapshots
```

## Step 4: Authentication Methods

NATS supports multiple authentication methods. Choose the one that best fits your security requirements.

### Username/Password Authentication

```yaml
replica:
  type: nats
  url: nats://nats.example.com:4222/bucket
  username: litestream
  password: secure-password
```

### JWT Authentication

```yaml
replica:
  type: nats
  url: nats://nats.example.com:4222/bucket
  jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  seed: "SUACSL3UAHUDXKFSNVMJEGGJUQJNAIKBEM364ZYIJUUXI3YCJRYGSREX"
```

### Credentials File Authentication

```yaml
replica:
  type: nats
  url: nats://nats.example.com:4222/bucket
  creds: /etc/litestream/nats.creds
```

Create the credentials file:

```bash
# Generate user credentials
nats context save litestream \
  --server nats://nats.example.com:4222 \
  --creds /etc/litestream/nats.creds
```

### NKey Authentication

```yaml
replica:
  type: nats
  url: nats://nats.example.com:4222/bucket
  nkey: "UCNGL6BYVH3TGDZ7IQXMTWYNLF3FQQXXM3V2PLCNBXVHTZBPHRV3HQMT"
  # Note: Signature callback must be implemented in code
```

### Token Authentication

```yaml
replica:
  type: nats
  url: nats://nats.example.com:4222/bucket
  token: "my-secret-token"
```

## Step 5: TLS Configuration

### Basic TLS

```yaml
replica:
  type: nats
  url: nats://secure.nats.example.com:4222/bucket
  tls: true
```

### Custom CA Certificates

```yaml
replica:
  type: nats
  url: nats://nats.example.com:4222/bucket
  tls: true
  root-cas:
    - /etc/ssl/certs/nats-ca.crt
    - /etc/ssl/certs/internal-ca.crt
```

### Mutual TLS (mTLS)

```yaml
replica:
  type: nats
  url: nats://nats.example.com:4222/bucket
  tls: true
  root-cas:
    - /etc/ssl/certs/nats-ca.crt
  client-cert: /etc/ssl/certs/litestream.crt
  client-key: /etc/ssl/private/litestream.key
```

## Step 6: Testing and Validation

### Test NATS Connection

```bash
# Test basic connectivity
nats --server nats://localhost:4222 \
  --user litestream \
  --password secure-password \
  server check

# Test object store access
nats --server nats://localhost:4222 \
  --user litestream \
  --password secure-password \
  object store list
```

### Test Litestream Configuration

```bash
# Verify database configuration
litestream databases -config litestream.yml

# Test replication (dry run)
litestream replicate -config litestream.yml &
sleep 5
kill %1

# Check replica status
nats object store info litestream-backups
```

### Verify Replication

```bash
# Start replication
litestream replicate -config litestream.yml &

# Make some changes to your database
sqlite3 /var/lib/myapp.db "INSERT INTO test VALUES ('hello world');"

# Check that files appear in object store
nats object store list litestream-backups

# View detailed object information
nats object store ls litestream-backups
```

## Step 7: Production Deployment

### NATS Cluster Configuration

For production deployments, set up a NATS cluster:

```hocon
# nats-cluster.conf
cluster {
  name: "litestream-cluster"
  listen: 0.0.0.0:6222
  
  routes [
    nats://nats1.example.com:6222
    nats://nats2.example.com:6222
    nats://nats3.example.com:6222
  ]
}

jetstream: {
  store_dir: "/var/lib/nats/jetstream"
  max_memory_store: 2GB
  max_file_store: 100GB
}
```

### Litestream Configuration for Cluster

```yaml
dbs:
  - path: /var/lib/myapp.db
    replica:
      type: nats
      # Connect to multiple NATS servers
      url: nats://nats1.example.com:4222,nats2.example.com:4222,nats3.example.com:4222/litestream-backups
      username: litestream
      password: secure-password
      
      # Aggressive reconnection for cluster environments
      max-reconnects: -1
      reconnect-wait: 1s
      timeout: 30s
```

### Docker Compose Example

```yaml
version: '3.8'

services:
  nats1:
    image: nats:alpine
    command: 
      - nats-server
      - --cluster_name=litestream
      - --cluster=nats://0.0.0.0:6222
      - --routes=nats://nats2:6222,nats://nats3:6222
      - --js
    ports:
      - "4222:4222"
      - "6222:6222"
      - "8222:8222"
    volumes:
      - nats1_data:/var/lib/nats

  nats2:
    image: nats:alpine
    command: 
      - nats-server
      - --cluster_name=litestream
      - --cluster=nats://0.0.0.0:6222
      - --routes=nats://nats1:6222,nats://nats3:6222
      - --js
    volumes:
      - nats2_data:/var/lib/nats

  nats3:
    image: nats:alpine
    command: 
      - nats-server
      - --cluster_name=litestream
      - --cluster=nats://0.0.0.0:6222
      - --routes=nats://nats1:6222,nats://nats2:6222
      - --js
    volumes:
      - nats3_data:/var/lib/nats

  litestream:
    image: litestream/litestream:latest
    command: replicate
    volumes:
      - ./litestream.yml:/etc/litestream.yml:ro
      - ./data:/data
    depends_on:
      - nats1
      - nats2
      - nats3

volumes:
  nats1_data:
  nats2_data:
  nats3_data:
```

## Step 8: Monitoring and Observability

### NATS Monitoring

```bash
# Server information
nats server info

# Object store metrics
nats object store info litestream-backups

# Connection information
nats server check connection

# Monitor in real-time
nats events
```

### Prometheus Metrics

Enable Prometheus monitoring in NATS:

```hocon
http_port: 8222
server_tags: [
  "litestream",
  "production"
]
```

Access metrics at `http://nats-server:8222/metrics`

### Grafana Dashboard

Key metrics to monitor:

- Object store usage and capacity
- Connection count and health
- Message rates and latency
- JetStream memory and disk usage
- Cluster state and leader elections

## Comparison with Other Replica Types

| Feature | NATS | S3 | Azure Blob | GCS | File |
|---------|------|----|-----------|----|------|
| High Availability | ✅ Native clustering | ✅ Multi-AZ | ✅ Geo-redundant | ✅ Multi-region | ❌ Single point |
| Consistency | ✅ Strong | ✅ Eventual | ✅ Strong | ✅ Strong | ✅ Strong |
| Latency | 🔶 Network dependent | 🔶 Internet latency | 🔶 Internet latency | 🔶 Internet latency | ✅ Local disk |
| Cost | 🔶 Infrastructure cost | 🔶 Pay per use | 🔶 Pay per use | 🔶 Pay per use | ✅ No recurring cost |
| Scalability | ✅ Horizontal | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited | ❌ Disk limited |
| Security | ✅ Full control | ✅ Managed | ✅ Managed | ✅ Managed | 🔶 OS dependent |

## Troubleshooting

### Connection Issues

**NATS server not accessible:**

```bash
# Check server status
nats server ping --server nats://localhost:4222

# Check network connectivity
telnet localhost 4222

# Review server logs
tail -f /var/log/nats/nats-server.log
```

**Authentication failures:**

```bash
# Test credentials
nats --server nats://user:pass@localhost:4222 server info

# Check user permissions
nats auth ls --server nats://localhost:4222
```

### Object Store Issues

**Bucket not found:**

```bash
# List available buckets
nats object store list

# Create missing bucket
nats object store add litestream-backups
```

**Permission denied:**

```bash
# Check bucket permissions
nats object store info litestream-backups

# Test object operations
nats object store put litestream-backups test.txt test.txt
nats object store get litestream-backups test.txt
```

### Performance Issues

**Slow replication:**

```bash
# Check network latency
nats rtt --server nats://localhost:4222

# Monitor object store stats
nats object store info litestream-backups --verbose

# Adjust connection parameters
```

**High memory usage:**

```yaml
# Tune connection settings
max-reconnects: 10
reconnect-wait: 5s
timeout: 30s
```

## Security Best Practices

1. **Use TLS**: Always enable TLS for production deployments
2. **Strong Authentication**: Use JWT or mTLS for production
3. **Network Security**: Restrict access using firewalls
4. **Credentials Management**: Store credentials securely (not in config files)
5. **Regular Updates**: Keep NATS server updated
6. **Monitoring**: Monitor for suspicious activity
7. **Backup Verification**: Regularly test restore procedures

## Next Steps

- [MCP Integration Guide]({{< ref "mcp" >}}) - AI-assisted database management
- [Configuration Reference]({{< ref "config" >}}) - Complete configuration options
- [Migration Guide]({{< ref "migration" >}}) - Migrating from other replica types

NATS JetStream provides a robust, scalable solution for database replication with enterprise-grade features. The combination of high availability, strong consistency, and flexible deployment options makes it an excellent choice for production environments.
