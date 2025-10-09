const LinkedIn = require('linkedin-api');
const https = require('https');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

// LinkedIn API Configuration
const LINKEDIN_CONFIG_PATH = './linkedin-config.json';
const LINKEDIN_TOKENS_PATH = './linkedin-tokens.json';

/**
 * LinkedIn API Integration for AI-Now
 * Handles automated posting to LinkedIn
 */
class LinkedInPoster {
  constructor() {
    this.client = null;
    this.accessToken = null;
  }

  /**
   * Initialize LinkedIn API client
   */
  async initialize() {
    console.log('💼 Initializing LinkedIn API client...');

    try {
      // Load configuration
      this.loadConfig();

      // Check if credentials are configured
      if (!this.hasValidCredentials()) {
        console.log('⚠️  LinkedIn credentials not configured (placeholders detected)');
        console.log('💡 To set up LinkedIn API:');
        console.log('   1. Go to https://developer.linkedin.com/');
        console.log('   2. Create an app and get Client ID/Secret');
        console.log('   3. Edit linkedin-config.json with real credentials');
        console.log('   4. Run: node linkedin-poster.js auth');
        return false;
      }

      // Try to load tokens
      const tokens = this.loadTokens();
      if (tokens && tokens.accessToken) {
        this.accessToken = tokens.accessToken;
        console.log('✅ LinkedIn client initialized with access token');
      } else {
        console.log('⚠️  LinkedIn client initialized (authentication needed)');
      }

      return true;

    } catch (error) {
      console.error('❌ Failed to initialize LinkedIn client:', error.message);
      throw error;
    }
  }

  /**
   * Load LinkedIn API configuration
   */
  loadConfig() {
    try {
      return JSON.parse(fs.readFileSync(LINKEDIN_CONFIG_PATH, 'utf8'));
    } catch (error) {
      throw new Error(`LinkedIn config not found. Please create ${LINKEDIN_CONFIG_PATH} with your app credentials.`);
    }
  }

