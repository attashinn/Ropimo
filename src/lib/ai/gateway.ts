/**
 * Cloudflare Workers AI Client for Ropimo
 * Interacts with https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1/chat/completions
 * Using Cloudflare User API Token
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface WorkspaceContextData {
  workspaceName?: string;
  userName?: string;
  userRole?: string;
  projects?: Array<{ id: string; name: string; status?: string; progress?: number }>;
  tasks?: Array<{ id: string; title: string; status?: string; priority?: string; dueDate?: string }>;
  departments?: Array<{ id: string; name: string }>;
  teamMembers?: Array<{ id: string; name: string; email?: string }>;
}

export interface GatewayResponse {
  success: boolean;
  content?: string;
  error?: string;
  isVerificationRequired?: boolean;
  modelUsed?: string;
  actions?: AgentAction[];
}

export interface AgentAction {
  id: string;
  type: "create_task" | "create_project" | "draft_job" | "draft_policy";
  title: string;
  description: string;
  payload: Record<string, any>;
}

export const SUPPORTED_MODELS = [
  {
    id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    name: "Llama 3.3 70B",
    provider: "Meta",
    description: "Flagship intelligence for deep planning, reasoning, and coding",
    badge: "Recommended",
  },
  {
    id: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
    name: "DeepSeek R1 32B",
    provider: "DeepSeek",
    description: "Advanced reasoning model with chain-of-thought analysis",
    badge: "Reasoning",
  },
  {
    id: "@cf/meta/llama-3.1-8b-instruct",
    name: "Llama 3.1 8B",
    provider: "Meta",
    description: "Ultra-fast response for day-to-day task breakdowns and rapid queries",
    badge: "Fast",
  },
  {
    id: "@cf/meta/llama-3.2-3b-instruct",
    name: "Llama 3.2 3B",
    provider: "Meta",
    description: "Lightweight, snappy assistant for quick summaries",
    badge: "Light",
  },
] as const;

export type SupportedModelId = (typeof SUPPORTED_MODELS)[number]["id"];

/**
 * Builds standard system prompt injecting Ropimo workspace context
 */
export function buildWorkspaceSystemPrompt(ctx?: WorkspaceContextData): string {
  let prompt = `You are Ropimo AI Agent, the intelligent autonomous operations co-pilot for the Ropimo workspace management platform powered by Cloudflare Workers AI.
Your job is to assist team leads, project managers, and team members with project planning, task breakdown, department coordination, meeting notes, HR job specs, and company velocity.

Tone & Persona:
- Ultra-professional, concise, helpful, and action-oriented.
- Format responses clearly using markdown (bullet points, bold key points, clean headers).
- When a user asks you to create or plan something (e.g. "Create 3 tasks for the design sprint", "Set up a new marketing campaign"), provide the breakdown AND suggest structured actions.

Structured Action Capability:
When you recommend creating tasks, projects, or job postings, you can embed an actionable block at the very end of your response inside a fenced JSON block with the language identifier "ropimo-actions":
\`\`\`ropimo-actions
[
  {
    "type": "create_task",
    "title": "Task title",
    "description": "Short details",
    "priority": "high",
    "estimatedDays": 3
  }
]
\`\`\`
The Ropimo UI will automatically convert these blocks into interactive one-click execution buttons for the user.
`;

  if (ctx) {
    prompt += `\n\nCurrent Workspace Context:
- Workspace: ${ctx.workspaceName || "Workspace"}
- Active User: ${ctx.userName || "Team Member"} (Role: ${ctx.userRole || "Member"})`;

    if (ctx.departments && ctx.departments.length > 0) {
      prompt += `\n- Departments: ${ctx.departments.map((d) => d.name).join(", ")}`;
    }

    if (ctx.projects && ctx.projects.length > 0) {
      prompt += `\n- Active Projects: ${ctx.projects.map((p) => `${p.name} (${p.status || "active"})`).slice(0, 8).join(", ")}`;
    }

    if (ctx.tasks && ctx.tasks.length > 0) {
      prompt += `\n- Recent Open Tasks: ${ctx.tasks.map((t) => `${t.title} [${t.priority || "normal"}]`).slice(0, 6).join(", ")}`;
    }

    if (ctx.teamMembers && ctx.teamMembers.length > 0) {
      prompt += `\n- Team Members: ${ctx.teamMembers.map((m) => m.name).slice(0, 10).join(", ")}`;
    }
  }

  return prompt;
}

/**
 * Extracts action JSON blocks from agent response
 */
export function extractAgentActions(text: string): { cleanedText: string; actions: AgentAction[] } {
  const actions: AgentAction[] = [];
  let cleanedText = text;

  const actionRegex = /```ropimo-actions\s*([\s\S]*?)\s*```/g;
  let match;

  while ((match = actionRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) {
        parsed.forEach((item, index) => {
          actions.push({
            id: `action-${Date.now()}-${index}`,
            type: item.type || "create_task",
            title: item.title || "Untitled Action",
            description: item.description || "",
            payload: item,
          });
        });
      }
    } catch {
      // JSON parse error in action block - ignore
    }
  }

  cleanedText = cleanedText.replace(/```ropimo-actions\s*[\s\S]*?\s*```/g, "").trim();

  return { cleanedText, actions };
}

/**
 * Send chat completion request to Cloudflare Workers AI
 */
export async function queryAIGateway(params: {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  workspaceContext?: WorkspaceContextData;
}): Promise<GatewayResponse> {
  const token = process.env.CLOUDFLARE_AI_TOKEN || "";
  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.CLOUDFLARE_R2_ACCOUNT_ID ||
    "";
  const model = params.model || "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

  if (!token) {
    return {
      success: false,
      error: "Cloudflare AI token is missing. Please set CLOUDFLARE_AI_TOKEN in your environment.",
    };
  }

  const systemPrompt = buildWorkspaceSystemPrompt(params.workspaceContext);

  const fullMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...params.messages,
  ];

  try {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: fullMessages,
        temperature: params.temperature ?? 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.success === false || data.errors?.length > 0) {
      const errMsg =
        data?.errors?.[0]?.message ||
        data?.error?.message ||
        `Cloudflare Workers AI returned status ${response.status}`;
      return {
        success: false,
        error: errMsg,
      };
    }

    let rawContent = data?.choices?.[0]?.message?.content || "";

    // Clean up DeepSeek reasoning think tags if present
    if (rawContent.includes("</think>")) {
      const parts = rawContent.split("</think>");
      rawContent = parts[parts.length - 1].trim();
    }

    const { cleanedText, actions } = extractAgentActions(rawContent);

    return {
      success: true,
      content: cleanedText,
      actions,
      modelUsed: model,
    };
  } catch (error: any) {
    console.error("Cloudflare AI request error:", error);
    return {
      success: false,
      error: error.message || "Failed to communicate with Cloudflare Workers AI.",
    };
  }
}
