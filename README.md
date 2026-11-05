# 김혜승 개인 홈페이지 + 방명록

정적 HTML 포트폴리오 사이트에 방명록(자유 입력)을 더한 프로젝트입니다.
방명록 데이터는 Supabase에 저장되고, Netlify Function이 모든 쓰기를 서버에서 검증합니다.

## 폴더 구조

```
public/                  공개 배포 대상 (HTML/CSS/브라우저 JS)
  └─ index.html
netlify/functions/       서버 함수 (공개 안 됨)
  └─ guestbook.js
supabase/schema.sql      방명록 테이블 + RLS 생성 SQL
netlify.toml             Netlify 배포 설정
package.json             함수 의존성 (@supabase/supabase-js)
.env.example             환경 변수 예시 (.env 는 커밋하지 않음)
docs/feature-plan.md     기능 명세 및 검사 방법
```

## 설정 순서

### 1. Supabase
1. [supabase.com](https://supabase.com) 에서 프로젝트 생성
2. SQL Editor 에 `supabase/schema.sql` 내용을 붙여넣고 실행 (테이블 + RLS 생성)
3. Settings > API 에서 아래 두 값을 확인
   - Project URL  → `SUPABASE_URL`
   - service_role key (secret) → `SUPABASE_SERVICE_ROLE_KEY`

> service_role 키는 비밀값입니다. 브라우저 코드나 공개 저장소에 절대 넣지 마세요.

### 2. 로컬 실행 (선택)
```bash
npm install
# .env.example 을 복사해 .env 를 만들고 값 입력
netlify dev
```
`netlify dev` 가 정적 사이트와 함수를 함께 띄워 http://localhost:8888 에서 확인할 수 있습니다.

### 3. Netlify 배포 (대시보드)
1. 이 저장소를 GitHub에 올린 뒤 Netlify 에서 "Add new site > Import an existing project" 로 연결
2. 빌드 설정
   - Build command: 비움 (정적)
   - Publish directory: `public`
   - Functions directory: `netlify/functions` (netlify.toml 에 이미 지정됨)
3. Site settings > Environment variables 에 추가
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. 배포

## 접근 제한 요약
- 브라우저에는 Supabase 키를 두지 않음. 서버 함수만 service_role 로 접근.
- 테이블에 RLS 활성화 → anon(브라우저 직접 접근) 차단.
- 서버에서 이름(≤20자)·메시지(1~200자) 재검증.
- 목록 렌더링은 `textContent` 로만 처리해 XSS 방지.

## 기존 GitHub Pages
기존 GitHub Pages 설정은 변경하지 않았습니다. Netlify 배포는 그와 별개로 추가됩니다.
