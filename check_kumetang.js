// kumetang@gmail.com 계정 데이터 확인 스크립트

const API_BASE = 'https://superplace-academy.pages.dev';

async function checkAccount() {
    console.log('🔍 kumetang@gmail.com 계정 확인 중...\n');
    
    // 1. 사용자 정보 확인 (API 통해)
    console.log('1️⃣ 로그인 시도...');
    
    // 로그인 정보
    const loginData = {
        email: 'kumetang@gmail.com',
        // 비밀번호가 필요하지만 보안상 직접 접근 불가
    };
    
    console.log('\n⚠️  직접 API 호출이 필요합니다.');
    console.log('📋 확인해야 할 정보:');
    console.log('   - user_id');
    console.log('   - academy_id');
    console.log('   - 활성 구독 ID');
    console.log('   - landing_pages 테이블의 실제 개수');
    console.log('   - usage_tracking 테이블의 현재 값');
    
    console.log('\n🔧 해결 방법:');
    console.log('   1. 로그인: https://superplace-academy.pages.dev/login');
    console.log('   2. 대시보드: https://superplace-academy.pages.dev/dashboard');
    console.log('   3. F12 > Console에서 다음 실행:\n');
    console.log(`
fetch('/api/admin/sync-landing-pages-usage', {
    method: 'POST',
    credentials: 'include'
}).then(r => r.json()).then(data => {
    console.log('동기화 결과:', data);
    location.reload();
});
    `);
}

checkAccount();
