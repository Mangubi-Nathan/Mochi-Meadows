import React, { useState, useEffect, useRef } from 'react';
import { audio } from '../game/audio';

interface SongWeaverModalProps {
  onClose: () => void;
  onSaveToMusicBox?: (notes: number[]) => void;
  initialNotes?: number[];
}

// Pentatonic scale pitches (MIDI numbers): C4, D4, E4, G4, A4, C5, D5, E5
const PENTATONIC_SCALE = [
  { midi: 76, note: 'E5', label: 'E5 ✨' },
  { midi: 74, note: 'D5', label: 'D5 🌸' },
  { midi: 72, note: 'C5', label: 'C5 🌙' },
  { midi: 69, note: 'A4', label: 'A4 🔔' },
  { midi: 67, note: 'G4', label: 'G4 🍯' },
  { midi: 64, note: 'E4', label: 'E4 🍃' },
  { midi: 62, note: 'D4', label: 'D4 🌊' },
  { midi: 60, note: 'C4', label: 'C4 ☀️' },
];

const INSTRUMENTS = [
  { id: 'celesta', name: '✨ Star Celesta', icon: '✨' },
  { id: 'harp', name: '🪕 Moon Harp', icon: '🪕' },
  { id: 'flute', name: '🪈 Dawn Flute', icon: '🪈' },
  { id: 'bell', name: '🔔 Chime Bell', icon: '🔔' },
  { id: 'marimba', name: '🪵 Wood Marimba', icon: '🪵' },
] as const;

