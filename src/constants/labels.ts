/**
 * 현장 친화적 UX를 위한 표준 용어 및 라벨 매핑 사전
 * DB 필드명 및 영문 기술 용어를 비개발자 담당자(40~50대 포함)가 즉시 이해할 수 있는 한국어 업무 용어로 변환합니다.
 */

export const FIELD_LABELS: Record<string, string> = {
  // 생산 실적 및 중량 관련
  output_kg: '생산량(kg)',
  output_ton: '생산량(톤)',
  plan_kg: '계획량(kg)',
  plan_ton: '계획량(톤)',
  order_weight_ton: '수주중량(톤)',
  charge_weight_ton: '투입중량(톤)',
  hwangji_kg: '황지(kg) (공정 단조품)',
  hwangji_ton: '황지(톤) (공정 단조품)',
  cogging_kg: 'COGGING(kg) (강괴 분할)',
  cogging_ton: 'COGGING(톤) (강괴 분할)',
  good_weight_ton: '양품 중량(톤)',
  scrap_weight_ton: '스크랩 중량(톤)',
  total_weight_ton: '총 중량(톤)',

  // 작업 시간 및 횟수
  work_hours: '작업시간(시간)',
  work_count: '작업횟수(회)',
  reheat_count: '재가열 횟수(회)',
  hitting_count: '타격 횟수(hit)',
  std_work_hours: '표준 작업시간',

  // 가스 및 에너지
  gas_used: '가스 사용량',
  gas_mcal: '가스 사용 열량(Mcal)',
  gas_nm3: '가스 사용량(Nm³)',
  gas_unit: '가스 원단위(Mcal/t)',
  gas_report_tier: '보고용 가스 원단위(Mcal/t)',
  gas_analysis_tier: '분석용 가스 원단위(Mcal/t)',
  gas_actual_tier: '실제용 가스 원단위(Mcal/t)',
  furnace: '가열로 호기',
  furnace_name: '가열로 호기',
  furnace_no: '가열로 호기',

  // 달성률 및 지표
  achievement: '목표 달성률(%)',
  achievementRate: '목표 달성률(%)',
  defect_rate: '공정 불량률(%)',
  reheat_ratio: '재가열 배수(배)',
  ton_per_hour: '시간당 생산량(t/h)',

  // 데이터베이스 및 시스템 동작 (사용자 노출용 평문 변환)
  upsert: '기존 데이터 갱신(덮어쓰기)',
  commit: '확정 저장',
  mapping: '항목 연결',
  rollback: '이력 되돌리기',
  source_upload_id: '업로드 이력 번호',
  id: '고유 번호',
  created_at: '등록 일시',
  updated_at: '수정 일시',

  // 일반 업무 항목
  record_date: '작업 일자',
  date: '작업 일자',
  work_date: '작업 일자',
  dept: '부서(단조반)',
  department: '부서(단조반)',
  shift: '근무조',
  worker: '담당자/작업자',
  item_code: '품번/도면번호',
  item_name: '품명/제품명',
  product: '품명/제품명',
  material: '재질/원소재',
  raw_material: '원소재 규격',
  spec: '규격/치수',
  defect_kg: '불량 중량(kg)',
  defect_ton: '불량 중량(톤)',
  defect_reason: '불량 원인/내역',
  note: '비고/특이사항',
  status: '상태/결과',
}

/**
 * DB 필드명이나 영문 문자열을 입력받아 한국어 표준 라벨을 반환합니다.
 * 사전에 없는 경우 언더바(_)를 공백으로 바꾸고 첫 글자를 대문자로 변환하여 반환합니다.
 */
export function getFieldLabel(field: string): string {
  if (!field) return ''
  const trimmed = field.trim()
  if (FIELD_LABELS[trimmed]) {
    return FIELD_LABELS[trimmed]
  }
  // 영문 필드명이 사전에 없으면 언더바 제거 후 반환
  return trimmed.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─────────────────────────────────────────
// 도메인 핵심 지표(KPI) 및 전문 용어 툴팁 데이터
// ─────────────────────────────────────────

export interface TooltipInfo {
  title: string
  definition: string
  formula?: string
  note?: string
  direction?: 'higher_better' | 'lower_better' | 'neutral'
}

export const KPI_TOOLTIPS: Record<string, TooltipInfo> = {
  production: {
    title: '이번 달 생산량 / 시간당 생산량',
    definition: '수주중량 기준 생산 실적 및 시간당 생산 효율(t/h)입니다.',
    formula: '시간당 생산량 = 완제품 수주중량 ÷ 총 가동시간',
    note: '※ 황지(공정품 42t)는 완제품이 아니므로 생산 실적 중량에서 분리 계산됩니다 (도메인 표준 규칙).',
    direction: 'higher_better',
  },
  achievement: {
    title: '생산 목표 달성률',
    definition: '월간 계획량 대비 실제 완제품 생산 실적의 달성 비율입니다.',
    formula: '달성률(%) = 실적중량 ÷ 목표중량 × 100',
    note: '💡 [도메인 공식 적용] 황지는 중간 공정품이므로 달성률 계산에서 제외됩니다 (Section 8-3).',
    direction: 'higher_better',
  },
  gas_tier: {
    title: '가스 원단위 3단계 (보고용)',
    definition: '제품 1톤을 생산하는 데 소모된 가스 열량(Mcal/t)입니다.',
    formula: '① 보고용(제품대비) = 가스열량 ÷ 제품중량\n② 분석용(총생산대비) = 가스 ÷ [제품+황지]\n③ 실제용(투입대비) = 가스 ÷ 투입중량',
    note: '💡 재가열로 인한 열손실과 가열로 효율을 3단계로 정밀 검증합니다 (숫자가 낮을수록 에너지가 절감된 것입니다).',
    direction: 'lower_better',
  },
  reheat_ratio: {
    title: '재가열 배수 (투입÷수주)',
    definition: '완제품 1톤을 만들기 위해 투입된 원소재 중량 비율입니다.',
    formula: '재가열 배수 = 총 투입중량 ÷ 완제품 수주중량',
    note: '💡 단조 소재를 재가열한 횟수 및 불량/스크랩 손실이 반영된 지표로, 1.0배에 가까울수록 손실이 없는 우수한 상태입니다.',
    direction: 'lower_better',
  },
  defect_rate: {
    title: '공정 불량률',
    definition: '전체 생산량 중 불량품이 차지하는 중량 비율입니다.',
    formula: '불량률(%) = 불량 발생 중량 ÷ 총 생산 중량 × 100',
    note: '💡 원소재 규격(몰드표) 및 표준작업수 기준 이탈 검증 결과입니다 (2.0% 이하 유지 권장).',
    direction: 'lower_better',
  },
  hwangji: {
    title: '황지 (공정 단조품)',
    definition: '완제품으로 가공되기 전 단계의 중간 단조 반제품입니다.',
    note: '💡 완제품 수주중량과 별도로 관리되며, 생산량 집계 및 보고용 가스 원단위 계산 시 분리됩니다.',
    direction: 'neutral',
  },
  cogging: {
    title: 'COGGING (강괴 분할)',
    definition: '대형 강괴(Ingot/Billet)를 후속 단조 공정에 맞게 절단 및 1차 성형하는 작업입니다.',
    note: '💡 원소재 전처리 공정으로, 단조반 실적과 연계하여 집계됩니다.',
    direction: 'neutral',
  },
}
