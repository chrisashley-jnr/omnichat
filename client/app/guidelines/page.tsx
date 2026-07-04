'use client';

import Link from 'next/link';

export default function GuidelinesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-mist">
      <div className="mb-8 rounded-lg border border-flare bg-flare/10 p-4 text-white">
        <span className="font-bold text-flare">⚠️ DRAFT LEGAL DOCUMENT:</span> This document is a placeholder draft and has not been reviewed by legal counsel. Do not use this in production without consulting a qualified attorney.
      </div>

      <header className="mb-8 border-b border-edge pb-4">
        <h1 className="font-display text-3xl font-bold text-white">Community Guidelines</h1>
        <p className="mt-2 text-sm">Last updated: July 4, 2026</p>
      </header>

      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Overview</h2>
          <p>
            OmniConnect is designed to be a fun and safe space to meet new people. To ensure a positive experience for everyone, all users must follow these rules.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Prohibited Content & Behavior</h2>
          <p>
            The following actions and content will result in an immediate and permanent ban:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-2">
            <li><strong>Nudity & Sexual Content:</strong> Any display of sexual acts, pornography, nudity, or suggestive behavior.</li>
            <li><strong>CSAM & Minor Exploitation:</strong> Zero-tolerance policy. Any content depicting or involving minors will be reported to appropriate law enforcement authorities immediately (e.g., NCMEC).</li>
            <li><strong>Harassment & Hate Speech:</strong> Insulting, threatening, or using discriminatory language against others based on race, ethnicity, religion, gender, sexual orientation, or disability.</li>
            <li><strong>Violence & Self-Harm:</strong> Displaying weapons, self-harm, suicide threats, or violence of any kind.</li>
            <li><strong>Spam, Scams & Bots:</strong> Using automated scripts, playing pre-recorded videos instead of camera streams, or trying to sell products/services.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Reporting Violations</h2>
          <p>
            If you encounter a user violating these guidelines, click the <strong>Report</strong> button immediately. Reported users will be disconnected, and accumulated reports will result in automatic IP and device-level bans.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Ban Appeals</h2>
          <p>
            Bans are enforced at the network (IP) and hardware/browser signature levels. If you believe you were banned in error, please contact our support team (placeholder contact info).
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
