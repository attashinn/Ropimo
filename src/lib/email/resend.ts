/**
 * Ropimo Email Service — Centralized Resend Integration
 *
 * SECURITY:
 *  - Never import in client components or browser code.
 *  - RESEND_API_KEY is read ONLY here, server-side.
 *  - Recipients are always resolved server-side from DB — never trusted from the browser.
 *
 * FAILURE HANDLING:
 *  - Email failures NEVER break the primary business action.
 *  - All failures are logged server-side.
 *  - Callers always receive { success: boolean, error?, emailId? }.
 */
import { Resend } from "resend";
import {
  buildInvitationEmail,
  buildWelcomeEmail,
  buildTaskAssignedEmail,
  buildProjectInvitationEmail,
  buildLeaveRequestedEmail,
  buildLeaveApprovedEmail,
  buildLeaveRejectedEmail,
  buildPasswordResetEmail,
} from "./templates";

// ─────────────────────────────────────────────────────────────────────────────
// 1. CLIENT INITIALISATION (lazy — only when actually sending)
// ─────────────────────────────────────────────────────────────────────────────

let _resend: Resend | null = null;

function getResendClient(): Resend {
  if (_resend) return _resend;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "[Ropimo Email] RESEND_API_KEY is not set. " +
        "Add it to .env.local as a server-only variable (no NEXT_PUBLIC_ prefix)."
    );
  }

  _resend = new Resend(apiKey);
  return _resend;
}

function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || "Ropimo <onboarding@resend.dev>";
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SHARED RESULT TYPE
// ─────────────────────────────────────────────────────────────────────────────

