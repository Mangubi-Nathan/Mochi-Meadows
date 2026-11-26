/**
 * Mochi Meadows 2: Seasonal World & UI Theme System
 * Defines Spring, Summer, Autumn, and Winter palettes across both the DOM UI
 * and the Canvas Archipelago (terrain biomes, foliage, props, lighting, and motes).
 */

import { BIOME_COLORS, SeasonId, WeatherId } from './constants';

export const SEASON_ORDER: SeasonId[] = ['spring', 'summer', 'autumn', 'winter'];
export const SEASON_DURATION_SEC = 12 * 60; // 12 minutes per season (~5x longer than weather spells)
export const SEASON_DURATION_MS = SEASON_DURATION_SEC * 1000;

export interface ScheduledSeasonState {
  season: SeasonId;
  nextSeason: SeasonId;
  progress: number;
  remainingMs: number;
  remainingSeconds: number;
  durationMs: number;
}

export const WEATHER_UI_THEMES: Record<WeatherId, { moodLabel: string; accentHint: string }> = {
  sunny: { moodLabel: 'Sunlit Gold', accentHint: '#fbbf24' },
  drizzle: { moodLabel: 'Raindrop Mist', accentHint: '#60a5fa' },
  stardust: { moodLabel: 'Starlit Violet', accentHint: '#a78bfa' },
  snowy: { moodLabel: 'Glacier Frost', accentHint: '#93c5fd' },
  aurora: { moodLabel: 'Polar Aurora', accentHint: '#34d399' },
  muffin_rain: { moodLabel: 'Warm Pastry', accentHint: '#fb923c' },
};

export interface SeasonThemeConfig {
  id: SeasonId;
  name: string;
  subtitle: string;
  icon: string;
  badgeText: string;
  description: string;
  ui: {
    accent: string;
    accentStrong: string;
    border: string;
    softBg: string;
    chipText: string;
  };
  world: {
    biomeOverrides: Record<number, string>;
    townLawn: string;
    grassDark: string;
    grassLight: string;
    oakShades: readonly [string, string, string];
    oakFruit: readonly [string, string];
    blossomShades: readonly [string, string, string];
    blossomPetal: string;
    blossomBark: string;
    pineTiers: readonly [
      { dy: number; w: number; h: number; c: string; cap: string },
      { dy: number; w: number; h: number; c: string; cap: string },
      { dy: number; w: number; h: number; c: string; cap: string }
    ];
    bushLeafDark: string;
    bushLeafLight: string;
    bushBlossoms: readonly [string, string];
    flowerStems: string;
    flowerPetals: readonly [string, string, string];
    flowerCenter: string;
    boulderCap: string;
    lilypadColor: string;
    lilyBlossomColor: string;
    houseRoofDark: string;
    houseRoof: string;
    houseRoofHi: string;
    housePlanterLeaf: string;
    housePlanterBlossom: string;
    snowTrim: boolean;
    surfaceBackdrop: readonly [string, string];
    skyBackdrop: readonly [string, string, string];
    greatTreeLit: readonly [string, string, string, string];
    moteColors: readonly [string, string];
    ambientTint: string;
  };
}

