import jsPDF from 'jspdf'
import type { PatientVisit } from '@/types/patient'
import type { Prescription } from '@/types/prescription'

interface PrescriptionPDFData {
  visit: PatientVisit
  prescriptions: Prescription[]
  doctorInfo: {
    name: string
    registration: string
    hospital: string
    address: string
    phone: string
    timing: string
  }
}

export class PrescriptionPDFGenerator {
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

  private addText(text: string, x: number, y: number, options?: { size?: number; style?: 'normal' | 'bold'; align?: 'left' | 'center' | 'right' }) {
    const { size = 10, style = 'normal', align = 'left' } = options || {}
    
    this.pdf.setFontSize(size)
    this.pdf.setFont('helvetica', style)
    
    if (align === 'center') {
      x = this.pageWidth / 2
    } else if (align === 'right') {
      x = this.pageWidth - this.margin
    }
    
    this.pdf.text(text, x, y, { align })
  }

  private addLine(x1: number, y1: number, x2: number, y2: number) {
    this.pdf.line(x1, y1, x2, y2)
  }

  private formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  private formatPrescription(prescription: Prescription): string {
    const timingText = prescription.timing.join(', ')
    const foodTiming = prescription.food_timing.replace('_', ' ')
    return `${prescription.dosage_amount}${prescription.dosage_unit} - ${prescription.frequency_times}x daily (${timingText}) - ${foodTiming} - ${prescription.duration_days} days`
  }

