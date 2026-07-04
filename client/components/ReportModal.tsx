'use client';

import { useState } from 'react';

const REASONS = [
  'Nudity or sexual content',
  'Harassment or hate speech',
  'Underage user',
  'Violence or threats',
  'Spam or scam',
  'Other',
];

export default function ReportModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Report this user"
    >
      <div className="w-full max-w-sm rounded-xl border border-edge bg-panel p-5">
        <h2 className="font-display text-lg font-semibold">Report user</h2>
        <p className="mt-1 text-sm text-mist">
          This ends the chat immediately. Repeated reports lead to a ban.
        </p>

        <div className="mt-4 space-y-1.5">
          {REASONS.map((reason) => (
            <button
              key={reason}
              onClick={() => setSelected(reason)}
              className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                selected === reason
                  ? 'border-signal bg-signal/10 text-white'
                  : 'border-edge text-mist hover:border-mist/50'
              }`}
            >
              {reason}
            </button>
          ))}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-mist hover:text-white"
          >
            Cancel
          </button>
          <button
            disabled={!selected}
            onClick={() => selected && onSubmit(selected)}
            className="rounded-md bg-flare px-4 py-2 text-sm font-semibold text-ink disabled:opacity-40"
          >
            Submit report
          </button>
        </div>
      </div>
    </div>
  );
}
