// Complete JavaScript for /teachers page - to replace lines 24599-24794

let currentUser = null;

// 페이지 로드 시 초기화
window.addEventListener('DOMContentLoaded', () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = '/login';
        return;
    }
    
    currentUser = JSON.parse(userStr);
    console.log('Current user:', currentUser);
    
    loadPageData();
});

async function loadPageData() {
    loadVerificationCode();
    loadPendingApplications();
    loadTeachersList();
}

// 인증 코드 로드
async function loadVerificationCode() {
    try {
        const res = await fetch('/api/teachers/verification-code?directorId=' + currentUser.id);
        const data = await res.json();
        
        if (data.success) {
            const code = data.code || (data.codeData && (data.codeData.code || data.codeData.verification_code)) || '------';
            document.getElementById('verificationCode').textContent = code;
        }
    } catch (error) {
        console.error('인증 코드 로딩 실패:', error);
    }
}

// 인증 코드 복사
function copyVerificationCode() {
    const code = document.getElementById('verificationCode').textContent;
    navigator.clipboard.writeText(code).then(() => {
        alert('인증 코드가 복사되었습니다: ' + code);
    });
}

// 인증 코드 재생성
async function regenerateVerificationCode() {
    if (!confirm('인증 코드를 재생성하시겠습니까?\\n\\n⚠️ 이전 코드는 사용할 수 없게 됩니다.')) return;
    try {
        const res = await fetch('/api/teachers/verification-code/regenerate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ directorId: currentUser.id })
        });
        const data = await res.json();
        
        if (data.success) {
            const newCode = data.code || (data.codeData && (data.codeData.code || data.codeData.verification_code));
            document.getElementById('verificationCode').textContent = newCode;
            alert('✅ 인증 코드가 재생성되었습니다!\\n\\n새 코드: ' + newCode);
        } else {
            alert('❌ 코드 재생성 실패: ' + (data.error || '알 수 없는 오류'));
        }
    } catch (error) {
        alert('코드 재생성 중 오류가 발생했습니다: ' + error.message);
    }
}

