'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogoutButton } from '@/components/auth/logout-button'
import { User, ChevronDown, Settings, HelpCircle, Calendar, Plus, Home, Search, UserPlus } from 'lucide-react'

interface UserInfo {
  email: string
  name?: string
  role?: string
}

interface Patient {
  id: string
  first_name: string
  last_name: string
  phone?: string
  email?: string
}

export function DashboardHeader() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [patientSearchQuery, setPatientSearchQuery] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)
  const [loadingPatients, setLoadingPatients] = useState(false)
  const [selectedPatientIndex, setSelectedPatientIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const patientSearchRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()
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
      if (patientSearchRef.current && !patientSearchRef.current.contains(event.target as Node)) {
        setShowPatientDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Patient search function
  const searchPatients = useCallback(async (query: string) => {
    if (query.length < 2) {
      setPatients([])
      setShowPatientDropdown(false)
      return
    }

    try {
      setLoadingPatients(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single()

      if (!profile) return

      const { data: patientsData, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, phone, email')
        .eq('tenant_id', profile.tenant_id)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(10)

      if (!error && patientsData) {
        setPatients(patientsData)
        setShowPatientDropdown(true)
      }
    } catch (error) {
      console.error('Error searching patients:', error)
    } finally {
      setLoadingPatients(false)
    }
  }, [supabase])

  // Debounced patient search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (patientSearchQuery.length >= 2) {
        searchPatients(patientSearchQuery)
      } else {
        setPatients([])
        setShowPatientDropdown(false)
      }
      setSelectedPatientIndex(-1) // Reset selection when search changes
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [patientSearchQuery, searchPatients])

  // Handle patient selection
  const handlePatientSelect = (patient: Patient) => {
    setPatientSearchQuery(`${patient.first_name} ${patient.last_name}`)
    setShowPatientDropdown(false)
    // Navigate to patient details or visits
    router.push(`/dashboard/patients/${patient.id}`)
  }

  // Handle add new patient
  const handleAddNewPatient = () => {
    setShowPatientDropdown(false)
    // Navigate to add patient with search query as initial data
    router.push(`/dashboard/patients?add=true&name=${encodeURIComponent(patientSearchQuery)}`)
  }

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left side - Logo/Title */}
          <div className="flex items-center space-x-4 lg:space-x-6 flex-shrink-0">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
              title="Go to Dashboard Home"
            >
              <Home className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 hidden sm:block">
                Clinic Management System
              </h1>
              <h1 className="text-lg font-bold text-gray-900 sm:hidden">CMS</h1>
            </button>

            {/* Patient Search Bar - Hidden on mobile */}
            <div className="relative hidden md:block" ref={patientSearchRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search patients..."
                  value={patientSearchQuery}
                  onChange={(e) => setPatientSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      setSelectedPatientIndex(prev => 
                        prev < patients.length ? prev + 1 : 0
                      )
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      setSelectedPatientIndex(prev => 
                        prev > 0 ? prev - 1 : patients.length
                      )
                    } else if (e.key === 'Enter') {
                      e.preventDefault()
                      if (selectedPatientIndex >= 0 && selectedPatientIndex < patients.length) {
                        handlePatientSelect(patients[selectedPatientIndex])
                      } else if (selectedPatientIndex === patients.length && patientSearchQuery.length >= 2) {
                        handleAddNewPatient()
                      }
                    } else if (e.key === 'Escape') {
                      setShowPatientDropdown(false)
                      setSelectedPatientIndex(-1)
                    }
                  }}
                  className="pl-10 pr-4 py-2 w-48 lg:w-64 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Patient Search Dropdown */}
              {showPatientDropdown && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                  {loadingPatients ? (
                    <div className="p-3 text-center text-gray-500">
                      <div className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                      Searching...
                    </div>
                  ) : patients.length > 0 ? (
                    <>
                      {patients.map((patient, index) => (
                        <button
                          key={patient.id}
                          onClick={() => handlePatientSelect(patient)}
                          className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 ${
                            index === selectedPatientIndex 
                              ? 'bg-blue-50 text-blue-900' 
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">
                                {patient.first_name} {patient.last_name}
                              </div>
                              {patient.phone && (
                                <div className="text-sm text-gray-500">{patient.phone}</div>
                              )}
                            </div>
                            <User className="w-4 h-4 text-gray-400" />
                          </div>
                        </button>
                      ))}
                      <button
                        onClick={handleAddNewPatient}
                        className={`w-full text-left px-4 py-3 border-t border-gray-200 text-blue-600 ${
                          selectedPatientIndex === patients.length 
                            ? 'bg-blue-50' 
                            : 'hover:bg-blue-50'
                        }`}
                      >
                        <div className="flex items-center">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add new patient &ldquo;{patientSearchQuery}&rdquo;
                        </div>
                      </button>
                    </>
                  ) : patientSearchQuery.length >= 2 ? (
                    <button
                      onClick={handleAddNewPatient}
                      className={`w-full text-left px-4 py-3 text-blue-600 ${
                        selectedPatientIndex === 0 
                          ? 'bg-blue-50' 
                          : 'hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add new patient &ldquo;{patientSearchQuery}&rdquo;
                      </div>
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Center - Navigation */}
          <div className="flex items-center space-x-3">
            {/* Mobile Patient Search Button */}
            <button
              onClick={() => router.push('/dashboard/patients')}
              className="md:hidden flex items-center space-x-1 px-3 py-2 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
              title="Search Patients"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Quick Appointment Button */}
            <button
              onClick={() => router.push('/dashboard/visits/create')}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium"
              title="Create New Appointment"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Appointment</span>
              <span className="sm:hidden">New</span>
            </button>

            {/* Calendar Button */}
            <button
              onClick={() => router.push('/dashboard/calendar')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                pathname === '/dashboard/calendar'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
              title="View Calendar"
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Calendar</span>
            </button>
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
