'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Building, Mail, Phone, MapPin, Save, User, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface TenantData {
  id: string
  name: string
  slug: string
  registration_number: string
  phone: string
  email: string
  address: {
    street: string
    city: string
    state: string
    pincode: string
    country: string
  }
  settings: {
    appointment_duration: number
    working_hours: {
      start: string
      end: string
    }
    working_days: string[]
  }
}

export default function TenantSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tenantData, setTenantData] = useState<TenantData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadTenantData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          router.push('/login')
          return
        }

        // Get user's tenant information
        const { data: userRecord, error: userError } = await supabase
          .from('users')
          .select('tenant_id, role')
          .eq('auth_user_id', user.id)
          .single()

        if (userError || !userRecord) {
          throw new Error('Failed to load user information')
        }

        // Check if user has admin permissions
        if (userRecord.role !== 'admin') {
          setError('Access denied. You need admin privileges to access clinic settings.')
          return
        }

        // Get tenant data
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', userRecord.tenant_id)
          .single()

        if (tenantError) {
          throw new Error(`Failed to load clinic information: ${tenantError.message}`)
        }

        setTenantData(tenant)
      } catch (err) {
        console.error('Error loading tenant data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load clinic information')
      } finally {
        setLoading(false)
      }
    }

    loadTenantData()
  }, [router, supabase])

  const handleSave = async () => {
    if (!tenantData) return

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          name: tenantData.name,
          registration_number: tenantData.registration_number,
          phone: tenantData.phone,
          email: tenantData.email,
          address: tenantData.address,
          settings: tenantData.settings
        })
        .eq('id', tenantData.id)

      if (updateError) {
        throw new Error(`Failed to update clinic settings: ${updateError.message}`)
      }

      setSuccess('Clinic settings updated successfully!')
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      console.error('Error updating tenant data:', err)
      setError(err instanceof Error ? err.message : 'Failed to update clinic settings')
    } finally {
      setSaving(false)
    }
  }

  const updateTenantData = (field: string, value: string | number | object) => {
    if (!tenantData) return
    
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      const parentData = tenantData[parent as keyof TenantData]
      
      if (typeof parentData === 'object' && parentData !== null) {
        setTenantData({
          ...tenantData,
          [parent]: {
            ...parentData,
            [child]: value
          }
        })
      }
    } else {
      setTenantData({
        ...tenantData,
        [field]: value
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-xl shadow-sm border border-gray-100 p-12">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading clinic settings...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Error</h2>
            <p className="text-gray-600 mb-8">{error}</p>
            <Link 
              href="/dashboard"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!tenantData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-xl shadow-sm border border-gray-100 p-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Building className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-8">Unable to load clinic information</p>
          <Link 
            href="/dashboard"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Link 
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Dashboard
              </Link>
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                <h1 className="text-3xl font-bold">Clinic Settings</h1>
                <p className="text-gray-600 mt-1 font-medium">Manage your clinic information and configuration</p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200"
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-8 bg-white rounded-xl shadow-sm border border-green-200 p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-green-800 font-semibold">{success}</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="mb-8 bg-white rounded-xl shadow-sm border border-red-200 p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-red-800 font-semibold">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-8 py-6 border-b border-gray-100">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center mr-4">
                  <Building className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Basic Information</h2>
                  <p className="text-gray-600 text-sm mt-1">Core details about your clinic</p>
                </div>
              </div>
            </div>
            
            <div className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Clinic Name
                  </label>
                  <input
                    type="text"
                    value={tenantData.name}
                    onChange={(e) => updateTenantData('name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300"
                    placeholder="Enter clinic name"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={tenantData.registration_number}
                    onChange={(e) => updateTenantData('registration_number', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300"
                    placeholder="Enter registration number"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-green-100 px-8 py-6 border-b border-gray-100">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-green-700 rounded-xl flex items-center justify-center mr-4">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Contact Information</h2>
                  <p className="text-gray-600 text-sm mt-1">How patients can reach you</p>
                </div>
              </div>
            </div>
            
            <div className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                    <Mail className="w-4 h-4 mr-2 text-green-600" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={tenantData.email}
                    onChange={(e) => updateTenantData('email', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-300"
                    placeholder="clinic@example.com"
                  />
                </div>
              
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                    <Phone className="w-4 h-4 mr-2 text-green-600" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={tenantData.phone}
                    onChange={(e) => updateTenantData('phone', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-300"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-8 py-6 border-b border-gray-100">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl flex items-center justify-center mr-4">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Address</h2>
                  <p className="text-gray-600 text-sm mt-1">Physical location of your clinic</p>
                </div>
              </div>
            </div>
            
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Street Address
                </label>
                <input
                  type="text"
                  value={tenantData.address?.street || ''}
                  onChange={(e) => updateTenantData('address.street', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-gray-300"
                  placeholder="Enter street address"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    City
                  </label>
                  <input
                    type="text"
                    value={tenantData.address?.city || ''}
                    onChange={(e) => updateTenantData('address.city', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-gray-300"
                    placeholder="City"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    State
                  </label>
                  <input
                    type="text"
                    value={tenantData.address?.state || ''}
                    onChange={(e) => updateTenantData('address.state', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-gray-300"
                    placeholder="State"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={tenantData.address?.pincode || ''}
                    onChange={(e) => updateTenantData('address.pincode', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-gray-300"
                    placeholder="000000"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
