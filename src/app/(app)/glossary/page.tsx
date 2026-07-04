'use client'

import React, { useState } from 'react'
import { BookOpen, Search, Flame, Factory, RefreshCw, AlertTriangle, CheckCircle2, ArrowLeft, ShieldCheck, HelpCircle } from 'lucide-react'

export default function GlossaryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState<'all' | 'production' | 'gas' | 'system'>('all')

  const terms = [
    {
      category: 'production',
      title: '황지 (Hwangji / 공정 단조품)',
      icon: Factory,
      color: '#3b82f6',
      summary: '완제품이 되기 전 단계의 중간 단조 반제품',
      detail:
        '단조 공정 중 다음 공정(기계가공, 열처리 등)으로 넘어가거나 대기 중인 상태의 단조물입니다.\n\n💡 [도메인 표준 규칙]: 완제품 수주중량과 엄격히 구분되며, 생산 실적 및 보고용 가스 원단위 계산 시 분리하여 집계합니다 (Section 8-3 표준 규칙).\n※ 황지는 최종 고객에게 납품되는 완제품이 아니므로 월간 생산 목표 달성률(%) 계산에서 제외됩니다.',
      formula: '황지 중량(t) = 공정 간 이동 중인 중간 단조품 총중량',
    },
    {
      category: 'production',
      title: 'COGGING (강괴 분할 및 1차 단조)',
      icon: Factory,
      color: '#8b5cf6',
      summary: '대형 잉고트(Ingot)나 빌렛을 단조용으로 1차 성형하는 작업',
      detail:
        '원소재를 제품 형상에 맞게 단조하기 전에, 큰 덩어리를 고르게 펴거나 원하는 크기로 절단 및 가공하는 전처리 공정입니다. 단조반 작업 시간에 포함되며 투입 중량 관리의 기준이 됩니다.',
    },
    {
      category: 'gas',
      title: '가스 원단위 3단계 (보고용 / 분석용 / 실제용)',
      icon: Flame,
      color: '#10b981',
      summary: '가열로 열 효율과 에너지 소모를 검증하는 3가지 핵심 기준',
      detail:
        '단조 공장의 가열 효율과 손실을 정확히 파악하기 위해 가스 사용 열량을 3가지 중량 기준으로 나누어 검증합니다.\n\n① 보고용(제품대비): 경영진 보고 및 대외 기준 (목표: 150 Mcal/t 이하)\n② 분석용(총생산대비): 전체 단조 작업(황지 포함)의 순수 가열 효율 평가\n③ 실제용(투입대비): 재가열 열손실을 제외한 가열로 자체의 에너지 변환 효율',
      formula: '① 보고용 = 가스열량(Mcal) ÷ 완제품 수주중량(t)\n② 분석용 = 가스열량 ÷ [완제품 + 황지 중량](t)\n③ 실제용 = 가스열량 ÷ 원소재 투입중량(t)',
    },
    {
      category: 'production',
      title: '재가열 배수 (투입 ÷ 수주)',
      icon: RefreshCw,
      color: '#f59e0b',
      summary: '완제품 1톤을 만들기 위해 투입된 원소재 중량 비율',
      detail:
        '단조 작업 중 형상 맞춤이나 온도 저하로 인해 소재를 가열로에 다시 넣고 가열한 횟수 및 스크랩/불량 발생을 나타냅니다. 1.0배에 가까울수록 손실이 없는 가장 우수한 상태입니다.\n\n💡 재가열 배수가 1.2배 이상으로 높아지면 가스 원단위(소모량)도 급격히 상승하는 원인이 됩니다.',
      formula: '재가열 배수 = 총 원소재 투입중량(t) ÷ 완제품 수주중량(t)',
    },
    {
      category: 'system',
      title: '생산 목표 달성률 (황지 제외 규칙)',
      icon: CheckCircle2,
      color: '#ef4444',
      summary: '월간 계획 중량 대비 실제 완제품 달성률',
      detail:
        '도메인 표준 규칙에 따라 중간 공정품인 "황지"는 목표 달성률(%) 계산에서 제외됩니다. 수주받은 완제품 실적만으로 계획 대비 달성 여부를 엄격하게 판정합니다.',
      formula: '달성률(%) = 완제품 생산중량(t) ÷ 월간 계획중량(t) × 100',
    },
    {
      category: 'system',
      title: '시간당 생산량 (t/h)',
      icon: Factory,
      color: '#06b6d4',
      summary: '가동 시간당 생산 효율을 나타내는 생산성 지표',
      detail:
        '단조반이 실제 가동된 시간 동안 시간당 몇 톤(ton)의 완제품을 생산했는지 나타냅니다. 설비 고장이나 대기 시간이 길어질수록 시간당 생산량이 하락합니다.',
      formula: '시간당 생산량(t/h) = 완제품 생산중량(t) ÷ 총 작업 가동시간(h)',
    },
    {
      category: 'production',
      title: '공정 불량률 (%)',
      icon: AlertTriangle,
      color: '#ec4899',
      summary: '전체 생산량 중 규격 이탈이나 단조 균열로 발생한 불량 비중',
      detail:
        '원소재 규격(몰드표) 및 표준작업수 기준 이탈 검증 결과입니다. 현장 목표는 2.0% 이하 유지이며, 불량 발생 시 원인(가열 온도 미달, 치수 불량 등)을 필수로 기록해야 합니다.',
      formula: '불량률(%) = 불량 발생 중량(t) ÷ 총 생산 중량(t) × 100',
    },
    {
      category: 'system',
      title: '기존 데이터 갱신 (덮어쓰기 / Upsert)',
      icon: ShieldCheck,
      color: '#6366f1',
      summary: '동일한 날짜와 호기의 엑셀 업로드 시 중복을 방지하는 시스템 기능',
      detail:
        '담당자가 수정된 엑셀 파일을 다시 업로드할 때, 시스템이 작업 일자와 가열로 호기를 대조하여 이미 존재하는 데이터는 최신 내용으로 안전하게 덮어쓰기(갱신)하고, 새로운 내역만 추가합니다. 이로 인해 데이터가 2배로 부풀려지는 현상이 원천 차단됩니다.',
    },
  ]

  const filteredTerms = terms.filter((t) => {
    const matchCategory = activeCategory === 'all' || t.category === activeCategory
    const matchSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.detail.toLowerCase().includes(searchTerm.toLowerCase())
    return matchCategory && matchSearch
  })

  return (
    <div className="animate-in" style={{ paddingBottom: '3rem' }}>
      {/* 상단 헤더 */}
      <div className="section-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <a href="/dashboard" style={{ color: 'var(--color-text-dim)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
              <ArrowLeft size={16} /> 대시보드로 돌아가기
            </a>
          </div>
          <h1 className="section-title">📖 현장 단조 및 시스템 용어 사전</h1>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            엑셀 업로드와 데이터 분석에 사용되는 필수 지표, 공식, 도메인 표준 규칙을 확인하세요.
          </div>
        </div>
      </div>

      {/* 검색 및 카테고리 탭 */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          marginBottom: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {/* 검색창 */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={18} color="var(--color-text-dim)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="용어, 공식, 키워드(예: 황지, 원단위, 덮어쓰기) 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 2.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface-2)',
              color: 'var(--color-text)',
              fontSize: '0.95rem',
            }}
          />
        </div>

        {/* 카테고리 버튼 */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: '전체 용어' },
            { id: 'production', label: '🛠️ 생산 / 단조' },
            { id: 'gas', label: '🔥 가스 / 에너지' },
            { id: 'system', label: '💻 시스템 / 지표' },
          ].map((cat) => {
            const isActive = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '999px',
                  border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: isActive ? 'var(--color-primary)' : 'var(--color-surface-2)',
                  color: isActive ? '#fff' : 'var(--color-text-muted)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {cat.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 용어 카드 목록 */}
      {filteredTerms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--color-border)' }}>
          <HelpCircle size={48} color="var(--color-text-dim)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.35rem' }}>검색 결과가 없습니다</div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>다른 키워드로 검색하거나 카테고리를 전체로 변경해 보세요.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {filteredTerms.map((t, idx) => {
            const IconComp = t.icon
            return (
              <div
                key={idx}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderTop: `4px solid ${t.color}`,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '8px', background: `${t.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.color }}>
                      <IconComp size={20} />
                    </div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>
                      {t.title}
                    </h3>
                  </div>

                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: t.color, background: `${t.color}10`, padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '1rem' }}>
                    💡 {t.summary}
                  </div>

                  <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
                    {t.detail}
                  </div>
                </div>

                {t.formula && (
                  <div
                    style={{
                      background: 'var(--color-surface-2)',
                      padding: '0.75rem 1rem',
                      borderRadius: '6px',
                      borderLeft: `3px solid ${t.color}`,
                      fontFamily: 'monospace',
                      fontSize: '0.82rem',
                      color: 'var(--color-text)',
                      fontWeight: 600,
                    }}
                  >
                    📐 {t.formula}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
