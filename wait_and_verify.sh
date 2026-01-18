#!/bin/bash

echo "🔄 Cloudflare 캐시 갱신 대기 중..."
echo ""

for i in {1..6}; do
    echo "⏳ 대기 중... ${i}/6 (30초)"
    sleep 30
    
    echo "📡 메인 도메인 테스트..."
    MAIN=$(curl -s "https://superplace-academy.pages.dev/students" | grep -c "const escapedName")
    
    if [ "$MAIN" -eq 2 ]; then
        echo "✅ 메인 도메인 업데이트 완료!"
        break
    else
        echo "⚠️  아직 캐시 남음, 계속 대기..."
    fi
done

echo ""
echo "========================================"
echo "최종 확인"
echo "========================================"

# 메인 도메인 테스트
echo "1. 메인 도메인:"
MAIN_PAGE=$(curl -s "https://superplace-academy.pages.dev/students")
MAIN_ESCAPE=$(echo "$MAIN_PAGE" | grep -c "const escapedName")
MAIN_BAD=$(echo "$MAIN_PAGE" | grep -c "\\\\\\\\\\\\\\\\")

echo "   escapedName: ${MAIN_ESCAPE}개"
if [ "$MAIN_BAD" -eq 0 ]; then
    echo "   ✅ 잘못된 escape: 0개"
else
    echo "   ❌ 잘못된 escape: ${MAIN_BAD}개"
fi

# 새 배포 테스트
echo ""
echo "2. 새 배포:"
NEW_PAGE=$(curl -s "https://5ed4aad5.superplace-academy.pages.dev/students")
NEW_ESCAPE=$(echo "$NEW_PAGE" | grep -c "const escapedName")
NEW_BAD=$(echo "$NEW_PAGE" | grep -c "\\\\\\\\\\\\\\\\")

echo "   escapedName: ${NEW_ESCAPE}개"
if [ "$NEW_BAD" -eq 0 ]; then
    echo "   ✅ 잘못된 escape: 0개"
else
    echo "   ❌ 잘못된 escape: ${NEW_BAD}개"
fi

# API 테스트
echo ""
echo "3. API 테스트:"
TEACHERS=$(curl -s "https://superplace-academy.pages.dev/api/teachers/list?directorId=1" | jq -r '.teachers | length')
echo "   ✅ 선생님: ${TEACHERS}명"

echo ""
echo "========================================"
echo "✅ 확인 완료!"
echo "========================================"
echo ""
echo "🌐 접속 URL:"
echo "   https://superplace-academy.pages.dev/students"
echo ""
echo "🔑 로그인:"
echo "   kumetang@gmail.com / 1234"
echo ""

if [ "$MAIN_BAD" -eq 0 ] && [ "$MAIN_ESCAPE" -eq 2 ]; then
    echo "🎉 메인 도메인 정상 작동!"
else
    echo "⚠️  메인 도메인이 아직 업데이트 안됨"
    echo "   5-10분 후 다시 확인하거나"
    echo "   브라우저에서 Ctrl+Shift+R (강제 새로고침) 시도"
fi
echo ""

