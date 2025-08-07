'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Calendar, Clock, User, DollarSign, FileText } from 'lucide-react'
import Link from 'next/link'
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
      case 'scheduled': return 'bg-blue-100 text-blue-700 border border-blue-200'
      case 'in_progress': return 'bg-amber-100 text-amber-700 border border-amber-200'
      case 'completed': return 'bg-green-100 text-green-700 border border-green-200'
      case 'cancelled': return 'bg-red-100 text-red-700 border border-red-200'
      default: return 'bg-gray-100 text-gray-700 border border-gray-200'
    }
  }

  const getVisitTypeColor = (type: PatientVisit['visit_type']) => {
    switch (type) {
      case 'new': return 'bg-indigo-100 text-indigo-700'
      case 'follow_up': return 'bg-purple-100 text-purple-700'
      default: return 'bg-gray-100 text-gray-700'
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded-xl w-64 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Enhanced Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link 
              href="/dashboard"
              className="flex items-center text-gray-600 hover:text-blue-600 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center mr-3 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </div>
              <span className="font-medium">Dashboard</span>
            </Link>
            <div className="h-8 w-px bg-gray-200"></div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Visit Management
              </h1>
              <p className="text-gray-600 mt-1">
                Manage patient visits and appointments efficiently
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/visits/create')}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span>Create Visit</span>
          </button>
        </div>
      </div>

      {/* Enhanced Filter Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 mb-8 inline-flex">
        {[
          { key: 'today', label: 'Today', icon: Calendar },
          { key: 'all', label: 'All Visits', icon: FileText },
          { key: 'scheduled', label: 'Scheduled', icon: Clock },
          { key: 'in_progress', label: 'In Progress', icon: User },
          { key: 'completed', label: 'Completed', icon: Calendar }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as typeof filter)}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              filter === tab.key
                ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Enhanced Visits List */}
      <div className="space-y-6">
        {visits.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 text-center py-16">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No visits found</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              {filter === 'today' 
                ? "No visits scheduled for today. Create a new visit to get started." 
                : `No ${filter === 'all' ? '' : filter} visits found. Try a different filter or create a new visit.`}
            </p>
            <button
              onClick={() => router.push('/dashboard/visits/create')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create First Visit
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {visits.map((visit) => (
              <div
                key={visit.id}
                onClick={() => router.push(`/dashboard/visits/${visit.id}`)}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-blue-200 transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {visit.patient?.first_name} {visit.patient?.last_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(visit.status)}`}>
                          {visit.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getVisitTypeColor(visit.visit_type)}`}>
                          {visit.visit_type.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 text-lg">#{visit.visit_number}</p>
                    <p className="text-gray-600 text-sm flex items-center gap-1 mt-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(visit.visit_date)}
                    </p>
                    <p className="text-gray-600 text-sm flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatTime(visit.visit_time)}
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <p className="text-gray-600 font-medium flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Patient Info
                    </p>
                    <p className="font-medium text-gray-900">{visit.patient?.phone}</p>
                    <p className="text-gray-600 text-sm">UHID: {visit.patient?.uhid}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-gray-600 font-medium">Doctor</p>
                    <p className="font-medium text-gray-900">Dr. {visit.doctor?.full_name}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-gray-600 font-medium flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Consultation Fee
                    </p>
                    <p className="font-semibold text-gray-900 text-lg">₹{visit.consultation_fee}</p>
                    <p className={`text-sm font-medium px-2 py-1 rounded-full inline-block ${
                      visit.consultation_fee_paid 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {visit.consultation_fee_paid ? '✓ Paid' : '⏳ Pending'}
                    </p>
                  </div>
                </div>

                {visit.chief_complaints && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                    <p className="text-gray-700 font-medium flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4" />
                      Chief Complaints
                    </p>
                    <p className="text-gray-900">{visit.chief_complaints}</p>
                  </div>
                )}

                <div className="mt-6 flex justify-between items-center pt-4 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    Created: {new Date(visit.created_at).toLocaleString()}
                  </div>
                  <div className="flex gap-3">
                    {visit.status === 'scheduled' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          // Here you could add quick actions
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200"
                      >
                        Start Visit
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/dashboard/visits/${visit.id}`)
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200"
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

      {/* Enhanced Load More Button */}
      {visits.length >= 50 && (
        <div className="text-center mt-8">
          <button
            onClick={() => {
              // Implement load more functionality
            }}
            className="px-6 py-3 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-gray-300 transition-all duration-200 font-medium text-gray-700"
          >
            Load More Visits
          </button>
        </div>
      )}
      </div>
    </div>
  )
}
