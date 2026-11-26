/**
 * Cinematic Cutscenes System for Mochi Meadows
 * Renders high-fidelity widescreen animated scenes with subtitles, speaker badges, and custom audio.
 */

import { drawMochi } from './characterRenderer';
import { PlayerLook, hash } from './engine';
import type { SeasonId } from './constants';

export type Cutscene3DEnv =
  | 'dawn'
  | 'day'
  | 'sunset'
  | 'night'
  | 'starlight'
  | 'glowdeep'
  | 'sky'
  | 'finale';

export type Cutscene3DLandmark =
  | 'harmony_shore'
  | 'lantern_tree'
  | 'campfire_grove'
  | 'moon_gate'
  | 'cauldron'
  | 'sky_islands'
  | 'dawn_spire'
  | 'credits_vista';

export type Cutscene3DMoteStyle = 'notes' | 'stars' | 'spores' | 'embers' | 'petals';

export interface Cutscene3DActorSpec {
  role: 'player' | 'companion' | 'npc';
  npcName?: string;
  startPos: [number, number, number];
  endPos?: [number, number, number];
  yaw?: number;
  headYaw?: number;
  headPitch?: number;
  scale?: number;
  isMoving?: boolean;
  isSprinting?: boolean;
  isGreeting?: boolean;
  isHollow?: boolean;
  hollowBloom?: number;
  jumpArcHeight?: number;
  weatherBehavior?: 'dancing' | 'sheltering' | 'stargazing' | 'shivering' | 'idle';
}

export interface Cutscene3DSceneSpec {
  env: Cutscene3DEnv;
  landmark: Cutscene3DLandmark;
  lanternLit?: number; // 0..1
  showMoon?: boolean;
  moonSad?: boolean;
  showSun?: boolean;
  showWater?: boolean;
  motes?: Cutscene3DMoteStyle;
  actors: Cutscene3DActorSpec[];
  camera: {
    startPos: [number, number, number];
    endPos: [number, number, number];
    startLookAt: [number, number, number];
    endLookAt: [number, number, number];
    fov?: number;
  };
}

export interface CutsceneSlide {
  duration: number;
  text: string;
  scene3D?: Cutscene3DSceneSpec;
  draw: (
    ctx: CanvasRenderingContext2D,
    t: number,
    W: number,
    H: number,
    u: number,
    playerLook: PlayerLook,
    getNpcLook: (name: string) => PlayerLook | null
  ) => void;
}

export const csg = (ctx: CanvasRenderingContext2D, W: number, H: number, a: string, b: string) => {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
};

export const csStars = (ctx: CanvasRenderingContext2D, W: number, H: number, t: number, n: number = 70, al: number = 1) => {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = `rgba(255,255,255,${al * (0.35 + 0.65 * Math.abs(Math.sin(t * 1.5 + i)))})`;
    ctx.fillRect(hash(i, 1, 70) * W, hash(i, 2, 70) * H * 0.75, 2, 2);
  }
};

export const csMoon = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, gl: number, sad: boolean = false) => {
  const g = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 3);
  g.addColorStop(0, `rgba(255,245,200,${gl})`);
  g.addColorStop(1, 'rgba(255,245,200,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);

  ctx.fillStyle = '#fff6d6';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#eadfb4';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.3, r * 0.16, 0, Math.PI * 2);
  ctx.arc(x + r * 0.4, y + r * 0.4, r * 0.11, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#8a7a5a';
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.lineCap = 'round';
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + k * r * 0.3, y - r * 0.05, r * 0.09, Math.PI, 0);
    ctx.stroke();
  }
  ctx.beginPath();
  if (sad) {
    ctx.arc(x, y + r * 0.45, r * 0.2, Math.PI * 1.15, Math.PI * 1.85);
  } else {
    ctx.arc(x, y + r * 0.15, r * 0.22, 0.2, Math.PI - 0.2);
  }
  ctx.stroke();
};

export const csSea = (ctx: CanvasRenderingContext2D, W: number, H: number, t: number, y0: number, col: string) => {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 20) {
    ctx.lineTo(x, y0 + Math.sin(x * 0.02 + t) * 6);
  }
  ctx.lineTo(W, H);
  ctx.fill();
};

