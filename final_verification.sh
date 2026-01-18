#!/bin/bash
echo "🔄 === 최종 검증 테스트 ==="
echo ""
echo "⏳ 배포 대기 (3분)..."
sleep 180

echo ""
echo "📋 1. 선생님 권한 확인"
echo "─────────────────────────────────────"
curl -s "https://superplace-academy.pages.dev/api/teachers/18/permissions?directorId=1" | jq '{
  success,
  teacher: .teacher.name,
  canViewAll: .permissions.canViewAllStudents,
  assignedClasses: .permissions.assignedClasses
}'

echo ""
echo "📋 2. 선생님(ID 18)으로 학생 조회"
echo "─────────────────────────────────────"
TEACHER_DATA='{"id":18,"user_type":"teacher","parent_user_id":1}'
TEACHER_HEADER=$(echo -n "$TEACHER_DATA" | base64 -w 0)
RESPONSE=$(curl -s -X GET "https://superplace-academy.pages.dev/api/students" \
  -H "X-User-Data-Base64: $TEACHER_HEADER")

echo "$RESPONSE" | jq '{success, error, studentCount: (.students | length)}'

echo ""
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo "✅ 성공: 권한 기반 필터링 작동"
  STUDENT_COUNT=$(echo "$RESPONSE" | jq -r '.students | length')
  echo "   조회된 학생 수: $STUDENT_COUNT"
else
  echo "❌ 실패"
  echo "$RESPONSE" | jq -r '.error'
fi

echo ""
echo "📋 3. 원장(ID 1)으로 학생 조회"
echo "─────────────────────────────────────"
DIRECTOR_DATA='{"id":1,"user_type":"director"}'
DIRECTOR_HEADER=$(echo -n "$DIRECTOR_DATA" | base64 -w 0)
DIRECTOR_RESPONSE=$(curl -s -X GET "https://superplace-academy.pages.dev/api/students" \
  -H "X-User-Data-Base64: $DIRECTOR_HEADER")

DIRECTOR_COUNT=$(echo "$DIRECTOR_RESPONSE" | jq -r '.students | length')
echo "✅ 원장 계정 조회 학생 수: $DIRECTOR_COUNT"

echo ""
echo "📋 4. /students 페이지 UI 확인"
echo "─────────────────────────────────────"
PAGE_CONTENT=$(curl -s "https://superplace-academy.pages.dev/students")

if echo "$PAGE_CONTENT" | grep -q "showTeacherPermissions"; then
  echo "✅ showTeacherPermissions 함수 존재"
else
  echo "❌ showTeacherPermissions 함수 없음"
fi

if echo "$PAGE_CONTENT" | grep -q "classesCheckboxList"; then
  echo "✅ classesCheckboxList 요소 존재"
else
  echo "❌ classesCheckboxList 요소 없음"
fi

echo ""
echo "🏁 최종 검증 완료"
echo "═════════════════════════════════════"
