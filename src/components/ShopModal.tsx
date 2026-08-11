import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Coins, 
  Check, 
  Sparkles, 
  Palette, 
  Image as ImageIcon, 
  Type, 
  Gift, 
  Award, 
  Search, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Sliders, 
  Upload, 
  Trash2,
  Lock,
  ArrowRight,
  ShoppingBag,
  Shirt
} from 'lucide-react';
import CoolMerchButton from './CoolMerchButton';
import { User } from 'firebase/auth';
import { 
  NAME_COLORS, 
  BACKGROUND_THEMES, 
  FONT_ITEMS,
  TITLE_ITEMS,
  NameColorItem, 
  BackgroundThemeItem, 
  FontItem,
  TitleItem,
  getNameColorStyle, 
  getBackgroundThemeStyle,
  getFontItemStyle,
  getTitleItemStyle
} from '../lib/shopData';
import { UserProfileData, CustomTitleRequest, AdminCustomTitle, AdminCustomFont, CustomThemeConfig, CustomColorConfig, CustomFontConfig } from '../types';
import { playSound } from '../lib/sounds';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  profileData: UserProfileData;
  onBuyItem: (type: 'color' | 'theme' | 'font' | 'title', item: NameColorItem | BackgroundThemeItem | FontItem | TitleItem) => Promise<boolean>;
  onEquipItem: (type: 'color' | 'theme' | 'font' | 'title', itemId: string) => Promise<void>;
  onRequestCustomTitle: (requestedTitle: string) => Promise<boolean>;
  customTitleRequest?: CustomTitleRequest | null;
  onClaimDailyBonus: () => Promise<void>;
  onSaveCustomTheme?: (config: CustomThemeConfig) => Promise<boolean>;
  onSaveCustomColor?: (config: CustomColorConfig) => Promise<boolean>;
  onSaveCustomFont?: (config: CustomFontConfig) => Promise<boolean>;
  customAdminTitles?: AdminCustomTitle[];
  customAdminFonts?: AdminCustomFont[];
  previewThemeId?: string | null;
  onPreviewTheme?: (themeId: string | null) => void;
  previewFontId?: string | null;
  onPreviewFont?: (fontId: string | null) => void;
}

const STARTER_PALETTES = [
  { id: 'obsidian', name: 'Obsidian Nitro 🔮', start: '#1e1b4b', mid: '#0f172a', end: '#09090b', accent: '#6366f1', type: 'radial_center' },
  { id: 'blurple', name: 'Discord Blurple 💬', start: '#2b2d31', mid: '#1e1f22', end: '#111214', accent: '#5865f2', type: 'radial_center' },
  { id: 'cyber', name: 'Cyber Neon ⚡', start: '#042f2e', mid: '#090d16', end: '#020617', accent: '#06b6d4', type: 'linear_diagonal' },
  { id: 'crimson', name: 'Crimson Moon 🩸', start: '#450a0a', mid: '#18080a', end: '#090304', accent: '#ef4444', type: 'radial_center' },
  { id: 'emerald', name: 'Emerald Slime 💚', start: '#022c22', mid: '#051a14', end: '#020617', accent: '#10b981', type: 'radial_corner' },
  { id: 'gold', name: 'Royal Gold Empire 👑', start: '#451a03', mid: '#1c0d02', end: '#090501', accent: '#f59e0b', type: 'radial_center' },
  { id: 'vaporwave', name: 'Vaporwave Sunset 🌸', start: '#701a75', mid: '#3b0764', end: '#09090b', accent: '#ec4899', type: 'linear_down' },
  { id: 'galaxy', name: 'Galaxy Violet 🌌', start: '#311042', mid: '#110726', end: '#03010a', accent: '#a855f7', type: 'radial_center' }
];

