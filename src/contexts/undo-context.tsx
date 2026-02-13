"use client";

import { createContext, useContext, useCallback } from "react";
import { toast } from "sonner";

interface UndoEntry {
  label: string;
  undoFn: () => void | Promise<void>;
}

interface UndoContextValue {
  pushUndo: (label: string, undoFn: () => void | Promise<void>) => void;
}

const UndoContext = createContext<UndoContextValue>({
  pushUndo: () => {},
});

export function UndoProvider({ children }: { children: React.ReactNode }) {
  const pushUndo = useCallback((label: string, undoFn: () => void | Promise<void>) => {
    toast.success(label, {
      action: {
        label: "Undo",
        onClick: () => {
          try {
            undoFn();
          } catch {
            toast.error("Failed to undo action");
          }
        },
      },
      duration: 6000,
    });
  }, []);

  return (
    <UndoContext.Provider value={{ pushUndo }}>
      {children}
    </UndoContext.Provider>
  );
}

export function useUndo() {
  return useContext(UndoContext);
}
