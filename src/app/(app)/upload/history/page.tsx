'use client'

import { useState } from 'react'
import { RotateCcw, CheckCircle2, Clock, AlertCircle, FileSpreadsheet } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

// 더미 업로드 이력 데이터
const DUMMY_HISTORY = [
  {
    id: '1',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    file_name: '생산량집계표_2026년6월.xlsx',
    file_type: '생산량집계표',
    user_role: '생산관리',
    row_count: 248,
    status: 'committed',
    period_start: '2026-06-01',
    period_end: '2026-06-30',
  },
  {
    id: '2',
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    file_name: '가스검침_2026년6월.xlsx',
    file_type: '가스 검침표',
    user_role: '계량/현장',
    row_count: 120,
    status: 'committed',
    period_start: '2026-06-01',
    period_end: '2026-06-30',
  },
  {
    id: '3',
    created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    file_name: '연간목표_2026.xlsx',
    file_type: '연간 생산 목표',
    user_role: '생산관리',
    row_count: 36,
    status: 'committed',
    period_start: '2026-01-01',
    period_end: '2026-12-31',
  },
  {
    id: '4',
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    file_name: '생산실적_5월_임시.xlsx',
    file_type: '생산 실적',
    user_role: 'MES',
    row_count: 1023,
    status: 'rolled_back',
    period_start: '2026-05-01',
    period_end: '2026-05-31',
  },
]

export default function UploadHistoryPage() {
  const [rollbackId, setRollbackId] = useState<string | null>(null)
  const [rollingBack, setRollingBack] = useState(false)

  async function handleRollback(id: string) {
    setRollingBack(true)
    await new Promise((r) => setTimeout(r, 1200))
    setRollingBack(false)
    setRollbackId(null)
    alert('롤백 완료 (DB 연동 후 실제 동작)')
  }

  return (
    <div className="animate-in">
      <div className="section-header">
        <div>
          <h1 className="section-title">업로드 이력</h1>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            모든 업로드 기록 및 롤백 관리
          </div>
        </div>
        <a href="/upload" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          + 새 업로드
        </a>
      </div>

      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>파일명</th>
              <th>종류</th>
              <th>역할</th>
              <th>데이터 기간</th>
              <th style={{ textAlign: 'right' }}>행 수</th>
              <th>업로드 시각</th>
              <th>상태</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            {DUMMY_HISTORY.map((row) => (
              <tr key={row.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileSpreadsheet size={14} color="#10b981" />
                    <span style={{ fontWeight: 500 }}>{row.file_name}</span>
                  </div>
                </td>
                <td>
                  <span className="badge badge-neutral">{row.file_type}</span>
                </td>
                <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{row.user_role}</td>
                <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {row.period_start} ~ {row.period_end}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                  {row.row_count.toLocaleString()}
                </td>
                <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {format(new Date(row.created_at), 'MM/dd HH:mm', { locale: ko })}
                </td>
                <td>
                  <StatusBadge status={row.status as 'committed' | 'rolled_back' | 'preview'} />
                </td>
                <td>
                  {row.status === 'committed' && (
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--color-danger)' }}
                      onClick={() => setRollbackId(row.id)}
                    >
                      <RotateCcw size={12} /> 롤백
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 롤백 확인 모달 */}
      {rollbackId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            className="animate-in"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              maxWidth: '420px',
              width: '90%',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.75rem' }}>
              데이터 롤백 확인
            </div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              이 업로드로 삽입된 데이터를 모두 삭제합니다.
              롤백 후 되돌릴 수 없습니다.
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setRollbackId(null)}>
                취소
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleRollback(rollbackId)}
                disabled={rollingBack}
              >
                {rollingBack ? '롤백 중...' : '⚠️ 롤백 실행'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: 'committed' | 'rolled_back' | 'preview' }) {
  if (status === 'committed')
    return (
      <span className="badge badge-success">
        <CheckCircle2 size={11} /> 저장됨
      </span>
    )
  if (status === 'rolled_back')
    return (
      <span className="badge badge-danger">
        <AlertCircle size={11} /> 롤백됨
      </span>
    )
  return (
    <span className="badge badge-warning">
      <Clock size={11} /> 미확정
    </span>
  )
}
