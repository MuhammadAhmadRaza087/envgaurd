# EnvInspect 🛡️

> **Scan repositories for environment variable issues, detect secrets, and generate .env.example files**

EnvInspect helps developers secure and maintain environment variables in code repositories. It scans for hardcoded secrets, detects committed `.env` files, generates sanitized `.env.example`, and provides actionable remediation guidance.

[![CI](https://github.com/MuhammadAhmadRaza087/envgaurd/workflows/CI/badge.svg)](https://github.com/MuhammadAhmadRaza087/envgaurd/actions)
[![npm version](https://badge.fury.io/js/envinspect.svg)](https://www.npmjs.com/package/envinspect)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🔍 **Smart scanning** — Detects `process.env.VAR_NAME`, `import.meta.env.VAR`, and other patterns
- 🚨 **Secret detection** — Finds AWS keys, API tokens, JWTs, private keys, and more using regex heuristics
- 📝 **.env handling** — Detects committed `.env` files and generates `.env.example` automatically
- 📊 **Comprehensive reports** — JSON/YAML output with severity levels and remediation steps
- 🕵️ **Git history check** — Optionally scans git history for leaked secrets
- 🔧 **Auto-fix mode** — Generates `.env.example` and provides remediation commands
- ✅ **CI integration** — GitHub Actions template and pre-commit hooks included
- 🎯 **Zero config** — Works out of the box with sensible defaults

## Installation

### Global install
```bash
npm install -g envinspect
```

### Use with npx (no install)
```bash
npx envinspect
```

### Add to project
```bash
npm install --save-dev envinspect
```

## Quick Start

```bash
# Scan current directory
npx envinspect

# Scan specific path
npx envinspect --path ./my-service

# Generate .env.example and fix issues
npx envinspect --fix

# Output JSON report
npx envinspect --json report.json

# CI mode (exits with error if high-risk secrets found)
npx envinspect --ci

# Scan git history for leaked secrets
npx envinspect --check-history --deep-scan
```

## Usage

### CLI Options

```
Usage: envinspect [options]

Options:
  -V, --version              output the version number
  -p, --path <path>          path to repository to scan (default: ".")
  --fix                      generate .env.example and auto-fix issues
  --json <file>              output report as JSON to specified file
  --yaml <file>              output report as YAML to specified file
  --output <file>            output report (format detected from extension)
  --check-history            scan git history for leaked secrets (slower)
  --deep-scan                perform deep scan (slower, more thorough)
  --ci                       CI mode: exit with error code if high-confidence secrets found
  --max-files <number>       maximum number of files to scan
  --exclude <patterns...>    additional glob patterns to exclude
  --force                    force overwrite when using --fix
  -h, --help                 display help for command
```

### Example Output

```
═══════════════════════════════════════════════════════════
                    EnvInspect Report
═══════════════════════════════════════════════════════════

📊 Summary:
   Files scanned:           150
   Environment keys found:  12
   Secrets detected:        3
   .env files found:        1
   Committed .env files:    1
   Overall risk:            🔴 CRITICAL

🔍 Secrets by confidence:
   High:    2
   Medium:  1
   Low:     0

🚨 Top secret findings (showing 3 of 3):
   1. [HIGH] AWS Access Key ID
      File: .env:11
      Snippet: AKIA**************LE
      Action: Rotate AWS credentials immediately via AWS IAM console.

   2. [HIGH] Stripe API Key
      File: config/stripe.js:5
      Snippet: sk_l****************************56
      Action: Roll the API key in Stripe Dashboard immediately.

   3. [MEDIUM] Generic API Key
      File: src/api.js:22
      Snippet: api_*********************here
      Action: Verify if this is a real API key. If so, rotate it.

💡 Recommendations:
   1. 🚨 [CRITICAL] Rotate 2 high-confidence secret(s) immediately
      High-confidence secrets detected in code. See remediation for each finding.

   2. 🚨 [CRITICAL] Remove .env files from git tracking
      Add .env to .gitignore and use git filter-repo to remove from history.

   3. ⚠️ [HIGH] Generate .env.example file
      Run `envinspect --fix` to create .env.example for team documentation

═══════════════════════════════════════════════════════════

⚠️  Action required! Review findings and follow remediation steps.
   See docs/REMEDIATION.md for detailed instructions.

⏱️  Scan completed in 1.23s
```

## Programmatic API

Use EnvInspect in your Node.js applications:

```javascript
const { scanRepository, generateReport } = require('envinspect');

(async () => {
  // Scan a repository
  const results = await scanRepository('./my-project', {
    checkHistory: false,
    deepScan: false,
    exclude: ['test/**'],
    maxFiles: 1000
  });

  // Generate report
  const report = generateReport(results);
  
  console.log(`Found ${report.summary.secretsFound} secrets`);
  console.log(`Risk level: ${report.summary.overallRisk}`);
})();
```

### API Reference

#### `scanRepository(path, options)`

Scan a repository for environment variable issues and secrets.

**Parameters:**
- `path` (string): Path to repository
- `options` (object):
  - `checkHistory` (boolean): Check git history (default: false)
  - `deepScan` (boolean): Deep scan mode (default: false)
  - `exclude` (array): Additional glob patterns to exclude
  - `maxFiles` (number): Maximum files to scan (default: Infinity)

**Returns:** Promise<Object> - Scan results

#### `generateReport(scanResults)`

Generate a structured report from scan results.

**Parameters:**
- `scanResults` (object): Results from `scanRepository()`

**Returns:** Object - Formatted report with metadata, summary, findings, and recommendations

#### `generateEnvExample(envPath, options)`

Generate .env.example from .env file.

**Parameters:**
- `envPath` (string): Path to .env file
- `options` (object):
  - `output` (string): Output path (default: .env.example)
  - `force` (boolean): Overwrite existing file (default: false)

**Returns:** Promise<Object> - Result with success status and file paths

#### `reportToFile(scanResults, outputPath, format)`

Save report to file.

**Parameters:**
- `scanResults` (object): Results from `scanRepository()`
- `outputPath` (string): Path to output file
- `format` (string): 'json' or 'yaml'

**Returns:** Promise<Object> - Report object

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/envinspect.yml`:

```yaml
name: Security Scan

on: [push, pull_request]

jobs:
  envinspect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npx envinspect --ci
```

See [docs/GH_ACTION.md](docs/GH_ACTION.md) for advanced examples.

### Pre-commit Hook

Install with Husky:

```bash
npm install --save-dev husky
npx husky init
echo 'npx envinspect --ci --path .' > .husky/pre-commit
```

Or create `.git/hooks/pre-commit`:

```bash
#!/bin/sh
npx envinspect --ci --path .
```

## What EnvInspect Detects

### Environment Variables

- `process.env.VAR_NAME`
- `process.env['VAR_NAME']`
- `process.env?.VAR_NAME`
- `import.meta.env.VAR_NAME`
- `process.env.VAR ?? 'default'`

### Secrets

- **AWS**: Access keys (`AKIA...`), secret access keys
- **Stripe**: Live keys (`sk_live_...`, `rk_live_...`)
- **Google**: API keys (`AIza...`)
- **GitHub**: Personal access tokens (`ghp_...`, `gho_...`)
- **Slack**: Tokens (`xoxb-...`, `xoxp-...`)
- **Private keys**: RSA, SSH keys
- **JWTs**: JSON Web Tokens
- **Database credentials**: Connection strings
- **Generic secrets**: API keys, passwords, tokens

### .env Files

- Committed `.env` files
- Missing `.env.example`
- Hardcoded secrets in `.env`

## Configuration

EnvInspect works with zero configuration, but you can customize:

### Exclude patterns

```bash
npx envinspect --exclude 'test/**' --exclude 'docs/**'
```

### Limit files scanned

```bash
npx envinspect --max-files 5000
```

## Development

### Setup

```bash
git clone https://github.com/MuhammadAhmadRaza087/envgaurd.git
cd envgaurd
npm install
```

### Run tests

```bash
npm test
```

### Run linter

```bash
npm run lint
```

### Test CLI locally

```bash
node bin/envgaurd.js --path .
# Note: The bin file is still named envgaurd.js but works for both commands
```

## Examples

See the [`examples/`](examples/) directory for:
- Sample `.env` and `.env.example` files
- Sample application code with env var usage
- Example JSON/YAML reports

## Documentation

- [ASSUMPTIONS.md](docs/ASSUMPTIONS.md) - Design decisions and assumptions
- [REMEDIATION.md](docs/REMEDIATION.md) - Step-by-step remediation guide
- [GH_ACTION.md](docs/GH_ACTION.md) - GitHub Actions integration
- [PUBLISH.md](docs/PUBLISH.md) - Publishing instructions
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines

## Roadmap

- [ ] Custom regex patterns via config file
- [ ] AST-based JavaScript parsing for better accuracy
- [ ] Multi-language support (Python, Go, Ruby)
- [ ] Postman collection generation
- [ ] Cloud provider API integration to check if keys are active
- [ ] VS Code extension
- [ ] Web dashboard for reports

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md).

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT © [Muhammad Ahmad Raza](https://github.com/MuhammadAhmadRaza087)

## Acknowledgments

- Inspired by tools like [truffleHog](https://github.com/trufflesecurity/trufflehog), [detect-secrets](https://github.com/Yelp/detect-secrets), and [git-secrets](https://github.com/awslabs/git-secrets)
- Built with ❤️ using Node.js and modern JavaScript

## Support

- 🐛 [Report bugs](https://github.com/MuhammadAhmadRaza087/envgaurd/issues)
- 💡 [Request features](https://github.com/MuhammadAhmadRaza087/envgaurd/issues)
- 📖 [Read the docs](docs/)
- ⭐ [Star on GitHub](https://github.com/MuhammadAhmadRaza087/envgaurd)

---

**Remember**: Prevention is better than cure. Run EnvInspect before every commit! 🛡️
