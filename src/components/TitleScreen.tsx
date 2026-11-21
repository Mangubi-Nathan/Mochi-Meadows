import React, { useRef, useEffect, useState } from 'react';
import { drawMochi } from '../game/characterRenderer';
import { PlayerLook } from '../game/engine';
import { csStage, csLitTree, csFloatingNotes } from '../game/cutscenes';
import { audio } from '../game/audio';
import { useDeviceProfile } from '../game/useDeviceProfile';
import { PWAInstallButton } from './PWAInstallButton';

interface TitleScreenProps {
  hasSavedGame: boolean;
  playerLook: PlayerLook;
  currentSlot: number;
  onSelectSlot: (slot: number) => void;
  onContinue: () => void;
  onNewGame: () => void;
  onCustomize: () => void;
  onOpenSettings: () => void;
  onOpenCredits: () => void;
  onOpenGazette: () => void;
  onCarryOverMM1: (mm1SaveCode?: string) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  hasSavedGame,
  playerLook,
  currentSlot,
  onSelectSlot,
  onContinue,
  onNewGame,
  onCustomize,
  onOpenSettings,
  onOpenCredits,
  onOpenGazette,
  onCarryOverMM1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showCarryOverModal, setShowCarryOverModal] = useState(false);
  const [mm1CodeInput, setMm1CodeInput] = useState('');
  const device = useDeviceProfile();
  const deviceRef = useRef(device);
  deviceRef.current = device;

  useEffect(() => {
    let animId: number;
    let t = 0;
    const sizeRef = { w: window.innerWidth || 800, h: window.innerHeight || 600, dpr: 1 };

    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const vw = Math.max(1, window.visualViewport?.width ?? window.innerWidth);
      const vh = Math.max(1, window.visualViewport?.height ?? window.innerHeight);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
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

    const render = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const W = sizeRef.w;
          const H = sizeRef.h;
          const dpr = sizeRef.dpr;
          const u = Math.min(W, H);
          const { isLandscapePhone, isPhone } = deviceRef.current;
          t += 0.02;

          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

          // Animated cycle through daytime stages (Dawn to Starlight)
          const cycle = Math.floor(t / 8) % 4;
          csStage(ctx, W, H, t, cycle);

          const treeX = isLandscapePhone ? W * 0.44 : W * 0.86;
          const treeY = isLandscapePhone ? H * 0.74 : H * 0.72;
          const treeScale = Math.max(0.55, u / 800);
          csLitTree(ctx, treeX, treeY, treeScale, 0);

          // Adapt character placement so portrait, landscape phone, tablet, and desktop frame the cast cleanly
          const charScaleBase = isLandscapePhone
            ? Math.max(2.6, u * 0.0082)
            : isPhone
            ? Math.max(2.8, u * 0.0088)
            : Math.max(3.2, u * 0.009);
          const heroScale = isLandscapePhone
            ? Math.max(3.4, u * 0.0108)
            : Math.max(3.8, u * 0.0118);

          const xs = isLandscapePhone
            ? [W * 0.09, W * 0.21, W * 0.34, W * 0.46]
            : isPhone && W < H
            ? [W * 0.14, W * 0.35, W * 0.56, W * 0.81]
            : [W * 0.18, W * 0.38, W * 0.54, W * 0.76];
          const baseY = isLandscapePhone ? H * 0.86 : H * 0.85;

          drawMochi(ctx, xs[0], baseY - H * 0.02, charScaleBase * 0.94, Math.sin(t * 2) * 1.5, 1, t % 4 < 0.12, pipLook, false, t);
          drawMochi(ctx, xs[1], baseY - H * 0.01, charScaleBase, Math.sin(t * 2.8) * 1.8, 1, t % 3.5 < 0.12, gloomLook, false, t);
          drawMochi(ctx, xs[2], baseY + H * 0.01, heroScale, Math.sin(t * 2.5) * 2, 1, t % 3 < 0.12, playerLook, false, t);
          drawMochi(ctx, xs[3], baseY - H * 0.03, charScaleBase, Math.sin(t * 2.2) * 1.5, -1, t % 5 < 0.12, owlLook, false, t);

          csFloatingNotes(ctx, W, H, t, isLandscapePhone ? 12 : 18, '#ffe27a', '♪', isPhone ? 14 : 18);

          // Soft atmospheric radial vignette for storybook masthead contrast
          const vig = ctx.createRadialGradient(W * 0.5, H * 0.42, u * 0.25, W * 0.5, H * 0.5, Math.max(W, H) * 0.85);
          vig.addColorStop(0, 'rgba(20, 12, 35, 0)');
          vig.addColorStop(1, 'rgba(18, 10, 32, 0.44)');
          ctx.fillStyle = vig;
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
  }, [playerLook]);

  const isLandscapePhone = device.isLandscapePhone;

  return (
    <div className="fixed inset-0 z-20 pointer-events-auto overflow-y-auto overscroll-contain pt-safe pb-safe pl-safe pr-safe">
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full block -z-10"
      />
      <div
        className={`min-h-full w-full flex ${
          isLandscapePhone
            ? 'flex-row items-center justify-between px-4 sm:px-6 py-2 gap-4'
            : 'flex-col items-center justify-center px-3 sm:px-6 py-4 sm:pb-24 gap-3 sm:gap-4'
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
        <div className="w-full flex items-center justify-center gap-1.5 storybook-panel border border-[#ffd3e2]/85 dark:border-[#6b4a7a]/85 p-1 sm:p-1.5 rounded-2xl">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#e0578d] dark:text-[#ff99bd] pl-2 pr-1 whitespace-nowrap">
            Save Slot
          </span>
          {[1, 2, 3].map((slotNum) => (
            <button
              key={slotNum}
              onClick={() => {
                audio.noteSpeech?.(75 + slotNum * 2);
                onSelectSlot(slotNum);
              }}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                currentSlot === slotNum
                  ? 'bg-linear-to-b from-[#ff8bb3] to-[#f05c93] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_8px_rgba(240,92,147,0.35)]'
                  : 'text-[#4a3550] dark:text-[#fdeeff] hover:bg-[#ff7aa8]/12 dark:hover:bg-white/10'
              }`}
            >
              Slot {slotNum}
            </button>
          ))}
        </div>

        {hasSavedGame && (
          <button
            onClick={() => {
              audio.chime();
              onContinue();
            }}
            className={`w-full px-4 sm:px-6 bg-linear-to-b from-[#8ae49d] via-[#69ce7f] to-[#52b869] hover:brightness-105 text-white font-black text-sm sm:text-base rounded-2xl border border-[#b8f7c4]/60 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.5),0_10px_24px_-6px_rgba(40,120,65,0.55)] transition-all hover:scale-[1.015] active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
              isLandscapePhone ? 'py-2' : 'py-2.5 sm:py-3'
            }`}
          >
            <span>▶</span>
            <span>Continue Adventure</span>
          </button>
        )}
        <button
          onClick={() => {
            audio.chime();
            onNewGame();
          }}
          className={`w-full px-4 sm:px-6 bg-linear-to-b from-[#ff8bb3] via-[#ff709e] to-[#eb5385] hover:brightness-105 text-white font-black text-sm sm:text-base rounded-2xl border border-[#ffc4da]/60 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.5),0_10px_24px_-6px_rgba(180,45,95,0.5)] transition-all hover:scale-[1.015] active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
            isLandscapePhone ? 'py-2' : 'py-2.5 sm:py-3'
          }`}
        >
          <span>✨</span>
          <span>{hasSavedGame ? 'Start New Journey' : 'Begin Dawn Duet'}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-modal-safe bg-black/55 backdrop-blur-xs">
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
