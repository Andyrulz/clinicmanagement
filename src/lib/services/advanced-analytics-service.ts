import { createClient } from '@/lib/supabase/client'

export interface BusinessMetrics {
  // Revenue Analysis
  revenueGrowthRate: number
  averageRevenuePerPatient: number
  revenuePerVisit: number
  paymentComplianceRate: number
  outstandingAmount: number
  
  // Patient Insights
  patientRetentionRate: number
  newPatientGrowthRate: number
  patientLifetimeValue: number
  averageVisitsPerPatient: number
  patientSatisfactionScore: number
  
  // Operational Efficiency
  doctorUtilizationRate: number
  averageWaitTime: number
  consultationEfficiency: number
  noShowRate: number
  cancellationRate: number
  
  // Clinical Quality
  diagnosisAccuracyRate: number
  treatmentSuccessRate: number
  followUpComplianceRate: number
  prescriptionAdherenceRate: number
  
  // Business Intelligence
  peakHoursAnalysis: Array<{ hour: number; utilization: number }>
  seasonalTrends: Array<{ month: string; visits: number; revenue: number }>
  departmentPerformance: Array<{ department: string; efficiency: number; revenue: number }>
}

export interface PatientJourneyAnalytics {
  // Registration to First Visit
  avgTimeToFirstVisit: number
  registrationConversionRate: number
  
  // Visit Patterns
  visitFrequencyDistribution: Array<{ range: string; count: number }>
  avgTimeBetweenVisits: number
  
  // Treatment Outcomes
  treatmentCompletionRate: number
  followUpAdherence: number
  
  // Patient Segmentation
  highValuePatients: Array<{ 
    patientId: string
    name: string
    totalSpent: number
    visitCount: number
    lastVisit: string
  }>
  
  atRiskPatients: Array<{
    patientId: string
    name: string
    riskFactors: string[]
    lastVisit: string
  }>
}

export interface DoctorPerformanceMetrics {
  doctorId: string
  doctorName: string
  
  // Productivity
  totalVisits: number
  avgVisitsPerDay: number
  totalRevenue: number
  avgRevenuePerVisit: number
  
  // Quality Metrics
  patientSatisfactionScore: number
  averageConsultationTime: number
  followUpScheduledRate: number
  prescriptionAccuracyRate: number
  
  // Efficiency
  noShowRate: number
  cancellationRate: number
  onTimePerformance: number
  
  // Growth
  newPatientCount: number
  returnPatientRate: number
  referralRate: number
}

export interface OperationalInsights {
  // Capacity Analysis
  currentCapacityUtilization: number
  peakHours: Array<{ hour: number; utilization: number }>
  bottlenecks: Array<{ area: string; impact: string; suggestion: string }>
  
  // Resource Optimization
  staffEfficiency: Array<{ role: string; efficiency: number; workload: number }>
  equipmentUtilization: Array<{ equipment: string; usage: number; maintenance: string }>
  
  // Financial Health
  revenuePerSquareFoot: number
  costPerPatient: number
  profitMargins: { gross: number; net: number }
  
  // Growth Opportunities
  missedAppointmentRevenue: number
  expansionOpportunities: Array<{ area: string; potential: number }>
  serviceOptimization: Array<{ service: string; recommendation: string }>
}

class AdvancedAnalyticsService {
  private supabase = createClient()

