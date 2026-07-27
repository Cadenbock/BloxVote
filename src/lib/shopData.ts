import React from 'react';

export interface NameColorItem {
  id: string;
  name: string;
  price: number;
  description: string;
  badge?: string;
  className: string;
  style?: React.CSSProperties;
}

export interface BackgroundThemeItem {
  id: string;
  name: string;
  price: number;
  description: string;
  badge?: string;
  backgroundClass: string;
  cardBorderClass?: string;
  style?: React.CSSProperties;
}

export const NAME_COLORS: NameColorItem[] = [
  {
    id: 'default',
    name: 'Classic White',
    price: 0,
    description: 'The standard clean white username color.',
    className: 'text-white font-bold',
  },
  {
    id: 'neon-cyan',
    name: 'Neon Cyan Glow',
    price: 50,
    description: 'Electric cyber cyan text with a vivid subtle glow.',
    badge: 'Popular',
    className: 'text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]',
  },
  {
    id: 'golden-sparkle',
    name: 'Gold Trophy',
    price: 100,
    description: 'Shimmering metallic gold gradient for top champions.',
    badge: 'Shiny',
    className: 'bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent font-extrabold drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]',
  },
  {
    id: 'crimson-flame',
    name: 'Crimson Inferno',
    price: 150,
    description: 'Blazing fiery red to orange gradient text.',
    badge: 'Hot 🔥',
    className: 'bg-gradient-to-r from-red-500 via-rose-500 to-orange-500 bg-clip-text text-transparent font-extrabold drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]',
  },
  {
    id: 'emerald-matrix',
    name: 'Emerald Matrix',
    price: 200,
    description: 'Hacker neon green styled text with cyber aura.',
    className: 'text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]',
  },
  {
    id: 'cyber-pink',
    name: 'Cyberpunk Pink',
    price: 250,
    description: 'Vibrant futuristic neon pink text.',
    badge: 'Vivid',
    className: 'text-pink-400 font-extrabold drop-shadow-[0_0_10px_rgba(244,63,94,0.7)]',
  },
  {
    id: 'royal-violet',
    name: 'Royal Violet',
    price: 300,
    description: 'Majestic cosmic purple and fuchsia blend.',
    badge: 'Epic',
    className: 'bg-gradient-to-r from-purple-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent font-extrabold drop-shadow-[0_0_10px_rgba(192,132,252,0.6)]',
  },
  {
    id: 'rainbow-mystic',
    name: 'Rainbow Mystic',
    price: 500,
    description: 'Legendary rainbow gradient text that dazzles in chat & leaderboards!',
    badge: 'Legendary 🌈',
    className: 'bg-gradient-to-r from-red-500 via-yellow-400 via-emerald-400 via-cyan-400 to-purple-500 bg-clip-text text-transparent font-black animate-pulse drop-shadow-[0_0_12px_rgba(168,85,247,0.7)]',
  },
];

