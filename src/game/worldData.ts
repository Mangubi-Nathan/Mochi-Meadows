/**
 * Complete Data for Mochi Meadows 2: The Dawn Duet
 * 72 Characters, 12 Story Chapters in 3 Acts, 7 Verses of Reveille + Unsung Verse,
 * 20 Settlements across the 8 Islands & 5 Layers, Memory Echoes, and Moon Diary.
 */

import { CutsceneSlide, csg, csStars, csMoon, csSea, csIsland, csTree, csCampfire, csStage, csFloatingNotes, csWhale, csWings, csLitTree } from './cutscenes';
import { drawMochi } from './characterRenderer';
import { Quest, ReveilleVerse, MemoryEcho, MoonDiaryEntry } from './engine';
import { WORLD_ANCHORS } from './worldAnchors';

export interface BaseNPCData {
  n: string;
  r: string;
  bi: number;
  sp: string;
  col: string;
  hat: string;
  g: string;
  t: [string, string][];
  i: string[];
  qp: string[];
  e: string;
  island?: string;
  layer?: number; // 0 = ground, 1 = sea, 2 = sky, 3 = glowdeep, 4 = moonroad
  at?: string;
  o?: [number, number];
}

// 72 Characters: 26 returning with new arcs + new faces
export const ALL_CHARACTERS_MM2: BaseNPCData[] = [
  // --- Returning Friends with MM2 Arcs ---
  {
    n: 'Pip',
    r: 'baker on the Puddle II whose cloud muffins are still escaping',
    bi: 3,
    sp: 'bunny',
    col: '#ffffff',
    hat: 'leaf',
    island: 'Lantern Isle',
    layer: 0,
    g: 'Oh! You’re awake! Look at the horizon—something bright and warm just answered the Lantern Tree!',
    t: [
      ['Are the muffins still floating?', 'Worse! They’re flying. Yesterday one drifted all the way to Honeycomb Hills. The bees thought it was a cloud and built a comb in it.'],
      ['Tell me about the Puddle II', 'Captain Barnacle expanded his puddle into a real wooden schooner! It has a floating bakery in the galley. We can sail to other islands now!'],
      ['Have you seen the grey stranger?', 'Yes… poor little thing. He looked so lonely. I gave him a muffin, and he held it like a tiny treasure.'],
    ],
    i: ['Muffins afloat!', 'Catch that roll!', 'The sunrise hums!'],
    qp: ['Did you hear that note on the wind? It sounded like morning.', 'Doris says hello! (adjusts leaf hat) She’s my compass now.'],
    e: 'You’re my best friend across all eight islands! Take this Golden Cloud Muffin. 🧁',
  },
  {
    n: 'Captain Barnacle',
    r: 'proud captain of the Puddle II, facing the deep sea with courage',
    bi: 2,
    sp: 'bear',
    col: '#c9a27e',
    hat: 'pirate',
    island: 'Lantern Isle',
    layer: 0,
    g: 'Ahoy, first mate! The Puddle is no longer a puddle! She’s the Puddle II, queen of the sea lanes!',
    t: [
      ['Are you still afraid of deep water?', 'Arr… slightly. But as long as the sails catch Tide Song and Gloria the rock is onboard, I feel twenty feet tall!'],
      ['Where can we sail?', 'Tidepool Atoll, Cinder Cradle, Mirror Fens… the whole Starlit Archipelago is waiting! Just press B at any dock.'],
      ['Who is Tidbit?', 'The lighthouse keeper at the Atoll! Poor lad’s afraid of the dark. We need to help him light the great beacon.'],
    ],
    i: ['Full sail ahead!', 'Anchors aweigh!', 'Mind the spray!'],
    qp: ['Yo ho hum, the morning has come!', 'Never let an octopus steer. Too many elbows.'],
    e: 'Ye’ve sailed every wave with me. Ye’re an honorary Commodore of the Archipelago!',
  },
  {
    n: 'Gloom',
    r: 'a shy grey Hollow who holds an antique button and hums a lonely note',
    bi: 3,
    sp: 'slime',
    col: '#9e9ea8',
    hat: 'none',
    island: 'Lantern Isle',
    layer: 0,
    g: '… (holds up a small brass button and tilts his head softly) …hummm…',
    t: [
      ['Where did you come from?', '…past the edge… where the music stopped… but here… it is warm.'],
      ['What is that button?', '…it was on a coat… a long time ago… when someone held my hand.'],
      ['Will you travel with me?', '…with you? (his chest glows with a faint golden spark) …yes.'],
    ],
    i: ['…hummm…', '…warm…', '…listening…'],
    qp: ['…the notes are coming back…', '…you did not walk away… thank you…'],
    e: 'Gloom smiles for the first time in a thousand years. Radiant color blooms across his fluffy form!',
  },
  {
    n: 'Wick',
    r: 'anxious leader of the Lantern Keepers guarding the Tree’s portals',
    bi: 3,
    sp: 'owl',
    col: '#b48cff',
    hat: 'lantern_cap',
    island: 'Lantern Isle',
    layer: 0,
    g: 'A light for whoever comes home! I am Wick. The Lantern Doors are opening beneath the roots!',
    t: [
      ['What are the Lantern Doors?', 'Portals connecting our Tree to each of the eight sleeping realms. As you wake each Sleeper, a new door illuminates!'],
      ['Why did you keep it secret?', 'We knew that waking the island means ending the dream. But we see now… the dream must wake into morning, not silence.'],
    ],
    i: ['Keep the wick trimmed!', 'Watch the flame!', 'The door stirs!'],
    qp: ['The Dawn is near. Can you feel the gentle warmth in the stones?'],
    e: 'The Lantern Keepers pledge their eternal friendship. The flame will never go out!',
  },
  {
    n: 'Bumble',
    r: 'a gentle bear beekeeper in Honeycomb Hills who speaks in hums',
    bi: 9,
    sp: 'bear',
    col: '#ffd23f',
    hat: 'straw',
    island: 'Honeycomb Hills',
    layer: 0,
    g: 'Mmm-hmmm! Welcome to Honeycomb Hills! The clover is sweet, but our bees have lost their morning hum.',
    t: [
      ['How can we restore the hum?', 'The First Verse of the Reveille sleeps in the Great Windmill! Help me sing to the hives.'],
      ['What does honey tea do?', 'Soothing warmth! Take a jar to your Moonlit Cottage to restore your magic instantly.'],
    ],
    i: ['Buzzzz…', 'Sweet clover!', 'Humming softly…'],
    qp: ['The bees remember your song! Hear them buzzing in harmony?'],
    e: 'You brought the golden hum back to our hills! Here is Verse 1: Wake! 🍯',
  },
  {
    n: 'Tidbit',
    r: 'a sweet axolotl lighthouse keeper who is secretly afraid of the dark',
    bi: 11,
    sp: 'axolotl',
    col: '#ff9ebb',
    hat: 'seashell',
    island: 'Tidepool Atoll',
    layer: 0,
    g: 'Eep! Oh, hi! I’m Tidbit. I keep the lighthouse… but only during daytime. Night is very, very big.',
    t: [
      ['Why are you afraid of the dark?', 'Shadows have no melody. But when you cast Star Sense, the whole lagoon sparkles like sugar!'],
      ['What is under the tides?', 'Sunken gardens, coral caves, and Verse 2! When the tide ebbs, you can walk right to the sea caves.'],
    ],
    i: ['Tides rising!', 'Check the glass!', 'Sparkles!'],
    qp: ['You make the night feel like a starry blanket instead of a scary void.'],
    e: 'The lighthouse beam is shining across the sea! Here is Verse 2: Stretch! 🌊',
  },
  {
    n: 'Ember',
    r: 'a playful dragon hatchling who runs the hot springs and sneezes sparks',
    bi: 14,
    sp: 'dragon',
    col: '#ff6b6b',
    hat: 'none',
    island: 'Cinder Cradle',
    layer: 0,
    g: 'Achoo! 🔥 Welcome to Cinder Cradle! Don’t worry, the lava is just warm strawberry jam temperature.',
    t: [
      ['What is the Lava Lamp Festival?', 'Every season we light floating lanterns in the hot springs! But the magma pipe is clogged with cold rocks.'],
      ['Tell me about your family oven', 'Pip says her grandma baked the first morning loaf in our volcanic hearth! Baking and dragons go way back.'],
    ],
    i: ['Warm bubbles!', 'Spark sneeze!', 'So cozy!'],
    qp: ['Mend the hot springs with Ember Warmth and we’ll have a party!'],
    e: 'The springs are bubbling with joy! Here is Verse 3: Warm! 🔥',
  },
  {
    n: 'Madame Mizzle',
    r: 'a grand frog opera star in the Mirror Fens who can only sing in echoes',
    bi: 16,
    sp: 'frog',
    col: '#52d6c6',
    hat: 'flower',
    island: 'Mirror Fens',
    layer: 0,
    g: 'Ribbit-la-la! Echoes… echoes everywhere! I am Madame Mizzle, prima donna of the lily pads!',
    t: [
      ['Why can you only sing in echoes?', 'The Hush stole my soprano resonance! When I sing, only reflections answer from the fog.'],
      ['How do we find your voice?', 'Cast Echo Call near the singing weeping willows. Catch the notes that float on the water!'],
    ],
    i: ['Do re mi…', 'Ribbit diva!', 'Echoes sweet!'],
    qp: ['A duet with you is purer than morning dew on a water lily!'],
    e: 'Bravo! My true voice has returned! Here is Verse 4: Greet! 🌸',
  },
  {
    n: 'Penny and Quill',
    r: 'penguin twins in Aurora Reach who finish each other’s sentences',
    bi: 17,
    sp: 'penguin',
    col: '#3b2a45',
    hat: 'earmuffs',
    island: 'Aurora Reach',
    layer: 0,
    g: 'Penny: Hello there! / Quill: …and welcome to the snow! We hold Verse 5… / Penny: …together!',
    t: [
      ['What is the Great Sled Race?', 'Penny: You slide across the frozen ice runs… / Quill: …using Mochi Roll or your skates! Beat our record and win!'],
      ['Why is the night endless here?', 'Quill: Because the aurora forgot… / Penny: …how to wake up! Help us follow the green lights!'],
    ],
    i: ['Slide!', 'Whoosh!', 'Twin power!'],
    qp: ['Penny: You skate like… / Quill: …a shooting star!'],
    e: 'Together across the finish line! Here is Verse 5: Run! ❄️',
  },
  {
    n: 'Bellamy',
    r: 'a serene deer bell-ringer tuning the giant bells of Chime Canopy',
    bi: 19,
    sp: 'deer',
    col: '#c9a27e',
    hat: 'antlers',
    island: 'Chime Canopy',
    layer: 0,
    g: 'Listen closely… the wind in the treetops is playing an arpeggio. I am Bellamy.',
    t: [
      ['How do the bell-bridges work?', 'Each step rings a chime tuned to the pentatonic scale. If you run across them, they play a lullaby!'],
      ['What is the Great Bell?', 'At the highest canopy sits the bell that Aurelle cast before her slumber. Ring it to summon the dawn.'],
    ],
    i: ['Ding-dong…', 'Wind in the boughs', 'Pure resonance'],
    qp: ['The bells chime for you, gentle wanderer.'],
    e: 'The Great Bell rings clear across the sky! Here is Verse 6: Ring! 🔔',
  },
  {
    n: 'Lumi',
    r: 'a wise glowworm in Glowdeep who speaks only in sweet rhymes',
    bi: 14,
    sp: 'slime',
    col: '#b8f0b0',
    hat: 'mushroom',
    island: 'Lantern Isle',
    layer: 3,
    g: 'Beneath the stone where crystals gleam, I keep the roots of Nana’s dream. What brings you to this quiet deep?',
    t: [
      ['Tell me about Glowdeep', 'Where rivers flow with liquid light, and glowcaps banish every night. The gondola will take you far, beneath the realm of cloud and star.'],
      ['Where is the Seventh Verse?', 'In Nana’s roots where memories stay, until the Soup is cooked today. Seven ingredients you must find, to heal the heart and wake the mind.'],
    ],
    i: ['Glow softly…', 'Rhymes in stone', 'Spore light'],
    qp: ['The soup is boiling, warm and sweet, our long journey is nearly complete.'],
    e: 'The seventh verse awakens bright, here is Verse 7: Remember! ✨',
  },
  {
    n: 'Aurelle',
    r: 'The Dawn. Warm, bright and waking the world after ten thousand years',
    bi: 20,
    sp: 'cat',
    col: '#ffd23f',
    hat: 'crown',
    island: 'Dawn Spire',
    layer: 0,
    g: 'There you are, little note… I have waited ten thousand mornings to hear your voice again.',
    t: [
      ['Why was the world asleep?', 'My sister the Moon and I were singing. I had to follow the morning sky, and she thought I did not care. But I never stopped listening.'],
      ['Can you two sing together?', 'Yes! With you to bridge our notes, the Lullaby and Reveille will become the Dawn Duet!'],
    ],
    i: ['Golden morning', 'Warm sunlight', 'The duet stirs'],
    qp: ['Sing with me at the Spire’s peak.'],
    e: 'The morning is reborn! The Dawn Duet echoes forever across the archipelago! 🌅',
  },
  {
    n: 'The Moon',
    r: 'sleepy, kind and humorous hostess of the Tea House on the Moon Road',
    bi: 3,
    sp: 'bunny',
    col: '#e2f6ff',
    hat: 'nightcap',
    island: 'Lantern Isle',
    layer: 4,
    g: 'Yaaawn… welcome to my Tea House, little note. Sit down. The tea is brewed from starlight and chamomile.',
    t: [
      ['Did you miss the Dawn?', 'Every single night. I left notes everywhere—in shells, in stones, in muffins. I hoped someone would carry them to her.'],
      ['What about the Hollow King?', 'Dusk was the second note that slipped from my pocket. He thought he was forgotten. Tell him… dinner is ready.'],
    ],
    i: ['Sip tea…', 'Star biscuits', 'Soft yawns'],
    qp: ['You brought everyone together. That is what a real song does.'],
    e: 'The Moon hugs you tightly with celestial warmth. The sky will never be lonely again. 🌙',
  },
  {
    n: 'Dusk',
    r: 'The Hollow King, the second fallen note looking for his sibling',
    bi: 3,
    sp: 'slime',
    col: '#7a7a85',
    hat: 'none',
    island: 'Dawn Spire',
    layer: 4,
    g: '…I am sorry to stand in your way. I only wanted the silence to be gentle… so nobody would hurt.',
    t: [
      ['You are not forgotten, Dusk', '…The Moon… still remembers my name? (his wispy scarf turns golden) …We were two notes of the same chord.'],
      ['Will you sing with us?', '…Yes. I will sing the rest between the notes. Because a rest is not an end… it is where the next song lives.'],
    ],
    i: ['…whistling 4 notes…', '…gentle rest…', '…the chord resolves…'],
    qp: ['…When night forgets the sun, and day forgets the moon…'],
    e: 'Dusk smiles with tearful joy. The Hollow King becomes the Keeper of Rests, and the Duet is whole!',
  },
  {
    n: 'Waffles',
    r: 'an otter ferryman who is bad at directions and very good at feelings',
    bi: 2,
    sp: 'otter',
    col: '#a07855',
    hat: 'straw',
    island: 'Lantern Isle',
    layer: 0,
    g: 'Hop in! Waffles Ferry Service! We might end up at Cinder Cradle, or maybe Tidepool Atoll, but I guarantee good vibes!',
    t: [
      ['Do you know where we’re going?', 'Geography is a suggestion. Joy is a destination! Only 5 coins per trip!'],
      ['Have you seen any sea creatures?', 'Saw a giant sea turtle wearing a flower! He said good morning in bubble.'],
    ],
    i: ['Splash splash!', 'Row row row!', 'Otter smiles!'],
    qp: ['Anywhere the water flows is home to me.'],
    e: 'Best passenger ever! Free ferry rides for life, captain!',
  },
  {
    n: 'Fennel',
    r: 'a fox cartographer whose maps are 100% confident and 40% correct',
    bi: 3,
    sp: 'fox',
    col: '#ff9f43',
    hat: 'aviator',
    island: 'Lantern Isle',
    layer: 0,
    g: 'Aha! Looking for treasure? My hand-drawn maps are legendary! Completely accurate, give or take three islands.',
    t: [
      ['Are these maps safe?', 'Mostly! If there’s an X, there’s either a buried chest or a really interesting rock named Gary.'],
      ['Can I buy a treasure map?', 'Always! 30 coins for an adventure you’ll never forget.'],
    ],
    i: ['Compass spinning!', 'Chart the stars!', 'Aha, an X!'],
    qp: ['The world is round, so technically you can never be truly lost.'],
    e: 'You found every secret spot on my maps! Master Cartographer diploma granted!',
  },
  // --- Sky Kingdom (Layer 2) ---
  {
    n: 'Queen Nimbus',
    r: 'gentle cloud monarch of Cirrus Castle',
    bi: -1,
    sp: 'owl',
    col: '#ffffff',
    hat: 'crown',
    island: 'Sky',
    layer: 2,
    at: 'Cirrus Castle',
    o: [0, 2],
    g: 'Welcome above the clouds, little wanderer! Cirrus Castle floats on every kind melody carried by the wind.',
    t: [
      ['How do clouds stay afloat?', 'On laughter, warm updrafts from Dawn Spire, and the silver harmonies drifting from Lantern Isle!'],
      ['Where are the Rainbow Rings?', 'Look east toward Sunrise Updraft Spire and around our battlements! Fly through them to gather golden feathers.'],
      ['Do you remember the Dawn Duet?', 'Long ago, Aurelle’s sunrise gilded every cloud terrace gold. We keep the towers lit waiting for her song to return!'],
    ],
    i: ['So soft!', 'Breezy~', 'Clouds at peace!'],
    qp: ['Cirrus Kingdom shines brightest when friends soar together across the sky!'],
    e: 'Your wings shine like morning gold! You are forever an honored guest of Cirrus Castle! ☁️',
  },
  {
    n: 'Cumulo',
    r: 'cheerful sky merchant tending the rainbow awnings of Nimbus Market',
    bi: -1,
    sp: 'bunny',
    col: '#cfeaff',
    hat: 'aviator',
    island: 'Sky',
    layer: 2,
    at: 'Nimbus Market',
    o: [0, 1],
    g: 'Breezy greetings! Step onto Nimbus Market’s terrace—up here we trade cloud-soft charms and starlight lenses!',
    t: [
      ['What do you sell up in the clouds?', 'Cloud charms for swift wings, lenses for stargazing, and shimmering crystals gathered at dawn!'],
      ['How did Nimbus Market get here?', 'A giant tailwind lifted Pip’s floating muffin tray so high it anchored an entire cloud bank—so we built a bazaar!'],
    ],
    i: ['Sky goods, fresh breeze!', 'Check the cloud awnings!', 'Rainbow deals today!'],
    qp: ['Every gale brings a friendly traveler and a fresh tune from down below!'],
    e: 'You’ve brightened the whole sky bazaar! Fair winds wherever your wings carry you! 🌤️',
  },
  // --- Undersea Reef (Layer 1) ---
  {
    n: 'Marina',
    r: 'pearl diver & chorus conductor of Pearl Reef',
    bi: -1,
    sp: 'otter',
    col: '#52d6c6',
    hat: 'seashell',
    island: 'Sea',
    layer: 1,
    at: 'Pearl Reef',
    o: [0, 1],
    g: 'Bloop-hello, diver! Welcome down to Pearl Reef, where every current carries an echo of ancient whale-song!',
    t: [
      ['Where are the sea pearls hidden?', 'Follow the glowing kelp trenches and sunken marble arches—oysters open brightest when you swim nearby!'],
      ['What is the Coral Concert Hall?', 'Just west of Pearl Reef sits a natural prism of pink singing coral. Every tide turns the sea floor into an amphitheater!'],
      ['How do you breathe so comfortably down here?', 'Practice Tide Song and sip kelp-blossom nectar! The reef always looks after gentle swimmers.'],
    ],
    i: ['Bloop!', 'Bubble tune~', 'Hear the whale-song!'],
    qp: ['Every pearl holds a gentle sea-note waiting for someone kind to listen.'],
    e: 'The whole reef is humming in harmony with you! Keep shimmering beneath the waves! 🐚',
  },
  {
    n: 'Octavia',
    r: 'eight-armed curator and shopkeeper at Coral Concert Hall',
    bi: -1,
    sp: 'axolotl',
    col: '#ff9ebb',
    hat: 'flower',
    island: 'Sea',
    layer: 1,
    at: 'Coral Concert Hall',
    o: [1, 1],
    g: 'Splish and welcome to Coral Concert Hall! My coral acoustic tubes keep every echo crisp—care to browse my sunken curios?',
    t: [
      ['Tell me about the Coral Concert Hall', 'When Tidbit lights the lighthouse up on the Atoll, beams of silver refract right down through our pink coral organ pipes!'],
      ['Why run a shop under the sea?', 'Merfolk, diving mochis, and lost mariners always need crystal prisms and night-vision lenses down in the deep trenches!'],
    ],
    i: ['Polishing pearls!', 'Coral acoustics are divine~', 'Eight paws make light work!'],
    qp: ['Stay awhile and listen—even the abyssal trench hums softer when you visit.'],
    e: 'Bravo! You have eight gold stars in my ledger—the Concert Hall is always open to you! 🪸',
  },
  // --- Expanded Outer Settlements & Sky Garden Keepers ---
  {
    n: 'Bramble',
    r: 'bridge-warden & stone-oven baker of Bramblebridge',
    bi: 3,
    sp: 'bear',
    col: '#a87d56',
    hat: 'beret',
    island: 'Lantern Isle',
    layer: 0,
    at: 'Bramblebridge',
    o: [1, 1],
    g: 'Crossed the east brook safely? Grab a warm wildberry loaf and listen to the stream rush beneath the bridge!',
    t: [
      ['What lies east of Bramblebridge?', 'Across the eastern strait rises Dawn Spire, and south-east shimmer the golden sandbars of Starfall Shoals!'],
      ['How long has the stone bridge stood?', 'Long enough for moss to memorize every traveler’s footsteps. Every Lantern festival starts with fresh bread right here!'],
    ],
    i: ['Warm crust!', 'River breeze~', 'Wildberry jam!'],
    qp: ['Share a slice with someone wandering a long road—distance shrinks when hearts are full.'],
    e: 'Bramblebridge always smells like cinnamon and morning hope whenever you stop by! 🍞',
  },
  {
    n: 'Capt. Tidecrest',
    r: 'lighthouse keeper & western gale navigator of Sapphire Haven',
    bi: 2,
    sp: 'penguin',
    col: '#4f7fc8',
    hat: 'sailor',
    island: 'Sapphire Bluff',
    layer: 0,
    at: 'Sapphire Haven',
    o: [0, 2],
    g: 'Ahoy, voyager! You sailed all the way out to Sapphire Bluff! Few travelers brave the western swell out past Driftwood Dock.',
    t: [
      ['What do you watch for from the cliff?', 'Sunken pearl grottoes glowing emerald at dusk, and cloud caravans gliding down from Aether Sky Garden above!'],
      ['Tell me about the Sapphire Beacon', 'When crystal prisms spin inside the tower, sailors can spot home harbor from across the whole wide sea!'],
    ],
    i: ['Spyglass steady!', 'Fair western winds~', 'Beacon lit!'],
    qp: ['No horizon is too distant when your compass points toward good friends.'],
    e: 'You have the heart of a true high-seas explorer! Sapphire Haven salutes you! ⚓',
  },
  {
    n: 'Momiji',
    r: 'crimson-leaf chime maker of Maple Crossing',
    bi: 5,
    sp: 'fox',
    col: '#e26f4c',
    hat: 'flower',
    island: 'Maple Mist Isle',
    layer: 0,
    at: 'Maple Crossing',
    o: [-1, 1],
    g: 'Welcome under our scarlet eaves! Hear how the cedar wind-chimes sing across the strait between Lantern Isle and Honeycomb Hills.',
    t: [
      ['Why build a pagoda here?', 'Wind currents meet gently in the strait—every breeze carries maple petals up toward Nimbus Market!'],
      ['What tea do you brew?', 'Smoked maple-blossom tea with a pinch of ginger. Ideal after swimming or soaring far!'],
    ],
    i: ['Falling leaves…', 'Cedar chime~', 'Amber sunset!'],
    qp: ['Even a drifting leaf finds a quiet pond to rest upon.'],
    e: 'May autumn warmth and bright crimson notes follow your footsteps everywhere! 🍁',
  },
  {
    n: 'Astra',
    r: 'celestial astrolabe keeper of Starfall Observatory',
    bi: 6,
    sp: 'cat',
    col: '#b89cff',
    hat: 'wizard',
    island: 'Starfall Shoals',
    layer: 0,
    at: 'Starfall Observatory',
    o: [0, 2],
    g: 'Look south and upward, stargazer! Here on Starfall Shoals, shooting stars kiss the warm sandbars almost every night.',
    t: [
      ['What does the great astrolabe measure?', 'The quiet rhythm between The Moon’s lullaby and Aurelle’s dawn chimes—both rings align when harmony returns!'],
      ['Have fallen stars landed nearby?', 'Check the crescent tide flats at low twilight! Half the gems in the southern sea washed up right along these shoals.'],
    ],
    i: ['Star chart inked!', 'Brass rings spin~', 'Meteor watch!'],
    qp: ['Every constellation is just a story drawn by patient stars waiting to be read.'],
    e: 'Your curiosity burns brighter than any comet! Starfall Observatory is forever yours! 🔭',
  },
  {
    n: 'Zephyr',
    r: 'western gale harpist of Aether Sky Garden',
    bi: -1,
    sp: 'owl',
    col: '#9be0ff',
    hat: 'flower',
    island: 'Sky',
    layer: 2,
    at: 'Aether Sky Garden',
    o: [0, 2],
    g: 'High winds greet you, skyfarer! Welcome to the western Aether Garden, where golden harp strings hum in the western jetstream!',
    t: [
      ['How far does the Sky Kingdom stretch?', 'From Sunrise Updraft Spire in the far east all the way out here above Sapphire Bluff—dozens of buoyant cloud atolls drift in between!'],
      ['Can I hear the Wind Harp?', 'Stand beside the marble crescent when the sunset breeze picks up—every chord sends golden feathers dancing!'],
    ],
    i: ['Strum the breeze~', 'Cloud blossom!', 'High horizon!'],
    qp: ['Spread your wings wide; the sky has plenty of room for bold dreams!'],
    e: 'The western jetstream rings with joy whenever you glide past Aether Sky Garden! 🌬️',
  },
];

