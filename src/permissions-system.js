/**
 * 통합 권한 관리 시스템
 * 모든 페이지에서 공통으로 사용하는 권한 로직
 */

// ============================================
// 1. API 엔드포인트 (하나로 통일)
// ============================================
const PERMISSIONS_API = {
    // 반 목록 조회
    getClasses: (userId) => `/api/classes/list?userId=${userId}&userType=director`,
    
    // 선생님 권한 조회
    getPermissions: (teacherId, directorId) => `/api/teachers/${teacherId}/permissions?directorId=${directorId}`,
    
    // 선생님 권한 저장
    savePermissions: (teacherId) => `/api/teachers/${teacherId}/permissions`,
    
    // 학생 목록 조회
    getStudents: () => `/api/students`,
    
    // 선생님 권한 디버그
    debugPermissions: () => `/api/debug/my-permissions`
};

// ============================================
// 2. 권한 데이터 구조 (표준화)
// ============================================
const PermissionLevel = {
    ALL: 'all',           // 모두 다 공개
    ASSIGNED: 'assigned', // 배정된 반만 공개
    NONE: 'none'          // 권한 없음
};

// ============================================
// 3. 현재 사용자 정보 가져오기
// ============================================
function getCurrentUser() {
    try {
        const userStr = localStorage.getItem('user');
        if (!userStr) return null;
        
        const user = JSON.parse(userStr);
        
        // user_type 호환성 처리
        if (!user.user_type && user.role) {
            user.user_type = user.role;
        }
        
        return user;
    } catch (e) {
        console.error('[PermissionSystem] Failed to get current user:', e);
        return null;
    }
}

// ============================================
// 4. Base64 인코딩 (API 헤더용)
// ============================================
function encodeUserData(user) {
    try {
        return btoa(unescape(encodeURIComponent(JSON.stringify(user))));
    } catch (e) {
        console.error('[PermissionSystem] Failed to encode user data:', e);
        return null;
    }
}

// ============================================
// 5. 반 목록 로드 (통일된 방식)
// ============================================
async function loadClassList(userId) {
    console.log('[PermissionSystem] Loading classes for userId:', userId);
    
    try {
        const response = await fetch(PERMISSIONS_API.getClasses(userId));
        const data = await response.json();
        
        console.log('[PermissionSystem] Classes response:', data);
        
        if (data.success && data.classes) {
            return {
                success: true,
                classes: data.classes.map(cls => ({
                    id: cls.id,
                    name: cls.class_name || cls.name,
                    grade: cls.grade || cls.grade_level || '',
                    displayName: `${cls.class_name || cls.name}${cls.grade || cls.grade_level ? ' (' + (cls.grade || cls.grade_level) + ')' : ''}`
                }))
            };
        }
        
        return { success: false, classes: [], error: data.error };
    } catch (e) {
        console.error('[PermissionSystem] Failed to load classes:', e);
        return { success: false, classes: [], error: e.message };
    }
}

// ============================================
// 6. 선생님 권한 로드 (통일된 방식)
// ============================================
async function loadTeacherPermissions(teacherId, directorId) {
    console.log('[PermissionSystem] Loading permissions for teacher:', teacherId, 'director:', directorId);
    
    try {
        const response = await fetch(PERMISSIONS_API.getPermissions(teacherId, directorId));
        const data = await response.json();
        
        console.log('[PermissionSystem] Permissions response:', data);
        
        if (data.success && data.permissions) {
            const perms = data.permissions;
            
            // 권한 레벨 판단
            let level = PermissionLevel.NONE;
            if (perms.canViewAllStudents === true) {
                level = PermissionLevel.ALL;
            } else if (perms.assignedClasses && perms.assignedClasses.length > 0) {
                level = PermissionLevel.ASSIGNED;
            }
            
            return {
                success: true,
                level: level,
                canViewAllStudents: perms.canViewAllStudents || false,
                canWriteDailyReports: perms.canWriteDailyReports || false,
                assignedClasses: perms.assignedClasses || []
            };
        }
        
        return {
            success: false,
            level: PermissionLevel.NONE,
            canViewAllStudents: false,
            canWriteDailyReports: false,
            assignedClasses: []
        };
    } catch (e) {
        console.error('[PermissionSystem] Failed to load permissions:', e);
        return {
            success: false,
            level: PermissionLevel.NONE,
            canViewAllStudents: false,
            canWriteDailyReports: false,
            assignedClasses: []
        };
    }
}

// ============================================
// 7. 선생님 권한 저장 (통일된 방식)
// ============================================
async function saveTeacherPermissions(teacherId, directorId, accessLevel, assignedClasses = []) {
    console.log('[PermissionSystem] Saving permissions:', {
        teacherId,
        directorId,
        accessLevel,
        assignedClasses
    });
    
    // 권한 객체 생성
    let permissions;
    
    if (accessLevel === PermissionLevel.ALL) {
        permissions = {
            canViewAllStudents: true,
            canWriteDailyReports: true,
            assignedClasses: []
        };
    } else if (accessLevel === PermissionLevel.ASSIGNED) {
        if (assignedClasses.length === 0) {
            return {
                success: false,
                error: '최소 1개 이상의 반을 배정해주세요.'
            };
        }
        
        permissions = {
            canViewAllStudents: false,
            canWriteDailyReports: true,
            assignedClasses: assignedClasses
        };
    } else {
        return {
            success: false,
            error: '유효하지 않은 권한 레벨입니다.'
        };
    }
    
    try {
        const response = await fetch(PERMISSIONS_API.savePermissions(teacherId), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                directorId: directorId,
                permissions: permissions
            })
        });
        
        const data = await response.json();
        
        console.log('[PermissionSystem] Save response:', data);
        
        if (data.success) {
            // 저장 후 검증
            const verifyResult = await loadTeacherPermissions(teacherId, directorId);
            
            return {
                success: true,
                message: '권한이 저장되었습니다.',
                verification: verifyResult
            };
        }
        
        return {
            success: false,
            error: data.error || '권한 저장 실패'
        };
    } catch (e) {
        console.error('[PermissionSystem] Failed to save permissions:', e);
        return {
            success: false,
            error: e.message
        };
    }
}

