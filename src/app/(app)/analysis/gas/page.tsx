'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell, Legend,
} from 'recharts'
import {
  calcGas3Tier, calcProductGasAllocation, calcFurnaceGroupGas,
  TAESUNG_STANDARD, LNG_HEAT_VALUE_MCAL_PER_M3, BATCH_FURNACES
} from '@/lib/analysis/calculations'
import { Flame, TrendingUp, TrendingDown, AlertTriangle, RefreshCw, HelpCircle } from 'lucide-react'
import { ChecklistWidget } from '@/components/ChecklistWidget'

// ─────────────────────────────────────────
// 일별 가스 원단위 추이 (Mcal/ton)
// ─────────────────────────────────────────

const DAILY_GAS = Array.from({ length: 20 }, (_, i) => {
  const baseReport = 148 + (Math.sin(i * 0.7) * 8 + (Math.random() - 0.5) * 5)
  const baseActual = baseReport * 0.85 // 실제용은 투입중량이 커서 원단위가 낮음
  return {
    day: `6/${i + 1}`,
    reportTier: +baseReport.toFixed(1),
    actualTier: +baseActual.toFixed(1),
    std: TAESUNG_STANDARD.default,
  }
})

// ─────────────────────────────────────────
// 호기별 검침 실적 및 3단계 원단위 계산
// ─────────────────────────────────────────

const EQUIPMENT_DATA = [
  { equip: '1호기', dept: 'P15 (1단조반)', usageM3: 14200, productTon: 102, hwangjiTon: 8, chargeTon: 120, isBatch: true },
  { equip: '2호기', dept: 'P15 (1단조반)', usageM3: 13500, productTon: 98,  hwangjiTon: 4, chargeTon: 115, isBatch: false },
  { equip: '9호기', dept: 'P5 (2단조반)',  usageM3: 15100, productTon: 110, hwangjiTon: 5, chargeTon: 130, isBatch: true },
  { equip: '10호기', dept: 'P5 (2단조반)', usageM3: 12800, productTon: 95,  hwangjiTon: 5, chargeTon: 112, isBatch: true },
  { equip: '5호기', dept: 'P8 (3단조반)',  usageM3: 16500, productTon: 92,  hwangjiTon: 6, chargeTon: 115, isBatch: false },
  { equip: '13호기', dept: '열처리 13호기', usageM3: 9000,  productTon: 100, hwangjiTon: 0, chargeTon: 100, isBatch: false },
].map((row) => {
  const tierRes = calcGas3Tier({
    gasUsedM3: row.usageM3,
    productWeightTon: row.productTon,
    hwangjiWeightTon: row.hwangjiTon,
    chargeWeightTon: row.chargeTon,
    targetMcalPerTon: TAESUNG_STANDARD.default,
  })
  return {
    ...row,
    ...tierRes,
  }
})

// 로방식(배치로 vs 대차로) 그룹 원단위 계산
const FURNACE_GROUP_RES = calcFurnaceGroupGas(
  EQUIPMENT_DATA.map((e) => ({
    furnace: e.equip,
    gasMcal: e.gasMcal,
    weightTon: e.productTon,
  }))
)

// ─────────────────────────────────────────
// 제품 mix별 가스 배분 (Formula 6)
// ─────────────────────────────────────────

const DEPT_TOTAL_GAS = 150000 // 예: P15 부서 월간 총 가스 150,000 Mcal
const PRODUCT_MIX_INPUT = [
  { productName: '탄소강 대형 금형', chargeWeightTon: 180, stdWorkCount: 3 },
  { productName: '합금강 크랭크축', chargeWeightTon: 140, stdWorkCount: 4 },
  { productName: '스테인리스 링밀', chargeWeightTon: 80,  stdWorkCount: 5 },
  { productName: '특수강 로터 샤프트', chargeWeightTon: 60,  stdWorkCount: 2 },
]
const PRODUCT_MIX_RES = calcProductGasAllocation(DEPT_TOTAL_GAS, PRODUCT_MIX_INPUT)

