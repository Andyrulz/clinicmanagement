// Visit Management Service
// Handles all visit-related operations including creation, updates, and workflow management

import { createClient } from '@/lib/supabase/client'
import type { PatientVisit } from '@/types/patient'
import type { Prescription, ConsultationData } from '@/types/prescription'

export interface CreateVisitData {
  patient_id: string
  doctor_id: string
  visit_date: string
  visit_time: string
  visit_type: 'new' | 'follow_up'
  consultation_fee: number
  chief_complaints?: string
}

export interface UpdateVisitStatusData {
  visit_id: string
  status: PatientVisit['status']
  notes?: string
}

export interface UpdateVisitData {
  visit_id: string
  visit_date?: string
  visit_time?: string
  visit_type?: 'new' | 'follow_up'
  consultation_fee?: number
  chief_complaints?: string
}

export interface CreateVitalsData {
  visit_id: string
  patient_id: string
  height_cm?: number
  weight_kg?: number
  pulse_rate?: number
  blood_pressure_systolic?: number
  blood_pressure_diastolic?: number
  spo2?: number
  temperature_celsius?: number
  respiratory_rate?: number
  blood_glucose?: number
  notes?: string
}

export interface PatientVitals {
  id: string
  visit_id: string
  patient_id: string
  height_cm?: number
  weight_kg?: number
  pulse_rate?: number
  blood_pressure_systolic?: number
  blood_pressure_diastolic?: number
  spo2?: number
  temperature_celsius?: number
  respiratory_rate?: number
  blood_glucose?: number
  notes?: string
  recorded_at: string
  bmi?: number
}

class VisitService {
  private supabase = createClient()

