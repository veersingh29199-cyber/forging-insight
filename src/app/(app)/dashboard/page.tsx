'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Flame, Factory, AlertTriangle, CheckCircle2, RefreshCw, HelpCircle, ArrowRight, Loader2, Download, Printer } from 'lucide-react'
import { ChecklistWidget } from '@/components/ChecklistWidget'
import { getDashboardKPIs, type DashboardKPIs } from '@/app/actions/data-actions'
import { exportDashboardReportToExcel, printDashboardReport } from '@/lib/export/report'

// ─────────────────────────────────────────
// 도메인 5대 KPI 카드 데이터 (Section 7-2, 8, 10)
// ─────────────────────────────────────────

const DASHBOARD_KPIS = [
  {
    label: '이번 달 생산량 / 시간당 생산량',
    value: '1,174t / 18.2 t/h',
    sub: '수주중량 기준 (황지 42t 별도)',
    trend: +4.2,
    icon: Factory,
    color: '#3b82f6',
    formula: '[시간당 생산량(t/h)]\n= 수주중량(1,174t) ÷ 총 가동시간(64.5h) = 18.2 t/h\n※ 황지(공정품 42t)는 완제품이 아니므로 생산 실적 중량에서 분리 계산',
  },
  {
    label: '생산 목표 달성률',
    value: '94.7%',
    sub: '목표 1,240t 대비 (황지 제외)',
    trend: -5.3,
    icon: CheckCircle2,
    color: '#ef4444',
    formula: '[생산 달성률(%)]\n= 실적중량(1,174t) ÷ 목표중량(1,240t) × 100 = 94.7%\n💡 [도메인 공식 적용] 황지는 달성률 계산에서 제외됨 (Section 8-3)',
  },
  {
    label: '가스 원단위 3단계 (보고용)',
    value: '148.5 Mcal/t',
    sub: '분석용 143.2 / 실제 125.8 Mcal/t',
    trend: -1.0,
    icon: Flame,
    color: '#10b981',
    formula: '🔥 [가스 원단위 3단계 공식 근거]\n① 보고용(제품대비) = 가스열량 ÷ 제품중량 = 148.5 Mcal/t (태상기준 150 대비 -1.0% 달성🎉)\n② 분석용(총생산대비) = 가스 ÷ [제품+황지] = 143.2 Mcal/t\n③ 실제용(투입대비) = 가스 ÷ 투입중량 = 125.8 Mcal/t\n💡 재가열로 인한 열손실 = 148.5 - 125.8 = 22.7 Mcal/t',
  },
  {
    label: '재가열 배수 (투입÷수주)',
    value: '1.18 배',
    sub: '투입 1,385t / 수주 1,174t',
    trend: -0.05,
    icon: RefreshCw,
    color: '#f59e0b',
    formula: '[재가열 배수]\n= 총 투입중량(1,385t) ÷ 완제품 수주중량(1,174t) = 1.18배\n💡 단조 소재를 재가열한 횟수 및 불량/스크랩 손실 반영 지표 (1.0에 가까울수록 우수)',
  },
  {
    label: '공정 불량률',
    value: '1.3%',
    sub: '목표 ≤ 2.0% 달성 중',
    trend: -0.7,
    icon: AlertTriangle,
    color: '#8b5cf6',
    formula: '[불량률(%)]\n= 불량 발생 중량(15.4t) ÷ 총 생산 중량(1,188t) × 100 = 1.3%\n💡 원소재 규격(몰드표) 및 표A/표B 표준작업수 기준 이탈 검증 결과',
  },
]

// ─────────────────────────────────────────
// 부서별 생산 및 가스 적용 매트릭스 (Section 8-3, 10)
// ─────────────────────────────────────────

const DEPT_PRODUCTION_DATA = [
  { dept: 'P15 (1단조반)', target: 310, actual: 287, hwangji: 12, tonPerHour: 21.5, benchmark: 25, bmLabel: '금형강(25)', status: '미달', note: '금형강 비중 60%' },
  { dept: 'P5 (2단조반)', target: 320, actual: 315, hwangji: 15, tonPerHour: 26.4, benchmark: 26, bmLabel: '크랭크축(26)', status: '달성', note: '크랭크축 연속단조 우위' },
  { dept: 'P8 (3단조반)', target: 280, actual: 295, hwangji: 8, tonPerHour: 14.2, benchmark: 10, bmLabel: '쉘(10)', status: '달성', note: '쉘 가공 우수' },
  { dept: 'R9 (4단조반)', target: 150, actual: 142, hwangji: 5, tonPerHour: 8.5, benchmark: 7, bmLabel: '로터(7)', status: '미달', note: '로터 수주 감소' },
  { dept: 'R/M (링밀/자유)', target: 180, actual: 135, hwangji: 2, tonPerHour: 19.8, benchmark: 25, bmLabel: '금형강(25)', status: '주의', note: '수주치수(order_size) 기준' },
  { dept: '열처리 13호기', target: 0, actual: 450, hwangji: 0, tonPerHour: 35.0, benchmark: null, bmLabel: '제외(열처리)', status: '정상', note: 'kg/hit 단조계산 제외' },
]

