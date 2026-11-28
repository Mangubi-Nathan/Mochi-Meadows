/**
 * Deterministic geometry & portal coordinates for Glowdeep Caverns (Layer 3)
 * and The Moon Road (Layer 4), shared across terrain rendering, collision,
 * minimap, and the Five-Phase World Atlas.
 */

import { fbm, hash, vn } from './engine';
import { WORLD_ANCHORS, WORLD_GRID_SIZE } from './worldAnchors';

export type RealmLayerId = 0 | 1 | 2 | 3 | 4;

export type GlowdeepCell = 'wall' | 'chamber' | 'canal' | 'glowcap' | 'cinder' | 'roots';
export type MoonRoadCell = 'road' | 'platform' | 'silence' | 'nebula' | 'void';

const gd = WORLD_ANCHORS.glowdeep;
const mr = WORLD_ANCHORS.moonroad;

export const GLOWDEEP_SPAWN_TILE = { x: gd.rootedRest.tx, y: gd.rootedRest.ty - 1 };
export const GLOWDEEP_RETURN_TILE = { x: gd.returnTile.tx, y: gd.returnTile.ty };

export const MOONROAD_SPAWN_TILE = { x: mr.teaHouse.tx, y: mr.teaHouse.ty + 2 };
export const MOONROAD_RETURN_TILE = { x: mr.returnTile.tx, y: mr.returnTile.ty };

