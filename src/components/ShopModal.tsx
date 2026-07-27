import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Coins, Check, Sparkles, Palette, Image as ImageIcon, Type, Gift, Award, Search, Send, Clock, CheckCircle, XCircle, Sliders, Shield } from 'lucide-react';
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
import { UserProfileData, CustomTitleRequest, AdminCustomTitle, AdminCustomFont, CustomThemeConfig } from '../types';

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

const QUICK_SWATCHES = [
  '#1e1b4b', '#042f2e', '#450a0a', '#022c22', '#451a03', '#701a75', '#311042', '#1d2238',
  '#0f172a', '#18181b', '#090d16', '#18080a', '#051a14', '#1c0d02', '#3b0764', '#110726',
  '#09090b', '#020617', '#000000', '#030712', '#090501', '#6366f1', '#06b6d4', '#ef4444',
  '#10b981', '#f59e0b', '#ec4899', '#a855f7', '#5865f2', '#38bdf8', '#f43f5e', '#a3e635'
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
  customAdminTitles = [],
  customAdminFonts = [],
  previewThemeId,
  onPreviewTheme,
  previewFontId,
  onPreviewFont,
}: ShopModalProps) {
  const [activeTab, setActiveTab] = useState<'titles' | 'colors' | 'themes' | 'fonts' | 'earn'>('titles');
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [isClaimingBonus, setIsClaimingBonus] = useState(false);

  // Custom title request state
  const [customTitleInput, setCustomTitleInput] = useState('');
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);

  // Custom theme builder state
  const [customThemeName, setCustomThemeName] = useState('My Custom Theme');
  const [gradientType, setGradientType] = useState<string>('radial_center');
  const [startColor, setStartColor] = useState('#1e1b4b');
  const [midColor, setMidColor] = useState('#0f172a');
  const [endColor, setEndColor] = useState('#09090b');
  const [accentColor, setAccentColor] = useState('#6366f1');
  const [glowIntensity, setGlowIntensity] = useState<'soft' | 'medium' | 'high'>('medium');
  const [isSavingCustomTheme, setIsSavingCustomTheme] = useState(false);

  // Compute live gradient string
  const computedBgGradient = useMemo(() => {
    if (gradientType === 'linear_down') {
      return `linear-gradient(180deg, ${startColor} 0%, ${midColor} 50%, ${endColor} 100%)`;
    }
    if (gradientType === 'linear_diagonal') {
      return `linear-gradient(135deg, ${startColor} 0%, ${midColor} 50%, ${endColor} 100%)`;
    }
    if (gradientType === 'radial_corner') {
      return `radial-gradient(circle at 80% 20%, ${startColor} 0%, ${midColor} 50%, ${endColor} 100%)`;
    }
    return `radial-gradient(circle at 50% 20%, ${startColor} 0%, ${midColor} 50%, ${endColor} 100%)`;
  }, [gradientType, startColor, midColor, endColor]);

  // Compute live card border and glow style
  const computedCardStyle = useMemo(() => {
    const blur = glowIntensity === 'high' ? '35px' : glowIntensity === 'medium' ? '20px' : '10px';
    const opacityHex = glowIntensity === 'high' ? '90' : glowIntensity === 'medium' ? '60' : '40';
    return {
      borderColor: accentColor,
      boxShadow: `0 0 ${blur} ${accentColor}${opacityHex}`
    };
  }, [accentColor, glowIntensity]);

  // Live clock for custom title 10-minute cooldown
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
    if (user?.uid) {
      try {
        const local = localStorage.getItem(`lastCustomTitleRequestTime_${user.uid}`);
        if (local) {
          t = Math.max(t, parseInt(local, 10) || 0);
        }
      } catch (e) {}
    }
    return t;
  }, [profileData.lastCustomTitleRequestTime, customTitleRequest, user]);

  const COOLDOWN_DURATION = 10 * 60 * 1000; // 10 minutes
  const cooldownElapsed = nowClock - lastTitleReqMs;
  const cooldownRemainingMs = Math.max(0, COOLDOWN_DURATION - cooldownElapsed);
  const cooldownRemainingSec = Math.ceil(cooldownRemainingMs / 1000);
  const isCooldownActive = lastTitleReqMs > 0 && cooldownRemainingSec > 0;

  const formatCountdown = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Title search & category filter
  const [titleSearch, setTitleSearch] = useState('');
  const [titleCategory, setTitleCategory] = useState<string>('All');

  // Combine default titles + Admin custom titles + User custom titles
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
      .map(pt => {
        const formattedTitle = pt.startsWith('[') ? pt : `[${pt}]`;
        return {
          id: pt,
          title: formattedTitle,
          name: pt,
          price: 1000,
          badge: 'Your Custom 👑',
          category: 'Vip',
          description: 'Your saved custom title in your inventory.',
          tagClass: 'bg-amber-400/20 text-amber-200 border border-amber-400/50 font-black shadow-xs',
        };
      });

    return [...TITLE_ITEMS, ...adminMapped, ...userCustomMapped];
  }, [customAdminTitles, profileData.purchasedTitles]);

  // Combine default fonts + Admin custom fonts
  const allFontsCatalog = useMemo(() => {
    const adminMapped: FontItem[] = (customAdminFonts || []).map(af => ({
      id: af.id,
      name: af.name,
      fontFamily: af.fontFamily,
      price: af.price,
      sampleText: af.sampleText || 'ROBLOX VOTER 2026',
      category: af.category || 'Custom',
      description: af.description,
      badge: 'Admin Custom 🔤'
    }));
    return [...FONT_ITEMS, ...adminMapped];
  }, [customAdminFonts]);

  // Filtered titles
  const filteredTitles = allTitlesCatalog.filter((item) => {
    const matchesCategory = titleCategory === 'All' || item.category === titleCategory;
    const matchesSearch = item.name.toLowerCase().includes(titleSearch.toLowerCase()) || 
                          item.title.toLowerCase().includes(titleSearch.toLowerCase()) ||
                          item.description.toLowerCase().includes(titleSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const canClaimDaily = user && profileData.lastDailyBonusDate !== todayStr;

  const equippedColorStyle = getNameColorStyle(profileData.equippedColor);
  const equippedThemeStyle = getBackgroundThemeStyle(profileData.equippedTheme, profileData.customThemeConfig);
  const equippedFontStyle = getFontItemStyle(profileData.equippedFont, customAdminFonts as any);
  const equippedTitleStyle = getTitleItemStyle(profileData.equippedTitle, customAdminTitles as any);

  const purchasedTitles = profileData.purchasedTitles || ['default'];
  const equippedTitle = profileData.equippedTitle || 'default';

  const handleBuy = async (type: 'color' | 'theme' | 'font' | 'title', item: NameColorItem | BackgroundThemeItem | FontItem | TitleItem) => {
    setLoadingItemId(item.id);
    try {
      await onBuyItem(type, item);
    } finally {
      setLoadingItemId(null);
    }
  };

  const handleEquip = async (type: 'color' | 'theme' | 'font' | 'title', itemId: string) => {
    setLoadingItemId(itemId);
    try {
      await onEquipItem(type, itemId);
    } finally {
      setLoadingItemId(null);
    }
  };

  const handleClaimBonus = async () => {
    setIsClaimingBonus(true);
    try {
      await onClaimDailyBonus();
    } finally {
      setIsClaimingBonus(false);
    }
  };

  const handleCustomTitleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitleInput.trim() || profileData.coins < 1000) return;
    setIsSubmittingCustom(true);
    try {
      const success = await onRequestCustomTitle(customTitleInput.trim());
      if (success) {
        setCustomTitleInput('');
      }
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 text-white shadow-2xl my-auto"
        >
          {/* Top Banner Header */}
          <div className="relative bg-gradient-to-r from-amber-600/30 via-purple-600/20 to-blue-600/30 p-5 sm:p-6 border-b border-zinc-800">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-8">
              <div>
                <div className="flex items-center gap-2 text-amber-400 text-xs font-extrabold uppercase tracking-widest mb-1">
                  <Sparkles size={14} className="animate-pulse" />
                  <span>BloxCoins Marketplace</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                  Cosmetic Shop
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                  Earn coins by voting on games! Customize your name color & app theme.
                </p>
              </div>

              {/* Coin Counter Pill */}
              <div className="flex items-center gap-3 bg-zinc-900/90 border border-amber-500/40 rounded-2xl p-3 shadow-lg shrink-0">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-black shadow-md">
                  <Coins size={22} className="stroke-[2.5]" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-amber-400/90 uppercase tracking-wider">Your Balance</div>
                  <div className="text-xl font-black text-white flex items-center gap-1">
                    {profileData.coins.toLocaleString()} <span className="text-xs font-bold text-amber-400">Coins</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Bonus Bar */}
            {canClaimDaily && user && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 rounded-xl p-3"
              >
                <div className="flex items-center gap-2.5">
                  <Gift className="text-amber-400 animate-bounce" size={20} />
                  <div>
                    <span className="font-bold text-sm text-amber-200">Daily Login Reward Available!</span>
                    <p className="text-xs text-amber-300/70">Claim +25 BloxCoins today for stopping by!</p>
                  </div>
                </div>
                <button
                  onClick={handleClaimBonus}
                  disabled={isClaimingBonus}
                  className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-2 text-xs font-bold text-black shadow-md hover:from-amber-400 hover:to-yellow-400 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isClaimingBonus ? 'Claiming...' : 'Claim +25 Coins 🎁'}
                </button>
              </motion.div>
            )}
          </div>

          {/* Current Equipped Preview Bar */}
          <div className="bg-zinc-900/60 border-b border-zinc-800 p-4 px-6 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-zinc-400 font-medium">
              <span>Equipped Look:</span>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800">
                {equippedTitleStyle.title && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${equippedTitleStyle.tagClass}`}>
                    {equippedTitleStyle.title}
                  </span>
                )}
                <span className={equippedColorStyle.className}>
                  {user?.displayName || 'Your Username'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-zinc-400 font-medium">
              <span>Title:</span>
              <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-amber-300 font-bold">
                {equippedTitleStyle.title ? equippedTitleStyle.title : 'None'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400 font-medium">
              <span>Theme:</span>
              <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 font-semibold">
                {equippedThemeStyle.name}
              </span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400 font-medium">
              <span>Font:</span>
              <span 
                style={{ fontFamily: equippedFontStyle.fontFamily }}
                className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-amber-300 font-semibold"
              >
                {equippedFontStyle.name}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-zinc-800 px-6 pt-2 bg-zinc-950/40 gap-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('titles')}
              className={`flex items-center gap-2 py-3 px-4 font-bold text-sm border-b-2 transition-all shrink-0 ${
                activeTab === 'titles'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Award size={16} />
              Titles ({TITLE_ITEMS.length - 1})
            </button>
            <button
              onClick={() => setActiveTab('colors')}
              className={`flex items-center gap-2 py-3 px-4 font-bold text-sm border-b-2 transition-all shrink-0 ${
                activeTab === 'colors'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Palette size={16} />
              Name Colors ({NAME_COLORS.length})
            </button>
            <button
              onClick={() => setActiveTab('themes')}
              className={`flex items-center gap-2 py-3 px-4 font-bold text-sm border-b-2 transition-all shrink-0 ${
                activeTab === 'themes'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ImageIcon size={16} />
              Themes ({BACKGROUND_THEMES.length})
            </button>
            <button
              onClick={() => setActiveTab('fonts')}
              className={`flex items-center gap-2 py-3 px-4 font-bold text-sm border-b-2 transition-all shrink-0 ${
                activeTab === 'fonts'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Type size={16} />
              App Fonts ({FONT_ITEMS.length})
            </button>
            <button
              onClick={() => setActiveTab('earn')}
              className={`flex items-center gap-2 py-3 px-4 font-bold text-sm border-b-2 transition-all shrink-0 ${
                activeTab === 'earn'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Coins size={16} />
              Earn Coins 🪙
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-5 sm:p-6 max-h-[60vh] overflow-y-auto">
            {/* TITLES TAB */}
            {activeTab === 'titles' && (
              <div className="space-y-6">
                {/* Custom Title Request Banner (1,000 Coins) */}
                <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-zinc-950 p-5 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider mb-1">
                        <Sparkles size={16} className="animate-spin text-amber-400" />
                        <span>Exclusive Custom Service</span>
                      </div>
                      <h3 className="text-xl font-black text-white flex items-center gap-2">
                        Create Custom Title
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                        Design your own custom title! For <strong className="text-amber-300">1,000 BloxCoins</strong>, submit your custom prefix. It will be sent to Admins to be accepted or declined.
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 rounded-xl">
                      <Coins className="text-amber-400" size={20} />
                      <span className="font-black text-amber-300 text-base">1,000 Coins</span>
                    </div>
                  </div>

                  {/* Pending / Previous Status Banner */}
                  {customTitleRequest && (
                    <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-medium mb-4 ${
                      customTitleRequest.status === 'pending'
                        ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                        : customTitleRequest.status === 'accepted'
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                        : 'bg-red-950/40 border-red-500/50 text-red-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        {customTitleRequest.status === 'pending' && <Clock size={20} className="text-amber-400 shrink-0 animate-pulse" />}
                        {customTitleRequest.status === 'accepted' && <CheckCircle size={20} className="text-emerald-400 shrink-0" />}
                        {customTitleRequest.status === 'declined' && <XCircle size={20} className="text-red-400 shrink-0" />}
                        <div>
                          <div className="font-bold text-sm">
                            {customTitleRequest.status === 'pending' && 'Custom Title Pending Admin Review'}
                            {customTitleRequest.status === 'accepted' && 'Custom Title Accepted! 🎉'}
                            {customTitleRequest.status === 'declined' && 'Custom Title Request Declined'}
                          </div>
                          <div className="text-xs opacity-90 mt-0.5">
                            Title: <span className="font-extrabold underline">{customTitleRequest.requestedTitle}</span>
                            {customTitleRequest.status === 'declined' && customTitleRequest.rejectionReason && (
                              <span> • Reason: {customTitleRequest.rejectionReason} (1,000 Coins refunded!)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {customTitleRequest.status === 'pending' && (
                        <div className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 text-[11px] shrink-0 self-start sm:self-auto">
                          Awaiting Admin
                        </div>
                      )}
                    </div>
                  )}

                  {/* 10-Minute Cooldown Countdown Banner */}
                  {isCooldownActive && (
                    <div className="p-4 rounded-xl bg-amber-950/50 border border-amber-500/50 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg mb-4 animate-fade-in">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                          <Clock size={22} className="animate-spin text-amber-400" />
                        </div>
                        <div>
                          <div className="font-bold text-amber-200 text-sm flex items-center gap-2">
                            <span>Creation Cooldown Active</span>
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 font-extrabold px-2 py-0.5 rounded-full border border-amber-500/40">10 Min Cooldown</span>
                          </div>
                          <p className="text-xs text-amber-300/80 mt-0.5">
                            You can create another custom title as soon as the timer reaches 00:00!
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-black/70 px-4 py-2 rounded-xl border border-amber-500/40 shrink-0">
                        <span className="text-xs text-zinc-400 font-medium">Ready in:</span>
                        <span className="font-mono text-lg font-black text-amber-300 tracking-wider">
                          {formatCountdown(cooldownRemainingSec)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Custom Title Request Form */}
                  <form onSubmit={handleCustomTitleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                          Requested Title (Max 30 chars)
                        </label>
                        <input
                          type="text"
                          maxLength={30}
                          disabled={isCooldownActive}
                          value={customTitleInput}
                          onChange={(e) => setCustomTitleInput(e.target.value)}
                          placeholder={isCooldownActive ? `Cooldown active (${formatCountdown(cooldownRemainingSec)} remaining)` : "e.g. Roblox Legend or [Tuff Boss]"}
                          className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition-all ${
                            isCooldownActive
                              ? 'bg-zinc-950/60 border-zinc-800 cursor-not-allowed opacity-60'
                              : 'bg-zinc-900 border-zinc-700 focus:border-amber-500'
                          }`}
                        />
                      </div>

                      {/* Live Preview */}
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                          Live Preview
                        </label>
                        <div className="flex h-[42px] items-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-800 px-3 text-xs">
                          {customTitleInput.trim() ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-gradient-to-r from-amber-500/30 to-yellow-500/30 text-amber-300 border border-amber-400/60 font-black shadow-sm">
                              {customTitleInput.trim().startsWith('[') ? customTitleInput.trim() : `[${customTitleInput.trim()}]`}
                            </span>
                          ) : (
                            <span className="text-zinc-600 italic text-[11px]">Type a title above...</span>
                          )}
                          <span className={equippedColorStyle.className}>
                            {user?.displayName || 'YourName'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                      <div className="text-[11px] text-zinc-400">
                        {isCooldownActive ? (
                          <span className="text-amber-400 font-bold flex items-center gap-1.5">
                            <Clock size={12} className="animate-spin" />
                            Cooldown active! You can create a custom title again in {formatCountdown(cooldownRemainingSec)}.
                          </span>
                        ) : profileData.coins < 1000 ? (
                          <span className="text-red-400 font-semibold">You need 1,000 BloxCoins to request a custom title.</span>
                        ) : (
                          <span className="text-emerald-400 font-semibold">You can create a custom title now for 1,000 coins! Instant submission to admins.</span>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={isCooldownActive || !customTitleInput.trim() || profileData.coins < 1000 || !user || isSubmittingCustom}
                        className={`w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-extrabold transition-all active:scale-95 ${
                          !isCooldownActive && customTitleInput.trim() && profileData.coins >= 1000 && user && !isSubmittingCustom
                            ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-lg shadow-amber-950/40'
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        {isCooldownActive ? <Clock size={14} className="animate-spin" /> : <Send size={14} />}
                        <span>
                          {isSubmittingCustom
                            ? 'Submitting...'
                            : isCooldownActive
                            ? `Cooldown (${formatCountdown(cooldownRemainingSec)})`
                            : 'Submit Request (1,000 Coins)'}
                        </span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Pre-made & Custom Admin Titles Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div>
                    <h4 className="text-lg font-black text-white flex items-center gap-2">
                      <Award className="text-amber-400" size={18} />
                      Title Catalog ({filteredTitles.length})
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Choose from standard & admin custom titles. Equip any owned title anytime.
                    </p>
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full sm:w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={titleSearch}
                      onChange={(e) => setTitleSearch(e.target.value)}
                      placeholder="Search titles..."
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-800 pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Unequip / Currently Equipped Title Banner */}
                {equippedTitle !== 'default' && (
                  <div className="flex items-center justify-between rounded-xl bg-zinc-900/80 border border-zinc-800 p-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400">Currently Equipped Title:</span>
                      <span className="font-extrabold text-amber-300">
                        {equippedTitleStyle.title || equippedTitleStyle.name}
                      </span>
                      <span className="text-[10px] text-zinc-500 italic hidden sm:inline">(Saved in your inventory)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEquip('title', 'default')}
                      disabled={loadingItemId === 'default'}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold transition-all text-xs border border-zinc-700"
                    >
                      Unequip Title
                    </button>
                  </div>
                )}

                {/* Category Pill Filters */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {['All', 'Roblox', 'Gaming', 'Flex', 'Funny', 'Roleplay', 'Status', 'Popular', 'Vip'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setTitleCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                        titleCategory === cat
                          ? 'bg-amber-500 text-black shadow-md'
                          : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Titles Catalog Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                  {filteredTitles.map((item) => {
                    const isOwned = purchasedTitles.includes(item.id) || purchasedTitles.includes(item.title) || purchasedTitles.includes(item.name) || item.price === 0;
                    const isEquipped = equippedTitle === item.id || equippedTitle === item.title || equippedTitle === item.name;
                    const canAfford = profileData.coins >= item.price;

                    return (
                      <div
                        key={item.id}
                        className={`relative overflow-hidden rounded-2xl border p-4 transition-all ${
                          isEquipped
                            ? 'border-emerald-500/80 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                            : isOwned
                            ? 'border-zinc-700 bg-zinc-900/60 hover:border-zinc-600'
                            : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'
                        }`}
                      >
                        {item.badge && (
                          <div className="absolute top-3 right-3 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-black text-amber-300 border border-amber-500/30">
                            {item.badge}
                          </div>
                        )}

                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 border border-zinc-800 text-amber-400">
                            <Award size={20} />
                          </div>
                          <div className="flex-1 pr-12">
                            <h4 className="text-sm font-black text-white">{item.name}</h4>
                            <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{item.description}</p>
                            
                            {/* Title Tag Preview */}
                            <div className="mt-3 flex items-center gap-2">
                              {item.id === 'default' ? (
                                <span className="text-[11px] text-zinc-500 italic">No Title Badge</span>
                              ) : (
                                <span className={`px-2 py-0.5 rounded text-xs ${item.tagClass}`}>
                                  {item.title}
                                </span>
                              )}
                              <span className={equippedColorStyle.className + ' text-xs'}>
                                {user?.displayName || 'YourName'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Bar */}
                        <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-3">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                            {item.price === 0 ? (
                              <span className="text-emerald-400">Free</span>
                            ) : (
                              <>
                                <Coins size={14} />
                                <span>{item.price} Coins</span>
                              </>
                            )}
                          </div>

                          {isEquipped ? (
                            <span className="flex items-center gap-1 rounded-xl bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-400 border border-emerald-500/40">
                              <Check size={14} /> Equipped
                            </span>
                          ) : isOwned ? (
                            <button
                              onClick={() => handleEquip('title', item.id)}
                              disabled={loadingItemId === item.id}
                              className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-1.5 text-xs font-bold text-white shadow-md transition-all active:scale-95"
                            >
                              {loadingItemId === item.id ? 'Equipping...' : 'Equip Title'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBuy('title', item)}
                              disabled={!canAfford || !user || loadingItemId === item.id}
                              className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                                canAfford && user
                                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-md'
                                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                              }`}
                            >
                              {loadingItemId === item.id ? 'Buying...' : !user ? 'Sign in' : canAfford ? 'Buy Title' : 'Need Coins'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* NAME COLORS TAB */}
            {activeTab === 'colors' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                {NAME_COLORS.map((item) => {
                  const isOwned = profileData.purchasedColors.includes(item.id);
                  const isEquipped = profileData.equippedColor === item.id;
                  const canAfford = profileData.coins >= item.price;

                  return (
                    <div
                      key={item.id}
                      className={`relative overflow-hidden rounded-2xl border p-4 transition-all ${
                        isEquipped
                          ? 'border-emerald-500/80 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                          : isOwned
                          ? 'border-zinc-700 bg-zinc-900/60 hover:border-zinc-600'
                          : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'
                      }`}
                    >
                      {item.badge && (
                        <div className="absolute top-3 right-3 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-400 border border-amber-500/30">
                          {item.badge}
                        </div>
                      )}

                      {/* Preview Box */}
                      <div className="mb-3 rounded-xl bg-zinc-950 p-3 border border-zinc-800 flex items-center justify-between">
                        <span className="text-xs text-zinc-500 font-mono">Chat Preview:</span>
                        <span className={`text-sm sm:text-base ${item.className}`}>
                          {user?.displayName || 'Player1'}
                        </span>
                      </div>

                      <div className="mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-base">{item.name}</h3>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {/* Price / Action Button */}
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 mt-auto">
                        <div className="flex items-center gap-1.5">
                          {item.price === 0 ? (
                            <span className="text-xs font-bold text-emerald-400">FREE</span>
                          ) : (
                            <>
                              <Coins size={15} className="text-amber-400" />
                              <span className="text-sm font-black text-amber-300">
                                {item.price} <span className="text-xs font-normal text-zinc-400">Coins</span>
                              </span>
                            </>
                          )}
                        </div>

                        {isEquipped ? (
                          <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                            <Check size={14} />
                            Equipped
                          </div>
                        ) : isOwned ? (
                          <button
                            onClick={() => handleEquip('color', item.id)}
                            disabled={loadingItemId === item.id}
                            className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-1.5 text-xs font-bold text-white transition-all active:scale-95"
                          >
                            {loadingItemId === item.id ? 'Equipping...' : 'Equip'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBuy('color', item)}
                            disabled={!canAfford || !user || loadingItemId === item.id}
                            className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                              canAfford && user
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-md'
                                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            }`}
                          >
                            {loadingItemId === item.id ? 'Buying...' : !user ? 'Sign in' : canAfford ? 'Buy' : 'Need Coins'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* BACKGROUND THEMES TAB */}
            {activeTab === 'themes' && (
              <div className="space-y-6">
                {/* Custom Ultra-Theme Builder Card */}
                <div className="relative overflow-hidden rounded-3xl border border-indigo-500/50 bg-gradient-to-r from-indigo-950/80 via-purple-950/60 to-zinc-950 p-5 sm:p-6 shadow-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-500/20 pb-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 text-indigo-400 text-xs font-black uppercase tracking-wider mb-1">
                        <Sliders size={16} className="text-indigo-400 animate-spin" />
                        <span>Ultra Custom Theme Creator Studio</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-white">
                        Custom Gradient & Glow Studio
                      </h3>
                      <p className="text-xs text-zinc-300 mt-1 max-w-xl">
                        Design your custom gradient background & glowing card aura! Pick custom colors, angles, and glow intensity. Costs <strong className="text-amber-300">1,000 BloxCoins</strong> to unlock forever (free edits once unlocked).
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 px-4 py-2 rounded-2xl">
                      <Coins className="text-amber-400" size={22} />
                      <span className="font-black text-amber-300 text-lg">1,000 Coins</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Controls Column */}
                    <div className="space-y-4">
                      {/* Theme Name Input */}
                      <div>
                        <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                          Custom Theme Name:
                        </label>
                        <input
                          type="text"
                          value={customThemeName}
                          onChange={(e) => setCustomThemeName(e.target.value)}
                          maxLength={30}
                          placeholder="e.g. Hyperdrive Cyberpunk"
                          className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none font-bold"
                        />
                      </div>

                      {/* Starter Palettes Seed Selector */}
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                          Quick Palette Starters:
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {STARTER_PALETTES.map((pal) => (
                            <button
                              key={pal.id}
                              type="button"
                              onClick={() => {
                                setStartColor(pal.start);
                                setMidColor(pal.mid);
                                setEndColor(pal.end);
                                setAccentColor(pal.accent);
                                setGradientType(pal.type);
                                setCustomThemeName(pal.name.replace(/[^\w\s]/gi, '').trim());
                              }}
                              className="px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-[11px] font-bold text-zinc-200 transition-all flex items-center gap-1.5"
                            >
                              <span className="h-2.5 w-2.5 rounded-full border border-white/20" style={{ backgroundColor: pal.accent }} />
                              <span>{pal.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Gradient Angle / Style */}
                      <div>
                        <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                          Gradient Angle & Direction:
                        </label>
                        <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                          {[
                            { id: 'radial_center', label: 'Radial Spot' },
                            { id: 'linear_down', label: 'Linear Top-Down' },
                            { id: 'linear_diagonal', label: 'Diagonal Flow' },
                            { id: 'radial_corner', label: 'Top-Right Corner' }
                          ].map((mode) => (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => setGradientType(mode.id)}
                              className={`py-2 px-3 rounded-xl border text-center transition-all ${
                                gradientType === mode.id
                                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                              }`}
                            >
                              {mode.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Precise Color Pickers */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        {/* Start Color */}
                        <div className="rounded-xl bg-zinc-900/90 p-2.5 border border-zinc-800">
                          <label className="block text-[11px] font-bold text-zinc-400 mb-1">Start Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={startColor}
                              onChange={(e) => setStartColor(e.target.value)}
                              className="h-8 w-8 rounded-lg border border-zinc-700 bg-transparent cursor-pointer shrink-0"
                            />
                            <input
                              type="text"
                              value={startColor}
                              onChange={(e) => setStartColor(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs font-mono text-zinc-200 uppercase"
                            />
                          </div>
                        </div>

                        {/* Mid Color */}
                        <div className="rounded-xl bg-zinc-900/90 p-2.5 border border-zinc-800">
                          <label className="block text-[11px] font-bold text-zinc-400 mb-1">Middle Transition</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={midColor}
                              onChange={(e) => setMidColor(e.target.value)}
                              className="h-8 w-8 rounded-lg border border-zinc-700 bg-transparent cursor-pointer shrink-0"
                            />
                            <input
                              type="text"
                              value={midColor}
                              onChange={(e) => setMidColor(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs font-mono text-zinc-200 uppercase"
                            />
                          </div>
                        </div>

                        {/* End Color */}
                        <div className="rounded-xl bg-zinc-900/90 p-2.5 border border-zinc-800">
                          <label className="block text-[11px] font-bold text-zinc-400 mb-1">End Canvas Dark</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={endColor}
                              onChange={(e) => setEndColor(e.target.value)}
                              className="h-8 w-8 rounded-lg border border-zinc-700 bg-transparent cursor-pointer shrink-0"
                            />
                            <input
                              type="text"
                              value={endColor}
                              onChange={(e) => setEndColor(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs font-mono text-zinc-200 uppercase"
                            />
                          </div>
                        </div>

                        {/* Card Glow / Accent Color */}
                        <div className="rounded-xl bg-zinc-900/90 p-2.5 border border-indigo-500/30">
                          <label className="block text-[11px] font-bold text-indigo-300 mb-1">Card Border & Glow</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={accentColor}
                              onChange={(e) => setAccentColor(e.target.value)}
                              className="h-8 w-8 rounded-lg border border-indigo-500/50 bg-transparent cursor-pointer shrink-0"
                            />
                            <input
                              type="text"
                              value={accentColor}
                              onChange={(e) => setAccentColor(e.target.value)}
                              className="w-full bg-zinc-950 border border-indigo-500/30 rounded-lg px-2 py-1 text-xs font-mono text-indigo-200 uppercase font-bold"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Quick Color Swatches Bar */}
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                          Quick Accent Swatches:
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {QUICK_SWATCHES.slice(20).map((hex) => (
                            <button
                              key={hex}
                              type="button"
                              onClick={() => setAccentColor(hex)}
                              style={{ backgroundColor: hex }}
                              className={`h-5 w-5 rounded-full border border-white/20 transition-all ${
                                accentColor.toLowerCase() === hex.toLowerCase() ? 'scale-125 border-white ring-2 ring-indigo-400' : 'hover:scale-110'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Glow Intensity */}
                      <div>
                        <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                          Card Glow Intensity:
                        </label>
                        <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                          {[
                            { id: 'soft', label: 'Subdued' },
                            { id: 'medium', label: 'Medium Nitro' },
                            { id: 'high', label: 'Ultra Cyber Aura' }
                          ].map((g) => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => setGlowIntensity(g.id as any)}
                              className={`py-1.5 px-2 rounded-xl border text-center transition-all ${
                                glowIntensity === g.id
                                  ? 'bg-amber-500 text-black border-amber-400 shadow-md'
                                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                              }`}
                            >
                              {g.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Live Preview & Apply Button Column */}
                    <div className="flex flex-col justify-between rounded-2xl bg-zinc-950 p-4 border border-zinc-800 space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold text-zinc-400 mb-2">
                          <span>Live Canvas & Card Preview:</span>
                          <span className="text-indigo-400 font-mono text-[11px]">{customThemeName || 'My Custom Theme'}</span>
                        </div>

                        {/* Interactive Dynamic Preview Canvas */}
                        <div
                          style={{ background: computedBgGradient }}
                          className="rounded-2xl p-5 border border-zinc-700/50 flex flex-col justify-between min-h-[220px] shadow-2xl relative overflow-hidden transition-all duration-300"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-white drop-shadow-md">
                              {customThemeName || 'My Custom Theme'}
                            </span>
                            <span 
                              style={{ backgroundColor: `${accentColor}30`, borderColor: `${accentColor}60`, color: '#ffffff' }}
                              className="text-[10px] px-2.5 py-0.5 rounded-full font-black border uppercase tracking-wider"
                            >
                              Live Preview
                            </span>
                          </div>

                          {/* Glowing Card Sample */}
                          <div 
                            style={computedCardStyle}
                            className="p-3.5 rounded-2xl bg-zinc-950/90 border-2 transition-all duration-300 flex flex-col gap-2 mt-4"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div 
                                  style={{ backgroundColor: accentColor }}
                                  className="h-7 w-7 rounded-lg flex items-center justify-center text-black text-xs font-black shadow-md"
                                >
                                  BV
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-white">BloxVote Game Card</div>
                                  <div className="text-[10px] text-zinc-400">Adopt Me! • 1,250 Votes</div>
                                </div>
                              </div>
                              <div 
                                style={{ backgroundColor: `${accentColor}20`, color: accentColor, borderColor: `${accentColor}50` }}
                                className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg border"
                              >
                                #1 Top Rated
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="text-xs text-zinc-400">
                          {profileData.purchasedThemes?.includes('custom_discord') ? (
                            <span className="text-emerald-400 font-bold">Unlocked! Click to update your theme.</span>
                          ) : profileData.coins < 1000 ? (
                            <span className="text-red-400 font-bold">Requires 1,000 BloxCoins.</span>
                          ) : (
                            <span className="text-amber-400 font-bold">Ready to unlock for 1,000 coins!</span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={handleSaveThemeBuilder}
                          disabled={isSavingCustomTheme || (!profileData.purchasedThemes?.includes('custom_discord') && profileData.coins < 1000)}
                          className={`w-full sm:w-auto px-6 py-3 rounded-2xl text-xs font-extrabold transition-all active:scale-95 shadow-xl ${
                            profileData.purchasedThemes?.includes('custom_discord') || profileData.coins >= 1000
                              ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-950/50'
                              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          }`}
                        >
                          {isSavingCustomTheme ? 'Saving Custom Theme...' : profileData.purchasedThemes?.includes('custom_discord') ? 'Save & Equip Custom Theme' : 'Unlock Custom Theme (1,000 Coins)'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Standard Background Themes Catalog Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                  {BACKGROUND_THEMES.map((item) => {
                    const isOwned = profileData.purchasedThemes.includes(item.id);
                    const isEquipped = profileData.equippedTheme === item.id;
                    const isPreviewing = previewThemeId === item.id;
                    const canAfford = profileData.coins >= item.price;

                    return (
                      <div
                        key={item.id}
                        className={`relative overflow-hidden rounded-2xl border p-4 transition-all ${
                          isEquipped
                            ? 'border-emerald-500/80 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                            : isPreviewing
                            ? 'border-amber-500/80 bg-amber-950/20 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                            : isOwned
                            ? 'border-zinc-700 bg-zinc-900/60 hover:border-zinc-600'
                            : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'
                        }`}
                      >
                        {item.badge && (
                          <div className="absolute top-3 right-3 rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-purple-300 border border-purple-500/30">
                            {item.badge}
                          </div>
                        )}

                        {/* Theme Preview Canvas Box */}
                        <div
                          style={item.style}
                          className={`mb-3 rounded-xl p-3 border border-zinc-700/50 flex flex-col justify-between h-24 shadow-inner relative overflow-hidden ${item.backgroundClass}`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-zinc-300 font-mono bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-xs">
                            <span>Theme Preview</span>
                            {isEquipped ? (
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <Check size={10} /> Active
                              </span>
                            ) : isPreviewing ? (
                              <span className="text-amber-400 font-bold animate-pulse">Previewing</span>
                            ) : null}
                          </div>

                          <div className="flex items-center justify-between mt-auto">
                            <span className="text-xs font-black text-white drop-shadow-md">
                              {item.name}
                            </span>
                            {onPreviewTheme && (
                              <button
                                type="button"
                                onClick={() => onPreviewTheme(isPreviewing ? null : item.id)}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                                  isPreviewing
                                    ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                                    : 'bg-black/60 hover:bg-black/80 text-zinc-200 border-zinc-700'
                                }`}
                              >
                                {isPreviewing ? 'Stop Preview' : '👁️ Live Preview'}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="mb-3">
                          <h3 className="font-bold text-white text-base">{item.name}</h3>
                          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                            {item.description}
                          </p>
                        </div>

                        {/* Price / Action Button */}
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 mt-auto">
                          <div className="flex items-center gap-1.5">
                            {item.price === 0 ? (
                              <span className="text-xs font-bold text-emerald-400">FREE</span>
                            ) : (
                              <>
                                <Coins size={15} className="text-amber-400" />
                                <span className="text-sm font-black text-amber-300">
                                  {item.price} <span className="text-xs font-normal text-zinc-400">Coins</span>
                                </span>
                              </>
                            )}
                          </div>

                          {isEquipped ? (
                            <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                              <Check size={14} />
                              Equipped
                            </div>
                          ) : isOwned ? (
                            <button
                              onClick={() => handleEquip('theme', item.id)}
                              disabled={loadingItemId === item.id}
                              className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-1.5 text-xs font-bold text-white transition-all active:scale-95"
                            >
                              {loadingItemId === item.id ? 'Equipping...' : 'Equip Theme'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBuy('theme', item)}
                              disabled={!canAfford || !user || loadingItemId === item.id}
                              className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                                canAfford && user
                                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-md'
                                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                              }`}
                            >
                              {loadingItemId === item.id ? 'Buying...' : !user ? 'Sign in' : canAfford ? 'Buy Theme' : 'Need Coins'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* APP FONTS TAB */}
            {activeTab === 'fonts' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                {allFontsCatalog.map((item) => {
                  const fontList = profileData.purchasedFonts || ['default'];
                  const isOwned = fontList.includes(item.id) || item.price === 0;
                  const isEquipped = (profileData.equippedFont || 'default') === item.id;
                  const isPreviewing = previewFontId === item.id;
                  const canAfford = profileData.coins >= item.price;

                  return (
                    <div
                      key={item.id}
                      className={`relative overflow-hidden rounded-2xl border p-4 transition-all ${
                        isEquipped
                          ? 'border-emerald-500/80 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                          : isPreviewing
                          ? 'border-amber-500/80 bg-amber-950/20 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                          : isOwned
                          ? 'border-zinc-700 bg-zinc-900/60 hover:border-zinc-600'
                          : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'
                      }`}
                    >
                      {item.badge && (
                        <div className="absolute top-3 right-3 rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-cyan-300 border border-cyan-500/30">
                          {item.badge}
                        </div>
                      )}

                      {/* Font Preview Sample Box */}
                      <div className="mb-3 rounded-xl bg-zinc-950 p-3.5 border border-zinc-800 flex flex-col justify-between min-h-[90px] shadow-inner relative overflow-hidden">
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono mb-1">
                          <span>{item.category} • Font Preview</span>
                          {isEquipped ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <Check size={10} /> Active
                            </span>
                          ) : isPreviewing ? (
                            <span className="text-amber-400 font-bold animate-pulse">Previewing</span>
                          ) : null}
                        </div>

                        {/* Text rendered in exact font */}
                        <div 
                          style={{ fontFamily: item.fontFamily }} 
                          className="text-sm sm:text-base font-bold text-white tracking-wide leading-snug my-1 line-clamp-2"
                        >
                          {item.sampleText}
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-900">
                          <span 
                            style={{ fontFamily: item.fontFamily }} 
                            className="text-xs text-amber-300 font-medium"
                          >
                            {item.name}
                          </span>
                          {onPreviewFont && (
                            <button
                              type="button"
                              onClick={() => onPreviewFont(isPreviewing ? null : item.id)}
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                                isPreviewing
                                  ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700'
                              }`}
                            >
                              {isPreviewing ? 'Stop Preview' : '👁️ Live Preview'}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mb-3">
                        <h3 className="font-bold text-white text-base">{item.name}</h3>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {/* Price / Action Button */}
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 pt-3 mt-auto">
                        <div className="flex items-center gap-1.5">
                          {item.price === 0 ? (
                            <span className="text-xs font-bold text-emerald-400">FREE</span>
                          ) : (
                            <>
                              <Coins size={15} className="text-amber-400" />
                              <span className="text-sm font-black text-amber-300">
                                {item.price} <span className="text-xs font-normal text-zinc-400">Coins</span>
                              </span>
                            </>
                          )}
                        </div>

                        {isEquipped ? (
                          <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                            <Check size={14} />
                            Equipped
                          </div>
                        ) : isOwned ? (
                          <button
                            onClick={() => handleEquip('font', item.id)}
                            disabled={loadingItemId === item.id}
                            className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-1.5 text-xs font-bold text-white transition-all active:scale-95"
                          >
                            {loadingItemId === item.id ? 'Equipping...' : 'Equip Font'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBuy('font', item)}
                            disabled={!canAfford || !user || loadingItemId === item.id}
                            className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                              canAfford && user
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-md'
                                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            }`}
                          >
                            {loadingItemId === item.id ? 'Buying...' : !user ? 'Sign in' : canAfford ? 'Buy Font' : 'Need Coins'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* EARN COINS TAB */}
            {activeTab === 'earn' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                    <Coins className="text-amber-400" size={20} />
                    How to Earn BloxCoins
                  </h3>
                  <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                    BloxCoins are the site-wide currency! Use them to unlock custom username colors and dark canvas themes.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl bg-zinc-950 p-4 border border-zinc-800">
                      <div className="text-amber-400 font-extrabold text-lg mb-1">+10 Coins</div>
                      <div className="text-xs font-bold text-white">Cast a Vote on Any Game</div>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        Upvote your favorite Roblox games on the main leaderboard. Note: Unvoting deducts 10 coins.
                      </p>
                    </div>

                    <div className="rounded-xl bg-zinc-950 p-4 border border-zinc-800">
                      <div className="text-amber-400 font-extrabold text-lg mb-1">+25 Coins</div>
                      <div className="text-xs font-bold text-white">Daily Login Bonus</div>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        Check into the shop once per day to claim your daily bonus reward!
                      </p>
                    </div>

                    <div className="rounded-xl bg-zinc-950 p-4 border border-zinc-800">
                      <div className="text-amber-400 font-extrabold text-lg mb-1">+50 Coins</div>
                      <div className="text-xs font-bold text-white">Welcome Bonus</div>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        Every newly registered user gets 50 free BloxCoins to kickstart their collection!
                      </p>
                    </div>

                    <div className="rounded-xl bg-zinc-950 p-4 border border-zinc-800">
                      <div className="text-amber-400 font-extrabold text-lg mb-1">Streak Bonus</div>
                      <div className="text-xs font-bold text-white">Voting Streaks</div>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        Maintain a daily voting streak to multiply your rewards!
                      </p>
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
