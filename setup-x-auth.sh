#!/bin/bash

# Quick setup script for X (Twitter) authentication
# Compatible with bash in VSCode on Windows

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "========================================"
echo "  X (Twitter) API Authentication"
echo "  AI-Now Social Posting Automation"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js is not installed or not in PATH${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    read -p "Press Enter to exit..."
    exit 1
fi

# Check if twitter-poster.js exists
if [ ! -f "twitter-poster.js" ]; then
    echo -e "${RED}[ERROR] twitter-poster.js not found${NC}"
    echo "Please run this script from the news-collector directory"
    read -p "Press Enter to exit..."
    exit 1
fi

# Check if twitter-config.json exists
if [ ! -f "twitter-config.json" ]; then
    echo -e "${YELLOW}[WARNING] twitter-config.json not found${NC}"
    echo "Creating from template..."
    
    if [ -f "twitter-config-template.json" ]; then
        cp twitter-config-template.json twitter-config.json
        echo -e "${GREEN}[SUCCESS] Created twitter-config.json${NC}"
        echo ""
        echo -e "${YELLOW}IMPORTANT: Please edit twitter-config.json with your X API credentials:${NC}"
        echo "  - apiKey: Your OAuth 2.0 Client ID"
        echo "  - apiSecret: Your OAuth 2.0 Client Secret"
        echo ""
        echo "Then run this script again."
        read -p "Press Enter to exit..."
        exit 0
    else
        echo -e "${RED}[ERROR] twitter-config-template.json not found${NC}"
        read -p "Press Enter to exit..."
        exit 1
    fi
fi

echo -e "${BLUE}[INFO] Starting X authentication flow...${NC}"
echo ""
echo "This will:"
echo "  1. Start a local server on http://localhost:3003"
echo "  2. Open your browser to authorize the app"
echo "  3. Redirect back with an authorization code"
echo "  4. Save your access tokens automatically"
echo ""
echo -e "${YELLOW}Make sure http://localhost:3003/callback is set in your X app settings!${NC}"
echo ""
read -p "Press Enter to continue..."

# Run the authentication
node twitter-poster.js auth

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "  Authentication Complete!"
    echo "========================================"
    echo ""
    echo "You can now:"
    echo "  - Test connection: node twitter-poster.js test"
    echo "  - Post tweets: node twitter-poster.js post"
    echo "  - Use the admin dashboard at /admin/social-posting"
    echo ""
else
    echo ""
    echo "========================================"
    echo "  Authentication Failed"
    echo "========================================"
    echo ""
    echo "Please check:"
    echo "  1. Your OAuth 2.0 credentials in twitter-config.json"
    echo "  2. Callback URI is http://localhost:3003/callback in X app settings"
    echo "  3. Your app has Read and Write permissions"
    echo ""
fi

read -p "Press Enter to exit..."
