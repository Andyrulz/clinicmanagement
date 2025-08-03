const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Please check your .env.local file for NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  try {
    // Get all tables
    const { data: tables, error: tablesError } = await supabase.rpc('get_table_info');
    
    if (tablesError) {
      // Fallback method
      console.log('Using fallback method to check tables...');
      
      // Try to query auth.users first
      const { data: authUsers, error: authError } = await supabase
        .from('auth.users')
        .select('id, email')
        .limit(1);
      
      if (!authError) {
        console.log('✓ auth.users table exists');
      } else {
        console.log('✗ auth.users table error:', authError.message);
      }
      
      // Check custom tables
      const tablesToCheck = ['tenants', 'users', 'patients', 'patient_visits', 'doctor_availability'];
      
      for (const tableName of tablesToCheck) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (error) {
            console.log(`✗ ${tableName}: ${error.message}`);
          } else {
            console.log(`✓ ${tableName} table exists`);
          }
        } catch (err) {
          console.log(`✗ ${tableName}: ${err.message}`);
        }
      }
    } else {
      console.log('Tables found:', tables);
    }
  } catch (err) {
    console.log('Error:', err.message);
  }
}

checkDatabase();
