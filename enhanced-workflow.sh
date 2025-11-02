#!/bin/bash

# Enhanced AI-Now Complete Automation Workflow
# Handles video processing, R2 upload, YouTube publishing, and Level 2 social media reposting

set -e

echo "🤖 AI-Now Enhanced Automation Workflow"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if video file is provided
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ Error: Please provide a video file path${NC}"
    echo "Usage: $0 <video-file-path> [premium|standard] [brand] [--auto-upload] [--cross-platform] [--youtube-url <url>]"
    echo ""
    echo "Examples:"
    echo "  $0 premium/my-video.mp4 premium ai-now --auto-upload --cross-platform"
    echo "  $0 premium/my-video.mp4 premium ai-now --cross-platform --youtube-url https://youtube.com/watch?v=123"
    echo ""
    echo "New Features:"
    echo "  --cross-platform    Automatically repost to Level 2 social networks"
    echo "  --youtube-url       Skip YouTube upload, use existing URL for social media"
    exit 1
fi

VIDEO_PATH="$1"
CONTENT_TYPE="${2:-premium}"
BRAND="${3:-ai-now}"

# Parse additional flags
AUTO_UPLOAD=""
CROSS_PLATFORM=""
YOUTUBE_URL=""

for arg in "${@:4}"; do
    case $arg in
        --auto-upload)
            AUTO_UPLOAD="--auto-upload"
            ;;
        --cross-platform)
            CROSS_PLATFORM="--cross-platform"
            ;;
        --youtube-url)
            shift
            YOUTUBE_URL="$4"
            ;;
        --youtube-url=*)
            YOUTUBE_URL="${arg#*=}"
            ;;
    esac
done

# Validate brand and content type compatibility
case $BRAND in
    "ai-now"|"ai-now-educate"|"ai-now-commercial"|"ai-now-conceptual")
        if [ "$CONTENT_TYPE" != "premium" ]; then
            echo -e "${YELLOW}⚠️  Brand '$BRAND' is premium-only. Automatically setting content type to 'premium'.${NC}"
            CONTENT_TYPE="premium"
        fi
        ;;
esac

echo -e "${BLUE}📹 Processing video: $VIDEO_PATH${NC}"
echo -e "${BLUE}🏷️  Content type: $CONTENT_TYPE${NC}"
echo -e "${BLUE}🏢 Brand: $BRAND${NC}"

if [ -n "$CROSS_PLATFORM" ]; then
    echo -e "${BLUE}🌐 Cross-platform reposting: ENABLED${NC}"
fi

if [ -n "$YOUTUBE_URL" ]; then
    echo -e "${BLUE}🎥 Using existing YouTube URL: $YOUTUBE_URL${NC}"
fi

echo ""

# Step 1: Upload to Cloudflare R2 (if not already done)
echo -e "${YELLOW}📤 Step 1: Cloudflare R2 Upload${NC}"

FILENAME=$(basename "$VIDEO_PATH")
PROCESSED_DIR="./processed"

