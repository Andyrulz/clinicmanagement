// Appointment Service
// Enhanced appointment scheduling service that integrates with existing systems
// Integrates with: doctor-availability.ts, patient-service.ts, visit system
// Date: August 2, 2025

import { createClient } from '@/lib/supabase/client';
import { DoctorAvailabilityService } from './doctor-availability';
import type {
  Appointment,
  AppointmentWithDetails,
  AppointmentSlotWithDetails,
  CalendarEvent,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  CancelAppointmentRequest,
  GetAppointmentsRequest,
  GetAvailableSlotsRequest,
  AppointmentResponse,
  AppointmentsResponse,
  SlotsResponse,
  CalendarEventsResponse,
  AppointmentStatsResponse,
  SlotValidationResult,
  AppointmentStatus,
  CalendarFilter
} from '@/types/appointment';

export class AppointmentService {
  private supabase = createClient();
  private doctorAvailabilityService = new DoctorAvailabilityService();

  // =================================================================
  // APPOINTMENT MANAGEMENT
  // =================================================================

  /**
   * Create a new appointment and integrate with existing visit system
   */
  async createAppointment(request: CreateAppointmentRequest): Promise<AppointmentResponse> {
    try {
      console.log('🔐 SERVICE: Starting createAppointment with request:', request);
      
      // Get the current user's tenant_id
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      console.log('👤 AUTH: User check result:', { user: user?.id, error: authError });
      
      if (authError || !user) {
        console.log('❌ AUTH: User not authenticated');
        return { success: false, error: 'User not authenticated' };
      }

      // Get the user's profile to get tenant_id
      const { data: profile, error: profileError } = await this.supabase
        .from('users')
        .select('id, tenant_id, role')
        .eq('auth_user_id', user.id)
        .single();

      if (profileError || !profile) {
        console.log('❌ PROFILE: User profile not found');
        return { success: false, error: 'User profile not found' };
      }

      // 1. Validate appointment slot availability
      const validationResult = await this.validateAppointmentSlot(
        request.doctor_id,
        request.appointment_date,
        request.appointment_time,
        request.duration_minutes || 30
      );

      if (!validationResult.isValid) {
        return { 
          success: false, 
          error: `Appointment slot not available: ${validationResult.conflicts.map(c => c.patient_name).join(', ')}` 
        };
      }

      // 2. Create appointment record (extends patient_visits)
      const appointmentData = {
        tenant_id: profile.tenant_id,
        patient_id: request.patient_id,
        doctor_id: request.doctor_id,
        
        // Enhanced scheduling fields
        scheduled_date: request.appointment_date,
        scheduled_time: request.appointment_time,
        duration_minutes: request.duration_minutes || 30,
        
        // Appointment-specific fields (new columns)
        appointment_status: 'scheduled' as const,
        appointment_source: request.appointment_source || 'manual' as const,
        appointment_type: request.appointment_type || 'consultation' as const,
        priority: request.priority || 'normal' as const,
        
        // Clinical details
        chief_complaints: request.chief_complaint,
        visit_type: request.appointment_type === 'follow_up' ? 'follow_up' : 'new_patient',
        
        // Fee management
        consultation_fee: request.consultation_fee || 0,
        paid_amount: 0,
        payment_status: 'pending' as const,
        
        // Additional notes
        notes: request.notes,
        special_instructions: request.special_instructions,
        
        // Reminder flags
        reminder_24h_sent: false,
        reminder_2h_sent: false,
        reminder_30min_sent: false,
        
        // Visit workflow fields
        status: 'scheduled' as const,
        created_by: profile.id
      };

      // 3. Create patient visit with appointment data
      const { data: visit, error: visitError } = await this.supabase
        .from('patient_visits')
        .insert(appointmentData)
        .select(`
          *,
          patient:patients(*),
          doctor:users!doctor_id(*)
        `)
        .single();

      if (visitError) {
        console.log('❌ VISIT: Failed to create patient visit:', visitError);
        return { success: false, error: `Failed to create appointment: ${visitError.message}` };
      }

      // 4. Create appointment slot entry
      const slotData = {
        tenant_id: profile.tenant_id,
        doctor_id: request.doctor_id,
        slot_date: request.appointment_date,
        slot_time: request.appointment_time,
        duration_minutes: request.duration_minutes || 30,
        is_available: false,
        is_booked: true,
        is_blocked: false,
        patient_id: request.patient_id,
        visit_id: visit.id,
        appointment_id: visit.id, // Using visit ID as appointment ID
        booking_notes: request.notes
      };

      const { data: slot, error: slotError } = await this.supabase
        .from('appointment_slots')
        .insert(slotData)
        .select()
        .single();

      if (slotError) {
        console.log('⚠️ SLOT: Failed to create appointment slot (continuing anyway):', slotError);
        // Don't fail the appointment creation if slot creation fails
      }

      // 5. Schedule automated reminders (if enabled)
      await this.scheduleAppointmentReminders(visit.id);

      console.log('✅ SUCCESS: Appointment created successfully:', visit.id);
      return { 
        success: true, 
        data: {
          ...visit,
          appointment_date: visit.scheduled_date,
          appointment_time: visit.scheduled_time,
          slot_id: slot?.id
        } as Appointment
      };

    } catch (error) {
      console.error('❌ ERROR: Failed to create appointment:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Update an existing appointment
   */
  async updateAppointment(request: UpdateAppointmentRequest): Promise<AppointmentResponse> {
    try {
      const { id, ...updateData } = request;
      
      // If rescheduling, validate new slot
      if (updateData.appointment_date || updateData.appointment_time) {
        const appointment = await this.getAppointmentById(id);
        if (!appointment.success || !appointment.data) {
          return { success: false, error: 'Appointment not found' };
        }

        const validationResult = await this.validateAppointmentSlot(
          appointment.data.doctor_id,
          updateData.appointment_date || appointment.data.appointment_date,
          updateData.appointment_time || appointment.data.appointment_time,
          updateData.duration_minutes || appointment.data.duration_minutes,
          id // Exclude current appointment from conflict check
        );

        if (!validationResult.isValid) {
          return { 
            success: false, 
            error: `New appointment slot not available: ${validationResult.conflicts.map(c => c.patient_name).join(', ')}` 
          };
        }
      }

      // Map appointment fields to visit fields
      const visitUpdateData: Record<string, string | number | boolean> = {};
      
      if (updateData.appointment_date) visitUpdateData.scheduled_date = updateData.appointment_date;
      if (updateData.appointment_time) visitUpdateData.scheduled_time = updateData.appointment_time;
      if (updateData.duration_minutes) visitUpdateData.duration_minutes = updateData.duration_minutes;
      if (updateData.chief_complaint) visitUpdateData.chief_complaints = updateData.chief_complaint;
      if (updateData.status) {
        visitUpdateData.appointment_status = updateData.status;
        // Map appointment status to visit status
        if (updateData.status === 'in_progress') visitUpdateData.status = 'in_progress';
        if (updateData.status === 'completed') visitUpdateData.status = 'completed';
        if (updateData.status === 'cancelled') visitUpdateData.status = 'cancelled';
      }
      if (updateData.payment_status) visitUpdateData.payment_status = updateData.payment_status;
      if (updateData.paid_amount !== undefined) visitUpdateData.paid_amount = updateData.paid_amount;
      if (updateData.notes) visitUpdateData.notes = updateData.notes;
      if (updateData.consultation_fee !== undefined) visitUpdateData.consultation_fee = updateData.consultation_fee;

      visitUpdateData.updated_at = new Date().toISOString();

      const { data, error } = await this.supabase
        .from('patient_visits')
        .update(visitUpdateData)
        .eq('id', id)
        .select(`
          *,
          patient:patients(*),
          doctor:users!doctor_id(*)
        `)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Update appointment slot if scheduling changed
      if (updateData.appointment_date || updateData.appointment_time) {
        await this.updateAppointmentSlot(id, {
          slot_date: updateData.appointment_date || data.scheduled_date,
          slot_time: updateData.appointment_time || data.scheduled_time,
          duration_minutes: updateData.duration_minutes || data.duration_minutes
        });
      }

      return { 
        success: true, 
        data: {
          ...data,
          appointment_date: data.scheduled_date,
          appointment_time: data.scheduled_time
        } as Appointment
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(request: CancelAppointmentRequest): Promise<AppointmentResponse> {
    try {
      const { data, error } = await this.supabase
        .from('patient_visits')
        .update({
          appointment_status: 'cancelled',
          status: 'cancelled',
          cancellation_reason: request.reason,
          cancelled_by: request.cancelled_by,
          cancelled_at: new Date().toISOString(),
          refund_amount: request.refund_amount || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.appointment_id)
        .select(`
          *,
          patient:patients(*),
          doctor:users!doctor_id(*)
        `)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Free up the appointment slot
      await this.freeAppointmentSlot(request.appointment_id);

      // Cancel scheduled reminders
      await this.cancelAppointmentReminders(request.appointment_id);

      return { 
        success: true, 
        data: {
          ...data,
          appointment_date: data.scheduled_date,
          appointment_time: data.scheduled_time
        } as Appointment
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get appointments with filters
   */
  async getAppointments(request: GetAppointmentsRequest = {}): Promise<AppointmentsResponse> {
    try {
      // Get the current user's tenant_id
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data: profile, error: profileError } = await this.supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single();

      if (profileError || !profile) {
        return { success: false, error: 'User profile not found' };
      }

      let query = this.supabase
        .from('patient_visits')
        .select(`
          *,
          patient:patients(*),
          doctor:users!doctor_id(*)
        `)
        .eq('tenant_id', profile.tenant_id)
        .not('scheduled_date', 'is', null)
        .not('scheduled_time', 'is', null);

      // Apply filters
      if (request.doctor_id) {
        query = query.eq('doctor_id', request.doctor_id);
      }

      if (request.patient_id) {
        query = query.eq('patient_id', request.patient_id);
      }

      if (request.start_date) {
        query = query.gte('scheduled_date', request.start_date);
      }

      if (request.end_date) {
        query = query.lte('scheduled_date', request.end_date);
      }

      if (request.status && request.status.length > 0) {
        query = query.in('appointment_status', request.status);
      }

      // Apply pagination
      if (request.limit) {
        query = query.limit(request.limit);
      }

      if (request.offset) {
        query = query.range(request.offset, (request.offset + (request.limit || 50)) - 1);
      }

      // Order by date and time
      query = query.order('scheduled_date', { ascending: true })
                  .order('scheduled_time', { ascending: true });

      const { data, error, count } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      // Transform data to appointment format
      const appointments: AppointmentWithDetails[] = (data || []).map(visit => ({
        id: visit.id,
        tenant_id: visit.tenant_id,
        patient_id: visit.patient_id,
        doctor_id: visit.doctor_id,
        appointment_date: visit.scheduled_date,
        appointment_time: visit.scheduled_time,
        duration_minutes: visit.duration_minutes || 30,
        chief_complaint: visit.chief_complaints,
        appointment_type: visit.appointment_type || 'consultation',
        appointment_source: visit.appointment_source || 'manual',
        status: visit.appointment_status || visit.status || 'scheduled',
        priority: visit.priority || 'normal',
        visit_id: visit.id,
        reminder_24h_sent: visit.reminder_24h_sent || false,
        reminder_2h_sent: visit.reminder_2h_sent || false,
        reminder_30min_sent: visit.reminder_30min_sent || false,
        consultation_fee: visit.consultation_fee || 0,
        paid_amount: visit.paid_amount || 0,
        payment_status: visit.payment_status || 'pending',
        notes: visit.notes,
        special_instructions: visit.special_instructions,
        created_at: visit.created_at,
        updated_at: visit.updated_at,
        created_by: visit.created_by,
        patient: visit.patient,
        doctor: visit.doctor,
        visit: {
          id: visit.id,
          visit_number: visit.visit_number,
          status: visit.status
        }
      }));

      const pagination = request.limit ? {
        total: count || 0,
        limit: request.limit,
        offset: request.offset || 0,
        hasMore: (count || 0) > (request.offset || 0) + (request.limit || 0)
      } : undefined;

      return { 
        success: true, 
        data: appointments,
        pagination
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get a single appointment by ID
   */
  async getAppointmentById(id: string): Promise<AppointmentResponse> {
    try {
      const { data, error } = await this.supabase
        .from('patient_visits')
        .select(`
          *,
          patient:patients(*),
          doctor:users!doctor_id(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      const appointment: Appointment = {
        id: data.id,
        tenant_id: data.tenant_id,
        patient_id: data.patient_id,
        doctor_id: data.doctor_id,
        appointment_date: data.scheduled_date,
        appointment_time: data.scheduled_time,
        duration_minutes: data.duration_minutes || 30,
        chief_complaint: data.chief_complaints,
        appointment_type: data.appointment_type || 'consultation',
        appointment_source: data.appointment_source || 'manual',
        status: data.appointment_status || data.status || 'scheduled',
        priority: data.priority || 'normal',
        visit_id: data.id,
        reminder_24h_sent: data.reminder_24h_sent || false,
        reminder_2h_sent: data.reminder_2h_sent || false,
        reminder_30min_sent: data.reminder_30min_sent || false,
        consultation_fee: data.consultation_fee || 0,
        paid_amount: data.paid_amount || 0,
        payment_status: data.payment_status || 'pending',
        notes: data.notes,
        special_instructions: data.special_instructions,
        created_at: data.created_at,
        updated_at: data.updated_at,
        created_by: data.created_by
      };

      return { success: true, data: appointment };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // =================================================================
  // CALENDAR INTEGRATION
  // =================================================================

  /**
   * Get calendar events for display
   */
  async getCalendarEvents(filter: CalendarFilter): Promise<CalendarEventsResponse> {
    try {
      // Get appointments
      const appointmentsResponse = await this.getAppointments({
        doctor_id: filter.doctorIds?.[0],
        start_date: filter.dateRange.start,
        end_date: filter.dateRange.end,
        status: filter.status
      });

      if (!appointmentsResponse.success) {
        return { success: false, error: appointmentsResponse.error };
      }

      // Convert appointments to calendar events
      const events: CalendarEvent[] = (appointmentsResponse.data || []).map(appointment => {
        const startDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
        const endDateTime = new Date(startDateTime.getTime() + (appointment.duration_minutes * 60000));

        return {
          id: appointment.id,
          title: `${appointment.patient.first_name} ${appointment.patient.last_name}`,
          start: startDateTime,
          end: endDateTime,
          type: 'appointment',
          status: appointment.status,
          backgroundColor: this.getStatusColor(appointment.status),
          borderColor: this.getStatusColor(appointment.status),
          textColor: '#FFFFFF',
          appointmentId: appointment.id,
          patientId: appointment.patient_id,
          doctorId: appointment.doctor_id,
          patientName: `${appointment.patient.first_name} ${appointment.patient.last_name}`,
          doctorName: appointment.doctor.full_name,
          phone: appointment.patient.phone,
          chiefComplaint: appointment.chief_complaint,
          clickable: true,
          editable: true
        };
      });

      // Get available slots if requested
      if (filter.doctorIds && filter.doctorIds.length === 1) {
        const availableSlots = await this.getAvailableSlots({
          doctor_id: filter.doctorIds[0],
          date: filter.dateRange.start
        });

        if (availableSlots.success && availableSlots.data) {
          const availabilityEvents: CalendarEvent[] = availableSlots.data
            .filter(slot => slot.is_available && !slot.is_booked)
            .map(slot => {
              const startDateTime = new Date(`${slot.slot_date}T${slot.slot_time}`);
              const endDateTime = new Date(startDateTime.getTime() + (slot.duration_minutes * 60000));

              return {
                id: `slot-${slot.id}`,
                title: 'Available',
                start: startDateTime,
                end: endDateTime,
                type: 'available',
                status: 'scheduled',
                backgroundColor: '#E5F3FF',
                borderColor: '#3B82F6',
                textColor: '#1E40AF',
                doctorId: slot.doctor_id,
                doctorName: slot.doctor.full_name,
                slotId: slot.id,
                clickable: true,
                editable: false
              };
            });

          events.push(...availabilityEvents);
        }
      }

      return { success: true, data: events };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get appointment statistics for dashboard
   */
  async getAppointmentStats(doctorId?: string, date?: string): Promise<AppointmentStatsResponse> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const weekStart = new Date(targetDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const monthStart = new Date(targetDate);
      monthStart.setDate(1);

      // Get the current user's tenant_id
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data: profile, error: profileError } = await this.supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single();

      if (profileError || !profile) {
        return { success: false, error: 'User profile not found' };
      }

      let baseQuery = this.supabase
        .from('patient_visits')
        .select('appointment_status, scheduled_date, created_at')
        .eq('tenant_id', profile.tenant_id)
        .not('scheduled_date', 'is', null);

      if (doctorId) {
        baseQuery = baseQuery.eq('doctor_id', doctorId);
      }

      // Today's appointments
      const { data: todayData } = await baseQuery
        .eq('scheduled_date', targetDate);

      // This week's appointments
      const { data: weekData } = await baseQuery
        .gte('scheduled_date', weekStart.toISOString().split('T')[0]);

      // This month's appointments
      const { data: monthData } = await baseQuery
        .gte('scheduled_date', monthStart.toISOString().split('T')[0]);

      const stats = {
        today: todayData?.length || 0,
        waiting: todayData?.filter(a => a.appointment_status === 'waiting').length || 0,
        engaged: todayData?.filter(a => a.appointment_status === 'in_progress').length || 0,
        completed: todayData?.filter(a => a.appointment_status === 'completed').length || 0,
        cancelled: todayData?.filter(a => a.appointment_status === 'cancelled').length || 0,
        totalThisWeek: weekData?.length || 0,
        totalThisMonth: monthData?.length || 0
      };

      return { success: true, data: stats };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // =================================================================
  // SLOT MANAGEMENT
  // =================================================================

  /**
   * Get available appointment slots for a doctor and date
   */
  async getAvailableSlots(request: GetAvailableSlotsRequest): Promise<SlotsResponse> {
    try {
      // Use the new appointment_slots table
      const { data, error } = await this.supabase
        .from('appointment_slots')
        .select(`
          *,
          doctor:users!doctor_id(id, full_name),
          patient:patients(id, first_name, last_name, phone),
          appointment:patient_visits!visit_id(id, appointment_status, chief_complaints)
        `)
        .eq('doctor_id', request.doctor_id)
        .eq('slot_date', request.date)
        .order('slot_time');

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data as AppointmentSlotWithDetails[] };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Generate appointment slots for a doctor's availability
   */
  async generateAppointmentSlots(doctorId: string, date: string): Promise<SlotsResponse> {
    try {
      // Use the database function created in our schema
      const { data, error } = await this.supabase
        .rpc('generate_appointment_slots', {
          p_doctor_id: doctorId,
          p_date: date
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // =================================================================
  // VALIDATION AND UTILITIES
  // =================================================================

  /**
   * Validate if an appointment slot is available
   */
  private async validateAppointmentSlot(
    doctorId: string,
    date: string,
    time: string,
    duration: number,
    excludeAppointmentId?: string
  ): Promise<SlotValidationResult> {
    try {
      // Check for time conflicts with existing appointments
      const endTime = this.addMinutesToTime(time, duration);
      
      let conflictQuery = this.supabase
        .from('patient_visits')
        .select(`
          id,
          scheduled_time,
          duration_minutes,
          patient:patients!patient_id(first_name, last_name)
        `)
        .eq('doctor_id', doctorId)
        .eq('scheduled_date', date)
        .not('appointment_status', 'in', '(cancelled,no_show)')
        .not('scheduled_time', 'is', null);

      if (excludeAppointmentId) {
        conflictQuery = conflictQuery.neq('id', excludeAppointmentId);
      }

      const { data: conflicts, error } = await conflictQuery;

      if (error) {
        throw error;
      }

      // Check for time overlaps
      const conflictingAppointments = (conflicts || []).filter(appointment => {
        const existingStart = appointment.scheduled_time;
        const existingEnd = this.addMinutesToTime(existingStart, appointment.duration_minutes || 30);
        
        return this.timesOverlap(time, endTime, existingStart, existingEnd);
      });

      // Check doctor availability using existing service
      const availabilityResponse = await this.doctorAvailabilityService.getAvailableSlots({
        doctor_id: doctorId,
        start_date: date,
        end_date: date
      });

      const doctorAvailable = availabilityResponse.success && 
        (availabilityResponse.data || []).some(slot => 
          slot.slot_date === date && 
          slot.start_time <= time && 
          slot.end_time >= endTime &&
          slot.is_available
        );

      return {
        isValid: conflictingAppointments.length === 0 && doctorAvailable,
        conflicts: conflictingAppointments.map(conflict => ({
          appointment_id: conflict.id,
          patient_name: Array.isArray(conflict.patient) 
            ? `${conflict.patient[0]?.first_name || ''} ${conflict.patient[0]?.last_name || ''}`.trim() || 'Unknown Patient'
            : 'Unknown Patient',
          time_overlap: true
        })),
        doctorAvailable,
        slotExists: true
      };
    } catch {
      return {
        isValid: false,
        conflicts: [],
        doctorAvailable: false,
        slotExists: false
      };
    }
  }

  /**
   * Update appointment slot when appointment is modified
   */
  private async updateAppointmentSlot(appointmentId: string, slotData: {
    slot_date: string;
    slot_time: string;
    duration_minutes: number;
  }): Promise<void> {
    try {
      await this.supabase
        .from('appointment_slots')
        .update(slotData)
        .eq('appointment_id', appointmentId);
    } catch (error) {
      console.error('Failed to update appointment slot:', error);
    }
  }

  /**
   * Free up appointment slot when appointment is cancelled
   */
  private async freeAppointmentSlot(appointmentId: string): Promise<void> {
    try {
      await this.supabase
        .from('appointment_slots')
        .update({
          is_available: true,
          is_booked: false,
          patient_id: null,
          visit_id: null,
          appointment_id: null,
          booking_notes: null
        })
        .eq('appointment_id', appointmentId);
    } catch (error) {
      console.error('Failed to free appointment slot:', error);
    }
  }

  /**
   * Schedule appointment reminders (placeholder for WhatsApp integration)
   */
  private async scheduleAppointmentReminders(appointmentId: string): Promise<void> {
    try {
      // This would integrate with your WhatsApp reminder system
      // For now, just log that reminders should be scheduled
      console.log(`📅 REMINDER: Scheduling reminders for appointment ${appointmentId}`);
      
      // TODO: Implement WhatsApp reminder scheduling
      // await whatsappReminderService.scheduleAppointmentReminders(appointmentId);
    } catch (error) {
      console.error('Failed to schedule appointment reminders:', error);
    }
  }

  /**
   * Cancel appointment reminders when appointment is cancelled
   */
  private async cancelAppointmentReminders(appointmentId: string): Promise<void> {
    try {
      console.log(`📅 REMINDER: Cancelling reminders for appointment ${appointmentId}`);
      
      // TODO: Implement WhatsApp reminder cancellation
      // await whatsappReminderService.cancelAppointmentReminders(appointmentId);
    } catch (error) {
      console.error('Failed to cancel appointment reminders:', error);
    }
  }

  // =================================================================
  // UTILITY METHODS
  // =================================================================

  private getStatusColor(status: AppointmentStatus): string {
    const colors = {
      scheduled: '#3B82F6',    // Blue
      confirmed: '#10B981',    // Green
      waiting: '#F59E0B',      // Yellow
      in_progress: '#8B5CF6',  // Purple
      completed: '#6B7280',    // Gray
      cancelled: '#EF4444',    // Red
      no_show: '#DC2626'       // Dark Red
    };
    return colors[status] || '#9CA3AF';
  }

  private addMinutesToTime(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  }

  private timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    return start1 < end2 && start2 < end1;
  }

  private getCurrentUserInfo = async () => {
    const { data: { user }, error } = await this.supabase.auth.getUser();
    if (error || !user) throw new Error('User not authenticated');

    const { data: userData, error: userError } = await this.supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (userError || !userData) throw new Error('User data not found');
    return userData;
  };
}

// Export singleton instance
export const appointmentService = new AppointmentService();
