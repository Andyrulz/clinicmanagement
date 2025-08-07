'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, addMinutes, startOfDay, endOfDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'

import { AppointmentService } from '@/lib/services/appointment-service'
import { CalendarEvent, AppointmentStatus, CreateAppointmentRequest } from '@/types/appointment'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, User, Filter } from 'lucide-react'

// Simple Doctor interface for this component
interface Doctor {
  id: string;
  full_name: string;
  role: string;
  email?: string;
}

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

interface AppointmentCalendarProps {
  onCreateAppointment?: (appointment: CreateAppointmentRequest) => void
  onAppointmentSelect?: (event: CalendarEvent) => void
  className?: string
}

export function AppointmentCalendar({
  onCreateAppointment,
  onAppointmentSelect,
  className = '',
}: AppointmentCalendarProps) {
  // State management
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all')
  const [currentView, setCurrentView] = useState<View>(Views.WEEK)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Services
  const appointmentService = useMemo(() => new AppointmentService(), [])

  // Create a supabase client instance for this component
  const supabase = useMemo(() => appointmentService['supabase'], [appointmentService])

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
          .eq('is_active', true);

        if (doctorsError) {
          console.error('Failed to load doctors:', doctorsError);
          setError('Failed to load doctors');
          return;
        }

        setDoctors(doctorsData || []);
      } catch (err) {
        console.error('Failed to load doctors:', err);
        setError('Failed to load doctors');
      }
    }

    loadDoctors();
  }, [supabase]);

  // Load appointments for current view
  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

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

      // Load appointments from service
      const appointmentsData = await appointmentService.getCalendarEvents({
        dateRange: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
        doctorIds: selectedDoctorId === 'all' ? undefined : [selectedDoctorId],
        status: undefined
      });

      if (appointmentsData.success && appointmentsData.data) {
        setEvents(appointmentsData.data);
      } else {
        setError(appointmentsData.error || 'Failed to load appointments');
      }
    } catch (err) {
      console.error('Failed to load appointments:', err)
      setError('Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }, [currentDate, currentView, selectedDoctorId, appointmentService])

  // Reload appointments when dependencies change
  useEffect(() => {
    loadAppointments()
  }, [loadAppointments])

  // Event style getter for different appointment statuses
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const statusColors: Record<AppointmentStatus, string> = {
      scheduled: '#3B82F6', // blue
      confirmed: '#10B981', // green
      waiting: '#F59E0B', // yellow
      in_progress: '#8B5CF6', // purple
      completed: '#059669', // emerald
      cancelled: '#EF4444', // red
      no_show: '#6B7280', // gray
    }

    const backgroundColor = statusColors[event.status] || '#6B7280'

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        fontSize: '12px',
        padding: '2px 4px',
      },
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
    if (onAppointmentSelect) {
      onAppointmentSelect(event)
    }
  }, [onAppointmentSelect])

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
        <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select doctor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Doctors</SelectItem>
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
          Appointment Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {[
            { status: 'scheduled', label: 'Scheduled', color: '#3B82F6' },
            { status: 'confirmed', label: 'Confirmed', color: '#10B981' },
            { status: 'waiting', label: 'Waiting', color: '#F59E0B' },
            { status: 'in_progress', label: 'In Progress', color: '#8B5CF6' },
            { status: 'completed', label: 'Completed', color: '#059669' },
            { status: 'cancelled', label: 'Cancelled', color: '#EF4444' },
            { status: 'no_show', label: 'No Show', color: '#6B7280' },
          ].map(({ status, label, color }) => (
            <Badge
              key={status}
              variant="outline"
              className="text-xs"
              style={{ borderColor: color, color }}
            >
              <div
                className="w-2 h-2 rounded-full mr-1"
                style={{ backgroundColor: color }}
              />
              {label}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p className="font-medium">Error loading calendar</p>
            <p className="text-sm mt-1">{error}</p>
            <Button 
              variant="outline" 
              onClick={loadAppointments}
              className="mt-4"
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
      <StatusLegend />
      
      <Card>
        <CardContent className="p-0">
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
            style={{ height: 600 }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default AppointmentCalendar
