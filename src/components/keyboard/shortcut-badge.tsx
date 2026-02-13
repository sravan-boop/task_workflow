"use client";

interface ShortcutBadgeProps {
  keys: string[];
}

export function ShortcutBadge({ keys }: ShortcutBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1">
      {keys.map((key, index) => (
        <kbd
          key={index}
          className="rounded border bg-white px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}
