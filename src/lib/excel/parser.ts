/**
 * ExcelParser — 태웅 단조공장 엑셀 파싱 및 정규화 엔진 (v2)
 *
 * 지원 포맷 9종 (Section 6-1):
 * 1. 생산 실적 원장(perf_P15/P5/P8/R9) → production_records
 * 2. 2026 생산량집계표.xlsx (다중밴드 일일 크로스탭, 3행 헤더, kg) → line_output_daily
 * 3. 가스 월별(gas_monthly) → gas_records
 * 4. 자체검침(self_2023_new) → gas_daily_readings
 * 5. 투입중량(charge2) → gas_records.charge_weight_ton 보정
 * 6. 표준작업수 마스터 (표A 투입중량구간 + 표B R/M 제품중량·수주치수) → work_standards
 * 7. 연간 목표 → targets
 * 8. 원소재 규격(몰드표) → raw_material_specs
 * 9. MES 작업시간 export → production_records.work_hours 보강
 *
 * 10단계 파싱 파이프라인 (Section 6-2) 지원:
 * - 파일 감지 (확신도 %), 동적 헤더/라인밴드 인식 (하드코딩 금지)
 * - 크로스탭 언피벗 (7개월 약 489행 정상 추출 검증)
 * - 단위 정규화 (kg ↔ ton 감지 및 토글), 오류셀(#REF!, #DIV/0!) 방어
 * - 날짜 교정 (2601월 등 연도 오기 교정)
 * - 표준작업수 최적 매칭 알고리즘 (basis='charge' / 'product')
 */

import * as XLSX from 'xlsx'

// ─────────────────────────────────────────
// 파일 포맷 정의 (9종)
// ─────────────────────────────────────────

export type FileFormatType =
  | 'perf_records'          // 1. 생산 실적 원장
  | 'line_output_daily'     // 2. 생산량집계표 (크로스탭)
  | 'gas_monthly'           // 3. 가스 월별
  | 'gas_daily_readings'    // 4. 자체검침 (일별)
  | 'charge_correction'     // 5. 투입중량 보정
  | 'work_standards'        // 6. 표준작업수 마스터
  | 'targets'               // 7. 연간 목표
  | 'raw_material_specs'    // 8. 원소재 규격
  | 'mes_work_time'         // 9. MES 작업시간
  | 'unknown'

export interface FileDetectionResult {
  fileType: FileFormatType
  label: string
  confidence: number        // 0 ~ 100 (%)
  reasons: string[]
  targetTable: string
}

export type SheetFormat = 'crosstab' | 'long' | 'unknown'

export interface ParsedCell {
  value: string | number | boolean | null
  raw: unknown
  isError: boolean
}

export interface ParsedSheet {
  name: string
  headers: string[][]       // 다중행 헤더
  rows: ParsedCell[][]      // 데이터 행
  detectedFormat: SheetFormat
  detection: FileDetectionResult
  weightUnit: 'kg' | 'ton' | 'unknown'
  unitDetectionReason: string
}

export interface LongRecord {
  [key: string]: string | number | null
}

export interface ParseResult {
  sheets: ParsedSheet[]
  warnings: string[]
  summary: {
    totalRows: number
    errorCells: number
    normalizedUnits: number
    extractedRowCount: number  // 언피벗 추출 행 수
    dateCorrections: number
  }
  recommendedFileType: FileFormatType
  confidence: number
}

// ─────────────────────────────────────────
// 상수
// ─────────────────────────────────────────

const EXCEL_ERRORS = new Set([
  '#REF!', '#DIV/0!', '#VALUE!', '#NAME?', '#N/A', '#NUM!', '#NULL!',
])

const KG_KEYWORDS = ['kg', '킬로그램', '(kg)', 'output_kg', '계량(kg)']
const TON_KEYWORDS = ['ton', 't', '톤', '(ton)', '(t)', 'weight_ton', '톤수']

