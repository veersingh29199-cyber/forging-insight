'use client'

import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface DrilldownModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/**
 * DrilldownModal
 * - 이상치 경고 배너 클릭 시 상세 원인 데이터를 보여주는 모달
 * - ESC 키 및 오버레이 클릭으로 닫기 지원
 */
export function DrilldownModal({ open, onClose, title, children }: DrilldownModalProps) {
  // ESC 키 닫기
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-panel">
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose} aria-label="모달 닫기">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
