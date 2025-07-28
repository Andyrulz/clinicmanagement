# Visit Creation Database Schema Analysis

## 📊 **Database Tables for Visit Management Workflow**

Based on the current database schema implementation, here are the key tables involved in visit creation and management:

---

## 🏥 **Core Tables for Visit Creation**

### **1. patients** (Source Table)

**Purpose:** Patient records that visits are created for

```sql
-- Key columns for visit creation:
id UUID PRIMARY KEY                          -- Patient reference
tenant_id UUID                              -- Multi-tenant isolation
uhid VARCHAR(50) UNIQUE                     -- Patient unique ID
first_name VARCHAR(255)                     -- Patient name
last_name VARCHAR(255)                      -- Patient surname
full_name VARCHAR(511) GENERATED            -- Computed display name
phone VARCHAR(20)                           -- Contact info
email VARCHAR(255)                          -- Contact info
date_of_birth DATE                          -- Age calculation
gender VARCHAR(20)                          -- Demographics
registration_fee DECIMAL(10,2)              -- Initial payment
registration_fee_paid BOOLEAN               -- Payment status
status VARCHAR(20) DEFAULT 'active'         -- Patient status
```

**Constraints:**

- `patients_tenant_phone_unique`: Unique phone per tenant
- `patients_status_check`: status IN ('active', 'inactive', 'blocked')

---

### **2. patient_visits** (Primary Visit Table)

**Purpose:** Central table for visit scheduling and management

```sql
CREATE TABLE patient_visits (
  -- Core identifiers
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Visit scheduling
  visit_number VARCHAR(50) UNIQUE NOT NULL,       -- Auto-generated: DOC-PAT-YYYYMMDD-COUNT
  visit_date DATE DEFAULT CURRENT_DATE,
  visit_time TIME DEFAULT CURRENT_TIME,
  visit_type VARCHAR(20) DEFAULT 'new',           -- 'new' | 'follow_up'

  -- Billing information
  consultation_fee DECIMAL(10,2) DEFAULT 0,
  consultation_fee_paid BOOLEAN DEFAULT false,
  consultation_payment_date DATE,

  -- Visit workflow status
  status VARCHAR(20) DEFAULT 'scheduled',         -- Workflow tracking

  -- Clinical documentation
  chief_complaints TEXT,                          -- Patient's main concerns
  history_of_present_illness TEXT,               -- Current symptoms
  past_medical_history TEXT,                     -- Previous conditions
  family_history TEXT,                           -- Family medical history
  social_history TEXT,                           -- Social/lifestyle factors
  physical_examination TEXT,                     -- Doctor's findings
  clinical_findings TEXT,                        -- Clinical observations

  -- Diagnosis and treatment
  diagnosis TEXT,                                -- Primary diagnosis
  differential_diagnosis TEXT,                   -- Alternative diagnoses
  treatment_plan TEXT,                           -- Treatment approach
  prescription JSONB,                            -- Structured prescription data
  general_advice TEXT,                           -- Patient advice

  -- Follow-up planning
  follow_up_date DATE,                           -- Next visit date
  follow_up_instructions TEXT,                   -- Follow-up notes

  -- Test orders
  tests_ordered JSONB,                           -- Lab test orders
  scan_orders JSONB,                             -- Imaging orders

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);
```

**Key Constraints:**

- `patient_visits.visit_type CHECK`: visit_type IN ('new', 'follow_up')
- `patient_visits.status CHECK`: status IN ('scheduled', 'in_progress', 'completed', 'cancelled')
- `visit_number UNIQUE`: Prevents duplicate visit numbers

**Indexes:**

```sql
idx_patient_visits_tenant_id        -- Fast tenant queries
idx_patient_visits_patient_id       -- Patient visit history
idx_patient_visits_doctor_id        -- Doctor's appointments
idx_patient_visits_date             -- Date-based filtering
idx_patient_visits_status           -- Status filtering
```

---

### **3. patient_vitals** (Medical Measurements)

**Purpose:** Vital signs and measurements taken during visits

```sql
CREATE TABLE patient_vitals (
  -- Core identifiers
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES patient_visits(id) ON DELETE CASCADE,

  -- Physical measurements
  height_cm DECIMAL(5,2),                        -- Height in centimeters
  weight_kg DECIMAL(5,2),                        -- Weight in kilograms
  bmi DECIMAL(4,2),                              -- Auto-calculated BMI

  -- Vital signs
  pulse_rate INTEGER,                            -- Beats per minute
  blood_pressure_systolic INTEGER,               -- mmHg
  blood_pressure_diastolic INTEGER,              -- mmHg
  spo2 INTEGER,                                  -- Oxygen saturation %
  temperature_celsius DECIMAL(4,2),              -- Body temperature
  respiratory_rate INTEGER,                      -- Breaths per minute

  -- Additional measurements
  blood_glucose DECIMAL(5,2),                    -- mg/dL
  notes TEXT,                                    -- Additional notes

  -- Metadata
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  recorded_by UUID REFERENCES users(id)         -- Staff member who recorded
);
```

**Medical Constraints:**

```sql
height_cm > 0 AND height_cm < 300              -- Valid height range
weight_kg > 0 AND weight_kg < 500              -- Valid weight range
bmi > 0 AND bmi < 100                          -- Valid BMI range
pulse_rate > 0 AND pulse_rate < 300            -- Valid pulse range
blood_pressure_systolic > 0 AND < 300         -- Valid BP systolic
blood_pressure_diastolic > 0 AND < 200        -- Valid BP diastolic
spo2 >= 0 AND spo2 <= 100                     -- Valid oxygen saturation
temperature_celsius > 30 AND < 45             -- Valid body temperature
```

