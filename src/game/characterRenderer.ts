/**
 * Mochi Meadows 2 Character & Companion Renderer
 * Supports all 12 playable species (Cat, Bunny, Bear, Fox, Dragon, Slime,
 * Owl, Frog, Axolotl, Otter, Penguin, Deer), 10 patterns, 22 hats, 10 outfits,
 * 5 face gear items, 8 eye styles, 6 mouth styles, 12 animated magic auras,
 * Hollow states with color blooming, and companions.
 */

import { PlayerLook, shadeColor } from './engine';
import { resolveOutfitParts, resolveHairColor } from './constants';

const shadeCache = new Map<string, string>();
function fastShade(hex: string, amt: number): string {
  const key = `${hex}|${amt}`;
  let res = shadeCache.get(key);
  if (!res) {
    res = shadeColor(hex, amt);
    if (shadeCache.size < 400) shadeCache.set(key, res);
  }
  return res;
}

export function drawMochi(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  bob: number,
  facing: number,
  isBlinking: boolean,
  look: PlayerLook,
  isMoving: boolean = false,
  time: number = 0,
  jumpZ: number = 0,
  isSwimming: boolean = false
) {
  if (!ctx || !look || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(scale) || scale <= 0) {
    return;
  }
  const safeBob = Number.isFinite(bob) ? bob : 0;
  const safeTime = Number.isFinite(time) ? time : 0;
  const sp = look.sp || 'cat';
  const bloom = look.hollowColorBloom !== undefined ? look.hollowColorBloom : (look.isHollow ? 0 : 1);

  // Color calculation with Hollow grey blending
  let rawCol = look.col || '#ffb3c7';
  let rawC2 = look.c2 || fastShade(rawCol, 0.55);
  let rawAc = look.ac || '#ff7aa8';

  if (bloom < 1) {
    const greyBase = '#9e9ea8';
    const greyC2 = '#c2c2cc';
    const greyAc = '#7a7a85';
    rawCol = interpolateColor(greyBase, rawCol, bloom);
    rawC2 = interpolateColor(greyC2, rawC2, bloom);
    rawAc = interpolateColor(greyAc, rawAc, bloom);
  }

  const col = rawCol;
  const c2 = rawC2;
  const ac = rawAc;
  const dk = fastShade(col, -0.28);
  const hi = fastShade(col, 0.42);
  const ou = '#3b2a45';
  const hairId = look.hair || 'none';
  let rawHairCol = resolveHairColor(look.hairCol, look.col || '#ffb3c7');
  if (bloom < 1) {
    rawHairCol = interpolateColor('#7d7d88', rawHairCol, bloom);
  }
  const hairCol = rawHairCol;
  const hairShade = fastShade(hairCol, -0.2);
  const hairHi = fastShade(hairCol, 0.25);
  const sw = isMoving ? Math.sin(safeTime * 12) : 0;
  const isSlime = sp === 'slime';
  const fy = isSlime ? 5 : 0;

  // Size scale modifier
  let sizeMul = 1;
  if (look.size === 'tiny') sizeMul = 0.82;
  else if (look.size === 'small') sizeMul = 0.92;
  else if (look.size === 'plump') sizeMul = 1.15;

  const isAirborne = jumpZ > 2;
  const hopBob = isMoving ? Math.sin(safeTime * 12) : Math.sin(safeTime * 2.6);
  const sqX = isAirborne ? 0.93 : isMoving ? 1 + Math.sin(safeTime * 24) * 0.045 : 1 + Math.sin(safeTime * 2.6) * 0.018;
  const sqY = isAirborne ? 1.07 : isMoving ? 1 - Math.sin(safeTime * 24) * 0.045 : 1 - Math.sin(safeTime * 2.6) * 0.018;
  void hopBob;

  ctx.save();
  try {
  ctx.translate(x, y);
  ctx.scale(scale * sizeMul * (facing < 0 ? -1 : 1), scale * sizeMul);

  // Soft ground shadow (contracts softly when jumping)
  const liftScale = Math.max(0.46, 1 - (Math.abs(safeBob) + jumpZ * 0.45) * 0.03);
  ctx.fillStyle = isSwimming && !isAirborne ? 'rgba(28, 128, 185, 0.28)' : 'rgba(28, 16, 48, 0.24)';
  ctx.beginPath();
  ctx.ellipse(0, 15.2, 13.5 * liftScale, 4.6 * liftScale, 0, 0, Math.PI * 2);
  ctx.fill();

  if (isSwimming && !isAirborne) {
    const ripR = 14.5 + Math.sin(safeTime * 6) * 2.2;
    ctx.strokeStyle = 'rgba(215, 248, 255, 0.82)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 8 + safeBob * 0.35, ripR, 5.4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.translate(0, (isSwimming && !isAirborne ? safeBob * 0.65 + 3.5 : safeBob) - jumpZ * 0.65);
  ctx.scale(sqX, sqY);

  const ellipse = (
    a: number,
    b: number,
    rx: number,
    ry: number,
    fill: string | CanvasGradient | CanvasPattern,
    rot: number = 0,
    strokeCol?: string,
    strokeW: number = 1.25
  ) => {
    const safeRx = Math.max(0.1, rx);
    const safeRy = Math.max(0.1, ry);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(a, b, safeRx, safeRy, rot, 0, Math.PI * 2);
    ctx.fill();
    if (strokeCol) {
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = strokeW;
      ctx.stroke();
    }
  };

  const grad = (a: number, b: number, r: number) => {
    const safeR = Math.max(0.5, r);
    const g = ctx.createRadialGradient(a - safeR * 0.35, b - safeR * 0.42, safeR * 0.08, a, b, safeR * 1.18);
    g.addColorStop(0, hi);
    g.addColorStop(0.58, col);
    g.addColorStop(1, dk);
    return g;
  };

  const circle = (cx: number, cy: number, r: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(0.1, r), 0, Math.PI * 2);
    ctx.fill();
  };

  // Back-layer Magic Aura (Stardust Aurora ring behind character)
  if (look.aura === 11) {
    ctx.save();
    const auraGrad = ctx.createRadialGradient(0, -6, 6, 0, -6, 26);
    auraGrad.addColorStop(0, 'rgba(180, 140, 255, 0.05)');
    auraGrad.addColorStop(0.65, 'rgba(130, 230, 255, 0.25)');
    auraGrad.addColorStop(1, 'rgba(180, 140, 255, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, -6, 26 + Math.sin(time * 3) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Draw 10 Patterns
  const drawPattern = (a: number, b: number, rx: number, ry: number) => {
    if (!look.pat) return;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(a, b, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha = look.pat === 3 || look.pat === 7 ? 0.85 : 0.45;

    const patColor = look.dye2 || dk;

    if (look.pat === 1) {
      for (let i = 0; i < 5; i++) {
        circle(a - rx * 0.6 + i * rx * 0.3, b + (((i * 7) % 5) - 2) * ry * 0.35, ry * 0.2, patColor);
      }
    } else if (look.pat === 2) {
      ctx.fillStyle = patColor;
      for (let i = -3; i < 4; i++) {
        ctx.fillRect(a + i * 4.2 - 1, b - ry, 2.2, ry * 2);
      }
    } else if (look.pat === 3) {
      for (let i = 0; i < 4; i++) {
        circle(a - rx * 0.5 + i * rx * 0.33, b - ry * 0.3 + (i % 2) * ry * 0.6, ry * 0.14, '#ffffff');
      }
    } else if (look.pat === 4) {
      for (let i = 0; i < 6; i++) {
        circle(a - rx * 0.4 + (i % 3) * 3, b - ry * 0.1 + Math.floor(i / 3) * 2.5, 1, patColor);
      }
    } else if (look.pat === 5) {
      circle(a - rx * 0.4, b - ry * 0.3, rx * 0.35, patColor);
      circle(a + rx * 0.3, b + ry * 0.2, rx * 0.28, patColor);
    } else if (look.pat === 6) {
      circle(a - rx * 0.3, b, rx * 0.22, '#ffffff');
      circle(a + rx * 0.2, b - ry * 0.2, rx * 0.25, '#ffffff');
    } else if (look.pat === 7) {
      circle(a - rx * 0.3, b - ry * 0.2, 1.8, '#ffd23f');
      circle(a + rx * 0.4, b + ry * 0.3, 1.4, '#ffd23f');
    } else if (look.pat === 8) {
      ctx.strokeStyle = '#c26bff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(a, b, rx * 0.45, 0, Math.PI * 1.5);
      ctx.stroke();
    } else if (look.pat === 9) {
      const gradPat = ctx.createLinearGradient(a, b - ry, a, b + ry);
      gradPat.addColorStop(0, 'rgba(255,255,255,0.4)');
      gradPat.addColorStop(1, patColor);
      ctx.fillStyle = gradPat;
      ctx.fillRect(a - rx, b - ry, rx * 2, ry * 2);
    }
    ctx.restore();
  };

  // Hollow Scarf (wispy melody lines)
  if (look.isHollow || bloom < 0.9) {
    ctx.save();
    ctx.strokeStyle = 'rgba(190, 190, 210, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.bezierCurveTo(-14, 4 + Math.sin(time * 3) * 3, -18, -4 + Math.cos(time * 2) * 4, -26, 2);
    ctx.stroke();
    ctx.restore();
  }

  // Wings (Dragon & Owl back wings)
  if (sp === 'dragon') {
    const fl = Math.sin(time * (isMoving ? 10 : 3)) * 0.3;
    for (const k of [-1, 1]) {
      ctx.save();
      ctx.translate(k * 6, -4);
      ctx.rotate(k * (0.5 + fl));
      ctx.fillStyle = ac;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(k * 14, -16, k * 19, -3);
      ctx.quadraticCurveTo(k * 10, -5, 0, 5);
      ctx.fill();
      ctx.restore();
    }
  } else if (sp === 'owl') {
    const fl = Math.sin(safeTime * (isMoving ? 9 : 2.5)) * 0.25;
    for (const k of [-1, 1]) {
      ctx.save();
      ctx.translate(k * 7, -2);
      ctx.rotate(k * (0.4 + fl));
      ctx.fillStyle = fastShade(col, -0.15);
      ctx.beginPath();
      ctx.ellipse(0, 3, 3, 7, k * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Resolve unified outfit pieces & colors for 2D preview consistency
  const outfitParts = resolveOutfitParts(look);
  const outCol1 = outfitParts.col1 || ac;
  const outCol2 = outfitParts.col2 || '#ffffff';

  // Outfits Back Layer (Cape, Royal Cloak, Backpack, Fairy Wings, Back Bow)
  if (outfitParts.layer === 'cape' || outfitParts.layer === 'royal_cape') {
    const capeCol = outfitParts.top !== 'none' ? outCol2 : outCol1;
    ctx.fillStyle = capeCol;
    ctx.beginPath();
    ctx.moveTo(-9, -4);
    ctx.lineTo(9, -4);
    ctx.lineTo(13 + Math.sin(safeTime * 3.5) * 2 + (isMoving ? 4 : 0), 14);
    ctx.lineTo(-13 + Math.sin(safeTime * 3.5) * 1.2, 14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = fastShade(capeCol, -0.25);
    ctx.lineWidth = 0.9;
    ctx.stroke();
  } else if (outfitParts.layer === 'backpack') {
    const packCol = outfitParts.top !== 'none' ? fastShade(outCol2, -0.18) : outCol1;
    ctx.fillStyle = fastShade(packCol, -0.18);
    ctx.beginPath();
    ctx.roundRect(-15.5, -5, 9.5, 13, 3);
    ctx.fill();
    ctx.fillStyle = packCol;
    ctx.fillRect(-14.5, -2.5, 7.5, 2.5);
    circle(-11, 2.5, 1.3, '#ffd23f');
  } else if (outfitParts.layer === 'back_bow') {
    ctx.fillStyle = outCol2;
    circle(-12.5, 2, 3.8, outCol2);
    circle(-9.5, 6.5, 2.2, outCol2);
  } else if (outfitParts.layer === 'fairy_wings') {
    const wf = Math.sin(safeTime * (isMoving ? 10 : 4)) * 0.18;
    for (const k of [-1, 1]) {
      ctx.save();
      ctx.translate(k * 7, -3);
      ctx.rotate(k * (0.3 + wf));
      ellipse(k * 7, -3, 7.5, 3.6, 'rgba(155, 232, 255, 0.78)', k * 0.2, outCol2, 0.7);
      ellipse(k * 5.5, 2, 5.2, 2.8, outCol2, -k * 0.25);
      ctx.restore();
    }
  }

  // Hair Back Layer (draped behind head, torso & ears)
  if (hairId !== 'none') {
    const hairSwing = sw * 1.4 + Math.sin(safeTime * 2.6) * 0.65;
    if (hairId === 'long_wavy' || hairId === 'hime') {
      const lenBottom = isSlime ? 9 : 8;
      ctx.fillStyle = hairShade;
      ctx.strokeStyle = ou;
      ctx.lineWidth = 1.05;
      ctx.beginPath();
      ctx.moveTo(-12.5, -13 + fy);
      ctx.quadraticCurveTo(-15.5 + hairSwing * 0.3, -2 + fy, -14 + hairSwing * 0.5, lenBottom);
      ctx.quadraticCurveTo(-6, lenBottom + 2.5, 0, lenBottom + 1.2);
      ctx.quadraticCurveTo(6, lenBottom + 2.5, 14 + hairSwing * 0.5, lenBottom);
      ctx.quadraticCurveTo(15.5 + hairSwing * 0.3, -2 + fy, 12.5, -13 + fy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (hairId === 'long_wavy') {
        for (const wx of [-9, 0, 9]) {
          ellipse(wx + hairSwing * 0.35, lenBottom - 1, 4.2, 3.2, hairCol, 0, ou, 0.85);
        }
      }
    } else if (hairId === 'bob' || hairId === 'curtains' || hairId === 'braids') {
      ellipse(0, -10 + fy, 13.8, 12.2, hairShade, 0, ou, 1.0);
    } else if (hairId === 'undercut') {
      // Jagged wolf-cut nape spikes fanning behind neck
      ctx.fillStyle = hairShade;
      ctx.strokeStyle = ou;
      ctx.lineWidth = 0.95;
      for (const [nx, rot] of [
        [-9.5, 0.45],
        [-4.5, 0.18],
        [4.5, -0.18],
        [9.5, -0.45],
      ]) {
        ctx.save();
        ctx.translate(nx, -2 + fy * 0.6);
        ctx.rotate(rot + hairSwing * 0.04);
        ctx.beginPath();
        ctx.moveTo(-3.2, -3);
        ctx.lineTo(0, 6.2);
        ctx.lineTo(3.2, -3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    } else if (hairId === 'ponytail') {
      ctx.save();
      ctx.translate(-10.5, -14 + fy);
      ctx.rotate(0.45 + hairSwing * 0.09);
      ellipse(-3, 6.5, 4.8, 9.8, hairShade, 0.2, ou, 1.05);
      ellipse(-2, 5.5, 3.6, 7.6, hairCol, 0.18);
      circle(0, 0, 2.3, ac);
      ctx.restore();
    } else if (hairId === 'twintails') {
      for (const k of [-1, 1]) {
        ctx.save();
        ctx.translate(k * 12.2, -12 + fy);
        ctx.rotate(-k * 0.25 + hairSwing * 0.1 * k);
        ellipse(k * 2.5, 7.5, 4.3, 9.2, hairShade, k * -0.15, ou, 1.0);
        ellipse(k * 2.2, 6.5, 3.3, 7.2, hairCol, k * -0.12);
        circle(k * 0.5, 0.4, 2.3, ac);
        ctx.restore();
      }
    } else if (hairId === 'fluffy_afro') {
      for (let i = 0; i < 8; i++) {
        const ang = Math.PI + (i / 7) * Math.PI;
        const cx = Math.cos(ang) * 14.5;
        const cy = -12.5 + fy + Math.sin(ang) * 11.5;
        ellipse(cx, cy, 6.4, 6.0, i % 2 === 0 ? hairCol : hairShade, 0, ou, 0.9);
      }
    }
  }

  // Tails with cozy outline & species details
  ctx.save();
  ctx.translate(-6.5, 5.5);
  ctx.rotate(Math.sin(time * 3.1) * 0.28 + (isMoving ? Math.sin(time * 12) * 0.2 : 0));
  if (sp === 'cat') {
    ctx.strokeStyle = ou;
    ctx.lineWidth = 5.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-12.5, -3, -10.5, -15.5);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = 3.4;
    ctx.stroke();
    circle(-10.5, -15.5, 1.8, fastShade(col, 0.35));
  } else if (sp === 'fox') {
    ellipse(-9, -3, 8.6, 5.3, col, -0.55, ou, 1.1);
    ellipse(-14.5, -8, 4.1, 3.1, '#ffffff', -0.55);
  } else if (sp === 'dragon') {
    ctx.fillStyle = col;
    ctx.strokeStyle = ou;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.quadraticCurveTo(-12, -1, -15.5, -9);
    ctx.lineTo(-10.5, -11);
    ctx.quadraticCurveTo(-8, -4, 0, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ellipse(-14.5, -10, 3.8, 3.8, ac, 0, ou, 0.9);
  } else if (sp === 'bunny') {
    ellipse(-6.5, 0, 4.6, 4.6, '#ffffff', 0, ou, 1.0);
  } else if (sp === 'bear') {
    ellipse(-5.5, 0, 3.4, 3.4, col, 0, ou, 1.0);
  } else if (sp === 'otter') {
    ctx.fillStyle = col;
    ctx.strokeStyle = ou;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.quadraticCurveTo(-12.5, 4.5, -17, 1);
    ctx.quadraticCurveTo(-12.5, -0.5, 0, -4.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (sp === 'deer') {
    ellipse(-5.5, 0.8, 3.6, 4.8, '#ffffff', -0.3, ou, 1.0);
  }
  ctx.restore();

  // Feet / Base / Footwear
  if (isSlime) {
    ellipse(0, 8.2, 12.6, 6.8, grad(0, 6, 12.6), 0, ou, 1.3);
  } else {
    for (const k of [-1, 1]) {
      const lf = isMoving ? Math.max(0, Math.sin(safeTime * 12 + (k > 0 ? 0 : Math.PI))) * 3.1 : 0;
      const fx = k * 4.5;
      const fyFoot = 12.8 - lf;
      if (outfitParts.shoes !== 'none') {
        const shoeCol =
          outfitParts.shoes === 'boots'
            ? fastShade(outCol2, -0.35)
            : outfitParts.shoes === 'loafers'
            ? '#2f2438'
            : outfitParts.shoes === 'sneakers'
            ? outCol1
            : outCol2;
        ellipse(k * 3.9, 9.6, 3.2, 4.1, outfitParts.shoes === 'boots' ? shoeCol : dk);
        ellipse(fx, fyFoot, 4.6, 3.0, shoeCol, 0, ou, 1.05);
        if (outfitParts.shoes === 'sneakers') {
          ellipse(fx + 1.2, fyFoot + 0.5, 2.4, 1.8, '#ffffff');
        } else if (outfitParts.shoes === 'mary_janes') {
          ctx.fillStyle = outCol1;
          ctx.fillRect(fx - 2.8, fyFoot - 2.1, 5.6, 1.4);
          circle(fx + 0.8, fyFoot - 1.4, 0.9, '#ffd23f');
        } else if (outfitParts.shoes === 'loafers') {
          ctx.fillStyle = '#ffd23f';
          ctx.fillRect(fx - 1.2, fyFoot - 1.4, 2.8, 1.1);
        } else if (outfitParts.shoes === 'slippers') {
          circle(fx + 1.8, fyFoot - 1.5, 1.5, '#ffffff');
        }
      } else if (sp === 'penguin') {
        ellipse(k * 4.4, 13.5 - lf, 4.4, 2.5, '#ff9f43', 0, ou, 1.0);
      } else if (sp === 'frog') {
        ellipse(k * 5.2, 13 - lf, 5.2, 2.7, fastShade(col, -0.15), 0, ou, 1.0);
      } else {
        ellipse(k * 3.9, 9.6, 3.2, 4.1, dk);
        ellipse(fx, fyFoot, 4.4, 2.8, fastShade(col, -0.08), 0, ou, 1.05);
      }
    }
  }

  // Body with cozy lineart & specular highlight
  if (isSlime) {
    ellipse(0, -3, 13.2, 14.2, grad(0, -3, 14.2), 0, ou, 1.35);
    ellipse(0, 2.6, 8.2, 6.1, c2);
    drawPattern(0, -3, 13.2, 14.2);
    // Translucent slime inner shine & floating micro-bubbles
    ellipse(-5.2, -11.5, 3.8, 2.1, 'rgba(255, 255, 255, 0.72)', -0.45);
    circle(5.5, -5.5 + Math.sin(safeTime * 3) * 1.2, 1.6, 'rgba(255, 255, 255, 0.55)');
    circle(-4.2, 2.5 + Math.cos(safeTime * 2.5) * 1.1, 1.2, 'rgba(255, 255, 255, 0.45)');
  } else {
    ellipse(0, 2, 8.9, 7.8, grad(0, 2, 9.2), 0, ou, 1.25);
    if (sp === 'penguin') {
      ellipse(0, 2.8, 6.4, 6.4, '#ffffff');
    } else if (sp === 'owl') {
      ellipse(0, 3.2, 5.8, 5, c2);
      // Owl chest scallop feather tufts
      ctx.strokeStyle = fastShade(col, -0.18);
      ctx.lineWidth = 1;
      for (const ox of [-2.4, 0, 2.4]) {
        ctx.beginPath();
        ctx.arc(ox, 2.2, 1.5, 0.15, Math.PI - 0.15);
        ctx.stroke();
      }
    } else {
      ellipse(0, 3.4, 5.4, 4.6, c2);
    }
    if (sp === 'deer') {
      // Soft fawn speckles on flank
      circle(-4.5, 1.5, 1.1, '#fff5ee');
      circle(4.5, 2.5, 1.0, '#fff5ee');
    }
    drawPattern(0, 2, 8.9, 7.8);
  }

  // Front Torso Outfits (supports Classic 0..9 + Male/Female Presets + Mix & Match Layers!)
  const torsoTop = isSlime ? 1 : -1;
  const torsoW = isSlime ? 18.5 : 15;
  const { top, bottom, layer } = outfitParts;

  // --- A. Bottoms (Trousers, Jeans, Shorts, Cargo, Pleated/Flared/Petal Skirts, Hakama) ---
  if (bottom === 'trousers' || bottom === 'jeans' || bottom === 'shorts' || bottom === 'cargo_pants') {
    ctx.fillStyle = outCol2;
    ctx.beginPath();
    ctx.roundRect(-torsoW / 2, torsoTop + 4.5, torsoW, bottom === 'shorts' ? 4.8 : 6.2, 2.5);
    ctx.fill();
    if (!isSlime && bottom !== 'shorts') {
      ctx.fillRect(-6.2, torsoTop + 8.5, 4.8, 3.4);
      ctx.fillRect(1.4, torsoTop + 8.5, 4.8, 3.4);
    }
    ctx.fillStyle = fastShade(outCol2, -0.35);
    ctx.fillRect(-torsoW / 2, torsoTop + 4.2, torsoW, 1.5);
  } else if (bottom === 'pleated_skirt' || bottom === 'flared_skirt' || bottom === 'petal_skirt' || bottom === 'hakama') {
    const skirtCol = bottom === 'hakama' ? outCol1 : outCol2;
    ctx.fillStyle = skirtCol;
    ctx.beginPath();
    ctx.moveTo(-torsoW / 2 + 0.5, torsoTop + 3.5);
    ctx.lineTo(torsoW / 2 - 0.5, torsoTop + 3.5);
    ctx.lineTo(torsoW / 2 + (bottom === 'flared_skirt' ? 5 : 3.2), torsoTop + 11.2);
    ctx.lineTo(-torsoW / 2 - (bottom === 'flared_skirt' ? 5 : 3.2), torsoTop + 11.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ou;
    ctx.lineWidth = 0.85;
    ctx.stroke();

    if (bottom === 'pleated_skirt') {
      ctx.strokeStyle = outCol1;
      ctx.lineWidth = 1;
      for (const px of [-4.5, -1.5, 1.5, 4.5]) {
        ctx.beginPath();
        ctx.moveTo(px * 0.8, torsoTop + 4);
        ctx.lineTo(px * 1.15, torsoTop + 10.8);
        ctx.stroke();
      }
    } else if (bottom === 'flared_skirt' || bottom === 'petal_skirt') {
      ctx.fillStyle = outCol1;
      for (let i = -2; i <= 2; i++) {
        circle(i * 3.4, torsoTop + (bottom === 'petal_skirt' ? 8.8 : 5.2), 2.2, i % 2 === 0 ? outCol1 : '#ffffff');
      }
    }
  }

  // --- B. Tops ---
  if (top === 'tshirt') {
    ctx.fillStyle = outCol1;
    ctx.beginPath();
    ctx.roundRect(-torsoW / 2, torsoTop - 1.5, torsoW, 7.2, 2.5);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, torsoTop - 1.8, 3.2, 0, Math.PI);
    ctx.stroke();
  } else if (top === 'hoodie') {
    ctx.fillStyle = outCol1;
    ctx.beginPath();
    ctx.roundRect(-torsoW / 2 - 0.5, torsoTop - 2, torsoW + 1, 8.6, 3.2);
    ctx.fill();
    ctx.fillStyle = outCol2;
    ctx.beginPath();
    ctx.roundRect(-4.2, torsoTop + 2.8, 8.4, 3.2, 1.2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-2, torsoTop - 0.5);
    ctx.lineTo(-2, torsoTop + 2.2);
    ctx.moveTo(2, torsoTop - 0.5);
    ctx.lineTo(2, torsoTop + 2.2);
    ctx.stroke();
  } else if (top === 'cardigan') {
    ctx.fillStyle = outCol1;
    ctx.beginPath();
    ctx.roundRect(-torsoW / 2, torsoTop - 1.5, torsoW, 8.2, 2.8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1.8, torsoTop - 1.5, 3.6, 7.5);
    circle(1.8, torsoTop + 1.2, 0.85, '#fff4e0');
    circle(1.8, torsoTop + 3.6, 0.85, '#fff4e0');
  } else if (top === 'blazer' || top === 'peacoat') {
    ctx.fillStyle = outCol1;
    ctx.beginPath();
    ctx.roundRect(-torsoW / 2 - 0.5, torsoTop - 2, torsoW + 1, 9.2, 3);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-3.2, torsoTop - 2);
    ctx.lineTo(3.2, torsoTop - 2);
    ctx.lineTo(0, torsoTop + 3.5);
    ctx.closePath();
    ctx.fill();
    if (top === 'peacoat') {
      circle(-2.4, torsoTop + 3.2, 0.9, '#ffd23f');
      circle(2.4, torsoTop + 3.2, 0.9, '#ffd23f');
      circle(-2.4, torsoTop + 5.6, 0.9, '#ffd23f');
      circle(2.4, torsoTop + 5.6, 0.9, '#ffd23f');
    }
  } else if (top === 'vest') {
    ctx.fillStyle = '#fff6e8';
    ctx.beginPath();
    ctx.roundRect(-torsoW / 2, torsoTop - 1.5, torsoW, 7.5, 2.5);
    ctx.fill();
    ctx.fillStyle = outCol1;
    ctx.fillRect(-torsoW / 2, torsoTop - 1.5, 4.8, 7.2);
    ctx.fillRect(torsoW / 2 - 4.8, torsoTop - 1.5, 4.8, 7.2);
  } else if (top === 'varsity') {
    ctx.fillStyle = outCol1;
    ctx.beginPath();
    ctx.roundRect(-torsoW / 2 - 0.5, torsoTop - 1.8, torsoW + 1, 8.5, 3);
    ctx.fill();
    ctx.fillStyle = outCol2;
    ctx.fillRect(-1.2, torsoTop - 1.8, 2.4, 8.2);
    ctx.fillRect(-torsoW / 2, torsoTop + 5.2, torsoW, 1.5);
    circle(-3.5, torsoTop + 1.8, 1.4, '#ffd23f');
  } else if (top === 'tunic') {
    ctx.fillStyle = outCol1;
    ctx.beginPath();
    ctx.roundRect(-torsoW / 2 - 0.5, torsoTop - 1.5, torsoW + 1, 9.2, 3);
    ctx.fill();
    ctx.fillStyle = outCol2;
    ctx.fillRect(-torsoW / 2, torsoTop + 3.8, torsoW, 2.0);
    circle(0, torsoTop + 4.8, 1.3, '#ffd23f');
  } else if (top === 'blouse') {
    ctx.fillStyle = outCol1;
    ctx.beginPath();
    ctx.roundRect(-torsoW / 2, torsoTop - 1.5, torsoW, 7.6, 3);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, torsoTop - 1.6, 5.2, 0.1, Math.PI - 0.1);
    ctx.stroke();
    circle(0, torsoTop + 1.5, 1.3, outCol2);
  } else if (top === 'corset_top') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-torsoW / 2, torsoTop - 1.8, torsoW, 6.2, 2.5);
    ctx.fill();
    ctx.fillStyle = outCol1;
    ctx.beginPath();
    ctx.roundRect(-torsoW / 2 + 0.5, torsoTop + 0.8, torsoW - 1, 6.5, 2.2);
    ctx.fill();
    ctx.strokeStyle = outCol2;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-2, torsoTop + 1.8);
    ctx.lineTo(2, torsoTop + 3.2);
    ctx.moveTo(2, torsoTop + 1.8);
    ctx.lineTo(-2, torsoTop + 3.2);
    ctx.stroke();
  } else if (top === 'overalls_bib') {
    ctx.fillStyle = outCol1;
    ctx.beginPath();
    ctx.roundRect(-torsoW / 2 + 1.2, torsoTop + 0.8, torsoW - 2.4, 7.2, 2.5);
    ctx.fill();
    ctx.fillRect(-torsoW / 2 + 1, torsoTop - 4.5, 2.5, 6);
    ctx.fillRect(torsoW / 2 - 3.5, torsoTop - 4.5, 2.5, 6);
    circle(0, torsoTop + 4.2, 1.3, '#ffffff');
  } else if (top === 'sailor_top') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-torsoW / 2, torsoTop - 1.5, torsoW, 7.2, 2.5);
    ctx.fill();
    ctx.fillStyle = outCol1;
    ctx.beginPath();
    ctx.moveTo(-9.5, torsoTop - 2.5);
    ctx.lineTo(9.5, torsoTop - 2.5);
    ctx.lineTo(6.5, torsoTop + 4.5);
    ctx.lineTo(0, torsoTop + 2.2);
    ctx.lineTo(-6.5, torsoTop + 4.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
    circle(0, torsoTop + 2.5, 1.8, '#ff5277');
    ctx.fillStyle = '#ff5277';
    ctx.beginPath();
    ctx.moveTo(0, torsoTop + 2.5);
    ctx.lineTo(-2.5, torsoTop + 6.5);
    ctx.lineTo(2.5, torsoTop + 6.5);
    ctx.closePath();
    ctx.fill();
  } else if (top === 'kimono_top') {
    ctx.fillStyle = outCol1;
    ctx.beginPath();
    ctx.roundRect(-torsoW / 2, torsoTop - 2, torsoW, 11.5, 3.5);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-5, torsoTop - 2);
    ctx.lineTo(2, torsoTop + 4);
    ctx.moveTo(5, torsoTop - 2);
    ctx.lineTo(-2, torsoTop + 4);
    ctx.stroke();
    ctx.fillStyle = outCol2;
    ctx.fillRect(-torsoW / 2, torsoTop + 3.5, torsoW, 3);
    circle(0, torsoTop + 5, 1.8, '#ffd23f');
  } else if (top === 'parka') {
    ctx.fillStyle = outCol1;
    ctx.beginPath();
    ctx.roundRect(-torsoW / 2 - 1, torsoTop - 2, torsoW + 2, 11.5, 4);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-torsoW / 2 - 1, torsoTop - 2.8, torsoW + 2, 3.2, 2);
    ctx.roundRect(-torsoW / 2 - 1, torsoTop + 7.5, torsoW + 2, 2.5, 1.5);
    ctx.fill();
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(0, torsoTop + 0.5);
    ctx.lineTo(0, torsoTop + 8);
    ctx.stroke();
  } else if (top === 'apron') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-torsoW / 2 + 1.5, torsoTop - 1, torsoW - 3, 10, 2.5);
    ctx.fill();
    ctx.strokeStyle = fastShade(outCol2, -0.1);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = outCol2;
    ctx.fillRect(-torsoW / 2, torsoTop + 2.5, torsoW, 1.8);
    ctx.beginPath();
    ctx.roundRect(-3.2, torsoTop + 4.8, 6.4, 3.4, 1.2);
    ctx.fill();
  }

  // --- C. Front Neck & Clasp Layers ---
  if (layer === 'cape' || layer === 'royal_cape') {
    const claspCol = top !== 'none' ? outCol2 : outCol1;
    ctx.strokeStyle = claspCol;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, torsoTop - 1.5);
    ctx.quadraticCurveTo(0, torsoTop + 1.5, 6, torsoTop - 1.5);
    ctx.stroke();
    circle(-5.5, torsoTop - 1.5, 1.5, '#ffd23f');
    circle(5.5, torsoTop - 1.5, 1.5, '#ffd23f');
  } else if (layer === 'backpack') {
    const strapCol = top !== 'none' ? fastShade(outCol2, -0.25) : outCol1;
    ctx.fillStyle = strapCol;
    ctx.fillRect(-5.8, torsoTop - 4, 2, 9.5);
    ctx.fillRect(3.8, torsoTop - 4, 2, 9.5);
  } else if (layer === 'bowtie') {
    const bowCol = top !== 'none' ? outCol2 : outCol1;
    circle(-2.2, torsoTop - 0.5, 1.8, bowCol);
    circle(2.2, torsoTop - 0.5, 1.8, bowCol);
    circle(0, torsoTop - 0.5, 1.1, '#ffd23f');
  } else if (layer === 'necktie') {
    ctx.fillStyle = outCol2;
    ctx.beginPath();
    ctx.moveTo(-1.3, torsoTop - 0.8);
    ctx.lineTo(1.3, torsoTop - 0.8);
    ctx.lineTo(0.8, torsoTop + 4.5);
    ctx.lineTo(0, torsoTop + 5.8);
    ctx.lineTo(-0.8, torsoTop + 4.5);
    ctx.closePath();
    ctx.fill();
  } else if (layer === 'sash' && top !== 'kimono_top') {
    ctx.fillStyle = outCol2;
    ctx.fillRect(-torsoW / 2, torsoTop + 3.5, torsoW, 2.4);
    circle(0, torsoTop + 4.7, 1.5, '#ffd23f');
  }

  // Paws / Arms / Flippers (with long sleeves synced across all tops!)
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

  if (!isSlime) {
    for (const k of [-1, 1]) {
      ctx.save();
      ctx.translate(k * 8.6, -2);
      ctx.rotate(k * 0.45 - k * sw * 0.6);
      if (sp === 'penguin') {
        ellipse(0, 4, 2.5, 6.2, top === 'varsity' ? outCol2 : hasLongSleeves ? outCol1 : col, k * 0.2);
      } else {
        const armColor = top === 'varsity' ? outCol2 : hasLongSleeves ? outCol1 : col;
        ellipse(0, 3.5, 2.7, 4.6, armColor);
        ellipse(0, 7.6, 2.9, 2.9, fastShade(col, -0.06));
      }
      ctx.restore();
    }
  }

  // Gloom's Held Button or Dawn Half-Note on Chest
  if (look.isHollow || look.name === 'Gloom' || look.name === 'Dusk') {
    ctx.save();
    circle(0, 3, 2.8, '#d8b068');
    circle(0, 3, 1.8, '#f7e2a4');
    circle(-0.8, 2.5, 0.4, '#4a3520');
    circle(0.8, 2.5, 0.4, '#4a3520');
    circle(-0.8, 3.5, 0.4, '#4a3520');
    circle(0.8, 3.5, 0.4, '#4a3520');
    ctx.restore();
  }

  // Ears & Head Adornments by Species
  const wig = Math.sin(time * 2.4) * 0.08;

  if (sp === 'cat' || sp === 'fox') {
    const bg = sp === 'fox' ? 1.25 : 1;
    for (const k of [-1, 1]) {
      ctx.save();
      ctx.translate(k * 8, -19);
      ctx.rotate(k * (0.35 + wig));
      ctx.fillStyle = col;
      ctx.strokeStyle = ou;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-5.2 * bg, 3.2);
      ctx.lineTo(0, -10.5 * bg);
      ctx.lineTo(5.2 * bg, 3.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = sp === 'fox' ? '#3b2a45' : '#ffb6c9';
      ctx.beginPath();
      ctx.moveTo(-2.6 * bg, 2.5);
      ctx.lineTo(0, -6.2 * bg);
      ctx.lineTo(2.6 * bg, 2.5);
      ctx.fill();
      ctx.restore();
    }
  } else if (sp === 'bunny') {
    for (const k of [-1, 1]) {
      ctx.save();
      ctx.translate(k * 6, -22);
      ctx.rotate(k * (0.14 + wig * 1.5));
      ellipse(0, -9, 4.6, 11.4, col, 0, ou, 1.2);
      ellipse(0, -8.2, 2.2, 7.8, '#ffb6c9');
      ctx.restore();
    }
  } else if (sp === 'bear') {
    for (const k of [-1, 1]) {
      ellipse(k * 9, -21, 4.8, 4.8, col, 0, ou, 1.2);
      ellipse(k * 9, -21, 2.5, 2.5, '#ffb6c9');
    }
  } else if (sp === 'dragon') {
    for (const k of [-1, 1]) {
      ctx.save();
      ctx.translate(k * 6, -22);
      ctx.rotate(k * 0.3);
      ctx.fillStyle = ac;
      ctx.strokeStyle = ou;
      ctx.lineWidth = 1.05;
      ctx.beginPath();
      ctx.moveTo(-2.8, 2);
      ctx.lineTo(0, -8.8);
      ctx.lineTo(2.8, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  } else if (sp === 'owl') {
    for (const k of [-1, 1]) {
      ctx.save();
      ctx.translate(k * 7.2, -21);
      ctx.rotate(k * (0.24 + wig));
      ellipse(0, -4, 2.8, 5.8, fastShade(col, -0.15), 0, ou, 1.05);
      ctx.restore();
    }
  } else if (sp === 'frog') {
    for (const k of [-1, 1]) {
      ellipse(k * 7.5, -21, 5.2, 5.2, col, 0, ou, 1.15);
      ellipse(k * 7.5, -21, 2.9, 2.9, '#ffffff');
      circle(k * 7.5, -21, 1.45, ou);
      circle(k * 7.5 + 0.5, -21.5, 0.55, '#ffffff');
    }
  } else if (sp === 'axolotl') {
    for (const k of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.translate(k * 11, -17 + i * 4.2);
        ctx.rotate(k * (0.2 + i * 0.15 + wig));
        ellipse(k * 4, 0, 5.4, 2.4, ac, k * 0.15, ou, 0.85);
        ellipse(k * 4, 0, 3.1, 1.3, '#ffe9f2');
        ctx.restore();
      }
    }
  } else if (sp === 'otter') {
    for (const k of [-1, 1]) {
      ellipse(k * 9.5, -19, 3.7, 3.7, col, 0, ou, 1.1);
      ellipse(k * 9.5, -19, 1.9, 1.9, fastShade(col, -0.2));
    }
  } else if (sp === 'deer') {
    for (const k of [-1, 1]) {
      ellipse(k * 10, -19, 5.4, 3.3, col, k * 0.4, ou, 1.05);
      ellipse(k * 10, -19, 2.9, 1.7, '#fff4f6', k * 0.4);
      ctx.strokeStyle = '#735348';
      ctx.lineWidth = 2.1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(k * 4, -20);
      ctx.lineTo(k * 8, -28);
      ctx.lineTo(k * 11, -30);
      ctx.moveTo(k * 6, -24);
      ctx.lineTo(k * 9, -23);
      ctx.stroke();
    }
  }

  // Head with crisp cozy outline, rim shine & facial features
  if (isSlime) {
    ctx.strokeStyle = '#48a85c';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.quadraticCurveTo(2, -22, 5 + Math.sin(time * 3) * 2, -24);
    ctx.stroke();
    ellipse(5 + Math.sin(time * 3) * 2, -24, 3.6, 2.4, '#7bd88f', -0.5, ou, 0.9);
  } else {
    ellipse(0, -12, 12.2, 11.4, grad(0, -12, 12.6), 0, ou, 1.3);
    // Species face masks (Owl heart disc / Penguin cap / Bear & Otter cream muzzle)
    if (sp === 'owl') {
      ellipse(-3.6, -10.5, 5.2, 5.4, c2);
      ellipse(3.6, -10.5, 5.2, 5.4, c2);
    } else if (sp === 'penguin') {
      ellipse(-3.2, -9.8, 4.6, 5, '#ffffff');
      ellipse(3.2, -9.8, 4.6, 5, '#ffffff');
    } else if (sp === 'bear' || sp === 'otter') {
      ellipse(0.6, -8.2, 4.8, 3.4, c2);
    } else if (sp === 'fox') {
      ellipse(-6.5, -8, 4, 2.6, '#fff7ee', 0.25);
      ellipse(6.5, -8, 4, 2.6, '#fff7ee', -0.25);
    }
    drawPattern(0, -12, 12.2, 11.4);
    // Soft plush forehead rim highlight
    ellipse(-3.6, -18.8, 4.2, 1.7, 'rgba(255, 255, 255, 0.35)', -0.3);
  }

  // Knitted Scarf (from preset or custom layer) goes smoothly around the neck
  if (outfitParts.layer === 'scarf') {
    const scarfCol = outfitParts.top !== 'none' ? outCol2 : outCol1;
    ellipse(0, -1.2, isSlime ? 12.2 : 9.6, 2.8, scarfCol, 0, ou, 0.85);
    ctx.fillStyle = scarfCol;
    ctx.beginPath();
    ctx.moveTo(4, -1);
    ctx.lineTo(10 + Math.sin(time * 4) * 2, 5.5);
    ctx.lineTo(6, 6.5);
    ctx.fill();
  }

  // Always-present gentle rosy cheek warmth
  const ey = -11 + fy;
  const gz = 1.1;
  for (const k of [-1, 1]) {
    ellipse(k * 6.8 + gz, ey + 3.0, 2.2, 1.25, 'rgba(255, 130, 170, 0.42)');
  }

  // Eyes (8 Eye Styles with enhanced specular shine)
  for (const k of [-1, 1]) {
    const X = k * 4.3 + gz;
    const eyeFill = look.eyeCol || ou;

    if (isBlinking) {
      ctx.strokeStyle = eyeFill;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(X - 2.4, ey);
      ctx.lineTo(X + 2.4, ey);
      ctx.stroke();
    } else if (look.eyes === 1) {
      // Sparkle Eyes
      circle(X, ey, 3.1, eyeFill);
      circle(X + 0.9, ey - 1.0, 1.3, '#ffffff');
      circle(X - 0.8, ey + 0.9, 0.75, '#ffffff');
    } else if (look.eyes === 2) {
      // Happy ^
      ctx.strokeStyle = eyeFill;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(X, ey + 1, 2.5, Math.PI, 0);
      ctx.stroke();
    } else if (look.eyes === 3) {
      // Sleepy –
      ctx.strokeStyle = eyeFill;
      ctx.lineWidth = 1.7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(X - 2.4, ey);
      ctx.lineTo(X + 2.4, ey);
      ctx.stroke();
    } else if (look.eyes === 4) {
      // Star ★
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 === 0 ? 3.2 : 1.4;
        const ang = (i * Math.PI) / 5 - Math.PI / 2;
        if (i === 0) ctx.moveTo(X + Math.cos(ang) * rad, ey + Math.sin(ang) * rad);
        else ctx.lineTo(X + Math.cos(ang) * rad, ey + Math.sin(ang) * rad);
      }
      ctx.closePath();
      ctx.fill();
      circle(X, ey, 0.95, '#ffffff');
    } else if (look.eyes === 5) {
      // Heart ♥
      ctx.fillStyle = '#ff6fa0';
      circle(X - 1.1, ey - 0.6, 1.5, '#ff6fa0');
      circle(X + 1.1, ey - 0.6, 1.5, '#ff6fa0');
      ctx.beginPath();
      ctx.moveTo(X - 2.5, ey - 0.2);
      ctx.lineTo(X + 2.5, ey - 0.2);
      ctx.lineTo(X, ey + 2.4);
      ctx.closePath();
      ctx.fill();
    } else if (look.eyes === 6) {
      // Curious Eyes
      circle(X, ey - 0.3, 2.9, eyeFill);
      circle(X + 0.8, ey - 1.1, 1.15, '#ffffff');
      ctx.strokeStyle = eyeFill;
      ctx.lineWidth = 1.15;
      ctx.beginPath();
      ctx.arc(X, ey - 2.9, 2.2, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (look.eyes === 7) {
      // Crystal Eyes
      ctx.fillStyle = '#6ecbff';
      ctx.beginPath();
      ctx.moveTo(X, ey - 3.3);
      ctx.lineTo(X + 2.4, ey);
      ctx.lineTo(X, ey + 3.3);
      ctx.lineTo(X - 2.4, ey);
      ctx.closePath();
      ctx.fill();
      circle(X, ey - 0.5, 0.95, '#ffffff');
    } else {
      // 0 Classic Storybook Plush Eyes (rich depth + twin catchlights)
      circle(X, ey, 2.8, eyeFill);
      circle(X + 0.85, ey - 0.85, 1.1, '#ffffff');
      circle(X - 0.7, ey + 0.8, 0.5, 'rgba(255,255,255,0.75)');
    }
  }

  // Face Gear (5 Options: None, Wire Glasses, Cool Shades, Cheerful Blush, Star Freckles)
  const fyFace = ey;
  if (look.face === 1) {
    // 👓 Wire Glasses
    ctx.strokeStyle = '#3b2a45';
    ctx.lineWidth = 1.25;
    for (const k of [-1, 1]) {
      const gx = k * 4.3 + gz;
      ctx.beginPath();
      ctx.arc(gx, fyFace, 3.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(200, 240, 255, 0.28)';
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(-0.7 + gz, fyFace);
    ctx.lineTo(0.7 + gz, fyFace);
    ctx.stroke();
  } else if (look.face === 2) {
    // 😎 Cool Shades
    ctx.fillStyle = '#1f192b';
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 0.9;
    for (const k of [-1, 1]) {
      const gx = k * 4.3 + gz;
      ctx.beginPath();
      ctx.roundRect(gx - 3.6, fyFace - 2.4, 7.2, 4.8, 1.5);
      ctx.fill();
      ctx.stroke();
      // Lens shine
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.beginPath();
      ctx.moveTo(gx - 2, fyFace + 1.2);
      ctx.lineTo(gx + 0.5, fyFace - 1.5);
      ctx.stroke();
      ctx.strokeStyle = '#ffd23f';
    }
    ctx.fillRect(-1 + gz, fyFace - 1.2, 2.2, 1.2);
  } else if (look.face === 3) {
    // 🌸 Cheerful Blush
    for (const k of [-1, 1]) {
      ellipse(k * 7.2 + gz, fyFace + 3.2, 2.6, 1.5, 'rgba(255, 110, 155, 0.6)');
    }
  } else if (look.face === 4) {
    // ✨ Star Freckles
    for (const k of [-1, 1]) {
      const fx = k * 6.8 + gz;
      circle(fx, fyFace + 2.8, 1.0, '#ffd23f');
      circle(fx + k * 1.8, fyFace + 3.8, 0.85, '#ff7aa8');
      circle(fx - k * 1.4, fyFace + 4.1, 0.8, '#ffffff');
    }
  }

  // Nose / Beak
  if (sp === 'owl' || sp === 'penguin') {
    ctx.fillStyle = '#ffa502';
    ctx.beginPath();
    ctx.moveTo(-2, -8.5 + fy * 0.5);
    ctx.lineTo(2, -8.5 + fy * 0.5);
    ctx.lineTo(0, -6 + fy * 0.5);
    ctx.fill();
  } else {
    const noseColor = look.noseCol || fastShade(col, -0.35);
    circle(gz, -8.6 + fy * 0.6, 1.2, noseColor);
  }

  // Mouth / Smiles (6 Styles)
  const my = -6.8 + fy * 0.6;
  ctx.strokeStyle = ou;
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (look.mouth === 1) {
    // Happy Grin
    ctx.arc(gz, my, 3, 0, Math.PI);
  } else if (look.mouth === 2) {
    // Little Oh
    circle(gz, my + 0.3, 1.4, ou);
  } else if (look.mouth === 3) {
    // Playful Smirk
    ctx.moveTo(gz - 2, my + 0.3);
    ctx.quadraticCurveTo(gz + 1, my + 1.2, gz + 3.2, my - 1.2);
  } else if (look.mouth === 4) {
    // Cat Mouf :3
    ctx.arc(gz - 1.5, my, 1.6, 0, Math.PI);
    ctx.arc(gz + 1.5, my, 1.6, 0, Math.PI);
  } else if (look.mouth === 5) {
    // Bunny Pout ω
    ctx.arc(gz - 1.3, my + 0.5, 1.3, Math.PI * 0.1, Math.PI * 0.9);
    ctx.arc(gz + 1.3, my + 0.5, 1.3, Math.PI * 0.1, Math.PI * 0.9);
  } else {
    // 0 Sweet smile
    ctx.arc(gz, my - 0.4, 2.4, 0.2, Math.PI - 0.2);
  }
  ctx.stroke();

  // Whiskers for Cat and Otter
  if (sp === 'cat' || sp === 'otter') {
    ctx.strokeStyle = ou;
    ctx.lineWidth = 1;
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(k * 6, -7);
      ctx.lineTo(k * 13, -8);
      ctx.moveTo(k * 6, -6);
      ctx.lineTo(k * 13, -5);
      ctx.stroke();
    }
  }

  // Hair Crown, Bangs & Side-Locks Layer (drawn cleanly above brow line, under hats)
  const hat = look.hat;
  const hasCapHat = Boolean(
    hat && hat !== 'none' && hat !== 'halo' && hat !== 'earmuffs' && hat !== 'antlers'
  );
  const isDomeHat =
    hat === 'beanie' ||
    hat === 'lantern_cap' ||
    hat === 'aviator' ||
    hat === 'mushroom' ||
    hat === 'nightcap' ||
    hat === 'straw' ||
    hat === 'wizard' ||
    hat === 'pirate' ||
    hat === 'chef' ||
    hat === 'beret';

  if (hairId !== 'none') {
    const hy = fy;
    const drawCrownArch = (height = 9.2, width = 12.6) => {
      ctx.fillStyle = hairCol;
      ctx.strokeStyle = ou;
      ctx.lineWidth = 1.05;
      ctx.beginPath();
      ctx.ellipse(0, -17.4 + hy, width, height * 0.66, 0, Math.PI, 0);
      ctx.quadraticCurveTo(width * 0.55, -18.2 + hy, 0, -19.2 + hy);
      ctx.quadraticCurveTo(-width * 0.55, -18.2 + hy, -width, -17.4 + hy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ellipse(-3.2, -21 + hy, 3.6, 1.1, hairHi, -0.22);
    };

    const drawPartedBangs = (dip = 3.2) => {
      for (const k of [-1, 1]) {
        ctx.fillStyle = hairCol;
        ctx.strokeStyle = ou;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(0, -22 + hy);
        ctx.quadraticCurveTo(k * 7.2, -21.2 + hy, k * 12.0, -15.6 + hy + dip * 0.4);
        ctx.quadraticCurveTo(k * 6.8, -17.8 + hy, k * 1.4, -18.2 + hy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    };

    if (hairId === 'spiky') {
      drawCrownArch(9.2, 12.5);
      const spikes: [number, number, number, number][] = isDomeHat
        ? [
            [-10.5, -18.2, -0.95, 5.2],
            [-5.2, -19.8, -0.45, 4.4],
            [5.2, -19.8, 0.45, 4.4],
            [10.5, -18.2, 0.95, 5.2],
          ]
        : [
            [-8.4, -20.8, -0.52, hasCapHat ? 5.6 : 7.2],
            [-3.4, -22.2, -0.18, hasCapHat ? 6.2 : 8.4],
            [2.4, -22.5, 0.14, hasCapHat ? 6.2 : 8.6],
            [8.2, -20.8, 0.52, hasCapHat ? 5.6 : 7.4],
          ];
      for (const [sx, sy, rot, h] of spikes) {
        ctx.save();
        ctx.translate(sx, sy + hy);
        ctx.rotate(rot);
        ctx.fillStyle = hairCol;
        ctx.strokeStyle = ou;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(-2.8, 1.6);
        ctx.lineTo(0, -h);
        ctx.lineTo(2.8, 1.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      // Forehead wisps kept cleanly above eyes (-16.2 + hy)
      for (const fx of [-4.2, 0.8, 5.4]) {
        ctx.fillStyle = hairShade;
        ctx.beginPath();
        ctx.moveTo(fx - 2.0, -18.8 + hy);
        ctx.lineTo(fx + 0.4, -15.8 + hy);
        ctx.lineTo(fx + 2.2, -18.8 + hy);
        ctx.closePath();
        ctx.fill();
      }
    } else if (hairId === 'quiff') {
      drawCrownArch(9.0, 12.4);
      const tuck = isDomeHat ? 2.4 : hasCapHat ? 1.1 : 0;
      ctx.fillStyle = hairCol;
      ctx.strokeStyle = ou;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(-10.5, -17.6 + hy);
      ctx.quadraticCurveTo(-3.5, -26.2 + tuck + hy, 6.2, -23.5 + tuck + hy);
      ctx.quadraticCurveTo(11.6, -21 + tuck * 0.5 + hy, 10.6, -17 + hy);
      ctx.quadraticCurveTo(3, -18.4 + hy, -4, -17.6 + hy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ellipse(-1, -21.8 + tuck * 0.7 + hy, 4.4, 1.3, hairHi, -0.18);
    } else if (hairId === 'curtains') {
      drawCrownArch(9.2, 12.6);
      drawPartedBangs(3.8);
      for (const k of [-1, 1]) {
        ellipse(k * 12.0, -11.5 + hy, 2.0, 4.6, hairCol, k * -0.14, ou, 0.9);
      }
    } else if (hairId === 'tousled') {
      const curls: [number, number, number, number][] = isDomeHat
        ? [
            [-10.4, -16.8, 3.6, 3.4],
            [-6.4, -19.2, 3.6, 3.2],
            [6.4, -19.2, 3.6, 3.2],
            [10.4, -16.8, 3.6, 3.4],
          ]
        : [
            [-9.8, -17.4, 3.9, 3.6],
            [-5.2, -21.2, 4.3, 3.8],
            [0.4, -22.2, 4.5, 3.9],
            [5.8, -20.8, 4.2, 3.7],
            [10.0, -17.0, 3.8, 3.5],
          ];
      for (let i = 0; i < curls.length; i++) {
        const [cx, cy, rx, ry] = curls[i];
        ellipse(cx, cy + hy, rx, ry, i % 2 === 0 ? hairCol : hairShade, 0, ou, 0.9);
      }
      if (!isDomeHat) ellipse(-2.4, -22.2 + hy, 3.2, 1.1, hairHi, -0.2);
    } else if (hairId === 'undercut') {
      drawCrownArch(9.0, 12.5);
      const spikes = isDomeHat
        ? [
            [-9.5, -18.5, -0.75],
            [9.5, -18.5, 0.75],
          ]
        : [
            [-7, -20.8, -0.42],
            [-1.5, -21.4, -0.05],
            [4.5, -21.0, 0.25],
            [9.2, -19.6, 0.55],
          ];
      for (const [sx, sy, rot] of spikes) {
        ctx.save();
        ctx.translate(sx, sy + hy);
        ctx.rotate(rot);
        ctx.fillStyle = hairCol;
        ctx.strokeStyle = ou;
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.moveTo(-2.5, 1.5);
        ctx.lineTo(0, -5.5);
        ctx.lineTo(2.5, 1.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      for (const k of [-1, 1]) {
        ellipse(k * 12.0, -10.5 + hy, 1.9, 5.6, hairCol, k * -0.1, ou, 0.9);
      }
    } else if (hairId === 'pomp') {
      drawCrownArch(8.8, 12.2);
      const tuck = isDomeHat ? 2.8 : hasCapHat ? 1.2 : 0;
      ellipse(0.6, -22.2 + tuck + hy, isDomeHat ? 7.6 : 8.4, isDomeHat ? 3.5 : 4.6, hairCol, -0.1, ou, 1.1);
      ellipse(-1.2, -23.4 + tuck + hy, 4.6, 1.4, hairHi, -0.12);
      for (const k of [-1, 1]) {
        ellipse(k * 11.8, -14.8 + hy, 1.6, 3.2, hairShade, 0, ou, 0.8);
      }
    } else if (hairId === 'bob') {
      drawCrownArch(9.4, 12.8);
      for (const k of [-1, 1]) {
        ellipse(k * 12.2, -10.2 + hy, 2.3, 7.4, hairCol, k * -0.06, ou, 0.95);
      }
      ctx.fillStyle = hairCol;
      ctx.strokeStyle = ou;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.roundRect(-9.8, -21.2 + hy, 19.6, 4.2, 2.0);
      ctx.fill();
      ctx.stroke();
      ellipse(-3, -19.6 + hy, 4.0, 0.9, hairHi);
    } else if (hairId === 'twintails' || hairId === 'ponytail') {
      drawCrownArch(9.2, 12.6);
      drawPartedBangs(2.8);
      for (const k of [-1, 1]) {
        ellipse(k * 11.8, -11.5 + hy, 1.7, 4.2, hairCol, k * -0.12, ou, 0.85);
      }
    } else if (hairId === 'long_wavy') {
      drawCrownArch(9.4, 12.8);
      drawPartedBangs(3.4);
      for (const k of [-1, 1]) {
        ellipse(k * 12.2, -8.5 + hy, 2.0, 7.0, hairCol, k * -0.08, ou, 0.9);
      }
    } else if (hairId === 'space_buns') {
      const bunX = isDomeHat ? 11.2 : 9.4;
      const bunY = isDomeHat ? -18.8 : -22.0;
      const bunR = isDomeHat ? 3.9 : 4.5;
      for (const k of [-1, 1]) {
        ellipse(k * bunX, bunY + hy, bunR, bunR * 0.96, hairCol, 0, ou, 1.0);
        ellipse(k * (bunX - 0.8), bunY - 1.3 + hy, 1.6, 0.9, hairHi, -0.3 * k);
        ellipse(k * (bunX - 1.1), bunY + 2.4 + hy, 2.8, 0.95, ac, k * 0.42, ou, 0.7);
      }
      drawCrownArch(9.0, 12.5);
      drawPartedBangs(2.8);
    } else if (hairId === 'braids') {
      drawCrownArch(9.2, 12.6);
      drawPartedBangs(3.0);
      for (const k of [-1, 1]) {
        for (let b = 0; b < 4; b++) {
          ellipse(
            k * (12.0 + b * 0.35),
            -10.5 + hy + b * 3.8,
            2.3 - b * 0.22,
            2.1 - b * 0.18,
            b % 2 === 0 ? hairCol : hairShade,
            0,
            ou,
            0.82
          );
        }
        circle(k * 13.0, -10.5 + hy + 14.5, 1.5, ac);
      }
    } else if (hairId === 'hime') {
      drawCrownArch(9.4, 12.8);
      ctx.fillStyle = hairCol;
      ctx.strokeStyle = ou;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.roundRect(-9.4, -21.2 + hy, 18.8, 4.1, 1.5);
      ctx.fill();
      ctx.stroke();
      for (const k of [-1, 1]) {
        ctx.fillStyle = hairCol;
        ctx.strokeStyle = ou;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.roundRect(k > 0 ? 10.6 : -13.1, -17.5 + hy, 2.5, 13.2, 1.1);
        ctx.fill();
        ctx.stroke();
      }
      ellipse(-3, -19.6 + hy, 4.0, 0.9, hairHi);
    } else if (hairId === 'pixie_curl') {
      drawCrownArch(8.8, 12.3);
      ctx.fillStyle = hairCol;
      ctx.strokeStyle = ou;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-9.5, -18.4 + hy);
      ctx.quadraticCurveTo(-0.5, -22 + hy, 10.2, -16.4 + hy);
      ctx.quadraticCurveTo(2.5, -17.4 + hy, -9.5, -18.4 + hy);
      ctx.fill();
      ctx.stroke();
      ellipse(11.6, -12 + hy, 2.1, 3.8, hairCol, -0.22, ou, 0.85);
      ellipse(-2, -20.5 + hy, 3.2, 1.0, hairHi, -0.15);
    } else if (hairId === 'fluffy_afro') {
      const topCurls: [number, number, number, number][] = isDomeHat
        ? [
            [-11.2, -15.5, 4.0, 4.0],
            [-7.2, -19.5, 3.8, 3.5],
            [7.2, -19.5, 3.8, 3.5],
            [11.2, -15.5, 4.0, 4.0],
          ]
        : [
            [-11.0, -15.8, 4.2, 4.2],
            [-6.4, -20.8, 4.6, 4.2],
            [0, -22.2, 5.0, 4.4],
            [6.4, -20.8, 4.6, 4.2],
            [11.0, -15.8, 4.2, 4.2],
          ];
      for (let i = 0; i < topCurls.length; i++) {
        const [cx, cy, rx, ry] = topCurls[i];
        ellipse(cx, cy + hy, rx, ry, i % 2 === 0 ? hairCol : hairShade, 0, ou, 0.9);
      }
      if (!isDomeHat) ellipse(-2.5, -22.8 + hy, 3.4, 1.2, hairHi, -0.18);
    }
  }

  // Hats & Headwear (ALL 22 HAT_OPTIONS + legacy aliases)
  const hairHatLift =
    hairId !== 'none'
      ? isDomeHat
        ? 0.8
        : hairId === 'pomp' || hairId === 'fluffy_afro' || hairId === 'quiff'
        ? 2.2
        : 1.2
      : 0;
  const hatY = (isSlime ? -17 : -22) - hairHatLift;

  if (hat === 'leaf') {
    ctx.save();
    ctx.translate(0, hatY - 1);
    ctx.rotate(Math.sin(time * 3) * 0.1);
    ctx.fillStyle = '#7bd88f';
    ctx.beginPath();
    ctx.ellipse(0, 0, 7.5, 4.2, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5bb86f';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  } else if (hat === 'bow' || hat === 'ribbon') {
    circle(-4, hatY, 3.2, ac);
    circle(4, hatY, 3.2, ac);
    circle(0, hatY, 2, '#ffffff');
  } else if (hat === 'crown') {
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(-6, hatY);
    ctx.lineTo(-7, hatY - 7);
    ctx.lineTo(-3, hatY - 3);
    ctx.lineTo(0, hatY - 8);
    ctx.lineTo(3, hatY - 3);
    ctx.lineTo(7, hatY - 7);
    ctx.lineTo(6, hatY);
    ctx.closePath();
    ctx.fill();
    circle(0, hatY - 2.5, 1.1, '#ff7aa8');
  } else if (hat === 'party') {
    ctx.fillStyle = ac;
    ctx.beginPath();
    ctx.moveTo(-5.5, hatY);
    ctx.lineTo(0, hatY - 11.5);
    ctx.lineTo(5.5, hatY);
    ctx.closePath();
    ctx.fill();
    circle(0, hatY - 12, 2.2, '#ffd23f');
    circle(-1.2, hatY - 5, 1.1, '#ffffff');
    circle(1.5, hatY - 3, 1.1, '#ffd23f');
  } else if (hat === 'wizard') {
    // Wide brim & tall pointy cap
    ellipse(0, hatY, 11.5, 3, '#5a4fcf');
    ctx.fillStyle = '#5a4fcf';
    ctx.beginPath();
    ctx.moveTo(-6.5, hatY);
    ctx.quadraticCurveTo(0, hatY - 14, 4, hatY - 15);
    ctx.lineTo(6.5, hatY);
    ctx.closePath();
    ctx.fill();
    ellipse(0, hatY - 1, 6.2, 1.3, '#ffd23f');
    circle(0, hatY - 7, 1.6, '#ffd23f');
  } else if (hat === 'flower') {
    const fCols = ['#ffffff', '#ff9ebb', '#ffd23f', '#ffffff'];
    for (let i = 0; i < 4; i++) {
      const fx = -6 + i * 4;
      const fyW = hatY + Math.abs(i - 1.5) * 0.6;
      circle(fx, fyW, 2.5, fCols[i]);
      circle(fx, fyW, 1.0, '#ffd23f');
    }
  } else if (hat === 'halo') {
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, hatY - 5, 7.5, 2.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (hat === 'beanie') {
    ctx.fillStyle = ac;
    ctx.beginPath();
    ctx.arc(0, hatY + 1, 8.5, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = fastShade(ac, -0.2);
    ctx.beginPath();
    ctx.roundRect(-9, hatY - 1, 18, 3.6, 1.8);
    ctx.fill();
    circle(0, hatY - 8.5, 2.5, '#ffffff');
  } else if (hat === 'beret') {
    ellipse(1.5, hatY - 1.5, 10, 4.5, ac, -0.18);
    ctx.strokeStyle = fastShade(ac, -0.3);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(1, hatY - 5.5);
    ctx.lineTo(2, hatY - 8);
    ctx.stroke();
  } else if (hat === 'chef') {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#d8cde0';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.roundRect(-7, hatY - 4, 14, 5, 1.5);
    ctx.fill();
    ctx.stroke();
    circle(-4, hatY - 6.5, 4.2, '#ffffff');
    circle(4, hatY - 6.5, 4.2, '#ffffff');
    circle(0, hatY - 8, 4.8, '#ffffff');
  } else if (hat === 'straw') {
    ellipse(0, hatY + 0.5, 13.5, 3.2, '#f3d078');
    ctx.fillStyle = '#e7bd56';
    ctx.beginPath();
    ctx.roundRect(-7, hatY - 5.5, 14, 6, 3);
    ctx.fill();
    ctx.fillStyle = ac;
    ctx.fillRect(-7, hatY - 1.8, 14, 2);
  } else if (hat === 'pirate') {
    ctx.fillStyle = '#2b2438';
    ctx.beginPath();
    ctx.moveTo(-11.5, hatY);
    ctx.quadraticCurveTo(0, hatY - 12, 11.5, hatY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    circle(0, hatY - 4.2, 2.1, '#ffffff');
  } else if (hat === 'lantern_cap') {
    ctx.fillStyle = '#ff7aa8';
    ctx.beginPath();
    ctx.roundRect(-7, hatY - 3, 14, 5, 2);
    ctx.fill();
    circle(0, hatY - 5, 2.2, '#ffd23f');
  } else if (hat === 'nightcap') {
    ctx.fillStyle = '#483d8b';
    ctx.beginPath();
    ctx.moveTo(-7.5, hatY);
    ctx.quadraticCurveTo(-2, hatY - 12, 10, hatY - 7);
    ctx.lineTo(7.5, hatY);
    ctx.closePath();
    ctx.fill();
    circle(10.5, hatY - 6.5, 2.3, '#ffd23f');
    circle(-1.5, hatY - 4.5, 1.3, '#ffd23f');
  } else if (hat === 'aviator') {
    ctx.fillStyle = '#8b5a2b';
    ctx.beginPath();
    ctx.arc(0, hatY + 1, 9, Math.PI, 0);
    ctx.fill();
    for (const k of [-1, 1]) {
      circle(k * 4, hatY - 2.5, 3.2, '#5c3a1b');
      circle(k * 4, hatY - 2.5, 2.1, '#7de0ff');
    }
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(-1.5, hatY - 3.2, 3, 1.4);
  } else if (hat === 'earmuffs') {
    ctx.strokeStyle = ac;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, -12 + fy * 0.5, 12.2, Math.PI * 1.08, -Math.PI * 0.08);
    ctx.stroke();
    circle(-11.8, -11.5 + fy * 0.5, 4.2, '#ffffff');
    circle(11.8, -11.5 + fy * 0.5, 4.2, '#ffffff');
    circle(-11.8, -11.5 + fy * 0.5, 2.4, ac);
    circle(11.8, -11.5 + fy * 0.5, 2.4, ac);
  } else if (hat === 'sprout') {
    ctx.strokeStyle = '#4caf50';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, hatY);
    ctx.quadraticCurveTo(1, hatY - 6, 0, hatY - 9);
    ctx.stroke();
    ellipse(-3.5, hatY - 8.5, 3.8, 2.2, '#7bd88f', -0.4);
    ellipse(3.5, hatY - 8.5, 3.8, 2.2, '#7bd88f', 0.4);
  } else if (hat === 'antlers') {
    ctx.strokeStyle = '#8d6e63';
    ctx.lineWidth = 2.1;
    ctx.lineCap = 'round';
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(k * 4.5, hatY + 1);
      ctx.lineTo(k * 8, hatY - 8);
      ctx.lineTo(k * 10.5, hatY - 11);
      ctx.moveTo(k * 6.5, hatY - 4);
      ctx.lineTo(k * 9.5, hatY - 3.5);
      ctx.stroke();
    }
  } else if (hat === 'mushroom') {
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(0, hatY + 1, 10.5, Math.PI, 0);
    ctx.fill();
    circle(-4.5, hatY - 3, 2, '#ffffff');
    circle(4.5, hatY - 2.5, 1.8, '#ffffff');
    circle(0, hatY - 6.5, 2.2, '#ffffff');
  } else if (hat === 'seashell') {
    ctx.fillStyle = '#ffccd5';
    ctx.strokeStyle = '#e5989b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-6, hatY);
    ctx.quadraticCurveTo(0, hatY - 11, 6, hatY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    circle(0, hatY - 2.5, 1.8, '#fff0f3');
  } else if (hat === 'honeycomb') {
    ctx.fillStyle = '#ffb703';
    ctx.beginPath();
    ctx.roundRect(-7.5, hatY - 5, 15, 6, 2);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    circle(-3, hatY - 5.5, 2.2, '#ffd166');
    circle(3, hatY - 5.5, 2.2, '#ffd166');
    circle(0, hatY - 6.5, 2.5, '#ffb703');
  }

  // Animated Foreground Magic Auras (1..11)
  if (look.aura && look.aura > 0) {
    const auraCount = look.aura === 9 ? 5 : 4;
    const auraPalette: Record<number, string[]> = {
      1: ['#ffd23f', '#ffffff', '#ff9ebb'], // Sparkles
      2: ['#ff6fa0', '#ff9ebb'], // Heart bubbles
      3: ['#ffb3c7', '#ffd3e2'], // Blossom petals
      4: ['#ff6b4a', '#ffd23f'], // Firefly embers
      5: ['#7de0ff', '#ffffff'], // Ocean bubbles
      6: ['#e0f7ff', '#ffffff'], // Snowflakes
      7: ['#ff7aa8', '#ffd23f'], // Music notes
      8: ['#e67e22', '#f1c40f'], // Autumn leaves
      9: ['#ff6b6b', '#ffd23f', '#7bd88f', '#5aa9ff', '#c26bff'], // Rainbow motes
      10: ['#ffb703', '#ffd166'], // Honey drops
      11: ['#b48cff', '#7de0ff', '#ffd23f'], // Stardust aurora motes
    };
    const palette = auraPalette[look.aura] || ['#ffd23f'];
    for (let i = 0; i < auraCount; i++) {
      const a = time * 1.9 + (i * Math.PI * 2) / auraCount;
      const rx = Math.cos(a) * 18;
      const ry = -6 + Math.sin(a * 1.4) * 10;
      const color = palette[i % palette.length];
      if (look.aura === 7) {
        ctx.fillStyle = color;
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText(i % 2 === 0 ? '♪' : '♫', rx - 2, ry + 2);
      } else if (look.aura === 2) {
        circle(rx - 1, ry, 1.5, color);
        circle(rx + 1, ry, 1.5, color);
        circle(rx, ry + 1.2, 1.4, color);
      } else {
        circle(rx, ry, look.aura === 5 ? 2.4 : 2.0, color);
      }
    }
  }

  } finally {
    ctx.restore();
  }
}

/**
 * Draw Adopted Companion Beside Player (2D Canvas Mode)
 * Rich storybook silhouettes matching each companion's 3D anatomy & lore.
 */
export function drawCompanion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  companionId: string,
  time: number
) {
  if (!ctx || !Number.isFinite(x) || !Number.isFinite(y) || companionId === 'none') return;
  const t = Number.isFinite(time) ? time : 0;
  ctx.save();
  try {
    const ou = '#3b2a45';
    let hoverY = Math.sin(t * 3.4) * 3.2;
    if (companionId === 'gary') {
      hoverY = -Math.abs(Math.sin(t * 1.6)) * 1.2;
    } else if (companionId === 'gloria') {
      hoverY = -Math.abs(Math.sin(t * 3.8)) * 2.4;
    } else if (companionId === 'frog') {
      hoverY = -Math.abs(Math.sin(t * 2.9)) * 4.2;
    } else if (companionId === 'whale') {
      hoverY = Math.sin(t * 2.4) * 3.5 - 2;
    }

    // Grounded soft shadow (scales subtly with height)
    const shScale = Math.max(0.65, 1 - Math.abs(hoverY) * 0.045);
    ctx.fillStyle = 'rgba(28, 16, 48, 0.22)';
    ctx.beginPath();
    ctx.ellipse(x, y + 13, 10.5 * shScale, 3.4 * shScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Gloria's turquoise water-skipping ripple ring on ground plane
    if (companionId === 'gloria') {
      const rp = (t * 1.5) % 1;
      ctx.strokeStyle = `rgba(82, 209, 220, ${(1 - rp) * 0.72})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(x, y + 12, 10 + rp * 7, 3.2 + rp * 2.2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.translate(x, y + hoverY);
    ctx.strokeStyle = ou;
    ctx.lineWidth = 1.25;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const drawEyes = (sep: number, ey: number, r: number, blushY = ey + 2.5) => {
      ctx.fillStyle = 'rgba(255, 130, 175, 0.58)';
      ctx.beginPath();
      ctx.ellipse(-sep - 2.3, blushY, 2.0, 1.15, 0, 0, Math.PI * 2);
      ctx.ellipse(sep + 2.3, blushY, 2.0, 1.15, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#22162b';
      ctx.beginPath();
      ctx.arc(-sep, ey, r, 0, Math.PI * 2);
      ctx.arc(sep, ey, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-sep + r * 0.34, ey - r * 0.36, r * 0.4, 0, Math.PI * 2);
      ctx.arc(sep + r * 0.34, ey - r * 0.36, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    };

    if (companionId === 'gloom') {
      // Dusk-Cloud Hushling Sprite: multi-puff twilight cloud, floppy cloud ears, dusk scarf, 4-hole brass button, orbiting lullaby spark
      const earBob = Math.sin(t * 3.8) * 0.14;
      const grad = ctx.createRadialGradient(-2, -6, 2, 0, 0, 13);
      grad.addColorStop(0, '#eef1fb');
      grad.addColorStop(0.65, '#cdd2e4');
      grad.addColorStop(1, '#a9b0cb');

      // Floppy cloud ears behind head
      ctx.fillStyle = '#e5e8f4';
      for (const k of [-1, 1]) {
        ctx.save();
        ctx.translate(k * 7.2, -5.8);
        ctx.rotate(k * (0.42 + earBob));
        ctx.beginPath();
        ctx.ellipse(0, 2.5, 2.6, 4.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // 5-puff sculpted cloud silhouette
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(-6.4, -0.5, 5.5, Math.PI * 0.55, Math.PI * 1.55);
      ctx.arc(-3.5, -5.8, 5.8, Math.PI * 0.85, Math.PI * 1.85);
      ctx.arc(3.5, -5.8, 5.8, Math.PI * 1.15, Math.PI * 0.15);
      ctx.arc(6.4, -0.5, 5.5, Math.PI * 1.45, Math.PI * 0.45);
      ctx.quadraticCurveTo(5.5, 7.5, 0, 7.8);
      ctx.quadraticCurveTo(-5.5, 7.5, -6.4, -0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Twilight dusk neckerchief
      ctx.fillStyle = '#4f4673';
      ctx.beginPath();
      ctx.ellipse(0, 4.4, 7.2, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      drawEyes(3.0, -1.8, 1.65, 1.0);

      // Heirloom 4-hole brass coat button charm
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.arc(0, 5.1, 3.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#fff5d6';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(-1.1, 4.0);
      ctx.lineTo(1.1, 6.2);
      ctx.moveTo(1.1, 4.0);
      ctx.lineTo(-1.1, 6.2);
      ctx.stroke();

      // Orbiting golden lullaby spark
      const ma = t * 2.4;
      const mx = Math.cos(ma) * 13;
      const my = -8 + Math.sin(ma * 1.6) * 2.5;
      ctx.fillStyle = '#ffe566';
      ctx.beginPath();
      ctx.arc(mx, my, 2.0, 0, Math.PI * 2);
      ctx.fill();
    } else if (companionId === 'gloria') {
      // Singing River-Agate Stone: smooth flat pebble, quartz mineral strata, Echo swirl, mossy shell hairpin
      const grad = ctx.createLinearGradient(-10, -6, 10, 6);
      grad.addColorStop(0, '#c2cee3');
      grad.addColorStop(0.5, '#8ca8c8');
      grad.addColorStop(1, '#68b6c7');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 2.5, 10.5, 6.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Agate quartz strata stripe
      ctx.strokeStyle = 'rgba(232, 252, 255, 0.65)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-8.5, 3.5);
      ctx.quadraticCurveTo(0, 6.5, 8.5, 2.5);
      ctx.stroke();

      // Moss cushion + tiny pink shell clip on crown-left
      ctx.strokeStyle = ou;
      ctx.lineWidth = 1.1;
      ctx.fillStyle = '#62cb82';
      ctx.beginPath();
      ctx.arc(-5.2, -3.0, 2.7, 0, Math.PI * 2);
      ctx.arc(-2.4, -3.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffa6c4';
      ctx.beginPath();
      ctx.arc(-4.5, -4.4, 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      drawEyes(3.0, 1.4, 1.35, 3.6);
      ctx.strokeStyle = ou;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(0, 3.2, 1.8, 0.2, Math.PI - 0.2);
      ctx.stroke();
    } else if (companionId === 'gary') {
      // Aristocratic Desert Slate Pet Rock: chunky faceted boulder, 3-leaf clover moss sprout, coral bandana, oversized googly eyes
      ctx.fillStyle = '#868599';
      ctx.beginPath();
      ctx.moveTo(-9.5, 4);
      ctx.lineTo(-8.2, -3.8);
      ctx.lineTo(-2.5, -7.8);
      ctx.lineTo(5.0, -7.2);
      ctx.lineTo(9.4, -1.8);
      ctx.lineTo(9.0, 5.2);
      ctx.lineTo(0, 7.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Facet shadow highlight
      ctx.fillStyle = 'rgba(46, 44, 64, 0.2)';
      ctx.beginPath();
      ctx.moveTo(2, -7.2);
      ctx.lineTo(9.4, -1.8);
      ctx.lineTo(9.0, 5.2);
      ctx.lineTo(2.5, 6.8);
      ctx.closePath();
      ctx.fill();

      // Coral adventurer neckerchief + knot
      ctx.fillStyle = '#ff6f61';
      ctx.beginPath();
      ctx.ellipse(0, 5.4, 8.6, 2.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-2.2, 6.2);
      ctx.lineTo(2.2, 6.2);
      ctx.lineTo(0, 10.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Moss pad + 3-leaf clover sprout
      ctx.fillStyle = '#5ec474';
      ctx.beginPath();
      ctx.ellipse(1, -7.5, 3.6, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(1, -8.5);
      ctx.lineTo(1, -12.5);
      ctx.stroke();
      for (const [lx, ly] of [
        [-1.4, -13.2],
        [3.4, -13.2],
        [1, -15.2],
      ]) {
        ctx.beginPath();
        ctx.arc(lx, ly, 1.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Expressive mismatched googly eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-2.8, -0.8, 2.4, 0, Math.PI * 2);
      ctx.arc(2.8, -0.8, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#22162b';
      ctx.beginPath();
      ctx.arc(-2.4, -0.6, 1.15, 0, Math.PI * 2);
      ctx.arc(2.4, -1.1, 1.15, 0, Math.PI * 2);
      ctx.fill();
    } else if (companionId === 'moth') {
      // Bioluminescent Luna Silk-Moth: warm glow aura, 4 scalloped moon-spot wings, cream ruff, plumose antennae
      const fl = Math.sin(t * 14) * 0.28;
      const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, 16);
      halo.addColorStop(0, 'rgba(255, 224, 110, 0.55)');
      halo.addColorStop(1, 'rgba(255, 224, 110, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();

      // 4 Crescent-spot wings (hinged at thorax)
      for (const k of [-1, 1]) {
        ctx.save();
        ctx.translate(k * 2.5, -1);
        ctx.rotate(k * (-0.35 + fl));
        // Hindwing
        ctx.fillStyle = '#f8df9c';
        ctx.beginPath();
        ctx.ellipse(k * 6.5, 4.2, 6.2, 3.6, k * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Forewing
        ctx.fillStyle = '#fff5c8';
        ctx.beginPath();
        ctx.ellipse(k * 7.8, -1.5, 8.2, 4.8, k * -0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Crescent moon spot
        ctx.fillStyle = '#6f4b9e';
        ctx.beginPath();
        ctx.arc(k * 8.8, -1.6, 2.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath();
        ctx.arc(k * 8.5, -1.8, 1.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Feathered gold antennae
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 1.8;
      for (const k of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(k * 1.5, -4.5);
        ctx.quadraticCurveTo(k * 4.5, -10.5, k * 6.8, -11.2);
        ctx.stroke();
      }

      // Velvet thorax & glowing ringed abdomen
      ctx.strokeStyle = ou;
      ctx.lineWidth = 1.2;
      ctx.fillStyle = '#ffe084';
      ctx.beginPath();
      ctx.ellipse(0, 3.2, 3.6, 5.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff8e2';
      ctx.beginPath();
      ctx.arc(0, -2.5, 4.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      drawEyes(1.8, -2.8, 1.1, -0.8);
    } else if (companionId === 'bee') {
      // Meadow-Nectar Fuzzy Bumblebee: veined gossamer wings, striped plump body, fuzzy ruff, pollen saddlebags
      const fl = Math.sin(t * 24) * 0.38;
      ctx.fillStyle = 'rgba(220, 246, 255, 0.86)';
      for (const k of [-1, 1]) {
        ctx.save();
        ctx.translate(k * 2.2, -3.5);
        ctx.rotate(k * (-0.52 + fl));
        ctx.beginPath();
        ctx.ellipse(k * 4.5, -2.8, 5.8, 2.9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Pollen saddlebags
      ctx.fillStyle = '#ff9f1c';
      for (const k of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(k * 5.2, 4.2, 2.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Striped abdomen + creamy ruff
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.ellipse(0, 0.8, 8.2, 6.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#3b2a45';
      ctx.fillRect(-3.6, -4.8, 2.2, 11.2);
      ctx.fillRect(0.5, -5.1, 2.2, 11.8);

      ctx.fillStyle = '#fff5d6';
      ctx.beginPath();
      ctx.ellipse(-4.6, 0.5, 3.0, 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Antennae + rosy face
      ctx.strokeStyle = ou;
      ctx.beginPath();
      ctx.moveTo(-5.8, -3.8);
      ctx.lineTo(-8.2, -7.8);
      ctx.moveTo(-4.0, -4.2);
      ctx.lineTo(-5.6, -8.5);
      ctx.stroke();
      drawEyes(2.1, -0.4, 1.25, 1.8);
    } else if (companionId === 'whale') {
      // Skyborne Cumulus Whale-Calf: cleft tail fluke, pleated cream belly, pectoral flipper, rainbow mist spout
      const tailWag = Math.sin(t * 5.2) * 2.4;
      ctx.fillStyle = '#8ad6ff';
      // Tail stock & cleft fluke
      ctx.beginPath();
      ctx.moveTo(-8, 1);
      ctx.lineTo(-14, -2.5 + tailWag * 0.5);
      ctx.lineTo(-16.5, -5.2 + tailWag);
      ctx.lineTo(-13.5, 0.5 + tailWag * 0.7);
      ctx.lineTo(-16.5, 5.4 + tailWag);
      ctx.lineTo(-12.5, 3.4 + tailWag * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Main whale body
      ctx.beginPath();
      ctx.ellipse(0.5, 0.5, 10.6, 7.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Ivory pleated belly
      ctx.fillStyle = '#fff8ee';
      ctx.beginPath();
      ctx.ellipse(1.5, 4.4, 8.2, 3.2, 0, 0, Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#b9d8ec';
      for (const px of [-2, 1, 4]) {
        ctx.beginPath();
        ctx.moveTo(px, 4.6);
        ctx.lineTo(px, 7.1);
        ctx.stroke();
      }

      // Swept pectoral flipper
      ctx.strokeStyle = ou;
      ctx.fillStyle = '#73c6f5';
      ctx.beginPath();
      ctx.ellipse(-1.2, 4.6, 3.8, 1.8, -0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Eye + cheek
      ctx.fillStyle = '#22162b';
      ctx.beginPath();
      ctx.arc(5.5, -0.5, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(6.0, -1.0, 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 130, 175, 0.55)';
      ctx.beginPath();
      ctx.ellipse(4.0, 2.0, 1.8, 1.0, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pastel rainbow blowhole mist spout
      const spY = -8.5 - Math.abs(Math.sin(t * 3.8)) * 2.5;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(1.5, spY + 2.2, 3.0, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const [dx, dy, col] of [
        [-2.2, spY - 1.5, '#ff9ebb'],
        [1.5, spY - 3.0, '#ffd23f'],
        [5.0, spY - 1.2, '#8cebff'],
      ] as const) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(dx, dy, 1.65, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (companionId === 'frog') {
      // Amber-Throat Lantern Frog: dappled emerald frog, webbed feet, domed golden-iris eyes, glowing lantern throat sac, dewdrop lily cap
      const sacPulse = 1 + Math.sin(t * 3.8) * 0.14;
      const lanternAura = ctx.createRadialGradient(0, 4.5, 1, 0, 4.5, 13 * sacPulse);
      lanternAura.addColorStop(0, 'rgba(255, 198, 60, 0.65)');
      lanternAura.addColorStop(1, 'rgba(255, 198, 60, 0)');
      ctx.fillStyle = lanternAura;
      ctx.beginPath();
      ctx.arc(0, 4.5, 13 * sacPulse, 0, Math.PI * 2);
      ctx.fill();

      // Webbed hind feet
      ctx.fillStyle = '#52b86b';
      for (const k of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(k * 7.8, 6.2, 3.4, 1.8, k * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Plump frog body
      ctx.fillStyle = '#5cc976';
      ctx.beginPath();
      ctx.ellipse(0, 1.8, 9.0, 6.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glowing inflatable amber lantern vocal throat sac
      ctx.fillStyle = '#ffdc6b';
      ctx.beginPath();
      ctx.ellipse(0, 4.2, 5.8 * sacPulse, 3.6 * sacPulse, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Mini lily-pad beret + dewdrop
      ctx.fillStyle = '#47a662';
      ctx.beginPath();
      ctx.ellipse(-1.2, -5.2, 4.8, 1.8, -0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#a8f0ff';
      ctx.beginPath();
      ctx.arc(-2.6, -6.2, 1.35, 0, Math.PI * 2);
      ctx.fill();

      // Domed golden-iris frog eyes
      for (const k of [-1, 1]) {
        ctx.fillStyle = '#5cc976';
        ctx.beginPath();
        ctx.arc(k * 4.4, -4.6, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath();
        ctx.arc(k * 4.4, -4.6, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22162b';
        ctx.beginPath();
        ctx.arc(k * 4.4, -4.6, 1.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(k * 4.4 + 0.5, -5.1, 0.55, 0, Math.PI * 2);
        ctx.fill();
      }

      // Wide happy frog grin
      ctx.strokeStyle = ou;
      ctx.beginPath();
      ctx.arc(0, 0.4, 4.4, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  } finally {
    ctx.restore();
  }
}

function parseColorRgb(col: string, fallback: [number, number, number]): [number, number, number] {
  if (!col) return fallback;
  const rgbMatch = col.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return [
      parseInt(rgbMatch[1], 10) || fallback[0],
      parseInt(rgbMatch[2], 10) || fallback[1],
      parseInt(rgbMatch[3], 10) || fallback[2],
    ];
  }
  let hex = col.replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length < 6) return fallback;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return [
    Number.isFinite(r) ? r : fallback[0],
    Number.isFinite(g) ? g : fallback[1],
    Number.isFinite(b) ? b : fallback[2],
  ];
}

function interpolateColor(c1: string, c2: string, factor: number): string {
  const f = Number.isFinite(factor) ? Math.max(0, Math.min(1, factor)) : 1;
  const [r1, g1, b1] = parseColorRgb(c1, [150, 150, 160]);
  const [r2, g2, b2] = parseColorRgb(c2, [255, 200, 200]);
  const r = Math.round(r1 + (r2 - r1) * f);
  const g = Math.round(g1 + (g2 - g1) * f);
  const b = Math.round(b1 + (b2 - b1) * f);
  return `rgb(${r},${g},${b})`;
}
