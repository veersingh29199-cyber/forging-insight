'use client'

import { useState, useEffect, useCallback } from 'react'
import { RotateCcw, CheckCircle2, Clock, AlertCircle, FileSpreadsheet, Loader2, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { getUploadHistory } from '@/app/actions/excel-actions'
import { rollbackUpload } from '@/app/actions/rollback-actions'

export default function UploadHistoryPage() {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [rollbackId, setRollbackId] = useState<number | null>(null)
  const [rollingBack, setRollingBack] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getUploadHistory()
      setHistory(data)
    } catch (e) {
      console.error('history fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  async function handleRollback(id: number) {
    setRollingBack(true)
    setMessage(null)
    try {
      const res = await rollbackUpload(id)
      if (res.success) {
        setMessage({ text: res.message || '롤백이 완료되었습니다.', type: 'success' })
        await fetchHistory()
      } else {
        setMessage({ text: res.error || '롤백 실패', type: 'error' })
      }
    } catch (e: any) {
      setMessage({ text: e?.message || '롤백 처리 중 오류 발생', type: 'error' })
    } finally {
      setRollingBack(false)
      setRollbackId(null)
    }
  }

  return (
    <div className="animate-in">
      <div className="section-header">
        <div>
          <h1 className="section-title">업로드 이력 및 롤백</h1>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Supabase DB에 적재된 모든 엑셀 파일 업로드 기록 및 원클릭 데이터 롤백 관리
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={fetchHistory} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 새로고침
          </button>
          <a href="/upload" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            + 새 업로드
          </a>
        </div>
      </div>

      {message && (
        <div
          style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${message.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}`,
            color: message.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
            fontWeight: 600,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 800 }}>
            ✕
          </button>
        </div>
      )}

      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          minHeight: '200px',
        }}
      >
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem', color: 'var(--color-text-muted)' }}>
            <Loader2 size={32} className="animate-spin" color="var(--color-primary)" />
            <span>업로드 이력을 조회하고 있습니다...</span>
          </div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
            <FileSpreadsheet size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>적재된 업로드 이력이 없습니다</div>
            <div style={{ fontSize: '0.85rem' }}>새 엑셀 파일을 업로드하여 생산 데이터 분석 DB를 구축해보세요.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>파일명</th>
                <th>종류 (테이블 마이그레이션)</th>
                <th style={{ textAlign: 'right' }}>적재 행 수</th>
                <th>업로드 시각</th>
                <th>상태</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id}>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>#{row.id}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileSpreadsheet size={16} color="#10b981" />
                      <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{row.file_name}</span>
                    </div>
                    {row.note && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>{row.note}</div>}
                  </td>
                  <td>
                    <span className="badge badge-neutral" style={{ fontWeight: 600 }}>{row.kind}</span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-text)' }}>
                    {row.row_count?.toLocaleString() || '-'}행
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    {row.created_at ? format(new Date(row.created_at), 'yyyy-MM-dd HH:mm', { locale: ko }) : '-'}
                  </td>
                  <td>
                    <StatusBadge status={row.status as 'committed' | 'rolled_back' | 'preview'} />
                  </td>
                  <td>
                    {row.status === 'committed' ? (
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                        onClick={() => setRollbackId(row.id)}
                      >
                        <RotateCcw size={13} /> 롤백
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>삭제됨</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 롤백 확인 모달 */}
      {rollbackId !== null && (
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
              maxWidth: '440px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.75rem', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={22} /> 데이터 롤백 확인
            </div>
            <div style={{ color: 'var(--color-text)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.5 }}>
              업로드 이력 <strong>#{rollbackId}</strong>번으로 삽입된 모든 행 데이터를 DB에서 완전히 삭제합니다.
            </div>
            <div style={{ padding: '0.75rem', background: 'var(--color-surface-2)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              💡 <strong>안내:</strong> 롤백 후에는 대시보드 KPI 및 가스 원단위 분석 통계에서 해당 파일의 실적이 즉시 제외됩니다. 이 작업은 되돌릴 수 없습니다.
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setRollbackId(null)} disabled={rollingBack}>
                취소
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleRollback(rollbackId)}
                disabled={rollingBack}
              >
                {rollingBack ? <Loader2 size={16} className="animate-spin" /> : '⚠️ 삭제 및 롤백 실행'}
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
        <CheckCircle2 size={12} /> 저장됨 (정상)
      </span>
    )
  if (status === 'rolled_back')
    return (
      <span className="badge badge-danger">
        <AlertCircle size={12} /> 롤백됨 (삭제완료)
      </span>
    )
  return (
    <span className="badge badge-warning">
      <Clock size={12} /> 미확정
    </span>
  )
}

