'use client'

import React from 'react'
import { Loader2, AlertCircle, FileSpreadsheet, ArrowRight, RefreshCw } from 'lucide-react'

// ─────────────────────────────────────────
// 1. 빈 상태 (EmptyState)
// ─────────────────────────────────────────

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: React.ReactNode
  actionLabel?: string
  onAction?: () => void
  href?: string
}

export function EmptyState({
  title = '아직 등록된 데이터가 없습니다',
  description = '현장 엑셀 파일을 업로드하면 이곳에서 즉시 분석 결과를 확인하실 수 있습니다.',
  icon,
  actionLabel = '엑셀 파일 올리기',
  onAction,
  href = '/upload',
}: EmptyStateProps) {
  return (
    <div
      className="animate-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '4rem 2rem',
        background: 'var(--color-surface)',
        border: '1px dashed var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        margin: '1rem 0',
      }}
    >
      <div style={{ marginBottom: '1.25rem', opacity: 0.8, color: 'var(--color-primary)' }}>
        {icon || <FileSpreadsheet size={56} />}
      </div>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text)' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', maxWidth: '450px', lineHeight: 1.5, marginBottom: '1.5rem' }}>
        {description}
      </p>
      {onAction ? (
        <button
          onClick={onAction}
          className="btn btn-primary pulse-glow"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem', fontWeight: 700 }}
        >
          {actionLabel} <ArrowRight size={16} />
        </button>
      ) : href ? (
        <a
          href={href}
          className="btn btn-primary pulse-glow"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem', fontWeight: 700, textDecoration: 'none' }}
        >
          {actionLabel} <ArrowRight size={16} />
        </a>
      ) : null}
    </div>
  )
}

// ─────────────────────────────────────────
// 2. 로딩 상태 (LoadingState)
// ─────────────────────────────────────────

interface LoadingStateProps {
  message?: string
  subMessage?: string
  size?: number
}

export function LoadingState({
  message = '데이터를 불러오고 있습니다...',
  subMessage = '잠시만 기다려 주세요.',
  size = 40,
}: LoadingStateProps) {
  return (
    <div
      className="animate-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        textAlign: 'center',
      }}
    >
      <Loader2 size={size} color="var(--color-primary)" style={{ animation: 'spin 1s linear infinite', marginBottom: '1.25rem' }} />
      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)', marginBottom: '0.35rem' }}>
        {message}
      </div>
      {subMessage && (
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          {subMessage}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────
// 3. 오류 상태 (ErrorState)
// ─────────────────────────────────────────

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  retryLabel?: string
}

export function ErrorState({
  title = '문제가 발생했습니다',
  message,
  onRetry,
  retryLabel = '다시 시도하기',
}: ErrorStateProps) {
  return (
    <div
      className="animate-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 2rem',
        background: 'rgba(239, 68, 68, 0.05)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: 'var(--radius-lg)',
        textAlign: 'center',
        margin: '1rem 0',
      }}
    >
      <AlertCircle size={48} color="var(--color-danger)" style={{ marginBottom: '1rem' }} />
      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-danger)', marginBottom: '0.5rem' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', maxWidth: '500px', lineHeight: 1.5, marginBottom: '1.5rem' }}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn btn-outline"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
        >
          <RefreshCw size={16} /> {retryLabel}
        </button>
      )}
    </div>
  )
}
