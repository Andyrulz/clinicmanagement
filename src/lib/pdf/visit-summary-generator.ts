import jsPDF from 'jspdf'
import type { PatientVisit, PatientVitals } from '@/types/patient'
import type { Prescription } from '@/types/prescription'
import type { Tenant } from '@/types/tenant'

interface VisitSummaryPDFData {
  visit: PatientVisit
  vitals: PatientVitals[]
  prescriptions: Prescription[]
  tenant: Tenant
  doctorInfo: {
    name: string
    registration?: string
    email?: string
  }
}

export class VisitSummaryPDFGenerator {
  private pdf: jsPDF
  private pageWidth: number
  private pageHeight: number
  private margin: number
  private currentY: number

  constructor() {
    this.pdf = new jsPDF('p', 'mm', 'a4')
    this.pageWidth = this.pdf.internal.pageSize.getWidth()
    this.pageHeight = this.pdf.internal.pageSize.getHeight()
    this.margin = 20
    this.currentY = this.margin
  }

  private addText(text: string, x: number, y: number, options?: { 
    size?: number
    style?: 'normal' | 'bold'
    align?: 'left' | 'center' | 'right'
    maxWidth?: number
  }) {
    const { size = 10, style = 'normal', align = 'left', maxWidth } = options || {}
    
    this.pdf.setFontSize(size)
    this.pdf.setFont('helvetica', style)
    
    if (align === 'center') {
      x = this.pageWidth / 2
    } else if (align === 'right') {
      x = this.pageWidth - this.margin
    }
    
    if (maxWidth) {
      const lines = this.pdf.splitTextToSize(text, maxWidth)
      this.pdf.text(lines, x, y, { align })
      return lines.length * (size * 0.35) // Return height used
    } else {
      this.pdf.text(text, x, y, { align })
      return size * 0.35 // Return height used
    }
  }

  private addLine(x1: number, y1: number, x2: number, y2: number) {
    this.pdf.line(x1, y1, x2, y2)
  }

  private addRectangle(x: number, y: number, width: number, height: number, fill = false) {
    if (fill) {
      this.pdf.rect(x, y, width, height, 'F')
    } else {
      this.pdf.rect(x, y, width, height)
    }
  }

  private formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  private formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  private formatTime(timeString: string): string {
    const [hours, minutes] = timeString.split(':')
    const hour12 = parseInt(hours) % 12 || 12
    const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM'
    return `${hour12}:${minutes} ${ampm}`
  }

  private checkPageBreak(additionalHeight: number): void {
    if (this.currentY + additionalHeight > this.pageHeight - this.margin) {
      this.pdf.addPage()
      this.currentY = this.margin
    }
  }

  private addSection(title: string, content: () => void): void {
    this.checkPageBreak(15)
    this.addText(title, this.margin, this.currentY, { size: 12, style: 'bold' })
    this.currentY += 8
    this.addLine(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY)
    this.currentY += 8
    content()
    this.currentY += 10
  }

  generateVisitSummary(data: VisitSummaryPDFData): void {
    // Header
    this.addHeader(data)
    
    // Patient Information
    this.addPatientInfo(data.visit)
    
    // Visit Details
    this.addVisitDetails(data.visit)
    
    // Vitals (if available)
    if (data.vitals.length > 0) {
      this.addVitalsSection(data.vitals[0]) // Most recent vitals
    }
    
    // Clinical Documentation
    this.addClinicalDocumentation(data.visit)
    
    // Prescriptions (if available)
    if (data.prescriptions.length > 0) {
      this.addPrescriptionsSection(data.prescriptions)
    }
    
    // Footer
    this.addFooter(data)
  }

  private addHeader(data: VisitSummaryPDFData): void {
    // Clinic/Hospital header with tenant information
    this.pdf.setFillColor(240, 248, 255) // Light blue background
    this.addRectangle(this.margin, this.currentY, this.pageWidth - (2 * this.margin), 25, true)
    
    this.currentY += 8
    this.addText('🏥', this.margin + 5, this.currentY, { size: 16 })
    this.addText(data.tenant.name, this.margin + 15, this.currentY, { size: 16, style: 'bold' })
    this.addText(`Date: ${this.formatDate(new Date().toISOString())}`, this.pageWidth - this.margin - 5, this.currentY, { align: 'right', size: 10 })
    
    this.currentY += 6
    // Format tenant address
    const address = data.tenant.address
    const addressLine = address ? 
      [address.street, address.city, address.state, address.postal_code].filter(Boolean).join(', ') : 
      'Address not available'
    this.addText(addressLine, this.margin + 15, this.currentY, { size: 10 })
    
    this.currentY += 4
    const contactInfo = [
      data.tenant.phone ? `Phone: ${data.tenant.phone}` : '',
      data.tenant.email ? `Email: ${data.tenant.email}` : ''
    ].filter(Boolean).join(' | ')
    
    if (contactInfo) {
      this.addText(contactInfo, this.margin + 15, this.currentY, { size: 10 })
    }
    
    this.currentY += 15
    
    // Document title
    this.addText('VISIT SUMMARY REPORT', this.pageWidth / 2, this.currentY, { size: 14, style: 'bold', align: 'center' })
    this.currentY += 15
  }

