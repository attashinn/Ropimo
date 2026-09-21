"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Send,
  Bot,
  User,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Loader2,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Calendar,
  Layers,
  FileText,
  Users,
  Briefcase,
  TrendingUp,
} from "lucide-react";
import { SUPPORTED_MODELS, SupportedModelId, AgentAction } from "@/lib/ai/gateway";
import { createTaskAction } from "@/lib/task/actions";
import { createProjectAction } from "@/lib/project/actions";
import { MentionInput, AttachedFileItem, WorkspaceMember } from "./mention-input";
import { MarkdownRenderer } from "./markdown-renderer";
import { cn } from "@/lib/utils";

interface ChatMessageUI {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: AgentAction[];
  timestamp: string;
  model?: string;
  taggedMembers?: WorkspaceMember[];
}

interface AgentChatViewProps {
  workspaceId: string;
  workspaceName?: string;
  userName?: string;
  isDrawer?: boolean;
}

const PRESET_PROMPTS = [
  {
    icon: Layers,
    title: "Sprint Task Breakdown",
    prompt: "Break down our active website redesign project into 4 concrete, prioritized development tasks with assignees and milestones.",
  },
  {
    icon: TrendingUp,
    title: "Workspace Health Check",
    prompt: "Review our current workspace operations, open tasks, and deliverable deadlines. Highlight any potential blockers.",
  },
  {
    icon: Briefcase,
    title: "Draft Job Description",
    prompt: "Draft a modern Job Specification for a Senior Product Designer role, including key deliverables and 5 interview screening questions.",
  },
  {
    icon: FileText,
    title: "Generate Project Kickoff SOP",
    prompt: "Write a step-by-step Standard Operating Procedure (SOP) for team leads onboarding a new client project into Ropimo.",
  },
];

