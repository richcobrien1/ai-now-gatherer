const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * YouTube Web Upload Automation
 * Alternative to API upload when OAuth verification is blocked
 */
class YouTubeWebUploader {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    console.log('🚀 Initializing YouTube web uploader...');

    this.browser = await puppeteer.launch({
      headless: false, // Keep browser visible for manual interaction
      defaultViewport: null,
      args: ['--start-maximized']
    });

    this.page = await this.browser.newPage();

    // Set user agent to avoid detection
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    console.log('✅ Browser initialized');
  }

  async login(email, password) {
    console.log('🔐 Starting YouTube login process...');

    try {
      // Go to YouTube Studio
      await this.page.goto('https://studio.youtube.com/', { waitUntil: 'networkidle2' });

      // Wait for and click sign in button
      await this.page.waitForSelector('a[href*="accounts.google.com"]', { timeout: 10000 });
      await this.page.click('a[href*="accounts.google.com"]');

      // Wait for email input
      await this.page.waitForSelector('input[type="email"]', { timeout: 10000 });
      await this.page.type('input[type="email"]', email);
      await this.page.click('#identifierNext');

      // Wait for password input
      await this.page.waitForSelector('input[type="password"]', { timeout: 10000 });
      await this.page.type('input[type="password"]', password);
      await this.page.click('#passwordNext');

      // Wait for successful login (YouTube Studio dashboard)
      await this.page.waitForSelector('.upload-button', { timeout: 30000 });

      console.log('✅ Successfully logged into YouTube Studio');

    } catch (error) {
      console.error('❌ Login failed:', error.message);
      throw error;
    }
  }

  async uploadVideo(videoPath, metadata) {
    console.log(`📹 Starting upload: ${metadata.title}`);

    try {
      // Click upload button
      await this.page.waitForSelector('.upload-button', { timeout: 10000 });
      const uploadButton = await this.page.$('.upload-button');
      await uploadButton.click();

      // Wait for file input and upload file
      await this.page.waitForSelector('input[type="file"]', { timeout: 10000 });
      const fileInput = await this.page.$('input[type="file"]');
      await fileInput.uploadFile(videoPath);

      console.log('📤 File uploaded, waiting for processing...');

      // Wait for upload to process and details form to appear
      await this.page.waitForSelector('input[name="title"]', { timeout: 60000 });

      // Fill in video details
      await this.page.evaluate((metadata) => {
        // Title
        const titleInput = document.querySelector('input[name="title"]');
        if (titleInput) titleInput.value = metadata.title;

        // Description
        const descInput = document.querySelector('textarea[name="description"]');
        if (descInput) descInput.value = metadata.description;

        // Tags
        const tagsInput = document.querySelector('input[name="tags"]');
        if (tagsInput && metadata.tags) {
          tagsInput.value = metadata.tags.join(',');
        }

        // Privacy setting
        const privacySelect = document.querySelector('select[name="privacy"]');
        if (privacySelect) {
          privacySelect.value = metadata.privacyStatus || 'private';
        }

        // Playlist selection (if available)
        if (metadata.playlistId) {
          const playlistCheckboxes = document.querySelectorAll('input[name="playlists"]');
          playlistCheckboxes.forEach(checkbox => {
            if (checkbox.value === metadata.playlistId) {
              checkbox.checked = true;
            }
          });
        }

      }, metadata);

      console.log('📝 Video details filled in');

      // Wait a moment for form to process
      await this.page.waitForTimeout(2000);

      // Click publish/next button
      const publishButton = await this.page.$('button[data-action="publish"]') ||
                           await this.page.$('button[data-action="next"]') ||
                           await this.page.$('button:contains("Publish")') ||
                           await this.page.$('button:contains("Next")');

      if (publishButton) {
        await publishButton.click();
        console.log('🚀 Video published!');
      } else {
        console.log('⚠️  Publish button not found - manual completion required');
        console.log('📋 Please complete the upload manually in the browser');
      }

      return {
        success: true,
        method: 'web_upload',
        title: metadata.title,
        uploadTime: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Upload failed:', error.message);
      throw error;
    }
  }

  async close() {
    if (this.browser) {
      console.log('🔒 Closing browser...');
      await this.browser.close();
    }
  }

  // Manual upload mode - just opens YouTube Studio
  async openStudio() {
    console.log('📺 Opening YouTube Studio for manual upload...');

    await this.page.goto('https://studio.youtube.com/', { waitUntil: 'networkidle2' });

    console.log('✅ YouTube Studio opened');
    console.log('📋 Upload your videos manually, then close the browser when done');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage:');
    console.log('  node youtube-web-upload.js login <email> <password>');
    console.log('  node youtube-web-upload.js upload <video-path> <title> [description]');
    console.log('  node youtube-web-upload.js studio');
    process.exit(1);
  }

  const uploader = new YouTubeWebUploader();

  try {
    await uploader.initialize();

    const command = args[0];

    switch (command) {
      case 'login':
        if (args.length < 3) {
          console.error('❌ Email and password required for login');
          process.exit(1);
        }
        await uploader.login(args[1], args[2]);
        console.log('✅ Login successful! Browser will stay open for uploads.');
        console.log('📋 Press Ctrl+C to exit when done.');
        // Keep browser open
        process.on('SIGINT', async () => {
          await uploader.close();
          process.exit(0);
        });
        break;

      case 'upload':
        if (args.length < 3) {
          console.error('❌ Video path and title required for upload');
          process.exit(1);
        }
        const videoPath = args[1];
        const title = args[2];
        const description = args[3] || '';

        if (!fs.existsSync(videoPath)) {
          console.error('❌ Video file not found:', videoPath);
          process.exit(1);
        }

        // You'll need to login first
        console.log('⚠️  Please run login command first, or use studio command');
        await uploader.close();
        break;

      case 'studio':
        await uploader.openStudio();
        console.log('📋 Press Ctrl+C to exit when done.');
        process.on('SIGINT', async () => {
          await uploader.close();
          process.exit(0);
        });
        break;

      default:
        console.error('❌ Unknown command:', command);
        await uploader.close();
        process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    await uploader.close();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = YouTubeWebUploader;