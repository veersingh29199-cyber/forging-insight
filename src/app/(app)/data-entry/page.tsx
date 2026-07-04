'use client'

import { useState } from 'react'
import { Plus, Trash2, Save, Edit2, Check, X, FileSpreadsheet, AlertCircle, Sparkles } from 'lucide-react'
import { ChecklistWidget } from '@/components/ChecklistWidget'
import { saveManualEntry } from '@/app/actions/data-actions'

// ─────────────────────────────────────────
// 초기 표준작업수 마스터 데이터 (Section 5, 6-1)
// ─────────────────────────────────────────

interface WorkStandard {
  id: number
  dept: string
  product: string
  material: string
  basis: 'charge' | 'product'
  min_ton?: number
  max_ton?: number
  order_size?: string
  std_work_count: number
  note?: string
}

const INITIAL_WORK_STANDARDS: WorkStandard[] = [
  { id: 1, dept: 'P15 (1단조)', product: '금형강 대형', material: 'SKD61', basis: 'charge', min_ton: 10, max_ton: 30, std_work_count: 3, note: '투입중량 기준 기본 히트' },
  { id: 2, dept: 'P5 (2단조)', product: '크랭크축', material: 'SCM440', basis: 'charge', min_ton: 5, max_ton: 15, std_work_count: 4, note: '연속 단조 공정' },
  { id: 3, dept: 'P8 (3단조)', product: '쉘 (Shell)', material: 'SF440', basis: 'charge', min_ton: 15, max_ton: 50, std_work_count: 3, note: '대형 쉘 전용' },
  { id: 4, dept: 'R9 (4단조)', product: '로터 샤프트', material: '34CrMo4', basis: 'charge', min_ton: 20, max_ton: 60, std_work_count: 2, note: '고경도 정밀 공정' },
  { id: 5, dept: 'R/M (링밀)', product: '프랑지/링', material: 'SUS304', basis: 'product', order_size: 'OD > 3000mm', std_work_count: 5, note: '수주치수 기준 세팅' },
  { id: 6, dept: 'R/M (자유단조)', product: '샤프트', material: 'S45C', basis: 'product', order_size: 'OD <= 3000mm', std_work_count: 3, note: '소형 자유단조' },
]

// ─────────────────────────────────────────
// 초기 부서별 목표 데이터 (Section 5)
// ─────────────────────────────────────────

interface TargetData {
  id: number
  dept: string
  year: number
  target_ton: number
  target_gas_mcal: number
  target_defect_rate: number
}

const INITIAL_TARGETS: TargetData[] = [
  { id: 1, dept: 'P15 (1단조반)', year: 2026, target_ton: 3720, target_gas_mcal: 145, target_defect_rate: 1.5 },
  { id: 2, dept: 'P5 (2단조반)', year: 2026, target_ton: 3840, target_gas_mcal: 140, target_defect_rate: 1.2 },
  { id: 3, dept: 'P8 (3단조반)', year: 2026, target_ton: 3360, target_gas_mcal: 150, target_defect_rate: 1.8 },
  { id: 4, dept: 'R9 (4단조반)', year: 2026, target_ton: 1800, target_gas_mcal: 155, target_defect_rate: 1.0 },
  { id: 5, dept: 'R/M (링밀/자유)', year: 2026, target_ton: 2160, target_gas_mcal: 160, target_defect_rate: 2.0 },
]

