// Appointment Service Types
// Types and interfaces for the appointment scheduling system
// Integrates with existing doctor-availability and patient-visit systems
// Date: August 2, 2025

// =================================================================
// APPOINTMENT CORE TYPES
// =================================================================

export interface Appointment {
  id: string;
  tenant_id: string;
  
  // Patient and Doctor References
  patient_id: string;
  doctor_id: string;
  
  // Appointment Scheduling
  appointment_date: string; // ISO date
  appointment_time: string; // HH:MM format
  duration_minutes: number; // 15, 30, 45, 60
  
  // Appointment Details
  chief_complaint?: string;
  appointment_type: 'consultation' | 'follow_up' | 'emergency' | 'procedure';
  appointment_source: 'manual' | 'online' | 'whatsapp' | 'phone' | 'patient_portal';
  
  // Status Management
  status: 'scheduled' | 'confirmed' | 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  priority: 'normal' | 'urgent' | 'emergency';
  
  // Integration References
  visit_id?: string; // Links to patient_visits table
  slot_id?: string; // Links to appointment_slots table
  
  // Reminder System
  reminder_24h_sent: boolean;
  reminder_2h_sent: boolean;
  reminder_30min_sent: boolean;
  
  // Fees and Billing
  consultation_fee?: number;
  paid_amount?: number;
  payment_status: 'pending' | 'paid' | 'partial' | 'waived';
  
  // Additional Information
  notes?: string;
  special_instructions?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
}

// =================================================================
// EXTENDED TYPES WITH RELATIONS
// =================================================================

export interface AppointmentWithDetails extends Appointment {
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    uhid: string;
    phone: string;
    email?: string;
    age?: number;
    gender?: string;
  };
  doctor: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    specialization?: string;
  };
  visit?: {
    id: string;
    visit_number: string;
    status: string;
  };
}

export interface AppointmentSlot {
  id: string;
  tenant_id: string;
  doctor_id: string;
  
  // Slot Timing
  slot_date: string; // ISO date
  slot_time: string; // HH:MM format
  duration_minutes: number;
  
  // Availability Status
  is_available: boolean;
  is_booked: boolean;
  is_blocked: boolean; // Admin can block slots
  
  // Booking Details
  patient_id?: string;
  visit_id?: string;
  appointment_id?: string;
  
  // Metadata
  booking_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentSlotWithDetails extends AppointmentSlot {
  doctor: {
    id: string;
    full_name: string;
    specialization?: string;
  };
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
  };
  appointment?: {
    id: string;
    status: string;
    chief_complaint?: string;
  };
}

// =================================================================
// CALENDAR AND UI TYPES
// =================================================================

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  
  // Event Classification
  type: 'appointment' | 'available' | 'blocked' | 'break';
  status: 'scheduled' | 'confirmed' | 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  
  // Styling
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  
  // Event Data
  appointmentId?: string;
  patientId?: string;
  doctorId: string;
  slotId?: string;
  
  // Display Information
  patientName?: string;
  doctorName: string;
  phone?: string;
  chiefComplaint?: string;
  
  // Interaction
  clickable: boolean;
  editable: boolean;
}

export interface CalendarViewSettings {
  view: 'day' | 'week' | 'month';
  selectedDate: Date;
  selectedDoctors: string[]; // Empty = all doctors
  showAppointments: boolean;
  showAvailability: boolean;
  showBlocked: boolean;
  timeMin: string; // HH:MM
  timeMax: string; // HH:MM
}

export interface CalendarFilter {
  doctorIds?: string[];
  status?: string[];
  appointmentType?: string[];
  dateRange: {
    start: string;
    end: string;
  };
  searchTerm?: string;
}

// =================================================================
// API REQUEST TYPES
// =================================================================

export interface CreateAppointmentRequest {
  patient_id: string;
  doctor_id: string;
  appointment_date: string; // ISO date
  appointment_time: string; // HH:MM
  duration_minutes?: number; // Default 30
  chief_complaint?: string;
  appointment_type?: 'consultation' | 'follow_up' | 'emergency' | 'procedure';
  appointment_source?: 'manual' | 'online' | 'whatsapp' | 'phone' | 'patient_portal';
  priority?: 'normal' | 'urgent' | 'emergency';
  notes?: string;
  special_instructions?: string;
  consultation_fee?: number;
}

export interface UpdateAppointmentRequest extends Partial<CreateAppointmentRequest> {
  id: string;
  status?: 'scheduled' | 'confirmed' | 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  payment_status?: 'pending' | 'paid' | 'partial' | 'waived';
  paid_amount?: number;
}

export interface RescheduleAppointmentRequest {
  appointment_id: string;
  new_date: string; // ISO date
  new_time: string; // HH:MM
  reason?: string;
}

export interface CancelAppointmentRequest {
  appointment_id: string;
  reason: string;
  cancelled_by: 'patient' | 'doctor' | 'admin';
  refund_amount?: number;
}

