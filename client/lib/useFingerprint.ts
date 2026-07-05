'use client';

import { useEffect, useRef } from 'react';

/**
 * Lightweight client-side device fingerprint generator.
 *
 * Combines canvas rendering hash, WebGL renderer info, timezone, platform,
 * and screen dimensions into a single SHA-256 hex string. This is NOT
 * a commercial-grade fingerprint (for that, use FingerprintJS Pro or
 * similar) — it's a best-effort identifier to make ban evasion harder
 * than just clearing cookies.
 *
 * The fingerprint is deterministic for the same device+browser combo and
 * is computed once on mount.
 */

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';

    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(10, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('OmniConnect fp', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('OmniConnect fp', 4, 17);

    return canvas.toDataURL();
  } catch {
    return 'canvas-error';
  }
}

function getWebGLRenderer(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'no-webgl';

    const debugInfo = (gl as WebGLRenderingContext).getExtension(
      'WEBGL_debug_renderer_info'
    );
    if (!debugInfo) return 'no-debug-info';

    return (gl as WebGLRenderingContext).getParameter(
      debugInfo.UNMASKED_RENDERER_WEBGL
    ) as string;
  } catch {
    return 'webgl-error';
  }
}

function collectSignals(): string {
  if (typeof window === 'undefined') {
    return 'ssr';
  }
  const signals = [
    getCanvasFingerprint(),
    getWebGLRenderer(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.platform || 'unknown-platform',
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    navigator.hardwareConcurrency?.toString() || '0',
    navigator.language || 'unknown-lang',
  ];
  return signals.join('|||');
}

export function useFingerprint(): string | null {
  const fpRef = useRef<string | null>(null);

  useEffect(() => {
    if (fpRef.current) return;

    sha256(collectSignals()).then((hash) => {
      fpRef.current = hash;
    });
  }, []);

  // Return synchronously if already computed, null if not yet ready
  return fpRef.current;
}

/**
 * Generates the fingerprint once and returns a promise.
 * Use this for one-shot calls (e.g., socket auth on connect).
 */
export async function generateFingerprint(): Promise<string> {
  return sha256(collectSignals());
}