  private addPatientInfo(visit: PatientVisit): void {
    this.addSection('PATIENT INFORMATION', () => {
      const patientName = `${visit.patient?.first_name || ''} ${visit.patient?.last_name || ''}`.trim()
      
      this.addText(`Name: ${patientName}`, this.margin, this.currentY, { style: 'bold' })
      this.addText(`UHID: ${visit.patient?.uhid || 'N/A'}`, this.pageWidth - this.margin, this.currentY, { align: 'right' })
      this.currentY += 6
      
      this.addText(`Phone: ${visit.patient?.phone || 'N/A'}`, this.margin, this.currentY)
      this.addText(`Age: ${visit.patient?.age || 'N/A'} years`, this.pageWidth - this.margin, this.currentY, { align: 'right' })
      this.currentY += 6
      
      if (visit.patient?.email) {
        this.addText(`Email: ${visit.patient.email}`, this.margin, this.currentY)
        this.currentY += 6
      }
    })
  }

  private addVisitDetails(visit: PatientVisit): void {
    this.addSection('VISIT INFORMATION', () => {
      this.addText(`Visit Number: #${visit.visit_number}`, this.margin, this.currentY, { style: 'bold' })
      this.addText(`Status: ${visit.status.toUpperCase()}`, this.pageWidth - this.margin, this.currentY, { align: 'right', style: 'bold' })
      this.currentY += 6
      
      this.addText(`Date: ${this.formatDate(visit.visit_date)}`, this.margin, this.currentY)
      this.addText(`Time: ${this.formatTime(visit.visit_time)}`, this.pageWidth - this.margin, this.currentY, { align: 'right' })
      this.currentY += 6
      
      this.addText(`Doctor: Dr. ${visit.doctor?.full_name || 'N/A'}`, this.margin, this.currentY)
      this.addText(`Type: ${visit.visit_type === 'new' ? 'New Visit' : 'Follow-up'}`, this.pageWidth - this.margin, this.currentY, { align: 'right' })
      this.currentY += 6
      
      this.addText(`Consultation Fee: ₹${visit.consultation_fee}`, this.margin, this.currentY)
      this.addText(`Payment: ${visit.consultation_fee_paid ? 'PAID' : 'PENDING'}`, this.pageWidth - this.margin, this.currentY, { align: 'right' })
      this.currentY += 6
      
      if (visit.chief_complaints) {
        this.addText('Chief Complaints:', this.margin, this.currentY, { style: 'bold' })
        this.currentY += 5
        const height = this.addText(visit.chief_complaints, this.margin, this.currentY, { maxWidth: this.pageWidth - (2 * this.margin) })
        this.currentY += height
      }
    })
  }

  private addVitalsSection(vitals: PatientVitals): void {
    this.addSection('VITAL SIGNS', () => {
      this.addText(`Recorded: ${this.formatDateTime(vitals.recorded_at)}`, this.margin, this.currentY, { size: 9 })
      this.currentY += 8
      
      // Create a grid layout for vitals
      const col1X = this.margin
      const col2X = this.margin + 60
      const col3X = this.margin + 120
      
      if (vitals.height_cm && vitals.weight_kg) {
        this.addText(`Height: ${vitals.height_cm} cm`, col1X, this.currentY)
        this.addText(`Weight: ${vitals.weight_kg} kg`, col2X, this.currentY)
        if (vitals.bmi) {
          this.addText(`BMI: ${vitals.bmi}`, col3X, this.currentY)
        }
        this.currentY += 6
      }
      
      if (vitals.pulse_rate) {
        this.addText(`Pulse: ${vitals.pulse_rate} bpm`, col1X, this.currentY)
      }
      if (vitals.respiratory_rate) {
        this.addText(`Resp. Rate: ${vitals.respiratory_rate} /min`, col2X, this.currentY)
      }
      if (vitals.spo2) {
        this.addText(`SpO2: ${vitals.spo2}%`, col3X, this.currentY)
      }
      this.currentY += 6
      
      if (vitals.blood_pressure_systolic && vitals.blood_pressure_diastolic) {
        this.addText(`Blood Pressure: ${vitals.blood_pressure_systolic}/${vitals.blood_pressure_diastolic} mmHg`, col1X, this.currentY)
      }
      if (vitals.temperature_celsius) {
        this.addText(`Temperature: ${vitals.temperature_celsius}°C`, col2X, this.currentY)
      }
      if (vitals.blood_glucose) {
        this.addText(`Blood Glucose: ${vitals.blood_glucose} mg/dL`, col3X, this.currentY)
      }
      this.currentY += 6
      
      if (vitals.notes) {
        this.addText('Notes:', this.margin, this.currentY, { style: 'bold' })
        this.currentY += 5
        const height = this.addText(vitals.notes, this.margin, this.currentY, { maxWidth: this.pageWidth - (2 * this.margin) })
        this.currentY += height
      }
    })
  }

