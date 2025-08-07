-- Enhanced Calendar & Appointment System - Database Schema
-- SQL Script to extend existing system with appointment scheduling
-- Date: August 4, 2025
-- Integration Strategy: Build on existing doctor_availability and patient_visits tables

-- =================================================================
-- STEP 1: EXTEND EXISTING PATIENT_VISITS TABLE FOR APPOINTMENTS
-- =================================================================

-- Add appointment scheduling columns to existing patient_visits table
-- These integrate seamlessly with your existing visit workflow
DO $$ 
BEGIN
    -- Add appointment scheduling columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patient_visits' AND column_name = 'scheduled_date') THEN
        ALTER TABLE patient_visits ADD COLUMN scheduled_date date;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patient_visits' AND column_name = 'scheduled_time') THEN
        ALTER TABLE patient_visits ADD COLUMN scheduled_time time;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patient_visits' AND column_name = 'duration_minutes') THEN
        ALTER TABLE patient_visits ADD COLUMN duration_minutes integer DEFAULT 30;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patient_visits' AND column_name = 'appointment_status') THEN
        ALTER TABLE patient_visits ADD COLUMN appointment_status text DEFAULT 'scheduled';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patient_visits' AND column_name = 'appointment_source') THEN
        ALTER TABLE patient_visits ADD COLUMN appointment_source text DEFAULT 'manual'; -- 'manual', 'online', 'whatsapp'
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patient_visits' AND column_name = 'time_slot_id') THEN
        ALTER TABLE patient_visits ADD COLUMN time_slot_id uuid REFERENCES doctor_time_slots(id);
    END IF;
    
    -- Add constraints for appointment status
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'patient_visits_appointment_status_check') THEN
        ALTER TABLE patient_visits ADD CONSTRAINT patient_visits_appointment_status_check 
        CHECK (appointment_status IN ('scheduled', 'confirmed', 'waiting', 'in_progress', 'completed', 'cancelled', 'no_show'));
    END IF;
    
    -- Add constraint for appointment source
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'patient_visits_appointment_source_check') THEN
        ALTER TABLE patient_visits ADD CONSTRAINT patient_visits_appointment_source_check 
        CHECK (appointment_source IN ('manual', 'online', 'whatsapp', 'phone'));
    END IF;
END $$;

-- =================================================================
-- STEP 2: CREATE APPOINTMENT SLOTS TABLE (INTEGRATES WITH EXISTING DOCTOR_TIME_SLOTS)
-- =================================================================

-- Create appointment slots table that works with your existing doctor_availability system
CREATE TABLE IF NOT EXISTS appointment_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  availability_id uuid REFERENCES doctor_availability(id) ON DELETE CASCADE,
  
  -- Slot timing (15-minute precision like Cliniify)
  slot_date date NOT NULL,
  slot_time time NOT NULL,
  duration_minutes integer DEFAULT 15 CHECK (duration_minutes IN (15, 30, 45, 60)),
  
  -- Booking status
  is_booked boolean DEFAULT false,
  is_blocked boolean DEFAULT false, -- For admin blocking slots
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  visit_id uuid REFERENCES patient_visits(id) ON DELETE SET NULL,
  
  -- Appointment details
  status text DEFAULT 'available' CHECK (status IN ('available', 'booked', 'blocked', 'completed', 'cancelled')),
  booking_notes text,
  
  -- Integration with existing WhatsApp reminders (for future use)
  reminder_24h_sent boolean DEFAULT false,
  reminder_2h_sent boolean DEFAULT false,
  reminder_30min_sent boolean DEFAULT false,
  
  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES users(id),
  updated_by uuid REFERENCES users(id),
  
  -- Unique constraint to prevent double booking
  CONSTRAINT unique_doctor_slot_time UNIQUE (doctor_id, slot_date, slot_time)
);

-- =================================================================
-- STEP 3: CREATE INDEXES FOR APPOINTMENT PERFORMANCE
-- =================================================================

-- Indexes for enhanced patient_visits appointment columns
CREATE INDEX IF NOT EXISTS idx_patient_visits_scheduled_date ON patient_visits(scheduled_date) WHERE scheduled_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patient_visits_appointment_status ON patient_visits(appointment_status);
CREATE INDEX IF NOT EXISTS idx_patient_visits_time_slot ON patient_visits(time_slot_id) WHERE time_slot_id IS NOT NULL;

