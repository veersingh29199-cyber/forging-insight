'use client'

import { useState } from 'react'
import { Save, Check, Plus, Trash2, Settings as SettingsIcon, Factory, Flame, Clock, Database, Award, Lock, Unlock, ShieldAlert } from 'lucide-react'
import { ChecklistWidget } from '@/components/ChecklistWidget'

// ─────────────────────────────────────────
// 1. 호기 -> 부서 매핑 및 로방식 (배치로 vs 대차로) 초기 데이터
// ─────────────────────────────────────────

interface EquipmentMapping {
  id: number
  furnace_name: string
  dept: string
  is_batch: boolean
  capacity_ton: number
  note?: string
}

const INITIAL_EQUIPMENT: EquipmentMapping[] = [
  { id: 1, furnace_name: '1호기', dept: 'P15 (1단조반)', is_batch: true, capacity_ton: 40, note: '배치로 · 대형 단조 전용' },
  { id: 2, furnace_name: '2호기', dept: 'P15 (1단조반)', is_batch: false, capacity_ton: 50, note: '대차로 · 정밀 가열' },
  { id: 3, furnace_name: '3호기', dept: 'P5 (2단조반)', is_batch: false, capacity_ton: 35, note: '대차로' },
  { id: 4, furnace_name: '4호기', dept: 'P5 (2단조반)', is_batch: false, capacity_ton: 35, note: '대차로' },
  { id: 5, furnace_name: '5호기', dept: 'P8 (3단조반)', is_batch: false, capacity_ton: 45, note: '대차로' },
  { id: 6, furnace_name: '6호기', dept: 'P8 (3단조반)', is_batch: false, capacity_ton: 45, note: '대차로' },
  { id: 7, furnace_name: '7호기', dept: 'R9 (4단조반)', is_batch: false, capacity_ton: 30, note: '대차로' },
  { id: 8, furnace_name: '8호기', dept: 'R9 (4단조반)', is_batch: false, capacity_ton: 30, note: '대차로' },
  { id: 9, furnace_name: '9호기', dept: 'P5 (2단조반)', is_batch: true, capacity_ton: 25, note: '배치로 · 연속단조' },
  { id: 10, furnace_name: '10호기', dept: 'P5 (2단조반)', is_batch: true, capacity_ton: 25, note: '배치로 · 연속단조' },
  { id: 11, furnace_name: '11호기', dept: 'P15 (1단조반)', is_batch: true, capacity_ton: 30, note: '배치로' },
  { id: 12, furnace_name: '12호기', dept: 'P15 (1단조반)', is_batch: true, capacity_ton: 30, note: '배치로' },
  { id: 13, furnace_name: '13호기', dept: '열처리 13호기', is_batch: false, capacity_ton: 60, note: '대차로 · 열처리 전용' },
  { id: 14, furnace_name: '14호기', dept: 'P8 (3단조반)', is_batch: true, capacity_ton: 20, note: '배치로' },
  { id: 15, furnace_name: '15호기', dept: 'R9 (4단조반)', is_batch: true, capacity_ton: 20, note: '배치로' },
  { id: 16, furnace_name: '16호기', dept: 'R9 (4단조반)', is_batch: true, capacity_ton: 20, note: '배치로' },
  { id: 17, furnace_name: '17호기', dept: 'R/M (링밀/자유)', is_batch: false, capacity_ton: 50, note: '대차로 · 대형 링밀' },
  { id: 18, furnace_name: '18호기', dept: 'R/M (링밀/자유)', is_batch: false, capacity_ton: 50, note: '대차로' },
  { id: 19, furnace_name: '19호기', dept: 'R/M (링밀/자유)', is_batch: false, capacity_ton: 40, note: '대차로' },
  { id: 20, furnace_name: '20호기', dept: 'R/M (링밀/자유)', is_batch: false, capacity_ton: 40, note: '대차로' },
]

// ─────────────────────────────────────────
// 2. 원소재 규격 (몰드표) 초기 데이터
// ─────────────────────────────────────────

interface RawMaterialSpec {
  id: number
  product: string
  material: string
  raw_material: string
  spec: string
  note?: string
}

