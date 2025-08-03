'use client';

import React, { useState, useEffect } from 'react';
import { doctorAvailabilityService } from '@/lib/services/doctor-availability';
import { visitService } from '@/lib/services/visit-service';
import type { DoctorAvailabilityWithDoctor } from '@/types/doctor-availability';
import type { PatientVisit } from '@/types/patient';

interface GoogleStyleCalendarProps {
  selectedDoctorId?: string;
  onAvailabilityCreated?: () => void;
  userRole?: string;
  currentUserId?: string;
}

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  doctorName: string;
  doctorId: string;
  color: string;
  availability: DoctorAvailabilityWithDoctor;
  isBooked?: boolean;
  visitCount?: number;
  maxVisits?: number;
  bookedVisits?: PatientVisit[];
};

const DOCTOR_COLORS = [
  '#1976D2', // Blue
  '#388E3C', // Green  
  '#F57C00', // Orange
  '#7B1FA2', // Purple
  '#C2185B', // Pink
  '#00796B', // Teal
  '#5D4037', // Brown
  '#455A64', // Blue Grey
  '#E64A19', // Deep Orange
  '#512DA8', // Deep Purple
];

export function GoogleStyleCalendar({ 
  selectedDoctorId,
  onAvailabilityCreated,
  userRole,
  currentUserId
}: GoogleStyleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [doctorColors, setDoctorColors] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get week start (Monday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  // Get week days
  const getWeekDays = (startDate: Date) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Get hours array (7 AM to 8 PM for better focus)
  const getBusinessHours = () => {
    const hours = [];
    for (let i = 7; i <= 20; i++) {
      hours.push(i);
    }
    return hours;
  };

  // Load availability and visit data
  const loadAvailability = React.useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('📅 GOOGLE CALENDAR: Loading availability data...');
      
      const result = await doctorAvailabilityService.getDoctorAvailability(
        selectedDoctorId,
        undefined,
        true
      );

      if (result.success && result.data) {
        console.log('📅 GOOGLE CALENDAR: Raw availability data:', result.data);
        
        // Load visits based on current view mode
        let startDate: Date, endDate: Date;
        
        if (viewMode === 'day') {
          startDate = new Date(currentDate);
          endDate = new Date(currentDate);
        } else {
          // Week view
          startDate = getWeekStart(currentDate);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
        }
        
        console.log('🏥 LOADING VISITS: For', viewMode, startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);
        
        // Load visits for the date range in a single call
        const visitsInRange: PatientVisit[] = [];
        try {
          const startDateStr = startDate.toISOString().split('T')[0];
          const endDateStr = endDate.toISOString().split('T')[0];
          
          // Get all visits for the date range
          const allVisits = await visitService.getVisits({});
          
          // Filter visits for the current date range and selected doctor
          const filteredVisits = allVisits.filter(visit => {
            const visitDate = visit.visit_date;
            const matchesDate = visitDate >= startDateStr && visitDate <= endDateStr;
            const matchesDoctor = !selectedDoctorId || visit.doctor_id === selectedDoctorId;
            return matchesDate && matchesDoctor;
          });
          
          visitsInRange.push(...filteredVisits);
        } catch (error) {
          console.warn('Failed to load visits for date range:', error);
        }

        console.log('🏥 LOADED VISITS:', visitsInRange);
        
        // Convert availability to calendar events
        const calendarEvents: CalendarEvent[] = [];
        const eventMap = new Map<string, CalendarEvent>(); // To track and merge duplicate slots
        const viewDays = viewMode === 'day' ? [currentDate] : getWeekDays(startDate);
        
        result.data.forEach((availability) => {
          // Get doctor info from the joined data - now properly typed
          const doctor = availability.doctor;
          const doctorName = doctor?.full_name || 'Unknown Doctor';
          const currentDoctorId = availability.doctor_id;
          
          // Assign a color to each doctor
          if (!doctorColors[currentDoctorId]) {
            const colorIndex = Object.keys(doctorColors).length % DOCTOR_COLORS.length;
            setDoctorColors(prev => ({
              ...prev,
              [currentDoctorId]: DOCTOR_COLORS[colorIndex]
            }));
          }

          // Create events for the current view (day or week)
          viewDays.forEach(day => {
            if (day.getDay() === availability.day_of_week || 
                (availability.day_of_week === 0 && day.getDay() === 7)) {
              
              const startTime = new Date(day);
              const [startHour, startMin] = availability.start_time.split(':').map(Number);
              startTime.setHours(startHour, startMin, 0, 0);

              const endTime = new Date(day);
              const [endHour, endMin] = availability.end_time.split(':').map(Number);
              endTime.setHours(endHour, endMin, 0, 0);

              // Check for actual visits on this day and time for this doctor
              const dayStr = day.toISOString().split('T')[0];
              const dayVisits = visitsInRange.filter((visit: PatientVisit) => 
                visit.visit_date === dayStr && 
                visit.doctor_id === currentDoctorId &&
                visit.visit_time >= availability.start_time &&
                visit.visit_time < availability.end_time
              );
              
              // Create a unique key for this time slot (doctor + day + time)
              const eventKey = `${currentDoctorId}-${dayStr}-${availability.start_time}-${availability.end_time}`;
              
              if (eventMap.has(eventKey)) {
                // Merge with existing event (aggregate capacity from duplicate slots)
                const existingEvent = eventMap.get(eventKey)!;
                existingEvent.maxVisits = (existingEvent.maxVisits || 0) + (availability.max_patients_per_slot || 1);
                // Keep the same visits (they're the same for the same doctor/time)
              } else {
                // Create new event
                const isBooked = dayVisits.length > 0;
                const visitCount = dayVisits.length;
                const maxVisits = availability.max_patients_per_slot || 1;

                const newEvent: CalendarEvent = {
                  id: `${currentDoctorId}-${dayStr}-${availability.start_time}-${availability.end_time}`,
                  title: doctorName,
                  start: startTime,
                  end: endTime,
                  doctorName,
                  doctorId: currentDoctorId,
                  color: doctorColors[currentDoctorId] || DOCTOR_COLORS[0],
                  availability,
                  isBooked,
                  visitCount,
                  maxVisits,
                  bookedVisits: dayVisits // Add the actual visits for modal display
                };
                
                eventMap.set(eventKey, newEvent);
              }
            }
          });
        });
        
        // Convert map to array
        calendarEvents.push(...Array.from(eventMap.values()));

        console.log('📅 GOOGLE CALENDAR: Generated events:', calendarEvents);
        setEvents(calendarEvents);
      }
    } catch (error) {
      console.error('📅 GOOGLE CALENDAR: Error loading availability:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, selectedDoctorId, doctorColors, viewMode]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  // Delete availability function
  const handleDeleteAvailability = async () => {
    if (!selectedEvent) return;

    setIsDeleting(true);
    try {
      console.log('🗑️ DELETING AVAILABILITY:', selectedEvent.availability.id);
      
      const result = await doctorAvailabilityService.deleteAvailability(selectedEvent.availability.id);
      
      if (result.success) {
        console.log('✅ AVAILABILITY DELETED SUCCESSFULLY');
        setShowEventModal(false);
        setShowDeleteConfirm(false);
        setSelectedEvent(null);
        
        // Refresh the calendar
        loadAvailability();
        
        // Call callback if provided
        if (onAvailabilityCreated) {
          onAvailabilityCreated();
        }
      } else {
        console.error('❌ DELETE FAILED:', result.error);
        alert('Failed to delete availability: ' + result.error);
      }
    } catch (error) {
      console.error('❌ DELETE ERROR:', error);
      alert('An error occurred while deleting the availability');
    } finally {
      setIsDeleting(false);
    }
  };

  // Check if current user can delete this availability
  const canDeleteAvailability = (event: CalendarEvent): boolean => {
    if (!userRole || !currentUserId) return false;
    
    // Admin can delete any availability
    if (userRole === 'admin') return true;
    
    // Doctors can only delete their own availability
    if (userRole === 'doctor') {
      return event.availability.created_by === currentUserId;
    }
    
    // Managers can delete any availability (optional - adjust as needed)
    if (userRole === 'manager') return true;
    
    return false;
  };

  // Navigation functions
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() - 7);
    } else if (viewMode === 'day') {
      newDate.setDate(currentDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + 7);
    } else if (viewMode === 'day') {
      newDate.setDate(currentDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get events for a specific day and hour with overlap calculation
  const getEventsForTimeSlot = (day: Date, hour: number) => {
    const dayEvents = events.filter(event => {
      const eventDate = event.start.toDateString();
      const dayDate = day.toDateString();
      const eventHour = event.start.getHours();
      
      // Only show event at its starting hour to avoid duplicates
      return eventDate === dayDate && hour === eventHour;
    });

    // Calculate overlap positions (Google Calendar style)
    const eventsWithPosition = dayEvents.map((event) => {
      const overlappingEvents = dayEvents.filter(otherEvent => {
        const eventStart = event.start.getTime();
        const eventEnd = event.end.getTime();
        const otherStart = otherEvent.start.getTime();
        const otherEnd = otherEvent.end.getTime();
        
        return (eventStart < otherEnd && eventEnd > otherStart);
      });
      
      const totalOverlapping = overlappingEvents.length;
      const position = overlappingEvents.findIndex(e => e.id === event.id);
      
      return {
        ...event,
        position,
        totalOverlapping,
        width: totalOverlapping > 1 ? 100 / totalOverlapping : 100,
        left: totalOverlapping > 1 ? (position * (100 / totalOverlapping)) : 0
      };
    });

    return eventsWithPosition;
  };

  // Format time
  const formatTime = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  // Get calendar title
  const getCalendarTitle = () => {
    if (viewMode === 'week') {
      const weekStart = getWeekStart(currentDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${weekStart.toLocaleDateString('en-US', { month: 'long' })} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
      } else {
        return `${weekStart.toLocaleDateString('en-US', { month: 'short' })} ${weekStart.getDate()} - ${weekEnd.toLocaleDateString('en-US', { month: 'short' })} ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
      }
    } else if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  const weekStart = getWeekStart(currentDate);
  const weekDays = getWeekDays(weekStart);
  const hours = getBusinessHours();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Google Calendar Style Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side: Title and Navigation */}
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-normal text-gray-900">
              {getCalendarTitle()}
            </h1>
            <div className="flex items-center gap-1">
              <button
                onClick={goToPrevious}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Previous"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={goToNext}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Next"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={goToToday}
                className="ml-3 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
              >
                Today
              </button>
            </div>
          </div>
          
          {/* Right side: View controls */}
          <div className="flex items-center gap-2">
            <div className="bg-gray-100 rounded-lg p-1 flex">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'day' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'week' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Week
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading availability...
          </div>
        </div>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="relative">
          {/* Day headers with Google Calendar styling */}
          <div className="grid grid-cols-8 bg-gray-50 border-b border-gray-200">
            <div className="w-20 flex-shrink-0"></div>
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="px-4 py-3 text-center border-r border-gray-200 last:border-r-0">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-lg font-medium mt-1 ${
                  day.toDateString() === new Date().toDateString() 
                    ? 'bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto' 
                    : 'text-gray-900'
                }`}>
                  {day.getDate()}
                </div>
              </div>
            ))}
          </div>

          {/* Time grid with Google Calendar styling */}
          <div className="overflow-y-auto max-h-[600px]">
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                {/* Time label */}
                <div className="w-20 flex-shrink-0 px-4 py-3 text-right">
                  <span className="text-xs text-gray-500 font-medium">
                    {formatTime(hour)}
                  </span>
                </div>
                
                {/* Day columns */}
                {weekDays.map((day) => {
                  const dayEvents = getEventsForTimeSlot(day, hour);
                  return (
                    <div key={`${day.toISOString()}-${hour}`} className="relative min-h-16 border-r border-gray-200 last:border-r-0 p-1">
                      {dayEvents.map((event) => {
                        const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60); // hours
                        const height = duration * 64; // 64px per hour
                        
                        // Enhanced color and styling based on booking status and sub-slot type
                        let backgroundColor = event.color;
                        let textColor = 'white';
                        let borderColor = event.color;
                        
                        if (event.isBooked) {
                          backgroundColor = event.color + '20'; // Light version
                          textColor = event.color;
                          borderColor = event.color;
                        }
                        
                        return (
                          <div
                            key={event.id}
                            className="absolute rounded-lg cursor-pointer shadow-sm border-l-4 transition-all hover:shadow-md hover:scale-[1.02] hover:z-10"
                            style={{ 
                              backgroundColor,
                              color: textColor,
                              borderLeftColor: borderColor,
                              height: `${height}px`,
                              minHeight: '48px',
                              width: `${event.width}%`,
                              left: `${event.left}%`,
                              zIndex: event.isBooked ? 2 : 1
                            }}
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowEventModal(true);
                            }}
                            title={`${event.doctorName}\n${event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n${event.isBooked ? `${event.visitCount} appointments booked` : 'Available'}`}
                          >
                            <div className="p-2 h-full flex flex-col">
                              <div className="font-medium truncate text-sm">
                                {event.doctorName}
                              </div>
                              <div className="text-xs opacity-90 truncate">
                                {event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              {event.isBooked && (
                                <div className="text-xs opacity-75 mt-auto">
                                  {event.visitCount} booked
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day View */}
      {viewMode === 'day' && (
        <div className="flex-1">
          {/* Day header */}
          <div className="grid grid-cols-2 border-b border-gray-200 bg-gray-50">
            {/* Time column header */}
            <div className="w-20 flex-shrink-0 px-4 py-3"></div>
            
            {/* Day column header */}
            <div className="p-3 text-center">
              <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                {currentDate.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className={`text-lg font-medium mt-1 ${
                currentDate.toDateString() === new Date().toDateString() 
                  ? 'bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto' 
                  : 'text-gray-900'
              }`}>
                {currentDate.getDate()}
              </div>
            </div>
          </div>

          {/* Time grid for single day */}
          <div className="overflow-y-auto max-h-[600px]">
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-2 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                {/* Time label */}
                <div className="w-20 flex-shrink-0 px-4 py-3 text-right">
                  <span className="text-xs text-gray-500 font-medium">
                    {formatTime(hour)}
                  </span>
                </div>
                
                {/* Day column */}
                <div className="relative min-h-16 border-r border-gray-200 p-1">
                  {getEventsForTimeSlot(currentDate, hour).map((event) => {
                    const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60); // hours
                    const height = duration * 64; // 64px per hour
                    
                    // Enhanced color and styling based on booking status
                    let backgroundColor = event.color;
                    let textColor = 'white';
                    let borderColor = event.color;
                    
                    if (event.isBooked) {
                      backgroundColor = event.color + '20'; // Light version
                      textColor = event.color;
                      borderColor = event.color;
                    }
                    
                    return (
                      <div
                        key={event.id}
                        className="absolute rounded-lg cursor-pointer shadow-sm border-l-4 transition-all hover:shadow-md hover:scale-[1.02] hover:z-10"
                        style={{ 
                          backgroundColor,
                          color: textColor,
                          borderLeftColor: borderColor,
                          height: `${height}px`,
                          minHeight: '48px',
                          width: `${event.width}%`,
                          left: `${event.left}%`,
                          zIndex: event.isBooked ? 2 : 1
                        }}
                        onClick={() => {
                          setSelectedEvent(event);
                          setShowEventModal(true);
                        }}
                        title={`${event.doctorName}\n${event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n${event.isBooked ? `${event.visitCount} appointments booked` : 'Available'}`}
                      >
                        <div className="p-2 h-full flex flex-col">
                          <div className="font-medium truncate text-sm">
                            {event.doctorName}
                          </div>
                          <div className="text-xs opacity-90 truncate">
                            {event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {event.isBooked && (
                            <div className="text-xs opacity-75 mt-auto">
                              {event.visitCount} booked
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No events message */}
      {!isLoading && events.length === 0 && (
        <div className="p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No availability scheduled</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            Create some doctor availability schedules to see them displayed here in the calendar.
          </p>
        </div>
      )}

      {/* Event Detail Modal */}
      {showEventModal && selectedEvent && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowEventModal(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedEvent.doctorName}
              </h3>
              <button
                onClick={() => setShowEventModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Time</label>
                <p className="text-gray-900">
                  {selectedEvent.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                  {selectedEvent.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Date</label>
                <p className="text-gray-900">
                  {selectedEvent.start.toLocaleDateString([], { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: selectedEvent.color }}
                  />
                  {selectedEvent.isBooked ? (
                    <span className="text-orange-600 font-medium">
                      {selectedEvent.visitCount} appointments booked
                    </span>
                  ) : (
                    <span className="text-green-600 font-medium">Available</span>
                  )}
                </div>
              </div>
              
              {selectedEvent.bookedVisits && selectedEvent.bookedVisits.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center justify-between">
                    Scheduled Visits
                    {selectedEvent.bookedVisits.length > 3 && (
                      <span className="text-xs text-gray-500">({selectedEvent.bookedVisits.length} total - scroll to see all)</span>
                    )}
                  </label>
                  <div className="mt-2 max-h-48 overflow-y-auto space-y-2 border rounded-md p-2 bg-gray-50">
                    {selectedEvent.bookedVisits.map((visit, index) => (
                      <div key={index} className="bg-white p-2 rounded border shadow-sm">
                        <div className="text-sm font-medium">
                          {visit.visit_time} - Patient: {visit.patient?.first_name} {visit.patient?.last_name}
                        </div>
                        <div className="text-xs text-gray-600">
                          Reason: {visit.chief_complaints || 'General consultation'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // Calculate optimal 30-minute time slot
                    const slotStart = new Date(selectedEvent.start);
                    const slotEnd = new Date(selectedEvent.end);
                    
                    // If the slot is fully available, use the start time
                    // If partially booked, find next available 30-min slot
                    let appointmentTime = slotStart;
                    
                    if (selectedEvent.isBooked && selectedEvent.visitCount && selectedEvent.maxVisits) {
                      // Calculate slot duration in minutes
                      const totalDuration = (slotEnd.getTime() - slotStart.getTime()) / (1000 * 60);
                      const slotDuration = Math.floor(totalDuration / selectedEvent.maxVisits);
                      
                      // Find next available sub-slot
                      const usedSlots = selectedEvent.visitCount;
                      appointmentTime = new Date(slotStart.getTime() + (usedSlots * slotDuration * 60 * 1000));
                      
                      // If this would exceed the end time, use the start time
                      if (appointmentTime >= slotEnd) {
                        appointmentTime = slotStart;
                      }
                    }
                    
                    // Format date and time for URL parameters
                    const visitDate = appointmentTime.toISOString().split('T')[0];
                    const visitTime = appointmentTime.toTimeString().slice(0, 5);
                    
                    // Navigate to visit creation with pre-populated data
                    window.location.href = `/dashboard/visits/create?doctor_id=${selectedEvent.doctorId}&visit_date=${visitDate}&visit_time=${visitTime}`;
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                  title="Schedule a new visit for this doctor at the optimal time"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Schedule Visit
                </button>
                
                {/* Delete button with RBAC */}
                {canDeleteAvailability(selectedEvent) && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
                    title="Delete this availability slot"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                )}
              </div>
              
              <button
                onClick={() => setShowEventModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedEvent && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Availability</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete this availability slot?
              </p>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="font-medium text-gray-900">{selectedEvent.doctorName}</p>
                <p className="text-sm text-gray-600">
                  {selectedEvent.start.toLocaleDateString([], { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
                <p className="text-sm text-gray-600">
                  {selectedEvent.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                  {selectedEvent.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                {selectedEvent.isBooked && (
                  <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
                    <p className="text-sm text-orange-700 font-medium">
                      ⚠️ Warning: This slot has {selectedEvent.visitCount} scheduled visits
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      Deleting this availability may affect existing patient appointments
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAvailability}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
