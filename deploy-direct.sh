#!/bin/bash

# Cloudflare Pages 직접 배포 스크립트
# 사용법: ./deploy-direct.sh

set -e

PROJECT_NAME="superplace-academy"
ACCOUNT_ID="117379ce5c9d9af026b16c9cf21b10d5"
DIST_DIR="./dist"

echo "🚀 Cloudflare Pages 직접 배포 시작..."
echo ""

# 1. API 토큰 확인
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ CLOUDFLARE_API_TOKEN 환경 변수가 설정되지 않았습니다."
    echo ""
    echo "사용 방법:"
    echo "export CLOUDFLARE_API_TOKEN='your_token_here'"
    echo "./deploy-direct.sh"
    exit 1
fi

# 2. 빌드 확인
if [ ! -d "$DIST_DIR" ]; then
    echo "❌ dist 디렉토리가 없습니다. 먼저 빌드를 실행하세요:"
    echo "npm run build"
    exit 1
fi

echo "✅ 환경 확인 완료"
echo ""

# 3. Wrangler 배포
echo "📦 배포 중..."
npx wrangler pages deploy $DIST_DIR \
  --project-name=$PROJECT_NAME \
  --branch=production \
  --commit-dirty=true

echo ""
echo "✅ 배포 완료!"
echo ""
echo "확인 URL:"
echo "- 메인: https://superplace-academy.pages.dev/"
echo "- Production: https://production.superplace-academy.pages.dev/"
echo ""
echo "⏳ 배포가 완전히 적용되려면 2-3분 정도 소요됩니다."
