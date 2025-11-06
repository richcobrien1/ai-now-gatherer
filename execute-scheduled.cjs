#!/usr/bin/env node

/**
 * Manually execute scheduled posts (simulates the cron job)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SCHEDULE_FILE = path.join(__dirname, '..', 'website', 'data', 'scheduled-posts.json');
const HISTORY_FILE = path.join(__dirname, '..', 'website', 'data', 'post-history.json');

// Load environment variables from root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function executeScheduledPosts() {
  console.log('⏰ Checking for due posts...\n');

  if (!fs.existsSync(SCHEDULE_FILE)) {
    console.log('❌ No scheduled posts file found');
    return;
  }

  const scheduled = JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
  const now = new Date();

  const duePosts = scheduled.filter(
    p => p.status === 'pending' && new Date(p.scheduledTime) <= now
  );

  if (duePosts.length === 0) {
    console.log('📭 No posts due right now');
    const nextPost = scheduled.find(p => p.status === 'pending');
    if (nextPost) {
      const timeUntil = new Date(nextPost.scheduledTime) - now;
      const minutes = Math.floor(timeUntil / 60000);
      console.log(`⏳ Next post in ${minutes} minutes at ${new Date(nextPost.scheduledTime).toLocaleString()}`);
    }
    return;
  }

  console.log(`📬 Found ${duePosts.length} post(s) to execute\n`);

  const history = fs.existsSync(HISTORY_FILE) 
    ? JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')) 
    : [];

  for (const post of duePosts) {
    console.log(`🚀 Posting: ${post.episodeTitle.substring(0, 60)}...`);
    
    try {
      const result = await postToTwitter(post);
      post.status = 'completed';
      post.executedAt = new Date().toISOString();
      post.results = result;
      
      console.log(`✅ Posted successfully!`);
      if (result.twitter && result.twitter.url) {
        console.log(`   Tweet URL: ${result.twitter.url}`);
      }
    } catch (error) {
      post.status = 'failed';
      post.executedAt = new Date().toISOString();
      post.results = { error: error.message };
      console.log(`❌ Failed: ${error.message}`);
    }
    
    history.push(post);
  }

  // Remove executed posts from schedule
  const remaining = scheduled.filter(p => !duePosts.includes(p));
  fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(remaining, null, 2));
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));

  console.log(`\n✅ Execution complete!`);
  console.log(`📊 ${duePosts.filter(p => p.status === 'completed').length} succeeded, ${duePosts.filter(p => p.status === 'failed').length} failed`);
}

async function postToTwitter(post) {
  const { TwitterApi } = require('twitter-api-v2');

  const client = new TwitterApi({
    appKey: process.env.TWITTER_CONSUMER_KEY,
    appSecret: process.env.TWITTER_CONSUMER_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
  });

  const tweet = await client.v2.tweet(post.customMessage);

  return {
    twitter: {
      success: true,
      postId: tweet.data.id,
      url: `https://twitter.com/user/status/${tweet.data.id}`,
      postedAt: new Date().toISOString()
    }
  };
}

executeScheduledPosts().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
