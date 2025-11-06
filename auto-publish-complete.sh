#!/bin/bash

# Complete automation workflow
# 1. Upload video to R2
# 2. Upload to YouTube/Rumble/Spotify
# 3. Get the URLs from those platforms
# 4. Automatically post to X/Facebook/LinkedIn

VIDEO_FILE="$1"
EPISODE_TITLE="$2"
EPISODE_DESCRIPTION="$3"

if [ -z "$VIDEO_FILE" ] || [ ! -f "$VIDEO_FILE" ]; then
  echo "Usage: $0 <video-file> <title> <description>"
  exit 1
fi

echo "🚀 Starting complete automation workflow..."

# Step 1: Upload to R2
echo "📦 Step 1: Uploading to R2..."
./up-m.sh "$VIDEO_FILE"

# Step 2: Upload to YouTube and get URL
echo "🎥 Step 2: Uploading to YouTube..."
YOUTUBE_URL=$(node youtube-upload.js "$VIDEO_FILE" "$EPISODE_TITLE" "$EPISODE_DESCRIPTION" | grep -oP 'https://www\.youtube\.com/watch\?v=\S+')

if [ -z "$YOUTUBE_URL" ]; then
  echo "❌ Failed to get YouTube URL"
  exit 1
fi

echo "✅ YouTube URL: $YOUTUBE_URL"

# Step 3: Upload to Rumble (if configured)
echo "📹 Step 3: Uploading to Rumble..."
# TODO: Add Rumble upload script
RUMBLE_URL=""

# Step 4: Upload to Spotify (if configured)
echo "🎵 Step 4: Uploading to Spotify..."
# TODO: Add Spotify upload script
SPOTIFY_URL=""

# Step 5: Save URLs to episode-platforms.json
echo "💾 Step 5: Saving platform URLs..."
EPISODE_ID=$(basename "$VIDEO_FILE" .mp4 | base64)

curl -X PUT "https://www.v2u.us/api/episodes/$EPISODE_ID/platforms" \
  -H "Content-Type: application/json" \
  -d "{
    \"youtubeUrl\": \"$YOUTUBE_URL\",
    \"rumbleUrl\": \"$RUMBLE_URL\",
    \"spotifyUrl\": \"$SPOTIFY_URL\"
  }"

# Step 6: Automatically post to social media
echo "📱 Step 6: Cross-posting to social media..."
curl -X POST "https://www.v2u.us/api/social-post" \
  -H "Content-Type: application/json" \
  -d "{
    \"platforms\": [\"twitter\", \"facebook\", \"linkedin\"],
    \"episode\": {
      \"id\": \"$EPISODE_ID\",
      \"title\": \"$EPISODE_TITLE\",
      \"description\": \"$EPISODE_DESCRIPTION\",
      \"youtubeUrl\": \"$YOUTUBE_URL\",
      \"rumbleUrl\": \"$RUMBLE_URL\",
      \"spotifyUrl\": \"$SPOTIFY_URL\",
      \"category\": \"ai-now\",
      \"publishDate\": \"$(date -I)\"
    }
  }"

echo "✅ Complete automation finished!"
echo "YouTube: $YOUTUBE_URL"
echo "Check social media for cross-posts"
