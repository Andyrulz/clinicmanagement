-- Doctor Availability Database Functions
-- SQL Script for time slot generation and booking functions
-- Date: August 2, 2025
-- Prerequisites: doctor_availability and doctor_time_slots tables must exist

-- =================================================================
-- FUNCTION 1: GENERATE TIME SLOTS FROM AVAILABILITY
-- =================================================================

-- Function to generate time slots for a specific doctor and date range
CREATE OR REPLACE FUNCTION generate_doctor_time_slots(
  p_doctor_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_current_date DATE := p_start_date;
  v_day_of_week INTEGER;
  v_availability_record RECORD;
  v_slot_start TIME;
  v_slot_end TIME;
  v_slots_created INTEGER := 0;
  v_tenant_id UUID;
BEGIN
  -- Get doctor's tenant_id
  SELECT tenant_id INTO v_tenant_id
  FROM users 
  WHERE id = p_doctor_id AND role = 'doctor';
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Doctor not found or invalid role';
  END IF;

  -- Loop through each date in the range
  WHILE v_current_date <= p_end_date LOOP
    -- Get day of week (0=Sunday, 1=Monday, etc.)
    v_day_of_week := EXTRACT(DOW FROM v_current_date);
    
    -- Get all active availability records for this doctor and day
    FOR v_availability_record IN
      SELECT *
      FROM doctor_availability
      WHERE doctor_id = p_doctor_id
        AND day_of_week = v_day_of_week
        AND is_active = true
        AND availability_type = 'regular'
        AND (effective_from IS NULL OR effective_from <= v_current_date)
        AND (effective_until IS NULL OR effective_until >= v_current_date)
    LOOP
      -- Generate time slots for this availability block
      v_slot_start := v_availability_record.start_time;
      
      WHILE v_slot_start < v_availability_record.end_time LOOP
        -- Calculate slot end time
        v_slot_end := v_slot_start + (v_availability_record.slot_duration_minutes || ' minutes')::INTERVAL;
        
        -- Don't create slot if it would extend beyond availability end time
        IF v_slot_end > v_availability_record.end_time THEN
          EXIT;
        END IF;
        
        -- Insert time slot (ignore if already exists)
        INSERT INTO doctor_time_slots (
          tenant_id,
          doctor_id,
          availability_id,
          slot_date,
          start_time,
          end_time,
          is_available,
          max_bookings
        ) VALUES (
          v_tenant_id,
          p_doctor_id,
          v_availability_record.id,
          v_current_date,
          v_slot_start,
          v_slot_end,
          true,
          v_availability_record.max_patients_per_slot
        )
        ON CONFLICT (doctor_id, slot_date, start_time) DO NOTHING;
        
        -- Check if row was actually inserted
        IF FOUND THEN
          v_slots_created := v_slots_created + 1;
        END IF;
        
        -- Move to next slot (add duration + buffer time)
        v_slot_start := v_slot_start + 
          (v_availability_record.slot_duration_minutes + v_availability_record.buffer_time_minutes || ' minutes')::INTERVAL;
      END LOOP;
    END LOOP;
    
    -- Move to next date
    v_current_date := v_current_date + 1;
  END LOOP;
  
  RETURN v_slots_created;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- FUNCTION 2: BOOK A TIME SLOT
-- =================================================================

-- Function to book a time slot for a patient visit
CREATE OR REPLACE FUNCTION book_time_slot(
  p_slot_id UUID,
  p_visit_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_slot_record RECORD;
  v_current_user_tenant UUID;
BEGIN
  -- Get current user's tenant
  SELECT tenant_id INTO v_current_user_tenant
  FROM users 
  WHERE auth_user_id = auth.uid();
  
  -- Get slot details with row lock
  SELECT * INTO v_slot_record
  FROM doctor_time_slots
  WHERE id = p_slot_id
    AND tenant_id = v_current_user_tenant
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Time slot not found or access denied';
  END IF;
  
  -- Check if slot is available
  IF NOT v_slot_record.is_available THEN
    RAISE EXCEPTION 'Time slot is not available';
  END IF;
  
  -- Check if slot has capacity
  IF v_slot_record.current_bookings >= v_slot_record.max_bookings THEN
    RAISE EXCEPTION 'Time slot is fully booked';
  END IF;
  
  -- Update the slot
  UPDATE doctor_time_slots
  SET 
    current_bookings = current_bookings + 1,
    is_booked = CASE 
      WHEN current_bookings + 1 >= max_bookings THEN true 
      ELSE false 
    END,
    visit_id = CASE 
      WHEN current_bookings = 0 THEN p_visit_id 
      ELSE visit_id 
    END,
    updated_at = NOW()
  WHERE id = p_slot_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- FUNCTION 3: CANCEL/UNBOOK A TIME SLOT
-- =================================================================

-- Function to cancel a booking for a time slot
CREATE OR REPLACE FUNCTION cancel_time_slot_booking(
  p_slot_id UUID,
  p_visit_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_slot_record RECORD;
  v_current_user_tenant UUID;
BEGIN
  -- Get current user's tenant
  SELECT tenant_id INTO v_current_user_tenant
  FROM users 
  WHERE auth_user_id = auth.uid();
  
  -- Get slot details with row lock
  SELECT * INTO v_slot_record
  FROM doctor_time_slots
  WHERE id = p_slot_id
    AND tenant_id = v_current_user_tenant
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Time slot not found or access denied';
  END IF;
  
  -- Check if there are bookings to cancel
  IF v_slot_record.current_bookings <= 0 THEN
    RAISE EXCEPTION 'No bookings to cancel for this slot';
  END IF;
  
  -- Update the slot
  UPDATE doctor_time_slots
  SET 
    current_bookings = current_bookings - 1,
    is_booked = CASE 
      WHEN current_bookings - 1 <= 0 THEN false 
      ELSE true 
    END,
    visit_id = CASE 
      WHEN visit_id = p_visit_id THEN NULL 
      ELSE visit_id 
    END,
    updated_at = NOW()
  WHERE id = p_slot_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- FUNCTION 4: GET AVAILABLE SLOTS FOR A DOCTOR
-- =================================================================

-- Function to get available time slots for a doctor within a date range
CREATE OR REPLACE FUNCTION get_available_slots(
  p_doctor_id UUID,
  p_start_date DATE,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  slot_id UUID,
  slot_date DATE,
  start_time TIME,
  end_time TIME,
  available_bookings INTEGER,
  doctor_name TEXT
) AS $$
BEGIN
  -- Set default end date if not provided
  IF p_end_date IS NULL THEN
    p_end_date := p_start_date + INTERVAL '30 days';
  END IF;
  
  RETURN QUERY
  SELECT 
    dts.id as slot_id,
    dts.slot_date,
    dts.start_time,
    dts.end_time,
    (dts.max_bookings - dts.current_bookings) as available_bookings,
    u.full_name as doctor_name
  FROM doctor_time_slots dts
  JOIN users u ON dts.doctor_id = u.id
  WHERE dts.doctor_id = p_doctor_id
    AND dts.slot_date BETWEEN p_start_date AND p_end_date
    AND dts.is_available = true
    AND dts.current_bookings < dts.max_bookings
    AND dts.tenant_id = (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  ORDER BY dts.slot_date, dts.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- FUNCTION 5: BULK GENERATE SLOTS FOR ALL DOCTORS
-- =================================================================

-- Function to generate time slots for all active doctors
CREATE OR REPLACE FUNCTION generate_slots_for_all_doctors(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  doctor_id UUID,
  doctor_name TEXT,
  slots_created INTEGER
) AS $$
DECLARE
  v_doctor_record RECORD;
  v_slots_count INTEGER;
BEGIN
  -- Loop through all active doctors in current user's tenant
  FOR v_doctor_record IN
    SELECT u.id, u.full_name
    FROM users u
    WHERE u.role = 'doctor'
      AND u.is_active = true
      AND u.tenant_id = (
        SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
      )
  LOOP
    -- Generate slots for this doctor
    SELECT generate_doctor_time_slots(
      v_doctor_record.id,
      p_start_date,
      p_end_date
    ) INTO v_slots_count;
    
    -- Return the result for this doctor
    doctor_id := v_doctor_record.id;
    doctor_name := v_doctor_record.full_name;
    slots_created := v_slots_count;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- GRANT PERMISSIONS
-- =================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION generate_doctor_time_slots(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION book_time_slot(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_time_slot_booking(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_slots(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_slots_for_all_doctors(DATE, DATE) TO authenticated;

-- =================================================================
-- COMPLETION MESSAGE
-- =================================================================

SELECT 'Doctor availability functions created successfully!' as result;

-- Show all created functions
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%doctor%' OR routine_name LIKE '%slot%'
ORDER BY routine_name;