  async getBusinessMetrics(tenantId: string, dateRange: { from: Date; to: Date }): Promise<BusinessMetrics> {
    // Get revenue data
    const { data: revenueData } = await this.supabase
      .from('patient_visits')
      .select('consultation_fee, consultation_fee_paid, visit_date, created_at')
      .eq('tenant_id', tenantId)
      .gte('visit_date', dateRange.from.toISOString().split('T')[0])
      .lte('visit_date', dateRange.to.toISOString().split('T')[0])

    // Get patient data
    const { data: patientData } = await this.supabase
      .from('patients')
      .select('id, created_at, registration_fee_paid')
      .eq('tenant_id', tenantId)

    // Calculate previous period for comparisons
    const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
    const previousPeriodStart = new Date(dateRange.from)
    previousPeriodStart.setDate(previousPeriodStart.getDate() - daysDiff)

    const { data: previousRevenueData } = await this.supabase
      .from('patient_visits')
      .select('consultation_fee, consultation_fee_paid')
      .eq('tenant_id', tenantId)
      .gte('visit_date', previousPeriodStart.toISOString().split('T')[0])
      .lt('visit_date', dateRange.from.toISOString().split('T')[0])

    // Calculate metrics
    const currentRevenue = (revenueData || [])
      .filter(v => v.consultation_fee_paid)
      .reduce((sum, v) => sum + (v.consultation_fee || 0), 0)

    const previousRevenue = (previousRevenueData || [])
      .filter(v => v.consultation_fee_paid)
      .reduce((sum, v) => sum + (v.consultation_fee || 0), 0)

    const revenueGrowthRate = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
      : 0

    const totalPatients = patientData?.length || 0
    const averageRevenuePerPatient = totalPatients > 0 ? currentRevenue / totalPatients : 0

    const totalVisits = revenueData?.length || 0
    const revenuePerVisit = totalVisits > 0 ? currentRevenue / totalVisits : 0

    const paidVisits = (revenueData || []).filter(v => v.consultation_fee_paid).length
    const paymentComplianceRate = totalVisits > 0 ? (paidVisits / totalVisits) * 100 : 0

    const outstandingAmount = (revenueData || [])
      .filter(v => !v.consultation_fee_paid)
      .reduce((sum, v) => sum + (v.consultation_fee || 0), 0)

    // Get peak hours data
    const peakHoursAnalysis = await this.calculatePeakHours(/* tenantId, dateRange */)

    return {
      revenueGrowthRate,
      averageRevenuePerPatient,
      revenuePerVisit,
      paymentComplianceRate,
      outstandingAmount,
      
      // Placeholder values - these would be calculated with more complex queries
      patientRetentionRate: 85,
      newPatientGrowthRate: 15,
      patientLifetimeValue: averageRevenuePerPatient * 5, // Estimated
      averageVisitsPerPatient: totalPatients > 0 ? totalVisits / totalPatients : 0,
      patientSatisfactionScore: 4.2,
      
      doctorUtilizationRate: 78,
      averageWaitTime: 15,
      consultationEfficiency: 92,
      noShowRate: 8,
      cancellationRate: 5,
      
      diagnosisAccuracyRate: 94,
      treatmentSuccessRate: 88,
      followUpComplianceRate: 76,
      prescriptionAdherenceRate: 82,
      
      peakHoursAnalysis,
      seasonalTrends: [],
      departmentPerformance: []
    }
  }

