#!/bin/bash

echo "⏳ Cloudflare 자동 배포 대기 중..."
for i in {1..12}; do
    echo "   ${i}0초 경과..."
    sleep 10
    
    # 30초마다 확인
    if [ $((i % 3)) -eq 0 ]; then
        RESULT=$(curl -s "https://superplace-academy.pages.dev/teachers" | grep -o "<title>선생님 관리" | head -1)
        if [ ! -z "$RESULT" ]; then
            echo "✅ 배포 성공!"
            curl -s "https://superplace-academy.pages.dev/teachers" | grep -o "<title>.*</title>"
            exit 0
        fi
    fi
done

echo "❌ 120초 후에도 배포가 완료되지 않았습니다"
echo "   수동 확인 필요: https://dash.cloudflare.com"
exit 1
