"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface BulkSelectionContextType {
  selectedTaskIds: Set<string>;
  toggle: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  count: number;
}

const BulkSelectionContext = createContext<BulkSelectionContextType | null>(null);

export function BulkSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(
    new Set()
  );

  const toggle = useCallback((id: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedTaskIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTaskIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedTaskIds.has(id),
    [selectedTaskIds]
  );

  return (
    <BulkSelectionContext.Provider
      value={{
        selectedTaskIds,
        toggle,
        selectAll,
        clearSelection,
        isSelected,
        count: selectedTaskIds.size,
      }}
    >
      {children}
    </BulkSelectionContext.Provider>
  );
}

export function useBulkSelection() {
  const ctx = useContext(BulkSelectionContext);
  if (!ctx)
    throw new Error(
      "useBulkSelection must be used within BulkSelectionProvider"
    );
  return ctx;
}
