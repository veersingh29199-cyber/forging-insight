'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { calcGas3Tier } from '@/lib/analysis/calculations'
import { revalidatePath } from 'next/cache'

export interface DashboardKPIs {
  totalOutputTon: number
  targetTon: number
  achievementRate: number
  gas3Tier: {
    reports: number
    analysis: number
    actual: number
  }
  defectRate: number
  reheatRatio: number
  anomalyDetected: boolean
  anomalyMessage?: string
  lastUpdated?: string
  deptStats: Array<{
    dept: string
    outputTon: number
    targetTon: number
    achievement: number
    gasUnit: number
    reheatRatio: number
  }>
}

/**
 * 대시보드 KPI 및 부서별 집계 조회
 */
export async function getDashboardKPIs(year = 2026, month?: number): Promise<DashboardKPIs> {
  const supabase = await createServiceClient()

  // 1. 목표치 조회
  let targetQuery = supabase.from('targets').select('*').eq('year', year)
  if (month) targetQuery = targetQuery.eq('month', month)
  else targetQuery = targetQuery.is('month', null)

  interface TargetRow { dept: string | null; target_ton: number | null; month: number | null }
  interface ProdRow {
    dept: string | null; order_weight_ton: number | null; charge_weight_ton: number | null
    hwangji_weight_ton: number | null; gas_used_m3: number | null; work_count: number | null
    created_at: string | null
  }

  const { data: targetRowsRaw } = await targetQuery
  const targetRows = (targetRowsRaw || []) as TargetRow[]
  const totalTargetTon = targetRows.reduce((sum: number, r: TargetRow) => sum + Number(r.target_ton || 0), 0) || 14880

  // 2. 생산 실적 조회
  let prodQuery = supabase.from('production_records').select('*')
  if (month) {
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`
    const endStr = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`
    prodQuery = prodQuery.gte('work_date', startStr).lt('work_date', endStr)
  } else {
    prodQuery = prodQuery.gte('work_date', `${year}-01-01`).lt('work_date', `${year + 1}-01-01`)
  }

  const { data: prodRowsRaw } = await prodQuery
  const records = (prodRowsRaw || []) as ProdRow[]

  // 총 생산량 (황지 제외 보고용)
  const totalOutputTon = records.reduce((sum: number, r: ProdRow) => sum + Number(r.order_weight_ton || 0), 0)
  const totalChargeTon = records.reduce((sum: number, r: ProdRow) => sum + Number(r.charge_weight_ton || 0), 0)
  const totalHwangjiTon = records.reduce((sum: number, r: ProdRow) => sum + Number(r.hwangji_weight_ton || 0), 0)
  const totalGasM3 = records.reduce((sum: number, r: ProdRow) => sum + Number(r.gas_used_m3 || 0), 0)
  const totalWorkCount = records.reduce((sum: number, r: ProdRow) => sum + Number(r.work_count || 1), 0)

  // 달성률
  const achievementRate = totalTargetTon > 0 ? (totalOutputTon / totalTargetTon) * 100 : 0

  // 3단계 가스 원단위 계산
  const gas3TierRaw = calcGas3Tier({
    productWeightTon: totalOutputTon,
    chargeWeightTon: totalChargeTon,
    hwangjiWeightTon: totalHwangjiTon,
    gasUsedM3: totalGasM3,
  })
  const gas3Tier = {
    reports: gas3TierRaw.reportTier || 0,
    analysis: gas3TierRaw.analysisTier || 0,
    actual: gas3TierRaw.actualTier || 0,
  }

  // 재가열 배수 (작업횟수 / 기준 3회)
  const reheatRatio = records.length > 0 ? totalWorkCount / (records.length * 3) : 1.0

  // 불량률 (임의 1.4% 혹은 공정품 비율 기반 추정)
  const defectRate = totalChargeTon > 0 ? (totalHwangjiTon / totalChargeTon) * 100 : 1.4

  // 이상치 감지 로직 (실제 원단위 > 155 Mcal/ton 또는 불량률 > 2.0%)
  let anomalyDetected = false
  let anomalyMessage: string | undefined

  if (gas3Tier.actual > 155.0) {
    anomalyDetected = true
    anomalyMessage = `🚨 [가스 원단위 경고] 실제용 원단위(${gas3Tier.actual} Mcal/ton)가 목표치(150.0)를 5% 이상 초과했습니다. P8/R9 부서의 가열로 공기비 및 재가열 대기 시간을 점검하십시오.`
  } else if (defectRate > 2.0) {
    anomalyDetected = true
    anomalyMessage = `🚨 [공정 불량 경고] 황지/불량 비율(${defectRate.toFixed(1)}%)이 기준치(2.0%)를 초과했습니다. 원소재 규격 및 가열 조건을 점검하십시오.`
  }

  // 부서별 통계
  const depts = ['P15 (1단조반)', 'P5 (2단조반)', 'P8 (3단조반)', 'R9 (4단조반)', 'R/M (링밀/자유)']
  const deptStats = depts.map((d) => {
    const dRecords = records.filter((r: ProdRow) => r.dept?.includes(d.substring(0, 3)) || r.dept === d)
    const dOutput = dRecords.reduce((sum: number, r: ProdRow) => sum + Number(r.order_weight_ton || 0), 0)
    const dCharge = dRecords.reduce((sum: number, r: ProdRow) => sum + Number(r.charge_weight_ton || 0), 0)
    const dGas = dRecords.reduce((sum: number, r: ProdRow) => sum + Number(r.gas_used_m3 || 0), 0)
    const dTargetRow = targetRows.find((tr: TargetRow) => tr.dept?.includes(d.substring(0, 3)) || tr.dept === d)
    const dTarget = Number(dTargetRow?.target_ton || 3000)
    const dAch = dTarget > 0 ? (dOutput / dTarget) * 100 : 0

    const dGasCalc = calcGas3Tier({
      productWeightTon: dOutput,
      chargeWeightTon: dCharge,
      hwangjiWeightTon: 0,
      gasUsedM3: dGas,
    })

    const reheatRatio = dRecords.length > 0
      ? dRecords.reduce((sum: number, r: ProdRow) => sum + Number(r.work_count || 1), 0) / (dRecords.length * 3)
      : 1.0

    return {
      dept: d,
      outputTon: dOutput,
      targetTon: dTarget,
      achievement: dAch,
      gasUnit: dGasCalc.reportTier || 145.0,
      reheatRatio,
    }
  })

  // 마지막 업데이트 시간
  const lastUpdated = (records.length > 0 ? records[0].created_at : null) ?? new Date().toISOString()

  return {
    totalOutputTon,
    targetTon: totalTargetTon,
    achievementRate,
    gas3Tier,
    defectRate,
    reheatRatio,
    anomalyDetected,
    anomalyMessage,
    lastUpdated,
    deptStats,
  }
}

/**
 * 현장 수기 실적 저장 API
 */
export async function saveManualEntry(data: {
  workDate: string
  dept: string
  shift: string
  orderNo: string
  product: string
  material: string
  orderWeightTon: number
  chargeWeightTon: number
  hwangjiWeightTon: number
  furnace: string
  workHours: number
  workCount: number
  gasUsedM3: number
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServiceClient()

    const { error } = await supabase.from('production_records').insert({
      work_date: data.workDate,
      dept: data.dept,
      shift: data.shift,
      order_no: data.orderNo,
      product: data.product,
      material: data.material,
      order_weight_ton: data.orderWeightTon,
      charge_weight_ton: data.chargeWeightTon,
      hwangji_weight_ton: data.hwangjiWeightTon,
      furnace: data.furnace,
      work_hours: data.workHours,
      work_count: data.workCount,
      gas_used_m3: data.gasUsedM3,
    } as never)

    if (error) throw new Error(error.message)

    revalidatePath('/dashboard')
    revalidatePath('/data-entry')

    return { success: true }
  } catch (err: unknown) {
    console.error('saveManualEntry error:', err)
    const msg = err instanceof Error ? err.message : '실적 저장 실패'
    return { success: false, error: msg }
  }
}
