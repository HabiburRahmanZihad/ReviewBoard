"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  /** Control visibility from outside (e.g. reveal a generated password); otherwise it manages itself. */
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
};

/** Password field with a show/hide (eye) button. */
export function PasswordInput({ className, visible, onVisibleChange, ...props }: PasswordInputProps) {
  const [internalVisible, setInternalVisible] = useState(false);
  const shown = visible ?? internalVisible;

  const toggle = () => {
    if (onVisibleChange) onVisibleChange(!shown);
    else setInternalVisible(!shown);
  };

  return (
    <div className="relative">
      <Input {...props} type={shown ? "text" : "password"} className={cn("pr-10", className)} />
      <button
        type="button"
        onClick={toggle}
        disabled={props.disabled}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        aria-controls={props.id}
        title={shown ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
      >
        {shown ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
}
