#!/usr/bin/env node

/**
 * Cross-Platform Reposter for AI-Now
 * Automates reposting from Level 1 platforms (YouTube, Rumble, Spotify) 
 * to Level 2 social networks (Facebook, Instagram, LinkedIn, X/Twitter, TikTok)
 */

const fs = require('fs');
const path = require('path');
const TwitterPoster = require('./twitter-poster');
const LinkedInPoster = require('./linkedin-poster');
const FacebookPoster = require('./facebook-poster');

// Import future social media posters
// const InstagramPoster = require('./instagram-poster');
// const TikTokPoster = require('./tiktok-poster');

class CrossPlatformReposter {
  constructor() {
    this.twitter = new TwitterPoster();
    this.linkedin = new LinkedInPoster();
    this.facebook = new FacebookPoster();
    // this.instagram = new InstagramPoster();
    // this.tiktok = new TikTokPoster();
    
    this.level1Platforms = ['youtube', 'rumble', 'spotify'];
    this.level2Platforms = ['twitter', 'linkedin', 'facebook', 'instagram', 'tiktok'];
    
    this.config = this.loadConfiguration();
  }

  /**
   * Load cross-platform configuration
   */
  loadConfiguration() {
    const configPath = path.join(__dirname, 'cross-platform-config.json');
    
    if (!fs.existsSync(configPath)) {
      console.log('📁 Creating default cross-platform configuration...');
      const defaultConfig = {
        automation: {
          enabled: true,
          checkInterval: 300000, // 5 minutes
          autoPost: false, // Safety: require manual approval initially
          platforms: {
            twitter: { enabled: true, delay: 0 },
            linkedin: { enabled: true, delay: 60000 }, // 1 min delay
            facebook: { enabled: false, delay: 120000 }, // 2 min delay
            instagram: { enabled: false, delay: 180000 }, // 3 min delay
            tiktok: { enabled: false, delay: 240000 } // 4 min delay
          }
        },
        contentRules: {
          youtube: {
            repostTo: ['twitter', 'linkedin', 'facebook'],
            titlePrefix: '🎥 New Video:',
            includeLink: true,
            maxLength: {
              twitter: 280,
              linkedin: 3000,
              facebook: 63206
            }
          },
          rumble: {
            repostTo: ['twitter', 'linkedin'],
            titlePrefix: '🎬 Watch on Rumble:',
            includeLink: true
          },
          spotify: {
            repostTo: ['twitter', 'linkedin'],
            titlePrefix: '🎧 New Podcast:',
            includeLink: true
          }
        },
        brandSettings: {
          'ai-now': {
            hashtags: ['#AINow', '#TechTrends', '#DigitalTransformation'],
            tone: 'professional'
          },
          'ai-now-educate': {
            hashtags: ['#AIEducation', '#ProfessionalDevelopment', '#Learning'],
            tone: 'educational'
          },
          'ai-now-commercial': {
            hashtags: ['#AICommercial', '#BusinessIntelligence', '#EnterpriseAI'],
            tone: 'business'
          },
          'ai-now-conceptual': {
            hashtags: ['#AIResearch', '#FutureOfWork', '#EmergingTech'],
            tone: 'technical'
          }
        }
      };
      
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      console.log('✅ Default configuration created at cross-platform-config.json');
    }
    
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  /**
   * Main automation entry point
   */
  async startAutomation() {
    console.log('🤖 Starting Cross-Platform Reposter Automation');
    console.log('===============================================');
    
    if (!this.config.automation.enabled) {
      console.log('⏸️  Automation is disabled in configuration');
      return;
    }

    // Initialize all available platforms
    await this.initializePlatforms();
    
    console.log(`🔄 Monitoring every ${this.config.automation.checkInterval / 1000} seconds`);
    console.log(`🛡️  Auto-posting: ${this.config.automation.autoPost ? 'ENABLED' : 'DISABLED (manual approval required)'}`);
    
    // Start monitoring loop
    this.monitoringLoop();
  }

  /**
   * Initialize social media platform clients
   */
  async initializePlatforms() {
    console.log('🔌 Initializing social media platforms...');
    
    // Initialize Twitter
    if (this.config.automation.platforms.twitter.enabled) {
      try {
        await this.twitter.initialize();
        console.log('✅ Twitter initialized');
      } catch (error) {
        console.log('⚠️  Twitter initialization failed:', error.message);
      }
    }
    
    // Initialize LinkedIn
    if (this.config.automation.platforms.linkedin.enabled) {
      try {
        await this.linkedin.initialize();
        console.log('✅ LinkedIn initialized');
      } catch (error) {
        console.log('⚠️  LinkedIn initialization failed:', error.message);
      }
    }
    
    // Initialize Facebook
    if (this.config.automation.platforms.facebook.enabled) {
      try {
        await this.facebook.initialize();
        console.log('✅ Facebook initialized');
      } catch (error) {
        console.log('⚠️  Facebook initialization failed:', error.message);
      }
    }
  }

  /**
   * Main monitoring loop
   */
  async monitoringLoop() {
    while (true) {
      try {
        console.log(`🔍 [${new Date().toISOString()}] Checking for new content...`);
        
        // Check each Level 1 platform for new content
        for (const platform of this.level1Platforms) {
          await this.checkPlatformForNewContent(platform);
        }
        
        // Wait for next check
        await this.sleep(this.config.automation.checkInterval);
        
      } catch (error) {
        console.error('❌ Error in monitoring loop:', error.message);
        await this.sleep(60000); // Wait 1 minute before retrying
      }
    }
  }

  /**
   * Check a specific Level 1 platform for new content
   */
  async checkPlatformForNewContent(platform) {
    switch (platform) {
      case 'youtube':
        return await this.checkYouTubeContent();
      case 'rumble':
        return await this.checkRumbleContent();
      case 'spotify':
        return await this.checkSpotifyContent();
      default:
        console.log(`⚠️  Unknown platform: ${platform}`);
    }
  }

  /**
   * YouTube content monitoring
   */
  async checkYouTubeContent() {
    console.log('🎥 Checking YouTube for new uploads...');
    
    // In a real implementation, this would:
    // 1. Use YouTube Data API to check latest uploads
    // 2. Compare with last processed video ID stored in state
    // 3. If new video found, extract metadata and trigger reposts
    
    // For now, this is a placeholder for manual triggering
    console.log('📝 YouTube monitoring: Manual trigger mode');
    console.log('💡 Use: node cross-platform-reposter.js repost youtube <video-url> <metadata>');
  }

  /**
   * Rumble content monitoring
   */
  async checkRumbleContent() {
    console.log('🎬 Checking Rumble for new uploads...');
    
    // Rumble doesn't have a public API, so this would require:
    // 1. Web scraping or RSS feed monitoring
    // 2. Webhook integration if available
    // 3. Manual notification system
    
    console.log('📝 Rumble monitoring: Manual trigger mode');
    console.log('💡 Use: node cross-platform-reposter.js repost rumble <video-url> <metadata>');
  }

  /**
   * Spotify content monitoring
   */
  async checkSpotifyContent() {
    console.log('🎧 Checking Spotify for new episodes...');
    
    // Spotify Web API could be used to:
    // 1. Monitor show's latest episodes
    // 2. Check episode publication dates
    // 3. Trigger reposts for new episodes
    
    console.log('📝 Spotify monitoring: Manual trigger mode');
    console.log('💡 Use: node cross-platform-reposter.js repost spotify <episode-url> <metadata>');
  }

  /**
   * Manually trigger a repost from Level 1 to Level 2 platforms
   */
  async repostContent(sourcePlatform, sourceUrl, metadata) {
    console.log(`📤 Reposting content from ${sourcePlatform.toUpperCase()}`);
    console.log(`🔗 Source: ${sourceUrl}`);
    console.log(`📋 Title: ${metadata.title}`);
    
    const contentRules = this.config.contentRules[sourcePlatform];
    if (!contentRules) {
      throw new Error(`No content rules defined for ${sourcePlatform}`);
    }
    
    const results = [];
    
    // Post to each configured Level 2 platform
    for (const targetPlatform of contentRules.repostTo) {
      const platformConfig = this.config.automation.platforms[targetPlatform];
      
      if (!platformConfig || !platformConfig.enabled) {
        console.log(`⏭️  Skipping ${targetPlatform} (disabled)`);
        continue;
      }
      
      try {
        console.log(`📤 Posting to ${targetPlatform.toUpperCase()}...`);
        
        // Generate platform-specific content
        const adaptedContent = this.adaptContentForPlatform(
          metadata, 
          sourcePlatform, 
          targetPlatform, 
          sourceUrl
        );
        
        // Check if auto-posting is enabled or requires approval
        if (!this.config.automation.autoPost) {
          console.log(`⏸️  Auto-posting disabled. Generated content for ${targetPlatform}:`);
          console.log('---');
          console.log(adaptedContent.text);
          console.log('---');
          console.log('💡 Enable auto-posting in config or use --force flag to post immediately');
          continue;
        }
        
        // Apply delay if configured
        if (platformConfig.delay > 0) {
          console.log(`⏱️  Waiting ${platformConfig.delay / 1000} seconds before posting to ${targetPlatform}...`);
          await this.sleep(platformConfig.delay);
        }
        
        // Post to platform
        const result = await this.postToPlatform(targetPlatform, adaptedContent, metadata);
        results.push({ platform: targetPlatform, success: true, result });
        
        console.log(`✅ Successfully posted to ${targetPlatform.toUpperCase()}`);
        
      } catch (error) {
        console.error(`❌ Failed to post to ${targetPlatform}:`, error.message);
        results.push({ platform: targetPlatform, success: false, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Adapt content for specific social media platform
   */
  adaptContentForPlatform(metadata, sourcePlatform, targetPlatform, sourceUrl) {
    const contentRules = this.config.contentRules[sourcePlatform];
    const brandSettings = this.config.brandSettings[metadata.brand] || this.config.brandSettings['ai-now'];
    
    let content = {
      text: '',
      hashtags: [...brandSettings.hashtags],
      link: sourceUrl
    };
    
    // Platform-specific adaptations
    switch (targetPlatform) {
      case 'twitter':
        content = this.adaptForTwitter(metadata, contentRules, brandSettings, sourceUrl);
        break;
        
      case 'linkedin':
        content = this.adaptForLinkedIn(metadata, contentRules, brandSettings, sourceUrl);
        break;
        
      case 'facebook':
        content = this.adaptForFacebook(metadata, contentRules, brandSettings, sourceUrl);
        break;
        
      case 'instagram':
        content = this.adaptForInstagram(metadata, contentRules, brandSettings, sourceUrl);
        break;
        
      case 'tiktok':
        content = this.adaptForTikTok(metadata, contentRules, brandSettings, sourceUrl);
        break;
    }
    
    return content;
  }

  /**
   * Adapt content for Twitter
   */
  adaptForTwitter(metadata, contentRules, brandSettings, sourceUrl) {
    const maxLength = contentRules.maxLength?.twitter || 280;
    
    let text = `${contentRules.titlePrefix} ${metadata.title}\n\n`;
    
    // Add description excerpt
    if (metadata.description) {
      const excerpt = metadata.description.substring(0, 100);
      text += `${excerpt}...\n\n`;
    }
    
    // Add link
    if (contentRules.includeLink) {
      text += `🔗 ${sourceUrl}\n\n`;
    }
    
    // Add hashtags
    text += brandSettings.hashtags.slice(0, 3).join(' ');
    
    // Ensure within character limit
    if (text.length > maxLength) {
      text = text.substring(0, maxLength - 3) + '...';
    }
    
    return { text, hashtags: brandSettings.hashtags, link: sourceUrl };
  }

  /**
   * Adapt content for LinkedIn
   */
  adaptForLinkedIn(metadata, contentRules, brandSettings, sourceUrl) {
    const maxLength = contentRules.maxLength?.linkedin || 3000;
    
    let text = `${contentRules.titlePrefix} ${metadata.title}\n\n`;
    
    // Add full description for LinkedIn (professional platform)
    if (metadata.description) {
      text += `${metadata.description}\n\n`;
    }
    
    // Add professional context
    switch (brandSettings.tone) {
      case 'educational':
        text += `📚 This episode covers essential concepts for professionals looking to understand AI's impact on their industry.\n\n`;
        break;
      case 'business':
        text += `💼 Insights for business leaders navigating AI transformation and enterprise implementation.\n\n`;
        break;
      case 'technical':
        text += `🔬 Deep technical analysis for researchers and AI practitioners.\n\n`;
        break;
      default:
        text += `🚀 Stay ahead of the curve with the latest AI developments and trends.\n\n`;
    }
    
    // Add link
    if (contentRules.includeLink) {
      text += `Watch the full episode: ${sourceUrl}\n\n`;
    }
    
    // Add professional hashtags
    text += brandSettings.hashtags.join(' ');
    text += ' #AI #ArtificialIntelligence #Technology #Innovation #ProfessionalDevelopment';
    
    // Ensure within character limit
    if (text.length > maxLength) {
      text = text.substring(0, maxLength - 3) + '...';
    }
    
    return { text, hashtags: brandSettings.hashtags, link: sourceUrl };
  }

  /**
   * Adapt content for Facebook (placeholder)
   */
  adaptForFacebook(metadata, contentRules, brandSettings, sourceUrl) {
    // Facebook allows longer content, more casual tone
    let text = `${contentRules.titlePrefix} ${metadata.title}\n\n`;
    text += `${metadata.description}\n\n`;
    text += `Check it out: ${sourceUrl}\n\n`;
    text += brandSettings.hashtags.join(' ');
    
    return { text, hashtags: brandSettings.hashtags, link: sourceUrl };
  }

  /**
   * Adapt content for Instagram (placeholder)
   */
  adaptForInstagram(metadata, contentRules, brandSettings, sourceUrl) {
    // Instagram is more visual, shorter text
    let text = `${metadata.title}\n\n`;
    text += `Link in bio! 👆\n\n`;
    text += brandSettings.hashtags.slice(0, 10).join(' '); // Instagram hashtag limits
    
    return { text, hashtags: brandSettings.hashtags, link: sourceUrl };
  }

  /**
   * Adapt content for TikTok (placeholder)
   */
  adaptForTikTok(metadata, contentRules, brandSettings, sourceUrl) {
    // TikTok is very short, hashtag-focused
    let text = `${metadata.title}\n\n`;
    text += brandSettings.hashtags.slice(0, 5).join(' ');
    
    return { text, hashtags: brandSettings.hashtags, link: sourceUrl };
  }

  /**
   * Post content to specific platform
   */
  async postToPlatform(platform, content, metadata) {
    switch (platform) {
      case 'twitter':
        return await this.twitter.postVideoTweet(metadata, content.link);
        
      case 'linkedin':
        return await this.linkedin.postToLinkedIn(metadata, content.link);
        
      case 'facebook':
        return await this.facebook.postToFacebook(metadata, content.link);
        
      case 'instagram':
        // return await this.instagram.postContent(content);
        console.log('📝 Instagram posting: Coming soon');
        break;
        
      case 'tiktok':
        // return await this.tiktok.postContent(content);
        console.log('📝 TikTok posting: Coming soon');
        break;
        
      default:
        throw new Error(`Unknown platform: ${platform}`);
    }
  }

  /**
   * Utility: Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get reposting status and statistics
   */
  async getStatus() {
    console.log('📊 Cross-Platform Reposter Status');
    console.log('=================================');
    
    console.log(`🔧 Configuration: ${this.config.automation.enabled ? 'ENABLED' : 'DISABLED'}`);
    console.log(`🤖 Auto-posting: ${this.config.automation.autoPost ? 'ENABLED' : 'DISABLED'}`);
    console.log(`⏱️  Check interval: ${this.config.automation.checkInterval / 1000} seconds`);
    
    console.log('\n📱 Platform Status:');
    for (const [platform, config] of Object.entries(this.config.automation.platforms)) {
      const status = config.enabled ? '✅ ENABLED' : '❌ DISABLED';
      const delay = config.delay ? ` (${config.delay / 1000}s delay)` : '';
      console.log(`  ${platform.toUpperCase()}: ${status}${delay}`);
    }
    
    console.log('\n🎯 Level 1 → Level 2 Mapping:');
    for (const [source, rules] of Object.entries(this.config.contentRules)) {
      console.log(`  ${source.toUpperCase()} → ${rules.repostTo.join(', ').toUpperCase()}`);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const reposter = new CrossPlatformReposter();

  if (args.length === 0) {
    console.log('AI-Now Cross-Platform Reposter');
    console.log('===============================');
    console.log('');
    console.log('Commands:');
    console.log('  start                                     - Start automation monitoring');
    console.log('  status                                    - Show current status');
    console.log('  repost <platform> <url> <metadata-json>  - Manually trigger repost');
    console.log('  test <platform>                          - Test platform connection');
    console.log('');
    console.log('Examples:');
    console.log('  node cross-platform-reposter.js start');
    console.log('  node cross-platform-reposter.js status');
    console.log('  node cross-platform-reposter.js repost youtube "https://youtube.com/watch?v=123" \'{"title":"AI Episode","description":"Latest AI news","brand":"ai-now"}\'');
    console.log('');
    console.log('Level 1 Platforms: YouTube, Rumble, Spotify');
    console.log('Level 2 Platforms: Twitter, LinkedIn, Facebook, Instagram, TikTok');
    return;
  }

  const command = args[0];

  try {
    switch (command) {
      case 'start':
        await reposter.startAutomation();
        break;

      case 'status':
        await reposter.getStatus();
        break;

      case 'repost':
        if (args.length < 4) {
          console.error('❌ Usage: repost <platform> <url> <metadata-json>');
          process.exit(1);
        }

        const platform = args[1];
        const url = args[2];
        const metadata = JSON.parse(args[3]);
        
        const results = await reposter.repostContent(platform, url, metadata);
        
        console.log('\n📊 Reposting Results:');
        for (const result of results) {
          const status = result.success ? '✅' : '❌';
          console.log(`  ${status} ${result.platform.toUpperCase()}: ${result.success ? 'Posted successfully' : result.error}`);
        }
        break;

      case 'test':
        if (args.length < 2) {
          console.error('❌ Usage: test <platform>');
          process.exit(1);
        }

        const testPlatform = args[1];
        await reposter.initializePlatforms();
        
        switch (testPlatform) {
          case 'twitter':
            await reposter.twitter.testConnection();
            break;
          case 'linkedin':
            await reposter.linkedin.testConnection();
            break;
          case 'facebook':
            await reposter.facebook.testConnection();
            break;
          default:
            console.error(`❌ Unknown platform: ${testPlatform}`);
            process.exit(1);
        }
        break;

      default:
        console.error('❌ Unknown command:', command);
        process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = CrossPlatformReposter;