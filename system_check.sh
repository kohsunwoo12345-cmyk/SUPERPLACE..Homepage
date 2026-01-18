#!/bin/bash
echo "=== 전체 시스템 진단 시작 ==="
echo ""

echo "1️⃣ 반 목록 API 테스트"
echo "URL: /api/classes/list?userId=1&userType=director"
curl -s "https://superplace-academy.pages.dev/api/classes/list?userId=1&userType=director" | jq '.'
echo ""

echo "2️⃣ 샘플 반 생성 API 테스트"
echo "URL: POST /api/admin/init-sample-classes"
curl -s -X POST "https://superplace-academy.pages.dev/api/admin/init-sample-classes" \
  -H "Content-Type: application/json" \
  -d '{"userId":1}' | jq '.'
echo ""

echo "3️⃣ 반 목록 재확인"
curl -s "https://superplace-academy.pages.dev/api/classes/list?userId=1&userType=director" | jq '.'
echo ""

echo "4️⃣ /students 페이지 HTML 확인 (showTeacherPermissions 함수)"
curl -s "https://superplace-academy.pages.dev/students" | grep -c "function showTeacherPermissions"
echo "함수 발견됨"
echo ""

echo "5️⃣ 권한 시스템 스크립트 확인"
curl -s "https://superplace-academy.pages.dev/students" | grep -c "PermissionSystem"
echo "통합 권한 시스템 발견 여부"
echo ""

echo "=== 진단 완료 ==="
