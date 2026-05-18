// Typed API client

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3001";
const ESTIMATE_URL =
  process.env.NEXT_PUBLIC_ESTIMATE_URL ?? "http://localhost:3004";
const TENANT_URL =
  process.env.NEXT_PUBLIC_TENANT_URL ?? "http://localhost:3002";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  clinicName: string;
  plan: "starter" | "pro" | "enterprise" | "cortex";
}

export interface LoginInput {
  email: string;
  password: string;
  totpCode?: string;
  mfaMethod?: "totp" | "email" | "sms";
  otpCode?: string;
}

export const ALL_PERMISSIONS = [
  "dashboard",
  "estimates",
  "claims",
  "patients",
  "analytics",
  "cortex_agents",
  "cortex_inbox",
  "support",
  "settings",
] as const;

export type PermissionKey = (typeof ALL_PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  dashboard: "Overview",
  estimates: "Estimates",
  claims: "Claims",
  patients: "Patients",
  analytics: "Analytics",
  cortex_agents: "Cortex Agents",
  cortex_inbox: "Approval Inbox",
  support: "Support",
  settings: "Settings",
};

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "dentist" | "front_desk";
  tenantId: string;
  mfaEnabled: boolean;
  emailVerified: boolean;
  plan?: "starter" | "pro" | "enterprise" | "cortex";
  status?: "trial" | "active" | "suspended";
  // Sub-user permission system
  // Admins (role='admin') always have full access; this array is for non-admin sub-users
  permissions: PermissionKey[];
  invitedBy?: string | null;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "dentist" | "front_desk";
  mfaEnabled: boolean;
  emailVerified: boolean;
  permissions: PermissionKey[];
  invitedBy: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  status: "active";
}

export interface PendingInvite {
  id: string;
  email: string;
  name: string;
  permissions: PermissionKey[];
  expiresAt: string;
  createdAt: string;
  status: "pending";
}

export interface InviteDetails {
  email: string;
  name: string;
  clinicName: string;
  adminName: string;
  permissions: PermissionKey[];
  hasMfaSecret: boolean;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: "starter" | "pro" | "enterprise" | "cortex";
  status: "trial" | "active" | "suspended";
  pmsType: "open_dental" | "dentrix" | "cleardent" | "none";
  pmsConnected: boolean;
  pmsApiKey?: string | null;
  trialEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
}

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  phone?: string;
  email?: string;
  insurance_plan_id?: string;
  created_at: string;
}

export interface CreatePatientInput {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  insuranceProvider?: string;
  clinicId?: string;
}

export interface InsurancePlan {
  id: string;
  insurer_name: string;
  plan_name: string | null;
  group_number: string | null;
  annual_max: number | null;
  preventive_coverage: number;
  basic_coverage: number;
  major_coverage: number;
  ortho_coverage: number;
  created_at: string;
}

export interface CreateInsurancePlanInput {
  insurerName: string;
  planName?: string;
  groupNumber?: string;
  annualMax?: number;
  preventiveCoverage?: number;
  basicCoverage?: number;
  majorCoverage?: number;
  orthoCoverage?: number;
}

export interface EstimateHistoryItem {
  id: string;
  patient_id: string | null;
  cdt_code: string;
  coverage_percent: number;
  patient_cost: number;
  insurer_pays: number;
  claim_risk: "low" | "medium" | "high";
  plain_explanation: string;
  pre_auth_letter: string | null;
  first_name?: string | null;
  last_name?: string | null;
  created_by: string;
  created_at: string;
}

export interface EstimateRequest {
  cdtCode: string;
  insurerName: string;
  patientId?: string;
  patientAge?: number;
  codesOnSameVisit?: string[];
}

export interface EstimateResult {
  id: string;
  cdtCode: string;
  coveragePercent: number;
  patientCost: number;
  insurerPays: number;
  plainExplanation: string;
  claimRisk: "low" | "medium" | "high";
  riskReasons: string[];
  confidenceScore: number;
}

export interface CdtCodeSummary {
  code: string;
  description: string;
  category: string;
  typicalFee: number;
  requiresPreAuth: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: string[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const clinicId =
    typeof window !== "undefined"
      ? localStorage.getItem("diq_selected_clinic")
      : null;

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      // Only send Content-Type when there is a body — Fastify rejects
      // DELETE/GET requests that carry Content-Type without a body.
      ...(options.body !== undefined && { "Content-Type": "application/json" }),
      ...(clinicId && { "x-clinic-id": clinicId }),
      ...options.headers,
    },
  });

  const json = await res.json();

  if (!res.ok) {
    throw new ApiError(
      json.error ?? "Request failed",
      res.status,
      json.details,
    );
  }

  return json.data ?? json;
}

function authRequest<T>(path: string, options: RequestInit = {}) {
  return request<T>(AUTH_URL, path, options);
}

