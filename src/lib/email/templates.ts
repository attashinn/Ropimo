/**
 * Ropimo Email Templates
 * Clean, branded HTML email templates.
 * No external dependencies — pure HTML/inline CSS for maximum email client compatibility.
 */

// ─────────────────────────────────────────────────────────────────────────────
// SHARED LAYOUT PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

const BASE_STYLES = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F4F3EE; color: #18221E; margin: 0; padding: 32px 16px; }
  .wrapper { max-width: 560px; margin: 0 auto; }
  .card { background: #ffffff; border: 1px solid #D8DDD4; border-radius: 16px; overflow: hidden; }
  .header { background: #10251F; padding: 24px 32px; }
  .header-logo { font-size: 18px; font-weight: 900; color: #C7F34A; letter-spacing: -0.5px; }
  .body { padding: 32px; }
  .title { font-size: 22px; font-weight: 700; color: #18221E; margin: 0 0 10px; line-height: 1.3; }
  .subtitle { font-size: 14px; line-height: 1.6; color: #65706A; margin: 0 0 24px; }
  .info-box { background: #FAF9F5; border: 1px solid #E7EADF; border-radius: 10px; padding: 16px 20px; margin: 0 0 28px; }
  .info-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; border-bottom: 1px solid #E7EADF; }
  .info-row:last-child { border-bottom: none; }
  .info-label { color: #65706A; font-weight: 500; }
  .info-value { color: #18221E; font-weight: 600; text-align: right; max-width: 60%; }
  .btn-wrap { text-align: center; margin: 0 0 28px; }
  .btn { display: inline-block; background-color: #10251F; color: #ffffff !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 13px 30px; border-radius: 10px; letter-spacing: 0.01em; }
  .fallback { font-size: 12px; color: #8C9489; text-align: center; margin: 0 0 24px; word-break: break-all; }
  .fallback a { color: #246244; text-decoration: none; }
  .footer { padding: 20px 32px; border-top: 1px solid #E7EADF; }
  .footer-text { font-size: 11px; color: #8C9489; text-align: center; line-height: 1.6; margin: 0; }
`;

function layout(headerTitle: string, body: string, footerNote?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${headerTitle}</title>
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <span class="header-logo">ROPIMO</span>
      </div>
      <div class="body">
        ${body}
      </div>
      <div class="footer">
        <p class="footer-text">${footerNote || "This email was sent by Ropimo. If you have questions, contact your workspace administrator."}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function infoRow(label: string, value: string): string {
  return `<div class="info-row"><span class="info-label">${label}</span><span class="info-value">${value}</span></div>`;
}

function ctaButton(href: string, label: string): string {
  return `<div class="btn-wrap"><a href="${href}" class="btn" target="_blank">${label}</a></div>`;
}

function fallbackLink(url: string): string {
  return `<p class="fallback">Or copy this link: <a href="${url}">${url}</a></p>`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. INVITATION EMAIL
// ─────────────────────────────────────────────────────────────────────────────

export interface InvitationEmailParams {
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

export function buildInvitationEmail(p: InvitationEmailParams): string {
  const inviterPhrase = p.invitedByName
    ? `<strong>${p.invitedByName}</strong> has invited you`
    : "You've been invited";

  const rows = [
    infoRow("Workspace", p.workspaceName),
    infoRow("Role", capitalize(p.role)),
    ...(p.jobTitle ? [infoRow("Position", p.jobTitle)] : []),
    ...(p.departmentName ? [infoRow("Department", p.departmentName)] : []),
    infoRow("Expires", formatDate(p.expiresAt)),
  ].join("\n");

  const body = `
    <h1 class="title">Join ${p.workspaceName}</h1>
    <p class="subtitle">Hello ${p.recipientName},<br><br>${inviterPhrase} to join the <strong>${p.workspaceName}</strong> workspace on Ropimo — your team's all-in-one operating system.</p>
    <div class="info-box">${rows}</div>
    ${ctaButton(p.inviteUrl, "Accept Invitation & Join Workspace")}
    ${fallbackLink(p.inviteUrl)}
  `;

  return layout(
    `Join ${p.workspaceName} on Ropimo`,
    body,
    `This invitation was sent to ${p.recipientEmail}. If you weren't expecting this, you can safely ignore it.`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. WELCOME EMAIL
// ─────────────────────────────────────────────────────────────────────────────

export interface WelcomeEmailParams {
  workspaceName: string;
  recipientEmail: string;
  recipientName: string;
  dashboardUrl: string;
}

export function buildWelcomeEmail(p: WelcomeEmailParams): string {
  const body = `
    <h1 class="title">Welcome to ${p.workspaceName} 👋</h1>
    <p class="subtitle">Hi ${p.recipientName},<br><br>Your account is active and you now have access to the <strong>${p.workspaceName}</strong> workspace on Ropimo. You can manage tasks, track projects, log attendance, and collaborate with your team — all in one place.</p>
    <div class="info-box">
      ${infoRow("Workspace", p.workspaceName)}
      ${infoRow("Your Email", p.recipientEmail)}
      ${infoRow("Status", "Active ✓")}
    </div>
    ${ctaButton(p.dashboardUrl, "Open My Workspace")}
  `;

  return layout(`Welcome to ${p.workspaceName} — Ropimo`, body);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. TASK ASSIGNED EMAIL
// ─────────────────────────────────────────────────────────────────────────────

export interface TaskAssignedEmailParams {
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

export function buildTaskAssignedEmail(p: TaskAssignedEmailParams): string {
  const priorityColor: Record<string, string> = {
    urgent: "#DC2626",
    high: "#EA580C",
    medium: "#D97706",
    low: "#16A34A",
  };

  const priorityLabel = p.priority
    ? `<span style="color: ${priorityColor[p.priority] || "#65706A"}; font-weight: 700;">${capitalize(p.priority)}</span>`
    : "—";

  const rows = [
    infoRow("Assigned by", p.assignedByName),
    ...(p.projectName ? [infoRow("Project", p.projectName)] : []),
    ...(p.departmentName ? [infoRow("Department", p.departmentName)] : []),
    ...(p.dueDate ? [infoRow("Due Date", formatDate(p.dueDate))] : []),
    `<div class="info-row"><span class="info-label">Priority</span><span class="info-value">${priorityLabel}</span></div>`,
  ].join("\n");

  const body = `
    <h1 class="title">New task assigned to you</h1>
    <p class="subtitle">Hi ${p.recipientName},<br><br><strong>${p.assignedByName}</strong> has assigned you a task in <strong>${p.workspaceName}</strong>.</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Task</span><span class="info-value" style="max-width:65%;text-align:right;">${p.taskTitle}</span></div>
      ${rows}
    </div>
    ${ctaButton(p.taskUrl, "View Task")}
  `;

  return layout(`New task: ${p.taskTitle}`, body);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PROJECT INVITATION EMAIL
// ─────────────────────────────────────────────────────────────────────────────

export interface ProjectInvitationEmailParams {
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

export function buildProjectInvitationEmail(p: ProjectInvitationEmailParams): string {
  const rows = [
    infoRow("Project", p.projectName),
    infoRow("Workspace", p.workspaceName),
    infoRow("Added by", p.addedByName),
    ...(p.departmentName ? [infoRow("Department", p.departmentName)] : []),
    ...(p.projectLeadName ? [infoRow("Project Lead", p.projectLeadName)] : []),
    ...(p.memberRole ? [infoRow("Your Role", capitalize(p.memberRole))] : []),
  ].join("\n");

  const body = `
    <h1 class="title">You've been added to a project</h1>
    <p class="subtitle">Hi ${p.recipientName},<br><br><strong>${p.addedByName}</strong> has added you to the <strong>${p.projectName}</strong> project on Ropimo.</p>
    <div class="info-box">${rows}</div>
    ${ctaButton(p.projectUrl, "Open Project")}
  `;

  return layout(`Added to project: ${p.projectName}`, body);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. LEAVE REQUESTED EMAIL (to approver)
// ─────────────────────────────────────────────────────────────────────────────

export interface LeaveRequestedEmailParams {
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

export function buildLeaveRequestedEmail(p: LeaveRequestedEmailParams): string {
  const rows = [
    infoRow("Employee", p.employeeName),
    infoRow("Leave Type", p.leaveType),
    infoRow("From", formatDate(p.startDate)),
    infoRow("To", formatDate(p.endDate)),
    infoRow("Duration", `${p.durationDays} working day${p.durationDays !== 1 ? "s" : ""}`),
  ].join("\n");

  const body = `
    <h1 class="title">Leave request — action required</h1>
    <p class="subtitle">Hi ${p.approverName},<br><br><strong>${p.employeeName}</strong> has submitted a leave request in <strong>${p.workspaceName}</strong> that requires your review.</p>
    <div class="info-box">${rows}</div>
    ${p.reason ? `<div class="info-box" style="margin-top:-12px;"><p style="margin:0;font-size:13px;color:#65706A;font-weight:500;">Reason</p><p style="margin:6px 0 0;font-size:13px;color:#18221E;">${p.reason}</p></div>` : ""}
    ${ctaButton(p.reviewUrl, "Review Request")}
  `;

  return layout(`Leave request from ${p.employeeName}`, body, `This notification is for ${p.approverName}. Only authorized approvers receive this email.`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. LEAVE APPROVED EMAIL (to employee)
// ─────────────────────────────────────────────────────────────────────────────

export interface LeaveApprovedEmailParams {
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

export function buildLeaveApprovedEmail(p: LeaveApprovedEmailParams): string {
  const rows = [
    infoRow("Leave Type", p.leaveType),
    infoRow("From", formatDate(p.startDate)),
    infoRow("To", formatDate(p.endDate)),
    infoRow("Duration", `${p.durationDays} working day${p.durationDays !== 1 ? "s" : ""}`),
    infoRow("Approved by", p.approvedByName),
    infoRow("Status", '<span style="color:#16A34A;font-weight:700;">Approved ✓</span>'),
  ].join("\n");

  const body = `
    <h1 class="title">Your leave has been approved ✓</h1>
    <p class="subtitle">Hi ${p.recipientName},<br><br>Great news — your <strong>${p.leaveType}</strong> request has been approved by <strong>${p.approvedByName}</strong>.</p>
    <div class="info-box">${rows}</div>
    ${ctaButton(p.dashboardUrl, "View My Leave")}
  `;

  return layout(`Leave approved: ${p.leaveType}`, body);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. LEAVE REJECTED EMAIL (to employee)
// ─────────────────────────────────────────────────────────────────────────────

export interface LeaveRejectedEmailParams {
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

export function buildLeaveRejectedEmail(p: LeaveRejectedEmailParams): string {
  const rows = [
    infoRow("Leave Type", p.leaveType),
    infoRow("From", formatDate(p.startDate)),
    infoRow("To", formatDate(p.endDate)),
    infoRow("Decision by", p.rejectedByName),
    infoRow("Status", '<span style="color:#DC2626;font-weight:700;">Not Approved</span>'),
  ].join("\n");

  const body = `
    <h1 class="title">Leave request update</h1>
    <p class="subtitle">Hi ${p.recipientName},<br><br>Your <strong>${p.leaveType}</strong> request has not been approved by <strong>${p.rejectedByName}</strong>. If you have questions, please speak with your manager directly.</p>
    <div class="info-box">${rows}</div>
    ${p.rejectionReason ? `<div class="info-box" style="margin-top:-12px;border-left: 3px solid #DC2626;"><p style="margin:0;font-size:12px;color:#65706A;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Reason</p><p style="margin:6px 0 0;font-size:13px;color:#18221E;">${p.rejectionReason}</p></div>` : ""}
    ${ctaButton(p.dashboardUrl, "View My Leave")}
  `;

  return layout(`Leave request: Not approved`, body);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. PASSWORD RESET EMAIL
// ─────────────────────────────────────────────────────────────────────────────

export interface PasswordResetEmailParams {
  recipientEmail: string;
  recipientName: string;
  resetUrl: string;
  workspaceName: string;
}

export function buildPasswordResetEmail(p: PasswordResetEmailParams): string {
  const body = `
    <h1 class="title">Reset your password</h1>
    <p class="subtitle">Hi ${p.recipientName},<br><br>We received a request to reset your password for your Ropimo account. Click the button below to set a new password. This link expires in 1 hour.</p>
    ${ctaButton(p.resetUrl, "Reset My Password")}
    ${fallbackLink(p.resetUrl)}
  `;

  return layout(
    "Reset your Ropimo password",
    body,
    `If you didn't request a password reset, you can safely ignore this email. Your password will not change.`
  );
}
