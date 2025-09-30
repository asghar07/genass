# GenAss - AI-Powered Asset Generator

A comprehensive CLI tool that intelligently scans your codebase, identifies missing visual assets, and generates them using Google's Gemini API multi-agent workflows and Nano Banana (Gemini 2.5 Flash Image) generation.

## 🚀 Features

- **Intelligent Codebase Scanning**: Automatically analyzes your project structure using Gemini's 1M+ token context window
- **Multi-Agent AI Planning**: Uses Google Gemini API to orchestrate specialized AI agents for comprehensive asset analysis
- **Nano Banana Generation**: Leverages Google's latest Nano Banana (Gemini 2.5 Flash Image) for high-quality asset creation
- **Framework-Aware**: Supports React, Vue.js, Angular, Next.js, React Native, and more with intelligent detection
- **Interactive Workflow**: Plan approval process with transparent cost estimation ($0.039 per image)
- **Batch Processing**: Efficient concurrent asset generation with intelligent rate limiting
- **Professional Quality**: Generates production-ready assets with character consistency and multi-image blending

## 📦 Installation

### NPM Installation (Recommended)

```bash
# Install globally
npm install -g genass

# Or use with npx (no installation)
npx genass
```

### Local Development Installation

```bash
# Clone and install locally
git clone <repository-url> genass
cd genass

# Quick setup with script
./setup.sh

# Or manual setup:
npm install
npm run build
npm link

# Verify installation
genass --version
```

### Future NPM Installation (Coming Soon)
```bash
# Will be available once published
npm install -g genass
```

## 🛠️ Setup

### 1. API Keys Configuration

GenAss requires a Google Gemini API key for all AI operations:

```bash
# Run the interactive setup wizard
genass config --setup
```

Or manually configure environment variables:

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your API keys
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Google Gemini API Setup

**Get your API key from Google Cloud Console:**

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Go to **APIs & Services** → **Credentials**
4. Click **+ CREATE CREDENTIALS** → **API Key**
5. Enable the **Generative Language API** (Gemini)
6. Copy your API key
7. Add it to your `.env` file as `GEMINI_API_KEY`

**Important:** Use the API key from **Google Cloud Console Credentials**, not AI Studio.

### 3. Optional: Google Cloud (Enterprise Features)

For enterprise features and higher rate limits, optionally set up:

1. Create a Google Cloud Project
2. Enable the Vertex AI API
3. Create a service account with Vertex AI permissions
4. Download the service account key JSON file
5. Set the `GOOGLE_APPLICATION_CREDENTIALS` path to the key file

## 🎯 Usage

### Interactive Mode (Recommended) 🆕

GenAss now features an **interactive AI-powered session** with context caching and streaming responses - similar to Claude Code!

```bash
# Start interactive session (default when running genass without commands)
genass

# Or explicitly start chat mode
genass chat

# Start in specific project directory
genass chat --path /path/to/project
```

**Features:**
- 💬 **Conversational interface** - Natural language interactions
- 🧠 **Context caching** - Maintains conversation history and project context
- ⚡ **Streaming responses** - Real-time AI output as it's generated
- 📊 **Session tracking** - Token usage, costs, and statistics
- 🎨 **Rich UI** - Beautiful formatting with colors and progress indicators

**Session commands:**
- `/help` - Show all available commands
- `/status` - Display session statistics
- `/clear` - Clear conversation history
- `/exit` - Exit the session

**⚡ Quick Action Commands (Pre-engineered Prompts):**
- `/scan` - Scan project and create generation plan
- `/logo` - Generate professional app logo
- `/icons` - Generate complete UI icon set
- `/hero` - Generate hero banner image
- `/favicon` - Generate favicon package
- `/social` - Generate social media assets (OG images, Twitter cards)
- `/branding` - Complete branding package (logo, icons, social assets)
- `/pwa` - Generate PWA manifest icons
- `/audit` - Audit existing assets for quality/consistency
- `/quick` - Generate essential assets only (fast launch)
- `/prompt` - **Generate ANY image from custom prompt** 🆕
- `/inject` - Show code snippets for generated assets
- `/regenerate` - Force regenerate all (ignore existing)
- `/costs` - View cost tracking and budget

**Example interactions:**
```
genass> /scan                    # Quick project scan
genass> /logo                    # Generate logo instantly
genass> /prompt                  # Generate ANY custom image!
genass> /branding                # Complete branding package
genass> What icons do I need?    # Natural language still works!
```

