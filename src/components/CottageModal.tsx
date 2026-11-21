import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CottageDecoration,
  CottageState,
  FurnitureAnimationKind,
  HamletResident,
  HouseRoomId,
  PlayerLook,
} from '../game/engine';
import { drawMochi } from '../game/characterRenderer';
import { audio } from '../game/audio';
import { WeatherConfig } from '../game/constants';

type TabKey = HouseRoomId | 'hamlet';

interface FurnitureCatalogItem {
  id: string;
  name: string;
  icon: string;
  cost: number;
  room: HouseRoomId;
  note: string;
}

interface CottageModalProps {
  cottage: CottageState;
  hamletResidents: HamletResident[];
  playerLook: PlayerLook;
  activeWeather: WeatherConfig;
  fishLog: Record<string, number>;
  stamina: number;
  mana: number;
  coins: number;
  onUpdateCottage: (updated: Partial<CottageState>) => void;
  onSpendCoins: (amount: number, reason: string) => boolean;
  onEarnCoins: (amount: number, reason: string) => void;
  onRestRestore: () => void;
  onRestoreVitals: (staminaDelta: number, manaDelta: number, message: string) => void;
  onInviteToHamlet: (npcName: string) => void;
  onOpenSongWeaver: () => void;
  onOpenWardrobe: () => void;
  onPlayMusicBox: () => void;
  onStepOutside?: () => void;
  onClose: () => void;
}

const ROOM_META: Record<
  TabKey,
  { label: string; shortLabel: string; icon: string; subtitle: string; roleTitle: string }
> = {
  living: {
    label: 'Living Room',
    shortLabel: 'Living Room',
    icon: '🛋️',
    subtitle: 'Brick hearth, weather picture window & music box parlor',
    roleTitle: 'Hearth & Parlor',
  },
  kitchen: {
    label: 'Kitchen & Tea Bar',
    shortLabel: 'Kitchen',
    icon: '🍳',
    subtitle: 'Cloud pastry oven, copper kettle & cold-mist icebox',
    roleTitle: 'Bakery & Tea Bar',
  },
  bedroom: {
    label: 'Bedroom',
    shortLabel: 'Bedroom',
    icon: '🛏️',
    subtitle: 'Patchwork four-poster bed, bedside lamp & carved wardrobe',
    roleTitle: 'Rest & Dressing',
  },
  study: {
    label: 'Study & Studio',
    shortLabel: 'Study',
    icon: '📚',
    subtitle: 'Archipelago shelves, skylight telescope & Song Weaver desk',
    roleTitle: 'Lore & Composition',
  },
  conservatory: {
    label: 'Sunroom',
    shortLabel: 'Sunroom',
    icon: '🌿',
    subtitle: 'Glass-arched botanical greenhouse & sunlit flower benches',
    roleTitle: 'Botanical Conservatory',
  },
  bath: {
    label: 'Bath & Reef',
    shortLabel: 'Bath & Reef',
    icon: '🛁',
    subtitle: 'Steaming cedar soaking tub & panoramic saltwater wall aquarium',
    roleTitle: 'Spa & Coral Reef',
  },
  hamlet: {
    label: 'Mochi Hamlet',
    shortLabel: 'Hamlet',
    icon: '🏘️',
    subtitle: 'Invite island friends to build cottages & shops beside your yard',
    roleTitle: 'Island Neighborhood',
  },
};

const FURNITURE_CATALOG: FurnitureCatalogItem[] = [
  // Living Room
  { id: 'cloud_sofa_mini', name: 'Cloud Cushion', icon: '☁️', cost: 20, room: 'living', note: 'Soft sunlit pouf' },
  { id: 'hearth_rug', name: 'Braided Rug', icon: '🧶', cost: 28, room: 'living', note: 'Warm woven floor mat' },
  { id: 'lava_lantern', name: 'Amber Lantern', icon: '🏮', cost: 35, room: 'living', note: 'Soft evening glow' },
  { id: 'cat_plush', name: 'Mochi Plushie', icon: '🧸', cost: 25, room: 'living', note: 'Cozy armchair friend' },

  // Kitchen
  { id: 'tea_set', name: 'Porcelain Tea Set', icon: '🫖', cost: 30, room: 'kitchen', note: 'Chamomile steepware' },
  { id: 'croissant_tray', name: 'Pastry Stand', icon: '🥐', cost: 24, room: 'kitchen', note: 'Fresh glazed rolls' },
  { id: 'herb_rack', name: 'Kitchen Herb Jar', icon: '🫙', cost: 18, room: 'kitchen', note: 'Mint & cinnamon' },
  { id: 'berry_bowl', name: 'Berry Basket', icon: '🍓', cost: 22, room: 'kitchen', note: 'Sweet morning berries' },

  // Bedroom
  { id: 'dream_catcher', name: 'Moon Mobile', icon: '🌙', cost: 32, room: 'bedroom', note: 'Gentle crescent charm' },
  { id: 'silk_pillow', name: 'Cloud Pillows', icon: '🛏️', cost: 26, room: 'bedroom', note: 'Down-feather cushions' },
  { id: 'vanity_mirror', name: 'Pearl Mirror', icon: '🪞', cost: 40, room: 'bedroom', note: 'Ribbon-framed vanity' },
  { id: 'flower_vase', name: 'Bedside Bouquet', icon: '🌷', cost: 18, room: 'bedroom', note: 'Fresh cut tulips' },

  // Study
  { id: 'inkwell_shelf', name: 'Oak Bookshelf', icon: '📚', cost: 45, room: 'study', note: 'Bound island atlases' },
  { id: 'brass_globe', name: 'Crystal Globe', icon: '🔮', cost: 50, room: 'study', note: 'Maps starlight currents' },
  { id: 'quill_desk', name: 'Wax Seal Desk', icon: '🕯️', cost: 30, room: 'study', note: 'Warm reading taper' },
  { id: 'violin_stand', name: 'Breeze Lute', icon: '🎻', cost: 55, room: 'study', note: 'Tuned for harmonies' },

  // Conservatory
  { id: 'blossom_pot', name: 'Cherry Bonsai', icon: '🌸', cost: 25, room: 'conservatory', note: 'Blooms year-round' },
  { id: 'hanging_fern', name: 'Macramé Fern', icon: '🪴', cost: 22, room: 'conservatory', note: 'Trails morning dew' },
  { id: 'sun_chime', name: 'Sun Prism Chime', icon: '🎐', cost: 32, room: 'conservatory', note: 'Rings in glasshouse breeze' },
  { id: 'honey_hive', name: 'Glass Terrarium', icon: '🫧', cost: 38, room: 'conservatory', note: 'Moss & firefly dome' },

  // Bath & Reef
  { id: 'scented_candles', name: 'Lavender Candles', icon: '🕯️', cost: 20, room: 'bath', note: 'Calming cedar scent' },
  { id: 'shell_basket', name: 'Pearl Shell Tray', icon: '🐚', cost: 26, room: 'bath', note: 'Collected cove shells' },
  { id: 'ducky_friend', name: 'Bath Toy Duck', icon: '🐤', cost: 15, room: 'bath', note: 'Floats in warm bubbles' },
  { id: 'coral_fan', name: 'Coral Branch Art', icon: '🪸', cost: 34, room: 'bath', note: 'Pink reef sculpture' },
];

interface FurnitureInteractionSpec {
  animation: FurnitureAnimationKind;
  chime?: boolean;
  lines: string[];
}