export default function ShopModal({
  isOpen,
  onClose,
  user,
  profileData,
  onBuyItem,
  onEquipItem,
  onRequestCustomTitle,
  customTitleRequest,
  onClaimDailyBonus,
  onSaveCustomTheme,
  onSaveCustomColor,
  onSaveCustomFont,
  customAdminTitles = [],
  customAdminFonts = [],
}: ShopModalProps) {
  const [activeTab, setActiveTab] = useState<'titles' | 'colors' | 'themes' | 'fonts' | 'earn' | 'merch'>('titles');
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [isClaimingBonus, setIsClaimingBonus] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Custom title request state
  const [customTitleInput, setCustomTitleInput] = useState('');
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);

  // Custom Theme Builder state
  const [customThemeName, setCustomThemeName] = useState('My Custom Theme');
  const [gradientType, setGradientType] = useState<string>('radial_center');
  const [startColor, setStartColor] = useState('#1e1b4b');
  const [midColor, setMidColor] = useState('#0f172a');
  const [endColor, setEndColor] = useState('#09090b');
  const [accentColor, setAccentColor] = useState('#6366f1');
  const [glowIntensity, setGlowIntensity] = useState<'soft' | 'medium' | 'high'>('medium');
  const [isSavingCustomTheme, setIsSavingCustomTheme] = useState(false);

  // Custom Color Studio State
  const [customColorName, setCustomColorName] = useState('My Custom Aura');
  const [customColorType, setCustomColorType] = useState<'solid' | 'linear' | 'radial'>('linear');
  const [customColor1, setCustomColor1] = useState('#38bdf8');
  const [customColor2, setCustomColor2] = useState('#a855f7');
  const [customColor3, setCustomColor3] = useState('#f43f5e');
  const [customGlowColor, setCustomGlowColor] = useState('#38bdf8');
  const [customGlowIntensity, setCustomGlowIntensity] = useState<'none' | 'soft' | 'medium' | 'high'>('medium');
  const [isSavingCustomColor, setIsSavingCustomColor] = useState(false);

  // Custom Font Studio State
  const [customFontName, setCustomFontName] = useState('Press Start 2P Font');
  const [customFontFamily, setCustomFontFamily] = useState('Press Start 2P');
  const [customFontUrl, setCustomFontUrl] = useState('');
  const [customFontDataUrl, setCustomFontDataUrl] = useState<string>('');
  const [customFontFileName, setCustomFontFileName] = useState<string>('');
  const [uploadedFontError, setUploadedFontError] = useState<string>('');
  const [customFontSample, setCustomFontSample] = useState('ROBLOX VOTER 2026 • LEADERBOARD #1');
  const [isSavingCustomFont, setIsSavingCustomFont] = useState(false);

  // Clock for Cooldowns
  const [nowClock, setNowClock] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const lastTitleReqMs = useMemo(() => {
    let t = profileData.lastCustomTitleRequestTime || 0;
    if (customTitleRequest?.requestedAt) {
      const ra = customTitleRequest.requestedAt;
      if (typeof ra?.toMillis === 'function') {
        t = Math.max(t, ra.toMillis());
      } else if (typeof ra?.seconds === 'number') {
        t = Math.max(t, ra.seconds * 1000);
      } else if (typeof ra === 'number') {
        t = Math.max(t, ra);
      }
    }
    return t;
  }, [profileData.lastCustomTitleRequestTime, customTitleRequest]);

  const COOLDOWN_DURATION = 10 * 60 * 1000;
  const cooldownElapsed = nowClock - lastTitleReqMs;
  const cooldownRemainingSec = Math.max(0, Math.ceil((COOLDOWN_DURATION - cooldownElapsed) / 1000));
  const isCooldownActive = lastTitleReqMs > 0 && cooldownRemainingSec > 0;

  const formatCountdown = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Compute Gradients
  const computedBgGradient = useMemo(() => {
    if (gradientType === 'linear_down') return `linear-gradient(180deg, ${startColor} 0%, ${midColor} 50%, ${endColor} 100%)`;
    if (gradientType === 'linear_diagonal') return `linear-gradient(135deg, ${startColor} 0%, ${midColor} 50%, ${endColor} 100%)`;
    if (gradientType === 'radial_corner') return `radial-gradient(circle at 80% 20%, ${startColor} 0%, ${midColor} 50%, ${endColor} 100%)`;
    return `radial-gradient(circle at 50% 20%, ${startColor} 0%, ${midColor} 50%, ${endColor} 100%)`;
  }, [gradientType, startColor, midColor, endColor]);

  // Catalog Mappings
  const allTitlesCatalog = useMemo(() => {
    const adminMapped: TitleItem[] = (customAdminTitles || []).map(at => ({
      id: at.id,
      name: at.name,
      title: at.title,
      price: at.price,
      badge: 'Admin Custom 👑',
      category: at.category || 'Roblox',
      description: at.description,
      tagClass: at.tagClass || 'bg-amber-400/20 text-amber-200 border border-amber-400/60 font-black shadow-xs'
    }));

    const userPurchased = profileData.purchasedTitles || ['default'];
    const userCustomMapped: TitleItem[] = userPurchased
      .filter(pt => pt && pt !== 'default' && 
        !TITLE_ITEMS.some(item => item.id === pt || item.title === pt || item.name === pt) && 
        !(customAdminTitles || []).some(at => at.id === pt || at.title === pt || at.name === pt)
      )
      .map(pt => ({
        id: pt,
        title: pt.startsWith('[') ? pt : `[${pt}]`,
        name: pt,
        price: 1000,
        badge: 'Your Custom 👑',
        category: 'Vip',
        description: 'Your saved custom title in your inventory.',
        tagClass: 'bg-amber-400/20 text-amber-200 border border-amber-400/50 font-black shadow-xs',
      }));

    return [...userCustomMapped, ...adminMapped, ...TITLE_ITEMS];
  }, [customAdminTitles, profileData.purchasedTitles]);

  const todayStr = new Date().toISOString().split('T')[0];
  const canClaimDaily = user && profileData.lastDailyBonusDate !== todayStr;

  const equippedColorStyle = getNameColorStyle(profileData.equippedColor, profileData.customColorConfig);
  const equippedThemeStyle = getBackgroundThemeStyle(profileData.equippedTheme, profileData.customThemeConfig);
  const equippedFontStyle = getFontItemStyle(profileData.equippedFont, customAdminFonts as any);
  const equippedTitleStyle = getTitleItemStyle(profileData.equippedTitle, customAdminTitles as any);

  const purchasedTitles = profileData.purchasedTitles || ['default'];
  const purchasedColors = profileData.purchasedColors || ['default'];
  const purchasedThemes = profileData.purchasedThemes || ['default'];
  const purchasedFonts = profileData.purchasedFonts || ['default'];

  const handleBuy = async (type: 'color' | 'theme' | 'font' | 'title', item: any) => {
    setLoadingItemId(item.id);
    try {
      const res = await onBuyItem(type, item);
      if (res) playSound('purchase');
    } finally {
      setLoadingItemId(null);
    }
  };

  const handleEquip = async (type: 'color' | 'theme' | 'font' | 'title', itemId: string) => {
    setLoadingItemId(itemId);
    try {
      await onEquipItem(type, itemId);
      playSound('equip');
    } finally {
      setLoadingItemId(null);
    }
  };

  const handleCustomTitleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitleInput.trim() || profileData.coins < 1000) return;
    setIsSubmittingCustom(true);
    try {
      const success = await onRequestCustomTitle(customTitleInput.trim());
      if (success) setCustomTitleInput('');
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  const handleSaveThemeBuilder = async () => {
    if (!onSaveCustomTheme) return;
    setIsSavingCustomTheme(true);
    try {
      await onSaveCustomTheme({
        name: customThemeName.trim() || 'My Custom Theme',
        bgGradient: computedBgGradient,
        backgroundClass: 'bg-zinc-950 text-zinc-100',
        cardBorderClass: 'border-indigo-500/50 shadow-lg',
        accentColor: accentColor
      });
    } finally {
      setIsSavingCustomTheme(false);
    }
  };

  const handleSaveColorBuilder = async () => {
    if (!onSaveCustomColor) return;
    setIsSavingCustomColor(true);
    try {
      await onSaveCustomColor({
        name: customColorName.trim() || 'My Custom Aura',
        type: customColorType,
        color1: customColor1,
        color2: customColor2,
        color3: customColor3,
        glowColor: customGlowColor,
        glowIntensity: customGlowIntensity,
      });
    } finally {
      setIsSavingCustomColor(false);
    }
  };

  const handleSaveFontBuilder = async () => {
    if (!onSaveCustomFont) return;
    setIsSavingCustomFont(true);
    try {
      await onSaveCustomFont({
        name: customFontName.trim() || 'My Custom Font',
        fontFamily: customFontFamily.trim() || 'sans-serif',
        sampleText: customFontSample.trim() || 'ROBLOX VOTER 2026',
        fontUrl: customFontUrl.trim() || undefined,
        fontDataUrl: customFontDataUrl || undefined,
        fontFileName: customFontFileName || undefined,
      });
    } finally {
      setIsSavingCustomFont(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/85 backdrop-blur-xl overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-6xl overflow-hidden rounded-3xl sm:rounded-[2.5rem] border border-zinc-800/90 bg-zinc-950 text-white shadow-2xl my-auto"
        >
          {/* Top Banner Header */}
          <div className="relative bg-gradient-to-r from-amber-600/25 via-purple-600/20 to-blue-600/25 p-6 sm:p-8 border-b border-zinc-800/80">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 sm:top-6 sm:right-6 rounded-full p-2.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all active:scale-95 z-20"
            >
              <X size={22} />
            </button>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pr-10">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-500 p-1 shadow-xl shadow-amber-950/40 shrink-0">
                  <img src="/favicon.png" alt="BloxVote Logo" className="h-full w-full object-contain p-1" />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-widest mb-1">
                    <Sparkles size={15} className="animate-pulse" />
                    <span>BloxCoins Cosmetic Shop</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    Marketplace & Customizer
                  </h2>
                </div>
              </div>

              {/* Coin Counter & Daily Reward Button */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3.5 bg-zinc-900/90 border border-amber-500/40 rounded-2xl px-5 py-3 shadow-xl shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-black shadow-md">
                    <Coins size={22} className="fill-black" />
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold text-amber-400/90 uppercase tracking-wider">Your Balance</div>
                    <div className="text-xl font-black text-white flex items-center gap-1.5">
                      {profileData.coins.toLocaleString()} <span className="text-xs font-bold text-amber-400">Coins</span>
                    </div>
                  </div>
                </div>

                {canClaimDaily && (
                  <button
                    onClick={onClaimDailyBonus}
                    disabled={isClaimingBonus}
                    className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 px-5 py-3 text-xs font-black text-black shadow-lg shadow-amber-950/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Gift size={18} className="animate-bounce" />
                    <span>{isClaimingBonus ? 'Claiming...' : 'Claim Daily +25 Coins'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Current Equipped Look Bar */}
            <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 px-5 py-3 text-xs">
              <span className="font-extrabold text-zinc-400 uppercase tracking-wider text-[10px]">Your Equipped Avatar Preview:</span>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800">
                {equippedTitleStyle.title && (
                  <span className={`px-2 py-0.5 rounded text-[10px] ${equippedTitleStyle.tagClass}`}>
                    {equippedTitleStyle.title}
                  </span>
                )}
                <span className={equippedColorStyle.className} style={equippedColorStyle.style}>
                  {user?.displayName || 'Your Username'}
                </span>
              </div>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-400">Theme: <strong className="text-zinc-200">{equippedThemeStyle.name}</strong></span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-400">Font: <strong className="text-amber-300" style={{ fontFamily: equippedFontStyle.fontFamily }}>{equippedFontStyle.name}</strong></span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-zinc-800/80 px-6 sm:px-8 pt-3 bg-zinc-950/80 gap-3 overflow-x-auto scrollbar-none">
            <button
              onClick={() => {
                playSound('click');
                setActiveTab('titles');
              }}
              className={`flex items-center gap-2.5 py-4 px-6 font-extrabold text-sm border-b-2 transition-all shrink-0 ${
                activeTab === 'titles'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Award size={18} />
              Titles & Prefix Catalog
            </button>
            <button
              onClick={() => {
                playSound('click');
                setActiveTab('colors');
              }}
              className={`flex items-center gap-2.5 py-4 px-6 font-extrabold text-sm border-b-2 transition-all shrink-0 ${
                activeTab === 'colors'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Palette size={18} />
              Name Colors & Auras
            </button>
            <button
              onClick={() => {
                playSound('click');
                setActiveTab('themes');
              }}
              className={`flex items-center gap-2.5 py-4 px-6 font-extrabold text-sm border-b-2 transition-all shrink-0 ${
                activeTab === 'themes'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ImageIcon size={18} />
              Background Themes
            </button>
            <button
              onClick={() => {
                playSound('merchOpen');
                setActiveTab('merch');
              }}
              className={`flex items-center gap-2.5 py-4 px-6 font-extrabold text-sm border-b-2 transition-all shrink-0 relative ${
                activeTab === 'merch'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-rose-400 hover:text-rose-200'
              }`}
            >
              <Shirt size={18} className="text-amber-400 animate-bounce" />
              <span>Official Merch Store</span>
              <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-rose-500 text-zinc-950 font-black text-[9px] uppercase tracking-wider animate-pulse">
                HOT DROP
              </span>
            </button>
            <button
              onClick={() => {
                playSound('click');
                setActiveTab('earn');
              }}
              className={`flex items-center gap-2.5 py-4 px-6 font-extrabold text-sm border-b-2 transition-all shrink-0 ${
                activeTab === 'earn'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Coins size={18} />
              Free Coins & Bonuses
            </button>
          </div>

          {/* Main Tab Content View */}
          <div className="p-6 sm:p-8 md:p-10 max-h-[65vh] overflow-y-auto space-y-8">
            
            {/* TITLES TAB */}
            {activeTab === 'titles' && (
              <div className="space-y-8">
                {/* Custom Title Creator Box */}
                <div className="rounded-3xl border border-amber-500/40 bg-gradient-to-r from-amber-950/30 via-purple-950/20 to-zinc-950 p-6 sm:p-8 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider mb-1">
                        <Sparkles size={16} className="text-amber-400" />
                        <span>Exclusive Custom Service</span>
                      </div>
                      <h3 className="text-2xl font-black text-white">Create Your Custom Title</h3>
                      <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
                        Request a custom title for <strong className="text-amber-300">1,000 BloxCoins</strong>. Requests are sent to Admins and approved within minutes!
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 bg-amber-500/15 border border-amber-500/40 px-4 py-2.5 rounded-2xl">
                      <Coins className="text-amber-400 fill-amber-400" size={22} />
                      <span className="font-black text-amber-300 text-lg">1,000 Coins</span>
                    </div>
                  </div>

                  {/* Cooldown Alert */}
                  {isCooldownActive && (
                    <div className="p-4 rounded-2xl bg-amber-950/50 border border-amber-500/40 mb-6 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <Clock size={20} className="text-amber-400 animate-spin" />
                        <span>Custom title creation cooldown active. Ready in:</span>
                      </div>
                      <span className="font-mono text-base font-black text-amber-300">{formatCountdown(cooldownRemainingSec)}</span>
                    </div>
                  )}

                  {/* Form Input */}
                  <form onSubmit={handleCustomTitleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                          Requested Custom Title Prefix
                        </label>
                        <input
                          type="text"
                          maxLength={30}
                          disabled={isCooldownActive}
                          value={customTitleInput}
                          onChange={(e) => setCustomTitleInput(e.target.value)}
                          placeholder="e.g. Roblox Legend or [Valkyrie Boss]"
                          className="w-full rounded-2xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                          Title Live Preview
                        </label>
                        <div className="flex h-[46px] items-center gap-2 rounded-2xl bg-zinc-950 border border-zinc-800 px-4 text-xs">
                          {customTitleInput.trim() ? (
                            <span className="px-2.5 py-1 rounded text-[10px] bg-gradient-to-r from-amber-500/30 to-yellow-500/30 text-amber-300 border border-amber-400/60 font-black">
                              {customTitleInput.trim().startsWith('[') ? customTitleInput.trim() : `[${customTitleInput.trim()}]`}
                            </span>
                          ) : (
                            <span className="text-zinc-600 italic">Type a title...</span>
                          )}
                          <span className={equippedColorStyle.className} style={equippedColorStyle.style}>
                            {user?.displayName || 'YourName'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={isCooldownActive || !customTitleInput.trim() || profileData.coins < 1000 || isSubmittingCustom}
                        className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 px-7 py-3 text-xs font-black text-black shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                      >
                        <Send size={16} />
                        <span>{isSubmittingCustom ? 'Submitting...' : 'Submit Request (1,000 Coins)'}</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Catalog Grid */}
                <div>
                  <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                    <Award className="text-amber-400" size={22} />
                    Title Catalog ({allTitlesCatalog.length})
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {allTitlesCatalog.map((item) => {
                      const isOwned = purchasedTitles.includes(item.id) || purchasedTitles.includes(item.title) || purchasedTitles.includes(item.name) || item.price === 0;
                      const isEquipped = profileData.equippedTitle === item.id || profileData.equippedTitle === item.title || profileData.equippedTitle === item.name;

                      return (
                        <div
                          key={item.id}
                          className={`relative rounded-3xl border p-6 transition-all ${
                            isEquipped
                              ? 'border-emerald-500/80 bg-emerald-950/20 shadow-xl'
                              : isOwned
                              ? 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                              : 'border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700'
                          }`}
                        >
                          {item.badge && (
                            <span className="absolute top-4 right-4 rounded-full bg-amber-500/20 px-3 py-1 text-[10px] font-black text-amber-300 border border-amber-500/30">
                              {item.badge}
                            </span>
                          )}

                          <div className="space-y-3">
                            <h4 className="text-lg font-black text-white">{item.name}</h4>
                            <p className="text-xs text-zinc-400 leading-relaxed">{item.description}</p>

                            <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800/80 inline-flex items-center gap-2 text-xs">
                              <span className={`px-2.5 py-1 rounded text-xs ${item.tagClass}`}>
                                {item.title}
                              </span>
                              <span className={equippedColorStyle.className} style={equippedColorStyle.style}>
                                {user?.displayName || 'YourName'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
                              <span className="font-extrabold text-amber-300 text-sm">{item.price === 0 ? 'FREE' : `${item.price.toLocaleString()} Coins`}</span>

                              {isOwned ? (
                                <button
                                  onClick={() => handleEquip('title', isEquipped ? 'default' : item.id)}
                                  disabled={loadingItemId === item.id}
                                  className={`rounded-xl px-5 py-2 text-xs font-black transition-all ${
                                    isEquipped
                                      ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                                      : 'bg-zinc-800 text-white hover:bg-zinc-700'
                                  }`}
                                >
                                  {isEquipped ? 'Equipped ✓' : 'Equip Title'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleBuy('title', item)}
                                  disabled={profileData.coins < item.price || loadingItemId === item.id}
                                  className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-black text-black hover:bg-amber-400 transition-all disabled:opacity-40"
                                >
                                  Buy Title
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* COLORS TAB */}
            {activeTab === 'colors' && (
              <div className="space-y-8">
                {/* Custom Color Studio */}
                <div className="rounded-3xl border border-blue-500/40 bg-zinc-900/60 p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-black text-white flex items-center gap-2">
                        <Palette size={22} className="text-blue-400" />
                        Custom Name Color Studio
                      </h3>
                      <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                        Design your custom gradient or glowing username aura.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <label className="block text-xs font-black uppercase text-zinc-400">Color 1</label>
                      <input type="color" value={customColor1} onChange={e => setCustomColor1(e.target.value)} className="h-12 w-full rounded-xl bg-zinc-950 p-1 cursor-pointer border border-zinc-800" />
                    </div>
                    <div className="space-y-3">
                      <label className="block text-xs font-black uppercase text-zinc-400">Color 2</label>
                      <input type="color" value={customColor2} onChange={e => setCustomColor2(e.target.value)} className="h-12 w-full rounded-xl bg-zinc-950 p-1 cursor-pointer border border-zinc-800" />
                    </div>
                    <div className="space-y-3">
                      <label className="block text-xs font-black uppercase text-zinc-400">Glow Aura</label>
                      <input type="color" value={customGlowColor} onChange={e => setCustomGlowColor(e.target.value)} className="h-12 w-full rounded-xl bg-zinc-950 p-1 cursor-pointer border border-zinc-800" />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveColorBuilder}
                      disabled={isSavingCustomColor}
                      className="rounded-2xl bg-blue-600 px-7 py-3 text-xs font-black text-white hover:bg-blue-500 transition-all shadow-lg"
                    >
                      {isSavingCustomColor ? 'Saving...' : 'Save & Equip Custom Color'}
                    </button>
                  </div>
                </div>

                {/* Preset Colors Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {NAME_COLORS.map(item => {
                    const isOwned = purchasedColors.includes(item.id) || item.price === 0;
                    const isEquipped = profileData.equippedColor === item.id;
                    const colorStyle = getNameColorStyle(item.id);

                    return (
                      <div key={item.id} className="rounded-3xl border border-zinc-800/90 bg-zinc-900/60 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-base font-black text-white">{item.name}</h4>
                          <span className="text-xs font-extrabold text-amber-300">{item.price === 0 ? 'FREE' : `${item.price.toLocaleString()} Coins`}</span>
                        </div>

                        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-center text-lg font-black">
                          <span className={colorStyle.className} style={colorStyle.style}>
                            {user?.displayName || 'Your Username'}
                          </span>
                        </div>

                        <div className="flex justify-end pt-2">
                          {isOwned ? (
                            <button
                              onClick={() => handleEquip('color', isEquipped ? 'default' : item.id)}
                              className={`rounded-xl px-5 py-2 text-xs font-black ${isEquipped ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-white'}`}
                            >
                              {isEquipped ? 'Equipped ✓' : 'Equip Color'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBuy('color', item)}
                              disabled={profileData.coins < item.price}
                              className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-black text-black hover:bg-amber-400 transition-all disabled:opacity-40"
                            >
                              Buy Color
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* THEMES TAB */}
            {activeTab === 'themes' && (
              <div className="space-y-8">
                {/* Custom Theme Studio Builder */}
                <div className="rounded-3xl border border-indigo-500/40 bg-zinc-900/60 p-6 sm:p-8 space-y-6 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-indigo-400 text-xs font-black uppercase tracking-wider mb-1">
                        <Sparkles size={16} />
                        <span>Theme Builder Studio</span>
                      </div>
                      <h3 className="text-2xl font-black text-white flex items-center gap-2">
                        <ImageIcon size={22} className="text-indigo-400" />
                        Custom Background Theme Studio
                      </h3>
                      <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                        Design your personalized gradient background canvas with custom accent glow lighting.
                      </p>
                    </div>

                    {profileData.customThemeConfig && (
                      <button
                        onClick={() => handleEquip('theme', profileData.equippedTheme === 'custom' ? 'default' : 'custom')}
                        className={`rounded-2xl px-5 py-2.5 text-xs font-black transition-all shadow-md shrink-0 ${
                          profileData.equippedTheme === 'custom'
                            ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                            : 'bg-indigo-600 text-white hover:bg-indigo-500'
                        }`}
                      >
                        {profileData.equippedTheme === 'custom' ? 'Custom Theme Equipped ✓' : 'Equip Your Saved Custom Theme'}
                      </button>
                    )}
                  </div>

                  {/* Preset Quick Palettes */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2.5">
                      Preset Starter Color Palettes
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {STARTER_PALETTES.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setStartColor(preset.start);
                            setMidColor(preset.mid);
                            setEndColor(preset.end);
                            setAccentColor(preset.accent);
                            setGradientType(preset.type);
                            setCustomThemeName(preset.name);
                          }}
                          className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-indigo-500/60 transition-all text-left group"
                        >
                          <span className="text-xs font-bold text-zinc-300 group-hover:text-white truncate">{preset.name}</span>
                          <div
                            className="h-5 w-5 rounded-full shrink-0 border border-white/20 shadow-xs"
                            style={{ background: `linear-gradient(135deg, ${preset.start}, ${preset.accent})` }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Theme Details Form */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4 md:col-span-2">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                          Theme Name
                        </label>
                        <input
                          type="text"
                          maxLength={30}
                          value={customThemeName}
                          onChange={(e) => setCustomThemeName(e.target.value)}
                          placeholder="e.g. Dark Neon Purple"
                          className="w-full rounded-2xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                            Start Color
                          </label>
                          <input
                            type="color"
                            value={startColor}
                            onChange={(e) => setStartColor(e.target.value)}
                            className="h-10 w-full rounded-xl bg-zinc-950 p-1 cursor-pointer border border-zinc-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                            Mid Color
                          </label>
                          <input
                            type="color"
                            value={midColor}
                            onChange={(e) => setMidColor(e.target.value)}
                            className="h-10 w-full rounded-xl bg-zinc-950 p-1 cursor-pointer border border-zinc-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                            End Color
                          </label>
                          <input
                            type="color"
                            value={endColor}
                            onChange={(e) => setEndColor(e.target.value)}
                            className="h-10 w-full rounded-xl bg-zinc-950 p-1 cursor-pointer border border-zinc-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                            Accent Glow
                          </label>
                          <input
                            type="color"
                            value={accentColor}
                            onChange={(e) => setAccentColor(e.target.value)}
                            className="h-10 w-full rounded-xl bg-zinc-950 p-1 cursor-pointer border border-zinc-800"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                          Gradient Pattern Type
                        </label>
                        <select
                          value={gradientType}
                          onChange={(e) => setGradientType(e.target.value)}
                          className="w-full rounded-2xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
                        >
                          <option value="radial_center">Radial Center Glow (Balanced Atmosphere)</option>
                          <option value="radial_corner">Radial Corner Light (Top-Right Spotlight)</option>
                          <option value="linear_down">Vertical Linear Fade (Top-to-Bottom)</option>
                          <option value="linear_diagonal">Diagonal Linear Gradient (135° Flow)</option>
                        </select>
                      </div>
                    </div>

                    {/* Live Preview Box */}
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                        Live Background Swatch Preview
                      </label>
                      <div
                        className="h-44 w-full rounded-3xl p-5 border border-white/10 shadow-2xl flex flex-col justify-between overflow-hidden relative"
                        style={{ backgroundImage: computedBgGradient }}
                      >
                        <div className="flex items-center justify-between z-10">
                          <span className="text-xs font-black text-white drop-shadow-md">{customThemeName || 'Custom Theme'}</span>
                          <span
                            className="h-3.5 w-3.5 rounded-full shadow-lg"
                            style={{ backgroundColor: accentColor }}
                          />
                        </div>

                        <div className="p-3 rounded-2xl bg-zinc-950/70 backdrop-blur-md border border-white/10 text-[11px] text-zinc-200 z-10 flex items-center justify-between">
                          <span>BloxVote Leaderboard Card</span>
                          <span
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white shadow-xs"
                            style={{ backgroundColor: accentColor }}
                          >
                            Accent Button
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-zinc-800/80">
                    <button
                      type="button"
                      onClick={handleSaveThemeBuilder}
                      disabled={isSavingCustomTheme}
                      className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-7 py-3 text-xs font-black text-white shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Sparkles size={16} />
                      <span>{isSavingCustomTheme ? 'Saving Theme...' : 'Save & Equip Custom Background Theme'}</span>
                    </button>
                  </div>
                </div>

                {/* Preset Themes Grid */}
                <div>
                  <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                    <ImageIcon className="text-indigo-400" size={22} />
                    Background Theme Catalog ({BACKGROUND_THEMES.length})
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {BACKGROUND_THEMES.map(theme => {
                      const isOwned = purchasedThemes.includes(theme.id) || theme.price === 0;
                      const isEquipped = profileData.equippedTheme === theme.id;
                      const themeStyle = getBackgroundThemeStyle(theme.id);

                      return (
                        <div key={theme.id} className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-base font-black text-white">{theme.name}</h4>
                            <span className="text-xs font-extrabold text-amber-300">{theme.price === 0 ? 'FREE' : `${theme.price.toLocaleString()} Coins`}</span>
                          </div>

                          <div className={`h-24 rounded-2xl p-4 flex items-center justify-center text-xs font-black ${themeStyle.backgroundClass}`} style={themeStyle.style}>
                            <span>{theme.name} Swatch Preview</span>
                          </div>

                          <div className="flex justify-end pt-2">
                            {isOwned ? (
                              <button
                                onClick={() => handleEquip('theme', isEquipped ? 'default' : theme.id)}
                                className={`rounded-xl px-5 py-2 text-xs font-black ${isEquipped ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-white'}`}
                              >
                                {isEquipped ? 'Equipped ✓' : 'Equip Theme'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBuy('theme', theme)}
                                disabled={profileData.coins < theme.price}
                                className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-black text-black hover:bg-amber-400 transition-all disabled:opacity-40"
                              >
                                Buy Theme
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* MERCH TAB */}
            {activeTab === 'merch' && (
              <div className="space-y-8">
                <div className="rounded-3xl border-2 border-amber-400/60 bg-gradient-to-r from-amber-950/40 via-rose-950/30 to-purple-950/40 p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                    <div className="space-y-2 text-center md:text-left">
                      <div className="inline-flex items-center gap-2 bg-rose-500/20 text-rose-300 border border-rose-500/40 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                        <Sparkles size={14} className="animate-spin text-amber-400" />
                        <span>PROMO CODE: <strong>BLOXVOTE</strong> (30% OFF orders over $25.00)</span>
                      </div>
                      <h3 className="text-3xl font-black text-white tracking-tight">
                        BloxVote Gear & Apparel
                      </h3>
                      <p className="text-xs sm:text-sm text-zinc-300 max-w-xl leading-relaxed">
                        Represent the #1 Roblox Voting Community in real life! Premium heavyweight hoodies, embroidered caps, vinyl sticker packs, and limited edition drops. Use coupon code <strong className="text-amber-300 font-mono">BLOXVOTE</strong> for 30% off!
                      </p>
                    </div>

                    <CoolMerchButton
                      variant="floating"
                      label="Visit Merch Store"
                      sublabel="Official Apparel & Collectibles"
                      className="shrink-0"
                    />
                  </div>
                </div>

                {/* Merch Items Grid Showcase */}
                <div>
                  <h4 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                    <Shirt className="text-amber-400" size={22} />
                    Featured Merchandise Drop Collection
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      {
                        title: 'BloxVote Pro Heavyweight Hoodie',
                        tag: 'BESTSELLER 🔥',
                        price: '$49.99',
                        desc: 'Ultra-soft fleece hoodie featuring custom 3D embroidered BloxVote logo.',
                        color: 'from-amber-500/20 to-orange-500/10 border-amber-500/40',
                        emoji: '🧥',
                      },
                      {
                        title: 'Limited Edition Voter T-Shirt',
                        tag: 'NEW DROP ✨',
                        price: '$24.99',
                        desc: '100% ring-spun cotton tee with reflective metallic print.',
                        color: 'from-purple-500/20 to-pink-500/10 border-purple-500/40',
                        emoji: '👕',
                      },
                      {
                        title: 'Roblox Founder Snapback Cap',
                        tag: 'EXCLUSIVE 👑',
                        price: '$29.99',
                        desc: 'Structured 6-panel cap with high-density embroidered crown emblem.',
                        color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/40',
                        emoji: '🧢',
                      },
                      {
                        title: 'Holographic Sticker Pack (10x)',
                        tag: 'FAN FAVORITE 🌟',
                        price: '$9.99',
                        desc: 'Waterproof vinyl holographic stickers for your laptop, gaming desk, & water bottle.',
                        color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/40',
                        emoji: '🏷️',
                      },
                      {
                        title: 'BloxCoins Metal Keychain & Pin',
                        tag: 'COLLECTIBLE 💎',
                        price: '$14.99',
                        desc: 'Solid die-cast metal coin keychain with polished gold electroplating.',
                        color: 'from-yellow-500/20 to-amber-500/10 border-yellow-500/40',
                        emoji: '🪙',
                      },
                      {
                        title: 'Valkyrie Boss Desk Mat',
                        tag: 'DESK DROP 🎮',
                        price: '$34.99',
                        desc: 'Extra-large 900x400mm gaming mousepad with stitched edges & vibrant RGB art.',
                        color: 'from-rose-500/20 to-indigo-500/10 border-rose-500/40',
                        emoji: '🕹️',
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className={`rounded-3xl border bg-gradient-to-b ${item.color} bg-zinc-950 p-6 flex flex-col justify-between gap-4 shadow-xl hover:scale-[1.02] transition-all group`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-400 text-zinc-950 shadow-sm">
                              {item.tag}
                            </span>
                            <span className="text-xl font-black text-amber-300">{item.price}</span>
                          </div>

                          <div className="flex items-center gap-3 py-2">
                            <div className="text-4xl p-3 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-inner group-hover:scale-110 transition-transform">
                              {item.emoji}
                            </div>
                            <div>
                              <h5 className="font-black text-white text-base leading-tight">{item.title}</h5>
                              <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{item.desc}</p>
                            </div>
                          </div>
                        </div>

                        <CoolMerchButton
                          variant="compact"
                          label={`Buy ${item.title}`}
                          className="w-full justify-center py-2.5"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* EARN TAB */}
            {activeTab === 'earn' && (
              <div className="space-y-6">
                <div className="rounded-3xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-yellow-950/20 to-zinc-950 p-8 space-y-4">
                  <div className="flex items-center gap-3">
                    <Coins size={28} className="text-amber-400 fill-amber-400" />
                    <div>
                      <h3 className="text-2xl font-black text-white">How to Earn Free BloxCoins</h3>
                      <p className="text-xs sm:text-sm text-zinc-400">Earn coins automatically through daily activities!</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                    <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                      <div className="text-amber-400 font-black text-sm">🗳️ Vote on Games</div>
                      <p className="text-xs text-zinc-400">Earn +10 BloxCoins every time you cast a vote for your favorite Roblox experience.</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                      <div className="text-amber-400 font-black text-sm">🎁 Daily Login Reward</div>
                      <p className="text-xs text-zinc-400">Claim +25 BloxCoins every 24 hours just by opening the Cosmetic Shop!</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                      <div className="text-amber-400 font-black text-sm">🔥 Voting Streaks</div>
                      <p className="text-xs text-zinc-400">Keep your voting streak active to earn streak multipliers and exclusive badge titles.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
