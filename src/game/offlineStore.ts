// Offline-first asset warming, bottle message syncing, and cloud/vault save mirroring
// Ensures 100% feature parity when Mochi Meadows 2 is downloaded & played offline.

export interface BottleMessage {
  id: string;
  sender: string;
  location: 'sea' | 'sky' | 'meadow';
  message: string;
  timestamp: string;
  likes: number;
  pendingSync?: boolean;
}

export interface BackupSlotMeta {
  slot: string;
  playerName: string;
  updatedAt: string;
  pendingSync?: boolean;
  source: 'cloud' | 'offline-vault';
}

interface StoredCloudSlot {
  slot: string;
  playerName: string;
  updatedAt: string;
  data: any;
  pendingSync?: boolean;
}

const BOTTLES_CACHE_KEY = 'mm2_bottles_cache_v1';
const PENDING_LIKES_KEY = 'mm2_bottles_pending_likes_v1';
const CLOUD_MIRROR_KEY = 'mm2_cloud_mirror_v1';

const GOOGLE_FONTS_CSS_URL =
  'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,700&family=Nunito:wght@600;700;800;900&display=swap';

const SEED_BOTTLES: BottleMessage[] = [
  {
    id: 'b-seed-1',
    sender: 'Captain Barnacle',
    location: 'sea',
    message: 'To whoever finds this: me ship is still a puddle, but the reef view is magnificent! Yo ho hum.',
    timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
    likes: 8,
  },
  {
    id: 'b-seed-2',
    sender: 'Wisp',
    location: 'sky',
    message: 'Forecast for whoever catches this breeze: 90% chance of cozy vibes and a 10% chance of floating muffins.',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    likes: 12,
  },
  {
    id: 'b-seed-3',
    sender: 'Moss',
    location: 'meadow',
    message: 'The great oak whispered: "Remember to breathe and watch the fireflies tonight." Hugs from the moss floor.',
    timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    likes: 15,
  },
  {
    id: 'b-seed-4',
    sender: 'Marlo',
    location: 'sea',
    message: 'Special underwater delivery! Explore every coral shelf in Lullaby Reef to spot glowing sea pearls.',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    likes: 9,
  },
  {
    id: 'b-seed-5',
    sender: 'Pip',
    location: 'meadow',
    message: 'Left a warm honey muffin by the Lantern Tree bench for weary travelers. Bake happy!',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    likes: 14,
  },
];

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Warms Google Fonts (Fraunces + Nunito CSS + woff2 font files), requests persistent
 * storage so mobile OSes never evict game data, and checks SW readiness.
 */
export async function warmOfflineBundle(): Promise<{
  swActive: boolean;
  fontsCached: boolean;
}> {
  let swActive = false;
  let fontsCached = false;

  try {
    if ('storage' in navigator && typeof navigator.storage.persist === 'function') {
      navigator.storage.persist().catch(() => {});
    }
  } catch {
    // Ignore
  }

  try {
    if ('serviceWorker' in navigator) {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1800)),
      ]);
      swActive = Boolean(reg && (reg.active || navigator.serviceWorker.controller));
    }
  } catch {
    swActive = false;
  }

  // Explicitly prefetch & cache Google Fonts CSS and referenced woff2 font assets
  try {
    if ('caches' in window && navigator.onLine) {
      const cssCache = await caches.open('google-fonts-cache');
      const fontCache = await caches.open('gstatic-fonts-cache');

      const cssRes = await fetch(GOOGLE_FONTS_CSS_URL, { mode: 'cors' });
      if (cssRes.ok) {
        const cssText = await cssRes.clone().text();
        await cssCache.put(GOOGLE_FONTS_CSS_URL, cssRes);

        const matches = Array.from(cssText.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g));
        const fontUrls = Array.from(new Set(matches.map((m) => m[1])));
        await Promise.allSettled(
          fontUrls.map(async (u) => {
            const existing = await fontCache.match(u);
            if (!existing) {
              const r = await fetch(u, { mode: 'cors' });
              if (r.ok) await fontCache.put(u, r);
            }
          })
        );
        fontsCached = fontUrls.length > 0;
      }
    } else if ('caches' in window) {
      const cssCache = await caches.open('google-fonts-cache');
      fontsCached = Boolean(await cssCache.match(GOOGLE_FONTS_CSS_URL));
    }
  } catch {
    // Offline fallback fonts in index.css handle rendering gracefully
  }

  return { swActive, fontsCached };
}

// ==========================================
// 1. Offline-First Bottles & Sky Letters
// ==========================================

export function getCachedBottles(): BottleMessage[] {
  const cached = readJson<BottleMessage[] | null>(BOTTLES_CACHE_KEY, null);
  if (cached && cached.length > 0) return cached;
  writeJson(BOTTLES_CACHE_KEY, SEED_BOTTLES);
  return [...SEED_BOTTLES];
}

