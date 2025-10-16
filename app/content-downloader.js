const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { JSDOM } = require('jsdom');
const TurndownService = require('turndown');
const { parseString } = require('xml2js');

// Configuration
const CONTENT_DIRS = {
  newsfeed: './ai-now/source/newsfeed',
  youtube: './ai-now/source/youtube'
};

const SOURCES_FILE = './ai-now/sources.json';

// Load sources
function loadSources() {
  if (!fs.existsSync(SOURCES_FILE)) {
    return { newsfeed: [], youtube: [] };
  }
  return JSON.parse(fs.readFileSync(SOURCES_FILE, 'utf8'));
}

// Save sources
function saveSources(sources) {
  fs.writeFileSync(SOURCES_FILE, JSON.stringify(sources, null, 2));
}

// Convert HTML to Markdown
function htmlToMarkdown(html) {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
  });

  turndownService.addRule('strikethrough', {
    filter: ['del', 's', 'strike'],
    replacement: (content) => `~~${content}~~`
  });

  return turndownService.turndown(html);
}

// Parse RSS feed
async function parseRSSFeed(xmlData) {
  return new Promise((resolve, reject) => {
    parseString(xmlData, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// Download YouTube content (RSS or search results)
async function downloadYouTubeContent(url) {
  try {
    console.log(`📺 Processing YouTube: ${url}`);
    
    // Check if it's a search URL or RSS feed
    if (url.includes('/results?')) {
      return await scrapeYouTubeSearch(url);
    } else {
      return await downloadYouTubeRSS(url);
    }
  } catch (error) {
    console.error(`❌ Failed to process YouTube ${url}:`, error.message);
    return [];
  }
}

// Scrape YouTube search results
async function scrapeYouTubeSearch(searchUrl) {
  try {
    console.log(`🔍 Scraping YouTube search: ${searchUrl}`);
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    const dom = new JSDOM(response.data);
    const document = dom.window.document;
    
    // YouTube search results are in script tags or specific elements
    // This is a simplified approach - YouTube changes their HTML frequently
    const scripts = document.querySelectorAll('script');
    const downloadedFiles = [];
    
    // Look for video data in scripts (this is approximate)
    console.log(`📊 Found ${scripts.length} script tags, looking for video data...`);
    
    // For now, create a placeholder file indicating we found the search
    const markdown = `# YouTube Search: AI News Today

**Search URL:** ${searchUrl}
**Date:** ${new Date().toISOString()}

## Status

YouTube search scraping detected. Video extraction needs refinement due to YouTube's dynamic HTML structure.

## Next Steps

Consider using:
- YouTube API (requires API key)
- RSS feeds from specific channels
- Third-party YouTube tools

---

*Source: YouTube Search Results*
`;
    
    const filename = `2025-10-08-youtube-search-ai-news-today.md`;
    const outputDir = CONTENT_DIRS.youtube;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, markdown);
    
    downloadedFiles.push(filePath);
    console.log(`✅ Created YouTube search result file: ${filePath}`);
    
    return downloadedFiles;
    
  } catch (error) {
    console.error(`❌ Failed to scrape YouTube search:`, error.message);
    return [];
  }
}

// Download YouTube RSS (original function)
async function downloadYouTubeRSS(url) {
  try {
    console.log(`📺 Downloading YouTube RSS: ${url}`);
    
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'AI-Now-Content-Gatherer/1.0' },
      timeout: 30000
    });
    
    const rssData = await parseRSSFeed(response.data);
    const items = rssData.feed?.entry || rssData.rss?.channel?.[0]?.item || [];
    
    const downloadedFiles = [];
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    for (const item of items.slice(0, 10)) {
      try {
        const title = item.title?.[0] || item['media:title']?.[0]?.$?.title || 'Untitled';
        const description = item['media:description']?.[0] || item.description?.[0] || '';
        const published = item.published?.[0] || item.pubDate?.[0] || item['media:published']?.[0];
        const videoId = item['yt:videoId']?.[0] || item.id?.[0]?.split('/').pop();
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        const publishedDate = new Date(published);
        if (publishedDate < oneDayAgo) {
          console.log(`⏭️ Skipping old video: ${title}`);
          continue;
        }
        
        const markdown = `# ${title}

**Published:** ${publishedDate.toISOString()}
**URL:** ${videoUrl}

## Description

${htmlToMarkdown(description)}

## Video

Watch the full video: ${videoUrl}

---

*Source: YouTube RSS Feed*
`;
        
        const safeTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        const dateStr = publishedDate.toISOString().split('T')[0];
        const filename = `${dateStr}-youtube-${safeTitle}.md`;
        
        const outputDir = CONTENT_DIRS.youtube;
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const filePath = path.join(outputDir, filename);
        fs.writeFileSync(filePath, markdown);
        
        downloadedFiles.push(filePath);
        console.log(`✅ Saved YouTube video: ${filePath}`);
        
      } catch (itemError) {
        console.error(`❌ Error processing YouTube item:`, itemError.message);
      }
    }
    
    return downloadedFiles;
    
  } catch (error) {
    console.error(`❌ Failed to download YouTube RSS ${url}:`, error.message);
    return [];
  }
}// Download HTML content (news sites)
async function downloadHTMLContent(url) {
  try {
    console.log(`📄 Downloading HTML: ${url}`);

    const response = await axios.get(url, {
      headers: { 'User-Agent': 'AI-Now-Content-Gatherer/1.0' },
      timeout: 30000
    });

    const dom = new JSDOM(response.data);
    const document = dom.window.document;

    // Extract title
    const title = document.querySelector('title, h1')?.textContent?.trim() || 'Untitled';

    // Extract main content
    const contentSelectors = [
      'article', '.content', '.post-content', '.entry-content',
      '.article-body', '.prose', 'main', '.article'
    ];

    let contentHtml = '';
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        contentHtml = element.innerHTML;
        break;
      }
    }

    if (!contentHtml) {
      contentHtml = document.body.innerHTML;
    }

    // Convert to markdown
    const markdown = htmlToMarkdown(contentHtml);

    // Create filename
    const safeTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${timestamp}-${safeTitle}.md`;

    // Ensure directory exists
    const outputDir = CONTENT_DIRS.newsfeed;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save markdown file
    const filePath = path.join(outputDir, filename);
    const frontmatter = `---
