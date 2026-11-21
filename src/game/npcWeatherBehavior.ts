/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NPC } from './engine';
import { WeatherId } from './constants';

export const NPC_WEATHER_DIALOGUES: Record<
  string,
  Partial<Record<WeatherId, { speech: string; chatter: string[] }>>
> = {
  Pip: {
    sunny: {
      speech:
        'The sun is warming up my cloud yeast! Look at me dancing so the buns rise with extra fluff! ☀️',
      chatter: ['Sunshine bakes the best muffins! ☀️', 'Dancing in the sunshine! 🎶', 'Warm paws, happy buns!'],
    },
    drizzle: {
      speech:
        'Eek, rain! Huddling under Doris the Leaf mitt! If rain gets in the mixing bowl, it’s muffin soup! 🌧️',
      chatter: ['Huddling under the big leaves! 🍃', 'Raindrops on my leaf hat! 🌧️', 'Stay dry, little buns!'],
    },
    stardust: {
      speech:
        'Look, look! The Moon is sprinkling stardust! It makes the sweet rolls glow in the dark! ✨',
      chatter: ['Stardust frosting everywhere! ✨', 'I feel so floaty! 🌟', 'Catching starlight in my whisk!'],
    },
    snowy: {
      speech:
        'Snowflakes! I tried catching them on my tongue, but they melt too fast! Time for hot cocoa! ☕',
      chatter: ['Snow mochi season! ☃️', 'Brrr, frosty ears! ❄️', 'Fluffy snow looks like powdered sugar!'],
    },
  },
  'Captain Barnacle': {
    sunny: {
      speech:
        'Ahoy! Golden sunbeams on me puddle deck! Even me old peg-paw is tap-dancing in the warmth! ☀️',
      chatter: ['Arr, perfect sunshine for a voyage! ☀️', 'Tap-dancing on deck! ⚓', 'Basking like a sunfish!'],
    },
    drizzle: {
      speech:
        'Shiver me whiskers, it’s a squall! Taking shelter under this leafy tree till the storm passes! 🍃',
      chatter: ['Avast, duck under the trees! 🌧️', 'Me fur is soaked to the bone! 🍃', 'Puddle navigation alert!'],
    },
    stardust: {
      speech:
        'By the stars! The sky is showering luminous treasure right down on our heads! Grab a bucket! 🌟',
      chatter: ['Free celestial treasure falling! ✨', 'Star glitter in me beard! 🌟', 'A magical night at sea!'],
    },
    snowy: {
      speech:
        'Arr, a frosty gale! Me beard is frosting up like a sugar cookie! Stand strong against the chill! ❄️',
      chatter: ['Shiver me timbers, it’s freezing! ❄️', 'Icebergs in me puddle! 🧊', 'Snowflakes on me crown!'],
    },
  },
  Moss: {
    sunny: {
      speech:
        'The trees are sunbathing. The fern told me it’s feeling photosynthetically fabulous today! 🌻',
      chatter: ['Warm moss vibes! ☀️', 'The ferns are doing a sun dance! 🌿', 'Cozy sunshine bath.'],
    },
    drizzle: {
      speech:
        'Glorious moisture! The forest is having a party. I’m huddled under a toadstool, soaking up the gossip! 🍄',
      chatter: ['Pure rain bliss! 🌧️', 'Huddling under my toadstool 🍄', 'The mushrooms are smiling!'],
    },
    stardust: {
      speech:
        'The trees are humming along with the falling stardust. Even the roots are glowing purple! ✨',
      chatter: ['Bioluminescent moss! ✨', 'The forest is sparkling… 🌟', 'Magical tree whispers.'],
    },
    snowy: {
      speech:
        'The forest is wrapped in a quiet silver blanket. The spruce trees are wearing frosty white scarves! ❄️',
      chatter: ['Soft snowy silence… ❄️', 'I’m an icy slime now! 🧊', 'Frosty pine needles.'],
    },
  },
  Betty: {
    sunny: {
      speech:
        'The blossom petals are twirling in the warm golden light! A new poem: The sun is hot, I dance a lot! 🌸',
      chatter: ['Petal dancing in the sun! ☀️', 'Sunbeams and rhyming dreams! 🌸', 'Tra-la-la, so warm!'],
    },
    drizzle: {
      speech:
        'Raindrops on petals… huddling under the blossom branch to keep my rhyming dictionary dry! ☔',
      chatter: ['Sheltering under the pink canopy! 🌧️', 'Raindrop rhythm: pat-pat-pat! 🍃', 'Writing water sonnets.'],
    },
    stardust: {
      speech:
        'Celestial purple stardust drifting over the grove… I have never felt more inspired to write an epic! ✨',
      chatter: ['Stardust rhymes with… moonlust? ✨', 'Dancing in starlight! 🌟', 'Petals dusted in violet light.'],
    },
    snowy: {
      speech:
        'Snowflakes falling like white cherry blossoms! My paws are shivering, but my heart is singing! ❄️',
      chatter: ['Winter blossoms fluttering! ❄️', 'Shivering into a ball! ☃️', 'A frosty winter ballad.'],
    },
  },
  'Dune Dave': {
    sunny: {
      speech:
        'Now THIS is dune weather! The sand is toasted like a golden bagel. Gary the Rock is sunbathing! ☀️',
      chatter: ['Toasty dune sunshine! ☀️', 'Gary loves the warmth! 🪨', 'Lemonade sales are booming!'],
    },
    drizzle: {
      speech:
        'Rain in the dunes! Quick, Gary, huddle under the umbrella before the sand turns into mud castles! 🌧️',
      chatter: ['Rare desert rain! 🌧️', 'Protect Gary from getting washed away! ☂️', 'Mud pie discount today!'],
    },
    stardust: {
      speech:
        'Stardust on the sand dunes makes every grain glow like a little lantern! Gary is practically glowing! ✨',
      chatter: ['Luminous sand tonight! ✨', 'Gary looks enchanted! 🌟', 'Moon magic in the desert!'],
    },
    snowy: {
      speech:
        'Snow in the desert?! Gary the Rock is wearing a fluffy white toupee! Truly an historic occasion! ❄️',
      chatter: ['Snow on the dunes?! ❄️', 'Gary has a snow coat! ☃️', 'Chilly sand between the toes!'],
    },
  },
  Flurry: {
    sunny: {
      speech:
        'Oof, a bit toasty for a tundra bear, but the golden sunshine is too upbeat not to do a little jig! 💃',
      chatter: ['Dancing to beat the heat! ☀️', 'Sun-warmed fur! 💃', 'Basking in the golden rays!'],
    },
    drizzle: {
      speech:
        'Cool rain is lovely, but huddling under the cedar tree keeps my cozy knit scarf nice and fluffy! 🧣',
      chatter: ['Huddling under the cedars! 🌧️', 'Keeping my knit scarf dry! 🧣', 'Misty mountain drizzle.'],
    },
    stardust: {
      speech:
        'I feel weightless! Look at my bear paws—they are glowing with twinkling starlight! Let’s float! ✨',
      chatter: ['Weightless star floating! ✨', 'Star glitter on my fur! 🌟', 'The tundra is glowing!'],
    },
    snowy: {
      speech:
        'HOME SWEET HOME! Crisp arctic powder! My thick winter fur was tailor-made for this snowy paradise! ❄️',
      chatter: ['Perfect snow day! ❄️', 'Snow angel time! ☃️', 'Crisp tundra breeze!'],
    },
  },
  'Professor Quill': {
    sunny: {
      speech:
        'Remarkable solar irradiance! The chlorophyll absorption rates in our meadow flora are operating at peak efficiency! 🌻',
      chatter: ['Optimal photosynthetic activity! ☀️', 'Measuring lux levels! 🔬', 'A splendid sunny day!'],
    },
    drizzle: {
      speech:
        'Significant atmospheric condensation! I must shelter under this leafy canopy to preserve my field journals! 📚',
      chatter: ['Preserving the manuscripts! 🌧️', 'Huddling under botanical shelter! 🍃', 'Precipitation index is high!'],
    },
    stardust: {
      speech:
        'Extraordinary! These celestial motes exhibit zero-point gravitational levitation and lunar spectral luminescence! 🔭',
      chatter: ['Analyzing stellar particles! ✨', 'Gravitational anomalies detected! 🌟', 'Luminous quantum motes!'],
    },
    snowy: {
      speech:
        'Look at these dendritic crystals! Hexagonal molecular symmetry descending in crystalline perfection! ❄️',
      chatter: ['Hexagonal crystal symmetry! ❄️', 'Fascinating thermal decline! 🌡️', 'Documenting snowflake geometry!'],
    },
  },
  Luna: {
    sunny: {
      speech:
        'The sunlight reflects upon the calm ocean like millions of smiling stars. A gentle day to play the harp! ☀️',
      chatter: ['Golden sunbeams on the water… ☀️', 'Gentle melodies on the breeze! 🎶', 'Peaceful sunny shores.'],
    },
    drizzle: {
      speech:
        'Listen to the raindrops tapping upon the tidal rocks… it plays the first chord of the Moon’s Lullaby. 🌧️',
      chatter: ['The rain hums the lullaby… 🌧️', 'Sheltering beneath the archway 🍃', 'Calm rhythmic raindrops.'],
    },
    stardust: {
      speech:
        'The Moon remembers us! When stardust rains down, the lost verses echo through the night like silver bells. 🌙',
      chatter: ['The Moon is showering starlight! ✨', 'Listen to the star bells… 🔔', 'Pure celestial grace.'],
    },
    snowy: {
      speech:
        'A quiet winter hush descends upon Mochi Meadows. Every snowflake carries a soft dream of warmth. ❄️',
      chatter: ['Quiet winter dreams… ❄️', 'Silent falling snow ❄️', 'Soft footsteps in the frost.'],
    },
  },
  Barley: {
    sunny: {
      speech:
        'Golden sunshine dries my tea harvest to perfection! Come sit on the porch and enjoy an iced peach brew! 🍵',
      chatter: ['Peach sun tea is ready! ☀️', 'Dancing by the tea garden! 🌻', 'Crisp sunny warmth!'],
    },
    drizzle: {
      speech:
        'Nothing cozier in the whole world than sitting under the awning, listening to rain, and sipping chamomile! 🫖',
      chatter: ['Hot tea under the awning! 🌧️', 'Huddling by the kettle 🍃', 'Rainy tea time is best!'],
    },
    stardust: {
      speech:
        'Catching a pinch of stardust in your teapot gives the brew a dreamy lavender glow and sweet dreams! ✨',
      chatter: ['Starlight tea brewing! ✨', 'Glowing lavender cups! 🍵', 'A pinch of stardust in the pot!'],
    },
    snowy: {
      speech:
        'The kettle is whistling by the fireplace! Come warm your frosted paws with a piping hot mug of spiced cider! ☕',
      chatter: ['Hot spiced cider ready! ☕', 'Warm your paws by the fire! 🔥', 'Steaming mugs on a snowy day!'],
    },
  },
  Dot: {
    sunny: {
      speech:
        'Sunlight penetrating the shallows makes the rainbow trout leap! Perfect day to cast a line and dance along the bank! 🎣',
      chatter: ['Fish are jumping in the sun! ☀️', 'Cast your line! 🎣', 'Dancing along the riverbank!'],
    },
    drizzle: {
      speech:
        'Fish love the rain! The surface ripples bring them right up. Just huddling under this weeping willow to stay dry! 🐟',
      chatter: ['Fish love the ripple rain! 🌧️', 'Sheltering under the willow 🍃', 'Watch the water rings!'],
    },
    stardust: {
      speech:
        'The lake is glowing like an electric gemstone! Even the minnows have neon glowing stripes tonight! 🫧',
      chatter: ['Luminescent fish swimming! ✨', 'The lake is sparkling! 🌟', 'Catching starlight minnows!'],
    },
    snowy: {
      speech:
        'Ice is forming on the reeds! Keep your line moving so your bobber doesn’t freeze into an ice cube! ❄️',
      chatter: ['Frosted reeds and icy water! ❄️', 'Shivering by the tackle box 🥶', 'Winter fishing season!'],
    },
  },
};

