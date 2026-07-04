'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, LineChart, Line, Legend,
} from 'recharts'
import { calcProductionKPIs, compareDoosanBenchmark, DOOSAN_BENCHMARK } from '@/lib/analysis/calculations'
import { TrendingUp, TrendingDown, AlertTriangle, Factory, CheckCircle2, HelpCircle } from 'lucide-react'
import { ChecklistWidget } from '@/components/ChecklistWidget'

// ─────────────────────────────────────────
// 월별 목표/실적 추이 (ton)
// ─────────────────────────────────────────

const MONTHLY_DATA = [
  { month: '1월', target: 1180, actual: 1152, hwangji: 38 },
  { month: '2월', target: 1050, actual: 1089, hwangji: 41 },
  { month: '3월', target: 1200, actual: 1175, hwangji: 35 },
  { month: '4월', target: 1220, actual: 1198, hwangji: 45 },
  { month: '5월', target: 1250, actual: 1202, hwangji: 40 },
  { month: '6월', target: 1240, actual: 1174, hwangji: 42 },
]

// ─────────────────────────────────────────
// 부서별 실적 및 두산 벤치마크 매트릭스 (Section 8-3, 10)
// ─────────────────────────────────────────

const DEPT_DATA = [
  { dept: 'P15 (1단조반)', target: 310, actual: 287, hwangji: 12, workHours: 13.3, workCount: 45, chargeTon: 340, bmKey: 'die_steel' as const, shortfall_reason: '설비 비가동 (2호기 유압 고장 180분)' },
  { dept: 'P5 (2단조반)', target: 320, actual: 315, hwangji: 15, workHours: 11.9, workCount: 52, chargeTon: 375, bmKey: 'crankshaft' as const, shortfall_reason: '' },
  { dept: 'P8 (3단조반)', target: 280, actual: 295, hwangji: 8, workHours: 20.7, workCount: 40, chargeTon: 340, bmKey: 'shell' as const, shortfall_reason: '' },
  { dept: 'R9 (4단조반)', target: 150, actual: 142, hwangji: 5, workHours: 16.7, workCount: 25, chargeTon: 165, bmKey: 'rotor' as const, shortfall_reason: '자재(합금강 잉고트) 공급 지연' },
  { dept: 'R/M (링밀/자유)', target: 180, actual: 135, hwangji: 2, workHours: 6.8, workCount: 30, chargeTon: 165, bmKey: 'die_steel' as const, shortfall_reason: '수주치수(order_size) 기준 세팅 소요' },
  { dept: '열처리 13호기', target: 0, actual: 450, hwangji: 0, workHours: 12.8, workCount: 15, chargeTon: 450, bmKey: null, shortfall_reason: '' },
].map((d) => {
  const kpis = calcProductionKPIs({
    orderWeightTon: d.actual,
    workHours: d.workHours,
    workCount: d.workCount,
    chargeWeightTon: d.chargeTon,
    targetTon: d.target,
    isHwangji: d.dept.includes('열처리'),
  })
  const bmComp = d.bmKey ? compareDoosanBenchmark(kpis.tonPerHour ?? 0, d.bmKey) : null
  return {
    ...d,
    ...kpis,
    bmComp,
  }
})

const DOWNTIME_DATA = [
  { reason: '설비 고장 (유압/전기)', minutes: 180, dept: 'P15 (1단조반)' },
  { reason: '자재 부족 / 공급지연', minutes: 120, dept: 'R9 (4단조반)' },
  { reason: '금형 교체 / 예열', minutes: 60, dept: 'P5 (2단조반)' },
  { reason: '품질 문제 (크랙/치수)', minutes: 45, dept: 'P8 (3단조반)' },
  { reason: '기타 대기', minutes: 30, dept: 'R/M (링밀/자유)' },
]

