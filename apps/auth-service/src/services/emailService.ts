import { getEnv } from "@dentaliq/config";
import { createLogger } from "@dentaliq/logger";

const logger = createLogger("email-service");

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
      subject: "One step left — verify your DentalIQ account",
      html: verificationEmailHtml(name, url),
      text: `Hi ${name},\n\nVerify your email address to activate your DentalIQ account:\n${url}\n\nThis link expires in 24 hours. If you didn't sign up, you can safely ignore this email.\n\n— The DentalIQ Team`,
    });
  }

  async sendPasswordResetEmail(email: string, name: string, token: string) {
    const url = `${this.env.APP_URL}/reset-password?token=${token}`;
    await this.send({
      to: email,
      subject: "Reset your DentalIQ password",
      html: passwordResetEmailHtml(name, url),
      text: `Hi ${name},\n\nWe received a request to reset your DentalIQ password. Click the link below to set a new one:\n${url}\n\nThis link expires in 1 hour. If you didn't request this, no action is needed — your password remains unchanged.\n\n— The DentalIQ Team`,
    });
  }

  async sendPasswordChangedEmail(email: string, name: string) {
    await this.send({
      to: email,
      subject: "Your DentalIQ password was changed",
      html: passwordChangedEmailHtml(name),
      text: `Hi ${name},\n\nYour DentalIQ password was successfully updated.\n\nIf you made this change, no action is needed.\n\nIf you did NOT make this change, contact our security team immediately at security@dentaliq.ca.\n\n— The DentalIQ Team`,
    });
  }

  async sendMfaEnabledEmail(email: string, name: string) {
    await this.send({
      to: email,
      subject: "Two-factor authentication is now active",
      html: mfaEnabledEmailHtml(name),
      text: `Hi ${name},\n\nTwo-factor authentication (MFA) is now enabled on your DentalIQ account. Your clinic is PHIPA-compliant.\n\nEach login will now require a 6-digit code from your authenticator app.\n\nKeep your backup codes saved in a safe, offline location.\n\nIf you did not make this change, contact security@dentaliq.ca immediately.\n\n— The DentalIQ Team`,
    });
  }

  async sendWelcomeEmail(email: string, name: string, clinicName: string, plan: string) {
    const dashboardUrl = `${this.env.APP_URL}/dashboard`;
    await this.send({
      to: email,
      subject: `${clinicName} is live on DentalIQ — let's get started`,
      html: welcomeEmailHtml(name, clinicName, plan, dashboardUrl),
      text: `Hi ${name},\n\nWelcome to DentalIQ! Your workspace for ${clinicName} is fully set up on the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan.\n\nOpen your dashboard: ${dashboardUrl}\n\nNeed help? Reply to this email or visit docs.dentaliq.ca.\n\n— The DentalIQ Team`,
    });
  }

  async sendAgentTaskNotification(email: string, clinicName: string, taskCount: number) {
    const url = `${this.env.APP_URL}/dashboard/cortex/inbox`;
    await this.send({
      to: email,
      subject: `Cortex: ${taskCount} item${taskCount !== 1 ? "s" : ""} need your review — ${clinicName}`,
      html: agentTaskEmailHtml(clinicName, taskCount, url),
      text: `Your Cortex agents completed their scan for ${clinicName}.\n\n${taskCount} new item${taskCount !== 1 ? "s" : ""} require your review before any action is taken.\n\nOpen your inbox: ${url}\n\nTasks expire automatically after 7 days.\n\n— Cortex by DentalIQ`,
    });
  }

  async sendInviteEmail(email: string, name: string, clinicName: string, adminName: string, inviteUrl: string) {
    await this.send({
      to: email,
      subject: `${adminName} has invited you to ${clinicName} on DentalIQ`,
      html: inviteEmailHtml(name, clinicName, adminName, inviteUrl),
      text: `Hi ${name},\n\n${clinicName} uses DentalIQ and ${adminName} has created access for you to the clinic.\n\nClick the link below to set up your account. This link expires in 7 days.\n\n${inviteUrl}\n\nYou'll be guided through setting a password, enabling two-factor authentication, and agreeing to DentalIQ's terms before you can access the dashboard.\n\nIf you weren't expecting this invitation, you can safely ignore this email.\n\n— The DentalIQ Team`,
    });
  }

  async sendAgreementEmail(email: string, name: string) {
    const appUrl = this.env.APP_URL;
    await this.send({
      to: email,
      subject: "Your DentalIQ Legal Agreement & Privacy Notice",
      html: agreementEmailHtml(name, appUrl),
      text: `Hi ${name},\n\nThank you for creating a DentalIQ account. This email contains a summary of the legal agreements that govern your use of our platform.\n\nBy creating your account and using DentalIQ, you confirmed that you have read and agreed to:\n\n1. Terms of Service — ${appUrl}/legal/terms\n2. Privacy Policy — ${appUrl}/legal/privacy\n3. Data Processing Agreement — ${appUrl}/legal/dpa\n4. Acceptable Use Policy — ${appUrl}/legal/acceptable-use\n\nThese documents govern how DentalIQ operates, how we handle your clinic's data, and your rights as a user.\n\nFor PHIPA-related inquiries, email: privacy@dentaliq.ca\nFor general legal questions: legal@dentaliq.ca\n\nDentalIQ Technologies Inc.\nToronto, ON, Canada\n\n— The DentalIQ Team`,
    });
  }

  private async send(payload: EmailPayload) {
    const mode = this.env.EMAIL_MODE ?? "console";
    logger.info({ to: payload.to, subject: payload.subject, mode }, "Attempting to send email");
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
      logger.error({ err, to: payload.to, subject: payload.subject }, "Email send failed");
      throw err;
    }
  }

  private async sendViaSMTP(payload: EmailPayload) {
    const nodemailer = require("nodemailer");
    const env = this.env;
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? "" }
        : undefined,
    });
    const info = await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    logger.info(
      { to: payload.to, subject: payload.subject, messageId: info.messageId, response: info.response },
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
    if (!res.ok) throw new Error(`Resend API error ${res.status}: ${await res.text()}`);
    logger.info({ to: payload.to, subject: payload.subject }, "Email sent via Resend");
  }

  private printToConsole(payload: EmailPayload) {
    const line = "─".repeat(60);
    logger.info(
      `\n${line}\n📧  EMAIL (console mode)\n    To:      ${payload.to}\n    Subject: ${payload.subject}\n\n${payload.text.split("\n").map((l) => "    " + l).join("\n")}\n${line}`,
    );
  }
}

