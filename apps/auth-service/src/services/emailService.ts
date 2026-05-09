import { getEnv } from "@dentaliq/config";
import { createLogger } from "@dentaliq/logger";

const logger = createLogger("email-service");

// ─────────────────────────────────────────────────────────
// Email Service
//
// EMAIL_MODE=console → prints to terminal (dev default)
// EMAIL_MODE=smtp    → sends via nodemailer (SMTP_HOST/PORT/USER/PASS)
// EMAIL_MODE=resend  → sends via Resend API (RESEND_API_KEY)
// ─────────────────────────────────────────────────────────

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private env = getEnv();

  async sendVerificationEmail(email: string, name: string, token: string) {
    const url = `${this.env.APP_URL}/verify-email?token=${token}`;
    await this.send({
      to: email,
      subject: "Verify your DentalIQ email address",
      html: verificationEmailHtml(name, url),
      text: `Hi ${name},\n\nVerify your email:\n${url}\n\nExpires in 24 hours.`,
    });
  }

  async sendPasswordResetEmail(email: string, name: string, token: string) {
    const url = `${this.env.APP_URL}/reset-password?token=${token}`;
    await this.send({
      to: email,
      subject: "Reset your DentalIQ password",
      html: passwordResetEmailHtml(name, url),
      text: `Hi ${name},\n\nReset your password:\n${url}\n\nExpires in 1 hour.`,
    });
  }

  async sendWelcomeEmail(email: string, name: string, clinicName: string) {
    const dashboardUrl = `${this.env.APP_URL}/dashboard`;
    await this.send({
      to: email,
      subject: `Welcome to DentalIQ, ${name}!`,
      html: welcomeEmailHtml(name, clinicName, dashboardUrl),
      text: `Hi ${name},\n\nWelcome to DentalIQ! ${clinicName} is set up.\n\nDashboard: ${dashboardUrl}`,
    });
  }

  async sendAgentTaskNotification(
    email: string,
    clinicName: string,
    taskCount: number,
  ) {
    const url = `${this.env.APP_URL}/dashboard/cortex/inbox`;
    await this.send({
      to: email,
      subject: `Cortex: ${taskCount} item(s) awaiting review — ${clinicName}`,
      html: agentTaskEmailHtml(clinicName, taskCount, url),
      text: `Cortex generated ${taskCount} new task(s) for ${clinicName}.\n\nReview: ${url}`,
    });
  }

  // ── Internal dispatch ──────────────────────────────────────

  private async send(payload: EmailPayload) {
    const mode = this.env.EMAIL_MODE ?? "console";
    try {
      if (mode === "resend") {
        await this.sendViaResend(payload);
        return;
      }
      if (mode === "smtp") {
        await this.sendViaSMTP(payload);
        return;
      }
      this.printToConsole(payload);
    } catch (err) {
      logger.error({ err, to: payload.to }, "Email send failed");
      throw err;
    }
  }

  private async sendViaSMTP(payload: EmailPayload) {
    const nodemailer = require("nodemailer") as typeof import("nodemailer");
    const env = this.env;

    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? "" }
        : undefined,
    });

    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });

    logger.info(
      { to: payload.to, subject: payload.subject },
      "Email sent via SMTP",
    );
  }

  private async sendViaResend(payload: EmailPayload) {
    const env = this.env;
    const apiKey = env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY not set");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    if (!res.ok)
      throw new Error(`Resend API error ${res.status}: ${await res.text()}`);
    logger.info(
      { to: payload.to, subject: payload.subject },
      "Email sent via Resend",
    );
  }

  private printToConsole(payload: EmailPayload) {
    const line = "─".repeat(60);
    logger.info(
      `\n${line}\n📧  EMAIL (console mode)\n    To:      ${payload.to}\n    Subject: ${payload.subject}\n\n${payload.text
        .split("\n")
        .map((l) => "    " + l)
        .join("\n")}\n${line}`,
    );
  }
}

// ─────────────────────────────────────────────────────────
// HTML email templates — responsive, minimal, branded
// ─────────────────────────────────────────────────────────

function baseTemplate(title: string, body: string) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0f172a;padding:24px 36px"><span style="color:#fff;font-size:18px;font-weight:700">🦷 DentalIQ</span></td></tr>
<tr><td style="padding:36px">${body}</td></tr>
<tr><td style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0">
<p style="margin:0;color:#94a3b8;font-size:12px">DentalIQ · noreply@dentaliq.ca</p></td></tr>
</table></td></tr></table></body></html>`;
}

function btn(url: string, label: string) {
  return `<a href="${url}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:13px 26px;border-radius:8px;font-size:15px;font-weight:600;margin:20px 0">${label}</a>`;
}

function verificationEmailHtml(name: string, url: string) {
  return baseTemplate(
    "Verify your email",
    `
    <h2 style="margin:0 0 12px;color:#0f172a">Hi ${name} 👋</h2>
    <p style="color:#475569;line-height:1.6">Click below to verify your DentalIQ email address.</p>
    ${btn(url, "Verify Email")}
    <p style="color:#94a3b8;font-size:13px">Expires in 24 hours.</p>`,
  );
}

function passwordResetEmailHtml(name: string, url: string) {
  return baseTemplate(
    "Reset your password",
    `
    <h2 style="margin:0 0 12px;color:#0f172a">Reset your password</h2>
    <p style="color:#475569;line-height:1.6">Hi ${name}, click below to set a new password.</p>
    ${btn(url, "Reset Password")}
    <p style="color:#94a3b8;font-size:13px">Expires in 1 hour. Ignore if you didn't request this.</p>`,
  );
}

function welcomeEmailHtml(
  name: string,
  clinicName: string,
  dashboardUrl: string,
) {
  return baseTemplate(
    "Welcome to DentalIQ",
    `
    <h2 style="margin:0 0 12px;color:#0f172a">Welcome, ${name}! 🎉</h2>
    <p style="color:#475569;line-height:1.6"><strong>${clinicName}</strong> is set up and ready to go.</p>
    ${btn(dashboardUrl, "Open Dashboard")}`,
  );
}

function agentTaskEmailHtml(clinicName: string, count: number, url: string) {
  return baseTemplate(
    "Cortex tasks awaiting review",
    `
    <h2 style="margin:0 0 12px;color:#0f172a">⚡ Cortex Update</h2>
    <p style="color:#475569;line-height:1.6">
      Your agents completed their scan for <strong>${clinicName}</strong> and generated
      <strong>${count} item${count !== 1 ? "s" : ""}</strong> awaiting your review.
    </p>
    ${btn(url, "Review in Inbox")}
    <p style="color:#94a3b8;font-size:13px">Tasks auto-expire after 7 days if not actioned.</p>`,
  );
}