export const BACKGROUND_THEMES: BackgroundThemeItem[] = [
  {
    id: 'default',
    name: 'Dark Zinc',
    price: 0,
    description: 'The standard sleek dark workspace theme.',
    backgroundClass: 'bg-zinc-950 text-zinc-100',
    style: { background: '#09090b' },
  },
  {
    id: 'roblox-studio',
    name: 'Roblox Metaverse',
    price: 150,
    description: 'Iconic Roblox red & slate studio dark atmosphere.',
    badge: 'Roblox 🟥',
    backgroundClass: 'bg-gradient-to-b from-red-950 via-zinc-950 to-slate-950 text-zinc-100',
    cardBorderClass: 'border-red-500/40',
    style: { background: 'radial-gradient(circle at 50% 10%, #7f1d1d 0%, #18181b 50%, #020617 100%)' },
  },
  {
    id: 'golden-yellow',
    name: 'Golden Sunburst',
    price: 250,
    description: 'Radiant golden yellow glow with warm vibrant amber aura.',
    badge: 'Bright ☀️',
    backgroundClass: 'bg-gradient-to-tr from-yellow-950 via-amber-950 to-zinc-950 text-zinc-100',
    cardBorderClass: 'border-yellow-500/40',
    style: { background: 'radial-gradient(circle at 70% 30%, #713f12 0%, #451a03 45%, #09090b 100%)' },
  },
  {
    id: 'deep-space',
    name: 'Deep Space Nebula',
    price: 100,
    description: 'Cosmic dark purple space background with starlight aura.',
    badge: 'Cosmic 🌌',
    backgroundClass: 'bg-gradient-to-b from-indigo-950 via-slate-950 to-zinc-950 text-slate-100',
    cardBorderClass: 'border-indigo-500/30',
    style: { background: 'radial-gradient(circle at 50% 20%, #1e1b4b 0%, #0f172a 50%, #09090b 100%)' },
  },
  {
    id: 'neon-cyberpunk',
    name: 'Neon Cyberpunk',
    price: 200,
    description: 'Futuristic grid glow with cyan and pink ambient lights.',
    badge: 'Futuristic ⚡',
    backgroundClass: 'bg-gradient-to-tr from-cyan-950 via-zinc-950 to-pink-950 text-zinc-100',
    cardBorderClass: 'border-pink-500/30',
    style: { background: 'radial-gradient(circle at 80% 20%, #831843 0%, #09090b 45%, #083344 100%)' },
  },
  {
    id: 'golden-palace',
    name: 'Golden Hall',
    price: 300,
    description: 'Luxurious warm amber and gold accent atmosphere.',
    badge: 'Luxury 🏆',
    backgroundClass: 'bg-gradient-to-b from-amber-950 via-zinc-950 to-zinc-950 text-zinc-100',
    cardBorderClass: 'border-amber-500/30',
    style: { background: 'radial-gradient(circle at 50% 0%, #451a03 0%, #18181b 60%, #09090b 100%)' },
  },
  {
    id: 'emerald-city',
    name: 'Emerald Matrix',
    price: 400,
    description: 'Digital cyber matrix theme with glowing green tones.',
    badge: 'Sci-Fi 🟢',
    backgroundClass: 'bg-gradient-to-t from-emerald-950 via-zinc-950 to-zinc-950 text-zinc-100',
    cardBorderClass: 'border-emerald-500/30',
    style: { background: 'radial-gradient(circle at 50% 100%, #064e3b 0%, #022c22 40%, #09090b 100%)' },
  },
  {
    id: 'midnight-velvet',
    name: 'Royal Midnight',
    price: 500,
    description: 'Deep royal violet velvet canvas with glowing shadows.',
    badge: 'Royal 👑',
    backgroundClass: 'bg-gradient-to-br from-violet-950 via-slate-950 to-zinc-950 text-zinc-100',
    cardBorderClass: 'border-violet-500/30',
    style: { background: 'radial-gradient(circle at 20% 20%, #4c1d95 0%, #020617 60%, #09090b 100%)' },
  },
];

export interface FontItem {
  id: string;
  name: string;
  price: number;
  description: string;
  badge?: string;
  fontFamily: string;
  sampleText: string;
  category: string;
}

