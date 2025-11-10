litestream.io
=============

This repository is the Litestream web site built on Hugo & Doks, with documentation for both Litestream v0.5.x and v0.3.x.

## Documentation Versions

This project maintains **two active documentation versions** in separate branches:

- **`main` branch**: v0.5.x documentation (latest stable)
- **`docs-v0.3` branch**: v0.3.x documentation (maintenance/critical fixes only)

### Significant Differences Between Versions

Configuration format, capabilities, supported platforms, and command-line options differ significantly between v0.3.x and v0.5.x. Always verify that changes apply to the appropriate version(s).

## Contributing

### Before Making Documentation Changes

1. **Identify the change type:**
   - Bug fix (typo, broken link, clarity issue)
   - New documentation (missing topic or feature)
   - Enhancement (improved content or examples)
   - Version-specific update (differs between v0.3.x and v0.5.x)

2. **Determine which version(s) to update:**

   **Update BOTH branches when:**
   - Fixing documentation bugs (typos, broken links, etc.)
   - Documenting general concepts and architecture
   - Updating platform-specific guides (if feature exists in both versions)
   - Improving installation instructions (if applicable to both)

   **Update ONLY the appropriate branch when:**
   - Adding new features (v0.5.x only)
   - Documenting breaking changes
   - Writing version-specific configuration or capability docs
   - Documenting deprecated features

3. **Check for version differences:**
   - Configuration file format/options
   - Command-line flags and arguments
   - Supported platforms and cloud providers
   - Feature availability

### How to Update Both Versions

1. Create a feature branch from `main` (for v0.5.x changes)
2. Make changes and create a pull request against `main`
3. Once merged, switch to `docs-v0.3` branch
4. Cherry-pick or manually apply the same changes (adjusting for version differences)
5. Create a pull request against `docs-v0.3`
6. Reference both PRs in the GitHub issue (e.g., "Fixes #123. Also applies to v0.3: benbjohnson/litestream.io#456")

### GitHub Issue Templates

When filing an issue about documentation:
- **Select the affected version(s):** v0.5.x, v0.3.x, or Both
- **Verify applicability:** If both versions are affected, check for version-specific differences
- **Cross-reference:** If your fix applies to multiple branches, file issues/PRs for each

## Development

### Running the server

To run the site locally, run:

```sh
$ npm install
$ npm run start
```

This starts a local Hugo development server with live reload at `http://localhost:1313`.

### Building

To build the production site:

```sh
$ npm run build
```

The built site will be in the `public/` directory.

### Testing and Linting

To run all linters:

```sh
$ npm test
```

Individual linters:

```sh
$ npm run lint:markdown  # Lint Markdown content
$ npm run lint:styles   # Lint SCSS stylesheets
$ npm run lint:scripts  # Lint JavaScript files
```

## Documentation

### Adding a New Page

To add a new documentation page:

```sh
$ hugo new docs/section/TITLE/index.md
```

Replace `section` with an appropriate section (e.g., `guides`, `reference`, `tips`) and `TITLE` with your page name.

### Content Guidelines

- Use Hugo's built-in markup with Goldmark renderer
- Code blocks use syntax highlighting with Dracula theme
- Images should be optimized and placed in appropriate `static/` subdirectories
- Use Hugo's internal link syntax for cross-references

## Deployment

The main branch (v0.5.x docs) automatically deploys to GitHub Pages when changes are pushed. The docs-v0.3 branch is maintained separately for v0.3.x documentation.


