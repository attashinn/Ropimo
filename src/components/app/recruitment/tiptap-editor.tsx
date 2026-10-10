"use client";

import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";

export interface TiptapEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TiptapEditor({
  value,
  onChange,
  placeholder = "Write detailed job responsibilities, role scope, and expectations...",
  disabled = false,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline",
        },
      }),
    ],
    content: value || "",
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[160px] p-3.5 text-xs text-[#111111] focus:outline-none prose prose-xs max-w-none leading-relaxed",
      },
    },
  });

  // Keep editor content in sync when value changes externally (e.g. initial load or reset)
  React.useEffect(() => {
    if (editor && value !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="min-h-[160px] rounded-lg border border-[#E5E2D6] bg-white p-3 text-xs text-[#888888]">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#E5E2D6] bg-white overflow-hidden focus-within:border-[#111111] transition-colors">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-[#E5E2D6] bg-[#FAF9F5] px-2.5 py-1.5 text-xs">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled}
          className={`px-2 py-0.5 rounded font-bold ${
            editor.isActive("bold") ? "bg-[#111111] text-white" : "text-[#555555] hover:bg-[#EAE7DC]"
          }`}
          title="Bold"
        >
          B
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled}
          className={`px-2 py-0.5 rounded italic ${
            editor.isActive("italic") ? "bg-[#111111] text-white" : "text-[#555555] hover:bg-[#EAE7DC]"
          }`}
          title="Italic"
        >
          I
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={disabled}
          className={`px-2 py-0.5 rounded line-through ${
            editor.isActive("strike") ? "bg-[#111111] text-white" : "text-[#555555] hover:bg-[#EAE7DC]"
          }`}
          title="Strikethrough"
        >
          S
        </button>

        <div className="h-4 w-[1px] bg-[#E5E2D6] mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={disabled}
          className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
            editor.isActive("heading", { level: 2 }) ? "bg-[#111111] text-white" : "text-[#555555] hover:bg-[#EAE7DC]"
          }`}
          title="Heading 2"
        >
          H2
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          disabled={disabled}
          className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
            editor.isActive("heading", { level: 3 }) ? "bg-[#111111] text-white" : "text-[#555555] hover:bg-[#EAE7DC]"
          }`}
          title="Heading 3"
        >
          H3
        </button>

        <div className="h-4 w-[1px] bg-[#E5E2D6] mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
          className={`px-2 py-0.5 rounded ${
            editor.isActive("bulletList") ? "bg-[#111111] text-white" : "text-[#555555] hover:bg-[#EAE7DC]"
          }`}
          title="Bullet List"
        >
          • List
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
          className={`px-2 py-0.5 rounded ${
            editor.isActive("orderedList") ? "bg-[#111111] text-white" : "text-[#555555] hover:bg-[#EAE7DC]"
          }`}
          title="Numbered List"
        >
          1. List
        </button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
