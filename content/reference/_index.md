---
title : "Reference"
date: 2021-02-01T00:00:00Z
layout: docs
---

The Litestream command line provides several subcommands to help you manage
replication & recovery of your databases. This reference provides details
about the options available and different modes of operation.

## Configuration File

- [Configuration File](/reference/config) — YAML file for defining databases, replicas, and global settings.


## Commands

The `litestream` commands are:

- [`litestream databases`](/reference/databases) — Lists databases specified in config file.
- [`litestream ltx`](/reference/ltx) — List available LTX files for a database.
- [`litestream replicate`](/reference/replicate) — Runs a server to replicate databases.
- [`litestream reset`](/reference/reset) — Clears local Litestream state, forcing a fresh snapshot on the next sync.
- [`litestream restore`](/reference/restore) — Recovers database backup from a replica.
- [`litestream status`](/reference/status) — Reports local replication status for configured databases.
- [`litestream sync`](/reference/sync) — Forces immediate WAL-to-LTX sync for a database.
- [`litestream version`](/reference/version) — Prints the binary version.
- [`litestream wal`](/reference/wal) — List available WAL files for a database (deprecated).


## Daemon Control Commands

These commands communicate with a running `litestream replicate` daemon over the
IPC control socket. They require a running daemon with the
[control socket](/reference/config#control-socket) enabled; the socket is
disabled by default.

- [`litestream info`](/reference/info) — Shows daemon version, PID, and uptime.
- [`litestream list`](/reference/list) — Lists databases managed by the daemon.
- [`litestream register`](/reference/register) — Dynamically adds a database to the daemon.
- [`litestream unregister`](/reference/unregister) — Removes a database from the daemon.
- [`litestream start`](/reference/start) — Resumes replication for a stopped database.
- [`litestream stop`](/reference/stop) — Pauses replication for a database.


## MCP Server

- [MCP Server](/reference/mcp) — Model Context Protocol integration for AI assistants, enabled via the `replicate` command's `mcp-addr` config setting.


## VFS Extension

- [`litestream-vfs`](/reference/vfs) — Optional read-only VFS that serves replicas directly from object storage.


## IPC Endpoints

- [IPC Endpoints](/reference/ipc) — Unix socket endpoints for local status queries and profiling.


## Prometheus Metrics

- [Prometheus Metrics](/reference/metrics) — Reference for all metrics exported by Litestream.


## JSON Output

- [JSON Output Reference](/reference/json-output) — Stable schemas and conventions for `-json` CLI output.

