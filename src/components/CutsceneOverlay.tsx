import React, { useRef, useEffect, useState } from 'react';
import { CutsceneSlide } from '../game/cutscenes';
import { PlayerLook } from '../game/engine';

interface CutsceneOverlayProps {
  slides: CutsceneSlide[];
  playerLook: PlayerLook;
  getNpcLook: (name: string) => PlayerLook | null;
  onFinish: () => void;
}

export const CutsceneOverlay: React.FC<CutsceneOverlayProps> = ({
  slides,
  playerLook,
  getNpcLook,
  onFinish,
}) => {
  const [slideIdx, setSlideIdx] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [speakerName, setSpeakerName] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentSlide = slides[slideIdx];
  const slideIdxRef = useRef(slideIdx);
  slideIdxRef.current = slideIdx;
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const handleNext = () => {
    if (slideIdxRef.current < slides.length - 1) {
      setSlideIdx(slideIdxRef.current + 1);
    } else {
      onFinishRef.current();
    }
  };

  // Keep canvas crisp & matched to viewport on resize/rotation
  const sizeRef = useRef({ w: window.innerWidth || 800, h: window.innerHeight || 600, dpr: 1 });

  useEffect(() => {
    const syncSize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const vw = Math.max(1, window.visualViewport?.width ?? window.innerWidth);
      const vh = Math.max(1, window.visualViewport?.height ?? window.innerHeight);
      const maxDpr = Math.min(vw, vh) <= 520 ? 1.3 : 1.6;
      const dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
      sizeRef.current = { w: vw, h: vh, dpr };
      canvas.width = Math.floor(vw * dpr);
      canvas.height = Math.floor(vh * dpr);
    };

    window.addEventListener('resize', syncSize);
    window.addEventListener('orientationchange', syncSize);
    window.visualViewport?.addEventListener('resize', syncSize);
    syncSize();
    return () => {
      window.removeEventListener('resize', syncSize);
      window.removeEventListener('orientationchange', syncSize);
      window.visualViewport?.removeEventListener('resize', syncSize);
    };
  }, []);

  // Run slide drawing loop
  useEffect(() => {
    if (!currentSlide) return;

    let animId: number;
    let t = 0;
    const startTime = performance.now();

    // Parse speaker name if format is "Speaker|Text"
    const parts = currentSlide.text.split('|');
    const textBody = parts.length > 1 ? parts[1] : parts[0];
    const speaker = parts.length > 1 ? parts[0] : '';
    setSpeakerName(speaker);

    // Typing effect
    let charIdx = 0;
    const typeTimer = setInterval(() => {
      charIdx += 2;
      setTypedText(textBody.slice(0, charIdx));
      if (charIdx >= textBody.length) {
        clearInterval(typeTimer);
      }
    }, 25);

    const render = (now: number) => {
      t = (now - startTime) / 1000;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const { w: W, h: H, dpr } = sizeRef.current;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, W, H);

          const isShortLandscape = H <= 480 && W > H;
          const topBar = isShortLandscape ? H * 0.04 : H * 0.07;
          const stageH = isShortLandscape ? H * 0.72 : H * 0.76;

          // Widescreen viewport clipping
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, topBar, W, stageH);
          ctx.clip();
          ctx.translate(0, topBar);

          currentSlide.draw(ctx, t, W, stageH, Math.min(W, stageH), playerLook, getNpcLook);

          ctx.restore();

          // Fade in / out black borders
          const fade = Math.min(1, t / 0.7, (currentSlide.duration - t) / 0.7);
          ctx.fillStyle = `rgba(0,0,0,${1 - Math.max(0, fade)})`;
          ctx.fillRect(0, 0, W, H);
        }
      }

      if (t >= currentSlide.duration) {
        handleNext();
      } else {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(typeTimer);
    };
  }, [slideIdx, currentSlide, playerLook, getNpcLook]);

  return (
    <div
      onClick={handleNext}
      className="fixed inset-0 z-50 bg-black cursor-pointer select-none pointer-events-auto flex flex-col justify-between pt-safe pb-safe pl-safe pr-safe"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block -z-10"
      />

      {/* Skip Button */}
      <div className="flex justify-end p-3 sm:p-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFinish();
          }}
          className="min-h-[38px] px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/40 border border-white/50 text-white font-black text-xs tracking-wider transition-colors backdrop-blur-xs cursor-pointer"
        >
          Skip ▸▸
        </button>
      </div>

      {/* Subtitle Banner */}
      <div className="pb-4 sm:pb-12 px-4 sm:px-6 text-center max-w-3xl mx-auto w-full pointer-events-none">
        {speakerName && (
          <div className="text-[#ffd23f] font-black text-xs sm:text-base tracking-wide drop-shadow-md mb-0.5 sm:mb-1">
            {speakerName}
          </div>
        )}
        <div className="text-[#fff7e6] font-black text-sm xs:text-base sm:text-2xl leading-snug sm:leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
          {typedText}
        </div>
        <div className="text-white/45 text-[10px] sm:text-[11px] font-bold mt-1 sm:mt-2">
          (Tap anywhere to advance)
        </div>
      </div>
    </div>
  );
};
