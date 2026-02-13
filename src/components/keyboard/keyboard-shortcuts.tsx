"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShortcutBadge } from "@/components/keyboard/shortcut-badge";

const shortcutCategories = [
  {
    name: "Navigation",
    shortcuts: [
      { description: "Search", keys: ["⌘", "K"] },
      { description: "Inbox", keys: ["Tab", "I"] },
    ],
  },
  {
    name: "Tasks",
    shortcuts: [
      { description: "Quick add", keys: ["Tab", "Q"] },
      { description: "Open task", keys: ["Enter"] },
      { description: "Complete task", keys: ["Space"] },
    ],
  },
  {
    name: "General",
    shortcuts: [
      { description: "Close", keys: ["Esc"] },
      { description: "Shortcuts reference", keys: ["?"] },
    ],
  },
];

export function KeyboardShortcuts() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const lastKeyRef = useRef<string | null>(null);
  const lastKeyTimeRef = useRef<number>(0);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Escape: dispatch close-panel (always works, even in inputs)
      if (event.key === "Escape") {
        window.dispatchEvent(new CustomEvent("close-panel"));
        return;
      }

      // Skip other shortcuts if user is typing in an input
      if (isInputFocused) return;

      // Tab+Q sequence: dispatch quick-add-task
      if (event.key === "Tab") {
        event.preventDefault();
        lastKeyRef.current = "Tab";
        lastKeyTimeRef.current = Date.now();
        return;
      }

      if (event.key === "q" || event.key === "Q") {
        const now = Date.now();
        if (
          lastKeyRef.current === "Tab" &&
          now - lastKeyTimeRef.current <= 300
        ) {
          window.dispatchEvent(new CustomEvent("quick-add-task"));
          lastKeyRef.current = null;
          lastKeyTimeRef.current = 0;
          return;
        }
      }

      // ?: open shortcuts reference dialog
      if (event.key === "?") {
        setDialogOpen(true);
        return;
      }

      // Reset sequence tracking for any other key
      lastKeyRef.current = null;
      lastKeyTimeRef.current = 0;
    },
    []
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {shortcutCategories.map((category) => (
            <div key={category.name}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {category.name}
              </h3>
              <div className="space-y-2">
                {category.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <ShortcutBadge keys={shortcut.keys} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
