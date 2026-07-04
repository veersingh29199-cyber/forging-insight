'use client'

import { useEffect, useState } from 'react'
import { Hammer } from 'lucide-react'

/**
 * ShopfloorToggle
 * - 클릭 시 <body>에 "shopfloor-mode" 클래스를 토글
 * - localStorage에 상태 저장 (페이지 새로고침 후에도 유지)
 */
export function ShopfloorToggle() {
  // 지연 초기화: 마운트 시 1회만 localStorage에서 읽음 (effect 내 setState 불필요)
  const [active, setActive] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('shopfloor-mode') === 'true'
  })

  // active 값이 바뀔 때마다 body 클래스 동기화 (부수효과만 처리)
  useEffect(() => {
    document.body.classList.toggle('shopfloor-mode', active)
  }, [active])

  const toggle = () => {
    const next = !active
    setActive(next)
    localStorage.setItem('shopfloor-mode', String(next))
  }

  return (
    <button
      onClick={toggle}
      className={`shopfloor-toggle ${active ? 'active' : ''}`}
      title="현장 태블릿용 터치 모드 ON/OFF"
    >
      <Hammer size={13} />
      {active ? '현장 모드 ON' : '현장 모드'}
    </button>
  )
}
