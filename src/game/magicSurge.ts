/**
 * Mochi Meadows 2: High-Performance Pooled Magic Surge & Elemental VFX Engine
 *
 * Uses pre-allocated monomorphic object pools and O(1) swap-and-pop recycling
 * (zero per-frame heap allocations or Array.splice shifts) for particles and
 * magic rings across all 14 spells × 4 seasons in both 3D WebGL and 2D Canvas.
 *
 * Every element produces tailored multi-stage emitters, calibrated screen-flash,
 * and dual-harmonic screenshake matching its spell description in constants.ts.
 */

import type { SeasonId } from './constants';
import type { MagicRing, Particle, ParticleShape } from './engine';
import { getSeasonalSpellVariant } from './seasonalSpells';

export type MagicElementType =
  | 'celestial'
  | 'wind'
  | 'lightning'
  | 'ice'
  | 'water'
  | 'lunar'
  | 'nature'
  | 'empathy'
  | 'fire'
  | 'sound'
  | 'astral'
  | 'solar'
  | 'arcane'
  | 'harmony';

export interface ScreenShakeState {
  intensity: number;
  duration: number;
  elapsed: number;
  freq: number;
  seed: number;
  offsetX: number;
  offsetY: number;
}

export interface ElementalSurgeProfile {
  element: MagicElementType;
  flashAlpha: number;
  shakeIntensity: number;
  shakeDuration: number;
  shakeFreq: number;
}

export interface MagicSurgeParams {
  particles: Particle[];
  magicRings: MagicRing[];
  spellId: string;
  season: SeasonId;
  x: number;
  y: number;
  dirX?: number;
  dirY?: number;
  targetX?: number;
  targetY?: number;
  companionX?: number;
  companionY?: number;
  subtype?: 'cast' | 'landing' | 'arrival';
  lowQuality?: boolean;
  triggerFlash?: (color: string, alpha: number) => void;
  triggerShake?: (intensity: number, duration?: number, freq?: number) => void;
}

export interface PooledParticleSpec {
  x: number;
  y: number;
  vx: number;
  vy: number;
  l: number;
  c: string;
  maxL?: number;
  z?: number;
  vz?: number;
  ax?: number;
  ay?: number;
  az?: number;
  drag?: number;
  swirl?: number;
  spin?: number;
  size?: number;
  shape?: ParticleShape;
}

export interface PooledRingSpec {
  x: number;
  y: number;
  t?: number;
  m: number;
  r: number;
  c: string;
}

const PARTICLE_POOL_CAP = 360;
const RING_POOL_CAP = 48;
const ACTIVE_PARTICLE_CAP_HIGH = 245;
const ACTIVE_PARTICLE_CAP_LOW = 135;
const ACTIVE_RING_CAP_HIGH = 24;
const ACTIVE_RING_CAP_LOW = 14;

const DEFAULT_COLORS = ['#ffd23f', '#ff9ebb', '#8fd5ff', '#ffffff'] as const;

const SPELL_ALIASES: Record<string, string> = {
  wings: 'cloud_wings',
  blink: 'glimmer_step',
  frost: 'frost_bridge',
  glide: 'tide_song',
  pull: 'moon_pull',
  hug: 'hush_hug',
  warmth: 'ember_warmth',
  echo: 'echo_call',
  sunburst: 'dawn_break',
  weave: 'star_sense',
};

export const ELEMENTAL_SURGE_PROFILES: Record<string, ElementalSurgeProfile> = {
  star_sense: {
    element: 'celestial',
    flashAlpha: 0.21,
    shakeIntensity: 1.9,
    shakeDuration: 0.18,
    shakeFreq: 20,
  },
  cloud_wings: {
    element: 'wind',
    flashAlpha: 0.3,
    shakeIntensity: 5.2,
    shakeDuration: 0.3,
    shakeFreq: 24,
  },
  glimmer_step: {
    element: 'lightning',
    flashAlpha: 0.26,
    shakeIntensity: 4.8,
    shakeDuration: 0.2,
    shakeFreq: 34,
  },
  frost_bridge: {
    element: 'ice',
    flashAlpha: 0.23,
    shakeIntensity: 4.3,
    shakeDuration: 0.28,
    shakeFreq: 32,
  },
  tide_song: {
    element: 'water',
    flashAlpha: 0.22,
    shakeIntensity: 3.8,
    shakeDuration: 0.34,
    shakeFreq: 15,
  },
  moon_pull: {
    element: 'lunar',
    flashAlpha: 0.24,
    shakeIntensity: 4.9,
    shakeDuration: 0.3,
    shakeFreq: 22,
  },
  bloom: {
    element: 'nature',
    flashAlpha: 0.19,
    shakeIntensity: 2.8,
    shakeDuration: 0.24,
    shakeFreq: 18,
  },
  hush_hug: {
    element: 'empathy',
    flashAlpha: 0.2,
    shakeIntensity: 2.3,
    shakeDuration: 0.25,
    shakeFreq: 13,
  },
  ember_warmth: {
    element: 'fire',
    flashAlpha: 0.32,
    shakeIntensity: 7.4,
    shakeDuration: 0.34,
    shakeFreq: 30,
  },
  echo_call: {
    element: 'sound',
    flashAlpha: 0.21,
    shakeIntensity: 3.5,
    shakeDuration: 0.36,
    shakeFreq: 26,
  },
  dreamwalk: {
    element: 'astral',
    flashAlpha: 0.26,
    shakeIntensity: 3.1,
    shakeDuration: 0.28,
    shakeFreq: 20,
  },
  dawn_break: {
    element: 'solar',
    flashAlpha: 0.4,
    shakeIntensity: 8.8,
    shakeDuration: 0.44,
    shakeFreq: 24,
  },
  teleport: {
    element: 'arcane',
    flashAlpha: 0.34,
    shakeIntensity: 5.6,
    shakeDuration: 0.3,
    shakeFreq: 28,
  },
  duet: {
    element: 'harmony',
    flashAlpha: 0.19,
    shakeIntensity: 2.1,
    shakeDuration: 0.22,
    shakeFreq: 18,
  },
};

interface SeasonPhysicsStyle {
  primaryShape: ParticleShape;
  secondaryShape: ParticleShape;
  swirlBias: number;
  dragBase: number;
  spinBase: number;
  windAx: number;
  windAy: number;
  liftMult: number;
  flashScale: number;
}

