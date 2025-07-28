// Patient Management Service
// Database operations for patient registration, visits, vitals, and consultations

import { createClient } from '@/lib/supabase/client';
import type { 
  Patient, 
  PatientVisit, 
  PatientVitals,
  PatientRegistrationForm,
  VisitCreationForm,
  VitalsForm,
  PatientSearchParams,
  VisitSearchParams
} from '@/types/patient';

const supabase = createClient();

// =================================================================
// PATIENT OPERATIONS
// =================================================================

export async function createPatient(data: PatientRegistrationForm): Promise<Patient> {
  // Get current user's tenant info for RLS compliance
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Get user's tenant_id
  const { data: userData, error: userDataError } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('auth_user_id', user.id)
    .single();

  if (userDataError || !userData) {
    throw new Error('User data not found');
  }

  // Split name into first_name and last_name for database compatibility
  const nameParts = data.name.trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Generate UHID (unique health ID) - format: P-YYYYMMDD-HHMMSS-XXX
  const now = new Date();
  const uhid = `P-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

  const { data: patient, error } = await supabase
    .from('patients')
    .insert({
      tenant_id: userData.tenant_id,
      uhid: uhid,
      first_name: firstName,
      last_name: lastName || null,
      phone: data.phone,
      email: data.email || null,
      date_of_birth: data.date_of_birth || null,
      gender: data.gender || null,
      address: data.address || null, // Already JSONB in schema
      emergency_contact: data.emergency_contact || null, // Already JSONB in schema
      medical_history: data.medical_history || null,
      allergies: data.allergies || null,
      registration_fee: data.registration_fee,
      registration_fee_paid: data.registration_fee_paid,
      registration_payment_date: data.registration_fee_paid ? new Date().toISOString().split('T')[0] : null,
      status: 'active',
      is_active: true,
      created_by: userData.id
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating patient:', error);
    throw new Error(error.message);
  }

  return patient;
}

export async function getPatientById(id: string): Promise<Patient | null> {
  const { data: patient, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching patient:', error);
    throw new Error(error.message);
  }

  return patient;
}

export async function getPatientByPhone(phone: string): Promise<Patient | null> {
  const { data: patient, error } = await supabase
    .from('patients')
    .select('*')
    .eq('phone', phone.replace(/\s+/g, ''))
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching patient by phone:', error);
    throw new Error(error.message);
  }

  return patient;
}

export async function searchPatients(params: PatientSearchParams = {}) {
  // Get current user's tenant info for RLS compliance
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Get user's tenant_id
  const { data: userData, error: userDataError } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('auth_user_id', user.id)
    .single();

  if (userDataError || !userData) {
    throw new Error('User data not found');
  }

  let query = supabase.from('patients').select('*', { count: 'exact' })
    .eq('tenant_id', userData.tenant_id);

  // Apply filters
  if (params.query) {
    // Search in first_name, last_name, full_name (computed), and phone
    query = query.or(`first_name.ilike.%${params.query}%,last_name.ilike.%${params.query}%,full_name.ilike.%${params.query}%,phone.ilike.%${params.query}%`);
  }

  if (params.status) {
    query = query.eq('status', params.status);
  }

  if (params.registration_fee_paid !== undefined) {
    query = query.eq('registration_fee_paid', params.registration_fee_paid);
  }

  if (params.created_after) {
    query = query.gte('created_at', params.created_after);
  }

  if (params.created_before) {
    query = query.lte('created_at', params.created_before);
  }

  // Apply pagination
  query = query
    .order('created_at', { ascending: false })
    .range(params.offset || 0, (params.offset || 0) + (params.limit || 20) - 1);

  const { data: patients, count, error } = await query;

  if (error) {
    console.error('Error searching patients:', error);
    throw new Error(error.message);
  }

  return {
    patients: patients || [],
    total: count || 0,
    page: Math.floor((params.offset || 0) / (params.limit || 20)) + 1,
    limit: params.limit || 20
  };
}

export async function updatePatient(id: string, updates: Partial<PatientRegistrationForm>): Promise<Patient> {
  const { data: patient, error } = await supabase
    .from('patients')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating patient:', error);
    throw new Error(error.message);
  }

  return patient;
}

// =================================================================
// VISIT OPERATIONS
// =================================================================

export async function createVisit(data: VisitCreationForm): Promise<PatientVisit> {
  const { data: visit, error } = await supabase
    .from('patient_visits')
    .insert({
      patient_id: data.patient_id,
      doctor_id: data.doctor_id,
      visit_date: data.visit_date,
      visit_time: data.visit_time,
      visit_type: data.visit_type,
      consultation_fee: data.consultation_fee,
      chief_complaint: data.chief_complaint || null,
      visit_notes: data.visit_notes || null,
      status: 'scheduled'
    })
    .select(`
      *,
      patient:patients(id, name, phone, age),
      doctor:users(id, name, role)
    `)
    .single();

  if (error) {
    console.error('Error creating visit:', error);
    throw new Error(error.message);
  }

  return visit;
}

export async function getVisitById(id: string): Promise<PatientVisit | null> {
  const { data: visit, error } = await supabase
    .from('patient_visits')
    .select(`
      *,
      patient:patients(id, name, phone, age, medical_history, allergies),
      doctor:users(id, name, role),
      vitals:patient_vitals(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching visit:', error);
    throw new Error(error.message);
  }

  return visit;
}