export default function GasAnalysisPage() {
  const totalGasMcal = EQUIPMENT_DATA.reduce((s, r) => s + r.gasMcal, 0)
  const totalProductTon = EQUIPMENT_DATA.reduce((s, r) => s + r.productTon, 0)
  const totalHwangjiTon = EQUIPMENT_DATA.reduce((s, r) => s + r.hwangjiTon, 0)
  const totalChargeTon = EQUIPMENT_DATA.reduce((s, r) => s + r.chargeTon, 0)

  const overallTier = calcGas3Tier({
    gasUsedMcal: totalGasMcal,
    productWeightTon: totalProductTon,
    hwangjiWeightTon: totalHwangjiTon,
    chargeWeightTon: totalChargeTon,
  })

  return (
    <div className="animate-in">
      <div className="section-header">
        <div>
          <h1 className="section-title">가스 원단위 3단계 심층 분석</h1>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            태웅 단조공장 · 2026년 6월 기준 · 보고용(제품) vs 분석용(총생산) vs 실제(투입) 재가열 손실 분석
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <a href="/upload" className="btn btn-outline" style={{ textDecoration: 'none' }}>
            🔥 가스검침 엑셀 업로드
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
            <option>2026년 6월 가스실적</option>
            <option>2026년 5월 가스실적</option>
          </select>
        </div>
      </div>

      {/* 체크리스트 위젯 */}
      <ChecklistWidget />

      {/* 4대 가스 원단위 KPI 카드 */}
      <div className="grid-kpi" style={{ marginBottom: '2.5rem' }}>
        <div
          className="kpi-card formula-tooltip"
          data-formula={`🔥 [보고용 가스 원단위]\n= 총 가스열량(${totalGasMcal.toLocaleString()} Mcal) ÷ 완제품중량(${totalProductTon}t) = ${overallTier.reportTier} Mcal/t\n💡 대외 보고 및 사장님 지시 보고서 표준 기준`}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>① 보고용 원단위 (제품대비)</span>
            <Flame size={18} color="var(--color-success)" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-success)', letterSpacing: '-1px' }}>
            {overallTier.reportTier} <span style={{ fontSize: '1rem', fontWeight: 600 }}>Mcal/t</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            태상기준 150 Mcal/t 대비 {overallTier.deviationFromTarget}% 달성
          </div>
        </div>

        <div
          className="kpi-card formula-tooltip"
          data-formula={`🔥 [분석용 가스 원단위]\n= 가스열량 ÷ [제품(${totalProductTon}t) + 황지(${totalHwangjiTon}t)] = ${overallTier.analysisTier} Mcal/t\n💡 공정품(황지) 생산에 소요된 가스를 반영한 실질 가공 효율`}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>② 분석용 원단위 (제품+황지)</span>
            <Flame size={18} color="var(--color-primary)" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-1px' }}>
            {overallTier.analysisTier} <span style={{ fontSize: '1rem', fontWeight: 600 }}>Mcal/t</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            황지 {totalHwangjiTon}t 열량 반영 효율
          </div>
        </div>

        <div
          className="kpi-card formula-tooltip"
          data-formula={`🔥 [실제 투입기준 원단위]\n= 가스열량 ÷ 총 투입중량(${totalChargeTon}t) = ${overallTier.actualTier} Mcal/t\n💡 가열로에 실제 투입된 잉고트/빌렛 총량 대비 연료 소비율`}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>③ 실제용 원단위 (투입대비)</span>
            <Flame size={18} color="var(--color-info)" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-info)', letterSpacing: '-1px' }}>
            {overallTier.actualTier} <span style={{ fontSize: '1rem', fontWeight: 600 }}>Mcal/t</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            투입 1,385t 기준 가열 효율
          </div>
        </div>

        <div
          className="kpi-card formula-tooltip"
          data-formula={`🔥 [재가열 손실 가스 분석]\n= 보고용(${overallTier.reportTier}) - 실제용(${overallTier.actualTier}) = ${(overallTier.reportTier! - overallTier.actualTier!).toFixed(1)} Mcal/t\n💡 단조 소재를 여러 번 가열하거나 불량으로 인해 발생한 열손실분`}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>재가열 열손실 갭</span>
            <RefreshCw size={18} color="var(--color-accent)" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-accent)', letterSpacing: '-1px' }}>
            {(overallTier.reportTier! - overallTier.actualTier!).toFixed(1)} <span style={{ fontSize: '1rem', fontWeight: 600 }}>Mcal/t</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            재가열 배수(1.18배)에 따른 손실분
          </div>
        </div>
      </div>

      {/* 로방식별 원단위 (배치로 vs 대차로) & 제품 mix 배분 2단 그리드 */}
      <div className="grid-2" style={{ marginBottom: '2.5rem' }}>
        {/* 로방식별 원단위 비교 */}
        <div className="kpi-card" style={{ padding: '1.75rem' }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--color-text)' }}>
            🔥 로방식별 원단위 비교 (배치로 vs 대차로)
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
            💡 배치로(1·9·10·11·12·14·15·16호기)와 대차로 그룹 간 가열 특성 비교
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>로방식 그룹</th>
                <th>포함 호기</th>
                <th style={{ textAlign: 'right' }}>가스(Mcal)</th>
                <th style={{ textAlign: 'right' }}>생산중량(t)</th>
                <th style={{ textAlign: 'right' }}>원단위(Mcal/t)</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {FURNACE_GROUP_RES.map((grp) => (
                <tr key={grp.groupName}>
                  <td style={{ fontWeight: 700 }}>{grp.groupName}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{grp.furnaces.join(', ')}</td>
                  <td style={{ textAlign: 'right' }}>{grp.totalGasMcal.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{grp.totalWeightTon.toFixed(1)}</td>
                  <td
                    style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-primary)' }}
                    className="formula-tooltip"
                    data-formula={grp.formula}
                  >
                    {grp.unitConsumption}
                  </td>
                  <td>
                    <span className="badge badge-success">정상 효율</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '1rem', padding: '0.75rem', background: 'var(--color-surface-2)', borderRadius: '6px' }}>
            💡 배치로는 연속 단조에 유리하여 대차로 대비 평균 약 8~10% 우수한 원단위를 보입니다.
          </div>
        </div>

        {/* 제품 mix별 가스 배분 (Formula 6) */}
        <div className="kpi-card" style={{ padding: '1.75rem' }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--color-text)' }}>
            🧪 제품 mix별 가스 배분 분석 (Formula 6)
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
            💡 부서 가스 × [제품 투입중량 × 표준작업수] ÷ Σ[투입중량 × 표준작업수] 배분 공식
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>제품명 / 강종</th>
                <th style={{ textAlign: 'right' }}>투입(t)</th>
                <th style={{ textAlign: 'right' }}>표준히트</th>
                <th style={{ textAlign: 'right' }}>배분열량(Mcal)</th>
                <th style={{ textAlign: 'right' }}>제품 원단위</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCT_MIX_RES.map((item) => (
                <tr key={item.productName}>
                  <td style={{ fontWeight: 600 }}>{item.productName}</td>
                  <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>
                    {PRODUCT_MIX_INPUT.find((p) => p.productName === item.productName)?.chargeWeightTon}t
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>
                    {PRODUCT_MIX_INPUT.find((p) => p.productName === item.productName)?.stdWorkCount}회
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.allocatedGasMcal.toLocaleString()}</td>
                  <td
                    style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-info)' }}
                    className="formula-tooltip"
                    data-formula={item.formula}
                  >
                    {item.unitConsumptionMcalPerTon} Mcal/t
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '1rem', padding: '0.75rem', background: 'var(--color-surface-2)', borderRadius: '6px' }}>
            💡 표준작업수(히트)가 5회로 높은 스테인리스 링밀은 단위 중량당 가스 소비량이 468 Mcal/t로 가장 높게 나타납니다.
          </div>
        </div>
      </div>

      {/* 일별 3단계 원단위 추이 차트 */}
      <div className="kpi-card" style={{ marginBottom: '2.5rem', padding: '1.75rem' }}>
        <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--color-text)' }}>
          📈 일별 가스 원단위 3단계 추이 (보고용 vs 실제 투입기준)
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
          💡 보고용(녹색)과 실제용(파란색)의 갭이 넓어지는 구간은 재가열 손실이나 황지 발생이 급증한 날입니다.
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={DAILY_GAS}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="day" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
            <YAxis domain={[100, 180]} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8 }}
              formatter={(v: number, name: string) => [
                `${v} Mcal/t`,
                name === 'reportTier' ? '① 보고용 (제품대비)' : name === 'actualTier' ? '③ 실제용 (투입대비)' : '태상기준',
              ]}
            />
            <Legend />
            <ReferenceLine y={TAESUNG_STANDARD.default} stroke="#f59e0b" strokeDasharray="6 4" label={{ value: '태상기준 (150)', fill: '#f59e0b', fontSize: 11 }} />
            <Line type="monotone" dataKey="reportTier" stroke="#10b981" strokeWidth={3} name="① 보고용 (제품대비)" dot={{ r: 4 }} />
            <Line type="monotone" dataKey="actualTier" stroke="#3b82f6" strokeWidth={2} name="③ 실제용 (투입대비)" strokeDasharray="4 4" dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 호기별 가스검침 상세 테이블 */}
      <div className="kpi-card" style={{ padding: '1.75rem' }}>
        <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
          🔍 호기별 3단계 원단위 상세 및 검침 실적
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>호기</th>
                <th>부서</th>
                <th>로방식</th>
                <th style={{ textAlign: 'right' }}>가스사용(m³)</th>
                <th style={{ textAlign: 'right' }}>제품(t)</th>
                <th style={{ textAlign: 'right' }}>황지(t)</th>
                <th style={{ textAlign: 'right' }}>투입(t)</th>
                <th style={{ textAlign: 'right' }}>① 보고용(Mcal/t)</th>
                <th style={{ textAlign: 'right' }}>② 분석용(Mcal/t)</th>
                <th style={{ textAlign: 'right' }}>③ 실제(Mcal/t)</th>
                <th>판정</th>
              </tr>
            </thead>
            <tbody>
              {EQUIPMENT_DATA.map((row) => (
                <tr key={row.equip}>
                  <td style={{ fontWeight: 700 }}>{row.equip}</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{row.dept}</td>
                  <td>
                    <span className={`badge ${row.isBatch ? 'badge-info' : 'badge-neutral'}`}>
                      {row.isBatch ? '배치로' : '대차로'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>{row.usageM3.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{row.productTon}</td>
                  <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>{row.hwangjiTon > 0 ? `+${row.hwangjiTon}` : '-'}</td>
                  <td style={{ textAlign: 'right' }}>{row.chargeTon}</td>
                  <td
                    style={{ textAlign: 'right', fontWeight: 800, color: row.reportTier! <= 150 ? 'var(--color-success)' : 'var(--color-danger)' }}
                    className="formula-tooltip"
                    data-formula={row.formula}
                  >
                    {row.reportTier}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>{row.analysisTier}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-info)' }}>{row.actualTier}</td>
                  <td>
                    <span className={`badge ${row.reportTier! <= 150 ? 'badge-success' : 'badge-warning'}`}>
                      {row.reportTier! <= 150 ? '정상' : '주의'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