const SEASON_STYLE: Record<SeasonId, SeasonPhysicsStyle> = {
  spring: {
    primaryShape: 'petal',
    secondaryShape: 'orb',
    swirlBias: 1.15,
    dragBase: 1.05,
    spinBase: 4.5,
    windAx: 16,
    windAy: -6,
    liftMult: 1.05,
    flashScale: 0.95,
  },
  summer: {
    primaryShape: 'spark',
    secondaryShape: 'orb',
    swirlBias: 0.45,
    dragBase: 0.72,
    spinBase: 2.4,
    windAx: 0,
    windAy: 0,
    liftMult: 1.25,
    flashScale: 1.12,
  },
  autumn: {
    primaryShape: 'leaf',
    secondaryShape: 'spark',
    swirlBias: 2.75,
    dragBase: 0.9,
    spinBase: 8.0,
    windAx: 24,
    windAy: -12,
    liftMult: 0.95,
    flashScale: 1.0,
  },
  winter: {
    primaryShape: 'crystal',
    secondaryShape: 'ring',
    swirlBias: 0.75,
    dragBase: 2.1,
    spinBase: 3.6,
    windAx: -8,
    windAy: 6,
    liftMult: 0.88,
    flashScale: 1.02,
  },
};

// Pre-allocated monomorphic object pools (fixed property shapes for V8 fast access)
const particleFreePool: Particle[] = [];
const ringFreePool: MagicRing[] = [];

function createBlankParticle(): Particle {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    l: 0,
    c: '#ffffff',
    maxL: 1,
    z: 0,
    vz: 0,
    ax: 0,
    ay: 0,
    az: 0,
    drag: 0,
    swirl: 0,
    spin: 2.5,
    size: 1,
    shape: 'orb',
  };
}

function createBlankRing(): MagicRing {
  return {
    x: 0,
    y: 0,
    t: 0,
    m: 1,
    r: 100,
    c: '#ffffff',
  };
}

for (let i = 0; i < PARTICLE_POOL_CAP; i++) {
  particleFreePool.push(createBlankParticle());
}
for (let i = 0; i < RING_POOL_CAP; i++) {
  ringFreePool.push(createBlankRing());
}

function acquireParticle(): Particle {
  return particleFreePool.length > 0 ? particleFreePool.pop()! : createBlankParticle();
}

function releaseParticle(pt: Particle): void {
  if (particleFreePool.length < PARTICLE_POOL_CAP) {
    pt.l = 0;
    particleFreePool.push(pt);
  }
}

function acquireRing(): MagicRing {
  return ringFreePool.length > 0 ? ringFreePool.pop()! : createBlankRing();
}

function releaseRing(mr: MagicRing): void {
  if (ringFreePool.length < RING_POOL_CAP) {
    mr.t = 0;
    ringFreePool.push(mr);
  }
}

function swapRemoveParticleAt(particles: Particle[], idx: number): void {
  const lastIdx = particles.length - 1;
  const removed = particles[idx];
  if (idx !== lastIdx) {
    particles[idx] = particles[lastIdx];
  }
  particles.pop();
  if (removed) releaseParticle(removed);
}

function swapRemoveRingAt(magicRings: MagicRing[], idx: number): void {
  const lastIdx = magicRings.length - 1;
  const removed = magicRings[idx];
  if (idx !== lastIdx) {
    magicRings[idx] = magicRings[lastIdx];
  }
  magicRings.pop();
  if (removed) releaseRing(removed);
}

function evictLowestLifeParticle(particles: Particle[]): void {
  const len = particles.length;
  if (len === 0) return;
  let minIdx = 0;
  let minLife = particles[0].l;
  for (let i = 1; i < len; i++) {
    if (particles[i].l < minLife) {
      minLife = particles[i].l;
      minIdx = i;
    }
  }
  swapRemoveParticleAt(particles, minIdx);
}

function evictOldestRing(magicRings: MagicRing[]): void {
  const len = magicRings.length;
  if (len === 0) return;
  let maxProgIdx = 0;
  let maxProg = magicRings[0].m > 0 ? magicRings[0].t / magicRings[0].m : 1;
  for (let i = 1; i < len; i++) {
    const r = magicRings[i];
    const prog = r.m > 0 ? r.t / r.m : 1;
    if (prog > maxProg) {
      maxProg = prog;
      maxProgIdx = i;
    }
  }
  swapRemoveRingAt(magicRings, maxProgIdx);
}

export function trimParticlePool(particles: Particle[], maxCount: number): void {
  while (particles.length > maxCount) {
    evictLowestLifeParticle(particles);
  }
}

export function spawnPooledParticle(
  particles: Particle[],
  spec: PooledParticleSpec,
  maxCap: number = ACTIVE_PARTICLE_CAP_HIGH
): Particle {
  if (particles.length >= maxCap) {
    evictLowestLifeParticle(particles);
  }
  const pt = acquireParticle();
  pt.x = spec.x;
  pt.y = spec.y;
  pt.vx = spec.vx;
  pt.vy = spec.vy;
  pt.l = spec.l;
  pt.maxL = spec.maxL ?? spec.l;
  pt.c = spec.c || '#ffffff';
  pt.z = spec.z ?? 10;
  pt.vz = spec.vz ?? 0;
  pt.ax = spec.ax ?? 0;
  pt.ay = spec.ay ?? 0;
  pt.az = spec.az ?? 0;
  pt.drag = spec.drag ?? 0;
  pt.swirl = spec.swirl ?? 0;
  pt.spin = spec.spin ?? 2.5;
  pt.size = spec.size ?? 1;
  pt.shape = spec.shape ?? 'orb';
  particles.push(pt);
  return pt;
}

export function spawnMagicRing(
  magicRings: MagicRing[],
  spec: PooledRingSpec,
  maxCap: number = ACTIVE_RING_CAP_HIGH
): MagicRing {
  if (magicRings.length >= maxCap) {
    evictOldestRing(magicRings);
  }
  const mr = acquireRing();
  mr.x = spec.x;
  mr.y = spec.y;
  mr.t = spec.t ?? 0;
  mr.m = Math.max(0.05, spec.m);
  mr.r = spec.r;
  mr.c = spec.c || '#ffffff';
  magicRings.push(mr);
  return mr;
}

