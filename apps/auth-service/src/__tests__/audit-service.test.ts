import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi
  .fn()
  .mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
vi.mock("@dentaliq/db", () => ({
  getDb: () => ({ insert: mockInsert }),
  auditLogs: { name: "audit_logs" },
}));

vi.mock("@paralleldrive/cuid2", () => ({
  createId: () => "test-id-123",
}));

import { AuditService } from "../services/auditService";

describe("AuditService", () => {
  let service: AuditService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
    service = new AuditService();
  });

  it("logs an audit entry with all fields", async () => {
    await service.log({
      tenantId: "tenant-1",
      userId: "user-1",
      action: "USER_LOGIN",
      resourceType: "user",
      resourceId: "user-1",
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0",
      metadata: { email: "test@test.com" },
    });

    expect(mockInsert).toHaveBeenCalledOnce();
    const valuesCall = mockInsert.mock.results[0].value.values;
    expect(valuesCall).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "test-id-123",
        tenantId: "tenant-1",
        userId: "user-1",
        action: "USER_LOGIN",
        service: "auth-service",
        metadata: JSON.stringify({ email: "test@test.com" }),
      }),
    );
  });

  it("handles null optional fields", async () => {
    await service.log({
      tenantId: "tenant-1",
      action: "SYSTEM_EVENT",
    });

    const valuesCall = mockInsert.mock.results[0].value.values;
    expect(valuesCall).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
        resourceType: null,
        resourceId: null,
        ipAddress: null,
        userAgent: null,
        metadata: null,
      }),
    );
  });

  it("does not throw on database errors", async () => {
    mockInsert.mockReturnValue({
      values: vi.fn().mockRejectedValue(new Error("DB down")),
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      service.log({ tenantId: "tenant-1", action: "TEST" }),
    ).resolves.not.toThrow();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
