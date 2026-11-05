# 기능 명세: 방명록 (Guestbook)

이 문서는 개인 홈페이지에 추가할 **방명록(자유 입력)** 기능의 명세와 검사 방법을 기록한다.
단일 출처(허브)는 Notion 프로젝트 기록 페이지이며, 이 문서는 구현 단위의 세부 계획을 담는다.

- **대상 사이트:** hyeseung0320-commits.github.io (정적 HTML 한 장)
- **선택 기능:** 방명록 (자유 입력)
- **배포 서비스:** Netlify (정적 호스팅 + Netlify Functions)
- **데이터 저장소:** Supabase
- **접근 방식:** 서버 함수가 모든 쓰기를 검증 (service_role 키는 서버에서만 사용)
- **상태:** 계획 확정 / 구현 전 (아직 커밋·push 안 함)

---

## 1. 범위 (가장 작은 완성 버전)

현재 정적 홈페이지를 그대로 유지하고 프레임워크는 도입하지 않는다.

**포함**
- Supabase 테이블 1개 (`guestbook`)
- Netlify Function 1개 (`guestbook`): `POST`=작성, `GET`=최근 20개 조회
- index.html에 방명록 섹션 1개 추가 (이름·메시지·버튼·목록)
- 서버 측 길이 검증 + RLS로 브라우저 직접 접근 차단

**제외 (추후 확장)**
- 로그인, 메시지 수정/삭제, 페이지네이션, 신고, 관리자 화면

---

## 2. 화면 요소

### 입력 영역 (응원 하트 섹션 아래 새 섹션)
- 이름 입력란: `input[type=text]`, 선택 입력, 최대 20자. 비우면 "익명"으로 저장.
- 메시지 입력란: `textarea`, 필수, 1~200자.
- 남은 글자 수 표시: 예 `32 / 200`.
- "방명록 남기기" 버튼.

### 결과 영역
- 최근 메시지 목록: 최신순, 최대 20개. 각 항목에 이름 · 메시지 · 작성 시각.
- 로딩 상태: "불러오는 중..."
- 빈 상태: "아직 방명록이 없어요. 첫 메시지를 남겨 주세요!"

---

## 3. 저장할 항목

테이블 `guestbook` (메시지 1건 = 행 1개)

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | bigint (identity) | PK, 자동 생성 |
| `name` | text | 기본값 `'익명'`, 길이 1~20 |
| `message` | text | NOT NULL, 길이 1~200 |
| `created_at` | timestamptz | 기본값 `now()` |

저장하지 않는 것: 이메일, IP, 비밀번호 등 개인정보 (최소 수집).

---

## 4. 성공 / 실패 동작

### 작성 성공
- 입력란 비우기 → 새 메시지를 목록 맨 위에 추가 → "등록됐어요! 😊" 잠깐 표시.

### 작성 실패
- 메시지 비어 있음: "메시지를 입력해 주세요" 표시, 전송 안 함.
- 200자 초과: 버튼 비활성화 + 글자 수 빨간색.
- 네트워크/서버 오류: "잠시 후 다시 시도해 주세요" 표시, 입력 내용 유지.

### 조회 실패
- "방명록을 불러오지 못했어요. 새로고침 해 주세요" 표시.

---

## 5. 데이터 흐름

```
브라우저 (index.html)
  │  POST /.netlify/functions/guestbook   (name, message)
  │  GET  /.netlify/functions/guestbook   (최근 20개 요청)
  ▼
Netlify Function (서버, 비공개)
  │  service_role 키로 Supabase 호출  ← 키는 환경변수, 브라우저에 노출 안 됨
  ▼
Supabase (guestbook 테이블)
```

---

## 6. 접근 제한 (자유 입력 필수 조치)

자유 입력 방명록은 스팸·악성 입력·도배·XSS에 노출되므로 다음을 적용한다.

