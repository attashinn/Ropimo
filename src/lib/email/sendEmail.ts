import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  template: string;
  workspaceId?: string;
  replyTo?: string;
  fromName?: string;
  metadata?: Record<string, unknown>;
  attachments?: Array<{ filename: string; content: string | Buffer; contentType?: string }>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  isOutbox?: boolean;
  error?: string;
}

export interface OutboxEmailRecord {
  id: string;
  workspace_id?: string | null;
  recipient: string;
  from_email: string;
  subject: string;
  html: string;
  text: string;
  template: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

const _inMemoryOutbox: OutboxEmailRecord[] = [];

export function getFallbackOutboxEmails(): OutboxEmailRecord[] {
  return [..._inMemoryOutbox].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function clearFallbackOutboxEmails(): void {
  _inMemoryOutbox.length = 0;
}

let _resendClient: Resend | null = null;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!_resendClient) {
    _resendClient = new Resend(apiKey);
  }
  return _resendClient;
}

/**
 * Sends an email via Resend with 2 retries and exponential backoff.
 * If RESEND_API_KEY is missing or EMAIL_MODE=outbox, stores in email_outbox instead.
 * Always logs every dispatch into email_log.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const adminClient = createAdminClient();
  const toAddress = Array.isArray(options.to) ? options.to[0] : options.to;
  const rawFrom =
    process.env.RESEND_FROM ||
    process.env.RESEND_FROM_EMAIL ||
    "Zambic <invite@testing.brnnd.com>";

  let fromAddress = rawFrom;
  if (options.fromName) {
    const emailMatch = rawFrom.match(/<([^>]+)>/);
    const pureEmail = emailMatch ? emailMatch[1] : rawFrom.trim();
    fromAddress = `${options.fromName} <${pureEmail}>`;
  }

  const emailMode = (process.env.EMAIL_MODE || "resend").toLowerCase();
  const resendApiKey = process.env.RESEND_API_KEY;
  const shouldUseOutbox = !resendApiKey || emailMode === "outbox";

  // ───────────────────────────────────────────────────────────────────────────
  // 1. DEV FALLBACK (Outbox Mode)
  // ───────────────────────────────────────────────────────────────────────────
  if (shouldUseOutbox) {
    const memoryRecord: OutboxEmailRecord = {
      id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      workspace_id: options.workspaceId || null,
      recipient: toAddress,
      from_email: fromAddress,
      subject: options.subject,
      html: options.html,
      text: options.text,
      template: options.template,
      metadata: options.metadata || {},
      created_at: new Date().toISOString(),
    };
    _inMemoryOutbox.unshift(memoryRecord);

    try {
      const { data: outboxItem, error: outboxError } = await adminClient
        .from("email_outbox")
        .insert({
          workspace_id: options.workspaceId || null,
          recipient: toAddress,
          from_email: fromAddress,
          subject: options.subject,
          html: options.html,
          text: options.text,
          template: options.template,
          metadata: options.metadata || {},
        })
        .select("id")
        .single();

      if (outboxError) {
        console.warn("[Email Outbox] Failed to write to email_outbox:", outboxError.message);
      } else if (outboxItem?.id) {
        memoryRecord.id = outboxItem.id;
      }

      // Log to email_log as queued/outbox
      await adminClient.from("email_log").insert({
        workspace_id: options.workspaceId || null,
        recipient: toAddress,
        template: options.template,
        status: "outbox",
        resend_message_id: memoryRecord.id,
        error: null,
      });

      return {
        success: true,
        isOutbox: true,
        messageId: memoryRecord.id,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[Email Outbox] Note on DB outbox insert:", msg);
      return { success: true, isOutbox: true, messageId: memoryRecord.id };
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. LIVE RESEND WITH 2 RETRIES & EXPONENTIAL BACKOFF
  // ───────────────────────────────────────────────────────────────────────────
  const resend = getResend();
  if (!resend) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  let attempt = 0;
  const maxAttempts = 3; // 1 initial + 2 retries
  let lastError: Error | null = null;
  let messageId: string | null = null;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const response = await resend.emails.send({
        from: fromAddress,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        attachments: options.attachments as any,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      messageId = response.data?.id || null;
      break; // Success!
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[Resend Attempt ${attempt}/${maxAttempts} Failed]:`, lastError.message);

      if (attempt < maxAttempts) {
        // Exponential backoff: 300ms, then 900ms
        const delay = 300 * Math.pow(3, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  const success = Boolean(messageId);
  const status = success ? "sent" : "failed";
  const errorMessage = success ? null : (lastError?.message || "Send failed");

  // Log every send in email_log
  try {
    await adminClient.from("email_log").insert({
      workspace_id: options.workspaceId || null,
      recipient: toAddress,
      template: options.template,
      status,
      resend_message_id: messageId,
      error: errorMessage,
    });
  } catch (logErr) {
    console.warn("[Email Log] Failed to insert email_log record:", logErr);
  }

  if (success) {
    return { success: true, messageId: messageId || undefined };
  }

  return { success: false, error: errorMessage || undefined };
}