export function spawnPooledBurst(
  particles: Particle[],
  colors: readonly string[],
  count: number,
  speed: number,
  originX: number,
  originY: number,
  options?: {
    z?: number;
    vz?: number;
    az?: number;
    drag?: number;
    swirl?: number;
    spin?: number;
    size?: number;
    life?: number;
    shape?: ParticleShape;
    lowQuality?: boolean;
  }
): void {
  const palette = colors.length > 0 ? colors : DEFAULT_COLORS;
  const maxCap = options?.lowQuality ? ACTIVE_PARTICLE_CAP_LOW : ACTIVE_PARTICLE_CAP_HIGH;
  const finalCount = options?.lowQuality ? Math.max(3, Math.round(count * 0.6)) : count;
  const baseLife = options?.life ?? 0.95;

  for (let i = 0; i < finalCount; i++) {
    const a = (i / Math.max(1, finalCount)) * Math.PI * 2 + Math.random() * 0.25;
    const spd = speed * (0.55 + Math.random() * 0.65);
    const l = baseLife * (0.85 + Math.random() * 0.4);
    spawnPooledParticle(
      particles,
      {
        x: originX,
        y: originY,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        z: options?.z ?? 8,
        vz: options?.vz ?? 28 + Math.random() * 24,
        az: options?.az ?? -45,
        drag: options?.drag ?? 1.4,
        swirl: options?.swirl ?? 0,
        spin: options?.spin ?? 3.5,
        size: options?.size ?? 1.0,
        shape: options?.shape ?? (i % 2 === 0 ? 'spark' : 'orb'),
        l,
        maxL: l,
        c: palette[i % palette.length] || '#ffffff',
      },
      maxCap
    );
  }
}

export function clearMagicPools(particles: Particle[], magicRings: MagicRing[]): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    releaseParticle(particles[i]);
  }
  particles.length = 0;

  for (let i = magicRings.length - 1; i >= 0; i--) {
    releaseRing(magicRings[i]);
  }
  magicRings.length = 0;
}

/**
 * Dual-harmonic zero-GC screenshake state & integrator (works in both 3D WebGL and 2D Canvas).
 */
export function createScreenShakeState(): ScreenShakeState {
  return {
    intensity: 0,
    duration: 0,
    elapsed: 0,
    freq: 24,
    seed: 0,
    offsetX: 0,
    offsetY: 0,
  };
}

export function triggerScreenShake(
  state: ScreenShakeState,
  intensity: number,
  duration: number = 0.28,
  freq: number = 24
): void {
  if (intensity <= 0 || duration <= 0) return;
  const remainingFrac =
    state.duration > 0 && state.elapsed < state.duration
      ? Math.pow(1 - state.elapsed / state.duration, 2)
      : 0;
  const currentAmp = state.intensity * remainingFrac;
  state.intensity = Math.min(14, Math.max(currentAmp, intensity));
  state.duration = Math.max(duration, state.duration - state.elapsed);
  state.elapsed = 0;
  state.freq = freq;
  state.seed += 1.918;
}

export function tickScreenShake(state: ScreenShakeState, dt: number): void {
  if (state.intensity <= 0.01 || state.duration <= 0) {
    state.intensity = 0;
    state.elapsed = 0;
    state.duration = 0;
    state.offsetX = 0;
    state.offsetY = 0;
    return;
  }
  state.elapsed += dt;
  if (state.elapsed >= state.duration) {
    state.intensity = 0;
    state.elapsed = 0;
    state.duration = 0;
    state.offsetX = 0;
    state.offsetY = 0;
    return;
  }
  const progress = state.elapsed / state.duration;
  const decay = (1 - progress) * (1 - progress);
  const amp = state.intensity * decay;
  const phase = state.elapsed * state.freq * Math.PI * 2 + state.seed;
  state.offsetX = Math.sin(phase) * amp;
  state.offsetY = Math.cos(phase * 1.37 + 0.85) * amp * 0.82;
}

function pickColor(palette: readonly (string | undefined)[], idx: number): string {
  const valid = palette[idx % palette.length];
  return valid || palette[0] || '#ffffff';
}