  // Get current user's tenant ID
  private async getCurrentUserTenantId(): Promise<string> {
    const { data: { user }, error } = await this.supabase.auth.getUser()
    if (error || !user) throw new Error('User not authenticated')

    const { data: userData, error: userError } = await this.supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData) throw new Error('User data not found')
    return userData.tenant_id
  }

  // Get current user ID
  private async getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await this.supabase.auth.getUser()
    if (error || !user) throw new Error('User not authenticated')

    const { data: userData, error: userError } = await this.supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData) throw new Error('User data not found')
    return userData.id
  }

  // Create a new visit
  async createVisit(visitData: CreateVisitData): Promise<PatientVisit> {
    try {
      const tenantId = await this.getCurrentUserTenantId()
      const currentUserId = await this.getCurrentUserId()

      // Generate visit number using database function
      const { data: visitNumberData, error: visitNumberError } = await this.supabase
        .rpc('generate_visit_number', {
          p_tenant_id: tenantId,
          p_doctor_id: visitData.doctor_id,
          p_patient_id: visitData.patient_id
        })

      if (visitNumberError) {
        throw new Error(`Failed to generate visit number: ${visitNumberError.message}`)
      }

      // Create the visit record
      const { data: visit, error: visitError } = await this.supabase
        .from('patient_visits')
        .insert({
          tenant_id: tenantId,
          patient_id: visitData.patient_id,
          doctor_id: visitData.doctor_id,
          visit_number: visitNumberData,
          visit_date: visitData.visit_date,
          visit_time: visitData.visit_time,
          visit_type: visitData.visit_type,
          consultation_fee: visitData.consultation_fee,
          consultation_fee_paid: false,
          status: 'scheduled',
          chief_complaints: visitData.chief_complaints,
          created_by: currentUserId
        })
        .select(`
          *,
          patient:patients(*),
          doctor:users!patient_visits_doctor_id_fkey(id, full_name, role)
        `)
        .single()

      if (visitError) {
        throw new Error(`Failed to create visit: ${visitError.message}`)
      }

      return visit
    } catch (error) {
      console.error('Error creating visit:', error)
      throw error
    }
  }

  // Get visits by various filters
  async getVisits(filters: {
    patient_id?: string
    doctor_id?: string
    visit_date?: string
    status?: PatientVisit['status']
    limit?: number
    offset?: number
  } = {}): Promise<PatientVisit[]> {
    try {
      const tenantId = await this.getCurrentUserTenantId()

      let query = this.supabase
        .from('patient_visits')
        .select(`
          *,
          patient:patients(*),
          doctor:users!patient_visits_doctor_id_fkey(id, full_name, role)
        `)
        .eq('tenant_id', tenantId)
        .order('visit_date', { ascending: false })
        .order('visit_time', { ascending: false })

      // Apply filters
      if (filters.patient_id) {
        query = query.eq('patient_id', filters.patient_id)
      }
      if (filters.doctor_id) {
        query = query.eq('doctor_id', filters.doctor_id)
      }
      if (filters.visit_date) {
        query = query.eq('visit_date', filters.visit_date)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.limit) {
        query = query.limit(filters.limit)
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      const { data: visits, error } = await query

      if (error) {
        throw new Error(`Failed to fetch visits: ${error.message}`)
      }

      return visits || []
    } catch (error) {
      console.error('Error fetching visits:', error)
      throw error
    }
  }

  // Get today's visits
  async getTodaysVisits(): Promise<PatientVisit[]> {
    const today = new Date().toISOString().split('T')[0]
    return this.getVisits({ visit_date: today })
  }

  // Get visit by ID
  async getVisitById(visitId: string): Promise<PatientVisit | null> {
    try {
      const tenantId = await this.getCurrentUserTenantId()

      const { data: visit, error } = await this.supabase
        .from('patient_visits')
        .select(`
          *,
          patient:patients(*),
          doctor:users!patient_visits_doctor_id_fkey(id, full_name, role)
        `)
        .eq('id', visitId)
        .eq('tenant_id', tenantId)
        .single()

      if (error) {
        throw new Error(`Failed to fetch visit: ${error.message}`)
      }

      return visit
    } catch (error) {
      console.error('Error fetching visit:', error)
      throw error
    }
  }

  // Update visit status
  async updateVisitStatus(data: UpdateVisitStatusData): Promise<PatientVisit> {
    try {
      const tenantId = await this.getCurrentUserTenantId()
      const currentUserId = await this.getCurrentUserId()

      const updateData: Record<string, unknown> = {
        status: data.status,
        updated_by: currentUserId
      }

      // Add notes based on status
      if (data.notes) {
        updateData.visit_notes = data.notes
      }

      const { data: visit, error } = await this.supabase
        .from('patient_visits')
        .update(updateData)
        .eq('id', data.visit_id)
        .eq('tenant_id', tenantId)
        .select(`
          *,
          patient:patients(*),
          doctor:users!patient_visits_doctor_id_fkey(id, full_name, role)
        `)
        .single()

      if (error) {
        throw new Error(`Failed to update visit status: ${error.message}`)
      }

      return visit
    } catch (error) {
      console.error('Error updating visit status:', error)
      throw error
    }
  }

  // Update visit details
  async updateVisit(data: UpdateVisitData): Promise<PatientVisit> {
    try {
      const tenantId = await this.getCurrentUserTenantId()
      const currentUserId = await this.getCurrentUserId()

      const updateData: Record<string, unknown> = {
        updated_by: currentUserId
      }

      // Only update fields that are provided
      if (data.visit_date !== undefined) updateData.visit_date = data.visit_date
      if (data.visit_time !== undefined) updateData.visit_time = data.visit_time
      if (data.visit_type !== undefined) updateData.visit_type = data.visit_type
      if (data.consultation_fee !== undefined) updateData.consultation_fee = data.consultation_fee
      if (data.chief_complaints !== undefined) updateData.chief_complaints = data.chief_complaints

      const { data: visit, error } = await this.supabase
        .from('patient_visits')
        .update(updateData)
        .eq('id', data.visit_id)
        .eq('tenant_id', tenantId)
        .select(`
          *,
          patient:patients(*),
          doctor:users!patient_visits_doctor_id_fkey(id, full_name, role)
        `)
        .single()

      if (error) {
        throw new Error(`Failed to update visit: ${error.message}`)
      }

      return visit
    } catch (error) {
      console.error('Error updating visit:', error)
      throw error
    }
  }

  // Record patient vitals
  async recordVitals(vitalsData: CreateVitalsData): Promise<PatientVitals> {
    try {
      const tenantId = await this.getCurrentUserTenantId()
      const currentUserId = await this.getCurrentUserId()

      const { data: vitals, error } = await this.supabase
        .from('patient_vitals')
        .insert({
          tenant_id: tenantId,
          patient_id: vitalsData.patient_id,
          visit_id: vitalsData.visit_id,
          height_cm: vitalsData.height_cm,
          weight_kg: vitalsData.weight_kg,
          pulse_rate: vitalsData.pulse_rate,
          blood_pressure_systolic: vitalsData.blood_pressure_systolic,
          blood_pressure_diastolic: vitalsData.blood_pressure_diastolic,
          spo2: vitalsData.spo2,
          temperature_celsius: vitalsData.temperature_celsius,
          respiratory_rate: vitalsData.respiratory_rate,
          blood_glucose: vitalsData.blood_glucose,
          notes: vitalsData.notes,
          recorded_by: currentUserId
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to record vitals: ${error.message}`)
      }

      return vitals
    } catch (error) {
      console.error('Error recording vitals:', error)
      throw error
    }
  }

  // Get vitals for a visit
  async getVisitVitals(visitId: string): Promise<PatientVitals[]> {
    try {
      const tenantId = await this.getCurrentUserTenantId()

      const { data: vitals, error } = await this.supabase
        .from('patient_vitals')
        .select('*')
        .eq('visit_id', visitId)
        .eq('tenant_id', tenantId)
        .order('recorded_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch vitals: ${error.message}`)
      }

      return vitals || []
    } catch (error) {
      console.error('Error fetching vitals:', error)
      throw error
    }
  }

  // Get available doctors
  async getAvailableDoctors(): Promise<{ id: string; full_name: string; role: string }[]> {
    try {
      console.log('=== Starting getAvailableDoctors ===')
      
      // Check authentication first
      const { data: { user }, error: authError } = await this.supabase.auth.getUser()
      console.log('Auth check:', { user: user?.id, authError })
      
      if (authError || !user) {
        console.error('Authentication failed:', authError)
        throw new Error('User not authenticated')
      }

      const tenantId = await this.getCurrentUserTenantId()
      console.log('Fetching doctors for tenant:', tenantId)

      const { data: doctors, error } = await this.supabase
        .from('users')
        .select('id, full_name, role, tenant_id, is_active')
        .eq('tenant_id', tenantId)
        .eq('role', 'doctor')
        .eq('is_active', true)
        .order('full_name')

      console.log('Doctor query result:', { doctors, error })
      console.log('Query details:', { tenantId, expectedRole: 'doctor', expectedActive: true })

      if (error) {
        console.error('Doctor query error:', error)
        throw new Error(`Failed to fetch doctors: ${error.message}`)
      }

      console.log('Returning doctors:', doctors || [])
      return doctors || []
    } catch (error) {
      console.error('Error fetching doctors:', error)
      throw error
    }
  }

  // Get visit statistics
  async getVisitStatistics(dateRange?: { from: string; to: string }) {
    try {
      const tenantId = await this.getCurrentUserTenantId()

      let query = this.supabase
        .from('patient_visits')
        .select('status, visit_date, consultation_fee, consultation_fee_paid')
        .eq('tenant_id', tenantId)

      if (dateRange) {
        query = query.gte('visit_date', dateRange.from).lte('visit_date', dateRange.to)
      }

      const { data: visits, error } = await query

      if (error) {
        throw new Error(`Failed to fetch visit statistics: ${error.message}`)
      }

      // Calculate statistics
      const stats = {
        total_visits: visits?.length || 0,
        scheduled: visits?.filter(v => v.status === 'scheduled').length || 0,
        in_progress: visits?.filter(v => v.status === 'in_progress').length || 0,
        completed: visits?.filter(v => v.status === 'completed').length || 0,
        cancelled: visits?.filter(v => v.status === 'cancelled').length || 0,
        total_revenue: visits?.reduce((sum, v) => sum + (v.consultation_fee_paid ? v.consultation_fee : 0), 0) || 0,
        pending_payments: visits?.filter(v => !v.consultation_fee_paid).length || 0
      }

      return stats
    } catch (error) {
      console.error('Error fetching visit statistics:', error)
      throw error
    }
  }

  // Update payment status for a visit
  async updatePaymentStatus(data: { visit_id: string; paid: boolean }): Promise<PatientVisit> {
    try {
      const tenantId = await this.getCurrentUserTenantId()

      const { data: updatedVisit, error } = await this.supabase
        .from('patient_visits')
        .update({ 
          consultation_fee_paid: data.paid,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.visit_id)
        .eq('tenant_id', tenantId)
        .select(`
          *,
          patient:patients (
            id,
            first_name,
            last_name,
            phone,
            uhid,
            age
          ),
          doctor:users!patient_visits_doctor_id_fkey (
            id,
            full_name
          )
        `)
        .single()

      if (error) {
        throw new Error(`Failed to update payment status: ${error.message}`)
      }

      return updatedVisit
    } catch (error) {
      console.error('Error updating payment status:', error)
      throw error
    }
  }

  // Update consultation data for a visit
  async updateVisitConsultation(visitId: string, consultationData: {
    history_of_present_illness: string
    physical_examination: string
    diagnosis: string
    treatment_plan: string
    prescription: string
    general_advice: string
  }): Promise<PatientVisit> {
    try {
      const tenantId = await this.getCurrentUserTenantId()

      const { data: updatedVisit, error } = await this.supabase
        .from('patient_visits')
        .update({ 
          history_of_present_illness: consultationData.history_of_present_illness,
          physical_examination: consultationData.physical_examination,
          diagnosis: consultationData.diagnosis,
          treatment_plan: consultationData.treatment_plan,
          prescription: consultationData.prescription,
          general_advice: consultationData.general_advice,
          updated_at: new Date().toISOString()
        })
        .eq('id', visitId)
        .eq('tenant_id', tenantId)
        .select(`
          *,
          patient:patients (
            id,
            first_name,
            last_name,
            phone,
            uhid,
            age
          ),
          doctor:users!patient_visits_doctor_id_fkey (
            id,
            full_name
          )
        `)
        .single()

      if (error) {
        throw new Error(`Failed to update consultation: ${error.message}`)
      }

      return updatedVisit
    } catch (error) {
      console.error('Error updating consultation:', error)
      throw error
    }
  }

  // Enhanced consultation with structured prescriptions (adapted for existing schema)
  async updateEnhancedConsultation(visitId: string, consultationData: ConsultationData): Promise<PatientVisit> {
    try {
      const tenantId = await this.getCurrentUserTenantId()

      // Update visit with consultation data
      const { data: updatedVisit, error: visitError } = await this.supabase
        .from('patient_visits')
        .update({ 
          history_of_present_illness: consultationData.history_of_present_illness,
          physical_examination: consultationData.physical_examination,
          diagnosis: consultationData.diagnosis,
          treatment_plan: consultationData.treatment_plan,
          general_advice: consultationData.general_advice,
          follow_up_date: consultationData.follow_up_date || null,
          follow_up_instructions: consultationData.follow_up_instructions || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', visitId)
        .eq('tenant_id', tenantId)
        .select(`
          *,
          patient:patients (
            id,
            first_name,
            last_name,
            phone,
            uhid,
            age
          ),
          doctor:users!patient_visits_doctor_id_fkey (
            id,
            full_name
          )
        `)
        .single()

      if (visitError) {
        throw new Error(`Failed to update consultation: ${visitError.message}`)
      }

      // Handle prescriptions if provided
      if (consultationData.prescriptions.length > 0) {
        await this.updateVisitPrescriptions(visitId, consultationData.prescriptions)
      }

      return updatedVisit
    } catch (error) {
      console.error('Error updating enhanced consultation:', error)
      throw error
    }
  }

  // Update prescriptions using existing JSONB schema
  async updateVisitPrescriptions(visitId: string, prescriptions: Prescription[]): Promise<void> {
    try {
      const tenantId = await this.getCurrentUserTenantId()

      // Get visit details
      const { data: visit, error: visitError } = await this.supabase
        .from('patient_visits')
        .select('id, patient_id, doctor_id')
        .eq('id', visitId)
        .eq('tenant_id', tenantId)
        .single()

      if (visitError || !visit) {
        throw new Error('Visit not found')
      }

      // For this implementation, we'll create a consultation without appointment_id
      // since we're working directly with visits
      const { data: existingConsultation, error: consultationError } = await this.supabase
        .from('consultations')
        .select('id')
        .eq('patient_id', visit.patient_id)
        .eq('doctor_id', visit.doctor_id)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      let consultation = existingConsultation

      // Create consultation if it doesn't exist
      if (consultationError || !consultation) {
        const { data: newConsultation, error: createError } = await this.supabase
          .from('consultations')
          .insert({
            patient_id: visit.patient_id,
            doctor_id: visit.doctor_id,
            tenant_id: tenantId,
            status: 'in-progress'
          })
          .select('id')
          .single()

        if (createError) {
          throw new Error(`Failed to create consultation: ${createError.message}`)
        }
        consultation = newConsultation
      }

      // Format prescriptions for JSONB storage
      const medicationsJsonb = prescriptions.map(prescription => ({
        id: prescription.id,
        medicine_name: prescription.medicine_name,
        dosage_amount: prescription.dosage_amount,
        dosage_unit: prescription.dosage_unit,
        frequency_times: prescription.frequency_times,
        timing: prescription.timing,
        food_timing: prescription.food_timing,
        duration_days: prescription.duration_days,
        instructions: prescription.instructions,
        total_quantity: prescription.total_quantity
      }))

      // Insert or update prescription record
      const { error: prescriptionError } = await this.supabase
        .from('prescriptions')
        .upsert({
          consultation_id: consultation.id,
          patient_id: visit.patient_id,
          doctor_id: visit.doctor_id,
          tenant_id: tenantId,
          medications: medicationsJsonb,
          prescription_type: 'digital'
        })

      if (prescriptionError) {
        throw new Error(`Failed to save prescriptions: ${prescriptionError.message}`)
      }
    } catch (error) {
      console.error('Error updating prescriptions:', error)
      throw error
    }
  }

  // Get prescriptions for a visit (adapted for JSONB schema)
  async getVisitPrescriptions(visitId: string): Promise<Prescription[]> {
    try {
      const tenantId = await this.getCurrentUserTenantId()

      // Get visit details
      const { data: visit, error: visitError } = await this.supabase
        .from('patient_visits')
        .select('patient_id, doctor_id')
        .eq('id', visitId)
        .eq('tenant_id', tenantId)
        .single()

      if (visitError || !visit) {
        return [] // Visit not found, return empty array
      }

      // Find consultation for this patient and doctor (most recent)
      const { data: consultation, error: consultationError } = await this.supabase
        .from('consultations')
        .select('id')
        .eq('patient_id', visit.patient_id)
        .eq('doctor_id', visit.doctor_id)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (consultationError || !consultation) {
        return [] // No consultation found, return empty array
      }

      // Get prescriptions for this consultation
      const { data: prescription, error } = await this.supabase
        .from('prescriptions')
        .select('medications')
        .eq('consultation_id', consultation.id)
        .eq('tenant_id', tenantId)
        .single()

      if (error || !prescription || !prescription.medications) {
        return []
      }

      // Convert JSONB medications back to Prescription array
      return prescription.medications as Prescription[]
    } catch (error) {
      console.error('Error fetching prescriptions:', error)
      return []
    }
  }

  // Clear prescriptions (adapted for JSONB schema)
  async clearVisitPrescriptions(visitId: string): Promise<void> {
    try {
      const tenantId = await this.getCurrentUserTenantId()

      // Get visit details
      const { data: visit, error: visitError } = await this.supabase
        .from('patient_visits')
        .select('patient_id, doctor_id')
        .eq('id', visitId)
        .eq('tenant_id', tenantId)
        .single()

      if (visitError || !visit) {
        return // Visit not found
      }

      // Find consultation for this patient and doctor
      const { data: consultation, error: consultationError } = await this.supabase
        .from('consultations')
        .select('id')
        .eq('patient_id', visit.patient_id)
        .eq('doctor_id', visit.doctor_id)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (consultationError || !consultation) {
        return // No consultation found
      }

      // Clear medications in prescription
      const { error } = await this.supabase
        .from('prescriptions')
        .update({ medications: [] })
        .eq('consultation_id', consultation.id)
        .eq('tenant_id', tenantId)

      if (error) {
        throw new Error(`Failed to clear prescriptions: ${error.message}`)
      }
    } catch (error) {
      console.error('Error clearing prescriptions:', error)
      throw error
    }
  }
}

export const visitService = new VisitService()
