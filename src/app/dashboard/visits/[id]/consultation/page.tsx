'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { visitService } from '@/lib/services/visit-service'
import type { PatientVisit } from '@/types/patient'
import type { Prescription, ConsultationData } from '@/types/prescription'
import PrescriptionManager from '@/components/PrescriptionManager'
import { generatePrescriptionPDF } from '@/lib/pdf/prescription-generator'

export default function VisitConsultation() {
  const router = useRouter()
  const params = useParams()
  const visitId = params.id as string

  const [visit, setVisit] = useState<PatientVisit | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [consultationData, setConsultationData] = useState<ConsultationData>({
    history_of_present_illness: '',
    physical_examination: '',
    diagnosis: '',
    treatment_plan: '',
    prescriptions: [],
    general_advice: '',
    follow_up_date: '',
    follow_up_instructions: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const loadVisitData = async () => {
      try {
        setLoading(true)
        const visitData = await visitService.getVisitById(visitId)
        setVisit(visitData)

        // Pre-populate with existing data if available
        if (visitData) {
          setConsultationData({
            history_of_present_illness: visitData.history_of_present_illness || '',
            physical_examination: visitData.physical_examination || '',
            diagnosis: visitData.diagnosis || '',
            treatment_plan: visitData.treatment_plan || '',
            prescriptions: [], // Will be loaded separately
            general_advice: visitData.general_advice || '',
            follow_up_date: visitData.follow_up_date || '',
            follow_up_instructions: visitData.follow_up_instructions || ''
          })

          // Load prescriptions separately
          try {
            const prescriptions = await visitService.getVisitPrescriptions(visitId)
            setConsultationData(prev => ({ ...prev, prescriptions }))
          } catch (error) {
            console.error('Error loading prescriptions:', error)
          }
        }
      } catch (error) {
        console.error('Error loading visit:', error)
      } finally {
        setLoading(false)
      }
    }

    if (visitId) {
      loadVisitData()
    }
  }, [visitId])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!consultationData.history_of_present_illness.trim()) {
      newErrors.history_of_present_illness = 'History of present illness is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      setSubmitting(true)
      setErrors({})

      // Update the visit with consultation data
      await visitService.updateEnhancedConsultation(visitId, consultationData)
      
      router.push(`/dashboard/visits/${visitId}`)
    } catch (error) {
      console.error('Error saving consultation:', error)
      setErrors({ submit: 'Failed to save consultation. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleGeneratePDF = () => {
    if (!visit) return

    const pdfData = {
      visit,
      prescriptions: consultationData.prescriptions,
      doctorInfo: {
        name: visit.doctor?.full_name || 'Dr. Unknown',
        registration: 'Reg. No: MMC 2018', // This should come from doctor data
        hospital: 'SMS Hospital',
        address: 'B/503, Business Center, MG Road, Pune',
        phone: '5465647658',
        timing: '09:00 AM - 01:00 PM, 06:00 PM - 08:00 PM'
      }
    }

    const generator = generatePrescriptionPDF(pdfData)
    const patientName = `${visit.patient?.first_name || ''}_${visit.patient?.last_name || ''}`.trim()
    generator.download(`prescription_${patientName}_${visit.visit_number}.pdf`)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!visit) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Visit Not Found</h1>
          <p className="text-gray-800 mb-6">The visit you are looking for could not be found.</p>
          <button 
            onClick={() => router.push('/dashboard/visits')}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Back to Visits
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => router.back()}
          className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex items-center gap-2"
        >
          ← Back
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Consultation Notes</h1>
          <p className="text-gray-800">
            {visit.patient?.first_name} {visit.patient?.last_name} - Visit #{visit.visit_number}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* History of Present Illness */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">History of Present Illness</h2>
          <textarea
            value={consultationData.history_of_present_illness}
            onChange={(e) => setConsultationData(prev => ({ 
              ...prev, 
              history_of_present_illness: e.target.value 
            }))}
            rows={4}
            className={`w-full px-3 py-2 text-gray-900 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${
              errors.history_of_present_illness ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Document the patient's current symptoms and concerns..."
          />
          {errors.history_of_present_illness && (
            <p className="text-sm text-red-600 mt-1">{errors.history_of_present_illness}</p>
          )}
        </div>

        {/* Physical Examination */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Physical Examination</h2>
          <textarea
            value={consultationData.physical_examination}
            onChange={(e) => setConsultationData(prev => ({ 
              ...prev, 
              physical_examination: e.target.value 
            }))}
            rows={4}
            className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
            placeholder="Document physical examination findings..."
          />
        </div>

        {/* Diagnosis */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Diagnosis</h2>
          <textarea
            value={consultationData.diagnosis}
            onChange={(e) => setConsultationData(prev => ({ 
              ...prev, 
              diagnosis: e.target.value 
            }))}
            rows={3}
            className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
            placeholder="Primary and secondary diagnoses..."
          />
        </div>

        {/* Treatment Plan */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Treatment Plan</h2>
          <textarea
            value={consultationData.treatment_plan}
            onChange={(e) => setConsultationData(prev => ({ 
              ...prev, 
              treatment_plan: e.target.value 
            }))}
            rows={4}
            className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
            placeholder="Treatment recommendations and follow-up plans..."
          />
        </div>

        {/* Prescriptions */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">💊 Prescriptions</h2>
          <PrescriptionManager
            prescriptions={consultationData.prescriptions}
            onPrescriptionsChange={(prescriptions: Prescription[]) => 
              setConsultationData(prev => ({ ...prev, prescriptions }))
            }
          />
        </div>

        {/* Follow-up */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📅 Follow-up</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="follow-up-date" className="block text-sm font-medium text-gray-900 mb-2">
                Follow-up Date
              </label>
              <input
                id="follow-up-date"
                type="date"
                value={consultationData.follow_up_date}
                onChange={(e) => setConsultationData(prev => ({ 
                  ...prev, 
                  follow_up_date: e.target.value 
                }))}
                className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              />
            </div>
            <div>
              <label htmlFor="follow-up-instructions" className="block text-sm font-medium text-gray-900 mb-2">
                Follow-up Instructions
              </label>
              <textarea
                id="follow-up-instructions"
                value={consultationData.follow_up_instructions}
                onChange={(e) => setConsultationData(prev => ({ 
                  ...prev, 
                  follow_up_instructions: e.target.value 
                }))}
                rows={3}
                className="w-full px-3 py-2 text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                placeholder="Instructions for next visit, tests to be done, etc..."
              />
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">General Advice</h2>
          <textarea
            value={consultationData.general_advice}
            onChange={(e) => setConsultationData(prev => ({ 
              ...prev, 
              general_advice: e.target.value 
            }))}
            rows={3}
            className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
            placeholder="General advice and recommendations..."
          />
        </div>

        {/* Submit Section */}
        <div className="flex justify-between items-center">
          <div className="flex gap-3">
            {consultationData.prescriptions.length > 0 && (
              <button
                type="button"
                onClick={handleGeneratePDF}
                className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
              >
                📄 Generate PDF
              </button>
            )}
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={submitting}
              className="px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed min-w-32"
            >
              {submitting ? 'Saving...' : 'Save Consultation'}
            </button>
          </div>
        </div>

        {errors.submit && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{errors.submit}</p>
          </div>
        )}
      </form>
      </div>
    </div>
  )
}