-- Indexes for appointment_slots
CREATE INDEX IF NOT EXISTS idx_appointment_slots_doctor_date ON appointment_slots(doctor_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_appointment_slots_tenant_date ON appointment_slots(tenant_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_appointment_slots_status ON appointment_slots(status);
CREATE INDEX IF NOT EXISTS idx_appointment_slots_available ON appointment_slots(doctor_id, slot_date, status) WHERE status = 'available';
CREATE INDEX IF NOT EXISTS idx_appointment_slots_patient ON appointment_slots(patient_id) WHERE patient_id IS NOT NULL;

-- =================================================================
-- STEP 4: CREATE CALENDAR VIEW FOR EFFICIENT QUERIES
-- =================================================================

-- Create a view that combines appointment data for calendar display
CREATE OR REPLACE VIEW calendar_appointments AS
SELECT 
    pv.id as visit_id,
    pv.tenant_id,
    pv.patient_id,
    pv.doctor_id,
    pv.visit_number,
    pv.scheduled_date,
    pv.scheduled_time,
    pv.duration_minutes,
    pv.appointment_status,
    pv.appointment_source,
    pv.chief_complaints,
    
    -- Patient details
    p.first_name || ' ' || p.last_name as patient_name,
    p.phone as patient_phone,
    p.email as patient_email,
    
    -- Doctor details
    u.full_name as doctor_name,
    u.email as doctor_email,
    
    -- Timing details
    pv.scheduled_date + pv.scheduled_time as appointment_datetime,
    pv.scheduled_date + pv.scheduled_time + (pv.duration_minutes || ' minutes')::interval as appointment_end_datetime,
    
    -- Status indicators
    CASE 
        WHEN pv.appointment_status = 'scheduled' THEN '#3B82F6'  -- Blue
        WHEN pv.appointment_status = 'confirmed' THEN '#10B981'  -- Green
        WHEN pv.appointment_status = 'waiting' THEN '#F59E0B'    -- Yellow
        WHEN pv.appointment_status = 'in_progress' THEN '#8B5CF6' -- Purple
        WHEN pv.appointment_status = 'completed' THEN '#6B7280'  -- Gray
        WHEN pv.appointment_status = 'cancelled' THEN '#EF4444'  -- Red
        WHEN pv.appointment_status = 'no_show' THEN '#DC2626'    -- Dark Red
        ELSE '#9CA3AF'
    END as status_color,
    
    pv.created_at,
    pv.updated_at
FROM patient_visits pv
JOIN patients p ON pv.patient_id = p.id
JOIN users u ON pv.doctor_id = u.id
WHERE pv.scheduled_date IS NOT NULL 
  AND pv.scheduled_time IS NOT NULL
ORDER BY pv.scheduled_date, pv.scheduled_time;

-- =================================================================
-- STEP 5: CREATE FUNCTIONS FOR APPOINTMENT MANAGEMENT
-- =================================================================

-- Function to generate 15-minute appointment slots for a doctor's availability
CREATE OR REPLACE FUNCTION generate_appointment_slots(
    p_doctor_id uuid,
    p_date date,
    p_tenant_id uuid DEFAULT NULL
) RETURNS TABLE (
    slot_time time,
    is_available boolean,
    is_booked boolean,
    existing_appointment_id uuid
) AS $$
DECLARE
    availability_record RECORD;
    current_time time;
    slot_duration interval := '15 minutes';
BEGIN
    -- Get doctor's availability for the given day
    FOR availability_record IN 
        SELECT da.*, EXTRACT(dow FROM p_date) as target_dow
        FROM doctor_availability da
        WHERE da.doctor_id = p_doctor_id
        AND (p_tenant_id IS NULL OR da.tenant_id = p_tenant_id)
        AND da.is_active = true
        AND da.day_of_week = EXTRACT(dow FROM p_date)
        AND (da.effective_from IS NULL OR da.effective_from <= p_date)
        AND (da.effective_until IS NULL OR da.effective_until >= p_date)
    LOOP
        -- Generate 15-minute slots within the availability window
        current_time := availability_record.start_time;
        
        WHILE current_time < availability_record.end_time LOOP
            RETURN QUERY 
            SELECT 
                current_time as slot_time,
                true as is_available,
                EXISTS(
                    SELECT 1 FROM patient_visits pv 
                    WHERE pv.doctor_id = p_doctor_id 
                    AND pv.scheduled_date = p_date 
                    AND pv.scheduled_time = current_time
                    AND pv.appointment_status NOT IN ('cancelled', 'no_show')
                ) as is_booked,
                (
                    SELECT pv.id FROM patient_visits pv 
                    WHERE pv.doctor_id = p_doctor_id 
                    AND pv.scheduled_date = p_date 
                    AND pv.scheduled_time = current_time
                    AND pv.appointment_status NOT IN ('cancelled', 'no_show')
                    LIMIT 1
                ) as existing_appointment_id;
                
            current_time := current_time + slot_duration;
        END LOOP;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to check appointment conflicts
CREATE OR REPLACE FUNCTION check_appointment_conflict(
    p_doctor_id uuid,
    p_date date,
    p_time time,
    p_duration_minutes integer DEFAULT 30,
    p_exclude_visit_id uuid DEFAULT NULL
) RETURNS boolean AS $$
DECLARE
    conflict_count integer;
    end_time time;
BEGIN
    end_time := p_time + (p_duration_minutes || ' minutes')::interval;
    
    SELECT COUNT(*) INTO conflict_count
    FROM patient_visits pv
    WHERE pv.doctor_id = p_doctor_id
    AND pv.scheduled_date = p_date
    AND pv.appointment_status NOT IN ('cancelled', 'no_show')
    AND (p_exclude_visit_id IS NULL OR pv.id != p_exclude_visit_id)
    AND (
        -- Check for overlapping appointments
        (pv.scheduled_time < end_time AND 
         (pv.scheduled_time + (COALESCE(pv.duration_minutes, 30) || ' minutes')::interval) > p_time)
    );
    
    RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- STEP 6: CREATE ROW LEVEL SECURITY POLICIES
-- =================================================================

-- Enable RLS on appointment_slots
ALTER TABLE appointment_slots ENABLE ROW LEVEL SECURITY;

-- Policy for appointment_slots - users can only see slots in their tenant
CREATE POLICY appointment_slots_tenant_policy ON appointment_slots
    FOR ALL USING (
        tenant_id IN (
            SELECT t.id FROM tenants t
            JOIN user_tenants ut ON t.id = ut.tenant_id
            WHERE ut.user_id = auth.uid()
        )
    );

-- =================================================================
-- STEP 7: CREATE TRIGGERS FOR AUTOMATIC UPDATES
-- =================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_appointment_slots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointment_slots_updated_at_trigger
    BEFORE UPDATE ON appointment_slots
    FOR EACH ROW EXECUTE FUNCTION update_appointment_slots_updated_at();

-- Trigger to sync appointment_slots with patient_visits
CREATE OR REPLACE FUNCTION sync_appointment_slot_booking()
RETURNS TRIGGER AS $$
BEGIN
    -- When a visit is scheduled, update appointment slot
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.scheduled_date IS NOT NULL AND NEW.scheduled_time IS NOT NULL THEN
            -- Create or update appointment slot
            INSERT INTO appointment_slots (
                tenant_id, doctor_id, slot_date, slot_time, 
                duration_minutes, is_booked, patient_id, visit_id, 
                status, created_by
            ) VALUES (
                NEW.tenant_id, NEW.doctor_id, NEW.scheduled_date, NEW.scheduled_time,
                COALESCE(NEW.duration_minutes, 30), true, NEW.patient_id, NEW.id,
                'booked', NEW.created_by
            )
            ON CONFLICT (doctor_id, slot_date, slot_time) 
            DO UPDATE SET
                is_booked = true,
                patient_id = NEW.patient_id,
                visit_id = NEW.id,
                status = 'booked',
                updated_at = NOW(),
                updated_by = NEW.updated_by;
        END IF;
        RETURN NEW;
    END IF;
    
    -- When a visit is deleted, free up the appointment slot
    IF TG_OP = 'DELETE' THEN
        UPDATE appointment_slots 
        SET is_booked = false, 
            patient_id = NULL, 
            visit_id = NULL, 
            status = 'available',
            updated_at = NOW()
        WHERE visit_id = OLD.id;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_appointment_slot_trigger
    AFTER INSERT OR UPDATE OR DELETE ON patient_visits
    FOR EACH ROW EXECUTE FUNCTION sync_appointment_slot_booking();

-- =================================================================
-- STEP 8: INSERT SAMPLE DATA FOR TESTING
-- =================================================================

-- This will be populated when you have sample doctor availability data
-- The slots will be automatically generated based on doctor_availability records

COMMENT ON TABLE appointment_slots IS 'Appointment slots table that integrates with existing doctor_availability and patient_visits';
COMMENT ON VIEW calendar_appointments IS 'Calendar view combining appointment data for efficient display';
COMMENT ON FUNCTION generate_appointment_slots IS 'Generates 15-minute appointment slots for a doctor on a specific date';
COMMENT ON FUNCTION check_appointment_conflict IS 'Checks for appointment scheduling conflicts';
