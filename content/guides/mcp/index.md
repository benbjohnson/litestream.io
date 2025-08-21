---
title: "MCP Integration Guide"
date: 2025-01-21T00:00:00Z
layout: docs
menu:
  docs:
    parent: "guides"
weight: 400
---

This guide walks you through setting up Litestream's Model Context Protocol (MCP) integration for AI-assisted database management. You'll learn how to configure the MCP server, connect AI clients, and implement common automation workflows.

## Prerequisites

- Litestream v0.4.0 or later with MCP support
- A configured Litestream database with at least one replica
- Basic understanding of HTTP APIs and JSON

## Step 1: Basic MCP Setup

### Configure Litestream

Create or update your `litestream.yml` configuration file:

```yaml
# Enable MCP server
mcp-addr: ":3001"

# Configure logging for better debugging
logging:
  level: info
  type: text

# Define your databases
dbs:
  - path: /var/lib/myapp.db
    replica:
      url: s3://my-litestream-backups/myapp
      access-key-id: ${AWS_ACCESS_KEY_ID}
      secret-access-key: ${AWS_SECRET_ACCESS_KEY}
      region: us-east-1
```

### Start Litestream with MCP

```bash
# Start Litestream with MCP enabled
litestream replicate -config litestream.yml

# You should see output similar to:
# INFO litestream version=v0.4.0 level=info
# INFO Starting MCP Streamable HTTP server addr=:3001
# INFO initialized db path=/var/lib/myapp.db
# INFO replicating to type=s3 sync-interval=1s bucket=my-litestream-backups
```

### Verify MCP Server

Test that the MCP server is running:

```bash
# Check server status
curl -i http://localhost:3001/

# List available tools
curl http://localhost:3001/mcp/tools

# Get system information
curl -X POST http://localhost:3001/mcp/tools/litestream_info \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Step 2: Explore MCP Tools

### Get System Overview

The `litestream_info` tool provides a comprehensive system status:

```bash
curl -X POST http://localhost:3001/mcp/tools/litestream_info \
  -H "Content-Type: application/json" \
  -d '{"config": "litestream.yml"}' | jq
```

Example response:

```json
{
  "text": "=== Litestream Status Report ===\n\nVersion Information:\nv0.4.0\n\nCurrent Config Path:\nlitestream.yml\n\nDatabases:\nPATH                    REPLICA\n/var/lib/myapp.db       s3\n\n..."
}
```

### List Databases

Query all configured databases:

```bash
curl -X POST http://localhost:3001/mcp/tools/litestream_databases \
  -H "Content-Type: application/json" \
  -d '{"config": "litestream.yml"}'
```

### Check Generations

View available backup generations for a database:

```bash
curl -X POST http://localhost:3001/mcp/tools/litestream_generations \
  -H "Content-Type: application/json" \
  -d '{"path": "/var/lib/myapp.db", "config": "litestream.yml"}'
```

### List Snapshots

Get snapshot information:

```bash
curl -X POST http://localhost:3001/mcp/tools/litestream_snapshots \
  -H "Content-Type: application/json" \
  -d '{"path": "/var/lib/myapp.db", "config": "litestream.yml"}'
```

## Step 3: Implement Database Restore

### Basic Restore Operation

```bash
# Restore to a new location
curl -X POST http://localhost:3001/mcp/tools/litestream_restore \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/var/lib/myapp.db",
    "o": "/tmp/restored.db",
    "config": "litestream.yml"
  }'
```

### Point-in-Time Restore

```bash
# Restore to a specific timestamp
curl -X POST http://localhost:3001/mcp/tools/litestream_restore \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/var/lib/myapp.db",
    "o": "/tmp/restored-pit.db",
    "timestamp": "2025-01-20T15:30:00Z",
    "config": "litestream.yml"
  }'
```

## Step 4: AI Client Integration

### Python Example

Create a Python script to interact with the MCP server:

```python
import requests
import json
from datetime import datetime

class LitestreamMCP:
    def __init__(self, base_url="http://localhost:3001", config_path=None):
        self.base_url = base_url
        self.config_path = config_path
    
    def call_tool(self, tool_name, params=None):
        """Call an MCP tool with optional parameters"""
        url = f"{self.base_url}/mcp/tools/{tool_name}"
        payload = params or {}
        
        if self.config_path:
            payload['config'] = self.config_path
            
        response = requests.post(
            url,
            headers={"Content-Type": "application/json"},
            json=payload
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"MCP call failed: {response.status_code} - {response.text}")
    
    def get_system_info(self):
        """Get comprehensive system information"""
        return self.call_tool("litestream_info")
    
    def list_databases(self):
        """List all configured databases"""
        return self.call_tool("litestream_databases")
    
    def get_generations(self, db_path):
        """Get generations for a specific database"""
        return self.call_tool("litestream_generations", {"path": db_path})
    
    def get_snapshots(self, db_path):
        """Get snapshots for a specific database"""
        return self.call_tool("litestream_snapshots", {"path": db_path})
    
    def restore_database(self, db_path, output_path, **kwargs):
        """Restore a database with optional parameters"""
        params = {"path": db_path, "o": output_path}
        params.update(kwargs)
        return self.call_tool("litestream_restore", params)

