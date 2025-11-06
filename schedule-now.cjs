#!/usr/bin/env node

/**
 * Schedule post for RIGHT NOW to test execution
 */

const fs = require('fs');
const path = require('path');

const video = {
  id: '1TxLSyzZGto',
  title: 'November 5, 2025, AI-Now - Developments and Implications - Deep Dive with Alex and Jessica',
  url: 'https://www.youtube.com/watch?v=1TxLSyzZGto'
};

// Schedule for RIGHT NOW
const scheduledTime = new Date();

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

const dataDir = path.join(__dirname, '..', 'website', 'data');
const scheduleFile = path.join(dataDir, 'scheduled-posts.json');

let scheduled = [];
if (fs.existsSync(scheduleFile)) {
  scheduled = JSON.parse(fs.readFileSync(scheduleFile, 'utf8'));
}

scheduled.push(scheduledPost);
fs.writeFileSync(scheduleFile, JSON.stringify(scheduled, null, 2));

console.log('✅ Post Scheduled for RIGHT NOW!');
console.log(`📋 Schedule ID: ${scheduledPost.id}\n`);
