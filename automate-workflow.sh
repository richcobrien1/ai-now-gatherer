#!/bin/bash

# AI-Now Content Automation Workflow
# Handles video processing and provides YouTube upload guidance

set -e

echo "🎬 AI-Now Content Automation Workflow"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if video file is provided
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ Error: Please provide a video file path${NC}"
    echo "Usage: $0 <video-file-path> [premium|standard] [brand]"
    echo "Example: $0 premium/my-video.mp4 premium ai-now"
    exit 1
fi

VIDEO_PATH="$1"
CONTENT_TYPE="${2:-premium}"
BRAND="${3:-ai-now}"

# Validate video file exists
if [ ! -f "$VIDEO_PATH" ]; then
    echo -e "${RED}❌ Error: Video file not found: $VIDEO_PATH${NC}"
    exit 1
fi

echo -e "${BLUE}📹 Processing video: $VIDEO_PATH${NC}"
echo -e "${BLUE}🏷️  Content type: $CONTENT_TYPE${NC}"
echo -e "${BLUE}🏢 Brand: $BRAND${NC}"

# Step 1: Upload to Cloudflare R2 (if not already done)
echo -e "\n${YELLOW}📤 Step 1: Cloudflare R2 Upload${YELLOW}"

if [ "$CONTENT_TYPE" = "premium" ]; then
    echo "Running premium upload script..."
    # Upload to premium bucket
    ./up-p.sh "$VIDEO_PATH"
else
    echo "Running standard upload script..."
    # Upload to standard bucket
    ./up-m.sh "$VIDEO_PATH"
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ R2 upload successful!${NC}"
else
    echo -e "${RED}❌ R2 upload failed${NC}"
    exit 1
fi

# Step 2: Ensure file is in processed directory
echo -e "\n${YELLOW}📂 Step 2: Organizing files${YELLOW}"

FILENAME=$(basename "$VIDEO_PATH")
PROCESSED_DIR="./processed"
PROCESSED_PATH="$PROCESSED_DIR/$FILENAME"

# Check if file is already in processed directory
if [[ "$VIDEO_PATH" == processed/* ]]; then
    echo -e "${GREEN}✅ Video already in processed directory${NC}"
else
    mkdir -p "$PROCESSED_DIR"
    cp "$VIDEO_PATH" "$PROCESSED_DIR/"
    echo -e "${GREEN}✅ Video moved to processed directory${NC}"
fi

# Step 3: YouTube Upload Instructions
echo -e "\n${YELLOW}🎥 Step 3: YouTube Upload (Manual)${YELLOW}"
echo -e "${BLUE}Since Google OAuth verification is pending, please upload manually:${NC}"

# Generate metadata suggestions
DATE=$(date +"%B %d, %Y")
DISPLAY_BRAND="AI Now"

if [ "$CONTENT_TYPE" = "premium" ]; then
    TITLE="$DISPLAY_BRAND - Premium Episode | $DATE"
    DESCRIPTION="🔒 Premium $DISPLAY_BRAND episode featuring the latest developments in artificial intelligence and machine learning.

Subscribe for more cutting-edge AI content!

#$BRAND #ArtificialIntelligence #MachineLearning #TechNews #AI

📧 Contact: [Your contact info]
🌐 Website: [Your website]"
    PRIVACY="Private"
else
    TITLE="$DISPLAY_BRAND - $DATE"
    DESCRIPTION="Latest updates in artificial intelligence and emerging technologies.

#$BRAND #ArtificialIntelligence #MachineLearning #TechNews

Subscribe for daily AI updates!"
    PRIVACY="Public"
fi

echo -e "\n${GREEN}📋 YouTube Upload Details:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Title:${NC} $TITLE"
echo -e "${BLUE}Description:${NC}"
echo "$DESCRIPTION"
echo -e "${BLUE}Privacy:${NC} $PRIVACY"
echo -e "${BLUE}Tags:${NC} AI, Artificial Intelligence, Machine Learning, AI News, Technology, Tech News, $DISPLAY_BRAND"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Determine playlist based on brand and content type
case $BRAND in
    "ai-now")
        if [ "$CONTENT_TYPE" = "premium" ]; then
            PLAYLIST="AI-Now Desktop Landscape"
        else
            PLAYLIST="AI-Now Desktop Landscape (Standard)"
        fi
        ;;
    "ai-now-educate")
        if [ "$CONTENT_TYPE" = "premium" ]; then
            PLAYLIST="AI-Now-Educate Desktop Landscape"
        else
            PLAYLIST="AI-Now-Educate Desktop Landscape (Standard)"
        fi
        ;;
    *)
        PLAYLIST="Default Playlist"
        ;;
esac

echo -e "${BLUE}Playlist:${NC} $PLAYLIST"

echo -e "\n${YELLOW}📺 Manual Upload Steps:${NC}"
echo "1. Go to: https://studio.youtube.com/"
echo "2. Click 'Create' → 'Upload videos'"
echo "3. Select the video file from: $PROCESSED_DIR/$FILENAME"
echo "4. Copy the details above into YouTube"
echo "5. Set thumbnail (use v2u-$CONTENT_TYPE.jpg from project root)"
echo "6. Add to playlist: $PLAYLIST"
echo "7. Publish!"

echo -e "\n${GREEN}🎉 Workflow complete! Video is ready for YouTube upload.${NC}"
echo -e "${BLUE}💡 Tip: Once Google approves your API verification, we can automate this step too!${NC}"