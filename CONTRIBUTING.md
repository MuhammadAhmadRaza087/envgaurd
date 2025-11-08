# Contributing to EnvGaurd

Thank you for your interest in contributing to EnvGaurd! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, inclusive, and professional. We want EnvGaurd to be a welcoming project for everyone.

## How to Contribute

### Reporting Bugs

1. **Check existing issues** to avoid duplicates
2. **Create a new issue** with:
   - Clear title
   - Steps to reproduce
   - Expected vs. actual behavior
   - Environment details (Node version, OS, etc.)
   - Sample code or repository (if possible)

### Suggesting Features

1. **Check existing feature requests**
2. **Open a new issue** with:
   - Clear use case
   - Expected behavior
   - Potential implementation approach
   - Why this would benefit users

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/my-feature`
3. **Make your changes**
4. **Add tests** for new functionality
5. **Run tests**: `npm test`
6. **Run linter**: `npm run lint`
7. **Commit with clear messages**: 
   - `feat: add support for Python files`
   - `fix: correct regex for AWS keys`
   - `docs: update README examples`
8. **Push and create a PR**

## Development Setup

```bash
git clone https://github.com/MuhammadAhmadRaza087/envgaurd.git
cd envgaurd
npm install
npm test
```

## Project Structure

```
envgaurd/
├── bin/
│   └── envgaurd.js        # CLI entry point
├── lib/
│   ├── scanner.js         # Environment variable detection
│   ├── secrets.js         # Secret pattern matching
│   ├── envHandler.js      # .env file parsing and generation
│   ├── reporter.js        # Report generation and formatting
│   └── gitHistory.js      # Git history scanning
├── test/
│   ├── scanner.test.js
│   ├── secrets.test.js
│   ├── envHandler.test.js
│   ├── reporter.test.js
│   └── integration.test.js
├── docs/
├── examples/
└── index.js               # Main API exports
```

## Coding Guidelines

### JavaScript Style

- Use **CommonJS** (`require`/`module.exports`)
- Target **Node.js 18+**
- Use **ES2022** features where appropriate
- Follow existing code style (enforced by ESLint)

### Function Guidelines

- Keep functions **20-120 lines**
- Use **descriptive names** (`scanRepository`, not `scan`)
- Add **JSDoc comments** for public API
- Return **structured objects**, not primitives
- Handle **errors gracefully**

### Example

```javascript
/**
 * Scan a file for environment variable usage
 * @param {string} filePath - Path to file
 * @returns {Promise<Array<string>>} Array of env var names found
 */
async function scanFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    // ... implementation
    return envVars;
  } catch (error) {
    throw new Error(`Failed to scan file ${filePath}: ${error.message}`);
  }
}
```

## Testing

### Writing Tests

- Use **ava** test framework
- Test **both success and error cases**
- Create **isolated test environments** (temp directories)
- Clean up after tests

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npx ava test/scanner.test.js

# Run with coverage
npm run coverage
```

### Test Categories

1. **Unit tests**: Test individual functions in isolation
2. **Integration tests**: Test end-to-end workflows
3. **Regression tests**: Prevent bugs from reoccurring

## Adding New Secret Patterns

To add detection for a new secret type:

1. **Add pattern to `lib/secrets.js`**:

```javascript
{
  name: 'New Service API Key',
  pattern: /newservice_[A-Za-z0-9]{32}/gi,
  confidence: 'high',
  remediation: 'Rotate key at newservice.com/api-keys'
}
```

2. **Add test in `test/secrets.test.js`**:

```javascript
test('should detect New Service API Key', t => {
  const content = 'key = "newservice_abc123..."';
  const secrets = detectSecretsInContent(content, 'test.js');
  
  const found = secrets.find(s => s.type === 'New Service API Key');
  t.truthy(found);
  t.is(found.confidence, 'high');
});
```

3. **Update documentation** in README.md

## Commit Message Format

Follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Adding or updating tests
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `chore:` Maintenance tasks

Examples:
- `feat: add support for .env.production files`
- `fix: correct AWS secret key regex pattern`
- `docs: add examples for CI integration`
- `test: add tests for git history scanning`

## Documentation

When adding features, update:

- **README.md**: User-facing documentation
- **JSDoc comments**: In-code API documentation
- **examples/**: Add working examples
- **docs/**: Detailed guides if needed

## Performance Considerations

- **File I/O**: Read files efficiently, avoid redundant reads
- **Regex**: Test patterns for performance on large strings
- **Memory**: Don't load entire large files into memory
- **Concurrency**: Consider parallelization for large repos (future)

## Security Considerations

- **Never log full secrets**: Always redact in outputs
- **Don't auto-push changes**: Provide instructions, don't execute
- **Validate inputs**: Sanitize file paths, prevent injection
- **Test with real patterns**: Ensure detection works on actual keys

## Release Process

Maintainers will handle releases, but the process is:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Run full test suite
4. Commit: `chore: release v0.2.0`
5. Tag: `git tag v0.2.0`
6. Push: `git push origin main --tags`
7. Publish: `npm publish`

## Questions?

- Open an issue for questions
- Tag issues with `question` label
- Be patient; maintainers are volunteers

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to EnvGaurd! 🙏
