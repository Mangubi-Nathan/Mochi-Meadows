/**
 * Procedural Terrain-Aware Ambient Wildlife Kinematics
 * Zero-allocation helpers shared across 3D (Three.js) and 2D (Canvas) renderers:
 * - Sea Layer Reef Fish Schools: cohesive leader/follower formations, bubble-dome avoidance,
 *   kelp slalom weaving, coral/anemone circling, thermal vent updraft spirals, & player parting.
 * - Sky Kingdom Bird Flocks: swallows & crest birds anchored to real SB floating islands,
 *   cloud rims, and Sky landmarks (Cirrus Castle, Sunrise Updraft Spire, Nimbus Market, Aether Garden).
 * - Surface Feature Anchors: coastal gulls near beaches/harbors, woodland songbirds around groves,
 *   and flower/water-seeking pollinators.
 */

import { N, T, hash, FishAmbient } from './engine';
import { WORLD_ANCHORS } from './worldAnchors';

export interface ReefFishSampleOut {
  tx: number;
  tz: number;
  vx: number;
  vz: number;
  yaw: number;
  pitch: number;
  roll: number;
  liftY: number;
  scaleMul: number;
  tailFreq: number;
  tailAmp: number;
  bodySwayAmp: number;
}

export interface SkyIslandAnchor {
  tx: number;
  tz: number;
  radius: number;
  kind: 'castle' | 'updraft' | 'market' | 'garden' | 'island' | 'tree';
  seed: number;
}

const SKY_SECTOR_STEP = 10;
const MAX_SKY_ANCHORS = 28;
const _skyAnchors: SkyIslandAnchor[] = Array.from({ length: MAX_SKY_ANCHORS }, () => ({
  tx: 0,
  tz: 0,
  radius: 5,
  kind: 'island',
  seed: 0,
}));

