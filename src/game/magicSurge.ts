/**
 * Mochi Meadows 2: Seasonal Magic Surge VFX Choreography
 * Builds unique multi-stage particle & magic-ring surges for all 52 (13 spells × 4 seasons)
 * variants using the shared World particle & ring system across both 3D WebGL and 2D Canvas.
 */

import type { SeasonId } from './constants';
import type { MagicRing, Particle, ParticleShape } from './engine';
import { getSeasonalSpellVariant } from './seasonalSpells';

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
}

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

interface SeasonPhysicsStyle {
  primaryShape: ParticleShape;
  secondaryShape: ParticleShape;
  swirlBias: number;
  dragBase: number;
  spinBase: number;
  windAx: number;
  windAy: number;
  liftMult: number;
  flashBoost: number;
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
    flashBoost: 0.2,
  },
  summer: {
    primaryShape: 'spark',
    secondaryShape: 'orb',
    swirlBias: 0.45,
    dragBase: 0.7,
    spinBase: 2.2,
    windAx: 0,
    windAy: 0,
    liftMult: 1.25,
    flashBoost: 0.26,
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
    flashBoost: 0.21,
  },
  winter: {
    primaryShape: 'crystal',
    secondaryShape: 'ring',
    swirlBias: 0.75,
    dragBase: 2.15,
    spinBase: 3.4,
    windAx: -8,
    windAy: 6,
    liftMult: 0.85,
    flashBoost: 0.22,
  },
};

const DEFAULT_COLORS = ['#ffd23f', '#ff9ebb', '#8fd5ff', '#ffffff'];

function capParticleBuffer(particles: Particle[], maxCount: number): void {
  if (particles.length > maxCount) {
    particles.splice(0, particles.length - maxCount);
  }
}

