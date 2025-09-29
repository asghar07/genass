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

1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Generate a new API key
4. Add it to your `.env` file as `GEMINI_API_KEY`

### 3. Optional: Google Cloud (Enterprise Features)

For enterprise features and higher rate limits, optionally set up:

1. Create a Google Cloud Project
2. Enable the Vertex AI API
3. Create a service account with Vertex AI permissions
4. Download the service account key JSON file
5. Set the `GOOGLE_APPLICATION_CREDENTIALS` path to the key file

## 🎯 Usage

### Initialize and Scan Project

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

### Generate Specific Assets

```bash
# Generate high priority assets only
genass generate --priority high

# Generate specific asset types
genass generate --type icon,logo

# Generate from existing plan
genass generate --plan ./generation-plan.json
```

### Project Status

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

### Project Configuration (`genass.config.json`)

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

## 💰 Cost Estimation

GenAss provides transparent cost estimation with Google's competitive pricing:

- **Nano Banana (Gemini 2.5 Flash Image)**: $0.039 per generated image
- **Gemini API**: Efficient usage-based pricing for analysis and planning
- **Batch Optimization**: Intelligent processing reduces overall costs

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

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/genass/issues)
- **Documentation**: [docs.genass.dev](https://docs.genass.dev)
- **Discord**: [Join our community](https://discord.gg/genass)

## 🙏 Acknowledgments

- [Google AI](https://ai.google.dev) for Gemini API and Nano Banana
- [Google Cloud](https://cloud.google.com) for Vertex AI infrastructure
- Open source community for inspiration and tools

---

**GenAss** - Generate comprehensive visual assets for your projects with Google's AI-powered intelligence.