/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MAGIC_SPELLS, SeasonId, WeatherConfig } from '../game/constants';
import { SEASON_THEMES, normalizeSeasonId } from '../game/seasons';
import { getSeasonalSpellVariant } from '../game/seasonalSpells';
import { WeatherEffectBadges } from './WeatherEffectBadges';
import { multiTouchTap } from '../utils/touchTap';

export interface QuestTrackerSideQuest {
  title: string;
  detail: string;
  current: number;
  target: number;
  ready?: boolean;
}

export interface QuestTrackerData {
  chapterNum: number;
  chapterTitle: string;
  actLabel: string;
  objective: string;
  locationHint: string;
  progressCurrent: number;
  progressTarget: number;
  progressUnit: string;
  everlightMode?: boolean;
  activeSideQuest?: QuestTrackerSideQuest | null;
}

interface HudProps {
  biomeName: string;
  starsGot: number;
  starsTotal: number;
  pearlsGot: number;
  pearlsTotal: number;
  feathersGot: number;
  feathersTotal: number;
  heartsGot: number;
  heartsTotal: number;
  skyHeartsGot: number;
  questsDone: number;
  questsTotal: number;
  coins: number;
  objectiveText: string;
  stamina: number;
  air: number;
  mana: number;
  isDiving: boolean;
  isSwimming?: boolean;
  isSky: boolean;
  canDive: boolean;
  canFish: boolean;
  nearNpc: boolean;
  currentChapter: number;
  minimapRef: React.RefObject<HTMLCanvasElement | null>;
  onCastSpell: (idx: number) => void;
  onDive: () => void;
  onTalk: () => void;
  onFish: () => void;
  onToggleMusic: () => void;
  onOpenMap: () => void;
  onOpenJournal: () => void;
  onOpenPause: () => void;
  onOpenGazette: () => void;
  musicIcon: string;
  hasCustomMusic: boolean;
  weather?: {
    id: string;
    name: string;
    icon: string;
    description: string;
    ambientMessage?: string;
    effectBadges?: WeatherConfig['effectBadges'];
  };
  season?: SeasonId;
  seasonRemainingSec?: number;
  isTouch?: boolean;
  isPhone?: boolean;
  isTablet?: boolean;
  isLandscapePhone?: boolean;
  isCompactPhone?: boolean;
  activeSpells?: Record<string, boolean>;
  isGlowdeep?: boolean;
  isMoonRoad?: boolean;
  nearbyPortal?: { label: string; icon: string; locked?: boolean } | null;
  onUsePortal?: () => void;
  hasNewGazette?: boolean;
  is3D?: boolean;
  cameraPresetLabel?: string;
  cameraPresetIdx?: number;
  onCycleCamera?: () => void;
  onSelectCameraPreset?: (idx: number) => void;
  questTracker?: QuestTrackerData;
  achievementsUnlocked?: number;
  achievementsTotal?: number;
  onOpenAchievements?: () => void;
  canSingDawnDuet?: boolean;
  onSingDawnDuet?: () => void;
  nearbyTownAction?: { kind: 'market' | 'board'; townName: string; label: string; icon: string } | null;
  onTownInteract?: () => void;
}

