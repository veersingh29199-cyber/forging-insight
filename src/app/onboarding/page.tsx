'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { getTemplateData, FileFormatType } from '@/lib/excel/parser'
import { Download, ArrowRight, CheckCircle, FileSpreadsheet, Sparkles } from 'lucide-react'

// ─────────────────────────────────────────
// 역할 및 템플릿 정의 (Section 7-1)
// ─────────────────────────────────────────

interface RoleConfig {
  id: string
  label: string
  icon: string
  files: Array<{ label: string; fileType: FileFormatType; desc: string }>
  mainPage: string
  desc: string
  color: string
}

const ROLES: RoleConfig[] = [
  {
    id: 'production_mgmt',
    label: '생산관리 / 계획',
    icon: '📊',
    files: [
      { label: '연간/월간 생산 목표', fileType: 'targets', desc: '부서별 목표 수량/중량' },
      { label: '2026 생산량집계표', fileType: 'line_output_daily', desc: '다중밴드 일일 크로스탭 (kg/ton)' },
      { label: '생산 실적 원장', fileType: 'perf_records', desc: 'perf_P15/P5/P8/R9 수주 단위 실적' },
    ],
    mainPage: '/dashboard',
    desc: '목표 대비 달성률 분석, 부서별 생산 집계 및 미달 원인 파악',
    color: '#3b82f6',
  },
  {
    id: 'measurement',
    label: '계량 / 현장',
    icon: '🔥',
    files: [
      { label: '자체검침 (일별 검침)', fileType: 'gas_daily_readings', desc: 'self_2023_new 호기별 사용전/후' },
      { label: '가스 월별 사용실적', fileType: 'gas_monthly', desc: 'gas_monthly 월·호기·장입중량' },
      { label: '투입중량 보정', fileType: 'charge_correction', desc: 'charge2 부서/호기 합계' },
    ],
    mainPage: '/analysis/gas',
    desc: '호기별 가스 검침값 업로드 및 3단계 원단위 분석',
    color: '#f59e0b',
  },
  {
    id: 'mes',
    label: 'MES / 생산',
    icon: '🖥',
    files: [
      { label: 'MES 작업시간 Export', fileType: 'mes_work_time', desc: '제품 타입별 작업시간 export' },
      { label: '생산 실적 원장', fileType: 'perf_records', desc: 'MES 생산 실적 데이터' },
    ],
    mainPage: '/upload',
    desc: 'MES 시스템 export 파일 업로드 및 시간당 생산량(t/h) 분석',
    color: '#10b981',
  },
  {
    id: 'forging_team',
    label: '각 단조반',
    icon: '🔨',
    files: [
      { label: '생산 실적 원장 (교대별)', fileType: 'perf_records', desc: 'A/B/C 교대별 처리중량 및 횟수' },
    ],
    mainPage: '/upload',
    desc: '교대별 실적 파일 업로드 또는 직접 입력',
    color: '#ef4444',
  },
  {
    id: 'maintenance',
    label: '설비보전',
    icon: '🔧',
    files: [
      { label: '자체검침 (일별 검침)', fileType: 'gas_daily_readings', desc: '호기별 가동 및 가스 사용 이력' },
    ],
    mainPage: '/upload',
    desc: '설비 가동 이력 및 로방식(배치로/대차로) 원단위 추적',
    color: '#8b5cf6',
  },
  {
    id: 'facility_tech',
    label: '설비 / 기술',
    icon: '⚙️',
    files: [
      { label: '표준작업수 마스터', fileType: 'work_standards', desc: '표A(투입중량구간) + 표B(R/M 제품중량)' },
      { label: '원소재 규격 (몰드표)', fileType: 'raw_material_specs', desc: '제품·재질·원소재·규격 마스터' },
    ],
    mainPage: '/settings',
    desc: '마스터 데이터 관리 및 표준값 설정 (엑셀 업로드 또는 직접입력)',
    color: '#06b6d4',
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)
  const [step, setStep] = useState<'select' | 'confirm'>('select')

  const selectedRole = ROLES.find((r) => r.id === selected)

  function handleSelect(id: string) {
    setSelected(id)
    setStep('confirm')
  }

  function handleConfirm(targetUrl?: string) {
    if (!selectedRole) return
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('userRole', selectedRole.id)
    }
    router.push(targetUrl || selectedRole.mainPage)
  }

  // ─────────────────────────────────────────
  // 템플릿 다운로드 핸들러
  // ─────────────────────────────────────────

  const downloadTemplate = (fileType: FileFormatType, label: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const { sheetName, aoa } = getTemplateData(fileType)
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, `태웅_${label}_템플릿.xlsx`)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      {/* 로고 / 타이틀 */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(59,130,246,0.1)', padding: '0.35rem 1rem', borderRadius: '999px', color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1rem' }}>
          <Sparkles size={16} /> 태웅 단조공장 맞춤형 온보딩 위저드
        </div>
        <div
          style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem',
          }}
        >
          생산·가스 원단위 통합 분석 시스템
        </div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          담당자 가공 0% — 원본 엑셀 있는 그대로 업로드하면 10단계 파트가 자동 분석합니다.
        </div>
      </div>

      {/* 온보딩 5단계 흐름 바 (Section 7-1) */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { num: '1', label: '역할 선택', active: step === 'select' },
          { num: '2', label: '올릴 파일 안내', active: step === 'confirm' },
          { num: '3', label: '템플릿 받기(선택)', active: step === 'confirm' },
          { num: '4', label: '업로드·자동검증', active: false },
          { num: '5', label: '완료·분석', active: false },
        ].map((st, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              background: st.active ? 'var(--color-primary)' : 'var(--color-surface-2)',
              color: st.active ? '#fff' : 'var(--color-text-dim)',
              fontSize: '0.8rem',
              fontWeight: st.active ? 700 : 500,
              border: '1px solid var(--color-border)',
            }}>
              {st.num}. {st.label}
            </div>
            {i < 4 && <div style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem' }}>→</div>}
          </div>
        ))}
      </div>

      {/* STEP 1: 역할 선택 */}
      {step === 'select' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
            maxWidth: '960px',
            width: '100%',
          }}
          className="animate-in"
        >
          {ROLES.map((role) => (
            <button
              key={role.id}
              onClick={() => handleSelect(role.id)}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget
                el.style.borderColor = role.color
                el.style.boxShadow = `0 8px 24px ${role.color}22`
                el.style.transform = 'translateY(-3px)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget
                el.style.borderColor = 'var(--color-border)'
                el.style.boxShadow = 'none'
                el.style.transform = 'translateY(0)'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '2.2rem' }}>{role.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)' }}>
                      {role.label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: role.color, fontWeight: 600 }}>
                      추천 화면: {role.mainPage}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                  {role.desc}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: '0.4rem', fontWeight: 600 }}>
                  📁 담당 업로드 파일:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {role.files.map((f, fi) => (
                    <span key={fi} className="badge badge-neutral" style={{ fontSize: '0.75rem', background: 'var(--color-surface-2)' }}>
                      {f.label}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* STEP 2 & 3: 파일 안내 및 템플릿 받기 */}
      {step === 'confirm' && selectedRole && (
        <div
          className="animate-in"
          style={{
            background: 'var(--color-surface)',
            border: `2px solid ${selectedRole.color}`,
            borderRadius: 'var(--radius-lg)',
            padding: '2.5rem',
            maxWidth: '560px',
            width: '100%',
            boxShadow: `0 12px 40px ${selectedRole.color}22`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1.25rem' }}>
            <div style={{ fontSize: '3rem' }}>{selectedRole.icon}</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--color-text)' }}>
                {selectedRole.label} 환영합니다!
              </div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                {selectedRole.desc}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text)' }}>
              <FileSpreadsheet size={18} color={selectedRole.color} />
              내가 업로드할 현장 엑셀 파일 안내 & 템플릿 다운로드
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              💡 현장에서 쓰시는 원본 엑셀이 있다면 가공 없이 바로 업로드하세요.<br />
              양식이 필요하신 경우 아래 **[템플릿 받기]** 버튼을 눌러 예시 양식을 받을 수 있습니다.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {selectedRole.files.map((f, fi) => (
                <div
                  key={fi}
                  style={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.875rem 1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <CheckCircle size={14} color={selectedRole.color} /> {f.label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                      {f.desc}
                    </div>
                  </div>
                  <button
                    onClick={(e) => downloadTemplate(f.fileType, f.label, e)}
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      padding: '0.4rem 0.75rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      color: 'var(--color-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-surface)'}
                  >
                    <Download size={14} /> 템플릿 받기
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              className="btn btn-outline"
              onClick={() => setStep('select')}
              style={{ padding: '0.75rem 1.5rem' }}
            >
              ← 다시 선택
            </button>
            <button
              className="btn btn-primary pulse-glow"
              onClick={() => handleConfirm('/upload')}
              style={{ background: selectedRole.color, padding: '0.75rem 1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              엑셀 업로드하러 가기 <ArrowRight size={16} />
            </button>
            <button
              className="btn btn-outline"
              onClick={() => handleConfirm()}
              style={{ padding: '0.75rem 1.25rem' }}
            >
              대시보드 바로가기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
