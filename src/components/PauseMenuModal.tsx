/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ACHIEVEMENTS, FISH_SPECIES, MUSIC_TRACKS, WEATHER_TYPES, WeatherId } from '../game/constants';
import { audio } from '../game/audio';
import {
  BackupSlotMeta,
  downloadBackupSlotOfflineFirst,
  listBackupSlotsOfflineFirst,
  uploadBackupSlotOfflineFirst,
} from '../game/offlineStore';
import { PWAInstallButton } from './PWAInstallButton';

interface PauseMenuModalProps {
  completionPercentage: number;
  coins: number;
  starsGot: number;
  starsTotal: number;
  pearlsGot: number;
  pearlsTotal: number;
  feathersGot: number;
  feathersTotal: number;
  ringsGot: number;
  ringsTotal: number;
  questsDone: number;
  questsTotal: number;
  unlockedAchievements: string[];
  fishLog: Record<string, number>;
  onClose: () => void;
  onResume: () => void;
  onSave: () => void;
  onOpenJournal: () => void;
  onOpenWardrobe: () => void;
  onQuitToTitle: () => void;
  settings: {
    vol: number;
    low: number;
    night: number;
    auto: number;
    hints: number;
  };
  onUpdateSettings: (key: string, val: number) => void;
  onExportSave: () => any;
  onImportSave: (data: any) => boolean;
  currentWeatherId?: WeatherId;
  onSelectWeather?: (id: WeatherId) => void;
  initialTab?: 'menu' | 'progress' | 'settings' | 'cloud' | 'help';
  isTitleScreen?: boolean;
  onOpenMap?: () => void;
  onOpenSongWeaver?: () => void;
  onOpenCottage?: () => void;
  currentTrackIndex?: number;
  onSelectTrack?: (idx: number) => void;
}

