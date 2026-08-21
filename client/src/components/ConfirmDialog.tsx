import { useState } from "react";

export function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [show, setShow] = useState(true);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-base-100 rounded-2xl border border-base-300 p-6 w-full max-w-md mx-4 animate-[fadeUp_0.2s_ease-out_both]">
        <h3 className="text-lg font-bold text-base-content mb-2">{title}</h3>
        <p className="text-sm text-base-content/70 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="btn btn-ghost btn-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              setShow(false);
            }}
            className="btn btn-primary btn-sm gap-2"
          >
            <span>Yes, Submit</span>
          </button>
        </div>
      </div>
    </div>
  );
}