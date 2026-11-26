/**
 * Mochi Meadows 2: The Dawn Duet
 * Core Game Constants: 12 Species, 18 Biomes, 12 Spells, 21 Harmonies,
 * 30 Fish, 60 Achievements, 15 Music Tracks, Seasons, and Companions.
 */

import { WORLD_GRID_SIZE, WORLD_TILE_PX } from './worldAnchors';

export const N = WORLD_GRID_SIZE; // Expanded Archipelago Dimension (420x420 tiles, ~2.6x larger world)
export const T = WORLD_TILE_PX;   // Tile size in pixels
export const SEED = 42; // Deterministic procedural world seed for Starlit Archipelago

// 18 Biomes across the 8 Islands and 5 Layers
export const BIOME_NAMES = [
  'Deep Sea',               // 0
  'Shallows',               // 1
  'Sandy Shore',            // 2
  'Sunny Meadow',           // 3 (Lantern Isle)
  'Whisper Woods',          // 4 (Lantern Isle)
  'Blossom Grove',          // 5 (Lantern Isle)
  'Sunbaked Dunes',         // 6 (Lantern Isle)
  'Frosty Tundra',          // 7 (Lantern Isle)
  'Pebble Peaks',           // 8 (Lantern Isle)
  'Honeycomb Hills',        // 9 (Island 2)
  'Wildflower Terraces',    // 10 (Island 2)
  'Tidepool Lagoon',        // 11 (Island 3)
  'Coral Shallows',         // 12 (Island 3)
  'Hot Spring Terraces',    // 13 (Island 4 - Cinder Cradle)
  'Cinder Cradle',          // 14 (Island 4)
  'Lily Marsh',             // 15 (Island 5 - Mirror Fens)
  'Mirror Fens',            // 16 (Island 5)
  'Crystal Ice Caves',      // 17 (Island 6 - Aurora Reach)
  'Bellwood Floor',         // 18 (Island 7 - Chime Canopy)
  'Chime Canopy',           // 19 (Island 7)
  'Dawn Spire',             // 20 (Island 8 - Dawn Spire)
];

export const BIOME_COLORS = [
  '#3d8ec5', // 0 Deep Sea
  '#68c4e4', // 1 Shallows
  '#f8e5b5', // 2 Sandy Shore
  '#9ee087', // 3 Sunny Meadow
  '#5ebc6c', // 4 Whisper Woods
  '#e9b7ce', // 5 Blossom Grove
  '#f6d588', // 6 Sunbaked Dunes
  '#eef4ff', // 7 Frosty Tundra
  '#9f9cb2', // 8 Pebble Peaks
  '#fdd05a', // 9 Honeycomb Hills
  '#e5bd47', // 10 Wildflower Terraces
  '#4bc3b5', // 11 Tidepool Lagoon
  '#ff95ad', // 12 Coral Shallows
  '#ffa26b', // 13 Hot Spring Terraces
  '#7a3c4d', // 14 Cinder Cradle
  '#74c39f', // 15 Lily Marsh
  '#449880', // 16 Mirror Fens
  '#b4e5ff', // 17 Crystal Ice Caves
  '#79986b', // 18 Bellwood Floor
  '#a2cf7d', // 19 Chime Canopy
  '#ffe37a', // 20 Dawn Spire
];

// 12 Playable Species (6 original + 6 new in MM2)
export const SPECIES_LIST = [
  ['cat', '🐱 Cat'],
  ['bunny', '🐰 Bunny'],
  ['bear', '🐻 Bear'],
  ['fox', '🦊 Fox'],
  ['dragon', '🐲 Dragon'],
  ['slime', '🫧 Slime'],
  ['owl', '🦉 Owl (New)'],
  ['frog', '🐸 Frog (New)'],
  ['axolotl', '🦎 Axolotl (New)'],
  ['otter', '🦦 Otter (New)'],
  ['penguin', '🐧 Penguin (New)'],
  ['deer', '🦌 Deer (New)'],
] as const;

export const COLOR_PALETTE = [
  '#ffb3c7', '#ff9f9f', '#ffd6a5', '#fdf4a8', '#b8f0b0',
  '#9be8d8', '#a8e6ff', '#9fb8ff', '#cdb4ff', '#e6a8e0',
  '#ffffff', '#c9a27e', '#8a8a9a', '#3b3550', '#ffc27a',
  '#7de0ff', '#ffe66d', '#ff6b8b', '#48dbfb', '#1dd1a1',
];

export const ACCENT_PALETTE = [
  '#ff7aa8', '#ff6b6b', '#ffb347', '#ffd23f', '#7bd88f',
  '#4fd1c5', '#5aa9ff', '#8f7bff', '#c26bff', '#ffffff',
  '#3b3550', '#ff9ff3', '#feca57', '#ff4757', '#2ed573',
];

// Curated Eye & Marking Palettes
export const EYE_COLOR_PALETTE = [
  '#3b2a45', '#1d192b', '#4d3328', '#7a4b2c',
  '#345d9d', '#3a86ff', '#2b9348', '#52b788',
  '#7b2cbf', '#c77dff', '#d94862', '#ff7aa8',
  '#e09f3e', '#ffd23f',
] as const;

export const PATTERN_COLOR_PALETTE = [
  '#ffffff', '#fff3d6', '#3b3550', '#6e473b',
  '#c97a63', '#ff7aa8', '#ff9ebb', '#ffd23f',
  '#7bd88f', '#7de0ff', '#b48cff', '#d94862',
] as const;

export const CHEEK_OPTIONS = [
  [0, '🍑 Soft Peach'],
  [1, '🌸 Rosy Pink'],
  [2, '💗 Kawaii Pop'],
  [3, '✨ Starry Blush'],
  [4, '— Clean (None)'],
] as const;

export const COAT_FINISH_OPTIONS = [
  ['plush', '🧸 Soft Plush'],
  ['velvet', '🪶 Cozy Velvet'],
  ['pearl', '🫧 Starlit Pearl'],
  ['silk', '✨ Satin Silk'],
] as const;

export const SIZE_OPTIONS = [
  ['tiny', '🌱 Tiny'],
  ['small', '🐣 Petite'],
  ['normal', '🐾 Standard'],
  ['plump', '🍡 Plump'],
] as const;

// 30 Hats and Hairpieces
export const HAT_OPTIONS = [
  ['none', '— None'],
  ['bow', '🎀 Silk Bow'],
  ['crown', '👑 Golden Crown'],
  ['leaf', '🍃 Doris Leaf Hat'],
  ['party', '🎉 Party Cone'],
  ['wizard', '🧙 Star Wizard Hat'],
  ['witch_moon', '🌙 Moon Witch Hat'],
  ['flower', '🌼 Daisy Wreath'],
  ['halo', '😇 Angelic Halo'],
  ['star_circlet', '✦ Celestial Circlet'],
  ['beanie', '🧢 Knitted Beanie'],
  ['beret', '🎨 Artist Beret'],
  ['chef', '👨‍🍳 Baker Toque'],
  ['straw', '👒 Island Straw Hat'],
  ['pirate', '🏴‍☠️ Captain Tricorn'],
  ['lantern_cap', '🏮 Lantern Keeper Cap'],
  ['nightcap', '💤 Starry Nightcap'],
  ['aviator', '✈️ Skyfarer Goggles'],
  ['earmuffs', '🎧 Fluffy Earmuffs'],
  ['cat_phones', '🐱 Kitty Headphones'],
  ['bunny_band', '🐰 Bunny Headband'],
  ['maid_frill', '🤍 Lace Headband'],
  ['froggy_hood', '🐸 Froggy Cap'],
  ['boba_hat', '🧋 Boba Teacup'],
  ['tea_saucer', '🫖 Teacup Fascinator'],
  ['sprout', '🌱 Lucky Sprout'],
  ['antlers', '🦌 Little Antlers'],
  ['mushroom', '🍄 Toadstool Cap'],
  ['seashell', '🐚 Nautilus Shell'],
  ['honeycomb', '🍯 Honey Dipper'],
] as const;

// 12 Eye Styles
export const EYE_OPTIONS = [
  [0, '● Luminous Anime'],
  [1, '◉ Double Sparkle'],
  [2, '^ Happy Arcs'],
  [3, '– Cozy Sleepy'],
  [4, '★ Star Eyes'],
  [5, '♥ Heart Eyes'],
  [6, 'ᵔ Curious Brow'],
  [7, '✦ Crystal Gem'],
  [8, '😉 Playful Wink'],
  [9, '🌙 Crescent Dream'],
  [10, '🐱 Sharp Cat Slit'],
  [11, '💎 Odd-Eye Jewel'],
] as const;

// 9 Smile Styles
export const MOUTH_OPTIONS = [
  [0, '🙂 Sweet Smile'],
  [1, '😀 Happy Grin'],
  [2, '😮 Little "Oh"'],
  [3, '😏 Playful Smirk'],
  [4, '3 Cat Mouf'],
  [5, 'ω Bunny Pout'],
  [6, '😄 Joyful Laugh'],
  [7, '😸 Cute Fang'],
  [8, '😛 Cheeky Blep'],
] as const;

