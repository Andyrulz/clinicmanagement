// Patient Management Types
// Comprehensive type definitions for the enhanced patient workflow

export interface Patient {
  id: string;
  tenant_id: string;
  uhid: string; // Required unique health ID
  first_name: string;
  last_name?: string;
  full_name?: string; // Computed column for display
  age?: number;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  email?: string;
  aadhaar_number?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  emergency_contact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  medical_history?: string;
  allergies?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  registration_fee: number;
  registration_fee_paid: boolean;
  registration_payment_date?: string;
  date_of_birth?: string;
  status?: 'active' | 'inactive' | 'blocked';
}

export interface PatientVisit {
  id: string;
  tenant_id: string;
  patient_id: string;
  doctor_id: string;
  visit_number: string;
  visit_date: string;
  visit_time: string;
  visit_type: 'new' | 'follow_up';
  consultation_fee: number;
  consultation_fee_paid: boolean;
  consultation_payment_date?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  
  // Clinical fields from database schema
  chief_complaints?: string;
  history_of_present_illness?: string;
  past_medical_history?: string;
  family_history?: string;
  social_history?: string;
  physical_examination?: string;
  clinical_findings?: string;
  diagnosis?: string;
  differential_diagnosis?: string;
  treatment_plan?: string;
  prescription?: Record<string, unknown>; // JSONB field
  general_advice?: string;
  follow_up_date?: string;
  follow_up_instructions?: string;
  tests_ordered?: Record<string, unknown>; // JSONB field
  scan_orders?: Record<string, unknown>; // JSONB field
  
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  
  // Joined data
  patient?: Patient;
  doctor?: {
    id: string;
    full_name: string;
    role: string;
  };
  vitals?: PatientVitals;
}

export interface PatientVitals {
  id: string;
  tenant_id: string;
  patient_id: string;
  visit_id: string;
  
  // Physical measurements
  height_cm?: number;
  weight_kg?: number;
  bmi?: number;
  
  // Vital signs
  pulse_rate?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  spo2?: number;
  temperature_celsius?: number;
  
  // Additional measurements
  respiratory_rate?: number;
  blood_glucose?: number;
  notes?: string;
  
  // Metadata
  recorded_at: string;
  recorded_by?: string;
}

export interface ConsultationDetails {
  id: string;
  tenant_id: string;
  visit_id: string;
  patient_id: string;
  doctor_id: string;
  vitals_id?: string;
  
  // Patient history
  chief_complaint?: string;
  present_history?: string; // History of Present Illness
  past_medical_history?: string;
  family_history?: string;
  social_history?: string;
  allergies_current?: string;
  
  // Physical examination
  general_examination?: string;
  cardiovascular_exam?: string;
  respiratory_exam?: string;
  abdomen_exam?: string;
  neurological_exam?: string;
  other_system_exam?: string;
  examination_findings?: string;
  
  // Diagnosis and treatment
  primary_diagnosis?: string;
  differential_diagnosis?: string;
  diagnosis?: string;
  treatment_plan?: string;
  clinical_notes?: string;
  general_advice?: string;
  
  // Follow-up and orders
  follow_up_date?: string;
  follow_up_instructions?: string;
  next_follow_up_weeks?: number;
  lab_tests_ordered?: string[];
  imaging_ordered?: string[];
  referrals?: string;
  
  consultation_fee?: number;
  status: 'in-progress' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface PrescriptionDetails {
  id: string;
  tenant_id: string;
  consultation_id: string;
  patient_id: string;
  doctor_id: string;
  
  // Medication details
  medication_name: string;
  strength?: string;
  dosage_form?: string; // tablet, capsule, syrup, injection, etc.
  frequency: string; // OD, BD, TDS, QID, etc.
  duration_days: number;
  food_relation: 'BF' | 'AF' | 'WF' | 'EF'; // Before/After/With/Empty stomach food
  special_instructions?: string;
  quantity_prescribed?: number;
  
  // Legacy fields for uploaded prescriptions
  prescription_type: 'digital' | 'uploaded';
  file_url?: string;
  medications?: Record<string, unknown>; // JSONB for legacy support
  instructions?: string;
  
  created_at: string;
}

// Form data types for patient registration
export interface PatientRegistrationForm {
  name: string;
  phone: string;
  email?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  };
  emergency_contact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  medical_history?: string;
  allergies?: string;
  registration_fee: number;
  registration_fee_paid: boolean;
}

// Form data for visit creation
export interface VisitCreationForm {
  patient_id: string;
  doctor_id: string;
  visit_date: string;
  visit_time: string;
  visit_type: 'new' | 'follow-up' | 'emergency';
  consultation_fee: number;
  chief_complaint?: string;
  visit_notes?: string;
}

// Form data for vitals
export interface VitalsForm {
  height_cm?: number;
  weight_kg?: number;
  pulse_rate?: number;
  bp_systolic?: number;
  bp_diastolic?: number;
  spo2?: number;
  temperature?: number;
  temperature_unit: 'C' | 'F';
  respiratory_rate?: number;
  blood_sugar?: number;
  notes?: string;
}

// Search and filter types
export interface PatientSearchParams {
  query?: string; // Name, phone, or patient ID
  status?: 'active' | 'inactive' | 'blocked';
  registration_fee_paid?: boolean;
  created_after?: string;
  created_before?: string;
  limit?: number;
  offset?: number;
}

export interface VisitSearchParams {
  patient_id?: string;
  doctor_id?: string;
  visit_date?: string;
  visit_type?: 'new' | 'follow-up' | 'emergency';
  status?: string;
  consultation_fee_paid?: boolean;
  limit?: number;
  offset?: number;
}

// API Response types
export interface PatientListResponse {
  patients: Patient[];
  total: number;
  page: number;
  limit: number;
}

export interface VisitListResponse {
  visits: PatientVisit[];
  total: number;
  page: number;
  limit: number;
}

// Utility types
export type VisitStatus = PatientVisit['status'];
export type VisitType = PatientVisit['visit_type'];
export type PatientStatus = Patient['status'];

// Constants for dropdowns and validation
export const VISIT_TYPES = [
  { value: 'new', label: 'New Patient' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'emergency', label: 'Emergency' }
] as const;

export const VISIT_STATUSES = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'checked-in', label: 'Checked In' },
  { value: 'vitals-pending', label: 'Vitals Pending' },
  { value: 'vitals-done', label: 'Ready for Doctor' },
  { value: 'in-consultation', label: 'In Consultation' },
  { value: 'consultation-done', label: 'Consultation Done' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no-show', label: 'No Show' }
] as const;

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' }
] as const;

export const FOOD_RELATIONS = [
  { value: 'BF', label: 'Before Food' },
  { value: 'AF', label: 'After Food' },
  { value: 'WF', label: 'With Food' },
  { value: 'EF', label: 'Empty Stomach' }
] as const;

export const MEDICATION_FREQUENCIES = [
  { value: 'OD', label: 'Once Daily (OD)' },
  { value: 'BD', label: 'Twice Daily (BD)' },
  { value: 'TDS', label: 'Three Times Daily (TDS)' },
  { value: 'QID', label: 'Four Times Daily (QID)' },
  { value: 'Q4H', label: 'Every 4 Hours' },
  { value: 'Q6H', label: 'Every 6 Hours' },
  { value: 'Q8H', label: 'Every 8 Hours' },
  { value: 'PRN', label: 'As Needed (PRN)' }
] as const;