const AT = WORLD_ANCHORS.towns;
const AR = WORLD_ANCHORS.reef;
const AS = WORLD_ANCHORS.sky;
const AG = WORLD_ANCHORS.glowdeep;
const AM = WORLD_ANCHORS.moonroad;

// Expanded Settlements across the 11 Islands & 5 Realms
export const TOWNS_DATA_MM2 = [
  // Island 1: Lantern Isle
  { n: 'Willowbrook', x: AT.willowbrook.tx, y: AT.willowbrook.ty, w: 0, vis: 1, island: 'Lantern Isle' },
  { n: 'Mossgate', x: AT.mossgate.tx, y: AT.mossgate.ty, w: 0, vis: 0, island: 'Lantern Isle' },
  { n: 'Oasis Rest', x: AT.oasisRest.tx, y: AT.oasisRest.ty, w: 0, vis: 0, island: 'Lantern Isle' },
  { n: 'Frostholm', x: AT.frostholm.tx, y: AT.frostholm.ty, w: 0, vis: 0, island: 'Lantern Isle' },
  { n: 'Pebble Peaks', x: AT.pebblePeaks.tx, y: AT.pebblePeaks.ty, w: 0, vis: 0, island: 'Lantern Isle' },
  { n: 'Driftwood Dock', x: AT.driftwoodDock.tx, y: AT.driftwoodDock.ty, w: 0, vis: 0, island: 'Lantern Isle' },
  { n: 'Petal Hollow', x: AT.petalHollow.tx, y: AT.petalHollow.ty, w: 0, vis: 0, island: 'Lantern Isle' },
  { n: 'Bramblebridge', x: AT.bramblebridge.tx, y: AT.bramblebridge.ty, w: 0, vis: 0, island: 'Lantern Isle' },
  { n: 'Mochi Hamlet', x: AT.mochiHamlet.tx, y: AT.mochiHamlet.ty, w: 0, vis: 1, island: 'Lantern Isle' },

  // Island 2: Honeycomb Hills (NW)
  { n: 'Honeycomb Village', x: AT.honeycombVillage.tx, y: AT.honeycombVillage.ty, w: 0, vis: 0, island: 'Honeycomb Hills' },
  { n: 'Wildflower Mill', x: AT.wildflowerMill.tx, y: AT.wildflowerMill.ty, w: 0, vis: 0, island: 'Honeycomb Hills' },

  // Island 3: Tidepool Atoll (SW)
  { n: 'Tidepool Haven', x: AT.tidepoolHaven.tx, y: AT.tidepoolHaven.ty, w: 0, vis: 0, island: 'Tidepool Atoll' },
  { n: 'Starfish Shallows', x: AT.starfishShallows.tx, y: AT.starfishShallows.ty, w: 0, vis: 0, island: 'Tidepool Atoll' },

  // Island 4: Cinder Cradle (South)
  { n: 'Cinder Spas', x: AT.cinderSpas.tx, y: AT.cinderSpas.ty, w: 0, vis: 0, island: 'Cinder Cradle' },

  // Island 5: Mirror Fens (SE)
  { n: 'Lily Pavilion', x: AT.lilyPavilion.tx, y: AT.lilyPavilion.ty, w: 0, vis: 0, island: 'Mirror Fens' },

  // Island 6: Aurora Reach (NE)
  { n: 'Aurora Station', x: AT.auroraStation.tx, y: AT.auroraStation.ty, w: 0, vis: 0, island: 'Aurora Reach' },

  // Island 7: Chime Canopy (North)
  { n: 'Bellwood Treetops', x: AT.bellwoodTreetops.tx, y: AT.bellwoodTreetops.ty, w: 0, vis: 0, island: 'Chime Canopy' },

  // Island 8: Dawn Spire (East)
  { n: 'Dawn Spire Summit', x: AT.dawnSpireSummit.tx, y: AT.dawnSpireSummit.ty, w: 0, vis: 0, island: 'Dawn Spire' },

  // Island 9: Sapphire Bluff (Far West)
  { n: 'Sapphire Haven', x: AT.sapphireHaven.tx, y: AT.sapphireHaven.ty, w: 0, vis: 0, island: 'Sapphire Bluff' },

  // Island 10: Maple Mist Isle (West Strait)
  { n: 'Maple Crossing', x: AT.mapleCrossing.tx, y: AT.mapleCrossing.ty, w: 0, vis: 0, island: 'Maple Mist Isle' },

  // Island 11: Starfall Shoals (Far SE Atoll)
  { n: 'Starfall Observatory', x: AT.starfallObservatory.tx, y: AT.starfallObservatory.ty, w: 0, vis: 0, island: 'Starfall Shoals' },

  // Underwater (Layer 1)
  { n: 'Coral Concert Hall', x: AR.coralConcertHall.tx, y: AR.coralConcertHall.ty, w: 1, vis: 0, island: 'Sea' },
  { n: 'Pearl Reef', x: AR.pearlReef.tx, y: AR.pearlReef.ty, w: 1, vis: 0, island: 'Sea' },

  // Glowdeep (Layer 3)
  { n: 'Rooted Rest', x: AG.rootedRest.tx, y: AG.rootedRest.ty, w: 3, vis: 0, island: 'Glowdeep' },

  // Sky Kingdom (Layer 2)
  { n: 'Nimbus Market', x: AS.nimbusMarket.tx, y: AS.nimbusMarket.ty, w: 2, vis: 0, island: 'Sky' },
  { n: 'Cirrus Castle', x: AS.cirrusCastle.tx, y: AS.cirrusCastle.ty, w: 2, vis: 0, island: 'Sky' },
  { n: 'Aether Sky Garden', x: AS.aetherGarden.tx, y: AS.aetherGarden.ty, w: 2, vis: 0, island: 'Sky' },

  // Moon Road (Layer 4)
  { n: 'Moon’s Tea House', x: AM.teaHouse.tx, y: AM.teaHouse.ty, w: 4, vis: 0, island: 'Moon Road' },
];

