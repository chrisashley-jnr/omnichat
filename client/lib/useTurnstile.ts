'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Cloudflare Turnstile integration hook.
 *
 * Loads the Turnstile script once, renders an invisible (managed) widget,
 * and exposes getToken() which resolves a fresh challenge token on demand.
 * The widget auto-resets after each solve so consecutive calls always
 * produce a fresh token.
 *
 * Requires NEXT_PUBLIC_TURNSTILE_SITE_KEY in .env.local.
 * If the key is not set, getToken() resolves to an empty string (dev mode).
 */

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
const SCRIPT_ID = 'cf-turnstile-script';
const CONTAINER_ID = 'cf-turnstile-container';

interface TurnstileApi {
  render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  getResponse: (widgetId: string) => string | undefined;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    __turnstileReady?: boolean;
    __turnstileReadyCbs?: Array<() => void>;
  }
}

function loadScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.__turnstileReady) {
      resolve();
      return;
    }
    if (document.getElementById(SCRIPT_ID)) {
      // Script tag exists but hasn't loaded yet — queue callback
      window.__turnstileReadyCbs = window.__turnstileReadyCbs || [];
      window.__turnstileReadyCbs.push(resolve);
      return;
    }

    window.__turnstileReadyCbs = [resolve];

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__onTurnstileLoad&render=explicit';
    script.async = true;

    (window as any).__onTurnstileLoad = () => {
      window.__turnstileReady = true;
      window.__turnstileReadyCbs?.forEach((cb) => cb());
      window.__turnstileReadyCbs = [];
    };

    document.head.appendChild(script);
  });
}

export function useTurnstile() {
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const resolveRef = useRef<((token: string) => void) | null>(null);

  useEffect(() => {
    if (!SITE_KEY) {
      setReady(true); // no-op mode
      return;
    }

    let mounted = true;

    loadScript().then(() => {
      if (!mounted || !window.turnstile) return;

      // Ensure container exists
      let container = document.getElementById(CONTAINER_ID);
      if (!container) {
        container = document.createElement('div');
        container.id = CONTAINER_ID;
        container.style.position = 'fixed';
        container.style.bottom = '-100px'; // hidden off-screen
        container.style.left = '0';
        container.style.zIndex = '-1';
        document.body.appendChild(container);
      }

      const wid = window.turnstile.render(container, {
        sitekey: SITE_KEY,
        size: 'invisible',
        callback: (token: string) => {
          if (resolveRef.current) {
            resolveRef.current(token);
            resolveRef.current = null;
          }
        },
        'error-callback': () => {
          if (resolveRef.current) {
            resolveRef.current('');
            resolveRef.current = null;
          }
        },
      });

      widgetIdRef.current = wid;
      if (mounted) setReady(true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const getToken = useCallback((): Promise<string> => {
    if (!SITE_KEY) return Promise.resolve('');

    return new Promise((resolve) => {
      if (!window.turnstile || !widgetIdRef.current) {
        resolve('');
        return;
      }

      // Check if we already have a solved token
      const existing = window.turnstile.getResponse(widgetIdRef.current);
      if (existing) {
        // Reset for next use and return current token
        window.turnstile.reset(widgetIdRef.current);
        resolve(existing);
        return;
      }

      // Wait for the callback
      resolveRef.current = (token) => {
        // Reset widget for next use
        if (window.turnstile && widgetIdRef.current) {
          window.turnstile.reset(widgetIdRef.current);
        }
        resolve(token);
      };

      // Trigger a fresh challenge
      window.turnstile.reset(widgetIdRef.current);
    });
  }, []);

  return { ready, getToken };
}
