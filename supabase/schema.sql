-- 방명록 테이블 + 접근 제한(RLS)
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요.

-- 1) 테이블
create table if not exists public.guestbook (
  id          bigint generated always as identity primary key,
  name        text not null default '익명',
  message     text not null,
  created_at  timestamptz not null default now(),
  constraint guestbook_name_len check (char_length(name) between 1 and 20),
  constraint guestbook_message_len check (char_length(message) between 1 and 200)
);

-- 최신순 조회를 위한 인덱스
create index if not exists guestbook_created_at_idx
  on public.guestbook (created_at desc);

-- 2) RLS 활성화
-- 정책을 하나도 만들지 않으므로, anon(브라우저) 역할은 읽기/쓰기가 모두 차단된다.
-- service_role(서버 함수)은 RLS를 우회하므로 함수에서만 접근이 가능하다.
alter table public.guestbook enable row level security;
