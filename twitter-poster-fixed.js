const fs = require('fs');
const path = require('path');
const { TwitterApi } = require('twitter-api-v2');

const TWITTER_CONFIG_PATH = path.join(__dirname, 'twitter-config.json');
const TWITTER_TOKENS_PATH = path.join(__dirname, 'twitter-tokens.json');

class TwitterPoster {
  constructor() {
    this.client = null;
    this.userClient = null;
  }

  /**
   * Initialize Twitter API client
   */
  async initialize() {
    console.log('🐦 Initializing Twitter API client...');

    try {
      // Load configuration
      const config = this.loadConfig();

      // Create OAuth 2.0 app client
      this.client = new TwitterApi({
        clientId: config.apiKey,
        clientSecret: config.apiSecret,
      });

      // Try to load user tokens
      const tokens = this.loadTokens();
      if (tokens && this.isTokenValid(tokens)) {
        this.userClient = new TwitterApi(tokens.accessToken);
        console.log('✅ Twitter client initialized with user authentication');
      } else {
        console.log('⚠️  Twitter client initialized (user authentication needed)');
      }

    } catch (error) {
      console.error('❌ Failed to initialize Twitter client:', error.message);
      throw error;
    }
  }

  /**
   * Check if stored token is still valid
   */
  isTokenValid(tokens) {
    if (!tokens.expiresAt) return false;
    return Date.now() < tokens.expiresAt;
  }

  /**
   * Load Twitter API configuration
   */
  loadConfig() {
    try {
      return JSON.parse(fs.readFileSync(TWITTER_CONFIG_PATH, 'utf8'));
    } catch (error) {
      throw new Error(`Twitter config not found. Please create ${TWITTER_CONFIG_PATH} with your API keys.`);
    }
  }

  /**
   * Load user tokens
   */
  loadTokens() {
    try {
      return JSON.parse(fs.readFileSync(TWITTER_TOKENS_PATH, 'utf8'));
    } catch (error) {
      return null;
    }
  }

  /**
   * Save user tokens
   */
  saveTokens(tokens) {
    fs.writeFileSync(TWITTER_TOKENS_PATH, JSON.stringify(tokens, null, 2));
    console.log('✅ Twitter tokens saved');
  }

  /**
   * Generate authorization URL for user authentication
   */
  async generateAuthUrl() {
    if (!this.client) await this.initialize();

    console.log('🔗 Generating Twitter authorization URL...');

    const authLink = await this.client.generateOAuth2AuthLink('http://localhost:3002/callback', {
      scope: ['tweet.read', 'tweet.write', 'users.read']
    });

    console.log('\n🔗 Visit this URL to authorize the app:');
    console.log(authLink.url);
    console.log('\n📝 Copy the authorization code from the callback URL and paste it here.');
    console.log('   The URL will look like: http://localhost:3002/callback?code=ABC123...\n');

    return authLink;
  }

  /**
   * Complete authentication with authorization code
   */
  async completeAuth(authCode, authLink) {
    if (!this.client) await this.initialize();

    console.log('🔐 Completing Twitter authentication...');

    try {
      const { client: userClient, accessToken, refreshToken } = await this.client.loginWithOAuth2({
        code: authCode,
        codeVerifier: authLink.codeVerifier,
        redirectUri: 'http://localhost:3002/callback'
      });

      const tokens = {
        accessToken,
        refreshToken,
        expiresAt: Date.now() + (2 * 60 * 60 * 1000), // 2 hours from now
      };

      this.saveTokens(tokens);
      this.userClient = userClient;

      console.log('✅ Twitter authentication successful!');
      console.log(`🔑 Access token obtained and saved`);

      return tokens;

    } catch (error) {
      console.error('❌ Twitter authentication failed:', error.message);
      throw error;
    }
  }

  /**
   * Post a tweet with video link and description
   */
  async postVideoTweet(metadata, r2Url = null) {
    if (!this.userClient) {
      throw new Error('Twitter user authentication required. Run authentication first.');
    }

    console.log('🐦 Posting to Twitter...');

    try {
      // Generate tweet content
      const tweetContent = this.generateTweetContent(metadata, r2Url);

      // Post the tweet
      const tweet = await this.userClient.v2.tweet(tweetContent);

      console.log('✅ Tweet posted successfully!');
      console.log(`🔗 Tweet URL: https://twitter.com/i/status/${tweet.data.id}`);

      return {
        tweetId: tweet.data.id,
        tweetUrl: `https://twitter.com/i/status/${tweet.data.id}`,
        postedAt: new Date().toISOString(),
      };

    } catch (error) {
      console.error('❌ Failed to post tweet:', error.message);
      throw error;
    }
  }

