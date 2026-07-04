'use client'

import React from 'react'
import { Check, ArrowRight } from 'lucide-react'

export type InternalUploadStep = 'select' | 'upload' | 'preview' | 'commit' | 'done'

interface StepIndicatorProps {
  current: InternalUploadStep
}

export function StepIndicator({ current }: StepIndicatorProps) {
  // 5개의 내부 상태를 사용자 관점의 3단계로 매핑
  const visualSteps = [
    {
      id: 1,
      label: '1. 파일 선택 및 올리기',
      sub: '담당자 엑셀 원본 그대로 드래그',
      match: ['select', 'upload'],
    },
    {
      id: 2,
      label: '2. 내용 확인 및 항목 연결',
      sub: '자동 인식된 열 이름과 데이터 검증',
      match: ['preview'],
    },
    {
      id: 3,
      label: '3. 최종 확정 및 저장 완료',
      sub: '데이터베이스 저장 및 분석 반영',
      match: ['commit', 'done'],
    },
  ]

  const currentVisualId = visualSteps.find((s) => s.match.includes(current))?.id || 1

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '0.75rem',
        margin: '1.5rem 0',
      }}
    >
      {visualSteps.map((step, idx) => {
        const isDone = step.id < currentVisualId || (step.id === 3 && current === 'done')
        const isActive = step.id === currentVisualId && current !== 'done'

        let bg = 'var(--color-surface)'
        let borderColor = 'var(--color-border)'
        let textColor = 'var(--color-text-dim)'
        let badgeBg = 'var(--color-surface-2)'

        if (isDone) {
          bg = 'rgba(16, 185, 129, 0.08)'
          borderColor = 'var(--color-success)'
          textColor = 'var(--color-success)'
          badgeBg = 'var(--color-success)'
        } else if (isActive) {
          bg = 'rgba(59, 130, 246, 0.08)'
          borderColor = 'var(--color-primary)'
          textColor = 'var(--color-primary)'
          badgeBg = 'var(--color-primary)'
        }

        return (
          <div
            key={step.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem',
              background: bg,
              border: `2px solid ${borderColor}`,
              borderRadius: 'var(--radius-md)',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: isDone || isActive ? badgeBg : 'var(--color-surface-2)',
                  color: isDone || isActive ? '#fff' : 'var(--color-text-muted)',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                }}
              >
                {isDone ? <Check size={16} strokeWidth={3} /> : step.id}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isDone || isActive ? textColor : 'var(--color-text)' }}>
                  {step.label}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                  {step.sub}
                </div>
              </div>
            </div>

            {idx < visualSteps.length - 1 && (
              <ArrowRight size={18} color="var(--color-text-dim)" style={{ opacity: 0.5 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