export default function ProductionAnalysisPage() {
  const totalTarget = MONTHLY_DATA[MONTHLY_DATA.length - 1].target
  const totalActual = MONTHLY_DATA[MONTHLY_DATA.length - 1].actual
  const totalHwangji = MONTHLY_DATA[MONTHLY_DATA.length - 1].hwangji
  const totalRate = ((totalActual / totalTarget) * 100).toFixed(1)
  const totalGap = totalActual - totalTarget

  return (
    <div className="animate-in">
      <div className="section-header">
        <div>
          <h1 className="section-title">생산량 심층 분석</h1>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            태웅 단조공장 · 2026년 6월 기준 · 출처: 생산량집계표, 연간목표, 실적원장 (P15/P5/P8/R9/RM)
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <a href="/upload" className="btn btn-outline" style={{ textDecoration: 'none' }}>
            📁 실적 엑셀 업로드
          </a>
          <select
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text)',
              padding: '0.4rem 0.875rem',
              fontSize: '0.875rem',
            }}
          >
            <option>2026년 6월 실적</option>
            <option>2026년 5월 실적</option>
          </select>
        </div>
      </div>

      {/* 체크리스트 위젯 */}
      <ChecklistWidget />

      {/* 4대 핵심 생산 KPI */}
      <div className="grid-kpi" style={{ marginBottom: '2.5rem' }}>
        <div
          className="kpi-card formula-tooltip"
          data-formula={`[이달 생산 달성률 근거]\n= 완제품 수주중량(${totalActual.toLocaleString()}t) ÷ 목표중량(${totalTarget.toLocaleString()}t) × 100 = ${totalRate}%\n💡 황지(공정품 ${totalHwangji}t)는 달성률 계산에서 분리하여 별도 표기`}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>이달 생산 달성률</span>
            <Factory size={18} color="var(--color-primary)" />
          </div>
          <div
            style={{
              fontSize: '2.2rem',
              fontWeight: 800,
              color: Number(totalRate) >= 100 ? 'var(--color-success)' : 'var(--color-danger)',
              letterSpacing: '-1px',
            }}
          >
            {totalRate}%
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            목표 {totalTarget.toLocaleString()}t → 실적 {totalActual.toLocaleString()}t (황지 +{totalHwangji}t)
          </div>
          <div className="progress-bar" style={{ marginTop: '0.75rem' }}>
            <div
              className={`progress-bar-fill ${Number(totalRate) >= 100 ? 'progress-success' : 'progress-danger'}`}
              style={{ width: `${Math.min(Number(totalRate), 100)}%` }}
            />
          </div>
        </div>

        <div
          className="kpi-card formula-tooltip"
          data-formula={`[생산 갭 분석]\n= 실적(${totalActual.toLocaleString()}t) - 목표(${totalTarget.toLocaleString()}t) = ${totalGap}t\n📌 주요 미달 부서: P15(-23t), R9(-8t), R/M(-45t)`}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>목표 대비 생산 갭</span>
            <TrendingDown size={18} color="var(--color-danger)" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-danger)', letterSpacing: '-1px' }}>
            {totalGap}t
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            주요 요인: 설비 비가동(180분), 자재 공급지연
          </div>
        </div>

        <div
          className="kpi-card formula-tooltip"
          data-formula={`[시간당 단조 생산성 (톤/h)]\n= 부서 전체 수주중량 ÷ 가동시간\n💡 두산 벤치마크: 금형강(25 t/h), 크랭크축(26 t/h) 수준`}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>평균 시간당 생산량</span>
            <TrendingUp size={18} color="var(--color-info)" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-info)', letterSpacing: '-1px' }}>
            18.2 t/h
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            P5(2단조) 26.4 t/h 최고 효율 달성 중
          </div>
        </div>

        <div
          className="kpi-card formula-tooltip"
          data-formula={`[당월 비가동 누적 손실]\n= 총 비가동 시간: 312분 (5.2시간)\n💡 평균 시간당 생산량(18.2 t/h) 적용 시 약 94.6톤의 생산 기회손실 발생`}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>비가동 누적 시간</span>
            <AlertTriangle size={18} color="var(--color-accent)" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-accent)', letterSpacing: '-1px' }}>
            312 분
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            전월 대비 -18분 개선 (설비 고장 비중 57%)
          </div>
        </div>
      </div>

      {/* 부서별 생산 지표 및 두산 벤치마크 매트릭스 */}
      <div className="kpi-card" style={{ marginBottom: '2.5rem', padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-text)' }}>
              🏭 부서별 생산 분석 및 두산 벤치마크(금형강 25, 크랭크축 26, 쉘 10, 로터 7) 비교
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              💡 황지는 공정품이므로 달성률 계산에서 분리되며, 열처리 13호기는 단조 톤/회(hit) 및 톤/h 벤치마크에서 제외됩니다.
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>부서 / 공정</th>
                <th style={{ textAlign: 'right' }}>목표(t)</th>
                <th style={{ textAlign: 'right' }}>실적(t)</th>
                <th style={{ textAlign: 'right' }}>황지(t)</th>
                <th style={{ textAlign: 'right' }}>달성률(%)</th>
                <th style={{ textAlign: 'right' }}>작업시간(h)</th>
                <th style={{ textAlign: 'right' }}>작업횟수(hit)</th>
                <th style={{ textAlign: 'right' }}>톤/회(t/hit)</th>
                <th style={{ textAlign: 'right' }}>시간당 생산(t/h)</th>
                <th>두산 벤치마크 비교</th>
              </tr>
            </thead>
            <tbody>
              {DEPT_DATA.map((row) => (
                <tr key={row.dept}>
                  <td style={{ fontWeight: 700 }}>
                    {row.dept}
                    {row.dept.includes('열처리') && <span className="badge badge-neutral" style={{ marginLeft: '0.4rem', fontSize: '0.65rem' }}>단조제외</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>{row.target > 0 ? row.target.toLocaleString() : '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{row.actual.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>{row.hwangji > 0 ? `+${row.hwangji}` : '-'}</td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontWeight: 800,
                      color: row.achievementRate ? (row.achievementRate >= 95 ? 'var(--color-success)' : 'var(--color-danger)') : 'var(--color-text-muted)',
                    }}
                    className="formula-tooltip"
                    data-formula={row.formulas.achievementRate}
                  >
                    {row.achievementRate ? `${row.achievementRate}%` : 'N/A(열처리)'}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>{row.workHours}h</td>
                  <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>{row.workCount}회</td>
                  <td
                    style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-text)' }}
                    className="formula-tooltip"
                    data-formula={row.formulas.tonPerHit}
                  >
                    {row.tonPerHit ? `${row.tonPerHit} t/hit` : '-'}
                  </td>
                  <td
                    style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-info)' }}
                    className="formula-tooltip"
                    data-formula={row.formulas.tonPerHour}
                  >
                    {row.tonPerHour ? `${row.tonPerHour} t/h` : '-'}
                  </td>
                  <td
                    className="formula-tooltip"
                    data-formula={row.bmComp?.formula || '열처리 공정은 단조 벤치마크 대상에서 제외됩니다.'}
                  >
                    {row.bmComp ? (
                      <span className={`badge ${row.bmComp.isSuperior ? 'badge-success' : 'badge-warning'}`}>
                        {row.bmComp.benchmarkLabel}({row.bmComp.targetTonPerHour}) {row.bmComp.isSuperior ? `✓ 우위(+${row.bmComp.gap})` : `▲ 미흡(${row.bmComp.gap})`}
                      </span>
                    ) : (
                      <span className="badge badge-neutral">벤치마크 제외</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 차트 & 비가동 원인 2단 그리드 */}
      <div className="grid-2" style={{ marginBottom: '2.5rem' }}>
        {/* 월별 실적 추이 차트 */}
        <div className="kpi-card">
          <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>
            📈 월별 목표/실적 및 황지 생산 추이 (ton)
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={MONTHLY_DATA} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8 }}
                formatter={(v: number, name: string) => [
                  `${v.toLocaleString()}t`,
                  name === 'target' ? '목표' : name === 'actual' ? '실적(제품)' : '황지(공정품)',
                ]}
              />
              <Legend />
              <Bar dataKey="target" fill="#1e3a5f" name="목표중량" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" fill="#3b82f6" name="실적(제품)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="hwangji" fill="#f59e0b" name="황지(공정품)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 비가동 원인 분석 */}
        <div className="kpi-card">
          <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>
            ⚠️ 비가동 및 미달 원인 심층 분석
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>비가동 원인</th>
                <th>발생 부서</th>
                <th style={{ textAlign: 'right' }}>시간(분)</th>
                <th>점유율</th>
              </tr>
            </thead>
            <tbody>
              {DOWNTIME_DATA.map((row, i) => {
                const totalMin = DOWNTIME_DATA.reduce((s, r) => s + r.minutes, 0)
                const pct = (row.minutes / totalMin) * 100
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{row.reason}</td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{row.dept}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-danger)' }}>{row.minutes}분</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="progress-bar" style={{ flex: 1 }}>
                          <div className="progress-bar-fill progress-danger" style={{ width: `${pct}%` }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', minWidth: 35 }}>
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '1rem', padding: '0.75rem', background: 'var(--color-surface-2)', borderRadius: '6px' }}>
            💡 <strong>현장 조치 제안:</strong> P15 2호기 유압 고장이 전체 비가동의 57%를 차지합니다. 설비보전 팀과 연계하여 유압 펌프 예방정비 주기 조정이 요구됩니다.
          </div>
        </div>
      </div>
    </div>
  )
}