export async function searchVisits(params: VisitSearchParams = {}) {
  let query = supabase.from('patient_visits').select(`
    *,
    patient:patients(id, name, phone),
    doctor:users(id, name, role)
  `, { count: 'exact' });

  // Apply filters
  if (params.patient_id) {
    query = query.eq('patient_id', params.patient_id);
  }

  if (params.doctor_id) {
    query = query.eq('doctor_id', params.doctor_id);
  }

  if (params.visit_date) {
    query = query.eq('visit_date', params.visit_date);
  }

  if (params.visit_type) {
    query = query.eq('visit_type', params.visit_type);
  }

  if (params.status) {
    query = query.eq('status', params.status);
  }

  if (params.consultation_fee_paid !== undefined) {
    query = query.eq('consultation_fee_paid', params.consultation_fee_paid);
  }

  // Apply pagination and ordering
  query = query
    .order('visit_date', { ascending: false })
    .order('visit_time', { ascending: false })
    .range(params.offset || 0, (params.offset || 0) + (params.limit || 20) - 1);

  const { data: visits, count, error } = await query;

  if (error) {
    console.error('Error searching visits:', error);
    throw new Error(error.message);
  }

  return {
    visits: visits || [],
    total: count || 0,
    page: Math.floor((params.offset || 0) / (params.limit || 20)) + 1,
    limit: params.limit || 20
  };
}

export async function updateVisitStatus(id: string, status: PatientVisit['status']): Promise<PatientVisit> {
  const { data: visit, error } = await supabase
    .from('patient_visits')
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating visit status:', error);
    throw new Error(error.message);
  }

  return visit;
}

// =================================================================
// VITALS OPERATIONS
// =================================================================

