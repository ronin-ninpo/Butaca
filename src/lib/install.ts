import { useEffect, useState } from 'react';

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BIPEvent | null = null;
const subs = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BIPEvent;
    subs.forEach((f) => f());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    subs.forEach((f) => f());
  });
}

export const isStandalone = () =>
  typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true);

export const isIos = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

export function useInstallPrompt() {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((x) => x + 1);
    subs.add(f);
    return () => {
      subs.delete(f);
    };
  }, []);
  return {
    canPrompt: !!deferred,
    prompt: async () => {
      if (!deferred) return false;
      await deferred.prompt();
      const r = await deferred.userChoice;
      deferred = null;
      return r.outcome === 'accepted';
    },
  };
}