### Custom Prompt Generation 🆕

Generate **any image** from a custom prompt:

```bash
genass> /prompt

🎨 Custom Image Generation

Your prompt: A futuristic dashboard with holographic charts and data visualizations

Filename (default: auto-generated): dashboard-preview
Width in pixels (default: 1024): 1920
Height in pixels (default: 1024): 1080

⚡ Generating image...
✔ Image generated successfully!

✓ Generated: generated-assets/custom/dashboard-preview.png
  Size: 1920x1080px
  Cost: $0.039
```

**Use cases:**
- Hero images with specific themes
- Custom illustrations for features
- Unique backgrounds
- Marketing visuals
- Placeholder images
- Any creative visual you need!

### Command Mode

For scripting and automation, use traditional commands:

#### Initialize and Scan Project

```bash
# Scan current directory and create generation plan
genass init

# Scan specific project path
genass init --path /path/to/your/project

# Dry run - analyze without generating plan
genass init --dry-run

# Use custom configuration
genass init --config ./custom-config.json
```

#### Generate Specific Assets

```bash
# Generate high priority assets only
genass generate --priority high

# Generate specific asset types
genass generate --type icon,logo

# Generate from existing plan
genass generate --plan ./generation-plan.json
```

#### Project Status

```bash
# Show current project status
genass status

# Show configuration
genass config
```

## 🏗️ How It Works

### 1. Codebase Analysis
- Scans all code files for asset references and patterns
- Identifies missing assets based on common usage patterns
- Analyzes project type and frameworks for context-aware suggestions
- Evaluates existing assets for quality and suitability

### 2. Multi-Agent Planning
GenAss uses Google Gemini API to coordinate specialized AI agents:

- **Codebase Scanner**: Deep analysis using Gemini's 1M+ token context window
- **Asset Analyzer**: Comprehensive project needs assessment and recommendations
- **Prompt Engineer**: Optimizes prompts specifically for Nano Banana generation
- **Project Consultant**: Strategic prioritization and transparent cost estimation

### 3. Interactive Approval
- Presents comprehensive generation plan with transparent Nano Banana pricing ($0.039/image)
- Allows selective asset generation by priority or type
- Provides detailed asset descriptions and usage context
- Real-time cost calculations and ROI projections

### 4. Nano Banana Generation
- Uses Google's latest Nano Banana (Gemini 2.5 Flash Image) for premium quality
- Character consistency across multiple asset generations
- Multi-image blending capabilities for complex compositions
- Natural language editing and refinement commands
- Automatic SynthID watermarking for authenticity

## 📁 Project Structure

```
your-project/
├── genass.config.json          # Project configuration
├── generated-assets/           # Generated assets output
│   ├── icons/
│   ├── logos/
│   ├── banners/
│   └── illustrations/
└── logs/                      # Generation logs
```

## ⚙️ Configuration

**TL;DR: Configuration is optional!** GenAss automatically generates sensible defaults based on your project type. You only need to customize if you want to override defaults.

### Project Configuration (`genass.config.json`)

The config file is **automatically created** on first run if it doesn't exist. You can:

- **Skip it entirely** - GenAss creates smart defaults based on your framework
- **Commit it** - Share config across your team
- **Override locally** - Use `genass.config.local.json` for personal settings (gitignored)

**Example auto-generated config:**

```json
{
  "name": "My Project",
  "excludePatterns": [
    "node_modules/**",
    "dist/**",
    "*.log"
  ],
  "assetDirectories": [
    "public",
    "src/assets",
    "assets"
  ],
  "preferredImageFormat": "png",
  "maxAssetSize": 2097152,
  "generation": {
    "concurrency": 3,
    "retries": 3,
    "quality": "standard"
  },
  "output": {
    "directory": "generated-assets",
    "naming": "descriptive",
    "organizationStrategy": "by-type"
  }
}
```

**Framework-specific defaults** are automatically applied for React, Next.js, Vue, Angular, Svelte, and more!

### Global Configuration

Stored in `~/.genass/config.json`:

```json
{
  "anthropicApiKey": "your-key",
  "googleCloudProjectId": "your-project",
  "imageProvider": "vertex",
  "defaultAssetFormat": "png",
  "maxConcurrentGenerations": 3
}
```

