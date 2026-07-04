-- ============================================================
-- 태웅 단조공장 분석 웹앱 (forging-insight) — v4 RLS 견고화 마이그레이션
-- [목적] 역할별 읽기/쓰기 정책 완비 + 감사 로그(Audit Log) 도입
-- [실행] Supabase Dashboard > SQL Editor 에 복사하여 Run 실행
-- ============================================================

-- ─────────────────────────────────────────
-- 0. pgaudit 대체: 경량 감사 로그 테이블
-- ─────────────────────────────────────────

create table if not exists audit_logs (
  id           bigserial primary key,
  created_at   timestamptz not null default now(),
  table_name   text not null,          -- 변경된 테이블명
  operation    text not null,          -- INSERT | UPDATE | DELETE
  user_id      uuid,                   -- auth.uid() (anon이면 null)
  user_role    text,                   -- auth.role()
  record_id    text,                   -- 변경된 행의 PK 값 (text 변환)
  old_data     jsonb,                  -- 변경 전 데이터 (UPDATE/DELETE)
  new_data     jsonb                   -- 변경 후 데이터 (INSERT/UPDATE)
);

-- 감사 로그는 INSERT만 허용 (로그 조작 방지)
alter table audit_logs enable row level security;
drop policy if exists "audit_insert_all" on audit_logs;
drop policy if exists "audit_select_authed" on audit_logs;

-- 서비스 롤(서버 액션) + 인증 사용자만 삽입
create policy "audit_insert_all" on audit_logs
  for insert with check (auth.role() in ('authenticated', 'service_role'));

-- 인증된 사용자(관리자)만 조회
create policy "audit_select_authed" on audit_logs
  for select using (auth.role() in ('authenticated', 'service_role'));

-- ─────────────────────────────────────────
-- 1. 감사 로그 트리거 함수
-- ─────────────────────────────────────────

