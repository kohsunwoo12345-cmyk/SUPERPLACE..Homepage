// 선생님 관리 JavaScript

console.log('🎓 Teacher Management JS Loaded');

// 현재 로그인한 사용자 정보
let currentUser = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    // 로컬 스토리지에서 사용자 정보 가져오기
    const userStr = localStorage.getItem('user');
    if (userStr) {
        currentUser = JSON.parse(userStr);
        console.log('Current user:', currentUser);
        
        // 원장님만 접근 가능
        if (currentUser.user_type === 'teacher') {
            alert('원장님만 접근 가능한 페이지입니다.');
            window.location.href = '/students';
            return;
        }
        
        // 데이터 로드
        await loadTeachers();
        await loadClasses();
    } else {
        alert('로그인이 필요합니다.');
        window.location.href = '/login';
    }
});

// 선생님 목록 로드
async function loadTeachers() {
    try {
        const response = await fetch(`/api/teachers/list?directorId=${currentUser.id}`);
        const data = await response.json();
        
        if (data.success) {
            renderTeachers(data.teachers);
        } else {
            console.error('Failed to load teachers:', data.error);
        }
    } catch (error) {
        console.error('Load teachers error:', error);
    }
}

// 선생님 목록 렌더링
function renderTeachers(teachers) {
    const container = document.getElementById('teacherList');
    if (!container) return;
    
    if (!teachers || teachers.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-500">
                <i class="fas fa-user-friends text-4xl mb-4"></i>
                <p>등록된 선생님이 없습니다.</p>
                <p class="text-sm mt-2">선생님 계정을 생성해주세요.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = teachers.map(teacher => `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
            <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-chalkboard-teacher text-purple-600 text-xl"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-gray-900">${teacher.name}</h3>
                        <p class="text-sm text-gray-500">${teacher.email}</p>
                    </div>
                </div>
                <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    담당 반: ${teacher.class_count || 0}개
                </span>
            </div>
            
            <div class="space-y-2 text-sm">
                <div class="flex items-center gap-2 text-gray-600">
                    <i class="fas fa-phone w-4"></i>
                    <span>${teacher.phone || '-'}</span>
                </div>
                <div class="flex items-center gap-2 text-gray-600">
                    <i class="fas fa-calendar w-4"></i>
                    <span>등록일: ${new Date(teacher.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
            </div>
            
            <div class="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                <button onclick="viewTeacherDetail(${teacher.id})" class="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
                    <i class="fas fa-eye mr-1"></i> 상세보기
                </button>
                <button onclick="deleteTeacher(${teacher.id}, '${teacher.name}')" class="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition text-sm">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// 반 목록 로드
async function loadClasses() {
    try {
        const response = await fetch(`/api/classes/list?userId=${currentUser.id}&userType=director`);
        const data = await response.json();
        
        if (data.success) {
            renderClasses(data.classes);
        } else {
            console.error('Failed to load classes:', data.error);
        }
    } catch (error) {
        console.error('Load classes error:', error);
    }
}

// 반 목록 렌더링
function renderClasses(classes) {
    const container = document.getElementById('classList');
    if (!container) return;
    
    if (!classes || classes.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-500">
                <i class="fas fa-chalkboard text-4xl mb-4"></i>
                <p>등록된 반이 없습니다.</p>
                <p class="text-sm mt-2">반을 생성해주세요.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = classes.map(cls => `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
            <div class="flex items-start justify-between mb-4">
                <div>
                    <h3 class="text-lg font-bold text-gray-900">${cls.name}</h3>
                    <p class="text-sm text-gray-500 mt-1">${cls.description || ''}</p>
                </div>
                <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    ${cls.student_count || 0}명
                </span>
            </div>
            
            <div class="space-y-2 text-sm">
                ${cls.teacher_name ? `
                <div class="flex items-center gap-2 text-gray-600">
                    <i class="fas fa-user-tie w-4"></i>
                    <span>${cls.teacher_name} 선생님</span>
                </div>
                ` : `
                <div class="flex items-center gap-2 text-orange-600">
                    <i class="fas fa-exclamation-circle w-4"></i>
                    <span>선생님 미배정</span>
                </div>
                `}
                ${cls.grade_level ? `
                <div class="flex items-center gap-2 text-gray-600">
                    <i class="fas fa-graduation-cap w-4"></i>
                    <span>${cls.grade_level} - ${cls.subject || ''}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                <button onclick="assignTeacherToClass(${cls.id}, '${cls.name}')" class="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm">
                    <i class="fas fa-user-plus mr-1"></i> 선생님 배정
                </button>
                <button onclick="viewClassDetail(${cls.id})" class="px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition text-sm">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// 선생님 계정 생성 모달 열기
function openCreateTeacherModal() {
    document.getElementById('createTeacherModal').classList.remove('hidden');
}

// 선생님 계정 생성 모달 닫기
function closeCreateTeacherModal() {
    document.getElementById('createTeacherModal').classList.add('hidden');
    document.getElementById('createTeacherForm').reset();
}

// 선생님 계정 생성
async function createTeacher(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = {
        email: form.email.value,
        password: form.password.value,
        name: form.name.value,
        phone: form.phone.value,
        directorId: currentUser.id
    };
    
    // 비밀번호 확인
    if (formData.password !== form.confirmPassword.value) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
    }
    
    try {
        const response = await fetch('/api/teachers/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(data.message);
            closeCreateTeacherModal();
            await loadTeachers();
        } else {
            alert('오류: ' + data.error);
        }
    } catch (error) {
        console.error('Create teacher error:', error);
        alert('선생님 계정 생성 중 오류가 발생했습니다.');
    }
}

// 반 생성 모달 열기
function openCreateClassModal() {
    document.getElementById('createClassModal').classList.remove('hidden');
}

// 반 생성 모달 닫기
function closeCreateClassModal() {
    document.getElementById('createClassModal').classList.add('hidden');
    document.getElementById('createClassForm').reset();
}

// 반 생성
async function createClass(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = {
        name: form.className.value,
        description: form.description.value,
        gradeLevel: form.gradeLevel.value,
        subject: form.subject.value,
        maxStudents: parseInt(form.maxStudents.value) || 20,
        userId: currentUser.id
    };
    
    try {
        const response = await fetch('/api/classes/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(data.message);
            closeCreateClassModal();
            await loadClasses();
        } else {
            alert('오류: ' + data.error);
        }
    } catch (error) {
        console.error('Create class error:', error);
        alert('반 생성 중 오류가 발생했습니다.');
    }
}

// 반에 선생님 배정
async function assignTeacherToClass(classId, className) {
    // 선생님 목록 가져오기
    const response = await fetch(`/api/teachers/list?directorId=${currentUser.id}`);
    const data = await response.json();
    
    if (!data.success || !data.teachers || data.teachers.length === 0) {
        alert('배정할 선생님이 없습니다. 먼저 선생님 계정을 생성해주세요.');
        return;
    }
    
    // 선생님 선택 프롬프트
    const teacherOptions = data.teachers.map((t, i) => `${i + 1}. ${t.name} (${t.email})`).join('\n');
    const selection = prompt(`${className}에 배정할 선생님을 선택하세요:\n\n${teacherOptions}\n\n번호를 입력하세요:`);
    
    if (!selection) return;
    
    const index = parseInt(selection) - 1;
    if (index < 0 || index >= data.teachers.length) {
        alert('잘못된 선택입니다.');
        return;
    }
    
    const selectedTeacher = data.teachers[index];
    
    try {
        const assignResponse = await fetch(`/api/classes/${classId}/assign-teacher`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                teacherId: selectedTeacher.id,
                userId: currentUser.id
            })
        });
        
        const assignData = await assignResponse.json();
        
        if (assignData.success) {
            alert(`${selectedTeacher.name} 선생님이 ${className}에 배정되었습니다.`);
            await loadClasses();
            await loadTeachers();
        } else {
            alert('오류: ' + assignData.error);
        }
    } catch (error) {
        console.error('Assign teacher error:', error);
        alert('선생님 배정 중 오류가 발생했습니다.');
    }
}

// 선생님 상세보기 (추후 구현)
function viewTeacherDetail(teacherId) {
    window.location.href = `/admin/users/${teacherId}`;
}

// 반 상세보기
function viewClassDetail(classId) {
    window.location.href = `/students/classes/${classId}`;
}

// 선생님 삭제
async function deleteTeacher(teacherId, teacherName) {
    if (!confirm(`${teacherName} 선생님의 계정을 삭제하시겠습니까?\n\n삭제 시 복구할 수 없습니다.`)) {
        return;
    }
    
    // TODO: 삭제 API 구현
    alert('선생님 삭제 기능은 곧 제공됩니다.');
}

// 로그아웃
function logout() {
    if (confirm('로그아웃 하시겠습니까?')) {
        localStorage.removeItem('user');
        window.location.href = '/';
    }
}
