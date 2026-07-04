-- ============================================================
-- 태웅 단조공장 분석 앱 — 마이그레이션 v2 (데이터 모델 확장)
-- ============================================================

-- ===== 기준(마스터) =====
create table if not exists work_standards (        -- 표준작업수(히트 회차)
  id bigserial primary key,
  dept text not null, product text not null, material text,
  basis text not null default 'charge',  -- 'charge'(투입중량,P15/P5/P8) | 'product'(제품중량,R/M)
  min_ton numeric, max_ton numeric, order_size text,  -- R/M은 수주치수(order_size)
  std_work_count numeric not null, note text
);
create index if not exists idx_ws_lookup on work_standards(dept,product,material,basis);

create table if not exists raw_material_specs (   -- 원소재 규격
  id bigserial primary key, product text not null, material text,
  raw_material text not null, spec text, note text
);

create table if not exists app_settings (         -- 기준값
  key text primary key, value jsonb not null, note text
);
insert into app_settings(key,value,note) values
  ('operating_hours_per_day','20'::jsonb,'1일 가동시간(시간)'),
  ('shifts_per_day','2'::jsonb,'1일 교대 수')
on conflict (key) do nothing;

-- targets/furnaces 확장 (이미 있으면 생성 스킵, 없으면 생성/확장)
create table if not exists targets (id bigserial primary key);
create table if not exists furnaces (id bigserial primary key, furnace text);

alter table targets  add column if not exists year int;
alter table targets  add column if not exists dept text;
alter table furnaces add column if not exists dept text;   -- 호기->부서(가스 부서귀속)
alter table furnaces add column if not exists furnace_type text; -- 'batch'(배치로)|'car'(대차로)

-- ===== 실적(트랜잭션) =====
-- 생산 실적 원장(수주 단위): 시간당생산량·표준작업수 분석의 기준
create table if not exists production_records (
  id bigserial primary key, work_date date, dept text, shift text,
  order_no text, process text, product text, material text,
  order_size text, work_size text,
  order_weight_ton numeric,  -- 수주중량(=실적)
  charge_weight_ton numeric, -- 투입중량
  furnace text, work_hours numeric, work_count numeric,
  source_upload_id bigint, unique(order_no, work_date, product)
);

-- 생산량집계표(다중밴드 일일 크로스탭) — 달성률·재질믹스용, kg 원본
create table if not exists line_output_daily (
  id bigserial primary key, work_date date not null, line_code text not null,
  output_kg numeric, plan_kg numeric, achievement numeric,
  hwangji_kg numeric, cogging_kg numeric, subtotal_kg numeric,
  remake_self_remake numeric, remake_self_fix numeric,
  remake_qc_remake numeric, remake_qc_fix numeric,
  mat_cs_kg numeric, mat_as_kg numeric, mat_sus_kg numeric, mat_total_kg numeric,
  source_upload_id bigint, unique(work_date, line_code)
);

-- 가스
create table if not exists gas_records (          -- 월별 호기 가스
  id bigserial primary key, period date, furnace text,
  charge_weight_ton numeric, gas_used numeric, source_upload_id bigint
);
create table if not exists gas_daily_readings (   -- 일별 검침(사용전/후)
  id bigserial primary key, reading_date date, furnace text,
  reading_before numeric, reading_after numeric, gas_used numeric, source_upload_id bigint
);

-- 업로드 이력(롤백·재파싱)
create table if not exists uploads (
  id bigserial primary key, kind text, file_name text, storage_path text,
  row_count int, status text, mapping jsonb, created_at timestamptz default now(), note text
);

-- RLS (기존 공개정책과 동일)
do $$ declare t text; begin
  foreach t in array array['work_standards','raw_material_specs','app_settings',
    'production_records','line_output_daily','gas_records','gas_daily_readings','uploads']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists %I_all on %I;', t, t);
    execute format('create policy %I_all on %I for all using(true) with check(true);', t, t);
  end loop; end $$;
NOTIFY pgrst, 'reload schema';
