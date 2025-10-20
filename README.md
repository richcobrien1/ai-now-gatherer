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