**Indexes:**

```sql
idx_patient_vitals_tenant_id        -- Fast tenant queries
idx_patient_vitals_patient_id       -- Patient vital history
idx_patient_vitals_visit_id         -- Visit-specific vitals
idx_patient_vitals_recorded_at      -- Time-based queries
```

---

### **4. users** (Doctor/Staff Reference)

**Purpose:** Doctor and staff information for visit assignment

```sql
-- Key columns for visit creation:
id UUID PRIMARY KEY                             -- Doctor/staff reference
tenant_id UUID                                 -- Multi-tenant isolation
auth_user_id UUID UNIQUE                       -- Supabase auth link
email VARCHAR(255) UNIQUE                      -- Contact info
full_name VARCHAR(255)                         -- Display name
role VARCHAR(20)                               -- 'admin', 'doctor', 'receptionist'
is_active BOOLEAN DEFAULT true                 -- Status check
```

**Role Constraints:**

- `users.role CHECK`: role IN ('admin', 'doctor', 'receptionist')

---

## 🔧 **Database Functions for Visit Management**

### **1. Visit Number Generation**

```sql
generate_visit_number(p_tenant_id UUID, p_doctor_id UUID, p_patient_id UUID)
RETURNS VARCHAR(50)
```

**Logic:**

- Gets visit count for patient (for incrementing)
- Extracts doctor initials from full_name
- Extracts patient initials from first_name/last_name
- Generates format: `DOC-PAT-YYYYMMDD-COUNT`
- Example: `JS-AM-20250727-001`

### **2. BMI Auto-Calculation**

```sql
calculate_bmi(height_cm DECIMAL, weight_kg DECIMAL)
RETURNS DECIMAL(4,2)
```

**Logic:**

- Formula: BMI = weight(kg) / (height(m))²
- Auto-triggered on vitals INSERT/UPDATE
- Handles NULL values gracefully

### **3. Timestamp Auto-Update**

```sql
update_updated_at_column()
RETURNS TRIGGER
```

**Purpose:**

- Auto-updates `updated_at` on patient_visits table
- Ensures audit trail accuracy

---

## 🔒 **Row Level Security (RLS) Policies**

### **Visit Access Control**

```sql
-- View visits in user's tenant only
"Users can view visits for their tenant"
FOR SELECT USING (
  tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
  )
)

-- Insert visits in user's tenant only
"Users can insert visits for their tenant"
FOR INSERT WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
  )
)

-- Update visits in user's tenant only
"Users can update visits for their tenant"
FOR UPDATE USING (
  tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
  )
)
```

### **Vitals Access Control**

- Same tenant-based isolation as visits
- Ensures medical data security
- Prevents cross-tenant data access

---

## 📋 **Visit Creation Workflow Schema**

### **Typical Visit Creation Flow:**

1. **Patient Selection** (from `patients` table)
   - Verify patient exists and is active
   - Check registration fee payment status
   - Get patient demographics

2. **Doctor Assignment** (from `users` table)
   - Filter by role = 'doctor' and is_active = true
   - Ensure doctor belongs to same tenant

3. **Visit Creation** (in `patient_visits` table)

   ```sql
   INSERT INTO patient_visits (
     tenant_id,
     patient_id,
     doctor_id,
     visit_number,
     visit_date,
     visit_time,
     visit_type,
     consultation_fee,
     status,
     created_by
   ) VALUES (
     current_user_tenant_id,
     selected_patient_id,
     selected_doctor_id,
     generate_visit_number(tenant_id, doctor_id, patient_id),
     selected_date,
     selected_time,
     'new' OR 'follow_up',
     consultation_fee_amount,
     'scheduled',
     current_user_id
   );
   ```

4. **Vitals Recording** (optional, in `patient_vitals` table)
   - Link to created visit via visit_id
   - Record basic measurements
   - Auto-calculate BMI

5. **Status Updates**
   - 'scheduled' → 'in_progress' → 'completed'
   - Track consultation progress
   - Update billing status

---

## 🚀 **Next Implementation Steps**

### **1. Visit Creation UI Components Needed:**

- Patient search/selection component
- Doctor selection dropdown
- Date/time picker
- Visit type selection
- Fee calculation
- Visit creation form

### **2. Visit Management Features:**

- Today's appointments dashboard
- Visit status tracking
- Quick patient check-in
- Visit history view

### **3. Clinical Workflow Integration:**

- Vitals entry form
- Clinical documentation interface
- Prescription management
- Follow-up scheduling

---

## 📊 **Current Schema Status:**

✅ **Complete Tables:**

- `patients` - Patient records with registration tracking
- `patient_visits` - Comprehensive visit management
- `patient_vitals` - Medical measurements
- `users` - Doctor/staff management

✅ **Complete Functions:**

- Visit number generation
- BMI auto-calculation
- Timestamp triggers

✅ **Complete Security:**

- Multi-tenant RLS policies
- Proper data isolation
- Audit trail support

🔄 **Ready for Implementation:**
The database schema is fully prepared for visit creation UI development. All tables, relationships, constraints, and security policies are in place to support the complete visit management workflow.
