#!/bin/bash

echo "=== 무료 플랜 시스템 테스트 ==="
echo ""

BASE_URL="https://superplace-academy.pages.dev"

# 1. 테이블 초기화
echo "1. 테이블 초기화 중..."
INIT_RESPONSE=$(curl -s "${BASE_URL}/api/admin/init-free-plan-table")
echo "Response: $INIT_RESPONSE"
echo ""

# 2. 무료 플랜 신청
echo "2. 무료 플랜 신청 테스트..."
APPLY_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/free-plan/apply" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-001",
    "academyName": "테스트 학원",
    "ownerName": "홍길동",
    "email": "test@example.com",
    "phone": "010-1234-5678",
    "reason": "무료 플랜 테스트입니다"
  }')
echo "Response: $APPLY_RESPONSE"
echo ""

# 3. 관리자 신청 목록 확인
echo "3. 관리자 신청 목록 확인..."
REQUESTS_RESPONSE=$(curl -s "${BASE_URL}/api/free-plan/requests?adminEmail=admin@superplace.co.kr")
echo "Response: $REQUESTS_RESPONSE"
echo ""

echo "=== 테스트 완료 ==="
