// Database schema verification script
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration from .env.local
const supabaseUrl = 'https://vflnlornzaqigcqegqif.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbG5sb3JuemFxaWdjcWVncWlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzU0ODQ1MywiZXhwIjoyMDY5MTI0NDUzfQ.co925WrXmxL_qjxTl7Oxzi25gfu5U6aT59ZMaFinqiA';

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyDatabaseSchema() {
  console.log('🔍 Verifying database schema and data...\n');

  try {
    // 1. Check table structures
    console.log('📋 Checking table structures:');
    
    // Get table column information
    let columns, columnsError;
    
    try {
      const result = await supabase
        .rpc('get_table_columns', {
          table_names: ['patients', 'patient_visits', 'consultations', 'prescriptions', 'users']
        });
      columns = result.data;
      columnsError = result.error;
    } catch (err) {
      // If the function doesn't exist, query information_schema directly
      try {
        const result = await supabase
          .from('information_schema.columns')
          .select('table_name, column_name, data_type, is_nullable')
          .in('table_name', ['patients', 'patient_visits', 'consultations', 'prescriptions', 'users'])
          .eq('table_schema', 'public')
          .order('table_name')
          .order('ordinal_position');
        
        columns = result.data;
        columnsError = result.error;
      } catch (err2) {
        columnsError = err2;
      }
    }

    if (columnsError) {
      console.log('❌ Could not get column info via RPC, trying direct query...');
      
      // Direct SQL query to get table structures
      const { data: tableInfo, error: tableError } = await supabase
        .rpc('exec_sql', {
          sql: `
            SELECT 
              table_name,
              column_name,
              data_type,
              is_nullable,
              column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name IN ('patients', 'patient_visits', 'consultations', 'prescriptions', 'users')
            ORDER BY table_name, ordinal_position;
          `
        });

      if (tableError) {
        console.log('❌ Direct SQL query failed, checking tables individually...');
      } else {
        console.log('✅ Table structures retrieved');
        console.log(tableInfo);
      }
    } else {
      console.log('✅ Column information retrieved');
      console.log(columns);
    }

    // 2. Check data counts
    console.log('\n📊 Checking data counts:');
    
    const tables = ['patients', 'patient_visits', 'consultations', 'prescriptions', 'users', 'tenants'];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ ${table}: Error - ${error.message}`);
        } else {
          console.log(`✅ ${table}: ${count} records`);
        }
      } catch (err) {
        console.log(`❌ ${table}: Exception - ${err.message}`);
      }
    }

    // 3. Check specific columns needed for prescription system
    console.log('\n🔍 Checking prescription system dependencies:');
    
    // Check patient_visits for follow_up fields
    const { data: visitSample, error: visitError } = await supabase
      .from('patient_visits')
      .select('id, follow_up_date, follow_up_instructions')
      .limit(1);
    
    if (visitError) {
      console.log(`❌ patient_visits follow_up fields: ${visitError.message}`);
    } else {
      console.log('✅ patient_visits follow_up fields exist');
    }

    // Check consultations structure
    const { data: consultationSample, error: consultationError } = await supabase
      .from('consultations')
      .select('id, patient_id, doctor_id, appointment_id, tenant_id')
      .limit(1);
    
    if (consultationError) {
      console.log(`❌ consultations structure: ${consultationError.message}`);
    } else {
      console.log('✅ consultations structure verified');
    }

    // Check prescriptions structure
    const { data: prescriptionSample, error: prescriptionError } = await supabase
      .from('prescriptions')
      .select('id, consultation_id, patient_id, doctor_id, medications, tenant_id')
      .limit(1);
    
    if (prescriptionError) {
      console.log(`❌ prescriptions structure: ${prescriptionError.message}`);
    } else {
      console.log('✅ prescriptions structure verified');
      if (prescriptionSample && prescriptionSample.length > 0) {
        console.log('📝 Sample prescription:', prescriptionSample[0]);
      }
    }

    // 4. Check users/doctors
    const { data: doctors, error: doctorsError } = await supabase
      .from('users')
      .select('id, full_name, role, tenant_id')
      .eq('role', 'doctor')
      .limit(5);
    
    if (doctorsError) {
      console.log(`❌ doctors query: ${doctorsError.message}`);
    } else {
      console.log(`✅ Found ${doctors.length} doctors`);
      doctors.forEach(doc => console.log(`   - ${doc.full_name} (${doc.id})`));
    }

    // 5. Check patients
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('id, first_name, last_name, uhid, tenant_id')
      .limit(5);
    
    if (patientsError) {
      console.log(`❌ patients query: ${patientsError.message}`);
    } else {
      console.log(`✅ Found ${patients.length} patients`);
      patients.forEach(patient => console.log(`   - ${patient.first_name} ${patient.last_name} (${patient.uhid})`));
    }

    // 6. Check visits
    const { data: visits, error: visitsError } = await supabase
      .from('patient_visits')
      .select('id, visit_number, visit_date, patient_id, doctor_id')
      .limit(5);
    
    if (visitsError) {
      console.log(`❌ visits query: ${visitsError.message}`);
    } else {
      console.log(`✅ Found ${visits.length} visits`);
      visits.forEach(visit => console.log(`   - ${visit.visit_number} on ${visit.visit_date}`));
    }

    console.log('\n🎯 Schema verification complete!');

  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the verification
verifyDatabaseSchema();
