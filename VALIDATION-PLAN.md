# Phase 1 Documentation Validation Plan

This document provides a comprehensive plan for manually validating the Phase 1 documentation updates before publishing. The validation ensures technical accuracy, usability, and consistency.

## Branch Information

- **Branch**: `docs/phase-1-mcp-nats-config`
- **Covers**: MCP documentation, NATS integration, configuration reference updates
- **Related GitHub Issue**: #78

## 1. MCP Documentation Validation

### 1.1 MCP Server Functionality

**Test Goal**: Verify MCP server actually works as documented

**Prerequisites**:

- Latest Litestream binary with MCP support
- Test database file
- Basic configuration file

**Test Steps**:

1. **Basic MCP Server Startup**

   ```bash
   # Create test config
   cat > test-litestream.yml << EOF
   mcp-addr: ":3001"
   dbs:
     - path: ./test.db
       replica:
         path: ./backup
   EOF
   
   # Create test database
   sqlite3 test.db "CREATE TABLE test (id INTEGER PRIMARY KEY, data TEXT); INSERT INTO test (data) VALUES ('hello world');"
   
   # Start Litestream with MCP
   litestream replicate -config test-litestream.yml &
   
   # Test MCP server responds
   curl http://localhost:3001/
   ```

2. **Test Each MCP Tool**

   ```bash
   # Test litestream_info
   curl -X POST http://localhost:3001/mcp/tools/litestream_info \
     -H "Content-Type: application/json" \
     -d '{"config": "test-litestream.yml"}'
   
   # Test litestream_databases  
   curl -X POST http://localhost:3001/mcp/tools/litestream_databases \
     -H "Content-Type: application/json" \
     -d '{"config": "test-litestream.yml"}'
   
   # Test litestream_snapshots
   curl -X POST http://localhost:3001/mcp/tools/litestream_snapshots \
     -H "Content-Type: application/json" \
     -d '{"path": "./test.db", "config": "test-litestream.yml"}'
   
   # Test litestream_restore
   curl -X POST http://localhost:3001/mcp/tools/litestream_restore \
     -H "Content-Type: application/json" \
     -d '{"path": "./test.db", "o": "./restored.db", "config": "test-litestream.yml"}'
   ```

3. **Validate Response Formats**
   - Check that all tools return proper JSON responses
   - Verify error handling for invalid parameters
   - Confirm tool schemas match documentation

**Expected Results**:

- MCP server starts and responds on port 3001
- All 6 tools execute successfully and return expected data
- Error responses are informative and properly formatted

**Documentation Issues to Check**:

- [ ] Tool parameter names match actual implementation
- [ ] JSON schema examples are accurate
- [ ] Response format examples reflect real output
- [ ] Configuration examples work as shown

### 1.2 MCP Integration Guide Code Examples

**Test Goal**: Verify all code examples in the MCP guide work correctly

**Test Steps**:

1. **Python Example Validation**

   ```bash
   # Save the Python example from the docs to test_mcp.py
   # Run it against the test MCP server
   python3 test_mcp.py
   ```

2. **JavaScript Example Validation**

   ```bash
   # Save the JavaScript example to test_mcp.js
   # Test with Node.js
   node test_mcp.js
   ```

3. **Configuration Examples**
   - Test each configuration example shown in the guide
   - Verify they start successfully
   - Check for any syntax errors or missing fields

**Expected Results**:

- All code examples execute without errors
- API calls return expected data
- Configuration examples are syntactically correct

**Documentation Issues to Check**:

- [ ] All imports/dependencies are correct
- [ ] API endpoints and parameters are accurate
- [ ] Error handling examples work as expected
- [ ] Configuration syntax is valid YAML

## 2. NATS Integration Validation

### 2.1 NATS Server Setup

**Test Goal**: Verify NATS setup instructions work for fresh installations

**Prerequisites**:

- Clean test environment (VM or container)
- No existing NATS installation

**Test Steps**:

1. **Follow Installation Instructions**
   - Test Docker installation method
   - Test binary installation method
   - Test package manager installation (if possible)

2. **Configuration File Testing**

   ```bash
   # Use the nats-server.conf example from the docs
   nats-server -c nats-server.conf
   
   # Verify server starts and JetStream is enabled
   nats server info --server nats://localhost:4222
   ```

3. **Object Store Bucket Creation**

   ```bash
   # Follow the bucket creation steps exactly as documented
   export NATS_URL=nats://litestream:secure-password@localhost:4222
   nats object store add litestream-backups --description "Test bucket"
   nats object store list
   ```

**Expected Results**:

- NATS server starts successfully with JetStream enabled
- Object store bucket is created without errors
- All commands work as documented

**Documentation Issues to Check**:

