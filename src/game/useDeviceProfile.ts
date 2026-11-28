import { useState, useEffect } from 'react';

export type ScreenType = 'phone' | 'tablet' | 'desktop';

export interface DeviceProfile {
  screenType: ScreenType;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLandscapePhone: boolean;
  isCompactPhone: boolean;
  isPortraitViewport: boolean;
  isLowEnd: boolean;
  isTouch: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  orientation: 'landscape';
  width: number;
  height: number;
  pixelRatio: number;
  viewScale: number;
}

function computeProfile(): DeviceProfile {
  const isClient = typeof window !== 'undefined';
  const vv = isClient ? window.visualViewport : null;
  const width = isClient ? Math.round(vv?.width || window.innerWidth) : 1280;
  const height = isClient ? Math.round(vv?.height || window.innerHeight) : 800;
  const rawDpr = isClient ? window.devicePixelRatio || 1 : 1;
  const ua = isClient ? navigator.userAgent || '' : '';

  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android|Samsung/i.test(ua);
  const coarsePointer = isClient && typeof window.matchMedia === 'function'
    ? window.matchMedia('(pointer: coarse)').matches
    : false;
  const isTouch = isClient && (
    coarsePointer ||
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );

  // Game runs exclusively in landscape; track vertical viewports only so the Rotate-to-Landscape guard can pause & gate gameplay cleanly.
  const isPortraitViewport = width < height;
  const effW = Math.max(width, height);
  const effH = Math.min(width, height);
  const orientation = 'landscape' as const;
  const isLandscapePhone = effH <= 540 && (isTouch || effW < 980);

  let screenType: ScreenType = 'desktop';
  if (effW < 640 || isLandscapePhone) {
    screenType = 'phone';
  } else if (effW <= 1080 || (isTouch && effW <= 1280)) {
    screenType = 'tablet';
  } else {
    screenType = 'desktop';
  }

  const isCompactPhone = isLandscapePhone && effH <= 430;
  const hardwareCores = isClient && typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : 8;
  const deviceMemGb = isClient && typeof (navigator as any).deviceMemory === 'number' ? (navigator as any).deviceMemory : 8;
  const isLowEnd =
    screenType === 'phone' ||
    isCompactPhone ||
    hardwareCores <= 4 ||
    deviceMemGb <= 4;

  // Adaptive DPR cap: keeps phones, tablets & integrated-GPU PCs smooth without redundant fill-rate
  const pixelRatio = isClient
    ? screenType === 'phone'
      ? Math.min(rawDpr, isCompactPhone || isLowEnd ? 1.15 : 1.25)
      : screenType === 'tablet'
      ? Math.min(rawDpr, isLowEnd ? 1.25 : 1.4)
      : Math.min(rawDpr, isLowEnd ? 1.35 : 1.65)
    : 1;

  // Proportional landscape camera zoom across phones, tablets, laptops & 4K monitors
  let viewScale = 1.0;
  if (isLandscapePhone || screenType === 'phone') {
    viewScale = Math.max(0.76, Math.min(0.92, effH / 465));
  } else if (screenType === 'tablet') {
    viewScale = effH < 660 ? Math.max(0.88, effH / 680) : 1.0;
  } else if (effW >= 1560 && effH >= 840) {
    viewScale = Math.min(1.24, Math.max(1.0, effW / 1460));
  } else if (effH < 650) {
    viewScale = Math.max(0.86, effH / 680);
  }

  return {
    screenType,
    isPhone: screenType === 'phone',
    isTablet: screenType === 'tablet',
    isDesktop: screenType === 'desktop',
    isLandscapePhone,
    isCompactPhone,
    isPortraitViewport,
    isLowEnd,
    isTouch,
    isIOS,
    isAndroid,
    orientation,
    width,
    height,
    pixelRatio,
    viewScale: Number(viewScale.toFixed(3)),
  };
}

export function useDeviceProfile(): DeviceProfile {
  const [profile, setProfile] = useState<DeviceProfile>(computeProfile);

  useEffect(() => {
    let timerId: number | null = null;

    const applyUpdate = (isOrientation = false) => {
      const next = computeProfile();
      setProfile((prev) => {
        const sameViewportOrientation = prev.isPortraitViewport === next.isPortraitViewport;
        const dw = Math.abs(prev.width - next.width);
        const dh = Math.abs(prev.height - next.height);
        // Ignore tiny iOS/Android URL bar hide-show vertical jitter when width & landscape state are unchanged
        if (
          !isOrientation &&
          sameViewportOrientation &&
          prev.screenType === next.screenType &&
          (prev.isTouch || next.isTouch) &&
          dw <= 2 &&
          dh < 64 &&
          prev.pixelRatio === next.pixelRatio
        ) {
          return prev;
        }
        if (
          prev.width === next.width &&
          prev.height === next.height &&
          prev.isPortraitViewport === next.isPortraitViewport &&
          prev.screenType === next.screenType &&
          prev.isLowEnd === next.isLowEnd &&
          prev.isTouch === next.isTouch &&
          prev.viewScale === next.viewScale &&
          prev.pixelRatio === next.pixelRatio
        ) {
          return prev;
        }
        return next;
      });
    };

    const scheduleUpdate = (delayMs: number, isOrientation = false) => {
      if (timerId !== null) window.clearTimeout(timerId);
      timerId = window.setTimeout(() => {
        timerId = null;
        applyUpdate(isOrientation);
      }, delayMs);
    };

    const onResize = () => scheduleUpdate(140, false);
    const onOrientation = () => scheduleUpdate(60, true);

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onOrientation, { passive: true });
    window.screen?.orientation?.addEventListener?.('change', onOrientation);
    window.visualViewport?.addEventListener('resize', onResize, { passive: true });
    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onOrientation);
      window.screen?.orientation?.removeEventListener?.('change', onOrientation);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, []);

  return profile;
}
