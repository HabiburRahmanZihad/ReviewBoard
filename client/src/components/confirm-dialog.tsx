"use client";

import { useEffect, useRef, useState } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Button } from "@/components/ui/button";

export interface ConfirmOptions {
  title: string;
  description?: React.ReactNode;
  /** Name the action, e.g. "Delete user" — never just "OK". */
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type Request = ConfirmOptions & { resolve: (confirmed: boolean) => void };

let showRequest: ((request: Request) => void) | null = null;

/**
 * Ask the user to confirm an action. Resolves `true` only if they chose the
 * confirm button; closing, Escape or Cancel resolve `false`.
 * Rendered by <ConfirmHost /> in the root layout.
 */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!showRequest) {
      resolve(window.confirm(options.title));
      return;
    }
    showRequest({ ...options, resolve });
  });
}

export function ConfirmHost() {
  const [request, setRequest] = useState<Request | null>(null);
  const [open, setOpen] = useState(false);
  const settled = useRef(false);

  useEffect(() => {
    showRequest = (next) => {
      settled.current = false;
      setRequest(next);
      setOpen(true);
    };
    return () => {
      showRequest = null;
    };
  }, []);

  const settle = (confirmed: boolean) => {
    if (!settled.current) {
      settled.current = true;
      request?.resolve(confirmed);
    }
    setOpen(false);
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => !next && settle(false)}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-90 bg-black/30 transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0 dark:bg-black/60" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-91 w-104 max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-popover p-5 text-popover-foreground shadow-xl outline-none transition-[scale,opacity] duration-150 data-starting-style:scale-[0.97] data-starting-style:opacity-0 data-ending-style:scale-[0.97] data-ending-style:opacity-0">
          <AlertDialog.Title className="font-heading text-base font-semibold">{request?.title}</AlertDialog.Title>
          {request?.description && (
            <AlertDialog.Description className="mt-1.5 text-sm text-muted-foreground">
              {request.description}
            </AlertDialog.Description>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => settle(false)}>
              {request?.cancelLabel ?? "Cancel"}
            </Button>
            <Button variant={request?.destructive ? "danger" : "default"} onClick={() => settle(true)}>
              {request?.confirmLabel}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
