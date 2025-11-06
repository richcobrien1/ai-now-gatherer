const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const WEBSITE_API = 'https://www.v2u.us/api';
const DATA_FILE = path.join(__dirname, '../website/data/episode-platforms.json');

// YouTube channel ID (get from your channel)
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || 'YOUR_CHANNEL_ID';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

/**
 * Fetch latest uploads from YouTube
 */
async function getLatestYouTubeVideos() {
  if (!YOUTUBE_API_KEY) {
    console.log('⚠️  No YouTube API key configured');
    return [];
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${YOUTUBE_CHANNEL_ID}&part=snippet,id&order=date&maxResults=10&type=video`;
    const response = await fetch(url);
    const data = await response.json();

    return data.items.map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      publishedAt: item.snippet.publishedAt,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));
  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
    return [];
  }
}

/**
 * Match YouTube videos to episodes by title
 */
async function matchVideosToEpisodes() {
  try {
    // Get episodes from website
    const episodesResponse = await fetch(`${WEBSITE_API}/episodes`);
    const episodesData = await episodesResponse.json();
    const episodes = episodesData.episodes || [];

    // Get latest YouTube videos
    const youtubeVideos = await getLatestYouTubeVideos();

    // Load existing platform data
    let platformsData = {};
    try {
      const fileContent = await fs.readFile(DATA_FILE, 'utf-8');
      platformsData = JSON.parse(fileContent);
    } catch (error) {
      console.log('No existing episode-platforms.json, will create new one');
    }

    // Match videos to episodes
    let updated = 0;
    for (const episode of episodes) {
      // Skip if already has YouTube URL
      if (platformsData[episode.id]?.youtubeUrl) {
        continue;
      }

      // Find matching YouTube video by title similarity
      const matchingVideo = youtubeVideos.find(video => {
        const videoTitle = video.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        const episodeTitle = episode.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        return videoTitle.includes(episodeTitle.substring(0, 30)) || 
               episodeTitle.includes(videoTitle.substring(0, 30));
      });

      if (matchingVideo) {
        console.log(`✅ Matched: ${episode.title} -> ${matchingVideo.url}`);
        
        if (!platformsData[episode.id]) {
          platformsData[episode.id] = {};
        }
        platformsData[episode.id].youtubeUrl = matchingVideo.url;
        updated++;

        // Auto-post to social media
        await postToSocialMedia(episode, matchingVideo.url);
      }
    }

    // Save updated platform data
    if (updated > 0) {
      await fs.writeFile(DATA_FILE, JSON.stringify(platformsData, null, 2), 'utf-8');
      console.log(`📝 Saved ${updated} new YouTube URLs`);
    } else {
      console.log('No new videos to add');
    }

  } catch (error) {
    console.error('Error matching videos:', error);
  }
}

/**
 * Automatically post episode to social media
 */
async function postToSocialMedia(episode, youtubeUrl) {
  try {
    console.log(`📱 Auto-posting to social media: ${episode.title}`);
    
    const response = await fetch(`${WEBSITE_API}/social-post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platforms: ['twitter'], // Add more as they're configured
        episode: {
          ...episode,
          youtubeUrl,
        },
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Posted to ${result.summary.succeeded} platforms`);
      if (result.results.twitter?.url) {
        console.log(`   Twitter: ${result.results.twitter.url}`);
      }
    } else {
      console.log(`⚠️  Social post failed`);
    }

  } catch (error) {
    console.error('Error posting to social media:', error);
  }
}

// Run the automation
console.log('🤖 Starting automatic video detection and social posting...');
matchVideosToEpisodes()
  .then(() => {
    console.log('✅ Automation complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Automation failed:', error);
    process.exit(1);
  });
