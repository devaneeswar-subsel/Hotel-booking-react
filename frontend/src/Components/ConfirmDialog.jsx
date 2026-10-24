import React, { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

/*
 * UI-06: an in-app replacement for window.confirm().
 *
 *   if (!(await confirmDialog("Delete this room?"))) return;
 *
 * Same contract as window.confirm — resolves true for OK, false for Cancel —
 * so call sites change by one `await` only. It renders in the app's own style,
 * supports Enter / Escape, and never blocks the browser's event loop.
 */
function Dialog({ message, confirmText, cancelText, danger, onClose }) {
  const okRef = useRef(null);

  useEffect(() => {
    okRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") onClose(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[rgba(15,25,35,0.7)] p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose(false);
      }}
    >
      <div className="w-full max-w-[420px] overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        <div className="whitespace-pre-line px-6 pb-4 pt-6 text-sm leading-relaxed text-slate-800">
          {message}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={() => onClose(false)}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-gray-50"
          >
            {cancelText}
          </button>
          <button
            ref={okRef}
            type="button"
            onClick={() => onClose(true)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition ${
              danger
                ? "bg-red-700 hover:bg-red-800"
                : "bg-[#0F1923] hover:bg-[#1c2a38]"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function confirmDialog(
  message,
  { confirmText = "OK", cancelText = "Cancel", danger = false } = {},
) {
  return new Promise((resolve) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const close = (answer) => {
      root.unmount();
      host.remove();
      resolve(answer);
    };
    root.render(
      <Dialog
        message={message}
        confirmText={confirmText}
        cancelText={cancelText}
        danger={danger}
        onClose={close}
      />,
    );
  });
}

export default confirmDialog;