export const SongWeaverModal: React.FC<SongWeaverModalProps> = ({
  onClose,
  onSaveToMusicBox,
  initialNotes = [],
}) => {
  const TOTAL_STEPS = 16; // 8 bars (2 beats per bar or 16 steps)
  // Grid state: stepIndex -> midi note or null
  const [grid, setGrid] = useState<(number | null)[]>(() => {
    if (initialNotes.length >= TOTAL_STEPS) return initialNotes.slice(0, TOTAL_STEPS);
    // Pleasant default melody: C4, E4, G4, A4, C5, G4, E4, D4...
    const def = [60, null, 64, null, 67, null, 69, null, 72, null, 67, null, 64, null, 62, null];
    return def;
  });

  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [bpm, setBpm] = useState<number>(100);
  const [instrument, setInstrument] = useState<'celesta' | 'harp' | 'flute' | 'bell' | 'marimba'>('celesta');
  const [shareCode, setShareCode] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [isExportingWav, setIsExportingWav] = useState<boolean>(false);

  const playbackTimerRef = useRef<number | null>(null);

  // Playback engine
  useEffect(() => {
    if (!isPlaying) {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      setCurrentStep(-1);
      return;
    }

    const intervalMs = (60 / bpm / 2) * 1000;
    let step = 0;

    playbackTimerRef.current = window.setInterval(() => {
      const note = grid[step];
      if (note !== null) {
        audio.playSongWeaverNote(note, instrument);
      }
      setCurrentStep(step);
      step = (step + 1) % TOTAL_STEPS;
    }, intervalMs);

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, bpm, instrument, grid]);

  const toggleNote = (stepIdx: number, midi: number) => {
    audio.playSongWeaverNote(midi, instrument);
    setGrid((prev) => {
      const next = [...prev];
      next[stepIdx] = next[stepIdx] === midi ? null : midi;
      return next;
    });
  };

  const handleClear = () => {
    setGrid(new Array(TOTAL_STEPS).fill(null));
  };

  const handleExport = () => {
    const encoded = grid.map((n) => (n === null ? '_' : n.toString())).join('-');
    setShareCode(encoded);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(encoded);
      setFeedback('Melody code copied to clipboard! 📋');
      setTimeout(() => setFeedback(''), 2500);
    }
  };

  const handleImport = (code: string) => {
    try {
      const parts = code.trim().split('-');
      if (parts.length >= 8) {
        const imported = parts.slice(0, TOTAL_STEPS).map((p) => (p === '_' ? null : Number(p)));
        setGrid(imported);
        setFeedback('Song loaded successfully! 🎵');
        setTimeout(() => setFeedback(''), 2500);
      }
    } catch {
      setFeedback('Invalid melody code format');
    }
  };

  const handleSaveMusicBox = () => {
    const numericArray = grid.map((n) => (n === null ? 0 : n));
    onSaveToMusicBox?.(numericArray);
    audio.chime();
    setFeedback('Saved to Moonlit Cottage Music Box! 🎠');
    setTimeout(() => setFeedback(''), 2500);
  };

  const handleDownloadWav = async () => {
    if (isExportingWav) return;
    setIsExportingWav(true);
    setFeedback('Rendering your lullaby to stereo WAV... 🎧');
    try {
      const notes = grid.map((n) => (n === null ? 0 : n));
      const filename = await audio.downloadSongWeaverAsWav(notes, {
        title: `Song_Weaver_${instrument}`,
        instrument,
        bpm,
      });
      audio.chime();
      setFeedback(`Downloaded ${filename} to your device! ✨`);
    } catch {
      setFeedback('Could not export WAV on this browser.');
    } finally {
      setIsExportingWav(false);
      setTimeout(() => setFeedback(''), 3200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-modal-safe bg-[#160f24]/92 pointer-events-auto select-none animate-in fade-in duration-200">
      <div className="w-full max-w-3xl storybook-modal rounded-2xl sm:rounded-3xl p-3 sm:p-5 flex flex-col gap-2 sm:gap-3 max-h-[94dvh] overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-[#f0c7d8]/80 dark:border-[#5b3b6b]/80 pb-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl shrink-0">🎼</span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-black text-[#4a3550] dark:text-[#fdeeff] leading-tight truncate">
                The Song Weaver
              </h2>
              <p className="text-[10px] sm:text-xs font-bold text-[#d85784] dark:text-[#ff9ec0]">
                Pentatonic Lullaby Composer · Every note is in harmony
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full storybook-card hover:bg-[#ff7aa8] hover:text-white text-[#4a3550] dark:text-[#fdeeff] font-black text-sm flex items-center justify-center transition-all cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Balanced Toolbar Controls */}
        <div className="flex flex-col gap-2 storybook-well p-2.5 rounded-2xl shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Play / Pause / Clear */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer whitespace-nowrap ${
                  isPlaying
                    ? 'bg-[#ff6b6b] text-white'
                    : 'bg-linear-to-r from-[#7bd88f] to-[#5ec474] text-white hover:brightness-105'
                }`}
              >
                <span>{isPlaying ? '⏸' : '▶'}</span>
                <span>{isPlaying ? 'Pause' : 'Play Song'}</span>
              </button>
              <button
                onClick={handleClear}
                className="px-2.5 py-1.5 rounded-xl bg-white/80 dark:bg-black/25 hover:bg-[#ffd3e2] text-xs font-bold border border-[#f0c7d8]/60 dark:border-[#6b4a7a]/60 transition-colors cursor-pointer whitespace-nowrap"
              >
                🗑 Clear
              </button>
            </div>

            {/* Tempo BPM */}
            <div className="flex items-center gap-2 text-xs font-black bg-white/60 dark:bg-black/20 px-2.5 py-1 rounded-xl border border-[#f0c7d8]/50 dark:border-[#6b4a7a]/50">
              <span className="opacity-75 text-[11px]">Tempo</span>
              <input
                type="range"
                min={60}
                max={150}
                step={5}
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="w-20 accent-[#ff7aa8] cursor-pointer"
              />
              <span className="font-mono text-[11px] w-11 text-right">{bpm} BPM</span>
            </div>
          </div>

          {/* Instrument Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold scrollbar-none">
            {INSTRUMENTS.map((ins) => (
              <button
                key={ins.id}
                onClick={() => setInstrument(ins.id)}
                className={`flex-1 min-w-[96px] px-2.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap text-[11px] text-center shrink-0 ${
                  instrument === ins.id
                    ? 'bg-[#ff7aa8] text-white shadow-xs font-black'
                    : 'bg-white/70 dark:bg-white/5 text-[#5a425f] dark:text-[#d4c3db] hover:bg-white dark:hover:bg-white/10'
                }`}
              >
                {ins.name}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Swipe Hint */}
        <div className="sm:hidden text-[10px] font-bold text-[#7c5c75] dark:text-[#d4c3db] text-center -mb-1 shrink-0">
          ← Swipe staff sideways to reach all 16 beats →
        </div>

        {/* Musical Staff Grid (8 pitches x 16 steps) */}
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto overscroll-contain bg-white/85 dark:bg-[#1a1224] border border-[#f0c7d8] dark:border-[#5b3b6b] rounded-2xl p-2 sm:p-3 flex flex-col justify-start sm:justify-center gap-1 shadow-inner">
          {PENTATONIC_SCALE.map(({ midi, label }) => (
            <div key={midi} className="flex items-center gap-1 min-w-[540px]">
              {/* Pitch Label */}
              <div className="w-12 sm:w-14 text-[11px] font-black text-[#5a425f] dark:text-[#d4c3db] shrink-0 text-right pr-1.5">
                {label}
              </div>

              {/* Step Slots */}
              <div className="flex-1 flex gap-1">
                {Array.from({ length: TOTAL_STEPS }).map((_, stepIdx) => {
                  const isNoteActive = grid[stepIdx] === midi;
                  const isCurrent = currentStep === stepIdx;
                  const isBarStart = stepIdx % 4 === 0;

                  return (
                    <button
                      key={stepIdx}
                      onClick={() => toggleNote(stepIdx, midi)}
                      className={`flex-1 min-w-[26px] h-7 sm:h-7 rounded-lg border transition-all cursor-pointer flex items-center justify-center text-xs font-black relative ${
                        isNoteActive
                          ? 'bg-linear-to-r from-[#ff7aa8] to-[#ff9ebb] border-[#ff6b8b] text-white shadow-xs'
                          : isCurrent
                          ? 'bg-[#ffd23f]/30 border-[#ffd23f]'
                          : isBarStart
                          ? 'bg-[#f7edf5] dark:bg-[#251a30] border-[#f0c7d8]/80 dark:border-[#5b3b6b]/80 hover:bg-[#ffd3e2]/40'
                          : 'bg-[#fffaf2] dark:bg-[#1f1529] border-[#f0c7d8]/40 dark:border-[#5b3b6b]/40 hover:bg-[#ffd3e2]/30'
                      }`}
                    >
                      {isNoteActive ? '♪' : ''}
                      {isCurrent && !isNoteActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ff7aa8]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Beat Markers along the bottom */}
          <div className="flex items-center gap-1 min-w-[540px] pt-1">
            <div className="w-12 sm:w-14 text-[10px] font-black opacity-50 text-right pr-1.5">Beat</div>
            <div className="flex-1 flex gap-1">
              {Array.from({ length: TOTAL_STEPS }).map((_, stepIdx) => (
                <div
                  key={stepIdx}
                  className={`flex-1 text-center text-[10px] font-bold ${
                    currentStep === stepIdx ? 'text-[#ff7aa8] font-black scale-110' : 'opacity-40'
                  }`}
                >
                  {stepIdx + 1}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div className="px-3 py-1.5 bg-[#ffd23f]/25 border border-[#ffd23f] rounded-xl text-center text-xs font-black text-[#4a3550] dark:text-[#fdeeff] animate-in fade-in shrink-0">
            {feedback}
          </div>
        )}

        {/* Bottom Actions: Share & Save to Music Box */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#f0c7d8]/80 dark:border-[#5b3b6b]/80 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleExport}
              className="min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/80 dark:bg-black/25 hover:bg-[#ffd3e2] text-xs font-black border border-[#f0c7d8] dark:border-[#5b3b6b] transition-transform active:scale-95 cursor-pointer flex items-center gap-1 whitespace-nowrap"
            >
              <span>📋</span>
              <span>Copy Code</span>
            </button>
            <button
              onClick={() => {
                const code = prompt('Paste your Song Weaver melody code:');
                if (code) handleImport(code);
              }}
              className="min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/80 dark:bg-black/25 hover:bg-[#ffd3e2] text-xs font-black border border-[#f0c7d8] dark:border-[#5b3b6b] transition-transform active:scale-95 cursor-pointer flex items-center gap-1 whitespace-nowrap"
            >
              <span>📥</span>
              <span>Load Code</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 ml-auto">
            <button
              onClick={handleDownloadWav}
              disabled={isExportingWav}
              className="min-h-[36px] px-3 py-1.5 sm:py-2 rounded-xl bg-linear-to-r from-[#8574dc] to-[#5ea0de] hover:brightness-105 text-white font-black text-xs shadow-md transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60"
            >
              <span>⬇️</span>
              <span>{isExportingWav ? 'Rendering WAV...' : 'Download .WAV'}</span>
            </button>
            <button
              onClick={handleSaveMusicBox}
              className="min-h-[36px] px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-linear-to-r from-[#ff7aa8] to-[#f46496] hover:brightness-105 text-white font-black text-xs sm:text-sm shadow-md transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            >
              <span>🎠</span>
              <span className="sm:hidden">Save to Music Box</span>
              <span className="hidden sm:inline">Set as Cottage Music Box Tune</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
