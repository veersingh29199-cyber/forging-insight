'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Flame,
  Upload,
  History,
  Settings,
  Home,
  Factory,
  Edit3,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', label: '대시보드', icon: Home },
  { href: '/analysis/production', label: '생산량 분석', icon: BarChart3 },
  { href: '/analysis/gas', label: '가스 원단위', icon: Flame },
  { href: '/upload', label: '파일 업로드', icon: Upload },
  { href: '/upload/history', label: '업로드 이력', icon: History },
  { href: '/data-entry', label: '직접 입력 / 편집', icon: Edit3 },
  { href: '/settings', label: '설정', icon: Settings },
] as const

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isEnvMissing =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)

  return (
    <div className="app-layout">
      {/* 사이드바 */}
      <aside className="sidebar">
        {/* 로고 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            padding: '0.5rem 0.875rem',
            marginBottom: '1rem',
          }}
        >
          <Factory size={20} color="#3b82f6" />
          <span
            style={{
              fontWeight: 800,
              fontSize: '0.9rem',
              background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            태웅 단조 분석
          </span>
        </div>

        {/* 구분선 */}
        <div
          style={{
            height: '1px',
            background: 'var(--color-border)',
            marginBottom: '0.75rem',
          }}
        />

        {/* 내비게이션 */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`nav-item ${active ? 'active' : ''}`}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* 하단 역할 표시 */}
        <div
          style={{
            padding: '0.75rem',
            background: 'var(--color-surface-2)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
          }}
        >
          <Link
            href="/onboarding"
            style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}
          >
            역할 변경 →
          </Link>
        </div>
      </aside>

      {/* 메인 컨텐츠 */}
      <main className="main-content">
        {isEnvMissing && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid var(--color-danger)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: 'var(--color-danger)',
            }}
          >
            <div style={{ fontSize: '1.25rem' }}>⚠️</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                Supabase 연결 환경변수가 설정되지 않았습니다!
              </div>
              <div style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '0.2rem' }}>
                Vercel 또는 로컬 <code>.env.local</code> 파일에 <code>NEXT_PUBLIC_SUPABASE_URL</code> 및 <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>를 설정해주세요. 현재 데이터베이스 조회 및 업로드가 제한될 수 있습니다.
              </div>
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