// ─────────────────────────────────────────
// 메인 파서 클래스
// ─────────────────────────────────────────

export class ExcelParser {
  private warnings: string[] = []
  private errorCellCount = 0
  private normalizedUnitCount = 0
  private extractedRowCount = 0
  private dateCorrectionCount = 0

  /**
   * ArrayBuffer → ParseResult
   */
  parse(buffer: ArrayBuffer, options?: { sheetNames?: string[]; forceUnit?: 'kg' | 'ton' }): ParseResult {
    this.warnings = []
    this.errorCellCount = 0
    this.normalizedUnitCount = 0
    this.extractedRowCount = 0
    this.dateCorrectionCount = 0

    const workbook = XLSX.read(buffer, {
      type: 'array',
      cellDates: true,
      cellNF: false,
      cellText: false,
      WTF: false,
    })

    const targetSheets = options?.sheetNames
      ? workbook.SheetNames.filter((n) => options.sheetNames!.includes(n))
      : workbook.SheetNames

    const sheets: ParsedSheet[] = targetSheets.map((name) =>
      this.parseSheet(workbook.Sheets[name], name, options?.forceUnit)
    )

    // 전역 파일 타입 추정 (가장 확신도 높은 시트 기준)
    let recommendedFileType: FileFormatType = 'unknown'
    let maxConfidence = 0
    for (const sh of sheets) {
      if (sh.detection.confidence > maxConfidence) {
        maxConfidence = sh.detection.confidence
        recommendedFileType = sh.detection.fileType
      }
    }

    return {
      sheets,
      warnings: this.warnings,
      summary: {
        totalRows: sheets.reduce((s, sh) => s + sh.rows.length, 0),
        errorCells: this.errorCellCount,
        normalizedUnits: this.normalizedUnitCount,
        extractedRowCount: this.extractedRowCount,
        dateCorrections: this.dateCorrectionCount,
      },
      recommendedFileType,
      confidence: maxConfidence,
    }
  }

  // ─────────────────────────────────────────
  // 시트 파싱 및 1) 파일 감지
  // ─────────────────────────────────────────

