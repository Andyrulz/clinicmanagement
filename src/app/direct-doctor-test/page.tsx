'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Doctor {
  id: string
  name?: string
  full_name: string
  status?: string
  role?: string
  tenant_id?: string
  is_active: boolean
}

interface TestResults {
  tenant?: string
  userRole?: string
  activeDoctors?: { 
    count?: number
    doctors?: Doctor[] | null
    error?: unknown
  }
  allDoctors?: { 
    count?: number
    doctors?: Doctor[] | null
    error?: unknown
  }
  error?: string
}

export default function DirectDoctorTestPage() {
  const [results, setResults] = useState<TestResults>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function testDirectQuery() {
      const supabase = createClient()
      
      try {
        console.log('=== DIRECT DOCTOR TEST ===')
        
        // 1. Get current user and tenant
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setResults({ error: 'Not authenticated' })
          setLoading(false)
          return
        }

        const { data: userData } = await supabase
          .from('users')
          .select('tenant_id, role')
          .eq('auth_user_id', user.id)
          .single()

        if (!userData) {
          setResults({ error: 'User data not found' })
          setLoading(false)
          return
        }

        console.log('Current user tenant:', userData.tenant_id)
        
        // 2. Test the exact same query as visit service
        const { data: doctors, error } = await supabase
          .from('users')
          .select('id, full_name, role, tenant_id, is_active')
          .eq('tenant_id', userData.tenant_id)
          .eq('role', 'doctor')
          .eq('is_active', true)
          .order('full_name')

        console.log('Direct query result:', { doctors, error })

        // 3. Test without is_active filter
        const { data: allDoctors, error: allError } = await supabase
          .from('users')
          .select('id, full_name, role, tenant_id, is_active')
          .eq('tenant_id', userData.tenant_id)
          .eq('role', 'doctor')
          .order('full_name')

        console.log('All doctors query:', { allDoctors, allError })

        setResults({
          tenant: userData.tenant_id,
          userRole: userData.role,
          activeDoctors: { count: doctors?.length || 0, doctors, error },
          allDoctors: { count: allDoctors?.length || 0, doctors: allDoctors, error: allError }
        })

      } catch (error) {
        console.error('Test error:', error)
        setResults({ error: (error as Error).message || 'Unknown error' })
      } finally {
        setLoading(false)
      }
    }

    testDirectQuery()
  }, [])

  if (loading) {
    return <div className="p-8">Testing direct doctor query...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Direct Doctor Query Test</h1>
      <div className="space-y-4">
        {results.error ? (
          <div className="p-4 bg-red-50 text-red-700 rounded">
            Error: {results.error}
          </div>
        ) : (
          <>
            <div className="p-4 bg-blue-50 rounded">
              <p><strong>Tenant ID:</strong> {results.tenant}</p>
              <p><strong>Your Role:</strong> {results.userRole}</p>
            </div>
            
            <div className="p-4 bg-green-50 rounded">
              <h3 className="font-semibold">Active Doctors ({results.activeDoctors?.count || 0})</h3>
              {results.activeDoctors?.doctors?.map((doctor: Doctor) => (
                <div key={doctor.id} className="ml-4">
                  • {doctor.full_name} (Active: {doctor.is_active ? 'Yes' : 'No'})
                </div>
              ))}
              {!!results.activeDoctors?.error && (
                <p className="text-red-600">Error: {String(results.activeDoctors.error)}</p>
              )}
            </div>

            <div className="p-4 bg-yellow-50 rounded">
              <h3 className="font-semibold">All Doctors ({results.allDoctors?.count || 0})</h3>
              {results.allDoctors?.doctors?.map((doctor: Doctor) => (
                <div key={doctor.id} className="ml-4">
                  • {doctor.full_name} (Active: {doctor.is_active ? 'Yes' : 'No'})
                </div>
              ))}
              {!!results.allDoctors?.error && (
                <p className="text-red-600">Error: {String(results.allDoctors.error)}</p>
              )}
            </div>
          </>
        )}
        
        <div className="mt-6 p-4 bg-gray-50 rounded">
          <pre className="text-sm overflow-auto">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
