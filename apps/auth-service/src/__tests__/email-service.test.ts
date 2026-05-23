import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@dentaliq/config", () => ({
  getEnv: () => ({
    EMAIL_MODE: "console",
    EMAIL_FROM: "noreply@dentaliq.ca",
    APP_URL: "http://localhost:3000",
    SMTP_HOST: "localhost",
    SMTP_PORT: 1025,
  }),
}));

vi.mock("@dentaliq/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { EmailService } from "../services/emailService";

describe("EmailService", () => {
  let service: EmailService;

  beforeEach(() => {
    service = new EmailService();
  });

  it("sendVerificationEmail does not throw in console mode", async () => {
    await expect(
      service.sendVerificationEmail("test@test.com", "Test User", "token-123"),
    ).resolves.not.toThrow();
  });

  it("sendPasswordResetEmail does not throw in console mode", async () => {
    await expect(
      service.sendPasswordResetEmail(
        "test@test.com",
        "Test User",
        "reset-token",
      ),
    ).resolves.not.toThrow();
  });

  it("sendPasswordChangedEmail does not throw in console mode", async () => {
    await expect(
      service.sendPasswordChangedEmail("test@test.com", "Test User"),
    ).resolves.not.toThrow();
  });

  it("sendMfaEnabledEmail does not throw in console mode", async () => {
    await expect(
      service.sendMfaEnabledEmail("test@test.com", "Test User"),
    ).resolves.not.toThrow();
  });

  it("sendWelcomeEmail does not throw in console mode", async () => {
    await expect(
      service.sendWelcomeEmail(
        "test@test.com",
        "Test User",
        "Test Clinic",
        "starter",
      ),
    ).resolves.not.toThrow();
  });

  it("sendAgentTaskNotification does not throw in console mode", async () => {
    await expect(
      service.sendAgentTaskNotification("test@test.com", "Test Clinic", 5),
    ).resolves.not.toThrow();
  });

  it("sendMfaOtpEmail does not throw in console mode", async () => {
    await expect(
      service.sendMfaOtpEmail("test@test.com", "Test User", "123456", "login"),
    ).resolves.not.toThrow();
  });

  it("sendInviteEmail does not throw in console mode", async () => {
    await expect(
      service.sendInviteEmail(
        "new@test.com",
        "New User",
        "Test Clinic",
        "Admin User",
        "http://localhost:3000/invite?token=abc",
      ),
    ).resolves.not.toThrow();
  });

  it("sendAgreementEmail does not throw in console mode", async () => {
    await expect(
      service.sendAgreementEmail("test@test.com", "Test User"),
    ).resolves.not.toThrow();
  });
});
