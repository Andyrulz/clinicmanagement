'use client';

import React, { useState, useEffect } from 'react';
import { doctorAvailabilityService } from '@/lib/services/doctor-availability';
import type { 
  DoctorAvailability, 
  DoctorTimeSlot
} from '@/types/doctor-availability';

interface DoctorAvailabilityCalendarProps {
  initialDate?: Date;
  doctorId?: string;
  viewMode?: 'daily' | 'weekly' | 'monthly';
  onSlotClick?: (slot: DoctorTimeSlot) => void;
  refreshKey?: number; // Add this to trigger refresh when needed
}

type WeekDay = {
  date: Date;
  dayOfWeek: number;
  dayName: string;
  isToday: boolean;
  isCurrentMonth: boolean;
};

type CalendarSlot = {
  timeSlot: DoctorTimeSlot;
  availability: DoctorAvailability;
  displayTime: string;
};

export default function DoctorAvailabilityCalendar({
  initialDate = new Date(),
  doctorId,
  viewMode = 'weekly',
  onSlotClick,
  refreshKey
}: DoctorAvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const selectedDoctor = doctorId || '';
  const [availabilities, setAvailabilities] = useState<DoctorAvailability[]>([]);
  const [timeSlots, setTimeSlots] = useState<DoctorTimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Get week days for weekly view
  const getWeekDays = (date: Date): WeekDay[] => {
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

    const days: WeekDay[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      
      const today = new Date();
      days.push({
        date: day,
        dayOfWeek: day.getDay(),
        dayName: dayNames[day.getDay()],
        isToday: day.toDateString() === today.toDateString(),
        isCurrentMonth: day.getMonth() === date.getMonth()
      });
    }
    return days;
  };

  // Get month days for monthly view
  const getMonthDays = (date: Date): WeekDay[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startOfCalendar = new Date(firstDay);
    startOfCalendar.setDate(firstDay.getDate() - firstDay.getDay());
    
    const days: WeekDay[] = [];
    const today = new Date();
    
    for (let i = 0; i < 42; i++) { // 6 weeks x 7 days
      const day = new Date(startOfCalendar);
      day.setDate(startOfCalendar.getDate() + i);
      
      days.push({
        date: day,
        dayOfWeek: day.getDay(),
        dayName: dayNames[day.getDay()],
        isToday: day.toDateString() === today.toDateString(),
        isCurrentMonth: day.getMonth() === month
      });
    }
    return days;
  };

  const loadAvailabilities = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📅 CALENDAR: Loading availabilities for doctor:', selectedDoctor);
      const result = await doctorAvailabilityService.getDoctorAvailability(
        selectedDoctor || undefined,
        undefined,
        true
      );
      
      console.log('📅 CALENDAR: Availability load result:', result);
      
      if (result.success && result.data) {
        console.log('📅 CALENDAR: Setting availabilities:', result.data);
        setAvailabilities(result.data);
      } else {
        console.log('📅 CALENDAR: Failed to load availabilities:', result.error);
        setError(result.error || 'Failed to load availabilities');
      }
    } catch (err) {
      console.error('📅 CALENDAR: Unexpected error loading availabilities:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTimeSlots = async (startDate: Date, endDate: Date) => {
    if (!selectedDoctor) return;
    
    try {
      const result = await doctorAvailabilityService.getAvailableSlots({
        doctor_id: selectedDoctor,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });
      
      if (result.success && result.data) {
        setTimeSlots(result.data);
      }
    } catch (err) {
      console.error('Failed to load time slots:', err);
    }
  };

  useEffect(() => {
    loadAvailabilities();
    
    if (selectedDoctor) {
      const days = viewMode === 'weekly' ? getWeekDays(currentDate) : getMonthDays(currentDate);
      const startDate = days[0].date;
      const endDate = days[days.length - 1].date;
      loadTimeSlots(startDate, endDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, selectedDoctor, viewMode, refreshKey]);

  const getAvailabilityForDay = (dayOfWeek: number): DoctorAvailability[] => {
    return availabilities.filter(av => av.day_of_week === dayOfWeek);
  };

  const getSlotsForDay = (date: Date): CalendarSlot[] => {
    const dayOfWeek = date.getDay();
    const dateStr = date.toISOString().split('T')[0];
    
    const daySlots = timeSlots.filter(slot => slot.slot_date === dateStr);
    const dayAvailabilities = getAvailabilityForDay(dayOfWeek);
    
    const slots: CalendarSlot[] = [];
    
    daySlots.forEach(slot => {
      const availability = dayAvailabilities.find(av => av.id === slot.availability_id);
      if (availability) {
        const timeString = slot.start_time.substring(0, 5); // HH:MM format
        slots.push({
          timeSlot: slot,
          availability,
          displayTime: timeString
        });
      }
    });
    
    return slots.sort((a, b) => a.timeSlot.start_time.localeCompare(b.timeSlot.start_time));
  };

  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'weekly') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (viewMode === 'monthly') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'weekly') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (viewMode === 'monthly') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  const formatDateRange = (): string => {
    if (viewMode === 'daily') {
      return currentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } else if (viewMode === 'weekly') {
      const days = getWeekDays(currentDate);
      const start = days[0].date;
      const end = days[6].date;
      
      if (start.getMonth() === end.getMonth()) {
        return `${start.toLocaleDateString('en-US', { month: 'long' })} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
      } else {
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${end.getFullYear()}`;
      }
    } else {
      return currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }
  };

  const renderDailyView = () => {
    const slots = getSlotsForDay(currentDate);
    
    return (
      <div className="space-y-2">
        {slots.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No availability for this day
          </div>
        ) : (
          slots.map((slot, index) => (
            <div
              key={index}
              onClick={() => onSlotClick?.(slot.timeSlot)}
              className={`p-3 rounded border cursor-pointer hover:bg-gray-50 ${
                slot.timeSlot.is_booked 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-green-50 border-green-200'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">{slot.displayTime}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  slot.timeSlot.is_booked 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {slot.timeSlot.is_booked ? 'Booked' : 'Available'}
                </span>
              </div>
              {slot.timeSlot.is_booked && slot.timeSlot.visit_id && (
                <div className="text-sm text-gray-600 mt-1">
                  Visit ID: {slot.timeSlot.visit_id}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  };

  const renderWeeklyView = () => {
    const days = getWeekDays(currentDate);
    
    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Header */}
        {days.map((day, index) => (
          <div key={index} className="text-center p-2 border-b">
            <div className="text-sm font-medium text-gray-600">{day.dayName}</div>
            <div className={`text-lg ${day.isToday ? 'bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto' : ''}`}>
              {day.date.getDate()}
            </div>
          </div>
        ))}
        
        {/* Content */}
        {days.map((day, index) => {
          const slots = getSlotsForDay(day.date);
          return (
            <div key={index} className="min-h-[200px] p-1 border-r">
              <div className="space-y-1">
                {slots.slice(0, 3).map((slot, slotIndex) => (
                  <div
                    key={slotIndex}
                    onClick={() => onSlotClick?.(slot.timeSlot)}
                    className={`text-xs p-1 rounded cursor-pointer ${
                      slot.timeSlot.is_booked 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {slot.displayTime}
                  </div>
                ))}
                {slots.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{slots.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthlyView = () => {
    const days = getMonthDays(currentDate);
    
    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Header */}
        {dayNames.map((day, index) => (
          <div key={index} className="text-center p-2 font-medium text-gray-600 border-b">
            {day.substring(0, 3)}
          </div>
        ))}
        
        {/* Content */}
        {days.map((day, index) => {
          const slots = getSlotsForDay(day.date);
          const availableCount = slots.filter(slot => !slot.timeSlot.is_booked).length;
          const bookedCount = slots.filter(slot => slot.timeSlot.is_booked).length;
          
          return (
            <div 
              key={index} 
              className={`min-h-[80px] p-1 border cursor-pointer hover:bg-gray-50 ${
                !day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
              } ${day.isToday ? 'bg-blue-50 border-blue-200' : ''}`}
            >
              <div className="text-sm font-medium">{day.date.getDate()}</div>
              {slots.length > 0 && (
                <div className="mt-1 space-y-1">
                  {availableCount > 0 && (
                    <div className="text-xs bg-green-100 text-green-800 px-1 rounded">
                      {availableCount} available
                    </div>
                  )}
                  {bookedCount > 0 && (
                    <div className="text-xs bg-red-100 text-red-800 px-1 rounded">
                      {bookedCount} booked
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading calendar...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">Error: {error}</div>
        <button 
          onClick={loadAvailabilities}
          className="mt-2 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-900">Doctor Availability</h2>
          <div className="flex gap-2">
            <button
              onClick={navigatePrevious}
              className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-sm"
            >
              ← Previous
            </button>
            <button
              onClick={navigateToday}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              Today
            </button>
            <button
              onClick={navigateNext}
              className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-sm"
            >
              Next →
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Doctor Filter */}
          <div className="text-sm text-gray-600">
            {selectedDoctor ? `Doctor: ${selectedDoctor}` : 'All Doctors'}
          </div>
        </div>
      </div>

      {/* Date Range Display */}
      <div className="text-center mb-4">
        <h3 className="text-lg font-medium text-gray-800">{formatDateRange()}</h3>
      </div>

      {/* Calendar Content */}
      <div className="border rounded-lg">
        {viewMode === 'daily' && renderDailyView()}
        {viewMode === 'weekly' && renderWeeklyView()}
        {viewMode === 'monthly' && renderMonthlyView()}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
          <span>Booked</span>
        </div>
      </div>
    </div>
  );
}