export async function fetchBottlesOfflineFirst(): Promise<{
  bottles: BottleMessage[];
  offline: boolean;
}> {
  const local = getCachedBottles();
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { bottles: local, offline: true };
  }

  try {
    // Push any pending offline bottles first
    await syncPendingBottles();

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 3000);
    const res = await fetch('/api/bottles', { signal: controller.signal });
    window.clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const serverList: BottleMessage[] = Array.isArray(data.bottles) ? data.bottles : [];
      // Merge unsynced local posts with server bottles
      const unsynced = getCachedBottles().filter((b) => b.pendingSync);
      const merged = [
        ...unsynced,
        ...serverList.filter((sb) => !unsynced.some((ub) => ub.id === sb.id)),
      ];
      const finalList = merged.length > 0 ? merged : SEED_BOTTLES;
      writeJson(BOTTLES_CACHE_KEY, finalList);
      return { bottles: finalList, offline: false };
    }
  } catch {
    // Fall back silently to local cached bottles
  }

  return { bottles: local, offline: true };
}

export async function castBottleOfflineFirst(payload: {
  sender: string;
  location: 'sea' | 'sky' | 'meadow';
  message: string;
}): Promise<{ bottle: BottleMessage; syncedOnline: boolean }> {
  const optimistic: BottleMessage = {
    id: `b-local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sender: payload.sender.trim() || 'Mochi Traveler',
    location: payload.location,
    message: payload.message.trim().slice(0, 140),
    timestamp: new Date().toISOString(),
    likes: 1,
    pendingSync: true,
  };

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 3000);
      const res = await fetch('/api/bottles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      window.clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        const saved: BottleMessage = data.bottle || { ...optimistic, pendingSync: false };
        const updated = [saved, ...getCachedBottles().filter((b) => b.id !== saved.id)].slice(0, 60);
        writeJson(BOTTLES_CACHE_KEY, updated);
        return { bottle: saved, syncedOnline: true };
      }
    } catch {
      // Save locally below and sync later
    }
  }

  const updated = [optimistic, ...getCachedBottles()].slice(0, 60);
  writeJson(BOTTLES_CACHE_KEY, updated);
  return { bottle: optimistic, syncedOnline: false };
}

export async function likeBottleOfflineFirst(id: string): Promise<number> {
  const current = getCachedBottles();
  let nextLikes = 1;
  const updated = current.map((b) => {
    if (b.id === id) {
      nextLikes = (b.likes || 0) + 1;
      return { ...b, likes: nextLikes };
    }
    return b;
  });
  writeJson(BOTTLES_CACHE_KEY, updated);

  if (typeof navigator !== 'undefined' && navigator.onLine && !id.startsWith('b-local-') && !id.startsWith('b-seed-')) {
    try {
      const res = await fetch(`/api/bottles/${id}/like`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.likes === 'number') {
          nextLikes = data.likes;
          writeJson(
            BOTTLES_CACHE_KEY,
            getCachedBottles().map((b) => (b.id === id ? { ...b, likes: nextLikes } : b))
          );
          return nextLikes;
        }
      }
    } catch {
      // Queue like below
    }
  }

  const pendingLikes = readJson<string[]>(PENDING_LIKES_KEY, []);
  if (!id.startsWith('b-local-') && !id.startsWith('b-seed-')) {
    pendingLikes.push(id);
    writeJson(PENDING_LIKES_KEY, pendingLikes.slice(-40));
  }
  return nextLikes;
}

export async function syncPendingBottles(): Promise<number> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 0;
  let syncedCount = 0;

  const current = getCachedBottles();
  const pending = current.filter((b) => b.pendingSync);
  if (pending.length > 0) {
    const remaining: BottleMessage[] = [];
    for (const b of current) {
      if (!b.pendingSync) {
        remaining.push(b);
        continue;
      }
      try {
        const res = await fetch('/api/bottles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: b.sender,
            location: b.location,
            message: b.message,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          remaining.push(data.bottle || { ...b, pendingSync: false });
          syncedCount++;
        } else {
          remaining.push(b);
        }
      } catch {
        remaining.push(b);
      }
    }
    writeJson(BOTTLES_CACHE_KEY, remaining);
  }

  const pendingLikes = readJson<string[]>(PENDING_LIKES_KEY, []);
  if (pendingLikes.length > 0) {
    const failedLikes: string[] = [];
    for (const id of pendingLikes) {
      try {
        const res = await fetch(`/api/bottles/${id}/like`, { method: 'POST' });
        if (!res.ok && res.status !== 404) failedLikes.push(id);
      } catch {
        failedLikes.push(id);
      }
    }
    writeJson(PENDING_LIKES_KEY, failedLikes);
  }

  return syncedCount;
}

// ==========================================
// 2. Offline-First Cloud & Vault Save Slots
// ==========================================

function readCloudMirror(): Record<string, StoredCloudSlot> {
  return readJson<Record<string, StoredCloudSlot>>(CLOUD_MIRROR_KEY, {});
}

function writeCloudMirror(mirror: Record<string, StoredCloudSlot>): void {
  writeJson(CLOUD_MIRROR_KEY, mirror);
}

export async function listBackupSlotsOfflineFirst(): Promise<{
  slots: BackupSlotMeta[];
  offline: boolean;
}> {
  const mirror = readCloudMirror();
  const localMetas: BackupSlotMeta[] = Object.values(mirror).map((m) => ({
    slot: m.slot,
    playerName: m.playerName,
    updatedAt: m.updatedAt,
    pendingSync: Boolean(m.pendingSync),
    source: 'offline-vault',
  }));

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { slots: localMetas, offline: true };
  }

  try {
    await syncPendingCloudSaves();
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 3000);
    const res = await fetch('/api/saves', { signal: controller.signal });
    window.clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const cloudList: { slot: string; playerName: string; updatedAt: string }[] = data.slots || [];
      const combined = new Map<string, BackupSlotMeta>();

      localMetas.forEach((m) => combined.set(m.slot, m));
      cloudList.forEach((c) => {
        const local = combined.get(c.slot);
        if (!local || (!local.pendingSync && new Date(c.updatedAt) >= new Date(local.updatedAt))) {
          combined.set(c.slot, {
            slot: c.slot,
            playerName: c.playerName,
            updatedAt: c.updatedAt,
            source: 'cloud',
          });
        }
      });

      return { slots: Array.from(combined.values()), offline: false };
    }
  } catch {
    // Fallback to offline vault mirror
  }

  return { slots: localMetas, offline: true };
}

export async function uploadBackupSlotOfflineFirst(
  slotName: string,
  playerName: string,
  data: any
): Promise<{ updatedAt: string; syncedOnline: boolean }> {
  const nowIso = new Date().toISOString();
  const mirror = readCloudMirror();
  mirror[slotName] = {
    slot: slotName,
    playerName: playerName || 'Mochi Explorer',
    updatedAt: nowIso,
    data,
    pendingSync: true,
  };
  writeCloudMirror(mirror);

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`/api/saves/${slotName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, data }),
        signal: controller.signal,
      });
      window.clearTimeout(timer);

      if (res.ok) {
        const json = await res.json();
        const nextMirror = readCloudMirror();
        if (nextMirror[slotName]) {
          nextMirror[slotName].pendingSync = false;
          if (json.updatedAt) nextMirror[slotName].updatedAt = json.updatedAt;
          writeCloudMirror(nextMirror);
        }
        return { updatedAt: json.updatedAt || nowIso, syncedOnline: true };
      }
    } catch {
      // Remain queued in local vault
    }
  }

  return { updatedAt: nowIso, syncedOnline: false };
}

