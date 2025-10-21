<<<<<<< HEAD
# AI-Now Gatherer

An automated content gathering and video publishing system for AI-Now episodes.

## 🚀 Complete Automation Workflow

**One-command multi-platform publishing:**

```bash
# Full automation: R2 upload + YouTube + Twitter + LinkedIn
./complete-workflow.sh "premium/your-video.mp4" premium ai-now --auto-upload --twitter --linkedin

# Manual YouTube upload + social media
./complete-workflow.sh "premium/your-video.mp4" premium ai-now --twitter --linkedin

# Just YouTube automation
./complete-workflow.sh "premium/your-video.mp4" premium ai-now --auto-upload
```

**What it does:**
- ✅ Uploads to Cloudflare R2 storage
- ✅ Generates brand-specific metadata and titles
- ✅ Provides YouTube upload instructions or automates browser upload
- ✅ Posts to Twitter with branded content
- ✅ Posts to LinkedIn with professional messaging
- ✅ Handles missing credentials gracefully

## Features

## 🎬 Video Automation
- **Smart Format Detection**: Automatically detects 16:9 (desktop/landscape) vs 9:16 (mobile/portrait) video formats
- **Category-Based Upload**: Uses different scripts for Premium vs Standard content
- **R2 Storage Integration**: Uploads videos to Cloudflare R2 with proper metadata
- **YouTube Publishing**: Automatically publishes to correct playlists based on format
- **Duplicate Prevention**: Avoids re-uploading existing videos

### 📰 Content Gathering
- **Multi-Source News**: Downloads from AI news websites (TechCrunch, MIT Tech Review, Ars Technica, etc.)
- **YouTube Integration**: Scrapes YouTube search results for trending AI content
- **Markdown Conversion**: Converts HTML articles to clean markdown
- **Notebook LM Ready**: Creates batch files for easy AI processing

### 🎨 Content Types
- **Premium Content**: Uses `up-p.sh` with premium thumbnails
- **Standard Content**: Uses `up-m.sh` with standard thumbnails
- **Organized Storage**: Structured directories by category, brand, format, and interval

## Directory Structure

```
ai-now-gatherer/
├── app/                          # Cloudflare Worker code
│   ├── src/
│   │   └── index.ts             # Main worker logic
│   ├── video-automation.js      # Video upload automation
│   ├── content-downloader.js    # Content gathering
│   └── admin-server.js          # Web admin interface
├── ai-now/                       # Content management
│   ├── sources.json             # RSS feed sources
│   ├── source/                  # Downloaded content
│   │   ├── newsfeed/           # News articles (markdown)
│   │   └── youtube/            # YouTube content
│   └── batches/                 # Notebook LM batch files
├── up-p.sh                       # Premium upload script
├── up-m.sh                       # Standard upload script
├── v2u-premium.jpg              # Premium thumbnail
└── v2u-standard.jpg             # Standard thumbnail
```

## Setup

### Prerequisites
- Node.js 18+
- Cloudflare Wrangler
- R2 bucket configured
- FFmpeg (for video processing)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/ai-now-gatherer.git
   cd ai-now-gatherer
   ```

2. **Install dependencies**
   ```bash
   cd app
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your R2 credentials
   ```

4. **Set up content sources**
   ```bash
   cd app
   node content-downloader.js add newsfeed https://techcrunch.com/tag/artificial-intelligence/
   node content-downloader.js add youtube "https://www.youtube.com/results?search_query=AI+News+Today"
   ```

## Usage

### 🚀 Complete Workflow (Recommended)

```bash
# Process a new video with full automation
./complete-workflow.sh "premium/new-video.mp4" premium ai-now --auto-upload --twitter --linkedin

# Process already uploaded video (skip R2 upload)
./complete-workflow.sh "processed/existing-video.mp4" premium ai-now --twitter --linkedin