export async function createVitals(visitId: string, data: VitalsForm, measuredBy: string): Promise<PatientVitals> {
  // Calculate BMI if height and weight are provided
  let bmi = null;
  if (data.height_cm && data.weight_kg) {
    bmi = Number((data.weight_kg / Math.pow(data.height_cm / 100, 2)).toFixed(2));
  }

  const { data: vitals, error } = await supabase
    .from('patient_vitals')
    .insert({
      visit_id: visitId,
      patient_id: (await getVisitById(visitId))?.patient_id,
      height_cm: data.height_cm || null,
      weight_kg: data.weight_kg || null,
      bmi,
      pulse_rate: data.pulse_rate || null,
      bp_systolic: data.bp_systolic || null,
      bp_diastolic: data.bp_diastolic || null,
      spo2: data.spo2 || null,
      temperature: data.temperature || null,
      temperature_unit: data.temperature_unit,
      respiratory_rate: data.respiratory_rate || null,
      blood_sugar: data.blood_sugar || null,
      notes: data.notes || null,
      measured_by: measuredBy,
      is_validated: false
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating vitals:', error);
    throw new Error(error.message);
  }

  // Update visit status to in_progress (vitals recorded)
  await updateVisitStatus(visitId, 'in_progress');

  return vitals;
}

export async function getVitalsByVisitId(visitId: string): Promise<PatientVitals | null> {
  const { data: vitals, error } = await supabase
    .from('patient_vitals')
    .select('*')
    .eq('visit_id', visitId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching vitals:', error);
    throw new Error(error.message);
  }

  return vitals;
}

export async function updateVitals(id: string, data: Partial<VitalsForm>): Promise<PatientVitals> {
  // Recalculate BMI if height or weight changed
  const updates: Partial<VitalsForm> & { updated_at: string; bmi?: number } = {
    ...data,
    updated_at: new Date().toISOString()
  };

  if (data.height_cm || data.weight_kg) {
    const existing = await supabase
      .from('patient_vitals')
      .select('height_cm, weight_kg')
      .eq('id', id)
      .single();

    if (existing.data) {
      const height = data.height_cm || existing.data.height_cm;
      const weight = data.weight_kg || existing.data.weight_kg;
      
      if (height && weight) {
        updates.bmi = Number((weight / Math.pow(height / 100, 2)).toFixed(2));
      }
    }
  }

  const { data: vitals, error } = await supabase
    .from('patient_vitals')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating vitals:', error);
    throw new Error(error.message);
  }

  return vitals;
}

// =================================================================
// TODAY'S OPERATIONS (DASHBOARD HELPERS)
// =================================================================

export async function getTodaysVisits() {
  const today = new Date().toISOString().split('T')[0];
  
  return await searchVisits({
    visit_date: today,
    limit: 100
  });
}

export async function getVisitsByStatus(status: PatientVisit['status']) {
  return await searchVisits({
    status,
    limit: 100
  });
}

export async function getPatientsWithPendingPayments() {
  return await searchPatients({
    registration_fee_paid: false,
    limit: 50
  });
}

// =================================================================
// UTILITY FUNCTIONS
// =================================================================

export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

export function formatVisitNumber(visitNumber: string): string {
  // Format: CLN250727001 -> CLN-250727-001
  if (visitNumber.length >= 9) {
    const clinic = visitNumber.substring(0, 3);
    const date = visitNumber.substring(3, 9);
    const counter = visitNumber.substring(9);
    return `${clinic}-${date}-${counter}`;
  }
  return visitNumber;
}

export function getVisitStatusColor(status: PatientVisit['status']): string {
  const colors = {
    'scheduled': 'text-blue-900 bg-blue-50 border-blue-200',
    'in_progress': 'text-purple-900 bg-purple-50 border-purple-200',
    'completed': 'text-green-900 bg-green-100 border-green-200',
    'cancelled': 'text-red-900 bg-red-50 border-red-200'
  };
  
  return colors[status] || colors.scheduled;
}

export function getVisitTypeColor(type: PatientVisit['visit_type']): string {
  const colors = {
    'new': 'text-blue-900 bg-blue-50 border-blue-200',
    'follow_up': 'text-green-900 bg-green-50 border-green-200',
    'emergency': 'text-red-900 bg-red-50 border-red-200'
  };
  
  return colors[type] || colors.new;
}

export function isValidVitals(vitals: PatientVitals): boolean {
  // Check if at least some vital signs are recorded
  return !!(
    vitals.height_cm ||
    vitals.weight_kg ||
    vitals.pulse_rate ||
    vitals.blood_pressure_systolic ||
    vitals.blood_pressure_diastolic ||
    vitals.spo2 ||
    vitals.temperature_celsius
  );
}

export function getVitalsCompleteness(vitals: PatientVitals): number {
  const fields = [
    'height_cm', 'weight_kg', 'pulse_rate', 
    'bp_systolic', 'bp_diastolic', 'spo2', 'temperature'
  ];
  
  const completed = fields.filter(field => 
    vitals[field as keyof PatientVitals] !== null && 
    vitals[field as keyof PatientVitals] !== undefined
  ).length;
  
  return Math.round((completed / fields.length) * 100);
}
