"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Sparkles,
  Send,
  Bot,
  User,
  Loader2,
  Trash2,
  ArrowRight,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actions?: Array<{ label: string; href: string; type: string }>;
}

interface AiChatPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
}

const STORAGE_KEY = "taskflow-ai-chat-history";

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm TaskFlow AI, your intelligent project management assistant. I can help you with:\n\n- **Finding your priority tasks** ordered by deadline\n- **Navigating TaskFlow** — just ask where anything is\n- **Site guidance** — settings, dark mode, 2FA, notifications, etc.\n- **Project management advice** and task breakdowns\n\nI remember our conversation, so feel free to ask follow-up questions!",
  timestamp: new Date(0),
  actions: [],
};

function loadChatHistory(): Message[] {
  if (typeof window === "undefined") return [WELCOME_MESSAGE];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Message[];
      if (parsed.length > 0) {
        return parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
      }
    }
  } catch {}
  return [WELCOME_MESSAGE];
}

function saveChatHistory(messages: Message[]) {
  try {
    // Keep last 100 messages to avoid localStorage bloat
    const toSave = messages.slice(-100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {}
}

// Simple markdown-like rendering for bold and bullets
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n- /g, '\n• ')
    .replace(/\n(\d+)\. /g, '\n$1. ');
}

export function AiChatPanel({
  open,
  onOpenChange,
  projectId,
}: AiChatPanelProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage after mount
  useEffect(() => {
    setMounted(true);
    const history = loadChatHistory();
    setMessages(history);
    setLoaded(true);
  }, []);

  // Save whenever messages change (after initial load)
  useEffect(() => {
    if (loaded && messages.length > 0) {
      saveChatHistory(messages);
    }
  }, [messages, loaded]);

  const chat = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
          actions: data.actions || [],
        },
      ]);
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `Sorry, I encountered an error: ${error.message}`,
          timestamp: new Date(),
          actions: [],
        },
      ]);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!input.trim() || chat.isPending) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");

    // Build history for the API (exclude welcome message)
    const history = updatedMessages
      .filter((m) => m.id !== "welcome")
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }));

    // Remove the last message (current one) from history since it's sent as 'message'
    history.pop();

    chat.mutate({
      message: input.trim(),
      history: history.length > 0 ? history : undefined,
      context: projectId ? { projectId } : undefined,
    });
  }, [input, chat, messages, projectId]);

  const clearChat = () => {
    setMessages([WELCOME_MESSAGE]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleNavigate = (href: string) => {
    router.push(href);
    onOpenChange(false);
  };

  const suggestedQuestions = [
    "What are my priority tasks?",
    "How do I enable dark mode?",
    "Show me my overdue tasks",
    "How do I set up 2FA?",
    "Where can I change my profile picture?",
    "Guide me through TaskFlow features",
  ];

  if (!mounted) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-[440px] flex-col p-0 sm:max-w-[440px]">
        <SheetHeader className="border-b px-4 py-3 pr-12">
          <div className="flex items-center gap-2">
            <SheetTitle className="flex flex-1 items-center gap-2 text-base">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#4573D2] to-[#AA62E3]">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              TaskFlow AI
            </SheetTitle>
            {messages.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={clearChat}
                title="Clear chat history"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Messages */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" && "justify-end"
                )}
              >
                {message.role === "assistant" && (
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4573D2] to-[#AA62E3]">
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
                <div className="max-w-[85%] space-y-2">
                  <div
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm",
                      message.role === "user"
                        ? "bg-[#4573D2] text-white"
                        : "bg-muted"
                    )}
                  >
                    <div
                      className="whitespace-pre-wrap [&_strong]:font-semibold"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(message.content),
                      }}
                    />
                  </div>

                  {/* Navigation action buttons */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {message.actions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleNavigate(action.href)}
                          className="inline-flex items-center gap-1 rounded-md border bg-white px-2.5 py-1 text-xs font-medium text-[#4573D2] shadow-sm transition-colors hover:bg-[#4573D2] hover:text-white dark:bg-card"
                        >
                          <ArrowRight className="h-3 w-3" />
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {message.role === "user" && (
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#1e1f21]">
                    <User className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
              </div>
            ))}
            {chat.isPending && (
              <div className="flex gap-3">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4573D2] to-[#AA62E3]">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="rounded-xl bg-muted px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Suggested questions (only show initially) */}
          {messages.length <= 1 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Try asking:
              </p>
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                  }}
                  className="block w-full rounded-lg border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t px-4 py-3">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask TaskFlow AI anything..."
              className="text-sm"
              disabled={chat.isPending}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || chat.isPending}
              className="bg-[#4573D2] hover:bg-[#3A63B8]"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            Powered by OpenAI GPT-4o &middot; Chat history is saved locally
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
