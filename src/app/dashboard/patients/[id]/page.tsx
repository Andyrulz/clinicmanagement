'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin,
  Edit,
  Clock,
  FileText,
  Stethoscope,
  Activity,
  AlertCircle,
  Heart
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Patient {
  id: string
  uhid?: string
  first_name: string
  last_name: string
  date_of_birth?: string
  gender?: string
  phone?: string
  email?: string
  address?: string | {
    street?: string
    city?: string
    state?: string
    pincode?: string
  }
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact?: string
  blood_group?: string
  allergies?: string[] | string
  chronic_conditions?: string[] | string
  medical_history?: string
  insurance_provider?: string
  insurance_number?: string
  created_at: string
  updated_at: string
}

interface Visit {
  id: string
  visit_date: string
  visit_type: string
  status: string
  chief_complaint: string
  diagnosis: string
  notes: string
  doctor_name: string
  prescription_count: number
}

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [patientId, setPatientId] = useState<string | null>(null)

  const supabase = createClient()

  // Handle params being a Promise in Next.js 15
  useEffect(() => {
    params.then(resolvedParams => {
      setPatientId(resolvedParams.id)
    })
  }, [params])

  const loadPatientData = useCallback(async () => {
    if (!patientId) return
    
    try {
      setLoading(true)
      setError(null)

      // Load patient details
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single()

      if (patientError) {
        throw new Error(`Failed to load patient: ${patientError.message}`)
      }

      setPatient(patientData)

      // Load patient visits
      const { data: visitsData, error: visitsError } = await supabase
        .from('patient_visits')
        .select(`
          id,
          visit_date,
          visit_type,
          status,
          chief_complaint,
          diagnosis,
          notes,
          users!patient_visits_doctor_id_fkey(first_name, last_name)
        `)
        .eq('patient_id', patientId)
        .order('visit_date', { ascending: false })

      if (visitsError) {
        console.error('Error loading visits:', visitsError)
      } else {
        const formattedVisits = visitsData?.map(visit => ({
          ...visit,
          doctor_name: Array.isArray(visit.users) && visit.users.length > 0 
            ? `${visit.users[0].first_name} ${visit.users[0].last_name}` 
            : 'Unknown Doctor',
          prescription_count: 0 // TODO: Count prescriptions
        })) || []
        setVisits(formattedVisits)
      }

    } catch (err) {
      console.error('Error loading patient data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load patient data')
    } finally {
      setLoading(false)
    }
  }, [patientId, supabase])

  useEffect(() => {
    if (patientId) {
      loadPatientData()
    }
  }, [patientId, loadPatientData])

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'scheduled': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-xl shadow-sm border border-gray-100 p-12">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading patient details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-xl shadow-sm border border-gray-100 p-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600 mb-8">{error}</p>
          <div className="space-x-4">
            <button
              onClick={() => loadPatientData()}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200"
            >
              Try Again
            </button>
            <Link
              href="/dashboard/patients"
              className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Patients
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-xl shadow-sm border border-gray-100 p-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-8">Patient not found</p>
          <Link
            href="/dashboard/patients"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Patients
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
                href="/dashboard/patients"
                className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Patients
              </Link>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                  {patient.first_name} {patient.last_name}
                </h1>
                <p className="text-gray-600 mt-1 font-medium">
                  {patient.uhid && `UHID: ${patient.uhid} • `}
                  {patient.date_of_birth && `${calculateAge(patient.date_of_birth)} years old • `}
                  {patient.gender}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </button>
              <button className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200">
                <Stethoscope className="w-4 h-4 mr-2" />
                New Visit
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: User },
                { id: 'visits', label: 'Visit History', icon: Clock },
                { id: 'medical', label: 'Medical Records', icon: FileText },
                { id: 'vitals', label: 'Vitals & Tests', icon: Activity }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Personal Information */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <User className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-500">Full Name</p>
                          <p className="font-medium">{patient.first_name} {patient.last_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-500">Date of Birth</p>
                          <p className="font-medium">
                            {patient.date_of_birth ? 
                              `${new Date(patient.date_of_birth).toLocaleDateString()} (${calculateAge(patient.date_of_birth)} years)` 
                              : 'Not provided'
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Phone className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-500">Phone</p>
                          <p className="font-medium">{patient.phone}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <Mail className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="font-medium">{patient.email || 'Not provided'}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Heart className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-500">Blood Group</p>
                          <p className="font-medium">{patient.blood_group || 'Not specified'}</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-1" />
                        <div>
                          <p className="text-sm text-gray-500">Address</p>
                          <p className="font-medium">
                            {patient.address ? (
                              typeof patient.address === 'string' ? 
                                patient.address : 
                                `${patient.address.street || ''}, ${patient.address.city || ''}, ${patient.address.state || ''} ${patient.address.pincode || ''}`.trim()
                            ) : 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-red-50 to-red-100 px-6 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">Emergency Contact</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center">
                      <User className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Contact Name</p>
                        <p className="font-medium">{patient.emergency_contact_name || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Phone className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Contact Phone</p>
                        <p className="font-medium">{patient.emergency_contact_phone || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Medical Summary */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Visits</span>
                    <span className="font-semibold text-blue-600">{visits.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Last Visit</span>
                    <span className="font-semibold">
                      {visits.length > 0 ? new Date(visits[0].visit_date).toLocaleDateString() : 'No visits'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Patient Since</span>
                    <span className="font-semibold">{new Date(patient.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Medical Conditions */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical Conditions</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Allergies</p>
                    {patient.allergies && Array.isArray(patient.allergies) && patient.allergies.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {patient.allergies.map((allergy: string, index: number) => (
                          <span key={index} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                            {allergy}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">No known allergies</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Chronic Conditions</p>
                    {patient.chronic_conditions && Array.isArray(patient.chronic_conditions) && patient.chronic_conditions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {patient.chronic_conditions.map((condition: string, index: number) => (
                          <span key={index} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                            {condition}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">No chronic conditions</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Insurance */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Insurance</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Provider</p>
                    <p className="font-medium">{patient.insurance_provider || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Policy Number</p>
                    <p className="font-medium">{patient.insurance_number || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'visits' && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="bg-gradient-to-r from-green-50 to-green-100 px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Visit History</h3>
            </div>
            <div className="p-6">
              {visits.length > 0 ? (
                <div className="space-y-4">
                  {visits.map((visit) => (
                    <div key={visit.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Stethoscope className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold">{new Date(visit.visit_date).toLocaleDateString()}</p>
                            <p className="text-sm text-gray-500">{visit.visit_type}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(visit.status)}`}>
                          {visit.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Chief Complaint</p>
                          <p className="font-medium">{visit.chief_complaint || 'Not recorded'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Doctor</p>
                          <p className="font-medium">{visit.doctor_name}</p>
                        </div>
                        {visit.diagnosis && (
                          <div className="md:col-span-2">
                            <p className="text-gray-500">Diagnosis</p>
                            <p className="font-medium">{visit.diagnosis}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No visits recorded yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'medical' && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Medical Records</h3>
            </div>
            <div className="p-6">
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Medical records feature coming soon</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vitals' && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Vitals & Test Results</h3>
            </div>
            <div className="p-6">
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Vitals tracking feature coming soon</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
