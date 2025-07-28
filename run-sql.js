// Run SQL script
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://vflnlornzaqigcqegqif.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbG5sb3JuemFxaWdjcWVncWlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzU0ODQ1MywiZXhwIjoyMDY5MTI0NDUzfQ.co925WrXmxL_qjxTl7Oxzi25gfu5U6aT59ZMaFinqiA'
);

async function runSQLScript() {
  try {
    // Read the SQL script
    const sqlScript = fs.readFileSync('./sql-scripts/19-enhanced-prescription-system.sql', 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = sqlScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`🔄 Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n📝 Statement ${i + 1}:`, statement.substring(0, 100) + '...');
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.log(`❌ Error in statement ${i + 1}:`, error.message);
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.log(`❌ Exception in statement ${i + 1}:`, err.message);
      }
    }
    
    console.log('\n🎯 SQL script execution complete!');
    
  } catch (error) {
    console.error('❌ Failed to read or execute SQL script:', error.message);
  }
}

runSQLScript();
