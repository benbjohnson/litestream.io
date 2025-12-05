---
title : "Command: mcp"
date: 2025-12-04T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 525
---

The `mcp` server provides [Model Context Protocol](https://modelcontextprotocol.io)
integration, allowing AI assistants like Claude to interact with Litestream databases
and replicas through a standardized HTTP API.

## Overview

{{< since version="0.5.0" >}} The Model Context Protocol (MCP) is an open standard
that enables AI applications to connect with external systems. Litestream's MCP server
exposes tools that allow AI assistants to:

- View database and replica status
- List available transaction log (LTX) files
- Restore databases to specific points in time
- Monitor replication health

This integration enables natural language interaction with your Litestream deployment,
making it easier to inspect backups, troubleshoot issues, and perform restores through
conversational AI interfaces.

## Configuration

Enable the MCP server by adding the `mcp-addr` setting to your configuration file:

```yaml
mcp-addr: ":3001"
```

The server starts automatically alongside the `replicate` command when this setting
is configured.

### Security Considerations

The MCP server provides access to database information and restore capabilities.
Follow these guidelines to secure your deployment:

**Bind to localhost for local access:**

```yaml
mcp-addr: "127.0.0.1:3001"
```

**Never expose directly to the public internet.** The MCP server does not include
built-in authentication. For remote access, use one of these approaches:

- SSH tunneling to forward the port securely
- A reverse proxy (Caddy, Nginx, Traefik) with authentication
- VPN or private networking
- Platform-specific proxies like Fly.io's `flyctl mcp proxy`

**Network isolation:** Run the MCP server on an internal network segment that only
authorized clients can access.

**Credential exposure:** The MCP server may expose replica URLs and connection
details. Ensure your deployment environment restricts access to authorized users.

## Available Tools

The MCP server exposes these tools for AI assistants:

### litestream_info

Returns system status and configuration information including version, configured
databases, and server settings.

**Parameters:** None

**Example response:**

```json
{
  "version": "v0.5.0",
  "config_path": "/etc/litestream.yml",
  "databases": 2
}
```

### litestream_databases

Lists all configured databases and their replica status, including replication
lag and last sync time.

**Parameters:** None

**Example response:**

```json
{
  "databases": [
    {
      "path": "/var/lib/myapp.db",
      "replica": {
        "type": "s3",
        "url": "s3://mybucket/myapp",
        "status": "syncing"
      }
    }
  ]
}
```

### litestream_ltx

Lists available LTX (Litestream Transaction Log) files for a database or replica.
Use this to inspect available restore points.

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `path` | Yes | Database file path or replica URL |
| `config` | No | Path to configuration file |
| `replica` | No | Replica name to filter by |
| `generation` | No | Generation name to filter by |

**Example response:**

```json
{
  "ltx_files": [
    {
      "generation": "abc123",
      "index": 1,
      "size": 4096,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

### litestream_restore

Restores a database to a specific point in time.

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `path` | Yes | Source database path or replica URL |
| `o` | No | Output file path (default: original path) |
| `config` | No | Path to configuration file |
| `replica` | No | Replica name to restore from |
| `generation` | No | Generation name to restore from |
| `index` | No | Restore up to specific WAL index |
| `timestamp` | No | Restore to specific point-in-time (RFC3339 format) |
| `parallelism` | No | Number of WAL files to download in parallel |
| `if_db_not_exists` | No | Skip if database already exists |
| `if_replica_exists` | No | Skip if no backups found |

**Example:** Restore to a specific timestamp:

```json
{
  "path": "/var/lib/myapp.db",
  "o": "/tmp/restored.db",
  "timestamp": "2025-01-15T10:00:00Z"
}
```

## Claude Desktop Integration

[Claude Desktop](https://claude.ai/download) can connect to Litestream's MCP server
to provide natural language access to your databases.

### Local Configuration

For a Litestream instance running on your local machine, configure Claude Desktop
to connect directly.

**1. Locate the configuration file:**

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

**2. Add the Litestream MCP server:**

```json
{
  "mcpServers": {
    "litestream": {
      "command": "curl",
      "args": [
        "-s",
        "http://localhost:3001/mcp/tools"
      ]
    }
  }
}
```

For direct HTTP transport (recommended), configure the URL endpoint:

```json
{
  "mcpServers": {
    "litestream": {
      "url": "http://localhost:3001"
    }
  }
}
```

**3. Restart Claude Desktop** to load the new configuration.

### Remote Configuration with Fly.io

When Litestream runs on a remote server like [Fly.io](https://fly.io), use a
secure proxy to avoid exposing the MCP server publicly.

**1. Deploy Litestream to Fly.io** with MCP enabled in your `fly.toml`:

```toml
[http_service]
  internal_port = 3001
```

**2. Configure Claude Desktop** to use the Fly.io proxy:

```json
{
  "mcpServers": {
    "litestream": {
      "command": "flyctl",
      "args": [
        "mcp",
        "proxy",
        "--url",
        "http://your-app-name.fly.dev",
        "--stream"
      ]
    }
  }
}
```

Replace `your-app-name.fly.dev` with your actual Fly.io app URL.

**Why use a proxy?** The Fly.io proxy creates an authenticated tunnel using your
Fly.io credentials, eliminating the need to expose the MCP endpoint publicly or
manage additional authentication.

### Other AI Assistants

MCP is an open standard supported by multiple AI assistants. Refer to
[modelcontextprotocol.io](https://modelcontextprotocol.io) for setup instructions
with other compatible clients.

## Example Use Cases

### Checking Replication Status

Ask your AI assistant:

> "What's the replication status of my databases?"

The assistant uses `litestream_databases` to retrieve and summarize the current
state of all configured replicas.

### Investigating Backup History

> "Show me the available restore points for myapp.db from the last 24 hours."

The assistant uses `litestream_ltx` to list transaction log files and presents
them in a readable format.

### Performing a Restore

> "Restore myapp.db to how it was yesterday at 2pm."

The assistant uses `litestream_restore` with the appropriate timestamp parameter
to restore the database.

### Troubleshooting Replication

> "Why might my S3 replica be behind? What should I check?"

The assistant combines information from `litestream_info` and `litestream_databases`
with its knowledge of Litestream to provide troubleshooting guidance.

## Troubleshooting

### Connection Refused

If Claude Desktop cannot connect to the MCP server:

1. Verify Litestream is running with MCP enabled:

   ```
   $ litestream replicate -config litestream.yml
   INFO litestream version=v0.5.0
   INFO Starting MCP server addr=:3001
   ```

2. Check the MCP server is accessible:

   ```
   $ curl http://localhost:3001/mcp/tools
   ```

3. Ensure the port matches your configuration.

### Tools Not Appearing

If tools don't appear in Claude Desktop:

1. Completely quit Claude Desktop (not just close the window).
2. Verify the configuration file syntax is valid JSON.
3. Restart Claude Desktop.
4. Check the Developer tab in Claude Desktop settings for error messages.

### Remote Connection Issues

For remote deployments:

1. Verify the proxy command is correct and `flyctl` is installed.
2. Ensure you're authenticated with Fly.io (`flyctl auth login`).
3. Check that the Fly.io app is running and healthy.

## API Reference

The MCP server implements the Model Context Protocol over HTTP. The protocol uses
JSON-RPC 2.0 for message exchange.

**Endpoints:**

| Endpoint | Description |
|----------|-------------|
| `GET /mcp/tools` | Lists available tools and their schemas |
| `POST /mcp/tools/{tool}` | Executes a specific tool |

**Protocol version:** The server implements MCP specification version 2024-11-05.

For complete protocol details, see the
[MCP specification](https://modelcontextprotocol.io/specification).
