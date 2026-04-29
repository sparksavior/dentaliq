const AUTH_URL = 'http://localhost:3001'

export interface Tenant {
  id: string
  name: string
  slug: string
  plan: 'starter' | 'pro' | 'enterprise'
  status: 'trial' | 'active' | 'suspended'
  trialEndsAt: string
  billingDate: string | null
  createdAt: string
}

export const adminApi = {
  async listTenants(token: string): Promise<Tenant[]> {
    const res = await fetch(`${AUTH_URL}/admin/tenants`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return res.json()
  },
  async updateTenant(token: string, id: string, data: any) {
    const res = await fetch(`${AUTH_URL}/admin/tenants/${id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(data)
    })
    return res.json()
  },
  async getMe(token: string) {
    const res = await fetch(`${AUTH_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return res.json()
  }
}