// ─────────────────────────────────────────────────────────────
// BASE TEMPLATE
// ─────────────────────────────────────────────────────────────

function baseTemplate(preheader: string, title: string, accentColor: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<meta name="x-apple-disable-message-reformatting"/>
<title>${title}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
  body { margin: 0 !important; padding: 0 !important; background-color: #f0ede8; width: 100% !important; }

  /* ── Content area classes (used inside .content div only) ── */
  .content {
    padding: 40px 44px 36px;
    color: #334155;
    line-height: 1.75;
    font-size: 15px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
  }
  .content h1 { margin: 0 0 20px; color: #0f172a; font-size: 26px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.25; }
  .content p { margin: 0 0 16px; color: #475569; }
  .content p strong { color: #1e293b; font-weight: 600; }
  .content a { color: #0f766e; text-decoration: none; font-weight: 500; }
  .content a:hover { text-decoration: underline; }

  .btn-wrap { text-align: center; margin: 28px 0 24px; }
  .btn {
    display: inline-block;
    background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%);
    color: #ffffff !important;
    text-decoration: none !important;
    padding: 14px 34px;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
    mso-padding-alt: 14px 34px;
  }

  .feature-list { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 22px 24px; margin: 20px 0; }
  .feature-item { margin-bottom: 12px; font-size: 14px; color: #475569; line-height: 1.6; }
  .feature-item:last-child { margin-bottom: 0; }
  .feature-item strong { color: #1e293b; font-weight: 600; }

  .info-box    { background: #f0fdfa; border: 1px solid #99f6e4; border-left: 4px solid #0f766e; border-radius: 10px; padding: 16px 18px; margin: 20px 0; font-size: 14px; color: #0f766e; font-weight: 500; line-height: 1.6; }
  .warning-box { background: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; border-radius: 10px; padding: 16px 18px; margin: 20px 0; font-size: 14px; color: #92400e; font-weight: 500; line-height: 1.6; }
  .danger-box  { background: #fff1f2; border: 1px solid #fecdd3; border-left: 4px solid #e11d48; border-radius: 10px; padding: 16px 18px; margin: 20px 0; font-size: 14px; color: #9f1239; font-weight: 500; line-height: 1.6; }
  .success-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; border-radius: 10px; padding: 16px 18px; margin: 20px 0; font-size: 14px; color: #14532d; font-weight: 500; line-height: 1.6; }

  .security-tag { display: inline-block; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 20px; padding: 4px 12px; font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 18px; }
  .security-dot { display: inline-block; width: 7px; height: 7px; background: #16a34a; border-radius: 50%; vertical-align: middle; margin-right: 5px; position: relative; top: -1px; }

  .divider { height: 1px; background-color: #e2e8f0; margin: 28px 0; font-size: 0; line-height: 0; }
  .muted { font-size: 13px; color: #94a3b8; line-height: 1.65; margin-bottom: 0; }
  .muted a { color: #0f766e; }

  /* Stat table uses inline styles — no class needed */

  /* Legal sections */
  .legal-section { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin: 18px 0; }
  .legal-section-header { background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 13px 18px; }
  .legal-section-title { font-size: 14px; font-weight: 700; color: #1e293b; margin: 0 0 2px; }
  .legal-section-subtitle { font-size: 11px; color: #94a3b8; font-weight: 500; margin: 0; }
  .legal-section-body { padding: 16px 18px; }
  .legal-point { font-size: 13px; color: #475569; margin-bottom: 9px; padding-left: 14px; position: relative; line-height: 1.6; }
  .legal-point:last-child { margin-bottom: 0; }
  .legal-point::before { content: '·'; position: absolute; left: 3px; color: #cbd5e1; font-weight: 700; }
  .legal-link-row { text-align: right; padding: 9px 18px 13px; border-top: 1px solid #f1f5f9; }
  .legal-link-btn { font-size: 12px; font-weight: 600; color: #0f766e !important; text-decoration: none; }

  @media only screen and (max-width: 600px) {
    .outer-wrapper { padding: 20px 12px 40px !important; }
    .card { border-radius: 16px !important; }
    .content { padding: 28px 24px 24px !important; }
    .content h1 { font-size: 22px !important; }
    .btn { padding: 13px 24px !important; font-size: 14px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f0ede8;width:100%;">

<!-- Preheader text (hidden) -->
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f0ede8;mso-hide:all;">${preheader}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>

<!-- Outer wrapper table -->
<table class="outer-wrapper" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f0ede8;padding:44px 20px 56px;">
  <tr>
    <td align="center">

      <!-- Card -->
      <table class="card" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:18px;overflow:hidden;border:1px solid rgba(0,0,0,0.07);box-shadow:0 4px 24px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.04);">

        <!-- ═══════════════ HEADER ═══════════════ -->
        <tr>
          <td style="background-color:#0f172a;padding:0;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">

              <!-- Logo row -->
              <tr>
                <td style="padding:26px 36px 22px;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <!-- Icon box — matches the app's sidebar logo exactly -->
                      <td width="36" height="36" style="width:36px;height:36px;background:linear-gradient(135deg,#0f766e,#0d9488);border-radius:10px;text-align:center;vertical-align:middle;mso-line-height-rule:exactly;" bgcolor="#0f766e">
                        <span style="color:#ffffff;font-size:20px;font-weight:800;line-height:36px;font-family:Arial,Helvetica,sans-serif;display:block;text-align:center;">+</span>
                      </td>
                      <!-- Gap -->
                      <td width="10" style="width:10px;font-size:0;line-height:0;">&nbsp;</td>
                      <!-- Wordmark -->
                      <td style="vertical-align:middle;">
                        <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.04em;line-height:1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">DentalIQ</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Accent stripe -->
              <tr>
                <td height="3" style="height:3px;font-size:0;line-height:0;background-color:${accentColor};background:linear-gradient(90deg,${accentColor},${accentColor}cc,${accentColor});">&nbsp;</td>
              </tr>

            </table>
          </td>
        </tr>

        <!-- ═══════════════ BODY ═══════════════ -->
        <tr>
          <td>
            <div class="content">
              ${body}
            </div>
          </td>
        </tr>

        <!-- ═══════════════ FOOTER ═══════════════ -->
        <tr>
          <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:0;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">

              <!-- Mini logo + name -->
              <tr>
                <td align="center" style="padding:24px 36px 0;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center">
                    <tr>
                      <td width="22" height="22" style="width:22px;height:22px;background:linear-gradient(135deg,#0f766e,#0d9488);border-radius:6px;text-align:center;vertical-align:middle;" bgcolor="#0f766e">
                        <span style="color:#ffffff;font-size:13px;font-weight:800;line-height:22px;font-family:Arial,Helvetica,sans-serif;display:block;text-align:center;">+</span>
                      </td>
                      <td width="7" style="width:7px;font-size:0;line-height:0;">&nbsp;</td>
                      <td style="vertical-align:middle;">
                        <span style="color:#475569;font-size:14px;font-weight:800;letter-spacing:-0.03em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">DentalIQ</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Compliance badges -->
              <tr>
                <td align="center" style="padding:12px 36px 0;">
                  <span style="display:inline-block;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:20px;padding:3px 10px;font-size:10px;font-weight:700;color:#64748b;letter-spacing:0.04em;text-transform:uppercase;font-family:Arial,sans-serif;margin:0 3px;">&nbsp;PHIPA Compliant&nbsp;</span><!--
               --><span style="display:inline-block;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:20px;padding:3px 10px;font-size:10px;font-weight:700;color:#64748b;letter-spacing:0.04em;text-transform:uppercase;font-family:Arial,sans-serif;margin:0 3px;">&nbsp;Canadian Hosted&nbsp;</span><!--
               --><span style="display:inline-block;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:20px;padding:3px 10px;font-size:10px;font-weight:700;color:#64748b;letter-spacing:0.04em;text-transform:uppercase;font-family:Arial,sans-serif;margin:0 3px;">&nbsp;SOC 2 Type II&nbsp;</span>
                </td>
              </tr>

              <!-- Nav links -->
              <tr>
                <td align="center" style="padding:10px 36px 0;font-size:12px;font-family:Arial,sans-serif;">
                  <a href="https://dentaliq.ca" style="color:#64748b;text-decoration:none;">Website</a>
                  <span style="color:#cbd5e1;margin:0 6px;">·</span>
                  <a href="https://docs.dentaliq.ca" style="color:#64748b;text-decoration:none;">Help Center</a>
                  <span style="color:#cbd5e1;margin:0 6px;">·</span>
                  <a href="https://dentaliq.ca/legal/privacy" style="color:#64748b;text-decoration:none;">Privacy</a>
                  <span style="color:#cbd5e1;margin:0 6px;">·</span>
                  <a href="https://dentaliq.ca/legal/terms" style="color:#64748b;text-decoration:none;">Terms</a>
                </td>
              </tr>

              <!-- Company info -->
              <tr>
                <td align="center" style="padding:10px 36px 24px;font-size:11px;color:#94a3b8;line-height:1.7;font-family:Arial,sans-serif;text-align:center;">
                  <strong style="color:#64748b;">DentalIQ Technologies Inc.</strong><br/>
                  Toronto, ON, Canada &nbsp;·&nbsp; <a href="mailto:support@dentaliq.ca" style="color:#94a3b8;text-decoration:none;">support@dentaliq.ca</a><br/>
                  This email relates to your DentalIQ account.
                </td>
              </tr>

            </table>
          </td>
        </tr>

      </table>
      <!-- /Card -->

    </td>
  </tr>
</table>
<!-- /Outer wrapper -->

</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────
// VERIFICATION EMAIL
// ─────────────────────────────────────────────────────────────

function verificationEmailHtml(name: string, url: string) {
  const firstName = name.split(" ")[0];
  return baseTemplate(
    "Tap to verify your email and activate your DentalIQ account.",
    "Verify your email — DentalIQ",
    "#0f766e",
    `
    <div class="security-tag"><span class="security-dot"></span> Secure verification</div>
    <h1>You're almost in, ${firstName}.</h1>
    <p>Thanks for signing up for DentalIQ. To activate your account and protect your clinic's data, we need to verify your email address.</p>
    <p>Click the button below — this only takes a second:</p>
    <div class="btn-wrap">
      <a href="${url}" class="btn">✓&nbsp;&nbsp;Verify My Email</a>
    </div>
    <div class="warning-box">
      ⏱ This link expires in <strong>24 hours</strong>. After that, you'll need to request a new one from the login page.
    </div>
    <div class="divider"></div>
    <p class="muted">Didn't create a DentalIQ account? You can safely ignore this email — no account will be activated without verification. If you have concerns, contact <a href="mailto:security@dentaliq.ca">security@dentaliq.ca</a>.</p>
    <p class="muted" style="margin-top:10px;">Having trouble with the button? Copy and paste this URL into your browser:<br/><span style="color:#0f766e;word-break:break-all;">${url}</span></p>
    `,
  );
}

// ─────────────────────────────────────────────────────────────
// PASSWORD RESET EMAIL
// ─────────────────────────────────────────────────────────────

function passwordResetEmailHtml(name: string, url: string) {
  const firstName = name.split(" ")[0];
  return baseTemplate(
    "A password reset was requested for your DentalIQ account.",
    "Reset your password — DentalIQ",
    "#f59e0b",
    `
    <div class="security-tag"><span class="security-dot" style="background:#f59e0b;"></span> Security action required</div>
    <h1>Reset your password</h1>
    <p>Hi ${firstName},</p>
    <p>We received a request to reset the password for your DentalIQ account. If that was you, click the button below to choose a new one.</p>
    <div class="btn-wrap">
      <a href="${url}" class="btn" style="background:linear-gradient(135deg,#d97706,#f59e0b);box-shadow:0 4px 14px rgba(217,119,6,0.35);">🔑&nbsp;&nbsp;Reset My Password</a>
    </div>
    <div class="warning-box">
      ⏱ This reset link expires in <strong>1 hour</strong>. After expiry, you'll need to submit a new request.
    </div>
    <div class="divider"></div>
    <p class="muted"><strong style="color:#92400e;">Didn't request this?</strong> No action is needed — your current password remains unchanged, and this link will expire automatically. If you're concerned about unauthorized access, contact <a href="mailto:security@dentaliq.ca">security@dentaliq.ca</a> immediately.</p>
    <p class="muted" style="margin-top:10px;">Can't click the button? Paste this URL into your browser:<br/><span style="color:#0f766e;word-break:break-all;">${url}</span></p>
    `,
  );
}

// ─────────────────────────────────────────────────────────────
// PASSWORD CHANGED EMAIL
// ─────────────────────────────────────────────────────────────

function passwordChangedEmailHtml(name: string) {
  const firstName = name.split(" ")[0];
  return baseTemplate(
    "Your DentalIQ password was successfully changed.",
    "Password changed — DentalIQ",
    "#16a34a",
    `
    <div class="security-tag"><span class="security-dot"></span> Account security</div>
    <h1>Password updated ✓</h1>
    <p>Hi ${firstName},</p>
    <p>This is a confirmation that your DentalIQ password was <strong>successfully changed</strong> just now. Your account remains fully active.</p>
    <div class="success-box">
      ✓ &nbsp;Password change completed successfully. No further action is needed from you.
    </div>
    <div class="divider"></div>
    <div class="danger-box">
      <strong>🚨 Wasn't you?</strong> If you did not make this change, your account may be compromised. Contact our security team <strong>immediately</strong> at <a href="mailto:security@dentaliq.ca" style="color:#9f1239;">security@dentaliq.ca</a> so we can lock down your account and investigate.
    </div>
    <p class="muted">For your security, all active sessions have been signed out on other devices. You'll need to log in again anywhere you use DentalIQ.</p>
    `,
  );
}

// ─────────────────────────────────────────────────────────────
// MFA ENABLED EMAIL
// ─────────────────────────────────────────────────────────────

function mfaEnabledEmailHtml(name: string) {
  const firstName = name.split(" ")[0];
  return baseTemplate(
    "Two-factor authentication is now active on your account.",
    "MFA enabled — DentalIQ",
    "#6366f1",
    `
    <div class="security-tag"><span class="security-dot" style="background:#6366f1;"></span> Security upgrade</div>
    <h1>Your account is now protected 🛡️</h1>
    <p>Hi ${firstName},</p>
    <p>Two-factor authentication (MFA) is now active on your DentalIQ account. You've taken an important step in keeping your clinic's patient data safe and compliant.</p>
    <div class="info-box" style="background:linear-gradient(135deg,#eef2ff,#e0e7ff);border-color:#c7d2fe;border-left-color:#6366f1;color:#3730a3;">
      🔐 &nbsp;Your account is now <strong>PHIPA-compliant</strong> with multi-factor authentication. This satisfies the technical safeguard requirements under Ontario's Health Information Custodian guidelines.
    </div>
    <div class="feature-list">
      <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#1e293b;letter-spacing:-0.01em;">What to expect going forward</p>
      <div class="feature-item">
        <span class="feature-check" style="background:linear-gradient(135deg,#6366f1,#818cf8);">✓</span>
        <span>Each login will prompt for a <strong>6-digit code</strong> from your authenticator app</span>
      </div>
      <div class="feature-item">
        <span class="feature-check" style="background:linear-gradient(135deg,#6366f1,#818cf8);">✓</span>
        <span>Codes refresh every <strong>30 seconds</strong> and are only valid once</span>
      </div>
      <div class="feature-item">
        <span class="feature-check" style="background:linear-gradient(135deg,#6366f1,#818cf8);">✓</span>
        <span>Your backup codes are your lifeline — store them <strong>offline and securely</strong></span>
      </div>
    </div>
    <div class="divider"></div>
    <p class="muted"><strong style="color:#475569;">🚨 Didn't enable this?</strong> Contact <a href="mailto:security@dentaliq.ca">security@dentaliq.ca</a> immediately to investigate and secure your account.</p>
    `,
  );
}

// ─────────────────────────────────────────────────────────────
// WELCOME EMAIL
// ─────────────────────────────────────────────────────────────

function welcomeEmailHtml(name: string, clinicName: string, plan: string, dashboardUrl: string) {
  const firstName = name.split(" ")[0];

  type PlanConfig = {
    label: string;
    tagline: string;
    accentColor: string;
    accentGrad: string;
    icon: string;
    objective: string;
    features: Array<{ icon: string; title: string; desc: string }>;
  };

  const planConfig: Record<string, PlanConfig> = {
    starter: {
      label: "Starter",
      tagline: "Smart Insurance Estimator",
      accentColor: "#0f766e",
      accentGrad: "linear-gradient(135deg,#0f766e,#14b8a6)",
      icon: "📊",
      objective: "Produce accurate, professional cost estimates in seconds — and eliminate billing disputes before they start.",
      features: [
        { icon: "⚡", title: "Instant Insurance Verification", desc: "Fetch live coverage details without calling the insurer." },
        { icon: "✓", title: "Error-Free Estimates", desc: "99% accurate cost breakdowns that reduce disputes and chargebacks." },
        { icon: "🖨️", title: "Branded Patient Summaries", desc: "Print polished treatment cost summaries that help patients say yes." },
      ],
    },
    pro: {
      label: "Pro",
      tagline: "Clinical Revenue Guard",
      accentColor: "#7c3aed",
      accentGrad: "linear-gradient(135deg,#7c3aed,#a78bfa)",
      icon: "🛡️",
      objective: "Maximize reimbursement, catch denials before they happen, and recover every dollar your practice is owed.",
      features: [
        { icon: "🧠", title: "Predictive Risk Engine", desc: "Identify high-risk claims before submission and fix issues proactively." },
        { icon: "✍️", title: "AI Narrative Assistant", desc: "Generate clinical narratives for major work in under 3 seconds." },
        { icon: "📈", title: "Multi-Clinic Analytics", desc: "Unified revenue dashboards across your entire practice group." },
        { icon: "🔄", title: "Denial Recovery Tracker", desc: "Automated dashboard to track, appeal, and recover denied claims." },
      ],
    },
    cortex: {
      label: "Cortex",
      tagline: "Autonomous AI Practice",
      accentColor: "#6366f1",
      accentGrad: "linear-gradient(135deg,#6366f1,#8b5cf6)",
      icon: "🧠",
      objective: "Your practice runs itself. Six autonomous AI agents handle the back office around the clock — so you can focus on patients.",
      features: [
        { icon: "🤖", title: "24/7 AI Workforce", desc: "Six autonomous agents managing recalls, billing, and communications while you sleep." },
        { icon: "📅", title: "Autonomous Recall", desc: "Agents proactively find and re-schedule overdue patients — zero staff effort." },
        { icon: "🏛️", title: "CDCP Specialist Agent", desc: "A dedicated agent navigating complex government dental plans on your behalf." },
        { icon: "📥", title: "Smart Approval Inbox", desc: "Only review items requiring clinical judgment — everything else is handled." },
      ],
    },
  };

  const cfg = planConfig[plan] ?? planConfig["starter"];

  const featuresHtml = cfg.features.map((f) => `
    <div class="feature-item">
      <strong>${f.title}:</strong> ${f.desc}
    </div>
  `).join("");

  return baseTemplate(
    `Your ${clinicName} workspace is live on DentalIQ ${cfg.label}.`,
    `Welcome to DentalIQ — ${clinicName}`,
    cfg.accentColor,
    `
    <h1>Welcome to DentalIQ, ${firstName}! 🎉</h1>
    <p>Your workspace for <strong>${clinicName}</strong> is fully set up and ready to go. You're on the <strong style="color:${cfg.accentColor};">${cfg.label} — ${cfg.tagline}</strong> plan.</p>

    <div class="info-box" style="background:linear-gradient(135deg,${cfg.accentColor}08,${cfg.accentColor}15);border-color:${cfg.accentColor}40;border-left-color:${cfg.accentColor};color:${cfg.accentColor};">
      <strong>${cfg.icon} Your goal with DentalIQ:</strong><br/>${cfg.objective}
    </div>

    <p style="font-size:14px;font-weight:700;color:#1e293b;margin-bottom:12px;">What's unlocked for your team right now:</p>
    <div class="feature-list">
      ${featuresHtml}
    </div>

    <p>You're all set. Click below to open your command center and explore your new workspace.</p>
    <div class="btn-wrap">
      <a href="${dashboardUrl}" class="btn" style="background:${cfg.accentGrad};box-shadow:0 4px 14px ${cfg.accentColor}50;">
        Launch My Dashboard →
      </a>
    </div>

    <div class="divider"></div>
    <p class="muted">🙋 Need help getting started? Reply to this email, visit our <a href="https://docs.dentaliq.ca">Help Center</a>, or book a free onboarding call with our team.</p>
    `,
  );
}

// ─────────────────────────────────────────────────────────────
// AGENT TASK NOTIFICATION EMAIL
// ─────────────────────────────────────────────────────────────

function agentTaskEmailHtml(clinicName: string, count: number, url: string) {
  return baseTemplate(
    `${count} new item${count !== 1 ? "s" : ""} from your Cortex agents require your review.`,
    "Cortex update — DentalIQ",
    "#6366f1",
    `
    <div class="security-tag" style="background:linear-gradient(135deg,#eef2ff,#f0f4ff);border-color:#c7d2fe;color:#4f46e5;">
      <span class="security-dot" style="background:#6366f1;"></span> Cortex AI
    </div>
    <h1>⚡ Your agents have been busy</h1>
    <p>Your Cortex AI workforce completed its scan for <strong>${clinicName}</strong> and surfaced items that need a human decision before any action is taken.</p>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0;">
      <tr>
        <td width="48%" style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;padding:18px;text-align:center;vertical-align:middle;">
          <div style="font-size:28px;font-weight:800;color:#6366f1;letter-spacing:-0.04em;line-height:1;font-family:Arial,sans-serif;">${count}</div>
          <div style="font-size:11px;font-weight:700;color:#818cf8;text-transform:uppercase;letter-spacing:0.06em;margin-top:5px;font-family:Arial,sans-serif;">Item${count !== 1 ? "s" : ""} to review</div>
        </td>
        <td width="4%" style="font-size:0;line-height:0;">&nbsp;</td>
        <td width="48%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px;text-align:center;vertical-align:middle;">
          <div style="font-size:28px;font-weight:800;color:#16a34a;letter-spacing:-0.04em;line-height:1;font-family:Arial,sans-serif;">0</div>
          <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin-top:5px;font-family:Arial,sans-serif;">Actions without you</div>
        </td>
      </tr>
    </table>

    <p>Open your inbox to approve, reject, or reschedule each item. Your agents are standing by.</p>
    <div class="btn-wrap">
      <a href="${url}" class="btn" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);box-shadow:0 4px 14px rgba(99,102,241,0.4);">
        Open Cortex Inbox →
      </a>
    </div>

    <div class="divider"></div>
    <p class="muted">⏳ Items not actioned within <strong>7 days</strong> will expire automatically. Your agents will never take action without your approval.</p>
    `,
  );
}

// ─────────────────────────────────────────────────────────────
// LEGAL AGREEMENT EMAIL
// ─────────────────────────────────────────────────────────────

function agreementEmailHtml(name: string, appUrl: string) {
  const firstName = name.split(" ")[0];
  const effectiveDate = new Date().toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return baseTemplate(
    "Your DentalIQ legal agreements — Terms of Service, Privacy Policy, and PHIPA Data Processing Agreement.",
    "Your DentalIQ Legal Agreement",
    "#334155",
    `
    <div class="security-tag"><span class="security-dot" style="background:#6366f1;"></span> Legal & Compliance</div>
    <h1>Your agreements with DentalIQ</h1>
    <p>Hi ${firstName},</p>
    <p>Thank you for creating a DentalIQ account. This email serves as your official copy of the legal agreements governing your use of the DentalIQ platform, effective <strong>${effectiveDate}</strong>.</p>

    <div class="info-box">
      ✓ &nbsp;By completing account registration, <strong>${name}</strong> confirmed acceptance of all agreements listed in this email on behalf of their clinic.
    </div>

    <!-- Terms of Service -->
    <div class="legal-section">
      <div class="legal-section-header">
        <span style="font-size:16px;margin-right:8px;vertical-align:middle;">📋</span><span class="legal-section-title" style="display:inline;vertical-align:middle;">Terms of Service</span>
        <p class="legal-section-subtitle">Governs your use of the DentalIQ platform</p>
      </div>
      <div class="legal-section-body">
        <p class="legal-point">DentalIQ grants you a non-exclusive, non-transferable licence to access and use the platform for your clinic's internal business operations.</p>
        <p class="legal-point">You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.</p>
        <p class="legal-point">You may not resell, sublicence, or otherwise make the platform available to third parties outside your clinic organisation without written consent.</p>
        <p class="legal-point">DentalIQ may update the Terms of Service with 30 days' notice. Continued use after notice constitutes acceptance of the updated terms.</p>
        <p class="legal-point">Either party may terminate the agreement with 30 days' written notice. DentalIQ may suspend accounts immediately for material breach or non-payment.</p>
        <p class="legal-point">DentalIQ's liability to you is limited to the fees paid in the 12 months preceding the claim. We are not liable for indirect or consequential damages.</p>
        <p class="legal-point">These terms are governed by the laws of the Province of Ontario, Canada. Disputes are subject to the exclusive jurisdiction of Ontario courts.</p>
      </div>
      <div class="legal-link-row">
        <a href="${appUrl}/legal/terms" class="legal-link-btn">Read full Terms of Service →</a>
      </div>
    </div>

    <!-- Privacy Policy -->
    <div class="legal-section">
      <div class="legal-section-header">
        <span style="font-size:16px;margin-right:8px;vertical-align:middle;">🔒</span><span class="legal-section-title" style="display:inline;vertical-align:middle;">Privacy Policy</span>
        <p class="legal-section-subtitle">How we collect, use, and protect your data</p>
      </div>
      <div class="legal-section-body">
        <p class="legal-point">We collect only the information necessary to provide the DentalIQ service: account details, clinic configuration, usage analytics, and clinical data you choose to input.</p>
        <p class="legal-point">Your clinic's patient data is <strong>never used</strong> to train AI models, sold to third parties, or accessed by DentalIQ staff without your explicit consent or a lawful requirement.</p>
        <p class="legal-point">All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Infrastructure is hosted in Canadian data centres in compliance with provincial data residency requirements.</p>
        <p class="legal-point">We retain your data for the duration of your subscription plus a 90-day grace period, after which it is securely deleted from all systems upon request.</p>
        <p class="legal-point">You have the right to access, correct, export, or request deletion of your data at any time by contacting <a href="mailto:privacy@dentaliq.ca">privacy@dentaliq.ca</a>.</p>
        <p class="legal-point">We may share data with trusted sub-processors (e.g., cloud hosting, analytics) under strict data processing agreements and only to the extent necessary to operate the service.</p>
      </div>
      <div class="legal-link-row">
        <a href="${appUrl}/legal/privacy" class="legal-link-btn">Read full Privacy Policy →</a>
      </div>
    </div>

    <!-- PHIPA & Data Processing Agreement -->
    <div class="legal-section">
      <div class="legal-section-header">
        <span style="font-size:16px;margin-right:8px;vertical-align:middle;">🏥</span><span class="legal-section-title" style="display:inline;vertical-align:middle;">PHIPA Data Processing Agreement</span>
        <p class="legal-section-subtitle">Ontario health information custodian compliance</p>
      </div>
      <div class="legal-section-body">
        <p class="legal-point">DentalIQ operates as an <strong>agent</strong> under the Personal Health Information Protection Act (PHIPA, SO 2004, c 3, Sched A) and processes personal health information (PHI) solely as directed by you, the Health Information Custodian.</p>
        <p class="legal-point">We implement and maintain administrative, physical, and technical safeguards to protect PHI against unauthorised access, use, disclosure, modification, or loss.</p>
        <p class="legal-point">Any privacy breach involving PHI will be reported to you within <strong>72 hours</strong> of discovery. We will assist with any required reporting to the Information and Privacy Commissioner of Ontario (IPC).</p>
        <p class="legal-point">We will not use, disclose, or retain PHI for any purpose other than providing the contracted services and as directed by you in accordance with PHIPA.</p>
        <p class="legal-point">Upon termination, we will return or securely destroy all PHI in our possession within 30 days, in accordance with your instructions and applicable retention schedules.</p>
        <p class="legal-point">Our privacy practices are subject to audit by the IPC. We will cooperate fully with any investigations and provide you with all documentation required for your compliance obligations.</p>
      </div>
      <div class="legal-link-row">
        <a href="${appUrl}/legal/dpa" class="legal-link-btn">Read full DPA →</a>
      </div>
    </div>

    <!-- Acceptable Use Policy -->
    <div class="legal-section">
      <div class="legal-section-header">
        <span style="font-size:16px;margin-right:8px;vertical-align:middle;">✅</span><span class="legal-section-title" style="display:inline;vertical-align:middle;">Acceptable Use Policy</span>
        <p class="legal-section-subtitle">Permitted and prohibited uses of the platform</p>
      </div>
      <div class="legal-section-body">
        <p class="legal-point">DentalIQ is designed exclusively for licensed dental clinics and their authorised staff. Use by non-healthcare entities is prohibited.</p>
        <p class="legal-point">You must not attempt to reverse-engineer, circumvent security controls, or use automated tools to scrape or extract data from the platform.</p>
        <p class="legal-point">All users must be properly credentialed staff with a legitimate need for access to patient data under your clinic's information access policies.</p>
        <p class="legal-point">You are responsible for ensuring your team's compliance with this policy. Violations may result in immediate account suspension without refund.</p>
      </div>
      <div class="legal-link-row">
        <a href="${appUrl}/legal/acceptable-use" class="legal-link-btn">Read full AUP →</a>
      </div>
    </div>

    <div class="divider"></div>

    <p style="font-size:14px;font-weight:700;color:#1e293b;">Your rights & how to reach us</p>
    <p class="muted">You can exercise your rights under PHIPA or PIPEDA, request a copy of your data, or raise a compliance concern by contacting:</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;margin:16px 0;">
      <p style="margin:0 0 6px;font-size:13px;color:#475569;"><strong style="color:#1e293b;">Privacy Officer</strong> — <a href="mailto:privacy@dentaliq.ca">privacy@dentaliq.ca</a></p>
      <p style="margin:0 0 6px;font-size:13px;color:#475569;"><strong style="color:#1e293b;">Security Team</strong> — <a href="mailto:security@dentaliq.ca">security@dentaliq.ca</a></p>
      <p style="margin:0 0 6px;font-size:13px;color:#475569;"><strong style="color:#1e293b;">Legal Enquiries</strong> — <a href="mailto:legal@dentaliq.ca">legal@dentaliq.ca</a></p>
      <p style="margin:0;font-size:13px;color:#475569;"><strong style="color:#1e293b;">General Support</strong> — <a href="mailto:support@dentaliq.ca">support@dentaliq.ca</a></p>
    </div>
    <p class="muted">These agreements are effective as of your account creation date: <strong style="color:#475569;">${effectiveDate}</strong>. Save or print this email for your records.</p>
    `,
  );
}

function inviteEmailHtml(name: string, clinicName: string, adminName: string, inviteUrl: string) {
  return baseTemplate(
    `${adminName} has invited you to join ${clinicName} on DentalIQ`,
    `You've been invited to ${clinicName}`,
    '#0d9488',
    `
    <h1>You've been invited to ${clinicName}</h1>
    <p style="font-size:16px;color:#334155;margin:0 0 24px;">
      <strong>${clinicName}</strong> uses DentalIQ and <strong>${adminName}</strong> has created access for you to the clinic.
    </p>
    <div style="background:linear-gradient(135deg,rgba(13,148,136,0.06),rgba(13,148,136,0.02));border:1px solid rgba(13,148,136,0.15);border-radius:14px;padding:20px 22px;margin:0 0 28px;">
      <p style="margin:0 0 8px;font-size:13px;color:#0f766e;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">What to expect</p>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;align-items:flex-start;gap:10px;">
          <span style="color:#0d9488;font-weight:800;flex-shrink:0;margin-top:1px;">01</span>
          <span style="color:#475569;font-size:14px;"><strong style="color:#1e293b;">Set your password</strong> — Choose a secure password for your account</span>
        </div>
        <div style="display:flex;align-items:flex-start;gap:10px;">
          <span style="color:#0d9488;font-weight:800;flex-shrink:0;margin-top:1px;">02</span>
          <span style="color:#475569;font-size:14px;"><strong style="color:#1e293b;">Enable 2-factor authentication</strong> — Protect patient data with TOTP (Google Authenticator, Authy)</span>
        </div>
        <div style="display:flex;align-items:flex-start;gap:10px;">
          <span style="color:#0d9488;font-weight:800;flex-shrink:0;margin-top:1px;">03</span>
          <span style="color:#475569;font-size:14px;"><strong style="color:#1e293b;">Agree to terms</strong> — Review and accept DentalIQ's terms of service</span>
        </div>
        <div style="display:flex;align-items:flex-start;gap:10px;">
          <span style="color:#0d9488;font-weight:800;flex-shrink:0;margin-top:1px;">04</span>
          <span style="color:#475569;font-size:14px;"><strong style="color:#1e293b;">Access the dashboard</strong> — You'll only see the sections ${adminName} has enabled for you</span>
        </div>
      </div>
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#0f766e,#0d9488);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;letter-spacing:0.01em;">Set up my account →</a>
    </div>
    <p class="muted">This invitation link expires in <strong>7 days</strong>. If it expires, ask ${adminName} to send a new invite.</p>
    <p class="muted">If you weren't expecting this invitation or don't know who ${adminName} is, you can safely ignore this email. No account will be created.</p>
    `,
  );
}
