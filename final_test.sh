#!/bin/bash
echo "🧪 === 최종 테스트 ==="
echo ""

echo "1️⃣ JavaScript 에러 확인"
echo "브라우저 콘솔 확인이 필요합니다..."

echo ""
echo "2️⃣ 선생님 목록 API 테스트"
API_RESULT=$(curl -s "https://superplace-academy.pages.dev/api/teachers/list?directorId=1")
TEACHER_COUNT=$(echo "$API_RESULT" | jq -r '.teachers | length')
echo "✅ 등록된 선생님: $TEACHER_COUNT명"

echo ""
echo "3️⃣ 선생님 목록 (처음 5명)"
echo "$API_RESULT" | jq -r '.teachers[:5] | .[] | "  • \(.name) - \(.email)"'

echo ""
echo "4️⃣ 권한 테스트 (김선생)"
PERM_RESULT=$(curl -s "https://superplace-academy.pages.dev/api/teachers/18/permissions?directorId=1")
echo "$PERM_RESULT" | jq '{teacher: .teacher.name, canViewAll: .permissions.canViewAllStudents, assignedClasses: .permissions.assignedClasses}'

echo ""
echo "✅ 테스트 완료!"
echo ""
echo "📝 다음 단계:"
echo "   1. https://superplace-academy.pages.dev/students 접속"
echo "   2. 원장 계정으로 로그인 (kumetang@gmail.com / 1234)"
echo "   3. 페이지 하단 '선생님 관리' 섹션 확인"
echo "   4. '권한 설정' 버튼이 정상 작동하는지 확인"
