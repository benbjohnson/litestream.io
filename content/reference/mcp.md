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
integration, allowing AI assistants like Claude, Copilot, Cursor, and others to interact
with Litestream databases and replicas through a standardized HTTP API.

## Overview

{{< since version="0.5.0" >}} The Model Context Protocol (MCP) is an open standard
that enables AI applications to connect with external systems. Litestream's MCP server
exposes tools that allow AI assistants to:

- View database and replica status
- Monitor replication health and sync state
- List available transaction log (LTX) files
- Restore databases to specific points in time
- Reset local replication state
- Print version information

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

Returns a comprehensive summary of Litestream's current status including version,
configured databases, generations, and snapshots.

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `config` | No | Path to configuration file |

**Example output:**

```
=== Litestream Status Report ===

Version Information:
v0.5.0

Current Config Path:
/etc/litestream.yml

Databases:
path                 replica
/var/lib/myapp.db    s3

Generations:
Database: /var/lib/myapp.db
name        generation          updated
s3          abc123def456...     2025-01-15T10:30:00Z

Snapshots:
Database: /var/lib/myapp.db
replica  generation        index  size    created
s3       abc123def456...   0      4096    2025-01-15T10:00:00Z
```

### litestream_databases

Lists all configured databases and their replica status.

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `config` | No | Path to configuration file |

**Example output:**

```
path                 replica
/var/lib/myapp.db    s3
/var/lib/other.db    file
```

### litestream_status

{{< since version="0.5.8" >}} Returns replication health information for configured databases.

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `config` | No | Path to configuration file |

**Example output:**

```
path                 status    local_txid  wal_size
/var/lib/myapp.db    ok        42          8192
/var/lib/other.db    ok        17          4096
```

### litestream_ltx

Lists available LTX (Litestream Transaction Log) files for a database or replica.
Use this to inspect available restore points.

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `path` | Yes | Database file path or replica URL |
| `config` | No | Path to configuration file |

**Example output:**

```
min_txid          max_txid          size  created
0000000000000001  0000000000000001  657   2025-01-15T10:00:00Z
0000000000000002  0000000000000002  209   2025-01-15T10:15:00Z
0000000000000003  0000000000000003  663   2025-01-15T10:30:00Z
```

### litestream_restore

Restores a database to a specific point in time.

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `path` | Yes | Source database path or replica URL |
| `o` | No | Output file path (default: original path) |
| `config` | No | Path to configuration file |
| `txid` | No | Restore up to specific hex-encoded transaction ID |
| `timestamp` | No | Restore to specific point-in-time (RFC3339 format) |
| `parallelism` | No | Number of WAL files to download in parallel |
| `if_db_not_exists` | No | Skip if database already exists |
| `if_replica_exists` | No | Skip if no backups found |

**Example:** To restore to a specific timestamp, call the tool with:

```json
{
  "path": "/var/lib/myapp.db",
  "o": "/tmp/restored.db",
  "timestamp": "2025-01-15T10:00:00Z"
}
```

### litestream_version

Prints the Litestream version.

**Parameters:** None.

**Example output:**

```
v0.5.8
```

### litestream_reset

{{< since version="0.5.8" >}} Clears local Litestream replication state for a database. This forces
a fresh snapshot on the next sync.

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `path` | Yes | Database file path |
| `config` | No | Path to configuration file |

## AI Client Configuration

MCP is an open standard supported by many AI assistants and development tools.
This section covers configuration for popular clients.

### Local Configuration

For a Litestream instance running on your local machine, AI clients connect
directly via HTTP.

#### Claude Desktop

