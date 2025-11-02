#!/bin/bash

# Setup Facebook Business API Integration for AI-Now
# This script helps configure Facebook API credentials

echo "📘 Facebook Business API Setup for AI-Now"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}This script will help you set up Facebook Business API integration.${NC}"
echo ""

# Check if config already exists
if [ -f "facebook-config.json" ]; then
    echo -e "${YELLOW}⚠️  facebook-config.json already exists.${NC}"
    echo -e "${BLUE}Current configuration:${NC}"
    cat facebook-config.json | grep -E '"(appId|pageId)"' | sed 's/,$//'
    echo ""
    
    read -p "Do you want to reconfigure? (y/N): " reconfigure
    if [[ ! "$reconfigure" =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}✅ Keeping existing configuration.${NC}"
        echo -e "${BLUE}💡 Run 'node facebook-poster.js auth' to authenticate.${NC}"
        exit 0
    fi
fi

echo -e "${YELLOW}📋 You'll need the following from Facebook Developers:${NC}"
echo "1. Facebook App ID"
echo "2. Facebook App Secret"
echo "3. Facebook Page ID"
echo ""
echo -e "${BLUE}📖 Setup Guide:${NC}"
echo "1. Go to: https://developers.facebook.com/"
echo "2. Create a new app or use existing one"
echo "3. Add Facebook Login and Pages API products"
echo "4. Get your App ID and App Secret from App Settings"
echo "5. Get your Page ID from your Facebook Page's About section"
echo ""
echo -e "${YELLOW}⚠️  Required Permissions:${NC}"
echo "• pages_manage_posts (to post to your page)"
echo "• pages_read_engagement (to read page data)"
echo "• pages_show_list (to access page information)"
echo ""

read -p "Do you have your Facebook App credentials ready? (y/N): " ready
if [[ ! "$ready" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Please get your credentials from Facebook Developers first.${NC}"
    echo -e "${BLUE}Then run this script again.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📝 Enter your Facebook credentials:${NC}"

# Get App ID
read -p "Facebook App ID: " app_id
if [ -z "$app_id" ]; then
    echo -e "${RED}❌ App ID is required${NC}"
    exit 1
fi

# Get App Secret
read -s -p "Facebook App Secret: " app_secret
echo ""
if [ -z "$app_secret" ]; then
    echo -e "${RED}❌ App Secret is required${NC}"
    exit 1
fi

# Get Page ID
read -p "Facebook Page ID: " page_id
if [ -z "$page_id" ]; then
    echo -e "${RED}❌ Page ID is required${NC}"
    exit 1
fi

# Get redirect URI (optional)
echo ""
echo -e "${BLUE}💡 Redirect URI (press Enter for default: https://localhost:3004/callback):${NC}"
read -p "Redirect URI: " redirect_uri
if [ -z "$redirect_uri" ]; then
    redirect_uri="https://localhost:3004/callback"
fi

# Create configuration file
echo -e "${BLUE}📁 Creating facebook-config.json...${NC}"

cat > facebook-config.json << EOF
{
  "appId": "$app_id",
  "appSecret": "$app_secret",
  "pageId": "$page_id",
  "redirectUri": "$redirect_uri"
}
EOF

echo -e "${GREEN}✅ Facebook configuration saved!${NC}"

# Verify the configuration
echo ""
echo -e "${BLUE}📋 Configuration Summary:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}App ID:${NC} $app_id"
echo -e "${BLUE}Page ID:${NC} $page_id"
echo -e "${BLUE}Redirect URI:${NC} $redirect_uri"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo -e "${YELLOW}🔐 Next Steps:${NC}"
echo "1. Make sure your Facebook App has these redirect URIs configured:"
echo "   • $redirect_uri"
echo ""
echo "2. Authenticate with Facebook:"
echo -e "   ${BLUE}node facebook-poster.js auth${NC}"
echo ""
echo "3. Test the connection:"
echo -e "   ${BLUE}node facebook-poster.js test${NC}"
echo ""
echo "4. Test posting:"
echo -e '   ${BLUE}node facebook-poster.js post '"'"'{"title":"Test Post","description":"Testing Facebook integration","brand":"ai-now","contentType":"standard"}'"'"'${NC}'
echo ""

echo -e "${GREEN}🎉 Facebook setup complete!${NC}"
echo -e "${BLUE}💡 You can now use Facebook posting in the cross-platform reposter.${NC}"