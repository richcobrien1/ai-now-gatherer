# 🤖 AI-Now Complete Automation Workflow

## Overview

The AI-Now Complete Automation Workflow is a comprehensive system for processing and distributing AI-Now content across multiple platforms with a single command.

## Quick Start

```bash
# Full automation: R2 upload + YouTube + Twitter + LinkedIn
./complete-workflow.sh "premium/your-video.mp4" premium ai-now --auto-upload --twitter --linkedin

# Manual YouTube upload + social media
./complete-workflow.sh "premium/your-video.mp4" premium ai-now --twitter --linkedin

# Just YouTube automation
./complete-workflow.sh "premium/your-video.mp4" premium ai-now --auto-upload
```

## Command Structure

```bash
./complete-workflow.sh <video-path> <content-type> <brand> [flags...]
```

### Parameters

- **`<video-path>`**: Path to the video file (e.g., `premium/video.mp4` or `processed/video.mp4`)
- **`<content-type>`**: `premium` or `standard`
- **`<brand>`**: `ai-now`, `ai-now-educate`, `ai-now-commercial`, `ai-now-conceptual`

### Flags

- `--auto-upload`: Open YouTube Studio with browser automation
- `--twitter`: Post to Twitter (requires API setup)
- `--linkedin`: Post to LinkedIn (requires API setup)

## Workflow Steps

### Step 1: Cloudflare R2 Upload
- **Premium content**: Uses `up-p.sh` for private storage
- **Standard content**: Uses `up-m.sh` for public storage
- **Smart detection**: Skips upload if video is already in `processed/` directory
- **Output**: `🔒 Uploaded to private://[path] (use signed URL to access)`

### Step 2: File Organization
- Moves video to `processed/` directory
- Maintains original filename
- Prevents duplicate processing

### Step 3: YouTube Upload

#### Manual Upload Mode (Default)
Provides complete upload instructions:

```
📋 YouTube Upload Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Title: AI Now - Premium Episode | October 09, 2025
Description:
🔒 Premium AI Now episode featuring the latest developments in artificial intelligence and machine learning.

Subscribe for more cutting-edge AI content!

#ai-now-educate #ArtificialIntelligence #MachineLearning #TechNews #AI

📧 Contact: [Your contact info]
🌐 Website: [Your website]
Privacy: Private
Thumbnail: v2u-premium.jpg
Tags: AI, Artificial Intelligence, Machine Learning, AI News, Technology, Tech News, AI Now
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Playlist: AI-Now-Educate Desktop Landscape

📺 Manual Upload Steps:
1. Go to: https://studio.youtube.com/
2. Click 'Create' → 'Upload videos'
3. Select the video file from: ./processed/filename.mp4
4. Copy the details above into YouTube
5. Set thumbnail (use v2u-premium.jpg from project root)
6. Add to playlist: AI-Now-Educate Desktop Landscape
7. Publish!
```

#### Auto Upload Mode (`--auto-upload`)
- Opens YouTube Studio in browser
- Pre-fills upload form with generated metadata
- Requires manual completion but eliminates copy-paste

### Step 4: Twitter Posting (`--twitter`)

#### Requirements
- Twitter API credentials configured
- Run `./setup-twitter.sh` and `node twitter-poster.js auth`

#### Content Generation
- Brand-specific hashtags and messaging
- Includes YouTube link when available
- Professional formatting

#### Example Output
```
📝 Posting to Twitter...
✅ Twitter post successful!
```

### Step 5: LinkedIn Posting (`--linkedin`)

#### Requirements
- LinkedIn API credentials configured
- Run `./setup-linkedin.sh` and `node linkedin-poster.js auth`

#### Content Generation
- Professional messaging tailored to each brand
- Industry-specific hashtags
- UGC (User Generated Content) API posting

#### Example Output
```
📝 Posting to LinkedIn...
✅ LinkedIn post successful!
🔗 Post created with ID: urn:li:ugcPost:1234567890
```

## Brand-Specific Configuration

### AI-Now (Default)
- **Premium Title**: "AI Now - Premium Episode | [Date]"
- **Standard Title**: "AI Now - [Date]"
- **Twitter Hashtags**: `#AINow #TechTrends #DigitalTransformation`
- **LinkedIn Hashtags**: `#AI #ArtificialIntelligence #MachineLearning #Technology #Innovation`

### AI-Now-Educate
- **Premium Title**: "AI Now Educate - Premium Episode | [Date]"
- **Standard Title**: "AI Now Educate - [Date]"
- **Twitter Hashtags**: `#AINowEducate #AIEducation #ProfessionalDevelopment`
- **LinkedIn Hashtags**: `#AI #ArtificialIntelligence #MachineLearning #Education #ProfessionalDevelopment`

### AI-Now-Commercial
- **Premium Title**: "AI Now Commercial - Premium Episode | [Date]"
- **Standard Title**: "AI Now Commercial - [Date]"
- **Twitter Hashtags**: `#AINowCommercial #AICommercial #BusinessIntelligence`
- **LinkedIn Hashtags**: `#AI #ArtificialIntelligence #MachineLearning #BusinessIntelligence #EnterpriseAI`

