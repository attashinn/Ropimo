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
  teamMembers?: Array<{ id: string; name: string; email?: string; role?: string }>;
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
  executed?: boolean;
  error?: string;
  result?: unknown;
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
 * Builds standard system prompt injecting Zambic workspace context
 */
export function buildWorkspaceSystemPrompt(ctx?: WorkspaceContextData): string {
  let prompt = `You are Zambic AI Agent, the intelligent autonomous operations co-pilot for the Zambic workspace management platform powered by Cloudflare Workers AI.
Your job is to assist team leads, project managers, and team members with project planning, task breakdown, department coordination, meeting notes, HR job specs, and company velocity.

Tone & Persona:
- Ultra-professional, concise, helpful, and action-oriented.
- When the user asks you to create, plan, or set up projects or tasks (e.g. "CREATE A PROJECT FOR...", "U CREATE THE PROJECT", "Assign tasks to Tashin"), DO NOT write long essays or endless lists of text.
- Provide a brief 1-2 sentence response, followed immediately by the structured \`\`\`ropimo-actions block.

CRITICAL INSTRUCTION - STRUCTURED WORKSPACE ACTIONS:
Whenever you recommend or are commanded to create projects, tasks, or jobs, you MUST include a fenced JSON block with the language identifier "ropimo-actions" at the end of your response:
\`\`\`ropimo-actions
[
  {
    "type": "create_project",
    "title": "Photogpafar Website Development",
    "description": "Develop a website for Photogpafar with backend and frontend infrastructure",
    "status": "in_progress",
    "priority": "high"
  },
  {
    "type": "create_task",
    "title": "Design & implement database schema",
    "description": "Set up database models for user data and content",
    "priority": "high",
    "assigneeName": "tashinkan360"
  },
  {
    "type": "create_task",
    "title": "Build responsive frontend interface",
    "description": "Develop interactive UI components and layout",
    "priority": "high",
    "assigneeName": "me"
  }
]
\`\`\`

Action Rules:
1. "type" can be "create_project" or "create_task".
2. For "create_project": "title" is the project name, "description" is the overview, "status" is "in_progress" or "active".
3. For "create_task": "title" is the task name, "description" is the details, "priority" is "low" | "medium" | "high" | "urgent", and "assigneeName" is the name or username of the person to assign.
4. Keep action descriptions concise so the JSON is compact and never gets cut off. Always close the array and code fence with \`\`\`.
5. If the user asks you to create a project AND tasks, include the "create_project" first in the array, followed by the "create_task" items.
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
      prompt += `\n- Workspace Team Members: ${ctx.teamMembers.map((m) => `${m.name} (${m.role || "Member"}${m.email ? `, ${m.email}` : ""})`).slice(0, 15).join("; ")}`;
    }
  }

  return prompt;
}

/**
 * Extracts action JSON blocks from agent response with robust fallback for truncated output
 */
export function extractAgentActions(text: string): { cleanedText: string; actions: AgentAction[] } {
  const actions: AgentAction[] = [];
  let cleanedText = text;

  // 1. Try standard closed block: ```ropimo-actions ... ```
  const closedRegex = /```ropimo-actions\s*([\s\S]*?)\s*```/g;
  let match;
  let foundClosed = false;

  while ((match = closedRegex.exec(text)) !== null) {
    foundClosed = true;
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) {
        parsed.forEach((item, index) => {
          if (item && typeof item === "object") {
            actions.push({
              id: `action-${Date.now()}-${index}`,
              type: item.type || "create_task",
              title: item.title || item.name || "Untitled Action",
              description: item.description || "",
              payload: item,
            });
          }
        });
      }
    } catch {
      // JSON parse error in action block - try object extraction fallback below
    }
  }

  // 2. If no closed block or actions empty, check for unclosed / truncated block: ```ropimo-actions ...
  if (!foundClosed || actions.length === 0) {
    const unclosedMatch = text.match(/```ropimo-actions\s*([\s\S]*)$/);
    if (unclosedMatch) {
      let rawJson = unclosedMatch[1].trim();
      // Remove trailing ``` if any
      rawJson = rawJson.replace(/```\s*$/, "").trim();

      // Attempt repair by closing open structures
      const repairAttempts = [
        rawJson,
        rawJson + "\n}]",
        rawJson + "\n]",
        rawJson + '"\n}]',
        rawJson + '"}\n]',
      ];

      for (const attempt of repairAttempts) {
        try {
          const parsed = JSON.parse(attempt);
          if (Array.isArray(parsed)) {
            parsed.forEach((item, index) => {
              if (item && typeof item === "object" && (item.type || item.title || item.name)) {
                actions.push({
                  id: `action-${Date.now()}-${index}`,
                  type: item.type || "create_task",
                  title: item.title || item.name || "Untitled Action",
                  description: item.description || "",
                  payload: item,
                });
              }
            });
            if (actions.length > 0) break;
          }
        } catch {
          // Keep trying
        }
      }

      // If repair failed, regex-extract individual complete JSON objects
      if (actions.length === 0) {
        const objectRegex = /\{[^{}]*"type"\s*:\s*"(?:create_task|create_project)"[^{}]*\}/g;
        let objMatch;
        let count = 0;
        while ((objMatch = objectRegex.exec(rawJson)) !== null) {
          try {
            const item = JSON.parse(objMatch[0]);
            actions.push({
              id: `action-${Date.now()}-${count++}`,
              type: item.type || "create_task",
              title: item.title || item.name || "Untitled Action",
              description: item.description || "",
              payload: item,
            });
          } catch {
            // Ignore
          }
        }
      }
    }
  }

  // Completely remove any ropimo-actions fence (closed or unclosed) so raw JSON never pollutes the chat bubble
  cleanedText = cleanedText
    .replace(/```ropimo-actions[\s\S]*?```/g, "")
    .replace(/```ropimo-actions[\s\S]*$/g, "")
    .trim();

  return { cleanedText, actions };
}

/**
 * Map Cloudflare or shorthand model names to OpenRouter model slugs
 */
export function resolveOpenRouterModel(model?: string): string {
  if (!model) return "meta-llama/llama-3.3-70b-instruct";
  if (model.includes("@cf/meta/llama-3.3-70b")) return "meta-llama/llama-3.3-70b-instruct";
  if (model.includes("@cf/deepseek-ai/deepseek-r1")) return "deepseek/deepseek-r1-distill-qwen-32b";
  if (model.includes("@cf/meta/llama-3.1-8b")) return "meta-llama/llama-3.1-8b-instruct";
  if (model.includes("@cf/meta/llama-3.2-3b")) return "meta-llama/llama-3.2-3b-instruct";
  return model.replace(/^@cf\//, "");
}

/**
 * Send chat completion request to OpenRouter
 */
export async function queryOpenRouterDirect(params: {
  apiKey: string;
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
}): Promise<{ success: boolean; content?: string; error?: string; modelUsed?: string }> {
  const model = resolveOpenRouterModel(params.model);
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://zambic.com",
        "X-Title": "Zambic Operations Copilot",
      },
      body: JSON.stringify({
        model,
        messages: params.messages,
        temperature: params.temperature ?? 0.6,
        max_tokens: 3000,
      }),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      const errMsg = data?.error?.message || `OpenRouter returned HTTP ${response.status}`;
      return { success: false, error: errMsg };
    }

    const content = data?.choices?.[0]?.message?.content || "";
    return { success: true, content, modelUsed: model };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "OpenRouter network request failed.";
    return { success: false, error: msg };
  }
}