export function triggerMagicSurge({
  particles,
  magicRings,
  spellId,
  season,
  x,
  y,
  dirX = 1,
  dirY = 0,
  targetX,
  targetY,
  companionX,
  companionY,
  subtype = 'cast',
  lowQuality = false,
  triggerFlash,
  triggerShake,
}: MagicSurgeParams): void {
  const canonicalId = SPELL_ALIASES[spellId] || spellId;
  const variant = getSeasonalSpellVariant(canonicalId, season);
  const style = SEASON_STYLE[season] || SEASON_STYLE.spring;
  const profile = ELEMENTAL_SURGE_PROFILES[canonicalId] || ELEMENTAL_SURGE_PROFILES.star_sense;
  const colors = variant
    ? variant.burstColors.filter((c): c is string => Boolean(c))
    : [...DEFAULT_COLORS];
  const ringCol = variant?.ringColor || colors[0] || '#ffd23f';
  const accentCol = variant?.orbiterAccent || colors[1] || '#ffffff';
  const orbiterCol = variant?.orbiterColor || colors[0] || '#ffd23f';
  const density = lowQuality ? 0.58 : 1.0;
  const maxCap = lowQuality ? ACTIVE_PARTICLE_CAP_LOW : ACTIVE_PARTICLE_CAP_HIGH;
  const maxRingCap = lowQuality ? ACTIVE_RING_CAP_LOW : ACTIVE_RING_CAP_HIGH;

  const dLen = Math.hypot(dirX, dirY) || 1;
  const fx = dirX / dLen;
  const fy = dirY / dLen;
  const pxPerp = -fy;
  const pyPerp = fx;

  const nCount = (base: number) => Math.max(5, Math.round(base * density));

  const spawnP = (spec: PooledParticleSpec) => spawnPooledParticle(particles, spec, maxCap);
  const spawnR = (spec: PooledRingSpec) => spawnMagicRing(magicRings, spec, maxRingCap);

  // Calibrated Screen-Flash per element & season
  if (triggerFlash && variant) {
    const isLanding = canonicalId === 'cloud_wings' && subtype === 'landing';
    const rawAlpha = (isLanding ? 0.29 : profile.flashAlpha) * style.flashScale;
    triggerFlash(variant.flashColor, Math.min(0.45, rawAlpha));
  }

  // Calibrated Screenshake per element intensity
  if (triggerShake) {
    const shakeScale = lowQuality ? 0.78 : 1.0;
    if (canonicalId === 'cloud_wings' && subtype === 'landing') {
      triggerShake(7.4 * shakeScale, 0.36, 28);
    } else if (canonicalId === 'teleport' && subtype === 'arrival') {
      triggerShake(6.2 * shakeScale, 0.32, 30);
    } else {
      triggerShake(
        profile.shakeIntensity * shakeScale,
        profile.shakeDuration,
        profile.shakeFreq
      );
    }
  }

  // Secondary harmonic echo ring tailored by element + season
  spawnR({
    x,
    y,
    t: -0.06,
    m: canonicalId === 'dawn_break' || canonicalId === 'echo_call' ? 1.25 : 0.86,
    r: canonicalId === 'dawn_break' ? 255 : canonicalId === 'echo_call' ? 225 : 130,
    c: accentCol,
  });

  // 1. CLOUD WINGS — Wind Shockwave Launch or Petal-Gust Tree-Shaking Landing
  if (canonicalId === 'cloud_wings') {
    if (subtype === 'landing') {
      spawnR({ x, y, t: 0, m: 0.75, r: 175, c: orbiterCol });
      spawnR({ x, y, t: -0.09, m: 0.9, r: 230, c: accentCol });
      const count = nCount(32);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const tier = i % 3;
        const radial = 90 + tier * 38;
        spawnP({
          x: x + Math.cos(a) * 10,
          y: y + Math.sin(a) * 8,
          vx: Math.cos(a) * radial,
          vy: Math.sin(a) * radial,
          z: 6 + tier * 5,
          vz: 22 + (i % 4) * 11,
          az: -32,
          drag: 2.1,
          swirl: style.swirlBias * (i % 2 === 0 ? 0.8 : -0.8),
          spin: style.spinBase * 1.2,
          size: tier === 0 ? 1.4 : 0.98,
          shape: i % 2 === 0 ? style.primaryShape : style.secondaryShape,
          l: 0.95 + Math.random() * 0.35,
          c: pickColor(colors, i),
        });
      }
      return;
    }

    // Wind shockwave spiral + Twin symmetrical feather-wing arcs rising skyward
    spawnR({ x, y, t: -0.1, m: 0.92, r: 185, c: ringCol });
    const wingPerSide = nCount(15);
    for (const side of [-1, 1]) {
      for (let i = 0; i < wingPerSide; i++) {
        const frac = i / Math.max(1, wingPerSide - 1);
        const arcAngle = side === 1 ? -0.8 + frac * 1.45 : Math.PI + 0.8 - frac * 1.45;
        const speed = 66 + frac * 82;
        spawnP({
          x: x + side * (6 + frac * 11),
          y: y + Math.sin(arcAngle) * 6,
          vx: Math.cos(arcAngle) * speed,
          vy: Math.sin(arcAngle) * speed * 0.68,
          z: 8 + frac * 18,
          vz: (70 + frac * 82) * style.liftMult,
          az: -20,
          drag: 1.05,
          swirl: side * style.swirlBias * 0.85,
          spin: style.spinBase,
          size: 1.1 + (1 - frac) * 0.45,
          shape: i % 3 === 0 ? 'spark' : style.primaryShape,
          l: 0.95 + Math.random() * 0.3,
          c: pickColor(colors, i + (side > 0 ? 0 : 1)),
        });
      }
    }
    // Slipstream updraft ring at feet
    const draftCount = nCount(10);
    for (let i = 0; i < draftCount; i++) {
      const a = (i / draftCount) * Math.PI * 2;
      spawnP({
        x: x + Math.cos(a) * 18,
        y: y + Math.sin(a) * 14,
        vx: -Math.sin(a) * 58,
        vy: Math.cos(a) * 58,
        z: 4,
        vz: 95 * style.liftMult,
        drag: 0.7,
        swirl: 3.4,
        spin: 6,
        size: 1.05,
        shape: 'ring',
        l: 0.85,
        c: orbiterCol,
      });
    }
    return;
  }

  // 2. GLIMMER STEP — Zig-Zag Starlight Blink Ribbon + Gem-Scoop Arrival Nova
  if (canonicalId === 'glimmer_step') {
    const destX = targetX ?? x + fx * 150;
    const destY = targetY ?? y + fy * 150;
    const originX = targetX !== undefined ? x : destX - fx * 150;
    const originY = targetY !== undefined ? y : destY - fy * 150;

    spawnR({ x: originX, y: originY, t: 0, m: 0.55, r: 85, c: orbiterCol });
    spawnR({ x: destX, y: destY, t: -0.05, m: 0.78, r: 120, c: ringCol });

    const trailSteps = nCount(18);
    for (let i = 0; i <= trailSteps; i++) {
      const f = i / Math.max(1, trailSteps);
      const zig = Math.sin(f * Math.PI * 5) * 14;
      const px = originX + (destX - originX) * f + pxPerp * zig;
      const py = originY + (destY - originY) * f + pyPerp * zig;
      const side = i % 2 === 0 ? 1 : -1;
      spawnP({
        x: px,
        y: py,
        vx: fx * 64 + pxPerp * side * 32,
        vy: fy * 64 + pyPerp * side * 32,
        z: 10 + Math.sin(f * Math.PI) * 28,
        vz: 26 * style.liftMult,
        drag: 1.85,
        spin: style.spinBase * 1.5,
        size: 1.1 + (1 - Math.abs(f - 0.5)) * 0.42,
        shape: i % 2 === 0 ? 'spark' : style.primaryShape,
        l: 0.75 + f * 0.3,
        c: pickColor(colors, i),
      });
    }

    // Arrival star-nova + magnetic scoop glints
    const novaCount = nCount(18);
    for (let i = 0; i < novaCount; i++) {
      const a = (i / novaCount) * Math.PI * 2;
      const isOuter = i % 2 === 0;
      const ray = isOuter ? 140 : 78;
      spawnP({
        x: destX,
        y: destY,
        vx: Math.cos(a) * ray,
        vy: Math.sin(a) * ray,
        z: 14,
        vz: (isOuter ? 54 : 24) * style.liftMult,
        az: -38,
        drag: 1.35,
        swirl: style.swirlBias * 0.55,
        spin: style.spinBase,
        size: isOuter ? 1.4 : 0.95,
        shape: isOuter ? 'spark' : style.secondaryShape,
        l: 0.9 + Math.random() * 0.25,
        c: pickColor(colors, i),
      });
    }
    return;
  }

  // 3. STAR SENSE — Constellation Polygon Rays + Ascending Beacon Shafts + Crown
  if (canonicalId === 'star_sense') {
    const points = season === 'winter' ? 6 : season === 'summer' ? 8 : 5;
    const perArm = lowQuality ? 3 : 4;
    for (let arm = 0; arm < points; arm++) {
      const a = (arm / points) * Math.PI * 2 - Math.PI / 2;
      for (let j = 1; j <= perArm; j++) {
        const spd = 46 + j * 30;
        spawnP({
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          z: 14 + j * 10,
          vz: (42 + j * 12) * style.liftMult,
          ax: style.windAx * 0.4,
          ay: style.windAy * 0.4,
          az: -14,
          drag: style.dragBase * 1.05,
          swirl: season === 'autumn' ? 2.2 : season === 'spring' ? 1.0 : 0.35,
          spin: style.spinBase,
          size: j === perArm ? 1.5 : 0.98,
          shape: j === perArm ? 'spark' : style.primaryShape,
          l: 1.15 + j * 0.08,
          c: pickColor(colors, arm + j),
        });
      }
    }
    // Halo crown & illuminating sky-beacon spire above Mochi
    const crownCount = nCount(12);
    for (let i = 0; i < crownCount; i++) {
      const a = (i / crownCount) * Math.PI * 2;
      const isSpire = i % 3 === 0;
      spawnP({
        x: x + Math.cos(a) * (isSpire ? 8 : 20),
        y: y + Math.sin(a) * (isSpire ? 6 : 15),
        vx: Math.cos(a) * (isSpire ? 12 : 28),
        vy: Math.sin(a) * (isSpire ? 10 : 24),
        z: isSpire ? 26 : 44,
        vz: isSpire ? 96 : 34,
        drag: 0.65,
        swirl: isSpire ? 1.2 : 2.8,
        spin: 6.5,
        size: isSpire ? 1.35 : 1.1,
        shape: isSpire ? 'spark' : style.secondaryShape,
        l: 1.2,
        c: isSpire ? ringCol : accentCol,
      });
    }
    return;
  }

  // 4. FROST BRIDGE — Directional Ice Bridge Lance + Crystallizing Path & Orbit Shield
  if (canonicalId === 'frost_bridge') {
    spawnR({ x: x + fx * 60, y: y + fy * 60, t: 0, m: 0.9, r: 128, c: ringCol });
    spawnR({ x: x + fx * 125, y: y + fy * 125, t: -0.1, m: 0.95, r: 112, c: orbiterCol });
    const lanceCount = nCount(20);
    for (let i = 0; i < lanceCount; i++) {
      const f = i / Math.max(1, lanceCount - 1);
      const chevronOffset = ((i % 3) - 1) * 17;
      const forwardSpd = 100 + f * 145;
      spawnP({
        x: x + fx * (12 + f * 58) + pxPerp * chevronOffset * 0.65,
        y: y + fy * (12 + f * 58) + pyPerp * chevronOffset * 0.65,
        vx: fx * forwardSpd + pxPerp * chevronOffset * 1.4,
        vy: fy * forwardSpd + pyPerp * chevronOffset * 1.4,
        z: 6 + Math.sin(f * Math.PI) * 20,
        vz: 20 * style.liftMult,
        az: -24,
        drag: 1.85,
        spin: 5.5,
        size: 1.25 + (1 - f) * 0.35,
        shape: i % 4 === 0 ? style.primaryShape : 'crystal',
        l: 0.95 + f * 0.32,
        c: pickColor(colors, i),
      });
    }
    const hexCount = nCount(12);
    for (let i = 0; i < hexCount; i++) {
      const a = (i / hexCount) * Math.PI * 2;
      spawnP({
        x: x + Math.cos(a) * 14,
        y: y + Math.sin(a) * 12,
        vx: Math.cos(a) * 82,
        vy: Math.sin(a) * 82,
        z: 6,
        vz: 26,
        drag: 2.3,
        swirl: season === 'autumn' ? 1.5 : 0.45,
        spin: 4.5,
        size: 1.1,
        shape: i % 2 === 0 ? 'crystal' : style.primaryShape,
        l: 1.08,
        c: pickColor(colors, i + 1),
      });
    }
    return;
  }

  // 5. TIDE SONG — Counter-Rotating Ocean Swell Spirals + Seashell Pearl & Song Fountain
  if (canonicalId === 'tide_song') {
    spawnR({ x, y, t: -0.1, m: 1.0, r: 195, c: orbiterCol });
    const waveArm = nCount(14);
    for (const dir of [-1, 1]) {
      for (let i = 0; i < waveArm; i++) {
        const f = i / Math.max(1, waveArm - 1);
        const a = f * Math.PI * 2 + (dir > 0 ? 0 : Math.PI);
        const spd = 50 + f * 76;
        spawnP({
          x: x + Math.cos(a) * 10,
          y: y + Math.sin(a) * 10,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          z: 8 + f * 18,
          vz: (62 + Math.sin(f * Math.PI) * 56) * style.liftMult,
          az: -64,
          drag: 0.85,
          swirl: dir * (2.7 + Math.abs(style.swirlBias) * 0.4),
          spin: style.spinBase,
          size: i % 3 === 0 ? 1.38 : 0.98,
          shape: i % 5 === 0 ? 'note' : i % 3 === 0 ? 'ring' : i % 2 === 0 ? style.primaryShape : 'orb',
          l: 1.02 + Math.random() * 0.25,
          c: pickColor(colors, i),
        });
      }
    }
    // Pearl fountain plume
    const pearlCount = nCount(8);
    for (let i = 0; i < pearlCount; i++) {
      const a = (i / pearlCount) * Math.PI * 2;
      spawnP({
        x,
        y,
        vx: Math.cos(a) * 32,
        vy: Math.sin(a) * 26,
        z: 14,
        vz: 94 * style.liftMult,
        az: -88,
        drag: 0.65,
        size: 1.25,
        shape: 'orb',
        l: 1.05,
        c: '#ffffff',
      });
    }
    return;
  }

  // 6. MOON PULL — Wide Outer-to-Inner Magnetic Implosion + Grove-Rustle Spark & Coin Fountain
  if (canonicalId === 'moon_pull') {
    spawnR({ x, y, t: 0, m: 0.78, r: 165, c: orbiterCol });
    spawnR({ x, y, t: -0.1, m: 0.95, r: 245, c: ringCol });
    const count = nCount(28);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const startR = 96 + (i % 3) * 26;
      const sx = x + Math.cos(a) * startR;
      const sy = y + Math.sin(a) * startR;
      const pullSpd = 112 + (i % 3) * 26;
      spawnP({
        x: sx,
        y: sy,
        vx: -Math.cos(a) * pullSpd,
        vy: -Math.sin(a) * pullSpd,
        z: 24 - (i % 3) * 4,
        vz: 20 * style.liftMult,
        drag: 0.5,
        swirl: season === 'autumn' ? -3.8 : 3.3,
        spin: style.spinBase * 1.25,
        size: i % 2 === 0 ? 1.35 : 0.98,
        shape: i % 3 === 0 ? style.primaryShape : 'orb',
        l: 0.92 + (i % 3) * 0.12,
        c: pickColor(colors, i),
      });
    }
    // Central moon fountain
    const coreCount = nCount(8);
    for (let i = 0; i < coreCount; i++) {
      const a = (i / coreCount) * Math.PI * 2;
      spawnP({
        x,
        y,
        vx: Math.cos(a) * 26,
        vy: Math.sin(a) * 24,
        z: 12,
        vz: 88 * style.liftMult,
        az: -48,
        drag: 1.05,
        shape: 'spark',
        size: 1.3,
        l: 1.0,
        c: accentCol,
      });
    }
    return;
  }

  // 7. BLOOM — Parametric Rose-Curve Flora Mandala + Golden Nectar Pollen Fountain
  if (canonicalId === 'bloom') {
    const petalLobes = season === 'winter' ? 6 : season === 'autumn' ? 8 : 5;
    const count = nCount(30);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const rose = 0.55 + 0.55 * Math.abs(Math.cos((petalLobes * a) / 2));
      const spd = 50 + rose * 90;
      spawnP({
        x: x + Math.cos(a) * 8,
        y: y + Math.sin(a) * 8,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        z: 6 + rose * 18,
        vz: (26 + rose * 40) * style.liftMult,
        ax: style.windAx * 0.55,
        ay: style.windAy * 0.55,
        az: -28,
        drag: style.dragBase * 1.15,
        swirl: style.swirlBias * 0.72,
        spin: style.spinBase,
        size: 1.05 + rose * 0.55,
        shape: i % 4 === 0 ? 'orb' : style.primaryShape,
        l: 1.08 + Math.random() * 0.35,
        c: pickColor(colors, i),
      });
    }
    // Rising pollen mist
    const pollenCount = nCount(8);
    for (let i = 0; i < pollenCount; i++) {
      const a = (i / pollenCount) * Math.PI * 2;
      spawnP({
        x: x + Math.cos(a) * 12,
        y: y + Math.sin(a) * 10,
        vx: Math.cos(a) * 22,
        vy: Math.sin(a) * 20,
        z: 10,
        vz: 74 * style.liftMult,
        az: -24,
        drag: 0.85,
        swirl: 1.4,
        shape: 'spark',
        size: 1.05,
        l: 1.05,
        c: '#ffd23f',
      });
    }
    return;
  }

  // 8. HUSH HUG — Ascending Parametric Heart Embrace + Inward Villager Cheer Wisps
  if (canonicalId === 'hush_hug') {
    spawnR({ x, y, t: 0, m: 0.95, r: 160, c: ringCol });
    spawnR({ x, y, t: -0.14, m: 1.15, r: 225, c: orbiterCol });
    const count = nCount(26);
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2;
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      spawnP({
        x: x + hx * 1.25,
        y: y + hy * 0.9,
        vx: hx * 3.8,
        vy: hy * 2.9,
        z: 14 + (i % 3) * 6,
        vz: (36 + (i % 4) * 12) * style.liftMult,
        ax: style.windAx * 0.3,
        drag: style.dragBase * 1.12,
        swirl: style.swirlBias * 0.45,
        spin: 3.5,
        size: i % 2 === 0 ? 1.32 : 1.0,
        shape: i % 3 === 2 ? style.primaryShape : 'heart',
        l: 1.15 + Math.random() * 0.25,
        c: pickColor(colors, i),
      });
    }
    // Gentle inward warm cheer wisps
    const wispCount = nCount(8);
    for (let i = 0; i < wispCount; i++) {
      const a = (i / wispCount) * Math.PI * 2;
      spawnP({
        x: x + Math.cos(a) * 85,
        y: y + Math.sin(a) * 72,
        vx: -Math.cos(a) * 68,
        vy: -Math.sin(a) * 58,
        z: 12,
        vz: 24,
        drag: 0.7,
        swirl: 1.8,
        shape: 'heart',
        size: 1.05,
        l: 0.95,
        c: accentCol,
      });
    }
    return;
  }

  // 9. EMBER WARMTH — Double-Helix Fire Pillar + Explosive Rock-Shattering Cinder Blast
  if (canonicalId === 'ember_warmth') {
    spawnR({ x, y, t: 0, m: 0.72, r: 175, c: orbiterCol });
    spawnR({ x, y, t: -0.07, m: 0.92, r: 235, c: ringCol });
    const helixCount = nCount(26);
    for (let i = 0; i < helixCount; i++) {
      const f = i / Math.max(1, helixCount - 1);
      const strand = i % 2 === 0 ? 1 : -1;
      const a = f * Math.PI * 2 + (strand > 0 ? 0 : Math.PI);
      spawnP({
        x: x + Math.cos(a) * 16,
        y: y + Math.sin(a) * 14,
        vx: Math.cos(a) * (44 + f * 38),
        vy: Math.sin(a) * (44 + f * 38),
        z: 6 + f * 22,
        vz: (72 + f * 94) * style.liftMult,
        az: -18,
        drag: 0.72,
        swirl: strand * (2.7 + (season === 'autumn' ? 1.1 : 0)),
        spin: 8.5,
        size: 1.4 - f * 0.35,
        shape: i % 3 === 0 ? style.primaryShape : i % 2 === 0 ? 'spark' : 'orb',
        l: 0.88 + Math.random() * 0.35,
        c: pickColor(colors, i),
      });
    }
    // High-energy radial ember & stone-crack cinder snap
    const cinderCount = nCount(14);
    for (let i = 0; i < cinderCount; i++) {
      const a = (i / cinderCount) * Math.PI * 2;
      const spd = 128 + (i % 2) * 34;
      spawnP({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        z: 5,
        vz: 24 + (i % 3) * 10,
        az: -38,
        drag: 1.95,
        spin: 7,
        shape: i % 4 === 0 ? 'crystal' : 'spark',
        size: i % 2 === 0 ? 1.25 : 1.0,
        l: 0.72,
        c: pickColor(colors, i + 1),
      });
    }
    return;
  }

  // 10. ECHO CALL — Staggered Long-Range Sonar Bell Harmonics & Floating Notes
  if (canonicalId === 'echo_call') {
    spawnR({ x, y, t: 0, m: 1.0, r: 225, c: ringCol });
    spawnR({ x, y, t: -0.1, m: 1.25, r: 300, c: orbiterCol });
    spawnR({ x, y, t: -0.2, m: 1.5, r: 380, c: accentCol });
    const count = nCount(26);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const tier = (i % 3) + 1;
      const spd = 48 * tier;
      spawnP({
        x: x + Math.cos(a) * 8,
        y: y + Math.sin(a) * 8,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        z: 18 + tier * 10,
        vz: (30 + tier * 15) * style.liftMult,
        drag: 0.88,
        swirl: style.swirlBias * 0.6,
        spin: 4.5,
        size: tier === 2 ? 1.35 : 1.02,
        shape: i % 2 === 0 ? 'note' : style.primaryShape,
        l: 1.15 + tier * 0.1,
        c: pickColor(colors, i),
      });
    }
    return;
  }

  // 11. DREAMWALK — Ethereal Counter-Rotating Gossamer Phase Veil
  if (canonicalId === 'dreamwalk') {
    spawnR({ x, y, t: 0, m: 1.1, r: 175, c: orbiterCol });
    spawnR({ x, y, t: -0.12, m: 1.28, r: 220, c: accentCol });
    const count = nCount(28);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const strand = i % 2 === 0 ? 1 : -1;
      spawnP({
        x: x + Math.cos(a) * 22,
        y: y + Math.sin(a) * 18,
        vx: Math.cos(a + strand * 0.5) * 62,
        vy: Math.sin(a + strand * 0.5) * 62,
        z: 10 + (i % 5) * 9,
        vz: (34 + (i % 4) * 16) * style.liftMult,
        drag: 1.6,
        swirl: strand * (2.1 + style.swirlBias * 0.35),
        spin: style.spinBase * 1.2,
        size: 1.18,
        shape: i % 3 === 0 ? 'crystal' : i % 2 === 0 ? style.primaryShape : 'orb',
        l: 1.25 + Math.random() * 0.25,
        c: pickColor(colors, i),
      });
    }
    return;
  }

  // 12. DAWN BREAK — Grand Solar Shockwave + Light Pillar + 16-Ray Horizon Corona
  if (canonicalId === 'dawn_break') {
    spawnR({ x, y, t: 0, m: 0.9, r: 175, c: orbiterCol });
    spawnR({ x, y, t: -0.09, m: 1.22, r: 275, c: ringCol });
    spawnR({ x, y, t: -0.18, m: 1.5, r: 370, c: accentCol });

    // Radiant sunburst rays
    const rayCount = nCount(26);
    for (let i = 0; i < rayCount; i++) {
      const a = (i / rayCount) * Math.PI * 2;
      const isMajor = i % 2 === 0;
      const spd = isMajor ? 162 : 96;
      spawnP({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        z: 12,
        vz: (isMajor ? 68 : 38) * style.liftMult,
        az: -28,
        drag: style.dragBase * 0.88,
        swirl: style.swirlBias * 0.5,
        spin: style.spinBase,
        size: isMajor ? 1.5 : 1.08,
        shape: isMajor ? 'spark' : style.primaryShape,
        l: 1.2 + Math.random() * 0.25,
        c: pickColor(colors, i),
      });
    }
    // Towering central sunrise column
    const pillarCount = nCount(16);
    for (let i = 0; i < pillarCount; i++) {
      const a = (i / pillarCount) * Math.PI * 2;
      spawnP({
        x: x + Math.cos(a) * 14,
        y: y + Math.sin(a) * 12,
        vx: Math.cos(a) * 20,
        vy: Math.sin(a) * 18,
        z: 8 + i * 5,
        vz: (105 + i * 6) * style.liftMult,
        drag: 0.58,
        swirl: 2.9,
        spin: 7.5,
        size: 1.35,
        shape: i % 2 === 0 ? 'orb' : style.primaryShape,
        l: 1.25,
        c: pickColor(colors, i + 1),
      });
    }
    return;
  }

  // 13. TELEPORT — Resonant Warp Melody Spiral Column
  if (canonicalId === 'teleport') {
    spawnR({ x, y, t: 0, m: 1.15, r: 220, c: orbiterCol });
    spawnR({ x, y, t: -0.1, m: 1.35, r: 280, c: ringCol });
    const count = nCount(32);
    const isArrival = subtype === 'arrival';
    for (let i = 0; i < count; i++) {
      const f = i / Math.max(1, count - 1);
      const a = f * Math.PI * 4;
      const spd = isArrival ? 54 + f * 82 : 38 + (1 - f) * 78;
      spawnP({
        x: x + Math.cos(a) * (isArrival ? 24 : 16),
        y: y + Math.sin(a) * (isArrival ? 18 : 14),
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        z: isArrival ? 72 - f * 62 : 4 + f * 74,
        vz: (isArrival ? -28 : 54) * style.liftMult,
        az: isArrival ? 35 : 0,
        drag: 0.9,
        swirl: isArrival ? -3.6 : 3.4,
        spin: style.spinBase * 1.35,
        size: 1.15 + (1 - f) * 0.35,
        shape: i % 4 === 0 ? 'note' : i % 3 === 0 ? 'ring' : i % 2 === 0 ? style.primaryShape : 'spark',
        l: 1.08 + f * 0.2,
        c: pickColor(colors, i),
      });
    }
    return;
  }

  // 14. DUET — Twin Companion Musical Note & Heart Ribbon
  const cx = companionX ?? x - 24;
  const cy = companionY ?? y + 4;
  spawnR({ x: cx, y: cy, t: -0.08, m: 0.9, r: 115, c: ringCol });
  const duetCount = nCount(22);
  for (let i = 0; i < duetCount; i++) {
    const f = i / Math.max(1, duetCount - 1);
    const sx = x + (cx - x) * f;
    const sy = y + (cy - y) * f;
    const a = f * Math.PI * 2;
    spawnP({
      x: sx,
      y: sy,
      vx: Math.cos(a) * 60,
      vy: Math.sin(a) * 60,
      z: 16 + Math.sin(f * Math.PI) * 30,
      vz: 44 * style.liftMult,
      drag: 1.1,
      swirl: 1.9,
      spin: 4.2,
      size: 1.28,
      shape: i % 2 === 0 ? 'note' : 'heart',
      l: 1.12,
      c: pickColor(colors, i),
    });
  }
}