1. **키 분리:** 브라우저에는 어떤 Supabase 키도 두지 않는다. 서버 함수에서만 `service_role` 키로 접근한다.
2. **RLS 활성화:** `guestbook` 테이블에 Row Level Security를 켠다. anon 역할에는 정책을 부여하지 않아 브라우저 직접 읽기/쓰기를 차단한다. 오직 service_role(서버 함수)만 통과.
3. **서버 측 검증:** 함수에서 메시지(1~200자)·이름(≤20자)을 재검증한다. 빈 메시지·초과 입력은 거부(400). 브라우저 검증은 우회 가능하므로 서버에서 반드시 재확인.
4. **도배 방지(기본):** 조회는 최신 20개만 반환. (심화 선택: 동일 내용 연속 전송 차단, 레이트 리밋)
5. **XSS 방지:** 목록 렌더링 시 `textContent`로 삽입하여 스크립트 주입을 막는다.

---

## 7. 폴더 구조 (목표)

```
hyeseung0320-commits.github.io/
├─ public/                 ← 공개 배포 대상 (HTML/CSS/JS/이미지만)
│   └─ index.html
├─ netlify/
│   └─ functions/
│       └─ guestbook.js    ← 서버 함수 (service_role 키 사용, 공개 안 됨)
├─ netlify.toml            ← publish=public, functions=netlify/functions
├─ docs/
│   └─ feature-plan.md     ← 이 문서
├─ .gitignore              ← .env, node_modules 등 제외
└─ .env                    ← 로컬 전용(SUPABASE_URL, SERVICE_ROLE_KEY), 커밋 안 함
```

**공개 출력 제외 대상:** `.git`, `.env`, `.kiro`, 개인 기록, `node_modules`, 서버 함수 소스. 서버 함수는 정적 공개 폴더(`public/`)에 복사하지 않는다. 기존 GitHub Pages 설정은 건드리지 않는다.

---

## 8. Netlify 설정 (대시보드 입력 예정값)

- Publish directory: `public`
- Functions directory: `netlify/functions`
- Build command: 없음 (정적, 빌드 불필요)
- 환경 변수 (대시보드 Site settings → Environment variables):
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- 배포 브랜치: 추후 생성할 배포용 브랜치 (main에 직접 push 금지)

---

## 9. 검사 방법 (Verification)

### 수동 기능 테스트
1. 로컬: `netlify dev`로 함수 포함 로컬 실행 후 방명록 섹션 확인 (Node/npm 및 Netlify CLI 설치 필요).
2. 작성 성공: 이름+메시지 입력 → 등록 → 목록 맨 위에 즉시 표시 확인.
3. 익명 저장: 이름 비우고 메시지만 입력 → "익명"으로 저장되는지 확인.
4. 빈 메시지: 메시지 없이 전송 → "메시지를 입력해 주세요" 표시, 전송 안 됨 확인.
5. 200자 초과: 201자 입력 → 버튼 비활성화 + 글자 수 빨간색 확인.
6. 조회: 새로고침 후 최근 20개가 최신순으로 보이는지 확인.

### 접근 제한 테스트
7. RLS: 브라우저에서 Supabase anon 키로 직접 `guestbook` 접근 시도 → 차단되는지 확인.
8. 서버 검증 우회 시도: 함수에 빈 메시지/초과 길이를 직접 POST → 400으로 거부되는지 확인.
9. XSS: 메시지에 `<script>` 등 입력 → 텍스트로만 표시되고 실행되지 않는지 확인.

### 비밀값 노출 점검
10. 배포된 공개 파일(`public/`)과 브라우저 소스에 `SERVICE_ROLE_KEY`가 없는지 확인.
11. `.env`, `.kiro`, 개인 기록, `node_modules`가 공개 출력에 포함되지 않는지 확인.

---

## 10. 다음 단계 (이 문서 확정 이후)

1. Supabase 테이블 + RLS 생성.
2. `public/`로 index.html 정리, 방명록 섹션 추가.
3. `netlify/functions/guestbook.js` 작성.
4. `netlify.toml`, `.gitignore`, `.env`(로컬) 구성.
5. 로컬 검사 → 저장소 연결 → 대시보드 환경 변수 입력 → 배포.

> 현 시점 상태: 계획만 기록. 구현·커밋·push는 아직 하지 않는다.
