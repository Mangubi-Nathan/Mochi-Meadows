/**
 * Mochi Meadows 2 — 3D Storybook Diorama WebGL Engine (Three.js)
 * Renders all 5 interconnected realms, seasonal biome transitions, dynamic weather,
 * instanced forests/props, composite storybook cottages, Great Lantern Tree,
 * and pooled composite 3D Mochi characters while syncing 1:1 with the 2D simulation grid.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import {
  N,
  T,
  hash,
  vn,
  fbm,
  PlayerLook,
  Town,
  TownArchStyle,
  NPC,
  HollowCreature,
  StarGem,
  Pearl,
  Feather,
  Ring,
  FishAmbient,
  QuestItem,
  BloomEffect,
  MagicRing,
  Particle,
  CottageState,
  getNpcLayer,
  getPlayerLayer,
} from './engine';
import {
  HOUSE_ORIGIN_TX,
  HOUSE_ORIGIN_TZ,
  HouseInteriorHandle,
  buildHouseInterior3D,
} from './houseInterior3D';
import type { SeasonId, WeatherId } from './constants';
import { SEASON_THEMES, getSeasonalBiomeColor } from './seasons';
import { getSeasonalSpellVariant } from './seasonalSpells';
import {
  GLOWDEEP_RETURN_TILE,
  MOONROAD_RETURN_TILE,
  getGlowdeepCell,
  getMoonRoadCell,
  distToSegment,
} from './realmCells';
import { WORLD_ANCHORS } from './worldAnchors';
import {
  MochiRig,
  CompanionRig,
  createMochiRig,
  updateMochiRig,
  createCompanionRig,
  updateCompanionRig,
  disposeCompanionRig,
  getSoftShadowTexture,
} from './mochiModel3D';
import { WorldLandmark3D, buildAllLandmarks3D } from './landmarks3D';
import {
  ArchMaterialPack,
  createArchMaterialPack,
  buildDetailedCottage,
  buildDetailedHeroMochiHouse,
  buildDetailedFountainWaystone,
  buildDetailedBubbleDome,
  buildDetailedGreatLanternTree,
  buildDetailedPortalArch,
  buildDetailedCauldronShrine,
  buildDetailedTeaHouseGazebo,
  buildDetailedMarketStall,
  buildDetailedTownWell,
  buildDetailedFestivalArch,
  buildDetailedFlowerCart,
  buildDetailedBistroSet,
  buildDetailedHarborPierCluster,
  buildDetailedNoticeboard,
} from './architecturePack3D';
import {
  SharedWorldShaderUniforms,
  createWorldShaderUniforms,
  createSkyDomeMaterial,
  applyTerrainShader,
  applyWaterShader,
  applyFoliageShader,
  applyUnderwaterSwayShader,
  applyGrassShader,
  applyCritterWingShader,
  createCumulusCloudGeometry,
  createOrganicTreeTrunkGeometry,
  createOrganicLeafClusterGeometry,
  createFlutedPineBoughGeometry,
  createGrassTuftGeometry,
  createCritterWingGeometry,
  createOutdoorEnvScene,
  createToadstoolCapGeometry,
  createWildflowerBlossomGeometry,
  createCoastalSkiffHullGeometry,
  createWeatherCrystalGeometry,
  createLilyPadGeometry,
} from './worldShaders3D';
import {
  evaluateReefFishPose,
  ReefFishSampleOut,
  collectVisibleSkyIslandAnchors,
} from './ambientWildlife';

const _fishPoseScratch: ReefFishSampleOut = {
  tx: 0,
  tz: 0,
  vx: 0,
  vz: 0,
  yaw: 0,
  pitch: 0,
  roll: 0,
  liftY: 0.45,
  scaleMul: 1,
  tailFreq: 11,
  tailAmp: 0.42,
  bodySwayAmp: 0.12,
};

export type CameraPreset3D =
  | 'cozy'
  | 'close'
  | 'vista'
  | 'first_person'
  | 'third_forward'
  | 'third_backward';

export interface RealmCollectible3D {
  x: number;
  y: number;
  got: number;
}

export interface World3DSyncState {
  B: Uint8Array;
  DK: Uint8Array;
  UD: Uint8Array;
  TW: Uint8Array;
  SB: Uint8Array;
  SD: Uint8Array;
  stars: StarGem[];
  pearls: Pearl[];
  feathers: Feather[];
  rings: Ring[];
  glowSpores: RealmCollectible3D[];
  moonNotes: RealmCollectible3D[];
  questItems: QuestItem[];
  fish: FishAmbient[];
  towns: Town[];
  npcs: NPC[];
  hollows: HollowCreature[];
  blooms: BloomEffect[];
  magicRings: MagicRing[];
  particles: Particle[];
  iceMap: Map<number, number>;
  lilyMap?: Map<number, number>;
  hotSprings?: { x: number; y: number; expires: number }[];
  dkRevision?: number;
  echoTargets3D?: { x: number; y: number; kind: 'echo' | 'diary' }[];
  glowdeepPortal?: { x: number; y: number; open: boolean };
  moonGatePortal?: { x: number; y: number; open: boolean };
  playerHomePortal?: { x: number; y: number; doorX: number; doorY: number };
  dashGhosts: { x: number; y: number; face: number; alpha: number }[];
  player: {
    x: number;
    y: number;
    dx: number;
    dy: number;
    face: number;
    sky: boolean;
    dive: boolean;
    glowdeep: boolean;
    moonroad: boolean;
    house?: boolean;
    isMoving: boolean;
    moveTarget: { x: number; y: number } | null;
    z?: number;
    vz?: number;
    vx?: number;
    vy?: number;
    swim?: boolean;
    isSprinting?: boolean;
  };
  companionPos: { x: number; y: number };
  playerLook: PlayerLook;
  companionId: string;
  time: number;
  season: SeasonId;
  weatherId: WeatherId;
  weatherParticleType: string;
  nightCycleEnabled: boolean;
  lullabyDone: boolean;
  fireplaceLit: boolean;
  cottage?: CottageState;
  aquariumFishList?: string[];
  nearestNpc: NPC | null;
  activeSpellTimers: {
    frostShieldTimer: number;
    hugTimer: number;
    starSenseTimer: number;
    dawnTimer: number;
    warmthTimer: number;
    dreamwalkTimer: number;
    tideTimer: number;
    moonPullTimer: number;
    echoTimer?: number;
    frostGlowTimer?: number;
    thermalGlideTimer?: number;
    echoMagnetTimer?: number;
  };
  lowQuality: boolean;
  isTitleMode: boolean;
  cameraYaw: number;
  cameraPitch?: number;
  cameraZoom: number;
  cameraPreset: CameraPreset3D;
  cameraShake?: { x: number; y: number };
  fishing?: {
    active: boolean;
    mode: 'idle' | 'reeling' | 'celebrate';
    ledgeTx: number;
    ledgeTz: number;
    waterTx: number;
    waterTz: number;
    facingYaw: number;
    reelProgress: number;
    caughtFishColor?: string;
    celebrateElapsed?: number;
  };
}

// Module-level reusable math scratch objects (zero-GC inside animation loop)
const _v3 = new THREE.Vector3();
const _v3b = new THREE.Vector3();
const _v3Up = new THREE.Vector3(0, 1, 0);
const _v3Dir = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scale = new THREE.Vector3();
const _m4 = new THREE.Matrix4();
const _col = new THREE.Color();
const _col2 = new THREE.Color();
const _col3 = new THREE.Color();
const _col4 = new THREE.Color();
const _hsl = { h: 0, s: 0, l: 0 };
const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function enrichVibrantColor(
  c: THREE.Color,
  satBoost = 0.24,
  lightShift = -0.04,
  minChroma = 0.08
): THREE.Color {
  const maxC = Math.max(c.r, c.g, c.b);
  const minC = Math.min(c.r, c.g, c.b);
  const chroma = maxC - minC;
  if (chroma < minChroma) return c; // keep sparkling snow & clouds crisp white
  c.getHSL(_hsl);
  const nextS = Math.min(1.0, _hsl.s + satBoost * (1 - _hsl.s * 0.32));
  const scaledShift = lightShift * Math.min(1, chroma * 2.4);
  const nextL = Math.max(0.06, Math.min(0.92, _hsl.l + scaledShift));
  c.setHSL(_hsl.h, nextS, nextL);
  return c;
}

const CHUNK_HALF = 30; // 60x60 tiles visible terrain
const CHUNK_SIZE = CHUNK_HALF * 2;
const PROP_RADIUS = 23;
const PROP_RADIUS_LOW = 16;

const TOWN_ROOF_HEX = [0xe86f88, 0x5ea0de, 0xeb9d4d, 0x8574dc, 0x57b181];

function detectSoftwareWebGL(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  try {
    let rendererStr = String(gl.getParameter(gl.RENDERER) || '');
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      const unmasked = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
      if (unmasked) rendererStr += ' ' + String(unmasked);
    }
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render|Mesa Offscreen/i.test(rendererStr);
  } catch {
    return false;
  }
}

const TERRAIN_SUBDIV = 2; // 0.5-tile grid resolution for silky smooth slopes & coastlines

interface TerraceAnchor {
  tx: number;
  tz: number;
  baseH: number;
  innerR: number;
  outerR: number;
}

let activeSurfaceTerraces: TerraceAnchor[] = [];
let activeDiveTerraces: TerraceAnchor[] = [];
let activeSkyTerraces: TerraceAnchor[] = [];
let activeGlowdeepTerraces: TerraceAnchor[] = [];
let activeMoonTerraces: TerraceAnchor[] = [];

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep01(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function applyTerraceFlatten(h: number, tx: number, tz: number, terraces: readonly TerraceAnchor[]): number {
  let maxW = 0;
  let targetH = h;
  for (let i = 0; i < terraces.length; i++) {
    const tr = terraces[i];
    const dx = tx - tr.tx;
    const dz = tz - tr.tz;
    const dSq = dx * dx + dz * dz;
    if (dSq >= tr.outerR * tr.outerR) continue;
    const d = Math.sqrt(dSq);
    const w = 1 - smoothstep01(tr.innerR, tr.outerR, d);
    if (w > maxW) {
      maxW = w;
      targetH = tr.baseH;
    }
  }
  return maxW > 0 ? h + (targetH - h) * maxW : h;
}

function sampleSurfaceMacroTileH(ix: number, iz: number, B: Uint8Array): number {
  const x = Math.max(0, Math.min(N - 1, ix));
  const z = Math.max(0, Math.min(N - 1, iz));
  const b = B[z * N + x];
  if (b === 0) return -0.82;
  if (b === 1) return -0.19;
  if (b === 2) return 0.19;
  if (b === 3) return 0.50;
  if (b === 4) return 0.32;
  if (b === 5) return 0.62;
  if (b === 6) return 0.88;
  if (b === 7) return 1.04;
  return 2.48; // b === 8 Mountain massif
}

function sampleSurfaceFilteredMacro(tx: number, tz: number, B: Uint8Array): number {
  const rx = Math.round(tx);
  const rz = Math.round(tz);
  // 9-tap diamond kernel spanning ±2.5 tiles for wide, natural mountain foothills & valleys
  const hC = sampleSurfaceMacroTileH(rx, rz, B);
  const hN = sampleSurfaceMacroTileH(rx, rz - 2, B);
  const hS = sampleSurfaceMacroTileH(rx, rz + 2, B);
  const hW = sampleSurfaceMacroTileH(rx - 2, rz, B);
  const hE = sampleSurfaceMacroTileH(rx + 2, rz, B);
  const hNW = sampleSurfaceMacroTileH(rx - 1, rz - 1, B);
  const hNE = sampleSurfaceMacroTileH(rx + 1, rz - 1, B);
  const hSW = sampleSurfaceMacroTileH(rx - 1, rz + 1, B);
  const hSE = sampleSurfaceMacroTileH(rx + 1, rz + 1, B);
  return hC * 0.24 + (hN + hS + hW + hE) * 0.10 + (hNW + hNE + hSW + hSE) * 0.09;
}

function getBathymetryRelief(tx: number, tz: number, isShallow: boolean): number {
  const rf = WORLD_ANCHORS.reef;

  // 1. Starlit Kelp Trench: deep V-shaped NW-SE submarine tectonic rift (-2.10)
  const dKelpAxis =
    distToSegment(
      tx,
      tz,
      rf.starlitKelpTrench.tx - 16,
      rf.starlitKelpTrench.ty - 12,
      rf.starlitKelpTrench.tx + 16,
      rf.starlitKelpTrench.ty + 14
    ) +
    (vn(tx * 0.11, tz * 0.11, 71) - 0.5) * 2.6;
  const kelpTrenchWall = 1 - smoothstep01(1.8, 8.4, dKelpAxis);
  const kelpRim = smoothstep01(4.6, 8.8, dKelpAxis) * (1 - smoothstep01(8.8, 14.5, dKelpAxis));

  // 2. Coral Concert Hall: sculpted submarine amphitheater bowl
  const dCoral = Math.hypot(tx - rf.coralConcertHall.tx, tz - rf.coralConcertHall.ty);
  const coralBowl = 1 - smoothstep01(2.4, 7.2, dCoral);
  const coralRim = smoothstep01(5.4, 8.4, dCoral) * (1 - smoothstep01(8.4, 12.6, dCoral));

  // 3. Atoll Sunken Ruins: sunken cove basin
  const dRuins = Math.hypot(tx - rf.atollSunkenRuins.tx, tz - rf.atollSunkenRuins.ty);
  const ruinsBowl = 1 - smoothstep01(1.6, 5.2, dRuins);

  // 4. Sunken Pearl Grotto: western reef amphitheater grotto
  const dGrotto = Math.hypot(tx - rf.sunkenPearlGrotto.tx, tz - rf.sunkenPearlGrotto.ty);
  const grottoBowl = 1 - smoothstep01(2.0, 6.4, dGrotto);

  // 5. Outer Quadrant Ocean Basins & Shelves (aurora trench, whale sanctuary, abyssal garden, thermal vents, starfall plaza)
  const dAuroraTrench = Math.hypot(tx - rf.auroraCoralTrench.tx, tz - rf.auroraCoralTrench.ty);
  const auroraBowl = 1 - smoothstep01(2.2, 7.6, dAuroraTrench);
  const dWestGarden = Math.hypot(tx - rf.westernAbyssalGarden.tx, tz - rf.westernAbyssalGarden.ty);
  const westGardenBowl = 1 - smoothstep01(2.0, 7.0, dWestGarden);
  const dStarfallSea = Math.hypot(tx - rf.starfallSunkenPlaza.tx, tz - rf.starfallSunkenPlaza.ty);
  const starfallBowl = 1 - smoothstep01(2.2, 7.2, dStarfallSea);
  const dVents = Math.hypot(tx - rf.cinderThermalVents.tx, tz - rf.cinderThermalVents.ty);
  const ventsMound = smoothstep01(4.2, 7.5, dVents) * (1 - smoothstep01(7.5, 11.5, dVents));

  // 6. Winding abyssal oceanic trenches between outer islands vs raised coral seamount banks
  const riftWave = Math.abs(
    Math.sin(tx * 0.036 + tz * 0.028 + (vn(tx * 0.025, tz * 0.025, 72) - 0.5) * 3.1)
  );
  const abyssRift = 1 - smoothstep01(0.06, 0.34, riftWave);
  const reefSeamount = smoothstep01(0.54, 0.92, fbm(tx * 0.042, tz * 0.042, 73));

  if (isShallow) {
    const shelfRipple = (vn(tx * 0.22, tz * 0.22, 74) - 0.5) * 0.09;
    return -0.17 + shelfRipple - ruinsBowl * 0.38 - coralBowl * 0.48 - grottoBowl * 0.34;
  }

  let depth = -0.62 - abyssRift * 0.96 + reefSeamount * 0.34;
  depth -= kelpTrenchWall * 1.42;
  depth += kelpRim * 0.24;
  depth -= coralBowl * 0.52;
  depth += coralRim * 0.22;
  depth -= grottoBowl * 0.48;
  depth -= auroraBowl * 0.42 + westGardenBowl * 0.34 + starfallBowl * 0.36;
  depth += ventsMound * 0.26;
  depth += (vn(tx * 0.19, tz * 0.19, 75) - 0.5) * 0.14;
  return Math.max(-2.18, Math.min(-0.22, depth));
}

// Precomputed O(1) surface terrain heightfield cache (rebuilt once per world generation B array)
let cachedSurfaceGridB: Uint8Array | null = null;
let cachedSurfaceGrid: Float32Array | null = null;
const SURFACE_GRID_STRIDE = N + 1;

function computeExactRawSurfaceTerrainH(tx: number, tz: number, B: Uint8Array): number {
  const cx = Math.max(0, Math.min(N - 1, Math.floor(tx)));
  const cz = Math.max(0, Math.min(N - 1, Math.floor(tz)));
  const b = B[cz * N + cx];

  if (b < 2) {
    const rx = Math.round(tx);
    const rz = Math.round(tz);
    let landNear = 0;
    for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
      const nx = Math.max(0, Math.min(N - 1, rx + ox));
      const nz = Math.max(0, Math.min(N - 1, rz + oz));
      if (B[nz * N + nx] >= 2) landNear += Math.abs(ox) + Math.abs(oz) === 1 ? 0.45 : 0.22;
    }
    const coastShelf = clamp01(landNear);
    const bathy = getBathymetryRelief(tx, tz, b === 1);
    return Math.min(-0.08, bathy * (1 - coastShelf * 0.55) - 0.11 * coastShelf);
  }

  const rx = Math.round(tx);
  const rz = Math.round(tz);
  let waterNear = 0;
  for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
    const nx = Math.max(0, Math.min(N - 1, rx + ox));
    const nz = Math.max(0, Math.min(N - 1, rz + oz));
    if (B[nz * N + nx] < 2) waterNear += Math.abs(ox) + Math.abs(oz) === 1 ? 0.55 : 0.24;
  }
  const coastAtten = 1 - clamp01(waterNear) * 0.84;

  const sx = tx - 0.5;
  const sz = tz - 0.5;
  const x0 = Math.floor(sx);
  const z0 = Math.floor(sz);
  const fx = sx - x0;
  const fz = sz - z0;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const f00 = sampleSurfaceFilteredMacro(x0, z0, B);
  const f10 = sampleSurfaceFilteredMacro(x0 + 1, z0, B);
  const f01 = sampleSurfaceFilteredMacro(x0, z0 + 1, B);
  const f11 = sampleSurfaceFilteredMacro(x0 + 1, z0 + 1, B);
  let h = (f00 * (1 - ux) + f10 * ux) * (1 - uz) + (f01 * (1 - ux) + f11 * ux) * uz;

  const isl = WORLD_ANCHORS.islands;
  const tws = WORLD_ANCHORS.towns;

  // 1. Lantern Isle Central Heart Valley
  const dCenterValley = Math.hypot(tx - isl.lanternIsle.tx, tz - isl.lanternIsle.ty);
  const centerValleyMask = 1 - smoothstep01(10.0, 25.0, dCenterValley);
  h = h * (1 - centerValleyMask * 0.72) + 0.39 * (centerValleyMask * 0.72);

  // 2. Rolling Meadow & Blossom Hills
  const rollingHills =
    (fbm(tx * 0.042, tz * 0.042, 41) - 0.42) * 1.15 +
    Math.sin(tx * 0.13 + tz * 0.085) * Math.cos(tz * 0.12 - tx * 0.075) * 0.22;
  if (b === 3 || b === 5) {
    h += Math.max(-0.12, rollingHills * 0.62) * (1 - centerValleyMask * 0.82);
  }

  // 3. Honeycomb Hills: iconic rolling golden clover hills & hilltop mill ridge
  const dHoney = Math.hypot(tx - isl.honeycombHills.tx, tz - isl.honeycombHills.ty);
  if (dHoney < 26) {
    const honeyMask = 1 - smoothstep01(13.5, 25.0, dHoney);
    const hillUndul =
      0.56 +
      0.42 * (Math.sin(tx * 0.17) * Math.cos(tz * 0.15) * 0.5 + 0.5) +
      0.34 * vn(tx * 0.11, tz * 0.11, 42);
    h += honeyMask * hillUndul;
  }

  // 4. Whisper Woods & Mossgate Sheltered Valley
  if (b === 4) {
    const dMoss = Math.hypot(tx - tws.mossgate.tx, tz - tws.mossgate.ty);
    const mossHollow = 1 - smoothstep01(7.5, 21.0, dMoss);
    const forestHollow = (fbm(tx * 0.055, tz * 0.055, 43) - 0.55) * 0.34;
    h = h * 0.68 + 0.27 * 0.32 + forestHollow - mossHollow * 0.11;
  }

  // 5. Mirror Fens Wetland Valley
  const dFens = Math.hypot(tx - isl.mirrorFens.tx, tz - isl.mirrorFens.ty);
  if (dFens < 23) {
    const fenBasin = 1 - smoothstep01(4.8, 13.0, dFens);
    const fenBank = smoothstep01(9.5, 14.2, dFens) * (1 - smoothstep01(14.2, 20.5, dFens));
    h = h * (1 - fenBasin * 0.78) + 0.22 * (fenBasin * 0.78) + fenBank * 0.28;
  }

  // 6. Sunlit Dunes Slot Canyons & Terraced Sandstone Mesas
  if (b === 6 && tz < isl.cinderCradle.ty - 32) {
    const ox = tws.oasisRest.tx;
    const oz = tws.oasisRest.ty;
    const canyonWiggle = (vn(tx * 0.085, tz * 0.085, 44) - 0.5) * 4.5;
    const dCan1 = distToSegment(tx, tz, ox - 16, oz - 16, ox + 22, oz + 20) + canyonWiggle;
    const dCan2 = distToSegment(tx, tz, ox, oz, ox + 24, oz - 14) + canyonWiggle * 0.75;
    const dCan = Math.min(dCan1, dCan2);
    const dOasis = Math.hypot(tx - ox, tz - oz);
    const oasisBasin = 1 - smoothstep01(3.2, 8.6, dOasis);

    if (dCan < 3.6 || oasisBasin > 0.35) {
      const gorgeFactor = Math.max(1 - smoothstep01(1.4, 3.8, dCan), oasisBasin);
      h = h * (1 - gorgeFactor * 0.85) + 0.28 * (gorgeFactor * 0.85);
    } else {
      const mesaRise = smoothstep01(2.6, 7.6, dCan) * (1 - oasisBasin);
      const rawMesa = h + mesaRise * (0.68 + 0.78 * fbm(tx * 0.085, tz * 0.085, 45));
      h = rawMesa + Math.sin(rawMesa * Math.PI * 2.1) * 0.13;
    }
  }

  // 7. Pebble Peaks & Northern Frostholm Alpine Mountain Massif
  if (b === 8 || b === 7) {
    const ridgeA = 1 - Math.abs(Math.sin(tx * 0.18 + Math.cos(tz * 0.15) * 1.45));
    const ridgeB = 1 - Math.abs(Math.cos(tz * 0.22 - Math.sin(tx * 0.14) * 1.25));
    const alpineCrest = ridgeA * 0.62 + ridgeB * 0.38;
    const detailPeak = fbm(tx * 0.085, tz * 0.085, 46);
    if (b === 8) {
      h += alpineCrest * 1.22 + detailPeak * 0.74;
    } else {
      h += alpineCrest * 0.44 + (detailPeak - 0.35) * 0.48;
    }
  }

  // 8. Cinder Cradle Volcanic Peak & Geothermal Caldera
  const dCinder = Math.hypot(tx - isl.cinderCradle.tx, tz - isl.cinderCradle.ty);
  if (dCinder < 24) {
    const dCrater = Math.hypot(tx - isl.cinderCradle.tx, tz - (isl.cinderCradle.ty - 7.5));
    const cone = (1 - smoothstep01(3.0, 14.5, dCrater)) * 2.25;
    const calderaBowl = (1 - smoothstep01(1.0, 3.8, dCrater)) * 1.5;
    const southSlope = smoothstep01(isl.cinderCradle.ty - 5, isl.cinderCradle.ty + 6, tz) * 0.55;
    h += Math.max(0, cone - calderaBowl - southSlope);
  }

  // 9. Aurora Reach Glacial Massif
  const dAurora = Math.hypot(tx - isl.auroraReach.tx, tz - isl.auroraReach.ty);
  if (dAurora < 24) {
    const dPeakAu = Math.hypot(tx - isl.auroraReach.tx, tz - (isl.auroraReach.ty - 6));
    const glacierRidge = 1 - Math.abs(Math.sin(tx * 0.24 - tz * 0.2));
    h += (1 - smoothstep01(2.6, 15.5, dPeakAu)) * (1.3 + glacierRidge * 0.85);
  }

  // 10. Chime Canopy Twin Wooded Valley Ridges
  const dChime = Math.hypot(tx - isl.chimeCanopy.tx, tz - isl.chimeCanopy.ty);
  if (dChime < 22) {
    const dxBell = Math.abs(tx - isl.chimeCanopy.tx);
    const sideRidge = smoothstep01(3.0, 9.5, dxBell) * (1 - smoothstep01(9.5, 17.5, dxBell));
    h += sideRidge * 0.86;
  }

  // 11. Dawn Spire Eastern Mountain Peak
  const dDawn = Math.hypot(tx - isl.dawnSpire.tx, tz - isl.dawnSpire.ty);
  if (dDawn < 22) {
    const islandMask = 1 - smoothstep01(12.5, 20.5, dDawn);
    const eastAscent =
      smoothstep01(isl.dawnSpire.tx - 16, isl.dawnSpire.tx + 2, tx) *
      (1 - smoothstep01(isl.dawnSpire.tx + 4, isl.dawnSpire.tx + 14, tx) * 0.55);
    const summitCrown = 1 - smoothstep01(2.2, 10.5, dDawn);
    h += islandMask * (eastAscent * 1.6 + summitCrown * 0.75);
  }

  // 12. Tidepool Atoll Gentle Knoll
  const dAtoll = Math.hypot(tx - isl.tidepoolAtoll.tx, tz - isl.tidepoolAtoll.ty);
  if (dAtoll < 16) {
    h += (1 - smoothstep01(3.0, 14.0, dAtoll)) * 0.36;
  }

  // 13. Expanded Outer Islands: Sapphire Bluff, Maple Mist Isle, Starfall Shoals
  const dSapphire = Math.hypot(tx - isl.sapphireBluff.tx, tz - isl.sapphireBluff.ty);
  if (dSapphire < 21) {
    const bluffMask = 1 - smoothstep01(9.0, 18.5, dSapphire);
    const cliffStep = Math.sin(bluffMask * Math.PI * 1.4) * 0.35;
    h += bluffMask * 0.92 + cliffStep * 0.3;
  }
  const dMaple = Math.hypot(tx - isl.mapleMist.tx, tz - isl.mapleMist.ty);
  if (dMaple < 20) {
    h += (1 - smoothstep01(4.0, 16.5, dMaple)) * 0.64;
  }
  const dStarfall = Math.hypot(tx - isl.starfallShoals.tx, tz - isl.starfallShoals.ty);
  if (dStarfall < 21) {
    h += (1 - smoothstep01(3.5, 17.5, dStarfall)) * 1.15;
  }

  const microUndul =
    Math.sin(tx * 0.34) * Math.cos(tz * 0.31) * 0.055 +
    Math.sin(tx * 0.14 - tz * 0.12) * 0.04;
  const elevated = 0.16 + (h - 0.16) * coastAtten + microUndul * (0.45 + 0.55 * coastAtten);
  return Math.max(0.13, elevated);
}

function ensureSurfaceHeightGrid(B: Uint8Array): Float32Array {
  if (cachedSurfaceGrid && cachedSurfaceGridB === B) {
    return cachedSurfaceGrid;
  }
  const grid = cachedSurfaceGrid || new Float32Array(SURFACE_GRID_STRIDE * SURFACE_GRID_STRIDE);
  for (let z = 0; z < SURFACE_GRID_STRIDE; z++) {
    const row = z * SURFACE_GRID_STRIDE;
    for (let x = 0; x < SURFACE_GRID_STRIDE; x++) {
      grid[row + x] = computeExactRawSurfaceTerrainH(x, z, B);
    }
  }
  cachedSurfaceGrid = grid;
  cachedSurfaceGridB = B;
  return grid;
}

function getRawSurfaceTerrainH(
  tx: number,
  tz: number,
  B: Uint8Array,
  iceMap: Map<number, number>,
  lilyMap?: Map<number, number>
): number {
  const cx = Math.max(0, Math.min(N - 1, Math.floor(tx)));
  const cz = Math.max(0, Math.min(N - 1, Math.floor(tz)));
  const cIdx = cz * N + cx;
  if (B[cIdx] < 2 && (iceMap.has(cIdx) || (lilyMap && lilyMap.has(cIdx)))) return 0.08;

  const grid = ensureSurfaceHeightGrid(B);
  const clampedX = Math.max(0, Math.min(N, tx));
  const clampedZ = Math.max(0, Math.min(N, tz));
  const x0 = Math.min(N - 1, Math.floor(clampedX));
  const z0 = Math.min(N - 1, Math.floor(clampedZ));
  const fx = clampedX - x0;
  const fz = clampedZ - z0;
  const i00 = z0 * SURFACE_GRID_STRIDE + x0;
  const h00 = grid[i00];
  const h10 = grid[i00 + 1];
  const h01 = grid[i00 + SURFACE_GRID_STRIDE];
  const h11 = grid[i00 + SURFACE_GRID_STRIDE + 1];
  return (h00 * (1 - fx) + h10 * fx) * (1 - fz) + (h01 * (1 - fx) + h11 * fx) * fz;
}

function sampleGlowdeepBaseH(ix: number, iz: number): number {
  const x = Math.max(0, Math.min(N - 1, ix));
  const z = Math.max(0, Math.min(N - 1, iz));
  const cell = getGlowdeepCell(x, z);
  if (cell === 'wall') {
    const spire = Math.abs(Math.sin(x * 0.46) * Math.cos(z * 0.42)) * 0.85;
    return 2.32 + spire + vn(x * 0.25, z * 0.25, 87) * 0.45;
  }
  if (cell === 'canal') return -0.48;
  if (cell === 'roots') return 0.18;
  if (cell === 'cinder') return 0.16 + Math.sin(x * 0.28 + z * 0.22) * 0.12;
  return 0.08;
}

function sampleSkyBaseH(ix: number, iz: number, SB: Uint8Array): number {
  const x = Math.max(0, Math.min(N - 1, ix));
  const z = Math.max(0, Math.min(N - 1, iz));
  const sb = SB[z * N + x];
  if (sb === 0) return -0.86;
  if (sb === 4) return 0.92;
  if (sb === 2) return 0.66;
  return 0.42;
}

function sampleMoonRoadBaseH(ix: number, iz: number): number {
  const x = Math.max(0, Math.min(N - 1, ix));
  const z = Math.max(0, Math.min(N - 1, iz));
  const cell = getMoonRoadCell(x, z);
  if (cell === 'silence') return 0.68;
  if (cell === 'platform') return 0.46;
  if (cell === 'road') return 0.34;
  if (cell === 'nebula') return 0.22;
  return -1.48;
}

export type WorldLayer3D = 'surface' | 'sky' | 'dive' | 'glowdeep' | 'moonroad' | 'house';

export function getTerrainHeight3D(
  tx: number,
  tz: number,
  layer: WorldLayer3D,
  B: Uint8Array,
  SB: Uint8Array,
  iceMap: Map<number, number>,
  lilyMap?: Map<number, number>
): number {
  if (layer === 'house') return 0;

  if (layer === 'surface') {
    let h = getRawSurfaceTerrainH(tx, tz, B, iceMap, lilyMap);
    if (bIsDryForTerrace(tx, tz, B) && activeSurfaceTerraces.length) {
      h = applyTerraceFlatten(h, tx, tz, activeSurfaceTerraces);
    }
    return h;
  }

  const sx = tx - 0.5;
  const sz = tz - 0.5;
  const x0 = Math.floor(sx);
  const z0 = Math.floor(sz);
  const fx = sx - x0;
  const fz = sz - z0;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);

  if (layer === 'sky') {
    const h00 = sampleSkyBaseH(x0, z0, SB);
    const h10 = sampleSkyBaseH(x0 + 1, z0, SB);
    const h01 = sampleSkyBaseH(x0, z0 + 1, SB);
    const h11 = sampleSkyBaseH(x0 + 1, z0 + 1, SB);
    let base = (h00 * (1 - ux) + h10 * ux) * (1 - uz) + (h01 * (1 - ux) + h11 * ux) * uz;
    if (base > 0) {
      const sk = WORLD_ANCHORS.sky;
      const dCastle = Math.hypot(tx - sk.cirrusCastle.tx, tz - sk.cirrusCastle.ty);
      const dUpdraft = Math.hypot(tx - sk.sunriseUpdraftSpire.tx, tz - sk.sunriseUpdraftSpire.ty);
      const dGarden = Math.hypot(tx - sk.aetherGarden.tx, tz - sk.aetherGarden.ty);
      base += (1 - smoothstep01(4.5, 16.0, dCastle)) * 0.48;
      base += (1 - smoothstep01(3.0, 12.5, dUpdraft)) * 0.74;
      base += (1 - smoothstep01(3.5, 12.0, dGarden)) * 0.36;
      base += Math.sin(tx * 0.28 + tz * 0.24) * 0.08;
      if (activeSkyTerraces.length) {
        base = applyTerraceFlatten(base, tx, tz, activeSkyTerraces);
      }
    }
    return base;
  }
  if (layer === 'dive') {
    const cx = Math.max(0, Math.min(N - 1, Math.floor(tx)));
    const cz = Math.max(0, Math.min(N - 1, Math.floor(tz)));
    const bHere = B[cz * N + cx];
    let h = getBathymetryRelief(tx, tz, bHere === 1);
    if (bHere >= 2) {
      // Smooth central sunlit sea-cavern floor so players swim cleanly straight across the middle
      const dHeart = Math.hypot(tx - WORLD_ANCHORS.reef.heartReefVault.tx, tz - WORLD_ANCHORS.reef.heartReefVault.ty);
      const heartBowl = 1 - smoothstep01(3.0, 9.5, dHeart);
      h = h * 0.65 - 0.16 - heartBowl * 0.18;
    }
    if (activeDiveTerraces.length) {
      h = applyTerraceFlatten(h, tx, tz, activeDiveTerraces);
    }
    return h;
  }
  if (layer === 'glowdeep') {
    const h00 = sampleGlowdeepBaseH(x0, z0);
    const h10 = sampleGlowdeepBaseH(x0 + 1, z0);
    const h01 = sampleGlowdeepBaseH(x0, z0 + 1);
    const h11 = sampleGlowdeepBaseH(x0 + 1, z0 + 1);
    let base = (h00 * (1 - ux) + h10 * ux) * (1 - uz) + (h01 * (1 - ux) + h11 * ux) * uz;
    if (activeGlowdeepTerraces.length) {
      base = applyTerraceFlatten(base, tx, tz, activeGlowdeepTerraces);
    }
    const gd = WORLD_ANCHORS.glowdeep;
    const dRoot = Math.hypot(tx - gd.rootedRest.tx, tz - gd.rootedRest.ty);
    const dCons = Math.hypot(tx - gd.crystalConservatory.tx, tz - gd.crystalConservatory.ty);
    if (dRoot < 7.0 || dCons < 6.5) return 0.16;
    return base + Math.sin(tx * 0.55) * Math.cos(tz * 0.52) * 0.04;
  }

  // Smooth bilinear Moon Road elevation across platforms, silver bridges, silence watchtower & walkable nebulae
  const m00 = sampleMoonRoadBaseH(x0, z0);
  const m10 = sampleMoonRoadBaseH(x0 + 1, z0);
  const m01 = sampleMoonRoadBaseH(x0, z0 + 1);
  const m11 = sampleMoonRoadBaseH(x0 + 1, z0 + 1);
  let moonH = (m00 * (1 - ux) + m10 * ux) * (1 - uz) + (m01 * (1 - ux) + m11 * ux) * uz;
  if (activeMoonTerraces.length) {
    moonH = applyTerraceFlatten(moonH, tx, tz, activeMoonTerraces);
  }
  return moonH;
}

function bIsDryForTerrace(tx: number, tz: number, B: Uint8Array): boolean {
  const cx = Math.max(0, Math.min(N - 1, Math.floor(tx)));
  const cz = Math.max(0, Math.min(N - 1, Math.floor(tz)));
  return B[cz * N + cx] >= 2;
}

function getActorGroundY3D(
  x2d: number,
  y2d: number,
  layer: WorldLayer3D,
  B: Uint8Array,
  SB: Uint8Array,
  iceMap: Map<number, number>,
  lilyMap?: Map<number, number>
): number {
  if (layer === 'house') return 0;
  const tx = x2d / T;
  const tz = y2d / T;
  const h = getTerrainHeight3D(tx, tz, layer, B, SB, iceMap, lilyMap);
  if (layer === 'surface' && h < 0) return -0.2; // buoyant swimming depth in translucent water surface
  if (layer === 'sky' && h < 0) return 0.36; // flying on cloud wings
  if (layer === 'moonroad' && h < 0.15) return 0.24;
  return h;
}

interface InstancedBatch {
  mesh: THREE.InstancedMesh;
  max: number;
  count: number;
}

const DOF_FULLSCREEN_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Separable 9-tap (5 bilinear fetch) Gaussian blur for silky miniature diorama bokeh without halo noise
const DOF_GAUSSIAN_FRAG = /* glsl */ `
  uniform sampler2D tInput;
  uniform vec2 uTexelStep;
  varying vec2 vUv;

  void main() {
    vec2 step1 = uTexelStep * 1.3846153846;
    vec2 step2 = uTexelStep * 3.2307692308;

    vec4 col = texture2D(tInput, vUv) * 0.2270270270;
    col += texture2D(tInput, clamp(vUv + step1, vec2(0.0), vec2(1.0))) * 0.3162162162;
    col += texture2D(tInput, clamp(vUv - step1, vec2(0.0), vec2(1.0))) * 0.3162162162;
    col += texture2D(tInput, clamp(vUv + step2, vec2(0.0), vec2(1.0))) * 0.0702702703;
    col += texture2D(tInput, clamp(vUv - step2, vec2(0.0), vec2(1.0))) * 0.0702702703;
    gl_FragColor = col;
  }
`;

