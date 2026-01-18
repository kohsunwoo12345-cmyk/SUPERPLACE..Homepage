#!/bin/bash
echo "🔧 === 완전 자동 수정 시작 ==="
echo ""

# 1. 배포 대기
echo "⏳ Cloudflare Pages 배포 대기 (3분)..."
sleep 180

# 2. Fix API 호출
echo ""
echo "1️⃣ teacher_classes 테이블 생성..."
FIX_RESPONSE=$(curl -s "https://superplace-academy.pages.dev/api/fix-teacher-classes-error")
echo "$FIX_RESPONSE"

# 3. 재시도 (404면 더 기다리기)
if echo "$FIX_RESPONSE" | grep -q "404"; then
  echo "⚠️  아직 배포되지 않음. 2분 더 대기..."
  sleep 120
  FIX_RESPONSE=$(curl -s "https://superplace-academy.pages.dev/api/fix-teacher-classes-error")
  echo "$FIX_RESPONSE"
fi

# 4. 성공 확인
if echo "$FIX_RESPONSE" | grep -q "success.*true"; then
  echo "✅ teacher_classes 테이블 생성 성공!"
else
  echo "❌ 실패. 수동 실행 필요:"
  echo "   https://superplace-academy.pages.dev/api/fix-teacher-classes-error"
  exit 1
fi

# 5. 테스트
echo ""
echo "2️⃣ 선생님 계정 테스트..."
sleep 5

TEACHER_DATA='{"id":18,"user_type":"teacher","parent_user_id":1}'
TEACHER_HEADER=$(echo -n "$TEACHER_DATA" | base64 -w 0)
RESPONSE=$(curl -s -X GET "https://superplace-academy.pages.dev/api/students" \
  -H "X-User-Data-Base64: $TEACHER_HEADER")

if echo "$RESPONSE" | grep -q "success.*true"; then
  STUDENT_COUNT=$(echo "$RESPONSE" | jq -r '.students | length')
  echo "✅ 성공! 조회된 학생 수: $STUDENT_COUNT"
  
  # 6. 권한 확인
  PERM=$(curl -s "https://superplace-academy.pages.dev/api/teachers/18/permissions?directorId=1")
  CAN_VIEW_ALL=$(echo "$PERM" | jq -r '.permissions.canViewAllStudents')
  ASSIGNED=$(echo "$PERM" | jq -r '.permissions.assignedClasses | length')
  
  echo ""
  echo "권한 설정:"
  echo "  - 전체 조회 권한: $CAN_VIEW_ALL"
  echo "  - 배정된 반 수: $ASSIGNED"
  
  if [ "$CAN_VIEW_ALL" = "false" ] && [ "$ASSIGNED" -gt 0 ]; then
    echo ""
    echo "✅ ✅ ✅  권한 필터링 정상 작동!"
    echo ""
    echo "🎉 모든 수정 완료!"
    exit 0
  else
    echo ""
    echo "⚠️  권한 설정이 필요합니다:"
    echo "   https://superplace-academy.pages.dev/students"
    echo "   → 선생님 관리 → 권한 설정 → 배정된 반만 공개"
  fi
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error')
  echo "❌ 여전히 실패: $ERROR"
  exit 1
fi
