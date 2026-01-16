console.log('🚀 Admin Users JS File Loaded');

let currentUserId = null;

// 시스템 기능 권한 (DB의 program_key와 일치)
const systemFeatures = [
    // 핵심 도구
    { 
        key: 'search_volume', 
        name: '네이버 검색량 조회',
        icon: '📊',
        description: '키워드 검색량, 플레이스 순위, 경쟁사 분석',
        category: '핵심 도구'
    },
    { 
        key: 'parent_message', 
        name: '학부모 소통 메시지',
        icon: '💬',
        description: 'AI 기반 학부모 소통 메시지 자동 생성',
        category: '핵심 도구'
    },
    { 
        key: 'blog_writer', 
        name: '블로그 자동 작성',
        icon: '✍️',
        description: 'AI 기반 블로그 포스팅 자동 생성',
        category: '핵심 도구'
    },
    { 
        key: 'landing_builder', 
        name: '랜딩페이지 생성기',
        icon: '🚀',
        description: 'AI 기반 랜딩페이지 자동 생성 및 관리',
        category: '핵심 도구'
    },
    { 
        key: 'sms_sender', 
        name: 'SMS 문자 발송',
        icon: '📱',
        description: '문자 작성, 발신번호 관리, 발송 내역',
        category: '핵심 도구'
    },
    { 
        key: 'student_management', 
        name: '학생 관리',
        icon: '👨‍🎓',
        description: '학생 정보, 출결, 성적, 상담 기록 관리',
        category: '핵심 도구'
    },
    { 
        key: 'dashboard_analytics', 
        name: '통합 분석 대시보드',
        icon: '📈',
        description: '매출·학생·마케팅 통계 분석',
        category: '핵심 도구'
    },
    { 
        key: 'ai_learning_report', 
        name: 'AI 학습 리포트',
        icon: '🤖',
        description: 'AI 기반 학생 맞춤 학습 리포트 생성',
        category: '핵심 도구'
    },
    
    // 마케팅 도구
    { 
        key: 'keyword_analyzer', 
        name: '키워드 분석기',
        icon: '🔍',
        description: '검색량 높은 키워드 발굴 및 분석',
        category: '마케팅 도구'
    },
    { 
        key: 'review_template', 
        name: '후기 템플릿',
        icon: '⭐',
        description: '학부모 후기 요청 템플릿 생성',
        category: '마케팅 도구'
    },
    { 
        key: 'ad_copy_generator', 
        name: '광고 문구 생성기',
        icon: '💡',
        description: 'SNS·블로그 광고 문구 자동 생성',
        category: '마케팅 도구'
    },
    { 
        key: 'photo_optimizer', 
        name: '사진 최적화',
        icon: '📸',
        description: '학원 사진 자동 보정 및 최적화',
        category: '마케팅 도구'
    },
    { 
        key: 'competitor_analysis', 
        name: '경쟁사 분석',
        icon: '🎯',
        description: '주변 학원 마케팅 전략 분석',
        category: '마케팅 도구'
    },
    { 
        key: 'blog_checklist', 
        name: '블로그 체크리스트',
        icon: '✅',
        description: 'SEO 최적화 블로그 작성 가이드',
        category: '마케팅 도구'
    },
    { 
        key: 'content_calendar', 
        name: '콘텐츠 캘린더',
        icon: '📅',
        description: '월간 마케팅 콘텐츠 계획 관리',
        category: '마케팅 도구'
    },
    { 
        key: 'consultation_script', 
        name: '상담 스크립트',
        icon: '📝',
        description: '학부모 상담용 맞춤 스크립트 생성',
        category: '마케팅 도구'
    },
    { 
        key: 'place_optimization', 
        name: '플레이스 최적화',
        icon: '🗺️',
        description: '네이버 플레이스 정보 최적화 가이드',
        category: '마케팅 도구'
    },
    { 
        key: 'roi_calculator', 
        name: 'ROI 계산기',
        icon: '💰',
        description: '마케팅 투자 대비 효과 측정',
        category: '마케팅 도구'
    }
];