[Claude Desktop](https://claude.ai/download) uses a JSON configuration file.

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
      "url": "http://localhost:3001"
    }
  }
}
```

**3. Restart Claude Desktop** to load the new configuration.

#### Claude Code (CLI)

[Claude Code](https://docs.anthropic.com/en/docs/claude-code) supports adding MCP
servers via command line:

```bash
claude mcp add litestream --transport http --url http://localhost:3001
```

To verify the server was added:

```bash
claude mcp list
```

#### VS Code / GitHub Copilot

VS Code with GitHub Copilot supports MCP servers through settings.

Using the command line:

```bash
code --add-mcp '{"name":"litestream","type":"http","url":"http://localhost:3001"}' --profile default
```

Or through the Settings UI:

1. Open VS Code Settings (Cmd/Ctrl + ,)
2. Search for "MCP"
3. Add a new MCP server with:
   - Name: `litestream`
   - URL: `http://localhost:3001`

#### Cursor

[Cursor](https://cursor.sh) has built-in MCP support.

1. Open Cursor Settings
2. Navigate to **Features** → **MCP Servers**
3. Click **Add Server**
4. Configure:
   - Name: `litestream`
   - Type: HTTP
   - URL: `http://localhost:3001`

#### Codex (ChatGPT)

OpenAI's [Codex CLI](https://github.com/openai/codex) supports MCP servers:

```bash
codex mcp add litestream --url http://localhost:3001
```

Or configure manually in your Codex configuration file.

### Remote Configuration with Fly.io

When Litestream runs on a remote server like [Fly.io](https://fly.io), use a
secure proxy to avoid exposing the MCP server publicly.

**1. Deploy Litestream to Fly.io** with MCP enabled in your `fly.toml`:

```toml
[http_service]
  internal_port = 3001
```

**2. Configure your AI client** to use the Fly.io proxy.

For Claude Desktop:

```json
{
  "mcpServers": {
    "litestream": {
      "command": "flyctl",
      "args": [
        "mcp",
        "proxy",
        "--app",
        "your-app-name",
        "--stream"
      ]
    }
  }
}
```

Replace `your-app-name` with your actual Fly.io app name.

**Why use a proxy?** The Fly.io proxy creates an authenticated tunnel using your
Fly.io credentials, eliminating the need to expose the MCP endpoint publicly or
manage additional authentication.

### Other AI Clients

MCP is an open standard with growing support. For clients not listed above,
the general configuration pattern is:

- **Transport type:** HTTP
- **URL:** `http://localhost:3001` (local) or use a proxy for remote
- **No authentication required** (Litestream MCP doesn't have built-in auth)

Refer to [modelcontextprotocol.io](https://modelcontextprotocol.io) for setup
instructions with other compatible clients.

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

If your AI client cannot connect to the MCP server:

1. Verify Litestream is running with MCP enabled:

   ```
   $ litestream replicate -config litestream.yml
   INFO litestream version=v0.5.0
   INFO Starting MCP server addr=:3001
   ```

2. Ensure the port matches your configuration.

3. Check that the MCP server is listening on the expected address.

### Tools Not Appearing

If tools don't appear in your AI client:

1. Completely restart the AI client application.
2. Verify the configuration file syntax is valid.
3. Check client-specific logs or developer tools for error messages.
4. Ensure the Litestream MCP server is running and accessible.

### Remote Connection Issues

For remote deployments:

1. Verify the proxy command is correct and required CLI tools are installed.
2. Ensure you're authenticated with your hosting platform.
3. Check that the remote app is running and healthy.

## API Reference

The MCP server implements the [Model Context Protocol](https://modelcontextprotocol.io)
over HTTP using JSON-RPC 2.0 at the root endpoint (`/`).

**Session workflow:**

1. Send a POST request to `/` with `Content-Type: application/json`
2. Initialize a session with `{"method": "initialize", ...}`
3. Use the returned `Mcp-Session-Id` header for subsequent requests
4. List tools with `{"method": "tools/list", ...}`
5. Call tools with `{"method": "tools/call", "params": {"name": "tool_name", "arguments": {...}}, ...}`

**Protocol version:** The server implements MCP specification version 2024-11-05.

For complete protocol details, see the
[MCP specification](https://modelcontextprotocol.io/specification).
