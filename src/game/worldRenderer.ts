/**
 * Mochi Meadows 2: Storybook World & Atmosphere Renderer
 * High-craft deterministic Canvas renderer with 2.5D Y-sorted props,
 * architectural cottages, faceted boulders, lush canopy trees,
 * shimmering coastlines, Coral Reef domes, Sky Kingdom turrets, and the Great Lantern Tree.
 */

import {
  N,
  T,
  BIOME_COLORS,
  hash,
  Town,
  FishAmbient,
  StarGem,
  Pearl,
  Feather,
  Ring,
  QuestItem,
} from './engine';
import {
  GLOWDEEP_RETURN_TILE,
  MOONROAD_RETURN_TILE,
  getGlowdeepCell,
  getMoonRoadCell,
} from './realmCells';

export interface RealmCollectible {
  x: number;
  y: number;
  got: number;
}

export interface WorldRenderState {
  B: Uint8Array;
  DK: Uint8Array;
  UD: Uint8Array;
  TW: Uint8Array;
  SB: Uint8Array;
  SD: Uint8Array;
  towns: Town[];
  fish: FishAmbient[];
  stars: StarGem[];
  pearls: Pearl[];
  feathers: Feather[];
  rings: Ring[];
  glowSpores?: RealmCollectible[];
  moonNotes?: RealmCollectible[];
  questItems?: QuestItem[];
  glowdeepPortal?: { x: number; y: number; open: boolean };
  moonGatePortal?: { x: number; y: number; open: boolean };
  playerHomePortal?: { x: number; y: number; doorX: number; doorY: number };
  iceMap: Map<number, number>;
  time: number;
}

export interface YSortableItem {
  sortY: number;
  draw: () => void;
}

const OUTLINE = '#3b2a45';

const TOWN_ROOF_PALETTES = [
  { roof: '#e86f88', roofDark: '#bd4c65', roofHi: '#ff9eb4', trim: '#ffe6ee', wall: '#fff7eb', trimWood: '#8d624d' }, // Blossom Rose
  { roof: '#5ea0de', roofDark: '#3c74ad', roofHi: '#90c8f8', trim: '#e6f4ff', wall: '#fdf9f2', trimWood: '#6f5c73' }, // Harbor Sky
  { roof: '#eb9d4d', roofDark: '#bd7229', roofHi: '#ffc27a', trim: '#fff1d6', wall: '#fff9ed', trimWood: '#82573f' }, // Honey Amber
  { roof: '#8574dc', roofDark: '#5b4bb0', roofHi: '#ae9ff5', trim: '#efe9ff', wall: '#fbf6ff', trimWood: '#6c516e' }, // Starlight Lavender
  { roof: '#57b181', roofDark: '#358459', roofHi: '#85d6a9', trim: '#e2faec', wall: '#fcfaf0', trimWood: '#735743' }, // Moss Mint
];

/**
 * Draws lush animated sky or underwater backdrop before world tiles.
 */
