# Doctor Availability & Calendar Management System - Implementation Guide

**Project:** Clinic Management System  
**Feature:** Doctor Availability & Calendar Scheduling  
**Date:** August 2, 2025  
**Status:** Implementation Ready

---

## 📋 **Overview**

This document outlines the complete implementation of a doctor availability and calendar management system for the clinic management platform. The system allows doctors to set their availability schedules and enables staff to view and book appointments based on real-time availability.

### **Key Features**

- ✅ **Doctor Availability Management** - Doctors can set weekly schedules
- ✅ **Admin Override** - Admins can manage any doctor's availability
- ✅ **Calendar Views** - Daily and weekly calendar interfaces
- ✅ **Real-time Booking** - Prevent double-booking with availability checks
- ✅ **Mobile Responsive** - Tablet and desktop optimized

---

## 🏗️ **Database Schema Implementation**

### **1. Doctor Availability Table**

```sql
-- Doctor availability schedule table
CREATE TABLE doctor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  -- Schedule Definition
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- Slot Configuration
  slot_duration_minutes INTEGER DEFAULT 30 CHECK (slot_duration_minutes > 0 AND slot_duration_minutes <= 480),
  buffer_time_minutes INTEGER DEFAULT 5 CHECK (buffer_time_minutes >= 0 AND buffer_time_minutes <= 60),
  max_patients_per_slot INTEGER DEFAULT 1 CHECK (max_patients_per_slot > 0),

  -- Availability Status
  is_active BOOLEAN DEFAULT true,
  availability_type VARCHAR(20) DEFAULT 'regular' CHECK (availability_type IN ('regular', 'special', 'break', 'unavailable')),

  -- Date Range (for special schedules/leaves)
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_until DATE,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),

  -- Constraints
  CONSTRAINT valid_time_range CHECK (start_time < end_time),
  CONSTRAINT valid_doctor_role CHECK (
    doctor_id IN (SELECT id FROM users WHERE role = 'doctor' OR role = 'admin')
  )
);

-- Indexes for performance
CREATE INDEX idx_doctor_availability_doctor_day ON doctor_availability(doctor_id, day_of_week);
CREATE INDEX idx_doctor_availability_tenant ON doctor_availability(tenant_id);
CREATE INDEX idx_doctor_availability_active ON doctor_availability(is_active) WHERE is_active = true;
CREATE INDEX idx_doctor_availability_dates ON doctor_availability(effective_from, effective_until);

-- Prevent overlapping schedules for same doctor/day
CREATE UNIQUE INDEX idx_doctor_availability_no_overlap ON doctor_availability(
  doctor_id, day_of_week, start_time, end_time
) WHERE is_active = true;
```

### **2. Doctor Time Slots Table**

```sql
-- Generated time slots for efficient querying and booking
CREATE TABLE doctor_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  availability_id UUID REFERENCES doctor_availability(id) ON DELETE CASCADE NOT NULL,

  -- Slot Details
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- Booking Status
  is_available BOOLEAN DEFAULT true,
  is_booked BOOLEAN DEFAULT false,
  current_bookings INTEGER DEFAULT 0,
  max_bookings INTEGER DEFAULT 1,

  -- References
  visit_id UUID REFERENCES patient_visits(id) ON DELETE SET NULL,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_doctor_slot UNIQUE (doctor_id, slot_date, start_time),
  CONSTRAINT valid_bookings CHECK (current_bookings >= 0 AND current_bookings <= max_bookings),
  CONSTRAINT valid_slot_status CHECK (
    (is_booked = true AND current_bookings > 0) OR
    (is_booked = false AND current_bookings = 0)
  )
);

-- Indexes for efficient querying
CREATE INDEX idx_doctor_slots_date_doctor ON doctor_time_slots(slot_date, doctor_id);
CREATE INDEX idx_doctor_slots_available ON doctor_time_slots(is_available, slot_date) WHERE is_available = true;
CREATE INDEX idx_doctor_slots_visit ON doctor_time_slots(visit_id) WHERE visit_id IS NOT NULL;
CREATE INDEX idx_doctor_slots_tenant_date ON doctor_time_slots(tenant_id, slot_date);
```