export const SEASON_THEMES: Record<SeasonId, SeasonThemeConfig> = {
  spring: {
    id: 'spring',
    name: 'Spring',
    subtitle: 'Spring Allegro',
    icon: '🌸',
    badgeText: 'Sakura & Emerald Bloom',
    description: 'Pastel rose UI, blossoming cherry trees, fresh clover meadows, and drifting sakura petals.',
    ui: {
      accent: '#ff7aa8',
      accentStrong: '#e85588',
      border: '#efc8da',
      softBg: 'rgba(255, 211, 226, 0.45)',
      chipText: '#c43e72',
    },
    world: {
      biomeOverrides: {},
      townLawn: 'rgba(182, 234, 152, 0.58)',
      grassDark: '#398a4e',
      grassLight: '#6db85f',
      oakShades: ['#327d4e', '#469e64', '#72cb86'],
      oakFruit: ['#ff7b7b', '#ffd23f'],
      blossomShades: ['#e57da8', '#fba7c8', '#ffd5e7'],
      blossomPetal: '#fff5fa',
      blossomBark: '#724952',
      pineTiers: [
        { dy: -3, w: 20, h: 19, c: '#34685e', cap: '#629d91' },
        { dy: -14, w: 15.5, h: 16.5, c: '#447f73', cap: '#cceaff' },
        { dy: -25, w: 10.5, h: 14, c: '#6eb2a3', cap: '#eef9ff' },
      ],
      bushLeafDark: '#3b8b51',
      bushLeafLight: '#63be74',
      bushBlossoms: ['#ff8fb8', '#ffe373'],
      flowerStems: '#5bb367',
      flowerPetals: ['#ff7aa8', '#ffd84d', '#8ed0ff'],
      flowerCenter: '#fff7cc',
      boulderCap: '#65be78',
      lilypadColor: '#5bb870',
      lilyBlossomColor: '#ff9ebb',
      houseRoofDark: '#bd4769',
      houseRoof: '#ef6f95',
      houseRoofHi: '#ff9fc0',
      housePlanterLeaf: '#5bb870',
      housePlanterBlossom: '#ff7aa8',
      snowTrim: false,
      surfaceBackdrop: ['#2e7cb6', '#3b8ec9'],
      skyBackdrop: ['#4691e2', '#7cc6f6', '#c5ecff'],
      greatTreeLit: ['#43a86e', '#5fc784', '#86e09c', '#b7f5be'],
      moteColors: ['#ffc3dc', '#fff091'],
      ambientTint: 'rgba(255, 224, 240, 0.04)',
    },
  },
  summer: {
    id: 'summer',
    name: 'Summer',
    subtitle: 'Summer Forte',
    icon: '☀️',
    badgeText: 'Sunlit Tropics & Gold',
    description: 'Warm honey-gold UI, tropical emerald palms & meadows, dazzling reefs, and sun-spark motes.',
    ui: {
      accent: '#f59e0b',
      accentStrong: '#d97706',
      border: '#f3d184',
      softBg: 'rgba(254, 226, 150, 0.5)',
      chipText: '#a35d00',
    },
    world: {
      biomeOverrides: {
        0: '#2680c4', // Deep Tropical Sea
        1: '#48d0eb', // Crystal Turquoise Shallows
        2: '#ffebb0', // Sunbleached Beach
        3: '#7dd862', // Lush Sunlit Meadow
        4: '#3ea454', // Deep Emerald Woods
        5: '#f5a8c0', // Hibiscus Grove
        6: '#ffcf6b', // Golden Dunes
        9: '#ffd447', // Golden Honeycomb
        10: '#f0c140',
        18: '#649459',
        19: '#8fd46c',
      },
      townLawn: 'rgba(148, 228, 120, 0.62)',
      grassDark: '#267c3f',
      grassLight: '#52b84c',
      oakShades: ['#266e3e', '#389652', '#64cb6b'],
      oakFruit: ['#ff884d', '#ffe04d'],
      blossomShades: ['#3ca164', '#58c07a', '#8fe397'],
      blossomPetal: '#ff749c',
      blossomBark: '#73503c',
      pineTiers: [
        { dy: -3, w: 20, h: 19, c: '#296e52', cap: '#489872' },
        { dy: -14, w: 15.5, h: 16.5, c: '#368a66', cap: '#7cd098' },
        { dy: -25, w: 10.5, h: 14, c: '#4fa87e', cap: '#a4e8b4' },
      ],
      bushLeafDark: '#2e8648',
      bushLeafLight: '#56c268',
      bushBlossoms: ['#ff6b6b', '#ffd23f'],
      flowerStems: '#42a656',
      flowerPetals: ['#ff6b6b', '#ffd23f', '#48dbfb'],
      flowerCenter: '#fffbe0',
      boulderCap: '#4fb865',
      lilypadColor: '#41b05b',
      lilyBlossomColor: '#ffe066',
      houseRoofDark: '#c45b2c',
      houseRoof: '#f28246',
      houseRoofHi: '#ffb878',
      housePlanterLeaf: '#48b860',
      housePlanterBlossom: '#ff924c',
      snowTrim: false,
      surfaceBackdrop: ['#1f72bd', '#2eb3e0'],
      skyBackdrop: ['#2d83e6', '#67c6fc', '#d4f4ff'],
      greatTreeLit: ['#2d9b58', '#46bd6e', '#6fdc86', '#aaf29f'],
      moteColors: ['#ffe670', '#a8ff8e'],
      ambientTint: 'rgba(255, 224, 120, 0.06)',
    },
  },
  autumn: {
    id: 'autumn',
    name: 'Autumn',
    subtitle: 'Autumn Adagio',
    icon: '🍂',
    badgeText: 'Maple Ember & Harvest',
    description: 'Cozy spiced-copper UI, blazing crimson maple groves, golden wheat fields, and drifting leaves.',
    ui: {
      accent: '#d96b34',
      accentStrong: '#b84c1c',
      border: '#e5bca0',
      softBg: 'rgba(247, 194, 152, 0.45)',
      chipText: '#963b14',
    },
    world: {
      biomeOverrides: {
        0: '#2d6d99', // Crisp Harvest Sea
        1: '#57a8bf', // Slate Cove Shallows
        2: '#ebd09b', // Toasted Shore
        3: '#d4b85b', // Golden Meadow
        4: '#c2713e', // Russet Autumn Woods
        5: '#e38756', // Amber Maple Grove
        6: '#e5b265', // Ochre Dunes
        9: '#e09a3c', // Harvest Honey Hills
        10: '#cf7c3a', // Saffron Terraces
        15: '#96a868', // Bronze Marsh
        16: '#6e8c66',
        18: '#a66e42', // Cinnamon Bellwood
        19: '#cf924a', // Marigold Canopy
      },
      townLawn: 'rgba(216, 174, 96, 0.62)',
      grassDark: '#8f5528',
      grassLight: '#c4863b',
      oakShades: ['#8c5b28', '#b87d32', '#e0ab48'],
      oakFruit: ['#e04f3d', '#ffb83f'],
      blossomShades: ['#b8412e', '#df6c34', '#ffb14a'],
      blossomPetal: '#ffe082',
      blossomBark: '#5c3c31',
      pineTiers: [
        { dy: -3, w: 20, h: 19, c: '#546141', cap: '#7a8a58' },
        { dy: -14, w: 15.5, h: 16.5, c: '#6c7a4c', cap: '#b59d5c' },
        { dy: -25, w: 10.5, h: 14, c: '#86945c', cap: '#d9b873' },
      ],
      bushLeafDark: '#9e532b',
      bushLeafLight: '#cf7b36',
      bushBlossoms: ['#ff6e42', '#ffd23f'],
      flowerStems: '#8f6c34',
      flowerPetals: ['#e86835', '#ffd23f', '#c94c68'],
      flowerCenter: '#fff3b8',
      boulderCap: '#b58442',
      lilypadColor: '#7ca355',
      lilyBlossomColor: '#ffb36b',
      houseRoofDark: '#8c3a29',
      houseRoof: '#c75938',
      houseRoofHi: '#f08b58',
      housePlanterLeaf: '#a86b36',
      housePlanterBlossom: '#ff9642',
      snowTrim: false,
      surfaceBackdrop: ['#255b85', '#397ca6'],
      skyBackdrop: ['#5e63a8', '#e59a7a', '#ffe3b3'],
      greatTreeLit: ['#b34f2b', '#d97636', '#f2a446', '#ffd26b'],
      moteColors: ['#ff884d', '#ffd45c'],
      ambientTint: 'rgba(240, 145, 65, 0.08)',
    },
  },
  winter: {
    id: 'winter',
    name: 'Winter',
    subtitle: 'Winter Pianissimo',
    icon: '❄️',
    badgeText: 'Glacier Frost & Aurora',
    description: 'Crisp glacier-blue UI, snow-blanketed islands, frosted roofs & pines, and twinkling ice motes.',
    ui: {
      accent: '#4da3e8',
      accentStrong: '#2c7ec4',
      border: '#bad8f2',
      softBg: 'rgba(186, 224, 255, 0.45)',
      chipText: '#1b5f99',
    },
    world: {
      biomeOverrides: {
        0: '#24598a', // Arctic Sea
        1: '#6ebee6', // Icy Shallows
        2: '#e2eaf5', // Frosted Shore
        3: '#e1eef8', // Snow-Blanketed Meadow
        4: '#a4c4da', // Frost-Dusted Woods
        5: '#e2dbf5', // Snowberry Blossom Grove
        6: '#ebe3cf', // Pale Winter Dunes
        7: '#f7fbff', // Fresh Powder Tundra
        8: '#b4bccf', // Frosted Peaks
        9: '#d7e3f0', // Pale Frost Hills
        10: '#cfdced',
        11: '#64b5c2',
        15: '#96c2ce', // Icy Marsh
        16: '#729eb2',
        18: '#9cb2ca', // Frosted Bellwood
        19: '#c4d8eb', // Snow Canopy
      },
      townLawn: 'rgba(226, 240, 255, 0.78)',
      grassDark: '#7ba3bd',
      grassLight: '#b3d4e8',
      oakShades: ['#688ca8', '#90b5cf', '#e8f4ff'],
      oakFruit: ['#9ee6ff', '#ffb8d4'],
      blossomShades: ['#7c96c2', '#b4cae8', '#f2f8ff'],
      blossomPetal: '#d4f2ff',
      blossomBark: '#5d6378',
      pineTiers: [
        { dy: -3, w: 20, h: 19, c: '#3d6b7a', cap: '#bde0f5' },
        { dy: -14, w: 15.5, h: 16.5, c: '#548796', cap: '#eef8ff' },
        { dy: -25, w: 10.5, h: 14, c: '#7fb0bf', cap: '#ffffff' },
      ],
      bushLeafDark: '#5b8aa3',
      bushLeafLight: '#b4d8ed',
      bushBlossoms: ['#9ee8ff', '#ffe2f2'],
      flowerStems: '#709eb5',
      flowerPetals: ['#94d6ff', '#ffffff', '#cdb4ff'],
      flowerCenter: '#e0f5ff',
      boulderCap: '#eef7ff',
      lilypadColor: '#72b4bd',
      lilyBlossomColor: '#e4f2ff',
      houseRoofDark: '#547da6',
      houseRoof: '#82b0db',
      houseRoofHi: '#f4faff',
      housePlanterLeaf: '#6d9cb5',
      housePlanterBlossom: '#a8e2ff',
      snowTrim: true,
      surfaceBackdrop: ['#1c4d7a', '#3574a3'],
      skyBackdrop: ['#3d6fa8', '#8abce8', '#e6f4ff'],
      greatTreeLit: ['#4c7996', '#72a3bf', '#b3dbf2', '#edf8ff'],
      moteColors: ['#d9f4ff', '#ffffff'],
      ambientTint: 'rgba(175, 218, 255, 0.08)',
    },
  },
};

