-- ============================================================
-- 태웅 단조공장 분석 웹앱 (forging-insight) — v3 프로덕션 견고화 마이그레이션
-- 실행 방법: Supabase Dashboard > SQL Editor 에 복사하여 붙여넣고 Run 실행
-- ============================================================

-- 0. 확장 모듈 활성화
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. 기준(마스터) 테이블
-- ============================================================

-- 1-1. 표준작업수(히트 회차) 마스터 (표A: 투입중량 구간, 표B: 제품중량·수주치수)
create table if not exists work_standards (
  id bigserial primary key,
  dept text not null,
  product text not null,
  material text,
  basis text not null default 'charge' check (basis in ('charge', 'product')),
  min_ton numeric,
  max_ton numeric,
  order_size text,
  std_work_count numeric not null check (std_work_count > 0),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_ws_lookup on work_standards(dept, product, material, basis);

-- 1-2. 원소재 규격(몰드표) 마스터
create table if not exists raw_material_specs (
  id bigserial primary key,
  product text not null,
  material text,
  raw_material text not null,
  spec text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_rms_lookup on raw_material_specs(product, material);

-- 1-3. 앱 환경설정 (기준값)
create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  note text,
  updated_at timestamptz not null default now()
);

-- 1-4. 부서별 연간/월간 생산 및 가스 목표
create table if not exists targets (
  id bigserial primary key,
  year int not null check (year >= 2020),
  month int check (month between 1 and 12), -- null이면 연간 전체 목표
  dept text not null,
  target_ton numeric default 0,
  target_gas_mcal numeric default 150.0,
  target_defect_rate numeric default 2.0,
  note text,
  created_at timestamptz not null default now(),
  unique(year, month, dept)
);
create index if not exists idx_targets_lookup on targets(year, dept);

-- 1-5. 로 호기(설비) 마스터 및 부서/로방식 매핑
create table if not exists furnaces (
  id bigserial primary key,
  furnace text not null unique,        -- 예: '1호기', '9호기', '13호기'
  name text not null,                  -- 설비명
  dept text not null,                  -- 귀속 부서 (P15, P5, P8, R9, R/M, 열처리)
  furnace_type text not null check (furnace_type in ('batch', 'car', 'heat_treat', 'other')), -- 'batch'(배치로) | 'car'(대차로)
  capacity_ton numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_furnaces_dept on furnaces(dept, furnace_type);

-- ============================================================
-- 2. 실적 및 트랜잭션 테이블
-- ============================================================

-- 2-1. 업로드 및 롤백 이력 관리
create table if not exists uploads (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  kind text not null,                  -- 'perf_records', 'line_output_daily', 'gas_monthly' 등
  file_name text not null,
  storage_path text,
  row_count int not null default 0,
  status text not null default 'committed' check (status in ('preview', 'committed', 'rolled_back')),
  mapping jsonb,                       -- 헤더 매핑 정보
  note text
);
create index if not exists idx_uploads_status on uploads(status, kind);

-- 2-2. 생산 실적 원장 (수주 단위 행 리스트)
create table if not exists production_records (
  id bigserial primary key,
  work_date date not null,
  dept text not null,
  shift text,                          -- 'A', 'B', 'C', '주간', '야간' 등
  order_no text,
  process text,
  product text not null,
  material text,
  order_size text,
  work_size text,
  order_weight_ton numeric not null default 0,  -- 보고용 완제품 중량
  charge_weight_ton numeric not null default 0, -- 실제 가열로 투입중량
  hwangji_weight_ton numeric default 0,         -- 황지(공정품) 중량
  furnace text,
  work_hours numeric default 0,                 -- 가동 시간(h)
  work_count numeric default 0,                 -- 작업 횟수(히트)
  gas_used_m3 numeric default 0,                -- 가스 사용량(m³)
  source_upload_id bigint references uploads(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_pr_date_dept on production_records(work_date, dept);
create index if not exists idx_pr_upload on production_records(source_upload_id);

-- 2-3. 생산량집계표 (다중밴드 일일 크로스탭 원본)
create table if not exists line_output_daily (
  id bigserial primary key,
  work_date date not null,
  line_code text not null,                      -- 라인 또는 부서 코드
  output_kg numeric default 0,
  plan_kg numeric default 0,
  achievement numeric,                          -- 달성률(%)
  hwangji_kg numeric default 0,
  cogging_kg numeric default 0,
  subtotal_kg numeric default 0,
  remake_self_remake numeric default 0,
  remake_self_fix numeric default 0,
  remake_qc_remake numeric default 0,
  remake_qc_fix numeric default 0,
  mat_cs_kg numeric default 0,
  mat_as_kg numeric default 0,
  mat_sus_kg numeric default 0,
  mat_total_kg numeric default 0,
  source_upload_id bigint references uploads(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(work_date, line_code)
);
create index if not exists idx_lod_date on line_output_daily(work_date);

-- 2-4. 가스 월별 사용 실적
create table if not exists gas_records (
  id bigserial primary key,
  period date not null,                         -- 해당 월의 1일 (예: 2026-06-01)
  furnace text not null,
  charge_weight_ton numeric default 0,
  gas_used numeric default 0,                   -- 사용량 (m³ 또는 Mcal)
  source_upload_id bigint references uploads(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_gr_period on gas_records(period, furnace);

-- 2-5. 가스 일별 자체검침 (사용전/후 지침)
create table if not exists gas_daily_readings (
  id bigserial primary key,
  reading_date date not null,
  furnace text not null,
  reading_before numeric default 0,
  reading_after numeric default 0,
  gas_used numeric default 0,                   -- after - before
  source_upload_id bigint references uploads(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(reading_date, furnace)
);
create index if not exists idx_gdr_date on gas_daily_readings(reading_date);

-- ============================================================
-- 3. RLS (Row Level Security) 보안 정책 견고화
-- ============================================================

do $$ declare t text; begin
  foreach t in array array[
    'work_standards','raw_material_specs','app_settings','targets','furnaces',
    'uploads','production_records','line_output_daily','gas_records','gas_daily_readings'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists %I_all on %I;', t, t);
    execute format('drop policy if exists "auth_all_%s" on %I;', t, t);
    
    -- [보안 정책]: anon(손님/현장입력), authenticated(로그인), service_role(서버액션/백그라운드) 허용
    -- ※ 향후 현장 PIN 로그인 도입 완료 시, 아래 'anon'을 배열에서 제외하여 보안을 강화하십시오.
    execute format('create policy "sec_policy_%s" on %I for all using (auth.role() in (''anon'', ''authenticated'', ''service_role'')) with check (auth.role() in (''anon'', ''authenticated'', ''service_role''));', t, t);
  end loop; end $$;

-- ============================================================
-- 4. 2026년 표준 마스터 및 초기 시드(Seed) 데이터 삽입
-- ============================================================

-- 4-1. 환경설정 시드
insert into app_settings(key, value, note) values
  ('operating_hours_per_day', '20'::jsonb, '1일 단조공장 가동시간(시간)'),
  ('shifts_per_day', '2'::jsonb, '1일 교대 수 (주간/야간)'),
  ('lng_heat_value', '10.55'::jsonb, 'LNG 가스 1m³ 당 발열량 (Mcal/m³)')
on conflict (key) do update set value = excluded.value, updated_at = now();

-- 4-2. 표준작업수(히트) 마스터 시드 (표A & 표B)
insert into work_standards(dept, product, material, basis, min_ton, max_ton, order_size, std_work_count, note) values
  ('P15 (1단조)', '금형강 대형', 'SKD61', 'charge', 10, 30, null, 3, '투입중량 기준 기본 히트'),
  ('P5 (2단조)', '크랭크축', 'SCM440', 'charge', 5, 15, null, 4, '연속 단조 공정'),
  ('P8 (3단조)', '쉘 (Shell)', 'SF440', 'charge', 15, 50, null, 3, '대형 쉘 전용'),
  ('R9 (4단조)', '로터 샤프트', '34CrMo4', 'charge', 20, 60, null, 2, '고경도 정밀 공정'),
  ('R/M (링밀)', '프랑지/링', 'SUS304', 'product', null, null, 'OD > 3000mm', 5, '수주치수 기준 세팅'),
  ('R/M (자유단조)', '샤프트', 'S45C', 'product', null, null, 'OD <= 3000mm', 3, '소형 자유단조')
on conflict do nothing;

-- 4-3. 원소재 규격(몰드표) 시드
insert into raw_material_specs(product, material, raw_material, spec, note) values
  ('금형강 대형', 'SKD61', '잉고트(Ingot)', '1,500 x 2,000 mm', '진공탈가스 처리 소재'),
  ('크랭크축', 'SCM440', '빌렛(Billet)', 'OD 600 mm', '정밀 단조 소재'),
  ('쉘 (Shell)', 'SF440', '단조 블록', 'OD 2,500 mm x L 1,200', '선박용 쉘 전용'),
  ('로터 샤프트', '34CrMo4', '잉고트(Ingot)', '2,000 x 3,500 mm', '발전기용 고강도'),
  ('프랑지/링', 'SUS304', '링 블랭크', 'OD 3,200 x ID 2,800 mm', '내식성 스테인리스')
on conflict do nothing;

-- 4-4. 2026년 부서별 연간 목표 시드 (month=null은 연간 목표)
insert into targets(year, month, dept, target_ton, target_gas_mcal, target_defect_rate, note) values
  (2026, null, 'P15 (1단조반)', 3720, 145.0, 1.5, '2026년 연간 경영 목표'),
  (2026, null, 'P5 (2단조반)', 3840, 140.0, 1.2, '2026년 연간 경영 목표'),
  (2026, null, 'P8 (3단조반)', 3360, 150.0, 1.8, '2026년 연간 경영 목표'),
  (2026, null, 'R9 (4단조반)', 1800, 155.0, 1.0, '2026년 연간 경영 목표'),
  (2026, null, 'R/M (링밀/자유)', 2160, 160.0, 2.0, '2026년 연간 경영 목표')
on conflict (year, month, dept) do update set
  target_ton = excluded.target_ton,
  target_gas_mcal = excluded.target_gas_mcal,
  target_defect_rate = excluded.target_defect_rate;

-- 4-5. 1~20호기 설비 마스터 시드 (배치로/대차로/열처리 구분)
insert into furnaces(furnace, name, dept, furnace_type, capacity_ton) values
  ('1호기', '1단조 가열로 #1', 'P15 (1단조반)', 'batch', 40),
  ('9호기', '2단조 가열로 #9', 'P5 (2단조반)', 'batch', 50),
  ('10호기', '2단조 가열로 #10', 'P5 (2단조반)', 'batch', 50),
  ('11호기', '3단조 가열로 #11', 'P8 (3단조반)', 'batch', 60),
  ('12호기', '3단조 가열로 #12', 'P8 (3단조반)', 'batch', 60),
  ('14호기', '4단조 가열로 #14', 'R9 (4단조반)', 'batch', 80),
  ('15호기', '4단조 가열로 #15', 'R9 (4단조반)', 'batch', 80),
  ('16호기', '4단조 가열로 #16', 'R9 (4단조반)', 'batch', 80),
  ('2호기', '1단조 대차로 #2', 'P15 (1단조반)', 'car', 100),
  ('3호기', '1단조 대차로 #3', 'P15 (1단조반)', 'car', 100),
  ('4호기', '2단조 대차로 #4', 'P5 (2단조반)', 'car', 120),
  ('5호기', '2단조 대차로 #5', 'P5 (2단조반)', 'car', 120),
  ('6호기', '3단조 대차로 #6', 'P8 (3단조반)', 'car', 150),
  ('7호기', '3단조 대차로 #7', 'P8 (3단조반)', 'car', 150),
  ('8호기', '3단조 대차로 #8', 'P8 (3단조반)', 'car', 150),
  ('17호기', '링밀 대차로 #17', 'R/M (링밀/자유)', 'car', 200),
  ('18호기', '링밀 대차로 #18', 'R/M (링밀/자유)', 'car', 200),
  ('19호기', '자유단조 대차로 #19', 'R/M (링밀/자유)', 'car', 250),
  ('20호기', '자유단조 대차로 #20', 'R/M (링밀/자유)', 'car', 250),
  ('13호기', '열처리 대차로 #13', '열처리 13호기', 'heat_treat', 300)
on conflict (furnace) do update set
  dept = excluded.dept,
  furnace_type = excluded.furnace_type,
  capacity_ton = excluded.capacity_ton;

-- 4-6. 초기 테스트 생산 실적 1건 삽입 (대시보드 실시간 연동 확인용)
insert into production_records(work_date, dept, shift, order_no, process, product, material, order_weight_ton, charge_weight_ton, hwangji_weight_ton, furnace, work_hours, work_count, gas_used_m3)
values
  ('2026-07-01', 'P15 (1단조반)', 'A', 'ORD-202607-001', '1단조', '금형강 대형', 'SKD61', 28.5, 33.2, 1.5, '1호기', 1.6, 3, 4450),
  ('2026-07-01', 'P5 (2단조반)', 'A', 'ORD-202607-002', '2단조', '크랭크축', 'SCM440', 35.0, 41.0, 2.0, '9호기', 1.4, 4, 5200),
  ('2026-07-01', 'P8 (3단조반)', 'B', 'ORD-202607-003', '3단조', '쉘 (Shell)', 'SF440', 42.0, 48.5, 1.2, '11호기', 2.8, 3, 6800),
  ('2026-07-01', 'R9 (4단조반)', 'A', 'ORD-202607-004', '4단조', '로터 샤프트', '34CrMo4', 55.0, 64.0, 0.0, '15호기', 3.5, 2, 8900),
  ('2026-07-01', 'R/M (링밀/자유)', 'B', 'ORD-202607-005', '링밀', '프랑지/링', 'SUS304', 30.0, 36.5, 0.8, '17호기', 1.8, 5, 5100)
on conflict do nothing;

-- 마이그레이션 적용 완료 알림
NOTIFY pgrst, 'reload schema';
