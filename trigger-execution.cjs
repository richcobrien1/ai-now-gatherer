#!/usr/bin/env node

/**
 * Trigger execution of scheduled posts via production API
 */

const https = require('https');

console.log('⏰ Triggering scheduled post execution on production...\n');

const options = {
  hostname: 'www.v2u.us',
  path: '/api/social-schedule',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('✅ Response from production:\n');
      console.log(JSON.stringify(result, null, 2));
      
      if (result.results && result.results.length > 0) {
        console.log('\n🎉 Check your X account for the post!');
      }
    } catch (error) {
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.end();
