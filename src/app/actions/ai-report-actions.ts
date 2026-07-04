'use server'

import { createClient } from '@/lib/supabase/server'

export interface AiReportData {
  year: number
  month: number
  deptStats: {
    dept: string
    outputTon: number
    targetTon: number
    achievementRate: number
    gasUnit: number
    targetGasUnit: number
    topIssue: string
  }[]
  totalOutputTon: number
  totalTargetTon: number
  overallAchievement: number
  avgGasUnit: number
  reheatRatio: number
  costSavedEstimate: number // 기준 대비 절감 추정 (원)
}

export async function getAiReportData(year: number, month: number): Promise<AiReportData> {
  const supabase = await createClient()

  interface ProdRecord { dept: string | null; order_weight_ton: number | null; charge_weight_ton: number | null; gas_used_m3: number | null; work_hours: number | null }
  interface TargetRecord { dept: string | null; target_ton: number | null; target_gas_mcal: number | null }

  const { data: rawRecords } = await supabase
    .from('production_records')
    .select('dept, order_weight_ton, charge_weight_ton, gas_used_m3, work_hours')
    .gte('work_date', `${year}-${String(month).padStart(2, '0')}-01`)
    .lte('work_date', `${year}-${String(month).padStart(2, '0')}-31`)

  const { data: rawTargets } = await supabase
    .from('targets')
    .select('dept, target_ton, target_gas_mcal')
    .eq('year', year)

  const records = (rawRecords ?? []) as ProdRecord[]
  const targets = (rawTargets ?? []) as TargetRecord[]

  const LNG_HEAT = 10.55
  const LNG_PRICE = 1200
  const TARGET_GAS_BASE = 150

  // 부서별 집계
  const deptMap: Record<string, { output: number; charge: number; gas: number; hours: number }> = {}
  for (const r of records ?? []) {
    const d = r.dept ?? '미분류'
    if (!deptMap[d]) deptMap[d] = { output: 0, charge: 0, gas: 0, hours: 0 }
    deptMap[d].output += r.order_weight_ton ?? 0
    deptMap[d].charge += r.charge_weight_ton ?? 0
    deptMap[d].gas += r.gas_used_m3 ?? 0
    deptMap[d].hours += r.work_hours ?? 0
  }

  const deptStats = Object.entries(deptMap).map(([dept, v]) => {
    const tgt = targets?.find(t => dept.includes(t.dept?.substring(0, 3) ?? ''))
    const targetTon = tgt?.target_ton ?? 0
    const targetGasUnit = tgt?.target_gas_mcal ?? TARGET_GAS_BASE
    const achievementRate = targetTon > 0 ? (v.output / targetTon) * 100 : 100
    const gasUnit = v.output > 0 ? (v.gas * LNG_HEAT) / v.output : 0

    let topIssue = '이상 없음'
    if (achievementRate < 85) topIssue = `생산 심각 미달 (${achievementRate.toFixed(1)}%)`
    else if (achievementRate < 95) topIssue = `생산 미달 (${achievementRate.toFixed(1)}%)`
    else if (gasUnit > targetGasUnit * 1.05) topIssue = `가스 원단위 초과 (${gasUnit.toFixed(1)} Mcal/t)`

    return { dept, outputTon: +v.output.toFixed(1), targetTon, achievementRate: +achievementRate.toFixed(1), gasUnit: +gasUnit.toFixed(1), targetGasUnit, topIssue }
  })

  const totalOutputTon = deptStats.reduce((s, d) => s + d.outputTon, 0)
  const totalTargetTon = deptStats.reduce((s, d) => s + d.targetTon, 0)
  const overallAchievement = totalTargetTon > 0 ? (totalOutputTon / totalTargetTon) * 100 : 0
  const totalOutput = Object.values(deptMap).reduce((s, v) => s + v.output, 0)
  const totalCharge = Object.values(deptMap).reduce((s, v) => s + v.charge, 0)
  const totalGas = Object.values(deptMap).reduce((s, v) => s + v.gas, 0)
  const avgGasUnit = totalOutput > 0 ? (totalGas * LNG_HEAT) / totalOutput : 0
  const reheatRatio = totalOutput > 0 ? totalCharge / totalOutput : 1
  const gasSaved = (TARGET_GAS_BASE - avgGasUnit) / LNG_HEAT * totalOutput
  const costSavedEstimate = gasSaved * LNG_PRICE

  return {
    year, month, deptStats,
    totalOutputTon: +totalOutputTon.toFixed(1),
    totalTargetTon: +totalTargetTon.toFixed(1),
    overallAchievement: +overallAchievement.toFixed(1),
    avgGasUnit: +avgGasUnit.toFixed(1),
    reheatRatio: +reheatRatio.toFixed(3),
    costSavedEstimate: +costSavedEstimate.toFixed(0),
  }
}

