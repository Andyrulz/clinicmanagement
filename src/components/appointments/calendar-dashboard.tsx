'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppointmentCalendarFallback } from '@/components/appointments/appointment-calendar-fallback'
import { QuickAppointmentForm } from '@/components/appointments/quick-appointment-form'
import { AppointmentStatusDashboard } from '@/components/appointments/appointment-status-dashboard'
import { CalendarEvent, CreateAppointmentRequest, AppointmentWithDetails } from '@/types/appointment'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Plus, X, User, Clock, Phone, FileText } from 'lucide-react'

interface CalendarDashboardProps {
  className?: string
}

export function CalendarDashboard({ className = '' }: CalendarDashboardProps) {
  const router = useRouter()
  const [showAppointmentForm, setShowAppointmentForm] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<CreateAppointmentRequest | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleCreateAppointment = (appointment: CreateAppointmentRequest) => {
    setSelectedSlot(appointment)
    setShowAppointmentForm(true)
  }

  const handleAppointmentSelect = (event: CalendarEvent) => {
    setSelectedEvent(event)
  }

  const handleAppointmentCreated = (appointment: AppointmentWithDetails) => {
    console.log('Appointment created successfully:', appointment)
    setShowAppointmentForm(false)
    setSelectedSlot(null)
    setRefreshKey(prev => prev + 1) // Trigger calendar refresh
  }

  const handleCancelForm = () => {
    setShowAppointmentForm(false)
    setSelectedSlot(null)
    setSelectedEvent(null)
  }

  const getStatusColor = (status: string) => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      waiting: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-emerald-100 text-emerald-800',
      cancelled: 'bg-red-100 text-red-800',
      no_show: 'bg-gray-100 text-gray-800',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Calendar & Appointments</h2>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => setShowAppointmentForm(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Appointment</span>
            <span className="sm:hidden">New</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/availability')}
            className="flex items-center space-x-2"
          >
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Manage Availability</span>
            <span className="sm:hidden">Availability</span>
          </Button>
        </div>
      </div>

      {/* Status Dashboard */}
      <AppointmentStatusDashboard />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar - Takes 3 columns on large screens */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Appointment Calendar</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <AppointmentCalendarFallback
                key={refreshKey}
                onCreateAppointment={handleCreateAppointment}
                onAppointmentSelect={handleAppointmentSelect}
                className="w-full"
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Takes 1 column on large screens */}
        <div className="space-y-4">
          {/* Selected Appointment Details */}
          {selectedEvent && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Appointment Details</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEvent(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {selectedEvent.patientName || selectedEvent.title}
                    </p>
                    <p className="text-sm text-gray-600">{selectedEvent.doctorName}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-900">
                      {selectedEvent.start.toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedEvent.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                      {selectedEvent.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(selectedEvent.status)}>
                    {selectedEvent.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>

                {selectedEvent.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <p className="text-sm text-gray-900">{selectedEvent.phone}</p>
                  </div>
                )}

                {selectedEvent.chiefComplaint && (
                  <div className="flex items-start space-x-2">
                    <FileText className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Chief Complaint</p>
                      <p className="text-sm text-gray-900">{selectedEvent.chiefComplaint}</p>
                    </div>
                  </div>
                )}

                <div className="pt-2 space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      // Navigate to appointment management
                      console.log('Edit appointment:', selectedEvent.appointmentId)
                    }}
                  >
                    Edit Appointment
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      // Navigate to patient details
                      console.log('View patient:', selectedEvent.patientId)
                    }}
                  >
                    View Patient
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => setShowAppointmentForm(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Schedule Appointment
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  // Navigate to patient list
                  console.log('Navigate to patient search')
                }}
              >
                <User className="w-4 h-4 mr-2" />
                Find Patient
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  // Navigate to today's appointments
                  console.log('Navigate to today\'s schedule')
                }}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Today&apos;s Schedule
              </Button>
            </CardContent>
          </Card>

          {/* Calendar Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Status Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { status: 'scheduled', label: 'Scheduled', color: '#3B82F6' },
                  { status: 'confirmed', label: 'Confirmed', color: '#10B981' },
                  { status: 'waiting', label: 'Waiting', color: '#F59E0B' },
                  { status: 'in_progress', label: 'In Progress', color: '#8B5CF6' },
                  { status: 'completed', label: 'Completed', color: '#059669' },
                  { status: 'cancelled', label: 'Cancelled', color: '#EF4444' },
                ].map(({ status, label, color }) => (
                  <div key={status} className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-gray-600">{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Appointment Form Modal */}
      {showAppointmentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Create New Appointment</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelForm}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <QuickAppointmentForm
                selectedDate={selectedSlot?.appointment_date}
                selectedTime={selectedSlot?.appointment_time}
                onAppointmentCreated={handleAppointmentCreated}
                onCancel={handleCancelForm}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CalendarDashboard
