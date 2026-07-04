'use client';

import { useEffect, useState } from 'react';

interface AdConfig {
  provider: string;
  slots: {
    preChatBanner: { enabled: boolean; adUnitId: string };
    sidebarRail: { enabled: boolean; adUnitId: string };
    interstitialEveryNSkips: { enabled: boolean; n: number; adUnitId: string };
  };
}

const API_BASE =
  process.env.NEXT_PUBLIC_SIGNALING_URL || 'http://localhost:4000';

export function useAdConfig() {
  const [config, setConfig] = useState<AdConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/ad-config`)
      .then((r) => r.json())
      .then((cfg) => {
        if (!cancelled) setConfig(cfg);
      })
      .catch(() => {
        /* ads are non-critical; fail silently */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return config;
}