export const FONT_ITEMS: FontItem[] = [
  {
    id: 'default',
    name: 'Inter Modern',
    price: 0,
    description: 'The standard clean, highly legible interface font.',
    fontFamily: "'Inter', sans-serif",
    sampleText: 'BloxVote 2026 • Top Rated Roblox Experiences',
    category: 'Standard',
  },
  {
    id: 'fredoka',
    name: 'Fredoka Cartoon',
    price: 75,
    description: 'Friendly, rounded, playful font that feels right at home on Roblox!',
    badge: 'Popular 🎈',
    fontFamily: "'Fredoka', cursive, sans-serif",
    sampleText: 'Adopt Me! • Brookhaven RP • Blox Fruits',
    category: 'Playful',
  },
  {
    id: 'luckiest-guy',
    name: 'Roblox Blox',
    price: 150,
    description: 'Iconic chunky Roblox game title font used in top front-page experiences!',
    badge: 'Roblox 🟥',
    fontFamily: "'Luckiest Guy', cursive, sans-serif",
    sampleText: 'BloxVote 2026 • Adopt Me • Blox Fruits',
    category: 'Roblox',
  },
  {
    id: 'titan-one',
    name: 'Titan Roblox',
    price: 175,
    description: 'Heavyweight Roblox Studio UI font with big rounded block letters.',
    badge: 'Blox Studio 🔨',
    fontFamily: "'Titan One', cursive, sans-serif",
    sampleText: 'BROOKHAVEN RP • PET SIMULATOR 99',
    category: 'Roblox',
  },
  {
    id: 'outfit',
    name: 'Outfit Cyber',
    price: 100,
    description: 'Sleek, futuristic geometric font with sharp modern edges.',
    badge: 'Sleek ⚡',
    fontFamily: "'Outfit', sans-serif",
    sampleText: 'Metaverse Leaderboard • Realtime Ranking',
    category: 'Modern',
  },
  {
    id: 'chakra-petch',
    name: 'Chakra Mecha',
    price: 200,
    description: 'Angular sci-fi robotic typography for tech enthusiasts.',
    badge: 'Sci-Fi 🤖',
    fontFamily: "'Chakra Petch', sans-serif",
    sampleText: 'SYSTEM STATUS: 100% ONLINE • VOTE NOW',
    category: 'Sci-Fi',
  },
  {
    id: 'bungee',
    name: 'Bungee Heavy',
    price: 250,
    description: 'Bold impact arcade font that pops off the screen!',
    badge: 'Bold 💥',
    fontFamily: "'Bungee', cursive, sans-serif",
    sampleText: 'VOTE FOR THE BEST ROBLOX GAMES!',
    category: 'Display',
  },
  {
    id: 'permanent-marker',
    name: 'Graffiti Marker',
    price: 180,
    description: 'Expressive hand-drawn marker font for street style energy.',
    badge: 'Artistic 🎨',
    fontFamily: "'Permanent Marker', cursive",
    sampleText: 'BloxVote Community Leaderboard #1',
    category: 'Handdrawn',
  },
  {
    id: 'cinzel',
    name: 'Cinzel Royal',
    price: 300,
    description: 'Majestic classical serif font fit for gaming royalty and RPG champions.',
    badge: 'Royal 👑',
    fontFamily: "'Cinzel', serif",
    sampleText: 'The Champions Guild • Sovereign Votes',
    category: 'Classic',
  },
  {
    id: 'creepster',
    name: 'Creepster Horror',
    price: 350,
    description: 'Dripping spooky horror font perfect for Halloween & survival games!',
    badge: 'Spooky 👻',
    fontFamily: "'Creepster', cursive",
    sampleText: 'SURVIVE THE NIGHT • SCARY ROBLOX GAMES',
    category: 'Fun',
  },
  {
    id: 'lexend',
    name: 'Lexend Ultra',
    price: 120,
    description: 'Super clear, ergonomically tuned font designed for effortless reading.',
    badge: 'Crisp 📖',
    fontFamily: "'Lexend', sans-serif",
    sampleText: 'Smooth Ergonomic Typography for BloxVote',
    category: 'Clean',
  },
];

export function getNameColorStyle(colorId?: string): NameColorItem {
  return NAME_COLORS.find(c => c.id === colorId) || NAME_COLORS[0];
}

export function getBackgroundThemeStyle(themeId?: string, customConfig?: any): BackgroundThemeItem {
  if (themeId === 'custom_discord' || themeId?.startsWith('custom_')) {
    if (customConfig) {
      const accent = customConfig.accentColor || '#6366f1';
      return {
        id: 'custom_discord',
        name: customConfig.name || 'Custom Discord Theme',
        price: 1000,
        description: 'Your personalized custom Discord-style theme!',
        badge: 'Discord Custom 🎨',
        backgroundClass: customConfig.backgroundClass || 'bg-gradient-to-b from-indigo-950 via-zinc-950 to-slate-950 text-zinc-100',
        cardBorderClass: customConfig.cardBorderClass || 'border-indigo-500/40',
        style: { 
          background: customConfig.bgGradient || 'radial-gradient(circle at 50% 20%, #1e1b4b 0%, #0f172a 50%, #09090b 100%)',
          borderColor: accent,
          boxShadow: `0 0 20px ${accent}50`
        }
      };
    }
  }
  return BACKGROUND_THEMES.find(t => t.id === themeId) || BACKGROUND_THEMES[0];
}