export function distToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function getGlowdeepCell(x: number, y: number): GlowdeepCell {
  // Hard perimeter enclosure so players stay cleanly inside the 420x420 cavern bounds
  if (x < 5 || y < 5 || x >= WORLD_GRID_SIZE - 5 || y >= WORLD_GRID_SIZE - 5) {
    return 'wall';
  }

  const cx = gd.rootedRest.tx;
  const cy = gd.rootedRest.ty;
  const dCenter = Math.hypot(x - cx, y - cy);

  // Taproot sanctuaries at Rooted Rest and the Northern Root Vault
  const dNorthVault = Math.hypot(x - gd.northernRootVault.tx, y - gd.northernRootVault.ty);
  if (dCenter < 11.5 || dNorthVault < 11.5) {
    return 'roots';
  }

  // Dry walkable wharf plazas right at canal-side docks so piers, gondolas & NPCs have solid footing beside the water
  const onCanalWharf =
    Math.hypot(x - gd.sporeGrotto.tx, y - gd.sporeGrotto.ty) < 4.5 ||
    Math.hypot(x - gd.deepCanalHub.tx, y - gd.deepCanalHub.ty) < 4.5 ||
    Math.hypot(x - gd.southWestSubterraneanBay.tx, y - gd.southWestSubterraneanBay.ty) < 4.5;

  // Interconnected radial + outer perimeter ring waterways & cavern arteries
  const wNoiseA = (vn(x * 0.055, y * 0.055, 82) - 0.5) * 9.5;
  const wNoiseB = (vn(x * 0.055, y * 0.055, 83) - 0.5) * 9.5;

  const minRadial = Math.min(
    distToSegment(x, y, cx, cy, gd.sporeGrotto.tx, gd.sporeGrotto.ty) + wNoiseA,
    distToSegment(x, y, cx, cy, gd.magmaGeode.tx, gd.magmaGeode.ty) + wNoiseB,
    distToSegment(x, y, cx, cy, gd.prismIce.tx, gd.prismIce.ty) + wNoiseA * 0.9,
    distToSegment(x, y, cx, cy, gd.seEchoCavern.tx, gd.seEchoCavern.ty) + wNoiseB * 0.9,
    distToSegment(x, y, cx, cy, gd.deepCanalHub.tx, gd.deepCanalHub.ty) + wNoiseA,
    distToSegment(x, y, cx, cy, gd.crystalConservatory.tx, gd.crystalConservatory.ty) + wNoiseB * 0.85,
    distToSegment(x, y, cx, cy, gd.northernRootVault.tx, gd.northernRootVault.ty) + wNoiseA * 0.85,
    distToSegment(x, y, cx, cy, gd.westernCinderWell.tx, gd.westernCinderWell.ty) + wNoiseB * 0.85
  );

  const minOuterRing = Math.min(
    distToSegment(x, y, gd.northWestSporeBasin.tx, gd.northWestSporeBasin.ty, gd.northernRootVault.tx, gd.northernRootVault.ty),
    distToSegment(x, y, gd.northernRootVault.tx, gd.northernRootVault.ty, gd.northEastPrismSanctum.tx, gd.northEastPrismSanctum.ty),
    distToSegment(x, y, gd.northEastPrismSanctum.tx, gd.northEastPrismSanctum.ty, gd.easternEchoSpire.tx, gd.easternEchoSpire.ty),
    distToSegment(x, y, gd.easternEchoSpire.tx, gd.easternEchoSpire.ty, gd.southEastEmberCaldera.tx, gd.southEastEmberCaldera.ty),
    distToSegment(x, y, gd.southEastEmberCaldera.tx, gd.southEastEmberCaldera.ty, gd.southernDeepGorge.tx, gd.southernDeepGorge.ty),
    distToSegment(x, y, gd.southernDeepGorge.tx, gd.southernDeepGorge.ty, gd.southWestSubterraneanBay.tx, gd.southWestSubterraneanBay.ty),
    distToSegment(x, y, gd.southWestSubterraneanBay.tx, gd.southWestSubterraneanBay.ty, gd.westernCinderWell.tx, gd.westernCinderWell.ty),
    distToSegment(x, y, gd.westernCinderWell.tx, gd.westernCinderWell.ty, gd.northWestSporeBasin.tx, gd.northWestSporeBasin.ty),
    // Cross-links between mid-ring hubs and outer vaults
    distToSegment(x, y, gd.deepCanalHub.tx, gd.deepCanalHub.ty, gd.northWestSporeBasin.tx, gd.northWestSporeBasin.ty),
    distToSegment(x, y, gd.prismIce.tx, gd.prismIce.ty, gd.northEastPrismSanctum.tx, gd.northEastPrismSanctum.ty),
    distToSegment(x, y, gd.crystalConservatory.tx, gd.crystalConservatory.ty, gd.easternEchoSpire.tx, gd.easternEchoSpire.ty),
    distToSegment(x, y, gd.seEchoCavern.tx, gd.seEchoCavern.ty, gd.southEastEmberCaldera.tx, gd.southEastEmberCaldera.ty),
    distToSegment(x, y, gd.magmaGeode.tx, gd.magmaGeode.ty, gd.southernDeepGorge.tx, gd.southernDeepGorge.ty),
    distToSegment(x, y, gd.sporeGrotto.tx, gd.sporeGrotto.ty, gd.southWestSubterraneanBay.tx, gd.southWestSubterraneanBay.ty),
    distToSegment(x, y, gd.sporeGrotto.tx, gd.sporeGrotto.ty, gd.westernCinderWell.tx, gd.westernCinderWell.ty)
  ) + wNoiseB * 0.75;

  const minCanal = Math.min(minRadial, minOuterRing);
  if (!onCanalWharf && minCanal < 3.4) return 'canal';

  // Wide walkable caverns across the whole underground realm, broken up by sculpted basalt pillars
  const caveNoise = fbm(x * 0.032, y * 0.032, 88);
  const inArtery = dCenter < 36 || minRadial < 17 || minOuterRing < 16;
  const inOutpost =
    Math.hypot(x - gd.sporeGrotto.tx, y - gd.sporeGrotto.ty) < 24 ||
    Math.hypot(x - gd.magmaGeode.tx, y - gd.magmaGeode.ty) < 25 ||
    Math.hypot(x - gd.prismIce.tx, y - gd.prismIce.ty) < 24 ||
    Math.hypot(x - gd.seEchoCavern.tx, y - gd.seEchoCavern.ty) < 23 ||
    Math.hypot(x - gd.deepCanalHub.tx, y - gd.deepCanalHub.ty) < 24 ||
    Math.hypot(x - gd.crystalConservatory.tx, y - gd.crystalConservatory.ty) < 24 ||
    Math.hypot(x - gd.northernRootVault.tx, y - gd.northernRootVault.ty) < 24 ||
    Math.hypot(x - gd.northWestSporeBasin.tx, y - gd.northWestSporeBasin.ty) < 23 ||
    Math.hypot(x - gd.northEastPrismSanctum.tx, y - gd.northEastPrismSanctum.ty) < 24 ||
    Math.hypot(x - gd.westernCinderWell.tx, y - gd.westernCinderWell.ty) < 23 ||
    Math.hypot(x - gd.easternEchoSpire.tx, y - gd.easternEchoSpire.ty) < 23 ||
    Math.hypot(x - gd.southWestSubterraneanBay.tx, y - gd.southWestSubterraneanBay.ty) < 23 ||
    Math.hypot(x - gd.southEastEmberCaldera.tx, y - gd.southEastEmberCaldera.ty) < 25 ||
    Math.hypot(x - gd.southernDeepGorge.tx, y - gd.southernDeepGorge.ty) < 23;

  if (!inArtery && !inOutpost && caveNoise < 0.34) {
    return 'wall';
  }

  // Geothermal cinder pockets at volcanic cavern belts & western cinder well
  if (
    Math.hypot(x - gd.westernCinderWell.tx, y - gd.westernCinderWell.ty) < 11.5 ||
    Math.hypot(x - gd.southEastEmberCaldera.tx, y - gd.southEastEmberCaldera.ty) < 12.5 ||
    Math.hypot(x - gd.magmaGeode.tx, y - gd.magmaGeode.ty) < 11.0 ||
    Math.hypot(x - gd.southernDeepGorge.tx, y - gd.southernDeepGorge.ty) < 10.5 ||
    ((y > gd.magmaGeode.ty - 42 || Math.hypot(x - gd.southEastEmberCaldera.tx, y - gd.southEastEmberCaldera.ty) < 28) &&
      fbm(x * 0.072, y * 0.072, 89) > 0.48)
  ) {
    return 'cinder';
  }

  // Lush glowcap mushroom basins around Spore Grotto, NW Spore Basin & Deep Canal Basin
  const inSporeGrove =
    Math.hypot(x - gd.northWestSporeBasin.tx, y - gd.northWestSporeBasin.ty) < 12 ||
    Math.hypot(x - gd.sporeGrotto.tx, y - gd.sporeGrotto.ty) < 11 ||
    Math.hypot(x - gd.deepCanalHub.tx, y - gd.deepCanalHub.ty) < 9.5;
  if ((inSporeGrove && vn(x * 0.24, y * 0.24, 92) > 0.36) || vn(x * 0.18, y * 0.18, 90) > 0.62 || hash(x, y, 91) < 0.05) {
    return 'glowcap';
  }

  return 'chamber';
}

