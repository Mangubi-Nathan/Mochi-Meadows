/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LoreEntry, Quest, ReveilleVerse, MoonDiaryEntry, MemoryEcho } from '../game/engine';
import { MAGIC_SPELLS, SPELL_HARMONIES } from '../game/constants';
import { VERSES_OF_REVEILLE, UNSUNG_VERSE, MOON_DIARY_PAGES, MEMORY_ECHOES, STORY_CHAPTERS } from '../game/worldData';
import { audio } from '../game/audio';

interface JournalModalProps {
  objective: string;
  lore: LoreEntry[];
  quests: Quest[];
  unlockedCutscenes: string[];
  currentChapter: number;
  onClose: () => void;
  onPlayCutscene: (sceneKey: string) => void;
}

export const JournalModal: React.FC<JournalModalProps> = ({
  objective,
  lore,
  quests,
  unlockedCutscenes,
  currentChapter,
  onClose,
  onPlayCutscene,
}) => {
  const [activeTab, setActiveTab] = useState<'quests' | 'chapters' | 'reveille' | 'diary' | 'harmonies' | 'theater'>('quests');

  const cutsceneTitles: Record<string, string> = {
    intro: 'The Moon’s Lullaby & Hollow King',
    wake: 'The Waking at Sunnypeak',
    whispers: 'Whispers in Whisperwood',
    starlight: 'Moonfall Isle Starlight',
    deep: 'Glowdeep Bioluminescence',
    reveille: 'The 7th Verse of Reveille',
    finale: 'The Dawn Duet (Grand Finale)',
    skyarr: 'Ascent to Cirrus Kingdom',
    skyend: 'The Moon Road Unfolded',
    credits: 'Credits Roll & Dawn Chorus',
  };

  const completedQuestsCount = quests.filter((q) => q.st === 3).length;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-modal-safe bg-black/50 backdrop-blur-sm pointer-events-auto">
      <div className="w-full max-w-3xl storybook-modal rounded-2xl sm:rounded-3xl p-3 sm:p-5 max-h-[94dvh] flex flex-col gap-2.5 sm:gap-3.5 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-[#f0c7d8]/80 dark:border-[#5b3b6b]/80 pb-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl sm:text-2xl shrink-0">📖</span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-[#4a3550] dark:text-[#fdeeff] leading-none truncate">
                Dream Journal & Reveille
              </h2>
              <span className="text-[10px] sm:text-[11px] font-bold text-[#d85784] dark:text-[#ff9ec0]">
                Chapter {currentChapter} · Verses, Moon’s Diary, Harmonies & Lore
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close Journal (Esc or J)"
            className="w-8 h-8 rounded-full storybook-card hover:bg-[#ffd3e2]/50 text-[#4a3550] dark:text-[#fdeeff] font-black text-sm flex items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Segmented Tab Controls */}
        <div className="flex storybook-well p-1 rounded-xl sm:rounded-2xl gap-1 w-full overflow-x-auto select-none scrollbar-none shrink-0">
          {[
            ['quests', 'Quests', '🎯', `${completedQuestsCount}/${quests.length}`],
            ['chapters', 'Story Acts', '📜', `Ch. ${currentChapter}/12`],
            ['reveille', 'Reveille', '🌅', '7+1'],
            ['diary', 'Moon Diary', '🌙', `${MOON_DIARY_PAGES.length}`],
            ['harmonies', 'Harmonies', '🎶', `${SPELL_HARMONIES.length}`],
            ['theater', 'Theater', '🎬', ''],
          ].map(([tabKey, label, icon, badge]) => {
            const isActive = activeTab === tabKey;
            return (
              <button
                key={tabKey}
                onClick={() => {
                  audio.noteSpeech?.(80);
                  setActiveTab(tabKey as any);
                }}
                className={`py-1.5 px-2.5 sm:px-3 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-[#ff7aa8] text-white shadow-xs'
                    : 'text-[#5a425f] dark:text-[#d4c3db] hover:text-[#ff7aa8] hover:bg-white/50 dark:hover:bg-black/25'
                }`}
              >
                <span>{icon}</span>
                <span>{label}</span>
                {badge && (
                  <span
                    className={`text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-white/30 text-white' : 'bg-black/5 dark:bg-white/10 text-[#5a425f] dark:text-[#d4c3db]'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Scrollable Tab Content Container */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 sm:space-y-3.5 pr-1 text-[#4a3550] dark:text-[#fdeeff] overscroll-contain">
          {/* ================= 1. QUESTS TAB ================= */}
          {activeTab === 'quests' && (
            <div className="space-y-3 py-1">
              {/* Current Main Goal Card */}
              <div className="storybook-card rounded-2xl p-3.5">
                <div className="text-[10px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ff9ec0] mb-0.5">
                  Active Archipelago Objective
                </div>
                <div className="font-extrabold text-sm text-[#4a3550] dark:text-[#fdeeff] leading-snug">
                  {objective}
                </div>
              </div>

              {/* Side Quests List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-[#ff7aa8]">
                  <span>ISLANDER REQUESTS</span>
                  <span>{completedQuestsCount} / {quests.length} Completed</span>
                </div>

                {quests
                  .filter((q) => q.st > 0)
                  .map((q, idx) => (
                    <div
                      key={idx}
                      className="bg-white/70 dark:bg-black/25 border-2 border-[#ffd3e2] dark:border-[#6b4a7a] p-3 rounded-2xl shadow-xs space-y-1"
                    >
                      <div className="flex justify-between items-center font-black text-xs">
                        <span className="flex items-center gap-1.5">
                          <span>{q.st === 3 ? '✅' : q.st === 2 ? '🎁' : '📜'}</span>
                          <span>{q.t}</span>
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ffd3e2]/40 text-[#ff7aa8] font-extrabold">
                          {q.g}
                        </span>
                      </div>
                      <div className="text-[11px] opacity-85 leading-snug">
                        {q.st === 3
                          ? `Completed! ${q.l}`
                          : q.st === 2
                          ? `Ready to turn in to ${q.g}!`
                          : q.k === 'c'
                          ? `Gathering: ${q.c} / ${q.n} ${q.it}`
                          : `Delivery in progress to ${q.to} ${q.it}`}
                      </div>
                    </div>
                  ))}

                {quests.filter((q) => q.st > 0).length === 0 && (
                  <div className="text-xs opacity-75 italic p-4 bg-white/50 dark:bg-black/20 rounded-2xl border border-dashed border-[#ffd3e2] text-center">
                    Talk to islanders across Sunnypeak, Whisperwood, Coral Cay, Moonfall Isle, Cloudrest, and Gloom Isle to take on cozy quests!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= 2. STORY CHAPTERS TAB ================= */}
          {activeTab === 'chapters' && (
            <div className="space-y-2.5 py-1">
              <div className="text-xs font-bold opacity-75">
                The 12-Chapter Saga of Mochi Meadows 2 spans 3 Epic Acts:
              </div>

              <div className="space-y-2">
                {STORY_CHAPTERS.map((ch) => {
                  const isCurrent = currentChapter === ch.num;
                  const isPast = currentChapter > ch.num;
                  return (
                    <div
                      key={ch.num}
                      className={`p-3 rounded-2xl border-2 transition-all ${
                        isCurrent
                          ? 'bg-[#ffd23f]/15 border-[#ffd23f] shadow-md'
                          : isPast
                          ? 'bg-white/70 dark:bg-black/25 border-[#7bd88f] opacity-90'
                          : 'bg-black/5 dark:bg-white/5 border-dashed border-gray-300 dark:border-gray-700 opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-black">
                        <span className="flex items-center gap-1.5">
                          <span>{isPast ? '✅' : isCurrent ? '🌟' : '🔒'}</span>
                          <span>Ch. {ch.num}: {ch.title}</span>
                        </span>
                        <span className="text-[10px] uppercase font-bold text-[#ff7aa8]">
                          {ch.act}
                        </span>
                      </div>
                      <div className="text-[11px] opacity-80 mt-1">
                        <strong>Goal:</strong> {ch.goal}
                      </div>
                      <div className="text-[10px] text-[#ff7aa8] font-bold mt-0.5">
                        🎁 Reward: {ch.reward}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= 3. VERSES OF REVEILLE TAB ================= */}
          {activeTab === 'reveille' && (
            <div className="space-y-3 py-1">
              <div className="bg-[#ffd23f]/15 border-2 border-[#ffd23f] p-3 rounded-2xl text-xs leading-relaxed">
                <span className="font-black text-[#ff7aa8]">The 7 Verses of Reveille:</span> When combined, these sacred verses wake the sleeping Moon and soothe the Hollow King into the Dawn Chorus.
              </div>

              <div className="space-y-2">
                {VERSES_OF_REVEILLE.map((v) => (
                  <div
                    key={v.num}
                    className="p-3 storybook-card rounded-2xl"
                  >
                    <div className="flex justify-between items-center text-xs font-black gap-2">
                      <span className="flex items-center gap-1.5 text-[#d85784] dark:text-[#ff9ec0]">
                        <span>🌅</span>
                        <span>Verse {v.num}: {v.title}</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ffd3e2]/45 text-[#4a3550] dark:text-[#fdeeff] font-mono shrink-0">
                        {v.island}
                      </span>
                    </div>
                    <div className="italic text-xs font-black text-[#9b6200] dark:text-[#ffd23f] mt-1">
                      “{v.quote}”
                    </div>
                    <div className="text-[11px] opacity-75 mt-0.5">
                      Keeper: {v.keeper} · {v.origin}
                    </div>
                  </div>
                ))}

                {/* The Unsung Verse */}
                <div className="p-3 bg-linear-to-r from-[#ffe4e6] to-[#fef3c7] dark:from-[#3b2345] dark:to-[#2e1d38] border border-[#ff7aa8] rounded-2xl shadow-md">
                  <div className="flex justify-between items-center text-xs font-black gap-2">
                    <span className="flex items-center gap-1.5 text-[#d85784] dark:text-[#ff9ec0]">
                      <span>✨</span>
                      <span>The 9th Unsung Verse: {UNSUNG_VERSE.title}</span>
                    </span>
                    <span className="text-[10px] font-mono text-[#9b6200] dark:text-[#ffd23f] uppercase shrink-0">The Lost Duet</span>
                  </div>
                  <div className="italic text-xs font-black text-[#d85784] dark:text-[#ff9ec0] mt-1">
                    “{UNSUNG_VERSE.quote}”
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    Found on: {UNSUNG_VERSE.island} · Keeper: {UNSUNG_VERSE.keeper}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= 4. MOON'S DIARY TAB ================= */}
          {activeTab === 'diary' && (
            <div className="space-y-2.5 py-1">
              <div className="text-xs font-bold opacity-75">
                Pages from the Moon’s personal diary left behind before the Great Slumber:
              </div>

              <div className="space-y-2">
                {MOON_DIARY_PAGES.map((entry) => (
                  <div
                    key={entry.page}
                    className="p-3 bg-white/70 dark:bg-black/25 border-2 border-[#ffd3e2] dark:border-[#6b4a7a] rounded-2xl shadow-xs"
                  >
                    <div className="flex justify-between items-center text-xs font-black">
                      <span className="text-[#ff7aa8]">
                        🌙 Moon’s Diary · Page #{entry.page}
                      </span>
                      <span className="text-[10px] opacity-70">
                        📍 {entry.w === 0 ? 'Ground Realm' : entry.w === 1 ? 'Coral Sea' : entry.w === 2 ? 'Cirrus Sky' : entry.w === 3 ? 'Glowdeep Caverns' : 'Moon Road'}
                      </span>
                    </div>
                    <div className="text-xs italic opacity-90 mt-1 leading-relaxed">
                      “{entry.entry}”
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= 5. COMBINATION HARMONIES TAB ================= */}
          {activeTab === 'harmonies' && (
            <div className="space-y-3 py-1">
              <div className="bg-[#ffd23f]/15 border-2 border-[#ffd23f] p-3 rounded-2xl text-xs leading-relaxed">
                <span className="font-black text-[#ff7aa8]">Spell Combination Harmonies:</span> Cast any two complementary spells within 3 seconds of each other to produce a magnificent musical and magical duet!
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SPELL_HARMONIES.map((h, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-white/80 dark:bg-black/30 border-2 border-[#ffd3e2] dark:border-[#6b4a7a] rounded-2xl shadow-xs text-xs"
                  >
                    <div className="flex items-center justify-between font-black text-[#ff7aa8]">
                      <span>🎶 {h.name}</span>
                      <span className="text-[10px] opacity-70 font-mono">Combo #{idx + 1}</span>
                    </div>
                    <div className="text-[11px] font-bold mt-1 text-[#4a3550] dark:text-[#fdeeff]">
                      {h.spells[0]} + {h.spells[1]}
                    </div>
                    <div className="text-[10px] opacity-75 mt-0.5">
                      {h.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= 6. THEATER TAB ================= */}
          {activeTab === 'theater' && (
            <div className="space-y-3 py-1">
              <div className="text-xs font-bold opacity-75">
                Replay unlocked cinematic story sequences hummed by the Moon:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {['intro', ...unlockedCutscenes].map((sceneKey) => (
                  <button
                    key={sceneKey}
                    onClick={() => {
                      audio.chime();
                      onClose();
                      onPlayCutscene(sceneKey);
                    }}
                    className="p-3 bg-white/70 dark:bg-black/25 hover:bg-[#ffd3e2]/40 dark:hover:bg-[#5a3a6b]/40 rounded-2xl border-2 border-[#ffd3e2] dark:border-[#6b4a7a] hover:border-[#ff7aa8] text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 text-left"
                  >
                    <span className="text-xl">🎬</span>
                    <span className="truncate flex-1">{cutsceneTitles[sceneKey] || sceneKey}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="pt-2 border-t border-[#f0c7d8]/80 dark:border-[#5b3b6b]/80 flex items-center justify-between text-xs shrink-0">
          <span className="text-[11px] font-bold opacity-60">
            Press J or Esc to close
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-linear-to-r from-[#ff7aa8] to-[#f46496] hover:brightness-105 text-white text-xs font-black shadow-xs transition-transform active:scale-95 cursor-pointer"
          >
            ✕ Close Journal
          </button>
        </div>
      </div>
    </div>
  );
};
