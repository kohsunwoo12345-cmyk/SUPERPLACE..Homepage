# 🚨 프로덕션 DB 마이그레이션 필수!

## 현재 상황
- ✅ **로컬 DB**: 컬럼 추가 완료 (thumbnail_url, og_title, og_description)
- ❌ **프로덕션 DB**: 컬럼 없음 → **랜딩페이지 생성 실패**

## 증상
- 미리보기에서는 이미지가 보임 (프론트엔드 작동)
- 실제 공유 URL에는 이미지가 안 보임 (백엔드 저장 실패)
- 에러 메시지: "D1_ERROR: table landing_pages has no column named thumbnail_url"

---

## ⚡ 즉시 실행 필수!

### 1단계: Cloudflare D1 콘솔 접속
👉 **링크**: https://dash.cloudflare.com/117379ce5c9d9af026b16c9cf21b10d5/workers/d1/8c106540-21b4-4fa9-8879-c4956e459ca1

### 2단계: Console 탭 클릭
화면 상단에서 **Console** 탭을 찾아 클릭합니다.

### 3단계: SQL 명령어 복사 & 실행

아래 SQL을 **콘솔 입력창**에 붙여넣고 **Execute** 버튼을 클릭하세요:

```sql
-- 썸네일 컬럼 추가
ALTER TABLE landing_pages ADD COLUMN thumbnail_url TEXT;

-- OG 제목 컬럼 추가
ALTER TABLE landing_pages ADD COLUMN og_title TEXT;

-- OG 설명 컬럼 추가
ALTER TABLE landing_pages ADD COLUMN og_description TEXT;
```

### 4단계: 성공 확인
✅ "Query executed successfully" 메시지가 나타나면 성공!

---

## 🎯 마이그레이션 후 즉시 테스트

1. **랜딩페이지 생성기 접속**
   - URL: https://superplace-academy.pages.dev/tools/landing-builder
   - 로그인: test1@superplace.co.kr / test1234!

2. **템플릿 선택**: 예) 🏫 학원 소개 페이지

3. **정보 입력**: 학원명, 위치 등

4. **썸네일 업로드**: 
   - 파일 선택하여 업로드
   - ✅ "이미지가 성공적으로 업로드되었습니다!" 확인
   - ✅ 미리보기 이미지 표시 확인

5. **OG 정보 입력**:
   - 큰 글자: "꾸메땅학원 겨울방학 특강 모집"
   - 작은 글자: "중등 영어/수학 집중 케어! 선착순 20명"

6. **랜딩페이지 생성**:
   - 🚀 "랜딩페이지 생성하기" 버튼 클릭
   - ✅ 에러 없이 생성 성공 확인
   - ✅ 공유 링크 복사

7. **카카오톡 공유**:
   - 링크를 카카오톡에 붙여넣기
   - ✅ 썸네일 이미지 표시 확인
   - ✅ 큰 글자(제목) 표시 확인
   - ✅ 작은 글자(설명) 표시 확인

---

## 🔍 문제 해결 가이드

### 문제 1: "D1_ERROR: table landing_pages has no column named thumbnail_url"
**원인**: 프로덕션 DB에 컬럼이 없음  
**해결**: 위의 SQL 명령어 실행

### 문제 2: SQL 실행 후에도 에러
**원인**: 브라우저 캐시  
**해결**: 
```
1. Chrome: Ctrl + Shift + Delete → 캐시 삭제
2. 페이지 새로고침 (F5)
3. 다시 테스트
```

### 문제 3: 카카오톡에서 썸네일이 안 보임
**원인**: 카카오톡 캐시  
**해결**: 
```
1. 카카오톡 개발자 도구 사용
   URL: https://developers.kakao.com/tool/debugger/sharing
2. 공유 링크 입력
3. "캐시 초기화" 클릭
```

---

## ✅ 완료 체크리스트

- [ ] Cloudflare D1 콘솔 접속 완료
- [ ] Console 탭에서 SQL 실행 완료
- [ ] "Query executed successfully" 확인
- [ ] 랜딩페이지 생성기에서 새 페이지 생성 테스트
- [ ] 에러 없이 생성 성공 확인
- [ ] 썸네일 이미지 업로드 확인
- [ ] OG 제목/설명 입력 확인
- [ ] 카카오톡 공유 시 썸네일 표시 확인
- [ ] 카카오톡 공유 시 제목/설명 표시 확인

---

## 🎉 성공 시 기대 효과

### Before (현재 - DB 마이그레이션 전)
❌ 썸네일 업로드 불가 (에러)  
❌ 공유 시 기본 이미지만 표시  
❌ 공유 시 기본 제목/설명만 표시

### After (DB 마이그레이션 후)
✅ 썸네일 자유롭게 업로드  
✅ 공유 시 커스텀 썸네일 표시  
✅ 공유 시 커스텀 제목/설명 표시  
✅ 카카오톡 미리보기 완벽!

---

## 📞 문의사항

마이그레이션 실행 중 문제가 발생하면:
1. **에러 메시지 전체 복사**
2. **어느 단계에서 문제가 발생했는지**
3. **스크린샷 첨부**

위 정보를 보내주시면 즉시 해결해드리겠습니다!

---

**원장님, 지금 바로 실행해주세요! 5분이면 완료됩니다! 🚀**
