'use client'

import React from 'react'
import { AlertTriangle, CheckCircle2, HelpCircle, X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info' | 'success'
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = '확인 및 진행',
  cancelLabel = '취소',
  variant = 'warning',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  let Icon = AlertTriangle
  let color = 'var(--color-accent)'
  let btnClass = 'btn-primary pulse-glow'

  if (variant === 'danger') {
    Icon = AlertTriangle
    color = 'var(--color-danger)'
    btnClass = 'btn-danger'
  } else if (variant === 'success') {
    Icon = CheckCircle2
    color = 'var(--color-success)'
    btnClass = 'btn-primary pulse-glow'
  } else if (variant === 'info') {
    Icon = HelpCircle
    color = 'var(--color-primary)'
    btnClass = 'btn-primary'
  }

  return (
    <div
      className="animate-in"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '480px',
          padding: '1.75rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          disabled={isLoading}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-dim)',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: `${color}15`,
              color: color,
            }}
          >
            <Icon size={24} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>
            {title}
          </h3>
        </div>

        <div style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '1.75rem' }}>
          {description}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onCancel}
            disabled={isLoading}
            style={{ padding: '0.65rem 1.25rem', fontWeight: 600 }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${btnClass}`}
            onClick={onConfirm}
            disabled={isLoading}
            style={{ padding: '0.65rem 1.5rem', fontWeight: 700 }}
          >
            {isLoading ? '처리 중...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
