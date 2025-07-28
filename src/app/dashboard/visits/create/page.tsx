'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { visitService } from '@/lib/services/visit-service'
import { searchPatients } from '@/lib/services/patient-service'
import type { Patient } from '@/types/patient'

interface Doctor {
  id: string
  full_name: string
  role: string
}

function CreateVisitForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preSelectedPatientId = searchParams.get('patient_id')
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])

  // Form data
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    visit_date: '',
    visit_time: '',
    visit_type: 'new' as 'new' | 'follow_up',
    consultation_fee: '',
    chief_complaints: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true)
      console.log('=== VISIT CREATION: Starting to load initial data ===')
      
      // Test doctor query directly first
      console.log('Testing direct doctor query...')
      try {
        const directDoctors = await visitService.getAvailableDoctors()
        console.log('Direct doctor query result:', directDoctors)
      } catch (directError) {
        console.error('Direct doctor query failed:', directError)
      }
      
      const [patientsData, doctorsData] = await Promise.all([
        searchPatients({ limit: 1000 }).catch(err => {
          console.error('Patient search failed:', err)
          return { patients: [], count: 0 }
        }),
        visitService.getAvailableDoctors().catch(err => {
          console.error('Doctor fetch failed:', err)
          return []
        })
      ])

      console.log('=== VISIT CREATION: Final results ===')
      console.log('Loaded patients:', patientsData)
      console.log('Loaded doctors:', doctorsData)
      console.log('Doctor count:', doctorsData?.length || 0)

      setPatients(patientsData.patients || [])
      setDoctors(doctorsData || [])

      // Set default date and time
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      const currentTime = now.toTimeString().slice(0, 5)
      
      setFormData(prev => ({
        ...prev,
        visit_date: today,
        visit_time: currentTime,
        patient_id: preSelectedPatientId || ''
      }))

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [preSelectedPatientId])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  useEffect(() => {
    // Filter patients based on search term
    if (searchTerm.trim() === '') {
      setFilteredPatients(patients.slice(0, 20)) // Show first 20 patients
    } else {
      const filtered = patients.filter(patient =>
        patient.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone?.includes(searchTerm) ||
        patient.uhid?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredPatients(filtered.slice(0, 20))
    }
  }, [searchTerm, patients])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.patient_id) newErrors.patient_id = 'Please select a patient'
    if (!formData.doctor_id) newErrors.doctor_id = 'Please select a doctor'
    if (!formData.visit_date) newErrors.visit_date = 'Please select a visit date'
    if (!formData.visit_time) newErrors.visit_time = 'Please select a visit time'
    
    const consultationFee = Number(formData.consultation_fee)
    if (!formData.consultation_fee || isNaN(consultationFee) || consultationFee < 0) {
      newErrors.consultation_fee = 'Please enter a valid consultation fee'
    }

    // Validate date is not in the past (except today)
    const selectedDate = new Date(formData.visit_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (selectedDate < today) {
      newErrors.visit_date = 'Visit date cannot be in the past'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      setSubmitting(true)
      const visit = await visitService.createVisit({
        ...formData,
        consultation_fee: Number(formData.consultation_fee)
      })
      router.push(`/dashboard/visits/${visit.id}`)
    } catch (error) {
      console.error('Error creating visit:', error)
      setErrors({ submit: 'Failed to create visit. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const getSelectedPatient = () => {
    return patients.find(p => p.id === formData.patient_id)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading...</h1>
          <p className="text-gray-900 font-medium">Fetching patients and doctors...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-6 max-w-4xl">
      {/* Debug Info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-yellow-900">Debug Info:</h3>
          <p className="text-yellow-800">
            Patients loaded: {patients.length} | 
            Filtered patients: {filteredPatients.length} | 
            Doctors loaded: {doctors.length}
          </p>
          {patients.length === 0 && (
            <p className="text-red-900 font-medium mt-2">
              ⚠️ No patients found. You may need to register some patients first.
            </p>
          )}
          {doctors.length === 0 && (
            <p className="text-red-900 font-medium mt-2">
              ⚠️ No doctors found. You may need to add users with &apos;doctor&apos; role.
            </p>
          )}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => router.back()}
          className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex items-center gap-2"
        >
          ← Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Visit</h1>
          <p className="text-gray-800">Schedule a new patient consultation</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Patient Selection */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              👤 Patient Selection
            </h2>
            <div className="space-y-4">
              {/* Combined Patient Search and Selection */}
              <div>
                <label htmlFor="patient" className="block text-sm font-medium text-gray-900 mb-2">
                  Search and Select Patient
                </label>
                <input
                  id="patient-search"
                  type="text"
                  placeholder="Search by name, phone, or UHID..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white mb-2"
                />
                <select
                  id="patient"
                  value={formData.patient_id}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                    setFormData(prev => ({ ...prev, patient_id: e.target.value }))
                  }
                  className={`w-full px-3 py-2 text-gray-900 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${
                    errors.patient_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Choose a patient ({filteredPatients.length} available)</option>
                  {filteredPatients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name} - {patient.phone} - {patient.uhid}
                    </option>
                  ))}
                </select>
                {errors.patient_id && (
                  <p className="text-sm text-red-600 mt-1">{errors.patient_id}</p>
                )}
              </div>

              {/* Selected Patient Info */}
              {getSelectedPatient() && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <h4 className="font-semibold text-blue-900">Selected Patient</h4>
                  <div className="text-sm text-blue-800 mt-2 space-y-1">
                    <p><strong>Name:</strong> {getSelectedPatient()?.first_name} {getSelectedPatient()?.last_name}</p>
                    <p><strong>UHID:</strong> {getSelectedPatient()?.uhid}</p>
                    <p><strong>Phone:</strong> {getSelectedPatient()?.phone}</p>
                    <p><strong>Age:</strong> {getSelectedPatient()?.age || 'N/A'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Visit Details */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              🩺 Visit Details
            </h2>
            <div className="space-y-4">
              {/* Doctor Selection */}
              <div>
                <label htmlFor="doctor" className="block text-sm font-medium text-gray-900 mb-2">
                  Consulting Doctor
                </label>
                <select
                  id="doctor"
                  value={formData.doctor_id}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                    setFormData(prev => ({ ...prev, doctor_id: e.target.value }))
                  }
                  className={`w-full px-3 py-2 text-gray-900 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${
                    errors.doctor_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Choose a doctor ({doctors.length} available)</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      Dr. {doctor.full_name}
                    </option>
                  ))}
                </select>
                {errors.doctor_id && (
                  <p className="text-sm text-red-600 mt-1">{errors.doctor_id}</p>
                )}
              </div>

              {/* Visit Type */}
              <div>
                <label htmlFor="visit-type" className="block text-sm font-medium text-gray-900 mb-2">
                  Visit Type
                </label>
                <select
                  id="visit-type"
                  value={formData.visit_type}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                    setFormData(prev => ({ ...prev, visit_type: e.target.value as 'new' | 'follow_up' }))
                  }
                  className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                >
                  <option value="new">New Visit</option>
                  <option value="follow_up">Follow-up Visit</option>
                </select>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="visit-date" className="block text-sm font-medium text-gray-900 mb-2">
                    📅 Visit Date
                  </label>
                  <input
                    id="visit-date"
                    type="date"
                    value={formData.visit_date}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setFormData(prev => ({ ...prev, visit_date: e.target.value }))
                    }
                    className={`w-full px-3 py-2 text-gray-900 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${
                      errors.visit_date ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.visit_date && (
                    <p className="text-sm text-red-600 mt-1">{errors.visit_date}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="visit-time" className="block text-sm font-medium text-gray-900 mb-2">
                    🕐 Visit Time
                  </label>
                  <input
                    id="visit-time"
                    type="time"
                    value={formData.visit_time}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setFormData(prev => ({ ...prev, visit_time: e.target.value }))
                    }
                    className={`w-full px-3 py-2 text-gray-900 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${
                      errors.visit_time ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.visit_time && (
                    <p className="text-sm text-red-600 mt-1">{errors.visit_time}</p>
                  )}
                </div>
              </div>

              {/* Consultation Fee */}
              <div>
                <label htmlFor="consultation-fee" className="block text-sm font-medium text-gray-900 mb-2">
                  💰 Consultation Fee (₹)
                </label>
                <input
                  id="consultation-fee"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Enter consultation fee"
                  value={formData.consultation_fee}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setFormData(prev => ({ ...prev, consultation_fee: e.target.value }))
                  }
                  className={`w-full px-3 py-2 text-gray-900 placeholder:text-gray-500 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${
                    errors.consultation_fee ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.consultation_fee && (
                  <p className="text-sm text-red-600 mt-1">{errors.consultation_fee}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Chief Complaints */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Chief Complaints</h2>
          <p className="text-gray-800 mb-4">
            Brief description of the patient&apos;s main concerns (optional)
          </p>
          <textarea
            placeholder="Enter the patient's chief complaints or symptoms..."
            value={formData.chief_complaints}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
              setFormData(prev => ({ ...prev, chief_complaints: e.target.value }))
            }
            rows={3}
            className="w-full px-3 py-2 text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
          />
        </div>

        {/* Submit Section */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={submitting}
            className="px-6 py-2 bg-gray-100 text-gray-900 font-medium rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed min-w-32"
          >
            {submitting ? 'Creating...' : 'Create Visit'}
          </button>
        </div>

        {errors.submit && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{errors.submit}</p>
          </div>
        )}
      </form>
      </div>
    </div>
  )
}

export default function CreateVisit() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
      <CreateVisitForm />
    </Suspense>
  )
}
