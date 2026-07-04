/**
 * calculations.ts — 태웅 단조공장 생산·가스 원단위 도메인 8대 공식 및 벤치마크 계산 엔진
 *
 * 1. 시간당 생산량(톤/h) = 수주중량 / 작업시간 (부서 평균 = 생산량 / [가동일수 × 1일 가동시간])
 * 2. 톤/회 = 수주중량 / 작업횟수, h/회 = 작업시간 / 작업횟수
 * 3. 재가열 배수 = 투입중량 / 생산(수주)중량
 * 4. 달성률 = Σ실적(수주중량) / 목표 (제품 기준, 황지 제외!)
 * 5. 가스 원단위 3단계: 보고용(가스/제품중량) / 분석용(가스/[제품+황지]) / 실제(가스/투입중량)
 * 6. 제품별 가스 배분 = 부서가스 × [제품 투입중량 × 표준작업수] / Σ[투입중량 × 표준작업수]
 * 7. 로방식별 원단위 = 배치로(1·9·10·11·12·14·15·16호기) vs 대차로 그룹
 * 8. 두산 벤치마크 비교 = 금형강(25), 크랭크축(26), 쉘(10), 로터(7 톤/h)
 *
 * ※ 모든 함수는 마우스 호버 시 표시할 수 있는 수식 근거(formula) 문자열을 함께 반환합니다.
 */

export const LNG_HEAT_VALUE_MCAL_PER_M3 = 10.55

/** 태상 기준값 (태상 = 태웅 기준 원단위 Mcal/ton) */
export const TAESUNG_STANDARD: Record<string, number> = {
  default: 150.0,     // 보고용 목표 기준치 (기본 150 Mcal/ton)
  carbon_steel: 140.0, // 탄소강
  alloy_steel: 160.0,  // 합금강
  stainless: 180.0,    // 스테인리스
}

/** 두산 벤치마크 기준치 (톤/h) */
export const DOOSAN_BENCHMARK = {
  die_steel: { label: '금형강', target: 25, unit: 'ton/h' },
  crankshaft: { label: '크랭크축', target: 26, unit: 'ton/h' },
  shell: { label: '쉘', target: 10, unit: 'ton/h' },
  rotor: { label: '로터', target: 7, unit: 'ton/h' },
}

/** 배치로 호기 목록 (나머지는 대차로) */
export const BATCH_FURNACES = ['1호기', '9호기', '10호기', '11호기', '12호기', '14호기', '15호기', '16호기', '1', '9', '10', '11', '12', '14', '15', '16']

// ─────────────────────────────────────────
// 1~4. 생산량 KPI 및 달성률 계산
// ─────────────────────────────────────────

export interface ProductionKPIInput {
  orderWeightTon: number    // 수주(생산) 중량 (ton)
  workHours: number         // 작업시간 (h)
  workCount: number         // 작업횟수 (히트 회차)
  chargeWeightTon: number   // 투입 중량 (ton)
  targetTon?: number        // 목표 중량 (ton)
  isHwangji?: boolean       // 황지 여부 (달성률 계산 시 제외)
}

export interface ProductionKPIResult {
  tonPerHour: number | null     // 1. 시간당 생산량 (ton/h)
  tonPerHit: number | null      // 2. 톤/회 (ton/hit)
  hoursPerHit: number | null    // 2. h/회 (h/hit)
  reheatRatio: number | null    // 3. 재가열 배수 (배)
  achievementRate: number | null // 4. 달성률 (%) - 황지는 null
  formulas: {
    tonPerHour: string
    tonPerHit: string
    hoursPerHit: string
    reheatRatio: string
    achievementRate: string
  }
}

export function calcProductionKPIs(input: ProductionKPIInput): ProductionKPIResult {
  const { orderWeightTon, workHours, workCount, chargeWeightTon, targetTon, isHwangji } = input

  const tonPerHour = workHours > 0 ? Number((orderWeightTon / workHours).toFixed(2)) : null
  const tonPerHit = workCount > 0 ? Number((orderWeightTon / workCount).toFixed(2)) : null
  const hoursPerHit = workCount > 0 ? Number((workHours / workCount).toFixed(2)) : null
  const reheatRatio = orderWeightTon > 0 ? Number((chargeWeightTon / orderWeightTon).toFixed(2)) : null

  // 4) 달성률: 황지는 제외하고 제품 기준만 계산
  let achievementRate: number | null = null
  if (!isHwangji && targetTon && targetTon > 0) {
    achievementRate = Number(((orderWeightTon / targetTon) * 100).toFixed(1))
  }

  return {
    tonPerHour,
    tonPerHit,
    hoursPerHit,
    reheatRatio,
    achievementRate,
    formulas: {
      tonPerHour: `[시간당 생산량] = 수주중량(${orderWeightTon.toFixed(2)}t) ÷ 작업시간(${workHours.toFixed(1)}h) = ${tonPerHour ?? 'N/A'} t/h`,
      tonPerHit: `[히트당 생산량] = 수주중량(${orderWeightTon.toFixed(2)}t) ÷ 작업횟수(${workCount}회) = ${tonPerHit ?? 'N/A'} t/회`,
      hoursPerHit: `[히트당 소요시간] = 작업시간(${workHours.toFixed(1)}h) ÷ 작업횟수(${workCount}회) = ${hoursPerHit ?? 'N/A'} h/회`,
      reheatRatio: `[재가열 배수] = 투입중량(${chargeWeightTon.toFixed(2)}t) ÷ 수주중량(${orderWeightTon.toFixed(2)}t) = ${reheatRatio ?? 'N/A'}배`,
      achievementRate: isHwangji
        ? `[달성률] 황지(공정품)는 제품 수주 목표 달성률 계산에서 제외됨`
        : `[달성률] = 실적중량(${orderWeightTon.toFixed(2)}t) ÷ 목표중량(${targetTon?.toFixed(2) ?? 0}t) × 100 = ${achievementRate ?? 'N/A'}%`,
    },
  }
}