// The 7 Verses of the Reveille + The 9th Unsung Verse
export const VERSES_OF_THE_REVEILLE: ReveilleVerse[] = [
  {
    num: 1,
    title: 'Wake',
    island: 'Honeycomb Hills',
    keeper: 'Bumble the Beekeeper',
    quote: 'Open your eyes to the golden light, the honey is warm and the sky is bright.',
    origin: 'Restored when the hum returned to the windmills of Honeycomb Hills.',
    unlocked: false,
  },
  {
    num: 2,
    title: 'Stretch',
    island: 'Tidepool Atoll',
    keeper: 'Tidbit the Axolotl',
    quote: 'Reach with the waves as the waters rise, welcoming morning with open skies.',
    origin: 'Lit atop the Atoll lighthouse to banish the fearful shadows.',
    unlocked: false,
  },
  {
    num: 3,
    title: 'Warm',
    island: 'Cinder Cradle',
    keeper: 'Ember the Dragon Hatchling',
    quote: 'Kindle the hearth where the friendship grows, melting the winter and frosty snows.',
    origin: 'Sung into the hot springs during the Lava Lamp Festival.',
    unlocked: false,
  },
  {
    num: 4,
    title: 'Greet',
    island: 'Mirror Fens',
    keeper: 'Madame Mizzle',
    quote: 'Say hello to the morning breeze, whispering softly through willow trees.',
    origin: 'Heard across the misty lily pads when Madame Mizzle sang her true note.',
    unlocked: false,
  },
  {
    num: 5,
    title: 'Run',
    island: 'Aurora Reach',
    keeper: 'Penny and Quill',
    quote: 'Race down the snowfields with laughter bold, faster than frostbite and winter cold.',
    origin: 'Crossed the finish line of the Great Sled Race under dancing auroras.',
    unlocked: false,
  },
  {
    num: 6,
    title: 'Ring',
    island: 'Chime Canopy',
    keeper: 'Bellamy the Deer',
    quote: 'Strike every bell in the highest tree, sending the anthem across the sea.',
    origin: 'Chimed from the highest bell-bridge over the ancient canopy.',
    unlocked: false,
  },
  {
    num: 7,
    title: 'Remember',
    island: 'Glowdeep',
    keeper: 'Lumi the Glowworm',
    quote: 'Deep in the roots where the memories stay, darkness dissolves into brand new day.',
    origin: 'Cooked into the Soup of Remembering deep inside Nana Mochi’s roots.',
    unlocked: false,
  },
  {
    num: 9,
    title: 'The Unsung Verse (The Duet)',
    island: 'Dawn Spire',
    keeper: 'The Moon & Dusk',
    quote: 'When night forgets the sun, and day forgets the moon, one small note can bridge the dark and bring the morning soon. Sing the rest between the notes, for silence is a song. A duet is two who wait for each other all night long.',
    origin: 'The sacred bridging phrase discovered when Dusk and the protagonist harmonize atop Dawn Spire.',
    unlocked: false,
  },
];

