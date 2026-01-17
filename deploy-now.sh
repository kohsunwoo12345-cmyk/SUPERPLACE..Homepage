#!/bin/bash
set -e

echo "🚀 배포 시작"

# 1. 완전히 새로 빌드
echo "📦 빌드 중..."
rm -rf dist node_modules/.vite
npm run build

# 2. 정적 파일 복사
echo "📁 정적 파일 복사..."
cp -r public/* dist/

# 3. 빌드 검증
echo "✅ 빌드 검증..."
TEACHERS_COUNT=$(grep -o "/teachers" dist/_worker.js | wc -l)
echo "  - /teachers 경로: ${TEACHERS_COUNT}개"

if [ "$TEACHERS_COUNT" -lt 3 ]; then
    echo "❌ 빌드 검증 실패: teachers 라우트가 없습니다"
    exit 1
fi

# 4. 배포 마커 추가
DEPLOY_ID="DEPLOY_$(date +%Y%m%d_%H%M%S)"
echo "// ${DEPLOY_ID}" >> dist/_worker.js
echo "  - 배포 ID: ${DEPLOY_ID}"

# 5. Git 커밋 및 푸시
echo "📤 Git 푸시..."
git add -A
git commit -m "deploy: ${DEPLOY_ID} - Teachers page deployment" || echo "No changes to commit"
git push origin main

echo "✅ 배포 완료!"
echo "   배포 ID: ${DEPLOY_ID}"
echo "   대기: 120초 후 자동으로 Cloudflare가 배포합니다"