function clampTile(v: number): number {
  return v < 0 ? 0 : v >= N ? N - 1 : v | 0;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function smoothstep01(edge0: number, edge1: number, x: number): number {
  const denom = edge1 - edge0;
  if (Math.abs(denom) < 1e-5) return x >= edge1 ? 1 : 0;
  const u = clamp((x - edge0) / denom, 0, 1);
  return u * u * (3 - 2 * u);
}

/**
 * Evaluates a single reef fish's terrain-reactive pose within a cohesive school.
 * Mutates `out` in place for zero-GC per-frame updates.
 */
export function evaluateReefFishPose(
  f: FishAmbient,
  fishIndex: number,
  memberIndex: number,
  t: number,
  UD: Uint8Array,
  playerTx: number,
  playerTz: number,
  hasPlayerInDive: boolean,
  out: ReefFishSampleOut
): void {
  const homeTx = f.hx / T;
  const homeTz = f.hy / T;
  const hTileX = clampTile(Math.round(homeTx));
  const hTileZ = clampTile(Math.round(homeTz));

  // Sample local reef biome cues around the school's home territory (kelp, coral, anemone, lantern, vents)
  let kelpWeight = 0;
  let coralWeight = 0;
  let anemoneWeight = 0;
  let lanternWeight = 0;
  for (let dz = -1; dz <= 1; dz++) {
    const nz = clampTile(hTileZ + dz);
    for (let dx = -1; dx <= 1; dx++) {
      const nx = clampTile(hTileX + dx);
      const u = UD[nz * N + nx];
      if (u === 1) kelpWeight++;
      else if (u === 2) coralWeight++;
      else if (u === 3) anemoneWeight++;
      else if (u === 7) lanternWeight++;
    }
  }

  // Landmark proximity specials (thermal vents boost upward spiral; concert/heart reefs encourage sweeping rings)
  const dThermal = Math.hypot(
    homeTx - WORLD_ANCHORS.reef.cinderThermalVents.tx,
    homeTz - WORLD_ANCHORS.reef.cinderThermalVents.ty
  );
  const thermalFactor = 1 - smoothstep01(4, 14, dThermal);

  const dConcert = Math.hypot(
    homeTx - WORLD_ANCHORS.reef.coralConcertHall.tx,
    homeTz - WORLD_ANCHORS.reef.coralConcertHall.ty
  );
  const dHeart = Math.hypot(
    homeTx - WORLD_ANCHORS.reef.heartReefVault.tx,
    homeTz - WORLD_ANCHORS.reef.heartReefVault.ty
  );
  const plazaFactor = Math.max(
    1 - smoothstep01(4, 13, dConcert),
    1 - smoothstep01(4, 13, dHeart)
  );

  // Anemone clownfish exhibit playful pause-and-dart bursts; kelp schools swim smoothly in serpentine curves
  const baseSpeed = 0.88 / Math.max(0.5, f.s);
  const dartMod =
    anemoneWeight > 0
      ? 0.28 * Math.sin(t * 2.4 + f.ph)
      : thermalFactor > 0.25
      ? 0.22 * Math.cos(t * 1.9 + f.ph)
      : 0;

  // Follower schooling lag + slight V-wing spread
  const lag = memberIndex * (0.24 + (fishIndex % 3) * 0.03);
  const ang = t * baseSpeed + f.ph + dartMod - lag;
  const rxTiles = (f.R / T) * (coralWeight > 0 ? 0.92 : plazaFactor > 0.25 ? 1.25 : 1.08);
  const rzTiles = rxTiles * (coralWeight > 0 ? 0.78 : 0.62);

  // Orbit center shifts subtly around coral / kelp / lantern habitats
  let px = homeTx + Math.cos(ang) * rxTiles;
  let pz = homeTz + Math.sin(ang * (kelpWeight > 0 ? 1.0 : 1.28)) * rzTiles;

  let vx = -Math.sin(ang) * rxTiles * baseSpeed;
  let vz =
    (kelpWeight > 0 ? 1.0 : 1.28) *
    Math.cos(ang * (kelpWeight > 0 ? 1.0 : 1.28)) *
    rzTiles *
    baseSpeed;

  // Kelp forest serpentine S-weave perpendicular to swim direction
  if (kelpWeight > 0) {
    const vLen = Math.max(0.05, Math.hypot(vx, vz));
    const nx = -vz / vLen;
    const nz = vx / vLen;
    const weavePhase = t * 2.55 + f.ph * 1.7 - memberIndex * 0.42;
    const weaveAmp = 0.22 + Math.min(0.24, kelpWeight * 0.06);
    const weave = Math.sin(weavePhase) * weaveAmp;
    const dWeave = Math.cos(weavePhase) * weaveAmp * 2.55;
    px += nx * weave;
    pz += nz * weave;
    vx += nx * dWeave;
    vz += nz * dWeave;
  }

  // Cohesive school formation offset for followers (V-chevron wingmen)
  if (memberIndex > 0) {
    const vLen = Math.max(0.05, Math.hypot(vx, vz));
    const fwdX = vx / vLen;
    const fwdZ = vz / vLen;
    const rightX = -fwdZ;
    const rightZ = fwdX;
    const side = memberIndex % 2 === 1 ? 1 : -1;
    const rank = Math.ceil(memberIndex / 2);
    const lateral = side * (0.28 + rank * 0.16);
    const trail = -rank * 0.24;
    px += rightX * lateral + fwdX * trail;
    pz += rightZ * lateral + fwdZ * trail;
  }

  // Bubble dome (UD === 5) obstacle avoidance — guide fish gracefully around dome glass walls
  const curTx = clampTile(Math.floor(px));
  const curTz = clampTile(Math.floor(pz));
  let repelX = 0;
  let repelZ = 0;
  for (let dz = -2; dz <= 2; dz++) {
    const tz = curTz + dz;
    if (tz < 1 || tz >= N - 1) continue;
    for (let dx = -2; dx <= 2; dx++) {
      const tx = curTx + dx;
      if (tx < 1 || tx >= N - 1) continue;
      if (UD[tz * N + tx] === 5) {
        // Bubble domes render centered near (tx + 1.5, tz + 0.2) with radius ~2.35 tiles
        const domeCx = tx + 1.5;
        const domeCz = tz + 0.2;
        const ddx = px - domeCx;
        const ddz = pz - domeCz;
        const dist = Math.hypot(ddx, ddz);
        const minClear = 2.65;
        if (dist < minClear) {
          const safeDist = Math.max(0.08, dist);
          const push = (minClear - dist) * 1.15;
          repelX += (ddx / safeDist) * push;
          repelZ += (ddz / safeDist) * push;
        }
      }
    }
  }

  // Reactive gentle parting when the diving player approaches a school
  let alertBoost = 0;
  if (hasPlayerInDive) {
    const pdx = px - playerTx;
    const pdz = pz - playerTz;
    const pDist = Math.hypot(pdx, pdz);
    if (pDist < 4.0) {
      const evade = smoothstep01(4.0, 0.75, pDist);
      const safeP = Math.max(0.12, pDist);
      repelX += (pdx / safeP) * evade * 1.65;
      repelZ += (pdz / safeP) * evade * 1.65;
      alertBoost = evade;
    }
  }

  if (repelX !== 0 || repelZ !== 0) {
    px += repelX;
    pz += repelZ;
    vx += repelX * 1.6;
    vz += repelZ * 1.6;
  }

  px = clamp(px, 1.2, N - 1.2);
  pz = clamp(pz, 1.2, N - 1.2);

  const yaw = Math.atan2(vx, vz);
  const speedMag = Math.hypot(vx, vz);

  // Vertical motion: climb over coral heads, hover near anemones/lanterns, ride thermal vent spirals
  const baseHover =
    0.4 +
    ((fishIndex + memberIndex) % 3) * 0.2 +
    (coralWeight > 0 ? 0.16 : 0) +
    (lanternWeight > 0 ? 0.14 : 0);
  const thermalLift =
    thermalFactor > 0.15
      ? thermalFactor * (0.35 + 0.28 * Math.sin(t * 2.1 + f.ph - memberIndex * 0.4))
      : 0;
  const verticalBob =
    Math.sin(t * 2.2 + f.ph - memberIndex * 0.5) * 0.12 +
    (memberIndex === 1 ? 0.1 : memberIndex === 2 ? -0.07 : 0);

  const verticalSlope =
    Math.cos(t * 2.2 + f.ph - memberIndex * 0.5) * 0.24 +
    (thermalFactor > 0.15 ? Math.cos(t * 2.1 + f.ph) * 0.28 * thermalFactor : 0);

  // Bank gently into tight turns and thermal spirals
  const turnSign = Math.cos(ang * (kelpWeight > 0 ? 1.0 : 1.28)) * Math.sin(ang);
  const roll = clamp(turnSign * 0.24 + alertBoost * 0.18, -0.35, 0.35);
  const pitch = clamp(-verticalSlope * 0.45, -0.38, 0.38);

  out.tx = px;
  out.tz = pz;
  out.vx = vx;
  out.vz = vz;
  out.yaw = yaw;
  out.pitch = pitch;
  out.roll = roll;
  out.liftY = baseHover + thermalLift + verticalBob;
  out.scaleMul = memberIndex === 0 ? 1.0 : memberIndex === 1 ? 0.84 : 0.76;
  out.tailFreq = 10.5 + speedMag * 2.8 + alertBoost * 9.5;
  out.tailAmp = 0.4 + alertBoost * 0.28;
  out.bodySwayAmp = 0.11 + alertBoost * 0.06;
}

/**
 * Discovers real Sky Kingdom landmarks and local floating cloud islands (`SB > 0`)
 * around `(focusX, focusZ)` so birds genuinely circle islands, spires, and treetops.
 * Returns count of entries written to the returned module-scope buffer.
 */
export function collectVisibleSkyIslandAnchors(
  SB: Uint8Array,
  SD: Uint8Array,
  focusX: number,
  focusZ: number,
  maxRadiusTiles: number = 34
): { anchors: SkyIslandAnchor[]; count: number } {
  let count = 0;

  const pushAnchor = (
    tx: number,
    tz: number,
    radius: number,
    kind: SkyIslandAnchor['kind'],
    seed: number
  ) => {
    if (count >= MAX_SKY_ANCHORS) return;
    // Skip duplicates that sit very close to an already registered landmark
    for (let i = 0; i < count; i++) {
      const a = _skyAnchors[i];
      if (Math.hypot(a.tx - tx, a.tz - tz) < 7.5) return;
    }
    const slot = _skyAnchors[count++];
    slot.tx = tx;
    slot.tz = tz;
    slot.radius = radius;
    slot.kind = kind;
    slot.seed = seed;
  };

  // 1. Named Sky Kingdom Landmarks
  const sk = WORLD_ANCHORS.sky;
  const landmarks: [number, number, number, SkyIslandAnchor['kind'], number][] = [
    [sk.cirrusCastle.tx, sk.cirrusCastle.ty, 10.5, 'castle', 11.1],
    [sk.sunriseUpdraftSpire.tx, sk.sunriseUpdraftSpire.ty, 7.6, 'updraft', 22.3],
    [sk.nimbusMarket.tx, sk.nimbusMarket.ty, 8.2, 'market', 33.7],
    [sk.aetherGarden.tx, sk.aetherGarden.ty, 7.4, 'garden', 44.9],
  ];
  for (let i = 0; i < landmarks.length; i++) {
    const [lx, lz, rad, kind, seed] = landmarks[i];
    if (Math.abs(lx - focusX) <= maxRadiusTiles && Math.abs(lz - focusZ) <= maxRadiusTiles) {
      pushAnchor(lx + 0.5, lz + 0.5, rad, kind, seed);
    }
  }

  // 2. Dynamic Cloud Islands from SB grid using world-locked sectors (prevents popping while walking)
  const minSx = Math.max(1, Math.floor((focusX - maxRadiusTiles) / SKY_SECTOR_STEP));
  const maxSx = Math.min(
    Math.floor((N - 2) / SKY_SECTOR_STEP),
    Math.floor((focusX + maxRadiusTiles) / SKY_SECTOR_STEP)
  );
  const minSz = Math.max(1, Math.floor((focusZ - maxRadiusTiles) / SKY_SECTOR_STEP));
  const maxSz = Math.min(
    Math.floor((N - 2) / SKY_SECTOR_STEP),
    Math.floor((focusZ + maxRadiusTiles) / SKY_SECTOR_STEP)
  );

  for (let sz = minSz; sz <= maxSz && count < MAX_SKY_ANCHORS; sz++) {
    for (let sx = minSx; sx <= maxSx && count < MAX_SKY_ANCHORS; sx++) {
      const startX = sx * SKY_SECTOR_STEP;
      const startZ = sz * SKY_SECTOR_STEP;
      let sumX = 0;
      let sumZ = 0;
      let hits = 0;
      let treeHits = 0;
      for (let dz = 1; dz < SKY_SECTOR_STEP; dz += 2) {
        const tz = Math.min(N - 2, startZ + dz);
        for (let dx = 1; dx < SKY_SECTOR_STEP; dx += 2) {
          const tx = Math.min(N - 2, startX + dx);
          const idx = tz * N + tx;
          if (SB[idx] > 0) {
            sumX += tx + 0.5;
            sumZ += tz + 0.5;
            hits++;
            if (SD[idx] === 1 || SD[idx] === 9) treeHits++;
          }
        }
      }
      if (hits >= 3) {
        const cx = sumX / hits;
        const cz = sumZ / hits;
        const estRad = clamp(2.8 + Math.sqrt(hits) * 1.15, 3.6, 8.2);
        pushAnchor(
          cx,
          cz,
          estRad,
          treeHits > 0 ? 'tree' : 'island',
          hash(sx, sz, 913) * 100
        );
      }
    }
  }

  return { anchors: _skyAnchors, count };
}
