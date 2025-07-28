'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface InviteUserFormProps {
  tenantId: string
  currentUserId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export default function InviteUserForm({ 
  tenantId, 
  currentUserId, 
  onSuccess, 
  onCancel 
}: InviteUserFormProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'staff' | 'manager' | 'admin' | 'doctor' | 'receptionist'>('staff')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address')
      }

      // Check current user's role first (application-level security)
      const { data: currentUser, error: currentUserError } = await supabase
        .from('users')
        .select('role, tenant_id')
        .eq('id', currentUserId)
        .single()

      if (currentUserError || !currentUser) {
        throw new Error('Unable to verify your permissions')
      }

      if (!['admin', 'manager'].includes(currentUser.role)) {
        throw new Error('Only admins and managers can send invitations')
      }

      if (currentUser.tenant_id !== tenantId) {
        throw new Error('You can only invite users to your own clinic')
      }

      // Check if user already exists in this tenant
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .eq('tenant_id', tenantId)
        .single()

      if (existingUser) {
        throw new Error('User with this email already exists in your clinic')
      }

      // Check if invitation already exists
      const { data: existingInvitation } = await supabase
        .from('invitations')
        .select('id')
        .eq('email', email)
        .eq('tenant_id', tenantId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (existingInvitation) {
        throw new Error('An active invitation for this email already exists')
      }

      // Create invitation using the secure database function
      const { data, error: inviteError } = await supabase
        .rpc('create_invitation_secure', {
          p_tenant_id: tenantId,
          p_email: email,
          p_role: role,
          p_invited_by: currentUserId,
          p_expires_in_hours: 72
        })

      if (inviteError) {
        throw new Error(`Failed to create invitation: ${inviteError.message}`)
      }

      if (!data || data.length === 0) {
        throw new Error('Failed to generate invitation')
      }

      const { invitation_token } = data[0]

      // Get current user's name and clinic info for the email
      const { data: userData } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', currentUserId)
        .single()

      const { data: tenantData } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', tenantId)
        .single()

      const inviterName = userData 
        ? `${userData.first_name} ${userData.last_name}`.trim() 
        : 'Your colleague'
      const clinicName = tenantData?.name || 'Your clinic'

      // Send invitation email via API
      let emailSent = false
      let emailError = null
      let invitationUrl = `${window.location.origin}/signup?invitation=${invitation_token}`
      
      try {
        const emailResponse = await fetch('/api/send-invitation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            invitationToken: invitation_token,
            inviterName,
            clinicName,
            role,
          }),
        })

        const emailResult = await emailResponse.json()
        
        if (emailResponse.ok && emailResult.success) {
          emailSent = emailResult.emailConfigured
          console.log('✅ Email result:', emailResult)
        } else {
          emailError = emailResult.error || emailResult.message
          console.error('❌ Email sending failed:', emailResult)
        }

        // Update URL if provided by API
        if (emailResult.invitationUrl) {
          invitationUrl = emailResult.invitationUrl
        }
      } catch (emailApiError) {
        emailError = `API Error: ${emailApiError instanceof Error ? emailApiError.message : 'Unknown error'}`
        console.error('❌ Email API error:', emailApiError)
      }

      console.log('Invitation created:', {
        email,
        role,
        token: invitation_token,
        url: invitationUrl,
        emailSent,
        emailError
      })

      setSuccess(true)
      setEmail('')
      setRole('staff')
      
      // Auto-copy the invitation link to clipboard
      try {
        await navigator.clipboard.writeText(invitationUrl)
        console.log('✅ Invitation link copied to clipboard')
      } catch (clipboardError) {
        console.warn('Failed to copy to clipboard:', clipboardError)
      }
      
      // Call success callback
      if (onSuccess) {
        onSuccess()
      }

      // Show appropriate success message
      let message
      if (emailSent) {
        message = `✅ Invitation email sent to ${email}!\n\nThe invitation link has been copied to your clipboard as backup.`
      } else if (emailError) {
        if (emailError.includes('testing emails to your own email address') || emailError.includes('Testing Mode')) {
          message = `⚠️ Invitation created for ${email}!\n\n📧 RESEND RESTRICTION: Domain verification required to send to other emails.\n\n💡 SOLUTION: Set up Gmail SMTP in your .env.local to send from your personal email!\n\n🔗 The invitation link has been copied to your clipboard:\n${invitationUrl}`
        } else if (emailError.includes('Gmail authentication failed')) {
          message = `⚠️ Invitation created for ${email}!\n\n� GMAIL SETUP NEEDED: Please create a Gmail app password.\n\n🔗 The invitation link has been copied to your clipboard:\n${invitationUrl}\n\n💡 Check GMAIL-SETUP.md for instructions`
        } else {
          message = `⚠️ Invitation created for ${email}!\n\nHowever, email sending failed: ${emailError}\n\nThe invitation link has been copied to your clipboard:\n${invitationUrl}`
        }
      } else {
        message = `✅ Invitation created for ${email}!\n\nEmail not configured yet - the invitation link has been copied to your clipboard:\n${invitationUrl}\n\n(Set up Gmail SMTP or Resend to enable automatic emails)`
      }

      alert(message)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
        <div className="text-green-600 text-4xl mb-4">✅</div>
        <h3 className="text-lg font-bold text-green-900 mb-2">
          Invitation Sent Successfully!
        </h3>
        <p className="text-green-800 mb-4">
          An invitation has been sent to <strong>{email}</strong>
        </p>
        <button
          onClick={() => {
            setSuccess(false)
            if (onCancel) onCancel()
          }}
          className="px-6 py-2 bg-green-700 text-white font-medium rounded-lg hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
        >
          Close
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-xl font-bold text-gray-900 mb-6">
        📧 Invite New User
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Input */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Email Address *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
            className="w-full px-4 py-3 text-gray-900 placeholder:text-gray-500 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
          />
        </div>

        {/* Role Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Assign Role * 
          </label>
          <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
            <p className="text-yellow-900 text-sm font-medium">
              🔒 <strong>Security Note:</strong> The invited user will be assigned this exact role. They cannot change it during signup.
            </p>
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'staff' | 'manager' | 'admin' | 'doctor' | 'receptionist')}
            required
            className="w-full px-4 py-3 text-gray-900 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
          >
            <option value="staff">Staff - Basic access to patient records and appointments</option>
            <option value="receptionist">Receptionist - Patient registration and billing</option>
            <option value="doctor">Doctor - Full patient management and medical records</option>
            <option value="manager">Manager - Can manage staff and clinic operations</option>
            <option value="admin">⚠️ Admin - Full access (Use with caution!)</option>
          </select>
          <p className="text-sm text-gray-700 mt-2 font-medium">
            Choose carefully - this role will be permanently assigned to the user.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <p className="text-red-900 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            {loading ? 'Sending Invitation...' : 'Send Invitation'}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
        <p className="text-blue-900 text-sm font-medium">
          💡 <strong>Note:</strong> Invitations expire after 72 hours. The invited user will need to create an account and use the invitation link to join your clinic.
        </p>
      </div>
    </div>
  )
}
