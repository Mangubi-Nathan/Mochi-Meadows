/**
 * Mochi Meadows 2: The Dawn Duet Core Game Engine
 * Starlit Archipelago (8 Islands), Five Layers (Ground, Sea, Sky, Glowdeep, Moon Road),
 * The Hollows & Kindness System, Companions, Sailing, Song-Weaving, Cottage & Hamlet.
 */

import { N, T, SEED, BIOME_NAMES, BIOME_COLORS, FISH_SPECIES } from './constants';
export { N, T, SEED, BIOME_NAMES, BIOME_COLORS, FISH_SPECIES };

export interface PlayerLook {
  sp: string;
  col: string;
  c2: string;
  ac: string;
  eyeCol?: string;
  noseCol?: string;
  dye2?: string;
  size?: 'tiny' | 'small' | 'normal' | 'plump';
  hat: string;
  eyes: number;
  mouth: number;
  pat: number;
  out: number;
  face: number;
  aura: number;
  companion?: 'none' | 'gloom' | 'gloria' | 'gary' | 'moth' | 'whale';
  name: string;
  isHollow?: boolean;
  hollowColorBloom?: number; // 0 = grey, 1 = radiant color
  hollowBloom?: number;
}

export interface Quest {
  g: string;      // Giver NPC name
  t: string;      // Title
  k: 'c' | 'd';   // 'c' = collect, 'd' = deliver
  it: string;     // Item icon
  n?: number;     // Target count
  to?: string;    // Delivery recipient NPC
  w: number;      // Layer (0 = ground, 1 = sea, 2 = sky, 3 = glowdeep, 4 = moonroad)
  d: string;      // Offer dialogue
  dl?: string;    // Recipient dialogue
  e: string;      // Complete dialogue
  l: string;      // Lore unlocked
  st: number;     // 0 = unaccepted, 1 = in progress, 2 = ready to turn in, 3 = completed
  c: number;      // Current collected count
}

export interface NPC {
  n: string;
  r: string;
  bi: number;
  sp: string;
  col: string;
  hat: string;
  g: string;
  t: [string, string][];
  i: string[];
  qp: string[];
  e: string;
  x: number;
  y: number;
  hx: number;
  hy: number;
  tx: number;
  ty: number;
  f: number;
  ph: number;
  h: number[];
  wt: number;
  cool: number;
  sayT: number;
  say?: string;
  wave: number;
  mv: number;
  go: number;
  met?: boolean;
  fr?: boolean;
  hearts?: number; // 0 to 5 friendship hearts in MM2
  near?: boolean;
  hist: [string, string][];
  sky?: boolean;
  sea?: boolean;
  glowdeep?: boolean;
  moonroad?: boolean;
  tree?: boolean;
  nq?: boolean;
  island?: string;
  duetPartner?: boolean;
  weatherBehavior?: 'dancing' | 'sheltering' | 'stargazing' | 'shivering' | 'idle';
  weatherPoseY?: number;
}

export interface LoreEntry {
  id: string;
  t: string;
  x: string;
}

export interface HollowCreature {
  id: string;
  x: number;
  y: number;
  w?: number;
  name: string;
  type?: 'drifter' | 'ashen' | 'bubble' | 'thorn' | 'petal' | 'mirage' | 'frost' | 'stone' | 'echo';
  itemHeld?: string; // e.g. ribbon, teacup, button
  soothed: boolean;
  colorBloom?: number; // 0 to 1
  humPhrase?: number[];
  revealedName?: string;
  species?: string;
  color?: string;
  bloomT?: number;
  quote?: string;
}

export interface MemoryEcho {
  id: string;
  title: string;
  speaker: string;
  memory: string;
  x: number;
  y: number;
  w: number;
  got: boolean;
}

export interface MoonDiaryEntry {
  page: number;
  entry: string;
  found: boolean;
  x: number;
  y: number;
  w: number;
}

export interface ReveilleVerse {
  num: number;
  title: string;
  island: string;
  keeper: string;
  quote: string;
  origin: string;
  unlocked: boolean;
}

export type HouseRoomId =
  | 'living'
  | 'kitchen'
  | 'bedroom'
  | 'study'
  | 'conservatory'
  | 'bath';

export type FurnitureAnimationKind =
  | 'steam'
  | 'glow'
  | 'sparkle'
  | 'heart'
  | 'notes'
  | 'petals'
  | 'bubbles'
  | 'bounce';

export interface CottageDecoration {
  id: string;
  x: number;
  y: number;
  name: string;
  icon: string;
  room?: HouseRoomId;
  lastInteractedAt?: number;
  interactionCount?: number;
}

export interface CottageState {
  decorationsPlaced: CottageDecoration[];
  gardenPlots: { seedType: string; stage: number; plantedAt: number }[];
  aquariumFish: string[];
  musicBoxSong: number[]; // note pitches from Song Weaver
  weatherWindow: string;
  fireplaceLit?: boolean;
  lampOn?: boolean;
  tubFilled?: boolean;
  ovenWarm?: boolean;
  lastInteractedFurnitureId?: string;
  furnitureInteractCount?: number;
}

export interface HamletResident {
  npcName: string;
  houseX: number;
  houseY: number;
  doorColor?: string;
  dialogue?: string;
  shopType?: string;
}

// Procedural Hash and Noise
export function hash(x: number, y: number, s: number = 0): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s + SEED, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function vn(x: number, y: number, s: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s);
  const b = hash(xi + 1, yi, s);
  const c = hash(xi, yi + 1, s);
  const d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x: number, y: number, s: number): number {
  return (vn(x, y, s) * 0.5 + vn(x * 2, y * 2, s) * 0.25 + vn(x * 4, y * 4, s) * 0.125 + vn(x * 8, y * 8, s) * 0.0625) / 0.9375;
}

export function shadeColor(hex: string, percent: number): string {
  if (!hex || hex[0] !== '#') return hex;
  const cleanHex = hex.replace('#', '');
  const num = parseInt(cleanHex.length === 3 ? cleanHex.split('').map(c => c+c).join('') : cleanHex, 16);
  if (isNaN(num)) return hex;
  let r = (num >> 16) + Math.round(255 * percent);
  let g = ((num >> 8) & 0x00ff) + Math.round(255 * percent);
  let b = (num & 0x0000ff) + Math.round(255 * percent);
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `rgb(${r},${g},${b})`;
}

// Particle System
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  l: number;
  c: string;
}

export interface Town {
  n: string;
  x: number;
  y: number;
  w: number; // 0 = ground, 1 = sea, 2 = sky, 3 = glowdeep, 4 = moonroad
  vis: number;
  island?: string;
}

export interface StarGem {
  x: number;
  y: number;
  got: number;
}

export interface Pearl {
  x: number;
  y: number;
  got: number;
}

export interface Feather {
  x: number;
  y: number;
  got: number;
}

export interface DawnChime {
  x: number;
  y: number;
  got: number;
}

export interface Ring {
  x: number;
  y: number;
  got: number;
}

export interface FishAmbient {
  hx: number;
  hy: number;
  s: number;
  ph: number;
  R: number;
  c: string;
}

export interface QuestItem {
  q: Quest;
  x: number;
  y: number;
  w: number;
  got: number;
}

export interface BloomEffect {
  x: number;
  y: number;
  u: boolean;
  b: number;
  c: number;
  e: number;
}

export interface MagicRing {
  x: number;
  y: number;
  t: number;
  m: number;
  r: number;
  c: string;
}
