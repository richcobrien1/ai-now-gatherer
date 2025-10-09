const { google } = require('googleapis');
const fs = require('fs');
const http = require('http');
const url = require('url');

// YouTube API configuration
const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];
const TOKEN_PATH = './youtube-token.json';
const CREDENTIALS_PATH = './youtube-credentials.json';

// Load client secrets from a local file
function loadCredentials() {
  try {
    return JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  } catch (err) {
    throw new Error('Could not load credentials file: ' + err.message);
  }
}

async function authorize() {
  const credentials = loadCredentials();
  const { client_secret, client_id } = credentials.installed;

  // Use localhost redirect for unverified apps
  const redirectUri = 'http://localhost';
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);

  // Check if we have previously stored a token
  try {
    const token = fs.readFileSync(TOKEN_PATH);
    oAuth2Client.setCredentials(JSON.parse(token));
    console.log('✅ Using stored OAuth token');
    return oAuth2Client;
  } catch (err) {
    console.log('🔐 No stored token found, starting OAuth flow...');
    return getNewToken(oAuth2Client);
  }
}

function getNewToken(oAuth2Client) {
  return new Promise((resolve, reject) => {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });

    console.log('\n🔗 Visit this URL to authorize the app:');
    console.log(authUrl);
    console.log('\n📱 The page will redirect to localhost automatically');

    const server = http.createServer(async (req, res) => {
      try {
        const parsedUrl = new url.URL(req.url, 'http://localhost');
        const code = parsedUrl.searchParams.get('code');

        if (code) {
          console.log('✅ Authorization code received, exchanging for token...');

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #4CAF50;">✅ Authorization Successful!</h1>
                <p>You can close this window and return to the terminal.</p>
                <p>The OAuth token has been saved for future use.</p>
              </body>
            </html>
          `);

          server.close();

          oAuth2Client.getToken(code, (err, token) => {
            if (err) {
              console.error('❌ Error retrieving access token:', err.message);
              reject(err);
              return;
            }
            oAuth2Client.setCredentials(token);
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
            console.log('✅ Token stored to', TOKEN_PATH);
            resolve(oAuth2Client);
          });
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #f44336;">❌ Authorization Failed</h1>
                <p>No authorization code received.</p>
              </body>
            </html>
          `);
          server.close();
          reject(new Error('No authorization code received'));
        }
      } catch (error) {
        console.error('❌ Server error:', error);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>Server Error</h1>');
        server.close();
        reject(error);
      }
    });

    server.listen(80, () => {
      console.log('🌐 Local server listening on http://localhost');
      console.log('⏳ Waiting for authorization... (press Ctrl+C to cancel)');
    });

    server.on('error', (err) => {
      console.error('❌ Server error:', err.message);
      reject(err);
    });
  });
}

// Test the OAuth flow
async function testOAuth() {
  try {
    console.log('🚀 Testing YouTube OAuth authentication...\n');

    const auth = await authorize();

    // Test the API with a simple request
    const service = google.youtube('v3');
    const response = await service.channels.list({
      auth: auth,
      part: 'snippet',
      mine: true,
    });

    if (response.data.items && response.data.items.length > 0) {
      const channel = response.data.items[0];
      console.log('\n🎉 OAuth test successful!');
      console.log(`📺 Channel: ${channel.snippet.title}`);
      console.log(`🆔 Channel ID: ${channel.id}`);
      console.log(`📊 Subscriber count: ${channel.statistics.subscriberCount}`);
    } else {
      console.log('\n⚠️  OAuth successful but no channel data returned');
    }

  } catch (error) {
    console.error('\n❌ OAuth test failed:', error.message);

    if (error.message.includes('access_denied')) {
      console.log('\n💡 This usually means:');
      console.log('   - The app is not verified by Google');
      console.log('   - You need to add yourself as a test user in Google Cloud Console');
      console.log('   - Or the OAuth consent screen is not properly configured');
    }
  }
}

// Run the test
if (require.main === module) {
  testOAuth().catch(console.error);
}

module.exports = { authorize, testOAuth };