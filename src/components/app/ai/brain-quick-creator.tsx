"use client";

import * as React from "react";
import { Sparkles, Loader2, CheckCircle2, ArrowRight, User, Calendar, Flag, Folder, AlertCircle } from "lucide-react";
import { MentionInput, AttachedFileItem, WorkspaceMember } from "./mention-input";
import { WorkspacePerson } from "@/types/people";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export interface BrainQuickCreatorProps {
  type: "task" | "project";
  workspaceId: string;
  people?: WorkspacePerson[];
  onSuccess?: (item: any) => void;
  onCancel?: () => void;
  defaultProjectId?: string;
  defaultDepartmentId?: string;
}

export function BrainQuickCreator({
  type,
  workspaceId,
  people = [],
  onSuccess,
  onCancel,
  defaultProjectId,
  defaultDepartmentId,
}: BrainQuickCreatorProps) {
  const router = useRouter();
  const [prompt, setPrompt] = React.useState("");
  const [attachedFiles, setAttachedFiles] = React.useState<AttachedFileItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<any | null>(null);

  const isProject = type === "project";

  const memberList: WorkspaceMember[] = React.useMemo(() => {
    return people.map((p) => ({
      id: p.id,
      user_id: p.user_id,
      name: p.full_name || p.email.split("@")[0] || "Member",
      role: p.job_title || p.role || "Member",
      email: p.email,
      avatarUrl: p.avatar_url,
    }));
  }, [people]);

  const QUICK_EXAMPLES = isProject
    ? [
        "Brand Identity Redesign with 3 phases for @Tashin Khan, high priority due next month",
        "Mobile App MVP Development sprint with 4 deliverables for Development department",
        "Q3 Customer Success & Support Portal rollout",
      ]
    : [
        "Design checkout payment flow for @Tashin Khan, high priority due this Friday",
        "Set up Supabase database indexes and webhook error logs",
        "Prepare client kickoff presentation slides and attach design system specs",
      ];

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/quick-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          type,
          workspaceId,
          autoCreate: true,
          attachedFiles: attachedFiles.map((f) => ({
            name: f.name,
            size: f.size,
            sizeInBytes: f.sizeInBytes,
            url: f.url,
            type: f.type,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Brain could not parse your request. Please try again.");
      } else {
        setResult(data);
        router.refresh();
        onSuccess?.(data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to communicate with AI.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-1">
      {/* Brain Header */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FAF9F5] border border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#10251F] text-[#C7F34A] flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
              <span>Ropimo Brain AI</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                Cloudflare
              </span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Type naturally — mention teammates with <span className="font-mono font-bold text-slate-700">@</span> to assign and attach files.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!result ? (
        <>
          {/* Natural Language Mention Input */}
          <MentionInput
            value={prompt}
            onChange={setPrompt}
            onSubmit={handleGenerate}
            members={memberList}
            attachedFiles={attachedFiles}
            onAttachedFilesChange={setAttachedFiles}
            disabled={loading}
            minHeight="min-h-[100px]"
            placeholder={
              isProject
                ? "Describe your project, e.g.: 'Client Website Redesign led by @Tashin Khan, high priority, deadline Oct 15th'..."
                : "Describe your task, e.g.: 'Build authentication system for @Tashin Khan, urgent priority, due Friday with test coverage'..."
            }
          />

          {/* Quick Suggestions */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Quick prompts:
            </div>
            <div className="flex flex-col gap-1.5">
              {QUICK_EXAMPLES.map((ex, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(ex)}
                  className="text-left text-[11px] text-slate-600 hover:text-[#0F172A] p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-colors cursor-pointer truncate"
                >
                  "{ex}"
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!prompt.trim() || loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#10251F] text-[#C7F34A] text-xs font-bold hover:bg-[#19362e] disabled:opacity-40 transition-all cursor-pointer shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Brain is creating {isProject ? "project" : "task"}...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Create {isProject ? "Project" : "Task"} with AI</span>
                </>
              )}
            </button>
          </div>
        </>
      ) : (
        /* Success Preview Card */
        <div className="space-y-4 pt-1 animate-in fade-in duration-200">
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{isProject ? "Project" : "Task"} successfully created by Brain!</span>
            </div>

            <div className="p-3 rounded-lg bg-white border border-emerald-100 space-y-2 text-xs">
              <div className="font-bold text-[#0F172A] text-sm">
                {result.parsed?.name || result.parsed?.title}
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                {result.parsed?.description}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                {result.parsed?.priority && (
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold capitalize flex items-center gap-1">
                    <Flag className="w-3 h-3 text-slate-400" />
                    <span>{result.parsed.priority}</span>
                  </span>
                )}
                {result.parsed?.dueDate && (
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{result.parsed.dueDate}</span>
                  </span>
                )}
                {(result.parsed?.assigneeName || result.parsed?.leadName) && (
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>{result.parsed.assigneeName || result.parsed.leadName}</span>
                  </span>
                )}
              </div>

              {result.parsed?.acceptanceCriteria && result.parsed.acceptanceCriteria.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Criteria
                  </span>
                  <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-0.5">
                    {result.parsed.acceptanceCriteria.map((c: string, i: number) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setPrompt("");
                setAttachedFiles([]);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              + Create Another
            </button>
            <button
              type="button"
              onClick={() => {
                onCancel?.();
              }}
              className="px-4 py-1.5 rounded-lg bg-[#10251F] text-[#C7F34A] text-xs font-bold hover:bg-[#19362e] cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
