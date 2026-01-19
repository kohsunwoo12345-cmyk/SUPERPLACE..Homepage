#!/bin/bash

# Cloudflare 계정 정보
ACCOUNT_ID="9b3c0b6f3a8eedd2c0796ab41519fc43"
PROJECT_NAME="superplace-academy"
API_TOKEN=$(cat .cloudflare-api-key)

echo "🚀 Starting direct deployment to Cloudflare Pages..."
echo "📦 Project: $PROJECT_NAME"
echo "🔑 Using API token"

# dist 디렉토리를 tar.gz로 압축
echo "📦 Creating deployment package..."
cd dist
tar -czf ../deploy.tar.gz .
cd ..

echo "📤 Uploading to Cloudflare Pages..."

# Cloudflare Pages API를 사용하여 배포
RESPONSE=$(curl -X POST \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME/deployments" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --form 'manifest={"/":{"/":{"id":"index.html"}}}' \
  --form 'file=@deploy.tar.gz')

echo "📥 Response: $RESPONSE"

# 정리
rm -f deploy.tar.gz

echo "✅ Deployment complete!"
