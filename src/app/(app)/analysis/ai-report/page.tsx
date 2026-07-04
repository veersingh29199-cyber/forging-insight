'use client'

import { useState } from 'react'
import { Sparkles, Download, RefreshCw, Printer, ChevronDown, ChevronUp } from 'lucide-react'
import { getAiReportData, generateAiCommentary, type AiReportData } from '@/app/actions/ai-report-actions'

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const YEARS = [2024, 2025, 2026]

export default function AiReportPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AiReportData | null>(null)
  const [commentary, setCommentary] = useState('')
  const [showTable, setShowTable] = useState(true)
  const [copied, setCopied] = useState(false)

  const generate = () => {
    setLoading(true)
    setData(null)
    setCommentary('')
    getAiReportData(year, month).then(async (d) => {
      setData(d)
      const txt = await generateAiCommentary(d)
      setCommentary(txt)
      setLoading(false)
    }).catch(e => {
      console.error(e)
      setLoading(false)
    })
  }

  const copyText = () => {
    navigator.clipboard.writeText(commentary).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const printReport = () => window.print()

  return (
    <div className="animate-in">
      {/* 헤더 */}
      <div className="section-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="section-title">✨ AI 자동 경영진 보고서</h1>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            실적 데이터를 분석하여 <strong style={{ color: 'var(--color-primary)' }}>월간 경영진 보고용 코멘터리</strong>를 자동으로 생성합니다
          </div>
        </div>
      </div>

      {/* 조건 선택 */}
      <div className="kpi-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>분석 연도</label>
            <select
              className="filter-select"
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.88rem' }}
            >
              {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>분석 월</label>
            <select
              className="filter-select"
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.88rem' }}
            >
              {MONTHS.map(m => <option key={m} value={m}>{m}월</option>)}
            </select>
          </div>
          <button
            className="btn btn-primary"
            onClick={generate}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 140 }}
          >
            {loading ? (
              <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> 분석 중...</>
            ) : (
              <><Sparkles size={14} /> AI 보고서 생성</>
            )}
          </button>
          {commentary && (
            <>
              <button className="btn btn-outline" onClick={copyText} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {copied ? '✅ 복사됨' : '📋 텍스트 복사'}
              </button>
              <button className="btn btn-outline" onClick={printReport} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Printer size={14} /> 인쇄/PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* 로딩 스켈레톤 */}
      {loading && (
        <div className="kpi-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Sparkles size={36} color="var(--color-primary)" style={{ animation: 'pulse 1.5s infinite' }} />
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>실적 데이터 분석 중...</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              {year}년 {month}월 생산·가스 실적을 집계하고 경영 코멘터리를 작성하고 있습니다.
            </div>
          </div>
        </div>
      )}

      {/* 결과 */}
      {data && commentary && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* AI 코멘터리 */}
          <div className="kpi-card" style={{ padding: '1.75rem', borderColor: 'rgba(139,92,246,0.4)', background: 'rgba(139,92,246,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Sparkles size={18} color="#8b5cf6" />
              <span style={{ fontWeight: 800, fontSize: '1rem', color: '#8b5cf6' }}>
                AI 생성 경영진 코멘터리 — {year}년 {month}월
              </span>
            </div>
            <pre style={{
              whiteSpace: 'pre-wrap',
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: '0.88rem',
              lineHeight: 1.9,
              color: 'var(--color-text)',
              background: 'var(--color-surface-2)',
              padding: '1.25rem 1.5rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}>
              {commentary}
            </pre>
          </div>

          {/* 부서별 상세 데이터 테이블 (토글) */}
          <div className="kpi-card" style={{ padding: '1.5rem' }}>
            <button
              onClick={() => setShowTable(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)', fontWeight: 800, fontSize: '0.95rem' }}
            >
              📊 부서별 집계 근거 데이터
              {showTable ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showTable && (
              <div style={{ marginTop: '1.25rem', overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>부서</th>
                      <th style={{ textAlign: 'right' }}>생산(t)</th>
                      <th style={{ textAlign: 'right' }}>목표(t)</th>
                      <th style={{ textAlign: 'right' }}>달성률</th>
                      <th style={{ textAlign: 'right' }}>원단위(Mcal/t)</th>
                      <th style={{ textAlign: 'right' }}>목표 원단위</th>
                      <th>주요 이슈</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.deptStats.map(d => {
                      const achOk = d.achievementRate >= 95
                      const gasOk = d.gasUnit <= d.targetGasUnit
                      return (
                        <tr key={d.dept}>
                          <td style={{ fontWeight: 700 }}>{d.dept}</td>
                          <td style={{ textAlign: 'right' }}>{d.outputTon.toLocaleString()}</td>
                          <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>{d.targetTon.toLocaleString()}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: achOk ? 'var(--color-success)' : 'var(--color-danger)' }}>
                            {d.achievementRate.toFixed(1)}%
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: gasOk ? 'var(--color-success)' : 'var(--color-danger)' }}>
                            {d.gasUnit > 0 ? d.gasUnit.toFixed(1) : '-'}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>{d.targetGasUnit}</td>
                          <td>
                            <span className={`badge ${d.topIssue === '이상 없음' ? 'badge-success' : 'badge-warning'}`}>
                              {d.topIssue}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--color-surface-2)' }}>
                      <td style={{ fontWeight: 800 }}>전체 합계</td>
                      <td style={{ textAlign: 'right', fontWeight: 800 }}>{data.totalOutputTon.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-text-muted)' }}>{data.totalTargetTon.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontWeight: 900, color: data.overallAchievement >= 95 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {data.overallAchievement.toFixed(1)}%
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: data.avgGasUnit <= 150 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {data.avgGasUnit > 0 ? data.avgGasUnit.toFixed(1) : '-'}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>150</td>
                      <td>
                        <span className={`badge ${data.overallAchievement >= 95 ? 'badge-success' : 'badge-danger'}`}>
                          {data.overallAchievement >= 100 ? '목표 달성' : data.overallAchievement >= 95 ? '근접' : '미달'}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* 가스비 절감 요약 */}
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                  💰 <strong>가스비 절감 추정:</strong>{' '}
                  기준 원단위(150 Mcal/t) 대비{' '}
                  <strong style={{ color: data.costSavedEstimate >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {data.costSavedEstimate >= 0 ? '약 ' : '약 -'}
                    {(Math.abs(data.costSavedEstimate) / 10_000).toFixed(0)}만원
                  </strong>{' '}
                  {data.costSavedEstimate >= 0 ? '절감' : '추가 발생'} 추정 · 재가열 배수 {data.reheatRatio.toFixed(2)}배
                </div>
              </div>
            )}
          </div>

          {/* 내보내기 안내 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', background: 'rgba(59,130,246,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <Download size={16} color="var(--color-primary)" />
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              위 코멘터리를 복사하여 경영진 회의 자료·이메일·카카오톡 보고에 바로 활용하거나,
              <strong style={{ color: 'var(--color-primary)' }}> 대시보드 → 엑셀 보고서</strong>와 함께 첨부하여 제출하십시오.
            </span>
          </div>
        </div>
      )}

      {/* 데이터 없음 안내 */}
      {!loading && data && data.deptStats.length === 0 && (
        <div className="kpi-card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📭</div>
          <div style={{ fontWeight: 700 }}>{year}년 {month}월 실적 데이터가 없습니다</div>
          <div style={{ fontSize: '0.82rem', marginTop: '0.5rem' }}>파일 업로드 또는 직접 입력으로 데이터를 먼저 등록하십시오.</div>
        </div>
      )}
    </div>
  )
}
