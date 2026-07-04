// ============================================================
// Supabase DB 타입 정의 (v3 프로덕션 견고화 스키마)
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

export interface Database {
  public: {
    Tables: {
      /** 1. 표준작업수 마스터 (히트 회차) */
      work_standards: {
        Row: {
          id: number;
          dept: string;
          product: string;
          material: string | null;
          basis: 'charge' | 'product';
          min_ton: number | null;
          max_ton: number | null;
          order_size: string | null;
          std_work_count: number;
          note: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['work_standards']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['work_standards']['Row']>;
        Relationships: [];
      };

      /** 2. 원소재 규격 (몰드표) */
      raw_material_specs: {
        Row: {
          id: number;
          product: string;
          material: string | null;
          raw_material: string;
          spec: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['raw_material_specs']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['raw_material_specs']['Row']>;
        Relationships: [];
      };

      /** 3. 앱 설정 (기준값) */
      app_settings: {
        Row: {
          key: string;
          value: Json;
          note: string | null;
          updated_at: string;
        };
        Insert: Database['public']['Tables']['app_settings']['Row'];
        Update: Partial<Database['public']['Tables']['app_settings']['Row']>;
        Relationships: [];
      };

      /** 4. 연간/월간 생산 및 가스 목표 */
      targets: {
        Row: {
          id: number;
          year: number;
          month: number | null;
          dept: string;
          target_ton: number;
          target_gas_mcal: number;
          target_defect_rate: number;
          note: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['targets']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['targets']['Row']>;
        Relationships: [];
      };

      /** 5. 로 호기(설비) 마스터 */
      furnaces: {
        Row: {
          id: number;
          furnace: string;
          name: string;
          dept: string;
          furnace_type: 'batch' | 'car' | 'heat_treat' | 'other';
          capacity_ton: number | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['furnaces']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['furnaces']['Row']>;
        Relationships: [];
      };

      /** 6. 업로드 및 롤백 이력 */
      uploads: {
        Row: {
          id: number;
          created_at: string;
          kind: string;
          file_name: string;
          storage_path: string | null;
          row_count: number;
          status: 'preview' | 'committed' | 'rolled_back';
          mapping: Json | null;
          note: string | null;
        };
        Insert: Omit<Database['public']['Tables']['uploads']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['uploads']['Row']>;
        Relationships: [];
      };

      /** 7. 생산 실적 원장 (수주 단위) */
      production_records: {
        Row: {
          id: number;
          work_date: string;
          dept: string;
          shift: string | null;
          order_no: string | null;
          process: string | null;
          product: string;
          material: string | null;
          order_size: string | null;
          work_size: string | null;
          order_weight_ton: number;
          charge_weight_ton: number;
          hwangji_weight_ton: number;
          furnace: string | null;
          work_hours: number;
          work_count: number;
          gas_used_m3: number;
          source_upload_id: number | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['production_records']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['production_records']['Row']>;
        Relationships: [];
      };

      /** 8. 생산량집계표 (크로스탭 원본) */
      line_output_daily: {
        Row: {
          id: number;
          work_date: string;
          line_code: string;
          output_kg: number;
          plan_kg: number;
          achievement: number | null;
          hwangji_kg: number;
          cogging_kg: number;
          subtotal_kg: number;
          remake_self_remake: number;
          remake_self_fix: number;
          remake_qc_remake: number;
          remake_qc_fix: number;
          mat_cs_kg: number;
          mat_as_kg: number;
          mat_sus_kg: number;
          mat_total_kg: number;
          source_upload_id: number | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['line_output_daily']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['line_output_daily']['Row']>;
        Relationships: [];
      };

      /** 9. 가스 월별 실적 */
      gas_records: {
        Row: {
          id: number;
          period: string;
          furnace: string;
          charge_weight_ton: number;
          gas_used: number;
          source_upload_id: number | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['gas_records']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['gas_records']['Row']>;
        Relationships: [];
      };

      /** 10. 가스 일별 검침 */
      gas_daily_readings: {
        Row: {
          id: number;
          reading_date: string;
          furnace: string;
          reading_before: number;
          reading_after: number;
          gas_used: number;
          source_upload_id: number | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['gas_daily_readings']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['gas_daily_readings']['Row']>;
        Relationships: [];
      };

      // --- 레거시 호환성을 위한 별칭 (점진적 제거) ---
      upload_history: Database['public']['Tables']['uploads'];
      production_actual: Database['public']['Tables']['production_records'];
      equipment_master: Database['public']['Tables']['furnaces'];
      production_targets: Database['public']['Tables']['targets'];
      gas_meter_readings: Database['public']['Tables']['gas_daily_readings'];
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
