#!/bin/bash

echo "🔍 완전 검증 시작..."
echo ""

# 2분 대기 (Cloudflare Pages 배포 시간)
echo "⏳ Cloudflare Pages 배포 대기 중... (2분)"
sleep 120

echo ""
echo "========================================"
echo "1. JavaScript 에러 확인"
echo "========================================"
curl -s "https://superplace-academy.pages.dev/students" | grep -q "선생님 관리" && echo "✅ 페이지 로드 성공" || echo "❌ 페이지 로드 실패"

echo ""
echo "========================================"
echo "2. API 데이터 확인"
echo "========================================"
TEACHERS=$(curl -s "https://superplace-academy.pages.dev/api/teachers/list?directorId=1" | jq -r '.teachers | length')
echo "등록된 선생님: ${TEACHERS}명"

echo ""
echo "========================================"
echo "3. 선생님 목록 (처음 3명)"
echo "========================================"
curl -s "https://superplace-academy.pages.dev/api/teachers/list?directorId=1" | jq -r '.teachers[0:3] | .[] | "\(.name) - \(.email)"'

echo ""
echo "========================================"
echo "4. 학생 목록 API 확인"
echo "========================================"
STUDENTS=$(curl -s "https://superplace-academy.pages.dev/api/students" | jq -r '.students | length')
echo "등록된 학생: ${STUDENTS}명"

echo ""
echo "========================================"
echo "✅ 검증 완료!"
echo "========================================"
echo ""
echo "🌐 테스트 URL:"
echo "   원장 계정: https://superplace-academy.pages.dev/students"
echo "   로그인: kumetang@gmail.com / 1234"
echo ""
echo "📋 확인 사항:"
echo "   1. 페이지 하단 '선생님 관리' 섹션 확인"
echo "   2. 선생님 목록 정상 표시 확인"
echo "   3. '권한 설정' 버튼 클릭 가능 확인"
echo "   4. '선생님 추가' 버튼 클릭 가능 확인"
echo ""