export const VERSES_OF_REVEILLE = VERSES_OF_THE_REVEILLE.slice(0, 7);
export const UNSUNG_VERSE = VERSES_OF_THE_REVEILLE[7];

// 24 Moon Diary Pages
export const MOON_DIARY_PAGES: MoonDiaryEntry[] = [
  { page: 1, entry: 'I hummed a little tune today. It sounded nice in the dark.', found: false, x: AT.willowbrook.tx + 2, y: AT.willowbrook.ty + 8, w: 0 },
  { page: 2, entry: 'The stars danced when I tapped my feet. One little star fell and laughed.', found: false, x: AT.petalHollow.tx, y: AT.petalHollow.ty + 18, w: 0 },
  { page: 3, entry: 'Nana Mochi sighed in her sleep. Her dreams became sunny meadows and willow woods.', found: false, x: AT.pebblePeaks.tx - 2, y: AT.pebblePeaks.ty + 18, w: 0 },
  { page: 4, entry: 'I made a tea of chamomile and twilight. I saved a cup for my sister Aurelle.', found: false, x: AM.teaHouse.tx, y: AM.teaHouse.ty, w: 4 },
  { page: 5, entry: 'The Sun waved, but she did not stay to listen. She had so many flowers to open.', found: false, x: AT.oasisRest.tx, y: AT.oasisRest.ty - 6, w: 0 },
  { page: 6, entry: 'I asked her to stay for just one verse. Just one. But morning pulled her away.', found: false, x: AT.driftwoodDock.tx, y: AT.driftwoodDock.ty + 8, w: 0 },
  { page: 7, entry: 'The silence was small at first, like a rest between two flute notes.', found: false, x: AT.mossgate.tx, y: AT.mossgate.ty, w: 0 },
  { page: 8, entry: 'Two notes dropped from my sleeve into the clouds. One was Dawn. One was Dusk.', found: false, x: AT.frostholm.tx, y: AT.frostholm.ty, w: 0 },
  { page: 9, entry: 'Eight friends came to help me sing. I was so happy I forgot to be sad.', found: false, x: AT.honeycombVillage.tx, y: AT.honeycombVillage.ty, w: 0 },
  { page: 10, entry: 'Captain Barnacle built a ship from a puddle. I blew on his sails.', found: false, x: AT.tidepoolHaven.tx, y: AT.tidepoolHaven.ty, w: 0 },
  { page: 11, entry: 'Pip baked a muffin that smelled like morning. It floated right up to my window.', found: false, x: AS.cirrusCastle.tx - 4, y: AS.cirrusCastle.ty + 48, w: 2 },
  { page: 12, entry: 'The Hush grew longer. A rest only works if the music resumes.', found: false, x: AT.cinderSpas.tx, y: AT.cinderSpas.ty, w: 0 },
  { page: 13, entry: 'I sang a phrase and waited. I waited a long time.', found: false, x: AT.lilyPavilion.tx, y: AT.lilyPavilion.ty, w: 0 },
  { page: 14, entry: 'The islanders forgot their melodies and became quiet grey wanderers. My heart broke.', found: false, x: AT.auroraStation.tx, y: AT.auroraStation.ty, w: 0 },
  { page: 15, entry: 'I hid the Seven Verses with the Keepers so the song would never be truly lost.', found: false, x: AT.bellwoodTreetops.tx, y: AT.bellwoodTreetops.ty, w: 0 },
  { page: 16, entry: 'Dusk wandered into the Silence alone. Oh Dusk… I never stopped looking.', found: false, x: AT.dawnSpireSummit.tx, y: AT.dawnSpireSummit.ty, w: 0 },
  { page: 17, entry: 'I think I sighed. I did not mean for it to be so large.', found: false, x: AR.coralConcertHall.tx, y: AR.coralConcertHall.ty, w: 1 },
  { page: 18, entry: 'The Lantern Tree took root. As long as one light burns, someone will come home.', found: false, x: AG.rootedRest.tx, y: AG.rootedRest.ty, w: 3 },
  { page: 19, entry: 'To whoever is reading this: silence is not empty. It is waiting for you.', found: false, x: AT.sapphireHaven.tx, y: AT.sapphireHaven.ty, w: 0 },
  { page: 20, entry: 'Aurelle is still singing. I can feel her sunrise warming the eastern clouds.', found: false, x: AT.starfallObservatory.tx, y: AT.starfallObservatory.ty, w: 0 },
  { page: 21, entry: 'Nana Mochi is stirring. She loves the music so much she wants to wake up and hear it.', found: false, x: AG.rootedRest.tx, y: AG.rootedRest.ty + 8, w: 3 },
  { page: 22, entry: 'Two notes fallen, two sisters parted, one song to bring them home.', found: false, x: AM.teaHouse.tx, y: AM.teaHouse.ty - 6, w: 4 },
  { page: 23, entry: 'Sing with all your heart, little mochi. Every note counts.', found: false, x: AM.crescentBelvedere.tx, y: AM.crescentBelvedere.ty, w: 4 },
  { page: 24, entry: 'If you are reading this, you are the answer.', found: false, x: AT.dawnSpireSummit.tx + 6, y: AT.dawnSpireSummit.ty, w: 0 },
];

