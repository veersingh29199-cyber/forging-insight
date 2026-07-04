'use client'

import { useEffect, useState } from 'react'
import { Hammer } from 'lucide-react'

/**
 * ShopfloorToggle
 * - 클릭 시 <body>에 "shopfloor-mode" 클래스를 토글
 * - localStorage에 상태 저장 (페이지 새로고침 후에도 유지)
 */
export function ShopfloorToggle() {
  const [active, setActive] = useState(false)

  // 마운트 시 저장된 상태 복원
  useEffect(() => {
    const saved = localStorage.getItem('shopfloor-mode') === 'true'
    setActive(saved)
    if (saved) document.body.classList.add('shopfloor-mode')
  }, [])

  const toggle = () => {
    const next = !active
    setActive(next)
    localStorage.setItem('shopfloor-mode', String(next))
    document.body.classList.toggle('shopfloor-mode', next)
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
