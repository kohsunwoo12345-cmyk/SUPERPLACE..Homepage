#!/bin/bash
echo "🚀 === 궁극의 테스트 ==="
echo ""
echo "⏳ 배포 대기 (3분)..."
sleep 180

echo ""
echo "═══════════════════════════════════════"
echo "1️⃣ 선생님(ID 18) 권한 확인"
echo "═══════════════════════════════════════"
PERM_RESPONSE=$(curl -s "https://superplace-academy.pages.dev/api/teachers/18/permissions?directorId=1")
echo "$PERM_RESPONSE" | jq '{
  teacher: .teacher.name,
  canViewAll: .permissions.canViewAllStudents,
  assignedClasses: .permissions.assignedClasses
}'

echo ""
echo "═══════════════════════════════════════"
echo "2️⃣ 선생님(ID 18)으로 학생 조회"
echo "═══════════════════════════════════════"
TEACHER_DATA='{"id":18,"user_type":"teacher","parent_user_id":1}'
TEACHER_HEADER=$(echo -n "$TEACHER_DATA" | base64 -w 0)
TEACHER_RESPONSE=$(curl -s -X GET "https://superplace-academy.pages.dev/api/students" \
  -H "X-User-Data-Base64: $TEACHER_HEADER")

if echo "$TEACHER_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo "✅ 성공!"
  STUDENT_COUNT=$(echo "$TEACHER_RESPONSE" | jq -r '.students | length')
  echo "   조회된 학생 수: $STUDENT_COUNT"
  echo ""
  echo "학생 목록:"
  echo "$TEACHER_RESPONSE" | jq -r '.students[] | "  - \(.name) (반: \(.class_id // "미배정"))"'
else
  echo "❌ 실패!"
  echo "$TEACHER_RESPONSE" | jq '.'
fi

echo ""
echo "═══════════════════════════════════════"
echo "3️⃣ 원장(ID 1)으로 학생 조회"
echo "═══════════════════════════════════════"
DIRECTOR_DATA='{"id":1,"user_type":"director"}'
DIRECTOR_HEADER=$(echo -n "$DIRECTOR_DATA" | base64 -w 0)
DIRECTOR_RESPONSE=$(curl -s -X GET "https://superplace-academy.pages.dev/api/students" \
  -H "X-User-Data-Base64: $DIRECTOR_HEADER")

DIRECTOR_COUNT=$(echo "$DIRECTOR_RESPONSE" | jq -r '.students | length')
echo "✅ 원장 계정 조회 학생 수: $DIRECTOR_COUNT"

echo ""
echo "═══════════════════════════════════════"
echo "4️⃣ 비교 결과"
echo "═══════════════════════════════════════"
echo "원장 계정: $DIRECTOR_COUNT명"
echo "선생님 계정: $STUDENT_COUNT명"

if [ "$STUDENT_COUNT" -lt "$DIRECTOR_COUNT" ]; then
  echo "✅ 권한 필터링 정상 작동!"
else
  echo "❌ 권한 필터링 미작동"
fi

echo ""
echo "🏁 테스트 완료"
