#!/bin/bash
set -e

echo "========================================="
echo "슈퍼플레이스 배포 스크립트"
echo "========================================="

# 1. 클린 빌드
echo ""
echo "1️⃣ 기존 빌드 삭제 중..."
rm -rf dist
rm -rf node_modules/.vite

echo ""
echo "2️⃣ 새로운 빌드 시작..."
npm run build

echo ""
echo "3️⃣ 정적 파일 복사..."
cp -r public/* dist/

echo ""
echo "4️⃣ 빌드 검증..."
echo "   - loadDeposits: $(grep -c 'loadDeposits' dist/_worker.js || echo 0)"
echo "   - submitDeposit: $(grep -c 'submitDeposit' dist/_worker.js || echo 0)"
echo "   - 파일 크기: $(ls -lh dist/_worker.js | awk '{print $5}')"

echo ""
echo "5️⃣ 배포 ID 추가..."
echo "// DEPLOY_$(date +%Y%m%d_%H%M%S)" >> dist/_worker.js

echo ""
echo "✅ 빌드 완료!"
echo ""
echo "다음 명령으로 배포하세요:"
echo "  npx wrangler pages deploy dist --project-name=superplace-academy"
echo ""
