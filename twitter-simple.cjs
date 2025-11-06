const { TwitterApi } = require('twitter-api-v2');
require('dotenv').config();

/**
 * Simple Twitter Poster using API v1.1 credentials
 * No OAuth flow needed - just uses access tokens directly
 */

async function testConnection() {
  try {
    console.log('🐦 Testing Twitter API connection...');
    
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });

    const user = await client.v2.me();
    console.log('✅ Twitter API connection successful!');
    console.log(`👤 Connected as: @${user.data.username} (${user.data.name})`);
    
    return true;
  } catch (error) {
    console.error('❌ Twitter API test failed:', error.message);
    return false;
  }
}

async function postTweet(text) {
  try {
    console.log('🐦 Posting to Twitter...');
    
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });

    const tweet = await client.v2.tweet(text);
    
    console.log('✅ Tweet posted successfully!');
    console.log(`🔗 Tweet URL: https://twitter.com/i/web/status/${tweet.data.id}`);
    
    return tweet;
  } catch (error) {
    console.error('❌ Failed to post tweet:', error.message);
    throw error;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log('Twitter Poster - Simple API v1.1');
    console.log('================================');
    console.log('');
    console.log('Commands:');
    console.log('  test           - Test API connection');
    console.log('  post "<text>"  - Post a tweet');
    console.log('');
    console.log('Example:');
    console.log('  node twitter-simple.cjs test');
    console.log('  node twitter-simple.cjs post "Hello from v2u!"');
    return;
  }

  switch (command) {
    case 'test':
      await testConnection();
      break;

    case 'post':
      if (args.length < 2) {
        console.error('❌ Please provide tweet text');
        console.log('Usage: node twitter-simple.cjs post "Your tweet text"');
        process.exit(1);
      }
      await postTweet(args[1]);
      break;

    default:
      console.error('❌ Unknown command:', command);
      console.log('Use: test or post');
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}

module.exports = { testConnection, postTweet };