export const csIsland = (ctx: CanvasRenderingContext2D, W: number, H: number, r: number, dim: number = 0) => {
  const u = Math.min(W, H);
  const by = H * 0.8 + (1 - r) * u * 0.25;
  const ellipse = (x: number, y: number, rx: number, ry: number, f: string) => {
    ctx.fillStyle = f;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, Math.max(0.1, ry), 0, Math.PI, 0);
    ctx.fill();
  };
  ellipse(W / 2 - u * 0.28, by, u * 0.17, u * 0.11 * r, '#f3f8ff');
  ellipse(W / 2 + u * 0.27, by, u * 0.18, u * 0.09 * r, '#f3d58f');
  ellipse(W / 2, by, u * 0.34, u * 0.17 * r, '#9be28f');
  if (r > 0.8) {
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = i % 3 ? '#5fb870' : '#f59cc0';
      ctx.beginPath();
      ctx.arc(W / 2 - u * 0.2 + i * u * 0.07, by - u * 0.05 - Math.abs(Math.sin(i * 2)) * u * 0.07, u * 0.02, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (dim > 0) {
    ctx.fillStyle = `rgba(40,45,60,${dim})`;
    ctx.fillRect(0, by - u * 0.2, W, H);
  }
};

export const csTree = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number) => {
  ctx.fillStyle = '#5a4a48';
  ctx.beginPath();
  ctx.moveTo(x - 14 * s, y);
  ctx.lineTo(x - 8 * s, y - 60 * s);
  ctx.lineTo(x + 8 * s, y - 60 * s);
  ctx.lineTo(x + 14 * s, y);
  ctx.fill();

  const foliage = [
    ['#3c485e', 0, -100, 48],
    ['#46546c', -32, -76, 30],
    ['#46546c', 32, -76, 30],
    ['#566680', -8, -120, 20],
  ] as const;
  foliage.forEach((a) => {
    ctx.fillStyle = a[0];
    ctx.beginPath();
    ctx.arc(x + a[1] * s, y + a[2] * s, a[3] * s, 0, Math.PI * 2);
    ctx.fill();
  });
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = '#6c7488';
    ctx.beginPath();
    ctx.arc(x + Math.cos(i * 1.9) * 40 * s, y - 95 * s + Math.sin(i * 2.7) * 34 * s, 4 * s, 0, Math.PI * 2);
    ctx.fill();
  }
};

export const csHills = (ctx: CanvasRenderingContext2D, W: number, H: number, y: number, col: string, amp: number, ph: number = 0) => {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) {
    ctx.lineTo(x, y + Math.sin(x * 0.008 + ph) * amp);
  }
  ctx.lineTo(W, H);
  ctx.fill();
};

export const csFloatingNotes = (ctx: CanvasRenderingContext2D, W: number, H: number, t: number, n: number, col: string, char: string, sd: number) => {
  ctx.textAlign = 'center';
  for (let i = 0; i < n; i++) {
    const p = (t * 0.18 + hash(i, sd, 72)) % 1;
    ctx.globalAlpha = Math.sin(p * Math.PI);
    ctx.fillStyle = col;
    ctx.font = `${14 + hash(i, 3, 72) * 14}px sans-serif`;
    ctx.fillText(char, hash(i, sd + 1, 72) * W + Math.sin(t + i) * 14, H * (1.05 - p * 1.1));
  }
  ctx.globalAlpha = 1;
};

