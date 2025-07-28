'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface SignupFormProps {
  onSuccess?: () => void
}

export default function SignupForm({ onSuccess }: SignupFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [clinicName, setClinicName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

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
            clinic_name: clinicName.trim(),
          }
        }
      })

      if (error) {
        setError(error.message)
      } else if (data.user) {
        setMessage('Account created successfully! Please check your email to verify your account.')
        onSuccess?.()
        // Note: We'll handle tenant/user creation after email verification
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-xl border">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
        🏥 Create Clinic Account
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="clinicName" className="block text-sm font-semibold text-gray-800 mb-1">
            Clinic/Hospital Name
          </label>
          <input
            id="clinicName"
            type="text"
            value={clinicName}
            onChange={(e) => setClinicName(e.target.value)}
            required
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-800 bg-white"
            placeholder="ABC Medical Center"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="fullName" className="block text-sm font-semibold text-gray-800 mb-1">
            Your Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-800 bg-white"
            placeholder="Dr. John Smith"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-800 bg-white"
            placeholder="doctor@clinic.com"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-800 bg-white"
            placeholder="At least 6 characters"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-800 mb-1">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-800 bg-white"
            placeholder="Repeat your password"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="p-4 bg-red-100 border border-red-400 rounded-md">
            <p className="text-sm text-red-800 font-medium">❌ {error}</p>
          </div>
        )}

        {message && (
          <div className="p-4 bg-green-100 border border-green-400 rounded-md">
            <p className="text-sm text-green-800 font-medium">✅ {message}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email || !password || !fullName || !clinicName}
          className="w-full bg-green-700 text-white py-3 px-4 rounded-md hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-700">
          Already have an account?{' '}
          <button
            onClick={() => router.push('/login')}
            className="text-blue-700 hover:text-blue-600 font-semibold underline"
          >
            Sign in here
          </button>
        </p>
      </div>
    </div>
  )
}
