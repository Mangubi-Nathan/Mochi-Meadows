import React, { useState, useEffect, useRef } from 'react';
import { PlayerLook } from '../game/engine';
import { drawMochi, drawCompanion } from '../game/characterRenderer';
import {
  SPECIES_LIST,
  COLOR_PALETTE,
  ACCENT_PALETTE,
  HAT_OPTIONS,
  EYE_OPTIONS,
  MOUTH_OPTIONS,
  PATTERN_OPTIONS,
  OUTFIT_OPTIONS,
  FACE_OPTIONS,
  AURA_OPTIONS,
  MUSIC_TRACKS,
} from '../game/constants';
import { audio } from '../game/audio';

interface WardrobeModalProps {
  look: PlayerLook;
  onUpdateLook: (updated: Partial<PlayerLook>) => void;
  onClose: () => void;
  onSave: () => void;
  onCopySaveCode: () => void;
  onLoadSaveCode: () => void;
  onNewGame: () => void;
  currentTrackIndex: number;
  onSelectTrack: (idx: number) => void;
}

export const WardrobeModal: React.FC<WardrobeModalProps> = ({
  look,
  onUpdateLook,
  onClose,
  onSave,
  onCopySaveCode,
  onLoadSaveCode,
  onNewGame,
  currentTrackIndex,
  onSelectTrack,
}) => {
  const [activeTab, setActiveTab] = useState<'body' | 'colors' | 'face' | 'style' | 'music'>('body');
  const [isWalking, setIsWalking] = useState(false);
  const [downloadingIdx, setDownloadingIdx] = useState<number | null>(null);
  const [downloadMsg, setDownloadMsg] = useState<string>('');
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lookRef = useRef(look);
  const isWalkingRef = useRef(isWalking);
  lookRef.current = look;
  isWalkingRef.current = isWalking;

  // Animate character preview smoothly without restarting when clothes change
  useEffect(() => {
    let animId: number;
    const render = (time: number) => {
      const canvas = previewCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          // Cozy gradient background
          const g = ctx.createLinearGradient(0, 0, 0, h);
          g.addColorStop(0, '#8ed0ff');
          g.addColorStop(0.74, '#e2f6ff');
          g.addColorStop(0.74, '#a0e28c');
          g.addColorStop(1, '#6fc47c');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);

          // Little clouds & daisies
          const t = time / 1000;
          for (let i = 0; i < 4; i++) {
            const cx = ((i * 120 + t * 12) % (w + 140)) - 70;
            ctx.fillStyle = 'rgba(255,255,255,0.75)';
            ctx.beginPath();
            ctx.arc(cx, 40 + (i % 2) * 20, 18, 0, Math.PI * 2);
            ctx.arc(cx + 20, 44 + (i % 2) * 20, 14, 0, Math.PI * 2);
            ctx.fill();
          }

          // Daisies on grass
          for (let i = 0; i < 8; i++) {
            ctx.fillStyle = i % 3 ? '#5fb870' : '#f59cc0';
            ctx.beginPath();
            ctx.arc(i * 54 + 20, h * 0.74 + 10 + (i % 2) * 10, 4.5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Mochi character centered nicely with room for tall hats, companion & auras
          const walking = isWalkingRef.current;
          const faceDir = Math.sin(t * 0.8) > 0.4 ? -1 : 1;
          const bob = walking ? -Math.abs(Math.sin(t * 11)) * 2 : Math.sin(t * 2.2) * 1.2;
          const comp = lookRef.current.companion ?? 'gloom';
          if (comp !== 'none') {
            ctx.save();
            ctx.translate(w / 2 - faceDir * 72, h * 0.67);
            ctx.scale(2.2, 2.2);
            drawCompanion(ctx, 0, 0, comp, t);
            ctx.restore();
          }
          drawMochi(ctx, w / 2, h * 0.69, 3.8, bob, faceDir, t % 4 < 0.12, lookRef.current, walking, t);
        }
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleRandomize = () => {
    const randomItem = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
    onUpdateLook({
      sp: randomItem(SPECIES_LIST)[0],
      col: randomItem(COLOR_PALETTE),
      c2: Math.random() < 0.5 ? '' : randomItem(COLOR_PALETTE),
      ac: randomItem(ACCENT_PALETTE),
      eyes: randomItem(EYE_OPTIONS)[0],
      mouth: randomItem(MOUTH_OPTIONS)[0],
      pat: randomItem(PATTERN_OPTIONS)[0],
      hat: randomItem(HAT_OPTIONS)[0],
      out: randomItem(OUTFIT_OPTIONS)[0],
      face: randomItem(FACE_OPTIONS)[0],
      aura: randomItem(AURA_OPTIONS)[0],
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    audio.init();
    Array.from(files).forEach((file) => {
      audio.addCustomTrack(file);
    });
    onSelectTrack(16);
  };

  const handleDownloadTrack = async (trackIdx: number) => {
    if (downloadingIdx !== null) return;
    setDownloadingIdx(trackIdx);
    setDownloadMsg(`Rendering "${MUSIC_TRACKS[trackIdx]?.[1] || 'Track'}" to stereo WAV...`);
    try {
      const filename = await audio.downloadTrackAsWav(trackIdx);
      setDownloadMsg(`Saved ${filename} to your device!`);
      audio.chime();
    } catch {
      setDownloadMsg('Could not export audio on this browser.');
    } finally {
      setDownloadingIdx(null);
      setTimeout(() => setDownloadMsg(''), 3500);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-modal-safe bg-black/50 backdrop-blur-sm pointer-events-auto">
      <div className="relative w-full max-w-3xl storybook-modal rounded-2xl sm:rounded-3xl p-3 sm:p-5 max-h-[94dvh] flex flex-col gap-2.5 sm:gap-3 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-[#f0c7d8]/80 dark:border-[#5b3b6b]/80 pb-2 shrink-0">
          <div>
            <h2 className="text-base sm:text-xl font-black text-[#4a3550] dark:text-[#fdeeff] leading-none">
              ✨ Mochi Wardrobe
            </h2>
            <p className="text-[11px] sm:text-xs font-bold text-[#d85784] dark:text-[#ff9ec0] mt-1">
              Customize species, colors, outfits, companions & soundtrack
            </p>
          </div>
          <button
            onClick={onClose}
            title="Close Wardrobe"
            className="w-8 h-8 rounded-full storybook-card hover:bg-[#ffd3e2]/50 text-[#4a3550] dark:text-[#fdeeff] font-black text-sm flex items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Responsive Content: Preview & Controls */}
        <div className="flex-1 min-h-0 flex flex-col sm:flex-row gap-2.5 sm:gap-4 overflow-hidden">
          {/* Character Preview Column */}
          <div className="flex flex-row sm:flex-col items-center justify-center gap-2 sm:gap-2.5 sm:w-52 shrink-0 storybook-well p-2 sm:p-2.5 rounded-2xl">
            <canvas
              ref={previewCanvasRef}
              width={400}
              height={320}
              className="w-24 h-20 xs:w-28 xs:h-22 sm:w-46 sm:h-36 rounded-xl sm:rounded-2xl border border-[#f0c7d8] dark:border-[#6b4a7a] shadow-inner bg-[#8ed0ff] shrink-0"
            />
            <div className="flex flex-col gap-2 flex-1 sm:w-full min-w-0">
              <div className="grid grid-cols-2 gap-1.5 w-full">
                <button
                  onClick={() => setIsWalking(!isWalking)}
                  className={`py-1.5 px-2 rounded-xl border text-[11px] font-black transition-colors cursor-pointer whitespace-nowrap ${
                    isWalking
                      ? 'bg-[#ff7aa8] border-[#ff7aa8] text-white shadow-xs'
                      : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff] hover:border-[#ff7aa8]'
                  }`}
                >
                  🚶 {isWalking ? 'Walk' : 'Idle'}
                </button>
                <button
                  onClick={handleRandomize}
                  className="py-1.5 px-2 rounded-xl border border-[#f0c7d8] dark:border-[#6b4a7a] bg-[#fffaf2] dark:bg-[#2b2137] hover:border-[#ff7aa8] text-[#4a3550] dark:text-[#fdeeff] text-[11px] font-black transition-colors cursor-pointer whitespace-nowrap"
                >
                  🎲 Random
                </button>
              </div>
              <input
                type="text"
                value={look.name}
                onChange={(e) => onUpdateLook({ name: e.target.value.slice(0, 12) })}
                placeholder="Mochi Name"
                maxLength={12}
                className="text-center w-full font-black text-xs bg-[#fffaf2] dark:bg-[#2b2137] border border-[#f0c7d8] dark:border-[#6b4a7a] focus:border-[#ff7aa8] rounded-xl px-2.5 py-1.5 text-[#4a3550] dark:text-[#fdeeff] outline-none"
              />
            </div>
          </div>

          {/* Right Column: Category Tabs & Scrollable Content */}
          <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden">
            {/* Segmented Navigation Tabs */}
            <div className="flex storybook-well p-1 rounded-xl sm:rounded-2xl gap-1 w-full overflow-x-auto select-none scrollbar-none shrink-0">
              {[
                ['body', '🐾 Body'],
                ['colors', '🎨 Colors'],
                ['face', '😊 Face'],
                ['style', '👒 Style'],
                ['music', '🎵 Music & Save'],
              ].map(([tabKey, label]) => {
                const isActive = activeTab === tabKey;
                return (
                  <button
                    key={tabKey}
                    onClick={() => {
                      audio.noteSpeech?.(80);
                      setActiveTab(tabKey as any);
                    }}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer whitespace-nowrap text-center shrink-0 ${
                      isActive
                        ? 'bg-[#ff7aa8] text-white shadow-xs'
                        : 'text-[#5a425f] dark:text-[#d4c3db] hover:text-[#ff7aa8] hover:bg-white/50 dark:hover:bg-black/25'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Scrollable Tab Panes Container */}
            <div className="flex-1 min-h-0 overflow-y-auto px-0.5 space-y-2.5 text-center overscroll-contain">
          {/* 1. Body Tab */}
          {activeTab === 'body' && (
            <div className="space-y-2.5">
              <div className="storybook-card rounded-2xl p-3">
                <div className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0] mb-2">Species</div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {SPECIES_LIST.map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => onUpdateLook({ sp: id })}
                      className={`px-3 py-1 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                        look.sp === id
                          ? 'bg-[#ff7aa8] text-white border-[#ff7aa8] shadow-xs'
                          : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff] hover:border-[#ff7aa8]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="storybook-card rounded-2xl p-3">
                <div className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0] mb-2">Pattern</div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {PATTERN_OPTIONS.map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => onUpdateLook({ pat: id })}
                      className={`px-3 py-1 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                        look.pat === id
                          ? 'bg-[#ff7aa8] text-white border-[#ff7aa8] shadow-xs'
                          : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff] hover:border-[#ff7aa8]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. Colors Tab */}
          {activeTab === 'colors' && (
            <div className="space-y-3">
              <div>
                <div className="text-[11px] font-black uppercase text-[#ff7aa8] mb-1">Body Color</div>
                <div className="flex flex-wrap gap-1.5 justify-center items-center">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => onUpdateLook({ col: c })}
                      className={`w-7 h-7 rounded-full border-3 transition-transform cursor-pointer ${
                        look.col === c ? 'scale-115 border-[#4a3550] dark:border-white shadow-sm' : 'border-[#ffd3e2]'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                  <input
                    type="color"
                    value={look.col}
                    onChange={(e) => onUpdateLook({ col: e.target.value })}
                    className="w-7 h-7 rounded-full border-2 border-[#ffd3e2] cursor-pointer bg-transparent"
                    title="Custom Color"
                  />
                </div>
              </div>

              <div>
                <div className="text-[11px] font-black uppercase text-[#ff7aa8] mb-1">Belly Color</div>
                <div className="flex flex-wrap gap-1.5 justify-center items-center">
                  <button
                    onClick={() => onUpdateLook({ c2: '' })}
                    className={`px-2 py-0.5 rounded-xl border-2 text-[11px] font-black cursor-pointer ${
                      look.c2 === ''
                        ? 'bg-[#ff7aa8] text-white border-[#ff7aa8]'
                        : 'bg-[#fffaf2] dark:bg-[#2b2137] text-[#4a3550] dark:text-[#fdeeff] border-[#ffd3e2] dark:border-[#6b4a7a]'
                    }`}
                  >
                    Auto
                  </button>
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => onUpdateLook({ c2: c })}
                      className={`w-7 h-7 rounded-full border-3 transition-transform cursor-pointer ${
                        look.c2 === c ? 'scale-115 border-[#4a3550] dark:border-white shadow-sm' : 'border-[#ffd3e2]'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-black uppercase text-[#ff7aa8] mb-1">Accent Color (Hat & Outfits)</div>
                <div className="flex flex-wrap gap-1.5 justify-center items-center">
                  {ACCENT_PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => onUpdateLook({ ac: c })}
                      className={`w-7 h-7 rounded-full border-3 transition-transform cursor-pointer ${
                        look.ac === c ? 'scale-115 border-[#4a3550] dark:border-white shadow-sm' : 'border-[#ffd3e2]'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. Face Tab */}
          {activeTab === 'face' && (
            <div className="space-y-2">
              <div>
                <div className="text-[11px] font-black uppercase text-[#ff7aa8] mb-1">Eye Style</div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {EYE_OPTIONS.map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => onUpdateLook({ eyes: id })}
                      className={`px-3 py-1 rounded-xl border-2 text-xs font-black transition-all cursor-pointer ${
                        look.eyes === id
                          ? 'bg-[#ff7aa8] text-white border-[#ff7aa8]'
                          : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#ffd3e2] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-black uppercase text-[#ff7aa8] mb-1">Smile Style</div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {MOUTH_OPTIONS.map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => onUpdateLook({ mouth: id })}
                      className={`px-3 py-1 rounded-xl border-2 text-xs font-black transition-all cursor-pointer ${
                        look.mouth === id
                          ? 'bg-[#ff7aa8] text-white border-[#ff7aa8]'
                          : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#ffd3e2] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-black uppercase text-[#ff7aa8] mb-1">Face Gear</div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {FACE_OPTIONS.map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => onUpdateLook({ face: id })}
                      className={`px-3 py-1 rounded-xl border-2 text-xs font-black transition-all cursor-pointer ${
                        look.face === id
                          ? 'bg-[#ff7aa8] text-white border-[#ff7aa8]'
                          : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#ffd3e2] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. Style Tab */}
          {activeTab === 'style' && (
            <div className="space-y-2">
              <div>
                <div className="text-[11px] font-black uppercase text-[#ff7aa8] mb-1">Hats & Headwear</div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {HAT_OPTIONS.map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => onUpdateLook({ hat: id })}
                      className={`px-3 py-1 rounded-xl border-2 text-xs font-black transition-all cursor-pointer ${
                        look.hat === id
                          ? 'bg-[#ff7aa8] text-white border-[#ff7aa8]'
                          : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#ffd3e2] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-black uppercase text-[#ff7aa8] mb-1">Outfits</div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {OUTFIT_OPTIONS.map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => onUpdateLook({ out: id })}
                      className={`px-3 py-1 rounded-xl border-2 text-xs font-black transition-all cursor-pointer ${
                        look.out === id
                          ? 'bg-[#ff7aa8] text-white border-[#ff7aa8]'
                          : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#ffd3e2] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-black uppercase text-[#ff7aa8] mb-1">Magic Trails</div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {AURA_OPTIONS.map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => onUpdateLook({ aura: id })}
                      className={`px-3 py-1 rounded-xl border-2 text-xs font-black transition-all cursor-pointer ${
                        look.aura === id
                          ? 'bg-[#ff7aa8] text-white border-[#ff7aa8]'
                          : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#ffd3e2] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-black uppercase text-[#ff7aa8] mb-1">Companion Buddy</div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {(
                    [
                      ['gloom', '☁️ Gloom'],
                      ['moth', '🦋 Glow-Moth'],
                      ['whale', '🐳 Cloud Whale'],
                      ['gloria', '✨ Gloria'],
                      ['gary', '🪨 Pet Rock'],
                      ['none', '🚫 None'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => onUpdateLook({ companion: id })}
                      className={`px-3 py-1 rounded-xl border-2 text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                        (look.companion ?? 'gloom') === id
                          ? 'bg-[#ff7aa8] text-white border-[#ff7aa8]'
                          : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#ffd3e2] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5. Music & Save Tab */}
          {activeTab === 'music' && (
            <div className="space-y-3">
              <div className="storybook-card rounded-2xl p-3">
                <div className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0] mb-2">Background Music</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-left">
                  {MUSIC_TRACKS.map(([icon, name], idx) => (
                    <button
                      key={name}
                      onClick={() => onSelectTrack(idx)}
                      className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-black transition-all cursor-pointer truncate ${
                        currentTrackIndex === idx
                          ? 'bg-[#ff7aa8] text-white border-[#ff7aa8] shadow-xs'
                          : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff] hover:border-[#ff7aa8]'
                      }`}
                      title={name}
                    >
                      {icon} {name.split('(')[0].trim()}
                    </button>
                  ))}
                </div>

                {/* Download Soundtrack to Device (.wav) */}
                <div className="mt-3 p-3 rounded-2xl storybook-well space-y-2 text-left">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[11px] font-black uppercase text-[#d85784] dark:text-[#ff9ec0]">
                        🎧 Download Official Soundtrack (.wav)
                      </div>
                      <div className="text-[10px] font-bold opacity-75">
                        Studio-mastered 44.1kHz stereo WAV renders saved straight to your device
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        handleDownloadTrack(currentTrackIndex >= 1 && currentTrackIndex <= 14 ? currentTrackIndex : 1)
                      }
                      disabled={downloadingIdx !== null}
                      className="px-3 py-1.5 rounded-xl bg-linear-to-r from-[#ff7aa8] to-[#b48cff] hover:brightness-105 text-white text-xs font-black shadow-sm transition-transform active:scale-95 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
                    >
                      {downloadingIdx !== null ? '⏳ Rendering...' : '⬇️ Download Current Track'}
                    </button>
                  </div>

                  {downloadMsg && (
                    <div className="px-2.5 py-1 rounded-lg bg-[#ffd23f]/25 border border-[#ffd23f] text-[11px] font-black text-center">
                      {downloadMsg}
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {MUSIC_TRACKS.slice(1, 15).map(([icon, name], i) => {
                      const trackNum = i + 1;
                      const shortName = name.split('(')[0].trim();
                      return (
                        <button
                          key={name}
                          onClick={() => handleDownloadTrack(trackNum)}
                          disabled={downloadingIdx !== null}
                          title={`Download ${name} (.wav)`}
                          className={`px-2 py-1.5 rounded-lg border text-[10px] font-black transition-all cursor-pointer truncate text-left disabled:opacity-50 ${
                            downloadingIdx === trackNum
                              ? 'bg-[#7bd88f] text-white border-[#5ec474]'
                              : 'bg-white/85 dark:bg-black/25 border-[#f0c7d8] dark:border-[#6b4a7a] hover:border-[#ff7aa8] text-[#4a3550] dark:text-[#fdeeff]'
                          }`}
                        >
                          ⬇️ {icon} {shortName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Upload Custom Music */}
                <div className="mt-2.5">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 bg-[#ffd3e2]/55 hover:bg-[#ff7aa8] hover:text-white rounded-xl border border-[#f0c7d8] dark:border-[#6b4a7a] text-xs font-black transition-colors cursor-pointer"
                  >
                    ➕ Upload Your Own Music (MP3, WAV, OGG)
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.mp3,.m4a,.wav,.ogg,.flac"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {audio.customTracks.length > 0 && (
                    <div className="text-[11px] font-bold text-[#4a3550]/80 dark:text-[#fdeeff]/80 mt-1 truncate">
                      🎧 Playlist: {audio.customTracks.length} tracks loaded
                    </div>
                  )}
                </div>
              </div>

              {/* Save & Data Tools */}
              <div className="storybook-card rounded-2xl p-3">
                <div className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0] mb-2">Game Save Data</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    onClick={onSave}
                    className="px-2.5 py-1.5 rounded-xl border border-[#f0c7d8] dark:border-[#6b4a7a] bg-[#fffaf2] dark:bg-[#2b2137] hover:bg-[#7bd88f] hover:text-white hover:border-[#7bd88f] text-xs font-black transition-colors whitespace-nowrap cursor-pointer"
                  >
                    💾 Save Now
                  </button>
                  <button
                    onClick={onCopySaveCode}
                    className="px-2.5 py-1.5 rounded-xl border border-[#f0c7d8] dark:border-[#6b4a7a] bg-[#fffaf2] dark:bg-[#2b2137] hover:bg-[#8ed0ff] hover:text-white hover:border-[#8ed0ff] text-xs font-black transition-colors whitespace-nowrap cursor-pointer"
                  >
                    📋 Copy Code
                  </button>
                  <button
                    onClick={onLoadSaveCode}
                    className="px-2.5 py-1.5 rounded-xl border border-[#f0c7d8] dark:border-[#6b4a7a] bg-[#fffaf2] dark:bg-[#2b2137] hover:bg-[#ffd23f] hover:text-[#4a3550] hover:border-[#ffd23f] text-xs font-black transition-colors whitespace-nowrap cursor-pointer"
                  >
                    📥 Load Code
                  </button>
                  <button
                    onClick={onNewGame}
                    className="px-2.5 py-1.5 rounded-xl border border-[#f0c7d8] dark:border-[#6b4a7a] bg-[#fffaf2] dark:bg-[#2b2137] hover:bg-[#ff6b6b] hover:text-white hover:border-[#ff6b6b] text-xs font-black transition-colors whitespace-nowrap cursor-pointer"
                  >
                    🗑 Reset Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
          </div>
        </div>

        {/* Sticky Done Footer */}
        <div className="pt-2 border-t border-[#f0c7d8]/80 dark:border-[#5b3b6b]/80 w-full flex justify-center shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-64 bg-linear-to-r from-[#ff7aa8] to-[#f46496] hover:brightness-105 text-white font-black text-sm sm:text-base py-2 rounded-xl sm:rounded-2xl shadow-md transition-transform active:scale-95 cursor-pointer"
          >
            Done Customizing ✨
          </button>
        </div>
      </div>
    </div>
  );
};