// ─────────────────────────────────────────
// 5. 가스 원단위 3단계 계산 (보고용 / 분석용 / 실제)
// ─────────────────────────────────────────

export interface Gas3TierInput {
  gasUsedM3?: number          // 가스 사용량 (m³)
  gasUsedMcal?: number        // 가스 사용량 (Mcal) - 없으면 m³ × 10.55 계산
  productWeightTon: number    // 제품(수주) 중량
  hwangjiWeightTon?: number   // 황지 중량 (없으면 0)
  chargeWeightTon: number     // 투입 중량
  targetMcalPerTon?: number   // 목표 원단위 (기본 150)
}

export interface Gas3TierResult {
  gasMcal: number
  reportTier: number | null    // ① 보고용 (가스 / 제품중량)
  analysisTier: number | null  // ② 분석용 (가스 / [제품+황지])
  actualTier: number | null    // ③ 실제용 (가스 / 투입중량)
  deviationFromTarget: number | null // 보고용 기준 편차 (%)
  formula: string
}

export function calcGas3Tier(input: Gas3TierInput): Gas3TierResult {
  const { gasUsedM3 = 0, gasUsedMcal, productWeightTon, hwangjiWeightTon = 0, chargeWeightTon, targetMcalPerTon = 150 } = input

  const gasMcal = gasUsedMcal ?? (gasUsedM3 * LNG_HEAT_VALUE_MCAL_PER_M3)

  const reportTier = productWeightTon > 0 ? Number((gasMcal / productWeightTon).toFixed(1)) : null
  const totalProducedTon = productWeightTon + hwangjiWeightTon
  const analysisTier = totalProducedTon > 0 ? Number((gasMcal / totalProducedTon).toFixed(1)) : null
  const actualTier = chargeWeightTon > 0 ? Number((gasMcal / chargeWeightTon).toFixed(1)) : null

  let deviationFromTarget: number | null = null
  if (reportTier !== null && targetMcalPerTon > 0) {
    deviationFromTarget = Number((((reportTier - targetMcalPerTon) / targetMcalPerTon) * 100).toFixed(1))
  }

  const formula = [
    `🔥 [가스 원단위 3단계 분석 근거] (총 열량: ${gasMcal.toLocaleString()} Mcal)`,
    `① 보고용(제품대비) = 가스(${gasMcal.toLocaleString()}) ÷ 제품중량(${productWeightTon.toFixed(2)}t) = ${reportTier ?? 'N/A'} Mcal/t (목표대비 편차: ${deviationFromTarget ? (deviationFromTarget >= 0 ? '+' : '') + deviationFromTarget + '%' : 'N/A'})`,
    `② 분석용(총생산대비) = 가스(${gasMcal.toLocaleString()}) ÷ [제품(${productWeightTon.toFixed(1)}t)+황지(${hwangjiWeightTon.toFixed(1)}t)] = ${analysisTier ?? 'N/A'} Mcal/t`,
    `③ 실제용(투입대비) = 가스(${gasMcal.toLocaleString()}) ÷ 투입중량(${chargeWeightTon.toFixed(2)}t) = ${actualTier ?? 'N/A'} Mcal/t`,
    `💡 재가열 영향 = 보고용(${reportTier ?? 0}) - 실제용(${actualTier ?? 0}) = ${reportTier && actualTier ? (reportTier - actualTier).toFixed(1) : 0} Mcal/t (재가열로 인한 에너지 손실분)`,
  ].join('\n')

  return {
    gasMcal,
    reportTier,
    analysisTier,
    actualTier,
    deviationFromTarget,
    formula,
  }
}

// ─────────────────────────────────────────
// 6. 제품별 가스 배분 공식
// ─────────────────────────────────────────

export interface ProductGasAllocationItem {
  productName: string
  chargeWeightTon: number
  stdWorkCount: number      // 표준작업수 (히트 회차)
}

export interface ProductGasAllocationResult {
  productName: string
  allocatedGasMcal: number
  unitConsumptionMcalPerTon: number
  formula: string
}

