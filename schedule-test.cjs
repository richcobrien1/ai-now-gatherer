#!/usr/bin/env node

/**
 * Simple test: Schedule YouTube video to X at 2:30 PM MST
 * Video: November 5, 2025, AI-Now - Developments and Implications
 */

const fs = require('fs');
const path = require('path');

const video = {
  id: '1TxLSyzZGto',
  title: 'November 5, 2025, AI-Now - Developments and Implications - Deep Dive with Alex and Jessica',
  url: 'https://www.youtube.com/watch?v=1TxLSyzZGto'
};

// Calculate 2:30 PM MST today
const now = new Date();
const scheduledTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Denver' }));
scheduledTime.setHours(14, 30, 0, 0);

// If already passed, schedule for tomorrow
if (scheduledTime < now) {
  scheduledTime.setDate(scheduledTime.getDate() + 1);
  console.log('⚠️  2:30 PM MST has passed, scheduling for tomorrow');
}

const scheduledPost = {
  id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  episodeId: video.id,
  episodeTitle: video.title,
  platforms: ['twitter'],
  customMessage: `${video.title}\n\n${video.url}`,
  scheduledTime: scheduledTime.toISOString(),
  status: 'pending',
  createdAt: new Date().toISOString()
};

// Save to local file
const dataDir = path.join(__dirname, '..', 'website', 'data');
const scheduleFile = path.join(dataDir, 'scheduled-posts.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let scheduled = [];
if (fs.existsSync(scheduleFile)) {
  scheduled = JSON.parse(fs.readFileSync(scheduleFile, 'utf8'));
}

scheduled.push(scheduledPost);
fs.writeFileSync(scheduleFile, JSON.stringify(scheduled, null, 2));

console.log('✅ Post Scheduled Successfully!\n');
console.log(`📹 Video: ${video.title}`);
console.log(`🔗 URL: ${video.url}`);
console.log(`⏰ Scheduled for: ${scheduledTime.toLocaleString('en-US', { timeZone: 'America/Denver' })} MST`);
console.log(`   (${scheduledTime.toISOString()} UTC)`);
console.log(`\n📋 Schedule ID: ${scheduledPost.id}`);
console.log(`📁 Saved to: ${scheduleFile}\n`);
console.log('💡 The cron job will execute this at the scheduled time');
console.log('   Or manually trigger with: PUT /api/social-schedule\n');
