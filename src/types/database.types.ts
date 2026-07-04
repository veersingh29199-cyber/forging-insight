// ============================================================
// Supabase DB 타입 정의
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** 사용자 역할 */
export type UserRole =
  | 'facility_tech'     // 설비/기술
  | 'production_mgmt'   // 생산관리/계획
  | 'mes'               // MES/생산
  | 'forging_team'      // 각 단조반
  | 'maintenance'       // 설비보전
  | 'measurement'       // 계량/현장

/** 업로드 파일 종류 */
export type FileType =
  | 'standard_work_master'   // 표준작업수 마스터
  | 'raw_material_spec'      // 원소재 규격
  | 'annual_target'          // 연간 목표
  | 'production_summary'     // 생산량집계표
  | 'production_actual'      // 생산 실적
  | 'mes_work_time'          // MES 작업시간
  | 'shift_actual'           // 교대별 실적
  | 'equipment_operation'    // 호기별 가동/비가동
  | 'gas_meter'              // 가스 검침

export interface Database {
  public: {
    Tables: {
      /** 업로드 이력 */
      upload_history: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          user_role: UserRole;
          file_type: FileType;
          file_name: string;
          storage_path: string;
          period_start: string | null;    // 데이터 기간 시작
          period_end: string | null;      // 데이터 기간 끝
          row_count: number;
          status: 'preview' | 'committed' | 'rolled_back';
          parsed_summary: Json | null;    // 파싱 요약 (미리보기용)
          committed_at: string | null;
          rolled_back_at: string | null;
          note: string | null;
        };
        Insert: Omit<Database['public']['Tables']['upload_history']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['upload_history']['Row']>;
      };

      /** 연간/월간 생산 목표 */
      production_targets: {
        Row: {
          id: string;
          created_at: string;
          upload_id: string;
          year: number;
          month: number;
          department: string;           // 부서 (동적)
          line_id: string;              // 라인/호기 ID (동적)
          target_qty: number | null;    // 목표 수량
          target_weight_ton: number | null; // 목표 중량(ton)
        };
        Insert: Omit<Database['public']['Tables']['production_targets']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['production_targets']['Row']>;
      };

      /** 실제 생산 실적 */
      production_actual: {
        Row: {
          id: string;
          created_at: string;
          upload_id: string;
          date: string;                  // YYYY-MM-DD
          department: string;
          line_id: string;               // 호기/라인
          shift: string | null;          // 교대 (A/B/C 등)
          product_code: string | null;
          product_name: string | null;
          material: string | null;       // 재질
          qty: number | null;            // 수량
          weight_ton: number | null;     // 생산 중량(ton)
          ng_qty: number | null;         // 불량 수량
          downtime_min: number | null;   // 비가동 시간(분)
          downtime_reason: string | null;
        };
        Insert: Omit<Database['public']['Tables']['production_actual']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['production_actual']['Row']>;
      };

      /** 가스 검침 */
      gas_meter_readings: {
        Row: {
          id: string;
          created_at: string;
          upload_id: string;
          date: string;                  // YYYY-MM-DD
          equipment_id: string;          // 호기 ID
          department: string;
          reading_before: number | null; // 사용 전 검침(m³)
          reading_after: number | null;  // 사용 후 검침(m³)
          usage_m3: number | null;       // 사용량(m³) = after - before
          production_weight_ton: number | null; // 해당 호기 당일 생산중량
          unit_consumption: number | null;      // 원단위(m³/ton 또는 Mcal/ton)
        };
        Insert: Omit<Database['public']['Tables']['gas_meter_readings']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['gas_meter_readings']['Row']>;
      };

      /** 설비(호기) 마스터 */
      equipment_master: {
        Row: {
          id: string;
          created_at: string;
          equipment_id: string;          // 호기 고유 ID
          name: string;                  // 호기명 (동적 라벨 매핑에 사용)
          aliases: string[];             // 연도별로 바뀐 이름들
          department: string;
          furnace_type: string | null;   // 로 타입
          capacity_ton: number | null;
          is_active: boolean;
        };
        Insert: Omit<Database['public']['Tables']['equipment_master']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['equipment_master']['Row']>;
      };

      /** 제품 마스터 */
      product_master: {
        Row: {
          id: string;
          created_at: string;
          product_code: string;
          product_name: string;
          material: string | null;
          product_type: string | null;
          standard_weight_kg: number | null;
          standard_gas_unit: number | null;  // 표준 원단위(Mcal/ton) = 태상 기준값
        };
        Insert: Omit<Database['public']['Tables']['product_master']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['product_master']['Row']>;
      };