### **3. Row Level Security Policies**

```sql
-- Enable RLS on doctor_availability
ALTER TABLE doctor_availability ENABLE ROW LEVEL SECURITY;

-- Doctors can view and edit their own availability, admins can manage all
CREATE POLICY "Doctor availability access" ON doctor_availability
  FOR ALL TO authenticated
  USING (
    tenant_id = (
      SELECT tenant_id FROM users
      WHERE auth_user_id = auth.uid()
    ) AND (
      doctor_id = (
        SELECT id FROM users
        WHERE auth_user_id = auth.uid()
      ) OR
      (
        SELECT role FROM users
        WHERE auth_user_id = auth.uid()
      ) IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM users
      WHERE auth_user_id = auth.uid()
    ) AND (
      doctor_id = (
        SELECT id FROM users
        WHERE auth_user_id = auth.uid()
      ) OR
      (
        SELECT role FROM users
        WHERE auth_user_id = auth.uid()
      ) IN ('admin', 'manager')
    )
  );

-- Enable RLS on doctor_time_slots
ALTER TABLE doctor_time_slots ENABLE ROW LEVEL SECURITY;

-- Users can view time slots in their tenant
CREATE POLICY "Time slots view access" ON doctor_time_slots
  FOR SELECT TO authenticated
  USING (
    tenant_id = (
      SELECT tenant_id FROM users
      WHERE auth_user_id = auth.uid()
    )
  );

-- Receptionists and admins can book/modify slots
CREATE POLICY "Time slots booking access" ON doctor_time_slots
  FOR UPDATE TO authenticated
  USING (
    tenant_id = (
      SELECT tenant_id FROM users
      WHERE auth_user_id = auth.uid()
    ) AND
    (
      SELECT role FROM users
      WHERE auth_user_id = auth.uid()
    ) IN ('admin', 'manager', 'receptionist')
  )
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM users
      WHERE auth_user_id = auth.uid()
    ) AND
    (
      SELECT role FROM users
      WHERE auth_user_id = auth.uid()
    ) IN ('admin', 'manager', 'receptionist')
  );
```

### **4. Database Functions**

```sql
-- Function to generate time slots based on availability
CREATE OR REPLACE FUNCTION generate_time_slots_for_availability(
  p_availability_id UUID,
  p_days_ahead INTEGER DEFAULT 90
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  availability_record RECORD;
  current_date DATE;
  end_date DATE;
  slot_start_minutes INTEGER;
  slot_end_minutes INTEGER;
  current_slot_start INTEGER;
  total_slot_time INTEGER;
  slots_created INTEGER := 0;
BEGIN
  -- Get availability details
  SELECT * INTO availability_record
  FROM doctor_availability
  WHERE id = p_availability_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Calculate date range
  current_date := GREATEST(availability_record.effective_from, CURRENT_DATE);
  end_date := LEAST(
    COALESCE(availability_record.effective_until, current_date + p_days_ahead),
    current_date + p_days_ahead
  );

  -- Convert times to minutes for easier calculation
  slot_start_minutes := EXTRACT(HOUR FROM availability_record.start_time) * 60 +
                        EXTRACT(MINUTE FROM availability_record.start_time);
  slot_end_minutes := EXTRACT(HOUR FROM availability_record.end_time) * 60 +
                      EXTRACT(MINUTE FROM availability_record.end_time);
  total_slot_time := availability_record.slot_duration_minutes + availability_record.buffer_time_minutes;

  -- Generate slots for each matching day
  WHILE current_date <= end_date LOOP
    IF EXTRACT(DOW FROM current_date) = availability_record.day_of_week THEN
      current_slot_start := slot_start_minutes;

      WHILE current_slot_start + availability_record.slot_duration_minutes <= slot_end_minutes LOOP
        -- Insert time slot
        INSERT INTO doctor_time_slots (
          tenant_id,
          doctor_id,
          availability_id,
          slot_date,
          start_time,
          end_time,
          max_bookings
        ) VALUES (
          availability_record.tenant_id,
          availability_record.doctor_id,
          availability_record.id,
          current_date,
          (current_slot_start / 60)::INTEGER || ':' ||
          LPAD((current_slot_start % 60)::TEXT, 2, '0'),
          ((current_slot_start + availability_record.slot_duration_minutes) / 60)::INTEGER || ':' ||
          LPAD(((current_slot_start + availability_record.slot_duration_minutes) % 60)::TEXT, 2, '0'),
          availability_record.max_patients_per_slot
        )
        ON CONFLICT (doctor_id, slot_date, start_time) DO NOTHING;

        current_slot_start := current_slot_start + total_slot_time;
        slots_created := slots_created + 1;
      END LOOP;
    END IF;

    current_date := current_date + 1;
  END LOOP;

  RETURN slots_created;
END;
$$;

-- Function to book a time slot atomically
CREATE OR REPLACE FUNCTION book_time_slot(
  p_slot_id UUID,
  p_visit_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  slot_record RECORD;
BEGIN
  -- Lock and check slot availability
  SELECT * INTO slot_record
  FROM doctor_time_slots
  WHERE id = p_slot_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Time slot not found';
  END IF;

  IF NOT slot_record.is_available OR slot_record.is_booked THEN
    RETURN FALSE; -- Slot not available
  END IF;

  IF slot_record.current_bookings >= slot_record.max_bookings THEN
    RETURN FALSE; -- Slot fully booked
  END IF;

  -- Book the slot
  UPDATE doctor_time_slots
  SET
    is_booked = true,
    is_available = false,
    current_bookings = current_bookings + 1,
    visit_id = p_visit_id,
    updated_at = NOW()
  WHERE id = p_slot_id;

  RETURN TRUE;
END;
$$;

-- Function to cancel a booking
CREATE OR REPLACE FUNCTION cancel_time_slot_booking(
  p_slot_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE doctor_time_slots
  SET
    is_booked = false,
    is_available = true,
    current_bookings = GREATEST(current_bookings - 1, 0),
    visit_id = NULL,
    updated_at = NOW()
  WHERE id = p_slot_id;

  RETURN FOUND;
END;
$$;
```

