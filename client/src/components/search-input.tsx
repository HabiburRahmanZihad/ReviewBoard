"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/**
 * Search box that commits after the user pauses typing (debounced), so each
 * keystroke doesn't fire a request. Press "/" anywhere to focus it, Esc to clear.
 */
export function SearchInput({
  value,
  onCommit,
  placeholder,
  className,
}: {
  value: string;
  onCommit: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  const [input, setInput] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  // Follow external resets (e.g. "Clear filters") without fighting the user's typing
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (value === "") setInput("");
  }

  useEffect(() => {
    const next = input.trim();
    if (next === value) return;
    const timer = setTimeout(() => onCommit(next), 300);
    return () => clearTimeout(timer);
  }, [input, value, onCommit]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      e.preventDefault();
      ref.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className={cn("relative w-full sm:max-w-xs", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={ref}
        type="search"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && input) {
            e.preventDefault();
            setInput("");
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={100}
        className="h-9 bg-card pr-9 pl-8"
      />
      {!input && (
        <kbd className="pointer-events-none absolute top-1/2 right-2 hidden h-5 -translate-y-1/2 items-center rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
          /
        </kbd>
      )}
    </div>
  );
}
