import { useEffect, useState, useCallback } from 'react';
import { warmOfflineBundle } from './offlineStore';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [isPreparingOffline, setIsPreparingOffline] = useState(false);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) || (ua.includes('macintosh') && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      warmOfflineBundle().then((res) => {
        if (res.swActive || res.fontsCached) setOfflineReady(true);
      });
    };

    const handleSwOfflineReady = () => {
      setOfflineReady(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('mm2-offline-ready', handleSwOfflineReady);

    // Warm offline cache & check current readiness
    warmOfflineBundle().then((res) => {
      if (res.swActive || isStandalone) {
        setOfflineReady(true);
      }
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('mm2-offline-ready', handleSwOfflineReady);
    };
  }, []);

  const prepareOfflinePlay = useCallback(async () => {
    setIsPreparingOffline(true);
    try {
      const res = await warmOfflineBundle();
      setOfflineReady(res.swActive || res.fontsCached);
      return res;
    } finally {
      setIsPreparingOffline(false);
    }
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      await prepareOfflinePlay();
      return true;
    }
    return false;
  }, [deferredPrompt, prepareOfflinePlay]);

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    isOnline,
    offlineReady,
    isPreparingOffline,
    install,
    prepareOfflinePlay,
  };
}
