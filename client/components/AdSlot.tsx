'use client';

import { useEffect, useRef } from 'react';

/**
 * Renders one ad placement. This ships as a clearly-labeled placeholder box
 * so the layout, spacing, and responsive behavior are all in place —
 * swap in your real ad network's script tag where marked below.
 *
 * To go live with Google AdSense, for example:
 *  1. Add the AdSense loader script once in app/layout.tsx:
 *     <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXX" crossOrigin="anonymous" />
 *  2. Replace the placeholder <div> below with:
 *     <ins className="adsbygoogle" style={{ display: 'block' }} data-ad-client="ca-pub-XXXX"
 *          data-ad-slot={adUnitId} data-ad-format="auto" data-full-width-responsive="true" />
 *  3. Call (window.adsbygoogle = window.adsbygoogle || []).push({}) after mount (see effect below).
 */
export default function AdSlot({
  adUnitId,
  variant = 'banner',
  label = 'Advertisement',
}: {
  adUnitId?: string;
  variant?: 'banner' | 'rail' | 'interstitial';
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Wire real ad network push/refresh calls here once a script is added.
    // Example (AdSense): (window as any).adsbygoogle?.push({});
  }, [adUnitId]);

  const sizing =
    variant === 'rail'
      ? 'h-full min-h-[250px] w-full'
      : variant === 'interstitial'
      ? 'h-[250px] w-full max-w-[336px] mx-auto'
      : 'h-[90px] w-full';

  return (
    <div
      ref={ref}
      role="complementary"
      aria-label={label}
      className={`relative flex items-center justify-center overflow-hidden rounded-lg border border-dashed border-edge bg-panel/60 ${sizing}`}
    >
      <span className="absolute left-2 top-1.5 text-[10px] uppercase tracking-wider text-mist">
        {label}
      </span>
      <span className="text-xs text-mist/70">
        Ad slot{adUnitId ? ` · ${adUnitId}` : ''}
      </span>
    </div>
  );
}