  async getPatientJourneyAnalytics(tenantId: string, dateRange: { from: Date; to: Date }): Promise<PatientJourneyAnalytics> {
    // Get patient visit patterns
    const { data: patientVisits } = await this.supabase
      .from('patient_visits')
      .select(`
        patient_id,
        visit_date,
        consultation_fee,
        consultation_fee_paid,
        patients(id, first_name, last_name, created_at)
      `)
      .eq('tenant_id', tenantId)
      .gte('visit_date', dateRange.from.toISOString().split('T')[0])
      .lte('visit_date', dateRange.to.toISOString().split('T')[0])
      .order('visit_date', { ascending: true })

    // Calculate patient journey metrics
    interface VisitData {
      patient_id: string
      visit_date: string
      consultation_fee: number | null
      consultation_fee_paid: boolean
      patients: { id: string; first_name: string; last_name: string; created_at: string }[]
    }
    
    const patientVisitMap = new Map<string, VisitData[]>()
    const patientSpendingMap = new Map<string, number>()

    patientVisits?.forEach(visit => {
      if (!patientVisitMap.has(visit.patient_id)) {
        patientVisitMap.set(visit.patient_id, [])
      }
      patientVisitMap.get(visit.patient_id)!.push(visit as VisitData)

      // Calculate spending
      if (visit.consultation_fee_paid) {
        const currentSpent = patientSpendingMap.get(visit.patient_id) || 0
        patientSpendingMap.set(visit.patient_id, currentSpent + (visit.consultation_fee || 0))
      }
    })

    // High value patients
    const highValuePatients = Array.from(patientSpendingMap.entries())
      .map(([patientId, totalSpent]) => {
        const visits = patientVisitMap.get(patientId) || []
        const lastVisit = visits[visits.length - 1]
        const patient = lastVisit?.patients?.[0] // Get first patient from array
        
        return {
          patientId,
          name: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown',
          totalSpent,
          visitCount: visits.length,
          lastVisit: lastVisit?.visit_date || ''
        }
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)

    // Visit frequency distribution
    const visitFrequencyDistribution = [
      { range: '1 visit', count: 0 },
      { range: '2-3 visits', count: 0 },
      { range: '4-6 visits', count: 0 },
      { range: '7+ visits', count: 0 }
    ]

    patientVisitMap.forEach(visits => {
      const visitCount = visits.length
      if (visitCount === 1) {
        visitFrequencyDistribution[0].count++
      } else if (visitCount <= 3) {
        visitFrequencyDistribution[1].count++
      } else if (visitCount <= 6) {
        visitFrequencyDistribution[2].count++
      } else {
        visitFrequencyDistribution[3].count++
      }
    })

    return {
      avgTimeToFirstVisit: 2.5, // days
      registrationConversionRate: 92,
      visitFrequencyDistribution,
      avgTimeBetweenVisits: 21, // days
      treatmentCompletionRate: 84,
      followUpAdherence: 76,
      highValuePatients,
      atRiskPatients: [] // Would require more complex risk calculation
    }
  }

  static async getDoctorPerformanceMetrics(tenantId: string): Promise<DoctorPerformanceMetrics[]> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('visits')
        .select(`
          *,
          patients(name, phone),
          users(name)
        `)
        .eq('tenant_id', tenantId)
        .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())

      if (error) throw error

      // Group by doctor and calculate metrics
      const doctorStats = new Map()
      
      data?.forEach((visit: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const doctorId = visit.doctor_id
        const doctorName = visit.users?.name || 'Unknown Doctor'
        
        if (!doctorStats.has(doctorId)) {
          doctorStats.set(doctorId, {
            doctorId,
            doctorName,
            totalVisits: 0,
            totalPatients: new Set(),
            totalRevenue: 0,
            averageVisitDuration: 0,
            patientSatisfaction: 0,
            followUpRate: 0
          })
        }
        
        const stats = doctorStats.get(doctorId)
        stats.totalVisits++
        stats.totalPatients.add(visit.patient_id)
        stats.totalRevenue += visit.amount || 0
      })
      
