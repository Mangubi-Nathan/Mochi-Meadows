import React, { useEffect, useMemo, useState } from 'react';
import { T, Town } from '../game/engine';

interface TeleportModalProps {
  towns: Town[];
  playerPos: { x: number; y: number; sky: boolean; dive: boolean; glowdeep?: boolean; moonroad?: boolean };
  mana: number;
  spellCost: number;
  onTeleport: (town: Town) => void;
  onClose: () => void;
}

const LAYER_LABELS: Record<number, { label: string; icon: string; badgeClass: string }> = {
  0: {
    label: 'Ground Archipelago',
    icon: '🌿',
    badgeClass: 'bg-[#7bd88f]/20 text-[#267340] dark:text-[#9ef0b2] border-[#7bd88f]/40',
  },
  1: {
    label: 'Undersea Reef',
    icon: '🌊',
    badgeClass: 'bg-[#52d6c6]/20 text-[#13746b] dark:text-[#7ef2e4] border-[#52d6c6]/40',
  },
  2: {
    label: 'Cirrus Sky Kingdom',
    icon: '☁️',
    badgeClass: 'bg-[#8fd5ff]/25 text-[#1f6294] dark:text-[#aee2ff] border-[#8fd5ff]/45',
  },
  3: {
    label: 'Glowdeep Caverns',
    icon: '🍄',
    badgeClass: 'bg-[#b48cff]/20 text-[#5d33a8] dark:text-[#d5bfff] border-[#b48cff]/45',
  },
  4: {
    label: 'Moon Road',
    icon: '🌙',
    badgeClass: 'bg-[#ffd23f]/25 text-[#8a6100] dark:text-[#ffe37a] border-[#ffd23f]/50',
  },
};

