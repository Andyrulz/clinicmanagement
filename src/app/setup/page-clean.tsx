'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

export default function UserSetup() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form data
  const [clinicName, setClinicName] = useState('')
  const [clinicSlug, setClinicSlug] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India'
  })
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push('/login')
        return
      }
      
      // Check if user already has setup completed
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()
        
      if (existingUser) {
        // User already setup, redirect to dashboard
        router.push('/dashboard')
        return
      }
      
      setUser(user)
      
      // Check if user has invitation token in metadata
      const invitationToken = user.user_metadata?.invitation_token
      
      if (invitationToken) {
        // Handle invitation flow
        try {
          const { data: invitation, error: invitationError } = await supabase
            .from('invitations')
            .select(`
              id,
              tenant_id,
              email,
              role,
              token,
              tenant:tenants(name, slug)
            `)
            .eq('token', invitationToken)
            .is('accepted_at', null)
            .gt('expires_at', new Date().toISOString())
            .single()

          if (invitation && !invitationError) {
            // Auto-accept invitation - create user record directly
            const { error: userError } = await supabase
              .from('users')
              .insert({
                tenant_id: invitation.tenant_id,
                email: user.email!,
                full_name: user.user_metadata?.full_name || user.email!.split('@')[0],
                role: invitation.role,
                auth_user_id: user.id
              })
            
            if (!userError) {
              // Mark invitation as accepted
              await supabase
                .from('invitations')
                .update({
                  accepted_at: new Date().toISOString(),
                  accepted_by: user.id
                })
                .eq('id', invitation.id)
              
              // Redirect to dashboard
              router.push('/dashboard')
              return
            }
          }
        } catch (err) {
          console.error('Error processing invitation:', err)
          // If invitation processing fails, continue with normal setup
          // This ensures user doesn't get stuck
        }
      }
      
      // Pre-fill data from signup if available (for new clinic creation)
      if (user.user_metadata?.clinic_name) {
        setClinicName(user.user_metadata.clinic_name)
        setClinicSlug(user.user_metadata.clinic_name.toLowerCase().replace(/[^a-z0-9]/g, '-'))
      }
      setLoading(false)
    }
    
    checkUser()
  }, [router, supabase])

  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  const handleClinicNameChange = (name: string) => {
    setClinicName(name)
    setClinicSlug(generateSlug(name))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    setSubmitting(true)
    setError(null)

    try {
      // ALWAYS assign admin role for users creating new clinics
      // This solves the "orphaned tenant" problem
      
      // 1. Create tenant record
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: clinicName,
          slug: clinicSlug,
          registration_number: registrationNumber || null,
          phone: phone || null,
          address: {
            street: address.street,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            country: address.country
          },
          subscription_plan: 'free'
        })
        .select()
        .single()
        
      if (tenantError) {
        throw new Error(`Failed to create clinic: ${tenantError.message}`)
      }
      
      // 2. Create user record with ADMIN role (always)
      const { error: userError } = await supabase
        .from('users')
        .insert({
          tenant_id: tenant.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || user.email!.split('@')[0],
          role: 'admin', // FORCED ADMIN ROLE
          phone: phone || null,
          auth_user_id: user.id
        })
        
      if (userError) {
        throw new Error(`Failed to create user: ${userError.message}`)
      }
      
      // 3. Success! Redirect to dashboard
      router.push('/dashboard')
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl border p-8">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
          🏥 Complete Your Setup
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Let&apos;s set up your clinic - you&apos;ll be the admin with full access
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Admin Role Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">👨‍💼 Admin Role Assignment</h3>
            <p className="text-blue-700 text-sm">
              As the creator of this clinic, you will be assigned the <strong>Admin</strong> role with full access to:
            </p>
            <ul className="list-disc list-inside mt-2 text-blue-700 text-sm">
              <li>Invite and manage staff members</li>
              <li>Configure clinic settings</li>
              <li>Access all patient records</li>
              <li>Manage billing and reports</li>
            </ul>
          </div>

          {/* Clinic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="clinicName" className="block text-sm font-semibold text-gray-800 mb-1">
                Clinic/Hospital Name *
              </label>
              <input
                id="clinicName"
                type="text"
                value={clinicName}
                onChange={(e) => handleClinicNameChange(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-800"
                placeholder="ABC Medical Center"
              />
            </div>

            <div>
              <label htmlFor="clinicSlug" className="block text-sm font-semibold text-gray-800 mb-1">
                Clinic URL Identifier *
              </label>
              <input
                id="clinicSlug"
                type="text"
                value={clinicSlug}
                onChange={(e) => setClinicSlug(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-800"
                placeholder="abc-medical-center"
              />
              <p className="text-xs text-gray-600 mt-1">Used for unique identification</p>
            </div>

            <div>
              <label htmlFor="registrationNumber" className="block text-sm font-semibold text-gray-800 mb-1">
                Registration Number
              </label>
              <input
                id="registrationNumber"
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-800"
                placeholder="REG123456"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-800 mb-1">
                Contact Phone
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-800"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Clinic Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <input
                  type="text"
                  value={address.street}
                  onChange={(e) => setAddress({...address, street: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-800"
                  placeholder="Street Address"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={address.city}
                  onChange={(e) => setAddress({...address, city: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-800"
                  placeholder="City"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={address.state}
                  onChange={(e) => setAddress({...address, state: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-800"
                  placeholder="State"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={address.pincode}
                  onChange={(e) => setAddress({...address, pincode: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-800"
                  placeholder="Pincode"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={address.country}
                  onChange={(e) => setAddress({...address, country: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-800"
                  placeholder="Country"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-100 border border-red-400 rounded-md">
              <p className="text-sm text-red-800 font-medium">❌ {error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !clinicName || !clinicSlug}
            className="w-full bg-blue-700 text-white py-4 px-6 rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold text-lg"
          >
            {submitting ? 'Setting up your clinic...' : 'Complete Setup & Go to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  )
}
