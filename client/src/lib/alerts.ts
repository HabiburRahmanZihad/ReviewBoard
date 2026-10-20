import Swal, { SweetAlertIcon } from "sweetalert2";

// Configure common dark/modern styling consistent with ReviewBoard UI
const customSwal = Swal.mixin({
  background: "#18181b", // zinc-900
  color: "#f4f4f5", // zinc-100
  confirmButtonColor: "#3b82f6", // blue-500
  cancelButtonColor: "#3f3f46", // zinc-700
  customClass: {
    popup: "border border-zinc-800 rounded-xl shadow-2xl font-sans",
    title: "text-lg font-semibold text-zinc-100",
    htmlContainer: "text-sm text-zinc-400",
    confirmButton: "px-4 py-2 rounded-lg font-medium text-sm transition-opacity hover:opacity-90",
    cancelButton: "px-4 py-2 rounded-lg font-medium text-sm transition-opacity hover:opacity-90",
  },
  buttonsStyling: true,
});

/**
 * Prompt user with a confirmation dialog.
 * Resolves to `true` if confirmed, `false` otherwise.
 */
export async function confirmAction({
  title = "Are you sure?",
  text = "This action cannot be undone.",
  icon = "warning",
  confirmButtonText = "Yes, proceed",
  confirmButtonColor = "#3b82f6",
  cancelButtonText = "Cancel",
}: {
  title?: string;
  text?: string;
  icon?: SweetAlertIcon;
  confirmButtonText?: string;
  confirmButtonColor?: string;
  cancelButtonText?: string;
}): Promise<boolean> {
  const result = await customSwal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    confirmButtonColor,
    reverseButtons: true,
  });

  return result.isConfirmed;
}

/**
 * Display a success alert dialog.
 */
export async function showSuccess(title: string, text?: string) {
  return customSwal.fire({
    icon: "success",
    title,
    text,
    confirmButtonColor: "#10b981", // emerald-500
  });
}

/**
 * Display an error alert dialog.
 */
export async function showError(title: string, text?: string) {
  return customSwal.fire({
    icon: "error",
    title,
    text,
    confirmButtonColor: "#ef4444", // red-500
  });
}

/**
 * Display a non-intrusive toast notification.
 */
export function showToast(title: string, icon: SweetAlertIcon = "success") {
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: "#18181b",
    color: "#f4f4f5",
    customClass: {
      popup: "border border-zinc-800 shadow-lg rounded-lg text-sm",
    },
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });

  return Toast.fire({
    icon,
    title,
  });
}