const DOF_TILT_COMPOSITE_FRAG = /* glsl */ `
  #include <packing>

  uniform sampler2D tDiffuse;
  uniform sampler2D tBlur;
  uniform sampler2D tDepth;

  uniform float uCamNear;
  uniform float uCamFar;
  uniform float uFocusDist;
  uniform float uFocusBand;
  uniform float uFarSpan;
  uniform float uNearSafe;
  uniform float uBlurStrength;
  uniform float uTiltShiftStrength;
  uniform float uMaxMix;

  varying vec2 vUv;

  void main() {
    vec4 sharp = texture2D(tDiffuse, vUv);
    vec4 blurred = texture2D(tBlur, vUv);

    float fragCoordZ = texture2D(tDepth, vUv).x;
    float viewZ = perspectiveDepthToViewZ(fragCoordZ, uCamNear, uCamFar);
    float depthDist = fragCoordZ >= 0.9999 ? uCamFar : max(uCamNear, -viewZ);

    // Subtle distance-based CoC keeping player & immediate village sharp, softly blurring extreme horizon
    float farDelta = max(0.0, depthDist - (uFocusDist + uFocusBand));
    float farCoC = smoothstep(0.0, max(1.0, uFarSpan), farDelta);

    // Cozy diorama tilt-shift vertical gradient gated by depth so central subjects stay razor-sharp
    float topBand = smoothstep(0.16, 0.48, max(0.0, vUv.y - 0.5));
    float topDepthWeight = smoothstep(0.0, 9.0, max(0.0, depthDist - (uFocusDist - 1.5)));
    float topTilt = topBand * topDepthWeight;

    float botBand = smoothstep(0.24, 0.49, max(0.0, 0.5 - vUv.y));
    float botDepthWeight = smoothstep(1.5, 8.5, max(0.0, (uFocusDist - uNearSafe) - depthDist));
    float botTilt = botBand * botDepthWeight;

    float tiltCoC = max(topTilt, botTilt) * uTiltShiftStrength;
    float coc = clamp(max(farCoC, tiltCoC) * uBlurStrength, 0.0, uMaxMix);
    coc = coc * coc * (3.0 - 2.0 * coc);

    gl_FragColor = mix(sharp, blurred, coc);
  }
`;

class TiltShiftGaussianDofPass extends Pass {
  private blurRtA: THREE.WebGLRenderTarget;
  private blurRtB: THREE.WebGLRenderTarget;
  private blurMatH: THREE.ShaderMaterial;
  private blurMatV: THREE.ShaderMaterial;
  private compositeMat: THREE.ShaderMaterial;
  private fsQuad: FullScreenQuad;
  private blurWidth = 1;
  private blurHeight = 1;
  private blurRadius = 1.25;

