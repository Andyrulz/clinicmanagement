// Appointment Status Dashboard Component
// Displays real-time appointment status counters like Cliniify
// Shows Today, Waiting, Engaged, Done counts with color coding
// Date: August 2, 2025

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, Users, XCircle, AlertTriangle } from 'lucide-react';
import { appointmentService } from '@/lib/services/appointment-service';

interface AppointmentStats {
  today: number;
  waiting: number;
  engaged: number;
  completed: number;
  cancelled: number;
  totalThisWeek: number;
  totalThisMonth: number;
}

interface AppointmentStatusDashboardProps {
  selectedDoctor?: string;
  selectedDate?: string;
  onStatusClick?: (status: string) => void;
  className?: string;
}

export function AppointmentStatusDashboard({
  selectedDoctor,
  selectedDate,
  onStatusClick,
  className = ''
}: AppointmentStatusDashboardProps) {
  const [stats, setStats] = useState<AppointmentStats>({
    today: 0,
    waiting: 0,
    engaged: 0,
    completed: 0,
    cancelled: 0,
    totalThisWeek: 0,
    totalThisMonth: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load stats when component mounts or dependencies change
  const loadAppointmentStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await appointmentService.getAppointmentStats(
        selectedDoctor,
        selectedDate
      );

      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setError(response.error || 'Failed to load appointment statistics');
      }
    } catch (err) {
      console.error('Error loading appointment stats:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [selectedDoctor, selectedDate]);

  useEffect(() => {
    loadAppointmentStats();
  }, [loadAppointmentStats]);

  const handleStatusClick = (status: string) => {
    onStatusClick?.(status);
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded w-48"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-red-200 p-6 ${className}`}>
        <div className="flex items-center text-red-600">
          <AlertTriangle className="w-5 h-5 mr-2" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Calendar className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">
            Today&apos;s Schedule
          </h3>
        </div>
        <div className="text-sm text-gray-500">
          {selectedDate || new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Main Status Cards - Cliniify Style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Today Total */}
        <div 
          className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => handleStatusClick('today')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today</p>
              <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
            </div>
            <div className="w-3 h-3 bg-gray-900 rounded-full"></div>
          </div>
        </div>

        {/* Waiting */}
        <div 
          className="bg-red-50 rounded-lg p-4 cursor-pointer hover:bg-red-100 transition-colors"
          onClick={() => handleStatusClick('waiting')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Waiting</p>
              <p className="text-2xl font-bold text-red-700">{stats.waiting}</p>
            </div>
            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
          </div>
        </div>

        {/* Engaged (In Progress) */}
        <div 
          className="bg-blue-50 rounded-lg p-4 cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => handleStatusClick('in_progress')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Engaged</p>
              <p className="text-2xl font-bold text-blue-700">{stats.engaged}</p>
            </div>
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
          </div>
        </div>

        {/* Done (Completed) */}
        <div 
          className="bg-green-50 rounded-lg p-4 cursor-pointer hover:bg-green-100 transition-colors"
          onClick={() => handleStatusClick('completed')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Done</p>
              <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
            </div>
            <div className="w-3 h-3 bg-green-600 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        {/* Cancelled Today */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <XCircle className="w-4 h-4 text-orange-500 mr-1" />
            <span className="text-sm font-medium text-gray-600">Cancelled</span>
          </div>
          <p className="text-lg font-semibold text-orange-600">{stats.cancelled}</p>
        </div>

        {/* This Week */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Clock className="w-4 h-4 text-purple-500 mr-1" />
            <span className="text-sm font-medium text-gray-600">This Week</span>
          </div>
          <p className="text-lg font-semibold text-purple-600">{stats.totalThisWeek}</p>
        </div>

        {/* This Month */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Users className="w-4 h-4 text-indigo-500 mr-1" />
            <span className="text-sm font-medium text-gray-600">This Month</span>
          </div>
          <p className="text-lg font-semibold text-indigo-600">{stats.totalThisMonth}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {selectedDoctor ? 'Doctor specific' : 'All doctors'} • Real-time updates
          </div>
          <button
            onClick={loadAppointmentStats}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Status Legend */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-xs font-medium text-gray-700 mb-2">Status Guide:</div>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-red-600 rounded-full mr-2"></div>
            Waiting: Patient checked in
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
            Engaged: In consultation
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
            Done: Consultation completed
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-orange-600 rounded-full mr-2"></div>
            Cancelled: Appointment cancelled
          </div>
        </div>
      </div>
    </div>
  );
}