# Just generate YouTube instructions
./complete-workflow.sh "processed/video.mp4" premium ai-now-educate
```

**Supported brands:** `ai-now`, `ai-now-educate`, `ai-now-commercial`, `ai-now-conceptual`

**Content types:** `premium`, `standard`

**Flags:**
- `--auto-upload`: Open YouTube Studio with browser automation
- `--twitter`: Post to Twitter (requires API setup)
- `--linkedin`: Post to LinkedIn (requires API setup)

### Social Media Setup

#### Twitter Setup
```bash
./setup-twitter.sh
# Edit twitter-config.json with your API keys
node twitter-poster.js auth
node twitter-poster.js test
```

#### LinkedIn Setup
```bash
./setup-linkedin.sh
# Edit linkedin-config.json with your app credentials
node linkedin-poster.js auth
node linkedin-poster.js test
```

### Legacy Scripts (Still Available)

## � LinkedIn Integration

### Features
- **Professional Posting**: Post AI content to LinkedIn network
- **Brand-Specific Content**: Professional messaging per brand
- **Rich Metadata**: Includes title, description, and industry hashtags
- **OAuth 2.0**: Secure authentication with LinkedIn API

### Setup Steps
1. **Get LinkedIn App Credentials**:
   - Go to https://developer.linkedin.com/
   - Create an app or use existing one
   - Get Client ID and Client Secret
   - Add redirect URI: `http://localhost:3003/callback`

2. **Configure**:
   ```bash
   ./setup-linkedin.sh
   # Edit linkedin-config.json with your keys
   ```

3. **Authenticate**:
   ```bash
   node linkedin-poster.js auth
   ```

4. **Test**:
   ```bash
   node linkedin-poster.js test
   ```

### Professional Posting
- **AI-Now**: `#AINow #TechTrends #DigitalTransformation`
- **AI-Now-Educate**: `#AIEducation #ProfessionalDevelopment #Learning`
- **AI-Now-Commercial**: `#AICommercial #BusinessIntelligence #EnterpriseAI`
- **AI-Now-Conceptual**: `#AIResearch #FutureOfWork #EmergingTech`

### Content Gathering
```bash
# Download from all sources
node content-downloader.js download

# Create Notebook LM batch
node content-downloader.js batch all

# Add new source
node content-downloader.js add newsfeed https://example.com
```

### Video Automation
```bash
# Start video watcher (when API access is available)
node video-automation.js

# Manual workflow (current recommended approach)
./automate-workflow.sh <video-path> [premium|standard] [brand]
```

### Web Admin
```bash
# Start admin interface
node admin-server.js
# Visit http://localhost:3001
```

## Content Sources

### News Feeds
- TechCrunch AI
- MIT Technology Review
- Ars Technica AI
- Artificial Intelligence News
- Rundown.ai

### YouTube
- AI News search results
- Custom channel RSS feeds

## Video Categories

### Premium Content
- **Brands**: AI-Now, AI-Now-Educate, AI-Now-Commercial, AI-Now-Conceptual
- **Formats**: Desktop (16:9), Mobile (9:16)
- **Intervals**: Weekly, Monthly, Yearly
- **Upload Script**: `up-p.sh`
- **Thumbnail**: `v2u-premium.jpg`

### Standard Content
- **Brands**: AI-Now
- **Formats**: Desktop (16:9), Mobile (9:16)
- **Upload Script**: `up-m.sh`
- **Thumbnail**: `v2u-standard.jpg`

## 📺 YouTube Integration Status

### Current Status (October 2025)
- ✅ **Cloudflare R2 Upload**: Fully automated
- ✅ **Metadata Generation**: Complete with brand-specific titles and descriptions
- ✅ **Playlist Management**: Configured for multi-brand support
- ⚠️ **YouTube API Upload**: Blocked by Google verification requirements
- ✅ **Manual Workflow**: Streamlined with `./automate-workflow.sh`

### YouTube API Access
Google requires app verification for the `youtube.upload` scope. The app is currently in "Testing" mode.

**To enable full automation:**
1. Wait for Google to review and approve the OAuth consent screen
2. Or add approved test users in Google Cloud Console
3. The API credentials are ready and scripts are prepared

