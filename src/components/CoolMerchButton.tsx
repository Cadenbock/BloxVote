import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, ExternalLink, Sparkles, Flame, Shirt, Tag } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSound } from '../lib/sounds';
import { openMerchModal } from '../lib/merchModalState';

interface CoolMerchButtonProps {
  variant?: 'header' | 'banner' | 'floating' | 'card' | 'compact' | 'hero';
  label?: string;
  sublabel?: string;
  onClick?: () => void;
  className?: string;
  showBadge?: boolean;
}

export default function CoolMerchButton({
  variant = 'banner',
  label = 'Official Merch Store',
  sublabel = 'Hoodies, Shirts & Collectibles!',
  onClick,
  className = '',
  showBadge = true,
}: CoolMerchButtonProps) {
  const [screenFlash, setScreenFlash] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    playSound('merchClick');

    // Trigger Screen Flash
    setScreenFlash(true);
    setTimeout(() => setScreenFlash(false), 150);

    // High performance HTML5 Canvas confetti blast
    confetti({
      particleCount: 35,
      spread: 60,
      origin: {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      },
      colors: ['#f59e0b', '#ec4899', '#a855f7', '#3b82f6'],
      disableForReducedMotion: true,
    });

    // Open the single central Merch Coupon Modal!
    openMerchModal();

    if (onClick) {
      onClick();
    }
  };

  const handleMouseEnter = () => {
    playSound('merchHover');
  };

  const renderButtonContent = () => {
    // 1. Hero Variant
    if (variant === 'hero') {
      return (
        <div className="relative inline-block">
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            className={`relative group flex items-center gap-3 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 px-7 py-3.5 sm:px-8 sm:py-4 text-sm sm:text-base font-black text-zinc-950 shadow-lg hover:brightness-110 transition-all cursor-pointer overflow-hidden ${className}`}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-950 text-amber-300 shadow-md">
              <Shirt size={16} />
            </div>

            <div className="flex flex-col text-left">
              <span className="text-[9px] font-black uppercase tracking-wider text-zinc-950/80 -mb-0.5">
                {sublabel || 'HOT DROP'}
              </span>
              <span className="text-zinc-950 font-black tracking-tight leading-none">
                {label}
              </span>
            </div>

            <ExternalLink size={16} className="text-zinc-950" />
          </motion.button>
        </div>
      );
    }

    // 2. Header Variant
    if (variant === 'header') {
      return (
        <div className="relative inline-block">
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.94 }}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            className={`relative group overflow-hidden flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white font-black text-xs shadow-md border border-amber-300/50 cursor-pointer transition-all ${className}`}
          >
            <ShoppingBag size={14} className="text-amber-200 shrink-0" />
            <span className="font-black tracking-wide text-white">
              {label}
            </span>
            {showBadge && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-zinc-950 font-black text-[9px] uppercase tracking-wider">
                HOT
              </span>
            )}
            <ExternalLink size={12} className="text-amber-200 opacity-80" />
          </motion.button>
        </div>
      );
    }

    // 3. Compact / Card Badge
    if (variant === 'compact') {
      return (
        <div className="relative inline-block">
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-xs transition-colors cursor-pointer ${className}`}
          >
            <Shirt size={14} className="text-amber-400" />
            <span>{label}</span>
            <ExternalLink size={12} className="text-amber-400" />
          </motion.button>
        </div>
      );
    }

    // 4. Floating Action Widget
    if (variant === 'floating') {
      return (
        <div className="relative inline-block">
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.94 }}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            className={`group relative flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 text-zinc-950 font-black shadow-lg border border-white/80 cursor-pointer transition-all ${className}`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-950 text-amber-400">
              <ShoppingBag size={18} />
            </div>
            <div className="flex flex-col items-start text-left">
              <span className="text-xs font-black text-white leading-tight flex items-center gap-1">
                {label}
                <Sparkles size={11} className="text-amber-300" />
              </span>
              <span className="text-[10px] text-amber-200/90 font-bold leading-tight">
                {sublabel}
              </span>
            </div>
            <ExternalLink size={14} className="text-white ml-1" />
          </motion.button>
        </div>
      );
    }

    // 5. Default / Banner Variant
    return (
      <div className="relative w-full max-w-full">
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="relative group rounded-3xl p-[2px] bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 shadow-lg transition-all duration-200 overflow-hidden"
        >
          <button
            type="button"
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            className={`w-full relative flex items-center justify-between gap-4 p-4 sm:p-5 rounded-[22px] bg-zinc-950 text-white cursor-pointer overflow-hidden ${className}`}
          >
            <div className="flex items-center gap-3 sm:gap-4 relative z-10">
              <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 text-zinc-950 font-black shadow-md shrink-0">
                <ShoppingBag size={26} />
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-300 shadow-sm">
                  <Flame size={11} className="text-zinc-950 fill-zinc-950" />
                </span>
              </div>

              <div className="flex flex-col text-left">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                    Exclusive Drop
                  </span>
                  <span className="text-[10px] text-zinc-400 hidden sm:inline-flex items-center gap-1">
                    <Tag size={10} className="text-rose-400" />
                    Official Store
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black tracking-tight text-white group-hover:text-amber-200 transition-colors">
                  {label}
                </h3>
                <p className="text-xs text-zinc-400 font-medium line-clamp-1">
                  {sublabel}
                </p>
              </div>
            </div>

            <div className="relative z-10 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-rose-500 to-purple-500 text-zinc-950 font-black text-xs sm:text-sm shadow-md shrink-0">
              <span>Shop Now</span>
              <ExternalLink size={15} className="text-zinc-950" />
            </div>
          </button>
        </motion.div>
      </div>
    );
  };

  return (
    <>
      {renderButtonContent()}

      {/* Screen Light Flash */}
      <AnimatePresence>
        {screenFlash && (
          <motion.div
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 pointer-events-none z-[9998] bg-amber-400/10"
          />
        )}
      </AnimatePresence>
    </>
  );
}
