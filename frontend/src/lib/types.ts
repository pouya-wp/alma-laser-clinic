export type UserRole = 'SUPER_ADMIN' | 'SECRETARY' | 'OPERATOR';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  phone?: string;
}

export interface Client {
  id: string;
  telegramId?: string | null;
  telegramUsername?: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  gender: 'FEMALE' | 'MALE';
  nationalCode?: string | null;
  birthDate?: string | null;
  skinType?: string | null;
  contraindications?: string | null;
  notes?: string | null;
  totalSessions: number;
  loyaltyPoints: number;
  createdAt: string;
  updatedAt: string;
  appointments?: Appointment[];
}

export interface ServicePackage {
  id: string;
  name: string;
  category: 'FULL_BODY' | 'FUNCTIONAL' | 'FACE' | 'UPPER_BODY' | 'LOWER_BODY' | 'SPECIAL';
  gender: 'FEMALE' | 'MALE' | 'UNISEX';
  durationMinutes: number;
  price: number;
  description?: string;
  isActive: boolean;
}

export interface LaserDevice {
  id: string;
  name: string;
  model?: string;
  shotCount: number;
  status: 'ACTIVE' | 'MAINTENANCE';
  notes?: string;
}

export interface Operator {
  id: string;
  name: string;
  phone?: string;
  colorTag?: string;
  isActive: boolean;
}

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'WAITING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface Appointment {
  id: string;
  clientId: string;
  client: Client;
  packageId: string;
  package: ServicePackage;
  operatorId?: string | null;
  operator?: Operator | null;
  deviceId?: string | null;
  device?: LaserDevice | null;
  appointmentDate: string;
  shamsiDate: string;
  timeSlot: string;
  status: AppointmentStatus;
  price: number;
  discountAmount: number;
  finalPrice: number;
  paidAmount: number;
  paymentMethod?: string | null;
  notes?: string | null;
  reminderSent24h: boolean;
  reminderSent2h: boolean;
  postCareSent: boolean;
  nextSessionDueSent: boolean;
  createdAt: string;
}

export interface DashboardStats {
  summary: {
    totalClients: number;
    totalRevenue: number;
    todayCount: number;
    todayRevenue: number;
    todayWaiting: number;
    todayInProgress: number;
    todayCompleted: number;
    todayConfirmed: number;
    activeDevicesCount: number;
    operatorsCount: number;
  };
  todayAppointments: Appointment[];
  devices: LaserDevice[];
  operators: Operator[];
  packageStats: {
    id: string;
    name: string;
    category: string;
    price: number;
    count: number;
    revenue: number;
  }[];
  monthlyTrends: {
    month: string;
    revenue: number;
    appointments: number;
  }[];
}
