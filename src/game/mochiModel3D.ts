/**
 * Mochi Meadows 2 — Procedural 3D Chibi Character & Companion Rig
 * Builds expressive multi-part 3D models for all 12 playable animal species
 * (Cat, Bunny, Bear, Fox, Dragon, Slime, Owl, Frog, Axolotl, Otter, Penguin, Deer),
 * 22 hats, 10 outfits, 8 eye styles, 6 mouth styles, 10 patterns, 5 face gear items,
 * 3D beaks/muzzles/frog-eyes/gills/wings/tails, Hollow states, and 7 detailed 3D companions.
 */

import * as THREE from 'three';
import { PlayerLook, shadeColor } from './engine';
import { resolveOutfitParts, resolveHairColor } from './constants';

export interface MochiActorOptions {
  look: PlayerLook;
  time: number;
  isMoving: boolean;
  isBlinking: boolean;
  facingYaw: number; // radians around +Y (0 = facing camera +Z)
  headYaw?: number;
  headPitch?: number;
  scale?: number;
  opacity?: number;
  highlighted?: boolean;
  isGreeting?: boolean;
  bobOffset?: number;
  isSwimming?: boolean;
  isSprinting?: boolean;
  jumpZ?: number; // 3D height above ground/water in world units (z / T)
  jumpVy?: number; // Vertical velocity indicator for squash/stretch
  dt?: number; // Frame delta in seconds (derived from time if omitted)
  moveSpeed?: number; // Normalized horizontal speed (~0 idle, ~1 walk, ~1.5 sprint)
  weatherBehavior?: 'dancing' | 'sheltering' | 'stargazing' | 'shivering' | 'idle';
  emoteAnim?: 'idle' | 'walk' | 'wave' | 'twirl' | 'dance' | 'cheer';
  cloudWings?: boolean;
  thermalWings?: boolean;
}

export interface HairSpringState {
  pitch: number;
  pitchVel: number;
  roll: number;
  rollVel: number;
  bounce: number;
  bounceVel: number;
  initialized: boolean;
  prevTime: number;
  prevYaw: number;
  prevJumpZ: number;
  prevJumpVy: number;
  prevHop: number;
  prevMoveSpeed: number;
  lastHairKey: string;
}

const FACE_TEX_MAX = 96;
const faceTextureCache = new Map<string, THREE.CanvasTexture>();
const hexColorCache = new Map<string, THREE.Color>();

// Scratch colors (zero-GC in updateMochiRig)
const _baseCol = new THREE.Color();
const _c2Col = new THREE.Color();
const _acCol = new THREE.Color();
const _hatCol = new THREE.Color();
const _patCol = new THREE.Color();
const _noseCol = new THREE.Color();
const _outCol1 = new THREE.Color();
const _outCol2 = new THREE.Color();
const _outCol3 = new THREE.Color();
const _hairCol = new THREE.Color();
const _sheenCol = new THREE.Color();
const _hollowColA = new THREE.Color('#9e9ea8');
const _hollowColB = new THREE.Color('#c2c2cc');
const _hollowColC = new THREE.Color('#7a7a85');
const _plushHsl = { h: 0, s: 0, l: 0 };

function boostPlushColor(c: THREE.Color, satBoost = 0.16, lightShift = -0.025): void {
  const maxC = Math.max(c.r, c.g, c.b);
  const minC = Math.min(c.r, c.g, c.b);
  const chroma = maxC - minC;
  if (chroma < 0.08) return;
  c.getHSL(_plushHsl);
  const nextS = Math.min(1.0, _plushHsl.s + satBoost * (1 - _plushHsl.s * 0.3));
  const nextL = Math.max(0.08, Math.min(0.92, _plushHsl.l + lightShift * Math.min(1, chroma * 2.2)));
  c.setHSL(_plushHsl.h, nextS, nextL);
}

const AURA_COLOR_MAP: Record<number, number> = {
  1: 0xffd23f,
  2: 0xff6fa0,
  3: 0xffb3c7,
  4: 0xff7b4a,
  5: 0x7de0ff,
  6: 0xe0f7ff,
  7: 0xff7aa8,
  8: 0xe67e22,
  9: 0x7bd88f,
  10: 0xffb703,
  11: 0xb48cff,
};

// Shared static plush & detail materials
const STATIC_MAT = {
  pink: new THREE.MeshStandardMaterial({ color: 0xffb6c9, roughness: 0.58 }),
  pinkGloss: new THREE.MeshStandardMaterial({ color: 0xff7aa8, roughness: 0.28 }),
  white: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.52 }),
  cream: new THREE.MeshStandardMaterial({ color: 0xfff8ec, roughness: 0.58 }),
  antler: new THREE.MeshStandardMaterial({ color: 0x7a5748, roughness: 0.72 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.34, metalness: 0.22 }),
  beakOrange: new THREE.MeshStandardMaterial({ color: 0xff9f29, roughness: 0.36 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x7bd88f, roughness: 0.48 }),
  brown: new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.68 }),
  red: new THREE.MeshStandardMaterial({ color: 0xff6b6b, roughness: 0.5 }),
  navy: new THREE.MeshStandardMaterial({ color: 0x2b2438, roughness: 0.6 }),
  wiz: new THREE.MeshStandardMaterial({ color: 0x5a4fcf, roughness: 0.5 }),
  straw: new THREE.MeshStandardMaterial({ color: 0xf3d078, roughness: 0.7 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x7de0ff, roughness: 0.18, metalness: 0.3 }),
  flowerPink: new THREE.MeshStandardMaterial({ color: 0xff9ebb, roughness: 0.45 }),
  cloud: new THREE.MeshStandardMaterial({ color: 0xc8ccd9, roughness: 0.75 }),
  noseDark: new THREE.MeshStandardMaterial({ color: 0x2a1d32, roughness: 0.22, metalness: 0.08 }),
  whisker: new THREE.MeshStandardMaterial({ color: 0x3b2a45, roughness: 0.5 }),
  eyeWhite: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.18 }),
  eyeGloss: new THREE.MeshStandardMaterial({ color: 0x22162b, roughness: 0.12 }),
  eyeDark: new THREE.MeshBasicMaterial({ color: 0x3b2a45 }),
  slimeBubble: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xd8f8ff,
    emissiveIntensity: 0.25,
    roughness: 0.12,
    transparent: true,
    opacity: 0.55,
  }),
  mothBody: new THREE.MeshStandardMaterial({
    color: 0xffeaa7,
    emissive: 0xffd23f,
    emissiveIntensity: 0.45,
    roughness: 0.4,
  }),
  mothWing: new THREE.MeshStandardMaterial({
    color: 0xfff5c0,
    emissive: 0xffdf80,
    emissiveIntensity: 0.3,
    roughness: 0.35,
  }),
  whale: new THREE.MeshStandardMaterial({ color: 0xa8e6ff, roughness: 0.45 }),
  gloria: new THREE.MeshStandardMaterial({ color: 0xb0aec2, roughness: 0.78 }),
  gary: new THREE.MeshStandardMaterial({ color: 0x9694a4, roughness: 0.78 }),
  honeyCream: new THREE.MeshStandardMaterial({ color: 0xfff4cc, roughness: 0.62 }),
  beeYellow: new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.42 }),
  beeWing: new THREE.MeshStandardMaterial({ color: 0xe6f8ff, roughness: 0.16, transparent: true, opacity: 0.78 }),
  frogCompGreen: new THREE.MeshStandardMaterial({ color: 0x62c97a, roughness: 0.42 }),
  frogBellyGlow: new THREE.MeshStandardMaterial({
    color: 0xfff3b0,
    emissive: 0xffd166,
    emissiveIntensity: 0.55,
    roughness: 0.35,
  }),
};

function resolveCachedColor(hex: string | undefined, fallback: string, out: THREE.Color): void {
  const key = hex || fallback;
  let c = hexColorCache.get(key);
  if (!c) {
    c = new THREE.Color();
    try {
      c.set(key);
    } catch {
      c.set(fallback);
    }
    if (hexColorCache.size > 160) hexColorCache.clear();
    hexColorCache.set(key, c);
  }
  out.copy(c);
}

/**
 * High-resolution 256x256 CanvasTexture for expressive animal facial markings,
 * eye styles, rosy cheeks, coat face patterns, and blinking.
 * Note: Frog 3D eyes and Owl/Penguin 3D beaks are sculpted in geometry so they pop!
 */
