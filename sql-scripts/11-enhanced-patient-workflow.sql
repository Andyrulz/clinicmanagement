-- Enhanced Patient Management Workflow Schema
-- Supports: Registration -> Visit Creation -> Vitals -> Doctor Consultation -> Billing

-- =================================================================
-- 1. Update patients table to use phone as unique identifier
-- =================================================================

-- Add unique constraint on phone number within tenant
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_tenant_id_uhid_key;
ALTER TABLE patients ADD CONSTRAINT patients_tenant_phone_unique UNIQUE (tenant_id, phone);

-- Add registration fee tracking
ALTER TABLE patients ADD COLUMN IF NOT EXISTS registration_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS registration_fee_paid BOOLEAN DEFAULT false;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS registration_payment_date DATE;

-- Add patient status
ALTER TABLE patients ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' 
  CHECK (status IN ('active', 'inactive', 'blocked'));

-- =================================================================
-- 2. Create patient_visits table (replaces appointments for detailed workflow)
-- =================================================================

CREATE TABLE IF NOT EXISTS patient_visits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Visit identification
  visit_number VARCHAR(50) UNIQUE NOT NULL, -- Unique reference number for this visit
  visit_date DATE DEFAULT CURRENT_DATE,
  visit_time TIME DEFAULT CURRENT_TIME,
  
  -- Visit type and billing
  visit_type VARCHAR(20) DEFAULT 'new' CHECK (visit_type IN ('new', 'follow-up', 'emergency')),
  consultation_fee DECIMAL(10,2) NOT NULL,
  consultation_fee_paid BOOLEAN DEFAULT false,
  payment_method VARCHAR(30),
  payment_date TIMESTAMP WITH TIME ZONE,
  
  -- Visit status workflow
  status VARCHAR(30) DEFAULT 'scheduled' CHECK (status IN (
    'scheduled',      -- Visit booked
    'checked-in',     -- Patient arrived
    'vitals-pending', -- Waiting for vitals
    'vitals-done',    -- Vitals completed, ready for doctor
    'in-consultation', -- With doctor
    'consultation-done', -- Doctor completed consultation
    'completed',      -- Visit fully completed
    'cancelled',      -- Visit cancelled
    'no-show'        -- Patient didn't show up
  )),
  
  -- Visit notes and tracking
  chief_complaint TEXT, -- Initial complaint noted at registration
  visit_notes TEXT,     -- Any additional notes
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  -- Indexes for performance
  CONSTRAINT visit_number_format CHECK (visit_number ~ '^[A-Z0-9]{8,20}$')
);

-- Create indexes for patient_visits
CREATE INDEX IF NOT EXISTS idx_patient_visits_tenant ON patient_visits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patient_visits_patient ON patient_visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_visits_doctor_date ON patient_visits(doctor_id, visit_date);
CREATE INDEX IF NOT EXISTS idx_patient_visits_date_status ON patient_visits(visit_date, status);

-- =================================================================
-- 3. Create patient_vitals table
-- =================================================================

CREATE TABLE IF NOT EXISTS patient_vitals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES patient_visits(id) ON DELETE CASCADE,
  
  -- Physical measurements
  height_cm DECIMAL(5,2), -- Height in centimeters (e.g., 170.5)
  weight_kg DECIMAL(5,2), -- Weight in kilograms (e.g., 70.3)
  bmi DECIMAL(4,2) GENERATED ALWAYS AS (
    CASE 
      WHEN height_cm > 0 AND weight_kg > 0 
      THEN ROUND((weight_kg / POWER(height_cm / 100, 2))::NUMERIC, 2)
      ELSE NULL 
    END
  ) STORED, -- Auto-calculated BMI
  
  -- Vital signs
  pulse_rate INTEGER, -- Beats per minute
  bp_systolic INTEGER, -- Systolic blood pressure (mmHg)
  bp_diastolic INTEGER, -- Diastolic blood pressure (mmHg)
  spo2 INTEGER, -- Oxygen saturation percentage
  temperature DECIMAL(4,2), -- Temperature (can be Celsius or Fahrenheit)
  temperature_unit VARCHAR(1) DEFAULT 'C' CHECK (temperature_unit IN ('C', 'F')),
  
  -- Additional vitals
  respiratory_rate INTEGER, -- Breaths per minute
  blood_sugar DECIMAL(5,2), -- Blood glucose level
  
  -- Meta information
  measured_by UUID REFERENCES users(id), -- Staff who recorded vitals
  notes TEXT, -- Any observations or notes
  is_validated BOOLEAN DEFAULT false, -- Doctor/nurse validation
  validated_by UUID REFERENCES users(id),
  validated_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_height CHECK (height_cm IS NULL OR (height_cm >= 50 AND height_cm <= 250)),
  CONSTRAINT valid_weight CHECK (weight_kg IS NULL OR (weight_kg >= 1 AND weight_kg <= 300)),
  CONSTRAINT valid_pulse CHECK (pulse_rate IS NULL OR (pulse_rate >= 30 AND pulse_rate <= 200)),
  CONSTRAINT valid_bp_systolic CHECK (bp_systolic IS NULL OR (bp_systolic >= 70 AND bp_systolic <= 250)),
  CONSTRAINT valid_bp_diastolic CHECK (bp_diastolic IS NULL OR (bp_diastolic >= 40 AND bp_diastolic <= 150)),
  CONSTRAINT valid_spo2 CHECK (spo2 IS NULL OR (spo2 >= 70 AND spo2 <= 100)),
  CONSTRAINT valid_temperature CHECK (temperature IS NULL OR (
    (temperature_unit = 'C' AND temperature >= 30 AND temperature <= 45) OR
    (temperature_unit = 'F' AND temperature >= 86 AND temperature <= 113)
  ))
);