export function getFontItemStyle(fontId?: string, customFonts: FontItem[] = []): FontItem {
  if (!fontId || fontId === 'default') return FONT_ITEMS[0];
  const allFonts = [...FONT_ITEMS, ...customFonts];
  return allFonts.find(f => f.id === fontId) || FONT_ITEMS[0];
}

export interface TitleItem {
  id: string;
  title: string;
  name: string;
  price: number;
  description: string;
  badge?: string;
  category: 'Roblox' | 'Gaming' | 'Flex' | 'Funny' | 'Roleplay' | 'Status' | 'Popular' | 'Vip' | string;
  tagClass: string;
}

export const TITLE_ITEMS: TitleItem[] = [
  {
    id: 'default',
    title: '',
    name: 'None (Clean)',
    price: 0,
    description: 'No title badge displayed in front of your username.',
    category: 'Status',
    tagClass: 'hidden',
  },
  // ROBLOX CATEGORY
  {
    id: 'roblox-legend',
    title: '[Roblox Legend 🟥]',
    name: 'Roblox Legend',
    price: 150,
    description: 'Recognized as a true legend across all Roblox games.',
    badge: 'Popular',
    category: 'Roblox',
    tagClass: 'bg-red-600/20 text-red-400 border border-red-500/50 font-black shadow-[0_0_8px_rgba(239,68,68,0.3)]',
  },
  {
    id: 'master-builder',
    title: '[Master Builder 🧱]',
    name: 'Master Builder',
    price: 120,
    description: 'For builders who craft incredible Roblox worlds.',
    category: 'Roblox',
    tagClass: 'bg-amber-600/20 text-amber-400 border border-amber-500/40 font-bold',
  },
  {
    id: 'luau-scripter',
    title: '[Luau Scripter 💻]',
    name: 'Luau Scripter',
    price: 140,
    description: 'Master of Luau scripts, RemoteEvents, and backend logic.',
    category: 'Roblox',
    tagClass: 'bg-blue-600/20 text-blue-400 border border-blue-500/40 font-bold',
  },
  {
    id: '3d-modeler',
    title: '[3D Modeler 🎨]',
    name: '3D Modeler',
    price: 125,
    description: 'Prt, MeshPart, and Blender wizardry!',
    category: 'Roblox',
    tagClass: 'bg-purple-600/20 text-purple-400 border border-purple-500/40 font-bold',
  },
  {
    id: 'bacon-lord',
    title: '[Bacon Lord 🥓]',
    name: 'Bacon Lord',
    price: 80,
    description: 'Embrace the supreme power of the classic Bacon Hair!',
    badge: 'Classic 🥓',
    category: 'Roblox',
    tagClass: 'bg-amber-700/20 text-amber-300 border border-amber-600/40 font-extrabold',
  },
  {
    id: 'guest-666',
    title: '[Guest 666 👻]',
    name: 'Guest 666',
    price: 200,
    description: 'The ancient mythic entity from classic Roblox creepypasta.',
    badge: 'Myth 👻',
    category: 'Roblox',
    tagClass: 'bg-red-950 text-red-500 border border-red-800 font-black animate-pulse',
  },
  {
    id: 'roblox-og-2006',
    title: '[2006 OG 📜]',
    name: '2006 OG',
    price: 450,
    description: 'Here since the very beginning of Roblox history.',
    badge: 'OG 📜',
    category: 'Roblox',
    tagClass: 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/50 font-black',
  },
  {
    id: 'bloxy-winner',
    title: '[Bloxy Winner 🏆]',
    name: 'Bloxy Award Winner',
    price: 300,
    description: 'Walked the red carpet and took home the golden Bloxy.',
    badge: 'Award 🏆',
    category: 'Roblox',
    tagClass: 'bg-amber-400/20 text-amber-300 border border-amber-400/60 font-black shadow-[0_0_10px_rgba(251,191,36,0.4)]',
  },
  {
    id: 'blox-hero',
    title: '[Blox Hero 🦸]',
    name: 'Blox Hero',
    price: 110,
    description: 'Protecting players across the metaverse.',
    category: 'Roblox',
    tagClass: 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40 font-bold',
  },
  {
    id: 'group-leader',
    title: '[Clan Leader 🚩]',
    name: 'Clan Leader',
    price: 130,
    description: 'Commands thousands of members in their Roblox group.',
    category: 'Roblox',
    tagClass: 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 font-bold',
  },

  // GAMING CATEGORY
  {
    id: 'fruit-master',
    title: '[Fruit Master 🍈]',
    name: 'Fruit Master',
    price: 175,
    description: 'Mastered all mythical fruits in sea combat!',
    badge: 'Blox Fruits',
    category: 'Gaming',
    tagClass: 'bg-pink-600/20 text-pink-300 border border-pink-500/40 font-black',
  },
  {
    id: 'pvp-god',
    title: '[PVP God ⚔️]',
    name: 'PVP God',
    price: 220,
    description: 'Undefeated in arena duels and sword combat.',
    badge: 'Hot ⚔️',
    category: 'Gaming',
    tagClass: 'bg-red-500/25 text-red-400 border border-red-500/60 font-black',
  },
  {
    id: 'bedwars-sweat',
    title: '[Bedwars Sweat 🛡️]',
    name: 'Bedwars Sweat',
    price: 200,
    description: 'Fast-bridging, telepearl clutching, destroying beds in seconds.',
    category: 'Gaming',
    tagClass: 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-bold',
  },
  {
    id: 'slap-master',
    title: '[Slap Master 🖐️]',
    name: 'Slap Master',
    price: 110,
    description: '100,000+ slaps and every secret glove unlocked.',
    category: 'Gaming',
    tagClass: 'bg-yellow-600/20 text-yellow-300 border border-yellow-500/40 font-bold',
  },
  {
    id: 'tower-champ',
    title: '[Tower Champion 🗼]',
    name: 'Tower Champion',
    price: 125,
    description: 'Conquered every difficulty tower in Tower of Hell.',
    category: 'Gaming',
    tagClass: 'bg-purple-600/20 text-purple-300 border border-purple-500/40 font-bold',
  },
  {
    id: 'head-hunter',
    title: '[Head Hunter 🎯]',
    name: 'Head Hunter',
    price: 120,
    description: 'Precision aim in arsenal and shooter games.',
    category: 'Gaming',
    tagClass: 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 font-bold',
  },
  {
    id: 'speed-demon',
    title: '[Speed Demon ⚡]',
    name: 'Speed Demon',
    price: 100,
    description: 'Breaking obby world records at lightspeed.',
    category: 'Gaming',
    tagClass: 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 font-black',
  },
  {
    id: 'dungeon-slayer',
    title: '[Dungeon Slayer 🐉]',
    name: 'Dungeon Slayer',
    price: 180,
    description: 'Defeated the ultimate raid bosses in RPG dungeons.',
    category: 'Gaming',
    tagClass: 'bg-rose-600/20 text-rose-300 border border-rose-500/40 font-bold',
  },
  {
    id: 'clutch-king',
    title: '[Clutch King ⏱️]',
    name: 'Clutch King',
    price: 160,
    description: 'Always wins the 1v5 round with 1 HP remaining.',
    category: 'Gaming',
    tagClass: 'bg-orange-600/20 text-orange-300 border border-orange-500/40 font-bold',
  },
  {
    id: 'shadow-ninja',
    title: '[Shadow Ninja 🥷]',
    name: 'Shadow Ninja',
    price: 130,
    description: 'Unseen, unheard, lethal stealth assassin.',
    category: 'Gaming',
    tagClass: 'bg-zinc-700/40 text-zinc-300 border border-zinc-600/50 font-bold',
  },
  {
    id: 'cyber-samurai',
    title: '[Cyber Samurai 🗡️]',
    name: 'Cyber Samurai',
    price: 210,
    description: 'Blade runner of neon city battles.',
    category: 'Gaming',
    tagClass: 'bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/40 font-extrabold',
  },

  // FLEX CATEGORY
  {
    id: 'tuff-guy',
    title: '[Tuff Guy 😎]',
    name: 'Tuff Guy',
    price: 100,
    description: 'Walks into any server with ultimate drip and confidence.',
    badge: 'Vibe 😎',
    category: 'Flex',
    tagClass: 'bg-slate-700/40 text-slate-200 border border-slate-500/50 font-black',
  },
  {
    id: 'blox-god',
    title: '[Blox God ⚡]',
    name: 'Blox God',
    price: 300,
    description: 'Reigns supreme at the peak of the BloxVote leaderboard.',
    badge: 'Supreme ⚡',
    category: 'Flex',
    tagClass: 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/70 font-black shadow-[0_0_12px_rgba(234,179,8,0.5)]',
  },
  {
    id: 'blox-millionaire',
    title: '[Blox Millionaire 💰]',
    name: 'Blox Millionaire',
    price: 400,
    description: 'Rolling in BloxCoins with unlimited shopping power.',
    badge: 'Rich 💰',
    category: 'Flex',
    tagClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/60 font-black shadow-[0_0_10px_rgba(16,185,129,0.4)]',
  },
  {
    id: 'gigachad',
    title: '[Gigachad 🗿]',
    name: 'Gigachad',
    price: 150,
    description: 'Unshakable jawline and unmatched energy.',
    category: 'Flex',
    tagClass: 'bg-stone-600/30 text-stone-200 border border-stone-500/50 font-black',
  },
  {
    id: 'main-character',
    title: '[Main Character ⭐]',
    name: 'Main Character',
    price: 180,
    description: 'The universe revolves around them in every server.',
    category: 'Flex',
    tagClass: 'bg-amber-500/20 text-amber-300 border border-amber-400/50 font-black',
  },
  {
    id: 'flex-god',
    title: '[Flex God 💎]',
    name: 'Flex God',
    price: 350,
    description: 'Dripped out in rare limited cosmetics.',
    category: 'Flex',
    tagClass: 'bg-cyan-400/20 text-cyan-200 border border-cyan-300/60 font-black shadow-[0_0_10px_rgba(34,211,238,0.5)]',
  },
  {
    id: 'his-royal-highness',
    title: '[His Royal Highness 👑]',
    name: 'His Royal Highness',
    price: 300,
    description: 'Bows are required when entering chat.',
    category: 'Flex',
    tagClass: 'bg-purple-600/25 text-purple-200 border border-purple-400/60 font-black',
  },
  {
    id: 'sigma-male',
    title: '[Sigma Grindset 🗿]',
    name: 'Sigma Grindset',
    price: 170,
    description: 'Silent focus, max efficiency, zero distractions.',
    category: 'Flex',
    tagClass: 'bg-zinc-700/40 text-zinc-200 border border-zinc-500/50 font-black',
  },
  {
    id: 'ultimate-champion',
    title: '[ULTIMATE CHAMPION 🏆]',
    name: 'Ultimate Champion',
    price: 500,
    description: 'The pinnacle title reserved for absolute legendary status.',
    badge: 'Apex 👑',
    category: 'Flex',
    tagClass: 'bg-gradient-to-r from-yellow-500/30 via-amber-500/30 to-yellow-500/30 text-yellow-200 border border-yellow-300/80 font-black animate-pulse shadow-[0_0_15px_rgba(234,179,8,0.6)]',
  },

  // FUNNY CATEGORY
  {
    id: 'pro-noob',
    title: '[Pro Noob 🐣]',
    name: 'Pro Noob',
    price: 50,
    description: 'Proudly rock the yellow skin, blue shirt, and green pants vibe.',
    badge: 'Meme 🐣',
    category: 'Funny',
    tagClass: 'bg-lime-500/20 text-lime-300 border border-lime-400/40 font-bold',
  },
  {
    id: 'giga-brain',
    title: '[Giga Brain 🧠]',
    name: 'Giga Brain',
    price: 100,
    description: 'Calculates obby physics trajectory down to the nanosecond.',
    category: 'Funny',
    tagClass: 'bg-pink-500/20 text-pink-300 border border-pink-400/40 font-bold',
  },
  {
    id: 'self-aware-npc',
    title: '[Self-Aware NPC 🤖]',
    name: 'Self-Aware NPC',
    price: 60,
    description: 'Stands in spawn giving side quests to random players.',
    category: 'Funny',
    tagClass: 'bg-teal-500/20 text-teal-300 border border-teal-400/40 font-bold',
  },
  {
    id: 'chill-guy',
    title: '[Just A Chill Guy 🧢]',
    name: 'Just A Chill Guy',
    price: 90,
    description: 'No stress, no rage, just hanging out in Brookhaven.',
    category: 'Funny',
    tagClass: 'bg-sky-500/20 text-sky-300 border border-sky-400/40 font-bold',
  },
  {
    id: 'glitch-master',
    title: '[Glitch Master 👾]',
    name: 'Glitch Master',
    price: 175,
    description: 'Clipping through walls and dance-glitching into secret areas.',
    category: 'Funny',
    tagClass: 'bg-violet-500/20 text-violet-300 border border-violet-400/40 font-bold',
  },
  {
    id: 'lag-warrior',
    title: '[Lag Warrior 📶]',
    name: 'Lag Warrior',
    price: 70,
    description: 'Teleporting across the map due to 999ms ping!',
    category: 'Funny',
    tagClass: 'bg-red-500/20 text-red-300 border border-red-400/40 font-bold',
  },

  // ROLEPLAY & STATUS CATEGORY
  {
    id: 'brookhaven-vip',
    title: '[Brookhaven VIP 🏰]',
    name: 'Brookhaven VIP',
    price: 180,
    description: 'Drives sports cars and owns mansion #1 in town.',
    category: 'Roleplay',
    tagClass: 'bg-rose-500/20 text-rose-300 border border-rose-400/40 font-extrabold',
  },
  {
    id: 'pet-collector',
    title: '[Pet Collector 🐾]',
    name: 'Pet Collector',
    price: 120,
    description: 'Inventory full of Mega Neon Legendary pets.',
    category: 'Roleplay',
    tagClass: 'bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold',
  },
  {
    id: 'tycoon-boss',
    title: '[Tycoon Boss 🏢]',
    name: 'Tycoon Boss',
    price: 140,
    description: 'Auto-collectors running 24/7 with max droppers.',
    category: 'Roleplay',
    tagClass: 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 font-bold',
  },
  {
    id: 'og-gamer',
    title: '[OG Gamer 🏆]',
    name: 'OG Gamer',
    price: 200,
    description: 'Respected veteran across every gaming server.',
    category: 'Status',
    tagClass: 'bg-amber-400/25 text-amber-200 border border-amber-400/50 font-black',
  },
  {
    id: 'code-wizard',
    title: '[Code Wizard 🧙]',
    name: 'Code Wizard',
    price: 160,
    description: 'Casts spells with lines of code.',
    category: 'Status',
    tagClass: 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 font-bold',
  },
  {
    id: 'top-voter',
    title: '[Top Voter 🗳️]',
    name: 'Top Voter',
    price: 100,
    description: 'Consistently votes for games every single day.',
    category: 'Status',
    tagClass: 'bg-blue-500/20 text-blue-300 border border-blue-400/40 font-bold',
  },
  {
    id: 'streak-master',
    title: '[Streak Master 🔥]',
    name: 'Streak Master',
    price: 120,
    description: 'Keeps an active voting streak alive for months!',
    category: 'Status',
    tagClass: 'bg-orange-500/20 text-orange-300 border border-orange-400/50 font-black',
  },
  {
    id: 'vibe-master',
    title: '[Vibe Master ✨]',
    name: 'Vibe Master',
    price: 75,
    description: 'Spreading good vibes and positivity in live chat.',
    category: 'Popular',
    tagClass: 'bg-purple-500/20 text-purple-300 border border-purple-400/40 font-bold',
  },
  {
    id: 'blox-streamer',
    title: '[Blox Streamer 🎥]',
    name: 'Blox Streamer',
    price: 190,
    description: 'Live broadcasting gameplay to thousands of fans.',
    category: 'Popular',
    tagClass: 'bg-red-600/20 text-red-300 border border-red-500/40 font-bold',
  },
  {
    id: 'content-creator',
    title: '[Content Creator 📹]',
    name: 'Content Creator',
    price: 220,
    description: 'Making viral shorts, tutorials, and game reviews.',
    category: 'Popular',
    tagClass: 'bg-rose-500/20 text-rose-300 border border-rose-400/50 font-black',
  },
  {
    id: 'galactic-explorer',
    title: '[Galactic Explorer 🚀]',
    name: 'Galactic Explorer',
    price: 110,
    description: 'Traveling across alien planets and space stations.',
    category: 'Gaming',
    tagClass: 'bg-indigo-600/20 text-indigo-300 border border-indigo-400/40 font-bold',
  },
  {
    id: 'mysterious-gamer',
    title: '[Mysterious Gamer 🕵️]',
    name: 'Mysterious Gamer',
    price: 100,
    description: 'No one knows their real identity, but everyone knows their skill.',
    category: 'Status',
    tagClass: 'bg-zinc-800/60 text-zinc-300 border border-zinc-600/50 font-bold',
  },
  {
    id: 'pixel-pioneer',
    title: '[Pixel Pioneer 👾]',
    name: 'Pixel Pioneer',
    price: 110,
    description: 'Exploring retro blocks and 8-bit aesthetic worlds.',
    category: 'Gaming',
    tagClass: 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40 font-bold',
  },
  {
    id: 'anime-mc',
    title: '[Anime MC ⛩️]',
    name: 'Anime MC',
    price: 200,
    description: 'Unlocks a power transformation when music starts playing!',
    category: 'Gaming',
    tagClass: 'bg-red-500/20 text-red-300 border border-red-400/50 font-black',
  },
  {
    id: 'star-voter',
    title: '[Star Voter ⭐]',
    name: 'Star Voter',
    price: 80,
    description: 'Supporting game creators with top ratings.',
    category: 'Status',
    tagClass: 'bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold',
  },
  {
    id: 'midnight-gamer',
    title: '[Midnight Gamer 🌙]',
    name: 'Midnight Gamer',
    price: 95,
    description: 'Grinding games while the rest of the world sleeps.',
    category: 'Popular',
    tagClass: 'bg-slate-700/30 text-slate-300 border border-slate-500/40 font-bold',
  },
  {
    id: 'smooth-operator',
    title: '[Smooth Operator 🕶️]',
    name: 'Smooth Operator',
    price: 140,
    description: 'Handles any game emergency with total cool.',
    category: 'Flex',
    tagClass: 'bg-stone-700/30 text-stone-200 border border-stone-500/40 font-bold',
  },
];

export function getTitleItemStyle(titleId?: string, customTitles: TitleItem[] = []): TitleItem {
  if (!titleId || titleId === 'default') return TITLE_ITEMS[0];
  const allTitles = [...TITLE_ITEMS, ...customTitles];
  const found = allTitles.find(t => t.id === titleId || t.title === titleId);
  if (found) return found;
  // Custom approved title or direct string title
  const formattedTitle = titleId.startsWith('[') ? titleId : `[${titleId}]`;
  return {
    id: titleId,
    title: formattedTitle,
    name: titleId,
    price: 1000,
    description: 'Custom verified player title.',
    badge: 'Custom 👑',
    category: 'Vip',
    tagClass: 'bg-amber-400/20 text-amber-200 border border-amber-400/50 font-black shadow-xs',
  };
}
