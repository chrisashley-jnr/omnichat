'use client';

import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-mist">
      <div className="mb-8 rounded-lg border border-flare bg-flare/10 p-4 text-white">
        <span className="font-bold text-flare">⚠️ DRAFT LEGAL DOCUMENT:</span> This document is a placeholder draft and has not been reviewed by legal counsel. Do not use this in production without consulting a qualified attorney.
      </div>

      <header className="mb-8 border-b border-edge pb-4">
        <h1 className="font-display text-3xl font-bold text-white">Terms of Service</h1>
        <p className="mt-2 text-sm">Last updated: July 4, 2026</p>
      </header>

      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-white mb-2">1. Acceptance of Terms</h2>
          <p>
            By accessing or using OmniConnect ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">2. Eligibility</h2>
          <p>
            You must be at least 18 years of age to use the Service. By using the Service, you represent and warrant that you are 18 or older.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">3. Prohibited Conduct</h2>
          <p>
            You agree not to use the Service to:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Transmit or broadcast nudity, pornography, or sexually explicit content.</li>
            <li>Harass, abuse, threaten, or defame other users.</li>
            <li>Promote hate speech, violence, or discrimination.</li>
            <li>Share content involving or depicting minors.</li>
            <li>Transmit spam, malware, or unauthorized advertisements.</li>
            <li>Impersonate any person or entity.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">4. Disclaimer of Warranties</h2>
          <p>
            The Service is provided "as is" and "as available" without any warranties of any kind, express or implied. We do not guarantee that the Service will be uninterrupted, secure, or error-free.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">5. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, OmniConnect shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">6. Modifications to the Service and Terms</h2>
          <p>
            We reserve the right to modify or discontinue the Service, or update these Terms, at any time without notice. Your continued use of the Service constitutes acceptance of the updated Terms.
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
