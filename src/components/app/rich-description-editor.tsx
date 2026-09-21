"use client";

import * as React from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Code,
  Quote,
  Undo,
  Redo,
} from "lucide-react";

interface RichDescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  placeholder?: string;
  minRows?: number;
  className?: string;
}

export function RichDescriptionEditor({
  value,
  onChange,
  onBlur,
  placeholder = "Add detailed description, notes, and guidelines...",
  minRows = 4,
  className = "",
}: RichDescriptionEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = React.useState(false);
  const [isEmpty, setIsEmpty] = React.useState(!value || value === "<br>" || value.trim() === "");

  // Convert markdown to basic HTML if initial value contains markdown syntax
  const parseInitialContent = (input: string) => {
    if (!input) return "";
    // If it looks like raw markdown rather than HTML tags
    if (
      !/<[a-z][\s\S]*>/i.test(input) &&
      (/[*_#`\-\[\]]/.test(input) || input.includes("\n"))
    ) {
      let html = input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      // Headings
      html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
      html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
      html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

      // Bold & Italic
      html = html.replace(/\*\*(.*?)\*\*/gim, "<b>$1</b>");
      html = html.replace(/\*(.*?)\*/gim, "<i>$1</i>");
      html = html.replace(/~~(.*?)~~/gim, "<s>$1</s>");

      // Links
      html = html.replace(
        /\[(.*?)\]\((.*?)\)/gim,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">$1</a>'
      );

      // Inline code
      html = html.replace(
        /`(.*?)`/gim,
        '<code class="bg-slate-100 text-rose-600 px-1.5 py-0.5 rounded text-[12px] font-mono">$1</code>'
      );

      // Blockquotes
      html = html.replace(
        /^> (.*$)/gim,
        '<blockquote class="border-l-2 border-[#10251F] pl-3 my-1 italic text-slate-600">$1</blockquote>'
      );

      // Newlines to paragraphs / breaks
      html = html
        .split("\n\n")
        .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
        .join("");

      return html;
    }
    return input;
  };

  // Synchronize incoming value changes if not currently being actively typed
  React.useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const currentHtml = el.innerHTML;
    const incomingParsed = parseInitialContent(value || "");

    if (currentHtml !== incomingParsed && !isFocused) {
      el.innerHTML = incomingParsed;
      checkIsEmpty();
    }
  }, [value, isFocused]);

  const checkIsEmpty = () => {
    const el = editorRef.current;
    if (!el) return true;
    const text = el.innerText?.trim() || "";
    const empty = text.length === 0 && !el.querySelector("img, hr, iframe");
    setIsEmpty(empty);
    return empty;
  };

  const handleInput = () => {
    const el = editorRef.current;
    if (!el) return;
    checkIsEmpty();
    onChange(el.innerHTML);
  };

  // Formatting helper with selection preservation and word fallback
  const execCmd = (cmd: string, arg?: string) => {
    const el = editorRef.current;
    if (!el) return;

    el.focus();
    const sel = window.getSelection();

    // If no text selected, try to select word at cursor so user gets instant feedback
    if (sel && sel.isCollapsed && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        const text = node.textContent;
        let start = range.startOffset;
        let end = range.endOffset;

        while (start > 0 && /\S/.test(text[start - 1])) {
          start--;
        }
        while (end < text.length && /\S/.test(text[end])) {
          end++;
        }

        if (start < end) {
          const newRange = document.createRange();
          newRange.setStart(node, start);
          newRange.setEnd(node, end);
          sel.removeAllRanges();
          sel.addRange(newRange);
        }
      }
    }

    document.execCommand(cmd, false, arg);
    handleInput();
  };

  const handleLink = () => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();

    const currentUrl = "https://";
    const url = window.prompt("Enter link URL:", currentUrl);
    if (url && url.trim() && url !== "https://") {
      execCmd("createLink", url.trim());
    }
  };

  const handleCode = () => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();

    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const selectedContent = range.extractContents();
      const codeEl = document.createElement("code");
      codeEl.className = "bg-slate-100 text-rose-600 px-1.5 py-0.5 rounded text-[12px] font-mono";
      codeEl.appendChild(selectedContent);
      range.insertNode(codeEl);
      handleInput();
    } else {
      document.execCommand(
        "insertHTML",
        false,
        '<code class="bg-slate-100 text-rose-600 px-1.5 py-0.5 rounded text-[12px] font-mono">code</code>&nbsp;'
      );
      handleInput();
    }
  };

  const handleBlockquote = () => {
    execCmd("formatBlock", "<blockquote>");
  };

  const handleHeading = () => {
    execCmd("formatBlock", "<h3>");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        execCmd("bold");
      } else if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        execCmd("italic");
      } else if (e.key === "u" || e.key === "U") {
        e.preventDefault();
        execCmd("underline");
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        handleLink();
      }
    }
  };

  return (
    <div
      className={`relative rounded-[14px] border border-[#E2E8F0] bg-white transition-all shadow-2xs ${
        isFocused ? "border-[#10251F] ring-1 ring-[#10251F]/10" : "hover:border-[#CBD5E1]"
      } ${className}`}
    >
      {/* Content Editable Area */}
      <div className="relative p-3.5 pb-2">
        {isEmpty && !isFocused && (
          <div
            onClick={() => editorRef.current?.focus()}
            className="absolute left-3.5 top-3.5 pointer-events-none text-[13.5px] leading-relaxed text-[#94A3B8] italic select-none"
          >
            {placeholder}
          </div>
        )}

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            const el = editorRef.current;
            if (el) onBlur?.(el.innerHTML);
          }}
          onKeyDown={handleKeyDown}
          style={{ minHeight: `${minRows * 24}px` }}
          className="w-full text-[13.5px] leading-relaxed text-[#0F172A] focus:outline-none focus:ring-0 [&>p]:mb-2 [&>h1]:text-lg [&>h1]:font-bold [&>h1]:mb-2 [&>h2]:text-base [&>h2]:font-bold [&>h2]:mb-2 [&>h3]:text-sm [&>h3]:font-bold [&>h3]:mb-1.5 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-2 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-2 [&>blockquote]:border-l-2 [&>blockquote]:border-[#10251F] [&>blockquote]:pl-3 [&>blockquote]:italic [&>blockquote]:text-slate-600 [&>blockquote]:my-2 [&>a]:text-blue-600 [&>a]:underline"
        />
      </div>

      {/* Rich Formatting Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 border-t border-[#F1F5F9] px-2.5 py-1.5 bg-[#FAF9F5]/60 rounded-b-[14px] text-[#64748B]">
        <div className="flex items-center gap-0.5">
          {/* Bold */}
          <button
            type="button"
            title="Bold (Ctrl+B)"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd("bold")}
            className="rounded-md p-1.5 hover:bg-white hover:text-[#0F172A] hover:shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>

          {/* Italic */}
          <button
            type="button"
            title="Italic (Ctrl+I)"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd("italic")}
            className="rounded-md p-1.5 hover:bg-white hover:text-[#0F172A] hover:shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>

          {/* Strikethrough */}
          <button
            type="button"
            title="Strikethrough"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd("strikeThrough")}
            className="rounded-md p-1.5 hover:bg-white hover:text-[#0F172A] hover:shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </button>

          {/* Heading */}
          <button
            type="button"
            title="Heading"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleHeading}
            className="rounded-md p-1.5 hover:bg-white hover:text-[#0F172A] hover:shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <Heading3 className="h-3.5 w-3.5" />
          </button>

          <span className="mx-1 h-3.5 w-px bg-[#E2E8F0]" />

          {/* Bullet List */}
          <button
            type="button"
            title="Bullet List"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd("insertUnorderedList")}
            className="rounded-md p-1.5 hover:bg-white hover:text-[#0F172A] hover:shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <List className="h-3.5 w-3.5" />
          </button>

          {/* Numbered List */}
          <button
            type="button"
            title="Numbered List"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd("insertOrderedList")}
            className="rounded-md p-1.5 hover:bg-white hover:text-[#0F172A] hover:shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </button>

          <span className="mx-1 h-3.5 w-px bg-[#E2E8F0]" />

          {/* Link */}
          <button
            type="button"
            title="Insert Link (Ctrl+K)"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleLink}
            className="rounded-md p-1.5 hover:bg-white hover:text-[#0F172A] hover:shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </button>

          {/* Code */}
          <button
            type="button"
            title="Inline Code"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleCode}
            className="rounded-md p-1.5 hover:bg-white hover:text-[#0F172A] hover:shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <Code className="h-3.5 w-3.5" />
          </button>

          {/* Quote */}
          <button
            type="button"
            title="Quote"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleBlockquote}
            className="rounded-md p-1.5 hover:bg-white hover:text-[#0F172A] hover:shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <Quote className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            title="Undo (Ctrl+Z)"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd("undo")}
            className="rounded-md p-1.5 hover:bg-white hover:text-[#0F172A] hover:shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <Undo className="h-3 w-3" />
          </button>
          <button
            type="button"
            title="Redo (Ctrl+Y)"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd("redo")}
            className="rounded-md p-1.5 hover:bg-white hover:text-[#0F172A] hover:shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <Redo className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
