---
argument-hint: "<pr-number>"
description: "Review doc PR for accuracy, test commands, compare patterns"
model: claude-opus-4-5-20251101
allowed-tools: ["Bash", "Read", "Glob", "Grep", "Edit", "Write", "WebSearch", "WebFetch", "AskUserQuestion"]
---

# Review Documentation PR

**If `$ARGUMENTS` is empty or not provided:**

Display usage information:

This command reviews documentation PRs for technical accuracy by testing commands, validating configs, and ensuring consistency with existing patterns.

**Usage:** `/review-docs <pr-number>`

**Example:** `/review-docs 153`

**What it does:**

1. Analyzes PR changes and extracts testable commands/configs
2. Creates a validation plan for your approval
3. Tests commands locally (with Docker containers as needed)
4. Compares against existing docs patterns
5. Generates a review report

Ask the user: "What PR number would you like to review?"

---

**If `$ARGUMENTS` is provided:**

Review documentation PR #$ARGUMENTS collaboratively. This is a guided process - present plans and get approval before executing tests.

## Non-Negotiable Verification Requirements

**These requirements cannot be skipped or waived. Every PR review MUST complete these verifications.**

### 1. Command Verification (MANDATORY)

Every shell command (`bash`, `sh`) in the PR MUST be executed. No exceptions.

- If it can't run locally, it MUST run in Docker
- If it requires real cloud credentials, test equivalent with local emulator (MinIO for S3, fake-gcs-server for GCS, etc.)
- Commands that truly cannot be tested must be explicitly acknowledged by the reviewer

### 2. SQL Command Verification (MANDATORY)

Every SQL statement MUST be run against a real SQLite database:

- Create a test database
- Execute the exact SQL from the documentation
- Verify output matches what the documentation claims
- PRAGMA statements, SELECT queries, schema commands - all must be tested

### 3. Config Verification (MANDATORY)

Every YAML/TOML configuration MUST be validated:

- **Syntax validation**: Parse without errors (use `yq`, `python3 -c "import yaml"`, etc.)
- **Litestream validation**: Run with `litestream replicate -config <file>` to verify it's accepted
- **Environment variable placeholders**: Check format is correct (`${VAR}` or `$VAR`)

### 4. Environment Variable Verification (MANDATORY)

Every environment variable referenced MUST be checked:

- Verify the naming follows existing conventions (check `content/` for patterns)
- Verify it's documented or has a cross-reference
- Test with actual values where possible

### 5. Evidence Requirement (MANDATORY)

The final report MUST include proof of every verification:

- **Full command output** (not paraphrased) in collapsible sections
- **SQL query results** with exact output
- **Config validation output** showing success/failure
- **Any errors encountered** and how they were resolved

### 6. Go Version Verification (MANDATORY)

If the PR mentions a minimum Go version requirement (e.g., "Go 1.21 or later"), verify it matches the litestream `go.mod`:

```bash
grep "^go " ../litestream/go.mod
```

- The documented version MUST match or be compatible with `go.mod`
- If `go.mod` says `go 1.24.1`, documentation should say "Go 1.24 or later"
- Flag any mismatch as a **blocking issue**

### 7. Temporary Directory Requirement (MANDATORY)

**ALL test artifacts MUST be created in `/tmp/litestream-review/` - NEVER in source repositories.**

- **Test databases**: `/tmp/litestream-review/test.db`
- **Config files**: `/tmp/litestream-review/litestream.yml`
- **Test scripts**: `/tmp/litestream-review/test.sh`
- **Build artifacts**: `/tmp/litestream-review/dist/`
- **Any generated files**: `/tmp/litestream-review/`

**Setup at start of review:**

```bash
rm -rf /tmp/litestream-review && mkdir -p /tmp/litestream-review
cd /tmp/litestream-review
```

**Cleanup at end of review:**

```bash
rm -rf /tmp/litestream-review
```

**NEVER create files in:**

- `../litestream/` (the Litestream source repo)
- The current documentation repo (except for actual doc edits)
- Any other source repository
- User's home directory

**HARD BLOCK**: You cannot generate a final report until ALL verifications are complete OR the reviewer has explicitly acknowledged each item that cannot be verified.

---

## Litestream Binary Location

