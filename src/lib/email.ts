import nodemailer from "nodemailer";
import { getCachedEmailConfig, ensureHubConfigLoaded } from "./config";
import { logger } from "./logger";

/**
 * Creates and returns a Nodemailer transporter based on current DB config or .env
 */
export async function getEmailTransporter() {
  await ensureHubConfigLoaded();
  const config = getCachedEmailConfig();

  if (!config.isConfigured) {
    throw new Error(
      "Outbound email service is not configured. Please configure your SMTP Host, Username, and Password in Settings."
    );
  }

  const port = Number(config.smtpPort);
  // Default: port 465 is secure (SSL/TLS), port 587 uses STARTTLS
  const secure = config.smtpUseTls ? port === 465 : false;

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port,
    secure,
    auth: {
      user: config.smtpUsername,
      pass: config.smtpPassword,
    },
    tls: {
      rejectUnauthorized: false, // Helps avoid self-signed cert failures in corporate environments
    },
  });

  return { transporter, config };
}

/**
 * Verify SMTP connection credentials
 */
export async function verifySmtpConnection(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const { transporter, config } = await getEmailTransporter();
    await transporter.verify();
    return {
      success: true,
      message: `SMTP connection to ${config.smtpHost}:${config.smtpPort} verified successfully!`,
    };
  } catch (err: any) {
    logger.error(`SMTP verification error: ${err.message}`);
    return {
      success: false,
      message: err.message || "Failed to connect to SMTP server. Please check your credentials.",
    };
  }
}

/**
 * Send an invitation email directly to an employee
 */
export async function sendInviteEmail(params: {
  to: string;
  inviteUrl: string;
  role: string;
  invitedBy?: string;
  allowedAppCount?: number;
}): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const { transporter, config } = await getEmailTransporter();
    const fromAddress = `"${config.defaultFromName}" <${config.defaultFromEmail}>`;
    const targetRole = params.role.toUpperCase() === "ADMIN" ? "Administrator" : "Employee";

    const subject = `You have been invited to join Ace Payment Hub`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to Ace Payment Hub</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #070b12;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #f1f5f9;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #070b12;
      padding: 40px 0;
    }
    .main {
      background-color: #0f172a;
      margin: 0 auto;
      max-width: 560px;
      border: 1px solid #1e293b;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .header {
      background: linear-gradient(135deg, #1d4ed8, #4338ca);
      padding: 32px 32px 28px 32px;
      text-align: center;
    }
    .logo-badge {
      display: inline-block;
      width: 48px;
      height: 48px;
      line-height: 48px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      margin-bottom: 12px;
      font-size: 24px;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 6px 0 0 0;
      color: #bfdbfe;
      font-size: 13px;
    }
    .content {
      padding: 32px;
      color: #cbd5e1;
      font-size: 14px;
      line-height: 1.6;
    }
    .greeting {
      font-size: 16px;
      font-weight: 600;
      color: #f8fafc;
      margin-bottom: 12px;
    }
    .role-card {
      background-color: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 16px 20px;
      margin: 20px 0;
    }
    .role-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .role-label {
      color: #94a3b8;
      font-size: 12px;
    }
    .role-value {
      color: #60a5fa;
      font-weight: 600;
      font-size: 13px;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0 24px 0;
    }
    .btn {
      display: inline-block;
      background: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 14px;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
    }
    .expiry {
      text-align: center;
      color: #94a3b8;
      font-size: 12px;
      margin-top: -12px;
      margin-bottom: 24px;
    }
    .fallback-box {
      background-color: #090d16;
      border: 1px dashed #334155;
      border-radius: 8px;
      padding: 12px;
      margin-top: 24px;
      word-break: break-all;
      font-size: 11px;
      color: #94a3b8;
      font-family: monospace;
    }
    .footer {
      border-top: 1px solid #1e293b;
      padding: 20px 32px;
      text-align: center;
      font-size: 11px;
      color: #64748b;
      background-color: #0b1120;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main">
      <div class="header">
        <div class="logo-badge">💳</div>
        <h1>Ace Central Payment Hub</h1>
        <p>Enterprise Payment Gateway & Licensing Aggregator</p>
      </div>

      <div class="content">
        <div class="greeting">Hello,</div>
        <p>
          You have been invited by <strong>${params.invitedBy || "an Administrator"}</strong> to collaborate on the <strong>Ace Central Payment Hub</strong>.
        </p>

        <div class="role-card">
          <div style="margin-bottom: 8px;">
            <span style="color: #94a3b8; font-size: 12px;">Assigned Role:</span><br>
            <strong style="color: #60a5fa; font-size: 14px;">${targetRole}</strong>
          </div>
          ${
            params.allowedAppCount !== undefined && params.role.toUpperCase() !== "ADMIN"
              ? `<div style="font-size: 12px; color: #94a3b8;">
                  Authorized Application Access: <strong style="color: #f1f5f9;">${params.allowedAppCount} App${params.allowedAppCount === 1 ? "" : "s"}</strong>
                 </div>`
              : ""
          }
        </div>

        <p>
          Click the button below to accept your invitation, create your password, and activate your account:
        </p>

        <div class="btn-container">
          <a href="${params.inviteUrl}" class="btn" target="_blank">Accept Invitation & Setup Account →</a>
        </div>

        <div class="expiry">
          ⏳ This invitation link is secure and valid for <strong>7 days</strong>.
        </div>

        <div class="fallback-box">
          If the button does not work, copy and paste this link into your browser:<br>
          <a href="${params.inviteUrl}" style="color: #38bdf8; text-decoration: underline;">${params.inviteUrl}</a>
        </div>
      </div>

      <div class="footer">
        &copy; ${new Date().getFullYear()} Ace Payment Hub. All rights reserved.<br>
        If you did not expect this invitation, you can safely ignore this email.
      </div>
    </div>
  </div>
</body>
</html>
`;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: params.to,
      subject,
      html,
    });

    logger.info(`Invite email successfully sent to ${params.to} (MessageId: ${info.messageId})`);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (err: any) {
    logger.error(`Failed to send invite email to ${params.to}: ${err.message}`);
    return {
      success: false,
      error: err.message || "Failed to dispatch email",
    };
  }
}

/**
 * Send a quick test email to verify SMTP configuration
 */
export async function sendTestEmail(to: string): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const { transporter, config } = await getEmailTransporter();
    const fromAddress = `"${config.defaultFromName}" <${config.defaultFromEmail}>`;

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject: `[Test] Ace Payment Hub SMTP Connection Test`,
      html: `
        <div style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #334155;">
          <h2 style="color: #10b981; margin-top: 0;">✅ SMTP Gateway Connected Successfully!</h2>
          <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5;">
            This is a test email sent from <strong>Ace Central Payment Hub</strong> to verify your outbound SMTP email configuration.
          </p>
          <div style="background: #1e293b; padding: 12px 16px; border-radius: 8px; font-size: 12px; color: #94a3b8; margin: 16px 0;">
            <div><strong>SMTP Host:</strong> ${config.smtpHost}:${config.smtpPort}</div>
            <div><strong>Sender Name:</strong> ${config.defaultFromName}</div>
            <div><strong>Sender Email:</strong> ${config.defaultFromEmail}</div>
            <div><strong>Sent At:</strong> ${new Date().toLocaleString()}</div>
          </div>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">
            Your system is now ready to dispatch team invitations directly to employee inboxes.
          </p>
        </div>
      `,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to send test email",
    };
  }
}

