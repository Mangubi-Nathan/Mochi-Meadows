/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MAGIC_SPELLS } from '../game/constants';

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
  onDash: () => void;
  onToggleMusic: () => void;
  onOpenMap: () => void;
  onOpenWardrobe: () => void;
  onOpenJournal: () => void;
  onOpenPause: () => void;
  onOpenBottles: () => void;
  onOpenGazette: () => void;
  onOpenSongWeaver?: () => void;
  onOpenCottage?: () => void;
  musicIcon: string;
  hasCustomMusic: boolean;
  weather?: {
    id: string;
    name: string;
    icon: string;
    description: string;
  };
  onCycleWeather?: () => void;
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
  onDash,
  onToggleMusic,
  onOpenMap,
  onOpenWardrobe,
  onOpenJournal,
  onOpenPause,
  onOpenBottles,
  onOpenGazette,
  onOpenSongWeaver,
  onOpenCottage,
  musicIcon,
  weather,
  onCycleWeather,
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
}) => {
  // Collapse minimap automatically on landscape phones to keep center viewport open
  const [minimapCollapsed, setMinimapCollapsed] = useState(() => isLandscapePhone);
  const [dockExpanded, setDockExpanded] = useState(false);

  useEffect(() => {
    setMinimapCollapsed(isLandscapePhone);
  }, [isLandscapePhone]);

  const compactDockMode = isPhone || isLandscapePhone;

  const renderGazetteButton = (sizeClass: string) => (
    <button
      onClick={onOpenGazette}
      title={hasNewGazette ? 'Meadows Gazette — Fresh Edition Available!' : 'Island Gazette Newspaper'}
      aria-label={hasNewGazette ? 'Open Meadows Gazette (New edition available)' : 'Open Meadows Gazette'}
      className={`relative ${sizeClass} rounded-xl flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0 ${
        hasNewGazette
          ? 'bg-[#fff2f7] dark:bg-[#492c54] ring-2 ring-[#ff7aa8]/75 shadow-[0_0_12px_rgba(255,122,168,0.55)] text-[#4a3550] dark:text-[#fdeeff]'
          : 'hover:bg-[#ffd3e2]/55 dark:hover:bg-[#5a3a6b]/60 text-[#4a3550] dark:text-[#fdeeff]'
      }`}
    >
      <span>📰</span>
      {hasNewGazette && (
        <span className="pointer-events-none absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4">
          <span className="absolute inset-0 rounded-full bg-[#ff7aa8]/65 animate-ping" />
          <svg
            viewBox="0 0 24 24"
            className="relative w-3.5 h-3.5 drop-shadow-[0_0_5px_rgba(255,210,63,0.95)] animate-pulse"
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
        <div
          className={`storybook-panel border border-[#ffd3e2] dark:border-[#6b4a7a] rounded-2xl text-[#4a3550] dark:text-[#fdeeff] ${
            isLandscapePhone ? 'px-2.5 py-1.5 flex flex-col gap-1' : 'p-2 sm:p-3 flex flex-col gap-1.5 sm:gap-2'
          }`}
        >
          {/* Header Row: Location & Weather */}
          <div className="flex items-center justify-between gap-1.5 min-w-0">
            <span className="text-xs font-black truncate flex items-center gap-1 text-[#ff7aa8] min-w-0">
              <span className="text-xs sm:text-sm shrink-0">📍</span>
              <span
                className={`font-display tracking-tight text-[#4a3550] dark:text-[#fdeeff] truncate ${
                  isLandscapePhone ? 'text-xs' : 'text-xs sm:text-sm'
                }`}
              >
                {biomeName}
              </span>
            </span>

            {weather && (
              <button
                onClick={onCycleWeather}
                title={`${weather.name}: ${weather.description} (Tap to preview/change weather)`}
                className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-[#ffd3e2]/45 dark:bg-[#5a3a6b]/50 hover:bg-[#ffd3e2] dark:hover:bg-[#724a88] text-[#4a3550] dark:text-[#fdeeff] text-[10px] sm:text-[11px] font-extrabold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0 whitespace-nowrap"
              >
                <span>{weather.icon}</span>
                <span className={isLandscapePhone || isPhone ? 'hidden md:inline' : 'hidden sm:inline'}>
                  {weather.name}
                </span>
              </button>
            )}
          </div>

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

          {/* Vitals Bars (Inline 2-col on Landscape Phone to minimize height, stacked on Portrait & Desktop) */}
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
              <button
                onClick={onOpenJournal}
                title={objectiveText}
                className="text-[10px] font-black text-[#d94d80] dark:text-[#ff94ba] shrink-0 px-1 cursor-pointer"
              >
                📖 {questsDone}/{questsTotal}
              </button>
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
              </div>

              {/* Interactive Objective Bar */}
              <div
                onClick={onOpenJournal}
                title="Click to open Quest Journal"
                className="w-full pt-1 sm:pt-1.5 border-t border-[#ffd3e2]/70 dark:border-[#6b4a7a]/60 text-[10.5px] sm:text-[11px] font-extrabold flex items-center justify-between gap-1 text-[#d94d80] dark:text-[#ff94ba] hover:text-[#ff6b6b] transition-colors cursor-pointer group truncate"
              >
                <span className="truncate flex-1 group-hover:translate-x-0.5 transition-transform">
                  {objectiveText}
                </span>
                <span className="text-[9.5px] sm:text-[10px] opacity-80 shrink-0 whitespace-nowrap">📖 {isTouch ? '' : 'J'}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top Right: Minimap & Responsive Quick Action Menu Dock */}
      <div className="absolute right-2 sm:right-3 top-2 sm:top-3 pt-safe pr-safe flex flex-col items-end gap-1.5 sm:gap-2 pointer-events-auto">
        {/* Minimap Card with Collapse Toggle */}
        <div className="relative group flex items-center gap-1.5">
          {minimapCollapsed ? (
            <button
              onClick={() => setMinimapCollapsed(false)}
              title="Show Minimap"
              className="px-2.5 h-8 rounded-xl storybook-panel border border-[#ffd3e2] dark:border-[#6b4a7a] text-[11px] font-black text-[#4a3550] dark:text-[#fdeeff] flex items-center gap-1 cursor-pointer shadow-xs hover:border-[#ff7aa8]"
            >
              <span>🧭</span>
              <span className="hidden xs:inline">Radar</span>
            </button>
          ) : (
            <div
              onClick={onOpenMap}
              title="Tap to open full World Atlas (Key M)"
              className="cursor-pointer relative overflow-hidden rounded-2xl group transition-transform active:scale-95 shadow-[0_10px_24px_-6px_rgba(35,20,55,0.45)]"
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
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMinimapCollapsed(true);
                }}
                title="Minimize radar"
                aria-label="Minimize minimap"
                className="absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-[#271d31]/75 text-white text-[10px] font-black flex items-center justify-center hover:bg-[#ff7aa8] cursor-pointer"
              >
                —
              </button>
            </div>
          )}
        </div>

        {/* Floating Quick Action Menu Dock */}
        {compactDockMode ? (
          <div className="flex flex-col items-end gap-1">
            {/* Always-Visible Primary Row: Map, Gazette (with glowing flower badge!), Cottage/Journal expand, Pause */}
            <div className="storybook-panel border border-[#ffd3e2] dark:border-[#6b4a7a] rounded-2xl p-1 flex items-center gap-0.5 select-none">
              <button
                onClick={onOpenMap}
                title="World Atlas"
                className={`${dockBtnSize} rounded-xl hover:bg-[#ffd3e2]/55 dark:hover:bg-[#5a3a6b]/60 text-[#4a3550] dark:text-[#fdeeff] flex items-center justify-center cursor-pointer transition-all active:scale-95`}
              >
                🗺️
              </button>
              {renderGazetteButton(dockBtnSize)}
              <button
                onClick={onOpenJournal}
                title="Story Journal & Quests"
                className={`relative ${dockBtnSize} rounded-xl hover:bg-[#ffd3e2]/55 dark:hover:bg-[#5a3a6b]/60 text-[#4a3550] dark:text-[#fdeeff] flex items-center justify-center cursor-pointer transition-all active:scale-95`}
              >
                <span>📖</span>
                {questsDone < questsTotal && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ff7aa8] ring-2 ring-white dark:ring-[#271d31]" />
                )}
              </button>
              <button
                onClick={() => setDockExpanded((v) => !v)}
                title={dockExpanded ? 'Hide extra shortcuts' : 'More shortcuts (Home, Wardrobe, Music, Song Weaver, Bottles)'}
                aria-label="Toggle extra HUD shortcuts"
                className={`${dockBtnSize} rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 font-black text-xs ${
                  dockExpanded
                    ? 'bg-[#ff7aa8]/25 text-[#d9487d] dark:text-[#ff9ec0]'
                    : 'hover:bg-[#ffd3e2]/55 dark:hover:bg-[#5a3a6b]/60 text-[#4a3550] dark:text-[#fdeeff]'
                }`}
              >
                {dockExpanded ? '▴' : '⋯'}
              </button>
              <button
                onClick={onOpenPause}
                title="Menu & Settings"
                className={`${dockBtnSize} rounded-xl bg-linear-to-b from-[#ff8bb3] to-[#f05c93] hover:brightness-105 text-white flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]`}
              >
                ⚙️
              </button>
            </div>

            {/* Expandable Secondary Shortcuts Tray on Phone / Landscape Phone */}
            {dockExpanded && (
              <div className="storybook-panel border border-[#ffd3e2] dark:border-[#6b4a7a] rounded-2xl p-1 flex items-center gap-0.5 select-none animate-in fade-in slide-in-from-top-1 duration-150">
                {onOpenCottage && (
                  <button
                    onClick={() => {
                      setDockExpanded(false);
                      onOpenCottage();
                    }}
                    title="Cozy Home & Hamlet"
                    className={`${dockBtnSize} rounded-xl hover:bg-[#ffd3e2]/55 dark:hover:bg-[#5a3a6b]/60 text-[#4a3550] dark:text-[#fdeeff] flex items-center justify-center cursor-pointer active:scale-95`}
                  >
                    🏡
                  </button>
                )}
                <button
                  onClick={() => {
                    setDockExpanded(false);
                    onOpenWardrobe();
                  }}
                  title="Wardrobe & Look"
                  className={`${dockBtnSize} rounded-xl hover:bg-[#ffd3e2]/55 dark:hover:bg-[#5a3a6b]/60 text-[#4a3550] dark:text-[#fdeeff] flex items-center justify-center cursor-pointer active:scale-95`}
                >
                  👗
                </button>
                {onOpenSongWeaver && (
                  <button
                    onClick={() => {
                      setDockExpanded(false);
                      onOpenSongWeaver();
                    }}
                    title="Song Weaver Composer"
                    className={`${dockBtnSize} rounded-xl hover:bg-[#ffd3e2]/55 dark:hover:bg-[#5a3a6b]/60 text-[#4a3550] dark:text-[#fdeeff] flex items-center justify-center cursor-pointer active:scale-95`}
                  >
                    🎼
                  </button>
                )}
                <button
                  onClick={() => {
                    setDockExpanded(false);
                    onOpenBottles();
                  }}
                  title="Messages in a Bottle"
                  className={`${dockBtnSize} rounded-xl hover:bg-[#ffd3e2]/55 dark:hover:bg-[#5a3a6b]/60 text-[#4a3550] dark:text-[#fdeeff] flex items-center justify-center cursor-pointer active:scale-95`}
                >
                  🍾
                </button>
                <button
                  onClick={onToggleMusic}
                  title="Cycle Music Track"
                  className={`${dockBtnSize} rounded-xl hover:bg-[#ffd3e2]/55 dark:hover:bg-[#5a3a6b]/60 text-[#4a3550] dark:text-[#fdeeff] flex items-center justify-center cursor-pointer active:scale-95`}
                >
                  {musicIcon}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Tablet & Desktop Full Action Dock */
          <div className="storybook-panel border border-[#ffd3e2] dark:border-[#6b4a7a] rounded-2xl p-1 flex flex-wrap justify-end items-center gap-0.5 sm:gap-1 max-w-[230px] lg:max-w-none select-none">
            <button
              onClick={onToggleMusic}
              title="Music Track (Key N)"
              className={`${dockBtnSize} rounded-xl hover:bg-[#ffd3e2]/55 dark:hover:bg-[#5a3a6b]/60 text-[#4a3550] dark:text-[#fdeeff] flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95`}
            >
              {musicIcon}
            </button>
            <button
              onClick={onOpenMap}
              title="Full World Map (Key M)"
              className={`${dockBtnSize} rounded-xl hover:bg-[#ffd3e2]/55 dark:hover:bg-[#5a3a6b]/60 text-[#4a3550] dark:text-[#fdeeff] flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95`}
            >
              🗺️
            </button>
            <button
              onClick={onOpenWardrobe}
              title="Wardrobe & Look (Key C)"
              className={`${dockBtnSize} rounded-xl hover:bg-[#ffd3e2]/55 dark:hover:bg-[#5a3a6b]/60 text-[#4a3550] dark:text-[#fdeeff] flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95`}
            >
              👗
            </button>
            <button
              onClick={onOpenJournal}
              title="Story Journal & Quests (Key J)"
              className={`relative ${dockBtnSize} rounded-xl hover:bg-[#ffd3e2]/55 dark:hover:bg-[#5a3a6b]/60 text-[#4a3550] dark:text-[#fdeeff] flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95`}
            >
              <span>📖</span>
              {questsDone < questsTotal && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#ff7aa8] ring-2 ring-white dark:ring-[#271d31]" />
              )}
            </button>
            {onOpenSongWeaver && (
              <button
                onClick={onOpenSongWeaver}
                title="Song Weaver Composer (Key K)"
                className={`${dockBtnSize} rounded-xl hover:bg-[#ffd3e2]/55 dark:hover:bg-[#5a3a6b]/60 text-[#4a3550] dark:text-[#fdeeff] flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95`}
              >
                🎼
              </button>
            )}
            {onOpenCottage && (
              <button
                onClick={onOpenCottage}
                title="Moonlit Cottage & Hamlet (Key H)"
                className={`${dockBtnSize} rounded-xl hover:bg-[#ffd3e2]/55 dark:hover:bg-[#5a3a6b]/60 text-[#4a3550] dark:text-[#fdeeff] flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95`}
              >
                🏡
              </button>
            )}
            <button
              onClick={onOpenBottles}
              title="Messages in a Bottle"
              className={`${dockBtnSize} rounded-xl hover:bg-[#ffd3e2]/55 dark:hover:bg-[#5a3a6b]/60 text-[#4a3550] dark:text-[#fdeeff] flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95`}
            >
              🍾
            </button>
            {renderGazetteButton(dockBtnSize)}
            <button
              onClick={onOpenPause}
              title="Menu & Settings (Esc)"
              className={`${dockBtnSize} rounded-xl bg-linear-to-b from-[#ff8bb3] to-[#f05c93] hover:brightness-105 text-white flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]`}
            >
              ⚙️
            </button>
          </div>
        )}
      </div>

      {/* Bottom Center: Enchanted Magic Spells Bar (Hidden on phones where TouchControls provides Quick Spell Tray; sized safely on tablets & desktops) */}
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
          const keyLabel = isTeleport
            ? 'T'
            : idx === 9
            ? '0'
            : idx === 10
            ? '-'
            : idx === 11
            ? '='
            : String(idx + 1);
          return (
            <button
              key={spell.name}
              onClick={() => onCastSpell(idx)}
              title={`${spell.name} (Key ${keyLabel}, ${spell.cost} MP) - ${spell.desc}`}
              disabled={isLocked}
              className={`relative w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-full flex items-center justify-center text-base sm:text-lg lg:text-xl transition-all cursor-pointer shrink-0 ${
                isTeleport ? 'ml-0.5 ring-1 ring-[#7de0ff]/60' : ''
              } ${
                isLocked
                  ? 'opacity-30 grayscale cursor-not-allowed'
                  : isActive
                  ? 'bg-linear-to-br from-[#ffe57a]/75 to-[#ff9ec4]/55 ring-2 ring-[#ff7aa8] scale-105 shadow-[0_0_12px_rgba(255,210,63,0.65)]'
                  : notEnoughMana
                  ? 'opacity-55 hover:scale-105'
                  : 'hover:scale-110 active:scale-95 hover:bg-[#ffd3e2]/45 dark:hover:bg-[#5a3a6b]/55'
              }`}
            >
              <span>{spell.icon}</span>
              {!isTouch && (
                <span className="absolute right-0.5 bottom-0 text-[7px] sm:text-[8px] font-black opacity-80 bg-[#fffaf2]/80 dark:bg-[#271d31]/80 px-0.5 rounded">
                  {keyLabel}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Desktop Helper Action Buttons (Shown when not in touch controls mode) */}
      {!isTouch && (
        <>
          {/* Talk Button (When near NPC) */}
          {nearNpc && (
            <button
              onClick={onTalk}
              className="absolute left-4 bottom-[max(1rem,env(safe-area-inset-bottom,0px))] pointer-events-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-linear-to-b from-[#ffe26a] to-[#f4b932] border-2 border-[#fff3b8] text-[#4a3550] font-black text-2xl flex items-center justify-center shadow-[0_8px_20px_rgba(180,120,20,0.45)] active:scale-95 transition-transform animate-bounce cursor-pointer"
              title="Talk (Key E)"
            >
              💬
            </button>
          )}

          {/* Fishing Button (When near water) */}
          {canFish && (
            <button
              onClick={onFish}
              className="absolute left-20 bottom-[max(1rem,env(safe-area-inset-bottom,0px))] pointer-events-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-linear-to-b from-[#9ee0ff] to-[#4fa8f0] border-2 border-[#d4f2ff] text-[#1d344f] font-black text-2xl flex items-center justify-center shadow-[0_8px_20px_rgba(40,110,180,0.4)] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              title="Fish (Key R)"
            >
              🎣
            </button>
          )}

          {/* Portal / Entrance Button */}
          {nearbyPortal && onUsePortal && (
            <button
              onClick={onUsePortal}
              className={`absolute right-20 bottom-[max(1rem,env(safe-area-inset-bottom,0px))] pointer-events-auto px-3.5 h-14 sm:h-16 rounded-full border-2 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-[0_8px_20px_rgba(80,45,140,0.45)] hover:scale-105 active:scale-95 transition-transform cursor-pointer animate-pulse ${
                nearbyPortal.locked
                  ? 'bg-linear-to-b from-[#6b5d80] to-[#473c59] border-[#d5c7e8] text-[#fdeeff]'
                  : 'bg-linear-to-b from-[#9b6bff] to-[#6a3fd9] border-[#e8dcff] text-white'
              }`}
              title={`${nearbyPortal.label} (Key F)`}
            >
              <span className="text-xl">{nearbyPortal.icon}</span>
              <span className="hidden sm:inline whitespace-nowrap">{nearbyPortal.label}</span>
            </button>
          )}

          {/* Dive / Surface / Land Button */}
          {canDive && !nearbyPortal && !isGlowdeep && !isMoonRoad && (
            <button
              onClick={onDive}
              className="absolute right-20 bottom-[max(1rem,env(safe-area-inset-bottom,0px))] pointer-events-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-linear-to-b from-[#8cebff] to-[#3eb8c2] border-2 border-[#d8fbff] text-[#153b45] font-black text-2xl flex items-center justify-center shadow-[0_8px_20px_rgba(30,130,150,0.4)] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              title={isDiving ? 'Surface (Key F)' : isSky ? 'Land via Cloud Wings' : 'Dive (Key F)'}
            >
              {isDiving ? '🌊' : isSky ? '☁️' : '🤿'}
            </button>
          )}

          {/* Dash Button */}
          <button
            onClick={onDash}
            className="absolute right-4 bottom-[max(1rem,env(safe-area-inset-bottom,0px))] pointer-events-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-linear-to-b from-[#ff8eb6] to-[#ed588a] border-2 border-[#ffd9e7] text-white font-black text-2xl flex items-center justify-center shadow-[0_8px_20px_rgba(190,50,100,0.45)] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            title="Dash (Spacebar)"
          >
            ⚡
          </button>
        </>
      )}
    </div>
  );
});
