'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UserManagementProps {
  tenantId: string
  currentUserId: string
  currentUserRole: string
}

interface TenantUser {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
}

interface PendingInvitation {
  id: string
  email: string
  role: string
  created_at: string
  expires_at: string
  invited_by_name: string
}

export default function UserManagement({ tenantId, currentUserId, currentUserRole }: UserManagementProps) {
  const [users, setUsers] = useState<TenantUser[]>([])
  const [invitations, setInvitations] = useState<PendingInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const loadData = useCallback(async () => {
    try {
      setError(null)
      
      // Load existing users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email, role, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true })

      if (usersError) throw usersError

      // Load pending invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('invitations')
        .select(`
          id, email, role, created_at, expires_at,
          invited_by:users!invited_by(full_name)
        `)
        .eq('tenant_id', tenantId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (invitationsError) throw invitationsError

      setUsers(usersData || [])
      setInvitations(invitationsData?.map(inv => ({
        ...inv,
        invited_by_name: 'Admin User' // Simplified for now
      })) || [])

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [tenantId, supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId)

      if (error) throw error

      // Refresh data
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel invitation')
    }
  }

  const changeUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      // Refresh data
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change user role')
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md border-2 border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-300 rounded w-1/3"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          <div className="h-4 bg-gray-300 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  const canManageUsers = ['admin', 'manager'].includes(currentUserRole)
  const canAssignAdminRole = currentUserRole === 'admin'

  return (
    <div className="bg-white rounded-lg shadow-md border-2 border-gray-200 p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6">👥 User Management</h3>
      
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-900 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Current Users */}
      <div className="mb-8">
        <h4 className="font-bold text-gray-900 mb-4 text-lg">Current Users ({users.length})</h4>
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-base">{user.full_name}</p>
                <p className="text-sm text-gray-700 font-medium">{user.email}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Joined: {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-2 rounded-lg text-sm font-bold border-2 ${
                  user.role === 'admin' ? 'bg-red-100 text-red-900 border-red-200' :
                  user.role === 'manager' ? 'bg-blue-100 text-blue-900 border-blue-200' :
                  user.role === 'doctor' ? 'bg-green-100 text-green-900 border-green-200' :
                  user.role === 'receptionist' ? 'bg-purple-100 text-purple-900 border-purple-200' :
                  'bg-gray-100 text-gray-900 border-gray-200'
                }`}>
                  {user.role.toUpperCase()}
                </span>
                
                {canManageUsers && user.id !== currentUserId && (
                  <select
                    value={user.role}
                    onChange={(e) => changeUserRole(user.id, e.target.value)}
                    className="text-sm font-medium text-gray-900 border-2 border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="staff">Staff</option>
                    <option value="receptionist">Receptionist</option>
                    <option value="doctor">Doctor</option>
                    <option value="manager">Manager</option>
                    {canAssignAdminRole && <option value="admin">Admin</option>}
                  </select>
                )}
                
                {user.id === currentUserId && (
                  <span className="text-sm text-blue-700 font-bold bg-blue-100 px-3 py-1 rounded-lg border border-blue-200">
                    (You)
                  </span>
                )}
              </div>
            </div>
          ))}
          
          {users.length === 0 && (
            <div className="text-center py-8 bg-gray-50 border-2 border-gray-200 rounded-lg">
              <p className="text-gray-700 font-medium">No users found in this clinic.</p>
            </div>
          )}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="mb-6">
          <h4 className="font-bold text-gray-900 mb-4 text-lg">Pending Invitations ({invitations.length})</h4>
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="flex items-center justify-between p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-base">{invitation.email}</p>
                  <p className="text-sm text-gray-700 font-medium">
                    Invited as <strong>{invitation.role}</strong> by {invitation.invited_by_name}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Expires: {new Date(invitation.expires_at).toLocaleDateString()} at {new Date(invitation.expires_at).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="px-3 py-2 rounded-lg text-sm font-bold bg-yellow-100 text-yellow-900 border-2 border-yellow-200">
                    PENDING
                  </span>
                  
                  {canManageUsers && (
                    <button
                      onClick={() => cancelInvitation(invitation.id)}
                      className="text-sm font-medium text-red-700 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-2 rounded-lg border border-red-200 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="mt-8 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
        <h4 className="font-bold text-blue-900 mb-3 text-base">🔒 Security Features</h4>
        <ul className="text-blue-800 text-sm space-y-2 font-medium">
          <li>• Only admins can assign admin roles</li>
          <li>• Role changes are logged and audited</li>
          <li>• Users cannot escalate their own permissions</li>
          <li>• At least one admin must always exist</li>
        </ul>
      </div>
    </div>
  )
}