export function calcProductGasAllocation(
  deptTotalGasMcal: number,
  products: ProductGasAllocationItem[]
): ProductGasAllocationResult[] {
  const totalWeightHit = products.reduce((sum, p) => sum + (p.chargeWeightTon * p.stdWorkCount), 0)

  if (totalWeightHit <= 0) return []

  return products.map((p) => {
    const weightHit = p.chargeWeightTon * p.stdWorkCount
    const allocatedGasMcal = Number((deptTotalGasMcal * (weightHit / totalWeightHit)).toFixed(1))
    const unitConsumptionMcalPerTon = p.chargeWeightTon > 0 ? Number((allocatedGasMcal / p.chargeWeightTon).toFixed(1)) : 0

    const formula = [
      `[${p.productName} 가스 배분]`,
      `= 부서총가스(${deptTotalGasMcal.toLocaleString()} Mcal) × [투입중량(${p.chargeWeightTon}t) × 표준횟수(${p.stdWorkCount}회)] ÷ Σ(총투입×횟수: ${totalWeightHit.toFixed(1)})`,
      `= 배분열량 ${allocatedGasMcal.toLocaleString()} Mcal → 제품 원단위: ${unitConsumptionMcalPerTon} Mcal/t`,
    ].join('\n')

    return {
      productName: p.productName,
      allocatedGasMcal,
      unitConsumptionMcalPerTon,
      formula,
    }
  })
}

// ─────────────────────────────────────────
// 7. 로방식별 원단위 (배치로 vs 대차로)
// ─────────────────────────────────────────

export interface FurnaceGasRecord {
  furnace: string
  gasMcal: number
  weightTon: number
}

export interface FurnaceGroupGasResult {
  groupName: '배치로(Batch)' | '대차로(Car)'
  furnaces: string[]
  totalGasMcal: number
  totalWeightTon: number
  unitConsumption: number | null
  formula: string
}

export function calcFurnaceGroupGas(records: FurnaceGasRecord[]): FurnaceGroupGasResult[] {
  const batchRecords = records.filter((r) => BATCH_FURNACES.some((bf) => r.furnace.trim().includes(bf)))
  const carRecords = records.filter((r) => !BATCH_FURNACES.some((bf) => r.furnace.trim().includes(bf)))

  const makeGroup = (name: '배치로(Batch)' | '대차로(Car)', recs: FurnaceGasRecord[]): FurnaceGroupGasResult => {
    const totalGasMcal = recs.reduce((s, r) => s + r.gasMcal, 0)
    const totalWeightTon = recs.reduce((s, r) => s + r.weightTon, 0)
    const unitConsumption = totalWeightTon > 0 ? Number((totalGasMcal / totalWeightTon).toFixed(1)) : null
    const furnaces = Array.from(new Set(recs.map((r) => r.furnace)))

    const formula = [
      `[${name} 그룹 가스 원단위] (포함호기: ${furnaces.join(', ') || '없음'})`,
      `= 그룹총가스(${totalGasMcal.toLocaleString()} Mcal) ÷ 그룹총중량(${totalWeightTon.toFixed(2)}t) = ${unitConsumption ?? 'N/A'} Mcal/t`,
    ].join('\n')

    return { groupName: name, furnaces, totalGasMcal, totalWeightTon, unitConsumption, formula }
  }

  return [makeGroup('배치로(Batch)', batchRecords), makeGroup('대차로(Car)', carRecords)]
}

// ─────────────────────────────────────────
// 8. 두산 벤치마크 비교
// ─────────────────────────────────────────

export type DoosanBenchmarkKey = keyof typeof DOOSAN_BENCHMARK

export interface DoosanComparisonResult {
  benchmarkLabel: string
  targetTonPerHour: number
  actualTonPerHour: number
  gap: number         // 실적 - 벤치마크
  percentage: number  // 실적 ÷ 벤치마크 × 100 (%)
  isSuperior: boolean
  formula: string
}

export function compareDoosanBenchmark(
  actualTonPerHour: number,
  productType: DoosanBenchmarkKey
): DoosanComparisonResult {
  const bm = DOOSAN_BENCHMARK[productType]
  const gap = Number((actualTonPerHour - bm.target).toFixed(2))
  const percentage = Number(((actualTonPerHour / bm.target) * 100).toFixed(1))
  const isSuperior = actualTonPerHour >= bm.target

  const formula = [
    `🏆 [두산 벤치마크 비교: ${bm.label}]`,
    `• 두산 기준: ${bm.target} ${bm.unit} vs 태웅 실적: ${actualTonPerHour} ${bm.unit}`,
    `• 갭: ${gap >= 0 ? '+' : ''}${gap} ${bm.unit} (${percentage}% 수준 — ${isSuperior ? '벤치마크 우위 🎉' : '벤치마크 대비 미흡 ⚠️'})`,
  ].join('\n')

  return {
    benchmarkLabel: bm.label,
    targetTonPerHour: bm.target,
    actualTonPerHour,
    gap,
    percentage,
    isSuperior,
    formula,
  }
}