  private addClinicalDocumentation(visit: PatientVisit): void {
    let hasContent = false
    
    this.addSection('CLINICAL DOCUMENTATION', () => {
      if (visit.history_of_present_illness) {
        this.addText('History of Present Illness:', this.margin, this.currentY, { style: 'bold' })
        this.currentY += 5
        const height = this.addText(visit.history_of_present_illness, this.margin, this.currentY, { maxWidth: this.pageWidth - (2 * this.margin) })
        this.currentY += height + 5
        hasContent = true
      }
      
      if (visit.physical_examination) {
        this.addText('Physical Examination:', this.margin, this.currentY, { style: 'bold' })
        this.currentY += 5
        const height = this.addText(visit.physical_examination, this.margin, this.currentY, { maxWidth: this.pageWidth - (2 * this.margin) })
        this.currentY += height + 5
        hasContent = true
      }
      
      if (visit.diagnosis) {
        this.addText('Diagnosis:', this.margin, this.currentY, { style: 'bold' })
        this.currentY += 5
        const height = this.addText(visit.diagnosis, this.margin, this.currentY, { maxWidth: this.pageWidth - (2 * this.margin) })
        this.currentY += height + 5
        hasContent = true
      }
      
      if (visit.treatment_plan) {
        this.addText('Treatment Plan:', this.margin, this.currentY, { style: 'bold' })
        this.currentY += 5
        const height = this.addText(visit.treatment_plan, this.margin, this.currentY, { maxWidth: this.pageWidth - (2 * this.margin) })
        this.currentY += height + 5
        hasContent = true
      }
      
      if (visit.general_advice) {
        this.addText('General Advice:', this.margin, this.currentY, { style: 'bold' })
        this.currentY += 5
        const height = this.addText(visit.general_advice, this.margin, this.currentY, { maxWidth: this.pageWidth - (2 * this.margin) })
        this.currentY += height + 5
        hasContent = true
      }
      
      if (visit.follow_up_date) {
        this.addText(`Follow-up Date: ${this.formatDate(visit.follow_up_date)}`, this.margin, this.currentY, { style: 'bold' })
        this.currentY += 5
        hasContent = true
      }
      
      if (!hasContent) {
        this.addText('No clinical documentation available.', this.margin, this.currentY, { style: 'normal' })
        this.currentY += 5
      }
    })
  }

  private addPrescriptionsSection(prescriptions: Prescription[]): void {
    this.addSection('PRESCRIBED MEDICATIONS', () => {
      prescriptions.forEach((prescription, index) => {
        this.checkPageBreak(15)
        
        this.addText(`${index + 1}. ${prescription.medicine_name}`, this.margin, this.currentY, { style: 'bold' })
        this.currentY += 5
        
        const dosageInfo = `${prescription.dosage_amount}${prescription.dosage_unit} - ${prescription.frequency_times}x daily`
        const timingInfo = `${prescription.timing.join(', ')} - ${prescription.food_timing.replace('_', ' ')}`
        const durationInfo = `Duration: ${prescription.duration_days} days`
        const totalQty = `Total: ${prescription.total_quantity} ${prescription.dosage_unit}`
        
        this.addText(dosageInfo, this.margin + 5, this.currentY)
        this.currentY += 4
        this.addText(timingInfo, this.margin + 5, this.currentY)
        this.currentY += 4
        this.addText(`${durationInfo} | ${totalQty}`, this.margin + 5, this.currentY)
        this.currentY += 4
        
        if (prescription.instructions) {
          this.addText(`Instructions: ${prescription.instructions}`, this.margin + 5, this.currentY, { maxWidth: this.pageWidth - (2 * this.margin) - 5 })
          this.currentY += 4
        }
        
        this.currentY += 3
      })
    })
  }

  private addFooter(data: VisitSummaryPDFData): void {
    const footerY = this.pageHeight - this.margin - 10
    
    this.addLine(this.margin, footerY, this.pageWidth - this.margin, footerY)
    this.addText(`Dr. ${data.doctorInfo.name}`, this.margin, footerY + 5, { size: 10, style: 'bold' })
    if (data.doctorInfo.registration) {
      this.addText(data.doctorInfo.registration, this.margin, footerY + 9, { size: 8 })
    }
    
    this.addText(`Generated on: ${new Date().toLocaleString()}`, this.pageWidth - this.margin, footerY + 5, { align: 'right', size: 8 })
    this.addText('This is a computer-generated document', this.pageWidth - this.margin, footerY + 9, { align: 'right', size: 8 })
  }

  download(filename: string): void {
    this.pdf.save(filename)
  }

  getBlob(): Blob {
    return this.pdf.output('blob')
  }
}

export function generateVisitSummaryPDF(data: VisitSummaryPDFData): VisitSummaryPDFGenerator {
  const generator = new VisitSummaryPDFGenerator()
  generator.generateVisitSummary(data)
  return generator
}