function tenantRequest<T>(
  path: string,
  token: string,
  options: RequestInit = {},
) {
  return request<T>(TENANT_URL, path, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
  });
}

function estimateRequest<T>(
  path: string,
  token: string,
  options: RequestInit = {},
) {
  return request<T>(ESTIMATE_URL, path, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
  });
}

export const authApi = {
  register: (input: RegisterInput) =>
    authRequest<{
      userId: string;
      tenantId: string;
      email: string;
      message: string;
    }>("/auth/register", { method: "POST", body: JSON.stringify(input) }),

  login: (input: LoginInput) =>
    authRequest<
      AuthTokens | { requiresMfa: true; mfaMethods: string[]; message: string }
    >("/auth/login", { method: "POST", body: JSON.stringify(input) }),

  loginSendOtp: (email: string, password: string, method: "email" | "sms") =>
    authRequest<{ message: string }>("/auth/login/send-otp", {
      method: "POST",
      body: JSON.stringify({ email, password, method }),
    }),

  logout: () =>
    authRequest("/auth/logout", { method: "POST", body: JSON.stringify({}) }),

  refresh: () =>
    authRequest<{ accessToken: string; expiresIn: number }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({}),
    }),

  me: (token: string) =>
    authRequest<AuthUser>("/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    }),

  forgotPassword: (email: string) =>
    authRequest("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  triggerWelcomeEmail: (token: string) =>
    authRequest<{ success: boolean; message: string }>("/users/welcome", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    }),
};

// ── Invite / onboarding (public — no auth token needed) ──────
export const inviteApi = {
  getDetails: (token: string) =>
    authRequest<InviteDetails>(`/users/invite/${token}`),

  setupMfa: (token: string) =>
    authRequest<{
      secret: string;
      qrCodeDataUrl: string;
      backupCodes: string[];
    }>(`/users/invite/${token}/setup-mfa`, {
      method: "POST",
      body: JSON.stringify({}),
    }),

  complete: (
    token: string,
    body: { password: string; mfaCode: string; tosAgreed: boolean },
  ) =>
    authRequest<{ accessToken: string; user: AuthUser }>(
      `/users/invite/${token}/complete`,
      { method: "POST", body: JSON.stringify(body) },
    ),
};

