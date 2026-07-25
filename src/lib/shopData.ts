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

export function getNameColorStyle(colorId?: string): NameColorItem {
  return NAME_COLORS.find(c => c.id === colorId) || NAME_COLORS[0];
}

export function getBackgroundThemeStyle(themeId?: string): BackgroundThemeItem {
  return BACKGROUND_THEMES.find(t => t.id === themeId) || BACKGROUND_THEMES[0];
}
