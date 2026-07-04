'use client'

import React from 'react'
import { ArrowRight, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { getFieldLabel } from '@/constants/labels'

interface MappingRowProps {
  targetCol: string // DB 필드명 (예: output_ton)
  currentHeader: string // 현재 선택된 엑셀 헤더명
  availableHeaders: string[] // 엑셀에서 추출한 전체 헤더 목록
  sampleValues: (string | number | boolean | null | undefined)[] // 해당 열의 실제 샘플 값 2~3개
  onChange: (newHeader: string) => void
  isRequired?: boolean
  confidence?: 'high' | 'medium' | 'low' | 'none'
}

export function MappingRow({
  targetCol,
  currentHeader,
  availableHeaders,
  sampleValues,
  onChange,
  isRequired = false,
  confidence = 'medium',
}: MappingRowProps) {
  const label = getFieldLabel(targetCol)

  // 신뢰도 및 상태 배지 계산
  let badgeVariant: 'confidence_high' | 'confidence_med' | 'error' | 'neutral' = 'neutral'
  let badgeLabel = '선택 안 됨'

  if (currentHeader) {
    if (confidence === 'high') {
      badgeVariant = 'confidence_high'
      badgeLabel = '자동 인식됨 (고신뢰)'
    } else if (confidence === 'medium') {
      badgeVariant = 'confidence_med'
      badgeLabel = '유사도 매칭 (확인 권장)'
    } else {
      badgeVariant = 'confidence_high'
      badgeLabel = '연결됨'
    }
  } else if (isRequired) {
    badgeVariant = 'error'
    badgeLabel = '필수 연결 누락'
  }

  // 샘플 값 텍스트 구성
  const sampleText = sampleValues
    .filter((v) => v !== undefined && v !== null && v !== '')
    .slice(0, 3)
    .map((v) => String(v))
    .join(' · ') || '(데이터 샘플 없음)'

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(200px, 1fr) 32px minmax(220px, 1.2fr)',
        alignItems: 'center',
        gap: '1rem',
        padding: '1.15rem',
        background: currentHeader && badgeVariant === 'confidence_high' ? 'rgba(16, 185, 129, 0.03)' : 'var(--color-surface)',
        border: `1px solid ${badgeVariant === 'error' ? 'rgba(239, 68, 68, 0.5)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* 1. 좌측: 내 엑셀 열 선택 (Dropdown) */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
            [내 엑셀의 열 이름]
          </span>
          <StatusBadge variant={badgeVariant} label={badgeLabel} size="sm" />
        </div>
        <select
          value={currentHeader || ''}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.55rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            border: `1px solid ${currentHeader ? 'var(--color-primary)' : 'var(--color-border)'}`,
            background: 'var(--color-surface-2)',
            color: 'var(--color-text)',
            fontSize: '0.9rem',
            fontWeight: currentHeader ? 700 : 400,
            cursor: 'pointer',
          }}
        >
          <option value="">-- (선택 안 함 / 기본값 처리) --</option>
          {availableHeaders.map((h, idx) => (
            <option key={idx} value={h}>
              {h || `(열_${idx + 1})`}
            </option>
          ))}
        </select>
        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--color-text-dim)',
            marginTop: '0.35rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={sampleText}
        >
          💡 엑셀 샘플: <span style={{ color: 'var(--color-info)', fontFamily: 'monospace' }}>{sampleText}</span>
        </div>
      </div>

      {/* 2. 중앙 화살표 */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <ArrowRight size={20} color="var(--color-primary)" />
      </div>

      {/* 3. 우측: 앱 항목 (한국어 업무 용어) */}
      <div style={{ background: 'var(--color-surface-2)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text)' }}>
            {label}
          </span>
          {isRequired && (
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
              필수 항목
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          DB 저장 필드: <span style={{ fontFamily: 'monospace', color: 'var(--color-text-dim)' }}>{targetCol}</span>
        </div>
      </div>
    </div>
  )
}
