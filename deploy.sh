#!/bin/bash
# Cloudflare 인증 정보 로드
if [ -f .wrangler-auth.json ]; then
  export CLOUDFLARE_API_TOKEN=$(jq -r '.api_token' .wrangler-auth.json)
  export CLOUDFLARE_ACCOUNT_ID=$(jq -r '.account_id // "117379ce5c9d9af026b16c9cf21b10d5"' .wrangler-auth.json)
fi

# 배포 실행
npx wrangler pages deploy dist --project-name=superplace-academy --branch=main
