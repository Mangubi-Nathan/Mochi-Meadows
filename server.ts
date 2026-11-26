import express, { Request, Response } from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// In-memory Cloud Saves and Community Bottles store
interface CloudSave {
  slot: string;
  updatedAt: string;
  playerName: string;
  data: any;
}

const cloudSaves: Record<string, CloudSave> = {};

interface BottleMessage {
  id: string;
  sender: string;
  location: 'sea' | 'sky' | 'meadow';
  message: string;
  timestamp: string;
  likes: number;
}

const defaultBottles: BottleMessage[] = [
  {
    id: 'b-1',
    sender: 'Captain Barnacle',
    location: 'sea',
    message: 'To whoever finds this: me ship is still a puddle, but the view is magnificent! Yo ho hum.',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    likes: 8,
  },
  {
    id: 'b-2',
    sender: 'Wisp',
    location: 'sky',
    message: 'Forecast for whoever catches this breeze: 90% chance of cozy vibes and a 10% chance of floating muffins.',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    likes: 12,
  },
  {
    id: 'b-3',
    sender: 'Moss',
    location: 'meadow',
    message: 'The great oak whispered: "Remember to breathe and touch the grass today." Hugs from the forest floor.',
    timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
    likes: 15,
  },
  {
    id: 'b-4',
    sender: 'Marlo',
    location: 'sea',
    message: 'Special underwater delivery! Don’t let this bottle get too salty. Keep exploring every coral shelf!',
    timestamp: new Date().toISOString(),
    likes: 6,
  },
];

let bottles: BottleMessage[] = [...defaultBottles];

// Gemini AI Client setup
let ai: GoogleGenAI | null = null;
const isValidKey = Boolean(
  process.env.GEMINI_API_KEY &&
  process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
  process.env.GEMINI_API_KEY.length > 10
);

if (isValidKey) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. API: AI Villager Chat
app.post('/api/chat', async (req: Request, res: Response) => {
  const {
    npcName,
    npcRole,
    playerMessage,
    playerName,
    isFriend,
    history = [],
    lullabyDone = false,
    currentChapter = 1,
    weather,
  } = req.body;

  if (!npcName || !playerMessage) {
    return res.status(400).json({ error: 'Missing npcName or playerMessage' });
  }

  if (!ai || !isValidKey) {
    return res.status(503).json({
      error: 'AI is not configured on the server, falling back to local dialog',
      fallback: true,
    });
  }

  try {
    const weatherContext = weather
      ? `Current Island Weather: ${weather.name} (${weather.description}).
Your Weather Reaction: React naturally to this weather! In rain/drizzle, you might mention seeking shelter or huddling under leafy branches; in sunny warmth, you might dance or bask; in stardust, you feel mystical or weightless; in snow, you comment on building snow mochis, snowflakes on your nose, or frosty paws.`
      : '';

    const systemPrompt = `You are ${npcName}, ${npcRole}, a beloved character living on a dreamy island in the cozy exploration game "Mochi Meadows".
The island was hummed into being by the Moon. A quiet storm called the Hush scattered the Moon's Lullaby into star gems across land, pearls underwater, and cloud feathers in the floating Sky Kingdom. The Great Lantern Tree at the island's heart was silenced.
${lullabyDone ? 'The Lullaby has been restored and the Lantern Tree is glowing brightly!' : `The player is currently in Chapter ${currentChapter} of the quest to sing the Tree awake.`}
Player character's name is "${playerName || 'Mochi'}", a soft, glowing, friendly mochi creature.
${isFriend ? `You and ${playerName || 'Mochi'} are close friends.` : `You are getting to know ${playerName || 'Mochi'}.`}
${weatherContext}

Roleplay Rules:
- Reply in 1 to 2 short, cozy sentences (under 35 words).
- Speak in character with gentle humor, warmth, and whimsical personality.
- Plain text only. Max 1 emoji.
- Never mention being an AI or language model.
- Stay immersive in the cozy fantasy world of Mochi Meadows.`;

    const formattedHistory = history.slice(-6).map((h: { player: string; npc: string }) => 
      `Player: ${h.player}\n${npcName}: ${h.npc}`
    ).join('\n');

    const promptText = `${formattedHistory ? `${formattedHistory}\n` : ''}Player: ${playerMessage}\n${npcName}:`;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI response timeout')), 5000)
    );

    const generatePromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);

    const reply = response.text ? response.text.trim() : '';
    if (!reply) {
      return res.status(500).json({ error: 'Empty response from model', fallback: true });
    }

    return res.json({ reply });
  } catch (err: any) {
    console.error('Error in /api/chat:', err);
    return res.status(500).json({
      error: err?.message || 'Gemini chat error',
      fallback: true,
    });
  }
});

