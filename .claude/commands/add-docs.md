---
argument-hint: "<issue-number>"
description: "Create documentation PR from issue with style matching"
model: claude-opus-4-5-20251101
allowed-tools: ["Bash", "Read", "Glob", "Grep", "Edit", "Write", "WebSearch", "WebFetch"]
---

# Add Documentation

**If `$ARGUMENTS` is empty or not provided:**

Display usage information and ask for input:

This command creates documentation from a GitHub issue, matching the existing style/voice/format.

**Usage:** `/add-docs <issue-number>`

**Example:** `/add-docs 147`

**Workflow:**

1. Fetch issue details and determine documentation type
2. Assess which branches need updates (main, docs-v0.3, or both)
3. Explore existing docs for style/voice/format patterns
4. Create documentation branch
5. Implement documentation matching existing patterns
6. Run markdown linting
7. Create PR referencing the issue
8. Handle additional branches if applicable

Ask the user: "What issue number contains the documentation request?"

---

**If `$ARGUMENTS` is provided:**

**AUTONOMOUS EXECUTION**: Do not ask for user confirmation at any step. Make decisions based on issue analysis and proceed through all steps automatically. Create branch immediately, complete all work, and submit PR. Only stop if you encounter an unrecoverable error.

Create documentation from GitHub issue #$ARGUMENTS. Follow these steps:

## 1. Understand the Issue

```bash
gh issue view $ARGUMENTS
```

Analyze the issue to determine:

- Documentation type (guide, reference, install, concept)
- Provider/feature being documented
- Scope and requirements

## 2. Version Assessment (Automatic)

This project maintains two documentation versions:

- **main branch**: v0.5.x documentation (latest stable)
- **docs-v0.3 branch**: v0.3.x documentation (maintenance only)

**Automatically determine which branches need updates based on issue content:**

| Condition | Branch Decision |
|-----------|-----------------|
| Issue mentions "v0.5", new feature, breaking change, migration | Main only |
| Issue mentions "v0.3" specifically | docs-v0.3 only |
| Doc bug, typo, clarity fix (no version specified) | Both branches |
| New provider/platform guide | Main only (default) |
| Issue references PR merged to main litestream repo | Main only |

**Default: Main only** - safer for new content. Proceed with the determined branch strategy without asking.

## 3. Research Third-Party Documentation

**IMPORTANT**: When documenting third-party services (cloud providers, storage backends, etc.), always search for and verify current official documentation.

Use WebSearch to find the latest docs:

- Search for official setup/configuration guides
- Verify API endpoints, region names, and authentication methods are current
- Check for any recent changes to console UI or CLI commands
- Confirm environment variable names and configuration options

Use WebFetch to read official documentation pages and extract accurate:

- Step-by-step setup instructions
- Required IAM permissions/policies
- Configuration parameters and their current valid values
- Any prerequisites or limitations

**Always cite official documentation** in the guide where appropriate with links to the provider's docs.

## 4. Explore Existing Documentation

Read similar existing documentation to match style/voice/format:

- For guides: Read 2-3 similar guides in `content/guides/`
- Check `content/guides/_index.md` for listing structure
- Review `content/reference/config.md` for config documentation format
- Note heading styles, code block formatting, link patterns

## 5. Ensure Base Branch is Fresh and Create Branch

**IMPORTANT**: Always ensure the base branch is fully up to date before creating a new branch to avoid rebasing later.

```bash
# Fetch latest refs from origin
git fetch origin

# Check for uncommitted changes that would block operations
git status --porcelain
```

If there are uncommitted changes, stash them or warn before proceeding.

```bash
# Checkout and update the base branch
git checkout main
git pull --ff-only origin main
```

The `--ff-only` flag ensures the pull will fail (rather than silently creating a merge) if local main has diverged.

```bash
# Verify we're up to date with remote
git rev-list HEAD..origin/main --count
```

If the count is non-zero, the pull didn't fully update. Investigate before proceeding.

```bash
# Create the feature branch
git checkout -b docs/$ARGUMENTS-<short-description>
```

## 6. Implement Documentation

**DATE FORMAT:**
Use yesterday's date to avoid Hugo's future-date exclusion (timezone differences on build servers can cause today's date to be treated as "future"). The date appears in RSS feeds and OpenGraph meta tags.

Get yesterday's date:

```bash
date -v-1d +%Y-%m-%dT00:00:00Z
```

**Files typically created/modified for a new guide:**

1. `content/guides/{provider-name}/index.md` - The guide content
2. `content/guides/_index.md` - Add to guides listing
3. `content/reference/config.md` - Add configuration section (if applicable)

**Front matter template for guides:**

```yaml
---
title: "Replicating to [Provider Name]"
date: YYYY-MM-DDT00:00:00Z  # Use yesterday's date from command above
layout: docs
menu:
  docs:
    parent: "replica-guides"
weight: NNN
---
```

Match the existing documentation style exactly:

- Same heading hierarchy
- Same code block formatting
- Same terminology and voice
- Same link patterns

## 7. Verify

Run markdown linting to catch issues:

```bash
npm run lint:markdown
```

Fix any linting errors before proceeding.

## 8. Submit PR

**IMPORTANT:** Do NOT include any AI attribution, "Generated with Claude", co-author tags, or similar markers in commits or PRs. The documentation should appear as normal human-authored content.

Commit with conventional format:

```bash
git add .
git commit -m "docs(<scope>): <subject>

<body if needed>

Closes #$ARGUMENTS"
```

Push and create PR:

```bash
git push -u origin docs/$ARGUMENTS-<short-description>
gh pr create --title "docs(<scope>): <subject>" --body "## Summary
- <bullet points of changes>

Closes #$ARGUMENTS

## Test plan
- [ ] Markdown linting passes
- [ ] Links resolve correctly in local dev server
- [ ] Content matches existing style/voice"
```

## 9. Multi-Branch Handling (Automatic)

If the version assessment determined both branches need updates, automatically proceed:

1. After main PR is created, immediately switch to docs-v0.3:

   ```bash
   # Fetch latest and ensure docs-v0.3 is fresh
   git fetch origin
   git checkout docs-v0.3
   git pull --ff-only origin docs-v0.3

   # Verify we're up to date
   git rev-list HEAD..origin/docs-v0.3 --count
   # If non-zero, investigate before proceeding

   git checkout -b docs/$ARGUMENTS-<short-description>-v0.3
   ```

2. Apply changes with version-specific adjustments (different configs, feature availability)
3. Create separate PR for docs-v0.3 branch
4. Include link to main PR in the v0.3 PR description

Use extended thinking for complex documentation analysis.

## 10. Final Summary

After completing all steps, output a summary in this exact format:

```
✓ Created PR #<pr-number> that addresses issue #$ARGUMENTS
  URL: <pr-url>
```

If both branches were updated, include both PRs:

```
✓ Created PR #<pr-number> that addresses issue #$ARGUMENTS (main)
  URL: <pr-url>
✓ Created PR #<pr-number-v0.3> that addresses issue #$ARGUMENTS (docs-v0.3)
  URL: <pr-url-v0.3>
```
