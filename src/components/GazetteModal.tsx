import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  DailyGazetteIssue,
  GazetteComic,
  GazetteLibraryItem,
  GazetteWorldContext,
  bumpGazetteViewSeq,
  getCurrentEditionSlot,
  getDailyGazetteIssue,
  getLocalDateKey,
  getNextPressCountdownMs,
  isTriviaSlotClaimed,
  markGazetteSlotSeen,
  markTriviaSlotClaimed,
} from '../game/gazetteData';
import { ComicStripRenderer } from './ComicStripRenderer';

interface GazetteModalProps {
  onClose: () => void;
  activeWeather?: {
    name: string;
    icon: string;
    description: string;
  };
  worldContext?: GazetteWorldContext;
  coins: number;
  onSpendCoins: (amount: number, reason: string) => boolean;
  onEarnCoins: (amount: number, reason: string) => void;
  library: GazetteLibraryItem[];
  onSaveToLibrary: (item: GazetteLibraryItem) => void;
  onToggleKeepLibraryItem: (id: string) => void;
  onDeleteLibraryItem: (id: string) => void;
  onRestoreLibraryItem?: (item: GazetteLibraryItem) => void;
  onClearUnkeptLibraryItems?: () => void;
  onEditionSeen?: (slot: number) => void;
}

type GazetteTab = 'edition' | 'comics' | 'library';
type LibraryFilter = 'all' | 'kept' | 'edition' | 'comic';

