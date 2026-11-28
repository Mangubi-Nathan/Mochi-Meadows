import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FISH_SPECIES } from '../game/constants';
import { audio } from '../game/audio';

export type FishingActionMode = 'idle' | 'reeling' | 'celebrate';

export interface FishingLiveState {
  mode: FishingActionMode;
  reelProgress: number;
  caughtFishColor?: string;
  caughtFishIcon?: string;
  caughtFishName?: string;
  caughtFishCoins?: number;
  celebrateElapsed?: number;
}

interface FishingMinigameProps {
  hasSturdyRod: boolean;
  is3D?: boolean;
  isGlowdeep?: boolean;
  spotLabel?: string;
  onSyncFishingState?: (state: FishingLiveState) => void;
  onCatchFish: (fishName: string, coinsEarned: number) => void;
  onClose: () => void;
}

const FISH_COLORS: Record<string, string> = {
  Minnow: '#89cff0',
  Sunfish: '#ff9f43',
  'Honey Carp': '#f5c542',
  Puffer: '#ffd166',
  Shrimp: '#ff8da8',
  Crab: '#ff5c5c',
  Squid: '#b48cff',
  'Lantern Eel': '#ffbe55',
  'Glowcap Cavefish': '#5eead4',
  'Aurora Trout': '#72efdd',
  'Moon Koi': '#a0c4ff',
  'Cinder Koi': '#ff595e',
  'Dawn Koi': '#ffca3a',
  'Sea Turtle': '#5ec474',
  Starfish: '#ffd23f',
};

const CELEBRATE_DURATION = 1.9;

