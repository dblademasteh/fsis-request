import { useEffect } from "react";
import { createPortal } from "react-dom";

export function ConfirmModal({
  show,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  show: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (show) {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape") onCancel();
      };
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
  }, [show, onCancel]);

  if (!show) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-base-100 rounded-2xl border border-base-300 p-6 w-full max-w-sm mx-4 animate-[fadeUp_0.2s_ease-out_both]">
        <h3 className="text-lg font-bold text-base-content mb-2">{title}</h3>
        <p className="text-sm text-base-content/70 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="btn btn-ghost btn-sm">
            No, Cancel
          </button>
          <button onClick={onConfirm} className="btn btn-primary btn-sm">
            Yes, {title.includes("Delete") ? "Delete" : "Approve"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}