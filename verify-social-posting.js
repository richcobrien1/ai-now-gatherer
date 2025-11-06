#!/usr/bin/env node

/**
 * Social Posting Verification Script
 * Tests Twitter and LinkedIn authentication and posting capabilities
 */

const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

class SocialPostingVerifier {
  constructor() {
    this.results = {
      twitter: { configured: false, authenticated: false, error: null },
      linkedin: { configured: false, authenticated: false, error: null },
    };
  }

  log(color, message) {
    console.log(`${color}${message}${colors.reset}`);
  }

  /**
   * Check if Twitter is configured
   */
  checkTwitterConfig() {
    try {
      const configPath = path.join(__dirname, 'twitter-config.json');
      const tokensPath = path.join(__dirname, 'twitter-tokens.json');

      if (!fs.existsSync(configPath)) {
        this.results.twitter.error = 'Config file not found';
        return false;
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Check if config has actual values (not placeholders)
      if (!config.apiKey || config.apiKey.includes('YOUR_') || config.apiKey.length < 10) {
        this.results.twitter.error = 'API credentials not configured in twitter-config.json';
        return false;
      }

      this.results.twitter.configured = true;

      // Check tokens
      if (!fs.existsSync(tokensPath)) {
        this.results.twitter.error = 'Not authenticated - tokens file not found';
        return true;
      }

      const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
      
      if (!tokens.accessToken) {
        this.results.twitter.error = 'Invalid tokens - access token missing';
        return true;
      }

      // Check if token is expired
      const expiresAt = tokens.expiresAt || 0;
      const now = Date.now();
      const isExpired = now > expiresAt;

      if (isExpired) {
        const expiredDate = new Date(expiresAt).toLocaleString();
        this.results.twitter.error = `Token expired on ${expiredDate}`;
        return true;
      }

      this.results.twitter.authenticated = true;
      const expiresIn = Math.floor((expiresAt - now) / 1000 / 60);
      this.results.twitter.info = `Token valid for ${expiresIn} more minutes`;
      
      return true;

    } catch (error) {
      this.results.twitter.error = `Error: ${error.message}`;
      return false;
    }
  }

  /**
   * Check if LinkedIn is configured
   */
  checkLinkedInConfig() {
    try {
      const configPath = path.join(__dirname, 'linkedin-config.json');
      const tokensPath = path.join(__dirname, 'linkedin-tokens.json');

      if (!fs.existsSync(configPath)) {
        this.results.linkedin.error = 'Config file not found';
        return false;
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Check if config has actual values (not placeholders)
      if (!config.clientId || config.clientId.includes('YOUR_') || config.clientId.length < 10) {
        this.results.linkedin.error = 'App credentials not configured in linkedin-config.json';
        return false;
      }

      this.results.linkedin.configured = true;

      // Check tokens
      if (!fs.existsSync(tokensPath)) {
        this.results.linkedin.error = 'Not authenticated - tokens file not found';
        return true;
      }

      const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
      
      if (!tokens.accessToken) {
        this.results.linkedin.error = 'Invalid tokens - access token missing';
        return true;
      }

      // Check if token is expired (LinkedIn tokens last 60 days)
      const expiresAt = tokens.expiresAt || 0;
      const now = Date.now();
      const isExpired = now > expiresAt;

      if (isExpired) {
        const expiredDate = new Date(expiresAt).toLocaleString();
        this.results.linkedin.error = `Token expired on ${expiredDate}`;
        return true;
      }

      this.results.linkedin.authenticated = true;
      const expiresIn = Math.floor((expiresAt - now) / 1000 / 60 / 60 / 24);
      this.results.linkedin.info = `Token valid for ${expiresIn} more days`;
      
      return true;

    } catch (error) {
      this.results.linkedin.error = `Error: ${error.message}`;
      return false;
    }
  }

  /**
   * Print verification results
   */
  printResults() {
    console.log('\n' + '='.repeat(60));
    this.log(colors.cyan, '  SOCIAL POSTING VERIFICATION RESULTS');
    console.log('='.repeat(60) + '\n');

    // Twitter Status
    console.log('🐦 TWITTER / X');
    console.log('─'.repeat(60));
    
    if (this.results.twitter.configured) {
      this.log(colors.green, '  ✓ Configuration: Found');
    } else {
      this.log(colors.red, '  ✗ Configuration: Not found or invalid');
    }

    if (this.results.twitter.authenticated) {
      this.log(colors.green, '  ✓ Authentication: Active');
      if (this.results.twitter.info) {
        this.log(colors.blue, `    ${this.results.twitter.info}`);
      }
    } else {
      this.log(colors.yellow, '  ⚠ Authentication: Required');
    }

    if (this.results.twitter.error) {
      this.log(colors.yellow, `    ${this.results.twitter.error}`);
    }

    console.log();

    // LinkedIn Status
    console.log('💼 LINKEDIN');
    console.log('─'.repeat(60));
    
    if (this.results.linkedin.configured) {
      this.log(colors.green, '  ✓ Configuration: Found');
    } else {
      this.log(colors.red, '  ✗ Configuration: Not found or invalid');
    }

    if (this.results.linkedin.authenticated) {
      this.log(colors.green, '  ✓ Authentication: Active');
      if (this.results.linkedin.info) {
        this.log(colors.blue, `    ${this.results.linkedin.info}`);
      }
    } else {
      this.log(colors.yellow, '  ⚠ Authentication: Required');
    }

    if (this.results.linkedin.error) {
      this.log(colors.yellow, `    ${this.results.linkedin.error}`);
    }

    console.log('\n' + '='.repeat(60));
    
    // Next steps
    console.log();
    this.log(colors.cyan, 'NEXT STEPS:');
    console.log();

    if (!this.results.twitter.configured) {
      this.log(colors.yellow, '1. Configure Twitter:');
      console.log('   - Get OAuth 2.0 credentials from https://developer.twitter.com');
      console.log('   - Edit twitter-config.json with your Client ID and Secret');
      console.log();
    } else if (!this.results.twitter.authenticated) {
      this.log(colors.yellow, '1. Authenticate Twitter:');
      console.log('   - Run: node twitter-poster.cjs auth');
      console.log('   - Visit the URL shown and authorize the app');
      console.log('   - Complete the callback to save your tokens');
      console.log();
    }

    if (!this.results.linkedin.configured) {
      this.log(colors.yellow, '2. Configure LinkedIn:');
      console.log('   - Create an app at https://developer.linkedin.com');
      console.log('   - Edit linkedin-config.json with your Client ID and Secret');
      console.log();
    } else if (!this.results.linkedin.authenticated) {
      this.log(colors.yellow, '2. Authenticate LinkedIn:');
      console.log('   - Run: node linkedin-poster.js auth');
      console.log('   - Visit the URL shown and authorize the app');
      console.log('   - Complete the callback to save your tokens');
      console.log();
    }

    if (this.results.twitter.authenticated && this.results.linkedin.authenticated) {
      this.log(colors.green, '✓ All platforms ready!');
      console.log();
      this.log(colors.cyan, 'Test posting:');
      console.log('  - Twitter: node twitter-poster.cjs test');
      console.log('  - LinkedIn: node linkedin-poster.js test');
      console.log();
    }

    console.log('='.repeat(60) + '\n');
  }

  /**
   * Run verification
   */
  async verify() {
    this.log(colors.cyan, '\n🔍 Verifying social posting configuration...\n');

    this.checkTwitterConfig();
    this.checkLinkedInConfig();

    this.printResults();

    // Return status
    const allConfigured = this.results.twitter.configured && this.results.linkedin.configured;
    const allAuthenticated = this.results.twitter.authenticated && this.results.linkedin.authenticated;

    return {
      configured: allConfigured,
      authenticated: allAuthenticated,
      results: this.results,
    };
  }
}

// Run verification
if (require.main === module) {
  const verifier = new SocialPostingVerifier();
  verifier.verify().then(status => {
    if (status.configured && status.authenticated) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  });
}

module.exports = SocialPostingVerifier;