export function getMoonRoadCell(x: number, y: number): MoonRoadCell {
  if (x < 5 || y < 5 || x >= WORLD_GRID_SIZE - 5 || y >= WORLD_GRID_SIZE - 5) {
    return 'void';
  }

  const th = mr.teaHouse;
  const ts = mr.twinStars;
  const us = mr.unsungShrine;
  const es = mr.edgeOfSilence;
  const sl = mr.southStairLanding;
  const wc = mr.westCrescentLanding;
  const cb = mr.crescentBelvedere;
  const zo = mr.zenithAstralObservatory;
  const nw = mr.northWestCometBridge;
  const ne = mr.northEastAuroraPromenade;
  const ww = mr.westernStarlightWharf;
  const sw = mr.southWestLullabyIsle;
  const se = mr.southEastStarfallPier;
  const tb = mr.twilightBazaar;
  const lb = mr.lullabyBellArch;

  // Starlight terrace platforms at every constellation waystation
  if (
    Math.hypot(x - th.tx, y - th.ty) < 15 ||
    Math.hypot(x - ts.tx, y - ts.ty) < 12 ||
    Math.hypot(x - us.tx, y - us.ty) < 12 ||
    Math.hypot(x - wc.tx, y - wc.ty) < 11.5 ||
    Math.hypot(x - sl.tx, y - sl.ty) < 11.5 ||
    Math.hypot(x - cb.tx, y - cb.ty) < 12 ||
    Math.hypot(x - zo.tx, y - zo.ty) < 14 ||
    Math.hypot(x - nw.tx, y - nw.ty) < 11.5 ||
    Math.hypot(x - ne.tx, y - ne.ty) < 11.5 ||
    Math.hypot(x - ww.tx, y - ww.ty) < 11.5 ||
    Math.hypot(x - sw.tx, y - sw.ty) < 11.5 ||
    Math.hypot(x - se.tx, y - se.ty) < 12 ||
    Math.hypot(x - tb.tx, y - tb.ty) < 13 ||
    Math.hypot(x - lb.tx, y - lb.ty) < 12
  ) {
    return 'platform';
  }

  if (Math.hypot(x - es.tx, y - es.ty) < 18) {
    return 'silence';
  }

  // Grand constellation circuit + inner crossroads spanning the entire 420x420 celestial plane
  const minRoadRaw = Math.min(
    // Inner celestial web
    distToSegment(x, y, wc.tx, wc.ty, cb.tx, cb.ty),
    distToSegment(x, y, cb.tx, cb.ty, ts.tx, ts.ty),
    distToSegment(x, y, ts.tx, ts.ty, th.tx, th.ty),
    distToSegment(x, y, th.tx, th.ty, us.tx, us.ty),
    distToSegment(x, y, us.tx, us.ty, es.tx, es.ty),
    distToSegment(x, y, th.tx, th.ty, sl.tx, sl.ty),
    distToSegment(x, y, cb.tx, cb.ty, th.tx, th.ty),
    distToSegment(x, y, th.tx, th.ty, zo.tx, zo.ty),
    distToSegment(x, y, th.tx, th.ty, tb.tx, tb.ty),
    distToSegment(x, y, th.tx, th.ty, lb.tx, lb.ty),
    // Outer orbital ring & diagonal bridges
    distToSegment(x, y, ww.tx, ww.ty, nw.tx, nw.ty),
    distToSegment(x, y, nw.tx, nw.ty, zo.tx, zo.ty),
    distToSegment(x, y, zo.tx, zo.ty, ne.tx, ne.ty),
    distToSegment(x, y, ne.tx, ne.ty, es.tx, es.ty),
    distToSegment(x, y, es.tx, es.ty, se.tx, se.ty),
    distToSegment(x, y, se.tx, se.ty, tb.tx, tb.ty),
    distToSegment(x, y, tb.tx, tb.ty, sl.tx, sl.ty),
    distToSegment(x, y, sl.tx, sl.ty, lb.tx, lb.ty),
    distToSegment(x, y, lb.tx, lb.ty, sw.tx, sw.ty),
    distToSegment(x, y, sw.tx, sw.ty, wc.tx, wc.ty),
    distToSegment(x, y, wc.tx, wc.ty, ww.tx, ww.ty),
    distToSegment(x, y, ww.tx, ww.ty, cb.tx, cb.ty),
    distToSegment(x, y, nw.tx, nw.ty, ts.tx, ts.ty),
    distToSegment(x, y, ne.tx, ne.ty, us.tx, us.ty),
    distToSegment(x, y, tb.tx, tb.ty, us.tx, us.ty),
    distToSegment(x, y, lb.tx, lb.ty, wc.tx, wc.ty)
  );
  const curveOffset = Math.sin(x * 0.055 + y * 0.048) * 1.45;
  if (minRoadRaw + curveOffset < 5.6) {
    return 'road';
  }

  // Broad continuous walkable Aurora Nebula cloud banks bridging cosmic expanses cleanly
  const neb = fbm(x * 0.024, y * 0.024, 101);
  if (neb > 0.42 || minRoadRaw < 15.5) return 'nebula';
  return 'void';
}

export function isGlowdeepWalkable(x: number, y: number): boolean {
  return getGlowdeepCell(x, y) !== 'wall';
}

export function isMoonRoadWalkable(x: number, y: number): boolean {
  return getMoonRoadCell(x, y) !== 'void';
}
