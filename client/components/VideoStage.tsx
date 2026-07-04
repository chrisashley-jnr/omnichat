'use client';

import type { MutableRefObject } from 'react';
import type { ChatStatus } from '@/lib/useVideoChat';

const STATUS_COPY: Record<ChatStatus, string> = {
  idle: 'Press Start to meet someone new',
  finding: 'Looking for someone to connect you with…',
  connecting: 'Connecting…',
  connected: '',
  'peer-left': 'They disconnected. Press Next to keep going.',
  banned: 'Your access has been suspended for repeated reports.',
  'captcha-failed': 'Verification failed. Please try again.',
  'rate-limited': 'Too many requests — please wait a moment before trying again.',
  error: 'Something went wrong with the connection. Try Next.',
};

export default function VideoStage({
  status,
  localVideoRef,
  remoteVideoRef,
}: {
  status: ChatStatus;
  localVideoRef: MutableRefObject<HTMLVideoElement | null>;
  remoteVideoRef: MutableRefObject<HTMLVideoElement | null>;
}) {
  const showOverlay = status !== 'connected';

  return (
    <div className="video-frame scanline relative aspect-video w-full overflow-hidden rounded-xl border border-edge">
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="h-full w-full object-cover"
      />

      {showOverlay && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/70 text-center">
          {(status === 'finding' || status === 'connecting') && (
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-pulseRing rounded-full bg-signal" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-signal" />
            </span>
          )}
          <p className="max-w-xs px-4 text-sm text-mist">
            {STATUS_COPY[status]}
          </p>
        </div>
      )}

      {/* Local self-view, picture-in-picture style */}
      <div className="absolute bottom-3 right-3 aspect-video w-28 overflow-hidden rounded-md border border-edge shadow-lg sm:w-40">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full scale-x-[-1] object-cover"
        />
      </div>

      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-ink/60 px-2.5 py-1 text-xs text-mist backdrop-blur">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            status === 'connected' ? 'bg-signal' : 'bg-mist/50'
          }`}
        />
        {status === 'connected' ? 'Live' : 'Offline'}
      </div>
    </div>
  );
}
