"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { WorkspaceMember } from "./mention-input";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isUser?: boolean;
  members?: WorkspaceMember[];
}

export function MarkdownRenderer({
  content,
  className,
  isUser = false,
  members = [],
}: MarkdownRendererProps) {
  if (!content) return null;

  // Split by code blocks first
  const parts = splitCodeBlocks(content);

  return (
    <div className={cn("space-y-2 leading-relaxed text-xs sm:text-[13px]", className)}>
      {parts.map((part, pIdx) => {
        if (part.type === "codeblock") {
          return (
            <div
              key={pIdx}
              className="my-2 rounded-xl overflow-hidden border border-[#E7E5E0] bg-[#10251F] text-[#F3F4F6] text-xs font-mono shadow-xs"
            >
              {part.lang && (
                <div className="px-3 py-1 bg-[#1a3830] text-[#C7F34A] text-[10px] uppercase font-bold tracking-wider border-b border-[#23453a]">
                  {part.lang}
                </div>
              )}
              <pre className="p-3 overflow-x-auto whitespace-pre leading-normal">
                <code>{part.text}</code>
              </pre>
            </div>
          );
        }

        // Regular block: process paragraphs, lists, and headers
        const lines = part.text.split("\n");
        const renderedBlocks: React.ReactNode[] = [];
        let currentList: { type: "ul" | "ol"; items: string[] } | null = null;

        const flushList = (key: string) => {
          if (!currentList) return;
          if (currentList.type === "ul") {
            renderedBlocks.push(
              <ul key={key} className="my-1.5 ml-4 list-disc space-y-1">
                {currentList.items.map((item, idx) => (
                  <li key={idx}>
                    {renderInlineFormatting(item, isUser, members)}
                  </li>
                ))}
              </ul>
            );
          } else {
            renderedBlocks.push(
              <ol key={key} className="my-1.5 ml-4 list-decimal space-y-1">
                {currentList.items.map((item, idx) => (
                  <li key={idx}>
                    {renderInlineFormatting(item, isUser, members)}
                  </li>
                ))}
              </ol>
            );
          }
          currentList = null;
        };

        lines.forEach((line, lIdx) => {
          const trimmed = line.trim();

          // Empty line: flush list and add small spacing
          if (!trimmed) {
            flushList(`list-before-empty-${lIdx}`);
            renderedBlocks.push(<div key={`empty-${lIdx}`} className="h-1.5" />);
            return;
          }

          // Unordered list item: "- " or "* "
          const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
          if (ulMatch) {
            if (currentList && currentList.type !== "ul") {
              flushList(`list-switch-${lIdx}`);
            }
            if (!currentList) {
              currentList = { type: "ul", items: [] };
            }
            currentList.items.push(ulMatch[1]);
            return;
          }

          // Ordered list item: "1. "
          const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
          if (olMatch) {
            if (currentList && currentList.type !== "ol") {
              flushList(`list-switch-${lIdx}`);
            }
            if (!currentList) {
              currentList = { type: "ol", items: [] };
            }
            currentList.items.push(olMatch[1]);
            return;
          }

          // Not a list item: flush any active list
          flushList(`list-before-line-${lIdx}`);

          // Headers
          if (trimmed.startsWith("### ")) {
            renderedBlocks.push(
              <h4 key={`h3-${lIdx}`} className="font-bold text-sm sm:text-base mt-2 mb-1">
                {renderInlineFormatting(trimmed.slice(4), isUser, members)}
              </h4>
            );
            return;
          }
          if (trimmed.startsWith("## ")) {
            renderedBlocks.push(
              <h3 key={`h2-${lIdx}`} className="font-bold text-base sm:text-lg mt-2.5 mb-1.5">
                {renderInlineFormatting(trimmed.slice(3), isUser, members)}
              </h3>
            );
            return;
          }
          if (trimmed.startsWith("# ")) {
            renderedBlocks.push(
              <h2 key={`h1-${lIdx}`} className="font-bold text-lg sm:text-xl mt-3 mb-2">
                {renderInlineFormatting(trimmed.slice(2), isUser, members)}
              </h2>
            );
            return;
          }

          // Horizontal rule
          if (trimmed === "---" || trimmed === "***") {
            renderedBlocks.push(
              <hr key={`hr-${lIdx}`} className="my-2.5 border-[#E7E5E0] dark:border-white/10" />
            );
            return;
          }

          // Normal paragraph line
          renderedBlocks.push(
            <p key={`p-${lIdx}`} className="min-h-[1.25em]">
              {renderInlineFormatting(line, isUser, members)}
            </p>
          );
        });

        flushList(`list-final-${pIdx}`);

        return <React.Fragment key={pIdx}>{renderedBlocks}</React.Fragment>;
      })}
    </div>
  );
}