// ============================================
// 8. 권한 모달 렌더링 (UI 통일)
// ============================================
function renderPermissionModal(classListElementId, permissions) {
    const classList = document.getElementById(classListElementId);
    if (!classList) {
        console.error('[PermissionSystem] Class list element not found:', classListElementId);
        return;
    }
    
    const currentUser = getCurrentUser();
    if (!currentUser) {
        console.error('[PermissionSystem] No current user');
        return;
    }
    
    // 반 목록 로드
    loadClassList(currentUser.id).then(result => {
        if (result.success && result.classes.length > 0) {
            classList.innerHTML = result.classes.map(cls => `
                <label class="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input type="checkbox" value="${cls.id}" class="class-checkbox w-4 h-4 text-purple-600 rounded focus:ring-purple-500">
                    <span class="ml-2 text-sm text-gray-700">${cls.displayName}</span>
                </label>
            `).join('');
            
            // 기존 권한이 있으면 체크 표시
            if (permissions && permissions.assignedClasses) {
                document.querySelectorAll('.class-checkbox').forEach(checkbox => {
                    checkbox.checked = permissions.assignedClasses.includes(parseInt(checkbox.value));
                });
            }
        } else {
            classList.innerHTML = '<div class="text-center text-gray-500 py-4">등록된 반이 없습니다</div>';
        }
    });
}

// ============================================
// 9. 권한 레벨 설정 (라디오 버튼)
// ============================================
function setPermissionLevel(level, permissions) {
    const allRadio = document.getElementById('accessLevelAll');
    const assignedRadio = document.getElementById('accessLevelAssigned');
    const classSection = document.getElementById('classAssignmentSection');
    const allOption = document.getElementById('allAccessOption');
    const assignedOption = document.getElementById('assignedOnlyOption');
    
    if (!allRadio || !assignedRadio) {
        console.error('[PermissionSystem] Radio buttons not found');
        return;
    }
    
    if (level === PermissionLevel.ALL) {
        allRadio.checked = true;
        assignedRadio.checked = false;
        if (classSection) classSection.style.display = 'none';
        if (allOption) {
            allOption.classList.add('border-purple-500', 'bg-purple-50');
        }
        if (assignedOption) {
            assignedOption.classList.remove('border-purple-500', 'bg-purple-50');
        }
    } else if (level === PermissionLevel.ASSIGNED) {
        allRadio.checked = false;
        assignedRadio.checked = true;
        if (classSection) classSection.style.display = 'block';
        if (allOption) {
            allOption.classList.remove('border-purple-500', 'bg-purple-50');
        }
        if (assignedOption) {
            assignedOption.classList.add('border-purple-500', 'bg-purple-50');
        }
    } else {
        allRadio.checked = false;
        assignedRadio.checked = false;
        if (classSection) classSection.style.display = 'none';
        if (allOption) {
            allOption.classList.remove('border-purple-500', 'bg-purple-50');
        }
        if (assignedOption) {
            assignedOption.classList.remove('border-purple-500', 'bg-purple-50');
        }
    }
}

// ============================================
// 10. 저장 결과 메시지 생성
// ============================================
function generateSaveMessage(teacherName, verification) {
    let message = `✅ ${teacherName} 선생님의 권한이 저장되었습니다!\n\n`;
    
    if (verification.level === PermissionLevel.ALL) {
        message += '📌 권한: 모두 다 공개\n';
        message += '• 모든 학생 조회 가능\n';
        message += '• 모든 반/과목 관리 가능\n';
        message += '• 랜딩페이지 접근 가능';
    } else if (verification.level === PermissionLevel.ASSIGNED) {
        message += '📌 권한: 배정된 반만 공개\n';
        message += `• 배정된 반: ${verification.assignedClasses.length}개\n`;
        message += '• 배정된 반의 학생만 조회\n';
        message += '• 배정된 반의 일일 성과만 작성';
    } else {
        message += '⚠️ 권한: 없음\n';
        message += '• 권한이 설정되지 않았습니다';
    }
    
    return message;
}

// ============================================
// 11. 전역 노출 (window 객체에 등록)
// ============================================
if (typeof window !== 'undefined') {
    window.PermissionSystem = {
        // 상수
        PermissionLevel,
        PERMISSIONS_API,
        
        // 함수
        getCurrentUser,
        encodeUserData,
        loadClassList,
        loadTeacherPermissions,
        saveTeacherPermissions,
        renderPermissionModal,
        setPermissionLevel,
        generateSaveMessage
    };
    
    console.log('[PermissionSystem] Initialized and exposed to window object');
}
