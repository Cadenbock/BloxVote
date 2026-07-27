import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Coins, Check, Sparkles, Palette, Image as ImageIcon, Type, Gift, Award, Search, Send, Clock, CheckCircle, XCircle, Sliders, Shield, Upload, FileUp, FileText, Trash2 } from 'lucide-react';
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
  onSaveCustomColor,
  onSaveCustomFont,
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

  // Custom Name Color Studio State
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

  // Sync state if user already owns custom font config
  useEffect(() => {
    if (profileData.customFontConfig) {
      if (profileData.customFontConfig.name) setCustomFontName(profileData.customFontConfig.name);
      if (profileData.customFontConfig.fontFamily) setCustomFontFamily(profileData.customFontConfig.fontFamily);
      if (profileData.customFontConfig.fontUrl) setCustomFontUrl(profileData.customFontConfig.fontUrl);
      if (profileData.customFontConfig.fontDataUrl) setCustomFontDataUrl(profileData.customFontConfig.fontDataUrl);
      if (profileData.customFontConfig.fontFileName) setCustomFontFileName(profileData.customFontConfig.fontFileName);
      if (profileData.customFontConfig.sampleText) setCustomFontSample(profileData.customFontConfig.sampleText);
    }
  }, [profileData.customFontConfig]);

  // Load custom font in head for preview (handles Google fonts & base64 font files)
  useEffect(() => {
    if (customFontFamily) {
      const styleId = `shop-font-preview-style`;
      let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }

      if (customFontDataUrl) {
        styleEl.textContent = `
          @font-face {
            font-family: '${customFontFamily}';
            src: url('${customFontDataUrl}');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }
        `;
      } else {
        styleEl.textContent = '';
        const fontId = `shop-font-preview-${customFontFamily.replace(/\s+/g, '-').toLowerCase()}`;
        if (!document.getElementById(fontId)) {
          const link = document.createElement('link');
          link.id = fontId;
          link.rel = 'stylesheet';
          link.href = customFontUrl || `https://fonts.googleapis.com/css2?family=${encodeURIComponent(customFontFamily)}:ital,wght@0,400;0,700;0,900;1,400;1,700&display=swap`;
          document.head.appendChild(link);
        }
      }
    }
  }, [customFontFamily, customFontUrl, customFontDataUrl]);

  const handleFontFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2.5 * 1024 * 1024) {
      setUploadedFontError('Font file is too large! Please choose a font under 2.5MB.');
      return;
    }

    setUploadedFontError('');
    const rawName = file.name.replace(/\.[^/.]+$/, "");
    const cleanFamilyName = rawName.replace(/[^a-zA-Z0-9\s_-]/g, "").trim() || 'CustomFont';

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCustomFontDataUrl(result);
        setCustomFontFileName(file.name);
        setCustomFontFamily(cleanFamilyName);
        setCustomFontName(`${cleanFamilyName} (Uploaded)`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearUploadedFont = () => {
    setCustomFontDataUrl('');
    setCustomFontFileName('');
    setUploadedFontError('');
  };

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
  // CUSTOM TITLES PLACED AT THE VERY TOP OF THE LIST!
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

    return [...userCustomMapped, ...adminMapped, ...TITLE_ITEMS];
  }, [customAdminTitles, profileData.purchasedTitles]);

  // Combine default fonts + Admin custom fonts + User custom font
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

    const userCustomFontItem: FontItem[] = (profileData.purchasedFonts?.includes('custom_font') && profileData.customFontConfig) ? [{
      id: 'custom_font',
      name: profileData.customFontConfig.name || 'Custom Uploaded Font',
      fontFamily: profileData.customFontConfig.fontFamily,
      price: 1000,
      sampleText: profileData.customFontConfig.sampleText || 'ROBLOX VOTER 2026',
      category: 'Custom',
      description: 'Your unlocked custom font studio.',
      badge: 'Your Custom 🔤'
    }] : [];

    return [...userCustomFontItem, ...adminMapped, ...FONT_ITEMS];
  }, [customAdminFonts, profileData.purchasedFonts, profileData.customFontConfig]);

  // Combine default colors + User custom color
  const allColorsCatalog = useMemo(() => {
    const userCustomColorItem: NameColorItem[] = (profileData.purchasedColors?.includes('custom_color') && profileData.customColorConfig) ? [{
      id: 'custom_color',
      name: profileData.customColorConfig.name || 'Custom Name Color',
      price: 1000,
      description: 'Your unlocked custom gradient & glow username aura.',
      badge: 'Your Custom 🎨',
      className: 'font-extrabold',
      style: getNameColorStyle('custom_color', profileData.customColorConfig).style
    }] : [];

    return [...userCustomColorItem, ...NAME_COLORS];
  }, [profileData.purchasedColors, profileData.customColorConfig]);

  const handleSaveColorBuilder = async () => {
    if (!onSaveCustomColor) return;
    setIsSavingCustomColor(true);
    try {
      const colorPayload: CustomColorConfig = {
        name: customColorName.trim() || 'My Custom Aura',
        type: customColorType,
        color1: customColor1,
        color2: customColor2,
        color3: customColor3,
        glowColor: customGlowColor,
        glowIntensity: customGlowIntensity,
      };
      await onSaveCustomColor(colorPayload);
    } finally {
      setIsSavingCustomColor(false);
    }
  };

  const handleSaveFontBuilder = async () => {
    if (!onSaveCustomFont) return;
    setIsSavingCustomFont(true);
    try {
      const fontPayload: CustomFontConfig = {
        name: customFontName.trim() || 'My Custom Font',
        fontFamily: customFontFamily.trim() || 'sans-serif',
        sampleText: customFontSample.trim() || 'ROBLOX VOTER 2026',
      };
      if (customFontUrl.trim()) fontPayload.fontUrl = customFontUrl.trim();
      if (customFontDataUrl) fontPayload.fontDataUrl = customFontDataUrl;
      if (customFontFileName) fontPayload.fontFileName = customFontFileName;

      await onSaveCustomFont(fontPayload);
    } finally {
      setIsSavingCustomFont(false);
    }
  };

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
              <div className="space-y-6">
                {/* Custom Name Color Creator Studio Card */}
                <div className="relative overflow-hidden rounded-3xl border border-cyan-500/50 bg-gradient-to-r from-cyan-950/80 via-blue-950/60 to-zinc-950 p-5 sm:p-6 shadow-2xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-cyan-500/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                        <Palette size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-white text-lg sm:text-xl">Custom Name Color Creator Studio 🎨</h3>
                          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                            1,000 Coins
                          </span>
                        </div>
                        <p className="text-xs text-cyan-200/70 mt-0.5">
                          Create custom multi-color gradient & glow username auras for your chat profile!
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Creator Form Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
                    {/* Controls Column */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-zinc-300 block mb-1">Color Preset Name</label>
                        <input
                          type="text"
                          value={customColorName}
                          onChange={(e) => setCustomColorName(e.target.value)}
                          placeholder="e.g. Cyber Neon Aura"
                          className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-zinc-300 block mb-1">Color Mode</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'solid', label: 'Solid Color' },
                            { id: 'linear', label: '2-Color Gradient' },
                            { id: 'radial', label: '3-Color Rainbow' },
                          ].map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setCustomColorType(m.id as any)}
                              className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                                customColorType === m.id
                                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                              }`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Color Pickers */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-zinc-400 block mb-1">Color 1</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={customColor1}
                              onChange={(e) => setCustomColor1(e.target.value)}
                              className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-700 cursor-pointer p-0.5"
                            />
                            <span className="text-[11px] font-mono text-zinc-300 uppercase">{customColor1}</span>
                          </div>
                        </div>

                        {customColorType !== 'solid' && (
                          <div>
                            <label className="text-[11px] font-bold text-zinc-400 block mb-1">Color 2</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={customColor2}
                                onChange={(e) => setCustomColor2(e.target.value)}
                                className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-700 cursor-pointer p-0.5"
                              />
                              <span className="text-[11px] font-mono text-zinc-300 uppercase">{customColor2}</span>
                            </div>
                          </div>
                        )}

                        {customColorType === 'radial' && (
                          <div>
                            <label className="text-[11px] font-bold text-zinc-400 block mb-1">Color 3</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={customColor3}
                                onChange={(e) => setCustomColor3(e.target.value)}
                                className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-700 cursor-pointer p-0.5"
                              />
                              <span className="text-[11px] font-mono text-zinc-300 uppercase">{customColor3}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Glow Controls */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-cyan-500/20">
                        <div>
                          <label className="text-[11px] font-bold text-zinc-400 block mb-1">Glow Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={customGlowColor}
                              onChange={(e) => setCustomGlowColor(e.target.value)}
                              className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-700 cursor-pointer p-0.5"
                            />
                            <span className="text-[11px] font-mono text-zinc-300 uppercase">{customGlowColor}</span>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-zinc-400 block mb-1">Glow Strength</label>
                          <select
                            value={customGlowIntensity}
                            onChange={(e) => setCustomGlowIntensity(e.target.value as any)}
                            className="w-full rounded-xl bg-zinc-900 border border-zinc-700 py-2 px-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                          >
                            <option value="none">No Glow</option>
                            <option value="soft">Soft Glow</option>
                            <option value="medium">Medium Aura</option>
                            <option value="high">Ultra Nitro Glow 🔥</option>
                          </select>
                        </div>
                      </div>

                      {/* Quick Swatches */}
                      <div>
                        <label className="text-[11px] font-bold text-zinc-400 block mb-1.5">Quick Starter Palettes</label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { name: 'Cyber Neon', c1: '#06b6d4', c2: '#3b82f6', c3: '#a855f7', glow: '#06b6d4', type: 'linear' },
                            { name: 'Fiery Crimson', c1: '#ef4444', c2: '#f97316', c3: '#f59e0b', glow: '#ef4444', type: 'linear' },
                            { name: 'Toxic Slime', c1: '#10b981', c2: '#06b6d4', c3: '#84cc16', glow: '#10b981', type: 'linear' },
                            { name: 'Royal Gold', c1: '#f59e0b', c2: '#fbbf24', c3: '#d97706', glow: '#f59e0b', type: 'linear' },
                            { name: 'Rainbow Aura', c1: '#ef4444', c2: '#10b981', c3: '#06b6d4', glow: '#3b82f6', type: 'radial' },
                          ].map((preset) => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => {
                                setCustomColorType(preset.type as any);
                                setCustomColor1(preset.c1);
                                setCustomColor2(preset.c2);
                                setCustomColor3(preset.c3);
                                setCustomGlowColor(preset.glow);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/80 text-[11px] font-medium text-zinc-300 flex items-center gap-1.5 transition-all"
                            >
                              <span
                                className="w-3 h-3 rounded-full border border-white/20"
                                style={{ background: `linear-gradient(90deg, ${preset.c1}, ${preset.c2})` }}
                              />
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Preview Column */}
                    <div className="flex flex-col justify-between rounded-2xl bg-zinc-950 p-4 border border-cyan-500/30">
                      <div>
                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block mb-2">
                          Live Chat Preview
                        </span>

                        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded bg-amber-400/20 text-amber-200 border border-amber-400/50 font-black">
                              {equippedTitleStyle.title || equippedTitleStyle.name}
                            </span>
                            <span
                              className="font-extrabold text-base transition-all"
                              style={getNameColorStyle('custom_color', {
                                name: customColorName,
                                type: customColorType,
                                color1: customColor1,
                                color2: customColor2,
                                color3: customColor3,
                                glowColor: customGlowColor,
                                glowIntensity: customGlowIntensity,
                              }).style}
                            >
                              {user?.displayName || 'Player1'}
                            </span>
                            <span className="text-xs text-zinc-500 font-mono">: Hello world! Check out my custom color!</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-zinc-800">
                        <button
                          type="button"
                          onClick={handleSaveColorBuilder}
                          disabled={isSavingCustomColor || !user}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isSavingCustomColor ? (
                            'Saving & Applying...'
                          ) : profileData.purchasedColors?.includes('custom_color') ? (
                            'Update & Equip Custom Color 🎨'
                          ) : (
                            'Unlock & Equip Custom Color (1,000 Coins) 🎨'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preset Colors Catalog */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                  {allColorsCatalog.map((item) => {
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
                          <span className={`text-sm sm:text-base ${item.className}`} style={item.style}>
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
              <div className="space-y-6">
                {/* Custom Font Creator Studio Card */}
                <div className="relative overflow-hidden rounded-3xl border border-purple-500/50 bg-gradient-to-r from-purple-950/80 via-fuchsia-950/60 to-zinc-950 p-5 sm:p-6 shadow-2xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-purple-500/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-400/40">
                        <Type size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-white text-lg sm:text-xl">Custom Font Upload & Studio 🔤</h3>
                          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/40">
                            1,000 Coins
                          </span>
                        </div>
                        <p className="text-xs text-purple-200/70 mt-0.5">
                          Upload or select custom Google Fonts for your entire Roblox app interface & chat!
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Form Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
                    {/* Input Controls */}
                    <div className="space-y-4">
                      {/* Font File Upload Dropzone / Button */}
                      <div className="rounded-2xl border-2 border-dashed border-purple-500/40 bg-purple-950/20 p-4 transition-all hover:border-purple-400">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-extrabold text-purple-200 flex items-center gap-1.5">
                            <Upload size={14} className="text-purple-400" />
                            Upload Font File (.ttf, .otf, .woff, .woff2)
                          </label>
                          {customFontFileName && (
                            <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle size={10} /> Loaded
                            </span>
                          )}
                        </div>

                        {customFontFileName ? (
                          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/90 border border-purple-500/30">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300 shrink-0">
                                <FileText size={18} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate">{customFontFileName}</p>
                                <p className="text-[10px] text-zinc-400">Custom font file active & synced</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleClearUploadedFont}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors shrink-0"
                              title="Remove uploaded font file"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center p-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 cursor-pointer transition-all group text-center">
                            <FileUp size={24} className="text-purple-400 group-hover:scale-110 transition-transform mb-1.5" />
                            <span className="text-xs font-bold text-purple-200">Click to Select or Drop Font File</span>
                            <span className="text-[10px] text-zinc-400 mt-0.5">Supports TTF, OTF, WOFF, WOFF2 (Max 2.5MB)</span>
                            <input
                              type="file"
                              accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2,application/x-font-ttf,application/x-font-opentype"
                              onChange={handleFontFileUpload}
                              className="hidden"
                            />
                          </label>
                        )}

                        {uploadedFontError && (
                          <p className="text-[11px] text-red-400 font-medium mt-2 flex items-center gap-1">
                            <XCircle size={12} /> {uploadedFontError}
                          </p>
                        )}
                      </div>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-purple-500/20" />
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase font-mono font-bold">
                          <span className="bg-zinc-950 px-2 text-zinc-500">OR Google / Web Fonts</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-zinc-300 block mb-1">Custom Font Title</label>
                        <input
                          type="text"
                          value={customFontName}
                          onChange={(e) => setCustomFontName(e.target.value)}
                          placeholder="e.g. My Pixel Font"
                          className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-zinc-300 block mb-1">Google Font Family Name</label>
                        <input
                          type="text"
                          value={customFontFamily}
                          onChange={(e) => setCustomFontFamily(e.target.value)}
                          placeholder="e.g. Press Start 2P, Bangers, Pacifico, Creepster..."
                          className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-zinc-300 block mb-1">Direct Font URL (Optional)</label>
                        <input
                          type="url"
                          value={customFontUrl}
                          onChange={(e) => setCustomFontUrl(e.target.value)}
                          placeholder="https://fonts.googleapis.com/css2?family=..."
                          className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2 text-xs font-mono text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-purple-400"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-zinc-300 block mb-1.5">Quick Starter Fonts</label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            'Press Start 2P',
                            'Bangers',
                            'Pacifico',
                            'Creepster',
                            'Cinzel',
                            'Monoton',
                            'Fira Code',
                            'Lobster',
                            'Permanent Marker',
                            'Outfit'
                          ].map((font) => (
                            <button
                              key={font}
                              type="button"
                              onClick={() => {
                                setCustomFontFamily(font);
                                setCustomFontName(`${font} Font`);
                              }}
                              className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                                customFontFamily === font
                                  ? 'bg-purple-500/20 text-purple-300 border-purple-400'
                                  : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border-zinc-700/80'
                              }`}
                            >
                              {font}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Preview Column */}
                    <div className="flex flex-col justify-between rounded-2xl bg-zinc-950 p-4 border border-purple-500/30">
                      <div>
                        <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block mb-2">
                          Live Font Preview
                        </span>

                        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
                          <span className="text-[10px] text-zinc-500 font-mono block">Font Sample:</span>
                          <p
                            style={{ fontFamily: customFontFamily }}
                            className="text-lg font-bold text-white leading-relaxed break-words"
                          >
                            {customFontSample || 'ROBLOX VOTER 2026 • LEADERBOARD #1'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-zinc-800">
                        <button
                          type="button"
                          onClick={handleSaveFontBuilder}
                          disabled={isSavingCustomFont || !user}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-400 hover:to-fuchsia-500 text-black font-extrabold text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isSavingCustomFont ? (
                            'Saving & Applying...'
                          ) : profileData.purchasedFonts?.includes('custom_font') ? (
                            'Update & Equip Custom Font 🔤'
                          ) : (
                            'Unlock & Equip Custom Font (1,000 Coins) 🔤'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Font Items Grid */}
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
