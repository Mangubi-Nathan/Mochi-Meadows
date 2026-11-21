/**
 * Mochi Meadows 2 Character & Companion Renderer
 * Supports all 12 playable species (Cat, Bunny, Bear, Fox, Dragon, Slime,
 * Owl, Frog, Axolotl, Otter, Penguin, Deer), 10 patterns, 22 hats, 10 outfits,
 * 5 face gear items, 8 eye styles, 6 mouth styles, 12 animated magic auras,
 * Hollow states with color blooming, and companions.
 */

import { PlayerLook, shadeColor } from './engine';

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
  time: number = 0
) {
  const sp = look.sp || 'cat';
  const bloom = look.hollowColorBloom !== undefined ? look.hollowColorBloom : (look.isHollow ? 0 : 1);

  // Color calculation with Hollow grey blending
  let rawCol = look.col || '#ffb3c7';
  let rawC2 = look.c2 || shadeColor(rawCol, 0.55);
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
  const dk = shadeColor(col, -0.28);
  const ou = '#3b2a45';
  const sw = isMoving ? Math.sin(time * 12) : 0;
  const isSlime = sp === 'slime';
  const fy = isSlime ? 5 : 0;

  // Size scale modifier
  let sizeMul = 1;
  if (look.size === 'tiny') sizeMul = 0.82;
  else if (look.size === 'small') sizeMul = 0.92;
  else if (look.size === 'plump') sizeMul = 1.15;

  const hopBob = isMoving ? Math.sin(time * 12) : Math.sin(time * 2.6);
  const sqX = isMoving ? 1 + Math.sin(time * 24) * 0.045 : 1 + Math.sin(time * 2.6) * 0.018;
  const sqY = isMoving ? 1 - Math.sin(time * 24) * 0.045 : 1 - Math.sin(time * 2.6) * 0.018;
  void hopBob;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * sizeMul * (facing < 0 ? -1 : 1), scale * sizeMul);

  // Soft ground shadow (contracts softly when hopping)
  const liftScale = Math.max(0.75, 1 - Math.abs(bob) * 0.03);
  ctx.fillStyle = 'rgba(28, 16, 48, 0.24)';
  ctx.beginPath();
  ctx.ellipse(0, 15.2, 13.5 * liftScale, 4.6 * liftScale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, bob);
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
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(a, b, rx, ry, rot, 0, Math.PI * 2);
    ctx.fill();
    if (strokeCol) {
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = strokeW;
      ctx.stroke();
    }
  };

  const grad = (a: number, b: number, r: number) => {
    const g = ctx.createRadialGradient(a - r * 0.35, b - r * 0.42, r * 0.08, a, b, r * 1.18);
    g.addColorStop(0, shadeColor(col, 0.42));
    g.addColorStop(0.58, col);
    g.addColorStop(1, dk);
    return g;
  };

  const circle = (cx: number, cy: number, r: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
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
    const fl = Math.sin(time * (isMoving ? 9 : 2.5)) * 0.25;
    for (const k of [-1, 1]) {
      ctx.save();
      ctx.translate(k * 7, -2);
      ctx.rotate(k * (0.4 + fl));
      ctx.fillStyle = shadeColor(col, -0.15);
      ctx.beginPath();
      ctx.ellipse(0, 3, 3, 7, k * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Outfits Back Layer: 2 = Brave Cape, 4 = Explorer Pack
  if (look.out === 2) {
    ctx.fillStyle = ac;
    ctx.beginPath();
    ctx.moveTo(-9, -4);
    ctx.lineTo(9, -4);
    ctx.lineTo(12.5 + Math.sin(time * 3.5) * 2 + (isMoving ? 4 : 0), 13.5);
    ctx.lineTo(-12.5 + Math.sin(time * 3.5) * 1.2, 13.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = shadeColor(ac, -0.25);
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }

  if (look.out === 4) {
    // Explorer Pack behind shoulder
    ctx.fillStyle = shadeColor(ac, -0.18);
    ctx.beginPath();
    ctx.roundRect(-15.5, -5, 9.5, 13, 3);
    ctx.fill();
    ctx.fillStyle = ac;
    ctx.fillRect(-14.5, -2.5, 7.5, 2.5);
    circle(-11, 2.5, 1.3, '#ffd23f');
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
    circle(-10.5, -15.5, 1.8, shadeColor(col, 0.35));
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

  // Feet / Base
  if (isSlime) {
    ellipse(0, 8.2, 12.6, 6.8, grad(0, 6, 12.6), 0, ou, 1.3);
  } else if (sp === 'penguin') {
    for (const k of [-1, 1]) {
      const lf = isMoving ? Math.max(0, Math.sin(time * 12 + (k > 0 ? 0 : Math.PI))) * 3.1 : 0;
      ellipse(k * 4.4, 13.5 - lf, 4.4, 2.5, '#ff9f43', 0, ou, 1.0);
    }
  } else if (sp === 'frog') {
    for (const k of [-1, 1]) {
      const lf = isMoving ? Math.max(0, Math.sin(time * 12 + (k > 0 ? 0 : Math.PI))) * 3.1 : 0;
      ellipse(k * 5.2, 13 - lf, 5.2, 2.7, shadeColor(col, -0.15), 0, ou, 1.0);
    }
  } else {
    for (const k of [-1, 1]) {
      const lf = isMoving ? Math.max(0, Math.sin(time * 12 + (k > 0 ? 0 : Math.PI))) * 3.1 : 0;
      ellipse(k * 3.9, 9.6, 3.2, 4.1, dk);
      ellipse(k * 4.5, 12.8 - lf, 4.4, 2.8, shadeColor(col, -0.08), 0, ou, 1.05);
    }
  }

  // Body with cozy lineart & specular highlight
  if (isSlime) {
    ellipse(0, -3, 13.2, 14.2, grad(0, -3, 14.2), 0, ou, 1.35);
    ellipse(0, 2.6, 8.2, 6.1, c2);
    drawPattern(0, -3, 13.2, 14.2);
    // Translucent slime inner shine & floating micro-bubbles
    ellipse(-5.2, -11.5, 3.8, 2.1, 'rgba(255, 255, 255, 0.72)', -0.45);
    circle(5.5, -5.5 + Math.sin(time * 3) * 1.2, 1.6, 'rgba(255, 255, 255, 0.55)');
    circle(-4.2, 2.5 + Math.cos(time * 2.5) * 1.1, 1.2, 'rgba(255, 255, 255, 0.45)');
  } else {
    ellipse(0, 2, 8.9, 7.8, grad(0, 2, 9.2), 0, ou, 1.25);
    if (sp === 'penguin') {
      ellipse(0, 2.8, 6.4, 6.4, '#ffffff');
    } else if (sp === 'owl') {
      ellipse(0, 3.2, 5.8, 5, c2);
      // Owl chest scallop feather tufts
      ctx.strokeStyle = shadeColor(col, -0.18);
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

  // Front Torso Outfits (works across ALL 12 species including Slime!)
  const torsoTop = isSlime ? 1 : -1;
  const torsoW = isSlime ? 18.5 : 15;

  if (look.out === 2) {
    // Brave Cape Clasp
    ctx.strokeStyle = ac;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, torsoTop - 1.5);
    ctx.quadraticCurveTo(0, torsoTop + 1.5, 6, torsoTop - 1.5);
    ctx.stroke();
    circle(-5.5, torsoTop - 1.5, 1.5, '#ffd23f');
    circle(5.5, torsoTop - 1.5, 1.5, '#ffd23f');
  } else if (look.out === 3) {
    // Denim Overalls
    ctx.fillStyle = ac;
    ctx.beginPath();
    ctx.roundRect(-torsoW / 2, torsoTop + 1.5, torsoW, 8.2, 3);
    ctx.fill();
    ctx.fillRect(-torsoW / 2 + 1, torsoTop - 4.5, 2.5, 7);
    ctx.fillRect(torsoW / 2 - 3.5, torsoTop - 4.5, 2.5, 7);
    circle(0, torsoTop + 5.2, 1.4, '#ffffff');
  } else if (look.out === 4) {
    // Explorer Pack shoulder straps
    ctx.fillStyle = ac;
    ctx.fillRect(-5.8, torsoTop - 4, 2, 9.5);
    ctx.fillRect(3.8, torsoTop - 4, 2, 9.5);
  } else if (look.out === 5) {
    // Sailor Collar
    ctx.fillStyle = ac;
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
    // Cute front ribbon knot
    circle(0, torsoTop + 2.5, 1.8, '#ff5277');
    ctx.fillStyle = '#ff5277';
    ctx.beginPath();
    ctx.moveTo(0, torsoTop + 2.5);
    ctx.lineTo(-2.5, torsoTop + 6.5);
    ctx.lineTo(0.2, torsoTop + 6.5);
    ctx.lineTo(2.5, torsoTop + 6.5);
    ctx.closePath();
    ctx.fill();
  } else if (look.out === 6) {
    // Blossom Yukata
    ctx.fillStyle = shadeColor(ac, 0.25);
    ctx.beginPath();
    ctx.roundRect(-torsoW / 2, torsoTop - 2, torsoW, 11.5, 3.5);
    ctx.fill();
    // Cross-lapel lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-5, torsoTop - 2);
    ctx.lineTo(2, torsoTop + 4);
    ctx.moveTo(5, torsoTop - 2);
    ctx.lineTo(-2, torsoTop + 4);
    ctx.stroke();
    // Obi sash
    ctx.fillStyle = ac;
    ctx.fillRect(-torsoW / 2, torsoTop + 3.5, torsoW, 3);
    circle(0, torsoTop + 5, 1.8, '#ffd23f');
  } else if (look.out === 7) {
    // Winter Parka
    ctx.fillStyle = ac;
    ctx.beginPath();
    ctx.roundRect(-torsoW / 2 - 1, torsoTop - 2, torsoW + 2, 11.5, 4);
    ctx.fill();
    // Fluffy white trim collar & hem
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-torsoW / 2 - 1, torsoTop - 2.8, torsoW + 2, 3.2, 2);
    ctx.roundRect(-torsoW / 2 - 1, torsoTop + 7.5, torsoW + 2, 2.5, 1.5);
    ctx.fill();
    // Zipper
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(0, torsoTop + 0.5);
    ctx.lineTo(0, torsoTop + 8);
    ctx.stroke();
  } else if (look.out === 8) {
    // Bakery Apron
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-torsoW / 2 + 1.5, torsoTop - 1, torsoW - 3, 10, 2.5);
    ctx.fill();
    ctx.strokeStyle = shadeColor(ac, -0.1);
    ctx.lineWidth = 1;
    ctx.stroke();
    // Waist ties & pocket in accent color
    ctx.fillStyle = ac;
    ctx.fillRect(-torsoW / 2, torsoTop + 2.5, torsoW, 1.8);
    ctx.beginPath();
    ctx.roundRect(-3.2, torsoTop + 4.8, 6.4, 3.4, 1.2);
    ctx.fill();
  } else if (look.out === 9) {
    // Beekeeper Suit
    ctx.fillStyle = '#fff4cc';
    ctx.beginPath();
    ctx.roundRect(-torsoW / 2, torsoTop, torsoW, 9.5, 3);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(-torsoW / 2, torsoTop + 3.8, torsoW, 2.2);
    circle(0, torsoTop + 5, 1.4, '#3b2a45');
  }

  // Paws / Arms / Flippers (drawn on non-slimes so arms stay visible outside outfits)
  if (!isSlime) {
    for (const k of [-1, 1]) {
      ctx.save();
      ctx.translate(k * 8.6, -2);
      ctx.rotate(k * 0.45 - k * sw * 0.6);
      if (sp === 'penguin') {
        ellipse(0, 4, 2.5, 6.2, col, k * 0.2);
      } else {
        const armColor = look.out === 7 ? ac : look.out === 6 ? shadeColor(ac, 0.25) : col;
        ellipse(0, 3.5, 2.7, 4.6, armColor);
        ellipse(0, 7.6, 2.9, 2.9, shadeColor(col, -0.06));
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
      ellipse(0, -4, 2.8, 5.8, shadeColor(col, -0.15), 0, ou, 1.05);
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
      ellipse(k * 9.5, -19, 1.9, 1.9, shadeColor(col, -0.2));
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

  // Knitted Scarf (outfit 1) goes smoothly around the neck
  if (look.out === 1) {
    ellipse(0, -1.2, isSlime ? 12.2 : 9.6, 2.8, ac, 0, ou, 0.85);
    ctx.fillStyle = ac;
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
    const noseColor = look.noseCol || shadeColor(col, -0.35);
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

  // Hats & Headwear (ALL 22 HAT_OPTIONS + legacy aliases)
  const hatY = isSlime ? -17 : -22;
  const hat = look.hat;

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
    ctx.fillStyle = shadeColor(ac, -0.2);
    ctx.beginPath();
    ctx.roundRect(-9, hatY - 1, 18, 3.6, 1.8);
    ctx.fill();
    circle(0, hatY - 8.5, 2.5, '#ffffff');
  } else if (hat === 'beret') {
    ellipse(1.5, hatY - 1.5, 10, 4.5, ac, -0.18);
    ctx.strokeStyle = shadeColor(ac, -0.3);
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

  ctx.restore();
}

/**
 * Draw Adopted Companion Beside Player
 */
export function drawCompanion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  companionId: string,
  time: number
) {
  ctx.save();
  const hoverY = Math.sin(time * 3.5) * 3;
  // Soft shadow underneath companion
  ctx.fillStyle = 'rgba(28, 16, 48, 0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + 12, 8.5, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(x, y + hoverY);
  ctx.strokeStyle = '#3b2a45';
  ctx.lineWidth = 1.1;

  if (companionId === 'gloom') {
    ctx.fillStyle = '#c4c7d6';
    ctx.beginPath();
    ctx.arc(0, 0, 8.2, 0, Math.PI * 2);
    ctx.arc(-5.2, -2, 6.2, 0, Math.PI * 2);
    ctx.arc(5.2, -2, 6.2, 0, Math.PI * 2);
    ctx.arc(0, -5.2, 6.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rosy cheeks + bright catchlight eyes
    ctx.fillStyle = 'rgba(255, 130, 175, 0.5)';
    ctx.beginPath();
    ctx.ellipse(-4.5, 0, 1.6, 0.9, 0, 0, Math.PI * 2);
    ctx.ellipse(4.5, 0, 1.6, 0.9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3b2a45';
    ctx.beginPath();
    ctx.arc(-2.5, -2, 1.35, 0, Math.PI * 2);
    ctx.arc(2.5, -2, 1.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-2.1, -2.4, 0.5, 0, Math.PI * 2);
    ctx.arc(2.9, -2.4, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Brass button charm
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(0, 3.2, 2.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (companionId === 'gloria' || companionId === 'gary') {
    ctx.fillStyle = companionId === 'gloria' ? '#b0aec2' : '#9694a4';
    ctx.beginPath();
    ctx.ellipse(0, 2, 8.2, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#3b2a45';
    ctx.beginPath();
    ctx.arc(-2.2, 1, 1.2, 0, Math.PI * 2);
    ctx.arc(2.2, 1, 1.2, 0, Math.PI * 2);
    ctx.fill();
    if (companionId === 'gary') {
      ctx.fillStyle = '#7bd88f';
      ctx.beginPath();
      ctx.ellipse(0, -4.5, 2.5, 4, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (companionId === 'moth') {
    const fl = Math.sin(time * 16) * 0.25;
    ctx.fillStyle = 'rgba(255, 232, 128, 0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 240, 175, 0.95)';
    ctx.beginPath();
    ctx.ellipse(-4.5, -1, 5, 3.4, -0.45 + fl, 0, Math.PI * 2);
    ctx.ellipse(4.5, -1, 5, 3.4, 0.45 - fl, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffeaa7';
    ctx.beginPath();
    ctx.arc(0, 0, 2.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (companionId === 'whale') {
    ctx.fillStyle = '#a8e6ff';
    ctx.beginPath();
    ctx.ellipse(0, 0, 9.2, 6.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#3b2a45';
    ctx.beginPath();
    ctx.arc(3.4, -1, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(0, -8.5 + Math.sin(time * 6) * 1.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function interpolateColor(c1: string, c2: string, factor: number): string {
  const f = Math.max(0, Math.min(1, factor));
  const hex1 = c1.replace('#', '');
  const hex2 = c2.replace('#', '');
  const r1 = parseInt(hex1.substring(0, 2), 16) || 150;
  const g1 = parseInt(hex1.substring(2, 4), 16) || 150;
  const b1 = parseInt(hex1.substring(4, 6), 16) || 160;
  const r2 = parseInt(hex2.substring(0, 2), 16) || 255;
  const g2 = parseInt(hex2.substring(2, 4), 16) || 200;
  const b2 = parseInt(hex2.substring(4, 6), 16) || 200;
  const r = Math.round(r1 + (r2 - r1) * f);
  const g = Math.round(g1 + (g2 - g1) * f);
  const b = Math.round(b1 + (b2 - b1) * f);
  return `rgb(${r},${g},${b})`;
}