export const TeleportModal: React.FC<TeleportModalProps> = ({
  towns,
  playerPos,
  mana,
  spellCost,
  onTeleport,
  onClose,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'unlocked' | 'ground' | 'realms'>('all');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  const unlockedCount = useMemo(() => towns.filter((t) => t.vis === 1).length, [towns]);
  const hasEnoughMana = mana >= spellCost;

  const filteredTowns = useMemo(() => {
    const list = towns.filter((t) => {
      if (filterMode === 'unlocked') return t.vis === 1;
      if (filterMode === 'ground') return t.w === 0;
      if (filterMode === 'realms') return t.w >= 1;
      return true;
    });

    // Sort unlocked first, then by layer (Ground -> Reef -> Sky -> Glowdeep -> Moon Road), then alphabetically
    return [...list].sort((a, b) => {
      if (a.vis !== b.vis) return b.vis - a.vis;
      if (a.w !== b.w) return a.w - b.w;
      return a.n.localeCompare(b.n);
    });
  }, [towns, filterMode]);

  const unlockedList = filteredTowns.filter((t) => t.vis === 1);
  const lockedList = filteredTowns.filter((t) => t.vis !== 1);

  return (
    <div className="fixed inset-0 z-50 bg-[#160f22]/92 flex items-center justify-center p-modal-safe select-none animate-in fade-in duration-150">
      <div className="w-full max-w-2xl max-h-[94dvh] storybook-modal rounded-2xl sm:rounded-3xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-[#f0c7d8]/80 dark:border-[#5b3b6b]/80 bg-linear-to-r from-[#ffedf5] via-[#fff8ea] to-[#efe8ff] dark:from-[#322140] dark:via-[#271d31] dark:to-[#241b38] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-linear-to-tr from-[#9b6bff] to-[#ff7aa8] text-white flex items-center justify-center text-xl sm:text-2xl shadow-md shrink-0">
              🌀
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-[#4a3550] dark:text-[#fdeeff] leading-tight truncate">
                Song of Teleportation
              </h2>
              <p className="text-[11px] sm:text-xs font-bold text-[#6e5474] dark:text-[#c9b7d4] truncate">
                {unlockedCount} / {towns.length} Town Centers Unlocked · Costs {spellCost} MP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div
              className={`px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-black border ${
                hasEnoughMana
                  ? 'bg-[#8ed0ff]/25 border-[#5aa9ff]/40 text-[#2563a8] dark:text-[#9bd7ff]'
                  : 'bg-[#ff6b6b]/20 border-[#ff6b6b]/40 text-[#c93434] dark:text-[#ff9c9c]'
              }`}
            >
              💧 {mana} MP
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full storybook-card hover:bg-[#ff7aa8] hover:text-white text-[#4a3550] dark:text-[#fdeeff] font-black flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-3 sm:px-4 py-2 border-b border-[#ffd3e2]/50 dark:border-[#5a3a6b]/50 flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-white/40 dark:bg-black/15">
          {(
            [
              ['all', 'All Towns'],
              ['unlocked', `✅ Unlocked (${unlockedCount})`],
              ['ground', '🌿 Ground'],
              ['realms', '✨ Other Realms'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilterMode(key)}
              className={`px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-black whitespace-nowrap shrink-0 cursor-pointer transition-all ${
                filterMode === key
                  ? 'bg-[#ff7aa8] text-white shadow-xs'
                  : 'bg-white/75 dark:bg-white/10 text-[#5a425f] dark:text-[#d4c3db] hover:bg-white dark:hover:bg-white/20'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Town List */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-3">
          {!hasEnoughMana && (
            <div className="p-2.5 rounded-2xl bg-[#ff6b6b]/15 border border-[#ff6b6b]/40 text-xs font-bold text-[#b83232] dark:text-[#ffb0b0] text-center">
              You need {spellCost} MP to sing the Song of Teleportation (mana regenerates naturally).
            </div>
          )}

          {/* Unlocked Destinations */}
          {unlockedList.length > 0 ? (
            <div className="space-y-2">
              <div className="text-[11px] font-black uppercase tracking-wider text-[#6e5474] dark:text-[#bfa9cc] px-1">
                Unlocked Town Centers
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {unlockedList.map((town) => {
                  const layerMeta = LAYER_LABELS[town.w] || LAYER_LABELS[0];
                  const targetX = town.x * T + T / 2;
                  const targetY = town.y * T + T / 2;
                  const distPx = Math.hypot(targetX - playerPos.x, targetY - playerPos.y);
                  const paces = Math.round(distPx / 20);
                  const playerLayer = playerPos.sky ? 2 : playerPos.dive ? 1 : playerPos.glowdeep ? 3 : playerPos.moonroad ? 4 : 0;
                  const isAlreadyAtCenter = distPx < 75 && town.w === playerLayer;

                  return (
                    <div
                      key={`${town.w}-${town.n}`}
                      className="p-2.5 sm:p-3 rounded-2xl storybook-card flex items-center justify-between gap-2.5 hover:border-[#ff7aa8] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center flex-wrap gap-1">
                          <span className="text-sm font-black text-[#4a3550] dark:text-[#fdeeff] truncate">
                            🏘️ {town.n}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${layerMeta.badgeClass}`}
                          >
                            {layerMeta.icon} {layerMeta.label}
                          </span>
                        </div>
                        <div className="text-[11px] font-bold text-[#6e5474] dark:text-[#bdaac9] mt-0.5 truncate">
                          {isAlreadyAtCenter ? 'Standing at center' : `${paces} paces away · (${town.x}, ${town.y})`}
                        </div>
                      </div>

                      <button
                        onClick={() => onTeleport(town)}
                        disabled={!hasEnoughMana || isAlreadyAtCenter}
                        className={`px-3 py-2 rounded-xl font-black text-xs whitespace-nowrap shrink-0 transition-all shadow-sm ${
                          isAlreadyAtCenter
                            ? 'bg-[#7bd88f]/25 text-[#2c7a48] dark:text-[#8ef0a8] cursor-default'
                            : hasEnoughMana
                            ? 'bg-linear-to-r from-[#9b6bff] to-[#ff7aa8] hover:brightness-105 text-white cursor-pointer active:scale-95'
                            : 'bg-gray-300/60 dark:bg-white/10 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {isAlreadyAtCenter ? '📍 Here' : '🌀 Warp'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl storybook-card text-center text-xs font-bold text-[#6e5474] dark:text-[#c4b3cc]">
              No unlocked town centers match this filter yet. Visit a town square to attune its melody!
            </div>
          )}

          {/* Locked / Unvisited Town Centers */}
          {lockedList.length > 0 && filterMode !== 'unlocked' && (
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-black uppercase tracking-wider text-[#6e5474]/80 dark:text-[#bfa9cc]/75 px-1">
                Unvisited Town Centers ({lockedList.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {lockedList.map((town) => {
                  const layerMeta = LAYER_LABELS[town.w] || LAYER_LABELS[0];
                  return (
                    <div
                      key={`locked-${town.w}-${town.n}`}
                      className="p-2.5 rounded-2xl bg-white/45 dark:bg-black/20 border border-[#f0c7d8]/50 dark:border-[#5b3b6b]/60 flex items-center justify-between gap-2 opacity-75"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center flex-wrap gap-1">
                          <span className="text-xs font-black text-[#5a425f] dark:text-[#d4c3db] truncate">
                            🔒 {town.n}
                          </span>
                          <span
                            className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${layerMeta.badgeClass}`}
                          >
                            {layerMeta.icon} {layerMeta.label}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-[#786180] dark:text-[#a693b5] mt-0.5 truncate">
                          Visit near ({town.x}, {town.y}) to unlock
                        </p>
                      </div>
                      <span className="text-[10px] font-black text-[#8f7899] dark:text-[#9c86ab] px-2 py-1 rounded-lg bg-black/5 dark:bg-white/5 shrink-0">
                        Locked
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