export function AgentChatView({
  workspaceId,
  workspaceName = "Workspace",
  userName = "there",
  isDrawer = false,
}: AgentChatViewProps) {
  const [messages, setMessages] = React.useState<ChatMessageUI[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hello **${userName}**! I am your **Ropimo AI Agent** powered by Cloudflare Workers AI.\n\nI have real-time access to **${workspaceName}**'s projects, tasks, departments, and operations. Ask me to draft tasks, organize sprints, analyze deliverables, or execute workspace actions.`,
      timestamp: "Just now",
      model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [taggedMembers, setTaggedMembers] = React.useState<WorkspaceMember[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = React.useState<WorkspaceMember[]>([]);
  const [attachedFiles, setAttachedFiles] = React.useState<AttachedFileItem[]>([]);
  const [selectedModel, setSelectedModel] = React.useState<SupportedModelId>("@cf/meta/llama-3.3-70b-instruct-fp8-fast");
  const [loading, setLoading] = React.useState(false);
  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);
  const [executedActions, setExecutedActions] = React.useState<Record<string, boolean>>({});
  const [actionLoading, setActionLoading] = React.useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Load workspace members for mentions and rendering
  React.useEffect(() => {
    let isMounted = true;
    fetch("/api/workspace/members")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.members) {
          setWorkspaceMembers(data.members);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const rawQuery = (textToSend || input).trim();
    if (!rawQuery && taggedMembers.length === 0 && attachedFiles.length === 0) return;
    if (loading) return;

    const currentTagged = [...taggedMembers];
    let query = rawQuery;

    if (currentTagged.length > 0) {
      const mentionContext = currentTagged
        .map((m) => `[Teammate Assigned: @${m.name} (${m.role}${m.email ? `, ${m.email}` : ""})]`)
        .join(" ");
      query = query ? `${query}\n\n${mentionContext}` : mentionContext;
    }

    if (attachedFiles.length > 0) {
      query += `\n\n📎 Attached files: ${attachedFiles.map((f) => f.name).join(", ")}`;
    }

    const userMessage: ChatMessageUI = {
      id: `user-${Date.now()}`,
      role: "user",
      content: rawQuery || `Assigned to ${currentTagged.map((m) => "@" + m.name).join(", ")}`,
      taggedMembers: currentTagged,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setTaggedMembers([]);
    setAttachedFiles([]);
    setLoading(true);
    setErrorBanner(null);

    try {
      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          model: selectedModel,
          workspaceId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorBanner(data.error || "Unable to reach Cloudflare Workers AI.");
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: `❌ **Error:** ${data.error || "Unable to reach AI."}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            model: selectedModel,
          },
        ]);
      } else {
        const assistantMessage: ChatMessageUI = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: data.content || "Done.",
          actions: data.actions || [],
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          model: data.modelUsed || selectedModel,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `Connection error: ${err.message || "Failed to reach AI route."}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          model: selectedModel,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAction = async (action: AgentAction) => {
    setActionLoading((prev) => ({ ...prev, [action.id]: true }));
    try {
      if (action.type === "create_task") {
        const res = await createTaskAction({
          workspaceId,
          title: action.payload.title || action.title,
          description: action.payload.description || action.description,
          priority: (action.payload.priority as any) || "medium",
          status: "todo",
        });
        if (res.success) {
          setExecutedActions((prev) => ({ ...prev, [action.id]: true }));
        }
      } else if (action.type === "create_project") {
        const res = await createProjectAction({
          workspaceId,
          name: action.payload.name || action.title,
          description: action.payload.description || action.description,
          status: "in_progress",
        });
        if (res.success) {
          setExecutedActions((prev) => ({ ...prev, [action.id]: true }));
        }
      }
    } catch (e) {
      console.error("Action execution failed:", e);
    } finally {
      setActionLoading((prev) => ({ ...prev, [action.id]: false }));
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-[#FAF9F5] text-[#10251F]", isDrawer ? "p-3 sm:p-4" : "p-3.5 sm:p-5 md:p-6 max-w-6xl mx-auto")}>
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-[#E7E5E0]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#10251F] flex items-center justify-center text-[#C7F34A] shadow-xs shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold tracking-tight text-[#10251F]">
                Ropimo Copilot
              </h2>
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full uppercase tracking-wider flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Cloudflare Workers AI
              </span>
            </div>
            <p className="text-xs text-[#525B58] truncate">
              Autonomous workspace operations & deliverable planning
            </p>
          </div>
        </div>

        {/* Model Selector */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
          <label className="text-xs font-medium text-[#525B58]">Model:</label>
          <div className="relative flex-1 sm:flex-initial">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as SupportedModelId)}
              className="w-full sm:w-auto appearance-none pl-3 pr-8 py-1.5 text-xs font-medium bg-white border border-[#E7E5E0] rounded-xl shadow-2xs hover:border-[#10251F]/30 focus:outline-none focus:ring-1 focus:ring-[#10251F] cursor-pointer"
            >
              {SUPPORTED_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.provider})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#525B58] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Error Alert if any */}
      {errorBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p>{errorBanner}</p>
          </div>
          <button type="button" onClick={() => setErrorBanner(null)} className="text-red-700 hover:text-red-900 cursor-pointer">
            ✕
          </button>
        </motion.div>
      )}

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto py-4 sm:py-6 space-y-4 sm:space-y-5 pr-1">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", damping: 28, stiffness: 380 }}
              className={cn("flex gap-2.5 sm:gap-3 text-sm", isUser ? "justify-end" : "justify-start")}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-[#10251F] text-[#C7F34A] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={cn(
                  "max-w-[92%] sm:max-w-[85%] rounded-2xl p-3.5 sm:p-4 shadow-2xs",
                  isUser
                    ? "bg-[#10251F] text-white rounded-br-sm"
                    : "bg-white border border-[#E7E5E0] text-[#10251F] rounded-bl-sm"
                )}
              >
                {/* Header info */}
                <div className="flex items-center justify-between gap-4 mb-1.5">
                  <span className={cn("text-[11px] font-medium", isUser ? "text-white/70" : "text-[#525B58]")}>
                    {isUser ? "You" : "Ropimo Copilot"}
                  </span>
                  <div className="flex items-center gap-2">
                    {msg.model && (
                      <span className={cn("text-[10px] px-1.5 py-0.2 rounded font-mono", isUser ? "bg-white/10 text-white/80" : "bg-neutral-100 text-neutral-600")}>
                        {msg.model.split("/")[1] || msg.model}
                      </span>
                    )}
                    <span className={cn("text-[10px]", isUser ? "text-white/60" : "text-[#88908D]")}>
                      {msg.timestamp}
                    </span>
                    {!isUser && (
                      <button
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="text-[#88908D] hover:text-[#10251F] transition-colors"
                        title="Copy message"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Tagged Teammates Profile Badges in Chat Bubble */}
                {msg.taggedMembers && msg.taggedMembers.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                    {msg.taggedMembers.map((member) => (
                      <span
                        key={member.id || member.user_id}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold shadow-2xs border transition-all",
                          isUser
                            ? "bg-white text-[#10251F] border-white/40 shadow-xs"
                            : "bg-[#10251F] text-[#C7F34A] border-[#23453a]"
                        )}
                      >
                        <span
                          className={cn(
                            "w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-extrabold shrink-0",
                            isUser ? "bg-[#10251F] text-[#C7F34A]" : "bg-[#C7F34A] text-[#10251F]"
                          )}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                        <span>@{member.name}</span>
                        {member.role && (
                          <span
                            className={cn(
                              "text-[9px] font-mono uppercase tracking-wider px-1 py-0.2 rounded-full",
                              isUser ? "bg-[#10251F]/10 text-[#10251F]" : "bg-white/15 text-white/80"
                            )}
                          >
                            {member.role}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {/* Markdown Content (bold, italics, code, bullet points, headers) */}
                <MarkdownRenderer
                  content={msg.content}
                  isUser={isUser}
                  members={workspaceMembers}
                  className={cn(isUser ? "text-white" : "text-[#10251F]")}
                />

                {/* Structured Workspace Actions */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[#E7E5E0] space-y-2.5">
                    <p className="text-xs font-semibold text-[#10251F] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#10251F]" />
                      Suggested Workspace Actions:
                    </p>
                    <div className="space-y-2">
                      {msg.actions.map((act) => {
                        const isExecuted = executedActions[act.id];
                        const isExecuting = actionLoading[act.id];
                        return (
                          <div
                            key={act.id}
                            className="p-3 bg-[#FAF9F5] border border-[#E7E5E0] rounded-xl flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-0.5">
                              <span className="font-semibold text-[#10251F]">{act.title}</span>
                              {act.description && (
                                <p className="text-[11px] text-[#525B58] line-clamp-1">{act.description}</p>
                              )}
                            </div>
                            <button
                              onClick={() => handleExecuteAction(act)}
                              disabled={isExecuted || isExecuting}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 transition-all",
                                isExecuted
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default"
                                  : "bg-[#10251F] text-[#C7F34A] hover:bg-[#1a3830]"
                              )}
                            >
                              {isExecuting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : isExecuted ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Created
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  Execute
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-lg bg-[#E7E5E0] text-[#10251F] flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </motion.div>
          );
        })}

        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 text-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-[#10251F] text-[#C7F34A] flex items-center justify-center shrink-0 shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-[#E7E5E0] rounded-2xl rounded-bl-sm p-4 text-[#525B58] flex items-center gap-2.5 text-xs shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-[#10251F]" />
              Ropimo Copilot is thinking...
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Preset Action Suggestions (when thread has few messages) */}
      {messages.length <= 2 && (
        <div className="pt-2 pb-4">
          <p className="text-xs font-semibold text-[#525B58] mb-2.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#10251F]" />
            Quick Autonomous Workflows:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PRESET_PROMPTS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.01, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  onClick={() => handleSendMessage(item.prompt)}
                  className="p-3 text-left bg-white border border-[#E7E5E0] hover:border-[#10251F]/40 hover:shadow-2xs rounded-2xl transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-[#10251F] group-hover:text-emerald-700 transition-colors" />
                    <span className="text-xs font-semibold text-[#10251F]">{item.title}</span>
                  </div>
                  <p className="text-[11px] text-[#525B58] line-clamp-1">{item.prompt}</p>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Input Composer */}
      <div className="pt-2 border-t border-[#E7E5E0]">
        <div className="relative">
          <MentionInput
            value={input}
            onChange={setInput}
            onSubmit={() => handleSendMessage()}
            placeholder="Ask AI Copilot to plan, draft tasks, summarize projects... (Type @ to mention teammates)"
            members={workspaceMembers}
            taggedMembers={taggedMembers}
            onTaggedMembersChange={setTaggedMembers}
            attachedFiles={attachedFiles}
            onAttachedFilesChange={setAttachedFiles}
            disabled={loading}
            minHeight={isDrawer ? "min-h-[70px]" : "min-h-[85px]"}
          />
          <motion.button
            whileHover={input.trim() || taggedMembers.length > 0 || attachedFiles.length > 0 ? { scale: 1.05 } : undefined}
            whileTap={input.trim() || taggedMembers.length > 0 || attachedFiles.length > 0 ? { scale: 0.92 } : undefined}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            onClick={() => handleSendMessage()}
            disabled={(!input.trim() && taggedMembers.length === 0 && attachedFiles.length === 0) || loading}
            className={cn(
              "absolute right-3 bottom-3 w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer z-10",
              (input.trim() || taggedMembers.length > 0 || attachedFiles.length > 0) && !loading
                ? "bg-[#10251F] text-[#C7F34A] hover:bg-[#18362d] shadow-xs"
                : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
            )}
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
        <div className="flex items-center justify-between text-[11px] text-[#88908D] pt-2 px-1">
          <span>Type @ to assign teammates • Press Enter to send</span>
          <span>Powered by Cloudflare Workers AI</span>
        </div>
      </div>
    </div>
  );
}
