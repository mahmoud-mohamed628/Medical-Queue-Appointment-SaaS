export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  city: string;
  cabinetName: string;
  cabinetAddress: string;
  licenseNumber: string;
  avgConsultationTime: number;
}

export interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  dateTime: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELED";
  notes: string;
  ticketNumber?: number;
}

export interface QueueEntry {
  id: string;
  patientName: string;
  patientPhone: string;
  ticketNumber: number;
  status: "WAITING" | "CALLED" | "SERVING" | "COMPLETED" | "MISSED";
  checkInAt: string;
  calledAt?: string;
  completedAt?: string;
  appointmentId?: string;
}

export interface Queue {
  doctorId: string;
  status: "NOT_STARTED" | "ACTIVE" | "PAUSED" | "COMPLETED";
  currentNumber: number;
  totalTickets: number;
  entries: QueueEntry[];
}

export interface WhatsAppLog {
  id: string;
  receiverName: string;
  phoneNumber: string;
  type: "CONFIRMATION" | "REMINDER" | "YOUR_TURN" | "DELAY_ALERT";
  message: string;
  status: "PENDING" | "SENT" | "FAILED";
  sentAt: string;
}

export type Language = "FR" | "AR";