export const FishingMinigame: React.FC<FishingMinigameProps> = ({
  hasSturdyRod,
  is3D = true,
  isGlowdeep = false,
  spotLabel = 'Waterside Ledge',
  onSyncFishingState,
  onCatchFish,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const progressPctRef = useRef<HTMLSpanElement | null>(null);

  const [mode, setMode] = useState<FishingActionMode>('idle');
  const [catchesCount, setCatchesCount] = useState(0);
  const [lastCatch, setLastCatch] = useState<{
    name: string;
    icon: string;
    coins: number;
    rarity: string;
  } | null>(null);
  const [statusMsg, setStatusMsg] = useState('Hold the Reel button (or Space) to reel a fish in!');

  const isPressingRef = useRef(false);
  const modeRef = useRef<FishingActionMode>('idle');
  const progressRef = useRef(0);
  const celebrateTimerRef = useRef(0);
  const lastCatchColorRef = useRef('#ff9f43');
  const lastTickSfxRef = useRef(0);
  const onSyncRef = useRef(onSyncFishingState);
  onSyncRef.current = onSyncFishingState;
  const onCatchRef = useRef(onCatchFish);
  onCatchRef.current = onCatchFish;

  const pickWeightedFish = useCallback(() => {
    const weighted = FISH_SPECIES.map((f) => ({
      fish: f,
      w: isGlowdeep && f.name === 'Glowcap Cavefish' ? f.weight * 4 : f.weight,
    }));
    const total = weighted.reduce((sum, entry) => sum + entry.w, 0);
    let r = Math.random() * total;
    for (const entry of weighted) {
      if (r < entry.w) return entry.fish;
      r -= entry.w;
    }
    return FISH_SPECIES[0];
  }, [isGlowdeep]);

  const startReeling = useCallback(() => {
    audio.init();
    isPressingRef.current = true;
    if (modeRef.current === 'idle') {
      modeRef.current = 'reeling';
      setMode('reeling');
      setStatusMsg('Reeling it in… keep holding!');
    }
  }, []);

  const stopReeling = useCallback(() => {
    isPressingRef.current = false;
    if (modeRef.current === 'reeling') {
      modeRef.current = 'idle';
      setMode('idle');
      setStatusMsg(
        progressRef.current > 0.08
          ? 'Resting on the ledge… hold Reel to keep pulling!'
          : 'Hold the Reel button (or Space) to fish!'
      );
    }
  }, []);

  // Keyboard hold Space / R and Escape to exit
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        if (!e.repeat) startReeling();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        stopReeling();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', stopReeling);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', stopReeling);
    };
  }, [startReeling, stopReeling, onClose]);

  // Smooth 60fps reel loop + optional 2D fallback canvas
  useEffect(() => {
    let animId = 0;
    let last = performance.now();
    const reelRate = hasSturdyRod ? 0.94 : 0.72;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (modeRef.current === 'celebrate') {
        celebrateTimerRef.current += dt;
        if (celebrateTimerRef.current >= CELEBRATE_DURATION) {
          celebrateTimerRef.current = 0;
          progressRef.current = 0;
          const nextMode: FishingActionMode = isPressingRef.current ? 'reeling' : 'idle';
          modeRef.current = nextMode;
          setMode(nextMode);
          setStatusMsg(
            nextMode === 'reeling'
              ? 'Casting again… reeling it in!'
              : 'Ready on the ledge! Hold Reel (or Space) to fish!'
          );
        }
      } else if (isPressingRef.current) {
        if (modeRef.current !== 'reeling') {
          modeRef.current = 'reeling';
          setMode('reeling');
          setStatusMsg('Reeling it in… keep holding!');
        }
        progressRef.current = Math.min(1, progressRef.current + reelRate * dt);
        if (now - lastTickSfxRef.current > 290) {
          lastTickSfxRef.current = now;
          audio.pop();
        }
        if (progressRef.current >= 1) {
          const caught = pickWeightedFish();
          const fishColor = FISH_COLORS[caught.name] || '#ff9f43';
          lastCatchColorRef.current = fishColor;
          celebrateTimerRef.current = 0;
          modeRef.current = 'celebrate';
          setMode('celebrate');
          setCatchesCount((c) => c + 1);
          setLastCatch({
            name: caught.name,
            icon: caught.icon,
            coins: caught.coins,
            rarity: caught.rarity,
          });
          setStatusMsg(`✨ Caught a ${caught.icon} ${caught.name}! (+${caught.coins} coins)`);
          audio.chime();
          onCatchRef.current(caught.name, caught.coins);
        }
      } else {
        if (modeRef.current !== 'idle') {
          modeRef.current = 'idle';
          setMode('idle');
        }
        progressRef.current = Math.max(0, progressRef.current - 0.16 * dt);
      }

      // Direct DOM bar update (zero React re-render overhead at 60fps)
      const pct = Math.round(progressRef.current * 100);
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${modeRef.current === 'celebrate' ? 100 : pct}%`;
      }
      if (progressPctRef.current) {
        progressPctRef.current.textContent =
          modeRef.current === 'celebrate' ? 'Caught!' : `${pct}%`;
      }

      onSyncRef.current?.({
        mode: modeRef.current,
        reelProgress: progressRef.current,
        caughtFishColor: lastCatchColorRef.current,
        celebrateElapsed: celebrateTimerRef.current,
      });

      // Compact 2D Fallback Water Strip (only shown when WebGL 3D is inactive)
      const canvas = canvasRef.current;
      if (!is3D && canvas) {
        const dpr = Math.min(1.5, window.devicePixelRatio || 1);
        const w = 280;
        const h = 76;
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, w, h);
          const g = ctx.createLinearGradient(0, 0, 0, h);
          g.addColorStop(0, isGlowdeep ? '#192948' : '#a6e4ff');
          g.addColorStop(0.42, isGlowdeep ? '#233b66' : '#65cdf0');
          g.addColorStop(1, isGlowdeep ? '#14233d' : '#2c76b5');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);

          // Bobber + ripples
          const bx = w * 0.65 - progressRef.current * 44;
          const by =
            38 +
            (modeRef.current === 'reeling'
              ? Math.sin(now * 0.025) * 4
              : Math.sin(now * 0.004) * 2.5);
          ctx.strokeStyle = 'rgba(255,255,255,0.45)';
          ctx.lineWidth = 1.5;
          const rad = 8 + ((now * (modeRef.current === 'reeling' ? 0.04 : 0.015)) % 22);
          ctx.beginPath();
          ctx.ellipse(bx, 42, rad * 1.4, rad * 0.35, 0, 0, Math.PI * 2);
          ctx.stroke();

          if (modeRef.current === 'celebrate') {
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🎉🐟✨', w * 0.5, 44);
          } else {
            ctx.fillStyle = '#ff5c7c';
            ctx.beginPath();
            ctx.arc(bx, by, 6, Math.PI, 0);
            ctx.fill();
            ctx.fillStyle = '#fffaf2';
            ctx.beginPath();
            ctx.arc(bx, by, 6, 0, Math.PI);
            ctx.fill();
          }
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animId);
      onSyncRef.current?.({ mode: 'idle', reelProgress: 0 });
    };
  }, [hasSturdyRod, is3D, isGlowdeep, pickWeightedFish]);

  const isReeling = mode === 'reeling';
  const isCelebrating = mode === 'celebrate';

  return (
    <div className="fixed inset-x-0 bottom-[max(0.65rem,env(safe-area-inset-bottom,0px))] z-40 flex justify-center px-3 pointer-events-none">
      <div className="w-full max-w-md pointer-events-auto rounded-3xl border-2 border-[#f3cde0] bg-[#fff8fc]/95 dark:bg-[#231934]/95 dark:border-[#6a4c82] shadow-[0_14px_36px_rgba(24,14,42,0.42)] p-3 sm:p-3.5 flex flex-col gap-2.5">
        {/* Compact Header & Session Tally */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg leading-none">{isCelebrating ? lastCatch?.icon || '🎉' : '🎣'}</span>
            <div className="min-w-0">
              <div className="font-black text-xs sm:text-sm text-[#4a3550] dark:text-[#fdeeff] truncate flex items-center gap-1.5">
                <span>{spotLabel}</span>
                {hasSturdyRod && (
                  <span className="text-[10px] font-extrabold text-[#d85784] dark:text-[#ff9ec0]">
                    · Sturdy Rod
                  </span>
                )}
              </div>
              <div className="text-[11px] font-bold text-[#c94a78] dark:text-[#ff9ec0] truncate">
                {statusMsg}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {catchesCount > 0 && (
              <div className="px-2 py-1 rounded-xl bg-[#ffedf4] dark:bg-[#382752] text-[11px] font-black text-[#4a3550] dark:text-[#fdeeff] border border-[#f5c7da] dark:border-[#785994]">
                🐟 ×{catchesCount}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-xl bg-[#f5e8f0] hover:bg-[#edd7e5] dark:bg-[#3b2b54] dark:hover:bg-[#4d396c] text-[#4a3550] dark:text-[#fdeeff] font-black text-xs transition-colors cursor-pointer"
            >
              Stand Up
            </button>
          </div>
        </div>

        {/* 2D Fallback Water Strip */}
        {!is3D && (
          <canvas
            ref={canvasRef}
            className="w-full h-[76px] rounded-2xl border border-[#f0c7d8] dark:border-[#6b4a7a] block"
          />
        )}

        {/* Celebration Catch Banner OR Reel Progress Gauge */}
        <div className="flex items-center gap-2.5">
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-[#7e6485] dark:text-[#d5bce6]">
              <span>
                {isCelebrating
                  ? `🎉 ${lastCatch?.rarity || 'Nice'} Catch!`
                  : isReeling
                  ? '🌊 Reeling In…'
                  : '☀️ Relaxing on Ledge'}
              </span>
              <span ref={progressPctRef}>0%</span>
            </div>
            <div className="h-3 w-full rounded-full bg-[#eedee8] dark:bg-[#3a2a52] overflow-hidden border border-[#e3c2d5] dark:border-[#6a4c82]">
              <div
                ref={progressBarRef}
                className={`h-full rounded-full transition-colors duration-150 ${
                  isCelebrating
                    ? 'bg-linear-to-r from-[#ffd23f] to-[#ff8da8]'
                    : isReeling
                    ? 'bg-linear-to-r from-[#67d5b5] to-[#4fa8f0]'
                    : 'bg-linear-to-r from-[#a8e6cf] to-[#7bd88f]'
                }`}
                style={{ width: '0%' }}
              />
            </div>
          </div>

          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                // ignore
              }
              startReeling();
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              stopReeling();
            }}
            onPointerCancel={stopReeling}
            onLostPointerCapture={stopReeling}
            onContextMenu={(e) => e.preventDefault()}
            className={`touch-none select-none shrink-0 px-4 sm:px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm shadow-md transition-transform cursor-pointer ${
              isCelebrating
                ? 'bg-linear-to-r from-[#ffd23f] to-[#ff9f43] text-[#4a3550] scale-100'
                : isReeling
                ? 'bg-linear-to-r from-[#38b6ff] to-[#5ec474] text-white scale-95 ring-2 ring-[#bdf2ff]'
                : 'bg-linear-to-r from-[#7bd88f] to-[#4fa8f0] hover:brightness-105 text-white active:scale-95'
            }`}
          >
            {isCelebrating
              ? '✨ Hooray!'
              : isReeling
              ? '🎣 Reeling!'
              : '🎣 Hold to Reel (Space)'}
          </button>
        </div>
      </div>
    </div>
  );
};