-- Create indexes for patient_vitals
CREATE INDEX IF NOT EXISTS idx_patient_vitals_visit ON patient_vitals(visit_id);
CREATE INDEX IF NOT EXISTS idx_patient_vitals_patient ON patient_vitals(patient_id);

-- =================================================================
-- 4. Enhanced consultations table
-- =================================================================

-- Add more detailed fields to existing consultations table
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS visit_id UUID REFERENCES patient_visits(id) ON DELETE CASCADE;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS vitals_id UUID REFERENCES patient_vitals(id);

-- Add detailed consultation fields
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS present_history TEXT; -- History of Present Illness
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS past_medical_history TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS family_history TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS social_history TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS allergies_current TEXT;

-- Physical examination findings (system-wise)
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS general_examination TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS cardiovascular_exam TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS respiratory_exam TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS abdomen_exam TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS neurological_exam TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS other_system_exam TEXT;

-- Enhanced diagnosis and treatment
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS primary_diagnosis TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS differential_diagnosis TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS clinical_notes TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS general_advice TEXT;

-- Follow-up and additional orders
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS lab_tests_ordered TEXT[]; -- Array of lab tests
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS imaging_ordered TEXT[]; -- Array of imaging studies
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS referrals TEXT; -- Specialist referrals
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS next_follow_up_weeks INTEGER; -- Follow-up duration in weeks

-- =================================================================
-- 5. Enhanced prescriptions table for detailed medication info
-- =================================================================

-- Add detailed medication fields
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS medication_name VARCHAR(200);
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS strength VARCHAR(50);
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS dosage_form VARCHAR(50); -- tablet, capsule, syrup, etc.
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS frequency VARCHAR(20); -- OD, BD, TDS, QID, etc.
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS duration_days INTEGER;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS food_relation VARCHAR(10) CHECK (food_relation IN ('BF', 'AF', 'WF', 'EF')); -- Before/After/With/Empty stomach
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS special_instructions TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS quantity_prescribed INTEGER;

-- =================================================================
-- 6. Create visit_billing table for detailed billing tracking
-- =================================================================

