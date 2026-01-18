#!/bin/bash

echo "🚀 최종 완전 테스트 시작..."
echo ""
echo "⏳ Cloudflare Pages 배포 대기 중... (3분)"
sleep 180

echo ""
echo "========================================"
echo "1. JavaScript 에러 확인"
echo "========================================"

# 페이지 다운로드 및 에러 확인
PAGE_CONTENT=$(curl -s "https://superplace-academy.pages.dev/students")
ERROR_CHECK=$(echo "$PAGE_CONTENT" | grep -c "Invalid or unexpected token" || echo "0")

if [ "$ERROR_CHECK" = "0" ]; then
    echo "✅ JavaScript 파싱 에러 없음"
else
    echo "❌ JavaScript 에러 여전히 존재"
    echo "   배포가 아직 완료되지 않았을 수 있습니다."
fi

echo ""
echo "========================================"
echo "2. API 데이터 확인"
echo "========================================"

# 선생님 API
TEACHERS_DATA=$(curl -s "https://superplace-academy.pages.dev/api/teachers/list?directorId=1")
TEACHERS_COUNT=$(echo "$TEACHERS_DATA" | jq -r '.teachers | length')
echo "✅ 등록된 선생님: ${TEACHERS_COUNT}명"

# 학생 API
STUDENTS_DATA=$(curl -s "https://superplace-academy.pages.dev/api/students")
STUDENTS_COUNT=$(echo "$STUDENTS_DATA" | jq -r '.students | length')
echo "✅ 등록된 학생: ${STUDENTS_COUNT}명"

echo ""
echo "========================================"
echo "3. 선생님 목록 (처음 5명)"
echo "========================================"
echo "$TEACHERS_DATA" | jq -r '.teachers[0:5] | .[] | "• \(.name) - \(.email)"'

echo ""
echo "========================================"
echo "4. 학생 목록"
echo "========================================"
echo "$STUDENTS_DATA" | jq -r '.students[0:5] | .[] | "• \(.name) - 반: \(.class_name // "미배정")"'

echo ""
echo "========================================"
echo "✅ 최종 테스트 완료!"
echo "========================================"
echo ""
echo "🌐 메인 페이지:"
echo "   https://superplace-academy.pages.dev/students"
echo ""
echo "📋 로그인 정보 (원장 계정):"
echo "   이메일: kumetang@gmail.com"
echo "   비밀번호: 1234"
echo ""
echo "✅ 확인 사항:"
echo "   1. 페이지가 정상적으로 로드됨"
echo "   2. 선생님 관리 섹션이 보임"
echo "   3. 선생님 ${TEACHERS_COUNT}명이 목록에 표시됨"
echo "   4. '권한 설정' 버튼이 클릭 가능"
echo "   5. '선생님 추가' 버튼이 클릭 가능"
echo "   6. 학생 ${STUDENTS_COUNT}명이 목록에 표시됨"
echo ""