export const Hud: React.FC<HudProps> = React.memo(({
  biomeName,
  starsGot,
  starsTotal,
  pearlsGot,
  pearlsTotal,
  feathersGot,
  feathersTotal,
  heartsGot,
  heartsTotal,
  skyHeartsGot,
  questsDone,
  questsTotal,
  coins,
  objectiveText,
  stamina,
  air,
  mana,
  isDiving,
  isSwimming = false,
  isSky,
  canDive,
  canFish,
  nearNpc,
  currentChapter,
  minimapRef,
  onCastSpell,
  onDive,
  onTalk,
  onFish,
  onToggleMusic,
  onOpenMap,
  onOpenJournal,
  onOpenPause,
  onOpenGazette,
  musicIcon,
  weather,
  season = 'spring',
  seasonRemainingSec,
  isTouch = false,
  isPhone = false,
  isTablet = false,
  isLandscapePhone = false,
  isCompactPhone = false,
  activeSpells = {},
  isGlowdeep = false,
  isMoonRoad = false,
  nearbyPortal = null,
  onUsePortal,
  hasNewGazette = false,
  is3D = false,
  cameraPresetLabel = 'Cozy 3/4',
  cameraPresetIdx = 0,
  onCycleCamera,
  onSelectCameraPreset,
  questTracker,
  achievementsUnlocked = 0,
  nearbyTownAction = null,
  onTownInteract,
  achievementsTotal = 20,
  onOpenAchievements,
  canSingDawnDuet = false,
  onSingDawnDuet,
}) => {
  // Collapse minimap & quest tracker automatically on landscape phones to keep center viewport open
  const [minimapCollapsed, setMinimapCollapsed] = useState(() => isLandscapePhone);
  const [trackerCollapsed, setTrackerCollapsed] = useState(() => isLandscapePhone);
  const [statusCollapsed, setStatusCollapsed] = useState(false);
  const [spellsCollapsed, setSpellsCollapsed] = useState(false);
  const [camMenuOpen, setCamMenuOpen] = useState(false);

  const camShortBadge =
    cameraPresetIdx === 3
      ? '1st'
      : cameraPresetIdx === 4
      ? '3rd ▸'
      : cameraPresetIdx === 5
      ? '3rd ◂'
      : cameraPresetIdx === 1
      ? 'Close'
      : cameraPresetIdx === 2
      ? 'Vista'
      : '3/4';

  useEffect(() => {
    setMinimapCollapsed(isLandscapePhone);
    setTrackerCollapsed(isLandscapePhone);
  }, [isLandscapePhone]);

  const renderGazetteButton = (sizeClass: string) => (
    <button
      type="button"
      {...multiTouchTap(onOpenGazette)}
      title={hasNewGazette ? 'Meadows Gazette — Fresh Edition Available!' : 'Island Gazette Newspaper'}
      aria-label={hasNewGazette ? 'Open Meadows Gazette (New edition available)' : 'Open Meadows Gazette'}
      className={`relative ${sizeClass} touch-none rounded-xl flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0 ${
        hasNewGazette
          ? 'bg-[#fff2f7] dark:bg-[#492c54] ring-2 ring-[#ff7aa8]/75 shadow-[0_0_12px_rgba(255,122,168,0.55)] text-[#4a3550] dark:text-[#fdeeff]'
          : 'hover:bg-[#ffd3e2]/55 dark:hover:bg-[#5a3a6b]/60 text-[#4a3550] dark:text-[#fdeeff]'
      }`}
    >
      <span>📰</span>
      {hasNewGazette && (
        <span className="pointer-events-none absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4">
          <span className="absolute inset-0 rounded-full bg-[#ff7aa8]/45" />
          <svg
            viewBox="0 0 24 24"
            className="relative w-3.5 h-3.5 drop-shadow-[0_0_5px_rgba(255,210,63,0.95)]"
            aria-hidden="true"
          >
            <g fill="#ff85b3" stroke="#fff7fb" strokeWidth="1.2">
              <circle cx="12" cy="5.5" r="4" />
              <circle cx="18.2" cy="10" r="4" />
              <circle cx="15.8" cy="17.2" r="4" />
              <circle cx="8.2" cy="17.2" r="4" />
              <circle cx="5.8" cy="10" r="4" />
            </g>
            <circle cx="12" cy="12" r="3.4" fill="#ffd23f" />
          </svg>
        </span>
      )}
    </button>
  );

  const dockBtnSize = isLandscapePhone
    ? 'w-9 h-9 text-base'
    : isPhone
    ? 'w-9 h-9 text-base'
    : 'w-9 h-9 sm:w-10 sm:h-10 text-base sm:text-lg';

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-10">
      {/* Top Left: Adaptive Status & Vitals Card with Safe Area */}
      <div
        className={`absolute left-2 sm:left-3 top-2 sm:top-3 pt-safe pl-safe flex flex-col gap-1 pointer-events-auto ${
          isLandscapePhone
            ? 'max-w-[44vw]'
            : isCompactPhone
            ? 'max-w-[calc(100vw-8.75rem)]'
            : isPhone
            ? 'max-w-[calc(100vw-9.5rem)]'
            : isTablet
            ? 'max-w-[295px]'
            : 'max-w-sm'
        }`}
      >
        {statusCollapsed ? (
          <button
            type="button"
            {...multiTouchTap(() => setStatusCollapsed(false))}
            title="Restore Status & Vitals"
            aria-label="Restore Status and Vitals panel"
            className="storybook-panel touch-none border border-[#ffd3e2] dark:border-[#6b4a7a] rounded-2xl px-2.5 py-1 flex items-center justify-between gap-2 text-[#4a3550] dark:text-[#fdeeff] cursor-pointer hover:border-[#ff7aa8] transition-colors w-fit max-w-full"
          >
            <span className="flex items-center gap-1.5 min-w-0 text-[10.5px] font-black">
              <span className="shrink-0">📍</span>
              <span className="truncate font-display text-[var(--fg)]">{biomeName}</span>
              <span aria-hidden="true" className="opacity-35">·</span>
              <span className="text-[#3ca856] dark:text-[#7bd88f] shrink-0 tabular-nums">⚡{Math.round(stamina)}%</span>
              {(isDiving || air < 100) && (
                <span className="text-[#2b8be0] dark:text-[#7de0ff] shrink-0 tabular-nums">🫧{Math.round(air)}%</span>
              )}
              <span className="text-[#8a5de8] dark:text-[#caaaff] shrink-0 tabular-nums">✨{Math.round(mana)}%</span>
            </span>
            <span className="text-[10px] opacity-70 shrink-0">▾</span>
          </button>
        ) : (
        <div
          className={`storybook-panel border border-[#ffd3e2] dark:border-[#6b4a7a] rounded-2xl text-[#4a3550] dark:text-[#fdeeff] ${
            isLandscapePhone ? 'px-2.5 py-1.5 flex flex-col gap-1' : 'p-2 sm:p-3 flex flex-col gap-1.5 sm:gap-2'
          }`}
        >
          {/* Header Row: Location, Season Theme & Minimize Toggle */}
          <div className="flex items-center justify-between gap-1.5 min-w-0">
            <span className="text-xs font-black truncate flex items-center gap-1 text-[var(--ac)] min-w-0">
              <span className="text-xs sm:text-sm shrink-0">📍</span>
              <span
                className={`font-display tracking-tight text-[var(--fg)] truncate ${
                  isLandscapePhone ? 'text-xs' : 'text-xs sm:text-sm'
                }`}
              >
                {biomeName}
              </span>
            </span>

            <div className="flex items-center gap-1 shrink-0">
              {(() => {
                const activeSeasonTheme = SEASON_THEMES[normalizeSeasonId(season)];
                const remText =
                  typeof seasonRemainingSec === 'number'
                    ? ` · Next in ${Math.floor(seasonRemainingSec / 60)}m ${seasonRemainingSec % 60}s`
                    : '';
                return (
                  <span
                    title={`${activeSeasonTheme.name} (${activeSeasonTheme.subtitle}) — Changes periodically${remText}`}
                    className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-[var(--bd)]/35 text-[var(--fg)] text-[10px] sm:text-[11px] font-extrabold flex items-center gap-1 shrink-0 whitespace-nowrap"
                  >
                    <span>{activeSeasonTheme.icon}</span>
                    <span className={isLandscapePhone || isPhone ? 'hidden md:inline' : 'hidden sm:inline'}>
                      {activeSeasonTheme.name}
                    </span>
                  </span>
                );
              })()}
              <button
                type="button"
                {...multiTouchTap(() => setStatusCollapsed(true))}
                title="Minimize Status & Vitals"
                aria-label="Minimize Status and Vitals panel"
                className="w-5 h-5 touch-none rounded-full bg-[#4a3550]/10 dark:bg-white/15 hover:bg-[#ff7aa8] hover:text-white text-[10px] font-black flex items-center justify-center cursor-pointer transition-colors shrink-0"
              >
                —
              </button>
            </div>
          </div>

          {/* Current Weather Message + Small Gameplay Effect Reference Icons */}
          {weather && (() => {
            const rawMsg = (weather.ambientMessage || weather.name).trim();
            const cleanMsg =
              rawMsg.endsWith(weather.icon)
                ? rawMsg.slice(0, rawMsg.length - weather.icon.length).trim()
                : rawMsg;
            const effectSummary = weather.effectBadges?.length
              ? ` | Effects: ${weather.effectBadges.map((b) => `${b.label} ${b.delta}`).join(', ')}`
              : '';
            return (
              <div
                title={`${weather.name}: ${weather.description}${effectSummary}`}
                className="flex items-center justify-between gap-1.5 px-1.5 py-0.5 rounded-lg bg-[var(--bd)]/28 border border-[var(--bd)]/45 min-w-0"
              >
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-[11px] sm:text-xs shrink-0 leading-none">{weather.icon}</span>
                  <span className="text-[10px] sm:text-[10.5px] font-extrabold text-[var(--fg)]/90 truncate">
                    {cleanMsg}
                  </span>
                </div>
                <WeatherEffectBadges
                  badges={weather.effectBadges}
                  compact={isLandscapePhone || isPhone}
                />
              </div>
            );
          })()}

          {/* Stats Row */}
          {isLandscapePhone ? (
            <div className="flex items-center gap-2 text-[10.5px] font-black opacity-95 overflow-x-auto scrollbar-none tabular-nums">
              <span title="Star Gems">✨{starsGot}/{starsTotal}</span>
              <span title="Sea Pearls">🐚{pearlsGot}/{pearlsTotal}</span>
              <span className="text-[#d9841c] dark:text-[#ffd23f]" title="Island Coins">🪙{coins}</span>
              <span className="text-[#e84b86] dark:text-[#ff85b3]" title="Hearts">❤{heartsGot}/{heartsTotal}</span>
            </div>
          ) : (
            <div className="flex items-center flex-wrap gap-x-1.5 sm:gap-x-2 gap-y-0.5 text-[11px] sm:text-xs font-black opacity-95 tabular-nums">
              <span className="flex items-center gap-0.5 sm:gap-1" title="Star Gems Collected">
                <span>✨</span>
                <span>{starsGot}/{starsTotal}</span>
              </span>
              <span aria-hidden="true" className="opacity-35">·</span>
              <span className="flex items-center gap-0.5 sm:gap-1" title="Sea Pearls Collected">
                <span>🐚</span>
                <span>{pearlsGot}/{pearlsTotal}</span>
              </span>
              {(isSky || feathersGot > 0) && (
                <>
                  <span aria-hidden="true" className="opacity-35">·</span>
                  <span className="flex items-center gap-0.5 sm:gap-1" title="Cloud Feathers">
                    <span>🪶</span>
                    <span>{feathersGot}/{feathersTotal}</span>
                  </span>
                </>
              )}
              <span aria-hidden="true" className="opacity-35">·</span>
              <span className="flex items-center gap-0.5 sm:gap-1 text-[#d9841c] dark:text-[#ffd23f]" title="Island Coins">
                <span>🪙</span>
                <span>{coins}</span>
              </span>
              <span aria-hidden="true" className="opacity-35">·</span>
              <span className="flex items-center gap-0.5 sm:gap-1 text-[#e84b86] dark:text-[#ff85b3]" title="Heart Friendships">
                <span>❤</span>
                <span>{heartsGot}/{heartsTotal}{skyHeartsGot ? ` (☁${skyHeartsGot})` : ''}</span>
              </span>
            </div>
          )}

          {/* Vitals Bars (Inline on Compact Landscape Phones, Stacked on Larger Landscape Screens) */}
          {isLandscapePhone ? (
            <div className="flex items-center gap-2 pt-0.5">
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <span className="text-[9px] font-black opacity-75">⚡</span>
                <div className="flex-1 h-1.5 rounded-full bg-[#ecdbe6] dark:bg-[#191124] overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-[#7bd88f] to-[#4ebd68] rounded-full transition-all duration-100"
                    style={{ width: `${stamina}%` }}
                  />
                </div>
              </div>
              {(isDiving || air < 100) && (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <span className="text-[9px] font-black text-[#2b8be0] dark:text-[#7de0ff]">🫧</span>
                  <div className="flex-1 h-1.5 rounded-full bg-[#ecdbe6] dark:bg-[#191124] overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-[#67d4ff] to-[#349ed8] rounded-full transition-all duration-100"
                      style={{ width: `${air}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <span className="text-[9px] font-black text-[#8a5de8] dark:text-[#caaaff]">✨</span>
                <div className="flex-1 h-1.5 rounded-full bg-[#ecdbe6] dark:bg-[#191124] overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-[#c39eff] to-[#876cf7] rounded-full transition-all duration-100"
                    style={{ width: `${mana}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1 sm:space-y-1.5 pt-0.5">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-[9.5px] sm:text-[10px] font-black w-8 sm:w-9 opacity-75 whitespace-nowrap">⚡ ST</span>
                  <div className="flex-1 h-2 sm:h-2.5 rounded-full bg-[#ecdbe6] dark:bg-[#191124] overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-linear-to-r from-[#7bd88f] to-[#4ebd68] rounded-full transition-all duration-100 relative"
                      style={{ width: `${stamina}%` }}
                    >
                      <div className="absolute inset-x-0 top-0 h-[35%] bg-white/35 rounded-full" />
                    </div>
                  </div>
                </div>

                {(isDiving || air < 100) && (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-[9.5px] sm:text-[10px] font-black w-8 sm:w-9 text-[#2b8be0] dark:text-[#7de0ff] whitespace-nowrap">🫧 O₂</span>
                    <div className="flex-1 h-2 sm:h-2.5 rounded-full bg-[#ecdbe6] dark:bg-[#191124] overflow-hidden shadow-inner">
                      <div
                        className="h-full bg-linear-to-r from-[#67d4ff] to-[#349ed8] rounded-full transition-all duration-100 relative"
                        style={{ width: `${air}%` }}
                      >
                        <div className="absolute inset-x-0 top-0 h-[35%] bg-white/35 rounded-full" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-[9.5px] sm:text-[10px] font-black w-8 sm:w-9 text-[#8a5de8] dark:text-[#caaaff] whitespace-nowrap">✨ MP</span>
                  <div className="flex-1 h-2 sm:h-2.5 rounded-full bg-[#ecdbe6] dark:bg-[#191124] overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-linear-to-r from-[#c39eff] to-[#876cf7] rounded-full transition-all duration-100 relative"
                      style={{ width: `${mana}%` }}
                    >
                      <div className="absolute inset-x-0 top-0 h-[35%] bg-white/35 rounded-full" />
                    </div>
                  </div>
                </div>

                {isSwimming && !isDiving && (
                  <div className="flex items-center justify-between gap-2 px-2 py-0.5 rounded-lg bg-[#67d4ff]/20 border border-[#52c4eb]/45 text-[10px] font-extrabold text-[#165e88] dark:text-[#9ef0ff]">
                    <span>🏊 Swimming</span>
                    <span className="opacity-80">Shift: Freestyle · F: Dive · Space: Leap</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        )}

        {/* Persistent Quest Tracker Overlay */}
        {(() => {
          const qt: QuestTrackerData = questTracker ?? {
            chapterNum: currentChapter,
            chapterTitle: `Chapter ${currentChapter}`,
            actLabel: 'Story Objective',
            objective: objectiveText,
            locationHint: biomeName,
            progressCurrent: questsDone,
            progressTarget: Math.max(1, questsTotal),
            progressUnit: 'Quests',
          };
          const safeTarget = Math.max(1, qt.progressTarget);
          const clampedProgress = Math.max(0, Math.min(safeTarget, qt.progressCurrent));
          const progressPct = Math.round((clampedProgress / safeTarget) * 100);

          if (trackerCollapsed) {
            return (
              <div className="storybook-panel border border-[#ffd3e2] dark:border-[#6b4a7a] rounded-2xl px-2.5 py-1 flex items-center justify-between gap-2 text-[#4a3550] dark:text-[#fdeeff]">
                <button
                  type="button"
                  {...multiTouchTap(() => setTrackerCollapsed(false))}
                  title="Expand Quest Tracker"
                  className="flex items-center gap-1.5 min-w-0 flex-1 text-left touch-none cursor-pointer group"
                >
                  <span className="text-xs shrink-0">{qt.everlightMode ? '✨' : '🧭'}</span>
                  <span className="text-[10.5px] font-black tracking-tight text-[#d94d80] dark:text-[#ff94ba] shrink-0">
                    {qt.everlightMode ? 'Everlight' : `Ch. ${qt.chapterNum}`}
                  </span>
                  <span className="text-[10.5px] font-bold truncate opacity-90 group-hover:text-[#d94d80] dark:group-hover:text-[#ff94ba]">
                    {qt.chapterTitle}
                  </span>
                  <span className="text-[10px] font-black opacity-75 shrink-0 tabular-nums">
                    ({clampedProgress}/{safeTarget})
                  </span>
                  <span className="text-[10px] opacity-65 shrink-0">▾</span>
                </button>
                <button
                  type="button"
                  {...multiTouchTap(onOpenJournal)}
                  title="Open Story Journal"
                  className="text-[10px] font-black px-1.5 py-0.5 rounded-lg touch-none bg-[#ffd3e2]/45 dark:bg-[#5a3a6b]/55 hover:bg-[#ff7aa8]/30 cursor-pointer shrink-0"
                >
                  📖
                </button>
              </div>
            );
          }

          return (
            <div
              aria-label="Quest Tracker"
              className={`storybook-panel border border-[#ffd3e2] dark:border-[#6b4a7a] rounded-2xl text-[#4a3550] dark:text-[#fdeeff] ${
                isLandscapePhone ? 'px-2.5 py-1.5 space-y-1' : 'p-2 sm:p-2.5 space-y-1.5'
              }`}
            >
              {/* Tracker Header: Chapter, Title & Controls */}
              <div className="flex items-center justify-between gap-1.5 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    aria-hidden="true"
                    className="w-5 h-5 rounded-lg bg-linear-to-br from-[#ff8bb3]/30 to-[#ffd23f]/35 border border-[#ff8bb3]/50 flex items-center justify-center text-[11px] shrink-0"
                  >
                    {qt.everlightMode ? '✨' : '🧭'}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider text-[#d94d80] dark:text-[#ff94ba] shrink-0">
                        {qt.everlightMode ? 'Everlight' : `Ch. ${qt.chapterNum}`}
                      </span>
                      <span aria-hidden="true" className="opacity-35 text-[10px]">·</span>
                      <span className="text-[11px] sm:text-xs font-black font-display truncate text-[var(--fg)]">
                        {qt.chapterTitle}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {onOpenAchievements && (
                    <button
                      type="button"
                      {...multiTouchTap(onOpenAchievements)}
                      title="View Achievements & Milestones"
                      className="px-1.5 py-0.5 rounded-lg touch-none bg-[#ffd23f]/25 hover:bg-[#ffd23f]/45 text-[9.5px] sm:text-[10px] font-black text-[#9b6200] dark:text-[#ffd23f] flex items-center gap-0.5 cursor-pointer transition-colors tabular-nums"
                    >
                      <span>🏆</span>
                      <span>{achievementsUnlocked}/{achievementsTotal}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    {...multiTouchTap(onOpenJournal)}
                    title="Open Story Journal & Full Chapters"
                    className="px-1.5 py-0.5 rounded-lg touch-none bg-[#ffd3e2]/45 dark:bg-[#5a3a6b]/55 hover:bg-[#ff7aa8]/30 text-[10px] font-black text-[#d94d80] dark:text-[#ff94ba] flex items-center gap-0.5 cursor-pointer transition-colors"
                  >
                    <span>📖</span>
                    {!isTouch && <span className="opacity-80">J</span>}
                  </button>
                  <button
                    type="button"
                    {...multiTouchTap(() => setTrackerCollapsed(true))}
                    title="Minimize Quest Tracker"
                    aria-label="Minimize Quest Tracker"
                    className="w-5 h-5 touch-none rounded-full bg-[#4a3550]/10 dark:bg-white/15 hover:bg-[#ff7aa8] hover:text-white text-[10px] font-black flex items-center justify-center cursor-pointer transition-colors shrink-0"
                  >
                    —
                  </button>
                </div>
              </div>

              {/* Active Chapter Objective */}
              <div
                {...multiTouchTap(onOpenJournal)}
                title="Tap to open full Story Journal"
                className="cursor-pointer touch-none group space-y-1"
              >
                <p
                  className={`font-bold leading-snug text-[var(--fg)]/95 group-hover:text-[#d94d80] dark:group-hover:text-[#ff94ba] transition-colors ${
                    isLandscapePhone ? 'text-[10.5px] line-clamp-2' : 'text-[11px] sm:text-[11.5px]'
                  }`}
                >
                  {qt.objective}
                </p>

                {/* Location Cue + Chapter Progress Counter */}
                <div className="flex items-center justify-between gap-2 text-[9.5px] sm:text-[10px] font-extrabold">
                  <span className="text-[var(--fg)]/70 truncate flex items-center gap-1 min-w-0">
                    <span className="shrink-0">🗺️</span>
                    <span className="truncate">{qt.locationHint}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-[#d94d80] dark:text-[#ff94ba]">
                    {clampedProgress}/{safeTarget} {qt.progressUnit}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 rounded-full bg-[#ecdbe6] dark:bg-[#191124] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-[#ff7aa8] via-[#ffb36b] to-[#ffd23f] transition-all duration-300"
                    style={{ width: `${Math.max(progressPct, clampedProgress > 0 ? 8 : 0)}%` }}
                  />
                </div>
              </div>

              {/* Active Side Quest / Sub-goal Callout */}
              {qt.activeSideQuest && (
                <div
                  {...multiTouchTap(onOpenJournal)}
                  className={`rounded-xl px-2 py-1 border touch-none cursor-pointer transition-colors ${
                    qt.activeSideQuest.ready
                      ? 'bg-[#e9fbef]/85 dark:bg-[#1f3d2d]/75 border-[#6ad492]/70 dark:border-[#4fa870]/70'
                      : 'bg-[#fff3f8]/75 dark:bg-[#3a2548]/65 border-[#ffd3e2]/80 dark:border-[#6b4a7a]/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 text-[10px] font-black">
                    <span className="truncate flex items-center gap-1 min-w-0">
                      <span className="shrink-0">{qt.activeSideQuest.ready ? '✅' : '🌼'}</span>
                      <span className="truncate">{qt.activeSideQuest.title}</span>
                    </span>
                    <span className="shrink-0 tabular-nums opacity-85">
                      {qt.activeSideQuest.current}/{qt.activeSideQuest.target}
                    </span>
                  </div>
                  <p className="text-[9.5px] font-bold opacity-80 truncate mt-0.5">
                    {qt.activeSideQuest.detail}
                  </p>
                </div>
              )}

              {canSingDawnDuet && onSingDawnDuet && (
                <button
                  type="button"
                  {...multiTouchTap(onSingDawnDuet)}
                  className="w-full py-1 px-2 rounded-xl touch-none border border-[#ffd23f] bg-linear-to-r from-[#ffd23f] via-[#ff9f43] to-[#ff7aa8] text-[#3b2a45] text-[10.5px] font-black shadow-sm hover:brightness-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>🎶</span>
                  <span>Sing the Dawn Duet!</span>
                </button>
              )}
            </div>
          );
        })()}
      </div>

      {/* Top Right: Minimap & Responsive Quick Action Menu Dock */}
      <div className="absolute right-2 sm:right-3 top-2 sm:top-3 pt-safe pr-safe flex flex-col items-end gap-1.5 sm:gap-2 pointer-events-auto">
        {/* Minimap Card with Collapse Toggle */}
        <div className="relative group flex items-center gap-1.5">
          {minimapCollapsed ? (
            <div className="storybook-panel border border-[#ffd3e2] dark:border-[#6b4a7a] rounded-xl p-0.5 flex items-center gap-0.5 shadow-xs">
              <button
                type="button"
                {...multiTouchTap(() => setMinimapCollapsed(false))}
                title="Show Minimap"
                className="px-2 h-8 touch-none rounded-lg hover:bg-[#ffd3e2]/55 dark:hover:bg-[#5a3a6b]/60 text-[11px] font-black text-[#4a3550] dark:text-[#fdeeff] flex items-center gap-1 cursor-pointer"
              >
                <span>🧭</span>
                <span className="hidden xs:inline">Radar</span>
              </button>
              <button
                type="button"
                {...multiTouchTap(onOpenMap)}
                title="Open Full World Atlas (Key M)"
                aria-label="Open Full World Atlas"
                className="w-8 h-8 touch-none rounded-lg hover:bg-[#ffd3e2]/55 dark:hover:bg-[#5a3a6b]/60 text-[#4a3550] dark:text-[#fdeeff] flex items-center justify-center cursor-pointer"
              >
                🗺️
              </button>
            </div>
          ) : (
            <div className="relative">
              <div
                {...multiTouchTap(onOpenMap)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenMap();
                  }
                }}
                aria-label="Open Full World Atlas"
                title="Tap to open full World Atlas (Key M)"
                className="cursor-pointer touch-none relative overflow-hidden rounded-2xl group transition-transform active:scale-95 shadow-[0_10px_24px_-6px_rgba(35,20,55,0.45)]"
              >
                <canvas
                  ref={minimapRef}
                  width={128}
                  height={128}
                  className={`rounded-2xl border-2 border-[#fffaf2]/90 dark:border-[#8e6bb5]/90 ring-1 ring-[#ff7aa8]/45 bg-[#271d31] transition-all duration-200 group-hover:border-[#ffd23f] ${
                    isLandscapePhone
                      ? 'w-16 h-16'
                      : isPhone
                      ? 'w-[72px] h-[72px]'
                      : isTablet
                      ? 'w-24 h-24'
                      : 'w-28 h-28'
                  }`}
                />
                <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-black tracking-widest bg-[#271d31]/75 text-[#ffd23f] px-1 rounded pointer-events-none">
                  N
                </span>
                <span className="absolute bottom-1 right-1 text-[8.5px] sm:text-[9px] font-black bg-[#271d31]/80 text-white px-1 sm:px-1.5 py-0.5 rounded-md pointer-events-none opacity-85 group-hover:opacity-100 flex items-center gap-0.5 shadow-xs whitespace-nowrap">
                  <span>🗺️</span>
                  <span className="hidden sm:inline">Map</span>
                </span>
              </div>
              <button
                type="button"
                {...multiTouchTap(() => setMinimapCollapsed(true))}
                title="Minimize radar"
                aria-label="Minimize minimap"
                className="absolute left-0.5 top-0.5 z-10 w-5 h-5 touch-none rounded-full bg-[#271d31]/85 text-white text-[10px] font-black flex items-center justify-center hover:bg-[#ff7aa8] cursor-pointer"
              >
                —
              </button>
            </div>
          )}
        </div>

        {/* Streamlined Utility Dock (Non-Redundant Live Controls Only: Camera, Audio, Gazette, Menu) */}
        <div className="storybook-panel border border-[#ffd3e2] dark:border-[#6b4a7a] rounded-2xl p-1 flex items-center gap-0.5 sm:gap-1 select-none">
          {is3D && (onSelectCameraPreset || onCycleCamera) && (
            <div className="relative">
              <button
                type="button"
                {...multiTouchTap(() => {
                  if (onSelectCameraPreset) setCamMenuOpen((prev) => !prev);
                  else onCycleCamera?.();
                })}
                title={`Camera: ${cameraPresetLabel} (Choose 1st/3rd Person or Key V)`}
                className="h-9 sm:h-10 px-2 touch-none rounded-xl hover:bg-[#ffd3e2]/55 dark:hover:bg-[#5a3a6b]/60 text-[#4a3550] dark:text-[#fdeeff] flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 text-[10.5px] font-black"
              >
                <span>{cameraPresetLabel === '1st Person' ? '👁️' : '🎥'}</span>
                <span className="hidden md:inline">{camShortBadge}</span>
                <span className="text-[9px] opacity-65">▾</span>
              </button>
              {camMenuOpen && onSelectCameraPreset && (
                <div className="absolute right-0 top-full mt-1.5 w-48 storybook-panel border border-[#ffd3e2] dark:border-[#6b4a7a] rounded-2xl p-1.5 shadow-xl z-50 flex flex-col gap-0.5">
                  <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wide opacity-65">
                    Camera View (Key V)
                  </div>
                  {[
                    { idx: 0, icon: '🎥', label: 'Cozy 3/4' },
                    { idx: 1, icon: '🔍', label: 'Close Up' },
                    { idx: 2, icon: '🏔️', label: 'Scenic Vista' },
                    { idx: 3, icon: '👁️', label: '1st Person' },
                    { idx: 4, icon: '🚶', label: '3rd Person (Forward)' },
                    { idx: 5, icon: '🔄', label: '3rd Person (Backward)' },
                  ].map((opt) => {
                    const active = cameraPresetIdx === opt.idx;
                    return (
                      <button
                        key={opt.idx}
                        type="button"
                        {...multiTouchTap(() => {
                          onSelectCameraPreset(opt.idx);
                          setCamMenuOpen(false);
                        })}
                        className={`w-full px-2.5 py-1.5 touch-none rounded-xl text-left text-[11px] font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                          active
                            ? 'bg-[#ff7aa8] text-white shadow-xs'
                            : 'hover:bg-[#ffd3e2]/55 dark:hover:bg-[#5a3a6b]/60 text-[#4a3550] dark:text-[#fdeeff]'
                        }`}
                      >
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            {...multiTouchTap(onToggleMusic)}
            title="Cycle Music Track / Mute (Key N)"
            aria-label="Cycle Music Track"
            className={`${dockBtnSize} touch-none rounded-xl hover:bg-[#ffd3e2]/55 dark:hover:bg-[#5a3a6b]/60 text-[#4a3550] dark:text-[#fdeeff] flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95`}
          >
            {musicIcon}
          </button>
          {renderGazetteButton(dockBtnSize)}
          <button
            type="button"
            {...multiTouchTap(onOpenPause)}
            title="Game Menu, Tools & Settings (Esc)"
            aria-label="Open Game Menu and Tools"
            className={`${dockBtnSize} touch-none rounded-xl bg-linear-to-b from-[#ff8bb3] to-[#f05c93] hover:brightness-105 text-white flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]`}
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Bottom Center: Enchanted Magic Spells Bar (Hidden on phones where TouchControls provides Quick Spell Tray; sized safely on tablets & desktops) */}
      {spellsCollapsed ? (
        <button
          type="button"
          {...multiTouchTap(() => setSpellsCollapsed(false))}
          title="Restore Magic Spells Bar"
          aria-label="Restore Magic Spells Bar"
          className={`fixed left-1/2 -translate-x-1/2 items-center gap-1.5 pointer-events-auto touch-none storybook-panel border border-[#ffd3e2] dark:border-[#6b4a7a] rounded-2xl px-3 py-1.5 text-[11px] font-black text-[#4a3550] dark:text-[#fdeeff] hover:border-[#ff7aa8] cursor-pointer transition-colors ${
            isTouch
              ? isPhone
                ? 'hidden'
                : 'hidden sm:flex bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))]'
              : 'flex bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:bottom-[max(1rem,env(safe-area-inset-bottom,0px))]'
          }`}
        >
          <span>✨</span>
          <span>Spells</span>
          {Object.values(activeSpells).some(Boolean) && (
            <span className="w-2 h-2 rounded-full bg-[#ffd23f]" />
          )}
          <span className="text-[10px] opacity-70">▴</span>
        </button>
      ) : (
      <div
        className={`fixed left-1/2 -translate-x-1/2 items-center gap-1 sm:gap-1.5 pointer-events-auto storybook-panel border border-[#ffd3e2] dark:border-[#6b4a7a] rounded-full p-1 sm:p-1.5 overflow-x-auto scrollbar-none ${
          isTouch
            ? isPhone
              ? 'hidden'
              : 'hidden sm:flex bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] max-w-[calc(100vw-24rem)] lg:max-w-fit'
            : 'flex bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:bottom-[max(1rem,env(safe-area-inset-bottom,0px))] max-w-[calc(100vw-18.5rem)] md:max-w-[calc(100vw-21rem)] lg:max-w-fit'
        }`}
      >
        {MAGIC_SPELLS.map((spell, idx) => {
          const isLocked = currentChapter < spell.unlockChapter;
          const notEnoughMana = mana < spell.cost;
          const isActive = Boolean(activeSpells[spell.id]);
          const isTeleport = spell.id === 'teleport';
          const activeSeason = normalizeSeasonId(season);
          const variant = getSeasonalSpellVariant(spell.id, activeSeason);
          const keyLabel = isTeleport
            ? 'T'
            : idx === 9
            ? '0'
            : idx === 10
            ? '-'
            : idx === 11
            ? '='
            : String(idx + 1);
          const spellTooltip = variant
            ? `${variant.seasonBadge} ${variant.variantName} (${spell.name}, Key ${keyLabel}, ${spell.cost} MP) — ${variant.bonusSummary}`
            : `${spell.name} (Key ${keyLabel}, ${spell.cost} MP) - ${spell.desc}`;
          return (
            <button
              key={spell.name}
              type="button"
              {...multiTouchTap(() => onCastSpell(idx), { disabled: isLocked })}
              title={spellTooltip}
              disabled={isLocked}
              style={
                isActive && variant
                  ? {
                      boxShadow: `0 0 12px ${variant.ringColor}cc`,
                      borderColor: variant.ringColor,
                    }
                  : undefined
              }
              className={`relative w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 touch-none rounded-full flex items-center justify-center text-base sm:text-lg lg:text-xl transition-all cursor-pointer shrink-0 border border-transparent ${
                isTeleport ? 'ml-0.5 ring-1 ring-[#7de0ff]/60' : ''
              } ${
                isLocked
                  ? 'opacity-30 grayscale cursor-not-allowed'
                  : isActive
                  ? 'bg-linear-to-br from-[#ffe57a]/75 to-[#ff9ec4]/55 ring-2 scale-105'
                  : notEnoughMana
                  ? 'opacity-55 hover:scale-105'
                  : 'hover:scale-110 active:scale-95 hover:bg-[#ffd3e2]/45 dark:hover:bg-[#5a3a6b]/55'
              }`}
            >
              <span>{spell.icon}</span>
              {!isLocked && variant && (
                <span
                  aria-hidden="true"
                  className="absolute left-0.5 top-0.5 w-1.5 h-1.5 rounded-full ring-1 ring-white/80 dark:ring-[#271d31]/80"
                  style={{ backgroundColor: variant.ringColor }}
                />
              )}
              {!isTouch && (
                <span className="absolute right-0.5 bottom-0 text-[7px] sm:text-[8px] font-black opacity-80 bg-[#fffaf2]/80 dark:bg-[#271d31]/80 px-0.5 rounded">
                  {keyLabel}
                </span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          {...multiTouchTap(() => setSpellsCollapsed(true))}
          title="Minimize Spells Bar"
          aria-label="Minimize Magic Spells Bar"
          className="w-6 h-8 sm:h-9 touch-none rounded-full bg-[#4a3550]/10 dark:bg-white/15 hover:bg-[#ff7aa8] hover:text-white text-[10px] font-black flex items-center justify-center cursor-pointer transition-colors shrink-0 ml-0.5"
        >
          —
        </button>
      </div>
      )}

      {/* Desktop Contextual Prompts (Only appear near NPCs, water, fishing spots, or portals; no permanent Jump/Dash thumb buttons) */}
      {!isTouch && (
        <>
          {nearNpc && (
            <button
              onClick={onTalk}
              className="absolute left-4 bottom-[max(1rem,env(safe-area-inset-bottom,0px))] pointer-events-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-linear-to-b from-[#ffe26a] to-[#f4b932] border-2 border-[#fff3b8] text-[#4a3550] font-black text-2xl flex items-center justify-center shadow-[0_8px_20px_rgba(180,120,20,0.45)] active:scale-95 transition-transform cursor-pointer"
              title="Talk (Key E)"
            >
              💬
            </button>
          )}

          {nearbyTownAction && onTownInteract && !nearNpc && (
            <button
              onClick={onTownInteract}
              className="absolute left-4 bottom-[max(1rem,env(safe-area-inset-bottom,0px))] pointer-events-auto px-4 h-14 sm:h-16 rounded-full bg-linear-to-b from-[#ff96ba] to-[#f05c93] border-2 border-[#ffe2ee] text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-[0_8px_20px_rgba(180,45,100,0.45)] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              title={`${nearbyTownAction.label} (Key E)`}
            >
              <span className="text-xl">{nearbyTownAction.icon}</span>
              <span className="hidden sm:inline whitespace-nowrap">[E] {nearbyTownAction.label}</span>
            </button>
          )}

          {canFish && (
            <button
              onClick={onFish}
              className={`absolute ${
                nearNpc ? 'left-20' : nearbyTownAction ? 'left-44' : 'left-4'
              } bottom-[max(1rem,env(safe-area-inset-bottom,0px))] pointer-events-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-linear-to-b from-[#9ee0ff] to-[#4fa8f0] border-2 border-[#d4f2ff] text-[#1d344f] font-black text-2xl flex items-center justify-center shadow-[0_8px_20px_rgba(40,110,180,0.4)] hover:scale-105 active:scale-95 transition-transform cursor-pointer`}
              title="Fish (Key R)"
            >
              🎣
            </button>
          )}

          {nearbyPortal && onUsePortal && (
            <button
              onClick={onUsePortal}
              className="absolute right-4 bottom-[max(1rem,env(safe-area-inset-bottom,0px))] pointer-events-auto px-3.5 h-14 sm:h-16 rounded-full border-2 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-[0_8px_20px_rgba(80,45,140,0.45)] hover:scale-105 active:scale-95 transition-transform cursor-pointer bg-linear-to-b from-[#9b6bff] to-[#6a3fd9] border-[#e8dcff] text-white"
              title={`${nearbyPortal.label} (Key F)`}
            >
              <span className="text-xl">{nearbyPortal.icon}</span>
              <span className="hidden sm:inline whitespace-nowrap">{nearbyPortal.label}</span>
            </button>
          )}

          {canDive && !nearbyPortal && !isGlowdeep && !isMoonRoad && (
            <button
              onClick={onDive}
              className="absolute right-4 bottom-[max(1rem,env(safe-area-inset-bottom,0px))] pointer-events-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-linear-to-b from-[#8cebff] to-[#3eb8c2] border-2 border-[#d8fbff] text-[#153b45] font-black text-2xl flex items-center justify-center shadow-[0_8px_20px_rgba(30,130,150,0.4)] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              title={isDiving ? 'Surface (Key F)' : isSky ? 'Land via Cloud Wings' : isSwimming ? 'Dive Underwater (Key F)' : 'Dive in Water (Key F)'}
            >
              {isDiving ? '🌊' : isSky ? '☁️' : '🤿'}
            </button>
          )}
        </>
      )}
    </div>
  );
});