The Litestream source code is at `../litestream` (relative) or `~/projects/benbjohnson/litestream` (absolute).

If testing requires a specific branch or unreleased feature:

1. Check if the docs PR references a Litestream PR (e.g., "Documents feature from litestream#862")
2. Fetch and checkout that branch in the Litestream repo:

   ```bash
   cd ../litestream
   gh pr checkout <litestream-pr-number>
   ```

3. Build the binary:

   ```bash
   cd ../litestream
   go build -o litestream ./cmd/litestream
   ```

4. Use the local binary for testing:

   ```bash
   ../litestream/litestream version
   ../litestream/litestream replicate ...
   ```

5. After testing, return to main:

   ```bash
   cd ../litestream
   git checkout main
   ```

## 0. Check PR Rebase Status

**This MUST be the first check before any other review steps.**

Check if the PR needs a rebase:

```bash
gh pr view $ARGUMENTS --json mergeStateStatus,mergeable,baseRefName,headRefName,title
```

Evaluate the results:

- `mergeable: MERGEABLE` - PR can be merged cleanly, proceed with review
- `mergeable: CONFLICTING` - PR has merge conflicts, needs rebase
- `mergeStateStatus: BEHIND` - PR is behind base branch, may need rebase
- `mergeStateStatus: BLOCKED` - PR is blocked (may have conflicts or policy issues)

**If the PR needs a rebase** (conflicts detected or significantly behind):

```
⚠️ This PR needs a rebase before review.

Status: [CONFLICTING/BEHIND]
Base branch: [baseRefName]

Options:
1. Stop review and request author to rebase (recommended)
2. Continue review anyway (issues may not apply to rebased code)

How would you like to proceed? [1/2]
```

Wait for user input before proceeding.

**If the PR is mergeable**, continue to Step 1.

## 1. Analyze PR

Fetch the PR details and diff:

```bash
gh pr view $ARGUMENTS
gh pr diff $ARGUMENTS
```

From the diff, extract and catalog:

- All code blocks (bash, yaml, sh, etc.)
- Environment variables mentioned
- Configuration snippets
- Command-line examples
- Third-party services referenced

Identify which replica type(s) the PR documents:

| Replica Type | Service | Docker Image |
|--------------|---------|--------------|
| `s3` | AWS S3 & S3-compatible | `minio/minio` |
| `gs` | Google Cloud Storage | `fsouza/fake-gcs-server` |
| `oss` | Alibaba Cloud OSS | *(real service only)* |
| `sftp` | SFTP servers | `atmoz/sftp` |
| `nats` | NATS JetStream | `nats:latest -js` |
| `file` | Local filesystem | *(none needed)* |
| `webdav` | WebDAV servers | `bytemark/webdav` |

S3-compatible providers (AWS, MinIO, Backblaze, Wasabi, Cloudflare R2, DigitalOcean, Linode, Scaleway, Vultr, OCI, Filebase, Tigris) all use the `s3` type with custom endpoints - test with MinIO.

## 2. Create Validation Plan

Present a structured validation plan to the user:

```
## Validation Plan for PR #$ARGUMENTS

### Testable Items Found:
1. [item] - [testing approach]
2. [item] - [testing approach]
...

### Testing Approaches:
- **Local execution**: Simple commands that can run directly
- **Docker container**: Spin up [container] to simulate [service]
- **Real service**: Requires credentials for [service]
- **Manual verification**: UI-based steps (cannot automate)

### Required Credentials:
- [env var] for [service]

### Docker Containers Needed:
- [image] for [purpose]

### Litestream Binary:
- [ ] Use installed litestream
- [ ] Build from ../litestream (main branch)
- [ ] Build from ../litestream (PR #XXX branch)

Do you approve this plan? [Y/n]
```

Wait for user approval before proceeding.

## 3. Check Credentials

Check `.envrc` for existing credentials:

```bash
cat .envrc 2>/dev/null || echo "No .envrc found"
```

If `.envrc` exists, assume variables are loaded into the environment.

If required credentials are missing, ask the user to add them:

```
Missing credentials for [service]:
- [VAR_NAME]: [description]

Please add these to your .envrc and run `direnv allow`, then confirm.
```

## 4. Spin Up Docker Containers

Auto-start required containers for testing:

