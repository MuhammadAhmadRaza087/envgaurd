# Changelog

All notable changes to EnvInspect will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2025-11-08

### Changed
- Rebranded from "EnvGaurd" to "EnvInspect" in all documentation
- Updated README.md with new package name and commands
- Updated all documentation files (ASSUMPTIONS.md, REMEDIATION.md, GH_ACTION.md, PUBLISH.md)
- Updated CLI output messages to display "EnvInspect"
- Updated report headers and metadata to show "EnvInspect"
- Both `envinspect` and `envgaurd` commands remain available for backward compatibility

## [0.1.0] - 2025-11-08

### Added

#### Core Features
- **Repository scanning** for environment variable usage patterns
  - Detects `process.env.VAR_NAME`, `process.env['VAR_NAME']`, `process.env?.VAR_NAME`
  - Supports `import.meta.env` for modern bundlers
  - Handles optional chaining and nullish coalescing operators
- **Secret detection** with confidence scoring
  - AWS Access Keys and Secret Keys
  - Google API Keys
  - Stripe API Keys (live and restricted)
  - GitHub Personal Access Tokens
  - Slack Tokens
  - Private RSA Keys
  - JWT Tokens
  - Database connection strings
  - Generic API keys and secrets
- **.env file handling**
  - Detects committed `.env` files
  - Generates `.env.example` with smart placeholders
  - Preserves comments and structure
  - Prevents accidental overwrites without `--force`
- **Git history scanning** (optional)
  - Searches for `.env` files in commit history
  - Finds secrets in past commits
  - Provides cleanup instructions
- **Comprehensive reporting**
  - JSON and YAML output formats
  - Human-readable console output with colors and emojis
  - Severity levels (critical, high, medium, low, none)
  - Actionable remediation recommendations

#### CLI
- Full-featured command-line interface
  - `--path` to specify repository
  - `--fix` to auto-generate `.env.example`
  - `--json` and `--yaml` for structured output
  - `--ci` mode for CI/CD integration
  - `--check-history` for git history scanning
  - `--deep-scan` for thorough analysis
  - `--max-files` to limit scan scope
  - `--exclude` for custom ignore patterns
  - `--force` to overwrite existing files
- Both `envinspect` and `envgaurd` commands supported for backward compatibility

#### Programmatic API
- `scanRepository(path, options)` - Main scanning function
- `generateReport(results)` - Report generation
- `generateEnvExample(envPath, options)` - .env.example creation
- `reportToFile(results, path, format)` - Save reports
- `scanForSecrets(path, options)` - Secret detection
- `analyzeEnvFiles(path)` - .env file analysis

#### CI/CD Integration
- GitHub Actions workflow template
- Husky pre-commit hook example
- lint-staged configuration
- Exit codes for CI mode

#### Testing
- 43 unit and integration tests using Ava
- 100% core functionality coverage
- Test utilities for temporary repositories
- Example-based testing approach

#### Documentation
- Comprehensive README with examples
- ASSUMPTIONS.md explaining design decisions
- REMEDIATION.md with step-by-step recovery guide
- GH_ACTION.md for GitHub Actions integration
- CONTRIBUTING.md for contributors
- PUBLISH.md for maintainers

#### Examples
- Sample `.env` and `.env.example` files
- Sample application with env var usage
- Generated report examples (JSON)

### Security
- All secrets redacted in output (shows first 4 and last 2 chars)
- No automatic git history modification
- Clear warnings for destructive operations
- Explicit instructions for credential rotation

### Performance
- Efficient file globbing with `fast-glob`
- Files >1MB automatically skipped
- Standard exclusions: node_modules, dist, build, .git
- Configurable file limits

### Developer Experience
- Zero-config operation for most use cases
- Colored, emoji-enhanced output
- Progress indicators
- Detailed error messages
- Helpful recommendations

## [Unreleased]

### Planned Features
- Custom regex patterns via `envgaurd.config.json`
- AST-based parsing for improved accuracy
- Multi-language support (Python, Go, Ruby)
- Postman collection generation
- Cloud provider API integration
- VS Code extension
- Web dashboard for reports
- Historical trend analysis

---

[0.1.0]: https://github.com/MuhammadAhmadRaza087/envgaurd/releases/tag/v0.1.0
