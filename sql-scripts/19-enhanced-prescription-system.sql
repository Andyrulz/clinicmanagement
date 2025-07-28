-- Enhanced prescription system for existing schema
-- This script works with the existing prescriptions table structure

-- The prescriptions table already exists with this structure:
-- - consultation_id (not visit_id)
-- - medications stored as JSONB (not individual records)
-- - patient_id, doctor_id, tenant_id already present

-- Add follow-up fields to patient_visits table (if they don't exist)
ALTER TABLE patient_visits 
ADD COLUMN IF NOT EXISTS follow_up_date DATE,
ADD COLUMN IF NOT EXISTS follow_up_instructions TEXT;

-- Add tenant contact information for PDFs (if they don't exist)
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS address JSONB,
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create a view for easier prescription management
CREATE OR REPLACE VIEW prescription_details AS
SELECT 
    p.id,
    p.consultation_id,
    c.appointment_id,
    p.patient_id,
    p.doctor_id,
    p.tenant_id,
    p.medications,
    p.instructions,
    p.created_at,
    p.file_url,
    p.prescription_type,
    pt.first_name,
    pt.last_name,
    pt.phone,
    pt.uhid,
    u.full_name as doctor_name,
    c.chief_complaint,
    c.diagnosis,
    c.treatment_plan
FROM prescriptions p
LEFT JOIN consultations c ON p.consultation_id = c.id
LEFT JOIN patients pt ON p.patient_id = pt.id
LEFT JOIN users u ON p.doctor_id = u.id;

-- Create a function to automatically create follow-up visits
CREATE OR REPLACE FUNCTION create_follow_up_visit(
    original_visit_id UUID,
    follow_up_date DATE DEFAULT NULL,
    follow_up_time TIME DEFAULT '10:00:00'
) 
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_visit_id UUID;
    original_visit RECORD;
    next_visit_number INTEGER;
BEGIN
    -- Get the original visit details
    SELECT * INTO original_visit 
    FROM patient_visits 
    WHERE id = original_visit_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Original visit not found';
    END IF;
    
    -- Use provided follow_up_date or the one from original visit
    IF follow_up_date IS NULL THEN
        follow_up_date := original_visit.follow_up_date;
    END IF;
    
    IF follow_up_date IS NULL THEN
        RAISE EXCEPTION 'No follow-up date specified';
    END IF;
    
    -- Generate next visit number for the patient
    SELECT COALESCE(MAX(CAST(SUBSTRING(visit_number FROM '[0-9]+') AS INTEGER)), 0) + 1
    INTO next_visit_number
    FROM patient_visits 
    WHERE patient_id = original_visit.patient_id;
    
    -- Create the follow-up visit
    INSERT INTO patient_visits (
        tenant_id,
        patient_id,
        doctor_id,
        visit_number,
        visit_date,
        visit_time,
        visit_type,
        consultation_fee,
        consultation_fee_paid,
        status,
        chief_complaints,
        created_by
    ) VALUES (
        original_visit.tenant_id,
        original_visit.patient_id,
        original_visit.doctor_id,
        'V' || LPAD(next_visit_number::TEXT, 6, '0'),
        follow_up_date,
        follow_up_time,
        'follow_up',
        original_visit.consultation_fee,
        false,
        'scheduled',
        COALESCE(original_visit.follow_up_instructions, 'Follow-up visit'),
        original_visit.created_by
    ) RETURNING id INTO new_visit_id;
    
    RETURN new_visit_id;
END;
$$;

-- Add indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_prescriptions_consultation_id ON prescriptions(consultation_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_tenant_id ON prescriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patient_visits_follow_up_date ON patient_visits(follow_up_date) WHERE follow_up_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patient_visits_status_date ON patient_visits(status, visit_date);

-- Ensure RLS is enabled on prescriptions table
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- Update RLS policy for prescriptions (drop existing if it exists)
DROP POLICY IF EXISTS "Users can only access prescriptions within their tenant" ON prescriptions;

CREATE POLICY "Users can only access prescriptions within their tenant" ON prescriptions
    FOR ALL USING (tenant_id = (
        SELECT u.tenant_id 
        FROM users u 
        WHERE u.auth_user_id = auth.uid()
    ));

-- Grant permissions
GRANT ALL ON prescriptions TO authenticated;
GRANT SELECT ON prescription_details TO authenticated;
GRANT EXECUTE ON FUNCTION create_follow_up_visit(UUID, DATE, TIME) TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
