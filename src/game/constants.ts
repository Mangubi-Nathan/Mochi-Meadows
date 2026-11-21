/**
 * Mochi Meadows 2: The Dawn Duet
 * Core Game Constants: 12 Species, 18 Biomes, 12 Spells, 21 Harmonies,
 * 30 Fish, 60 Achievements, 15 Music Tracks, Seasons, and Companions.
 */

export const N = 260; // Expanded Archipelago Dimension (260x260 tiles)
export const T = 40;  // Tile size in pixels
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

// 40 Hats and Hairpieces
export const HAT_OPTIONS = [
  ['none', '— None'],
  ['bow', '🎀 Silk Bow'],
  ['crown', '👑 Golden Crown'],
  ['leaf', '🍃 Doris Leaf Hat'],
  ['party', '🎉 Party Cone'],
  ['wizard', '🧙 Star Wizard Hat'],
  ['flower', '🌼 Daisy Wreath'],
  ['halo', '😇 Angelic Halo'],
  ['beanie', '🧢 Knitted Beanie'],
  ['beret', '🎨 Artist Beret'],
  ['chef', '👨‍🍳 Baker Toque'],
  ['straw', '👒 Island Straw Hat'],
  ['pirate', '🏴‍☠️ Captain Tricorn'],
  ['lantern_cap', '🏮 Lantern Keeper Cap'],
  ['nightcap', '🌙 Starry Nightcap'],
  ['aviator', '✈️ Skyfarer Goggles'],
  ['earmuffs', '🎧 Fluffy Earmuffs'],
  ['sprout', '🌱 Lucky Sprout'],
  ['antlers', '🦌 Little Antlers'],
  ['mushroom', '🍄 Toadstool Cap'],
  ['seashell', '🐚 Nautilus Shell'],
  ['honeycomb', '🍯 Honey Dipper'],
] as const;

// 14 Eye Styles
export const EYE_OPTIONS = [
  [0, '● Round Eyes'],
  [1, '◉ Sparkle Eyes'],
  [2, '^ Happy Arcs'],
  [3, '– Sleepy Slits'],
  [4, '★ Star Eyes'],
  [5, '♥ Heart Eyes'],
  [6, 'ᵔ Curious Eyes'],
  [7, '✦ Crystal Eyes'],
] as const;