- [ ] Installation commands are correct for current versions
- [ ] Configuration file syntax is valid
- [ ] Bucket creation parameters work as specified
- [ ] Authentication setup instructions are accurate

### 2.2 Litestream NATS Integration

**Test Goal**: Verify Litestream can successfully replicate to NATS

**Test Steps**:

1. **Basic NATS Configuration**

   ```yaml
   # Test the basic configuration example
   dbs:
     - path: ./test.db
       replica:
         type: nats
         url: nats://localhost:4222/litestream-backups
         username: litestream
         password: secure-password
   ```

2. **Authentication Methods**
   - Test username/password authentication
   - Test credentials file authentication (if possible)
   - Test JWT authentication (if possible)

3. **TLS Configuration**

   ```yaml
   # Test TLS configuration example
   replica:
     type: nats
     url: nats://localhost:4222/litestream-backups
     tls: true
     # Note: May need self-signed certs for testing
   ```

4. **Replication Testing**

   ```bash
   # Start replication
   litestream replicate -config test-nats.yml &
   
   # Make database changes
   sqlite3 test.db "INSERT INTO test (data) VALUES ('nats test');"
   
   # Check objects appear in NATS
   nats object store ls litestream-backups
   
   # Test restore
   litestream restore -config test-nats.yml test.db restored-from-nats.db
   ```

**Expected Results**:

- Litestream successfully connects to NATS
- Files appear in NATS object store
- Restore operation works correctly
- All authentication methods function as documented

**Documentation Issues to Check**:

- [ ] URL format is correct
- [ ] Authentication parameter names match implementation
- [ ] TLS configuration options are accurate
- [ ] Connection tuning parameters work as expected

## 3. Configuration Reference Validation

### 3.1 New Configuration Options

**Test Goal**: Verify all new configuration options are documented accurately

**Test Steps**:

1. **MCP Configuration**

   ```yaml
   # Test mcp-addr parameter
   mcp-addr: ":3001"
   mcp-addr: "127.0.0.1:8080"
   mcp-addr: "0.0.0.0:3001"
   ```

2. **Global Settings**

   ```yaml
   # Test new global sections
   levels:
     - interval: 5m
     - interval: 1h
   
   snapshot:
     interval: 1h
     retention: 24h
   
   exec: "echo 'test command'"
   ```

3. **Database-Level Options**

   ```yaml
   # Test all database configuration options
   dbs:
     - path: ./test.db
       meta-path: ./test-meta
       monitor-interval: 500ms
       checkpoint-interval: 30s
       busy-timeout: 5s
       min-checkpoint-page-count: 500
       max-checkpoint-page-count: 5000
       replica:
         path: ./backup
   ```

4. **Replica Type Testing**
   - Test each replica type configuration example
   - Verify all parameter combinations work
   - Check default values are correctly applied

**Expected Results**:

- All new configuration options are recognized
- Default values match documentation
- Invalid configurations produce clear error messages
- All replica types can be configured as documented

**Documentation Issues to Check**:

- [ ] Parameter names match implementation exactly
- [ ] Data types are correct (string, int, bool, duration)
- [ ] Default values are accurate
- [ ] Required vs optional parameters are correctly marked
- [ ] Validation rules are documented correctly

### 3.2 Complete Configuration Example

**Test Goal**: Verify the comprehensive configuration example works

**Test Steps**:

1. **Save Complete Example**
   - Copy the complete configuration example to a file
   - Replace environment variables with test values

2. **Validate Syntax**

   ```bash
   # Test configuration parsing
   litestream databases -config complete-example.yml
   ```

3. **Test Feature Combinations**
   - MCP + metrics enabled
   - Multiple replica types
   - Global settings with per-replica overrides
   - Encryption configuration

**Expected Results**:

- Configuration file parses without errors
- All features work together correctly
- No conflicts between different options

**Documentation Issues to Check**:

- [ ] YAML syntax is valid
- [ ] All referenced environment variables are documented
- [ ] Feature combinations are compatible
- [ ] Comments in the example are accurate

## 4. Cross-Reference Validation

### 4.1 Internal Links

**Test Goal**: Verify all internal documentation links work correctly

**Test Steps**:

1. **Hugo Link Validation**

   ```bash
   # Build the site locally
   hugo server --buildDrafts --buildFuture
   
   # Check for broken internal links
   # Navigate to each new page and click all internal links
   ```

2. **Reference Consistency**
   - Check that all `{{< ref "..." >}}` links point to existing pages
   - Verify menu weights don't conflict
   - Test navigation between related pages

**Expected Results**:

- All internal links resolve correctly
- Navigation flows logically between related topics
- No 404 errors for internal references

**Documentation Issues to Check**:

- [ ] All `ref` shortcodes point to valid pages
- [ ] Menu structure is logical and complete
- [ ] Cross-references between MCP, NATS, and config docs work