async function managePermissions(userId, userName) {
    currentUserId = userId;
    document.getElementById('modalUserName').textContent = userName + '님의 프로그램 권한 설정';
    
    // 현재 권한 조회
    const response = await fetch('/api/user/permissions?userId=' + userId);
    const data = await response.json();
    
    // 카테고리별로 그룹화
    const categories = {};
    systemFeatures.forEach(feature => {
        const cat = feature.category || '기타';
        if (!categories[cat]) {
            categories[cat] = [];
        }
        categories[cat].push(feature);
    });
    
    // 시스템 기능 권한 렌더링 (카테고리별)
    const systemPerms = document.getElementById('systemPermissions');
    systemPerms.innerHTML = '';
    
    Object.keys(categories).forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'col-span-2 mb-6';
        
        const categoryTitle = document.createElement('h4');
        categoryTitle.className = 'text-lg font-bold text-gray-900 mb-3 flex items-center gap-2';
        categoryTitle.innerHTML = '<span class="text-2xl">🎯</span>' + category;
        categoryDiv.appendChild(categoryTitle);
        
        const featuresGrid = document.createElement('div');
        featuresGrid.className = 'grid md:grid-cols-2 gap-3';
        
        categories[category].forEach(feature => {
            const hasPermission = data.success && data.permissions && data.permissions[feature.key];
            const borderClass = hasPermission ? 'border-blue-500 bg-blue-50' : 'border-gray-200';
            
            const label = document.createElement('label');
            label.className = 'flex items-start p-3 border-2 ' + borderClass + ' rounded-lg hover:border-blue-300 cursor-pointer transition';
            label.innerHTML = 
                '<input type="checkbox" ' +
                       'class="w-5 h-5 text-blue-600 rounded mr-3 mt-1" ' +
                       'data-program-key="' + feature.key + '" ' +
                       (hasPermission ? 'checked' : '') + '>' +
                '<div class="flex-1">' +
                    '<div class="flex items-center gap-2 mb-1">' +
                        '<span class="text-lg">' + feature.icon + '</span>' +
                        '<span class="text-sm font-bold text-gray-900">' + feature.name + '</span>' +
                    '</div>' +
                    '<p class="text-xs text-gray-600">' + feature.description + '</p>' +
                '</div>';
            
            featuresGrid.appendChild(label);
        });
        
        categoryDiv.appendChild(featuresGrid);
        systemPerms.appendChild(categoryDiv);
    });

    // 모달 표시
    document.getElementById('permissionModal').classList.remove('hidden');
}

async function savePermissions() {
    const checkboxes = document.querySelectorAll('#systemPermissions input[type="checkbox"]');
    const adminUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const checkbox of checkboxes) {
        const programKey = checkbox.dataset.programKey;
        
        try {
            if (checkbox.checked) {
                // 권한 부여
                const response = await fetch('/api/admin/grant-permission', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: currentUserId,
                        programKey: programKey,
                        grantedBy: adminUser.id || 1
                    })
                });
                const result = await response.json();
                if (result.success) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } else {
                // 권한 회수
                const response = await fetch('/api/admin/revoke-permission', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: currentUserId,
                        programKey: programKey,
                        adminId: adminUser.id || 1
                    })
                });
                const result = await response.json();
                if (result.success) {
                    successCount++;
                } else {
                    errorCount++;
                }
            }
        } catch (err) {
            console.error('권한 처리 오류:', err);
            errorCount++;
        }
    }

    if (errorCount === 0) {
        alert('✅ 권한이 성공적으로 업데이트되었습니다!');
    } else {
        alert('⚠️ 권한 업데이트 완료\n성공: ' + successCount + '개\n실패: ' + errorCount + '개');
    }
    closeModal();
    location.reload();
}

function closeModal() {
    document.getElementById('permissionModal').classList.add('hidden');
    currentUserId = null;
}

function selectAllPermissions() {
    const checkboxes = document.querySelectorAll('#systemPermissions input[type="checkbox"]');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = !allChecked;
        // 체크박스 변경 시 라벨 스타일도 업데이트
        const label = checkbox.closest('label');
        if (checkbox.checked) {
            label.classList.remove('border-gray-200');
            label.classList.add('border-blue-500', 'bg-blue-50');
        } else {
            label.classList.remove('border-blue-500', 'bg-blue-50');
            label.classList.add('border-gray-200');
        }
    });
}

function logout() {
    if(confirm('로그아웃 하시겠습니까?')) {
        localStorage.removeItem('user');
        window.location.href = '/';
    }
}

