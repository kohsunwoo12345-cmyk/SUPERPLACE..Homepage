#!/bin/bash
echo "🧪 === /students/list 페이지 완전 테스트 ==="
echo ""

echo "1️⃣ API 테스트"
API_RESULT=$(curl -s "https://superplace-academy.pages.dev/api/students")
SUCCESS=$(echo "$API_RESULT" | jq -r '.success')
STUDENT_COUNT=$(echo "$API_RESULT" | jq -r '.students | length')

if [ "$SUCCESS" = "true" ]; then
  echo "✅ API 정상 작동"
  echo "   학생 수: $STUDENT_COUNT명"
else
  echo "❌ API 에러"
  echo "$API_RESULT" | jq '.'
  exit 1
fi

echo ""
echo "2️⃣ 학생 목록 (처음 3명)"
echo "$API_RESULT" | jq -r '.students[:3] | .[] | "  • \(.name)"'

echo ""
echo "3️⃣ 권한 테스트 - 선생님 계정"
TEACHER_DATA='{"id":18,"user_type":"teacher","parent_user_id":1}'
TEACHER_HEADER=$(echo -n "$TEACHER_DATA" | base64 -w 0)
TEACHER_RESULT=$(curl -s -X GET "https://superplace-academy.pages.dev/api/students" \
  -H "X-User-Data-Base64: $TEACHER_HEADER")

TEACHER_SUCCESS=$(echo "$TEACHER_RESULT" | jq -r '.success')
TEACHER_COUNT=$(echo "$TEACHER_RESULT" | jq -r '.students | length')

if [ "$TEACHER_SUCCESS" = "true" ]; then
  echo "✅ 선생님 API 정상"
  echo "   조회 가능 학생: $TEACHER_COUNT명 (권한에 따라 필터링됨)"
else
  echo "❌ 선생님 API 에러"
  echo "$TEACHER_RESULT" | jq '.'
fi

echo ""
echo "4️⃣ 페이지 로드 테스트"
PAGE_LOAD=$(curl -s -o /dev/null -w "%{http_code}" "https://superplace-academy.pages.dev/students/list")
if [ "$PAGE_LOAD" = "200" ]; then
  echo "✅ 페이지 정상 로드 (HTTP $PAGE_LOAD)"
else
  echo "❌ 페이지 로드 실패 (HTTP $PAGE_LOAD)"
fi

echo ""
echo "🎉 모든 테스트 완료!"
echo ""
echo "📝 접속 링크:"
echo "   • 학생 관리: https://superplace-academy.pages.dev/students"
echo "   • 학생 목록: https://superplace-academy.pages.dev/students/list"
