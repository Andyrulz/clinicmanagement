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
        console.log('Auth status:', { user: user?.id, authError })
        
        // 2. Get current user info
        if (user) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('auth_user_id', user.id)
            .single()
          
          console.log('Current user data:', { userData, userError })
          
          if (userData) {
            // 3. Query all users in the same tenant
            const { data: allUsers, error: allUsersError } = await supabase
              .from('users')
              .select('*')
              .eq('tenant_id', userData.tenant_id)
            
            console.log('All users in tenant:', { allUsers, allUsersError })
            
            // 4. Query doctors specifically
            const { data: doctors, error: doctorsError } = await supabase
              .from('users')
              .select('id, full_name, role, tenant_id, is_active')
              .eq('tenant_id', userData.tenant_id)
              .eq('role', 'doctor')
              .eq('is_active', true)
            
            console.log('Doctors query:', { doctors, doctorsError })
            
                        // 5. Query doctors without is_active filter
            const { data: allDoctors, error: allDoctorsError } = await supabase
              .from('users')
              .select('id, full_name, role, tenant_id, is_active')
              .eq('tenant_id', userData.tenant_id)
              .eq('role', 'doctor')
            
            console.log('All doctors (including inactive):', { allDoctors, allDoctorsError })
            
            // 6. Try to create a doctor record if none exists
            const doctorExists = allDoctors && allDoctors.length > 0
            let doctorCreationResult: string | { newDoctor: unknown; createError: unknown } = 'Doctor already exists'
            
            if (!doctorExists) {
              console.log('No doctors found, attempting to create one...')
              const { data: newDoctor, error: createError } = await supabase
                .from('users')
                .insert({
                  tenant_id: userData.tenant_id,
                  email: 'doctor@example.com',
                  full_name: 'Test Doctor',
                  role: 'doctor',
                  phone: '+919999999999',
                  is_active: true,
                  auth_user_id: null // This will be null since it's not a real auth user
                })
                .select()
                .single()
              
              console.log('Doctor creation result:', { newDoctor, createError })
              doctorCreationResult = { newDoctor, createError }
            }
            
            setResults({
              auth: { user: user?.id, authError },
              currentUser: { userData, userError },
              allUsers: { allUsers, allUsersError },
              doctors: { doctors, doctorsError },
              allDoctors: { allDoctors, allDoctorsError },
              doctorCreation: doctorCreationResult
            })
          }
        }
        
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
    return <div className="p-8">Loading test results...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Doctor Query Test Results</h1>
      <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
        {JSON.stringify(results, null, 2)}
      </pre>
    </div>
  )
}