  /**
   * Load access tokens
   */
  loadTokens() {
    try {
      return JSON.parse(fs.readFileSync(LINKEDIN_TOKENS_PATH, 'utf8'));
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if config has valid credentials (not placeholders)
   */
  hasValidCredentials() {
    const config = this.loadConfig();
    return config.clientId &&
           config.clientSecret &&
           config.clientId !== 'YOUR_LINKEDIN_CLIENT_ID' &&
           config.clientSecret !== 'YOUR_LINKEDIN_CLIENT_SECRET';
  }

  /**
   * Save access tokens
   */
  saveTokens(tokens) {
    fs.writeFileSync(LINKEDIN_TOKENS_PATH, JSON.stringify(tokens, null, 2));
    console.log('✅ LinkedIn tokens saved');
  }

  /**
   * Generate authorization URL for user authentication
   */
  generateAuthUrl() {
    const config = this.loadConfig();

    if (!this.hasValidCredentials()) {
      throw new Error('LinkedIn credentials not configured. Please edit linkedin-config.json with real Client ID and Client Secret.');
    }

    const params = {
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri || 'http://localhost:3003/callback',
      scope: 'w_member_social,r_liteprofile'
    };

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${querystring.stringify(params)}`;

    console.log('\n🔗 Visit this URL to authorize the app:');
    console.log(authUrl);
    console.log('\n📝 Copy the authorization code from the URL and paste it here.\n');

    return authUrl;
  }

  /**
   * Complete authentication with authorization code
   */
  async completeAuth(authCode) {
    const config = this.loadConfig();

    console.log('🔐 Completing LinkedIn authentication...');

    return new Promise((resolve, reject) => {
      const postData = querystring.stringify({
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: config.redirectUri || 'http://localhost:3003/callback',
        client_id: config.clientId,
        client_secret: config.clientSecret
      });

      const options = {
        hostname: 'www.linkedin.com',
        path: '/oauth/v2/accessToken',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const tokens = JSON.parse(data);

            if (tokens.error) {
              reject(new Error(`LinkedIn OAuth error: ${tokens.error_description}`));
              return;
            }

            const tokenData = {
              accessToken: tokens.access_token,
              expiresIn: tokens.expires_in,
              obtainedAt: new Date().toISOString()
            };

            this.saveTokens(tokenData);
            this.accessToken = tokens.access_token;

            console.log('✅ LinkedIn authentication successful!');
            resolve(tokenData);

          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Post content to LinkedIn
   */
  async postToLinkedIn(metadata, youtubeUrl = null) {
    if (!this.accessToken) {
      throw new Error('LinkedIn authentication required. Run authentication first.');
    }

    console.log('💼 Posting to LinkedIn...');

    return new Promise((resolve, reject) => {
      // First get user profile
      const profileOptions = {
        hostname: 'api.linkedin.com',
        path: '/v2/people/~',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      };

      const profileReq = https.request(profileOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const profile = JSON.parse(data);

            if (res.statusCode !== 200) {
              reject(new Error(`Failed to get profile: ${data}`));
              return;
            }

            // Generate post content
            const postContent = this.generatePostContent(metadata, youtubeUrl);

            // Create the post
            const postData = {
              author: `urn:li:person:${profile.id}`,
              lifecycleState: 'PUBLISHED',
              specificContent: {
                'com.linkedin.ugc.ShareContent': {
                  shareCommentary: {
                    text: postContent.text
                  },
                  shareMediaCategory: 'NONE'
                }
              },
              visibility: {
                'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
              }
            };

            const postOptions = {
              hostname: 'api.linkedin.com',
              path: '/v2/ugcPosts',
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0'
              }
            };

            const postReq = https.request(postOptions, (postRes) => {
              let postResponse = '';

              postRes.on('data', (chunk) => {
                postResponse += chunk;
              });

              postRes.on('end', () => {
                try {
                  if (postRes.statusCode === 201) {
                    const response = JSON.parse(postResponse);
                    console.log('✅ LinkedIn post successful!');
                    console.log(`🔗 Post created with ID: ${response.id}`);

                    resolve({
                      postId: response.id,
                      postedAt: new Date().toISOString(),
                      authorId: profile.id
                    });
                  } else {
                    reject(new Error(`LinkedIn post failed: ${postResponse}`));
                  }
                } catch (error) {
                  reject(error);
                }
              });
            });

            postReq.on('error', (error) => {
              reject(error);
            });

            postReq.write(JSON.stringify(postData));
            postReq.end();

          } catch (error) {
            reject(error);
          }
        });
      });

      profileReq.on('error', (error) => {
        reject(error);
      });

      profileReq.end();
    });
  }

  /**
   * Generate post content for LinkedIn
   */
  generatePostContent(metadata, youtubeUrl = null) {
    const { title, description, brand, contentType } = metadata;

    // Format brand name for display
    const displayBrand = brand.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    let postText = '';

    if (contentType === 'premium') {
      postText = `🔒 New Premium Content: ${title}\n\n`;
      postText += `Exploring the latest developments in artificial intelligence and machine learning.\n\n`;
    } else {
      postText = `📈 ${title}\n\n`;
      postText += `Latest insights in AI and emerging technologies.\n\n`;
    }

    // Add description excerpt
    const descExcerpt = description.split('\n')[0].substring(0, 150);
    if (descExcerpt) {
      postText += `${descExcerpt}...\n\n`;
    }

    // Add YouTube link if available
    if (youtubeUrl) {
      postText += `▶️ Watch the full episode: ${youtubeUrl}\n\n`;
    } else {
      postText += `▶️ Watch on YouTube: [Link will be added after upload]\n\n`;
    }

    // Add professional hashtags
    postText += this.getProfessionalHashtags(brand).join(' ');

    // Add call to action
    postText += `\n\n#AI #ArtificialIntelligence #MachineLearning #TechInnovation #ProfessionalDevelopment`;

    // LinkedIn has a 3000 character limit
    if (postText.length > 3000) {
      postText = postText.substring(0, 2997) + '...';
    }

    return { text: postText };
  }

  /**
   * Get professional hashtags for LinkedIn
   */
  getProfessionalHashtags(brand) {
    const baseHashtags = ['#AI', '#ArtificialIntelligence', '#MachineLearning', '#Technology', '#Innovation'];

    switch (brand) {
      case 'ai-now':
        return [...baseHashtags, '#AINow', '#TechTrends', '#DigitalTransformation'];
      case 'ai-now-educate':
        return [...baseHashtags, '#AIEducation', '#ProfessionalDevelopment', '#Learning'];
      case 'ai-now-commercial':
        return [...baseHashtags, '#AICommercial', '#BusinessIntelligence', '#EnterpriseAI'];
      case 'ai-now-conceptual':
        return [...baseHashtags, '#AIResearch', '#FutureOfWork', '#EmergingTech'];
      default:
        return baseHashtags;
    }
  }

  /**
   * Test LinkedIn API connection
   */
  async testConnection() {
    if (!this.accessToken) {
      throw new Error('LinkedIn authentication required.');
    }

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.linkedin.com',
        path: '/v2/people/~',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const profile = JSON.parse(data);
              console.log('✅ LinkedIn API connection successful!');
              console.log(`👤 Connected as: ${profile.localizedFirstName} ${profile.localizedLastName}`);

              resolve(profile);
            } else {
              reject(new Error(`LinkedIn API test failed: ${data}`));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  }
}

// CLI Interface for LinkedIn operations
async function main() {
  const args = process.argv.slice(2);
  const linkedin = new LinkedInPoster();

  if (args.length === 0) {
    console.log('LinkedIn API Integration for AI-Now');
    console.log('====================================');
    console.log('');
    console.log('Commands:');
    console.log('  auth          - Authenticate with LinkedIn');
    console.log('  test          - Test API connection');
    console.log('  post <json>   - Post to LinkedIn (provide metadata as JSON string)');
    console.log('');
    console.log('Setup: Create linkedin-config.json with your app credentials');
    console.log('Example:');
    console.log('{');
    console.log('  "clientId": "your_client_id",');
    console.log('  "clientSecret": "your_client_secret",');
    console.log('  "redirectUri": "http://localhost:3003/callback"');
    console.log('}');
    return;
  }

  const command = args[0];

  try {
    switch (command) {
      case 'auth':
        const initSuccess = await linkedin.initialize();
        if (!initSuccess) {
          console.log('❌ Cannot authenticate: LinkedIn credentials not configured');
          process.exit(1);
        }
        const authUrl = await linkedin.generateAuthUrl();

        // Simple code input
        const readline = require('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        rl.question('Enter the authorization code from LinkedIn: ', async (code) => {
          try {
            await linkedin.completeAuth(code.trim());
            console.log('🎉 Authentication complete! You can now post to LinkedIn.');
          } catch (error) {
            console.error('Authentication failed:', error.message);
          }
          rl.close();
        });
        break;

      case 'test':
        const testInitSuccess = await linkedin.initialize();
        if (!testInitSuccess) {
          console.log('❌ Cannot test: LinkedIn credentials not configured');
          process.exit(1);
        }
        await linkedin.testConnection();
        break;

      case 'post':
        if (args.length < 2) {
          console.error('❌ Please provide metadata JSON');
          process.exit(1);
        }

        const postInitSuccess = await linkedin.initialize();
        if (!postInitSuccess) {
          console.log('❌ Cannot post: LinkedIn credentials not configured');
          process.exit(1);
        }

        const metadata = JSON.parse(args[1]);
        await linkedin.postToLinkedIn(metadata);
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

module.exports = LinkedInPoster;