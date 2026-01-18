#!/bin/bash
echo "🎯 최종 검증 시작"
echo ""

# 1. Fix API 실행
echo "1️⃣ teacher_classes 테이블 생성..."
FIX_RESULT=$(curl -s "https://superplace-academy.pages.dev/api/fix-teacher-classes-error")
echo "$FIX_RESULT" | jq '.'

if echo "$FIX_RESULT" | grep -q '"success":true'; then
  echo "✅ 테이블 생성 성공!"
else
  echo "❌ 테이블 생성 실패"
  exit 1
fi

echo ""
sleep 5

# 2. 선생님 계정 테스트
echo "2️⃣ 선생님 계정으로 학생 조회..."
TEACHER_DATA='{"id":18,"user_type":"teacher","parent_user_id":1}'
TEACHER_HEADER=$(echo -n "$TEACHER_DATA" | base64 -w 0)
TEST_RESULT=$(curl -s -X GET "https://superplace-academy.pages.dev/api/students" \
  -H "X-User-Data-Base64: $TEACHER_HEADER")

echo "$TEST_RESULT" | jq '.'

if echo "$TEST_RESULT" | grep -q '"success":true'; then
  STUDENT_COUNT=$(echo "$TEST_RESULT" | jq -r '.students | length')
  echo ""
  echo "✅ 학생 조회 성공!"
  echo "   조회된 학생 수: $STUDENT_COUNT"
  
  # 3. 권한 확인
  echo ""
  echo "3️⃣ 권한 설정 확인..."
  PERM=$(curl -s "https://superplace-academy.pages.dev/api/teachers/18/permissions?directorId=1")
  echo "$PERM" | jq '{teacher: .teacher.name, canViewAll: .permissions.canViewAllStudents, assignedClasses: .permissions.assignedClasses}'
  
  echo ""
  echo "🎉🎉🎉 모든 기능 정상 작동! 🎉🎉🎉"
  echo ""
  echo "테스트 URL:"
  echo "  • 원장: https://superplace-academy.pages.dev/students"
  echo "  • 선생님: https://superplace-academy.pages.dev/students/list"
  exit 0
else
  ERROR=$(echo "$TEST_RESULT" | jq -r '.error')
  echo ""
  echo "❌ 실패: $ERROR"
  exit 1
fi