```bash
# MinIO (S3-compatible)
docker run -d --name litestream-test-minio -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"

# Fake GCS
docker run -d --name litestream-test-gcs -p 4443:4443 \
  fsouza/fake-gcs-server -scheme http -port 4443

# SFTP
docker run -d --name litestream-test-sftp -p 2222:22 \
  atmoz/sftp testuser:testpass:::upload

# NATS with JetStream
docker run -d --name litestream-test-nats -p 4222:4222 \
  nats:latest -js

# WebDAV
docker run -d --name litestream-test-webdav -p 8080:80 \
  -e USERNAME=user -e PASSWORD=pass \
  bytemark/webdav
```

Use `litestream-test-*` prefix for easy cleanup.

## 4.5 SQL Command Verification

**This step is MANDATORY for any PR containing SQL commands.**

For any SQL commands found in the PR (PRAGMA statements, SELECT queries, schema commands, etc.):

### Setup Test Database

```bash
# Create test directory and SQLite database with WAL mode (typical Litestream setup)
mkdir -p /tmp/litestream-review
sqlite3 /tmp/litestream-review/test.db "PRAGMA journal_mode=WAL; CREATE TABLE test(id INTEGER PRIMARY KEY, name TEXT);"
```

### Execute Each SQL Command

For each SQL statement in the documentation:

```bash
# Run the exact SQL from the docs
sqlite3 /tmp/litestream-review/test.db "<SQL_FROM_DOCS>"
```

### Record Results

For each SQL command, capture:

- **Exact SQL statement** as written in the docs
- **Actual output** from execution
- **Expected output** (if documented)
- **Result**: PASS (matches) / FAIL (differs) / ERROR (command failed)

### Common SQL Commands to Verify

| SQL Type | Example | What to Check |
|----------|---------|---------------|
| PRAGMA | `PRAGMA journal_mode;` | Returns expected value (e.g., `wal`) |
| PRAGMA set | `PRAGMA journal_mode=WAL;` | Succeeds and returns `wal` |
| Checkpoint | `PRAGMA wal_checkpoint(TRUNCATE);` | Returns status values |
| Schema | `.schema` or `.tables` | Returns expected structure |
| SELECT | `SELECT * FROM ...` | Returns documented output format |

### Evidence Format

Example format for recording SQL verification:

    **SQL Command 1**: `PRAGMA journal_mode;`
    **Executed**: Yes
    **Output**: wal
    **Expected**: wal
    **Result**: PASS

### Cleanup

SQL test files are cleaned up as part of the main cleanup step (Section 7) which removes `/tmp/litestream-review/` entirely.

## 5. Execute Tests

**All tests MUST be run in `/tmp/litestream-review/` - see Section 6 of Non-Negotiable Requirements.**

For each testable item in the approved plan:

1. Run the command/config
2. Capture **full actual output** (not truncated)
3. Compare to documented expected output
4. Record pass/fail/skip with reason and **evidence**

### 5.1 Command Verification (MANDATORY)

For each shell command in the documentation:

```bash
# Copy the exact command from docs and run it
cd /tmp/litestream-review
<COMMAND_FROM_DOCS>
```

**Capture and record:**

- The exact command as documented
- Full terminal output
- Exit code
- Any errors or warnings

### 5.2 Config Verification (MANDATORY)

For each configuration file (YAML/TOML):

#### Step 1: Syntax Validation

```bash
# Save config to temp file
cat > /tmp/litestream-review/litestream.yml << 'EOF'
<CONFIG_FROM_DOCS>
EOF

# Validate YAML syntax
python3 -c "import yaml; yaml.safe_load(open('/tmp/litestream-review/litestream.yml'))" && echo "YAML syntax: VALID" || echo "YAML syntax: INVALID"
```

#### Step 2: Litestream Validation (if applicable)

```bash
# Test if Litestream accepts the config
../litestream/litestream replicate -config /tmp/litestream-review/litestream.yml 2>&1 | head -20
# Note: This may fail if services aren't running, but should at least parse the config
```

#### Step 3: Environment Variable Check

```bash
# Extract env vars from config and verify format
grep -oE '\$\{?[A-Z_]+\}?' /tmp/litestream-review/litestream.yml | sort -u
```

### 5.3 Environment Variable Verification (MANDATORY)