create or replace function fn_audit_log()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'DELETE' then
    insert into audit_logs(table_name, operation, user_id, user_role, record_id, old_data, new_data)
    values (TG_TABLE_NAME, 'DELETE', auth.uid(), auth.role(), OLD.id::text, row_to_json(OLD)::jsonb, null);
    return OLD;
  elsif TG_OP = 'UPDATE' then
    insert into audit_logs(table_name, operation, user_id, user_role, record_id, old_data, new_data)
    values (TG_TABLE_NAME, 'UPDATE', auth.uid(), auth.role(), NEW.id::text, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
    return NEW;
  elsif TG_OP = 'INSERT' then
    insert into audit_logs(table_name, operation, user_id, user_role, record_id, old_data, new_data)
    values (TG_TABLE_NAME, 'INSERT', auth.uid(), auth.role(), NEW.id::text, null, row_to_json(NEW)::jsonb);
    return NEW;
  end if;
  return null;
end;
$$;

-- ─────────────────────────────────────────
-- 2. 핵심 테이블에 감사 트리거 연결
-- ─────────────────────────────────────────

do $$ declare t text; begin
  foreach t in array array[
    'uploads', 'production_records', 'line_output_daily',
    'gas_records', 'gas_daily_readings', 'targets', 'furnaces'
  ]
  loop
    execute format('drop trigger if exists trig_audit_%I on %I;', t, t);
    execute format(
      'create trigger trig_audit_%I after insert or update or delete on %I
       for each row execute function fn_audit_log();', t, t
    );
  end loop;
end $$;

-- ─────────────────────────────────────────
-- 3. RLS 정책 재구성: 역할별 분리
-- ─────────────────────────────────────────
-- 정책 설계 원칙:
--   [READ]   authenticated + anon 모두 허용 (현장 조회용)
--   [WRITE]  authenticated + service_role 만 허용 (수기 입력, 업로드 서버액션)
--   [DELETE] service_role 만 허용 (롤백은 서버 액션만 실행)
-- ※ 향후 PIN 인증 도입 시 anon SELECT를 제거하고 authenticated만 유지
-- ─────────────────────────────────────────

-- 기존 단일 정책 제거 후 재생성 (모든 실적/기준 테이블 대상)
do $$ declare t text; begin
  foreach t in array array[
    'uploads', 'production_records', 'line_output_daily',
    'gas_records', 'gas_daily_readings',
    'work_standards', 'raw_material_specs', 'app_settings',
    'targets', 'furnaces'
  ]
  loop
    -- 기존 정책 전체 제거
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "sec_policy_%s" on %I;', t, t);
    execute format('drop policy if exists "%s_all" on %I;', t, t);
    execute format('drop policy if exists "auth_all_%s" on %I;', t, t);
    execute format('drop policy if exists "rls_select_%s" on %I;', t, t);
    execute format('drop policy if exists "rls_insert_%s" on %I;', t, t);
    execute format('drop policy if exists "rls_update_%s" on %I;', t, t);
    execute format('drop policy if exists "rls_delete_%s" on %I;', t, t);

    -- [SELECT] 인증된 사용자 + anon (현장 조회 허용)
    execute format(
      'create policy "rls_select_%s" on %I for select
       using (auth.role() in (''anon'', ''authenticated'', ''service_role''));',
      t, t
    );

    -- [INSERT] 인증된 사용자 + service_role (서버 액션)
    execute format(
      'create policy "rls_insert_%s" on %I for insert
       with check (auth.role() in (''authenticated'', ''service_role''));',
      t, t
    );

    -- [UPDATE] 인증된 사용자 + service_role
    execute format(
      'create policy "rls_update_%s" on %I for update
       using (auth.role() in (''authenticated'', ''service_role''))
       with check (auth.role() in (''authenticated'', ''service_role''));',
      t, t
    );

    -- [DELETE] service_role 전용 (롤백 서버액션만 데이터 삭제 가능)
    execute format(
      'create policy "rls_delete_%s" on %I for delete
       using (auth.role() = ''service_role'');',
      t, t
    );
  end loop;
end $$;

-- ─────────────────────────────────────────
-- 4. uploads 테이블 특수 정책 보강
--    (자신이 업로드한 이력은 authenticated도 status 수정 가능)
-- ─────────────────────────────────────────

-- 기존 update 정책을 uploads 전용으로 덮어쓰기
drop policy if exists "rls_update_uploads" on uploads;
create policy "rls_update_uploads" on uploads
  for update
  using (auth.role() in ('authenticated', 'service_role'))
  with check (auth.role() in ('authenticated', 'service_role'));

-- ─────────────────────────────────────────
-- 5. 001_initial_schema.sql 테이블도 정책 동기화
--    (upload_history, production_actual, gas_meter_readings 등)
-- ─────────────────────────────────────────

do $$ declare t text; begin
  foreach t in array array[
    'upload_history', 'production_targets', 'production_actual',
    'gas_meter_readings', 'equipment_master', 'product_master', 'equipment_operation'
  ]
  loop
    -- 테이블 존재 여부 체크 후 적용
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      execute format('alter table %I enable row level security;', t);
      execute format('drop policy if exists "authenticated_select" on %I;', t);
      execute format('drop policy if exists "owner_insert" on %I;', t);
      execute format('drop policy if exists "rls_select_%s" on %I;', t, t);
      execute format('drop policy if exists "rls_insert_%s" on %I;', t, t);
      execute format('drop policy if exists "rls_update_%s" on %I;', t, t);
      execute format('drop policy if exists "rls_delete_%s" on %I;', t, t);

      execute format(
        'create policy "rls_select_%s" on %I for select
         using (auth.role() in (''anon'', ''authenticated'', ''service_role''));',
        t, t
      );
      execute format(
        'create policy "rls_insert_%s" on %I for insert
         with check (auth.role() in (''authenticated'', ''service_role''));',
        t, t
      );
      execute format(
        'create policy "rls_update_%s" on %I for update
         using (auth.role() in (''authenticated'', ''service_role''))
         with check (auth.role() in (''authenticated'', ''service_role''));',
        t, t
      );
      execute format(
        'create policy "rls_delete_%s" on %I for delete
         using (auth.role() = ''service_role'');',
        t, t
      );
    end if;
  end loop;
end $$;

-- ─────────────────────────────────────────
-- 6. 스키마 재로드 알림
-- ─────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