function getOrCreateFaceTexture(look: PlayerLook, isBlinking: boolean): THREE.CanvasTexture {
  const sp = look.sp || 'cat';
  const rawBloom = look.hollowColorBloom ?? look.hollowBloom;
  const bloom = rawBloom !== undefined ? Math.round(rawBloom * 4) / 4 : look.isHollow ? 0 : 1;
  const col = look.col || '#ffb3c7';
  const c2 = look.c2 || shadeColor(col, 0.55);
  const pat = look.pat || 0;
  const patCol = look.patCol || look.dye2 || '';
  const cheeks = look.cheeks ?? 0;
  const key = [
    sp,
    col,
    c2,
    pat,
    patCol,
    cheeks,
    look.eyes || 0,
    look.mouth || 0,
    look.face || 0,
    look.eyeCol || '',
    look.noseCol || '',
    isBlinking ? 1 : 0,
    bloom,
  ].join('|');

  const existing = faceTextureCache.get(key);
  if (existing) return existing;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    const ou = '#3b2a45';
    const cx = size * 0.5;
    const cy = size * 0.5;
    const S = 2; // crisp 256px design scale

    const ellipse = (x: number, y: number, rx: number, ry: number, fill: string, rot = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    const circle = (x: number, y: number, r: number, fill: string) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };

    // Species-authentic facial fur/feather masks
    if (sp === 'owl') {
      // Heart-shaped owl facial discs with delicate warm scalloped outline
      ellipse(cx - 15 * S, cy - 2 * S, 20 * S, 22 * S, c2);
      ellipse(cx + 15 * S, cy - 2 * S, 20 * S, 22 * S, c2);
      ctx.strokeStyle = shadeColor(col, -0.22);
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(cx - 15 * S, cy - 2 * S, 20.5 * S, Math.PI * 0.72, Math.PI * 1.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 15 * S, cy - 2 * S, 20.5 * S, Math.PI * 1.1, Math.PI * 0.28);
      ctx.stroke();
    } else if (sp === 'penguin') {
      // Classic penguin white heart/hood mask framing face cleanly
      ellipse(cx - 13.5 * S, cy + 1 * S, 18.5 * S, 21.5 * S, '#ffffff');
      ellipse(cx + 13.5 * S, cy + 1 * S, 18.5 * S, 21.5 * S, '#ffffff');
      ellipse(cx, cy + 12 * S, 24 * S, 16 * S, '#ffffff');
    } else if (sp === 'fox') {
      // Swept creamy-white vulpine lower cheeks & chin fur
      ellipse(cx - 24 * S, cy + 11 * S, 20 * S, 12 * S, '#fff8ef', 0.28);
      ellipse(cx + 24 * S, cy + 11 * S, 20 * S, 12 * S, '#fff8ef', -0.28);
      ellipse(cx, cy + 16 * S, 18 * S, 10 * S, '#fff8ef');
    } else if (sp === 'bear' || sp === 'otter') {
      ellipse(cx, cy + 12 * S, 22 * S, 15 * S, c2);
      if (sp === 'bear') {
        // Cozy pale bear brow spots
        for (const k of [-1, 1]) {
          ellipse(cx + k * 15 * S, cy - 17 * S, 5.5 * S, 3 * S, c2, -k * 0.2);
        }
      }
    } else if (sp === 'deer') {
      // Soft cream fawn brow spots & bright muzzle underside
      for (const k of [-1, 1]) {
        ellipse(cx + k * 14 * S, cy - 16 * S, 4.5 * S, 2.5 * S, '#fff5ee', -k * 0.15);
      }
      ellipse(cx, cy + 13 * S, 18 * S, 12 * S, '#fff6ee');
    } else if (sp === 'cat') {
      // Delicate tabby forehead crown markings & whisker freckles
      ctx.strokeStyle = shadeColor(col, -0.22);
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      for (const ox of [-7 * S, 0, 7 * S]) {
        ctx.beginPath();
        ctx.moveTo(cx + ox, cy - 30 * S);
        ctx.lineTo(cx + ox * 0.85, cy - 22 * S);
        ctx.stroke();
      }
    }

    // Subtle Coat Pattern Facial Accents (look.pat 1..9)
    const patAccent = patCol || shadeColor(col, -0.26);
    if (pat === 1) {
      // Calico cheek patch
      ellipse(cx - 28 * S, cy - 12 * S, 11 * S, 9 * S, patAccent, -0.3);
    } else if (pat === 2) {
      // Tabby cheek stripes
      ctx.strokeStyle = patCol || shadeColor(col, -0.28);
      ctx.lineWidth = 3.2;
      for (const k of [-1, 1]) {
        for (let r = 0; r < 2; r++) {
          ctx.beginPath();
          ctx.moveTo(cx + k * 34 * S, cy + (1 + r * 6) * S);
          ctx.lineTo(cx + k * 44 * S, cy + (r * 6 - 1) * S);
          ctx.stroke();
        }
      }
    } else if (pat === 4) {
      // Cute cheek freckles
      ctx.fillStyle = patCol || shadeColor(col, -0.32);
      for (const k of [-1, 1]) {
        circle(cx + k * 24 * S, cy + 8 * S, 2.0, ctx.fillStyle);
        circle(cx + k * 28 * S, cy + 10.5 * S, 2.0, ctx.fillStyle);
        circle(cx + k * 22 * S, cy + 11.5 * S, 1.8, ctx.fillStyle);
      }
    } else if (pat === 7) {
      // Starlight cheek sparkles
      const stCol = patCol || '#ffd23f';
      circle(cx - 28 * S, cy - 16 * S, 3.5, stCol);
      circle(cx + 28 * S, cy - 16 * S, 3.0, stCol);
    }

    // Customizable cheek blush (0=soft peach, 1=rosy pink, 2=kawaii pop, 3=starry blush, 4=none)
    const ey = (sp === 'frog' ? cy + 3 * S : cy - 4 * S);
    const cheekX = sp === 'frog' || sp === 'axolotl' ? 29 * S : 26 * S;
    if (cheeks !== 4) {
      const cheekFill =
        cheeks === 1
          ? 'rgba(255, 115, 165, 0.58)'
          : cheeks === 2
          ? 'rgba(255, 76, 130, 0.72)'
          : cheeks === 3
          ? 'rgba(255, 130, 175, 0.54)'
          : 'rgba(255, 155, 145, 0.50)';
      for (const k of [-1, 1]) {
        ellipse(cx + k * cheekX, ey + 13 * S, 9.5 * S, 5.2 * S, cheekFill);
        if (cheeks === 2) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 2.2 * S;
          ctx.beginPath();
          ctx.moveTo(cx + k * cheekX - 4 * S, ey + 15 * S);
          ctx.lineTo(cx + k * cheekX - 1 * S, ey + 11 * S);
          ctx.moveTo(cx + k * cheekX + 1 * S, ey + 15 * S);
          ctx.lineTo(cx + k * cheekX + 4 * S, ey + 11 * S);
          ctx.stroke();
        } else if (cheeks === 3) {
          circle(cx + k * cheekX + k * 2 * S, ey + 12.5 * S, 2.2 * S, '#fff6b8');
        }
      }
    }

    // Eyes (Frogs use real 3D bulbous top-mounted eyes + blinking lids, so skip flat painted eyes for 'frog')
    const eyeFill = look.eyeCol || ou;
    const eyeSpan = sp === 'axolotl' ? 21 * S : sp === 'owl' ? 15.5 * S : 17 * S;
    if (sp !== 'frog') {
      for (const k of [-1, 1]) {
        const ex = cx + k * eyeSpan;
        if (isBlinking) {
          ctx.strokeStyle = eyeFill;
          ctx.lineWidth = 6.2 * S;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(ex - 9 * S, ey);
          ctx.lineTo(ex + 9 * S, ey);
          ctx.stroke();
        } else if (look.eyes === 1) {
          circle(ex, ey, 11.5 * S, eyeFill);
          circle(ex + 3.5 * S, ey - 3.5 * S, 4.8 * S, '#ffffff');
          circle(ex - 3 * S, ey + 3.2 * S, 2.8 * S, '#ffffff');
        } else if (look.eyes === 2) {
          ctx.strokeStyle = eyeFill;
          ctx.lineWidth = 6.5 * S;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(ex, ey + 4 * S, 9.5 * S, Math.PI, 0);
          ctx.stroke();
        } else if (look.eyes === 3) {
          ctx.strokeStyle = eyeFill;
          ctx.lineWidth = 6 * S;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(ex - 9 * S, ey);
          ctx.lineTo(ex + 9 * S, ey);
          ctx.stroke();
        } else if (look.eyes === 4) {
          ctx.fillStyle = look.eyeCol || '#ffd23f';
          ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const rad = (i % 2 === 0 ? 12 : 5.2) * S;
            const ang = (i * Math.PI) / 5 - Math.PI / 2;
            if (i === 0) ctx.moveTo(ex + Math.cos(ang) * rad, ey + Math.sin(ang) * rad);
            else ctx.lineTo(ex + Math.cos(ang) * rad, ey + Math.sin(ang) * rad);
          }
          ctx.closePath();
          ctx.fill();
          circle(ex, ey, 3.6 * S, '#ffffff');
        } else if (look.eyes === 5) {
          const hCol = look.eyeCol || '#ff6fa0';
          circle(ex - 4.2 * S, ey - 2.4 * S, 5.6 * S, hCol);
          circle(ex + 4.2 * S, ey - 2.4 * S, 5.6 * S, hCol);
          ctx.fillStyle = hCol;
          ctx.beginPath();
          ctx.moveTo(ex - 9.5 * S, ey - 0.8 * S);
          ctx.lineTo(ex + 9.5 * S, ey - 0.8 * S);
          ctx.lineTo(ex, ey + 9.2 * S);
          ctx.closePath();
          ctx.fill();
        } else if (look.eyes === 6) {
          circle(ex, ey - 1 * S, 10.5 * S, eyeFill);
          circle(ex + 3 * S, ey - 4 * S, 4.2 * S, '#ffffff');
          ctx.strokeStyle = eyeFill;
          ctx.lineWidth = 4 * S;
          ctx.beginPath();
          ctx.arc(ex, ey - 11 * S, 8.5 * S, Math.PI * 1.1, Math.PI * 1.9);
          ctx.stroke();
        } else if (look.eyes === 7) {
          ctx.fillStyle = look.eyeCol || '#6ecbff';
          ctx.beginPath();
          ctx.moveTo(ex, ey - 12 * S);
          ctx.lineTo(ex + 9 * S, ey);
          ctx.lineTo(ex, ey + 12 * S);
          ctx.lineTo(ex - 9 * S, ey);
          ctx.closePath();
          ctx.fill();
          circle(ex, ey - 2 * S, 3.6 * S, '#ffffff');
        } else if (look.eyes === 8) {
          // Playful Wink
          if (k > 0) {
            ctx.strokeStyle = eyeFill;
            ctx.lineWidth = 6 * S;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(ex - 9 * S, ey + 3 * S);
            ctx.lineTo(ex + 8 * S, ey - 1 * S);
            ctx.lineTo(ex - 9 * S, ey - 5 * S);
            ctx.stroke();
          } else {
            circle(ex, ey, 10.8 * S, eyeFill);
            circle(ex + 3.4 * S, ey - 3.4 * S, 4.3 * S, '#ffffff');
            circle(ex - 2.6 * S, ey + 3.0 * S, 2.2 * S, 'rgba(255,255,255,0.85)');
          }
        } else if (look.eyes === 9) {
          // Crescent Dream Eyes
          circle(ex, ey, 11 * S, eyeFill);
          ellipse(ex, ey - 3.5 * S, 8.2 * S, 4.8 * S, '#ffd23f');
          circle(ex, ey - 5.5 * S, 7.2 * S, eyeFill);
          circle(ex + 3.5 * S, ey - 3.5 * S, 3.6 * S, '#ffffff');
        } else if (look.eyes === 10) {
          // Sharp Cat Slit Iris
          circle(ex, ey, 11 * S, eyeFill);
          ellipse(ex, ey, 3.8 * S, 8.2 * S, '#ffd23f');
          ellipse(ex, ey, 1.8 * S, 6.8 * S, '#1c1224');
          circle(ex + 3.8 * S, ey - 3.8 * S, 3.4 * S, '#ffffff');
        } else if (look.eyes === 11) {
          // Heterochromia Odd-Eye Jewel
          const iris = k < 0 ? (look.eyeCol || '#6ecbff') : '#ff7aa8';
          circle(ex, ey, 11.2 * S, '#24182e');
          circle(ex, ey, 7.8 * S, iris);
          circle(ex, ey, 4.2 * S, '#1f1529');
          circle(ex + 3.6 * S, ey - 3.6 * S, 4.0 * S, '#ffffff');
        } else {
          // Luminous signature anime Mochi eyes with subtle iris tint for owls/dragons/deer
          circle(ex, ey, 10.5 * S, eyeFill);
          if (sp === 'owl') {
            circle(ex, ey, 7.2 * S, '#ffb703');
            circle(ex, ey, 4.8 * S, eyeFill);
          } else if (sp === 'dragon') {
            ellipse(ex, ey, 3.2 * S, 7.2 * S, '#ffd23f');
            ellipse(ex, ey, 1.5 * S, 5.8 * S, eyeFill);
          }
          circle(ex + 3.4 * S, ey - 3.4 * S, 4.2 * S, '#ffffff');
          circle(ex - 2.6 * S, ey + 3.0 * S, 2.0 * S, 'rgba(255,255,255,0.82)');
        }
      }
    } else {
      // Frog tiny adorable nostril dimples above mouth
      circle(cx - 5 * S, cy - 2 * S, 2.4 * S, look.noseCol || shadeColor(col, -0.35));
      circle(cx + 5 * S, cy - 2 * S, 2.4 * S, look.noseCol || shadeColor(col, -0.35));
    }

    // Face Gear
    if (look.face === 1) {
      ctx.strokeStyle = '#3b2a45';
      ctx.lineWidth = 4.2 * S;
      for (const k of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(cx + k * 17 * S, ey, 14 * S, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(200, 240, 255, 0.28)';
        ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(cx - 3 * S, ey);
      ctx.lineTo(cx + 3 * S, ey);
      ctx.stroke();
    } else if (look.face === 2) {
      ctx.fillStyle = '#1f192b';
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 3 * S;
      for (const k of [-1, 1]) {
        const gx = cx + k * 17 * S;
        ctx.beginPath();
        ctx.roundRect(gx - 14 * S, ey - 9 * S, 28 * S, 18 * S, 6 * S);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillRect(cx - 3.5 * S, ey - 4.5 * S, 7 * S, 4.5 * S);
    } else if (look.face === 3) {
      for (const k of [-1, 1]) {
        ellipse(cx + k * 28 * S, ey + 13 * S, 10 * S, 6 * S, 'rgba(255, 110, 155, 0.65)');
      }
    } else if (look.face === 4) {
      for (const k of [-1, 1]) {
        const fx = cx + k * 26 * S;
        circle(fx, ey + 11 * S, 3.8 * S, '#ffd23f');
        circle(fx + k * 7 * S, ey + 15 * S, 3.2 * S, '#ff7aa8');
        circle(fx - k * 5 * S, ey + 16 * S, 3.0 * S, '#ffffff');
      }
    }

    // Mouth (positioned cleanly beneath 3D nose/beak)
    const my = sp === 'frog' ? cy + 12 * S : cy + 17 * S;
    ctx.strokeStyle = ou;
    ctx.lineWidth = 4.2 * S;
    ctx.lineCap = 'round';
    if (sp !== 'owl' && sp !== 'penguin') {
      ctx.beginPath();
      if (sp === 'frog' && look.mouth === 0) {
        // Wide joyful amphibian grin
        ctx.arc(cx, my - 4 * S, 18 * S, 0.18, Math.PI - 0.18);
      } else if (look.mouth === 1) {
        ctx.arc(cx, my, 11 * S, 0, Math.PI);
      } else if (look.mouth === 2) {
        circle(cx, my + 1 * S, 5 * S, ou);
      } else if (look.mouth === 3) {
        ctx.moveTo(cx - 7 * S, my + 1 * S);
        ctx.quadraticCurveTo(cx + 4 * S, my + 4.5 * S, cx + 11 * S, my - 4 * S);
      } else if (look.mouth === 6) {
        // Big cheerful open laugh ":D"
        ctx.fillStyle = '#d94862';
        ctx.beginPath();
        ctx.arc(cx, my - 1 * S, 10.5 * S, 0, Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ellipse(cx, my + 5 * S, 5.5 * S, 2.8 * S, '#ff8fb8');
      } else if (look.mouth === 7) {
        // Cheeky fang ":3c"
        ctx.arc(cx - 5.2 * S, my - 1 * S, 5.2 * S, 0, Math.PI);
        ctx.arc(cx + 5.2 * S, my - 1 * S, 5.2 * S, 0, Math.PI);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(cx + 5 * S, my + 3.5 * S);
        ctx.lineTo(cx + 8.5 * S, my + 3.5 * S);
        ctx.lineTo(cx + 6.8 * S, my + 8.5 * S);
        ctx.closePath();
        ctx.fill();
      } else if (look.mouth === 8) {
        // Cozy blep tongue ":P"
        ctx.arc(cx - 5 * S, my - 1 * S, 5 * S, 0, Math.PI);
        ctx.arc(cx + 5 * S, my - 1 * S, 5 * S, 0, Math.PI);
        ctx.stroke();
        ellipse(cx + 2 * S, my + 6.5 * S, 4.4 * S, 5.4 * S, '#ff7aa8');
      } else if (look.mouth === 4 || sp === 'cat' || sp === 'bunny' || sp === 'fox') {
        // Signature ":3" split animal mouth
        ctx.arc(cx - 5.2 * S, my - 1 * S, 5.2 * S, 0, Math.PI);
        ctx.arc(cx + 5.2 * S, my - 1 * S, 5.2 * S, 0, Math.PI);
      } else if (look.mouth === 5) {
        ctx.arc(cx - 5 * S, my + 2 * S, 5 * S, Math.PI * 0.1, Math.PI * 0.9);
        ctx.arc(cx + 5 * S, my + 2 * S, 5 * S, Math.PI * 0.1, Math.PI * 0.9);
      } else {
        ctx.arc(cx, my - 1.5 * S, 9 * S, 0.2, Math.PI - 0.2);
      }
      if (look.mouth !== 6 && look.mouth !== 7 && look.mouth !== 8) {
        ctx.stroke();
      }
    } else if (look.mouth === 1) {
      ctx.beginPath();
      ctx.arc(cx, my + 3 * S, 6 * S, 0, Math.PI);
      ctx.stroke();
    }

    // Subtle soft painted inner cheek-whisker accents (supplemented by real 3D whisker spines)
    if (sp === 'cat' || sp === 'otter') {
      ctx.strokeStyle = 'rgba(59, 42, 69, 0.55)';
      ctx.lineWidth = 2.4 * S;
      for (const k of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + k * 25 * S, cy + 12 * S);
        ctx.lineTo(cx + k * 46 * S, cy + 9 * S);
        ctx.moveTo(cx + k * 25 * S, cy + 16 * S);
        ctx.lineTo(cx + k * 46 * S, cy + 19 * S);
        ctx.stroke();
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  if (faceTextureCache.size >= FACE_TEX_MAX) {
    const firstKey = faceTextureCache.keys().next().value;
    if (firstKey !== undefined) {
      faceTextureCache.get(firstKey)?.dispose();
      faceTextureCache.delete(firstKey);
    }
  }
  faceTextureCache.set(key, tex);
  return tex;
}

let softShadowTex: THREE.CanvasTexture | null = null;

export function getSoftShadowTexture(): THREE.CanvasTexture {
  if (softShadowTex) return softShadowTex;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = size * 0.5;
    const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
    grad.addColorStop(0.0, 'rgba(22, 12, 36, 0.92)');
    grad.addColorStop(0.42, 'rgba(22, 12, 36, 0.62)');
    grad.addColorStop(0.75, 'rgba(22, 12, 36, 0.18)');
    grad.addColorStop(1.0, 'rgba(22, 12, 36, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  softShadowTex = tex;
  return tex;
}

type CompanionTexKind =
  | 'gloom_button'
  | 'gloria_agate'
  | 'gary_slate'
  | 'moth_wing'
  | 'bee_wing'
  | 'whale_belly'
  | 'frog_skin';

const companionTexCache = new Map<CompanionTexKind, THREE.CanvasTexture>();

function getCompanionTexture(kind: CompanionTexKind): THREE.CanvasTexture {
  const existing = companionTexCache.get(kind);
  if (existing) return existing;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    if (kind === 'gloom_button') {
      const grad = ctx.createRadialGradient(48, 44, 6, 64, 64, 64);
      grad.addColorStop(0, '#ffe885');
      grad.addColorStop(0.55, '#f2bd29');
      grad.addColorStop(1, '#b87f12');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      ctx.strokeStyle = '#99650b';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(64, 64, 52, 0, Math.PI * 2);
      ctx.stroke();

      // 4 buttonholes + stitched cream cross-thread
      const holes: [number, number][] = [
        [48, 48],
        [80, 48],
        [48, 80],
        [80, 80],
      ];
      ctx.fillStyle = '#3b2410';
      for (const [hx, hy] of holes) {
        ctx.beginPath();
        ctx.arc(hx, hy, 7.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = '#fff5d6';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(48, 48);
      ctx.lineTo(80, 80);
      ctx.moveTo(80, 48);
      ctx.lineTo(48, 80);
      ctx.stroke();
    } else if (kind === 'gloria_agate') {
      const grad = ctx.createLinearGradient(0, 0, 0, size);
      grad.addColorStop(0, '#b5c2d9');
      grad.addColorStop(0.35, '#8ca8c8');
      grad.addColorStop(0.65, '#68b6c7');
      grad.addColorStop(1, '#8b93ad');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      // Concentric river-agate quartz bands
      const bands = ['rgba(255,255,255,0.28)', 'rgba(82,209,220,0.28)', 'rgba(56,74,107,0.16)'];
      for (let i = 0; i < 6; i++) {
        ctx.strokeStyle = bands[i % bands.length];
        ctx.lineWidth = 4 + (i % 2) * 2;
        ctx.beginPath();
        const yBase = 16 + i * 19;
        ctx.moveTo(0, yBase);
        ctx.bezierCurveTo(36, yBase - 10, 92, yBase + 11, size, yBase - 2);
        ctx.stroke();
      }
      // Singing Echo spiral rune in teal-white on crown/front
      ctx.strokeStyle = 'rgba(210, 252, 255, 0.72)';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 3.4; a += 0.2) {
        const r = 2 + a * 1.9;
        const px = 64 + Math.cos(a) * r;
        const py = 54 + Math.sin(a) * r;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    } else if (kind === 'gary_slate') {
      ctx.fillStyle = '#868599';
      ctx.fillRect(0, 0, size, size);
      // Granite mineral speckles & subtle chiseled facet shading
      for (let i = 0; i < 160; i++) {
        const sx = ((i * 53) % 124) + 2;
        const sy = ((i * 97) % 124) + 2;
        const r = 1.2 + (i % 3) * 0.9;
        ctx.fillStyle =
          i % 3 === 0 ? 'rgba(225,228,242,0.34)' : i % 3 === 1 ? 'rgba(46,44,64,0.32)' : 'rgba(118,124,142,0.4)';
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (kind === 'moth_wing') {
      // Scalloped Luna silk-moth wing silhouette (hinges at x=0, extends to +x)
      ctx.beginPath();
      ctx.moveTo(4, 52);
      ctx.bezierCurveTo(28, 12, 92, 8, 120, 32);
      ctx.bezierCurveTo(126, 54, 114, 78, 94, 92);
      ctx.bezierCurveTo(100, 112, 86, 124, 68, 116);
      ctx.bezierCurveTo(44, 108, 18, 92, 4, 74);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, 20, 118, 108);
      grad.addColorStop(0, '#fff7d4');
      grad.addColorStop(0.55, '#ffe793');
      grad.addColorStop(0.88, '#f6c8ff');
      grad.addColorStop(1, '#c89cf5');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = '#9b74c7';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Delicate wing veins
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 2.4;
      for (const [tx, ty] of [
        [102, 36],
        [104, 58],
        [86, 86],
      ]) {
        ctx.beginPath();
        ctx.moveTo(10, 62);
        ctx.quadraticCurveTo(54, ty * 0.88, tx, ty);
        ctx.stroke();
      }

      // Luminous crescent moon eye-spot
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.arc(72, 54, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5a3b82';
      ctx.beginPath();
      ctx.arc(72, 54, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff5b8';
      ctx.beginPath();
      ctx.arc(70, 52, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5a3b82';
      ctx.beginPath();
      ctx.arc(74, 49, 7.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'bee_wing') {
      // Veined translucent gossamer bee wing (hinges at x=0, extends to +x)
      ctx.beginPath();
      ctx.moveTo(4, 62);
      ctx.bezierCurveTo(26, 20, 96, 16, 120, 48);
      ctx.bezierCurveTo(124, 78, 86, 108, 22, 92);
      ctx.closePath();

      const grad = ctx.createRadialGradient(54, 58, 8, 66, 58, 68);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.94)');
      grad.addColorStop(0.65, 'rgba(216, 246, 255, 0.82)');
      grad.addColorStop(1, 'rgba(182, 226, 255, 0.72)');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = 'rgba(130, 176, 214, 0.9)';
      ctx.lineWidth = 3.2;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(112, 148, 186, 0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(8, 64);
      ctx.quadraticCurveTo(56, 46, 108, 48);
      ctx.moveTo(14, 68);
      ctx.quadraticCurveTo(56, 72, 96, 74);
      ctx.stroke();
    } else if (kind === 'whale_belly') {
      ctx.fillStyle = '#fff8ee';
      ctx.fillRect(0, 0, size, size);
      // Ivory pleated baleen throat grooves
      ctx.strokeStyle = '#d4e9f7';
      ctx.lineWidth = 4.2;
      for (let x = 14; x < size; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 12);
        ctx.lineTo(x, size - 12);
        ctx.stroke();
      }
    } else if (kind === 'frog_skin') {
      const grad = ctx.createRadialGradient(64, 50, 12, 64, 64, 74);
      grad.addColorStop(0, '#6ed984');
      grad.addColorStop(1, '#43a359');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = 'rgba(34, 108, 54, 0.45)';
      for (const [dx, dy, dr] of [
        [38, 44, 11],
        [86, 48, 10],
        [52, 82, 13],
        [82, 84, 8],
        [64, 28, 7],
      ]) {
        ctx.beginPath();
        ctx.arc(dx, dy, dr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  companionTexCache.set(kind, tex);
  return tex;
}

export function disposeSharedMochiTextures(): void {
  faceTextureCache.forEach((t) => t.dispose());
  faceTextureCache.clear();
  companionTexCache.forEach((t) => t.dispose());
  companionTexCache.clear();
  if (softShadowTex) {
    softShadowTex.dispose();
    softShadowTex = null;
  }
}

// Shared modular geometries (reused across all rigs for zero GC)
const GEO = {
  shadow: new THREE.PlaneGeometry(1.12, 1.12),
  ring: new THREE.RingGeometry(0.5, 0.62, 28),
  torso: new THREE.SphereGeometry(0.36, 18, 14),
  belly: new THREE.SphereGeometry(0.25, 14, 12),
  head: new THREE.SphereGeometry(0.42, 22, 18),
  facePlane: new THREE.SphereGeometry(0.425, 18, 14, Math.PI * 0.22, Math.PI * 0.56, Math.PI * 0.24, Math.PI * 0.52),
  foot: new THREE.SphereGeometry(0.13, 12, 10),
  arm: new THREE.CapsuleGeometry(0.085, 0.14, 6, 10),
  earCone: new THREE.ConeGeometry(0.145, 0.34, 14),
  earInnerCone: new THREE.ConeGeometry(0.085, 0.22, 12),
  earCapsule: new THREE.CapsuleGeometry(0.09, 0.24, 6, 10),
  earDisc: new THREE.SphereGeometry(0.14, 12, 10),
  muzzle: new THREE.SphereGeometry(0.13, 12, 10),
  snoutCone: new THREE.ConeGeometry(0.13, 0.24, 12),
  beakCone: new THREE.ConeGeometry(0.085, 0.18, 8),
  frogEyeDome: new THREE.SphereGeometry(0.15, 14, 12),
  frogEyeball: new THREE.SphereGeometry(0.11, 14, 12),
  frogPupil: new THREE.SphereGeometry(0.068, 12, 10),
  frogEyelid: new THREE.SphereGeometry(0.118, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
  whisker: new THREE.CylinderGeometry(0.009, 0.005, 0.22, 6),
  antlerStem: new THREE.CylinderGeometry(0.022, 0.032, 0.26, 8),
  antlerTine: new THREE.CylinderGeometry(0.015, 0.024, 0.16, 7),
  wingMembrane: new THREE.ConeGeometry(0.24, 0.46, 4),
  featherBlade: new THREE.CapsuleGeometry(0.065, 0.24, 6, 10),
  dorsalRidge: new THREE.ConeGeometry(0.06, 0.15, 5),
  tailCurve: new THREE.CapsuleGeometry(0.06, 0.28, 6, 10),
  tailPuff: new THREE.SphereGeometry(0.15, 12, 10),
  spotDisc: new THREE.SphereGeometry(0.065, 8, 6),
  scarfTorus: new THREE.TorusGeometry(0.31, 0.065, 10, 20),
  outfitCape: new THREE.CylinderGeometry(0.24, 0.42, 0.48, 14),
  outfitTunic: new THREE.CylinderGeometry(0.35, 0.39, 0.36, 18),
  outfitBelt: new THREE.TorusGeometry(0.39, 0.042, 8, 22),
  outfitCollar: new THREE.TorusGeometry(0.30, 0.052, 8, 20),
  outfitStrap: new THREE.BoxGeometry(0.075, 0.28, 0.048),
  outfitBib: new THREE.BoxGeometry(0.30, 0.25, 0.08),
  outfitFlap: new THREE.BoxGeometry(0.42, 0.20, 0.065),
  outfitRoll: new THREE.CylinderGeometry(0.075, 0.075, 0.35, 10),
  outfitCuff: new THREE.TorusGeometry(0.095, 0.032, 8, 14),
  packBox: new THREE.BoxGeometry(0.34, 0.36, 0.2),
  skirtCone: new THREE.CylinderGeometry(0.32, 0.48, 0.25, 16),
  skirtPleat: new THREE.BoxGeometry(0.08, 0.24, 0.05),
  skirtFlare: new THREE.CylinderGeometry(0.31, 0.54, 0.3, 18),
  skirtTutu: new THREE.CylinderGeometry(0.33, 0.5, 0.14, 16),
  pantLeg: new THREE.CylinderGeometry(0.115, 0.105, 0.22, 12),
  shortSleeve: new THREE.SphereGeometry(0.125, 10, 8),
  tieBlade: new THREE.ConeGeometry(0.05, 0.2, 4),
  wingPetal: new THREE.SphereGeometry(0.17, 10, 8),
  shoeUpper: new THREE.SphereGeometry(0.142, 12, 10),
  shoeSole: new THREE.CylinderGeometry(0.145, 0.148, 0.048, 12),
  shoeCuff: new THREE.CylinderGeometry(0.108, 0.115, 0.13, 12),
  hairCap: new THREE.SphereGeometry(0.434, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.34),
  hairBackCap: new THREE.SphereGeometry(0.434, 18, 12, Math.PI * 0.78, Math.PI * 1.44, Math.PI * 0.14, Math.PI * 0.68),
  hairLock: new THREE.CapsuleGeometry(0.068, 0.13, 6, 10),
  hairSpike: new THREE.ConeGeometry(0.095, 0.23, 10),
  hairCurl: new THREE.SphereGeometry(0.125, 12, 10),
  hairTail: new THREE.CapsuleGeometry(0.088, 0.32, 6, 12),
  hairBraidBead: new THREE.SphereGeometry(0.082, 10, 8),
  hairBand: new THREE.TorusGeometry(0.105, 0.026, 8, 16),
  hatCone: new THREE.ConeGeometry(0.22, 0.42, 14),
  hatBrim: new THREE.CylinderGeometry(0.44, 0.44, 0.05, 20),
  hatDome: new THREE.SphereGeometry(0.28, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
  hatCrown: new THREE.CylinderGeometry(0.22, 0.18, 0.18, 6),
  hatTorus: new THREE.TorusGeometry(0.24, 0.032, 8, 22),
  pom: new THREE.SphereGeometry(0.08, 10, 8),
  orb: new THREE.SphereGeometry(0.09, 10, 8),
  compRockFacet: new THREE.DodecahedronGeometry(0.28, 0),
  compWingPlane: new THREE.PlaneGeometry(0.42, 0.34),
  compRippleTorus: new THREE.TorusGeometry(0.36, 0.018, 8, 28),
  compButtonDisc: new THREE.CylinderGeometry(0.11, 0.11, 0.032, 20),
  compNeckRing: new THREE.TorusGeometry(0.24, 0.055, 10, 22),
  compFinBlade: new THREE.ConeGeometry(0.085, 0.24, 8),
};

GEO.shadow.rotateX(-Math.PI / 2);
GEO.ring.rotateX(-Math.PI / 2);
GEO.compRippleTorus.rotateX(Math.PI / 2);
GEO.compButtonDisc.rotateX(Math.PI / 2);

export interface MochiRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  torsoMesh: THREE.Mesh;
  bellyMesh: THREE.Mesh;
  headGroup: THREE.Group;
  headMesh: THREE.Mesh;
  faceMesh: THREE.Mesh;
  leftFoot: THREE.Mesh;
  rightFoot: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  tailGroup: THREE.Group;
  backGroup: THREE.Group;
  speciesGroup: THREE.Group;
  earGroup: THREE.Group;
  outfitGroup: THREE.Group;
  hairGroup: THREE.Group;
  hatGroup: THREE.Group;
  leftShoeGroup: THREE.Group;
  rightShoeGroup: THREE.Group;
  shadowMesh: THREE.Mesh;
  highlightRing: THREE.Mesh;
  auraGroup: THREE.Group;
  auraOrbs: THREE.Mesh[];
  mainMat: THREE.MeshPhysicalMaterial;
  bellyMat: THREE.MeshStandardMaterial;
  accentMat: THREE.MeshStandardMaterial;
  hatMat: THREE.MeshStandardMaterial;
  hatShadeMat: THREE.MeshStandardMaterial;
  patMat: THREE.MeshStandardMaterial;
  noseMat: THREE.MeshStandardMaterial;
  outfitSoftMat: THREE.MeshStandardMaterial;
  outfitMat1: THREE.MeshStandardMaterial;
  outfitMat2: THREE.MeshStandardMaterial;
  outfitMat3: THREE.MeshStandardMaterial;
  hairMat: THREE.MeshStandardMaterial;
  hairShadeMat: THREE.MeshStandardMaterial;
  darkMat: THREE.MeshStandardMaterial;
  faceMat: THREE.MeshBasicMaterial;
  shadowMat: THREE.MeshBasicMaterial;
  outfitCapeMesh?: THREE.Mesh;
  outfitTailMesh?: THREE.Mesh;
  outfitWingL?: THREE.Group;
  outfitWingR?: THREE.Group;
  hairTailL?: THREE.Group;
  hairTailR?: THREE.Group;
  hairTailBack?: THREE.Group;
  hairSideL?: THREE.Group;
  hairSideR?: THREE.Group;
  hairBunL?: THREE.Group;
  hairBunR?: THREE.Group;
  hairCrest?: THREE.Group;
  hairBackAmp: number;
  hairTailAmp: number;
  hairHasDomeHat: boolean;
  hairHasCapHat: boolean;
  hairSpring: HairSpringState;
  wingL?: THREE.Group;
  wingR?: THREE.Group;
  flightWingsGroup?: THREE.Group;
  flightWingL?: THREE.Group;
  flightWingR?: THREE.Group;
  flightWingMat?: THREE.MeshStandardMaterial;
  frogLids?: THREE.Mesh[];
  torsoBaseScale: [number, number, number];
  bellyBaseScale: [number, number, number];
  footBaseScale: [number, number, number];
  armBaseScale: [number, number, number];
  lastSpecKey: string;
  lastHatKey: string;
  lastHairKey: string;
  lastOutKey: string;
  lastFaceKey: string;
}

export function createMochiRig(): MochiRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const mainMat = new THREE.MeshPhysicalMaterial({
    color: 0xffb3c7,
    roughness: 0.48,
    metalness: 0.02,
    sheen: 0.32,
    sheenRoughness: 0.65,
    sheenColor: new THREE.Color(0xfff4f8),
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: 0xffeef4,
    roughness: 0.54,
    metalness: 0.0,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0xff7aa8,
    roughness: 0.44,
    metalness: 0.05,
  });
  const hatMat = new THREE.MeshStandardMaterial({
    color: 0xff7aa8,
    roughness: 0.44,
    metalness: 0.05,
  });
  const hatShadeMat = new THREE.MeshStandardMaterial({
    color: 0xd95f89,
    roughness: 0.5,
    metalness: 0.04,
  });
  const patMat = new THREE.MeshStandardMaterial({
    color: 0xd984a0,
    roughness: 0.5,
    metalness: 0.02,
  });
  const noseMat = new THREE.MeshStandardMaterial({
    color: 0xff7aa8,
    roughness: 0.26,
    metalness: 0.06,
  });
  const outfitSoftMat = new THREE.MeshStandardMaterial({
    color: 0xffb3cc,
    roughness: 0.5,
    metalness: 0.02,
  });
  const outfitMat1 = new THREE.MeshStandardMaterial({
    color: 0xff7aa8,
    roughness: 0.52,
    metalness: 0.04,
  });
  const outfitMat2 = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.54,
    metalness: 0.03,
  });
  const outfitMat3 = new THREE.MeshStandardMaterial({
    color: 0x5c4338,
    roughness: 0.62,
    metalness: 0.06,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x6e473b,
    roughness: 0.4,
    metalness: 0.05,
  });
  const hairShadeMat = new THREE.MeshStandardMaterial({
    color: 0x55352c,
    roughness: 0.48,
    metalness: 0.04,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0xd984a0,
    roughness: 0.54,
    metalness: 0.02,
  });
  const faceMat = new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
  });
  const shadowMat = new THREE.MeshBasicMaterial({
    map: getSoftShadowTexture(),
    color: 0xffffff,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
  });

  const shadowMesh = new THREE.Mesh(GEO.shadow, shadowMat);
  shadowMesh.position.y = 0.02;
  root.add(shadowMesh);

  const highlightRing = new THREE.Mesh(
    GEO.ring,
    new THREE.MeshBasicMaterial({
      color: 0xffd23f,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  highlightRing.position.y = 0.03;
  highlightRing.visible = false;
  root.add(highlightRing);

  const torsoMesh = new THREE.Mesh(GEO.torso, mainMat);
  torsoMesh.position.y = 0.36;
  torsoMesh.scale.set(1.06, 0.92, 0.96);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  bodyPivot.add(torsoMesh);

  const bellyMesh = new THREE.Mesh(GEO.belly, bellyMat);
  bellyMesh.position.set(0, 0.34, 0.185);
  bellyMesh.scale.set(0.95, 0.86, 0.72);
  bodyPivot.add(bellyMesh);

  const leftFoot = new THREE.Mesh(GEO.foot, darkMat);
  leftFoot.position.set(-0.16, 0.1, 0.04);
  leftFoot.scale.set(1, 0.7, 1.35);
  leftFoot.castShadow = true;
  bodyPivot.add(leftFoot);

  const rightFoot = new THREE.Mesh(GEO.foot, darkMat);
  rightFoot.position.set(0.16, 0.1, 0.04);
  rightFoot.scale.set(1, 0.7, 1.35);
  rightFoot.castShadow = true;
  bodyPivot.add(rightFoot);

  const leftArm = new THREE.Mesh(GEO.arm, mainMat);
  leftArm.position.set(-0.34, 0.38, 0.02);
  leftArm.rotation.z = 0.42;
  leftArm.castShadow = true;
  bodyPivot.add(leftArm);

  const rightArm = new THREE.Mesh(GEO.arm, mainMat);
  rightArm.position.set(0.34, 0.38, 0.02);
  rightArm.rotation.z = -0.42;
  rightArm.castShadow = true;
  bodyPivot.add(rightArm);

  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, 0.28, -0.3);
  bodyPivot.add(tailGroup);

  const backGroup = new THREE.Group();
  bodyPivot.add(backGroup);

  const headGroup = new THREE.Group();
  headGroup.position.y = 0.82;
  bodyPivot.add(headGroup);

  const headMesh = new THREE.Mesh(GEO.head, mainMat);
  headMesh.scale.set(1.08, 0.98, 1.0);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  headGroup.add(headMesh);

  const faceMesh = new THREE.Mesh(GEO.facePlane, faceMat);
  faceMesh.scale.set(1.08, 0.98, 1.01);
  faceMesh.rotation.y = 0;
  headGroup.add(faceMesh);

  const speciesGroup = new THREE.Group();
  headGroup.add(speciesGroup);

  const earGroup = new THREE.Group();
  headGroup.add(earGroup);

  const hairGroup = new THREE.Group();
  headGroup.add(hairGroup);

  const outfitGroup = new THREE.Group();
  bodyPivot.add(outfitGroup);

  const leftShoeGroup = new THREE.Group();
  leftShoeGroup.position.copy(leftFoot.position);
  bodyPivot.add(leftShoeGroup);

  const rightShoeGroup = new THREE.Group();
  rightShoeGroup.position.copy(rightFoot.position);
  bodyPivot.add(rightShoeGroup);

  const hatGroup = new THREE.Group();
  hatGroup.position.set(0, 0.4, 0);
  headGroup.add(hatGroup);

  const auraGroup = new THREE.Group();
  bodyPivot.add(auraGroup);
  const auraOrbs: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(
      GEO.orb,
      new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.9 })
    );
    m.scale.setScalar(0.65);
    m.visible = false;
    auraGroup.add(m);
    auraOrbs.push(m);
  }

  const flightWingsGroup = new THREE.Group();
  flightWingsGroup.position.set(0, 0.38, -0.34);
  flightWingsGroup.visible = false;
  const flightWingMat = new THREE.MeshStandardMaterial({
    color: 0xf4fbff,
    emissive: 0x8fd5ff,
    emissiveIntensity: 0.48,
    roughness: 0.25,
    transparent: true,
    opacity: 0.88,
  });
  const flightWingL = new THREE.Group();
  const flightWingR = new THREE.Group();
  flightWingL.position.set(-0.14, 0, 0);
  flightWingR.position.set(0.14, 0, 0);
  for (const [wg, k] of [
    [flightWingL, -1],
    [flightWingR, 1],
  ] as const) {
    // Primary upper pinion
    const primary = new THREE.Mesh(GEO.wingPetal, flightWingMat);
    primary.position.set(k * 0.34, 0.16, -0.04);
    primary.rotation.set(0.18, k * 0.28, -k * 0.36);
    primary.scale.set(2.1, 1.15, 0.24);
    wg.add(primary);
    // Mid billowing plume
    const mid = new THREE.Mesh(GEO.wingPetal, flightWingMat);
    mid.position.set(k * 0.28, 0.02, -0.06);
    mid.rotation.set(0.14, k * 0.25, -k * 0.12);
    mid.scale.set(1.75, 0.95, 0.22);
    wg.add(mid);
    // Lower trailing covert
    const low = new THREE.Mesh(GEO.wingPetal, flightWingMat);
    low.position.set(k * 0.2, -0.1, -0.05);
    low.rotation.set(0.1, k * 0.2, k * 0.24);
    low.scale.set(1.3, 0.72, 0.2);
    wg.add(low);
    // Soft cloud tuft at wing shoulder
    const tuft = new THREE.Mesh(GEO.pom, flightWingMat);
    tuft.position.set(k * 0.1, 0.06, 0.01);
    tuft.scale.set(1.15, 0.95, 0.85);
    wg.add(tuft);
    flightWingsGroup.add(wg);
  }
  bodyPivot.add(flightWingsGroup);

  return {
    root,
    bodyPivot,
    torsoMesh,
    bellyMesh,
    headGroup,
    headMesh,
    faceMesh,
    leftFoot,
    rightFoot,
    leftArm,
    rightArm,
    tailGroup,
    backGroup,
    speciesGroup,
    earGroup,
    outfitGroup,
    hairGroup,
    hatGroup,
    leftShoeGroup,
    rightShoeGroup,
    shadowMesh,
    highlightRing,
    auraGroup,
    auraOrbs,
    mainMat,
    bellyMat,
    accentMat,
    hatMat,
    hatShadeMat,
    patMat,
    noseMat,
    outfitSoftMat,
    outfitMat1,
    outfitMat2,
    outfitMat3,
    hairMat,
    hairShadeMat,
    darkMat,
    faceMat,
    shadowMat,
    outfitCapeMesh: undefined,
    outfitTailMesh: undefined,
    outfitWingL: undefined,
    outfitWingR: undefined,
    hairTailL: undefined,
    hairTailR: undefined,
    hairTailBack: undefined,
    hairSideL: undefined,
    hairSideR: undefined,
    hairBunL: undefined,
    hairBunR: undefined,
    hairCrest: undefined,
    hairBackAmp: 1,
    hairTailAmp: 1,
    hairHasDomeHat: false,
    hairHasCapHat: false,
    hairSpring: {
      pitch: 0,
      pitchVel: 0,
      roll: 0,
      rollVel: 0,
      bounce: 0,
      bounceVel: 0,
      initialized: false,
      prevTime: 0,
      prevYaw: 0,
      prevJumpZ: 0,
      prevJumpVy: 0,
      prevHop: 0,
      prevMoveSpeed: 0,
      lastHairKey: '',
    },
    wingL: undefined,
    wingR: undefined,
    flightWingsGroup,
    flightWingL,
    flightWingR,
    flightWingMat,
    frogLids: undefined,
    torsoBaseScale: [1.06, 0.92, 0.96],
    bellyBaseScale: [0.95, 0.86, 0.72],
    footBaseScale: [1, 0.7, 1.35],
    armBaseScale: [1, 1, 1],
    lastSpecKey: '',
    lastHatKey: '',
    lastHairKey: '',
    lastOutKey: '',
    lastFaceKey: '',
  };
}

function clearGroup(g: THREE.Group): void {
  while (g.children.length > 0) {
    g.remove(g.children[0]);
  }
}

/**
 * Rebuilds authentic 3D species anatomy across all 12 Mochi animal species:
 * sculpted muzzles, noses, 3D beaks, top frog eyeballs, feathered gills, antlers,
 * swept dragon/owl wings, flippers, webbed feet, and multi-segment tails.
 */
function rebuildSpeciesParts(rig: MochiRig, sp: string, pat: number): void {
  clearGroup(rig.speciesGroup);
  clearGroup(rig.earGroup);
  clearGroup(rig.tailGroup);
  clearGroup(rig.backGroup);
  rig.wingL = undefined;
  rig.wingR = undefined;
  rig.frogLids = undefined;

  const pinkMat = STATIC_MAT.pink;
  const whiteMat = STATIC_MAT.white;
  const creamMat = STATIC_MAT.cream;
  const antlerMat = STATIC_MAT.antler;
  const goldMat = STATIC_MAT.gold;
  const beakMat = STATIC_MAT.beakOrange;
  const leafMat = STATIC_MAT.leaf;
  const whiskerMat = STATIC_MAT.whisker;

  // Head & Body Silhouette Proportions per Animal Species
  if (sp === 'penguin') {
    rig.headMesh.scale.set(1.04, 1.0, 1.02);
    rig.faceMesh.scale.set(1.04, 1.0, 1.03);
    rig.torsoBaseScale = [1.1, 0.96, 1.0];
    rig.bellyBaseScale = [0.95, 0.86, 0.72];
    rig.footBaseScale = [1.18, 0.54, 1.48];
    rig.armBaseScale = [0.58, 1.35, 1.08];
    rig.leftFoot.material = beakMat;
    rig.rightFoot.material = beakMat;
  } else if (sp === 'frog') {
    rig.headMesh.scale.set(1.16, 0.88, 1.06);
    rig.faceMesh.scale.set(1.16, 0.88, 1.07);
    rig.torsoBaseScale = [1.12, 0.9, 1.02];
    rig.bellyBaseScale = [0.98, 0.86, 0.76];
    rig.footBaseScale = [1.24, 0.52, 1.46];
    rig.armBaseScale = [0.95, 1.0, 0.95];
    rig.leftFoot.material = rig.darkMat;
    rig.rightFoot.material = rig.darkMat;
  } else if (sp === 'bear') {
    rig.headMesh.scale.set(1.12, 1.0, 1.02);
    rig.faceMesh.scale.set(1.12, 1.0, 1.03);
    rig.torsoBaseScale = [1.14, 0.96, 1.06];
    rig.bellyBaseScale = [0.98, 0.88, 0.76];
    rig.footBaseScale = [1.08, 0.72, 1.35];
    rig.armBaseScale = [1.1, 1.04, 1.1];
    rig.leftFoot.material = rig.darkMat;
    rig.rightFoot.material = rig.darkMat;
  } else if (sp === 'axolotl') {
    rig.headMesh.scale.set(1.14, 0.92, 1.04);
    rig.faceMesh.scale.set(1.14, 0.92, 1.05);
    rig.torsoBaseScale = [1.02, 0.92, 0.98];
    rig.bellyBaseScale = [0.92, 0.84, 0.72];
    rig.footBaseScale = [1.0, 0.65, 1.3];
    rig.armBaseScale = [0.9, 0.95, 0.9];
    rig.leftFoot.material = rig.darkMat;
    rig.rightFoot.material = rig.darkMat;
  } else if (sp === 'slime') {
    rig.torsoBaseScale = [1.24, 1.08, 1.18];
    rig.bellyBaseScale = [0.95, 0.86, 0.72];
    rig.footBaseScale = [1, 0.7, 1.35];
    rig.armBaseScale = [1, 1, 1];
    rig.leftFoot.material = rig.darkMat;
    rig.rightFoot.material = rig.darkMat;
  } else {
    rig.headMesh.scale.set(1.08, 0.98, 1.0);
    rig.faceMesh.scale.set(1.08, 0.98, 1.01);
    rig.torsoBaseScale = [1.06, 0.92, 0.96];
    rig.bellyBaseScale = [0.95, 0.86, 0.72];
    rig.footBaseScale = [1.0, 0.7, 1.35];
    rig.armBaseScale = [1, 1, 1];
    rig.leftFoot.material = rig.darkMat;
    rig.rightFoot.material = rig.darkMat;
  }
  rig.torsoMesh.scale.set(rig.torsoBaseScale[0], rig.torsoBaseScale[1], rig.torsoBaseScale[2]);
  rig.bellyMesh.scale.set(rig.bellyBaseScale[0], rig.bellyBaseScale[1], rig.bellyBaseScale[2]);
  rig.leftFoot.scale.set(rig.footBaseScale[0], rig.footBaseScale[1], rig.footBaseScale[2]);
  rig.rightFoot.scale.set(rig.footBaseScale[0], rig.footBaseScale[1], rig.footBaseScale[2]);
  rig.leftArm.scale.set(rig.armBaseScale[0], rig.armBaseScale[1], rig.armBaseScale[2]);
  rig.rightArm.scale.set(rig.armBaseScale[0], rig.armBaseScale[1], rig.armBaseScale[2]);

  // --- SPECIES HEAD ANATOMY & 3D MUZZLES / BEAKS / EARS / EYES ---
  if (sp === 'cat') {
    for (const k of [-1, 1]) {
      const ear = new THREE.Mesh(GEO.earCone, rig.mainMat);
      ear.position.set(k * 0.28, 0.34, 0.0);
      ear.rotation.set(0.08, 0, -k * 0.42);
      ear.scale.set(1.05, 1.02, 0.85);
      ear.castShadow = true;
      rig.earGroup.add(ear);

      const inner = new THREE.Mesh(GEO.earInnerCone, pinkMat);
      inner.position.set(k * 0.275, 0.33, 0.058);
      inner.rotation.set(0.08, 0, -k * 0.42);
      inner.scale.set(1.02, 0.96, 0.7);
      rig.earGroup.add(inner);

      const pad = new THREE.Mesh(GEO.muzzle, creamMat);
      pad.position.set(k * 0.068, -0.085, 0.385);
      pad.scale.set(0.62, 0.46, 0.5);
      rig.speciesGroup.add(pad);

      for (const wIdx of [-1, 1]) {
        const w = new THREE.Mesh(GEO.whisker, whiskerMat);
        w.position.set(k * 0.29, -0.075 + wIdx * 0.028, 0.31);
        w.rotation.set(0, -k * 0.25, Math.PI / 2 - k * wIdx * 0.14);
        rig.speciesGroup.add(w);
      }
    }
    const nose = new THREE.Mesh(GEO.muzzle, rig.noseMat);
    nose.position.set(0, -0.04, 0.435);
    nose.scale.set(0.36, 0.26, 0.26);
    rig.speciesGroup.add(nose);
  } else if (sp === 'bunny') {
    for (const k of [-1, 1]) {
      const earBase = new THREE.Mesh(GEO.earCapsule, rig.mainMat);
      earBase.position.set(k * 0.19, 0.44, -0.01);
      earBase.rotation.set(-0.08, 0, -k * 0.16);
      earBase.scale.set(0.95, 0.9, 0.65);
      earBase.castShadow = true;
      rig.earGroup.add(earBase);

      const earTip = new THREE.Mesh(GEO.earCapsule, rig.mainMat);
      earTip.position.set(k * 0.23, 0.64, k > 0 ? 0.04 : -0.03);
      earTip.rotation.set(k > 0 ? 0.42 : 0.08, 0, -k * (k > 0 ? 0.34 : 0.14));
      earTip.scale.set(0.82, 0.72, 0.55);
      earTip.castShadow = true;
      rig.earGroup.add(earTip);

      const inner = new THREE.Mesh(GEO.earCapsule, pinkMat);
      inner.position.set(k * 0.195, 0.48, 0.045);
      inner.rotation.set(-0.04, 0, -k * 0.16);
      inner.scale.set(0.52, 0.92, 0.32);
      rig.earGroup.add(inner);

      const cheek = new THREE.Mesh(GEO.muzzle, creamMat);
      cheek.position.set(k * 0.06, -0.08, 0.39);
      cheek.scale.set(0.56, 0.44, 0.48);
      rig.speciesGroup.add(cheek);
    }
    const nose = new THREE.Mesh(GEO.muzzle, rig.noseMat);
    nose.position.set(0, -0.038, 0.445);
    nose.scale.set(0.36, 0.28, 0.3);
    rig.speciesGroup.add(nose);
  } else if (sp === 'bear') {
    for (const k of [-1, 1]) {
      const ear = new THREE.Mesh(GEO.earDisc, rig.mainMat);
      ear.position.set(k * 0.33, 0.33, -0.02);
      ear.scale.set(1.1, 1.05, 0.62);
      ear.castShadow = true;
      rig.earGroup.add(ear);

      const inner = new THREE.Mesh(GEO.earDisc, pinkMat);
      inner.position.set(k * 0.33, 0.325, 0.045);
      inner.scale.set(0.62, 0.6, 0.38);
      rig.earGroup.add(inner);
    }
    const snout = new THREE.Mesh(GEO.muzzle, rig.bellyMat);
    snout.position.set(0, -0.08, 0.38);
    snout.scale.set(1.25, 0.92, 0.95);
    rig.speciesGroup.add(snout);

    const nose = new THREE.Mesh(GEO.muzzle, rig.noseMat);
    nose.position.set(0, -0.025, 0.485);
    nose.scale.set(0.48, 0.35, 0.32);
    rig.speciesGroup.add(nose);
  } else if (sp === 'fox') {
    for (const k of [-1, 1]) {
      const ear = new THREE.Mesh(GEO.earCone, rig.mainMat);
      ear.position.set(k * 0.29, 0.36, 0.0);
      ear.rotation.set(0.06, 0, -k * 0.38);
      ear.scale.set(1.16, 1.24, 0.88);
      ear.castShadow = true;
      rig.earGroup.add(ear);

      const earTip = new THREE.Mesh(GEO.earInnerCone, STATIC_MAT.noseDark);
      earTip.position.set(k * 0.35, 0.49, 0.01);
      earTip.rotation.set(0.06, 0, -k * 0.38);
      earTip.scale.set(0.65, 0.55, 0.6);
      rig.earGroup.add(earTip);

      const inner = new THREE.Mesh(GEO.earInnerCone, creamMat);
      inner.position.set(k * 0.28, 0.34, 0.065);
      inner.rotation.set(0.06, 0, -k * 0.38);
      inner.scale.set(0.92, 0.95, 0.55);
      rig.earGroup.add(inner);

      const tuft = new THREE.Mesh(GEO.earInnerCone, creamMat);
      tuft.position.set(k * 0.43, -0.09, 0.08);
      tuft.rotation.z = -k * 1.42;
      tuft.scale.set(0.85, 0.8, 0.65);
      rig.earGroup.add(tuft);
    }
    const snout = new THREE.Mesh(GEO.snoutCone, creamMat);
    snout.position.set(0, -0.08, 0.41);
    snout.rotation.x = Math.PI / 2 + 0.08;
    snout.scale.set(1.05, 1.0, 0.85);
    rig.speciesGroup.add(snout);

    const nose = new THREE.Mesh(GEO.muzzle, rig.noseMat);
    nose.position.set(0, -0.075, 0.525);
    nose.scale.set(0.32, 0.26, 0.28);
    rig.speciesGroup.add(nose);
  } else if (sp === 'dragon') {
    for (const k of [-1, 1]) {
      const hornBase = new THREE.Mesh(GEO.earCone, goldMat);
      hornBase.position.set(k * 0.2, 0.37, -0.02);
      hornBase.rotation.set(-0.35, 0, -k * 0.28);
      hornBase.scale.set(0.62, 0.85, 0.62);
      hornBase.castShadow = true;
      rig.earGroup.add(hornBase);

      const hornTip = new THREE.Mesh(GEO.earInnerCone, goldMat);
      hornTip.position.set(k * 0.25, 0.5, -0.11);
      hornTip.rotation.set(-0.75, 0, -k * 0.22);
      hornTip.scale.set(0.55, 0.72, 0.55);
      rig.earGroup.add(hornTip);

      const earFin = new THREE.Mesh(GEO.wingMembrane, rig.accentMat);
      earFin.position.set(k * 0.42, 0.04, -0.04);
      earFin.rotation.z = -k * 1.25;
      earFin.scale.set(0.38, 0.45, 0.22);
      rig.earGroup.add(earFin);
    }
    const snout = new THREE.Mesh(GEO.muzzle, rig.mainMat);
    snout.position.set(0, -0.085, 0.39);
    snout.scale.set(1.18, 0.82, 0.96);
    rig.speciesGroup.add(snout);
    for (const k of [-1, 1]) {
      const nostril = new THREE.Mesh(GEO.muzzle, rig.accentMat);
      nostril.position.set(k * 0.055, -0.05, 0.49);
      nostril.scale.set(0.22, 0.18, 0.2);
      rig.speciesGroup.add(nostril);
    }
    for (let s = 0; s < 3; s++) {
      const spike = new THREE.Mesh(GEO.dorsalRidge, rig.accentMat);
      spike.position.set(0, 0.39 - s * 0.11, -0.14 - s * 0.15);
      spike.rotation.x = -0.55 - s * 0.28;
      rig.speciesGroup.add(spike);
    }
    const wingL = new THREE.Group();
    wingL.position.set(-0.22, 0.46, -0.26);
    const wingR = new THREE.Group();
    wingR.position.set(0.22, 0.46, -0.26);
    for (const [wg, k] of [[wingL, -1], [wingR, 1]] as const) {
      const spar = new THREE.Mesh(GEO.antlerStem, rig.mainMat);
      spar.position.set(k * 0.16, 0.14, -0.06);
      spar.rotation.z = -k * 0.85;
      spar.scale.set(1.1, 1.45, 1.1);
      wg.add(spar);

      const mem = new THREE.Mesh(GEO.wingMembrane, rig.accentMat);
      mem.position.set(k * 0.22, 0.05, -0.08);
      mem.rotation.set(0.25, k * 0.35, -k * 1.12);
      mem.scale.set(0.95, 1.05, 0.22);
      mem.castShadow = true;
      wg.add(mem);
      rig.backGroup.add(wg);
    }
    rig.wingL = wingL;
    rig.wingR = wingR;
  } else if (sp === 'owl') {
    for (const k of [-1, 1]) {
      const tuft = new THREE.Mesh(GEO.earCone, rig.darkMat);
      tuft.position.set(k * 0.27, 0.34, 0.04);
      tuft.rotation.set(0.18, 0, -k * 0.52);
      tuft.scale.set(0.75, 0.88, 0.55);
      rig.earGroup.add(tuft);

      const browArch = new THREE.Mesh(GEO.featherBlade, rig.darkMat);
      browArch.position.set(k * 0.16, 0.2, 0.36);
      browArch.rotation.z = -k * 1.15;
      browArch.scale.set(0.5, 0.72, 0.45);
      rig.speciesGroup.add(browArch);
    }
    const beak = new THREE.Mesh(GEO.beakCone, beakMat);
    beak.position.set(0, -0.04, 0.465);
    beak.rotation.x = Math.PI * 0.58;
    beak.scale.set(1.05, 1.15, 0.95);
    rig.speciesGroup.add(beak);

    const wingL = new THREE.Group();
    wingL.position.set(-0.34, 0.42, -0.08);
    const wingR = new THREE.Group();
    wingR.position.set(0.34, 0.42, -0.08);
    for (const [wg, k] of [[wingL, -1], [wingR, 1]] as const) {
      const mainWing = new THREE.Mesh(GEO.featherBlade, rig.darkMat);
      mainWing.position.set(k * 0.06, -0.08, -0.04);
      mainWing.rotation.set(0.2, 0, -k * 0.35);
      mainWing.scale.set(1.2, 1.15, 0.7);
      mainWing.castShadow = true;
      wg.add(mainWing);
      const secWing = new THREE.Mesh(GEO.featherBlade, rig.bellyMat);
      secWing.position.set(k * 0.04, -0.13, -0.09);
      secWing.rotation.set(0.25, 0, -k * 0.25);
      secWing.scale.set(0.85, 0.9, 0.55);
      wg.add(secWing);
      rig.backGroup.add(wg);
    }
    rig.wingL = wingL;
    rig.wingR = wingR;
  } else if (sp === 'frog') {
    const lids: THREE.Mesh[] = [];
    for (const k of [-1, 1]) {
      const socket = new THREE.Mesh(GEO.frogEyeDome, rig.mainMat);
      socket.position.set(k * 0.23, 0.35, 0.14);
      socket.scale.set(1.12, 1.05, 1.02);
      socket.castShadow = true;
      rig.speciesGroup.add(socket);

      const sclera = new THREE.Mesh(GEO.frogEyeball, STATIC_MAT.eyeWhite);
      sclera.position.set(k * 0.23, 0.35, 0.22);
      rig.speciesGroup.add(sclera);

      const pupil = new THREE.Mesh(GEO.frogPupil, STATIC_MAT.eyeGloss);
      pupil.position.set(k * 0.23, 0.35, 0.295);
      pupil.scale.set(1.0, 1.0, 0.65);
      rig.speciesGroup.add(pupil);

      const shine = new THREE.Mesh(GEO.spotDisc, STATIC_MAT.white);
      shine.position.set(k * 0.23 + 0.032, 0.382, 0.335);
      shine.scale.setScalar(0.32);
      rig.speciesGroup.add(shine);

      const lid = new THREE.Mesh(GEO.frogEyelid, rig.darkMat);
      lid.position.set(k * 0.23, 0.35, 0.225);
      lid.rotation.x = Math.PI * 0.5;
      lid.visible = false;
      rig.speciesGroup.add(lid);
      lids.push(lid);
    }
    rig.frogLids = lids;

    const throat = new THREE.Mesh(GEO.muzzle, rig.bellyMat);
    throat.position.set(0, -0.22, 0.25);
    throat.scale.set(1.6, 0.9, 1.1);
    rig.speciesGroup.add(throat);

    for (const [sx, sy, sz] of [[-0.14, 0.48, -0.28], [0.16, 0.42, -0.3], [0, 0.3, -0.34]]) {
      const spot = new THREE.Mesh(GEO.spotDisc, rig.darkMat);
      spot.position.set(sx, sy, sz);
      spot.scale.set(0.95, 0.95, 0.45);
      rig.backGroup.add(spot);
    }
  } else if (sp === 'axolotl') {
    for (const k of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const yOff = 0.16 - i * 0.115;
        const angle = -k * (1.15 + i * 0.22);
        const stalk = new THREE.Mesh(GEO.antlerStem, rig.mainMat);
        stalk.position.set(k * 0.45, yOff, 0.02);
        stalk.rotation.z = angle;
        stalk.scale.set(0.95, 0.88, 0.95);
        rig.earGroup.add(stalk);

        const frond = new THREE.Mesh(GEO.earCapsule, rig.accentMat);
        frond.position.set(k * 0.53, yOff + (1 - i) * 0.03, 0.02);
        frond.rotation.z = angle;
        frond.scale.set(0.62, 0.55, 0.45);
        rig.earGroup.add(frond);

        const tip = new THREE.Mesh(GEO.tailPuff, STATIC_MAT.pinkGloss);
        tip.position.set(k * 0.59, yOff + (1 - i) * 0.04, 0.02);
        tip.scale.setScalar(0.32);
        rig.earGroup.add(tip);
      }
    }
  } else if (sp === 'otter') {
    for (const k of [-1, 1]) {
      const ear = new THREE.Mesh(GEO.earDisc, rig.mainMat);
      ear.position.set(k * 0.37, 0.2, -0.02);
      ear.scale.set(0.88, 0.88, 0.55);
      rig.earGroup.add(ear);

      const inner = new THREE.Mesh(GEO.earDisc, rig.darkMat);
      inner.position.set(k * 0.37, 0.2, 0.03);
      inner.scale.set(0.48, 0.48, 0.35);
      rig.earGroup.add(inner);

      for (const wIdx of [-1, 1]) {
        const w = new THREE.Mesh(GEO.whisker, whiskerMat);
        w.position.set(k * 0.28, -0.08 + wIdx * 0.025, 0.34);
        w.rotation.set(0, -k * 0.22, Math.PI / 2 - k * wIdx * 0.14);
        rig.speciesGroup.add(w);
      }
    }
    const muzzle = new THREE.Mesh(GEO.muzzle, rig.bellyMat);
    muzzle.position.set(0, -0.085, 0.37);
    muzzle.scale.set(1.42, 0.88, 0.92);
    rig.speciesGroup.add(muzzle);

    const nose = new THREE.Mesh(GEO.muzzle, rig.noseMat);
    nose.position.set(0, -0.03, 0.475);
    nose.scale.set(0.46, 0.32, 0.3);
    rig.speciesGroup.add(nose);
  } else if (sp === 'penguin') {
    const beak = new THREE.Mesh(GEO.beakCone, beakMat);
    beak.position.set(0, -0.05, 0.47);
    beak.rotation.x = Math.PI * 0.52;
    beak.scale.set(1.28, 1.15, 0.82);
    rig.speciesGroup.add(beak);

    const crest = new THREE.Mesh(GEO.earInnerCone, rig.darkMat);
    crest.position.set(0, 0.42, 0.02);
    crest.rotation.x = -0.35;
    crest.scale.set(0.65, 0.55, 0.65);
    rig.earGroup.add(crest);
  } else if (sp === 'deer') {
    for (const k of [-1, 1]) {
      const ear = new THREE.Mesh(GEO.earCapsule, rig.mainMat);
      ear.position.set(k * 0.39, 0.18, 0);
      ear.rotation.z = -k * 1.18;
      ear.scale.set(0.85, 0.68, 0.45);
      ear.castShadow = true;
      rig.earGroup.add(ear);

      const inner = new THREE.Mesh(GEO.earCapsule, creamMat);
      inner.position.set(k * 0.39, 0.17, 0.038);
      inner.rotation.z = -k * 1.18;
      inner.scale.set(0.45, 0.48, 0.25);
      rig.earGroup.add(inner);

      const beam = new THREE.Mesh(GEO.antlerStem, antlerMat);
      beam.position.set(k * 0.18, 0.47, -0.02);
      beam.rotation.set(-0.22, 0, -k * 0.34);
      beam.castShadow = true;
      rig.earGroup.add(beam);

      const brow = new THREE.Mesh(GEO.antlerTine, antlerMat);
      brow.position.set(k * 0.2, 0.45, 0.06);
      brow.rotation.set(0.65, 0, -k * 0.25);
      rig.earGroup.add(brow);

      const fork = new THREE.Mesh(GEO.antlerTine, antlerMat);
      fork.position.set(k * 0.27, 0.58, -0.05);
      fork.rotation.set(-0.1, 0, -k * 0.85);
      rig.earGroup.add(fork);
    }
    const muzzle = new THREE.Mesh(GEO.muzzle, creamMat);
    muzzle.position.set(0, -0.085, 0.375);
    muzzle.scale.set(0.95, 0.72, 0.88);
    rig.speciesGroup.add(muzzle);

    const nose = new THREE.Mesh(GEO.muzzle, rig.noseMat);
    nose.position.set(0, -0.045, 0.47);
    nose.scale.set(0.36, 0.28, 0.28);
    rig.speciesGroup.add(nose);

    for (const [sx, sy, sz] of [[-0.22, 0.42, -0.24], [0.22, 0.44, -0.22], [-0.12, 0.34, -0.31], [0.14, 0.32, -0.3]]) {
      const spot = new THREE.Mesh(GEO.spotDisc, creamMat);
      spot.position.set(sx, sy, sz);
      spot.scale.set(0.75, 0.75, 0.4);
      rig.backGroup.add(spot);
    }
  } else if (sp === 'slime') {
    const core = new THREE.Mesh(GEO.torso, rig.bellyMat);
    core.position.set(0, -0.06, 0);
    core.scale.set(0.62, 0.58, 0.62);
    rig.speciesGroup.add(core);

    for (const [bx, by, bz, bs] of [
      [-0.18, 0.02, 0.18, 0.75],
      [0.2, -0.08, 0.14, 0.55],
      [0.12, 0.1, -0.16, 0.6],
    ]) {
      const bub = new THREE.Mesh(GEO.orb, STATIC_MAT.slimeBubble);
      bub.position.set(bx, by, bz);
      bub.scale.setScalar(bs);
      rig.speciesGroup.add(bub);
    }

    const stem = new THREE.Mesh(GEO.antlerTine, leafMat);
    stem.position.set(0.02, 0.34, 0);
    stem.rotation.z = -0.25;
    rig.earGroup.add(stem);

    const leafA = new THREE.Mesh(GEO.earDisc, leafMat);
    leafA.position.set(0.11, 0.41, 0);
    leafA.rotation.z = -0.45;
    leafA.scale.set(1.15, 0.28, 0.65);
    rig.earGroup.add(leafA);

    const leafB = new THREE.Mesh(GEO.earDisc, leafMat);
    leafB.position.set(-0.07, 0.39, 0.02);
    leafB.rotation.z = 0.5;
    leafB.scale.set(0.85, 0.25, 0.55);
    rig.earGroup.add(leafB);
  }

  // Body Coat Pattern Flank Accents (look.pat 1, 3, 5, 6, 7)
  if (pat === 1 || pat === 5 || pat === 6) {
    const pMat = rig.patMat;
    for (const [fx, fy, fz] of [[-0.26, 0.38, -0.16], [0.24, 0.32, -0.2]]) {
      const patch = new THREE.Mesh(GEO.spotDisc, pMat);
      patch.position.set(fx, fy, fz);
      patch.scale.set(1.3, 1.15, 0.75);
      rig.backGroup.add(patch);
    }
  } else if (pat === 3 || pat === 7) {
    const starCol = rig.patMat;
    for (const [fx, fy, fz] of [[-0.2, 0.44, -0.22], [0.18, 0.34, -0.26], [0, 0.46, -0.29]]) {
      const spDot = new THREE.Mesh(GEO.spotDisc, starCol);
      spDot.position.set(fx, fy, fz);
      spDot.scale.setScalar(0.65);
      rig.backGroup.add(spDot);
    }
  }

  // --- AUTHENTIC SPECIES TAILS ---
  if (sp === 'cat') {
    const tBase = new THREE.Mesh(GEO.tailCurve, rig.mainMat);
    tBase.position.set(0, 0.1, -0.11);
    tBase.rotation.x = -0.78;
    tBase.scale.set(0.82, 0.9, 0.82);
    rig.tailGroup.add(tBase);

    const tTip = new THREE.Mesh(GEO.tailCurve, rig.bellyMat);
    tTip.position.set(0, 0.28, -0.2);
    tTip.rotation.x = -0.15;
    tTip.scale.set(0.76, 0.72, 0.76);
    rig.tailGroup.add(tTip);
  } else if (sp === 'fox') {
    const tBase = new THREE.Mesh(GEO.earCapsule, rig.mainMat);
    tBase.position.set(0, 0.12, -0.18);
    tBase.rotation.x = -0.95;
    tBase.scale.set(1.45, 1.18, 1.45);
    rig.tailGroup.add(tBase);

    const tMid = new THREE.Mesh(GEO.tailPuff, rig.mainMat);
    tMid.position.set(0, 0.2, -0.28);
    tMid.scale.set(1.18, 1.12, 1.35);
    rig.tailGroup.add(tMid);

    const tip = new THREE.Mesh(GEO.tailPuff, whiteMat);
    tip.position.set(0, 0.28, -0.39);
    tip.scale.set(0.95, 0.95, 1.15);
    rig.tailGroup.add(tip);
  } else if (sp === 'bunny') {
    const puff = new THREE.Mesh(GEO.tailPuff, whiteMat);
    puff.position.set(0, 0.06, -0.09);
    puff.scale.setScalar(1.22);
    rig.tailGroup.add(puff);
  } else if (sp === 'deer') {
    const tTop = new THREE.Mesh(GEO.earCone, rig.mainMat);
    tTop.position.set(0, 0.09, -0.08);
    tTop.rotation.x = -1.1;
    tTop.scale.set(0.7, 0.55, 0.55);
    rig.tailGroup.add(tTop);
    const tUnder = new THREE.Mesh(GEO.tailPuff, whiteMat);
    tUnder.position.set(0, 0.05, -0.08);
    tUnder.scale.set(0.85, 0.9, 0.75);
    rig.tailGroup.add(tUnder);
  } else if (sp === 'bear') {
    const nub = new THREE.Mesh(GEO.tailPuff, rig.mainMat);
    nub.position.set(0, 0.06, -0.06);
    nub.scale.setScalar(0.75);
    rig.tailGroup.add(nub);
  } else if (sp === 'dragon') {
    const tail = new THREE.Mesh(GEO.earCone, rig.mainMat);
    tail.position.set(0, 0.08, -0.18);
    tail.rotation.x = -1.25;
    tail.scale.set(0.95, 1.25, 0.95);
    rig.tailGroup.add(tail);

    const spade = new THREE.Mesh(GEO.wingMembrane, rig.accentMat);
    spade.position.set(0, 0.14, -0.37);
    spade.rotation.x = -Math.PI / 2;
    spade.scale.set(0.45, 0.4, 0.18);
    rig.tailGroup.add(spade);
  } else if (sp === 'otter') {
    const tail = new THREE.Mesh(GEO.earCapsule, rig.darkMat);
    tail.position.set(0, 0.03, -0.24);
    tail.rotation.x = -1.35;
    tail.scale.set(1.28, 1.38, 0.48);
    rig.tailGroup.add(tail);
  } else if (sp === 'axolotl') {
    const tail = new THREE.Mesh(GEO.earCone, rig.mainMat);
    tail.position.set(0, 0.04, -0.21);
    tail.rotation.x = -1.38;
    tail.scale.set(0.75, 1.35, 0.55);
    rig.tailGroup.add(tail);

    const fin = new THREE.Mesh(GEO.wingMembrane, rig.accentMat);
    fin.position.set(0, 0.11, -0.22);
    fin.rotation.x = -1.38;
    fin.scale.set(0.14, 1.15, 0.5);
    rig.tailGroup.add(fin);
  } else if (sp === 'owl' || sp === 'penguin') {
    for (const k of [-0.07, 0, 0.07]) {
      const feather = new THREE.Mesh(GEO.featherBlade, rig.darkMat);
      feather.position.set(k, 0.02, -0.09);
      feather.rotation.set(-1.15, 0, -k * 2.2);
      feather.scale.set(0.75, 0.65, 0.38);
      rig.tailGroup.add(feather);
    }
  }
}

function rebuildHatParts(rig: MochiRig, hat: string, hairId = 'none'): void {
  clearGroup(rig.hatGroup);
  if (!hat || hat === 'none') return;

  const goldMat = STATIC_MAT.gold;
  const leafMat = STATIC_MAT.leaf;
  const whiteMat = STATIC_MAT.white;
  const brownMat = STATIC_MAT.brown;
  const redMat = STATIC_MAT.red;
  const navyMat = STATIC_MAT.navy;
  const wizMat = STATIC_MAT.wiz;
  const strawMat = STATIC_MAT.straw;
  const antMat = STATIC_MAT.antler;
  const dyeMat = rig.hatMat;
  const dyeShade = rig.hatShadeMat;
  const hasHair = Boolean(hairId && hairId !== 'none');

  if (hat === 'leaf' || hat === 'sprout') {
    const stem = new THREE.Mesh(GEO.tailCurve, leafMat);
    stem.position.y = 0.08;
    stem.scale.set(0.35, 0.45, 0.35);
    rig.hatGroup.add(stem);
    const l1 = new THREE.Mesh(GEO.earDisc, hat === 'sprout' ? leafMat : dyeMat);
    l1.position.set(0.08, 0.16, 0);
    l1.scale.set(1.1, 0.28, 0.75);
    l1.rotation.z = -0.3;
    rig.hatGroup.add(l1);
  } else if (hat === 'bow' || hat === 'ribbon') {
    for (const k of [-1, 1]) {
      const wing = new THREE.Mesh(GEO.earDisc, dyeMat);
      wing.position.set(k * 0.14, 0.05, 0.06);
      wing.scale.set(1.0, 0.75, 0.45);
      wing.rotation.z = k * 0.25;
      rig.hatGroup.add(wing);
    }
    const knot = new THREE.Mesh(GEO.pom, whiteMat);
    knot.position.set(0, 0.05, 0.08);
    rig.hatGroup.add(knot);
  } else if (hat === 'crown') {
    const cr = new THREE.Mesh(GEO.hatCrown, goldMat);
    cr.position.y = 0.07;
    cr.castShadow = true;
    rig.hatGroup.add(cr);
    const gem = new THREE.Mesh(GEO.pom, dyeMat);
    gem.position.set(0, 0.08, 0.18);
    gem.scale.setScalar(0.65);
    rig.hatGroup.add(gem);
  } else if (hat === 'party') {
    const cone = new THREE.Mesh(GEO.hatCone, dyeMat);
    cone.position.y = 0.16;
    cone.scale.set(0.75, 0.85, 0.75);
    rig.hatGroup.add(cone);
    const pom = new THREE.Mesh(GEO.pom, goldMat);
    pom.position.y = 0.35;
    rig.hatGroup.add(pom);
  } else if (hat === 'wizard') {
    const brim = new THREE.Mesh(GEO.hatBrim, wizMat);
    brim.position.y = 0.01;
    brim.castShadow = true;
    rig.hatGroup.add(brim);
    const cone = new THREE.Mesh(GEO.hatCone, wizMat);
    cone.position.y = 0.2;
    cone.rotation.z = -0.08;
    cone.castShadow = true;
    rig.hatGroup.add(cone);
    const band = new THREE.Mesh(GEO.hatTorus, goldMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.04;
    band.scale.setScalar(0.85);
    rig.hatGroup.add(band);
  } else if (hat === 'witch_moon') {
    const brim = new THREE.Mesh(GEO.hatBrim, dyeShade);
    brim.position.y = 0.01;
    brim.scale.set(1.14, 1.0, 1.14);
    brim.castShadow = true;
    rig.hatGroup.add(brim);
    const cone = new THREE.Mesh(GEO.hatCone, dyeMat);
    cone.position.y = 0.21;
    cone.rotation.z = 0.12;
    cone.castShadow = true;
    rig.hatGroup.add(cone);
    const band = new THREE.Mesh(GEO.hatTorus, goldMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.045;
    band.scale.setScalar(0.88);
    rig.hatGroup.add(band);
    const moon = new THREE.Mesh(GEO.hatTorus, goldMat);
    moon.position.set(0, 0.16, 0.16);
    moon.scale.set(0.32, 0.32, 0.45);
    rig.hatGroup.add(moon);
  } else if (hat === 'straw') {
    const brim = new THREE.Mesh(GEO.hatBrim, strawMat);
    brim.scale.set(1.12, 1, 1.12);
    brim.castShadow = true;
    rig.hatGroup.add(brim);
    const dome = new THREE.Mesh(GEO.hatDome, strawMat);
    dome.scale.set(0.95, 0.72, 0.95);
    rig.hatGroup.add(dome);
    const band = new THREE.Mesh(GEO.hatTorus, dyeMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.04;
    band.scale.setScalar(1.05);
    rig.hatGroup.add(band);
  } else if (hat === 'beanie' || hat === 'lantern_cap') {
    const dome = new THREE.Mesh(GEO.hatDome, dyeMat);
    dome.position.y = -0.04;
    dome.scale.set(1.08, 0.92, 1.08);
    rig.hatGroup.add(dome);
    const pom = new THREE.Mesh(GEO.pom, hat === 'lantern_cap' ? goldMat : whiteMat);
    pom.position.y = 0.22;
    rig.hatGroup.add(pom);
  } else if (hat === 'beret') {
    const disc = new THREE.Mesh(GEO.hatDome, dyeMat);
    disc.position.set(0.05, 0.02, 0);
    disc.scale.set(1.25, 0.45, 1.25);
    disc.rotation.z = -0.2;
    rig.hatGroup.add(disc);
    const stem = new THREE.Mesh(GEO.pom, dyeShade);
    stem.position.set(0.08, 0.16, 0);
    stem.scale.setScalar(0.36);
    rig.hatGroup.add(stem);
  } else if (hat === 'chef') {
    const cuff = new THREE.Mesh(GEO.hatCrown, whiteMat);
    cuff.position.y = 0.06;
    cuff.scale.set(1.1, 0.9, 1.1);
    rig.hatGroup.add(cuff);
    const top = new THREE.Mesh(GEO.torso, whiteMat);
    top.position.y = 0.2;
    top.scale.set(0.82, 0.48, 0.82);
    rig.hatGroup.add(top);
  } else if (hat === 'pirate') {
    const hatMesh = new THREE.Mesh(GEO.hatBrim, navyMat);
    hatMesh.position.y = 0.06;
    hatMesh.scale.set(1.05, 2.2, 0.7);
    rig.hatGroup.add(hatMesh);
    const crest = new THREE.Mesh(GEO.pom, dyeMat);
    crest.position.set(0, 0.08, 0.25);
    rig.hatGroup.add(crest);
  } else if (hat === 'halo') {
    const halo = new THREE.Mesh(GEO.hatTorus, goldMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.2;
    rig.hatGroup.add(halo);
  } else if (hat === 'star_circlet') {
    const band = new THREE.Mesh(GEO.hatTorus, goldMat);
    band.rotation.x = Math.PI / 2 + 0.16;
    band.position.set(0, 0.02, 0.02);
    band.scale.set(1.18, 1.18, 0.7);
    rig.hatGroup.add(band);
    for (const [gx, gy, gs] of [[-0.14, 0.08, 0.42], [0, 0.12, 0.72], [0.14, 0.08, 0.42]]) {
      const gem = new THREE.Mesh(GEO.pom, gx === 0 ? dyeMat : whiteMat);
      gem.position.set(gx, gy, 0.28);
      gem.scale.setScalar(gs);
      rig.hatGroup.add(gem);
    }
  } else if (hat === 'flower') {
    const fMats = [whiteMat, STATIC_MAT.flowerPink, goldMat, dyeMat];
    for (let i = 0; i < 4; i++) {
      const fl = new THREE.Mesh(GEO.pom, fMats[i]);
      fl.position.set(-0.2 + i * 0.13, 0.04, 0.14);
      fl.scale.setScalar(0.95);
      rig.hatGroup.add(fl);
    }
  } else if (hat === 'mushroom') {
    const cap = new THREE.Mesh(GEO.hatDome, redMat);
    cap.position.y = -0.03;
    cap.scale.set(1.32, 0.96, 1.32);
    rig.hatGroup.add(cap);
    for (const [sx, sy, sz] of [[-0.14, 0.1, 0.14], [0.14, 0.08, 0.15], [0, 0.18, -0.05]]) {
      const spot = new THREE.Mesh(GEO.pom, whiteMat);
      spot.position.set(sx, sy, sz);
      spot.scale.setScalar(0.65);
      rig.hatGroup.add(spot);
    }
  } else if (hat === 'aviator') {
    const cap = new THREE.Mesh(GEO.hatDome, brownMat);
    cap.position.y = -0.04;
    cap.scale.set(1.12, 0.94, 1.12);
    rig.hatGroup.add(cap);
    for (const k of [-1, 1]) {
      const gog = new THREE.Mesh(GEO.pom, STATIC_MAT.glass);
      gog.position.set(k * 0.12, 0.04, 0.28);
      gog.scale.set(1.1, 0.85, 0.5);
      rig.hatGroup.add(gog);
    }
  } else if (hat === 'earmuffs' || hat === 'cat_phones') {
    const arc = new THREE.Mesh(GEO.hatTorus, dyeMat);
    arc.position.set(0, -0.04, 0);
    arc.scale.set(1.75, 1.5, 0.65);
    if (hat === 'cat_phones') rig.hatGroup.add(arc);
    for (const k of [-1, 1]) {
      const muff = new THREE.Mesh(GEO.earDisc, hat === 'cat_phones' ? dyeMat : whiteMat);
      muff.position.set(k * (hasHair ? 0.48 : 0.45), -0.35, 0);
      muff.scale.setScalar(1.0);
      rig.hatGroup.add(muff);
      if (hat === 'cat_phones') {
        const ear = new THREE.Mesh(GEO.earCone, dyeMat);
        ear.position.set(k * 0.25, 0.16, 0);
        ear.rotation.z = -k * 0.42;
        ear.scale.set(0.75, 0.72, 0.6);
        rig.hatGroup.add(ear);
      }
    }
  } else if (hat === 'bunny_band') {
    const band = new THREE.Mesh(GEO.hatTorus, dyeMat);
    band.rotation.x = Math.PI / 2 + 0.15;
    band.position.y = -0.02;
    band.scale.set(1.3, 1.1, 0.65);
    rig.hatGroup.add(band);
    for (const k of [-1, 1]) {
      const ear = new THREE.Mesh(GEO.earCapsule, dyeMat);
      ear.position.set(k * 0.15, 0.22, 0);
      ear.rotation.z = -k * 0.2;
      ear.scale.set(0.72, 0.88, 0.52);
      rig.hatGroup.add(ear);
      const inn = new THREE.Mesh(GEO.earCapsule, whiteMat);
      inn.position.set(k * 0.15, 0.22, 0.035);
      inn.rotation.z = -k * 0.2;
      inn.scale.set(0.4, 0.62, 0.28);
      rig.hatGroup.add(inn);
    }
  } else if (hat === 'maid_frill') {
    const frill = new THREE.Mesh(GEO.scarfTorus, whiteMat);
    frill.position.set(0, 0.02, 0.04);
    frill.rotation.x = 0.25;
    frill.scale.set(1.18, 0.65, 0.55);
    rig.hatGroup.add(frill);
    for (const k of [-1, 1]) {
      const bow = new THREE.Mesh(GEO.earDisc, dyeMat);
      bow.position.set(k * 0.22, 0.06, 0.08);
      bow.scale.set(0.72, 0.52, 0.35);
      rig.hatGroup.add(bow);
    }
  } else if (hat === 'froggy_hood') {
    const hood = new THREE.Mesh(GEO.hatDome, STATIC_MAT.frogCompGreen);
    hood.position.y = -0.04;
    hood.scale.set(1.16, 0.94, 1.14);
    rig.hatGroup.add(hood);
    for (const k of [-1, 1]) {
      const bump = new THREE.Mesh(GEO.frogEyeDome, STATIC_MAT.frogCompGreen);
      bump.position.set(k * 0.18, 0.16, 0.14);
      bump.scale.setScalar(0.72);
      rig.hatGroup.add(bump);
      const eye = new THREE.Mesh(GEO.frogEyeball, STATIC_MAT.eyeWhite);
      eye.position.set(k * 0.18, 0.16, 0.21);
      eye.scale.setScalar(0.65);
      rig.hatGroup.add(eye);
      const pup = new THREE.Mesh(GEO.frogPupil, STATIC_MAT.eyeGloss);
      pup.position.set(k * 0.18, 0.16, 0.26);
      pup.scale.setScalar(0.58);
      rig.hatGroup.add(pup);
    }
  } else if (hat === 'boba_hat') {
    const cup = new THREE.Mesh(GEO.hatCrown, STATIC_MAT.honeyCream);
    cup.position.set(0, 0.11, 0);
    cup.scale.set(0.88, 1.25, 0.88);
    rig.hatGroup.add(cup);
    const lid = new THREE.Mesh(GEO.hatDome, dyeMat);
    lid.position.set(0, 0.2, 0);
    lid.scale.set(0.68, 0.45, 0.68);
    rig.hatGroup.add(lid);
    const straw = new THREE.Mesh(GEO.antlerStem, redMat);
    straw.position.set(0.05, 0.3, 0.02);
    straw.rotation.z = -0.22;
    straw.scale.set(0.85, 0.85, 0.85);
    rig.hatGroup.add(straw);
  } else if (hat === 'tea_saucer') {
    const plate = new THREE.Mesh(GEO.hatBrim, whiteMat);
    plate.position.set(0.06, 0.02, 0);
    plate.rotation.z = -0.18;
    plate.scale.set(0.68, 0.9, 0.68);
    rig.hatGroup.add(plate);
    const cup = new THREE.Mesh(GEO.hatCrown, dyeMat);
    cup.position.set(0.07, 0.11, 0);
    cup.rotation.z = -0.18;
    cup.scale.set(0.68, 0.8, 0.68);
    rig.hatGroup.add(cup);
  } else if (hat === 'antlers') {
    for (const k of [-1, 1]) {
      const stem = new THREE.Mesh(GEO.antlerStem, antMat);
      stem.position.set(k * 0.16, 0.12, 0);
      stem.rotation.z = -k * 0.38;
      rig.hatGroup.add(stem);
      const tine = new THREE.Mesh(GEO.antlerTine, antMat);
      tine.position.set(k * 0.24, 0.2, 0.04);
      tine.rotation.z = -k * 0.85;
      rig.hatGroup.add(tine);
    }
  } else if (hat === 'nightcap') {
    const cap = new THREE.Mesh(GEO.hatCone, wizMat);
    cap.position.set(0.08, 0.14, 0);
    cap.rotation.z = -0.55;
    cap.scale.set(0.95, 0.92, 0.95);
    rig.hatGroup.add(cap);
    const pom = new THREE.Mesh(GEO.pom, goldMat);
    pom.position.set(0.24, 0.24, 0);
    rig.hatGroup.add(pom);
  } else {
    const dome = new THREE.Mesh(
      GEO.hatDome,
      hat === 'seashell' ? rig.bellyMat : hat === 'honeycomb' ? goldMat : brownMat
    );
    dome.position.y = -0.02;
    dome.scale.set(0.95, 0.7, 0.95);
    rig.hatGroup.add(dome);
  }
}

function rebuildHairParts(rig: MochiRig, hairId: string, sp: string, hatKey = 'none'): void {
  clearGroup(rig.hairGroup);
  rig.hairTailL = undefined;
  rig.hairTailR = undefined;
  rig.hairTailBack = undefined;
  rig.hairSideL = undefined;
  rig.hairSideR = undefined;
  rig.hairBunL = undefined;
  rig.hairBunR = undefined;
  rig.hairCrest = undefined;
  rig.hairBackAmp = 1;
  rig.hairTailAmp = 1;
  rig.hairHasDomeHat = false;
  rig.hairHasCapHat = false;

  if (!hairId || hairId === 'none') return;

  const isSlime = sp === 'slime';
  const isFrog = sp === 'frog';
  const mat = rig.hairMat;
  const shade = rig.hairShadeMat;
  const bandMat = rig.accentMat;
  const hasCapHat = Boolean(
    hatKey &&
      hatKey !== 'none' &&
      hatKey !== 'halo' &&
      hatKey !== 'star_circlet' &&
      hatKey !== 'earmuffs' &&
      hatKey !== 'antlers'
  );
  const isDomeHat =
    hatKey === 'beanie' ||
    hatKey === 'lantern_cap' ||
    hatKey === 'aviator' ||
    hatKey === 'mushroom' ||
    hatKey === 'nightcap' ||
    hatKey === 'straw' ||
    hatKey === 'wizard' ||
    hatKey === 'witch_moon' ||
    hatKey === 'froggy_hood' ||
    hatKey === 'pirate' ||
    hatKey === 'chef';
  rig.hairHasDomeHat = isDomeHat;
  rig.hairHasCapHat = hasCapHat;

  rig.hairGroup.scale.set(
    isSlime ? 1.05 : isFrog ? 1.12 : 1.08,
    isSlime ? 0.86 : isFrog ? 0.88 : 0.98,
    isSlime ? 1.06 : isFrog ? 1.04 : 1.0
  );
  rig.hairGroup.position.set(0, isSlime ? -0.06 : isFrog ? -0.02 : 0.01, -0.01);

  // Crown & back hair caps leave the entire face window cleanly open above brow line (y >= +0.26)
  const addCrownCap = (rotX = -0.32) => {
    const cap = new THREE.Mesh(GEO.hairCap, mat);
    cap.rotation.x = rotX;
    cap.scale.set(1.01, isDomeHat ? 0.94 : 1.0, 1.01);
    cap.castShadow = true;
    rig.hairGroup.add(cap);
  };

  const addBackCap = (scaleY = 0.98) => {
    const back = new THREE.Mesh(GEO.hairBackCap, shade);
    back.rotation.x = -0.1;
    back.scale.set(1.01, scaleY, 1.02);
    back.castShadow = true;
    rig.hairGroup.add(back);
  };

  // Side locks hug behind the ears/temples (z <= 0.06) so cheeks & eyes stay 100% open
  const addSideLocks = (lenScale = 0.95, sweepZ = 0.08) => {
    for (const k of [-1, 1]) {
      const sideGrp = new THREE.Group();
      sideGrp.position.set(k * 0.395, 0.16, 0.03);
      const lock = new THREE.Mesh(GEO.hairLock, mat);
      lock.position.set(0, -0.14 - (lenScale - 1) * 0.05, 0.01);
      lock.rotation.set(sweepZ, 0, -k * 0.18);
      lock.scale.set(0.9, lenScale, 0.85);
      lock.castShadow = true;
      sideGrp.add(lock);
      rig.hairGroup.add(sideGrp);
      if (k < 0) rig.hairSideL = sideGrp;
      else rig.hairSideR = sideGrp;
    }
  };

  // Forehead hairline bangs placed high on forehead (y >= 0.31) cleanly above eyes/glasses
  const addPartedBangs = (spreadX = 0.14, lenScale = 0.85) => {
    for (const k of [-1, 1]) {
      const bang = new THREE.Mesh(GEO.hairLock, mat);
      bang.position.set(k * spreadX, 0.315, 0.31);
      bang.rotation.set(0.45, k * 0.25, k * 0.62);
      bang.scale.set(0.9, lenScale, 0.68);
      rig.hairGroup.add(bang);
    }
  };

  // ==================== 1. MALE / SHORT STYLED CUTS ====================
  if (hairId === 'spiky') {
    addCrownCap(-0.34);
    if (isDomeHat) {
      // Spikes peek briskly out around the hat brim without piercing through the crown
      for (const [sx, sy, sz, rx, rz] of [
        [-0.2, 0.3, 0.27, 0.95, 0.55],
        [0, 0.32, 0.29, 1.02, 0],
        [0.2, 0.3, 0.27, 0.95, -0.55],
        [-0.31, 0.24, -0.06, 0.15, 1.05],
        [0.31, 0.24, -0.06, 0.15, -1.05],
        [0, 0.26, -0.34, -0.95, 0],
      ] as const) {
        const s = new THREE.Mesh(GEO.hairSpike, mat);
        s.position.set(sx, sy, sz);
        s.rotation.set(rx, 0, rz);
        s.scale.set(0.85, 0.82, 0.72);
        rig.hairGroup.add(s);
      }
    } else {
      const crownMul = hasCapHat ? 0.78 : 1.0;
      const crestGrp = new THREE.Group();
      crestGrp.position.set(0, 0.32, 0.02);
      const spikeConfigs: [number, number, number, number, number, number][] = [
        [0, 0.43 * crownMul + 0.06, 0.12, 0.42, 0, 0],
        [-0.14, 0.4 * crownMul + 0.05, 0.15, 0.48, 0, 0.42],
        [0.14, 0.4 * crownMul + 0.05, 0.15, 0.48, 0, -0.42],
        [0, 0.43 * crownMul + 0.06, -0.06, -0.18, 0, 0.08],
        [-0.23, 0.34, -0.04, 0.12, 0, 0.7],
        [0.23, 0.34, -0.04, 0.12, 0, -0.7],
        [0, 0.35, -0.24, -0.62, 0, 0],
      ];
      for (const [x, y, z, rx, ry, rz] of spikeConfigs) {
        const s = new THREE.Mesh(GEO.hairSpike, mat);
        s.position.set(x, y - 0.32, z - 0.02);
        s.rotation.set(rx, ry, rz);
        s.scale.set(0.95, 1.0 * crownMul, 0.78);
        s.castShadow = true;
        crestGrp.add(s);
      }
      rig.hairGroup.add(crestGrp);
      rig.hairCrest = crestGrp;
    }
    // Forehead wispy bangs tucked nicely above eyes
    for (const k of [-1, 0, 1]) {
      const b = new THREE.Mesh(GEO.hairSpike, shade);
      b.position.set(k * 0.12, 0.31, 0.33);
      b.rotation.set(2.15, 0, -k * 0.38);
      b.scale.set(0.7, 0.68, 0.5);
      rig.hairGroup.add(b);
    }
    addSideLocks(0.7, 0.1);
  } else if (hairId === 'quiff') {
    addCrownCap(-0.32);
    const waveLift = isDomeHat ? 0.05 : hasCapHat ? 0.02 : 0;
    const crestGrp = new THREE.Group();
    crestGrp.position.set(0, 0.32, 0.22);
    const swoop = new THREE.Mesh(GEO.hairLock, mat);
    swoop.position.set(0.05, 0.37 - waveLift - 0.32, 0.02);
    swoop.rotation.set(0.55, 0.15, 1.15);
    swoop.scale.set(isDomeHat ? 0.95 : 1.15, isDomeHat ? 1.08 : 1.32, isDomeHat ? 0.88 : 1.0);
    swoop.castShadow = true;
    crestGrp.add(swoop);

    const crest = new THREE.Mesh(GEO.hairCurl, mat);
    crest.position.set(-0.07, 0.36 - waveLift - 0.32, 0.01);
    crest.scale.set(1.05, isDomeHat ? 0.62 : 0.78, 0.95);
    crestGrp.add(crest);
    rig.hairGroup.add(crestGrp);
    if (!isDomeHat) rig.hairCrest = crestGrp;

    const bangTip = new THREE.Mesh(GEO.hairSpike, shade);
    bangTip.position.set(0.18, 0.31, 0.31);
    bangTip.rotation.set(1.6, 0, -0.95);
    bangTip.scale.set(0.72, 0.75, 0.5);
    rig.hairGroup.add(bangTip);

    addSideLocks(0.68, 0.08);
  } else if (hairId === 'curtains') {
    addCrownCap(-0.3);
    addBackCap(0.95);
    addPartedBangs(0.15, 0.95);
    for (const k of [-1, 1]) {
      const cheek = new THREE.Mesh(GEO.hairSpike, shade);
      cheek.position.set(k * 0.31, 0.18, 0.22);
      cheek.rotation.set(2.85, 0, k * 0.32);
      cheek.scale.set(0.78, 0.85, 0.58);
      rig.hairGroup.add(cheek);
    }
    addSideLocks(0.88, 0.1);
  } else if (hairId === 'tousled') {
    addCrownCap(-0.32);
    const crestGrp = new THREE.Group();
    crestGrp.position.set(0, 0.32, 0);
    const puffs: [number, number, number, number][] = isDomeHat
      ? [
          [-0.24, 0.28, 0.22, 0.82],
          [0.24, 0.28, 0.22, 0.82],
          [-0.31, 0.2, 0.04, 0.88],
          [0.31, 0.2, 0.04, 0.88],
          [-0.18, 0.28, -0.26, 0.9],
          [0.18, 0.28, -0.26, 0.9],
          [0, 0.26, -0.34, 0.92],
        ]
      : [
          [0, 0.4, 0.12, 1.05],
          [-0.17, 0.36, 0.16, 0.96],
          [0.17, 0.36, 0.16, 0.96],
          [-0.29, 0.24, 0.14, 0.88],
          [0.29, 0.24, 0.14, 0.88],
          [-0.16, 0.34, -0.22, 0.98],
          [0.16, 0.34, -0.22, 0.98],
          [0, 0.3, -0.32, 0.98],
        ];
    for (let i = 0; i < puffs.length; i++) {
      const [px, py, pz, ps] = puffs[i];
      const puff = new THREE.Mesh(GEO.hairCurl, i % 2 === 0 ? mat : shade);
      puff.position.set(px, py - 0.32, pz);
      puff.scale.setScalar(ps);
      puff.castShadow = true;
      crestGrp.add(puff);
    }
    rig.hairGroup.add(crestGrp);
    if (!isDomeHat) rig.hairCrest = crestGrp;

    for (const k of [-1, 0, 1]) {
      const wisp = new THREE.Mesh(GEO.hairSpike, mat);
      wisp.position.set(k * 0.11, 0.3, 0.33);
      wisp.rotation.set(2.2, 0, -k * 0.32);
      wisp.scale.set(0.65, 0.64, 0.46);
      rig.hairGroup.add(wisp);
    }
  } else if (hairId === 'undercut') {
    addCrownCap(-0.34);
    const layerCount = 6;
    for (let i = 0; i < layerCount; i++) {
      const a = (i / layerCount) * Math.PI * 2;
      if (isDomeHat && Math.abs(Math.cos(a)) > 0.3) continue;
      const topLayer = new THREE.Mesh(GEO.hairSpike, i % 2 === 0 ? mat : shade);
      topLayer.position.set(Math.sin(a) * 0.22, isDomeHat ? 0.31 : 0.38, Math.cos(a) * 0.2);
      topLayer.rotation.set(Math.cos(a) * 0.55, 0, -Math.sin(a) * 0.55);
      topLayer.scale.set(0.9, isDomeHat ? 0.72 : 0.92, 0.7);
      rig.hairGroup.add(topLayer);
    }
    addSideLocks(1.05, 0.12);
    const napeTail = new THREE.Group();
    napeTail.position.set(0, 0.04, -0.37);
    for (const k of [-1, 0, 1]) {
      const flick = new THREE.Mesh(GEO.hairSpike, shade);
      flick.position.set(k * 0.12, -0.06, -0.05);
      flick.rotation.set(-2.3, 0, k * 0.25);
      flick.scale.set(0.85, 1.1, 0.62);
      napeTail.add(flick);
    }
    rig.hairGroup.add(napeTail);
    rig.hairTailBack = napeTail;
    rig.hairBackAmp = 0.62;
  } else if (hairId === 'pomp') {
    addCrownCap(-0.32);
    const pompScale = isDomeHat ? 0.72 : hasCapHat ? 0.85 : 1.0;
    const crestGrp = new THREE.Group();
    crestGrp.position.set(0, 0.34, 0.18);
    const roll = new THREE.Mesh(GEO.hairLock, mat);
    roll.position.set(0, (isDomeHat ? 0.35 : 0.4) - 0.34, (isDomeHat ? 0.26 : 0.19) - 0.18);
    roll.rotation.set(0.45, 0, Math.PI / 2);
    roll.scale.set(1.32 * pompScale, 1.28, 1.32 * pompScale);
    roll.castShadow = true;
    crestGrp.add(roll);

    const crestFront = new THREE.Mesh(GEO.hairCurl, mat);
    crestFront.position.set(0, (isDomeHat ? 0.34 : 0.38) - 0.34, 0.1);
    crestFront.scale.set(1.12, 0.8 * pompScale, 0.95);
    crestGrp.add(crestFront);
    rig.hairGroup.add(crestGrp);
    if (!isDomeHat) rig.hairCrest = crestGrp;

    addSideLocks(0.68, 0.04);

  // ==================== 2. FEMALE & LONG / EXPRESSIVE CUTS ====================
  } else if (hairId === 'bob') {
    addCrownCap(-0.3);
    addBackCap(1.02);
    // Crisp high bangs cleanly above eyes
    for (const bx of [-0.16, -0.055, 0.055, 0.16]) {
      const bang = new THREE.Mesh(GEO.hairLock, mat);
      bang.position.set(bx, 0.318, 0.315);
      bang.rotation.set(0.48, bx * 0.65, -bx * 0.45);
      bang.scale.set(0.88, 0.68, 0.62);
      rig.hairGroup.add(bang);
    }
    // Rounded inward bob side-cups framing behind temples/cheeks
    for (const k of [-1, 1]) {
      const sideGrp = new THREE.Group();
      sideGrp.position.set(k * 0.395, 0.16, 0.0);
      const bobSide = new THREE.Mesh(GEO.hairCurl, mat);
      bobSide.position.set(0, -0.2, 0);
      bobSide.scale.set(0.8, 1.65, 1.12);
      bobSide.castShadow = true;
      sideGrp.add(bobSide);
      rig.hairGroup.add(sideGrp);
      if (k < 0) rig.hairSideL = sideGrp;
      else rig.hairSideR = sideGrp;
    }
  } else if (hairId === 'twintails') {
    addCrownCap(-0.32);
    addPartedBangs(0.12, 0.78);
    for (const k of [-1, 1]) {
      const band = new THREE.Mesh(GEO.hairBand, bandMat);
      band.position.set(k * 0.4, 0.14, -0.08);
      band.rotation.y = (k * Math.PI) / 2;
      rig.hairGroup.add(band);

      const tailGrp = new THREE.Group();
      tailGrp.position.set(k * 0.42, 0.14, -0.09);
      const upper = new THREE.Mesh(GEO.hairTail, mat);
      upper.position.set(k * 0.12, -0.14, -0.04);
      upper.rotation.set(0.14, 0, k * 0.42);
      upper.scale.set(1.05, 1.15, 1.0);
      upper.castShadow = true;
      tailGrp.add(upper);

      const lower = new THREE.Mesh(GEO.hairSpike, shade);
      lower.position.set(k * 0.19, -0.37, -0.06);
      lower.rotation.set(0.14, 0, k * (Math.PI - 0.16));
      lower.scale.set(0.95, 1.0, 0.9);
      tailGrp.add(lower);

      rig.hairGroup.add(tailGrp);
      if (k < 0) rig.hairTailL = tailGrp;
      else rig.hairTailR = tailGrp;
    }
    addSideLocks(0.82, 0.1);
  } else if (hairId === 'ponytail') {
    addCrownCap(-0.32);
    for (const bx of [-0.14, 0, 0.14]) {
      const bang = new THREE.Mesh(GEO.hairLock, mat);
      bang.position.set(bx, 0.318, 0.315);
      bang.rotation.set(0.46, bx * 0.45, -bx * 0.4);
      bang.scale.set(0.86, 0.68, 0.62);
      rig.hairGroup.add(bang);
    }
    addSideLocks(0.8, 0.1);

    const band = new THREE.Mesh(GEO.hairBand, bandMat);
    band.position.set(0, 0.24, -0.4);
    band.rotation.x = 0.4;
    rig.hairGroup.add(band);

    const tailGrp = new THREE.Group();
    tailGrp.position.set(0, 0.24, -0.41);
    const tailMain = new THREE.Mesh(GEO.hairTail, mat);
    tailMain.position.set(0, -0.18, -0.14);
    tailMain.rotation.x = -0.58;
    tailMain.scale.set(1.18, 1.25, 1.12);
    tailMain.castShadow = true;
    tailGrp.add(tailMain);

    const tailTip = new THREE.Mesh(GEO.hairSpike, shade);
    tailTip.position.set(0, -0.42, -0.22);
    tailTip.rotation.x = Math.PI - 0.25;
    tailTip.scale.set(1.0, 1.15, 0.95);
    tailGrp.add(tailTip);

    rig.hairGroup.add(tailGrp);
    rig.hairTailBack = tailGrp;
  } else if (hairId === 'long_wavy') {
    addCrownCap(-0.32);
    addBackCap(1.06);
    addPartedBangs(0.14, 0.82);
    addSideLocks(1.15, 0.1);

    const waveGrp = new THREE.Group();
    waveGrp.position.set(0, 0.04, -0.36);
    for (const k of [-1, 0, 1]) {
      const wave = new THREE.Mesh(GEO.hairTail, k === 0 ? mat : shade);
      wave.position.set(k * 0.18, -0.18, -0.03);
      wave.rotation.set(-0.22, 0, k * 0.12);
      wave.scale.set(1.16, 1.36, 0.9);
      wave.castShadow = true;
      waveGrp.add(wave);

      const curlEnd = new THREE.Mesh(GEO.hairCurl, mat);
      curlEnd.position.set(k * 0.21, -0.42, -0.07);
      curlEnd.scale.set(0.92, 0.82, 0.82);
      waveGrp.add(curlEnd);
    }
    rig.hairGroup.add(waveGrp);
    rig.hairTailBack = waveGrp;
  } else if (hairId === 'space_buns') {
    addCrownCap(-0.32);
    addPartedBangs(0.14, 0.78);
    // Tuck space buns cleanly slightly wider/lower when dome/brim hat is worn
    const bunX = isDomeHat ? 0.38 : 0.3;
    const bunY = isDomeHat ? 0.24 : 0.41;
    const bunS = isDomeHat ? 0.98 : 1.15;
    for (const k of [-1, 1]) {
      const bunGrp = new THREE.Group();
      bunGrp.position.set(k * bunX, bunY, -0.06);
      const bun = new THREE.Mesh(GEO.hairCurl, mat);
      bun.scale.set(1.12 * bunS, 1.08 * bunS, 1.08 * bunS);
      bun.castShadow = true;
      bunGrp.add(bun);

      const wrap = new THREE.Mesh(GEO.hairBand, bandMat);
      wrap.position.set(k * -0.02, -0.06, 0);
      wrap.rotation.set(Math.PI / 2, k * 0.38, 0);
      wrap.scale.setScalar(1.22 * bunS);
      bunGrp.add(wrap);
      rig.hairGroup.add(bunGrp);
      if (k < 0) rig.hairBunL = bunGrp;
      else rig.hairBunR = bunGrp;
    }
    addSideLocks(0.88, 0.1);
  } else if (hairId === 'braids') {
    addCrownCap(-0.32);
    addBackCap(0.95);
    addPartedBangs(0.14, 0.8);
    rig.hairTailAmp = 0.82;
    for (const k of [-1, 1]) {
      const braidGrp = new THREE.Group();
      braidGrp.position.set(k * 0.41, 0.06, 0.02);
      for (let seg = 0; seg < 4; seg++) {
        const bead = new THREE.Mesh(GEO.hairBraidBead, seg % 2 === 0 ? mat : shade);
        bead.position.set(k * (0.02 + seg * 0.015), -seg * 0.11, 0.01 * seg);
        bead.scale.set(0.95 - seg * 0.1, 1.0, 0.95 - seg * 0.1);
        bead.castShadow = true;
        braidGrp.add(bead);
      }
      const tie = new THREE.Mesh(GEO.pom, bandMat);
      tie.position.set(k * 0.06, -0.4, 0.04);
      tie.scale.setScalar(0.65);
      braidGrp.add(tie);
      rig.hairGroup.add(braidGrp);
      if (k < 0) rig.hairTailL = braidGrp;
      else rig.hairTailR = braidGrp;
    }
  } else if (hairId === 'hime') {
    addCrownCap(-0.3);
    addBackCap(1.06);
    // Clean high blunt princess fringe well above eyes
    for (const bx of [-0.17, -0.085, 0, 0.085, 0.17]) {
      const bang = new THREE.Mesh(GEO.hairLock, mat);
      bang.position.set(bx, 0.315, 0.315);
      bang.rotation.set(0.46, bx * 0.45, -bx * 0.15);
      bang.scale.set(0.84, 0.65, 0.6);
      rig.hairGroup.add(bang);
    }
    // Straight princess locks flanking the sides behind rosy cheeks
    for (const k of [-1, 1]) {
      const sideGrp = new THREE.Group();
      sideGrp.position.set(k * 0.395, 0.14, 0.06);
      const himeLock = new THREE.Mesh(GEO.hairTail, mat);
      himeLock.position.set(0, -0.18, 0);
      himeLock.rotation.z = -k * 0.06;
      himeLock.scale.set(0.88, 0.85, 0.72);
      himeLock.castShadow = true;
      sideGrp.add(himeLock);
      rig.hairGroup.add(sideGrp);
      if (k < 0) rig.hairSideL = sideGrp;
      else rig.hairSideR = sideGrp;
    }
    const backVeil = new THREE.Group();
    backVeil.position.set(0, 0.04, -0.36);
    for (const k of [-1, 0, 1]) {
      const veil = new THREE.Mesh(GEO.hairTail, k === 0 ? mat : shade);
      veil.position.set(k * 0.19, -0.2, -0.04);
      veil.rotation.x = -0.18;
      veil.scale.set(1.2, 1.46, 0.76);
      backVeil.add(veil);
    }
    rig.hairGroup.add(backVeil);
    rig.hairTailBack = backVeil;
    rig.hairBackAmp = 0.86;
  } else if (hairId === 'pixie_curl') {
    addCrownCap(-0.32);
    const sweep = new THREE.Mesh(GEO.hairLock, mat);
    sweep.position.set(-0.06, 0.32, 0.31);
    sweep.rotation.set(0.45, -0.18, -0.85);
    sweep.scale.set(0.95, 1.02, 0.68);
    rig.hairGroup.add(sweep);

    for (const k of [-1, 1]) {
      const sideGrp = new THREE.Group();
      sideGrp.position.set(k * 0.395, 0.12, 0.02);
      const earCurl = new THREE.Mesh(GEO.hairCurl, shade);
      earCurl.position.set(0, -0.08, 0);
      earCurl.scale.set(0.76, 0.98, 0.85);
      sideGrp.add(earCurl);
      rig.hairGroup.add(sideGrp);
      if (k < 0) rig.hairSideL = sideGrp;
      else rig.hairSideR = sideGrp;
    }
  } else if (hairId === 'fluffy_afro') {
    // Cloud puff ring around sides/back & crown, keeping the entire front face open!
    const ringCount = 10;
    for (let i = 0; i < ringCount; i++) {
      const a = (i / ringCount) * Math.PI * 2;
      // Leave generous 140-deg front window completely clear
      if (Math.cos(a) > 0.32) continue;
      const puff = new THREE.Mesh(GEO.hairCurl, i % 2 === 0 ? mat : shade);
      puff.position.set(Math.sin(a) * 0.38, 0.16, Math.cos(a) * 0.36 - 0.04);
      puff.scale.setScalar(1.2);
      puff.castShadow = true;
      rig.hairGroup.add(puff);
    }
    if (!isDomeHat) {
      const crestGrp = new THREE.Group();
      crestGrp.position.set(0, 0.34, -0.02);
      const topCount = 6;
      for (let i = 0; i < topCount; i++) {
        const a = (i / topCount) * Math.PI * 2 + 0.35;
        const puff = new THREE.Mesh(GEO.hairCurl, i % 2 === 0 ? shade : mat);
        puff.position.set(Math.sin(a) * 0.22, (hasCapHat ? 0.34 : 0.37) - 0.34, Math.cos(a) * 0.2 - 0.01);
        puff.scale.setScalar(hasCapHat ? 0.92 : 1.1);
        puff.castShadow = true;
        crestGrp.add(puff);
      }
      rig.hairGroup.add(crestGrp);
      rig.hairCrest = crestGrp;
    } else {
      addCrownCap(-0.32);
    }
  } else if (hairId === 'prince_part') {
    addCrownCap(-0.32);
    addBackCap(0.98);
    const swoosh = new THREE.Mesh(GEO.hairLock, mat);
    swoosh.position.set(0.08, 0.32, 0.31);
    swoosh.rotation.set(0.42, 0.25, 0.88);
    swoosh.scale.set(1.05, 1.15, 0.72);
    rig.hairGroup.add(swoosh);
    addSideLocks(0.84, 0.1);
  } else if (hairId === 'twin_drills') {
    addCrownCap(-0.32);
    addPartedBangs(0.14, 0.78);
    for (const k of [-1, 1]) {
      const band = new THREE.Mesh(GEO.hairBand, bandMat);
      band.position.set(k * 0.4, 0.14, -0.06);
      band.rotation.y = (k * Math.PI) / 2;
      rig.hairGroup.add(band);

      const drillGrp = new THREE.Group();
      drillGrp.position.set(k * 0.42, 0.14, -0.06);
      for (let tier = 0; tier < 3; tier++) {
        const ring = new THREE.Mesh(GEO.hairCurl, tier % 2 === 0 ? mat : shade);
        ring.position.set(k * (0.1 + tier * 0.025), -0.1 - tier * 0.13, -0.03);
        ring.scale.set(1.08 - tier * 0.18, 0.95, 1.08 - tier * 0.18);
        ring.castShadow = true;
        drillGrp.add(ring);
      }
      rig.hairGroup.add(drillGrp);
      if (k < 0) rig.hairTailL = drillGrp;
      else rig.hairTailR = drillGrp;
    }
    addSideLocks(0.75, 0.08);
  } else if (hairId === 'messy_bun') {
    addCrownCap(-0.32);
    addBackCap(0.95);
    addPartedBangs(0.13, 0.78);
    addSideLocks(0.86, 0.12);
    const bunGrp = new THREE.Group();
    bunGrp.position.set(0, isDomeHat ? 0.22 : 0.38, isDomeHat ? -0.34 : -0.14);
    const bun = new THREE.Mesh(GEO.hairCurl, mat);
    bun.scale.set(1.32, 1.12, 1.18);
    bun.castShadow = true;
    bunGrp.add(bun);
    const wrap = new THREE.Mesh(GEO.hairBand, bandMat);
    wrap.rotation.x = Math.PI / 2;
    wrap.position.y = -0.05;
    wrap.scale.setScalar(1.3);
    bunGrp.add(wrap);
    rig.hairGroup.add(bunGrp);
    rig.hairTailBack = bunGrp;
    rig.hairBackAmp = 0.45;
  } else if (hairId === 'braid_crown') {
    addCrownCap(-0.31);
    addBackCap(1.0);
    addPartedBangs(0.15, 0.76);
    addSideLocks(0.82, 0.1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const bead = new THREE.Mesh(GEO.hairBraidBead, i % 2 === 0 ? mat : shade);
      bead.position.set(Math.sin(a) * 0.34, isDomeHat ? 0.27 : 0.31, Math.cos(a) * 0.32 - 0.02);
      bead.scale.setScalar(0.82);
      rig.hairGroup.add(bead);
    }
  }
}

function rebuildOutfitParts(
  rig: MochiRig,
  top: string,
  bottom: string,
  layer: string,
  shoes: string,
  isSlime: boolean
): void {
  clearGroup(rig.outfitGroup);
  clearGroup(rig.leftShoeGroup);
  clearGroup(rig.rightShoeGroup);
  rig.outfitCapeMesh = undefined;
  rig.outfitTailMesh = undefined;
  rig.outfitWingL = undefined;
  rig.outfitWingR = undefined;

  const hasLongSleeves =
    top === 'hoodie' ||
    top === 'cardigan' ||
    top === 'blazer' ||
    top === 'varsity' ||
    top === 'peacoat' ||
    top === 'tunic' ||
    top === 'kimono_top' ||
    top === 'blouse' ||
    top === 'sailor_top' ||
    top === 'parka';

  const armMat =
    top === 'varsity'
      ? rig.outfitMat2
      : hasLongSleeves
      ? rig.outfitMat1
      : rig.mainMat;
  rig.leftArm.material = armMat;
  rig.rightArm.material = armMat;
  rig.leftArm.position.x = hasLongSleeves ? -0.39 : -0.34;
  rig.rightArm.position.x = hasLongSleeves ? 0.39 : 0.34;

  rig.outfitGroup.scale.set(isSlime ? 1.18 : 1.0, isSlime ? 0.96 : 1.0, isSlime ? 1.24 : 1.0);
  rig.outfitGroup.position.set(0, isSlime ? -0.05 : 0, 0);

  const goldMat = STATIC_MAT.gold;
  const whiteMat = STATIC_MAT.white;
  const creamMat = STATIC_MAT.cream;
  const redMat = STATIC_MAT.red;
  const darkMat = STATIC_MAT.eyeDark;
  const glassMat = STATIC_MAT.glass;
  const mat1 = rig.outfitMat1;
  const mat2 = rig.outfitMat2;
  const mat3 = rig.outfitMat3;

  // ==================== 1. BOTTOMS (Trousers, Jeans, Shorts, Cargo Pants, Skirts, Gown, Tutu) ====================
  if (bottom === 'trousers' || bottom === 'jeans' || bottom === 'shorts' || bottom === 'cargo_pants') {
    const hipMat = bottom === 'jeans' || bottom === 'cargo_pants' ? mat2 : mat2;
    const hips = new THREE.Mesh(GEO.outfitTunic, hipMat);
    hips.position.set(0, 0.21, 0);
    hips.scale.set(1.09, bottom === 'shorts' ? 0.44 : 0.56, 1.05);
    hips.castShadow = true;
    rig.outfitGroup.add(hips);

    const belt = new THREE.Mesh(GEO.outfitBelt, mat3);
    belt.position.set(0, 0.295, 0);
    belt.rotation.x = Math.PI / 2;
    belt.scale.set(1.07, 1.03, 0.85);
    rig.outfitGroup.add(belt);

    if (bottom === 'jeans' || bottom === 'cargo_pants') {
      const buckle = new THREE.Mesh(GEO.pom, goldMat);
      buckle.position.set(0, 0.295, 0.41);
      buckle.scale.set(0.62, 0.52, 0.3);
      rig.outfitGroup.add(buckle);
    }

    if (!isSlime) {
      const legLen = bottom === 'shorts' ? 0.65 : 1.0;
      const legY = bottom === 'shorts' ? 0.14 : 0.11;
      for (const k of [-1, 1]) {
        const leg = new THREE.Mesh(GEO.pantLeg, hipMat);
        leg.position.set(k * 0.14, legY, 0.02);
        leg.scale.set(1.05, legLen, 1.08);
        rig.outfitGroup.add(leg);

        if (bottom === 'cargo_pants') {
          const pocket = new THREE.Mesh(GEO.outfitBib, mat1);
          pocket.position.set(k * 0.25, 0.14, 0.04);
          pocket.rotation.y = (k * Math.PI) / 2;
          pocket.scale.set(0.38, 0.35, 0.55);
          rig.outfitGroup.add(pocket);
        } else if (bottom === 'jeans') {
          const cuff = new THREE.Mesh(GEO.shoeCuff, whiteMat);
          cuff.position.set(k * 0.14, 0.03, 0.02);
          cuff.scale.set(1.12, 0.35, 1.15);
          rig.outfitGroup.add(cuff);
        }
      }
    }
  } else if (bottom === 'pleated_skirt') {
    const skirt = new THREE.Mesh(GEO.skirtCone, mat2);
    skirt.position.set(0, 0.2, 0);
    skirt.scale.set(1.02, 0.96, 1.02);
    skirt.castShadow = true;
    rig.outfitGroup.add(skirt);

    const waist = new THREE.Mesh(GEO.outfitBelt, mat1);
    waist.position.set(0, 0.31, 0);
    waist.rotation.x = Math.PI / 2;
    waist.scale.set(0.95, 0.95, 0.9);
    rig.outfitGroup.add(waist);

    // Crisp vertical pleat ribs & white hem trim
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const pleat = new THREE.Mesh(GEO.skirtPleat, mat1);
      pleat.position.set(Math.sin(a) * 0.39, 0.19, Math.cos(a) * 0.39);
      pleat.rotation.y = a;
      pleat.rotation.x = -0.22;
      pleat.scale.set(0.45, 0.92, 0.45);
      rig.outfitGroup.add(pleat);
    }
    const hem = new THREE.Mesh(GEO.outfitBelt, whiteMat);
    hem.position.set(0, 0.085, 0);
    hem.rotation.x = Math.PI / 2;
    hem.scale.set(1.22, 1.22, 0.55);
    rig.outfitGroup.add(hem);
  } else if (bottom === 'flared_skirt') {
    const gown = new THREE.Mesh(GEO.skirtFlare, mat2);
    gown.position.set(0, 0.18, 0);
    gown.scale.set(1.05, 1.0, 1.05);
    gown.castShadow = true;
    rig.outfitGroup.add(gown);

    const peplum = new THREE.Mesh(GEO.skirtTutu, mat1);
    peplum.position.set(0, 0.27, 0);
    peplum.scale.set(1.02, 0.92, 1.02);
    rig.outfitGroup.add(peplum);

    const hem = new THREE.Mesh(GEO.outfitBelt, whiteMat);
    hem.position.set(0, 0.04, 0);
    hem.rotation.x = Math.PI / 2;
    hem.scale.set(1.38, 1.38, 0.65);
    rig.outfitGroup.add(hem);
  } else if (bottom === 'petal_skirt') {
    const baseSkirt = new THREE.Mesh(GEO.skirtCone, mat2);
    baseSkirt.position.set(0, 0.19, 0);
    baseSkirt.scale.set(1.02, 0.92, 1.02);
    baseSkirt.castShadow = true;
    rig.outfitGroup.add(baseSkirt);

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const petal = new THREE.Mesh(GEO.earDisc, i % 2 === 0 ? mat1 : mat2);
      petal.position.set(Math.sin(a) * 0.4, 0.21, Math.cos(a) * 0.4);
      petal.rotation.y = a;
      petal.rotation.x = -0.35;
      petal.scale.set(1.05, 0.9, 0.45);
      rig.outfitGroup.add(petal);
    }
  } else if (bottom === 'hakama') {
    const robeHem = new THREE.Mesh(GEO.skirtCone, mat1);
    robeHem.position.set(0, 0.19, 0);
    robeHem.scale.set(0.95, 0.9, 0.95);
    robeHem.castShadow = true;
    rig.outfitGroup.add(robeHem);
  }

  // ==================== 2. TOPS (T-Shirt, Hoodie, Cardigan, Blazer, Vest, Varsity, Peacoat, Tunic, Blouse, Corset, Sailor, Kimono, Overalls Bib, Apron, Parka) ====================
  if (top === 'tshirt') {
    const tee = new THREE.Mesh(GEO.outfitTunic, mat1);
    tee.position.set(0, 0.36, 0);
    tee.scale.set(1.07, 0.72, 1.04);
    tee.castShadow = true;
    rig.outfitGroup.add(tee);

    const collar = new THREE.Mesh(GEO.outfitCollar, whiteMat);
    collar.position.set(0, isSlime ? 0.46 : 0.54, 0);
    collar.rotation.x = Math.PI / 2;
    collar.scale.set(1.02, 0.98, 0.75);
    rig.outfitGroup.add(collar);

    const emblem = new THREE.Mesh(GEO.pom, goldMat);
    emblem.position.set(0.11, 0.42, 0.365);
    emblem.scale.set(0.55, 0.55, 0.28);
    rig.outfitGroup.add(emblem);
  } else if (top === 'hoodie') {
    const body = new THREE.Mesh(GEO.outfitTunic, mat1);
    body.position.set(0, 0.35, 0);
    body.scale.set(1.1, 0.84, 1.06);
    body.castShadow = true;
    rig.outfitGroup.add(body);

    const hood = new THREE.Mesh(GEO.scarfTorus, mat1);
    hood.position.set(0, isSlime ? 0.46 : 0.54, -0.05);
    hood.rotation.x = Math.PI / 2 + 0.18;
    hood.scale.set(1.12, 1.14, 1.05);
    rig.outfitGroup.add(hood);

    const pocket = new THREE.Mesh(GEO.outfitBib, mat2);
    pocket.position.set(0, 0.28, 0.38);
    pocket.scale.set(0.75, 0.45, 0.45);
    rig.outfitGroup.add(pocket);

    for (const k of [-1, 1]) {
      const string = new THREE.Mesh(GEO.outfitStrap, whiteMat);
      string.position.set(k * 0.06, 0.44, 0.37);
      string.scale.set(0.28, 0.48, 0.35);
      rig.outfitGroup.add(string);
    }
  } else if (top === 'cardigan') {
    const body = new THREE.Mesh(GEO.outfitTunic, mat1);
    body.position.set(0, 0.35, 0);
    body.scale.set(1.09, 0.82, 1.05);
    body.castShadow = true;
    rig.outfitGroup.add(body);

    const shirt = new THREE.Mesh(GEO.outfitBib, whiteMat);
    shirt.position.set(0, 0.4, 0.34);
    shirt.scale.set(0.45, 0.85, 0.65);
    rig.outfitGroup.add(shirt);

    for (let b = 0; b < 3; b++) {
      const btn = new THREE.Mesh(GEO.pom, creamMat);
      btn.position.set(0.05, 0.45 - b * 0.09, 0.39);
      btn.scale.set(0.35, 0.35, 0.22);
      rig.outfitGroup.add(btn);
    }
  } else if (top === 'blazer' || top === 'peacoat') {
    const jacket = new THREE.Mesh(GEO.outfitTunic, mat1);
    jacket.position.set(0, 0.34, 0);
    jacket.scale.set(1.11, 0.88, 1.06);
    jacket.castShadow = true;
    rig.outfitGroup.add(jacket);

    const shirtV = new THREE.Mesh(GEO.outfitBib, whiteMat);
    shirtV.position.set(0, 0.43, 0.345);
    shirtV.scale.set(0.44, 0.68, 0.72);
    rig.outfitGroup.add(shirtV);

    for (const k of [-1, 1]) {
      const lapel = new THREE.Mesh(GEO.outfitStrap, top === 'peacoat' ? mat1 : mat2);
      lapel.position.set(k * 0.085, 0.45, 0.368);
      lapel.rotation.set(-0.2, 0, k * 0.42);
      lapel.scale.set(0.75, 0.72, 0.55);
      rig.outfitGroup.add(lapel);

      if (top === 'peacoat') {
        for (let row = 0; row < 2; row++) {
          const brass = new THREE.Mesh(GEO.pom, goldMat);
          brass.position.set(k * 0.09, 0.37 - row * 0.1, 0.4);
          brass.scale.set(0.38, 0.38, 0.24);
          rig.outfitGroup.add(brass);
        }
      }
    }
  } else if (top === 'vest') {
    const shirt = new THREE.Mesh(GEO.outfitTunic, creamMat);
    shirt.position.set(0, 0.36, 0);
    shirt.scale.set(1.06, 0.76, 1.03);
    rig.outfitGroup.add(shirt);

    for (const k of [-1, 1]) {
      const panel = new THREE.Mesh(GEO.outfitBib, mat1);
      panel.position.set(k * 0.15, 0.37, 0.25);
      panel.rotation.y = k * 0.42;
      panel.scale.set(0.55, 0.92, 1.3);
      rig.outfitGroup.add(panel);
    }
  } else if (top === 'varsity') {
    const jacket = new THREE.Mesh(GEO.outfitTunic, mat1);
    jacket.position.set(0, 0.35, 0);
    jacket.scale.set(1.11, 0.84, 1.06);
    jacket.castShadow = true;
    rig.outfitGroup.add(jacket);

    const collarRib = new THREE.Mesh(GEO.outfitCollar, mat2);
    collarRib.position.set(0, isSlime ? 0.45 : 0.53, 0);
    collarRib.rotation.x = Math.PI / 2;
    collarRib.scale.set(1.04, 1.0, 0.88);
    rig.outfitGroup.add(collarRib);

    const hemRib = new THREE.Mesh(GEO.outfitBelt, mat2);
    hemRib.position.set(0, 0.22, 0);
    hemRib.rotation.x = Math.PI / 2;
    hemRib.scale.set(1.1, 1.06, 0.95);
    rig.outfitGroup.add(hemRib);

    const placket = new THREE.Mesh(GEO.outfitStrap, mat2);
    placket.position.set(0, 0.36, 0.39);
    placket.scale.set(0.42, 0.95, 0.4);
    rig.outfitGroup.add(placket);

    const letterBadge = new THREE.Mesh(GEO.pom, goldMat);
    letterBadge.position.set(-0.12, 0.42, 0.38);
    letterBadge.scale.set(0.65, 0.65, 0.28);
    rig.outfitGroup.add(letterBadge);
  } else if (top === 'tunic') {
    const tunic = new THREE.Mesh(GEO.outfitTunic, mat1);
    tunic.position.set(0, 0.33, 0);
    tunic.scale.set(1.11, 0.92, 1.06);
    tunic.castShadow = true;
    rig.outfitGroup.add(tunic);

    const goldTrim = new THREE.Mesh(GEO.outfitCollar, goldMat);
    goldTrim.position.set(0, isSlime ? 0.45 : 0.52, 0);
    goldTrim.rotation.x = Math.PI / 2;
    goldTrim.scale.set(1.05, 1.0, 0.92);
    rig.outfitGroup.add(goldTrim);

    const belt = new THREE.Mesh(GEO.outfitBelt, mat2);
    belt.position.set(0, 0.27, 0);
    belt.rotation.x = Math.PI / 2;
    belt.scale.set(1.11, 1.06, 1.2);
    rig.outfitGroup.add(belt);

    const clasp = new THREE.Mesh(GEO.pom, goldMat);
    clasp.position.set(0, 0.27, 0.42);
    clasp.scale.set(0.68, 0.58, 0.35);
    rig.outfitGroup.add(clasp);
  } else if (top === 'blouse') {
    const bodice = new THREE.Mesh(GEO.outfitTunic, mat1);
    bodice.position.set(0, 0.37, 0);
    bodice.scale.set(1.08, 0.74, 1.04);
    bodice.castShadow = true;
    rig.outfitGroup.add(bodice);

    const ruffleCollar = new THREE.Mesh(GEO.scarfTorus, whiteMat);
    ruffleCollar.position.set(0, isSlime ? 0.46 : 0.54, 0);
    ruffleCollar.rotation.x = Math.PI / 2;
    ruffleCollar.scale.set(1.06, 1.02, 0.85);
    rig.outfitGroup.add(ruffleCollar);

    const gem = new THREE.Mesh(GEO.pom, mat2);
    gem.position.set(0, 0.44, 0.375);
    gem.scale.set(0.65, 0.65, 0.4);
    rig.outfitGroup.add(gem);
  } else if (top === 'corset_top') {
    const blouseUnder = new THREE.Mesh(GEO.outfitTunic, whiteMat);
    blouseUnder.position.set(0, 0.38, 0);
    blouseUnder.scale.set(1.05, 0.68, 1.02);
    rig.outfitGroup.add(blouseUnder);

    const corset = new THREE.Mesh(GEO.outfitTunic, mat1);
    corset.position.set(0, 0.32, 0);
    corset.scale.set(1.09, 0.62, 1.05);
    corset.castShadow = true;
    rig.outfitGroup.add(corset);

    for (let r = 0; r < 3; r++) {
      const lace = new THREE.Mesh(GEO.outfitStrap, mat2);
      lace.position.set(0, 0.4 - r * 0.06, 0.385);
      lace.rotation.z = Math.PI / 2;
      lace.scale.set(0.28, 0.45, 0.35);
      rig.outfitGroup.add(lace);
    }
  } else if (top === 'sailor_top') {
    const shirt = new THREE.Mesh(GEO.outfitTunic, whiteMat);
    shirt.position.set(0, 0.36, 0);
    shirt.scale.set(1.07, 0.72, 1.04);
    rig.outfitGroup.add(shirt);

    const backFlap = new THREE.Mesh(GEO.outfitFlap, mat1);
    backFlap.position.set(0, isSlime ? 0.41 : 0.49, -0.28);
    backFlap.rotation.x = 0.45;
    rig.outfitGroup.add(backFlap);

    const backTrim = new THREE.Mesh(GEO.outfitFlap, whiteMat);
    backTrim.position.set(0, isSlime ? 0.405 : 0.485, -0.295);
    backTrim.rotation.x = 0.45;
    backTrim.scale.set(1.07, 1.07, 0.75);
    rig.outfitGroup.add(backTrim);

    for (const k of [-1, 1]) {
      const lapel = new THREE.Mesh(GEO.outfitStrap, mat1);
      lapel.position.set(k * 0.12, isSlime ? 0.39 : 0.47, 0.305);
      lapel.rotation.set(-0.28, 0, k * 0.54);
      lapel.scale.set(1.15, 0.85, 1.0);
      rig.outfitGroup.add(lapel);

      const bowWing = new THREE.Mesh(GEO.earDisc, redMat);
      bowWing.position.set(k * 0.085, isSlime ? 0.34 : 0.42, 0.38);
      bowWing.scale.set(0.7, 0.5, 0.3);
      bowWing.rotation.z = k * 0.28;
      rig.outfitGroup.add(bowWing);

      const ribbon = new THREE.Mesh(GEO.outfitStrap, redMat);
      ribbon.position.set(k * 0.04, isSlime ? 0.25 : 0.33, 0.385);
      ribbon.rotation.set(-0.15, 0, -k * 0.22);
      ribbon.scale.set(0.45, 0.48, 0.45);
      rig.outfitGroup.add(ribbon);
    }

    const bowKnot = new THREE.Mesh(GEO.pom, redMat);
    bowKnot.position.set(0, isSlime ? 0.34 : 0.42, 0.39);
    bowKnot.scale.setScalar(0.68);
    rig.outfitGroup.add(bowKnot);
  } else if (top === 'kimono_top') {
    const robe = new THREE.Mesh(GEO.outfitTunic, mat1);
    robe.position.set(0, 0.31, 0);
    robe.scale.set(1.12, 0.92, 1.06);
    robe.castShadow = true;
    rig.outfitGroup.add(robe);

    const obi = new THREE.Mesh(GEO.outfitBelt, mat2);
    obi.position.set(0, 0.28, 0);
    obi.rotation.x = Math.PI / 2;
    obi.scale.set(1.12, 1.07, 1.75);
    rig.outfitGroup.add(obi);

    const obiKnot = new THREE.Mesh(GEO.outfitFlap, mat2);
    obiKnot.position.set(0, 0.29, -0.41);
    obiKnot.scale.set(0.58, 0.72, 1.1);
    rig.outfitGroup.add(obiKnot);

    const obiClasp = new THREE.Mesh(GEO.pom, goldMat);
    obiClasp.position.set(0, 0.28, 0.425);
    obiClasp.scale.set(0.8, 0.7, 0.45);
    rig.outfitGroup.add(obiClasp);

    for (const k of [-1, 1]) {
      const lapel = new THREE.Mesh(GEO.outfitStrap, whiteMat);
      lapel.position.set(k * 0.08, 0.43, 0.365);
      lapel.rotation.set(-0.2, 0, k * 0.56);
      lapel.scale.set(0.78, 0.78, 0.75);
      rig.outfitGroup.add(lapel);

      const cuff = new THREE.Mesh(GEO.outfitCuff, mat2);
      cuff.position.set(k * 0.39, 0.28, 0.02);
      cuff.rotation.x = Math.PI / 2;
      rig.outfitGroup.add(cuff);
    }
  } else if (top === 'overalls_bib') {
    const bib = new THREE.Mesh(GEO.outfitBib, mat1);
    bib.position.set(0, 0.39, 0.345);
    bib.rotation.x = -0.16;
    bib.scale.set(0.95, 0.9, 1.0);
    rig.outfitGroup.add(bib);

    const pocket = new THREE.Mesh(GEO.outfitBib, whiteMat);
    pocket.position.set(0, 0.35, 0.382);
    pocket.rotation.x = -0.16;
    pocket.scale.set(0.48, 0.38, 0.4);
    rig.outfitGroup.add(pocket);

    for (const k of [-1, 1]) {
      const btn = new THREE.Mesh(GEO.pom, goldMat);
      btn.position.set(k * 0.105, 0.48, 0.365);
      btn.scale.set(0.45, 0.45, 0.25);
      rig.outfitGroup.add(btn);

      const strapFront = new THREE.Mesh(GEO.outfitStrap, mat1);
      strapFront.position.set(k * 0.135, 0.49, 0.24);
      strapFront.rotation.x = 0.65;
      strapFront.scale.set(0.95, 0.92, 0.95);
      rig.outfitGroup.add(strapFront);

      const strapBack = new THREE.Mesh(GEO.outfitStrap, mat1);
      strapBack.position.set(k * 0.135, 0.43, -0.27);
      strapBack.rotation.x = -0.52;
      strapBack.scale.set(0.95, 1.0, 0.95);
      rig.outfitGroup.add(strapBack);
    }
  } else if (top === 'apron') {
    const skirt = new THREE.Mesh(GEO.outfitTunic, whiteMat);
    skirt.position.set(0, 0.26, 0.04);
    skirt.scale.set(1.06, 0.72, 1.06);
    skirt.castShadow = true;
    rig.outfitGroup.add(skirt);

    const bib = new THREE.Mesh(GEO.outfitBib, whiteMat);
    bib.position.set(0, 0.39, 0.355);
    bib.rotation.x = -0.15;
    bib.scale.set(0.9, 0.88, 1.0);
    rig.outfitGroup.add(bib);

    const halter = new THREE.Mesh(GEO.outfitCollar, mat2);
    halter.position.set(0, isSlime ? 0.44 : 0.53, 0.02);
    halter.rotation.x = Math.PI / 2;
    halter.scale.set(0.98, 0.96, 0.85);
    rig.outfitGroup.add(halter);

    const belt = new THREE.Mesh(GEO.outfitBelt, mat2);
    belt.position.set(0, 0.3, 0.01);
    belt.rotation.x = Math.PI / 2;
    belt.scale.set(1.09, 1.07, 1.05);
    rig.outfitGroup.add(belt);

    const pocket = new THREE.Mesh(GEO.outfitBib, mat2);
    pocket.position.set(0, 0.24, 0.4);
    pocket.scale.set(0.55, 0.42, 0.45);
    rig.outfitGroup.add(pocket);

    const badge = new THREE.Mesh(GEO.pom, goldMat);
    badge.position.set(0, 0.43, 0.39);
    badge.scale.set(0.55, 0.55, 0.3);
    rig.outfitGroup.add(badge);
  } else if (top === 'parka') {
    const coat = new THREE.Mesh(GEO.outfitTunic, mat1);
    coat.position.set(0, 0.31, 0);
    coat.scale.set(1.14, 0.96, 1.08);
    coat.castShadow = true;
    rig.outfitGroup.add(coat);

    const furCollar = new THREE.Mesh(GEO.scarfTorus, whiteMat);
    furCollar.position.set(0, isSlime ? 0.45 : 0.52, -0.01);
    furCollar.rotation.x = Math.PI / 2;
    furCollar.scale.set(1.14, 1.08, 1.12);
    rig.outfitGroup.add(furCollar);

    const furHem = new THREE.Mesh(GEO.outfitBelt, whiteMat);
    furHem.position.set(0, 0.14, 0);
    furHem.rotation.x = Math.PI / 2;
    furHem.scale.set(1.13, 1.08, 1.35);
    rig.outfitGroup.add(furHem);

    const zipper = new THREE.Mesh(GEO.outfitStrap, goldMat);
    zipper.position.set(0, 0.32, 0.395);
    zipper.scale.set(0.35, 1.15, 0.55);
    rig.outfitGroup.add(zipper);

    for (const k of [-1, 1]) {
      const cuff = new THREE.Mesh(GEO.outfitCuff, whiteMat);
      cuff.position.set(k * 0.39, 0.27, 0.02);
      cuff.rotation.x = Math.PI / 2;
      rig.outfitGroup.add(cuff);
    }
  }

  // ==================== 3. OUTERWEAR / NECK / BACK LAYERS ====================
  if (layer === 'scarf') {
    const scarfMat = top !== 'none' ? mat2 : mat1;
    const scarf = new THREE.Mesh(GEO.scarfTorus, scarfMat);
    scarf.position.set(0, isSlime ? 0.44 : 0.56, 0);
    scarf.rotation.x = Math.PI / 2;
    scarf.scale.set(1.06, 1.02, 1.08);
    rig.outfitGroup.add(scarf);

    const knot = new THREE.Mesh(GEO.pom, scarfMat);
    knot.position.set(0.05, isSlime ? 0.41 : 0.52, 0.34);
    knot.scale.set(1.3, 0.95, 1.1);
    rig.outfitGroup.add(knot);

    const tail = new THREE.Mesh(GEO.outfitStrap, scarfMat);
    tail.position.set(0.11, isSlime ? 0.27 : 0.36, 0.38);
    tail.rotation.set(-0.22, 0, 0.22);
    tail.scale.set(1.25, 0.98, 1.15);
    rig.outfitGroup.add(tail);
    rig.outfitTailMesh = tail;

    const fringe = new THREE.Mesh(GEO.outfitStrap, whiteMat);
    fringe.position.set(0.145, isSlime ? 0.14 : 0.22, 0.405);
    fringe.rotation.set(-0.22, 0, 0.22);
    fringe.scale.set(1.25, 0.18, 1.18);
    rig.outfitGroup.add(fringe);

    const shortTail = new THREE.Mesh(GEO.outfitStrap, scarfMat);
    shortTail.position.set(-0.02, isSlime ? 0.3 : 0.4, 0.375);
    shortTail.rotation.set(-0.2, 0, -0.18);
    shortTail.scale.set(1.05, 0.65, 1.0);
    rig.outfitGroup.add(shortTail);
  } else if (layer === 'bowtie') {
    const bowCol = top !== 'none' ? mat2 : mat1;
    for (const k of [-1, 1]) {
      const wing = new THREE.Mesh(GEO.earDisc, bowCol);
      wing.position.set(k * 0.08, isSlime ? 0.39 : 0.49, 0.38);
      wing.rotation.z = k * 0.22;
      wing.scale.set(0.68, 0.45, 0.32);
      rig.outfitGroup.add(wing);
    }
    const knot = new THREE.Mesh(GEO.pom, goldMat);
    knot.position.set(0, isSlime ? 0.39 : 0.49, 0.395);
    knot.scale.setScalar(0.5);
    rig.outfitGroup.add(knot);
  } else if (layer === 'necktie') {
    const knot = new THREE.Mesh(GEO.pom, mat2);
    knot.position.set(0, isSlime ? 0.41 : 0.5, 0.375);
    knot.scale.set(0.62, 0.55, 0.45);
    rig.outfitGroup.add(knot);

    const blade = new THREE.Mesh(GEO.tieBlade, mat2);
    blade.position.set(0, isSlime ? 0.29 : 0.38, 0.39);
    blade.rotation.set(-0.18, 0, Math.PI);
    blade.scale.set(1.1, 1.0, 0.5);
    rig.outfitGroup.add(blade);
  } else if (layer === 'bell_collar') {
    const colMat = top !== 'none' ? mat2 : mat1;
    const band = new THREE.Mesh(GEO.outfitCollar, colMat);
    band.position.set(0, isSlime ? 0.45 : 0.55, 0);
    band.rotation.x = Math.PI / 2;
    band.scale.set(1.04, 1.0, 0.72);
    rig.outfitGroup.add(band);

    const bell = new THREE.Mesh(GEO.pom, goldMat);
    bell.position.set(0, isSlime ? 0.4 : 0.49, 0.36);
    bell.scale.setScalar(0.88);
    rig.outfitGroup.add(bell);
  } else if (layer === 'cape' || layer === 'royal_cape' || layer === 'star_cloak') {
    const isRoyal = layer === 'royal_cape';
    const isStar = layer === 'star_cloak';
    const capeMat = top !== 'none' ? mat2 : mat1;
    const cape = new THREE.Mesh(GEO.outfitCape, capeMat);
    cape.position.set(0, 0.31, -0.35);
    cape.rotation.x = 0.32;
    cape.scale.set(isRoyal || isStar ? 1.18 : 1.06, isRoyal || isStar ? 1.14 : 1.0, 0.28);
    cape.castShadow = true;
    rig.outfitGroup.add(cape);
    rig.outfitCapeMesh = cape;

    const mantle = new THREE.Mesh(GEO.outfitCollar, isRoyal ? whiteMat : isStar ? goldMat : capeMat);
    mantle.position.set(0, isSlime ? 0.45 : 0.54, -0.02);
    mantle.rotation.x = Math.PI / 2 + 0.12;
    mantle.scale.set(1.18, 1.04, 0.92);
    rig.outfitGroup.add(mantle);

    if (isStar) {
      for (const [sx, sy, sz] of [[-0.14, 0.34, -0.45], [0.15, 0.25, -0.47], [0, 0.19, -0.49]]) {
        const star = new THREE.Mesh(GEO.spotDisc, goldMat);
        star.position.set(sx, sy, sz);
        star.scale.setScalar(0.62);
        rig.outfitGroup.add(star);
      }
    }

    const chestCord = new THREE.Mesh(GEO.outfitStrap, goldMat);
    chestCord.position.set(0, isSlime ? 0.43 : 0.51, 0.31);
    chestCord.rotation.z = Math.PI / 2;
    chestCord.scale.set(0.45, 1.15, 0.55);
    rig.outfitGroup.add(chestCord);

    for (const k of [-1, 1]) {
      const clasp = new THREE.Mesh(GEO.pom, goldMat);
      clasp.position.set(k * 0.16, isSlime ? 0.44 : 0.52, 0.28);
      clasp.scale.setScalar(0.75);
      rig.outfitGroup.add(clasp);
    }
  } else if (layer === 'backpack') {
    const packMat = top !== 'none' ? mat3 : mat1;
    const pack = new THREE.Mesh(GEO.packBox, packMat);
    pack.position.set(0, 0.36, -0.37);
    pack.scale.set(1.12, 1.06, 1.08);
    pack.castShadow = true;
    rig.outfitGroup.add(pack);

    const roll = new THREE.Mesh(GEO.outfitRoll, whiteMat);
    roll.position.set(0, 0.56, -0.37);
    roll.rotation.z = Math.PI / 2;
    rig.outfitGroup.add(roll);

    const buckle = new THREE.Mesh(GEO.pom, goldMat);
    buckle.position.set(0, 0.38, -0.49);
    buckle.scale.set(0.75, 0.75, 0.4);
    rig.outfitGroup.add(buckle);

    for (const k of [-1, 1]) {
      const frontStrap = new THREE.Mesh(GEO.outfitStrap, packMat);
      frontStrap.position.set(k * 0.175, 0.42, 0.285);
      frontStrap.rotation.set(0.32, 0, -k * 0.12);
      frontStrap.scale.set(0.85, 1.05, 0.85);
      rig.outfitGroup.add(frontStrap);
    }
  } else if (layer === 'back_bow') {
    const bowMat = mat2;
    const center = new THREE.Mesh(GEO.pom, bowMat);
    center.position.set(0, 0.3, -0.38);
    center.scale.set(0.85, 0.85, 0.65);
    rig.outfitGroup.add(center);

    for (const k of [-1, 1]) {
      const wing = new THREE.Mesh(GEO.earDisc, bowMat);
      wing.position.set(k * 0.13, 0.32, -0.4);
      wing.rotation.z = k * 0.25;
      wing.scale.set(1.05, 0.72, 0.4);
      rig.outfitGroup.add(wing);

      const ribbon = new THREE.Mesh(GEO.outfitStrap, bowMat);
      ribbon.position.set(k * 0.08, 0.18, -0.41);
      ribbon.rotation.set(0.24, 0, -k * 0.28);
      ribbon.scale.set(0.65, 0.72, 0.4);
      rig.outfitGroup.add(ribbon);
    }
  } else if (layer === 'fairy_wings' || layer === 'angel_wings') {
    const isAngel = layer === 'angel_wings';
    const wingL = new THREE.Group();
    wingL.position.set(-0.18, 0.45, -0.32);
    const wingR = new THREE.Group();
    wingR.position.set(0.18, 0.45, -0.32);
    for (const [wg, k] of [[wingL, -1], [wingR, 1]] as const) {
      const upper = new THREE.Mesh(GEO.wingPetal, isAngel ? whiteMat : glassMat);
      upper.position.set(k * (isAngel ? 0.22 : 0.18), isAngel ? 0.12 : 0.1, -0.06);
      upper.rotation.set(0.2, k * 0.35, -k * (isAngel ? 0.42 : 0.55));
      upper.scale.set(isAngel ? 1.55 : 1.35, isAngel ? 0.98 : 0.9, 0.18);
      upper.castShadow = true;
      wg.add(upper);

      const lower = new THREE.Mesh(GEO.wingPetal, isAngel ? creamMat : mat2);
      lower.position.set(k * (isAngel ? 0.16 : 0.14), -0.08, -0.06);
      lower.rotation.set(0.15, k * 0.3, k * 0.45);
      lower.scale.set(isAngel ? 1.1 : 0.95, 0.68, 0.16);
      wg.add(lower);
      rig.outfitGroup.add(wg);
    }
    rig.outfitWingL = wingL;
    rig.outfitWingR = wingR;
  } else if (layer === 'sash') {
    const belt = new THREE.Mesh(GEO.outfitBelt, mat2);
    belt.position.set(0, 0.28, 0);
    belt.rotation.x = Math.PI / 2;
    belt.scale.set(1.12, 1.07, 1.45);
    rig.outfitGroup.add(belt);

    const clasp = new THREE.Mesh(GEO.pom, goldMat);
    clasp.position.set(0, 0.28, 0.42);
    clasp.scale.set(0.7, 0.65, 0.38);
    rig.outfitGroup.add(clasp);
  }

  // ==================== 4. FOOTWEAR (Sneakers, Boots, Mary Janes, Loafers, Slippers) ====================
  if (!isSlime && shoes !== 'none') {
    for (const [shoeGrp, _k] of [[rig.leftShoeGroup, -1], [rig.rightShoeGroup, 1]] as const) {
      const upperMat = shoes === 'boots' ? mat3 : shoes === 'loafers' ? darkMat : shoes === 'sneakers' ? mat1 : mat2;
      const upper = new THREE.Mesh(GEO.shoeUpper, upperMat);
      upper.position.set(0, 0.008, 0.01);
      upper.scale.set(1.02, 0.72, 1.32);
      shoeGrp.add(upper);

      const sole = new THREE.Mesh(GEO.shoeSole, shoes === 'sneakers' ? whiteMat : darkMat);
      sole.position.set(0, -0.068, 0.01);
      sole.scale.set(1.04, 1.0, 1.36);
      shoeGrp.add(sole);

      if (shoes === 'sneakers') {
        const toe = new THREE.Mesh(GEO.shoeUpper, whiteMat);
        toe.position.set(0, 0.005, 0.1);
        toe.scale.set(0.75, 0.56, 0.72);
        shoeGrp.add(toe);
      } else if (shoes === 'boots') {
        const cuff = new THREE.Mesh(GEO.shoeCuff, mat3);
        cuff.position.set(0, 0.095, -0.01);
        shoeGrp.add(cuff);
      } else if (shoes === 'mary_janes') {
        const strap = new THREE.Mesh(GEO.shoeCuff, mat1);
        strap.position.set(0, 0.055, 0.02);
        strap.scale.set(1.04, 0.26, 0.95);
        shoeGrp.add(strap);

        const buckle = new THREE.Mesh(GEO.pom, goldMat);
        buckle.position.set(0, 0.075, 0.09);
        buckle.scale.setScalar(0.32);
        shoeGrp.add(buckle);
      } else if (shoes === 'loafers') {
        const buckle = new THREE.Mesh(GEO.outfitBib, goldMat);
        buckle.position.set(0, 0.065, 0.07);
        buckle.scale.set(0.36, 0.14, 0.25);
        shoeGrp.add(buckle);
      } else if (shoes === 'slippers') {
        const pom = new THREE.Mesh(GEO.pom, whiteMat);
        pom.position.set(0, 0.075, 0.11);
        pom.scale.setScalar(0.65);
        shoeGrp.add(pom);
      }
    }
  }
}

export function updateMochiRig(rig: MochiRig, opts: MochiActorOptions): void {
  const {
    look,
    time,
    isMoving,
    isBlinking,
    facingYaw,
    headYaw = 0,
    headPitch = 0,
    scale = 1,
    opacity = 1,
    highlighted = false,
    isGreeting = false,
    bobOffset = 0,
    isSwimming = false,
    isSprinting = false,
    jumpZ = 0,
    jumpVy = 0,
    weatherBehavior = 'idle',
    emoteAnim = 'idle',
  } = opts;
  const sp = look.sp || 'cat';
  const isSlime = sp === 'slime';
  const rawBloom = look.hollowColorBloom ?? look.hollowBloom;
  const bloom = rawBloom !== undefined ? rawBloom : look.isHollow ? 0 : 1;

  const resolvedOut = resolveOutfitParts(look);
  const patVal = look.pat || 0;

  // Resolve base + hollow interpolated colors with zero allocations
  const colHex = look.col || '#ffb3c7';
  resolveCachedColor(colHex, '#ffb3c7', _baseCol);
  if (look.c2) {
    resolveCachedColor(look.c2, '#ffeef4', _c2Col);
  } else {
    _c2Col.copy(_baseCol).lerp(STATIC_MAT.white.color, 0.55);
  }
  resolveCachedColor(look.ac, '#ff7aa8', _acCol);
  resolveCachedColor(look.hatCol || look.ac, '#ff7aa8', _hatCol);
  if (look.patCol) {
    resolveCachedColor(look.patCol, '#ffffff', _patCol);
  } else if (patVal === 6) {
    _patCol.setHex(0xffffff);
  } else if (patVal === 7) {
    _patCol.setHex(0xffd23f);
  } else if (look.dye2) {
    resolveCachedColor(look.dye2, '#d984a0', _patCol);
  } else {
    _patCol.copy(_baseCol).multiplyScalar(0.72);
  }
  const defaultNoseHex =
    sp === 'cat' || sp === 'bunny' ? '#ff7aa8' : sp === 'bear' || sp === 'fox' || sp === 'otter' || sp === 'deer' ? '#2a1d32' : '#ff7aa8';
  resolveCachedColor(look.noseCol, defaultNoseHex, _noseCol);

  resolveCachedColor(resolvedOut.col1, '#ff7aa8', _outCol1);
  resolveCachedColor(resolvedOut.col2, '#ffffff', _outCol2);
  if (resolvedOut.col3) {
    resolveCachedColor(resolvedOut.col3, '#5c4338', _outCol3);
  } else {
    _outCol3.copy(_outCol2).multiplyScalar(0.58);
  }
  resolveCachedColor(resolveHairColor(look.hairCol, colHex), '#6e473b', _hairCol);

  if (bloom < 1) {
    _baseCol.lerp(_hollowColA, 1 - bloom);
    _c2Col.lerp(_hollowColB, 1 - bloom);
    _acCol.lerp(_hollowColC, 1 - bloom);
    _hatCol.lerp(_hollowColC, 1 - bloom);
    _patCol.lerp(_hollowColC, 1 - bloom);
    _noseCol.lerp(_hollowColC, 1 - bloom);
    _outCol1.lerp(_hollowColC, 1 - bloom);
    _outCol2.lerp(_hollowColB, 1 - bloom);
    _outCol3.lerp(_hollowColA, 1 - bloom);
    _hairCol.lerp(_hollowColA, 1 - bloom);
  } else {
    boostPlushColor(_baseCol, 0.16, -0.025);
    boostPlushColor(_c2Col, 0.12, -0.015);
    boostPlushColor(_acCol, 0.2, -0.03);
    boostPlushColor(_hatCol, 0.2, -0.03);
    boostPlushColor(_patCol, 0.16, -0.02);
    boostPlushColor(_outCol1, 0.16, -0.02);
    boostPlushColor(_outCol2, 0.14, -0.015);
    if (resolvedOut.col3) boostPlushColor(_outCol3, 0.14, -0.02);
    boostPlushColor(_hairCol, 0.14, -0.01);
  }

  rig.mainMat.color.copy(_baseCol);
  rig.bellyMat.color.copy(_c2Col);
  rig.accentMat.color.copy(_acCol);
  rig.hatMat.color.copy(_hatCol);
  rig.hatShadeMat.color.copy(_hatCol).multiplyScalar(0.76);
  rig.patMat.color.copy(_patCol);
  rig.noseMat.color.copy(_noseCol);
  rig.outfitSoftMat.color.copy(_acCol).lerp(STATIC_MAT.white.color, 0.22);
  rig.outfitMat1.color.copy(_outCol1);
  rig.outfitMat2.color.copy(_outCol2);
  rig.outfitMat3.color.copy(_outCol3);
  rig.hairMat.color.copy(_hairCol);
  rig.hairShadeMat.color.copy(_hairCol).multiplyScalar(0.8);
  rig.darkMat.color.copy(_baseCol).multiplyScalar(0.74);
  rig.shadowMat.opacity = 0.54;

  // Coat finish PBR material properties
  const coatFinish = look.coatFinish || 'plush';
  if (isSlime) {
    rig.mainMat.roughness = 0.14;
    rig.mainMat.sheen = 0.2;
    rig.mainMat.clearcoat = 0.75;
    rig.mainMat.clearcoatRoughness = 0.12;
  } else if (coatFinish === 'velvet') {
    rig.mainMat.roughness = 0.74;
    rig.mainMat.sheen = 0.78;
    rig.mainMat.sheenRoughness = 0.45;
    rig.mainMat.clearcoat = 0;
  } else if (coatFinish === 'pearl') {
    rig.mainMat.roughness = 0.24;
    rig.mainMat.sheen = 0.45;
    rig.mainMat.sheenRoughness = 0.35;
    rig.mainMat.clearcoat = 0.65;
    rig.mainMat.clearcoatRoughness = 0.18;
  } else if (coatFinish === 'silk') {
    rig.mainMat.roughness = 0.28;
    rig.mainMat.sheen = 0.56;
    rig.mainMat.sheenRoughness = 0.38;
    rig.mainMat.clearcoat = 0.3;
    rig.mainMat.clearcoatRoughness = 0.25;
  } else {
    rig.mainMat.roughness = 0.48;
    rig.mainMat.sheen = 0.32;
    rig.mainMat.sheenRoughness = 0.65;
    rig.mainMat.clearcoat = 0;
  }
  _sheenCol.copy(_baseCol).lerp(STATIC_MAT.white.color, 0.72);
  rig.mainMat.sheenColor.copy(_sheenCol);

  const isTranslucent = opacity < 0.99 || isSlime;
  const targetOpacity = isSlime ? Math.min(opacity, 0.84) : opacity;
  if (rig.mainMat.transparent !== isTranslucent) {
    rig.mainMat.transparent = isTranslucent;
    rig.mainMat.needsUpdate = true;
  }
  rig.mainMat.opacity = targetOpacity;
  const subTrans = opacity < 0.99;
  for (const mat of [
    rig.bellyMat,
    rig.accentMat,
    rig.hatMat,
    rig.hatShadeMat,
    rig.patMat,
    rig.noseMat,
    rig.outfitSoftMat,
    rig.outfitMat1,
    rig.outfitMat2,
    rig.outfitMat3,
    rig.hairMat,
    rig.hairShadeMat,
  ]) {
    if (mat.transparent !== subTrans) {
      mat.transparent = subTrans;
      mat.needsUpdate = true;
    }
    mat.opacity = opacity;
  }

  // Rebuild geometry sub-groups only when species or pattern changes
  const specKey = `${sp}|${patVal}`;
  const hairId = look.hair || 'none';
  const hatKey = look.hat || 'none';
  const hasHairCrown = hairId !== 'none';
  const isFullDomeHat =
    hatKey === 'beanie' ||
    hatKey === 'lantern_cap' ||
    hatKey === 'aviator' ||
    hatKey === 'mushroom' ||
    hatKey === 'nightcap' ||
    hatKey === 'straw' ||
    hatKey === 'wizard' ||
    hatKey === 'witch_moon' ||
    hatKey === 'froggy_hood' ||
    hatKey === 'pirate' ||
    hatKey === 'chef';

  const syncHatPlacement = () => {
    const hairTopLift = hasHairCrown
      ? isFullDomeHat
        ? 0.015
        : hairId === 'pomp' || hairId === 'fluffy_afro' || hairId === 'quiff'
        ? 0.055
        : hatKey === 'boba_hat' || hatKey === 'tea_saucer' || hatKey === 'cat_phones' || hatKey === 'bunny_band'
        ? 0.042
        : 0.028
      : 0;
    rig.hatGroup.position.y = (isSlime ? 0.33 : 0.4) + hairTopLift;
    const hatScale = hasHairCrown && isFullDomeHat ? (hairId === 'fluffy_afro' ? 1.07 : 1.03) : 1.0;
    rig.hatGroup.scale.setScalar(hatScale);
  };

  if (rig.lastSpecKey !== specKey) {
    rig.lastSpecKey = specKey;
    rebuildSpeciesParts(rig, sp, patVal);
    rig.leftFoot.visible = !isSlime;
    rig.rightFoot.visible = !isSlime;
    rig.leftShoeGroup.visible = !isSlime;
    rig.rightShoeGroup.visible = !isSlime;
    rig.leftArm.visible = !isSlime;
    rig.rightArm.visible = !isSlime;
    rig.headMesh.visible = !isSlime;
    rig.bellyMesh.visible = !isSlime;
    rig.torsoMesh.position.y = isSlime ? 0.38 : 0.36;
    rig.headGroup.position.y = isSlime ? 0.44 : 0.82;
    syncHatPlacement();
  }

  const hairKey = `${hairId}|${sp}|${hatKey}`;
  if (rig.lastHairKey !== hairKey) {
    rig.lastHairKey = hairKey;
    rebuildHairParts(rig, hairId, sp, hatKey);
    syncHatPlacement();
  }

  const hatFullKey = `${hatKey}|${hasHairCrown ? 1 : 0}`;
  if (rig.lastHatKey !== hatFullKey) {
    rig.lastHatKey = hatFullKey;
    rebuildHatParts(rig, hatKey, hairId);
    syncHatPlacement();
  }

  const outKey = `${resolvedOut.top}|${resolvedOut.bottom}|${resolvedOut.layer}|${resolvedOut.shoes}|${isSlime ? 1 : 0}`;
  if (rig.lastOutKey !== outKey) {
    rig.lastOutKey = outKey;
    rebuildOutfitParts(rig, resolvedOut.top, resolvedOut.bottom, resolvedOut.layer, resolvedOut.shoes, isSlime);
  }

  // Face CanvasTexture
  const bloomQ = Math.round(bloom * 4);
  const eyesVal = look.eyes || 0;
  const mouthVal = look.mouth || 0;
  const faceVal = look.face || 0;
  const cheeksVal = look.cheeks ?? 0;
  const faceKey = `${sp}|${colHex}|${patVal}|${look.patCol || look.dye2 || ''}|${eyesVal}|${look.eyeCol || ''}|${mouthVal}|${look.noseCol || ''}|${faceVal}|${cheeksVal}|${isBlinking ? 1 : 0}|${bloomQ}`;
  if (rig.lastFaceKey !== faceKey) {
    rig.lastFaceKey = faceKey;
    rig.faceMat.map = getOrCreateFaceTexture(look, isBlinking);
    rig.faceMat.needsUpdate = true;
  }

  // Update 3D Frog blinking eyelids
  if (rig.frogLids) {
    for (let i = 0; i < rig.frogLids.length; i++) {
      rig.frogLids[i].visible = isBlinking;
    }
  }

  // Proportion Sliders (earScale, tailScale, chonk) & Size modifier
  const chonk = THREE.MathUtils.clamp(look.chonk ?? 1, 0.85, 1.18);
  const earSc = THREE.MathUtils.clamp(look.earScale ?? 1, 0.8, 1.35);
  const tailSc = THREE.MathUtils.clamp(look.tailScale ?? 1, 0.7, 1.45);
  rig.earGroup.scale.setScalar(earSc);
  rig.tailGroup.scale.setScalar(tailSc);
  rig.torsoMesh.scale.set(
    rig.torsoBaseScale[0] * chonk,
    rig.torsoBaseScale[1],
    rig.torsoBaseScale[2] * chonk
  );
  rig.bellyMesh.scale.set(
    rig.bellyBaseScale[0] * chonk,
    rig.bellyBaseScale[1],
    rig.bellyBaseScale[2] * chonk
  );
  const outfitChonk = (isSlime ? 1.18 : 1.0) * (0.94 + chonk * 0.06);
  rig.outfitGroup.scale.set(outfitChonk, isSlime ? 0.96 : 1.0, (isSlime ? 1.24 : 1.0) * (0.94 + chonk * 0.06));

  let sizeMul = scale;
  if (look.size === 'tiny') sizeMul *= 0.84;
  else if (look.size === 'small') sizeMul *= 0.92;
  else if (look.size === 'plump') sizeMul *= 1.14;
  rig.root.scale.setScalar(sizeMul);

  // Air / Swim / Weather / Emote / Land Pose & Expressive Animation
  const isAirborne = jumpZ > 0.03;
  const swimFreq = isSprinting ? 14.5 : 9.2;
  const swimBob = Math.sin(time * (isMoving ? swimFreq * 0.5 : 3.2) + bobOffset) * 0.045;
  const isDancing = !isAirborne && !isSwimming && (weatherBehavior === 'dancing' || emoteAnim === 'dance');
  const isTwirling = !isAirborne && !isSwimming && emoteAnim === 'twirl';
  const isCheering = !isAirborne && !isSwimming && emoteAnim === 'cheer';
  const isWaving = isGreeting || emoteAnim === 'wave';
  const isStargazing = !isAirborne && !isSwimming && weatherBehavior === 'stargazing';
  const isShivering = !isAirborne && !isSwimming && weatherBehavior === 'shivering';
  const isSheltering = !isAirborne && !isSwimming && weatherBehavior === 'sheltering';

  let hop = 0;
  if (isAirborne) {
    hop = 0;
  } else if (isSwimming) {
    hop = swimBob;
  } else if (isMoving || emoteAnim === 'walk') {
    hop = Math.abs(Math.sin(time * (isSprinting ? 15 : 11) + bobOffset)) * (isSprinting ? 0.17 : 0.14);
  } else if (isDancing || isCheering) {
    hop = Math.abs(Math.sin(time * 6.8 + bobOffset)) * (isCheering ? 0.2 : 0.16);
  } else if (isTwirling) {
    hop = Math.abs(Math.sin(time * 5.2 + bobOffset)) * 0.1;
  } else if (isStargazing) {
    hop = 0.16 + Math.sin(time * 2.5 + bobOffset) * 0.09;
  } else {
    hop = Math.max(0, Math.sin(time * 3.1 + bobOffset)) * 0.05;
  }

  const airStretch = isAirborne ? THREE.MathUtils.clamp(jumpVy * 0.032, -0.1, 0.16) : 0;
  const squash = isAirborne
    ? -airStretch
    : isSwimming
    ? Math.sin(time * (isMoving ? swimFreq : 3.2) + bobOffset) * 0.035
    : isMoving || emoteAnim === 'walk'
    ? Math.sin(time * (isSprinting ? 28 : 22) + bobOffset) * 0.055
    : isDancing || isCheering
    ? Math.sin(time * 13.6 + bobOffset) * 0.06
    : isSheltering
    ? 0.05 + Math.sin(time * 4 + bobOffset) * 0.015
    : Math.sin(time * 3.1 + bobOffset) * 0.028;

  const shiverX = isShivering ? Math.sin(time * 26 + bobOffset) * 0.025 : 0;
  rig.bodyPivot.position.set(shiverX, jumpZ + hop, 0);
  rig.bodyPivot.scale.set(1 + squash, 1 - squash, 1 + squash);
  rig.bodyPivot.rotation.y =
    facingYaw +
    (isTwirling ? time * 4.2 : isDancing && !isMoving ? Math.sin(time * 3.4 + bobOffset) * 0.28 : 0);
  rig.headGroup.rotation.y =
    headYaw + (!isMoving && !isWaving && !isTwirling ? Math.sin(time * 1.45 + bobOffset) * 0.14 : 0);

  if (isAirborne) {
    rig.bodyPivot.rotation.x = isSwimming
      ? THREE.MathUtils.clamp(-jumpVy * 0.075, -0.45, 0.52)
      : THREE.MathUtils.clamp(-jumpVy * 0.032, -0.18, 0.18);
    rig.bodyPivot.rotation.z = 0;
    rig.headGroup.rotation.x = -0.12;
    rig.headGroup.rotation.z = 0;
    rig.leftFoot.position.set(-0.14, 0.19, -0.05);
    rig.rightFoot.position.set(0.14, 0.16, 0.07);
    rig.leftArm.rotation.set(-0.55, 0, -0.62);
    rig.rightArm.rotation.set(-0.55, 0, 0.62);
  } else if (isSwimming) {
    const paddle = isMoving ? Math.sin(time * swimFreq) : Math.sin(time * 4.2 + bobOffset) * 0.45;
    rig.bodyPivot.rotation.x = isMoving ? (isSprinting ? 0.68 : 0.52) : 0.16;
    rig.bodyPivot.rotation.z = isMoving ? Math.sin(time * swimFreq * 0.5) * 0.15 : Math.sin(time * 2.4 + bobOffset) * 0.05;
    rig.headGroup.rotation.x = isMoving ? (isSprinting ? -0.48 : -0.36) : -0.12;
    rig.headGroup.rotation.z = 0;

    const kick = isMoving ? Math.sin(time * swimFreq * 1.45) * 0.09 : Math.sin(time * 4.2 + bobOffset) * 0.03;
    rig.leftFoot.position.set(-0.14, 0.14 + kick, -0.14);
    rig.rightFoot.position.set(0.14, 0.14 - kick, -0.14);

    if (isMoving) {
      rig.leftArm.rotation.set(-0.55 + paddle * 1.1, 0, -0.46);
      rig.rightArm.rotation.set(-0.55 - paddle * 1.1, 0, 0.46);
    } else {
      rig.leftArm.rotation.set(-0.25, 0, -0.58 + paddle * 0.25);
      rig.rightArm.rotation.set(-0.25, 0, 0.58 - paddle * 0.25);
    }
  } else {
    const walkAnim = isMoving || emoteAnim === 'walk';
    const walkFreq = isSprinting ? 16 : 12;
    const stride = walkAnim ? Math.sin(time * walkFreq + bobOffset) : 0;
    rig.bodyPivot.rotation.x = isSheltering ? 0.12 : isStargazing ? -0.08 : walkAnim ? (isSprinting ? 0.11 : 0.06) : 0;
    rig.bodyPivot.rotation.z = walkAnim
      ? Math.sin(time * walkFreq * 0.5 + bobOffset) * 0.075
      : isDancing
      ? Math.sin(time * 3.4 + bobOffset) * 0.14
      : Math.sin(time * 1.8 + bobOffset) * 0.04;
    rig.headGroup.rotation.x =
      headPitch + (isStargazing ? -0.26 : isSheltering ? 0.14 : Math.sin(time * 2.4 + bobOffset) * 0.04);
    rig.headGroup.rotation.z = isDancing
      ? Math.sin(time * 3.4 + bobOffset) * 0.12
      : Math.sin(time * 1.6 + bobOffset * 1.7) * 0.07;

    rig.leftFoot.position.set(-0.14, 0.1 + Math.max(0, stride) * 0.075, 0.04 + stride * 0.11);
    rig.rightFoot.position.set(0.14, 0.1 + Math.max(0, -stride) * 0.075, 0.04 - stride * 0.11);

    if (isWaving && !isMoving) {
      rig.leftArm.rotation.set(-0.15, 0, 0.45);
      rig.rightArm.rotation.set(-0.35, 0, -2.1 + Math.sin(time * 10 + bobOffset) * 0.42);
    } else if ((isDancing || isCheering) && !isMoving) {
      const cheer = Math.sin(time * 6.8 + bobOffset);
      rig.leftArm.rotation.set(-0.3, 0, (isCheering ? 1.55 : 0.95) + cheer * 0.45);
      rig.rightArm.rotation.set(-0.3, 0, (isCheering ? -1.55 : -0.95) - cheer * 0.45);
    } else if (isTwirling) {
      rig.leftArm.rotation.set(-0.2, 0, 1.05);
      rig.rightArm.rotation.set(-0.2, 0, -1.05);
    } else if (isShivering || isSheltering) {
      const hugTuck = isShivering ? Math.sin(time * 22 + bobOffset) * 0.06 : 0;
      rig.leftArm.rotation.set(0.45, 0.25, 0.12 + hugTuck);
      rig.rightArm.rotation.set(0.45, -0.25, -0.12 - hugTuck);
    } else {
      const idleSwing = Math.sin(time * 2.6 + bobOffset) * 0.12;
      const baseSpread = sp === 'penguin' ? 0.58 : 0.42;
      rig.leftArm.rotation.set(-stride * 0.52 + idleSwing, 0, baseSpread);
      rig.rightArm.rotation.set(stride * 0.52 - idleSwing, 0, -baseSpread);
    }
  }

  // Tail & Wing natural flutter animation
  rig.tailGroup.rotation.y = Math.sin(time * (isSwimming ? 7 : isMoving || isDancing ? 5.2 : 3.6) + bobOffset) * 0.38;
  rig.tailGroup.rotation.x = Math.cos(time * 2.8 + bobOffset) * 0.08;
  if (rig.wingL && rig.wingR) {
    const flapSpeed = isAirborne || isMoving ? 12 : isDancing ? 8 : 3.2;
    const flapAmp = isAirborne ? 0.45 : isMoving ? 0.28 : isDancing ? 0.24 : 0.14;
    const flap = Math.sin(time * flapSpeed + bobOffset) * flapAmp;
    rig.wingL.rotation.y = flap;
    rig.wingR.rotation.y = -flap;
  }

  if (rig.outfitCapeMesh) {
    rig.outfitCapeMesh.rotation.x =
      0.32 +
      (isAirborne
        ? 0.42
        : isSwimming
        ? 0.5
        : isMoving
        ? 0.24 + Math.sin(time * 10 + bobOffset) * 0.09
        : Math.sin(time * 2.8 + bobOffset) * 0.045);
  }
  if (rig.outfitTailMesh) {
    rig.outfitTailMesh.rotation.x =
      -0.22 - (isAirborne || isMoving ? 0.14 + Math.sin(time * 9 + bobOffset) * 0.06 : Math.sin(time * 3.2 + bobOffset) * 0.04);
  }
  if (rig.outfitWingL && rig.outfitWingR) {
    const fFlap = Math.sin(time * (isAirborne ? 16 : isMoving ? 11 : 4.2) + bobOffset) * (isAirborne ? 0.45 : 0.22);
    rig.outfitWingL.rotation.y = fFlap;
    rig.outfitWingR.rotation.y = -fFlap;
  }
  // Frame-rate independent second-order spring physics for hair
  if (
    rig.hairTailL ||
    rig.hairTailR ||
    rig.hairTailBack ||
    rig.hairSideL ||
    rig.hairSideR ||
    rig.hairBunL ||
    rig.hairBunR ||
    rig.hairCrest
  ) {
    const hs = rig.hairSpring;
    const rawDt =
      opts.dt !== undefined && Number.isFinite(opts.dt)
        ? opts.dt
        : hs.initialized
        ? time - hs.prevTime
        : 0.016;
    const stepDt = THREE.MathUtils.clamp(rawDt, 0, 0.05);
    const speedNorm =
      opts.moveSpeed !== undefined
        ? THREE.MathUtils.clamp(opts.moveSpeed, 0, 2.4)
        : isMoving
        ? isSprinting
          ? 1.55
          : 1.0
        : 0;
    const totalYaw = facingYaw + headYaw * 0.7;

    if (!hs.initialized || rawDt < -0.02 || rawDt > 0.5 || Math.abs(jumpZ - hs.prevJumpZ) > 0.85) {
      hs.pitch = THREE.MathUtils.clamp(speedNorm * 0.24, 0, 0.45);
      hs.pitchVel = 0;
      hs.roll = 0;
      hs.rollVel = 0;
      hs.bounce = 0;
      hs.bounceVel = 0;
      hs.initialized = true;
      hs.prevTime = time;
      hs.prevYaw = totalYaw;
      hs.prevJumpZ = jumpZ;
      hs.prevJumpVy = jumpVy;
      hs.prevHop = hop;
      hs.prevMoveSpeed = speedNorm;
      hs.lastHairKey = hairKey;
    } else {
      if (hs.lastHairKey !== hairKey) {
        hs.lastHairKey = hairKey;
        hs.pitchVel *= 0.25;
        hs.rollVel *= 0.25;
        hs.bounceVel *= 0.25;
      }

      // Compute head vertical & turning impulses across frame
      const hopVy = stepDt > 0.001 ? THREE.MathUtils.clamp((hop - hs.prevHop) / stepDt, -4.5, 4.5) : 0;
      const effVy = isAirborne ? THREE.MathUtils.clamp(jumpVy, -10, 8) : hopVy;
      const dVy = THREE.MathUtils.clamp(effVy - hs.prevJumpVy, -8, 12);
      const dSpeed = THREE.MathUtils.clamp(speedNorm - hs.prevMoveSpeed, -1.6, 1.6);
      let dYaw = ((totalYaw - hs.prevYaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      if (Math.abs(dYaw) > 1.2) dYaw = 0;

      // Inertial impulse kicks: upward head acceleration (jump takeoff & ground landing stop) dips hair down;
      // burst sprint accelerates head forward so hair kicks back; turning whips hair laterally.
      if (Math.abs(dVy) > 0.08) {
        hs.bounceVel -= dVy * 0.36;
        hs.pitchVel -= dVy * 0.28;
      }
      if (Math.abs(dSpeed) > 0.01) {
        hs.pitchVel += dSpeed * 1.15;
      }
      if (Math.abs(dYaw) > 0.001) {
        hs.rollVel += dYaw * 1.35;
      }

      // Aerodynamic & gravity equilibrium targets
      const fallFloat = isAirborne && jumpVy < 0 ? Math.min(0.85, -jumpVy * 0.13) : 0;
      const riseDrag = isAirborne && jumpVy > 0 ? Math.min(0.28, jumpVy * 0.045) : 0;
      const swimDrag = isSwimming ? (isMoving ? 0.44 : 0.22) : 0;
      const strideFlutter = isMoving ? Math.sin(time * (isSprinting ? 14 : 10) + bobOffset) * 0.045 : 0;
      const idleBreeze = !isMoving && !isAirborne ? Math.sin(time * 2.1 + bobOffset) * 0.028 : 0;

      const targetPitch = THREE.MathUtils.clamp(
        speedNorm * 0.26 + fallFloat - riseDrag + swimDrag + strideFlutter + idleBreeze,
        -0.16,
        0.86
      );
      const strideSway = isMoving
        ? Math.sin(time * (isSprinting ? 7.5 : 5.5) + bobOffset) * 0.075
        : Math.sin(time * 1.6 + bobOffset) * 0.025;
      const yawRate = stepDt > 0.001 ? THREE.MathUtils.clamp(dYaw / stepDt, -8, 8) : 0;
      const targetRoll = THREE.MathUtils.clamp(strideSway + yawRate * 0.038, -0.35, 0.35);
      const targetBounce = THREE.MathUtils.clamp(
        (isAirborne ? THREE.MathUtils.clamp(-jumpVy * 0.048, -0.22, 0.36) : -hop * 0.32) +
          (isSwimming ? Math.sin(time * 3.5 + bobOffset) * 0.04 : 0),
        -0.25,
        0.38
      );

      // Substep second-order spring integration for unconditional stability
      const subSteps = stepDt > 0.018 ? 3 : 2;
      const h = stepDt / subSteps;
      const pitchK = isSwimming ? 58 : 138;
      const pitchC = isSwimming ? 11.2 : 13.6;
      const rollK = isSwimming ? 54 : 112;
      const rollC = isSwimming ? 10.6 : 12.2;
      const bounceK = isSwimming ? 75 : 185;
      const bounceC = isSwimming ? 12.0 : 14.8;

      for (let s = 0; s < subSteps; s++) {
        const pitchAcc = (targetPitch - hs.pitch) * pitchK - hs.pitchVel * pitchC;
        hs.pitchVel += pitchAcc * h;
        hs.pitch += hs.pitchVel * h;

        const rollAcc = (targetRoll - hs.roll) * rollK - hs.rollVel * rollC;
        hs.rollVel += rollAcc * h;
        hs.roll += hs.rollVel * h;

        const bounceAcc = (targetBounce - hs.bounce) * bounceK - hs.bounceVel * bounceC;
        hs.bounceVel += bounceAcc * h;
        hs.bounce += hs.bounceVel * h;
      }

      hs.pitch = THREE.MathUtils.clamp(hs.pitch, -0.26, 1.02);
      hs.roll = THREE.MathUtils.clamp(hs.roll, -0.48, 0.48);
      hs.bounce = THREE.MathUtils.clamp(hs.bounce, -0.34, 0.46);
      hs.pitchVel = THREE.MathUtils.clamp(hs.pitchVel, -8, 8);
      hs.rollVel = THREE.MathUtils.clamp(hs.rollVel, -7, 7);
      hs.bounceVel = THREE.MathUtils.clamp(hs.bounceVel, -7, 7);

      hs.prevTime = time;
      hs.prevYaw = totalYaw;
      hs.prevJumpZ = jumpZ;
      hs.prevJumpVy = effVy;
      hs.prevHop = hop;
      hs.prevMoveSpeed = speedNorm;
    }

    const backAmp = rig.hairBackAmp;
    const tailAmp = rig.hairTailAmp;

    if (rig.hairTailBack) {
      rig.hairTailBack.rotation.x = THREE.MathUtils.clamp(
        (hs.pitch * 1.02 + hs.bounce * 0.72) * backAmp,
        -0.16,
        0.92
      );
      rig.hairTailBack.rotation.z = THREE.MathUtils.clamp(hs.roll * 0.85 * backAmp, -0.42, 0.42);
    }

    if (rig.hairTailL && rig.hairTailR) {
      const flare = THREE.MathUtils.clamp(
        (hs.pitch * 0.46 + hs.bounce * 0.62) * tailAmp,
        -0.08,
        0.58
      );
      const tailLagX = THREE.MathUtils.clamp((hs.pitch * 0.85 + hs.bounce * 0.32) * tailAmp, -0.14, 0.74);
      const rollBias = hs.roll * 0.72 * tailAmp;
      rig.hairTailL.rotation.x = tailLagX;
      rig.hairTailR.rotation.x = tailLagX;
      rig.hairTailL.rotation.z = THREE.MathUtils.clamp(-flare + rollBias, -0.68, 0.35);
      rig.hairTailR.rotation.z = THREE.MathUtils.clamp(flare + rollBias, -0.35, 0.68);
    }

    if (rig.hairSideL || rig.hairSideR) {
      const sideBack = THREE.MathUtils.clamp(hs.pitch * 0.42 + hs.bounce * 0.22, -0.04, 0.36);
      const sideFlare = THREE.MathUtils.clamp(hs.pitch * 0.2 + hs.bounce * 0.24, -0.04, 0.24);
      if (rig.hairSideL) {
        rig.hairSideL.rotation.x = sideBack;
        rig.hairSideL.rotation.z = -sideFlare + hs.roll * 0.26;
      }
      if (rig.hairSideR) {
        rig.hairSideR.rotation.x = sideBack;
        rig.hairSideR.rotation.z = sideFlare + hs.roll * 0.26;
      }
    }

    if (rig.hairBunL || rig.hairBunR) {
      const bunLift = THREE.MathUtils.clamp(hs.bounce * 0.12, -0.025, 0.032);
      const bunTiltX = THREE.MathUtils.clamp(hs.pitch * 0.22, -0.06, 0.2);
      const bunTiltZ = THREE.MathUtils.clamp(hs.bounce * 0.2, -0.1, 0.14);
      const bunY = rig.hairHasDomeHat ? 0.24 : 0.41;
      if (rig.hairBunL) {
        rig.hairBunL.position.y = bunY + bunLift;
        rig.hairBunL.rotation.set(bunTiltX, 0, -bunTiltZ + hs.roll * 0.16);
      }
      if (rig.hairBunR) {
        rig.hairBunR.position.y = bunY + bunLift;
        rig.hairBunR.rotation.set(bunTiltX, 0, bunTiltZ + hs.roll * 0.16);
      }
    }

    if (rig.hairCrest && !rig.hairHasDomeHat) {
      const crestLiftMax = rig.hairHasCapHat ? 0.012 : 0.032;
      const crestPitch = THREE.MathUtils.clamp(-hs.pitch * 0.12 - hs.bounce * 0.08, -0.1, 0.05);
      const crestBounceY = THREE.MathUtils.clamp(hs.bounce * 0.1, -0.02, crestLiftMax);
      rig.hairCrest.rotation.set(crestPitch, 0, THREE.MathUtils.clamp(hs.roll * 0.14, -0.08, 0.08));
      const baseCrestY = hairId === 'fluffy_afro' || hairId === 'pomp' ? 0.34 : 0.32;
      rig.hairCrest.position.y = baseCrestY + crestBounceY;
    }
  }
  rig.leftShoeGroup.position.copy(rig.leftFoot.position);
  rig.rightShoeGroup.position.copy(rig.rightFoot.position);

  const shadowScale = Math.max(0.42, 1 - jumpZ * 0.42 - hop * 0.95);
  rig.shadowMesh.scale.setScalar(shadowScale);
  rig.shadowMesh.position.y = isSwimming && !isAirborne ? 0.14 : 0.02;

  rig.highlightRing.visible = highlighted;
  if (highlighted) {
    const pulse = 1 + Math.sin(time * 6) * 0.12;
    rig.highlightRing.scale.setScalar(pulse);
  }

  if (rig.flightWingsGroup && rig.flightWingL && rig.flightWingR && rig.flightWingMat) {
    const showFlight = Boolean(opts.cloudWings);
    rig.flightWingsGroup.visible = showFlight;
    if (showFlight) {
      const isThermal = Boolean(opts.thermalWings);
      rig.flightWingMat.color.setHex(isThermal ? 0xffe4b8 : 0xf4fbff);
      rig.flightWingMat.emissive.setHex(isThermal ? 0xff7b39 : 0x8fd5ff);
      rig.flightWingMat.emissiveIntensity = isThermal ? 0.72 + Math.sin(time * 9) * 0.18 : 0.45 + Math.sin(time * 6) * 0.12;
      rig.flightWingMat.opacity = Math.min(0.88, opacity);
      const wingFlap = Math.sin(time * (isMoving ? 14 : 7.2) + bobOffset) * (isMoving ? 0.52 : 0.28);
      rig.flightWingL.rotation.y = wingFlap;
      rig.flightWingR.rotation.y = -wingFlap;
      rig.flightWingL.rotation.z = Math.cos(time * 6 + bobOffset) * 0.08;
      rig.flightWingR.rotation.z = -Math.cos(time * 6 + bobOffset) * 0.08;
    }
  }

  const hasAura = Boolean(look.aura && look.aura > 0);
  const auraHex = AURA_COLOR_MAP[look.aura || 0] ?? 0xffd23f;
  for (let i = 0; i < rig.auraOrbs.length; i++) {
    const orb = rig.auraOrbs[i];
    orb.visible = hasAura;
    if (hasAura) {
      const a = time * 2.1 + (i * Math.PI * 2) / rig.auraOrbs.length;
      orb.position.set(Math.cos(a) * 0.62, 0.52 + Math.sin(a * 1.5) * 0.2, Math.sin(a) * 0.62);
      (orb.material as THREE.MeshBasicMaterial).color.setHex(auraHex);
    }
  }
}

// ==================== 3D ADOPTED COMPANION RIG ====================
export interface CompanionRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  shadowMesh: THREE.Mesh;
  ownedMats: THREE.Material[];
  lastId: string;
  wingL?: THREE.Object3D;
  wingR?: THREE.Object3D;
  hindWingL?: THREE.Object3D;
  hindWingR?: THREE.Object3D;
  tailGroup?: THREE.Object3D;
  finL?: THREE.Object3D;
  finR?: THREE.Object3D;
  spoutGroup?: THREE.Object3D;
  glowPart?: THREE.Object3D;
  orbitMote?: THREE.Object3D;
  rippleRing?: THREE.Object3D;
  earL?: THREE.Object3D;
  earR?: THREE.Object3D;
}

export function createCompanionRig(): CompanionRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: getSoftShadowTexture(),
    color: 0xffffff,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(GEO.shadow, shadowMat);
  shadowMesh.scale.setScalar(0.62);
  shadowMesh.position.y = 0.02;
  root.add(shadowMesh);
  return { root, bodyGroup, shadowMesh, ownedMats: [], lastId: '' };
}

export function disposeCompanionRig(comp: CompanionRig): void {
  for (const m of comp.ownedMats) {
    m.dispose();
  }
  comp.ownedMats.length = 0;
  (comp.shadowMesh.material as THREE.Material).dispose();
}

function makeCompStdMat(
  comp: CompanionRig,
  params: THREE.MeshStandardMaterialParameters
): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial(params);
  comp.ownedMats.push(m);
  return m;
}

function addCompanionEyePair(
  comp: CompanionRig,
  parent: THREE.Group,
  eyeMat: THREE.Material,
  shineMat: THREE.Material,
  blushMat: THREE.Material,
  xSep: number,
  y: number,
  z: number,
  eyeScale: number,
  blushOffsetY = -0.048,
  blushOffsetX = 0.042
): void {
  for (const k of [-1, 1]) {
    const eye = new THREE.Mesh(GEO.orb, eyeMat);
    eye.position.set(k * xSep, y, z);
    eye.scale.set(eyeScale, eyeScale * 1.12, eyeScale * 0.72);
    parent.add(eye);

    const shine = new THREE.Mesh(GEO.orb, shineMat);
    shine.position.set(k * xSep + eyeScale * 0.026, y + eyeScale * 0.032, z + eyeScale * 0.056);
    shine.scale.setScalar(eyeScale * 0.36);
    parent.add(shine);

    const cheek = new THREE.Mesh(GEO.orb, blushMat);
    cheek.position.set(k * (xSep + blushOffsetX), y + blushOffsetY, z - 0.018);
    cheek.scale.set(eyeScale * 1.28, eyeScale * 0.72, eyeScale * 0.45);
    parent.add(cheek);
  }
}

export function updateCompanionRig(
  comp: CompanionRig,
  id: string,
  time: number,
  headingYaw = 0,
  isFollowing = false
): void {
  if (id === 'none') {
    comp.root.visible = false;
    return;
  }
  comp.root.visible = true;

  if (comp.lastId !== id) {
    comp.lastId = id;
    clearGroup(comp.bodyGroup);
    for (const m of comp.ownedMats) m.dispose();
    comp.ownedMats.length = 0;

    comp.wingL = undefined;
    comp.wingR = undefined;
    comp.hindWingL = undefined;
    comp.hindWingR = undefined;
    comp.tailGroup = undefined;
    comp.finL = undefined;
    comp.finR = undefined;
    comp.spoutGroup = undefined;
    comp.glowPart = undefined;
    comp.orbitMote = undefined;
    comp.rippleRing = undefined;
    comp.earL = undefined;
    comp.earR = undefined;

    const eyeMat = makeCompStdMat(comp, { color: 0x22162b, roughness: 0.14, metalness: 0.06 });
    const shineMat = makeCompStdMat(comp, {
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.35,
      roughness: 0.1,
    });
    const blushMat = makeCompStdMat(comp, { color: 0xff8fb8, roughness: 0.55 });

    if (id === 'gloom') {
      // Dusk-Cloud Hushling Sprite: 5-puff lavender-silver cloud body, floppy cloud ears, dusk scarf, heirloom stitched brass button, orbiting lullaby spark
      const cloudMat = makeCompStdMat(comp, { color: 0xcdd2e4, roughness: 0.72, metalness: 0.02 });
      const cloudCreamMat = makeCompStdMat(comp, { color: 0xe6e9f5, roughness: 0.68 });
      const scarfMat = makeCompStdMat(comp, { color: 0x4f4673, roughness: 0.76 });
      const buttonMat = makeCompStdMat(comp, {
        map: getCompanionTexture('gloom_button'),
        color: 0xffdf7a,
        emissive: 0xffb703,
        emissiveIntensity: 0.25,
        roughness: 0.28,
        metalness: 0.58,
      });
      const moteMat = makeCompStdMat(comp, {
        color: 0xfff099,
        emissive: 0xffd23f,
        emissiveIntensity: 0.85,
        roughness: 0.25,
      });

      const core = new THREE.Mesh(GEO.torso, cloudMat);
      core.scale.set(0.76, 0.68, 0.72);
      core.castShadow = true;
      comp.bodyGroup.add(core);

      // Billowing cloud puffs around perimeter & crown
      for (const [ox, oy, oz, sc] of [
        [-0.2, -0.02, 0.0, 0.52],
        [0.2, -0.02, 0.0, 0.52],
        [0.0, 0.17, -0.03, 0.54],
        [0.0, -0.04, -0.18, 0.5],
      ] as const) {
        const puff = new THREE.Mesh(GEO.torso, ox === 0 && oy > 0 ? cloudCreamMat : cloudMat);
        puff.position.set(ox, oy, oz);
        puff.scale.setScalar(sc);
        puff.castShadow = true;
        comp.bodyGroup.add(puff);
      }

      // Floppy cloud ear tufts
      for (const k of [-1, 1] as const) {
        const earPivot = new THREE.Group();
        earPivot.position.set(k * 0.19, 0.22, 0.02);
        const ear = new THREE.Mesh(GEO.earCapsule, cloudCreamMat);
        ear.position.set(k * 0.04, -0.05, 0);
        ear.rotation.z = k * 0.45;
        ear.scale.set(0.78, 0.55, 0.72);
        earPivot.add(ear);
        comp.bodyGroup.add(earPivot);
        if (k < 0) comp.earL = earPivot;
        else comp.earR = earPivot;
      }

      // Cozy twilight neckerchief + trailing scarf ribbon
      const scarf = new THREE.Mesh(GEO.compNeckRing, scarfMat);
      scarf.position.set(0, -0.12, 0.01);
      scarf.rotation.x = Math.PI / 2;
      scarf.scale.set(1.06, 1.06, 0.85);
      comp.bodyGroup.add(scarf);

      const scarfTail = new THREE.Mesh(GEO.outfitStrap, scarfMat);
      scarfTail.position.set(0.11, -0.22, 0.21);
      scarfTail.rotation.set(-0.35, 0, 0.35);
      scarfTail.scale.set(0.9, 0.55, 0.75);
      comp.bodyGroup.add(scarfTail);

      // Heirloom 4-hole brass coat button charm
      const btn = new THREE.Mesh(GEO.compButtonDisc, buttonMat);
      btn.position.set(0, -0.11, 0.265);
      btn.scale.setScalar(0.95);
      comp.bodyGroup.add(btn);
      comp.glowPart = btn;

      // Stubby cloud paws
      for (const k of [-1, 1]) {
        const paw = new THREE.Mesh(GEO.foot, cloudCreamMat);
        paw.position.set(k * 0.13, -0.24, 0.08);
        paw.scale.set(0.78, 0.56, 0.9);
        comp.bodyGroup.add(paw);
      }

      addCompanionEyePair(comp, comp.bodyGroup, eyeMat, shineMat, blushMat, 0.095, 0.045, 0.245, 0.38, -0.05, 0.045);

      const mote = new THREE.Mesh(GEO.orb, moteMat);
      mote.scale.setScalar(0.42);
      comp.bodyGroup.add(mote);
      comp.orbitMote = mote;
    } else if (id === 'gloria') {
      // Singing River-Agate Stone: smooth layered discoid skipping stone, seafoam moss & shell clip, Echo rune, water-skipping ripple halo
      const agateMat = makeCompStdMat(comp, {
        map: getCompanionTexture('gloria_agate'),
        roughness: 0.44,
        metalness: 0.06,
      });
      const mossMat = makeCompStdMat(comp, { color: 0x62cb82, roughness: 0.82 });
      const shellMat = makeCompStdMat(comp, { color: 0xffa6c4, roughness: 0.34, metalness: 0.08 });
      const rippleMat = makeCompStdMat(comp, {
        color: 0x7de0ff,
        emissive: 0x52d1dc,
        emissiveIntensity: 0.55,
        roughness: 0.18,
        transparent: true,
        opacity: 0.72,
      });
      const echoMat = makeCompStdMat(comp, {
        color: 0xa6f4ff,
        emissive: 0x52d1dc,
        emissiveIntensity: 0.85,
        roughness: 0.2,
      });

      const pebble = new THREE.Mesh(GEO.torso, agateMat);
      pebble.scale.set(0.94, 0.38, 0.82);
      pebble.castShadow = true;
      comp.bodyGroup.add(pebble);

      // Soft sea-moss crown cushion + shell hairpin
      for (const [mx, my, mz, sc] of [
        [-0.14, 0.13, 0.04, 0.58],
        [-0.06, 0.15, 0.07, 0.46],
        [-0.21, 0.11, -0.02, 0.44],
      ] as const) {
        const moss = new THREE.Mesh(GEO.orb, mossMat);
        moss.position.set(mx, my, mz);
        moss.scale.set(sc, sc * 0.65, sc);
        comp.bodyGroup.add(moss);
      }
      const shell = new THREE.Mesh(GEO.beakCone, shellMat);
      shell.position.set(-0.14, 0.18, 0.11);
      shell.rotation.set(0.7, 0, -0.5);
      shell.scale.setScalar(0.68);
      comp.bodyGroup.add(shell);

      addCompanionEyePair(comp, comp.bodyGroup, eyeMat, shineMat, blushMat, 0.088, 0.015, 0.275, 0.32, -0.036, 0.045);

      // Luminous Echo crest crystal
      const echoMote = new THREE.Mesh(GEO.beakCone, echoMat);
      echoMote.scale.set(0.45, 0.52, 0.45);
      comp.bodyGroup.add(echoMote);
      comp.orbitMote = echoMote;

      // Water-skipping ripple halo hovering right beneath Gloria
      const ripple = new THREE.Mesh(GEO.compRippleTorus, rippleMat);
      ripple.position.set(0, -0.17, 0);
      ripple.scale.setScalar(1.0);
      comp.bodyGroup.add(ripple);
      comp.rippleRing = ripple;
    } else if (id === 'gary') {
      // Aristocratic Desert Slate Pet Rock: chunky faceted dodecahedral granite crag, 3-leaf clover moss crown, coral bandana, googly storybook eyes, pebble feet
      const slateMat = makeCompStdMat(comp, {
        map: getCompanionTexture('gary_slate'),
        roughness: 0.9,
        metalness: 0.04,
      });
      const darkCragMat = makeCompStdMat(comp, { color: 0x67667a, roughness: 0.92 });
      const mossMat = makeCompStdMat(comp, { color: 0x5ec474, roughness: 0.66 });
      const bandanaMat = makeCompStdMat(comp, { color: 0xff6f61, roughness: 0.65 });
      const scleraMat = makeCompStdMat(comp, { color: 0xffffff, roughness: 0.2 });

      const crag = new THREE.Mesh(GEO.compRockFacet, slateMat);
      crag.scale.set(0.95, 0.88, 0.86);
      crag.castShadow = true;
      comp.bodyGroup.add(crag);

      // Shoulder chip crag for distinct asymmetric boulder profile
      const chip = new THREE.Mesh(GEO.compRockFacet, darkCragMat);
      chip.position.set(-0.18, -0.05, -0.04);
      chip.rotation.set(0.4, 0.7, 0.2);
      chip.scale.setScalar(0.5);
      comp.bodyGroup.add(chip);

      // Moss pad + sprouting 3-leaf clover crest
      const mossPad = new THREE.Mesh(GEO.earDisc, mossMat);
      mossPad.position.set(0.03, 0.22, 0.0);
      mossPad.scale.set(0.95, 0.34, 0.85);
      comp.bodyGroup.add(mossPad);

      const sprout = new THREE.Group();
      sprout.position.set(0.03, 0.25, 0.01);
      const stem = new THREE.Mesh(GEO.antlerTine, mossMat);
      stem.position.y = 0.07;
      stem.scale.set(0.7, 0.85, 0.7);
      sprout.add(stem);
      for (const [lx, lz, rot] of [
        [-0.055, 0.02, 0.45],
        [0.055, 0.02, -0.45],
        [0.0, -0.055, 0],
      ] as const) {
        const leaf = new THREE.Mesh(GEO.earDisc, mossMat);
        leaf.position.set(lx, 0.145, lz);
        leaf.rotation.set(0.25, rot, rot);
        leaf.scale.set(0.42, 0.12, 0.34);
        sprout.add(leaf);
      }
      comp.bodyGroup.add(sprout);
      comp.glowPart = sprout;

      // Dapper coral neckerchief & front bandana knot
      const collar = new THREE.Mesh(GEO.compNeckRing, bandanaMat);
      collar.position.set(0, -0.14, 0);
      collar.rotation.x = Math.PI / 2;
      collar.scale.set(1.06, 1.06, 0.72);
      comp.bodyGroup.add(collar);

      const knot = new THREE.Mesh(GEO.beakCone, bandanaMat);
      knot.position.set(0, -0.19, 0.24);
      knot.rotation.x = Math.PI * 0.88;
      knot.scale.set(1.15, 0.75, 0.6);
      comp.bodyGroup.add(knot);

      // Expressive mismatched googly storybook eyes
      for (const [k, pupOffX, pupOffY] of [
        [-1, 0.008, 0.006],
        [1, -0.006, -0.005],
      ] as const) {
        const sclera = new THREE.Mesh(GEO.orb, scleraMat);
        sclera.position.set(k * 0.095, 0.065, 0.22);
        sclera.scale.set(0.56, 0.62, 0.28);
        comp.bodyGroup.add(sclera);
        const pupil = new THREE.Mesh(GEO.orb, eyeMat);
        pupil.position.set(k * 0.095 + pupOffX, 0.065 + pupOffY, 0.242);
        pupil.scale.set(0.26, 0.3, 0.2);
        comp.bodyGroup.add(pupil);
      }

      // Tiny resting pebble slippers
      for (const k of [-1, 1]) {
        const shoe = new THREE.Mesh(GEO.foot, darkCragMat);
        shoe.position.set(k * 0.12, -0.23, 0.1);
        shoe.scale.set(0.68, 0.45, 0.86);
        comp.bodyGroup.add(shoe);
      }
    } else if (id === 'moth') {
      // Bioluminescent Luna Silk-Moth: cream-velvet thorax & ringed lantern abdomen, plumose gold antennae, 4 crescent-moon scalloped wings
      const velvetMat = makeCompStdMat(comp, { color: 0xfff8e2, roughness: 0.74 });
      const abdMat = makeCompStdMat(comp, {
        color: 0xffe084,
        emissive: 0xffbe3b,
        emissiveIntensity: 0.42,
        roughness: 0.45,
      });
      const antMat = makeCompStdMat(comp, {
        color: 0xffd23f,
        emissive: 0xffb703,
        emissiveIntensity: 0.25,
        roughness: 0.38,
      });
      const wingMat = makeCompStdMat(comp, {
        map: getCompanionTexture('moth_wing'),
        transparent: true,
        alphaTest: 0.14,
        side: THREE.DoubleSide,
        emissive: 0xffe49c,
        emissiveIntensity: 0.26,
        roughness: 0.36,
      });
      const moteMat = makeCompStdMat(comp, {
        color: 0xfff5a8,
        emissive: 0xffd23f,
        emissiveIntensity: 0.9,
        roughness: 0.2,
      });

      const head = new THREE.Mesh(GEO.torso, velvetMat);
      head.position.set(0, 0.05, 0.14);
      head.scale.set(0.48, 0.44, 0.46);
      head.castShadow = true;
      comp.bodyGroup.add(head);

      const ruff = new THREE.Mesh(GEO.compNeckRing, velvetMat);
      ruff.position.set(0, 0.02, 0.06);
      ruff.rotation.x = Math.PI * 0.36;
      ruff.scale.set(0.74, 0.74, 0.95);
      comp.bodyGroup.add(ruff);

      const abdomen = new THREE.Mesh(GEO.tailCurve, abdMat);
      abdomen.position.set(0, -0.04, -0.1);
      abdomen.rotation.x = Math.PI * 0.44;
      abdomen.scale.set(2.0, 1.0, 1.9);
      abdomen.castShadow = true;
      comp.bodyGroup.add(abdomen);
      comp.glowPart = abdomen;

      // Ringed moth abdomen stripes
      const stripeMat = makeCompStdMat(comp, { color: 0x9b74c7, roughness: 0.5 });
      for (const sz of [-0.08, -0.17]) {
        const ring = new THREE.Mesh(GEO.hatTorus, stripeMat);
        ring.position.set(0, -0.04, sz);
        ring.scale.set(0.46, 0.46, 0.5);
        comp.bodyGroup.add(ring);
      }

      // Feathered plumose antennae
      for (const k of [-1, 1] as const) {
        const antPivot = new THREE.Group();
        antPivot.position.set(k * 0.06, 0.18, 0.18);
        const plume = new THREE.Mesh(GEO.featherBlade, antMat);
        plume.position.set(k * 0.06, 0.09, 0.04);
        plume.rotation.set(0.32, 0, -k * 0.48);
        plume.scale.set(0.58, 0.56, 0.24);
        antPivot.add(plume);
        comp.bodyGroup.add(antPivot);
        if (k < 0) comp.earL = antPivot;
        else comp.earR = antPivot;
      }

      addCompanionEyePair(comp, comp.bodyGroup, eyeMat, shineMat, blushMat, 0.072, 0.065, 0.275, 0.34, -0.04, 0.036);

      // 4 Pivoted Scalloped Wings (forewings + swallowtail hindwings)
      for (const k of [-1, 1] as const) {
        const fwPivot = new THREE.Group();
        fwPivot.position.set(k * 0.08, 0.07, 0.02);
        const fw = new THREE.Mesh(GEO.compWingPlane, wingMat);
        fw.position.set(k * 0.23, 0.02, 0);
        fw.rotation.x = -Math.PI / 2 + 0.14;
        fw.scale.set(k * 1.12, 1.05, 1);
        fwPivot.add(fw);
        comp.bodyGroup.add(fwPivot);
        if (k < 0) comp.wingL = fwPivot;
        else comp.wingR = fwPivot;

        const hwPivot = new THREE.Group();
        hwPivot.position.set(k * 0.07, 0.02, -0.09);
        const hw = new THREE.Mesh(GEO.compWingPlane, wingMat);
        hw.position.set(k * 0.17, -0.01, -0.06);
        hw.rotation.set(-Math.PI / 2 - 0.08, 0, -k * 0.34);
        hw.scale.set(k * 0.82, 0.78, 1);
        hwPivot.add(hw);
        comp.bodyGroup.add(hwPivot);
        if (k < 0) comp.hindWingL = hwPivot;
        else comp.hindWingR = hwPivot;
      }

      const pollen = new THREE.Mesh(GEO.orb, moteMat);
      pollen.scale.setScalar(0.36);
      comp.bodyGroup.add(pollen);
      comp.orbitMote = pollen;
    } else if (id === 'bee') {
      // Meadow-Nectar Fuzzy Bumblebee: plump striped body, cream neck ruff, curved antennae, pollen saddlebags, 4 veined gossamer wings
      const honeyMat = makeCompStdMat(comp, { color: 0xffd23f, roughness: 0.44 });
      const stripeMat = makeCompStdMat(comp, { color: 0x3b2a45, roughness: 0.56 });
      const ruffMat = makeCompStdMat(comp, { color: 0xfff5d6, roughness: 0.76 });
      const pollenMat = makeCompStdMat(comp, { color: 0xff9f1c, roughness: 0.58 });
      const wingMat = makeCompStdMat(comp, {
        map: getCompanionTexture('bee_wing'),
        transparent: true,
        alphaTest: 0.12,
        side: THREE.DoubleSide,
        roughness: 0.16,
        metalness: 0.08,
      });

      const body = new THREE.Mesh(GEO.torso, honeyMat);
      body.scale.set(0.64, 0.58, 0.84);
      body.castShadow = true;
      comp.bodyGroup.add(body);

      const ruff = new THREE.Mesh(GEO.compNeckRing, ruffMat);
      ruff.position.set(0, 0.01, 0.12);
      ruff.scale.set(0.84, 0.76, 1.0);
      comp.bodyGroup.add(ruff);

      // Espresso bee stripes around abdomen
      for (const [sz, sc] of [
        [-0.01, 0.92],
        [-0.14, 0.82],
      ] as const) {
        const stripe = new THREE.Mesh(GEO.hatTorus, stripeMat);
        stripe.position.set(0, 0, sz);
        stripe.scale.set(sc, sc * 0.9, 0.92);
        comp.bodyGroup.add(stripe);
      }

      // Cute tiny stinger tip
      const stinger = new THREE.Mesh(GEO.beakCone, stripeMat);
      stinger.position.set(0, -0.02, -0.32);
      stinger.rotation.x = -Math.PI / 2;
      stinger.scale.set(0.55, 0.65, 0.55);
      comp.bodyGroup.add(stinger);

      // Bulging marigold pollen saddlebags on hind sides
      for (const k of [-1, 1]) {
        const bag = new THREE.Mesh(GEO.orb, pollenMat);
        bag.position.set(k * 0.19, -0.11, -0.08);
        bag.scale.set(0.72, 0.86, 0.76);
        comp.bodyGroup.add(bag);
      }

      // Curved knobbed antennae
      for (const k of [-1, 1] as const) {
        const antPivot = new THREE.Group();
        antPivot.position.set(k * 0.06, 0.16, 0.22);
        const stalk = new THREE.Mesh(GEO.whisker, stripeMat);
        stalk.position.set(k * 0.025, 0.06, 0.02);
        stalk.rotation.set(0.35, 0, -k * 0.3);
        stalk.scale.set(1.2, 0.55, 1.2);
        const knob = new THREE.Mesh(GEO.orb, honeyMat);
        knob.position.set(k * 0.045, 0.12, 0.05);
        knob.scale.setScalar(0.28);
        antPivot.add(stalk, knob);
        comp.bodyGroup.add(antPivot);
        if (k < 0) comp.earL = antPivot;
        else comp.earR = antPivot;
      }

      addCompanionEyePair(comp, comp.bodyGroup, eyeMat, shineMat, blushMat, 0.086, 0.045, 0.265, 0.34, -0.042, 0.042);

      // 4 Pivoted Veined Gossamer Wings
      for (const k of [-1, 1] as const) {
        const fwPivot = new THREE.Group();
        fwPivot.position.set(k * 0.08, 0.16, 0.04);
        const fw = new THREE.Mesh(GEO.compWingPlane, wingMat);
        fw.position.set(k * 0.19, 0.02, -0.02);
        fw.rotation.x = -Math.PI / 2 + 0.18;
        fw.scale.set(k * 0.92, 0.76, 1);
        fwPivot.add(fw);
        comp.bodyGroup.add(fwPivot);
        if (k < 0) comp.wingL = fwPivot;
        else comp.wingR = fwPivot;

        const hwPivot = new THREE.Group();
        hwPivot.position.set(k * 0.07, 0.14, -0.08);
        const hw = new THREE.Mesh(GEO.compWingPlane, wingMat);
        hw.position.set(k * 0.14, 0.0, -0.04);
        hw.rotation.set(-Math.PI / 2, 0, -k * 0.25);
        hw.scale.set(k * 0.68, 0.58, 1);
        hwPivot.add(hw);
        comp.bodyGroup.add(hwPivot);
        if (k < 0) comp.hindWingL = hwPivot;
        else comp.hindWingR = hwPivot;
      }
    } else if (id === 'whale') {
      // Skyborne Cumulus Baleen Whale-Calf: sculpted sky-blue body, pleated ivory belly, pectoral flippers, cleft tail fluke, pastel rainbow mist spout
      const skyMat = makeCompStdMat(comp, { color: 0x8ad6ff, roughness: 0.42 });
      const bellyMat = makeCompStdMat(comp, {
        map: getCompanionTexture('whale_belly'),
        roughness: 0.56,
      });
      const mistWhite = makeCompStdMat(comp, { color: 0xffffff, roughness: 0.45 });
      const dropPink = makeCompStdMat(comp, {
        color: 0xff9ebb,
        emissive: 0xff7aa8,
        emissiveIntensity: 0.25,
        roughness: 0.25,
      });
      const dropGold = makeCompStdMat(comp, {
        color: 0xffdf7a,
        emissive: 0xffd23f,
        emissiveIntensity: 0.25,
        roughness: 0.25,
      });
      const dropAqua = makeCompStdMat(comp, {
        color: 0x9ef4ff,
        emissive: 0x52d1dc,
        emissiveIntensity: 0.25,
        roughness: 0.25,
      });

      const body = new THREE.Mesh(GEO.torso, skyMat);
      body.scale.set(0.76, 0.62, 0.96);
      body.castShadow = true;
      comp.bodyGroup.add(body);

      // Ivory pleated baleen throat & underside
      const belly = new THREE.Mesh(GEO.torso, bellyMat);
      belly.position.set(0, -0.075, 0.04);
      belly.scale.set(0.68, 0.48, 0.86);
      comp.bodyGroup.add(belly);

      // Swept pectoral flippers
      for (const k of [-1, 1] as const) {
        const finPivot = new THREE.Group();
        finPivot.position.set(k * 0.23, -0.07, 0.05);
        const fin = new THREE.Mesh(GEO.compFinBlade, skyMat);
        fin.position.set(k * 0.09, -0.02, -0.03);
        fin.rotation.set(0.25, 0, -k * 1.28);
        fin.scale.set(0.9, 0.85, 0.42);
        finPivot.add(fin);
        comp.bodyGroup.add(finPivot);
        if (k < 0) comp.finL = finPivot;
        else comp.finR = finPivot;
      }

      // Articulated tail stock + cleft horizontal tail fluke
      const tailGroup = new THREE.Group();
      tailGroup.position.set(0, -0.01, -0.28);
      const stock = new THREE.Mesh(GEO.snoutCone, skyMat);
      stock.position.set(0, 0, -0.07);
      stock.rotation.x = -Math.PI / 2;
      stock.scale.set(0.85, 0.9, 0.72);
      tailGroup.add(stock);
      for (const k of [-1, 1] as const) {
        const fluke = new THREE.Mesh(GEO.compFinBlade, skyMat);
        fluke.position.set(k * 0.09, 0.01, -0.17);
        fluke.rotation.set(0.15, k * 0.45, -k * 1.48);
        fluke.scale.set(0.82, 0.88, 0.34);
        tailGroup.add(fluke);
      }
      comp.bodyGroup.add(tailGroup);
      comp.tailGroup = tailGroup;

      // Side-set kind whale eyes & rosy cheeks
      for (const k of [-1, 1]) {
        const eye = new THREE.Mesh(GEO.orb, eyeMat);
        eye.position.set(k * 0.215, 0.025, 0.16);
        eye.scale.set(0.24, 0.32, 0.32);
        comp.bodyGroup.add(eye);
        const shine = new THREE.Mesh(GEO.orb, shineMat);
        shine.position.set(k * 0.235, 0.042, 0.178);
        shine.scale.setScalar(0.11);
        comp.bodyGroup.add(shine);
        const cheek = new THREE.Mesh(GEO.orb, blushMat);
        cheek.position.set(k * 0.22, -0.025, 0.11);
        cheek.scale.set(0.22, 0.22, 0.36);
        comp.bodyGroup.add(cheek);
      }

      // Blowhole cumulus puff + pastel rainbow droplets
      const spoutGroup = new THREE.Group();
      spoutGroup.position.set(0, 0.22, 0.08);
      const puff = new THREE.Mesh(GEO.orb, mistWhite);
      puff.scale.set(0.65, 0.42, 0.65);
      spoutGroup.add(puff);
      const drops: [number, number, number, THREE.Material][] = [
        [-0.07, 0.11, 0.01, dropPink],
        [0.0, 0.16, 0.02, dropGold],
        [0.07, 0.11, -0.01, dropAqua],
      ];
      for (const [dx, dy, dz, dMat] of drops) {
        const d = new THREE.Mesh(GEO.orb, dMat);
        d.position.set(dx, dy, dz);
        d.scale.setScalar(0.38);
        spoutGroup.add(d);
      }
      comp.bodyGroup.add(spoutGroup);
      comp.spoutGroup = spoutGroup;
    } else if (id === 'frog') {
      // Amber-Throat Lantern Frog: dappled emerald frog body, domed golden-iris eyes, pulsing amber lantern throat sac, webbed feet, dewdrop lily-pad beret
      const skinMat = makeCompStdMat(comp, {
        map: getCompanionTexture('frog_skin'),
        roughness: 0.4,
      });
      const greenMat = makeCompStdMat(comp, { color: 0x5cc976, roughness: 0.42 });
      const goldIrisMat = makeCompStdMat(comp, { color: 0xffd23f, roughness: 0.22 });
      const lanternSacMat = makeCompStdMat(comp, {
        color: 0xffe68c,
        emissive: 0xffa81c,
        emissiveIntensity: 0.85,
        roughness: 0.28,
      });
      const lilyMat = makeCompStdMat(comp, { color: 0x4fb36b, roughness: 0.56 });
      const dewMat = makeCompStdMat(comp, { color: 0xaef4ff, roughness: 0.12, metalness: 0.15 });

      const body = new THREE.Mesh(GEO.torso, skinMat);
      body.scale.set(0.76, 0.54, 0.76);
      body.castShadow = true;
      comp.bodyGroup.add(body);

      // Glowing inflatable amber lantern throat sac
      const sac = new THREE.Mesh(GEO.belly, lanternSacMat);
      sac.position.set(0, -0.065, 0.165);
      sac.scale.set(0.74, 0.64, 0.58);
      comp.bodyGroup.add(sac);
      comp.glowPart = sac;

      // Iconic tall domed frog eyes with golden iris + pupil + catchlight
      for (const k of [-1, 1]) {
        const dome = new THREE.Mesh(GEO.frogEyeDome, greenMat);
        dome.position.set(k * 0.125, 0.175, 0.1);
        dome.scale.setScalar(0.56);
        comp.bodyGroup.add(dome);
        const iris = new THREE.Mesh(GEO.orb, goldIrisMat);
        iris.position.set(k * 0.125, 0.18, 0.16);
        iris.scale.set(0.48, 0.48, 0.34);
        comp.bodyGroup.add(iris);
        const pupil = new THREE.Mesh(GEO.orb, eyeMat);
        pupil.position.set(k * 0.125, 0.18, 0.18);
        pupil.scale.set(0.3, 0.32, 0.25);
        comp.bodyGroup.add(pupil);
        const shine = new THREE.Mesh(GEO.orb, shineMat);
        shine.position.set(k * 0.125 + 0.016, 0.195, 0.196);
        shine.scale.setScalar(0.14);
        comp.bodyGroup.add(shine);

        const cheek = new THREE.Mesh(GEO.orb, blushMat);
        cheek.position.set(k * 0.165, 0.035, 0.19);
        cheek.scale.set(0.45, 0.25, 0.22);
        comp.bodyGroup.add(cheek);

        // Bent hind frog thigh & webbed foot
        const thigh = new THREE.Mesh(GEO.earDisc, greenMat);
        thigh.position.set(k * 0.21, -0.1, -0.05);
        thigh.scale.set(0.62, 0.62, 0.85);
        comp.bodyGroup.add(thigh);
        const foot = new THREE.Mesh(GEO.foot, greenMat);
        foot.position.set(k * 0.21, -0.18, 0.06);
        foot.scale.set(0.85, 0.36, 1.05);
        comp.bodyGroup.add(foot);
      }

      // Mini lily-pad beret + glistening dewdrop
      const lilyCap = new THREE.Mesh(GEO.compButtonDisc, lilyMat);
      lilyCap.position.set(-0.04, 0.205, -0.02);
      lilyCap.rotation.set(Math.PI / 2 - 0.18, 0, 0.22);
      lilyCap.scale.set(1.25, 1.15, 0.5);
      comp.bodyGroup.add(lilyCap);

      const dew = new THREE.Mesh(GEO.orb, dewMat);
      dew.position.set(-0.08, 0.235, 0.01);
      dew.scale.setScalar(0.32);
      comp.bodyGroup.add(dew);
    }
  }

  // Species-specific motion choreography & shadow grounding
  let baseY = 0.38;
  let bobAmp = isFollowing ? 0.11 : 0.085;
  let hoverFreq = isFollowing ? 6.4 : 3.4;
  let hoverOffset = Math.sin(time * hoverFreq) * bobAmp;
  let swayX = Math.sin(time * 2.1) * (isFollowing ? 0.06 : 0.13);
  let swayZ = Math.cos(time * 1.5) * (isFollowing ? 0.04 : 0.09);
  let bankRoll = Math.sin(time * 3.1) * (isFollowing ? 0.11 : 0.06);
  let bankPitch = isFollowing ? 0.16 : Math.sin(time * 2.4) * 0.06;

  if (id === 'gary') {
    baseY = 0.24;
    swayX = 0;
    swayZ = 0;
    hoverOffset = isFollowing ? Math.abs(Math.sin(time * 7.2)) * 0.11 : Math.abs(Math.sin(time * 1.4)) * 0.02;
    bankRoll = isFollowing ? Math.sin(time * 7.2) * 0.09 : 0;
    bankPitch = isFollowing ? 0.08 : 0;
    if (comp.glowPart) {
      comp.glowPart.rotation.z = Math.sin(time * 3.5) * 0.12;
    }
  } else if (id === 'gloria') {
    baseY = 0.26;
    hoverOffset = isFollowing
      ? Math.abs(Math.sin(time * 8.0)) * 0.13
      : Math.sin(time * 3.2) * 0.045;
    bankPitch = isFollowing ? 0.1 : Math.sin(time * 2.2) * 0.04;
    if (comp.rippleRing) {
      const rp = (time * 1.6) % 1;
      comp.rippleRing.scale.setScalar(0.85 + rp * 0.45);
      comp.rippleRing.position.y = -0.17 - hoverOffset * 0.65;
    }
  } else if (id === 'frog') {
    baseY = 0.25;
    const hopWave = Math.abs(Math.sin(time * (isFollowing ? 7.6 : 2.8)));
    hoverOffset = hopWave * (isFollowing ? 0.22 : 0.075);
    bankPitch = isFollowing ? (hopWave - 0.5) * 0.35 : Math.sin(time * 2.8) * 0.06;
    if (comp.glowPart) {
      const pulse = 1 + Math.sin(time * 3.8) * 0.14;
      comp.glowPart.scale.set(0.74 * pulse, 0.64 * pulse, 0.58 * pulse);
    }
  } else if (id === 'whale') {
    baseY = 0.54;
    hoverOffset = Math.sin(time * (isFollowing ? 4.4 : 2.4)) * 0.1;
    bankPitch = Math.sin(time * 2.4) * 0.1 + (isFollowing ? 0.12 : 0);
    if (comp.tailGroup) {
      comp.tailGroup.rotation.x = Math.sin(time * (isFollowing ? 8.5 : 4.5)) * 0.36;
    }
    if (comp.finL && comp.finR) {
      const row = Math.sin(time * (isFollowing ? 6.5 : 3.2)) * 0.28;
      comp.finL.rotation.z = row;
      comp.finR.rotation.z = -row;
    }
    if (comp.spoutGroup) {
      comp.spoutGroup.position.y = 0.22 + Math.abs(Math.sin(time * 3.8)) * 0.05;
      const sc = 0.9 + Math.sin(time * 3.8) * 0.16;
      comp.spoutGroup.scale.setScalar(sc);
    }
  } else if (id === 'moth' || id === 'bee') {
    baseY = 0.48;
    const flapFreq = id === 'bee' ? (isFollowing ? 28 : 22) : isFollowing ? 16 : 11;
    const flapAmp = id === 'bee' ? 0.52 : 0.58;
    const fl = Math.sin(time * flapFreq) * flapAmp;
    if (comp.wingL && comp.wingR) {
      comp.wingL.rotation.z = fl;
      comp.wingR.rotation.z = -fl;
    }
    if (comp.hindWingL && comp.hindWingR) {
      const hfl = Math.sin(time * flapFreq - 0.45) * (flapAmp * 0.85);
      comp.hindWingL.rotation.z = hfl;
      comp.hindWingR.rotation.z = -hfl;
    }
    if (comp.earL && comp.earR) {
      comp.earL.rotation.x = Math.sin(time * 4.2) * 0.12;
      comp.earR.rotation.x = -Math.sin(time * 4.2) * 0.12;
    }
  } else if (id === 'gloom') {
    baseY = 0.4;
    if (comp.earL && comp.earR) {
      const earBob = Math.sin(time * (isFollowing ? 8.2 : 3.8)) * 0.18;
      comp.earL.rotation.z = earBob;
      comp.earR.rotation.z = -earBob;
    }
    if (comp.glowPart) {
      const gScale = 0.95 + Math.sin(time * 3.4) * 0.06;
      comp.glowPart.scale.setScalar(gScale);
    }
  }

  if (comp.orbitMote) {
    const ma = time * 2.2;
    comp.orbitMote.position.set(
      Math.cos(ma) * 0.34,
      0.24 + Math.sin(ma * 1.7) * 0.08,
      Math.sin(ma) * 0.34
    );
  }

  const finalY = baseY + hoverOffset;
  comp.bodyGroup.position.set(swayX, finalY, swayZ);
  comp.bodyGroup.rotation.y = headingYaw + Math.sin(time * 1.8) * (isFollowing ? 0.08 : 0.24);
  comp.bodyGroup.rotation.x = bankPitch;
  comp.bodyGroup.rotation.z = bankRoll;

  const shScale = THREE.MathUtils.clamp(0.76 - finalY * 0.34, 0.42, 0.74);
  comp.shadowMesh.scale.setScalar(shScale);
}

