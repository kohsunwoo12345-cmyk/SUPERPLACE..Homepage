#!/bin/bash
echo "🧪 선생님 페이지 테스트"
echo ""

echo "1️⃣ /teachers 리다이렉트 확인"
REDIRECT=$(curl -s -I "https://superplace-academy.pages.dev/teachers" | grep -i location)
echo "$REDIRECT"

echo ""
echo "2️⃣ /students 페이지에서 선생님 관리 확인"
STUDENTS_PAGE=$(curl -s "https://superplace-academy.pages.dev/students" | grep -c "선생님 관리")
echo "선생님 관리 섹션: $STUDENTS_PAGE개 발견"

echo ""
echo "3️⃣ 선생님 목록 API 테스트"
API_RESULT=$(curl -s "https://superplace-academy.pages.dev/api/teachers/list?directorId=1")
TEACHER_COUNT=$(echo "$API_RESULT" | jq -r '.teachers | length')
echo "등록된 선생님 수: $TEACHER_COUNT명"

echo ""
echo "4️⃣ 선생님 목록 (처음 3명)"
echo "$API_RESULT" | jq -r '.teachers[:3] | .[] | "  • \(.name) - \(.email)"'

echo ""
echo "✅ 테스트 완료"
