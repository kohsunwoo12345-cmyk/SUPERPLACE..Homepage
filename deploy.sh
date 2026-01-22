#!/bin/bash
set -e

# Read API token from auth file
API_TOKEN=$(cat .cloudflare-auth.json | grep api_token | cut -d'"' -f4)
ACCOUNT_ID="117379ce5c9d9af026b16c9cf21b10d5"
PROJECT_NAME="superplace-academy"

echo "Building project..."
npm run build

echo "Deploying to Cloudflare Pages..."
export CLOUDFLARE_API_TOKEN="$API_TOKEN"
export CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID"

npx wrangler pages deploy dist --project-name=$PROJECT_NAME --commit-dirty=true

echo "Deployment complete!"