// 10 Patterns
export const PATTERN_OPTIONS = [
  [0, 'Plain Fluff'],
  [1, 'Cozy Spots'],
  [2, 'Gentle Stripes'],
  [3, 'Star Sparkles'],
  [4, 'Sweet Freckles'],
  [5, 'Panda Patches'],
  [6, 'Fluffy Clouds'],
  [7, 'Cosmic Stars'],
  [8, 'Galaxy Swirl'],
  [9, 'Soft Gradient'],
] as const;

export type OutfitCategory = 'classic' | 'male' | 'female';
export type PieceStyle = 'unisex' | 'male' | 'female';

export interface OutfitPieceOption {
  id: string;
  label: string;
  style: PieceStyle;
}

export interface OutfitPresetConfig {
  id: number;
  label: string;
  category: OutfitCategory;
  top: string;
  bottom: string;
  layer: string;
  shoes: string;
  defaultCol1: string;
  defaultCol2: string;
}

export const OUTFIT_PRESETS: readonly OutfitPresetConfig[] = [
  // Classic / Unisex (0..9 — preserves existing saves & NPC defaults)
  { id: 0, label: 'Natural Fluff', category: 'classic', top: 'none', bottom: 'none', layer: 'none', shoes: 'none', defaultCol1: '', defaultCol2: '' },
  { id: 1, label: '🧣 Knitted Scarf', category: 'classic', top: 'none', bottom: 'none', layer: 'scarf', shoes: 'none', defaultCol1: '', defaultCol2: '#ffffff' },
  { id: 2, label: '🦸 Brave Cape', category: 'classic', top: 'none', bottom: 'none', layer: 'cape', shoes: 'none', defaultCol1: '', defaultCol2: '#ffd23f' },
  { id: 3, label: '👖 Denim Overalls', category: 'classic', top: 'overalls_bib', bottom: 'jeans', layer: 'none', shoes: 'sneakers', defaultCol1: '#4c7cc4', defaultCol2: '#35568d' },
  { id: 4, label: '🎒 Explorer Pack', category: 'classic', top: 'none', bottom: 'none', layer: 'backpack', shoes: 'boots', defaultCol1: '#8b5e3c', defaultCol2: '#6b472b' },
  { id: 5, label: '⚓ Sailor Collar', category: 'classic', top: 'sailor_top', bottom: 'none', layer: 'none', shoes: 'loafers', defaultCol1: '#2f539b', defaultCol2: '#ffffff' },
  { id: 6, label: '👘 Blossom Yukata', category: 'classic', top: 'kimono_top', bottom: 'hakama', layer: 'sash', shoes: 'slippers', defaultCol1: '#f598ba', defaultCol2: '#c93c74' },
  { id: 7, label: '🧥 Winter Parka', category: 'classic', top: 'parka', bottom: 'trousers', layer: 'none', shoes: 'boots', defaultCol1: '#4a90c4', defaultCol2: '#ffffff' },
  { id: 8, label: '🍳 Bakery Apron', category: 'classic', top: 'apron', bottom: 'none', layer: 'back_bow', shoes: 'slippers', defaultCol1: '#ffffff', defaultCol2: '#ff8da8' },
  { id: 9, label: '🍯 Beekeeper Suit', category: 'classic', top: 'tunic', bottom: 'trousers', layer: 'sash', shoes: 'boots', defaultCol1: '#fff4cc', defaultCol2: '#ffd23f' },

  // Male Outfits (10..18)
  { id: 10, label: '🤵 Gentleman Tuxedo', category: 'male', top: 'blazer', bottom: 'trousers', layer: 'bowtie', shoes: 'loafers', defaultCol1: '#2d3250', defaultCol2: '#1d2136' },
  { id: 11, label: '👑 Prince Tunic & Cloak', category: 'male', top: 'tunic', bottom: 'trousers', layer: 'royal_cape', shoes: 'boots', defaultCol1: '#3c5aa6', defaultCol2: '#ffd23f' },
  { id: 12, label: '🏅 Varsity Jacket', category: 'male', top: 'varsity', bottom: 'jeans', layer: 'none', shoes: 'sneakers', defaultCol1: '#d94862', defaultCol2: '#fff8ec' },
  { id: 13, label: '🧭 Meadow Ranger Vest', category: 'male', top: 'vest', bottom: 'cargo_pants', layer: 'backpack', shoes: 'boots', defaultCol1: '#4c8c62', defaultCol2: '#6b4c35' },
  { id: 14, label: '📚 Scholar Cardigan', category: 'male', top: 'cardigan', bottom: 'trousers', layer: 'necktie', shoes: 'loafers', defaultCol1: '#7a5440', defaultCol2: '#483b56' },
  { id: 15, label: '✈️ Sky Captain Bomber', category: 'male', top: 'varsity', bottom: 'cargo_pants', layer: 'scarf', shoes: 'boots', defaultCol1: '#5e4334', defaultCol2: '#f0e2c8' },
  { id: 16, label: '⚓ Nautical Peacoat', category: 'male', top: 'peacoat', bottom: 'trousers', layer: 'none', shoes: 'loafers', defaultCol1: '#233b6e', defaultCol2: '#17284a' },
  { id: 17, label: '🛡️ Guild Knight Tunic', category: 'male', top: 'tunic', bottom: 'cargo_pants', layer: 'cape', shoes: 'boots', defaultCol1: '#8b9bb4', defaultCol2: '#b83b5e' },
  { id: 18, label: '🌌 Celestial Archmage', category: 'male', top: 'tunic', bottom: 'hakama', layer: 'star_cloak', shoes: 'boots', defaultCol1: '#483475', defaultCol2: '#ffd23f' },

  // Female Outfits (19..27)
  { id: 19, label: '👑 Ribbon Princess Gown', category: 'female', top: 'blouse', bottom: 'flared_skirt', layer: 'back_bow', shoes: 'mary_janes', defaultCol1: '#ff94b8', defaultCol2: '#ffd4e5' },
  { id: 20, label: '🌻 Petal Sundress', category: 'female', top: 'tshirt', bottom: 'petal_skirt', layer: 'sash', shoes: 'mary_janes', defaultCol1: '#ffe07d', defaultCol2: '#ff8da8' },
  { id: 21, label: '🎀 Sweater & Pleated Skirt', category: 'female', top: 'hoodie', bottom: 'pleated_skirt', layer: 'none', shoes: 'sneakers', defaultCol1: '#b89eff', defaultCol2: '#3f355c' },
  { id: 22, label: '🧚 Starlight Fairy Dress', category: 'female', top: 'corset_top', bottom: 'petal_skirt', layer: 'fairy_wings', shoes: 'mary_janes', defaultCol1: '#7bd8ff', defaultCol2: '#f7e6ff' },
  { id: 23, label: '🫖 Tea Party Pinafore', category: 'female', top: 'blouse', bottom: 'pleated_skirt', layer: 'back_bow', shoes: 'mary_janes', defaultCol1: '#fff8ec', defaultCol2: '#7bd8a4' },
  { id: 24, label: '🧶 Pastel Cardigan & Skirt', category: 'female', top: 'cardigan', bottom: 'flared_skirt', layer: 'bowtie', shoes: 'loafers', defaultCol1: '#ffa6c9', defaultCol2: '#fff4f8' },
  { id: 25, label: '⚓ Sailor Skirt Uniform', category: 'female', top: 'sailor_top', bottom: 'pleated_skirt', layer: 'none', shoes: 'mary_janes', defaultCol1: '#ffffff', defaultCol2: '#2d4d94' },
  { id: 26, label: '🌿 Cottagecore Corset Dress', category: 'female', top: 'corset_top', bottom: 'flared_skirt', layer: 'scarf', shoes: 'boots', defaultCol1: '#6aa872', defaultCol2: '#f4e3c1' },
  { id: 27, label: '👼 Seraphim Ballgown', category: 'female', top: 'blouse', bottom: 'flared_skirt', layer: 'angel_wings', shoes: 'mary_janes', defaultCol1: '#fff6fb', defaultCol2: '#ffd23f' },
];

export const OUTFIT_OPTIONS: readonly (readonly [number, string])[] = OUTFIT_PRESETS.map(
  (p) => [p.id, p.label] as const
);

export const OUTFIT_TOP_OPTIONS: readonly OutfitPieceOption[] = [
  { id: 'none', label: '— Bare Fur', style: 'unisex' },
  { id: 'tshirt', label: '👕 Cozy Tee', style: 'unisex' },
  { id: 'hoodie', label: '🧥 Sweater / Hoodie', style: 'unisex' },
  { id: 'cardigan', label: '🧶 Knit Cardigan', style: 'unisex' },
  { id: 'blazer', label: '🤵 Tailored Blazer', style: 'male' },
  { id: 'vest', label: '🧭 Ranger Vest', style: 'male' },
  { id: 'varsity', label: '🏅 Varsity Jacket', style: 'male' },
  { id: 'peacoat', label: '🧥 Peacoat', style: 'male' },
  { id: 'tunic', label: '👑 Noble Tunic', style: 'male' },
  { id: 'blouse', label: '🎀 Ruffled Blouse', style: 'female' },
  { id: 'corset_top', label: '🌿 Laced Bodice', style: 'female' },
  { id: 'sailor_top', label: '⚓ Sailor Top', style: 'female' },
  { id: 'kimono_top', label: '👘 Yukata Robe', style: 'unisex' },
  { id: 'overalls_bib', label: '👖 Overalls Bib', style: 'unisex' },
  { id: 'apron', label: '🍳 Apron Top', style: 'female' },
  { id: 'parka', label: '❄️ Fur Parka', style: 'unisex' },
];

