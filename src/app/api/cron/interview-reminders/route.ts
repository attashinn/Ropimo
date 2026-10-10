import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recruitmentStore } from "@/lib/recruitment/store";
import { sendEmail } from "@/lib/email/sendEmail";
import { formatInterviewDateTime } from "@/lib/hiring/calendar-ics";

export async function GET(request: NextRequest) {
  return handleReminders(request);
}

export async function POST(request: NextRequest) {
  return handleReminders(request);
}

async function handleReminders(request: NextRequest) {
  try {
    // 1. Verify authorization header from Vercel Cron
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized: Invalid CRON_SECRET." }, { status: 401 });
    }

    const now = new Date();
    // 24-hour window: 23 hours to 25 hours from now
    const lowerWindow = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
    const upperWindow = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

    const adminClient = createAdminClient();
    const remindersSent: string[] = [];

    // 1. Query upcoming interviews from DB
    try {
      const { data: interviews } = await adminClient
        .from("interviews")
        .select(`
          *,
          candidates:candidate_id (
            id,
            full_name,
            email
          ),
          job_openings:job_opening_id (
            id,
            title
          )
        `)
        .eq("status", "scheduled")
        .is("reminder_sent_at", null)
        .gte("scheduled_at", lowerWindow)
        .lte("scheduled_at", upperWindow);

      if (interviews && interviews.length > 0) {
        for (const iv of interviews) {
          const cand = iv.candidates as { id?: string; full_name?: string; email?: string } | null;
          const job = iv.job_openings as { id?: string; title?: string } | null;

          if (cand?.email) {
            const tz = iv.timezone || "Asia/Dhaka";
            const candTz = iv.candidate_timezone || "Asia/Dhaka";
            const { fullStr: dateInCandTz } = formatInterviewDateTime(iv.scheduled_at, candTz);
            const { fullStr: dateInCompanyTz } = formatInterviewDateTime(iv.scheduled_at, tz);

            // Send reminder to candidate
            await sendEmail({
              to: cand.email,
              workspaceId: iv.workspace_id,
              fromName: "Ropimo Recruitment Team",
              replyTo: "hr@ropimo.com",
              template: "interview_reminder_24h",
              subject: `Reminder: Upcoming Interview tomorrow for ${job?.title || "Position"}`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
                  <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 12px;">Interview Reminder</h2>
                  <p style="font-size: 14px; line-height: 1.6; color: #333; margin-bottom: 16px;">
                    Hello ${cand.full_name},<br/>
                    This is a reminder that your interview for <strong>${job?.title || "the position"}</strong> is scheduled for tomorrow.
                  </p>
                  <div style="background: #F6F4EC; border: 1px solid #E5E2D6; border-radius: 8px; padding: 16px; margin-bottom: 16px; font-size: 13px; line-height: 1.8;">
                    <div><strong>Round:</strong> ${iv.round_name}</div>
                    <div><strong>Your Time (${candTz}):</strong> ${dateInCandTz}</div>
                    <div><strong>Company Time (${tz}):</strong> ${dateInCompanyTz}</div>
                    <div><strong>Duration:</strong> ${iv.duration_minutes || 45} minutes</div>
                    <div><strong>Meeting:</strong> ${iv.location_or_link || "Online"}</div>
                  </div>
                </div>
              `,
              text: `Interview Reminder: Tomorrow at ${dateInCandTz} (${candTz}) / ${dateInCompanyTz} (${tz}). Round: ${iv.round_name}.`,
            });
          }

          // Mark reminder as sent (idempotent)
          const nowIso = new Date().toISOString();
          await adminClient
            .from("interviews")
            .update({ reminder_sent_at: nowIso })
            .eq("id", iv.id);

          remindersSent.push(iv.id);
        }
      }
    } catch {}

    // 2. Also check in-memory / store for dev / test mode
    const store = recruitmentStore.getStore();
    for (const iv of store.interviews || []) {
      if (
        (iv.status === "scheduled" || iv.status.toLowerCase() === "scheduled") &&
        !iv.reminder_sent_at &&
        iv.scheduled_at >= lowerWindow &&
        iv.scheduled_at <= upperWindow
      ) {
        iv.reminder_sent_at = new Date().toISOString();
        recruitmentStore.saveInterview(iv);
        remindersSent.push(iv.id);
      }
    }

    return NextResponse.json({
      success: true,
      remindersSentCount: remindersSent.length,
      interviewIds: remindersSent,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