      return Array.from(doctorStats.values()).map(stats => ({
        ...stats,
        totalPatients: stats.totalPatients.size,
        averageVisitDuration: 45, // Mock data
        patientSatisfaction: 4.2 + Math.random() * 0.6,
        followUpRate: 0.7 + Math.random() * 0.2
      }))
      
    } catch (error) {
      console.error('Error fetching doctor performance metrics:', error)
      return []
    }
  }

  static async getPatientRiskAnalysis(tenantId: string) {
    try {
      const supabase = createClient()
      // Get all patients with their visit history
      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select(`
          id,
          name,
          phone,
          visits (
            id,
            date,
            amount
          )
        `)
        .eq('tenant_id', tenantId)

      if (patientsError) throw patientsError

      const riskPatients = []
      const currentDate = new Date()

      for (const patient of patients || []) {
        const visits = patient.visits || []
        
        if (visits.length === 0) continue

        // Find most recent visit
        const sortedVisits = visits.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()) // eslint-disable-line @typescript-eslint/no-explicit-any
        const lastVisit = sortedVisits[0]
        const daysSinceLastVisit = Math.floor((currentDate.getTime() - new Date(lastVisit.date).getTime()) / (1000 * 60 * 60 * 24))

        // Calculate risk factors
        const riskFactors = []
        let riskScore = 0

        // Days since last visit risk
        if (daysSinceLastVisit > 90) {
          riskFactors.push('No visit in 90+ days')
          riskScore += 40
        } else if (daysSinceLastVisit > 60) {
          riskFactors.push('No visit in 60+ days')
          riskScore += 25
        } else if (daysSinceLastVisit > 30) {
          riskFactors.push('No visit in 30+ days')
          riskScore += 15
        }

        // Visit frequency risk
        if (visits.length < 2) {
          riskFactors.push('Only one visit')
          riskScore += 20
        } else if (visits.length < 3) {
          riskFactors.push('Low visit frequency')
          riskScore += 10
        }

        // Missed appointments (simulated)
        if (Math.random() > 0.7) {
          riskFactors.push('Missed appointment')
          riskScore += 15
        }

        // Payment history (simulated)
        if (Math.random() > 0.8) {
          riskFactors.push('Payment delays')
          riskScore += 10
        }

        // Only include patients with some risk
        if (riskScore > 0) {
          riskPatients.push({
            patientId: patient.id,
            name: patient.name,
            phone: patient.phone || 'N/A',
            lastVisit: lastVisit.date,
            daysSinceLastVisit,
            riskFactors,
            riskScore: Math.min(riskScore, 100) // Cap at 100
          })
        }
      }

      // Sort by risk score descending
      return riskPatients.sort((a, b) => b.riskScore - a.riskScore)
      
    } catch (error) {
      console.error('Error fetching patient risk analysis:', error)
      return []
    }
  }

  async getOperationalInsights(tenantId: string, dateRange: { from: Date; to: Date }): Promise<OperationalInsights> {
    const peakHours = await this.calculatePeakHours(/* tenantId, dateRange */)
    
    // Calculate current capacity utilization (simplified)
    const totalPossibleSlots = 8 * 6 * Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) // 8 hours, 6 slots per hour
    const { data: actualVisits } = await this.supabase
      .from('patient_visits')
      .select('id')
      .eq('tenant_id', tenantId)
      .gte('visit_date', dateRange.from.toISOString().split('T')[0])
      .lte('visit_date', dateRange.to.toISOString().split('T')[0])

    const currentCapacityUtilization = totalPossibleSlots > 0 
      ? ((actualVisits?.length || 0) / totalPossibleSlots) * 100 
      : 0

    return {
      currentCapacityUtilization,
      peakHours,
      bottlenecks: [
        { area: 'Reception', impact: 'Medium', suggestion: 'Implement digital check-in system' },
        { area: 'Waiting Room', impact: 'Low', suggestion: 'Optimize seating arrangement' }
      ],
      staffEfficiency: [
        { role: 'Doctor', efficiency: 85, workload: 92 },
        { role: 'Receptionist', efficiency: 78, workload: 85 }
      ],
      equipmentUtilization: [],
      revenuePerSquareFoot: 1250,
      costPerPatient: 45,
      profitMargins: { gross: 65, net: 28 },
      missedAppointmentRevenue: 2340,
      expansionOpportunities: [
        { area: 'Telemedicine', potential: 25000 },
        { area: 'Specialty Consultations', potential: 18000 }
      ],
      serviceOptimization: [
        { service: 'Follow-up Calls', recommendation: 'Automate reminder system' },
        { service: 'Prescription Refills', recommendation: 'Implement digital prescriptions' }
      ]
    }
  }

  private async calculatePeakHours(/* _tenantId: string, _dateRange: { from: Date; to: Date } */) {
    // This would typically extract hour from visit_time, but for now we'll simulate
    const mockPeakHours = [
      { hour: 9, utilization: 45 },
      { hour: 10, utilization: 78 },
      { hour: 11, utilization: 92 },
      { hour: 12, utilization: 85 },
      { hour: 13, utilization: 55 },
      { hour: 14, utilization: 88 },
      { hour: 15, utilization: 95 },
      { hour: 16, utilization: 82 },
      { hour: 17, utilization: 68 },
      { hour: 18, utilization: 35 }
    ]

    return mockPeakHours
  }

  // Additional analytics methods
  async getRevenueForecasting(tenantId: string, months: number = 6) {
    // Get historical revenue data
    const { data: historicalData } = await this.supabase
      .from('patient_visits')
      .select('consultation_fee, consultation_fee_paid, visit_date')
      .eq('tenant_id', tenantId)
      .eq('consultation_fee_paid', true)
      .gte('visit_date', new Date(Date.now() - (365 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]) // Last year
      .order('visit_date', { ascending: true })

    // Simple linear regression for forecasting
    const monthlyRevenue = new Map<string, number>()
    historicalData?.forEach(visit => {
      const month = visit.visit_date.substring(0, 7) // YYYY-MM
      const current = monthlyRevenue.get(month) || 0
      monthlyRevenue.set(month, current + (visit.consultation_fee || 0))
    })

    // Calculate trend and forecast (simplified)
    const revenueArray = Array.from(monthlyRevenue.values())
    const avgGrowthRate = revenueArray.length > 1 
      ? (revenueArray[revenueArray.length - 1] - revenueArray[0]) / revenueArray.length 
      : 0

    const lastRevenue = revenueArray[revenueArray.length - 1] || 0
    const forecast = []
    
    for (let i = 1; i <= months; i++) {
      const futureDate = new Date()
      futureDate.setMonth(futureDate.getMonth() + i)
      const projectedRevenue = lastRevenue + (avgGrowthRate * i)
      
      forecast.push({
        month: futureDate.toISOString().substring(0, 7),
        projectedRevenue: Math.max(projectedRevenue, 0),
        confidence: Math.max(90 - (i * 10), 50) // Decreasing confidence over time
      })
    }

    return forecast
  }

  async getPatientRiskAnalysis(tenantId: string) {
    // Analyze patients at risk of churning
    const { data: patientVisits } = await this.supabase
      .from('patient_visits')
      .select(`
        patient_id,
        visit_date,
        follow_up_date,
        patients(id, first_name, last_name, phone)
      `)
      .eq('tenant_id', tenantId)
      .order('visit_date', { ascending: false })

    // interface PatientVisitData {
    //   patient_id: string
    //   visit_date: string
    //   follow_up_date: string | null
    //   patients: { id: string; first_name: string; last_name: string; phone: string }
    // }

    const patientLastVisit = new Map<string, unknown>()
    patientVisits?.forEach(visit => {
      if (!patientLastVisit.has(visit.patient_id)) {
        patientLastVisit.set(visit.patient_id, visit)
      }
    })

    interface AtRiskPatient {
      patientId: string
      name: string
      phone: string
      lastVisit: string
      daysSinceLastVisit: number
      riskFactors: string[]
      riskScore: number
    }

    const atRiskPatients: AtRiskPatient[] = []
    const currentDate = new Date()
    
    patientLastVisit.forEach(visit => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = visit as any // Complex nested Supabase data structure
      const lastVisitDate = new Date(v.visit_date)
      const daysSinceLastVisit = Math.floor((currentDate.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24))
      
      const riskFactors = []
      if (daysSinceLastVisit > 90) riskFactors.push('Long time since last visit')
      if (v.follow_up_date && new Date(v.follow_up_date) < currentDate) {
        riskFactors.push('Missed follow-up appointment')
      }
      
      if (riskFactors.length > 0) {
        const patient = Array.isArray(v.patients) ? v.patients[0] : v.patients
        atRiskPatients.push({
          patientId: v.patient_id,
          name: `${patient.first_name} ${patient.last_name}`,
          phone: patient.phone,
          lastVisit: v.visit_date,
          daysSinceLastVisit,
          riskFactors,
          riskScore: Math.min(daysSinceLastVisit / 30 * 100, 100) // Simple risk scoring
        })
      }
    })

    return atRiskPatients.sort((a, b) => b.riskScore - a.riskScore)
  }
}

export const advancedAnalyticsService = new AdvancedAnalyticsService()
export { AdvancedAnalyticsService }
