import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Mail, Clock, ExternalLink, ArrowRight, RefreshCw, Trash2 } from "lucide-react";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

interface OutboxItem {
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

import { getFallbackOutboxEmails, clearFallbackOutboxEmails } from "@/lib/email/sendEmail";

async function getOutboxEmails(): Promise<OutboxItem[]> {
  const fallbackEmails = getFallbackOutboxEmails();
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("email_outbox")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) {
      return fallbackEmails as OutboxItem[];
    }

    // Merge DB rows with any in-memory items deduped by id
    const map = new Map<string, OutboxItem>();
    for (const item of data as OutboxItem[]) {
      map.set(item.id, item);
    }
    for (const item of fallbackEmails as OutboxItem[]) {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } catch {
    return fallbackEmails as OutboxItem[];
  }
}

async function clearOutboxAction() {
  "use server";
  clearFallbackOutboxEmails();
  try {
    const admin = createAdminClient();
    await admin.from("email_outbox").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  } catch {}
  revalidatePath("/dev/mailbox");
}

export default async function DevMailboxPage({
  searchParams,
}: {
  searchParams: Promise<{ selected?: string }>;
}) {
  // Block in production
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { selected } = await searchParams;
  const emails = await getOutboxEmails();
  const activeEmail = emails.find((e) => e.id === selected) || emails[0] || null;

  // Extract invite URL from metadata or text if present
  let inviteUrl: string | null = null;
  if (activeEmail) {
    if (activeEmail.metadata && typeof activeEmail.metadata.inviteUrl === "string") {
      inviteUrl = activeEmail.metadata.inviteUrl;
    } else {
      const match = activeEmail.text.match(/http[s]?:\/\/[^\s]+/);
      if (match) inviteUrl = match[0];
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F4EC] text-[#111111] font-sans">
      {/* Top Bar */}
      <header className="h-12 border-b border-[#E9E6DA] bg-[#FFFFFF] px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[#1F9D55]" />
          <h1 className="text-[14px] font-semibold tracking-[-0.01em]">Dev mailbox</h1>
          <span className="text-[12px] text-[#9A9A9A] tabular-nums">
            {emails.length} {emails.length === 1 ? "email" : "emails"}
          </span>
          <span className="px-2 py-0.5 rounded-[4px] bg-[#ECE9DD] text-[11px] font-medium text-[#6B6B6B]">
            Local test environment
          </span>
        </div>

        <div className="flex items-center gap-2">
          <form action={clearOutboxAction}>
            <button
              type="submit"
              className="h-8 px-3 rounded-[8px] border border-[#E9E6DA] bg-white text-[12px] font-medium text-[#6B6B6B] hover:text-[#D93025] hover:bg-[#F4F2EA] transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear outbox
            </button>
          </form>
          <a
            href="/dev/mailbox"
            className="h-8 px-3 rounded-[8px] bg-[#111111] text-white text-[12px] font-medium hover:bg-[#222222] transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </a>
        </div>
      </header>

      {/* Main split view */}
      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[calc(100vh-4rem)]">
        {/* Email List Column */}
        <section className="md:col-span-5 bg-[#FFFFFF] border border-[#E9E6DA] rounded-[12px] overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-[#E9E6DA] bg-[#FAF9F5] flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#6B6B6B]">Outbox messages</span>
            <span className="text-[11px] text-[#9A9A9A]">Newest first</span>
          </div>

          <div className="divide-y divide-[#E9E6DA] overflow-y-auto max-h-[700px] flex-1">
            {emails.length === 0 ? (
              <div className="p-8 text-center text-[#9A9A9A] text-[13px]">
                No emails in outbox. Send an invitation to inspect it here.
              </div>
            ) : (
              emails.map((item) => {
                const isSelected = activeEmail?.id === item.id;
                return (
                  <Link
                    key={item.id}
                    href={`/dev/mailbox?selected=${item.id}`}
                    className={`block p-4 transition-colors ${
                      isSelected ? "bg-[#ECE9DD]" : "hover:bg-[#F4F2EA]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[13px] font-semibold text-[#111111] truncate">
                        {item.recipient}
                      </span>
                      <span className="text-[11px] text-[#9A9A9A] whitespace-nowrap tabular-nums">
                        {new Date(item.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-[12px] font-medium text-[#333333] truncate mb-1">
                      {item.subject}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-[#6B6B6B]">
                      <span className="px-1.5 py-0.5 rounded-[4px] bg-[#FAF9F5] border border-[#E9E6DA]">
                        {item.template}
                      </span>
                      <span className="truncate">From: {item.from_email}</span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>

        {/* Email Preview Column */}
        <section className="md:col-span-7 bg-[#FFFFFF] border border-[#E9E6DA] rounded-[12px] flex flex-col overflow-hidden">
          {activeEmail ? (
            <>
              {/* Header */}
              <div className="p-5 border-b border-[#E9E6DA] bg-[#FAF9F5] space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-[15px] font-semibold text-[#111111]">
                      {activeEmail.subject}
                    </h2>
                    <div className="text-[12px] text-[#6B6B6B] mt-1 space-y-0.5">
                      <p>
                        <strong className="font-medium text-[#111111]">To:</strong>{" "}
                        {activeEmail.recipient}
                      </p>
                      <p>
                        <strong className="font-medium text-[#111111]">From:</strong>{" "}
                        {activeEmail.from_email}
                      </p>
                    </div>
                  </div>
                  {inviteUrl ? (
                    <a
                      href={inviteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 px-3 rounded-[8px] bg-[#111111] text-white text-[12px] font-medium hover:bg-[#222222] transition-colors inline-flex items-center gap-1.5 flex-shrink-0"
                    >
                      Open invite link
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : null}
                </div>
              </div>

              {/* Rendered HTML */}
              <div className="p-6 overflow-y-auto flex-1 bg-[#F6F4EC]">
                <div
                  className="rounded-[8px] overflow-hidden shadow-sm"
                  dangerouslySetInnerHTML={{ __html: activeEmail.html }}
                />
              </div>

              {/* Plain text tab / preview */}
              <div className="border-t border-[#E9E6DA] p-4 bg-[#FFFFFF]">
                <details className="text-[12px] text-[#6B6B6B]">
                  <summary className="cursor-pointer font-medium hover:text-[#111111]">
                    View plain text version
                  </summary>
                  <pre className="mt-2 p-3 rounded-[8px] bg-[#FAF9F5] border border-[#E9E6DA] text-[11px] font-mono whitespace-pre-wrap text-[#333333]">
                    {activeEmail.text}
                  </pre>
                </details>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-[#9A9A9A] text-[13px]">
              Select an email on the left to preview it.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
