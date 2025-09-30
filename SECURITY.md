# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## API Key Security

### DO NOT Commit API Keys

GenAss requires a Google Gemini API key to function. **NEVER** commit your API keys to version control.

### Secure Storage

GenAss follows security best practices:

✅ **Environment Variables**
```bash
# Use .env file (automatically gitignored)
GEMINI_API_KEY=your_key_here
```

✅ **Local Configuration**
```bash
# Config files are gitignored
.env
.env.local
.genass.config.json
AGENTS.md
```

✅ **No Hardcoded Keys**
- All API keys loaded from environment variables
- No default/placeholder keys in code
- Validation before operations

### Files That Are Safe to Commit

✅ `.env.example` - Contains placeholders only
✅ `genass.config.json` - No secrets, project settings only
✅ `package.json` - Public package metadata

### Files That Are NEVER Committed

❌ `.env` - Contains real API keys (gitignored)
❌ `AGENTS.md` - Project-specific context (gitignored)
❌ `service-account*.json` - Google Cloud credentials (gitignored)
❌ `logs/` - May contain sensitive data (gitignored)

## What Gets Published to npm

The npm package **does NOT include**:

- Source code (`src/`)
- Environment files (`.env`)
- Examples and documentation
- Test files
- Development scripts
- Any secrets or credentials
- Log files
- Local configurations

Only includes:
- Compiled JavaScript (`dist/`)
- `README.md`
- `LICENSE`
- `CHANGELOG.md`
- `package.json`

See `.npmignore` for complete exclusion list.

## API Key Best Practices

### 1. Use .env File

```bash
cp .env.example .env
# Edit .env with your real key
```

### 2. Never Share .env

Do not:
- Commit .env to git
- Share .env in screenshots
- Include .env in support requests
- Copy .env to public locations

### 3. Rotate Keys Regularly

If you suspect your key is compromised:
1. Generate new API key at [Google AI Studio](https://aistudio.google.com/apikey)
2. Update `.env` file
3. Revoke old key

### 4. Set Budget Limits

```bash
# Limit monthly spending
MONTHLY_BUDGET_LIMIT=10.0
```

GenAss will warn you when budget is exceeded.

## Reporting a Vulnerability

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Email: asghar.07@gmail.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours.

## Security Features

### Built-in Protections

✅ **Input Validation** - All user inputs validated
✅ **Path Traversal Prevention** - File operations restricted to project
✅ **Rate Limiting** - Respects API rate limits
✅ **Cost Tracking** - Budget limits prevent runaway costs
✅ **Scope Restrictions** - AI limited to asset generation only
✅ **Error Handling** - Sensitive data not exposed in errors

### What GenAss Does NOT Do

❌ Execute arbitrary code
❌ Access files outside project directory
❌ Make network requests except to Google Gemini API
❌ Store API keys permanently
❌ Share data with third parties
❌ Track user behavior

## Third-Party Services

GenAss uses:
- **Google Gemini API** - For AI operations
  - Data sent: Code analysis, image prompts
  - Privacy: [Google AI Terms](https://ai.google.dev/terms)

## Local Data Storage

GenAss stores locally:
- `~/.genass/config.json` - User preferences (no secrets)
- `~/.genass/costs.json` - Cost tracking data
- Project `AGENTS.md` - App context (no secrets)
- Project `logs/` - Operation logs (check before sharing)

All sensitive data (API keys) stored only in environment variables.

## Audit

Last security audit: 2025-09-30
Next scheduled audit: 2025-12-30

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

---

For general support, see [GitHub Issues](https://github.com/asghar07/genass/issues).