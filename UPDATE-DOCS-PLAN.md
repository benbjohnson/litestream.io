# Litestream Documentation Update Plan

This document outlines all the documentation updates needed to align the Litestream website with the latest code changes. The analysis is based on comparing the current documentation (last updated ~1 year ago) with the latest codebase.

## Executive Summary

The Litestream codebase has evolved significantly with major new features, upgraded cloud clients, configuration changes, and new commands. Key areas requiring documentation updates include:

1. **New MCP (Model Context Protocol) Support** - Complete integration for AI client access
2. **NATS JetStream Object Store Support** - New replica client type
3. **Major Cloud Client Upgrades** - AWS SDK v2, Azure SDK v2, Google Cloud updates
4. **Configuration Changes** - New config options and structure changes
5. **Command Changes** - LTX command replacing WAL, potential new MCP command
6. **New Features** - Age encryption enhancements, validation improvements

---

## 1. New Features Requiring Documentation

### 1.1 MCP (Model Context Protocol) Integration ⭐ NEW FEATURE

**Status**: Missing documentation entirely

**Files to Create/Update**:

- `content/docs/mcp.md` (NEW)
- `content/guides/mcp/` (NEW directory)
- `content/reference/config.md` (UPDATE)

**Content Needed**:

- What is MCP and why it's useful for Litestream
- How to configure MCP server in `litestream.yml`
- Available MCP tools: `litestream_info`, `litestream_databases`, `litestream_generations`, `litestream_restore`, `litestream_snapshots`, `litestream_ltx`
- Integration examples with AI clients
- Security considerations for MCP access
- Configuration reference for `mcp-addr` setting

**Config Changes to Document**:

```yaml
# Enable MCP server
mcp-addr: ":3001"
```

### 1.2 NATS JetStream Object Store Support ⭐ NEW FEATURE

**Status**: Missing documentation entirely

**Files to Create/Update**:

- `content/guides/nats/index.md` (NEW)
- `content/reference/config.md` (UPDATE)

**Content Needed**:

- Introduction to NATS JetStream Object Store as replica target
- Setup requirements (pre-created buckets)
- Authentication methods: JWT/Seed, Creds file, NKey, Username/Password, Token
- TLS configuration with client certificates and RootCAs
- Connection options and tuning parameters
- Example configurations for different authentication methods
- Comparison with other replica types

**Config Schema to Document**:

```yaml
dbs:
  - path: /var/lib/db
    replica:
      type: nats
      url: nats://my-nats-server:4222/my-bucket
      # Authentication options
      jwt: "eyJ..."
      seed: "SUAC..."
      # OR
      creds: "/path/to/creds.file"
      # OR  
      username: "user"
      password: "pass"
      # TLS options
      tls: true
      root-cas: ["/path/to/ca.crt"]
      client-cert: "/path/to/client.crt"
      client-key: "/path/to/client.key"
      # Connection options
      max-reconnects: -1
      reconnect-wait: 2s
      timeout: 10s
```

---

## 2. Major Cloud Client Updates

### 2.1 AWS S3 Client - AWS SDK v2 Upgrade ⚠️ BREAKING CHANGES

**Status**: Documentation may be outdated

**Files to Update**:

- `content/guides/s3/index.md`
- `content/reference/config.md`

**Changes to Document**:

- Migration from AWS SDK v1 to v2
- Updated authentication flow
- Enhanced error handling and retry logic
- Performance improvements
- Any new configuration options
- Breaking changes in behavior (if any)

### 2.2 Azure Blob Storage - Azure SDK v2 Upgrade ⚠️ BREAKING CHANGES

**Status**: Documentation may be outdated

**Files to Update**:

- `content/guides/azure/index.md`
- `content/reference/config.md`

**Changes to Document**:

- Migration to Azure SDK v2 ("Track 2")
- Updated authentication methods
- Enhanced blob operations
- New configuration options
- Performance improvements

### 2.3 Google Cloud Storage Updates

**Status**: Documentation may need updates

**Files to Update**:

- `content/guides/gcs/index.md`
- `content/reference/config.md`

**Changes to Document**:

- Any SDK updates or improvements
- Enhanced error handling
- Updated authentication flow

---

## 3. Configuration Documentation Updates

### 3.1 Main Configuration Reference

**File**: `content/reference/config.md`

**Missing/Outdated Sections**:

1. **MCP Configuration Section**:

   ```yaml
   # MCP server options
   mcp-addr: ":3001"  # Enable MCP server on this address
   ```

2. **NATS Replica Configuration**:
   - Complete section for NATS replica type
   - All authentication options
   - TLS configuration
   - Connection tuning parameters

3. **Enhanced Age Encryption**:
   - Document `age.identities` vs `age.recipients`
   - Key rotation procedures
   - Identity files support

4. **Updated Replica Types List**:
   Current docs show: `"abs"`, `"file"`, `"s3"`
   Should show: `"abs"`, `"file"`, `"s3"`, `"gs"`, `"sftp"`, `"nats"`

### 3.2 Snapshot Configuration Updates

**Status**: May need clarification

**Updates Needed**:

- Document new snapshot interval/retention behavior
- Clarify defaults vs explicit configuration
- Validation rules and error messages

---

## 4. Command Line Interface Updates

