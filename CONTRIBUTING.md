# Contributing to GenAss

Thank you for your interest in contributing to GenAss! We welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Guidelines](#coding-guidelines)
- [Testing](#testing)
- [Commit Messages](#commit-messages)

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/genass.git`
3. Add upstream remote: `git remote add upstream https://github.com/original-owner/genass.git`
4. Create a feature branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Git
- Gemini API key (for testing)

### Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Link locally for testing
npm link

# Run in development mode
npm run dev

# Run tests
npm test

# Run linter
npm run lint
```

### Environment Setup

```bash
# Copy example environment file
cp .env.example .env

# Add your API keys for testing
nano .env
```

## How to Contribute

### Reporting Bugs

- Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md)
- Include detailed steps to reproduce
- Provide environment details
- Add screenshots if applicable

### Suggesting Features

- Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md)
- Explain the use case
- Describe the expected behavior
- Consider implementation complexity

### Code Contributions

1. **Find an issue** or create one
2. **Comment** on the issue to claim it
3. **Fork and branch** from `main`
4. **Implement** your changes
5. **Test** thoroughly
6. **Submit** a pull request

## Pull Request Process

### Before Submitting

- [ ] Code builds without errors (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] Linter passes (`npm run lint`)
- [ ] Add tests for new features
- [ ] Update documentation if needed
- [ ] Update CHANGELOG.md

### PR Guidelines

1. **Title**: Clear, concise description
   - Good: "Add support for React Native icon generation"
   - Bad: "Fixed stuff"

2. **Description**: Use the PR template
   - What changed and why
   - Link related issues
   - Include screenshots for UI changes

3. **Size**: Keep PRs focused
   - One feature/fix per PR
   - Split large changes into multiple PRs

4. **Commits**: Clean, logical commits
   - See [Commit Messages](#commit-messages) below

### Review Process

- Maintainers will review within 3-5 business days
- Address feedback promptly
- Keep discussions respectful
- Be open to suggestions

## Coding Guidelines

### TypeScript

- Use TypeScript strict mode
- Define proper interfaces and types
- Avoid `any` types when possible
- Document complex functions

### Code Style

```typescript
// Good: Clear, typed, documented
/**
 * Generates platform-specific assets based on project type
 * @param projectType - Type of project (React, Vue, etc.)
 * @param frameworks - Detected frameworks
 * @returns Array of asset requirements
 */
async generatePlatformAssets(
  projectType: string,
  frameworks: string[]
): Promise<AssetNeed[]> {
  // Implementation
}

// Bad: Unclear, no types, no docs
function doStuff(thing: any) {
  // stuff
}
```

### File Organization

```
src/
├── core/           # Core business logic
├── utils/          # Utility functions
├── types/          # TypeScript interfaces
└── cli.ts          # CLI entry point
```

### Naming Conventions

- **Files**: PascalCase for classes (`CodebaseScanner.ts`)
- **Variables**: camelCase (`assetNeed`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Interfaces**: PascalCase with 'I' prefix optional (`AssetNeed`)
- **Functions**: camelCase, descriptive verbs (`generateAssets`)

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- CodebaseScanner.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Writing Tests

```typescript
describe('CodebaseScanner', () => {
  it('should detect React projects correctly', async () => {
    const scanner = new CodebaseScanner();
    const result = await scanner.scanProject('/path/to/react-project');

    expect(result.projectType).toBe('React');
    expect(result.frameworks).toContain('React');
  });
});
```

### Test Coverage

- Aim for >80% coverage
- Test edge cases and error handling
- Mock external API calls

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

### Examples

```bash
feat(scanner): add React Native platform detection
fix(generator): correct aspect ratio calculation for banners
docs(readme): update installation instructions
test(analyzer): add tests for quality validation
refactor(orchestrator): simplify agent initialization
```

## Project Structure

```
genass/
├── .github/              # GitHub templates and workflows
├── src/                  # Source code
│   ├── core/            # Core logic (scanner, generator, etc.)
│   ├── utils/           # Utilities (logger, config, etc.)
│   ├── types/           # TypeScript type definitions
│   ├── cli.ts           # CLI entry point
│   └── index.ts         # Library exports
├── dist/                 # Compiled JavaScript (gitignored)
├── examples/             # Usage examples
├── tests/                # Test files
├── docs/                 # Documentation
├── .env.example          # Example environment file
├── package.json
├── tsconfig.json
└── README.md
```

## Areas for Contribution

### High Priority

- [ ] Add comprehensive test coverage
- [ ] Improve error messages and handling
- [ ] Add support for more frameworks (Svelte, Solid, etc.)
- [ ] Optimize image generation prompts
- [ ] Add caching for expensive operations

### Medium Priority

- [ ] Add CLI progress indicators
- [ ] Implement asset versioning
- [ ] Add export to different formats
- [ ] Create web UI for configuration
- [ ] Add plugin system

### Documentation

- [ ] Video tutorials
- [ ] More usage examples
- [ ] API documentation
- [ ] Architecture diagrams

## Questions?

- Open a [Discussion](https://github.com/your-username/genass/discussions)
- Join our [Discord](https://discord.gg/genass) (if available)
- Email: maintainer@example.com

## License

By contributing, you agree that your contributions will be licensed under the MIT License.