export const PauseMenuModal: React.FC<PauseMenuModalProps> = ({
  completionPercentage,
  coins,
  starsGot,
  starsTotal,
  pearlsGot,
  pearlsTotal,
  feathersGot,
  feathersTotal,
  ringsGot,
  ringsTotal,
  questsDone,
  questsTotal,
  unlockedAchievements,
  fishLog,
  onClose,
  onResume,
  onSave,
  onOpenJournal,
  onOpenWardrobe,
  onQuitToTitle,
  settings,
  onUpdateSettings,
  onExportSave,
  onImportSave,
  currentWeatherId,
  onSelectWeather,
  initialTab = 'menu',
  isTitleScreen = false,
  onOpenMap,
  onOpenSongWeaver,
  onOpenCottage,
  currentTrackIndex = 0,
  onSelectTrack,
}) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'progress' | 'settings' | 'cloud' | 'help'>(initialTab);
  const [cloudSlots, setCloudSlots] = useState<BackupSlotMeta[]>([]);
  const [cloudStatus, setCloudStatus] = useState<string>('');
  const [isLoadingCloud, setIsLoadingCloud] = useState<boolean>(false);
  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);
  const [downloadingTrackIdx, setDownloadingTrackIdx] = useState<number | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState<boolean>(false);
  const [trackDownloadMsg, setTrackDownloadMsg] = useState<string>('');

  // Sync initialTab if changed
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // Fetch Cloud + Offline Vault Saves
  useEffect(() => {
    if (activeTab === 'cloud') {
      fetchCloudSlots();
    }
  }, [activeTab]);

  const fetchCloudSlots = async () => {
    setIsLoadingCloud(true);
    setCloudStatus('');
    try {
      const { slots, offline } = await listBackupSlotsOfflineFirst();
      setCloudSlots(slots);
      if (offline) {
        setCloudStatus('Offline Vault Active — your backup slots are safely stored on this device and will sync when online!');
      }
    } finally {
      setIsLoadingCloud(false);
    }
  };

  const handleCloudUpload = async (slotName: string) => {
    setIsLoadingCloud(true);
    setCloudStatus('Saving backup slot…');
    try {
      const snapshot = onExportSave();
      const { syncedOnline } = await uploadBackupSlotOfflineFirst(
        slotName,
        snapshot.L?.name || 'Mochi Explorer',
        snapshot
      );
      audio.chime();
      setCloudStatus(
        syncedOnline
          ? `Saved to Cloud & Offline Vault (${slotName})! ✨`
          : `Saved to Offline Vault (${slotName}) — will sync to Cloud when back online! 💾`
      );
      await fetchCloudSlots();
    } finally {
      setIsLoadingCloud(false);
    }
  };

  const handleCloudDownload = async (slotName: string) => {
    setIsLoadingCloud(true);
    setCloudStatus(`Loading ${slotName}…`);
    try {
      const { data, source } = await downloadBackupSlotOfflineFirst(slotName);
      if (data && onImportSave(data)) {
        audio.chime();
        setCloudStatus(
          source === 'cloud'
            ? `Loaded ${slotName} from Cloud! 🎉`
            : `Loaded ${slotName} from Offline Vault! 🎉`
        );
        onSave();
      } else {
        setCloudStatus('No saved data found in this backup slot yet');
      }
    } finally {
      setIsLoadingCloud(false);
    }
  };

  const handleQuickSave = () => {
    onSave();
    audio.chime();
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const handleDownloadSoundtrack = async (idx: number) => {
    if (downloadingTrackIdx !== null || isDownloadingAll) return;
    setDownloadingTrackIdx(idx);
    setTrackDownloadMsg(`Rendering ${MUSIC_TRACKS[idx]?.[1] || 'Track'} to .wav...`);
    try {
      const filename = await audio.downloadTrackAsWav(idx);
      audio.chime();
      setTrackDownloadMsg(`Downloaded ${filename}! 🎵`);
    } catch {
      setTrackDownloadMsg('Could not export audio on this browser.');
    } finally {
      setDownloadingTrackIdx(null);
      setTimeout(() => setTrackDownloadMsg(''), 3400);
    }
  };

  const handleDownloadAllSoundtracks = async () => {
    if (downloadingTrackIdx !== null || isDownloadingAll) return;
    setIsDownloadingAll(true);
    setTrackDownloadMsg('Preparing complete 14-track album archive...');
    try {
      const zipName = await audio.downloadAllTracksZip((cur, total, title) => {
        setTrackDownloadMsg(`⏳ Rendering ${cur}/${total}: ${title}...`);
      });
      audio.chime();
      setTrackDownloadMsg(`🎉 Downloaded ${zipName} (all 14 songs)!`);
    } catch {
      setTrackDownloadMsg('Could not export complete soundtrack on this browser.');
    } finally {
      setIsDownloadingAll(false);
      setTimeout(() => setTrackDownloadMsg(''), 5000);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-modal-safe bg-black/50 backdrop-blur-sm pointer-events-auto">
      <div className="w-full max-w-3xl storybook-modal rounded-2xl sm:rounded-3xl p-3 sm:p-5 max-h-[94dvh] flex flex-col gap-2.5 sm:gap-3.5 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-[#f0c7d8]/80 dark:border-[#5b3b6b]/80 pb-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl sm:text-2xl shrink-0">
              {activeTab === 'settings'
                ? '⚙️'
                : activeTab === 'progress'
                ? '🏆'
                : activeTab === 'cloud'
                ? '☁️'
                : activeTab === 'help'
                ? '❓'
                : '⏸'}
            </span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-[#4a3550] dark:text-[#fdeeff] leading-none truncate">
                {isTitleScreen && activeTab === 'settings'
                  ? 'Game Settings'
                  : 'Mochi Meadows Menu'}
              </h2>
              <span className="text-[10px] sm:text-[11px] font-bold text-[#d85784] dark:text-[#ff9ec0]">
                {activeTab === 'menu'
                  ? 'Adventure Overview & Actions'
                  : activeTab === 'progress'
                  ? 'Collection & Discoveries'
                  : activeTab === 'settings'
                  ? 'Audio, Graphics & Atmosphere'
                  : activeTab === 'cloud'
                  ? 'Server Backup Slots'
                  : 'Keyboard & Touch Guide'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            title="Close Menu (Esc)"
            className="w-8 h-8 rounded-full storybook-card hover:bg-[#ffd3e2]/50 text-[#4a3550] dark:text-[#fdeeff] font-black text-sm flex items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Unified Segmented Navigation Control */}
        <div className="flex storybook-well p-1 rounded-xl sm:rounded-2xl gap-1 w-full overflow-x-auto select-none scrollbar-none shrink-0">
          {[
            ['menu', 'Overview', '📋'],
            ['progress', 'Progress', '🏆'],
            ['settings', 'Settings', '⚙️'],
            ['cloud', 'Cloud', '☁️'],
            ['help', 'Help', '❓'],
          ].map(([tabKey, label, icon]) => {
            const isActive = activeTab === tabKey;
            return (
              <button
                key={tabKey}
                onClick={() => {
                  audio.noteSpeech(80);
                  setActiveTab(tabKey as any);
                }}
                className={`flex-1 py-1.5 px-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-[#ff7aa8] text-white shadow-xs'
                    : 'text-[#5a425f] dark:text-[#d4c3db] hover:text-[#ff7aa8] hover:bg-white/50 dark:hover:bg-black/25'
                }`}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 sm:space-y-4 pr-1 text-[#4a3550] dark:text-[#fdeeff] overscroll-contain">
          {/* ================= 1. OVERVIEW TAB ================= */}
          {activeTab === 'menu' && (
            <div className="space-y-3.5 py-1">
              {/* Island Completion Card */}
              <div className="storybook-card rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-[#ff7aa8]">
                    Island Journey Completion
                  </span>
                  <span className="text-xl font-black text-[#4a3550] dark:text-[#fdeeff]">
                    {completionPercentage}%
                  </span>
                </div>

                {/* Animated Visual Progress Bar */}
                <div className="w-full h-3.5 rounded-full bg-[#f3e4ee] dark:bg-[#1b1424] overflow-hidden p-0.5 border border-[#ffd3e2]/50">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-[#ffd23f] via-[#ff7aa8] to-[#b48cff] transition-all duration-500 shadow-xs"
                    style={{ width: `${Math.max(5, completionPercentage)}%` }}
                  />
                </div>

                {/* Milestone Markers */}
                <div className="flex justify-between text-[10px] font-bold opacity-70 mt-1.5 px-0.5">
                  <span>Meadows</span>
                  <span>Reef</span>
                  <span>Sky Kingdom</span>
                  <span>Lullaby Restored</span>
                </div>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {!isTitleScreen ? (
                  <button
                    onClick={onResume}
                    className="p-3.5 bg-linear-to-r from-[#7bd88f] to-[#5ec474] hover:from-[#6fc47c] hover:to-[#53b266] text-white font-black text-sm rounded-2xl shadow-md transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">▶</span>
                      <div className="text-left">
                        <div className="leading-tight">Resume Game</div>
                        <div className="text-[10px] opacity-85 font-bold">Return to exploration</div>
                      </div>
                    </div>
                    <span className="text-xs opacity-75">Esc</span>
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="p-3.5 bg-linear-to-r from-[#7bd88f] to-[#5ec474] text-white font-black text-sm rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">🏠</span>
                      <div className="text-left">
                        <div className="leading-tight">Back to Title</div>
                        <div className="text-[10px] opacity-85 font-bold">Return to main screen</div>
                      </div>
                    </div>
                  </button>
                )}

                <button
                  onClick={handleQuickSave}
                  className={`p-3.5 border-2 rounded-2xl font-black text-sm shadow-xs transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-between cursor-pointer ${
                    savedFeedback
                      ? 'bg-[#7bd88f]/20 border-[#7bd88f] text-[#2d733d]'
                      : 'bg-white/70 dark:bg-black/25 border-[#ffd3e2] dark:border-[#6b4a7a] hover:border-[#ff7aa8]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{savedFeedback ? '✨' : '💾'}</span>
                    <div className="text-left">
                      <div className="leading-tight">{savedFeedback ? 'Saved Successfully!' : 'Save Game'}</div>
                      <div className="text-[10px] opacity-75 font-bold">Store progress in browser</div>
                    </div>
                  </div>
                  <span className="text-xs opacity-75">Auto: 15s</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onOpenJournal();
                  }}
                  className="p-3.5 bg-white/70 dark:bg-black/25 border-2 border-[#ffd3e2] dark:border-[#6b4a7a] hover:border-[#ff7aa8] font-black text-sm rounded-2xl shadow-xs transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">📖</span>
                    <div className="text-left">
                      <div className="leading-tight">Story Journal</div>
                      <div className="text-[10px] opacity-75 font-bold">Quests, verses & cutscenes</div>
                    </div>
                  </div>
                  <span className="text-xs font-black text-[#ff7aa8]">{questsDone}/{questsTotal}</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onOpenWardrobe();
                  }}
                  className="p-3.5 bg-white/70 dark:bg-black/25 border-2 border-[#ffd3e2] dark:border-[#6b4a7a] hover:border-[#ff7aa8] font-black text-sm rounded-2xl shadow-xs transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">👗</span>
                    <div className="text-left">
                      <div className="leading-tight">Customize Look</div>
                      <div className="text-[10px] opacity-75 font-bold">Colors, hats & music tracks</div>
                    </div>
                  </div>
                  <span className="text-xs opacity-75">Key C</span>
                </button>

                {onOpenSongWeaver && !isTitleScreen && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSongWeaver();
                    }}
                    className="p-3.5 bg-white/70 dark:bg-black/25 border-2 border-[#b48cff] dark:border-[#8f7bff] hover:border-[#ff7aa8] font-black text-sm rounded-2xl shadow-xs transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">🎼</span>
                      <div className="text-left">
                        <div className="leading-tight">Song Weaver Composer</div>
                        <div className="text-[10px] opacity-75 font-bold">Compose pentatonic melodies & music boxes</div>
                      </div>
                    </div>
                    <span className="text-xs opacity-75">Key K</span>
                  </button>
                )}

                {onOpenCottage && !isTitleScreen && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenCottage();
                    }}
                    className="p-3.5 bg-white/70 dark:bg-black/25 border-2 border-[#7bd88f] dark:border-[#5ec474] hover:border-[#ff7aa8] font-black text-sm rounded-2xl shadow-xs transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">🏡</span>
                      <div className="text-left">
                        <div className="leading-tight">Moonlit Cottage & Hamlet</div>
                        <div className="text-[10px] opacity-75 font-bold">Decorate room, garden, aquarium & hamlet</div>
                      </div>
                    </div>
                    <span className="text-xs opacity-75">Key H</span>
                  </button>
                )}

                {onOpenMap && !isTitleScreen && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenMap();
                    }}
                    className="col-span-1 sm:col-span-2 p-3.5 bg-linear-to-r from-[#ffd23f]/25 to-[#ff9ebb]/25 dark:bg-white/5 border-2 border-[#ffd23f] dark:border-[#8f7bff] hover:border-[#ff7aa8] font-black text-sm rounded-2xl shadow-xs transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">🗺️</span>
                      <div className="text-left">
                        <div className="leading-tight">Interactive World Atlas</div>
                        <div className="text-[10px] opacity-75 font-bold">Inspect all 8 islands & 5 interconnected layers</div>
                      </div>
                    </div>
                    <span className="text-xs opacity-75">Key M</span>
                  </button>
                )}
              </div>

              {/* Install & Offline Mode Card */}
              <PWAInstallButton variant="menu" />

              {/* Save & Quit Button */}
              {!isTitleScreen && (
                <button
                  onClick={onQuitToTitle}
                  className="w-full p-2.5 bg-[#ffd3e2]/30 hover:bg-[#ff6b6b] hover:text-white border-2 border-[#ffd3e2] dark:border-[#6b4a7a] font-black text-xs rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 mt-1"
                >
                  <span>🏠</span>
                  <span>Save Progress & Exit to Title Screen</span>
                </button>
              )}
            </div>
          )}

          {/* ================= 2. PROGRESS TAB ================= */}
          {activeTab === 'progress' && (
            <div className="space-y-4 py-1">
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { icon: '🪙', label: 'Coins', val: coins, color: '#ffb347' },
                  { icon: '✨', label: 'Star Gems', val: `${starsGot} / ${starsTotal}`, color: '#ffd23f' },
                  { icon: '🐚', label: 'Sea Pearls', val: `${pearlsGot} / ${pearlsTotal}`, color: '#5bc8ff' },
                  { icon: '🪶', label: 'Cloud Feathers', val: `${feathersGot} / ${feathersTotal}`, color: '#b48cff' },
                  { icon: '🌈', label: 'Rainbow Rings', val: `${ringsGot} / ${ringsTotal}`, color: '#ff7aa8' },
                  { icon: '📜', label: 'Quests Done', val: `${questsDone} / ${questsTotal}`, color: '#7bd88f' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white/70 dark:bg-black/25 border-2 border-[#ffd3e2] dark:border-[#6b4a7a] rounded-2xl flex items-center gap-2.5 shadow-xs"
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-black uppercase tracking-wider opacity-70 truncate">
                        {item.label}
                      </div>
                      <div className="text-sm font-black truncate">{item.val}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Achievements Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-black text-xs uppercase tracking-wider text-[#ff7aa8] flex items-center gap-1.5">
                    <span>🏆</span> Island Achievements
                  </h3>
                  <span className="text-xs font-black opacity-75">
                    {unlockedAchievements.length} / {ACHIEVEMENTS.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ACHIEVEMENTS.map((ach) => {
                    const unlocked = unlockedAchievements.includes(ach.id);
                    return (
                      <div
                        key={ach.id}
                        className={`p-2.5 rounded-2xl border-2 transition-all ${
                          unlocked
                            ? 'bg-white/80 dark:bg-black/30 border-[#ff7aa8] shadow-xs'
                            : 'bg-black/5 dark:bg-white/5 border-dashed border-gray-300 dark:border-gray-700 opacity-55'
                        }`}
                      >
                        <div className="font-black text-xs flex items-center gap-1.5 text-[#4a3550] dark:text-[#fdeeff]">
                          <span className="text-base">{unlocked ? ach.icon : '🔒'}</span>
                          <span className="truncate">{ach.title}</span>
                        </div>
                        <div className="text-[11px] opacity-75 mt-0.5 font-bold leading-snug">
                          {ach.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fish Log Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-black text-xs uppercase tracking-wider text-[#ff7aa8] flex items-center gap-1.5">
                    <span>🎣</span> Fish Encyclopedia
                  </h3>
                  <span className="text-xs font-black opacity-75">
                    {Object.keys(fishLog).length} / {FISH_SPECIES.length} species
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FISH_SPECIES.map((fish) => {
                    const count = fishLog[fish.name] || 0;
                    const caught = count > 0;
                    return (
                      <div
                        key={fish.name}
                        className={`p-2.5 rounded-2xl border-2 text-center transition-all ${
                          caught
                            ? 'bg-white/80 dark:bg-black/30 border-[#ffd3e2] dark:border-[#6b4a7a] shadow-xs'
                            : 'bg-black/5 dark:bg-white/5 border-dashed border-gray-300 dark:border-gray-700 opacity-45'
                        }`}
                      >
                        <div className="text-2xl">{caught ? fish.icon : '❔'}</div>
                        <div className="font-black text-xs mt-1 truncate">{caught ? fish.name : 'Unknown Fish'}</div>
                        <div className="text-[10px] text-[#ff7aa8] font-bold mt-0.5">
                          {caught ? `×${count} (${fish.coins} 🪙)` : fish.rarity}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================= 3. SETTINGS TAB ================= */}
          {activeTab === 'settings' && (
            <div className="space-y-4 py-1">
              {/* Master Volume */}
              <div className="p-3.5 bg-white/70 dark:bg-black/25 border-2 border-[#ffd3e2] dark:border-[#6b4a7a] rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-xs font-black">
                  <span className="flex items-center gap-1.5">
                    <span>{settings.vol > 0 ? '🔊' : '🔇'}</span>
                    <span>Master Audio Volume</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const newVol = settings.vol > 0 ? 0 : 0.8;
                        onUpdateSettings('vol', newVol);
                        audio.setVolume(newVol);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-[#ffd3e2]/40 text-[11px] font-bold cursor-pointer hover:bg-[#ffd3e2]"
                    >
                      {settings.vol > 0 ? 'Mute' : 'Unmute'}
                    </button>
                    <span className="font-mono">{Math.round(settings.vol * 100)}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.vol}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      onUpdateSettings('vol', val);
                      audio.setVolume(val);
                    }}
                    className="w-full accent-[#ff7aa8] h-2 bg-[#f3e4ee] dark:bg-[#1f1627] rounded-lg cursor-pointer"
                  />
                  <button
                    onClick={() => audio.chime()}
                    title="Play sound test"
                    className="px-2.5 py-1 rounded-xl border border-[#ffd3e2] dark:border-[#6b4a7a] text-xs font-bold hover:bg-[#ff7aa8] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                  >
                    🎵 Test
                  </button>
                </div>
              </div>

              {/* Island Soundtrack & Offline Downloads */}
              <div className="storybook-card rounded-2xl p-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-black flex items-center gap-1.5 text-[#d85784] dark:text-[#ff9ec0]">
                      <span>🎼</span> Island Soundtrack & Offline Downloads
                    </div>
                    <div className="text-[10px] font-bold opacity-75">
                      Pick a song, export a single 44.1kHz WAV, or download the entire 14-song album at once
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      onClick={() =>
                        handleDownloadSoundtrack(currentTrackIndex >= 1 && currentTrackIndex <= 14 ? currentTrackIndex : 1)
                      }
                      disabled={downloadingTrackIdx !== null || isDownloadingAll}
                      className="px-3 py-1.5 rounded-xl bg-linear-to-r from-[#ff7aa8] to-[#b48cff] hover:brightness-105 text-white text-xs font-black shadow-xs transition-transform active:scale-95 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
                    >
                      {downloadingTrackIdx !== null ? '⏳ Rendering...' : '⬇️ Download Selected (.wav)'}
                    </button>
                    <button
                      onClick={handleDownloadAllSoundtracks}
                      disabled={downloadingTrackIdx !== null || isDownloadingAll}
                      className="px-3 py-1.5 rounded-xl bg-linear-to-r from-[#f59e0b] to-[#ec4899] hover:brightness-105 text-white text-xs font-black shadow-xs transition-transform active:scale-95 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
                      title="Render and download all 14 game songs together inside one ZIP archive"
                    >
                      {isDownloadingAll ? '⏳ Bundling All 14...' : '📦 Download All Songs (.zip)'}
                    </button>
                  </div>
                </div>

                {trackDownloadMsg && (
                  <div className="px-2.5 py-1 rounded-xl bg-[#ffd23f]/25 border border-[#ffd23f] text-[11px] font-black text-center">
                    {trackDownloadMsg}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                  {MUSIC_TRACKS.slice(0, 16).map(([icon, name], idx) => (
                    <button
                      key={name}
                      onClick={() => {
                        audio.init();
                        onSelectTrack?.(idx);
                      }}
                      className={`px-2 py-1.5 rounded-xl border text-[11px] font-black transition-all cursor-pointer truncate text-left ${
                        currentTrackIndex === idx
                          ? 'bg-[#ff7aa8] text-white border-[#ff7aa8] shadow-xs'
                          : 'bg-white/85 dark:bg-[#1f1629] border-[#f0c7d8] dark:border-[#6b4a7a] hover:border-[#ff7aa8]'
                      }`}
                      title={name}
                    >
                      {icon} {name.split('(')[0].trim()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Game Toggles (iOS-style tactile switches) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  ['low', 'Low Graphics Mode', 'Reduces particle density for battery saving', '⚡'],
                  ['night', 'Day & Night Cycle', '7-minute ambient lighting with evening stars', '🌙'],
                  ['auto', 'Autosave to Browser', 'Automatically backs up journey every 15s', '💾'],
                  ['hints', 'Controls & Guidance', 'Shows keyboard and interaction hints in HUD', '💡'],
                ].map(([key, title, desc, icon]) => {
                  const isOn = Boolean(settings[key as keyof typeof settings]);
                  return (
                    <button
                      key={key}
                      onClick={() => onUpdateSettings(key, isOn ? 0 : 1)}
                      className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isOn
                          ? 'bg-white/90 dark:bg-black/30 border-[#ff7aa8] shadow-xs'
                          : 'bg-black/5 dark:bg-white/5 border-gray-200 dark:border-gray-800 opacity-65'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 font-black text-xs">
                          <span>{icon}</span>
                          <span>{title}</span>
                        </div>
                        <div className="text-[11px] opacity-75 mt-0.5 font-bold leading-tight line-clamp-2">
                          {desc}
                        </div>
                      </div>

                      {/* Tactile Toggle Switch */}
                      <div
                        className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center shrink-0 ${
                          isOn ? 'bg-[#ff7aa8] justify-end' : 'bg-gray-300 dark:bg-gray-700 justify-start'
                        }`}
                      >
                        <div className="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform" />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Active Weather System Controls */}
              <div className="storybook-card rounded-2xl p-3.5 space-y-2.5">
                <div className="flex justify-between items-center text-xs font-black">
                  <span className="flex items-center gap-1.5 text-[#d85784] dark:text-[#ff9ec0]">
                    <span>🌦️</span> Island Weather Simulation
                  </span>
                  <span className="text-[11px] opacity-70">Cycles every 2.5 minutes</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {WEATHER_TYPES.map((w) => {
                    const isSelected = currentWeatherId === w.id;
                    return (
                      <button
                        key={w.id}
                        onClick={() => {
                          audio.chime();
                          onSelectWeather?.(w.id);
                        }}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#fffaf2] dark:bg-[#33283f] border-[#ff7aa8] shadow-sm ring-2 ring-[#ff7aa8]/30'
                            : 'bg-black/5 dark:bg-white/5 border-[#f0c7d8]/60 dark:border-[#5b3b6b]/60 opacity-80 hover:opacity-100 hover:border-[#ff7aa8]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-2xl">{w.icon}</span>
                          {isSelected && (
                            <span className="px-1.5 py-0.5 rounded-md bg-[#ff7aa8] text-white text-[9px] font-black uppercase tracking-wider">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="font-black text-xs mt-1.5 text-[#4a3550] dark:text-[#fdeeff] truncate">
                          {w.name}
                        </div>
                        <div className="text-[10px] opacity-75 mt-0.5 leading-snug line-clamp-2">
                          {w.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================= 4. CLOUD SAVES TAB ================= */}
          {activeTab === 'cloud' && (
            <div className="space-y-3 py-1">
              <div className="bg-white/70 dark:bg-black/25 border-2 border-[#ffd3e2] dark:border-[#6b4a7a] rounded-2xl p-3 text-xs font-bold leading-relaxed flex items-center justify-between gap-3">
                <div>
                  <span className="font-black text-[#ff7aa8]">Cloud &amp; Offline Vault Saves:</span> Save anytime — stored in this device&apos;s persistent vault offline and synced to server backup slots when online.
                </div>
                <button
                  onClick={fetchCloudSlots}
                  disabled={isLoadingCloud}
                  className="px-2.5 py-1 rounded-xl bg-[#ffd3e2]/40 hover:bg-[#ffd3e2] text-xs font-bold whitespace-nowrap cursor-pointer"
                >
                  🔄 Refresh
                </button>
              </div>

              {cloudStatus && (
                <div className="p-2.5 rounded-2xl bg-[#ffd23f]/20 border-2 border-[#ffd23f] text-xs font-black text-center text-[#4a3550] dark:text-[#fdeeff] animate-in fade-in">
                  {cloudStatus}
                </div>
              )}

              <div className="space-y-2">
                {['slot-1', 'slot-2', 'slot-3'].map((slotId, index) => {
                  const existing = cloudSlots.find((s) => s.slot === slotId);
                  return (
                    <div
                      key={slotId}
                      className="flex flex-wrap items-center justify-between gap-2 p-3.5 bg-white/70 dark:bg-black/25 border-2 border-[#ffd3e2] dark:border-[#6b4a7a] rounded-2xl"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 shrink-0 rounded-xl bg-[#ffd3e2]/40 dark:bg-[#6b4a7a]/40 flex items-center justify-center text-xl">
                          {existing?.source === 'offline-vault' ? '💾' : '☁️'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-sm flex flex-wrap items-center gap-1.5">
                            <span>Backup Slot #{index + 1}</span>
                            {existing?.pendingSync ? (
                              <span className="px-1.5 py-0.5 rounded-md bg-[#ffd23f]/30 border border-[#ffd23f] text-[10px] font-black text-[#7a5600] dark:text-[#ffe88a]">
                                ⏳ Pending Sync
                              </span>
                            ) : existing?.source === 'offline-vault' ? (
                              <span className="px-1.5 py-0.5 rounded-md bg-[#b6ecff]/40 border border-[#6cc4e8]/60 text-[10px] font-black text-[#1d5e7a] dark:text-[#a8e8ff]">
                                💾 Offline Vault
                              </span>
                            ) : existing?.source === 'cloud' ? (
                              <span className="px-1.5 py-0.5 rounded-md bg-[#7bd88f]/25 border border-[#7bd88f] text-[10px] font-black text-[#1e6a32] dark:text-[#a6f4b8]">
                                ☁️ Synced
                              </span>
                            ) : null}
                          </div>
                          <div className="text-[11px] opacity-75 font-bold mt-0.5 truncate">
                            {existing ? (
                              <span>
                                {existing.playerName} · {new Date(existing.updatedAt).toLocaleDateString()} {new Date(existing.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            ) : (
                              <span className="text-gray-400">Empty backup slot</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          disabled={isLoadingCloud}
                          onClick={() => handleCloudUpload(slotId)}
                          className="px-3 py-1.5 rounded-xl bg-[#ff7aa8] hover:bg-[#ff6b6b] text-white text-xs font-black transition-transform active:scale-95 shadow-xs cursor-pointer"
                        >
                          Save Backup
                        </button>
                        {existing && (
                          <button
                            disabled={isLoadingCloud}
                            onClick={() => handleCloudDownload(slotId)}
                            className="px-3 py-1.5 rounded-xl bg-[#7bd88f] hover:bg-[#6fc47c] text-white text-xs font-black transition-transform active:scale-95 shadow-xs cursor-pointer"
                          >
                            Load
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= 5. HELP TAB ================= */}
          {activeTab === 'help' && (
            <div className="space-y-3 text-xs font-bold leading-relaxed py-1">
              {/* Keyboard Controls */}
              <div className="bg-white/70 dark:bg-black/25 border-2 border-[#ffd3e2] dark:border-[#6b4a7a] rounded-2xl p-3.5 space-y-2">
                <div className="font-black text-xs uppercase tracking-wider text-[#ff7aa8] flex items-center gap-1.5">
                  <span>⌨️</span> Keyboard Shortcuts
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between p-1.5 bg-black/5 dark:bg-white/5 rounded-xl">
                    <span>Move Mochi</span>
                    <div className="flex gap-1 font-mono text-[11px]">
                      <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-300">W</kbd>
                      <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-300">A</kbd>
                      <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-300">S</kbd>
                      <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-300">D</kbd>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-1.5 bg-black/5 dark:bg-white/5 rounded-xl">
                    <span>Sprint / Run</span>
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-300 font-mono text-[11px]">Shift</kbd>
                  </div>

                  <div className="flex items-center justify-between p-1.5 bg-black/5 dark:bg-white/5 rounded-xl">
                    <span>Quick Dash</span>
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-300 font-mono text-[11px]">Space</kbd>
                  </div>

                  <div className="flex items-center justify-between p-1.5 bg-black/5 dark:bg-white/5 rounded-xl">
                    <span>Talk to Villagers</span>
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-300 font-mono text-[11px]">E / Enter</kbd>
                  </div>

                  <div className="flex items-center justify-between p-1.5 bg-black/5 dark:bg-white/5 rounded-xl">
                    <span>Dive in Water</span>
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-300 font-mono text-[11px]">F</kbd>
                  </div>

                  <div className="flex items-center justify-between p-1.5 bg-black/5 dark:bg-white/5 rounded-xl">
                    <span>Cast Magic Spells</span>
                    <div className="flex gap-1 font-mono text-[11px]">
                      <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-300">1</kbd>
                      <span>–</span>
                      <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-300">5</kbd>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-1.5 bg-black/5 dark:bg-white/5 rounded-xl">
                    <span>Fishing Minigame</span>
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-300 font-mono text-[11px]">R</kbd>
                  </div>

                  <div className="flex items-center justify-between p-1.5 bg-black/5 dark:bg-white/5 rounded-xl">
                    <span>Full World Map</span>
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-300 font-mono text-[11px]">M / Click Minimap</kbd>
                  </div>

                  <div className="flex items-center justify-between p-1.5 bg-black/5 dark:bg-white/5 rounded-xl">
                    <span>Journal / Wardrobe</span>
                    <div className="flex gap-1 font-mono text-[11px]">
                      <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-300">J</kbd>
                      <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-300">C</kbd>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile & Tablet Touch Controls */}
              <div className="bg-white/70 dark:bg-black/25 border-2 border-[#ffd3e2] dark:border-[#6b4a7a] rounded-2xl p-3.5 space-y-1.5">
                <div className="font-black text-xs uppercase tracking-wider text-[#ff7aa8] flex items-center gap-1.5">
                  <span>📱</span> Phone & Tablet Controls
                </div>
                <ul className="space-y-1 text-xs opacity-90 list-disc list-inside">
                  <li><strong>Virtual Analog Joystick:</strong> Bottom-left thumbstick moves Mochi in any direction. Push outward to auto-sprint!</li>
                  <li><strong>Action Cluster:</strong> Bottom-right buttons trigger Dash (⚡), Talk (💬), Fish (🎣), and Dive (🤿).</li>
                  <li><strong>Interactive World Map:</strong> Tap the minimap in the top-right to view the full island atlas with pan, pinch-to-zoom, and area details.</li>
                </ul>
              </div>

              {/* Tips & Guidance */}
              <div className="bg-white/70 dark:bg-black/25 border-2 border-[#ffd3e2] dark:border-[#6b4a7a] rounded-2xl p-3.5 space-y-1.5">
                <div className="font-black text-xs uppercase tracking-wider text-[#ff7aa8]">
                  💡 Island Exploration Tips
                </div>
                <ul className="space-y-1 text-xs opacity-90 list-disc list-inside">
                  <li>Talk to Pip the Bunny Baker near your waking spot to begin your quest.</li>
                  <li>In water, pick up sea pearls or cast Bloom (Key 4) to replenish your oxygen bar.</li>
                  <li>Soar into the Cirrus Sky Kingdom with Cloud Wings (Key 5) once unlocked in Chapter 4!</li>
                  <li>Villagers react to the changing weather—talk to them or watch them dance and shelter!</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="pt-2 border-t border-[#f0c7d8]/80 dark:border-[#5b3b6b]/80 flex items-center justify-between text-xs shrink-0">
          <span className="text-[11px] font-bold opacity-60">
            Esc closes menu
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-linear-to-r from-[#ff7aa8] to-[#f46496] hover:brightness-105 text-white text-xs font-black shadow-xs transition-transform active:scale-95 cursor-pointer"
          >
            ✕ Close Menu
          </button>
        </div>
      </div>
    </div>
  );
};