export function normalizeSeasonId(value: unknown): SeasonId {
  if (value === 'spring' || value === 'summer' || value === 'autumn' || value === 'winter') {
    return value;
  }
  return 'spring';
}

export function getNextSeason(current: SeasonId): SeasonId {
  const idx = SEASON_ORDER.indexOf(current);
  return SEASON_ORDER[(idx + 1) % SEASON_ORDER.length];
}

export function getSeasonalBiomeColor(biomeIdx: number, season: SeasonId = 'spring'): string {
  const override = SEASON_THEMES[season]?.world.biomeOverrides[biomeIdx];
  return override || BIOME_COLORS[biomeIdx] || '#9ee087';
}

export function getScheduledSeasonState(nowMs: number = Date.now()): ScheduledSeasonState {
  const totalYearMs = SEASON_DURATION_MS * SEASON_ORDER.length;
  const wrappedMs = ((nowMs % totalYearMs) + totalYearMs) % totalYearMs;
  const idx = Math.floor(wrappedMs / SEASON_DURATION_MS) % SEASON_ORDER.length;
  const elapsedMs = wrappedMs - idx * SEASON_DURATION_MS;
  const remainingMs = Math.max(0, SEASON_DURATION_MS - elapsedMs);
  const season = SEASON_ORDER[idx];
  const nextSeason = SEASON_ORDER[(idx + 1) % SEASON_ORDER.length];
  return {
    season,
    nextSeason,
    progress: Math.max(0, Math.min(1, elapsedMs / SEASON_DURATION_MS)),
    remainingMs,
    remainingSeconds: Math.ceil(remainingMs / 1000),
    durationMs: SEASON_DURATION_MS,
  };
}