---

## 🔧 **TypeScript Types & Interfaces**

### **Core Type Definitions**

```typescript
// /src/types/availability.ts

export interface DoctorAvailability {
  id: string;
  tenant_id: string;
  doctor_id: string;
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sunday = 0
  start_time: string; // HH:MM format
  end_time: string;
  slot_duration_minutes: number;
  buffer_time_minutes: number;
  max_patients_per_slot: number;
  is_active: boolean;
  availability_type: "regular" | "special" | "break" | "unavailable";
  effective_from: string; // ISO date
  effective_until?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;

  // Joined data
  doctor?: {
    id: string;
    full_name: string;
    role: string;
  };
}

export interface DoctorTimeSlot {
  id: string;
  tenant_id: string;
  doctor_id: string;
  availability_id: string;
  slot_date: string; // ISO date
  start_time: string; // HH:MM format
  end_time: string;
  is_available: boolean;
  is_booked: boolean;
  current_bookings: number;
  max_bookings: number;
  visit_id?: string;
  created_at: string;
  updated_at: string;

  // Joined data
  doctor?: {
    id: string;
    full_name: string;
  };
  visit?: {
    id: string;
    patient: {
      first_name: string;
      last_name: string;
      uhid: string;
    };
  };
}

export interface AvailabilityCreateForm {
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  buffer_time_minutes?: number;
  max_patients_per_slot?: number;
  availability_type?: "regular" | "special" | "break";
  effective_from?: string;
  effective_until?: string;
  notes?: string;
}

export interface CalendarViewSettings {
  view: "daily" | "weekly";
  selectedDate: Date;
  selectedDoctors: string[]; // Empty array = all doctors
  showAvailable: boolean;
  showBooked: boolean;
  showBreaks: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: "available" | "booked" | "break" | "unavailable";
  doctorId: string;
  doctorName: string;
  patientName?: string;
  visitId?: string;
  slotId?: string;
}

export interface TimeSlotBookingRequest {
  slot_id: string;
  visit_id: string;
}

export interface AvailabilityStats {
  totalSlots: number;
  availableSlots: number;
  bookedSlots: number;
  utilizationRate: number;
}
```

---

## 🛠️ **Service Layer Implementation**

