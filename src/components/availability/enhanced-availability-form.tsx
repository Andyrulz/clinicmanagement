'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar, Clock, Plus, Trash2, Save, Copy, AlertCircle } from 'lucide-react'

// Simple toast replacement
const toast = {
  success: (message: string) => {
    console.log('Success:', message);
    alert(`✅ ${message}`);
  },
  error: (message: string) => {
    console.error('Error:', message);
    alert(`❌ ${message}`);
  }
};

interface TimeSlot {
  start_time: string
  end_time: string
  break_start?: string
  break_end?: string
}

interface AvailabilitySchedule {
  day_of_week: number
  slots: TimeSlot[]
  is_working_day: boolean
}

interface Doctor {
  id: string
  full_name: string
  email: string
}

interface EnhancedAvailabilityFormProps {
  doctorId?: string
  userRole?: string
  onSave?: () => void
  onCancel?: () => void
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' }
]

const PRESET_SCHEDULES = {
  morning: { start_time: '09:00', end_time: '13:00' },
  afternoon: { start_time: '14:00', end_time: '18:00' },
  evening: { start_time: '18:00', end_time: '21:00' },
  fullDay: { start_time: '09:00', end_time: '18:00', break_start: '13:00', break_end: '14:00' },
  weekend: { start_time: '10:00', end_time: '16:00' }
}

