'use client'

import { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, Zap, Flame, RefreshCw, Factory } from 'lucide-react'

// ─── 기준값 상수 (2026년 태웅 단조 실적 기반) ───
const BASE = {
  monthlyGasM3: 420000,        // 월 가스 사용량 (m³)
  lngHeatValue: 10.55,         // LNG 열량 (Mcal/m³)
  lngPricePerM3: 1200,         // LNG 단가 (원/m³)
  outputTon: 1174,             // 월 생산량 (t)
  chargeWeightTon: 1385,       // 월 투입중량 (t)
  reheatRatio: 1.18,           // 재가열 배수
  downtimeHours: 48,           // 월 비가동 시간 (h)
  operatingHoursPerDay: 20,    // 1일 가동 기준 시간 (h)
  targetGasUnit: 150,          // 태상 목표 원단위 (Mcal/t)
}

// ─── 슬라이더 정의 ───
const SLIDERS = [
  {
    key: 'reheatReduction',
    label: '재가열 배수 감소',
    unit: '%',
    min: 0, max: 20, step: 1, default: 0,
    description: '재가열 배수를 낮출수록(예: 1.18→1.05) 불필요한 가스 소비 감소',
    icon: RefreshCw,
    color: '#f59e0b',
  },
  {
    key: 'downtimeReduction',
    label: '비가동 시간 단축',
    unit: '%',
    min: 0, max: 50, step: 5, default: 0,
    description: '설비 트러블·소재 대기 감소로 실제 가동시간 증가 → 생산량 향상',
    icon: Factory,
    color: '#3b82f6',
  },
  {
    key: 'gasEffImprovement',
    label: '가열로 효율 개선',
    unit: '%',
    min: 0, max: 15, step: 1, default: 0,
    description: '연소 최적화·단열 보강 등으로 동일 생산 대비 가스 사용량 절감',
    icon: Flame,
    color: '#10b981',
  },
  {
    key: 'outputIncrease',
    label: '생산량 목표 증가',
    unit: '%',
    min: 0, max: 30, step: 5, default: 0,
    description: '수주 증가 시나리오 — 생산량 증가 대비 원단위 변화 및 매출 영향 확인',
    icon: TrendingUp,
    color: '#8b5cf6',
  },
]

interface SliderValues { [key: string]: number }

function calcResults(vals: SliderValues) {
  const reheatNew = BASE.reheatRatio * (1 - vals.reheatReduction / 100)
  const downtimeSaved = BASE.downtimeHours * (vals.downtimeReduction / 100)
  const outputFromDowntime = downtimeSaved * (BASE.outputTon / (BASE.operatingHoursPerDay * 30 - BASE.downtimeHours))
  const outputNew = BASE.outputTon * (1 + vals.outputIncrease / 100) + outputFromDowntime
  const chargeNew = outputNew * reheatNew
  // 가스 사용량: 투입중량 기준으로 비례 계산 후 효율 개선 반영
  const gasBaseNew = BASE.monthlyGasM3 * (chargeNew / BASE.chargeWeightTon)
  const gasNew = gasBaseNew * (1 - vals.gasEffImprovement / 100)
  const gasSaved = BASE.monthlyGasM3 - gasNew
  const costSaved = gasSaved * BASE.lngPricePerM3
  const gasUnitNew = (gasNew * BASE.lngHeatValue) / outputNew
  const gasUnitBase = (BASE.monthlyGasM3 * BASE.lngHeatValue) / BASE.outputTon
  const gasUnitDelta = gasUnitBase - gasUnitNew

  return {
    reheatNew: +reheatNew.toFixed(3),
    outputNew: +outputNew.toFixed(0),
    chargeNew: +chargeNew.toFixed(0),
    gasNew: +gasNew.toFixed(0),
    gasSaved: +gasSaved.toFixed(0),
    costSavedMonthly: +costSaved.toFixed(0),
    costSavedAnnual: +(costSaved * 12).toFixed(0),
    gasUnitNew: +gasUnitNew.toFixed(1),
    gasUnitDelta: +gasUnitDelta.toFixed(1),
    outputDelta: +(outputNew - BASE.outputTon).toFixed(0),
  }
}

