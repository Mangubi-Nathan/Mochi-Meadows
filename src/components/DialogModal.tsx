import React, { useState, useEffect, useRef } from 'react';
import { NPC, Quest, PlayerLook } from '../game/engine';
import { drawMochi } from '../game/characterRenderer';
import { audio } from '../game/audio';
import { SHOP_ITEMS, WeatherConfig } from '../game/constants';
import { getNPCWeatherDialogue } from '../game/npcWeatherBehavior';

interface DialogModalProps {
  npc: NPC;
  playerLook: PlayerLook;
  isFriend: boolean;
  lullabyDone: boolean;
  currentChapter: number;
  coins: number;
  activeQuest?: Quest;
  deliverableQuest?: Quest;
  onClose: () => void;
  onSelectTopic: (topicIdx: number) => void;
  onAcceptQuest: (quest: Quest) => void;
  onTurnInQuest: (quest: Quest) => void;
  onDeliverQuest: (quest: Quest) => void;
  onBuyItem: (itemId: string, cost: number) => void;
  ownedUpgrades: Record<string, number>;
  weather?: WeatherConfig;
  canSingDawnDuet?: boolean;
  onSingDawnDuet?: () => void;
}

export const DialogModal: React.FC<DialogModalProps> = ({
  npc,
  playerLook,
  isFriend,
  lullabyDone,
  currentChapter,
  coins,
  activeQuest,
  deliverableQuest,
  onClose,
  onSelectTopic,
  onAcceptQuest,
  onTurnInQuest,
  onDeliverQuest,
  onBuyItem,
  ownedUpgrades,
  weather,
  canSingDawnDuet = false,
  onSingDawnDuet,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isTypingAI, setIsTypingAI] = useState(false);
  const [currentShopOpen, setCurrentShopOpen] = useState(false);
  const portraitRef = useRef<HTMLCanvasElement | null>(null);
  const typeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (typeTimerRef.current !== null) {
        window.clearInterval(typeTimerRef.current);
        typeTimerRef.current = null;
      }
    };
  }, []);

  // Shop inventory mapping
  const SHOP_INVENTORY: Record<string, string[]> = {
    Barley: ['tonic', 'snack', 'honey_tart', 'clover', 'market_bell'],
    Pip: ['snack', 'honey_tart', 'tonic'],
    Flurry: ['tonic', 'cinder_cocoa', 'cozy_scarf', 'boots'],
    Dot: ['tide_chowder', 'rod', 'boat_sail', 'boots'],
    Octavia: ['starlight_tea', 'crys', 'lens', 'lantern_charm'],
    Cumulo: ['starlight_tea', 'cloud', 'lens', 'crys', 'market_bell'],
    Fennel: ['tonic', 'starlight_tea', 'doris_deluxe', 'satchel'],
    Waffles: ['snack', 'tide_chowder', 'rod', 'market_bell'],
    Bumble: ['honey_tart', 'snack', 'clover'],
    Ember: ['cinder_cocoa', 'tonic', 'cozy_scarf', 'lantern_charm'],
    'Penny and Quill': ['cinder_cocoa', 'starlight_tea', 'lens', 'boots'],
  };

  const hasShop = Boolean(SHOP_INVENTORY[npc.n]);

  // Initial text
  useEffect(() => {
    const greeting = isFriend
      ? lullabyDone
        ? `The Lullaby is back, ${playerLook.name}! I hear it in everything now. What’s up?`
        : `Hi again, ${playerLook.name}! What’s up?`
      : npc.g;
    animateText(greeting);
  }, [npc, isFriend, lullabyDone, playerLook.name]);

  // Render NPC Portrait
  useEffect(() => {
    const canvas = portraitRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const npcLook: PlayerLook = {
      sp: npc.sp,
      col: npc.col,
      c2: '',
      ac: '#ff7aa8',
      hat: npc.hat,
      eyes: 0,
      mouth: 0,
      pat: 0,
      out: 0,
      face: 0,
      aura: 0,
      name: npc.n,
    };

    drawMochi(ctx, 44, 60, 1.45, 0, 1, false, npcLook, false, 0);
  }, [npc]);

  const animateText = (text: string) => {
    if (typeTimerRef.current !== null) {
      window.clearInterval(typeTimerRef.current);
      typeTimerRef.current = null;
    }
    setDisplayedText('');
    let i = 0;
    const timer = window.setInterval(() => {
      i += 2;
      setDisplayedText(text.slice(0, i));
      if (i % 6 === 0) {
        audio.noteSpeech(76 + ((npc.bi * 3) % 12));
      }
      if (i >= text.length) {
        window.clearInterval(timer);
        if (typeTimerRef.current === timer) {
          typeTimerRef.current = null;
        }
      }
    }, 20);
    typeTimerRef.current = timer;
  };

  // Keyword fallback when offline or without Gemini API key
  const keywordFallback = (query: string): string => {
    const lower = query.toLowerCase();
    if (
      weather &&
      (lower.includes('weather') ||
        lower.includes('rain') ||
        lower.includes('drizzle') ||
        lower.includes('sun') ||
        lower.includes('snow') ||
        lower.includes('stardust') ||
        lower.includes('cold') ||
        lower.includes('warm'))
    ) {
      return getNPCWeatherDialogue(npc, weather.id);
    }

    if (
      lower.includes('hello') ||
      lower.includes('hi ') ||
      lower === 'hi' ||
      lower.includes('hey') ||
      lower.includes('how are')
    ) {
      return isFriend
        ? `Always wonderful seeing your cozy face, ${playerLook.name}! ${npc.qp?.[0] || npc.g || '…'}`
        : `${npc.g}`;
    }

    if (lower.includes('music') || lower.includes('song') || lower.includes('lullaby') || lower.includes('duet')) {
      return lullabyDone
        ? 'The Dawn Duet still shimmers through every petal across Lantern Isle! ♪'
        : 'Keep gathering Moon Harmonies and starshine — the Lullaby wants to wake! ♪';
    }

    if (lower.includes('home') || lower.includes('house') || lower.includes('cottage') || lower.includes('hamlet')) {
      return 'Nothing beats a warm mug of chamomile tea inside your cottage on Lantern Isle! 🏡';
    }

    const words = query.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    let bestMatch: string | null = null;
    let highestScore = 0;

    npc.t.forEach(([prompt, reply]) => {
      const score = words.filter((w) => (prompt + reply).toLowerCase().includes(w)).length;
      if (score > highestScore) {
        highestScore = score;
        bestMatch = reply;
      }
    });

    return bestMatch || (npc.qp?.length ? npc.qp[Math.floor(Math.random() * npc.qp.length)] : npc.g || '…');
  };

  const handleSendChat = async () => {
    const msg = chatInput.trim();
    if (!msg || isTypingAI) return;
    setChatInput('');
    setIsTypingAI(true);
    setDisplayedText('…');

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const offlineReply = keywordFallback(msg);
      npc.hist.push([msg, offlineReply]);
      animateText(offlineReply);
      setIsTypingAI(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 2500);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          npcName: npc.n,
          npcRole: npc.r,
          playerMessage: msg,
          playerName: playerLook.name,
          isFriend,
          history: npc.hist.map(([player, npcReply]) => ({ player, npc: npcReply })),
          lullabyDone,
          currentChapter,
          weather: weather
            ? {
                id: weather.id,
                name: weather.name,
                description: weather.description,
              }
            : undefined,
        }),
      });
      window.clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const reply = data.reply || keywordFallback(msg);
        npc.hist.push([msg, reply]);
        animateText(reply);
      } else {
        const fallback = keywordFallback(msg);
        npc.hist.push([msg, fallback]);
        animateText(fallback);
      }
    } catch {
      const fallback = keywordFallback(msg);
      npc.hist.push([msg, fallback]);
      animateText(fallback);
    } finally {
      setIsTypingAI(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center p-modal-safe sm:pb-6 pointer-events-auto bg-[#160f24]/45">
      <div className="w-full max-w-2xl storybook-modal rounded-2xl sm:rounded-3xl p-3 sm:p-5 flex flex-col gap-2.5 sm:gap-3 max-h-[92dvh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header: Portrait, Name & Role, Close */}
        <div className="flex items-center gap-3 border-b border-[#f0c7d8]/80 dark:border-[#5b3b6b]/80 pb-2 shrink-0">
          <canvas ref={portraitRef} width={88} height={88} className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl sm:rounded-2xl storybook-well shrink-0" />
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-black text-base sm:text-lg text-[#4a3550] dark:text-[#fdeeff] truncate">{npc.n}</span>
              {isFriend && <span className="text-xs sm:text-sm text-[#ff6fa0] shrink-0" title="Heart Friend">❤️</span>}
            </div>
            <span className="text-[11px] sm:text-xs text-[#4a3550]/75 dark:text-[#fdeeff]/75 font-bold truncate">{npc.r}</span>
          </div>
          <button
            onClick={onClose}
            className="ml-auto w-8 h-8 rounded-full storybook-card hover:bg-[#ffd3e2]/50 text-[#4a3550] dark:text-[#fdeeff] font-black text-xs flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Speech Bubble */}
        <div className="min-h-[64px] max-h-[28dvh] overflow-y-auto storybook-card rounded-2xl p-3 sm:p-3.5 text-xs sm:text-sm font-bold text-[#4a3550] dark:text-[#fdeeff] leading-relaxed whitespace-pre-wrap overscroll-contain shrink-0">
          {displayedText}
        </div>

        {/* Topics, Quests & Shop Controls */}
        {!currentShopOpen ? (
          <div className="flex-1 min-h-0 flex flex-wrap content-start gap-1.5 overflow-y-auto pr-1 overscroll-contain">
            {/* Active Weather Reaction Topic */}
            {weather && (
              <button
                onClick={() => {
                  const line = getNPCWeatherDialogue(npc, weather.id);
                  animateText(line);
                  audio.chime();
                }}
                className="text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-xl border-2 border-[#ff7aa8] bg-linear-to-r from-[#ffd3e2]/70 to-[#ffe4a0]/70 dark:from-[#6b4a7a]/70 dark:to-[#4a3550]/70 hover:from-[#ffd3e2] hover:to-[#ffe4a0] text-[#4a3550] dark:text-[#fdeeff] shadow-sm flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95"
              >
                <span>{weather.icon}</span>
                <span>The {weather.name}</span>
              </button>
            )}

            {npc.t.map(([prompt, reply], idx) => {
              const alreadyHeard = npc.h[idx] === 1;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    onSelectTopic(idx);
                    animateText(reply);
                  }}
                  className={`text-xs sm:text-sm font-black px-3 py-1.5 rounded-xl border-2 transition-transform active:scale-95 ${
                    alreadyHeard
                      ? 'bg-[#ffd3e2]/30 border-[#ffd3e2] text-[#4a3550] dark:text-[#fdeeff]'
                      : 'bg-[#ff7aa8] text-white border-[#ff7aa8] shadow-sm hover:scale-105'
                  }`}
                >
                  {alreadyHeard ? '✓ ' : '💬 '} {prompt}
                </button>
              );
            })}

            {/* Delivery Quest Button */}
            {deliverableQuest && deliverableQuest.st === 1 && (
              <button
                onClick={() => {
                  onDeliverQuest(deliverableQuest);
                  if (deliverableQuest.dl) animateText(deliverableQuest.dl);
                }}
                className="text-xs sm:text-sm font-black px-3 py-1.5 rounded-xl border-2 border-[#ffb347] bg-[#ffd23f] text-[#4a3550] shadow-sm hover:scale-105 active:scale-95"
              >
                📦 Deliver {deliverableQuest.it}
              </button>
            )}

            {/* Active Quest Offered by NPC */}
            {activeQuest && activeQuest.st === 0 && (
              <button
                onClick={() => {
                  onAcceptQuest(activeQuest);
                  animateText(activeQuest.d);
                }}
                className="text-xs sm:text-sm font-black px-3 py-1.5 rounded-xl border-2 border-[#7bd88f] bg-[#7bd88f] text-white shadow-sm hover:scale-105 active:scale-95"
              >
                📜 Accept: {activeQuest.t}
              </button>
            )}

            {activeQuest && activeQuest.st === 1 && (
              <button
                onClick={() => {
                  const hint =
                    activeQuest.k === 'c'
                      ? `I still need ${activeQuest.n! - activeQuest.c} more ${activeQuest.it}. Keep exploring!`
                      : `Please take it to ${activeQuest.to}.`;
                  animateText(hint);
                }}
                className="text-xs sm:text-sm font-black px-3 py-1.5 rounded-xl border-2 border-[#ffd3e2] dark:border-[#6b4a7a] bg-[#fffaf2] dark:bg-[#33283fe0] text-[#4a3550] dark:text-[#fdeeff]"
              >
                📜 {activeQuest.t} ({activeQuest.k === 'c' ? `${activeQuest.c}/${activeQuest.n}` : 'Deliver'})
              </button>
            )}

            {activeQuest && activeQuest.st === 2 && (
              <button
                onClick={() => {
                  onTurnInQuest(activeQuest);
                  animateText(activeQuest.e);
                }}
                className="text-xs sm:text-sm font-black px-3 py-1.5 rounded-xl border-2 border-[#ff7aa8] bg-[#ff7aa8] text-white shadow-sm hover:scale-105 active:scale-95"
              >
                🎁 Turn in: {activeQuest.t}!
              </button>
            )}

            {/* Chapter 12 Dawn Duet Grand Finale Button */}
            {canSingDawnDuet && onSingDawnDuet && (
              <button
                onClick={() => {
                  onSingDawnDuet();
                }}
                className="text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-xl border-2 border-[#fff3a8] bg-linear-to-r from-[#ffd23f] via-[#ff9f43] to-[#ff7aa8] text-[#3b2a45] shadow-md hover:scale-105 active:scale-95 cursor-pointer"
              >
                🎶 Sing the Dawn Duet!
              </button>
            )}

            {/* Shop Button */}
            {hasShop && (
              <button
                onClick={() => setCurrentShopOpen(true)}
                className="text-xs sm:text-sm font-black px-3 py-1.5 rounded-xl border-2 border-[#c26bff] bg-[#c26bff] text-white shadow-sm hover:scale-105 active:scale-95"
              >
                🛍 Shop
              </button>
            )}
          </div>
        ) : (
          /* Shop View */
          <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
            <div className="text-xs font-black text-[#4a3550]/85 dark:text-[#fdeeff]/85 flex justify-between items-center shrink-0">
              <span>Town Goods ({coins} 🪙 coins available):</span>
              <button
                onClick={() => setCurrentShopOpen(false)}
                className="text-xs font-black text-[#d85784] dark:text-[#ff9ec0] underline cursor-pointer whitespace-nowrap"
              >
                ← Back to Chat
              </button>
            </div>
            <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto pr-1 overscroll-contain">
              {SHOP_INVENTORY[npc.n]?.map((itemId) => {
                const item = SHOP_ITEMS.find((s) => s.id === itemId);
                if (!item) return null;
                const hasBell = Boolean(ownedUpgrades.market_bell);
                const finalPrice = hasBell && item.id !== 'market_bell' ? Math.max(1, Math.round(item.price * 0.85)) : item.price;
                const owned = !item.consumable && Boolean(ownedUpgrades[item.id]);
                return (
                  <button
                    key={item.id}
                    disabled={owned || coins < finalPrice}
                    onClick={() => onBuyItem(item.id, finalPrice)}
                    className={`flex items-center justify-between gap-2 text-xs font-black px-3 py-2 rounded-xl border transition-all text-left cursor-pointer ${
                      owned
                        ? 'bg-gray-200/80 dark:bg-white/10 border-gray-300 dark:border-gray-700 text-gray-500 cursor-not-allowed'
                        : coins < finalPrice
                        ? 'opacity-60 border-[#f0c7d8] bg-[#fffaf2] dark:bg-[#2b2137] text-[#4a3550] dark:text-[#fdeeff]'
                        : 'bg-[#fffaf2] dark:bg-[#2b2137] border-[#ff7aa8] hover:bg-[#ff7aa8] hover:text-white active:scale-95 text-[#4a3550] dark:text-[#fdeeff]'
                    }`}
                    title={item.desc}
                  >
                    <span className="flex items-center gap-1.5 min-w-0 truncate">
                      <span>{item.icon}</span>
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="shrink-0 whitespace-nowrap">({owned ? 'Owned ✓' : `${finalPrice} 🪙`})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Natural Chat Input (Powered by Gemini) */}
        <div className="flex gap-2 pt-2 border-t border-[#f0c7d8]/80 dark:border-[#5b3b6b]/80 shrink-0">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
            maxLength={120}
            placeholder={`Say anything to ${npc.n}…`}
            disabled={isTypingAI}
            className="flex-1 min-w-0 bg-[#fffaf2] dark:bg-[#2b2137] border border-[#f0c7d8] dark:border-[#6b4a7a] focus:border-[#ff7aa8] rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-[#4a3550] dark:text-[#fdeeff] outline-none"
          />
          <button
            onClick={handleSendChat}
            disabled={isTypingAI || !chatInput.trim()}
            className="bg-linear-to-r from-[#ff7aa8] to-[#f46496] hover:brightness-105 disabled:opacity-50 text-white font-black text-xs sm:text-sm px-4 py-2 rounded-xl transition-transform active:scale-95 shadow-sm shrink-0 cursor-pointer"
          >
            {isTypingAI ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};