### 4.2 External References

**Test Goal**: Verify external links and references are accurate

**Test Steps**:

1. **External Link Testing**
   - Test links to NATS documentation
   - Test links to age encryption resources
   - Test links to cloud provider documentation

2. **Version References**
   - Verify `{{< since version="..." >}}` tags are correct
   - Check that version numbers match actual feature releases

**Expected Results**:

- All external links are accessible
- Referenced versions are accurate
- External documentation is current and relevant

**Documentation Issues to Check**:

- [ ] External URLs are reachable and current
- [ ] Version tags reflect actual feature availability
- [ ] Referenced external docs match the context

## 5. User Experience Validation

### 5.1 Getting Started Flow

**Test Goal**: Verify a new user can successfully follow the documentation

**Test Steps**:

1. **Fresh Environment Setup**
   - Use a clean environment (new VM/container)
   - Follow documentation from scratch without prior knowledge

2. **Follow Documentation Paths**
   - Start with MCP basic setup
   - Progress through NATS integration
   - Test configuration examples in order

3. **Error Scenarios**
   - Intentionally make common mistakes
   - Verify error messages and troubleshooting guides are helpful

**Expected Results**:

- New users can successfully set up features
- Error scenarios are addressed in troubleshooting sections
- Documentation provides clear next steps

**Documentation Issues to Check**:

- [ ] Prerequisites are clearly stated
- [ ] Step-by-step instructions are complete
- [ ] Common errors are documented with solutions
- [ ] Examples progress from simple to complex

### 5.2 Production Readiness

**Test Goal**: Verify production deployment guidance is practical

**Test Steps**:

1. **Security Configurations**
   - Test security recommendations
   - Verify TLS/authentication examples work
   - Check that security warnings are prominent

2. **Performance Considerations**
   - Test performance-related configuration options
   - Verify monitoring recommendations
   - Check resource usage guidance

**Expected Results**:

- Security configurations work as documented
- Performance tuning options have measurable effects
- Production deployment patterns are viable

**Documentation Issues to Check**:

- [ ] Security best practices are current and complete
- [ ] Performance tuning advice is accurate
- [ ] Production deployment examples are realistic

## 6. Accessibility and Formatting

### 6.1 Markdown Validation

**Test Goal**: Ensure all documentation follows consistent formatting

**Test Steps**:

1. **Linting**

   ```bash
   # Run markdown linter
   npm run lint:markdown
   ```

2. **Hugo Build**

   ```bash
   # Test Hugo build process
   hugo --buildDrafts --buildFuture
   ```

3. **Visual Review**
   - Check formatting in browser
   - Verify code blocks render correctly
   - Test responsive design on mobile

**Expected Results**:

- No markdown linting errors
- Hugo builds successfully
- Pages render correctly across devices

**Documentation Issues to Check**:

- [ ] Markdown syntax is consistent
- [ ] Code blocks have proper language tags
- [ ] Headings follow hierarchical structure
- [ ] Lists are properly formatted

## 7. Validation Checklist

### Before Merging Phase 1

- [ ] MCP server starts and all tools function correctly
- [ ] All MCP code examples execute successfully  
- [ ] NATS server setup instructions work from scratch
- [ ] Litestream successfully replicates to NATS with all auth methods
- [ ] All new configuration options are recognized and work
- [ ] Complete configuration example parses and functions
- [ ] All internal links resolve correctly
- [ ] External links are accessible and current
- [ ] Documentation provides clear getting started path
- [ ] Security and production guidance is practical
- [ ] No markdown linting errors
- [ ] Hugo builds successfully
- [ ] Pages render correctly in browsers

### Testing Environment Requirements

**Minimum Requirements**:

- Latest Litestream build with Phase 1 features
- NATS server v2.10.0+
- SQLite3 command line tool
- curl for HTTP testing
- Basic development environment (Python 3, Node.js)

**Recommended Setup**:

- Clean VM or container for fresh environment testing
- Multiple test databases with different schemas
- Network access for external link validation
- Mobile device or emulator for responsive testing

### Reporting Issues

When documenting issues during validation:

1. **Issue Location**: Specific file and line number
2. **Issue Type**: Technical accuracy, usability, formatting, etc.
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Reproduction Steps**: How to recreate the issue
6. **Suggested Fix**: Proposed solution

## Post-Validation Actions

After successful validation:

1. **Update GitHub Issue**: Mark Phase 1 items as validated
2. **Prepare Merge**: Clean up validation artifacts
3. **Document Lessons Learned**: Note improvements for Phase 2
4. **Plan Phase 2**: Begin work on medium priority items

This validation plan ensures the Phase 1 documentation updates are accurate, usable, and ready for production use.
