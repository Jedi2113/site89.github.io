#!/bin/bash
# Minify and obfuscate all JavaScript files for SITE-89

# This script requires terser to be installed:
# npm install -g terser

echo "SITE-89 JavaScript Minification"
echo "=============================="
echo ""

if ! command -v terser &> /dev/null; then
    echo "❌ terser is not installed"
    echo "Install with: npm install -g terser"
    exit 1
fi

JS_DIR="assets/js"
count=0

# Find all JS files that aren't already minified
for file in $(find $JS_DIR -name "*.js" -not -name "*.min.js"); do
    if [ -f "$file" ]; then
        minified="${file%.js}.min.js"
        echo "Minifying: $file → $minified"
        terser "$file" -c -m -o "$minified"
        
        if [ $? -eq 0 ]; then
            count=$((count + 1))
            echo "✓ Success"
        else
            echo "✗ Failed"
        fi
    fi
done

echo ""
echo "=============================="
echo "Minified $count files"
echo ""
echo "Next steps:"
echo "1. Update HTML files to use .min.js versions"
echo "2. Example: <script src=\"/assets/js/auth.min.js\"></script>"
echo "3. Test thoroughly before deploying"
