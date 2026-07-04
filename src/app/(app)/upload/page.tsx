'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Eye, Download, ArrowRight, RefreshCw, Settings2, HelpCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import { parseExcelBuffer, getTemplateData } from '@/lib/excel/parser'
import type { ParseResult, FileFormatType } from '@/lib/excel/parser'
import { commitExcelUpload } from '@/app/actions/excel-actions'

// ─────────────────────────────────────────
// 9개 파일 종류 정의 (Section 6-1)
// ─────────────────────────────────────────

interface FileTypeConfig {
  id: FileFormatType
  label: string
  ext: string[]
  roles: string[]
  desc: string
  targetTable: string
  requiredCols: string[]
}

const FILE_TYPES: FileTypeConfig[] = [
  {
    id: 'perf_records',
    label: '생산 실적 원장',
    ext: ['.xlsx', '.xls'],
    roles: ['production_mgmt', 'forging_team', 'mes'],
    desc: 'perf_P15/P5/P8/R9 — 수주 단위 행 리스트',
    targetTable: 'production_records',
    requiredCols: ['work_date', 'order_no', 'product', 'order_weight_ton', 'charge_weight_ton', 'furnace', 'work_count'],
  },
  {
    id: 'line_output_daily',
    label: '2026 생산량집계표',
    ext: ['.xlsx', '.xls'],
    roles: ['production_mgmt'],
    desc: '다중밴드 일일 크로스탭 (라인x재질, 3행헤더, kg/ton)',
    targetTable: 'line_output_daily',
    requiredCols: ['work_date', 'line_code', 'output_ton', 'plan_ton'],
  },
  {
    id: 'gas_monthly',
    label: '가스 월별 사용실적',
    ext: ['.xlsx', '.xls'],
    roles: ['measurement', 'production_mgmt'],
    desc: 'gas_monthly — 월·호기·장입중량·가스사용량',
    targetTable: 'gas_records',
    requiredCols: ['period', 'furnace', 'charge_weight_ton', 'gas_used'],
  },
  {
    id: 'gas_daily_readings',
    label: '자체검침 (일별)',
    ext: ['.xlsx', '.xls'],
    roles: ['measurement', 'maintenance'],
    desc: 'self_2023_new — 호기별 사용전/후 지침',
    targetTable: 'gas_daily_readings',
    requiredCols: ['reading_date', 'furnace', 'reading_before', 'reading_after', 'gas_used'],
  },
  {
    id: 'charge_correction',
    label: '투입중량 보정',
    ext: ['.xlsx', '.xls'],
    roles: ['production_mgmt', 'measurement'],
    desc: 'charge2 — 부서/호기 합계 (가스 원단위 분모 보정)',
    targetTable: 'gas_records.charge_weight_ton',
    requiredCols: ['work_date', 'furnace', 'dept', 'charge_weight_ton'],
  },
  {
    id: 'work_standards',
    label: '표준작업수 마스터',
    ext: ['.xlsx', '.xls'],
    roles: ['production_mgmt'],
    desc: '표A(투입중량구간)+표B(R/M 제품중량·수주치수)',
    targetTable: 'work_standards',
    requiredCols: ['dept', 'product', 'basis', 'std_work_count'],
  },
  {
    id: 'targets',
    label: '연간/월간 목표',
    ext: ['.xlsx', '.xls'],
    roles: ['production_mgmt'],
    desc: '부서·연도·지표·목표 (수량/중량)',
    targetTable: 'targets',
    requiredCols: ['year', 'dept', 'target_weight_ton'],
  },
  {
    id: 'raw_material_specs',
    label: '원소재 규격 (몰드표)',
    ext: ['.xlsx', '.xls'],
    roles: ['production_mgmt', 'forging_team'],
    desc: '제품·재질·원소재·규격 마스터',
    targetTable: 'raw_material_specs',
    requiredCols: ['product', 'raw_material'],
  },
  {
    id: 'mes_work_time',
    label: 'MES 작업시간 Export',
    ext: ['.xlsx', '.xls', '.csv'],
    roles: ['mes', 'production_mgmt'],
    desc: '제품 타입별 작업시간 (h/회 계산 보강용)',
    targetTable: 'production_records.work_hours',
    requiredCols: ['work_date', 'order_no', 'work_hours'],
  },
]

type UploadStep = 'select' | 'upload' | 'preview' | 'commit' | 'done'

