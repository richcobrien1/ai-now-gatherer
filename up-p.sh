#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: ./up-p.sh <source-file-path>"
  exit 1
fi

# Load environment variables from both .env and .env.local
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs) 2>/dev/null || true
fi
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs) 2>/dev/null || true
fi
SRC=$(echo "$1" | sed 's#\\#/#g')
BASENAME=$(basename "$SRC")
SLUG=$(echo "$BASENAME" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9._-]+/-/g')
DATE=$(date +%Y/%m/%d)
KEY="$DATE/$SLUG"

AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
aws --endpoint-url "https://$CLOUDFLARE_ACCOUNT_ID.r2.cloudflarestorage.com" \
  s3 cp "$SRC" "s3://v2u-assets/private/$KEY" --acl private

echo "🔒 Uploaded to private://$KEY (use signed URL to access)"