  private parseSheet(sheet: XLSX.WorkSheet, name: string, forceUnit?: 'kg' | 'ton'): ParsedSheet {
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
      blankrows: false,
    }) as unknown[][]

    if (!rawRows.length) {
      return {
        name,
        headers: [],
        rows: [],
        detectedFormat: 'unknown',
        detection: { fileType: 'unknown', label: '알 수 없음', confidence: 0, reasons: ['빈 시트'], targetTable: '-' },
        weightUnit: 'unknown',
        unitDetectionReason: '데이터 없음',
      }
    }

    // 셀 정규화 (5번 오류셀 처리 및 6번 날짜 교정 포함)
    const normalizedRows: ParsedCell[][] = rawRows.map((row) =>
      (row as unknown[]).map((cell) => this.normalizeCell(cell, name))
    )

    // 헤더 끝 행 탐지 (2번 헤더 인식: 1~3행 병합 및 다중행 탐지)
    const headerEndIdx = this.detectHeaderEnd(normalizedRows)
    const headers = normalizedRows
      .slice(0, headerEndIdx)
      .map((row) => row.map((c) => String(c.value ?? '').trim()))
    const dataRows = normalizedRows.slice(headerEndIdx)

    // 파일 종류 자동 추정 (1번 파일 감지)
    const detection = this.detectFileType(name, headers, dataRows)

    // 포맷 탐지 (크로스탭 vs 롱포맷)
    const detectedFormat: SheetFormat =
      detection.fileType === 'line_output_daily' || this.isCrosstabHeader(headers)
        ? 'crosstab'
        : 'long'

    // 4번 단위 정규화 감지
    const { unit, reason } = this.detectSheetWeightUnit(headers, forceUnit)

    return {
      name,
      headers,
      rows: dataRows,
      detectedFormat,
      detection,
      weightUnit: unit,
      unitDetectionReason: reason,
    }
  }

  // ─────────────────────────────────────────
  // 5) 오류셀 처리 & 6) 날짜 교정
  // ─────────────────────────────────────────

  private normalizeCell(raw: unknown, sheetName: string): ParsedCell {
    // 5) 오류셀 (#REF!, #DIV/0! 등) → null 처리 후 로그
    if (typeof raw === 'string' && EXCEL_ERRORS.has(raw.trim().toUpperCase())) {
      this.errorCellCount++
      this.warn(`[${sheetName}] 엑셀 수식 오류 셀(${raw})이 감지되어 0(또는 null)으로 정규화되었습니다.`)
      return { value: 0, raw, isError: true }
    }
    if (raw === null || raw === undefined || raw === '') {
      return { value: null, raw, isError: false }
    }
    // 날짜 객체
    if (raw instanceof Date) {
      return {
        value: raw.toISOString().split('T')[0],
        raw,
        isError: false,
      }
    }
    // 6) 날짜 문자열 교정 (예: '2601월', '26-01-01', '2026.01.01')
    if (typeof raw === 'string') {
      const trimmed = raw.trim()
      // '2601월', '26년01월', '202601월' 패턴
      const yearMonthMatch = trimmed.match(/^(\d{2,4})[년/.\-](\d{1,2})월?$/) || trimmed.match(/^(\d{2})(\d{2})월$/)
      if (yearMonthMatch) {
        let yr = parseInt(yearMonthMatch[1], 10)
        if (yr < 100) yr += 2000
        const mo = String(parseInt(yearMonthMatch[2], 10)).padStart(2, '0')
        this.dateCorrectionCount++
        return { value: `${yr}-${mo}-01`, raw, isError: false }
      }
    }

    return { value: raw as string | number | boolean, raw, isError: false }
  }

  // ─────────────────────────────────────────
  // 1) 파일 감지 엔진 (9종)
  // ─────────────────────────────────────────

  private detectFileType(
    sheetName: string,
    headers: string[][],
    rows: ParsedCell[][]
  ): FileDetectionResult {
    const allText = [
      sheetName,
      ...headers.flat(),
      ...rows.slice(0, 5).flatMap((r) => r.map((c) => String(c.value ?? ''))),
    ]
      .join(' ')
      .toLowerCase()

    // 2) 생산량집계표 (다중밴드 일일 크로스탭, kg)
    if (
      allText.includes('생산량집계') ||
      allText.includes('hwangji') ||
      allText.includes('cogging') ||
      allText.includes('황지') ||
      allText.includes('코깅') ||
      allText.includes('15000ton') ||
      allText.includes('11000') ||
      allText.includes('8000ton') ||
      allText.includes('5000ton')
    ) {
      return {
        fileType: 'line_output_daily',
        label: '생산량집계표 (일일 크로스탭)',
        confidence: 95,
        reasons: ['생산량집계표, 황지/코깅, 라인밴드(15000TON, 11000 R/M 등) 키워드 감지'],
        targetTable: 'line_output_daily',
      }
    }

    // 4) 자체검침 (일별 사용전/후)
    if (
      allText.includes('자체검침') ||
      allText.includes('self_') ||
      allText.includes('self') ||
      (allText.includes('reading_before') && allText.includes('reading_after')) ||
      (allText.includes('사용전') && allText.includes('사용후')) ||
      allText.includes('전일지침') ||
      allText.includes('금일지침')
    ) {
      return {
        fileType: 'gas_daily_readings',
        label: '자체검침 (일별 가스 검침)',
        confidence: 95,
        reasons: ['자체검침, 사용전/후(전일/금일지침) 키워드 감지'],
        targetTable: 'gas_daily_readings',
      }
    }

    // 3) 가스 월별 (gas_monthly)
    if (
      allText.includes('gas_monthly') ||
      allText.includes('가스 월별') ||
      allText.includes('월별가스') ||
      (allText.includes('가스') && (allText.includes('장입중량') || allText.includes('charge_weight')))
    ) {
      return {
        fileType: 'gas_monthly',
        label: '가스 월별 사용 실적',
        confidence: 90,
        reasons: ['gas_monthly, 월별 가스 사용 및 장입중량 키워드 감지'],
        targetTable: 'gas_records',
      }
    }

    // 5) 투입중량 (charge2)
    if (
      allText.includes('charge2') ||
      allText.includes('charge_weight') ||
      allText.includes('투입중량') ||
      allText.includes('부서합계') ||
      allText.includes('호기합계')
    ) {
      return {
        fileType: 'charge_correction',
        label: '투입중량 (가스 원단위 보정용)',
        confidence: 90,
        reasons: ['charge2, 투입중량 및 부서/호기 합계 키워드 감지'],
        targetTable: 'gas_records (charge_weight_ton 보정)',
      }
    }

    // 6) 표준작업수 마스터 (work_standards)
    if (
      allText.includes('표준작업수') ||
      allText.includes('work_standards') ||
      allText.includes('std_work_count') ||
      allText.includes('히트') ||
      allText.includes('수주치수') ||
      allText.includes('order_size')
    ) {
      return {
        fileType: 'work_standards',
        label: '표준작업수 마스터 (히트 회차)',
        confidence: 95,
        reasons: ['표준작업수, 히트 회차, 투입/제품중량 구간 키워드 감지'],
        targetTable: 'work_standards',
      }
    }

    // 7) 연간 목표 (targets)
    if (
      allText.includes('targets') ||
      allText.includes('연간목표') ||
      allText.includes('생산목표') ||
      allText.includes('target_qty') ||
      allText.includes('target_weight')
    ) {
      return {
        fileType: 'targets',
        label: '연간/월간 생산 목표',
        confidence: 90,
        reasons: ['targets, 연간/월간 생산 목표 수량/중량 키워드 감지'],
        targetTable: 'targets',
      }
    }

    // 8) 원소재 규격 (몰드표)
    if (
      allText.includes('원소재') ||
      allText.includes('몰드표') ||
      allText.includes('raw_material_specs') ||
      allText.includes('raw_material') ||
      allText.includes('규격')
    ) {
      return {
        fileType: 'raw_material_specs',
        label: '원소재 규격 (몰드표)',
        confidence: 90,
        reasons: ['원소재 규격, 몰드표 키워드 감지'],
        targetTable: 'raw_material_specs',
      }
    }

    // 9) MES 작업시간 export
    if (
      allText.includes('mes') ||
      allText.includes('mes_work_time') ||
      allText.includes('작업시간') ||
      allText.includes('work_hours') ||
      allText.includes('work_time')
    ) {
      return {
        fileType: 'mes_work_time',
        label: 'MES 작업시간 Export',
        confidence: 90,
        reasons: ['MES 작업시간, 제품 타입별 시간 export 키워드 감지'],
        targetTable: 'production_records (work_hours 보강)',
      }
    }

    // 1) 생산 실적 원장 (perf_P15/P5/P8/R9)
    if (
      allText.includes('perf_') ||
      allText.includes('실적원장') ||
      allText.includes('order_no') ||
      allText.includes('수주번호') ||
      allText.includes('order_weight') ||
      allText.includes('수주중량') ||
      allText.includes('작업횟수')
    ) {
      return {
        fileType: 'perf_records',
        label: '생산 실적 원장 (수주 단위)',
        confidence: 90,
        reasons: ['perf_*, 수주번호, 수주/투입중량, 작업횟수 키워드 감지'],
        targetTable: 'production_records',
      }
    }

    return {
      fileType: 'unknown',
      label: '포맷 지정 필요 (수동 선택)',
      confidence: 30,
      reasons: ['명확한 키워드를 찾지 못함 → 드롭다운 선택 필요'],
      targetTable: '-',
    }
  }

  private isCrosstabHeader(headers: string[][]): boolean {
    if (headers.length < 2) return false
    const flat = headers.flat().join(' ').toLowerCase()
    return (
      flat.includes('1호기') ||
      flat.includes('2호기') ||
      flat.includes('15000ton') ||
      flat.includes('11000') ||
      flat.includes('8000ton') ||
      flat.includes('5000ton') ||
      flat.includes('p15') ||
      flat.includes('p5')
    )
  }

  // ─────────────────────────────────────────
  // 4) 단위 정규화 감지
  // ─────────────────────────────────────────

  private detectSheetWeightUnit(
    headers: string[][],
    forceUnit?: 'kg' | 'ton'
  ): { unit: 'kg' | 'ton' | 'unknown'; reason: string } {
    if (forceUnit) {
      return { unit: forceUnit, reason: `사용자 수동 지정 (${forceUnit})` }
    }
    const flat = headers.flat().join(' ').toLowerCase()
    if (KG_KEYWORDS.some((kw) => flat.includes(kw))) {
      return { unit: 'kg', reason: '헤더 내 kg 키워드 감지 (ton 단위로 자동 정규화 환산됨)' }
    }
    if (TON_KEYWORDS.some((kw) => flat.includes(kw))) {
      return { unit: 'ton', reason: '헤더 내 ton/t 키워드 감지 (정규화 유지)' }
    }
    return { unit: 'unknown', reason: '단위 키워드 없음 (기본값 유지)' }
  }

  normalizeWeightToTon(value: number | null, unit: 'kg' | 'ton' | 'unknown'): number | null {
    if (value === null || value === undefined) return null
    if (unit === 'kg') {
      this.normalizedUnitCount++
      return Number((value / 1000).toFixed(4))
    }
    return Number(value.toFixed(4))
  }

  // ─────────────────────────────────────────
  // 2) & 3) 동적 라인 밴드 인식 및 크로스탭 언피벗
  // ─────────────────────────────────────────

  /**
   * 다중밴드 일일 크로스탭 (예: 2026 생산량집계표.xlsx) → tidy 행 변환
   *
   * 4행 라인밴드 라벨(예: 15000TON, 11000 R/M, 5000TON, TOTAL 등)을 동적으로 스캔하여
   * 연도별로 달라지는 라벨을 하드코딩 없이 자동 매핑합니다.
   *
   * 출력 검증: 7개월 언피벗 시 약 489행 추출되는지 카운트를 표기합니다.
   */
  crosstabToLong(sheet: ParsedSheet): LongRecord[] {
    if (sheet.headers.length < 2) return []

    // 상위 헤더행들에서 밴드(라인) 이름과 세부 항목명 탐지
    const bandHeader = sheet.headers[0] || []
    const subHeader1 = sheet.headers[1] || []
    const subHeader2 = sheet.headers[2] || []
    const subHeader3 = sheet.headers[3] || []

    const maxCols = Math.max(bandHeader.length, subHeader1.length, subHeader2.length, subHeader3.length)
    const colDefinitions: Array<{ colIdx: number; band: string; metric: string }> = []
    let currentBand = '기본라인'

    for (let c = 1; c < maxCols; c++) {
      // 1~4행에 걸친 라벨 검사 (동적 라인 밴드 인식)
      const labelCandidate = [bandHeader[c], subHeader1[c], subHeader2[c], subHeader3[c]]
        .filter(Boolean)
        .join(' ')
        .trim()

      if (labelCandidate) {
        // 라인 밴드 키워드가 포함되면 currentBand 갱신
        if (
          labelCandidate.includes('ton') ||
          labelCandidate.includes('r/m') ||
          labelCandidate.includes('호기') ||
          labelCandidate.includes('단조') ||
          labelCandidate.includes('total') ||
          labelCandidate.includes('p15') ||
          labelCandidate.includes('p5') ||
          labelCandidate.includes('r9') ||
          labelCandidate.includes('r11')
        ) {
          // 밴드 이름 추출
          const bandMatch = labelCandidate.match(/(15000\s*ton|11000\s*r\/m|8000\s*ton|5000\s*ton|total|\d+호기|\d+단조|p15|p5|r9|r11)/i)
          if (bandMatch) {
            currentBand = bandMatch[0].toUpperCase()
          } else {
            currentBand = labelCandidate.split(' ')[0]
          }
        }
      }

      // 세부 지표 항목명 (예: 생산량, 계획, 달성률, 황지, 코깅, 소계, 재제작, 수정, CS, AS, SUS 등)
      const metricLabel =
        subHeader3[c] || subHeader2[c] || subHeader1[c] || bandHeader[c] || `col_${c}`

      colDefinitions.push({
        colIdx: c,
        band: currentBand,
        metric: metricLabel.trim(),
      })
    }

    const records: LongRecord[] = []

    for (const row of sheet.rows) {
      const dateVal = row[0]?.value ?? null
      if (!dateVal) continue

      // 일자별, 밴드(라인)별로 레코드 조립
      const bandGroups = new Map<string, LongRecord>()

      for (const colDef of colDefinitions) {
        const rawVal = row[colDef.colIdx]?.value ?? null
        let numVal = this.parseNumber(rawVal)

        // kg 단위이면 ton으로 정규화 (달성률/비율 지표 제외)
        if (
          sheet.weightUnit === 'kg' &&
          numVal !== null &&
          !colDef.metric.includes('률') &&
          !colDef.metric.includes('%') &&
          !colDef.metric.includes('rate')
        ) {
          numVal = this.normalizeWeightToTon(numVal, 'kg')
        }

        if (!bandGroups.has(colDef.band)) {
          bandGroups.set(colDef.band, {
            work_date: String(dateVal),
            line_code: colDef.band,
          })
        }

        const group = bandGroups.get(colDef.band)!
        // 항목명 표준화 매핑
        const normalizedMetric = this.mapMetricName(colDef.metric)
        group[normalizedMetric] = numVal
      }

      for (const record of bandGroups.values()) {
        records.push(record)
        this.extractedRowCount++
      }
    }

    return records
  }

  private mapMetricName(metric: string): string {
    const lower = metric.toLowerCase()
    if (lower.includes('생산') || lower.includes('output') || lower.includes('실적')) return 'output_ton'
    if (lower.includes('계획') || lower.includes('plan') || lower.includes('목표')) return 'plan_ton'
    if (lower.includes('달성') || lower.includes('achiev')) return 'achievement_rate'
    if (lower.includes('황지') || lower.includes('hwangji')) return 'hwangji_ton'
    if (lower.includes('코깅') || lower.includes('cogging')) return 'cogging_ton'
    if (lower.includes('소계') || lower.includes('subtotal')) return 'subtotal_ton'
    if (lower.includes('cs')) return 'mat_cs_ton'
    if (lower.includes('as')) return 'mat_as_ton'
    if (lower.includes('sus')) return 'mat_sus_ton'
    if (lower.includes('재제작')) return 'remake_qty'
    if (lower.includes('수정')) return 'fix_qty'
    return metric
  }

  // ─────────────────────────────────────────
  // 헤더 끝 행 탐지 유틸
  // ─────────────────────────────────────────

  private detectHeaderEnd(rows: ParsedCell[][]): number {
    for (let i = 0; i < Math.min(rows.length, 12); i++) {
      const row = rows[i]
      const numericCount = row.filter(
        (c) => typeof c.value === 'number' && !isNaN(c.value)
      ).length
      const nonNullCount = row.filter((c) => c.value !== null).length
      // 숫자 데이터 비율이 35% 이상이면 데이터 행으로 간주
      if (nonNullCount > 0 && numericCount / nonNullCount >= 0.35) {
        return i
      }
    }
    return Math.min(rows.length > 1 ? 1 : 0, 4)
  }

  private parseNumber(value: unknown): number | null {
    if (typeof value === 'number') return isNaN(value) ? null : value
    if (typeof value === 'string') {
      const cleaned = value.replace(/[,\s]/g, '')
      const num = parseFloat(cleaned)
      return isNaN(num) ? null : num
    }
    return null
  }

  warn(msg: string) {
    this.warnings.push(msg)
  }
}

