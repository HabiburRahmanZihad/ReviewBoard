import { Toast } from "@base-ui/react/toast";

export { confirmAction } from "@/components/confirm-dialog";

/**
 * One toast queue for the whole app, so toasts can be raised from anywhere —
 * including plain functions outside React. Rendered by <Toaster /> in the root layout.
 */
export const toastManager = Toast.createToastManager();

export type ToastType = "success" | "error" | "info";

export function showToast(title: string, type: ToastType = "success", description?: string) {
  toastManager.add({
    title,
    description,
    type,
    // Errors are announced assertively to screen readers and stay a little longer
    priority: type === "error" ? "high" : "low",
    timeout: type === "error" ? 7000 : 4000,
  });
}