function fmt(n: number) { return n.toLocaleString('ko-KR') }
function fmtW(n: number) {
  if (Math.abs(n) >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억원`
  if (Math.abs(n) >= 10_000) return `${(n / 10_000).toFixed(0)}만원`
  return `${fmt(n)}원`
}

export default function WhatIfPage() {
  const [vals, setVals] = useState<SliderValues>(() =>
    Object.fromEntries(SLIDERS.map(s => [s.key, s.default]))
  )

  const results = useMemo(() => calcResults(vals), [vals])
  const gasUnitBase = +(BASE.monthlyGasM3 * BASE.lngHeatValue / BASE.outputTon).toFixed(1)
  const anyChanged = SLIDERS.some(s => vals[s.key] !== s.default)

  const reset = () => setVals(Object.fromEntries(SLIDERS.map(s => [s.key, s.default])))

  return (
    <div className="animate-in">
      {/* 헤더 */}
      <div className="section-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="section-title">📊 What-If 시뮬레이터</h1>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            슬라이더를 조절하여 조건 변경 시 <strong style={{ color: 'var(--color-primary)' }}>가스비 절감액·생산량·원단위</strong>가 실시간 계산됩니다
          </div>
        </div>
        {anyChanged && (
          <button className="btn btn-outline" onClick={reset} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> 초기화
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>
        {/* ── 슬라이더 패널 ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {SLIDERS.map(s => {
            const Icon = s.icon
            const val = vals[s.key]
            return (
              <div key={s.key} className="kpi-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} color={s.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{s.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{s.description}</div>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: s.color, minWidth: 64, textAlign: 'right' }}>
                    {val}{s.unit}
                  </div>
                </div>
                <input
                  type="range"
                  min={s.min} max={s.max} step={s.step}
                  value={val}
                  onChange={e => setVals(v => ({ ...v, [s.key]: Number(e.target.value) }))}
                  style={{ width: '100%', accentColor: s.color, cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-text-dim)', marginTop: 4 }}>
                  <span>{s.min}{s.unit} (현재)</span>
                  <span>{s.max}{s.unit} (최대)</span>
                </div>
              </div>
            )
          })}

          {/* 기준값 참고 */}
          <div className="kpi-card" style={{ padding: '1.25rem', background: 'rgba(59,130,246,0.04)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: '0.75rem' }}>📌 계산 기준값 (2026년 실적)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              {[
                ['월 생산량', `${fmt(BASE.outputTon)} t`],
                ['월 투입중량', `${fmt(BASE.chargeWeightTon)} t`],
                ['재가열 배수', `${BASE.reheatRatio}배`],
                ['월 가스 사용', `${fmt(BASE.monthlyGasM3)} m³`],
                ['LNG 단가', `${fmt(BASE.lngPricePerM3)}원/m³`],
                ['기준 원단위', `${gasUnitBase} Mcal/t`],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span>{k}</span><strong style={{ color: 'var(--color-text)' }}>{v}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 결과 패널 (오른쪽 고정) ── */}
        <div style={{ position: 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* 핵심 지표 */}
          <div className="kpi-card" style={{ padding: '1.5rem', borderColor: anyChanged ? 'var(--color-primary)' : undefined }}>
            <div style={{ fontWeight: 800, marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              {anyChanged ? '✨ 시뮬레이션 결과' : '⟵ 슬라이더를 조절하세요'}
            </div>

            {[
              {
                label: '월 가스비 절감',
                base: '기준 대비',
                value: fmtW(results.costSavedMonthly),
                delta: results.gasSaved,
                deltaUnit: 'm³ 절감',
                positive: results.gasSaved > 0,
                color: results.gasSaved > 0 ? 'var(--color-success)' : 'var(--color-danger)',
              },
              {
                label: '연간 가스비 절감 (추정)',
                base: '월간 × 12개월',
                value: fmtW(results.costSavedAnnual),
                delta: null,
                positive: results.costSavedAnnual > 0,
                color: results.costSavedAnnual > 0 ? 'var(--color-success)' : 'var(--color-danger)',
              },
              {
                label: '가스 원단위',
                base: `기준 ${gasUnitBase} Mcal/t`,
                value: `${results.gasUnitNew} Mcal/t`,
                delta: results.gasUnitDelta,
                deltaUnit: 'Mcal/t 개선',
                positive: results.gasUnitDelta > 0,
                color: results.gasUnitDelta > 0 ? 'var(--color-success)' : 'var(--color-danger)',
              },
              {
                label: '월 생산량',
                base: `기준 ${fmt(BASE.outputTon)} t`,
                value: `${fmt(results.outputNew)} t`,
                delta: results.outputDelta,
                deltaUnit: 't 증가',
                positive: results.outputDelta >= 0,
                color: results.outputDelta >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
              },
              {
                label: '재가열 배수',
                base: `기준 ${BASE.reheatRatio}배`,
                value: `${results.reheatNew} 배`,
                delta: null,
                positive: results.reheatNew <= BASE.reheatRatio,
                color: results.reheatNew <= BASE.reheatRatio ? 'var(--color-success)' : 'var(--color-danger)',
              },
            ].map(item => (
              <div key={item.label} style={{ padding: '0.875rem 0', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>{item.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: 900, color: anyChanged ? item.color : 'var(--color-text)' }}>
                    {item.value}
                  </span>
                  {anyChanged && item.delta !== null && item.delta !== 0 && (
                    <span style={{ fontSize: '0.75rem', color: item.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                      {item.positive ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                      {item.delta > 0 ? '+' : ''}{item.delta} {item.deltaUnit}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>{item.base}</div>
              </div>
            ))}
          </div>

          {/* 태상 기준 달성 여부 */}
          <div
            className="kpi-card"
            style={{
              padding: '1rem 1.25rem',
              background: results.gasUnitNew <= BASE.targetGasUnit ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
              borderColor: results.gasUnitNew <= BASE.targetGasUnit ? 'var(--color-success)' : 'var(--color-accent)',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
              {results.gasUnitNew <= BASE.targetGasUnit ? '✅ 태상 목표 원단위 달성!' : '⚠️ 태상 목표 미달'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              목표 {BASE.targetGasUnit} Mcal/t 대비 현재 <strong>{results.gasUnitNew}</strong> Mcal/t
              {' '}({results.gasUnitNew <= BASE.targetGasUnit
                ? `${(BASE.targetGasUnit - results.gasUnitNew).toFixed(1)} 달성 여유`
                : `${(results.gasUnitNew - BASE.targetGasUnit).toFixed(1)} 초과`})
            </div>
          </div>

          {/* 요약 메시지 */}
          {anyChanged && (
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.8, padding: '0.75rem 1rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)' }}>
              💡 <strong>시나리오 해석:</strong>{' '}
              재가열 배수 {vals.reheatReduction}% 감소 + 비가동 {vals.downtimeReduction}% 단축 + 효율 {vals.gasEffImprovement}% 개선 시,
              월 <strong style={{ color: 'var(--color-success)' }}>{fmtW(results.costSavedMonthly)}</strong> 절감,
              연간 <strong style={{ color: 'var(--color-success)' }}>{fmtW(results.costSavedAnnual)}</strong> 절감이 기대됩니다.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