### **Doctor Availability Service**

```typescript
// /src/lib/services/doctor-availability-service.ts

import { createClient } from "@/lib/supabase/client";
import type {
  DoctorAvailability,
  AvailabilityCreateForm,
  DoctorTimeSlot,
  TimeSlotBookingRequest,
  AvailabilityStats,
} from "@/types/availability";

class DoctorAvailabilityService {
  private supabase = createClient();

  // Get current user's tenant ID and role
  private async getCurrentUserInfo() {
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser();
    if (error || !user) throw new Error("User not authenticated");

    const { data: userData, error: userError } = await this.supabase
      .from("users")
      .select("id, tenant_id, role")
      .eq("auth_user_id", user.id)
      .single();

    if (userError || !userData) throw new Error("User data not found");
    return userData;
  }

  // Create availability schedule
  async createAvailability(
    data: AvailabilityCreateForm
  ): Promise<DoctorAvailability> {
    const userInfo = await this.getCurrentUserInfo();

    // Permission check: doctors can only set their own, admins can set for anyone
    if (userInfo.role === "doctor" && data.doctor_id !== userInfo.id) {
      throw new Error("Doctors can only set their own availability");
    }

    // Check for conflicting availability
    const { data: existingAvailability, error: checkError } =
      await this.supabase
        .from("doctor_availability")
        .select("id")
        .eq("doctor_id", data.doctor_id)
        .eq("day_of_week", data.day_of_week)
        .eq("is_active", true)
        .or(
          `and(start_time.lte.${data.end_time},end_time.gte.${data.start_time})`
        );

    if (checkError)
      throw new Error(
        `Failed to check existing availability: ${checkError.message}`
      );

    if (existingAvailability && existingAvailability.length > 0) {
      throw new Error("This time slot overlaps with existing availability");
    }

    const { data: availability, error } = await this.supabase
      .from("doctor_availability")
      .insert({
        ...data,
        tenant_id: userInfo.tenant_id,
        created_by: userInfo.id,
      })
      .select(
        `
        *,
        doctor:users!doctor_id(id, full_name, role)
      `
      )
      .single();

    if (error)
      throw new Error(`Failed to create availability: ${error.message}`);

    // Generate time slots for the next 90 days
    await this.generateTimeSlots(availability.id, 90);

    return availability;
  }

  // Get doctor's availability
  async getDoctorAvailability(doctorId: string): Promise<DoctorAvailability[]> {
    const userInfo = await this.getCurrentUserInfo();

    const { data, error } = await this.supabase
      .from("doctor_availability")
      .select(
        `
        *,
        doctor:users!doctor_id(id, full_name, role)
      `
      )
      .eq("tenant_id", userInfo.tenant_id)
      .eq("doctor_id", doctorId)
      .eq("is_active", true)
      .order("day_of_week")
      .order("start_time");

    if (error) throw new Error(`Failed to get availability: ${error.message}`);
    return data || [];
  }

  // Get all doctors' availability
  async getAllDoctorsAvailability(): Promise<DoctorAvailability[]> {
    const userInfo = await this.getCurrentUserInfo();

    const { data, error } = await this.supabase
      .from("doctor_availability")
      .select(
        `
        *,
        doctor:users!doctor_id(id, full_name, role)
      `
      )
      .eq("tenant_id", userInfo.tenant_id)
      .eq("is_active", true)
      .order("doctor.full_name")
      .order("day_of_week")
      .order("start_time");

    if (error)
      throw new Error(`Failed to get all availability: ${error.message}`);
    return data || [];
  }

  // Generate time slots using database function
  private async generateTimeSlots(
    availabilityId: string,
    daysAhead: number = 90
  ): Promise<number> {
    const { data, error } = await this.supabase.rpc(
      "generate_time_slots_for_availability",
      {
        p_availability_id: availabilityId,
        p_days_ahead: daysAhead,
      }
    );

    if (error)
      throw new Error(`Failed to generate time slots: ${error.message}`);
    return data || 0;
  }

  // Get available time slots for booking
  async getAvailableSlots(
    doctorId: string,
    startDate: string,
    endDate: string
  ): Promise<DoctorTimeSlot[]> {
    const userInfo = await this.getCurrentUserInfo();

    const { data, error } = await this.supabase
      .from("doctor_time_slots")
      .select(
        `
        *,
        doctor:users!doctor_id(id, full_name),
        visit:patient_visits(
          id,
          patient:patients(first_name, last_name, uhid)
        )
      `
      )
      .eq("tenant_id", userInfo.tenant_id)
      .eq("doctor_id", doctorId)
      .gte("slot_date", startDate)
      .lte("slot_date", endDate)
      .order("slot_date")
      .order("start_time");

    if (error) throw new Error(`Failed to get time slots: ${error.message}`);
    return data || [];
  }

  // Get available slots for all doctors
  async getAllDoctorsSlots(
    startDate: string,
    endDate: string,
    doctorIds?: string[]
  ): Promise<DoctorTimeSlot[]> {
    const userInfo = await this.getCurrentUserInfo();

    let query = this.supabase
      .from("doctor_time_slots")
      .select(
        `
        *,
        doctor:users!doctor_id(id, full_name),
        visit:patient_visits(
          id,
          patient:patients(first_name, last_name, uhid)
        )
      `
      )
      .eq("tenant_id", userInfo.tenant_id)
      .gte("slot_date", startDate)
      .lte("slot_date", endDate);

    if (doctorIds && doctorIds.length > 0) {
      query = query.in("doctor_id", doctorIds);
    }

    const { data, error } = await query.order("slot_date").order("start_time");

    if (error) throw new Error(`Failed to get time slots: ${error.message}`);
    return data || [];
  }

  // Book a time slot
  async bookTimeSlot(slotId: string, visitId: string): Promise<boolean> {
    const { data, error } = await this.supabase.rpc("book_time_slot", {
      p_slot_id: slotId,
      p_visit_id: visitId,
    });

    if (error) throw new Error(`Failed to book slot: ${error.message}`);
    return data === true;
  }

  // Cancel booking
  async cancelBooking(slotId: string): Promise<boolean> {
    const { data, error } = await this.supabase.rpc(
      "cancel_time_slot_booking",
      {
        p_slot_id: slotId,
      }
    );

    if (error) throw new Error(`Failed to cancel booking: ${error.message}`);
    return data === true;
  }

  // Update availability
  async updateAvailability(
    id: string,
    updates: Partial<AvailabilityCreateForm>
  ): Promise<DoctorAvailability> {
    const userInfo = await this.getCurrentUserInfo();

    const { data, error } = await this.supabase
      .from("doctor_availability")
      .update({
        ...updates,
        updated_by: userInfo.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        `
        *,
        doctor:users!doctor_id(id, full_name, role)
      `
      )
      .single();

    if (error)
      throw new Error(`Failed to update availability: ${error.message}`);

    // Regenerate slots if schedule changed
    if (
      updates.start_time ||
      updates.end_time ||
      updates.slot_duration_minutes
    ) {
      await this.regenerateSlotsForAvailability(id);
    }

    return data;
  }

  // Delete availability
  async deleteAvailability(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("doctor_availability")
      .update({ is_active: false })
      .eq("id", id);

    if (error)
      throw new Error(`Failed to delete availability: ${error.message}`);
  }

  // Get availability statistics
  async getAvailabilityStats(
    doctorId: string,
    startDate: string,
    endDate: string
  ): Promise<AvailabilityStats> {
    const userInfo = await this.getCurrentUserInfo();

    const { data, error } = await this.supabase
      .from("doctor_time_slots")
      .select("is_available, is_booked")
      .eq("tenant_id", userInfo.tenant_id)
      .eq("doctor_id", doctorId)
      .gte("slot_date", startDate)
      .lte("slot_date", endDate);

    if (error) throw new Error(`Failed to get stats: ${error.message}`);

    const totalSlots = data?.length || 0;
    const availableSlots =
      data?.filter((slot) => slot.is_available && !slot.is_booked).length || 0;
    const bookedSlots = data?.filter((slot) => slot.is_booked).length || 0;
    const utilizationRate =
      totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;

    return {
      totalSlots,
      availableSlots,
      bookedSlots,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
    };
  }

  // Get doctors with roles
  async getDoctors(): Promise<any[]> {
    const userInfo = await this.getCurrentUserInfo();

    const { data, error } = await this.supabase
      .from("users")
      .select("id, full_name, role")
      .eq("tenant_id", userInfo.tenant_id)
      .eq("role", "doctor")
      .order("full_name");

    if (error) throw new Error(`Failed to get doctors: ${error.message}`);
    return data || [];
  }

  private async regenerateSlotsForAvailability(availabilityId: string) {
    // Delete future unbooked slots
    await this.supabase
      .from("doctor_time_slots")
      .delete()
      .eq("availability_id", availabilityId)
      .eq("is_booked", false)
      .gte("slot_date", new Date().toISOString().split("T")[0]);

    // Generate new slots
    await this.generateTimeSlots(availabilityId, 90);
  }
}

export const doctorAvailabilityService = new DoctorAvailabilityService();
```