/**
 * AI 자동 경영진 코멘터리 생성
 * 실제 데이터를 기반으로 결정론적 규칙 엔진으로 한국어 요약 문장을 생성합니다.
 * (Gemini/GPT API 연동 시 이 함수를 교체하면 됩니다)
 */
export async function generateAiCommentary(data: AiReportData): Promise<string> {
  const lines: string[] = []
  const monthLabel = `${data.year}년 ${data.month}월`

  // 1. 종합 요약
  const achStatus = data.overallAchievement >= 100 ? '목표를 달성' : data.overallAchievement >= 95 ? '목표에 근접' : '목표에 미달'
  lines.push(`[${monthLabel} 종합 경영 보고]`)
  lines.push(`이번 달 전사 생산량은 ${data.totalOutputTon.toLocaleString()}t으로, 목표 ${data.totalTargetTon.toLocaleString()}t 대비 ${data.overallAchievement.toFixed(1)}%로 ${achStatus}하였습니다.`)

  // 2. 가스 원단위 평가
  if (data.avgGasUnit > 0) {
    const gasStatus = data.avgGasUnit <= 150 ? `태상 목표(150 Mcal/t) 이내로 양호` : `태상 목표(150 Mcal/t)를 ${(data.avgGasUnit - 150).toFixed(1)} 초과`
    lines.push(`가스 원단위는 ${data.avgGasUnit.toFixed(1)} Mcal/t으로, ${gasStatus}합니다.`)
  }

  // 3. 재가열 배수 평가
  if (data.reheatRatio > 0) {
    const reheatComment = data.reheatRatio <= 1.10 ? '우수한 수준' : data.reheatRatio <= 1.20 ? '목표 범위 내' : '개선이 필요한 수준'
    lines.push(`재가열 배수는 ${data.reheatRatio.toFixed(2)}배로 ${reheatComment}입니다.`)
  }

  // 4. 부서별 주요 이슈
  const issues = data.deptStats.filter(d => d.topIssue !== '이상 없음')
  if (issues.length > 0) {
    lines.push(`\n[부서별 주요 이슈]`)
    for (const d of issues) {
      lines.push(`• ${d.dept}: ${d.topIssue}`)
    }
  }

  const topPerf = data.deptStats.filter(d => d.achievementRate >= 100)
  if (topPerf.length > 0) {
    lines.push(`\n[우수 달성 부서]`)
    for (const d of topPerf) {
      lines.push(`• ${d.dept}: 달성률 ${d.achievementRate.toFixed(1)}% ✅`)
    }
  }

  // 5. 절감 추정
  if (data.costSavedEstimate > 0) {
    lines.push(`\n[가스비 절감 추정] 기준 원단위(150 Mcal/t) 대비 약 ${(data.costSavedEstimate / 10000).toFixed(0)}만원 절감이 추정됩니다.`)
  } else if (data.costSavedEstimate < 0) {
    lines.push(`\n[가스비 초과 경고] 기준 원단위(150 Mcal/t) 초과로 약 ${Math.abs(data.costSavedEstimate / 10000).toFixed(0)}만원 추가 비용이 발생했습니다.`)
  }

  // 6. 권고 사항
  lines.push(`\n[권고 사항]`)
  if (data.overallAchievement < 95) lines.push(`• 달성률 제고를 위해 비가동 원인 분석 및 일정 관리를 강화하십시오.`)
  if (data.avgGasUnit > 150) lines.push(`• 가스 원단위 절감을 위해 재가열 배수 감소 및 연소 최적화를 실행하십시오.`)
  if (data.reheatRatio > 1.20) lines.push(`• 재가열 배수가 높습니다. 소재 계획 및 로딩 패턴을 검토하십시오.`)
  if (issues.length === 0 && data.overallAchievement >= 100) {
    lines.push(`• 전 부서 목표 달성. 현재 운영 수준을 유지하며 다음 달 목표를 검토하십시오.`)
  }

  return lines.join('\n')
}
