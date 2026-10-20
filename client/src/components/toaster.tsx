"use client";

import { Toast } from "@base-ui/react/toast";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { toastManager } from "@/lib/alerts";

const icons = {
  success: <CircleCheck className="size-4 text-foreground" aria-hidden />,
  error: <CircleAlert className="size-4 text-destructive" aria-hidden />,
  info: <Info className="size-4 text-muted-foreground" aria-hidden />,
};

export function Toaster() {
  return (
    <Toast.Provider toastManager={toastManager} limit={3}>
      <Toast.Portal>
        {/*
          Placed where toasts never cover a control: top edge on phones; on wider
          screens bottom-left of the content area — clear of the sidebar's account
          menu and of the review sheet's actions, which sit bottom-right.
        */}
        <Toast.Viewport className="fixed top-4 right-4 left-4 z-100 sm:top-auto sm:right-auto sm:bottom-6 sm:left-6 sm:w-88 lg:left-66">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      swipeDirection={["up", "down", "left"]}
      className="toast-root rounded-lg border bg-popover text-popover-foreground shadow-lg shadow-black/5 dark:shadow-black/40"
    >
      <Toast.Content className="toast-content flex items-start gap-3 overflow-hidden p-3.5 pr-3 transition-opacity duration-200">
        <span className="mt-0.5 shrink-0">{icons[(toast.type as keyof typeof icons) ?? "info"] ?? icons.info}</span>
        <div className="min-w-0 flex-1">
          <Toast.Title className="text-sm font-medium leading-5" />
          <Toast.Description className="mt-0.5 text-[13px] leading-5 text-muted-foreground" />
        </div>
        <Toast.Close
          className="-mt-0.5 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2"
          aria-label="Dismiss notification"
        >
          <X className="size-3.5" />
        </Toast.Close>
      </Toast.Content>
    </Toast.Root>
  ));
}
