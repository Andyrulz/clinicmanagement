'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogoutButton } from '@/components/auth/logout-button'
import { User, ChevronDown, Settings, HelpCircle } from 'lucide-react'

interface UserInfo {
  email: string
  name?: string
  role?: string
}

export function DashboardHeader() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Get additional user info from database
          const { data: userRecord } = await supabase
            .from('users')
            .select('name, role')
            .eq('auth_user_id', user.id)
            .single()

          setUserInfo({
            email: user.email || '',
            name: userRecord?.name,
            role: userRecord?.role
          })
        }
      } catch (error) {
        console.error('Error loading user info:', error)
      }
    }

    loadUserInfo()
  }, [supabase])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getDisplayName = () => {
    if (userInfo?.name) return userInfo.name
    if (userInfo?.email) return userInfo.email.split('@')[0]
    return 'User'
  }

  const getRoleDisplayName = (role?: string) => {
    switch (role) {
      case 'admin': return 'Administrator'
      case 'doctor': return 'Doctor'
      case 'receptionist': return 'Receptionist'
      case 'manager': return 'Manager'
      default: return 'Staff'
    }
  }

  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Logo/Title */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">Clinic Management System</h1>
          </div>

          {/* Right side - User Profile */}
          <div className="flex items-center space-x-4">
            {/* User Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="User menu"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-medium text-gray-900">{getDisplayName()}</p>
                    {userInfo?.role && (
                      <p className="text-xs text-gray-500">{getRoleDisplayName(userInfo.role)}</p>
                    )}
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{getDisplayName()}</p>
                    <p className="text-sm text-gray-500">{userInfo?.email}</p>
                    {userInfo?.role && (
                      <p className="text-xs text-gray-400 mt-1">{getRoleDisplayName(userInfo.role)}</p>
                    )}
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <button className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center">
                      <Settings className="w-4 h-4 mr-3" />
                      Settings
                    </button>
                    <button className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center">
                      <HelpCircle className="w-4 h-4 mr-3" />
                      Help & Support
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-100 pt-2">
                    <LogoutButton variant="dropdown" showConfirmation={true} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardHeader
