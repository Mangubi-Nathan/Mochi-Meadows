/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WeatherConfig, WeatherId, WEATHER_TYPES } from './constants';

interface RainDrop {
  x: number;
  y: number;
  speed: number;
  length: number;
  alpha: number;
}

interface RainRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
}

interface Snowflake {
  x: number;
  y: number;
  radius: number;
  speed: number;
  swaySpeed: number;
  swayAmp: number;
  phase: number;
  alpha: number;
}

interface StardustMote {
  x: number;
  y: number;
  radius: number;
  speed: number;
  swaySpeed: number;
  swayAmp: number;
  phase: number;
  color: string;
  twinkleSpeed: number;
  isStar: boolean;
  rotation: number;
  rotSpeed: number;
}

interface Sunbeam {
  x: number;
  width: number;
  alpha: number;
  speed: number;
}

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseRgba(str: string): RGBA {
  const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (match) {
    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10),
      a: match[4] !== undefined ? parseFloat(match[4]) : 1,
    };
  }
  return { r: 255, g: 255, b: 255, a: 0 };
}

function lerpRgba(c1: RGBA, c2: RGBA, t: number): string {
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  const a = c1.a + (c2.a - c1.a) * t;
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}

interface MuffinDrift {
  x: number;
  y: number;
  speedY: number;
  speedX: number;
  phase: number;
  rot: number;
  scale: number;
}

export class WeatherSystem {
  public weatherList: WeatherConfig[] = WEATHER_TYPES;
  public currentIndex: number = 0;
  public targetIndex: number = 0;
  public transitionProgress: number = 1; // 1 = fully on current
  public isTransitioning: boolean = false;
  public transitionDuration: number = 7; // 7 seconds crossfade
  public weatherTimer: number;

  public onWeatherChanged?: (newWeather: WeatherConfig) => void;

  // Particle Pools
  private raindrops: RainDrop[] = [];
  private ripples: RainRipple[] = [];
  private snowflakes: Snowflake[] = [];
  private stardustMotes: StardustMote[] = [];
  private sunbeams: Sunbeam[] = [];
  private muffins: MuffinDrift[] = [];
  private parsedCache: Map<string, RGBA> = new Map();
  private cachedVig: { w: number; h: number; color: string; canvas: HTMLCanvasElement } | null = null;

  constructor() {
    this.weatherTimer = this.weatherList[0].duration;
    this.initParticles();
  }

  private getParsedRgba(str: string): RGBA {
    let cached = this.parsedCache.get(str);
    if (!cached) {
      cached = parseRgba(str);
      this.parsedCache.set(str, cached);
    }
    return cached;
  }

  private initParticles() {
    // 140 Raindrops
    for (let i = 0; i < 140; i++) {
      this.raindrops.push({
        x: Math.random() * 2000,
        y: Math.random() * 1200,
        speed: 600 + Math.random() * 350,
        length: 12 + Math.random() * 10,
        alpha: 0.35 + Math.random() * 0.45,
      });
    }

    // 90 Snowflakes
    for (let i = 0; i < 90; i++) {
      this.snowflakes.push({
        x: Math.random() * 2000,
        y: Math.random() * 1200,
        radius: 1.2 + Math.random() * 2.8,
        speed: 35 + Math.random() * 45,
        swaySpeed: 1 + Math.random() * 2,
        swayAmp: 15 + Math.random() * 25,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.4 + Math.random() * 0.5,
      });
    }

    // 70 Stardust Motes
    const starColors = [
      'rgba(255, 240, 160, 0.85)',
      'rgba(230, 175, 255, 0.85)',
      'rgba(170, 225, 255, 0.85)',
      'rgba(255, 210, 230, 0.85)',
      'rgba(255, 255, 255, 0.95)',
    ];
    for (let i = 0; i < 70; i++) {
      this.stardustMotes.push({
        x: Math.random() * 2000,
        y: Math.random() * 1200,
        radius: 1.5 + Math.random() * 3.5,
        speed: 25 + Math.random() * 35,
        swaySpeed: 0.8 + Math.random() * 1.5,
        swayAmp: 20 + Math.random() * 30,
        phase: Math.random() * Math.PI * 2,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        twinkleSpeed: 2 + Math.random() * 3,
        isStar: Math.random() > 0.4,
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 1.5,
      });
    }

    // 5 Sunbeams
    for (let i = 0; i < 5; i++) {
      this.sunbeams.push({
        x: i * 400 - 200,
        width: 140 + Math.random() * 100,
        alpha: 0.03 + Math.random() * 0.04,
        speed: 8 + Math.random() * 10,
      });
    }

    // 22 Floating Cloud Muffins for Muffin Breeze
    for (let i = 0; i < 22; i++) {
      this.muffins.push({
        x: Math.random() * 2000,
        y: Math.random() * 1200,
        speedY: 28 + Math.random() * 26,
        speedX: 16 + Math.random() * 18,
        phase: Math.random() * Math.PI * 2,
        rot: (Math.random() - 0.5) * 0.4,
        scale: 0.78 + Math.random() * 0.42,
      });
    }
  }

  public get currentWeather(): WeatherConfig {
    return this.weatherList[this.currentIndex];
  }

  public get targetWeather(): WeatherConfig {
    return this.weatherList[this.targetIndex];
  }

  public setWeather(idOrIndex: WeatherId | number) {
    let nextIdx = 0;
    if (typeof idOrIndex === 'number') {
      nextIdx = (idOrIndex % this.weatherList.length + this.weatherList.length) % this.weatherList.length;
    } else {
      const found = this.weatherList.findIndex((w) => w.id === idOrIndex);
      if (found !== -1) nextIdx = found;
    }

    if (nextIdx === this.currentIndex && !this.isTransitioning) return;

    this.targetIndex = nextIdx;
    this.isTransitioning = true;
    this.transitionProgress = 0;
    this.weatherTimer = this.weatherList[nextIdx].duration;

    if (this.onWeatherChanged) {
      this.onWeatherChanged(this.weatherList[nextIdx]);
    }
  }

  public cycleNextWeather() {
    const next = (this.currentIndex + 1) % this.weatherList.length;
    this.setWeather(next);
  }

  public update(dt: number, viewportWidth: number, viewportHeight: number, isDiving: boolean) {
    const w = Math.max(viewportWidth, 800);
    const h = Math.max(viewportHeight, 600);

    // Weather Transition Animation
    if (this.isTransitioning) {
      this.transitionProgress += dt / this.transitionDuration;
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this.isTransitioning = false;
        this.currentIndex = this.targetIndex;
      }
    } else {
      // Countdown current weather
      this.weatherTimer -= dt;
      if (this.weatherTimer <= 0) {
        this.cycleNextWeather();
      }
    }

    // Particle intensity based on current & target weather
    const activeParticleType = this.isTransitioning && this.transitionProgress > 0.5
      ? this.targetWeather.particleType
      : this.currentWeather.particleType;

    // Update Sunbeams (Active during sunny or light ambient)
    for (const beam of this.sunbeams) {
      beam.x += beam.speed * dt;
      if (beam.x > w + 300) {
        beam.x = -300;
      }
    }

    // Rain Simulation
    if (activeParticleType === 'rain' && !isDiving) {
      for (const drop of this.raindrops) {
        drop.y += drop.speed * dt;
        drop.x -= drop.speed * 0.25 * dt; // slight wind tilt
        if (drop.y > h) {
          drop.y = -drop.length;
          drop.x = Math.random() * (w + 200);

          // Spawn ground splash ripple occasionally
          if (this.ripples.length < 35 && Math.random() < 0.22) {
            this.ripples.push({
              x: drop.x,
              y: h - Math.random() * (h * 0.8),
              radius: 1,
              maxRadius: 8 + Math.random() * 10,
              alpha: 0.5,
              speed: 16 + Math.random() * 12,
            });
          }
        }
        if (drop.x < -100) drop.x = w + 100;
      }

      // Update ripples
      for (let i = this.ripples.length - 1; i >= 0; i--) {
        const r = this.ripples[i];
        r.radius += r.speed * dt;
        r.alpha -= (dt / 0.6) * 0.5;
        if (r.alpha <= 0 || r.radius >= r.maxRadius) {
          this.ripples.splice(i, 1);
        }
      }
    }