// ── Team management (admin only) ─────────────────────────────
export const teamApi = {
  listMembers: (token: string) =>
    authRequest<TeamMember[]>("/users/", {
      headers: { Authorization: `Bearer ${token}` },
    }),

  listPendingInvites: (token: string) =>
    authRequest<PendingInvite[]>("/users/invites/pending", {
      headers: { Authorization: `Bearer ${token}` },
    }),

  invite: (
    token: string,
    data: { email: string; name: string; permissions: PermissionKey[] },
  ) =>
    authRequest<{ email: string; name: string; expiresAt: string }>(
      "/users/invite",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      },
    ),

  updatePermissions: (
    token: string,
    userId: string,
    permissions: PermissionKey[],
  ) =>
    authRequest<{ id: string; permissions: PermissionKey[] }>(
      `/users/${userId}/permissions`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ permissions }),
      },
    ),

  removeMember: (token: string, userId: string) =>
    authRequest<{ success: true }>(`/users/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),

  revokeInvite: (token: string, inviteId: string) =>
    authRequest<{ success: true }>(`/users/invites/${inviteId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const tenantsApi = {
  getTenant: (token: string) => tenantRequest<Tenant>("/tenants/me", token),

  updateTenant: (token: string, data: { name: string }) =>
    tenantRequest<Tenant>("/tenants/me", token, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  connectPms: (
    token: string,
    data: {
      pmsType: "open_dental" | "dentrix" | "cleardent";
      pmsApiKey: string;
    },
  ) =>
    tenantRequest<Tenant>("/tenants/me/pms", token, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  disconnectPms: (token: string) =>
    tenantRequest<Tenant>("/tenants/me/pms", token, { method: "DELETE" }),

  getClinics: (token: string) => tenantRequest<any[]>("/clinics", token),

  createClinic: (
    token: string,
    data: { name: string; address?: string; phone?: string; email?: string },
  ) =>
    tenantRequest<any>("/clinics", token, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const patientsApi = {
  getPatients: (token: string) => tenantRequest<Patient[]>("/patients", token),

  createPatient: (token: string, data: CreatePatientInput) =>
    tenantRequest<Patient>("/patients", token, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updatePatient: (token: string, id: string, data: CreatePatientInput) =>
    tenantRequest<Patient>(`/patients/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deletePatient: (token: string, id: string) =>
    tenantRequest<{ success: true }>(`/patients/${id}`, token, {
      method: "DELETE",
    }),

  getPatient: (token: string, id: string) =>
    tenantRequest<Patient & { history: EstimateHistoryItem[] }>(
      `/patients/${id}`,
      token,
    ),
};

export const insurancePlansApi = {
  getPlans: (token: string) =>
    tenantRequest<InsurancePlan[]>("/insurance-plans", token),

  createPlan: (token: string, data: CreateInsurancePlanInput) =>
    tenantRequest<InsurancePlan>("/insurance-plans", token, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updatePlan: (token: string, id: string, data: CreateInsurancePlanInput) =>
    tenantRequest<InsurancePlan>(`/insurance-plans/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deletePlan: (token: string, id: string) =>
    tenantRequest<{ success: true }>(`/insurance-plans/${id}`, token, {
      method: "DELETE",
    }),
};

export interface SupportTicketInput {
  subject: string;
  description: string;
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

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_type: "user" | "admin";
  sender_name: string;
  message: string;
  created_at: string;
}

export const supportApi = {
  createTicket: (token: string, data: SupportTicketInput) =>
    authRequest<{ id: string }>("/support/tickets", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    }),

  listTickets: (token: string) =>
    authRequest<SupportTicket[]>("/support/tickets", {
      headers: { Authorization: `Bearer ${token}` },
    }),

  getTicket: (token: string, id: string) =>
    authRequest<SupportTicket & { messages: SupportMessage[] }>(
      `/support/tickets/${id}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    ),

  addMessage: (token: string, id: string, message: string) =>
    authRequest<{ id: string }>(`/support/tickets/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ message }),
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const estimateApi = {
  runEstimate: (token: string, input: EstimateRequest) =>
    estimateRequest<EstimateResult>("/estimate", token, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getCodes: (token: string) =>
    estimateRequest<CdtCodeSummary[]>("/estimate/codes", token),

  getHistory: (token: string) =>
    estimateRequest<EstimateHistoryItem[]>("/estimate/history", token),

  generateNarrative: (
    token: string,
    input: {
      cdtCode: string;
      insurerName: string;
      patientName?: string;
      patientAge?: number;
      clinicalNotes?: string;
      previousNarrative?: string;
      revisionInstructions?: string;
    },
  ) =>
    estimateRequest<string>("/estimate/narrative", token, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  saveLetter: (token: string, id: string, letter: string) =>
    estimateRequest<{ success: true }>(`/estimate/${id}/letter`, token, {
      method: "PATCH",
      body: JSON.stringify({ letter }),
    }),
};

export const agentsApi = {
  getRentedAgents: (token: string) => tenantRequest<any[]>("/agents", token),
  rentAgent: (
    token: string,
    data: {
      agentId?: string;
      clinicId?: string;
      assignments?: { agentId: string; clinicId: string }[];
    },
  ) =>
    tenantRequest<any>("/agents/rent", token, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  removeAgent: (token: string, data: { agentId: string; clinicId: string }) =>
    tenantRequest<any>("/agents/remove", token, {
      method: "DELETE",
      body: JSON.stringify(data),
    }),
};

export interface AnalyticsOverview {
  caseAcceptance: {
    month: string;
    total: number;
    advanced: number;
    rate: number;
  }[];
  newPatients: { month: string; count: number }[];
  patientSummary: {
    currentMonth: number;
    priorMonth: number;
    total: number;
    momDelta: number | null;
  };
  arAging: {
    band: string;
    days: string;
    amount: number;
    count: number;
    severity: "current" | "watch" | "overdue" | "critical";
  }[];
  arTotal: number;
  generatedAt: string;
}

export const analyticsApi = {
  getOverview: (token: string) =>
    tenantRequest<AnalyticsOverview>("/analytics/overview", token),
};

export const billingApi = {
  getConfig: (token: string) =>
    tenantRequest<{
      stripePublishableKey: string | null;
      stripeEnabled: boolean;
      plans: Record<string, number>;
      agentPrice: number;
    }>("/billing/config", token),

  createSetupIntent: (token: string) =>
    tenantRequest<{ clientSecret: string }>("/billing/setup-intent", token, {
      method: "POST",
    }),

  getPaymentMethod: (token: string) =>
    tenantRequest<{
      brand: string;
      last4: string;
      expMonth: number;
      expYear: number;
    } | null>("/billing/payment-method", token),

  savePaymentMethod: (token: string, data: { paymentMethodId: string }) =>
    tenantRequest<{ brand: string; last4: string }>(
      "/billing/payment-method",
      token,
      { method: "POST", body: JSON.stringify(data) },
    ),

  getInvoices: (token: string) =>
    tenantRequest<any[]>("/billing/invoices", token),

  getSubscription: (token: string) =>
    tenantRequest<{
      plan: string;
      status: string;
      subscriptionId: string | null;
    }>("/billing/subscription", token),
};
