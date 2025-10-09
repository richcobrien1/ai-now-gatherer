const http = require('http');
const url = require('url');

// YouTube API configuration
const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];
const TOKEN_PATH = './youtube-token.json';
const CREDENTIALS_PATH = './youtube-credentials.json';

// Playlist IDs (update these with your actual playlist IDs)
const PLAYLISTS = {
  // AI-Now brand
  'ai-now': 'PLQDaXrlGzy40uuAqfgi5t1ZbiaDhoW-By',        // Desktop Landscape
  'ai-now-podcast': 'PLQDaXrlGzy42AYgXAa4JpeaLA2PcXyeIt',  // Mobile Portrait

  // AI-Now-Educate brand
  'ai-now-educate': 'PLQDaXrlGzy42uIXMHniHX-6ZN55hm1zd7',  // Desktop Landscape
  'ai-now-educate-podcast': 'PLQDaXrlGzy40KfvrOHhVexGZdG1_w7kj7',  // Mobile Portrait

  // Add more brands as needed
  // 'ai-now-commercial': 'YOUR_COMMERCIAL_PLAYLIST_ID',
  // 'ai-now-commercial-podcast': 'YOUR_COMMERCIAL_PODCAST_ID',
  // 'ai-now-conceptual': 'YOUR_CONCEPTUAL_PLAYLIST_ID',
  // 'ai-now-conceptual-podcast': 'YOUR_CONCEPTUAL_PODCAST_ID',
};

