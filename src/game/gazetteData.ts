/**
 * Mochi Meadows 2: The Daily Meadows Gazette & Rotating Comics System
 * Deterministic date-based daily newspaper issues, 16 multi-panel illustrated comics,
 * daily reader trivia, and Library persistence types.
 */

export interface ComicCharacterPose {
  name: string;
  species: 'cat' | 'bunny' | 'bear' | 'fox' | 'owl' | 'frog' | 'axolotl' | 'otter' | 'penguin' | 'rock' | 'cloud' | 'bee';
  color: string;
  hat?: 'chef' | 'captain' | 'mushroom' | 'crown' | 'seashell' | 'moon' | 'leaf' | 'bow' | 'none';
  mood: 'happy' | 'shocked' | 'sleepy' | 'smug' | 'confused' | 'heart' | 'dizzy';
  x: number; // 0..100 SVG coordinate X
  y: number; // 0..100 SVG coordinate Y
  facing?: 1 | -1;
}

export interface ComicPanel {
  id: string;
  bg: 'meadow' | 'sea' | 'sky' | 'glowdeep' | 'moonroad' | 'bakery' | 'teahouse' | 'shore';
  characters: ComicCharacterPose[];
  prop?: 'muffin' | 'muffins_flying' | 'boat' | 'teacup' | 'ice' | 'gem' | 'lantern' | 'kite' | 'note' | 'snow' | 'honey';
  sfx?: string;
  speaker?: string;
  speech?: string;
  replySpeaker?: string;
  reply?: string;
  caption?: string;
}

export interface GazetteComic {
  id: string;
  series: string;
  title: string;
  author: string;
  price: number;
  accentColor: string;
  panels: ComicPanel[];
}

export interface GazetteBrief {
  category: string;
  title: string;
  body: string;
}

export interface GazetteTrivia {
  id: string;
  question: string;
  options: string[];
  correctIdx: number;
  rewardCoins: number;
  explanation: string;
}

export interface GazetteWorldContext {
  playerName?: string;
  currentBiomeName?: string;
  starsGot?: number;
  pearlsGot?: number;
  feathersGot?: number;
  friendsGot?: number;
  visitedTownsCount?: number;
  currentChapter?: number;
}

export interface DailyGazetteIssue {
  dateKey: string;
  editionKey: string;
  editionTag: string;
  dateLabel: string;
  issueNumber: number;
  editionPrice: number;
  kicker: string;
  headline: string;
  subhead: string;
  byline: string;
  leadBody: string;
  briefs: GazetteBrief[];
  liveWire: string[];
  horoscope: string;
  luckyItem: string;
  weatherSummary: string;
  comics: GazetteComic[];
  trivia: GazetteTrivia;
}

export interface GazetteLibraryItem {
  id: string;
  type: 'edition' | 'comic';
  title: string;
  subtitle: string;
  issueNumber: number;
  dateKey: string;
  dateLabel: string;
  purchasedAt: string;
  paidCoins: number;
  kept: boolean;
  editionData?: DailyGazetteIssue;
  comicData?: GazetteComic;
}

export const GAZETTE_LIBRARY_STORAGE_KEY = 'mochi-meadows-v2-gazette-library';
export const GAZETTE_TRIVIA_CLAIMED_KEY = 'mochi-meadows-v2-gazette-trivia-claimed';
export const GAZETTE_VIEW_SEQ_KEY = 'mochi-meadows-v2-gazette-view-seq';
export const GAZETTE_LAST_SEEN_SLOT_KEY = 'mochi-meadows-v2-gazette-last-seen-slot';
export const GAZETTE_EDITION_INTERVAL_MS = 2 * 60 * 1000; // Fresh press every 2 minutes

export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatReadableDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getDayIndex(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return 1;
  const epoch = new Date(2025, 0, 1).getTime();
  const current = new Date(y, m - 1, d).getTime();
  return Math.max(1, Math.floor((current - epoch) / 86400000) + 1);
}

export function getCurrentEditionSlot(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / GAZETTE_EDITION_INTERVAL_MS);
}

export function getNextPressCountdownMs(nowMs: number = Date.now()): number {
  const remainder = nowMs % GAZETTE_EDITION_INTERVAL_MS;
  return GAZETTE_EDITION_INTERVAL_MS - remainder;
}