### AI-Now-Conceptual
- **Premium Title**: "AI Now Conceptual - Premium Episode | [Date]"
- **Standard Title**: "AI Now Conceptual - [Date]"
- **Twitter Hashtags**: `#AINowConceptual #AIResearch #FutureOfWork`
- **LinkedIn Hashtags**: `#AI #ArtificialIntelligence #MachineLearning #Research #FutureOfWork`

## Content Types

### Premium Content
- **Privacy**: Private (requires manual publishing)
- **Thumbnail**: `v2u-premium.jpg`
- **Description**: Includes "🔒 Premium" prefix
- **Storage**: Private R2 bucket

### Standard Content
- **Privacy**: Public (auto-published)
- **Thumbnail**: `v2u-standard.jpg`
- **Description**: Standard messaging
- **Storage**: Public R2 bucket

## YouTube Playlists

### Desktop Landscape (16:9)
- **AI-Now**: "AI-Now Desktop Landscape"
- **AI-Now-Educate**: "AI-Now-Educate Desktop Landscape"
- **AI-Now-Commercial**: "AI-Now-Commercial Desktop Landscape"
- **AI-Now-Conceptual**: "AI-Now-Conceptual Desktop Landscape"

### Mobile Portrait (9:16) - Future Enhancement
- **AI-Now**: "AI-Now Podcast"
- **AI-Now-Educate**: "AI-Now-Educate Podcast"
- **AI-Now-Commercial**: "AI-Now-Commercial Podcast"
- **AI-Now-Conceptual**: "AI-Now-Conceptual Podcast"

## Workflow Summary Output

After completion, the script provides:

```
🎉 Complete workflow finished!

📊 Workflow Summary:
✅ Video processing: processed/filename.mp4
✅ Content type: premium
✅ Brand: ai-now-educate
✅ R2 upload: Skipped (already processed)
✅ YouTube metadata: Generated
🐦 Twitter: ⚠️  Not configured
💼 LinkedIn: ⚠️  Not configured

🚀 Next Steps:
1. Upload to YouTube using the instructions above
2. Configure API credentials for social media posting:
   • Run: ./setup-twitter.sh then node twitter-poster.js auth
   • Run: ./setup-linkedin.sh then node linkedin-poster.js auth
3. Re-run workflow after YouTube upload to post to social media
```

## Error Handling

### Missing Credentials
- **Twitter**: Skips posting, shows setup instructions
- **LinkedIn**: Skips posting, shows setup instructions
- **R2**: Fails with error (credentials required)

### File Not Found
- Validates video file exists before processing
- Provides clear error messages

### Upload Failures
- R2 upload failures stop the workflow
- Social media failures are logged but don't stop other steps

## Dependencies

### Required Files
- `up-p.sh`: Premium R2 upload script
- `up-m.sh`: Standard R2 upload script
- `twitter-poster.js`: Twitter API integration
- `linkedin-poster.js`: LinkedIn API integration
- `youtube-web-upload.js`: YouTube browser automation

### Environment Variables
- `R2_ACCESS_KEY_ID`: Cloudflare R2 access key
- `R2_SECRET_ACCESS_KEY`: Cloudflare R2 secret key
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID

### Optional API Credentials
- `twitter-config.json`: Twitter API keys
- `linkedin-config.json`: LinkedIn API keys

## Integration Points

### Cloudflare R2
- **Premium**: Private bucket with signed URLs
- **Standard**: Public bucket
- **Naming**: `YYYY/MM/DD/slugified-filename.mp4`

### YouTube
- **Manual**: Step-by-step instructions
- **Auto**: Browser automation with Puppeteer
- **Metadata**: Brand-specific titles, descriptions, tags

### Social Media
- **Twitter**: OAuth 1.0a with brand-specific content
- **LinkedIn**: OAuth 2.0 with UGC API posting
- **Content**: Professional messaging with industry hashtags

## Maintenance

### Regular Tasks
- Update API credentials before expiration
- Monitor R2 storage usage
- Review YouTube playlist IDs
- Update brand-specific messaging as needed

### Troubleshooting
- Check `.env.local` for R2 credentials
- Verify API config files have real credentials (not placeholders)
- Test individual components: `node twitter-poster.js test`
- Check processed directory for existing files

## Future Enhancements

### Planned Features
- YouTube API integration (when Google approves)
- Automated thumbnail generation
- Social media analytics tracking
- Content scheduling
- Multi-language support

### Potential Improvements
- Video format detection and conversion
- Automated content generation from transcripts
- Social media engagement monitoring
- Advanced metadata extraction

---

*Generated on: October 9, 2025*
*AI-Now Automation System v1.0*</content>
<parameter name="filePath">c:\Users\richc\Projects\v2u\ai-now-gatherer\AI-Now-Complete-Automation-Workflow.md