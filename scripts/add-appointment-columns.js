// Simple Database Column Adder
// Adds the missing appointment columns to patient_visits table
// Run with: node scripts/add-appointment-columns.js

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

async function addAppointmentColumns() {
  console.log('🚀 Adding appointment columns to patient_visits table...')
  
  const columns = [
    {
      name: 'scheduled_date',
      sql: 'ALTER TABLE patient_visits ADD COLUMN IF NOT EXISTS scheduled_date date;'
    },
    {
      name: 'scheduled_time', 
      sql: 'ALTER TABLE patient_visits ADD COLUMN IF NOT EXISTS scheduled_time time;'
    },
    {
      name: 'duration_minutes',
      sql: 'ALTER TABLE patient_visits ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 30;'
    },
    {
      name: 'appointment_status',
      sql: 'ALTER TABLE patient_visits ADD COLUMN IF NOT EXISTS appointment_status text DEFAULT \'scheduled\';'
    },
    {
      name: 'appointment_source',
      sql: 'ALTER TABLE patient_visits ADD COLUMN IF NOT EXISTS appointment_source text DEFAULT \'manual\';'
    }
  ]
  
  for (const column of columns) {
    try {
      console.log(`📝 Adding column: ${column.name}`)
      
      // Use Supabase's SQL execution
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: column.sql 
      })
      
      if (error) {
        // Fallback: try to check if column exists and add it
        console.log(`ℹ️  RPC failed for ${column.name}, trying alternative method...`)
        
        // Check if column exists
        const { data: checkData, error: checkError } = await supabase
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_name', 'patient_visits')
          .eq('column_name', column.name)
          
        if (checkError) {
          console.log(`⚠️  Could not check column ${column.name}: ${checkError.message}`)
        } else if (checkData && checkData.length === 0) {
          console.log(`➕ Column ${column.name} does not exist, needs to be added manually`)
        } else {
          console.log(`✅ Column ${column.name} already exists`)
        }
      } else {
        console.log(`✅ Successfully added column: ${column.name}`)
      }
    } catch (err) {
      console.log(`⚠️  Error with column ${column.name}: ${err.message}`)
    }
  }
  
  console.log('🎉 Column addition process completed!')
  console.log('📋 Next: Check Supabase dashboard to verify columns were added')
}

addAppointmentColumns().catch(console.error)
