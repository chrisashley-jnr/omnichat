'use client';

import type { ChatStatus } from '@/lib/useVideoChat';

export default function Controls({
  status,
  micOn,
  camOn,
  onStart,
  onNext,
  onStop,
  onReport,
  onToggleMic,
  onToggleCam,
}: {
  status: ChatStatus;
  micOn: boolean;
  camOn: boolean;
  onStart: () => void;
  onNext: () => void;
  onStop: () => void;
  onReport: () => void;
  onToggleMic: () => void;
  onToggleCam: () => void;
}) {
  const isActive = status === 'connecting' || status === 'connected' || status === 'finding';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-edge bg-panel px-4 py-3">
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleMic}
          aria-pressed={micOn}
          aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
          className={`rounded-md px-3 py-2 text-sm font-medium transition ${
            micOn ? 'bg-edge text-white' : 'bg-flare/20 text-flare'
          }`}
        >
          {micOn ? 'Mic on' : 'Mic off'}
        </button>
        <button
          onClick={onToggleCam}
          aria-pressed={camOn}
          aria-label={camOn ? 'Turn camera off' : 'Turn camera on'}
          className={`rounded-md px-3 py-2 text-sm font-medium transition ${
            camOn ? 'bg-edge text-white' : 'bg-flare/20 text-flare'
          }`}
        >
          {camOn ? 'Camera on' : 'Camera off'}
        </button>
      </div>

      <div className="flex items-center gap-2">
        {!isActive && status !== 'connected' ? (
          <button
            onClick={onStart}
            className="rounded-md bg-signal px-5 py-2 text-sm font-semibold text-ink hover:opacity-90"
          >
            Start
          </button>
        ) : (
          <>
            <button
              onClick={onReport}
              className="rounded-md border border-flare/40 px-4 py-2 text-sm font-medium text-flare hover:bg-flare/10"
            >
              Report
            </button>
            <button
              onClick={onNext}
              className="rounded-md bg-signal px-5 py-2 text-sm font-semibold text-ink hover:opacity-90"
            >
              Next
            </button>
            <button
              onClick={onStop}
              className="rounded-md bg-edge px-4 py-2 text-sm font-medium text-white hover:bg-edge/70"
            >
              Stop
            </button>
          </>
        )}
      </div>
    </div>
  );
}
