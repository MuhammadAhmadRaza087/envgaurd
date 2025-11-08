# Publishing EnvInspect to npm

This guide is for maintainers publishing new versions of EnvInspect to npm.

## Pre-publish Checklist

- [ ] All tests pass: `npm test`
- [ ] Linter passes: `npm run lint`
- [ ] Version bumped in `package.json`
- [ ] `CHANGELOG.md` updated with new version
- [ ] `README.md` examples are up-to-date
- [ ] Documentation reviewed
- [ ] Breaking changes documented (if any)
- [ ] Example files tested
- [ ] Git working directory is clean

## Version Bumping

Follow [Semantic Versioning](https://semver.org/):

- **Patch** (0.1.0 → 0.1.1): Bug fixes, no API changes
- **Minor** (0.1.0 → 0.2.0): New features, backward compatible
- **Major** (0.1.0 → 1.0.0): Breaking changes

```bash
# Patch release
npm version patch

# Minor release
npm version minor

# Major release
npm version major

# Or manually edit package.json and commit
```

## Publishing Steps

### 1. Prepare the Release

```bash
# Ensure you're on main branch
git checkout main
git pull origin main

# Run all checks
npm test
npm run lint

# Build if needed (not required for EnvInspect)
# npm run build
```

### 2. Update Changelog

Edit `CHANGELOG.md`:

```markdown
## [0.2.0] - 2025-11-15

### Added
- New feature X
- New feature Y

### Fixed
- Bug fix Z

### Changed
- Improved performance of A
```

### 3. Commit Changes

```bash
git add CHANGELOG.md package.json
git commit -m "chore: release v0.2.0"
git push origin main
```

### 4. Create Git Tag

```bash
git tag v0.2.0
git push origin v0.2.0
```

### 5. Publish to npm

```bash
# Login to npm (first time only)
npm login

# Dry run to check what will be published
npm publish --dry-run

# Publish to npm
npm publish
```

### 6. Verify Publication

```bash
# Check on npm
npm view envinspect

# Test installation
npx envinspect@latest --version
```

### 7. Create GitHub Release

1. Go to https://github.com/MuhammadAhmadRaza087/envgaurd/releases
2. Click "Draft a new release"
3. Select tag `v0.2.0`
4. Title: `v0.2.0`
5. Description: Copy from CHANGELOG.md
6. Publish release

## Post-publish

- [ ] Verify package on npm: https://www.npmjs.com/package/envinspect
- [ ] Test installation: `npx envinspect@latest`
- [ ] Update any dependent projects
- [ ] Announce on social media (optional)
- [ ] Close milestone on GitHub (if used)

## Troubleshooting

### "You do not have permission to publish"

Make sure you're logged in to the correct npm account:

```bash
npm whoami
npm logout
npm login
```

### "Version already exists"

You tried to publish a version that's already on npm. Bump the version:

```bash
npm version patch
npm publish
```

### "Package not found" after publishing

Wait a few minutes for npm to propagate. Check:

```bash
npm view envgaurd@latest
```

### Published wrong version

You can unpublish within 72 hours (but it's discouraged):

```bash
npm unpublish envinspect@0.2.0
```

Better: Publish a new patch version immediately.

## Beta/Alpha Releases

For testing before stable release:

```bash
# Update version to include tag
npm version 0.2.0-beta.1

# Publish with tag
npm publish --tag beta

# Users install with
npx envinspect@beta
```

## npm Scripts Reference

```json
{
  "scripts": {
    "test": "ava",
    "lint": "eslint .",
    "start": "node bin/envgaurd.js",
    "coverage": "c8 ava",
    "prepublishOnly": "npm test && npm run lint"
  }
}
```

**Note**: The `start` script still uses `bin/envgaurd.js` as the file name hasn't changed (only the package and command names changed to `envinspect`).

The `prepublishOnly` script runs automatically before `npm publish` to prevent publishing broken code.

## Files Included in Package

Controlled by `files` field in `package.json`:

```json
{
  "files": [
    "bin",
    "lib",
    "index.js",
    "docs",
    "examples"
  ]
}
```

Check what will be published:

```bash
npm pack --dry-run
```

## Security

- **Never commit** `.npmrc` with auth tokens to git
- Use **two-factor authentication** on npm account
- Review **package.json** before publishing
- Check for **secrets** in code before publishing (use EnvInspect!)

## Automation (Future)

Consider setting up:

- **GitHub Actions** to auto-publish on tag push
- **Semantic Release** for automatic versioning
- **Conventional Changelog** for auto-generated changelogs

Example workflow:

```yaml
name: Publish

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm test
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Questions?

Contact the maintainer or open an issue on GitHub.

---

**Remember**: Once published to npm, versions cannot be changed. Always test thoroughly before publishing!
