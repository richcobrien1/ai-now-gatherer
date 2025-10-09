#!/bin/bash

# Twitter API Setup for AI-Now
# Helps configure Twitter API integration

echo "🐦 Twitter API Setup for AI-Now"
echo "==============================="

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

echo -e "${BLUE}📋 To set up Twitter API:${NC}"
echo "1. Go to: https://developer.twitter.com/"
echo "2. Create a new app or use existing one"
echo "3. Get your API Key and API Secret"
echo ""

# Copy template
cp twitter-config-template.json twitter-config.json
echo -e "${GREEN}✅ Created twitter-config.json${NC}"

echo -e "${YELLOW}📝 Please edit twitter-config.json and add your API credentials:${NC}"
echo "  - apiKey: Your Twitter API Key"
echo "  - apiSecret: Your Twitter API Secret"
echo ""

echo -e "${BLUE}🔐 Once configured, run:${NC}"
echo "  node twitter-poster.js auth    # Authenticate with Twitter"
echo "  node twitter-poster.js test    # Test the connection"
echo ""

echo -e "${GREEN}🎉 Setup complete! Edit the config file and run authentication.${NC}"