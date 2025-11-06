#!/usr/bin/env node

/**
 * Test End-to-End: Fetch latest YouTube video and schedule post to X at 2:30 PM MST
 */

const https = require('https');
const fs = require('fs');

// Load YouTube credentials
const credentials = JSON.parse(fs.readFileSync('./youtube-credentials.json'));
const CLIENT_ID = credentials.installed.client_id;

// Your YouTube channel - we'll extract from playlists
const PLAYLIST_ID = 'PLQDaXrlGzy40uuAqfgi5t1ZbiaDhoW-By'; // AI-Now Desktop Landscape

async function getLatestYouTubeVideo() {
  console.log('🔍 Fetching latest YouTube video from AI-Now playlist...\n');

  // Get OAuth token
  let token;
  try {
    const tokenData = JSON.parse(fs.readFileSync('./youtube-token.json'));
    token = tokenData.access_token;
  } catch (error) {
    console.error('❌ No YouTube token found. Run youtube-upload.js first to authenticate.');
    process.exit(1);
  }

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.googleapis.com',
      path: `/youtube/v3/playlistItems?part=snippet&playlistId=${PLAYLIST_ID}&maxResults=1&order=date`,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const response = JSON.parse(data);
        if (response.items && response.items.length > 0) {
          const video = response.items[0].snippet;
          const videoId = video.resourceId.videoId;
          resolve({
            id: videoId,
            title: video.title,
            description: video.description,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            thumbnailUrl: video.thumbnails.high.url,
            publishedAt: video.publishedAt
          });
        } else {
          reject(new Error('No videos found in playlist'));
        }
      });
    }).on('error', reject);
  });
}

async function schedulePostToX(video, scheduledTime) {
  console.log('📅 Scheduling post to X...\n');

  const scheduledDate = new Date(scheduledTime);
  
  const postData = JSON.stringify({
    platforms: ['twitter'],
    episode: {
      title: video.title,
      description: video.description,
      youtubeUrl: video.url,
      category: 'Technology',
      publishDate: video.publishedAt
    },
    scheduled: true,
    scheduledTime: scheduledDate.toISOString()
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.v2u.us',
      path: '/api/social-schedule',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Failed to schedule: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  try {
    // Get latest video
    const video = await getLatestYouTubeVideo();
    
    console.log('✅ Latest Video Found:');
    console.log(`   Title: ${video.title}`);
    console.log(`   URL: ${video.url}`);
    console.log(`   Published: ${video.publishedAt}\n`);

    // Calculate 2:30 PM MST today
    const now = new Date();
    const mstOffset = -7; // MST is UTC-7
    const scheduledTime = new Date(now);
    scheduledTime.setHours(14 + mstOffset, 30, 0, 0); // 2:30 PM MST

    console.log(`⏰ Scheduled Time: ${scheduledTime.toLocaleString('en-US', { timeZone: 'America/Denver' })} MST`);
    console.log(`   (${scheduledTime.toISOString()} UTC)\n`);

    // Schedule the post
    const result = await schedulePostToX(video, scheduledTime);
    
    console.log('✅ Post Scheduled Successfully!');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
