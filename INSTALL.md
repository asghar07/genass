# 🚀 GenAss Local Installation Guide

## Quick Setup

### 1. Clone and Install
```bash
# Clone the repository (if you haven't already)
git clone <repository-url> genass
cd genass

# Install dependencies and build
npm install

# Link globally for CLI usage
npm link
```

### 2. Verify Installation
```bash
# Check if genass is available
which genass

# Test the CLI
genass --help
```

### 3. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your API keys
nano .env  # or your preferred editor
```

### 4. Required API Keys

#### Google Gemini API
1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Generate a new API key
4. Add to `.env`: `GEMINI_API_KEY=your_key_here`

#### Optional: Google Cloud (Enterprise Features)
For enterprise features and higher rate limits:
1. Create a [Google Cloud Project](https://console.cloud.google.com/)
2. Enable the Vertex AI API
3. Create a service account with Vertex AI permissions
4. Download the service account key JSON file
5. Add to `.env`:
   ```
   GOOGLE_CLOUD_PROJECT_ID=your_project_id
   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
   ```

### 5. Interactive Setup (Alternative)
```bash
# Run the setup wizard
genass config --setup
```

## Quick Test

```bash
# Test environment setup
genass init --dry-run

# Full workflow test (in a test project)
cd /path/to/test/project
genass init
```

## Alternative Installation Methods

### Option 1: Direct Node Execution
```bash
# Without global linking
npm install
npm run build
node dist/cli.js --help
```

### Option 2: NPX Usage
```bash
# From the genass directory
npx . --help
```

### Option 3: Local Development
```bash
# For development with auto-rebuild
npm run dev -- --help
```

## Troubleshooting

### Missing Dependencies
```bash
npm install
npm run build
```

### CLI Not Found After npm link
```bash
# Re-link the package
npm unlink -g genass
npm link
```

### Permission Issues
```bash
# If you get permission errors
sudo npm link
```

### API Key Issues
```bash
# Validate environment
genass config
```

## Example Usage

```bash
# 1. Navigate to your project
cd /path/to/your/project

# 2. Initialize GenAss
genass init

# 3. Follow the interactive prompts
# 4. Review and approve the generation plan
# 5. Watch as assets are generated!
```

## Development Commands

```bash
# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Run examples
node examples/run-examples.js
```