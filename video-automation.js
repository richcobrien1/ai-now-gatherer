const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { uploadToYouTube, generateMetadata } = require('./youtube-upload');

// Configuration
const WATCH_DIRS = {
  premium: './premium',
  standard: './standard'
};

const PROCESSED_DIR = './processed';
const UPLOAD_SCRIPTS = {
  premium: './up-p.sh',
  standard: './up-m.sh'
};

// Ensure directories exist
Object.values(WATCH_DIRS).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

if (!fs.existsSync(PROCESSED_DIR)) {
  fs.mkdirSync(PROCESSED_DIR, { recursive: true });
}

// Get file extension
function getExtension(filename) {
  return path.extname(filename).toLowerCase();
}

// Check if file is a video
function isVideoFile(filename) {
  const ext = getExtension(filename);
  return ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'].includes(ext);
}

// Upload file using appropriate script
async function uploadFile(filePath, contentType) {
  try {
    const script = UPLOAD_SCRIPTS[contentType];
    const command = `"${script}" "${filePath}"`;
    const filename = path.basename(filePath);

    console.log(`🚀 Uploading ${contentType} video to R2: ${filename}`);

    // Execute R2 upload
    const { stdout } = await new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ R2 Upload failed: ${error.message}`);
          reject(error);
          return;
        }
        resolve({ stdout, stderr });
      });
    });

    console.log(`✅ R2 Upload successful!`);
    if (stdout) console.log(stdout);

    // Move file to processed directory
    const processedPath = path.join(PROCESSED_DIR, `${Date.now()}-${filename}`);
    await new Promise((resolve, reject) => {
      fs.rename(filePath, processedPath, (err) => {
        if (err) {
          console.error(`⚠️  Could not move file to processed: ${err.message}`);
          reject(err);
        } else {
          console.log(`📁 Moved to processed: ${filename}`);
          resolve();
        }
      });
    });

    // Upload to YouTube (asynchronous, don't wait for completion)
    console.log(`🎥 Starting YouTube upload for ${contentType} video...`);
    const metadata = await generateMetadata(filename, contentType, processedPath);

    uploadToYouTube(processedPath, metadata)
      .then((result) => {
        console.log(`✅ YouTube upload completed!`);
        console.log(`🔗 YouTube URL: ${result.videoUrl}`);
        console.log(`🆔 Video ID: ${result.videoId}`);
        if (result.dimensions) {
          console.log(`📐 Format: ${result.dimensions.format} (${result.dimensions.width}x${result.dimensions.height})`);
        }
      })
      .catch((error) => {
        console.error(`❌ YouTube upload failed: ${error.message}`);
        console.log(`💡 You can manually upload later: node youtube-upload.js "${processedPath}" ${contentType}`);
      });

    return stdout;

  } catch (error) {
    console.error(`❌ Upload process failed: ${error.message}`);
    throw error;
  }
}

// Watch directory for new files
function watchDirectory(dirPath, contentType) {
  console.log(`👀 Watching ${contentType} directory: ${dirPath}`);

  fs.watch(dirPath, (eventType, filename) => {
    if (!filename || eventType !== 'rename') return;

    const filePath = path.join(dirPath, filename);

    // Check if file exists (not deleted) and is a video
    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) return;
      if (!isVideoFile(filename)) return;

      console.log(`📹 New ${contentType} video detected: ${filename}`);

      // Wait a bit for file to be fully written
      setTimeout(async () => {
        try {
          await uploadFile(filePath, contentType);
        } catch (err) {
          console.error(`Upload error: ${err.message}`);
        }
      }, 2000);
    });
  });
}

// Start watching all directories
console.log('🎬 AI-Now Video Automation Started');
console.log('=====================================');

Object.entries(WATCH_DIRS).forEach(([contentType, dirPath]) => {
  watchDirectory(dirPath, contentType);
});

console.log('\n📂 Drop video files in:');
console.log(`   Premium: ${WATCH_DIRS.premium}`);
console.log(`   Standard: ${WATCH_DIRS.standard}`);
console.log('\n⏹️  Press Ctrl+C to stop\n');

// Keep the script running
process.on('SIGINT', () => {
  console.log('\n👋 Video automation stopped');
  process.exit(0);
});