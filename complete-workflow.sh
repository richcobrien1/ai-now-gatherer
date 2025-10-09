#!/bin/bash

# AI-Now Complete Automation Workflow
# Handles video processing, R2 upload, and YouTube publishing

set -e

echo "🤖 AI-Now Complete Automation Workflow"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if video file is provided
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ Error: Please provide a video file path${NC}"
    echo "Usage: $0 <video-file-path> [premium|standard] [brand] [--auto-upload] [--twitter] [--linkedin]"
    echo "Example: $0 premium/my-video.mp4 premium ai-now --auto-upload --twitter --linkedin"
    exit 1
fi

VIDEO_PATH="$1"
CONTENT_TYPE="${2:-premium}"
BRAND="${3:-ai-now}"
AUTO_UPLOAD="${4:-}"
TWITTER_POST="${5:-}"
LINKEDIN_POST="${6:-}"

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
echo -e "\n${YELLOW}📂 Step 2: Organizing files${YELLOW}"

FILENAME=$(basename "$VIDEO_PATH")
PROCESSED_DIR="./processed"

# Check if file is already in processed directory
if [[ "$VIDEO_PATH" == processed/* ]]; then
    echo -e "${GREEN}✅ Video already in processed directory${NC}"
else
    mkdir -p "$PROCESSED_DIR"
    cp "$VIDEO_PATH" "$PROCESSED_DIR/"
    echo -e "${GREEN}✅ Video moved to processed directory${NC}"
fi

# Step 3: YouTube Upload
echo -e "\n${YELLOW}🎥 Step 3: YouTube Upload${YELLOW}"

if [ "$AUTO_UPLOAD" = "--auto-upload" ]; then
    echo -e "${BLUE}🚀 Starting automated YouTube upload...${NC}"

    # Generate metadata for automated upload
    DATE=$(date +"%B %d, %Y")
    DISPLAY_BRAND="AI Now"

    if [ "$CONTENT_TYPE" = "premium" ]; then
        TITLE="$DISPLAY_BRAND - Premium Episode | $DATE"
        DESCRIPTION="🔒 Premium $DISPLAY_BRAND episode featuring the latest developments in artificial intelligence and machine learning.

Subscribe for more cutting-edge AI content!

#$BRAND #ArtificialIntelligence #MachineLearning #TechNews #AI

📧 Contact: [Your contact info]
🌐 Website: [Your website]"
        PRIVACY="private"
        THUMBNAIL="./v2u-premium.jpg"
    else
        TITLE="$DISPLAY_BRAND - $DATE"
        DESCRIPTION="Latest updates in artificial intelligence and emerging technologies.

#$BRAND #ArtificialIntelligence #MachineLearning #TechNews

Subscribe for daily AI updates!"
        PRIVACY="public"
        THUMBNAIL="./v2u-standard.jpg"
    fi

    # Create a temporary upload script
    CURRENT_DIR=$(pwd)
    UPLOAD_SCRIPT=$(mktemp)
    cat > "$UPLOAD_SCRIPT" << EOF
const path = require('path');
process.chdir(path.join('$CURRENT_DIR', 'app'));
const { YouTubeWebUploader } = require('./youtube-web-upload');

async function autoUpload() {
  const uploader = new YouTubeWebUploader();

  try {
    await uploader.initialize();

    // For now, just open studio - you can enhance this with full automation
    console.log('🎬 Opening YouTube Studio for upload...');
    console.log('📋 Please complete the upload manually with these details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Title:', \`$TITLE\`);
    console.log('Description:', \`$DESCRIPTION\`);
    console.log('Privacy:', '$PRIVACY');
    console.log('Thumbnail:', '$THUMBNAIL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await uploader.openStudio();

  } catch (error) {
    console.error('❌ Upload failed:', error.message);
  }
}

autoUpload();
EOF

    cd app && node "$UPLOAD_SCRIPT"
    rm "$UPLOAD_SCRIPT"

else
    # Manual upload instructions
    echo -e "${BLUE}📋 Manual YouTube Upload Instructions:${NC}"

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
        THUMBNAIL="v2u-premium.jpg"
    else
        TITLE="$DISPLAY_BRAND - $DATE"
        DESCRIPTION="Latest updates in artificial intelligence and emerging technologies.

#$BRAND #ArtificialIntelligence #MachineLearning #TechNews

Subscribe for daily AI updates!"
        PRIVACY="Public"
        THUMBNAIL="v2u-standard.jpg"
    fi

    echo -e "\n${GREEN}📋 YouTube Upload Details:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${BLUE}Title:${NC} $TITLE"
    echo -e "${BLUE}Description:${NC}"
    echo "$DESCRIPTION"
    echo -e "${BLUE}Privacy:${NC} $PRIVACY"
    echo -e "${BLUE}Thumbnail:${NC} $THUMBNAIL"
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
    echo "5. Set thumbnail (use $THUMBNAIL from project root)"
    echo "6. Add to playlist: $PLAYLIST"
    echo "7. Publish!"

    echo -e "\n${BLUE}💡 Tip: Use --auto-upload flag for browser automation${NC}"
fi

# Step 4: Twitter Posting (if requested)
if [ "$TWITTER_POST" = "--twitter" ]; then
    echo -e "\n${YELLOW}🐦 Step 4: Twitter Posting${YELLOW}"

    # Check if Twitter config exists
    if [ ! -f "twitter-config.json" ]; then
        echo -e "${RED}❌ Twitter config not found. Please create twitter-config.json${NC}"
        echo -e "${BLUE}💡 Copy twitter-config-template.json to twitter-config.json and add your API keys${NC}"
    else
        # Check if config has placeholder values
        if grep -q "YOUR_TWITTER" twitter-config.json; then
            echo -e "${YELLOW}⚠️  Twitter credentials not configured (placeholders detected)${NC}"
            echo -e "${BLUE}💡 Twitter posting skipped. Configure credentials to enable posting.${NC}"
        else
            # Generate metadata for Twitter
            METADATA_JSON=$(cat <<EOF
{
  "title": "$TITLE",
  "description": "$DESCRIPTION",
  "brand": "$BRAND",
  "contentType": "$CONTENT_TYPE",
  "playlistId": "$PLAYLIST"
}
EOF
            )

            echo -e "${BLUE}📝 Posting to Twitter...${NC}"

            # Run Twitter poster
            if node twitter-poster.js post "$METADATA_JSON"; then
                echo -e "${GREEN}✅ Twitter post successful!${NC}"
            else
                echo -e "${RED}❌ Twitter post failed. Check authentication and try again.${NC}"
                echo -e "${BLUE}💡 Run 'node twitter-poster.js auth' to authenticate${NC}"
            fi
        fi
    fi
fi

# Step 5: LinkedIn Posting (if requested)
if [ "$LINKEDIN_POST" = "--linkedin" ]; then
    echo -e "\n${YELLOW}💼 Step 5: LinkedIn Posting${YELLOW}"

    # Check if LinkedIn config exists and has valid credentials
    if [ ! -f "linkedin-config.json" ]; then
        echo -e "${RED}❌ LinkedIn config not found. Please create linkedin-config.json${NC}"
        echo -e "${BLUE}💡 Run './setup-linkedin.sh' to set up LinkedIn API${NC}"
    else
        # Check if config has placeholder values
        if grep -q "YOUR_LINKEDIN_CLIENT_ID" linkedin-config.json; then
            echo -e "${YELLOW}⚠️  LinkedIn credentials not configured (placeholders detected)${NC}"
            echo -e "${BLUE}💡 LinkedIn posting skipped. Configure credentials to enable posting.${NC}"
        else
            # Generate metadata for LinkedIn
            METADATA_JSON=$(cat <<EOF
{
  "title": "$TITLE",
  "description": "$DESCRIPTION",
  "brand": "$BRAND",
  "contentType": "$CONTENT_TYPE",
  "playlistId": "$PLAYLIST"
}
EOF
            )

            echo -e "${BLUE}📝 Posting to LinkedIn...${NC}"

            # Run LinkedIn poster
            if node linkedin-poster.js post "$METADATA_JSON"; then
                echo -e "${GREEN}✅ LinkedIn post successful!${NC}"
            else
                echo -e "${RED}❌ LinkedIn post failed. Check authentication and try again.${NC}"
                echo -e "${BLUE}💡 Run 'node linkedin-poster.js auth' to authenticate${NC}"
            fi
        fi
    fi
fi

echo -e "\n${GREEN}🎉 Complete workflow finished!${NC}"

# Summary of what was completed
echo -e "\n${BLUE}📊 Workflow Summary:${NC}"
echo -e "${GREEN}✅ Video processing: $VIDEO_PATH${NC}"
echo -e "${GREEN}✅ Content type: $CONTENT_TYPE${NC}"
echo -e "${GREEN}✅ Brand: $BRAND${NC}"

if [[ "$VIDEO_PATH" == processed/* ]]; then
    echo -e "${GREEN}✅ R2 upload: Skipped (already processed)${NC}"
else
    echo -e "${GREEN}✅ R2 upload: Completed${NC}"
fi

echo -e "${GREEN}✅ YouTube metadata: Generated${NC}"

# Check social media status
TWITTER_STATUS="${YELLOW}⚠️  Not configured${NC}"
LINKEDIN_STATUS="${YELLOW}⚠️  Not configured${NC}"

if [ -f "twitter-config.json" ] && ! grep -q "YOUR_TWITTER" twitter-config.json; then
    TWITTER_STATUS="${GREEN}✅ Configured${NC}"
fi

if [ -f "linkedin-config.json" ] && ! grep -q "YOUR_LINKEDIN_CLIENT_ID" linkedin-config.json; then
    LINKEDIN_STATUS="${GREEN}✅ Configured${NC}"
fi

echo -e "🐦 Twitter: $TWITTER_STATUS"
echo -e "💼 LinkedIn: $LINKEDIN_STATUS"

echo -e "\n${BLUE}🚀 Next Steps:${NC}"
echo -e "1. ${YELLOW}Upload to YouTube${NC} using the instructions above"
echo -e "2. ${YELLOW}Configure API credentials${NC} for social media posting:"
if [ "$TWITTER_STATUS" != "${GREEN}✅ Configured${NC}" ]; then
    echo -e "   • Run: ${BLUE}./setup-twitter.sh${NC} then ${BLUE}node twitter-poster.js auth${NC}"
fi
if [ "$LINKEDIN_STATUS" != "${GREEN}✅ Configured${NC}" ]; then
    echo -e "   • Run: ${BLUE}./setup-linkedin.sh${NC} then ${BLUE}node linkedin-poster.js auth${NC}"
fi
echo -e "3. ${YELLOW}Re-run workflow${NC} after YouTube upload to post to social media"