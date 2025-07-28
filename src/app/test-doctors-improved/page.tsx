'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TestDoctorsPage() {
  const [results, setResults] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function testDoctorQuery() {
      const supabase = createClient()
      
      try {
        console.log('=== Testing Doctor Query ===')
        
        // 1. Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        console.log('Auth status:', { user: user?.id, email: user?.email, authError })
        
        if (authError) {
          setResults({ 
            error: 'Authentication failed', 
            authError: authError.message,
            suggestion: 'Please make sure you are logged in'
          })
          setLoading(false)
          return
        }

        if (!user) {
          setResults({ 
            error: 'No authenticated user', 
            suggestion: 'Please log in to test the doctor query'
          })
          setLoading(false)
          return
        }

        // 2. Get current user info
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', user.id)
          .single()
        
        console.log('Current user data:', { userData, userError })
        
        if (userError || !userData) {
          setResults({
            auth: { user: user?.id, email: user?.email },
            error: 'User data not found in users table',
            userError: userError?.message,
            suggestion: 'Your auth user might not have a corresponding record in the users table'
          })
          setLoading(false)
          return
        }
        
        // 3. Query all users in the same tenant
        const { data: allUsers, error: allUsersError } = await supabase
          .from('users')
          .select('*')
          .eq('tenant_id', userData.tenant_id)
        
        console.log('All users in tenant:', { allUsers, allUsersError })
        
        // 4. Query doctors specifically with active filter
        const { data: doctors, error: doctorsError } = await supabase
          .from('users')
          .select('id, full_name, role, tenant_id, is_active, email')
          .eq('tenant_id', userData.tenant_id)
          .eq('role', 'doctor')
          .eq('is_active', true)
        
        console.log('Active doctors query:', { doctors, doctorsError })
        
        // 5. Query doctors without active filter
        const { data: allDoctors, error: allDoctorsError } = await supabase
          .from('users')
          .select('id, full_name, role, tenant_id, is_active, email')
          .eq('tenant_id', userData.tenant_id)
          .eq('role', 'doctor')
        
        console.log('All doctors (including inactive):', { allDoctors, allDoctorsError })
        
        // 6. Test direct query to check RLS
        const { data: directQuery, error: directError } = await supabase
          .from('users')
          .select('id, full_name, role, tenant_id, is_active, email')
          .eq('role', 'doctor')
        
        console.log('Direct doctors query (no tenant filter):', { directQuery, directError })
        
        setResults({
          auth: { 
            user: user?.id, 
            email: user?.email,
            authError: authError ? String(authError) : null 
          },
          currentUser: { userData, userError: userError ? String(userError) : null },
          allUsers: { 
            count: allUsers?.length || 0,
            users: allUsers, 
            allUsersError: allUsersError ? String(allUsersError) : null 
          },
          activeDoctors: { 
            count: doctors?.length || 0,
            doctors, 
            doctorsError: doctorsError?.message || null 
          },
          allDoctors: { 
            count: allDoctors?.length || 0,
            doctors: allDoctors, 
            allDoctorsError: allDoctorsError?.message || null 
          },
          directQuery: {
            count: directQuery?.length || 0,
            doctors: directQuery,
            directError: directError?.message || null
          },
          tenantId: userData.tenant_id
        })
        
      } catch (error) {
        console.error('Test error:', error)
        setResults({ error: error instanceof Error ? error.message : 'Unknown error' })
      } finally {
        setLoading(false)
      }
    }

    testDoctorQuery()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading test results...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Doctor Query Test Results</h1>
      
      {!!results.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-red-800 mb-2">Error Detected</h2>
          <p className="text-red-700">{results.error as string}</p>
          {!!results.suggestion && (
            <p className="text-red-600 mt-2 text-sm">💡 {results.suggestion as string}</p>
          )}
        </div>
      )}
      
      <div className="bg-gray-50 border rounded-lg p-4 overflow-auto">
        <pre className="text-sm whitespace-pre-wrap">
          {JSON.stringify(results, null, 2)}
        </pre>
      </div>
      
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="font-semibold text-blue-800 mb-2">Next Steps:</h2>
        <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
          <li>Execute the SQL script: <code>/sql-scripts/16-fix-users-rls-for-tenant-access.sql</code></li>
          <li>Insert sample doctors using: <code>/sql-scripts/17-sample-doctor-data.sql</code></li>
          <li>Refresh this page to see if doctors appear</li>
        </ol>
      </div>
    </div>
  )
}
