import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Coins, Check, Sparkles, Palette, Image as ImageIcon, Type, Gift } from 'lucide-react';
import { User } from 'firebase/auth';
import { 
  NAME_COLORS, 
  BACKGROUND_THEMES, 
  FONT_ITEMS,
  NameColorItem, 
  BackgroundThemeItem, 
  FontItem,
  getNameColorStyle, 
  getBackgroundThemeStyle,
  getFontItemStyle
} from '../lib/shopData';
import { UserProfileData } from '../types';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  profileData: UserProfileData;
  onBuyItem: (type: 'color' | 'theme' | 'font', item: NameColorItem | BackgroundThemeItem | FontItem) => Promise<boolean>;
  onEquipItem: (type: 'color' | 'theme' | 'font', itemId: string) => Promise<void>;
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
  onClaimDailyBonus,
  previewThemeId,
  onPreviewTheme,
  previewFontId,
  onPreviewFont,
}: ShopModalProps) {
  const [activeTab, setActiveTab] = useState<'colors' | 'themes' | 'fonts' | 'earn'>('colors');
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [isClaimingBonus, setIsClaimingBonus] = useState(false);

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const canClaimDaily = user && profileData.lastDailyBonusDate !== todayStr;

  const equippedColorStyle = getNameColorStyle(profileData.equippedColor);
  const equippedThemeStyle = getBackgroundThemeStyle(profileData.equippedTheme);
  const equippedFontStyle = getFontItemStyle(profileData.equippedFont);

  const purchasedFonts = profileData.purchasedFonts || ['default'];
  const equippedFont = profileData.equippedFont || 'default';

  const handleBuy = async (type: 'color' | 'theme' | 'font', item: NameColorItem | BackgroundThemeItem | FontItem) => {
    setLoadingItemId(item.id);
    try {
      await onBuyItem(type, item);
    } finally {
      setLoadingItemId(null);
    }
  };

  const handleEquip = async (type: 'color' | 'theme' | 'font', itemId: string) => {
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
              <span className={`px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 ${equippedColorStyle.className}`}>
                {user?.displayName || 'Your Username'}
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
                  const isOwned = purchasedFonts.includes(item.id);
                  const isEquipped = equippedFont === item.id;
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
