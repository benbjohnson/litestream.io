---
title : "Command: mcp"
date: 2025-01-21T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 525
---

> **⚠️ Note:** MCP support is available in Litestream v0.5.0+. This feature is not available in v0.3.13.

The `mcp` server provides Model Context Protocol integration, allowing AI assistants
to interact with Litestream databases and replicas through a standardized HTTP API.

## Configuration

Enable the MCP server by adding the `mcp-addr` setting to your configuration file:

```yaml
mcp-addr: ":3001"
```

## Security

For production deployments, bind to localhost only:

```yaml
mcp-addr: "127.0.0.1:3001"
```

## Available Tools

The MCP server exposes these tools for AI assistants:

### litestream_info
Get system status and configuration information.

### litestream_databases  
List all configured databases and their replica status.

### litestream_ltx
View available LTX files for a specific database.
- **Required**: `path` - Database file path or replica URL
- **Optional**: `config` - Path to configuration file
- **Optional**: `replica` - Replica name to filter by

### litestream_restore
Restore a database to a specific point in time.
- **Required**: `path` - Source database path or replica URL
- **Optional**: `o` - Output file path
- **Optional**: `config` - Path to configuration file
- **Optional**: `replica` - Replica name to restore from
- **Optional**: `generation` - Generation name to restore from
- **Optional**: `index` - Restore up to specific WAL index
- **Optional**: `timestamp` - Restore to specific point-in-time (RFC3339)
- **Optional**: `parallelism` - Number of WAL files to download in parallel
- **Optional**: `if_db_not_exists` - Return 0 if database already exists
- **Optional**: `if_replica_exists` - Return 0 if no backups found

### litestream_ltx
List all LTX (transaction log) files for a database or replica.
- **Required**: `path` - Database file path or replica URL
- **Optional**: `config` - Path to configuration file  
- **Optional**: `replica` - Replica name to filter by
- **Optional**: `generation` - Generation name to filter by

## AI Assistant Setup

Most modern AI assistants support MCP integration. Refer to [modelcontextprotocol.io](https://modelcontextprotocol.io) for setup instructions with your specific AI assistant.

## Example

Start Litestream with MCP enabled:

```
$ litestream replicate -config litestream.yml
INFO litestream version=v0.5.0
INFO Starting MCP server addr=:3001
INFO initialized db path=/var/lib/myapp.db
```

Test MCP connectivity:

```
$ curl http://localhost:3001/mcp/tools
```