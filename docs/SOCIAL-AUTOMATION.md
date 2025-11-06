# Social Media Cross-Platform Automation

## Overview
Automated workflow for posting content from Level 1 platforms (content hosts) to Level 2 platforms (promotion/social).

## Platform Mapping

### Desktop/Landscape Content
**Level 1:** YouTube, Rumble  
**Level 2:** X (Twitter), LinkedIn  
**Target Audience:** Tech professionals, decision-makers, business users

### Mobile/Portrait Content
**Level 1:** Spotify, TikTok, Instagram Reels  
**Level 2:** X (Twitter), Facebook, Threads  
**Target Audience:** Mobile-first users, younger demographics, casual learners

## Current Status

### ✅ Automated
- **YouTube → X + LinkedIn**: Fully automated on upload
  - Run: `node youtube-upload.js video.mp4`
  - Auto-posts YouTube URL to X and LinkedIn after upload completes

### 🔗 Wired (Manual Trigger)
- **Rumble → X + LinkedIn**: Post Rumble URL after manual upload
  - Run: `node post-rumble.js "https://rumble.com/..." "Title" "Description"`

- **Spotify → X + Facebook**: Post Spotify URL after manual upload  
  - Run: `node post-spotify.js "https://open.spotify.com/..." "Title" "Description"`

### ⏳ Not Yet Implemented
- Rumble automated upload
- Spotify automated upload
- TikTok upload + posting
- Instagram Reels posting
- Threads posting

## Files

### YouTube Automation
- `youtube-upload.js` - Upload to YouTube and auto-post to social media
  - Handles video upload
  - Gets YouTube URL
  - Auto-posts to X + LinkedIn

### Social Posting Scripts
- `post-rumble.js` - Post Rumble URL to X + LinkedIn
- `post-spotify.js` - Post Spotify URL to X + Facebook

### API Endpoints
- `website/app/api/social-post/route.ts` - Social media posting API
  - Supports: Twitter/X, Facebook, LinkedIn, Instagram, Threads
  - Currently configured: Twitter/X only

## Credentials Required

### Twitter/X (Configured ✅)
- `TWITTER_API_KEY`
- `TWITTER_API_SECRET`
- `TWITTER_ACCESS_TOKEN`
- `TWITTER_ACCESS_SECRET`

### LinkedIn (Not Configured)
- `LINKEDIN_ACCESS_TOKEN`
- `LINKEDIN_PERSON_URN`

### Facebook (Not Configured)
- `FACEBOOK_PAGE_ACCESS_TOKEN`
- `FACEBOOK_PAGE_ID`

### Threads (Not Configured)
- `THREADS_ACCESS_TOKEN`
- `THREADS_USER_ID`

## Next Steps

1. **Week 1**: Configure LinkedIn and Facebook credentials
2. **Week 2**: Automate Rumble uploads
3. **Week 3**: Automate Spotify uploads
4. **Week 4**: Add TikTok and Instagram Reels support

## Usage Examples

### Automated YouTube Upload
```bash
node youtube-upload.js ./videos/ai-news-nov-6.mp4
# Uploads to YouTube
# Auto-posts to X and LinkedIn
```

### Manual Rumble Posting
```bash
# 1. Upload video to Rumble manually
# 2. Copy the Rumble URL
# 3. Run posting script
node post-rumble.js "https://rumble.com/v71b1vi-..." "AI News November 6" "Latest AI developments"
```

### Manual Spotify Posting
```bash
# 1. Upload podcast to Spotify manually
# 2. Copy the Spotify episode URL
# 3. Run posting script
node post-spotify.js "https://open.spotify.com/episode/6c6OKM0J7F9Mz23l97JRdf" "AI Podcast Ep 42"
```

## Architecture

```
Level 1 (Content Platforms)
    ↓
[YouTube/Rumble/Spotify] - Content hosted here
    ↓
Posting Scripts (news-collector/)
    ↓
API: /api/social-post (website/)
    ↓
Level 2 (Promotion Platforms)
[X/LinkedIn/Facebook] - Links shared here
```

## Testing

Test social posting:
```bash
# Test X posting
curl -X POST https://www.v2u.us/api/social-post \
  -H "Content-Type: application/json" \
  -d '{
    "platforms": ["twitter"],
    "episode": {
      "title": "Test Post",
      "description": "Testing automation",
      "youtubeUrl": "https://youtube.com/watch?v=test",
      "category": "ai-now",
      "publishDate": "2025-11-06"
    }
  }'
```

## Troubleshooting

### YouTube Upload Issues
- Check `youtube-credentials.json` and `youtube-token.json` exist
- Run OAuth flow if tokens expired

### Social Post Failures
- Check platform credentials in Vercel: `npx vercel env ls production`
- Verify 401 errors = credential issues
- Verify 400 errors = request format issues

### Common Errors
- `401 Unauthorized`: Invalid or missing credentials
- `403 Forbidden`: Insufficient permissions
- `500 Server Error`: Check API logs in Vercel dashboard