export const GazetteModal: React.FC<GazetteModalProps> = ({
  onClose,
  activeWeather,
  worldContext,
  coins,
  onSpendCoins,
  onEarnCoins,
  library,
  onSaveToLibrary,
  onToggleKeepLibraryItem,
  onDeleteLibraryItem,
  onRestoreLibraryItem,
  onClearUnkeptLibraryItems,
  onEditionSeen,
}) => {
  const [todayKey, setTodayKey] = useState(() => getLocalDateKey());
  const [realSlot, setRealSlot] = useState(() => getCurrentEditionSlot());
  const [countdownSec, setCountdownSec] = useState(() => Math.max(1, Math.ceil(getNextPressCountdownMs() / 1000)));
  // Bump edition offset each time Gazette opens AND whenever user clicks "Fresh Edition"
  const [editionOffset, setEditionOffset] = useState(() => bumpGazetteViewSeq());
  const [hotOffPressFlash, setHotOffPressFlash] = useState(false);
  const [serverDispatch, setServerDispatch] = useState<string | null>(null);

  const issue = useMemo<DailyGazetteIssue>(
    () => getDailyGazetteIssue(todayKey, editionOffset, worldContext, realSlot * 120000 + 1000),
    [todayKey, editionOffset, worldContext, realSlot]
  );

  const [tab, setTab] = useState<GazetteTab>('edition');
  const [libFilter, setLibFilter] = useState<LibraryFilter>('all');
  const [readingItem, setReadingItem] = useState<GazetteLibraryItem | null>(null);
  const [deletedUndoItem, setDeletedUndoItem] = useState<GazetteLibraryItem | null>(null);

  const currentRewardSlotKey = `${todayKey}-t${realSlot}`;
  const [triviaClaimed, setTriviaClaimed] = useState<boolean>(() => isTriviaSlotClaimed(currentRewardSlotKey));
  const [triviaFeedback, setTriviaFeedback] = useState<string | null>(null);

  const onEditionSeenRef = useRef(onEditionSeen);
  onEditionSeenRef.current = onEditionSeen;

  // Sync claimed status & mark active press slot as read
  useEffect(() => {
    setTriviaClaimed(isTriviaSlotClaimed(currentRewardSlotKey));
    markGazetteSlotSeen(realSlot);
    onEditionSeenRef.current?.(realSlot);
  }, [currentRewardSlotKey, realSlot]);

  // Clear per-riddle local feedback whenever user flips to a new edition's question
  useEffect(() => {
    setTriviaFeedback(null);
  }, [issue.editionKey]);

  // Live 1-second press countdown & automatic edition rotation every 2 minutes
  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      const nextDateKey = getLocalDateKey(new Date(now));
      const nextRealSlot = getCurrentEditionSlot(now);
      const nextSecs = Math.max(0, Math.ceil(getNextPressCountdownMs(now) / 1000));

      setCountdownSec(nextSecs);
      if (nextDateKey !== todayKey) {
        setTodayKey(nextDateKey);
      }
      if (nextRealSlot !== realSlot) {
        setRealSlot(nextRealSlot);
        setHotOffPressFlash(true);
        window.setTimeout(() => setHotOffPressFlash(false), 3200);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [todayKey, realSlot]);

  // Check if current edition or comic is already owned in the library
  const isEditionOwned = library.some((item) => item.id === `edition-${issue.editionKey}`);
  const isComicOwned = (comicId: string) =>
    library.some(
      (item) =>
        item.comicData?.id === comicId ||
        Boolean(item.editionData?.comics.some((c) => c.id === comicId))
    );

  // Optional AI dispatch supplement from /api/gazette keyed to the active edition
  useEffect(() => {
    let active = true;
    setServerDispatch(null);
    const loadServerWire = async () => {
      try {
        const res = await fetch(
          `/api/gazette?date=${encodeURIComponent(todayKey)}&slot=${encodeURIComponent(String(realSlot + editionOffset))}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        if (data.headline && typeof data.headline === 'string' && data.headline.trim().length > 8) {
          setServerDispatch(data.headline.trim());
        }
      } catch {
        // Offline / deterministic rotating edition already active seamlessly
      }
    };
    loadServerWire();
    return () => {
      active = false;
    };
  }, [todayKey, realSlot, editionOffset]);

  const nextPrintText = useMemo(() => {
    const mins = Math.floor(countdownSec / 60);
    const secs = countdownSec % 60;
    return `Next press in ${mins}m ${String(secs).padStart(2, '0')}s`;
  }, [countdownSec]);

  const handleCycleFreshEdition = () => {
    setEditionOffset((prev) => prev + 1);
    setHotOffPressFlash(true);
    window.setTimeout(() => setHotOffPressFlash(false), 2000);
  };

  const handleBuyEdition = () => {
    if (isEditionOwned) {
      setTab('library');
      return;
    }
    if (!onSpendCoins(issue.editionPrice, `Bought Meadows Gazette Issue #${issue.issueNumber}`)) {
      return;
    }
    const newItem: GazetteLibraryItem = {
      id: `edition-${issue.editionKey}`,
      type: 'edition',
      title: issue.headline,
      subtitle: `Issue #${issue.issueNumber} · ${issue.editionTag} + 3 Comics`,
      issueNumber: issue.issueNumber,
      dateKey: issue.dateKey,
      dateLabel: issue.dateLabel,
      purchasedAt: new Date().toISOString(),
      paidCoins: issue.editionPrice,
      kept: true,
      editionData: issue,
    };
    onSaveToLibrary(newItem);
  };

  const handleBuyComic = (comic: GazetteComic) => {
    if (isComicOwned(comic.id)) {
      setTab('library');
      return;
    }
    if (!onSpendCoins(comic.price, `Bought comic "${comic.title}"`)) {
      return;
    }
    const newItem: GazetteLibraryItem = {
      id: `comic-${comic.id}-${issue.editionKey}`,
      type: 'comic',
      title: comic.title,
      subtitle: `${comic.series} · By ${comic.author}`,
      issueNumber: issue.issueNumber,
      dateKey: issue.dateKey,
      dateLabel: issue.dateLabel,
      purchasedAt: new Date().toISOString(),
      paidCoins: comic.price,
      kept: false,
      comicData: comic,
    };
    onSaveToLibrary(newItem);
  };

  const handleAnswerTrivia = (selectedIdx: number) => {
    if (selectedIdx === issue.trivia.correctIdx) {
      if (!triviaClaimed) {
        setTriviaClaimed(true);
        markTriviaSlotClaimed(currentRewardSlotKey);
        onEarnCoins(issue.trivia.rewardCoins, `Gazette Press Riddle (+${issue.trivia.rewardCoins} coins)`);
        setTriviaFeedback(`Correct! +${issue.trivia.rewardCoins} coins earned. ${issue.trivia.explanation}`);
      } else {
        setTriviaFeedback(`Spot on! ${issue.trivia.explanation} (Next +10 coin bonus unlocks when the press timer resets!)`);
      }
    } else {
      setTriviaFeedback('Not quite! Give another answer a try.');
    }
  };

  const handleDeleteWithUndo = (item: GazetteLibraryItem) => {
    setDeletedUndoItem(item);
    onDeleteLibraryItem(item.id);
    if (readingItem?.id === item.id) {
      setReadingItem(null);
    }
  };

  const filteredLibrary = useMemo(() => {
    return library.filter((item) => {
      if (libFilter === 'kept') return item.kept;
      if (libFilter === 'edition') return item.type === 'edition';
      if (libFilter === 'comic') return item.type === 'comic';
      return true;
    });
  }, [library, libFilter]);

  const unkeptCount = library.filter((i) => !i.kept).length;
  const combinedWires = serverDispatch
    ? [serverDispatch, ...issue.liveWire].slice(0, 3)
    : issue.liveWire;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-modal-safe bg-[#160f24]/92 pointer-events-auto">
      <div className="w-full max-w-4xl bg-[#fbf8f1] dark:bg-[#2a2136] border border-[#3a2640]/35 dark:border-[#745694]/80 ring-4 ring-[#fbf8f1]/45 dark:ring-[#2a2136]/45 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[94dvh] overflow-hidden text-[#2d1f33] dark:text-[#f8effc]">
        {/* Newspaper Masthead */}
        <header className="px-3.5 sm:px-6 pt-3.5 sm:pt-4 pb-2.5 sm:pb-3 border-b-2 border-[#3a2640]/20 dark:border-[#745694]/50 shrink-0 bg-[#f6efe2] dark:bg-[#231a2e]">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <div className="text-[10.5px] sm:text-[11px] font-bold tracking-wide text-[#7c5b7a] dark:text-[#cbb3dc] flex flex-wrap items-center gap-x-2 gap-y-0.5 tabular-nums">
                <span>{issue.editionTag}</span>
                <span aria-hidden="true">·</span>
                <span>Issue #{issue.issueNumber}</span>
                <span aria-hidden="true">·</span>
                <span>{issue.dateLabel}</span>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <span className="hidden sm:inline text-[#b83264] dark:text-[#ff9ec0]">{nextPrintText}</span>
                {hotOffPressFlash && (
                  <span className="px-1.5 py-0.5 rounded-md bg-[#ffd23f] text-[#4a3550] text-[10px] font-black">
                    🔥 Hot Off the Press!
                  </span>
                )}
              </div>
              <h2 className="text-xl xs:text-2xl sm:text-3xl font-black tracking-tight mt-0.5 text-[#2d1f33] dark:text-[#fff6fe] truncate">
                The Meadows Gazette
              </h2>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <div
                className="text-xs sm:text-sm font-black tabular-nums text-[#8a5300] dark:text-[#ffd23f]"
                title="Your Island Coins"
              >
                {coins} Coins
              </div>
              <button
                onClick={onClose}
                aria-label="Close Gazette"
                className="w-10 h-10 rounded-full border border-[#3a2640]/25 dark:border-[#745694] hover:bg-[#3a2640]/10 dark:hover:bg-white/10 font-black text-sm flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Segmented Section Tabs */}
          <div className="mt-2.5 sm:mt-3 flex items-center justify-between flex-wrap gap-2">
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#ebe2d0] dark:bg-[#1d1527] border border-[#3a2640]/15 dark:border-[#745694]/40 max-w-full overflow-x-auto scrollbar-none">
              <button
                onClick={() => {
                  setReadingItem(null);
                  setTab('edition');
                }}
                className={`px-2.5 sm:px-4 py-1.5 rounded-lg text-xs font-black whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  tab === 'edition'
                    ? 'bg-white dark:bg-[#3b2c4e] text-[#2d1f33] dark:text-white shadow-xs'
                    : 'text-[#664e6a] dark:text-[#cbb3dc] hover:text-[#2d1f33] dark:hover:text-white'
                }`}
              >
                Latest Paper
              </button>
              <button
                onClick={() => {
                  setReadingItem(null);
                  setTab('comics');
                }}
                className={`px-2.5 sm:px-4 py-1.5 rounded-lg text-xs font-black whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  tab === 'comics'
                    ? 'bg-white dark:bg-[#3b2c4e] text-[#2d1f33] dark:text-white shadow-xs'
                    : 'text-[#664e6a] dark:text-[#cbb3dc] hover:text-[#2d1f33] dark:hover:text-white'
                }`}
              >
                Funnies ({issue.comics.length})
              </button>
              <button
                onClick={() => {
                  setReadingItem(null);
                  setTab('library');
                }}
                className={`px-2.5 sm:px-4 py-1.5 rounded-lg text-xs font-black whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  tab === 'library'
                    ? 'bg-white dark:bg-[#3b2c4e] text-[#2d1f33] dark:text-white shadow-xs'
                    : 'text-[#664e6a] dark:text-[#cbb3dc] hover:text-[#2d1f33] dark:hover:text-white'
                }`}
              >
                My Library ({library.length})
              </button>
            </div>

            {tab !== 'library' && (
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <button
                  onClick={handleCycleFreshEdition}
                  title="Print a fresh rotating edition of stories, briefs, comics, and riddles immediately"
                  className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-[#3a2640]/20 dark:border-[#745694] bg-white/80 dark:bg-[#342646] hover:bg-[#fff2c2] dark:hover:bg-[#493661] text-[#2d1f33] dark:text-[#fdeeff] text-xs font-black whitespace-nowrap shrink-0 transition-all cursor-pointer active:scale-95"
                >
                  🔄 Fresh Edition
                </button>
                <button
                  onClick={handleBuyEdition}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black whitespace-nowrap shrink-0 transition-all cursor-pointer tabular-nums ${
                    isEditionOwned
                      ? 'bg-[#e5f6ea] dark:bg-[#224432] text-[#1d6435] dark:text-[#9ef0b8] border border-[#1d6435]/30'
                      : 'bg-[#d9487d] hover:bg-[#c2366b] text-white shadow-xs active:scale-95'
                  }`}
                >
                  {isEditionOwned
                    ? 'Edition Saved in Library'
                    : `Buy Issue #${issue.issueNumber} (${issue.editionPrice} Coins)`}
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5 overscroll-contain">
          {/* Reader Overlay for Saved Library Item */}
          {readingItem ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#3a2640]/15 dark:border-[#745694]/40">
                <button
                  onClick={() => setReadingItem(null)}
                  className="px-3.5 py-2 rounded-xl border border-[#3a2640]/20 dark:border-[#745694] text-xs font-black hover:bg-[#3a2640]/5 dark:hover:bg-white/10 cursor-pointer whitespace-nowrap shrink-0"
                >
                  ← Back to Library
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleKeepLibraryItem(readingItem.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      readingItem.kept
                        ? 'bg-[#fff2c2] dark:bg-[#4c3e1b] border-[#d69e00]/50 text-[#735200] dark:text-[#ffe066]'
                        : 'border-[#3a2640]/20 dark:border-[#745694] hover:bg-[#3a2640]/5'
                    }`}
                  >
                    {readingItem.kept ? '★ Kept Favorite' : '☆ Keep Issue'}
                  </button>
                  <button
                    onClick={() => handleDeleteWithUndo(readingItem)}
                    className="px-3.5 py-2 rounded-xl border border-[#d63649]/35 text-[#b42336] dark:text-[#ff8a98] hover:bg-[#d63649]/10 text-xs font-black cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="text-xs font-bold text-[#7c5b7a] dark:text-[#cbb3dc] tabular-nums">
                Archived Edition · Issue #{readingItem.issueNumber} · {readingItem.dateLabel}
              </div>

              {readingItem.type === 'comic' && readingItem.comicData && (
                <ComicStripRenderer comic={readingItem.comicData} />
              )}

              {readingItem.type === 'edition' && readingItem.editionData && (
                <div className="space-y-5">
                  <article className="bg-white/75 dark:bg-black/20 border border-[#3a2640]/15 dark:border-[#745694]/40 rounded-2xl p-4 sm:p-5 space-y-2">
                    <div className="text-[11px] font-black tracking-wider uppercase text-[#b83264] dark:text-[#ff8fb8]">
                      {readingItem.editionData.kicker}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black leading-tight text-balance">
                      {readingItem.editionData.headline}
                    </h3>
                    <p className="text-sm font-bold opacity-80">{readingItem.editionData.subhead}</p>
                    <div className="text-xs font-bold opacity-65 pt-1">{readingItem.editionData.byline}</div>
                    <p className="text-sm leading-relaxed pt-2">{readingItem.editionData.leadBody}</p>
                  </article>

                  <div className="space-y-4">
                    <h4 className="text-sm font-black uppercase tracking-wider opacity-75">
                      Included Daily Comics ({readingItem.editionData.comics.length})
                    </h4>
                    {readingItem.editionData.comics.map((c) => (
                      <ComicStripRenderer key={c.id} comic={c} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : tab === 'edition' ? (
            /* TAB 1: TODAY'S PAPER */
            <div className="space-y-5">
              {/* Broadsheet 2-Column Editorial Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                {/* Lead Front Page Story (2 columns on desktop) */}
                <article className="md:col-span-2 bg-white/85 dark:bg-black/25 border border-[#3a2640]/15 dark:border-[#745694]/40 rounded-2xl p-4 sm:p-5 space-y-2.5">
                  <div className="text-[11px] font-black uppercase tracking-wider text-[#b83264] dark:text-[#ff8fb8]">
                    {issue.kicker} · Front Page Story
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black leading-snug text-balance">
                    {issue.headline}
                  </h3>
                  <p className="text-sm font-bold opacity-80 leading-snug">
                    {issue.subhead}
                  </p>
                  <div className="text-xs font-bold opacity-60 pb-2 border-b border-[#3a2640]/10 dark:border-white/10">
                    {issue.byline} · {issue.dateLabel}
                  </div>
                  <p className="text-sm leading-relaxed font-semibold pt-1">
                    {issue.leadBody}
                  </p>

                  {/* Classifieds / Island Briefs */}
                  <div className="pt-3 mt-2 border-t border-[#3a2640]/10 dark:border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {issue.briefs.map((brief, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="text-[10px] font-black uppercase tracking-wider text-[#7c5b7a] dark:text-[#cbb3dc]">
                          {brief.category}
                        </div>
                        <div className="text-xs font-black leading-tight">{brief.title}</div>
                        <p className="text-[11px] opacity-80 leading-snug">{brief.body}</p>
                      </div>
                    ))}
                  </div>

                  {/* Archipelago Live Wire Bulletins */}
                  {combinedWires.length > 0 && (
                    <div className="pt-3 mt-2 border-t border-[#3a2640]/10 dark:border-white/10 space-y-1.5">
                      <div className="text-[10px] font-black uppercase tracking-wider text-[#b83264] dark:text-[#ff8fb8]">
                        📡 Archipelago Wire Dispatches
                      </div>
                      <ul className="space-y-1">
                        {combinedWires.map((line, i) => (
                          <li key={i} className="text-[11px] font-bold opacity-85 flex items-start gap-1.5">
                            <span className="text-[#d9487d] shrink-0">•</span>
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>

                {/* Right Margin Column: Weather Desk + Orla's Horoscope + Trivia */}
                <div className="space-y-3.5">
                  {/* Live Weather Desk */}
                  <section className="bg-white/85 dark:bg-black/25 border border-[#3a2640]/15 dark:border-[#745694]/40 rounded-2xl p-4 space-y-1.5">
                    <div className="text-xs font-black text-[#1d6fa5] dark:text-[#7cc7f7]">
                      Wisp’s Weather Desk
                    </div>
                    {activeWeather && (
                      <div className="text-xs font-extrabold">
                        Now: {activeWeather.icon} {activeWeather.name}
                      </div>
                    )}
                    <p className="text-xs opacity-85 leading-relaxed">
                      {activeWeather ? `${activeWeather.description} ${issue.weatherSummary}` : issue.weatherSummary}
                    </p>
                  </section>

                  {/* Horoscope */}
                  <section className="bg-white/85 dark:bg-black/25 border border-[#3a2640]/15 dark:border-[#745694]/40 rounded-2xl p-4 space-y-1.5">
                    <div className="text-xs font-black text-[#7940a8] dark:text-[#d5b3ff]">
                      Orla’s Star Forecast
                    </div>
                    <p className="text-xs opacity-85 leading-relaxed">{issue.horoscope}</p>
                    <div className="text-[11px] font-bold opacity-70 pt-1">
                      Lucky Carry: {issue.luckyItem}
                    </div>
                  </section>

                  {/* Rotating Press Riddle (+10 Coins per press window) */}
                  <section className="bg-[#fff6dc] dark:bg-[#382b1d] border border-[#d69e00]/35 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-[#8a5b00] dark:text-[#ffd23f]">
                        Press Edition Riddle
                      </span>
                      <span className="text-[11px] font-black tabular-nums text-[#8a5b00] dark:text-[#ffd23f]">
                        {triviaClaimed ? 'Bonus Claimed' : `+${issue.trivia.rewardCoins} Coins`}
                      </span>
                    </div>
                    <p className="text-xs font-bold leading-snug">{issue.trivia.question}</p>
                    <div className="space-y-1.5">
                      {issue.trivia.options.map((opt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAnswerTrivia(idx)}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer bg-white/85 dark:bg-black/25 border-[#3a2640]/15 hover:border-[#d9487d]"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {triviaFeedback && (
                      <p className="text-[11px] font-bold text-[#735200] dark:text-[#ffe066]">
                        {triviaFeedback}
                      </p>
                    )}
                  </section>
                </div>
              </div>

              {/* Featured Comic Spotlight */}
              {issue.comics[0] && (
                <section className="space-y-2.5 pt-2 border-t border-[#3a2640]/15 dark:border-[#745694]/40">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-wider text-[#b83264] dark:text-[#ff8fb8]">
                        Featured Strip · Issue #{issue.issueNumber}
                      </div>
                      <h3 className="text-base sm:text-lg font-black">
                        {issue.comics[0].series}: {issue.comics[0].title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTab('comics')}
                        className="px-3.5 py-2 rounded-xl border border-[#3a2640]/20 dark:border-[#745694] text-xs font-black hover:bg-[#3a2640]/5 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        See All {issue.comics.length} Comics
                      </button>
                      <button
                        onClick={() => handleBuyComic(issue.comics[0])}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                          isComicOwned(issue.comics[0].id)
                            ? 'bg-[#e5f6ea] dark:bg-[#224432] text-[#1d6435] dark:text-[#9ef0b8]'
                            : 'bg-[#3a2640] hover:bg-[#4e3556] text-white dark:bg-[#7c4dff] dark:hover:bg-[#6a3df0]'
                        }`}
                      >
                        {isComicOwned(issue.comics[0].id)
                          ? 'In Library'
                          : `Buy Strip (${issue.comics[0].price} Coins)`}
                      </button>
                    </div>
                  </div>
                  <ComicStripRenderer comic={issue.comics[0]} compact />
                </section>
              )}
            </div>
          ) : tab === 'comics' ? (
            /* TAB 2: ROTATING COMICS SECTION */
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#3a2640]/15 dark:border-[#745694]/40">
                <div>
                  <h3 className="text-lg font-black">Edition #{issue.issueNumber} Comic Funnies</h3>
                  <p className="text-xs font-bold opacity-75">
                    3 rotating strips every edition ({issue.editionTag}). Buy strips or full issues to archive them forever!
                  </p>
                </div>
                <span className="text-xs font-bold opacity-70 tabular-nums">{nextPrintText}</span>
              </div>

              {issue.comics.map((comic, idx) => {
                const owned = isComicOwned(comic.id);
                return (
                  <div key={comic.id} className="space-y-2">
                    <ComicStripRenderer comic={comic} />
                    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                      <span className="text-xs font-bold opacity-75">
                        Strip {idx + 1} of {issue.comics.length} · Issue #{issue.issueNumber}
                      </span>
                      <button
                        onClick={() => handleBuyComic(comic)}
                        className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap shrink-0 cursor-pointer transition-all tabular-nums ${
                          owned
                            ? 'bg-[#e5f6ea] dark:bg-[#224432] text-[#1d6435] dark:text-[#9ef0b8] border border-[#1d6435]/30'
                            : 'bg-[#d9487d] hover:bg-[#c2366b] text-white active:scale-95'
                        }`}
                      >
                        {owned ? 'Saved in My Library' : `Buy & Save Strip (${comic.price} Coins)`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* TAB 3: MEADOWS GAZETTE LIBRARY */
            <div className="space-y-4">
              {/* Filter Bar & Clear Unkept Helper */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#3a2640]/15 dark:border-[#745694]/40">
                <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#ebe2d0] dark:bg-[#1d1527]">
                  {(
                    [
                      ['all', `All (${library.length})`],
                      ['kept', `Kept (${library.filter((i) => i.kept).length})`],
                      ['edition', `Issues (${library.filter((i) => i.type === 'edition').length})`],
                      ['comic', `Comics (${library.filter((i) => i.type === 'comic').length})`],
                    ] as [LibraryFilter, string][]
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setLibFilter(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                        libFilter === key
                          ? 'bg-white dark:bg-[#3b2c4e] text-[#2d1f33] dark:text-white shadow-xs'
                          : 'text-[#664e6a] dark:text-[#cbb3dc] hover:text-[#2d1f33]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {unkeptCount > 0 && onClearUnkeptLibraryItems && (
                  <button
                    onClick={() => {
                      setDeletedUndoItem(null);
                      onClearUnkeptLibraryItems();
                    }}
                    className="px-3 py-1.5 rounded-xl border border-[#d63649]/35 text-[#b42336] dark:text-[#ff8a98] hover:bg-[#d63649]/10 text-xs font-black cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Delete Unkept ({unkeptCount})
                  </button>
                )}
              </div>

              {/* Undo Toast inside Library */}
              {deletedUndoItem && onRestoreLibraryItem && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-[#fff2c2] dark:bg-[#3d3119] border border-[#d69e00]/40 text-xs font-bold">
                  <span>
                    Removed “{deletedUndoItem.title}” from your library.
                  </span>
                  <button
                    onClick={() => {
                      onRestoreLibraryItem(deletedUndoItem);
                      setDeletedUndoItem(null);
                    }}
                    className="px-3 py-1 rounded-lg bg-[#3a2640] text-white font-black cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Undo Delete
                  </button>
                </div>
              )}

              {/* Library Collection Grid / Empty State */}
              {filteredLibrary.length === 0 ? (
                <div className="py-10 px-4 text-center bg-white/60 dark:bg-black/15 border border-[#3a2640]/15 dark:border-[#745694]/40 rounded-2xl space-y-3">
                  <h4 className="text-base font-black">Your Meadows Gazette Library is empty</h4>
                  <p className="text-xs font-bold opacity-75 max-w-md mx-auto leading-relaxed">
                    Buy today’s full newspaper edition or individual daily comics to archive them permanently here. You can keep favorites or delete items anytime.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      onClick={() => setTab('edition')}
                      className="px-4 py-2 rounded-xl bg-[#d9487d] text-white text-xs font-black cursor-pointer"
                    >
                      Browse Today’s Paper
                    </button>
                    <button
                      onClick={() => setTab('comics')}
                      className="px-4 py-2 rounded-xl border border-[#3a2640]/20 dark:border-[#745694] text-xs font-black cursor-pointer"
                    >
                      Read Daily Comics
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {filteredLibrary.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white/85 dark:bg-black/25 border border-[#3a2640]/15 dark:border-[#745694]/40 rounded-2xl p-4 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-[#7c5b7a] dark:text-[#cbb3dc] tabular-nums">
                          {item.type === 'edition' ? 'Full Edition' : 'Comic Strip'}
                          <span aria-hidden="true"> · </span>
                          Issue #{item.issueNumber}
                          <span aria-hidden="true"> · </span>
                          {item.dateLabel}
                        </div>
                        <h4 className="text-sm sm:text-base font-black leading-snug">
                          {item.title}
                        </h4>
                        <p className="text-xs font-bold opacity-75">{item.subtitle}</p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#3a2640]/10 dark:border-white/10">
                        <button
                          onClick={() => setReadingItem(item)}
                          className="px-3.5 py-2 rounded-xl bg-[#3a2640] hover:bg-[#52375a] dark:bg-[#7c4dff] dark:hover:bg-[#6a3df0] text-white text-xs font-black cursor-pointer whitespace-nowrap shrink-0"
                        >
                          Read
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onToggleKeepLibraryItem(item.id)}
                            title={item.kept ? 'Remove Kept pin' : 'Keep in favorites'}
                            className={`px-3 py-2 rounded-xl text-xs font-black border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                              item.kept
                                ? 'bg-[#fff2c2] dark:bg-[#4c3e1b] border-[#d69e00]/50 text-[#735200] dark:text-[#ffe066]'
                                : 'border-[#3a2640]/20 dark:border-[#745694] hover:bg-[#3a2640]/5'
                            }`}
                          >
                            {item.kept ? '★ Kept' : '☆ Keep'}
                          </button>

                          <button
                            onClick={() => handleDeleteWithUndo(item)}
                            title="Delete from Library"
                            className="px-3 py-2 rounded-xl border border-[#d63649]/35 text-[#b42336] dark:text-[#ff8a98] hover:bg-[#d63649]/10 text-xs font-black cursor-pointer whitespace-nowrap shrink-0"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="px-4 sm:px-6 py-3 border-t border-[#3a2640]/15 dark:border-[#745694]/50 bg-[#f6efe2] dark:bg-[#231a2e] flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] font-bold opacity-75">
            {library.length} saved in Gazette Library · Fresh print every 2 min &amp; on every visit
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#3a2640] hover:bg-[#52375a] dark:bg-[#ff7aa8] dark:hover:bg-[#ff6598] text-white font-black text-xs rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
};