// Memory Echoes (Moments from the past replayable via Echo Call)
export const MEMORY_ECHOES: MemoryEcho[] = [
  {
    id: 'echo-1',
    title: 'The First Muffin',
    speaker: 'Pip',
    memory: 'Pip watches her very first cloud muffin float out the kitchen window, waving goodbye as it drifts toward the Moon.',
    x: AT.willowbrook.tx + 4,
    y: AT.willowbrook.ty - 2,
    w: 0,
    got: false,
  },
  {
    id: 'echo-2',
    title: 'Barnacle’s Galleon',
    speaker: 'Captain Barnacle',
    memory: 'Captain Barnacle proudly polishing the helm of his puddle, declaring that one day she will brave the open archipelago.',
    x: AT.driftwoodDock.tx + 3,
    y: AT.driftwoodDock.ty - 2,
    w: 0,
    got: false,
  },
  {
    id: 'echo-3',
    title: 'Gloria’s First Word',
    speaker: 'Gloria the Rock',
    memory: 'Pebble Pete sitting quietly on the peak for hours. A small voice finally echoes: "Pete. Pete. Pete."',
    x: AT.pebblePeaks.tx + 3,
    y: AT.pebblePeaks.ty + 4,
    w: 0,
    got: false,
  },
  {
    id: 'echo-4',
    title: 'The Moon’s First Pillow',
    speaker: 'Queen Nimbus',
    memory: 'A soft, fluffy cloud who spent a thousand years pretending to be royalty so everyone in the Sky Kingdom felt safe.',
    x: AS.cirrusCastle.tx - 2,
    y: AS.cirrusCastle.ty + 42,
    w: 2,
    got: false,
  },
  {
    id: 'echo-5',
    title: 'The Twin Stars',
    speaker: 'Prof. Snowball',
    memory: 'Professor Snowball looking through his telescope and crying happy tears as Kevin and Kevin twinkle side by side in the night sky.',
    x: AT.frostholm.tx,
    y: AT.frostholm.ty - 5,
    w: 0,
    got: false,
  },
  {
    id: 'echo-6',
    title: 'The Great Rest',
    speaker: 'Dusk',
    memory: 'Dusk sitting by the edge of the Silence, whispering: "If I make it quiet, nobody will be lonely anymore. I will keep watch."',
    x: AT.dawnSpireSummit.tx + 4,
    y: AT.dawnSpireSummit.ty + 2,
    w: 0,
    got: false,
  },
];