export const OUTFIT_BOTTOM_OPTIONS: readonly OutfitPieceOption[] = [
  { id: 'none', label: '— None', style: 'unisex' },
  { id: 'trousers', label: '👖 Tailored Trousers', style: 'male' },
  { id: 'jeans', label: '👖 Denim Pants', style: 'male' },
  { id: 'shorts', label: '🩳 Meadow Shorts', style: 'male' },
  { id: 'cargo_pants', label: '🥾 Cargo Pants', style: 'male' },
  { id: 'pleated_skirt', label: '👗 Pleated Skirt', style: 'female' },
  { id: 'flared_skirt', label: '💃 Flared Gown', style: 'female' },
  { id: 'petal_skirt', label: '🌸 Petal Tutu', style: 'female' },
  { id: 'hakama', label: '👘 Wrap Hem', style: 'unisex' },
];

export const OUTFIT_LAYER_OPTIONS: readonly OutfitPieceOption[] = [
  { id: 'none', label: '— None', style: 'unisex' },
  { id: 'scarf', label: '🧣 Cozy Scarf', style: 'unisex' },
  { id: 'bell_collar', label: '🔔 Golden Bell Collar', style: 'unisex' },
  { id: 'bowtie', label: '🎀 Crisp Bowtie', style: 'male' },
  { id: 'necktie', label: '👔 Scholar Tie', style: 'male' },
  { id: 'cape', label: '🦸 Hero Cape', style: 'unisex' },
  { id: 'royal_cape', label: '👑 Royal Cloak', style: 'male' },
  { id: 'star_cloak', label: '🌌 Starlight Cloak', style: 'unisex' },
  { id: 'backpack', label: '🎒 Explorer Pack', style: 'unisex' },
  { id: 'back_bow', label: '🎀 Ribbon Back Bow', style: 'female' },
  { id: 'fairy_wings', label: '🧚 Fairy Wings', style: 'female' },
  { id: 'angel_wings', label: '👼 Angel Wings', style: 'unisex' },
  { id: 'sash', label: '🎗️ Waist Sash', style: 'female' },
];

export const OUTFIT_SHOE_OPTIONS: readonly OutfitPieceOption[] = [
  { id: 'none', label: '🐾 Bare Paws', style: 'unisex' },
  { id: 'sneakers', label: '👟 Sneakers', style: 'unisex' },
  { id: 'boots', label: '🥾 Ranger Boots', style: 'male' },
  { id: 'loafers', label: '👞 Dress Loafers', style: 'male' },
  { id: 'mary_janes', label: '🥿 Mary Janes', style: 'female' },
  { id: 'slippers', label: '🧸 Plush Slippers', style: 'female' },
];

export const OUTFIT_COLOR_PALETTE = [
  '#2d3250', '#1f2937', '#3c5aa6', '#4c8c62',
  '#8b5e3c', '#b83b5e', '#d94862', '#ff7aa8',
  '#ffa6c9', '#b89eff', '#7bd8ff', '#7bd8a4',
  '#ffd23f', '#f4e3c1', '#ffffff', '#e67e22',
] as const;

export interface ResolvedOutfitParts {
  top: string;
  bottom: string;
  layer: string;
  shoes: string;
  col1: string;
  col2: string;
  col3: string;
  hasCustomMix: boolean;
  legacyOutId: number;
}

export function resolveOutfitParts(look: {
  out?: number;
  outTop?: string;
  outBottom?: string;
  outLayer?: string;
  outShoes?: string;
  outCol1?: string;
  outCol2?: string;
  outCol3?: string;
  ac?: string;
  dye2?: string;
}): ResolvedOutfitParts {
  const outId = look.out ?? 0;
  const preset = OUTFIT_PRESETS[outId] ?? OUTFIT_PRESETS[0];
  const hasCustomMix =
    look.outTop !== undefined ||
    look.outBottom !== undefined ||
    look.outLayer !== undefined ||
    look.outShoes !== undefined;

  const top = hasCustomMix ? look.outTop || 'none' : preset.top;
  const bottom = hasCustomMix ? look.outBottom || 'none' : preset.bottom;
  const layer = hasCustomMix ? look.outLayer || 'none' : preset.layer;
  const shoes = hasCustomMix ? look.outShoes || 'none' : preset.shoes;

  const col1 = look.outCol1 || preset.defaultCol1 || look.ac || '#ff7aa8';
  const col2 = look.outCol2 || preset.defaultCol2 || look.dye2 || '#ffffff';
  const col3 = look.outCol3 || '';

  return {
    top,
    bottom,
    layer,
    shoes,
    col1,
    col2,
    col3,
    hasCustomMix,
    legacyOutId: outId,
  };
}

export interface HairOption {
  id: string;
  label: string;
  style: PieceStyle;
}

export const HAIR_OPTIONS: readonly HairOption[] = [
  { id: 'none', label: '— Natural Fur', style: 'unisex' },
  // Male / Short Styled Cuts
  { id: 'spiky', label: '⚡ Adventurer Spikes', style: 'male' },
  { id: 'quiff', label: '✨ Dapper Swoop', style: 'male' },
  { id: 'curtains', label: '🌿 Soft Curtain Part', style: 'male' },
  { id: 'tousled', label: '🍃 Tousled Curls', style: 'male' },
  { id: 'undercut', label: '🗡️ Wolf Cut', style: 'male' },
  { id: 'pomp', label: '🎸 Cloud Pompadour', style: 'male' },
  { id: 'prince_part', label: '👑 Prince Side-Swept', style: 'male' },
  // Female / Long & Expressive Cuts
  { id: 'bob', label: '🌸 Classic Glossy Bob', style: 'female' },
  { id: 'twintails', label: '🎀 Bouncy Twintails', style: 'female' },
  { id: 'twin_drills', label: '🌀 Royal Twin Drills', style: 'female' },
  { id: 'ponytail', label: '🌟 High Ponytail', style: 'female' },
  { id: 'messy_bun', label: '🥐 Cozy Messy Bun', style: 'female' },
  { id: 'long_wavy', label: '🌊 Flowing Waves', style: 'female' },
  { id: 'space_buns', label: '🍡 Mochi Space Buns', style: 'female' },
  { id: 'braids', label: '🌻 Cottage Braids', style: 'female' },
  { id: 'hime', label: '🌺 Princess Hime Cut', style: 'female' },
  { id: 'pixie_curl', label: '🧚 Fairy Pixie Cut', style: 'female' },
  // Unisex Fluffy & Halo Styles
  { id: 'braid_crown', label: '🌼 Halo Braid Crown', style: 'unisex' },
  { id: 'fluffy_afro', label: '☁️ Cloud Puff Curls', style: 'unisex' },
];

export const HAIR_COLOR_PALETTE = [
  '#2b2129', '#3c3a47', '#6e473b', '#8d5b4c',
  '#a64d36', '#d98a4e', '#f2c96b', '#f7e39c',
  '#d6dce8', '#ffffff', '#ff8fb8', '#b89eff',
  '#7bd8e8', '#7bc48d',
] as const;

