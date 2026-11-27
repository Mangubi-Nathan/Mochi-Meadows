import React, { useState, useRef } from 'react';
import { CompanionId, PlayerLook } from '../game/engine';
import {
  SPECIES_LIST,
  COLOR_PALETTE,
  ACCENT_PALETTE,
  EYE_COLOR_PALETTE,
  PATTERN_COLOR_PALETTE,
  CHEEK_OPTIONS,
  COAT_FINISH_OPTIONS,
  SIZE_OPTIONS,
  HAT_OPTIONS,
  EYE_OPTIONS,
  MOUTH_OPTIONS,
  PATTERN_OPTIONS,
  OUTFIT_PRESETS,
  OUTFIT_TOP_OPTIONS,
  OUTFIT_BOTTOM_OPTIONS,
  OUTFIT_LAYER_OPTIONS,
  OUTFIT_SHOE_OPTIONS,
  OUTFIT_COLOR_PALETTE,
  resolveOutfitParts,
  HAIR_OPTIONS,
  HAIR_COLOR_PALETTE,
  resolveHairColor,
  FACE_OPTIONS,
  AURA_OPTIONS,
  COMPANIONS_LIST,
  MUSIC_TRACKS,
  OutfitCategory,
  PieceStyle,
} from '../game/constants';
import { audio } from '../game/audio';
import {
  MochiStudioPreview3D,
  StudioCameraPreset,
  StudioEmote,
  StudioLightingMood,
} from './MochiStudioPreview3D';

interface SavedLookSlot {
  id: string;
  label: string;
  look: PlayerLook;
}

const PRESET_STORAGE_KEY = 'mm2_wardrobe_presets_v1';