export function getLastSeenGazetteSlot(): number | null {
  try {
    const raw = localStorage.getItem(GAZETTE_LAST_SEEN_SLOT_KEY);
    if (!raw) return null;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function markGazetteSlotSeen(slot: number = getCurrentEditionSlot()): void {
  try {
    localStorage.setItem(GAZETTE_LAST_SEEN_SLOT_KEY, String(slot));
  } catch {
    // ignore storage errors
  }
}

export function bumpGazetteViewSeq(): number {
  try {
    const prev = parseInt(sessionStorage.getItem(GAZETTE_VIEW_SEQ_KEY) || '-1', 10);
    const next = Number.isFinite(prev) ? prev + 1 : 0;
    sessionStorage.setItem(GAZETTE_VIEW_SEQ_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}

export function isTriviaSlotClaimed(slotKey: string): boolean {
  try {
    const raw = localStorage.getItem(GAZETTE_TRIVIA_CLAIMED_KEY);
    if (!raw) return false;
    if (raw === slotKey) return true;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.includes(slotKey);
  } catch {
    return false;
  }
}

export function markTriviaSlotClaimed(slotKey: string): void {
  try {
    const raw = localStorage.getItem(GAZETTE_TRIVIA_CLAIMED_KEY);
    let list: string[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) list = parsed.filter((x) => typeof x === 'string');
      } catch {
        list = [raw];
      }
    }
    if (!list.includes(slotKey)) {
      list.unshift(slotKey);
    }
    localStorage.setItem(GAZETTE_TRIVIA_CLAIMED_KEY, JSON.stringify(list.slice(0, 40)));
  } catch {
    // ignore storage errors
  }
}

// 16 Rich Multi-Panel Comics Rotating Daily
export const GAZETTE_COMICS: GazetteComic[] = [
  {
    id: 'comic-muffin-orbit',
    series: 'Sugar & Crumb',
    title: 'Zero-Gravity Sourdough',
    author: 'Pip the Baker',
    price: 5,
    accentColor: '#ffe3ec',
    panels: [
      {
        id: 'p1',
        bg: 'bakery',
        characters: [{ name: 'Pip', species: 'bunny', color: '#ffd6a5', hat: 'chef', mood: 'happy', x: 38, y: 66, facing: 1 }],
        prop: 'muffin',
        speech: 'Just one tiny pinch of Cirrus cloud yeast!',
        caption: '6:00 AM at Meadow Bakery',
      },
      {
        id: 'p2',
        bg: 'bakery',
        characters: [
          { name: 'Pip', species: 'bunny', color: '#ffd6a5', hat: 'chef', mood: 'shocked', x: 28, y: 68, facing: 1 },
          { name: 'Mochi', species: 'cat', color: '#ffb3c7', hat: 'bow', mood: 'confused', x: 72, y: 68, facing: -1 },
        ],
        prop: 'muffins_flying',
        sfx: 'POOF!',
        speech: 'Wait—why are the muffins rising WITHOUT an oven?!',
      },
      {
        id: 'p3',
        bg: 'sky',
        characters: [
          { name: 'Queen Nimbus', species: 'owl', color: '#ffffff', hat: 'crown', mood: 'happy', x: 52, y: 58, facing: -1 },
        ],
        prop: 'muffins_flying',
        speech: 'Ooh! Fresh cinnamon toast right to the Sky Court!',
        caption: 'Rating: 5/5 Cloud Stars',
      },
    ],
  },
  {
    id: 'comic-rock-debate',
    series: 'The Pebble Chronicles',
    title: 'The Great Staring Contest',
    author: 'Dune Dave',
    price: 5,
    accentColor: '#f3f0ff',
    panels: [
      {
        id: 'p1',
        bg: 'shore',
        characters: [
          { name: 'Gloria', species: 'rock', color: '#a5b4c4', mood: 'smug', x: 30, y: 68, facing: 1 },
          { name: 'Gary', species: 'rock', color: '#c4b5a5', mood: 'smug', x: 70, y: 68, facing: -1 },
        ],
        speech: 'No blinking. Not even during high tide.',
        caption: 'Hour 1',
      },
      {
        id: 'p2',
        bg: 'shore',
        characters: [
          { name: 'Gloria', species: 'rock', color: '#a5b4c4', mood: 'smug', x: 30, y: 68, facing: 1 },
          { name: 'Gary', species: 'rock', color: '#c4b5a5', mood: 'smug', x: 70, y: 68, facing: -1 },
        ],
        prop: 'snow',
        speech: '…Still not blinking.',
        caption: 'Hour 14',
      },
      {
        id: 'p3',
        bg: 'shore',
        characters: [
          { name: 'Gloria', species: 'rock', color: '#a5b4c4', mood: 'heart', x: 30, y: 68, facing: 1 },
          { name: 'Gary', species: 'rock', color: '#c4b5a5', mood: 'heart', x: 70, y: 68, facing: -1 },
        ],
        sfx: 'TIE!',
        speech: 'Best conversation we’ve had all week!',
        caption: 'Neither has eyelids.',
      },
    ],
  },
  {
    id: 'comic-frost-oops',
    series: 'Little Mochi, Big Magic',
    title: 'Shortcut Across the Lagoon',
    author: 'Professor Bramble',
    price: 5,
    accentColor: '#e3f6ff',
    panels: [
      {
        id: 'p1',
        bg: 'shore',
        characters: [
          { name: 'Mochi', species: 'cat', color: '#ffb3c7', hat: 'bow', mood: 'happy', x: 32, y: 66, facing: 1 },
          { name: 'Barnacle', species: 'bear', color: '#c9a27e', hat: 'captain', mood: 'confused', x: 72, y: 66, facing: -1 },
        ],
        prop: 'ice',
        speech: 'Watch me cross Pearl Reef with Frost Bridge!',
      },
      {
        id: 'p2',
        bg: 'sea',
        characters: [
          { name: 'Mochi', species: 'cat', color: '#ffb3c7', hat: 'bow', mood: 'dizzy', x: 64, y: 52, facing: 1 },
        ],
        prop: 'ice',
        sfx: 'ZOOOOM!',
        speech: 'I FORGOT ICE HAS ZERO FRICTION—',
      },
      {
        id: 'p3',
        bg: 'shore',
        characters: [
          { name: 'Mochi', species: 'cat', color: '#ffb3c7', hat: 'bow', mood: 'smug', x: 68, y: 68, facing: -1 },
          { name: 'Barnacle', species: 'bear', color: '#c9a27e', hat: 'captain', mood: 'shocked', x: 26, y: 66, facing: 1 },
        ],
        speech: 'New Island Speed Record! Totally meant to land in that bush.',
      },
    ],
  },
  {
    id: 'comic-barnacle-puddle',
    series: 'Puddle II Captain’s Log',
    title: 'Low Tide Logistics',
    author: 'Captain Barnacle',
    price: 5,
    accentColor: '#e6fcf5',
    panels: [
      {
        id: 'p1',
        bg: 'shore',
        characters: [{ name: 'Barnacle', species: 'bear', color: '#c9a27e', hat: 'captain', mood: 'smug', x: 36, y: 62, facing: 1 }],
        prop: 'boat',
        speech: 'All hands on deck! We sail at dawn!',
      },
      {
        id: 'p2',
        bg: 'shore',
        characters: [
          { name: 'Barnacle', species: 'bear', color: '#c9a27e', hat: 'captain', mood: 'confused', x: 36, y: 66, facing: 1 },
          { name: 'Marina', species: 'otter', color: '#52d6c6', hat: 'seashell', mood: 'happy', x: 74, y: 66, facing: -1 },
        ],
        prop: 'boat',
        sfx: 'SCRAPE…',
        speech: 'Captain, your galleon is parked in a tea saucer.',
      },
      {
        id: 'p3',
        bg: 'shore',
        characters: [{ name: 'Barnacle', species: 'bear', color: '#c9a27e', hat: 'captain', mood: 'happy', x: 50, y: 64, facing: 1 }],
        prop: 'teacup',
        speech: 'A chamomile sea counts as high adventure, matey!',
      },
    ],
  },
  {
    id: 'comic-glowdeep-tea',
    series: 'Moon Road Late Show',
    title: 'Three Sugars of Stardust',
    author: 'Dusk',
    price: 5,
    accentColor: '#efe6ff',
    panels: [
      {
        id: 'p1',
        bg: 'teahouse',
        characters: [
          { name: 'Lumi', species: 'axolotl', color: '#cdb4ff', hat: 'mushroom', mood: 'sleepy', x: 32, y: 66, facing: 1 },
          { name: 'Dusk', species: 'fox', color: '#3b3550', hat: 'moon', mood: 'happy', x: 70, y: 66, facing: -1 },
        ],
        prop: 'teacup',
        speech: 'One chamomile tea for a sleepy cave scholar?',
      },
      {
        id: 'p2',
        bg: 'teahouse',
        characters: [
          { name: 'Lumi', species: 'axolotl', color: '#cdb4ff', hat: 'mushroom', mood: 'shocked', x: 34, y: 54, facing: 1 },
          { name: 'Dusk', species: 'fox', color: '#3b3550', hat: 'moon', mood: 'confused', x: 70, y: 66, facing: -1 },
        ],
        prop: 'gem',
        sfx: 'GLOW!',
        speech: 'WAIT—that was glowing stardust, not sugar cubes!',
      },
      {
        id: 'p3',
        bg: 'glowdeep',
        characters: [
          { name: 'Lumi', species: 'axolotl', color: '#cdb4ff', hat: 'mushroom', mood: 'heart', x: 50, y: 62, facing: 1 },
        ],
        prop: 'lantern',
        speech: 'On the bright side, I no longer need a cavern lamp.',
      },
    ],
  },
  {
    id: 'comic-wisp-kite',
    series: 'Wisp Weather Watch',
    title: 'Forecast: 100% Kite',
    author: 'Wisp',
    price: 5,
    accentColor: '#e8f7ff',
    panels: [
      {
        id: 'p1',
        bg: 'meadow',
        characters: [{ name: 'Wisp', species: 'cloud', color: '#a8e6ff', mood: 'happy', x: 36, y: 58, facing: 1 }],
        prop: 'kite',
        speech: 'Checking today’s breeze with my trusty kite!',
      },
      {
        id: 'p2',
        bg: 'sky',
        characters: [{ name: 'Wisp', species: 'cloud', color: '#a8e6ff', mood: 'shocked', x: 50, y: 46, facing: 1 }],
        prop: 'kite',
        sfx: 'WHOOSH!',
        speech: 'Wait—since I weigh as much as a cumulus cloud…',
      },
      {
        id: 'p3',
        bg: 'sky',
        characters: [
          { name: 'Wisp', species: 'cloud', color: '#a8e6ff', mood: 'dizzy', x: 64, y: 52, facing: -1 },
          { name: 'Queen Nimbus', species: 'owl', color: '#ffffff', hat: 'crown', mood: 'happy', x: 28, y: 60, facing: 1 },
        ],
        speech: 'Well, hello there, surface forecast!',
      },
    ],
  },
  {
    id: 'comic-marina-rehearsal',
    series: 'Tidepool Tunes',
    title: 'Bubble Acoustics',
    author: 'Marina',
    price: 5,
    accentColor: '#e0fbfc',
    panels: [
      {
        id: 'p1',
        bg: 'sea',
        characters: [
          { name: 'Marina', species: 'otter', color: '#52d6c6', hat: 'seashell', mood: 'happy', x: 34, y: 64, facing: 1 },
          { name: 'Mochi', species: 'cat', color: '#ffb3c7', hat: 'bow', mood: 'happy', x: 70, y: 64, facing: -1 },
        ],
        prop: 'note',
        speech: 'Now let’s sing the Coral Chorus high note!',
      },
      {
        id: 'p2',
        bg: 'sea',
        characters: [
          { name: 'Marina', species: 'otter', color: '#52d6c6', hat: 'seashell', mood: 'shocked', x: 30, y: 64, facing: 1 },
          { name: 'Mochi', species: 'cat', color: '#ffb3c7', hat: 'bow', mood: 'confused', x: 70, y: 54, facing: -1 },
        ],
        sfx: 'BLUB-BUB!',
        speech: 'BLUBB-BLUBB-BLUUUB?!',
      },
      {
        id: 'p3',
        bg: 'sea',
        characters: [
          { name: 'Marina', species: 'otter', color: '#52d6c6', hat: 'seashell', mood: 'heart', x: 50, y: 64, facing: 1 },
        ],
        prop: 'note',
        speech: 'Standing ovation from twelve passing shrimp!',
      },
    ],
  },
  {
    id: 'comic-honey-tax',
    series: 'Buzz & Bloom',
    title: 'Honeycomb Tollbooth',
    author: 'Bumble-Bee',
    price: 5,
    accentColor: '#fff8db',
    panels: [
      {
        id: 'p1',
        bg: 'meadow',
        characters: [
          { name: 'Bee', species: 'bee', color: '#ffe066', mood: 'smug', x: 36, y: 52, facing: 1 },
          { name: 'Barnacle', species: 'bear', color: '#c9a27e', hat: 'captain', mood: 'happy', x: 72, y: 66, facing: -1 },
        ],
        prop: 'honey',
        speech: 'Honeycomb Hills Bridge toll: one polite compliment!',
      },
      {
        id: 'p2',
        bg: 'meadow',
        characters: [
          { name: 'Bee', species: 'bee', color: '#ffe066', mood: 'heart', x: 36, y: 52, facing: 1 },
          { name: 'Barnacle', species: 'bear', color: '#c9a27e', hat: 'captain', mood: 'happy', x: 72, y: 66, facing: -1 },
        ],
        speech: 'Ye have the fluffiest stripes on all eight islands!',
      },
      {
        id: 'p3',
        bg: 'meadow',
        characters: [
          { name: 'Bee', species: 'bee', color: '#ffe066', mood: 'heart', x: 50, y: 56, facing: 1 },
        ],
        prop: 'honey',
        sfx: 'BONUS!',
        speech: 'Toll paid AND you win a free jar of wildflower honey!',
      },
    ],
  },
  {
    id: 'comic-moon-pull-magnet',
    series: 'Little Mochi, Big Magic',
    title: 'Too Much Magnetic Pull',
    author: 'Mochi',
    price: 5,
    accentColor: '#f5e8ff',
    panels: [
      {
        id: 'p1',
        bg: 'meadow',
        characters: [{ name: 'Mochi', species: 'cat', color: '#ffb3c7', hat: 'bow', mood: 'happy', x: 50, y: 66, facing: 1 }],
        prop: 'gem',
        speech: 'Casting Moon Pull to grab that distant star gem!',
      },
      {
        id: 'p2',
        bg: 'meadow',
        characters: [
          { name: 'Mochi', species: 'cat', color: '#ffb3c7', hat: 'bow', mood: 'shocked', x: 46, y: 66, facing: 1 },
          { name: 'Gary', species: 'rock', color: '#c4b5a5', mood: 'confused', x: 24, y: 52, facing: 1 },
        ],
        prop: 'muffins_flying',
        sfx: 'YOINK!',
        speech: 'Why did I pull four spoons, a muffin, and Gary?!',
      },
      {
        id: 'p3',
        bg: 'meadow',
        characters: [
          { name: 'Mochi', species: 'cat', color: '#ffb3c7', hat: 'bow', mood: 'heart', x: 42, y: 66, facing: 1 },
          { name: 'Gary', species: 'rock', color: '#c4b5a5', mood: 'smug', x: 66, y: 68, facing: -1 },
        ],
        speech: 'At least Gary always sticks around.',
      },
    ],
  },
  {
    id: 'comic-lantern-owl-alarm',
    series: 'Sky Court Gazette',
    title: 'Early Bird Schedule',
    author: 'Queen Nimbus',
    price: 5,
    accentColor: '#fff3e0',
    panels: [
      {
        id: 'p1',
        bg: 'sky',
        characters: [{ name: 'Nimbus', species: 'owl', color: '#ffffff', hat: 'crown', mood: 'sleepy', x: 45, y: 60, facing: 1 }],
        speech: 'Being an owl at Dawn Spire has ONE downside…',
      },
      {
        id: 'p2',
        bg: 'sky',
        characters: [{ name: 'Nimbus', species: 'owl', color: '#ffffff', hat: 'crown', mood: 'shocked', x: 45, y: 60, facing: 1 }],
        prop: 'note',
        sfx: 'CHIME!',
        speech: 'Sunrise bells ring right at my bedtime!',
      },
      {
        id: 'p3',
        bg: 'teahouse',
        characters: [{ name: 'Nimbus', species: 'owl', color: '#ffffff', hat: 'crown', mood: 'heart', x: 48, y: 64, facing: 1 }],
        prop: 'teacup',
        speech: 'Solution: double espresso moonlight tea.',
      },
    ],
  },
  {
    id: 'comic-mirror-fens-choir',
    series: 'Fen Whispers',
    title: 'Ribbit Acoustic Test',
    author: 'Lantern Frog',
    price: 5,
    accentColor: '#e6f9ed',
    panels: [
      {
        id: 'p1',
        bg: 'meadow',
        characters: [{ name: 'Frog', species: 'frog', color: '#7bd88f', mood: 'happy', x: 46, y: 64, facing: 1 }],
        prop: 'lantern',
        speech: 'Testing Mirror Fens echo reverb: RIBBIT!',
      },
      {
        id: 'p2',
        bg: 'glowdeep',
        characters: [
          { name: 'Frog', species: 'frog', color: '#7bd88f', mood: 'confused', x: 30, y: 64, facing: 1 },
          { name: 'Lumi', species: 'axolotl', color: '#cdb4ff', hat: 'mushroom', mood: 'happy', x: 72, y: 64, facing: -1 },
        ],
        sfx: 'rib-BIT-bit…',
        speech: 'Did the lily pond just harmonize with me?!',
      },
      {
        id: 'p3',
        bg: 'meadow',
        characters: [{ name: 'Frog', species: 'frog', color: '#7bd88f', mood: 'smug', x: 48, y: 64, facing: 1 }],
        prop: 'note',
        speech: 'Book the pond for Friday night’s concert!',
      },
    ],
  },
  {
    id: 'comic-penguin-holiday',
    series: 'Aurora Reach Postcards',
    title: 'Too Tropical for Shiver',
    author: 'Shiver',
    price: 5,
    accentColor: '#e4f0ff',
    panels: [
      {
        id: 'p1',
        bg: 'shore',
        characters: [{ name: 'Shiver', species: 'penguin', color: '#6b9ac4', mood: 'dizzy', x: 44, y: 66, facing: 1 }],
        speech: 'Whew! Sunny Meadow is 72 degrees!!',
      },
      {
        id: 'p2',
        bg: 'meadow',
        characters: [{ name: 'Mochi', species: 'cat', color: '#ffb3c7', hat: 'bow', mood: 'happy', x: 30, y: 66, facing: 1 }],
        prop: 'snow',
        sfx: 'FROST!',
        speech: 'Here—one mini Frost Bridge snow-cone cushion!',
      },
      {
        id: 'p3',
        bg: 'shore',
        characters: [{ name: 'Shiver', species: 'penguin', color: '#6b9ac4', mood: 'heart', x: 52, y: 66, facing: 1 }],
        prop: 'ice',
        speech: 'Ahhhh. Five stars for portable winter.',
      },
    ],
  },
  {
    id: 'comic-fox-whisper',
    series: 'Moon Road Late Show',
    title: 'Whistle Reply',
    author: 'Dusk',
    price: 5,
    accentColor: '#f0e9ff',
    panels: [
      {
        id: 'p1',
        bg: 'moonroad',
        characters: [{ name: 'Dusk', species: 'fox', color: '#3b3550', hat: 'moon', mood: 'happy', x: 46, y: 64, facing: 1 }],
        prop: 'note',
        speech: 'Whenever I cast Dreamwalk and whistle softly…',
      },
      {
        id: 'p2',
        bg: 'moonroad',
        characters: [
          { name: 'Dusk', species: 'fox', color: '#3b3550', hat: 'moon', mood: 'happy', x: 28, y: 66, facing: 1 },
          { name: 'Mochi', species: 'cat', color: '#ffb3c7', hat: 'bow', mood: 'happy', x: 70, y: 66, facing: -1 },
        ],
        sfx: 'TWINKLE!',
        speech: 'Mochi appears instantly with cinnamon scones!',
      },
      {
        id: 'p3',
        bg: 'moonroad',
        characters: [
          { name: 'Dusk', species: 'fox', color: '#3b3550', hat: 'moon', mood: 'heart', x: 50, y: 66, facing: 1 },
        ],
        prop: 'muffin',
        speech: 'Best Moon Road summoning spell ever invented.',
      },
    ],
  },
  {
    id: 'comic-bloom-allergy',
    series: 'Meadow Botany Weekly',
    title: 'Instant Flower Garden',
    author: 'Moss',
    price: 5,
    accentColor: '#e9fae3',
    panels: [
      {
        id: 'p1',
        bg: 'meadow',
        characters: [{ name: 'Mochi', species: 'cat', color: '#ffb3c7', hat: 'leaf', mood: 'happy', x: 45, y: 66, facing: 1 }],
        speech: 'Time to tidy one tiny flowerbed with Bloom!',
      },
      {
        id: 'p2',
        bg: 'meadow',
        characters: [{ name: 'Mochi', species: 'cat', color: '#ffb3c7', hat: 'leaf', mood: 'shocked', x: 48, y: 66, facing: 1 }],
        sfx: 'BLOOM!',
        speech: 'ACHOO! Oops, double-cast Rain Roots harmony!',
      },
      {
        id: 'p3',
        bg: 'meadow',
        characters: [
          { name: 'Mochi', species: 'cat', color: '#ffb3c7', hat: 'leaf', mood: 'heart', x: 32, y: 66, facing: 1 },
          { name: 'Bee', species: 'bee', color: '#ffe066', mood: 'heart', x: 68, y: 50, facing: -1 },
        ],
        prop: 'honey',
        speech: 'Well, Bumble-Bee just declared this National Holiday.',
      },
    ],
  },
];

// Rotating Front-Page Lead Stories (24 distinct Archipelago & Five-Phase editions)
const DAILY_LEAD_STORIES = [
  {
    kicker: 'BAKERY BULLETIN',
    headline: 'Runaway Cloud Muffins Sighted Orbiting Dawn Spire',
    subhead: 'Pip insists extra Cirrus yeast "gave them a healthy sense of curiosity."',
    byline: 'By Doris the Meadow Reporter',
    body: 'Islanders gazing upward witnessed seven golden blueberry muffins gliding peacefully past Queen Nimbus’s balcony. Local owls gave the pastries high marks for fluffiness, though Wisp recommends wide-brimmed hats near the bakery chimney.',
  },
  {
    kicker: 'MARITIME DESK',
    headline: 'Captain Barnacle Announces Puddle II Luxury Dew Cruises',
    subhead: 'Voyages cover up to four feet of scenic tidepool in serene comfort.',
    byline: 'By Marina at Pearl Reef',
    body: 'Passengers boarding the Puddle II receive complimentary seashell binoculars and a polite nod from Gloria the skipping rock. Marina’s coral chorus will accompany all departures with three bubbly arpeggios.',
  },
  {
    kicker: 'CELESTIAL ASTRONOMY',
    headline: 'Moon’s Tea House Introduces Chamomile Dreamwalk Blend',
    subhead: 'Side effects include gentle sparkles and unlocking fast-travel waypoints.',
    byline: 'By Dusk',
    body: 'Brewed during twilight resonance, this new infusion pairs Mirror Fens mint with dried star-petal nectar. Guests report feeling 32% lighter on their paws and unusually fluent in hummingbirds.',
  },
  {
    kicker: 'GEOLOGY & LEISURE',
    headline: 'Gary and Gloria Tie All-Time Archipelago Staring Record',
    subhead: 'Match entered its 412th hour after both competitors declined to blink.',
    byline: 'By Dune Dave',
    body: 'Crowds gathered along Sandy Shore with picnic baskets and thermos mugs to witness the historic stalemate. Dune Dave confirmed Gary felt "emotionally supportive yet utterly unbothered" throughout.',
  },
  {
    kicker: 'UNDERSEA CORAL',
    headline: 'Pearl Reef Concert Hall Books Sold-Out Shrimp Quartet',
    subhead: 'Tickets traded briskly for two shiny pebbles and a warm wave.',
    byline: 'By Marina',
    body: 'Acoustics beneath the sunken marble arches are tuned to crisp harmony after Mochi’s latest Echo Call sweep. Surface visitors are reminded to cast Tide Song for refreshing oxygen along the balcony seating.',
  },
  {
    kicker: 'GARDEN CLUB',
    headline: 'Mystery Mochi Turns Entire Cove Into Wildflower Carpet',
    subhead: 'Bumble-Bee declares Honeycomb Hills nectar reserves at record high.',
    byline: 'By Moss of Whisper Woods',
    body: 'Combining Bloom and Ember Warmth sparked an unexpected Rain Roots cascade between Dawn Spire and Sunny Meadow. Gardeners note that dandelions now sway in time to 3/4 waltz rhythm.',
  },
  {
    kicker: 'FROST & SKATING',
    headline: 'Pop-Up Ice Rinks Spark Spontaneous Speed Skating League',
    subhead: 'Frost Bridge commuters shave three minutes off the reef crossing.',
    byline: 'By Shiver of Aurora Reach',
    body: 'Young axolotls and frogs raced across glistening Frost Bridge squares near Tidepool Atoll earlier today. Ember Warmth stations remain lit along the docks for toasted marshmallows afterwards.',
  },
  {
    kicker: 'GLOWDEEP CHRONICLE',
    headline: 'Crystal Gondola Sets Record Smoothness on Canal Seven',
    subhead: 'Lumi credits freshly polished quartz oars and polite glowing snails.',
    byline: 'By Lumi of Rooted Rest',
    body: 'Passengers gliding beneath the roots of Nana Mochi enjoyed uninterrupted views of luminescent spore clusters. Tea service remains complimentary at both cavern piers until the lanterns dim.',
  },
  {
    kicker: 'SKY COURT SOCIETY',
    headline: 'Rainbow Rings Polished to Double Sparkle Over Nimbus Market',
    subhead: 'Gliders report 18% smoother tail-winds and bonus altitude giggles.',
    byline: 'By Queen Nimbus',
    body: 'Feather maintenance crews wrapped up a week-long buffing marathon across the upper cumulus lanes. Cloud Wings flyers are invited to loop through the golden arches before sundown.',
  },
  {
    kicker: 'THERMAL WELLNESS',
    headline: 'Cinder Cradle Hot Springs Open Late for Stargazing Bath',
    subhead: 'Ember promises volcanic boulders "toasted to optimum paw warmth."',
    byline: 'By Ember of Cinder Spas',
    body: 'Visitors casting Ember Warmth near mossy spring stones triggered gentle mint-scented steam plumes visible from Lantern Isle. Towels infused with clover oil are stacked beside every pool.',
  },
  {
    kicker: 'CANOPY ACOUSTICS',
    headline: 'Bellwood Treetops Tests Pentatonic Rope-Bridge Chimes',
    subhead: 'Every hurried footstep now plays an accidental jazz solo.',
    byline: 'By Bellamy the Chime Keeper',
    body: 'Squirrels crossing the northern timber spans accidentally premiered three new fugues before lunch. Explorers seeking serenity are urged to walk gently in four-four time.',
  },
  {
    kicker: 'HONEYCOMB HARVEST',
    headline: 'Gold-Stripe Bees Vote Unanimously for Longer Afternoon Naps',
    subhead: 'Pollen quotas already met thanks to recent Bloom spell waves.',
    byline: 'By Bumble of Honeycomb Village',
    body: 'Apiary ledgers show honeycomb barrels brimming with floral nectar across all western terraces. Anyone hummed at by a sleepy bee is legally required to hum back softly.',
  },
  {
    kicker: 'WAYFINDER WIRE',
    headline: 'Song of Teleportation Grid Links Nine Newly Attuned Town Squares',
    subhead: 'Cartographers trace shimmering golden routes across the Five-Phase Atlas.',
    byline: 'By Wick the Lantern Keeper',
    body: 'Inspecting any visited settlement on the Atlas now reveals glowing travel paths linking unlocked destinations. Travelers carrying 25 mana may warp directly from the map tooltip.',
  },
  {
    kicker: 'ARCHIPELAGO FASHION',
    headline: 'Leaf-Cap Trend Sweeps Willowbrook After Pip’s Bakery Parade',
    subhead: 'Botanists confirm clover berets shade ears 40% more stylishly.',
    byline: 'By Orla the Tailor',
    body: 'Meadow seamstresses report brisk demand for pastel ribbon bows, starry cloaks, and seashell barrettes. Mirror fittings near Mochi Hamlet stay open whenever the tide sighs.',
  },
  {
    kicker: 'MYSTERY DESK',
    headline: 'Gloom Discovers Matching Spare Button Inside Hollow Oak',
    subhead: 'Entire plaza pauses to celebrate tiny brass souvenir.',
    byline: 'By Gloom’s Notebook',
    body: 'Though shy around crowds, our resident grey Hollow beamed brightly when his antique coat button chimed in tune with Echo Call. Neighbours left warm scones along his doorstep.',
  },
  {
    kicker: 'AURORA OBSERVATORY',
    headline: 'Emerald Curtain Lights Reflect Off Frozen Lagoons Twice Tonight',
    subhead: 'Shiver opens complimentary mitten-warming kiosk near Aurora Station.',
    byline: 'By Aurora Frost Watch',
    body: 'High-altitude star-dust drifting from Moon Road painted the northeastern snowdrifts in mint and violet ribbons. Photographers caught three snow-bunnies attempting synchronized pirouettes.',
  },
  {
    kicker: 'LIGHTHOUSE LOG',
    headline: 'Tidbit Upgrades Atoll Beacon Lens With Triple Prism Shells',
    subhead: 'Beam now visible all the way from Chime Canopy on clear nights.',
    byline: 'By Tidbit of Tidepool Haven',
    body: 'Mariners sailing home through midnight swells cheered as warm amber light swept cleanly over the reef shoals. Tidbit celebrated with two mugs of salted caramel kelp cocoa.',
  },
  {
    kicker: 'FEN OPERA REVIEW',
    headline: 'Lily Pad Acoustics Earn Standing Ribbit From Critique Panel',
    subhead: 'Bullfrog bass section commended for "deep pond resonance."',
    byline: 'By Serena of Mirror Fens',
    body: 'Twilight listeners perched along Willowbrook ferries praised the clear soprano echoes bouncing across the misty reeds. Bring a folding cushion—or borrow a patient turtle.',
  },
  {
    kicker: 'LORE & ARCHIVES',
    headline: 'Two Lost Moon Diary Pages Surfacing Near Northern Constellations',
    subhead: 'Echo Call cast near twilight stones uncovers hidden parchment.',
    byline: 'By Wick & Lumi',
    body: 'Scholars cataloguing the Nine Verses noticed faint ink sparkles shimmering whenever travelers cast Echo Call beside sunken ruins. Explorers are invited to compare notes at Moon’s Tea House.',
  },
  {
    kicker: 'CULINARY CROSSING',
    headline: 'Puddle II Galley Debuts Driftwood Smoked Honey Tarts',
    subhead: 'Guaranteed not to levitate unless seasoned with Nimbus nutmeg.',
    byline: 'By Chef Pip',
    body: 'Hungry sailors lining Driftwood Dock formed an orderly queue spanning three piers. Captain Barnacle tasted four samples personally "for ballast safety verification."',
  },
  {
    kicker: 'SPELLCRAFT QUARTERLY',
    headline: 'Glimmer Step Shortcuts Across Creeks Declared Safe & Exhilarating',
    subhead: 'Smart obstacle detection keeps blink-casters dry and tree-free.',
    byline: 'By Professor Bramble',
    body: 'Field trials in Whisper Woods proved precision Glimmer Step dashes now halt neatly at cliff rims and riverbanks. Beginners still advised not to blink mid-sneeze.',
  },
  {
    kicker: 'DAWN CHORUS NOTES',
    headline: 'Dawn Break Casts Warm Golden Sunrise Wave Over Stormy Coves',
    subhead: 'Darkness retreats ten paces faster whenever friends sing together.',
    byline: 'By Aurelle’s Choir',
    body: 'Islanders caught in passing drizzle reported instant amber skies after a passing explorer sounded Dawn Break. Even grumpy storm clouds bowed politely before drifting east.',
  },
  {
    kicker: 'BOTTLE POST OFFICE',
    headline: 'Tide Current Delivers Record Stack of Floating Sky Letters',
    subhead: 'Most popular postmark this week: "Sending hugs from Sandy Shore!"',
    byline: 'By Marlo the Courier',
    body: 'Community message bottles bobbing along Pearl Reef shimmered with fresh likes from travelers across all eight islands. Leave your own postcard in any calm lagoon!',
  },
  {
    kicker: 'TREASURE GAZETTE',
    headline: 'Moon Pull Vortex Spots Hidden Pearl Clams Along Western Shoals',
    subhead: 'Magnetic shimmer draws buried shells straight into sandy sunlit tide.',
    byline: 'By Marina & Shiver',
    body: 'Coastal strollers casting Moon Pull near driftwood stumps watched gleaming coins and starlight pearls rise gently through the foam. Tide Song pairs brilliantly for breezy swims.',
  },
];

const DAILY_BRIEFS_POOL: GazetteBrief[] = [
  { category: 'Lost & Found', title: 'Found: One Perfectly Round Pebble', body: 'Answers to "Gloria." Currently skipping peacefully beside Pearl Reef dock.' },
  { category: 'Bakery Menu', title: 'Pip’s Morning Loaves', body: 'Warm Star-Bread & Honey Glaze — pairs wonderfully with a 15-second Hush Hug.' },
  { category: 'Harbor Notice', title: 'Smooth Sailing Ahead', body: 'Tide Song casters report calmer waves and +35% swift swimming currents.' },
  { category: 'Sky Advisory', title: 'Cumulus Traffic Update', body: 'Rainbow Rings above Cirrus Castle are freshly polished for feather gliders.' },
  { category: 'Glowdeep Guide', title: 'Bioluminescent Etiquette', body: 'Complimenting Glowcap Mushrooms makes them shimmer 20% brighter.' },
  { category: 'Music Desk', title: 'Duet Harmony Reminder', body: 'Cast Frost Bridge right before Ember Warmth to brew a soothing Hot Spring!' },
  { category: 'Town Crier', title: 'Waystone Network Growing', body: 'Visit each town square in person to attune it for Song of Teleportation.' },
  { category: 'Tea Corner', title: 'Dusk’s Evening Steep', body: 'Tap "Fresh Edition" anytime or check back every two minutes for new ink!' },
  { category: 'Shoreside Swap', title: 'Shells for Star Cookies', body: 'Hermit crabs near Tidepool Haven are trading crisp trivia tips for gentle waves.' },
  { category: 'Atlas Tip', title: 'Glowing Travel Routes', body: 'Open the Five-Phase Atlas to trace golden travel paths between visited towns.' },
  { category: 'Frost Watch', title: 'Slip-Free Paw Boots', body: 'Shiver recommends tapping brakes before sliding off Frost Bridge onto dry sand.' },
  { category: 'Orchard Note', title: 'Shaking Apple Boughs', body: 'Casting lively bursts near fruit trees jingles loose coins and petals!' },
  { category: 'Fen Post', title: 'Night Choir Rehearsal', body: 'Bring lantern hats to Mirror Fens pavilion; applause is given in soft croaks.' },
  { category: 'Canopy Dispatch', title: 'Bell Tuning Notice', body: 'Echo Call resonates farthest when sounded from high wooden bridges.' },
  { category: 'Volcano Spa', title: 'Tepid Lava Toast', body: 'Ember Warmth can melt stubborn boulders blocking cozy shortcut trails.' },
  { category: 'Wardrobe Wire', title: 'Ribbon Polishing Service', body: 'Visit your Cottage mirror to test out starlight auras and pastel hats.' },
  { category: 'Gondola Pier', title: 'No-Wake Canal Zone', body: 'Please keep Moon Pull sparks dimmed around sleeping crystal eels.' },
  { category: 'Honey Reserve', title: 'Clover Nectar Tasting', body: 'Wildflower Mill is offering free wildflower honey refills to tired travelers.' },
  { category: 'Lighthouse Log', title: 'Foghorn Replaced by Flute', body: 'Tidbit says sailors prefer soft E-flat warmth over startled honking.' },
  { category: 'Constellation Desk', title: 'Stargazer Checklist', body: 'Spot Twin Stars Gazebo along the northwest curve of Moon Road.' },
  { category: 'Fishermen’s Union', title: 'Mythic Koi Rumor', body: 'Twilight casting near lantern piers yields shimmering Moon Koi.' },
  { category: 'Boulder Bulletin', title: 'No Blinking Zone', body: 'Gary has officially refused comment on tomorrow’s tide schedule.' },
  { category: 'Dreamwalk Notes', title: 'Weightless Steps', body: 'Ghostly Dreamwalk strides let you slip serenely past tangled brambles.' },
  { category: 'Library Care', title: 'Archive Favorite Issues', body: 'Pin ★ Keep on beloved editions in My Library so they stay forever.' },
];

const DAILY_HOROSCOPES = [
  'Stars align for bold leaps—try Glimmer Step across a stream and peek behind waterfalls.',
  'Magnetic charm surrounds you! Moon Pull will gather twice the sparkles with half the walking.',
  'A shy Hollow creature nearby craves kindness; offer a gentle Hush Hug for a rosy bloom.',
  'Water sings your name—dive into Pearl Reef and follow Echo Call toward buried lore.',
  'Look upward after snacks: Cirrus Cloud Wings reveal feathers hidden above Whisper Woods.',
  'Brew warmth within: pairing Ember Warmth with friends turns even frosty tundras cheerful.',
  'Song of Teleportation winds hum loudly—revisit an old hamlet friend you haven’t chatted with lately.',
  'Good news drifts in by glass bottle; check any shoreline lagoon for a cheerful note.',
  'A stubborn boulder hides a gleaming secret—warm your paws with Ember Warmth and strike true.',
  'Sweet rhythms favor baking: drop by Pip’s counter or tend your cottage garden plots today.',
  'Crystal reflections in Glowdeep mirror your courage; ride a gondola toward uncharted caves.',
  'Moon Road starlight is extra crisp—steep a cup of chamomile tea before crossing Dawn Spire.',
  'Your footsteps leave wildflowers blooming in rhythm; share a cheerful tune near lonely trees.',
  'Lucky ripples circle docks and piers—drop a fishing line when the breeze smells like honey.',
  'Frost sparkles under your boots; glide effortlessly over deep currents using Frost Bridge.',
  'Patience pays in pebbles: chat twice with quiet islanders and uncover heartfelt backstories.',
  'Golden horizons reward early risers—cast Dawn Break whenever storm clouds look too bossy.',
  'Someone on Honeycomb Hills thinks your hat looks splendid today. Wear it proudly!',
];

const LUCKY_ITEMS = [
  'Warm Butter Croissant',
  'Luminescent Sea Shell',
  'Skipping Pebble',
  'Stardust Teacup',
  'Rainbow Feather',
  'Daisy Button',
  'Lantern Ember',
  'Honeycomb Comb-Key',
  'Crystal Gondola Ticket',
  'Frosted Acorn',
  'Bellwood Tuning Fork',
  'Pocket Compass Muffin',
  'Chamomile Bookmark',
  'Aurora Snowglobe',
  'Driftwood Whistle',
  'Moonlit Moss Charm',
  'Cinder Marble',
  'Golden Clover Ribbon',
];

const WEATHER_DISPATCHES = [
  'Soft sunlit breezes in the meadows with shimmering star-motes drifting high over Cirrus Kingdom.',
  'Crisp honey-scented gusts sweeping from Honeycomb Hills toward the docks of Driftwood.',
  'Silver mist twirling peacefully over Mirror Fens while rainbows perch on upper cumulus shelves.',
  'Warm volcanic updrafts rising from Cinder Cradle, lending extra lift to Cloud Wings gliders.',
  'Gentle tidepool shimmer along sandy coves—ideal visibility for pearl divers and reef flutes.',
  'Brisk aurora ribbons sparkling above northeastern snowfields; cocoa flasks strongly advised.',
  'Quiet twilight dew settling over Lantern Tree petals as fireflies tune up for the evening.',
  'Playful dandelion fluff drifting across Whisper Woods paths in gentle 3/4 waltz gusts.',
];

const EDITION_TAGS = [
  'Early Dawn Print',
  'Morning Pastry Wire',
  'High Tide Dispatch',
  'Afternoon Breeze Extra',
  'Twilight Lantern Print',
  'Starlight Moon Edition',
];

const DAILY_TRIVIA_POOL: GazetteTrivia[] = [
  {
    id: 'triv-1',
    question: 'Which pair of spells harmonizes to form the cozy Hot Spring duet?',
    options: ['Frost Bridge + Ember Warmth', 'Tide Song + Cloud Wings', 'Glimmer Step + Moon Pull'],
    correctIdx: 0,
    rewardCoins: 10,
    explanation: 'Frost Bridge and Ember Warmth meet in steam to restore stamina, oxygen, and mana!',
  },
  {
    id: 'triv-2',
    question: 'What is the name of Captain Barnacle’s beloved "ship"?',
    options: ['The S.S. Sourdough', 'The Puddle II', 'The Teacup Clipper'],
    correctIdx: 1,
    rewardCoins: 10,
    explanation: 'Captain Barnacle commands the noble Puddle II with unwavering nautical pride!',
  },
  {
    id: 'triv-3',
    question: 'Which spell attunes Moon’s Tea House and wraps you in starry trail speed?',
    options: ['Dawn Break', 'Echo Call', 'Dreamwalk'],
    correctIdx: 2,
    rewardCoins: 10,
    explanation: 'Dreamwalk lets you stride in swift Moon Road stardust and attunes Moon’s Tea House.',
  },
  {
    id: 'triv-4',
    question: 'Who is Dune Dave’s supreme, low-drama pet rock companion?',
    options: ['Gloria', 'Gary', 'Bramble'],
    correctIdx: 1,
    rewardCoins: 10,
    explanation: 'Gary the Pet Rock provides 100% emotional support and zero drama.',
  },
  {
    id: 'triv-5',
    question: 'How do you unlock a town center as a Song of Teleportation destination?',
    options: ['Visit the town square in person once', 'Buy 50 muffins from Pip', 'Catch a Mythic Dawn Koi'],
    correctIdx: 0,
    rewardCoins: 10,
    explanation: 'Stepping into a town square on its layer automatically attunes it for fast travel!',
  },
  {
    id: 'triv-6',
    question: 'Who greets travelers down in Glowdeep Caverns beside Rooted Rest?',
    options: ['Queen Nimbus', 'Lumi the Axolotl', 'Wisp the Cloud'],
    correctIdx: 1,
    rewardCoins: 10,
    explanation: 'Lumi tends Nana Mochi’s glowing cauldron and crystal gondola station in Glowdeep!',
  },
  {
    id: 'triv-7',
    question: 'Which island is famous for boiling springs and Ember’s warm hearth?',
    options: ['Cinder Cradle', 'Mirror Fens', 'Honeycomb Hills'],
    correctIdx: 0,
    rewardCoins: 10,
    explanation: 'Cinder Cradle sits to the south, home to glowing lava lamps and hot springs.',
  },
  {
    id: 'triv-8',
    question: 'Which spell helps nearby shy Hollows bloom back into radiant color?',
    options: ['Frost Bridge', 'Hush Hug', 'Glimmer Step'],
    correctIdx: 1,
    rewardCoins: 10,
    explanation: 'Hush Hug wraps lonely Hollow spirits in golden empathy and warmth!',
  },
  {
    id: 'triv-9',
    question: 'Where can you drink chamomile twilight tea on a silver constellation highway?',
    options: ['Tidepool Lighthouse', 'The Moon’s Tea House', 'Driftwood Bakery'],
    correctIdx: 1,
    rewardCoins: 10,
    explanation: 'The Moon’s Tea House welcomes dreamwalkers at the heart of Moon Road!',
  },
  {
    id: 'triv-10',
    question: 'Which collectible item do you find floating high above the clouds in Sky Kingdom?',
    options: ['Cloud Feathers', 'Sea Pearls', 'Glowcap Spores'],
    correctIdx: 0,
    rewardCoins: 10,
    explanation: 'Soaring through Rainbow Rings with Cloud Wings reveals shimmering Cloud Feathers!',
  },
  {
    id: 'triv-11',
    question: 'What did Pip accidentally bake with too much Cirrus cloud yeast?',
    options: ['Bouncing baguettes', 'Flying cloud muffins', 'Singing waffles'],
    correctIdx: 1,
    rewardCoins: 10,
    explanation: 'Pip’s cloud muffins regularly drift right up toward the Sky Court!',
  },
  {
    id: 'triv-12',
    question: 'Which spell sends a golden sonar pulse to reveal hidden Memory Echoes and Diary Pages?',
    options: ['Echo Call', 'Tide Song', 'Bloom'],
    correctIdx: 0,
    rewardCoins: 10,
    explanation: 'Echo Call resonates across land, sea, caves, and stars to uncover hidden lore!',
  },
  {
    id: 'triv-13',
    question: 'Who keeps watch at the eastern Dawn Spire overlooking sunrise?',
    options: ['Aurelle', 'Tidbit', 'Bumble'],
    correctIdx: 0,
    rewardCoins: 10,
    explanation: 'Aurelle awaits the Dawn Duet high atop the eastern summit of Dawn Spire.',
  },
  {
    id: 'triv-14',
    question: 'How much Mana does fast-traveling to an unlocked town on the Map cost?',
    options: ['10 MP', '25 MP', '60 MP'],
    correctIdx: 1,
    rewardCoins: 10,
    explanation: 'Singing the Song of Teleportation to any visited town takes 25 MP!',
  },
  {
    id: 'triv-15',
    question: 'Which island sits in the snowy northeast crowned by emerald auroras?',
    options: ['Aurora Reach', 'Chime Canopy', 'Tidepool Atoll'],
    correctIdx: 0,
    rewardCoins: 10,
    explanation: 'Aurora Reach sparkles with frosted crystal caves and dancing emerald auroras.',
  },
  {
    id: 'triv-16',
    question: 'What keeps Gloria and Gary busy for hundreds of hours at Sandy Shore?',
    options: ['Chess', 'A rock-solid staring contest', 'Tap dancing'],
    correctIdx: 1,
    rewardCoins: 10,
    explanation: 'Having zero eyelids gives both pebbles unstoppable staring stamina!',
  },
];

function buildLiveWireLines(slot: number, ctx?: GazetteWorldContext): string[] {
  const wires: string[] = [];
  if (ctx?.playerName && ctx?.currentBiomeName) {
    wires.push(`Field Sighting: ${ctx.playerName} spotted exploring ${ctx.currentBiomeName}.`);
  }
  if (typeof ctx?.visitedTownsCount === 'number' && ctx.visitedTownsCount > 0) {
    wires.push(
      `Waystone Desk: ${ctx.visitedTownsCount} settlement${ctx.visitedTownsCount === 1 ? '' : 's'} now attuned for Map Teleportation.`
    );
  }
  if (typeof ctx?.friendsGot === 'number' && ctx.friendsGot > 0) {
    wires.push(`Island Census: ${ctx.friendsGot} loyal friend${ctx.friendsGot === 1 ? '' : 's'} cheering Mochi on across the realms!`);
  }
  if (typeof ctx?.starsGot === 'number' || typeof ctx?.pearlsGot === 'number' || typeof ctx?.feathersGot === 'number') {
    const s = ctx?.starsGot ?? 0;
    const p = ctx?.pearlsGot ?? 0;
    const f = ctx?.feathersGot ?? 0;
    wires.push(`Treasure Ledger: ${s} Star Gems · ${p} Sea Pearls · ${f} Cloud Feathers catalogued so far.`);
  }

  const ambientWires = [
    'Harbor Clock: Puddle II next mini-cruise departs Driftwood Dock shortly.',
    'Sky Traffic: Clear thermals reported between Nimbus Market and Dawn Spire.',
    'Tea Kettle Check: Dusk has freshly steeped starlight chamomile at Moon Road.',
    'Meadow Soundcheck: Bellwood chimes tuned to sunny pentatonic C major.',
    'Tidepool Alert: Two shiny clams sighted humming along Pearl Reef shoals.',
    'Bakery Aroma: Cinnamon puffs cooling on Pip’s windowsill—handle with nets.',
  ];
  while (wires.length < 3) {
    const idx = (slot + wires.length * 2) % ambientWires.length;
    if (!wires.includes(ambientWires[idx])) {
      wires.push(ambientWires[idx]);
    } else {
      break;
    }
  }
  return wires.slice(0, 3);
}

export function getDailyGazetteIssue(
  dateKey: string = getLocalDateKey(),
  slotOffset: number = 0,
  worldContext?: GazetteWorldContext,
  nowMs: number = Date.now()
): DailyGazetteIssue {
  const dayIdx = getDayIndex(dateKey);
  const realSlot = getCurrentEditionSlot(nowMs);
  const slot = Math.max(1, realSlot + Math.max(0, slotOffset));

  const story = DAILY_LEAD_STORIES[slot % DAILY_LEAD_STORIES.length];

  // Rotate 3 unique comic strips frequently using coprime strides
  const totalComics = GAZETTE_COMICS.length;
  const c1 = GAZETTE_COMICS[slot % totalComics];
  const c2 = GAZETTE_COMICS[(slot * 5 + 3) % totalComics];
  const c3 = GAZETTE_COMICS[(slot * 11 + 7) % totalComics];
  const comics = Array.from(new Map([[c1.id, c1], [c2.id, c2], [c3.id, c3]]).values());
  let offset = 1;
  while (comics.length < 3 && offset < totalComics) {
    const candidate = GAZETTE_COMICS[(slot + offset) % totalComics];
    if (!comics.some((c) => c.id === candidate.id)) comics.push(candidate);
    offset++;
  }

  // Pick 3 distinct briefs using coprime strides
  const briefs: GazetteBrief[] = [];
  const briefTotal = DAILY_BRIEFS_POOL.length;
  [slot * 5, slot * 11 + 3, slot * 17 + 7].forEach((rawIdx, i) => {
    let idx = rawIdx % briefTotal;
    let tries = 0;
    while (briefs.some((b) => b.title === DAILY_BRIEFS_POOL[idx].title) && tries < briefTotal) {
      idx = (idx + 1 + i) % briefTotal;
      tries++;
    }
    briefs.push(DAILY_BRIEFS_POOL[idx]);
  });

  // Independent prime strides keep horoscope, lucky item, weather, and trivia fresh on every print
  const horoIdx = (slot * 7 + dayIdx) % DAILY_HOROSCOPES.length;
  const luckyIdx = (slot * 13 + 2) % LUCKY_ITEMS.length;
  const weatherIdx = (slot * 3 + 1) % WEATHER_DISPATCHES.length;
  const triviaIdx = (slot * 5 + 4) % DAILY_TRIVIA_POOL.length;
  const tagIdx = slot % EDITION_TAGS.length;
  const issueNum = 100 + ((slot - Math.floor(new Date(2025, 0, 1).getTime() / GAZETTE_EDITION_INTERVAL_MS)) % 9000);

  return {
    dateKey,
    editionKey: `${dateKey}-s${slot}`,
    editionTag: EDITION_TAGS[tagIdx],
    dateLabel: formatReadableDate(dateKey),
    issueNumber: Math.max(1, issueNum),
    editionPrice: 12,
    kicker: story.kicker,
    headline: story.headline,
    subhead: story.subhead,
    byline: story.byline,
    leadBody: story.body,
    briefs,
    liveWire: buildLiveWireLines(slot, worldContext),
    horoscope: DAILY_HOROSCOPES[horoIdx],
    luckyItem: LUCKY_ITEMS[luckyIdx],
    weatherSummary: WEATHER_DISPATCHES[weatherIdx],
    comics,
    trivia: DAILY_TRIVIA_POOL[triviaIdx],
  };
}

export function loadGazetteLibrary(): GazetteLibraryItem[] {
  try {
    const raw = localStorage.getItem(GAZETTE_LIBRARY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGazetteLibrary(items: GazetteLibraryItem[]): void {
  try {
    localStorage.setItem(GAZETTE_LIBRARY_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage quota errors gracefully
  }
}