---

## 🎨 **UI Components Implementation**

### **1. Doctor Availability Form Component**

```typescript
// /src/components/scheduling/doctor-availability-form.tsx
'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Clock, User } from 'lucide-react'
import { doctorAvailabilityService } from '@/lib/services/doctor-availability-service'
import type { AvailabilityCreateForm, DoctorAvailability } from '@/types/availability'

interface DoctorAvailabilityFormProps {
  doctorId?: string // If not provided, show doctor selector for admins
  onAvailabilityUpdated?: () => void
}

export function DoctorAvailabilityForm({
  doctorId,
  onAvailabilityUpdated
}: DoctorAvailabilityFormProps) {
  const [loading, setLoading] = useState(false)
  const [doctors, setDoctors] = useState<any[]>([])
  const [existingAvailability, setExistingAvailability] = useState<DoctorAvailability[]>([])
  const [formData, setFormData] = useState<AvailabilityCreateForm>({
    doctor_id: doctorId || '',
    day_of_week: 1, // Monday
    start_time: '09:00',
    end_time: '17:00',
    slot_duration_minutes: 30,
    buffer_time_minutes: 5,
    max_patients_per_slot: 1,
    availability_type: 'regular'
  })

  const dayNames = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday',
    'Thursday', 'Friday', 'Saturday'
  ]

  useEffect(() => {
    loadInitialData()
  }, [doctorId])

  useEffect(() => {
    if (formData.doctor_id) {
      loadExistingAvailability(formData.doctor_id)
    }
  }, [formData.doctor_id])

  const loadInitialData = async () => {
    try {
      if (!doctorId) {
        // Load doctors for admin selection
        const doctorsList = await doctorAvailabilityService.getDoctors()
        setDoctors(doctorsList)
      }
    } catch (error) {
      console.error('Error loading initial data:', error)
    }
  }

  const loadExistingAvailability = async (selectedDoctorId: string) => {
    try {
      const availability = await doctorAvailabilityService.getDoctorAvailability(selectedDoctorId)
      setExistingAvailability(availability)
    } catch (error) {
      console.error('Error loading existing availability:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await doctorAvailabilityService.createAvailability(formData)
      onAvailabilityUpdated?.()

      // Refresh existing availability
      await loadExistingAvailability(formData.doctor_id)

      // Reset form partially
      setFormData(prev => ({
        ...prev,
        day_of_week: 1,
        start_time: '09:00',
        end_time: '17:00'
      }))

      alert('Availability schedule created successfully!')
    } catch (error) {
      console.error('Error creating availability:', error)
      alert(error instanceof Error ? error.message : 'Failed to create availability')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAvailability = async (availabilityId: string) => {
    if (!confirm('Are you sure you want to delete this availability schedule?')) {
      return
    }

    try {
      await doctorAvailabilityService.deleteAvailability(availabilityId)
      await loadExistingAvailability(formData.doctor_id)
      onAvailabilityUpdated?.()
      alert('Availability schedule deleted successfully!')
    } catch (error) {
      console.error('Error deleting availability:', error)
      alert('Failed to delete availability schedule')
    }
  }

  return (
    <div className="space-y-6">
      {/* Create New Availability */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Plus className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">
            Add Availability Schedule
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Doctor Selection (for admins) */}
          {!doctorId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="w-4 h-4 inline mr-1" />
                Select Doctor
              </label>
              <select
                value={formData.doctor_id}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  doctor_id: e.target.value
                }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Choose a doctor...</option>
                {doctors.map(doctor => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Day of Week */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Day of Week
            </label>
            <select
              value={formData.day_of_week}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                day_of_week: parseInt(e.target.value)
              }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {dayNames.map((day, index) => (
                <option key={index} value={index}>{day}</option>
              ))}
            </select>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  start_time: e.target.value
                }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  end_time: e.target.value
                }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Slot Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="w-4 h-4 inline mr-1" />
                Slot Duration
              </label>
              <select
                value={formData.slot_duration_minutes}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  slot_duration_minutes: parseInt(e.target.value)
                }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buffer Time
              </label>
              <select
                value={formData.buffer_time_minutes || 5}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  buffer_time_minutes: parseInt(e.target.value)
                }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>No buffer</option>
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
              </select>
            </div>
          </div>

          {/* Max Patients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maximum Patients per Slot
            </label>
            <select
              value={formData.max_patients_per_slot || 1}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                max_patients_per_slot: parseInt(e.target.value)
              }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>1 patient</option>
              <option value={2}>2 patients</option>
              <option value={3}>3 patients</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                notes: e.target.value
              }))}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any special notes about this availability..."
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !formData.doctor_id}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating Schedule...' : 'Add Availability'}
          </button>
        </form>
      </div>

      {/* Existing Availability List */}
      {existingAvailability.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Current Availability Schedule</h4>
          <div className="space-y-3">
            {existingAvailability.map((availability) => (
              <div
                key={availability.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <span className="font-medium text-blue-600">
                      {dayNames[availability.day_of_week]}
                    </span>
                    <span className="text-gray-600">
                      {availability.start_time} - {availability.end_time}
                    </span>
                    <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">
                      {availability.slot_duration_minutes}min slots
                    </span>
                    {availability.max_patients_per_slot > 1 && (
                      <span className="text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded">
                        Max {availability.max_patients_per_slot} patients
                      </span>
                    )}
                  </div>
                  {availability.notes && (
                    <p className="text-sm text-gray-500 mt-1">{availability.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteAvailability(availability.id)}
                  className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded transition-colors"
                  title="Delete availability"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## 📅 **Step-by-Step Implementation Plan**

### **Phase 1: Database Setup** (Day 1-2)

1. Create database tables
2. Set up Row Level Security policies
3. Create database functions
4. Test database operations

### **Phase 2: Service Layer** (Day 3-4)

1. Implement TypeScript types
2. Create availability service
3. Test service methods
4. Add error handling

### **Phase 3: UI Components** (Day 5-7)

1. Build availability form component
2. Create calendar view component
3. Implement responsive design
4. Add user interaction handlers

### **Phase 4: Integration** (Day 8-9)

1. Connect to existing visit system
2. Update visit creation flow
3. Add booking validation
4. Test end-to-end workflow

### **Phase 5: Testing & Polish** (Day 10)

1. User acceptance testing
2. Performance optimization
3. Bug fixes and refinements
4. Documentation updates

---

## ✅ **Implementation Checklist**

### **Database**

- [ ] Create `doctor_availability` table
- [ ] Create `doctor_time_slots` table
- [ ] Set up RLS policies
- [ ] Create database functions
- [ ] Add indexes for performance
- [ ] Test data operations

### **Backend Services**

- [ ] Create TypeScript types
- [ ] Implement availability service
- [ ] Add error handling
- [ ] Write unit tests
- [ ] Test service integration

### **Frontend Components**

- [ ] Build availability form
- [ ] Create calendar view
- [ ] Add responsive design
- [ ] Implement user interactions
- [ ] Add loading states

### **Integration**

- [ ] Connect to visit system
- [ ] Update booking flow
- [ ] Add conflict detection
- [ ] Test permissions
- [ ] Validate workflows

### **Testing**

- [ ] End-to-end testing
- [ ] Performance testing
- [ ] Mobile responsive testing
- [ ] User acceptance testing
- [ ] Security testing

---

**Ready to begin implementation? Let's start with Phase 1: Database Setup!**
