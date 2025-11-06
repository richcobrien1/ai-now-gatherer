#!/usr/bin/env node

/**
 * Fetch latest video from YouTube channel and schedule post to X
 * Channel: https://youtube.com/@v2u.ai-now
 */

const https = require('https');

const CHANNEL_HANDLE = 'v2u.ai-now';
const CHANNEL_ID = 'UCmwOvS8rhbbDYojNrar4g4g';
const API_KEY = process.env.YOUTUBE_API_KEY;

if (!API_KEY) {
  console.error('❌ YOUTUBE_API_KEY environment variable not set');
  console.log('\nGet your API key from: https://console.cloud.google.com/apis/credentials');
  console.log('Then run: export YOUTUBE_API_KEY="your-key-here"');
  process.exit(1);
}

async function getLatestVideo() {
  console.log('🔍 Fetching latest video from channel...\n');

  return new Promise((resolve, reject) => {
    const url = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&part=snippet&order=date&maxResults=1&type=video`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (response.error) {
            reject(new Error(`YouTube API Error: ${response.error.message}`));
            return;
          }

          if (!response.items || response.items.length === 0) {
            reject(new Error('No videos found on channel'));
            return;
          }

          const video = response.items[0];
          resolve({
            id: video.id.videoId,
            title: video.snippet.title,
            description: video.snippet.description,
            url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
            thumbnailUrl: video.snippet.thumbnails.high.url,
            publishedAt: video.snippet.publishedAt
          });
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

async function schedulePost(video, scheduledTime) {
  console.log('📅 Scheduling post to X...\n');

  const postData = JSON.stringify({
    episodeId: video.id,
    episodeTitle: video.title,
    platforms: ['twitter'],
    customMessage: `${video.title}\n\n${video.url}`,
    scheduledTime: scheduledTime.toISOString()
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
        try {
          const result = JSON.parse(data);
          if (res.statusCode === 200) {
            resolve(result);
          } else {
            reject(new Error(`Failed to schedule: ${result.error || 'Unknown error'}`));
          }
        } catch (error) {
          reject(error);
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
    const video = await getLatestVideo();
    
    console.log('✅ Latest Video Found:');
    console.log(`   Title: ${video.title}`);
    console.log(`   URL: ${video.url}`);
    console.log(`   Published: ${new Date(video.publishedAt).toLocaleString()}\n`);

    // Calculate 2:30 PM MST today
    const now = new Date();
    const mst = new Date(now.toLocaleString('en-US', { timeZone: 'America/Denver' }));
    const scheduledTime = new Date(mst);
    scheduledTime.setHours(14, 30, 0, 0); // 2:30 PM

    // If 2:30 PM has already passed today, schedule for tomorrow
    if (scheduledTime < now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
      console.log('⚠️  2:30 PM MST has passed today, scheduling for tomorrow');
    }

    console.log(`⏰ Scheduled for: ${scheduledTime.toLocaleString('en-US', { timeZone: 'America/Denver' })} MST`);
    console.log(`   (${scheduledTime.toISOString()} UTC)\n`);

    // Schedule the post
    const result = await schedulePost(video, scheduledTime);
    
    console.log('✅ Post Scheduled Successfully!');
    console.log(`   Schedule ID: ${result.post.id}`);
    console.log(`   Status: ${result.post.status}`);
    console.log('\n📋 View all scheduled posts at: https://www.v2u.us/admin/social-posting\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('API')) {
      console.log('\n💡 Make sure your YouTube API key is valid and has YouTube Data API v3 enabled');
    }
    
    process.exit(1);
  }
}

main();
