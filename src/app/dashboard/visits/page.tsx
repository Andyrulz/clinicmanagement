'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { visitService } from '@/lib/services/visit-service'
import type { PatientVisit } from '@/types/patient'

export default function VisitsDashboard() {
  const router = useRouter()
  const [visits, setVisits] = useState<PatientVisit[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'today' | 'scheduled' | 'in_progress' | 'completed'>('today')

  useEffect(() => {
    const loadVisits = async () => {
      try {
        setLoading(true)
        
        if (filter === 'today') {
          const todaysData = await visitService.getTodaysVisits()
          setVisits(todaysData)
        } else if (filter === 'all') {
          const allVisits = await visitService.getVisits({ limit: 50 })
          setVisits(allVisits)
        } else {
          // Filter by status
          const filteredVisits = await visitService.getVisits({ 
            status: filter as PatientVisit['status'],
            limit: 50 
          })
          setVisits(filteredVisits)
        }
      } catch (error) {
        console.error('Error loading visits:', error)
      } finally {
        setLoading(false)
      }
    }

    loadVisits()
  }, [filter])

  const getStatusColor = (status: PatientVisit['status']) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-50 text-blue-800 border border-blue-200'
      case 'in_progress': return 'bg-yellow-50 text-yellow-800 border border-yellow-200'
      case 'completed': return 'bg-green-50 text-green-800 border border-green-200'
      case 'cancelled': return 'bg-red-50 text-red-800 border border-red-200'
      default: return 'bg-gray-50 text-gray-800 border border-gray-200'
    }
  }

  const getVisitTypeColor = (type: PatientVisit['visit_type']) => {
    switch (type) {
      case 'new': return 'bg-indigo-100 text-indigo-800'
      case 'follow_up': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Visit Management</h1>
          <p className="text-gray-800">Manage patient visits and appointments</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/visits/create')}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
        >
          ➕ Create Visit
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 mb-6 bg-gray-50 border border-gray-200 p-2 rounded-lg w-fit">
        {[
          { key: 'today', label: 'Today' },
          { key: 'all', label: 'All Visits' },
          { key: 'scheduled', label: 'Scheduled' },
          { key: 'in_progress', label: 'In Progress' },
          { key: 'completed', label: 'Completed' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as typeof filter)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-white text-gray-900 border border-gray-300 shadow-sm'
                : 'text-gray-800 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Visits List */}
      <div className="space-y-4">
        {visits.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No visits found</h3>
            <p className="text-gray-800 mb-6">
              {filter === 'today' 
                ? "No visits scheduled for today." 
                : `No ${filter === 'all' ? '' : filter} visits found.`}
            </p>
            <button
              onClick={() => router.push('/dashboard/visits/create')}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create First Visit
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {visits.map((visit) => (
              <div
                key={visit.id}
                onClick={() => router.push(`/dashboard/visits/${visit.id}`)}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {visit.patient?.first_name} {visit.patient?.last_name}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(visit.status)}`}>
                      {visit.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVisitTypeColor(visit.visit_type)}`}>
                      {visit.visit_type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium text-gray-900">#{visit.visit_number}</p>
                    <p className="text-gray-800">{formatDate(visit.visit_date)} at {formatTime(visit.visit_time)}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-900 font-medium">Patient Info</p>
                    <p className="font-medium text-gray-900">{visit.patient?.phone}</p>
                    <p className="text-gray-800">UHID: {visit.patient?.uhid}</p>
                  </div>

                  <div>
                    <p className="text-gray-900 font-medium">Doctor</p>
                    <p className="font-medium text-gray-900">Dr. {visit.doctor?.full_name}</p>
                  </div>

                  <div>
                    <p className="text-gray-900 font-medium">Consultation Fee</p>
                    <p className="font-medium text-gray-900">₹{visit.consultation_fee}</p>
                    <p className={`text-xs ${
                      visit.consultation_fee_paid ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {visit.consultation_fee_paid ? 'Paid' : 'Pending'}
                    </p>
                  </div>
                </div>

                {visit.chief_complaints && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-900 font-medium">Chief Complaints</p>
                    <p className="text-sm text-gray-900 mt-1">{visit.chief_complaints}</p>
                  </div>
                )}

                <div className="mt-4 flex justify-between items-center">
                  <div className="text-xs text-gray-800">
                    Created: {new Date(visit.created_at).toLocaleString()}
                  </div>
                  <div className="flex gap-2">
                    {visit.status === 'scheduled' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          // Here you could add quick actions
                        }}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Start Visit
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/dashboard/visits/${visit.id}`)
                      }}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-900 rounded hover:bg-gray-200"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Load More Button */}
      {visits.length >= 50 && (
        <div className="text-center mt-6">
          <button
            onClick={() => {
              // Implement load more functionality
            }}
            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Load More Visits
          </button>
        </div>
      )}
      </div>
    </div>
  )
}