// 승인 대기 목록 로드
async function loadPendingApplications() {
    try {
        const res = await fetch('/api/teachers/applications?directorId=' + currentUser.id + '&status=pending');
        const data = await res.json();
        const container = document.getElementById('pendingList');
        const countBadge = document.getElementById('pendingBadge');
        const pendingCount = document.getElementById('pendingCount');
        
        if (!data.success || !data.applications || data.applications.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500 py-8">승인 대기 중인 신청이 없습니다.</div>';
            countBadge.textContent = '0';
            pendingCount.textContent = '0';
            return;
        }

        countBadge.textContent = data.applications.length;
        pendingCount.textContent = data.applications.length;
        container.innerHTML = data.applications.map(app => \`
            <div class="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <h3 class="text-lg font-bold text-gray-900">\${app.name}</h3>
                        <p class="text-sm text-gray-600">\${app.email}</p>
                        <p class="text-sm text-gray-500">\${app.phone || '-'}</p>
                        <p class="text-xs text-gray-400 mt-2">신청일: \${new Date(app.applied_at).toLocaleString('ko-KR')}</p>
                    </div>
                    <span class="px-3 py-1 bg-yellow-500 text-white rounded-full text-xs font-medium">
                        대기중
                    </span>
                </div>
                <div class="flex gap-2">
                    <button onclick="approveApplication(\${app.id}, '\${app.name}')" class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        <i class="fas fa-check mr-2"></i>승인
                    </button>
                    <button onclick="rejectApplication(\${app.id}, '\${app.name}')" class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                        <i class="fas fa-times mr-2"></i>거절
                    </button>
                </div>
            </div>
        \`).join('');
    } catch (error) {
        console.error('승인 대기 목록 로딩 실패:', error);
    }
}

// 선생님 승인
async function approveApplication(id, name) {
    if (!confirm(\`\${name} 선생님의 신청을 승인하시겠습니까?\`)) return;
    try {
        const res = await fetch(\`/api/teachers/applications/\${id}/approve\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ directorId: currentUser.id })
        });
        const data = await res.json();
        if (data.success) {
            alert(\`\${name} 선생님이 승인되었습니다!\`);
            loadPendingApplications();
            loadTeachersList();
        } else {
            alert('승인 실패: ' + data.error);
        }
    } catch (error) {
        alert('승인 중 오류가 발생했습니다.');
    }
}

// 선생님 거절
async function rejectApplication(id, name) {
    if (!confirm(\`\${name} 선생님의 신청을 거절하시겠습니까?\`)) return;
    const reason = prompt('거절 사유를 입력하세요 (선택사항):');
    try {
        const res = await fetch(\`/api/teachers/applications/\${id}/reject\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                directorId: currentUser.id,
                reason: reason || '승인 거부'
            })
        });
        const data = await res.json();
        if (data.success) {
            alert(\`\${name} 선생님의 신청이 거절되었습니다.\`);
            loadPendingApplications();
        } else {
            alert('거절 실패: ' + data.error);
        }
    } catch (error) {
        alert('거절 중 오류가 발생했습니다.');
    }
}

// 등록된 선생님 목록 로드
async function loadTeachersList() {
    try {
        const res = await fetch('/api/teachers/list?directorId=' + currentUser.id);
        const data = await res.json();
        const container = document.getElementById('teachersList');
        const totalCount = document.getElementById('totalTeachers');
        const assignedCount = document.getElementById('assignedCount');
        
        if (!data.success || data.teachers.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500 py-8">등록된 선생님이 없습니다.</div>';
            totalCount.textContent = '0';
            assignedCount.textContent = '0';
            return;
        }

        totalCount.textContent = data.teachers.length;
        let assignedCounter = 0;
        data.teachers.forEach(t => {
            if (t.class_count && t.class_count > 0) assignedCounter++;
        });
        assignedCount.textContent = assignedCounter;

        container.innerHTML = data.teachers.map(teacher => \`
            <div class="bg-white border rounded-xl p-6 hover:shadow-lg transition">
                <div class="flex items-start justify-between">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
                            <i class="fas fa-user-tie text-purple-600 text-2xl"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-gray-900">\${teacher.name}</h3>
                            <p class="text-sm text-gray-600">\${teacher.email}</p>
                            <p class="text-sm text-gray-500">\${teacher.phone || '-'}</p>
                            <span class="inline-block mt-2 px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-xs font-medium">
                                담당 반: \${teacher.class_count || 0}개
                            </span>
                        </div>
                    </div>
                    <button onclick="showTeacherPermissions(\${teacher.id}, '\${teacher.name}')" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        <i class="fas fa-cog mr-2"></i>권한 설정
                    </button>
                </div>
            </div>
        \`).join('');
    } catch (error) {
        console.error('선생님 목록 로딩 실패:', error);
    }
}

// 선생님 추가 모달
function openAddTeacherModal() {
    document.getElementById('addTeacherModal').classList.remove('hidden');
}

function closeAddTeacherModal() {
    document.getElementById('addTeacherModal').classList.add('hidden');
    document.getElementById('addTeacherForm').reset();
}

document.getElementById('addTeacherForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        password: formData.get('password'),
        directorId: currentUser.id
    };

    try {
        const res = await fetch('/api/teachers/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await res.json();
        
        if (result.success) {
            alert(\`\${data.name} 선생님이 추가되었습니다!\`);
            closeAddTeacherModal();
            loadTeachersList();
        } else {
            alert('추가 실패: ' + result.error);
        }
    } catch (error) {
        alert('선생님 추가 중 네트워크 오류가 발생했습니다: ' + error.message);
    }
});

// 권한 설정 모달
async function showTeacherPermissions(teacherId, teacherName) {
    document.getElementById('permissionsModal').classList.remove('hidden');
    document.getElementById('permissionsTeacherName').textContent = teacherName;
    document.getElementById('permissionsTeacherId').value = teacherId;
    
    try {
        // 반 목록 로드
        const userDataHeader = btoa(unescape(encodeURIComponent(JSON.stringify(currentUser))));
        const classesRes = await fetch('/api/classes', {
            headers: { 'X-User-Data-Base64': userDataHeader }
        });
        const classesData = await classesRes.json();
        
        if (classesData.success) {
            const classList = document.getElementById('classesCheckboxList');
            if (classesData.classes && classesData.classes.length > 0) {
                classList.innerHTML = classesData.classes.map(cls => \`
                    <label class="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input type="checkbox" value="\${cls.id}" class="class-checkbox w-4 h-4 text-purple-600 rounded focus:ring-purple-500">
                        <span class="ml-2 text-sm text-gray-700">\${cls.class_name} \${cls.grade ? '(' + cls.grade + ')' : ''}</span>
                    </label>
                \`).join('');
            } else {
                classList.innerHTML = '<div class="text-center text-gray-500 py-4">등록된 반이 없습니다</div>';
            }
        }
        
        // 선생님 권한 정보 로드
        const permRes = await fetch(\`/api/teachers/\${teacherId}/permissions?directorId=\${currentUser.id}\`);
        const permData = await permRes.json();
        
        if (permData.success) {
            document.getElementById('canViewAllStudents').checked = permData.permissions.canViewAllStudents || false;
            document.getElementById('canWriteDailyReports').checked = permData.permissions.canWriteDailyReports || false;
            
            const assignedClasses = permData.permissions.assignedClasses || [];
            document.querySelectorAll('.class-checkbox').forEach(checkbox => {
                checkbox.checked = assignedClasses.includes(parseInt(checkbox.value));
            });
        }
    } catch (error) {
        console.error('권한 로드 실패:', error);
        alert('권한 정보를 불러오는 중 오류가 발생했습니다.');
    }
}

function closePermissionsModal() {
    document.getElementById('permissionsModal').classList.add('hidden');
    document.getElementById('permissionsForm').reset();
}

document.getElementById('permissionsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const teacherId = document.getElementById('permissionsTeacherId').value;
    const teacherName = document.getElementById('permissionsTeacherName').textContent;
    
    const assignedClasses = Array.from(document.querySelectorAll('.class-checkbox:checked'))
        .map(cb => parseInt(cb.value));
    
    const permissions = {
        canViewAllStudents: document.getElementById('canViewAllStudents').checked,
        canWriteDailyReports: document.getElementById('canWriteDailyReports').checked,
        assignedClasses: assignedClasses
    };
    
    try {
        const res = await fetch(\`/api/teachers/\${teacherId}/permissions\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                directorId: currentUser.id,
                permissions: permissions
            })
        });
        
        const data = await res.json();
        
        if (data.success) {
            alert(\`\${teacherName} 선생님의 권한이 저장되었습니다!\`);
            closePermissionsModal();
        } else {
            alert('권한 저장 실패: ' + data.error);
        }
    } catch (error) {
        alert('권한 저장 중 오류가 발생했습니다.');
    }
});