/**
 * Shared zero-GC physics integrator for W.magicRings used identically in 3D and 2D loops.
 */
export function tickMagicRings(magicRings: MagicRing[], dt: number): void {
  for (let i = magicRings.length - 1; i >= 0; i--) {
    const mr = magicRings[i];
    mr.t += dt;
    if (mr.t >= mr.m) {
      swapRemoveRingAt(magicRings, i);
    }
  }
}

/**
 * Shared zero-GC physics integrator for W.particles used identically in 3D and 2D loops.
 */
export function tickWorldParticles(particles: Particle[], dt: number, lowQuality: boolean): void {
  const maxCap = lowQuality ? ACTIVE_PARTICLE_CAP_LOW : ACTIVE_PARTICLE_CAP_HIGH;
  if (particles.length > maxCap) {
    trimParticlePool(particles, maxCap);
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.l -= dt;
    if (pt.l <= 0) {
      swapRemoveParticleAt(particles, i);
      continue;
    }
    if (pt.swirl) {
      const ang = pt.swirl * dt;
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      const nvx = pt.vx * cos - pt.vy * sin;
      const nvy = pt.vx * sin + pt.vy * cos;
      pt.vx = nvx;
      pt.vy = nvy;
    }
    if (pt.ax) pt.vx += pt.ax * dt;
    if (pt.ay) pt.vy += pt.ay * dt;
    if (pt.az && pt.vz !== undefined) pt.vz += pt.az * dt;
    if (pt.drag) {
      const damp = Math.max(0, 1 - pt.drag * dt);
      pt.vx *= damp;
      pt.vy *= damp;
      if (pt.vz !== undefined) pt.vz *= Math.max(0, 1 - pt.drag * 0.45 * dt);
    }
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    if (pt.vz !== undefined) {
      pt.z = Math.max(0, (pt.z ?? 12) + pt.vz * dt);
    }
  }
}

