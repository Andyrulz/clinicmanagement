-- Add missing columns to patients table
-- Run this script to fix the patient registration form

-- Add missing columns that the patient service expects
DO $$ 
BEGIN
    -- Add name column (if it doesn't exist, might be called something else)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'name') THEN
        -- Check if first_name/last_name exist instead
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'first_name') THEN
            -- Add computed name column
            ALTER TABLE patients ADD COLUMN name VARCHAR(255) GENERATED ALWAYS AS (COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) STORED;
        ELSE
            ALTER TABLE patients ADD COLUMN name VARCHAR(255);
        END IF;
    END IF;
    
    -- Add date_of_birth column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'date_of_birth') THEN
        ALTER TABLE patients ADD COLUMN date_of_birth DATE;
    END IF;
    
    -- Add gender column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'gender') THEN
        ALTER TABLE patients ADD COLUMN gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
    END IF;
    
    -- Add address column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'address') THEN
        ALTER TABLE patients ADD COLUMN address TEXT;
    END IF;
    
    -- Add emergency_contact column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'emergency_contact') THEN
        ALTER TABLE patients ADD COLUMN emergency_contact JSONB;
    END IF;
    
    -- Add medical_history column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'medical_history') THEN
        ALTER TABLE patients ADD COLUMN medical_history TEXT;
    END IF;
    
    -- Add allergies column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'allergies') THEN
        ALTER TABLE patients ADD COLUMN allergies TEXT;
    END IF;
    
    -- Ensure email column exists (might already be there)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'email') THEN
        ALTER TABLE patients ADD COLUMN email VARCHAR(255);
    END IF;
    
    -- Ensure phone column exists (should already be there)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'phone') THEN
        ALTER TABLE patients ADD COLUMN phone VARCHAR(20);
    END IF;
END $$;
