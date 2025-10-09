#!/bin/bash

# LinkedIn API Setup for AI-Now
# Helps configure LinkedIn API integration

echo "💼 LinkedIn API Setup for AI-Now"
echo "==============================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if config template exists
if [ ! -f "linkedin-config-template.json" ]; then
    echo -e "${RED}❌ LinkedIn config template not found${NC}"
    exit 1
fi

# Check if config already exists
if [ -f "linkedin-config.json" ]; then
    echo -e "${YELLOW}⚠️  LinkedIn config already exists${NC}"
    read -p "Do you want to recreate it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}💡 Config already exists. Run 'node linkedin-poster.js auth' to authenticate${NC}"
        exit 0
    fi
fi

echo -e "${BLUE}📋 To set up LinkedIn API:${NC}"
echo "1. Go to: https://developer.linkedin.com/"
echo "2. Create a new app or use existing one"
echo "3. Get your Client ID and Client Secret"
echo "4. Add http://localhost:3003/callback as redirect URI"
echo ""

# Copy template
cp linkedin-config-template.json linkedin-config.json
echo -e "${GREEN}✅ Created linkedin-config.json${NC}"

echo -e "${YELLOW}📝 Please edit linkedin-config.json and add your app credentials:${NC}"
echo "  - clientId: Your LinkedIn Client ID"
echo "  - clientSecret: Your LinkedIn Client Secret"
echo "  - redirectUri: http://localhost:3003/callback (should be set automatically)"
echo ""

echo -e "${BLUE}🔐 Once configured, run:${NC}"
echo "  node linkedin-poster.js auth    # Authenticate with LinkedIn"
echo "  node linkedin-poster.js test    # Test the connection"
echo ""

echo -e "${GREEN}🎉 Setup complete! Edit the config file and run authentication.${NC}"