export const csStage = (
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  k: number,
  season: SeasonId = 'spring'
) => {
  const seasonalPalettes: Record<SeasonId, [string, string, string, string][]> = {
    spring: [
      ['#ff9f7f', '#ffe8ca', '#b4e396', '#84cd78'],
      ['#68b8fb', '#dff4ff', '#9be08a', '#6bc079'],
      ['#543b8c', '#ff9ba8', '#68a66a', '#4d8759'],
      ['#0b0a24', '#2b2163', '#2e584a', '#23473a'],
      ['#0a3a7a', '#38a5c3', '#1d5a9a', '#164a80'],
    ],
    summer: [
      ['#ff8852', '#ffe0a3', '#a6df70', '#6dbf58'],
      ['#2894f5', '#bdeaff', '#7bd468', '#4ab152'],
      ['#6c2d73', '#ff8c5c', '#549650', '#39733d'],
      ['#0a1030', '#213a72', '#265c44', '#1a4230'],
      ['#0a3a7a', '#38a5c3', '#1d5a9a', '#164a80'],
    ],
    autumn: [
      ['#d66d52', '#ffdcb0', '#dfa662', '#bf7a42'],
      ['#5c8cb8', '#ffe8cc', '#d49d56', '#b87039'],
      ['#4a2852', '#f28b5a', '#a8673e', '#7f482b'],
      ['#150e28', '#452852', '#52383a', '#3d282a'],
      ['#0a3a7a', '#38a5c3', '#1d5a9a', '#164a80'],
    ],
    winter: [
      ['#7898c8', '#e6f0ff', '#d6e6f8', '#b8d2ee'],
      ['#5b94cf', '#ebf6ff', '#e4effc', '#c8dcf2'],
      ['#364075', '#b8c8ec', '#9cb4d6', '#7b94b8'],
      ['#080d22', '#1d2d56', '#5a7396', '#3e5474'],
      ['#0a3a7a', '#38a5c3', '#1d5a9a', '#164a80'],
    ],
  };

  const Pl = (seasonalPalettes[season] || seasonalPalettes.spring)[k] || seasonalPalettes.spring[0];
  csg(ctx, W, H, Pl[0], Pl[1]);

  if (k === 3) {
    csStars(ctx, W, H, t, 85);
    csMoon(ctx, W * 0.16, H * 0.2, Math.min(W, H) * 0.055, 0.32, false);
  }

  // Soft storybook drifting clouds on non-underwater skies
  if (k !== 4) {
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const cw = 90 + (i % 3) * 35;
      const cx = ((((i * 290 + t * (9 + (i % 3) * 2.5)) % (W + 360)) + (W + 360)) % (W + 360)) - 180;
      const cy = H * (0.14 + (i % 3) * 0.1);
      ctx.fillStyle =
        k === 3
          ? 'rgba(180, 195, 255, 0.14)'
          : season === 'autumn'
          ? 'rgba(255, 240, 224, 0.45)'
          : season === 'winter'
          ? 'rgba(242, 249, 255, 0.56)'
          : 'rgba(255, 252, 245, 0.5)';
      ctx.beginPath();
      ctx.arc(cx, cy, cw * 0.28, 0, Math.PI * 2);
      ctx.arc(cx + cw * 0.24, cy - cw * 0.08, cw * 0.34, 0, Math.PI * 2);
      ctx.arc(cx + cw * 0.5, cy + cw * 0.02, cw * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  if (k === 4) {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 5; i++) {
      const x = ((i * 190 + t * 14) % (W + 200)) - 100;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 60, 0);
      ctx.lineTo(x - 80, H);
      ctx.lineTo(x - 140, H);
      ctx.fill();
    }
    csHills(ctx, W, H, H * 0.86, '#e8d9a8', 6, t * 0.2);
  } else {
    // Distant misty mountain ridge behind the hills
    const mistCol =
      k === 3
        ? 'rgba(65, 58, 120, 0.45)'
        : season === 'winter'
        ? 'rgba(220, 238, 255, 0.48)'
        : season === 'autumn'
        ? 'rgba(255, 225, 200, 0.34)'
        : 'rgba(255, 248, 242, 0.34)';
    csHills(ctx, W, H, H * 0.62, mistCol, 18, 0.8);
    csHills(ctx, W, H, H * 0.7, Pl[2], 11, t * 0.08);
    csHills(ctx, W, H, H * 0.8, Pl[3], 8, 2);

    // Subtle seasonal meadow blossom / leaf / frost specks along foreground grass
    ctx.save();
    for (let i = 0; i < 22; i++) {
      const fx = hash(i, 7, 88) * W;
      const fy = H * 0.82 + hash(i, 8, 88) * H * 0.16;
      if (season === 'autumn') {
        ctx.fillStyle = i % 3 === 0 ? 'rgba(229, 98, 52, 0.85)' : i % 2 === 0 ? 'rgba(244, 178, 60, 0.85)' : 'rgba(196, 77, 46, 0.8)';
      } else if (season === 'winter') {
        ctx.fillStyle = i % 3 === 0 ? 'rgba(173, 219, 255, 0.9)' : 'rgba(255, 255, 255, 0.92)';
      } else if (season === 'summer') {
        ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 134, 72, 0.85)' : 'rgba(255, 230, 102, 0.9)';
      } else {
        ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 198, 224, 0.85)' : 'rgba(255, 246, 175, 0.85)';
      }
      ctx.beginPath();
      ctx.arc(fx, fy, 2.5 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
};

export const csCampfire = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) => {
  const g = ctx.createRadialGradient(x, y - 20 * s, 0, x, y - 20 * s, 90 * s);
  g.addColorStop(0, 'rgba(255,170,80,0.45)');
  g.addColorStop(1, 'rgba(255,170,80,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 100 * s, y - 120 * s, 200 * s, 200 * s);

  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = ['#ff8a3d', '#ffc24a', '#fff0a0'][i];
    ctx.beginPath();
    ctx.moveTo(x - 12 * s + i * 3 * s, y);
    ctx.quadraticCurveTo(x - 6 * s, y - 30 * s - Math.sin(t * 9 + i) * 6 * s, x, y - 44 * s + i * 10 * s - Math.sin(t * 11 + i) * 5 * s);
    ctx.quadraticCurveTo(x + 6 * s, y - 30 * s, x + 12 * s - i * 3 * s, y);
    ctx.fill();
  }
  ctx.fillStyle = '#6a4a3a';
  ctx.fillRect(x - 16 * s, y - 2 * s, 32 * s, 6 * s);
};

