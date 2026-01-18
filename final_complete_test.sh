#!/bin/bash
echo "=== 최종 완전 테스트 ==="
echo ""

# 120초 대기 (배포 완료 대기)
echo "⏳ Cloudflare 배포 완료 대기 중... (120초)"
sleep 120

echo ""
echo "1️⃣ 원장 계정으로 학생 조회 (모든 학생 보여야 함)"
DIRECTOR_DATA='{"id":1,"user_type":"director","role":"director"}'
DIRECTOR_HEADER=$(echo -n "$DIRECTOR_DATA" | base64 -w 0)
curl -s -X GET "https://superplace-academy.pages.dev/api/students" \
  -H "X-User-Data-Base64: $DIRECTOR_HEADER" | jq '.studentCount, .students[].name' 2>/dev/null || echo "JSON 파싱 실패"

echo ""
echo "2️⃣ 선생님(ID 18) 권한 확인"
curl -s -X GET "https://superplace-academy.pages.dev/api/teachers/18/permissions?directorId=1" | jq '.'

echo ""
echo "3️⃣ 선생님(ID 18) 학생 조회 (권한에 따라 필터링되어야 함)"
TEACHER_DATA='{"id":18,"user_type":"teacher","parent_user_id":1}'
TEACHER_HEADER=$(echo -n "$TEACHER_DATA" | base64 -w 0)
curl -s -X GET "https://superplace-academy.pages.dev/api/students" \
  -H "X-User-Data-Base64: $TEACHER_HEADER" | jq '.studentCount, .students[].name' 2>/dev/null || echo "JSON 파싱 실패"

echo ""
echo "4️⃣ 반 목록 확인"
curl -s "https://superplace-academy.pages.dev/api/classes/list?userId=1&userType=director" | jq '.classes[] | {id, name, grade_level}'

echo ""
echo "5️⃣ /students 페이지에서 showTeacherPermissions 함수 확인"
curl -s "https://superplace-academy.pages.dev/students" | grep -o "function showTeacherPermissions" | head -1

echo ""
echo "6️⃣ /students 페이지에서 반 배정 UI 확인"
curl -s "https://superplace-academy.pages.dev/students" | grep -o "classesCheckboxList" | head -1

echo ""
echo "✅ 테스트 완료"
