import { useState, useEffect } from 'react';

export type ScreenType = 'phone' | 'tablet' | 'desktop';

export interface DeviceProfile {
  screenType: ScreenType;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLandscapePhone: boolean;
  isCompactPhone: boolean;
  isLowEnd: boolean;
  isTouch: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  orientation: 'portrait' | 'landscape';
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

  const orientation: 'portrait' | 'landscape' = width >= height ? 'landscape' : 'portrait';
  const isLandscapePhone = orientation === 'landscape' && height <= 520 && (isTouch || width < 960);

  let screenType: ScreenType = 'desktop';
  if (width < 640 || isLandscapePhone) {
    screenType = 'phone';
  } else if (width <= 1080 || (isTouch && width <= 1280)) {
    screenType = 'tablet';
  } else {
    screenType = 'desktop';
  }

  const isCompactPhone = (screenType === 'phone' && width < 395) || (isLandscapePhone && height <= 430);
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

  // Proportional world camera zoom so phones aren't cramped, tablets are balanced,
  // and wide/4K desktop monitors don't make Mochi microscopic or stretch sprites.
  let viewScale = 1.0;
  if (isLandscapePhone) {
    viewScale = Math.max(0.76, Math.min(0.92, height / 465));
  } else if (screenType === 'phone') {
    viewScale = Math.max(0.78, Math.min(0.94, width / 440));
  } else if (screenType === 'tablet') {
    viewScale = orientation === 'portrait' ? Math.max(0.88, Math.min(0.98, width / 780)) : 1.0;
  } else if (width >= 1560 && height >= 840) {
    viewScale = Math.min(1.24, Math.max(1.0, width / 1460));
  } else if (height < 650) {
    viewScale = Math.max(0.86, height / 680);
  }

  return {
    screenType,
    isPhone: screenType === 'phone',
    isTablet: screenType === 'tablet',
    isDesktop: screenType === 'desktop',
    isLandscapePhone,
    isCompactPhone,
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
    const update = () => {
      const next = computeProfile();
      setProfile((prev) =>
        prev.width === next.width &&
        prev.height === next.height &&
        prev.orientation === next.orientation &&
        prev.screenType === next.screenType &&
        prev.isLowEnd === next.isLowEnd &&
        prev.isTouch === next.isTouch &&
        prev.viewScale === next.viewScale &&
        prev.pixelRatio === next.pixelRatio
          ? prev
          : next
      );
    };

    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true });
    window.visualViewport?.addEventListener('resize', update, { passive: true });
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);

  return profile;
}
