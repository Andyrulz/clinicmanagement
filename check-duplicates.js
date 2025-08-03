const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findDuplicates() {
  try {
    const { data, error } = await supabase
      .from('doctor_availability')
      .select('*')
      .order('doctor_id, day_of_week, start_time');
      
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('Total availability records:', data.length);
    
    // Group by doctor_id, day_of_week, start_time, end_time
    const groups = {};
    data.forEach(record => {
      const key = `${record.doctor_id}-${record.day_of_week}-${record.start_time}-${record.end_time}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(record);
    });
    
    // Find duplicates
    const duplicates = Object.entries(groups).filter(([key, records]) => records.length > 1);
    console.log('Duplicate groups found:', duplicates.length);
    
    if (duplicates.length > 0) {
      console.log('\nDuplicate details:');
      duplicates.forEach(([key, records]) => {
        console.log(`\nDuplicate: ${key} - ${records.length} records`);
        records.forEach(record => {
          console.log(`  ID: ${record.id}, Max Patients: ${record.max_patients_per_slot}, Created: ${record.created_at}`);
        });
      });
    } else {
      console.log('No duplicates found!');
    }
  } catch (error) {
    console.error('Script error:', error);
  }
}

findDuplicates();