  constructor(width: number, height: number) {
    super();
    this.needsSwap = true;

    this.blurWidth = Math.max(1, Math.floor(width * 0.5));
    this.blurHeight = Math.max(1, Math.floor(height * 0.5));

    const rtOpts: THREE.RenderTargetOptions = {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
      stencilBuffer: false,
    };
    this.blurRtA = new THREE.WebGLRenderTarget(this.blurWidth, this.blurHeight, rtOpts);
    this.blurRtA.texture.name = 'DofBlurA';
    this.blurRtB = new THREE.WebGLRenderTarget(this.blurWidth, this.blurHeight, rtOpts);
    this.blurRtB.texture.name = 'DofBlurB';

    this.blurMatH = new THREE.ShaderMaterial({
      uniforms: {
        tInput: { value: null },
        uTexelStep: { value: new THREE.Vector2(this.blurRadius / this.blurWidth, 0) },
      },
      vertexShader: DOF_FULLSCREEN_VERT,
      fragmentShader: DOF_GAUSSIAN_FRAG,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    this.blurMatV = new THREE.ShaderMaterial({
      uniforms: {
        tInput: { value: null },
        uTexelStep: { value: new THREE.Vector2(0, this.blurRadius / this.blurHeight) },
      },
      vertexShader: DOF_FULLSCREEN_VERT,
      fragmentShader: DOF_GAUSSIAN_FRAG,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    this.compositeMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tBlur: { value: null },
        tDepth: { value: null },
        uCamNear: { value: 0.5 },
        uCamFar: { value: 260 },
        uFocusDist: { value: 19.5 },
        uFocusBand: { value: 11.5 },
        uFarSpan: { value: 28.0 },
        uNearSafe: { value: 4.5 },
        uBlurStrength: { value: 0.68 },
        uTiltShiftStrength: { value: 0.65 },
        uMaxMix: { value: 0.68 },
      },
      vertexShader: DOF_FULLSCREEN_VERT,
      fragmentShader: DOF_TILT_COMPOSITE_FRAG,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    this.fsQuad = new FullScreenQuad(this.compositeMat);
  }

  public updateParams(params: {
    camNear: number;
    camFar: number;
    focusDist: number;
    focusBand: number;
    farSpan: number;
    nearSafe: number;
    blurStrength: number;
    tiltShiftStrength: number;
    maxMix: number;
    blurRadius: number;
  }): void {
    const u = this.compositeMat.uniforms;
    u.uCamNear.value = params.camNear;
    u.uCamFar.value = params.camFar;
    u.uFocusDist.value = params.focusDist;
    u.uFocusBand.value = params.focusBand;
    u.uFarSpan.value = params.farSpan;
    u.uNearSafe.value = params.nearSafe;
    u.uBlurStrength.value = params.blurStrength;
    u.uTiltShiftStrength.value = params.tiltShiftStrength;
    u.uMaxMix.value = params.maxMix;
    if (this.blurRadius !== params.blurRadius) {
      this.blurRadius = params.blurRadius;
      this.blurMatH.uniforms.uTexelStep.value.set(this.blurRadius / this.blurWidth, 0);
      this.blurMatV.uniforms.uTexelStep.value.set(0, this.blurRadius / this.blurHeight);
    }
  }

  public override setSize(width: number, height: number): void {
    const bw = Math.max(1, Math.floor(width * 0.5));
    const bh = Math.max(1, Math.floor(height * 0.5));
    if (bw !== this.blurWidth || bh !== this.blurHeight) {
      this.blurWidth = bw;
      this.blurHeight = bh;
      this.blurRtA.setSize(bw, bh);
      this.blurRtB.setSize(bw, bh);
      this.blurMatH.uniforms.uTexelStep.value.set(this.blurRadius / bw, 0);
      this.blurMatV.uniforms.uTexelStep.value.set(0, this.blurRadius / bh);
    }
  }

  public resetTargets(): void {
    this.blurRtA.dispose();
    this.blurRtB.dispose();
  }

  public override render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget
  ): void {
    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    try {
      // Pass 1: Horizontal separable Gaussian blur at half resolution
      this.blurMatH.uniforms.tInput.value = readBuffer.texture;
      this.fsQuad.material = this.blurMatH;
      renderer.setRenderTarget(this.blurRtA);
      renderer.clear();
      this.fsQuad.render(renderer);

      // Pass 2: Vertical separable Gaussian blur into blurRtB
      this.blurMatV.uniforms.tInput.value = this.blurRtA.texture;
      this.fsQuad.material = this.blurMatV;
      renderer.setRenderTarget(this.blurRtB);
      renderer.clear();
      this.fsQuad.render(renderer);

      // Pass 3: Depth + tilt-shift Gaussian composite
      this.compositeMat.uniforms.tDiffuse.value = readBuffer.texture;
      this.compositeMat.uniforms.tBlur.value = this.blurRtB.texture;
      this.compositeMat.uniforms.tDepth.value = readBuffer.depthTexture;
      this.fsQuad.material = this.compositeMat;

      if (this.renderToScreen) {
        renderer.setRenderTarget(null);
      } else {
        renderer.setRenderTarget(writeBuffer);
      }
      if (this.clear) renderer.clear();
      this.fsQuad.render(renderer);
    } finally {
      renderer.autoClear = prevAutoClear;
    }
  }

  public override dispose(): void {
    this.blurRtA.dispose();
    this.blurRtB.dispose();
    this.blurMatH.dispose();
    this.blurMatV.dispose();
    this.compositeMat.dispose();
    this.fsQuad.dispose();
  }
}

export class WorldRenderer3D {
  public readonly isSoftwareGl: boolean;
  public readonly isMobileMode: boolean;
  public readonly container: HTMLElement;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  private shadowMapRes = 2048;

  private pmrem: THREE.PMREMGenerator;
  private envRT: THREE.WebGLRenderTarget;
  private composer: EffectComposer | null = null;
  private renderPass: RenderPass | null = null;
  private dofPass: TiltShiftGaussianDofPass | null = null;
  private outputPass: OutputPass | null = null;
  private onContextLostCb?: () => void;
  private onContextRestoredCb?: () => void;
  private surfaceHeightCache = new Float32Array(52 * 52);
  private bgColor = new THREE.Color('#66b5ea');
  private fog: THREE.FogExp2;
  private sunLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private playerLight: THREE.PointLight;
  private lanternTreeLight: THREE.PointLight;

  // Terrain & Realm Backdrops
  private skyDomeMesh: THREE.Mesh;
  private skyDomeMat: THREE.ShaderMaterial;
  private terrainGeo: THREE.BufferGeometry;
  private terrainMat: THREE.MeshStandardMaterial;
  private terrainMesh: THREE.Mesh;
  private waterMesh: THREE.Mesh;
  private diveCausticsMesh: THREE.Mesh;
  private causticTex: THREE.CanvasTexture;
  private skyCloudsMesh: THREE.InstancedMesh;
  private reefRayGroup: THREE.Group;
  private starDome: THREE.Points;
  private terrainOriginTx = -9999;
  private terrainOriginTz = -9999;
  private terrainStateKey = '';

  // Prop & Collectible Instanced Pools
  private batches: Record<string, InstancedBatch> = {};
  private propRebuildKey = '';
  private worldMapSize = N;
  private worldMapBytes = new Uint8Array(N * N * 4);
  private worldMapTex: THREE.DataTexture;
  private worldMapLayerKey = '';
  private shaderUniforms: SharedWorldShaderUniforms = createWorldShaderUniforms();

  // Composite Landmarks & Pooled Buildings
  private archPack!: ArchMaterialPack;
  private landmarkGroup = new THREE.Group();
  private lanternTreeGroup: THREE.Group | null = null;
  private lanternOrbs: THREE.Mesh[] = [];
  private lanternCrownMat1: THREE.MeshStandardMaterial | null = null;
  private lanternCrownMat2: THREE.MeshStandardMaterial | null = null;
  private lanternBarkMat: THREE.MeshStandardMaterial | null = null;
  private homeGroup: THREE.Group | null = null;
  private homeSmokePuffs: THREE.Mesh[] = [];
  private cauldronGroup: THREE.Group | null = null;
  private cauldronBubbles: THREE.Mesh[] = [];
  private teaHouseGroup: THREE.Group | null = null;
  private teaCrescent: THREE.Mesh | null = null;
  private glowPortalGroup: THREE.Group | null = null;
  private moonPortalGroup: THREE.Group | null = null;
  private glowReturnGroup: THREE.Group | null = null;
  private moonReturnGroup: THREE.Group | null = null;
  private cottagePool: THREE.Group[] = [];
  private cottagePoolsByStyle: Record<
    TownArchStyle,
    { groups: THREE.Group[]; roofMats: THREE.MeshStandardMaterial[] }
  > = {
    meadow: { groups: [], roofMats: [] },
    coastal: { groups: [], roofMats: [] },
    desert: { groups: [], roofMats: [] },
    nordic: { groups: [], roofMats: [] },
    blossom: { groups: [], roofMats: [] },
  };
  private cottageFlowerMats: THREE.MeshStandardMaterial[] = [];
  private cottageSmokePool: THREE.Mesh[][] = [];
  private fountainPool: THREE.Group[] = [];
  private marketStallPools: Record<'bakery' | 'produce' | 'alchemy' | 'fish', THREE.Group[]> = {
    bakery: [],
    produce: [],
    alchemy: [],
    fish: [],
  };
  private townWellPool: THREE.Group[] = [];
  private festivalArchPool: THREE.Group[] = [];
  private flowerCartPool: THREE.Group[] = [];
  private bistroPool: THREE.Group[] = [];
  private pierClusterPool: THREE.Group[] = [];
  private noticeboardPool: THREE.Group[] = [];
  private townPlazaLights: THREE.PointLight[] = [];
  private plazaLightAnchors: { x: number; y: number; z: number }[] = [];
  private bubbleDomePool: THREE.Group[] = [];
  private boatPool: THREE.Group[] = [];
  private boatAnchors: { x: number; z: number; yaw: number }[] = [];
  private customLandmarks: WorldLandmark3D[] = [];
  private cachedTownsRef: Town[] | null = null;
  private resolvedLandmarkCoords: { tx: number; tz: number }[] = [];
  private houseInterior: HouseInteriorHandle | null = null;

  // Actors
  private playerRig: MochiRig;
  private companionRig: CompanionRig;
  private npcRigs: MochiRig[] = [];
  private hollowRigs: MochiRig[] = [];
  private ghostRigs: MochiRig[] = [];
  private npcSmoothYawMap = new WeakMap<NPC, number>();
  private compSmoothYaw = 0;
  private lastCompX = 0;
  private lastCompZ = 0;
  private hasLastComp = false;

  // Dynamic World VFX (Spells, Move Marker, Orbiters, Weather Particles & Ambient Motes)
  private moveMarkerGroup: THREE.Group;
  private moveMarkerRing: THREE.Mesh;
  private spellAuraRing: THREE.Mesh;
  private spellAuraRing2: THREE.Mesh;
  private frostOrbiters: THREE.Group[] = [];
  private starOrbiters: THREE.Mesh[] = [];
  private hugOrbiters: THREE.Mesh[] = [];
  private flameOrbiters: THREE.Mesh[] = [];
  private treasureBeaconsPool: {
    group: THREE.Group;
    beamMat: THREE.MeshBasicMaterial;
    haloMat: THREE.MeshBasicMaterial;
  }[] = [];
  private magnetBeamsPool: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }[] = [];
  private constellationRunesMesh: THREE.InstancedMesh;
  private echoCompassGroup: THREE.Group;
  private echoCompassMat: THREE.MeshBasicMaterial;
  private dawnSunGroup: THREE.Group;
  private dawnPillarMat: THREE.MeshBasicMaterial;
  private dawnCoronaMat: THREE.MeshBasicMaterial;
  private hotSpringPoolGroup: THREE.Group;
  private hotSpringMat: THREE.MeshBasicMaterial;
  private hotSpringSteam: THREE.Mesh[] = [];
  private weatherInstMesh: THREE.InstancedMesh;
  private weatherMax = 180;
  private ambientMotesMesh: THREE.InstancedMesh;
  private ambientMotesMax = 130;
  private auroraGroup: THREE.Group;
  private auroraRibbons: THREE.Mesh[] = [];
  private bloomBatch: InstancedBatch;
  private ringVfxPool: THREE.Mesh[] = [];
  private particleVfxBatch: InstancedBatch;
  private waterRipplesMesh!: THREE.InstancedMesh;
  private waterRipplesMax = 48;
  private stepRipples: {
    active: boolean;
    x: number;
    y: number;
    z: number;
    age: number;
    maxAge: number;
    maxRadius: number;
    colHex: number;
  }[] = [];
  private lastStepRippleTime = -10;
  private lastBoatRippleTime = -10;

  // 3D Waterside Fishing Stage (Ledge Dock, Bobber, Catenary Line & Leaping Fish)
  private fishingStageGroup!: THREE.Group;
  private fishingLedgeGroup!: THREE.Group;
  private fishingBobberGroup!: THREE.Group;
  private fishingLine!: THREE.Line;
  private fishingLinePositions!: Float32Array;
  private caughtFishGroup!: THREE.Group;
  private caughtFishTail!: THREE.Mesh;
  private caughtFishBodyMat!: THREE.MeshStandardMaterial;
  private caughtFishSparkles: THREE.Mesh[] = [];
  private lastFishingRippleTime = -10;
  private lastFishingSplashTime = -10;

  // Camera smooth state
  private camPos = new THREE.Vector3();
  private camTarget = new THREE.Vector3();
  private camInitialized = false;
  private activeCamFov = 40;
  private activeCamNear = 0.5;
  private playerSmoothYaw = 0;
  private playerHeadTurn = 0;
  private currentLayer: WorldLayer3D = 'surface';
  private contextLost = false;
  private disposed = false;

  // Performance & Pooling Caches
  private lastResizeW = -1;
  private lastResizeH = -1;
  private lastResizeDpr = -1;
  private activeLowQuality: boolean | null = null;
  private vibrantInitialized = false;
  private cachedNpcsRef: NPC[] | null = null;
  private cachedLanternTree: NPC | null = null;
  private npcLookPool: PlayerLook[] = [];
  private hollowLookPool: PlayerLook[] = [];

  // Owned shared geometries/materials/textures for clean dispose()
  private ownedGeos: THREE.BufferGeometry[] = [];
  private ownedMats: THREE.Material[] = [];
  private ownedTextures: THREE.Texture[] = [];

  private onContextLostBound: (e: Event) => void;
  private onContextRestoredBound: () => void;

  constructor(
    container: HTMLElement,
    hooks?: { onContextLost?: () => void; onContextRestored?: () => void; isMobile?: boolean }
  ) {
    this.container = container;
    this.onContextLostCb = hooks?.onContextLost;
    this.onContextRestoredCb = hooks?.onContextRestored;
    const coarseTouch =
      typeof window !== 'undefined' &&
      (('ontouchstart' in window) || (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches));
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    const inferredMobile = Boolean(coarseTouch && (vw < 640 || (vw >= vh && vh <= 520)));
    const isMobile = hooks?.isMobile ?? inferredMobile;
    this.isMobileMode = isMobile;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      alpha: false,
      preserveDrawingBuffer: false,
      powerPreference: isMobile ? 'default' : 'high-performance',
    });
    const gl = renderer.getContext();
    this.isSoftwareGl = detectSoftwareWebGL(gl);
    if (this.isSoftwareGl) {
      renderer.setPixelRatio(1);
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !this.isSoftwareGl;
    renderer.shadowMap.type = isMobile || this.isSoftwareGl ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.pointerEvents = 'none';

    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    const buildEnvRT = () => {
      const outdoorEnv = createOutdoorEnvScene();
      const rt = this.pmrem.fromScene(outdoorEnv, 0.04);
      outdoorEnv.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat?.dispose();
        }
      });
      return rt;
    };

    this.onContextLostBound = (e: Event) => {
      e.preventDefault();
      this.contextLost = true;
      this.onContextLostCb?.();
    };
    this.onContextRestoredBound = () => {
      this.contextLost = false;
      try {
        this.envRT?.dispose();
        this.pmrem?.dispose();
        this.pmrem = new THREE.PMREMGenerator(this.renderer);
        this.envRT = buildEnvRT();
        this.scene.environment = this.envRT.texture;
        this.dofPass?.resetTargets();
        this.composer?.reset();
      } catch {}
      this.terrainStateKey = '';
      this.worldMapLayerKey = '';
      this.propRebuildKey = '';
      this.vibrantInitialized = false;
      this.renderer.shadowMap.needsUpdate = true;
      this.onContextRestoredCb?.();
    };
    renderer.domElement.addEventListener('webglcontextlost', this.onContextLostBound);
    renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestoredBound);

    this.scene = new THREE.Scene();
    this.scene.background = this.bgColor;
    this.fog = new THREE.FogExp2('#9ad5f8', 0.014);
    this.scene.fog = this.fog;

    // Outdoor Atmospheric PMREM IBL for sunlit water speculars, bronze reflections, and sky/meadow bounce
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envRT = buildEnvRT();
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.54;

    const w = Math.max(1, container.clientWidth || window.innerWidth);
    const h = Math.max(1, container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(40, w / h, 0.5, 260);

    // 3-Point / Hemisphere + Sun + Cool/Warm Rim Fill + Player & Tree Lantern Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(0xfff5e8, 0x527a6e, 0.88);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff3d8, 1.65);
    this.sunLight.castShadow = !this.isSoftwareGl;
    const sMapRes = this.isSoftwareGl ? 512 : isMobile ? 1024 : 2048;
    this.shadowMapRes = sMapRes;
    this.sunLight.shadow.mapSize.set(sMapRes, sMapRes);
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 84;
    const sExtent = 24;
    this.sunLight.shadow.camera.left = -sExtent;
    this.sunLight.shadow.camera.right = sExtent;
    this.sunLight.shadow.camera.top = sExtent;
    this.sunLight.shadow.camera.bottom = -sExtent;
    this.sunLight.shadow.bias = isMobile ? -0.0008 : -0.00055;
    this.sunLight.shadow.normalBias = isMobile ? 0.035 : 0.025;
    this.sunLight.shadow.radius = isMobile ? 1.0 : 1.5;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // High-resolution world height/road/bathymetry lookup DataTexture for terrain & water shaders
    this.worldMapTex = new THREE.DataTexture(
      this.worldMapBytes,
      this.worldMapSize,
      this.worldMapSize,
      THREE.RGBAFormat
    );
    this.worldMapTex.magFilter = THREE.LinearFilter;
    this.worldMapTex.minFilter = THREE.LinearFilter;
    this.worldMapTex.wrapS = THREE.ClampToEdgeWrapping;
    this.worldMapTex.wrapT = THREE.ClampToEdgeWrapping;
    this.worldMapTex.colorSpace = THREE.NoColorSpace;
    this.worldMapTex.needsUpdate = true;
    this.ownedTextures.push(this.worldMapTex);
    this.shaderUniforms.uWorldMapTex.value = this.worldMapTex;
    this.shaderUniforms.uWorldMapSize.value = this.worldMapSize;

    this.rimLight = new THREE.DirectionalLight(0xd9f2ff, 0.46);
    this.rimLight.castShadow = false;
    this.scene.add(this.rimLight);
    this.scene.add(this.rimLight.target);

    this.playerLight = new THREE.PointLight(0xffe090, 0.0, 12, 1.4);
    this.scene.add(this.playerLight);

    this.lanternTreeLight = new THREE.PointLight(0xffcf60, 0.0, 15, 1.35);
    this.scene.add(this.lanternTreeLight);

    for (let i = 0; i < 2; i++) {
      const pl = new THREE.PointLight(0xffcb78, 0.0, 14, 1.45);
      this.scene.add(pl);
      this.townPlazaLights.push(pl);
    }

    // Atmospheric Procedural Sky Dome (expanded radius for seamless 1st-person & Vista horizons)
    const skyGeo = isMobile ? new THREE.SphereGeometry(150, 28, 18) : new THREE.SphereGeometry(150, 44, 26);
    this.skyDomeMat = createSkyDomeMaterial(this.shaderUniforms);
    this.ownedGeos.push(skyGeo);
    this.ownedMats.push(this.skyDomeMat);
    this.skyDomeMesh = new THREE.Mesh(skyGeo, this.skyDomeMat);
    this.skyDomeMesh.frustumCulled = false;
    this.skyDomeMesh.renderOrder = -10;
    this.scene.add(this.skyDomeMesh);

    // Build Terrain Sliding Chunk Geometry + Biome Micro-Detail Shader
    this.terrainGeo = this.createTerrainChunkGeometry();
    this.terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.02,
      flatShading: false,
    });
    applyTerrainShader(this.terrainMat, this.shaderUniforms);
    this.ownedGeos.push(this.terrainGeo);
    this.ownedMats.push(this.terrainMat);
    this.terrainMesh = new THREE.Mesh(this.terrainGeo, this.terrainMat);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);

    // Procedural Scrolling Water Caustic & Wave Shimmer Texture
    this.causticTex = this.createCausticTexture();
    this.ownedTextures.push(this.causticTex);

    // Wide Animated Translucent Ocean / Glowdeep Canal Water Plane (extends cleanly to sky dome horizon)
    const waterSegs = isMobile ? 32 : 56;
    const waterGeo = new THREE.PlaneGeometry(210, 210, waterSegs, waterSegs);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x35a8e8,
      emissive: 0x165e88,
      emissiveMap: this.causticTex,
      emissiveIntensity: 0.42,
      roughness: 0.09,
      metalness: 0.16,
      transparent: true,
      opacity: 0.82,
    });
    applyWaterShader(waterMat, this.shaderUniforms);
    this.ownedGeos.push(waterGeo);
    this.ownedMats.push(waterMat);
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.y = 0.0;
    this.waterMesh.receiveShadow = !isMobile && !this.isSoftwareGl;
    this.scene.add(this.waterMesh);

    // Underwater Projected Sun Caustics Plane (hovers delicately over reef sandbar without blocking camera!)
    const diveCausticGeo = new THREE.PlaneGeometry(100, 100);
    diveCausticGeo.rotateX(-Math.PI / 2);
    const diveCausticMat = new THREE.MeshBasicMaterial({
      map: this.causticTex,
      color: 0x9cfaff,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.ownedGeos.push(diveCausticGeo);
    this.ownedMats.push(diveCausticMat);
    this.diveCausticsMesh = new THREE.Mesh(diveCausticGeo, diveCausticMat);
    this.diveCausticsMesh.visible = false;
    this.scene.add(this.diveCausticsMesh);

    // Fluffy Multi-Puff 3D Cumulus Clouds (Sky Kingdom cloud deck + Surface horizon clouds)
    const cloudGeo = createCumulusCloudGeometry();
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.84,
      transparent: true,
      opacity: 0.92,
    });
    this.ownedGeos.push(cloudGeo);
    this.ownedMats.push(cloudMat);
    this.skyCloudsMesh = new THREE.InstancedMesh(cloudGeo, cloudMat, 80);
    this.skyCloudsMesh.frustumCulled = false;
    this.skyCloudsMesh.visible = false;
    this.scene.add(this.skyCloudsMesh);

    // Reef Distant Horizon Light Shafts (strictly kept behind foreground so center stays 100% crisp)
    this.reefRayGroup = new THREE.Group();
    const rayGeo = new THREE.ConeGeometry(1.8, 20, 10, 1, true);
    const rayMat = new THREE.MeshBasicMaterial({
      color: 0x8beeff,
      transparent: true,
      opacity: 0.04,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.ownedGeos.push(rayGeo);
    this.ownedMats.push(rayMat);
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(rayGeo, rayMat);
      m.position.set((i - 1.5) * 9.0, 9.5, -17.0);
      m.rotation.z = 0.18;
      this.reefRayGroup.add(m);
    }
    this.reefRayGroup.visible = false;
    this.scene.add(this.reefRayGroup);

    // Starlight / Moon Road Cosmic Star Dome
    const starPositions = new Float32Array(260 * 3);
    for (let i = 0; i < 260; i++) {
      const theta = hash(i, 1, 901) * Math.PI * 2;
      const phi = (hash(i, 2, 902) - 0.15) * Math.PI;
      const r = 46 + hash(i, 3, 903) * 14;
      starPositions[i * 3] = Math.cos(theta) * Math.cos(phi) * r;
      starPositions[i * 3 + 1] = Math.sin(phi) * r * 0.75 + 6;
      starPositions[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * r;
    }
    const domeGeo = new THREE.BufferGeometry();
    domeGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const domeMat = new THREE.PointsMaterial({
      color: 0xfff3b8,
      size: 0.55,
      transparent: true,
      opacity: 0.88,
      sizeAttenuation: true,
    });
    this.ownedGeos.push(domeGeo);
    this.ownedMats.push(domeMat);
    this.starDome = new THREE.Points(domeGeo, domeMat);
    this.starDome.visible = false;
    this.scene.add(this.starDome);

    // Shared Architectural Shader Material Pack
    this.archPack = createArchMaterialPack(this.shaderUniforms, (m) => {
      this.ownedMats.push(m);
      return m;
    });

    // Initialize InstancedMesh Batches for all Foliage, Props, Collectibles & Fish
    this.initPropBatches();
    this.scene.add(this.landmarkGroup);

    // Pre-build Landmark Structures
    this.buildStaticLandmarks();

    // Pooled Storybook Town Cottages, Waystones & Bubble Domes (Shader-Enhanced Model Pack)
    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      this.ownedGeos.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      this.ownedMats.push(m);
      return m;
    };
    const structShadowGeo = trackGeo(new THREE.PlaneGeometry(3.2, 2.5));
    structShadowGeo.rotateX(-Math.PI / 2);
    const structShadowMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: getSoftShadowTexture(),
        color: 0xffffff,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    const styleCounts: [TownArchStyle, number][] = [
      ['meadow', 6],
      ['coastal', 4],
      ['desert', 4],
      ['nordic', 4],
      ['blossom', 4],
    ];
    for (const [style, count] of styleCounts) {
      for (let i = 0; i < count; i++) {
        const { group, roofMat, smokePuffs } = buildDetailedCottage(
          TOWN_ROOF_HEX[i % TOWN_ROOF_HEX.length],
          this.shaderUniforms,
          this.archPack,
          trackGeo,
          trackMat,
          this.cottageFlowerMats,
          style
        );
        const cotAo = new THREE.Mesh(structShadowGeo, structShadowMat);
        cotAo.position.set(0, 0.03, 0.08);
        group.add(cotAo);
        group.visible = false;
        this.landmarkGroup.add(group);
        this.cottagePool.push(group);
        this.cottageSmokePool.push(smokePuffs);
        this.cottagePoolsByStyle[style].groups.push(group);
        this.cottagePoolsByStyle[style].roofMats.push(roofMat);
      }
    }
    if (this.homeGroup) {
      const homeAo = new THREE.Mesh(structShadowGeo, structShadowMat);
      homeAo.scale.set(1.12, 1, 1.12);
      homeAo.position.set(0.18, 0.03, 0.08);
      this.homeGroup.add(homeAo);
    }
    if (this.lanternTreeGroup) {
      const treeAo = new THREE.Mesh(structShadowGeo, structShadowMat);
      treeAo.scale.set(1.55, 1, 1.9);
      treeAo.position.set(0, 0.03, 0);
      this.lanternTreeGroup.add(treeAo);
    }
    for (let i = 0; i < 10; i++) {
      const f = buildDetailedFountainWaystone(this.archPack, trackGeo);
      f.visible = false;
      this.landmarkGroup.add(f);
      this.fountainPool.push(f);
    }
    const stallVariants: ('bakery' | 'produce' | 'alchemy' | 'fish')[] = ['bakery', 'produce', 'alchemy', 'fish'];
    for (const sv of stallVariants) {
      for (let i = 0; i < 4; i++) {
        const ms = buildDetailedMarketStall(sv, this.shaderUniforms, this.archPack, trackGeo, trackMat);
        ms.visible = false;
        this.landmarkGroup.add(ms);
        this.marketStallPools[sv].push(ms);
      }
    }
    for (let i = 0; i < 4; i++) {
      const tw = buildDetailedTownWell(this.archPack, trackGeo, trackMat);
      tw.visible = false;
      this.landmarkGroup.add(tw);
      this.townWellPool.push(tw);
    }
    for (let i = 0; i < 12; i++) {
      const fa = buildDetailedFestivalArch(this.shaderUniforms, this.archPack, trackGeo, trackMat);
      fa.visible = false;
      this.landmarkGroup.add(fa);
      this.festivalArchPool.push(fa);
    }
    for (let i = 0; i < 10; i++) {
      const fc = buildDetailedFlowerCart(this.archPack, trackGeo, trackMat);
      fc.visible = false;
      this.landmarkGroup.add(fc);
      this.flowerCartPool.push(fc);
    }
    for (let i = 0; i < 10; i++) {
      const bs = buildDetailedBistroSet(this.archPack, trackGeo, trackMat);
      bs.visible = false;
      this.landmarkGroup.add(bs);
      this.bistroPool.push(bs);
    }
    for (let i = 0; i < 8; i++) {
      const hp = buildDetailedHarborPierCluster(this.archPack, trackGeo, trackMat);
      hp.visible = false;
      this.landmarkGroup.add(hp);
      this.pierClusterPool.push(hp);
    }
    for (let i = 0; i < 6; i++) {
      const nb = buildDetailedNoticeboard(this.archPack, trackGeo, trackMat);
      nb.visible = false;
      this.landmarkGroup.add(nb);
      this.noticeboardPool.push(nb);
    }
    for (let i = 0; i < 16; i++) {
      const d = buildDetailedBubbleDome(this.archPack, trackGeo, trackMat);
      d.visible = false;
      this.landmarkGroup.add(d);
      this.bubbleDomePool.push(d);
    }

    // Pooled Coastal Harbor Rowboats / Sail-Skiffs (tapered skiff hulls bobbing gently along island coastlines)
    const hullGeo = trackGeo(createCoastalSkiffHullGeometry());
    const gunwaleGeo = trackGeo(new THREE.BoxGeometry(0.42, 0.04, 0.72));
    const mastGeo = trackGeo(new THREE.CylinderGeometry(0.028, 0.038, 0.94, 7));
    const sailGeo = trackGeo(new THREE.PlaneGeometry(0.46, 0.62));
    const sailMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xfff8ef, roughness: 0.55, side: THREE.DoubleSide }));
    const benchGeo = trackGeo(new THREE.BoxGeometry(0.36, 0.045, 0.14));
    const lanternGeo = trackGeo(new THREE.SphereGeometry(0.068, 8, 6));
    for (let i = 0; i < 7; i++) {
      const bg = new THREE.Group();
      const hull = new THREE.Mesh(hullGeo, this.archPack.timber);
      hull.position.y = 0.02;
      hull.castShadow = true;
      const deck = new THREE.Mesh(gunwaleGeo, this.archPack.plaster);
      deck.position.set(0, 0.12, 0);
      const bench = new THREE.Mesh(benchGeo, this.archPack.copper);
      bench.position.set(0, 0.17, 0);
      const mast = new THREE.Mesh(mastGeo, this.archPack.timber);
      mast.position.set(0, 0.56, 0.08);
      const sail = new THREE.Mesh(sailGeo, sailMat);
      sail.position.set(0.04, 0.62, 0.08);
      sail.rotation.y = 0.25;
      sail.name = 'boatSail';
      const bowLamp = new THREE.Mesh(lanternGeo, this.archPack.warmWindow);
      bowLamp.position.set(0, 0.3, 0.46);
      bg.add(hull, deck, bench, mast, sail, bowLamp);
      bg.visible = false;
      this.landmarkGroup.add(bg);
      this.boatPool.push(bg);
    }

    // Hero, Companion, NPCs, Hollows & Dash Ghost Actors
    this.playerRig = createMochiRig();
    this.scene.add(this.playerRig.root);

    this.companionRig = createCompanionRig();
    this.scene.add(this.companionRig.root);

    for (let i = 0; i < 24; i++) {
      const rig = createMochiRig();
      rig.root.visible = false;
      this.scene.add(rig.root);
      this.npcRigs.push(rig);
      this.npcLookPool.push({
        sp: 'cat',
        col: '#ffb3c7',
        c2: '',
        ac: '#ff7aa8',
        hat: 'none',
        eyes: 0,
        mouth: 0,
        pat: 0,
        out: 0,
        face: 0,
        aura: 0,
        name: '',
      });
    }
    for (let i = 0; i < 8; i++) {
      const rig = createMochiRig();
      rig.root.visible = false;
      this.scene.add(rig.root);
      this.hollowRigs.push(rig);
      this.hollowLookPool.push({
        sp: 'cat',
        col: '#8a94a6',
        c2: '#4b5563',
        ac: '#6b7280',
        hat: 'none',
        eyes: 0,
        mouth: 0,
        pat: 0,
        out: 0,
        face: 0,
        aura: 0,
        name: '',
        isHollow: true,
        hollowBloom: 0,
      });
    }
    for (let i = 0; i < 5; i++) {
      const rig = createMochiRig();
      rig.root.visible = false;
      this.scene.add(rig.root);
      this.ghostRigs.push(rig);
    }

    // Move Target Ring on Ground
    this.moveMarkerGroup = new THREE.Group();
    const mmRingGeo = new THREE.TorusGeometry(0.32, 0.04, 8, 22);
    mmRingGeo.rotateX(Math.PI / 2);
    const mmRingMat = new THREE.MeshBasicMaterial({ color: 0xff7aa8, transparent: true, opacity: 0.9 });
    const mmDotGeo = new THREE.SphereGeometry(0.09, 10, 8);
    const mmDotMat = new THREE.MeshBasicMaterial({ color: 0xffd23f });
    this.ownedGeos.push(mmRingGeo, mmDotGeo);
    this.ownedMats.push(mmRingMat, mmDotMat);
    this.moveMarkerRing = new THREE.Mesh(mmRingGeo, mmRingMat);
    const mmDot = new THREE.Mesh(mmDotGeo, mmDotMat);
    mmDot.position.y = 0.06;
    this.moveMarkerGroup.add(this.moveMarkerRing, mmDot);
    this.moveMarkerGroup.visible = false;
    this.scene.add(this.moveMarkerGroup);

    // Active Spell Floor Ring & Orbiters
    const spellRingGeo = new THREE.TorusGeometry(1.5, 0.055, 8, 36);
    spellRingGeo.rotateX(Math.PI / 2);
    const spellRingMat = new THREE.MeshBasicMaterial({
      color: 0xffd23f,
      transparent: true,
      opacity: 0.72,
    });
    this.ownedGeos.push(spellRingGeo);
    this.ownedMats.push(spellRingMat);
    this.spellAuraRing = new THREE.Mesh(spellRingGeo, spellRingMat);
    this.spellAuraRing.visible = false;
    this.scene.add(this.spellAuraRing);

    const spellRing2Geo = new THREE.TorusGeometry(1.05, 0.032, 6, 28);
    spellRing2Geo.rotateX(Math.PI / 2);
    const spellRing2Mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.ownedGeos.push(spellRing2Geo);
    this.ownedMats.push(spellRing2Mat);
    this.spellAuraRing2 = new THREE.Mesh(spellRing2Geo, spellRing2Mat);
    this.spellAuraRing2.visible = false;
    this.scene.add(this.spellAuraRing2);

    // Sculpted 5-Point Star Crown Geometry (for Star Sense crown)
    const starShape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 0.16 : 0.072;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      if (i === 0) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    starShape.closePath();
    const crownStarGeo = new THREE.ExtrudeGeometry(starShape, {
      depth: 0.045,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.012,
      bevelSegments: 2,
    });
    crownStarGeo.center();

    // Sculpted 3D Heart Geometry (for Hush Hug orbiting hearts)
    const heartShape = new THREE.Shape();
    heartShape.moveTo(0, -0.11);
    heartShape.bezierCurveTo(-0.15, -0.02, -0.16, 0.13, -0.06, 0.13);
    heartShape.bezierCurveTo(-0.015, 0.13, 0, 0.075, 0, 0.055);
    heartShape.bezierCurveTo(0, 0.075, 0.015, 0.13, 0.06, 0.13);
    heartShape.bezierCurveTo(0.16, 0.13, 0.15, -0.02, 0, -0.11);
    const heartGeo = new THREE.ExtrudeGeometry(heartShape, {
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.018,
      bevelSize: 0.015,
      bevelSegments: 2,
    });
    heartGeo.center();

    // Sculpted Hexagonal Ice Shield Blade Geometry (for Frost Bridge frost shields)
    const crystalBladeGeo = new THREE.OctahedronGeometry(0.15, 0);
    crystalBladeGeo.scale(0.65, 1.45, 0.38);
    const crystalInnerGeo = new THREE.OctahedronGeometry(0.08, 0);
    const emberTearGeo = new THREE.ConeGeometry(0.085, 0.22, 7);

    this.ownedGeos.push(crownStarGeo, heartGeo, crystalBladeGeo, crystalInnerGeo, emberTearGeo);
    for (let i = 0; i < 3; i++) {
      const fMat = new THREE.MeshStandardMaterial({
        color: 0xd4f6ff,
        emissive: 0x67d4ff,
        emissiveIntensity: 0.72,
        roughness: 0.15,
        metalness: 0.2,
        transparent: true,
        opacity: 0.92,
      });
      const fCoreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const sMat = new THREE.MeshStandardMaterial({
        color: 0xffd84d,
        emissive: 0xffb703,
        emissiveIntensity: 0.75,
        roughness: 0.22,
        metalness: 0.3,
      });
      const hMat = new THREE.MeshStandardMaterial({
        color: 0xff7aa8,
        emissive: 0xff4d8d,
        emissiveIntensity: 0.65,
        roughness: 0.28,
      });
      const eMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xff7b47 : 0xffd23f,
        transparent: true,
        opacity: 0.9,
      });
      this.ownedMats.push(fMat, fCoreMat, sMat, hMat, eMat);

      const frostGrp = new THREE.Group();
      const fmMain = new THREE.Mesh(crystalBladeGeo, fMat);
      const fmCross = new THREE.Mesh(crystalBladeGeo, fMat);
      fmCross.rotation.z = Math.PI / 3;
      const fmCore = new THREE.Mesh(crystalInnerGeo, fCoreMat);
      frostGrp.add(fmMain, fmCross, fmCore);
      frostGrp.visible = false;

      const sm = new THREE.Mesh(crownStarGeo, sMat);
      const hm = new THREE.Mesh(heartGeo, hMat);
      const em = new THREE.Mesh(emberTearGeo, eMat);
      sm.visible = false;
      hm.visible = false;
      em.visible = false;
      this.scene.add(frostGrp, sm, hm, em);
      this.frostOrbiters.push(frostGrp);
      this.starOrbiters.push(sm);
      this.hugOrbiters.push(hm);
      this.flameOrbiters.push(em);
    }

    // 3D Rising Light Beacons (Star Sense treasure/echo illumination & Starway Chorus)
    const beaconCylGeo = new THREE.CylinderGeometry(0.11, 0.24, 3.2, 10, 1, true);
    beaconCylGeo.translate(0, 1.6, 0);
    const beaconRingGeo = new THREE.RingGeometry(0.28, 0.42, 20);
    beaconRingGeo.rotateX(-Math.PI / 2);
    this.ownedGeos.push(beaconCylGeo, beaconRingGeo);
    for (let i = 0; i < 10; i++) {
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0xffd23f,
        transparent: true,
        opacity: 0.34,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xfff5b8,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.ownedMats.push(beamMat, haloMat);
      const grp = new THREE.Group();
      const beam = new THREE.Mesh(beaconCylGeo, beamMat);
      const halo = new THREE.Mesh(beaconRingGeo, haloMat);
      halo.position.y = 0.08;
      grp.add(beam, halo);
      grp.visible = false;
      this.scene.add(grp);
      this.treasureBeaconsPool.push({ group: grp, beamMat, haloMat });
    }

    // 3D Magnetic Tether Beams (Moon Pull / Dawn Break / Echo Magnet)
    const magBeamGeo = new THREE.CylinderGeometry(0.032, 0.032, 1, 6, 1, true);
    this.ownedGeos.push(magBeamGeo);
    for (let i = 0; i < 12; i++) {
      const mMat = new THREE.MeshBasicMaterial({
        color: 0xb48cff,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.ownedMats.push(mMat);
      const beam = new THREE.Mesh(magBeamGeo, mMat);
      beam.visible = false;
      this.scene.add(beam);
      this.magnetBeamsPool.push({ mesh: beam, mat: mMat });
    }

    // 3D Frost Glow Constellations across ice bridges
    const runeGeo = new THREE.OctahedronGeometry(0.11, 0);
    runeGeo.scale(1.1, 0.25, 1.1);
    const runeMat = new THREE.MeshBasicMaterial({
      color: 0xffe885,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.ownedGeos.push(runeGeo);
    this.ownedMats.push(runeMat);
    this.constellationRunesMesh = new THREE.InstancedMesh(runeGeo, runeMat, 140);
    this.constellationRunesMesh.frustumCulled = false;
    this.constellationRunesMesh.visible = false;
    this.scene.add(this.constellationRunesMesh);

    // 3D Echo Call Directional Sonar Compass Prism
    const arrowGeo = new THREE.ConeGeometry(0.16, 0.42, 4);
    arrowGeo.rotateX(Math.PI / 2);
    const compassRingGeo = new THREE.TorusGeometry(0.24, 0.025, 6, 18);
    this.echoCompassMat = new THREE.MeshBasicMaterial({
      color: 0x8fd5ff,
      transparent: true,
      opacity: 0.92,
    });
    this.ownedGeos.push(arrowGeo, compassRingGeo);
    this.ownedMats.push(this.echoCompassMat);
    this.echoCompassGroup = new THREE.Group();
    this.echoCompassGroup.add(new THREE.Mesh(arrowGeo, this.echoCompassMat));
    const cRing = new THREE.Mesh(compassRingGeo, this.echoCompassMat);
    cRing.position.z = -0.1;
    this.echoCompassGroup.add(cRing);
    this.echoCompassGroup.visible = false;
    this.scene.add(this.echoCompassGroup);

    // 3D Dawn Break Golden Sunrise Pillar & Solar Corona
    const sunPillarGeo = new THREE.CylinderGeometry(0.55, 1.35, 5.2, 16, 1, true);
    sunPillarGeo.translate(0, 2.6, 0);
    const sunCoronaGeo = new THREE.RingGeometry(1.1, 1.55, 28);
    sunCoronaGeo.rotateX(-Math.PI / 2);
    this.dawnPillarMat = new THREE.MeshBasicMaterial({
      color: 0xffdf6b,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.dawnCoronaMat = new THREE.MeshBasicMaterial({
      color: 0xffb703,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.ownedGeos.push(sunPillarGeo, sunCoronaGeo);
    this.ownedMats.push(this.dawnPillarMat, this.dawnCoronaMat);
    this.dawnSunGroup = new THREE.Group();
    this.dawnSunGroup.add(new THREE.Mesh(sunPillarGeo, this.dawnPillarMat));
    const coronaMesh = new THREE.Mesh(sunCoronaGeo, this.dawnCoronaMat);
    coronaMesh.position.y = 0.08;
    this.dawnSunGroup.add(coronaMesh);
    this.dawnSunGroup.visible = false;
    this.scene.add(this.dawnSunGroup);

    // 3D Hot Spring Harmony Steaming Thermal Pool
    const springDiskGeo = new THREE.CircleGeometry(2.15, 28);
    springDiskGeo.rotateX(-Math.PI / 2);
    const springRimGeo = new THREE.TorusGeometry(2.15, 0.16, 8, 28);
    springRimGeo.rotateX(Math.PI / 2);
    const steamGeo = new THREE.SphereGeometry(0.18, 8, 6);
    this.hotSpringMat = new THREE.MeshBasicMaterial({
      color: 0x4df5e2,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    const springRimMat = new THREE.MeshStandardMaterial({
      color: 0x9b8c80,
      roughness: 0.75,
    });
    const steamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    });
    this.ownedGeos.push(springDiskGeo, springRimGeo, steamGeo);
    this.ownedMats.push(this.hotSpringMat, springRimMat, steamMat);
    this.hotSpringPoolGroup = new THREE.Group();
    const hsDisk = new THREE.Mesh(springDiskGeo, this.hotSpringMat);
    hsDisk.position.y = 0.06;
    const hsRim = new THREE.Mesh(springRimGeo, springRimMat);
    hsRim.position.y = 0.08;
    this.hotSpringPoolGroup.add(hsDisk, hsRim);
    for (let i = 0; i < 6; i++) {
      const puff = new THREE.Mesh(steamGeo, steamMat);
      this.hotSpringPoolGroup.add(puff);
      this.hotSpringSteam.push(puff);
    }
    this.hotSpringPoolGroup.visible = false;
    this.scene.add(this.hotSpringPoolGroup);

    // 3D Weather Particle System + Ambient Realm Motes + Aurora Sky Ribbons
    const wGeo = createWeatherCrystalGeometry();
    const wMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.86 });
    this.ownedGeos.push(wGeo);
    this.ownedMats.push(wMat);
    this.weatherInstMesh = new THREE.InstancedMesh(wGeo, wMat, this.weatherMax);
    this.weatherInstMesh.frustumCulled = false;
    this.weatherInstMesh.visible = false;
    this.scene.add(this.weatherInstMesh);

    const moteGeo = new THREE.OctahedronGeometry(0.08, 1);
    const moteMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });
    this.ownedGeos.push(moteGeo);
    this.ownedMats.push(moteMat);
    this.ambientMotesMesh = new THREE.InstancedMesh(moteGeo, moteMat, this.ambientMotesMax);
    this.ambientMotesMesh.frustumCulled = false;
    this.ambientMotesMesh.visible = true;
    this.scene.add(this.ambientMotesMesh);

    this.auroraGroup = new THREE.Group();
    const aurGeo = new THREE.PlaneGeometry(34, 4.5, 16, 1);
    this.ownedGeos.push(aurGeo);
    const aurCols = [0x64f5c1, 0xa87ef5, 0x7de0ff];
    for (let i = 0; i < 3; i++) {
      const aMat = new THREE.MeshBasicMaterial({
        color: aurCols[i],
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.ownedMats.push(aMat);
      const rib = new THREE.Mesh(aurGeo, aMat);
      rib.position.set((i - 1) * 4, 11 + i * 1.4, -12 - i * 3);
      rib.rotation.x = 0.35;
      this.auroraGroup.add(rib);
      this.auroraRibbons.push(rib);
    }
    this.auroraGroup.visible = false;
    this.scene.add(this.auroraGroup);

    // Dynamic Spell Blooms, Expanding Magic Toruses & Particle Sparkles
    const blGeo = new THREE.ConeGeometry(0.18, 0.14, 5);
    const blMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    this.ownedGeos.push(blGeo);
    this.ownedMats.push(blMat);
    const blMesh = new THREE.InstancedMesh(blGeo, blMat, 80);
    blMesh.frustumCulled = false;
    this.scene.add(blMesh);
    this.bloomBatch = { mesh: blMesh, max: 80, count: 0 };

    const ptGeo = new THREE.OctahedronGeometry(0.09, 0);
    const ptMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.ownedGeos.push(ptGeo);
    this.ownedMats.push(ptMat);
    const ptMesh = new THREE.InstancedMesh(ptGeo, ptMat, 260);
    ptMesh.frustumCulled = false;
    this.scene.add(ptMesh);
    this.particleVfxBatch = { mesh: ptMesh, max: 260, count: 0 };

    const rvGeo = new THREE.TorusGeometry(1.0, 0.045, 8, 32);
    rvGeo.rotateX(Math.PI / 2);
    this.ownedGeos.push(rvGeo);
    for (let i = 0; i < 24; i++) {
      const rm = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.8 });
      this.ownedMats.push(rm);
      const mesh = new THREE.Mesh(rvGeo, rm);
      mesh.visible = false;
      this.scene.add(mesh);
      this.ringVfxPool.push(mesh);
    }

    // Expanding Water Ripples & Footstep Dust/Splash Rings (pooled zero-GC InstancedMesh)
    const ripGeo = new THREE.RingGeometry(0.68, 1.0, 22);
    ripGeo.rotateX(-Math.PI / 2);
    const ripMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.56,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.ownedGeos.push(ripGeo);
    this.ownedMats.push(ripMat);
    this.waterRipplesMesh = new THREE.InstancedMesh(ripGeo, ripMat, this.waterRipplesMax);
    this.waterRipplesMesh.frustumCulled = false;
    this.waterRipplesMesh.count = 0;
    this.waterRipplesMesh.visible = false;
    this.scene.add(this.waterRipplesMesh);

    // 3D Waterside Fishing Stage (pre-allocated once, toggled when fishing)
    this.fishingStageGroup = new THREE.Group();
    this.fishingStageGroup.visible = false;
    this.scene.add(this.fishingStageGroup);

    this.fishingLedgeGroup = new THREE.Group();
    const plankMat = new THREE.MeshStandardMaterial({ color: 0xa46b3e, roughness: 0.72 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x6b4326, roughness: 0.78 });
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0xff8fb1, roughness: 0.56 });
    const cushionTrimMat = new THREE.MeshStandardMaterial({ color: 0xfff5e4, roughness: 0.5 });
    const lanternGlowMat = new THREE.MeshStandardMaterial({
      color: 0xffdf7a,
      emissive: 0xffb830,
      emissiveIntensity: 0.95,
      roughness: 0.25,
    });
    const plankGeo = new THREE.BoxGeometry(1.42, 0.14, 0.3);
    const crossBeamGeo = new THREE.BoxGeometry(0.14, 0.12, 1.05);
    const postGeo = new THREE.CylinderGeometry(0.085, 0.095, 1.45, 8);
    const cushionGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.09, 16);
    const cushionPipingGeo = new THREE.TorusGeometry(0.39, 0.025, 6, 18);
    cushionPipingGeo.rotateX(Math.PI / 2);
    const bucketGeo = new THREE.CylinderGeometry(0.17, 0.13, 0.24, 12);
    const lanternPostGeo = new THREE.CylinderGeometry(0.032, 0.038, 0.85, 8);
    const lanternBodyGeo = new THREE.OctahedronGeometry(0.11, 0);
    this.ownedGeos.push(
      plankGeo,
      crossBeamGeo,
      postGeo,
      cushionGeo,
      cushionPipingGeo,
      bucketGeo,
      lanternPostGeo,
      lanternBodyGeo
    );
    this.ownedMats.push(plankMat, postMat, cushionMat, cushionTrimMat, lanternGlowMat);

    // 4 staggered cedar planks forming a waterside ledge overhanging +Z toward water
    for (let p = 0; p < 4; p++) {
      const plank = new THREE.Mesh(plankGeo, plankMat);
      plank.position.set(p % 2 === 0 ? 0.02 : -0.02, 0.14, -0.34 + p * 0.27);
      plank.castShadow = !isMobile && !this.isSoftwareGl;
      plank.receiveShadow = !isMobile && !this.isSoftwareGl;
      this.fishingLedgeGroup.add(plank);
    }
    for (const bx of [-0.52, 0.52]) {
      const beam = new THREE.Mesh(crossBeamGeo, postMat);
      beam.position.set(bx, 0.04, 0.05);
      this.fishingLedgeGroup.add(beam);
      for (const pz of [-0.36, 0.44]) {
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(bx, -0.5, pz);
        this.fishingLedgeGroup.add(post);
      }
    }
    const cushion = new THREE.Mesh(cushionGeo, cushionMat);
    cushion.position.set(0, 0.23, 0.14);
    const piping = new THREE.Mesh(cushionPipingGeo, cushionTrimMat);
    piping.position.set(0, 0.24, 0.14);
    this.fishingLedgeGroup.add(cushion, piping);

    const bucket = new THREE.Mesh(bucketGeo, postMat);
    bucket.position.set(-0.52, 0.32, 0.08);
    this.fishingLedgeGroup.add(bucket);

    const lPost = new THREE.Mesh(lanternPostGeo, postMat);
    lPost.position.set(0.56, 0.56, 0.26);
    const lLantern = new THREE.Mesh(lanternBodyGeo, lanternGlowMat);
    lLantern.position.set(0.56, 1.0, 0.32);
    this.fishingLedgeGroup.add(lPost, lLantern);
    this.fishingStageGroup.add(this.fishingLedgeGroup);

    // 3D Floating Bobber
    this.fishingBobberGroup = new THREE.Group();
    const bobTopGeo = new THREE.SphereGeometry(0.11, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const bobBotGeo = new THREE.SphereGeometry(0.11, 14, 10, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);
    const bobPinGeo = new THREE.CylinderGeometry(0.018, 0.022, 0.16, 8);
    const bobRedMat = new THREE.MeshStandardMaterial({ color: 0xff5478, roughness: 0.32 });
    const bobCreamMat = new THREE.MeshStandardMaterial({ color: 0xfff8eb, roughness: 0.4 });
    this.ownedGeos.push(bobTopGeo, bobBotGeo, bobPinGeo);
    this.ownedMats.push(bobRedMat, bobCreamMat);
    const bobTop = new THREE.Mesh(bobTopGeo, bobRedMat);
    const bobBot = new THREE.Mesh(bobBotGeo, bobCreamMat);
    const bobPin = new THREE.Mesh(bobPinGeo, bobRedMat);
    bobPin.position.y = 0.11;
    this.fishingBobberGroup.add(bobTop, bobBot, bobPin);
    this.fishingStageGroup.add(this.fishingBobberGroup);

    // Pre-allocated 12-point Catenary Fishing Line
    this.fishingLinePositions = new Float32Array(12 * 3);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(this.fishingLinePositions, 3));
    const lineBasicMat = new THREE.LineBasicMaterial({ color: 0xeaf8ff, transparent: true, opacity: 0.88 });
    this.ownedGeos.push(lineGeo);
    this.ownedMats.push(lineBasicMat);
    this.fishingLine = new THREE.Line(lineGeo, lineBasicMat);
    this.fishingLine.frustumCulled = false;
    this.fishingStageGroup.add(this.fishingLine);

    // Sculpted 3D Leaping Fish + Celebration Sparkles
    this.caughtFishGroup = new THREE.Group();
    this.caughtFishBodyMat = new THREE.MeshStandardMaterial({
      color: 0xff9f43,
      roughness: 0.24,
      metalness: 0.12,
      emissive: 0x442200,
      emissiveIntensity: 0.18,
    });
    const fBodyGeo = new THREE.SphereGeometry(0.18, 16, 12);
    fBodyGeo.scale(0.68, 0.88, 1.48);
    const fTailGeo = new THREE.ConeGeometry(0.14, 0.22, 4);
    fTailGeo.rotateX(Math.PI / 2);
    const fDorsalGeo = new THREE.ConeGeometry(0.08, 0.16, 4);
    const fEyeGeo = new THREE.SphereGeometry(0.036, 8, 8);
    const fSparkGeo = new THREE.OctahedronGeometry(0.075, 0);
    const fEyeMat = new THREE.MeshBasicMaterial({ color: 0x22162b });
    const fSparkMat = new THREE.MeshBasicMaterial({ color: 0xffe46b });
    this.ownedGeos.push(fBodyGeo, fTailGeo, fDorsalGeo, fEyeGeo, fSparkGeo);
    this.ownedMats.push(this.caughtFishBodyMat, fEyeMat, fSparkMat);

    const fBody = new THREE.Mesh(fBodyGeo, this.caughtFishBodyMat);
    this.caughtFishTail = new THREE.Mesh(fTailGeo, this.caughtFishBodyMat);
    this.caughtFishTail.position.set(0, 0, -0.28);
    const fDorsal = new THREE.Mesh(fDorsalGeo, this.caughtFishBodyMat);
    fDorsal.position.set(0, 0.17, -0.02);
    fDorsal.rotation.x = -0.35;
    const fEyeL = new THREE.Mesh(fEyeGeo, fEyeMat);
    fEyeL.position.set(-0.09, 0.05, 0.15);
    const fEyeR = new THREE.Mesh(fEyeGeo, fEyeMat);
    fEyeR.position.set(0.09, 0.05, 0.15);
    this.caughtFishGroup.add(fBody, this.caughtFishTail, fDorsal, fEyeL, fEyeR);
    for (let s = 0; s < 6; s++) {
      const sp = new THREE.Mesh(fSparkGeo, fSparkMat);
      this.caughtFishGroup.add(sp);
      this.caughtFishSparkles.push(sp);
    }
    this.caughtFishGroup.visible = false;
    this.fishingStageGroup.add(this.caughtFishGroup);
    for (let i = 0; i < this.waterRipplesMax; i++) {
      this.stepRipples.push({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        age: 0,
        maxAge: 1,
        maxRadius: 1,
        colHex: 0xffffff,
      });
    }

    if (!this.isSoftwareGl) {
      const pr = this.renderer.getPixelRatio();
      const pw = Math.max(1, Math.round(w * pr));
      const ph = Math.max(1, Math.round(h * pr));
      const depthTex = new THREE.DepthTexture(pw, ph, THREE.UnsignedIntType);
      depthTex.format = THREE.DepthFormat;
      depthTex.minFilter = THREE.NearestFilter;
      depthTex.magFilter = THREE.NearestFilter;

      const composerRT = new THREE.WebGLRenderTarget(pw, ph, {
        type: THREE.HalfFloatType,
        depthBuffer: true,
        depthTexture: depthTex,
      });
      composerRT.texture.name = 'DioramaComposer.rt1';

      this.composer = new EffectComposer(this.renderer, composerRT);
      this.composer.setPixelRatio(pr);
      this.composer.setSize(w, h);

      this.renderPass = new RenderPass(this.scene, this.camera);
      this.dofPass = new TiltShiftGaussianDofPass(pw, ph);
      this.outputPass = new OutputPass();

      this.composer.addPass(this.renderPass);
      this.composer.addPass(this.dofPass);
      this.composer.addPass(this.outputPass);
    }

    this.renderer.compile(this.scene, this.camera);
  }

  private createCausticTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#072438';
      ctx.fillRect(0, 0, size, size);
      // Draw wrap-around overlapping sunlit ripple rings so texture tiles seamlessly
      const rings = [
        [24, 30, 28],
        [78, 22, 26],
        [48, 84, 32],
        [106, 94, 24],
        [16, 108, 22],
        [98, 52, 20],
      ];
      ctx.lineWidth = 2.6;
      for (const [cx, cy, r] of rings) {
        for (const ox of [-size, 0, size]) {
          for (const oy of [-size, 0, size]) {
            const x = cx + ox;
            const y = cy + oy;
            if (x < -r - 8 || x > size + r + 8 || y < -r - 8 || y > size + r + 8) continue;
            const grad = ctx.createRadialGradient(x, y, r * 0.55, x, y, r);
            grad.addColorStop(0, 'rgba(90, 235, 255, 0)');
            grad.addColorStop(0.75, 'rgba(130, 245, 255, 0.28)');
            grad.addColorStop(0.92, 'rgba(225, 255, 255, 0.58)');
            grad.addColorStop(1, 'rgba(90, 235, 255, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(16, 16);
    tex.needsUpdate = true;
    return tex;
  }

  private createTerrainChunkGeometry(): THREE.BufferGeometry {
    const stepsPerSide = CHUNK_SIZE * TERRAIN_SUBDIV;
    const vertsPerSide = stepsPerSide + 1;
    const count = vertsPerSide * vertsPerSide;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const meta = new Float32Array(count * 4);
    const indices: number[] = [];

    for (let gz = 0; gz < stepsPerSide; gz++) {
      for (let gx = 0; gx < stepsPerSide; gx++) {
        const a = gz * vertsPerSide + gx;
        const b = a + 1;
        const c = a + vertsPerSide;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aTerrainMeta', new THREE.BufferAttribute(meta, 4));
    geo.setIndex(indices);
    return geo;
  }

  private makeBatch(
    key: string,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    max: number,
    castShadow = true,
    receiveShadow = true
  ): InstancedBatch {
    this.ownedGeos.push(geo);
    this.ownedMats.push(mat);
    const mesh = new THREE.InstancedMesh(geo, mat, max);
    mesh.castShadow = castShadow && !this.isSoftwareGl;
    mesh.receiveShadow = receiveShadow;
    mesh.frustumCulled = false;
    mesh.count = 0;
    this.scene.add(mesh);
    const batch = { mesh, max, count: 0 };
    this.batches[key] = batch;
    return batch;
  }

  private initPropBatches(): void {
    // 1. Simple Stalks / Cactus Stems / Logs / Mushrooms
    const trunkGeo = new THREE.CylinderGeometry(0.11, 0.19, 0.85, 8);
    trunkGeo.translate(0, 0.425, 0);
    this.makeBatch(
      'trunks',
      trunkGeo,
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88 }),
      620,
      false,
      true
    );

    // 1b. Gnarled Flared-Root Forked Tree Trunks (Oak, Blossom, Sky Blossom, Pine, Moon Star-Blossom)
    const treeTrunkGeo = createOrganicTreeTrunkGeometry();
    this.makeBatch(
      'treeTrunks',
      treeTrunkGeo,
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }),
      760
    );

    // 2. Scalloped Multi-Lobe Foliage Canopy Clusters (Wind-Sway + Subsurface Glow Shader)
    const canopyGeo = createOrganicLeafClusterGeometry();
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72 });
    applyFoliageShader(canopyMat, this.shaderUniforms);
    this.makeBatch('canopies', canopyGeo, canopyMat, 3100);

    // 2b. Fluted Evergreen Pine Bough Skirts (Wind-Sway Foliage Shader)
    const pineBoughGeo = createFlutedPineBoughGeometry();
    const pineBoughMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.74 });
    applyFoliageShader(pineBoughMat, this.shaderUniforms);
    this.makeBatch('pineBoughs', pineBoughGeo, pineBoughMat, 920);

    // 3. Sharp Cones (Cirrus Castle Spires, Ice Crystals, Staghorn Corals, Agave)
    const coneGeo = new THREE.ConeGeometry(0.56, 0.85, 9);
    coneGeo.translate(0, 0.425, 0);
    this.makeBatch(
      'cones',
      coneGeo,
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65 }),
      1500,
      false,
      true
    );

    // 3b. Swaying Underwater Reef Kelp & Sea Anemone Plumes (Ocean Current Shader)
    const seaFloraGeo = new THREE.ConeGeometry(0.42, 0.9, 8, 4);
    seaFloraGeo.translate(0, 0.45, 0);
    const seaFloraMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.54 });
    applyUnderwaterSwayShader(seaFloraMat, this.shaderUniforms);
    this.makeBatch('seaFlora', seaFloraGeo, seaFloraMat, 1100, false, true);

    // 4. Faceted Boulders, Scree & Coastal Pebbles
    const rockGeo = new THREE.DodecahedronGeometry(0.42, 0);
    this.makeBatch(
      'rocks',
      rockGeo,
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, flatShading: true }),
      820,
      false,
      true
    );

    // 5. Boxes (Clam shells, Cactus arms, Signposts, Lantern posts, Castle Towers, Driftwood)
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    this.makeBatch(
      'boxes',
      boxGeo,
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.66 }),
      900
    );

    // 6. Emissive Glow Orbs / Blossoms / Coral Buds
    const domeGeo = new THREE.SphereGeometry(0.32, 12, 10);
    this.makeBatch(
      'glowSpheres',
      domeGeo,
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.48,
        roughness: 0.32,
      }),
      2400,
      false,
      false
    );

    // 6a-1. Domed Bell Toadstool & Bioluminescent Mushroom Caps
    const capGeo = createToadstoolCapGeometry();
    this.makeBatch(
      'toadstoolCaps',
      capGeo,
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.24,
        roughness: 0.44,
      }),
      1100,
      false,
      true
    );

    // 6a-2. Sculpted 5-Petal Cupped Wildflower Blossoms
    const flowerGeo = createWildflowerBlossomGeometry();
    this.makeBatch(
      'flowers',
      flowerGeo,
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.14,
        roughness: 0.46,
      }),
      900,
      false,
      true
    );

    // 6b. Living Wind-Swept & Trampled Biome Grass Tufts
    const grassGeo = createGrassTuftGeometry();
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.68,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    applyGrassShader(grassMat, this.shaderUniforms);
    this.makeBatch('grassBlades', grassGeo, grassMat, 5600, false, !this.isMobileMode && !this.isSoftwareGl);

    // 6c. Wing-Flapping Living Wildlife (Butterflies, Songbirds, Dragonflies, Sky Swallows, Jellyfish)
    const critterGeo = createCritterWingGeometry();
    const critterMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.24,
      roughness: 0.34,
      side: THREE.DoubleSide,
    });
    applyCritterWingShader(critterMat, this.shaderUniforms);
    this.makeBatch('critters', critterGeo, critterMat, 340, false, false);

    // 7. Collectibles (Spinning Star Gems, Pearls, Feathers, Moon Notes, Quest Items)
    const starGeo = new THREE.OctahedronGeometry(0.28, 0);
    this.makeBatch(
      'stars',
      starGeo,
      new THREE.MeshStandardMaterial({
        color: 0xffd23f,
        emissive: 0xffaa00,
        emissiveIntensity: 0.52,
        roughness: 0.2,
        metalness: 0.35,
      }),
      120,
      false,
      false
    );

    // 8. Sky Rainbow Torus Rings
    const ringGeo = new THREE.TorusGeometry(0.75, 0.09, 10, 24);
    this.makeBatch(
      'skyRings',
      ringGeo,
      new THREE.MeshStandardMaterial({
        color: 0xff9ebb,
        emissive: 0xff7aa8,
        emissiveIntensity: 0.45,
        roughness: 0.28,
      }),
      32,
      false,
      false
    );

    // 9. Reef Swimming Tropical Fish Bodies + Wagging Tail Fins
    const fishGeo = new THREE.SphereGeometry(0.16, 10, 8);
    fishGeo.scale(0.8, 0.72, 1.8);
    this.makeBatch(
      'fish',
      fishGeo,
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.28,
        metalness: 0.08,
        emissive: 0xffffff,
        emissiveIntensity: 0.12,
      }),
      360,
      false,
      false
    );

    const fishTailGeo = new THREE.ConeGeometry(0.13, 0.26, 4);
    fishTailGeo.rotateX(-Math.PI / 2);
    fishTailGeo.scale(0.28, 1.0, 1.0);
    this.makeBatch(
      'fishTails',
      fishTailGeo,
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.32,
        emissive: 0xffffff,
        emissiveIntensity: 0.16,
      }),
      360,
      false,
      false
    );

    // 10. Ice Bridge Crystalline Slabs
    const iceGeo = new THREE.BoxGeometry(0.98, 0.16, 0.98);
    this.makeBatch(
      'ice',
      iceGeo,
      new THREE.MeshStandardMaterial({
        color: 0xb9eeff,
        emissive: 0x4fb8e8,
        emissiveIntensity: 0.25,
        roughness: 0.14,
        metalness: 0.18,
        transparent: true,
        opacity: 0.88,
      }),
      180,
      false,
      true
    );

    // 11. Sheltered Surface Pond & Cove Floating Lily Pads
    const lilyGeo = createLilyPadGeometry();
    this.makeBatch(
      'lilyPads',
      lilyGeo,
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.36,
        metalness: 0.04,
      }),
      160,
      false,
      true
    );

    // 12. Grounding Soft Contact AO Shadows for Trees, Bushes & Boulders
    const propAoGeo = new THREE.PlaneGeometry(1.75, 1.75);
    propAoGeo.rotateX(-Math.PI / 2);
    this.makeBatch(
      'propShadows',
      propAoGeo,
      new THREE.MeshBasicMaterial({
        map: getSoftShadowTexture(),
        color: 0xffffff,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
      640,
      false,
      false
    );
  }

  private pushInstance(
    key: string,
    px: number,
    py: number,
    pz: number,
    sx: number,
    sy: number,
    sz: number,
    rx: number,
    ry: number,
    rz: number,
    colorHex: string | number
  ): void {
    const batch = this.batches[key];
    if (!batch || batch.count >= batch.max) return;
    _v3.set(px, py, pz);
    _euler.set(rx, ry, rz);
    _q.setFromEuler(_euler);
    _scale.set(sx, sy, sz);
    _m4.compose(_v3, _q, _scale);
    batch.mesh.setMatrixAt(batch.count, _m4);
    if (typeof colorHex === 'number') _col.setHex(colorHex);
    else _col.set(colorHex);
    if (key !== 'propShadows') {
      enrichVibrantColor(_col, 0.22, -0.03);
    }
    batch.mesh.setColorAt(batch.count, _col);
    batch.count++;
  }

  private pushInstanceDirected(
    key: string,
    px: number,
    py: number,
    pz: number,
    sx: number,
    sy: number,
    sz: number,
    pitch: number,
    yaw: number,
    roll: number,
    colorHex: string | number
  ): void {
    const batch = this.batches[key];
    if (!batch || batch.count >= batch.max) return;
    _v3.set(px, py, pz);
    _euler.set(pitch, yaw, roll, 'YXZ');
    _q.setFromEuler(_euler);
    _scale.set(sx, sy, sz);
    _m4.compose(_v3, _q, _scale);
    batch.mesh.setMatrixAt(batch.count, _m4);
    if (typeof colorHex === 'number') _col.setHex(colorHex);
    else _col.set(colorHex);
    if (key !== 'propShadows') {
      enrichVibrantColor(_col, 0.22, -0.03);
    }
    batch.mesh.setColorAt(batch.count, _col);
    batch.count++;
  }

  private buildStaticLandmarks(): void {
    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      this.ownedGeos.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      this.ownedMats.push(m);
      return m;
    };

    // 1. Ancient Great Lantern Tree Sanctuary
    const lt = buildDetailedGreatLanternTree(this.shaderUniforms, this.archPack, trackGeo, trackMat);
    this.lanternBarkMat = lt.barkMat;
    this.lanternCrownMat1 = lt.crownMat1;
    this.lanternCrownMat2 = lt.crownMat2;
    this.lanternOrbs = lt.lanternOrbs;
    lt.group.visible = false;
    this.landmarkGroup.add(lt.group);
    this.lanternTreeGroup = lt.group;

    // 2. Hero Player Bespoke Mochi House (Main half-timbered gable + glass conservatory + picket fence + mailbox)
    const home = buildDetailedHeroMochiHouse(this.shaderUniforms, this.archPack, trackGeo, trackMat);
    this.homeSmokePuffs = home.smokePuffs;
    home.group.visible = false;
    this.landmarkGroup.add(home.group);
    this.homeGroup = home.group;

    // 3. Carved Rune-Stone Portals, Glowdeep Cauldron & Moon Road Tea House
    const addPortal = (ringHex: number, coreHex: number) => {
      const arch = buildDetailedPortalArch(ringHex, coreHex, this.shaderUniforms, this.archPack, trackGeo, trackMat);
      arch.visible = false;
      this.landmarkGroup.add(arch);
      return arch;
    };
    this.glowPortalGroup = addPortal(0x64f5c1, 0xb48cff);
    this.moonPortalGroup = addPortal(0xffd23f, 0x9980ff);
    this.glowReturnGroup = addPortal(0x7bd88f, 0xd2ffe1);
    this.moonReturnGroup = addPortal(0xffd23f, 0x8fd5ff);

    const cauldron = buildDetailedCauldronShrine(this.archPack, trackGeo, trackMat);
    this.cauldronBubbles = cauldron.bubbles;
    cauldron.group.position.set(
      WORLD_ANCHORS.glowdeep.rootedRest.tx + 0.5,
      0.16,
      WORLD_ANCHORS.glowdeep.rootedRest.ty + 0.5
    );
    cauldron.group.visible = false;
    this.landmarkGroup.add(cauldron.group);
    this.cauldronGroup = cauldron.group;

    const tea = buildDetailedTeaHouseGazebo(this.archPack, trackGeo, trackMat);
    this.teaCrescent = tea.crescent;
    tea.group.position.set(
      WORLD_ANCHORS.moonroad.teaHouse.tx + 0.5,
      0.46,
      WORLD_ANCHORS.moonroad.teaHouse.ty + 0.5
    );
    tea.group.visible = false;
    this.landmarkGroup.add(tea.group);
    this.teaHouseGroup = tea.group;

    // 4. All 24 Map-Synced Archipelago, Reef, Sky, Glowdeep & Moon Road Landmarks
    this.customLandmarks = buildAllLandmarks3D(
      this.landmarkGroup,
      this.ownedGeos,
      this.ownedMats,
      this.shaderUniforms
    );

    // 5. Full 6-Room Architectural 3D Mochi House Interior
    this.houseInterior = buildHouseInterior3D(this.archPack, trackGeo, trackMat);
    this.houseInterior.group.position.set(HOUSE_ORIGIN_TX, 0, HOUSE_ORIGIN_TZ);
    this.houseInterior.group.visible = false;
    this.scene.add(this.houseInterior.group);
  }

  private getLayerName(W: World3DSyncState): WorldLayer3D {
    if (W.player.house) return 'house';
    if (W.player.sky) return 'sky';
    if (W.player.dive) return 'dive';
    if (W.player.glowdeep) return 'glowdeep';
    if (W.player.moonroad) return 'moonroad';
    return 'surface';
  }

  private sampleSurfaceTileColor(
    ix: number,
    iz: number,
    W: World3DSyncState,
    season: SeasonId,
    out: THREE.Color
  ): { biomeCode: number; roadW: number } {
    const x = Math.max(0, Math.min(N - 1, ix));
    const z = Math.max(0, Math.min(N - 1, iz));
    const idx = z * N + x;
    const b = W.B[idx];
    const tw = W.TW[idx];

    if (tw > 0 && b >= 2) {
      out.set(tw === 2 ? '#ecd9b2' : '#d9c094');
      return { biomeCode: 3, roadW: tw === 2 ? 1.0 : 0.52 };
    }
    if (b < 2) {
      out.set(b === 1 ? '#22addb' : '#0d4a84');
      return { biomeCode: b, roadW: 0 };
    }
    out.set(getSeasonalBiomeColor(b, season));
    enrichVibrantColor(out, 0.25, -0.042);
    const nVar = (hash(x, z, 19) - 0.5) * 0.08;
    out.offsetHSL(0, 0, nVar);
    const biomeCode = b === 2 ? 2 : b === 6 ? 5 : b === 7 ? 6 : b === 8 ? 7 : b === 4 ? 4 : 3;
    return { biomeCode, roadW: 0 };
  }

  private rebuildWorldMapTexture(layer: WorldLayer3D, W: World3DSyncState): void {
    if (layer === 'house') return;
    const size = this.worldMapSize;
    const data = this.worldMapBytes;
    const isSurface = layer === 'surface';
    for (let z = 0; z < size; z++) {
      const rowOff = z * size;
      for (let x = 0; x < size; x++) {
        const idx = rowOff + x;
        const h = getTerrainHeight3D(x + 0.5, z + 0.5, layer, W.B, W.SB, W.iceMap);
        const r = Math.max(0, Math.min(255, Math.round(((h + 2.4) / 8.0) * 255)));
        const b = W.B[idx];
        const tw = isSurface ? W.TW[idx] : 0;
        const g = b >= 2 ? 255 : b === 1 ? 128 : 0;
        const bByte = tw === 2 ? 255 : tw === 1 ? 140 : 0;
        const aByte = Math.max(0, Math.min(255, Math.round((b / 8) * 255)));
        const p4 = idx * 4;
        data[p4] = r;
        data[p4 + 1] = g;
        data[p4 + 2] = bByte;
        data[p4 + 3] = aByte;
      }
    }
    this.worldMapTex.needsUpdate = true;
  }

  private rebuildTerrainChunk(
    originTx: number,
    originTz: number,
    layer: WorldLayer3D,
    W: World3DSyncState
  ): void {
    if (layer === 'house') return;
    const pos = this.terrainGeo.getAttribute('position') as THREE.BufferAttribute;
    const col = this.terrainGeo.getAttribute('color') as THREE.BufferAttribute;
    const meta = this.terrainGeo.getAttribute('aTerrainMeta') as THREE.BufferAttribute;
    const stepsPerSide = CHUNK_SIZE * TERRAIN_SUBDIV;
    const vertsPerSide = stepsPerSide + 1;
    const step = 1 / TERRAIN_SUBDIV;
    const season = W.season || 'spring';
    const wt = SEASON_THEMES[season].world;

    for (let gz = 0; gz < vertsPerSide; gz++) {
      const tz = originTz + gz * step;
      const clampedZ = Math.max(0, Math.min(N - 1, tz));
      const izFloor = Math.max(0, Math.min(N - 1, Math.floor(clampedZ)));
      for (let gx = 0; gx < vertsPerSide; gx++) {
        const tx = originTx + gx * step;
        const clampedX = Math.max(0, Math.min(N - 1, tx));
        const ixFloor = Math.max(0, Math.min(N - 1, Math.floor(clampedX)));
        const vIdx = gz * vertsPerSide + gx;
        const idx = izFloor * N + ixFloor;

        const h = getTerrainHeight3D(clampedX, clampedZ, layer, W.B, W.SB, W.iceMap);
        pos.setXYZ(vIdx, tx, h, tz);

        let biomeCode = 3;
        let roadW = 0;

        // Seasonal Vertex Color & Metadata Mapping per Biome & Layer
        if (layer === 'sky') {
          const sb = W.SB[idx];
          if (sb === 2) _col.set('#ffffff');
          else if (sb === 4) _col.set('#ffcf60');
          else if (sb === 3) _col.set('#e9f7ff');
          else if (sb === 1) {
            _col.set(wt.grassLight);
            enrichVibrantColor(_col, 0.24, -0.03);
          } else {
            _col.set('#f5fbff');
          }
          biomeCode = sb;
        } else if (layer === 'dive') {
          const sx = clampedX - 0.5;
          const sz = clampedZ - 0.5;
          const x0 = Math.floor(sx);
          const z0 = Math.floor(sz);
          const fx = sx - x0;
          const fz = sz - z0;
          const sampleB = (qx: number, qz: number) =>
            W.B[Math.max(0, Math.min(N - 1, qz)) * N + Math.max(0, Math.min(N - 1, qx))];
          const b00 = sampleB(x0, z0);
          const b10 = sampleB(x0 + 1, z0);
          const b01 = sampleB(x0, z0 + 1);
          const b11 = sampleB(x0 + 1, z0 + 1);
          const sandMix =
            ((b00 === 1 ? 1 : 0) * (1 - fx) + (b10 === 1 ? 1 : 0) * fx) * (1 - fz) +
            ((b01 === 1 ? 1 : 0) * (1 - fx) + (b11 === 1 ? 1 : 0) * fx) * fz;
          const grottoMix =
            ((b00 >= 2 ? 1 : 0) * (1 - fx) + (b10 >= 2 ? 1 : 0) * fx) * (1 - fz) +
            ((b01 >= 2 ? 1 : 0) * (1 - fx) + (b11 >= 2 ? 1 : 0) * fx) * fz;
          _col.set('#0d4e7d').lerp(_col2.set('#1f88a8'), grottoMix * 0.85).lerp(_col2.set('#ebd391'), sandMix);
          const nVar = (hash(ixFloor, izFloor, 29) - 0.5) * 0.045;
          _col.offsetHSL(0, 0, nVar);
          biomeCode = Math.max(sandMix, grottoMix * 0.65);
        } else if (layer === 'glowdeep') {
          const cell = getGlowdeepCell(ixFloor, izFloor);
          if (cell === 'wall') {
            _col.set('#271454');
            biomeCode = 1;
          } else if (cell === 'canal') {
            _col.set('#17dce8');
            biomeCode = 4;
          } else if (cell === 'roots') {
            _col.set('#825233');
            biomeCode = 2;
          } else if (cell === 'cinder') {
            _col.set('#9e2e56');
            biomeCode = 3;
          } else if (cell === 'glowcap') {
            _col.set('#4f2c91');
            biomeCode = 5;
          } else {
            _col.set('#3b2170');
            biomeCode = 0;
          }
        } else if (layer === 'moonroad') {
          const cell = getMoonRoadCell(ixFloor, izFloor);
          if (cell === 'platform') _col.set('#fff0a8');
          else if (cell === 'road') _col.set('#d5c4ff');
          else if (cell === 'silence') _col.set('#39405e');
          else if (cell === 'nebula') _col.set(hash(ixFloor, izFloor, 443) > 0.5 ? '#4c2c85' : '#583496');
          else _col.set('#140c33');
        } else {
          // Smooth bilinear color & biome blend across sub-tile vertices
          const sx = clampedX - 0.5;
          const sz = clampedZ - 0.5;
          const x0 = Math.floor(sx);
          const z0 = Math.floor(sz);
          const fx = sx - x0;
          const fz = sz - z0;
          const ux = fx * fx * (3 - 2 * fx);
          const uz = fz * fz * (3 - 2 * fz);

          const m00 = this.sampleSurfaceTileColor(x0, z0, W, season, _col);
          const r00 = _col.r, g00 = _col.g, b00 = _col.b;
          const m10 = this.sampleSurfaceTileColor(x0 + 1, z0, W, season, _col2);
          const r10 = _col2.r, g10 = _col2.g, b10 = _col2.b;
          const w00 = (1 - ux) * (1 - uz);
          const w10 = ux * (1 - uz);

          const m01 = this.sampleSurfaceTileColor(x0, z0 + 1, W, season, _col);
          const r01 = _col.r, g01 = _col.g, b01 = _col.b;
          const m11 = this.sampleSurfaceTileColor(x0 + 1, z0 + 1, W, season, _col2);
          const r11 = _col2.r, g11 = _col2.g, b11 = _col2.b;
          const w01 = (1 - ux) * uz;
          const w11 = ux * uz;

          _col.setRGB(
            r00 * w00 + r10 * w10 + r01 * w01 + r11 * w11,
            g00 * w00 + g10 * w10 + g01 * w01 + g11 * w11,
            b00 * w00 + b10 * w10 + b01 * w01 + b11 * w11
          );
          biomeCode = m00.biomeCode * w00 + m10.biomeCode * w10 + m01.biomeCode * w01 + m11.biomeCode * w11;
          roadW = m00.roadW * w00 + m10.roadW * w10 + m01.roadW * w01 + m11.roadW * w11;
        }
        col.setXYZ(vIdx, _col.r, _col.g, _col.b);
        meta.setXYZW(vIdx, biomeCode, roadW, h, hash(ixFloor, izFloor, 77));
      }
    }

    pos.needsUpdate = true;
    col.needsUpdate = true;
    meta.needsUpdate = true;
    this.terrainGeo.computeVertexNormals();
    this.terrainGeo.computeBoundingSphere();
  }

  private rebuildStaticPropInstances(
    centerTx: number,
    centerTz: number,
    layer: WorldLayer3D,
    W: World3DSyncState,
    propRadius: number
  ): void {
    // Reset all batch counters & hide pooled props
    for (const k of Object.keys(this.batches)) {
      this.batches[k].count = 0;
    }

    for (const c of this.cottagePool) c.visible = false;
    for (const f of this.fountainPool) f.visible = false;
    for (const tw of this.townWellPool) tw.visible = false;
    for (const fa of this.festivalArchPool) fa.visible = false;
    for (const fc of this.flowerCartPool) fc.visible = false;
    for (const bs of this.bistroPool) bs.visible = false;
    for (const hp of this.pierClusterPool) hp.visible = false;
    for (const nb of this.noticeboardPool) nb.visible = false;
    for (const sv of ['bakery', 'produce', 'alchemy', 'fish'] as const) {
      for (const ms of this.marketStallPools[sv]) ms.visible = false;
    }
    for (const d of this.bubbleDomePool) d.visible = false;
    for (const bt of this.boatPool) bt.visible = false;
    this.boatAnchors.length = 0;
    this.plazaLightAnchors.length = 0;
    const cottageStyleIdx: Record<TownArchStyle, number> = {
      meadow: 0,
      coastal: 0,
      desert: 0,
      nordic: 0,
      blossom: 0,
    };
    const stallStyleIdx: Record<'bakery' | 'produce' | 'alchemy' | 'fish', number> = {
      bakery: 0,
      produce: 0,
      alchemy: 0,
      fish: 0,
    };
    let fountainIdx = 0;
    let wellIdx = 0;
    let archIdx = 0;
    let cartIdx = 0;
    let bistroIdx = 0;
    let pierIdx = 0;
    let boardIdx = 0;
    let domeIdx = 0;
    if (layer === 'house') {
      for (const k of Object.keys(this.batches)) {
        const b = this.batches[k];
        b.mesh.count = 0;
        b.mesh.instanceMatrix.needsUpdate = true;
      }
      return;
    }

    const minX = Math.max(1, centerTx - propRadius);
    const maxX = Math.min(N - 2, centerTx + propRadius);
    const minZ = Math.max(1, centerTz - propRadius);
    const maxZ = Math.min(N - 2, centerTz + propRadius);
    const season = W.season || 'spring';
    const wt = SEASON_THEMES[season].world;

    if (layer === 'surface') {
      const grassBaseHex = wt.grassLight || '#6fd67e';
      const grassDeepHex = wt.grassDark || '#42b361';
      const spanX = maxX - minX + 2;
      const spanZ = maxZ - minZ + 2;
      const neededCache = spanX * spanZ;
      if (this.surfaceHeightCache.length < neededCache) {
        this.surfaceHeightCache = new Float32Array(neededCache);
      }
      for (let gz = 0; gz < spanZ; gz++) {
        const tz = minZ + gz + 0.5;
        for (let gx = 0; gx < spanX; gx++) {
          this.surfaceHeightCache[gz * spanX + gx] = getTerrainHeight3D(minX + gx + 0.5, tz, 'surface', W.B, W.SB, W.iceMap);
        }
      }

      for (let z = minZ; z <= maxZ; z++) {
        const gzRow = (z - minZ) * spanX;
        const dzFocus = z - centerTz;
        for (let x = minX; x <= maxX; x++) {
          const idx = z * N + x;
          const b = W.B[idx];
          const tw = W.TW[idx];
          // Ice bridge tile on water
          if (b < 2 && W.iceMap.has(idx)) {
            this.pushInstance('ice', x + 0.5, 0.06, z + 0.5, 1, 1, 1, 0, 0, 0, 0xb9eeff);
          }

          // Lily Path Harmony bridge on water (giant floating lily pads + lotus blooms!)
          if (b < 2 && W.lilyMap && W.lilyMap.has(idx)) {
            this.pushInstance('lilyPads', x + 0.5, 0.048, z + 0.5, 1.75, 1.2, 1.75, 0, (x * 1.1 + z * 0.7) % (Math.PI * 2), 0, '#38b86a');
            this.pushInstance('flowers', x + 0.5, 0.095, z + 0.5, 0.85, 0.85, 0.85, 0, (x + z) * 0.9, 0, (x + z) % 2 === 0 ? '#ff94bd' : '#fff5de');
          }

          const dk = W.DK[idx];
          const h1 = hash(x, z, 601);
          const h2 = hash(x, z, 602);
          const h3 = hash(x, z, 603);
          const h4 = hash(x, z, 604);
          const wx = x + 0.5;
          const wz = z + 0.5;
          const gxRel = x - minX;
          const gy = this.surfaceHeightCache[gzRow + gxRel];
          const gyDx = this.surfaceHeightCache[gzRow + gxRel + 1];
          const gyDz = this.surfaceHeightCache[gzRow + spanX + gxRel];
          const localSlope = Math.abs(gyDx - gy) + Math.abs(gyDz - gy);
          const nearFocusForGrass = (x - centerTx) * (x - centerTx) + dzFocus * dzFocus <= 324;

          // Sheltered pond/cove water lilies, lotus blooms & swaying shore reeds
          if (b === 1 && !W.iceMap.has(idx) && !dk && h1 < 0.085 && gy > -0.48) {
            const nL = W.B[(z - 1) * N + x];
            const nR = W.B[(z + 1) * N + x];
            const nU = W.B[z * N + (x - 1)];
            const nD = W.B[z * N + (x + 1)];
            const touchesMeadow =
              nL === 3 || nL === 4 || nL === 5 || nR === 3 || nR === 4 || nR === 5 ||
              nU === 3 || nU === 4 || nU === 5 || nD === 3 || nD === 4 || nD === 5;
            if (touchesMeadow) {
              const lx = wx + (h2 - 0.5) * 0.42;
              const lz = wz + (h3 - 0.5) * 0.42;
              this.pushInstance('lilyPads', lx, 0.038, lz, 0.9 + h4 * 0.35, 1, 0.9 + h4 * 0.35, 0, h1 * 6.28, 0, h2 > 0.5 ? '#48b86a' : '#359c5b');
              if (h4 < 0.48) {
                this.pushInstance('flowers', lx + 0.05, 0.055, lz - 0.03, 0.58, 0.58, 0.58, 0, h3 * 6.28, 0, h2 > 0.4 ? '#ff94bd' : '#fff5de');
              }
              if (h1 < 0.042) {
                const rx = wx + (nL >= 3 ? -0.35 : nR >= 3 ? 0.35 : 0);
                const rz = wz + (nU >= 3 ? -0.35 : nD >= 3 ? 0.35 : 0);
                this.pushInstance('grassBlades', rx, -0.04, rz, 0.95, 1.45, 0.95, 0, h4 * 6.28, 0, '#4ea65a');
                this.pushInstance('trunks', rx + 0.05, -0.02, rz + 0.04, 0.2, 0.55, 0.2, 0.04, h2 * 4, 0, '#6e452b');
              }
            }
          }

          // Cozy village plaza flower planters & moored coastal rowboats
          if (tw === 2 && !dk && h1 < 0.06 && h2 > 0.35) {
            this.pushInstance('rocks', wx + 0.28, gy + 0.12, wz + 0.28, 0.34, 0.24, 0.34, 0, h3 * 3, 0, '#b57b56');
            this.pushInstance('glowSpheres', wx + 0.28, gy + 0.29, wz + 0.28, 0.38, 0.26, 0.38, 0, 0, 0, wt.flowerPetals[h3 > 0.5 ? 0 : 1]);
          }
          if (b === 2 && !dk && this.boatAnchors.length < this.boatPool.length && h1 < 0.045) {
            const dirs: [number, number][] = [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ];
            for (const [ox, oz] of dirs) {
              const nx = x + ox;
              const nz = z + oz;
              if (nx > 1 && nx < N - 2 && nz > 1 && nz < N - 2 && W.B[nz * N + nx] < 2 && W.B[(nz + oz) * N + (nx + ox)] < 2) {
                const bx = nx + ox * 0.45 + 0.5;
                const bz = nz + oz * 0.45 + 0.5;
                let tooClose = false;
                for (const ba of this.boatAnchors) {
                  if (Math.hypot(ba.x - bx, ba.z - bz) < 9) {
                    tooClose = true;
                    break;
                  }
                }
                if (!tooClose) {
                  this.boatAnchors.push({ x: bx, z: bz, yaw: Math.atan2(oz, -ox) + h2 * 0.6 });
                  break;
                }
              }
            }
          }

          // Biome-specific living 3D grass tufts & natural ground scatter (skip sheer vertical cliff faces)
          const hasStructure =
            dk === 10 ||
            dk === 14 ||
            dk === 11 ||
            dk === 12 ||
            dk === 13 ||
            (dk >= 17 && dk <= 23);
          if (b >= 2 && tw === 0 && !hasStructure && localSlope < 0.44) {
            if (b === 3 || b === 5) {
              // Meadow & Blossom Glade: dense swaying grass carpets + clover/petal flecks
              if (nearFocusForGrass) {
                const tuftCount = h3 < 0.72 ? (h4 < 0.36 ? 2 : 1) : 0;
                for (let g = 0; g < tuftCount; g++) {
                  const gh = hash(x * 3 + g, z * 5 + g, 611);
                  const ox = (hash(x, z + g * 7, 612) - 0.5) * 0.76;
                  const oz = (hash(x + g * 7, z, 613) - 0.5) * 0.76;
                  const gx = wx + ox;
                  const gz = wz + oz;
                  const ggy = localSlope < 0.14 ? gy : getTerrainHeight3D(gx, gz, 'surface', W.B, W.SB, W.iceMap);
                  const gs = 0.82 + gh * 0.55;
                  const gCol = b === 5 && gh > 0.65 ? '#ff9ec2' : gh > 0.45 ? grassBaseHex : grassDeepHex;
                  this.pushInstance('grassBlades', gx, ggy - 0.02, gz, gs, gs * (0.85 + gh * 0.45), gs, 0, gh * 6.28, 0, gCol);
                }
              }
              if (!dk && h1 < 0.09) {
                // Sculpted 5-petal wildflower / clover blossom
                const fx = wx + (h2 - 0.5) * 0.5;
                const fz = wz + (h4 - 0.5) * 0.5;
                const fgy = localSlope < 0.14 ? gy : getTerrainHeight3D(fx, fz, 'surface', W.B, W.SB, W.iceMap);
                const fs = 0.65 + h3 * 0.35;
                this.pushInstance('flowers', fx, fgy + 0.02, fz, fs, fs, fs, 0, h4 * 6.28, 0, b === 5 ? wt.blossomPetal : wt.flowerPetals[h2 > 0.5 ? 0 : 1]);
              } else if (!dk && h1 > 0.94) {
                this.pushInstance('rocks', wx + (h2 - 0.5) * 0.4, gy + 0.04, wz + (h3 - 0.5) * 0.4, 0.26, 0.14, 0.24, h1, h2 * 3, 0, '#9a96a8');
              }
            } else if (b === 4) {
              // Whisper Woods: lush tall fern/emerald grass tufts + mossy logs & fallen twigs
              if (nearFocusForGrass && h3 < 0.62) {
                const gx = wx + (h1 - 0.5) * 0.7;
                const gz = wz + (h2 - 0.5) * 0.7;
                const ggy = localSlope < 0.14 ? gy : getTerrainHeight3D(gx, gz, 'surface', W.B, W.SB, W.iceMap);
                const gs = 1.0 + h4 * 0.55;
                this.pushInstance('grassBlades', gx, ggy - 0.02, gz, gs * 1.15, gs * 1.12, gs * 1.15, 0, h1 * 6.28, 0, h4 > 0.4 ? '#2e8f58' : grassDeepHex);
              }
              if (!dk && h4 < 0.065) {
                // Mossy fallen log
                this.pushInstance('trunks', wx, gy + 0.12, wz, 0.65, 0.85, 0.65, Math.PI / 2, h1 * 3.14, 0, '#5a3a29');
                this.pushInstance('canopies', wx + 0.12, gy + 0.18, wz, 0.28, 0.14, 0.26, 0, h2, 0, '#46ab66');
              } else if (!dk && h1 > 0.91) {
                // Tiny forest shelf fungi
                this.pushInstance('glowSpheres', wx, gy + 0.08, wz, 0.24, 0.14, 0.24, 0, 0, 0, '#ffd478');
              }
            } else if (b === 2) {
              // Beach: coastal pebbles, driftwood & sea-oats grass
              if (!dk && h3 < 0.24) {
                const gx = wx + (h1 - 0.5) * 0.6;
                const gz = wz + (h2 - 0.5) * 0.6;
                const ggy = getTerrainHeight3D(gx, gz, 'surface', W.B, W.SB, W.iceMap);
                this.pushInstance('grassBlades', gx, ggy - 0.02, gz, 0.9, 1.05, 0.9, 0, h4 * 6.28, 0, '#c7cf74');
              }
              if (!dk && h1 < 0.11) {
                // Smooth beach pebbles cluster
                this.pushInstance('rocks', wx, gy + 0.03, wz, 0.28, 0.14, 0.24, 0, h2 * 4, 0, h4 > 0.5 ? '#c7bfae' : '#9aa1ab');
                this.pushInstance('rocks', wx + 0.18, gy + 0.02, wz + 0.12, 0.18, 0.1, 0.18, 0, h1 * 4, 0, '#ded6c6');
              } else if (!dk && h4 > 0.95) {
                // Weathered driftwood branch
                this.pushInstance('boxes', wx, gy + 0.06, wz, 0.62, 0.1, 0.12, 0.05, h2 * 3, 0.06, '#b09172');
              } else if (!dk && h2 > 0.96) {
                // Coral starfish
                this.pushInstance('glowSpheres', wx, gy + 0.04, wz, 0.26, 0.08, 0.26, 0, h1 * 3, 0, '#ff7866');
              }
            } else if (b === 6) {
              // Sunlit Dunes: desert sage/agave rosettes, golden marram tufts & sandstone canyon boulders
              if (!dk && h3 < 0.22) {
                const gx = wx + (h1 - 0.5) * 0.6;
                const gz = wz + (h2 - 0.5) * 0.6;
                const ggy = getTerrainHeight3D(gx, gz, 'surface', W.B, W.SB, W.iceMap);
                this.pushInstance('grassBlades', gx, ggy - 0.02, gz, 0.85, 0.92, 0.85, 0, h4 * 6.28, 0, '#d8be66');
              }
              if (!dk && h1 < 0.075) {
                // Desert agave rosette (3 splayed pointed blades)
                for (let a = 0; a < 3; a++) {
                  const ang = (a / 3) * Math.PI * 2 + h2 * 3;
                  this.pushInstance('cones', wx + Math.cos(ang) * 0.08, gy, wz + Math.sin(ang) * 0.08, 0.18, 0.42, 0.18, Math.sin(ang) * 0.52, ang, -Math.cos(ang) * 0.52, '#6ba66c');
                }
              } else if (!dk && h4 > 0.90) {
                // Warm sandstone canyon rock rib
                this.pushInstance('rocks', wx, gy + 0.08, wz, 0.46, 0.26, 0.38, 0.2, h1 * 4, 0, '#c98e5b');
              }
            } else if (b === 7) {
              // Frostpeak Tundra: translucent cyan ice crystal spires & frosted grass
              if (!dk && h3 < 0.2) {
                const gx = wx + (h1 - 0.5) * 0.6;
                const gz = wz + (h2 - 0.5) * 0.6;
                const ggy = getTerrainHeight3D(gx, gz, 'surface', W.B, W.SB, W.iceMap);
                this.pushInstance('grassBlades', gx, ggy - 0.02, gz, 0.78, 0.82, 0.78, 0, h4 * 6.28, 0, '#9bd6cf');
              }
              if (!dk && h1 < 0.085) {
                // Crystal ice cluster
                this.pushInstance('cones', wx, gy, wz, 0.22, 0.58 + h2 * 0.28, 0.22, 0.12, h4 * 4, -0.1, '#9eedff');
                this.pushInstance('cones', wx + 0.14, gy, wz + 0.08, 0.16, 0.4, 0.16, -0.22, h1 * 3, 0.24, '#70d8ff');
              } else if (!dk && h4 > 0.92) {
                // Snow-dusted slate rock
                this.pushInstance('rocks', wx, gy + 0.1, wz, 0.45, 0.3, 0.42, h1, h2 * 3, 0, '#9aaec2');
              }
            } else if (b === 8) {
              // Pebble Peaks: alpine grass tufts + stacked slate cairn scree
              if (!dk && h3 < 0.3) {
                const gx = wx + (h1 - 0.5) * 0.65;
                const gz = wz + (h2 - 0.5) * 0.65;
                const ggy = getTerrainHeight3D(gx, gz, 'surface', W.B, W.SB, W.iceMap);
                this.pushInstance('grassBlades', gx, ggy - 0.02, gz, 0.78, 0.76, 0.78, 0, h4 * 6.28, 0, '#6cb06e');
              }
              if (!dk && h1 < 0.12) {
                this.pushInstance('rocks', wx, gy + 0.1, wz, 0.48, 0.28, 0.44, h1 * 0.4, h2 * 4, 0, '#78778c');
                if (h4 > 0.5) {
                  this.pushInstance('rocks', wx + 0.04, gy + 0.28, wz - 0.02, 0.28, 0.2, 0.28, h2 * 0.3, h1 * 3, 0, '#9291a8');
                }
              }
            }
          }

          if (!dk || dk === 16) continue;

          if (dk === 10) {
            let nearTown: Town | null = null;
            let bestDist = 18;
            for (const tw of W.towns) {
              if (tw.w !== 0) continue;
              const d = Math.hypot(tw.x - x, tw.y - z);
              if (d < bestDist) {
                bestDist = d;
                nearTown = tw;
              }
            }
            const archStyle: TownArchStyle =
              nearTown?.arch ??
              (b === 2 ? 'coastal' : b === 6 ? 'desert' : b === 7 || b === 8 ? 'nordic' : b === 5 ? 'blossom' : 'meadow');
            const pool = this.cottagePoolsByStyle[archStyle];
            const sIdx = cottageStyleIdx[archStyle];
            if (sIdx < pool.groups.length) {
              const cot = pool.groups[sIdx];
              const rMat = pool.roofMats[sIdx];
              cottageStyleIdx[archStyle]++;
              const cgy = getTerrainHeight3D(wx + 1.0, wz - 0.5, 'surface', W.B, W.SB, W.iceMap);
              cot.position.set(wx + 1.0, cgy, wz - 0.5);
              // Face south (+Z) for north-side rows, or north (-Z) toward town center for south-side rows
              cot.rotation.y = nearTown && z > nearTown.y ? Math.PI : 0;
              rMat.color.setHex(TOWN_ROOF_HEX[(x + z) % TOWN_ROOF_HEX.length]);
              enrichVibrantColor(rMat.color, 0.22, -0.03);
              cot.visible = true;
            }
          } else if (dk === 14) {
            if (fountainIdx < this.fountainPool.length) {
              const fn = this.fountainPool[fountainIdx++];
              fn.position.set(wx, gy, wz);
              fn.visible = true;
              if (this.plazaLightAnchors.length < this.townPlazaLights.length) {
                this.plazaLightAnchors.push({ x: wx, y: gy + 2.2, z: wz });
              }
            }
          } else if (dk === 17) {
            // Bustling Striped Market Stall facing toward town center
            let nearTown: Town | null = null;
            let bestDist = 18;
            for (const tw of W.towns) {
              if (tw.w !== 0) continue;
              const d = Math.hypot(tw.x - x, tw.y - z);
              if (d < bestDist) {
                bestDist = d;
                nearTown = tw;
              }
            }
            const arch = nearTown?.arch ?? 'meadow';
            const variant: 'bakery' | 'produce' | 'alchemy' | 'fish' =
              arch === 'coastal'
                ? 'fish'
                : arch === 'blossom' || nearTown?.n === 'Mossgate'
                ? h1 > 0.45
                  ? 'alchemy'
                  : 'produce'
                : h1 > 0.5
                ? 'bakery'
                : 'produce';
            const pool = this.marketStallPools[variant];
            const sIdx = stallStyleIdx[variant];
            if (sIdx < pool.length) {
              const ms = pool[sIdx];
              stallStyleIdx[variant]++;
              ms.position.set(wx, gy, wz);
              ms.rotation.y = nearTown ? Math.atan2(nearTown.x + 0.5 - wx, nearTown.y + 0.5 - wz) : 0;
              ms.visible = true;
              if (this.plazaLightAnchors.length < this.townPlazaLights.length) {
                this.plazaLightAnchors.push({ x: wx, y: gy + 1.8, z: wz });
              }
            }
          } else if (dk === 18) {
            if (wellIdx < this.townWellPool.length) {
              const tw = this.townWellPool[wellIdx++];
              tw.position.set(wx, gy, wz);
              tw.rotation.y = h1 * 1.2;
              tw.visible = true;
              if (this.plazaLightAnchors.length < this.townPlazaLights.length) {
                this.plazaLightAnchors.push({ x: wx, y: gy + 2.0, z: wz });
              }
            }
          } else if (dk === 19) {
            if (archIdx < this.festivalArchPool.length) {
              let nearTown: Town | null = null;
              let bestDist = 20;
              for (const tw of W.towns) {
                if (tw.w !== 0) continue;
                const d = Math.hypot(tw.x - x, tw.y - z);
                if (d < bestDist) {
                  bestDist = d;
                  nearTown = tw;
                }
              }
              const fa = this.festivalArchPool[archIdx++];
              fa.position.set(wx, gy, wz);
              fa.rotation.y = nearTown && Math.abs(x - nearTown.x) > Math.abs(z - nearTown.y) ? Math.PI / 2 : 0;
              fa.visible = true;
            }
          } else if (dk === 20) {
            if (cartIdx < this.flowerCartPool.length) {
              const fc = this.flowerCartPool[cartIdx++];
              fc.position.set(wx, gy, wz);
              fc.rotation.y = h1 * Math.PI * 2;
              fc.visible = true;
            }
          } else if (dk === 21) {
            if (bistroIdx < this.bistroPool.length) {
              const bs = this.bistroPool[bistroIdx++];
              bs.position.set(wx, gy, wz);
              bs.rotation.y = h1 * Math.PI;
              bs.visible = true;
            }
          } else if (dk === 22) {
            if (pierIdx < this.pierClusterPool.length) {
              const hp = this.pierClusterPool[pierIdx++];
              hp.position.set(wx, gy, wz);
              hp.rotation.y = h1 * Math.PI * 2;
              hp.visible = true;
            }
          } else if (dk === 23) {
            if (boardIdx < this.noticeboardPool.length) {
              let nearTown: Town | null = null;
              let bestDist = 18;
              for (const tw of W.towns) {
                if (tw.w !== 0) continue;
                const d = Math.hypot(tw.x - x, tw.y - z);
                if (d < bestDist) {
                  bestDist = d;
                  nearTown = tw;
                }
              }
              const nb = this.noticeboardPool[boardIdx++];
              nb.position.set(wx, gy, wz);
              nb.rotation.y = nearTown ? Math.atan2(nearTown.x + 0.5 - wx, nearTown.y + 0.5 - wz) : 0;
              nb.visible = true;
            }
          } else if (dk === 1) {
            // Layered scalloped bush + seasonal blossoms + soft ground contact shadow
            if (localSlope < 0.26) {
              this.pushInstance('propShadows', wx, gy + 0.03, wz, 0.85, 1, 0.85, 0, 0, 0, 0xffffff);
            }
            this.pushInstance('canopies', wx - 0.14, gy + 0.24, wz, 0.56, 0.46, 0.54, 0, h1 * 3.1, 0, wt.bushLeafDark);
            this.pushInstance('canopies', wx + 0.16, gy + 0.22, wz + 0.08, 0.48, 0.42, 0.48, 0, h2 * 3.1, 0, wt.bushLeafLight);
            this.pushInstance('canopies', wx, gy + 0.34, wz - 0.1, 0.4, 0.36, 0.4, 0, h3 * 3.1, 0, wt.bushLeafLight);
            this.pushInstance('glowSpheres', wx + 0.08, gy + 0.44, wz + 0.14, 0.22, 0.22, 0.22, 0, 0, 0, h1 > 0.5 ? wt.bushBlossoms[0] : wt.bushBlossoms[1]);
          } else if (dk === 2 || dk === 4) {
            // Lush Gnarled Forked Oak or Blossom/Maple Tree (multi-cluster scalloped crown + contact shadow)
            const bark = dk === 4 ? wt.blossomBark : '#6b4939';
            const shades = dk === 4 ? wt.blossomShades : wt.oakShades;
            const sMul = 0.88 + h1 * 0.3;
            const rotY = h2 * Math.PI * 2;
            if (localSlope < 0.26) {
              this.pushInstance('propShadows', wx, gy + 0.03, wz, 1.35 * sMul, 1, 1.35 * sMul, 0, 0, 0, 0xffffff);
            }
            this.pushInstance('treeTrunks', wx, gy, wz, sMul, sMul, sMul, 0, rotY, 0, bark);
            this.pushInstance('canopies', wx, gy + 1.24 * sMul, wz, 1.12 * sMul, 0.86 * sMul, 1.1 * sMul, 0, h1 * 4, 0, shades[0]);
            this.pushInstance('canopies', wx - 0.44 * sMul, gy + 1.38 * sMul, wz + 0.18 * sMul, 0.76 * sMul, 0.66 * sMul, 0.76 * sMul, 0, h2 * 4, 0, shades[1]);
            this.pushInstance('canopies', wx + 0.42 * sMul, gy + 1.34 * sMul, wz - 0.16 * sMul, 0.74 * sMul, 0.64 * sMul, 0.74 * sMul, 0, h3 * 4, 0, shades[1]);
            this.pushInstance('canopies', wx + 0.08 * sMul, gy + 1.66 * sMul, wz + 0.06 * sMul, 0.72 * sMul, 0.62 * sMul, 0.72 * sMul, 0, h1 * 2, 0, shades[2]);
            this.pushInstance('canopies', wx - 0.12 * sMul, gy + 1.44 * sMul, wz - 0.38 * sMul, 0.62 * sMul, 0.55 * sMul, 0.62 * sMul, 0, h4 * 4, 0, shades[2]);
            if (dk === 4 || h1 < 0.6) {
              const dotCol = dk === 4 ? wt.blossomPetal : wt.oakFruit[h2 > 0.5 ? 0 : 1];
              this.pushInstance('glowSpheres', wx + 0.32 * sMul, gy + 1.28 * sMul, wz + 0.42 * sMul, 0.22, 0.22, 0.22, 0, 0, 0, dotCol);
              this.pushInstance('glowSpheres', wx - 0.34 * sMul, gy + 1.52 * sMul, wz + 0.24 * sMul, 0.19, 0.19, 0.19, 0, 0, 0, dotCol);
            }
          } else if (dk === 7) {
            // Layered Fluted Evergreen Pine Tree (organic draped bough skirts + contact shadow)
            const sMul = 0.9 + h1 * 0.25;
            if (localSlope < 0.26) {
              this.pushInstance('propShadows', wx, gy + 0.03, wz, 1.2 * sMul, 1, 1.2 * sMul, 0, 0, 0, 0xffffff);
            }
            this.pushInstance('trunks', wx, gy, wz, 1.05 * sMul, 0.8 * sMul, 1.05 * sMul, 0, 0, 0, '#6b4939');
            wt.pineTiers.forEach((tier, tIdx) => {
              const tierCol = wt.snowTrim && tIdx >= 1 ? tier.cap : tier.c;
              const r = (1.02 - tIdx * 0.21) * sMul;
              this.pushInstance('pineBoughs', wx, gy + (0.42 + tIdx * 0.5) * sMul, wz, r, 0.88 * sMul, r, 0, h2 * 3 + tIdx * 0.95, 0, tierCol);
            });
          } else if (dk === 3) {
            // Woodland Domed Toadstool cluster
            this.pushInstance('trunks', wx - 0.14, gy, wz, 0.42, 0.32, 0.42, 0, 0, 0, '#fff4e4');
            this.pushInstance('toadstoolCaps', wx - 0.14, gy + 0.26, wz, 0.72, 0.72, 0.72, 0.05, h1 * 4, -0.04, '#ff6b8b');
            this.pushInstance('trunks', wx + 0.16, gy, wz + 0.1, 0.34, 0.24, 0.34, 0, 0, 0, '#fff4e4');
            this.pushInstance('toadstoolCaps', wx + 0.16, gy + 0.2, wz + 0.1, 0.54, 0.54, 0.54, -0.06, h2 * 4, 0.05, '#ff8fab');
          } else if (dk === 5) {
            // Desert Cactus + flower
            if (localSlope < 0.26) {
              this.pushInstance('propShadows', wx, gy + 0.03, wz, 0.65, 1, 0.65, 0, 0, 0, 0xffffff);
            }
            this.pushInstance('trunks', wx, gy, wz, 1.0, 0.95, 1.0, 0, 0, 0, '#4ea163');
            this.pushInstance('boxes', wx - 0.22, gy + 0.55, wz, 0.24, 0.14, 0.14, 0, 0, 0, '#4ea163');
            this.pushInstance('boxes', wx + 0.22, gy + 0.48, wz, 0.24, 0.14, 0.14, 0, 0, 0, '#4ea163');
            this.pushInstance('flowers', wx, gy + 0.85, wz, 0.75, 0.75, 0.75, 0, h1 * 4, 0, '#ff7aa8');
          } else if (dk === 6) {
            // Faceted Boulder + seasonal moss/snow cap + contact shadow
            if (localSlope < 0.26) {
              this.pushInstance('propShadows', wx, gy + 0.03, wz, 0.9, 1, 0.9, 0, 0, 0, 0xffffff);
            }
            this.pushInstance('rocks', wx, gy + 0.28, wz, 0.95, 0.72, 0.9, h1, h2 * 4, 0, '#7e7d94');
            if (h1 < 0.75) {
              this.pushInstance('canopies', wx - 0.05, gy + 0.52, wz, 0.42, 0.22, 0.38, 0, 0, 0, wt.boulderCap);
            }
          } else if (dk === 8) {
            // Conch Shell
            this.pushInstance('glowSpheres', wx, gy + 0.08, wz, 0.42, 0.28, 0.35, 0, h1 * 5, 0, '#ffd1df');
          } else if (dk === 9) {
            // Sculpted Wildflower Trio + base stem tufts
            this.pushInstance('grassBlades', wx, gy - 0.02, wz, 0.78, 0.72, 0.78, 0, h1 * 6, 0, grassDeepHex);
            this.pushInstance('flowers', wx - 0.14, gy + 0.08, wz + 0.08, 0.78, 0.78, 0.78, 0.08, h1 * 6, 0, wt.flowerPetals[0]);
            this.pushInstance('flowers', wx + 0.14, gy + 0.1, wz - 0.06, 0.76, 0.76, 0.76, -0.06, h2 * 6, 0.06, wt.flowerPetals[1]);
            this.pushInstance('flowers', wx, gy + 0.06, wz + 0.15, 0.56, 0.56, 0.56, 0, h3 * 6, 0, '#ffe475');
          } else if (dk === 11) {
            // Crafted Oak Garden Bench with legs, armrests & backrest slats
            if (localSlope < 0.26) {
              this.pushInstance('propShadows', wx, gy + 0.03, wz, 0.72, 1, 0.52, 0, 0, 0, 0xffffff);
            }
            this.pushInstance('boxes', wx - 0.3, gy + 0.12, wz, 0.08, 0.24, 0.3, 0, 0, 0, '#5a3a28');
            this.pushInstance('boxes', wx + 0.3, gy + 0.12, wz, 0.08, 0.24, 0.3, 0, 0, 0, '#5a3a28');
            this.pushInstance('boxes', wx, gy + 0.24, wz, 0.84, 0.09, 0.36, 0, 0, 0, '#c78556');
            this.pushInstance('boxes', wx, gy + 0.44, wz - 0.14, 0.84, 0.24, 0.08, -0.1, 0, 0, '#a36540');
          } else if (dk === 12) {
            // Carved Timber Waypost Sign with stone plinth, post & gabled sign board
            this.pushInstance('rocks', wx, gy + 0.06, wz, 0.26, 0.12, 0.26, 0, 0, 0, '#9e97a8');
            this.pushInstance('trunks', wx, gy, wz, 0.55, 0.65, 0.55, 0, 0, 0, '#6b4734');
            this.pushInstance('boxes', wx + 0.08, gy + 0.62, wz, 0.68, 0.28, 0.09, 0, 0, 0, '#ebbf86');
            this.pushInstance('boxes', wx, gy + 0.8, wz, 0.24, 0.06, 0.24, 0, 0, 0, '#78513c');
          } else if (dk === 13) {
            // Ornate Wrought-Iron Street Lantern with stone pedestal, scrolled bracket & warm lantern hood
            if (localSlope < 0.26) {
              this.pushInstance('propShadows', wx, gy + 0.03, wz, 0.55, 1, 0.55, 0, 0, 0, 0xffffff);
            }
            this.pushInstance('rocks', wx, gy + 0.09, wz, 0.28, 0.18, 0.28, 0, 0, 0, '#857d94');
            this.pushInstance('boxes', wx, gy + 0.62, wz, 0.1, 1.15, 0.1, 0, 0, 0, '#362e45');
            this.pushInstance('boxes', wx + 0.12, gy + 1.16, wz, 0.28, 0.06, 0.07, 0, 0, 0, '#362e45');
            this.pushInstance('glowSpheres', wx + 0.22, gy + 1.05, wz, 0.36, 0.44, 0.36, 0, 0, 0, '#ffe57f');
            this.pushInstance('cones', wx + 0.22, gy + 1.18, wz, 0.26, 0.16, 0.26, 0, 0, 0, '#362e45');
          }
        }
      }
    } else if (layer === 'sky') {
      for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
          const idx = z * N + x;
          const sb = W.SB[idx];
          const sd = W.SD[idx];
          const wx = x + 0.5;
          const wz = z + 0.5;
          const gy = getTerrainHeight3D(wx, wz, 'sky', W.B, W.SB, W.iceMap);
          const h1 = hash(x, z, 651);
          const h2 = hash(x, z, 652);

          if (!sd && sb === 1 && h1 < 0.45) {
            this.pushInstance('grassBlades', wx + (h2 - 0.5) * 0.6, gy - 0.02, wz + (h1 - 0.5) * 0.6, 0.85, 0.85, 0.85, 0, h2 * 6, 0, h2 > 0.6 ? '#ffb8d9' : '#85e8b2');
          } else if (!sd && sb === 4 && h1 < 0.12) {
            this.pushInstance('cones', wx, gy, wz, 0.18, 0.48, 0.18, 0.1, h2 * 4, 0, '#ffe478');
          }

          if (!sd) continue;
          if (sd === 1) {
            this.pushInstance('treeTrunks', wx, gy, wz, 0.84, 0.78, 0.84, 0, h1 * 6, 0, '#c49b8f');
            this.pushInstance('canopies', wx, gy + 1.02, wz, 1.02, 0.86, 1.02, 0, x, 0, '#ffbbd6');
            this.pushInstance('canopies', wx + 0.34, gy + 1.24, wz - 0.12, 0.68, 0.58, 0.68, 0, z, 0, '#ffe0ed');
            this.pushInstance('canopies', wx - 0.32, gy + 1.18, wz + 0.16, 0.64, 0.55, 0.64, 0, h2 * 4, 0, '#ffd4e6');
          } else if (sd === 2) {
            this.pushInstance('boxes', wx, gy + 0.55, wz, 0.12, 1.1, 0.12, 0, 0, 0, '#ffd23f');
            this.pushInstance('glowSpheres', wx, gy + 1.12, wz, 0.48, 0.48, 0.48, 0, 0, 0, '#fff1a6');
          } else if (sd === 3) {
            this.pushInstance('glowSpheres', wx, gy + 0.65, wz, 0.44, 0.44, 0.44, 0, 0, 0, '#ffe585');
          } else if (sd === 9) {
            // Cirrus Castle Pearly Turret with stone plinth, gold collar & spire finial
            this.pushInstance('boxes', wx, gy + 0.12, wz, 0.86, 0.24, 0.86, 0, 0, 0, '#dbd4e8');
            this.pushInstance('boxes', wx, gy + 0.76, wz, 0.68, 1.18, 0.68, 0, 0, 0, '#fcfaff');
            this.pushInstance('cones', wx, gy + 1.34, wz, 0.84, 0.88, 0.84, 0, 0, 0, (x + z) % 2 === 0 ? '#7cb0ff' : '#ff8fb8');
            this.pushInstance('glowSpheres', wx, gy + 2.24, wz, 0.26, 0.26, 0.26, 0, 0, 0, '#ffd23f');
          }
        }
      }
    } else if (layer === 'dive') {
      for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
          const idx = z * N + x;
          const ud = W.UD[idx];
          const b = W.B[idx];
          const wx = x + 0.5;
          const wz = z + 0.5;
          const gy = getTerrainHeight3D(wx, wz, 'dive', W.B, W.SB, W.iceMap);
          const h1 = hash(x, z, 701);
          const h2 = hash(x, z, 702);

          // Swaying underwater seagrass tufts & seafloor pebbles
          if ((!ud || ud === 6) && h1 < (b === 1 ? 0.34 : 0.18)) {
            this.pushInstance('grassBlades', wx + (h2 - 0.5) * 0.6, gy - 0.02, wz + (h1 - 0.5) * 0.6, 0.9, 1.15, 0.9, 0, h2 * 6, 0, h2 > 0.5 ? '#20b58a' : '#32d49a');
          } else if (!ud && h2 < 0.09) {
            this.pushInstance('rocks', wx, gy + 0.03, wz, 0.3, 0.15, 0.26, 0, h1 * 4, 0, '#6a9ab0');
          }

          if (!ud || ud === 6) continue;
          if (ud === 1) {
            // Lush Swaying Emerald & Jade Kelp Blades (animated by ocean current shader!)
            const kH = 0.9 + h1 * 0.5;
            this.pushInstance('seaFlora', wx - 0.13, gy, wz, 0.34, kH * 1.18, 0.18, 0.06, h1 * 2, 0.1, '#149663');
            this.pushInstance('seaFlora', wx + 0.13, gy, wz + 0.08, 0.3, kH * 0.98, 0.16, -0.05, h2 * 2, -0.1, '#23ba7f');
            this.pushInstance('seaFlora', wx, gy, wz - 0.1, 0.24, kH * 0.84, 0.14, 0.04, h1 * 3.1, 0.05, '#38d493');
          } else if (ud === 2) {
            // Saturated Branching Staghorn & Fan Coral Clusters
            const cCols = ['#f04278', '#f27529', '#8e4ff0', '#16bfa0', '#e83d5d'];
            const cc = cCols[Math.floor(h1 * cCols.length) % cCols.length];
            const sc = 0.85 + h2 * 0.4;
            this.pushInstance('cones', wx, gy, wz, 0.34 * sc, 0.98 * sc, 0.34 * sc, 0.08, h1 * 4, 0.12, cc);
            this.pushInstance('cones', wx - 0.19, gy + 0.04, wz + 0.1, 0.28 * sc, 0.78 * sc, 0.28 * sc, -0.14, h2 * 4, 0.38, cc);
            this.pushInstance('cones', wx + 0.19, gy + 0.04, wz - 0.08, 0.26 * sc, 0.72 * sc, 0.26 * sc, 0.12, h1 * 3, -0.36, cc);
            this.pushInstance('canopies', wx, gy + 0.76 * sc, wz, 0.28 * sc, 0.28 * sc, 0.28 * sc, 0, 0, 0, cc);
          } else if (ud === 3) {
            // Jewel-Toned Magenta/Orchid Sea Anemone Crown (swaying tendrils in current!)
            const tentCol = h1 > 0.5 ? '#d636e0' : '#9647eb';
            for (let k = 0; k < 4; k++) {
              const ang = (k / 4) * Math.PI * 2 + h1 * 2;
              this.pushInstance('seaFlora', wx + Math.cos(ang) * 0.12, gy + 0.02, wz + Math.sin(ang) * 0.12, 0.24, 0.62, 0.24, Math.sin(ang) * 0.34, ang, -Math.cos(ang) * 0.34, tentCol);
            }
            this.pushInstance('glowSpheres', wx, gy + 0.28, wz, 0.34, 0.3, 0.34, 0, 0, 0, '#4cf0ff');
          } else if (ud === 4) {
            // Rich Rose-Plum Giant Clam Shell + Crisp Gleaming Pearl
            this.pushInstance('boxes', wx, gy + 0.06, wz, 0.62, 0.13, 0.52, 0.08, h1 * 2, 0, '#b54d7e');
            this.pushInstance('boxes', wx, gy + 0.28, wz - 0.22, 0.6, 0.13, 0.48, -0.78, h1 * 2, 0, '#8a3460');
            this.pushInstance('glowSpheres', wx, gy + 0.2, wz + 0.02, 0.3, 0.3, 0.3, 0, 0, 0, '#fff7fc');
          } else if (ud === 5) {
            if (domeIdx < this.bubbleDomePool.length) {
              const dm = this.bubbleDomePool[domeIdx++];
              const dgy = getTerrainHeight3D(wx + 1.0, wz - 0.3, 'dive', W.B, W.SB, W.iceMap);
              dm.position.set(wx + 1.0, dgy, wz - 0.3);
              dm.visible = true;
            }
          } else if (ud === 7) {
            // Aqua Sea-Lantern Stalk
            this.pushInstance('trunks', wx, gy, wz, 0.36, 0.68, 0.36, 0.12, 0, 0.1, '#1a6f82');
            this.pushInstance('glowSpheres', wx + 0.08, gy + 0.66, wz + 0.06, 0.48, 0.48, 0.48, 0, 0, 0, '#54fce8');
          }
        }
      }
    } else if (layer === 'glowdeep') {
      for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
          const cell = getGlowdeepCell(x, z);
          const h1 = hash(x, z, 731);
          const h2 = hash(x, z, 732);
          const h3 = hash(x, z, 733);
          const wx = x + 0.5;
          const wz = z + 0.5;
          const gy = getTerrainHeight3D(wx, wz, 'glowdeep', W.B, W.SB, W.iceMap);
          const nearCanal =
            cell !== 'canal' &&
            cell !== 'wall' &&
            ((z < N - 1 && getGlowdeepCell(x, z + 1) === 'canal') ||
              (z > 0 && getGlowdeepCell(x, z - 1) === 'canal') ||
              (x < N - 1 && getGlowdeepCell(x + 1, z) === 'canal') ||
              (x > 0 && getGlowdeepCell(x - 1, z) === 'canal'));

          if (nearCanal && h1 < 0.095) {
            // Timber & glowing cyan canal wharf lantern bollard
            this.pushInstance('boxes', wx, gy + 0.38, wz, 0.14, 0.76, 0.14, 0, h2 * 3, 0, '#784c35');
            this.pushInstance('glowSpheres', wx, gy + 0.84, wz, 0.34, 0.34, 0.34, 0, 0, 0, '#52f2e0');
          } else if (cell === 'glowcap' && h1 < 0.62) {
            const isMint = h2 > 0.38;
            const capCol = isMint ? '#5af7c2' : '#c47dff';
            const stemH = 0.36 + h3 * 0.3;
            this.pushInstance('trunks', wx, gy, wz, 0.48, stemH, 0.48, 0.06, 0, -0.05, '#e6e2ff');
            this.pushInstance('toadstoolCaps', wx, gy + stemH - 0.01, wz, 0.92 + h2 * 0.28, 0.9 + h2 * 0.24, 0.92 + h2 * 0.28, 0, h1 * 4, 0, capCol);
            if (h3 > 0.42) {
              this.pushInstance('trunks', wx + 0.2, gy, wz + 0.14, 0.28, stemH * 0.58, 0.28, -0.1, 0, 0.15, '#e6e2ff');
              this.pushInstance('toadstoolCaps', wx + 0.22, gy + stemH * 0.52, wz + 0.14, 0.54, 0.54, 0.54, 0.08, h2 * 4, 0, isMint ? '#c47dff' : '#5af7c2');
            }
          } else if (cell === 'roots' && h1 < 0.38) {
            this.pushInstance('grassBlades', wx, gy - 0.02, wz, 0.95, 1.08, 0.95, 0, h2 * 6, 0, '#72f0b8');
            if (h3 < 0.26) {
              this.pushInstance('trunks', wx, gy, wz, 0.48, 0.62, 0.48, 0.24, h1 * 4, 0.18, '#7d4f32');
              this.pushInstance('glowSpheres', wx + 0.12, gy + 0.54, wz + 0.08, 0.22, 0.22, 0.22, 0, 0, 0, '#ffd86b');
            }
          } else if (cell === 'cinder' && h1 < 0.28) {
            this.pushInstance('cones', wx, gy, wz, 0.28, 0.65 + h3 * 0.28, 0.28, 0.14, h2 * 4, -0.1, h2 > 0.5 ? '#ff7b4d' : '#ff648c');
            if (h2 > 0.48) {
              this.pushInstance('glowSpheres', wx + 0.14, gy + 0.12, wz - 0.1, 0.32, 0.18, 0.32, 0, 0, 0, '#ff9860');
            }
            if (h3 < 0.25) {
              this.pushInstance('rocks', wx - 0.15, gy + 0.16, wz + 0.12, 0.65, 0.45, 0.6, h1, h2 * 4, 0, '#44263b');
            }
          } else if (cell === 'chamber') {
            if (h1 < 0.16) {
              this.pushInstance('grassBlades', wx + (h2 - 0.5) * 0.4, gy - 0.02, wz + (h3 - 0.5) * 0.4, 0.9, 0.95, 0.9, 0, h2 * 6, 0, h3 > 0.5 ? '#50e8b8' : '#967dff');
            } else if (h1 < 0.22) {
              this.pushInstance('cones', wx, gy, wz, 0.22, 0.56 + h3 * 0.3, 0.22, 0.1, h2 * 5, -0.08, h2 > 0.5 ? '#8f6bff' : '#52f2e0');
            } else if (h1 < 0.255) {
              this.pushInstance('trunks', wx, gy, wz, 0.3, 0.26, 0.3, 0, 0, 0, '#e6e2ff');
              this.pushInstance('toadstoolCaps', wx, gy + 0.24, wz, 0.62, 0.62, 0.62, 0, h2 * 4, 0, h2 > 0.5 ? '#64f5c1' : '#c684ff');
            }
          } else if (cell === 'wall') {
            const onEdge =
              (z < N - 1 && getGlowdeepCell(x, z + 1) !== 'wall') ||
              (x < N - 1 && getGlowdeepCell(x + 1, z) !== 'wall') ||
              (x > 0 && getGlowdeepCell(x - 1, z) !== 'wall');
            if (onEdge && h1 < 0.54) {
              const cCol = h2 > 0.5 ? '#9b6bff' : '#58f2d4';
              this.pushInstance('cones', wx, gy - 0.05, wz, 0.42, 1.0 + h3 * 0.48, 0.42, 0.12, h1 * 5, -0.1, cCol);
              this.pushInstance('cones', wx + 0.18, gy - 0.08, wz + 0.14, 0.24, 0.66, 0.24, -0.22, h2 * 4, 0.25, cCol);
            }
          }
        }
      }
    } else if (layer === 'moonroad') {
      for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
          const cell = getMoonRoadCell(x, z);
          if (cell === 'void') continue;
          const h1 = hash(x, z, 741);
          const h2 = hash(x, z, 742);
          const h3 = hash(x, z, 743);
          const wx = x + 0.5;
          const wz = z + 0.5;
          const gy = getTerrainHeight3D(wx, wz, 'moonroad', W.B, W.SB, W.iceMap);

          if (cell === 'road' && h1 < 0.055) {
            this.pushInstance('boxes', wx, gy + 0.34, wz, 0.11, 0.64, 0.11, 0, 0, 0, '#e5d4ff');
            this.pushInstance('glowSpheres', wx, gy + 0.76, wz, 0.42, 0.42, 0.42, 0, 0, 0, '#ffd23f');
          } else if (cell === 'platform') {
            const onEdge =
              (z < N - 1 && getMoonRoadCell(x, z + 1) !== 'platform') ||
              (x < N - 1 && getMoonRoadCell(x + 1, z) !== 'platform') ||
              (x > 0 && getMoonRoadCell(x - 1, z) !== 'platform');
            if (onEdge && h1 < 0.14) {
              // Marble balustrade post & golden star-lantern finial around plazas
              this.pushInstance('boxes', wx, gy + 0.28, wz, 0.16, 0.56, 0.16, 0, 0, 0, '#f3ecff');
              this.pushInstance('glowSpheres', wx, gy + 0.66, wz, 0.32, 0.32, 0.32, 0, 0, 0, '#ffd23f');
            } else if (onEdge && h1 < 0.21) {
              // Silver-barked Moon-Blossom Tree framing constellation plazas
              const sMul = 0.85 + h2 * 0.25;
              this.pushInstance('treeTrunks', wx, gy, wz, sMul, sMul, sMul, 0, h3 * 6, 0, '#a696c4');
              this.pushInstance('canopies', wx, gy + 1.15 * sMul, wz, 0.96 * sMul, 0.78 * sMul, 0.96 * sMul, 0, h1 * 4, 0, '#d6b4ff');
              this.pushInstance('canopies', wx + 0.32 * sMul, gy + 1.28 * sMul, wz - 0.14 * sMul, 0.66 * sMul, 0.56 * sMul, 0.66 * sMul, 0, h2 * 4, 0, '#ffcae4');
              this.pushInstance('glowSpheres', wx - 0.24 * sMul, gy + 1.22 * sMul, wz + 0.28 * sMul, 0.22, 0.22, 0.22, 0, 0, 0, '#ffe888');
            } else if (h2 < 0.08) {
              this.pushInstance('cones', wx + (h1 - 0.5) * 0.5, gy, wz + (h2 - 0.5) * 0.5, 0.15, 0.42, 0.15, 0.08, h1 * 4, 0, '#c6a6ff');
            }
          } else if (cell === 'road' && h2 < 0.085) {
            this.pushInstance('cones', wx + (h1 - 0.5) * 0.55, gy, wz + (h2 - 0.5) * 0.55, 0.15, 0.4, 0.15, 0.1, h1 * 4, 0, '#c6a6ff');
          } else if (cell === 'silence' && h1 < 0.1) {
            this.pushInstance('cones', wx, gy, wz, 0.18, 0.62 + h2 * 0.35, 0.18, 0.06, h3 * 4, 0, '#7882a6');
          } else if (cell === 'nebula') {
            if (h1 < 0.016) {
              // Scattered celestial blossom trees rooted in glowing aurora clouds
              const sMul = 0.8 + h3 * 0.28;
              this.pushInstance('treeTrunks', wx, gy, wz, sMul, sMul, sMul, 0, h2 * 6, 0, '#9684bd');
              this.pushInstance('canopies', wx, gy + 1.12 * sMul, wz, 0.92 * sMul, 0.76 * sMul, 0.92 * sMul, 0, h1 * 5, 0, h2 > 0.5 ? '#c8a6ff' : '#f2b8e4');
              this.pushInstance('glowSpheres', wx + 0.22 * sMul, gy + 1.24 * sMul, wz + 0.2 * sMul, 0.2, 0.2, 0.2, 0, 0, 0, '#ffd87a');
            } else if (h1 < 0.058) {
              this.pushInstance('flowers', wx + (h2 - 0.5) * 0.5, gy + 0.06, wz + (h1 - 0.5) * 0.5, 0.6, 0.6, 0.6, 0, h2 * 6, 0, h2 > 0.5 ? '#c49bff' : '#ffd87a');
            } else if (h3 < 0.04) {
              this.pushInstance('grassBlades', wx, gy - 0.02, wz, 0.85, 0.88, 0.85, 0, h2 * 6, 0, '#a67dff');
            }
          }
        }
      }
    }

    for (const k of ['trunks', 'treeTrunks', 'canopies', 'pineBoughs', 'cones', 'seaFlora', 'rocks', 'boxes', 'glowSpheres', 'toadstoolCaps', 'flowers', 'ice', 'grassBlades', 'lilyPads', 'propShadows']) {
      const b = this.batches[k];
      b.mesh.count = b.count;
      b.mesh.instanceMatrix.needsUpdate = true;
      if (b.mesh.instanceColor) b.mesh.instanceColor.needsUpdate = true;
    }
  }

  private updateAnimatedCollectiblesAndFish(
    centerTx: number,
    centerTz: number,
    layer: WorldLayer3D,
    W: World3DSyncState,
    propRadius: number
  ): void {
    const t = W.time;
    const starBatch = this.batches.stars;
    const ringBatch = this.batches.skyRings;
    const fishBatch = this.batches.fish;
    const fishTailBatch = this.batches.fishTails;
    starBatch.count = 0;
    ringBatch.count = 0;
    fishBatch.count = 0;
    fishTailBatch.count = 0;

    const addStarItem = (x2d: number, y2d: number, colorHex: string | number, scale = 1) => {
      const tx = x2d / T;
      const tz = y2d / T;
      if (Math.abs(tx - centerTx) > propRadius || Math.abs(tz - centerTz) > propRadius) return;
      const gy = getActorGroundY3D(x2d, y2d, layer, W.B, W.SB, W.iceMap);
      const bob = Math.sin(t * 3 + x2d) * 0.12;
      this.pushInstance('stars', tx, gy + 0.45 + bob, tz, scale, scale, scale, 0, t * 1.9 + x2d * 0.1, 0, colorHex);
    };

    if (layer === 'surface') {
      for (const s of W.stars) {
        if (!s.got) addStarItem(s.x, s.y, '#ffd23f', 1.0);
      }
      for (const qi of W.questItems) {
        if (!qi.got && qi.w === 0) {
          const isNectar = qi.q.it.toLowerCase().includes('nectar');
          addStarItem(qi.x, qi.y, isNectar ? '#ff8fb8' : '#7de0ff', 1.15);
        }
      }
      // Surface shallow-water koi & coastal silverfish schooling beneath crystal waters (reacts gently to waders)
      const shallowCols = ['#ff8559', '#ffd257', '#ff6fa3', '#73e8ff', '#fff0d6'];
      const pTxSurf = W.player.x / T;
      const pTzSurf = W.player.y / T;
      for (let i = 0; i < 20; i++) {
        const anchorTx = Math.floor(centerTx / 8) * 8 + (hash(i, 1, 781) - 0.5) * 28;
        const anchorTz = Math.floor(centerTz / 8) * 8 + (hash(i, 2, 782) - 0.5) * 28;
        if (Math.abs(anchorTx - centerTx) > propRadius || Math.abs(anchorTz - centerTz) > propRadius) continue;
        const spd = 0.65 + hash(i, 3, 783) * 0.55;
        const ang = t * spd + i * 2.1;
        const rad = 1.15 + hash(i, 4, 784) * 1.4;
        let px = anchorTx + Math.cos(ang) * rad;
        let pz = anchorTz + Math.sin(ang * 1.25) * rad * 0.65;
        let vx = -Math.sin(ang) * rad;
        let vz = 1.25 * Math.cos(ang * 1.25) * rad * 0.65;
        const pdx = px - pTxSurf;
        const pdz = pz - pTzSurf;
        const pDist = Math.hypot(pdx, pdz);
        let dartBoost = 0;
        if (pDist < 3.2) {
          dartBoost = (3.2 - pDist) / 3.2;
          const safeD = Math.max(0.15, pDist);
          px += (pdx / safeD) * dartBoost * 1.1;
          pz += (pdz / safeD) * dartBoost * 1.1;
          vx += (pdx / safeD) * dartBoost * 1.6;
          vz += (pdz / safeD) * dartBoost * 1.6;
        }
        const ix = Math.max(0, Math.min(N - 1, Math.floor(px)));
        const iz = Math.max(0, Math.min(N - 1, Math.floor(pz)));
        if (W.B[iz * N + ix] >= 2) continue;
        const bedY = getTerrainHeight3D(px, pz, 'surface', W.B, W.SB, W.iceMap);
        if (bedY > -0.14) continue;
        const yaw = Math.atan2(vx, vz);
        const sc = 0.58 + (i % 3) * 0.14;
        const swimY = Math.max(bedY + 0.11, -0.22 + Math.sin(t * 1.8 + i) * 0.04);
        const bodySway = Math.sin(t * (10 + dartBoost * 8) + i) * (0.12 + dartBoost * 0.06);
        const tailWag = Math.sin(t * (12 + dartBoost * 9) + i) * (0.44 + dartBoost * 0.22);
        const fc = shallowCols[i % shallowCols.length];
        this.pushInstanceDirected('fish', px, swimY, pz, sc, sc, sc, 0, yaw + bodySway, Math.sin(ang) * 0.15, fc);
        this.pushInstanceDirected(
          'fishTails',
          px - Math.sin(yaw + bodySway) * 0.3 * sc,
          swimY,
          pz - Math.cos(yaw + bodySway) * 0.3 * sc,
          sc,
          sc,
          sc,
          0,
          yaw + tailWag,
          Math.sin(ang) * 0.15,
          fc
        );
      }
    } else if (layer === 'dive') {
      for (const p of W.pearls) {
        if (!p.got) addStarItem(p.x, p.y, '#fff4fe', 1.08);
      }
      const lowMode = Boolean(W.lowQuality || this.isSoftwareGl);
      const schoolSize = lowMode ? 2 : 3;
      const pTx = W.player.x / T;
      const pTz = W.player.y / T;
      const hasDivePlayer = Boolean(W.player.dive && !W.player.house);

      for (let i = 0; i < W.fish.length && fishBatch.count < fishBatch.max - schoolSize; i++) {
        const f = W.fish[i];
        const homeTx = f.hx / T;
        const homeTz = f.hy / T;
        if (Math.abs(homeTx - centerTx) > propRadius || Math.abs(homeTz - centerTz) > propRadius) continue;

        for (let m = 0; m < schoolSize; m++) {
          evaluateReefFishPose(f, i, m, t, W.UD, pTx, pTz, hasDivePlayer, _fishPoseScratch);
          const px = _fishPoseScratch.tx;
          const pz = _fishPoseScratch.tz;
          const fishFloor = getTerrainHeight3D(px, pz, 'dive', W.B, W.SB, W.iceMap);
          const vMag = Math.max(0.05, Math.hypot(_fishPoseScratch.vx, _fishPoseScratch.vz));
          const aheadX = Math.max(0.5, Math.min(N - 0.5, px + (_fishPoseScratch.vx / vMag) * 0.48));
          const aheadZ = Math.max(0.5, Math.min(N - 0.5, pz + (_fishPoseScratch.vz / vMag) * 0.48));
          const floorAhead = getTerrainHeight3D(aheadX, aheadZ, 'dive', W.B, W.SB, W.iceMap);
          const slopePitch = Math.max(-0.42, Math.min(0.42, -Math.atan2(floorAhead - fishFloor, 0.48) * 0.55));
          const finalPitch = Math.max(-0.48, Math.min(0.48, _fishPoseScratch.pitch + slopePitch));

          const swimY = fishFloor + _fishPoseScratch.liftY;
          const sc = (0.78 + f.s * 0.26) * _fishPoseScratch.scaleMul;
          const bodySway = Math.sin(t * (_fishPoseScratch.tailFreq * 0.85) + i + m * 0.6) * _fishPoseScratch.bodySwayAmp;
          const tailWag = Math.sin(t * _fishPoseScratch.tailFreq + i + m * 0.6) * _fishPoseScratch.tailAmp;
          const headYaw = _fishPoseScratch.yaw + bodySway;

          this.pushInstanceDirected(
            'fish',
            px,
            swimY,
            pz,
            sc,
            sc,
            sc,
            finalPitch,
            headYaw,
            _fishPoseScratch.roll,
            f.c
          );
          this.pushInstanceDirected(
            'fishTails',
            px - Math.sin(headYaw) * 0.31 * sc,
            swimY + Math.sin(finalPitch) * 0.26 * sc,
            pz - Math.cos(headYaw) * 0.31 * sc,
            sc,
            sc,
            sc,
            finalPitch,
            _fishPoseScratch.yaw + tailWag,
            _fishPoseScratch.roll,
            f.c
          );
        }
      }
    } else if (layer === 'sky') {
      for (const f of W.feathers) {
        if (!f.got) addStarItem(f.x, f.y, '#fff7c2', 0.95);
      }
      const rCols = ['#ff7aa8', '#ffd23f', '#7bd88f', '#7de0ff', '#b48cff'];
      W.rings.forEach((r, idx) => {
        if (r.got) return;
        const tx = r.x / T;
        const tz = r.y / T;
        if (Math.abs(tx - centerTx) > propRadius || Math.abs(tz - centerTz) > propRadius) return;
        const bob = Math.sin(t * 2.5 + idx) * 0.14;
        this.pushInstance('skyRings', tx, 1.05 + bob, tz, 1, 1, 1, 0, t * 1.1 + idx, 0, rCols[idx % rCols.length]);
      });
    } else if (layer === 'glowdeep') {
      for (const gs of W.glowSpores) {
        if (!gs.got) addStarItem(gs.x, gs.y, '#64f5c1', 0.95);
      }
    } else if (layer === 'moonroad') {
      for (const mn of W.moonNotes) {
        if (!mn.got) addStarItem(mn.x, mn.y, '#ffd23f', 1.05);
      }
    }

    for (const k of ['stars', 'skyRings', 'fish', 'fishTails']) {
      const b = this.batches[k];
      b.mesh.count = b.count;
      b.mesh.instanceMatrix.needsUpdate = true;
      if (b.mesh.instanceColor) b.mesh.instanceColor.needsUpdate = true;
    }
  }

  private updateAtmosphereAndWeather(
    layer: WorldLayer3D,
    W: World3DSyncState,
    focusX: number,
    focusY: number,
    focusZ: number
  ): void {
    const t = W.time;
    const season = W.season || 'spring';
    const wt = SEASON_THEMES[season].world;

    // 7-minute Day / Golden Hour / Starlight cycle
    let nightFactor = 0;
    let sunsetFactor = 0;
    if (W.nightCycleEnabled && layer === 'surface') {
      const phase = (t % 420) / 420;
      if (phase > 0.42 && phase < 0.56) {
        sunsetFactor = Math.sin(((phase - 0.42) / 0.14) * Math.PI);
      } else if (phase >= 0.56 && phase < 0.86) {
        nightFactor = Math.min(1, Math.sin(((phase - 0.56) / 0.3) * Math.PI) * 1.25);
      } else if (phase >= 0.86) {
        sunsetFactor = Math.sin(((phase - 0.86) / 0.14) * Math.PI) * 0.6;
      }
    }

    // Scroll procedural caustics / ocean shimmer UV smoothly
    this.causticTex.offset.x = (t * 0.024) % 1;
    this.causticTex.offset.y = (t * 0.017) % 1;

    // Keep sky dome centered on camera focus so horizon/clouds/stars never clip
    this.skyDomeMesh.position.set(focusX, 0, focusZ);
    this.shaderUniforms.uNightFactor.value = nightFactor;
    this.shaderUniforms.uSunsetFactor.value = sunsetFactor;
    this.shaderUniforms.uWeatherMode.value =
      W.weatherId === 'drizzle'
        ? 1
        : W.weatherId === 'snowy'
        ? 2
        : W.weatherId === 'stardust'
        ? 3
        : W.weatherId === 'aurora'
        ? 4
        : 0;

    // Realm Sky, Fog & Lighting (zero-GC in-place updates — vibrant pipeline always active)
    if (layer === 'house') {
      _col.set('#89d0ff');
      this.bgColor.copy(_col);
      this.fog.color.set('#bce4ff');
      this.fog.density = 0.0022;
      this.shaderUniforms.uSkyZenith.value.set('#3d93eb');
      this.shaderUniforms.uSkyHorizon.value.set('#d2f0ff');
      this.shaderUniforms.uSkyBottom.value.set('#96d4a0');
      this.shaderUniforms.uSunColor.value.set('#fff3c4');

      this.sunLight.color.set('#fff5de');
      this.sunLight.intensity = 1.48;
      this.rimLight.color.set('#ffe4b8');
      this.rimLight.intensity = 0.45;
      this.hemiLight.color.set('#fff7eb');
      this.hemiLight.groundColor.set('#c79f7c');
      this.hemiLight.intensity = 0.94;
      this.waterMesh.visible = false;
      this.diveCausticsMesh.visible = false;
      this.skyCloudsMesh.visible = false;
      this.reefRayGroup.visible = false;
      this.starDome.visible = false;
    } else if (layer === 'sky') {
      _col.set('#60bdfc');
      this.bgColor.copy(_col);
      this.fog.color.set('#9addff');
      this.fog.density = 0.0052;
      this.shaderUniforms.uSkyZenith.value.set('#277ee8');
      this.shaderUniforms.uSkyHorizon.value.set('#b8ecff');
      this.shaderUniforms.uSkyBottom.value.set('#64b8f2');
      this.shaderUniforms.uSunColor.value.set('#fff6cf');

      this.sunLight.color.set('#fff9dc');
      this.sunLight.intensity = 1.54;
      this.rimLight.color.set('#d9f5ff');
      this.rimLight.intensity = 0.38;
      this.hemiLight.color.set('#ffffff');
      this.hemiLight.groundColor.set('#6cb8ea');
      this.hemiLight.intensity = 0.86;
      this.waterMesh.visible = false;
      this.diveCausticsMesh.visible = false;
      this.skyCloudsMesh.visible = true;
      this.reefRayGroup.visible = false;
      this.starDome.visible = false;
    } else if (layer === 'dive') {
      // Crystal-clear jewel-toned reef with Snell's window & sunbeams overhead
      _col.set('#0c5685');
      this.bgColor.copy(_col);
      this.fog.color.set('#0e6094');
      this.fog.density = 0.0054;
      this.shaderUniforms.uSkyZenith.value.set('#44d6f8');
      this.shaderUniforms.uSkyHorizon.value.set('#0f6599');
      this.shaderUniforms.uSkyBottom.value.set('#042342');
      this.shaderUniforms.uSunColor.value.set('#c4f8ff');

      this.sunLight.color.set('#e6fbff');
      this.sunLight.intensity = 1.38;
      this.rimLight.color.set('#47e3d4');
      this.rimLight.intensity = 0.36;
      this.hemiLight.color.set('#72dcfa');
      this.hemiLight.groundColor.set('#0d3f66');
      this.hemiLight.intensity = 0.8;
      this.waterMesh.visible = false;
      this.diveCausticsMesh.visible = false;
      this.skyCloudsMesh.visible = false;
      this.reefRayGroup.visible = true;
      this.reefRayGroup.position.set(focusX, 0, focusZ);
      for (let i = 0; i < this.reefRayGroup.children.length; i++) {
        this.reefRayGroup.children[i].rotation.z = 0.16 + Math.sin(t * 0.45 + i) * 0.03;
      }
      this.starDome.visible = false;
    } else if (layer === 'glowdeep') {
      _col.set('#14082b');
      this.bgColor.copy(_col);
      this.fog.color.set('#1f0c42');
      this.fog.density = 0.0155;
      this.shaderUniforms.uSkyZenith.value.set('#0b041c');
      this.shaderUniforms.uSkyHorizon.value.set('#27124f');
      this.shaderUniforms.uSkyBottom.value.set('#0e0621');
      this.shaderUniforms.uSunColor.value.set('#70ffd8');

      this.sunLight.color.set('#9ef5dc');
      this.sunLight.intensity = 1.06;
      this.rimLight.color.set('#c48cff');
      this.rimLight.intensity = 0.48;
      this.hemiLight.color.set('#84ffd8');
      this.hemiLight.groundColor.set('#2e194d');
      this.hemiLight.intensity = 0.76;

      // Bioluminescent crystal river fills the carved Glowdeep canals smoothly
      this.waterMesh.visible = true;
      this.waterMesh.position.set(focusX, -0.055, focusZ);
      const gwMat = this.waterMesh.material as THREE.MeshStandardMaterial;
      gwMat.color.set('#1de8df');
      gwMat.emissive.set('#137882');
      gwMat.emissiveIntensity = 0.72;
      gwMat.roughness = 0.12;
      gwMat.opacity = 0.88;

      this.diveCausticsMesh.visible = false;
      this.skyCloudsMesh.visible = false;
      this.reefRayGroup.visible = false;
      this.starDome.visible = false;
    } else if (layer === 'moonroad') {
      _col.set('#0a0621');
      this.bgColor.copy(_col);
      this.fog.color.set('#160d3d');
      this.fog.density = 0.011;
      this.shaderUniforms.uSkyZenith.value.set('#07041a');
      this.shaderUniforms.uSkyHorizon.value.set('#241459');
      this.shaderUniforms.uSkyBottom.value.set('#0b0626');
      this.shaderUniforms.uSunColor.value.set('#ffe499');

      this.sunLight.color.set('#e5dcff');
      this.sunLight.intensity = 1.3;
      this.rimLight.color.set('#ffd23f');
      this.rimLight.intensity = 0.48;
      this.hemiLight.color.set('#ffd23f');
      this.hemiLight.groundColor.set('#241450');
      this.hemiLight.intensity = 0.78;
      this.waterMesh.visible = false;
      this.diveCausticsMesh.visible = false;
      this.skyCloudsMesh.visible = false;
      this.reefRayGroup.visible = false;
      this.starDome.visible = true;
      this.starDome.position.set(focusX, 0, focusZ);
    } else {
      // Surface Realm: blend Season + Weather + Day/Night cycle into Sky Dome, Fog, Ocean & Sun
      _col.set(wt.skyBackdrop[0]);
      _col2.set(wt.skyBackdrop[2]);
      enrichVibrantColor(_col, 0.2, -0.02);
      if (W.weatherId === 'drizzle') {
        _col.lerp(_col3.set('#5a7a9e'), 0.45);
        _col2.lerp(_col4.set('#8ea9c4'), 0.45);
      } else if (W.weatherId === 'snowy') {
        _col.lerp(_col3.set('#8fb8db'), 0.45);
        _col2.lerp(_col4.set('#d9ecfa'), 0.45);
      } else if (W.weatherId === 'stardust') {
        _col.lerp(_col3.set('#24174a'), 0.65);
        _col2.lerp(_col4.set('#5c3e8c'), 0.55);
      } else if (W.weatherId === 'aurora') {
        _col.lerp(_col3.set('#13354a'), 0.6);
        _col2.lerp(_col4.set('#2c6b78'), 0.55);
      }
      if (sunsetFactor > 0.01) {
        _col.lerp(_col3.set('#70509c'), sunsetFactor * 0.55);
        _col2.lerp(_col4.set('#ff9d6e'), sunsetFactor * 0.78);
      }
      if (nightFactor > 0.01) {
        _col.lerp(_col3.set('#0c0b24'), nightFactor * 0.88);
        _col2.lerp(_col4.set('#1d204a'), nightFactor * 0.82);
      }

      this.shaderUniforms.uSkyZenith.value.copy(_col);
      this.shaderUniforms.uSkyHorizon.value.copy(_col2);
      this.shaderUniforms.uSkyBottom.value.set(wt.surfaceBackdrop[0]);

      this.bgColor.copy(_col2);
      this.fog.color.copy(_col2);
      const isStorm = W.weatherId === 'drizzle' || W.weatherId === 'snowy';
      this.fog.density = isStorm ? 0.012 : 0.0062;

      // Sun, Rim & Hemisphere light balance
      this.sunLight.color.set('#fff5d8');
      if (sunsetFactor > 0.01) this.sunLight.color.lerp(_col3.set('#ff9d5c'), sunsetFactor * 0.7);
      if (nightFactor > 0.01) this.sunLight.color.lerp(_col3.set('#9ab8ff'), nightFactor * 0.75);
      this.shaderUniforms.uSunColor.value.copy(this.sunLight.color);
      this.sunLight.intensity = THREE.MathUtils.lerp(1.62, 0.82, nightFactor);

      this.rimLight.color.set(sunsetFactor > 0.25 ? '#ffd4a3' : nightFactor > 0.4 ? '#9eb8ff' : '#d6f2ff');
      this.rimLight.intensity = THREE.MathUtils.lerp(0.40, 0.34, nightFactor);

      this.hemiLight.color.set('#ffffff');
      this.hemiLight.groundColor.set('#407566');
      if (nightFactor > 0.01) {
        this.hemiLight.color.lerp(_col3.set('#8094d8'), nightFactor * 0.7);
        this.hemiLight.intensity = THREE.MathUtils.lerp(0.78, 0.50, nightFactor);
      } else {
        this.hemiLight.intensity = 0.78;
      }

      // Ocean wave color shimmer
      this.waterMesh.visible = true;
      this.diveCausticsMesh.visible = false;
      this.waterMesh.position.set(focusX, Math.sin(t * 1.4) * 0.025, focusZ);
      const wMat = this.waterMesh.material as THREE.MeshStandardMaterial;
      wMat.color.set(wt.surfaceBackdrop[1]);
      enrichVibrantColor(wMat.color, 0.26, -0.02);
      wMat.emissive.set(wt.surfaceBackdrop[0]);
      enrichVibrantColor(wMat.emissive, 0.18, -0.08);
      wMat.emissiveIntensity = 0.52;
      wMat.roughness = 0.09;
      wMat.opacity = 0.78;
      this.skyCloudsMesh.visible = true;
      this.reefRayGroup.visible = false;
      this.starDome.visible = nightFactor > 0.25 || W.weatherId === 'stardust' || W.weatherId === 'aurora';
      this.starDome.position.set(focusX, 0, focusZ);
    }

    // Dynamic Dusk/Night Window & Fountain Water Warmth + Warm Town Plaza Lights + Rotating Starfield
    const winWarmth = layer === 'surface'
      ? 0.58 + sunsetFactor * 0.55 + nightFactor * 0.95 + Math.sin(t * 3.1) * 0.08
      : 0.85 + Math.sin(t * 2.5) * 0.08;
    this.archPack.warmWindow.emissiveIntensity = winWarmth;
    this.archPack.waterPool.emissiveIntensity = 0.6 + Math.sin(t * 2.6) * 0.14;

    const allowExtraPlazaLights = !this.isMobileMode && !W.lowQuality && !this.isSoftwareGl;
    const plazaBaseIntensity =
      layer === 'surface' && allowExtraPlazaLights
        ? 0.42 + sunsetFactor * 0.85 + nightFactor * 1.45 + (W.weatherId === 'drizzle' || W.weatherId === 'stardust' ? 0.35 : 0)
        : 0;
    for (let li = 0; li < this.townPlazaLights.length; li++) {
      const ptLight = this.townPlazaLights[li];
      const anchor = this.plazaLightAnchors[li];
      if (layer === 'surface' && anchor && allowExtraPlazaLights) {
        ptLight.position.set(anchor.x, anchor.y, anchor.z);
        ptLight.intensity = plazaBaseIntensity + Math.sin(t * 2.4 + li * 1.7) * 0.08;
      } else {
        ptLight.intensity = 0;
      }
    }

    if (this.starDome.visible) {
      this.starDome.rotation.y = t * 0.008;
    }

    // Sync terrain horizon fade color
    this.shaderUniforms.uHorizonFogColor.value.copy(this.fog.color);

    // Center shadow frustum & opposing rim light around focus point (gentle solar arc + exact texel snap for sExtent=24 => width=48)
    const dayArc = W.nightCycleEnabled && layer === 'surface' ? Math.sin(((t % 420) / 420) * Math.PI * 2) * 0.35 : 0;
    const sunAngle = sunsetFactor * 0.6 + dayArc;
    const sunRelX = 12 + sunAngle * 8;
    const sunRelY = Math.max(11, 22 - Math.abs(sunAngle) * 6);
    const sunRelZ = 10 + Math.cos(((t % 420) / 420) * Math.PI * 2) * 1.5;
    this.shaderUniforms.uSunDir.value.set(sunRelX, sunRelY, sunRelZ).normalize();
    const shadowTexel = 48 / this.shadowMapRes;
    const snapX = Math.round(focusX / shadowTexel) * shadowTexel;
    const snapZ = Math.round(focusZ / shadowTexel) * shadowTexel;
    const snapY = Math.round(focusY / shadowTexel) * shadowTexel;
    this.sunLight.position.set(snapX + sunRelX, snapY + sunRelY, snapZ + sunRelZ);
    this.sunLight.target.position.set(snapX, snapY, snapZ);
    this.sunLight.target.updateMatrixWorld();

    this.rimLight.position.set(focusX - 10, focusY + 10, focusZ - 11);
    this.rimLight.target.position.set(focusX, focusY, focusZ);
    this.rimLight.target.updateMatrixWorld();

    // Update volumetric cumulus clouds (cloud-sea beneath Sky Kingdom OR high horizon drift on Surface)
    if (this.skyCloudsMesh.visible) {
      const cloudCount = W.lowQuality || this.isSoftwareGl ? 28 : 58;
      const cMat = this.skyCloudsMesh.material as THREE.MeshStandardMaterial;
      if (layer === 'surface') {
        cMat.color.set('#ffffff');
        if (sunsetFactor > 0.05) cMat.color.lerp(_col2.set('#ffbfa8'), sunsetFactor * 0.55);
        if (nightFactor > 0.05) cMat.color.lerp(_col2.set('#465280'), nightFactor * 0.72);
        cMat.opacity = 0.86;
        for (let i = 0; i < cloudCount; i++) {
          const ang = (i / cloudCount) * Math.PI * 2 + hash(i, 1, 885) * 0.25 + t * 0.004;
          const dist = 30 + hash(i, 2, 886) * 44;
          const cx = focusX + Math.cos(ang) * dist;
          const cz = focusZ + Math.sin(ang) * dist;
          const cy = 12.2 + hash(i, 3, 887) * 8.5 + Math.sin(t * 0.35 + i) * 0.25;
          const s = 2.0 + hash(i, 4, 888) * 2.3;
          _v3.set(cx, cy, cz);
          _euler.set(0, -ang, 0);
          _q.setFromEuler(_euler);
          _scale.set(s * 1.45, s * 0.75, s);
          _m4.compose(_v3, _q, _scale);
          this.skyCloudsMesh.setMatrixAt(i, _m4);
        }
      } else {
        cMat.color.set('#ffffff');
        cMat.opacity = 0.94;
        for (let i = 0; i < cloudCount; i++) {
          const cx = focusX + (((hash(i, 1, 881) - 0.5) * 72 + t * (0.28 + (i % 3) * 0.09)) % 72);
          const cz = focusZ + (hash(i, 2, 882) - 0.5) * 72;
          const isUpper = i % 4 === 0;
          const cy = isUpper ? 9.8 + hash(i, 3, 883) * 4.8 : -2.2 - hash(i, 3, 883) * 3.0;
          const s = (isUpper ? 1.85 : 2.15) + hash(i, 4, 884) * 2.5;
          _v3.set(cx, cy, cz);
          _euler.set(0, hash(i, 5, 889) * 3.14, 0);
          _q.setFromEuler(_euler);
          _scale.set(s * 1.45, s * 0.72, s);
          _m4.compose(_v3, _q, _scale);
          this.skyCloudsMesh.setMatrixAt(i, _m4);
        }
      }
      this.skyCloudsMesh.count = cloudCount;
      this.skyCloudsMesh.instanceMatrix.needsUpdate = true;
    }

    // Dynamic 3D Weather Particle Field + Northern Aurora Ribbons
    const showWeather = layer === 'surface' || layer === 'sky';
    const wType = W.weatherParticleType;
    this.auroraGroup.visible = showWeather && W.weatherId === 'aurora';
    if (this.auroraGroup.visible) {
      this.auroraGroup.position.set(focusX, 0, focusZ);
      this.auroraRibbons.forEach((rib, idx) => {
        rib.position.x = Math.sin(t * 0.35 + idx * 1.4) * 5;
        (rib.material as THREE.MeshBasicMaterial).opacity = 0.22 + Math.sin(t * 0.9 + idx) * 0.09;
      });
    }

    const activeCount =
      !showWeather || wType === 'none' ? 0 : W.lowQuality || this.isSoftwareGl ? 38 : 120;
    this.weatherInstMesh.visible = activeCount > 0;
    if (activeCount > 0) {
      for (let i = 0; i < activeCount; i++) {
        const speed = wType === 'rain' ? 14 : wType === 'muffins' ? 3.5 : 2.1;
        const fall = (t * speed + hash(i, 5, 910) * 16) % 14;
        const py = 12.5 - fall;
        const swayX = wType === 'rain' ? -fall * 0.16 : Math.sin(t * 1.5 + i) * 0.65;
        const px = focusX + (hash(i, 1, 911) - 0.5) * 32 + swayX;
        const pz = focusZ + (hash(i, 2, 912) - 0.5) * 26;

        if (wType === 'rain') {
          _scale.set(0.35, 3.2, 0.35);
          _euler.set(0, 0, 0.2);
          _col.set('#b8e4ff');
        } else if (wType === 'snow') {
          _scale.set(0.9, 0.6, 0.9);
          _euler.set(t + i, t * 0.7, 0);
          _col.set('#ffffff');
        } else if (wType === 'muffins') {
          _scale.set(1.5, 1.3, 1.5);
          _euler.set(t * 0.5, t + i, 0);
          _col.set(i % 2 === 0 ? '#ffd27d' : '#ff9ebb');
        } else {
          // stardust / aurora motes
          _scale.set(0.85, 0.85, 0.85);
          _euler.set(t, t, 0);
          _col.set(i % 2 === 0 ? '#ffe89a' : '#64f5c1');
        }
        _v3.set(px, py, pz);
        _q.setFromEuler(_euler);
        _m4.compose(_v3, _q, _scale);
        this.weatherInstMesh.setMatrixAt(i, _m4);
        this.weatherInstMesh.setColorAt(i, _col);
      }
      this.weatherInstMesh.count = activeCount;
      this.weatherInstMesh.instanceMatrix.needsUpdate = true;
      if (this.weatherInstMesh.instanceColor) this.weatherInstMesh.instanceColor.needsUpdate = true;
    }

    // Continuous Ambient Realm Motes (rising pearl bubbles underwater, fireflies/petals on surface, spores in caverns, starlight)
    const moteCount =
      layer === 'house'
        ? W.lowQuality || this.isSoftwareGl
          ? 8
          : 18
        : W.lowQuality || this.isSoftwareGl
        ? 34
        : 96;
    const isNightSurface = layer === 'surface' && (nightFactor > 0.28 || sunsetFactor > 0.38);
    for (let i = 0; i < moteCount; i++) {
      const hX = hash(i, 1, 951);
      const hZ = hash(i, 2, 952);
      const hP = hash(i, 3, 953);
      let mx = focusX + (hX - 0.5) * (layer === 'house' ? 18 : 32);
      let mz = focusZ + (hZ - 0.5) * (layer === 'house' ? 14 : 26);
      let my = 1.0;
      let mScale = 1.0;

      if (layer === 'house') {
        my = 0.65 + hP * 1.85 + Math.sin(t * 0.9 + i) * 0.18;
        mx += Math.sin(t * 0.55 + i) * 0.22;
        mScale = 0.32 + Math.sin(t * 2.1 + i) * 0.12;
        _col.set(i % 2 === 0 ? '#fff2bd' : '#ffd8ea');
      } else if (layer === 'dive') {
        // Delicate rising air bubbles & tiny golden sea-plankton (tracks local trench depth)
        const rise = (t * (0.85 + (i % 4) * 0.22) + hP * 7) % 6.2;
        my = Math.min(-0.1, focusY) + 0.05 + rise;
        mx += Math.sin(t * 2.1 + i) * 0.26;
        mz += Math.cos(t * 1.7 + i) * 0.2;
        mScale = 0.36 + Math.sin(t * 3 + i) * 0.14 + (i % 6 === 0 ? 0.18 : 0);
        _col.set(i % 5 === 0 ? '#ffd87a' : i % 2 === 0 ? '#c4f8ff' : '#6eeeff');
      } else if (layer === 'glowdeep') {
        const floatY = (t * 0.55 + hP * 5) % 4.5;
        my = 0.25 + floatY;
        mx += Math.sin(t * 1.4 + i) * 0.45;
        mScale = 0.75 + Math.sin(t * 3.5 + i) * 0.3;
        _col.set(i % 2 === 0 ? '#64f5c1' : '#d299ff');
      } else if (layer === 'moonroad') {
        my = 0.45 + ((t * 0.4 + hP * 5) % 4.2);
        mx += Math.cos(t * 1.2 + i) * 0.4;
        mScale = 0.6 + Math.abs(Math.sin(t * 2.8 + i)) * 0.6;
        _col.set(i % 2 === 0 ? '#ffe484' : '#c9b8ff');
      } else if (layer === 'sky') {
        my = Math.max(0.4, focusY) + hP * 4.5 + Math.sin(t * 1.4 + i) * 0.45;
        mx += Math.sin(t * 0.9 + i) * 0.5;
        mScale = 0.7 + Math.sin(t * 2.6 + i) * 0.25;
        _col.set(i % 2 === 0 ? '#fff5b8' : '#b2ebff');
      } else if (isNightSurface) {
        // Warm golden twilight/night fireflies
        my = Math.max(0.15, focusY) + 0.35 + hP * 2.2 + Math.sin(t * 1.9 + i) * 0.35;
        mx += Math.sin(t * 1.3 + i * 0.7) * 0.65;
        mz += Math.cos(t * 1.1 + i) * 0.55;
        mScale = 0.65 + Math.max(0, Math.sin(t * 4.2 + i * 1.7)) * 0.65;
        _col.set(i % 3 === 0 ? '#b2ff9e' : '#ffe470');
      } else {
        // Daytime seasonal blossoms / dandelion / autumn leaves / frost sparkle
        const drift = (t * 0.75 + hP * 5) % 4.8;
        my = Math.max(0.3, focusY) + 4.4 - drift;
        mx += Math.sin(t * 1.2 + i) * 0.9;
        mScale = season === 'spring' || season === 'autumn' ? 0.95 : 0.72;
        if (season === 'spring') _col.set(i % 2 === 0 ? '#ffb5d0' : '#ffe3ee');
        else if (season === 'summer') _col.set(i % 2 === 0 ? '#fff39e' : '#a8f2ff');
        else if (season === 'autumn') _col.set(i % 2 === 0 ? '#ff944d' : '#ffcb52');
        else _col.set('#dff7ff');
      }

      _v3.set(mx, my, mz);
      _q.identity();
      _scale.setScalar(mScale);
      _m4.compose(_v3, _q, _scale);
      this.ambientMotesMesh.setMatrixAt(i, _m4);
      this.ambientMotesMesh.setColorAt(i, _col);
    }
    this.ambientMotesMesh.count = moteCount;
    this.ambientMotesMesh.instanceMatrix.needsUpdate = true;
    if (this.ambientMotesMesh.instanceColor) this.ambientMotesMesh.instanceColor.needsUpdate = true;
  }

  private updateAmbientWildlife(
    layer: WorldLayer3D,
    W: World3DSyncState,
    focusX: number,
    focusZ: number
  ): void {
    const batch = this.batches.critters;
    if (!batch) return;
    batch.count = 0;
    if (layer === 'house') {
      batch.mesh.count = 0;
      batch.mesh.instanceMatrix.needsUpdate = true;
      return;
    }

    const t = W.time;
    const lowMode = Boolean(W.lowQuality || this.isSoftwareGl);
    const maxCritters = lowMode ? 48 : 132;
    const bflyCols = ['#ff7aa8', '#ffb347', '#5ce1ff', '#ffe45e', '#d69eff'];
    const birdCols = ['#fff8ee', '#f5c07a', '#7cc6fe', '#e88fb4'];
    const skySwallowCols = ['#fff9ee', '#ffd27a', '#8fd5ff', '#ff9ec7', '#b6f7e2'];
    const gridSpan = 38;
    const anchorX = Math.floor(focusX / 6) * 6;
    const anchorZ = Math.floor(focusZ / 6) * 6;

    if (layer === 'sky') {
      // Sky Kingdom Flocks: Swallows & Crest Birds genuinely circling floating cloud islands, spires & wind harps
      const { anchors, count: anchorCount } = collectVisibleSkyIslandAnchors(W.SB, W.SD, focusX, focusZ, 34);
      const birdsPerIsland = lowMode ? 3 : 5;
      for (let aIdx = 0; aIdx < anchorCount && batch.count < batch.max; aIdx++) {
        const anch = anchors[aIdx];
        const flockCount =
          anch.kind === 'castle'
            ? lowMode
              ? 5
              : 9
            : anch.kind === 'updraft' || anch.kind === 'market' || anch.kind === 'garden'
            ? lowMode
              ? 4
              : 6
            : birdsPerIsland;

        // World-anchored neighboring island pull (occasionally birds arc toward the next cloud island)
        const nextAnch = anchors[(aIdx + 1) % anchorCount];
        const dirSign = aIdx % 2 === 0 ? 1 : -1;

        for (let b = 0; b < flockCount && batch.count < batch.max; b++) {
          const bSeed = anch.seed + b * 3.17;
          const h1 = hash(aIdx, b, 991);
          const h2 = hash(aIdx, b, 992);
          const angularSpeed = (0.38 + h1 * 0.24) * (anch.kind === 'castle' ? 0.78 : 1.0) * dirSign;
          const flockPhase = b * ((Math.PI * 2) / flockCount) + h2 * 0.45;
          const ph = t * angularSpeed + flockPhase;

          if (anch.kind === 'updraft') {
            // Rising thermal helix around Sunrise Updraft Spire with smooth swoop-down reset
            const thermalCycle = (t * 0.14 + b / flockCount + h1 * 0.3) % 1;
            const spireR = anch.radius * (0.48 + 0.55 * Math.sin(thermalCycle * Math.PI));
            const cx = anch.tx + Math.cos(ph * 1.35) * spireR;
            const cz = anch.tz + Math.sin(ph * 1.35) * spireR;
            const vx = -Math.sin(ph * 1.35) * spireR * angularSpeed * 1.35;
            const vz = Math.cos(ph * 1.35) * spireR * angularSpeed * 1.35;
            const yaw = Math.atan2(vx, vz);
            const climbCurve = Math.sin(thermalCycle * Math.PI);
            const gy = Math.max(0.2, getTerrainHeight3D(anch.tx, anch.tz, 'sky', W.B, W.SB, W.iceMap));
            const cy = gy + 1.55 + climbCurve * 4.4 + Math.sin(t * 1.4 + b) * 0.22;
            const vy = Math.cos(thermalCycle * Math.PI) * 1.3;
            const horizSpd = Math.max(0.4, Math.hypot(vx, vz));
            const pitch = Math.max(-0.42, Math.min(0.42, -Math.atan2(vy, horizSpd)));
            const bankRoll = dirSign * (0.28 + h2 * 0.18);
            const sc = 1.48 + h1 * 0.34;
            this.pushInstanceDirected('critters', cx, cy, cz, sc, sc, sc, pitch, yaw, bankRoll, skySwallowCols[(aIdx + b) % skySwallowCols.length]);
          } else {
            // Sweeping island-perimeter & castle-turret orbits hugging cloud rims and rising over treetops
            const islandStretch = 0.8 + 0.35 * Math.sin(bSeed);
            const orbitR = anch.radius * (0.76 + (b % 3) * 0.2 + Math.sin(ph * 0.5 + b) * 0.1);
            // Subtle island-hopping sweep on outer flock members when another island is nearby
            const hopPull =
              anchorCount > 1 && b === 0
                ? Math.max(0, Math.sin(t * 0.28 + aIdx)) * 0.18
                : 0;
            const centerX = anch.tx + (nextAnch.tx - anch.tx) * hopPull;
            const centerZ = anch.tz + (nextAnch.tz - anch.tz) * hopPull;

            const cx = centerX + Math.cos(ph) * orbitR;
            const cz = centerZ + Math.sin(ph) * orbitR * islandStretch;
            const vx = -Math.sin(ph) * orbitR * angularSpeed;
            const vz = Math.cos(ph) * orbitR * islandStretch * angularSpeed;
            const yaw = Math.atan2(vx, vz);

            const groundHere = Math.max(-0.2, getTerrainHeight3D(cx, cz, 'sky', W.B, W.SB, W.iceMap));
            const rimLift = groundHere > 0.05 ? groundHere + 2.35 : 1.45;
            const waveAltitude = Math.sin(ph * 2.0 + b) * 0.55 + Math.cos(t * 0.9 + bSeed) * 0.28;
            const cy = rimLift + h2 * 1.85 + waveAltitude;
            const vy = Math.cos(ph * 2.0 + b) * 0.55 * Math.abs(angularSpeed) * 2.0;
            const horizSpd = Math.max(0.4, Math.hypot(vx, vz));
            const pitch = Math.max(-0.36, Math.min(0.36, -Math.atan2(vy, horizSpd)));
            const bankRoll = dirSign * (0.24 + 0.14 * Math.sin(ph + b));
            const sc = (anch.kind === 'castle' ? 1.62 : 1.48) + h1 * 0.28;

            this.pushInstanceDirected(
              'critters',
              cx,
              cy,
              cz,
              sc,
              sc,
              sc,
              pitch,
              yaw,
              bankRoll,
              skySwallowCols[(aIdx + b) % skySwallowCols.length]
            );
          }
        }
      }

      batch.mesh.count = batch.count;
      batch.mesh.instanceMatrix.needsUpdate = true;
      if (batch.mesh.instanceColor) batch.mesh.instanceColor.needsUpdate = true;
      return;
    }

    for (let i = 0; i < maxCritters && batch.count < batch.max; i++) {
      const h1 = hash(i, 1, 971);
      const h2 = hash(i, 2, 972);
      const h3 = hash(i, 3, 973);

      const baseX = anchorX + (h1 - 0.5) * gridSpan;
      const baseZ = anchorZ + (h2 - 0.5) * gridSpan;
      const speed = 0.72 + h3 * 0.95;
      const ph = t * speed + i * 1.93;

      if (layer === 'surface') {
        const isBird = i % 4 === 0;
        const baseTileX = Math.max(1, Math.min(N - 2, Math.floor(baseX)));
        const baseTileZ = Math.max(1, Math.min(N - 2, Math.floor(baseZ)));
        const baseBiome = W.B[baseTileZ * N + baseTileX];
        const isCoastalBird = isBird && baseBiome <= 2;

        const rad = isBird ? (isCoastalBird ? 5.6 + h3 * 4.5 : 4.4 + h3 * 3.8) : 1.15 + h3 * 1.25;
        const orbitDir = i % 8 === 0 ? -1 : 1;
        const signedPh = ph * orbitDir;
        const orbitMod = isBird ? 1.0 + Math.sin(ph * 0.25) * 0.14 : 1.0 + Math.sin(ph * 0.35 + i) * 0.28;
        const cx = baseX + Math.cos(signedPh) * rad * orbitMod;
        const cz = baseZ + Math.sin(signedPh * (isBird ? 1.0 : 2.0)) * rad * 0.78;
        const vx = -Math.sin(signedPh) * rad * orbitDir;
        const vz = Math.cos(signedPh * (isBird ? 1.0 : 2.0)) * rad * 0.78 * (isBird ? 1.0 : 2.0) * orbitDir;
        const yaw = Math.atan2(vx, vz);
        const bankRoll = isBird ? orbitDir * (0.24 + Math.sin(ph * 1.2) * 0.16) : Math.cos(ph * 2.0) * 0.18;
        const pitch = isBird ? -Math.cos(t * 1.3 + i) * 0.16 : 0.12;

        const gy = getTerrainHeight3D(cx, cz, 'surface', W.B, W.SB, W.iceMap);
        const localTileX = Math.max(1, Math.min(N - 2, Math.floor(cx)));
        const localTileZ = Math.max(1, Math.min(N - 2, Math.floor(cz)));
        const localDk = W.DK[localTileZ * N + localTileX];
        const nearFlower = localDk === 5 || localDk === 6 || localDk === 8 || localDk === 11;
        const dwellDip = isBird ? 0 : Math.max(0, Math.sin(t * 0.9 + i * 2.3)) * (nearFlower ? 0.36 : 0.22);
        const cy = isBird
          ? Math.max(0.6, gy) + (isCoastalBird ? 2.9 : 3.7) + Math.sin(t * 1.3 + i) * 0.62
          : gy < -0.02
          ? 0.24 + Math.sin(t * 4.1 + i * 1.7) * 0.12
          : Math.max(0.05, gy) + 0.66 - dwellDip + Math.sin(t * 3.6 + i * 1.7) * 0.24;
        const sc = isBird ? 1.62 : gy < -0.02 ? 0.96 : 0.88 + h3 * 0.32;
        const col = isBird
          ? isCoastalBird
            ? i % 8 === 0
              ? '#fffdf8'
              : '#d8f0ff'
            : birdCols[i % birdCols.length]
          : gy < -0.02
          ? '#4fe8ff'
          : bflyCols[i % bflyCols.length];

        this.pushInstanceDirected('critters', cx, cy, cz, sc, sc, sc, pitch, yaw, bankRoll, col);
      } else if (layer === 'dive') {
        // Drifting glowing sea-skaters, manta-wisps & pulsing moon jellyfish near reef floor
        const cx = baseX + Math.sin(ph * 0.55) * 1.9;
        const cz = baseZ + Math.cos(ph * 0.48) * 1.9;
        const reefY = getTerrainHeight3D(cx, cz, 'dive', W.B, W.SB, W.iceMap);
        const cy = reefY + 0.6 + ((t * 0.28 + h3 * 2.2) % 2.4);
        const sc = 1.05 + h3 * 0.48;
        const diveCols = ['#a8f6ff', '#ff9ee8', '#64f5c1', '#ffd87a'];
        this.pushInstanceDirected('critters', cx, cy, cz, sc, sc * 0.8, sc, 0.25, ph * 0.4, Math.sin(ph) * 0.14, diveCols[i % diveCols.length]);
      } else {
        // Bioluminescent cave moths & starlight celestial butterflies hovering smoothly above actual terrain
        const cx = baseX + Math.cos(ph) * 1.85;
        const cz = baseZ + Math.sin(ph * 1.65) * 1.45;
        const yaw = Math.atan2(-Math.sin(ph), 1.65 * Math.cos(ph * 1.65));
        const gy = Math.max(0.1, getTerrainHeight3D(cx, cz, layer, W.B, W.SB, W.iceMap));
        const cy = gy + 0.72 + h3 * 1.65 + Math.sin(t * 2.8 + i) * 0.34;
        const col =
          layer === 'glowdeep'
            ? i % 3 === 0
              ? '#64f5c1'
              : i % 3 === 1
              ? '#d299ff'
              : '#ffae4d'
            : i % 3 === 0
            ? '#ffe484'
            : i % 3 === 1
            ? '#c298ff'
            : '#8fd5ff';
        this.pushInstance(
          'critters',
          cx,
          cy,
          cz,
          1.08 + h3 * 0.25,
          1.08 + h3 * 0.25,
          1.08 + h3 * 0.25,
          0.1,
          yaw,
          Math.sin(ph * 1.4) * 0.18,
          col
        );
      }
    }

    batch.mesh.count = batch.count;
    batch.mesh.instanceMatrix.needsUpdate = true;
    if (batch.mesh.instanceColor) batch.mesh.instanceColor.needsUpdate = true;
  }

  private spawnStepRipple(x: number, y: number, z: number, maxRadius: number, maxAge: number, colHex: number): void {
    for (let i = 0; i < this.stepRipples.length; i++) {
      const sr = this.stepRipples[i];
      if (!sr.active) {
        sr.active = true;
        sr.x = x;
        sr.y = y;
        sr.z = z;
        sr.age = 0;
        sr.maxAge = maxAge;
        sr.maxRadius = maxRadius;
        sr.colHex = colHex;
        return;
      }
    }
  }

  private updateStepRipples(
    layer: WorldLayer3D,
    W: World3DSyncState,
    dt: number,
    pY: number
  ): void {
    const t = W.time;
    const isSurfaceOrDive = layer === 'surface' || layer === 'dive';
    if (!W.isTitleMode && layer !== 'house') {
      if (W.player.isMoving && isSurfaceOrDive) {
        const px = W.player.x / T;
        const pz = W.player.y / T;
        const inWater = Boolean(W.player.swim) || (layer === 'surface' && pY < -0.02);
        const interval = inWater ? 0.17 : W.player.isSprinting ? 0.19 : 0.29;
        if (t - this.lastStepRippleTime >= interval) {
          this.lastStepRippleTime = t;
          if (inWater && layer === 'surface') {
            this.spawnStepRipple(px, 0.042, pz, W.player.isSprinting ? 0.72 : 0.52, 0.85, 0xd8f8ff);
          } else if (!inWater && layer === 'surface') {
            this.spawnStepRipple(px, pY + 0.045, pz, W.player.isSprinting ? 0.34 : 0.22, 0.45, 0xf2e8c9);
          }
        }
      }
      if (layer === 'surface' && t - this.lastBoatRippleTime >= 0.75) {
        this.lastBoatRippleTime = t;
        for (let b = 0; b < this.boatPool.length; b++) {
          if (this.boatPool[b].visible && this.boatAnchors[b]) {
            this.spawnStepRipple(this.boatAnchors[b].x, 0.04, this.boatAnchors[b].z, 1.05, 1.5, 0xc8f4ff);
          }
        }
      }
    }

    let count = 0;
    for (let i = 0; i < this.stepRipples.length; i++) {
      const sr = this.stepRipples[i];
      if (!sr.active) continue;
      sr.age += dt;
      if (sr.age >= sr.maxAge) {
        sr.active = false;
        continue;
      }
      const prog = sr.age / sr.maxAge;
      const easeOut = 1 - (1 - prog) * (1 - prog);
      const radius = Math.max(0.06, sr.maxRadius * (0.18 + easeOut * 0.82));
      const thicknessScale = Math.max(0.1, 1 - prog);
      _v3.set(sr.x, sr.y, sr.z);
      _q.identity();
      _scale.set(radius, thicknessScale, radius);
      _m4.compose(_v3, _q, _scale);
      this.waterRipplesMesh.setMatrixAt(count, _m4);
      _col.setHex(sr.colHex).lerp(_col2.setHex(0xffffff), 0.25);
      _col.multiplyScalar(1 - prog * 0.45);
      this.waterRipplesMesh.setColorAt(count, _col);
      count++;
    }
    this.waterRipplesMesh.visible = count > 0;
    this.waterRipplesMesh.count = count;
    if (count > 0) {
      this.waterRipplesMesh.instanceMatrix.needsUpdate = true;
      if (this.waterRipplesMesh.instanceColor) this.waterRipplesMesh.instanceColor.needsUpdate = true;
    }
  }

  public resize(width: number, height: number, dpr: number): void {
    if (this.disposed) return;
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    const safeDpr = this.isSoftwareGl ? 1 : Math.max(0.75, Math.min(Number.isFinite(dpr) ? dpr : 1, 2));
    const dimTolerance = this.isMobileMode && this.lastResizeW > 0 ? 4 : 1;
    if (
      Math.abs(w - this.lastResizeW) < dimTolerance &&
      Math.abs(h - this.lastResizeH) < dimTolerance &&
      Math.abs(safeDpr - this.lastResizeDpr) < 0.04
    ) {
      return;
    }
    this.lastResizeW = w;
    this.lastResizeH = h;
    this.lastResizeDpr = safeDpr;
    this.renderer.setPixelRatio(safeDpr);
    this.renderer.setSize(w, h, false);
    if (this.composer) {
      this.composer.setPixelRatio(safeDpr);
      this.composer.setSize(w, h);
    }
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  public isContextLost(): boolean {
    return this.contextLost;
  }

  public render(W: World3DSyncState, dt: number): void {
    if (this.disposed || this.contextLost) return;
    const safeDt = Number.isFinite(dt) ? Math.max(0.001, Math.min(0.05, dt)) : 0.016;
    if (!this.vibrantInitialized) {
      this.vibrantInitialized = true;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
      this.scene.environmentIntensity = 0.56;
      this.terrainMat.roughness = 0.9;
      this.terrainMat.metalness = 0.0;
      if (this.lanternBarkMat) this.lanternBarkMat.color.setHex(0x66392c);
      if (this.lanternCrownMat1) this.lanternCrownMat1.color.setHex(0x268f56);
      if (this.lanternCrownMat2) this.lanternCrownMat2.color.setHex(0x52d97b);
      for (const fm of this.cottageFlowerMats) {
        fm.color.setHex(0xff5a96);
      }
    }

    const lowMode = Boolean(W.lowQuality || this.isMobileMode || this.isSoftwareGl);
    // Track quality tier smoothly for prop scatter/particle budget without toggling shadowMap.enabled or camera.far (which stalls the GPU via full shader recompilation!)
    this.activeLowQuality = lowMode;

    const propRadius = lowMode ? PROP_RADIUS_LOW : PROP_RADIUS;
    const layer = this.getLayerName(W);
    const t = Number.isFinite(W.time) ? W.time : 0;

    // Update shared GLSL shader uniforms once per frame (zero allocation)
    const pGroundY = getActorGroundY3D(W.player.x, W.player.y, layer, W.B, W.SB, W.iceMap);
    this.shaderUniforms.uTime.value = t;
    this.shaderUniforms.uPlayerPos.value.set(W.player.x / T, pGroundY, W.player.y / T);
    this.shaderUniforms.uLayer.value =
      layer === 'surface' ? 0 : layer === 'sky' ? 1 : layer === 'dive' ? 2 : layer === 'glowdeep' ? 3 : 4;
    this.shaderUniforms.uVibrant.value = 1;
    this.shaderUniforms.uSeason.value =
      W.season === 'summer' ? 1 : W.season === 'autumn' ? 2 : W.season === 'winter' ? 3 : 0;
    this.shaderUniforms.uLowQuality.value = lowMode ? 1 : 0;

    // Cache Great Lantern Tree lookup across frames
    if (this.cachedNpcsRef !== W.npcs) {
      this.cachedNpcsRef = W.npcs;
      this.cachedLanternTree =
        W.npcs.find((n) => n.tree && !n.sky && !n.sea && !n.glowdeep && !n.moonroad) ?? null;
    }
    const lanternTree = this.cachedLanternTree;

    // Determine camera look center (Title Mode frames Great Lantern Tree cleanly!)
    let focusX = Number.isFinite(W.player.x) ? W.player.x / T : N / 2;
    let focusZ = Number.isFinite(W.player.y) ? W.player.y / T : N / 2;
    if (W.isTitleMode && lanternTree) {
      focusX = lanternTree.x / T;
      focusZ = lanternTree.y / T + 1.4;
    }
    this.shaderUniforms.uFocusPos.value.set(focusX, pGroundY, focusZ);
    dt = safeDt;

    // Populate synchronized settlement/landmark terrace anchors once per world so cottages & plazas stay level
    if (this.cachedTownsRef !== W.towns || this.resolvedLandmarkCoords.length !== this.customLandmarks.length) {
      this.cachedTownsRef = W.towns;
      this.resolvedLandmarkCoords = this.customLandmarks.map((lm) => {
        if (lm.townName) {
          const match = W.towns.find((tw) => tw.n === lm.townName);
          if (match) {
            return {
              tx: match.x + (lm.offsetTx ?? 0),
              tz: match.y + (lm.offsetTz ?? 0),
            };
          }
        }
        return { tx: lm.tx, tz: lm.tz };
      });

      const nextSurface: TerraceAnchor[] = [];
      const nextDive: TerraceAnchor[] = [];
      const nextSky: TerraceAnchor[] = [];

      for (const tw of W.towns) {
        if (tw.w === 0) {
          const baseH = Math.max(0.18, getRawSurfaceTerrainH(tw.x + 0.5, tw.y + 0.5, W.B, W.iceMap));
          nextSurface.push({ tx: tw.x + 0.5, tz: tw.y + 0.5, baseH, innerR: 7.4, outerR: 12.6 });
        } else if (tw.w === 1) {
          const baseH = getBathymetryRelief(tw.x + 0.5, tw.y + 0.5, false);
          nextDive.push({ tx: tw.x + 0.5, tz: tw.y + 0.5, baseH, innerR: 6.2, outerR: 10.5 });
        } else if (tw.w === 2) {
          nextSky.push({ tx: tw.x + 0.5, tz: tw.y + 0.5, baseH: tw.n === 'Cirrus Castle' ? 1.05 : 0.72, innerR: 4.5, outerR: 9.5 });
        }
      }

      if (W.playerHomePortal) {
        const hx = W.playerHomePortal.x / T;
        const hz = W.playerHomePortal.y / T;
        nextSurface.push({
          tx: hx,
          tz: hz,
          baseH: Math.max(0.24, getRawSurfaceTerrainH(hx, hz, W.B, W.iceMap)),
          innerR: 3.2,
          outerR: 6.6,
        });
      }
      if (lanternTree) {
        const lx = lanternTree.x / T;
        const lz = lanternTree.y / T;
        nextSurface.push({
          tx: lx,
          tz: lz,
          baseH: Math.max(0.28, getRawSurfaceTerrainH(lx, lz, W.B, W.iceMap)),
          innerR: 3.0,
          outerR: 6.4,
        });
      }
      if (W.glowdeepPortal) {
        const gx = W.glowdeepPortal.x / T;
        const gz = W.glowdeepPortal.y / T;
        nextSurface.push({
          tx: gx,
          tz: gz,
          baseH: Math.max(0.22, getRawSurfaceTerrainH(gx, gz, W.B, W.iceMap)),
          innerR: 2.0,
          outerR: 4.8,
        });
      }
      if (W.moonGatePortal) {
        const mx = W.moonGatePortal.x / T;
        const mz = W.moonGatePortal.y / T;
        nextSurface.push({
          tx: mx,
          tz: mz,
          baseH: Math.max(0.22, getRawSurfaceTerrainH(mx, mz, W.B, W.iceMap)),
          innerR: 2.0,
          outerR: 4.8,
        });
      }

      const nextGlow: TerraceAnchor[] = [];
      const nextMoon: TerraceAnchor[] = [];

      for (let i = 0; i < this.customLandmarks.length; i++) {
        const lm = this.customLandmarks[i];
        const pos = this.resolvedLandmarkCoords[i];
        const lx = (pos ? pos.tx : lm.tx) + 0.5;
        const lz = (pos ? pos.tz : lm.tz) + 0.5;
        if (lm.layer === 'surface') {
          const baseH = Math.max(0.2, getRawSurfaceTerrainH(lx, lz, W.B, W.iceMap));
          nextSurface.push({ tx: lx, tz: lz, baseH, innerR: 2.6, outerR: 5.8 });
        } else if (lm.layer === 'dive') {
          const baseH = getBathymetryRelief(lx, lz, false);
          nextDive.push({ tx: lx, tz: lz, baseH, innerR: 2.8, outerR: 6.2 });
        } else if (lm.layer === 'sky') {
          nextSky.push({ tx: lx, tz: lz, baseH: lm.id === 'sunrise_updraft_spire' ? 1.52 : 0.85, innerR: 3.2, outerR: 7.0 });
        } else if (lm.layer === 'glowdeep') {
          nextGlow.push({ tx: lx, tz: lz, baseH: 0.14, innerR: 2.8, outerR: 6.2 });
        } else if (lm.layer === 'moonroad') {
          nextMoon.push({
            tx: lx,
            tz: lz,
            baseH: lm.id === 'edge_of_silence_tower' ? 0.68 : 0.46,
            innerR: 2.8,
            outerR: 6.2,
          });
        }
      }

      activeSurfaceTerraces = nextSurface;
      activeDiveTerraces = nextDive;
      activeSkyTerraces = nextSky;
      activeGlowdeepTerraces = nextGlow;
      activeMoonTerraces = nextMoon;
      this.terrainStateKey = '';
      this.worldMapLayerKey = '';
      this.propRebuildKey = '';
    }

    const focusTileX = Math.floor(focusX);
    const focusTileZ = Math.floor(focusZ);
    const focusY = getTerrainHeight3D(focusX, focusZ, layer, W.B, W.SB, W.iceMap);

    const camPresetActive: CameraPreset3D = W.isTitleMode ? 'cozy' : W.cameraPreset || 'cozy';
    const isHouse = layer === 'house';
    this.terrainMesh.visible = !isHouse;
    if (this.houseInterior) {
      this.houseInterior.group.visible = isHouse;
      if (isHouse) {
        this.houseInterior.setCutaway(camPresetActive !== 'first_person');
        this.houseInterior.update(t, W.cottage, W.weatherId, W.aquariumFishList || []);
      }
    }

    // 1. Sync World Map DataTexture & Rebuild Terrain Chunk ONLY when moving >= 4 tiles from chunk center or changing layer/season/iceMap/lilyMap/dkRevision
    const iceSig = W.iceMap.size;
    const lilySig = W.lilyMap ? W.lilyMap.size : 0;
    const dkSig = W.dkRevision ?? 0;
    const tKey = `${layer}|${W.season}|${iceSig}|${lilySig}|${dkSig}`;
    const mapKey = `${layer}|${iceSig}|${lilySig}|${activeSurfaceTerraces.length}`;
    if (!isHouse && mapKey !== this.worldMapLayerKey) {
      this.worldMapLayerKey = mapKey;
      this.rebuildWorldMapTexture(layer, W);
    }
    const layerOrSeasonChanged = tKey !== this.terrainStateKey;
    const terrainCenterTx = this.terrainOriginTx + CHUNK_HALF;
    const terrainCenterTz = this.terrainOriginTz + CHUNK_HALF;
    let terrainRebuiltThisFrame = false;
    if (
      !isHouse &&
      (layerOrSeasonChanged ||
        Math.abs(focusTileX - terrainCenterTx) >= 4 ||
        Math.abs(focusTileZ - terrainCenterTz) >= 4)
    ) {
      this.terrainStateKey = tKey;
      this.terrainOriginTx = focusTileX - CHUNK_HALF;
      this.terrainOriginTz = focusTileZ - CHUNK_HALF;
      this.rebuildTerrainChunk(this.terrainOriginTx, this.terrainOriginTz, layer, W);
      terrainRebuiltThisFrame = true;
    }

    // 2. Staggered Static/Instanced Prop Window Rebuild (max 1 heavy rebuild/frame when walking)
    const propKey = `${Math.floor(focusTileX / 3)},${Math.floor(focusTileZ / 3)}|${tKey}|${lowMode ? 1 : 0}`;
    if (propKey !== this.propRebuildKey && (!terrainRebuiltThisFrame || layerOrSeasonChanged)) {
      this.propRebuildKey = propKey;
      this.rebuildStaticPropInstances(focusTileX, focusTileZ, layer, W, propRadius);
    }

    // 3. Update Unique Hero Landmarks Visibility & Animations
    const isSurface = layer === 'surface';
    if (this.lanternTreeGroup) {
      if (isSurface && lanternTree) {
        const ltx = lanternTree.x / T;
        const ltz = lanternTree.y / T;
        const vis = Math.abs(ltx - focusX) < 32 && Math.abs(ltz - focusZ) < 32;
        this.lanternTreeGroup.visible = vis;
        if (vis) {
          const lgy = getTerrainHeight3D(ltx, ltz, 'surface', W.B, W.SB, W.iceMap);
          this.lanternTreeGroup.position.set(ltx, lgy, ltz);
          this.lanternTreeLight.position.set(ltx, lgy + 2.1, ltz + 0.8);
          this.lanternTreeLight.intensity = W.lullabyDone ? 2.1 : 1.05;
          this.lanternOrbs.forEach((orb, idx) => {
            const mat = orb.material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity = W.lullabyDone ? 1.05 + Math.sin(t * 4 + idx) * 0.28 : 0.55 + Math.sin(t * 2 + idx) * 0.14;
          });
        } else {
          this.lanternTreeLight.intensity = 0;
        }
      } else {
        this.lanternTreeGroup.visible = false;
        this.lanternTreeLight.intensity = 0;
      }
    }

    for (let fIdx = 0; fIdx < this.fountainPool.length; fIdx++) {
      const fn = this.fountainPool[fIdx];
      if (!fn.visible) continue;
      const gem = fn.getObjectByName('waystoneGem');
      if (gem) {
        gem.rotation.y = t * 1.6;
        gem.position.y = 1.24 + Math.sin(t * 2.8 + fIdx) * 0.08;
      }
      const rip = fn.getObjectByName('waystoneRipple');
      if (rip) {
        const rs = 0.72 + ((t * 0.65) % 1) * 0.68;
        rip.scale.setScalar(rs);
      }
      for (let d = 0; d < 6; d++) {
        const drop = fn.getObjectByName(`waterSpray${d}`);
        if (drop) {
          const ph = (t * 1.25 + d * 0.167 + fIdx * 0.2) % 1;
          const a = (d / 6) * Math.PI * 2 + t * 0.25;
          const rad = 0.16 + ph * 0.64;
          const arcY = 1.12 + ph * 0.36 - ph * ph * 1.02;
          drop.position.set(Math.cos(a) * rad, arcY, Math.sin(a) * rad);
          drop.scale.setScalar(Math.max(0.25, Math.sin(ph * Math.PI) * 1.15));
        }
      }
    }

    for (let cIdx = 0; cIdx < this.cottagePool.length; cIdx++) {
      const cot = this.cottagePool[cIdx];
      if (!cot.visible) continue;
      const puffs = this.cottageSmokePool[cIdx];
      if (puffs) {
        for (let s = 0; s < puffs.length; s++) {
          const ph = (t * 0.38 + s * 0.33 + cIdx * 0.21) % 1;
          puffs[s].position.set(
            0.68 + Math.sin(t * 1.7 + s + cIdx) * 0.09 + ph * 0.22,
            2.42 + ph * 0.92,
            -0.22 + Math.cos(t * 1.3 + s) * 0.05
          );
          puffs[s].scale.setScalar(0.6 + Math.sin(ph * Math.PI) * 0.72);
        }
      }
    }

    for (let bIdx = 0; bIdx < this.boatPool.length; bIdx++) {
      const bg = this.boatPool[bIdx];
      const anchor = this.boatAnchors[bIdx];
      if (isSurface && anchor) {
        bg.visible = true;
        const bob = Math.sin(t * 2.1 + bIdx * 1.7) * 0.045;
        bg.position.set(anchor.x, -0.02 + bob, anchor.z);
        bg.rotation.set(
          Math.sin(t * 1.8 + bIdx) * 0.06,
          anchor.yaw + Math.sin(t * 0.7 + bIdx) * 0.08,
          Math.cos(t * 2.2 + bIdx) * 0.08
        );
        const sail = bg.getObjectByName('boatSail');
        if (sail) {
          sail.rotation.y = 0.25 + Math.sin(t * 1.9 + bIdx) * 0.14;
        }
      } else {
        bg.visible = false;
      }
    }

    if (this.homeGroup) {
      if (isSurface && W.playerHomePortal) {
        const hx = W.playerHomePortal.x / T;
        const hz = W.playerHomePortal.y / T;
        const vis = Math.abs(hx - focusX) < 32 && Math.abs(hz - focusZ) < 32;
        this.homeGroup.visible = vis;
        if (vis) {
          const hgy = getTerrainHeight3D(hx, hz, 'surface', W.B, W.SB, W.iceMap);
          this.homeGroup.position.set(hx, hgy, hz);
          this.homeSmokePuffs.forEach((puff, idx) => {
            puff.visible = W.fireplaceLit;
            if (W.fireplaceLit) {
              const phase = (t * 0.45 + idx * 0.33) % 1;
              puff.position.set(0.68 + Math.sin(t * 2 + idx) * 0.09 + phase * 0.22, 2.4 + phase * 1.05, -0.22);
              puff.scale.setScalar(0.85 + Math.sin(phase * Math.PI) * 0.85);
            }
          });
        }
      } else {
        this.homeGroup.visible = false;
      }
    }

    if (this.glowPortalGroup) {
      const gp = W.glowdeepPortal;
      this.glowPortalGroup.visible = Boolean(isSurface && gp && Math.abs(gp.x / T - focusX) < 30 && Math.abs(gp.y / T - focusZ) < 30);
      if (this.glowPortalGroup.visible && gp) {
        const gy = getTerrainHeight3D(gp.x / T, gp.y / T, 'surface', W.B, W.SB, W.iceMap);
        this.glowPortalGroup.position.set(gp.x / T, gy, gp.y / T);
        const core = this.glowPortalGroup.getObjectByName('portalCore');
        if (core) core.visible = gp.open;
      }
    }
    if (this.moonPortalGroup) {
      const mp = W.moonGatePortal;
      this.moonPortalGroup.visible = Boolean(isSurface && mp && Math.abs(mp.x / T - focusX) < 30 && Math.abs(mp.y / T - focusZ) < 30);
      if (this.moonPortalGroup.visible && mp) {
        const gy = getTerrainHeight3D(mp.x / T, mp.y / T, 'surface', W.B, W.SB, W.iceMap);
        this.moonPortalGroup.position.set(mp.x / T, gy, mp.y / T);
        const core = this.moonPortalGroup.getObjectByName('portalCore');
        if (core) core.visible = mp.open;
      }
    }

    if (this.cauldronGroup) {
      this.cauldronGroup.visible = layer === 'glowdeep';
      if (this.cauldronGroup.visible) {
        this.cauldronBubbles.forEach((bub, idx) => {
          const ph = (t * 0.9 + idx * 0.25) % 1;
          bub.position.set(Math.cos(idx * 1.6 + t) * 0.24, 0.9 + ph * 0.65, Math.sin(idx * 1.6 + t) * 0.24);
          bub.scale.setScalar(Math.sin(ph * Math.PI) * 1.15);
        });
      }
    }
    if (this.glowReturnGroup) {
      this.glowReturnGroup.visible = layer === 'glowdeep';
      this.glowReturnGroup.position.set(GLOWDEEP_RETURN_TILE.x + 0.5, 0.16, GLOWDEEP_RETURN_TILE.y + 0.5);
    }
    if (this.teaHouseGroup) {
      this.teaHouseGroup.visible = layer === 'moonroad';
      if (this.teaHouseGroup.visible && this.teaCrescent) {
        this.teaCrescent.rotation.y = t * 1.2;
      }
    }
    if (this.moonReturnGroup) {
      this.moonReturnGroup.visible = layer === 'moonroad';
      this.moonReturnGroup.position.set(MOONROAD_RETURN_TILE.x + 0.5, 0.46, MOONROAD_RETURN_TILE.y + 0.5);
    }

    for (let i = 0; i < this.customLandmarks.length; i++) {
      const lm = this.customLandmarks[i];
      if (lm.layer !== layer) {
        lm.group.visible = false;
        continue;
      }
      const pos = this.resolvedLandmarkCoords[i];
      const lx = pos ? pos.tx : lm.tx;
      const lz = pos ? pos.tz : lm.tz;
      const vis = Math.abs(lx + 0.5 - focusX) < 42 && Math.abs(lz + 0.5 - focusZ) < 42;
      lm.group.visible = vis;
      if (vis) {
        const gy = getTerrainHeight3D(lx + 0.5, lz + 0.5, layer, W.B, W.SB, W.iceMap);
        lm.group.position.set(lx + 0.5, gy, lz + 0.5);
        lm.update?.(t);
      }
    }

    // 4. Update Dynamic Collectibles, Swimming Fish, Living Wildlife, Blooms, Rings, Ripples & Particles
    this.updateAnimatedCollectiblesAndFish(focusTileX, focusTileZ, layer, W, propRadius);
    this.updateAtmosphereAndWeather(layer, W, focusX, focusY, focusZ);
    this.updateAmbientWildlife(layer, W, focusX, focusZ);
    this.updateStepRipples(layer, W, dt, pGroundY);

    // 3D Spell Blooms (including Rain Roots rainbow hybrid flowers when bl.c >= 4)
    this.bloomBatch.count = 0;
    const blCols = [0xff7aa8, 0xffd23f, 0x9be8a8, 0xb48cff, 0x7de0ff, 0xff9f43];
    for (let i = 0; i < W.blooms.length && this.bloomBatch.count < this.bloomBatch.max; i++) {
      const bl = W.blooms[i];
      if (Boolean(bl.u) !== W.player.dive) continue;
      const bx = bl.x / T;
      const bz = bl.y / T;
      if (Math.abs(bx - focusX) > propRadius || Math.abs(bz - focusZ) > propRadius) continue;
      const isRainbow = bl.c >= 4;
      const age = Math.min(1, Math.max(0.15, (t - bl.b) * 3.5)) * (isRainbow ? 1.38 : 1.0);
      const bgy = getActorGroundY3D(bl.x, bl.y, layer, W.B, W.SB, W.iceMap, W.lilyMap);
      _v3.set(bx, bgy + 0.08 * age, bz);
      _euler.set(Math.PI, t * (isRainbow ? 1.8 : 0.7) + bl.x, 0);
      _q.setFromEuler(_euler);
      _scale.setScalar(age);
      _m4.compose(_v3, _q, _scale);
      this.bloomBatch.mesh.setMatrixAt(this.bloomBatch.count, _m4);
      if (isRainbow) {
        _col.setHSL(((t * 0.45 + bl.x * 0.05) % 1 + 1) % 1, 0.92, 0.64);
      } else {
        _col.setHex(blCols[bl.c % blCols.length]);
      }
      this.bloomBatch.mesh.setColorAt(this.bloomBatch.count, _col);
      this.bloomBatch.count++;
    }
    this.bloomBatch.mesh.count = this.bloomBatch.count;
    this.bloomBatch.mesh.instanceMatrix.needsUpdate = true;
    if (this.bloomBatch.mesh.instanceColor) this.bloomBatch.mesh.instanceColor.needsUpdate = true;

    // Expanding Magic Rings (supports negative t for staggered concentric waves)
    for (let i = 0; i < this.ringVfxPool.length; i++) {
      const mesh = this.ringVfxPool[i];
      const mr = W.magicRings[i];
      if (mr && mr.t >= 0) {
        mesh.visible = true;
        const prog = Math.max(0.02, Math.min(1, mr.t / mr.m));
        const easeOut = 1 - (1 - prog) * (1 - prog);
        const rgy = getActorGroundY3D(mr.x, mr.y, layer, W.B, W.SB, W.iceMap);
        mesh.position.set(mr.x / T, rgy + 0.14 + easeOut * 0.08, mr.y / T);
        mesh.scale.setScalar(Math.max(0.05, (mr.r / T) * easeOut));
        const rm = mesh.material as THREE.MeshBasicMaterial;
        rm.color.set(mr.c);
        rm.opacity = Math.max(0, 1 - prog);
      } else {
        mesh.visible = false;
      }
    }

    // 3D Particles (supports Magic Surge shapes, altitude, swirl, and smooth fade)
    this.particleVfxBatch.count = 0;
    for (let i = 0; i < W.particles.length && this.particleVfxBatch.count < this.particleVfxBatch.max; i++) {
      const pt = W.particles[i];
      const pgy = getActorGroundY3D(pt.x, pt.y, layer, W.B, W.SB, W.iceMap);
      const lifeFrac = pt.maxL ? Math.max(0, Math.min(1, pt.l / pt.maxL)) : Math.min(1, pt.l);
      const popIn = pt.maxL && lifeFrac > 0.88 ? (1 - lifeFrac) / 0.12 : 1;
      const altY = pt.z !== undefined ? pt.z / T : (1 - Math.min(1, pt.l)) * 0.65;
      _v3.set(pt.x / T, pgy + 0.34 + altY, pt.y / T);

      const age = pt.maxL ? pt.maxL - pt.l : 1 - Math.min(1, pt.l);
      const spinRate = pt.spin ?? 2.5;
      const baseScale = (pt.size ?? 1) * (0.35 + 0.8 * Math.min(1, lifeFrac * 1.35)) * (0.5 + 0.5 * popIn);

      if (pt.shape === 'spark') {
        const moveYaw = Math.atan2(pt.vx, pt.vy);
        const movePitch = -Math.atan2(pt.vz ?? 0, Math.max(12, Math.hypot(pt.vx, pt.vy)));
        _euler.set(movePitch, moveYaw, 0, 'YXZ');
        _q.setFromEuler(_euler);
        _scale.set(0.65 * baseScale, 0.65 * baseScale, 2.15 * baseScale);
      } else if (pt.shape === 'petal' || pt.shape === 'leaf') {
        _euler.set(Math.sin(age * 4 + i) * 0.55, age * spinRate, Math.cos(age * 3 + i) * 0.45);
        _q.setFromEuler(_euler);
        _scale.set(1.35 * baseScale, 0.28 * baseScale, 0.95 * baseScale);
      } else if (pt.shape === 'crystal') {
        _euler.set(0.18 * Math.sin(age * 3), age * spinRate, 0.18 * Math.cos(age * 3));
        _q.setFromEuler(_euler);
        _scale.set(0.75 * baseScale, 1.85 * baseScale, 0.75 * baseScale);
      } else if (pt.shape === 'heart' || pt.shape === 'note') {
        _euler.set(0, age * spinRate * 0.7, Math.sin(age * 5 + i) * 0.22);
        _q.setFromEuler(_euler);
        _scale.set(1.25 * baseScale, 1.2 * baseScale, 0.75 * baseScale);
      } else if (pt.shape === 'ring') {
        _euler.set(Math.PI * 0.12 * Math.sin(age * 4), age * spinRate, 0);
        _q.setFromEuler(_euler);
        _scale.set(1.6 * baseScale, 0.24 * baseScale, 1.6 * baseScale);
      } else {
        _euler.set(age * 1.5, age * spinRate * 0.6, 0);
        _q.setFromEuler(_euler);
        _scale.setScalar(1.08 * baseScale);
      }

      _m4.compose(_v3, _q, _scale);
      this.particleVfxBatch.mesh.setMatrixAt(this.particleVfxBatch.count, _m4);
      _col.set(pt.c);
      this.particleVfxBatch.mesh.setColorAt(this.particleVfxBatch.count, _col);
      this.particleVfxBatch.count++;
    }
    this.particleVfxBatch.mesh.count = this.particleVfxBatch.count;
    this.particleVfxBatch.mesh.instanceMatrix.needsUpdate = true;
    if (this.particleVfxBatch.mesh.instanceColor) this.particleVfxBatch.mesh.instanceColor.needsUpdate = true;

    // 5. Update Player, Companion, NPCs, Hollows & Dash Ghosts
    const pY = getActorGroundY3D(W.player.x, W.player.y, layer, W.B, W.SB, W.iceMap, W.lilyMap);
    const dLen = Math.hypot(W.player.dx, W.player.dy);
    const targetYaw = dLen > 0.01 ? Math.atan2(W.player.dx, W.player.dy) : this.playerSmoothYaw;
    if (!this.camInitialized) {
      this.playerSmoothYaw = targetYaw;
      this.playerHeadTurn = 0;
    } else {
      let yawDiff = ((targetYaw - this.playerSmoothYaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      if (Math.abs(yawDiff) < 0.001) yawDiff = 0;
      this.playerSmoothYaw += yawDiff * (1 - Math.exp(-18 * dt));
      this.playerHeadTurn = THREE.MathUtils.damp(
        this.playerHeadTurn,
        THREE.MathUtils.clamp(yawDiff * 0.35, -0.35, 0.35),
        14,
        dt
      );
    }
    const dreamOpacity = W.activeSpellTimers.dreamwalkTimer > 0 ? 0.68 + Math.sin(t * 7) * 0.12 : 1.0;

    const isFirstPerson = !W.isTitleMode && camPresetActive === 'first_person';
    const fishingActive = Boolean(W.fishing?.active && !W.isTitleMode && !isHouse);
    this.playerRig.root.visible = !isFirstPerson || fishingActive;
    this.fishingStageGroup.visible = fishingActive;

    if (W.isTitleMode && lanternTree) {
      // Showcase Hero Mochi beneath the Great Lantern Tree!
      const lx = lanternTree.x / T;
      const lz = lanternTree.y / T + 1.9;
      const ly = getTerrainHeight3D(lx, lz, 'surface', W.B, W.SB, W.iceMap);
      this.playerRig.root.position.set(lx, ly, lz);
      updateMochiRig(this.playerRig, {
        look: W.playerLook,
        time: t,
        isMoving: false,
        isBlinking: t % 3.5 < 0.12,
        facingYaw: Math.sin(t * 0.4) * 0.3,
        headYaw: Math.sin(t * 0.55) * 0.12,
        scale: 1.05,
        opacity: 1,
        dt,
        moveSpeed: 0,
      });
      this.companionRig.root.position.set(lx - 0.85, ly, lz + 0.2);
      updateCompanionRig(this.companionRig, W.companionId, t);
    } else if (fishingActive && W.fishing) {
      const fs = W.fishing;
      const ledgeGroundY = getTerrainHeight3D(fs.ledgeTx, fs.ledgeTz, layer, W.B, W.SB, W.iceMap, W.lilyMap);
      const waterSurfaceY = layer === 'glowdeep' ? -0.055 : Math.sin(t * 1.4) * 0.025;
      this.fishingLedgeGroup.position.set(fs.ledgeTx, ledgeGroundY, fs.ledgeTz);
      this.fishingLedgeGroup.rotation.y = fs.facingYaw;

      this.playerSmoothYaw = fs.facingYaw;
      this.playerRig.root.position.set(fs.ledgeTx, ledgeGroundY + 0.03, fs.ledgeTz);
      const fishEmote =
        fs.mode === 'celebrate' ? 'fish_celebrate' : fs.mode === 'reeling' ? 'fish_reel' : 'fish_idle';
      updateMochiRig(this.playerRig, {
        look: W.playerLook,
        time: t,
        isMoving: false,
        isBlinking: fs.mode === 'celebrate' ? false : t % 4 < 0.12,
        facingYaw: fs.facingYaw,
        headYaw: 0,
        scale: 0.92,
        opacity: dreamOpacity,
        dt,
        moveSpeed: 0,
        emoteAnim: fishEmote,
        fishingProgress: fs.reelProgress,
      });

      this.playerRig.root.updateWorldMatrix(true, true);
      if (this.playerRig.fishingRodTipMarker) {
        this.playerRig.fishingRodTipMarker.getWorldPosition(_v3);
      } else {
        _v3.set(
          fs.ledgeTx + Math.sin(fs.facingYaw) * 1.15,
          ledgeGroundY + 1.05,
          fs.ledgeTz + Math.cos(fs.facingYaw) * 1.15
        );
      }

      const pullFrac = fs.mode === 'reeling' ? fs.reelProgress * 0.44 : 0;
      const tugJitter = fs.mode === 'reeling' ? Math.sin(t * 14) * 0.11 : 0;
      const perpX = Math.cos(fs.facingYaw);
      const perpZ = -Math.sin(fs.facingYaw);
      const bobX = THREE.MathUtils.lerp(fs.waterTx, fs.ledgeTx, pullFrac) + perpX * tugJitter;
      const bobZ = THREE.MathUtils.lerp(fs.waterTz, fs.ledgeTz, pullFrac) + perpZ * tugJitter;
      const bobY =
        fs.mode === 'celebrate'
          ? Math.max(waterSurfaceY + 0.35, _v3.y - 0.58)
          : fs.mode === 'reeling'
          ? waterSurfaceY - 0.035 + Math.sin(t * 16) * 0.045
          : waterSurfaceY + Math.sin(t * 3.4) * 0.035;

      this.fishingBobberGroup.visible = fs.mode !== 'celebrate';
      this.fishingBobberGroup.position.set(bobX, bobY, bobZ);
      this.fishingBobberGroup.rotation.set(
        fs.mode === 'reeling' ? 0.38 : Math.sin(t * 2.8) * 0.12,
        fs.facingYaw,
        Math.cos(t * 3.1) * 0.1
      );

      // Update catenary fishing line between rod tip (_v3) and line target (_v3b)
      if (fs.mode === 'celebrate') {
        const celeb = fs.celebrateElapsed ?? 0.5;
        const arcLift = Math.sin(Math.min(1, celeb / 0.9) * Math.PI * 0.5);
        const fX = THREE.MathUtils.lerp(bobX, _v3.x, arcLift * 0.85);
        const fZ = THREE.MathUtils.lerp(bobZ, _v3.z, arcLift * 0.85);
        const fY = THREE.MathUtils.lerp(waterSurfaceY + 0.35, _v3.y - 0.38, arcLift) + Math.sin(t * 9) * 0.06;
        _v3b.set(fX, fY + 0.14, fZ);
        this.caughtFishGroup.visible = true;
        this.caughtFishGroup.position.set(fX, fY, fZ);
        this.caughtFishGroup.rotation.set(
          Math.sin(t * 10) * 0.22 - 0.25,
          fs.facingYaw + Math.PI * 0.5 + Math.sin(t * 5) * 0.35,
          Math.sin(t * 12) * 0.16
        );
        this.caughtFishTail.rotation.y = Math.sin(t * 22) * 0.42;
        this.caughtFishBodyMat.color.set(fs.caughtFishColor || '#ff9f43');
        for (let s = 0; s < this.caughtFishSparkles.length; s++) {
          const sp = this.caughtFishSparkles[s];
          const ang = t * 4.2 + (s / this.caughtFishSparkles.length) * Math.PI * 2;
          const rad = 0.34 + Math.sin(t * 6 + s) * 0.1;
          sp.position.set(Math.cos(ang) * rad, Math.sin(t * 5 + s * 1.4) * 0.22, Math.sin(ang) * rad);
          sp.rotation.set(t * 3, t * 4, s);
          sp.scale.setScalar(0.75 + Math.sin(t * 8 + s) * 0.35);
        }
      } else {
        this.caughtFishGroup.visible = false;
        _v3b.set(bobX, bobY + 0.16, bobZ);
      }

      const lineSag = fs.mode === 'idle' ? 0.16 : 0.025;
      for (let i = 0; i < 12; i++) {
        const u = i / 11;
        const idx3 = i * 3;
        this.fishingLinePositions[idx3] = THREE.MathUtils.lerp(_v3.x, _v3b.x, u);
        this.fishingLinePositions[idx3 + 1] =
          THREE.MathUtils.lerp(_v3.y, _v3b.y, u) - 4 * u * (1 - u) * lineSag;
        this.fishingLinePositions[idx3 + 2] = THREE.MathUtils.lerp(_v3.z, _v3b.z, u);
      }
      this.fishingLine.geometry.attributes.position.needsUpdate = true;

      // Water splash & concentric ripples around the bobber
      if (fs.mode === 'reeling') {
        if (t - this.lastFishingSplashTime > 0.16) {
          this.lastFishingSplashTime = t;
          this.spawnStepRipple(bobX, waterSurfaceY + 0.04, bobZ, 0.72, 0.62, 0xe8fbff);
        }
      } else if (fs.mode === 'idle') {
        if (t - this.lastFishingRippleTime > 1.15) {
          this.lastFishingRippleTime = t;
          this.spawnStepRipple(bobX, waterSurfaceY + 0.035, bobZ, 0.56, 1.05, 0xd8f8ff);
        }
      }

      // Cozy companion cheering next to the ledge!
      const compX = fs.ledgeTx - Math.cos(fs.facingYaw) * 0.95 - Math.sin(fs.facingYaw) * 0.35;
      const compZ = fs.ledgeTz + Math.sin(fs.facingYaw) * 0.95 - Math.cos(fs.facingYaw) * 0.35;
      const compY = getTerrainHeight3D(compX, compZ, layer, W.B, W.SB, W.iceMap, W.lilyMap);
      this.companionRig.root.position.set(compX, Math.max(ledgeGroundY - 0.1, compY), compZ);
      updateCompanionRig(this.companionRig, W.companionId, t, fs.facingYaw, fs.mode === 'celebrate');
    } else {
      this.playerRig.root.position.set(W.player.x / T, pY, W.player.y / T);
      if (!isFirstPerson) {
        const playerMoveSpeed =
          W.player.vx !== undefined || W.player.vy !== undefined
            ? Math.min(2.2, Math.hypot(W.player.vx || 0, W.player.vy || 0) / 185)
            : W.player.isMoving
            ? W.player.isSprinting
              ? 1.55
              : 1.0
            : 0;
        updateMochiRig(this.playerRig, {
          look: W.playerLook,
          time: t,
          isMoving: W.player.isMoving,
          isBlinking: t % 4 < 0.12,
          facingYaw: this.playerSmoothYaw,
          headYaw: this.playerHeadTurn,
          scale: 0.92,
          opacity: dreamOpacity,
          isSwimming: Boolean(W.player.swim),
          isSprinting: Boolean(W.player.isSprinting),
          jumpZ: (W.player.z || 0) / T,
          jumpVy: (W.player.vz || 0) / T,
          dt,
          moveSpeed: playerMoveSpeed,
          cloudWings: Boolean(W.player.sky) || (W.activeSpellTimers.thermalGlideTimer ?? 0) > 0,
          thermalWings: (W.activeSpellTimers.thermalGlideTimer ?? 0) > 0,
        });
      }

      if (!fishingActive) {
        const compTx = W.companionPos.x / T;
        const compTz = W.companionPos.y / T;
        const compY = getActorGroundY3D(W.companionPos.x, W.companionPos.y, layer, W.B, W.SB, W.iceMap, W.lilyMap);
        this.companionRig.root.position.set(compTx, compY, compTz);
        const cdx = this.hasLastComp ? compTx - this.lastCompX : 0;
        const cdz = this.hasLastComp ? compTz - this.lastCompZ : 0;
        const cDist = Math.hypot(cdx, cdz);
        const isCompMoving = cDist > 0.012;
        if (isCompMoving) {
          const targetCompYaw = Math.atan2(cdx, cdz);
          const diff = ((targetCompYaw - this.compSmoothYaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          this.compSmoothYaw += diff * Math.min(1, 12 * dt);
        } else if (dLen > 0.01) {
          const targetCompYaw = this.playerSmoothYaw;
          const diff = ((targetCompYaw - this.compSmoothYaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          this.compSmoothYaw += diff * Math.min(1, 5 * dt);
        }
        this.lastCompX = compTx;
        this.lastCompZ = compTz;
        this.hasLastComp = true;
        updateCompanionRig(this.companionRig, W.companionId, t, this.compSmoothYaw, isCompMoving);
      }
    }

    // Active Player Light in dark realms / subtle warm clarity underwater + luminous companion lantern boost
    this.playerLight.position.set(focusX, focusY + 1.4, focusZ);
    const hasLuminousComp =
      W.companionId === 'moth' || W.companionId === 'gloom' || W.companionId === 'frog';
    const compLightBonus = hasLuminousComp
      ? layer === 'glowdeep' || layer === 'moonroad'
        ? 0.65
        : 0.25
      : 0;
    this.playerLight.intensity =
      (layer === 'glowdeep' || layer === 'moonroad' ? 1.85 : layer === 'dive' ? 0.5 : 0.35) +
      compLightBonus;

    // Move target ring
    if (W.player.moveTarget && !W.isTitleMode) {
      const mt = W.player.moveTarget;
      const my = getActorGroundY3D(mt.x, mt.y, layer, W.B, W.SB, W.iceMap);
      this.moveMarkerGroup.visible = true;
      this.moveMarkerGroup.position.set(mt.x / T, Math.max(-0.02, my) + 0.04, mt.y / T);
      this.moveMarkerRing.scale.setScalar(1 + Math.sin(t * 7) * 0.16);
    } else {
      this.moveMarkerGroup.visible = false;
    }

    // Active Player Spell Ring, Orbiters, 3D Beacons, Magnet Tethers, Echo Compass, Dawn Pillar & Frost Glow Constellations
    const timers = W.activeSpellTimers;
    const pElevationY = pY + (W.player.z || 0) / T;
    const hasAuraSpell =
      !W.isTitleMode &&
      (timers.dawnTimer > 0 ||
        timers.warmthTimer > 0 ||
        timers.dreamwalkTimer > 0 ||
        timers.tideTimer > 0 ||
        timers.moonPullTimer > 0 ||
        timers.hugTimer > 0);
    this.spellAuraRing.visible = hasAuraSpell;
    this.spellAuraRing2.visible = hasAuraSpell;
    if (hasAuraSpell) {
      const px = W.player.x / T;
      const pz = W.player.y / T;
      this.spellAuraRing.position.set(px, Math.max(-0.02, pElevationY) + 0.08, pz);
      this.spellAuraRing2.position.set(px, Math.max(-0.02, pElevationY) + 0.14, pz);
      this.spellAuraRing.rotation.y = t * 1.4;
      this.spellAuraRing2.rotation.y = -t * 2.2;
      const rMat = this.spellAuraRing.material as THREE.MeshBasicMaterial;
      const rMat2 = this.spellAuraRing2.material as THREE.MeshBasicMaterial;
      if (timers.dawnTimer > 0) {
        rMat.color.setHex(0xffd75a);
        rMat2.color.setHex(0xff9f43);
        this.spellAuraRing.scale.setScalar(2.1 + Math.sin(t * 4) * 0.1);
        this.spellAuraRing2.scale.setScalar(1.45 + Math.cos(t * 5) * 0.08);
      } else if (timers.dreamwalkTimer > 0) {
        rMat.color.setHex(0xbe91ff);
        rMat2.color.setHex(0xe2d4ff);
        this.spellAuraRing.scale.setScalar(1.0 + Math.sin(t * 3.5) * 0.08);
        this.spellAuraRing2.scale.setScalar(0.85);
      } else if (timers.tideTimer > 0) {
        rMat.color.setHex(0x52d6c6);
        rMat2.color.setHex(0xb8f2ff);
        this.spellAuraRing.scale.setScalar(0.95 + Math.sin(t * 6) * 0.1);
        this.spellAuraRing2.scale.setScalar(0.72 + Math.cos(t * 6) * 0.08);
      } else if (timers.moonPullTimer > 0) {
        rMat.color.setHex(0xb48cff);
        rMat2.color.setHex(0xffd23f);
        const shrink = 1.25 - ((t * 0.9) % 0.85);
        this.spellAuraRing.scale.setScalar(shrink);
        this.spellAuraRing2.scale.setScalar(1.3 - shrink * 0.4);
      } else if (timers.hugTimer > 0) {
        rMat.color.setHex(0xff7aa8);
        rMat2.color.setHex(0xffd6e6);
        this.spellAuraRing.scale.setScalar(0.95 + Math.sin(t * 4) * 0.06);
        this.spellAuraRing2.scale.setScalar(0.75);
      } else {
        rMat.color.setHex(0xff8c42);
        rMat2.color.setHex(0xffd23f);
        this.spellAuraRing.scale.setScalar(1.22 + Math.sin(t * 7) * 0.09);
        this.spellAuraRing2.scale.setScalar(0.9);
      }
    }

    // Dawn Break Rising Solar Pillar & Corona
    this.dawnSunGroup.visible = !W.isTitleMode && timers.dawnTimer > 0;
    if (this.dawnSunGroup.visible) {
      this.dawnSunGroup.position.set(W.player.x / T, Math.max(-0.02, pElevationY), W.player.y / T);
      this.dawnSunGroup.rotation.y = t * 0.8;
      this.dawnPillarMat.opacity = 0.16 + Math.sin(t * 3.5) * 0.05;
      this.dawnCoronaMat.opacity = 0.44 + Math.cos(t * 4) * 0.12;
    }

    const fbVar = getSeasonalSpellVariant('frost_bridge', W.season);
    const ssVar = getSeasonalSpellVariant('star_sense', W.season);
    const pxW = W.player.x / T;
    const pzW = W.player.y / T;
    for (let k = 0; k < 3; k++) {
      // Sculpted Spinning Ice Shield Blades (Frost Bridge)
      const fm = this.frostOrbiters[k];
      fm.visible = !W.isTitleMode && timers.frostShieldTimer > 0;
      if (fm.visible) {
        const ang = t * 2.9 + (k * Math.PI * 2) / 3;
        fm.position.set(pxW + Math.cos(ang) * 0.88, pElevationY + 0.48 + Math.sin(t * 4 + k) * 0.06, pzW + Math.sin(ang) * 0.88);
        fm.rotation.set(0.25, -ang, t * 2.2);
        if (fbVar?.orbiterColor) {
          const bladeMat = (fm.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
          bladeMat.color.set(fbVar.orbiterColor);
          bladeMat.emissive.set(fbVar.orbiterAccent || fbVar.orbiterColor);
        }
      }

      // Sculpted 5-Point Crown Stars hovering as a royal crown (Star Sense)
      const sm = this.starOrbiters[k];
      sm.visible = !W.isTitleMode && timers.starSenseTimer > 0;
      if (sm.visible) {
        const ang = t * 2.2 + (k * Math.PI * 2) / 3;
        sm.position.set(pxW + Math.cos(ang) * 0.62, pElevationY + 1.18 + Math.sin(t * 5 + k) * 0.06, pzW + Math.sin(ang) * 0.62);
        sm.rotation.set(0.32, ang * 2.4, Math.sin(t * 3 + k) * 0.25);
        if (ssVar?.orbiterColor) {
          const starMat = sm.material as THREE.MeshStandardMaterial;
          starMat.color.set(ssVar.orbiterColor);
          starMat.emissive.set(ssVar.orbiterAccent || ssVar.orbiterColor);
        }
      }

      // Sculpted 3D Hearts (Hush Hug)
      const hm = this.hugOrbiters[k];
      hm.visible = !W.isTitleMode && timers.hugTimer > 0;
      if (hm.visible) {
        const ang = -t * 2.4 + (k * Math.PI * 2) / 3;
        const beat = 1 + Math.sin(t * 6 + k) * 0.14;
        hm.position.set(pxW + Math.cos(ang) * 0.92, pElevationY + 0.68 + Math.sin(t * 4 + k) * 0.1, pzW + Math.sin(ang) * 0.92);
        hm.rotation.y = ang + Math.PI / 2;
        hm.scale.setScalar(beat);
      }

      // Orbiting Ember Flames (Ember Warmth)
      const em = this.flameOrbiters[k];
      em.visible = !W.isTitleMode && timers.warmthTimer > 0;
      if (em.visible) {
        const ang = t * 3.6 + (k * Math.PI * 2) / 3;
        em.position.set(pxW + Math.cos(ang) * 0.78, pElevationY + 0.42 + Math.abs(Math.sin(t * 7 + k)) * 0.22, pzW + Math.sin(ang) * 0.78);
        em.rotation.z = Math.sin(t * 10 + k) * 0.22;
        em.scale.setScalar(0.9 + Math.sin(t * 12 + k) * 0.25);
      }
    }

    // 3D Star Sense + Echo Call Light Beacons on nearest treasures & Echoes/Diary Pages
    let beaconUsed = 0;
    const showStarBeacons = !W.isTitleMode && timers.starSenseTimer > 0;
    const showEchoBeacons = !W.isTitleMode && ((timers.echoTimer ?? 0) > 0 || timers.starSenseTimer > 0);
    if (showStarBeacons) {
      const collectPool =
        layer === 'sky'
          ? W.feathers
          : layer === 'dive'
          ? W.pearls
          : layer === 'glowdeep'
          ? W.glowSpores
          : layer === 'moonroad'
          ? W.moonNotes
          : W.stars;
      for (let pass = 0; pass < 6 && beaconUsed < 6; pass++) {
        let bestIdx = -1;
        let bestD2 = 1e9;
        for (let i = 0; i < collectPool.length; i++) {
          const item = collectPool[i];
          if (item.got) continue;
          const dx = item.x - W.player.x;
          const dy = item.y - W.player.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < bestD2 && d2 > 400) {
            // Skip items already claimed in earlier pass
            let dup = false;
            for (let p = 0; p < beaconUsed; p++) {
              const bg = this.treasureBeaconsPool[p].group;
              if (Math.hypot(bg.position.x * T - item.x, bg.position.z * T - item.y) < 4) {
                dup = true;
                break;
              }
            }
            if (!dup) {
              bestD2 = d2;
              bestIdx = i;
            }
          }
        }
        if (bestIdx >= 0 && bestD2 < 780 * 780) {
          const item = collectPool[bestIdx];
          const b = this.treasureBeaconsPool[beaconUsed++];
          const by = getActorGroundY3D(item.x, item.y, layer, W.B, W.SB, W.iceMap, W.lilyMap);
          b.group.visible = true;
          b.group.position.set(item.x / T, by, item.y / T);
          const s = 0.85 + Math.sin(t * 5 + beaconUsed) * 0.16;
          b.group.scale.set(s, 1, s);
          b.beamMat.color.setHex(0xffd23f);
          b.beamMat.opacity = 0.34;
          b.haloMat.color.setHex(0xfff5b8);
        } else {
          break;
        }
      }
    }
    if (showEchoBeacons && W.echoTargets3D && W.echoTargets3D.length > 0) {
      for (let i = 0; i < W.echoTargets3D.length && beaconUsed < this.treasureBeaconsPool.length; i++) {
        const et = W.echoTargets3D[i];
        const b = this.treasureBeaconsPool[beaconUsed++];
        const by = getActorGroundY3D(et.x, et.y, layer, W.B, W.SB, W.iceMap, W.lilyMap);
        b.group.visible = true;
        b.group.position.set(et.x / T, by, et.y / T);
        const s = 1.0 + Math.sin(t * 6 + i) * 0.18;
        b.group.scale.set(s, 1.35, s);
        b.beamMat.color.setHex(et.kind === 'echo' ? 0x7de0ff : 0xff8fb8);
        b.beamMat.opacity = 0.44;
        b.haloMat.color.setHex(et.kind === 'echo' ? 0xc2f0ff : 0xffd2e6);
      }
    }
    for (let i = beaconUsed; i < this.treasureBeaconsPool.length; i++) {
      this.treasureBeaconsPool[i].group.visible = false;
    }

    // 3D Echo Call Directional Sonar Compass Prism pointing to nearest unfound Echo/Diary Page
    const hasEchoSonar = !W.isTitleMode && (timers.echoTimer ?? 0) > 0 && Boolean(W.echoTargets3D && W.echoTargets3D.length > 0);
    this.echoCompassGroup.visible = hasEchoSonar;
    if (hasEchoSonar && W.echoTargets3D && W.echoTargets3D.length > 0) {
      let nearestEcho = W.echoTargets3D[0];
      let minEchoD2 = (nearestEcho.x - W.player.x) ** 2 + (nearestEcho.y - W.player.y) ** 2;
      for (let i = 1; i < W.echoTargets3D.length; i++) {
        const et = W.echoTargets3D[i];
        const d2 = (et.x - W.player.x) ** 2 + (et.y - W.player.y) ** 2;
        if (d2 < minEchoD2) {
          minEchoD2 = d2;
          nearestEcho = et;
        }
      }
      const ang = Math.atan2(nearestEcho.x - W.player.x, nearestEcho.y - W.player.y);
      this.echoCompassGroup.position.set(
        pxW + Math.sin(ang) * 1.45,
        pElevationY + 0.72 + Math.sin(t * 4.5) * 0.08,
        pzW + Math.cos(ang) * 1.45
      );
      this.echoCompassGroup.rotation.set(0, ang, 0);
      this.echoCompassMat.color.setHex(nearestEcho.kind === 'echo' ? 0x7de0ff : 0xff9ebb);
    }

    // 3D Magnetic Tether Beams (Moon Pull / Dawn Break / Echo Magnet)
    let magUsed = 0;
    const showTethers = !W.isTitleMode && (timers.moonPullTimer > 0 || timers.dawnTimer > 0 || (timers.echoMagnetTimer ?? 0) > 0);
    if (showTethers) {
      const magRange = (timers.echoMagnetTimer ?? 0) > 0 ? 780 : timers.moonPullTimer > 0 ? 540 : 190;
      const magRange2 = magRange * magRange;
      const pullPool =
        layer === 'sky'
          ? W.feathers
          : layer === 'dive'
          ? W.pearls
          : layer === 'glowdeep'
          ? W.glowSpores
          : layer === 'moonroad'
          ? W.moonNotes
          : W.stars;
      const beamColor = timers.moonPullTimer > 0 || (timers.echoMagnetTimer ?? 0) > 0 ? 0xc29eff : 0xffd23f;
      for (let i = 0; i < pullPool.length && magUsed < this.magnetBeamsPool.length; i++) {
        const it = pullPool[i];
        if (it.got) continue;
        const dx = it.x - W.player.x;
        const dy = it.y - W.player.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < magRange2 && d2 > 64) {
          const itY = getActorGroundY3D(it.x, it.y, layer, W.B, W.SB, W.iceMap, W.lilyMap) + 0.45;
          _v3.set(pxW, pElevationY + 0.48, pzW);
          _v3b.set(it.x / T, itY, it.y / T);
          _v3Dir.subVectors(_v3b, _v3);
          const dist = _v3Dir.length();
          if (dist > 0.05) {
            _v3Dir.multiplyScalar(1 / dist);
            const mb = this.magnetBeamsPool[magUsed++];
            mb.mesh.visible = true;
            mb.mesh.position.copy(_v3).addScaledVector(_v3Dir, dist * 0.5);
            mb.mesh.quaternion.setFromUnitVectors(_v3Up, _v3Dir);
            mb.mesh.scale.set(1, dist, 1);
            mb.mat.color.setHex(beamColor);
            mb.mat.opacity = 0.55 + Math.sin(t * 10 + i) * 0.25;
          }
        }
      }
    }
    for (let i = magUsed; i < this.magnetBeamsPool.length; i++) {
      this.magnetBeamsPool[i].mesh.visible = false;
    }

    // 3D Frost Glow Constellations across frozen ice bridges
    const showFrostGlow = !W.isTitleMode && isSurface && (timers.frostGlowTimer ?? 0) > 0 && W.iceMap.size > 0;
    this.constellationRunesMesh.visible = showFrostGlow;
    if (showFrostGlow) {
      let runeCount = 0;
      W.iceMap.forEach((_exp, idx) => {
        if (runeCount >= 140) return;
        const ix = idx % N;
        const iz = (idx / N) | 0;
        if (Math.abs(ix - focusX) > propRadius || Math.abs(iz - focusZ) > propRadius) return;
        _v3.set(ix + 0.5, 0.18 + Math.sin(t * 4 + ix + iz) * 0.03, iz + 0.5);
        _euler.set(0, t * 1.4 + ix * 0.5, 0);
        _q.setFromEuler(_euler);
        const s = 0.8 + Math.sin(t * 5 + ix * 1.3 + iz) * 0.3;
        _scale.setScalar(s);
        _m4.compose(_v3, _q, _scale);
        this.constellationRunesMesh.setMatrixAt(runeCount++, _m4);
      });
      this.constellationRunesMesh.count = runeCount;
      this.constellationRunesMesh.instanceMatrix.needsUpdate = true;
    }

    // 3D Hot Spring Harmony Steaming Thermal Pool
    const activeSpring = !W.isTitleMode && isSurface && W.hotSprings && W.hotSprings.length > 0 ? W.hotSprings[W.hotSprings.length - 1] : null;
    this.hotSpringPoolGroup.visible = Boolean(activeSpring);
    if (activeSpring) {
      const hx = activeSpring.x / T;
      const hz = activeSpring.y / T;
      const hgy = getActorGroundY3D(activeSpring.x, activeSpring.y, 'surface', W.B, W.SB, W.iceMap, W.lilyMap);
      this.hotSpringPoolGroup.position.set(hx, Math.max(0.02, hgy), hz);
      this.hotSpringMat.opacity = 0.62 + Math.sin(t * 3.2) * 0.14;
      for (let i = 0; i < this.hotSpringSteam.length; i++) {
        const ph = (t * 0.75 + i * 0.167) % 1;
        const ang = (i / this.hotSpringSteam.length) * Math.PI * 2 + t * 0.6;
        const rad = 0.45 + Math.sin(t * 2 + i) * 0.35;
        this.hotSpringSteam[i].position.set(Math.cos(ang) * rad, 0.2 + ph * 1.35, Math.sin(ang) * rad);
        this.hotSpringSteam[i].scale.setScalar(Math.max(0.15, Math.sin(ph * Math.PI) * 1.15));
      }
    }

    // Visible NPCs (using pooled look objects for zero-GC, smooth heading & expressive weather/greeting poses)
    const curLayer = getPlayerLayer(W.player);
    let npcIdx = 0;
    if (!isHouse) {
      for (let i = 0; i < W.npcs.length && npcIdx < this.npcRigs.length; i++) {
        const n = W.npcs[i];
        if (n.tree) continue;
        if (getNpcLayer(n) !== curLayer) continue;

      const nx = n.x / T;
      const nz = n.y / T;
      if (Math.abs(nx - focusX) > propRadius || Math.abs(nz - focusZ) > propRadius) continue;

      const look = this.npcLookPool[npcIdx];
      look.sp = n.sp;
      look.col = n.col;
      look.hat = n.hat;
      look.name = n.n;

      const rig = this.npcRigs[npcIdx++];
      rig.root.visible = true;
      const ny = getActorGroundY3D(n.x, n.y, layer, W.B, W.SB, W.iceMap);
      rig.root.position.set(nx, ny, nz);

      const toPlayerDx = W.player.x - n.x;
      const toPlayerDy = W.player.y - n.y;
      const distToPlayer = Math.hypot(toPlayerDx, toPlayerDy);
      const isNearPlayer = !W.isTitleMode && distToPlayer < 135;
      const moveDx = n.tx - n.x;
      const moveDy = n.ty - n.y;
      const isNpcMoving = n.mv === 1 && Math.hypot(moveDx, moveDy) > 3;

      let targetNpcYaw = Math.sin(t * 0.42 + n.ph) * 0.65;
      if (isNpcMoving) {
        targetNpcYaw = Math.atan2(moveDx, moveDy);
      } else if (isNearPlayer) {
        targetNpcYaw = Math.atan2(toPlayerDx, toPlayerDy);
      }

      const prevYaw = this.npcSmoothYawMap.get(n) ?? targetNpcYaw;
      const yawDiff = ((targetNpcYaw - prevYaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      const smoothNpcYaw = prevYaw + yawDiff * Math.min(1, 9 * dt);
      this.npcSmoothYawMap.set(n, smoothNpcYaw);

      const headGlance = isNearPlayer && isNpcMoving ? THREE.MathUtils.clamp(((Math.atan2(toPlayerDx, toPlayerDy) - smoothNpcYaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -0.55, 0.55) : 0;

      updateMochiRig(rig, {
        look,
        time: t,
        isMoving: isNpcMoving,
        isBlinking: (t + n.ph) % 4 < 0.12,
        facingYaw: smoothNpcYaw,
        headYaw: headGlance,
        scale: 0.9,
        highlighted: W.nearestNpc === n && !W.isTitleMode,
        isGreeting: isNearPlayer && !isNpcMoving,
        bobOffset: n.ph,
        dt,
        weatherBehavior: n.weatherBehavior ?? 'idle',
      });
      }
    }
    for (let i = npcIdx; i < this.npcRigs.length; i++) {
      this.npcRigs[i].root.visible = false;
    }

    // Visible Hollow Creatures (strictly matched to current layer, pooled look objects for zero-GC)
    let hIdx = 0;
    if (!isHouse) {
      for (let i = 0; i < W.hollows.length && hIdx < this.hollowRigs.length; i++) {
        const h = W.hollows[i];
        if ((h.w ?? 0) !== curLayer) continue;
        const hx = h.x / T;
        const hz = h.y / T;
        if (Math.abs(hx - focusX) > propRadius || Math.abs(hz - focusZ) > propRadius) continue;
        const hLook = this.hollowLookPool[hIdx];
        hLook.sp = (h.species as any) || 'cat';
        hLook.col = h.soothed ? h.color || '#ffb3c7' : '#8a94a6';
        hLook.c2 = h.soothed ? '#ffd23f' : '#4b5563';
        hLook.ac = h.soothed ? '#ff7aa8' : '#6b7280';
        hLook.hat = h.soothed ? 'flower' : 'none';
        hLook.aura = h.soothed ? 1 : 0;
        hLook.name = h.name;
        hLook.isHollow = !h.soothed;
        hLook.hollowBloom = h.bloomT;

        const rig = this.hollowRigs[hIdx++];
        rig.root.visible = true;
        const swayX = h.soothed ? 0 : Math.sin(t * 0.9 + i * 1.7) * 0.1;
        const swayZ = h.soothed ? 0 : Math.cos(t * 0.7 + i * 1.1) * 0.08;
        const hy = getActorGroundY3D(h.x, h.y, layer, W.B, W.SB, W.iceMap);
        rig.root.position.set(hx + swayX, hy, hz + swayZ);
        updateMochiRig(rig, {
          look: hLook,
          time: t,
          isMoving: false,
          isBlinking: false,
          facingYaw: 0.25,
          scale: 0.88,
          bobOffset: i * 1.3,
        });
      }
    }
    for (let i = hIdx; i < this.hollowRigs.length; i++) {
      this.hollowRigs[i].root.visible = false;
    }

    // Dash Ghost Afterimages
    let gIdx = 0;
    for (let i = 0; i < W.dashGhosts.length && gIdx < this.ghostRigs.length; i++) {
      const gh = W.dashGhosts[i];
      const gx = gh.x / T;
      const gz = gh.y / T;
      if (isFirstPerson && Math.hypot(gx - focusX, gz - focusZ) < 1.25) continue;
      const rig = this.ghostRigs[gIdx++];
      rig.root.visible = true;
      const gy = getActorGroundY3D(gh.x, gh.y, layer, W.B, W.SB, W.iceMap);
      rig.root.position.set(gx, gy, gz);
      updateMochiRig(rig, {
        look: W.playerLook,
        time: t,
        isMoving: true,
        isBlinking: false,
        facingYaw: this.playerSmoothYaw,
        scale: 0.9,
        opacity: Math.max(0.05, gh.alpha * 0.7),
      });
    }
    for (let i = gIdx; i < this.ghostRigs.length; i++) {
      this.ghostRigs[i].root.visible = false;
    }

    // 6. Camera Smooth Follow (Diorama 3/4, 1st Person, 3rd Person Forward & Backward)
    const zMul = THREE.MathUtils.clamp(W.cameraZoom || 1, 0.65, 1.55);
    const yaw = W.isTitleMode ? Math.sin(t * 0.14) * 0.45 : W.cameraYaw;
    const pitch = W.isTitleMode ? 0 : THREE.MathUtils.clamp(W.cameraPitch ?? 0, -0.58, 0.65);
    const jumpZWorld = (W.player.z || 0) / T;
    const playerFeetY = pY + jumpZWorld;

    let desiredTargetX = focusX;
    let desiredTargetY = focusY + 0.55;
    let desiredTargetZ = focusZ;
    let desiredCamX = focusX;
    let desiredCamY = focusY + 12.8;
    let desiredCamZ = focusZ + 14.5;
    let targetFov = 40;
    let targetNear = 0.5;
    let dampPosLambda = 11;
    let dampTargetLambda = 11;

    const isPlayerMoving = W.player.isMoving || Boolean(W.player.moveTarget);
    if (fishingActive && W.fishing) {
      const fs = W.fishing;
      const ledgeGroundY = getTerrainHeight3D(fs.ledgeTx, fs.ledgeTz, layer, W.B, W.SB, W.iceMap, W.lilyMap);
      const isCeleb = fs.mode === 'celebrate';
      const camDist = isCeleb ? 3.9 : 4.65;
      const sideYaw = fs.facingYaw + 1.15;
      desiredTargetX = THREE.MathUtils.lerp(fs.ledgeTx, fs.waterTx, isCeleb ? 0.24 : 0.38);
      desiredTargetZ = THREE.MathUtils.lerp(fs.ledgeTz, fs.waterTz, isCeleb ? 0.24 : 0.38);
      desiredTargetY = Math.max(0, ledgeGroundY) + (isCeleb ? 0.56 : 0.36);
      desiredCamX = desiredTargetX + Math.sin(sideYaw) * camDist;
      desiredCamZ = desiredTargetZ + Math.cos(sideYaw) * camDist;
      desiredCamY = Math.max(0.25, ledgeGroundY) + (isCeleb ? 2.05 : 2.38);
      targetFov = 44;
      targetNear = 0.2;
      dampPosLambda = 7.5;
      dampTargetLambda = 8.5;
    } else if (camPresetActive === 'first_person') {
      const headBob = isPlayerMoving ? Math.sin(t * 9.5) * 0.028 : Math.sin(t * 2.4) * 0.008;
      const eyeHeight = (W.player.swim && jumpZWorld < 0.08 ? 0.54 : 0.88) + headBob;
      const cosP = Math.cos(pitch);
      const lookX = -Math.sin(yaw) * cosP;
      const lookY = Math.sin(pitch);
      const lookZ = -Math.cos(yaw) * cosP;

      desiredCamX = focusX - Math.sin(yaw) * 0.12;
      desiredCamY = playerFeetY + eyeHeight;
      desiredCamZ = focusZ - Math.cos(yaw) * 0.12;
      desiredTargetX = desiredCamX + lookX * 9;
      desiredTargetY = desiredCamY + lookY * 9;
      desiredTargetZ = desiredCamZ + lookZ * 9;
      targetFov = 62;
      targetNear = 0.12;
      dampPosLambda = 24;
      dampTargetLambda = 30;
    } else if (camPresetActive === 'third_forward') {
      const dist = 5.4 * zMul;
      const elev = THREE.MathUtils.clamp(0.28 + pitch * 0.85, 0.08, 0.92);
      const horizDist = Math.cos(elev) * dist;
      const height = Math.sin(elev) * dist + 0.85;

      desiredCamX = focusX + Math.sin(yaw) * horizDist;
      desiredCamY = playerFeetY + height;
      desiredCamZ = focusZ + Math.cos(yaw) * horizDist;
      desiredTargetX = focusX - Math.sin(yaw) * 1.6;
      desiredTargetY = playerFeetY + 0.95 + Math.sin(pitch) * 1.3;
      desiredTargetZ = focusZ - Math.cos(yaw) * 1.6;
      targetFov = 50;
      targetNear = 0.25;
      dampPosLambda = 13;
      dampTargetLambda = 15;
    } else if (camPresetActive === 'third_backward') {
      const camYaw = yaw + Math.PI;
      const dist = 5.4 * zMul;
      const elev = THREE.MathUtils.clamp(0.26 + pitch * 0.85, 0.08, 0.92);
      const horizDist = Math.cos(elev) * dist;
      const height = Math.sin(elev) * dist + 0.82;

      desiredCamX = focusX + Math.sin(camYaw) * horizDist;
      desiredCamY = playerFeetY + height;
      desiredCamZ = focusZ + Math.cos(camYaw) * horizDist;
      desiredTargetX = focusX - Math.sin(camYaw) * 1.3;
      desiredTargetY = playerFeetY + 0.9 + Math.sin(pitch) * 1.2;
      desiredTargetZ = focusZ - Math.cos(camYaw) * 1.3;
      targetFov = 50;
      targetNear = 0.25;
      dampPosLambda = 13;
      dampTargetLambda = 15;
    } else {
      const dioramaCfg: Record<'cozy' | 'close' | 'vista', { dist: number; height: number; lookAheadY: number }> = isHouse
        ? {
            cozy: { dist: 9.8, height: 8.6, lookAheadY: 0.65 },
            close: { dist: 7.4, height: 5.8, lookAheadY: 0.72 },
            vista: { dist: 15.8, height: 14.5, lookAheadY: 0.45 },
          }
        : {
            cozy: { dist: 14.5, height: 12.8, lookAheadY: 0.55 },
            close: { dist: 9.8, height: 7.4, lookAheadY: 0.7 },
            vista: { dist: 21.0, height: 18.2, lookAheadY: 0.4 },
          };
      const cfg = dioramaCfg[camPresetActive] || dioramaCfg.cozy;
      const dist = cfg.dist * zMul;
      const height = Math.max(2.6, cfg.height * zMul * (1 + pitch * 0.45));
      desiredTargetX = focusX;
      desiredTargetY = focusY + cfg.lookAheadY;
      desiredTargetZ = focusZ;
      desiredCamX = desiredTargetX + Math.sin(yaw) * dist;
      desiredCamY = desiredTargetY + height;
      desiredCamZ = desiredTargetZ + Math.cos(yaw) * dist;
    }

    // Prevent 3rd-person / orbit cameras from ever clipping below hills, cliffs, or cavern walls
    if (camPresetActive !== 'first_person' && !isHouse) {
      const camGroundY = getTerrainHeight3D(desiredCamX, desiredCamZ, layer, W.B, W.SB, W.iceMap);
      desiredCamY = Math.max(desiredCamY, camGroundY + 0.75);
    }

    const nextFov = THREE.MathUtils.damp(this.activeCamFov, targetFov, 11, dt);
    if (Math.abs(nextFov - this.activeCamFov) > 0.04 || Math.abs(targetNear - this.activeCamNear) > 0.01) {
      this.activeCamFov = Math.abs(nextFov - targetFov) < 0.05 ? targetFov : nextFov;
      this.activeCamNear = targetNear;
      this.camera.fov = this.activeCamFov;
      this.camera.near = this.activeCamNear;
      this.camera.updateProjectionMatrix();
    }

    if (
      !Number.isFinite(desiredTargetX) ||
      !Number.isFinite(desiredTargetY) ||
      !Number.isFinite(desiredTargetZ) ||
      !Number.isFinite(desiredCamX) ||
      !Number.isFinite(desiredCamY) ||
      !Number.isFinite(desiredCamZ)
    ) {
      return;
    }

    if (!this.camInitialized || this.currentLayer !== layer) {
      this.currentLayer = layer;
      this.camInitialized = true;
      this.camTarget.set(desiredTargetX, desiredTargetY, desiredTargetZ);
      this.camPos.set(desiredCamX, desiredCamY, desiredCamZ);
    } else {
      this.camTarget.x = THREE.MathUtils.damp(this.camTarget.x, desiredTargetX, dampTargetLambda, dt);
      this.camTarget.y = THREE.MathUtils.damp(this.camTarget.y, desiredTargetY, dampTargetLambda, dt);
      this.camTarget.z = THREE.MathUtils.damp(this.camTarget.z, desiredTargetZ, dampTargetLambda, dt);
      this.camPos.x = THREE.MathUtils.damp(this.camPos.x, desiredCamX, dampPosLambda, dt);
      this.camPos.y = THREE.MathUtils.damp(this.camPos.y, desiredCamY, dampPosLambda, dt);
      this.camPos.z = THREE.MathUtils.damp(this.camPos.z, desiredCamZ, dampPosLambda, dt);
    }

    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);
    if (W.cameraShake && (W.cameraShake.x !== 0 || W.cameraShake.y !== 0)) {
      const sx = (W.cameraShake.x / T) * 0.72;
      const sy = (W.cameraShake.y / T) * 0.56;
      _v3.set(1, 0, 0).applyQuaternion(this.camera.quaternion).multiplyScalar(sx);
      _v3b.set(0, 1, 0).applyQuaternion(this.camera.quaternion).multiplyScalar(sy);
      this.camera.position.add(_v3).add(_v3b);
      _v3Dir.copy(this.camTarget).add(_v3).add(_v3b);
      this.camera.lookAt(_v3Dir);
    }
    if (this.composer && !this.isSoftwareGl) {
      if (this.dofPass) {
        const useDof = !W.lowQuality;
        this.dofPass.enabled = useDof;
        if (useDof) {
          const focusDist = this.camPos.distanceTo(this.camTarget);
          let focusBand = 11.5;
          let farSpan = 28.0;
          let nearSafe = 4.5;
          let blurStrength = 0.68;
          let tiltShiftStrength = 0.65;
          let maxMix = 0.68;
          let blurRadius = this.isMobileMode ? 1.05 : 1.25;

          if (fishingActive) {
            focusBand = 5.5;
            farSpan = 16.0;
            nearSafe = 2.6;
            blurStrength = 0.56;
            tiltShiftStrength = 0.18;
            maxMix = 0.54;
            blurRadius = 1.0;
          } else if (isHouse) {
            focusBand = 5.5;
            farSpan = 12.0;
            nearSafe = 2.8;
            blurStrength = 0.34;
            tiltShiftStrength = 0.25;
            maxMix = 0.42;
            blurRadius = 0.9;
          } else if (camPresetActive === 'vista') {
            focusBand = 14.0;
            farSpan = 34.0;
            nearSafe = 5.5;
            blurStrength = 0.74;
            tiltShiftStrength = 0.78;
            maxMix = 0.74;
          } else if (camPresetActive === 'close') {
            focusBand = 8.5;
            farSpan = 20.0;
            nearSafe = 3.2;
            blurStrength = 0.62;
            tiltShiftStrength = 0.52;
            maxMix = 0.62;
          } else if (camPresetActive === 'third_forward' || camPresetActive === 'third_backward') {
            focusBand = 16.0;
            farSpan = 38.0;
            nearSafe = 3.0;
            blurStrength = 0.56;
            tiltShiftStrength = 0.28;
            maxMix = 0.58;
          } else if (camPresetActive === 'first_person') {
            focusBand = 22.0;
            farSpan = 48.0;
            nearSafe = 2.5;
            blurStrength = 0.42;
            tiltShiftStrength = 0.0;
            maxMix = 0.45;
          }

          this.dofPass.updateParams({
            camNear: this.camera.near,
            camFar: this.camera.far,
            focusDist,
            focusBand,
            farSpan,
            nearSafe,
            blurStrength,
            tiltShiftStrength,
            maxMix,
            blurRadius,
          });
        }
      }
      this.composer.render(safeDt);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  public projectWorldToScreen(
    x2d: number,
    y2d: number,
    heightUnits: number,
    viewportW: number,
    viewportH: number,
    B: Uint8Array,
    SB: Uint8Array,
    iceMap: Map<number, number>,
    layer: WorldLayer3D,
    out: { x: number; y: number; visible: boolean }
  ): void {
    const gy = getActorGroundY3D(x2d, y2d, layer, B, SB, iceMap);
    _v3.set(x2d / T, gy + heightUnits, y2d / T);
    _v3.project(this.camera);
    out.visible = _v3.z < 1 && _v3.z > -1;
    out.x = (_v3.x * 0.5 + 0.5) * viewportW;
    out.y = (-_v3.y * 0.5 + 0.5) * viewportH;
  }

  public raycastGroundPoint(
    clientX: number,
    clientY: number,
    rect: DOMRect,
    planeY: number,
    out: { x: number; y: number }
  ): boolean {
    if (rect.width <= 0 || rect.height <= 0) return false;
    _ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    _raycaster.setFromCamera(_ndc, this.camera);
    _groundPlane.constant = -planeY;
    const hit = _raycaster.ray.intersectPlane(_groundPlane, _v3b);
    if (!hit) return false;
    out.x = Math.max(T * 1.5, Math.min((N - 1.5) * T, hit.x * T));
    out.y = Math.max(T * 1.5, Math.min((N - 1.5) * T, hit.z * T));
    return true;
  }

  public snapCameraNextFrame(): void {
    this.camInitialized = false;
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLostBound);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestoredBound);

    for (const g of this.ownedGeos) g.dispose();
    for (const m of this.ownedMats) m.dispose();
    for (const tex of this.ownedTextures) tex.dispose();
    this.ownedGeos = [];
    this.ownedMats = [];
    this.ownedTextures = [];
    this.houseInterior?.dispose();
    this.houseInterior = null;
    disposeCompanionRig(this.companionRig);

    this.renderPass?.dispose();
    this.dofPass?.dispose();
    this.outputPass?.dispose();
    this.composer?.dispose();
    this.renderPass = null;
    this.dofPass = null;
    this.outputPass = null;
    this.composer = null;

    this.envRT.dispose();
    this.pmrem.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
