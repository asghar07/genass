# Publishing Guide

How to publish GenAss to npm.

## Prerequisites

1. npm account with publishing permissions
2. GitHub repository access
3. NPM_TOKEN secret configured in GitHub

## Release Process

### 1. Update Version

```bash
# Patch release (1.0.0 → 1.0.1)
npm run release:patch

# Minor release (1.0.0 → 1.1.0)
npm run release:minor

# Major release (1.0.0 → 2.0.0)
npm run release:major
```

This will:
- Update version in package.json
- Create git commit
- Create git tag
- Push to GitHub (triggers release workflow)

### 2. Update CHANGELOG

Edit `CHANGELOG.md`:

```markdown
## [1.0.1] - 2025-09-30

### Added
- New feature X

### Fixed
- Bug Y
```

Commit the changelog:

```bash
git add CHANGELOG.md
git commit -m "docs: update changelog for v1.0.1"
git push
```

### 3. Create GitHub Release

The release workflow will automatically:
- Build the project
- Run tests
- Publish to npm
- Create GitHub release

### 4. Manual Publish (if needed)

```bash
npm run build
npm test
npm run publish:npm
```

## Pre-publish Checklist

- [ ] All tests passing
- [ ] CHANGELOG.md updated
- [ ] README.md up to date
- [ ] Version bumped appropriately
- [ ] .npmignore configured correctly
- [ ] dist/ folder built
- [ ] No sensitive data in package

## What Gets Published

Files included (see `.npmignore`):
- `dist/` - Compiled JavaScript
- `README.md` - Documentation
- `LICENSE` - MIT License
- `package.json` - Package metadata

Files excluded:
- `src/` - TypeScript source
- `examples/` - Example code
- `.env` - Environment files
- `logs/` - Log files
- Tests and dev dependencies

## Post-Publish

1. Verify on npm: https://www.npmjs.com/package/genass
2. Test installation: `npx genass@latest --version`
3. Update documentation if needed
4. Announce on social media / Discord

## Version Strategy

Follow semantic versioning:

- **Patch (x.x.1)**: Bug fixes, small improvements
- **Minor (x.1.x)**: New features, backward compatible
- **Major (2.x.x)**: Breaking changes

## Rollback

If a release has issues:

```bash
npm unpublish genass@1.0.1
```

Note: Can only unpublish within 72 hours!