/**
 * Returns weather dialogue for an NPC, falling back to a procedural role-based dialogue.
 */
export function getNPCWeatherDialogue(npc: NPC, weatherId: WeatherId): string {
  if (NPC_WEATHER_DIALOGUES[npc.n]?.[weatherId]) {
    return NPC_WEATHER_DIALOGUES[npc.n]![weatherId]!.speech;
  }

  // Procedural fallback based on weather and layer
  if (npc.sea) {
    switch (weatherId) {
      case 'sunny':
        return 'Warm sunbeams reach all the way down into the reef! The sea anemones are waltzing! ☀️';
      case 'drizzle':
        return 'The rain makes singing ripple circles across the water surface above us! 🌧️';
      case 'stardust':
        return 'Deep sea pearls and corals light up with neon starlight motes filtering down! ✨';
      case 'snowy':
        return 'The water surface has a frosty chill, but down here in the coral caverns it’s nice and snug! ❄️';
      case 'aurora':
        return 'Emerald ribbons of polar aurora shimmer right through the crystal waves! 🌌';
      case 'muffin_rain':
        return 'Floating crumb bubbles are drifting down into the reef! What a delicious drizzle! 🧁';
      default:
        return 'The current is calm and soothing today in the deep waters! 🌊';
    }
  }

  if (npc.sky) {
    switch (weatherId) {
      case 'sunny':
        return 'The cloud islands are gilded in pure gold today! Perfect weather for soaring across the kingdom! ☀️';
      case 'drizzle':
        return 'Gentle cloud mist gathers around our feathers! We skyfolk love a refreshing drizzle! 🌧️';
      case 'stardust':
        return 'We are so close to the Moon that the stardust shower feels like dancing inside a diamond! ✨';
      case 'snowy':
        return 'The clouds are frosted like powdered cupcakes! Watch out for soft snowdrifts! ❄️';
      case 'aurora':
        return 'We are soaring right through the celestial aurora curtains! The skies are ablaze with color! 🌌';
      case 'muffin_rain':
        return 'Warm cloud muffins are tumbling through the sky! Feathered friends, dinner is served! 🧁';
      default:
        return 'The winds are gentle and pure in the Cirrus Kingdom! ☁️';
    }
  }

  // Standard islander fallback
  switch (weatherId) {
    case 'sunny':
      return `What a glorious sunny day in Mochi Meadows! It makes me want to dance across the hills! ☀️`;
    case 'drizzle':
      return `A cozy drizzle is falling! I’m taking shelter under the branches to keep my fur warm and dry! 🌧️`;
    case 'stardust':
      return `Glowing stardust from the Moon is showering upon us! I feel completely weightless! ✨`;
    case 'snowy':
      return `Delicate snowflakes are dusting the trees! It’s wonderfully chilly and peaceful out here! ❄️`;
    case 'aurora':
      return `The sky is glowing with celestial ribbons of dawn aurora! The music of the stars is so loud! 🌌`;
    case 'muffin_rain':
      return `Warm, freshly baked cloud muffins are floating from the sky! Truly a heavenly feast! 🧁`;
    default:
      return `The meadow air feels crisp and full of song today! 🍃`;
  }
}