// Get video dimensions using ffprobe
function getVideoDimensions(videoPath) {
  return new Promise((resolve, reject) => {
    const command = `ffprobe -v quiet -print_format json -show_streams "${videoPath}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.warn(`⚠️  Could not get video dimensions: ${error.message}`);
        console.log(`💡 Install ffmpeg/ffprobe for automatic format detection`);
        resolve(null);
        return;
      }

      try {
        const data = JSON.parse(stdout);
        const videoStream = data.streams.find(stream => stream.codec_type === 'video');

        if (videoStream) {
          const width = videoStream.width;
          const height = videoStream.height;
          const isLandscape = width > height;
          const isPortrait = height > width;

          resolve({
            width,
            height,
            isLandscape,
            isPortrait,
            aspectRatio: width / height,
            format: isLandscape ? 'landscape' : isPortrait ? 'portrait' : 'square'
          });
        } else {
          resolve(null);
        }
      } catch (err) {
        console.warn(`⚠️  Could not parse video info: ${err.message}`);
        resolve(null);
      }
    });
  });
}

// Determine playlist based on video format and brand
function getPlaylistForVideo(dimensions, contentType = 'premium', brand = 'ai-now') {
  const basePlaylist = brand.toLowerCase();

  if (!dimensions) {
    // Default playlists based on format
    return contentType === 'premium' ? PLAYLISTS[basePlaylist] || PLAYLISTS['ai-now'] : PLAYLISTS[`${basePlaylist}-podcast`] || PLAYLISTS['ai-now-podcast'];
  }

  // Landscape (desktop) -> base playlist (e.g., 'ai-now' or 'ai-now-educate')
  // Portrait (mobile) -> podcast playlist (e.g., 'ai-now-podcast' or 'ai-now-educate-podcast')
  if (dimensions.isLandscape) {
    return PLAYLISTS[basePlaylist] || PLAYLISTS['ai-now'];
  } else if (dimensions.isPortrait) {
    return PLAYLISTS[`${basePlaylist}-podcast`] || PLAYLISTS['ai-now-podcast'];
  } else {
    // Square videos default to base playlist
    return PLAYLISTS[basePlaylist] || PLAYLISTS['ai-now'];
  }
}

// Load client secrets from local file
function loadCredentials() {
  try {
    const content = fs.readFileSync(CREDENTIALS_PATH);
    return JSON.parse(content);
  } catch (err) {
    console.error('❌ Error loading YouTube credentials:', err.message);
    console.log('📝 Please create youtube-credentials.json with your OAuth2 credentials');
    console.log('🔗 Get credentials from: https://console.developers.google.com/');
    process.exit(1);
  }
}

// Create OAuth2 client
function createOAuth2Client(credentials) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  return oAuth2Client;
}

// Get and store new token after prompting for user authorization
function getNewToken(oAuth2Client) {
  return new Promise((resolve, reject) => {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });

    console.log('🔗 Authorize this app by visiting this url:', authUrl);
    console.log('📱 The page will redirect to localhost - allow it if prompted by your browser');

    const server = http.createServer(async (req, res) => {
      try {
        const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
        const code = qs.get('code');

        if (code) {
          console.log('✅ Authorization code received, exchanging for token...');

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>Authorization successful!</h1><p>You can close this window now.</p>');

          server.close();

          oAuth2Client.getToken(code, (err, token) => {
            if (err) {
              console.error('❌ Error retrieving access token', err);
              reject(err);
              return;
            }
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
            console.log('✅ Token stored to', TOKEN_PATH);
            resolve(oAuth2Client);
          });
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Authorization failed</h1><p>No code received.</p>');
          server.close();
          reject(new Error('No authorization code received'));
        }
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>Server error</h1>');
        server.close();
        reject(error);
      }
    });

    server.listen(3000, () => {
      console.log('🌐 Local server listening on http://localhost:3000');
      console.log('⏳ Waiting for authorization...');
    });

    server.on('error', (err) => {
      console.error('❌ Server error:', err);
      reject(err);
    });
  });
}

// Authorize and return OAuth2 client
async function authorize() {
  const credentials = loadCredentials();
  const oAuth2Client = createOAuth2Client(credentials);

  // Check if we have previously stored a token
  try {
    const token = fs.readFileSync(TOKEN_PATH);
    oAuth2Client.setCredentials(JSON.parse(token));
    return oAuth2Client;
  } catch (err) {
    return getNewToken(oAuth2Client);
  }
}

// Upload video to YouTube
async function uploadToYouTube(videoPath, metadata) {
  try {
    console.log('🎬 Starting YouTube upload...');

    // Get video dimensions for playlist assignment
    const dimensions = await getVideoDimensions(videoPath);
    if (dimensions) {
      console.log(`📐 Video format: ${dimensions.width}x${dimensions.height} (${dimensions.format})`);
    }

    const auth = await authorize();
    const service = google.youtube('v3');

    const requestBody = {
      snippet: {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        categoryId: metadata.categoryId || '28', // Science & Technology
      },
      status: {
        privacyStatus: metadata.privacyStatus || 'private', // private, public, unlisted
        publishAt: metadata.publishAt, // For scheduled publishing
      },
    };

    // Add playlist if specified
    if (metadata.playlistId) {
      console.log(`📋 Adding to playlist: ${metadata.playlistId}`);
      // Note: Playlist assignment happens after video upload
    }

    const response = await service.videos.insert({
      auth: auth,
      part: 'snippet,status',
      requestBody: requestBody,
      media: {
        body: fs.createReadStream(videoPath),
      },
    });

    const videoId = response.data.id;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Add to playlist if specified
    if (metadata.playlistId && metadata.playlistId !== 'YOUR_AI_NOW_PLAYLIST_ID' && metadata.playlistId !== 'YOUR_AI_NOW_PODCAST_ID') {
      try {
        await service.playlistItems.insert({
          auth: auth,
          part: 'snippet',
          requestBody: {
            snippet: {
              playlistId: metadata.playlistId,
              resourceId: {
                kind: 'youtube#video',
                videoId: videoId,
              },
            },
          },
        });
        console.log(`✅ Added to playlist: ${metadata.playlistId}`);
      } catch (playlistError) {
        console.warn(`⚠️  Could not add to playlist: ${playlistError.message}`);
      }
    }

    console.log(`✅ Video uploaded successfully!`);
    console.log(`🔗 YouTube URL: ${videoUrl}`);
    console.log(`🆔 Video ID: ${videoId}`);

    return {
      videoId,
      videoUrl,
      uploadDate: new Date().toISOString(),
      dimensions,
      playlistId: metadata.playlistId,
    };

  } catch (error) {
    console.error('❌ YouTube upload failed:', error.message);
    throw error;
  }
}

// Generate metadata for AI-Now videos
async function generateMetadata(filename, contentType = 'premium', videoPath = null, brand = 'ai-now') {
  // Format brand name for display (e.g., 'ai-now-educate' -> 'AI Now Educate')
  const displayBrand = brand.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Get video dimensions if path provided
  const dimensions = videoPath ? await getVideoDimensions(videoPath) : null;
  const playlistId = getPlaylistForVideo(dimensions, contentType, brand);

  let title, description, tags, thumbnailPath;

  if (contentType === 'premium') {
    if (dimensions?.isLandscape) {
      // Desktop Landscape - base playlist
      title = `${displayBrand} - Premium Episode | ${date}`;
      thumbnailPath = './v2u-premium.jpg';
    } else if (dimensions?.isPortrait) {
      // Mobile Portrait - podcast playlist
      title = `${displayBrand} - Premium Episode | ${date}`;
      thumbnailPath = './v2u-mobile-premium.jpg'; // Different thumbnail for mobile
    } else {
      // Unknown format - default to desktop
      title = `${displayBrand} - Premium Episode | ${date}`;
      thumbnailPath = './v2u-premium.jpg';
    }

    description = `🔒 Premium ${displayBrand} episode featuring the latest developments in artificial intelligence and machine learning.

Subscribe for more cutting-edge AI content!

#${brand.replace(/-/g, '')} #ArtificialIntelligence #MachineLearning #TechNews #AI

📧 Contact: [Your contact info]
🌐 Website: [Your website]`;

    tags = [
      'AI', 'Artificial Intelligence', 'Machine Learning', 'AI News',
      'Technology', 'Tech News', 'Premium Content', displayBrand,
      'Deep Learning', 'Neural Networks', 'AI Research'
    ];
  } else {
    // Standard content
    title = `${displayBrand} - ${date}`;

    if (dimensions?.isPortrait) {
      thumbnailPath = './v2u-mobile-standard.jpg'; // Mobile thumbnail
    } else {
      thumbnailPath = './v2u-standard.jpg'; // Desktop thumbnail
    }

    description = `Latest updates in artificial intelligence and emerging technologies.

#${brand.replace(/-/g, '')} #ArtificialIntelligence #MachineLearning #TechNews

Subscribe for daily AI updates!`;

    tags = [
      'AI', 'Artificial Intelligence', 'Machine Learning', 'AI News',
      'Technology', 'Tech News', displayBrand
    ];
  }

  return {
    title,
    description,
    tags,
    categoryId: '28', // Science & Technology
    privacyStatus: contentType === 'premium' ? 'private' : 'public',
    playlistId,
    thumbnailPath,
    dimensions,
  };
}

// Main function for CLI usage
async function main() {
  if (process.argv.length < 3) {
    console.log('Usage: node youtube-upload.js <video-file-path> [premium|standard] [brand]');
    console.log('Brands: ai-now, ai-now-educate, ai-now-commercial, ai-now-conceptual');
    process.exit(1);
  }

  const videoPath = process.argv[2];
  const contentType = process.argv[3] || 'premium';
  const brand = process.argv[4] || 'ai-now';

  if (!fs.existsSync(videoPath)) {
    console.error('❌ Video file not found:', videoPath);
    process.exit(1);
  }

  const filename = path.basename(videoPath);
  const metadata = await generateMetadata(filename, contentType, videoPath, brand);

  console.log(`📹 Uploading: ${filename}`);
  console.log(`🏷️  Title: ${metadata.title}`);
  console.log(`🔒 Privacy: ${metadata.privacyStatus}`);
  console.log(`📋 Playlist: ${metadata.playlistId}`);
  console.log(`🏢 Brand: ${brand}`);

  if (metadata.dimensions) {
    console.log(`📐 Format: ${metadata.dimensions.format} (${metadata.dimensions.width}x${metadata.dimensions.height})`);
  }

  try {
    const result = await uploadToYouTube(videoPath, metadata);
    console.log('\n🎉 Upload complete!');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    process.exit(1);
  }
}

// Export functions for use in other modules
module.exports = {
  uploadToYouTube,
  generateMetadata,
  authorize,
};

if (require.main === module) {
  main();
}