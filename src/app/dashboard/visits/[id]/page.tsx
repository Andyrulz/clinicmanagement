'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { visitService } from '@/lib/services/visit-service'
import { generateVisitSummaryPDF } from '@/lib/pdf/visit-summary-generator'
import type { PatientVisit, PatientVitals } from '@/types/patient'
import type { Prescription } from '@/types/prescription'
import type { Tenant } from '@/types/tenant'

export default function VisitDetail() {
  const router = useRouter()
  const params = useParams()
  const visitId = params.id as string
  const supabase = createClient()

  const [visit, setVisit] = useState<PatientVisit | null>(null)
  const [vitals, setVitals] = useState<PatientVitals[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [isEditingClinical, setIsEditingClinical] = useState(false)
  const [isEditingVisit, setIsEditingVisit] = useState(false)
  const [editingFollowUp, setEditingFollowUp] = useState(false)
  const [clinicalData, setClinicalData] = useState({
    history_of_present_illness: '',
    physical_examination: '',
    diagnosis: '',
    treatment_plan: '',
    general_advice: '',
    follow_up_date: '',
    follow_up_instructions: ''
  })
  const [followUpData, setFollowUpData] = useState({
    visit_date: '',
    visit_time: '10:00',
    consultation_fee: 0
  })
  const [visitFormData, setVisitFormData] = useState({
    visit_date: '',
    visit_time: '',
    visit_type: 'new' as 'new' | 'follow_up',
    consultation_fee: '',
    chief_complaints: ''
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // Get current user and tenant info
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          router.push('/login')
          return
        }

        const { data: userRecord, error: userError } = await supabase
          .from('users')
          .select(`
            id,
            full_name,
            role,
            tenant:tenants(id, name, slug, registration_number, address, phone, email)
          `)
          .eq('auth_user_id', user.id)
          .single()
          
        if (userError || !userRecord) {
          router.push('/setup')
          return
        }

        const tenantData = Array.isArray(userRecord.tenant) ? userRecord.tenant[0] : userRecord.tenant
        setTenant({
          id: tenantData.id,
          name: tenantData.name,
          slug: tenantData.slug,
          registration_number: tenantData.registration_number,
          address: tenantData.address,
          phone: tenantData.phone,
          email: tenantData.email,
          is_active: true,
          subscription_plan: 'basic',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

        // Load visit data
        const [visitData, vitalsData, prescriptionsData] = await Promise.all([
          visitService.getVisitById(visitId),
          visitService.getVisitVitals(visitId),
          visitService.getVisitPrescriptions(visitId)
        ])

        setVisit(visitData)
        setVitals(vitalsData as PatientVitals[])
        setPrescriptions(prescriptionsData)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (visitId) {
      loadData()
    }
  }, [visitId, router, supabase])

  const updateVisitStatus = async (newStatus: PatientVisit['status']) => {
    if (!visit) return

    try {
      setUpdating(true)
      const updatedVisit = await visitService.updateVisitStatus({
        visit_id: visit.id,
        status: newStatus
      })
      setVisit(updatedVisit)
    } catch (error) {
      console.error('Error updating visit status:', error)
    } finally {
      setUpdating(false)
    }
  }

  const updatePaymentStatus = async (paid: boolean) => {
    if (!visit) return

    try {
      setUpdating(true)
      console.log('Updating payment status:', { visitId: visit.id, paid })
      
      const updatedVisit = await visitService.updatePaymentStatus({
        visit_id: visit.id,
        paid: paid
      })
      
      console.log('Payment status updated successfully:', updatedVisit.consultation_fee_paid)
      setVisit(updatedVisit)
    } catch (error) {
      console.error('Error updating payment status:', error)
    } finally {
      setUpdating(false)
    }
  }

  const updateClinicalData = async () => {
    if (!visit) return

    try {
      setUpdating(true)
      
      const updatedVisit = await visitService.updateEnhancedConsultation(visit.id, {
        ...clinicalData,
        prescriptions: prescriptions // Include existing prescriptions
      })
      
      setVisit(updatedVisit)
      setIsEditingClinical(false)
    } catch (error) {
      console.error('Error updating clinical data:', error)
      alert('Error updating clinical data. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const startEditingClinical = () => {
    if (!visit) return
    
    setClinicalData({
      history_of_present_illness: visit.history_of_present_illness || '',
      physical_examination: visit.physical_examination || '',
      diagnosis: visit.diagnosis || '',
      treatment_plan: visit.treatment_plan || '',
      general_advice: visit.general_advice || '',
      follow_up_date: visit.follow_up_date || '',
      follow_up_instructions: visit.follow_up_instructions || ''
    })
    setIsEditingClinical(true)
  }

  const cancelEditingClinical = () => {
    setIsEditingClinical(false)
    setClinicalData({
      history_of_present_illness: '',
      physical_examination: '',
      diagnosis: '',
      treatment_plan: '',
      general_advice: '',
      follow_up_date: '',
      follow_up_instructions: ''
    })
  }

  const generateVisitPDF = async () => {
    if (!visit || !tenant) return

    try {
      setGeneratingPDF(true)
      
      const pdfData = {
        visit,
        vitals,
        prescriptions,
        tenant,
        doctorInfo: {
          name: visit.doctor?.full_name || 'Unknown Doctor',
          registration: undefined, // TODO: Add registration_number to doctor data
          email: undefined // TODO: Add email to doctor data
        }
      }

      const generator = generateVisitSummaryPDF(pdfData)
      const patientName = `${visit.patient?.first_name || ''}_${visit.patient?.last_name || ''}`.trim()
      generator.download(`visit_summary_${patientName}_${visit.visit_number}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
    } finally {
      setGeneratingPDF(false)
    }
  }

  const createFollowUpVisit = async () => {
    if (!visit || !visit.follow_up_date) return

    try {
      setUpdating(true)
      
      // Create a new visit scheduled for the follow-up date
      const visitData = {
        patient_id: visit.patient_id,
        doctor_id: visit.doctor_id,
        visit_date: editingFollowUp ? followUpData.visit_date : visit.follow_up_date,
        visit_time: editingFollowUp ? followUpData.visit_time : '10:00',
        visit_type: 'follow_up' as const,
        consultation_fee: editingFollowUp ? followUpData.consultation_fee : visit.consultation_fee,
        chief_complaints: visit.follow_up_instructions || 'Follow-up visit'
      }

      const newVisit = await visitService.createVisit(visitData)
      
      console.log('Follow-up visit created:', newVisit)
      alert(`Follow-up visit scheduled for ${visitData.visit_date} at ${visitData.visit_time}`)
      setEditingFollowUp(false)
      
    } catch (error) {
      console.error('Error creating follow-up visit:', error)
      alert('Error creating follow-up visit. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const startEditingFollowUp = () => {
    if (!visit) return
    
    setFollowUpData({
      visit_date: visit.follow_up_date || '',
      visit_time: '10:00',
      consultation_fee: visit.consultation_fee
    })
    setEditingFollowUp(true)
  }

  const startEditingVisit = () => {
    if (!visit) return
    
    setVisitFormData({
      visit_date: visit.visit_date,
      visit_time: visit.visit_time,
      visit_type: visit.visit_type,
      consultation_fee: visit.consultation_fee.toString(),
      chief_complaints: visit.chief_complaints || ''
    })
    setIsEditingVisit(true)
  }

  const updateVisitDetails = async () => {
    if (!visit) return

    try {
      setUpdating(true)
      
      const updatedVisit = await visitService.updateVisit({
        visit_id: visit.id,
        visit_date: visitFormData.visit_date,
        visit_time: visitFormData.visit_time,
        visit_type: visitFormData.visit_type,
        consultation_fee: Number(visitFormData.consultation_fee),
        chief_complaints: visitFormData.chief_complaints
      })
      
      setVisit(updatedVisit)
      setIsEditingVisit(false)
    } catch (error) {
      console.error('Error updating visit details:', error)
      alert('Failed to update visit details. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const cancelEditingVisit = () => {
    setIsEditingVisit(false)
    setVisitFormData({
      visit_date: '',
      visit_time: '',
      visit_type: 'new',
      consultation_fee: '',
      chief_complaints: ''
    })
  }

  const cancelEditingFollowUp = () => {
    setEditingFollowUp(false)
    setFollowUpData({
      visit_date: '',
      visit_time: '10:00',
      consultation_fee: 0
    })
  }

  const getStatusColor = (status: PatientVisit['status']) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusActions = (status: PatientVisit['status']) => {
    switch (status) {
      case 'scheduled':
        return [
          { label: 'Start Visit', action: () => updateVisitStatus('in_progress'), color: 'bg-blue-600' },
          { label: 'Cancel', action: () => updateVisitStatus('cancelled'), color: 'bg-red-600' }
        ]
      case 'in_progress':
        return [
          { label: 'Complete Visit', action: () => updateVisitStatus('completed'), color: 'bg-green-600' }
        ]
      case 'completed':
        return []
      case 'cancelled':
        return [
          { label: 'Reschedule', action: () => updateVisitStatus('scheduled'), color: 'bg-blue-600' }
        ]
      default:
        return []
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!visit) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Visit Not Found</h1>
          <p className="text-gray-800 font-medium mb-6">The visit you are looking for could not be found.</p>
          <button 
            onClick={() => router.push('/dashboard/visits')}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Back to Visits
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/dashboard/visits')}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex items-center gap-2"
          >
            ← Back to Visits
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Visit Details</h1>
            <p className="text-gray-900 font-medium">Visit #{visit.visit_number}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(visit.status)}`}>
            {visit.status.replace('_', ' ').toUpperCase()}
          </span>
          
          {getStatusActions(visit.status).map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              disabled={updating}
              className={`px-6 py-3 text-white font-semibold rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed ${action.color} focus:ring-${action.color.split('-')[1]}-500`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Visit Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Patient Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900">Full Name</label>
                <p className="mt-1 text-sm text-gray-900">
                  {visit.patient?.first_name} {visit.patient?.last_name}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900">UHID</label>
                <p className="mt-1 text-sm text-gray-900">{visit.patient?.uhid}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900">Phone</label>
                <p className="mt-1 text-sm text-gray-900">{visit.patient?.phone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900">Age</label>
                <p className="mt-1 text-sm text-gray-900">{visit.patient?.age || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900">Gender</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">
                  {visit.patient?.gender || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Visit Details */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Visit Information</h2>
              {visit.status === 'scheduled' && !isEditingVisit && (
                <button
                  onClick={startEditingVisit}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                >
                  ✏️ Edit
                </button>
              )}
            </div>
            
            {isEditingVisit ? (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Visit Date</label>
                    <input
                      type="date"
                      value={visitFormData.visit_date}
                      onChange={(e) => setVisitFormData({...visitFormData, visit_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Visit Time</label>
                    <input
                      type="time"
                      value={visitFormData.visit_time}
                      onChange={(e) => setVisitFormData({...visitFormData, visit_time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Visit Type</label>
                    <select
                      value={visitFormData.visit_type}
                      onChange={(e) => setVisitFormData({...visitFormData, visit_type: e.target.value as 'new' | 'follow_up'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="new">New Visit</option>
                      <option value="follow_up">Follow-up Visit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Consultation Fee (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={visitFormData.consultation_fee}
                      onChange={(e) => setVisitFormData({...visitFormData, consultation_fee: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Chief Complaints</label>
                  <textarea
                    value={visitFormData.chief_complaints}
                    onChange={(e) => setVisitFormData({...visitFormData, chief_complaints: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter patient's chief complaints..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={updateVisitDetails}
                    disabled={updating}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {updating ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={cancelEditingVisit}
                    disabled={updating}
                    className="px-4 py-2 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Visit Number</label>
                  <p className="mt-1 text-sm text-gray-900">{visit.visit_number}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Doctor</label>
                  <p className="mt-1 text-sm text-gray-900">
                    Dr. {visit.doctor?.full_name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Date & Time</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(visit.visit_date).toLocaleDateString()} at {visit.visit_time}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Visit Type</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">
                    {visit.visit_type.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Consultation Fee</label>
                  <p className="mt-1 text-sm text-gray-900">₹{visit.consultation_fee}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Payment Status</label>
                  <div className="mt-1 flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      visit.consultation_fee_paid 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {visit.consultation_fee_paid ? 'Paid' : 'Pending'}
                    </span>
                    
                    {!visit.consultation_fee_paid && (
                      <button
                        onClick={() => updatePaymentStatus(true)}
                        disabled={updating}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        Mark as Paid
                      </button>
                    )}
                    
                    {visit.consultation_fee_paid && (
                      <button
                        onClick={() => updatePaymentStatus(false)}
                        disabled={updating}
                        className="px-3 py-1 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        Mark as Pending
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {visit.chief_complaints && !isEditingVisit && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-900">Chief Complaints</label>
                <p className="mt-1 text-sm text-gray-900 p-3 bg-gray-50 rounded-md">
                  {visit.chief_complaints}
                </p>
              </div>
            )}
          </div>

          {/* Clinical Documentation */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Clinical Documentation</h2>
              {visit.status !== 'scheduled' && (visit.history_of_present_illness || visit.physical_examination || visit.diagnosis || visit.treatment_plan) && !isEditingClinical && (
                <button
                  onClick={startEditingClinical}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                >
                  ✏️ Edit
                </button>
              )}
            </div>
            
            {visit.status === 'scheduled' ? (
              <p className="text-gray-900 italic">Clinical documentation will be available after the visit starts.</p>
            ) : isEditingClinical ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">History of Present Illness</label>
                  <textarea
                    value={clinicalData.history_of_present_illness}
                    onChange={(e) => setClinicalData({...clinicalData, history_of_present_illness: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Enter history of present illness..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Physical Examination</label>
                  <textarea
                    value={clinicalData.physical_examination}
                    onChange={(e) => setClinicalData({...clinicalData, physical_examination: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Enter physical examination findings..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Diagnosis</label>
                  <textarea
                    value={clinicalData.diagnosis}
                    onChange={(e) => setClinicalData({...clinicalData, diagnosis: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    placeholder="Enter diagnosis..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Treatment Plan</label>
                  <textarea
                    value={clinicalData.treatment_plan}
                    onChange={(e) => setClinicalData({...clinicalData, treatment_plan: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Enter treatment plan..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">General Advice</label>
                  <textarea
                    value={clinicalData.general_advice}
                    onChange={(e) => setClinicalData({...clinicalData, general_advice: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    placeholder="Enter general advice..."
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Follow-up Date</label>
                    <input
                      type="date"
                      value={clinicalData.follow_up_date}
                      onChange={(e) => setClinicalData({...clinicalData, follow_up_date: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Follow-up Instructions</label>
                    <textarea
                      value={clinicalData.follow_up_instructions}
                      onChange={(e) => setClinicalData({...clinicalData, follow_up_instructions: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                      rows={2}
                      placeholder="Enter follow-up instructions..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={updateClinicalData}
                    disabled={updating}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {updating ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={cancelEditingClinical}
                    disabled={updating}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {visit.history_of_present_illness && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900">History of Present Illness</label>
                    <p className="mt-1 text-sm text-gray-900 p-3 bg-gray-50 rounded-md">
                      {visit.history_of_present_illness}
                    </p>
                  </div>
                )}

                {visit.physical_examination && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Physical Examination</label>
                    <p className="mt-1 text-sm text-gray-900 p-3 bg-gray-50 rounded-md">
                      {visit.physical_examination}
                    </p>
                  </div>
                )}

                {visit.diagnosis && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Diagnosis</label>
                    <p className="mt-1 text-sm text-gray-900 p-3 bg-gray-50 rounded-md">
                      {visit.diagnosis}
                    </p>
                  </div>
                )}

                {visit.treatment_plan && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Treatment Plan</label>
                    <p className="mt-1 text-sm text-gray-900 p-3 bg-gray-50 rounded-md">
                      {visit.treatment_plan}
                    </p>
                  </div>
                )}

                {visit.general_advice && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900">General Advice</label>
                    <p className="mt-1 text-sm text-gray-900 p-3 bg-gray-50 rounded-md">
                      {visit.general_advice}
                    </p>
                  </div>
                )}

                {visit.follow_up_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Follow-up Date</label>
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-sm text-gray-900">
                        {new Date(visit.follow_up_date).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={startEditingFollowUp}
                          disabled={updating || editingFollowUp}
                          className="px-3 py-1 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          ✏️ Edit Details
                        </button>
                        <button
                          onClick={createFollowUpVisit}
                          disabled={updating}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          {updating ? 'Creating...' : 'Schedule Visit'}
                        </button>
                      </div>
                    </div>
                    
                    {editingFollowUp && (
                      <div className="mt-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                        <h4 className="font-medium text-gray-900 mb-3">Edit Follow-up Details</h4>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">Date</label>
                            <input
                              type="date"
                              value={followUpData.visit_date}
                              onChange={(e) => setFollowUpData({...followUpData, visit_date: e.target.value})}
                              className="w-full p-2 border border-gray-300 rounded-md text-gray-900 text-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">Time</label>
                            <input
                              type="time"
                              value={followUpData.visit_time}
                              onChange={(e) => setFollowUpData({...followUpData, visit_time: e.target.value})}
                              className="w-full p-2 border border-gray-300 rounded-md text-gray-900 text-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">Fee (₹)</label>
                            <input
                              type="number"
                              value={followUpData.consultation_fee}
                              onChange={(e) => setFollowUpData({...followUpData, consultation_fee: Number(e.target.value)})}
                              className="w-full p-2 border border-gray-300 rounded-md text-gray-900 text-sm focus:ring-blue-500 focus:border-blue-500"
                              min="0"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={createFollowUpVisit}
                            disabled={updating}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            {updating ? 'Creating...' : 'Create Visit'}
                          </button>
                          <button
                            onClick={cancelEditingFollowUp}
                            disabled={updating}
                            className="px-3 py-1 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {visit.follow_up_instructions && (
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-900">Follow-up Instructions</label>
                        <p className="mt-1 text-sm text-gray-900 p-3 bg-gray-50 rounded-md">
                          {visit.follow_up_instructions}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={() => router.push(`/dashboard/visits/${visitId}/vitals`)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-left"
              >
                📊 Record Vitals
              </button>
              
              {visit.status === 'in_progress' && (
                <button 
                  onClick={() => router.push(`/dashboard/visits/${visitId}/consultation`)}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-left"
                >
                  🩺 Start Consultation
                </button>
              )}

              <button 
                onClick={() => router.push(`/dashboard/patients/${visit.patient_id}`)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-left"
              >
                👤 View Patient Profile
              </button>
            </div>
          </div>

          {/* Vitals Summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Latest Vitals</h3>
            {vitals.length > 0 ? (
              <div className="space-y-3">
                {vitals[0].height_cm && vitals[0].weight_kg && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-800">Height/Weight:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {vitals[0].height_cm}cm / {vitals[0].weight_kg}kg
                    </span>
                  </div>
                )}

                {vitals[0].bmi && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-800">BMI:</span>
                    <span className="text-sm font-medium text-gray-900">{vitals[0].bmi}</span>
                  </div>
                )}

                {vitals[0].blood_pressure_systolic && vitals[0].blood_pressure_diastolic && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-800">Blood Pressure:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {vitals[0].blood_pressure_systolic}/{vitals[0].blood_pressure_diastolic} mmHg
                    </span>
                  </div>
                )}

                {vitals[0].pulse_rate && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-800">Pulse Rate:</span>
                    <span className="text-sm font-medium text-gray-900">{vitals[0].pulse_rate} bpm</span>
                  </div>
                )}

                {vitals[0].temperature_celsius && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-800">Temperature:</span>
                    <span className="text-sm font-medium text-gray-900">{vitals[0].temperature_celsius}°C</span>
                  </div>
                )}

                {vitals[0].spo2 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-800">SpO2:</span>
                    <span className="text-sm font-medium text-gray-900">{vitals[0].spo2}%</span>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-800">
                    Recorded: {new Date(vitals[0].recorded_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-900 italic">No vitals recorded yet</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={generateVisitPDF}
                disabled={generatingPDF}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {generatingPDF ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating PDF...
                  </>
                ) : (
                  <>
                    📄 Download Visit Summary
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Visit Timeline */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Visit Timeline</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Visit Scheduled</p>
                  <p className="text-xs text-gray-800">
                    {new Date(visit.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {visit.status !== 'scheduled' && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Status Updated</p>
                    <p className="text-xs text-gray-800">
                      {visit.updated_at && new Date(visit.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {vitals.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Vitals Recorded</p>
                    <p className="text-xs text-gray-800">
                      {new Date(vitals[0].recorded_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