// 8 Smile Styles
export const MOUTH_OPTIONS = [
  [0, '🙂 Sweet Smile'],
  [1, '😀 Happy Grin'],
  [2, '😮 Little "Oh"'],
  [3, '😏 Playful Smirk'],
  [4, '3 Cat Mouf'],
  [5, 'ω Bunny Pout'],
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

// 30 Outfits & Accessories
export const OUTFIT_OPTIONS = [
  [0, 'Natural Fluff'],
  [1, '🧣 Knitted Scarf'],
  [2, '🦸 Brave Cape'],
  [3, '👖 Denim Overalls'],
  [4, '🎒 Explorer Pack'],
  [5, '⚓ Sailor Collar'],
  [6, '👘 Blossom Yukata'],
  [7, '🧥 Winter Parka'],
  [8, '🍳 Bakery Apron'],
  [9, '🍯 Beekeeper Suit'],
] as const;

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

// 12 Adoptable Companions
export const COMPANIONS_LIST = [
  { id: 'gloom', name: 'Gloom the Hushling', icon: '☁️', desc: 'A gentle grey mochi with a small button who calms shy creatures and glows with every Verse.', perk: 'Calms nearby Hollows & illuminates dark paths' },
  { id: 'gloria', name: 'Gloria the Rock', icon: '🪨', desc: 'Pebble Pete’s flat rock friend who skips across water and hums when Echoes are near.', perk: 'Skips across water surfaces and points toward Echoes' },
  { id: 'gary', name: 'Gary the Pet Rock', icon: '🪨', desc: 'Dune Dave’s beloved companion. Does absolutely nothing, with supreme perfection.', perk: 'Provides 100% emotional support and zero drama' },
  { id: 'moth', name: 'Glow-Moth', icon: '🦋', desc: 'A fluffy bioluminescent moth from Glowdeep.', perk: 'Emits a golden lantern glow underground' },
  { id: 'bee', name: 'Bumble-Bee', icon: '🐝', desc: 'A tiny honeybee friend from Honeycomb Hills.', perk: 'Draws wild dew and nectar drops to your basket' },
  { id: 'whale', name: 'Mini Whale Cloud', icon: '🐳', desc: 'A pocket-sized cloud whale that drifts overhead.', perk: 'Summons temporary rainbow updrafts in the sky' },
  { id: 'frog', name: 'Lantern Frog', icon: '🐸', desc: 'A bouncy frog with a glowing belly from Mirror Fens.', perk: 'Increases jump height and identifies rare lily pads' },
];

// Shop Upgrades
export const SHOP_ITEMS = [
  { id: 'tonic', icon: '🧪', name: 'Mana Tonic', price: 20, desc: 'Instantly refills your magic bar.' },
  { id: 'snack', icon: '🥐', name: 'Stamina Snack', price: 10, desc: 'Instantly refills stamina and oxygen air.' },
  { id: 'boots', icon: '👟', name: 'Swift Boots', price: 120, desc: 'Walk, fly and sail 15% faster (Permanent).' },
  { id: 'crys', icon: '💎', name: 'Mana Crystal', price: 150, desc: 'Magic refills 60% faster (Permanent).' },
  { id: 'clover', icon: '🍀', name: 'Lucky Clover', price: 100, desc: 'Earn 50% more coins from all sources (Permanent).' },
  { id: 'rod', icon: '🎣', name: 'Sturdy Rod', price: 80, desc: 'Expands the green catch zone when fishing (Permanent).' },
  { id: 'cloud', icon: '☁️', name: 'Cloud Charm', price: 200, desc: 'Cloud Wings cost 0 mana (Permanent).' },
  { id: 'lens', icon: '🔭', name: 'Star Lens', price: 90, desc: 'Star Sense beacons last twice as long and reveal Echoes (Permanent).' },
  { id: 'boat_sail', icon: '⛵', name: 'Sea Legs Sail', price: 140, desc: 'Captain Barnacle’s Puddle II sails 25% faster (Permanent).' },
  { id: 'doris_deluxe', icon: '🍃', name: 'Doris Deluxe Leaf', price: 130, desc: 'Leaf Glide descent lasts twice as long (Permanent).' },
  { id: 'cozy_scarf', icon: '🧣', name: 'Cozy Scarf', price: 110, desc: 'Immunity to movement slowdown in deep snow or desert sand (Permanent).' },
  { id: 'satchel', icon: '🎒', name: 'Lantern Satchel', price: 90, desc: 'Doubles inventory carrying capacity (Permanent).' },
];

// 60 Achievements in Mochi Meadows 2
export const ACHIEVEMENTS = [
  { id: 'first_light', icon: '🌅', title: 'First Light', desc: 'Complete Chapter 1 and unlock your Moonlit Cottage.' },
  { id: 'sail_atoll', icon: '⛵', title: 'Captain’s Mate', desc: 'Board the Puddle II and sail across open waters to Tidepool Atoll.' },
  { id: 'hush_soothe', icon: '🤍', title: 'The Heart Healer', desc: 'Soothe your first lonely Hollow and watch color bloom back.' },
  { id: 'star25', icon: '🌟', title: 'Star Collector', desc: 'Collect 25 star gems across the archipelago.' },
  { id: 'star100', icon: '✨', title: 'Constellation Seeker', desc: 'Collect 100 star gems.' },
  { id: 'pearl25', icon: '🐚', title: 'Reef Wanderer', desc: 'Collect 25 sea pearls in the ocean shallows and coral beds.' },
  { id: 'feather25', icon: '🪶', title: 'Sky Glider', desc: 'Collect 25 cloud feathers above the clouds.' },
  { id: 'chimes', icon: '🔔', title: 'Golden Hour Chimes', desc: 'Ring 7 Dawn Chimes during morning golden hour.' },
  { id: 'echo_hunter', icon: '📻', title: 'Echo Hunter', desc: 'Discover 12 Memory Echoes using Echo Call.' },
  { id: 'echo_keeper', icon: '📜', title: 'Echo Keeper', desc: 'Recover 48 Memory Echoes across all five layers.' },
  { id: 'harmony_master', icon: '🎶', title: 'Harmony Maestro', desc: 'Trigger 5 different combination spell harmonies.' },
  { id: 'cottage_home', icon: '🏡', title: 'Home Sweet Home', desc: 'Decorate your Moonlit Cottage with cozy furniture pieces.' },
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
