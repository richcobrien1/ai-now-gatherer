const https = require('https');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');

/**
 * Facebook Business API Integration for AI-Now
 * Handles automated posting to Facebook Pages
 */
class FacebookPoster {
  constructor() {
    this.accessToken = null;
    this.pageId = null;
    this.config = null;
  }

  /**
   * Initialize Facebook API client
   */
  async initialize() {
    console.log('📘 Initializing Facebook API client...');

    try {
      // Load configuration
      this.config = this.loadConfig();

      // Check if credentials are configured
      if (!this.hasValidCredentials()) {
        console.log('⚠️  Facebook credentials not configured (placeholders detected)');
        console.log('💡 To set up Facebook API:');
        console.log('   1. Go to https://developers.facebook.com/');
        console.log('   2. Create a Facebook App with Pages permissions');
        console.log('   3. Get Page Access Token and Page ID');
        console.log('   4. Edit facebook-config.json with real credentials');
        console.log('   5. Run: node facebook-poster.js auth');
        return false;
      }

      // Load tokens
      const tokens = this.loadTokens();
      if (tokens && tokens.pageAccessToken) {
        this.accessToken = tokens.pageAccessToken;
        this.pageId = tokens.pageId;
        console.log('✅ Facebook client initialized with page access token');
      } else {
        console.log('⚠️  Facebook client initialized (authentication needed)');
      }

      return true;

    } catch (error) {
      console.error('❌ Failed to initialize Facebook client:', error.message);
      throw error;
    }
  }