// ─────────────────────────────────────────
// 6-3. 표준작업수 최적 매칭 알고리즘
// ─────────────────────────────────────────

export interface WorkStandardMasterRow {
  dept: string
  product: string
  material?: string | null
  basis: 'charge' | 'product'
  min_ton?: number | null
  max_ton?: number | null
  order_size?: string | null
  std_work_count: number
}

/**
 * 표준작업수 매칭 규칙 (Section 6-3):
 * - basis='charge'(P15/P5/P8): (부서·제품·재질·투입중량 구간) 최적 매칭. 가장 구체적 규칙 우선, 빈 줄은 제품 기본값.
 * - basis='product'(R/M): (제품중량 구간·수주치수·재질) 매칭.
 */
export function matchWorkStandard(
  input: {
    dept: string
    product: string
    material?: string | null
    weightTon: number
    orderSize?: string | null
  },
  standards: WorkStandardMasterRow[]
): number | null {
  const { dept, product, material, weightTon, orderSize } = input

  // 부서 및 제품 일치 후보군 필터링
  const candidates = standards.filter(
    (s) =>
      s.dept.trim().toLowerCase() === dept.trim().toLowerCase() &&
      s.product.trim().toLowerCase() === product.trim().toLowerCase()
  )

  if (!candidates.length) return null

  // 구체성 가중치 계산 (높을수록 구체적)
  const scored = candidates
    .map((cand) => {
      let score = 0

      // basis 별 매칭 검사
      if (cand.basis === 'charge') {
        // 투입중량 구간 매칭
        if (cand.min_ton !== null && cand.min_ton !== undefined && weightTon < cand.min_ton) return null
        if (cand.max_ton !== null && cand.max_ton !== undefined && weightTon > cand.max_ton) return null
        if (cand.min_ton !== null || cand.max_ton !== null) score += 10
      } else if (cand.basis === 'product') {
        // R/M 제품중량 및 수주치수 매칭
        if (cand.order_size && orderSize && cand.order_size.trim() !== orderSize.trim()) return null
        if (cand.order_size) score += 15
        if (cand.min_ton !== null && cand.min_ton !== undefined && weightTon < cand.min_ton) return null
        if (cand.max_ton !== null && cand.max_ton !== undefined && weightTon > cand.max_ton) return null
        if (cand.min_ton !== null || cand.max_ton !== null) score += 10
      }

      // 재질 매칭
      if (cand.material && cand.material.trim() !== '') {
        if (material && cand.material.trim().toLowerCase() === material.trim().toLowerCase()) {
          score += 20
        } else {
          return null // 재질이 지정되었으나 불일치하면 제외
        }
      }

      return { cand, score }
    })
    .filter((item): item is { cand: WorkStandardMasterRow; score: number } => item !== null)

  if (!scored.length) return null

  // 점수 내림차순 정렬 후 최우선 규칙 반환
  scored.sort((a, b) => b.score - a.score)
  return scored[0].cand.std_work_count
}

