import React, { useState, useEffect } from 'react';
import {
  BottleMessage,
  castBottleOfflineFirst,
  fetchBottlesOfflineFirst,
  getCachedBottles,
  likeBottleOfflineFirst,
} from '../game/offlineStore';

interface BottleModalProps {
  playerName: string;
  onClose: () => void;
}

export const BottleModal: React.FC<BottleModalProps> = ({ playerName, onClose }) => {
  const [bottles, setBottles] = useState<BottleMessage[]>(() => getCachedBottles());
  const [newMessage, setNewMessage] = useState('');
  const [locationType, setLocationType] = useState<'sea' | 'sky' | 'meadow'>('sea');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    fetchBottles();
  }, []);

  const fetchBottles = async () => {
    const res = await fetchBottlesOfflineFirst();
    setBottles(res.bottles);
  };

  const handleSendBottle = async () => {
    if (!newMessage.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setStatusMsg('');

    try {
      const result = await castBottleOfflineFirst({
        sender: playerName || 'Mochi Traveler',
        location: locationType,
        message: newMessage.trim(),
      });
      setNewMessage('');
      setStatusMsg(
        result.syncedOnline
          ? 'Your bottle drifted out into the currents! ✨'
          : 'Saved to your local tide — will share to islanders when back online! 🌊'
      );
      setBottles(getCachedBottles());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (id: string) => {
    const updatedLikes = await likeBottleOfflineFirst(id);
    setBottles((prev) =>
      prev.map((b) => (b.id === id ? { ...b, likes: updatedLikes } : b))
    );
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-modal-safe bg-[#160f24]/92 pointer-events-auto">
      <div className="w-full max-w-lg storybook-modal rounded-2xl sm:rounded-3xl p-3 sm:p-5 max-h-[94dvh] flex flex-col gap-2.5 sm:gap-3 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f0c7d8]/80 dark:border-[#5b3b6b]/80 pb-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl sm:text-2xl shrink-0">🍾</span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-[#4a3550] dark:text-[#fdeeff] leading-tight truncate">
                Message in a Bottle & Sky Letters
              </h2>
              <p className="text-[10px] sm:text-[11px] font-bold text-[#d85784] dark:text-[#ff9ec0] truncate">
                Notes washed ashore or carried by Cirrus winds
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full storybook-card hover:bg-[#ffd3e2]/50 text-[#4a3550] dark:text-[#fdeeff] font-black text-xs flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Compose Form */}
        <div className="storybook-card rounded-2xl p-3 space-y-2 shrink-0">
          <div className="flex flex-wrap justify-between items-center gap-2 text-xs font-black">
            <span>Write a cozy note:</span>
            <div className="flex gap-1">
              {[
                ['sea', '🌊 Sea'],
                ['sky', '☁️ Sky Wind'],
                ['meadow', '🌸 Meadow'],
              ].map(([loc, label]) => (
                <button
                  key={loc}
                  onClick={() => setLocationType(loc as any)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition-colors cursor-pointer whitespace-nowrap ${
                    locationType === loc
                      ? 'bg-[#ff7aa8] text-white'
                      : 'bg-black/5 dark:bg-white/5 opacity-75 hover:opacity-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value.slice(0, 140))}
            placeholder="Cast your warm wishes or cozy secrets into the island breeze…"
            rows={2}
            className="w-full bg-white dark:bg-[#2b2137] border border-[#f0c7d8] dark:border-[#6b4a7a] focus:border-[#ff7aa8] rounded-xl p-2 text-xs font-bold text-[#4a3550] dark:text-[#fdeeff] outline-none resize-none"
          />
          <div className="flex justify-between items-center gap-2">
            <span className="text-[10px] opacity-70 font-bold truncate">
              {newMessage.length} / 140 {statusMsg && `· ${statusMsg}`}
            </span>
            <button
              onClick={handleSendBottle}
              disabled={isSubmitting || !newMessage.trim()}
              className="px-4 py-1.5 rounded-xl bg-linear-to-r from-[#ff7aa8] to-[#f46496] hover:brightness-105 text-white text-xs font-black transition-transform active:scale-95 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Cast Into the Tide 🌊
            </button>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 pr-1">
          {bottles.map((b) => (
            <div
              key={b.id}
              className="p-3 storybook-card rounded-2xl text-xs space-y-1"
            >
              <div className="flex justify-between items-center font-black gap-2">
                <span className="text-[#d85784] dark:text-[#ff9ec0] flex items-center gap-1 truncate">
                  <span>{b.location === 'sky' ? '🪶' : b.location === 'meadow' ? '🌸' : '🐚'}</span>
                  <span className="truncate">{b.sender}</span>
                </span>
                <button
                  onClick={() => handleLike(b.id)}
                  className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#ffd3e2]/45 hover:bg-[#ff7aa8] hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  <span>❤️</span>
                  <span>{b.likes}</span>
                </button>
              </div>
              <div className="font-bold text-[#4a3550] dark:text-[#fdeeff] leading-relaxed">
                “{b.message}”
              </div>
              <div className="text-[10px] opacity-60 text-right">
                {new Date(b.timestamp).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
