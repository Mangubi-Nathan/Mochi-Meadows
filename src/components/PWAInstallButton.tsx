import React, { useState } from 'react';
import { usePWAInstall } from '../game/usePWAInstall';
import { audio } from '../game/audio';

interface PWAInstallButtonProps {
  variant?: 'title' | 'menu';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'title' }) => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isOnline,
    offlineReady,
    isPreparingOffline,
    install,
    prepareOfflinePlay,
  } = usePWAInstall();

  const [showGuideModal, setShowGuideModal] = useState(false);
  const [packFeedback, setPackFeedback] = useState('');

  const handlePrepareOffline = async () => {
    audio.chime?.();
    const res = await prepareOfflinePlay();
    if (res.swActive || res.fontsCached) {
      setPackFeedback('All worlds, fonts, music & saves cached for offline play!');
    } else if (!isOnline) {
      setPackFeedback('Running offline — core game & procedural audio ready!');
    } else {
      setPackFeedback('Offline cache refreshed! You can play anytime offline.');
    }
    window.setTimeout(() => setPackFeedback(''), 3500);
  };

  // Native Chromium / Android / Desktop install flow (suppress button if already standalone installed)
  if (isInstallable && !isInstalled) {
    return (
      <button
        onClick={() => {
          audio.chime?.();
          install();
        }}
        className={
          variant === 'menu'
            ? 'w-full p-3.5 bg-linear-to-r from-[#5ea0de] to-[#7b6ef6] hover:brightness-105 text-white font-black text-sm rounded-2xl shadow-md transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-between cursor-pointer'
            : 'w-full py-2 px-3 bg-linear-to-r from-[#5ea0de] via-[#6e8cf2] to-[#8f7bff] hover:brightness-105 text-white font-black text-xs sm:text-sm rounded-2xl border border-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_8px_18px_-6px_rgba(65,80,180,0.45)] transition-all hover:scale-[1.015] active:scale-95 flex items-center justify-center gap-2 cursor-pointer'
        }
      >
        <div className="flex items-center gap-2">
          <span>📲</span>
          <span>Download &amp; Install for Offline Play</span>
        </div>
        {variant === 'menu' && <span className="text-xs opacity-90">Full Game</span>}
      </button>
    );
  }

  // iOS Safari Add to Home Screen Flow (hidden when already installed)
  if (isIOS && !isInstalled) {
    return (
      <>
        <button
          onClick={() => {
            audio.noteSpeech?.(80);
            setShowGuideModal(true);
            prepareOfflinePlay();
          }}
          className={
            variant === 'menu'
              ? 'w-full p-3.5 bg-linear-to-r from-[#5ea0de] to-[#7b6ef6] hover:brightness-105 text-white font-black text-sm rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-between cursor-pointer'
              : 'w-full py-2 px-3 storybook-panel border border-[#9fd4ff] dark:border-[#6b4a7a] hover:border-[#ff7aa8] text-[#4a3550] dark:text-[#fdeeff] font-black text-xs rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer'
          }
        >
          <span>📲</span>
          <span>Install on iPhone / iPad (Play Offline)</span>
        </button>

        {showGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-modal-safe bg-black/55 backdrop-blur-xs">
            <div className="w-full max-w-sm storybook-modal rounded-3xl p-5 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base sm:text-lg font-black text-[#4a3550] dark:text-[#fdeeff] flex items-center gap-2">
                  <span>📲</span>
                  <span>Play Offline on iOS</span>
                </h3>
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="w-8 h-8 rounded-full storybook-well hover:bg-[#ff7aa8] hover:text-white text-xs font-black flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <ol className="text-xs text-[#5a425f] dark:text-[#d4c3db] space-y-2 font-bold list-decimal list-inside leading-relaxed">
                <li>
                  Tap the <strong>Share</strong> button in Safari&apos;s toolbar.
                </li>
                <li>
                  Scroll down and choose <strong>Add to Home Screen</strong>.
                </li>
                <li>
                  Launch Mochi Meadows 2 from your Home Screen anytime — full world, music, cottage, Gazette, and saves work offline!
                </li>
              </ol>
              <button
                onClick={() => setShowGuideModal(false)}
                className="w-full py-2.5 bg-linear-to-r from-[#ff7aa8] to-[#f46496] text-white text-xs font-black rounded-xl shadow-md cursor-pointer"
              >
                Got it! ✨
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Installed standalone OR non-prompt desktop browsers: show Offline Pack readiness badge / sync button
  return (
    <div className="w-full flex flex-col gap-1">
      <button
        onClick={handlePrepareOffline}
        disabled={isPreparingOffline}
        className={
          variant === 'menu'
            ? 'w-full p-3 bg-white/75 dark:bg-black/25 border-2 border-[#7bd88f]/70 dark:border-[#5ec474]/60 hover:border-[#ff7aa8] rounded-2xl text-xs font-black flex items-center justify-between gap-2 cursor-pointer transition-all'
            : 'w-full py-1.5 px-3 storybook-panel border border-[#ffd3e2]/90 dark:border-[#6b4a7a]/90 hover:border-[#7bd88f] text-[#4a3550] dark:text-[#fdeeff] font-black text-[11px] sm:text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer'
        }
      >
        <span>{isPreparingOffline ? '⏳' : offlineReady ? '✅' : '📥'}</span>
        <span>
          {isPreparingOffline
            ? 'Caching Game for Offline Play...'
            : !isOnline
            ? 'Offline Mode Active · Full Game Ready'
            : isInstalled
            ? 'Installed · Offline Mode Ready'
            : offlineReady
            ? 'Offline Mode Ready · Refresh Pack'
            : 'Cache Full Game for Offline Play'}
        </span>
      </button>
      {packFeedback && (
        <div className="text-[10.5px] font-black text-center text-[#2f8545] dark:text-[#8fe0a3] bg-[#e5f6ea]/90 dark:bg-[#1f3b2c] px-2.5 py-1 rounded-xl">
          {packFeedback}
        </div>
      )}
    </div>
  );
};
