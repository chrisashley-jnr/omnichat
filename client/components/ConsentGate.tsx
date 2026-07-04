'use client';

import { useState } from 'react';

/**
 * Simple client-side age confirmation + community-guidelines acknowledgement.
 * This is NOT robust age verification (that requires a real ID/age-verification
 * provider — e.g. Yoti, Persona, or a payment-card check — which you should
 * integrate before a real public launch). It's a first line of defense plus
 * a paper trail of consent, and a place to link your real Terms/Privacy docs.
 */
export default function ConsentGate({ onAccept }: { onAccept: () => void }) {
  const [confirmedAge, setConfirmedAge] = useState(false);
  const [confirmedRules, setConfirmedRules] = useState(false);

  const canContinue = confirmedAge && confirmedRules;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink p-4">
      <div className="w-full max-w-md rounded-xl border border-edge bg-panel p-6">
        <h1 className="font-display text-2xl font-semibold">OmniConnect</h1>
        <p className="mt-2 text-sm text-mist">
          Before you connect with a stranger, please confirm the following:
        </p>

        <div className="mt-5 space-y-3">
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={confirmedAge}
              onChange={(e) => setConfirmedAge(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-signal"
            />
            I am 18 years of age or older.
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={confirmedRules}
              onChange={(e) => setConfirmedRules(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-signal"
            />
            I agree not to share nudity, sexual content, hate speech, or
            content involving minors, and I understand chats may be reported
            and reviewed for safety.
          </label>
        </div>

        <button
          disabled={!canContinue}
          onClick={onAccept}
          className="mt-6 w-full rounded-md bg-signal px-4 py-2.5 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
        </button>
        <p className="mt-3 text-center text-xs text-mist/60">
          By continuing you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