function splitCodeBlocks(text: string): Array<{ type: "text" | "codeblock"; text: string; lang?: string }> {
  const result: Array<{ type: "text" | "codeblock"; text: string; lang?: string }> = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push({
        type: "text",
        text: text.slice(lastIndex, match.index),
      });
    }
    result.push({
      type: "codeblock",
      lang: match[1]?.trim(),
      text: match[2],
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    result.push({
      type: "text",
      text: text.slice(lastIndex),
    });
  }

  return result;
}

/**
 * Render inline tokens:
 * 1. Bold: **text**
 * 2. Italic: *text*
 * 3. Inline code: `code`
 * 4. Teammate @Mentions: @Name or @[Name]
 */
function renderInlineFormatting(
  text: string,
  isUser: boolean,
  members: WorkspaceMember[]
): React.ReactNode {
  // We tokenize into elements: text, bold, italic, code, mention
  // Build a master regex with capture groups
  // 1: bold **...**
  // 2: code `...`
  // 3: italic *...*
  // 4: mention @Name
  
  // Create sorted member names regex if members exist
  const memberNames = members
    .map((m) => m.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  const mentionPattern = memberNames.length > 0
    ? `@(?:${memberNames.join("|")}|[a-zA-Z0-9_-]+)`
    : `@[a-zA-Z0-9_-]+`;

  const tokenRegex = new RegExp(
    `(\\*\\*[^*]+?\\*\\*)|(\`[^\`]+?\`)|((?<!\\*)\\*[^*]+?\\*(?!\\*))|(${mentionPattern})`,
    "g"
  );

  const nodes: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      nodes.push(text.slice(lastIdx, match.index));
    }

    const fullMatch = match[0];

    // Case 1: Bold **text**
    if (match[1]) {
      const inner = fullMatch.slice(2, -2);
      nodes.push(
        <strong
          key={match.index}
          className={cn(
            "font-bold tracking-tight",
            isUser ? "text-white font-extrabold" : "text-[#10251F] font-bold"
          )}
        >
          {inner}
        </strong>
      );
    }
    // Case 2: Inline code `text`
    else if (match[2]) {
      const inner = fullMatch.slice(1, -1);
      nodes.push(
        <code
          key={match.index}
          className={cn(
            "px-1.5 py-0.5 rounded-md font-mono text-[11px] font-medium transition-colors",
            isUser
              ? "bg-white/15 text-white border border-white/20"
              : "bg-[#10251F]/8 text-[#10251F] border border-[#10251F]/15"
          )}
        >
          {inner}
        </code>
      );
    }
    // Case 3: Italic *text*
    else if (match[3]) {
      const inner = fullMatch.slice(1, -1);
      nodes.push(
        <em key={match.index} className="italic">
          {inner}
        </em>
      );
    }
    // Case 4: Mention @Name
    else if (match[4]) {
      const mentionText = fullMatch;
      const cleanName = mentionText.slice(1).trim();
      const matchedMember = members.find(
        (m) => m.name.toLowerCase() === cleanName.toLowerCase()
      );

      nodes.push(
        <span
          key={match.index}
          className={cn(
            "inline-flex items-center gap-1.5 px-2 py-0.5 mx-0.5 rounded-full text-[11px] font-semibold align-baseline shadow-2xs border transition-all select-none",
            isUser
              ? "bg-white text-[#10251F] border-white/40 shadow-xs"
              : "bg-[#10251F] text-[#C7F34A] border-[#23453a]"
          )}
        >
          <span
            className={cn(
              "w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0",
              isUser
                ? "bg-[#10251F] text-[#C7F34A]"
                : "bg-[#C7F34A] text-[#10251F]"
            )}
          >
            {cleanName.charAt(0).toUpperCase()}
          </span>
          <span className="truncate max-w-[120px]">@{cleanName}</span>
          {matchedMember?.role && (
            <span
              className={cn(
                "text-[9px] font-normal px-1 py-0.2 rounded-full uppercase tracking-wider font-mono",
                isUser ? "bg-[#10251F]/10 text-[#10251F]" : "bg-white/15 text-white/80"
              )}
            >
              {matchedMember.role}
            </span>
          )}
        </span>
      );
    }

    lastIdx = match.index + fullMatch.length;
  }

  if (lastIdx < text.length) {
    nodes.push(text.slice(lastIdx));
  }

  return nodes.length === 0 ? text : <>{nodes}</>;
}