export function resolveHairColor(hairCol?: string, bodyCol?: string): string {
  if (hairCol) return hairCol;
  const base = (bodyCol || '#ffb3c7').replace('#', '');
  if (base.length !== 6) return '#6e473b';
  const r = Math.max(24, Math.min(245, Math.round(parseInt(base.slice(0, 2), 16) * 0.62)));
  const g = Math.max(18, Math.min(240, Math.round(parseInt(base.slice(2, 4), 16) * 0.56)));
  const b = Math.max(28, Math.min(245, Math.round(parseInt(base.slice(4, 6), 16) * 0.64)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export const FACE_OPTIONS = [
  [0, 'None'],
  [1, '👓 Wire Glasses'],
  [2, '😎 Cool Shades'],
  [3, '🌸 Cheerful Blush'],
  [4, '✨ Star Freckles'],
] as const;

// 12 Magic Trails
export const AURA_OPTIONS = [
  [0, 'None'],
  [1, '✨ Sparkle Trail'],
  [2, '💗 Heart Bubbles'],
  [3, '🌸 Blossom Petals'],
  [4, '🔥 Firefly Embers'],
  [5, '🫧 Ocean Bubbles'],
  [6, '❄️ Snowflakes'],
  [7, '🎵 Music Notes'],
  [8, '🍃 Autumn Leaves'],
  [9, '🌈 Rainbow Motes'],
  [10, '🍯 Honey Drops'],
  [11, '🌌 Stardust Aurora'],
] as const;

// 12 Emotes
export const EMOTE_OPTIONS = [
  ['wave', '👋 Wave'],
  ['twirl', '🩰 Twirl'],
  ['sleep', '💤 Sleep'],
  ['dance', '💃 Happy Dance'],
  ['bow', '🙇 Gentle Bow'],
  ['cheer', '🙌 Big Cheer'],
  ['ponder', '🤔 Ponder'],
  ['wink', '😉 Cozy Wink'],
  ['float', '🎈 Floating'],
  ['whistle', '🎶 Whistle'],
  ['yawn', '🥱 Mochi Yawn'],
  ['hug', '🤗 Hush Hug'],
] as const;

// 13 Spells in Mochi Meadows 2
export const MAGIC_SPELLS = [
  { id: 'star_sense', icon: '✨', name: 'Star Sense', cost: 20, unlockChapter: 0, desc: 'Crowns Mochi with orbiting stars, illuminates treasures, and reveals nearby Echoes & Diary Pages.' },
  { id: 'cloud_wings', icon: '☁️', name: 'Cloud Wings', cost: 15, unlockChapter: 0, desc: 'Soar skyward on a wind shockwave, or dive-land in a petal gust that shakes trees for coins.' },
  { id: 'glimmer_step', icon: '⚡', name: 'Glimmer Step', cost: 10, unlockChapter: 0, desc: 'Smart-blink across obstacles and streams while scooping up gems along your starlight path.' },
  { id: 'frost_bridge', icon: '❄️', name: 'Frost Bridge', cost: 35, unlockChapter: 0, desc: 'Projects a forward ice bridge across water and shields Mochi with orbiting speed-skating crystals.' },
  { id: 'tide_song', icon: '🌊', name: 'Tide Song', cost: 30, unlockChapter: 0, desc: 'Opens shoreline seashells & wakes waves for bonus pearls while boosting swim speed & infinite air.' },
  { id: 'moon_pull', icon: '🧲', name: 'Moon Pull', cost: 30, unlockChapter: 0, desc: 'Magnetically pulls distant gems, pearls, feathers & quest items while shaking loose coins from groves.' },
  { id: 'bloom', icon: '🌸', name: 'Bloom', cost: 25, unlockChapter: 0, desc: 'Plants wildflowers permanently, shakes trees for coins, leaves flower footsteps & refills stamina/air.' },
  { id: 'hush_hug', icon: '🤗', name: 'Hush Hug', cost: 10, unlockChapter: 0, desc: 'Soothes Hollows, draws nearby villagers in for a cheer & coin gift, and orbits hearts for faster regen.' },
  { id: 'ember_warmth', icon: '🔥', name: 'Ember Warmth', cost: 25, unlockChapter: 0, desc: 'Shatters brittle mossy boulders into coins, melts ice, clears snow, and grants blazing speed.' },
  { id: 'echo_call', icon: '🔔', name: 'Echo Call', cost: 20, unlockChapter: 0, desc: 'Collects nearby Memory Echoes & Moon Diary Pages into your Journal and points sonar across the map.' },
  { id: 'dreamwalk', icon: '🌙', name: 'Dreamwalk', cost: 40, unlockChapter: 0, desc: 'Turn ghostly to phase right through trees and rocks with comet speed, or step onto the Moon Road.' },
  { id: 'dawn_break', icon: '🌅', name: 'Dawn Break', cost: 45, unlockChapter: 0, desc: 'Unleashes a golden sunrise that blooms flora, melts ice, shakes trees, clears storms & magnetizes stars.' },
  { id: 'teleport', icon: '🌀', name: 'Song of Teleportation', cost: 25, unlockChapter: 0, desc: 'Sing a resonant warp melody to fast-travel to any unlocked town center you have already visited.' },
];

// Spell Harmonies (Synergies triggered when casting 2 spells in quick succession)
export const SPELL_HARMONIES = [
  { name: 'Lily Path', spells: ['Bloom', 'Tide Song'], desc: 'Creates a bridge of floating water lilies across open ocean.' },
  { name: 'Hot Spring', spells: ['Frost Bridge', 'Ember Warmth'], desc: 'Forms a steaming thermal pool that rapidly rejuvenates stamina and oxygen.' },
  { name: 'Echo Magnet', spells: ['Moon Pull', 'Echo Call'], desc: 'Pulls distant collectibles and Echoes from across the entire screen.' },
  { name: 'Sunrise Lift', spells: ['Cloud Wings', 'Dawn Break'], desc: 'A blazing updraft catapults you to high cloud platforms with zero mana cost.' },
  { name: 'Comet Hop', spells: ['Glimmer Step', 'Star Sense'], desc: 'A colossal leap that lands directly beside the closest hidden treasure.' },
  { name: 'Lullaby Veil', spells: ['Dreamwalk', 'Hush Hug'], desc: 'Casts a tranquil celestial aura that soothes every Hollow in the area.' },
  { name: 'Frost Glow', spells: ['Frost Bridge', 'Star Sense'], desc: 'Ice sheets illuminate with glowing constellations guiding the path.' },
  { name: 'Thermal Breeze', spells: ['Ember Warmth', 'Cloud Wings'], desc: 'Leaves a trail of warm embers allowing continuous free gliding.' },
  { name: 'Rain Roots', spells: ['Bloom', 'Ember Warmth'], desc: 'Accelerates garden plant growth and blooms rare rainbow hybrid flowers.' },
  { name: 'Starway Chorus', spells: ['Song of Teleportation', 'Star Sense'], desc: 'Arrival shimmers with radiant beacons guiding you toward nearby treasures.' },
];

// 30 Fish Species across Archipelago
export const FISH_SPECIES = [
  { name: 'Minnow', icon: '🐟', coins: 3, weight: 50, rarity: 'Common', location: 'Anywhere' },
  { name: 'Sunfish', icon: '🐠', coins: 5, weight: 35, rarity: 'Common', location: 'Freshwater streams' },
  { name: 'Honey Carp', icon: '🍯', coins: 12, weight: 20, rarity: 'Uncommon', location: 'Honeycomb Hills ponds' },
  { name: 'Puffer', icon: '🐡', coins: 8, weight: 25, rarity: 'Common', location: 'Shallows & Reef' },
  { name: 'Shrimp', icon: '🦐', coins: 6, weight: 30, rarity: 'Common', location: 'Tidepools' },
  { name: 'Crab', icon: '🦀', coins: 10, weight: 15, rarity: 'Uncommon', location: 'Sandy shoreline' },
  { name: 'Squid', icon: '🦑', coins: 14, weight: 12, rarity: 'Uncommon', location: 'Deep Sea' },
  { name: 'Lantern Eel', icon: '🏮', coins: 25, weight: 8, rarity: 'Rare', location: 'Mirror Fens at night' },
  { name: 'Glowcap Cavefish', icon: '🍄', coins: 30, weight: 6, rarity: 'Rare', location: 'Glowdeep underground rivers' },
  { name: 'Aurora Trout', icon: '🌌', coins: 35, weight: 5, rarity: 'Very Rare', location: 'Aurora Reach icy lakes' },
  { name: 'Moon Koi', icon: '🎏', coins: 40, weight: 4, rarity: 'Very Rare', location: 'Full moon nights' },
  { name: 'Cinder Koi', icon: '🔥', coins: 50, weight: 3, rarity: 'Legendary', location: 'Cinder Cradle hot springs in winter' },
  { name: 'Dawn Koi', icon: '🌅', coins: 120, weight: 1, rarity: 'Mythic', location: 'Golden hour rainy mornings' },
  { name: 'Sea Turtle', icon: '🐢', coins: 45, weight: 4, rarity: 'Very Rare', location: 'Coral shallows' },
  { name: 'Starfish', icon: '⭐', coins: 15, weight: 18, rarity: 'Uncommon', location: 'Tidepool Atoll' },
];

export interface CompanionDef {
  id: 'gloom' | 'gloria' | 'gary' | 'moth' | 'bee' | 'whale' | 'frog';
  name: string;
  icon: string;
  species: string;
  origin: string;
  anatomy: string;
  desc: string;
  perk: string;
  palette: [string, string, string];
}

// 7 Adoptable Companions
export const COMPANIONS_LIST: CompanionDef[] = [
  {
    id: 'gloom',
    name: 'Gloom the Hushling',
    icon: '☁️',
    species: 'Dusk-Cloud Hushling Sprite',
    origin: 'Whisperwood & Mochi Hamlet',
    anatomy: 'Fluffy 5-puff twilight cloud body · floppy cloud ear-tufts · stitched dusk scarf · heirloom 4-hole brass coat button · orbiting lullaby spark',
    desc: 'What is a Hushling? A gentle spirit born where twilight mist gathers around quiet lullabies. Bound together by a cozy dusk neckerchief and an antique brass coat-button charm on its chest, Gloom calms frightened Hollows and glows warmly with every Verse.',
    perk: 'Calms nearby Hollows & illuminates dark paths with a brass-button glow',
    palette: ['#cdd2e4', '#4f4673', '#ffd23f'],
  },
  {
    id: 'gloria',
    name: 'Gloria the Singing Stone',
    icon: '🪨',
    species: 'Tide-Polished River-Agate Stone',
    origin: 'Pebble Cove · Gifted by Pebble Pete',
    anatomy: 'Flat discoid skipping pebble · swirling seafoam & quartz mineral strata · carved Echo brow rune · mossy shell hairpin · shimmering water-ripple halo',
    desc: 'Far more than a plain pebble, Gloria is a flat, tide-smoothed river agate etched with a singing coastal Echo spiral. Gifted by Pebble Pete at Pebble Cove, she skims effortlessly over water on a turquoise ripple ring and hums near hidden Echoes.',
    perk: 'Skims across water surfaces & chimes softly when Echoes are near',
    palette: ['#9ea9c2', '#52d1dc', '#7bd88f'],
  },
  {
    id: 'gary',
    name: 'Gary the Pet Rock',
    icon: '🗿',
    species: 'Aristocratic Desert Slate Pet Rock',
    origin: 'Sunbaked Dune · Entrusted by Dune Dave',
    anatomy: 'Chunky faceted granite boulder · lush three-leaf clover moss crown · dapper coral adventurer neckerchief · expressive googly storybook eyes · tiny pebble slippers',
    desc: 'Dune Dave’s meticulously pampered pet rock—unmistakably distinct from smooth Gloria thanks to his chiseled slate crags, sprouting clover-moss tuft, and crisp coral bandana. Does absolutely nothing with supreme, dignified perfection.',
    perk: 'Provides 100% stoic emotional support and zero drama',
    palette: ['#868599', '#5ec474', '#ff7b6b'],
  },
  {
    id: 'moth',
    name: 'Glow-Moth',
    icon: '🦋',
    species: 'Bioluminescent Luna Silk-Moth',
    origin: 'Glowdeep Crystal Caverns',
    anatomy: 'Cream-velvet fluffy thorax & ringed golden abdomen · twin feathered plumose antennae · 4 scalloped wings with crescent moon eye-spots & swallowtail tips · drifting pollen motes',
    desc: 'A velvety lantern silk-moth hatched beneath Glowdeep’s glowing crystal mycelium caps. Its twin feathered golden antennae sense hidden chambers, while four crescent-marked wings flutter softly and scatter warm amber pollen light.',
    perk: 'Casts a warm bioluminescent lantern aura through dark caverns',
    palette: ['#fff3c4', '#ffd23f', '#9a84d6'],
  },
  {
    id: 'bee',
    name: 'Bumble-Bee',
    icon: '🐝',
    species: 'Meadow-Nectar Fuzzy Bumblebee',
    origin: 'Honeycomb Hills Flower Terraces',
    anatomy: 'Plump honey-gold & espresso-striped body · creamy fuzzy neck ruff · curved antennae · 4 veined gossamer wings · bright marigold pollen saddlebags',
    desc: 'A round, fuzz-collared meadow pollinator raised among Honeycomb Hills’ sunlit clover terraces. Carrying bulging golden pollen saddlebags on its hind legs, this cheerful bee buzzes at your shoulder and tugs wild coins and nectar closer.',
    perk: 'Magnetically gathers nearby coins & sweet nectar drops',
    palette: ['#ffd23f', '#3b2a45', '#fff4cc'],
  },
  {
    id: 'whale',
    name: 'Mini Cloud-Whale',
    icon: '🐳',
    species: 'Skyborne Cumulus Baleen Calf',
    origin: 'Cirrus Kingdom Floating Atolls',
    anatomy: 'Streamlined sky-cerulean whale body · ivory pleated baleen belly · sweeping pectoral flippers · undulating cleft tail fluke · pastel rainbow mist blowhole spout',
    desc: 'A pocket-sized sky whale formed where Cirrus Kingdom clouds dip into warm sea spray. It swims gracefully through the breeze using sculpted flippers and a cleft tail fluke, puffing sparkling rainbow mist droplets from its blowhole.',
    perk: 'Drifts gracefully on sky updrafts & trails pastel cloud mist',
    palette: ['#8fd8ff', '#fff7eb', '#ff9ebb'],
  },
  {
    id: 'frog',
    name: 'Lantern Frog',
    icon: '🐸',
    species: 'Amber-Throat Lotus Pond Frog',
    origin: 'Mirror Fens Whispering Marshes',
    anatomy: 'Moss-dappled emerald frog body · tall domed golden-iris eyes · pulsing amber lantern vocal throat sac · webbed feet · mini dewdrop lily-pad beret',
    desc: 'A cheerful Mirror Fens tree-frog whose translucent vocal throat sac inflates and glows like a warm amber paper lantern at dusk. Crowned with a tiny dewdrop lily-pad leaf, it hops eagerly beside you and inspires extra spring in every leap.',
    perk: 'Boosts jump spring by +10% & lights misty marsh reeds',
    palette: ['#5cc976', '#ffbe3b', '#8cebff'],
  },
];

export interface ShopItemDef {
  id: string;
  icon: string;
  name: string;
  price: number;
  desc: string;
  consumable?: boolean;
  category: 'treat' | 'gear' | 'charm';
}

// Shop Upgrades & Regional Market Delicacies
export const SHOP_ITEMS: ShopItemDef[] = [
  { id: 'tonic', icon: '🧪', name: 'Mana Tonic', price: 20, desc: 'Instantly refills your magic bar.', consumable: true, category: 'treat' },
  { id: 'snack', icon: '🥐', name: 'Stamina Snack', price: 10, desc: 'Instantly refills stamina and oxygen air.', consumable: true, category: 'treat' },
  { id: 'honey_tart', icon: '🍯', name: 'Sun-Glazed Honey Tart', price: 28, desc: 'Refills Stamina & Mana and grants +22% speed for 45s.', consumable: true, category: 'treat' },
  { id: 'tide_chowder', icon: '🍲', name: 'Harbor Pearl Chowder', price: 32, desc: 'Full Air & Stamina + underwater oxygen grace for 60s.', consumable: true, category: 'treat' },
  { id: 'cinder_cocoa', icon: '☕', name: 'Cinder Spice Cocoa', price: 26, desc: 'Full Stamina & Mana + melts chill for 45s warmth aura.', consumable: true, category: 'treat' },
  { id: 'starlight_tea', icon: '🫖', name: 'Moonbeam Steeped Tea', price: 36, desc: 'Full Mana & Stamina + +35% bonus coin charm for 60s.', consumable: true, category: 'treat' },
  { id: 'boots', icon: '👟', name: 'Swift Boots', price: 120, desc: 'Walk, fly and sail 15% faster (Permanent).', category: 'gear' },
  { id: 'crys', icon: '💎', name: 'Mana Crystal', price: 150, desc: 'Magic refills 60% faster (Permanent).', category: 'charm' },
  { id: 'clover', icon: '🍀', name: 'Lucky Clover', price: 100, desc: 'Earn 50% more coins from all sources (Permanent).', category: 'charm' },
  { id: 'rod', icon: '🎣', name: 'Sturdy Rod', price: 80, desc: 'Expands the green catch zone when fishing (Permanent).', category: 'gear' },
  { id: 'cloud', icon: '☁️', name: 'Cloud Charm', price: 200, desc: 'Cloud Wings cost 0 mana (Permanent).', category: 'charm' },
  { id: 'lens', icon: '🔭', name: 'Star Lens', price: 90, desc: 'Star Sense beacons last twice as long and reveal Echoes (Permanent).', category: 'charm' },
  { id: 'boat_sail', icon: '⛵', name: 'Sea Legs Sail', price: 140, desc: 'Captain Barnacle’s Puddle II sails 25% faster (Permanent).', category: 'gear' },
  { id: 'doris_deluxe', icon: '🍃', name: 'Doris Deluxe Leaf', price: 130, desc: 'Leaf Glide descent lasts twice as long (Permanent).', category: 'gear' },
  { id: 'cozy_scarf', icon: '🧣', name: 'Cozy Scarf', price: 110, desc: 'Immunity to movement slowdown in deep snow or desert sand (Permanent).', category: 'gear' },
  { id: 'satchel', icon: '🎒', name: 'Lantern Satchel', price: 90, desc: 'Doubles inventory carrying capacity (Permanent).', category: 'gear' },
  { id: 'market_bell', icon: '🛎️', name: 'Golden Market Bell', price: 145, desc: '15% merchant discount & +20% fish sell value across every bazaar (Permanent).', category: 'charm' },
  { id: 'lantern_charm', icon: '🏮', name: 'Festival Lantern Charm', price: 165, desc: 'Warm plaza glow aura that passively speeds stamina & mana recovery (Permanent).', category: 'charm' },
];

export interface TownMarketProfile {
  townName: string;
  bazaarTitle: string;
  merchantName: string;
  tagline: string;
  bannerColor: string;
  itemIds: string[];
}

export const TOWN_MARKET_PROFILES: Record<string, TownMarketProfile> = {
  Willowbrook: {
    townName: 'Willowbrook',
    bazaarTitle: 'Willowbrook Bakery & Morning Square',
    merchantName: 'Pip & Barley',
    tagline: 'Warm cloud muffins straight from the brick oven, freshly cut wildflowers, and traveler provisions.',
    bannerColor: '#ff7aa8',
    itemIds: ['snack', 'tonic', 'honey_tart', 'boots', 'clover', 'market_bell'],
  },
  Mossgate: {
    townName: 'Mossgate',
    bazaarTitle: 'Mossgate Root & Lantern Exchange',
    merchantName: 'Elder Fern',
    tagline: 'Moss-bound relics, woodland herbal infusions, and quiet lanterns carved from ancient amber.',
    bannerColor: '#4bb37e',
    itemIds: ['tonic', 'starlight_tea', 'doris_deluxe', 'satchel', 'lantern_charm'],
  },
  'Oasis Rest': {
    townName: 'Oasis Rest',
    bazaarTitle: 'Sun-Baked Caravanserai Souk',
    merchantName: 'Dune Dave',
    tagline: 'Terracotta spice jars, woven desert canopies, and cooling melon tonics beside the plaza spring.',
    bannerColor: '#e89643',
    itemIds: ['snack', 'honey_tart', 'cinder_cocoa', 'cozy_scarf', 'market_bell'],
  },
  Frostholm: {
    townName: 'Frostholm',
    bazaarTitle: 'Frostholm Timber & Hearth Lodge',
    merchantName: 'Flurry',
    tagline: 'Steaming spiced cocoa, hand-knitted alpine scarves, and sleigh-runner waxed boots.',
    bannerColor: '#69b8f0',
    itemIds: ['cinder_cocoa', 'tonic', 'cozy_scarf', 'boots', 'lantern_charm'],
  },
  'Pebble Peaks': {
    townName: 'Pebble Peaks',
    bazaarTitle: 'Highland Quarry & Stargazer Market',
    merchantName: 'Pebble Pete',
    tagline: 'Polished cairn geodes, copper pocket-telescopes, and hardy trail biscuits for ridge climbers.',
    bannerColor: '#8b7ec8',
    itemIds: ['snack', 'starlight_tea', 'lens', 'satchel', 'crys'],
  },
  'Driftwood Dock': {
    townName: 'Driftwood Dock',
    bazaarTitle: 'Driftwood Wharf Fishmonger & Chandlery',
    merchantName: 'Captain Barnacle',
    tagline: 'Salt-sprayed boat rigging, steaming harbor chowder, and fresh catch weigh-in scales.',
    bannerColor: '#3ab3c8',
    itemIds: ['tide_chowder', 'snack', 'rod', 'boat_sail', 'market_bell'],
  },
  'Petal Hollow': {
    townName: 'Petal Hollow',
    bazaarTitle: 'Blossom Pavilion Tea & Silk Stalls',
    merchantName: 'Mochi Blossom Guild',
    tagline: 'Hand-painted paper lanterns, sakura tea sets, and petal-spun cloaks beneath curving eaves.',
    bannerColor: '#f57cb2',
    itemIds: ['starlight_tea', 'honey_tart', 'doris_deluxe', 'clover', 'lantern_charm'],
  },
  'Honeycomb Village': {
    townName: 'Honeycomb Village',
    bazaarTitle: 'Golden Hive Apiary & Confectionery',
    merchantName: 'Bumble',
    tagline: 'Amber nectar combs, warm wildflower tarts, and golden clover charms buzzing with sweetness.',
    bannerColor: '#f3b43f',
    itemIds: ['honey_tart', 'tonic', 'snack', 'clover', 'satchel'],
  },
  'Wildflower Mill': {
    townName: 'Wildflower Mill',
    bazaarTitle: 'Windmill Granary & Orchard Market',
    merchantName: 'Miller Grain',
    tagline: 'Stone-ground meadow flour, orchard cider barrels, and ribboned breeze charms.',
    bannerColor: '#77c268',
    itemIds: ['snack', 'honey_tart', 'boots', 'clover'],
  },
  'Tidepool Haven': {
    townName: 'Tidepool Haven',
    bazaarTitle: 'Coral Pier & Lighthouse Provisions',
    merchantName: 'Tidbit',
    tagline: 'Pearlescent curios, sea-salt snacks, and glowing beacon oil for outer-island explorers.',
    bannerColor: '#4ac2d6',
    itemIds: ['tide_chowder', 'tonic', 'rod', 'boat_sail', 'lens'],
  },
  'Starfish Shallows': {
    townName: 'Starfish Shallows',
    bazaarTitle: 'Conch Shell & Tide Bazaar',
    merchantName: 'Dot',
    tagline: 'Breezy driftwood booths stocked with coastal bait, shell anklets, and quick travel sails.',
    bannerColor: '#58b4e3',
    itemIds: ['tide_chowder', 'snack', 'rod', 'boat_sail'],
  },
  'Cinder Spas': {
    townName: 'Cinder Spas',
    bazaarTitle: 'Volcanic Bathhouse & Ember Goods',
    merchantName: 'Ember',
    tagline: 'Lava-warmed cocoa, basalt bath salts, and radiant hearth charms.',
    bannerColor: '#ef6b4b',
    itemIds: ['cinder_cocoa', 'tonic', 'cozy_scarf', 'lantern_charm'],
  },
  'Lily Pavilion': {
    townName: 'Lily Pavilion',
    bazaarTitle: 'Fenway Lantern & Echo Boutique',
    merchantName: 'Madame Mizzle',
    tagline: 'Dewdrop infusions, mist-lantern curios, and acoustics-tuned charms.',
    bannerColor: '#6bb892',
    itemIds: ['starlight_tea', 'tonic', 'lens', 'doris_deluxe'],
  },
  'Aurora Station': {
    townName: 'Aurora Station',
    bazaarTitle: 'Polar Sled & Aurora Trade Post',
    merchantName: 'Penny and Quill',
    tagline: 'Peppermint expedition cocoa, prism goggles, and aurora-dyed winter scarves.',
    bannerColor: '#7c96f2',
    itemIds: ['cinder_cocoa', 'starlight_tea', 'cozy_scarf', 'lens', 'boots'],
  },
  'Bellwood Treetops': {
    townName: 'Bellwood Treetops',
    bazaarTitle: 'Canopy Chime & Leaf-Glider Loft',
    merchantName: 'Bellamy',
    tagline: 'Brass wind chimes, deluxe leaf gliders, and treetop herb blends.',
    bannerColor: '#78b86a',
    itemIds: ['tonic', 'starlight_tea', 'doris_deluxe', 'lantern_charm'],
  },
  'Dawn Spire Summit': {
    townName: 'Dawn Spire Summit',
    bazaarTitle: 'Suncrest Sanctuary Armory & Brews',
    merchantName: 'Dawn Keepers',
    tagline: 'Celestial teas, starlight lenses, and high-altitude expedition charms.',
    bannerColor: '#f5b041',
    itemIds: ['starlight_tea', 'honey_tart', 'crys', 'cloud', 'lantern_charm'],
  },
  'Nimbus Market': {
    townName: 'Nimbus Market',
    bazaarTitle: 'Grand Cloudstone Sky Bazaar',
    merchantName: 'Cumulo',
    tagline: 'Soaring silk pavilions above the clouds offering sky-feathered relics and radiant moon teas.',
    bannerColor: '#9c78f5',
    itemIds: ['starlight_tea', 'tonic', 'cloud', 'crys', 'lens', 'market_bell'],
  },
  Bramblebridge: {
    townName: 'Bramblebridge',
    bazaarTitle: 'Bramblebridge Meadow Pantry & Tea Shed',
    merchantName: 'Bramble',
    tagline: 'Riverstone breads, wildberry preserves, and sturdy walking boots beside the old stone arch.',
    bannerColor: '#76b96c',
    itemIds: ['snack', 'honey_tart', 'boots', 'clover', 'lantern_charm'],
  },
  'Sapphire Haven': {
    townName: 'Sapphire Haven',
    bazaarTitle: 'Sapphire Cliff Chandlery & Compass Guild',
    merchantName: 'Capt. Tidecrest',
    tagline: 'Deep-sea spyglasses, storm-lantern brass fittings, and brisk coastal chowders on the western bluff.',
    bannerColor: '#3f8fe0',
    itemIds: ['tide_chowder', 'rod', 'boat_sail', 'lens', 'market_bell'],
  },
  'Maple Crossing': {
    townName: 'Maple Crossing',
    bazaarTitle: 'Crimson Eaves Tea & Chime Bazaar',
    merchantName: 'Momiji',
    tagline: 'Amber maple-sugar confections, wind-tuned cedar chimes, and warm silk travel cloaks.',
    bannerColor: '#e66c55',
    itemIds: ['starlight_tea', 'cinder_cocoa', 'cozy_scarf', 'doris_deluxe', 'lantern_charm'],
  },
  'Starfall Observatory': {
    townName: 'Starfall Observatory',
    bazaarTitle: 'Astrolabe Terrace Curio & Lens Exchange',
    merchantName: 'Astra',
    tagline: 'Brass celestial astrolabes, moonlit tonic vials, and star-chart scrolls overlooking southern waters.',
    bannerColor: '#8d74eb',
    itemIds: ['starlight_tea', 'tonic', 'lens', 'crys', 'satchel'],
  },
  'Aether Sky Garden': {
    townName: 'Aether Sky Garden',
    bazaarTitle: 'Western Wind-Harp Sky Emporium',
    merchantName: 'Zephyr',
    tagline: 'Cloud-woven banners, featherlight charms, and sunlit breeze elixirs perched high above the western sea.',
    bannerColor: '#7dc5ff',
    itemIds: ['tonic', 'starlight_tea', 'cloud', 'clover', 'market_bell'],
  },
};

export interface TownCommunityRequest {
  id: string;
  townName: string;
  title: string;
  requester: string;
  desc: string;
  requirementKind: 'stars' | 'pearls' | 'feathers' | 'fish' | 'friends' | 'coins_donate';
  targetCount: number;
  rewardCoins: number;
}

export const TOWN_COMMUNITY_REQUESTS: TownCommunityRequest[] = [
  {
    id: 'req-willowbrook-lanterns',
    townName: 'Willowbrook',
    title: 'Square Garland Lighting',
    requester: 'Pip',
    desc: 'Share 40 coins to string extra golden festival garlands across Willowbrook Square.',
    requirementKind: 'coins_donate',
    targetCount: 40,
    rewardCoins: 75,
  },
  {
    id: 'req-dock-catch',
    townName: 'Driftwood Dock',
    title: 'Harbor Fishmonger Stock',
    requester: 'Captain Barnacle',
    desc: 'Show you have caught at least 3 fish across the archipelago to celebrate the Wharf Market.',
    requirementKind: 'fish',
    targetCount: 3,
    rewardCoins: 65,
  },
  {
    id: 'req-mossgate-stars',
    townName: 'Mossgate',
    title: 'Ancient Root Illuminations',
    requester: 'Mossgate Guild',
    desc: 'Gather 10 Star Gems in your travels so Mossgate lanterns glow bright green.',
    requirementKind: 'stars',
    targetCount: 10,
    rewardCoins: 60,
  },
  {
    id: 'req-oasis-fund',
    townName: 'Oasis Rest',
    title: 'Shade Pergola Weaving',
    requester: 'Dune Dave',
    desc: 'Contribute 45 coins to weave cool saffron awnings over the Oasis Rest caravanserai.',
    requirementKind: 'coins_donate',
    targetCount: 45,
    rewardCoins: 85,
  },
  {
    id: 'req-frostholm-friends',
    townName: 'Frostholm',
    title: 'Hearthwarming Choir',
    requester: 'Flurry',
    desc: 'Become Heart Friends with 3 islanders so Frostholm’s lodge fires roar with song.',
    requirementKind: 'friends',
    targetCount: 3,
    rewardCoins: 80,
  },
  {
    id: 'req-petal-garland',
    townName: 'Petal Hollow',
    title: 'Blossom Festival Banner',
    requester: 'Blossom Artisans',
    desc: 'Gather 15 Star Gems to adorn Petal Hollow’s pagoda eaves with lantern shimmer.',
    requirementKind: 'stars',
    targetCount: 15,
    rewardCoins: 80,
  },
  {
    id: 'req-honeycomb-feast',
    townName: 'Honeycomb Village',
    title: 'Golden Hive Jubilee',
    requester: 'Bumble',
    desc: 'Invest 35 coins in sugar-glaze barrels for the Honeycomb market festival.',
    requirementKind: 'coins_donate',
    targetCount: 35,
    rewardCoins: 70,
  },
  {
    id: 'req-tidepool-pearls',
    townName: 'Tidepool Haven',
    title: 'Sea-Glass Lantern Pier',
    requester: 'Tidbit',
    desc: 'Collect 5 Sea Pearls from coastal waters to line Tidepool Haven’s wharf posts.',
    requirementKind: 'pearls',
    targetCount: 5,
    rewardCoins: 85,
  },
  {
    id: 'req-nimbus-feathers',
    townName: 'Nimbus Market',
    title: 'Sky Caravan Sail Upgrade',
    requester: 'Cumulo',
    desc: 'Collect 6 Cloud Feathers in the Sky Kingdom to sew iridescent market streamers.',
    requirementKind: 'feathers',
    targetCount: 6,
    rewardCoins: 110,
  },
  {
    id: 'req-sapphire-catch',
    townName: 'Sapphire Haven',
    title: 'Western Lighthouse Beacon',
    requester: 'Capt. Tidecrest',
    desc: 'Gather 8 Sea Pearls along the western shoals to polish the Sapphire Beacon prism.',
    requirementKind: 'pearls',
    targetCount: 8,
    rewardCoins: 95,
  },
  {
    id: 'req-maple-lanterns',
    townName: 'Maple Crossing',
    title: 'Autumn Pagoda Chimes',
    requester: 'Momiji',
    desc: 'Contribute 50 coins to string scarlet paper lanterns across the Maple Crossing bridge.',
    requirementKind: 'coins_donate',
    targetCount: 50,
    rewardCoins: 95,
  },
  {
    id: 'req-starfall-charts',
    townName: 'Starfall Observatory',
    title: 'Southern Constellation Atlas',
    requester: 'Astra',
    desc: 'Collect 20 Star Gems across the outer islands to calibrate the brass astrolabe.',
    requirementKind: 'stars',
    targetCount: 20,
    rewardCoins: 105,
  },
  {
    id: 'req-bramble-fellowship',
    townName: 'Bramblebridge',
    title: 'Bridgefoot Tea Festival',
    requester: 'Bramble',
    desc: 'Become Heart Friends with 4 islanders so the whole eastern valley gathers at Bramblebridge.',
    requirementKind: 'friends',
    targetCount: 4,
    rewardCoins: 85,
  },
];

// 20 Achievements in Mochi Meadows 2
export const ACHIEVEMENTS = [
  { id: 'first_light', icon: '🌅', title: 'First Light', desc: 'Complete Chapter 1 and begin your journey across Lantern Isle.' },
  { id: 'sail_atoll', icon: '⛵', title: 'Captain’s Mate', desc: 'Cross the waves and arrive at Tidepool Atoll on the southern sea.' },
  { id: 'hush_soothe', icon: '🤍', title: 'The Heart Healer', desc: 'Soothe your first lonely Hollow and watch color bloom back.' },
  { id: 'befriend_5', icon: '💞', title: 'Island Heartbeat', desc: 'Become heart friends with 5 islanders across the archipelago.' },
  { id: 'act1_complete', icon: '🌞', title: 'The Answering Note', desc: 'Complete Act I and restore the warmth of Tidepool & Honeycomb Hills.' },
  { id: 'act2_complete', icon: '🌙', title: 'Keeper of the Two Songs', desc: 'Complete Act II and unseal the ancient roots beneath the Lantern Tree.' },
  { id: 'star25', icon: '🌟', title: 'Star Collector', desc: 'Collect 25 star gems across the archipelago.' },
  { id: 'star100', icon: '✨', title: 'Constellation Seeker', desc: 'Collect 100 star gems.' },
  { id: 'pearl25', icon: '🐚', title: 'Reef Wanderer', desc: 'Collect 25 sea pearls in the ocean shallows and coral beds.' },
  { id: 'feather25', icon: '🪶', title: 'Sky Glider', desc: 'Collect 25 cloud feathers above the clouds.' },
  { id: 'chimes', icon: '🔔', title: 'Golden Hour Chimes', desc: 'Ring 7 Chimes via Sky Rainbow Rings, Echo Call, or Dawn Break.' },
  { id: 'echo_hunter', icon: '📻', title: 'Echo Hunter', desc: 'Discover 3 Memory Echoes or Moon Diary Pages using Echo Call.' },
  { id: 'echo_keeper', icon: '📜', title: 'Echo Keeper', desc: 'Recover 12 Memory Echoes & Moon Diary Pages across the realms.' },
  { id: 'harmony_master', icon: '🎶', title: 'Harmony Maestro', desc: 'Trigger 5 different combination spell harmonies.' },
  { id: 'cottage_home', icon: '🏡', title: 'Home Sweet Home', desc: 'Decorate your Moonlit Cottage with 6 cozy furniture pieces.' },
  { id: 'hamlet_mayor', icon: '🏘️', title: 'Hamlet Founder', desc: 'Invite 5 islander friends to move into Mochi Hamlet.' },
  { id: 'fish10', icon: '🎣', title: 'Master Angler', desc: 'Catch 10 different species of island fish.' },
  { id: 'seven_verses', icon: '📖', title: 'The Seven Keepers', desc: 'Collect all seven Verses of the Reveille.' },
  { id: 'song_weaver', icon: '🎼', title: 'Song Weaver', desc: 'Compose a melody on the musical staff and play it on the music box.' },
  { id: 'duet_finale', icon: '✨', title: 'The Dawn Duet', desc: 'Sing the Lullaby and the Reveille together atop Dawn Spire.' },
];

// 15 Composed Musical Themes
export const MUSIC_TRACKS = [
  ['🌈', 'Adventure (Dynamic Biome)'],
  ['🎠', 'Music Box Waltz'],
  ['☕', 'Lo-Fi Chill'],
  ['🌞', 'Sunny Strum'],
  ['☁️', 'Dreamy Echoes'],
  ['🌙', 'Night Bells'],
  ['🍯', 'Honeyhum (Honeycomb Hills)'],
  ['🌊', 'Tide Waltz (Tidepool Atoll)'],
  ['🔥', 'Cinder Lounge (Cinder Cradle)'],
  ['🐸', 'Fen Whispers (Mirror Fens)'],
  ['🌌', 'Aurora (Aurora Reach)'],
  ['🔔', 'Chimewood (Chime Canopy)'],
  ['🍄', 'Glowdeep Caverns'],
  ['✨', 'The Moon Road (Dreamwalk)'],
  ['🌅', 'The Dawn Duet (Finale Song)'],
  ['🔇', 'Mute Music'],
  ['🎧', 'Custom Audio'],
] as const;

// Weather Config
export type WeatherId = 'sunny' | 'drizzle' | 'stardust' | 'snowy' | 'aurora' | 'muffin_rain';

export type WeatherEffectKind = 'speed' | 'stamina_regen' | 'stamina_cost' | 'mana_regen';

export interface WeatherEffectBadge {
  kind: WeatherEffectKind;
  delta: string;
  label: string;
  detail: string;
  tone: 'buff' | 'caution' | 'magic';
}

export interface WeatherModifiers {
  speedMultiplier: number;
  staminaDrainMultiplier: number;
  staminaRegenMultiplier: number;
  manaRegenMultiplier: number;
}

export interface WeatherConfig {
  id: WeatherId;
  name: string;
  icon: string;
  description: string;
  duration: number;
  tintColor: string;
  vignetteColor: string;
  skyTint: string;
  particleType: 'none' | 'rain' | 'stardust' | 'snow' | 'aurora' | 'muffins';
  ambientMessage: string;
  modifiers: WeatherModifiers;
  effectBadges: WeatherEffectBadge[];
}

export const WEATHER_TYPES: WeatherConfig[] = [
  {
    id: 'sunny',
    name: 'Warm Sunshine',
    icon: '☀️',
    description: 'Bright golden sunbeams warm the meadows and shimmer over the calm waves.',
    duration: 160,
    tintColor: 'rgba(255, 226, 140, 0.08)',
    vignetteColor: 'rgba(255, 200, 80, 0.05)',
    skyTint: 'rgba(255, 235, 170, 0.12)',
    particleType: 'none',
    ambientMessage: 'Warm sunshine breaks through the morning clouds! ☀️',
    modifiers: {
      speedMultiplier: 1.05,
      staminaDrainMultiplier: 1.0,
      staminaRegenMultiplier: 1.35,
      manaRegenMultiplier: 1.0,
    },
    effectBadges: [
      {
        kind: 'speed',
        delta: '+5%',
        label: 'Speed',
        detail: 'Sunny tailwind: +5% movement speed',
        tone: 'buff',
      },
      {
        kind: 'stamina_regen',
        delta: '+35%',
        label: 'Stamina Regen',
        detail: 'Warm sunbeams: +35% faster stamina recovery',
        tone: 'buff',
      },
    ],
  },
  {
    id: 'drizzle',
    name: 'Cozy Drizzle',
    icon: '🌧️',
    description: 'A gentle, peaceful rain patters softly on the leaves, with ripples shimmering in the water.',
    duration: 140,
    tintColor: 'rgba(70, 105, 160, 0.16)',
    vignetteColor: 'rgba(40, 65, 110, 0.18)',
    skyTint: 'rgba(50, 75, 120, 0.22)',
    particleType: 'rain',
    ambientMessage: 'A soft, cozy drizzle begins to patter on the grass… 🌧️',
    modifiers: {
      speedMultiplier: 0.94,
      staminaDrainMultiplier: 0.75,
      staminaRegenMultiplier: 1.0,
      manaRegenMultiplier: 1.1,
    },
    effectBadges: [
      {
        kind: 'speed',
        delta: '-6%',
        label: 'Speed',
        detail: 'Slick dew paths: -6% movement speed',
        tone: 'caution',
      },
      {
        kind: 'stamina_cost',
        delta: '-25%',
        label: 'Sprint Cost',
        detail: 'Cool mist: 25% less stamina spent while sprinting',
        tone: 'buff',
      },
    ],
  },
  {
    id: 'stardust',
    name: 'Glowing Stardust',
    icon: '✨',
    description: 'Luminous celestial motes drift down from the Moon, bathing the island in purple-gold starlight.',
    duration: 150,
    tintColor: 'rgba(150, 100, 240, 0.14)',
    vignetteColor: 'rgba(120, 60, 200, 0.16)',
    skyTint: 'rgba(130, 70, 220, 0.22)',
    particleType: 'stardust',
    ambientMessage: 'Glowing stardust showers down from the Moon! ✨',
    modifiers: {
      speedMultiplier: 1.06,
      staminaDrainMultiplier: 1.0,
      staminaRegenMultiplier: 1.0,
      manaRegenMultiplier: 1.45,
    },
    effectBadges: [
      {
        kind: 'mana_regen',
        delta: '+45%',
        label: 'Mana Regen',
        detail: 'Lunar stardust: +45% faster mana recovery',
        tone: 'magic',
      },
      {
        kind: 'speed',
        delta: '+6%',
        label: 'Speed',
        detail: 'Starlight float: +6% movement speed',
        tone: 'buff',
      },
    ],
  },
  {
    id: 'snowy',
    name: 'Fluffy Snowfall',
    icon: '❄️',
    description: 'Delicate snowflakes flutter through the air, dusting the trees and rocks in crisp silver.',
    duration: 140,
    tintColor: 'rgba(190, 225, 255, 0.15)',
    vignetteColor: 'rgba(150, 195, 240, 0.15)',
    skyTint: 'rgba(170, 210, 255, 0.22)',
    particleType: 'snow',
    ambientMessage: 'Soft, silent snowflakes begin to dance on the breeze… ❄️',
    modifiers: {
      speedMultiplier: 0.9,
      staminaDrainMultiplier: 1.2,
      staminaRegenMultiplier: 1.0,
      manaRegenMultiplier: 1.0,
    },
    effectBadges: [
      {
        kind: 'speed',
        delta: '-10%',
        label: 'Speed',
        detail: 'Deep snowdrifts: -10% speed (Cozy Scarf negates)',
        tone: 'caution',
      },
      {
        kind: 'stamina_cost',
        delta: '+20%',
        label: 'Sprint Cost',
        detail: 'Chilly powder: +20% stamina spent while sprinting',
        tone: 'caution',
      },
    ],
  },
  {
    id: 'aurora',
    name: 'Shimmering Aurora',
    icon: '🌌',
    description: 'Vibrant green and violet ribbons dance gracefully across the evening sky.',
    duration: 150,
    tintColor: 'rgba(120, 255, 210, 0.12)',
    vignetteColor: 'rgba(80, 200, 180, 0.15)',
    skyTint: 'rgba(100, 240, 200, 0.2)',
    particleType: 'aurora',
    ambientMessage: 'An enchanting aurora unfurls across the night sky! 🌌',
    modifiers: {
      speedMultiplier: 1.0,
      staminaDrainMultiplier: 0.65,
      staminaRegenMultiplier: 1.15,
      manaRegenMultiplier: 1.35,
    },
    effectBadges: [
      {
        kind: 'stamina_cost',
        delta: '-35%',
        label: 'Sprint Cost',
        detail: 'Aurora vigor: 35% less stamina spent sprinting',
        tone: 'buff',
      },
      {
        kind: 'mana_regen',
        delta: '+35%',
        label: 'Mana Regen',
        detail: 'Polar shimmer: +35% faster mana recovery',
        tone: 'magic',
      },
    ],
  },
  {
    id: 'muffin_rain',
    name: 'Cloud Muffin Breeze',
    icon: '🧁',
    description: 'A gentle gust from Pip’s bakery sends warm, fluffy cloud muffins floating over the island!',
    duration: 120,
    tintColor: 'rgba(255, 240, 210, 0.1)',
    vignetteColor: 'rgba(255, 210, 180, 0.08)',
    skyTint: 'rgba(255, 230, 200, 0.15)',
    particleType: 'muffins',
    ambientMessage: 'Pip’s runaway cloud muffins are floating gently on the breeze! 🧁',
    modifiers: {
      speedMultiplier: 1.12,
      staminaDrainMultiplier: 0.85,
      staminaRegenMultiplier: 1.5,
      manaRegenMultiplier: 1.1,
    },
    effectBadges: [
      {
        kind: 'speed',
        delta: '+12%',
        label: 'Speed',
        detail: 'Sugar breeze: +12% movement speed',
        tone: 'buff',
      },
      {
        kind: 'stamina_regen',
        delta: '+50%',
        label: 'Stamina Regen',
        detail: 'Warm bakery aroma: +50% faster stamina recovery',
        tone: 'buff',
      },
    ],
  },
];

// The Four Movements of the Year (Seasons)
export const SEASONS = [
  { id: 'spring', name: 'Spring Allegro', icon: '🌸', desc: 'Gardens bloom, bridges sprout quickly, and birds sing bright major melodies.' },
  { id: 'summer', name: 'Summer Forte', icon: '☀️', desc: 'Golden warm days, lively reefs, and lively outdoor gatherings.' },
  { id: 'autumn', name: 'Autumn Adagio', icon: '🍂', desc: 'Amber leaves, rich harvest recipes, and cozy tea parties.' },
  { id: 'winter', name: 'Winter Pianissimo', icon: '❄️', desc: 'Quiet snowy beauty, frost bridges, and starry aurora nights.' },
] as const;

export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';
