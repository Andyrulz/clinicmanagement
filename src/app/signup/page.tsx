'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

interface InvitationData {
  id: string
  tenant_id: string
  email: string
  role: string
  token: string
  tenant: {
    name: string
    slug: string
  }
}

function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [clinicName, setClinicName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [checkingInvitation, setCheckingInvitation] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Check for invitation token on component mount
  useEffect(() => {
    const checkInvitation = async (token: string) => {
      setCheckingInvitation(true)
      setError(null)

      try {
        const { data, error } = await supabase
          .from('invitations')
          .select(`
            id,
            tenant_id,
            email,
            role,
            token,
            expires_at,
            accepted_at,
            tenant:tenants(name, slug)
          `)
          .eq('token', token)
          .is('accepted_at', null)
          .gt('expires_at', new Date().toISOString())
          .single()

        if (error || !data) {
          setError('Invalid or expired invitation link')
          return
        }

        setInvitation({
          id: data.id,
          tenant_id: data.tenant_id,
          email: data.email,
          role: data.role,
          token: data.token,
          tenant: Array.isArray(data.tenant) ? data.tenant[0] : data.tenant
        })
        
        // Pre-fill email from invitation
        setEmail(data.email)
        
      } catch {
        setError('Failed to validate invitation')
      } finally {
        setCheckingInvitation(false)
      }
    }

    const invitationToken = searchParams.get('invitation')
    if (invitationToken) {
      checkInvitation(invitationToken)
    }
  }, [searchParams, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try {
      // Create the auth user
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            clinic_name: invitation ? invitation.tenant.name : clinicName.trim(),
            invitation_token: invitation?.token || null
          }
        }
      })

      if (error) {
        throw error
      }

      if (!data.user) {
        throw new Error('Failed to create user account')
      }

      // Show success message
      if (invitation) {
        setMessage(`✅ Account created successfully! You've been invited to join ${invitation.tenant.name}. Please check your email for verification.`)
      } else {
        setMessage('✅ Account created successfully! Please check your email for verification.')
      }
      
      // Clear form
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setFullName('')
      setClinicName('')

    } catch (err: unknown) {
      console.error('Signup error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during signup')
    } finally {
      setLoading(false)
    }
  }

  if (checkingInvitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Validating invitation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl border p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {invitation ? '👋 Join Clinic' : '🏥 Create Account'}
          </h1>
          <p className="text-gray-600">
            {invitation 
              ? `You've been invited to join ${invitation.tenant.name}`
              : 'Start managing your clinic today'
            }
          </p>
        </div>

        {invitation && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">Invitation Details:</h3>
            <p className="text-blue-700 text-sm">
              <strong>Clinic:</strong> {invitation.tenant.name}<br/>
              <strong>Role:</strong> {invitation.role}<br/>
              <strong>Email:</strong> {invitation.email}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={!!invitation}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                invitation ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            />
          </div>

          {/* Clinic Name - only show if not invitation */}
          {!invitation && (
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Clinic Name *
              </label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="Enter your clinic name"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Password *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Confirm Password *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {message && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-700 text-sm">{message}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Already have an account?{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
      <SignupForm />
    </Suspense>
  )
}
