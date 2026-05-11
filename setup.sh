#!/bin/bash

# Quick Start Script for Tokens Extractor
# Run this after cloning the repo: ./setup.sh

echo "🚀 Setting up Tokens Extractor..."
echo ""

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ npm install failed"
    exit 1
fi

# Install browsers
echo ""
echo "🌐 Installing Playwright browsers (this may take a minute)..."
npm run install-browser

if [ $? -ne 0 ]; then
    echo "⚠️  Browser installation had issues, but you can try running anyway"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📖 Usage examples:"
echo "  node index.js example.com"
echo "  node index.js example.com --contact-only"
echo "  node index.js example.com --save-output --brand-guide"
echo ""
echo "💡 Tip: Create an alias by adding this to your ~/.bashrc or ~/.zshrc:"
echo "  alias extract='node $(pwd)/index.js'"
echo ""
echo "Then you can just run: extract example.com"
echo ""