      /** 설비 가동/비가동 */
      equipment_operation: {
        Row: {
          id: string;
          created_at: string;
          upload_id: string;
          date: string;
          equipment_id: string;
          department: string;
          operating_min: number | null;   // 가동 시간(분)
          downtime_min: number | null;    // 비가동 시간(분)
          downtime_reason: string | null;
          shift: string | null;
        };
        Insert: Omit<Database['public']['Tables']['equipment_operation']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['equipment_operation']['Row']>;
      };

      /** 표준작업수 마스터 (히트 회차) */
      work_standards: {
        Row: {
          id: string;
          dept: string;
          product: string;
          material: string | null;
          basis: 'charge' | 'product';
          min_ton: number | null;
          max_ton: number | null;
          order_size: string | null;
          std_work_count: number;
          note: string | null;
        };
        Insert: Omit<Database['public']['Tables']['work_standards']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['work_standards']['Row']>;
      };

      /** 원소재 규격 (몰드표) */
      raw_material_specs: {
        Row: {
          id: string;
          product: string;
          material: string | null;
          raw_material: string;
          spec: string | null;
          note: string | null;
        };
        Insert: Omit<Database['public']['Tables']['raw_material_specs']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['raw_material_specs']['Row']>;
      };

      /** 앱 설정 (기준값) */
      app_settings: {
        Row: {
          key: string;
          value: Json;
          note: string | null;
        };
        Insert: Database['public']['Tables']['app_settings']['Row'];
        Update: Partial<Database['public']['Tables']['app_settings']['Row']>;
      };

      /** 생산 목표 (targets 확장) */
      targets: {
        Row: {
          id: string;
          year: number | null;
          month: number | null;
          dept: string | null;
          department: string | null;
          line_id: string | null;
          target_qty: number | null;
          target_weight_ton: number | null;
        };
        Insert: Omit<Database['public']['Tables']['targets']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['targets']['Row']>;
      };

      /** 호기 마스터 (furnaces 확장) */
      furnaces: {
        Row: {
          id: string;
          furnace: string | null;
          dept: string | null;
          furnace_type: 'batch' | 'car' | null;
        };
        Insert: Omit<Database['public']['Tables']['furnaces']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['furnaces']['Row']>;
      };

      /** 생산 실적 원장 (수주 단위) */
      production_records: {
        Row: {
          id: string;
          work_date: string | null;
          dept: string | null;
          shift: string | null;
          order_no: string | null;
          process: string | null;
          product: string | null;
          material: string | null;
          order_size: string | null;
          work_size: string | null;
          order_weight_ton: number | null;
          charge_weight_ton: number | null;
          furnace: string | null;
          work_hours: number | null;
          work_count: number | null;
          source_upload_id: number | null;
        };
        Insert: Omit<Database['public']['Tables']['production_records']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['production_records']['Row']>;
      };

      /** 생산량집계표 (다중밴드 일일 크로스탭, kg 원본) */
      line_output_daily: {
        Row: {
          id: string;
          work_date: string;
          line_code: string;
          output_kg: number | null;
          plan_kg: number | null;
          achievement: number | null;
          hwangji_kg: number | null;
          cogging_kg: number | null;
          subtotal_kg: number | null;
          remake_self_remake: number | null;
          remake_self_fix: number | null;
          remake_qc_remake: number | null;
          remake_qc_fix: number | null;
          mat_cs_kg: number | null;
          mat_as_kg: number | null;
          mat_sus_kg: number | null;
          mat_total_kg: number | null;
          source_upload_id: number | null;
        };
        Insert: Omit<Database['public']['Tables']['line_output_daily']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['line_output_daily']['Row']>;
      };

      /** 가스 월별 기록 */
      gas_records: {
        Row: {
          id: string;
          period: string | null;
          furnace: string | null;
          charge_weight_ton: number | null;
          gas_used: number | null;
          source_upload_id: number | null;
        };
        Insert: Omit<Database['public']['Tables']['gas_records']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['gas_records']['Row']>;
      };

      /** 가스 일별 검침 (사용전/후) */
      gas_daily_readings: {
        Row: {
          id: string;
          reading_date: string | null;
          furnace: string | null;
          reading_before: number | null;
          reading_after: number | null;
          gas_used: number | null;
          source_upload_id: number | null;
        };
        Insert: Omit<Database['public']['Tables']['gas_daily_readings']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['gas_daily_readings']['Row']>;
      };

      /** 업로드 이력 (v2) */
      uploads: {
        Row: {
          id: string;
          kind: string | null;
          file_name: string | null;
          storage_path: string | null;
          row_count: number | null;
          status: string | null;
          mapping: Json | null;
          created_at: string;
          note: string | null;
        };
        Insert: Omit<Database['public']['Tables']['uploads']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['uploads']['Row']>;
      };
    };
    Views: {};
    Functions: {};
  };
}
