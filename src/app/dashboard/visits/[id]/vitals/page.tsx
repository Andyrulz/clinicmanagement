'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { visitService } from '@/lib/services/visit-service'
import type { PatientVisit } from '@/types/patient'

export default function RecordVitals() {
  const router = useRouter()
  const params = useParams()
  const visitId = params.id as string

  const [visit, setVisit] = useState<PatientVisit | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [vitalsData, setVitalsData] = useState({
    height_cm: '',
    weight_kg: '',
    pulse_rate: '',
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    spo2: '',
    temperature_fahrenheit: '',
    respiratory_rate: '',
    blood_glucose: '',
    notes: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const loadVisitData = async () => {
      try {
        setLoading(true)
        const visitData = await visitService.getVisitById(visitId)
        setVisit(visitData)
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

    // Basic validation
    if (vitalsData.height_cm && (Number(vitalsData.height_cm) <= 0 || Number(vitalsData.height_cm) > 300)) {
      newErrors.height_cm = 'Height must be between 1 and 300 cm'
    }
    if (vitalsData.weight_kg && (Number(vitalsData.weight_kg) <= 0 || Number(vitalsData.weight_kg) > 500)) {
      newErrors.weight_kg = 'Weight must be between 1 and 500 kg'
    }
    if (vitalsData.pulse_rate && (Number(vitalsData.pulse_rate) <= 0 || Number(vitalsData.pulse_rate) > 300)) {
      newErrors.pulse_rate = 'Pulse rate must be between 1 and 300 bpm'
    }
    if (vitalsData.blood_pressure_systolic && (Number(vitalsData.blood_pressure_systolic) <= 0 || Number(vitalsData.blood_pressure_systolic) > 300)) {
      newErrors.blood_pressure_systolic = 'Systolic BP must be between 1 and 300 mmHg'
    }
    if (vitalsData.blood_pressure_diastolic && (Number(vitalsData.blood_pressure_diastolic) <= 0 || Number(vitalsData.blood_pressure_diastolic) > 200)) {
      newErrors.blood_pressure_diastolic = 'Diastolic BP must be between 1 and 200 mmHg'
    }
    if (vitalsData.spo2 && (Number(vitalsData.spo2) < 0 || Number(vitalsData.spo2) > 100)) {
      newErrors.spo2 = 'SpO2 must be between 0 and 100%'
    }
    if (vitalsData.temperature_fahrenheit && (Number(vitalsData.temperature_fahrenheit) < 86 || Number(vitalsData.temperature_fahrenheit) > 113)) {
      newErrors.temperature_fahrenheit = 'Temperature must be between 86 and 113°F'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      setSubmitting(true)
      
      // Convert string values to numbers, filter out empty values
      const vitalsToSubmit = {
        visit_id: visitId,
        patient_id: visit?.patient_id || '',
        height_cm: vitalsData.height_cm ? Number(vitalsData.height_cm) : undefined,
        weight_kg: vitalsData.weight_kg ? Number(vitalsData.weight_kg) : undefined,
        pulse_rate: vitalsData.pulse_rate ? Number(vitalsData.pulse_rate) : undefined,
        blood_pressure_systolic: vitalsData.blood_pressure_systolic ? Number(vitalsData.blood_pressure_systolic) : undefined,
        blood_pressure_diastolic: vitalsData.blood_pressure_diastolic ? Number(vitalsData.blood_pressure_diastolic) : undefined,
        spo2: vitalsData.spo2 ? Number(vitalsData.spo2) : undefined,
        temperature_celsius: vitalsData.temperature_fahrenheit ? ((Number(vitalsData.temperature_fahrenheit) - 32) * 5/9) : undefined,
        respiratory_rate: vitalsData.respiratory_rate ? Number(vitalsData.respiratory_rate) : undefined,
        blood_glucose: vitalsData.blood_glucose ? Number(vitalsData.blood_glucose) : undefined,
        notes: vitalsData.notes || undefined
      }

      if (!visit?.patient_id) {
        throw new Error('Patient ID is required')
      }

      await visitService.recordVitals(vitalsToSubmit)
      router.push(`/dashboard/visits/${visitId}`)
    } catch (error) {
      console.error('Error recording vitals:', error)
      setErrors({ submit: 'Failed to record vitals. Please try again.' })
    } finally {
      setSubmitting(false)
    }
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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Visit Not Found</h1>
          <p className="text-gray-900 font-medium mb-6">The visit you are looking for could not be found.</p>
          <button 
            onClick={() => router.push('/dashboard/visits')}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Back to Visits
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
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
          <h1 className="text-2xl font-semibold text-gray-900">Record Patient Vitals</h1>
          <p className="text-gray-800">Visit #{visit?.visit_number} - {visit?.patient?.first_name} {visit?.patient?.last_name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Physical Measurements */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">📏 Physical Measurements</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="height" className="block text-sm font-medium text-gray-900">
                Height (cm)
              </label>
              <input
                id="height"
                type="number"
                step="0.1"
                placeholder="e.g., 170.5"
                value={vitalsData.height_cm}
                onChange={(e) => setVitalsData(prev => ({ ...prev, height_cm: e.target.value }))}
                className={`mt-1 block w-full text-gray-900 placeholder:text-gray-500 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${
                  errors.height_cm ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.height_cm && (
                <p className="text-sm text-red-500 mt-1">{errors.height_cm}</p>
              )}
            </div>

            <div>
              <label htmlFor="weight" className="block text-sm font-medium text-gray-900">
                Weight (kg)
              </label>
              <input
                id="weight"
                type="number"
                step="0.1"
                placeholder="e.g., 70.5"
                value={vitalsData.weight_kg}
                onChange={(e) => setVitalsData(prev => ({ ...prev, weight_kg: e.target.value }))}
                className={`mt-1 block w-full text-gray-900 placeholder:text-gray-500 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${
                  errors.weight_kg ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.weight_kg && (
                <p className="text-sm text-red-500 mt-1">{errors.weight_kg}</p>
              )}
            </div>
          </div>

          {/* BMI Calculation Display */}
          {vitalsData.height_cm && vitalsData.weight_kg && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Calculated BMI:</strong> {' '}
                {(Number(vitalsData.weight_kg) / Math.pow(Number(vitalsData.height_cm) / 100, 2)).toFixed(1)} kg/m²
              </p>
            </div>
          )}
        </div>

        {/* Vital Signs */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">💗 Vital Signs</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pulse" className="block text-sm font-medium text-gray-900">
                Pulse Rate (bpm)
              </label>
              <input
                id="pulse"
                type="number"
                placeholder="e.g., 72"
                value={vitalsData.pulse_rate}
                onChange={(e) => setVitalsData(prev => ({ ...prev, pulse_rate: e.target.value }))}
                className={`mt-1 block w-full text-gray-900 placeholder:text-gray-500 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${
                  errors.pulse_rate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.pulse_rate && (
                <p className="text-sm text-red-500 mt-1">{errors.pulse_rate}</p>
              )}
            </div>

            <div>
              <label htmlFor="respiratory-rate" className="block text-sm font-medium text-gray-900">
                Respiratory Rate (breaths/min)
              </label>
              <input
                id="respiratory-rate"
                type="number"
                placeholder="e.g., 16"
                value={vitalsData.respiratory_rate}
                onChange={(e) => setVitalsData(prev => ({ ...prev, respiratory_rate: e.target.value }))}
                className="mt-1 block w-full text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              />
            </div>

            <div>
              <label htmlFor="bp-systolic" className="block text-sm font-medium text-gray-900">
                Blood Pressure - Systolic (mmHg)
              </label>
              <input
                id="bp-systolic"
                type="number"
                placeholder="e.g., 120"
                value={vitalsData.blood_pressure_systolic}
                onChange={(e) => setVitalsData(prev => ({ ...prev, blood_pressure_systolic: e.target.value }))}
                className={`mt-1 block w-full text-gray-900 placeholder:text-gray-500 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${
                  errors.blood_pressure_systolic ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.blood_pressure_systolic && (
                <p className="text-sm text-red-500 mt-1">{errors.blood_pressure_systolic}</p>
              )}
            </div>

            <div>
              <label htmlFor="bp-diastolic" className="block text-sm font-medium text-gray-900">
                Blood Pressure - Diastolic (mmHg)
              </label>
              <input
                id="bp-diastolic"
                type="number"
                placeholder="e.g., 80"
                value={vitalsData.blood_pressure_diastolic}
                onChange={(e) => setVitalsData(prev => ({ ...prev, blood_pressure_diastolic: e.target.value }))}
                className={`mt-1 block w-full text-gray-900 placeholder:text-gray-500 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${
                  errors.blood_pressure_diastolic ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.blood_pressure_diastolic && (
                <p className="text-sm text-red-500 mt-1">{errors.blood_pressure_diastolic}</p>
              )}
            </div>

            <div>
              <label htmlFor="spo2" className="block text-sm font-medium text-gray-900">
                SpO2 (%)
              </label>
              <input
                id="spo2"
                type="number"
                placeholder="e.g., 98"
                value={vitalsData.spo2}
                onChange={(e) => setVitalsData(prev => ({ ...prev, spo2: e.target.value }))}
                className={`mt-1 block w-full text-gray-900 placeholder:text-gray-500 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${
                  errors.spo2 ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.spo2 && (
                <p className="text-sm text-red-500 mt-1">{errors.spo2}</p>
              )}
            </div>

            <div>
              <label htmlFor="temperature" className="block text-sm font-medium text-gray-900">
                Temperature (°F)
              </label>
              <input
                id="temperature"
                type="number"
                step="0.1"
                placeholder="e.g., 98.6"
                value={vitalsData.temperature_fahrenheit}
                onChange={(e) => setVitalsData(prev => ({ ...prev, temperature_fahrenheit: e.target.value }))}
                className={`mt-1 block w-full text-gray-900 placeholder:text-gray-500 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${
                  errors.temperature_fahrenheit ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.temperature_fahrenheit && (
                <p className="text-sm text-red-500 mt-1">{errors.temperature_fahrenheit}</p>
              )}
            </div>
          </div>
        </div>

        {/* Additional Measurements */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">🔬 Additional Measurements</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="blood-glucose" className="block text-sm font-medium text-gray-900">
                Blood Glucose (mg/dL)
              </label>
              <input
                id="blood-glucose"
                type="number"
                step="0.1"
                placeholder="e.g., 95.5"
                value={vitalsData.blood_glucose}
                onChange={(e) => setVitalsData(prev => ({ ...prev, blood_glucose: e.target.value }))}
                className="mt-1 block w-full text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-900">
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              placeholder="Any additional notes about the vitals..."
              value={vitalsData.notes}
              onChange={(e) => setVitalsData(prev => ({ ...prev, notes: e.target.value }))}
              className="mt-1 block w-full text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
            />
          </div>
        </div>

        {/* Submit Section */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={submitting}
            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 min-w-32"
          >
            {submitting ? 'Recording...' : 'Record Vitals'}
          </button>
        </div>

        {errors.submit && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{errors.submit}</p>
          </div>
        )}
      </form>
      </div>
    </div>
  )
}