CREATE TABLE IF NOT EXISTS visit_billing (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES patient_visits(id) ON DELETE CASCADE,
  
  -- Registration fees (one-time)
  registration_fee DECIMAL(10,2) DEFAULT 0,
  registration_fee_paid BOOLEAN DEFAULT false,
  registration_payment_date DATE,
  
  -- Consultation fees
  consultation_fee DECIMAL(10,2) DEFAULT 0,
  consultation_fee_paid BOOLEAN DEFAULT false,
  consultation_payment_date DATE,
  
  -- Additional charges
  lab_charges DECIMAL(10,2) DEFAULT 0,
  procedure_charges DECIMAL(10,2) DEFAULT 0,
  medication_charges DECIMAL(10,2) DEFAULT 0,
  other_charges DECIMAL(10,2) DEFAULT 0,
  
  -- Totals and discounts
  subtotal DECIMAL(10,2) GENERATED ALWAYS AS (
    COALESCE(registration_fee, 0) + 
    COALESCE(consultation_fee, 0) + 
    COALESCE(lab_charges, 0) + 
    COALESCE(procedure_charges, 0) + 
    COALESCE(medication_charges, 0) + 
    COALESCE(other_charges, 0)
  ) STORED,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) GENERATED ALWAYS AS (
    COALESCE(registration_fee, 0) + 
    COALESCE(consultation_fee, 0) + 
    COALESCE(lab_charges, 0) + 
    COALESCE(procedure_charges, 0) + 
    COALESCE(medication_charges, 0) + 
    COALESCE(other_charges, 0) - 
    COALESCE(discount_amount, 0) + 
    COALESCE(tax_amount, 0)
  ) STORED,
  
  -- Payment tracking
  amount_paid DECIMAL(10,2) DEFAULT 0,
  balance_amount DECIMAL(10,2) GENERATED ALWAYS AS (
    COALESCE(registration_fee, 0) + 
    COALESCE(consultation_fee, 0) + 
    COALESCE(lab_charges, 0) + 
    COALESCE(procedure_charges, 0) + 
    COALESCE(medication_charges, 0) + 
    COALESCE(other_charges, 0) - 
    COALESCE(discount_amount, 0) + 
    COALESCE(tax_amount, 0) - 
    COALESCE(amount_paid, 0)
  ) STORED,
  
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN (
    'pending', 'partially-paid', 'paid', 'overpaid', 'refunded'
  )),
  payment_method VARCHAR(30), -- cash, card, upi, etc.
  payment_reference VARCHAR(100), -- transaction reference
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Create indexes for visit_billing
CREATE INDEX IF NOT EXISTS idx_visit_billing_visit ON visit_billing(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_billing_patient ON visit_billing(patient_id);
CREATE INDEX IF NOT EXISTS idx_visit_billing_status ON visit_billing(payment_status);

-- =================================================================
-- 7. Create triggers for automatic visit number generation
-- =================================================================

-- Function to generate unique visit number
CREATE OR REPLACE FUNCTION generate_visit_number()
RETURNS TRIGGER AS $$
DECLARE
  clinic_code VARCHAR(3);
  counter INTEGER;
  new_visit_number VARCHAR(50);
BEGIN
  -- Get clinic code (first 3 chars of tenant name or ID)
  SELECT COALESCE(UPPER(LEFT(name, 3)), UPPER(LEFT(id::TEXT, 3)))
  INTO clinic_code
  FROM tenants 
  WHERE id = NEW.tenant_id;
  
  -- Get daily counter
  SELECT COALESCE(MAX(
    CASE 
      WHEN visit_number ~ ('^' || clinic_code || TO_CHAR(NEW.visit_date, 'YYMMDD') || '[0-9]{3}$')
      THEN RIGHT(visit_number, 3)::INTEGER 
      ELSE 0 
    END
  ), 0) + 1
  INTO counter
  FROM patient_visits 
  WHERE tenant_id = NEW.tenant_id 
    AND visit_date = NEW.visit_date;
  
  -- Generate visit number: CLN250727001 (Clinic + YYMMDD + 3-digit counter)
  new_visit_number := clinic_code || TO_CHAR(NEW.visit_date, 'YYMMDD') || LPAD(counter::TEXT, 3, '0');
  
  NEW.visit_number := new_visit_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for visit number generation
DROP TRIGGER IF EXISTS trigger_generate_visit_number ON patient_visits;
CREATE TRIGGER trigger_generate_visit_number
  BEFORE INSERT ON patient_visits
  FOR EACH ROW
  EXECUTE FUNCTION generate_visit_number();

-- =================================================================
-- 8. Row Level Security for new tables
-- =================================================================

-- Enable RLS on new tables
ALTER TABLE patient_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_billing ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for patient_visits
CREATE POLICY "Users can access visits from their tenant"
  ON patient_visits FOR ALL
  USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- Create RLS policies for patient_vitals  
CREATE POLICY "Users can access vitals from their tenant"
  ON patient_vitals FOR ALL
  USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- Create RLS policies for visit_billing
CREATE POLICY "Users can access billing from their tenant"
  ON visit_billing FOR ALL
  USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- =================================================================
-- 9. Update existing RLS policies for enhanced tables
-- =================================================================

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions on new tables
GRANT ALL ON patient_visits TO authenticated;
GRANT ALL ON patient_vitals TO authenticated;
GRANT ALL ON visit_billing TO authenticated;

-- =================================================================
-- 10. Create helpful views for common queries
-- =================================================================

-- View for patient visit summary
CREATE OR REPLACE VIEW patient_visit_summary AS
SELECT 
  pv.id,
  pv.visit_number,
  p.name as patient_name,
  p.phone as patient_phone,
  u.name as doctor_name,
  pv.visit_date,
  pv.visit_time,
  pv.visit_type,
  pv.status,
  pv.consultation_fee,
  pv.consultation_fee_paid,
  pv.chief_complaint,
  CASE 
    WHEN pvi.id IS NOT NULL THEN true 
    ELSE false 
  END as vitals_recorded
FROM patient_visits pv
JOIN patients p ON pv.patient_id = p.id
JOIN users u ON pv.doctor_id = u.id
LEFT JOIN patient_vitals pvi ON pv.id = pvi.visit_id;

-- View for today's appointments/visits
CREATE OR REPLACE VIEW todays_visits AS
SELECT * FROM patient_visit_summary
WHERE visit_date = CURRENT_DATE
ORDER BY visit_time;

-- =================================================================
-- 11. Insert sample data for testing (optional)
-- =================================================================

-- Note: Sample data will be added through the application interface
-- This schema is now ready for the enhanced patient workflow!

COMMENT ON TABLE patient_visits IS 'Enhanced visit management with detailed workflow tracking';
COMMENT ON TABLE patient_vitals IS 'Pre-consultation vital signs and measurements';
COMMENT ON TABLE visit_billing IS 'Comprehensive billing for registration and consultation fees';