# Check if file is already in processed directory
if [[ "$VIDEO_PATH" == processed/* ]]; then
    echo -e "${GREEN}✅ Video already in processed directory - skipping R2 upload${NC}"
else
    if [ "$CONTENT_TYPE" = "premium" ]; then
        echo "Running premium upload script..."
        ./up-p.sh "$VIDEO_PATH"
    else
        echo "Running standard upload script..."
        ./up-m.sh "$VIDEO_PATH"
    fi

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ R2 upload successful!${NC}"
    else
        echo -e "${RED}❌ R2 upload failed${NC}"
        exit 1
    fi
fi

# Step 2: Organize files
echo -e "\n${YELLOW}📂 Step 2: Organizing files${NC}"

# Check if file is already in processed directory
if [[ "$VIDEO_PATH" == processed/* ]]; then
    echo -e "${GREEN}✅ Video already in processed directory${NC}"
else
    mkdir -p "$PROCESSED_DIR"
    cp "$VIDEO_PATH" "$PROCESSED_DIR/"
    echo -e "${GREEN}✅ Video moved to processed directory${NC}"
fi

# Step 3: Generate metadata for all platforms
echo -e "\n${YELLOW}📋 Step 3: Generating metadata${NC}"

DATE=$(date +"%B %d, %Y")

# Set brand-specific display name and hashtags
case $BRAND in
    "ai-now")
        DISPLAY_BRAND="AI Now"
        BRAND_HASHTAGS="#AINow #TechTrends #DigitalTransformation"
        ;;
    "ai-now-educate")
        DISPLAY_BRAND="AI Now Educate"
        BRAND_HASHTAGS="#AINowEducate #AIEducation #ProfessionalDevelopment"
        ;;
    "ai-now-commercial")
        DISPLAY_BRAND="AI Now Commercial"
        BRAND_HASHTAGS="#AINowCommercial #AICommercial #BusinessIntelligence"
        ;;
    "ai-now-conceptual")
        DISPLAY_BRAND="AI Now Conceptual"
        BRAND_HASHTAGS="#AINowConceptual #AIResearch #FutureOfWork"
        ;;
    *)
        DISPLAY_BRAND="AI Now"
        BRAND_HASHTAGS="#AINow #ArtificialIntelligence #MachineLearning"
        ;;
esac

if [ "$CONTENT_TYPE" = "premium" ]; then
    TITLE="$DISPLAY_BRAND - Premium Episode | $DATE"
    DESCRIPTION="🔒 Premium $DISPLAY_BRAND episode featuring the latest developments in artificial intelligence and machine learning.

Subscribe for more cutting-edge AI content!

$BRAND_HASHTAGS #ArtificialIntelligence #MachineLearning #TechNews #AI

📧 Contact: [Your contact info]
🌐 Website: [Your website]"
    PRIVACY="private"
    THUMBNAIL="./v2u-premium.jpg"
else
    TITLE="$DISPLAY_BRAND - $DATE"
    DESCRIPTION="Latest updates in artificial intelligence and emerging technologies.

$BRAND_HASHTAGS #ArtificialIntelligence #MachineLearning #TechNews

Subscribe for daily AI updates!"
    PRIVACY="public"
    THUMBNAIL="./v2u-standard.jpg"
fi

# Create metadata JSON for cross-platform use
METADATA_JSON=$(cat <<EOF
{
  "title": "$TITLE",
  "description": "$DESCRIPTION",
  "brand": "$BRAND",
  "contentType": "$CONTENT_TYPE",
  "displayBrand": "$DISPLAY_BRAND",
  "hashtags": "$BRAND_HASHTAGS"
}
EOF
)

echo -e "${GREEN}✅ Metadata generated for all platforms${NC}"

# Step 4: YouTube Upload (if no URL provided)
if [ -z "$YOUTUBE_URL" ]; then
    echo -e "\n${YELLOW}🎥 Step 4: YouTube Upload${NC}"

    if [ "$AUTO_UPLOAD" = "--auto-upload" ]; then
        echo -e "${BLUE}🚀 Starting automated YouTube upload...${NC}"
        cd app && node youtube-web-upload.js
    else
        # Manual upload instructions
        echo -e "${BLUE}📋 Manual YouTube Upload Instructions:${NC}"

        echo -e "\n${GREEN}📋 YouTube Upload Details:${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo -e "${BLUE}Title:${NC} $TITLE"
        echo -e "${BLUE}Description:${NC}"
        echo "$DESCRIPTION"
        echo -e "${BLUE}Privacy:${NC} $PRIVACY"
        echo -e "${BLUE}Thumbnail:${NC} $THUMBNAIL"
        echo -e "${BLUE}Tags:${NC} AI, Artificial Intelligence, Machine Learning, AI News, Technology, Tech News, $DISPLAY_BRAND"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

        echo -e "\n${YELLOW}📺 Manual Upload Steps:${NC}"
        echo "1. Go to: https://studio.youtube.com/"
        echo "2. Click 'Create' → 'Upload videos'"
        echo "3. Select the video file from: $PROCESSED_DIR/$FILENAME"
        echo "4. Copy the details above into YouTube"
        echo "5. Set thumbnail (use $THUMBNAIL from project root)"
        echo "6. Publish!"
        
        if [ -n "$CROSS_PLATFORM" ]; then
            echo ""
            echo -e "${YELLOW}⏰ After uploading to YouTube:${NC}"
            echo "Run this command with the YouTube URL:"
            echo -e "${BLUE}$0 $VIDEO_PATH $CONTENT_TYPE $BRAND --cross-platform --youtube-url YOUR_YOUTUBE_URL${NC}"
        fi
    fi
else
    echo -e "\n${YELLOW}🎥 Step 4: Using existing YouTube URL${NC}"
    echo -e "${GREEN}✅ YouTube URL: $YOUTUBE_URL${NC}"
fi

# Step 5: Cross-Platform Reposting (if enabled and YouTube URL available)
if [ -n "$CROSS_PLATFORM" ] && [ -n "$YOUTUBE_URL" ]; then
    echo -e "\n${YELLOW}🌐 Step 5: Cross-Platform Reposting${NC}"
    
    echo -e "${BLUE}📤 Reposting to Level 2 social networks...${NC}"
    
    # Check if cross-platform reposter is set up
    if [ ! -f "cross-platform-reposter.js" ]; then
        echo -e "${RED}❌ Cross-platform reposter not found${NC}"
        echo -e "${BLUE}💡 Run './setup-automation.sh' to set up cross-platform automation${NC}"
    else
        # Use the cross-platform reposter
        echo -e "${BLUE}🚀 Triggering automated reposting...${NC}"
        
        if node cross-platform-reposter.js repost youtube "$YOUTUBE_URL" "$METADATA_JSON"; then
            echo -e "${GREEN}✅ Cross-platform reposting completed!${NC}"
        else
            echo -e "${YELLOW}⚠️  Cross-platform reposting encountered some issues${NC}"
            echo -e "${BLUE}💡 Check platform configurations and try again${NC}"
        fi
    fi
elif [ -n "$CROSS_PLATFORM" ] && [ -z "$YOUTUBE_URL" ]; then
    echo -e "\n${YELLOW}🌐 Step 5: Cross-Platform Reposting (Pending)${NC}"
    echo -e "${YELLOW}⏰ Waiting for YouTube URL to enable cross-platform reposting${NC}"
    echo -e "${BLUE}💡 Run with --youtube-url after uploading to YouTube${NC}"
fi

# Summary
echo -e "\n${GREEN}🎉 Enhanced workflow finished!${NC}"

echo -e "\n${BLUE}📊 Workflow Summary:${NC}"
echo -e "${GREEN}✅ Video processing: $VIDEO_PATH${NC}"
echo -e "${GREEN}✅ Content type: $CONTENT_TYPE${NC}"
echo -e "${GREEN}✅ Brand: $BRAND${NC}"

if [[ "$VIDEO_PATH" == processed/* ]]; then
    echo -e "${GREEN}✅ R2 upload: Skipped (already processed)${NC}"
else
    echo -e "${GREEN}✅ R2 upload: Completed${NC}"
fi

echo -e "${GREEN}✅ Metadata: Generated for all platforms${NC}"

if [ -n "$YOUTUBE_URL" ]; then
    echo -e "${GREEN}✅ YouTube: Using provided URL${NC}"
elif [ "$AUTO_UPLOAD" = "--auto-upload" ]; then
    echo -e "${GREEN}✅ YouTube: Automated upload initiated${NC}"
else
    echo -e "${YELLOW}⏳ YouTube: Manual upload required${NC}"
fi

if [ -n "$CROSS_PLATFORM" ] && [ -n "$YOUTUBE_URL" ]; then
    echo -e "${GREEN}✅ Cross-platform: Reposting completed${NC}"
elif [ -n "$CROSS_PLATFORM" ]; then
    echo -e "${YELLOW}⏳ Cross-platform: Pending YouTube URL${NC}"
else
    echo -e "${BLUE}ℹ️  Cross-platform: Not enabled${NC}"
fi

# Next steps
echo -e "\n${BLUE}🚀 Available Commands:${NC}"

if [ -z "$YOUTUBE_URL" ]; then
    echo -e "📺 ${YELLOW}After YouTube upload:${NC}"
    echo -e "   ${BLUE}$0 $VIDEO_PATH $CONTENT_TYPE $BRAND --cross-platform --youtube-url YOUR_YOUTUBE_URL${NC}"
    echo ""
fi

echo -e "🌐 ${YELLOW}Cross-platform commands:${NC}"
echo -e "   ${BLUE}node cross-platform-reposter.js status${NC} - Check automation status"
echo -e "   ${BLUE}node cross-platform-reposter.js start${NC} - Start monitoring automation"
echo -e "   ${BLUE}./setup-automation.sh${NC} - Configure social media platforms"

echo ""
echo -e "${GREEN}✨ Your AI-Now content pipeline is now fully automated!${NC}"