export function renderLayerBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cx: number,
  cy: number,
  t: number,
  isSky: boolean,
  isDive: boolean,
  isGlowdeep: boolean = false,
  isMoonRoad: boolean = false
): void {
  if (isMoonRoad) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#070417');
    grad.addColorStop(0.5, '#120a2e');
    grad.addColorStop(1, '#1c1042');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Parallax aurora nebula ribbons & constellations in the cosmic void
    ctx.save();
    for (let i = 0; i < 4; i++) {
      const rx = w * (0.2 + i * 0.22) + Math.sin(t * 0.25 + i) * 45 - (cx * 0.08) % 240;
      const ry = h * (0.25 + (i % 2) * 0.4) + Math.cos(t * 0.2 + i) * 30 - (cy * 0.08) % 180;
      const neb = ctx.createRadialGradient(rx, ry, 20, rx, ry, 260);
      neb.addColorStop(0, i % 2 === 0 ? 'rgba(180, 140, 255, 0.16)' : 'rgba(255, 175, 215, 0.12)');
      neb.addColorStop(1, 'rgba(20, 10, 48, 0)');
      ctx.fillStyle = neb;
      ctx.beginPath();
      ctx.arc(rx, ry, 260, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 65; i++) {
      const sx = (((hash(i, 11, 881) * 2400 - cx * 0.16) % (w + 100)) + (w + 100)) % (w + 100) - 50;
      const sy = (((hash(i, 12, 881) * 1600 - cy * 0.16) % (h + 100)) + (h + 100)) % (h + 100) - 50;
      const tw = 0.35 + 0.55 * Math.abs(Math.sin(t * (1.2 + (i % 4) * 0.4) + i));
      ctx.fillStyle = i % 5 === 0 ? `rgba(255, 224, 130, ${tw.toFixed(2)})` : `rgba(235, 240, 255, ${tw.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, i % 7 === 0 ? 2.1 : 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (isGlowdeep) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#100720');
    grad.addColorStop(0.55, '#190c30');
    grad.addColorStop(1, '#22103d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Soft distant bioluminescent cavern bokeh
    ctx.save();
    for (let i = 0; i < 18; i++) {
      const bx = (((hash(i, 5, 771) * 2200 - cx * 0.15) % (w + 160)) + (w + 160)) % (w + 160) - 80;
      const by = (((hash(i, 6, 771) * 1500 - cy * 0.15) % (h + 160)) + (h + 160)) % (h + 160) - 80;
      const pulse = 0.08 + 0.06 * Math.sin(t * 1.4 + i);
      ctx.fillStyle = i % 2 === 0 ? `rgba(69, 227, 245, ${pulse.toFixed(2)})` : `rgba(180, 140, 255, ${pulse.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(bx, by, 38 + (i % 3) * 18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (isSky) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#4691e2');
    grad.addColorStop(0.5, '#7cc6f6');
    grad.addColorStop(1, '#c5ecff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Slow parallax soft cloud banks drifting far below
    ctx.save();
    for (let i = 0; i < 20; i++) {
      const seedX = hash(i, 1, 801) * 2800;
      const seedY = hash(i, 2, 801) * 1700;
      const rad = 52 + hash(i, 3, 801) * 72;
      const px = ((((seedX - cx * 0.22 + t * (7 + (i % 4) * 2.2)) % (w + 420)) + (w + 420)) % (w + 420)) - 210;
      const py = ((((seedY - cy * 0.22) % (h + 320)) + (h + 320)) % (h + 320)) - 160;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.36)';
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.arc(px + rad * 0.65, py + rad * 0.14, rad * 0.72, 0, Math.PI * 2);
      ctx.arc(px - rad * 0.65, py + rad * 0.18, rad * 0.65, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (isDive) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#135f9c');
    grad.addColorStop(0.55, '#0b3e72');
    grad.addColorStop(1, '#072448');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    return;
  }

  // Deep ocean base with gentle depth gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#2e7cb6');
  grad.addColorStop(1, '#3b8ec9');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Draws diagonal underwater light shafts or sky sun rays AFTER world entities.
 */
export function renderLayerAtmosphereOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  isSky: boolean,
  isDive: boolean,
  isGlowdeep: boolean = false,
  isMoonRoad: boolean = false
): void {
  if (isGlowdeep) {
    ctx.save();
    const g = ctx.createRadialGradient(w * 0.5, h * 0.5, 40, w * 0.5, h * 0.5, Math.max(w, h) * 0.65);
    g.addColorStop(0, 'rgba(100, 245, 200, 0.05)');
    g.addColorStop(0.6, 'rgba(92, 62, 165, 0.08)');
    g.addColorStop(1, 'rgba(14, 7, 26, 0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    return;
  }
  if (isMoonRoad) {
    ctx.save();
    const g = ctx.createRadialGradient(w * 0.5, h * 0.12, 20, w * 0.5, h * 0.12, Math.max(w, h) * 0.72);
    g.addColorStop(0, 'rgba(255, 234, 155, 0.12)');
    g.addColorStop(0.5, 'rgba(165, 130, 255, 0.06)');
    g.addColorStop(1, 'rgba(10, 5, 28, 0.22)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    return;
  }
  if (isDive) {
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const sway = Math.sin(t * 0.7 + i * 1.4) * 38;
      const baseX = (w / 5) * i + sway;
      const bw = 72 + (i % 3) * 30;
      const g = ctx.createLinearGradient(baseX, 0, baseX - 115, h);
      g.addColorStop(0, 'rgba(135, 242, 255, 0.15)');
      g.addColorStop(0.7, 'rgba(90, 210, 240, 0.04)');
      g.addColorStop(1, 'rgba(60, 180, 220, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(baseX, 0);
      ctx.lineTo(baseX + bw, 0);
      ctx.lineTo(baseX + bw - 140, h);
      ctx.lineTo(baseX - 140, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  } else if (isSky) {
    ctx.save();
    const g = ctx.createRadialGradient(w * 0.85, h * 0.1, 20, w * 0.85, h * 0.1, Math.max(w, h) * 0.68);
    g.addColorStop(0, 'rgba(255, 244, 195, 0.25)');
    g.addColorStop(0.45, 'rgba(255, 225, 165, 0.08)');
    g.addColorStop(1, 'rgba(255, 225, 165, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

/**
 * Renders visible terrain tiles with organic shoreline bevels, dappled shadows,
 * swaying tufts, cobblestones, lotus pads, and frost ice.
 */
export function renderTerrainLayer(
  ctx: CanvasRenderingContext2D,
  W: WorldRenderState,
  startX: number,
  endX: number,
  startY: number,
  endY: number
): void {
  const t = W.time;

  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      const i = y * N + x;
      const b = W.B[i];
      const sx = x * T;
      const sy = y * T;
      const h1 = hash(x, y, 301);
      const h2 = hash(x, y, 302);

      // Base Biome Fill
      ctx.fillStyle = BIOME_COLORS[b] || '#9ee087';
      ctx.fillRect(sx, sy, T + 1, T + 1);

      // Water wave shimmer & shoreline foam (Ocean b===0, Shallows b===1)
      if (b === 0 || b === 1) {
        const wave = Math.sin(t * 2.1 + x * 0.6 + y * 0.45);
        if (b === 0) {
          ctx.fillStyle = wave > 0.2 ? 'rgba(145, 224, 255, 0.18)' : 'rgba(16, 62, 118, 0.13)';
          ctx.fillRect(sx, sy, T + 1, T + 1);
          if (h1 < 0.2) {
            const sparkle = 0.24 + 0.24 * Math.abs(Math.sin(t * 2.4 + x * 1.3 + y * 0.9));
            ctx.globalAlpha = sparkle;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.roundRect(sx + 8 + wave * 4, sy + 18, 13, 2.5, 1.25);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
          if (h2 < 0.045) {
            // Sun-glint diamond sparkle on ocean waves
            const glint = Math.max(0, Math.sin(t * 3.1 + x * 2.1 + y));
            if (glint > 0.4) {
              ctx.globalAlpha = glint * 0.55;
              ctx.fillStyle = '#fffce8';
              ctx.beginPath();
              ctx.arc(sx + 20, sy + 14, 2.2, 0, Math.PI * 2);
              ctx.fill();
              ctx.globalAlpha = 1;
            }
          }
        } else {
          ctx.fillStyle = wave > 0 ? 'rgba(255, 255, 255, 0.16)' : 'rgba(55, 168, 214, 0.1)';
          ctx.fillRect(sx, sy, T + 1, T + 1);
          // Delicate caustic lattice shimmer in shallow water
          if (h1 < 0.25) {
            ctx.strokeStyle = 'rgba(220, 250, 255, 0.22)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(sx + T * 0.5 + wave * 2, sy + T * 0.5, 9, 0.2, Math.PI * 1.1);
            ctx.stroke();
          }
          // Seafoam crest adjacent to sand/land
          const upLand = y > 0 && W.B[(y - 1) * N + x] >= 2;
          const downLand = y < N - 1 && W.B[(y + 1) * N + x] >= 2;
          const leftLand = x > 0 && W.B[y * N + (x - 1)] >= 2;
          const rightLand = x < N - 1 && W.B[y * N + (x + 1)] >= 2;
          const foamW = 5.5 + Math.sin(t * 2.8 + x + y) * 1.8;
          if (upLand || downLand || leftLand || rightLand) {
            ctx.fillStyle = 'rgba(255, 253, 246, 0.8)';
            if (upLand) {
              ctx.fillRect(sx, sy, T + 1, foamW);
              ctx.beginPath();
              ctx.arc(sx + T * 0.5, sy + foamW, 6.5, 0, Math.PI);
              ctx.fill();
            }
            if (downLand) {
              ctx.fillRect(sx, sy + T - foamW, T + 1, foamW);
              ctx.beginPath();
              ctx.arc(sx + T * 0.5, sy + T - foamW, 5.5, Math.PI, Math.PI * 2);
              ctx.fill();
            }
            if (leftLand) {
              ctx.fillRect(sx, sy, foamW, T + 1);
            }
            if (rightLand) {
              ctx.fillRect(sx + T - foamW, sy, foamW, T + 1);
            }
          } else if (h1 < 0.045) {
            // Cozy lilypad & pink water blossom in calm shallows
            ctx.fillStyle = '#5bb870';
            ctx.beginPath();
            ctx.arc(sx + T * 0.5, sy + T * 0.5, 6.5, 0.35, Math.PI * 1.9);
            ctx.lineTo(sx + T * 0.5, sy + T * 0.5);
            ctx.fill();
            if (h2 > 0.45) {
              ctx.fillStyle = '#ff9ebb';
              ctx.beginPath();
              ctx.arc(sx + T * 0.5 + 1, sy + T * 0.5 - 1, 2.4, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      } else {
        // Painterly scalloped overlap where distinct land biomes meet (softens grid seams)
        if (y > 0) {
          const upB = W.B[(y - 1) * N + x];
          if (upB >= 2 && upB !== b) {
            ctx.fillStyle = BIOME_COLORS[upB] || '#9ee087';
            ctx.beginPath();
            ctx.arc(sx + 10, sy + 1, 8, 0, Math.PI);
            ctx.arc(sx + 28, sy + 1, 9, 0, Math.PI);
            ctx.fill();
          }
        }
        if (x > 0) {
          const leftB = W.B[y * N + (x - 1)];
          if (leftB >= 2 && leftB !== b) {
            ctx.fillStyle = BIOME_COLORS[leftB] || '#9ee087';
            ctx.beginPath();
            ctx.arc(sx + 1, sy + 11, 8, -Math.PI / 2, Math.PI / 2);
            ctx.arc(sx + 1, sy + 28, 8.5, -Math.PI / 2, Math.PI / 2);
            ctx.fill();
          }
        }

        // Soft sandy/grass edge bevels against water
        const upWater = y > 0 && W.B[(y - 1) * N + x] < 2;
        const downWater = y < N - 1 && W.B[(y + 1) * N + x] < 2;
        if (upWater) {
          ctx.fillStyle = 'rgba(255, 250, 232, 0.42)';
          ctx.fillRect(sx, sy, T + 1, 4.5);
        }
        if (downWater) {
          ctx.fillStyle = 'rgba(55, 42, 35, 0.16)';
          ctx.fillRect(sx, sy + T - 4.5, T + 1, 4.5);
        }

        // Organic subtle micro-texture variation
        if (h1 < 0.38) {
          ctx.fillStyle = h2 > 0.5 ? 'rgba(255, 255, 255, 0.11)' : 'rgba(35, 55, 45, 0.065)';
          ctx.fillRect(sx, sy, T + 1, T + 1);
        }

        // Dappled warm sunlight pockets in Whisper Woods & Blossom Grove
        if ((b === 4 || b === 5) && h1 > 0.78) {
          ctx.fillStyle = b === 5 ? 'rgba(255, 230, 240, 0.18)' : 'rgba(255, 246, 190, 0.16)';
          ctx.beginPath();
          ctx.ellipse(sx + T * 0.5, sy + T * 0.5, 14, 10, h2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Biome ground micro-details
        if (b === 2 && h1 < 0.3) {
          ctx.fillStyle = h2 > 0.5 ? '#e7c88a' : '#fff5dd';
          ctx.beginPath();
          ctx.arc(sx + 10 + h1 * 45, sy + 12 + h2 * 18, 2.3, 0, Math.PI * 2);
          ctx.fill();
        } else if ((b === 3 || b === 4) && h1 < 0.42 && W.TW[i] === 0 && W.DK[i] === 0) {
          const sway = Math.sin(t * 2.4 + x * 0.7 + y * 0.5) * 1.8;
          const gx = sx + 8 + h2 * 22;
          const gy = sy + 16 + h1 * 18;
          ctx.strokeStyle = b === 4 ? '#398a4e' : '#6db85f';
          ctx.lineWidth = 1.7;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(gx, gy + 5);
          ctx.lineTo(gx - 3 + sway, gy - 2.5);
          ctx.moveTo(gx + 3.5, gy + 5);
          ctx.lineTo(gx + 4.5 + sway, gy - 3.5);
          ctx.stroke();
        } else if (b === 5 && h1 < 0.4 && W.DK[i] === 0) {
          ctx.fillStyle = h2 > 0.5 ? 'rgba(255, 165, 200, 0.8)' : 'rgba(255, 236, 245, 0.88)';
          ctx.beginPath();
          ctx.ellipse(sx + 10 + h2 * 22, sy + 12 + h1 * 20, 3, 1.7, h2 * 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (b === 6 && h1 < 0.34) {
          ctx.strokeStyle = 'rgba(218, 162, 72, 0.4)';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(sx + 6, sy + 20);
          ctx.quadraticCurveTo(sx + 20, sy + 14.5, sx + 34, sy + 20);
          ctx.stroke();
        } else if (b === 7 && h1 < 0.38 && W.DK[i] === 0) {
          const tw = 0.4 + 0.5 * Math.sin(t * 3 + h2 * 10);
          ctx.globalAlpha = Math.max(0.1, tw);
          ctx.fillStyle = '#afe1ff';
          ctx.beginPath();
          ctx.arc(sx + h2 * 28 + 5, sy + h1 * 28 + 5, 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        } else if (b === 8 && h1 < 0.35) {
          ctx.fillStyle = 'rgba(65, 62, 84, 0.24)';
          ctx.beginPath();
          ctx.roundRect(sx + 8 + h2 * 16, sy + 10 + h1 * 18, 7, 4.5, 2);
          ctx.fill();
        }
      }

      // Town Plaza Lawn & Cobblestone Roads
      if (W.TW[i] === 1) {
        ctx.fillStyle = 'rgba(182, 234, 152, 0.58)';
        ctx.fillRect(sx, sy, T + 1, T + 1);
        if (h1 < 0.14 && !W.DK[i]) {
          // Delicate plaza clover
          ctx.fillStyle = '#fff5c8';
          ctx.beginPath();
          ctx.arc(sx + 18, sy + 20, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (W.TW[i] === 2) {
        ctx.fillStyle = '#dfd2bc';
        ctx.fillRect(sx, sy, T + 1, T + 1);
        // Rounded masonry cobblestones with highlight rim
        ctx.fillStyle = h1 > 0.5 ? '#d0c0a5' : '#ede2ce';
        ctx.beginPath();
        ctx.roundRect(sx + 2.5, sy + 2.5, 16.5, 15.5, 5);
        ctx.roundRect(sx + 21, sy + 4, 16.5, 14.5, 5);
        ctx.roundRect(sx + 4, sy + 20.5, 15.5, 16, 5);
        ctx.roundRect(sx + 21.5, sy + 20.5, 16, 16, 5);
        ctx.fill();
        ctx.strokeStyle = 'rgba(130, 112, 92, 0.32)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Warm cobblestone curb against lawn
        if (y > 0 && W.TW[(y - 1) * N + x] !== 2) {
          ctx.fillStyle = 'rgba(255, 250, 240, 0.5)';
          ctx.fillRect(sx, sy, T, 2.2);
        }
      }

      // Frost Bridge Ice Tile
      if (W.iceMap.has(i) && W.iceMap.get(i)! > t) {
        ctx.fillStyle = 'rgba(216, 246, 255, 0.94)';
        ctx.fillRect(sx, sy, T + 1, T + 1);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.lineWidth = 1.6;
        ctx.strokeRect(sx + 2, sy + 2, T - 4, T - 4);
        ctx.beginPath();
        ctx.moveTo(sx + 9, sy + 9);
        ctx.lineTo(sx + 17, sy + 17);
        ctx.moveTo(sx + T - 9, sy + 11);
        ctx.lineTo(sx + T - 16, sy + 18);
        ctx.stroke();
      }
    }
  }
}

/**
 * Renders visible Sky Sanctuary tiles & billowy cloud edges.
 */
export function renderSkyTerrain(
  ctx: CanvasRenderingContext2D,
  W: WorldRenderState,
  startX: number,
  endX: number,
  startY: number,
  endY: number
): void {
  const t = W.time;
  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      const i = y * N + x;
      const sb = W.SB[i];
      if (!sb) continue;

      const sx = x * T;
      const sy = y * T;
      const h1 = hash(x, y, 401);

      const emptyBelow = y < N - 1 && W.SB[(y + 1) * N + x] === 0;
      const emptyLeft = x > 0 && W.SB[y * N + (x - 1)] === 0;
      const emptyRight = x < N - 1 && W.SB[y * N + (x + 1)] === 0;

      if (emptyBelow) {
        ctx.fillStyle = 'rgba(218, 240, 255, 0.92)';
        ctx.beginPath();
        ctx.arc(sx + 10, sy + T + 4, 14, 0, Math.PI * 2);
        ctx.arc(sx + 28, sy + T + 6, 15, 0, Math.PI * 2);
        ctx.fill();
      }
      if (emptyLeft) {
        ctx.fillStyle = 'rgba(245, 252, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(sx, sy + T * 0.5, 11, 0, Math.PI * 2);
        ctx.fill();
      }
      if (emptyRight) {
        ctx.fillStyle = 'rgba(245, 252, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(sx + T, sy + T * 0.5, 11, 0, Math.PI * 2);
        ctx.fill();
      }

      if (sb === 2) {
        ctx.fillStyle = '#f8fbff';
        ctx.fillRect(sx, sy, T + 1, T + 1);
        ctx.strokeStyle = 'rgba(182, 206, 240, 0.55)';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 1, sy + 1, T - 2, T - 2);
        if (h1 < 0.28) {
          ctx.fillStyle = 'rgba(255, 218, 120, 0.52)';
          ctx.beginPath();
          ctx.arc(sx + T / 2, sy + T / 2, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (sb === 4) {
        ctx.fillStyle = '#ffe5a8';
        ctx.fillRect(sx, sy, T + 1, T + 1);
        if (h1 < 0.35) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
          ctx.fillRect(sx + 6, sy + 6, T - 12, 4);
        }
      } else if (sb === 3) {
        ctx.fillStyle = '#f2f9ff';
        ctx.fillRect(sx, sy, T + 1, T + 1);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
        ctx.beginPath();
        ctx.arc(sx + 12, sy + 16, 11, 0, Math.PI * 2);
        ctx.arc(sx + 27, sy + 22, 12, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = h1 > 0.5 ? '#b9f0ab' : '#a8e89e';
        ctx.fillRect(sx, sy, T + 1, T + 1);
        if (h1 < 0.32 && !W.SD[i]) {
          const sway = Math.sin(t * 2 + x) * 1.5;
          ctx.strokeStyle = '#6ec478';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(sx + 18, sy + 26);
          ctx.lineTo(sx + 16 + sway, sy + 18);
          ctx.moveTo(sx + 22, sy + 26);
          ctx.lineTo(sx + 24 + sway, sy + 17);
          ctx.stroke();
        }
      }
    }
  }
}

/**
 * Renders Undersea Reef seabed tiles & sand ripples.
 */
export function renderReefTerrain(
  ctx: CanvasRenderingContext2D,
  W: WorldRenderState,
  startX: number,
  endX: number,
  startY: number,
  endY: number
): void {
  const t = W.time;
  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      const i = y * N + x;
      const b = W.B[i];
      const sx = x * T;
      const sy = y * T;
      const h1 = hash(x, y, 501);

      if (b > 1) {
        // Deep Island Wall Cliff under the sea with rocky shelf rim
        ctx.fillStyle = '#132b43';
        ctx.fillRect(sx, sy, T + 1, T + 1);
        ctx.fillStyle = 'rgba(66, 185, 215, 0.18)';
        ctx.beginPath();
        ctx.roundRect(sx + 3, sy + 3, T - 6, 10, 3);
        ctx.fill();
      } else if (b === 1) {
        ctx.fillStyle = '#298fb0';
        ctx.fillRect(sx, sy, T + 1, T + 1);
        if (h1 < 0.38) {
          ctx.strokeStyle = 'rgba(130, 235, 250, 0.28)';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(sx + 6, sy + 22 + Math.sin(t * 1.5 + x) * 1.2);
          ctx.quadraticCurveTo(sx + 20, sy + 17, sx + 34, sy + 22);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = '#154b84';
        ctx.fillRect(sx, sy, T + 1, T + 1);
        if (h1 < 0.24) {
          const glow = 0.08 + 0.06 * Math.sin(t * 2.2 + x + y);
          ctx.fillStyle = `rgba(110, 230, 255, ${glow.toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(sx + T / 2, sy + T / 2, 12, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

/**
 * Helper to draw an illuminated Waystone / Town Fountain.
 */
function drawTownFountainWaystone(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  t: number,
  attuned: boolean
): void {
  ctx.save();
  // Ground aura when attuned for fast travel
  if (attuned) {
    const runeGlow = ctx.createRadialGradient(cx, cy + 6, 6, cx, cy + 6, 38);
    runeGlow.addColorStop(0, 'rgba(122, 228, 255, 0.4)');
    runeGlow.addColorStop(1, 'rgba(122, 228, 255, 0)');
    ctx.fillStyle = runeGlow;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 8, 38, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stone step shadow
  ctx.fillStyle = 'rgba(40, 25, 55, 0.24)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 13, 24, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Carved marble plinth & outer basin
  ctx.fillStyle = '#ddd3c4';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 9, 21.5, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f2ece1';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 6.5, 19.5, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Shimmering water pool inside basin
  ctx.fillStyle = attuned ? '#6fe2ff' : '#94c2e0';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 6.5, 15, 6.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Animated water ripple ring
  const rip = ((t * 0.7) % 1) * 12;
  ctx.strokeStyle = `rgba(255, 255, 255, ${(0.55 * (1 - rip / 12)).toFixed(2)})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 6.5, 3 + rip, (3 + rip) * 0.45, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Pedestal center stem
  ctx.fillStyle = '#e5dccb';
  ctx.fillRect(cx - 3.5, cy - 2, 7, 9);

  // Floating Crystal Spire
  const bob = attuned ? Math.sin(t * 3.2) * 3.2 : 0;
  if (attuned) {
    const aura = ctx.createRadialGradient(cx, cy - 12 + bob, 2, cx, cy - 12 + bob, 32);
    aura.addColorStop(0, 'rgba(130, 240, 255, 0.58)');
    aura.addColorStop(0.6, 'rgba(255, 210, 90, 0.22)');
    aura.addColorStop(1, 'rgba(130, 240, 255, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(cx, cy - 12 + bob, 32, 0, Math.PI * 2);
    ctx.fill();
  }

  // Faceted Waystone Crystal
  ctx.fillStyle = attuned ? '#7beaff' : '#aec3d8';
  ctx.strokeStyle = attuned ? '#ffffff' : '#6c7c92';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 26 + bob);
  ctx.lineTo(cx + 8.5, cy - 10 + bob);
  ctx.lineTo(cx, cy + 3 + bob);
  ctx.lineTo(cx - 8.5, cy - 10 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Bright left crystal facet highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 26 + bob);
  ctx.lineTo(cx, cy + 3 + bob);
  ctx.lineTo(cx - 8.5, cy - 10 + bob);
  ctx.closePath();
  ctx.fill();

  if (attuned) {
    for (let k = 0; k < 2; k++) {
      const a = t * 2.5 + k * Math.PI;
      ctx.fillStyle = k === 0 ? '#ffd23f' : '#ffffff';
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * 15, cy - 10 + bob + Math.sin(a) * 5.2, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Helper to draw a richly detailed 3x2 storybook cottage anchored at `(tx, ty)`.
 */
function drawStorybookCottage(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  t: number
): void {
  const pal = TOWN_ROOF_PALETTES[Math.abs(tx * 7 + ty * 13) % TOWN_ROOF_PALETTES.length];
  const left = tx * T - 6;
  const top = (ty - 1) * T - 18;
  const w = T * 3 + 12;
  const h = T * 2 + 16;
  const cx = left + w / 2;
  const baseY = top + h;

  ctx.save();
  // Ambient soft ground shadow
  ctx.fillStyle = 'rgba(36, 22, 48, 0.24)';
  ctx.beginPath();
  ctx.roundRect(left + 4, baseY - 9, w - 4, 17, 9);
  ctx.fill();

  // Warm window light pools cast onto cobblestone/grass below
  [-34, 34].forEach((ox) => {
    const lg = ctx.createRadialGradient(cx + ox, baseY - 2, 2, cx + ox, baseY + 6, 26);
    lg.addColorStop(0, 'rgba(255, 224, 120, 0.36)');
    lg.addColorStop(1, 'rgba(255, 224, 120, 0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.ellipse(cx + ox, baseY + 4, 24, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Brick Chimney + Curling Smoke Puffs
  const chX = left + w - 26;
  const chY = top + 4;
  ctx.fillStyle = '#b97b68';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(chX, chY, 13, 28, 2);
  ctx.fill();
  ctx.stroke();
  // Chimney stone rim
  ctx.fillStyle = '#d9b5a0';
  ctx.fillRect(chX - 2, chY - 2, 17, 5);
  ctx.strokeRect(chX - 2, chY - 2, 17, 5);

  for (let s = 0; s < 3; s++) {
    const phase = (t * 0.42 + s * 0.33) % 1;
    ctx.fillStyle = `rgba(255, 255, 255, ${(0.52 * (1 - phase)).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(
      chX + 6.5 + Math.sin(t * 2 + s) * 4 + phase * 9,
      chY - 4 - phase * 24,
      3.5 + phase * 5,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Timber & Plaster Cottage Body
  ctx.fillStyle = pal.wall;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(left + 7, top + 36, w - 14, h - 40, 6);
  ctx.fill();
  ctx.stroke();

  // Stone Rubble Plinth Foundation along base
  ctx.fillStyle = '#b6ada4';
  ctx.beginPath();
  ctx.roundRect(left + 6, baseY - 12, w - 12, 9, [2, 2, 5, 5]);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(85, 76, 80, 0.45)';
  ctx.lineWidth = 1;
  for (let st = left + 16; st < left + w - 14; st += 14) {
    ctx.beginPath();
    ctx.moveTo(st, baseY - 11);
    ctx.lineTo(st - 2, baseY - 3);
    ctx.stroke();
  }

  // Timber Framing Posts & Horizontal Beam
  ctx.fillStyle = pal.trimWood;
  ctx.fillRect(left + 7, top + 36, 7, h - 48);
  ctx.fillRect(left + w - 14, top + 36, 7, h - 48);
  ctx.fillRect(left + 7, top + 36, w - 14, 5);

  // Welcoming Stone Stoop
  ctx.fillStyle = '#e7dfd4';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(cx - 17, baseY - 4, 34, 6, 3);
  ctx.fill();
  ctx.stroke();

  // Pitched Roof with Under-Eave Shadow & Shingle Texture
  ctx.fillStyle = pal.roofDark;
  ctx.beginPath();
  ctx.moveTo(left - 3, top + 42);
  ctx.lineTo(cx, top);
  ctx.lineTo(left + w + 3, top + 42);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = pal.roof;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left - 2, top + 39);
  ctx.lineTo(cx, top - 2);
  ctx.lineTo(left + w + 2, top + 39);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Sunlit roof slope highlight
  ctx.fillStyle = pal.roofHi;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.moveTo(left + 2, top + 38);
  ctx.lineTo(cx, top + 1);
  ctx.lineTo(cx - 6, top + 38);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Roof Shingle Scallop Rows
  ctx.strokeStyle = pal.roofDark;
  ctx.lineWidth = 1.2;
  for (let row = 0; row < 2; row++) {
    const ry = top + 18 + row * 12;
    const span = row === 0 ? 34 : 58;
    ctx.beginPath();
    for (let sx = cx - span; sx < cx + span; sx += 11) {
      ctx.arc(sx + 5.5, ry, 5.5, 0, Math.PI);
    }
    ctx.stroke();
  }

  // Gable Accent Triangle & Attic Round Window
  ctx.fillStyle = pal.trim;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(cx, top + 24, 8.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffe58f';
  ctx.beginPath();
  ctx.arc(cx, top + 24, 5, 0, Math.PI * 2);
  ctx.fill();

  // Arched Paneled Oak Front Door + Warm Entry Lantern
  ctx.fillStyle = '#855642';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(cx - 12, baseY - 36, 24, 33, [12, 12, 2, 2]);
  ctx.fill();
  ctx.stroke();
  // Door plank lines & brass knob
  ctx.strokeStyle = 'rgba(59, 42, 69, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 4, baseY - 33);
  ctx.lineTo(cx - 4, baseY - 4);
  ctx.moveTo(cx + 4, baseY - 33);
  ctx.lineTo(cx + 4, baseY - 4);
  ctx.stroke();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(cx + 6.5, baseY - 19, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Entry Porch Sconce Lantern
  ctx.fillStyle = '#ffe57f';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx + 16.5, baseY - 29, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Shuttered Glowing Bay Windows + Flowerboxes
  [-33, 33].forEach((ox) => {
    const wx = cx + ox - 9;
    const wy = baseY - 34;

    // Shutters
    ctx.fillStyle = pal.roof;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.2;
    ctx.fillRect(wx - 4.5, wy + 1, 4.5, 15);
    ctx.strokeRect(wx - 4.5, wy + 1, 4.5, 15);
    ctx.fillRect(wx + 18, wy + 1, 4.5, 15);
    ctx.strokeRect(wx + 18, wy + 1, 4.5, 15);

    // Warm glass panes
    ctx.fillStyle = '#ffe484';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(wx, wy, 18, 17, 3.5);
    ctx.fill();
    ctx.stroke();

    // Crossbars
    ctx.beginPath();
    ctx.moveTo(wx + 9, wy);
    ctx.lineTo(wx + 9, wy + 17);
    ctx.moveTo(wx, wy + 8.5);
    ctx.lineTo(wx + 18, wy + 8.5);
    ctx.stroke();

    // Planter box + Blooms
    ctx.fillStyle = '#7d543e';
    ctx.fillRect(wx - 2, wy + 16.5, 22, 4.5);
    ctx.fillStyle = '#5bb870';
    ctx.fillRect(wx - 1, wy + 14.5, 20, 3);
    ctx.fillStyle = '#ff7aa8';
    ctx.beginPath();
    ctx.arc(wx + 3, wy + 15, 2.6, 0, Math.PI * 2);
    ctx.arc(wx + 9, wy + 14, 2.6, 0, Math.PI * 2);
    ctx.arc(wx + 15, wy + 15, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(wx + 6, wy + 15.5, 1.5, 0, Math.PI * 2);
    ctx.arc(wx + 12, wy + 15.2, 1.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

/**
 * Draws an individual surface prop (`dk` id) centered at `(cx, cy)`.
 */
function drawSurfacePropAt(
  ctx: CanvasRenderingContext2D,
  dk: number,
  x: number,
  y: number,
  t: number,
  towns: Town[]
): void {
  const cx = x * T + T / 2;
  const cy = y * T + T / 2;
  const h1 = hash(x, y, 601);
  const h2 = hash(x, y, 602);

  if (dk === 10) {
    drawStorybookCottage(ctx, x, y, t);
    return;
  }
  if (dk === 14) {
    const town = towns.find((tw) => !tw.w && Math.hypot(tw.x - x, tw.y - y) <= 2);
    drawTownFountainWaystone(ctx, cx, cy, t, Boolean(town?.vis));
    return;
  }
  if (dk === 13) {
    // Ornate Wrought-Iron Lantern Post with ground pool
    const flicker = 0.92 + Math.sin(t * 7 + x) * 0.08;
    const groundGlow = ctx.createRadialGradient(cx, cy + 10, 2, cx, cy + 10, 30);
    groundGlow.addColorStop(0, `rgba(255, 224, 120, ${(0.35 * flicker).toFixed(2)})`);
    groundGlow.addColorStop(1, 'rgba(255, 224, 120, 0)');
    ctx.fillStyle = groundGlow;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, 30, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    const halo = ctx.createRadialGradient(cx + 3, cy - 18, 2, cx + 3, cy - 18, 38);
    halo.addColorStop(0, `rgba(255, 232, 130, ${(0.55 * flicker).toFixed(2)})`);
    halo.addColorStop(1, 'rgba(255, 232, 130, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx + 3, cy - 18, 38, 0, Math.PI * 2);
    ctx.fill();

    // Base plinth + iron post
    ctx.fillStyle = '#3f344c';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(cx - 5, cy + 6, 10, 6, 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#4f425e';
    ctx.fillRect(cx - 2, cy - 22, 4, 30);
    // Decorative crook arm
    ctx.strokeStyle = '#3f344c';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 22);
    ctx.quadraticCurveTo(cx + 5, cy - 27, cx + 7, cy - 21);
    ctx.stroke();

    // Glass lantern cage
    ctx.fillStyle = '#ffe57f';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.roundRect(cx + 2, cy - 21, 10, 11, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx + 7, cy - 15.5, 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (dk === 11) {
    // Storybook Garden Bench with Backrest & Armrests
    ctx.fillStyle = 'rgba(40, 30, 50, 0.22)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Backrest slats
    ctx.fillStyle = '#996040';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.roundRect(cx - 14, cy - 12, 28, 7, 2);
    ctx.fill();
    ctx.stroke();

    // Seat plank
    ctx.fillStyle = '#bc7d54';
    ctx.beginPath();
    ctx.roundRect(cx - 15, cy - 3, 30, 7.5, 2.5);
    ctx.fill();
    ctx.stroke();

    // Cast-iron legs
    ctx.fillStyle = '#4c415c';
    ctx.fillRect(cx - 12, cy + 4, 3.5, 6);
    ctx.fillRect(cx + 8.5, cy + 4, 3.5, 6);
    return;
  }

  if (dk === 12) {
    // Pointed Wooden Signpost
    ctx.fillStyle = 'rgba(40, 30, 50, 0.2)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 12, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6f4c38';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.2;
    ctx.fillRect(cx - 2.5, cy - 7, 5, 20);
    ctx.strokeRect(cx - 2.5, cy - 7, 5, 20);
    ctx.fillStyle = '#e5bc8a';
    ctx.beginPath();
    ctx.roundRect(cx - 13, cy - 16, 26, 12, 3);
    ctx.fill();
    ctx.stroke();
    // Tiny painted text lines
    ctx.fillStyle = '#8b5e42';
    ctx.fillRect(cx - 8, cy - 12, 16, 2);
    ctx.fillRect(cx - 8, cy - 8.5, 11, 1.8);
    return;
  }

  if (dk === 1) {
    // Flowering Shrub Bush with Rim Lighting
    ctx.fillStyle = 'rgba(30, 50, 38, 0.2)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, 14, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3b8b51';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx - 5.5, cy + 2.5, 9.2, 0, Math.PI * 2);
    ctx.arc(cx + 6, cy + 2.5, 8.8, 0, Math.PI * 2);
    ctx.arc(cx, cy - 4, 10.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Bright upper leaf puff
    ctx.fillStyle = '#63be74';
    ctx.beginPath();
    ctx.arc(cx - 1, cy - 5, 7, 0, Math.PI * 2);
    ctx.fill();

    // Blossoms
    ctx.fillStyle = h1 > 0.5 ? '#ff8fb8' : '#ffe373';
    ctx.beginPath();
    ctx.arc(cx - 5, cy - 3, 2.4, 0, Math.PI * 2);
    ctx.arc(cx + 5, cy + 1, 2.4, 0, Math.PI * 2);
    ctx.arc(cx + 1, cy - 7, 2.1, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (dk === 2 || dk === 4 || dk === 7) {
    // Lush Storybook Trees (Whisper Oak = 2, Cherry Blossom = 4, Frost Pine = 7)
    const sway = Math.sin(t * 1.35 + x * 0.5 + y * 0.3) * 1.7;
    ctx.fillStyle = 'rgba(26, 28, 45, 0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 13, 19, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flared Roots & Bark Trunk
    ctx.fillStyle = dk === 4 ? '#724952' : '#6b4939';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 12);
    ctx.quadraticCurveTo(cx - 4.5, cy + 3, cx - 5, cy - 10);
    ctx.lineTo(cx + 5, cy - 10);
    ctx.quadraticCurveTo(cx + 4.5, cy + 3, cx + 8, cy + 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Subtle bark highlight
    ctx.fillStyle = 'rgba(255, 230, 205, 0.16)';
    ctx.fillRect(cx - 2.5, cy - 6, 2.5, 16);

    if (dk === 7) {
      // Multi-tiered Snow-Frosted Evergreen Pine
      const tiers = [
        { dy: -3, w: 20, h: 19, c: '#34685e', cap: '#629d91' },
        { dy: -14, w: 15.5, h: 16.5, c: '#447f73', cap: '#cceaff' },
        { dy: -25, w: 10.5, h: 14, c: '#6eb2a3', cap: '#eef9ff' },
      ];
      tiers.forEach((tier, idx) => {
        const sxTip = cx + sway * (0.4 + idx * 0.3);
        ctx.fillStyle = tier.c;
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sxTip, cy + tier.dy - tier.h);
        ctx.lineTo(cx + tier.w, cy + tier.dy);
        ctx.quadraticCurveTo(cx, cy + tier.dy + 3, cx - tier.w, cy + tier.dy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Snow/sunlight frost cap on upper slope
        if (idx > 0) {
          ctx.fillStyle = tier.cap;
          ctx.beginPath();
          ctx.moveTo(sxTip, cy + tier.dy - tier.h + 1);
          ctx.lineTo(cx + tier.w * 0.68, cy + tier.dy - tier.h * 0.3);
          ctx.quadraticCurveTo(cx, cy + tier.dy - tier.h * 0.2, cx - tier.w * 0.68, cy + tier.dy - tier.h * 0.3);
          ctx.closePath();
          ctx.fill();
        }
      });
    } else {
      const shades =
        dk === 4
          ? ['#e57da8', '#fba7c8', '#ffd5e7']
          : ['#327d4e', '#469e64', '#72cb86'];

      // Deep lower bough cluster (with crisp outline)
      ctx.fillStyle = shades[0];
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(cx + sway * 0.45, cy - 15, 18.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Side foliage lobes
      ctx.fillStyle = shades[1];
      ctx.beginPath();
      ctx.arc(cx - 9 + sway * 0.75, cy - 12, 12.2, 0, Math.PI * 2);
      ctx.arc(cx + 9 + sway * 0.75, cy - 12, 12.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Sunlit crown puff
      ctx.fillStyle = shades[2];
      ctx.beginPath();
      ctx.arc(cx - 3 + sway, cy - 23, 11, 0, Math.PI * 2);
      ctx.fill();

      // Apples / Blossoms inside canopy
      if (dk === 4) {
        ctx.fillStyle = '#fff5fa';
        [[-8, -15], [6, -18], [-1, -8]].forEach(([bx, by]) => {
          ctx.beginPath();
          ctx.arc(cx + bx + sway * 0.7, cy + by, 2.2, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (h1 < 0.45) {
        ctx.fillStyle = h2 > 0.5 ? '#ff7b7b' : '#ffd23f';
        [[-7, -14], [7, -16], [1, -9]].forEach(([fx, fy]) => {
          ctx.beginPath();
          ctx.arc(cx + fx + sway * 0.7, cy + fy, 2.2, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }
    return;
  }

  if (dk === 3) {
    // Enchanted Spotted Toadstool Cluster
    ctx.fillStyle = 'rgba(40, 25, 45, 0.18)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    [
      [-6, 4, 6],
      [5, 2, 7.8],
    ].forEach(([ox, oy, r]) => {
      ctx.fillStyle = '#fff4e4';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.2;
      ctx.fillRect(cx + ox - 2.3, cy + oy, 4.6, 7);
      ctx.strokeRect(cx + ox - 2.3, cy + oy, 4.6, 7);
      ctx.fillStyle = '#ff6b8b';
      ctx.beginPath();
      ctx.arc(cx + ox, cy + oy, r, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx + ox - 2.2, cy + oy - r * 0.48, 1.4, 0, Math.PI * 2);
      ctx.arc(cx + ox + 2.2, cy + oy - r * 0.35, 1.2, 0, Math.PI * 2);
      ctx.fill();
    });
    return;
  }

  if (dk === 5) {
    // Sculpted Desert Cactus with Bloom
    ctx.fillStyle = 'rgba(80, 50, 20, 0.22)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 12, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4ea163';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(cx - 4.8, cy - 15, 9.6, 27, 4.8);
    ctx.roundRect(cx - 12.5, cy - 7, 8, 5, 2.5);
    ctx.roundRect(cx - 12.5, cy - 13, 4.8, 9, 2.4);
    ctx.roundRect(cx + 4.5, cy - 4, 8, 5, 2.5);
    ctx.roundRect(cx + 7.7, cy - 11, 4.8, 10, 2.4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff7aa8';
    ctx.beginPath();
    ctx.arc(cx, cy - 16, 3.2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (dk === 6) {
    // Faceted Sculpted Boulder Cluster with Moss Cap
    ctx.fillStyle = 'rgba(28, 26, 44, 0.25)';
    ctx.beginPath();
    ctx.ellipse(cx + 1, cy + 10, 17, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main faceted rock body
    ctx.fillStyle = '#7e7d94';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy + 9);
    ctx.lineTo(cx - 12, cy - 4);
    ctx.lineTo(cx - 3, cy - 11);
    ctx.lineTo(cx + 8, cy - 7);
    ctx.lineTo(cx + 14, cy + 6);
    ctx.lineTo(cx + 8, cy + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sunlit top-left facet
    ctx.fillStyle = '#adaec4';
    ctx.beginPath();
    ctx.moveTo(cx - 11.5, cy - 3.5);
    ctx.lineTo(cx - 3, cy - 10);
    ctx.lineTo(cx + 5, cy - 5);
    ctx.lineTo(cx - 3, cy + 2);
    ctx.closePath();
    ctx.fill();

    // Cozy Moss Cushion Cap on stone
    if (h1 < 0.72) {
      ctx.fillStyle = '#65be78';
      ctx.beginPath();
      ctx.ellipse(cx - 3, cy - 7.5, 6.5, 3.2, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Companion pebble
    ctx.fillStyle = '#8b8aa3';
    ctx.beginPath();
    ctx.arc(cx + 11, cy + 8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    return;
  }

  if (dk === 8) {
    // Conch Shell
    ctx.fillStyle = '#ffd1df';
    ctx.strokeStyle = '#c86e8f';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 7.2, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff0f5';
    ctx.beginPath();
    ctx.arc(cx - 2, cy + 1, 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (dk === 9) {
    // Swaying Trio of Wildflowers
    const sw = Math.sin(t * 2.3 + x + y) * 1.6;
    const colors = ['#ff7aa8', '#ffd84d', '#8ed0ff'];
    [
      [-6, 3, 0],
      [0, -4, 1],
      [6, 4, 2],
    ].forEach(([ox, oy, ci]) => {
      ctx.fillStyle = '#5bb367';
      ctx.fillRect(cx + ox - 0.8, cy + oy + 2, 1.6, 6);
      ctx.fillStyle = colors[(ci + Math.floor(h1 * 3)) % 3];
      ctx.beginPath();
      ctx.arc(cx + ox + sw, cy + oy, 3.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff7cc';
      ctx.beginPath();
      ctx.arc(cx + ox + sw, cy + oy, 1.25, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

/**
 * Collects Y-sorted Surface props (also renders flat ground petals/shells directly) for true 2.5D depth sorting.
 */
export function collectSurfacePropDrawables(
  ctx: CanvasRenderingContext2D,
  W: WorldRenderState,
  startX: number,
  endX: number,
  startY: number,
  endY: number
): YSortableItem[] {
  const items: YSortableItem[] = [];
  const t = W.time;
  const minX = Math.max(0, startX - 4);
  const maxX = Math.min(N - 1, endX + 4);
  const minY = Math.max(0, startY - 3);
  const maxY = Math.min(N - 1, endY + 4);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dk = W.DK[y * N + x];
      if (!dk || dk === 16) continue;

      if (dk === 8 || dk === 9) {
        // Ground-hugging shells & wildflowers always draw under creatures
        drawSurfacePropAt(ctx, dk, x, y, t, W.towns);
        continue;
      }

      const sortY = dk === 10 ? y * T + T * 0.92 : y * T + T * 0.72;
      const tileX = x;
      const tileY = y;
      const dkId = dk;
      items.push({
        sortY,
        draw: () => drawSurfacePropAt(ctx, dkId, tileX, tileY, t, W.towns),
      });
    }
  }
  return items;
}

/**
 * Legacy helper: draws Surface decorations without interleaving characters.
 */
export function renderSurfaceDecorations(
  ctx: CanvasRenderingContext2D,
  W: WorldRenderState,
  startX: number,
  endX: number,
  startY: number,
  endY: number
): void {
  const items = collectSurfacePropDrawables(ctx, W, startX, endX, startY, endY);
  items.sort((a, b) => a.sortY - b.sortY);
  for (const it of items) it.draw();
}

/**
 * Collects Y-sorted Sky Sanctuary props.
 */
export function collectSkyPropDrawables(
  ctx: CanvasRenderingContext2D,
  W: WorldRenderState,
  startX: number,
  endX: number,
  startY: number,
  endY: number
): YSortableItem[] {
  const items: YSortableItem[] = [];
  const t = W.time;
  for (let y = Math.max(0, startY - 2); y <= Math.min(N - 1, endY + 2); y++) {
    for (let x = Math.max(0, startX - 2); x <= Math.min(N - 1, endX + 2); x++) {
      const sd = W.SD[y * N + x];
      if (!sd) continue;

      const cx = x * T + T / 2;
      const cy = y * T + T / 2;
      const sway = Math.sin(t * 2 + x + y) * 2;
      const sortY = y * T + T * 0.74;

      items.push({
        sortY,
        draw: () => {
          if (sd === 1) {
            ctx.fillStyle = 'rgba(70, 90, 140, 0.18)';
            ctx.beginPath();
            ctx.ellipse(cx, cy + 12, 15, 5.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#c49b8f';
            ctx.strokeStyle = OUTLINE;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.roundRect(cx - 4, cy - 6, 8, 18, 3);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#ffbbd6';
            ctx.beginPath();
            ctx.arc(cx + sway * 0.6, cy - 15, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#ffeef5';
            ctx.beginPath();
            ctx.arc(cx - 4.5 + sway, cy - 19, 8.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (sd === 2) {
            ctx.fillStyle = '#ffd23f';
            ctx.strokeStyle = OUTLINE;
            ctx.lineWidth = 1.2;
            ctx.fillRect(cx - 2.5, cy - 18, 5, 29);
            ctx.strokeRect(cx - 2.5, cy - 18, 5, 29);
            ctx.fillStyle = '#fff1a6';
            ctx.beginPath();
            ctx.arc(cx + sway, cy - 21, 6.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          } else if (sd === 3) {
            const bob = Math.sin(t * 2.5 + x) * 3.5;
            const halo = ctx.createRadialGradient(cx, cy - 10 + bob, 2, cx, cy - 10 + bob, 20);
            halo.addColorStop(0, 'rgba(255, 236, 138, 0.5)');
            halo.addColorStop(1, 'rgba(255, 236, 138, 0)');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(cx, cy - 10 + bob, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffe585';
            ctx.strokeStyle = OUTLINE;
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.arc(cx, cy - 10 + bob, 6.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          } else if (sd === 9) {
            // Cirrus Castle Pearly Turret Pillar with Banner & Lancet Window
            ctx.fillStyle = 'rgba(90, 115, 165, 0.22)';
            ctx.beginPath();
            ctx.ellipse(cx, cy + 12, 15, 5.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#7590c2';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.roundRect(cx - 11.5, cy - 17, 23, 29, 3);
            ctx.fill();
            ctx.stroke();
            // Stained glass arched window
            ctx.fillStyle = '#ffe484';
            ctx.beginPath();
            ctx.roundRect(cx - 3.5, cy - 9, 7, 10, [4, 4, 1, 1]);
            ctx.fill();
            // Pastel Spire Roof
            ctx.fillStyle = (x + y) % 2 === 0 ? '#8eb2ff' : '#ff8fb8';
            ctx.strokeStyle = OUTLINE;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(cx - 14, cy - 17);
            ctx.lineTo(cx, cy - 34);
            ctx.lineTo(cx + 14, cy - 17);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Fluttering Silk Pennant
            ctx.fillStyle = '#ffd23f';
            ctx.beginPath();
            ctx.moveTo(cx, cy - 34);
            ctx.lineTo(cx + 8 + Math.sin(t * 5 + x) * 2, cy - 31);
            ctx.lineTo(cx, cy - 28);
            ctx.closePath();
            ctx.fill();
          }
        },
      });
    }
  }
  return items;
}

export function renderSkyDecorations(
  ctx: CanvasRenderingContext2D,
  W: WorldRenderState,
  startX: number,
  endX: number,
  startY: number,
  endY: number
): void {
  const items = collectSkyPropDrawables(ctx, W, startX, endX, startY, endY);
  items.sort((a, b) => a.sortY - b.sortY);
  for (const it of items) it.draw();
}

/**
 * Collects Y-sorted Undersea Reef props + draws fish schools.
 */
export function collectReefPropDrawables(
  ctx: CanvasRenderingContext2D,
  W: WorldRenderState,
  startX: number,
  endX: number,
  startY: number,
  endY: number
): YSortableItem[] {
  const items: YSortableItem[] = [];
  const t = W.time;
  for (let y = Math.max(0, startY - 3); y <= Math.min(N - 1, endY + 3); y++) {
    for (let x = Math.max(0, startX - 3); x <= Math.min(N - 1, endX + 3); x++) {
      const ud = W.UD[y * N + x];
      if (!ud || ud === 6) continue;

      const cx = x * T + T / 2;
      const cy = y * T + T / 2;
      const h1 = hash(x, y, 701);
      const sortY = ud === 5 ? y * T + T * 0.92 : y * T + T * 0.72;

      items.push({
        sortY,
        draw: () => {
          if (ud === 1) {
            ctx.strokeStyle = h1 > 0.5 ? '#2ebd85' : '#40d69b';
            ctx.lineWidth = 4.2;
            ctx.lineCap = 'round';
            [-5, 4].forEach((ox, k) => {
              const sw = Math.sin(t * 2.2 + x + k * 1.4) * 5.2;
              ctx.beginPath();
              ctx.moveTo(cx + ox, cy + 12);
              ctx.quadraticCurveTo(cx + ox + sw, cy - 2, cx + ox - sw * 0.6, cy - 20);
              ctx.stroke();
            });
          } else if (ud === 2) {
            const colors = ['#ff7aa8', '#ff9f43', '#b48cff', '#ff6b8b'];
            const c = colors[Math.floor(h1 * colors.length) % colors.length];
            ctx.strokeStyle = c;
            ctx.lineWidth = 4.8;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx, cy + 12);
            ctx.lineTo(cx, cy - 7);
            ctx.moveTo(cx, cy + 2);
            ctx.lineTo(cx - 10, cy - 9);
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + 10, cy - 10);
            ctx.stroke();
            ctx.fillStyle = '#ffe9f2';
            [[0, -7], [-10, -9], [10, -10]].forEach(([ox, oy]) => {
              ctx.beginPath();
              ctx.arc(cx + ox, cy + oy, 2.5, 0, Math.PI * 2);
              ctx.fill();
            });
          } else if (ud === 3) {
            const pulse = 1 + Math.sin(t * 3 + x) * 0.14;
            ctx.fillStyle = '#c58cff';
            for (let k = 0; k < 6; k++) {
              const a = (k / 6) * Math.PI * 2 + Math.sin(t * 2 + k) * 0.15;
              ctx.beginPath();
              ctx.ellipse(cx + Math.cos(a) * 6 * pulse, cy + Math.sin(a) * 5 * pulse, 4.2, 2.3, a, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = '#ffe27a';
            ctx.beginPath();
            ctx.arc(cx, cy, 3.8, 0, Math.PI * 2);
            ctx.fill();
          } else if (ud === 4) {
            ctx.fillStyle = '#ffd6eb';
            ctx.strokeStyle = '#c880a4';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(cx, cy + 4, 9.5, Math.PI, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } else if (ud === 5) {
            const bx = cx + T;
            const by = cy - T * 0.35;
            ctx.fillStyle = 'rgba(20, 40, 75, 0.25)';
            ctx.beginPath();
            ctx.ellipse(bx, by + 9, 44, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(130, 235, 255, 0.26)';
            ctx.strokeStyle = 'rgba(210, 250, 255, 0.9)';
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            ctx.arc(bx, by + 6, 45, Math.PI, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Specular highlight arc on bubble glass
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(bx, by + 6, 37, Math.PI * 1.15, Math.PI * 1.45);
            ctx.stroke();
            // Cozy inner coral cottage
            ctx.fillStyle = '#ff9bc0';
            ctx.strokeStyle = OUTLINE;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.roundRect(bx - 19, by - 14, 38, 20, 6);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#ffe588';
            ctx.beginPath();
            ctx.arc(bx - 8, by - 4, 4.2, 0, Math.PI * 2);
            ctx.arc(bx + 8, by - 4, 4.2, 0, Math.PI * 2);
            ctx.fill();
          } else if (ud === 7) {
            const glow = ctx.createRadialGradient(cx, cy - 10, 2, cx, cy - 10, 34);
            glow.addColorStop(0, 'rgba(110, 250, 240, 0.52)');
            glow.addColorStop(1, 'rgba(110, 250, 240, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(cx, cy - 10, 34, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#7bf5ea';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(cx, cy - 10 + Math.sin(t * 3 + x) * 2, 7.2, Math.PI, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        },
      });
    }
  }

  // Swimming ambient fish schools added to Y-sorted queue
  const viewLeft = startX * T - 40;
  const viewRight = (endX + 1) * T + 40;
  const viewTop = startY * T - 40;
  const viewBottom = (endY + 1) * T + 40;
  for (const f of W.fish) {
    if (f.hx < viewLeft || f.hx > viewRight || f.hy < viewTop || f.hy > viewBottom) continue;
    const ang = t * (0.9 / Math.max(0.5, f.s)) + f.ph;
    const fx = f.hx + Math.cos(ang) * f.R;
    const fy = f.hy + Math.sin(ang * 1.3) * (f.R * 0.55);
    const dir = -Math.sin(ang) >= 0 ? 1 : -1;
    items.push({
      sortY: fy,
      draw: () => {
        ctx.save();
        ctx.translate(fx, fy);
        ctx.scale(dir * (0.65 + f.s * 0.25), 0.65 + f.s * 0.25);
        const tailWag = Math.sin(t * 10 + f.ph) * 2.5;
        ctx.fillStyle = f.c;
        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.lineTo(-14, -5 + tailWag);
        ctx.lineTo(-14, 5 + tailWag);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(4.5, -1.2, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(5.1, -1.2, 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      },
    });
  }

  return items;
}

export function renderReefDecorations(
  ctx: CanvasRenderingContext2D,
  W: WorldRenderState,
  startX: number,
  endX: number,
  startY: number,
  endY: number
): void {
  const items = collectReefPropDrawables(ctx, W, startX, endX, startY, endY);
  items.sort((a, b) => a.sortY - b.sortY);
  for (const it of items) it.draw();
}

/**
 * Renders Glowdeep Caverns (Layer 3) subterranean basalt walls, bioluminescent canals,
 * Nana Mochi's golden taproots, and thermal cinder magma veins.
 */
export function renderGlowdeepTerrain(
  ctx: CanvasRenderingContext2D,
  W: WorldRenderState,
  startX: number,
  endX: number,
  startY: number,
  endY: number
): void {
  const t = W.time;
  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      const cell = getGlowdeepCell(x, y);
      const sx = x * T;
      const sy = y * T;
      const h1 = hash(x, y, 331);
      const h2 = hash(x, y, 332);

      if (cell === 'wall') {
        ctx.fillStyle = h1 > 0.5 ? '#1b1130' : '#21153a';
        ctx.fillRect(sx, sy, T + 1, T + 1);
        // Faceted quartz rock ledge when adjacent to walkable cavern
        const downOpen = y < N - 1 && getGlowdeepCell(x, y + 1) !== 'wall';
        if (downOpen) {
          ctx.fillStyle = '#3a265e';
          ctx.fillRect(sx, sy + T - 9, T + 1, 9);
          ctx.fillStyle = 'rgba(180, 140, 255, 0.25)';
          ctx.fillRect(sx + 2, sy + T - 3, T - 4, 2);
        } else if (h2 < 0.18) {
          ctx.fillStyle = 'rgba(180, 140, 255, 0.14)';
          ctx.beginPath();
          ctx.moveTo(sx + 14, sy + 10);
          ctx.lineTo(sx + 22, sy + 20);
          ctx.lineTo(sx + 10, sy + 26);
          ctx.closePath();
          ctx.fill();
        }
      } else if (cell === 'canal') {
        ctx.fillStyle = '#18a8c7';
        ctx.fillRect(sx, sy, T + 1, T + 1);
        const wave = Math.sin(t * 2.4 + x * 0.7 + y * 0.5);
        ctx.fillStyle = wave > 0 ? 'rgba(145, 252, 255, 0.34)' : 'rgba(20, 96, 138, 0.28)';
        ctx.fillRect(sx, sy, T + 1, T + 1);
        if (h1 < 0.3) {
          ctx.strokeStyle = 'rgba(235, 255, 255, 0.55)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(sx + 7, sy + 18 + wave * 2);
          ctx.quadraticCurveTo(sx + 20, sy + 14, sx + 32, sy + 18 + wave * 2);
          ctx.stroke();
        }
      } else if (cell === 'roots') {
        ctx.fillStyle = '#3f2957';
        ctx.fillRect(sx, sy, T + 1, T + 1);
        // Golden glowing root weave
        ctx.strokeStyle = 'rgba(255, 212, 92, 0.45)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sx + 2, sy + (h1 > 0.5 ? 8 : 30));
        ctx.quadraticCurveTo(sx + 20, sy + 20, sx + 38, sy + (h2 > 0.5 ? 30 : 8));
        ctx.stroke();
        if (h1 < 0.25) {
          ctx.fillStyle = 'rgba(255, 232, 130, 0.35)';
          ctx.beginPath();
          ctx.arc(sx + 20, sy + 20, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (cell === 'cinder') {
        ctx.fillStyle = '#471e38';
        ctx.fillRect(sx, sy, T + 1, T + 1);
        if (h1 < 0.36) {
          const glow = 0.28 + 0.16 * Math.sin(t * 2.5 + x + y);
          ctx.fillStyle = `rgba(255, 118, 84, ${glow.toFixed(2)})`;
          ctx.beginPath();
          ctx.ellipse(sx + 20, sy + 20, 12, 6, h2 * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (cell === 'glowcap') {
        ctx.fillStyle = '#2d1c4c';
        ctx.fillRect(sx, sy, T + 1, T + 1);
        ctx.fillStyle = 'rgba(98, 245, 192, 0.16)';
        ctx.beginPath();
        ctx.arc(sx + 20, sy + 20, 15, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = h1 > 0.5 ? '#2c1c48' : '#322052';
        ctx.fillRect(sx, sy, T + 1, T + 1);
        if (h1 < 0.16) {
          ctx.fillStyle = 'rgba(130, 235, 245, 0.18)';
          ctx.beginPath();
          ctx.arc(sx + 12 + h2 * 16, sy + 14 + h1 * 40, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

/**
 * Collects Y-sorted Glowdeep Caverns props: glowing mushrooms, Nana Mochi's cauldron,
 * moored gondola, amethyst spires, and the Surface Ascent Portal.
 */
export function collectGlowdeepPropDrawables(
  ctx: CanvasRenderingContext2D,
  W: WorldRenderState,
  startX: number,
  endX: number,
  startY: number,
  endY: number
): YSortableItem[] {
  const items: YSortableItem[] = [];
  const t = W.time;
  for (let y = Math.max(0, startY - 2); y <= Math.min(N - 1, endY + 2); y++) {
    for (let x = Math.max(0, startX - 2); x <= Math.min(N - 1, endX + 2); x++) {
      const cell = getGlowdeepCell(x, y);
      const h1 = hash(x, y, 731);
      const cx = x * T + T / 2;
      const cy = y * T + T / 2;

      if (cell === 'glowcap' && h1 < 0.52) {
        const isMint = hash(x, y, 732) > 0.42;
        items.push({
          sortY: y * T + T * 0.72,
          draw: () => {
            const halo = ctx.createRadialGradient(cx, cy - 6, 2, cx, cy - 6, 26);
            halo.addColorStop(0, isMint ? 'rgba(100, 245, 193, 0.36)' : 'rgba(198, 132, 255, 0.36)');
            halo.addColorStop(1, 'rgba(100, 245, 193, 0)');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(cx, cy - 6, 26, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#e7e4ff';
            ctx.strokeStyle = OUTLINE;
            ctx.lineWidth = 1.2;
            ctx.fillRect(cx - 2.6, cy - 2, 5.2, 11);
            ctx.strokeRect(cx - 2.6, cy - 2, 5.2, 11);

            ctx.fillStyle = isMint ? '#64f5c1' : '#c684ff';
            ctx.beginPath();
            ctx.arc(cx, cy - 2, 10.5, Math.PI, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx - 3.5, cy - 6.5, 1.8, 0, Math.PI * 2);
            ctx.arc(cx + 3.2, cy - 5, 1.4, 0, Math.PI * 2);
            ctx.fill();
          },
        });
      }

      if (cell === 'wall' && y < N - 1 && getGlowdeepCell(x, y + 1) !== 'wall' && h1 < 0.35) {
        items.push({
          sortY: y * T + T * 0.85,
          draw: () => {
            ctx.fillStyle = '#9b6bff';
            ctx.strokeStyle = '#e2d4ff';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(cx, cy - 18);
            ctx.lineTo(cx + 7, cy + 4);
            ctx.lineTo(cx - 7, cy + 4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          },
        });
      }
    }
  }

  // Nana Mochi's Soup Cauldron at Rooted Rest (130, 130)
  const cauldronX = 130 * T + T / 2;
  const cauldronY = 130 * T + T / 2;
  items.push({
    sortY: cauldronY + 8,
    draw: () => {
      const aura = ctx.createRadialGradient(cauldronX, cauldronY - 4, 4, cauldronX, cauldronY - 4, 48);
      aura.addColorStop(0, 'rgba(255, 212, 92, 0.5)');
      aura.addColorStop(1, 'rgba(255, 212, 92, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(cauldronX, cauldronY - 4, 48, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#3f344c';
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(cauldronX, cauldronY + 2, 16, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#64f5c1';
      ctx.beginPath();
      ctx.ellipse(cauldronX, cauldronY - 3, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  });

  // Surface Ascent Root Portal inside Glowdeep at (130, 126)
  const retX = GLOWDEEP_RETURN_TILE.x * T + T / 2;
  const retY = GLOWDEEP_RETURN_TILE.y * T + T / 2;
  items.push({
    sortY: retY + 8,
    draw: () => {
      const pulse = 1 + Math.sin(t * 3.5) * 0.08;
      const g = ctx.createRadialGradient(retX, retY - 8, 4, retX, retY - 8, 44 * pulse);
      g.addColorStop(0, 'rgba(125, 235, 165, 0.72)');
      g.addColorStop(0.6, 'rgba(255, 230, 130, 0.25)');
      g.addColorStop(1, 'rgba(125, 235, 165, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(retX, retY - 8, 44 * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#7bd88f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(retX, retY - 8, 17, 22, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(210, 255, 225, 0.55)';
      ctx.beginPath();
      ctx.ellipse(retX, retY - 8, 12, 17, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '900 10px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#1d1429';
      ctx.lineWidth = 2.6;
      ctx.strokeText('↑ Meadow Ascent', retX, retY - 35);
      ctx.fillText('↑ Meadow Ascent', retX, retY - 35);
    },
  });

  return items;
}

/**
 * Renders The Moon Road (Layer 4): luminous gold-lavender bridges, floating tea verandas,
 * Dusk's Edge of Silence plaza, and starry nebula drifts.
 */
export function renderMoonRoadTerrain(
  ctx: CanvasRenderingContext2D,
  W: WorldRenderState,
  startX: number,
  endX: number,
  startY: number,
  endY: number
): void {
  const t = W.time;
  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      const cell = getMoonRoadCell(x, y);
      const sx = x * T;
      const sy = y * T;
      const h1 = hash(x, y, 441);

      if (cell === 'road') {
        ctx.fillStyle = 'rgba(182, 152, 255, 0.34)';
        ctx.fillRect(sx, sy, T + 1, T + 1);
        // Illuminated silver-lavender paving stone
        ctx.fillStyle = h1 > 0.5 ? '#d8c8ff' : '#e6dbff';
        ctx.strokeStyle = 'rgba(255, 224, 130, 0.58)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(sx + 2, sy + 2, T - 4, T - 4, 7);
        ctx.fill();
        ctx.stroke();
        if (h1 < 0.25) {
          ctx.fillStyle = '#ffd23f';
          ctx.beginPath();
          ctx.arc(sx + T / 2, sy + T / 2, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (cell === 'platform') {
        ctx.fillStyle = '#fff5da';
        ctx.fillRect(sx, sy, T + 1, T + 1);
        ctx.strokeStyle = 'rgba(235, 192, 96, 0.6)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(sx + 1, sy + 1, T - 2, T - 2);
        if (h1 < 0.22) {
          ctx.fillStyle = 'rgba(255, 175, 205, 0.35)';
          ctx.beginPath();
          ctx.arc(sx + T / 2, sy + T / 2, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (cell === 'silence') {
        ctx.fillStyle = h1 > 0.5 ? '#2e344d' : '#353b57';
        ctx.fillRect(sx, sy, T + 1, T + 1);
        ctx.strokeStyle = 'rgba(180, 195, 225, 0.26)';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 2, sy + 2, T - 4, T - 4);
      } else if (cell === 'nebula') {
        const pulse = 0.2 + 0.08 * Math.sin(t * 1.6 + x * 0.3);
        ctx.fillStyle = `rgba(92, 52, 165, ${pulse.toFixed(2)})`;
        ctx.fillRect(sx, sy, T + 1, T + 1);
      }
    }
  }
}

/**
 * Collects Y-sorted Moon Road props: The Moon's Tea House gazebo, Twin Stars arch,
 * Unsung Verse chime pillar, starlight road lanterns, and the Meadow Return Gate.
 */
export function collectMoonRoadPropDrawables(
  ctx: CanvasRenderingContext2D,
  W: WorldRenderState,
  startX: number,
  endX: number,
  startY: number,
  endY: number
): YSortableItem[] {
  const items: YSortableItem[] = [];
  const t = W.time;

  // Starlight roadside lanterns every ~7 tiles on road/platform edges
  for (let y = Math.max(0, startY - 2); y <= Math.min(N - 1, endY + 2); y++) {
    for (let x = Math.max(0, startX - 2); x <= Math.min(N - 1, endX + 2); x++) {
      const cell = getMoonRoadCell(x, y);
      if (cell === 'road' && hash(x, y, 741) < 0.045) {
        const cx = x * T + T / 2;
        const cy = y * T + T / 2;
        items.push({
          sortY: cy + 6,
          draw: () => {
            const bob = Math.sin(t * 2.5 + x) * 2.5;
            const halo = ctx.createRadialGradient(cx, cy - 12 + bob, 2, cx, cy - 12 + bob, 26);
            halo.addColorStop(0, 'rgba(255, 226, 130, 0.55)');
            halo.addColorStop(1, 'rgba(255, 226, 130, 0)');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(cx, cy - 12 + bob, 26, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#e5d4ff';
            ctx.fillRect(cx - 1.5, cy - 8, 3, 16);
            ctx.fillStyle = '#ffd23f';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(cx, cy - 12 + bob, 5.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          },
        });
      }
    }
  }

  // The Moon's Tea House Canopy at (130, 123)
  const teaX = 130 * T + T / 2;
  const teaY = 123 * T + T / 2;
  items.push({
    sortY: teaY + 14,
    draw: () => {
      const aura = ctx.createRadialGradient(teaX, teaY - 12, 8, teaX, teaY - 12, 95);
      aura.addColorStop(0, 'rgba(255, 226, 132, 0.48)');
      aura.addColorStop(1, 'rgba(255, 226, 132, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(teaX, teaY - 12, 95, 0, Math.PI * 2);
      ctx.fill();

      // Pillars
      ctx.fillStyle = '#f8f2ff';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.6;
      ctx.fillRect(teaX - 38, teaY - 38, 7, 46);
      ctx.strokeRect(teaX - 38, teaY - 38, 7, 46);
      ctx.fillRect(teaX + 31, teaY - 38, 7, 46);
      ctx.strokeRect(teaX + 31, teaY - 38, 7, 46);

      // Dome canopy
      ctx.fillStyle = '#9b6bff';
      ctx.beginPath();
      ctx.moveTo(teaX - 48, teaY - 36);
      ctx.quadraticCurveTo(teaX, teaY - 68, teaX + 48, teaY - 36);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Crescent Moon Crest
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.arc(teaX, teaY - 66, 8, 0, Math.PI * 2);
      ctx.fill();

      // Tea Table
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.ellipse(teaX, teaY + 2, 18, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    },
  });

  // Meadow Return Silver Gate at MOONROAD_RETURN_TILE (130, 128)
  const retX = MOONROAD_RETURN_TILE.x * T + T / 2;
  const retY = MOONROAD_RETURN_TILE.y * T + T / 2;
  items.push({
    sortY: retY + 8,
    draw: () => {
      const pulse = 1 + Math.sin(t * 3.2) * 0.08;
      const g = ctx.createRadialGradient(retX, retY - 8, 4, retX, retY - 8, 40 * pulse);
      g.addColorStop(0, 'rgba(180, 225, 255, 0.72)');
      g.addColorStop(1, 'rgba(180, 225, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(retX, retY - 8, 40 * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(retX, retY - 8, 16, 21, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(143, 213, 255, 0.5)';
      ctx.beginPath();
      ctx.ellipse(retX, retY - 8, 11, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '900 10px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#1d1429';
      ctx.lineWidth = 2.6;
      ctx.strokeText('↓ Return to Meadow', retX, retY - 34);
      ctx.fillText('↓ Return to Meadow', retX, retY - 34);
    },
  });

  return items;
}

/**
 * Renders visible Ground Entrances to Glowdeep Caverns (Root Arch) & The Moon Road (Silver Gate).
 */
export function collectGroundPortalDrawables(W: WorldRenderState, ctx: CanvasRenderingContext2D): YSortableItem[] {
  const items: YSortableItem[] = [];
  const t = W.time;

  if (W.glowdeepPortal) {
    const { x, y, open } = W.glowdeepPortal;
    items.push({
      sortY: y + 8,
      draw: () => {
        ctx.save();
        if (open) {
          const glow = ctx.createRadialGradient(x, y - 6, 4, x, y - 6, 42);
          glow.addColorStop(0, 'rgba(100, 245, 193, 0.65)');
          glow.addColorStop(0.6, 'rgba(180, 140, 255, 0.25)');
          glow.addColorStop(1, 'rgba(180, 140, 255, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, y - 6, 42, 0, Math.PI * 2);
          ctx.fill();
        }
        // Wooden & stone root arch
        ctx.fillStyle = open ? '#220f3b' : '#4a3d52';
        ctx.strokeStyle = open ? '#64f5c1' : '#8e7fa3';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.roundRect(x - 16, y - 24, 32, 28, [16, 16, 2, 2]);
        ctx.fill();
        ctx.stroke();

        if (open) {
          const swirl = t * 2.5;
          ctx.strokeStyle = '#b48cff';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(x, y - 10, 8, swirl, swirl + Math.PI * 1.4);
          ctx.stroke();
        } else {
          ctx.font = 'bold 11px Nunito, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#e2d4ff';
          ctx.fillText('🔒', x, y - 6);
        }

        ctx.font = '900 10px Nunito, sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(30, 18, 45, 0.85)';
        ctx.lineWidth = 2.6;
        ctx.fillStyle = open ? '#8cfce0' : '#d5c7e8';
        const label = open ? '🍄 Glowdeep Roots' : '🍄 Sealed Roots (Ch. 9)';
        ctx.strokeText(label, x, y - 30);
        ctx.fillText(label, x, y - 30);
        ctx.restore();
      },
    });
  }

  if (W.moonGatePortal) {
    const { x, y, open } = W.moonGatePortal;
    items.push({
      sortY: y + 8,
      draw: () => {
        ctx.save();
        if (open) {
          const glow = ctx.createRadialGradient(x, y - 12, 4, x, y - 12, 44);
          glow.addColorStop(0, 'rgba(255, 224, 120, 0.65)');
          glow.addColorStop(0.55, 'rgba(180, 140, 255, 0.32)');
          glow.addColorStop(1, 'rgba(180, 140, 255, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, y - 12, 44, 0, Math.PI * 2);
          ctx.fill();
        }
        // Silver celestial moon arch pillars
        ctx.fillStyle = open ? '#e8e2ff' : '#9ca3af';
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 1.6;
        ctx.fillRect(x - 16, y - 28, 5, 30);
        ctx.strokeRect(x - 16, y - 28, 5, 30);
        ctx.fillRect(x + 11, y - 28, 5, 30);
        ctx.strokeRect(x + 11, y - 28, 5, 30);

        ctx.strokeStyle = open ? '#ffd23f' : '#cbd5e1';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y - 24, 15, Math.PI, 0);
        ctx.stroke();

        if (open) {
          ctx.fillStyle = 'rgba(165, 130, 255, 0.5)';
          ctx.beginPath();
          ctx.ellipse(x, y - 13, 10, 14, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.font = '900 10px Nunito, sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(30, 18, 45, 0.85)';
        ctx.lineWidth = 2.6;
        ctx.fillStyle = open ? '#ffe88a' : '#e2e8f0';
        const label = open ? '🌙 Moon Road Gate' : '🌙 Silver Gate (Ch. 7)';
        ctx.strokeText(label, x, y - 44);
        ctx.fillText(label, x, y - 44);
        ctx.restore();
      },
    });
  }

  return items;
}

/**
 * Renders faceted Star Gems, Iridescent Clam Pearls, Cloud Plume Feathers, and Rainbow Rings.
 */
export function renderCollectibles(
  ctx: CanvasRenderingContext2D,
  W: WorldRenderState,
  cx: number,
  cy: number,
  w: number,
  h: number,
  isSky: boolean,
  isDive: boolean,
  isGlowdeep: boolean = false,
  isMoonRoad: boolean = false
): void {
  const t = W.time;
  const pad = 60;
  const minX = cx - pad;
  const maxX = cx + w + pad;
  const minY = cy - pad;
  const maxY = cy + h + pad;

  if (isGlowdeep && W.glowSpores) {
    for (const sp of W.glowSpores) {
      if (sp.got || sp.x < minX || sp.x > maxX || sp.y < minY || sp.y > maxY) continue;
      const bob = Math.sin(t * 3 + sp.x) * 3.5;
      const py = sp.y - 4 + bob;
      const halo = ctx.createRadialGradient(sp.x, py, 2, sp.x, py, 18);
      halo.addColorStop(0, 'rgba(100, 245, 193, 0.72)');
      halo.addColorStop(1, 'rgba(100, 245, 193, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(sp.x, py, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#64f5c1';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(sp.x, py, 6.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sp.x - 1.8, py - 2, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (isMoonRoad && W.moonNotes) {
    for (const mn of W.moonNotes) {
      if (mn.got || mn.x < minX || mn.x > maxX || mn.y < minY || mn.y > maxY) continue;
      const bob = Math.sin(t * 2.8 + mn.x) * 4;
      const py = mn.y - 5 + bob;
      const halo = ctx.createRadialGradient(mn.x, py, 2, mn.x, py, 18);
      halo.addColorStop(0, 'rgba(255, 224, 120, 0.72)');
      halo.addColorStop(1, 'rgba(255, 224, 120, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(mn.x, py, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffd23f';
      ctx.strokeStyle = '#fff9d6';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(mn.x, py, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 10px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#3b2a45';
      ctx.fillText('♪', mn.x, py + 3.5);
    }
    return;
  }

  if (!isSky && !isDive) {
    for (const s of W.stars) {
      if (s.got || s.x < minX || s.x > maxX || s.y < minY || s.y > maxY) continue;
      const bob = Math.sin(t * 3.1 + s.x) * 3.2;
      const py = s.y - 6 + bob;

      ctx.fillStyle = 'rgba(40, 25, 50, 0.22)';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + 7, 6.5, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();

      const halo = ctx.createRadialGradient(s.x, py, 2, s.x, py, 16);
      halo.addColorStop(0, 'rgba(255, 224, 90, 0.65)');
      halo.addColorStop(1, 'rgba(255, 224, 90, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(s.x, py, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(s.x, py);
      ctx.rotate(Math.sin(t * 1.8 + s.x) * 0.14);
      ctx.fillStyle = '#ffd23f';
      ctx.strokeStyle = '#fff9d6';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(3.2, -3.2);
      ctx.lineTo(10, 0);
      ctx.lineTo(3.2, 3.2);
      ctx.lineTo(0, 10);
      ctx.lineTo(-3.2, 3.2);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-3.2, -3.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-1.5, -2.5, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Quest Collectibles (Star Shards & Wildflower Nectar Vials)
    if (W.questItems) {
      for (const qi of W.questItems) {
        if (qi.got || qi.w !== 0 || qi.x < minX || qi.x > maxX || qi.y < minY || qi.y > maxY) continue;
        const bob = Math.sin(t * 3.4 + qi.x) * 3.5;
        const py = qi.y - 6 + bob;
        const isNectar = qi.q.it.toLowerCase().includes('nectar');
        const halo = ctx.createRadialGradient(qi.x, py, 2, qi.x, py, 19);
        halo.addColorStop(0, isNectar ? 'rgba(255, 158, 187, 0.72)' : 'rgba(130, 232, 255, 0.72)');
        halo.addColorStop(1, 'rgba(255, 224, 90, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(qi.x, py, 19, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isNectar ? '#ff8fb8' : '#7de0ff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(qi.x, py, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 10px Nunito, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(isNectar ? '🍯' : '💎', qi.x, py + 3.5);
      }
    }
  } else if (isDive) {
    for (const p of W.pearls) {
      if (p.got || p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) continue;
      const pulse = Math.sin(t * 2.8 + p.x) * 1.5;

      const halo = ctx.createRadialGradient(p.x, p.y - 2, 2, p.x, p.y - 2, 18);
      halo.addColorStop(0, 'rgba(255, 220, 245, 0.55)');
      halo.addColorStop(1, 'rgba(255, 220, 245, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 2, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f5a9cc';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 4, 10, 5.5, 0, 0, Math.PI);
      ctx.fill();

      ctx.fillStyle = '#fff8fd';
      ctx.strokeStyle = '#ffd1ea';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 2 + pulse * 0.4, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x - 2.2, p.y - 4.2 + pulse * 0.4, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (isSky) {
    for (const f of W.feathers) {
      if (f.got || f.x < minX || f.x > maxX || f.y < minY || f.y > maxY) continue;
      const bob = Math.sin(t * 2.3 + f.x) * 4.5;
      ctx.save();
      ctx.translate(f.x, f.y + bob);
      ctx.rotate(0.55 + Math.sin(t * 1.9 + f.y) * 0.12);
      ctx.fillStyle = 'rgba(255, 245, 190, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff9e0';
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.8, 11.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#f5b841';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(0, 12);
      ctx.stroke();
      ctx.restore();
    }

    const ringColors = ['#ff7aa8', '#ffd23f', '#7bd88f', '#7de0ff', '#b48cff'];
    for (const r of W.rings) {
      if (r.got || r.x < minX - 30 || r.x > maxX + 30 || r.y < minY - 30 || r.y > maxY + 30) continue;
      ctx.save();
      const pulse = 24 + Math.sin(t * 3 + r.x) * 2.5;
      ringColors.forEach((col, idx) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(r.x, r.y, pulse - idx * 2.2, 0, Math.PI * 2);
        ctx.stroke();
      });
      const a = t * 2.8 + r.x;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(r.x + Math.cos(a) * (pulse + 4), r.y + Math.sin(a) * (pulse + 4), 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

/**
 * Renders the enchanted Great Lantern Tree at the heart of Lantern Isle.
 */
export function renderGreatLanternTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  t: number,
  lit: boolean
): void {
  ctx.save();

  const glowRad = lit ? 155 : 75;
  const aura = ctx.createRadialGradient(x, y - 55, 10, x, y - 55, glowRad);
  if (lit) {
    aura.addColorStop(0, 'rgba(255, 228, 120, 0.54)');
    aura.addColorStop(0.6, 'rgba(130, 240, 180, 0.18)');
    aura.addColorStop(1, 'rgba(255, 228, 120, 0)');
  } else {
    aura.addColorStop(0, 'rgba(130, 175, 235, 0.28)');
    aura.addColorStop(1, 'rgba(130, 175, 235, 0)');
  }
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(x, y - 55, glowRad, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(25, 20, 45, 0.28)';
  ctx.beginPath();
  ctx.ellipse(x, y + 6, 48, 17, 0, 0, Math.PI * 2);
  ctx.fill();

  // Gnarled roots & broad ancient trunk
  ctx.fillStyle = '#684a3d';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 26, y + 4);
  ctx.quadraticCurveTo(x - 14, y - 16, x - 14, y - 64);
  ctx.lineTo(x + 14, y - 64);
  ctx.quadraticCurveTo(x + 14, y - 16, x + 26, y + 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Warm hollow heartwood shrine opening
  ctx.fillStyle = lit ? '#ffe68c' : '#3a2e3d';
  ctx.beginPath();
  ctx.roundRect(x - 6.5, y - 19, 13, 19, [6.5, 6.5, 1, 1]);
  ctx.fill();
  ctx.stroke();

  // Multi-clustered storybook canopy
  const palette = lit
    ? ['#43a86e', '#5fc784', '#86e09c', '#b7f5be']
    : ['#3b4966', '#4a5c7a', '#5a7094', '#708ab2'];
  const clusters: [number, number, number, number][] = [
    [0, -92, 50, 0],
    [-35, -75, 32, 1],
    [35, -75, 32, 1],
    [-19, -112, 30, 2],
    [19, -110, 29, 2],
    [0, -126, 25, 3],
  ];
  const sway = Math.sin(t * 1.1) * 1.5;
  clusters.forEach(([ox, oy, rad, pi]) => {
    ctx.fillStyle = palette[pi];
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = pi === 0 ? 1.8 : 1.2;
    ctx.beginPath();
    ctx.arc(x + ox + sway * (pi * 0.35), y + oy, rad, 0, Math.PI * 2);
    ctx.fill();
    if (pi <= 1) ctx.stroke();
  });

  // Hanging paper lanterns swaying gently from boughs
  for (let i = 0; i < 10; i++) {
    const lx = x + Math.cos(i * 1.9) * 39 + Math.sin(t * 1.8 + i) * 2.2;
    const ly = y - 82 + Math.sin(i * 2.5) * 24;
    ctx.strokeStyle = '#7e5a44';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lx, ly - 9);
    ctx.lineTo(lx, ly);
    ctx.stroke();

    if (lit || i % 3 === 0) {
      ctx.fillStyle = lit ? 'rgba(255, 224, 100, 0.38)' : 'rgba(180, 215, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(lx, ly + 3, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = lit ? (i % 2 === 0 ? '#ffe573' : '#ff9fc2') : '#b8d7ff';
    } else {
      ctx.fillStyle = '#6c7c96';
    }
    ctx.beginPath();
    ctx.roundRect(lx - 3.6, ly, 7.2, 9.2, 3);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Renders drifting world-space ambient fireflies (surface), bubbles (reef), golden motes (sky),
 * bioluminescent spores (glowdeep), or starlight dust (moonroad).
 */
export function renderAmbientWorldMotes(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  t: number,
  isSky: boolean,
  isDive: boolean,
  isGlowdeep: boolean = false,
  isMoonRoad: boolean = false,
  lowQuality: boolean = false
): void {
  ctx.save();
  const count = lowQuality ? 12 : 28;
  for (let i = 0; i < count; i++) {
    const bx = hash(i, 1, 909) * 1600;
    const by = hash(i, 2, 909) * 1000;
    const speedY = isDive ? -18 - (i % 4) * 5 : Math.sin(t * 0.7 + i) * 14;
    const wx = cx + (((bx - cx + Math.sin(t * 0.6 + i * 1.3) * 26) % (w + 80)) + (w + 80)) % (w + 80) - 40;
    const wy = cy + (((by - cy + t * speedY) % (h + 80)) + (h + 80)) % (h + 80) - 40;
    const alpha = 0.25 + 0.52 * Math.abs(Math.sin(t * 1.8 + i * 2.1));

    if (isGlowdeep) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = i % 2 === 0 ? '#64f5c1' : '#be8cff';
      ctx.beginPath();
      ctx.arc(wx, wy, 2.3 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    } else if (isMoonRoad) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = i % 2 === 0 ? '#ffe082' : '#cdb4ff';
      ctx.beginPath();
      ctx.arc(wx, wy, 2 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    } else if (isDive) {
      ctx.globalAlpha = alpha * 0.85;
      ctx.strokeStyle = '#d7f8ff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(wx, wy, 2 + (i % 3) * 1.1, 0, Math.PI * 2);
      ctx.stroke();
    } else if (isSky) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff0a5';
      ctx.beginPath();
      ctx.arc(wx, wy, 2 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalAlpha = i % 3 === 0 ? alpha * 0.78 : alpha;
      ctx.fillStyle = i % 3 === 0 ? '#ffc3dc' : '#fff091';
      ctx.beginPath();
      ctx.arc(wx, wy, 2.2 + (i % 2) * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Renders drifting soft cloud shadows, 7-minute Day -> Golden Hour -> Starlight ambiance,
 * warm luminous lantern glows at dusk/night, and a gentle storybook corner vignette.
 */
export function renderWorldLightingAndAtmosphere(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cx: number,
  cy: number,
  t: number,
  isSky: boolean,
  isDive: boolean,
  nightCycleEnabled: boolean,
  towns: Town[],
  isGlowdeep: boolean = false,
  isMoonRoad: boolean = false,
  lowQuality: boolean = false
): void {
  // 1. Drifting translucent cloud shadows across surface islands (gives depth without hurting clarity)
  if (!lowQuality && !isDive && !isSky && !isGlowdeep && !isMoonRoad) {
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const seedX = hash(i, 4, 912) * 2600;
      const seedY = hash(i, 5, 912) * 1800;
      const rx = 130 + hash(i, 6, 912) * 90;
      const ry = rx * 0.52;
      const sx = ((((seedX - cx + t * (16 + i * 2.5)) % (w + 600)) + (w + 600)) % (w + 600)) - 300;
      const sy = ((((seedY - cy + t * 3.5) % (h + 450)) + (h + 450)) % (h + 450)) - 225;
      ctx.fillStyle = 'rgba(28, 38, 68, 0.045)';
      ctx.beginPath();
      ctx.ellipse(sx, sy, rx, ry, 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 2. Smooth 7-minute Day -> Golden Hour -> Starlight Lighting Glaze
  if (nightCycleEnabled && !isDive && !isGlowdeep && !isMoonRoad) {
    const phase = (t % 420) / 420; // 0..1 over 7 minutes
    let tint = '';
    let nightStrength = 0;

    if (phase >= 0.42 && phase < 0.56) {
      const k = Math.sin(((phase - 0.42) / 0.14) * Math.PI);
      tint = `rgba(255, 186, 98, ${(k * 0.14).toFixed(3)})`;
      nightStrength = k * 0.2;
    } else if (phase >= 0.56 && phase < 0.68) {
      const p = (phase - 0.56) / 0.12;
      tint = `rgba(186, 92, 152, ${(0.06 + Math.sin(p * Math.PI) * 0.14).toFixed(3)})`;
      nightStrength = 0.25 + p * 0.45;
    } else if (phase >= 0.68 && phase < 0.88) {
      const p = (phase - 0.68) / 0.2;
      const arc = Math.sin(p * Math.PI * 0.5 + 0.35);
      tint = `rgba(20, 18, 56, ${(0.24 + arc * 0.12).toFixed(3)})`;
      nightStrength = 0.72 + arc * 0.28;
    } else if (phase >= 0.88) {
      const p = (phase - 0.88) / 0.12;
      const fade = 1 - p;
      tint = `rgba(255, 168, 178, ${(fade * 0.16).toFixed(3)})`;
      nightStrength = fade * 0.55;
    }

    if (tint) {
      ctx.save();
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, w, h);

      // Luminous warm lantern aura around Mochi & visible Town Waystones during evening/night
      if (nightStrength > 0.15) {
        ctx.globalCompositeOperation = 'lighter';
        const mochiHalo = ctx.createRadialGradient(w / 2, h / 2, 16, w / 2, h / 2, 170);
        mochiHalo.addColorStop(0, `rgba(255, 224, 145, ${(0.22 * nightStrength).toFixed(3)})`);
        mochiHalo.addColorStop(0.55, `rgba(255, 178, 130, ${(0.08 * nightStrength).toFixed(3)})`);
        mochiHalo.addColorStop(1, 'rgba(255, 178, 130, 0)');
        ctx.fillStyle = mochiHalo;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 170, 0, Math.PI * 2);
        ctx.fill();

        // Warm town plaza & beacon glows
        for (const town of towns) {
          if ((isSky && town.w !== 2) || (!isSky && town.w !== 0)) continue;
          const sx = town.x * T - cx;
          const sy = town.y * T - cy;
          if (sx < -220 || sx > w + 220 || sy < -220 || sy > h + 220) continue;
          const tg = ctx.createRadialGradient(sx, sy, 12, sx, sy, 195);
          tg.addColorStop(0, `rgba(255, 218, 120, ${(0.28 * nightStrength).toFixed(3)})`);
          tg.addColorStop(0.6, `rgba(255, 165, 125, ${(0.1 * nightStrength).toFixed(3)})`);
          tg.addColorStop(1, 'rgba(255, 165, 125, 0)');
          ctx.fillStyle = tg;
          ctx.beginPath();
          ctx.arc(sx, sy, 195, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  // 3. Soft Storybook Edge Vignette (frames the world gently like an illustrated picture-book spread)
  if (!lowQuality) {
    ctx.save();
    const maxR = Math.hypot(w * 0.5, h * 0.5);
    const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, maxR * 0.62, w * 0.5, h * 0.5, maxR * 1.04);
    vig.addColorStop(0, 'rgba(24, 14, 38, 0)');
    vig.addColorStop(1, isDive ? 'rgba(4, 14, 34, 0.34)' : isGlowdeep || isMoonRoad ? 'rgba(10, 4, 24, 0.36)' : 'rgba(32, 18, 46, 0.16)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

/**
 * Renders the player's bespoke two-gable storybook Mochi House with a glass conservatory
 * wing, brick hearth chimney smoke, flower window boxes, stepping-stone garden path,
 * warm porch lantern, and crisp home sign anchored at `(x, y)` (floorline center).
 */
export function renderPlayerMochiHouse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  t: number,
  ownerName: string = 'Mochi',
  fireplaceLit: boolean = true
): void {
  const mainW = 94;
  const mainH = 74;
  const wingW = 36;
  const left = x - mainW / 2 - 8;
  const baseY = y + 6;
  const top = baseY - mainH - 18;
  const cx = left + mainW / 2;

  ctx.save();

  // 1. Cobblestone stepping path leading down to porch doormat
  const pathGlow = ctx.createRadialGradient(cx, baseY + 14, 3, cx, baseY + 14, 40);
  pathGlow.addColorStop(0, 'rgba(255, 222, 145, 0.32)');
  pathGlow.addColorStop(1, 'rgba(255, 222, 145, 0)');
  ctx.fillStyle = pathGlow;
  ctx.beginPath();
  ctx.ellipse(cx, baseY + 14, 40, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  const stones = [
    [cx - 5, baseY + 6, 11, 5.5],
    [cx + 6, baseY + 13, 10, 5],
    [cx - 4, baseY + 20, 12, 5.5],
    [cx + 3, baseY + 27, 9, 4.5],
  ];
  stones.forEach(([sx, sy, rw, rh]) => {
    ctx.fillStyle = '#e7dfd5';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(sx, sy, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  // 2. White Picket Garden Fence Sides + Wildflower Clusters
  [-1, 1].forEach((side) => {
    const startX = side === -1 ? left - 18 : left + mainW + wingW - 14;
    ctx.fillStyle = '#fffaf4';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.2;
    ctx.fillRect(startX, baseY - 11, 22, 3);
    ctx.strokeRect(startX, baseY - 11, 22, 3);
    for (let p = 0; p < 3; p++) {
      const px = startX + 2 + p * 7;
      ctx.beginPath();
      ctx.roundRect(px, baseY - 18, 5, 16, [2.5, 2.5, 1, 1]);
      ctx.fill();
      ctx.stroke();
    }
    // Blossom bush beside fence
    ctx.fillStyle = '#5bb870';
    ctx.beginPath();
    ctx.arc(startX + (side === -1 ? 4 : 18), baseY - 2, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = side === -1 ? '#ff8fb8' : '#ffd23f';
    ctx.beginPath();
    ctx.arc(startX + (side === -1 ? 2 : 16), baseY - 4, 2.3, 0, Math.PI * 2);
    ctx.arc(startX + (side === -1 ? 7 : 20), baseY - 2, 2.1, 0, Math.PI * 2);
    ctx.fill();
  });

  // 3. Soft Ground Shadow under House + Conservatory Wing
  ctx.fillStyle = 'rgba(34, 18, 46, 0.26)';
  ctx.beginPath();
  ctx.roundRect(left - 2, baseY - 7, mainW + wingW + 2, 16, 8);
  ctx.fill();

  // 4. Right-Side Glass Sunroom Conservatory Wing
  const wingLeft = left + mainW - 6;
  const wingTop = baseY - 46;
  ctx.fillStyle = '#dff5f1';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(wingLeft, wingTop + 12, wingW, 34, [4, 6, 4, 4]);
  ctx.fill();
  ctx.stroke();
  // Conservatory glass panes + sunlit interior plants
  ctx.fillStyle = '#56b570';
  ctx.beginPath();
  ctx.arc(wingLeft + 13, baseY - 12, 6, 0, Math.PI * 2);
  ctx.arc(wingLeft + 24, baseY - 10, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff7aa8';
  ctx.beginPath();
  ctx.arc(wingLeft + 14, baseY - 15, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // Conservatory arched glass mullion bars + pitched glass roof
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(wingLeft + 12, wingTop + 13);
  ctx.lineTo(wingLeft + 12, baseY - 5);
  ctx.moveTo(wingLeft + 24, wingTop + 13);
  ctx.lineTo(wingLeft + 24, baseY - 5);
  ctx.stroke();
  ctx.fillStyle = '#9be8d8';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.moveTo(wingLeft - 2, wingTop + 14);
  ctx.lineTo(wingLeft + wingW / 2 - 2, wingTop - 4);
  ctx.lineTo(wingLeft + wingW + 4, wingTop + 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 5. Brick Hearth Chimney + Animated Smoke Puffs
  const chX = left + mainW - 24;
  const chY = top + 2;
  ctx.fillStyle = '#b97164';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.roundRect(chX, chY, 14, 30, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e5c4af';
  ctx.fillRect(chX - 2, chY - 2, 18, 5);
  ctx.strokeRect(chX - 2, chY - 2, 18, 5);

  if (fireplaceLit) {
    for (let s = 0; s < 4; s++) {
      const phase = (t * 0.44 + s * 0.25) % 1;
      ctx.fillStyle = `rgba(255, 250, 245, ${(0.58 * (1 - phase)).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(
        chX + 7 + Math.sin(t * 2.1 + s * 1.4) * 4.5 + phase * 10,
        chY - 5 - phase * 28,
        3.6 + phase * 5.2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  // 6. Main House Cream Plaster & Warm Timber Walls
  ctx.fillStyle = '#fff8ef';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(left + 4, top + 40, mainW - 8, baseY - (top + 40), 6);
  ctx.fill();
  ctx.stroke();

  // Stone foundation plinth
  ctx.fillStyle = '#beb3aa';
  ctx.beginPath();
  ctx.roundRect(left + 3, baseY - 11, mainW - 6, 11, [2, 2, 5, 5]);
  ctx.fill();
  ctx.stroke();

  // Decorative wood beams
  ctx.fillStyle = '#8b5e49';
  ctx.fillRect(left + 5, top + 40, 7, baseY - (top + 49));
  ctx.fillRect(left + mainW - 12, top + 40, 7, baseY - (top + 49));
  ctx.fillRect(left + 5, top + 40, mainW - 10, 5);

  // 7. Two-Tier Storybook Rose-Quartz Shingled Roof
  ctx.fillStyle = '#bd4769';
  ctx.beginPath();
  ctx.moveTo(left - 6, top + 44);
  ctx.lineTo(cx, top - 6);
  ctx.lineTo(left + mainW + 6, top + 44);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ef6f95';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.moveTo(left - 5, top + 41);
  ctx.lineTo(cx, top - 8);
  ctx.lineTo(left + mainW + 5, top + 41);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Sunlit roof highlight + scalloped shingles
  ctx.fillStyle = '#ff9fc0';
  ctx.globalAlpha = 0.38;
  ctx.beginPath();
  ctx.moveTo(left + 1, top + 40);
  ctx.lineTo(cx, top - 4);
  ctx.lineTo(cx - 8, top + 40);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = '#c5496d';
  ctx.lineWidth = 1.2;
  for (let row = 0; row < 2; row++) {
    const ry = top + 16 + row * 13;
    const span = row === 0 ? 28 : 48;
    ctx.beginPath();
    for (let sx = cx - span; sx < cx + span; sx += 11) {
      ctx.arc(sx + 5.5, ry, 5.5, 0, Math.PI);
    }
    ctx.stroke();
  }

  // Crescent Moon Roof Finial
  ctx.fillStyle = '#ffd23f';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(cx, top - 13, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Attic Round Window (Bedroom Skylight)
  ctx.fillStyle = '#ffe5ee';
  ctx.beginPath();
  ctx.arc(cx, top + 24, 9.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffe68a';
  ctx.beginPath();
  ctx.arc(cx, top + 24, 5.8, 0, Math.PI * 2);
  ctx.fill();

  // 8. Front Door + Rose Doormat + Blossom Wreath + Hanging Lantern
  ctx.fillStyle = '#e8dfd5';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(cx - 18, baseY - 3, 36, 7, 3);
  ctx.fill();
  ctx.stroke();

  // Welcome doormat
  ctx.fillStyle = '#ff7aa8';
  ctx.beginPath();
  ctx.roundRect(cx - 11, baseY + 1, 22, 5, 2);
  ctx.fill();

  // Arched Front Door
  ctx.fillStyle = '#8b5742';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.roundRect(cx - 12, baseY - 35, 24, 32, [12, 12, 2, 2]);
  ctx.fill();
  ctx.stroke();
  // Wreath on door
  ctx.strokeStyle = '#56b570';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(cx, baseY - 22, 4.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ff7aa8';
  ctx.beginPath();
  ctx.arc(cx, baseY - 17.5, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // Door knob
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(cx + 6.5, baseY - 17, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Glowing Porch Lantern beside door
  const flicker = 0.88 + Math.sin(t * 5.2) * 0.12;
  const porchHalo = ctx.createRadialGradient(cx + 16, baseY - 28, 1, cx + 16, baseY - 28, 18);
  porchHalo.addColorStop(0, `rgba(255, 232, 130, ${(0.55 * flicker).toFixed(2)})`);
  porchHalo.addColorStop(1, 'rgba(255, 232, 130, 0)');
  ctx.fillStyle = porchHalo;
  ctx.beginPath();
  ctx.arc(cx + 16, baseY - 28, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe682';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx + 16, baseY - 28, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 9. Bay Windows + Shuttered Planter Boxes (Living Room & Kitchen)
  [-29, 29].forEach((ox) => {
    const wx = cx + ox - 8;
    const wy = baseY - 32;
    ctx.fillStyle = '#ef6f95';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.2;
    ctx.fillRect(wx - 4, wy + 1, 4, 15);
    ctx.strokeRect(wx - 4, wy + 1, 4, 15);
    ctx.fillRect(wx + 16, wy + 1, 4, 15);
    ctx.strokeRect(wx + 16, wy + 1, 4, 15);

    ctx.fillStyle = '#ffe894';
    ctx.beginPath();
    ctx.roundRect(wx, wy, 16, 16, 3);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(wx + 8, wy);
    ctx.lineTo(wx + 8, wy + 16);
    ctx.moveTo(wx, wy + 8);
    ctx.lineTo(wx + 16, wy + 8);
    ctx.stroke();

    // Window flower box
    ctx.fillStyle = '#7c523c';
    ctx.fillRect(wx - 2, wy + 15.5, 20, 4.2);
    ctx.fillStyle = '#5bb870';
    ctx.fillRect(wx - 1, wy + 13.5, 18, 2.5);
    ctx.fillStyle = '#ff7aa8';
    ctx.beginPath();
    ctx.arc(wx + 3, wy + 14, 2.4, 0, Math.PI * 2);
    ctx.arc(wx + 8, wy + 13.2, 2.4, 0, Math.PI * 2);
    ctx.arc(wx + 13, wy + 14, 2.4, 0, Math.PI * 2);
    ctx.fill();
  });

  // 10. Floating Crisp Home Plaque
  const label = `🏡 ${ownerName}'s House`;
  ctx.font = '900 11px Nunito, sans-serif';
  ctx.textAlign = 'center';
  ctx.strokeStyle = 'rgba(42, 20, 56, 0.88)';
  ctx.lineWidth = 3;
  ctx.strokeText(label, cx, top - 20);
  ctx.fillStyle = '#fff5fa';
  ctx.fillText(label, cx, top - 20);

  ctx.restore();
}

