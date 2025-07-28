'use client'

import { useState } from 'react'
import type { Prescription, PrescriptionFormData } from '@/types/prescription'

interface PrescriptionManagerProps {
  prescriptions: Prescription[]
  onPrescriptionsChange: (prescriptions: Prescription[]) => void
}

const DOSAGE_UNITS = [
  'tablets', 'capsules', 'mg', 'ml', 'drops', 'puffs', 'patches', 'sachets'
]

const TIMING_OPTIONS = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Night' }
]

const FOOD_TIMING_OPTIONS = [
  { value: 'before_food', label: 'Before Food' },
  { value: 'after_food', label: 'After Food' },
  { value: 'with_food', label: 'With Food' },
  { value: 'empty_stomach', label: 'Empty Stomach' }
]

export default function PrescriptionManager({ prescriptions, onPrescriptionsChange }: PrescriptionManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [formData, setFormData] = useState<PrescriptionFormData>({
    medicine_name: '',
    dosage_amount: '',
    dosage_unit: 'tablets',
    frequency_times: '1',
    timing: ['morning'],
    food_timing: 'after_food',
    duration_days: '7',
    instructions: ''
  })

  const resetForm = () => {
    setFormData({
      medicine_name: '',
      dosage_amount: '',
      dosage_unit: 'tablets',
      frequency_times: '1',
      timing: ['morning'],
      food_timing: 'after_food',
      duration_days: '7',
      instructions: ''
    })
    setShowAddForm(false)
    setEditingIndex(null)
  }

  const calculateTotalQuantity = (frequency: number, duration: number): number => {
    return frequency * duration
  }

  const handleFrequencyChange = (newFrequency: string) => {
    const frequencyNum = Number(newFrequency)
    let newTiming: string[] = []

    // Auto-select appropriate timings based on frequency
    switch (frequencyNum) {
      case 1:
        newTiming = ['morning']
        break
      case 2:
        newTiming = ['morning', 'evening']
        break
      case 3:
        newTiming = ['morning', 'afternoon', 'evening']
        break
      case 4:
        newTiming = ['morning', 'afternoon', 'evening', 'night']
        break
      default:
        newTiming = ['morning']
    }

    setFormData(prev => ({
      ...prev,
      frequency_times: newFrequency,
      timing: newTiming
    }))
  }

  const handleTimingChange = (timingOption: string, checked: boolean) => {
    const frequencyCount = Number(formData.frequency_times)
    let newTiming = [...formData.timing]

    if (checked) {
      // Add timing if not already present and under limit
      if (!newTiming.includes(timingOption) && newTiming.length < frequencyCount) {
        newTiming.push(timingOption)
      }
    } else {
      // Remove timing
      newTiming = newTiming.filter(t => t !== timingOption)
    }

    // Ensure we don't exceed the frequency count
    if (newTiming.length > frequencyCount) {
      newTiming = newTiming.slice(0, frequencyCount)
    }

    setFormData(prev => ({ ...prev, timing: newTiming }))
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    // Validate required fields
    if (!formData.medicine_name.trim() || !formData.dosage_amount || !formData.frequency_times || !formData.duration_days) {
      alert('Please fill in all required fields')
      return
    }

    // Validate timing matches frequency
    const frequencyCount = Number(formData.frequency_times)
    const timingCount = formData.timing.length
    
    if (timingCount !== frequencyCount) {
      alert(`Please select exactly ${frequencyCount} timing${frequencyCount > 1 ? 's' : ''} for ${frequencyCount} time${frequencyCount > 1 ? 's' : ''} per day`)
      return
    }
    
    const newPrescription: Prescription = {
      id: editingIndex !== null ? prescriptions[editingIndex].id : `temp-${Date.now()}`,
      medicine_name: formData.medicine_name,
      dosage_amount: Number(formData.dosage_amount),
      dosage_unit: formData.dosage_unit,
      frequency_times: Number(formData.frequency_times),
      timing: formData.timing as ('morning' | 'afternoon' | 'evening' | 'night')[],
      food_timing: formData.food_timing as 'before_food' | 'after_food' | 'with_food' | 'empty_stomach',
      duration_days: Number(formData.duration_days),
      instructions: formData.instructions,
      total_quantity: calculateTotalQuantity(Number(formData.frequency_times), Number(formData.duration_days))
    }

    let updatedPrescriptions
    if (editingIndex !== null) {
      updatedPrescriptions = [...prescriptions]
      updatedPrescriptions[editingIndex] = newPrescription
    } else {
      updatedPrescriptions = [...prescriptions, newPrescription]
    }

    onPrescriptionsChange(updatedPrescriptions)
    resetForm()
  }

  const handleEdit = (index: number) => {
    const prescription = prescriptions[index]
    setFormData({
      medicine_name: prescription.medicine_name,
      dosage_amount: prescription.dosage_amount.toString(),
      dosage_unit: prescription.dosage_unit,
      frequency_times: prescription.frequency_times.toString(),
      timing: prescription.timing,
      food_timing: prescription.food_timing,
      duration_days: prescription.duration_days.toString(),
      instructions: prescription.instructions || ''
    })
    setEditingIndex(index)
    setShowAddForm(true)
  }

  const handleDelete = (index: number) => {
    const updatedPrescriptions = prescriptions.filter((_, i) => i !== index)
    onPrescriptionsChange(updatedPrescriptions)
  }

  const formatPrescriptionSummary = (prescription: Prescription): string => {
    const timingText = prescription.timing.join(', ')
    return `${prescription.dosage_amount}${prescription.dosage_unit} - ${prescription.frequency_times}x daily (${timingText}) - ${prescription.food_timing.replace('_', ' ')} - ${prescription.duration_days} days`
  }

  return (
    <div className="space-y-4">
      {/* Existing Prescriptions */}
      {prescriptions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-md font-medium text-gray-900">Prescribed Medications</h3>
          {prescriptions.map((prescription, index) => (
            <div key={prescription.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 text-lg">{prescription.medicine_name}</h4>
                  <p className="text-gray-800 mt-1">{formatPrescriptionSummary(prescription)}</p>
                  <p className="text-sm text-gray-800 mt-1">
                    <strong>Total Required:</strong> {prescription.total_quantity} {prescription.dosage_unit === 'tablets' || prescription.dosage_unit === 'capsules' ? prescription.dosage_unit : 'units'}
                  </p>
                  {prescription.instructions && (
                    <p className="text-sm text-gray-800 mt-1">
                      <strong>Instructions:</strong> {prescription.instructions}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleEdit(index)
                    }}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDelete(index)
                    }}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Prescription Form */}
      {showAddForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingIndex !== null ? 'Edit Prescription' : 'Add New Prescription'}
          </h3>

          {/* Medicine Name */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Medicine Name *
            </label>
            <input
              type="text"
              required
              value={formData.medicine_name}
              onChange={(e) => setFormData(prev => ({ ...prev, medicine_name: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  e.stopPropagation()
                }
              }}
              className="w-full px-3 py-2 text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              placeholder="e.g., Paracetamol, Amoxicillin"
            />
          </div>

          {/* Dosage and Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Dosage Amount *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.dosage_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, dosage_amount: e.target.value }))}
                className="w-full px-3 py-2 text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                placeholder="e.g., 500, 250"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Unit *
              </label>
              <select
                required
                value={formData.dosage_unit}
                onChange={(e) => setFormData(prev => ({ ...prev, dosage_unit: e.target.value }))}
                className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              >
                {DOSAGE_UNITS.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Frequency and Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Times per Day *
              </label>
              <select
                required
                value={formData.frequency_times}
                onChange={(e) => handleFrequencyChange(e.target.value)}
                className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              >
                <option value="1">1 time per day</option>
                <option value="2">2 times per day</option>
                <option value="3">3 times per day</option>
                <option value="4">4 times per day</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Duration (Days) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.duration_days}
                onChange={(e) => setFormData(prev => ({ ...prev, duration_days: e.target.value }))}
                className="w-full px-3 py-2 text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                placeholder="e.g., 7, 14"
              />
            </div>
          </div>

          {/* Timing */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              When to Take *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TIMING_OPTIONS.map(option => {
                const isChecked = formData.timing.includes(option.value)
                const isDisabled = !isChecked && formData.timing.length >= Number(formData.frequency_times)
                
                return (
                  <label key={option.value} className={`flex items-center ${isDisabled ? 'opacity-50' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isDisabled}
                      onChange={(e) => handleTimingChange(option.value, e.target.checked)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                    />
                    <span className="text-sm text-gray-900">{option.label}</span>
                  </label>
                )
              })}
            </div>
            <p className={`text-xs mt-1 ${
              formData.timing.length === Number(formData.frequency_times) 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              Selected {formData.timing.length} of {formData.frequency_times} required timing{Number(formData.frequency_times) > 1 ? 's' : ''}
            </p>
          </div>

          {/* Food Timing */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Relation to Food *
            </label>
            <select
              required
              value={formData.food_timing}
              onChange={(e) => setFormData(prev => ({ ...prev, food_timing: e.target.value }))}
              className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
            >
              {FOOD_TIMING_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Additional Instructions
            </label>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              placeholder="Any special instructions..."
            />
          </div>

          {/* Total Quantity Preview */}
          {formData.frequency_times && formData.duration_days && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-gray-900">
                <strong>Total Quantity Required:</strong> {calculateTotalQuantity(Number(formData.frequency_times), Number(formData.duration_days))} {formData.dosage_unit}
              </p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                resetForm()
              }}
              className="px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleSubmit(e)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {editingIndex !== null ? 'Update' : 'Add'} Prescription
            </button>
          </div>
        </div>
      )}

      {/* Add Prescription Button */}
      {!showAddForm && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setShowAddForm(true)
          }}
          className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
        >
          + Add New Prescription
        </button>
      )}
    </div>
  )
}