export async function downloadBackupSlotOfflineFirst(slotName: string): Promise<{
  data: any | null;
  source: 'cloud' | 'offline-vault' | 'missing';
}> {
  const mirror = readCloudMirror();
  const localSlot = mirror[slotName];

  if (typeof navigator !== 'undefined' && navigator.onLine && !localSlot?.pendingSync) {
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`/api/saves/${slotName}`, { signal: controller.signal });
      window.clearTimeout(timer);

      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          mirror[slotName] = {
            slot: slotName,
            playerName: json.playerName || 'Mochi Explorer',
            updatedAt: json.updatedAt || new Date().toISOString(),
            data: json.data,
            pendingSync: false,
          };
          writeCloudMirror(mirror);
          return { data: json.data, source: 'cloud' };
        }
      }
    } catch {
      // Fall back to local vault
    }
  }

  if (localSlot?.data) {
    return { data: localSlot.data, source: 'offline-vault' };
  }

  return { data: null, source: 'missing' };
}

export async function syncPendingCloudSaves(): Promise<number> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 0;
  const mirror = readCloudMirror();
  let synced = 0;

  for (const key of Object.keys(mirror)) {
    const slot = mirror[key];
    if (!slot.pendingSync || !slot.data) continue;
    try {
      const res = await fetch(`/api/saves/${slot.slot}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: slot.playerName, data: slot.data }),
      });
      if (res.ok) {
        const json = await res.json();
        slot.pendingSync = false;
        if (json.updatedAt) slot.updatedAt = json.updatedAt;
        synced++;
      }
    } catch {
      // Keep pending
    }
  }

  if (synced > 0) writeCloudMirror(mirror);
  return synced;
}

export async function syncAllOfflineQueues(): Promise<{ bottlesSynced: number; savesSynced: number }> {
  const [bottlesSynced, savesSynced] = await Promise.all([
    syncPendingBottles(),
    syncPendingCloudSaves(),
  ]);
  return { bottlesSynced, savesSynced };
}
