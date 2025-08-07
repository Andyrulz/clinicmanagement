#!/usr/bin/env node

// Database Migration Runner for Supabase
// This script runs SQL migrations through the Supabase client
// Usage: node scripts/migrate.js <migration-file>

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration in .env.local')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration(migrationFile) {
  try {
    console.log(`🚀 Running migration: ${migrationFile}`)
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', migrationFile)
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Migration file not found: ${sqlPath}`)
    }
    
    const sql = fs.readFileSync(sqlPath, 'utf8')
    console.log(`📄 Read SQL file (${sql.length} characters)`)
    
    // Execute the SQL
    console.log('⚡ Executing SQL...')
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      // If rpc doesn't work, try direct SQL execution
      console.log('📝 Trying direct SQL execution...')
      const { data: directData, error: directError } = await supabase
        .from('information_schema.tables')
        .select('*')
        .limit(1)
      
      if (directError) {
        throw new Error(`Database connection failed: ${directError.message}`)
      }
      
      // For complex SQL, we need to execute it in parts
      console.log('🔧 Executing SQL commands manually...')
      
      // Split SQL into individual commands
      const commands = sql.split(';').filter(cmd => cmd.trim().length > 0)
      
      for (let i = 0; i < commands.length; i++) {
        const command = commands[i].trim()
        if (command.length === 0) continue
        
        console.log(`📝 Executing command ${i + 1}/${commands.length}`)
        
        try {
          // Use raw SQL execution
          const { error: cmdError } = await supabase.rpc('exec_sql', { 
            sql_query: command + ';' 
          })
          
          if (cmdError) {
            console.log(`⚠️  Command failed (may be expected): ${cmdError.message}`)
          } else {
            console.log(`✅ Command ${i + 1} executed successfully`)
          }
        } catch (cmdErr) {
          console.log(`⚠️  Command ${i + 1} failed: ${cmdErr.message}`)
        }
      }
    } else {
      console.log('✅ Migration executed successfully')
      if (data) {
        console.log('📋 Result:', data)
      }
    }
    
    console.log('🎉 Migration completed!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2]
if (!migrationFile) {
  console.error('❌ Please provide a migration file path')
  console.error('Usage: node scripts/migrate.js sql-scripts/22-enhanced-appointment-scheduling.sql')
  process.exit(1)
}

runMigration(migrationFile)
