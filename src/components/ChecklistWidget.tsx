'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react'

// ─────────────────────────────────────────
// Section 7-7. 현장 적용 체크리스트 정의
// ─────────────────────────────────────────

export interface ChecklistItem {
  id: string
  title: string
  desc: string
  link: string
  linkLabel: string
  category: 'upload' | 'settings' | 'analysis'
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'chk_upload_line_output',
    title: '1) 2026 생산량집계표.xlsx 업로드',
    desc: '라인별 일일 크로스탭 생산량(kg) 파악 및 ton 변환 확인',
    link: '/upload',
    linkLabel: '업로드 바로가기',
    category: 'upload',
  },
  {
    id: 'chk_upload_gas',
    title: '2) 가스 월별 실적 또는 자체검침 파일 업로드',
    desc: 'self_2023_new 사용전/후 지침 및 Mcal 열량 환산',
    link: '/upload',
    linkLabel: '가스파일 업로드',
    category: 'upload',
  },
  {
    id: 'chk_settings_targets',
    title: '3) 부서별 연간/월간 목표값 설정',
    desc: '목표 파일 업로드 또는 직접입력 화면에서 수기 설정',
    link: '/data-entry',
    linkLabel: '목표 직접입력',
    category: 'settings',
  },
  {
    id: 'chk_settings_furnaces',
    title: '4) 호기 → 부서 매핑 및 로방식 지정',
    desc: '배치로(1·9·10·11·12·14·15·16호기) vs 대차로 구분',
    link: '/settings',
    linkLabel: '로방식 설정',
    category: 'settings',
  },
  {
    id: 'chk_settings_work_std',
    title: '5) 표준작업수 마스터 확인',
    desc: '표A(투입중량 구간) vs 표B(수주치수 R/M 제품중량) 매칭 규칙',
    link: '/settings',
    linkLabel: '표준작업수 관리',
    category: 'settings',
  },
  {
    id: 'chk_settings_raw_spec',
    title: '6) 원소재 규격 (몰드표) 마스터 확인',
    desc: '제품·재질·원소재·규격 불량 분석용 마스터 확인',
    link: '/settings',
    linkLabel: '원소재 규격 관리',
    category: 'settings',
  },
  {
    id: 'chk_analysis_prod',
    title: '7) 생산량 분석 탭에서 부서별 미달 원인 확인',
    desc: 'P15/P5/R9/R/M 부서별 달성률 및 황지 제외 여부 검증',
    link: '/analysis/production',
    linkLabel: '생산량 분석',
    category: 'analysis',
  },
  {
    id: 'chk_analysis_gas',
    title: '8) 가스 분석 탭에서 3단계 원단위 편차 확인',
    desc: '보고용(제품) vs 분석용(총생산) vs 실제(투입) 재가열 손실 분석',
    link: '/analysis/gas',
    linkLabel: '가스 원단위 분석',
    category: 'analysis',
  },
]

export function ChecklistWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('forging_checklist_completed')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error('Failed to load checklist state', e)
        }
      }
      return ['chk_upload_line_output', 'chk_upload_gas', 'chk_settings_furnaces']
    }
    return ['chk_upload_line_output', 'chk_upload_gas', 'chk_settings_furnaces']
  })

  const toggleItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = completedIds.includes(id)
      ? completedIds.filter((i) => i !== id)
      : [...completedIds, id]
    setCompletedIds(next)
    if (typeof window !== 'undefined') {
      localStorage.setItem('forging_checklist_completed', JSON.stringify(next))
    }
  }

  const count = completedIds.length
  const total = CHECKLIST_ITEMS.length
  const percent = Math.round((count / total) * 100)

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '2rem',
        overflow: 'hidden',
        boxShadow: isOpen ? '0 10px 30px rgba(0,0,0,0.15)' : 'none',
        transition: 'all 0.2s',
      }}
    >
      {/* 아코디언 헤더 */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          background: isOpen ? 'var(--color-surface-2)' : 'transparent',
          borderBottom: isOpen ? '1px solid var(--color-border)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: count === total ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: count === total ? 'var(--color-success)' : 'var(--color-primary)',
              fontWeight: 800,
              fontSize: '0.9rem',
            }}
          >
            {count === total ? '✓' : `${count}`}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📋 현장 적용 체크리스트</span>
              <span className={`badge ${count === total ? 'badge-success' : 'badge-primary'}`} style={{ fontSize: '0.75rem' }}>
                {count}/{total} 완료 ({percent}%)
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              태웅 단조공장 실제 운영을 위한 8단계 권장 가이드 (클릭하여 닫기/열기)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 120, height: 6, background: 'var(--color-bg)', borderRadius: 999, overflow: 'hidden' }}>
            <div
              style={{
                width: `${percent}%`,
                height: '100%',
                background: count === total ? 'var(--color-success)' : 'var(--color-primary)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div style={{ color: 'var(--color-text-dim)' }}>
            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>

      {/* 아코디언 본문 */}
      {isOpen && (
        <div style={{ padding: '1.25rem 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {CHECKLIST_ITEMS.map((item) => {
            const isDone = completedIds.includes(item.id)
            return (
              <div
                key={item.id}
                onClick={(e) => toggleItem(item.id, e)}
                style={{
                  padding: '0.875rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: isDone ? 'rgba(16,185,129,0.04)' : 'var(--color-surface-2)',
                  border: `1px solid ${isDone ? 'rgba(16,185,129,0.2)' : 'var(--color-border)'}`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ marginTop: '0.15rem', color: isDone ? 'var(--color-success)' : 'var(--color-text-dim)' }}>
                    {isDone ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isDone ? 'var(--color-text-muted)' : 'var(--color-text)', textDecoration: isDone ? 'line-through' : 'none' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem', lineHeight: 1.3 }}>
                      {item.desc}
                    </div>
                  </div>
                </div>

                <a
                  href={item.link}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--color-primary)',
                    background: 'var(--color-surface)',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    whiteSpace: 'nowrap',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-surface)'}
                >
                  {item.linkLabel} →
                </a>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