// 12 Chapters in 3 Acts
export const CHAPTERS_MM2 = [
  // Act I: The Answering Note
  {
    num: 1,
    title: 'Morning After',
    act: 'Act I: The Answering Note',
    goal: 'Wake under the Lantern Tree, hear the Answering Note on the wind, and meet Pip.',
    reward: 'Glimmer Step Spell & Moonlit Cottage',
  },
  {
    num: 2,
    title: 'The Puddle Sets Sail',
    act: 'Act I: The Answering Note',
    goal: 'Help Captain Barnacle upgrade his puddle into the Puddle II and sail to Tidepool Atoll.',
    reward: 'Sailing, Tide Song & Frost Bridge Spells',
  },
  {
    num: 3,
    title: 'Honey and Hum',
    act: 'Act I: The Answering Note',
    goal: 'Reach Honeycomb Hills, soothe the troubled hives with Bumble, and restore Verse 1: Wake.',
    reward: 'Moon Pull Spell & Verse 1',
  },
  {
    num: 4,
    title: 'Lighthouse in the Dark',
    act: 'Act I: The Answering Note',
    goal: 'Relight Tidbit’s lighthouse, meet Gloom the Hushling, and uncover the Seven Verses.',
    reward: 'Bloom & Hush Hug Spells, Gloom Companion, Verse 2',
  },
  // Act II: The Two Songs
  {
    num: 5,
    title: 'Warm Hearts',
    act: 'Act II: The Two Songs',
    goal: 'Mend the volcanic hot springs at Cinder Cradle with Ember before the Lava Lamp Festival.',
    reward: 'Ember Warmth Spell & Verse 3',
  },
  {
    num: 6,
    title: 'Echoes in the Fens',
    act: 'Act II: The Two Songs',
    goal: 'In Mirror Fens, recover Madame Mizzle’s real voice and your first Memory Echo.',
    reward: 'Echo Call Spell & Verse 4',
  },
  {
    num: 7,
    title: 'The Long Night',
    act: 'Act II: The Two Songs',
    goal: 'Reunite the penguin twins Penny & Quill at Aurora Reach and follow the dancing aurora.',
    reward: 'Dreamwalk Spell, Moon Road access & Verse 5',
  },
  {
    num: 8,
    title: 'The Bell Canopy',
    act: 'Act II: The Two Songs',
    goal: 'Climb Chime Canopy and ring the Great Bell with Bellamy. Gloom’s secret is revealed.',
    reward: 'Dawn Break Spell, Glowdeep portal & Verse 6',
  },
  // Act III: The Dawn Duet
  {
    num: 9,
    title: 'Beneath the Meadow',
    act: 'Act III: The Dawn Duet',
    goal: 'Descend into Glowdeep, ride the Gondola, and cook the Soup of Remembering with Lumi.',
    reward: 'Glowdeep Gondola & Verse 7',
  },
  {
    num: 10,
    title: 'The Moon Road',
    act: 'Act III: The Dawn Duet',
    goal: 'Walk the star-stepping stones of the Moon Road, stitch constellations, and visit the Tea House.',
    reward: 'Tea with the Moon, Constellation Stitching',
  },
  {
    num: 11,
    title: 'The Climb',
    act: 'Act III: The Dawn Duet',
    goal: 'Gather all your friends from every island and climb together to Dawn Spire.',
    reward: 'Every Wayfinder joins your journey',
  },
  {
    num: 12,
    title: 'The Dawn Duet',
    act: 'Act III: The Dawn Duet',
    goal: 'Sing the Lullaby and Reveille together atop Dawn Spire. Reconcile Dusk and Aurelle.',
    reward: 'Ten-scene Finale, Credits & Everlight Mode',
  },
];

export const STORY_CHAPTERS = CHAPTERS_MM2;

// Character groupings
export const ORIGINAL_ISLANDERS = ALL_CHARACTERS_MM2.slice(0, 8);
export const REEF_COURT = ALL_CHARACTERS_MM2.filter((c) => c.layer === 1);
export const SKY_COURT = ALL_CHARACTERS_MM2.filter((c) => c.layer === 2);
export const TOWN_RESIDENTS = ALL_CHARACTERS_MM2.filter((c) => Boolean(c.at));

// Initial quests
export const INITIAL_QUESTS: Quest[] = [
  {
    t: 'Pip’s Flying Muffins',
    g: 'Pip',
    to: 'Captain Barnacle',
    k: 'd',
    it: 'Warm Cloud Muffin',
    w: 0,
    d: 'My cloud muffins got caught in an updraft again! Could you take one down to Captain Barnacle at the dock before it floats into space?',
    dl: 'A fresh cloud muffin from Pip! Still warm and only slightly drifting upward. Thank you, little explorer!',
    e: 'Thank you! Barnacle loved it. You’re always welcome in my bakery! 🧁',
    l: 'Pip baked a warm batch of cloud muffins for Captain Barnacle.',
    st: 0,
    c: 0,
    n: 1,
  },
  {
    t: 'Lighthouse Kindling',
    g: 'Tidbit',
    k: 'c',
    it: 'Star Shards',
    w: 0,
    d: 'The waves have been stormy and the shadows are lingering. Could you gather 3 glowing Star Shards to relight our lighthouse prism?',
    e: 'The lighthouse beacon is shining bright again! The shadows are retreating into the sea! 🌊',
    l: 'Gathered star shards to relight the Tidepool Atoll lighthouse.',
    st: 0,
    c: 0,
    n: 3,
  },
  {
    t: 'The Troubled Honeycomb',
    g: 'Bumble',
    k: 'c',
    it: 'Wildflower Nectar',
    w: 0,
    d: 'The bees are humming in a minor key today—they are worried about the Quiet. If we bring them 4 vials of Wildflower Nectar, they will hum Verse 1: Wake!',
    e: 'Listen to that golden buzz! The hives are singing Verse 1 in perfect harmony! 🐝',
    l: 'Soothed the Honeycomb Hills apiary with wildflower nectar.',
    st: 0,
    c: 0,
    n: 4,
  },
  {
    t: 'Soup of Remembering',
    g: 'Lumi',
    k: 'c',
    it: 'Glowcap Spores',
    w: 3,
    d: 'Deep in the caverns, Nana Mochi’s memories need warmth. Gather 5 Glowcap Spores from the bioluminescent caves so we can brew the soup.',
    e: 'Mmm, smell that twilight aroma! The Seventh Verse is awake! ✨',
    l: 'Brewed the Soup of Remembering deep inside Nana Mochi’s roots.',
    st: 0,
    c: 0,
    n: 5,
  },
];

