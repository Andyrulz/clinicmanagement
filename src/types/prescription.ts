// Enhanced prescription and consultation types

export interface Prescription {
  id: string
  medicine_name: string
  dosage_amount: number
  dosage_unit: string // mg, ml, tablets, etc.
  frequency_times: number // number of times per day
  timing: ('morning' | 'afternoon' | 'evening' | 'night')[]
  food_timing: 'before_food' | 'after_food' | 'with_food' | 'empty_stomach'
  duration_days: number
  instructions?: string
  total_quantity: number // calculated field
}

export interface ConsultationData {
  history_of_present_illness: string
  physical_examination: string
  diagnosis: string
  treatment_plan: string
  prescriptions: Prescription[]
  general_advice: string
  follow_up_date?: string
  follow_up_instructions?: string
}

export interface PrescriptionFormData {
  medicine_name: string
  dosage_amount: string
  dosage_unit: string
  frequency_times: string
  timing: string[]
  food_timing: string
  duration_days: string
  instructions: string
}
