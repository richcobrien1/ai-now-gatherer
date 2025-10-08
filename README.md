# AI-Now Gatherer

An automated content gathering and video publishing system for AI-Now episodes.

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
# Start video watcher
node video-automation.js

# Drop videos in category folders and they'll auto-upload
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

## 📺 YouTube Publishing

The system automatically publishes videos to YouTube with format-specific playlists:

### Desktop Landscape Videos (16:9)
- **Playlist**: AI-Now
- **Thumbnail**: `v2u-premium.jpg` (premium) or `v2u-standard.jpg` (standard)
- **Upload First**: Desktop videos are uploaded first

### Mobile Portrait Videos (9:16)
- **Playlist**: AI-Now Podcast
- **Thumbnail**: `v2u-mobile-premium.jpg` (premium) or `v2u-mobile-standard.jpg` (standard)
- **Reuse Settings**: Mobile videos reuse desktop video settings but change playlist

### YouTube Setup
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

3. **First Upload** requires browser authorization

## Development

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