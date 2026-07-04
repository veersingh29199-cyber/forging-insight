'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  Download,
  ArrowRight,
  RefreshCw,
  Settings2,
  HelpCircle,
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { parseExcelBuffer, getTemplateData } from '@/lib/excel/parser'
import type { ParseResult, FileFormatType } from '@/lib/excel/parser'
import { commitExcelUpload } from '@/app/actions/excel-actions'
import { StepIndicator, type InternalUploadStep } from '@/components/common/StepIndicator'
import { StatusBadge } from '@/components/common/StatusBadge'
import { MappingRow } from '@/components/common/MappingRow'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState, LoadingState, ErrorState } from '@/components/common/UIState'
import { GlossaryModal } from '@/components/common/GlossaryModal'
import { getFieldLabel } from '@/constants/labels'

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
  isCommon?: boolean // 일상적으로 가장 자주 올리는 3대 양식 여부
}

const FILE_TYPES: FileTypeConfig[] = [
  {
    id: 'line_output_daily',
    label: '2026 생산량집계표 (일일 실적)',
    ext: ['.xlsx', '.xls'],
    roles: ['production_mgmt'],
    desc: '다중밴드 일일 크로스탭 (라인×재질, 3행헤더, kg/ton 자동환산)',
    targetTable: 'line_output_daily',
    requiredCols: ['work_date', 'line_code', 'output_ton', 'plan_ton'],
    isCommon: true,
  },
  {
    id: 'perf_records',
    label: '생산 실적 원장 (수주/호기별)',
    ext: ['.xlsx', '.xls'],
    roles: ['production_mgmt', 'forging_team', 'mes'],
    desc: 'P15/P5/P8/R9 단조반 수주 단위 상세 생산 실적 리스트',
    targetTable: 'production_records',
    requiredCols: ['work_date', 'order_no', 'product', 'order_weight_ton', 'charge_weight_ton', 'furnace', 'work_count'],
    isCommon: true,
  },
  {
    id: 'gas_daily_readings',
    label: '가스 자체검침 (일별 호기별)',
    ext: ['.xlsx', '.xls'],
    roles: ['measurement', 'maintenance'],
    desc: '가열로 호기별 일일 가스 사용 전/후 계량기 지침 기록',
    targetTable: 'gas_daily_readings',
    requiredCols: ['reading_date', 'furnace', 'reading_before', 'reading_after', 'gas_used'],
    isCommon: true,
  },
  {
    id: 'gas_monthly',
    label: '가스 월별 사용실적',
    ext: ['.xlsx', '.xls'],
    roles: ['measurement', 'production_mgmt'],
    desc: '월간 호기별 총 장입중량 및 가스 사용량 집계표',
    targetTable: 'gas_records',
    requiredCols: ['period', 'furnace', 'charge_weight_ton', 'gas_used'],
    isCommon: false,
  },
  {
    id: 'charge_correction',
    label: '투입중량 보정',
    ext: ['.xlsx', '.xls'],
    roles: ['production_mgmt', 'measurement'],
    desc: '부서/호기별 합계 (가스 원단위 분모 보정용)',
    targetTable: 'gas_records.charge_weight_ton',
    requiredCols: ['work_date', 'furnace', 'dept', 'charge_weight_ton'],
    isCommon: false,
  },
  {
    id: 'work_standards',
    label: '표준작업수 마스터',
    ext: ['.xlsx', '.xls'],
    roles: ['production_mgmt'],
    desc: '표A(투입중량구간) + 표B(R/M 제품중량·수주치수 기준)',
    targetTable: 'work_standards',
    requiredCols: ['dept', 'product', 'basis', 'std_work_count'],
    isCommon: false,
  },
  {
    id: 'targets',
    label: '연간/월간 생산 목표',
    ext: ['.xlsx', '.xls'],
    roles: ['production_mgmt'],
    desc: '부서·연도·지표별 목표 중량 및 수량 기준표',
    targetTable: 'targets',
    requiredCols: ['year', 'dept', 'target_weight_ton'],
    isCommon: false,
  },
  {
    id: 'raw_material_specs',
    label: '원소재 규격 (몰드표)',
    ext: ['.xlsx', '.xls'],
    roles: ['production_mgmt', 'forging_team'],
    desc: '제품·재질·원소재 규격 및 수입/포스코 마스터',
    targetTable: 'raw_material_specs',
    requiredCols: ['product', 'raw_material'],
    isCommon: false,
  },
  {
    id: 'mes_work_time',
    label: 'MES 작업시간 Export',
    ext: ['.xlsx', '.xls', '.csv'],
    roles: ['mes', 'production_mgmt'],
    desc: '제품 타입별 실제 가동 시간 (시간당 생산량 계산 보강용)',
    targetTable: 'production_records.work_hours',
    requiredCols: ['work_date', 'order_no', 'work_hours'],
    isCommon: false,
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
  
  // UX 고도화 상태
  const [showAllTypes, setShowAllTypes] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [skipMappingPrompt, setSkipMappingPrompt] = useState(false)

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
      setSkipMappingPrompt(false)

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
          setAutoDetectMsg(`🤖 파일명과 헤더를 분석하여 "${FILE_TYPES.find(f => f.id === result.recommendedFileType)?.label}" 양식으로 자동 감지되었습니다 (확신도: ${result.confidence}%).`)
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

        let exactMatchCount = 0
        typeConfig?.requiredCols.forEach((reqCol) => {
          if (savedMapping[reqCol] && headers.includes(savedMapping[reqCol])) {
            initialMapping[reqCol] = savedMapping[reqCol]
            exactMatchCount++
          } else {
            // 퍼지 유사도 매칭
            const match = headers.find((h) =>
              h.toLowerCase().includes(reqCol.replace(/_/g, ' ').toLowerCase()) ||
              reqCol.toLowerCase().includes(h.toLowerCase())
            )
            initialMapping[reqCol] = match || headers[0] || ''
          }
        })

        // 이전 매핑과 100% 일치하면 건너뛰기 안내 활성화
        if (typeConfig && exactMatchCount === typeConfig.requiredCols.length && exactMatchCount > 0) {
          setSkipMappingPrompt(true)
        }

        setPreview({ result, fileName: file.name, fileType: targetType, mapping: initialMapping })
        setStep('preview')
      } catch (err) {
        setError(err instanceof Error ? err.message : '엑셀 파일을 파싱하는 중 오류가 발생했습니다. 양식을 확인해 주세요.')
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
  // 커밋 실행 (ConfirmDialog 확정 시)
  // ─────────────────────────────────────────

  async function executeCommit() {
    if (!preview) return
    setConfirmOpen(false)
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
      setError(res.error || '데이터베이스 저장 중 오류가 발생했습니다.')
      setStep('preview')
    }
  }

  // 표시할 파일 양식 필터링 (기본 3대 양식 vs 전체 9개 양식)
  const displayedFileTypes = showAllTypes ? FILE_TYPES : FILE_TYPES.filter((f) => f.isCommon)

  // ─────────────────────────────────────────
  // 렌더
  // ─────────────────────────────────────────

  return (
    <div className="animate-in" style={{ paddingBottom: '4rem' }}>
      <div className="section-header">
        <div>
          <h1 className="section-title">현장 엑셀 통합 업로드 허브</h1>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            담당자 가공 0% — 원본 엑셀(크로스탭/다중행/오류셀) 자동 파싱·단위 정규화·검증
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <GlossaryModal />
          <a href="/upload/history" className="btn btn-outline" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
            📋 업로드 이력 및 롤백
          </a>
        </div>
      </div>

      {/* 3단계 통합 진행 표시기 */}
      <StepIndicator current={step as InternalUploadStep} />

      <div style={{ marginTop: '1.5rem' }}>
        {/* STEP 1 & 2: 파일 종류 선택 및 드롭존 */}
        {(step === 'select' || step === 'upload') && (
          <div className="animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-text)' }}>
                ① 업로드할 파일 양식 선택 <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>(또는 파일을 직접 드래그하면 자동 감지됩니다)</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAllTypes(!showAllTypes)}
                  className="btn btn-outline"
                  style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  {showAllTypes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {showAllTypes ? '기본 3대 양식만 보기' : '+ 나머지 6개 전문/설정 양식 펼쳐보기'}
                </button>
                {selectedType && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    onClick={() => setSelectedType('')}
                  >
                    <RefreshCw size={14} /> 선택 초기화
                  </button>
                )}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem',
              }}
            >
              {displayedFileTypes.map((ft) => {
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
                      position: 'relative',
                    }}
                  >
                    {ft.isCommon && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '12px',
                          background: 'var(--color-primary)',
                          color: '#fff',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                        }}
                      >
                        자주 쓰는 양식
                      </span>
                    )}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FileSpreadsheet size={20} color={isSelected ? 'var(--color-primary)' : '#10b981'} />
                          <span style={{ fontWeight: 800, fontSize: '0.98rem', color: isSelected ? 'var(--color-primary)' : 'var(--color-text)' }}>
                            {ft.label}
                          </span>
                        </div>
                        <button
                          type="button"
                          title="예시 엑셀 템플릿 다운로드"
                          onClick={(e) => downloadTemplate(ft.id, e)}
                          style={{
                            background: 'var(--color-surface-2)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '4px',
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            color: 'var(--color-text-dim)',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          <Download size={12} /> 양식 다운로드
                        </button>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.85rem', lineHeight: 1.5 }}>
                        {ft.desc}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '0.6rem', fontSize: '0.78rem', color: 'var(--color-text-dim)' }}>
                      <span>대상: {getFieldLabel(ft.targetTable.split('.')[0])}</span>
                      <span style={{ fontWeight: 700, color: 'var(--color-info)' }}>{ft.ext.join('/')}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* STEP 2: 파일 드롭 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-text)' }}>
                  ② {selectedType ? `[${FILE_TYPES.find(f => f.id === selectedType)?.label}] ` : ''}엑셀 파일 선택 또는 드래그
                </div>
              </div>

              {/* 중복 데이터 방지 안내 박스 */}
              <div
                style={{
                  background: 'rgba(59, 130, 246, 0.06)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1.25rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '0.85rem',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.5,
                }}
              >
                <ShieldCheck size={20} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                <div>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>중복 업로드 보호 기능 작동 중: </span>
                  동일한 작업 일자와 가열로 호기의 엑셀을 다시 올릴 경우, 시스템이 데이터 중복을 방지하기 위해 자동으로 기존 내역을 최신 내용으로 덮어쓰기(갱신)합니다.
                </div>
              </div>

              <div
                {...getRootProps()}
                className={`dropzone ${isDragActive ? 'active' : ''}`}
                style={{
                  padding: '3.5rem 2rem',
                  border: `2px dashed ${isDragActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  background: isDragActive ? 'rgba(59,130,246,0.06)' : 'var(--color-surface)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <input {...getInputProps()} />
                {uploading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <Loader2 size={52} color="var(--color-primary)" style={{ animation: 'spin 1s linear infinite' }} />
                    <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--color-text)' }}>10단계 지능형 파싱 엔진 작동 중...</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                      다중행 헤더 인식 · 크로스탭 언피벗 · kg/ton 단위 정규화 · #REF! 오류셀 0 처리 중
                    </div>
                  </div>
                ) : isDragActive ? (
                  <div>
                    <Upload size={52} color="var(--color-primary)" style={{ margin: '0 auto 1rem' }} />
                    <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--color-primary)' }}>파일을 여기에 놓으세요!</div>
                  </div>
                ) : (
                  <div>
                    <FileSpreadsheet size={60} color="var(--color-primary)" style={{ margin: '0 auto 1.25rem', opacity: 0.85 }} />
                    <div style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--color-text)' }}>
                      현장 엑셀 파일을 여기에 드래그하거나 클릭하여 선택하세요
                    </div>
                    <div style={{ fontSize: '0.92rem', color: 'var(--color-text-muted)', maxWidth: '540px', margin: '0 auto 1.25rem', lineHeight: 1.6 }}>
                      담당자가 서식을 변경하거나 가공하지 않은 <b>원본 엑셀 그대로</b> 업로드 가능합니다.<br />
                      (복잡한 표 언피벗, 다중행 헤더, kg↔ton 단위 환산 자동 지원)
                    </div>
                    {selectedType && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(59,130,246,0.15)', color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.88rem', padding: '0.4rem 1rem', borderRadius: '999px', border: '1px solid var(--color-primary)' }}>
                        <CheckCircle2 size={16} /> 선택된 양식: {FILE_TYPES.find((f) => f.id === selectedType)?.label}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {error && <ErrorState title="엑셀 파일 분석 오류" message={error} onRetry={() => setError(null)} retryLabel="오류 메시지 닫기" />}
            </div>
          </div>
        )}

        {/* STEP 3: 미리보기 및 검증 (2단 매핑 & 샘플 미리보기) */}
        {step === 'preview' && preview && (
          <ParsePreview
            preview={preview}
            autoDetectMsg={autoDetectMsg}
            skipMappingPrompt={skipMappingPrompt}
            onMappingChange={(newMap) => setPreview({ ...preview, mapping: newMap })}
            onBack={() => {
              setStep('upload')
              setPreview(null)
            }}
            onCommitRequest={() => setConfirmOpen(true)}
            onSkipCommit={() => setConfirmOpen(true)}
          />
        )}

        {/* STEP 4: 커밋 중 */}
        {step === 'commit' && (
          <LoadingState
            message="데이터베이스에 안전하게 저장 및 검증 중입니다..."
            subMessage="중복 레코드는 자동으로 최신 내역으로 갱신(Upsert)되며, 업로드 이력 번호가 함께 부여됩니다."
            size={56}
          />
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
              padding: '4.5rem 2rem',
              textAlign: 'center',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)', marginBottom: '0.5rem' }}>
              <CheckCircle2 size={56} />
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.6rem', color: 'var(--color-success)' }}>업로드 및 데이터 저장 완료!</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.98rem', maxWidth: '520px', lineHeight: 1.6 }}>
              모든 현장 데이터가 성공적으로 분석 데이터베이스에 반영되었습니다.<br />
              이제 대시보드와 각 공정별 분석 화면에서 즉시 최신 결과를 확인하실 수 있습니다.
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setStep('select')
                  setSelectedType('')
                  setPreview(null)
                }}
                style={{ padding: '0.7rem 1.5rem', fontWeight: 600 }}
              >
                <RefreshCw size={16} /> 추가 파일 올리기
              </button>
              <a href="/dashboard" className="btn btn-primary pulse-glow" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 2rem', fontSize: '1.05rem', fontWeight: 800 }}>
                📊 최신 분석 보러가기 <ArrowRight size={18} />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* 최종 확정 모달 */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="데이터베이스 저장 확정"
        variant="info"
        description={
          <div>
            <p style={{ margin: '0 0 0.75rem 0', fontWeight: 600, color: 'var(--color-text)' }}>
              검증이 완료된 데이터를 서버에 확정 저장합니다.
            </p>
            <div style={{ background: 'var(--color-surface-2)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-primary)', fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              • 업로드 파일: <b>{preview?.fileName}</b><br />
              • 대상 업무: <b>{FILE_TYPES.find(f => f.id === preview?.fileType)?.label}</b><br />
              • 추출 및 변환 행 수: <b style={{ color: 'var(--color-primary)' }}>{preview?.result.summary.extractedRowCount || preview?.result.sheets[0]?.rows.length || 0}건</b><br />
              <span style={{ color: 'var(--color-success)' }}>💡 작업 일자가 일치하는 기존 내역은 2배 부풀려짐 없이 안전하게 최신 값으로 덮어쓰기됩니다.</span>
            </div>
          </div>
        }
        confirmLabel="✓ 예, 확정 저장합니다"
        cancelLabel="취소하고 돌아가기"
        onConfirm={executeCommit}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}

// ─────────────────────────────────────────
// 미리보기 및 검증 컴포넌트 (2단 매핑 & 샘플 미리보기)
// ─────────────────────────────────────────

function ParsePreview({
  preview,
  autoDetectMsg,
  skipMappingPrompt,
  onMappingChange,
  onBack,
  onCommitRequest,
  onSkipCommit,
}: {
  preview: ParsedPreview
  autoDetectMsg: string | null
  skipMappingPrompt: boolean
  onMappingChange: (newMap: Record<string, string>) => void
  onBack: () => void
  onCommitRequest: () => void
  onSkipCommit: () => void
}) {
  const { result, fileName, fileType, mapping } = preview
  const sheet = result.sheets[0]
  const typeConfig = FILE_TYPES.find((f) => f.id === fileType)
  const headers = sheet?.headers[sheet?.headers.length - 1] || []

  // 고신뢰 매핑 항목 접기/펼치기 상태
  const [showAllMappings, setShowAllMappings] = useState(false)

  // 항목별 신뢰도 계산 및 분류
  const mappingRowsData = (typeConfig?.requiredCols || []).map((col) => {
    const currentHeader = mapping[col] || ''
    const headerIdx = headers.indexOf(currentHeader)
    const sampleValues = headerIdx >= 0 ? sheet?.rows.slice(0, 3).map((r) => r[headerIdx]?.value) : []

    // 신뢰도 판정
    let confidence: 'high' | 'medium' | 'low' = 'medium'
    if (!currentHeader) {
      confidence = 'low'
    } else if (
      currentHeader.toLowerCase().includes(col.replace(/_/g, ' ').toLowerCase()) ||
      col.toLowerCase().includes(currentHeader.toLowerCase()) ||
      currentHeader === col
    ) {
      confidence = 'high'
    }

    return { col, currentHeader, sampleValues, confidence }
  })

  const highConfidenceCount = mappingRowsData.filter((r) => r.confidence === 'high').length
  const needsAttentionCount = mappingRowsData.length - highConfidenceCount

  // 표시할 매핑 항목 필터링 (확인 필요 항목을 상단에, 고신뢰 항목은 옵션에 따라)
  const displayedMappings = showAllMappings
    ? mappingRowsData
    : mappingRowsData.filter((r) => r.confidence !== 'high' || needsAttentionCount === 0)

  return (
    <div className="animate-in">
      {/* 1. 이전 매핑 100% 일치 건너뛰기 안내 배너 */}
      {skipMappingPrompt && (
        <div
          className="animate-in"
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '2px solid var(--color-success)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <CheckCircle2 size={28} color="var(--color-success)" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-success)' }}>
                ✨ 이전과 100% 동일한 엑셀 양식입니다!
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                항목 연결이 완벽히 자동 일치합니다. 아래 검증을 생략하고 바로 저장하시겠습니까?
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onSkipCommit}
            className="btn btn-primary pulse-glow"
            style={{ padding: '0.65rem 1.5rem', fontWeight: 800, fontSize: '0.95rem', background: 'var(--color-success)' }}
          >
            ⚡ 건너뛰고 바로 저장
          </button>
        </div>
      )}

      {/* 자동 감지 알림 */}
      {autoDetectMsg && !skipMappingPrompt && (
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
          marginBottom: '1.75rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1.25rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>파일명 / 포맷</div>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-text)', marginTop: '0.2rem' }}>{fileName}</div>
          <div className="badge badge-info" style={{ marginTop: '0.35rem', fontSize: '0.75rem' }}>
            {typeConfig?.label || fileType}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>총 추출 데이터 행</div>
          <div style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--color-primary)', marginTop: '0.1rem' }}>
            {result.summary.totalRows.toLocaleString()}행
          </div>
          {result.summary.extractedRowCount > 0 && (
            <div style={{ fontSize: '0.78rem', color: 'var(--color-success)', fontWeight: 600 }}>
              (크로스탭 {result.summary.extractedRowCount}행 언피벗)
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>단위 정규화 (kg➔ton)</div>
          <div style={{ fontWeight: 700, fontSize: '1.15rem', color: result.summary.normalizedUnits > 0 ? 'var(--color-info)' : 'inherit', marginTop: '0.1rem' }}>
            {result.summary.normalizedUnits}건 자동 환산
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)' }}>
            {sheet?.unitDetectionReason || '기본 톤(ton) 유지'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>오류셀 / 날짜 교정</div>
          <div style={{ fontWeight: 700, fontSize: '1.15rem', color: result.summary.errorCells > 0 ? 'var(--color-accent)' : 'var(--color-success)', marginTop: '0.1rem' }}>
            오류 {result.summary.errorCells}개 (0 처리)
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)' }}>
            날짜 {result.summary.dateCorrections}건 교정됨
          </div>
        </div>
      </div>

      {/* 2. 엑셀 열 ↔ 앱 항목 2단 매핑 및 샘플 미리보기 */}
      {typeConfig && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text)' }}>
                <Settings2 size={20} color="var(--color-primary)" />
                ③ 엑셀 열과 앱 항목 연결 확인 <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>(실제 데이터 3개 미리보기 포함)</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                💡 수정 시 다음 업로드부터 이 매핑 규칙이 자동으로 기억되어 다시 확인하실 필요가 없습니다.
              </div>
            </div>

            {/* 고신뢰 항목 접기/펼치기 토글 */}
            {highConfidenceCount > 0 && needsAttentionCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllMappings(!showAllMappings)}
                className="btn btn-outline"
                style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {showAllMappings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {showAllMappings ? '확인 필요 항목만 보기' : `✓ 자동 연결된 항목 (${highConfidenceCount}개) 펼쳐보기`}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {displayedMappings.map((row) => (
              <MappingRow
                key={row.col}
                targetCol={row.col}
                currentHeader={row.currentHeader}
                availableHeaders={headers}
                sampleValues={row.sampleValues}
                confidence={row.confidence}
                isRequired={true}
                onChange={(newVal) => onMappingChange({ ...mapping, [row.col]: newVal })}
              />
            ))}
          </div>
        </div>
      )}

      {/* 3. 경고 및 검증 안내 (평문화 및 등급 분류) */}
      {result.warnings.length > 0 && (
        <div
          style={{
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.75rem',
          }}
        >
          <div style={{ fontWeight: 800, color: 'var(--color-accent)', marginBottom: '0.65rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} /> 🚨 데이터 정규화 및 검증 안내 ({result.warnings.length}건) — 확인 필요
          </div>
          <div style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginBottom: '0.85rem' }}>
            다음 항목들이 현장 엑셀 원본과 앱 기준 차이로 인해 자동 조정되었습니다. 적재에는 문제가 없으나 내역을 확인해 주세요.
          </div>
          <div style={{ maxHeight: '140px', overflowY: 'auto', fontSize: '0.88rem', color: 'var(--color-text)', display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'var(--color-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
            {result.warnings.map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', lineHeight: 1.5 }}>
                <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>•</span>
                <span>{w}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. 데이터 미리보기 테이블 (상위 10행) */}
      {sheet && sheet.rows.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text)' }}>
            <Eye size={20} color="var(--color-primary)" />
            파싱 및 변환 완료 데이터 미리보기 (상위 10행)
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
            <table className="data-table">
              <thead>
                {sheet.headers.map((headerRow, hi) => (
                  <tr key={hi}>
                    {headerRow.map((cell, ci) => (
                      <th key={ci} style={{ whiteSpace: 'nowrap', padding: '0.75rem 1rem' }}>{cell || '—'}</th>
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
                        style={{ whiteSpace: 'nowrap', padding: '0.65rem 1rem' }}
                      >
                        {cell.isError ? <span style={{ color: 'var(--color-danger)', fontWeight: 700 }}>0 (수식오류)</span> : String(cell.value ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sheet.rows.length > 10 && (
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginTop: '0.6rem', textAlign: 'right', fontWeight: 600 }}>
              ... 외 총 {sheet.rows.length - 10}행 정상 파싱 및 검증 완료
            </div>
          )}
        </div>
      )}

      {/* 5. 액션 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button type="button" className="btn btn-outline" onClick={onBack} style={{ padding: '0.7rem 1.5rem', fontWeight: 600 }}>
          ← 다른 파일 선택
        </button>
        <button
          type="button"
          className="btn btn-primary pulse-glow"
          onClick={onCommitRequest}
          style={{ padding: '0.75rem 2.25rem', fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          ✓ 검증 완료 및 데이터 확정 저장 <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}
