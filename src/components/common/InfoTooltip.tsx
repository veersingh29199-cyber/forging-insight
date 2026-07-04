'use client'

import React, { useState } from 'react'
import { HelpCircle, TrendingUp, TrendingDown, MinusCircle } from 'lucide-react'
import { KPI_TOOLTIPS, type TooltipInfo } from '@/constants/labels'

interface InfoTooltipProps {
  tooltipKey?: string
  customInfo?: TooltipInfo
  size?: number
  color?: string
}

export function InfoTooltip({ tooltipKey, customInfo, size = 16, color = 'var(--color-text-dim)' }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)

  const info: TooltipInfo | undefined = customInfo || (tooltipKey ? KPI_TOOLTIPS[tooltipKey] : undefined)

  if (!info) return null

  const renderDirectionBadge = (dir?: string) => {
    if (dir === 'higher_better') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#10b981', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(16,185,129,0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
          <TrendingUp size={12} /> 숫자가 높을수록 우수
        </span>
      )
    }
    if (dir === 'lower_better') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#3b82f6', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(59,130,246,0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
          <TrendingDown size={12} /> 숫자가 낮을수록 우수
        </span>
      )
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-text-dim)', fontSize: '0.75rem', fontWeight: 600, background: 'var(--color-surface-2)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
        <MinusCircle size={12} /> 일반 참조 지표
      </span>
    )
  }

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', zIndex: isOpen ? 50 : 1 }}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={(e) => {
        e.stopPropagation()
        setIsOpen(!isOpen)
      }}
    >
      <HelpCircle size={size} color={color} style={{ transition: 'color 0.2s', opacity: isOpen ? 1 : 0.8 }} />

      {isOpen && (
        <div
          className="animate-in"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '0.5rem',
            width: '300px',
            maxWidth: '85vw',
            padding: '1rem',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
            color: 'var(--color-text)',
            fontSize: '0.85rem',
            lineHeight: 1.5,
            textAlign: 'left',
            zIndex: 1000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
            <span style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '0.9rem' }}>{info.title}</span>
            {renderDirectionBadge(info.direction)}
          </div>

          <div style={{ marginBottom: '0.5rem', color: 'var(--color-text)' }}>
            {info.definition}
          </div>

          {info.formula && (
            <div
              style={{
                background: 'var(--color-surface-2)',
                padding: '0.6rem 0.75rem',
                borderRadius: '4px',
                borderLeft: '3px solid var(--color-primary)',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                color: 'var(--color-info)',
                marginBottom: '0.6rem',
                whiteSpace: 'pre-wrap',
              }}
            >
              {info.formula}
            </div>
          )}

          {info.note && (
            <div style={{ fontSize: '0.8rem', color: 'var(--color-accent)', fontWeight: 600, background: 'rgba(245,158,11,0.08)', padding: '0.5rem', borderRadius: '4px' }}>
              {info.note}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
