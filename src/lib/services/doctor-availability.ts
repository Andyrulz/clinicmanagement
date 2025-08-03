// Doctor Availability Service
// Service layer for managing doctor availability and time slots
// Date: August 2, 2025

import { createClient } from '@/lib/supabase/client';
import type {
  DoctorTimeSlot,
  DoctorTimeSlotWithDetails,
  CreateAvailabilityRequest,
  UpdateAvailabilityRequest,
  GenerateSlotsRequest,
  BookSlotRequest,
  CancelBookingRequest,
  GetAvailableSlotsRequest,
  AvailabilityResponse,
  AvailabilitiesResponse,
  TimeSlotsResponse,
  GenerateSlotsResponse,
  BookingResponse,
  AvailabilityStats,
  DoctorAvailabilityStats
} from '@/types/doctor-availability';

export class DoctorAvailabilityService {
  private supabase = createClient();

  // =================================================================
  // AVAILABILITY MANAGEMENT
  // =================================================================

  /**
   * Create a new doctor availability schedule
   */
  async createAvailability(request: CreateAvailabilityRequest): Promise<AvailabilityResponse> {
    try {
      console.log('🔐 SERVICE: Starting createAvailability with request:', request);
      
      // Get the current user's tenant_id
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      console.log('👤 AUTH: User check result:', { user: user?.id, error: authError });
      
      if (authError || !user) {
        console.log('❌ AUTH: User not authenticated');
        return { success: false, error: 'User not authenticated' };
      }

      // Get the user's profile to get tenant_id
      console.log('👤 PROFILE: Fetching user profile for auth_user_id:', user.id);
      const { data: profile, error: profileError } = await this.supabase
        .from('users')
        .select('id, tenant_id')
        .eq('auth_user_id', user.id)
        .single();

      console.log('👤 PROFILE: Profile fetch result:', { profile, error: profileError });

      if (profileError || !profile) {
        console.log('❌ PROFILE: Could not get user profile');
        return { success: false, error: 'Could not get user profile' };
      }

      const insertData = {
        tenant_id: profile.tenant_id, // Add the missing tenant_id
        doctor_id: request.doctor_id,
        day_of_week: request.day_of_week,
        start_time: request.start_time,
        end_time: request.end_time,
        slot_duration_minutes: request.slot_duration_minutes ?? 30,
        buffer_time_minutes: request.buffer_time_minutes ?? 5,
        max_patients_per_slot: request.max_patients_per_slot ?? 1,
        availability_type: request.availability_type ?? 'regular',
        effective_from: request.effective_from,
        effective_until: request.effective_until,
        notes: request.notes,
        created_by: profile.id,
        updated_by: profile.id
      };

      console.log('💾 DATABASE: Inserting data:', insertData);

      const { data, error } = await this.supabase
        .from('doctor_availability')
        .insert(insertData)
        .select()
        .single();

      console.log('💾 DATABASE: Insert result:', { data, error });

      if (error) {
        console.log('❌ DATABASE: Insert failed with error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ SERVICE: Successfully created availability:', data);
      return { success: true, data };
    } catch (error) {
      console.error('💥 SERVICE: Unexpected error in createAvailability:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Update an existing doctor availability schedule
   */
  async updateAvailability(request: UpdateAvailabilityRequest): Promise<AvailabilityResponse> {
    try {
      const { id, ...updateData } = request;
      
      const { data, error } = await this.supabase
        .from('doctor_availability')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Delete a doctor availability schedule
   */
  async deleteAvailability(availabilityId: string): Promise<AvailabilityResponse> {
    try {
      const { data, error } = await this.supabase
        .from('doctor_availability')
        .delete()
        .eq('id', availabilityId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get doctor availability schedules
   */
  async getDoctorAvailability(
    doctorId?: string,
    dayOfWeek?: number,
    isActive: boolean = true
  ): Promise<AvailabilitiesResponse> {
    try {
      let query = this.supabase
        .from('doctor_availability')
        .select(`
          *,
          doctor:users!doctor_id (
            id,
            full_name,
            email,
            role
          )
        `)
        .eq('is_active', isActive)
        .order('day_of_week')
        .order('start_time');

      if (doctorId) {
        query = query.eq('doctor_id', doctorId);
      }

      if (dayOfWeek !== undefined) {
        query = query.eq('day_of_week', dayOfWeek);
      }

      const { data, error } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // =================================================================
  // TIME SLOT MANAGEMENT
  // =================================================================

  /**
   * Generate time slots for a doctor based on their availability
   */
  async generateTimeSlots(request: GenerateSlotsRequest): Promise<GenerateSlotsResponse> {
    try {
      const { data, error } = await this.supabase
        .rpc('generate_doctor_time_slots', {
          p_doctor_id: request.doctor_id,
          p_start_date: request.start_date,
          p_end_date: request.end_date
        });

      if (error) {
        return { success: false, error: error.message };
      }

      // Get doctor name for response
      const { data: doctorData } = await this.supabase
        .from('users')
        .select('full_name')
        .eq('id', request.doctor_id)
        .single();

      return { 
        success: true, 
        data: [{
          doctor_id: request.doctor_id,
          doctor_name: doctorData?.full_name || 'Unknown Doctor',
          slots_created: data || 0
        }]
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Generate time slots for all doctors
   */
  async generateTimeSlotsForAllDoctors(
    startDate: string,
    endDate: string
  ): Promise<GenerateSlotsResponse> {
    try {
      const { data, error } = await this.supabase
        .rpc('generate_slots_for_all_doctors', {
          p_start_date: startDate,
          p_end_date: endDate
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get available time slots for a doctor
   */
  async getAvailableSlots(request: GetAvailableSlotsRequest): Promise<TimeSlotsResponse> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_available_slots', {
          p_doctor_id: request.doctor_id,
          p_start_date: request.start_date,
          p_end_date: request.end_date
        });

      if (error) {
        return { success: false, error: error.message };
      }

      // Transform the data to match our interface
      const transformedData: DoctorTimeSlotWithDetails[] = data?.map((slot: Record<string, unknown>) => ({
        id: slot.slot_id as string,
        tenant_id: '', // Will be filled by RLS
        doctor_id: request.doctor_id,
        availability_id: '', // Not returned by the function
        slot_date: slot.slot_date as string,
        start_time: slot.start_time as string,
        end_time: slot.end_time as string,
        is_available: true,
        is_booked: false,
        current_bookings: 0,
        max_bookings: (slot.available_bookings as number) + 0, // Assuming this calculation
        visit_id: null,
        created_at: '',
        updated_at: '',
        doctor: {
          id: request.doctor_id,
          full_name: slot.doctor_name as string,
          email: ''
        },
        availability: {
          id: '',
          availability_type: 'regular',
          slot_duration_minutes: 30
        }
      })) || [];

      return { success: true, data: transformedData };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get time slots with full details
   */
  async getTimeSlots(
    doctorId?: string,
    startDate?: string,
    endDate?: string,
    isAvailable?: boolean
  ): Promise<TimeSlotsResponse> {
    try {
      let query = this.supabase
        .from('doctor_time_slots')
        .select(`
          *,
          doctor:users!doctor_id (
            id,
            full_name,
            email
          ),
          availability:doctor_availability!availability_id (
            id,
            availability_type,
            slot_duration_minutes
          ),
          visit:patient_visits!visit_id (
            id,
            visit_number,
            patient:patients!patient_id (
              first_name,
              last_name
            )
          )
        `)
        .order('slot_date')
        .order('start_time');

      if (doctorId) {
        query = query.eq('doctor_id', doctorId);
      }

      if (startDate) {
        query = query.gte('slot_date', startDate);
      }

      if (endDate) {
        query = query.lte('slot_date', endDate);
      }

      if (isAvailable !== undefined) {
        query = query.eq('is_available', isAvailable);
      }

      const { data, error } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      // Transform the data to include patient name
      const transformedData: DoctorTimeSlotWithDetails[] = data?.map((slot: Record<string, unknown>) => ({
        ...slot,
        visit: slot.visit ? {
          id: (slot.visit as Record<string, unknown>).id as string,
          visit_number: (slot.visit as Record<string, unknown>).visit_number as string,
          patient_name: `${((slot.visit as Record<string, unknown>).patient as Record<string, unknown>)?.first_name || ''} ${((slot.visit as Record<string, unknown>).patient as Record<string, unknown>)?.last_name || ''}`.trim()
        } : null
      })) as DoctorTimeSlotWithDetails[] || [];

      return { success: true, data: transformedData };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // =================================================================
  // BOOKING MANAGEMENT
  // =================================================================

  /**
   * Book a time slot for a patient visit
   */
  async bookTimeSlot(request: BookSlotRequest): Promise<BookingResponse> {
    try {
      const { data, error } = await this.supabase
        .rpc('book_time_slot', {
          p_slot_id: request.slot_id,
          p_visit_id: request.visit_id
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        data: {
          slot_id: request.slot_id,
          visit_id: request.visit_id,
          booked: data || false
        }
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Cancel a time slot booking
   */
  async cancelBooking(request: CancelBookingRequest): Promise<BookingResponse> {
    try {
      const { data, error } = await this.supabase
        .rpc('cancel_time_slot_booking', {
          p_slot_id: request.slot_id,
          p_visit_id: request.visit_id
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        data: {
          slot_id: request.slot_id,
          visit_id: request.visit_id,
          booked: !(data || false)
        }
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // =================================================================
  // ANALYTICS AND STATS
  // =================================================================

  /**
   * Get availability statistics
   */
  async getAvailabilityStats(
    startDate?: string,
    endDate?: string
  ): Promise<{ success: boolean; data?: AvailabilityStats; error?: string }> {
    try {
      // Get total doctors with availability
      const { data: doctorsData, error: doctorsError } = await this.supabase
        .from('users')
        .select('id')
        .eq('role', 'doctor')
        .eq('is_active', true);

      if (doctorsError) {
        return { success: false, error: doctorsError.message };
      }

      const totalDoctors = doctorsData?.length || 0;

      // Get doctors with availability in the period
      const { data: availabilityData, error: availabilityError } = await this.supabase
        .from('doctor_availability')
        .select('doctor_id')
        .eq('is_active', true);

      if (availabilityError) {
        return { success: false, error: availabilityError.message };
      }

      const doctorsWithAvailability = new Set(availabilityData?.map(a => a.doctor_id)).size;

      // Get slot statistics
      const { data: slotsData, error: slotsError } = await this.supabase
        .from('doctor_time_slots')
        .select('current_bookings, max_bookings')
        .gte('slot_date', startDate || 'CURRENT_DATE')
        .lte('slot_date', endDate || 'CURRENT_DATE + INTERVAL \'7 days\'');

      if (slotsError) {
        return { success: false, error: slotsError.message };
      }

      const totalSlots = slotsData?.length || 0;
      const bookedSlots = slotsData?.filter(s => s.current_bookings > 0).length || 0;
      const availableSlots = totalSlots - bookedSlots;
      const bookingRate = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;

      const stats: AvailabilityStats = {
        total_doctors: totalDoctors,
        doctors_with_availability: doctorsWithAvailability,
        total_slots_this_week: totalSlots,
        booked_slots_this_week: bookedSlots,
        available_slots_this_week: availableSlots,
        booking_rate_percentage: Math.round(bookingRate * 100) / 100
      };

      return { success: true, data: stats };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get availability statistics per doctor
   */
  async getDoctorStats(
    startDate?: string,
    endDate?: string
  ): Promise<{ success: boolean; data?: DoctorAvailabilityStats[]; error?: string }> {
    try {
      const { data: doctorsData, error: doctorsError } = await this.supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'doctor')
        .eq('is_active', true);

      if (doctorsError) {
        return { success: false, error: doctorsError.message };
      }

      const doctorStats: DoctorAvailabilityStats[] = [];

      for (const doctor of doctorsData || []) {
        // Get slots for this doctor
        let query = this.supabase
          .from('doctor_time_slots')
          .select('current_bookings, max_bookings, slot_date, start_time')
          .eq('doctor_id', doctor.id);

        if (startDate) query = query.gte('slot_date', startDate);
        if (endDate) query = query.lte('slot_date', endDate);

        const { data: slotsData } = await query;

        const totalSlots = slotsData?.length || 0;
        const bookedSlots = slotsData?.filter(s => s.current_bookings > 0).length || 0;
        const availableSlots = totalSlots - bookedSlots;
        const bookingRate = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;

        // Find next available slot
        const { data: nextSlotData } = await this.supabase
          .from('doctor_time_slots')
          .select('slot_date, start_time')
          .eq('doctor_id', doctor.id)
          .eq('is_available', true)
          .lt('current_bookings', this.supabase.from('doctor_time_slots').select('max_bookings'))
          .gte('slot_date', 'CURRENT_DATE')
          .order('slot_date')
          .order('start_time')
          .limit(1)
          .single();

        const nextAvailableSlot = nextSlotData 
          ? `${nextSlotData.slot_date}T${nextSlotData.start_time}`
          : undefined;

        doctorStats.push({
          doctor_id: doctor.id,
          doctor_name: doctor.full_name,
          total_slots: totalSlots,
          booked_slots: bookedSlots,
          available_slots: availableSlots,
          booking_rate: Math.round(bookingRate * 100) / 100,
          next_available_slot: nextAvailableSlot
        });
      }

      return { success: true, data: doctorStats };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // =================================================================
  // UTILITY METHODS
  // =================================================================

  /**
   * Check if a time slot is available for booking
   */
  async isSlotAvailable(slotId: string): Promise<{ available: boolean; reason?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('doctor_time_slots')
        .select('is_available, current_bookings, max_bookings')
        .eq('id', slotId)
        .single();

      if (error || !data) {
        return { available: false, reason: 'Slot not found' };
      }

      if (!data.is_available) {
        return { available: false, reason: 'Slot is not available' };
      }

      if (data.current_bookings >= data.max_bookings) {
        return { available: false, reason: 'Slot is fully booked' };
      }

      return { available: true };
    } catch (error) {
      return { 
        available: false, 
        reason: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get doctor's next available slot
   */
  async getNextAvailableSlot(doctorId: string): Promise<DoctorTimeSlot | null> {
    try {
      const { data, error } = await this.supabase
        .from('doctor_time_slots')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('is_available', true)
        .lt('current_bookings', this.supabase.from('doctor_time_slots').select('max_bookings'))
        .gte('slot_date', 'CURRENT_DATE')
        .order('slot_date')
        .order('start_time')
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }
}

// Export a singleton instance
export const doctorAvailabilityService = new DoctorAvailabilityService();
