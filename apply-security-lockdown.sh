#!/bin/bash
# SITE-89 Security Lockdown Application Script
# This script applies the security lockdown to all HTML files
# Usage: bash apply-security-lockdown.sh

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SECURITY_SCRIPT='<!-- SECURITY LOCKDOWN - LOAD FIRST -->\n  <script src="/assets/js/security-lockdown.js"><\/script>\n\n  '

# List of files that have been manually updated
UPDATED_FILES=(
    "index.html"
    "login.html"
    "admin/index.html"
    "accounts/index.html"
    "404/index.html"
    "anomalies/index.html"
    "departments/index.html"
    "personnel-files/index.html"
    "research-logs/index.html"
)

# Find all HTML files
HTML_FILES=$(find . -name "index.html" -type f | grep -v node_modules | grep -v .git)

echo -e "${YELLOW}SITE-89 Security Lockdown Application${NC}"
echo "========================================"
echo ""
echo -e "${YELLOW}Scanning for HTML files...${NC}"
echo ""

FILE_COUNT=0
UPDATED_COUNT=0
NEEDS_UPDATE=()

for file in $HTML_FILES; do
    FILE_COUNT=$((FILE_COUNT + 1))
    
    # Check if file already has security lockdown
    if grep -q "SECURITY LOCKDOWN - LOAD FIRST" "$file"; then
        echo -e "${GREEN}✓${NC} $file (already protected)"
        UPDATED_COUNT=$((UPDATED_COUNT + 1))
    else
        echo -e "${RED}✗${NC} $file (NEEDS UPDATE)"
        NEEDS_UPDATE+=("$file")
    fi
done

echo ""
echo "========================================"
echo -e "Total HTML files found: ${FILE_COUNT}"
echo -e "Protected: ${GREEN}${UPDATED_COUNT}${NC}"
echo -e "Need update: ${RED}${#NEEDS_UPDATE[@]}${NC}"
echo "========================================"
echo ""

if [ ${#NEEDS_UPDATE[@]} -gt 0 ]; then
    echo -e "${YELLOW}Files needing security lockdown:${NC}"
    for file in "${NEEDS_UPDATE[@]}"; do
        echo "  - $file"
    done
    echo ""
    echo "To apply security lockdown to these files, use:"
    echo "  sed -i 's/<head>/<head>\\n  <!-- SECURITY LOCKDOWN - LOAD FIRST -->\\n  <script src=\"\/assets\/js\/security-lockdown.js\"><\/script>\\n/' <filename>"
else
    echo -e "${GREEN}✓ All HTML files are protected!${NC}"
fi

echo ""
echo "========================================"
echo -e "${GREEN}Security Lockdown Status: ACTIVE${NC}"
echo "========================================"