// Verses of the Lullaby
export const VERSES_OF_THE_LULLABY: [string, string, string][] = [
  ['Wake', 'Open your eyes to the golden light, the honey is warm and the sky is bright.', 'Honeycomb Hills'],
  ['Stretch', 'Reach with the waves as the waters rise, welcoming morning with open skies.', 'Tidepool Atoll'],
  ['Warm', 'Kindle the hearth where the friendship grows, melting the winter and frosty snows.', 'Cinder Cradle'],
  ['Greet', 'Say hello to the morning breeze, whispering softly through willow trees.', 'Mirror Fens'],
  ['Run', 'Race down the snowfields with laughter bold, faster than frostbite and winter cold.', 'Aurora Reach'],
  ['Ring', 'Strike every bell in the highest tree, sending the anthem across the sea.', 'Chime Canopy'],
  ['Remember', 'Deep in the roots where the memories stay, darkness dissolves into brand new day.', 'Glowdeep'],
  ['The Duet', 'When night forgets the sun, and day forgets the moon, one small note can bridge the dark and bring the morning soon.', 'Dawn Spire'],
];

// Cinematic Cutscene Sequences (3D Storyboarded Scenes using live game models & animations)
export const CUTSCENE_MOVIES: Record<string, CutsceneSlide[]> = {
  intro: [
    {
      duration: 5.5,
      text: 'Long ago, before the archipelago was divided into daylight and twilight… the Moon and the Sun sang together in endless harmony.',
      scene3D: {
        env: 'starlight',
        landmark: 'harmony_shore',
        lanternLit: 0.9,
        showMoon: true,
        showSun: true,
        showWater: true,
        motes: 'notes',
        actors: [
          {
            role: 'npc',
            npcName: 'The Moon',
            startPos: [-1.1, 0.02, 0.4],
            yaw: 0.45,
            weatherBehavior: 'dancing',
          },
          {
            role: 'npc',
            npcName: 'Aurelle',
            startPos: [1.1, 0.02, 0.4],
            yaw: -0.45,
            weatherBehavior: 'dancing',
          },
        ],
        camera: {
          startPos: [0, 2.3, 7.6],
          endPos: [1.6, 3.0, 6.2],
          startLookAt: [0, 1.4, -1.2],
          endLookAt: [0, 2.4, -4.5],
          fov: 45,
        },
      },
      draw: (ctx, t, W, H, u) => {
        csg(ctx, W, H, '#0b0c1e', '#231838');
        csStars(ctx, W, H, t, 120);
        csMoon(ctx, W * 0.5, H * 0.38, u * 0.12, 0.7);
        csFloatingNotes(ctx, W, H, t, 16, '#ffe27a', '♪', 16);
      },
    },
    {
      duration: 5.0,
      text: 'When the music paused for a rest, the rest lingered… and became the Great Silence. A lonely soul named Dusk began to keep the quiet.',
      scene3D: {
        env: 'night',
        landmark: 'lantern_tree',
        lanternLit: 0.05,
        showMoon: true,
        moonSad: true,
        showSun: false,
        showWater: true,
        motes: 'stars',
        actors: [
          {
            role: 'npc',
            npcName: 'Dusk',
            startPos: [0, 0.02, 0.6],
            yaw: 0.25,
            isHollow: true,
            hollowBloom: 0,
            weatherBehavior: 'sheltering',
          },
        ],
        camera: {
          startPos: [-2.4, 2.2, 6.8],
          endPos: [0.4, 1.65, 4.2],
          startLookAt: [0, 1.1, -0.8],
          endLookAt: [0, 0.9, 0.2],
          fov: 42,
        },
      },
      draw: (ctx, t, W, H, u) => {
        csg(ctx, W, H, '#1b1429', '#3a2046');
        csStars(ctx, W, H, t, 60, 0.5);
        csMoon(ctx, W * 0.5, H * 0.42, u * 0.1, 0.5, true);
      },
    },
    {
      duration: 4.8,
      text: 'Now, an answering note has stirred on the morning breeze. Two notes fallen, two sisters parted… one song to bring them home.',
      scene3D: {
        env: 'dawn',
        landmark: 'lantern_tree',
        lanternLit: 0.85,
        showMoon: false,
        showSun: true,
        showWater: true,
        motes: 'notes',
        actors: [
          {
            role: 'player',
            startPos: [-1.8, 0.02, 2.8],
            endPos: [-0.25, 0.02, 0.6],
            headPitch: -0.1,
            isMoving: true,
            jumpArcHeight: 0.22,
          },
          {
            role: 'companion',
            startPos: [-2.7, 0.02, 3.1],
            endPos: [-1.15, 0.02, 1.15],
            isMoving: true,
          },
        ],
        camera: {
          startPos: [2.8, 1.6, 6.2],
          endPos: [1.6, 2.5, 4.9],
          startLookAt: [-0.5, 1.0, 0.4],
          endLookAt: [0, 1.6, -1.5],
          fov: 44,
        },
      },
      draw: (ctx, t, W, H, u, playerLook) => {
        csStage(ctx, W, H, t, 0);
        csLitTree(ctx, W * 0.75, H * 0.75, u / 800, 0);
        drawMochi(ctx, W * 0.4, H * 0.82, u * 0.012, Math.sin(t * 3) * 2, 1, false, playerLook, false, t);
        csFloatingNotes(ctx, W, H, t, 20, '#ffd23f', '♫', 18);
      },
    },
  ],
  wake: [
    {
      duration: 4.5,
      text: 'The Lantern Tree pulses with dawn amber. Far across the water, the bell-bridges of Chime Canopy answer in turn.',
      scene3D: {
        env: 'dawn',
        landmark: 'lantern_tree',
        lanternLit: 1.0,
        showSun: true,
        showWater: true,
        motes: 'petals',
        actors: [
          {
            role: 'player',
            startPos: [-0.65, 0.02, 0.9],
            yaw: 0.35,
            isGreeting: true,
            jumpArcHeight: 0.28,
          },
          {
            role: 'npc',
            npcName: 'Pip',
            startPos: [0.95, 0.02, 0.75],
            yaw: -0.45,
            weatherBehavior: 'dancing',
          },
          {
            role: 'companion',
            startPos: [-1.55, 0.02, 1.1],
            yaw: 0.25,
          },
        ],
        camera: {
          startPos: [-2.2, 2.1, 5.8],
          endPos: [2.2, 2.7, 5.6],
          startLookAt: [0, 1.2, -0.5],
          endLookAt: [0, 1.5, -1.2],
          fov: 44,
        },
      },
      draw: (ctx, t, W, H, u, playerLook) => {
        csStage(ctx, W, H, t, 1);
        csLitTree(ctx, W * 0.5, H * 0.72, u / 700, 0);
        drawMochi(ctx, W * 0.35, H * 0.8, u * 0.011, Math.sin(t * 3) * 2, 1, false, playerLook, false, t);
      },
    },
  ],
  whispers: [
    {
      duration: 4.5,
      text: 'By the hearth of Whisperwood, the sparks carry old memories of the Moon’s gentle tea house.',
      scene3D: {
        env: 'night',
        landmark: 'campfire_grove',
        showMoon: true,
        showWater: false,
        motes: 'embers',
        actors: [
          {
            role: 'player',
            startPos: [-1.25, 0.02, 0.65],
            yaw: 0.85,
            weatherBehavior: 'idle',
          },
          {
            role: 'companion',
            startPos: [-1.95, 0.02, 0.1],
            yaw: 0.95,
          },
          {
            role: 'npc',
            npcName: 'The Moon',
            startPos: [1.45, 0.02, -0.35],
            yaw: -0.8,
            weatherBehavior: 'stargazing',
          },
        ],
        camera: {
          startPos: [-1.6, 1.75, 4.8],
          endPos: [1.6, 2.0, 4.6],
          startLookAt: [0, 0.75, -0.4],
          endLookAt: [0.3, 0.95, -0.8],
          fov: 42,
        },
      },
      draw: (ctx, t, W, H, u, playerLook) => {
        csg(ctx, W, H, '#1a1027', '#42213e');
        csStars(ctx, W, H, t, 90);
        csCampfire(ctx, W * 0.5, H * 0.75, u / 700, t);
        drawMochi(ctx, W * 0.38, H * 0.78, u * 0.011, Math.sin(t * 2) * 1.5, 1, false, playerLook, false, t);
      },
    },
  ],
  starlight: [
    {
      duration: 5.0,
      text: 'Falling starlight coats the archipelago in shimmering silver. The Moon Road opens to those who listen.',
      scene3D: {
        env: 'starlight',
        landmark: 'moon_gate',
        showMoon: true,
        showWater: true,
        motes: 'stars',
        actors: [
          {
            role: 'player',
            startPos: [-0.35, 0.02, 1.5],
            endPos: [-0.15, 0.02, 0.35],
            yaw: Math.PI,
            isMoving: true,
            weatherBehavior: 'stargazing',
          },
          {
            role: 'companion',
            startPos: [0.85, 0.02, 1.35],
            endPos: [0.75, 0.02, 0.45],
            yaw: Math.PI,
            isMoving: true,
          },
        ],
        camera: {
          startPos: [1.8, 1.45, 5.8],
          endPos: [0.0, 2.25, 4.4],
          startLookAt: [0, 1.5, -1.6],
          endLookAt: [0, 2.1, -3.5],
          fov: 46,
        },
      },
      draw: (ctx, t, W, H, u) => {
        csg(ctx, W, H, '#090517', '#1f133d');
        csStars(ctx, W, H, t, 160);
        csMoon(ctx, W * 0.5, H * 0.32, u * 0.14, 0.9);
        csFloatingNotes(ctx, W, H, t, 24, '#b48cff', '★', 20);
      },
    },
  ],
  deep: [
    {
      duration: 4.5,
      text: 'Deep in Glowdeep, rivers of liquid light flow through the ancient roots of Nana Mochi.',
      scene3D: {
        env: 'glowdeep',
        landmark: 'cauldron',
        showMoon: false,
        showSun: false,
        showWater: true,
        motes: 'spores',
        actors: [
          {
            role: 'player',
            startPos: [-1.45, 0.02, 1.0],
            endPos: [-0.95, 0.02, 0.55],
            yaw: 0.65,
            isMoving: true,
          },
          {
            role: 'npc',
            npcName: 'Lumi',
            startPos: [1.3, 0.02, 0.35],
            yaw: -0.75,
            isGreeting: true,
          },
          {
            role: 'companion',
            startPos: [-2.15, 0.02, 1.45],
            yaw: 0.5,
          },
        ],
        camera: {
          startPos: [2.4, 2.4, 5.6],
          endPos: [-1.5, 2.1, 4.8],
          startLookAt: [0, 1.0, -1.0],
          endLookAt: [0, 1.1, -1.4],
          fov: 44,
        },
      },
      draw: (ctx, t, W, H, u) => {
        csg(ctx, W, H, '#120824', '#2a0d42');
        csFloatingNotes(ctx, W, H, t, 14, '#6cd4ff', '✧', 14);
      },
    },
  ],
  skyarr: [
    {
      duration: 4.5,
      text: 'Wings of starlight carry you past the clouds into the floating atolls of the Cirrus Kingdom!',
      scene3D: {
        env: 'sky',
        landmark: 'sky_islands',
        showSun: true,
        showWater: false,
        motes: 'stars',
        actors: [
          {
            role: 'player',
            startPos: [0, 0.02, 1.6],
            endPos: [0, 0.02, -0.35],
            isMoving: true,
            isSprinting: true,
            jumpArcHeight: 0.72,
          },
          {
            role: 'companion',
            startPos: [-1.1, 0.02, 1.9],
            endPos: [-1.05, 0.02, 0.0],
            isMoving: true,
            jumpArcHeight: 0.45,
          },
        ],
        camera: {
          startPos: [-2.8, 2.2, 5.6],
          endPos: [2.6, 2.6, 4.6],
          startLookAt: [0, 1.1, 0.6],
          endLookAt: [0, 1.2, -0.4],
          fov: 46,
        },
      },
      draw: (ctx, t, W, H, u, playerLook) => {
        csg(ctx, W, H, '#7ac2f5', '#e8f6ff');
        csWings(ctx, W * 0.5, H * 0.5, u / 650, t);
        drawMochi(ctx, W * 0.5, H * 0.5, u * 0.012, Math.sin(t * 3) * 2, 1, false, playerLook, false, t);
      },
    },
  ],
  finale: [
    {
      duration: 6.0,
      text: 'Atop Dawn Spire, the Lullaby and Reveille harmonize at last. The Moon smiles, Aurelle embraces her sister, and the Dawn Duet echoes forever!',
      scene3D: {
        env: 'finale',
        landmark: 'dawn_spire',
        lanternLit: 1.0,
        showMoon: true,
        showSun: true,
        showWater: true,
        motes: 'notes',
        actors: [
          {
            role: 'player',
            startPos: [0, 0.24, 1.55],
            yaw: 0,
            weatherBehavior: 'dancing',
            jumpArcHeight: 0.3,
          },
          {
            role: 'npc',
            npcName: 'The Moon',
            startPos: [-1.45, 0.24, 0.55],
            yaw: 0.35,
            weatherBehavior: 'dancing',
          },
          {
            role: 'npc',
            npcName: 'Aurelle',
            startPos: [1.45, 0.24, 0.55],
            yaw: -0.35,
            weatherBehavior: 'dancing',
          },
          {
            role: 'npc',
            npcName: 'Dusk',
            startPos: [-2.4, 0.24, 1.5],
            yaw: 0.55,
            isHollow: false,
            hollowBloom: 1,
            isGreeting: true,
          },
          {
            role: 'npc',
            npcName: 'Pip',
            startPos: [2.4, 0.24, 1.5],
            yaw: -0.55,
            weatherBehavior: 'dancing',
          },
          {
            role: 'companion',
            startPos: [0.95, 0.24, 2.25],
            yaw: -0.25,
          },
        ],
        camera: {
          startPos: [-3.2, 2.2, 6.8],
          endPos: [3.2, 3.1, 6.4],
          startLookAt: [0, 1.2, 0.2],
          endLookAt: [0, 1.8, -1.2],
          fov: 46,
        },
      },
      draw: (ctx, t, W, H, u, playerLook) => {
        csg(ctx, W, H, '#ffd166', '#ff7aa8');
        csLitTree(ctx, W * 0.5, H * 0.7, u / 650, 0);
        drawMochi(ctx, W * 0.45, H * 0.78, u * 0.012, Math.sin(t * 3) * 2, 1, false, playerLook, false, t);
        csFloatingNotes(ctx, W, H, t, 28, '#ffffff', '♪', 22);
      },
    },
  ],
  credits: [
    {
      duration: 6.0,
      text: 'Mochi Meadows 2: The Dawn Duet · Thank you for wandering the Starlit Archipelago and restoring the Song!',
      scene3D: {
        env: 'sunset',
        landmark: 'credits_vista',
        lanternLit: 1.0,
        showMoon: true,
        showSun: false,
        showWater: true,
        motes: 'notes',
        actors: [
          {
            role: 'player',
            startPos: [-0.45, 0.02, 1.3],
            yaw: 0.1,
            isGreeting: true,
          },
          {
            role: 'companion',
            startPos: [0.75, 0.02, 1.35],
            yaw: -0.15,
          },
        ],
        camera: {
          startPos: [0.8, 1.65, 4.4],
          endPos: [-1.4, 2.8, 7.6],
          startLookAt: [0, 0.9, 0.6],
          endLookAt: [0, 1.35, -1.4],
          fov: 44,
        },
      },
      draw: (ctx, t, W, H, u, playerLook) => {
        csg(ctx, W, H, '#1b1429', '#3a2046');
        csStars(ctx, W, H, t, 100);
        csLitTree(ctx, W * 0.78, H * 0.74, u / 800, 0);
        drawMochi(ctx, W * 0.5, H * 0.8, u * 0.012, Math.sin(t * 2.5) * 2, 1, false, playerLook, false, t);
        csFloatingNotes(ctx, W, H, t, 18, '#ffd23f', '♫', 18);
      },
    },
  ],
};
