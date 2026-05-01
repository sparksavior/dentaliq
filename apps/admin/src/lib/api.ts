const AUTH_URL = "http://localhost:3001";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: "starter" | "pro" | "enterprise";
  status: "trial" | "active" | "suspended";
  trialEndsAt: string;
  billingDate: string | null;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  tenant_id: string;
  clinic_name: string;
  user_name: string;
  user_email: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved";
  created_at: string;
  updated_at: string;
}

export const adminApi = {
  async listTenants(token: string): Promise<Tenant[]> {
    const res = await fetch(`${AUTH_URL}/admin/tenants`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },
  async updateTenant(token: string, id: string, data: any) {
    const res = await fetch(`${AUTH_URL}/admin/tenants/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async getMe(token: string) {
    const res = await fetch(`${AUTH_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },
  async listTickets(
    token: string,
  ): Promise<{ success: boolean; data: SupportTicket[] }> {
    const res = await fetch(`${AUTH_URL}/admin/tickets`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },
  async updateTicket(token: string, id: string, status: string) {
    const res = await fetch(`${AUTH_URL}/admin/tickets/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    return res.json();
  },
  async getTicket(
    token: string,
    id: string,
  ): Promise<{ success: boolean; data: SupportTicket & { messages: any[] } }> {
    const res = await fetch(`${AUTH_URL}/admin/tickets/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },
  async addMessage(token: string, id: string, message: string) {
    const res = await fetch(`${AUTH_URL}/admin/tickets/${id}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    });
    return res.json();
  },
};
