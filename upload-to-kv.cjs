#!/usr/bin/env node

/**
 * Upload all credentials from .env to Cloudflare KV
 * KV Namespace: v2u-kv (ID: 3c40aed9e67b479eb28a271c547e43d4)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(__dirname, '..', '.env');
const KV_NAMESPACE_ID = '3c40aed9e67b479eb28a271c547e43d4';

console.log('📤 Uploading credentials to Cloudflare KV...\n');

// Read .env file
const envContent = fs.readFileSync(ENV_FILE, 'utf8');
const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

let uploaded = 0;
let skipped = 0;
let failed = 0;

for (const line of lines) {
  const match = line.match(/^([^=]+)=(.+)$/);
  if (!match) {
    skipped++;
    continue;
  }

  const [, key, value] = match;
  const cleanKey = key.trim();
  const cleanValue = value.trim().replace(/^["']|["']$/g, ''); // Remove quotes

  try {
    console.log(`  ⬆️  ${cleanKey}`);
    
    // Use wrangler to put key-value pair
    const command = `npx wrangler kv key put "${cleanKey}" "${cleanValue.replace(/"/g, '\\"')}" --namespace-id=${KV_NAMESPACE_ID}`;
    execSync(command, { 
      cwd: path.join(__dirname, '..', 'website'),
      stdio: 'pipe' 
    });
    
    uploaded++;
  } catch (error) {
    console.log(`  ❌ Failed: ${cleanKey}`);
    failed++;
  }
}

console.log(`\n✅ Upload complete!`);
console.log(`   Uploaded: ${uploaded}`);
console.log(`   Skipped: ${skipped}`);
console.log(`   Failed: ${failed}`);
console.log(`\n💡 Credentials are now stored in Cloudflare KV: v2u-kv`);