  /**
   * Load Facebook API configuration
   */
  loadConfig() {
    const configPath = path.join(__dirname, 'facebook-config.json');
    
    if (!fs.existsSync(configPath)) {
      // Create template config
      const template = {
        appId: 'YOUR_FACEBOOK_APP_ID',
        appSecret: 'YOUR_FACEBOOK_APP_SECRET',
        pageId: 'YOUR_FACEBOOK_PAGE_ID',
        redirectUri: 'https://localhost:3004/callback'
      };
      
      fs.writeFileSync(configPath, JSON.stringify(template, null, 2));
      console.log('📁 Created facebook-config.json template');
    }
    
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      throw new Error(`Facebook config not found. Please create ${configPath} with your app credentials.`);
    }
  }

  /**
   * Load access tokens
   */
  loadTokens() {
    const tokensPath = path.join(__dirname, 'facebook-tokens.json');
    try {
      return JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if config has valid credentials (not placeholders)
   */
  hasValidCredentials() {
    return this.config.appId &&
           this.config.appSecret &&
           this.config.pageId &&
           this.config.appId !== 'YOUR_FACEBOOK_APP_ID' &&
           this.config.appSecret !== 'YOUR_FACEBOOK_APP_SECRET' &&
           this.config.pageId !== 'YOUR_FACEBOOK_PAGE_ID';
  }

  /**
   * Save access tokens
   */
  saveTokens(tokens) {
    const tokensPath = path.join(__dirname, 'facebook-tokens.json');
    fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));
    console.log('✅ Facebook tokens saved');
  }

  /**
   * Generate authorization URL for user authentication
   */
  generateAuthUrl() {
    if (!this.hasValidCredentials()) {
      throw new Error('Facebook credentials not configured. Please edit facebook-config.json with real App ID, App Secret, and Page ID.');
    }

    const params = {
      client_id: this.config.appId,
      redirect_uri: this.config.redirectUri,
      scope: 'pages_manage_posts,pages_read_engagement,pages_show_list',
      response_type: 'code'
    };

    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${querystring.stringify(params)}`;

    console.log('\n🔗 Visit this URL to authorize the app:');
    console.log(authUrl);
    console.log('\n📝 Copy the authorization code from the callback URL and paste it here.\n');

    return authUrl;
  }

  /**
   * Complete authentication with authorization code
   */
  async completeAuth(authCode) {
    console.log('🔐 Completing Facebook authentication...');

    // Step 1: Exchange code for user access token
    const userToken = await this.exchangeCodeForToken(authCode);
    
    // Step 2: Get long-lived user access token
    const longLivedUserToken = await this.getLongLivedUserToken(userToken);
    
    // Step 3: Get page access token
    const pageToken = await this.getPageAccessToken(longLivedUserToken);
    
    // Save tokens
    const tokenData = {
      userAccessToken: longLivedUserToken,
      pageAccessToken: pageToken,
      pageId: this.config.pageId,
      obtainedAt: new Date().toISOString()
    };
    
    this.saveTokens(tokenData);
    this.accessToken = pageToken;
    this.pageId = this.config.pageId;
    
    console.log('✅ Facebook authentication successful!');
    return tokenData;
  }

  /**
   * Exchange authorization code for access token
   */
  exchangeCodeForToken(authCode) {
    return new Promise((resolve, reject) => {
      const params = {
        client_id: this.config.appId,
        client_secret: this.config.appSecret,
        redirect_uri: this.config.redirectUri,
        code: authCode
      };

      const options = {
        hostname: 'graph.facebook.com',
        path: `/v18.0/oauth/access_token?${querystring.stringify(params)}`,
        method: 'GET'
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.error) {
              reject(new Error(`Facebook OAuth error: ${response.error.message}`));
            } else {
              resolve(response.access_token);
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  /**
   * Get long-lived user access token
   */
  getLongLivedUserToken(shortToken) {
    return new Promise((resolve, reject) => {
      const params = {
        grant_type: 'fb_exchange_token',
        client_id: this.config.appId,
        client_secret: this.config.appSecret,
        fb_exchange_token: shortToken
      };

      const options = {
        hostname: 'graph.facebook.com',
        path: `/v18.0/oauth/access_token?${querystring.stringify(params)}`,
        method: 'GET'
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.error) {
              reject(new Error(`Facebook long-lived token error: ${response.error.message}`));
            } else {
              resolve(response.access_token);
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  /**
   * Get page access token
   */
  getPageAccessToken(userToken) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'graph.facebook.com',
        path: `/v18.0/${this.config.pageId}?fields=access_token&access_token=${userToken}`,
        method: 'GET'
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.error) {
              reject(new Error(`Facebook page token error: ${response.error.message}`));
            } else {
              resolve(response.access_token);
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  /**
   * Post content to Facebook Page
   */
  async postToFacebook(metadata, sourceUrl = null) {
    if (!this.accessToken || !this.pageId) {
      throw new Error('Facebook authentication required. Run authentication first.');
    }

    console.log('📘 Posting to Facebook...');

    return new Promise((resolve, reject) => {
      // Generate post content
      const postContent = this.generatePostContent(metadata, sourceUrl);

      const postData = querystring.stringify({
        message: postContent.text,
        link: sourceUrl,
        access_token: this.accessToken
      });

      const options = {
        hostname: 'graph.facebook.com',
        path: `/v18.0/${this.pageId}/feed`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);

            if (res.statusCode === 200 && response.id) {
              console.log('✅ Facebook post successful!');
              console.log(`🔗 Post ID: ${response.id}`);

              resolve({
                postId: response.id,
                postedAt: new Date().toISOString(),
                pageId: this.pageId
              });
            } else {
              reject(new Error(`Facebook post failed: ${data}`));
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

  /**
   * Generate post content for Facebook
   */
  generatePostContent(metadata, sourceUrl = null) {
    const { title, description, brand, contentType } = metadata;

    // Format brand name for display
    const displayBrand = brand.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    let postText = '';

    if (contentType === 'premium') {
      postText = `🔒 New Premium Content: ${title}\n\n`;
      postText += `Exploring cutting-edge developments in artificial intelligence and machine learning!\n\n`;
    } else {
      postText = `🚀 ${title}\n\n`;
      postText += `Stay updated with the latest in AI and emerging technologies!\n\n`;
    }

    // Add description
    if (description) {
      const descExcerpt = description.substring(0, 300);
      postText += `${descExcerpt}${description.length > 300 ? '...' : ''}\n\n`;
    }

    // Add call to action
    if (sourceUrl) {
      postText += `🔗 Watch the full episode at the link below!\n\n`;
    }

    // Add hashtags
    postText += this.getBrandHashtags(brand).join(' ');

    // Facebook allows long posts, but keep it engaging
    if (postText.length > 2000) {
      postText = postText.substring(0, 1997) + '...';
    }

    return { text: postText };
  }

  /**
   * Get brand-specific hashtags for Facebook
   */
  getBrandHashtags(brand) {
    const baseHashtags = ['#AI', '#ArtificialIntelligence', '#MachineLearning', '#Technology', '#Innovation'];

    switch (brand) {
      case 'ai-now':
        return [...baseHashtags, '#AINow', '#TechTrends', '#FutureOfAI'];
      case 'ai-now-educate':
        return [...baseHashtags, '#AIEducation', '#Learning', '#TechEducation'];
      case 'ai-now-commercial':
        return [...baseHashtags, '#AIBusiness', '#Enterprise', '#BusinessIntelligence'];
      case 'ai-now-conceptual':
        return [...baseHashtags, '#AIResearch', '#Science', '#EmergingTech'];
      default:
        return baseHashtags;
    }
  }

  /**
   * Test Facebook API connection
   */
  async testConnection() {
    if (!this.accessToken || !this.pageId) {
      throw new Error('Facebook authentication required.');
    }

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'graph.facebook.com',
        path: `/v18.0/${this.pageId}?fields=name,id,category&access_token=${this.accessToken}`,
        method: 'GET'
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const page = JSON.parse(data);
              console.log('✅ Facebook API connection successful!');
              console.log(`📄 Connected to page: ${page.name} (${page.category})`);
              console.log(`🆔 Page ID: ${page.id}`);

              resolve(page);
            } else {
              reject(new Error(`Facebook API test failed: ${data}`));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }
}

// CLI Interface for Facebook operations
async function main() {
  const args = process.argv.slice(2);
  const facebook = new FacebookPoster();

  if (args.length === 0) {
    console.log('Facebook Business API Integration for AI-Now');
    console.log('============================================');
    console.log('');
    console.log('Commands:');
    console.log('  auth          - Authenticate with Facebook');
    console.log('  test          - Test API connection');
    console.log('  post <json>   - Post to Facebook (provide metadata as JSON string)');
    console.log('');
    console.log('Setup: Create facebook-config.json with your app credentials');
    console.log('Example:');
    console.log('{');
    console.log('  "appId": "your_app_id",');
    console.log('  "appSecret": "your_app_secret",');
    console.log('  "pageId": "your_page_id",');
    console.log('  "redirectUri": "https://localhost:3004/callback"');
    console.log('}');
    console.log('');
    console.log('Permissions needed: pages_manage_posts, pages_read_engagement, pages_show_list');
    return;
  }

  const command = args[0];

  try {
    switch (command) {
      case 'auth':
        const initSuccess = await facebook.initialize();
        if (!initSuccess) {
          console.log('❌ Cannot authenticate: Facebook credentials not configured');
          process.exit(1);
        }
        
        const authUrl = await facebook.generateAuthUrl();

        // Simple code input
        const readline = require('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        rl.question('Enter the authorization code from Facebook: ', async (code) => {
          try {
            await facebook.completeAuth(code.trim());
            console.log('🎉 Authentication complete! You can now post to Facebook.');
          } catch (error) {
            console.error('Authentication failed:', error.message);
          }
          rl.close();
        });
        break;

      case 'test':
        const testInitSuccess = await facebook.initialize();
        if (!testInitSuccess) {
          console.log('❌ Cannot test: Facebook credentials not configured');
          process.exit(1);
        }
        await facebook.testConnection();
        break;

      case 'post':
        if (args.length < 2) {
          console.error('❌ Please provide metadata JSON');
          process.exit(1);
        }

        const postInitSuccess = await facebook.initialize();
        if (!postInitSuccess) {
          console.log('❌ Cannot post: Facebook credentials not configured');
          process.exit(1);
        }

        const metadata = JSON.parse(args[1]);
        const sourceUrl = args[2] || null;
        await facebook.postToFacebook(metadata, sourceUrl);
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

module.exports = FacebookPoster;