  /**
   * Generate tweet content based on metadata
   */
  generateTweetContent(metadata, r2Url = null) {
    const { title, description, brand, contentType, playlistId } = metadata;

    // Create brand-specific hashtags
    const brandHashtags = this.getBrandHashtags(brand);

    // Generate tweet text
    let tweetText = '';

    if (contentType === 'premium') {
      tweetText = `🔒 New Premium Episode: ${title}\n\n`;
      tweetText += `Latest developments in #AI and #MachineLearning!\n\n`;
    } else {
      tweetText = `📺 ${title}\n\n`;
      tweetText += `Stay updated with the latest in #ArtificialIntelligence\n\n`;
    }

    // Add description excerpt (first 100 chars)
    const descExcerpt = description.split('\n')[0].substring(0, 100);
    if (descExcerpt) {
      tweetText += `${descExcerpt}...\n\n`;
    }

    // Add YouTube link (placeholder for now)
    tweetText += `▶️ Watch now: [YouTube Link]\n\n`;

    // Add hashtags
    tweetText += brandHashtags.join(' ');

    // Add call to action
    tweetText += `\n\n#${brand.replace(/-/g, '')} #TechNews`;

    // Ensure tweet is under 280 characters
    if (tweetText.length > 280) {
      tweetText = tweetText.substring(0, 277) + '...';
    }

    return tweetText;
  }

  /**
   * Get brand-specific hashtags
   */
  getBrandHashtags(brand) {
    const baseHashtags = ['#AI', '#ArtificialIntelligence', '#MachineLearning', '#TechNews'];

    switch (brand) {
      case 'ai-now':
        return [...baseHashtags, '#AINow', '#AIResearch'];
      case 'ai-now-educate':
        return [...baseHashtags, '#AIEducation', '#LearnAI', '#AIForBeginners'];
      case 'ai-now-commercial':
        return [...baseHashtags, '#AICommercial', '#AIBusiness', '#AIInnovation'];
      case 'ai-now-conceptual':
        return [...baseHashtags, '#AIConcepts', '#FutureOfAI', '#AIScience'];
      default:
        return baseHashtags;
    }
  }

  /**
   * Test Twitter API connection
   */
  async testConnection() {
    if (!this.userClient) {
      throw new Error('Twitter user authentication required.');
    }

    try {
      const user = await this.userClient.v2.me();
      console.log('✅ Twitter API connection successful!');
      console.log(`👤 Connected as: @${user.data.username} (${user.data.name})`);
      return user.data;
    } catch (error) {
      console.error('❌ Twitter API test failed:', error.message);
      throw error;
    }
  }
}

// CLI Interface for Twitter operations
async function main() {
  const args = process.argv.slice(2);
  const twitter = new TwitterPoster();

  if (args.length === 0) {
    console.log('Twitter API Integration for AI-Now');
    console.log('==================================');
    console.log('');
    console.log('Commands:');
    console.log('  auth          - Authenticate with Twitter');
    console.log('  test          - Test API connection');
    console.log('  post <json>   - Post a tweet (provide metadata as JSON string)');
    console.log('');
    console.log('Setup: Create twitter-config.json with your OAuth 2.0 credentials:');
    console.log('{');
    console.log('  "apiKey": "your_client_id",');
    console.log('  "apiSecret": "your_client_secret"');
    console.log('}');
    console.log('');
    console.log('Make sure http://localhost:3002/callback is set as a redirect URI in your Twitter app!');
    return;
  }

  const command = args[0];

  try {
    switch (command) {
      case 'auth':
        await twitter.initialize();
        const authLink = await twitter.generateAuthUrl();

        // Simple code input
        const readline = require('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        rl.question('Enter the authorization code from the callback URL: ', async (code) => {
          try {
            await twitter.completeAuth(code.trim(), authLink);
            console.log('🎉 Authentication complete! You can now post tweets.');
          } catch (error) {
            console.error('Authentication failed:', error.message);
          }
          rl.close();
        });
        break;

      case 'test':
        await twitter.initialize();
        await twitter.testConnection();
        break;

      case 'post':
        if (args.length < 2) {
          console.error('❌ Please provide metadata JSON');
          process.exit(1);
        }

        const metadata = JSON.parse(args[1]);
        await twitter.initialize();
        await twitter.postVideoTweet(metadata);
        break;

      default:
        console.error('❌ Unknown command:', command);
        process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = TwitterPoster;