function pushSurgeParticle(particles: Particle[], p: Particle): void {
  if (p.maxL === undefined) p.maxL = p.l;
  particles.push(p);
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
}: MagicSurgeParams): void {
  const canonicalId = SPELL_ALIASES[spellId] || spellId;
  const variant = getSeasonalSpellVariant(canonicalId, season);
  const style = SEASON_STYLE[season] || SEASON_STYLE.spring;
  const colors = variant
    ? variant.burstColors.filter((c): c is string => Boolean(c))
    : DEFAULT_COLORS;
  const ringCol = variant?.ringColor || colors[0] || '#ffd23f';
  const accentCol = variant?.orbiterAccent || colors[1] || '#ffffff';
  const orbiterCol = variant?.orbiterColor || colors[0] || '#ffd23f';
  const density = lowQuality ? 0.56 : 1.0;
  const maxCap = lowQuality ? 135 : 245;

  const dLen = Math.hypot(dirX, dirY) || 1;
  const fx = dirX / dLen;
  const fy = dirY / dLen;
  const pxPerp = -fy;
  const pyPerp = fx;

  const nCount = (base: number) => Math.max(5, Math.round(base * density));

  // Subtle seasonal world luminance pulse on every spell cast
  if (triggerFlash && variant) {
    const strongFlash =
      canonicalId === 'dawn_break' || canonicalId === 'cloud_wings' || canonicalId === 'teleport';
    triggerFlash(variant.flashColor, strongFlash ? Math.min(0.38, style.flashBoost + 0.1) : style.flashBoost);
  }

  // Secondary harmonic echo ring tailored by spell + season
  magicRings.push({
    x,
    y,
    t: 0,
    m: canonicalId === 'dawn_break' || canonicalId === 'echo_call' ? 1.25 : 0.85,
    r: canonicalId === 'dawn_break' ? 240 : canonicalId === 'echo_call' ? 210 : 125,
    c: accentCol,
  });

  // 1. CLOUD WINGS — Wing-Arc Updraft or Ground Cushion Landing
  if (canonicalId === 'cloud_wings') {
    if (subtype === 'landing') {
      magicRings.push({ x, y, t: 0, m: 0.72, r: 145, c: orbiterCol });
      const count = nCount(28);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const radial = 75 + (i % 3) * 32;
        pushSurgeParticle(particles, {
          x: x + Math.cos(a) * 10,
          y: y + Math.sin(a) * 8,
          vx: Math.cos(a) * radial,
          vy: Math.sin(a) * radial,
          z: 6 + (i % 3) * 5,
          vz: 14 + (i % 4) * 9,
          az: -28,
          drag: 2.3,
          swirl: style.swirlBias * (i % 2 === 0 ? 0.65 : -0.65),
          spin: style.spinBase,
          size: i % 3 === 0 ? 1.35 : 0.95,
          shape: i % 2 === 0 ? style.primaryShape : style.secondaryShape,
          l: 0.95 + Math.random() * 0.35,
          c: pickColor(colors, i),
        });
      }
      capParticleBuffer(particles, maxCap);
      return;
    }

    // Twin symmetrical feather-wing arcs rising skyward
    const wingPerSide = nCount(15);
    for (let side of [-1, 1]) {
      for (let i = 0; i < wingPerSide; i++) {
        const frac = i / Math.max(1, wingPerSide - 1);
        const arcAngle = side === 1 ? -0.8 + frac * 1.45 : Math.PI + 0.8 - frac * 1.45;
        const speed = 62 + frac * 78;
        pushSurgeParticle(particles, {
          x: x + side * (6 + frac * 10),
          y: y + Math.sin(arcAngle) * 6,
          vx: Math.cos(arcAngle) * speed,
          vy: Math.sin(arcAngle) * speed * 0.68,
          z: 8 + frac * 18,
          vz: (65 + frac * 75) * style.liftMult,
          az: -22,
          drag: 1.1,
          swirl: side * style.swirlBias * 0.8,
          spin: style.spinBase,
          size: 1.05 + (1 - frac) * 0.45,
          shape: i % 3 === 0 ? 'spark' : style.primaryShape,
          l: 0.95 + Math.random() * 0.3,
          c: pickColor(colors, i + (side > 0 ? 0 : 1)),
        });
      }
    }
    capParticleBuffer(particles, maxCap);
    return;
  }

  // 2. GLIMMER STEP — Comet Ribbon & Directional Arrival Nova
  if (canonicalId === 'glimmer_step') {
    const destX = targetX ?? x + fx * 150;
    const destY = targetY ?? y + fy * 150;
    const originX = targetX !== undefined ? x : destX - fx * 150;
    const originY = targetY !== undefined ? y : destY - fy * 150;

    // Origin afterimage ring
    magicRings.push({ x: originX, y: originY, t: 0, m: 0.55, r: 78, c: orbiterCol });
    const trailSteps = nCount(16);
    for (let i = 0; i <= trailSteps; i++) {
      const f = i / Math.max(1, trailSteps);
      const px = originX + (destX - originX) * f;
      const py = originY + (destY - originY) * f;
      const side = i % 2 === 0 ? 1 : -1;
      pushSurgeParticle(particles, {
        x: px + pxPerp * side * 6,
        y: py + pyPerp * side * 6,
        vx: fx * 55 + pxPerp * side * 28,
        vy: fy * 55 + pyPerp * side * 28,
        z: 10 + Math.sin(f * Math.PI) * 26,
        vz: 24 * style.liftMult,
        drag: 1.9,
        spin: style.spinBase * 1.4,
        size: 1.05 + (1 - Math.abs(f - 0.5)) * 0.4,
        shape: i % 2 === 0 ? 'spark' : style.primaryShape,
        l: 0.72 + f * 0.3,
        c: pickColor(colors, i),
      });
    }

    // Arrival star-nova
    const novaCount = nCount(16);
    for (let i = 0; i < novaCount; i++) {
      const a = (i / novaCount) * Math.PI * 2;
      const ray = i % 2 === 0 ? 130 : 72;
      pushSurgeParticle(particles, {
        x: destX,
        y: destY,
        vx: Math.cos(a) * ray,
        vy: Math.sin(a) * ray,
        z: 14,
        vz: (i % 2 === 0 ? 48 : 22) * style.liftMult,
        az: -38,
        drag: 1.4,
        swirl: style.swirlBias * 0.5,
        spin: style.spinBase,
        size: i % 2 === 0 ? 1.35 : 0.9,
        shape: i % 2 === 0 ? 'spark' : style.secondaryShape,
        l: 0.88 + Math.random() * 0.25,
        c: pickColor(colors, i),
      });
    }
    capParticleBuffer(particles, maxCap);
    return;
  }

  // 3. STAR SENSE — Constellation Polygon + Ascending Lantern Crown
  if (canonicalId === 'star_sense') {
    const points = season === 'winter' ? 6 : season === 'summer' ? 8 : 5;
    const perArm = lowQuality ? 3 : 4;
    for (let arm = 0; arm < points; arm++) {
      const a = (arm / points) * Math.PI * 2 - Math.PI / 2;
      for (let j = 1; j <= perArm; j++) {
        const spd = 42 + j * 28;
        pushSurgeParticle(particles, {
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          z: 14 + j * 10,
          vz: 38 * style.liftMult,
          ax: style.windAx * 0.4,
          ay: style.windAy * 0.4,
          az: -16,
          drag: style.dragBase * 1.1,
          swirl: season === 'autumn' ? 2.2 : season === 'spring' ? 1.0 : 0.3,
          spin: style.spinBase,
          size: j === perArm ? 1.45 : 0.95,
          shape: j === perArm ? 'spark' : style.primaryShape,
          l: 1.1 + j * 0.08,
          c: pickColor(colors, arm + j),
        });
      }
    }
    // Halo crown above Mochi
    const crownCount = nCount(10);
    for (let i = 0; i < crownCount; i++) {
      const a = (i / crownCount) * Math.PI * 2;
      pushSurgeParticle(particles, {
        x: x + Math.cos(a) * 18,
        y: y + Math.sin(a) * 14,
        vx: Math.cos(a) * 26,
        vy: Math.sin(a) * 22,
        z: 42,
        vz: 32,
        drag: 0.65,
        swirl: 2.6,
        spin: 6,
        size: 1.1,
        shape: style.secondaryShape,
        l: 1.15,
        c: accentCol,
      });
    }
    capParticleBuffer(particles, maxCap);
    return;
  }

  // 4. FROST BRIDGE — Directional Glacial Chevron Lance + Hexagonal Rink
  if (canonicalId === 'frost_bridge') {
    magicRings.push({ x: x + fx * 55, y: y + fy * 55, t: 0, m: 0.9, r: 120, c: ringCol });
    const lanceCount = nCount(18);
    for (let i = 0; i < lanceCount; i++) {
      const f = i / Math.max(1, lanceCount - 1);
      const chevronOffset = (i % 3 - 1) * 16;
      const forwardSpd = 95 + f * 135;
      pushSurgeParticle(particles, {
        x: x + fx * (12 + f * 48) + pxPerp * chevronOffset * 0.65,
        y: y + fy * (12 + f * 48) + pyPerp * chevronOffset * 0.65,
        vx: fx * forwardSpd + pxPerp * chevronOffset * 1.4,
        vy: fy * forwardSpd + pyPerp * chevronOffset * 1.4,
        z: 6 + Math.sin(f * Math.PI) * 20,
        vz: 18 * style.liftMult,
        az: -24,
        drag: 1.9,
        spin: 5,
        size: 1.2 + (1 - f) * 0.35,
        shape: i % 4 === 0 ? style.primaryShape : 'crystal',
        l: 0.95 + f * 0.3,
        c: pickColor(colors, i),
      });
    }
    const hexCount = 12;
    for (let i = 0; i < hexCount; i++) {
      const a = (i / hexCount) * Math.PI * 2;
      pushSurgeParticle(particles, {
        x,
        y,
        vx: Math.cos(a) * 78,
        vy: Math.sin(a) * 78,
        z: 5,
        vz: 24,
        drag: 2.4,
        swirl: season === 'autumn' ? 1.5 : 0.4,
        spin: 4,
        size: 1.05,
        shape: i % 2 === 0 ? 'crystal' : style.primaryShape,
        l: 1.05,
        c: pickColor(colors, i + 1),
      });
    }
    capParticleBuffer(particles, maxCap);
    return;
  }

  // 5. TIDE SONG — Twin Counter-Rotating Wave Spirals & Pearl Fountain
  if (canonicalId === 'tide_song') {
    const waveArm = nCount(14);
    for (const dir of [-1, 1]) {
      for (let i = 0; i < waveArm; i++) {
        const f = i / Math.max(1, waveArm - 1);
        const a = f * Math.PI * 2 + (dir > 0 ? 0 : Math.PI);
        const spd = 48 + f * 72;
        pushSurgeParticle(particles, {
          x: x + Math.cos(a) * 10,
          y: y + Math.sin(a) * 10,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          z: 8 + f * 16,
          vz: (58 + Math.sin(f * Math.PI) * 52) * style.liftMult,
          az: -64,
          drag: 0.85,
          swirl: dir * (2.6 + Math.abs(style.swirlBias) * 0.4),
          spin: style.spinBase,
          size: i % 3 === 0 ? 1.35 : 0.95,
          shape: i % 3 === 0 ? 'ring' : i % 2 === 0 ? style.primaryShape : 'orb',
          l: 1.0 + Math.random() * 0.25,
          c: pickColor(colors, i),
        });
      }
    }
    capParticleBuffer(particles, maxCap);
    return;
  }

  // 6. MOON PULL — Inward Spiraling Gravity Streams + Core Bloom
  if (canonicalId === 'moon_pull') {
    magicRings.push({ x, y, t: 0, m: 0.75, r: 155, c: orbiterCol });
    const count = nCount(26);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const startR = 78 + (i % 3) * 20;
      const sx = x + Math.cos(a) * startR;
      const sy = y + Math.sin(a) * startR;
      const pullSpd = 92 + (i % 3) * 22;
      pushSurgeParticle(particles, {
        x: sx,
        y: sy,
        vx: -Math.cos(a) * pullSpd,
        vy: -Math.sin(a) * pullSpd,
        z: 22 - (i % 3) * 4,
        vz: 18 * style.liftMult,
        drag: 0.55,
        swirl: season === 'autumn' ? -3.8 : 3.2,
        spin: style.spinBase * 1.2,
        size: i % 2 === 0 ? 1.3 : 0.95,
        shape: i % 3 === 0 ? style.primaryShape : 'orb',
        l: 0.92 + (i % 3) * 0.12,
        c: pickColor(colors, i),
      });
    }
    // Central moon fountain
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      pushSurgeParticle(particles, {
        x,
        y,
        vx: Math.cos(a) * 22,
        vy: Math.sin(a) * 22,
        z: 12,
        vz: 82 * style.liftMult,
        az: -48,
        drag: 1.1,
        shape: 'spark',
        size: 1.25,
        l: 1.0,
        c: accentCol,
      });
    }
    capParticleBuffer(particles, maxCap);
    return;
  }

  // 7. BLOOM — Parametric Rose-Curve Corolla Mandala + Pollen Fountain
  if (canonicalId === 'bloom') {
    const petalLobes = season === 'winter' ? 6 : season === 'autumn' ? 8 : 5;
    const count = nCount(30);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const rose = 0.55 + 0.55 * Math.abs(Math.cos((petalLobes * a) / 2));
      const spd = 48 + rose * 86;
      pushSurgeParticle(particles, {
        x: x + Math.cos(a) * 8,
        y: y + Math.sin(a) * 8,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        z: 6 + rose * 18,
        vz: (24 + rose * 38) * style.liftMult,
        ax: style.windAx * 0.5,
        ay: style.windAy * 0.5,
        az: -28,
        drag: style.dragBase * 1.15,
        swirl: style.swirlBias * 0.7,
        spin: style.spinBase,
        size: 1.0 + rose * 0.55,
        shape: i % 4 === 0 ? 'orb' : style.primaryShape,
        l: 1.05 + Math.random() * 0.35,
        c: pickColor(colors, i),
      });
    }
    capParticleBuffer(particles, maxCap);
    return;
  }

  // 8. HUSH HUG — Ascending Parametric Heart Embrace
  if (canonicalId === 'hush_hug') {
    magicRings.push({ x, y, t: 0, m: 0.95, r: 150, c: ringCol });
    const count = nCount(26);
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2;
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      pushSurgeParticle(particles, {
        x: x + hx * 1.25,
        y: y + hy * 0.9,
        vx: hx * 3.6,
        vy: hy * 2.8,
        z: 14 + (i % 3) * 6,
        vz: (34 + (i % 4) * 11) * style.liftMult,
        ax: style.windAx * 0.3,
        drag: style.dragBase * 1.15,
        swirl: style.swirlBias * 0.45,
        spin: 3.5,
        size: i % 2 === 0 ? 1.3 : 1.0,
        shape: i % 3 === 2 ? style.primaryShape : 'heart',
        l: 1.15 + Math.random() * 0.25,
        c: pickColor(colors, i),
      });
    }
    capParticleBuffer(particles, maxCap);
    return;
  }

  // 9. EMBER WARMTH — Double-Helix Fire Pillar & Cinder Sparks
  if (canonicalId === 'ember_warmth') {
    const helixCount = nCount(24);
    for (let i = 0; i < helixCount; i++) {
      const f = i / Math.max(1, helixCount - 1);
      const strand = i % 2 === 0 ? 1 : -1;
      const a = f * Math.PI * 2 + (strand > 0 ? 0 : Math.PI);
      pushSurgeParticle(particles, {
        x: x + Math.cos(a) * 16,
        y: y + Math.sin(a) * 14,
        vx: Math.cos(a) * (42 + f * 35),
        vy: Math.sin(a) * (42 + f * 35),
        z: 6 + f * 20,
        vz: (68 + f * 88) * style.liftMult,
        az: -18,
        drag: 0.75,
        swirl: strand * (2.6 + (season === 'autumn' ? 1.1 : 0)),
        spin: 8,
        size: 1.35 - f * 0.35,
        shape: i % 3 === 0 ? style.primaryShape : i % 2 === 0 ? 'spark' : 'orb',
        l: 0.85 + Math.random() * 0.35,
        c: pickColor(colors, i),
      });
    }
    // Ground radial ember snap
    const cinderCount = nCount(10);
    for (let i = 0; i < cinderCount; i++) {
      const a = (i / cinderCount) * Math.PI * 2;
      pushSurgeParticle(particles, {
        x,
        y,
        vx: Math.cos(a) * 128,
        vy: Math.sin(a) * 128,
        z: 4,
        vz: 16,
        drag: 2.1,
        shape: 'spark',
        size: 1.1,
        l: 0.65,
        c: pickColor(colors, i + 1),
      });
    }
    capParticleBuffer(particles, maxCap);
    return;
  }

  // 10. ECHO CALL — Staggered Sonar Harmonics & Chime Notes
  if (canonicalId === 'echo_call') {
    magicRings.push({ x, y, t: 0, m: 1.05, r: 245, c: orbiterCol });
    magicRings.push({ x, y, t: 0, m: 1.45, r: 330, c: accentCol });
    const count = nCount(24);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const tier = (i % 3) + 1;
      const spd = 45 * tier;
      pushSurgeParticle(particles, {
        x: x + Math.cos(a) * 8,
        y: y + Math.sin(a) * 8,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        z: 18 + tier * 10,
        vz: (28 + tier * 14) * style.liftMult,
        drag: 0.9,
        swirl: style.swirlBias * 0.6,
        spin: 4.5,
        size: tier === 2 ? 1.3 : 1.0,
        shape: i % 2 === 0 ? 'note' : style.primaryShape,
        l: 1.1 + tier * 0.1,
        c: pickColor(colors, i),
      });
    }
    capParticleBuffer(particles, maxCap);
    return;
  }

  // 11. DREAMWALK — Ethereal Gossamer Phase Veil
  if (canonicalId === 'dreamwalk') {
    magicRings.push({ x, y, t: 0, m: 1.1, r: 170, c: orbiterCol });
    const count = nCount(26);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const strand = i % 2 === 0 ? 1 : -1;
      pushSurgeParticle(particles, {
        x: x + Math.cos(a) * 22,
        y: y + Math.sin(a) * 18,
        vx: Math.cos(a + strand * 0.5) * 58,
        vy: Math.sin(a + strand * 0.5) * 58,
        z: 10 + (i % 5) * 9,
        vz: (32 + (i % 4) * 16) * style.liftMult,
        drag: 1.65,
        swirl: strand * (2.0 + style.swirlBias * 0.35),
        spin: style.spinBase,
        size: 1.15,
        shape: i % 3 === 0 ? 'crystal' : i % 2 === 0 ? style.primaryShape : 'orb',
        l: 1.25 + Math.random() * 0.25,
        c: pickColor(colors, i),
      });
    }
    capParticleBuffer(particles, maxCap);
    return;
  }

  // 12. DAWN BREAK — Grand Sunrise Light Pillar + 16-Ray Horizon Corona
  if (canonicalId === 'dawn_break') {
    magicRings.push({ x, y, t: 0, m: 1.35, r: 310, c: ringCol });
    magicRings.push({ x, y, t: 0, m: 0.85, r: 165, c: orbiterCol });
    // Radiant rays
    const rayCount = nCount(24);
    for (let i = 0; i < rayCount; i++) {
      const a = (i / rayCount) * Math.PI * 2;
      const isMajor = i % 2 === 0;
      const spd = isMajor ? 148 : 88;
      pushSurgeParticle(particles, {
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        z: 12,
        vz: (isMajor ? 62 : 34) * style.liftMult,
        az: -30,
        drag: style.dragBase * 0.9,
        swirl: style.swirlBias * 0.5,
        spin: style.spinBase,
        size: isMajor ? 1.45 : 1.05,
        shape: isMajor ? 'spark' : style.primaryShape,
        l: 1.15 + Math.random() * 0.25,
        c: pickColor(colors, i),
      });
    }
    // Rising central solar pillar
    const pillarCount = nCount(14);
    for (let i = 0; i < pillarCount; i++) {
      const a = (i / pillarCount) * Math.PI * 2;
      pushSurgeParticle(particles, {
        x: x + Math.cos(a) * 14,
        y: y + Math.sin(a) * 12,
        vx: Math.cos(a) * 18,
        vy: Math.sin(a) * 16,
        z: 8 + i * 5,
        vz: (95 + i * 6) * style.liftMult,
        drag: 0.6,
        swirl: 2.8,
        spin: 7,
        size: 1.3,
        shape: i % 2 === 0 ? 'orb' : style.primaryShape,
        l: 1.2,
        c: pickColor(colors, i + 1),
      });
    }
    capParticleBuffer(particles, maxCap);
    return;
  }

  // 13. TELEPORT — Portal Vortex Tunnel Column
  if (canonicalId === 'teleport') {
    magicRings.push({ x, y, t: 0, m: 1.15, r: 215, c: orbiterCol });
    const count = nCount(30);
    for (let i = 0; i < count; i++) {
      const f = i / Math.max(1, count - 1);
      const a = f * Math.PI * 4;
      const spd = 38 + (1 - f) * 78;
      pushSurgeParticle(particles, {
        x: x + Math.cos(a) * 18,
        y: y + Math.sin(a) * 14,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        z: 4 + f * 72,
        vz: 48 * style.liftMult,
        drag: 0.9,
        swirl: 3.4,
        spin: style.spinBase * 1.3,
        size: 1.1 + (1 - f) * 0.35,
        shape: i % 3 === 0 ? 'ring' : i % 2 === 0 ? style.primaryShape : 'spark',
        l: 1.05 + f * 0.2,
        c: pickColor(colors, i),
      });
    }
    capParticleBuffer(particles, maxCap);
    return;
  }

  // 14. DUET — Twin Companion Musical Note & Heart Ribbon
  const cx = companionX ?? x - 24;
  const cy = companionY ?? y + 4;
  const duetCount = nCount(20);
  for (let i = 0; i < duetCount; i++) {
    const f = i / Math.max(1, duetCount - 1);
    const sx = x + (cx - x) * f;
    const sy = y + (cy - y) * f;
    const a = f * Math.PI * 2;
    pushSurgeParticle(particles, {
      x: sx,
      y: sy,
      vx: Math.cos(a) * 58,
      vy: Math.sin(a) * 58,
      z: 16 + Math.sin(f * Math.PI) * 28,
      vz: 42 * style.liftMult,
      drag: 1.1,
      swirl: 1.8,
      spin: 4,
      size: 1.25,
      shape: i % 2 === 0 ? 'note' : 'heart',
      l: 1.1,
      c: pickColor(colors, i),
    });
  }
  capParticleBuffer(particles, maxCap);
}

/**
 * Shared physics integrator for W.particles used identically in 3D and 2D loops.
 */
export function tickWorldParticles(particles: Particle[], dt: number, lowQuality: boolean): void {
  const maxCap = lowQuality ? 135 : 245;
  if (particles.length > maxCap) {
    particles.splice(0, particles.length - maxCap);
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.l -= dt;
    if (pt.l <= 0) {
      particles.splice(i, 1);
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
