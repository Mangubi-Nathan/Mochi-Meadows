/**
 * Deterministic geometry & portal coordinates for Glowdeep Caverns (Layer 3)
 * and The Moon Road (Layer 4), shared across terrain rendering, collision,
 * minimap, and the Five-Phase World Atlas.
 */

import { fbm, hash, vn } from './engine';
import { WORLD_ANCHORS } from './worldAnchors';

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
  const cx = gd.rootedRest.tx;
  const cy = gd.rootedRest.ty;
  const dCenter = Math.hypot(x - cx, y - cy);
  if (dCenter < 20 + vn(x * 0.14, y * 0.14, 81) * 6) {
    if (dCenter < 10) return 'roots';
  }

  const dWest = distToSegment(x, y, cx, cy, gd.sporeGrotto.tx, gd.sporeGrotto.ty) + (vn(x * 0.06, y * 0.06, 82) - 0.5) * 10;
  const dSouth = distToSegment(x, y, cx, cy, gd.magmaGeode.tx, gd.magmaGeode.ty) + (vn(x * 0.06, y * 0.06, 83) - 0.5) * 10;
  const dNorthEast = distToSegment(x, y, cx, cy, gd.prismIce.tx, gd.prismIce.ty) + (vn(x * 0.06, y * 0.06, 84) - 0.5) * 10;
  const dSouthEast = distToSegment(x, y, cx, cy, gd.seEchoCavern.tx, gd.seEchoCavern.ty) + (vn(x * 0.06, y * 0.06, 85) - 0.5) * 10;
  const dNorthWest = distToSegment(x, y, cx, cy, gd.deepCanalHub.tx, gd.deepCanalHub.ty) + (vn(x * 0.06, y * 0.06, 86) - 0.5) * 10;
  const dEast = distToSegment(x, y, cx, cy, gd.crystalConservatory.tx, gd.crystalConservatory.ty) + (vn(x * 0.06, y * 0.06, 87) - 0.5) * 9;

  const minCanal = Math.min(dWest, dSouth, dNorthEast, dSouthEast, dNorthWest, dEast);
  if (minCanal < 3.6) return 'canal';

  const caveNoise = fbm(x * 0.036, y * 0.036, 88);
  const inMainHall = dCenter < 34 || minCanal < 14.5;
  const inOutpost =
    Math.hypot(x - gd.sporeGrotto.tx, y - gd.sporeGrotto.ty) < 22 ||
    Math.hypot(x - gd.magmaGeode.tx, y - gd.magmaGeode.ty) < 22 ||
    Math.hypot(x - gd.prismIce.tx, y - gd.prismIce.ty) < 22 ||
    Math.hypot(x - gd.seEchoCavern.tx, y - gd.seEchoCavern.ty) < 20 ||
    Math.hypot(x - gd.deepCanalHub.tx, y - gd.deepCanalHub.ty) < 20 ||
    Math.hypot(x - gd.crystalConservatory.tx, y - gd.crystalConservatory.ty) < 20;

  if (!inMainHall && !inOutpost && caveNoise < 0.52) {
    return 'wall';
  }

  if (y > gd.magmaGeode.ty - 38 && fbm(x * 0.075, y * 0.075, 89) > 0.5) {
    return 'cinder';
  }

  if (vn(x * 0.2, y * 0.2, 90) > 0.65 || hash(x, y, 91) < 0.045) {
    return 'glowcap';
  }

  return 'chamber';
}

export function getMoonRoadCell(x: number, y: number): MoonRoadCell {
  const th = mr.teaHouse;
  const ts = mr.twinStars;
  const us = mr.unsungShrine;
  const es = mr.edgeOfSilence;
  const sl = mr.southStairLanding;
  const wc = mr.westCrescentLanding;
  const cb = mr.crescentBelvedere;

  const s1 = distToSegment(x, y, wc.tx, wc.ty, cb.tx, cb.ty);
  const s2 = distToSegment(x, y, cb.tx, cb.ty, ts.tx, ts.ty);
  const s3 = distToSegment(x, y, ts.tx, ts.ty, th.tx, th.ty);
  const s4 = distToSegment(x, y, th.tx, th.ty, us.tx, us.ty);
  const s5 = distToSegment(x, y, us.tx, us.ty, es.tx, es.ty);
  const s6 = distToSegment(x, y, th.tx, th.ty, sl.tx, sl.ty);
  const s7 = distToSegment(x, y, cb.tx, cb.ty, th.tx, th.ty);
  const curveOffset = Math.sin(x * 0.065 + y * 0.055) * 1.6;
  const minRoad = Math.min(s1, s2, s3, s4, s5, s6, s7) + curveOffset;

  if (
    Math.hypot(x - th.tx, y - th.ty) < 14 ||
    Math.hypot(x - ts.tx, y - ts.ty) < 10 ||
    Math.hypot(x - us.tx, y - us.ty) < 10 ||
    Math.hypot(x - wc.tx, y - wc.ty) < 9 ||
    Math.hypot(x - sl.tx, y - sl.ty) < 9 ||
    Math.hypot(x - cb.tx, y - cb.ty) < 10
  ) {
    return 'platform';
  }

  if (Math.hypot(x - es.tx, y - es.ty) < 16) {
    return 'silence';
  }

  if (minRoad < 4.4) {
    return 'road';
  }

  const neb = fbm(x * 0.025, y * 0.025, 101);
  if (neb > 0.48) return 'nebula';
  return 'void';
}

export function isGlowdeepWalkable(x: number, y: number): boolean {
  return getGlowdeepCell(x, y) !== 'wall';
}

export function isMoonRoadWalkable(x: number, y: number): boolean {
  const cell = getMoonRoadCell(x, y);
  return cell === 'road' || cell === 'platform' || cell === 'silence';
}