export interface BookSlotRequest {
  slot_id: string;
  patient_id: string;
  appointment_details: Omit<CreateAppointmentRequest, 'patient_id' | 'doctor_id' | 'appointment_date' | 'appointment_time'>;
}

export interface GetAppointmentsRequest {
  doctor_id?: string;
  patient_id?: string;
  start_date?: string;
  end_date?: string;
  status?: string[];
  limit?: number;
  offset?: number;
}

export interface GetAvailableSlotsRequest {
  doctor_id: string;
  date: string; // ISO date
  duration_minutes?: number;
}

// =================================================================
// API RESPONSE TYPES
// =================================================================

export interface AppointmentResponse {
  success: boolean;
  data?: Appointment;
  error?: string;
}

export interface AppointmentsResponse {
  success: boolean;
  data?: AppointmentWithDetails[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  error?: string;
}

export interface SlotsResponse {
  success: boolean;
  data?: AppointmentSlotWithDetails[];
  error?: string;
}

export interface CalendarEventsResponse {
  success: boolean;
  data?: CalendarEvent[];
  error?: string;
}

export interface AppointmentStatsResponse {
  success: boolean;
  data?: {
    today: number;
    waiting: number;
    engaged: number;
    completed: number;
    cancelled: number;
    totalThisWeek: number;
    totalThisMonth: number;
  };
  error?: string;
}

// =================================================================
// APPOINTMENT STATUS WORKFLOW TYPES
// =================================================================

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export interface StatusTransition {
  from: AppointmentStatus;
  to: AppointmentStatus;
  allowedRoles: ('admin' | 'doctor' | 'receptionist' | 'patient')[];
  requiresReason?: boolean;
  autoTriggers?: {
    condition: string;
    delay?: number; // minutes
  };
}

export interface AppointmentWorkflow {
  transitions: StatusTransition[];
  notifications: {
    [key in AppointmentStatus]?: {
      patient?: boolean;
      doctor?: boolean;
      admin?: boolean;
      whatsapp?: boolean;
      email?: boolean;
    };
  };
}

// =================================================================
// FORM AND VALIDATION TYPES
// =================================================================

export interface AppointmentFormData {
  patient_search: string;
  selected_patient?: {
    id: string;
    name: string;
    phone: string;
    uhid: string;
  };
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  chief_complaint: string;
  appointment_type: 'consultation' | 'follow_up' | 'emergency' | 'procedure';
  priority: 'normal' | 'urgent' | 'emergency';
  notes: string;
  special_instructions: string;
}

export interface AppointmentValidationErrors {
  patient_id?: string;
  doctor_id?: string;
  appointment_date?: string;
  appointment_time?: string;
  duration_minutes?: string;
  chief_complaint?: string;
  availability?: string;
  conflict?: string;
  general?: string;
}

export interface SlotValidationResult {
  isValid: boolean;
  conflicts: {
    appointment_id: string;
    patient_name: string;
    time_overlap: boolean;
  }[];
  doctorAvailable: boolean;
  slotExists: boolean;
}

// =================================================================
// INTEGRATION TYPES
// =================================================================

export interface PatientVisitIntegration {
  appointment_id: string;
  visit_data: {
    patient_id: string;
    doctor_id: string;
    visit_type: 'new_patient' | 'follow_up';
    scheduled_date: string;
    scheduled_time: string;
    chief_complaints: string;
    consultation_fee: number;
  };
}

export interface WhatsAppReminderData {
  appointment_id: string;
  patient_phone: string;
  patient_name: string;
  doctor_name: string;
  appointment_datetime: string;
  clinic_name: string;
  reminder_type: '24_hour' | '2_hour' | '30_minute';
}

export interface EmailReminderData {
  appointment_id: string;
  patient_email: string;
  patient_name: string;
  doctor_name: string;
  appointment_datetime: string;
  clinic_name: string;
  reminder_type: '24_hour' | '2_hour' | '30_minute';
}

// =================================================================
// UTILITY TYPES
// =================================================================

export type AppointmentSource = 'manual' | 'online' | 'whatsapp' | 'phone' | 'patient_portal';
export type AppointmentType = 'consultation' | 'follow_up' | 'emergency' | 'procedure';
export type AppointmentPriority = 'normal' | 'urgent' | 'emergency';
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'waived';

export interface TimeSlot {
  time: string; // HH:MM
  available: boolean;
  booked: boolean;
  appointment_id?: string;
  patient_name?: string;
}

export interface DoctorSchedule {
  doctor_id: string;
  doctor_name: string;
  date: string;
  availability: {
    start_time: string;
    end_time: string;
    slot_duration: number;
  }[];
  appointments: Appointment[];
  blocked_slots: string[]; // Array of HH:MM times
}

export interface AppointmentConflict {
  type: 'time_overlap' | 'doctor_unavailable' | 'patient_double_booking';
  severity: 'error' | 'warning';
  message: string;
  conflicting_appointment?: Appointment;
  suggested_slots?: TimeSlot[];
}
