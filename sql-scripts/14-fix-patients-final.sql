-- Fix patients table columns - Final Fix
-- Run this script to properly set up the patients table

-- 1. Remove the computed name column if it exists (causing insert errors)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'patients' AND column_name = 'name') THEN
        ALTER TABLE patients DROP COLUMN name;
    END IF;
END $$;

-- 2. Ensure first_name and last_name columns exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'first_name') THEN
        ALTER TABLE patients ADD COLUMN first_name VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'last_name') THEN
        ALTER TABLE patients ADD COLUMN last_name VARCHAR(255);
    END IF;
END $$;

-- 3. Add missing columns that the patient service expects
DO $$ 
BEGIN
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
    
    -- Add address column (storing as TEXT for JSON data)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'address') THEN
        ALTER TABLE patients ADD COLUMN address TEXT;
    END IF;
    
    -- Add emergency_contact column (storing as TEXT for JSON data)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'emergency_contact') THEN
        ALTER TABLE patients ADD COLUMN emergency_contact TEXT;
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

-- 4. Add a computed name column for display purposes (non-insertable)
DO $$ 
BEGIN
    -- Only add if both first_name and last_name exist
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'patients' AND column_name = 'first_name') AND
       EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'patients' AND column_name = 'last_name') THEN
        -- Add a view-friendly computed column
        ALTER TABLE patients ADD COLUMN full_name VARCHAR(511) GENERATED ALWAYS AS (
            TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
        ) STORED;
    END IF;
END $$;
