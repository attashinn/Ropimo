/**
 * Legacy re-export shim — maintains backward compatibility with existing imports.
 * The real implementation is now in src/lib/email/resend.ts.
 *
 * @deprecated Import directly from "@/lib/email/resend" in new code.
 */
export { sendInvitationEmail as sendWorkspaceInvitationEmail } from "./resend";
export type { SendInvitationEmailParams } from "./resend";
