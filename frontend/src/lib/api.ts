import { User, Client, Appointment, ServicePackage, LaserDevice, Operator, DashboardStats } from './types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('alma_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // Auth
  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'خطای سرور' }));
      throw new Error(err.error || 'ورود ناموفق بود.');
    }
    const data = await res.json();
    localStorage.setItem('alma_auth_token', data.token);
    localStorage.setItem('alma_user', JSON.stringify(data.user));
    return data;
  },

  async getMe(): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('احراز هویت نشدید.');
    return res.json();
  },

  logout() {
    localStorage.removeItem('alma_auth_token');
    localStorage.removeItem('alma_user');
  },

  // Appointments
  async getAppointments(params?: {
    shamsiDate?: string;
    status?: string;
    clientId?: string;
  }): Promise<{ appointments: Appointment[] }> {
    const q = new URLSearchParams();
    if (params?.shamsiDate) q.append('shamsiDate', params.shamsiDate);
    if (params?.status) q.append('status', params.status);
    if (params?.clientId) q.append('clientId', params.clientId);

    const res = await fetch(`${API_BASE}/appointments?${q.toString()}`, {
      headers: getAuthHeader(),
    });
    return res.json();
  },

  async createAppointment(data: any): Promise<{ appointment: Appointment }> {
    const res = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'خطا در ثبت نوبت');
    }
    return res.json();
  },

  async updateAppointmentStatus(id: string, data: { status: string; paymentMethod?: string; paidAmount?: number }): Promise<{ appointment: Appointment }> {
    const res = await fetch(`${API_BASE}/appointments/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('خطا در به‌روزرسانی نوبت');
    return res.json();
  },

  async deleteAppointment(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/appointments/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return res.json();
  },

  // Clients
  async getClients(params?: { q?: string; page?: number; limit?: number }): Promise<{ clients: Client[]; total: number; totalPages: number }> {
    const q = new URLSearchParams();
    if (params?.q) q.append('q', params.q);
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));

    const res = await fetch(`${API_BASE}/clients?${q.toString()}`, {
      headers: getAuthHeader(),
    });
    return res.json();
  },

  async getClientById(id: string): Promise<{ client: Client }> {
    const res = await fetch(`${API_BASE}/clients/${id}`, {
      headers: getAuthHeader(),
    });
    return res.json();
  },

  async createClient(data: Partial<Client>): Promise<{ client: Client }> {
    const res = await fetch(`${API_BASE}/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'خطا در ایجاد پرونده');
    }
    return res.json();
  },

  async updateClient(id: string, data: Partial<Client>): Promise<{ client: Client }> {
    const res = await fetch(`${API_BASE}/clients/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async bulkImport(formData: FormData): Promise<any> {
    const res = await fetch(`${API_BASE}/clients/import`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'خطا در ایمپورت');
    }
    return res.json();
  },

  async bulkImportJson(clients: any[]): Promise<any> {
    const res = await fetch(`${API_BASE}/clients/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ clients }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'خطا در ایمپورت');
    }
    return res.json();
  },

  // Analytics
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/analytics/dashboard`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('خطا در دریافت آمار');
    return res.json();
  },

  // Services, Packages, Devices, Operators
  async getPackages(): Promise<{ packages: ServicePackage[] }> {
    const res = await fetch(`${API_BASE}/packages`);
    return res.json();
  },

  async getOperators(): Promise<{ operators: Operator[] }> {
    const res = await fetch(`${API_BASE}/operators`);
    return res.json();
  },

  async getDevices(): Promise<{ devices: LaserDevice[] }> {
    const res = await fetch(`${API_BASE}/devices`);
    return res.json();
  },

  // Settings & Broadcast
  async getSettings(): Promise<{ settings: Record<string, string> }> {
    const res = await fetch(`${API_BASE}/settings`);
    return res.json();
  },

  async updateSettings(settings: Record<string, string>): Promise<any> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ settings }),
    });
    return res.json();
  },

  async sendBroadcast(messageText: string, target = 'ALL'): Promise<any> {
    const res = await fetch(`${API_BASE}/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ messageText, target }),
    });
    if (!res.ok) throw new Error('خطا در ارسال پیام');
    return res.json();
  },
};
