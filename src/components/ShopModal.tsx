import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Coins, Check, Sparkles, Palette, Image as ImageIcon, Type, Gift, Award, Search, Send, Clock, CheckCircle, XCircle } from 'lucide-react';
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
import { UserProfileData, CustomTitleRequest } from '../types';

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
  previewThemeId?: string | null;
  onPreviewTheme?: (themeId: string | null) => void;
  previewFontId?: string | null;
  onPreviewFont?: (fontId: string | null) => void;
}

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

  // Title search & category filter
  const [titleSearch, setTitleSearch] = useState('');
  const [titleCategory, setTitleCategory] = useState<string>('All');

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const canClaimDaily = user && profileData.lastDailyBonusDate !== todayStr;

  const equippedColorStyle = getNameColorStyle(profileData.equippedColor);
  const equippedThemeStyle = getBackgroundThemeStyle(profileData.equippedTheme);
  const equippedFontStyle = getFontItemStyle(profileData.equippedFont);
  const equippedTitleStyle = getTitleItemStyle(profileData.equippedTitle);

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

  // Filtered titles
  const filteredTitles = TITLE_ITEMS.filter((item) => {
    const matchesCategory = titleCategory === 'All' || item.category === titleCategory;
    const matchesSearch = item.name.toLowerCase().includes(titleSearch.toLowerCase()) || 
                          item.title.toLowerCase().includes(titleSearch.toLowerCase()) ||
                          item.description.toLowerCase().includes(titleSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
                  {customTitleRequest ? (
                    <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-medium ${
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
                  ) : (
                    <form onSubmit={handleCustomTitleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                            Requested Title (Max 30 chars)
                          </label>
                          <input
                            type="text"
                            maxLength={30}
                            value={customTitleInput}
                            onChange={(e) => setCustomTitleInput(e.target.value)}
                            placeholder="e.g. Roblox Legend or [Tuff Boss]"
                            className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
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

                      <div className="flex items-center justify-between gap-3 pt-1">
                        <div className="text-[11px] text-zinc-400">
                          {profileData.coins < 1000 ? (
                            <span className="text-red-400 font-semibold">You need 1,000 BloxCoins to request a custom title.</span>
                          ) : (
                            <span className="text-emerald-400 font-semibold">You have enough coins! Instant submission to admins.</span>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={!customTitleInput.trim() || profileData.coins < 1000 || !user || isSubmittingCustom}
                          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-extrabold transition-all active:scale-95 ${
                            customTitleInput.trim() && profileData.coins >= 1000 && user && !isSubmittingCustom
                              ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-lg shadow-amber-950/40'
                              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          }`}
                        >
                          <Send size={14} />
                          <span>{isSubmittingCustom ? 'Submitting...' : 'Submit Request (1,000 Coins)'}</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Pre-made Titles Title Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div>
                    <h4 className="text-lg font-black text-white flex items-center gap-2">
                      <Award className="text-amber-400" size={18} />
                      Title Catalog ({filteredTitles.length})
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Choose from over 50+ pre-made titles or filter by category below.
                    </p>
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full sm:w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={titleSearch}
                      onChange={(e) => setTitleSearch(e.target.value)}
                      placeholder="Search 50+ titles..."
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-800 pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Category Pill Filters */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {['All', 'Roblox', 'Gaming', 'Flex', 'Funny', 'Roleplay', 'Status', 'Popular'].map((cat) => (
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
                    const isOwned = purchasedTitles.includes(item.id);
                    const isEquipped = equippedTitle === item.id;
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
                              className="rounded-xl bg-blue-600/80 hover:bg-blue-500 px-4 py-1.5 text-xs font-bold text-white shadow-md transition-all active:scale-95"
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
            )}

            {/* APP FONTS TAB */}
            {activeTab === 'fonts' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                {FONT_ITEMS.map((item) => {
                  const fontList = profileData.purchasedFonts || ['default'];
                  const isOwned = fontList.includes(item.id);
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