/**
 * Returns a short ambient exclamation for an NPC's overhead speech bubble.
 */
export function getNPCWeatherChatter(npc: NPC, weatherId: WeatherId): string {
  if (NPC_WEATHER_DIALOGUES[npc.n]?.[weatherId]?.chatter) {
    const list = NPC_WEATHER_DIALOGUES[npc.n]![weatherId]!.chatter;
    return list[Math.floor(Math.random() * list.length)];
  }

  switch (weatherId) {
    case 'sunny':
      return '☀️ Warm sunshine! Time to dance!';
    case 'drizzle':
      return '🌧️ Huddling under the tree branches!';
    case 'stardust':
      return '✨ Stardust is showering from the Moon!';
    case 'snowy':
      return '❄️ Dancing snowflakes on the breeze!';
    case 'aurora':
      return '🌌 Ribbons of neon light in the sky!';
    case 'muffin_rain':
      return '🧁 Fresh cloud muffins raining down!';
    default:
      return '✨ What lovely weather today!';
  }
}

/**
 * Updates NPC movement behavior and animation poses based on current weather.
 */
export function updateNPCWeatherBehavior(
  npcs: NPC[],
  weatherId: WeatherId,
  time: number,
  dt: number,
  lanternTreePos?: { x: number; y: number }
) {
  for (const n of npcs) {
    if (n.tree) continue; // Don't move the Lantern Tree!

    // Decrement speech bubble timer
    if (n.sayT > 0) {
      n.sayT -= dt;
      if (n.sayT <= 0) {
        n.say = undefined;
      }
    }

    // Occasional ambient chatter (every ~30s on average per NPC if near player)
    n.cool -= dt;
    if (n.cool <= 0) {
      n.cool = 20 + Math.random() * 25;
      if (Math.random() < 0.35 && n.sayT <= 0) {
        n.say = getNPCWeatherChatter(n, weatherId);
        n.sayT = 4.0;
      }
    }

    // Weather Behavior State Machine
    switch (weatherId) {
      case 'drizzle': {
        // === RAIN: Shelter under trees or stay huddled close to home ===
        n.weatherBehavior = 'sheltering';

        // Find shelter target: either nearest tree point or within 10px of home
        const shelterDist = 12;
        const distFromHome = Math.hypot(n.x - n.hx, n.y - n.hy);

        if (distFromHome > shelterDist) {
          // Walk back quickly to home shelter
          const dx = n.hx - n.x;
          const dy = n.hy - n.y;
          const len = Math.hypot(dx, dy);
          if (len > 0) {
            n.x += (dx / len) * 55 * dt;
            n.y += (dy / len) * 55 * dt;
            n.f = dx > 0 ? 1 : -1;
            n.mv = 1;
          }
        } else {
          // Huddled stationary with slight cozy shiver
          n.mv = 0;
          n.weatherPoseY = Math.sin(time * 20 + n.ph) * 1.0; // soft shivering vibration
        }
        break;
      }

      case 'sunny': {
        // === SUNNY: Joyful dancing hops and wide playful wandering ===
        n.weatherBehavior = 'dancing';
        n.wt -= dt;

        if (n.wt <= 0) {
          n.wt = 2.5 + Math.random() * 3.5;
          // Pick a random sunny wander target around home (radius up to 60px)
          const angle = Math.random() * Math.PI * 2;
          const r = 20 + Math.random() * 45;
          n.tx = n.hx + Math.cos(angle) * r;
          n.ty = n.hy + Math.sin(angle) * r;
        }

        // Move towards target with dancing spring
        const dx = n.tx - n.x;
        const dy = n.ty - n.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 4) {
          const spd = 65;
          n.x += (dx / dist) * spd * dt;
          n.y += (dy / dist) * spd * dt;
          n.f = dx > 0 ? 1 : -1;
          n.mv = 1;
        } else {
          n.mv = 0;
        }

        // Dancing leap pose
        n.weatherPoseY = -Math.abs(Math.sin(time * 7 + n.ph)) * 6.5;
        break;
      }

      case 'stardust': {
        // === STARDUST: Weightless levitation and calm slow drift ===
        n.weatherBehavior = 'stargazing';

        // Slow float
        n.wt -= dt;
        if (n.wt <= 0) {
          n.wt = 4 + Math.random() * 4;
          const angle = Math.random() * Math.PI * 2;
          const r = 15 + Math.random() * 25;
          n.tx = n.hx + Math.cos(angle) * r;
          n.ty = n.hy + Math.sin(angle) * r;
        }

        const dx = n.tx - n.x;
        const dy = n.ty - n.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 4) {
          const spd = 28;
          n.x += (dx / dist) * spd * dt;
          n.y += (dy / dist) * spd * dt;
          n.f = dx > 0 ? 1 : -1;
          n.mv = 1;
        } else {
          n.mv = 0;
        }

        // Levitation offset
        n.weatherPoseY = -9 + Math.sin(time * 2.8 + n.ph) * 5;
        break;
      }

      case 'snowy': {
        // === SNOWY: Slow waddling strides, sliding pauses ===
        n.weatherBehavior = 'shivering';
        n.wt -= dt;

        if (n.wt <= 0) {
          n.wt = 3 + Math.random() * 4;
          const angle = Math.random() * Math.PI * 2;
          const r = 10 + Math.random() * 30;
          n.tx = n.hx + Math.cos(angle) * r;
          n.ty = n.hy + Math.sin(angle) * r;
        }

        const dx = n.tx - n.x;
        const dy = n.ty - n.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 4) {
          const spd = 40;
          n.x += (dx / dist) * spd * dt;
          n.y += (dy / dist) * spd * dt;
          n.f = dx > 0 ? 1 : -1;
          n.mv = 1;
        } else {
          n.mv = 0;
        }

        // Soft frosty waddle / shiver
        n.weatherPoseY = Math.sin(time * 14 + n.ph) * 1.2;
        break;
      }

      case 'aurora': {
        // === AURORA: Serene slow strolls gazing up at the sky ribbons ===
        n.weatherBehavior = 'stargazing';
        n.wt -= dt;

        if (n.wt <= 0) {
          n.wt = 4 + Math.random() * 4;
          const angle = Math.random() * Math.PI * 2;
          const r = 12 + Math.random() * 32;
          n.tx = n.hx + Math.cos(angle) * r;
          n.ty = n.hy + Math.sin(angle) * r;
        }

        const dx = n.tx - n.x;
        const dy = n.ty - n.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 4) {
          const spd = 30;
          n.x += (dx / dist) * spd * dt;
          n.y += (dy / dist) * spd * dt;
          n.f = dx > 0 ? 1 : -1;
          n.mv = 1;
        } else {
          n.mv = 0;
        }

        n.weatherPoseY = -3 + Math.sin(time * 2.2 + n.ph) * 2.4;
        break;
      }

      case 'muffin_rain':
      default: {
        // === CLOUD MUFFIN BREEZE: Bouncy playful chasing around home ===
        n.weatherBehavior = 'dancing';
        n.wt -= dt;

        if (n.wt <= 0) {
          n.wt = 2.2 + Math.random() * 3.0;
          const angle = Math.random() * Math.PI * 2;
          const r = 18 + Math.random() * 44;
          n.tx = n.hx + Math.cos(angle) * r;
          n.ty = n.hy + Math.sin(angle) * r;
        }

        const dx = n.tx - n.x;
        const dy = n.ty - n.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 4) {
          const spd = 58;
          n.x += (dx / dist) * spd * dt;
          n.y += (dy / dist) * spd * dt;
          n.f = dx > 0 ? 1 : -1;
          n.mv = 1;
        } else {
          n.mv = 0;
        }

        n.weatherPoseY = -Math.abs(Math.sin(time * 6.5 + n.ph)) * 5.2;
        break;
      }
    }
  }
}

