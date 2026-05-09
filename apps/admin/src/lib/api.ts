const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3001";
const AUTH_SERVICE_URL = AUTH_URL;
const TENANT_SERVICE_URL =
  process.env.NEXT_PUBLIC_TENANT_URL ?? "http://localhost:3002";
const ESTIMATE_SERVICE_URL =
  process.env.NEXT_PUBLIC_ESTIMATE_URL ?? "http://localhost:3004";
const AGENT_SERVICE_URL =
  process.env.NEXT_PUBLIC_AGENT_MANAGER_URL ?? "http://localhost:3006";

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

async function authedFetch(
  url: string,
  token: string,
  options: RequestInit = {},
) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  return res.json();
}

export const adminApi = {
  getMe: (token: string) => authedFetch(`${AUTH_SERVICE_URL}/users/me`, token),

  listTenants: (token: string) =>
    authedFetch(`${AUTH_SERVICE_URL}/admin/tenants`, token),

  updateTenant: (token: string, id: string, data: any) =>
    authedFetch(`${AUTH_SERVICE_URL}/admin/tenants/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  listTickets: (token: string) =>
    authedFetch(`${AUTH_SERVICE_URL}/admin/tickets`, token),

  updateTicket: (token: string, id: string, status: string) =>
    authedFetch(`${AUTH_SERVICE_URL}/admin/tickets/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  getTicket: (token: string, id: string) =>
    authedFetch(`${AUTH_SERVICE_URL}/admin/tickets/${id}`, token),

  addMessage: (token: string, id: string, message: string) =>
    authedFetch(`${AUTH_SERVICE_URL}/admin/tickets/${id}/messages`, token, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  getStats: (token: string) =>
    authedFetch(`${AUTH_SERVICE_URL}/admin/stats`, token),

  getAuditLog: (token: string, limit = 100) =>
    authedFetch(`${AUTH_SERVICE_URL}/admin/audit?limit=${limit}`, token),

  getCdtVersions: (token: string) =>
    authedFetch(`${ESTIMATE_SERVICE_URL}/cdt/versions`, token),

  uploadCdtCodes: (
    token: string,
    payload: {
      versionLabel: string;
      effectiveDate: string;
      filename: string;
      format: "csv" | "json";
      data: string;
    },
  ) =>
    authedFetch(`${ESTIMATE_SERVICE_URL}/cdt/upload`, token, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Service health checks (no auth — public /health endpoints)
  getServiceHealth: async () => {
    const services = [
      { name: "Auth Service", url: `${AUTH_SERVICE_URL}/health` },
      { name: "Tenant Service", url: `${TENANT_SERVICE_URL}/health` },
      { name: "Estimate Service", url: `${ESTIMATE_SERVICE_URL}/health` },
      { name: "Agent Manager", url: `${AGENT_SERVICE_URL}/health` },
    ];
    return Promise.all(
      services.map(async (svc) => {
        const start = Date.now();
        try {
          const res = await fetch(svc.url, {
            signal: AbortSignal.timeout(3000),
          });
          const data = await res.json().catch(() => ({}));
          return {
            ...svc,
            status: res.ok ? "up" : "down",
            latencyMs: Date.now() - start,
            data,
          };
        } catch {
          return {
            ...svc,
            status: "down",
            latencyMs: Date.now() - start,
            data: {},
          };
        }
      }),
    );
  },
};