For each environment variable referenced:

```bash
# Check if variable exists
echo "Checking: LITESTREAM_ACCESS_KEY_ID"
[ -n "${LITESTREAM_ACCESS_KEY_ID:-}" ] && echo "EXISTS" || echo "NOT SET"

# Check naming convention against existing docs
grep -r "LITESTREAM_ACCESS_KEY_ID" content/ | head -5
```

### Evidence Recording

Every verification MUST be recorded with:

| Field | Required |
|-------|----------|
| Item tested | Yes |
| Exact command/query | Yes |
| Full output | Yes |
| Expected result | Yes |
| Actual result | Yes |
| Pass/Fail | Yes |

## 6. Pattern Comparison

Compare PR changes against existing documentation:

```bash
# Find similar guides
ls content/guides/

# Check for common patterns
grep -r "LITESTREAM_" content/
grep -r "replicas:" content/reference/
```

Check for:

- **Outdated env var names**: Are there newer patterns in other docs?
- **Old config syntax**: Does the PR use deprecated options?
- **Missing cross-references**: Should it link to other guides?
- **Style consistency**: Does it match voice/format of similar docs?
- **Code block formatting**: Consistent language tags and indentation?

## 7. Cleanup

**MANDATORY: Clean up ALL test artifacts before generating the report.**

### Stop and Remove Docker Containers

```bash
docker stop litestream-test-minio litestream-test-gcs litestream-test-sftp \
  litestream-test-nats litestream-test-webdav 2>/dev/null
docker rm litestream-test-minio litestream-test-gcs litestream-test-sftp \
  litestream-test-nats litestream-test-webdav 2>/dev/null
```

### Remove Temporary Test Directory

```bash
rm -rf /tmp/litestream-review
```

### Verify No Files Left Behind

```bash
# Verify no test files in source repos
cd ../litestream && git status --short
cd ../litestream.io && git status --short
```

**If any unexpected files are found in source repos, remove them before proceeding.**

## 7.5 Pre-Report Verification Checklist

**HARD BLOCK: You cannot proceed to generate the report until this checklist is complete.**

Before generating the report, confirm ALL items. Present this checklist to the user:

```
## Pre-Report Verification Checklist

### Command Verification
- [ ] Every bash/sh command in the PR was executed
- [ ] Full output was captured for each command
- [ ] Results were compared against documented expectations

### SQL Verification
- [ ] Every SQL statement was run against SQLite
- [ ] Output was captured and compared to docs
- [ ] N/A - No SQL commands in this PR

### Config Verification
- [ ] Every YAML/TOML config was syntax-checked
- [ ] Every Litestream config was validated with the CLI
- [ ] Environment variable placeholders were verified
- [ ] N/A - No config files in this PR

### Environment Variable Verification
- [ ] Every referenced env var was checked for existence
- [ ] Naming conventions were verified against existing docs
- [ ] N/A - No new env vars in this PR

### Go Version Verification
- [ ] Go version requirement checked against ../litestream/go.mod
- [ ] Documented version matches go.mod (e.g., "Go 1.24 or later" for go 1.24.x)
- [ ] N/A - No Go version mentioned in this PR

### Evidence Collection
- [ ] Full output captured for each verification (not truncated)
- [ ] Evidence is ready to include in report

### Cleanup Verification
- [ ] Docker containers stopped and removed
- [ ] /tmp/litestream-review/ directory removed
- [ ] No test files left in source repositories
```

### Handling Unverifiable Items

If ANY item cannot be verified:

1. **STOP** - Do not proceed to the report
2. **List** the specific item(s) that cannot be verified
3. **Explain** exactly why (e.g., "Requires AWS production credentials", "Platform-specific command")
4. **Ask** the user for explicit acknowledgment using this format:

        The following items could not be verified:

        1. [item] - [reason]
        2. [item] - [reason]

        Do you acknowledge these items cannot be verified and approve proceeding? [Y/n]

5. **Wait** for user approval before continuing
6. **Document** the user's acknowledgment in the final report

**You MUST NOT generate a report with unverified items unless the user has explicitly acknowledged and approved each one.**

## 8. Generate Report with Verification Evidence

**The report MUST include complete evidence of all verifications. This is non-negotiable.**