// 비밀번호 변경
async function changePassword(userId, userName) {
    const newPassword = prompt(userName + '님의 새 비밀번호를 입력하세요 (최소 6자):');
    if (!newPassword) return;
    
    if (newPassword.length < 6) {
        alert('비밀번호는 최소 6자 이상이어야 합니다.');
        return;
    }

    try {
        const response = await fetch('/api/admin/users/' + userId + '/password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newPassword })
        });

        const data = await response.json();
        if (data.success) {
            alert('비밀번호가 변경되었습니다!');
        } else {
            alert('오류: ' + (data.error || '비밀번호 변경 실패'));
        }
    } catch (err) {
        alert('비밀번호 변경 중 오류가 발생했습니다.');
    }
}

// 포인트 지급
async function givePoints(userId, userName, currentPoints) {
    currentPoints = parseInt(currentPoints) || 0;
    const pointsStr = prompt(userName + '님에게 지급할 포인트를 입력하세요 (현재: ' + currentPoints + 'P):');
    if (!pointsStr) return;
    
    const points = parseInt(pointsStr);
    if (isNaN(points) || points <= 0) {
        alert('올바른 포인트를 입력하세요.');
        return;
    }

    try {
        const response = await fetch('/api/admin/users/' + userId + '/points', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ points })
        });

        const data = await response.json();
        if (data.success) {
            alert(points.toLocaleString() + 'P가 지급되었습니다! 새 잔액: ' + data.newPoints.toLocaleString() + 'P');
            location.reload();
        } else {
            alert('오류: ' + (data.error || '포인트 지급 실패'));
        }
    } catch (err) {
        alert('포인트 지급 중 오류가 발생했습니다.');
    }
}

// 포인트 차감 (환수)
async function deductPoints(userId, userName, currentPoints) {
    currentPoints = parseInt(currentPoints) || 0;
    const pointsStr = prompt(userName + '님의 포인트를 차감합니다 (현재: ' + currentPoints.toLocaleString() + 'P) - 차감할 포인트를 입력하세요:');
    if (!pointsStr) return;
    
    const points = parseInt(pointsStr);
    if (isNaN(points) || points <= 0) {
        alert('올바른 포인트를 입력하세요.');
        return;
    }

    // 현재 포인트보다 많이 차감하려는 경우 경고
    if (points > currentPoints) {
        if (!confirm('경고: 현재 포인트(' + currentPoints.toLocaleString() + 'P)보다 많은 금액(' + points.toLocaleString() + 'P)을 차감하면 포인트가 마이너스가 됩니다. 계속하시겠습니까?')) {
            return;
        }
    }

    if (!confirm(userName + '님의 포인트를 ' + points.toLocaleString() + 'P 차감하시겠습니까? (차감 후 잔액: ' + (currentPoints - points).toLocaleString() + 'P)')) {
        return;
    }

    try {
        const response = await fetch('/api/admin/users/' + userId + '/points/deduct', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ points })
        });

        const data = await response.json();
        if (data.success) {
            alert(points.toLocaleString() + 'P가 차감되었습니다! 새 잔액: ' + data.newPoints.toLocaleString() + 'P');
            location.reload();
        } else {
            alert('오류: ' + (data.error || '포인트 차감 실패'));
        }
    } catch (err) {
        alert('포인트 차감 중 오류가 발생했습니다.');
    }
}

// 사용자로 로그인
async function loginAs(userId, userName) {
    if (!confirm(userName + '님의 계정으로 로그인하시겠습니까?')) return;

    try {
        const response = await fetch('/api/admin/login-as/' + userId, {
            method: 'POST'
        });

        const data = await response.json();
        if (data.success) {
            localStorage.setItem('user', JSON.stringify(data.user));
            alert(userName + '님으로 로그인되었습니다!');
            window.location.href = '/dashboard';
        } else {
            alert('오류: ' + (data.error || '로그인 실패'));
        }
    } catch (err) {
        alert('로그인 중 오류가 발생했습니다.');
    }
}

// 전역으로 노출
window.changePassword = changePassword;
window.givePoints = givePoints;
window.deductPoints = deductPoints;
window.loginAs = loginAs;
window.managePermissions = managePermissions;
window.savePermissions = savePermissions;
window.closeModal = closeModal;
window.selectAllPermissions = selectAllPermissions;
window.logout = logout;

console.log('✅ All admin functions registered globally');
console.log('Available functions:', Object.keys({changePassword, givePoints, deductPoints, loginAs, managePermissions, selectAllPermissions}));