title: "${title}"
url: "${url}"
date: "${new Date().toISOString()}"
type: "newsfeed"
---

`;

    fs.writeFileSync(filePath, frontmatter + markdown);

    console.log(`✅ Saved: ${filePath}`);
    return filePath;

  } catch (error) {
    console.error(`❌ Failed to download ${url}:`, error.message);
    return null;
  }
}

// Main download function
async function downloadContent(url, type = 'newsfeed') {
  if (type === 'youtube') {
    return await downloadYouTubeContent(url);
  } else {
    const result = await downloadHTMLContent(url);
    return result ? [result] : [];
  }
}

// Download all sources
async function downloadAllSources() {
  const sources = loadSources();
  const results = { success: [], failed: [] };

  for (const [type, urls] of Object.entries(sources)) {
    console.log(`\n📂 Processing ${type} sources...`);

    for (const url of urls) {
      const files = await downloadContent(url, type);
      if (files.length > 0) {
        results.success.push(...files);
      } else {
        results.failed.push(url);
      }

      // Respectful delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n📊 Download complete:`);
  console.log(`   ✅ Success: ${results.success.length} files`);
  console.log(`   ❌ Failed: ${results.failed.length}`);

  return results;
}

// Add source
function addSource(type, url) {
  const sources = loadSources();

  if (!sources[type]) {
    sources[type] = [];
  }

  if (!sources[type].includes(url)) {
    sources[type].push(url);
    saveSources(sources);
    console.log(`✅ Added ${type} source: ${url}`);
    return true;
  } else {
    console.log(`⚠️ Source already exists: ${url}`);
    return false;
  }
}

// List sources
function listSources() {
  const sources = loadSources();

  console.log('\n📋 Current Sources:');
  Object.entries(sources).forEach(([type, urls]) => {
    console.log(`\n${type.toUpperCase()}:`);
    urls.forEach(url => console.log(`   ${url}`));
  });
}

// Create batch file
function createBatchFile(type = 'all') {
  const batchDir = './ai-now/batches';
  if (!fs.existsSync(batchDir)) {
    fs.mkdirSync(batchDir, { recursive: true });
  }
  
  let allFiles = [];
  
  if (type === 'all') {
    // Scan all content directories
    Object.entries(CONTENT_DIRS).forEach(([contentType, dir]) => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
        const fullPaths = files.map(f => path.join(dir, f));
        allFiles.push(...fullPaths);
        console.log(`Found ${files.length} files in ${contentType}`);
      }
    });
  } else {
    // Scan specific type
    const dir = CONTENT_DIRS[type];
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
      allFiles = files.map(f => path.join(dir, f));
    }
  }
  
  const timestamp = new Date().toISOString().split('T')[0];
  const batchFile = path.join(batchDir, `notebook-lm-batch-${type}-${timestamp}.txt`);
  
  const content = allFiles.join('\n');
  fs.writeFileSync(batchFile, content);
  
  console.log(`📦 Created batch file: ${batchFile}`);
  console.log(`   Contains ${allFiles.length} markdown files`);
  
  return batchFile;
}// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'download':
      await downloadAllSources();
      break;

    case 'add':
      const type = args[1];
      const url = args[2];
      if (!type || !url) {
        console.log('Usage: node content-downloader.js add <type> <url>');
        console.log('Types: newsfeed, youtube');
      } else {
        addSource(type, url);
      }
      break;

    case 'list':
      listSources();
      break;

    case 'batch':
      const batchType = args[1] || 'all';
      createBatchFile(batchType);
      break;

    default:
      console.log('AI-Now Content Downloader');
      console.log('');
      console.log('Commands:');
      console.log('  download          Download all sources');
      console.log('  add <type> <url>  Add new source URL');
      console.log('  list              List all sources');
      console.log('  batch [type]      Create Notebook LM batch file');
      console.log('');
      console.log('Examples:');
      console.log('  node content-downloader.js add newsfeed https://example.com');
      console.log('  node content-downloader.js add youtube https://youtube.com/feeds/...');
      console.log('  node content-downloader.js download');
      console.log('  node content-downloader.js batch youtube');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { downloadContent, addSource, loadSources, createBatchFile };