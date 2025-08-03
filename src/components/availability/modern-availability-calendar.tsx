'use client';

import React, { useState, useEffect } from 'react';
import { doctorAvailabilityService } from '@/lib/services/doctor-availability';
import type { DoctorAvailability } from '@/types/doctor-availability';

interface ModernAvailabilityCalendarProps {
  doctorId?: string;
  onSlotClick?: (slot: CalendarEvent) => void;
  refreshKey?: number;
}

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  doctorName: string;
  color: string;
  availability: DoctorAvailability;
};

const COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
];

export default function ModernAvailabilityCalendar({
  doctorId,
  onSlotClick,
  refreshKey
}: ModernAvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [doctorColors, setDoctorColors] = useState<Record<string, string>>({});

  // Get week start (Monday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
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

  // Get hours array (6 AM to 10 PM)
  const getHours = () => {
    const hours = [];
    for (let i = 6; i <= 22; i++) {
      hours.push(i);
    }
    return hours;
  };

  // Load availability data
  const loadAvailability = React.useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('🗓️ MODERN CALENDAR: Loading availability data...');
      
      const result = await doctorAvailabilityService.getDoctorAvailability(
        doctorId,
        undefined,
        true
      );

      if (result.success && result.data) {
        console.log('🗓️ MODERN CALENDAR: Raw availability data:', result.data);
        
        // Convert availability to calendar events
        const calendarEvents: CalendarEvent[] = [];
        const weekStart = getWeekStart(currentDate);
        const weekDays = getWeekDays(weekStart);

        result.data.forEach((availability) => {
          // Assign a color to each doctor
          if (!doctorColors[availability.doctor_id]) {
            const colorIndex = Object.keys(doctorColors).length % COLORS.length;
            setDoctorColors(prev => ({
              ...prev,
              [availability.doctor_id]: COLORS[colorIndex]
            }));
          }

          // Create events for this week
          weekDays.forEach(day => {
            if (day.getDay() === availability.day_of_week || 
                (availability.day_of_week === 0 && day.getDay() === 7)) {
              
              const startTime = new Date(day);
              const [startHour, startMin] = availability.start_time.split(':').map(Number);
              startTime.setHours(startHour, startMin, 0, 0);

              const endTime = new Date(day);
              const [endHour, endMin] = availability.end_time.split(':').map(Number);
              endTime.setHours(endHour, endMin, 0, 0);

              calendarEvents.push({
                id: `${availability.id}-${day.toISOString().split('T')[0]}`,
                title: `Dr. Unknown`,
                start: startTime,
                end: endTime,
                doctorName: 'Unknown Doctor',
                color: doctorColors[availability.doctor_id] || COLORS[0],
                availability
              });
            }
          });
        });

        console.log('🗓️ MODERN CALENDAR: Generated events:', calendarEvents);
        setEvents(calendarEvents);
      }
    } catch (error) {
      console.error('🗓️ MODERN CALENDAR: Error loading availability:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, doctorId, doctorColors]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability, refreshKey]);

  // Navigation functions
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() - 7);
    } else {
      newDate.setMonth(currentDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + 7);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get events for a specific day and hour
  const getEventsForTimeSlot = (day: Date, hour: number) => {
    return events.filter(event => {
      const eventDate = event.start.toDateString();
      const dayDate = day.toDateString();
      const eventHour = event.start.getHours();
      const eventEndHour = event.end.getHours();
      
      return eventDate === dayDate && hour >= eventHour && hour < eventEndHour;
    });
  };

  // Format time
  const formatTime = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  const weekStart = getWeekStart(currentDate);
  const weekDays = getWeekDays(weekStart);
  const hours = getHours();

  const currentMonth = currentDate.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">{currentMonth}</h2>
            <div className="flex gap-2">
              <button
                onClick={goToPrevious}
                className="p-2 hover:bg-gray-100 rounded"
                title="Previous week"
              >
                ←
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Today
              </button>
              <button
                onClick={goToNext}
                className="p-2 hover:bg-gray-100 rounded"
                title="Next week"
              >
                →
              </button>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === 'week' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === 'month' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              disabled
              title="Month view coming soon"
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="text-gray-500">Loading availability...</div>
            </div>
          )}
          
          {/* Day headers */}
          <div className="grid grid-cols-8 border-b">
            <div className="p-3 text-xs text-gray-500 border-r">Time</div>
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="p-3 text-center border-r last:border-r-0">
                <div className="text-xs text-gray-500">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-lg font-medium ${
                  day.toDateString() === new Date().toDateString() 
                    ? 'text-blue-600' 
                    : 'text-gray-900'
                }`}>
                  {day.getDate()}
                </div>
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="max-h-96 overflow-y-auto">
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-gray-100">
                {/* Time label */}
                <div className="p-2 text-xs text-gray-500 border-r bg-gray-50">
                  {formatTime(hour)}
                </div>
                
                {/* Day columns */}
                {weekDays.map((day) => {
                  const dayEvents = getEventsForTimeSlot(day, hour);
                  return (
                    <div key={`${day.toISOString()}-${hour}`} className="relative min-h-12 border-r last:border-r-0 p-1">
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          className="absolute inset-1 rounded text-xs text-white p-1 cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: event.color }}
                          onClick={() => onSlotClick?.(event)}
                          title={`${event.doctorName}: ${event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        >
                          <div className="font-medium truncate">{event.doctorName}</div>
                          <div className="text-xs opacity-90">
                            {event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No events message */}
      {!isLoading && events.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <div className="text-lg mb-2">No availability scheduled</div>
          <div className="text-sm">Add some doctor availability to see it here.</div>
        </div>
      )}
    </div>
  );
}
