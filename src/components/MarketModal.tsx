import React, { useState, useMemo } from 'react';
import {
  FISH_SPECIES,
  SHOP_ITEMS,
  TOWN_COMMUNITY_REQUESTS,
  TOWN_MARKET_PROFILES,
  TownCommunityRequest,
} from '../game/constants';

interface MarketModalProps {
  townName: string;
  prosperity: number;
  coins: number;
  upgrades: Record<string, number>;
  fishLog: Record<string, number>;
  completedRequests: string[];
  stats: {
    stars: number;
    pearls: number;
    feathers: number;
    friends: number;
    fishCaught: number;
  };
  initialTab?: 'market' | 'board';
  onClose: () => void;
  onBuyItem: (itemId: string, finalPrice: number) => void;
  onSellFish: (fishName: string, sellAll: boolean, unitPrice: number) => void;
  onFulfillRequest: (req: TownCommunityRequest) => void;
}

export const MarketModal: React.FC<MarketModalProps> = ({
  townName,
  prosperity,
  coins,
  upgrades,
  fishLog,
  completedRequests,
  stats,
  initialTab = 'market',
  onClose,
  onBuyItem,
  onSellFish,
  onFulfillRequest,
}) => {
  const [tab, setTab] = useState<'market' | 'board'>(initialTab);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  const profile = TOWN_MARKET_PROFILES[townName] || {
    townName,
    bazaarTitle: `${townName} Market Square`,
    merchantName: 'Local Guild',
    tagline: 'Fresh regional treats, traveler gear, and archipelago provisions.',
    bannerColor: '#ff7aa8',
    itemIds: ['snack', 'tonic', 'honey_tart', 'boots', 'clover'],
  };

  const hasBellDiscount = Boolean(upgrades.market_bell);
  const prosperityLevel = Math.max(1, Math.min(3, prosperity || 1));
  const prosperityLabel =
    prosperityLevel >= 3
      ? 'Lv.3 Grand Festival Bazaar'
      : prosperityLevel === 2
      ? 'Lv.2 Bustling Square'
      : 'Lv.1 Cozy Hamlet';
  const prosperitySellMult = 1 + (prosperityLevel - 1) * 0.05;
  const bellSellMult = hasBellDiscount ? 1.2 : 1;

  const getEffectivePrice = (basePrice: number, id: string) => {
    if (hasBellDiscount && id !== 'market_bell') {
      return Math.max(1, Math.round(basePrice * 0.85));
    }
    return basePrice;
  };

  const townItems = useMemo(() => {
    const idSet = new Set(profile.itemIds);
    const items = SHOP_ITEMS.filter((item) => idSet.has(item.id));
    return {
      treats: items.filter((item) => item.consumable),
      gearAndCharms: items.filter((item) => !item.consumable),
    };
  }, [profile.itemIds]);

  const caughtFishEntries = useMemo(() => {
    return FISH_SPECIES.map((fish) => {
      const qty = fishLog[fish.name] || 0;
      const unitPrice = Math.max(1, Math.round(fish.coins * bellSellMult * prosperitySellMult));
      return { fish, qty, unitPrice };
    }).filter((entry) => entry.qty > 0);
  }, [fishLog, bellSellMult, prosperitySellMult]);

  const totalFishValue = useMemo(
    () => caughtFishEntries.reduce((sum, entry) => sum + entry.qty * entry.unitPrice, 0),
    [caughtFishEntries]
  );

  const sortedRequests = useMemo(() => {
    return [...TOWN_COMMUNITY_REQUESTS].sort((a, b) => {
      const aLocal = a.townName === townName ? 0 : 1;
      const bLocal = b.townName === townName ? 0 : 1;
      if (aLocal !== bLocal) return aLocal - bLocal;
      const aDone = completedRequests.includes(a.id) ? 1 : 0;
      const bDone = completedRequests.includes(b.id) ? 1 : 0;
      return aDone - bDone;
    });
  }, [townName, completedRequests]);

  const getReqProgress = (req: TownCommunityRequest) => {
    switch (req.requirementKind) {
      case 'coins_donate':
        return coins;
      case 'stars':
        return stats.stars;
      case 'pearls':
        return stats.pearls;
      case 'feathers':
        return stats.feathers;
      case 'friends':
        return stats.friends;
      case 'fish':
        return stats.fishCaught;
    }
  };

  const readyRequestCount = useMemo(
    () =>
      sortedRequests.filter(
        (req) => !completedRequests.includes(req.id) && getReqProgress(req) >= req.targetCount
      ).length,
    [sortedRequests, completedRequests, coins, stats]
  );

  const handleSellEntireBasket = () => {
    if (caughtFishEntries.length === 0) return;
    let totalEarned = 0;
    let countSold = 0;
    caughtFishEntries.forEach(({ fish, qty, unitPrice }) => {
      onSellFish(fish.name, true, unitPrice);
      totalEarned += qty * unitPrice;
      countSold += qty;
    });
    setStatusNote(`Sold ${countSold} fish for +${totalEarned} coins!`);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-modal-safe pointer-events-auto bg-[#160f24]/90">
      <div className="w-full max-w-3xl storybook-modal rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col gap-3 max-h-[90dvh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#f0c7d8]/80 dark:border-[#5b3b6b]/80 pb-3 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl sm:text-2xl">🏮</span>
              <h2 className="text-base sm:text-xl font-black text-[#4a3550] dark:text-[#fdeeff] truncate">
                {profile.bazaarTitle}
              </h2>
            </div>
            <p className="text-xs font-bold text-[#4a3550]/75 dark:text-[#fdeeff]/75 mt-0.5">
              Keeper: {profile.merchantName} — {profile.tagline}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-lg bg-[#fff2c6] dark:bg-[#493860] border border-[#f5c86b] dark:border-[#8a6ab0] text-[#5e3e12] dark:text-[#ffe89e]">
                ⭐ {prosperityLabel}
              </span>
              {hasBellDiscount && (
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-lg bg-[#e2f9ea] dark:bg-[#234a3a] border border-[#73d296] text-[#1f5c39] dark:text-[#b4f5cb]">
                  🛎️ Market Bell Active (15% Off & +20% Catch Value)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="storybook-card rounded-xl px-3 py-1.5 text-xs sm:text-sm font-black text-[#4a3550] dark:text-[#fdeeff] border border-[#ffd3e2] dark:border-[#6b4a7a]">
              🪙 {coins}
            </div>
            <button
              onClick={onClose}
              aria-label="Close Bazaar"
              className="w-8 h-8 rounded-full storybook-card hover:bg-[#ffd3e2]/55 text-[#4a3550] dark:text-[#fdeeff] font-black text-xs flex items-center justify-center transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setTab('market')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black border-2 transition-all cursor-pointer ${
              tab === 'market'
                ? 'bg-[#ff7aa8] border-[#ff7aa8] text-white shadow-xs'
                : 'storybook-card border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff] hover:border-[#ff7aa8]'
            }`}
          >
            🛍️ Bazaar Stalls & Fish Scales
          </button>
          <button
            onClick={() => setTab('board')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black border-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === 'board'
                ? 'bg-[#8f5cff] border-[#8f5cff] text-white shadow-xs'
                : 'storybook-card border-[#f0c7d8] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff] hover:border-[#8f5cff]'
            }`}
          >
            <span>📋 Town Noticeboard</span>
            {readyRequestCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-md bg-[#ffd23f] text-[#4a3550] text-[10px] font-black">
                {readyRequestCount} Ready
              </span>
            )}
          </button>
          {statusNote && (
            <span className="ml-auto text-xs font-black text-[#d85784] dark:text-[#ffb4cf] hidden sm:inline">
              {statusNote}
            </span>
          )}
        </div>

        {/* Scrollable Tab Body */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4 overscroll-contain">
          {tab === 'market' ? (
            <>
              {/* Warm Treats & Travel Buffs */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide text-[#4a3550]/85 dark:text-[#fdeeff]/85">
                    🥐 Warm Treats & Travel Buffs (Repeatable)
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {townItems.treats.map((item) => {
                    const price = getEffectivePrice(item.price, item.id);
                    const canAfford = coins >= price;
                    return (
                      <div
                        key={item.id}
                        className="storybook-card rounded-2xl p-3 border border-[#f0c7d8] dark:border-[#6b4a7a] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-[#4a3550] dark:text-[#fdeeff]">
                            <span>{item.icon}</span>
                            <span className="truncate">{item.name}</span>
                          </div>
                          <p className="text-[11px] font-bold text-[#4a3550]/75 dark:text-[#fdeeff]/75 mt-0.5 leading-snug">
                            {item.desc}
                          </p>
                        </div>
                        <button
                          disabled={!canAfford}
                          onClick={() => {
                            onBuyItem(item.id, price);
                            setStatusNote(`Enjoyed ${item.icon} ${item.name}!`);
                          }}
                          className={`px-3 py-1.5 rounded-xl font-black text-xs shrink-0 transition-transform active:scale-95 cursor-pointer ${
                            canAfford
                              ? 'bg-[#ff7aa8] hover:brightness-105 text-white shadow-xs'
                              : 'bg-gray-200 dark:bg-white/10 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {price} 🪙
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Permanent Gear & Relics */}
              <section className="space-y-2">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide text-[#4a3550]/85 dark:text-[#fdeeff]/85">
                  ✨ Explorer Relics & Gear
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {townItems.gearAndCharms.map((item) => {
                    const owned = Boolean(upgrades[item.id]);
                    const price = getEffectivePrice(item.price, item.id);
                    const canAfford = coins >= price && !owned;
                    return (
                      <div
                        key={item.id}
                        className="storybook-card rounded-2xl p-3 border border-[#f0c7d8] dark:border-[#6b4a7a] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-[#4a3550] dark:text-[#fdeeff]">
                            <span>{item.icon}</span>
                            <span className="truncate">{item.name}</span>
                          </div>
                          <p className="text-[11px] font-bold text-[#4a3550]/75 dark:text-[#fdeeff]/75 mt-0.5 leading-snug">
                            {item.desc}
                          </p>
                        </div>
                        <button
                          disabled={!canAfford}
                          onClick={() => {
                            onBuyItem(item.id, price);
                            setStatusNote(`Unlocked ${item.icon} ${item.name}!`);
                          }}
                          className={`px-3 py-1.5 rounded-xl font-black text-xs shrink-0 transition-transform active:scale-95 ${
                            owned
                              ? 'bg-[#d9f5e2] dark:bg-[#234a3a] text-[#1f5c39] dark:text-[#b4f5cb] cursor-default'
                              : canAfford
                              ? 'bg-[#8f5cff] hover:brightness-105 text-white shadow-xs cursor-pointer'
                              : 'bg-gray-200 dark:bg-white/10 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {owned ? 'Owned ✓' : `${price} 🪙`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Wharf & Plaza Fishmonger Scales */}
              <section className="space-y-2 pb-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide text-[#4a3550]/85 dark:text-[#fdeeff]/85">
                    🎣 Fresh Catch Scales (Sell Fish)
                  </h3>
                  {caughtFishEntries.length > 0 && (
                    <button
                      onClick={handleSellEntireBasket}
                      className="px-3 py-1 rounded-xl bg-[#45b878] hover:brightness-105 text-white font-black text-xs shadow-xs cursor-pointer active:scale-95 transition-transform"
                    >
                      Sell Entire Basket (+{totalFishValue} 🪙)
                    </button>
                  )}
                </div>
                {caughtFishEntries.length === 0 ? (
                  <div className="storybook-well rounded-2xl p-3 text-xs font-bold text-[#4a3550]/70 dark:text-[#fdeeff]/70">
                    Your creel is empty right now — fish near any shoreline (Key R) and bring your catch here for coins!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {caughtFishEntries.map(({ fish, qty, unitPrice }) => (
                      <div
                        key={fish.name}
                        className="storybook-card rounded-2xl p-2.5 border border-[#cce9f7] dark:border-[#4b607e] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-black text-xs sm:text-sm text-[#4a3550] dark:text-[#fdeeff] flex items-center gap-1.5">
                            <span>{fish.icon}</span>
                            <span className="truncate">{fish.name}</span>
                            <span className="text-[11px] opacity-75">×{qty}</span>
                          </div>
                          <div className="text-[10.5px] font-bold text-[#4a3550]/70 dark:text-[#fdeeff]/70">
                            {fish.rarity} • {unitPrice} 🪙 each
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              onSellFish(fish.name, false, unitPrice);
                              setStatusNote(`Sold 1 ${fish.name} (+${unitPrice} 🪙)`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#4ea8de] hover:brightness-105 text-white font-black text-[11px] cursor-pointer active:scale-95"
                          >
                            Sell 1
                          </button>
                          {qty > 1 && (
                            <button
                              onClick={() => {
                                onSellFish(fish.name, true, unitPrice);
                                setStatusNote(`Sold ${qty} ${fish.name} (+${qty * unitPrice} 🪙)`);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#45b878] hover:brightness-105 text-white font-black text-[11px] cursor-pointer active:scale-95"
                            >
                              All
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : (
            /* Noticeboard Community Projects */
            <section className="space-y-2.5 pb-1">
              <div className="storybook-well rounded-2xl p-3 text-xs font-bold text-[#4a3550]/85 dark:text-[#fdeeff]/85">
                Completing a community request for <span className="font-black">{townName}</span> raises the plaza’s
                Prosperity Tier and permanently boosts fish sale payouts here!
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {sortedRequests.map((req) => {
                  const done = completedRequests.includes(req.id);
                  const curVal = getReqProgress(req);
                  const pct = Math.min(100, Math.round((curVal / req.targetCount) * 100));
                  const canFulfill = !done && curVal >= req.targetCount;
                  const isHere = req.townName === townName;
                  return (
                    <div
                      key={req.id}
                      className={`storybook-card rounded-2xl p-3.5 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isHere
                          ? 'border-[#ff9ec4] dark:border-[#a26bd6]'
                          : 'border-[#f0c7d8]/75 dark:border-[#5b3b6b]/75 opacity-95'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10.5px] font-black px-2 py-0.5 rounded-md bg-[#ffd3e2]/65 dark:bg-[#5a3a6b] text-[#4a3550] dark:text-[#fdeeff]">
                            {req.townName}
                          </span>
                          <span className="font-black text-sm text-[#4a3550] dark:text-[#fdeeff]">{req.title}</span>
                          <span className="text-[11px] font-bold text-[#4a3550]/65 dark:text-[#fdeeff]/65">
                            by {req.requester}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-[#4a3550]/80 dark:text-[#fdeeff]/80">{req.desc}</p>
                        <div className="flex items-center gap-2 pt-0.5">
                          <div className="flex-1 h-2 rounded-full bg-[#4a3550]/10 dark:bg-white/10 overflow-hidden max-w-xs">
                            <div
                              className="h-full bg-linear-to-r from-[#ff7aa8] to-[#ffd23f] transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-black tabular-nums text-[#4a3550]/80 dark:text-[#fdeeff]/80">
                            {Math.min(curVal, req.targetCount)}/{req.targetCount}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-black text-[#c97a16] dark:text-[#ffe082]">
                          Reward: +{req.rewardCoins} 🪙
                        </span>
                        {done ? (
                          <span className="px-3 py-1.5 rounded-xl bg-[#d9f5e2] dark:bg-[#234a3a] text-[#1f5c39] dark:text-[#b4f5cb] font-black text-xs">
                            Completed ✓
                          </span>
                        ) : (
                          <button
                            disabled={!canFulfill}
                            onClick={() => {
                              onFulfillRequest(req);
                              setStatusNote(`Fulfilled "${req.title}" (+${req.rewardCoins} 🪙)!`);
                            }}
                            className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-transform active:scale-95 ${
                              canFulfill
                                ? 'bg-[#7bd88f] hover:brightness-105 text-[#173b22] shadow-xs cursor-pointer'
                                : 'bg-gray-200 dark:bg-white/10 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            Fulfill Request
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