# Usage example
if __name__ == "__main__":
    mcp = LitestreamMCP(config_path="litestream.yml")
    
    # Get system status
    info = mcp.get_system_info()
    print("System Info:", info['text'])
    
    # List databases
    databases = mcp.list_databases()
    print("Databases:", databases)
    
    # Restore a database
    try:
        result = mcp.restore_database(
            "/var/lib/myapp.db",
            "/tmp/restored.db",
            if_db_not_exists=True
        )
        print("Restore completed:", result)
    except Exception as e:
        print("Restore failed:", e)
```

### JavaScript Example

```javascript
class LitestreamMCP {
    constructor(baseUrl = 'http://localhost:3001', configPath = null) {
        this.baseUrl = baseUrl;
        this.configPath = configPath;
    }

    async callTool(toolName, params = {}) {
        if (this.configPath) {
            params.config = this.configPath;
        }

        const response = await fetch(`${this.baseUrl}/mcp/tools/${toolName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            throw new Error(`MCP call failed: ${response.status} - ${await response.text()}`);
        }

        return await response.json();
    }

    async getSystemInfo() {
        return await this.callTool('litestream_info');
    }

    async listDatabases() {
        return await this.callTool('litestream_databases');
    }

    async getGenerations(dbPath) {
        return await this.callTool('litestream_generations', { path: dbPath });
    }

    async healthCheck() {
        try {
            const info = await this.getSystemInfo();
            return { healthy: true, info: info.text };
        } catch (error) {
            return { healthy: false, error: error.message };
        }
    }
}

// Usage
const mcp = new LitestreamMCP('http://localhost:3001', 'litestream.yml');

mcp.healthCheck().then(result => {
    if (result.healthy) {
        console.log('Litestream is healthy:', result.info);
    } else {
        console.error('Health check failed:', result.error);
    }
});
```

## Step 5: Production Deployment

### Security Configuration

For production deployments, secure your MCP server:

```yaml
# Bind to localhost only
mcp-addr: "127.0.0.1:3001"

# Or use a reverse proxy with authentication
# mcp-addr: ":3001"
```

### Nginx Reverse Proxy with Authentication

```nginx
server {
    listen 80;
    server_name litestream-mcp.example.com;
    
    location / {
        auth_basic "Litestream MCP";
        auth_basic_user_file /etc/nginx/.htpasswd;
        
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Docker Compose Example

```yaml
version: '3.8'

services:
  litestream:
    image: litestream/litestream:latest
    command: replicate
    environment:
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
    volumes:
      - ./litestream.yml:/etc/litestream.yml:ro
      - ./data:/data
      - ./backups:/backups
    ports:
      - "127.0.0.1:3001:3001"
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./htpasswd:/etc/nginx/.htpasswd:ro
    ports:
      - "80:80"
    depends_on:
      - litestream
    restart: unless-stopped
```

## Step 6: Monitoring and Alerting

### Health Check Script

```bash
#!/bin/bash

# health-check.sh
MCP_URL="http://localhost:3001"
CONFIG_PATH="/etc/litestream.yml"

# Test MCP connectivity
if ! curl -s -f "${MCP_URL}" > /dev/null; then
    echo "ERROR: MCP server is not responding"
    exit 1
fi

# Get system info
INFO=$(curl -s -X POST "${MCP_URL}/mcp/tools/litestream_info" \
    -H "Content-Type: application/json" \
    -d "{\"config\": \"${CONFIG_PATH}\"}")

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to get system information"
    exit 1
fi

echo "SUCCESS: Litestream MCP is healthy"
echo "${INFO}"
```

### Systemd Service Monitoring

```ini
# /etc/systemd/system/litestream-health.service
[Unit]
Description=Litestream MCP Health Check
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/health-check.sh
User=litestream
Group=litestream

# /etc/systemd/system/litestream-health.timer
[Unit]
Description=Run Litestream Health Check every 5 minutes
Requires=litestream-health.service

[Timer]
OnCalendar=*:0/5
Persistent=true

[Install]
WantedBy=timers.target
```

## Troubleshooting

### Common Issues

#### MCP Server Won't Start

```bash
# Check port availability
sudo netstat -tulpn | grep :3001

# Check Litestream logs
journalctl -u litestream -f
```

#### Tool Calls Fail

```bash
# Test with curl and check response
curl -v -X POST http://localhost:3001/mcp/tools/litestream_info \
  -H "Content-Type: application/json" \
  -d '{}' | jq
```

#### Permission Errors

```bash
# Check file permissions
ls -la /var/lib/myapp.db
ls -la /etc/litestream.yml

# Verify Litestream can read files
sudo -u litestream litestream databases -config /etc/litestream.yml
```

### Debug Mode

Enable debug logging for more verbose output:

```yaml
logging:
  level: debug
  type: text
```

## Next Steps

- [NATS Integration Guide]({{< ref "nats" >}}) - Set up NATS JetStream replicas
- [Configuration Reference]({{< ref "config" >}}) - Complete configuration options
- [AI Integration Patterns]({{< ref "ai-integration" >}}) - Advanced AI workflows

The MCP integration provides a powerful foundation for AI-assisted database management. Start with basic monitoring and gradually expand to automated operations as your confidence grows.