/**
 * Draws a stylized 2D Canvas fallback particle matching the 3D shape & altitude silhouette.
 */
export function draw2DParticle(ctx: CanvasRenderingContext2D, pt: Particle): void {
  const lifeRatio = pt.maxL ? Math.max(0, Math.min(1, pt.l / pt.maxL)) : Math.min(1, pt.l);
  const popScale = pt.maxL && lifeRatio > 0.85 ? (1 - lifeRatio) / 0.15 : 1;
  const s = (pt.size ?? 1) * (0.45 + 0.65 * Math.min(1, lifeRatio * 1.4)) * (0.55 + 0.45 * popScale);
  const drawY = pt.y - (pt.z ? pt.z * 0.65 : 0);
  const shape = pt.shape || 'orb';
  const angle = pt.spin ? (pt.maxL ? pt.maxL - pt.l : pt.l) * pt.spin : Math.atan2(pt.vy, pt.vx);

  ctx.save();
  ctx.translate(pt.x, drawY);
  ctx.globalAlpha = Math.max(0, Math.min(1, lifeRatio * 1.15));
  ctx.fillStyle = pt.c;
  ctx.strokeStyle = pt.c;

  if (shape === 'petal' || shape === 'leaf') {
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, 5.2 * s, 2.7 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (shape === 'spark') {
    ctx.rotate(Math.atan2(pt.vy, pt.vx));
    ctx.beginPath();
    ctx.moveTo(6.8 * s, 0);
    ctx.lineTo(0, 2.1 * s);
    ctx.lineTo(-6.8 * s, 0);
    ctx.lineTo(0, -2.1 * s);
    ctx.closePath();
    ctx.fill();
  } else if (shape === 'crystal') {
    ctx.rotate(angle * 0.6);
    ctx.beginPath();
    ctx.moveTo(0, -5.8 * s);
    ctx.lineTo(3.6 * s, 0);
    ctx.lineTo(0, 5.8 * s);
    ctx.lineTo(-3.6 * s, 0);
    ctx.closePath();
    ctx.fill();
  } else if (shape === 'heart') {
    const hs = 2.6 * s;
    ctx.beginPath();
    ctx.moveTo(0, hs * 1.1);
    ctx.bezierCurveTo(-hs * 1.8, -hs * 0.2, -hs * 1.2, -hs * 1.7, 0, -hs * 0.55);
    ctx.bezierCurveTo(hs * 1.2, -hs * 1.7, hs * 1.8, -hs * 0.2, 0, hs * 1.1);
    ctx.fill();
  } else if (shape === 'note') {
    ctx.beginPath();
    ctx.arc(-1.4 * s, 2.2 * s, 2.3 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(1.2, 1.5 * s);
    ctx.beginPath();
    ctx.moveTo(0.8 * s, 2 * s);
    ctx.lineTo(0.8 * s, -4.5 * s);
    ctx.lineTo(4.4 * s, -3 * s);
    ctx.stroke();
  } else if (shape === 'ring') {
    ctx.lineWidth = Math.max(1.3, 1.8 * s);
    ctx.beginPath();
    ctx.arc(0, 0, 4.2 * s, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, 3.6 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