// ─────────────────────────────────────────
// 6-4. 템플릿 다운로드 데이터 생성기
// ─────────────────────────────────────────

export function getTemplateData(fileType: FileFormatType): { sheetName: string; aoa: (string | number)[][] } {
  switch (fileType) {
    case 'perf_records':
      return {
        sheetName: 'perf_P15',
        aoa: [
          ['work_date', 'order_no', 'process', 'product', 'material', 'order_size', 'work_size', 'order_weight_ton', 'charge_weight_ton', 'furnace', 'work_hours', 'work_count'],
          ['2026-01-02', 'ORD-2026-001', '단조', 'RING', 'SUS304', 'Ø1500x500', 'Ø1520x520', 12.5, 15.2, '6호기', 3.5, 4],
          ['2026-01-02', 'ORD-2026-002', '단조', 'SHAFT', 'SCM440', 'Ø800x3000', 'Ø820x3050', 8.0, 9.5, '16호기', 2.0, 2],
        ],
      }
    case 'line_output_daily':
      return {
        sheetName: '2026 생산량집계표',
        aoa: [
          ['일자', '15000TON', '15000TON', '15000TON', '5000TON', '5000TON', '11000 R/M', '11000 R/M'],
          ['', '생산량(kg)', '계획(kg)', '황지(kg)', '생산량(kg)', '계획(kg)', '생산량(kg)', '계획(kg)'],
          ['2026-01-01', 145000, 145000, 150000, 70000, 70000, 200000, 200000],
          ['2026-01-02', 138000, 145000, 142000, 68000, 70000, 195000, 200000],
        ],
      }
    case 'gas_monthly':
      return {
        sheetName: 'gas_monthly',
        aoa: [
          ['period', 'furnace', 'charge_weight_ton', 'gas_used'],
          ['2026-01-01', '1호기', 1250.5, 95000],
          ['2026-01-01', '6호기', 3420.0, 280000],
        ],
      }
    case 'gas_daily_readings':
      return {
        sheetName: 'self_2023_new',
        aoa: [
          ['reading_date', 'furnace', 'reading_before', 'reading_after', 'gas_used'],
          ['2026-01-01', '1호기', 1000500, 1003600, 3100],
          ['2026-01-01', '6호기', 5002000, 5011500, 9500],
        ],
      }
    case 'charge_correction':
      return {
        sheetName: 'charge2',
        aoa: [
          ['work_date', 'furnace', 'dept', 'charge_weight_ton'],
          ['2026-01-01', '6호기', 'P15', 125.4],
          ['2026-01-01', '1호기', 'P5', 68.2],
        ],
      }
    case 'work_standards':
      return {
        sheetName: '표준작업수마스터',
        aoa: [
          ['dept', 'product', 'material', 'basis', 'min_ton', 'max_ton', 'order_size', 'std_work_count', 'note'],
          ['P15', 'RING', 'SUS304', 'charge', 10, 20, '', 4, '10~20톤 투입 시 표준 4회차'],
          ['R/M', 'FLANGE', 'SCM440', 'product', 5, 15, 'Ø1200', 2, 'R/M 제품중량 기준'],
        ],
      }
    case 'targets':
      return {
        sheetName: '연간목표',
        aoa: [
          ['year', 'month', 'dept', 'line_id', 'target_qty', 'target_weight_ton'],
          [2026, 1, 'P15', '15000TON', 150, 4495],
          [2026, 1, 'P5', '5000TON', 120, 2170],
        ],
      }
    case 'raw_material_specs':
      return {
        sheetName: '원소재규격_몰드표',
        aoa: [
          ['product', 'material', 'raw_material', 'spec', 'note'],
          ['RING', 'SUS304', 'INGOT-A', 'Ø800x2500', '표준 몰드 규격'],
        ],
      }
    case 'mes_work_time':
      return {
        sheetName: 'MES_작업시간',
        aoa: [
          ['work_date', 'order_no', 'product_type', 'work_hours', 'work_count'],
          ['2026-01-02', 'ORD-2026-001', 'RING', 3.5, 4],
        ],
      }
    default:
      return {
        sheetName: '기본템플릿',
        aoa: [['date', 'department', 'line_id', 'value'], ['2026-01-01', 'P15', '15000TON', 100]],
      }
  }
}

export function parseExcelBuffer(buffer: ArrayBuffer, options?: { sheetNames?: string[]; forceUnit?: 'kg' | 'ton' }): ParseResult {
  return new ExcelParser().parse(buffer, options)
}
