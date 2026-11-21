import React, { useRef, useEffect, useState } from 'react';
import { FISH_SPECIES } from '../game/constants';
import { audio } from '../game/audio';

interface FishingMinigameProps {
  hasSturdyRod: boolean;
  onCatchFish: (fishName: string, coinsEarned: number) => void;
  onClose: () => void;
}

export const FishingMinigame: React.FC<FishingMinigameProps> = ({
  hasSturdyRod,
  onCatchFish,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tries, setTries] = useState(3);
  const [statusMsg, setStatusMsg] = useState('Press Reel! (or Space) when the marker is in the green zone!');
  const [markerPos, setMarkerPos] = useState(0);
  const [catchZone, setCatchZone] = useState<[number, number]>([0.4, 0.6]);

  const zoneWidth = hasSturdyRod ? 0.26 : 0.16;

  // Reset zone
  const randomizeZone = () => {
    const start = 0.12 + Math.random() * (0.76 - zoneWidth);
    setCatchZone([start, start + zoneWidth]);
  };

  useEffect(() => {
    randomizeZone();
  }, [hasSturdyRod]);

  // Marker animation loop
  useEffect(() => {
    let animId: number;
    let pos = 0;
    let dir = 1;
    let speed = 1.0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      pos += speed * dt * dir * 1.1;
      if (pos > 1) {
        pos = 1;
        dir = -1;
      } else if (pos < 0) {
        pos = 0;
        dir = 1;
      }
      setMarkerPos(pos);

      // Render canvas (crisp HiDPI backing buffer, logical 320x130 coordinates)
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = Math.min(1.5, window.devicePixelRatio || 1);
        const w = 320;
        const h = 130;
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, w, h);

          // Soft sky & watercolor sea backdrop
          const g = ctx.createLinearGradient(0, 0, 0, h);
          g.addColorStop(0, '#9be0ff');
          g.addColorStop(0.32, '#dff6ff');
          g.addColorStop(0.33, '#5bc5e8');
          g.addColorStop(1, '#266da8');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);

          // Gentle water ripples
          ctx.strokeStyle = 'rgba(255,255,255,0.38)';
          ctx.lineWidth = 1.6;
          for (let r = 0; r < 2; r++) {
            const rad = 10 + ((now * 0.018 + r * 14) % 26);
            ctx.beginPath();
            ctx.ellipse(w / 2, 43, rad * 1.6, rad * 0.36, 0, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Rounded catch gauge track
          const barX = 20;
          const barY = 58;
          const barW = w - 40;
          const barH = 26;

          ctx.fillStyle = 'rgba(18, 45, 80, 0.35)';
          ctx.beginPath();
          ctx.roundRect(barX, barY, barW, barH, 13);
          ctx.fill();

          // Emerald catch zone
          ctx.fillStyle = '#7bd88f';
          ctx.beginPath();
          ctx.roundRect(barX + catchZone[0] * barW, barY + 2, (catchZone[1] - catchZone[0]) * barW, barH - 4, 10);
          ctx.fill();

          // Outer cream frame
          ctx.strokeStyle = 'rgba(255,255,255,0.92)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(barX, barY, barW, barH, 13);
          ctx.stroke();

          // Moving cork marker
          const mx = barX + pos * barW;
          ctx.fillStyle = '#fffaf2';
          ctx.beginPath();
          ctx.roundRect(mx - 4, barY - 5, 8, barH + 10, 4);
          ctx.fill();
          ctx.strokeStyle = '#d85784';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Drawn red-and-cream wooden bobber
          const by = 33 + Math.sin(now / 220) * 3;
          ctx.fillStyle = '#ff6f91';
          ctx.beginPath();
          ctx.arc(w / 2, by, 7, Math.PI, 0);
          ctx.fill();
          ctx.fillStyle = '#fffaf2';
          ctx.beginPath();
          ctx.arc(w / 2, by, 7, 0, Math.PI);
          ctx.fill();
          ctx.fillStyle = '#d9534f';
          ctx.fillRect(w / 2 - 1.2, by - 12, 2.4, 6);

          // Remaining tries fish icons
          ctx.font = '18px sans-serif';
          ctx.textAlign = 'center';
          for (let i = 0; i < tries; i++) {
            ctx.fillText('🐟', w / 2 - 36 + i * 36, 114);
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [catchZone, tries]);

  // Reel action
  const handleReel = () => {
    if (tries <= 0) return;

    if (markerPos >= catchZone[0] && markerPos <= catchZone[1]) {
      // Pick random fish by weight
      const totalWeight = FISH_SPECIES.reduce((sum, f) => sum + f.weight, 0);
      let r = Math.random() * totalWeight;
      let caught = FISH_SPECIES[0];
      for (const f of FISH_SPECIES) {
        if (r < f.weight) {
          caught = f;
          break;
        }
        r -= f.weight;
      }

      audio.chime();
      setStatusMsg(`✨ You caught a ${caught.icon} ${caught.name}! +${caught.coins} coins!`);
      onCatchFish(caught.name, caught.coins);
      randomizeZone();
    } else {
      audio.pop();
      const rem = tries - 1;
      setTries(rem);
      if (rem > 0) {
        setStatusMsg(`Missed! ${rem} ${rem === 1 ? 'try' : 'tries'} remaining.`);
      } else {
        setStatusMsg('The fish swam away into the deep…');
        setTimeout(onClose, 1200);
      }
    }
  };

  // Keyboard Space listener
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReel();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [markerPos, catchZone, tries]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-modal-safe bg-black/45 backdrop-blur-sm pointer-events-auto">
      <div className="w-full max-w-sm max-h-[94dvh] overflow-y-auto storybook-modal rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-150">
        <div className="text-center">
          <h3 className="font-black text-lg text-[#4a3550] dark:text-[#fdeeff] flex items-center justify-center gap-1.5">
            <span>🎣</span> Fishing by the Shore
          </h3>
          <div className="text-xs font-bold text-[#d85784] dark:text-[#ff9ec0] mt-0.5 leading-snug">{statusMsg}</div>
        </div>

        <canvas
          ref={canvasRef}
          className="w-full aspect-320/130 max-h-36 rounded-2xl border border-[#f0c7d8] dark:border-[#6b4a7a] bg-[#8ed0ff] shadow-inner block"
        />

        <div className="flex gap-2 w-full">
          <button
            onClick={handleReel}
            disabled={tries <= 0}
            className="flex-1 py-2.5 bg-linear-to-r from-[#7bd88f] to-[#5ec474] hover:brightness-105 disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-md transition-transform active:scale-95 cursor-pointer"
          >
            🎣 Reel! (Space)
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 storybook-card hover:border-[#ff7aa8] font-black text-xs rounded-2xl transition-colors cursor-pointer"
          >
            Stop
          </button>
        </div>
      </div>
    </div>
  );
};