export interface EmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CORE SEND HELPER
// ─────────────────────────────────────────────────────────────────────────────

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  tag?: string; // for logging
}): Promise<EmailResult> {
  try {
    const resend = getResendClient();
    const from = getFromAddress();

    const { data, error } = await resend.emails.send({
      from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    });

    if (error) {
      console.error(`[Ropimo Email][${opts.tag || "send"}] Resend error:`, error);
      return { success: false, error: error.message };
    }

    console.log(`[Ropimo Email][${opts.tag || "send"}] Sent → ${opts.to} | id=${data?.id}`);
    return { success: true, emailId: data?.id };
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error(`[Ropimo Email][${opts.tag || "send"}] Unexpected error:`, msg);
    return { success: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PUBLIC EMAIL FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

// ── 4.1 Workspace Invitation ──────────────────────────────────────────────────

export interface SendInvitationEmailParams {
  workspaceName: string;
  recipientEmail: string;
  recipientName: string;
  role: string;
  inviteUrl: string;
  expiresAt: string;
  invitedByName?: string | null;
  jobTitle?: string | null;
  departmentName?: string | null;
}

export async function sendInvitationEmail(params: SendInvitationEmailParams): Promise<EmailResult> {
  return sendEmail({
    to: params.recipientEmail,
    subject: `You've been invited to join ${params.workspaceName} on Ropimo`,
    html: buildInvitationEmail(params),
    tag: "invitation",
  });
}

// ── 4.2 Welcome Email (after accepting invitation) ────────────────────────────

export interface SendWelcomeEmailParams {
  workspaceName: string;
  recipientEmail: string;
  recipientName: string;
  dashboardUrl: string;
}

export async function sendWelcomeEmail(params: SendWelcomeEmailParams): Promise<EmailResult> {
  return sendEmail({
    to: params.recipientEmail,
    subject: `Welcome to ${params.workspaceName} — You're all set!`,
    html: buildWelcomeEmail(params),
    tag: "welcome",
  });
}

// ── 4.3 Task Assigned ─────────────────────────────────────────────────────────

export interface SendTaskAssignedEmailParams {
  recipientEmail: string;
  recipientName: string;
  taskTitle: string;
  taskUrl: string;
  workspaceName: string;
  assignedByName: string;
  projectName?: string | null;
  departmentName?: string | null;
  dueDate?: string | null;
  priority?: string | null;
}

export async function sendTaskAssignedEmail(params: SendTaskAssignedEmailParams): Promise<EmailResult> {
  return sendEmail({
    to: params.recipientEmail,
    subject: `New task assigned: ${params.taskTitle}`,
    html: buildTaskAssignedEmail(params),
    tag: "task_assigned",
  });
}

// ── 4.4 Project Invitation ────────────────────────────────────────────────────

export interface SendProjectInvitationEmailParams {
  recipientEmail: string;
  recipientName: string;
  projectName: string;
  projectUrl: string;
  workspaceName: string;
  addedByName: string;
  departmentName?: string | null;
  projectLeadName?: string | null;
  memberRole?: string | null;
}

export async function sendProjectInvitationEmail(params: SendProjectInvitationEmailParams): Promise<EmailResult> {
  return sendEmail({
    to: params.recipientEmail,
    subject: `You've been added to ${params.projectName} on Ropimo`,
    html: buildProjectInvitationEmail(params),
    tag: "project_invitation",
  });
}

// ── 4.5 Leave Requested (notify approver) ─────────────────────────────────────

export interface SendLeaveRequestedEmailParams {
  approverEmail: string;
  approverName: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  reason: string;
  reviewUrl: string;
  workspaceName: string;
}

export async function sendLeaveRequestedEmail(params: SendLeaveRequestedEmailParams): Promise<EmailResult> {
  return sendEmail({
    to: params.approverEmail,
    subject: `Leave request from ${params.employeeName} — Action required`,
    html: buildLeaveRequestedEmail(params),
    tag: "leave_requested",
  });
}

// ── 4.6 Leave Approved (notify employee) ──────────────────────────────────────

export interface SendLeaveApprovedEmailParams {
  recipientEmail: string;
  recipientName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  approvedByName: string;
  workspaceName: string;
  dashboardUrl: string;
}

export async function sendLeaveApprovedEmail(params: SendLeaveApprovedEmailParams): Promise<EmailResult> {
  return sendEmail({
    to: params.recipientEmail,
    subject: `Your ${params.leaveType} has been approved`,
    html: buildLeaveApprovedEmail(params),
    tag: "leave_approved",
  });
}

// ── 4.7 Leave Rejected (notify employee) ─────────────────────────────────────

export interface SendLeaveRejectedEmailParams {
  recipientEmail: string;
  recipientName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  rejectionReason: string;
  rejectedByName: string;
  workspaceName: string;
  dashboardUrl: string;
}

export async function sendLeaveRejectedEmail(params: SendLeaveRejectedEmailParams): Promise<EmailResult> {
  return sendEmail({
    to: params.recipientEmail,
    subject: `Your ${params.leaveType} request was not approved`,
    html: buildLeaveRejectedEmail(params),
    tag: "leave_rejected",
  });
}

// ── 4.8 Password Reset ────────────────────────────────────────────────────────

export interface SendPasswordResetEmailParams {
  recipientEmail: string;
  recipientName: string;
  resetUrl: string;
  workspaceName: string;
}

export async function sendPasswordResetEmail(params: SendPasswordResetEmailParams): Promise<EmailResult> {
  return sendEmail({
    to: params.recipientEmail,
    subject: "Reset your Ropimo password",
    html: buildPasswordResetEmail(params),
    tag: "password_reset",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. DEVELOPMENT TEST HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * sendTestEmail — DEV ONLY
 * Sends a test email to verify Resend connectivity and template rendering.
 * NEVER exposed to end users — call only from internal test scripts or admin routes.
 */
export async function sendTestEmail(recipientEmail: string): Promise<EmailResult> {
  if (process.env.NODE_ENV === "production") {
    return { success: false, error: "sendTestEmail() is not available in production." };
  }

  return sendEmail({
    to: recipientEmail,
    subject: "Ropimo Email System — Test",
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #FAF9F5; color: #18221E; margin: 0; padding: 40px 20px; }
          .card { max-width: 540px; margin: 0 auto; background: #fff; border: 1px solid #D8DDD4; border-radius: 16px; padding: 32px; }
          .logo { font-size: 20px; font-weight: 800; color: #10251F; margin-bottom: 20px; }
          h1 { font-size: 20px; font-weight: 700; color: #18221E; margin: 0 0 12px; }
          p { font-size: 14px; line-height: 1.6; color: #65706A; }
          .badge { display: inline-block; background: #EAF4E2; color: #246244; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 6px; margin-top: 16px; }
        </style></head>
        <body>
          <div class="card">
            <div class="logo">ROPIMO</div>
            <h1>Email System Test ✓</h1>
            <p>This is a test email from the Ropimo email infrastructure.</p>
            <p>If you're seeing this, Resend is connected and working correctly.</p>
            <div class="badge">Resend Connection: PASS</div>
            <p style="margin-top: 24px; font-size: 12px; color: #8C9489;">
              Sent at: ${new Date().toISOString()}<br>
              From: ${process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"}
            </p>
          </div>
        </body>
      </html>
    `,
    tag: "test",
  });
}
