-- ============================================================
-- 태웅 단조공장 분석 앱 — Supabase 마이그레이션
-- 실행: Supabase Dashboard > SQL Editor 에 붙여넣기
-- ============================================================

-- 확장
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- 1. 업로드 이력
-- ─────────────────────────────────────────

create table if not exists upload_history (
  id            uuid primary key default uuid_generate_v4(),
  created_at    timestamptz not null default now(),
  user_id       uuid references auth.users(id) on delete set null,
  user_role     text not null,
  file_type     text not null,
  file_name     text not null,
  storage_path  text not null,           -- Supabase Storage 경로
  period_start  date,                    -- 데이터 기간 시작
  period_end    date,                    -- 데이터 기간 끝
  row_count     int not null default 0,
  status        text not null default 'preview'  -- preview | committed | rolled_back
                check (status in ('preview','committed','rolled_back')),
  parsed_summary jsonb,                  -- 파싱 요약 미리보기
  committed_at  timestamptz,
  rolled_back_at timestamptz,
  note          text
);

-- ─────────────────────────────────────────
-- 2. 연간/월간 생산 목표
-- ─────────────────────────────────────────

create table if not exists production_targets (
  id                uuid primary key default uuid_generate_v4(),
  created_at        timestamptz not null default now(),
  upload_id         uuid references upload_history(id) on delete cascade,
  year              int not null,
  month             int not null check (month between 1 and 12),
  department        text not null,
  line_id           text not null,
  target_qty        numeric,
  target_weight_ton numeric,
  -- upsert 중복 키: 같은 연·월·부서·라인 → 갱신
  unique (year, month, department, line_id)
);

-- ─────────────────────────────────────────
-- 3. 실제 생산 실적
-- ─────────────────────────────────────────

create table if not exists production_actual (
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamptz not null default now(),
  upload_id       uuid references upload_history(id) on delete cascade,
  date            date not null,
  department      text not null,
  line_id         text not null,
  shift           text,                  -- 교대 A/B/C
  product_code    text,
  product_name    text,
  material        text,
  qty             numeric,
  weight_ton      numeric,               -- ton 단위로 정규화
  ng_qty          numeric,
  downtime_min    numeric,
  downtime_reason text,
  unique (date, department, line_id, shift, product_code)
);

-- ─────────────────────────────────────────
-- 4. 가스 검침
-- ─────────────────────────────────────────

create table if not exists gas_meter_readings (
  id                    uuid primary key default uuid_generate_v4(),
  created_at            timestamptz not null default now(),
  upload_id             uuid references upload_history(id) on delete cascade,
  date                  date not null,
  equipment_id          text not null,
  department            text not null,
  reading_before        numeric,         -- 사용 전 검침 (m³)
  reading_after         numeric,         -- 사용 후 검침 (m³)
  usage_m3              numeric,         -- 사용량 = after - before
  production_weight_ton numeric,         -- 해당 호기 당일 생산중량
  unit_consumption      numeric,         -- 원단위 (Mcal/ton)
  unique (date, equipment_id)
);

-- ─────────────────────────────────────────
-- 5. 설비(호기) 마스터
-- ─────────────────────────────────────────

create table if not exists equipment_master (
  id             uuid primary key default uuid_generate_v4(),
  created_at     timestamptz not null default now(),
  equipment_id   text not null unique,
  name           text not null,
  aliases        text[] not null default '{}',  -- 연도별 이름 변경 이력
  department     text not null,
  furnace_type   text,
  capacity_ton   numeric,
  is_active      boolean not null default true
);

-- ─────────────────────────────────────────
-- 6. 제품 마스터
-- ─────────────────────────────────────────

create table if not exists product_master (
  id                  uuid primary key default uuid_generate_v4(),
  created_at          timestamptz not null default now(),
  product_code        text not null unique,
  product_name        text not null,
  material            text,
  product_type        text,
  standard_weight_kg  numeric,
  standard_gas_unit   numeric             -- 태상 기준 원단위 (Mcal/ton)
);

-- ─────────────────────────────────────────
-- 7. 설비 가동/비가동
-- ─────────────────────────────────────────

create table if not exists equipment_operation (
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamptz not null default now(),
  upload_id       uuid references upload_history(id) on delete cascade,
  date            date not null,
  equipment_id    text not null,
  department      text not null,
  operating_min   numeric,
  downtime_min    numeric,
  downtime_reason text,
  shift           text,
  unique (date, equipment_id, shift)
);

-- ─────────────────────────────────────────
-- 8. 인덱스
-- ─────────────────────────────────────────

create index if not exists idx_production_actual_date on production_actual(date);
create index if not exists idx_production_actual_dept on production_actual(department);
create index if not exists idx_production_actual_line on production_actual(line_id);
create index if not exists idx_gas_readings_date on gas_meter_readings(date);
create index if not exists idx_gas_readings_equip on gas_meter_readings(equipment_id);
create index if not exists idx_upload_history_status on upload_history(status);

-- ─────────────────────────────────────────
-- 9. RLS 정책 (Row Level Security)
-- ─────────────────────────────────────────

-- 인증된 사용자만 조회·삽입 허용 (추후 역할별 정책 추가)
alter table upload_history enable row level security;
alter table production_targets enable row level security;
alter table production_actual enable row level security;
alter table gas_meter_readings enable row level security;
alter table equipment_master enable row level security;
alter table product_master enable row level security;
alter table equipment_operation enable row level security;

-- 조회: 인증된 모든 사용자
create policy "authenticated_select" on upload_history
  for select using (auth.role() = 'authenticated');
create policy "authenticated_select" on production_targets
  for select using (auth.role() = 'authenticated');
create policy "authenticated_select" on production_actual
  for select using (auth.role() = 'authenticated');
create policy "authenticated_select" on gas_meter_readings
  for select using (auth.role() = 'authenticated');
create policy "authenticated_select" on equipment_master
  for select using (auth.role() = 'authenticated');
create policy "authenticated_select" on product_master
  for select using (auth.role() = 'authenticated');
create policy "authenticated_select" on equipment_operation
  for select using (auth.role() = 'authenticated');

-- 삽입/수정/삭제: 자기 업로드만 (service role로 우회)
create policy "owner_insert" on upload_history
  for insert with check (auth.uid() = user_id);
