'use client';

import { useState } from 'react';
import { useVideoChat } from '@/lib/useVideoChat';
import { useAdConfig } from '@/lib/useAdConfig';
import { useTurnstile } from '@/lib/useTurnstile';
import VideoStage from '@/components/VideoStage';
import Controls from '@/components/Controls';
import ChatPanel from '@/components/ChatPanel';
import AdSlot from '@/components/AdSlot';
import ReportModal from '@/components/ReportModal';
import ConsentGate from '@/components/ConsentGate';
import Link from 'next/link';

export default function HomePage() {
  const [consented, setConsented] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [interestInput, setInterestInput] = useState('');
  const [skipCount, setSkipCount] = useState(0);

  const adConfig = useAdConfig();
  const { getToken } = useTurnstile();
  const {
    status,
    messages,
    strangerTyping,
    micOn,
    camOn,
    localVideoRef,
    remoteVideoRef,
    findPartner,
    nextPartner,
    leaveRoom,
    reportPartner,
    sendMessage,
    setTyping,
    toggleMic,
    toggleCam,
  } = useVideoChat();

  const interests = interestInput
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  async function handleStart() {
    const token = await getToken();
    findPartner(interests, token);
  }

  async function handleNext() {
    setSkipCount((c) => c + 1);
    const token = await getToken();
    nextPartner(interests, token);
  }

  const showInterstitial =
    adConfig?.slots.interstitialEveryNSkips.enabled &&
    skipCount > 0 &&
    skipCount % adConfig.slots.interstitialEveryNSkips.n === 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 py-6">
      {!consented && <ConsentGate onAccept={() => setConsented(true)} />}

      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-signal" />
          <h1 className="font-display text-xl font-bold tracking-tight">
            OmniConnect
          </h1>
        </div>
        <p className="hidden text-sm text-mist sm:block">
          Random video chat, anywhere in the world.
        </p>
      </header>

      {adConfig?.slots.preChatBanner.enabled && status === 'idle' && (
        <AdSlot
          variant="banner"
          adUnitId={adConfig.slots.preChatBanner.adUnitId}
          label="Sponsored"
        />
      )}

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-3">
          <VideoStage
            status={status}
            localVideoRef={localVideoRef}
            remoteVideoRef={remoteVideoRef}
          />

          {status === 'idle' && (
            <input
              value={interestInput}
              onChange={(e) => setInterestInput(e.target.value)}
              placeholder="Optional: interests, comma separated (e.g. music, travel, football)"
              className="rounded-md border border-edge bg-panel px-3 py-2 text-sm placeholder:text-mist/50"
            />
          )}

          <Controls
            status={status}
            micOn={micOn}
            camOn={camOn}
            onStart={handleStart}
            onNext={handleNext}
            onStop={leaveRoom}
            onReport={() => setReportOpen(true)}
            onToggleMic={toggleMic}
            onToggleCam={toggleCam}
          />

          {showInterstitial && (
            <AdSlot
              variant="interstitial"
              adUnitId={adConfig!.slots.interstitialEveryNSkips.adUnitId}
              label="Sponsored"
            />
          )}

          <div className="h-56 lg:hidden">
            <ChatPanel
              messages={messages}
              strangerTyping={strangerTyping}
              disabled={status !== 'connected'}
              onSend={sendMessage}
              onTyping={setTyping}
            />
          </div>
        </div>

        <div className="hidden flex-col gap-3 lg:flex">
          {adConfig?.slots.sidebarRail.enabled && (
            <AdSlot
              variant="rail"
              adUnitId={adConfig.slots.sidebarRail.adUnitId}
              label="Sponsored"
            />
          )}
          <div className="h-80">
            <ChatPanel
              messages={messages}
              strangerTyping={strangerTyping}
              disabled={status !== 'connected'}
              onSend={sendMessage}
              onTyping={setTyping}
            />
          </div>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-edge pt-3 text-xs text-mist/60">
        <span>© {new Date().getFullYear()} OmniConnect · 18+ only</span>
        <div className="flex gap-4">
          <Link href="/guidelines" className="hover:text-mist">
            Community Guidelines
          </Link>
          <Link href="/privacy" className="hover:text-mist">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-mist">
            Terms
          </Link>
        </div>
      </footer>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmit={(reason) => {
          reportPartner(reason);
          setReportOpen(false);
        }}
      />
    </main>
  );
}
