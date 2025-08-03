'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  AlertTriangle, 
  Users, 
  Phone,
  Calendar,
  Shield,
  Clock,
  Target,
  RefreshCw,
  Download,
  Mail,
  Bell,
  ArrowLeft
} from 'lucide-react'

import { advancedAnalyticsService } from '@/lib/services/advanced-analytics-service'

interface AtRiskPatient {
  patientId: string
  name: string
  phone: string
  lastVisit: string
  daysSinceLastVisit: number
  riskFactors: string[]
  riskScore: number
}

interface PatientEngagementMetrics {
  totalPatients: number
  activePatients: number
  atRiskPatients: number
  churnedPatients: number
  engagementRate: number
  averageDaysBetweenVisits: number
}

export default function PatientRiskDashboard() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [atRiskPatients, setAtRiskPatients] = useState<AtRiskPatient[]>([])
  const [metrics, setMetrics] = useState<PatientEngagementMetrics>({
    totalPatients: 0,
    activePatients: 0,
    atRiskPatients: 0,
    churnedPatients: 0,
    engagementRate: 0,
    averageDaysBetweenVisits: 0
  })
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<'all' | 'high' | 'medium' | 'low'>('all')

  const loadRiskAnalysis = async () => {
    try {
      setRefreshing(true)
      // Mock tenant ID - in real implementation, get from user session
      const mockTenantId = 'tenant-123'
      
      const riskData = await advancedAnalyticsService.getPatientRiskAnalysis(mockTenantId)
      setAtRiskPatients(riskData)
      
      // Calculate metrics
      const totalAtRisk = riskData.length
      // const highRisk = riskData.filter(p => p.riskScore >= 70).length
      // const mediumRisk = riskData.filter(p => p.riskScore >= 40 && p.riskScore < 70).length
      
      setMetrics({
        totalPatients: 250, // Mock data
        activePatients: 180,
        atRiskPatients: totalAtRisk,
        churnedPatients: 15,
        engagementRate: 72,
        averageDaysBetweenVisits: 28
      })
      
    } catch (error) {
      console.error('Error loading risk analysis:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadRiskAnalysis()
  }, [])

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-600 bg-red-50 border-red-200'
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-green-600 bg-green-50 border-green-200'
  }

  const getRiskLabel = (score: number) => {
    if (score >= 70) return 'High Risk'
    if (score >= 40) return 'Medium Risk'
    return 'Low Risk'
  }

  const filteredPatients = atRiskPatients.filter(patient => {
    if (selectedRiskLevel === 'all') return true
    if (selectedRiskLevel === 'high') return patient.riskScore >= 70
    if (selectedRiskLevel === 'medium') return patient.riskScore >= 40 && patient.riskScore < 70
    if (selectedRiskLevel === 'low') return patient.riskScore < 40
    return true
  })

  const exportRiskReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      metrics,
      atRiskPatients: filteredPatients,
      summary: {
        totalAtRisk: atRiskPatients.length,
        highRisk: atRiskPatients.filter(p => p.riskScore >= 70).length,
        mediumRisk: atRiskPatients.filter(p => p.riskScore >= 40 && p.riskScore < 70).length,
        lowRisk: atRiskPatients.filter(p => p.riskScore < 40).length
      },
      recommendations: [
        'Implement automated follow-up reminders for high-risk patients',
        'Create personalized re-engagement campaigns',
        'Schedule proactive check-in calls for patients with missed follow-ups',
        'Offer telemedicine options to reduce barriers to care'
      ]
    }
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `patient-risk-analysis-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const sendReminder = (patient: AtRiskPatient) => {
    // In real implementation, this would trigger email/SMS
    alert(`Reminder sent to ${patient.name} at ${patient.phone}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-900 font-semibold">Loading patient risk analysis...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard"
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Dashboard
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Patient Risk Analysis</h1>
                <p className="text-gray-600 mt-1">Identify at-risk patients and improve retention</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadRiskAnalysis}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={exportRiskReport}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download className="w-4 h-4" />
                <span>Export Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Patients</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.totalPatients}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">At Risk Patients</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{metrics.atRiskPatients}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {((metrics.atRiskPatients / metrics.totalPatients) * 100).toFixed(1)}% of total
                </p>
              </div>
              <div className="p-3 rounded-full bg-red-100">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Engagement Rate</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{metrics.engagementRate}%</p>
                <p className="text-sm text-green-600 mt-1">+2.3% vs last month</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <Target className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Days Between Visits</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.averageDaysBetweenVisits}</p>
                <p className="text-sm text-gray-500 mt-1">Ideal: 21-30 days</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Risk Level Filter */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Levels</h3>
              
              <div className="space-y-2">
                {[
                  { id: 'all', label: 'All Patients', count: atRiskPatients.length },
                  { id: 'high', label: 'High Risk', count: atRiskPatients.filter(p => p.riskScore >= 70).length },
                  { id: 'medium', label: 'Medium Risk', count: atRiskPatients.filter(p => p.riskScore >= 40 && p.riskScore < 70).length },
                  { id: 'low', label: 'Low Risk', count: atRiskPatients.filter(p => p.riskScore < 40).length }
                ].map(level => (
                  <button
                    key={level.id}
                    onClick={() => setSelectedRiskLevel(level.id as 'all' | 'high' | 'medium' | 'low')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex justify-between items-center ${
                      selectedRiskLevel === level.id
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span>{level.label}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      level.id === 'high' ? 'bg-red-100 text-red-600' :
                      level.id === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                      level.id === 'low' ? 'bg-green-100 text-green-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {level.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="border-t border-gray-200 pt-4 mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h4>
                <div className="space-y-2">
                  <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">
                    <Bell className="w-4 h-4" />
                    <span>Send Bulk Reminders</span>
                  </button>
                  <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100">
                    <Mail className="w-4 h-4" />
                    <span>Email Campaign</span>
                  </button>
                  <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100">
                    <Phone className="w-4 h-4" />
                    <span>Schedule Calls</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* At-Risk Patients List */}
          <div className="lg:col-span-3">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  At-Risk Patients ({filteredPatients.length})
                </h2>
                <div className="text-sm text-gray-500">
                  Showing {selectedRiskLevel === 'all' ? 'all' : selectedRiskLevel} risk patients
                </div>
              </div>

              {filteredPatients.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="mx-auto h-12 w-12 text-green-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No at-risk patients</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedRiskLevel === 'all' 
                      ? 'All patients are engaged and have recent activity.'
                      : `No patients in the ${selectedRiskLevel} risk category.`
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPatients.slice(0, 20).map(patient => (
                    <div key={patient.patientId} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {patient.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-1">
                            <h3 className="font-medium text-gray-900">{patient.name}</h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRiskColor(patient.riskScore)}`}>
                              {getRiskLabel(patient.riskScore)} ({patient.riskScore.toFixed(0)})
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center space-x-1">
                              <Phone className="w-3 h-3" />
                              <span>{patient.phone}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>Last visit: {new Date(patient.lastVisit).toLocaleDateString()}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{patient.daysSinceLastVisit} days ago</span>
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-1 mt-2">
                            {patient.riskFactors.map((factor, index) => (
                              <span key={index} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                                {factor}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => sendReminder(patient)}
                          className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          <Bell className="w-3 h-3" />
                          <span>Remind</span>
                        </button>
                        <button className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                          <Phone className="w-3 h-3" />
                          <span>Call</span>
                        </button>
                        <button className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                          <Users className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {filteredPatients.length > 20 && (
                    <div className="text-center pt-4">
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        Load more patients ({filteredPatients.length - 20} remaining)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Bell className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium text-blue-900">Automated Reminders</h4>
              </div>
              <p className="text-sm text-blue-700">
                Set up automatic follow-up reminders for patients who haven&apos;t visited in 60+ days
              </p>
            </div>
            
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-5 h-5 text-green-600" />
                <h4 className="font-medium text-green-900">Engagement Campaign</h4>
              </div>
              <p className="text-sm text-green-700">
                Create personalized health tips and wellness content for different patient segments
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Phone className="w-5 h-5 text-purple-600" />
                <h4 className="font-medium text-purple-900">Proactive Outreach</h4>
              </div>
              <p className="text-sm text-purple-700">
                Schedule wellness check calls for high-risk patients to understand their barriers to care
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
