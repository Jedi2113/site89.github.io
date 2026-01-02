#!/bin/bash

# SITE-89 JavaScript Protection & Obfuscation

echo "🔒 SITE-89 JavaScript Protection Tool"
echo "===================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"
    echo "Install from: https://nodejs.org"
    exit 1
fi

# Check if terser is installed, if not install it
if ! npm list -g terser &> /dev/null 2>&1; then
    echo "📦 Installing terser (JS minifier)..."
    npm install -g terser
fi

echo ""
echo "🔐 Running obfuscation & protection..."
echo ""

# Run the protection script
node protect-js.js

echo ""
echo "===================================="
echo ""
echo "✅ Protection complete!"
echo ""
echo "The obfuscated files are in: assets/js/encrypted/"
echo ""
echo "To use them:"
echo "1. Replace originals: cp -r assets/js/encrypted/* assets/js/"
echo "2. Or update HTML to use encrypted versions"
echo "3. Deploy to production"
echo ""