const FURNITURE_INTERACTIONS: Record<string, FurnitureInteractionSpec> = {
  'Porcelain Tea Set': {
    animation: 'steam',
    chime: true,
    lines: [
      'A curl of warm chamomile & starlight steam rises gently from the spout.',
      'The porcelain lid clinks softly — fresh honey-clover tea is ready to sip!',
      'Swirling amber tea reflects the kitchen lanterns like a miniature sunset.',
    ],
  },
  'Cloud Cushion': {
    animation: 'bounce',
    lines: [
      'Fluff-poof! Soft as a summer cloud drifted straight from Cirrus Kingdom.',
      'You squish a corner of the cushion and it springs back with a tiny golden puff.',
    ],
  },
  'Braided Rug': {
    animation: 'sparkle',
    lines: [
      'Warm wool loops hug your paws like an old meadow lullaby.',
      'Sunlight catches tiny golden threads woven along the braided border.',
    ],
  },
  'Starry Rug': {
    animation: 'sparkle',
    chime: true,
    lines: [
      'Little star patterns shimmer softly as you step onto the weave.',
    ],
  },
  'Amber Lantern': {
    animation: 'glow',
    chime: true,
    lines: [
      'Warm honey light spills across the floorboards in cozy golden rings.',
      'Tiny luminous motes dance happily around the painted paper shade.',
    ],
  },
  'Lava Lamp': {
    animation: 'glow',
    lines: [
      'Rosy wax bubbles drift lazily upward inside the warm glass spire.',
    ],
  },
  'Mochi Plushie': {
    animation: 'heart',
    lines: [
      'Squeak-purr! Mochi Plushie gives you an extra-warm embroidered paw hug.',
      'Its round stitched cheeks look proud to keep the living room cozy.',
    ],
  },
  'Pastry Stand': {
    animation: 'steam',
    lines: [
      'Warm cinnamon & flaky butter aroma curls off the freshly glazed croissants!',
      'Pip would definitely approve — not a single crumb wasted.',
    ],
  },
  'Kitchen Herb Jar': {
    animation: 'petals',
    lines: [
      'Pop goes the cork! Crisp mint leaves and sweet wild thyme scent the air.',
    ],
  },
  'Berry Basket': {
    animation: 'bounce',
    lines: [
      'Plump ruby strawberries from Lantern Isle — still cool with morning dew!',
    ],
  },
  'Moon Mobile': {
    animation: 'notes',
    chime: true,
    lines: [
      'Little silver crescents spin lazily, humming a sleepy bedtime chime.',
      'Soft starlight glints off each dangling moon charm above the bed.',
    ],
  },
  'Cloud Pillows': {
    animation: 'bounce',
    lines: [
      'Puffed high with eiderdown feathers — practically begging for an afternoon snooze.',
    ],
  },
  'Pearl Mirror': {
    animation: 'sparkle',
    chime: true,
    lines: [
      'You strike a cheerful whiskered pose in the mother-of-pearl frame!',
    ],
  },
  'Bedside Bouquet': {
    animation: 'petals',
    lines: [
      'Fresh pastel tulip petals unfurl gently in the warm bedroom breeze.',
    ],
  },
  'Oak Bookshelf': {
    animation: 'sparkle',
    lines: [
      'You open "Songs of the Lantern Roots" — a pressed four-leaf clover flutters out!',
      'Every spine smells faintly of cedar wood and rainy-day tea.',
    ],
  },
  'Crystal Globe': {
    animation: 'glow',
    chime: true,
    lines: [
      'Swirling starlight currents trace sea routes toward Dawn Spire inside the orb.',
      'Tiny constellation sparks blink in rhythm with your heartbeat.',
    ],
  },
  'Wax Seal Desk': {
    animation: 'glow',
    lines: [
      'The beeswax candle flickers warmly beside a stack of stamped island postcards.',
    ],
  },
  'Breeze Lute': {
    animation: 'notes',
    chime: true,
    lines: [
      'A gentle strum sends honeyed pentatonic notes floating around the study!',
    ],
  },
  'Cherry Bonsai': {
    animation: 'petals',
    lines: [
      'Delicate pink blossoms drift slowly from the twisted branches like snow.',
      'Even indoors, Lantern Isle springs bloom all year round on this sunny shelf.',
    ],
  },
  'Macramé Fern': {
    animation: 'petals',
    lines: [
      'Emerald fronds sway softly in the sunlit greenhouse draft.',
    ],
  },
  'Sun Prism Chime': {
    animation: 'notes',
    chime: true,
    lines: [
      'Crystal chimes tinkle merrily, painting tiny rainbows across the flagstones!',
    ],
  },
  'Glass Terrarium': {
    animation: 'glow',
    lines: [
      'Two sleepy moss fireflies blink a golden hello beneath the tiny fern dome!',
    ],
  },
  'Lavender Candles': {
    animation: 'glow',
    lines: [
      'Soothing purple lavender ribbons drift peacefully across the warm bathhouse.',
    ],
  },
  'Pearl Shell Tray': {
    animation: 'bubbles',
    chime: true,
    lines: [
      'Hold a spiral shell to your ear — Pearl Reef’s chorus still echoes softly inside.',
    ],
  },
  'Bath Toy Duck': {
    animation: 'bubbles',
    lines: [
      'Squeak-splash! Ducky hops happily through an imaginary cloud of soap suds.',
    ],
  },
  'Coral Branch Art': {
    animation: 'bubbles',
    lines: [
      'Rose-pink coral shimmers with pearly droplets like sunset at Tidepool Atoll.',
    ],
  },
};

function getFurnitureInteraction(name: string): FurnitureInteractionSpec {
  return (
    FURNITURE_INTERACTIONS[name] || {
      animation: 'sparkle',
      lines: [
        `You tidy and admire your ${name} — it makes this room feel extra warm and lived-in.`,
      ],
    }
  );
}

const SEED_TYPES = [
  { id: 'daisy', name: 'Sunny Daisy', icon: '🌼', coinYield: 8, desc: 'Cheerful sunlit petals' },
  { id: 'sky_seed', name: 'Cirrus Sky Flower', icon: '🩵', coinYield: 12, desc: 'Soft cloud-blue blooms' },
  { id: 'glow_spore', name: 'Glowcap Lantern', icon: '🍄', coinYield: 14, desc: 'Bioluminescent cap' },
  { id: 'ember_blossom', name: 'Ember Rose', icon: '🌹', coinYield: 16, desc: 'Warm ruby hearth petals' },
];

const STARGAZE_READINGS = [
  'The Lantern Constellation tilts east — lucky gusts carry drifted bottle notes toward Pearl Reef.',
  'The Silver Harp aligns over Cirrus Castle, boosting musical inspiration across Mochi Hamlet.',
  'Dewdrop Crescent glimmers brightly; newly watered blooms in your Sunroom will flourish tonight.',
  'Comet Whisker arcs past Aurora Reach, promising joyful reunions with island friends.',
];

/** Small live canvas inside each room so Mochi is visibly relaxing in the house */
const RoomMochiSprite: React.FC<{ playerLook: PlayerLook; room: HouseRoomId }> = ({
  playerLook,
  room,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let raf = 0;
    const render = (now: number) => {
      const c = canvasRef.current;
      if (c) {
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, c.width, c.height);
          const t = now * 0.001;
          const bob = Math.sin(t * 2.6) * 2.2;
          const blink = (t % 3.8) < 0.14;
          const facing = room === 'kitchen' || room === 'study' ? -1 : 1;
          drawMochi(ctx, 48, 58, 1.55, bob, facing, blink, playerLook, false, t);
        }
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [playerLook, room]);

  return (
    <canvas
      ref={canvasRef}
      width={96}
      height={84}
      className="pointer-events-none select-none drop-shadow-sm"
      title={`${playerLook.name || 'Mochi'} relaxing in the ${ROOM_META[room].label}`}
    />
  );
};

