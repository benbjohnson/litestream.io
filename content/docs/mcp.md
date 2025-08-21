---
title: "MCP (Model Context Protocol)"
date: 2025-01-21T00:00:00Z
layout: docs
menu:
  docs:
    parent: "docs"
weight: 150
---

Litestream provides built-in support for the Model Context Protocol (MCP), enabling AI assistants and other intelligent tools to directly interact with your Litestream databases and replicas. This powerful integration allows AI systems to query database status, manage replicas, and perform restore operations through a standardized protocol.

## What is MCP?

Model Context Protocol (MCP) is an open standard that enables AI assistants to securely connect to external data sources and tools. Litestream's MCP server exposes key database operations through a REST API that AI clients can use to:

- Monitor database replication status
- Query available generations and snapshots
- Perform database restores
- Access LTX (transaction log) files
- Get comprehensive system information

## Key Benefits

- **AI-Powered Database Management**: Enable AI assistants to help with database operations
- **Automated Monitoring**: AI can proactively monitor replication health
- **Intelligent Restore Operations**: AI can suggest and execute optimal restore strategies
- **Development Workflow Integration**: Seamlessly integrate database operations into AI-assisted development

## Quick Start

### 1. Enable MCP Server

Add the MCP server configuration to your `litestream.yml`:

```yaml
# Enable MCP server
mcp-addr: ":3001"

dbs:
  - path: /var/lib/myapp.db
    replica:
      url: s3://my-bucket/myapp
```

### 2. Start Litestream with MCP

```bash
litestream replicate
```

The MCP server will start alongside the replication process and be available at `http://localhost:3001`.

### 3. Test MCP Connectivity

You can test the MCP server using any HTTP client:

```bash
curl http://localhost:3001/mcp/tools
```

## Available MCP Tools

Litestream provides six core MCP tools for AI integration:

### litestream_info

Get comprehensive status information about all databases and replicas.

```json
{
  "name": "litestream_info",
  "description": "Get a comprehensive summary of Litestream's current status including databases, generations, snapshots, and version information.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "config": {
        "type": "string",
        "description": "Path to the Litestream config file. Optional."
      }
    }
  }
}
```

### litestream_databases

List all databases and their replica configurations.

```json
{
  "name": "litestream_databases",
  "description": "List databases and their replicas as defined in the Litestream config file.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "config": {
        "type": "string",
        "description": "Path to the Litestream config file. Optional."
      }
    }
  }
}
```

### litestream_generations

List all available generations for a database or replica.

```json
{
  "name": "litestream_generations",
  "description": "List all generations for a database or replica.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "Database path or replica URL."
      },
      "config": {
        "type": "string",
        "description": "Path to the Litestream config file. Optional."
      },
      "replica": {
        "type": "string",
        "description": "Replica name to filter by. Optional."
      }
    },
    "required": ["path"]
  }
}
```

### litestream_snapshots

List all available snapshots for a database or replica.

```json
{
  "name": "litestream_snapshots",
  "description": "List all snapshots for a database or replica.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "Database path or replica URL."
      },
      "config": {
        "type": "string",
        "description": "Path to the Litestream config file. Optional."
      },
      "replica": {
        "type": "string",
        "description": "Replica name to filter by. Optional."
      }
    },
    "required": ["path"]
  }
}
```

### litestream_restore

Restore a database from a replica.

```json
{
  "name": "litestream_restore",
  "description": "Restore a database from a Litestream replica.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "Database path or replica URL."
      },
      "o": {
        "type": "string",
        "description": "Output path for the restored database. Optional."
      },
      "config": {
        "type": "string",
        "description": "Path to the Litestream config file. Optional."
      },
      "replica": {
        "type": "string",
        "description": "Replica name to restore from. Optional."
      },
      "generation": {
        "type": "string",
        "description": "Generation name to restore from. Optional."
      },
      "index": {
        "type": "string",
        "description": "Restore up to a specific WAL index. Optional."
      },
      "timestamp": {
        "type": "string",
        "description": "Restore to a specific point-in-time (RFC3339). Optional."
      },
      "parallelism": {
        "type": "string",
        "description": "Number of WAL files to download in parallel. Optional."
      },
      "if_db_not_exists": {
        "type": "boolean",
        "description": "Return 0 if the database already exists. Optional."
      },
      "if_replica_exists": {
        "type": "boolean",
        "description": "Return 0 if no backups found. Optional."
      }
    },
    "required": ["path"]
  }
}
```

