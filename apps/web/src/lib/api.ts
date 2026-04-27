// Typed API client

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3001'
const ESTIMATE_URL = process.env.NEXT_PUBLIC_ESTIMATE_URL ?? 'http://localhost:3004'

export interface RegisterInput {
  name: string
  email: string
  password: string
  clinicName: string
  plan: 'starter' | 'pro' | 'enterprise'
}

export interface LoginInput {
  email: string
  password: string
  totpCode?: string
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'dentist' | 'front_desk'
  tenantId: string
  mfaEnabled: boolean
}

export interface AuthTokens {
  accessToken: string
  expiresIn: number
  user: AuthUser
}

async function request<T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const json = await res.json()

  if (!res.ok) {
    throw new ApiError(json.error ?? 'Request failed', res.status, json.details)
  }

  return json.data ?? json
}

function authRequest<T>(path: string, options: RequestInit = {}) {
  return request<T>(AUTH_URL, path, options)
}

const TENANT_URL = process.env.NEXT_PUBLIC_TENANT_URL ?? 'http://localhost:3002'

function tenantRequest<T>(path: string, token: string, options: RequestInit = {}) {
  return request<T>(TENANT_URL, path, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
  })
}

export interface Patient {
  id: string
  first_name: string
  last_name: string
  date_of_birth?: string
  phone?: string
  email?: string
  insurance_plan_id?: string
  created_at: string
}

export interface CreatePatientInput {
  firstName: string
  lastName: string
  dateOfBirth?: string
  phone?: string
  email?: string
  insuranceProvider?: string
}

export const patientsApi = {
  getPatients: (token: string) => tenantRequest<Patient[]>('/patients', token),
  createPatient: (token: string, data: CreatePatientInput) =>
    tenantRequest<Patient>('/patients', token, { method: 'POST', body: JSON.stringify(data) }),
  deletePatient: (token: string, id: string) =>
    tenantRequest<{ success: true }>(`/patients/${id}`, token, { method: 'DELETE' }),
  getAiContext: (token: string) =>
    tenantRequest<any>('/patients/ai-context', token),
}

export interface ClinicLocation {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
  status: 'active' | 'inactive'
  operating_hours?: string
  pms_type?: string
  pms_connected?: number
  created_at: string
  updated_at: string
}

export interface ClinicLocationInput {
  name: string
  address?: string
  phone?: string
  email?: string
  status?: 'active' | 'inactive'
  operatingHours?: string
  pmsType?: string
}

export const clinicsApi = {
  list:   (token: string) =>
    tenantRequest<ClinicLocation[]>('/clinics', token),
  create: (token: string, data: ClinicLocationInput) =>
    tenantRequest<ClinicLocation>('/clinics', token, { method: 'POST', body: JSON.stringify(data) }),
  update: (token: string, id: string, data: Partial<ClinicLocationInput>) =>
    tenantRequest<{ success: true }>(`/clinics/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (token: string, id: string) =>
    tenantRequest<{ success: true }>(`/clinics/${id}`, token, { method: 'DELETE' }),
}

function estimateRequest<T>(path: string, token: string, options: RequestInit = {}) {
  return request<T>(ESTIMATE_URL, path, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
  })
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: string[],
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const authApi = {
  register: (input: RegisterInput) =>
    authRequest<{ userId: string; tenantId: string; email: string; message: string }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify(input) },
    ),

  login: (input: LoginInput) =>
    authRequest<AuthTokens | { requiresMfa: true; message: string }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify(input) },
    ),

  logout: () => authRequest('/auth/logout', { method: 'POST' }),

  refresh: () =>
    authRequest<{ accessToken: string; expiresIn: number }>('/auth/refresh', {
      method: 'POST',
    }),

  me: (token: string) =>
    authRequest<AuthUser>('/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  forgotPassword: (email: string) =>
    authRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
}

// ── Estimate API types ────────────────────────────────────

export interface EstimateRequest {
  cdtCode: string
  insurerName: string
  patientId?: string
  patientAge?: number
  codesOnSameVisit?: string[]
}

export interface EstimateResult {
  id: string
  cdtCode: string
  coveragePercent: number
  patientCost: number
  insurerPays: number
  plainExplanation: string
  claimRisk: 'low' | 'medium' | 'high'
  riskReasons: string[]
  confidenceScore: number
}

export interface CdtCodeSummary {
  code: string
  description: string
  category: string
  typicalFee: number
  requiresPreAuth: boolean
}

export const estimateApi = {
  runEstimate: (token: string, input: EstimateRequest) =>
    estimateRequest<EstimateResult>(
      '/estimate',
      token,
      { method: 'POST', body: JSON.stringify(input) },
    ),

  getCodes: (token: string) =>
    estimateRequest<CdtCodeSummary[]>('/estimate/codes', token),

  getHistory: (token: string) =>
    estimateRequest<unknown[]>('/estimate/history', token),

  generateNarrative: (token: string, input: { cdtCode: string, insurerName: string, patientName?: string, clinicalNotes?: string }) =>
    estimateRequest<string>('/estimate/narrative', token, { method: 'POST', body: JSON.stringify(input) }),
}
