import * as XLSX from 'xlsx'
import type { DashboardKPIs } from '@/app/actions/data-actions'

/**
 * 경영진 보고용 엑셀 보고서 다운로드 (.xlsx)
 */
export function exportDashboardReportToExcel(kpis: DashboardKPIs) {
  if (!kpis) return

  const wb = XLSX.utils.book_new()
  const today = new Date().toISOString().split('T')[0]

  // ─────────────────────────────────────────
  // 1. KPI 종합 요약 시트
  // ─────────────────────────────────────────
  const summaryData = [
    ['태웅 단조공장 · 2026년 생산 및 가스 원단위 종합 보고서'],
    ['생산 일자 / 보고 기준 일시:', today, '보고 대상:', '경영진 및 생산관리본부'],
    [],
    ['[1. 핵심 KPI 요약]'],
    ['지표명', '보고 값', '세부 설명 / 비교 기준', '상태'],
    ['총 생산량 (완제품 기준)', `${kpis.totalOutputTon.toLocaleString()} t`, `목표 ${kpis.targetTon.toLocaleString()} t 대비`, kpis.achievementRate >= 95 ? '우수' : '주의'],
    ['생산 목표 달성률', `${kpis.achievementRate.toFixed(1)} %`, '황지(공정품) 제외 도메인 규칙 적용', kpis.achievementRate >= 95 ? '달성' : '미달'],
    ['가스 원단위 (보고용 - ①제품)', `${kpis.gas3Tier.reports.toFixed(1)} Mcal/t`, `목표 150.0 Mcal/t 대비 ${((kpis.gas3Tier.reports - 150) / 150 * 100).toFixed(1)}%`, kpis.gas3Tier.reports <= 150 ? '우수' : '경고'],
    ['가스 원단위 (분석용 - ②총생산)', `${kpis.gas3Tier.analysis.toFixed(1)} Mcal/t`, '황지(공정품) 포함 열량 효율 평가', '-'],
    ['가스 원단위 (실제용 - ③투입)', `${kpis.gas3Tier.actual.toFixed(1)} Mcal/t`, '가열로 총 투입 중량 기준', '-'],
    ['재가열 배수 (투입÷수주)', `${kpis.reheatRatio.toFixed(2)} 배`, '단조 소재 재가열 횟수 및 스크랩 손실 지표', kpis.reheatRatio <= 1.2 ? '양호' : '점검필요'],
    ['공정 불량률', `${kpis.defectRate.toFixed(1)} %`, '목표 ≤ 2.0% 기준 (표A/표B 이탈 검증)', kpis.defectRate <= 2.0 ? '정상' : '초과'],
    [],
    ['[2. 이상치 감지 및 긴급 알림]'],
    ['감지 상태:', kpis.anomalyDetected ? '🚨 이상 감지됨 (점검 필요)' : '✅ 정상 (특이사항 없음)'],
    ['세부 메시지:', kpis.anomalyMessage || '전 공정 원단위 및 불량률 정상 범위 유지 중'],
  ]

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
  
  // 열 너비 지정
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 35 }, { wch: 15 }]
  XLSX.utils.book_append_sheet(wb, summarySheet, '핵심_KPI_요약')

  // ─────────────────────────────────────────
  // 2. 부서별 상세 실적 및 원단위 시트
  // ─────────────────────────────────────────
  const deptHeader = [
    '부서 / 라인명',
    '목표 생산량 (t)',
    '실적 생산량 (t)',
    '달성률 (%)',
    '가스 원단위 (Mcal/t)',
    '재가열 배수',
    '종합 평가',
  ]

  const deptRows = kpis.deptStats.map((stat) => [
    stat.dept,
    stat.targetTon,
    stat.outputTon,
    `${stat.achievement.toFixed(1)}%`,
    stat.gasUnit.toFixed(1),
    `${stat.reheatRatio.toFixed(2)}배`,
    stat.achievement >= 95 && stat.gasUnit <= 150 ? '우수' : stat.achievement >= 85 ? '양호' : '점검필요',
  ])

  const deptData = [
    ['[부서별 생산 실적 및 가스 원단위 비교표]'],
    [],
    deptHeader,
    ...deptRows,
    [],
    ['※ 비고: 열처리 13호기는 단조 공정이 아니므로 kg/hit 단조 계산에서 제외됩니다.'],
  ]

  const deptSheet = XLSX.utils.aoa_to_sheet(deptData)
  deptSheet['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, deptSheet, '부서별_상세실적')

  // 파일 다운로드 트리거
  const fileName = `태웅단조_경영진보고서_${today}.xlsx`
  XLSX.writeFile(wb, fileName)
}

/**
 * 보고서 인쇄 (PDF 변환용 브라우저 인쇄 트리거)
 */
export function printDashboardReport() {
  if (typeof window !== 'undefined') {
    window.print()
  }
}
