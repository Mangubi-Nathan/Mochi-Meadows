import React, { useRef, useState, useCallback, useEffect } from 'react';
import { MAGIC_SPELLS, SeasonId } from '../game/constants';
import { normalizeSeasonId } from '../game/seasons';
import { getSeasonalSpellVariant } from '../game/seasonalSpells';

interface TouchControlsProps {
  isPhone: boolean;
  isTablet: boolean;
  isLandscapePhone?: boolean;
  isCompactPhone?: boolean;
  currentChapter?: number;
  season?: SeasonId;
  nearNpc: boolean;
  activeNpcName?: string;
  canDive: boolean;
  isDiving: boolean;
  isSwimming?: boolean;
  isSky: boolean;
  canFish: boolean;
  mana: number;
  selectedSpellIdx: number;
  onJoystickMove: (dx: number, dy: number, active: boolean) => void;
  onDash: () => void;
  onJump?: () => void;
  onTalk: () => void;
  onDive: () => void;
  onFish: () => void;
  onCastSpell: (idx: number) => void;
  onCycleSpell?: () => void;
  nearbyPortal?: { label: string; icon: string; locked?: boolean } | null;
  onUsePortal?: () => void;
  nearbyTownAction?: { kind: 'market' | 'board'; townName: string; label: string; icon: string } | null;
  onTownInteract?: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  isPhone,
  isTablet,
  isLandscapePhone = false,
  isCompactPhone = false,
  currentChapter = 1,
  season = 'spring',
  nearNpc,
  activeNpcName,
  canDive,
  isDiving,
  isSwimming = false,
  isSky,
  canFish,
  mana,
  selectedSpellIdx,
  onJoystickMove,
  onDash,
  onJump,
  onTalk,
  onDive,
  onFish,
  onCastSpell,
  onCycleSpell,
  nearbyPortal = null,
  onUsePortal,
  nearbyTownAction = null,
  onTownInteract,
}) => {
  const joystickBaseRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [spellDrawerOpen, setSpellDrawerOpen] = useState(false);

  // Scaled ergonomic joystick dimensions so bottom-left & bottom-right never collide
  const baseSize = isCompactPhone || isLandscapePhone ? 96 : isPhone ? 110 : isTablet ? 132 : 136;
  const knobSize = isCompactPhone || isLandscapePhone ? 42 : isPhone ? 48 : 56;
  const maxRadius = (baseSize - knobSize) / 2 + 6;

  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(8);
      } catch {}
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== null) return;
    pointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);

    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist > 0) {
      const clampedDist = Math.min(dist, maxRadius);
      const nx = (dx / dist) * clampedDist;
      const ny = (dy / dist) * clampedDist;
      setKnobPos({ x: nx, y: ny });
      onJoystickMove(nx, ny, true);
    } else {
      setKnobPos({ x: 0, y: 0 });
      onJoystickMove(0, 0, true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    const base = joystickBaseRef.current;
    if (!base) return;

    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist > 0) {
      const clampedDist = Math.min(dist, maxRadius);
      const nx = (dx / dist) * clampedDist;
      const ny = (dy / dist) * clampedDist;
      setKnobPos({ x: nx, y: ny });
      onJoystickMove(nx, ny, true);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current === e.pointerId) {
      pointerIdRef.current = null;
      setIsDragging(false);
      setKnobPos({ x: 0, y: 0 });
      onJoystickMove(0, 0, false);
    }
  };

  // Reset if unmounted
  useEffect(() => {
    return () => {
      onJoystickMove(0, 0, false);
    };
  }, [onJoystickMove]);

  const activeSeason = normalizeSeasonId(season);
  const spell = MAGIC_SPELLS[selectedSpellIdx] || MAGIC_SPELLS[0];
  const activeVariant = getSeasonalSpellVariant(spell.id, activeSeason);
  const spellUnlocked = currentChapter >= spell.unlockChapter;
  const hasEnoughMana = spellUnlocked && mana >= spell.cost;

  // Responsive ≥44px touch action buttons
  const btnSizeClass =
    isCompactPhone || isLandscapePhone
      ? 'w-11 h-11 text-lg'
      : isPhone
      ? 'w-12 h-12 text-xl'
      : 'w-14 h-14 sm:w-15 sm:h-15 text-2xl';

  const dashSizeClass =
    isCompactPhone || isLandscapePhone
      ? 'w-14 h-14 text-xl'
      : isPhone
      ? 'w-[60px] h-[60px] text-2xl'
      : 'w-18 h-18 text-3xl';

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-20 overflow-hidden">
      {/* Virtual Analog Joystick (Bottom-Left with Safe Area) */}
      <div
        className={`absolute pointer-events-auto transition-opacity pl-safe pb-safe ${
          isLandscapePhone
            ? 'left-3 bottom-2.5'
            : isPhone
            ? 'left-3 bottom-3.5'
            : 'left-6 bottom-6'
        }`}
      >
        <div
          ref={joystickBaseRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ width: baseSize, height: baseSize }}
          className={`relative rounded-full flex items-center justify-center cursor-pointer touch-none shadow-xl transition-colors ${
            isDragging
              ? 'bg-[#ffffff]/35 dark:bg-[#271d31]/75 border-3 border-[#ff7aa8]'
              : 'bg-[#ffffff]/22 dark:bg-[#271d31]/55 border-2 border-[#ffffff]/65 dark:border-[#ffd3e2]/45 backdrop-blur-xs'
          }`}
        >
          <span className="absolute top-1.5 text-[9px] text-white/60 font-black">▲</span>
          <span className="absolute bottom-1.5 text-[9px] text-white/60 font-black">▼</span>
          <span className="absolute left-1.5 text-[9px] text-white/60 font-black">◀</span>
          <span className="absolute right-1.5 text-[9px] text-white/60 font-black">▶</span>

          {/* Inner Joystick Knob */}
          <div
            style={{
              width: knobSize,
              height: knobSize,
              transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
            }}
            className={`rounded-full shadow-lg flex items-center justify-center transition-transform duration-75 ${
              isDragging
                ? 'bg-linear-to-tr from-[#ff7aa8] to-[#ff9ebb] scale-105 border-2 border-white'
                : 'bg-white/92 dark:bg-[#3d274c]/92 border-2 border-[#ffb3c7]'
            }`}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-[#ff7aa8]/40 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ff7aa8]" />
            </div>
          </div>
        </div>
      </div>

      {/* Ergonomic Action Buttons Cluster (Bottom-Right with Safe Area & Max Width Guard) */}
      <div
        className={`absolute pointer-events-auto flex flex-col items-end pr-safe pb-safe max-w-[54vw] ${
          isLandscapePhone
            ? 'right-2.5 bottom-2 gap-1.5'
            : isPhone
            ? 'right-3 bottom-3 gap-2'
            : 'right-6 bottom-5 gap-2.5'
        }`}
      >
        {/* Expandable Quick Spell Tray Popover for Phones */}
        {spellDrawerOpen && (
          <div className="storybook-panel border border-[#ffd3e2] dark:border-[#6b4a7a] rounded-2xl p-1.5 grid grid-cols-4 gap-1 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150">
            {MAGIC_SPELLS.map((s, idx) => {
              const locked = currentChapter < s.unlockChapter;
              const selected = idx === selectedSpellIdx;
              const affordable = mana >= s.cost;
              const sVariant = getSeasonalSpellVariant(s.id, activeSeason);
              return (
                <button
                  key={s.id}
                  disabled={locked}
                  onClick={() => {
                    triggerHaptic();
                    onCastSpell(idx);
                    setSpellDrawerOpen(false);
                  }}
                  title={
                    sVariant
                      ? `${sVariant.seasonBadge} ${sVariant.variantName} (${s.cost} MP) — ${sVariant.bonusSummary}`
                      : `${s.name} (${s.cost} MP)`
                  }
                  className={`relative w-10 h-10 rounded-xl flex flex-col items-center justify-center text-base transition-all cursor-pointer ${
                    locked
                      ? 'opacity-30 grayscale cursor-not-allowed'
                      : selected
                      ? 'bg-[#ff7aa8] text-white ring-2 ring-[#ffd23f]'
                      : affordable
                      ? 'bg-white/80 dark:bg-black/25 hover:bg-[#ffd3e2]/60 text-[#4a3550] dark:text-[#fdeeff]'
                      : 'opacity-55 bg-white/40 dark:bg-black/15'
                  }`}
                >
                  {!locked && sVariant && (
                    <span
                      aria-hidden="true"
                      className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: sVariant.ringColor }}
                    />
                  )}
                  <span className="leading-none">{s.icon}</span>
                  <span className="text-[8px] font-black leading-none mt-0.5 tabular-nums">{s.cost}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Context-Sensitive Row 1: Talk / Fish / Portal / Dive */}
        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          {nearNpc && (
            <button
              onClick={() => {
                triggerHaptic();
                onTalk();
              }}
              className={`${btnSizeClass} rounded-full bg-[#ffd23f] hover:bg-[#ffc107] border-2 sm:border-3 border-white text-[#4a3550] font-black flex flex-col items-center justify-center shadow-2xl active:scale-90 transition-transform animate-bounce cursor-pointer shrink-0`}
              title="Talk"
            >
              <span className="leading-none">💬</span>
              {activeNpcName && !isCompactPhone && (
                <span className="text-[8px] font-black tracking-tight leading-none text-[#4a3550] max-w-[42px] truncate mt-0.5">
                  {activeNpcName}
                </span>
              )}
            </button>
          )}

          {nearbyTownAction && onTownInteract && !nearNpc && (
            <button
              onClick={() => {
                triggerHaptic();
                onTownInteract();
              }}
              className={`${btnSizeClass} rounded-full bg-[#ff7aa8] hover:bg-[#f05c93] border-2 sm:border-3 border-white text-white font-black flex flex-col items-center justify-center shadow-2xl active:scale-90 transition-transform cursor-pointer shrink-0`}
              title={nearbyTownAction.label}
            >
              <span className="leading-none">{nearbyTownAction.icon}</span>
              {!isCompactPhone && (
                <span className="text-[8px] font-black tracking-tight leading-none text-white max-w-[42px] truncate mt-0.5">
                  {nearbyTownAction.kind === 'board' ? 'Board' : 'Market'}
                </span>
              )}
            </button>
          )}

          {canFish && (
            <button
              onClick={() => {
                triggerHaptic();
                onFish();
              }}
              className={`${btnSizeClass} rounded-full bg-[#6cd4ff] hover:bg-[#4ac5f8] border-2 sm:border-3 border-white text-[#4a3550] font-black flex items-center justify-center shadow-2xl active:scale-90 transition-transform cursor-pointer shrink-0`}
              title="Fish"
            >
              <span>🎣</span>
            </button>
          )}

          {nearbyPortal && onUsePortal && (
            <button
              onClick={() => {
                triggerHaptic();
                onUsePortal();
              }}
              className={`${btnSizeClass} rounded-full ${
                nearbyPortal.locked
                  ? 'bg-[#5c4f73] border-[#d5c7e8]'
                  : 'bg-[#8f5cff] hover:bg-[#7b43f5] border-white animate-pulse'
              } border-2 sm:border-3 text-white font-black flex flex-col items-center justify-center shadow-2xl active:scale-90 transition-transform cursor-pointer shrink-0`}
              title={nearbyPortal.label}
            >
              <span className="leading-none">{nearbyPortal.icon}</span>
              <span className="text-[8px] font-black leading-none max-w-[42px] truncate mt-0.5">Enter</span>
            </button>
          )}

          {canDive && !nearbyPortal && (
            <button
              onClick={() => {
                triggerHaptic();
                onDive();
              }}
              className={`${btnSizeClass} rounded-full bg-[#52d6c6] hover:bg-[#3cc0b0] border-2 sm:border-3 border-white text-white font-black flex items-center justify-center shadow-2xl active:scale-90 transition-transform cursor-pointer shrink-0`}
              title={isDiving ? 'Surface' : isSky ? 'Land' : 'Dive'}
            >
              <span>{isDiving ? '🌊' : isSky ? '☁️' : '🤿'}</span>
            </button>
          )}
        </div>

        {/* Primary Action Row: Spell Drawer / Spell Cast / Cycle + Dash */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Spell Picker Drawer Toggle (gives phone users direct 1-tap access to all 12 spells) */}
          {isPhone && (
            <button
              onClick={() => {
                triggerHaptic();
                setSpellDrawerOpen((v) => !v);
              }}
              title={spellDrawerOpen ? 'Close spell tray' : 'Choose Spell'}
              className={`w-11 h-11 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-sm font-black transition-all active:scale-90 cursor-pointer shrink-0 ${
                spellDrawerOpen
                  ? 'bg-[#ff7aa8] text-white'
                  : 'bg-[#fffaf2]/90 dark:bg-[#2a1d35]/90 text-[#4a3550] dark:text-[#fdeeff]'
              }`}
            >
              {spellDrawerOpen ? '✕' : '✨'}
            </button>
          )}

          {/* Active Spell Cast + Cycle Badge (Tablet only when spell tray isn't used) */}
          <div className="relative shrink-0">
            <button
              onClick={() => {
                triggerHaptic();
                onCastSpell(selectedSpellIdx);
              }}
              disabled={!hasEnoughMana}
              style={
                hasEnoughMana && activeVariant
                  ? {
                      boxShadow: `0 4px 16px ${activeVariant.ringColor}88`,
                      borderColor: activeVariant.ringColor,
                    }
                  : undefined
              }
              className={`${btnSizeClass} rounded-full border-2 sm:border-3 border-white shadow-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                hasEnoughMana
                  ? 'bg-linear-to-tr from-[#9b6bff] to-[#bd8fff] text-white active:scale-90'
                  : 'bg-gray-400/75 opacity-60 text-white cursor-not-allowed'
              }`}
              title={
                activeVariant
                  ? `${activeVariant.seasonBadge} ${activeVariant.variantName} (${spell.cost} MP) — ${activeVariant.bonusSummary}`
                  : `${spell.name} (${spell.cost} MP)`
              }
            >
              <span className="leading-none">{spell.icon}</span>
            </button>
            {activeVariant && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-1 -left-1 w-5 h-5 rounded-full bg-[#fffaf2]/95 dark:bg-[#271d31]/95 border border-white/80 text-[10px] flex items-center justify-center shadow-xs"
              >
                {activeVariant.seasonBadge}
              </span>
            )}
            {!isPhone && onCycleSpell && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic();
                  onCycleSpell();
                }}
                className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#ffd23f] border-2 border-white text-[10px] font-black flex items-center justify-center shadow-md active:scale-90 cursor-pointer"
                title={`Next Spell (${MAGIC_SPELLS.length} total)`}
              >
                🔄
              </button>
            )}
          </div>

          {/* Quick Dash Button */}
          <button
            onClick={() => {
              triggerHaptic();
              onDash();
            }}
            className={`${btnSizeClass} rounded-full bg-linear-to-tr from-[#ff7aa8] to-[#ff5277] hover:from-[#ff6b6b] hover:to-[#ff3b68] border-2 sm:border-3 border-white text-white font-black flex items-center justify-center shadow-2xl active:scale-90 transition-transform cursor-pointer shrink-0`}
            title="Dash"
          >
            <span>⚡</span>
          </button>

          {/* Primary Jump / Dolphin Leap Button */}
          {onJump && (
            <button
              onClick={() => {
                triggerHaptic();
                onJump();
              }}
              className={`${dashSizeClass} rounded-full bg-linear-to-tr from-[#5fd678] to-[#98eb93] hover:brightness-105 border-3 sm:border-4 border-white text-[#14421f] font-black flex items-center justify-center shadow-2xl active:scale-90 transition-transform cursor-pointer shrink-0`}
              title={isSwimming ? 'Dolphin Leap' : 'Jump / Double-Hop'}
            >
              <span>{isSwimming ? '🐬' : '⬆️'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
