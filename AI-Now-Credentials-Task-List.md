# 🔐 AI-Now Automation Credentials Setup

## 📋 **Credentials Task List**

### ✅ **COMPLETED - Cloudflare R2 Storage**
**Status:** ✅ Configured
**Location:** `.env.local`
**Required for:** Video uploads to Cloudflare R2

**Current Configuration:**
```bash
CLOUDFLARE_ACCOUNT_ID=d54e57481e824e8752d0f6caa9b37ba7
R2_ACCESS_KEY_ID=40af54e851e0ea91f09da3a40a61fd52
R2_SECRET_ACCESS_KEY=cdc37ba3e8ac44e8dc724fd3e6dadcd2e3d8e5d5db0deffc7450f6041ff23742
```

**Setup Steps:** (Already Done)
- [x] Create Cloudflare account
- [x] Set up R2 bucket (v2u-assets)
- [x] Generate API tokens
- [x] Configure environment variables

---

### ⚠️ **OPTIONAL - Twitter API (X)**
**Status:** 🔄 Not Configured (Placeholders present)
**Location:** `twitter-config.json`
**Required for:** Automated Twitter posting

**Current Configuration:**
```json
{
  "apiKey": "YOUR_TWITTER_API_KEY",
  "apiSecret": "YOUR_TWITTER_API_SECRET",
  "accessToken": "YOUR_TWITTER_ACCESS_TOKEN",
  "accessTokenSecret": "YOUR_TWITTER_ACCESS_TOKEN_SECRET"
}
```

**Setup Steps:**
- [ ] Go to https://developer.twitter.com/
- [ ] Create a new app or use existing
- [ ] Get API Key and API Key Secret
- [ ] Generate Access Token and Access Token Secret
- [ ] Run `./setup-twitter.sh`
- [ ] Edit `twitter-config.json` with real credentials
- [ ] Run `node twitter-poster.js auth` to test
- [ ] Run `node twitter-poster.js test` to verify

**Permissions Needed:**
- [ ] Read and write access
- [ ] OAuth 1.0a authentication

---

### ⚠️ **OPTIONAL - LinkedIn API**
**Status:** 🔄 Not Configured (Placeholders present)
**Location:** `linkedin-config.json`
**Required for:** Automated LinkedIn posting

**Current Configuration:**
```json
{
  "clientId": "YOUR_LINKEDIN_CLIENT_ID",
  "clientSecret": "YOUR_LINKEDIN_CLIENT_SECRET",
  "redirectUri": "http://localhost:3003/callback"
}
```

**Setup Steps:**
- [ ] Go to https://developer.linkedin.com/
- [ ] Create a new app or use existing
- [ ] Get Client ID and Client Secret
- [ ] Add redirect URI: `http://localhost:3003/callback`
- [ ] Run `./setup-linkedin.sh`
- [ ] Edit `linkedin-config.json` with real credentials
- [ ] Run `node linkedin-poster.js auth` to authenticate
- [ ] Run `node linkedin-poster.js test` to verify

**Permissions Needed:**
- [ ] `w_member_social` (Write member social)
- [ ] `r_liteprofile` (Read lite profile)

---

### ❌ **BLOCKED - YouTube API**
**Status:** ❌ Blocked by Google Verification
**Location:** `youtube-credentials.json` (template exists)
**Required for:** Full YouTube API automation

**Current Status:**
- Google requires app verification for `youtube.upload` scope
- App is currently in "Testing" mode only
- Cannot be used for production automation

**Workaround:** Browser automation works ✅

**Setup Steps (When Google Approves):**
- [ ] Wait for Google OAuth consent screen approval
- [ ] Or add approved test users in Google Cloud Console
- [ ] Get Client ID and Client Secret
- [ ] Run `./setup-youtube.sh`
- [ ] Edit `youtube-credentials.json`
- [ ] Update playlist IDs in config

---

## 🎯 **Priority Setup Order**

### **HIGH PRIORITY (Required for Basic Operation)**
1. ✅ **Cloudflare R2** - Already configured
2. ❌ **YouTube API** - Blocked, use browser automation instead

### **MEDIUM PRIORITY (Optional Enhancements)**
3. ⚠️ **Twitter API** - For automated Twitter posting
4. ⚠️ **LinkedIn API** - For automated LinkedIn posting

---

## 🔧 **Testing Commands**

After configuring each service, test with:

```bash
# Test Twitter
node twitter-poster.js test

# Test LinkedIn
node linkedin-poster.js test

# Test complete workflow (will skip unconfigured services)
./complete-workflow.sh "processed/test-video.mp4" premium ai-now --twitter --linkedin
```

---

## 📊 **Current System Status**

| Service | Status | Configured | Working |
|---------|--------|------------|---------|
| Cloudflare R2 | ✅ Complete | ✅ Yes | ✅ Yes |
| YouTube (Browser) | ✅ Complete | ✅ Yes | ✅ Yes |
| Twitter API | ⚠️ Optional | ❌ No | ⚠️ Skipped |
| LinkedIn API | ⚠️ Optional | ❌ No | ⚠️ Skipped |
| YouTube API | ❌ Blocked | ❌ No | ❌ N/A |

---

## 🚀 **Quick Setup Commands**

```bash
# Twitter Setup
./setup-twitter.sh
# Edit twitter-config.json
node twitter-poster.js auth
node twitter-poster.js test

# LinkedIn Setup
./setup-linkedin.sh
# Edit linkedin-config.json
node linkedin-poster.js auth
node linkedin-poster.js test

# Test Everything
./complete-workflow.sh "video.mp4" premium ai-now --auto-upload --twitter --linkedin
```

---

## 💡 **Notes**

- **R2 credentials are required** for video uploads
- **Social media credentials are optional** - system works without them
- **YouTube API is blocked** by Google verification requirements
- **Browser automation works** as YouTube API replacement
- **System handles missing credentials gracefully** with helpful messages

---

*Generated on: October 9, 2025*
*AI-Now Automation System v1.0*</content>
<parameter name="filePath">c:\Users\richc\Projects\v2u\ai-now-gatherer\AI-Now-Credentials-Task-List.md