import React, { useRef, useEffect, useState } from 'react';
import { drawMochi } from '../game/characterRenderer';
import { PlayerLook } from '../game/engine';
import { csStage, csLitTree, csFloatingNotes } from '../game/cutscenes';
import { audio } from '../game/audio';
import { SeasonId, WeatherConfig } from '../game/constants';
import { SEASON_THEMES, WEATHER_UI_THEMES, normalizeSeasonId } from '../game/seasons';
import { useDeviceProfile } from '../game/useDeviceProfile';
import { PWAInstallButton } from './PWAInstallButton';

export interface SaveSlotSummary {
  slot: number;
  hasSave: boolean;
  name?: string;
  chapter?: number;
  coins?: number;
}

interface TitleScreenProps {
  hasSavedGame: boolean;
  playerLook: PlayerLook;
  currentSlot: number;
  slotSummaries: SaveSlotSummary[];
  season: SeasonId;
  weather: WeatherConfig;
  onSelectSlot: (slot: number) => void;
  onDeleteSlot: (slot: number) => void;
  onContinue: () => void;
  onNewGame: (preserveEmptySlotLook?: boolean) => void;
  onCustomize: () => void;
  onOpenSettings: () => void;
  onOpenCredits: () => void;
  onOpenGazette: () => void;
  onCarryOverMM1: (mm1SaveCode?: string) => void;
  is3DBackdrop?: boolean;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  hasSavedGame,
  playerLook,
  currentSlot,
  slotSummaries,
  season,
  weather,
  onSelectSlot,
  onDeleteSlot,
  onContinue,
  onNewGame,
  onCustomize,
  onOpenSettings,
  onOpenCredits,
  onOpenGazette,
  onCarryOverMM1,
  is3DBackdrop = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showCarryOverModal, setShowCarryOverModal] = useState(false);
  const [mm1CodeInput, setMm1CodeInput] = useState('');
  const [pendingSlotConfirm, setPendingSlotConfirm] = useState<'new' | 'clear' | null>(null);
  const device = useDeviceProfile();
  const deviceRef = useRef(device);
  deviceRef.current = device;
  const seasonRef = useRef(season);
  seasonRef.current = season;
  const weatherRef = useRef(weather);
  weatherRef.current = weather;

  useEffect(() => {
    if (is3DBackdrop) return;
    let animId: number;
    let t = 0;
    const sizeRef = { w: window.innerWidth || 800, h: window.innerHeight || 600, dpr: 1 };

    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const vw = Math.max(1, window.visualViewport?.width ?? window.innerWidth);
      const vh = Math.max(1, window.visualViewport?.height ?? window.innerHeight);
      const maxDpr = deviceRef.current.isPhone ? 1.25 : 1.5;
      const dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
      sizeRef.w = vw;
      sizeRef.h = vh;
      sizeRef.dpr = dpr;
      canvas.width = Math.floor(vw * dpr);
      canvas.height = Math.floor(vh * dpr);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);
    handleResize();

    const pipLook: PlayerLook = {
      sp: 'bunny',
      col: '#ffffff',
      c2: '',
      ac: '#ff7aa8',
      hat: 'leaf',
      eyes: 0,
      mouth: 0,
      pat: 0,
      out: 0,
      face: 0,
      aura: 0,
      name: 'Pip',
    };
    const gloomLook: PlayerLook = {
      sp: 'axolotl',
      col: '#b8c4d8',
      c2: '#5f6d85',
      ac: '#ffd23f',
      hat: 'ribbon',
      eyes: 2,
      mouth: 0,
      pat: 6,
      out: 0,
      face: 0,
      aura: 1,
      name: 'Gloom',
    };
    const owlLook: PlayerLook = {
      sp: 'owl',
      col: '#8c765f',
      c2: '#e5d9c5',
      ac: '#ffb347',
      hat: 'beret',
      eyes: 1,
      mouth: 0,
      pat: 4,
      out: 1,
      face: 0,
      aura: 2,
      name: 'Professor Hoot',
    };

    let lastFrameMs = 0;
    let cachedVig: { w: number; h: number; grad: CanvasGradient } | null = null;

    const render = (now: number) => {
      if (document.hidden) {
        animId = requestAnimationFrame(render);
        return;
      }
      const { isLandscapePhone, isPhone } = deviceRef.current;
      const minDelta = isPhone ? 32 : 16; // ~30fps on phones saves battery & stays silky smooth
      if (now - lastFrameMs < minDelta) {
        animId = requestAnimationFrame(render);
        return;
      }
      const dtScale = lastFrameMs ? Math.min(2.5, (now - lastFrameMs) / 16.67) : 1;
      lastFrameMs = now;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const W = sizeRef.w;
          const H = sizeRef.h;
          const dpr = sizeRef.dpr;
          const u = Math.min(W, H);
          t += 0.02 * dtScale;

          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

          // Animated cycle through daytime stages (Dawn to Starlight) with live season & weather
          const activeSeason = normalizeSeasonId(seasonRef.current);
          const activeWeather = weatherRef.current;
          const cycle = Math.floor(t / 8) % 4;
          csStage(ctx, W, H, t, cycle, activeSeason);

          const treeX = isLandscapePhone ? W * 0.44 : W * 0.86;
          const treeY = isLandscapePhone ? H * 0.74 : H * 0.72;
          const treeScale = Math.max(0.55, u / 800);
          csLitTree(ctx, treeX, treeY, treeScale, 0, activeSeason);

          // Frame cast cleanly for compact landscape phones, tablets, and widescreen desktops
          const charScaleBase = isLandscapePhone
            ? Math.max(2.6, u * 0.0082)
            : Math.max(3.2, u * 0.009);
          const heroScale = isLandscapePhone
            ? Math.max(3.4, u * 0.0108)
            : Math.max(3.8, u * 0.0118);

          const xs = isLandscapePhone
            ? [W * 0.09, W * 0.21, W * 0.34, W * 0.46]
            : [W * 0.18, W * 0.38, W * 0.54, W * 0.76];
          const baseY = isLandscapePhone ? H * 0.86 : H * 0.85;

          drawMochi(ctx, xs[0], baseY - H * 0.02, charScaleBase * 0.94, Math.sin(t * 2) * 1.5, 1, t % 4 < 0.12, pipLook, false, t);
          drawMochi(ctx, xs[1], baseY - H * 0.01, charScaleBase, Math.sin(t * 2.8) * 1.8, 1, t % 3.5 < 0.12, gloomLook, false, t);
          drawMochi(ctx, xs[2], baseY + H * 0.01, heroScale, Math.sin(t * 2.5) * 2, 1, t % 3 < 0.12, playerLook, false, t);
          drawMochi(ctx, xs[3], baseY - H * 0.03, charScaleBase, Math.sin(t * 2.2) * 1.5, -1, t % 5 < 0.12, owlLook, false, t);

          const seasonNoteColor =
            activeSeason === 'winter'
              ? '#d8eeff'
              : activeSeason === 'autumn'
              ? '#ffd685'
              : activeSeason === 'summer'
              ? '#fff185'
              : '#ffe27a';
          const noteCount = isPhone ? 10 : 18;
          csFloatingNotes(ctx, W, H, t, noteCount, seasonNoteColor, '♪', isPhone ? 14 : 18);

          // Seasonal ambient title motes (cherry petals, summer sunbeams, autumn leaves, snowflakes)
          const seasonalParticleCount = isPhone ? 8 : 16;
          const particlePalette = SEASON_THEMES[activeSeason].world.moteColors;
          ctx.save();
          for (let i = 0; i < seasonalParticleCount; i++) {
            const prog = ((t * 0.12 + (i * 0.137)) % 1 + 1) % 1;
            const px =
              ((i * 0.173 + (activeSeason === 'winter' ? Math.sin(t * 0.9 + i) * 0.02 : Math.sin(t * 0.7 + i) * 0.035)) % 1) * W;
            const py =
              activeSeason === 'summer'
                ? H * (0.9 - prog * 0.85)
                : H * (prog * 0.96);
            ctx.globalAlpha = Math.sin(prog * Math.PI) * 0.78;
            ctx.fillStyle = particlePalette[i % particlePalette.length];
            ctx.beginPath();
            if (activeSeason === 'autumn') {
              ctx.ellipse(px, py, 4.2, 2.4, t * 1.6 + i, 0, Math.PI * 2);
            } else if (activeSeason === 'spring') {
              ctx.ellipse(px, py, 3.6, 2.2, t * 1.4 + i, 0, Math.PI * 2);
            } else {
              ctx.arc(px, py, activeSeason === 'winter' ? 2.6 : 3, 0, Math.PI * 2);
            }
            ctx.fill();
          }
          ctx.restore();

          // Live Weather Atmosphere Overlay on Title Screen (keeps changing even when nobody plays)
          if (activeWeather) {
            ctx.save();
            ctx.fillStyle = activeWeather.tintColor;
            ctx.fillRect(0, 0, W, H);
            if (activeWeather.particleType === 'rain') {
              ctx.strokeStyle = 'rgba(185, 222, 255, 0.55)';
              ctx.lineWidth = 1.4;
              const dropCount = isPhone ? 24 : 48;
              ctx.beginPath();
              for (let i = 0; i < dropCount; i++) {
                const prog = ((t * 1.6 + i * 0.19) % 1 + 1) % 1;
                const rx = ((i * 97.3 - prog * 90) % (W + 80) + (W + 80)) % (W + 80) - 40;
                const ry = prog * (H + 40) - 20;
                ctx.moveTo(rx, ry);
                ctx.lineTo(rx - 4, ry + 13);
              }
              ctx.stroke();
            } else if (activeWeather.particleType === 'snow') {
              ctx.fillStyle = 'rgba(245, 252, 255, 0.88)';
              const flakeCount = isPhone ? 20 : 40;
              for (let i = 0; i < flakeCount; i++) {
                const prog = ((t * 0.18 + i * 0.17) % 1 + 1) % 1;
                const sx = ((i * 0.131 + Math.sin(t * 1.2 + i) * 0.025) % 1) * W;
                const sy = prog * H;
                ctx.beginPath();
                ctx.arc(sx, sy, 1.5 + (i % 3) * 0.8, 0, Math.PI * 2);
                ctx.fill();
              }
            } else if (activeWeather.particleType === 'stardust') {
              const starCount = isPhone ? 16 : 32;
              for (let i = 0; i < starCount; i++) {
                const prog = ((t * 0.14 + i * 0.23) % 1 + 1) % 1;
                const sx = ((i * 0.193 + Math.cos(t * 0.9 + i) * 0.03) % 1) * W;
                const sy = prog * H;
                ctx.globalAlpha = 0.4 + 0.55 * Math.abs(Math.sin(t * 2.5 + i));
                ctx.fillStyle = i % 2 === 0 ? '#ffe89a' : '#d8b4ff';
                ctx.beginPath();
                ctx.arc(sx, sy, 2 + (i % 2), 0, Math.PI * 2);
                ctx.fill();
              }
            } else if (activeWeather.particleType === 'aurora') {
              const bands = ['#64f5c1', '#b48cff'];
              bands.forEach((col, bi) => {
                ctx.fillStyle = col;
                ctx.globalAlpha = 0.09 + 0.04 * Math.sin(t + bi);
                ctx.beginPath();
                const by = H * (0.14 + bi * 0.09);
                ctx.moveTo(0, by);
                for (let x = 0; x <= W + 60; x += 60) {
                  ctx.lineTo(x, by + Math.sin(x * 0.008 + t * 0.9 + bi) * 22);
                }
                for (let x = W + 60; x >= 0; x -= 60) {
                  ctx.lineTo(x, by + 44 + Math.cos(x * 0.007 + t * 0.8 + bi) * 16);
                }
                ctx.closePath();
                ctx.fill();
              });
            } else if (activeWeather.particleType === 'muffins') {
              const mCount = isPhone ? 6 : 12;
              ctx.globalAlpha = 0.85;
              for (let i = 0; i < mCount; i++) {
                const prog = ((t * 0.14 + i * 0.27) % 1 + 1) % 1;
                const mx = ((i * 0.18 + prog * 0.3) % 1) * W;
                const my = prog * H;
                ctx.fillStyle = '#ffe0a3';
                ctx.beginPath();
                ctx.arc(mx, my, 5, Math.PI, 0);
                ctx.fill();
                ctx.fillStyle = i % 2 === 0 ? '#ff9ebb' : '#9be8d8';
                ctx.fillRect(mx - 4, my, 8, 4.5);
              }
            }
            ctx.restore();
          }

          // Cached atmospheric radial vignette for storybook masthead contrast
          if (!cachedVig || cachedVig.w !== W || cachedVig.h !== H) {
            const vig = ctx.createRadialGradient(W * 0.5, H * 0.42, u * 0.25, W * 0.5, H * 0.5, Math.max(W, H) * 0.85);
            vig.addColorStop(0, 'rgba(20, 12, 35, 0)');
            vig.addColorStop(1, 'rgba(18, 10, 32, 0.44)');
            cachedVig = { w: W, h: H, grad: vig };
          }
          ctx.fillStyle = cachedVig.grad;
          ctx.fillRect(0, 0, W, H);
        }
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, [playerLook, is3DBackdrop]);

  const isLandscapePhone = device.isLandscapePhone;

  return (
    <div className="fixed inset-0 z-20 pointer-events-auto overflow-y-auto overscroll-contain pt-safe pb-safe pl-safe pr-safe">
      {is3DBackdrop ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 -z-10 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 42%, rgba(20, 12, 35, 0.08) 25%, rgba(18, 10, 32, 0.48) 100%)',
          }}
        />
      ) : (
        <canvas
          ref={canvasRef}
          className="fixed inset-0 w-full h-full block -z-10"
        />
      )}
      <div
        className={`min-h-full w-full flex ${
          isLandscapePhone
            ? 'flex-row items-center justify-between px-4 sm:px-6 py-2 gap-4'
            : 'flex-col items-center justify-center px-3 sm:px-6 py-3 sm:pb-12 gap-3 sm:gap-4'
        }`}
      >

      {/* Storybook Title Masthead */}
      <div
        className={`text-[#fff9ec] select-none animate-in fade-in slide-in-from-top-6 duration-700 shrink-0 ${
          isLandscapePhone
            ? 'text-left self-start pt-2 max-w-[46%]'
            : 'text-center max-w-2xl px-2'
        }`}
      >
        <div
          className={`inline-flex items-center gap-2 text-[10px] sm:text-xs font-black tracking-[0.2em] uppercase text-[#ffe27a] mb-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)] ${
            isLandscapePhone ? '' : 'justify-center'
          }`}
        >
          {!isLandscapePhone && (
            <span className="h-[1.5px] w-6 sm:w-10 bg-linear-to-r from-transparent to-[#ffe27a]/90 rounded-full" />
          )}
          <span>🌅 The Dawn Duet</span>
          <span className="h-[1.5px] w-6 sm:w-10 bg-linear-to-l from-transparent to-[#ffe27a]/90 rounded-full" />
        </div>
        <h1
          className={`font-display font-black tracking-tight text-transparent bg-clip-text bg-linear-to-b from-[#fffdf7] via-[#fff2cf] to-[#ffd47a] drop-shadow-[0_6px_22px_rgba(32,14,48,0.75)] leading-[1.06] ${
            isLandscapePhone
              ? 'text-3xl sm:text-4xl'
              : 'text-4xl xs:text-5xl sm:text-6xl md:text-7xl'
          }`}
        >
          Mochi Meadows 2
        </h1>
        <p
          className={`font-display italic font-bold mt-1 text-[#ffeab0] drop-shadow-[0_2px_10px_rgba(25,10,40,0.8)] tracking-wide ${
            isLandscapePhone ? 'text-xs' : 'text-xs xs:text-sm sm:text-base'
          }`}
        >
          “Every dream ends. Every song doesn’t.” ♪
        </p>
      </div>

      {/* Unified Menu Stack */}
      <div
        className={`flex flex-col items-center w-full animate-in fade-in slide-in-from-bottom-6 duration-700 select-none shrink-0 ${
          isLandscapePhone
            ? 'w-[52%] max-w-[340px] max-h-full overflow-y-auto gap-1.5 py-1 pr-1'
            : 'max-w-[330px] sm:max-w-sm px-1 gap-2 sm:gap-2.5'
        }`}
      >
        {/* Save Slot Selector Bar */}
        <div className="w-full flex flex-col gap-1 storybook-panel border border-[var(--bd)] p-1 sm:p-1.5 rounded-2xl">
          <div className="w-full flex items-center justify-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--ac)] pl-2 pr-1 whitespace-nowrap">
              Slots
            </span>
            {[1, 2, 3].map((slotNum) => {
              const info = slotSummaries.find((s) => s.slot === slotNum);
              const isSelected = currentSlot === slotNum;
              return (
                <button
                  key={slotNum}
                  onClick={() => {
                    audio.noteSpeech?.(75 + slotNum * 2);
                    setPendingSlotConfirm(null);
                    onSelectSlot(slotNum);
                  }}
                  className={`flex-1 py-1 px-1.5 rounded-xl text-center transition-all cursor-pointer min-w-0 ${
                    isSelected
                      ? 'text-white shadow-[0_2px_8px_var(--season-glow)]'
                      : 'text-[var(--fg)] hover:bg-[var(--ac)]/12 dark:hover:bg-white/10'
                  }`}
                  style={isSelected ? { backgroundColor: 'var(--ac)' } : undefined}
                >
                  <div className="text-[11px] font-black leading-tight whitespace-nowrap">Slot {slotNum}</div>
                  <div
                    className={`text-[9px] font-bold leading-tight truncate ${
                      isSelected ? 'text-white/90' : 'opacity-70'
                    }`}
                  >
                    {info?.hasSave ? `${info.name || 'Mochi'} · Ch.${info.chapter ?? 1}` : 'Empty'}
                  </div>
                </button>
              );
            })}
          </div>
          {hasSavedGame && (() => {
            const activeInfo = slotSummaries.find((s) => s.slot === currentSlot);
            return (
              <div className="flex items-center justify-between gap-2 px-2 pt-0.5 text-[10px] font-bold text-[var(--fg)]/80">
                <span className="truncate">
                  {activeInfo?.name || 'Mochi'} · Chapter {activeInfo?.chapter ?? 1} · {activeInfo?.coins ?? 0} 🪙
                </span>
                <button
                  onClick={() => {
                    audio.noteSpeech?.(68);
                    setPendingSlotConfirm((prev) => (prev === 'clear' ? null : 'clear'));
                  }}
                  className="text-[10px] font-black text-[#d94a6a] dark:text-[#ff9bb2] hover:underline cursor-pointer shrink-0"
                  title={`Erase save data in Slot ${currentSlot}`}
                >
                  🗑 Clear Slot
                </button>
              </div>
            );
          })()}
        </div>

        {/* Inline Confirmation Banner when Overwriting or Clearing a Saved Slot */}
        {pendingSlotConfirm && (
          <div className="w-full storybook-panel border-2 border-[#ff6b8a] rounded-2xl p-2.5 flex flex-col gap-2 text-center animate-in fade-in duration-150">
            <div className="text-[11px] font-black text-[var(--fg)] leading-snug">
              {pendingSlotConfirm === 'clear'
                ? `Erase all saved progress in Slot ${currentSlot}? This cannot be undone.`
                : `Start a brand-new journey in Slot ${currentSlot}? Your previous Slot ${currentSlot} save will be replaced.`}
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  const action = pendingSlotConfirm;
                  setPendingSlotConfirm(null);
                  if (action === 'clear') {
                    audio.noteSpeech?.(62);
                    onDeleteSlot(currentSlot);
                  } else {
                    audio.chime();
                    onNewGame(false);
                  }
                }}
                className="flex-1 py-1.5 px-2.5 rounded-xl bg-[#ff5c7c] hover:brightness-105 text-white text-[11px] font-black cursor-pointer transition-all active:scale-95"
              >
                {pendingSlotConfirm === 'clear' ? '🗑 Erase Slot' : '✨ Erase & Start Fresh'}
              </button>
              <button
                onClick={() => setPendingSlotConfirm(null)}
                className="px-3 py-1.5 rounded-xl storybook-well text-[11px] font-black text-[var(--fg)] cursor-pointer hover:opacity-80"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Read-Only Live World Season & Weather Status */}
        {(() => {
          const activeTheme = SEASON_THEMES[normalizeSeasonId(season)];
          const weatherMood = WEATHER_UI_THEMES[weather.id];
          return (
            <div
              className="w-full flex items-center justify-between gap-1.5 storybook-panel border border-[var(--bd)] px-2.5 py-1.5 rounded-2xl text-[11px] font-black text-[var(--fg)]"
              title={`${activeTheme.subtitle} · ${weather.name} (${weatherMood.moodLabel}) — Seasons and weather shift automatically`}
            >
              <span className="flex items-center gap-1.5 truncate">
                <span>{activeTheme.icon}</span>
                <span className="truncate">{activeTheme.subtitle}</span>
              </span>
              <span className="h-3.5 w-[1px] bg-[var(--bd)] shrink-0" />
              <span className="flex items-center gap-1.5 truncate">
                <span>{weather.icon}</span>
                <span className="truncate">{weather.name}</span>
              </span>
            </div>
          );
        })()}

        {hasSavedGame && (
          <button
            onClick={() => {
              audio.chime();
              setPendingSlotConfirm(null);
              onContinue();
            }}
            className={`w-full px-4 sm:px-6 bg-linear-to-b from-[#8ae49d] via-[#69ce7f] to-[#52b869] hover:brightness-105 text-white font-black text-sm sm:text-base rounded-2xl border border-[#b8f7c4]/60 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.5),0_10px_24px_-6px_rgba(40,120,65,0.55)] transition-all hover:scale-[1.015] active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
              isLandscapePhone ? 'py-2' : 'py-2.5 sm:py-3'
            }`}
          >
            <span>▶</span>
            <span>Continue Slot {currentSlot}</span>
          </button>
        )}
        <button
          onClick={() => {
            if (hasSavedGame) {
              audio.noteSpeech?.(70);
              setPendingSlotConfirm('new');
              return;
            }
            audio.chime();
            onNewGame(true);
          }}
          className={`w-full px-4 sm:px-6 bg-linear-to-b from-[#ff8bb3] via-[#ff709e] to-[#eb5385] hover:brightness-105 text-white font-black text-sm sm:text-base rounded-2xl border border-[#ffc4da]/60 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.5),0_10px_24px_-6px_rgba(180,45,95,0.5)] transition-all hover:scale-[1.015] active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
            isLandscapePhone ? 'py-2' : 'py-2.5 sm:py-3'
          }`}
        >
          <span>✨</span>
          <span>{hasSavedGame ? `Start New in Slot ${currentSlot}` : `Begin Dawn Duet (Slot ${currentSlot})`}</span>
        </button>

        <div className="flex gap-2 w-full">
          <button
            onClick={() => {
              audio.noteSpeech?.(75);
              onCustomize();
            }}
            className={`flex-1 px-3 storybook-panel border border-[#ffd3e2] dark:border-[#6b4a7a] hover:border-[#ff7aa8] text-[#4a3550] dark:text-[#fdeeff] font-black text-xs sm:text-sm rounded-2xl transition-all hover:scale-[1.015] active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              isLandscapePhone ? 'py-1.5' : 'py-2 sm:py-2.5'
            }`}
          >
            <span>🎨</span>
            <span>Wardrobe</span>
          </button>
          <button
            onClick={() => {
              audio.noteSpeech?.(78);
              setShowCarryOverModal(true);
            }}
            className={`flex-1 px-3 storybook-panel border border-[#f5ca4c] dark:border-[#ffd23f]/80 hover:border-[#ff9f43] text-[#4a3550] dark:text-[#fdeeff] font-black text-xs sm:text-sm rounded-2xl transition-all hover:scale-[1.015] active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              isLandscapePhone ? 'py-1.5' : 'py-2 sm:py-2.5'
            }`}
          >
            <span>📜</span>
            <span>Carry Over MM1</span>
          </button>
        </div>

        <div className="flex gap-1.5 sm:gap-2 w-full">
          <button
            onClick={() => {
              audio.noteSpeech?.(80);
              onOpenGazette();
            }}
            className="flex-1 py-1.5 sm:py-2 px-1.5 sm:px-2 storybook-panel border border-[#ffd3e2]/90 dark:border-[#6b4a7a]/90 hover:border-[#ff7aa8] text-[#4a3550] dark:text-[#fdeeff] font-black text-[11px] sm:text-xs rounded-xl transition-all hover:scale-[1.015] active:scale-95 flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <span>📰</span>
            <span>Gazette</span>
          </button>
          <button
            onClick={() => {
              audio.noteSpeech?.(82);
              onOpenSettings();
            }}
            className="flex-1 py-1.5 sm:py-2 px-1.5 sm:px-2 storybook-panel border border-[#ffd3e2]/90 dark:border-[#6b4a7a]/90 hover:border-[#ff7aa8] text-[#4a3550] dark:text-[#fdeeff] font-black text-[11px] sm:text-xs rounded-xl transition-all hover:scale-[1.015] active:scale-95 flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <span>⚙️</span>
            <span>Settings</span>
          </button>
          <button
            onClick={() => {
              audio.noteSpeech?.(85);
              onOpenCredits();
            }}
            className="flex-1 py-1.5 sm:py-2 px-1.5 sm:px-2 storybook-panel border border-[#ffd3e2]/90 dark:border-[#6b4a7a]/90 hover:border-[#ff7aa8] text-[#4a3550] dark:text-[#fdeeff] font-black text-[11px] sm:text-xs rounded-xl transition-all hover:scale-[1.015] active:scale-95 flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <span>🎬</span>
            <span>Credits</span>
          </button>
        </div>

        <PWAInstallButton variant="title" />
      </div>
      </div>

      {/* Carry Over Modal */}
      {showCarryOverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-modal-safe bg-[#160f24]/88">
          <div className="w-full max-w-md max-h-[92dvh] overflow-y-auto storybook-modal rounded-3xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base sm:text-lg font-black text-[#4a3550] dark:text-[#fdeeff] flex items-center gap-2">
                <span>🌸</span>
                <span>Mochi Meadows 1 Save Carry-Over</span>
              </h3>
              <button
                onClick={() => setShowCarryOverModal(false)}
                className="w-8 h-8 rounded-full storybook-well hover:bg-[#ff7aa8] hover:text-white text-xs font-black flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-[#5a425f] dark:text-[#d4c3db] leading-relaxed font-semibold">
              Did you play the original Mochi Meadows? Carry over your character name, colors, and unlock the exclusive <strong>First-Dream Scarf</strong>, <strong>Golden Note</strong>, and 100 bonus Island Coins!
            </p>
            <input
              type="text"
              value={mm1CodeInput}
              onChange={(e) => setMm1CodeInput(e.target.value)}
              placeholder="Paste MM1 Save Code (optional)"
              className="w-full p-2.5 text-xs bg-white/90 dark:bg-[#1b1424] border border-[#e6bed0] dark:border-[#5a3a6b] rounded-xl outline-none focus:border-[#ff7aa8] font-bold"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onCarryOverMM1(mm1CodeInput.trim() || undefined);
                  setShowCarryOverModal(false);
                }}
                className="flex-1 py-2.5 bg-linear-to-r from-[#7bd88f] to-[#5ec474] text-white text-xs font-black rounded-xl shadow-md transition-all hover:brightness-105 active:scale-95 cursor-pointer"
              >
                ✨ Carry Over & Begin!
              </button>
              <button
                onClick={() => setShowCarryOverModal(false)}
                className="py-2.5 px-4 storybook-well hover:bg-[#ffd3e2]/40 text-xs font-black rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
