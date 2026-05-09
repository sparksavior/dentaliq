// ─────────────────────────────────────────────────────────
// DentalIQ — Shared Types
// ─────────────────────────────────────────────────────────

// ── Users & Auth ──────────────────────────────────────────
export type UserRole = "admin" | "dentist" | "front_desk";

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
  mfaEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface JWTPayload {
  sub: string; // user id
  tenantId: string;
  role: UserRole;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ── Tenants / Clinics ─────────────────────────────────────
export type PlanTier = "starter" | "pro" | "enterprise" | "cortex";
export type TenantStatus = "active" | "suspended" | "trial";
export type PmsType = "open_dental" | "dentrix" | "cleardent" | "none";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: PlanTier;
  status: TenantStatus;
  pmsType: PmsType;
  pmsConnected: boolean;
  schemaName: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Insurance ─────────────────────────────────────────────
export type ClaimRisk = "low" | "medium" | "high";

export interface EstimateRequest {
  patientId: string;
  cdtCode: string;
  insurerId: string;
  tenantId: string;
}

export interface EstimateResult {
  cdtCode: string;
  coveragePercent: number;
  patientCost: number;
  insurerPays: number;
  plainExplanation: string;
  claimRisk: ClaimRisk;
  riskReasons: string[];
  confidenceScore: number;
}

// ── API Responses ─────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ── Events (for future event bus) ─────────────────────────
export type DentaliqEvent =
  | {
      type: "tenant.provisioned";
      payload: { tenantId: string; plan: PlanTier };
    }
  | {
      type: "user.created";
      payload: { userId: string; tenantId: string; role: UserRole };
    }
  | { type: "user.mfa_enabled"; payload: { userId: string } }
  | { type: "pms.connected"; payload: { tenantId: string; pmsType: PmsType } }
  | {
      type: "estimate.generated";
      payload: { tenantId: string; cdtCode: string; risk: ClaimRisk };
    };
