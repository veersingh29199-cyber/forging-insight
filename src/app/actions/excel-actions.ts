'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CommitExcelInput {
  fileType: string
  fileName: string
  rowCount: number
  mapping: Record<string, string>
  mappedRows: Array<Record<string, unknown>>
}

export interface CommitExcelResult {
  success: boolean
  uploadId?: number
  message?: string
  error?: string
}

/**
 * 엑셀 업로드 확정 (DB 적재)
 */
export async function commitExcelUpload(input: CommitExcelInput): Promise<CommitExcelResult> {
  const { fileType, fileName, rowCount, mapping, mappedRows } = input
  if (!mappedRows || mappedRows.length === 0) {
    return { success: false, error: '적재할 데이터가 없습니다.' }
  }

  try {
    const supabase = await createServiceClient()

    // 1. uploads 테이블에 이력 기록
    const { data: uploadRecordRaw, error: uploadErr } = await supabase
      .from('uploads')
      .insert({
        kind: fileType,
        file_name: fileName,
        row_count: rowCount || mappedRows.length,
        status: 'committed',
        mapping: mapping as Record<string, string>,
        note: `${fileName} (자동 적재: ${mappedRows.length}행)`,
      } as any)
      .select('id')
      .single()

    interface UploadRecord { id: number }
    const uploadRecord = (uploadRecordRaw || null) as UploadRecord | null

    if (uploadErr || !uploadRecord) {
      console.error('Uploads history insert error:', uploadErr)
      return { success: false, error: `업로드 이력 저장 실패: ${uploadErr?.message || '알 수 없는 오류'}` }
    }

    const uploadId = uploadRecord.id

    // 2. 파일 타입별 대상 테이블 적재
    if (fileType === 'perf_records') {
      const records = mappedRows.map((row) => ({
        work_date: row.work_date || new Date().toISOString().split('T')[0],
        dept: String(row.dept || row.department || 'P15 (1단조반)'),
        shift: row.shift ? String(row.shift) : 'A',
        order_no: row.order_no ? String(row.order_no) : null,
        process: row.process ? String(row.process) : '단조',
        product: String(row.product || '일반단조품'),
        material: row.material ? String(row.material) : null,
        order_size: row.order_size ? String(row.order_size) : null,
        work_size: row.work_size ? String(row.work_size) : null,
        order_weight_ton: Number(row.order_weight_ton || row.weight_ton || 0),
        charge_weight_ton: Number(row.charge_weight_ton || row.order_weight_ton || 0),
        hwangji_weight_ton: Number(row.hwangji_weight_ton || 0),
        furnace: row.furnace ? String(row.furnace) : '1호기',
        work_hours: Number(row.work_hours || 0),
        work_count: Number(row.work_count || 1),
        gas_used_m3: Number(row.gas_used_m3 || row.gas_used || 0),
        source_upload_id: uploadId,
      }))

      const { error: insErr } = await supabase.from('production_records').insert(records as never[])
      if (insErr) throw new Error(`생산 실적 적재 실패: ${insErr.message}`)
    } else if (fileType === 'line_output_daily') {
      const records = mappedRows.map((row) => ({
        work_date: row.work_date || new Date().toISOString().split('T')[0],
        line_code: String(row.line_code || row.line || 'P15'),
        output_kg: Number(row.output_kg || row.output || 0),
        plan_kg: Number(row.plan_kg || row.plan || 0),
        achievement: row.achievement ? Number(row.achievement) : null,
        hwangji_kg: Number(row.hwangji_kg || 0),
        cogging_kg: Number(row.cogging_kg || 0),
        subtotal_kg: Number(row.subtotal_kg || 0),
        remake_self_remake: Number(row.remake_self_remake || 0),
        remake_self_fix: Number(row.remake_self_fix || 0),
        remake_qc_remake: Number(row.remake_qc_remake || 0),
        remake_qc_fix: Number(row.remake_qc_fix || 0),
        mat_cs_kg: Number(row.mat_cs_kg || 0),
        mat_as_kg: Number(row.mat_as_kg || 0),
        mat_sus_kg: Number(row.mat_sus_kg || 0),
        mat_total_kg: Number(row.mat_total_kg || 0),
        source_upload_id: uploadId,
      }))

      const { error: insErr } = await supabase.from('line_output_daily').insert(records as never[])
      if (insErr) throw new Error(`생산량집계표 적재 실패: ${insErr.message}`)
    } else if (fileType === 'gas_monthly') {
      const records = mappedRows.map((row) => ({
        period: row.period || row.work_date || new Date().toISOString().split('T')[0],
        furnace: String(row.furnace || '1호기'),
        charge_weight_ton: Number(row.charge_weight_ton || 0),
        gas_used: Number(row.gas_used || row.gas_used_m3 || 0),
        source_upload_id: uploadId,
      }))

      const { error: insErr } = await supabase.from('gas_records').insert(records as never[])
      if (insErr) throw new Error(`가스 월별 실적 적재 실패: ${insErr.message}`)
    } else if (fileType === 'gas_daily_readings') {
      const records = mappedRows.map((row) => ({
        reading_date: row.reading_date || row.work_date || new Date().toISOString().split('T')[0],
        furnace: String(row.furnace || '1호기'),
        reading_before: Number(row.reading_before || 0),
        reading_after: Number(row.reading_after || 0),
        gas_used: Number(row.gas_used || (Number(row.reading_after || 0) - Number(row.reading_before || 0))),
        source_upload_id: uploadId,
      }))

      const { error: insErr } = await supabase.from('gas_daily_readings').insert(records as never[])
      if (insErr) throw new Error(`가스 일별 검침 적재 실패: ${insErr.message}`)
    } else if (fileType === 'work_standards') {
      const records = mappedRows.map((row) => ({
        dept: String(row.dept || 'P15 (1단조)'),
        product: String(row.product || '일반단조품'),
        material: row.material ? String(row.material) : null,
        basis: (row.basis === 'product' ? 'product' : 'charge') as 'charge' | 'product',
        min_ton: row.min_ton ? Number(row.min_ton) : null,
        max_ton: row.max_ton ? Number(row.max_ton) : null,
        order_size: row.order_size ? String(row.order_size) : null,
        std_work_count: Number(row.std_work_count || 1),
        note: row.note ? String(row.note) : null,
      }))

      const { error: insErr } = await supabase.from('work_standards').insert(records as never[])
      if (insErr) throw new Error(`표준작업수 마스터 적재 실패: ${insErr.message}`)
    } else if (fileType === 'targets') {
      const records = mappedRows.map((row) => ({
        year: Number(row.year || 2026),
        month: row.month ? Number(row.month) : null,
        dept: String(row.dept || 'P15 (1단조반)'),
        target_ton: Number(row.target_ton || row.target_weight_ton || 0),
        target_gas_mcal: Number(row.target_gas_mcal || 150.0),
        target_defect_rate: Number(row.target_defect_rate || 2.0),
      }))

      const { error: insErr } = await supabase.from('targets').insert(records as never[])
      if (insErr) throw new Error(`목표 마스터 적재 실패: ${insErr.message}`)
    } else if (fileType === 'raw_material_specs') {
      const records = mappedRows.map((row) => ({
        product: String(row.product || '일반단조품'),
        material: row.material ? String(row.material) : null,
        raw_material: String(row.raw_material || '잉고트'),
        spec: row.spec ? String(row.spec) : null,
        note: row.note ? String(row.note) : null,
      }))

      const { error: insErr } = await supabase.from('raw_material_specs').insert(records as never[])
      if (insErr) throw new Error(`원소재 규격 마스터 적재 실패: ${insErr.message}`)
    }

    // 화면 갱신
    revalidatePath('/dashboard')
    revalidatePath('/upload/history')
    revalidatePath('/data-entry')

    return {
      success: true,
      uploadId,
      message: `${mappedRows.length}건의 데이터가 성공적으로 적재되었습니다.`,
    }
  } catch (err: unknown) {
    console.error('commitExcelUpload error:', err)
    const msg = err instanceof Error ? err.message : 'DB 적재 중 오류가 발생했습니다.'
    return { success: false, error: msg }
  }
}

/**
 * 업로드 이력 조회 (최신순 50건)
 */
export async function getUploadHistory() {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('uploads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('getUploadHistory error:', error)
      return []
    }
    return data || []
  } catch (err) {
    console.error('getUploadHistory catch error:', err)
    return []
  }
}