### 4.1 LTX Command (Renamed from WAL)

**Status**: Documentation may reference old command

**Files to Update**:

- `content/reference/wal.md` → Should be `ltx.md` or redirect
- All references to `litestream wal` should be `litestream ltx`
- Add deprecation notice for `wal` command

**Changes Needed**:

- Rename all `wal` references to `ltx`
- Update command examples
- Add backward compatibility notes

### 4.2 Potential MCP Command

**Status**: Investigate if standalone MCP command exists

**Investigation Needed**:

- Check if `litestream mcp` command should exist as standalone
- Currently MCP server only runs as part of `replicate` command
- May need dedicated MCP command documentation

---

## 5. New Guides Needed

### 5.1 AI Integration Guide

**File**: `content/guides/ai-integration/index.md` (NEW)

**Content**:

- How to use Litestream with AI development workflows
- MCP integration examples
- Common AI use cases for database replication
- Security considerations for AI access

### 5.2 NATS JetStream Setup Guide

**File**: `content/guides/nats/index.md` (NEW)

**Content**:

- Step-by-step NATS server setup
- Object Store bucket creation
- Authentication configuration
- Production deployment considerations
- Monitoring and troubleshooting

### 5.3 Migration Guide

**File**: `content/guides/migration/index.md` (NEW)

**Content**:

- Migrating from older Litestream versions
- Breaking changes in cloud clients
- Configuration file updates
- Command changes (wal → ltx)

---

## 6. Reference Documentation Updates

### 6.1 New Reference Pages Needed

1. **MCP Reference**: `content/reference/mcp.md`
   - Available MCP tools
   - Tool parameters and responses
   - Configuration options

2. **NATS Reference**: `content/reference/nats.md`
   - NATS-specific configuration
   - Authentication methods
   - Error codes and troubleshooting

### 6.2 Existing Reference Updates

1. **Databases Reference**: `content/reference/databases.md`
   - Update with new replica types
   - NATS configuration examples

2. **Replicate Reference**: `content/reference/replicate.md`
   - MCP server options
   - Updated configuration examples

---

## 7. Installation and Getting Started Updates

### 7.1 Installation Documentation

**Files to Update**:

- All installation guides in `content/install/`

**Updates Needed**:

- Verify latest release versions
- Update any system requirements
- New dependencies (if any)

### 7.2 Getting Started Guide

**File**: `content/getting-started/_index.md`

**Updates Needed**:

- Include MCP in getting started flow
- Update examples with latest command syntax
- Add NATS as an option alongside S3/Azure

---

## 8. Version and Compatibility Information

### 8.1 Version Information Updates

**Files to Update**:

- `hugo.yaml` - Update Litestream version parameter
- `content/reference/version.md` - Update version info

### 8.2 Compatibility Matrix

**New Content Needed**:

- Document version compatibility for major features
- Break down by replica client type
- Minimum requirements for MCP, NATS, etc.

---

## 9. Priority Implementation Order

### Phase 1: Critical New Features (High Priority)

1. ✅ **MCP Documentation Suite**
   - `content/docs/mcp.md`
   - `content/guides/mcp/index.md`
   - Configuration reference updates

2. ✅ **NATS Integration Documentation**
   - `content/guides/nats/index.md`
   - Configuration reference updates

3. ✅ **Configuration Reference Overhaul**
   - Update `content/reference/config.md` with all new options

### Phase 2: Updated Features (Medium Priority)

1. ✅ **Command Updates**
   - LTX command documentation
   - Deprecation notices for WAL command

2. ✅ **Cloud Client Updates**
   - Update S3, Azure, GCS guides with SDK changes

### Phase 3: Supporting Documentation (Low Priority)

1. ✅ **New Guides**
   - AI Integration guide
   - Migration guide
   - Enhanced troubleshooting

2. ✅ **Reference Cleanup**
   - New reference pages
   - Updated examples throughout

---

## 10. Quality Assurance Checklist

### Before Publishing Updates:

- [ ] Test all configuration examples against latest code
- [ ] Verify all command examples work with current binary
- [ ] Check internal links and cross-references
- [ ] Validate YAML syntax in configuration examples
- [ ] Test MCP examples with actual AI clients
- [ ] Verify cloud provider setup instructions
- [ ] Run documentation through markup linter
- [ ] Update site navigation/menus for new pages

### Ongoing Maintenance:

- [ ] Set up process to sync docs with code releases
- [ ] Create templates for documenting new features
- [ ] Establish review process for technical accuracy
- [ ] Monitor for user feedback on new documentation

---

## 11. Implementation Notes

### Technical Considerations:

- Some features may still be in development/testing
- MCP integration might need actual testing with AI clients
- NATS integration requires NATS server setup for testing
- Cloud client changes should be tested with actual cloud services

### Resource Requirements:

- Access to all supported cloud services for testing
- NATS server setup for testing
- AI client for MCP testing
- Time for thorough testing and validation

### Coordination Needs:

- Sync with Ben Johnson on feature priorities
- Coordinate with anyone maintaining the website
- Consider community input on documentation clarity

---

This plan provides a comprehensive roadmap for updating the Litestream documentation to match the current state of the codebase. The priority order allows for incremental implementation while ensuring the most important new features are documented first.