### litestream_ltx

List all LTX (transaction log) files for a database or replica.

```json
{
  "name": "litestream_ltx",
  "description": "List all LTX files for a database or replica.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "Database path or replica URL."
      },
      "config": {
        "type": "string",
        "description": "Path to the Litestream config file. Optional."
      },
      "replica": {
        "type": "string",
        "description": "Replica name to filter by. Optional."
      },
      "generation": {
        "type": "string",
        "description": "Generation name to filter by. Optional."
      }
    },
    "required": ["path"]
  }
}
```

## Configuration

### Basic Configuration

The minimal configuration to enable MCP requires only the `mcp-addr` setting:

```yaml
# Enable MCP server on port 3001
mcp-addr: ":3001"

dbs:
  - path: /var/lib/myapp.db
    replica:
      url: s3://my-bucket/myapp
```

### Custom Port and Interface

You can specify a custom port and bind interface:

```yaml
# Bind to specific interface and port
mcp-addr: "127.0.0.1:8080"

# Bind to all interfaces
mcp-addr: "0.0.0.0:3001"
```

### Security Considerations

The MCP server provides access to sensitive database operations. Consider these security practices:

1. **Network Access**: By default, bind only to localhost (`127.0.0.1`) unless remote access is required.
2. **Firewall Rules**: Ensure the MCP port is not exposed to untrusted networks.
3. **Authentication**: Consider implementing reverse proxy authentication if exposing the MCP server.
4. **Monitoring**: Monitor MCP access logs for unusual activity.

## Integration Examples

### With AI Development Tools

```bash
# Start Litestream with MCP enabled
litestream replicate -config /etc/litestream.yml

# AI assistant can now query database status
curl -X POST http://localhost:3001/mcp/tools/litestream_info \
  -H "Content-Type: application/json" \
  -d '{"config": "/etc/litestream.yml"}'
```

### Automated Monitoring Script

```python
import requests
import json

def check_litestream_health():
    response = requests.post(
        'http://localhost:3001/mcp/tools/litestream_info',
        json={"config": "/etc/litestream.yml"}
    )
    
    if response.status_code == 200:
        info = response.json()
        print("Litestream Status:", info)
        return True
    else:
        print("MCP server unavailable")
        return False

if __name__ == "__main__":
    check_litestream_health()
```

## Troubleshooting

### MCP Server Not Starting

If the MCP server fails to start:

1. **Check Port Availability**: Ensure the specified port is not in use
2. **Verify Configuration**: Check that `mcp-addr` is properly formatted
3. **Review Logs**: Look for error messages in Litestream output

### Connection Issues

If AI clients cannot connect to the MCP server:

1. **Network Connectivity**: Verify the server is listening on the correct interface
2. **Firewall**: Ensure the MCP port is accessible
3. **Service Status**: Confirm Litestream is running with MCP enabled

### Tool Execution Failures

If MCP tools return errors:

1. **Path Validation**: Ensure database paths exist and are accessible
2. **Permissions**: Verify Litestream has read/write access to databases
3. **Configuration**: Check that the config file path is correct

## Best Practices

1. **Start Simple**: Begin with basic MCP integration before adding complex workflows
2. **Monitor Usage**: Track which tools are being called and their success rates
3. **Secure Access**: Implement appropriate network security measures
4. **Test Thoroughly**: Validate AI-driven operations in development environments first
5. **Document Workflows**: Clearly document how AI tools interact with your databases

## Next Steps

- [NATS Integration Guide]({{< ref "nats" >}}) - Learn about NATS JetStream replica support
- [Configuration Reference]({{< ref "config" >}}) - Complete configuration documentation
- [Troubleshooting]({{< ref "troubleshooting" >}}) - Common issues and solutions

The MCP integration opens up powerful possibilities for AI-assisted database management. Start with simple monitoring and gradually expand to more complex automated operations as you become comfortable with the system.
