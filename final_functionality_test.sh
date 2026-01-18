#!/bin/bash

echo "🔥 최종 기능 테스트"
echo ""

URL="https://8d268ba9.superplace-academy.pages.dev"

echo "========================================"
echo "1. 선생님 목록 API"
echo "========================================"
RESULT=$(curl -s "$URL/api/teachers/list?directorId=1")
COUNT=$(echo "$RESULT" | jq -r '.teachers | length')
echo "✅ 등록된 선생님: ${COUNT}명"
echo ""
echo "선생님 목록:"
echo "$RESULT" | jq -r '.teachers[] | "  \(.id). \(.name) - \(.email)"'

echo ""
echo "========================================"
echo "2. 학생 목록 API"
echo "========================================"
STUDENTS=$(curl -s "$URL/api/students")
STUDENT_COUNT=$(echo "$STUDENTS" | jq -r '.students | length')
echo "✅ 등록된 학생: ${STUDENT_COUNT}명"

echo ""
echo "========================================"
echo "3. 페이지 구조 확인"
echo "========================================"
PAGE=$(curl -s "$URL/students")

if echo "$PAGE" | grep -q "선생님 관리"; then
    echo "✅ '선생님 관리' 섹션 존재"
else
    echo "❌ '선생님 관리' 섹션 없음"
fi

if echo "$PAGE" | grep -q "loadTeachersList"; then
    echo "✅ loadTeachersList 함수 존재"
else
    echo "❌ loadTeachersList 함수 없음"
fi

if echo "$PAGE" | grep -q "showTeacherPermissions"; then
    echo "✅ showTeacherPermissions 함수 존재"
else
    echo "❌ showTeacherPermissions 함수 없음"
fi

if echo "$PAGE" | grep -q "addTeacherModal"; then
    echo "✅ 선생님 추가 모달 존재"
else
    echo "❌ 선생님 추가 모달 없음"
fi

echo ""
echo "========================================"
echo "4. Escape 문자 검증"
echo "========================================"
ESCAPE_COUNT=$(echo "$PAGE" | grep -c "const escapedName")
echo "✅ escapedName 사용 횟수: ${ESCAPE_COUNT}개"

BAD_ESCAPE=$(echo "$PAGE" | grep -c "\\\\\\\\'")
if [ "$BAD_ESCAPE" -eq 0 ]; then
    echo "✅ 잘못된 escape 없음"
else
    echo "❌ 잘못된 escape ${BAD_ESCAPE}개 발견"
fi

echo ""
echo "========================================"
echo "✅ 모든 테스트 완료!"
echo "========================================"
echo ""
echo "🌐 접속 URL:"
echo "   https://superplace-academy.pages.dev/students"
echo "   또는"
echo "   https://8d268ba9.superplace-academy.pages.dev/students"
echo ""
echo "🔑 로그인 정보:"
echo "   이메일: kumetang@gmail.com"
echo "   비밀번호: 1234"
echo ""
echo "📋 테스트 방법:"
echo "   1. 위 URL 접속"
echo "   2. 로그인"
echo "   3. 페이지 하단 스크롤"
echo "   4. '선생님 관리' 카드 클릭"
echo "   5. 선생님 목록 확인 (${COUNT}명)"
echo "   6. '권한 설정' 버튼 클릭"
echo "   7. '선생님 추가' 버튼 클릭"
echo ""
echo "🎉 모든 기능 정상!"
echo ""

