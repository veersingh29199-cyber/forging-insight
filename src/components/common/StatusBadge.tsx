'use client'

import React from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info, ShieldCheck } from 'lucide-react'

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'confidence_high' | 'confidence_med' | 'confidence_low'

interface StatusBadgeProps {
  variant?: BadgeVariant
  label: string
  icon?: boolean
  size?: 'sm' | 'md'
}

export function StatusBadge({ variant = 'neutral', label, icon = true, size = 'md' }: StatusBadgeProps) {
  let bg = 'var(--color-surface-2)'
  let border = 'var(--color-border)'
  let color = 'var(--color-text)'
  let IconComponent = Info

  switch (variant) {
    case 'success':
    case 'confidence_high':
      bg = 'rgba(16, 185, 129, 0.12)'
      border = 'rgba(16, 185, 129, 0.3)'
      color = 'var(--color-success)'
      IconComponent = CheckCircle2
      break
    case 'warning':
    case 'confidence_med':
      bg = 'rgba(245, 158, 11, 0.12)'
      border = 'rgba(245, 158, 11, 0.3)'
      color = 'var(--color-accent)'
      IconComponent = AlertTriangle
      break
    case 'error':
    case 'confidence_low':
      bg = 'rgba(239, 68, 68, 0.12)'
      border = 'rgba(239, 68, 68, 0.3)'
      color = 'var(--color-danger)'
      IconComponent = XCircle
      break
    case 'info':
      bg = 'rgba(59, 130, 246, 0.12)'
      border = 'rgba(59, 130, 246, 0.3)'
      color = 'var(--color-primary)'
      IconComponent = ShieldCheck
      break
    case 'neutral':
    default:
      bg = 'var(--color-surface-2)'
      border = 'var(--color-border)'
      color = 'var(--color-text-muted)'
      IconComponent = Info
      break
  }

  const pad = size === 'sm' ? '0.15rem 0.5rem' : '0.25rem 0.65rem'
  const fontSize = size === 'sm' ? '0.75rem' : '0.8rem'
  const iconSize = size === 'sm' ? 12 : 14

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: pad,
        borderRadius: '999px',
        backgroundColor: bg,
        border: `1px solid ${border}`,
        color: color,
        fontWeight: 600,
        fontSize: fontSize,
        whiteSpace: 'nowrap',
      }}
    >
      {icon && <IconComponent size={iconSize} />}
      <span>{label}</span>
    </span>
  )
}