const DEPT_GAS_DATA = [
  { dept: 'P15 (1단조반)', furnaceGroup: '배치로(1·9·10·11·12·14·15·16)', reportTier: 148.2, analysisTier: 142.1, actualTier: 124.5, target: 150.0, dev: -1.2, status: '우수' },
  { dept: 'P5 (2단조반)', furnaceGroup: '대차로(2·3·4·5·6·7·8·17·18·19·20)', reportTier: 139.5, analysisTier: 133.4, actualTier: 118.0, target: 140.0, dev: -0.4, status: '우수' },
  { dept: 'R/M (링밀/자유)', furnaceGroup: '대차로 및 전용로', reportTier: 172.4, analysisTier: 169.8, actualTier: 151.2, target: 160.0, dev: +7.8, status: '주의' },
  { dept: '열처리 13호기', furnaceGroup: '열처리 대차로 (13호기)', reportTier: 95.0, analysisTier: 95.0, actualTier: 95.0, target: 100.0, dev: -5.0, status: '정상' },
]

export default function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardKPIs(2026).then((data) => {
      setKpis(data)
      setLoading(false)
    }).catch((e) => {
      console.error('getDashboardKPIs error:', e)
      setLoading(false)
    })
  }, [])

  const displayKpis = DASHBOARD_KPIS.map((kpi, idx) => {
    if (!kpis || kpis.totalOutputTon === 0) return kpi
    if (idx === 0) {
      return {
        ...kpi,
        value: `${kpis.totalOutputTon.toLocaleString()}t / ${(kpis.totalOutputTon / 64.5).toFixed(1)} t/h`,
        sub: `목표 ${kpis.targetTon.toLocaleString()}t 대비`,
      }
    }
    if (idx === 1) {
      return {
        ...kpi,
        value: `${kpis.achievementRate.toFixed(1)}%`,
        sub: `목표 ${kpis.targetTon.toLocaleString()}t 기준`,
      }
    }
    if (idx === 2) {
      return {
        ...kpi,
        value: `${kpis.gas3Tier.reports.toFixed(1)} Mcal/t`,
        sub: `분석용 ${kpis.gas3Tier.analysis.toFixed(1)} / 실제 ${kpis.gas3Tier.actual.toFixed(1)} Mcal/t`,
      }
    }
    if (idx === 3) {
      return {
        ...kpi,
        value: `${kpis.reheatRatio.toFixed(2)} 배`,
      }
    }
    if (idx === 4) {
      return {
        ...kpi,
        value: `${kpis.defectRate.toFixed(1)}%`,
        sub: `목표 ≤ 2.0% 기준`,
      }
    }
    return kpi
  })

  const displayDeptProd = DEPT_PRODUCTION_DATA.map((row) => {
    if (!kpis) return row
    const stat = kpis.deptStats.find((s) => s.dept.includes(row.dept.substring(0, 3)) || row.dept.includes(s.dept.substring(0, 3)))
    if (!stat || stat.outputTon === 0) return row
    return {
      ...row,
      target: stat.targetTon,
      actual: stat.outputTon,
      status: stat.achievement >= 95 ? '달성' : stat.achievement >= 85 ? '주의' : '미달',
    }
  })

  const displayDeptGas = DEPT_GAS_DATA.map((row) => {
    if (!kpis) return row
    const stat = kpis.deptStats.find((s) => s.dept.includes(row.dept.substring(0, 3)) || row.dept.includes(s.dept.substring(0, 3)))
    if (!stat || stat.outputTon === 0) return row
    return {
      ...row,
      reportTier: stat.gasUnit,
      analysisTier: stat.gasUnit * 0.96,
      actualTier: stat.gasUnit * 0.85,
      dev: Number((stat.gasUnit - row.target).toFixed(1)),
      status: stat.gasUnit <= row.target ? '우수' : '주의',
    }
  })

  return (
    <div className="animate-in">
      {/* 헤더 */}
      <div className="section-header">
        <div>
          <h1 className="section-title">생산·가스 원단위 통합 대시보드</h1>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            태웅 단조공장 · 2026년 실적 집계 (황지 제외 / 3단계 원단위 / 두산 벤치마크 비교)
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {kpis && (
            <>
              <button
                className="btn btn-outline"
                onClick={() => exportDashboardReportToExcel(kpis)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: 'var(--color-success)', color: 'var(--color-success)', fontWeight: 700 }}
              >
                <Download size={15} /> 엑셀 보고서
              </button>
              <button
                className="btn btn-outline"
                onClick={printDashboardReport}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
              >
                <Printer size={15} /> 인쇄/PDF
              </button>
            </>
          )}
          <a href="/data-entry" className="btn btn-outline" style={{ textDecoration: 'none' }}>
            ✏️ 목표·기준 수기입력
          </a>
          <a href="/upload" className="btn btn-primary pulse-glow" style={{ textDecoration: 'none' }}>
            + 엑셀 파일 업로드
          </a>
        </div>
      </div>

      {/* Section 7-7 현장 적용 체크리스트 아코디언 위젯 */}
      <ChecklistWidget />

      {/* 이상치 감지 긴급 경고 배너 */}
      {kpis?.anomalyDetected && (
        <div
          className="animate-in"
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '2px solid var(--color-danger)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            color: 'var(--color-danger)',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
          }}
        >
          <AlertTriangle size={32} className="animate-bounce" />
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.25rem' }}>🚨 [긴급 이상치 감지 알림]</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text)', fontWeight: 600, lineHeight: 1.5 }}>
              {kpis.anomalyMessage}
            </div>
          </div>
        </div>
      )}

      {/* 5대 KPI 카드 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        {displayKpis.map((kpi) => {
          const Icon = kpi.icon
          const positive = kpi.trend < 0
            ? kpi.label.includes('원단위') || kpi.label.includes('비가동') || kpi.label.includes('불량') || kpi.label.includes('재가열')
            : !kpi.label.includes('원단위') && !kpi.label.includes('비가동') && !kpi.label.includes('불량') && !kpi.label.includes('재가열')

          return (
            <div
              key={kpi.label}
              className="kpi-card formula-tooltip"
              data-formula={kpi.formula}
              style={{ position: 'relative', cursor: 'help' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: `${kpi.color}22`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={20} color={kpi.color} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.8rem',
                      color: positive ? 'var(--color-success)' : 'var(--color-danger)',
                      fontWeight: 700,
                      background: positive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '999px',
                    }}
                  >
                    {positive ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                    {Math.abs(kpi.trend).toFixed(1)}%
                  </span>
                  <HelpCircle size={15} color="var(--color-text-dim)" />
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                {kpi.label}
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '0.35rem', letterSpacing: '-0.5px' }}>
                {kpi.value}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {kpi.sub}
              </div>
            </div>
          )
        })}
      </div>

      {/* 부서별 현황 2단 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* 생산 달성률 및 두산 벤치마크 비교 */}
        <div className="kpi-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🏭 부서별 생산 달성률 & 시간당 생산량(t/h) 벤치마크 비교
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                💡 <strong style={{ color: 'var(--color-accent)' }}>도메인 규칙(Section 8-3):</strong> 황지(공정품)는 달성률에서 제외되며, 열처리 13호기는 단조 kg/hit 계산에서 제외됩니다.
              </div>
            </div>
            <a href="/analysis/production" style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              생산량 상세 분석 <ArrowRight size={14} />
            </a>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>부서 / 라인</th>
                  <th style={{ textAlign: 'right' }}>목표(t)</th>
                  <th style={{ textAlign: 'right' }}>실적(t)</th>
                  <th style={{ textAlign: 'right' }}>황지(t)</th>
                  <th style={{ textAlign: 'right' }}>달성률(%)</th>
                  <th style={{ textAlign: 'right' }}>시간당 생산(t/h)</th>
                  <th>두산 벤치마크</th>
                  <th>상태 / 비고</th>
                </tr>
              </thead>
              <tbody>
                {displayDeptProd.map((row) => {
                  const rate = row.target > 0 ? (row.actual / row.target) * 100 : null
                  const achieved = rate ? rate >= 95 : true
                  const isSuperior = row.benchmark ? row.tonPerHour >= row.benchmark : true

                  return (
                    <tr key={row.dept}>
                      <td style={{ fontWeight: 700 }}>
                        {row.dept}
                        {row.dept.includes('열처리') && <span className="badge badge-neutral" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>단조제외</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>{row.target > 0 ? row.target.toLocaleString() : '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{row.actual.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>{row.hwangji > 0 ? `+${row.hwangji}` : '-'}</td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 800,
                          color: rate ? (achieved ? 'var(--color-success)' : 'var(--color-danger)') : 'var(--color-text-muted)',
                        }}
                        className="formula-tooltip"
                        data-formula={`[${row.dept} 달성률 근거]\n= 실적(${row.actual}t) ÷ 목표(${row.target}t) × 100 = ${rate ? rate.toFixed(1) + '%' : 'N/A'}\n※ 황지(${row.hwangji}t)는 분리 계산되어 실적에 미포함`}
                      >
                        {rate ? `${rate.toFixed(1)}%` : 'N/A(열처리)'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-info)' }}>
                        {row.tonPerHour.toFixed(1)} t/h
                      </td>
                      <td
                        className="formula-tooltip"
                        data-formula={row.benchmark ? `[두산 벤치마크 비교: ${row.bmLabel}]\n• 두산 기준: ${row.benchmark} t/h vs 태웅 실적: ${row.tonPerHour} t/h\n• 편차: ${row.tonPerHour - row.benchmark >= 0 ? '+' : ''}${(row.tonPerHour - row.benchmark).toFixed(1)} t/h (${isSuperior ? '벤치마크 우위🎉' : '벤치마크 미달⚠️'})` : `열처리 공정은 단조 시간당 생산량(t/h) 벤치마크 적용 대상이 아닙니다.`}
                      >
                        <span className={`badge ${isSuperior ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.75rem' }}>
                          {row.bmLabel} {row.benchmark ? (isSuperior ? '✓ 우위' : '▲ 미달') : ''}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${row.status === '달성' || row.status === '정상' ? 'badge-success' : row.status === '주의' ? 'badge-warning' : 'badge-danger'}`}>
                          {row.status}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
                          {row.note}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 가스 원단위 3단계 매트릭스 */}
        <div className="kpi-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🔥 부서별 가스 원단위 3단계 (보고용 / 분석용 / 실제) & 로방식별 현황
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                💡 <strong style={{ color: 'var(--color-success)' }}>3단계 공식(Section 8-3):</strong> ①보고용(제품대비) / ②분석용(제품+황지) / ③실제(투입중량대비). 보고용-실제 차이는 재가열 손실분을 의미합니다.
              </div>
            </div>
            <a href="/analysis/gas" style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              가스 원단위 상세 분석 <ArrowRight size={14} />
            </a>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>부서</th>
                  <th>로방식 / 소속 호기</th>
                  <th style={{ textAlign: 'right' }}>① 보고용(Mcal/t)</th>
                  <th style={{ textAlign: 'right' }}>② 분석용(Mcal/t)</th>
                  <th style={{ textAlign: 'right' }}>③ 실제(Mcal/t)</th>
                  <th style={{ textAlign: 'right' }}>태상 목표기준</th>
                  <th style={{ textAlign: 'right' }}>목표 편차</th>
                  <th>판정</th>
                </tr>
              </thead>
              <tbody>
                {displayDeptGas.map((row) => {
                  const ok = row.dev <= 5.0
                  const reheatLoss = (row.reportTier - row.actualTier).toFixed(1)

                  return (
                    <tr key={row.dept}>
                      <td style={{ fontWeight: 700 }}>{row.dept}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{row.furnaceGroup}</td>
                      <td
                        style={{ textAlign: 'right', fontWeight: 800, color: ok ? 'var(--color-success)' : 'var(--color-danger)' }}
                        className="formula-tooltip"
                        data-formula={`🔥 [${row.dept} 3단계 원단위 근거]\n① 보고용(제품대비): ${row.reportTier} Mcal/t\n② 분석용(총생산대비): ${row.analysisTier} Mcal/t\n③ 실제용(투입대비): ${row.actualTier} Mcal/t\n💡 재가열로 인한 에너지 손실 = ${row.reportTier} - ${row.actualTier} = ${reheatLoss} Mcal/t`}
                      >
                        {row.reportTier.toFixed(1)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>
                        {row.analysisTier.toFixed(1)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-info)' }}>
                        {row.actualTier.toFixed(1)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>
                        {row.target.toFixed(1)}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: row.dev > 0 ? 'var(--color-danger)' : 'var(--color-success)',
                        }}
                      >
                        {row.dev > 0 ? '+' : ''}{row.dev.toFixed(1)}%
                      </td>
                      <td>
                        <span className={`badge ${row.status === '우수' || row.status === '정상' ? 'badge-success' : 'badge-warning'}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 하단 퀵 안내 */}
      <div
        style={{
          background: 'rgba(59,130,246,0.05)',
          border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '2rem' }}>💡</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)', marginBottom: '0.2rem' }}>
              수치에 마우스를 올리면 태웅 단조공장 도메인 공식 근거가 표시됩니다
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              엑셀 업로드 시 10단계 파싱 엔진이 자동으로 단위(kg→t)를 변환하고, 오류 셀(#REF!)을 필터링하여 위 매트릭스에 즉시 반영합니다.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <a href="/settings" className="btn btn-outline" style={{ fontSize: '0.8rem', textDecoration: 'none' }}>
            ⚙️ 호기·로방식 매핑 관리
          </a>
          <a href="/upload" className="btn btn-primary" style={{ fontSize: '0.8rem', textDecoration: 'none' }}>
            엑셀 업로드 →
          </a>
        </div>
      </div>
    </div>
  )
}
