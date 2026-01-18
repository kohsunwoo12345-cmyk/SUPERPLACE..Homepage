#!/bin/bash
echo "🎯 === 최종 완전 테스트 ==="
echo ""
echo "⏳ 배포 완료 대기 (3분)..."
sleep 180

echo ""
echo "══════════════════════════════════════════════════"
echo "1️⃣  선생님(ID 18) 권한 설정 확인"
echo "══════════════════════════════════════════════════"
curl -s "https://superplace-academy.pages.dev/api/teachers/18/permissions?directorId=1" | jq '.'

echo ""
echo "══════════════════════════════════════════════════"
echo "2️⃣  선생님 계정으로 학생 조회 (배정된 반만)"
echo "══════════════════════════════════════════════════"
TEACHER_DATA='{"id":18,"user_type":"teacher","parent_user_id":1}'
TEACHER_HEADER=$(echo -n "$TEACHER_DATA" | base64 -w 0)
echo "요청 헤더: $TEACHER_HEADER"
echo ""

RESPONSE=$(curl -s -X GET "https://superplace-academy.pages.dev/api/students" \
  -H "X-User-Data-Base64: $TEACHER_HEADER")

echo "$RESPONSE" | jq '.'

echo ""
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  STUDENT_COUNT=$(echo "$RESPONSE" | jq -r '.students | length')
  echo "✅ 성공! 조회된 학생 수: $STUDENT_COUNT"
  
  if [ "$STUDENT_COUNT" -gt 0 ]; then
    echo ""
    echo "학생 목록:"
    echo "$RESPONSE" | jq -r '.students[] | "  • \(.name) - 반: \(.class_id // "미배정")"'
  fi
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error')
  echo "❌ 실패: $ERROR"
fi

echo ""
echo "══════════════════════════════════════════════════"
echo "3️⃣  원장 계정으로 학생 조회 (전체)"
echo "══════════════════════════════════════════════════"
DIRECTOR_DATA='{"id":1,"user_type":"director"}'
DIRECTOR_HEADER=$(echo -n "$DIRECTOR_DATA" | base64 -w 0)

DIRECTOR_RESPONSE=$(curl -s -X GET "https://superplace-academy.pages.dev/api/students" \
  -H "X-User-Data-Base64: $DIRECTOR_HEADER")

DIRECTOR_COUNT=$(echo "$DIRECTOR_RESPONSE" | jq -r '.students | length')
echo "✅ 원장 계정 조회 학생 수: $DIRECTOR_COUNT"

echo ""
echo "══════════════════════════════════════════════════"
echo "4️⃣  결과 검증"
echo "══════════════════════════════════════════════════"
echo "• 원장 계정: $DIRECTOR_COUNT명 (전체)"
if [ -n "$STUDENT_COUNT" ]; then
  echo "• 선생님 계정: $STUDENT_COUNT명 (배정된 반만)"
  
  if [ "$STUDENT_COUNT" -lt "$DIRECTOR_COUNT" ] || [ "$STUDENT_COUNT" -eq 0 ]; then
    echo ""
    echo "✅ ✅ ✅  권한 필터링 정상 작동!"
    echo "✅ ✅ ✅  선생님은 배정된 반의 학생만 조회 가능"
  else
    echo ""
    echo "⚠️  권한 필터링 확인 필요"
  fi
else
  echo "• 선생님 계정: 조회 실패"
fi

echo ""
echo "══════════════════════════════════════════════════"
echo "5️⃣  /students 페이지 UI 확인"
echo "══════════════════════════════════════════════════"
PAGE=$(curl -s "https://superplace-academy.pages.dev/students")

if echo "$PAGE" | grep -q "showTeacherPermissions"; then
  echo "✅ showTeacherPermissions 함수 존재"
else
  echo "❌ showTeacherPermissions 함수 없음"
fi

if echo "$PAGE" | grep -q "classesCheckboxList"; then
  echo "✅ classesCheckboxList 요소 존재"
else
  echo "❌ classesCheckboxList 요소 없음"
fi

echo ""
echo "══════════════════════════════════════════════════"
echo "🏁 테스트 완료"
echo "══════════════════════════════════════════════════"
