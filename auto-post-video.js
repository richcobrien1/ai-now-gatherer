#!/usr/bin/env node

/**
 * Complete Video Automation Pipeline
 * 1. Upload video to YouTube
 * 2. Save YouTube URL to episode data
 * 3. Auto-post to X (Twitter) with the YouTube link
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

// Configuration
const WEBSITE_API = process.env.V2U_API_URL || 'https://www.v2u.us';

async function runCommand(command, args, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Running: ${command} ${args.join(' ')}`);
    
    const proc = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

async function uploadToYouTube(videoPath) {
  console.log('\n📺 Step 1: Uploading to YouTube...');
  
  // Run youtube-upload.js and capture output
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['youtube-upload.js', videoPath], {
      cwd: __dirname,
      shell: true
    });

    let output = '';
    proc.stdout.on('data', (data) => {
      const text = data.toString();
      process.stdout.write(text);
      output += text;
    });

    proc.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        // Extract YouTube URL from output
        const match = output.match(/🔗 YouTube URL: (https:\/\/www\.youtube\.com\/watch\?v=[^\s]+)/);
        if (match) {
          resolve(match[1]);
        } else {
          reject(new Error('Could not extract YouTube URL from output'));
        }
      } else {
        reject(new Error(`YouTube upload failed with code ${code}`));
      }
    });
  });
}

async function saveEpisodeUrl(episodeId, youtubeUrl) {
  console.log('\n💾 Step 2: Saving YouTube URL to episode...');
  
  try {
    const response = await fetch(`${WEBSITE_API}/api/episodes/${episodeId}/platforms`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ youtubeUrl })
    });

    if (!response.ok) {
      throw new Error(`Failed to save URL: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ YouTube URL saved successfully');
    return data;

  } catch (error) {
    console.error('❌ Failed to save YouTube URL:', error.message);
    throw error;
  }
}

async function postToSocial(episodeId, youtubeUrl) {
  console.log('\n🐦 Step 3: Auto-posting to X (Twitter)...');
  
  try {
    // Get episode details
    const episodesResponse = await fetch(`${WEBSITE_API}/api/episodes`);
    const episodesData = await episodesResponse.json();
    const episode = episodesData.episodes.find(ep => ep.id === episodeId);

    if (!episode) {
      throw new Error(`Episode ${episodeId} not found`);
    }

    // Post to social media
    const response = await fetch(`${WEBSITE_API}/api/social-post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platforms: ['twitter'],
        episode: {
          ...episode,
          youtubeUrl
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Social post failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success && result.results.twitter?.success) {
      console.log('✅ Posted to X successfully!');
      console.log(`🔗 Tweet URL: ${result.results.twitter.url}`);
    } else {
      throw new Error(result.results.twitter?.error || 'Social post failed');
    }

    return result;

  } catch (error) {
    console.error('❌ Failed to post to social media:', error.message);
    throw error;
  }
}

function extractEpisodeId(filename) {
  // Extract episode ID from filename
  // Assumes format like: "2025/11/06/november-5-2025-ai-now-..."
  const match = filename.match(/(\d{4}\/\d{2}\/\d{2}\/[^\/]+)/);
  if (match) {
    return Buffer.from(match[1]).toString('base64');
  }
  return null;
}

async function main() {
  const videoPath = process.argv[2];

  if (!videoPath) {
    console.error('❌ Usage: node auto-post-video.js <video-file>');
    process.exit(1);
  }

  try {
    console.log('🎬 Starting Complete Video Automation Pipeline');
    console.log(`📹 Video: ${videoPath}`);

    // Extract episode ID from filename
    const episodeId = extractEpisodeId(videoPath);
    if (!episodeId) {
      throw new Error('Could not extract episode ID from filename');
    }
    console.log(`🆔 Episode ID: ${episodeId}`);

    // Step 1: Upload to YouTube
    const youtubeUrl = await uploadToYouTube(videoPath);
    console.log(`✅ YouTube URL: ${youtubeUrl}`);

    // Step 2: Save URL to episode
    await saveEpisodeUrl(episodeId, youtubeUrl);

    // Step 3: Post to social media
    await postToSocial(episodeId, youtubeUrl);

    console.log('\n🎉 Complete automation pipeline finished successfully!');
    console.log('✅ Video uploaded to YouTube');
    console.log('✅ URL saved to episode');
    console.log('✅ Posted to X (Twitter)');

  } catch (error) {
    console.error('\n❌ Pipeline failed:', error.message);
    process.exit(1);
  }
}

main();