export function EnhancedAvailabilityForm({
  doctorId,
  userRole = 'staff',
  onSave,
  onCancel
}: EnhancedAvailabilityFormProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctorId || '')
  const [schedule, setSchedule] = useState<AvailabilitySchedule[]>([])
  const [loading, setLoading] = useState(false) // eslint-disable-line @typescript-eslint/no-unused-vars
  const [saving, setSaving] = useState(false)
  const [loadingSchedule, setLoadingSchedule] = useState(false) // eslint-disable-line @typescript-eslint/no-unused-vars

  const showAlert = (message: string, type: 'success' | 'error' = 'error') => {
    if (type === 'success') {
      alert(`✅ ${message}`)
    } else {
      alert(`❌ ${message}`)
    }
  }

  const supabase = createClient()
  const canSelectDoctor = userRole === 'admin' || userRole === 'manager'

  const loadDoctors = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single()

      if (!profile) return

      const { data: doctorsData, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('tenant_id', profile.tenant_id)
        .eq('role', 'doctor')
        .eq('is_active', true)
        .order('full_name')

      if (error) throw error

      setDoctors(doctorsData || [])
      
      // Auto-select first doctor if none selected
      if (!selectedDoctorId && doctorsData && doctorsData.length > 0) {
        setSelectedDoctorId(doctorsData[0].id)
      }
    } catch (error) {
      console.error('Error loading doctors:', error)
      showAlert('Failed to load doctors')
    } finally {
      setLoading(false)
    }
  }, [supabase, selectedDoctorId])

  const loadDoctorSchedule = useCallback(async (doctorId: string) => {
    try {
      setLoadingSchedule(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single()

      if (!profile) return

      const { data: availabilityData, error } = await supabase
        .from('doctor_availability')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('doctor_id', doctorId)
        .eq('is_active', true)
        .order('day_of_week, start_time')

      if (error) throw error

      // Group by day of week
      const scheduleByDay: Record<number, TimeSlot[]> = {}
      availabilityData?.forEach(slot => {
        if (!scheduleByDay[slot.day_of_week]) {
          scheduleByDay[slot.day_of_week] = []
        }
        scheduleByDay[slot.day_of_week].push({
          start_time: slot.start_time,
          end_time: slot.end_time,
          break_start: slot.break_start,
          break_end: slot.break_end
        })
      })

      // Update schedule state
      setSchedule(prev => prev.map(day => ({
        ...day,
        slots: scheduleByDay[day.day_of_week] || [],
        is_working_day: (scheduleByDay[day.day_of_week] || []).length > 0
      })))

    } catch (error) {
      console.error('Error loading doctor schedule:', error)
      showAlert('Failed to load doctor schedule')
    } finally {
      setLoadingSchedule(false)
    }
  }, [supabase])

  // Initialize empty schedule
  useEffect(() => {
    const initialSchedule: AvailabilitySchedule[] = DAYS_OF_WEEK.map(day => ({
      day_of_week: day.value,
      slots: [],
      is_working_day: day.value >= 1 && day.value <= 5 // Monday to Friday by default
    }))
    setSchedule(initialSchedule)
  }, [])

  // Load doctors if user can select
  useEffect(() => {
    if (canSelectDoctor) {
      loadDoctors()
    }
  }, [canSelectDoctor, loadDoctors])

  // Load existing schedule when doctor is selected
  useEffect(() => {
    if (selectedDoctorId) {
      loadDoctorSchedule(selectedDoctorId)
    }
  }, [selectedDoctorId, loadDoctorSchedule])

  const addTimeSlot = (dayIndex: number) => {
    setSchedule(prev => prev.map((day, index) => {
      if (index === dayIndex) {
        const newSlot: TimeSlot = {
          start_time: '09:00',
          end_time: '17:00'
        }
        return {
          ...day,
          slots: [...day.slots, newSlot],
          is_working_day: true
        }
      }
      return day
    }))
  }

  const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
    setSchedule(prev => prev.map((day, index) => {
      if (index === dayIndex) {
        const newSlots = day.slots.filter((_, i) => i !== slotIndex)
        return {
          ...day,
          slots: newSlots,
          is_working_day: newSlots.length > 0
        }
      }
      return day
    }))
  }

  const updateTimeSlot = (dayIndex: number, slotIndex: number, field: keyof TimeSlot, value: string) => {
    setSchedule(prev => prev.map((day, index) => {
      if (index === dayIndex) {
        const newSlots = day.slots.map((slot, i) => {
          if (i === slotIndex) {
            return { ...slot, [field]: value }
          }
          return slot
        })
        return { ...day, slots: newSlots }
      }
      return day
    }))
  }

  const toggleWorkingDay = (dayIndex: number) => {
    setSchedule(prev => prev.map((day, index) => {
      if (index === dayIndex) {
        const isWorking = !day.is_working_day
        return {
          ...day,
          is_working_day: isWorking,
          slots: isWorking && day.slots.length === 0 ? [PRESET_SCHEDULES.fullDay] : day.slots
        }
      }
      return day
    }))
  }

  const applyPresetToDay = (dayIndex: number, preset: keyof typeof PRESET_SCHEDULES) => {
    const presetSlot = PRESET_SCHEDULES[preset]
    setSchedule(prev => prev.map((day, index) => {
      if (index === dayIndex) {
        return {
          ...day,
          slots: [presetSlot],
          is_working_day: true
        }
      }
      return day
    }))
  }

  const copyScheduleToOtherDays = (fromDayIndex: number) => {
    const sourceDay = schedule[fromDayIndex]
    if (!sourceDay.is_working_day || sourceDay.slots.length === 0) {
      showAlert('No schedule to copy from this day')
      return
    }

    setSchedule(prev => prev.map((day, index) => {
      if (index !== fromDayIndex) {
        return {
          ...day,
          slots: [...sourceDay.slots],
          is_working_day: true
        }
      }
      return day
    }))

    toast.success('Schedule copied to all other days')
  }

  const saveSchedule = async () => {
    if (!selectedDoctorId) {
      toast.error('Please select a doctor')
      return
    }

    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data: profile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single()

      if (!profile) throw new Error('User profile not found')

      // First, deactivate all existing availability for this doctor
      await supabase
        .from('doctor_availability')
        .update({ is_active: false })
        .eq('tenant_id', profile.tenant_id)
        .eq('doctor_id', selectedDoctorId)

      // Prepare new availability records
      const availabilityRecords = []
      
      for (const day of schedule) {
        if (day.is_working_day && day.slots.length > 0) {
          for (const slot of day.slots) {
            availabilityRecords.push({
              tenant_id: profile.tenant_id,
              doctor_id: selectedDoctorId,
              day_of_week: day.day_of_week,
              start_time: slot.start_time,
              end_time: slot.end_time,
              break_start: slot.break_start || null,
              break_end: slot.break_end || null,
              is_active: true,
              created_by: user.id
            })
          }
        }
      }

      // Insert new availability records
      if (availabilityRecords.length > 0) {
        const { error } = await supabase
          .from('doctor_availability')
          .insert(availabilityRecords)

        if (error) throw error
      }

      toast.success('Doctor availability saved successfully')
      onSave?.()

    } catch (error) {
      console.error('Error saving schedule:', error)
      toast.error('Failed to save schedule')
    } finally {
      setSaving(false)
    }
  }

  const validateTimeSlot = (slot: TimeSlot): string[] => {
    const errors: string[] = []
    
    if (slot.start_time >= slot.end_time) {
      errors.push('Start time must be before end time')
    }
    
    if (slot.break_start && slot.break_end) {
      if (slot.break_start >= slot.break_end) {
        errors.push('Break start must be before break end')
      }
      if (slot.break_start < slot.start_time || slot.break_end > slot.end_time) {
        errors.push('Break must be within working hours')
      }
    }
    
    return errors
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Doctor Availability Schedule</h2>
        </div>
        <div className="flex items-center space-x-3">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button 
            onClick={saveSchedule} 
            disabled={saving || !selectedDoctorId}
            className="flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Schedule'}</span>
          </Button>
        </div>
      </div>

      {/* Doctor Selection */}
      {canSelectDoctor && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Doctor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="doctor-select">Doctor</Label>
                <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        Dr. {doctor.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule Configuration */}
      {selectedDoctorId && (
        <div className="space-y-4">
          {DAYS_OF_WEEK.map((day, dayIndex) => {
            const daySchedule = schedule[dayIndex]
            
            return (
              <Card key={day.value} className={`${daySchedule.is_working_day ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={daySchedule.is_working_day}
                        onCheckedChange={() => toggleWorkingDay(dayIndex)}
                      />
                      <h3 className="text-lg font-semibold text-gray-900">{day.label}</h3>
                      {daySchedule.is_working_day && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Working Day
                        </Badge>
                      )}
                    </div>
                    
                    {daySchedule.is_working_day && (
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyScheduleToOtherDays(dayIndex)}
                          className="flex items-center space-x-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy to Other Days</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addTimeSlot(dayIndex)}
                          className="flex items-center space-x-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Slot</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>

                {daySchedule.is_working_day && (
                  <CardContent className="space-y-4">
                    {/* Preset Buttons */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyPresetToDay(dayIndex, 'morning')}
                      >
                        Morning (9 AM - 1 PM)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyPresetToDay(dayIndex, 'afternoon')}
                      >
                        Afternoon (2 PM - 6 PM)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyPresetToDay(dayIndex, 'fullDay')}
                      >
                        Full Day (9 AM - 6 PM)
                      </Button>
                      {(day.value === 0 || day.value === 6) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => applyPresetToDay(dayIndex, 'weekend')}
                        >
                          Weekend (10 AM - 4 PM)
                        </Button>
                      )}
                    </div>

                    {/* Time Slots */}
                    {daySchedule.slots.map((slot, slotIndex) => {
                      const errors = validateTimeSlot(slot)
                      
                      return (
                        <div key={slotIndex} className="border rounded-lg p-4 bg-white">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-900">Time Slot {slotIndex + 1}</h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeTimeSlot(dayIndex, slotIndex)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <Label htmlFor={`start-${dayIndex}-${slotIndex}`}>Start Time</Label>
                              <Input
                                id={`start-${dayIndex}-${slotIndex}`}
                                type="time"
                                value={slot.start_time}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTimeSlot(dayIndex, slotIndex, 'start_time', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`end-${dayIndex}-${slotIndex}`}>End Time</Label>
                              <Input
                                id={`end-${dayIndex}-${slotIndex}`}
                                type="time"
                                value={slot.end_time}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTimeSlot(dayIndex, slotIndex, 'end_time', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`break-start-${dayIndex}-${slotIndex}`}>Break Start (Optional)</Label>
                              <Input
                                id={`break-start-${dayIndex}-${slotIndex}`}
                                type="time"
                                value={slot.break_start || ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTimeSlot(dayIndex, slotIndex, 'break_start', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`break-end-${dayIndex}-${slotIndex}`}>Break End (Optional)</Label>
                              <Input
                                id={`break-end-${dayIndex}-${slotIndex}`}
                                type="time"
                                value={slot.break_end || ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTimeSlot(dayIndex, slotIndex, 'break_end', e.target.value)}
                              />
                            </div>
                          </div>

                          {errors.length > 0 && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                              <div className="flex items-center space-x-2 text-red-600">
                                <AlertCircle className="w-4 h-4" />
                                <span className="font-medium">Validation Errors:</span>
                              </div>
                              <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                                {errors.map((error, i) => (
                                  <li key={i}>{error}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {daySchedule.slots.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No time slots configured for this day</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addTimeSlot(dayIndex)}
                          className="mt-2"
                        >
                          Add First Time Slot
                        </Button>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {!selectedDoctorId && canSelectDoctor && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Doctor</h3>
            <p className="text-gray-500">Choose a doctor to configure their availability schedule</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default EnhancedAvailabilityForm
