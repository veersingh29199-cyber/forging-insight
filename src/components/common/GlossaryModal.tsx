'use client'

import React, { useState } from 'react'
import { BookOpen, X, Flame, Factory, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react'

export function GlossaryModal() {
  const [isOpen, setIsOpen] = useState(false)

  const terms = [
    {
      title: '황지 (공정 단조품)',
      icon: Factory,
      color: '#3b82f6',
      summary: '완제품이 되기 전 단계의 중간 단조 반제품',
      detail:
        '단조 공정 중 다음 공정(기계가공, 열처리 등)으로 넘어가거나 대기 중인 상태의 단조물입니다. 완제품 수주중량과 구분되며, 생산 실적 및 보고용 가스 원단위 계산 시 분리하여 집계합니다 (Section 8-3 표준 규칙).',
    },
    {
      title: 'COGGING (강괴 분할)',
      icon: Factory,
      color: '#8b5cf6',
      summary: '대형 잉고트(Ingot)나 빌렛을 단조용으로 1차 성형하는 작업',
      detail:
        '원소재를 제품 형상에 맞게 단조하기 전에, 큰 덩어리를 고르게 펴거나 원하는 크기로 절단 및 가공하는 전처리 공정입니다. 단조반 작업 시간에 포함됩니다.',
    },
    {
      title: '가스 원단위 3단계 (보고용 / 분석용 / 실제용)',
      icon: Flame,
      color: '#10b981',
      summary: '가열로 열 효율과 에너지 소모를 검증하는 3가지 핵심 기준',
      detail:
        '① 보고용(제품대비): 가스사용열량 ÷ 완제품중량 ➔ 경영진 보고 및 대외 기준 (목표: 150 Mcal/t 이하)\n② 분석용(총생산대비): 가스 ÷ [완제품 + 황지] ➔ 전체 단조 작업의 가열 효율 평가\n③ 실제용(투입대비): 가스 ÷ 원소재 투입중량 ➔ 재가열 열손실을 제외한 순수 가열 에너지 효율',
    },
    {
      title: '재가열 배수 (투입 ÷ 수주)',
      icon: RefreshCw,
      color: '#f59e0b',
      summary: '완제품 1톤을 만들기 위해 투입된 원소재 중량 비율',
      detail:
        '단조 작업 중 형상 맞춤이나 온도 저하로 인해 소재를 가열로에 다시 넣고 가열한 횟수 및 스크랩/불량 발생을 나타냅니다. 1.0배에 가까울수록 손실이 없는 가장 우수한 상태입니다.',
    },
    {
      title: '생산 목표 달성률 (황지 제외 규칙)',
      icon: CheckCircle2,
      color: '#ef4444',
      summary: '월간 계획 중량 대비 실제 완제품 달성률',
      detail:
        '도메인 표준 규칙에 따라 중간 공정품인 "황지"는 목표 달성률(%) 계산에서 제외됩니다. 수주받은 완제품 실적만으로 계획 대비 달성 여부를 엄격하게 판정합니다.',
    },
  ]

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="btn btn-outline"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.45rem 0.85rem',
          fontSize: '0.85rem',
          fontWeight: 700,
          borderColor: 'var(--color-primary)',
          color: 'var(--color-primary)',
          cursor: 'pointer',
        }}
        title="현장 단조 및 시스템 용어 사전 보기"
      >
        <BookOpen size={16} /> 📖 현장 용어 사전
      </button>

      {isOpen && (
        <div
          className="animate-in"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '650px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
              position: 'relative',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 상단 헤더 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-surface-2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <BookOpen size={22} color="var(--color-primary)" />
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>
                    현장 단조 및 시스템 용어 사전
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                    누구나 쉽게 이해하는 단조 공장 필수 지표 및 공식 가이드
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-dim)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                }}
              >
                <X size={22} />
              </button>
            </div>

            {/* 본문 (아코디언 및 카드 목록) */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {terms.map((t, idx) => {
                const IconComp = t.icon
                return (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.25rem',
                      borderLeft: `4px solid ${t.color}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <IconComp size={18} color={t.color} />
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-text)' }}>
                        {t.title}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: t.color, marginBottom: '0.6rem' }}>
                      💡 {t.summary}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {t.detail}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 하단 버튼 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                padding: '1rem 1.5rem',
                borderTop: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
              }}
            >
              <button
                onClick={() => setIsOpen(false)}
                className="btn btn-primary"
                style={{ padding: '0.55rem 1.5rem', fontWeight: 700 }}
              >
                확인 및 닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