function loadSavedLookSlots(): SavedLookSlot[] {
  try {
    const raw = localStorage.getItem(PRESET_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
  } catch {
    return [];
  }
}

interface WardrobeModalProps {
  look: PlayerLook;
  onUpdateLook: (updated: Partial<PlayerLook>) => void;
  onClose: () => void;
  onSave: () => void;
  onCopySaveCode: () => void;
  onLoadSaveCode: (code?: string) => void;
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
  const [activeTab, setActiveTab] = useState<
    'body' | 'hair' | 'colors' | 'face' | 'outfits' | 'style' | 'companions' | 'music'
  >('body');
  const [hairFilter, setHairFilter] = useState<'all' | PieceStyle>('all');
  const [outfitFilter, setOutfitFilter] = useState<'all' | OutfitCategory>('all');
  const [studioEmote, setStudioEmote] = useState<StudioEmote>('idle');
  const [lightingMood, setLightingMood] = useState<StudioLightingMood>('day');
  const [cameraPreset, setCameraPreset] = useState<StudioCameraPreset>('three_quarter');
  const [presetTrigger, setPresetTrigger] = useState(0);
  const [undoDepth, setUndoDepth] = useState(0);
  const [savedSlots, setSavedSlots] = useState<SavedLookSlot[]>(loadSavedLookSlots);
  const [downloadingIdx, setDownloadingIdx] = useState<number | null>(null);
  const [downloadMsg, setDownloadMsg] = useState<string>('');
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [loadCodeOpen, setLoadCodeOpen] = useState(false);
  const [loadCodeText, setLoadCodeText] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const historyRef = useRef<PlayerLook[]>([]);

  const applyLook = (patch: Partial<PlayerLook>, pushHistory = true) => {
    if (pushHistory) {
      historyRef.current = [...historyRef.current.slice(-29), { ...look }];
      setUndoDepth(historyRef.current.length);
    }
    onUpdateLook(patch);
  };

  const handleUndo = () => {
    const prev = historyRef.current[historyRef.current.length - 1];
    if (!prev) return;
    historyRef.current = historyRef.current.slice(0, -1);
    setUndoDepth(historyRef.current.length);
    audio.noteSpeech?.(66);
    onUpdateLook(prev);
  };

  const handleResetLook = () => {
    applyLook({
      sp: 'cat',
      col: '#ffb3c7',
      c2: '',
      ac: '#ff7aa8',
      eyeCol: '',
      noseCol: '',
      patCol: '',
      hatCol: '',
      cheeks: 0,
      coatFinish: 'plush',
      earScale: 1,
      tailScale: 1,
      chonk: 1,
      size: 'normal',
      hat: 'none',
      eyes: 0,
      mouth: 0,
      pat: 0,
      out: 0,
      outTop: 'none',
      outBottom: 'none',
      outLayer: 'none',
      outShoes: 'none',
      outCol1: '',
      outCol2: '',
      outCol3: '',
      hair: 'none',
      hairCol: '',
      face: 0,
      aura: 0,
    });
  };

  const handleSaveSlot = () => {
    const spLabel = SPECIES_LIST.find(([id]) => id === look.sp)?.[1] || 'Mochi';
    const nextSlot: SavedLookSlot = {
      id: `${Date.now()}`,
      label: `${look.name || 'Mochi'} (${spLabel.replace(/ \(New\)$/, '')})`,
      look: { ...look },
    };
    const next = [nextSlot, ...savedSlots].slice(0, 6);
    setSavedSlots(next);
    try {
      localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore quota errors
    }
    audio.chime?.();
  };

  const handleDeleteSlot = (id: string) => {
    const next = savedSlots.filter((s) => s.id !== id);
    setSavedSlots(next);
    try {
      localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const selectCamera = (preset: StudioCameraPreset) => {
    setCameraPreset(preset);
    setPresetTrigger((n) => n + 1);
  };

  const resolvedOutfit = resolveOutfitParts(look);

  const updateMixPiece = (patch: Partial<Pick<PlayerLook, 'outTop' | 'outBottom' | 'outLayer' | 'outShoes'>>) => {
    applyLook({
      outTop: patch.outTop !== undefined ? patch.outTop : resolvedOutfit.top,
      outBottom: patch.outBottom !== undefined ? patch.outBottom : resolvedOutfit.bottom,
      outLayer: patch.outLayer !== undefined ? patch.outLayer : resolvedOutfit.layer,
      outShoes: patch.outShoes !== undefined ? patch.outShoes : resolvedOutfit.shoes,
      outCol1: look.outCol1 !== undefined ? look.outCol1 : resolvedOutfit.col1,
      outCol2: look.outCol2 !== undefined ? look.outCol2 : resolvedOutfit.col2,
      outCol3: look.outCol3 !== undefined ? look.outCol3 : resolvedOutfit.col3,
    });
  };

  const handleRandomMixOutfit = () => {
    const randomItem = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const pool =
      outfitFilter === 'male'
        ? {
            tops: OUTFIT_TOP_OPTIONS.filter((o) => o.style !== 'female' && o.id !== 'none'),
            bottoms: OUTFIT_BOTTOM_OPTIONS.filter((o) => o.style !== 'female'),
            layers: OUTFIT_LAYER_OPTIONS.filter((o) => o.style !== 'female'),
            shoes: OUTFIT_SHOE_OPTIONS.filter((o) => o.style !== 'female'),
          }
        : outfitFilter === 'female'
        ? {
            tops: OUTFIT_TOP_OPTIONS.filter((o) => o.style !== 'male' && o.id !== 'none'),
            bottoms: OUTFIT_BOTTOM_OPTIONS.filter((o) => o.style !== 'male'),
            layers: OUTFIT_LAYER_OPTIONS.filter((o) => o.style !== 'male'),
            shoes: OUTFIT_SHOE_OPTIONS.filter((o) => o.style !== 'male'),
          }
        : {
            tops: OUTFIT_TOP_OPTIONS.filter((o) => o.id !== 'none'),
            bottoms: OUTFIT_BOTTOM_OPTIONS,
            layers: OUTFIT_LAYER_OPTIONS,
            shoes: OUTFIT_SHOE_OPTIONS,
          };

    applyLook({
      out: 0,
      outTop: randomItem(pool.tops).id,
      outBottom: randomItem(pool.bottoms).id,
      outLayer: Math.random() < 0.72 ? randomItem(pool.layers).id : 'none',
      outShoes: randomItem(pool.shoes).id,
      outCol1: randomItem(OUTFIT_COLOR_PALETTE),
      outCol2: randomItem(OUTFIT_COLOR_PALETTE),
      outCol3: randomItem(OUTFIT_COLOR_PALETTE),
    });
  };

  const handleRandomize = () => {
    const randomItem = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const preset = randomItem(OUTFIT_PRESETS);
    const styledHairs = HAIR_OPTIONS.filter((h) => h.id !== 'none');
    const chosenHair = Math.random() < 0.1 ? HAIR_OPTIONS[0] : randomItem(styledHairs);
    const finishes = COAT_FINISH_OPTIONS.map((f) => f[0]);
    applyLook({
      sp: randomItem(SPECIES_LIST)[0],
      col: randomItem(COLOR_PALETTE),
      c2: Math.random() < 0.5 ? '' : randomItem(COLOR_PALETTE),
      ac: randomItem(ACCENT_PALETTE),
      eyeCol: Math.random() < 0.4 ? '' : randomItem(EYE_COLOR_PALETTE),
      noseCol: Math.random() < 0.6 ? '' : randomItem(ACCENT_PALETTE),
      patCol: Math.random() < 0.45 ? '' : randomItem(PATTERN_COLOR_PALETTE),
      hatCol: Math.random() < 0.5 ? '' : randomItem(ACCENT_PALETTE),
      cheeks: randomItem(CHEEK_OPTIONS)[0],
      coatFinish: randomItem(finishes),
      earScale: Number((0.9 + Math.random() * 0.32).toFixed(2)),
      tailScale: Number((0.9 + Math.random() * 0.35).toFixed(2)),
      chonk: Number((0.92 + Math.random() * 0.18).toFixed(2)),
      size: randomItem(SIZE_OPTIONS)[0],
      hair: chosenHair.id,
      hairCol: Math.random() < 0.2 ? '' : randomItem(HAIR_COLOR_PALETTE),
      eyes: randomItem(EYE_OPTIONS)[0],
      mouth: randomItem(MOUTH_OPTIONS)[0],
      pat: randomItem(PATTERN_OPTIONS)[0],
      hat: randomItem(HAT_OPTIONS)[0],
      out: preset.id,
      outTop: preset.top,
      outBottom: preset.bottom,
      outLayer: preset.layer,
      outShoes: preset.shoes,
      outCol1: preset.defaultCol1,
      outCol2: preset.defaultCol2,
      outCol3: '',
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

  const activeCompanionId = (look.companion ?? 'gloom') as CompanionId;
  const activeCompanionDef = COMPANIONS_LIST.find((c) => c.id === activeCompanionId) ?? null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-modal-safe bg-[#160f24]/92 pointer-events-auto">
      <div className="relative w-full max-w-5xl storybook-modal rounded-2xl sm:rounded-3xl p-3 sm:p-5 max-h-[95dvh] flex flex-col gap-2.5 sm:gap-3 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-[#f0c7d8]/80 dark:border-[#5b3b6b]/80 pb-2 shrink-0 gap-2">
          <div className="min-w-0">
            <h2 className="text-base sm:text-xl font-black text-[#4a3550] dark:text-[#fdeeff] leading-none truncate">
              ✨ Mochi Character Studio
            </h2>
            <p className="text-[11px] sm:text-xs font-bold text-[#d85784] dark:text-[#ff9ec0] mt-1 truncate">
              360° 3D turntable · Fur finishes · Custom dyes · Proportions · Outfits · Soundtrack
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleUndo}
              disabled={undoDepth === 0}
              title="Undo last change"
              className="px-2.5 py-1.5 rounded-xl storybook-card hover:border-[#ff7aa8] text-[#4a3550] dark:text-[#fdeeff] font-black text-xs transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap"
            >
              ↩ Undo{undoDepth > 0 ? ` (${undoDepth})` : ''}
            </button>
            <button
              onClick={onClose}
              title="Close Studio"
              className="w-8 h-8 rounded-full storybook-card hover:bg-[#ffd3e2]/50 text-[#4a3550] dark:text-[#fdeeff] font-black text-sm flex items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Responsive Content: 3D Turntable Studio & Customization Tabs */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3 overflow-hidden">
          {/* Left Column: Interactive 3D Character Studio */}
          <div className="flex flex-col gap-2 md:w-72 shrink-0 storybook-well p-2.5 rounded-2xl overflow-y-auto md:overflow-visible">
            <div className="flex flex-row md:flex-col gap-2.5 items-stretch">
              <MochiStudioPreview3D
                look={look}
                emote={studioEmote}
                lightingMood={lightingMood}
                cameraPreset={cameraPreset}
                presetTrigger={presetTrigger}
                className="w-36 h-36 sm:w-44 sm:h-44 md:w-full md:h-56 rounded-xl sm:rounded-2xl border border-[#f0c7d8] dark:border-[#6b4a7a] shadow-inner shrink-0"
              />

              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                {/* Camera Presets */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                  {(
                    [
                      ['front', 'Front'],
                      ['three_quarter', '3/4'],
                      ['side', 'Side'],
                      ['back', 'Back'],
                      ['face', 'Face'],
                      ['companion', 'Buddy'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => selectCamera(key)}
                      className={`py-1 rounded-lg border text-[10px] font-black transition-colors cursor-pointer whitespace-nowrap ${
                        cameraPreset === key
                          ? 'bg-[#ff7aa8] border-[#ff7aa8] text-white'
                          : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff] hover:border-[#ff7aa8]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Emote & Pose Switcher */}
                <div className="grid grid-cols-5 gap-1">
                  {(
                    [
                      ['idle', '✨ Idle'],
                      ['walk', '🚶 Walk'],
                      ['wave', '👋 Wave'],
                      ['twirl', '🩰 Spin'],
                      ['dance', '💃 Dance'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setStudioEmote(key)}
                      title={`Preview ${key}`}
                      className={`py-1 px-0.5 rounded-lg border text-[10px] font-black transition-colors cursor-pointer whitespace-nowrap truncate ${
                        studioEmote === key
                          ? 'bg-[#b48cff] border-[#b48cff] text-white'
                          : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff] hover:border-[#b48cff]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Lighting Mood + Randomize + Reset */}
                <div className="flex gap-1">
                  {(
                    [
                      ['day', '☀️'],
                      ['dawn', '🌅'],
                      ['starlight', '🌙'],
                    ] as const
                  ).map(([mood, icon]) => (
                    <button
                      key={mood}
                      onClick={() => setLightingMood(mood)}
                      title={`${mood} studio lighting`}
                      className={`px-2 py-1 rounded-lg border text-xs font-black transition-colors cursor-pointer ${
                        lightingMood === mood
                          ? 'bg-[#ffd23f] border-[#e6b800] text-[#3b2a45]'
                          : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a]'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                  <button
                    onClick={handleRandomize}
                    className="flex-1 py-1 px-2 rounded-lg border border-[#f0c7d8] dark:border-[#6b4a7a] bg-[#fffaf2] dark:bg-[#2b2137] hover:border-[#ff7aa8] text-[#4a3550] dark:text-[#fdeeff] text-[11px] font-black transition-colors cursor-pointer whitespace-nowrap"
                  >
                    🎲 Random
                  </button>
                  <button
                    onClick={handleResetLook}
                    title="Reset character look to default"
                    className="py-1 px-2 rounded-lg border border-[#f0c7d8] dark:border-[#6b4a7a] bg-[#fffaf2] dark:bg-[#2b2137] hover:border-[#ff7aa8] text-[#4a3550] dark:text-[#fdeeff] text-[11px] font-black transition-colors cursor-pointer whitespace-nowrap"
                  >
                    ↺
                  </button>
                </div>

                {/* Name Input */}
                <input
                  type="text"
                  value={look.name}
                  onChange={(e) => applyLook({ name: e.target.value.slice(0, 12) }, false)}
                  placeholder="Mochi Name"
                  maxLength={12}
                  className="text-center w-full font-black text-xs bg-[#fffaf2] dark:bg-[#2b2137] border border-[#f0c7d8] dark:border-[#6b4a7a] focus:border-[#ff7aa8] rounded-xl px-2.5 py-1.5 text-[#4a3550] dark:text-[#fdeeff] outline-none"
                />

                {/* Active Outfit Readout */}
                <div className="w-full rounded-xl bg-white/70 dark:bg-black/25 border border-[#f0c7d8]/80 dark:border-[#6b4a7a]/70 px-2 py-1 text-[10px] font-bold text-[#5a425f] dark:text-[#e6d6ed] truncate text-center">
                  {(() => {
                    const activePreset = OUTFIT_PRESETS.find(
                      (p) =>
                        p.top === resolvedOutfit.top &&
                        p.bottom === resolvedOutfit.bottom &&
                        p.layer === resolvedOutfit.layer &&
                        p.shoes === resolvedOutfit.shoes
                    );
                    if (activePreset) return activePreset.label;
                    const topLabel = OUTFIT_TOP_OPTIONS.find((o) => o.id === resolvedOutfit.top)?.label.replace(/^[^a-zA-Z]+ /, '');
                    const botLabel = OUTFIT_BOTTOM_OPTIONS.find((o) => o.id === resolvedOutfit.bottom)?.label.replace(/^[^a-zA-Z]+ /, '');
                    const parts = [resolvedOutfit.top !== 'none' ? topLabel : null, resolvedOutfit.bottom !== 'none' ? botLabel : null].filter(Boolean);
                    return parts.length > 0 ? parts.join(' + ') : 'Custom Mix Outfit';
                  })()}
                </div>
              </div>
            </div>

            {/* Saved Preset Looks Bar */}
            <div className="storybook-card rounded-xl p-2 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0]">
                  Saved Looks ({savedSlots.length}/6)
                </span>
                <button
                  onClick={handleSaveSlot}
                  className="px-2 py-0.5 rounded-lg bg-[#ff7aa8] text-white text-[10px] font-black cursor-pointer hover:brightness-105 whitespace-nowrap"
                >
                  💾 Save Look
                </button>
              </div>
              {savedSlots.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {savedSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="inline-flex items-center rounded-lg border border-[#f0c7d8] dark:border-[#6b4a7a] bg-[#fffaf2] dark:bg-[#2b2137] overflow-hidden max-w-full"
                    >
                      <button
                        onClick={() => applyLook(slot.look)}
                        className="px-2 py-0.5 text-[10px] font-black text-[#4a3550] dark:text-[#fdeeff] hover:text-[#ff7aa8] truncate max-w-28 cursor-pointer"
                        title={`Load ${slot.label}`}
                      >
                        {slot.label}
                      </button>
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="px-1.5 py-0.5 text-[10px] font-black text-[#d85784] hover:bg-[#ffd3e2]/40 cursor-pointer"
                        title="Delete saved look"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] font-bold text-[#7c6184] dark:text-[#b8a5c4]">
                  Drag 3D preview to inspect every angle &amp; save favorite outfits here.
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Category Tabs & Scrollable Content */}
          <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden">
            {/* Segmented Navigation Tabs */}
            <div className="flex storybook-well p-1 rounded-xl sm:rounded-2xl gap-1 w-full overflow-x-auto select-none scrollbar-none shrink-0">
              {[
                ['body', '🐾 Body'],
                ['hair', '💇 Hair'],
                ['colors', '🎨 Colors'],
                ['face', '😊 Face'],
                ['outfits', '👔 Outfits'],
                ['style', '👒 Hats & Magic'],
                ['companions', '🧸 Buddies'],
                ['music', '🎵 Music'],
              ].map(([tabKey, label]) => {
                const isActive = activeTab === tabKey;
                return (
                  <button
                    key={tabKey}
                    onClick={() => {
                      audio.noteSpeech?.(80);
                      const nextTab = tabKey as typeof activeTab;
                      setActiveTab(nextTab);
                      if (nextTab === 'companions') {
                        selectCamera('companion');
                      } else if (cameraPreset === 'companion') {
                        selectCamera('three_quarter');
                      }
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
            <div className="flex-1 min-h-0 overflow-y-auto px-0.5 space-y-2.5 text-left overscroll-contain">
              {/* 1. Body Tab */}
              {activeTab === 'body' && (
                <div className="space-y-2.5">
                  <div className="storybook-card rounded-2xl p-3">
                    <div className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0] mb-2">
                      Animal Species (12)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {SPECIES_LIST.map(([id, label]) => (
                        <button
                          key={id}
                          onClick={() => applyLook({ sp: id })}
                          className={`px-3 py-1 rounded-xl border text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
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

                  {/* Size & Fur Material Finish */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="storybook-card rounded-2xl p-3">
                      <div className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0] mb-2">
                        Body Size
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {SIZE_OPTIONS.map(([id, label]) => (
                          <button
                            key={id}
                            onClick={() => applyLook({ size: id })}
                            className={`px-2.5 py-1 rounded-xl border text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                              (look.size || 'normal') === id
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
                      <div className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0] mb-2">
                        Coat Material Finish
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {COAT_FINISH_OPTIONS.map(([id, label]) => (
                          <button
                            key={id}
                            onClick={() => applyLook({ coatFinish: id })}
                            className={`px-2.5 py-1 rounded-xl border text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                              (look.coatFinish || 'plush') === id
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

                  {/* Proportion Sliders */}
                  <div className="storybook-card rounded-2xl p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0]">
                        3D Silhouette Proportions
                      </span>
                      <button
                        onClick={() => applyLook({ chonk: 1, earScale: 1, tailScale: 1 })}
                        className="text-[10px] font-black text-[#d85784] hover:underline cursor-pointer"
                      >
                        Reset Sliders
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="block space-y-1">
                        <div className="flex justify-between text-[11px] font-black text-[#4a3550] dark:text-[#fdeeff]">
                          <span>Mochi Chonk</span>
                          <span>{Math.round((look.chonk ?? 1) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min={0.85}
                          max={1.18}
                          step={0.01}
                          value={look.chonk ?? 1}
                          onChange={(e) => applyLook({ chonk: parseFloat(e.target.value) }, false)}
                          className="w-full accent-[#ff7aa8] cursor-pointer"
                        />
                      </label>
                      <label className="block space-y-1">
                        <div className="flex justify-between text-[11px] font-black text-[#4a3550] dark:text-[#fdeeff]">
                          <span>Ears / Horns</span>
                          <span>{Math.round((look.earScale ?? 1) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min={0.8}
                          max={1.35}
                          step={0.01}
                          value={look.earScale ?? 1}
                          onChange={(e) => applyLook({ earScale: parseFloat(e.target.value) }, false)}
                          className="w-full accent-[#ff7aa8] cursor-pointer"
                        />
                      </label>
                      <label className="block space-y-1">
                        <div className="flex justify-between text-[11px] font-black text-[#4a3550] dark:text-[#fdeeff]">
                          <span>Tail Fluff</span>
                          <span>{Math.round((look.tailScale ?? 1) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min={0.7}
                          max={1.45}
                          step={0.01}
                          value={look.tailScale ?? 1}
                          onChange={(e) => applyLook({ tailScale: parseFloat(e.target.value) }, false)}
                          className="w-full accent-[#ff7aa8] cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Coat Patterns + Marking Dye */}
                  <div className="storybook-card rounded-2xl p-3 space-y-2.5">
                    <div className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0]">
                      Coat Pattern &amp; Markings (10)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {PATTERN_OPTIONS.map(([id, label]) => (
                        <button
                          key={id}
                          onClick={() => applyLook({ pat: id })}
                          className={`px-3 py-1 rounded-xl border text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                            look.pat === id
                              ? 'bg-[#ff7aa8] text-white border-[#ff7aa8] shadow-xs'
                              : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff] hover:border-[#ff7aa8]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-[#f0c7d8]/50 dark:border-[#5b3b6b]/50 flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] font-black uppercase text-[#7c6184] dark:text-[#c7b4d3] mr-1">
                        Marking Dye:
                      </span>
                      <button
                        onClick={() => applyLook({ patCol: '' })}
                        className={`px-2 py-0.5 rounded-lg border text-[10px] font-black cursor-pointer ${
                          !look.patCol
                            ? 'bg-[#ff7aa8] text-white border-[#ff7aa8]'
                            : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff]'
                        }`}
                      >
                        Auto
                      </button>
                      {PATTERN_COLOR_PALETTE.map((c) => (
                        <button
                          key={c}
                          onClick={() => applyLook({ patCol: c })}
                          className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                            look.patCol === c ? 'scale-115 border-[#4a3550] dark:border-white shadow-sm' : 'border-[#ffd3e2]'
                          }`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                      <input
                        type="color"
                        value={look.patCol || '#ffffff'}
                        onChange={(e) => applyLook({ patCol: e.target.value }, false)}
                        className="w-5 h-5 rounded-full border border-[#ffd3e2] cursor-pointer bg-transparent"
                        title="Custom Marking Color"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Hair Styling Studio Tab */}
              {activeTab === 'hair' && (
                <div className="space-y-2.5">
                  <div className="storybook-card rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1 storybook-well p-1 rounded-xl">
                      {(
                        [
                          ['all', 'All Cuts'],
                          ['male', '👔 Male'],
                          ['female', '👗 Female'],
                          ['unisex', '✨ Classic'],
                        ] as const
                      ).map(([filterKey, label]) => (
                        <button
                          key={filterKey}
                          onClick={() => setHairFilter(filterKey)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                            hairFilter === filterKey
                              ? 'bg-[#ff7aa8] text-white shadow-xs'
                              : 'text-[#5a425f] dark:text-[#d4c3db] hover:text-[#ff7aa8]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          const pool = HAIR_OPTIONS.filter(
                            (h) => h.id !== 'none' && (hairFilter === 'all' || h.style === hairFilter)
                          );
                          const pick = pool[Math.floor(Math.random() * pool.length)] || HAIR_OPTIONS[1];
                          const dye = HAIR_COLOR_PALETTE[Math.floor(Math.random() * HAIR_COLOR_PALETTE.length)];
                          applyLook({ hair: pick.id, hairCol: dye });
                        }}
                        className="px-2.5 py-1 rounded-xl border border-[#f0c7d8] dark:border-[#6b4a7a] bg-[#fffaf2] dark:bg-[#2b2137] hover:border-[#ff7aa8] text-[#4a3550] dark:text-[#fdeeff] text-[11px] font-black transition-colors cursor-pointer whitespace-nowrap"
                      >
                        🎲 Random Cut
                      </button>
                      <button
                        onClick={() => applyLook({ hair: 'none', hairCol: '' })}
                        className="px-2.5 py-1 rounded-xl border border-[#f0c7d8] dark:border-[#6b4a7a] bg-[#fffaf2] dark:bg-[#2b2137] hover:border-[#ff7aa8] text-[#4a3550] dark:text-[#fdeeff] text-[11px] font-black transition-colors cursor-pointer whitespace-nowrap"
                      >
                        ↺ Clear
                      </button>
                    </div>
                  </div>

                  <div className="storybook-card rounded-2xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0]">
                        Hairstyles ({HAIR_OPTIONS.length})
                      </span>
                      <span className="text-[10px] font-bold text-[#7c6184] dark:text-[#b8a5c4]">
                        Spring physics &amp; automatic hat clearance
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {HAIR_OPTIONS.filter(
                        (h) => hairFilter === 'all' || h.id === 'none' || h.style === hairFilter
                      ).map((h) => {
                        const isSelected = (look.hair || 'none') === h.id;
                        return (
                          <button
                            key={h.id}
                            onClick={() => applyLook({ hair: h.id })}
                            className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-black transition-all cursor-pointer truncate text-left ${
                              isSelected
                                ? 'bg-[#ff7aa8] text-white border-[#ff7aa8] shadow-xs'
                                : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff] hover:border-[#ff7aa8]'
                            }`}
                            title={h.label}
                          >
                            {h.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="storybook-card rounded-2xl p-3">
                    <div className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0] mb-2">
                      Hair Color Dye
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <button
                        onClick={() => applyLook({ hairCol: '' })}
                        className={`px-2.5 py-1 rounded-xl border text-[11px] font-black cursor-pointer ${
                          !look.hairCol
                            ? 'bg-[#ff7aa8] text-white border-[#ff7aa8]'
                            : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff]'
                        }`}
                      >
                        Auto Match
                      </button>
                      {HAIR_COLOR_PALETTE.map((c) => (
                        <button
                          key={c}
                          onClick={() => applyLook({ hairCol: c })}
                          className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                            look.hairCol === c ? 'scale-115 border-[#4a3550] dark:border-white shadow-sm' : 'border-[#ffd3e2]'
                          }`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                      <input
                        type="color"
                        value={resolveHairColor(look.hairCol, look.col)}
                        onChange={(e) => applyLook({ hairCol: e.target.value }, false)}
                        className="w-6 h-6 rounded-full border border-[#ffd3e2] cursor-pointer bg-transparent"
                        title="Custom Hair Dye"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Full Colors Studio Tab */}
              {activeTab === 'colors' && (
                <div className="space-y-2.5">
                  <div className="storybook-card rounded-2xl p-3">
                    <div className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0] mb-2">
                      Primary Fur / Coat Color
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {COLOR_PALETTE.map((c) => (
                        <button
                          key={c}
                          onClick={() => applyLook({ col: c })}
                          className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                            look.col === c ? 'scale-115 border-[#4a3550] dark:border-white shadow-sm' : 'border-[#ffd3e2]'
                          }`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                      <input
                        type="color"
                        value={look.col}
                        onChange={(e) => applyLook({ col: e.target.value }, false)}
                        className="w-6 h-6 rounded-full border border-[#ffd3e2] cursor-pointer bg-transparent"
                        title="Custom Body Color"
                      />
                    </div>
                  </div>

                  <div className="storybook-card rounded-2xl p-3">
                    <div className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0] mb-2">
                      Belly &amp; Muzzle Color
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <button
                        onClick={() => applyLook({ c2: '' })}
                        className={`px-2 py-0.5 rounded-lg border text-[11px] font-black cursor-pointer ${
                          look.c2 === ''
                            ? 'bg-[#ff7aa8] text-white border-[#ff7aa8]'
                            : 'bg-[#fffaf2] dark:bg-[#2b2137] text-[#4a3550] dark:text-[#fdeeff] border-[#f0c7d8] dark:border-[#6b4a7a]'
                        }`}
                      >
                        Auto
                      </button>
                      {COLOR_PALETTE.map((c) => (
                        <button
                          key={c}
                          onClick={() => applyLook({ c2: c })}
                          className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                            look.c2 === c ? 'scale-115 border-[#4a3550] dark:border-white shadow-sm' : 'border-[#ffd3e2]'
                          }`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                      <input
                        type="color"
                        value={look.c2 || '#ffeef4'}
                        onChange={(e) => applyLook({ c2: e.target.value }, false)}
                        className="w-6 h-6 rounded-full border border-[#ffd3e2] cursor-pointer bg-transparent"
                        title="Custom Belly Color"
                      />
                    </div>
                  </div>

                  <div className="storybook-card rounded-2xl p-3">
                    <div className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0] mb-2">
                      Pattern Marking Color
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <button
                        onClick={() => applyLook({ patCol: '' })}
                        className={`px-2 py-0.5 rounded-lg border text-[11px] font-black cursor-pointer ${
                          !look.patCol
                            ? 'bg-[#ff7aa8] text-white border-[#ff7aa8]'
                            : 'bg-[#fffaf2] dark:bg-[#2b2137] text-[#4a3550] dark:text-[#fdeeff] border-[#f0c7d8] dark:border-[#6b4a7a]'
                        }`}
                      >
                        Auto
                      </button>
                      {PATTERN_COLOR_PALETTE.map((c) => (
                        <button
                          key={c}
                          onClick={() => applyLook({ patCol: c })}
                          className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                            look.patCol === c ? 'scale-115 border-[#4a3550] dark:border-white shadow-sm' : 'border-[#ffd3e2]'
                          }`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                      <input
                        type="color"
                        value={look.patCol || '#ffffff'}
                        onChange={(e) => applyLook({ patCol: e.target.value }, false)}
                        className="w-6 h-6 rounded-full border border-[#ffd3e2] cursor-pointer bg-transparent"
                        title="Custom Pattern Dye"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="storybook-card rounded-2xl p-3">
                      <div className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0] mb-2">
                        Eye Iris Color
                      </div>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <button
                          onClick={() => applyLook({ eyeCol: '' })}
                          className={`px-2 py-0.5 rounded-lg border text-[10px] font-black cursor-pointer ${
                            !look.eyeCol
                              ? 'bg-[#ff7aa8] text-white border-[#ff7aa8]'
                              : 'bg-[#fffaf2] dark:bg-[#2b2137] text-[#4a3550] dark:text-[#fdeeff] border-[#f0c7d8] dark:border-[#6b4a7a]'
                          }`}
                        >
                          Classic
                        </button>
                        {EYE_COLOR_PALETTE.map((c) => (
                          <button
                            key={c}
                            onClick={() => applyLook({ eyeCol: c })}
                            className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                              look.eyeCol === c ? 'scale-115 border-[#4a3550] dark:border-white shadow-sm' : 'border-[#ffd3e2]'
                            }`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                        <input
                          type="color"
                          value={look.eyeCol || '#3b2a45'}
                          onChange={(e) => applyLook({ eyeCol: e.target.value }, false)}
                          className="w-5 h-5 rounded-full border border-[#ffd3e2] cursor-pointer bg-transparent"
                          title="Custom Eye Color"
                        />
                      </div>
                    </div>

                    <div className="storybook-card rounded-2xl p-3">
                      <div className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0] mb-2">
                        Nose / Boop Color
                      </div>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <button
                          onClick={() => applyLook({ noseCol: '' })}
                          className={`px-2 py-0.5 rounded-lg border text-[10px] font-black cursor-pointer ${
                            !look.noseCol
                              ? 'bg-[#ff7aa8] text-white border-[#ff7aa8]'
                              : 'bg-[#fffaf2] dark:bg-[#2b2137] text-[#4a3550] dark:text-[#fdeeff] border-[#f0c7d8] dark:border-[#6b4a7a]'
                          }`}
                        >
                          Auto
                        </button>
                        {['#ff7aa8', '#ff9ebb', '#d94862', '#2a1d32', '#6e473b', '#ff9f29', '#ffd23f', '#7bd8ff'].map((c) => (
                          <button
                            key={c}
                            onClick={() => applyLook({ noseCol: c })}
                            className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                              look.noseCol === c ? 'scale-115 border-[#4a3550] dark:border-white shadow-sm' : 'border-[#ffd3e2]'
                            }`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                        <input
                          type="color"
                          value={look.noseCol || '#ff7aa8'}
                          onChange={(e) => applyLook({ noseCol: e.target.value }, false)}
                          className="w-5 h-5 rounded-full border border-[#ffd3e2] cursor-pointer bg-transparent"
                          title="Custom Nose Color"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="storybook-card rounded-2xl p-3">
                      <div className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0] mb-2">
                        Global Accent Color
                      </div>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {ACCENT_PALETTE.map((c) => (
                          <button
                            key={c}
                            onClick={() => applyLook({ ac: c })}
                            className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                              look.ac === c ? 'scale-115 border-[#4a3550] dark:border-white shadow-sm' : 'border-[#ffd3e2]'
                            }`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                        <input
                          type="color"
                          value={look.ac}
                          onChange={(e) => applyLook({ ac: e.target.value }, false)}
                          className="w-5 h-5 rounded-full border border-[#ffd3e2] cursor-pointer bg-transparent"
                          title="Custom Accent Color"
                        />
                      </div>
                    </div>

                    <div className="storybook-card rounded-2xl p-3">
                      <div className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0] mb-2">
                        Independent Hat Dye
                      </div>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <button
                          onClick={() => applyLook({ hatCol: '' })}
                          className={`px-2 py-0.5 rounded-lg border text-[10px] font-black cursor-pointer ${
                            !look.hatCol
                              ? 'bg-[#ff7aa8] text-white border-[#ff7aa8]'
                              : 'bg-[#fffaf2] dark:bg-[#2b2137] text-[#4a3550] dark:text-[#fdeeff] border-[#f0c7d8] dark:border-[#6b4a7a]'
                          }`}
                        >
                          Match Accent
                        </button>
                        {ACCENT_PALETTE.slice(0, 10).map((c) => (
                          <button
                            key={c}
                            onClick={() => applyLook({ hatCol: c })}
                            className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                              look.hatCol === c ? 'scale-115 border-[#4a3550] dark:border-white shadow-sm' : 'border-[#ffd3e2]'
                            }`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                        <input
                          type="color"
                          value={look.hatCol || look.ac}
                          onChange={(e) => applyLook({ hatCol: e.target.value }, false)}
                          className="w-5 h-5 rounded-full border border-[#ffd3e2] cursor-pointer bg-transparent"
                          title="Custom Hat Color"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Face Studio Tab */}
              {activeTab === 'face' && (
                <div className="space-y-2.5">
                  <div className="storybook-card rounded-2xl p-3 space-y-2">
                    <div className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0]">
                      Eye Expression ({EYE_OPTIONS.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {EYE_OPTIONS.map(([id, label]) => (
                        <button
                          key={id}
                          onClick={() => applyLook({ eyes: id })}
                          className={`px-3 py-1 rounded-xl border text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                            look.eyes === id
                              ? 'bg-[#ff7aa8] text-white border-[#ff7aa8]'
                              : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-[#f0c7d8]/50 dark:border-[#5b3b6b]/50 flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] font-black uppercase text-[#7c6184] dark:text-[#c7b4d3] mr-1">
                        Eye Color:
                      </span>
                      <button
                        onClick={() => applyLook({ eyeCol: '' })}
                        className={`px-2 py-0.5 rounded-lg border text-[10px] font-black cursor-pointer ${
                          !look.eyeCol
                            ? 'bg-[#ff7aa8] text-white border-[#ff7aa8]'
                            : 'bg-[#fffaf2] dark:bg-[#2b2137] text-[#4a3550] dark:text-[#fdeeff] border-[#f0c7d8] dark:border-[#6b4a7a]'
                        }`}
                      >
                        Auto
                      </button>
                      {EYE_COLOR_PALETTE.map((c) => (
                        <button
                          key={c}
                          onClick={() => applyLook({ eyeCol: c })}
                          className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                            look.eyeCol === c ? 'scale-115 border-[#4a3550] dark:border-white' : 'border-[#ffd3e2]'
                          }`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="storybook-card rounded-2xl p-3">
                    <div className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0] mb-2">
                      Smile Style ({MOUTH_OPTIONS.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {MOUTH_OPTIONS.map(([id, label]) => (
                        <button
                          key={id}
                          onClick={() => applyLook({ mouth: id })}
                          className={`px-3 py-1 rounded-xl border text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                            look.mouth === id
                              ? 'bg-[#ff7aa8] text-white border-[#ff7aa8]'
                              : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="storybook-card rounded-2xl p-3">
                      <div className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0] mb-2">
                        Cheek Blush Style
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {CHEEK_OPTIONS.map(([id, label]) => (
                          <button
                            key={id}
                            onClick={() => applyLook({ cheeks: id })}
                            className={`px-2.5 py-1 rounded-xl border text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                              (look.cheeks ?? 0) === id
                                ? 'bg-[#ff7aa8] text-white border-[#ff7aa8]'
                                : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff]'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="storybook-card rounded-2xl p-3">
                      <div className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0] mb-2">
                        Glasses &amp; Face Gear
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {FACE_OPTIONS.map(([id, label]) => (
                          <button
                            key={id}
                            onClick={() => applyLook({ face: id })}
                            className={`px-2.5 py-1 rounded-xl border text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                              look.face === id
                                ? 'bg-[#ff7aa8] text-white border-[#ff7aa8]'
                                : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff]'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Outfits & Mix-and-Match Studio Tab */}
              {activeTab === 'outfits' && (
                <div className="space-y-3">
                  <div className="storybook-card rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1 storybook-well p-1 rounded-xl">
                      {(
                        [
                          ['all', 'All Outfits'],
                          ['male', '👔 Male'],
                          ['female', '👗 Female'],
                          ['classic', '✨ Classic'],
                        ] as const
                      ).map(([filterKey, label]) => (
                        <button
                          key={filterKey}
                          onClick={() => setOutfitFilter(filterKey)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                            outfitFilter === filterKey
                              ? 'bg-[#ff7aa8] text-white shadow-xs'
                              : 'text-[#5a425f] dark:text-[#d4c3db] hover:text-[#ff7aa8]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleRandomMixOutfit}
                        className="px-2.5 py-1 rounded-xl border border-[#f0c7d8] dark:border-[#6b4a7a] bg-[#fffaf2] dark:bg-[#2b2137] hover:border-[#ff7aa8] text-[#4a3550] dark:text-[#fdeeff] text-[11px] font-black transition-colors cursor-pointer whitespace-nowrap"
                      >
                        🎲 Mix &amp; Match
                      </button>
                      <button
                        onClick={() =>
                          applyLook({
                            out: 0,
                            outTop: 'none',
                            outBottom: 'none',
                            outLayer: 'none',
                            outShoes: 'none',
                            outCol1: '',
                            outCol2: '',
                            outCol3: '',
                          })
                        }
                        className="px-2.5 py-1 rounded-xl border border-[#f0c7d8] dark:border-[#6b4a7a] bg-[#fffaf2] dark:bg-[#2b2137] hover:border-[#ff7aa8] text-[#4a3550] dark:text-[#fdeeff] text-[11px] font-black transition-colors cursor-pointer whitespace-nowrap"
                      >
                        ↺ Clear
                      </button>
                    </div>
                  </div>

                  {/* Full Outfit Sets */}
                  <div className="storybook-card rounded-2xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0]">
                        Full Outfit Sets ({OUTFIT_PRESETS.length})
                      </span>
                      <span className="text-[10px] font-bold text-[#7c6184] dark:text-[#b8a5c4]">
                        Pick any look, then mix &amp; match layers below
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {OUTFIT_PRESETS.filter(
                        (p) => outfitFilter === 'all' || p.category === outfitFilter
                      ).map((preset) => {
                        const isSelected =
                          resolvedOutfit.top === preset.top &&
                          resolvedOutfit.bottom === preset.bottom &&
                          resolvedOutfit.layer === preset.layer &&
                          resolvedOutfit.shoes === preset.shoes &&
                          (preset.id !== 0 || (look.out ?? 0) === 0);
                        return (
                          <button
                            key={preset.id}
                            onClick={() =>
                              applyLook({
                                out: preset.id,
                                outTop: preset.top,
                                outBottom: preset.bottom,
                                outLayer: preset.layer,
                                outShoes: preset.shoes,
                                outCol1: preset.defaultCol1,
                                outCol2: preset.defaultCol2,
                                outCol3: '',
                              })
                            }
                            className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-black transition-all cursor-pointer truncate text-left ${
                              isSelected
                                ? 'bg-[#ff7aa8] text-white border-[#ff7aa8] shadow-xs'
                                : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff] hover:border-[#ff7aa8]'
                            }`}
                            title={preset.label}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mix & Match Layers */}
                  <div className="storybook-card rounded-2xl p-3 space-y-3">
                    <div className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0]">
                      Mix &amp; Match Studio
                    </div>

                    <div>
                      <div className="text-[10px] font-black uppercase text-[#7c6184] dark:text-[#c7b4d3] mb-1">
                        Tops &amp; Jackets
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {OUTFIT_TOP_OPTIONS.filter(
                          (item) =>
                            outfitFilter === 'all' ||
                            outfitFilter === 'classic' ||
                            item.style === 'unisex' ||
                            item.style === outfitFilter
                        ).map((item) => (
                          <button
                            key={item.id}
                            onClick={() => updateMixPiece({ outTop: item.id })}
                            className={`px-2.5 py-1 rounded-xl border text-[11px] font-black transition-all cursor-pointer whitespace-nowrap ${
                              resolvedOutfit.top === item.id
                                ? 'bg-[#ff7aa8] text-white border-[#ff7aa8] shadow-xs'
                                : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff] hover:border-[#ff7aa8]'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-black uppercase text-[#7c6184] dark:text-[#c7b4d3] mb-1">
                        Pants, Shorts &amp; Skirts
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {OUTFIT_BOTTOM_OPTIONS.filter(
                          (item) =>
                            outfitFilter === 'all' ||
                            outfitFilter === 'classic' ||
                            item.style === 'unisex' ||
                            item.style === outfitFilter
                        ).map((item) => (
                          <button
                            key={item.id}
                            onClick={() => updateMixPiece({ outBottom: item.id })}
                            className={`px-2.5 py-1 rounded-xl border text-[11px] font-black transition-all cursor-pointer whitespace-nowrap ${
                              resolvedOutfit.bottom === item.id
                                ? 'bg-[#ff7aa8] text-white border-[#ff7aa8] shadow-xs'
                                : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff] hover:border-[#ff7aa8]'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-black uppercase text-[#7c6184] dark:text-[#c7b4d3] mb-1">
                        Capes, Collars, Wings &amp; Packs
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {OUTFIT_LAYER_OPTIONS.filter(
                          (item) =>
                            outfitFilter === 'all' ||
                            outfitFilter === 'classic' ||
                            item.style === 'unisex' ||
                            item.style === outfitFilter
                        ).map((item) => (
                          <button
                            key={item.id}
                            onClick={() => updateMixPiece({ outLayer: item.id })}
                            className={`px-2.5 py-1 rounded-xl border text-[11px] font-black transition-all cursor-pointer whitespace-nowrap ${
                              resolvedOutfit.layer === item.id
                                ? 'bg-[#ff7aa8] text-white border-[#ff7aa8] shadow-xs'
                                : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff] hover:border-[#ff7aa8]'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-black uppercase text-[#7c6184] dark:text-[#c7b4d3] mb-1">
                        Footwear
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {OUTFIT_SHOE_OPTIONS.filter(
                          (item) =>
                            outfitFilter === 'all' ||
                            outfitFilter === 'classic' ||
                            item.style === 'unisex' ||
                            item.style === outfitFilter
                        ).map((item) => (
                          <button
                            key={item.id}
                            onClick={() => updateMixPiece({ outShoes: item.id })}
                            className={`px-2.5 py-1 rounded-xl border text-[11px] font-black transition-all cursor-pointer whitespace-nowrap ${
                              resolvedOutfit.shoes === item.id
                                ? 'bg-[#ff7aa8] text-white border-[#ff7aa8] shadow-xs'
                                : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff] hover:border-[#ff7aa8]'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 3-Channel Outfit Fabric Dye Swatches */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#f0c7d8]/60 dark:border-[#5b3b6b]/60">
                      <div>
                        <div className="text-[10px] font-black uppercase text-[#7c6184] dark:text-[#c7b4d3] mb-1">
                          Top &amp; Primary Fabric
                        </div>
                        <div className="flex flex-wrap gap-1 items-center">
                          <button
                            onClick={() => applyLook({ outCol1: '' })}
                            className={`px-2 py-0.5 rounded-lg border text-[10px] font-black cursor-pointer ${
                              !look.outCol1
                                ? 'bg-[#ff7aa8] text-white border-[#ff7aa8]'
                                : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff]'
                            }`}
                          >
                            Auto
                          </button>
                          {OUTFIT_COLOR_PALETTE.map((c) => (
                            <button
                              key={c}
                              onClick={() => applyLook({ outCol1: c })}
                              className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                                look.outCol1 === c ? 'scale-115 border-[#4a3550] dark:border-white' : 'border-[#ffd3e2]'
                              }`}
                              style={{ backgroundColor: c }}
                              title={c}
                            />
                          ))}
                          <input
                            type="color"
                            value={resolvedOutfit.col1 || '#ff7aa8'}
                            onChange={(e) => applyLook({ outCol1: e.target.value }, false)}
                            className="w-5 h-5 rounded-full border border-[#ffd3e2] cursor-pointer bg-transparent"
                            title="Custom Primary Fabric"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-black uppercase text-[#7c6184] dark:text-[#c7b4d3] mb-1">
                          Bottoms &amp; Trim
                        </div>
                        <div className="flex flex-wrap gap-1 items-center">
                          <button
                            onClick={() => applyLook({ outCol2: '' })}
                            className={`px-2 py-0.5 rounded-lg border text-[10px] font-black cursor-pointer ${
                              !look.outCol2
                                ? 'bg-[#ff7aa8] text-white border-[#ff7aa8]'
                                : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff]'
                            }`}
                          >
                            Auto
                          </button>
                          {OUTFIT_COLOR_PALETTE.map((c) => (
                            <button
                              key={c}
                              onClick={() => applyLook({ outCol2: c })}
                              className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                                look.outCol2 === c ? 'scale-115 border-[#4a3550] dark:border-white' : 'border-[#ffd3e2]'
                              }`}
                              style={{ backgroundColor: c }}
                              title={c}
                            />
                          ))}
                          <input
                            type="color"
                            value={resolvedOutfit.col2 || '#ffffff'}
                            onChange={(e) => applyLook({ outCol2: e.target.value }, false)}
                            className="w-5 h-5 rounded-full border border-[#ffd3e2] cursor-pointer bg-transparent"
                            title="Custom Trim Color"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-black uppercase text-[#7c6184] dark:text-[#c7b4d3] mb-1">
                          Belts, Packs &amp; Boots
                        </div>
                        <div className="flex flex-wrap gap-1 items-center">
                          <button
                            onClick={() => applyLook({ outCol3: '' })}
                            className={`px-2 py-0.5 rounded-lg border text-[10px] font-black cursor-pointer ${
                              !look.outCol3
                                ? 'bg-[#ff7aa8] text-white border-[#ff7aa8]'
                                : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff]'
                            }`}
                          >
                            Auto
                          </button>
                          {OUTFIT_COLOR_PALETTE.map((c) => (
                            <button
                              key={c}
                              onClick={() => applyLook({ outCol3: c })}
                              className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                                look.outCol3 === c ? 'scale-115 border-[#4a3550] dark:border-white' : 'border-[#ffd3e2]'
                              }`}
                              style={{ backgroundColor: c }}
                              title={c}
                            />
                          ))}
                          <input
                            type="color"
                            value={resolvedOutfit.col3 || '#5c4338'}
                            onChange={(e) => applyLook({ outCol3: e.target.value }, false)}
                            className="w-5 h-5 rounded-full border border-[#ffd3e2] cursor-pointer bg-transparent"
                            title="Custom Boots & Belt Color"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. Hats, Magic Trails & Companions Tab */}
              {activeTab === 'style' && (
                <div className="space-y-2.5">
                  <div className="storybook-card rounded-2xl p-3 space-y-2">
                    <div className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0]">
                      Hats &amp; Headwear ({HAT_OPTIONS.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {HAT_OPTIONS.map(([id, label]) => (
                        <button
                          key={id}
                          onClick={() => applyLook({ hat: id })}
                          className={`px-2.5 py-1 rounded-xl border text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                            look.hat === id
                              ? 'bg-[#ff7aa8] text-white border-[#ff7aa8]'
                              : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-[#f0c7d8]/50 dark:border-[#5b3b6b]/50 flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] font-black uppercase text-[#7c6184] dark:text-[#c7b4d3] mr-1">
                        Hat Dye:
                      </span>
                      <button
                        onClick={() => applyLook({ hatCol: '' })}
                        className={`px-2 py-0.5 rounded-lg border text-[10px] font-black cursor-pointer ${
                          !look.hatCol
                            ? 'bg-[#ff7aa8] text-white border-[#ff7aa8]'
                            : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff]'
                        }`}
                      >
                        Match Accent
                      </button>
                      {ACCENT_PALETTE.slice(0, 12).map((c) => (
                        <button
                          key={c}
                          onClick={() => applyLook({ hatCol: c })}
                          className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                            look.hatCol === c ? 'scale-115 border-[#4a3550] dark:border-white' : 'border-[#ffd3e2]'
                          }`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                      <input
                        type="color"
                        value={look.hatCol || look.ac}
                        onChange={(e) => applyLook({ hatCol: e.target.value }, false)}
                        className="w-5 h-5 rounded-full border border-[#ffd3e2] cursor-pointer bg-transparent"
                        title="Custom Hat Dye"
                      />
                    </div>
                  </div>

                  <div className="storybook-card rounded-2xl p-3">
                    <div className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0] mb-2">
                      Magic Orbit Trails ({AURA_OPTIONS.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {AURA_OPTIONS.map(([id, label]) => (
                        <button
                          key={id}
                          onClick={() => applyLook({ aura: id })}
                          className={`px-2.5 py-1 rounded-xl border text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                            look.aura === id
                              ? 'bg-[#ff7aa8] text-white border-[#ff7aa8]'
                              : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* 7. Adopted Companion Dossier & Selection Tab */}
              {activeTab === 'companions' && (
                <div className="space-y-3">
                  {/* Featured Selected Companion Field Guide */}
                  {activeCompanionDef ? (
                    <div className="storybook-card rounded-2xl p-3.5 space-y-2.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0]">
                            Companion Field Guide · {activeCompanionDef.origin}
                          </div>
                          <h3 className="text-base sm:text-lg font-black text-[#4a3550] dark:text-[#fdeeff] leading-tight mt-0.5">
                            {activeCompanionDef.icon} {activeCompanionDef.name}
                          </h3>
                          <div className="text-xs font-bold text-[#7c6184] dark:text-[#cbb7d9]">
                            Species: {activeCompanionDef.species}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex items-center gap-1 pr-1" title="Signature color palette">
                            {activeCompanionDef.palette.map((hex) => (
                              <span
                                key={hex}
                                className="w-3.5 h-3.5 rounded-full border border-[#3b2a45]/35"
                                style={{ backgroundColor: hex }}
                              />
                            ))}
                          </div>
                          <button
                            onClick={() => selectCamera('companion')}
                            className="px-2.5 py-1 rounded-xl border border-[#f0c7d8] dark:border-[#6b4a7a] bg-[#fffaf2] dark:bg-[#2b2137] hover:border-[#ff7aa8] text-[10px] font-black text-[#4a3550] dark:text-[#fdeeff] cursor-pointer whitespace-nowrap"
                          >
                            🔍 Focus 3D
                          </button>
                          <button
                            onClick={() => setLightingMood(lightingMood === 'starlight' ? 'day' : 'starlight')}
                            className="px-2.5 py-1 rounded-xl border border-[#f0c7d8] dark:border-[#6b4a7a] bg-[#fffaf2] dark:bg-[#2b2137] hover:border-[#b48cff] text-[10px] font-black text-[#4a3550] dark:text-[#fdeeff] cursor-pointer whitespace-nowrap"
                          >
                            {lightingMood === 'starlight' ? '☀️ Daylight' : '🌙 Starlight'}
                          </button>
                        </div>
                      </div>

                      <p className="text-xs font-semibold leading-relaxed text-[#4a3550] dark:text-[#efe2f7]">
                        {activeCompanionDef.desc}
                      </p>

                      <div className="pt-2 border-t border-[#f0c7d8]/60 dark:border-[#5b3b6b]/60 space-y-1 text-[11px]">
                        <div className="text-[#5a425f] dark:text-[#decde8]">
                          <span className="font-black text-[#d85784] dark:text-[#ff9ec0]">Visual Details: </span>
                          <span className="font-semibold">{activeCompanionDef.anatomy}</span>
                        </div>
                        <div className="text-[#5a425f] dark:text-[#decde8]">
                          <span className="font-black text-[#4aa866] dark:text-[#8de4a5]">Meadow Perk: </span>
                          <span className="font-bold">{activeCompanionDef.perk}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="storybook-card rounded-2xl p-3.5 space-y-1">
                      <div className="text-sm font-black text-[#4a3550] dark:text-[#fdeeff]">
                        🚫 Exploring Solo
                      </div>
                      <p className="text-xs font-semibold text-[#7c6184] dark:text-[#cbb7d9]">
                        No companion is currently following you. Choose any buddy below to inspect their 3D model, species lore, and meadow perks.
                      </p>
                    </div>
                  )}

                  {/* Companion Roster */}
                  <div className="storybook-card rounded-2xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0]">
                        Adoptable Companions ({COMPANIONS_LIST.length})
                      </span>
                      <span className="text-[10px] font-bold text-[#7c6184] dark:text-[#b8a5c4]">
                        Drag 3D preview to spin your buddy 360°
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {COMPANIONS_LIST.map((comp) => {
                        const isSelected = activeCompanionId === comp.id;
                        return (
                          <button
                            key={comp.id}
                            onClick={() => {
                              applyLook({ companion: comp.id });
                              selectCamera('companion');
                            }}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer space-y-1 ${
                              isSelected
                                ? 'bg-[#ff7aa8] text-white border-[#ff7aa8] shadow-xs'
                                : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff] hover:border-[#ff7aa8]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-black truncate">
                                {comp.icon} {comp.name}
                              </span>
                              <span className="flex items-center gap-0.5 shrink-0">
                                {comp.palette.map((hex) => (
                                  <span
                                    key={hex}
                                    className="w-2.5 h-2.5 rounded-full border border-black/20"
                                    style={{ backgroundColor: hex }}
                                  />
                                ))}
                              </span>
                            </div>
                            <div className={`text-[10px] font-extrabold truncate ${isSelected ? 'text-white/90' : 'text-[#d85784] dark:text-[#ff9ec0]'}`}>
                              {comp.species} · {comp.origin.split('·')[0].trim()}
                            </div>
                            <div className={`text-[10px] font-semibold line-clamp-2 ${isSelected ? 'text-white/90' : 'text-[#6e5478] dark:text-[#ccb9d8]'}`}>
                              {comp.perk}
                            </div>
                          </button>
                        );
                      })}

                      <button
                        onClick={() => applyLook({ companion: 'none' })}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer space-y-1 ${
                          activeCompanionId === 'none'
                            ? 'bg-[#ff7aa8] text-white border-[#ff7aa8] shadow-xs'
                            : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff] hover:border-[#ff7aa8]'
                        }`}
                      >
                        <div className="text-xs font-black">🚫 No Companion</div>
                        <div className={`text-[10px] font-extrabold ${activeCompanionId === 'none' ? 'text-white/90' : 'text-[#7c6184] dark:text-[#b8a5c4]'}`}>
                          Solo Wanderer
                        </div>
                        <div className={`text-[10px] font-semibold ${activeCompanionId === 'none' ? 'text-white/90' : 'text-[#6e5478] dark:text-[#ccb9d8]'}`}>
                          Explore the meadows quietly on your own
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 7. Music & Save Tab */}
              {activeTab === 'music' && (
                <div className="space-y-3">
                  <div className="storybook-card rounded-2xl p-3">
                    <div className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0] mb-2">
                      Background Music
                    </div>
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
                  <div className="storybook-card rounded-2xl p-3 space-y-2">
                    <div className="text-[11px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0]">
                      Game Save Data
                    </div>
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
                        onClick={() => {
                          setConfirmResetOpen(false);
                          setLoadCodeOpen((v) => !v);
                        }}
                        className="px-2.5 py-1.5 rounded-xl border border-[#f0c7d8] dark:border-[#6b4a7a] bg-[#fffaf2] dark:bg-[#2b2137] hover:bg-[#ffd23f] hover:text-[#4a3550] hover:border-[#ffd23f] text-xs font-black transition-colors whitespace-nowrap cursor-pointer"
                      >
                        📥 Load Code
                      </button>
                      <button
                        onClick={() => {
                          setLoadCodeOpen(false);
                          setConfirmResetOpen((v) => !v);
                        }}
                        className="px-2.5 py-1.5 rounded-xl border border-[#f0c7d8] dark:border-[#6b4a7a] bg-[#fffaf2] dark:bg-[#2b2137] hover:bg-[#ff6b6b] hover:text-white hover:border-[#ff6b6b] text-xs font-black transition-colors whitespace-nowrap cursor-pointer"
                      >
                        🗑 Reset Save
                      </button>
                    </div>
                    {loadCodeOpen && (
                      <div className="flex gap-1.5 pt-1">
                        <input
                          type="text"
                          value={loadCodeText}
                          onChange={(e) => setLoadCodeText(e.target.value)}
                          placeholder="Paste your save code here..."
                          className="flex-1 px-2.5 py-1.5 text-xs font-bold rounded-xl border border-[#f0c7d8] dark:border-[#6b4a7a] bg-white dark:bg-[#1f1629] outline-none focus:border-[#ff7aa8]"
                        />
                        <button
                          onClick={() => {
                            if (loadCodeText.trim()) {
                              onLoadSaveCode(loadCodeText.trim());
                              setLoadCodeText('');
                              setLoadCodeOpen(false);
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#7bd88f] text-white text-xs font-black cursor-pointer hover:brightness-105"
                        >
                          Apply
                        </button>
                      </div>
                    )}
                    {confirmResetOpen && (
                      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-[#ff6b6b]/15 border border-[#ff6b6b] text-xs font-bold">
                        <span>Erase current slot and start a brand-new journey?</span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => {
                              setConfirmResetOpen(false);
                              onNewGame();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#ff5c7c] text-white text-xs font-black cursor-pointer hover:brightness-105"
                          >
                            Yes, Start Fresh
                          </button>
                          <button
                            onClick={() => setConfirmResetOpen(false)}
                            className="px-2.5 py-1 rounded-lg storybook-well text-xs font-black cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
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
