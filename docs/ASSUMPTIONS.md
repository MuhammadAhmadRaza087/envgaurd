# Assumptions Made During Development

This document outlines the key assumptions made during the development of EnvInspect.

## Technical Assumptions

### 1. **Node.js Version**
- **Assumption**: Target Node.js version 18+ for ES2022 features
- **Rationale**: Node 18 is LTS and widely adopted. Provides modern JavaScript features while maintaining broad compatibility
- **Impact**: Users need Node 18 or higher to run EnvInspect

### 2. **Module System**
- **Assumption**: Use CommonJS (`require`/`module.exports`) instead of ES Modules
- **Rationale**: Better compatibility with existing Node.js tooling and easier for users to integrate
- **Impact**: Code uses `require()` syntax throughout

### 3. **Git Availability**
- **Assumption**: Git may not be available in all environments
- **Rationale**: Some CI environments or Docker containers may not have git installed
- **Impact**: Git-related features gracefully degrade with warnings if git is unavailable

### 4. **File Size Limits**
- **Assumption**: Files larger than 1MB are likely binary or generated, not source code
- **Rationale**: Prevents scanning large binary files or bundled JavaScript
- **Impact**: Files >1MB are automatically skipped during secret scanning

## Secret Detection Assumptions

### 1. **Regex-based Detection**
- **Assumption**: Regex patterns can identify most common secrets with acceptable false positive rate
- **Rationale**: AST-based parsing is complex; regex provides good balance of accuracy and simplicity
- **Impact**: Some edge cases may be missed; users can add custom patterns via config (future enhancement)

### 2. **Confidence Levels**
- **Assumption**: Secrets can be classified as high/medium/low confidence based on pattern specificity
- **Rationale**: Generic patterns (e.g., "password=...") need human review; specific patterns (e.g., AWS keys) are high confidence
- **Impact**: Users should review medium/low confidence findings manually

### 3. **Secret Formats**
- **Assumption**: Most API providers follow recognizable key formats (e.g., `AKIA...` for AWS, `sk_live_` for Stripe)
- **Rationale**: Major cloud providers and SaaS platforms use distinctive prefixes
- **Impact**: Newer or less common services may not be detected

### 4. **Base64 Detection**
- **Assumption**: Long base64 strings (40+ chars) may be encoded secrets
- **Rationale**: Many secrets are base64-encoded; worth flagging for review
- **Impact**: May produce false positives on legitimate base64 data (images, etc.)

## Environment Variable Detection Assumptions

### 1. **Naming Convention**
- **Assumption**: Environment variables follow SCREAMING_SNAKE_CASE (e.g., `API_KEY`, `DATABASE_URL`)
- **Rationale**: This is the standard convention in Node.js and most ecosystems
- **Impact**: Variables in other formats (e.g., `apiKey`) won't be detected

### 2. **Access Patterns**
- **Assumption**: Code primarily uses `process.env.VAR_NAME` or `import.meta.env.VAR_NAME`
- **Rationale**: These are the standard patterns in Node.js and modern bundlers (Vite, etc.)
- **Impact**: Dynamic access like `process.env[varName]` with computed names won't be detected

### 3. **Languages Scanned**
- **Assumption**: Focus on JavaScript/TypeScript files (`.js`, `.ts`, `.jsx`, `.tsx`, `.mjs`, `.cjs`)
- **Rationale**: EnvInspect is a JavaScript tool primarily for JavaScript projects
- **Impact**: Won't scan Python, Go, or other language files by default (can be added via custom patterns)

## .env File Handling Assumptions

### 1. **File Format**
- **Assumption**: .env files follow the standard `KEY=value` format with optional comments
- **Rationale**: This is the de facto standard established by the `dotenv` library
- **Impact**: Non-standard formats may not parse correctly

### 2. **Committed Files**
- **Assumption**: Any .env file tracked by git is a security risk
- **Rationale**: .env files typically contain secrets and should never be committed
- **Impact**: All committed .env files are flagged as high severity

### 3. **.env.example Purpose**
- **Assumption**: .env.example should contain all keys with placeholder values, no real secrets
- **Rationale**: Standard practice for documenting required environment variables
- **Impact**: Generated .env.example replaces all values with smart placeholders

