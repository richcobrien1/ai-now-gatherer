#!/bin/bash

# AI-Now Cross-Platform Automation Setup
# Complete setup for Level 1 → Level 2 platform reposting

echo "🤖 AI-Now Cross-Platform Automation Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up automated reposting from Level 1 to Level 2 platforms...${NC}"
echo ""
echo -e "${YELLOW}Level 1 Platforms (Content Sources):${NC}"
echo "• YouTube - Video content"
echo "• Rumble - Alternative video platform"
echo "• Spotify - Podcast episodes"
echo ""
echo -e "${YELLOW}Level 2 Platforms (Social Networks):${NC}"
echo "• Twitter/X - Microblogging"
echo "• LinkedIn - Professional network"
echo "• Facebook - Social media"
echo "• Instagram - Visual content (coming soon)"
echo "• TikTok - Short-form video (coming soon)"
echo ""

# Check if Node.js dependencies are installed
echo -e "${BLUE}🔍 Checking dependencies...${NC}"

if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ No package.json found. Please run this from the news-collector directory.${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing Node.js dependencies...${NC}"
    npm install
fi

echo -e "${GREEN}✅ Dependencies ready${NC}"
echo ""

# Initialize cross-platform reposter (creates default config)
echo -e "${BLUE}🛠️  Initializing cross-platform configuration...${NC}"
node cross-platform-reposter.js status > /dev/null 2>&1
echo -e "${GREEN}✅ Cross-platform configuration initialized${NC}"
echo ""

# Platform setup menu
echo -e "${YELLOW}📋 Platform Setup Menu${NC}"
echo "Choose which platforms to configure:"
echo ""
echo "1. Twitter/X (recommended - easy setup)"
echo "2. LinkedIn (recommended - professional reach)"
echo "3. Facebook (business pages)"
echo "4. All platforms"
echo "5. Skip setup (configure manually later)"
echo ""

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo -e "${BLUE}🐦 Setting up Twitter...${NC}"
        ./setup-twitter.sh
        ;;
    2)
        echo -e "${BLUE}💼 Setting up LinkedIn...${NC}"
        ./setup-linkedin.sh
        ;;
    3)
        echo -e "${BLUE}📘 Setting up Facebook...${NC}"
        ./setup-facebook.sh
        ;;
    4)
        echo -e "${BLUE}🚀 Setting up all platforms...${NC}"
        echo ""
        echo -e "${YELLOW}1/3 Setting up Twitter...${NC}"
        ./setup-twitter.sh
        echo ""
        echo -e "${YELLOW}2/3 Setting up LinkedIn...${NC}"
        ./setup-linkedin.sh
        echo ""
        echo -e "${YELLOW}3/3 Setting up Facebook...${NC}"
        ./setup-facebook.sh
        ;;
    5)
        echo -e "${YELLOW}⏭️  Skipping platform setup${NC}"
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}🎉 Cross-Platform Automation Setup Complete!${NC}"
echo ""

# Show next steps
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo ""

echo -e "${YELLOW}1. Test your platform connections:${NC}"
echo -e "   ${BLUE}node cross-platform-reposter.js test twitter${NC}"
echo -e "   ${BLUE}node cross-platform-reposter.js test linkedin${NC}"
echo -e "   ${BLUE}node cross-platform-reposter.js test facebook${NC}"
echo ""

echo -e "${YELLOW}2. Test manual reposting:${NC}"
echo -e '   ${BLUE}node cross-platform-reposter.js repost youtube "https://youtube.com/watch?v=123" '"'"'{"title":"Test Episode","description":"Testing automation","brand":"ai-now","contentType":"standard"}'"'"'${NC}'
echo ""

echo -e "${YELLOW}3. Start automation monitoring:${NC}"
echo -e "   ${BLUE}node cross-platform-reposter.js start${NC}"
echo ""

echo -e "${YELLOW}4. Check automation status:${NC}"
echo -e "   ${BLUE}node cross-platform-reposter.js status${NC}"
echo ""

echo -e "${YELLOW}📋 Configuration Files Created:${NC}"
echo "• cross-platform-config.json - Main automation settings"
if [ -f "twitter-config.json" ]; then
    echo "• twitter-config.json - Twitter API credentials"
fi
if [ -f "linkedin-config.json" ]; then
    echo "• linkedin-config.json - LinkedIn API credentials"
fi
if [ -f "facebook-config.json" ]; then
    echo "• facebook-config.json - Facebook API credentials"
fi
echo ""

echo -e "${BLUE}💡 Tips:${NC}"
echo "• Start with auto-posting disabled for testing (already configured)"
echo "• Use manual repost commands to test each platform"
echo "• Enable auto-posting in cross-platform-config.json when ready"
echo "• Monitor logs when running automation"
echo ""

echo -e "${GREEN}✨ Your AI-Now content will now automatically repost across all configured platforms!${NC}"

# Show current automation status
echo ""
echo -e "${BLUE}📊 Current Status:${NC}"
node cross-platform-reposter.js status