/**
 * Send chat completion request through OpenRouter (primary) or Cloudflare Workers AI (fallback)
 */
export async function queryAIGateway(params: {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  workspaceContext?: WorkspaceContextData;
}): Promise<GatewayResponse> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const cfToken = process.env.CLOUDFLARE_AI_TOKEN;
  const cfAccountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.CLOUDFLARE_R2_ACCOUNT_ID ||
    "";

  if (!openRouterKey && !cfToken) {
    return {
      success: false,
      error: "No AI provider configured. Please set OPENROUTER_API_KEY or CLOUDFLARE_AI_TOKEN in .env.local.",
    };
  }

  const systemPrompt = buildWorkspaceSystemPrompt(params.workspaceContext);
  const fullMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...params.messages,
  ];

  let rawContent = "";
  let modelUsed = params.model || "meta-llama/llama-3.3-70b-instruct";

  // 1. Prioritize OpenRouter if key is present
  if (openRouterKey) {
    const openRouterResult = await queryOpenRouterDirect({
      apiKey: openRouterKey,
      messages: fullMessages,
      model: params.model,
      temperature: params.temperature,
    });

    if (openRouterResult.success && openRouterResult.content) {
      rawContent = openRouterResult.content;
      modelUsed = openRouterResult.modelUsed || modelUsed;
    } else if (!cfToken) {
      return {
        success: false,
        error: openRouterResult.error || "OpenRouter inference failed.",
      };
    } else {
      console.warn("OpenRouter failed, attempting fallback to Cloudflare Workers AI:", openRouterResult.error);
    }
  }

  // 2. Fallback to Cloudflare Workers AI if OpenRouter was not used or failed
  if (!rawContent && cfToken) {
    const cfModel = params.model || "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
    try {
      const endpoint = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/v1/chat/completions`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: cfModel,
          messages: fullMessages,
          temperature: params.temperature ?? 0.6,
          max_tokens: 3000,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.success === false || data.errors?.length > 0) {
        const errMsg =
          data?.errors?.[0]?.message ||
          data?.error?.message ||
          `Cloudflare Workers AI returned status ${response.status}`;
        return { success: false, error: errMsg };
      }

      rawContent = data?.choices?.[0]?.message?.content || "";
      modelUsed = cfModel;
    } catch (cfErr: unknown) {
      const msg = cfErr instanceof Error ? cfErr.message : "Cloudflare Workers AI request failed.";
      return { success: false, error: msg };
    }
  }

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
    modelUsed,
  };
}


