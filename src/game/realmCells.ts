/**
 * Deterministic geometry & portal coordinates for Glowdeep Caverns (Layer 3)
 * and The Moon Road (Layer 4), shared across terrain rendering, collision,
 * minimap, and the Five-Phase World Atlas.
 */

import { fbm, hash, vn } from './engine';

export type RealmLayerId = 0 | 1 | 2 | 3 | 4;

export type GlowdeepCell = 'wall' | 'chamber' | 'canal' | 'glowcap' | 'cinder' | 'roots';
export type MoonRoadCell = 'road' | 'platform' | 'silence' | 'nebula' | 'void';

export const GLOWDEEP_SPAWN_TILE = { x: 130, y: 129 };
export const GLOWDEEP_RETURN_TILE = { x: 130, y: 126 };

export const MOONROAD_SPAWN_TILE = { x: 130, y: 126 };
export const MOONROAD_RETURN_TILE = { x: 130, y: 128 };

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
  const dCenter = Math.hypot(x - 130, y - 130);
  if (dCenter < 15 + vn(x * 0.18, y * 0.18, 81) * 5) {
    if (dCenter < 7.5) return 'roots';
  }

  const dWest = distToSegment(x, y, 130, 130, 58, 148) + (vn(x * 0.08, y * 0.08, 82) - 0.5) * 8;
  const dSouth = distToSegment(x, y, 130, 130, 128, 215) + (vn(x * 0.08, y * 0.08, 83) - 0.5) * 8;
  const dNorthEast = distToSegment(x, y, 130, 130, 198, 68) + (vn(x * 0.08, y * 0.08, 84) - 0.5) * 8;
  const dSouthEast = distToSegment(x, y, 130, 130, 206, 198) + (vn(x * 0.08, y * 0.08, 85) - 0.5) * 8;
  const dNorthWest = distToSegment(x, y, 130, 130, 56, 56) + (vn(x * 0.08, y * 0.08, 86) - 0.5) * 8;

  const minCanal = Math.min(dWest, dSouth, dNorthEast, dSouthEast, dNorthWest);
  if (minCanal < 3.0) return 'canal';

  const caveNoise = fbm(x * 0.045, y * 0.045, 88);
  const inMainHall = dCenter < 24 || minCanal < 11.5;
  const inOutpost =
    Math.hypot(x - 62, y - 145) < 16 ||
    Math.hypot(x - 128, y - 215) < 16 ||
    Math.hypot(x - 198, y - 68) < 16 ||
    Math.hypot(x - 206, y - 198) < 14 ||
    Math.hypot(x - 56, y - 56) < 14;

  if (!inMainHall && !inOutpost && caveNoise < 0.54) {
    return 'wall';
  }

  if (y > 188 && fbm(x * 0.09, y * 0.09, 89) > 0.52) {
    return 'cinder';
  }

  if (vn(x * 0.24, y * 0.24, 90) > 0.67 || hash(x, y, 91) < 0.045) {
    return 'glowcap';
  }

  return 'chamber';
}

export function getMoonRoadCell(x: number, y: number): MoonRoadCell {
  const s1 = distToSegment(x, y, 36, 196, 90, 72);
  const s2 = distToSegment(x, y, 90, 72, 130, 125);
  const s3 = distToSegment(x, y, 130, 125, 185, 112);
  const s4 = distToSegment(x, y, 185, 112, 235, 135);
  const s5 = distToSegment(x, y, 130, 125, 126, 214);
  const curveOffset = Math.sin(x * 0.09 + y * 0.07) * 1.35;
  const minRoad = Math.min(s1, s2, s3, s4, s5) + curveOffset;

  if (
    Math.hypot(x - 130, y - 125) < 11 ||
    Math.hypot(x - 90, y - 72) < 8 ||
    Math.hypot(x - 185, y - 112) < 8 ||
    Math.hypot(x - 36, y - 196) < 7 ||
    Math.hypot(x - 126, y - 214) < 7
  ) {
    return 'platform';
  }

  if (Math.hypot(x - 235, y - 135) < 13) {
    return 'silence';
  }

  if (minRoad < 3.6) {
    return 'road';
  }

  const neb = fbm(x * 0.032, y * 0.032, 101);
  if (neb > 0.5) return 'nebula';
  return 'void';
}

export function isGlowdeepWalkable(x: number, y: number): boolean {
  return getGlowdeepCell(x, y) !== 'wall';
}

export function isMoonRoadWalkable(x: number, y: number): boolean {
  const cell = getMoonRoadCell(x, y);
  return cell === 'road' || cell === 'platform' || cell === 'silence';
}