## 🎨 Supported Asset Types

- **Icons**: App icons, favicons, UI icons with proper sizing
- **Logos**: Brand logos with transparent backgrounds
- **Banners**: Hero banners, promotional images
- **Illustrations**: Custom illustrations for empty states, features
- **Backgrounds**: Subtle patterns and gradients
- **Social Media**: Open Graph images, social sharing graphics
- **UI Elements**: Buttons, badges, decorative elements

## 🔧 Advanced Usage

### Custom Asset Requirements

Create a `assets-requirements.json` file to specify custom asset needs:

```json
{
  "customAssets": [
    {
      "type": "icon",
      "description": "Settings gear icon",
      "dimensions": { "width": 24, "height": 24 },
      "usage": ["settings page", "navigation"],
      "priority": "high",
      "style": "minimal line art"
    }
  ]
}
```

### Framework-Specific Optimizations

GenAss automatically optimizes for your framework:

- **React/Next.js**: SVG icons, optimized images, proper imports
- **Vue.js/Nuxt.js**: Asset organization compatible with Vue ecosystem
- **React Native**: Multiple resolution variants for different screen densities
- **Angular**: Material Design compliance when Material UI is detected

## 💰 Cost Tracking & Budget Management

GenAss provides transparent cost tracking with built-in budget limits:

- **Nano Banana (Gemini 2.5 Flash Image)**: $0.039 per generated image
- **Gemini API**: Efficient usage-based pricing for analysis and planning
- **Automatic tracking**: All costs saved to `~/.genass/costs.json`
- **Budget alerts**: Get warned when approaching monthly limit

### View Costs

```bash
genass> /costs

💰 Cost Summary:

  Total spent:    $2.45
  Total assets:   63
  Avg per asset:  $0.039

  Today:          $0.12
  This week:      $0.89
  This month:     $2.45

  Total ops:      45

✓ Within budget: $7.55 remaining this month
```

### Set Budget Limit

```bash
# Set monthly budget limit (default: $10)
MONTHLY_BUDGET_LIMIT=25.0 genass
```

Example cost for a typical project:
- 10 icons + 2 logos + 1 banner = ~$0.51 (13 × $0.039)
- Planning and analysis with Gemini = ~$0.05
- **Total**: ~$0.56

**20x cheaper than competitors** while delivering premium quality!

## 🚦 Rate Limits & Performance

- **Concurrent Generation**: 3 assets by default (configurable)
- **Rate Limiting**: Built-in respect for API limits
- **Retry Logic**: Automatic retry with exponential backoff
- **Batch Processing**: Efficient queue management

## 🧪 Development

```bash
# Clone the repository
git clone https://github.com/your-username/genass.git
cd genass

# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test
```

## 📚 Documentation

- **[Setup Guide](docs/SETUP_GUIDE.md)** - Step-by-step installation & API key setup
- **[User Guide](docs/USER_GUIDE.md)** - Complete usage guide with examples
- **[API Documentation](docs/API.md)** - Programmatic API reference
- **[Security Policy](SECURITY.md)** - Security best practices
- **[Publishing Guide](docs/PUBLISHING.md)** - How to publish/release (for contributors)
- **[Examples](docs/examples/)** - Code examples and tutorials
- **[CHANGELOG](CHANGELOG.md)** - Version history and changes

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/asghar07/genass/issues)
- **Discord**: [Join GenAss Community](https://discord.gg/genass)
- **npm**: [npmjs.com/package/genass](https://www.npmjs.com/package/genass)

## 🔒 Security

GenAss follows security best practices:

- ✅ All API keys stored in environment variables only
- ✅ No secrets committed to version control
- ✅ `.env` files automatically gitignored
- ✅ Budget limits prevent runaway costs
- ✅ Input validation on all operations
- ✅ Scope restricted to asset generation only

**See [SECURITY.md](SECURITY.md) for complete security policy.**

**NEVER commit your `.env` file or share your API keys!**

## 🙏 Acknowledgments

- [Google AI](https://ai.google.dev) for Gemini API and Nano Banana
- [Google Cloud](https://cloud.google.com) for Vertex AI infrastructure
- Open source community for inspiration and tools

---

**GenAss** - Generate comprehensive visual assets for your projects with Google's AI-powered intelligence.

Made with ❤️ by [Asghar](https://github.com/asghar07)