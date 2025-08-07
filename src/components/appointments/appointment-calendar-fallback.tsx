'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, addMinutes, startOfDay, endOfDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'

import { createClient } from '@/lib/supabase/client'
import { CalendarEvent, AppointmentStatus, CreateAppointmentRequest } from '@/types/appointment'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, User, Filter } from 'lucide-react'

// Configure date-fns localizer for React Big Calendar
const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

// Simple Doctor interface for this component
interface Doctor {
  id: string;
  full_name: string;
  role: string;
  email?: string;
}

interface AppointmentCalendarFallbackProps {
  onCreateAppointment?: (appointment: CreateAppointmentRequest) => void
  onAppointmentSelect?: (event: CalendarEvent) => void
  className?: string
}

export function AppointmentCalendarFallback({
  onCreateAppointment,
  onAppointmentSelect,
  className = '',
}: AppointmentCalendarFallbackProps) {
  // State management
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('')
  const [currentView, setCurrentView] = useState<View>(Views.WEEK)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Services
  const supabase = useMemo(() => createClient(), [])

  // Load doctors on component mount
  useEffect(() => {
    const loadDoctors = async () => {
      try {
        // Get users with doctor role from the existing system
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          setError('User not authenticated');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('auth_user_id', user.id)
          .single();

        if (profileError || !profile) {
          setError('User profile not found');
          return;
        }

        const { data: doctorsData, error: doctorsError } = await supabase
          .from('users')
          .select('id, full_name, role, email')
          .eq('tenant_id', profile.tenant_id)
          .eq('role', 'doctor')
          .eq('is_active', true)
          .order('full_name');

        if (doctorsError) {
          console.error('Failed to load doctors:', doctorsError);
          setError('Failed to load doctors');
          return;
        }

        console.log('Loaded doctors:', doctorsData);
        setDoctors(doctorsData || []);
        
        // Auto-select first doctor if available and no doctor is currently selected
        if (doctorsData && doctorsData.length > 0 && !selectedDoctorId) {
          console.log('Auto-selecting first doctor:', doctorsData[0])
          // Use setTimeout to ensure the component has rendered
          setTimeout(() => {
            setSelectedDoctorId(doctorsData[0].id);
          }, 100);
        }
      } catch (err) {
        console.error('Failed to load doctors:', err);
        setError('Failed to load doctors');
      }
    }

    loadDoctors();
  }, [supabase, selectedDoctorId]);

  // Load appointments for current view using existing columns
  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Get the current user's tenant_id
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError('User not authenticated');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single();

      if (profileError || !profile) {
        setError('User profile not found');
        return;
      }

      // Calculate date range based on current view
      const start = currentView === Views.DAY 
        ? startOfDay(currentDate)
        : currentView === Views.WEEK
        ? startOfWeek(currentDate)
        : new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)

      const end = currentView === Views.DAY
        ? endOfDay(currentDate)
        : currentView === Views.WEEK
        ? addMinutes(startOfWeek(currentDate), 7 * 24 * 60 - 1)
        : new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59)

      const allEvents: CalendarEvent[] = []

      // Load appointments using existing patient_visits columns
      if (selectedDoctorId) {
        const query = supabase
          .from('patient_visits')
          .select(`
            *,
            patient:patients(*),
            doctor:users!doctor_id(*)
          `)
          .eq('tenant_id', profile.tenant_id)
          .eq('doctor_id', selectedDoctorId)
          .not('visit_date', 'is', null)
          .gte('visit_date', format(start, 'yyyy-MM-dd'))
          .lte('visit_date', format(end, 'yyyy-MM-dd'))

        const { data: appointmentsData, error: appointmentsError } = await query

        if (appointmentsError) {
          console.error('Failed to load appointments:', appointmentsError);
          setError('Failed to load appointments');
          return;
        }

        // Convert visits to calendar events using existing columns
        const appointmentEvents: CalendarEvent[] = (appointmentsData || []).map(visit => {
          // Use existing visit_date and visit_time or default to 9 AM
          const appointmentDate = visit.visit_date
          const appointmentTime = visit.visit_time || '09:00'
          const startDateTime = new Date(`${appointmentDate}T${appointmentTime}`)
          const endDateTime = new Date(startDateTime.getTime() + (30 * 60000)) // Default 30 minutes

          return {
            id: visit.id,
            title: `${visit.patient.first_name} ${visit.patient.last_name}`,
            start: startDateTime,
            end: endDateTime,
            type: 'appointment',
            status: (visit.status || 'scheduled') as AppointmentStatus,
            backgroundColor: getStatusColor(visit.status || 'scheduled'),
            borderColor: getStatusColor(visit.status || 'scheduled'),
            textColor: '#FFFFFF',
            appointmentId: visit.id,
            patientId: visit.patient_id,
            doctorId: visit.doctor_id,
            patientName: `${visit.patient.first_name} ${visit.patient.last_name}`,
            doctorName: visit.doctor.full_name,
            phone: visit.patient.phone,
            chiefComplaint: visit.chief_complaints,
            clickable: true,
            editable: true
          }
        })

        console.log('Appointment events:', appointmentEvents.length)
        allEvents.push(...appointmentEvents)

        // Create a Set to track occupied time slots
        const occupiedSlots = new Set<string>()
        appointmentEvents.forEach(appointment => {
          // Generate keys for all 30-minute increments this appointment occupies
          const appointmentStart = appointment.start.getTime()
          const appointmentEnd = appointment.end.getTime()
          for (let time = appointmentStart; time < appointmentEnd; time += 30 * 60000) {
            const slotKey = `${format(new Date(time), 'yyyy-MM-dd-HH:mm')}`
            occupiedSlots.add(slotKey)
          }
        })

        console.log('Occupied slots:', occupiedSlots.size)

        // Load doctor availability slots for the selected doctor
        const { data: availabilityData, error: availabilityError } = await supabase
          .from('doctor_availability')
          .select('*')
          .eq('tenant_id', profile.tenant_id)
          .eq('doctor_id', selectedDoctorId)
          .eq('is_active', true)

        if (!availabilityError && availabilityData) {
          console.log('Availability data found:', availabilityData)
          
          // Generate time slots for each day in the date range
          const days = []
          const currentDay = new Date(start)
          while (currentDay <= end) {
            days.push(new Date(currentDay))
            currentDay.setDate(currentDay.getDate() + 1)
          }

          for (const day of days) {
            const dayOfWeek = day.getDay()
            const dayAvailability = availabilityData.filter(avail => avail.day_of_week === dayOfWeek)

            if (dayAvailability.length > 0) {
              console.log(`Generating slots for ${format(day, 'yyyy-MM-dd')}, day ${dayOfWeek}`)
              
              for (const availability of dayAvailability) {
                console.log(`Processing availability: ${availability.start_time} - ${availability.end_time}`)
                
                // Generate 30-minute slots for better visibility
                const startTime = new Date(`${format(day, 'yyyy-MM-dd')}T${availability.start_time}`)
                const endTime = new Date(`${format(day, 'yyyy-MM-dd')}T${availability.end_time}`)
                
                const current = new Date(startTime)
                while (current < endTime) {
                  const slotEnd = new Date(current.getTime() + (30 * 60000)) // 30 minutes for better visibility
                  
                  // Create a unique key for this slot
                  const slotKey = `${format(current, 'yyyy-MM-dd-HH:mm')}`
                  
                  // Only add available slots if this time slot is not occupied
                  if (!occupiedSlots.has(slotKey)) {
                    allEvents.push({
                      id: `available-${selectedDoctorId}-${format(current, 'yyyy-MM-dd-HH-mm')}`, // More specific ID
                      title: 'Available',
                      start: new Date(current),
                      end: new Date(slotEnd),
                      type: 'available',
                      status: 'scheduled',
                      backgroundColor: '#DCFCE7', // Light green
                      borderColor: '#16A34A', // Green
                      textColor: '#15803D', // Dark green text for good contrast
                      doctorId: selectedDoctorId,
                      doctorName: doctors.find(d => d.id === selectedDoctorId)?.full_name || '',
                      clickable: true,
                      editable: false
                    })
                  } else {
                    console.log(`Skipping occupied slot: ${slotKey}`)
                  }

                  current.setTime(current.getTime() + (30 * 60000)) // Move to next 30-minute slot
                }
              }
            }
          }
        } else {
          console.log('No availability data found or error:', availabilityError)
          // Add a helpful message for the user only once
          if (selectedDoctorId) {
            allEvents.push({
              id: `no-availability-${selectedDoctorId}`,
              title: 'No availability schedule set',
              start: new Date(new Date().setHours(9, 0, 0, 0)),
              end: new Date(new Date().setHours(10, 0, 0, 0)), // 1 hour block
              type: 'blocked',
              status: 'scheduled',
              backgroundColor: '#FEF3C7', // Light yellow
              borderColor: '#F59E0B', // Yellow
              textColor: '#92400E', // Dark brown text for good contrast
              doctorId: selectedDoctorId,
              doctorName: doctors.find(d => d.id === selectedDoctorId)?.full_name || '',
              clickable: false,
              editable: false
            })
          }
        }
      }

      console.log('Total events before deduplication:', allEvents.length)
      
      // Final deduplication step - remove any overlapping events by time
      const dedupedEvents: CalendarEvent[] = []
      const usedTimeSlots = new Set<string>()
      
      // Sort events by priority: appointments first, then available slots
      const sortedEvents = allEvents.sort((a, b) => {
        if (a.type === 'appointment' && b.type !== 'appointment') return -1
        if (a.type !== 'appointment' && b.type === 'appointment') return 1
        return a.start.getTime() - b.start.getTime()
      })
      
      sortedEvents.forEach(event => {
        const eventKey = `${format(event.start, 'yyyy-MM-dd-HH:mm')}-${format(event.end, 'yyyy-MM-dd-HH:mm')}`
        if (!usedTimeSlots.has(eventKey)) {
          dedupedEvents.push(event)
          usedTimeSlots.add(eventKey)
        } else {
          console.log('Removed duplicate event:', event.title, format(event.start, 'yyyy-MM-dd HH:mm'))
        }
      })
      
      console.log('Total events after deduplication:', dedupedEvents.length)
      setEvents(dedupedEvents)
    } catch (error) {
      console.error('Failed to load appointments:', error)
      setError('Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }, [supabase, currentDate, currentView, selectedDoctorId, doctors])

  // Get status color
  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      scheduled: '#3B82F6', // blue
      confirmed: '#10B981', // green
      waiting: '#F59E0B', // yellow
      in_progress: '#8B5CF6', // purple
      completed: '#059669', // emerald
      cancelled: '#EF4444', // red
      no_show: '#6B7280', // gray
    }
    return statusColors[status] || '#6B7280'
  }

  // Reload appointments when dependencies change
  useEffect(() => {
    loadAppointments()
  }, [loadAppointments])

  // Event style getter for different appointment statuses
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const baseStyle = {
      backgroundColor: event.backgroundColor,
      borderRadius: '4px',
      opacity: 0.9,
      border: `1px solid ${event.borderColor}`,
      fontSize: '12px',
      padding: '2px 4px',
      fontWeight: '500',
    }

    // Set text color based on event type
    if (event.type === 'available') {
      return {
        style: {
          ...baseStyle,
          color: '#15803D', // Dark green for available slots
        }
      }
    } else if (event.type === 'blocked') {
      return {
        style: {
          ...baseStyle,
          color: '#92400E', // Brown for warning messages
        }
      }
    } else {
      // Regular appointments
      return {
        style: {
          ...baseStyle,
          color: '#FFFFFF', // White for appointments
        }
      }
    }
  }, [])

  // Handle slot selection for creating new appointments
  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    if (!onCreateAppointment) return

    // Calculate duration in minutes
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60))

    // Create appointment request
    const appointmentRequest: CreateAppointmentRequest = {
      patient_id: '', // This will be filled by the appointment form
      doctor_id: selectedDoctorId === 'all' ? doctors[0]?.id || '' : selectedDoctorId,
      appointment_date: format(start, 'yyyy-MM-dd'),
      appointment_time: format(start, 'HH:mm'),
      duration_minutes: durationMinutes,
      notes: '',
    }

    onCreateAppointment(appointmentRequest)
  }, [onCreateAppointment, selectedDoctorId, doctors])

  // Handle appointment/event selection
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    if (event.type === 'appointment') {
      // Handle appointment selection
      if (onAppointmentSelect) {
        onAppointmentSelect(event)
      }
    } else if (event.type === 'available') {
      // For available slots, trigger appointment creation with pre-filled time
      if (onCreateAppointment) {
        const appointmentRequest: CreateAppointmentRequest = {
          patient_id: '', // Will be filled by user
          doctor_id: selectedDoctorId,
          appointment_date: format(event.start, 'yyyy-MM-dd'),
          appointment_time: format(event.start, 'HH:mm'),
          duration_minutes: 30,
          appointment_type: 'consultation',
          appointment_source: 'manual',
          priority: 'normal',
          chief_complaint: ''
        }
        onCreateAppointment(appointmentRequest)
      }
    }
  }, [onAppointmentSelect, onCreateAppointment, selectedDoctorId])

  // Custom toolbar component
  interface ToolbarProps {
    label: string;
    onNavigate: (navigate: 'PREV' | 'NEXT' | 'TODAY') => void;
    onView: (view: View) => void;
  }

  const CustomToolbar = ({ label, onNavigate, onView }: ToolbarProps) => (
    <div className="flex items-center justify-between mb-4 p-4 bg-white border rounded-lg shadow-sm">
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('PREV')}
        >
          ←
        </Button>
        <h3 className="text-lg font-semibold">{label}</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('NEXT')}
        >
          →
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('TODAY')}
        >
          Today
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        {/* Alternative doctor selector if Select component has issues */}
        <div className="relative">
          <select 
            value={selectedDoctorId} 
            onChange={(e) => {
              console.log('Doctor selection changed to:', e.target.value)
              setSelectedDoctorId(e.target.value)
              // Switch to day view when a doctor is selected for better slot visibility
              if (e.target.value && currentView !== Views.DAY) {
                setCurrentView(Views.DAY)
              }
            }}
            className="w-[200px] px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select doctor</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                Dr. {doctor.full_name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Original Select component as backup */}
        <div style={{ display: 'none' }}>
          <Select 
            value={selectedDoctorId || undefined} 
            onValueChange={(value) => {
              console.log('Doctor selection changed to:', value)
              setSelectedDoctorId(value)
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue 
                placeholder="Select doctor"
              />
            </SelectTrigger>
            <SelectContent>
              {doctors.map((doctor) => (
                <SelectItem key={doctor.id} value={doctor.id}>
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Dr. {doctor.full_name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex border rounded-md">
          <Button
            variant={currentView === Views.DAY ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onView(Views.DAY)}
            className="rounded-r-none"
          >
            Day
          </Button>
          <Button
            variant={currentView === Views.WEEK ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onView(Views.WEEK)}
            className="rounded-none"
          >
            Week
          </Button>
          <Button
            variant={currentView === Views.MONTH ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onView(Views.MONTH)}
            className="rounded-l-none"
          >
            Month
          </Button>
        </div>
      </div>
    </div>
  )

  // Status legend component
  const StatusLegend = () => (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center">
          <Filter className="w-4 h-4 mr-2" />
          Calendar Guide
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3 text-xs mb-3">
          {/* Simplified legend */}
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3B82F6' }}></div>
            <span>Scheduled Appointments</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#DCFCE7', border: '1px solid #16A34A' }}></div>
            <span>Available Slots</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#FEF3C7', border: '1px solid #F59E0B' }}></div>
            <span>No Schedule Set</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded bg-gray-100"></div>
            <span>Outside Working Hours</span>
          </div>
        </div>
        {selectedDoctorId && (
          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
            💡 <strong>Tip:</strong> Day view shows all available slots for the selected doctor. Use Week/Month view for overview.
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <p className="font-medium">Error loading calendar</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
            
            {error.includes('scheduled_date') && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-blue-800 font-medium mb-2">🚨 Database Migration Required</p>
                <p className="text-blue-700 text-sm mb-3">
                  The calendar system requires new database columns. Please run the migration SQL in your Supabase dashboard.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => window.open('/DATABASE_MIGRATION_REQUIRED.md', '_blank')}
                  className="mb-2"
                >
                  View Migration Instructions
                </Button>
              </div>
            )}
            
            <Button 
              variant="outline" 
              onClick={loadAppointments}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      {/* Custom CSS to override React Big Calendar text colors */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .rbc-event[id*="available"] {
            color: #15803D !important;
            background-color: #DCFCE7 !important;
            border: 1px solid #16A34A !important;
          }
          .rbc-event[id*="available"] * {
            color: #15803D !important;
          }
          .rbc-event[id*="no-availability"] {
            color: #92400E !important;
            background-color: #FEF3C7 !important;
            border: 1px solid #F59E0B !important;
          }
          .rbc-event[id*="no-availability"] * {
            color: #92400E !important;
          }
        `
      }} />
      
      <StatusLegend />
      
      <Card>
        <CardContent className="p-0 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 animate-spin" />
                <span>Loading appointments...</span>
              </div>
            </div>
          )}

          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            titleAccessor="title"
            view={currentView}
            onView={setCurrentView}
            date={currentDate}
            onNavigate={setCurrentDate}
            selectable
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventStyleGetter}
            step={15} // 15-minute increments
            timeslots={4} // 4 slots per hour (15 min each)
            min={new Date(2024, 0, 1, 8, 0)} // 8 AM start
            max={new Date(2024, 0, 1, 20, 0)} // 8 PM end
            components={{
              toolbar: CustomToolbar,
            }}
            style={{ height: 700 }} // Increased height for better visibility
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default AppointmentCalendarFallback