  generatePrescription(data: PrescriptionPDFData): void {
    // Header with medical symbol and hospital info
    this.addText('⚕️', this.margin, this.currentY + 5, { size: 16 })
    this.addText(data.doctorInfo.hospital, this.margin + 10, this.currentY + 5, { size: 14, style: 'bold' })
    this.addText(`Date: ${this.formatDate(data.visit.visit_date)}`, this.pageWidth - this.margin, this.currentY + 5, { align: 'right' })
    
    this.currentY += 10
    this.addText(data.doctorInfo.address, this.margin + 10, this.currentY, { size: 10 })
    this.currentY += 5
    this.addText(`Ph. ${data.doctorInfo.phone}, Timing: ${data.doctorInfo.timing}`, this.margin + 10, this.currentY, { size: 10 })
    this.addText('Closed: Sunday', this.margin + 10, this.currentY + 5, { size: 10 })
    
    this.currentY += 15
    this.addLine(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY)
    this.currentY += 10

    // Doctor info
    this.addText(`Dr. ${data.doctorInfo.name}`, this.margin, this.currentY, { size: 12, style: 'bold' })
    this.currentY += 5
    this.addText(data.doctorInfo.registration, this.margin, this.currentY, { size: 10 })
    this.currentY += 15

    // Patient info
    this.addText(`ID: ${data.visit.visit_number} - OPDS PATIENT (M) / ${data.visit.patient?.age || 'N/A'} Y`, this.margin, this.currentY, { size: 10, style: 'bold' })
    this.addText(`Mob. No.: ${data.visit.patient?.phone || ''}`, this.pageWidth - this.margin, this.currentY, { align: 'right', size: 10 })
    this.currentY += 5
    
    const patientName = `${data.visit.patient?.first_name || ''} ${data.visit.patient?.last_name || ''}`.trim()
    this.addText(`Name: ${patientName}`, this.margin, this.currentY, { size: 10 })
    this.currentY += 5
    this.addText('Address: PUNE', this.margin, this.currentY, { size: 10 })
    this.currentY += 10

    // Chief Complaints
    if (data.visit.chief_complaints) {
      this.addText('Chief Complaints', this.margin, this.currentY, { size: 11, style: 'bold' })
      this.currentY += 5
      this.addText(`* ${data.visit.chief_complaints}`, this.margin, this.currentY, { size: 10 })
      this.currentY += 10
    }

    // Clinical Findings
    this.addText('Clinical Findings', this.margin, this.currentY, { size: 11, style: 'bold' })
    this.currentY += 5
    if (data.visit.physical_examination) {
      this.addText(`* ${data.visit.physical_examination}`, this.margin, this.currentY, { size: 10 })
      this.currentY += 5
    }
    this.addText('* THESE ARE TEST FINDINGS FOR A TEST PATIENT', this.margin, this.currentY, { size: 10 })
    this.addText('* ENTERING SAMPLE DIAGNOSIS AND SAMPLE', this.margin, this.currentY + 5, { size: 10 })
    this.addText('PRESCRIPTION', this.margin + 5, this.currentY + 10, { size: 10 })
    this.currentY += 20

    // Diagnosis
    if (data.visit.diagnosis) {
      this.addText('Diagnosis:', this.margin, this.currentY, { size: 11, style: 'bold' })
      this.currentY += 5
      this.addText(`* ${data.visit.diagnosis}`, this.margin, this.currentY, { size: 10 })
      this.currentY += 10
    }

    // Prescriptions Table
    if (data.prescriptions.length > 0) {
      this.addText('R', this.margin, this.currentY, { size: 12, style: 'bold' })
      this.currentY += 10

      // Table headers
      this.addLine(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY)
      this.currentY += 5
      this.addText('Medicine Name', this.margin + 5, this.currentY, { size: 10, style: 'bold' })
      this.addText('Dosage', this.margin + 70, this.currentY, { size: 10, style: 'bold' })
      this.addText('Duration', this.margin + 120, this.currentY, { size: 10, style: 'bold' })
      this.currentY += 5
      this.addLine(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY)
      this.currentY += 8

      // Prescription entries
      data.prescriptions.forEach((prescription, index) => {
        this.addText(`${index + 1}) ${prescription.medicine_name}`, this.margin + 5, this.currentY, { size: 10 })
        this.addText(`${prescription.dosage_amount}${prescription.dosage_unit}`, this.margin + 70, this.currentY, { size: 10 })
        
        const timingText = prescription.timing.join(', ')
        const duration = `${prescription.frequency_times}x daily (${timingText})`
        this.addText(duration, this.margin + 120, this.currentY, { size: 10 })
        this.currentY += 8

        // Additional details
        const foodTiming = prescription.food_timing.replace('_', ' ')
        this.addText(`${foodTiming} - ${prescription.duration_days} days`, this.margin + 15, this.currentY, { size: 9 })
        this.currentY += 5

        if (prescription.instructions) {
          this.addText(`Note: ${prescription.instructions}`, this.margin + 15, this.currentY, { size: 9 })
          this.currentY += 5
        }

        this.addText(`Total: ${prescription.total_quantity} ${prescription.dosage_unit}`, this.margin + 15, this.currentY, { size: 9 })
        this.currentY += 10
      })

      this.addLine(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY)
      this.currentY += 10
    }

    // Advice
    if (data.visit.general_advice) {
      this.addText('Advice:', this.margin, this.currentY, { size: 11, style: 'bold' })
      this.currentY += 5
      const adviceLines = data.visit.general_advice.split('\n')
      adviceLines.forEach(line => {
        if (line.trim()) {
          this.addText(`* ${line.trim()}`, this.margin, this.currentY, { size: 10 })
          this.currentY += 5
        }
      })
      this.currentY += 5
    }

    // Follow Up
    if (data.visit.follow_up_date) {
      this.addText(`Follow Up: ${this.formatDate(data.visit.follow_up_date)}`, this.margin, this.currentY, { size: 11, style: 'bold' })
      this.currentY += 10
    }

    // Footer
    this.currentY = this.pageHeight - 30
    this.addLine(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY)
    this.currentY += 5
    this.addText('Substitute with equivalent Generics as required.', this.pageWidth / 2, this.currentY, { size: 9, align: 'center' })
  }

  download(filename: string): void {
    this.pdf.save(filename)
  }

  getBlob(): Blob {
    return this.pdf.output('blob')
  }
}

export const generatePrescriptionPDF = (data: PrescriptionPDFData): PrescriptionPDFGenerator => {
  const generator = new PrescriptionPDFGenerator()
  generator.generatePrescription(data)
  return generator
}
