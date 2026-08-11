import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, X, Sparkles, Flame, Gift, ExternalLink, Copy, Check } from 'lucide-react';
import { playSound } from '../lib/sounds';
import CoolMerchButton from './CoolMerchButton';

export default function MerchPopup() {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const popupTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initial display after 8 seconds on first load
    popupTimerRef.current = setTimeout(() => {
      setIsVisible(true);
      playSound('merchOpen');
    }, 8000);

    return () => {
      if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    };
  }, []);

  const scheduleNextPopup = () => {
    // Clear any existing timer so we NEVER open multiple popups simultaneously
    if (popupTimerRef.current) {
      clearTimeout(popupTimerRef.current);
    }

    // 5 to 7 minutes interval (300,000ms to 420,000ms)
    const minMs = 5 * 60 * 1000;
    const maxMs = 7 * 60 * 1000;
    const randomDelay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;

    popupTimerRef.current = setTimeout(() => {
      setIsVisible((prev) => {
        // Only open if not already visible
        if (!prev) {
          playSound('merchOpen');
          return true;
        }
        return prev;
      });
    }, randomDelay);
  };

  const handleClose = () => {
    playSound('click');
    setIsVisible(false);
    scheduleNextPopup();
  };

  const handleOpenStore = () => {
    // Sound & window open handled by CoolMerchButton or directly
    setTimeout(() => {
      setIsVisible(false);
      scheduleNextPopup();
    }, 500);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 140, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 140, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="fixed right-4 sm:right-6 bottom-6 z-50 max-w-sm w-[92vw] sm:w-84 shadow-[0_0_60px_rgba(244,63,94,0.6)] rounded-3xl"
        >
          <div className="relative rounded-3xl p-[3px] bg-gradient-to-b from-amber-400 via-rose-500 to-purple-600 animate-[pulse_2.5s_infinite]">
            <div className="relative rounded-[21px] bg-zinc-950 p-5 text-white overflow-hidden shadow-2xl">
              {/* Background ambient light */}
              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-rose-500/30 blur-2xl pointer-events-none" />
              <div className="absolute -left-10 -bottom-10 h-28 w-28 rounded-full bg-amber-500/30 blur-2xl pointer-events-none" />

              {/* Close Button */}
              <button
                type="button"
                onClick={handleClose}
                className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors z-10 cursor-pointer"
                title="Dismiss"
              >
                <X size={16} />
              </button>

              {/* Content */}
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-500 text-zinc-950 font-black shadow-lg">
                  <ShoppingBag size={28} className="animate-bounce" />
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-300 text-[10px] shadow-sm">
                    <Sparkles size={11} className="text-zinc-950" />
                  </span>
                </div>

                <div className="flex items-center gap-1.5 mb-1">
                  <Flame size={14} className="text-amber-400 fill-amber-400/30 animate-pulse" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                    Official Merch Drop
                  </span>
                </div>

                <h3 className="text-lg font-black tracking-tight text-white mb-1">
                  BloxVote Merch Store! 👕✨
                </h3>

                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-black mb-3">
                  <Gift size={12} className="animate-bounce" />
                  <span>30% OFF Code: <strong className="text-amber-300">BLOXVOTE</strong></span>
                </div>

                <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
                  Heavyweight hoodies, tees, holographic stickers & collectibles. Save 30% on orders over $25!
                </p>

                {/* Big Bright Particle Button */}
                <CoolMerchButton
                  variant="floating"
                  label="Visit Merch Store!"
                  sublabel="30% OFF Coupon Unlocked"
                  onClick={handleOpenStore}
                  className="w-full justify-center"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