export default function DataEntryPage() {
  const [activeTab, setActiveTab] = useState<'standards' | 'targets' | 'manual'>('standards')
  const [standards, setStandards] = useState<WorkStandard[]>(INITIAL_WORK_STANDARDS)
  const [targets, setTargets] = useState<TargetData[]>(INITIAL_TARGETS)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // 신규 작업표준 추가 폼 상태
  const [newStd, setNewStd] = useState<Partial<WorkStandard>>({
    dept: 'P15 (1단조)',
    product: '',
    material: '',
    basis: 'charge',
    std_work_count: 3,
    note: '',
  })

  // 수기 실적 입력 폼
  const [manualRecord, setManualRecord] = useState({
    date: '2026-06-30',
    dept: 'P15 (1단조반)',
    orderWeight: 25.5,
    chargeWeight: 30.2,
    workHours: 1.5,
    workCount: 3,
    gasUsedM3: 4200,
    hwangjiWeight: 1.2,
  })

  const handleAddStandard = () => {
    if (!newStd.product) {
      alert('제품명/공정명을 입력해주세요.')
      return
    }
    const nextId = Math.max(0, ...standards.map((s) => s.id)) + 1
    setStandards([...standards, { id: nextId, ...newStd } as WorkStandard])
    setNewStd({ dept: 'P15 (1단조)', product: '', material: '', basis: 'charge', std_work_count: 3, note: '' })
    triggerSaveMessage()
  }

  const handleDeleteStandard = (id: number) => {
    if (confirm('해당 표준작업수 마스터를 삭제하시겠습니까?')) {
      setStandards(standards.filter((s) => s.id !== id))
      triggerSaveMessage()
    }
  }

  const triggerSaveMessage = () => {
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await saveManualEntry({
      workDate: manualRecord.date,
      dept: manualRecord.dept,
      shift: 'A',
      orderNo: `ORD-MANUAL-${Date.now()}`,
      product: '일반단조품',
      material: 'SCM440',
      orderWeightTon: manualRecord.orderWeight,
      chargeWeightTon: manualRecord.chargeWeight,
      hwangjiWeightTon: manualRecord.hwangjiWeight,
      furnace: manualRecord.dept.includes('1호기') ? '1호기' : '9호기',
      workHours: manualRecord.workHours,
      workCount: manualRecord.workCount,
      gasUsedM3: manualRecord.gasUsedM3,
    })

    if (res.success) {
      triggerSaveMessage()
    } else {
      alert(`실적 등록 실패: ${res.error || '알 수 없는 오류'}`)
    }
  }

  return (
    <div className="animate-in">
      <div className="section-header">
        <div>
          <h1 className="section-title">직접 입력 / 마스터 편집</h1>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            엑셀 업로드 없이 표준작업수(히트), 연간 목표, 일별 현장 실적 및 가스 검침량을 직접 관리합니다.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {saveSuccess && (
            <span style={{ color: 'var(--color-success)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Check size={16} /> 변경사항이 저장되었습니다
            </span>
          )}
          <button className="btn btn-primary" onClick={triggerSaveMessage}>
            <Save size={16} /> 전체 데이터 변경 저장
          </button>
        </div>
      </div>

      {/* 체크리스트 위젯 */}
      <ChecklistWidget />

      {/* 탭 내비게이션 */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '2px solid var(--color-border)',
          marginBottom: '2rem',
        }}
      >
        <button
          onClick={() => setActiveTab('standards')}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'standards' ? 'var(--color-surface-2)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'standards' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'standards' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            marginBottom: '-2px',
          }}
        >
          ⚙️ 표준작업수(히트) 마스터
        </button>
        <button
          onClick={() => setActiveTab('targets')}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'targets' ? 'var(--color-surface-2)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'targets' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'targets' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            marginBottom: '-2px',
          }}
        >
          🎯 부서별 연간 목표 관리
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'manual' ? 'var(--color-surface-2)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'manual' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'manual' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            marginBottom: '-2px',
          }}
        >
          ✍️ 현장 실적 수기 등록
        </button>
      </div>

      {/* 탭 1: 표준작업수(히트) 마스터 */}
      {activeTab === 'standards' && (
        <div className="animate-in">
          <div className="kpi-card" style={{ marginBottom: '2rem', padding: '1.75rem' }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--color-text)' }}>
              📋 표 A & 표 B 표준작업수 마스터 테이블
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              💡 <strong>표 A (P15/P5/P8/R9):</strong> 투입중량(`charge`) 구간별 표준 히트 수 | <strong>표 B (R/M):</strong> 제품중량(`product`) 및 수주치수(`order_size`) 기준
            </div>

            <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>부서 / 공정</th>
                    <th>제품명 / 강종군</th>
                    <th>원소재 / 재질</th>
                    <th>기준(Basis)</th>
                    <th style={{ textAlign: 'right' }}>최소~최대 톤 (또는 수주치수)</th>
                    <th style={{ textAlign: 'right' }}>표준작업수(히트)</th>
                    <th>비고</th>
                    <th style={{ textAlign: 'center' }}>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {standards.map((std) => (
                    <tr key={std.id}>
                      <td style={{ fontWeight: 700 }}>{std.dept}</td>
                      <td style={{ fontWeight: 600 }}>{std.product}</td>
                      <td>
                        <span className="badge badge-neutral">{std.material || '공통'}</span>
                      </td>
                      <td>
                        <span className={`badge ${std.basis === 'charge' ? 'badge-info' : 'badge-warning'}`}>
                          {std.basis === 'charge' ? '투입중량(Charge)' : '제품중량(Product)'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>
                        {std.basis === 'charge'
                          ? `${std.min_ton ?? 0}t ~ ${std.max_ton ?? '∞'}t`
                          : std.order_size || '치수 기준 없음'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-primary)', fontSize: '1.05rem' }}>
                        {std.std_work_count} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>히트</span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{std.note || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteStandard(std.id)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '0.25rem' }}
                          title="삭제"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 신규 등록 폼 */}
            <div style={{ background: 'var(--color-surface-2)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--color-border)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
                ➕ 신규 표준작업수(히트) 마스터 추가
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>부서/공정</label>
                  <select
                    value={newStd.dept}
                    onChange={(e) => setNewStd({ ...newStd, dept: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text)' }}
                  >
                    <option>P15 (1단조)</option>
                    <option>P5 (2단조)</option>
                    <option>P8 (3단조)</option>
                    <option>R9 (4단조)</option>
                    <option>R/M (링밀/자유)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>제품명/강종군</label>
                  <input
                    type="text"
                    placeholder="예: 금형강 대형"
                    value={newStd.product}
                    onChange={(e) => setNewStd({ ...newStd, product: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>재질/강종</label>
                  <input
                    type="text"
                    placeholder="예: SKD61, SCM440"
                    value={newStd.material}
                    onChange={(e) => setNewStd({ ...newStd, material: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>기준(Basis)</label>
                  <select
                    value={newStd.basis}
                    onChange={(e) => setNewStd({ ...newStd, basis: e.target.value as 'charge' | 'product' })}
                    style={{ width: '100%', padding: '0.5rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text)' }}
                  >
                    <option value="charge">투입중량 (Charge)</option>
                    <option value="product">제품중량 (Product)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>표준히트(회)</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={newStd.std_work_count}
                    onChange={(e) => setNewStd({ ...newStd, std_work_count: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.5rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text)' }}
                  />
                </div>
                <div>
                  <button type="button" className="btn btn-primary" onClick={handleAddStandard} style={{ width: '100%', justifyContent: 'center' }}>
                    <Plus size={16} /> 추가
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 탭 2: 부서별 연간 목표 관리 */}
      {activeTab === 'targets' && (
        <div className="animate-in">
          <div className="kpi-card" style={{ padding: '1.75rem' }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--color-text)' }}>
              🎯 부서별 2026년 연간 목표 중량 및 가스 원단위 설정
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              💡 수정된 연간 목표는 대시보드 및 달성률 KPI 카드 계산에 즉시 반영되며, 월별로 1/12씩 균등 배분됩니다.
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>부서 / 공정</th>
                  <th>연도</th>
                  <th style={{ textAlign: 'right' }}>연간 목표 생산량(t)</th>
                  <th style={{ textAlign: 'right' }}>월 평균 목표(t/월)</th>
                  <th style={{ textAlign: 'right' }}>목표 가스 원단위(Mcal/t)</th>
                  <th style={{ textAlign: 'right' }}>목표 불량률(%)</th>
                </tr>
              </thead>
              <tbody>
                {targets.map((tgt, index) => (
                  <tr key={tgt.id}>
                    <td style={{ fontWeight: 700 }}>{tgt.dept}</td>
                    <td><span className="badge badge-info">{tgt.year}년</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <input
                        type="number"
                        value={tgt.target_ton}
                        onChange={(e) => {
                          const val = Number(e.target.value)
                          const copy = [...targets]
                          copy[index].target_ton = val
                          setTargets(copy)
                        }}
                        style={{ width: '100px', textAlign: 'right', padding: '0.4rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text)', fontWeight: 700 }}
                      />
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      {(tgt.target_ton / 12).toFixed(0)}t
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <input
                        type="number"
                        value={tgt.target_gas_mcal}
                        onChange={(e) => {
                          const val = Number(e.target.value)
                          const copy = [...targets]
                          copy[index].target_gas_mcal = val
                          setTargets(copy)
                        }}
                        style={{ width: '90px', textAlign: 'right', padding: '0.4rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-primary)', fontWeight: 700 }}
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <input
                        type="number"
                        step="0.1"
                        value={tgt.target_defect_rate}
                        onChange={(e) => {
                          const val = Number(e.target.value)
                          const copy = [...targets]
                          copy[index].target_defect_rate = val
                          setTargets(copy)
                        }}
                        style={{ width: '70px', textAlign: 'right', padding: '0.4rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-danger)', fontWeight: 700 }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={triggerSaveMessage}>
                <Save size={16} /> 목표 설정 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 탭 3: 현장 실적 수기 등록 */}
      {activeTab === 'manual' && (
        <div className="animate-in">
          <div className="kpi-card" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} color="var(--color-primary)" /> 현장 일일/배치 실적 수기 등록
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.75rem', lineHeight: 1.5 }}>
              엑셀 업로드가 어려운 현장 상황이나 긴급 보정 건을 직접 입력합니다. 수주중량, 투입중량, 작업시간 및 가스 검침량을 입력하면 <strong>계산 공식 엔진에 자동 연계</strong>되어 원단위가 즉시 산출됩니다.
            </div>

            <form onSubmit={handleManualSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)', display: 'block', marginBottom: '0.4rem' }}>작업 일자</label>
                <input
                  type="date"
                  value={manualRecord.date}
                  onChange={(e) => setManualRecord({ ...manualRecord, date: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text)' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)', display: 'block', marginBottom: '0.4rem' }}>작업 부서 / 로 호기</label>
                <select
                  value={manualRecord.dept}
                  onChange={(e) => setManualRecord({ ...manualRecord, dept: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text)' }}
                >
                  <option>P15 (1단조반) · 1호기/2호기</option>
                  <option>P5 (2단조반) · 9호기/10호기</option>
                  <option>P8 (3단조반) · 5호기/6호기</option>
                  <option>R9 (4단조반) · 15호기/16호기</option>
                  <option>R/M (링밀/자유) · 19호기/20호기</option>
                  <option>열처리 13호기</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)', display: 'block', marginBottom: '0.4rem' }}>
                  완제품 수주중량 (t) <span style={{ color: 'var(--color-primary)' }}>*보고용 기준</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={manualRecord.orderWeight}
                  onChange={(e) => setManualRecord({ ...manualRecord, orderWeight: Number(e.target.value) })}
                  style={{ width: '100%', minHeight: '44px', padding: '0.65rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text)', fontWeight: 700 }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)', display: 'block', marginBottom: '0.4rem' }}>
                  가열로 투입중량 (t) <span style={{ color: 'var(--color-info)' }}>*실제용 기준</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={manualRecord.chargeWeight}
                  onChange={(e) => setManualRecord({ ...manualRecord, chargeWeight: Number(e.target.value) })}
                  style={{ width: '100%', minHeight: '44px', padding: '0.65rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text)', fontWeight: 700 }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)', display: 'block', marginBottom: '0.4rem' }}>
                  황지(공정품) 중량 (t) <span style={{ color: 'var(--color-text-muted)' }}>*분석용 반영</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={manualRecord.hwangjiWeight}
                  onChange={(e) => setManualRecord({ ...manualRecord, hwangjiWeight: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)', display: 'block', marginBottom: '0.4rem' }}>
                  실제 가스 검침 사용량 (m³) <span style={{ color: 'var(--color-success)' }}>*10.55 Mcal/m³ 적용</span>
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={manualRecord.gasUsedM3}
                  onChange={(e) => setManualRecord({ ...manualRecord, gasUsedM3: Number(e.target.value) })}
                  style={{ width: '100%', minHeight: '44px', padding: '0.65rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-success)', fontWeight: 700 }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)', display: 'block', marginBottom: '0.4rem' }}>단조 가동 시간 (h)</label>
                <input
                  type="number"
                  step="0.1"
                  value={manualRecord.workHours}
                  onChange={(e) => setManualRecord({ ...manualRecord, workHours: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text)' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)', display: 'block', marginBottom: '0.4rem' }}>작업 횟수 (히트 hit)</label>
                <input
                  type="number"
                  value={manualRecord.workCount}
                  onChange={(e) => setManualRecord({ ...manualRecord, workCount: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text)' }}
                  required
                />
              </div>

              <div style={{ gridColumn: 'span 2', marginTop: '1rem', padding: '1rem', background: 'var(--color-surface-2)', borderRadius: '8px', borderLeft: '4px solid var(--color-info)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem' }}>💡 <strong>실시간 계산 예상 결과 (가스 원단위 3단계)</strong></div>
                <div style={{ display: 'flex', gap: '2rem', fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>
                  <span>① 보고용: <strong style={{ color: 'var(--color-success)' }}>{((manualRecord.gasUsedM3 * 10.55) / manualRecord.orderWeight).toFixed(1)}</strong> Mcal/t</span>
                  <span>② 분석용: <strong style={{ color: 'var(--color-primary)' }}>{((manualRecord.gasUsedM3 * 10.55) / (manualRecord.orderWeight + manualRecord.hwangjiWeight)).toFixed(1)}</strong> Mcal/t</span>
                  <span>③ 실제용: <strong style={{ color: 'var(--color-info)' }}>{((manualRecord.gasUsedM3 * 10.55) / manualRecord.chargeWeight).toFixed(1)}</strong> Mcal/t</span>
                </div>
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => alert('입력이 초기화되었습니다.')}>
                  초기화
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '0.95rem' }}>
                  <Save size={18} /> 실적 등록 및 분석 DB 반영
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