## Git History Assumptions

### 1. **History Depth**
- **Assumption**: Checking the most recent 50-100 commits is sufficient for most cases
- **Rationale**: Full history scans can be very slow on large repositories
- **Impact**: Very old leaks may be missed unless `--deep-scan` is used

### 2. **Git Availability**
- **Assumption**: `git` command is available in PATH when history scanning is requested
- **Rationale**: Most development environments have git installed
- **Impact**: History scanning is skipped with a warning if git is unavailable

### 3. **Branch Coverage**
- **Assumption**: Scanning `--all` branches captures most leaked secrets
- **Rationale**: Secrets in any branch are a risk
- **Impact**: May increase scan time but improves security coverage

## Performance Assumptions

### 1. **Repository Size**
- **Assumption**: Most repositories have <10,000 source files
- **Rationale**: Average project size; performance is acceptable at this scale
- **Impact**: Very large monorepos may need `--max-files` option

### 2. **Excluded Directories**
- **Assumption**: `node_modules`, `dist`, `build`, etc. don't need scanning
- **Rationale**: These are generated/dependency directories, not source code
- **Impact**: Secrets in these directories won't be detected (this is intentional)

### 3. **Concurrency**
- **Assumption**: Sequential file processing is acceptable for most use cases
- **Rationale**: File I/O is fast; complexity of parallelization not worth it for v0.1.0
- **Impact**: Could be optimized with worker threads in future versions

## CI/CD Assumptions

### 1. **Exit Codes**
- **Assumption**: CI systems expect non-zero exit codes to fail builds
- **Rationale**: Standard CI/CD convention
- **Impact**: `--ci` mode exits with code 1 if high-risk issues found

### 2. **GitHub Actions Compatibility**
- **Assumption**: Most users are on GitHub or compatible CI platforms
- **Rationale**: GitHub is the most popular platform
- **Impact**: Provided CI examples are GitHub Actions-focused

### 3. **Pre-commit Hook Usage**
- **Assumption**: Developers use git hooks to prevent mistakes
- **Rationale**: Pre-commit hooks are a best practice
- **Impact**: Husky setup is included but optional

## User Experience Assumptions

### 1. **Terminal Support**
- **Assumption**: Users have terminals that support Unicode and ANSI colors
- **Rationale**: Most modern terminals do; fallback to plain text is acceptable
- **Impact**: Emoji and colors in output may not render on very old terminals

### 2. **JSON/YAML Preference**
- **Assumption**: Users want machine-readable output for automation
- **Rationale**: CI pipelines often need structured data
- **Impact**: Both JSON and YAML output formats are supported

### 3. **Smart Defaults**
- **Assumption**: Sensible defaults allow most users to run `npx envinspect` without options
- **Rationale**: Lower barrier to entry; power users can customize
- **Impact**: Default scan covers common cases without configuration

## Security Assumptions

### 1. **No Auto-remediation of History**
- **Assumption**: Automatically modifying git history is too dangerous
- **Rationale**: Can break repositories and requires team coordination
- **Impact**: Tool provides instructions but doesn't execute `git filter-repo` automatically

### 2. **Redaction in Outputs**
- **Assumption**: Showing first 4 and last 2 characters is safe for identification
- **Rationale**: Enough to identify the secret type without exposing the full value
- **Impact**: Users can identify which secrets need rotation

### 3. **False Positive Tolerance**
- **Assumption**: Better to have some false positives than miss real secrets
- **Rationale**: Security-first approach; users can review and dismiss
- **Impact**: Medium/low confidence findings may need manual review

## Future Considerations

These assumptions may be revisited in future versions:

1. **Custom Pattern Support**: Allow users to define custom regex patterns via config file
2. **AST Parsing**: Use acorn/babel for more accurate JavaScript parsing
3. **Multi-language Support**: Extend to Python, Go, Ruby, etc.
4. **Parallel Scanning**: Use worker threads for large repositories
5. **Cloud Provider Integration**: Direct API calls to check if keys are active
6. **Historical Trend Analysis**: Track secrets over time across commits

---

**Note**: If you disagree with any of these assumptions or encounter issues because of them, please open an issue on GitHub with your use case.