    // Snow Simulation
    if (activeParticleType === 'snow' && !isDiving) {
      for (const flake of this.snowflakes) {
        flake.y += flake.speed * dt;
        flake.phase += flake.swaySpeed * dt;
        flake.x += Math.sin(flake.phase) * flake.swayAmp * dt * 0.8;
        if (flake.y > h + 10) {
          flake.y = -10;
          flake.x = Math.random() * w;
        }
        if (flake.x < -20) flake.x = w + 20;
        if (flake.x > w + 20) flake.x = -20;
      }
    }

    // Stardust Simulation (Drifts in air or underwater)
    if (activeParticleType === 'stardust' || (isDiving && Math.random() < 0.3)) {
      for (const mote of this.stardustMotes) {
        mote.y += mote.speed * dt;
        mote.phase += mote.swaySpeed * dt;
        mote.x += Math.cos(mote.phase) * mote.swayAmp * dt * 0.7;
        mote.rotation += mote.rotSpeed * dt;
        if (mote.y > h + 15) {
          mote.y = -15;
          mote.x = Math.random() * w;
        }
        if (mote.x < -25) mote.x = w + 25;
        if (mote.x > w + 25) mote.x = -25;
      }
    }

    // Cloud Muffin Breeze Simulation
    if (activeParticleType === 'muffins' && !isDiving) {
      for (const m of this.muffins) {
        m.y += m.speedY * dt;
        m.phase += 1.5 * dt;
        m.x += (m.speedX + Math.sin(m.phase) * 14) * dt;
        if (m.y > h + 30) {
          m.y = -30;
          m.x = Math.random() * w;
        }
        if (m.x > w + 35) m.x = -35;
      }
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    isSky: boolean,
    isDiving: boolean,
    globalTime: number,
    lowQuality: boolean = false
  ) {
    if (!ctx || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return;
    }
    ctx.save();
    try {

    // 1. Compute Blended Colors (zero allocation when steady-state)
    const tintStr = isSky ? this.currentWeather.skyTint : this.currentWeather.tintColor;
    let finalTint: string;
    let finalVignette: string;

    if (this.isTransitioning) {
      const curTint = this.getParsedRgba(tintStr);
      const curVignette = this.getParsedRgba(this.currentWeather.vignetteColor);
      const tgtTint = this.getParsedRgba(isSky ? this.targetWeather.skyTint : this.targetWeather.tintColor);
      const tgtVignette = this.getParsedRgba(this.targetWeather.vignetteColor);
      finalTint = lerpRgba(curTint, tgtTint, this.transitionProgress);
      finalVignette = lerpRgba(curVignette, tgtVignette, this.transitionProgress);
    } else {
      finalTint = tintStr;
      finalVignette = this.currentWeather.vignetteColor;
    }

    // 2. Render Global Atmosphere Color Tint
    ctx.fillStyle = finalTint;
    ctx.fillRect(0, 0, width, height);

    // 3. Cached Edge Vignette (skipped in Low Graphics Mode)
    if (!lowQuality) {
      const iw = Math.max(1, Math.round(width));
      const ih = Math.max(1, Math.round(height));
      if (
        !this.cachedVig ||
        this.cachedVig.w !== iw ||
        this.cachedVig.h !== ih ||
        this.cachedVig.color !== finalVignette
      ) {
        const vigCanvas = this.cachedVig?.canvas || document.createElement('canvas');
        vigCanvas.width = iw;
        vigCanvas.height = ih;
        const vctx = vigCanvas.getContext('2d');
        if (vctx) {
          vctx.clearRect(0, 0, iw, ih);
          const maxDim = Math.max(2, Math.max(iw, ih) * 0.72);
          const vignette = vctx.createRadialGradient(
            iw / 2,
            ih / 2,
            maxDim * 0.25,
            iw / 2,
            ih / 2,
            maxDim
          );
          vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
          vignette.addColorStop(1, finalVignette);
          vctx.fillStyle = vignette;
          vctx.fillRect(0, 0, iw, ih);
        }
        this.cachedVig = { w: iw, h: ih, color: finalVignette, canvas: vigCanvas };
      }
      if (this.cachedVig.canvas.width > 0 && this.cachedVig.canvas.height > 0) {
        ctx.drawImage(this.cachedVig.canvas, 0, 0);
      }
    }

    // 4. Render Weather Specific Effects
    const weatherId = this.isTransitioning && this.transitionProgress > 0.5
      ? this.targetWeather.id
      : this.currentWeather.id;
    const step = lowQuality ? 2 : 1;

    // === SUNNY: Sunbeams & Ambient Glow ===
    if (weatherId === 'sunny' && !isDiving) {
      ctx.save();
      ctx.fillStyle = '#ffeba0';
      for (let i = 0; i < this.sunbeams.length; i += step) {
        const beam = this.sunbeams[i];
        ctx.globalAlpha = beam.alpha;
        ctx.beginPath();
        ctx.moveTo(beam.x, 0);
        ctx.lineTo(beam.x + beam.width, 0);
        ctx.lineTo(beam.x + beam.width - 150, height);
        ctx.lineTo(beam.x - 150, height);
        ctx.closePath();
        ctx.fill();
      }

      if (!lowQuality) {
        ctx.fillStyle = '#fff5be';
        const moteCount = 14;
        for (let i = 0; i < moteCount; i++) {
          const mx = (i * 137.5 + globalTime * 20) % width;
          const my = ((i * 83.2 - Math.sin(globalTime + i) * 30 + globalTime * 15) % height + height) % height;
          const pulse = Math.sin(globalTime * 2.5 + i) * 0.5 + 0.5;
          ctx.globalAlpha = 0.15 + pulse * 0.25;
          ctx.beginPath();
          ctx.arc(mx, my, 1.5 + pulse * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // === DRIZZLE: Rain Streaks & Ripples ===
    if (weatherId === 'drizzle' && !isDiving) {
      ctx.save();
      ctx.strokeStyle = 'rgba(180, 215, 255, 0.55)';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < this.raindrops.length; i += step) {
        const drop = this.raindrops[i];
        if (drop.x >= -50 && drop.x <= width + 50 && drop.y >= -50 && drop.y <= height + 50) {
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x - drop.length * 0.25, drop.y + drop.length);
        }
      }
      ctx.stroke();

      ctx.strokeStyle = '#c3e6ff';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < this.ripples.length; i += step) {
        const r = this.ripples[i];
        ctx.globalAlpha = Math.max(0, r.alpha);
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, Math.max(0.1, r.radius), Math.max(0.1, r.radius * 0.45), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // === SNOWY: Fluffy Snowflakes ===
    if (weatherId === 'snowy' && !isDiving) {
      ctx.save();
      for (let i = 0; i < this.snowflakes.length; i += step) {
        const flake = this.snowflakes[i];
        if (flake.x >= -30 && flake.x <= width + 30 && flake.y >= -30 && flake.y <= height + 30) {
          ctx.fillStyle = '#f5faff';
          ctx.globalAlpha = flake.alpha;
          ctx.beginPath();
          ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
          ctx.fill();

          if (!lowQuality && flake.radius > 2.2) {
            ctx.fillStyle = '#dcf0ff';
            ctx.globalAlpha = flake.alpha * 0.35;
            ctx.beginPath();
            ctx.arc(flake.x, flake.y, flake.radius * 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.restore();
    }

    // === GLOWING STARDUST: Luminous Star Motes ===
    if (weatherId === 'stardust') {
      ctx.save();
      for (let i = 0; i < this.stardustMotes.length; i += step) {
        const mote = this.stardustMotes[i];
        if (mote.x >= -40 && mote.x <= width + 40 && mote.y >= -40 && mote.y <= height + 40) {
          const twinkle = Math.sin(globalTime * mote.twinkleSpeed + mote.phase) * 0.5 + 0.5;
          const currentRadius = mote.radius * (0.8 + twinkle * 0.5);

          ctx.fillStyle = mote.color;
          if (!lowQuality) {
            ctx.globalAlpha = 0.22 + twinkle * 0.24;
            ctx.beginPath();
            ctx.arc(mote.x, mote.y, currentRadius * 2.1, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.globalAlpha = 0.85;
          if (mote.isStar) {
            this.drawSparkle(ctx, mote.x, mote.y, currentRadius * 1.8, mote.rotation);
          } else {
            ctx.beginPath();
            ctx.arc(mote.x, mote.y, currentRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.restore();
    }

    // === SHIMMERING AURORA: Skyborne Polar Ribbons ===
    if (weatherId === 'aurora' && !isDiving) {
      ctx.save();
      const ribbonCount = lowQuality ? 1 : 3;
      const bandColors = ['#64f5c1', '#b48cff', '#7de0ff'];
      for (let r = 0; r < ribbonCount; r++) {
        ctx.fillStyle = bandColors[r];
        ctx.globalAlpha = 0.08 + 0.04 * Math.sin(globalTime * 0.9 + r);
        ctx.beginPath();
        const baseY = height * (0.12 + r * 0.09);
        ctx.moveTo(0, baseY);
        for (let x = 0; x <= width + 80; x += 80) {
          const waveY = baseY + Math.sin(x * 0.006 + globalTime * 0.8 + r * 1.7) * 26;
          ctx.lineTo(x, waveY);
        }
        for (let x = width + 80; x >= 0; x -= 80) {
          const waveY = baseY + 56 + Math.cos(x * 0.005 + globalTime * 0.7 + r) * 20;
          ctx.lineTo(x, waveY);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // === CLOUD MUFFIN BREEZE: Floating Pastel Cloud Muffins ===
    if (weatherId === 'muffin_rain' && !isDiving) {
      ctx.save();
      for (let i = 0; i < this.muffins.length; i += step) {
        const m = this.muffins[i];
        if (m.x < -30 || m.x > width + 30 || m.y < -30 || m.y > height + 30) continue;
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(m.rot + Math.sin(m.phase) * 0.14);
        ctx.scale(m.scale, m.scale);
        ctx.globalAlpha = 0.82;
        // Wrapper cup
        ctx.fillStyle = i % 2 === 0 ? '#ff9ebb' : '#9be8d8';
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(6, 0);
        ctx.lineTo(4.5, 6);
        ctx.lineTo(-4.5, 6);
        ctx.closePath();
        ctx.fill();
        // Fluffy golden muffin top
        ctx.fillStyle = '#ffe0a3';
        ctx.beginPath();
        ctx.arc(0, -1, 6.8, Math.PI, 0);
        ctx.fill();
        // Icing dollop
        ctx.fillStyle = '#fffaf4';
        ctx.beginPath();
        ctx.arc(0, -5.5, 2.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    } finally {
      ctx.restore();
    }
  }

  private drawSparkle(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    rotation: number
  ) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.quadraticCurveTo(0, 0, radius * 0.3, 0);
    ctx.quadraticCurveTo(0, 0, 0, radius);
    ctx.quadraticCurveTo(0, 0, -radius * 0.3, 0);
    ctx.quadraticCurveTo(0, 0, 0, -radius);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-radius, 0);
    ctx.quadraticCurveTo(0, 0, 0, radius * 0.3);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.quadraticCurveTo(0, 0, 0, -radius * 0.3);
    ctx.quadraticCurveTo(0, 0, -radius, 0);
    ctx.fill();
    ctx.restore();
  }
}
