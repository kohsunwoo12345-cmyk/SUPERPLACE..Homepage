console.log('🚀 Admin Users JS File Loaded');

let currentUserId = null;

// 시스템 기능 권한 (DB의 program_key와 일치)
const systemFeatures = [
    { 
        key: 'search_volume', 
        name: '네이버 검색량 조회',
        icon: '📊',
        description: '키워드 검색량, 플레이스 순위, 경쟁사 분석'
    },
    { 
        key: 'sms', 
        name: 'SMS 문자 발송',
        icon: '📱',
        description: '문자 작성, 발신번호 관리, 발송 내역'
    },
    { 
        key: 'landing_builder', 
        name: '랜딩페이지 생성기',
        icon: '🚀',
        description: 'AI 기반 랜딩페이지 자동 생성'
    },
    { 
        key: 'analytics', 
        name: '분석 도구',
        icon: '📈',
        description: '데이터 분석 및 리포트 생성 (예정)'
    }
];

async function managePermissions(userId, userName) {
    currentUserId = userId;
    document.getElementById('modalUserName').textContent = userName + '님의 프로그램 권한 설정';
    
    // 현재 권한 조회 (새로운 API)
    const response = await fetch('/api/user/permissions?userId=' + userId);
    const data = await response.json();
    
    // 시스템 기능 권한 렌더링
    const systemPerms = document.getElementById('systemPermissions');
    systemPerms.innerHTML = systemFeatures.map(feature => {
        const hasPermission = data.success && data.permissions && data.permissions[feature.key];
        const borderClass = hasPermission ? 'border-blue-500 bg-blue-50' : 'border-gray-200';
        return '<label class="flex items-start p-4 border-2 ' + borderClass + ' rounded-lg hover:border-blue-300 cursor-pointer transition">' +
            '<input type="checkbox" ' +
                   'class="w-5 h-5 text-blue-600 rounded mr-3 mt-1" ' +
                   'data-program-key="' + feature.key + '" ' +
                   (hasPermission ? 'checked' : '') + '>' +
            '<div class="flex-1">' +
                '<div class="flex items-center gap-2 mb-1">' +
                    '<span class="text-xl">' + feature.icon + '</span>' +
                    '<span class="text-sm font-bold text-gray-900">' + feature.name + '</span>' +
                '</div>' +
                '<p class="text-xs text-gray-600">' + feature.description + '</p>' +
            '</div>' +
        '</label>';
    }).join('');

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
window.logout = logout;

console.log('✅ All admin functions registered globally');
console.log('Available functions:', Object.keys({changePassword, givePoints, deductPoints, loginAs, managePermissions}));
