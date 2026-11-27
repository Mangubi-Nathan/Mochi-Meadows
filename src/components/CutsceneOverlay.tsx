import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CutsceneSlide } from '../game/cutscenes';
import { Cutscene3DStageRenderer } from '../game/cutscene3D';
import { SeasonId } from '../game/constants';
import { PlayerLook } from '../game/engine';
import { multiTouchTap } from '../utils/touchTap';

interface CutsceneOverlayProps {
  slides: CutsceneSlide[];
  playerLook: PlayerLook;
  getNpcLook: (name: string) => PlayerLook | null;
  season?: SeasonId;
  onFinish: () => void;
}

export const CutsceneOverlay: React.FC<CutsceneOverlayProps> = ({
  slides,
  playerLook,
  getNpcLook,
  season = 'spring',
  onFinish,
}) => {
  const [slideIdx, setSlideIdx] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [speakerName, setSpeakerName] = useState('');

  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvas3DRef = useRef<HTMLCanvasElement | null>(null);
  const fallbackCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fadeOverlayRef = useRef<HTMLDivElement | null>(null);
  const stage3DRef = useRef<Cutscene3DStageRenderer | null>(null);

  const safeSlideIdx = slides.length > 0 ? Math.min(slideIdx, slides.length - 1) : 0;
  const currentSlide = slides[safeSlideIdx];
  const has3D = Boolean(currentSlide?.scene3D);

  const slideIdxRef = useRef(safeSlideIdx);
  slideIdxRef.current = safeSlideIdx;
  const slidesLenRef = useRef(slides.length);
  slidesLenRef.current = slides.length;
  const slideDoneRef = useRef(false);
  const currentSlideRef = useRef(currentSlide);
  currentSlideRef.current = currentSlide;
  const playerLookRef = useRef(playerLook);
  playerLookRef.current = playerLook;
  const getNpcLookRef = useRef(getNpcLook);
  getNpcLookRef.current = getNpcLook;
  const seasonRef = useRef(season);
  seasonRef.current = season;
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const sizeRef = useRef({ w: 800, h: 450, dpr: 1 });

  useEffect(() => {
    slideDoneRef.current = false;
    setSlideIdx(0);
  }, [slides]);

  const handleNext = useCallback(() => {
    if (slideDoneRef.current) return;
    slideDoneRef.current = true;
    if (slideIdxRef.current < slidesLenRef.current - 1) {
      setSlideIdx(slideIdxRef.current + 1);
    } else {
      onFinishRef.current();
    }
  }, []);

  const handleSkip = useCallback(() => {
    if (slideDoneRef.current) return;
    slideDoneRef.current = true;
    onFinishRef.current();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      } else if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleNext, handleSkip]);

  // Initialize persistent 3D Cutscene Stage Renderer once per overlay mount
  useEffect(() => {
    const canvas = canvas3DRef.current;
    const stageEl = stageRef.current;
    if (!canvas || !stageEl) return;

    const rect = stageEl.getBoundingClientRect();
    const initW = Math.max(1, Math.floor(rect.width || window.innerWidth));
    const initH = Math.max(1, Math.floor(rect.height || window.innerHeight * 0.76));
    const renderer3D = new Cutscene3DStageRenderer(canvas, initW, initH);
    stage3DRef.current = renderer3D;

    const syncSize = () => {
      const el = stageRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const w = Math.max(1, Math.floor(r.width));
      const h = Math.max(1, Math.floor(r.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { w, h, dpr };
      renderer3D.resize(w, h);
      const fb = fallbackCanvasRef.current;
      if (fb) {
        fb.width = Math.floor(w * dpr);
        fb.height = Math.floor(h * dpr);
      }
    };

    window.addEventListener('resize', syncSize);
    window.addEventListener('orientationchange', syncSize);
    window.visualViewport?.addEventListener('resize', syncSize);
    syncSize();

    return () => {
      window.removeEventListener('resize', syncSize);
      window.removeEventListener('orientationchange', syncSize);
      window.visualViewport?.removeEventListener('resize', syncSize);
      renderer3D.dispose();
      stage3DRef.current = null;
    };
  }, []);

  // Configure current slide cast/environment & drive animation loop
  useEffect(() => {
    slideDoneRef.current = false;
    if (!currentSlide) {
      onFinishRef.current();
      return;
    }

    const renderer3D = stage3DRef.current;
    if (renderer3D && currentSlide.scene3D) {
      renderer3D.setSlide(
        currentSlide.scene3D,
        playerLookRef.current,
        getNpcLookRef.current,
        seasonRef.current
      );
    }

    // Parse speaker name if format is "Speaker|Text"
    const parts = currentSlide.text.split('|');
    const textBody = parts.length > 1 ? parts[1] : parts[0];
    const speaker = parts.length > 1 ? parts[0] : '';
    setSpeakerName(speaker);
    setTypedText('');

    // Typewriter subtitle reveal
    let charIdx = 0;
    const typeTimer = setInterval(() => {
      charIdx += 2;
      setTypedText(textBody.slice(0, charIdx));
      if (charIdx >= textBody.length) {
        clearInterval(typeTimer);
      }
    }, 24);

    let animId = 0;
    const startTime = performance.now();
    let prevNow = startTime;

    const renderFrame = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const dt = Math.min(0.05, Math.max(0.001, (now - prevNow) / 1000));
      prevNow = now;

      const slide = currentSlideRef.current;
      if (!slide) return;

      if (slide.scene3D && stage3DRef.current) {
        stage3DRef.current.render(dt, slide.duration, playerLookRef.current);
      } else if (fallbackCanvasRef.current) {
        const ctx = fallbackCanvasRef.current.getContext('2d');
        if (ctx) {
          const { w, h, dpr } = sizeRef.current;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          slide.draw(
            ctx,
            elapsed,
            w,
            h,
            Math.min(w, h),
            playerLookRef.current,
            getNpcLookRef.current
          );
        }
      }

      // Smooth fade-in / fade-out cinema vignette without React re-renders
      if (fadeOverlayRef.current) {
        const fadeVis = Math.min(1, elapsed / 0.65, (slide.duration - elapsed) / 0.65);
        fadeOverlayRef.current.style.opacity = String(1 - Math.max(0, fadeVis));
      }

      if (elapsed >= slide.duration) {
        handleNext();
      } else {
        animId = requestAnimationFrame(renderFrame);
      }
    };

    animId = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(typeTimer);
    };
  }, [safeSlideIdx, currentSlide, season, handleNext]);

  return (
    <div
      onClick={handleNext}
      className="fixed inset-0 z-50 bg-black cursor-pointer select-none pointer-events-auto touch-none flex flex-col justify-between pt-safe pb-safe pl-safe pr-safe"
    >
      {/* Top Cinema Letterbox Bar & Controls */}
      <div className="relative z-20 flex items-center justify-between px-3 sm:px-5 py-2 sm:py-3 shrink-0">
        {slides.length > 1 ? (
          <div className="flex items-center gap-1.5">
            {slides.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === safeSlideIdx ? 'w-5 bg-[#ffd23f]' : 'w-1.5 bg-white/30'
                }`}
              />
            ))}
          </div>
        ) : (
          <div />
        )}

        <button
          type="button"
          {...multiTouchTap(handleSkip)}
          className="min-h-[36px] px-4 py-1.5 touch-none rounded-full bg-[#241638]/80 hover:bg-[#362254]/90 border border-white/40 text-white font-black text-xs tracking-wider transition-colors cursor-pointer"
        >
          Skip ▸▸
        </button>
      </div>

      {/* Widescreen 3D Stage */}
      <div
        ref={stageRef}
        className="relative flex-1 w-full overflow-hidden"
      >
        <canvas
          ref={canvas3DRef}
          className={`w-full h-full block ${has3D ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        />
        {!has3D && (
          <canvas
            ref={fallbackCanvasRef}
            className="absolute inset-0 w-full h-full block"
          />
        )}
        <div
          ref={fadeOverlayRef}
          className="absolute inset-0 bg-black pointer-events-none"
          style={{ opacity: 1 }}
        />
      </div>

      {/* Bottom Cinema Letterbox & Subtitles */}
      <div className="relative z-20 pt-2.5 pb-4 sm:pb-6 px-4 sm:px-6 text-center max-w-3xl mx-auto w-full pointer-events-none shrink-0">
        {speakerName && (
          <div className="text-[#ffd23f] font-black text-xs sm:text-base tracking-wide drop-shadow-md mb-0.5 sm:mb-1">
            {speakerName}
          </div>
        )}
        <div className="text-[#fff7e6] font-black text-sm xs:text-base sm:text-xl leading-snug sm:leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
          {typedText}
        </div>
        <div className="text-white/45 text-[10px] sm:text-[11px] font-bold mt-1 sm:mt-1.5">
          (Tap anywhere to advance)
        </div>
      </div>
    </div>
  );
};