**Current workaround:** Use `./automate-workflow.sh` for complete R2 upload + YouTube instructions.

### YouTube Publishing

The system automatically publishes videos to YouTube with format-specific playlists:

#### Desktop Landscape Videos (16:9)
- **Playlist**: AI-Now Desktop
- **Thumbnail**: `v2u-premium.jpg` (premium) or `v2u-standard.jpg` (standard)
- **Upload First**: Desktop videos are uploaded first

#### Mobile Portrait Videos (9:16)
- **Playlist**: AI-Now Podcast
- **Thumbnail**: `v2u-mobile-premium.jpg` (premium) or `v2u-mobile-standard.jpg` (standard)
- **Reuse Settings**: Mobile videos reuse desktop video settings but change playlist

#### YouTube Setup (Future)
1. **Get API Credentials**:
   ```bash
   ./setup-youtube.sh
   ```

2. **Update Playlist IDs** in `youtube-credentials.json`:
   ```json
   {
     "playlists": {
       "ai-now": "YOUR_AI_NOW_PLAYLIST_ID",
       "ai-now-podcast": "YOUR_AI_NOW_PODCAST_ID"
     }
   }
   ```

### Supported Brands
- **AI-Now**: Main brand (default)
- **AI-Now-Educate**: Educational content
- **AI-Now-Commercial**: Commercial content
- **AI-Now-Conceptual**: Conceptual content

### Brand Detection
The system automatically detects brands from:
- **Filename**: Include "educate", "commercial", or "conceptual" in the filename
- **Directory**: Brand-specific subdirectories (future enhancement)

### Manual Upload
```bash
# Upload with specific brand
node youtube-upload.js video.mp4 premium ai-now-educate
node youtube-upload.js video.mp4 standard ai-now-commercial
```

### Adding New Sources
```bash
node content-downloader.js add newsfeed "https://example.com/rss"
node content-downloader.js add youtube "https://youtube.com/feeds/..."
```

### Testing
```bash
# Test content download
node content-downloader.js download

# Test video automation (dry run)
node video-automation.js  # with dryRun: true
```

## Deployment

### Cloudflare Worker
```bash
cd app
wrangler deploy
```

### Scheduled Content Gathering
Set up cron jobs for daily content downloads:
```bash
# Daily content download
0 6 * * * cd /path/to/ai-now-gatherer/app && node content-downloader.js download
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues or questions, please open a GitHub issue or contact the maintainers.
=======
# v2u News Collector

Automated news aggregation and processing tool for collecting and organizing content from various sources.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run dry-run collection
npm run collect:dry

# Run live collection
npm run collect:run
```

## 📁 Project Structure

```
news-collector/
├── src/
│   ├── collectors/       # Source-specific collectors
│   ├── processors/       # Content processors
│   └── publishers/       # Output handlers
├── config/              # Configuration files
└── scripts/            # Utility scripts
```

## 🔄 Collection Sources

- RSS Feeds
- News APIs
- Social Media
- Web Scraping

## 🛠️ Features

- Automated content collection
- Duplicate detection
- Content categorization
- Metadata extraction
- Cross-posting capability

## 📊 Output Formats

- JSON data
- RSS feeds
- API endpoints
- Markdown files

## 🔐 Environment Setup

Copy the example environment file:
```bash
cp .env.example .env
```

Required variables:
```bash
# APIs
NEWS_API_KEY=
TWITTER_API_KEY=
OPENAI_API_KEY=

# Storage
OUTPUT_DIR=
CACHE_DIR=

# Monitoring
ALERT_EMAIL=
```

## ⚙️ Configuration

### Collection Schedule
```json
{
  "interval": "15m",
  "maxItems": 100,
  "retention": "7d"
}
```

### Source Priority
```json
{
  "high": ["trusted-source-1", "trusted-source-2"],
  "medium": ["general-news"],
  "low": ["aggregators"]
}
```

## 📈 Monitoring

- Collection stats
- Processing times
- Error rates
- Source health
>>>>>>> 04638aa (Initial commit for clean news-collector repo)