export const csWhale = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) => {
  ctx.fillStyle = 'rgba(70,110,170,0.55)';
  ctx.beginPath();
  ctx.ellipse(x, y, 170 * s, 50 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 150 * s, y);
  ctx.lineTo(x - 230 * s, y - 50 * s + Math.sin(t * 1.5) * 14 * s);
  ctx.lineTo(x - 215 * s, y + 20 * s);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,40,80,0.6)';
  ctx.beginPath();
  ctx.arc(x + 125 * s, y - 8 * s, 4 * s, 0, Math.PI * 2);
  ctx.fill();
};

export const csWings = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) => {
  ctx.fillStyle = '#ffffff';
  for (const k of [-1, 1]) {
    ctx.save();
    ctx.translate(x + k * 10 * s, y - 14 * s);
    ctx.rotate(k * (0.6 + Math.sin(t * 10) * 0.4));
    ctx.beginPath();
    ctx.ellipse(k * 14 * s, -6 * s, 20 * s, 9 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

export const csLitTree = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  lit: number,
  season: SeasonId = 'spring'
) => {
  const on = lit > 0;
  const litPalettes: Record<SeasonId, [string, string, string]> = {
    spring: ['#7ad89a', '#9be8b0', '#c8f5cf'],
    summer: ['#52bd6e', '#76d98a', '#adf0b8'],
    autumn: ['#d87a38', '#f0a243', '#ffd26b'],
    winter: ['#7eb8da', '#a8d5ef', '#e2f3ff'],
  };
  const unlitPalettes: Record<SeasonId, [string, string, string]> = {
    spring: ['#3c485e', '#46546c', '#566680'],
    summer: ['#364c58', '#405a68', '#4f6d7c'],
    autumn: ['#584148', '#6b4e50', '#805c58'],
    winter: ['#465672', '#5b6f90', '#8aa3c7'],
  };
  const a = on ? litPalettes[season] || litPalettes.spring : unlitPalettes[season] || unlitPalettes.spring;
  if (lit > 0.3) {
    const g = ctx.createRadialGradient(x, y - 100 * s, 10, x, y - 100 * s, 230 * s);
    g.addColorStop(0, `rgba(255,230,140,${0.5 * lit})`);
    g.addColorStop(1, 'rgba(255,230,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 260 * s, y - 340 * s, 520 * s, 420 * s);
  }
  ctx.fillStyle = '#5a4a48';
  ctx.beginPath();
  ctx.moveTo(x - 14 * s, y);
  ctx.lineTo(x - 8 * s, y - 60 * s);
  ctx.lineTo(x + 8 * s, y - 60 * s);
  ctx.lineTo(x + 14 * s, y);
  ctx.fill();

  const foliage = [
    [a[0], 0, -100, 48],
    [a[1], -32, -76, 30],
    [a[1], 32, -76, 30],
    [a[2], -8, -120, 20],
  ] as const;
  foliage.forEach((q) => {
    ctx.fillStyle = q[0];
    ctx.beginPath();
    ctx.arc(x + q[1] * s, y + q[2] * s, q[3] * s, 0, Math.PI * 2);
    ctx.fill();
  });
  for (let i = 0; i < 14; i++) {
    const f = i / 14 < lit;
    const X = x + Math.cos(i * 1.9) * 44 * s;
    const Y = y - 95 * s + Math.sin(i * 2.7) * 36 * s;
    ctx.fillStyle = f ? '#ffe27a' : '#6c7488';
    ctx.beginPath();
    ctx.arc(X, Y, 4.5 * s, 0, Math.PI * 2);
    ctx.fill();
    if (f) {
      ctx.fillStyle = 'rgba(255,226,122,0.25)';
      ctx.beginPath();
      ctx.arc(X, Y, 10 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};