interface ParsedPreview {
  result: ParseResult
  fileName: string
  fileType: FileFormatType
  mapping: Record<string, string>
}

export default function UploadPage() {
  const [step, setStep] = useState<UploadStep>('select')
  const [selectedType, setSelectedType] = useState<FileFormatType | ''>('')
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<ParsedPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [autoDetectMsg, setAutoDetectMsg] = useState<string | null>(null)

  // ─────────────────────────────────────────
  // 템플릿 다운로드 핸들러
  // ─────────────────────────────────────────

  const downloadTemplate = (fileType: FileFormatType, e: React.MouseEvent) => {
    e.stopPropagation()
    const { sheetName, aoa } = getTemplateData(fileType)
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, `태웅_${fileType}_템플릿.xlsx`)
  }

  // ─────────────────────────────────────────
  // 드롭존 및 자동 감지
  // ─────────────────────────────────────────

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      setUploading(true)
      setError(null)
      setAutoDetectMsg(null)

      try {
        const buffer = await file.arrayBuffer()
        const result = parseExcelBuffer(buffer)

        // 파일종류 미선택 시 자동 감지된 추천 타입 적용
        let targetType: FileFormatType = selectedType || result.recommendedFileType
        if (targetType === 'unknown' && FILE_TYPES.length > 0) {
          targetType = 'perf_records'
        }

        if (!selectedType && result.recommendedFileType !== 'unknown') {
          setSelectedType(result.recommendedFileType)
          setAutoDetectMsg(`🤖 파일명과 헤더를 분석하여 "${FILE_TYPES.find(f => f.id === result.recommendedFileType)?.label}" 포맷으로 자동 감지되었습니다 (확신도: ${result.confidence}%).`)
        }

        // 퍼지 컬럼 매핑 초기화 (이전 매핑 메모리 또는 헤더 유사도)
        const typeConfig = FILE_TYPES.find((f) => f.id === targetType)
        const initialMapping: Record<string, string> = {}
        const headers = result.sheets[0]?.headers[result.sheets[0]?.headers.length - 1] || []

        // localStorage에서 이전 매핑 로드 시도
        let savedMapping: Record<string, string> = {}
        try {
          if (typeof window !== 'undefined') {
            const raw = localStorage.getItem(`forging_mapping_${targetType}`)
            if (raw) savedMapping = JSON.parse(raw)
          }
        } catch (e) {
          console.error(e)
        }

        typeConfig?.requiredCols.forEach((reqCol) => {
          if (savedMapping[reqCol] && headers.includes(savedMapping[reqCol])) {
            initialMapping[reqCol] = savedMapping[reqCol]
          } else {
            // 퍼지 유사도 매칭
            const match = headers.find((h) =>
              h.toLowerCase().includes(reqCol.replace(/_/g, ' ').toLowerCase()) ||
              reqCol.toLowerCase().includes(h.toLowerCase())
            )
            initialMapping[reqCol] = match || headers[0] || ''
          }
        })

        setPreview({ result, fileName: file.name, fileType: targetType, mapping: initialMapping })
        setStep('preview')
      } catch (err) {
        setError(err instanceof Error ? err.message : '엑셀 파싱 중 오류가 발생했습니다.')
      } finally {
        setUploading(false)
      }
    },
    [selectedType]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    disabled: uploading,
  })

  // ─────────────────────────────────────────
  // 커밋 및 매핑 기억
  // ─────────────────────────────────────────

  async function handleCommit() {
    if (!preview) return
    setStep('commit')
    setError(null)

    // 매핑 규칙 기억
    try {
      if (typeof window !== 'undefined' && preview.fileType) {
        localStorage.setItem(`forging_mapping_${preview.fileType}`, JSON.stringify(preview.mapping))
      }
    } catch (e) {
      console.error(e)
    }

    // 파싱된 행 데이터를 매핑 규칙에 따라 객체 배열로 변환
    const sheet = preview.result.sheets[0]
    const headers = sheet.headers[sheet.headers.length - 1] || []
    const mappedRows = sheet.rows.map((row) => {
      const rawObj: Record<string, any> = {}
      headers.forEach((h, idx) => {
        rawObj[h] = row[idx]?.value
      })
      const mappedObj: Record<string, any> = {}
      Object.entries(preview.mapping).forEach(([targetCol, headerName]) => {
        mappedObj[targetCol] = rawObj[headerName]
      })
      return Object.assign({}, rawObj, mappedObj)
    })

    // 서버 액션 호출하여 실제 Supabase DB 적재
    const res = await commitExcelUpload({
      fileType: preview.fileType,
      fileName: preview.fileName,
      rowCount: preview.result.summary.extractedRowCount || sheet.rows.length,
      mapping: preview.mapping,
      mappedRows,
    })

    if (res.success) {
      setStep('done')
    } else {
      setError(res.error || 'DB 적재 중 오류가 발생했습니다.')
      setStep('preview')
    }
  }

  // ─────────────────────────────────────────
  // 렌더
  // ─────────────────────────────────────────

  return (
    <div className="animate-in">
      <div className="section-header">
        <div>
          <h1 className="section-title">현장 엑셀 통합 업로드 허브</h1>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            담당자 가공 0% — 원본 엑셀(크로스탭/다중행/오류셀) 자동 파싱·단위 정규화·검증
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <a href="/upload/history" className="btn btn-outline" style={{ textDecoration: 'none' }}>
            📋 업로드 이력 및 롤백
          </a>
        </div>
      </div>

      {/* 단계 표시기 */}
      <StepIndicator current={step} />

      <div style={{ marginTop: '2rem' }}>
        {/* STEP 1 & 2: 파일 종류 선택 및 드롭존 */}
        {(step === 'select' || step === 'upload') && (
          <div className="animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>① 업로드할 파일 종류 선택 (또는 직접 파일 드래그 시 자동 감지)</div>
              {selectedType && (
                <button
                  className="btn btn-outline"
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                  onClick={() => setSelectedType('')}
                >
                  <RefreshCw size={14} /> 선택 초기화
                </button>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem',
              }}
            >
              {FILE_TYPES.map((ft) => {
                const isSelected = selectedType === ft.id
                return (
                  <div
                    key={ft.id}
                    onClick={() => {
                      setSelectedType(ft.id)
                      setStep('upload')
                    }}
                    className="kpi-card"
                    style={{
                      textAlign: 'left',
                      cursor: 'pointer',
                      border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: isSelected ? 'rgba(59,130,246,0.08)' : 'var(--color-surface)',
                      transition: 'all 0.2s',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FileSpreadsheet size={18} color={isSelected ? 'var(--color-primary)' : '#10b981'} />
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isSelected ? 'var(--color-primary)' : 'inherit' }}>
                            {ft.label}
                          </span>
                        </div>
                        <button
                          title="예시 엑셀 템플릿 다운로드"
                          onClick={(e) => downloadTemplate(ft.id, e)}
                          style={{
                            background: 'var(--color-surface-2)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '4px',
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            color: 'var(--color-text-dim)',
                            cursor: 'pointer',
                          }}
                        >
                          <Download size={12} /> 템플릿
                        </button>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                        {ft.desc}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                      <span>대상: {ft.targetTable.split('.')[0]}</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-info)' }}>{ft.ext.join('/')}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* STEP 2: 파일 드롭 */}
            <div>
              <div style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '1rem' }}>
                ② {selectedType ? `[${FILE_TYPES.find(f => f.id === selectedType)?.label}] ` : ''}엑셀 파일 업로드
              </div>
              <div
                {...getRootProps()}
                className={`dropzone ${isDragActive ? 'active' : ''}`}
                style={{
                  padding: '3.5rem 2rem',
                  border: `2px dashed ${isDragActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  background: isDragActive ? 'rgba(59,130,246,0.05)' : 'var(--color-surface)',
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
              >
                <input {...getInputProps()} />
                {uploading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <Loader2 size={48} color="var(--color-primary)" style={{ animation: 'spin 1s linear infinite' }} />
                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>10단계 파싱 엔진 작동 중...</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      다중행 헤더 인식 · 단위(kg/ton) 환산 · #REF! 오류 정규화 중
                    </div>
                  </div>
                ) : isDragActive ? (
                  <div>
                    <Upload size={48} color="var(--color-primary)" style={{ margin: '0 auto 1rem' }} />
                    <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--color-primary)' }}>파일을 여기에 놓으세요!</div>
                  </div>
                ) : (
                  <div>
                    <FileSpreadsheet size={56} color="var(--color-primary)" style={{ margin: '0 auto 1.25rem', opacity: 0.8 }} />
                    <div style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.5rem' }}>
                      파일을 드래그하거나 클릭하여 선택하세요
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', maxWidth: '500px', margin: '0 auto 1rem' }}>
                      현장 실무자가 수정하지 않은 원본 엑셀 그대로 업로드 가능합니다.<br />
                      (크로스탭 언피벗, 다중행 헤더, kg/ton 단위 자동 파싱 지원)
                    </div>
                    {selectedType && (
                      <div className="badge badge-primary" style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}>
                        선택된 포맷: {FILE_TYPES.find((f) => f.id === selectedType)?.label}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid var(--color-danger)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: 'var(--color-danger)',
                    fontWeight: 600,
                  }}
                >
                  <AlertCircle size={20} />
                  {error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: 미리보기 및 검증 */}
        {step === 'preview' && preview && (
          <ParsePreview
            preview={preview}
            autoDetectMsg={autoDetectMsg}
            onMappingChange={(newMap) => setPreview({ ...preview, mapping: newMap })}
            onBack={() => {
              setStep('upload')
              setPreview(null)
            }}
            onCommit={handleCommit}
          />
        )}

        {/* STEP 4: 커밋 중 */}
        {step === 'commit' && (
          <div
            className="animate-in"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem',
              padding: '4rem 2rem',
              textAlign: 'center',
            }}
          >
            <Loader2 size={56} color="var(--color-primary)" style={{ animation: 'spin 1s linear infinite' }} />
            <div style={{ fontWeight: 700, fontSize: '1.3rem' }}>DB에 데이터 저장 및 검증 중...</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
              중복 레코드는 안전하게 갱신(Upsert)되며, source_upload_id가 이력에 기록됩니다.
            </div>
          </div>
        )}

        {/* STEP 5: 완료 */}
        {step === 'done' && (
          <div
            className="animate-in"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem',
              padding: '4rem 2rem',
              textAlign: 'center',
            }}
          >
            <CheckCircle2 size={72} color="var(--color-success)" />
            <div style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--color-success)' }}>업로드 및 데이터 정규화 완료!</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', maxWidth: '500px' }}>
              모든 데이터가 성공적으로 분석 데이터베이스에 반영되었습니다.<br />
              이제 대시보드와 분석 화면에서 즉시 최신 결과를 확인하실 수 있습니다.
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setStep('select')
                  setSelectedType('')
                  setPreview(null)
                }}
              >
                <RefreshCw size={16} /> 추가 파일 업로드
              </button>
              <a href="/dashboard" className="btn btn-primary pulse-glow" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                대시보드로 이동 <ArrowRight size={16} />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// 단계 표시기 컴포넌트
// ─────────────────────────────────────────

function StepIndicator({ current }: { current: UploadStep }) {
  const steps = [
    { id: 'select', label: '1. 종류 선택' },
    { id: 'upload', label: '2. 엑셀 업로드' },
    { id: 'preview', label: '3. 매핑·검증' },
    { id: 'commit', label: '4. DB 저장' },
    { id: 'done', label: '5. 완료' },
  ]
  const currentIdx = steps.findIndex((s) => s.id === current)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
      {steps.map((step, i) => {
        const done = i < currentIdx
        const active = i === currentIdx
        return (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.35rem 0.85rem',
                borderRadius: '999px',
                background: done
                  ? 'rgba(16,185,129,0.15)'
                  : active
                  ? 'rgba(59,130,246,0.15)'
                  : 'var(--color-surface-2)',
                fontSize: '0.8rem',
                fontWeight: active || done ? 700 : 500,
                color: done
                  ? 'var(--color-success)'
                  : active
                  ? 'var(--color-primary)'
                  : 'var(--color-text-dim)',
                border: active ? '1px solid var(--color-primary)' : '1px solid transparent',
              }}
            >
              {done ? '✓' : ''} {step.label}
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  width: 20,
                  height: 2,
                  background: i < currentIdx ? 'var(--color-success)' : 'var(--color-border)',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────
// 미리보기 및 검증 컴포넌트
// ─────────────────────────────────────────

function ParsePreview({
  preview,
  autoDetectMsg,
  onMappingChange,
  onBack,
  onCommit,
}: {
  preview: ParsedPreview
  autoDetectMsg: string | null
  onMappingChange: (newMap: Record<string, string>) => void
  onBack: () => void
  onCommit: () => void
}) {
  const { result, fileName, fileType, mapping } = preview
  const sheet = result.sheets[0]
  const typeConfig = FILE_TYPES.find((f) => f.id === fileType)
  const headers = sheet?.headers[sheet?.headers.length - 1] || []

  return (
    <div className="animate-in">
      {/* 자동 감지 알림 */}
      {autoDetectMsg && (
        <div
          style={{
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid var(--color-primary)',
            borderRadius: 'var(--radius-md)',
            padding: '0.875rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: 'var(--color-primary)',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          {autoDetectMsg}
        </div>
      )}

      {/* 파싱 요약 카드 */}
      <div
        style={{
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1.25rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>파일명 / 포맷</div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{fileName}</div>
          <div className="badge badge-info" style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>
            {typeConfig?.label || fileType}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>총 추출 데이터 행</div>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--color-primary)' }}>
            {result.summary.totalRows.toLocaleString()}행
          </div>
          {result.summary.extractedRowCount > 0 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>
              (크로스탭 {result.summary.extractedRowCount}행 언피벗)
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>단위 정규화 (kg→ton)</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: result.summary.normalizedUnits > 0 ? 'var(--color-info)' : 'inherit' }}>
            {result.summary.normalizedUnits}건 자동 환산
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
            {sheet?.unitDetectionReason || '기본 유지'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>오류셀 / 날짜 교정</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: result.summary.errorCells > 0 ? 'var(--color-accent)' : 'var(--color-success)' }}>
            오류 {result.summary.errorCells}개 (0 처리)
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
            날짜 {result.summary.dateCorrections}건 교정됨
          </div>
        </div>
      </div>

      {/* 컬럼 매핑 (퍼지 매칭 및 메모리 저장) */}
      {typeConfig && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings2 size={18} color="var(--color-primary)" />
              ③ 엑셀 컬럼 ↔ DB 필드 매핑 확인 (자동 유사도 매칭됨)
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              💡 수정 시 다음 업로드부터 이 매핑 규칙이 기억되어 자동 적용됩니다.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {typeConfig.requiredCols.map((col) => (
              <div key={col} style={{ background: 'var(--color-surface-2)', padding: '0.75rem', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--color-text)' }}>
                  대상 DB 필드: <span style={{ color: 'var(--color-primary)' }}>{col}</span>
                </div>
                <select
                  value={mapping[col] || ''}
                  onChange={(e) => onMappingChange({ ...mapping, [col]: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.4rem',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="">(선택 안 함 - 기본값)</option>
                  {headers.map((h, idx) => (
                    <option key={idx} value={h}>
                      [엑셀] {h || `열_${idx+1}`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 경고 및 검증 */}
      {result.warnings.length > 0 && (
        <div
          style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--color-accent)', marginBottom: '0.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AlertCircle size={18} /> 데이터 정규화 및 검증 알림 ({result.warnings.length}건)
          </div>
          <div style={{ maxHeight: '120px', overflowY: 'auto', fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {result.warnings.map((w, i) => (
              <div key={i}>• {w}</div>
            ))}
          </div>
        </div>
      )}

      {/* 데이터 미리보기 테이블 */}
      {sheet && sheet.rows.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Eye size={18} />
            파싱 및 변환 완료 데이터 미리보기 (상위 10행)
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            <table className="data-table">
              <thead>
                {sheet.headers.map((headerRow, hi) => (
                  <tr key={hi}>
                    {headerRow.map((cell, ci) => (
                      <th key={ci}>{cell || '—'}</th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {sheet.rows.slice(0, 10).map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={cell.isError ? 'cell-error' : ''}
                      >
                        {cell.isError ? '0 (수식오류)' : String(cell.value ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sheet.rows.length > 10 && (
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginTop: '0.5rem', textAlign: 'right' }}>
              ... 외 총 {sheet.rows.length - 10}행 정상 파싱됨
            </div>
          )}
        </div>
      )}

      {/* 액션 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
        <button className="btn btn-outline" onClick={onBack}>
          ← 다른 파일 선택
        </button>
        <button className="btn btn-primary pulse-glow" onClick={onCommit} style={{ padding: '0.75rem 2rem', fontSize: '1rem', fontWeight: 700 }}>
          ✓ 검증 완료 및 데이터 확정 저장
        </button>
      </div>
    </div>
  )
}
