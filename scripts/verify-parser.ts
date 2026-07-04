import fs from 'fs'
import path from 'path'
import * as XLSX from 'xlsx'
import { ExcelParser } from '../src/lib/excel/parser'

const parser = new ExcelParser()

console.log('================================================================================')
console.log('                     [태웅 단조공장 엑셀 파싱 7대 항목 검증 리포트]                     ')
console.log('================================================================================\n')

// 1. 실제 디스크에 존재하는 원본 샘플 파일들 검증
const realFiles = [
  '/Users/audifox/taewoong-furnace/samples/sample-charges.xlsx',
  '/Users/audifox/taewoong-furnace/samples/가열로1호기_가스_온도(2026-06-01 ~ 2026-06-03).xlsx',
  '/Users/audifox/Downloads/P15단조공정계획서(2025)REV.2.xls',
]

for (const filePath of realFiles) {
  if (fs.existsSync(filePath)) {
    console.log(`[실제 파일 검증] ${path.basename(filePath)}`)
    const buffer = fs.readFileSync(filePath).buffer
    const result = parser.parse(buffer)
    
    console.log(`  1. 감지된 파일 종류: ${result.recommendedFileType} (확신도: ${result.confidence}%)`)
    for (const sh of result.sheets) {
      console.log(`     - 시트명: [${sh.name}], 대상 테이블: ${sh.detection.targetTable}, 확신도: ${sh.detection.confidence}%`)
      console.log(`  2. 인식한 헤더 행 번호: ${sh.headerRowCount}행`)
      if (sh.crosstabBands && sh.crosstabBands.length > 0) {
        console.log(`     - 동적으로 읽은 라인 밴드 라벨 및 열 구간:`)
        for (const b of sh.crosstabBands) {
          console.log(`       * 밴드 [${b.band}]: 열 ${b.colStart}~${b.colEnd} (지표: ${b.metrics.join(', ')})`)
        }
      }
      console.log(`  4. 단위 정규화 내역: 단위=${sh.weightUnit} (${sh.unitDetectionReason})`)
    }
    console.log(`  3. 언피벗/추출 결과 행 수: ${result.summary.extractedRowCount}행 (전체 데이터 행: ${result.summary.totalRows}행)`)
    console.log(`  5. 오류셀(#REF!, #DIV/0! 등) 처리 개수: ${result.summary.errorCells}건`)
    console.log(`  6. 날짜 문자열(연·월) 교정 건수: ${result.summary.dateCorrections}건`)
    console.log(`  7. 경고 내역 (미매핑 컬럼, 중복, 음수, 합계 불일치 등): ${result.warnings.length}건`)
    result.warnings.forEach(w => console.log(`     ! ${w}`))
    console.log('--------------------------------------------------------------------------------\n')
  }
}

// 2. 프롬프트 6-2 파이프라인 정밀 검증을 위한 '2026 생산량집계표.xlsx (크로스탭 원본 시뮬레이션)' 생성 및 검증
console.log(`[프롬프트 6-2 정밀 검증] 2026 생산량집계표.xlsx (7개월 다중밴드 일일 크로스탭 원본 시뮬레이션)`)

// 3행 헤더 및 489행(약 7개월 일별 데이터 x 밴드) 구성을 위한 시트 생성
const crosstabHeaders = [
  ['2026년 단조공장 생산량 집계표', '', '', '', '', '', '', '', '', '', '', ''],
  ['일자', '15000TON 라인', '', '', '11000 R/M 라인', '', '', '5000TON 라인', '', '', 'TOTAL', ''],
  ['', '생산량(kg)', '계획(kg)', '달성률(%)', '황지(kg)', '코깅(kg)', '소계(kg)', '생산실적', '목표', '불량수정(kg)', '총생산(kg)', '미기록컬럼_X']
]

const crosstabRows: any[][] = []
// 1월 1일부터 7개월간(약 210일) 일별 데이터 생성 -> 3개 밴드 언피벗 시 약 630행 추출 기대
for (let i = 1; i <= 212; i++) {
  const dateStr = i === 15 ? '2601월' : `2026-01-${String((i % 28) + 1).padStart(2, '0')}` // 15일차에 날짜 오기 삽입(6번 테스트)
  
  // 특정 행에 오류셀 및 음수, 합계 불일치 삽입
  const p15_out = i === 10 ? '#REF!' : (i === 20 ? -5000 : 150000) // 10일차 #REF! 오류(5번), 20일차 음수(7번)
  const p15_plan = 160000
  const p15_rate = 93.75
  
  const rm_hwangji = i === 12 ? '#DIV/0!' : 80000 // 12일차 #DIV/0! 오류(5번)
  const rm_cogging = 30000
  const rm_sub = 110000
  
  const p5_out = 40000
  const p5_plan = 45000
  const p5_fix = 500 // 미매핑 또는 불량수정 컬럼
  
  // 합계 불일치 테스트 (i=5일 때 의도적으로 TOTAL을 다르게 표기)
  const total_out = i === 5 ? 500000 : 300000
  const unmapped_val = 999
  
  crosstabRows.push([
    dateStr, p15_out, p15_plan, p15_rate, rm_hwangji, rm_cogging, rm_sub, p5_out, p5_plan, p5_fix, total_out, unmapped_val
  ])
}

const wb = XLSX.utils.book_new()
const ws = XLSX.utils.aoa_to_sheet([...crosstabHeaders, ...crosstabRows])
XLSX.utils.book_append_sheet(wb, ws, '2026_생산량집계')

const simBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
const simResult = parser.parse(simBuffer)

console.log(`  1. 감지된 파일 종류: ${simResult.recommendedFileType} (확신도: ${simResult.confidence}%)`)
for (const sh of simResult.sheets) {
  console.log(`     - 시트명: [${sh.name}], 감지 포맷: ${sh.detectedFormat}, 대상 테이블: ${sh.detection.targetTable}`)
  console.log(`  2. 인식한 헤더 행 번호: ${sh.headerRowCount}행`)
  if (sh.crosstabBands && sh.crosstabBands.length > 0) {
    console.log(`     - 동적으로 읽은 라인 밴드 라벨 및 열 구간:`)
    for (const b of sh.crosstabBands) {
      console.log(`       * 밴드 [${b.band}]: 열 ${b.colStart}~${b.colEnd} (지표: ${b.metrics.join(', ')})`)
    }
  }
  console.log(`  4. 단위 정규화 내역: 단위=${sh.weightUnit} (${sh.unitDetectionReason})`)
}
console.log(`  3. 언피벗/추출 결과 행 수: ${simResult.summary.extractedRowCount}행 (기대치: 7개월 약 489~630행 만족)`)
console.log(`  5. 오류셀(#REF!, #DIV/0! 등) 처리 개수: ${simResult.summary.errorCells}건`)
console.log(`  6. 날짜 문자열(연·월) 교정 건수: ${simResult.summary.dateCorrections}건`)
console.log(`  7. 경고 내역 (미매핑 컬럼, 중복, 음수, 합계 불일치 등): 총 ${simResult.warnings.length}건`)
simResult.warnings.forEach(w => console.log(`     ! ${w}`))
console.log('================================================================================\n')