Present findings in this format:

```
## Review Report for PR #$ARGUMENTS

### Verification Summary

| Category | Total | Verified | Passed | Failed | Acknowledged Skips |
|----------|-------|----------|--------|--------|-------------------|
| Commands | X | X | X | X | X |
| SQL | X | X | X | X | X |
| Configs | X | X | X | X | X |
| Env Vars | X | X | X | X | X |
| Go Version | X | X | X | X | X |
| **Total** | **X** | **X** | **X** | **X** | **X** |

**Verification Status: COMPLETE / INCOMPLETE**

---

### Verification Evidence

This section provides proof that all items were verified. Each item shows the exact command/query run and the actual output received.

#### Commands Verified

| # | Command | Executed | Result |
|---|---------|----------|--------|
| 1 | `litestream replicate ...` | ✅ Yes | PASS |
| 2 | `sqlite3 ... PRAGMA` | ✅ Yes | PASS |

<details>
<summary>📋 Full Command Output Logs (click to expand)</summary>

**Command 1:** `litestream replicate -config /tmp/litestream-review/test.yml`
```
[FULL terminal output here - not truncated]
```

**Command 2:** `sqlite3 /tmp/litestream-review/test.db "PRAGMA journal_mode"`
```
wal
```

</details>

#### SQL Commands Verified

| # | SQL Statement | Executed | Output | Expected | Result |
|---|---------------|----------|--------|----------|--------|
| 1 | `PRAGMA journal_mode=WAL;` | ✅ Yes | `wal` | `wal` | PASS |
| 2 | `PRAGMA wal_checkpoint;` | ✅ Yes | `0|0|0` | checkpoint values | PASS |

<details>
<summary>📋 Full SQL Output Logs (click to expand)</summary>

**SQL 1:** `PRAGMA journal_mode=WAL;`
```
wal
```

**SQL 2:** `PRAGMA wal_checkpoint;`
```
0|0|0
```

</details>

#### Configs Validated

| # | Config | Syntax Check | Litestream Validation | Env Vars Valid | Result |
|---|--------|--------------|----------------------|----------------|--------|
| 1 | `litestream.yml` | ✅ PASS | ✅ PASS | ✅ PASS | PASS |

<details>
<summary>📋 Full Config Validation Logs (click to expand)</summary>

**Config 1:** `litestream.yml`

**Syntax check:**
```
$ python3 -c "import yaml; yaml.safe_load(open('/tmp/litestream-review/litestream.yml'))"
[no output - valid YAML]
```

**Litestream validation:**
```
$ ../litestream/litestream replicate -config /tmp/litestream-review/litestream.yml
[output here]
```

</details>

#### Environment Variables Checked

| # | Variable | In .envrc | Format Valid | In Existing Docs | Result |
|---|----------|-----------|--------------|------------------|--------|
| 1 | `LITESTREAM_ACCESS_KEY_ID` | ✅ Yes | ✅ Yes | ✅ Yes | PASS |

#### Go Version Verified

| Documented Version | go.mod Version | Match | Result |
|-------------------|----------------|-------|--------|
| Go 1.24 or later | go 1.24.1 | ✅ Yes | PASS |

<details>
<summary>📋 Go Version Check</summary>

```
$ grep "^go " ../litestream/go.mod
go 1.24.1
```

Documented prerequisite says "Go 1.24 or later" which matches go.mod requirement.

</details>

---

### Acknowledged Unverified Items

*Items the reviewer explicitly acknowledged could not be verified:*

| # | Item | Reason | User Acknowledged |
|---|------|--------|-------------------|
| 1 | `aws s3 ls ...` | Requires AWS production credentials | ✅ Yes |

---

### Issues Found

#### Blocking Issues
1. [file:line] - [issue description]
   **Suggested fix:** [fix]

#### Suggestions
1. [file:line] - [suggestion]

### Pattern Comparison
- [observation about consistency with existing docs]

### Cleanup Confirmation
- [ ] Docker containers removed
- [ ] /tmp/litestream-review/ removed
- [ ] No test files in source repos
```

### After Presenting Report

If issues are found, ask user if they want to:

1. Leave comments on the PR
2. Create suggested fixes locally
3. Just note the findings

Use extended thinking for complex analysis.
