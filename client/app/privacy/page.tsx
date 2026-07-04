'use client';

import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-mist">
      <div className="mb-8 rounded-lg border border-flare bg-flare/10 p-4 text-white">
        <span className="font-bold text-flare">⚠️ DRAFT LEGAL DOCUMENT:</span> This document is a placeholder draft and has not been reviewed by legal counsel. Do not use this in production without consulting a qualified attorney.
      </div>

      <header className="mb-8 border-b border-edge pb-4">
        <h1 className="font-display text-3xl font-bold text-white">Privacy Policy</h1>
        <p className="mt-2 text-sm">Last updated: July 4, 2026</p>
      </header>

      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-white mb-2">1. Information We Collect</h2>
          <p>
            We collect minimal information to operate and secure our real-time video chat service:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>IP Address:</strong> Used for geoblocking, rate limiting, and security/ban enforcement.</li>
            <li><strong>Device Fingerprint:</strong> A browser-generated hash used to detect and prevent ban evasion.</li>
            <li><strong>User Reports:</strong> Information submitted by users when reporting a terms violation.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">2. How We Use Information</h2>
          <p>
            The collected information is used solely to:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Facilitate real-time connections between users.</li>
            <li>Enforce bans for users who violate our community guidelines.</li>
            <li>Prevent abuse of the matchmaking queue via rate limits.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">3. Media Routing & P2P Connections</h2>
          <p>
            OmniConnect establishes direct Peer-to-Peer (P2P) connections between users. Video and audio media flows directly between your browser and the other user's browser. While our signaling servers facilitate connection setup, we do not monitor, record, or store the video/audio contents of your chat. In cases where NAT traversal requires a TURN server, media may be relayed through our TURN infrastructure, but is not inspected or stored.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">4. Data Retention</h2>
          <p>
            We do not retain permanent chat logs. Temporary connection records, rate-limiting states, and active matches are stored in memory or transient databases (like Redis) and are cleared automatically. User bans and associated fingerprints are retained to prevent platform abuse.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">5. Third-Party Services</h2>
          <p>
            We may use third-party analytics and advertising networks (such as Google AdSense) to display ads. These third parties may use cookies and compile data in accordance with their own privacy policies.
          </p>
        </section>
      </div>

      <footer className="mt-12 border-t border-edge pt-6">
        <Link href="/" className="text-signal hover:underline">
          &larr; Back to Home
        </Link>
      </footer>
    </main>
  );
}
