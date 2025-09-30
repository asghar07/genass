# GenAss User Guide

Complete guide to using GenAss for AI-powered asset generation.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Interactive Mode](#interactive-mode)
3. [Slash Commands](#slash-commands)
4. [Workflow Examples](#workflow-examples)
5. [Configuration](#configuration)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## Getting Started

### Installation

```bash
# Install globally
npm install -g genass

# Or use locally
npx genass
```

### First Run

```bash
genass
```

You'll be asked one question about your app's purpose. This is saved to `AGENTS.md` and never asked again!

## Interactive Mode

GenAss runs in interactive mode by default, like Claude Code.

### Features

- 💬 **Conversational AI** - Natural language interactions
- 🧠 **Context memory** - Remembers your app via AGENTS.md
- ⚡ **Streaming** - Real-time AI responses
- 📋 **Task tracking** - Visual checklists
- 🎨 **Smart names** - AI generates clean filenames
- 💉 **Auto-injection** - Shows code snippets

### Session Commands

Type `/` and press Enter to see all commands:

```
? Choose a command: (Use arrow keys)
❯ /scan      - Scan project and create generation plan
  /logo      - Generate professional app logo
  /icons     - Generate complete UI icon set
  ...
```

## Slash Commands

### Quick Actions

| Command | Description | Example Output |
|---------|-------------|----------------|
| `/scan` | Scan project for missing assets | Finds 10 missing assets |
| `/logo` | Generate app logo | Creates `app-logo.png` |
| `/icons` | Generate UI icon set | Creates 8-12 icons |
| `/hero` | Generate hero banner | Creates `hero-banner.png` |
| `/favicon` | Generate favicon package | 4 sizes + formats |
| `/social` | Generate social media assets | OG, Twitter cards |
| `/branding` | Complete branding package | Logo + icons + social |
| `/pwa` | Generate PWA icons | Manifest + maskable icons |
| `/audit` | Audit existing assets | Quality report |
| `/quick` | Generate essentials only | Logo + favicon + hero |
| `/inject` | Show code snippets | Import statements |
| `/regenerate` | Force regenerate all | Ignores existing |

### Session Commands

- `/help` - Show all commands
- `/status` - Session statistics
- `/clear` - Clear history
- `/exit` - Quit session

## Workflow Examples

### Example 1: New Project

```bash
genass

Your app: It's a task management SaaS app

genass> /scan
# Scans project, finds 12 missing assets

genass> /branding
# Generates complete branding package

genass> /inject
# Shows import statements to copy into code
```

### Example 2: Just a Logo

```bash
genass

Your app: E-commerce store for handmade crafts

genass> /logo
# Generates professional logo reflecting crafts theme

genass> /inject
# Shows how to use it in code
```

### Example 3: Existing Project

```bash
genass

👋 Welcome back!
✓ Loaded context from AGENTS.md

genass> /scan

⏭️  Skipping 6 assets that already exist:
  ✓ logo: app-logo.png
  ✓ favicon: unified-favicon.png

Only 2 new assets needed!
Estimated cost: $0.08 (saved $0.23!)

genass> generate them
# Generates only the 2 missing assets
```

### Example 4: Force Regeneration

```bash
genass> /regenerate
# Regenerates ALL assets, ignoring existing ones
# Useful when you want a fresh design
```

## Configuration

### Auto-Generated Config

GenAss creates `genass.config.json` automatically on first run. You don't need to create it!

### Framework-Specific Defaults

GenAss auto-detects your framework and applies smart defaults:

**React/Next.js:**
- Asset dirs: `public/`, `src/assets/`
- Excludes: `node_modules/`, `.next/`, `build/`

**Vue/Nuxt:**
- Asset dirs: `public/`, `static/`, `src/assets/`
- Excludes: `node_modules/`, `.nuxt/`, `dist/`

**Angular:**
- Asset dirs: `src/assets/`
- Excludes: `node_modules/`, `dist/`, `.angular/`

### Manual Configuration

Edit `genass.config.json` if needed:

```json
{
  "assetDirectories": ["public", "src/assets"],
  "preferredImageFormat": "png",
  "generation": {
    "concurrency": 3,
    "quality": "high"
  }
}
```

### Local Overrides

Create `genass.config.local.json` for personal settings (gitignored).

## Best Practices

### 1. Start with /scan

Always run `/scan` first to understand what's needed:

```bash
genass> /scan
```

### 2. Review Before Generating

Check the generation plan:
- Asset count
- Estimated cost
- Priority breakdown

### 3. Use /quick for MVP

For fast launches:

```bash
genass> /quick
# Generates: logo + favicon + hero only
```

### 4. Edit AGENTS.md

Update your app description anytime:

```bash
vim AGENTS.md
# Edit "App Purpose" section
# Next session uses updated context
```

### 5. Check Existing Assets

Let GenAss skip duplicates to save money:

```bash
genass> /scan
# Automatically detects and skips existing assets
```

### 6. Use /inject

After generation, get ready-to-use code:

```bash
genass> /inject
# Copy/paste the import statements
```

## Troubleshooting

### "GEMINI_API_KEY not found"

Get your API key from Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click **+ CREATE CREDENTIALS** → **API Key**
4. Enable **Generative Language API** (Gemini)
5. Copy your API key

Set your API key:

```bash
export GEMINI_API_KEY=your_key_here
# Or create .env file with the key
```

**Note:** Use Google Cloud Console, not AI Studio, for the API key.

### "No assets generated"

Check the logs:

```bash
cat logs/genass-*.log
```

Common issues:
- API key invalid
- Rate limits hit
- Quality check failed

### "Dimensions are null"

This is fixed in latest version. Update:

```bash
npm install -g genass@latest
```

### Assets Not Showing in /inject

Make sure assets are in `public/assets/`:

```bash
ls public/assets
```

### Want to Start Fresh

```bash
genass> /clear      # Clear conversation
rm AGENTS.md        # Remove saved context
genass              # Start fresh
```

## Cost Management

### Viewing Costs

```bash
genass> /status
# Shows: Estimated cost: $0.XX
```

### Cost Per Asset

- Nano Banana: **$0.039 per image**
- Gemini analysis: **~$0.05 per scan**

### Typical Project Costs

- Logo only: **$0.04**
- Logo + favicon + hero: **$0.12**
- Full branding package: **$0.50 - $1.00**
- Complete app assets (20+): **$1.00 - $2.00**

**20x cheaper than competitors!**

## Tips & Tricks

### 1. Use Natural Language

```bash
genass> I need a minimalist logo with a blue color scheme
genass> Create icons for a fitness tracking app
genass> Generate a hero image showing teamwork
```

### 2. Leverage Context

The AI knows your app from AGENTS.md:

```bash
# If AGENTS.md says "fitness tracker"
genass> generate icons
# AI suggests: activity icons, heart rate, steps, etc.
```

### 3. Iterate on Designs

```bash
genass> /logo
# If you don't like it:
genass> /regenerate
# Generates fresh designs
```

### 4. Organize Assets

Assets auto-organize by type:
- `public/assets/logos/`
- `public/assets/icons/`
- `public/assets/banners/`
- `public/assets/misc/`

### 5. Use Keyboard Shortcuts

- Type `/` + Enter → Command menu
- Type `/scan` + Enter → Quick scan
- TAB → Autocomplete commands
- Ctrl+C → Cancel operation
- Ctrl+D → Exit session

## Next Steps

- Read [CONTRIBUTING.md](../CONTRIBUTING.md) to contribute
- Check [examples/](../examples/) for code samples
- Visit [GitHub Issues](https://github.com/asghar07/genass/issues) for support
- Star the repo if you find it useful!

---

Made with ❤️ using Google Gemini AI and Nano Banana