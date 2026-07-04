'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface RollbackResult {
  success: boolean
  message?: string
  error?: string
}

/**
 * 엑셀 업로드 데이터 원클릭 롤백 (해당 배치 데이터 DB 삭제)
 */
export async function rollbackUpload(uploadId: number): Promise<RollbackResult> {
  if (!uploadId || isNaN(uploadId)) {
    return { success: false, error: '유효하지 않은 업로드 ID입니다.' }
  }

  try {
    const supabase = await createServiceClient()

    // 1. 업로드 이력 조회
    const { data: uploadRecordRaw, error: findErr } = await supabase
      .from('uploads')
      .select('*')
      .eq('id', uploadId)
      .single()

    const uploadRecord = (uploadRecordRaw || null) as any

    if (findErr || !uploadRecord) {
      return { success: false, error: `업로드 이력을 찾을 수 없습니다: ${findErr?.message || ''}` }
    }

    if (uploadRecord.status === 'rolled_back') {
      return { success: false, error: '이미 롤백된 데이터입니다.' }
    }

    const kind = uploadRecord.kind

    // 2. 파일 타입별 연결된 데이터 삭제
    if (kind === 'perf_records' || kind === 'mes_work_time') {
      const { error: delErr } = await supabase.from('production_records').delete().eq('source_upload_id', uploadId)
      if (delErr) throw new Error(`생산 실적 삭제 실패: ${delErr.message}`)
    } else if (kind === 'line_output_daily') {
      const { error: delErr } = await supabase.from('line_output_daily').delete().eq('source_upload_id', uploadId)
      if (delErr) throw new Error(`생산량집계표 삭제 실패: ${delErr.message}`)
    } else if (kind === 'gas_monthly' || kind === 'charge_correction') {
      const { error: delErr } = await supabase.from('gas_records').delete().eq('source_upload_id', uploadId)
      if (delErr) throw new Error(`가스 월별 실적 삭제 실패: ${delErr.message}`)
    } else if (kind === 'gas_daily_readings') {
      const { error: delErr } = await supabase.from('gas_daily_readings').delete().eq('source_upload_id', uploadId)
      if (delErr) throw new Error(`가스 일별 검침 삭제 실패: ${delErr.message}`)
    }

    // 3. 이력 상태 변경
    const { error: updErr } = await (supabase.from('uploads') as any)
      .update({
        status: 'rolled_back',
        note: `${uploadRecord.note || ''} [${new Date().toISOString().split('T')[0]} 롤백됨]`,
      })
      .eq('id', uploadId)

    if (updErr) throw new Error(`이력 상태 업데이트 실패: ${updErr.message}`)

    // 화면 갱신
    revalidatePath('/dashboard')
    revalidatePath('/upload/history')
    revalidatePath('/data-entry')

    return {
      success: true,
      message: `[${uploadRecord.file_name}] 파일로 적재된 데이터가 성공적으로 롤백(삭제)되었습니다.`,
    }
  } catch (err: any) {
    console.error('rollbackUpload error:', err)
    return { success: false, error: err?.message || '롤백 처리 중 오류가 발생했습니다.' }
  }
}
