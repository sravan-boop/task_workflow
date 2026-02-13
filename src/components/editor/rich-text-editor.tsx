"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Code,
  Link as LinkIcon,
  Heading1,
  Heading2,
} from "lucide-react";

interface RichTextEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  minimal?: boolean;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Write something...",
  editable = true,
  className,
  minimal = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-[#4573D2] underline cursor-pointer" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: content || "",
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none min-h-[60px]",
          "prose-headings:text-[#1e1f21] prose-p:text-[#1e1f21] prose-p:my-1",
          "prose-ul:my-1 prose-ol:my-1 prose-li:my-0",
          "[&_.tiptap-placeholder]:text-muted-foreground"
        ),
      },
    },
  });

  if (!editor) return null;

  if (!editable) {
    return (
      <div className={cn("text-sm", className)}>
        <EditorContent editor={editor} />
      </div>
    );
  }

  return (
    <div className={cn("rounded-md border", className)}>
      {!minimal && (
        <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", editor.isActive("bold") && "bg-muted")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", editor.isActive("italic") && "bg-muted")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", editor.isActive("strike") && "bg-muted")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </Button>
          <div className="mx-1 h-4 w-px bg-border" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7",
              editor.isActive("heading", { level: 1 }) && "bg-muted"
            )}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            <Heading1 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7",
              editor.isActive("heading", { level: 2 }) && "bg-muted"
            )}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Heading2 className="h-3.5 w-3.5" />
          </Button>
          <div className="mx-1 h-4 w-px bg-border" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7",
              editor.isActive("bulletList") && "bg-muted"
            )}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7",
              editor.isActive("orderedList") && "bg-muted"
            )}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7",
              editor.isActive("codeBlock") && "bg-muted"
            )}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            <Code className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      <div className="px-3 py-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
