#!/usr/bin/env node

/**
 * Post Spotify podcast episode to X (Twitter) + Facebook
 * Usage: node post-spotify.js <spotify-url> <title> [description]
 */

const https = require('https');

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: () => Promise.resolve(JSON.parse(data)),
          text: () => Promise.resolve(data),
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

async function postSpotifyToSocial(spotifyUrl, title, description) {
  console.log('\n🎵 Posting Spotify episode to social media...');
  console.log(`🔗 Spotify: ${spotifyUrl}`);
  console.log(`📝 Title: ${title}\n`);

  try {
    const response = await fetch('https://www.v2u.us/api/social-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platforms: ['twitter', 'facebook'],
        episode: {
          title: title,
          description: description || title,
          spotifyUrl: spotifyUrl,
          category: 'ai-now',
          publishDate: new Date().toISOString().split('T')[0],
        },
      }),
    });

    const result = await response.json();
    console.log(`📊 Results: ${result.summary.succeeded}/${result.summary.total} succeeded\n`);

    if (result.results.twitter?.success) {
      console.log(`✅ X/Twitter: ${result.results.twitter.url}`);
    } else if (result.results.twitter?.error) {
      console.log(`❌ X/Twitter: ${result.results.twitter.error}`);
    }

    if (result.results.facebook?.success) {
      console.log(`✅ Facebook: Posted successfully`);
    } else if (result.results.facebook?.error) {
      console.log(`❌ Facebook: ${result.results.facebook.error}`);
    }

    console.log('\n✨ Done!');
  } catch (error) {
    console.error('❌ Failed to post:', error.message);
    process.exit(1);
  }
}

// Main
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log(`
Usage: node post-spotify.js <spotify-url> <title> [description]

Example:
  node post-spotify.js "https://open.spotify.com/episode/..." "AI Podcast Ep 42" "Deep dive into AI"
  `);
  process.exit(1);
}

const [spotifyUrl, title, description] = args;

postSpotifyToSocial(spotifyUrl, title, description);
