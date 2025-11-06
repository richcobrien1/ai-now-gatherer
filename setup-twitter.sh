#!/bin/bash

# X (Twitter) API Setup for AI-Now
# Helps configure X API integration with OAuth 2.0

echo "🐦 X (Twitter) API Setup for AI-Now"
echo "====================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if config template exists
if [ ! -f "twitter-config-template.json" ]; then
    echo -e "${RED}❌ Twitter config template not found${NC}"
    exit 1
fi

# Check if config already exists
if [ -f "twitter-config.json" ]; then
    echo -e "${YELLOW}⚠️  Twitter config already exists${NC}"
    read -p "Do you want to recreate it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}💡 Config already exists. Run 'node twitter-poster.js auth' to authenticate${NC}"
        exit 0
    fi
fi

echo -e "${BLUE}📋 X API Setup Instructions:${NC}"
echo ""
echo "1. Go to: https://developer.twitter.com/en/portal/dashboard"
echo "2. Select your app or create a new one"
echo "3. Navigate to 'User authentication settings'"
echo "4. Set up OAuth 2.0 with these settings:"
echo "   - Type of App: Web App"
echo "   - Callback URI: http://localhost:3003/callback"
echo "   - Website URL: https://www.v2u.us"
echo ""
echo "5. Go to 'Keys and tokens' section"
echo "6. Find 'OAuth 2.0 Client ID and Client Secret'"
echo "7. Copy your Client ID and Client Secret"
echo ""

# Copy template
cp twitter-config-template.json twitter-config.json
echo -e "${GREEN}✅ Created twitter-config.json${NC}"

echo ""
echo -e "${YELLOW}📝 Please edit twitter-config.json and add your OAuth 2.0 credentials:${NC}"
echo "  - apiKey: Your OAuth 2.0 Client ID"
echo "  - apiSecret: Your OAuth 2.0 Client Secret"
echo "  - callbackUri: http://localhost:3003/callback (already set)"
echo ""

echo -e "${BLUE}🔐 Once configured, run these commands:${NC}"
echo "  node twitter-poster.js auth    # Authenticate with X (opens browser)"
echo "  node twitter-poster.js test    # Test the connection"
echo "  node twitter-poster.js post    # Post a test tweet"
echo ""

echo -e "${YELLOW}⚠️  IMPORTANT SECURITY NOTES:${NC}"
echo "  - Keep twitter-config.json and twitter-tokens.json private"
echo "  - These files are already in .gitignore"
echo "  - Never commit API credentials to version control"
echo "  - OAuth 2.0 tokens expire after 2 hours (auto-refreshed)"
echo ""

echo -e "${BLUE}📖 For detailed setup guide, see:${NC}"
echo "  X-TWITTER-SETUP-GUIDE.md"
echo ""

echo -e "${GREEN}🎉 Setup template created! Follow the instructions above.${NC}"
