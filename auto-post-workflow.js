#!/usr/bin/env node

/**
 * Automated Cross-Platform Posting Workflow
 * 
 * Level 1 (Content Platforms):
 * - Desktop/Landscape: YouTube, Rumble
 * - Mobile/Portrait: Spotify, TikTok, Instagram Reels
 * 
 * Level 2 (Promotion Platforms):
 * - Desktop audience: LinkedIn, Facebook
 * - Mobile audience: X (Twitter), Instagram, Threads
 * 
 * Workflow:
 * 1. Upload video to YouTube/Rumble (desktop) OR Spotify/TikTok (mobile)
 * 2. Get back the URLs
 * 3. Auto-post to appropriate Level 2 platforms with those URLs
 */

const https = require('https');
const http = require('http');

// Configuration
const API_BASE = 'https://www.v2u.us';

/**
 * Upload to Level 1 platforms and get URLs
 */
async function uploadToLevel1(videoPath, metadata, format) {
  const results = {
    youtubeUrl: null,
    rumbleUrl: null,
    spotifyUrl: null,
    tiktokUrl: null,
    instagramUrl: null,
  };

  console.log(`\n📤 Uploading ${format} video to Level 1 platforms...`);

  if (format === 'desktop' || format === 'landscape') {
    // Upload to YouTube
    console.log('🎥 Uploading to YouTube...');
    try {
      const { execSync } = require('child_process');
      const output = execSync(`node youtube-upload.js "${videoPath}"`, { encoding: 'utf-8' });
      const match = output.match(/https:\/\/(?:www\.)?youtube\.com\/watch\?v=[^\s]+/);
      if (match) {
        results.youtubeUrl = match[0];
        console.log(`✅ YouTube: ${results.youtubeUrl}`);
      }
    } catch (error) {
      console.error('❌ YouTube upload failed:', error.message);
    }

    // Upload to Rumble (if you have rumble-upload.js)
    console.log('📹 Uploading to Rumble...');
    // TODO: Add Rumble upload when available
    console.log('⚠️  Rumble upload not implemented yet');
  }

  if (format === 'mobile' || format === 'portrait') {
    // Upload to Spotify
    console.log('🎵 Uploading to Spotify...');
    // TODO: Add Spotify upload when available
    console.log('⚠️  Spotify upload not implemented yet');

    // Upload to TikTok
    console.log('📱 Uploading to TikTok...');
    // TODO: Add TikTok upload when available
    console.log('⚠️  TikTok upload not implemented yet');
  }

  return results;
}

/**
 * Post to Level 2 platforms
 */
async function postToLevel2(level1Urls, metadata, format) {
  console.log(`\n📢 Cross-posting to Level 2 platforms...`);

  const episode = {
    title: metadata.title,
    description: metadata.description,
    category: metadata.category || 'ai-now',
    publishDate: new Date().toISOString(),
    youtubeUrl: level1Urls.youtubeUrl,
    rumbleUrl: level1Urls.rumbleUrl,
    spotifyUrl: level1Urls.spotifyUrl,
  };

  // Determine which Level 2 platforms based on format
  let platforms = [];
  if (format === 'desktop' || format === 'landscape') {
    // Desktop content goes to professional platforms
    platforms = ['linkedin', 'facebook'];
    console.log('🎯 Target: Professional audience (LinkedIn, Facebook)');
  } else {
    // Mobile content goes to mobile-first platforms
    platforms = ['twitter', 'instagram', 'threads'];
    console.log('🎯 Target: Mobile audience (X, Instagram, Threads)');
  }

  // Only post to configured platforms
  const configuredPlatforms = await getConfiguredPlatforms();
  platforms = platforms.filter(p => configuredPlatforms.includes(p));

  if (platforms.length === 0) {
    console.log('⚠️  No Level 2 platforms configured yet');
    return { results: {}, summary: { total: 0, succeeded: 0, failed: 0 } };
  }

  console.log(`📤 Posting to: ${platforms.join(', ')}`);

  // Post to all Level 2 platforms
  const results = await fetch(`${API_BASE}/api/social-post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platforms, episode }),
  }).then(r => r.json());

  // Show results
  console.log(`\n📊 Results:`);
  for (const [platform, result] of Object.entries(results.results)) {
    if (result.success) {
      console.log(`✅ ${platform}: ${result.url || 'Posted successfully'}`);
    } else {
      console.log(`❌ ${platform}: ${result.error}`);
    }
  }

  console.log(`\n📈 Summary: ${results.summary.succeeded}/${results.summary.total} succeeded`);

  return results;
}

/**
 * Get configured Level 2 platforms
 */
async function getConfiguredPlatforms() {
  try {
    const response = await fetch(`${API_BASE}/api/social-post`);
    const data = await response.json();
    return data.platforms.filter(p => p.configured).map(p => p.id);
  } catch (error) {
    console.error('Failed to get platform configuration:', error.message);
    return [];
  }
}

/**
 * Polyfill fetch for Node.js
 */
function fetch(urlString, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlString);
    const lib = parsedUrl.protocol === 'https:' ? https : http;

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = lib.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: () => Promise.resolve(JSON.parse(data)),
          text: () => Promise.resolve(data),
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

/**
 * Main workflow
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log(`
Usage: node auto-post-workflow.js <video-path> <format> <title> [description]

Arguments:
  video-path   Path to video file
  format       "desktop" or "mobile" (determines target platforms)
  title        Video title
  description  Video description (optional)

Examples:
  node auto-post-workflow.js ./video.mp4 desktop "AI News Today" "Latest AI developments"
  node auto-post-workflow.js ./short.mp4 mobile "Quick AI Update"
    `);
    process.exit(1);
  }

  const [videoPath, format, title, description] = args;

  const metadata = {
    title,
    description: description || title,
    category: 'ai-now',
  };

  console.log(`\n🚀 Starting automated cross-platform workflow`);
  console.log(`📁 Video: ${videoPath}`);
  console.log(`📺 Format: ${format}`);
  console.log(`📝 Title: ${title}\n`);

  // Step 1: Upload to Level 1 platforms
  const level1Results = await uploadToLevel1(videoPath, metadata, format);

  // Check if we got any URLs
  const hasUrls = Object.values(level1Results).some(url => url !== null);
  if (!hasUrls) {
    console.log('\n⚠️  No Level 1 uploads succeeded. Skipping Level 2 posting.');
    process.exit(1);
  }

  // Step 2: Post to Level 2 platforms
  const level2Results = await postToLevel2(level1Results, metadata, format);

  console.log('\n✨ Workflow complete!');
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Workflow failed:', error);
    process.exit(1);
  });
}

module.exports = { uploadToLevel1, postToLevel2 };
