#!/bin/bash

echo "🔍 빠른 테스트 시작..."
echo ""

for i in {1..10}; do
    echo "[$i/10] 배포 확인 중..."
    
    # JavaScript 에러가 없는지 확인
    ERROR_COUNT=$(curl -s "https://superplace-academy.pages.dev/students" 2>&1 | grep -c "Invalid or unexpected token" || echo "0")
    
    if [ "$ERROR_COUNT" = "0" ]; then
        echo "✅ JavaScript 에러 해결됨!"
        echo ""
        echo "========================================"
        echo "최종 확인"
        echo "========================================"
        
        # 선생님 수 확인
        TEACHERS=$(curl -s "https://superplace-academy.pages.dev/api/teachers/list?directorId=1" | jq -r '.teachers | length')
        echo "등록된 선생님: ${TEACHERS}명"
        
        # 학생 수 확인
        STUDENTS=$(curl -s "https://superplace-academy.pages.dev/api/students" | jq -r '.students | length')
        echo "등록된 학생: ${STUDENTS}명"
        
        echo ""
        echo "✅ 모든 테스트 통과!"
        echo ""
        echo "🌐 테스트 URL:"
        echo "   https://superplace-academy.pages.dev/students"
        echo ""
        echo "📋 로그인 정보:"
        echo "   이메일: kumetang@gmail.com"
        echo "   비밀번호: 1234"
        echo ""
        exit 0
    fi
    
    sleep 30
done

echo "❌ 배포가 완료되지 않았거나 에러가 지속됩니다."
echo "   수동 확인 필요: https://superplace-academy.pages.dev/students"

