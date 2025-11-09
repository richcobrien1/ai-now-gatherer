#!/bin/bash

# Twitter V2U Account Re-authentication Script
# Use this when you get 401 errors

echo "🐦 Twitter V2U Account Re-authentication"
echo "========================================"
echo ""
echo "This will help you get new access tokens for the V2U Twitter account."
echo ""

# Check if in news-collector directory
if [ ! -f "twitter-poster.cjs" ]; then
    echo "❌ Please run this from the news-collector directory"
    echo "   cd news-collector"
    echo "   ./refresh-twitter-v2u.sh"
    exit 1
fi

echo "📝 Steps:"
echo "1. Go to https://developer.twitter.com/en/portal/dashboard"
echo "2. Select your V2U app"
echo "3. Go to Keys and tokens tab"
echo "4. Regenerate Access Token & Secret"
echo "5. Copy the new tokens"
echo ""
echo "Then update these in your .env files:"
echo ""
echo "TWITTER_ACCESS_TOKEN_V2U=\"your-new-token\""
echo "TWITTER_ACCESS_SECRET_V2U=\"your-new-secret\""
echo ""
echo "Update in both:"
echo "  - /c/Users/richc/Projects/v2u/.env"
echo "  - /c/Users/richc/Projects/v2u/website/.env.local"
echo ""
echo "After updating, redeploy on Vercel!"
echo ""
read -p "Press Enter to open Twitter Developer Portal..."

# Try to open browser
if command -v cmd.exe &> /dev/null; then
    cmd.exe /c start https://developer.twitter.com/en/portal/dashboard
else
    echo "Please manually open: https://developer.twitter.com/en/portal/dashboard"
fi

echo ""
echo "✅ Done! Remember to update the tokens in both .env files and redeploy!"