// 2. API: Cloud Saves
app.get('/api/saves', (req: Request, res: Response) => {
  const slots = Object.keys(cloudSaves).map((slotKey) => ({
    slot: slotKey,
    playerName: cloudSaves[slotKey].playerName,
    updatedAt: cloudSaves[slotKey].updatedAt,
  }));
  res.json({ slots });
});

app.get('/api/saves/:slot', (req: Request, res: Response) => {
  const { slot } = req.params;
  const save = cloudSaves[slot];
  if (!save) {
    return res.status(404).json({ error: 'Save slot not found' });
  }
  res.json(save);
});

app.post('/api/saves/:slot', (req: Request, res: Response) => {
  const { slot } = req.params;
  const { data, playerName } = req.body;
  if (!data) {
    return res.status(400).json({ error: 'No save data provided' });
  }
  cloudSaves[slot] = {
    slot,
    playerName: playerName || 'Mochi Explorer',
    updatedAt: new Date().toISOString(),
    data,
  };
  res.json({ success: true, slot, updatedAt: cloudSaves[slot].updatedAt });
});

// 3. API: Messages in a Bottle / Sky Letters
app.get('/api/bottles', (req: Request, res: Response) => {
  res.json({ bottles });
});

app.post('/api/bottles', (req: Request, res: Response) => {
  const { sender, location = 'sea', message } = req.body;
  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  const newBottle: BottleMessage = {
    id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sender: sender?.trim() || 'Anonymous Mochi',
    location: location === 'sky' ? 'sky' : location === 'meadow' ? 'meadow' : 'sea',
    message: message.trim().slice(0, 140),
    timestamp: new Date().toISOString(),
    likes: 1,
  };

  bottles.unshift(newBottle);
  if (bottles.length > 50) bottles.pop();

  res.status(201).json({ success: true, bottle: newBottle });
});

app.post('/api/bottles/:id/like', (req: Request, res: Response) => {
  const { id } = req.params;
  const bottle = bottles.find((b) => b.id === id);
  if (!bottle) {
    return res.status(404).json({ error: 'Bottle not found' });
  }
  bottle.likes += 1;
  res.json({ success: true, likes: bottle.likes });
});

// 4. API: Island Gazette (rotating edition headline, horoscope & weather desk)
app.get('/api/gazette', async (req: Request, res: Response) => {
  const dateParam = typeof req.query.date === 'string' ? req.query.date : '';
  const slotParam = typeof req.query.slot === 'string' ? req.query.slot : '';
  const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
    ? new Date(`${dateParam}T12:00:00`)
    : new Date();

  let aiNews = '';
  if (ai && isValidKey) {
    try {
      const themes = [
        'Pip’s runaway muffins or cozy bakery news',
        'Captain Barnacle’s Puddle II tidepool voyage',
        'Glowdeep luminescent mushrooms and crystal gondolas',
        'Sky Court cumulus gliders and Rainbow Rings',
        'Moon Road chamomile tea and stargazing rumors',
        'Ember’s hot springs and Aurora Reach frost skating',
      ];
      const slotNum = Number.parseInt(slotParam, 10) || Math.floor(Date.now() / 120000);
      const themeHint = themes[Math.abs(slotNum) % themes.length];
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Write a whimsical 1-sentence breaking wire dispatch (edition #${slotNum}) about ${themeHint} for the "Meadows Gazette" dated ${targetDate.toDateString()} on a cozy fantasy archipelago where mochis live.`,
        config: {
          systemInstruction: 'You are the whimsical editor of the Meadows Gazette. Return plain text only, under 22 words.',
        },
      });
      aiNews = response.text ? response.text.trim() : '';
    } catch (e) {
      // deterministic client-side edition remains primary
    }
  }

  res.json({
    date: targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }),
    headline: aiNews || '',
  });
});

// Full-stack Vite / Static integration
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Mochi Meadows Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