export const CottageModal: React.FC<CottageModalProps> = ({
  cottage,
  hamletResidents,
  playerLook,
  activeWeather,
  fishLog,
  stamina,
  mana,
  coins,
  onUpdateCottage,
  onSpendCoins,
  onEarnCoins,
  onRestRestore,
  onRestoreVitals,
  onInviteToHamlet,
  onOpenSongWeaver,
  onOpenWardrobe,
  onPlayMusicBox,
  onStepOutside,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('living');
  const [feedback, setFeedback] = useState<string>('');
  const [isArrangeMode, setIsArrangeMode] = useState(false);
  const [movingDecoId, setMovingDecoId] = useState<string | null>(null);
  const [activeEffect, setActiveEffect] = useState<{
    decoId: string;
    kind: FurnitureAnimationKind;
    nonce: number;
  } | null>(null);
  const [furnitureDialogue, setFurnitureDialogue] = useState<{
    decoId: string;
    name: string;
    icon: string;
    line: string;
    count: number;
    x: number;
    y: number;
  } | null>(null);
  const [stargazeNote, setStargazeNote] = useState<string | null>(null);
  const [showAllFurniture, setShowAllFurniture] = useState(false);

  const fireplaceLit = cottage.fireplaceLit !== false;
  const lampOn = cottage.lampOn !== false;
  const tubFilled = cottage.tubFilled !== false;
  const ovenWarm = Boolean(cottage.ovenWarm);

  const showRoomFeedback = (msg: string) => {
    setFeedback(msg);
  };

  useEffect(() => {
    if (!feedback) return;
    const id = window.setTimeout(() => setFeedback(''), 3200);
    return () => window.clearTimeout(id);
  }, [feedback]);

  useEffect(() => {
    if (!activeEffect) return;
    const id = window.setTimeout(() => setActiveEffect(null), 2600);
    return () => window.clearTimeout(id);
  }, [activeEffect]);

  useEffect(() => {
    if (!furnitureDialogue) return;
    const id = window.setTimeout(() => setFurnitureDialogue(null), 4800);
    return () => window.clearTimeout(id);
  }, [furnitureDialogue]);

  const activeRoomId: HouseRoomId = activeTab === 'hamlet' ? 'living' : activeTab;

  // Decorations placed in current room (legacy items without room default to 'living')
  const roomDecorations = useMemo(() => {
    return cottage.decorationsPlaced.filter((d) => (d.room || 'living') === activeRoomId);
  }, [cottage.decorationsPlaced, activeRoomId]);

  const catalogList = useMemo(() => {
    if (showAllFurniture) return FURNITURE_CATALOG;
    return FURNITURE_CATALOG.filter((f) => f.room === activeRoomId);
  }, [activeRoomId, showAllFurniture]);

  // Combine caught fish with starter cottage reef fish for the panoramic aquarium
  const aquariumRoster = useMemo(() => {
    const caughtEntries = Object.entries(fishLog).filter(([, count]) => count > 0);
    const starter = cottage.aquariumFish.filter((name) => !fishLog[name]);
    return [
      ...caughtEntries.map(([name, count]) => ({ name, count, caught: true })),
      ...starter.map((name) => ({ name, count: 1, caught: false })),
    ];
  }, [fishLog, cottage.aquariumFish]);

  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!movingDecoId || activeTab === 'hamlet') {
      if (furnitureDialogue) setFurnitureDialogue(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = Math.max(10, Math.min(90, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const yPct = Math.max(22, Math.min(86, Math.round(((e.clientY - rect.top) / rect.height) * 100)));
    onUpdateCottage({
      decorationsPlaced: cottage.decorationsPlaced.map((d) =>
        d.id === movingDecoId ? { ...d, x: xPct, y: yPct } : d
      ),
    });
    setMovingDecoId(null);
    audio.pop();
    showRoomFeedback('Moved furniture into its cozy new spot!');
  };

  const handleInteractDecoration = (deco: CottageDecoration) => {
    const spec = getFurnitureInteraction(deco.name);
    const nextCount = (deco.interactionCount || 0) + 1;
    const lineIdx = (nextCount - 1) % spec.lines.length;
    const now = Date.now();

    onUpdateCottage({
      decorationsPlaced: cottage.decorationsPlaced.map((d) =>
        d.id === deco.id ? { ...d, lastInteractedAt: now, interactionCount: nextCount } : d
      ),
      lastInteractedFurnitureId: deco.id,
      furnitureInteractCount: (cottage.furnitureInteractCount || 0) + 1,
    });

    if (spec.chime) {
      audio.chime();
    } else {
      audio.pop();
    }

    setActiveEffect({ decoId: deco.id, kind: spec.animation, nonce: now });
    setFurnitureDialogue({
      decoId: deco.id,
      name: deco.name,
      icon: deco.icon,
      line: spec.lines[lineIdx],
      count: nextCount,
      x: deco.x,
      y: deco.y,
    });
  };

  const handleAddDecoration = (item: FurnitureCatalogItem) => {
    if (!onSpendCoins(item.cost, `Crafted ${item.name}`)) return;
    const newDeco: CottageDecoration = {
      id: `deco-${Date.now()}-${Math.floor(Math.random() * 999)}`,
      x: 18 + Math.round(Math.random() * 64),
      y: 48 + Math.round(Math.random() * 34),
      name: item.name,
      icon: item.icon,
      room: activeRoomId,
      interactionCount: 0,
    };
    onUpdateCottage({
      decorationsPlaced: [...cottage.decorationsPlaced, newDeco],
    });
    audio.chime();
    showRoomFeedback(`Placed ${item.name} in the ${ROOM_META[activeRoomId].label}! Click it to try it out.`);
  };

  const handleRemoveDecoration = (id: string, name: string) => {
    onUpdateCottage({
      decorationsPlaced: cottage.decorationsPlaced.filter((d) => d.id !== id),
    });
    if (movingDecoId === id) setMovingDecoId(null);
    if (furnitureDialogue?.decoId === id) setFurnitureDialogue(null);
    audio.pop();
    showRoomFeedback(`Tidied away ${name} into storage.`);
  };

  const handlePlantSeed = (seed: (typeof SEED_TYPES)[number]) => {
    if (cottage.gardenPlots.length >= 6) {
      showRoomFeedback('All 6 greenhouse planter boxes are full! Harvest a mature bloom first.');
      return;
    }
    const newPlot = { seedType: seed.name, stage: 1, plantedAt: Date.now() };
    onUpdateCottage({
      gardenPlots: [...cottage.gardenPlots, newPlot],
    });
    audio.pop();
    showRoomFeedback(`Planted ${seed.name} in a warm terracotta box! Water it to help it bloom.`);
  };

  const handleWaterAllPlots = () => {
    if (cottage.gardenPlots.length === 0) {
      showRoomFeedback('Plant a seed packet below first so the watering can has sprouts to mist!');
      return;
    }
    onUpdateCottage({
      gardenPlots: cottage.gardenPlots.map((p) => ({
        ...p,
        stage: Math.min(3, (p.stage || 1) + 1),
      })),
    });
    audio.chime();
    showRoomFeedback('Misted every planter with sun-warmed spring water! Blooms grew taller.');
  };

  const handleHarvestPlot = (index: number, seedType: string) => {
    const matched = SEED_TYPES.find((s) => s.name === seedType || s.id === seedType);
    const reward = matched?.coinYield ?? 10;
    onUpdateCottage({
      gardenPlots: cottage.gardenPlots.filter((_, idx) => idx !== index),
    });
    onEarnCoins(reward, `Harvested ${matched?.name ?? seedType}`);
    showRoomFeedback(`Harvested radiant ${matched?.name ?? seedType} for +${reward} Coins!`);
  };

  const renderWeatherSky = () => {
    const wid = activeWeather.id;
    const isNight = wid === 'stardust' || wid === 'aurora';
    const isRain = wid === 'drizzle';
    const isSnow = wid === 'snowy';
    const isMuffin = wid === 'muffin_rain';
    return (
      <g>
        <rect
          x="332"
          y="38"
          width="96"
          height="108"
          rx="48"
          fill={isNight ? '#1b2148' : isRain ? '#6985a8' : isSnow ? '#9ec6e4' : '#7ec8f8'}
          stroke="#6f4b3e"
          strokeWidth="5"
        />
        {isNight && (
          <>
            <circle cx="362" cy="70" r="10" fill="#ffe68c" />
            <circle cx="366" cy="67" r="8" fill="#1b2148" />
            <circle cx="395" cy="64" r="2" fill="#fff9c4" />
            <circle cx="408" cy="82" r="1.8" fill="#fff9c4" />
            <circle cx="352" cy="95" r="1.6" fill="#fff9c4" />
          </>
        )}
        {!isNight && !isRain && (
          <>
            <circle cx="392" cy="72" r="13" fill="#ffd95a" opacity="0.95" />
            <ellipse cx="360" cy="95" rx="16" ry="7" fill="#ffffff" opacity="0.88" />
            <ellipse cx="398" cy="108" rx="14" ry="6" fill="#ffffff" opacity="0.8" />
          </>
        )}
        {isRain && (
          <g stroke="#d8f0ff" strokeWidth="2" strokeLinecap="round">
            <line x1="355" y1="68" x2="351" y2="82" />
            <line x1="380" y1="62" x2="376" y2="76" />
            <line x1="402" y1="74" x2="398" y2="88" />
            <line x1="366" y1="92" x2="362" y2="106" />
          </g>
        )}
        {isSnow && (
          <g fill="#ffffff">
            <circle cx="356" cy="72" r="2.5" />
            <circle cx="384" cy="66" r="2.2" />
            <circle cx="403" cy="85" r="2.6" />
            <circle cx="368" cy="102" r="2.1" />
          </g>
        )}
        {isMuffin && (
          <g fontSize="14">
            <text x="348" y="82">🧁</text>
            <text x="388" y="96">🥐</text>
          </g>
        )}
        {/* Window panes & sill */}
        <line x1="380" y1="38" x2="380" y2="146" stroke="#6f4b3e" strokeWidth="3.5" />
        <line x1="332" y1="96" x2="428" y2="96" stroke="#6f4b3e" strokeWidth="3.5" />
        <rect x="322" y="144" width="116" height="9" rx="3" fill="#8b5e49" stroke="#3b2a45" strokeWidth="1.5" />
      </g>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-modal-safe bg-black/60 backdrop-blur-sm pointer-events-auto select-none animate-in fade-in duration-200">
      <div className="w-full max-w-5xl storybook-modal rounded-2xl sm:rounded-3xl p-3 sm:p-5 flex flex-col gap-2.5 sm:gap-3 max-h-[94dvh] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 border-b border-[#f0c7d8]/80 dark:border-[#5b3b6b]/80 pb-2 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#ffe6f0] dark:bg-[#492c56] border border-[#f5bfd6] dark:border-[#6a447c] flex items-center justify-center text-xl sm:text-2xl shrink-0">
              🏡
            </div>
            <div className="min-w-0">
              <h2 className="text-sm xs:text-base sm:text-xl font-black text-[#4a3550] dark:text-[#fdeeff] leading-tight truncate">
                {playerLook.name || 'Mochi'}&apos;s Cozy Home &amp; Hamlet
              </h2>
              <p className="text-[10px] sm:text-xs font-bold text-[#7c5c75] dark:text-[#d5bddb] truncate tabular-nums">
                {ROOM_META[activeTab].roleTitle} · ⚡ {Math.round(stamina)}% · ✨ {Math.round(mana)}% · 🪙 {coins} Coins
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onStepOutside && (
              <button
                onClick={() => {
                  onStepOutside();
                  onClose();
                }}
                title="Step Outside"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[36px] rounded-xl storybook-card hover:border-[#ff7aa8] text-xs font-black text-[#4a3550] dark:text-[#fdeeff] cursor-pointer whitespace-nowrap transition-colors"
              >
                <span>🚪</span>
                <span className="hidden sm:inline">Step Outside</span>
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close house"
              className="w-9 h-9 rounded-full storybook-card hover:bg-[#ff7aa8] hover:text-white text-[#4a3550] dark:text-[#fdeeff] font-black text-sm flex items-center justify-center transition-all cursor-pointer shrink-0"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Single-Line Room Navigation */}
        <div className="flex storybook-well p-1 rounded-xl sm:rounded-2xl gap-1 overflow-x-auto scrollbar-none shrink-0">
          {(Object.keys(ROOM_META) as TabKey[]).map((key) => {
            const meta = ROOM_META[key];
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key);
                  setMovingDecoId(null);
                  setFurnitureDialogue(null);
                  setActiveEffect(null);
                  audio.pop();
                }}
                className={`flex-1 min-w-fit min-h-[38px] py-1.5 px-3 rounded-lg sm:rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 ${
                  active
                    ? 'bg-[#ff7aa8] text-white shadow-xs'
                    : 'text-[#5a425f] dark:text-[#d8c7df] hover:bg-white/60 dark:hover:bg-black/25'
                }`}
              >
                <span>{meta.icon}</span>
                <span>{meta.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Live Feedback Strip */}
        {feedback && (
          <div className="px-3 py-1.5 bg-[#fff2cc] dark:bg-[#493822] border border-[#ffd23f] rounded-xl text-center text-xs font-black text-[#4a3550] dark:text-[#fff2c2] shrink-0 animate-in fade-in">
            {feedback}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
          {activeTab === 'hamlet' ? (
            /* Mochi Hamlet Neighborhood Tab */
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl storybook-card">
                <div>
                  <h3 className="font-black text-sm text-[#4a3550] dark:text-[#fdeeff]">
                    Mochi Hamlet · {hamletResidents.length} Neighbors Settled
                  </h3>
                  <p className="text-xs text-[#6d546e] dark:text-[#ceb7d4]">
                    Invite befriended islanders to build cozy cottages and artisan stalls beside your yard.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { name: 'Pip', shop: 'Pip’s Floating Bakery', icon: '🧁', desc: 'Bakes fresh cloud muffins every morning' },
                  { name: 'Captain Barnacle', shop: 'Driftwood Boatshop', icon: '⛵', desc: 'Tends lanterns and harbor breezes' },
                  { name: 'Fennel', shop: 'Fennel’s Map Stall', icon: '🗺️', desc: 'Drafts enthusiastic treasure charts' },
                  { name: 'Tidbit', shop: 'Tidbit’s Lantern Workshop', icon: '🏮', desc: 'Crafts colorful glowing evening lanterns' },
                  { name: 'Gran Dumpling', shop: 'Soup Kitchen of Remembering', icon: '🍲', desc: 'Simmers warm memory broths' },
                  { name: 'Bellamy', shop: 'Bellamy’s Chime Foundry', icon: '🔔', desc: 'Tunes golden bells for the Hamlet gate' },
                ].map((res) => {
                  const isMovedIn = hamletResidents.some((h) => h.npcName === res.name);
                  return (
                    <div
                      key={res.name}
                      className="p-3.5 storybook-card rounded-2xl flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-11 h-11 rounded-2xl bg-[#fff4f8] dark:bg-[#3a2645] flex items-center justify-center text-2xl shrink-0">
                          {res.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-sm text-[#4a3550] dark:text-[#fdeeff] truncate">{res.name}</p>
                          <p className="text-[11px] text-[#c94a77] dark:text-[#ff9ec0] font-extrabold truncate">{res.shop}</p>
                          <p className="text-[11px] opacity-75 line-clamp-2">{res.desc}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => onInviteToHamlet(res.name)}
                        className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                          isMovedIn
                            ? 'bg-[#5ab870] text-white'
                            : 'bg-[#ff7aa8] hover:brightness-105 text-white shadow-xs'
                        }`}
                      >
                        {isMovedIn ? 'Moved In ✓' : 'Invite'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* 6 Interactive House Rooms */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
              {/* Left Architectural Room Stage */}
              <div className="lg:col-span-7 space-y-2">
                <div
                  onClick={handleStageClick}
                  className={`relative w-full aspect-16/10 min-h-[170px] sm:min-h-[240px] max-h-[38dvh] sm:max-h-none rounded-2xl border-2 border-[#e8bfd1] dark:border-[#5d3d70] overflow-hidden shadow-inner ${
                    movingDecoId ? 'cursor-crosshair ring-2 ring-[#ffd23f]' : ''
                  }`}
                >
                  {/* Bespoke Architectural SVG Interior per Room */}
                  <svg
                    viewBox="0 0 640 400"
                    className="w-full h-full block"
                    preserveAspectRatio="xMidYMid slice"
                  >
                    <defs>
                      <linearGradient id="wallWarm" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fff7ec" />
                        <stop offset="100%" stopColor="#f8e6d8" />
                      </linearGradient>
                      <linearGradient id="wallKitchen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fffaf0" />
                        <stop offset="100%" stopColor="#f5ebd7" />
                      </linearGradient>
                      <linearGradient id="wallBedroom" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={lampOn ? '#f9edf7' : '#2a2240'} />
                        <stop offset="100%" stopColor={lampOn ? '#eddcf2' : '#1e1730'} />
                      </linearGradient>
                      <linearGradient id="wallStudy" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f2e6d8" />
                        <stop offset="100%" stopColor="#e2ceb9" />
                      </linearGradient>
                      <linearGradient id="wallBath" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ebf8fa" />
                        <stop offset="100%" stopColor="#d3edf2" />
                      </linearGradient>
                      <radialGradient id="fireGlow" cx="50%" cy="60%" r="55%">
                        <stop offset="0%" stopColor="rgba(255,190,90,0.48)" />
                        <stop offset="100%" stopColor="rgba(255,190,90,0)" />
                      </radialGradient>
                      <radialGradient id="lampHalo" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(255,220,130,0.48)" />
                        <stop offset="100%" stopColor="rgba(255,220,130,0)" />
                      </radialGradient>
                    </defs>

                    {/* === LIVING ROOM === */}
                    {activeTab === 'living' && (
                      <g>
                        <rect x="0" y="0" width="640" height="265" fill="url(#wallWarm)" />
                        {/* Timber Wainscoting */}
                        <rect x="0" y="205" width="640" height="60" fill="#d9b498" />
                        <line x1="0" y1="205" x2="640" y2="205" stroke="#9b6e55" strokeWidth="4" />
                        {/* Oak Floor Planks */}
                        <rect x="0" y="265" width="640" height="135" fill="#c7956d" />
                        {[292, 322, 355, 385].map((y) => (
                          <line key={y} x1="0" y1={y} x2="640" y2={y} stroke="#a6744f" strokeWidth="2" />
                        ))}

                        {/* Brick Hearth Fireplace (Left) */}
                        <g>
                          <rect x="78" y="45" width="84" height="225" fill="#c47c6a" stroke="#3b2a45" strokeWidth="2.5" />
                          <rect x="52" y="138" width="136" height="132" rx="6" fill="#d18876" stroke="#3b2a45" strokeWidth="2.5" />
                          {/* Mantel shelf */}
                          <rect x="44" y="128" width="152" height="14" rx="4" fill="#7d503c" stroke="#3b2a45" strokeWidth="2" />
                          {/* Mantel items: candle & framed picture */}
                          <rect x="70" y="96" width="32" height="32" rx="4" fill="#fffaf0" stroke="#7d503c" strokeWidth="3" />
                          <circle cx="86" cy="112" r="7" fill="#ff9ebb" />
                          <rect x="135" y="106" width="10" height="22" rx="2" fill="#fff4d6" />
                          <circle cx="140" cy="102" r="4" fill="#ffd23f" />
                          {/* Hearth Opening */}
                          <path d="M 80 270 L 80 205 Q 120 176 160 205 L 160 270 Z" fill="#2c1c28" />
                          {fireplaceLit && (
                            <>
                              <circle cx="120" cy="230" r="95" fill="url(#fireGlow)" />
                              <path d="M 102 260 Q 112 212 122 246 Q 134 205 142 260 Z" fill="#ff7b3b" />
                              <path d="M 110 260 Q 120 225 132 260 Z" fill="#ffd95a" />
                            </>
                          )}
                          {/* Logs */}
                          <rect x="94" y="254" width="52" height="10" rx="5" fill="#633c29" />
                          <rect x="46" y="266" width="148" height="10" rx="3" fill="#b4a79f" stroke="#3b2a45" strokeWidth="1.5" />
                        </g>

                        {/* Weather Picture Window */}
                        {renderWeatherSky()}

                        {/* Braided Hearth Rug */}
                        <ellipse cx="320" cy="332" rx="145" ry="38" fill="#ffe1ec" stroke="#e4789c" strokeWidth="5" />
                        <ellipse cx="320" cy="332" rx="112" ry="26" fill="none" stroke="#ffd23f" strokeWidth="3" strokeDasharray="8 6" />

                        {/* Plush Cloud Sofa */}
                        <g>
                          <rect x="235" y="220" width="175" height="58" rx="18" fill="#ffb8cf" stroke="#3b2a45" strokeWidth="2" />
                          <rect x="225" y="242" width="22" height="44" rx="10" fill="#ff96b9" stroke="#3b2a45" strokeWidth="2" />
                          <rect x="398" y="242" width="22" height="44" rx="10" fill="#ff96b9" stroke="#3b2a45" strokeWidth="2" />
                          <rect x="245" y="254" width="155" height="28" rx="8" fill="#ffdbe8" stroke="#3b2a45" strokeWidth="1.8" />
                          {/* Throw pillow */}
                          <rect x="255" y="232" width="28" height="24" rx="6" fill="#fff29c" stroke="#3b2a45" strokeWidth="1.5" transform="rotate(-8 269 244)" />
                        </g>

                        {/* Music Box Table (Right) */}
                        <g>
                          <rect x="478" y="222" width="84" height="54" rx="6" fill="#8b5e49" stroke="#3b2a45" strokeWidth="2" />
                          <rect x="472" y="216" width="96" height="10" rx="3" fill="#a8745a" stroke="#3b2a45" strokeWidth="1.8" />
                          {/* Carousel Music Box */}
                          <rect x="502" y="182" width="38" height="34" rx="6" fill="#ffd2e2" stroke="#3b2a45" strokeWidth="1.8" />
                          <polygon points="498,184 521,164 544,184" fill="#ff7aa8" stroke="#3b2a45" strokeWidth="1.8" />
                          <circle cx="521" cy="161" r="4" fill="#ffd23f" />
                          <text x="536" y="162" fontSize="14">🎵</text>
                        </g>
                      </g>
                    )}

                    {/* === KITCHEN & TEA BAR === */}
                    {activeTab === 'kitchen' && (
                      <g>
                        <rect x="0" y="0" width="640" height="265" fill="url(#wallKitchen)" />
                        {/* Terracotta Checkered Floor */}
                        <rect x="0" y="265" width="640" height="135" fill="#f3dbc3" />
                        {Array.from({ length: 10 }).map((_, col) =>
                          Array.from({ length: 4 }).map((__, row) =>
                            (col + row) % 2 === 0 ? (
                              <rect
                                key={`${col}-${row}`}
                                x={col * 64}
                                y={265 + row * 34}
                                width={64}
                                height={34}
                                fill="#e2b494"
                              />
                            ) : null
                          )
                        )}

                        {/* Hanging Herb Window & Gingham Curtains */}
                        <rect x="262" y="42" width="116" height="90" rx="8" fill="#9bd8ff" stroke="#7c523c" strokeWidth="4" />
                        <line x1="320" y1="42" x2="320" y2="132" stroke="#7c523c" strokeWidth="3" />
                        <path d="M 262 42 Q 285 75 262 115 Z" fill="#ff8fb8" />
                        <path d="M 378 42 Q 355 75 378 115 Z" fill="#ff8fb8" />

                        {/* Oak Countertop & Upper Shelves */}
                        <rect x="46" y="180" width="360" height="90" rx="6" fill="#fff3e0" stroke="#3b2a45" strokeWidth="2" />
                        <rect x="40" y="172" width="372" height="14" rx="4" fill="#9c684b" stroke="#3b2a45" strokeWidth="2" />

                        {/* Cloud Pastry Oven */}
                        <rect x="74" y="176" width="98" height="94" rx="6" fill="#ff9ebb" stroke="#3b2a45" strokeWidth="2.2" />
                        <rect x="90" y="200" width="66" height="44" rx="6" fill={ovenWarm ? '#ffb347' : '#4a3550'} stroke="#3b2a45" strokeWidth="2" />
                        <circle cx="92" cy="188" r="4" fill="#fffaf0" />
                        <circle cx="110" cy="188" r="4" fill="#fffaf0" />
                        <circle cx="148" cy="188" r="5" fill="#ffd23f" />
                        {/* Chimney hood */}
                        <path d="M 68 85 L 178 85 L 160 40 L 86 40 Z" fill="#f7e7eb" stroke="#3b2a45" strokeWidth="2" />

                        {/* Copper Kettle on Stovetop */}
                        <circle cx="242" cy="156" r="18" fill="#d87f52" stroke="#3b2a45" strokeWidth="2" />
                        <path d="M 228 142 Q 242 124 256 142" fill="none" stroke="#3b2a45" strokeWidth="3" />
                        <path d="M 258 152 L 270 144" stroke="#d87f52" strokeWidth="5" strokeLinecap="round" />

                        {/* Cold-Mist Icebox Fridge */}
                        <rect x="458" y="88" width="110" height="182" rx="14" fill="#b7e9eb" stroke="#3b2a45" strokeWidth="2.5" />
                        <line x1="458" y1="158" x2="568" y2="158" stroke="#3b2a45" strokeWidth="2" />
                        <rect x="472" y="116" width="6" height="24" rx="3" fill="#ffffff" />
                        <rect x="472" y="176" width="6" height="36" rx="3" fill="#ffffff" />
                        <circle cx="514" cy="120" r="9" fill="#ff7aa8" opacity="0.85" />

                        {/* Breakfast Table */}
                        <rect x="242" y="294" width="160" height="16" rx="5" fill="#b87e58" stroke="#3b2a45" strokeWidth="2" />
                        <rect x="262" y="310" width="12" height="58" fill="#8d5b3e" />
                        <rect x="370" y="310" width="12" height="58" fill="#8d5b3e" />
                        <text x="308" y="289" fontSize="22">🥐</text>
                        <text x="342" y="289" fontSize="20">🍵</text>
                      </g>
                    )}

                    {/* === BEDROOM === */}
                    {activeTab === 'bedroom' && (
                      <g>
                        <rect x="0" y="0" width="640" height="265" fill="url(#wallBedroom)" />
                        <rect x="0" y="265" width="640" height="135" fill={lampOn ? '#d4aa89' : '#6c5145'} />
                        {/* Round Moon Skylight Window */}
                        <circle cx="515" cy="95" r="44" fill="#1b2148" stroke="#7c5646" strokeWidth="5" />
                        <circle cx="505" cy="88" r="13" fill="#ffe68c" />
                        <circle cx="510" cy="84" r="10" fill="#1b2148" />
                        <circle cx="536" cy="80" r="2.2" fill="#fff9c4" />
                        <circle cx="530" cy="112" r="2" fill="#fff9c4" />

                        {/* Carved Wardrobe (Left) */}
                        <rect x="52" y="96" width="106" height="174" rx="8" fill="#8f5c47" stroke="#3b2a45" strokeWidth="2.5" />
                        <rect x="64" y="112" width="38" height="130" rx="4" fill="#a8725a" stroke="#3b2a45" strokeWidth="1.5" />
                        <rect x="108" y="112" width="38" height="130" rx="4" fill="#a8725a" stroke="#3b2a45" strokeWidth="1.5" />
                        <circle cx="96" cy="176" r="3" fill="#ffd23f" />
                        <circle cx="114" cy="176" r="3" fill="#ffd23f" />

                        {/* Four-Poster Patchwork Bed (Center) */}
                        <rect x="206" y="118" width="12" height="154" rx="4" fill="#7a4c39" stroke="#3b2a45" strokeWidth="2" />
                        <rect x="422" y="118" width="12" height="154" rx="4" fill="#7a4c39" stroke="#3b2a45" strokeWidth="2" />
                        {/* Draped Canopy Header */}
                        <path d="M 206 122 Q 320 144 434 122 L 434 108 L 206 108 Z" fill="#ffb8d0" stroke="#3b2a45" strokeWidth="2" />
                        {/* Headboard & Quilt */}
                        <rect x="218" y="176" width="204" height="58" rx="10" fill="#a8745a" stroke="#3b2a45" strokeWidth="2" />
                        <rect x="228" y="192" width="60" height="32" rx="10" fill="#ffffff" stroke="#d8bfd8" strokeWidth="2" />
                        <rect x="352" y="192" width="60" height="32" rx="10" fill="#ffffff" stroke="#d8bfd8" strokeWidth="2" />
                        <rect x="214" y="220" width="212" height="58" rx="10" fill="#ff9ec0" stroke="#3b2a45" strokeWidth="2" />
                        <rect x="214" y="238" width="212" height="40" rx="8" fill="#ffe68c" opacity="0.88" />

                        {/* Bedside Nightstand & Amber Lamp */}
                        <rect x="458" y="218" width="66" height="54" rx="6" fill="#9c684b" stroke="#3b2a45" strokeWidth="2" />
                        {lampOn && <circle cx="491" cy="172" r="88" fill="url(#lampHalo)" />}
                        <rect x="486" y="196" width="10" height="22" fill="#d9a441" />
                        <polygon points="470,196 512,196 502,166 480,166" fill={lampOn ? '#ffe484' : '#9ca3af'} stroke="#3b2a45" strokeWidth="2" />

                        {/* Soft Fluffy Rug */}
                        <ellipse cx="320" cy="332" rx="135" ry="34" fill="#f3d9ff" stroke="#c39ae6" strokeWidth="4" />
                      </g>
                    )}

                    {/* === STUDY & STUDIO === */}
                    {activeTab === 'study' && (
                      <g>
                        <rect x="0" y="0" width="640" height="265" fill="url(#wallStudy)" />
                        <rect x="0" y="265" width="640" height="135" fill="#9f6d49" />
                        {/* Twin Archipelago Bookshelves */}
                        <rect x="48" y="54" width="142" height="214" rx="6" fill="#6f4733" stroke="#3b2a45" strokeWidth="2.5" />
                        {[102, 152, 202].map((sy, idx) => (
                          <g key={sy}>
                            <rect x="56" y={sy} width="126" height="8" fill="#8f5d44" />
                            {['#ff7aa8', '#52d6c6', '#ffd23f', '#9a82f6', '#7bd88f', '#f49b6c'].map((col, b) => (
                              <rect
                                key={b}
                                x={64 + b * 19}
                                y={sy - 30 - ((b + idx) % 3) * 4}
                                width="14"
                                height={30 + ((b + idx) % 3) * 4}
                                rx="2"
                                fill={col}
                                stroke="#3b2a45"
                                strokeWidth="1.2"
                              />
                            ))}
                          </g>
                        ))}

                        {/* Skylight Balcony Window + Brass Telescope */}
                        <rect x="424" y="42" width="152" height="142" rx="14" fill="#1e244b" stroke="#7c523c" strokeWidth="5" />
                        <circle cx="485" cy="96" r="2.2" fill="#ffe98f" />
                        <circle cx="534" cy="78" r="2.5" fill="#ffe98f" />
                        <circle cx="512" cy="128" r="1.8" fill="#ffffff" />
                        <circle cx="458" cy="122" r="1.8" fill="#ffffff" />
                        {/* Brass Telescope on Tripod */}
                        <line x1="485" y1="210" x2="462" y2="275" stroke="#5b3d2e" strokeWidth="4" />
                        <line x1="485" y1="210" x2="508" y2="275" stroke="#5b3d2e" strokeWidth="4" />
                        <rect x="448" y="180" width="76" height="16" rx="5" fill="#e6b647" stroke="#3b2a45" strokeWidth="2" transform="rotate(-24 485 188)" />

                        {/* Oak Writing Desk & Gramophone */}
                        <rect x="234" y="198" width="168" height="72" rx="6" fill="#8c5a3f" stroke="#3b2a45" strokeWidth="2.2" />
                        <rect x="226" y="190" width="184" height="14" rx="4" fill="#aa7252" stroke="#3b2a45" strokeWidth="2" />
                        {/* Gramophone Horn */}
                        <rect x="256" y="158" width="38" height="32" rx="4" fill="#b47546" stroke="#3b2a45" strokeWidth="1.8" />
                        <path d="M 275 162 Q 288 124 316 122 L 310 156 Z" fill="#ffd23f" stroke="#3b2a45" strokeWidth="1.8" />
                        {/* Crystal Globe */}
                        <circle cx="356" cy="166" r="16" fill="#7ad8ff" stroke="#3b2a45" strokeWidth="1.8" />
                        <rect x="346" y="182" width="20" height="8" rx="2" fill="#d9a441" />
                      </g>
                    )}

                    {/* === SUNROOM CONSERVATORY === */}
                    {activeTab === 'conservatory' && (
                      <g>
                        {/* Sunlit Meadow Backdrop through Greenhouse Glass */}
                        <rect x="0" y="0" width="640" height="265" fill="#bfe9ff" />
                        <path d="M 0 190 Q 160 150 320 185 T 640 175 L 640 265 L 0 265 Z" fill="#8de097" />
                        <circle cx="520" cy="64" r="32" fill="#ffe47a" opacity="0.92" />
                        {/* Greenhouse Iron Mullion Arches */}
                        {[128, 256, 384, 512].map((gx) => (
                          <line key={gx} x1={gx} y1="0" x2={gx} y2="265" stroke="#538574" strokeWidth="4" />
                        ))}
                        <line x1="0" y1="128" x2="640" y2="128" stroke="#538574" strokeWidth="3.5" />
                        {/* Flagstone Floor */}
                        <rect x="0" y="265" width="640" height="135" fill="#c9c2b8" />
                        <ellipse cx="320" cy="340" rx="180" ry="36" fill="#9fdba8" opacity="0.45" />
                        {/* Cedar Potting Bench */}
                        <rect x="85" y="188" width="470" height="14" rx="4" fill="#9e6d48" stroke="#3b2a45" strokeWidth="2" />
                        <rect x="115" y="202" width="14" height="68" fill="#7d5234" />
                        <rect x="510" y="202" width="14" height="68" fill="#7d5234" />
                        {/* Hanging Solar Lamp & Macramé Fern */}
                        <line x1="320" y1="0" x2="320" y2="54" stroke="#538574" strokeWidth="3" />
                        <circle cx="320" cy="62" r="14" fill="#ffe785" stroke="#3b2a45" strokeWidth="2" />
                        <circle cx="185" cy="75" r="24" fill="#50b36a" stroke="#3b2a45" strokeWidth="1.5" />
                      </g>
                    )}

                    {/* === BATH & CORAL AQUARIUM === */}
                    {activeTab === 'bath' && (
                      <g>
                        <rect x="0" y="0" width="640" height="265" fill="url(#wallBath)" />
                        <rect x="0" y="265" width="640" height="135" fill="#d9c6b4" />
                        {/* Built-in Panoramic Saltwater Wall Aquarium */}
                        <rect x="224" y="42" width="356" height="162" rx="18" fill="#136a94" stroke="#7c523c" strokeWidth="6" />
                        <rect x="234" y="52" width="336" height="142" rx="12" fill="#1f8bbd" />
                        {/* Coral & Kelp silhouettes inside tank */}
                        <path d="M 255 194 Q 248 156 264 130 Q 272 156 268 194 Z" fill="#2cc295" />
                        <path d="M 526 194 Q 515 148 532 118 Q 542 152 536 194 Z" fill="#ff7aa8" />
                        <circle cx="320" cy="144" r="4" fill="#baf2ff" opacity="0.7" />
                        <circle cx="445" cy="110" r="3" fill="#baf2ff" opacity="0.7" />
                        <circle cx="390" cy="90" r="5" fill="#baf2ff" opacity="0.6" />

                        {/* Steaming Cedar Soaking Tub */}
                        <ellipse cx="145" cy="240" rx="88" ry="26" fill={tubFilled ? '#7ad8e8' : '#b79777'} stroke="#3b2a45" strokeWidth="2.5" />
                        <path d="M 57 240 L 66 305 Q 145 322 224 305 L 233 240 Z" fill="#b77f54" stroke="#3b2a45" strokeWidth="2.5" />
                        <line x1="62" y1="268" x2="228" y2="268" stroke="#6c4832" strokeWidth="4" />
                        {tubFilled && (
                          <g stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.8">
                            <path d="M 110 218 Q 102 200 112 184" fill="none" />
                            <path d="M 145 214 Q 154 195 144 176" fill="none" />
                            <path d="M 182 220 Q 174 202 184 185" fill="none" />
                          </g>
                        )}
                      </g>
                    )}
                  </svg>

                  {/* Dynamic Interactive Room Overlays (Live Aquarium Fish, Conservatory Plots, Weather Pill, Mochi Avatar, Custom Furniture) */}

                  {/* Sunroom Conservatory Plant Plots rendered interactively on the Cedar Bench */}
                  {activeTab === 'conservatory' && (
                    <div className="absolute left-[14%] right-[14%] top-[33%] flex items-end justify-around gap-1 pointer-events-auto">
                      {cottage.gardenPlots.slice(0, 6).map((plot, idx) => {
                        const seedInfo = SEED_TYPES.find((s) => s.name === plot.seedType || s.id === plot.seedType);
                        const stage = plot.stage || 1;
                        const stageIcon = stage >= 3 ? (seedInfo?.icon || '🌸') : stage === 2 ? '🌿' : '🌱';
                        return (
                          <button
                            key={`${plot.seedType}-${idx}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (stage >= 3) {
                                handleHarvestPlot(idx, plot.seedType);
                              } else {
                                onUpdateCottage({
                                  gardenPlots: cottage.gardenPlots.map((p, pIdx) =>
                                    pIdx === idx ? { ...p, stage: Math.min(3, stage + 1) } : p
                                  ),
                                });
                                audio.chime();
                                showRoomFeedback(`Watered ${plot.seedType}!`);
                              }
                            }}
                            title={stage >= 3 ? `Harvest ${plot.seedType} (+${seedInfo?.coinYield ?? 10} coins)` : `Water ${plot.seedType}`}
                            className="group flex flex-col items-center cursor-pointer transition-transform hover:scale-110 active:scale-95"
                          >
                            <span className="text-2xl sm:text-3xl drop-shadow-sm">{stageIcon}</span>
                            <span className="mt-0.5 px-1.5 py-0.5 rounded bg-[#a45c3f] text-[9px] font-black text-white shadow-xs">
                              {stage >= 3 ? 'Harvest' : `Stage ${stage}/3`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Bath Panoramic Aquarium Live Swimming Fish Overlay */}
                  {activeTab === 'bath' && (
                    <div className="absolute left-[37%] right-[11%] top-[14%] bottom-[51%] pointer-events-none overflow-hidden flex flex-wrap items-center justify-around gap-1 p-2">
                      {aquariumRoster.slice(0, 8).map((fish, i) => (
                        <div
                          key={fish.name}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-[#0d4d6d]/65 text-white text-[10px] font-black shadow-xs animate-pulse"
                          style={{ animationDuration: `${2.2 + (i % 4) * 0.6}s` }}
                        >
                          <span>{i % 2 === 0 ? '🐠' : '🐟'}</span>
                          <span className="truncate max-w-[78px]">{fish.name}</span>
                          {fish.caught && <span className="text-[#ffd23f] tabular-nums">×{fish.count}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Player Mochi Hanging Out Inside the Active Room */}
                  <div className="absolute left-[42%] bottom-[6%] pointer-events-none">
                    <RoomMochiSprite playerLook={playerLook} room={activeRoomId} />
                  </div>

                  {/* Placed Room Furniture Hotspots */}
                  {roomDecorations.map((deco) => {
                    const isMovingThis = movingDecoId === deco.id;
                    const effectHere = activeEffect?.decoId === deco.id ? activeEffect : null;
                    return (
                      <div
                        key={deco.id}
                        style={{ left: `${deco.x}%`, top: `${deco.y}%` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isArrangeMode) {
                            setMovingDecoId(isMovingThis ? null : deco.id);
                          } else {
                            handleInteractDecoration(deco);
                          }
                        }}
                        className={`group absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer transition-transform ${
                          isMovingThis
                            ? 'scale-125 ring-2 ring-[#ffd23f] rounded-xl bg-white/80 p-1 z-20'
                            : 'hover:scale-110 z-10'
                        }`}
                        title={
                          isArrangeMode
                            ? `${deco.name} (click to pick up & move)`
                            : `${deco.name} (click to interact)`
                        }
                      >
                        {/* Cosmetic Effect Animation Overlay */}
                        {effectHere && (
                          <div
                            key={effectHere.nonce}
                            className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-16 h-14 flex items-center justify-center overflow-visible"
                          >
                            {effectHere.kind === 'steam' && (
                              <svg viewBox="0 0 64 56" className="w-14 h-12 overflow-visible animate-pulse">
                                <path
                                  d="M22 48 Q14 34 24 22 Q32 12 22 2"
                                  fill="none"
                                  stroke="rgba(255,255,255,0.92)"
                                  strokeWidth="3.5"
                                  strokeLinecap="round"
                                />
                                <path
                                  d="M34 50 Q26 36 36 22 Q44 10 34 0"
                                  fill="none"
                                  stroke="rgba(255,244,214,0.95)"
                                  strokeWidth="3.2"
                                  strokeLinecap="round"
                                />
                                <path
                                  d="M45 47 Q38 35 46 24 Q52 14 44 5"
                                  fill="none"
                                  stroke="rgba(255,255,255,0.85)"
                                  strokeWidth="2.8"
                                  strokeLinecap="round"
                                />
                                <circle cx="28" cy="14" r="2.2" fill="#ffe68c" />
                                <circle cx="42" cy="18" r="1.8" fill="#ffffff" />
                              </svg>
                            )}
                            {effectHere.kind === 'glow' && (
                              <>
                                <span className="absolute inset-0 rounded-full bg-[#ffd23f]/45 blur-md animate-ping" />
                                <span className="relative text-sm animate-bounce">✨</span>
                              </>
                            )}
                            {effectHere.kind === 'heart' && (
                              <div className="flex items-center gap-1 animate-bounce text-sm">
                                <span>💗</span>
                                <span className="-mt-2 text-xs">💕</span>
                              </div>
                            )}
                            {effectHere.kind === 'notes' && (
                              <div className="flex items-center gap-1 animate-bounce text-sm">
                                <span>🎵</span>
                                <span className="-mt-3 text-xs">🎶</span>
                              </div>
                            )}
                            {effectHere.kind === 'petals' && (
                              <div className="flex items-center gap-1 animate-bounce text-sm">
                                <span>🌸</span>
                                <span className="-mt-2 text-xs">🍃</span>
                              </div>
                            )}
                            {effectHere.kind === 'bubbles' && (
                              <div className="flex items-center gap-1 animate-bounce text-sm">
                                <span>🫧</span>
                                <span className="-mt-3 text-xs">💧</span>
                              </div>
                            )}
                            {effectHere.kind === 'sparkle' && (
                              <div className="flex items-center gap-1 animate-pulse text-sm">
                                <span>✨</span>
                                <span className="-mt-2 text-xs">🌟</span>
                              </div>
                            )}
                            {effectHere.kind === 'bounce' && (
                              <span className="text-sm animate-bounce">☁️</span>
                            )}
                          </div>
                        )}

                        <span
                          className={`text-2xl sm:text-3xl drop-shadow-sm transition-transform ${
                            effectHere?.kind === 'bounce' || effectHere?.kind === 'heart'
                              ? 'animate-bounce'
                              : effectHere
                              ? 'scale-115'
                              : ''
                          }`}
                        >
                          {deco.icon}
                        </span>

                        {/* Quick Hover / Touch Arrange Controls (Move / Remove) */}
                        <div
                          className={`absolute -top-2.5 -right-5 flex items-center gap-0.5 transition-opacity ${
                            isArrangeMode
                              ? 'opacity-95'
                              : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                          }`}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsArrangeMode(true);
                              setMovingDecoId(deco.id);
                              setFurnitureDialogue(null);
                            }}
                            aria-label={`Move ${deco.name}`}
                            title="Reposition item"
                            className="w-6 h-6 sm:w-5 sm:h-5 rounded-full bg-[#6d537a] hover:bg-[#4a3550] text-white text-[10px] font-black flex items-center justify-center shadow-xs cursor-pointer"
                          >
                            ✥
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveDecoration(deco.id, deco.name);
                            }}
                            aria-label={`Remove ${deco.name}`}
                            title="Store item"
                            className="w-6 h-6 sm:w-5 sm:h-5 rounded-full bg-[#ff5c8a] hover:brightness-105 text-white text-[10px] font-black flex items-center justify-center shadow-xs cursor-pointer"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Furniture Interaction Storybook Dialogue Pop-up */}
                  {furnitureDialogue && !movingDecoId && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setFurnitureDialogue(null);
                      }}
                      style={{
                        left: `${Math.max(28, Math.min(72, furnitureDialogue.x))}%`,
                        top: furnitureDialogue.y > 46 ? `${Math.max(8, furnitureDialogue.y - 34)}%` : `${Math.min(74, furnitureDialogue.y + 12)}%`,
                      }}
                      className="absolute -translate-x-1/2 z-30 w-52 xs:w-60 sm:w-64 p-2 sm:p-2.5 rounded-2xl bg-[#fffaf4]/95 dark:bg-[#2a1d35]/95 border-2 border-[#f2a8c2] dark:border-[#855296] shadow-lg cursor-pointer animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xl shrink-0">{furnitureDialogue.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-black text-[#4a3550] dark:text-[#fdeeff] leading-tight">
                            {furnitureDialogue.name}
                          </p>
                          <p className="text-[11px] font-semibold text-[#5f4763] dark:text-[#e3d2eb] mt-0.5 leading-snug">
                            {furnitureDialogue.line}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Move Mode Instruction Strip */}
                  {movingDecoId && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-xl bg-[#4a3550]/90 text-white text-[11px] font-black shadow-md pointer-events-none">
                      Tap anywhere in the {ROOM_META[activeRoomId].label} to place item
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <p className="text-[11px] font-bold text-[#7c5c75] dark:text-[#d5bddb] flex-1 min-w-[200px]">
                    {ROOM_META[activeRoomId].subtitle} · {isArrangeMode ? 'Tap an item, then tap a floor spot to move it.' : 'Click placed furniture to interact with it.'}
                  </p>
                  <button
                    onClick={() => {
                      const next = !isArrangeMode;
                      setIsArrangeMode(next);
                      if (!next) setMovingDecoId(null);
                      audio.pop();
                    }}
                    className={`min-h-[32px] px-2.5 py-1 rounded-xl text-[11px] font-black cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                      isArrangeMode
                        ? 'bg-[#ffd23f] text-[#4a3550] shadow-xs'
                        : 'storybook-card hover:border-[#ff7aa8] text-[#4a3550] dark:text-[#fdeeff]'
                    }`}
                  >
                    {isArrangeMode ? '✓ Done Arranging' : '✥ Arrange Room'}
                  </button>
                </div>
              </div>

              {/* Right Room Controls & Decor Catalog */}
              <div className="lg:col-span-5 space-y-3">
                {/* Room-Specific Interactive Appliances */}
                <div className="p-3.5 storybook-card rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-black text-xs uppercase tracking-wide text-[#c94a77] dark:text-[#ff9ec0]">
                      {ROOM_META[activeRoomId].icon} {ROOM_META[activeRoomId].label} Appliances
                    </h3>
                    <span className="text-[11px] font-bold opacity-75">
                      {activeWeather.icon} {activeWeather.name}
                    </span>
                  </div>

                  {activeTab === 'living' && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          onUpdateCottage({ fireplaceLit: !fireplaceLit });
                          audio.pop();
                          showRoomFeedback(
                            !fireplaceLit
                              ? 'Crackling logs lit up the living room hearth!'
                              : 'Banked the hearth embers into warm coals.'
                          );
                        }}
                        className="min-h-[42px] p-2.5 rounded-xl storybook-well hover:border-[#ff7aa8] border border-transparent text-left cursor-pointer transition-all"
                      >
                        <p className="font-black text-xs text-[#4a3550] dark:text-[#fdeeff]">
                          🔥 {fireplaceLit ? 'Bank Hearth Fire' : 'Light Hearth Fire'}
                        </p>
                        <p className="text-[10px] opacity-75">Cozy amber chimney glow</p>
                      </button>

                      <button
                        onClick={() => {
                          audio.chime();
                          onPlayMusicBox();
                        }}
                        className="min-h-[42px] p-2.5 rounded-xl storybook-well hover:border-[#ff7aa8] border border-transparent text-left cursor-pointer transition-all"
                      >
                        <p className="font-black text-xs text-[#4a3550] dark:text-[#fdeeff]">🎠 Play Music Box</p>
                        <p className="text-[10px] opacity-75">Chiming Song Weaver tune</p>
                      </button>

                      <button
                        onClick={() => {
                          audio.pop();
                          onRestoreVitals(15, 10, 'Lounged on the Cloud Sofa (+15% ⚡ Stamina, +10% ✨ Mana)');
                        }}
                        className="col-span-2 min-h-[42px] p-2.5 rounded-xl bg-linear-to-r from-[#ff7aa8] to-[#f46496] text-white font-black text-xs shadow-xs cursor-pointer transition-transform active:scale-98"
                      >
                        🛋️ Curl Up on Cloud Sofa (+15% ⚡ · +10% ✨)
                      </button>
                    </div>
                  )}

                  {activeTab === 'kitchen' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          onUpdateCottage({ ovenWarm: true });
                          audio.chime();
                          onRestoreVitals(25, 0, 'Baked warm honey muffins in the Cloud Oven (+25% ⚡ Stamina)!');
                        }}
                        className="min-h-[42px] p-2.5 rounded-xl bg-[#ff87a6] hover:brightness-105 text-white font-black text-xs text-left cursor-pointer shadow-xs"
                      >
                        🧁 Bake Cloud Muffin
                        <span className="block text-[10px] font-bold opacity-90">+25% ⚡ Stamina</span>
                      </button>

                      <button
                        onClick={() => {
                          audio.chime();
                          onRestoreVitals(0, 30, 'Steeped Starlight Chamomile Tea (+30% ✨ Mana)!');
                        }}
                        className="min-h-[42px] p-2.5 rounded-xl bg-[#52b8c6] hover:brightness-105 text-white font-black text-xs text-left cursor-pointer shadow-xs"
                      >
                        🫖 Brew Starlight Tea
                        <span className="block text-[10px] font-bold opacity-90">+30% ✨ Mana</span>
                      </button>

                      <button
                        onClick={() => {
                          audio.pop();
                          onRestoreVitals(15, 15, 'Shared a chilled Berry Parfait from the icebox (+15% ⚡ & +15% ✨)!');
                        }}
                        className="sm:col-span-2 min-h-[40px] p-2.5 rounded-xl storybook-well hover:border-[#ff7aa8] border border-transparent font-black text-xs text-[#4a3550] dark:text-[#fdeeff] cursor-pointer"
                      >
                        🍓 Cold-Mist Icebox Snack (+15% ⚡ &amp; +15% ✨)
                      </button>
                    </div>
                  )}

                  {activeTab === 'bedroom' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          onRestRestore();
                          showRoomFeedback('Took a cozy patchwork nap — Stamina & Mana 100% restored!');
                        }}
                        className="sm:col-span-2 min-h-[44px] p-3 rounded-xl bg-linear-to-r from-[#8d74e8] to-[#b57be8] text-white font-black text-xs shadow-xs cursor-pointer transition-transform active:scale-98"
                      >
                        🛏️ Rest in Patchwork Bed (Restore 100% ⚡ Stamina &amp; ✨ Mana)
                      </button>

                      <button
                        onClick={() => {
                          onUpdateCottage({ lampOn: !lampOn });
                          audio.pop();
                          showRoomFeedback(!lampOn ? 'Switched on the amber bedside lamp!' : 'Dimmed the bedroom for stargazing.');
                        }}
                        className="min-h-[40px] p-2.5 rounded-xl storybook-well hover:border-[#ff7aa8] border border-transparent font-black text-xs text-[#4a3550] dark:text-[#fdeeff] cursor-pointer"
                      >
                        💡 {lampOn ? 'Dim Night Lamp' : 'Turn On Lamp'}
                      </button>

                      <button
                        onClick={onOpenWardrobe}
                        className="min-h-[40px] p-2.5 rounded-xl storybook-well hover:border-[#ff7aa8] border border-transparent font-black text-xs text-[#4a3550] dark:text-[#fdeeff] cursor-pointer"
                      >
                        👒 Carved Wardrobe
                      </button>
                    </div>
                  )}

                  {activeTab === 'study' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={onOpenSongWeaver}
                          className="min-h-[42px] p-2.5 rounded-xl bg-linear-to-r from-[#ff7aa8] to-[#f46496] text-white font-black text-xs cursor-pointer shadow-xs"
                        >
                          🎼 Song Weaver
                        </button>
                        <button
                          onClick={() => {
                            const reading =
                              STARGAZE_READINGS[Math.floor(Math.random() * STARGAZE_READINGS.length)];
                            setStargazeNote(reading);
                            onRestoreVitals(0, 12, 'Stargazed through the brass telescope (+12% ✨ Mana)');
                          }}
                          className="min-h-[42px] p-2.5 rounded-xl bg-[#5b6ad0] text-white font-black text-xs cursor-pointer shadow-xs"
                        >
                          🔭 Gaze at Stars
                        </button>
                      </div>
                      {stargazeNote && (
                        <p className="text-[11px] italic text-[#5a425f] dark:text-[#e6d7ec] bg-white/60 dark:bg-black/25 p-2.5 rounded-xl">
                          {stargazeNote}
                        </p>
                      )}
                    </div>
                  )}

                  {activeTab === 'conservatory' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-[#4a3550] dark:text-[#fdeeff] tabular-nums">
                          {cottage.gardenPlots.length}/6 Planter Boxes Used
                        </span>
                        <button
                          onClick={handleWaterAllPlots}
                          className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#4eb8a9] hover:brightness-105 text-white font-black text-xs cursor-pointer shadow-xs"
                        >
                          💧 Water All Sprouts
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {SEED_TYPES.map((seed) => (
                          <button
                            key={seed.id}
                            onClick={() => handlePlantSeed(seed)}
                            className="p-2 rounded-xl storybook-well hover:border-[#52b870] border border-transparent flex items-center gap-2 text-left cursor-pointer"
                          >
                            <span className="text-xl shrink-0">{seed.icon}</span>
                            <div className="min-w-0">
                              <p className="text-[11px] font-black truncate text-[#4a3550] dark:text-[#fdeeff]">
                                {seed.name}
                              </p>
                              <p className="text-[10px] text-[#35854b] dark:text-[#8fe0a3] font-bold tabular-nums">
                                +{seed.coinYield} 🪙 harvest
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'bath' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            if (!tubFilled) onUpdateCottage({ tubFilled: true });
                            onRestoreVitals(35, 10, 'Soaked in warm lavender cedar water (+35% ⚡ Stamina, +10% ✨ Mana)!');
                          }}
                          className="min-h-[42px] p-2.5 rounded-xl bg-[#4eaec4] hover:brightness-105 text-white font-black text-xs cursor-pointer shadow-xs"
                        >
                          🛁 Herbal Cedar Soak
                          <span className="block text-[10px] font-bold opacity-90">+35% ⚡ · +10% ✨</span>
                        </button>

                        <button
                          onClick={() => {
                            onUpdateCottage({ tubFilled: !tubFilled });
                            audio.pop();
                            showRoomFeedback(!tubFilled ? 'Filled the cedar tub with steaming lavender water!' : 'Drained the cedar bath.');
                          }}
                          className="min-h-[42px] p-2.5 rounded-xl storybook-well hover:border-[#4eaec4] border border-transparent font-black text-xs text-[#4a3550] dark:text-[#fdeeff] cursor-pointer"
                        >
                          🚿 {tubFilled ? 'Drain Tub' : 'Fill Warm Bath'}
                        </button>
                      </div>
                      <p className="text-[11px] text-[#5a425f] dark:text-[#d5bddb] tabular-nums">
                        🐠 Wall Aquarium houses <strong className="font-black">{aquariumRoster.length}</strong> species from your reef &amp; fishing catches.
                      </p>
                    </div>
                  )}
                </div>

                {/* Room Furniture & Decor Crafting */}
                <div className="p-3.5 storybook-card rounded-2xl space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-black text-xs uppercase tracking-wide text-[#c94a77] dark:text-[#ff9ec0]">
                      Craft Furniture ({coins} 🪙)
                    </h3>
                    <button
                      onClick={() => setShowAllFurniture((v) => !v)}
                      className="text-[11px] font-black text-[#7c5c75] dark:text-[#d8c7df] hover:text-[#ff7aa8] cursor-pointer"
                    >
                      {showAllFurniture ? 'Room Picks Only' : 'Show All Rooms'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 max-h-[210px] overflow-y-auto pr-0.5">
                    {catalogList.map((furn) => {
                      const affordable = coins >= furn.cost;
                      return (
                        <button
                          key={furn.id}
                          onClick={() => handleAddDecoration(furn)}
                          className={`p-2 rounded-xl border text-left flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
                            affordable
                              ? 'storybook-well border-transparent hover:border-[#ff7aa8]'
                              : 'storybook-well border-transparent opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xl shrink-0">{furn.icon}</span>
                            <div className="min-w-0">
                              <p className="text-[11px] font-black text-[#4a3550] dark:text-[#fdeeff] truncate">
                                {furn.name}
                              </p>
                              <p className="text-[10px] font-bold text-[#c94a77] dark:text-[#ff9ec0] tabular-nums">
                                {furn.cost} 🪙
                              </p>
                            </div>
                          </div>
                          <span className="text-xs shrink-0 font-black">＋</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Clean Unboxed Footer */}
        <div className="pt-2 border-t border-[#f0c7d8]/80 dark:border-[#5b3b6b]/80 flex items-center justify-end sm:justify-between gap-3 text-xs shrink-0">
          <span className="hidden sm:inline text-[11px] opacity-75 font-bold truncate">
            Your home on Lantern Isle · Walk up to the front door or press H anytime
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto min-h-[38px] px-4 py-1.5 rounded-xl bg-linear-to-r from-[#ff7aa8] to-[#f46496] hover:brightness-105 text-white font-black text-xs shadow-xs transition-transform active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
          >
            Back to Archipelago
          </button>
        </div>
      </div>
    </div>
  );
};
