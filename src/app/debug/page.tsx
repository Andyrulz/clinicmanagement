'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DebugPage() {
  const [testResults, setTestResults] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(false)

  const testDatabase = async () => {
    setLoading(true)
    const supabase = createClient()
    const results: Record<string, unknown> = {}

    try {
      // Test auth
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      results.auth = { user: user?.id, error: authError?.message }

      if (user) {
        // Test users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, tenant_id, role')
          .eq('auth_user_id', user.id)
          .single()
        
        results.currentUser = { data: userData, error: userError?.message }

        if (userData) {
          // Test patients table
          const { data: patients, error: patientsError } = await supabase
            .from('patients')
            .select('id, first_name, last_name, phone, uhid')
            .eq('tenant_id', userData.tenant_id)
            .limit(5)
          
          results.patients = { data: patients, error: patientsError?.message }

          // Test doctors
          const { data: doctors, error: doctorsError } = await supabase
            .from('users')
            .select('id, full_name, role')
            .eq('tenant_id', userData.tenant_id)
            .eq('role', 'doctor')
            .eq('is_active', true)
          
          results.doctors = { data: doctors, error: doctorsError?.message }
        }
      }
    } catch (error) {
      results.globalError = error
    }

    setTestResults(results)
    setLoading(false)
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Database Debug</h1>
      
      <button 
        onClick={testDatabase}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 mb-4"
      >
        {loading ? 'Testing...' : 'Test Database Connection'}
      </button>

      <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
        {JSON.stringify(testResults, null, 2)}
      </pre>
    </div>
  )
}
