#!/bin/bash

# GenAss Local Setup Script
# This script helps you set up GenAss for local development and usage

set -e

echo "🚀 GenAss Local Setup"
echo "====================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Build the project
echo ""
echo "🔨 Building project..."
npm run build

# Link globally
echo ""
echo "🔗 Linking CLI globally..."
npm link

# Verify installation
echo ""
echo "🧪 Verifying installation..."
if command -v genass &> /dev/null; then
    echo "✅ GenAss CLI installed successfully!"
    genass --version
else
    echo "❌ CLI linking failed. You may need to use sudo:"
    echo "   sudo npm link"
    exit 1
fi

# Set up environment
echo ""
echo "⚙️  Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from template"
else
    echo "ℹ️  .env file already exists"
fi

# Show next steps
echo ""
echo "🎯 Next Steps:"
echo "=============="
echo ""
echo "1. Configure your API keys in .env:"
echo "   nano .env"
echo ""
echo "2. Get your API keys:"
echo "   • Anthropic: https://console.anthropic.com/"
echo "   • Google Cloud: https://console.cloud.google.com/"
echo ""
echo "3. Or run the interactive setup:"
echo "   genass config --setup"
echo ""
echo "4. Test the installation:"
echo "   genass init --dry-run"
echo ""
echo "5. Try the examples:"
echo "   node examples/run-examples.js"
echo ""
echo "🎉 Setup complete! Happy generating!"