const INITIAL_RAW_SPECS: RawMaterialSpec[] = [
  { id: 1, product: '금형강 대형', material: 'SKD61', raw_material: '특수 합금 잉고트', spec: 'Φ800 × 2400L', note: '수입 원소재' },
  { id: 2, product: '크랭크축', material: 'SCM440', raw_material: '단조용 빌렛', spec: '250 × 250 × 6000L', note: '포스코 정품' },
  { id: 3, product: '쉘 (Shell)', material: 'SF440', raw_material: '대형 잉고트', spec: 'Φ1200 × 3000L', note: '초대형 단조' },
  { id: 4, product: '로터 샤프트', material: '34CrMo4', raw_material: '정밀 ESR 잉고트', spec: 'Φ650 × 4500L', note: '발전소용 고경도' },
  { id: 5, product: '프랑지/링', material: 'SUS304', raw_material: '스테인리스 빌렛', spec: 'Φ400 × 2000L', note: '내식성 특화' },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'equip' | 'shift' | 'raw_specs' | 'benchmarks'>('equip')
  const [equipments, setEquipments] = useState<EquipmentMapping[]>(INITIAL_EQUIPMENT)
  const [rawSpecs, setRawSpecs] = useState<RawMaterialSpec[]>(INITIAL_RAW_SPECS)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false)

  // 가동시간 및 교대 기준값
  const [shiftConfig, setShiftConfig] = useState({
    dailyStdHours: 20.0,
    shiftType: '3교대 (8시간 x 3조)',
    plannedMaintenanceHours: 2.0,
    lunchBreakMinutes: 60,
  })

  // 벤치마크 및 가스 목표 기준값
  const [benchmarks, setBenchmarks] = useState({
    die_steel: 25.0,
    crankshaft: 26.0,
    shell: 10.0,
    rotor: 7.0,
    gas_report_target: 150.0,
    gas_analysis_target: 145.0,
    reheat_ratio_target: 1.15,
  })

  // 신규 원소재 규격 입력 폼
  const [newSpec, setNewSpec] = useState<Partial<RawMaterialSpec>>({
    product: '',
    material: '',
    raw_material: '',
    spec: '',
    note: '',
  })

  const triggerSaveMessage = () => {
    if (!isAdminUnlocked) {
      alert('🔒 관리자 모드가 잠금되어 있어 설정을 저장할 수 없습니다.\n상단의 [⚙️ 관리자 모드 잠금 해제] 버튼을 눌러주세요.')
      return
    }
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const handleToggleBatch = (id: number) => {
    if (!isAdminUnlocked) {
      alert('🔒 관리자 권한이 필요합니다. 상단의 [관리자 모드 잠금 해제]를 활성화해주세요.')
      return
    }
    setEquipments(equipments.map((e) => (e.id === id ? { ...e, is_batch: !e.is_batch } : e)))
    triggerSaveMessage()
  }

  const handleDeptChange = (id: number, newDept: string) => {
    if (!isAdminUnlocked) return
    setEquipments(equipments.map((e) => (e.id === id ? { ...e, dept: newDept } : e)))
    triggerSaveMessage()
  }

  const handleAddSpec = () => {
    if (!isAdminUnlocked) {
      alert('🔒 관리자 권한이 필요합니다. 상단의 [관리자 모드 잠금 해제]를 활성화해주세요.')
      return
    }
    if (!newSpec.product || !newSpec.raw_material) {
      alert('제품명과 원소재명을 입력해주세요.')
      return
    }
    const nextId = Math.max(0, ...rawSpecs.map((s) => s.id)) + 1
    setRawSpecs([...rawSpecs, { id: nextId, ...newSpec } as RawMaterialSpec])
    setNewSpec({ product: '', material: '', raw_material: '', spec: '', note: '' })
    triggerSaveMessage()
  }

  const handleDeleteSpec = (id: number) => {
    if (!isAdminUnlocked) {
      alert('🔒 관리자 권한이 필요합니다. 상단의 [관리자 모드 잠금 해제]를 활성화해주세요.')
      return
    }
    if (confirm('해당 원소재 규격 마스터를 삭제하시겠습니까?')) {
      setRawSpecs(rawSpecs.filter((s) => s.id !== id))
      triggerSaveMessage()
    }
  }

  return (
    <div className="animate-in">
      <div className="section-header">
        <div>
          <h1 className="section-title">시스템 및 공정 기준 설정</h1>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            호기별 부서 매핑, 배치로/대차로 구분, 가동시간 기준, 원소재 규격 및 두산 벤치마크 기준값을 관리합니다.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {saveSuccess && (
            <span style={{ color: 'var(--color-success)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Check size={16} /> 설정이 저장되었습니다
            </span>
          )}
          <button className="btn btn-primary" onClick={triggerSaveMessage}>
            <Save size={16} /> 설정 전체 저장
          </button>
        </div>
      </div>

      {/* 관리자 전용 권한 잠금 배너 */}
      <div
        style={{
          background: isAdminUnlocked ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.1)',
          border: `1px solid ${isAdminUnlocked ? 'var(--color-success)' : 'var(--color-accent)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          {isAdminUnlocked ? <Unlock size={24} color="var(--color-success)" /> : <Lock size={24} color="var(--color-accent)" />}
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text)' }}>
              {isAdminUnlocked ? '⚙️ 관리자 수정 모드 활성화 중' : '🔒 관리자 전용 공정·설비 기준 설정 (읽기 전용)'}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
              {isAdminUnlocked
                ? '호기 매핑, 벤치마크, 교대 근무 기준을 자유롭게 수정 및 저장할 수 있습니다. 작업 완료 후 잠금을 권장합니다.'
                : '공정 및 설비 기준 변경은 공장 KPI 지표 및 원단위 산출식에 직접 영향을 미치므로 일반 현장 담당자는 조회만 가능합니다.'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsAdminUnlocked(!isAdminUnlocked)}
          className={`btn ${isAdminUnlocked ? 'btn-outline' : 'btn-primary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, whiteSpace: 'nowrap' }}
        >
          {isAdminUnlocked ? <Lock size={16} /> : <Unlock size={16} />}
          {isAdminUnlocked ? '관리자 모드 잠금 (읽기 전용)' : '⚙️ 관리자 모드 잠금 해제'}
        </button>
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
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => setActiveTab('equip')}
          style={{
            padding: '0.75rem 1.25rem',
            background: activeTab === 'equip' ? 'var(--color-surface-2)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'equip' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'equip' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Factory size={16} /> 호기 매핑 & 로방식 (배치/대차)
        </button>
        <button
          onClick={() => setActiveTab('benchmarks')}
          style={{
            padding: '0.75rem 1.25rem',
            background: activeTab === 'benchmarks' ? 'var(--color-surface-2)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'benchmarks' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'benchmarks' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Award size={16} /> 두산 벤치마크 & 가스 원단위 기준
        </button>
        <button
          onClick={() => setActiveTab('shift')}
          style={{
            padding: '0.75rem 1.25rem',
            background: activeTab === 'shift' ? 'var(--color-surface-2)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'shift' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'shift' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Clock size={16} /> 가동시간 / 교대 근무 기준
        </button>
        <button
          onClick={() => setActiveTab('raw_specs')}
          style={{
            padding: '0.75rem 1.25rem',
            background: activeTab === 'raw_specs' ? 'var(--color-surface-2)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'raw_specs' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'raw_specs' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Database size={16} /> 원소재 규격 (몰드표) 마스터
        </button>
      </div>

      {/* 탭 1: 호기 매핑 & 로방식 */}
      {activeTab === 'equip' && (
        <div className="animate-in" style={{ opacity: !isAdminUnlocked ? 0.75 : 1, pointerEvents: !isAdminUnlocked ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
          <div className="kpi-card" style={{ padding: '1.75rem' }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--color-text)' }}>
              🔥 1호기 ~ 20호기 부서 매핑 및 로방식(배치로 vs 대차로) 설정
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              💡 <strong>배치로 (1·9·10·11·12·14·15·16호기):</strong> 연속 단조에 유리하여 평균 8~10% 가스 효율 우수 | 매핑 변경 시 가스 원단위 계산 엔진에 자동 연동됩니다.
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>호기 명칭</th>
                    <th>소속 부서 / 공정</th>
                    <th>로방식 구분</th>
                    <th style={{ textAlign: 'right' }}>로 용량(t)</th>
                    <th>비고 및 용도</th>
                    <th style={{ textAlign: 'center' }}>로방식 토글</th>
                  </tr>
                </thead>
                <tbody>
                  {equipments.map((eq) => (
                    <tr key={eq.id}>
                      <td style={{ fontWeight: 800, color: 'var(--color-text)' }}>{eq.furnace_name}</td>
                      <td>
                        <select
                          value={eq.dept}
                          onChange={(e) => handleDeptChange(eq.id, e.target.value)}
                          style={{ padding: '0.35rem 0.6rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text)', fontWeight: 600 }}
                        >
                          <option>P15 (1단조반)</option>
                          <option>P5 (2단조반)</option>
                          <option>P8 (3단조반)</option>
                          <option>R9 (4단조반)</option>
                          <option>R/M (링밀/자유)</option>
                          <option>열처리 13호기</option>
                        </select>
                      </td>
                      <td>
                        <span className={`badge ${eq.is_batch ? 'badge-info' : 'badge-neutral'}`}>
                          {eq.is_batch ? '⚡ 배치로 (Batch)' : '🚗 대차로 (Car-bottom)'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{eq.capacity_ton}t</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{eq.note || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className={`btn ${eq.is_batch ? 'btn-outline' : 'btn-primary'}`}
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                          onClick={() => handleToggleBatch(eq.id)}
                        >
                          {eq.is_batch ? '대차로 변경' : '배치로 변경'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 탭 2: 두산 벤치마크 & 가스 원단위 기준 */}
      {activeTab === 'benchmarks' && (
        <div className="animate-in grid-2" style={{ opacity: !isAdminUnlocked ? 0.75 : 1, pointerEvents: !isAdminUnlocked ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
          {/* 두산 벤치마크 설정 */}
          <div className="kpi-card" style={{ padding: '1.75rem' }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={20} color="var(--color-primary)" /> 두산중공업 벤치마크 시간당 생산성 (t/h)
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              사장님 지시 분석 보고서에 사용되는 동종 업계 최고 수준(두산 기준) 생산성 지표입니다. 수정 시 생산량 심층 분석의 <strong>&apos;두산 벤치마크 비교&apos;</strong> 열 및 갭(t/h) 산출에 즉시 반영됩니다.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)', display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span>금형강 대형 단조품 (Die Steel)</span>
                  <span style={{ color: 'var(--color-primary)' }}>기본: 25.0 t/h</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={benchmarks.die_steel}
                  onChange={(e) => setBenchmarks({ ...benchmarks, die_steel: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text)', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)', display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span>크랭크축 / 선박 엔진축 (Crankshaft)</span>
                  <span style={{ color: 'var(--color-primary)' }}>기본: 26.0 t/h</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={benchmarks.crankshaft}
                  onChange={(e) => setBenchmarks({ ...benchmarks, crankshaft: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text)', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)', display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span>대형 쉘 / 플랜지 단조품 (Shell)</span>
                  <span style={{ color: 'var(--color-primary)' }}>기본: 10.0 t/h</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={benchmarks.shell}
                  onChange={(e) => setBenchmarks({ ...benchmarks, shell: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text)', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)', display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span>터빈 로터 샤프트 (Rotor Shaft)</span>
                  <span style={{ color: 'var(--color-primary)' }}>기본: 7.0 t/h</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={benchmarks.rotor}
                  onChange={(e) => setBenchmarks({ ...benchmarks, rotor: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text)', fontWeight: 700 }}
                />
              </div>
            </div>
          </div>

          {/* 태상 가스 기준 설정 */}
          <div className="kpi-card" style={{ padding: '1.75rem' }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Flame size={20} color="var(--color-success)" /> 태상 가스 원단위 및 재가열 기준값
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              가스 원단위 3단계(보고용/분석용/실제용) 계산 및 정상/주의 판정에 적용되는 회사 표준 기준값입니다. LNG 열량 환산계수(10.55 Mcal/m³)와 함께 연동됩니다.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)', display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span>① 보고용 가스 원단위 목표 (Mcal/ton)</span>
                  <span style={{ color: 'var(--color-success)' }}>기본: 150.0 Mcal/t</span>
                </label>
                <input
                  type="number"
                  step="1"
                  value={benchmarks.gas_report_target}
                  onChange={(e) => setBenchmarks({ ...benchmarks, gas_report_target: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-success)', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)', display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span>② 분석용 가스 원단위 목표 (Mcal/ton)</span>
                  <span style={{ color: 'var(--color-primary)' }}>기본: 145.0 Mcal/t</span>
                </label>
                <input
                  type="number"
                  step="1"
                  value={benchmarks.gas_analysis_target}
                  onChange={(e) => setBenchmarks({ ...benchmarks, gas_analysis_target: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-primary)', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)', display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span>표준 재가열 배수 (투입 ÷ 수주 중량비)</span>
                  <span style={{ color: 'var(--color-accent)' }}>기본: 1.15 배</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={benchmarks.reheat_ratio_target}
                  onChange={(e) => setBenchmarks({ ...benchmarks, reheat_ratio_target: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-accent)', fontWeight: 700 }}
                />
              </div>

              <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--color-surface-2)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                💡 <strong>LNG 발열량 기준:</strong> 한국가스공사 도시가스 표준 열량 <strong>10.55 Mcal/m³</strong>가 전 공정에 동일하게 적용됩니다.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 탭 3: 가동시간 / 교대 근무 기준 */}
      {activeTab === 'shift' && (
        <div className="animate-in" style={{ opacity: !isAdminUnlocked ? 0.75 : 1, pointerEvents: !isAdminUnlocked ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
          <div className="kpi-card" style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={20} color="var(--color-primary)" /> 일일 표준 가동시간 및 교대제 설정
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.75rem', lineHeight: 1.5 }}>
              시간당 생산성(t/h) 산출 및 비가동 기회손실 계산의 기준이 되는 가동 조건입니다.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)', display: 'block', marginBottom: '0.4rem' }}>일일 표준 가동 시간 (h)</label>
                <input
                  type="number"
                  step="0.5"
                  value={shiftConfig.dailyStdHours}
                  onChange={(e) => setShiftConfig({ ...shiftConfig, dailyStdHours: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text)', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)', display: 'block', marginBottom: '0.4rem' }}>운영 교대제 구분</label>
                <select
                  value={shiftConfig.shiftType}
                  onChange={(e) => setShiftConfig({ ...shiftConfig, shiftType: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text)', fontWeight: 600 }}
                >
                  <option>3교대 (8시간 x 3조)</option>
                  <option>2교대 (12시간 x 2조)</option>
                  <option>주간 전담 (10시간)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)', display: 'block', marginBottom: '0.4rem' }}>계획 예방정비 시간 (h/일)</label>
                <input
                  type="number"
                  step="0.5"
                  value={shiftConfig.plannedMaintenanceHours}
                  onChange={(e) => setShiftConfig({ ...shiftConfig, plannedMaintenanceHours: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text)', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)', display: 'block', marginBottom: '0.4rem' }}>식사 및 교대 대기 시간 (분)</label>
                <input
                  type="number"
                  step="10"
                  value={shiftConfig.lunchBreakMinutes}
                  onChange={(e) => setShiftConfig({ ...shiftConfig, lunchBreakMinutes: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text)', fontWeight: 700 }}
                />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-primary" onClick={triggerSaveMessage}>
                  <Save size={16} /> 가동시간 기준 저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 탭 4: 원소재 규격 (몰드표) 마스터 */}
      {activeTab === 'raw_specs' && (
        <div className="animate-in" style={{ opacity: !isAdminUnlocked ? 0.75 : 1, pointerEvents: !isAdminUnlocked ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
          <div className="kpi-card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--color-text)' }}>
              📦 원소재 규격 (몰드표) 마스터 테이블
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              💡 제품별 투입되는 원소재(잉고트/빌렛)의 치수 및 강종 규격을 관리합니다.
            </div>

            <table className="data-table" style={{ marginBottom: '1.5rem' }}>
              <thead>
                <tr>
                  <th>제품명 / 단조품</th>
                  <th>재질 / 강종</th>
                  <th>원소재 구분</th>
                  <th>표준 규격 (치수/중량)</th>
                  <th>비고</th>
                  <th style={{ textAlign: 'center' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {rawSpecs.map((spec) => (
                  <tr key={spec.id}>
                    <td style={{ fontWeight: 700 }}>{spec.product}</td>
                    <td><span className="badge badge-neutral">{spec.material}</span></td>
                    <td style={{ fontWeight: 600 }}>{spec.raw_material}</td>
                    <td style={{ color: 'var(--color-info)', fontWeight: 600 }}>{spec.spec}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{spec.note || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => handleDeleteSpec(spec.id)}
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

            {/* 신규 원소재 규격 추가 폼 */}
            <div style={{ background: 'var(--color-surface-2)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--color-border)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
                ➕ 신규 원소재 규격(몰드표) 추가
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>제품명</label>
                  <input
                    type="text"
                    placeholder="예: 금형강 대형"
                    value={newSpec.product}
                    onChange={(e) => setNewSpec({ ...newSpec, product: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>재질/강종</label>
                  <input
                    type="text"
                    placeholder="예: SKD61"
                    value={newSpec.material}
                    onChange={(e) => setNewSpec({ ...newSpec, material: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>원소재 구분</label>
                  <input
                    type="text"
                    placeholder="예: 합금 잉고트"
                    value={newSpec.raw_material}
                    onChange={(e) => setNewSpec({ ...newSpec, raw_material: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>표준 규격</label>
                  <input
                    type="text"
                    placeholder="예: Φ800 × 2400L"
                    value={newSpec.spec}
                    onChange={(e) => setNewSpec({ ...newSpec, spec: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>비고</label>
                  <input
                    type="text"
                    placeholder="예: 포스코 정품"
                    value={newSpec.note}
                    onChange={(e) => setNewSpec({ ...newSpec, note: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text)' }}
                  />
                </div>
                <div>
                  <button type="button" className="btn btn-primary" onClick={handleAddSpec} style={{ width: '100%', justifyContent: 'center' }}>
                    <Plus size={16} /> 추가
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
