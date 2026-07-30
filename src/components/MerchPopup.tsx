import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, X, ExternalLink, Sparkles, Flame } from 'lucide-react';

export default function MerchPopup() {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    // Initial display after 12 seconds so user can see it right away on load
    const initialTimer = setTimeout(() => {
      setIsVisible(true);
    }, 12000);

    return () => clearTimeout(initialTimer);
  }, []);

  const scheduleNextPopup = () => {
    // 5 to 7 minutes interval (300,000ms to 420,000ms)
    const minMs = 5 * 60 * 1000;
    const maxMs = 7 * 60 * 1000;
    const randomDelay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;

    setTimeout(() => {
      setIsVisible(true);
    }, randomDelay);
  };

  const handleClose = () => {
    setIsVisible(false);
    scheduleNextPopup();
  };

  const handleOpenStore = () => {
    window.open('https://shop.bloxvote.com/', '_blank', 'noopener,noreferrer');
    setIsVisible(false);
    scheduleNextPopup();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 120, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 120, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed right-4 sm:right-6 top-1/2 -translate-y-1/2 z-50 max-w-sm w-[90vw] sm:w-80 shadow-[0_0_40px_rgba(244,63,94,0.4)] rounded-3xl"
        >
          <div className="relative rounded-3xl p-[2.5px] bg-gradient-to-b from-amber-400 via-rose-500 to-purple-600">
            <div className="relative rounded-[22px] bg-zinc-950 p-5 text-white overflow-hidden shadow-2xl">
              {/* Background ambient light */}
              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-rose-500/25 blur-2xl pointer-events-none" />
              <div className="absolute -left-10 -bottom-10 h-28 w-28 rounded-full bg-amber-500/25 blur-2xl pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors z-10"
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
                  <Flame size={14} className="text-amber-400 fill-amber-400/30" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                    Official Merch Drop
                  </span>
                </div>

                <h3 className="text-lg font-black tracking-tight text-white mb-1.5">
                  Gear Up with BloxVote!
                </h3>

                <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
                  Support BloxVote with exclusive hoodies, t-shirts, stickers & collectibles!
                </p>

                {/* Big Bright Button */}
                <button
                  onClick={handleOpenStore}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-400 to-rose-500 text-zinc-950 font-black text-sm shadow-[0_0_25px_rgba(251,191,36,0.6)] hover:shadow-[0_0_35px_rgba(251,191,36,0.9)] hover:scale-105 active:scale-95 transition-all duration-200 border border-white/50 cursor-pointer"
                >
                  <ShoppingBag size={18} className="text-zinc-950" />
                  <span>Merch Store!</span>
                  <ExternalLink size={16} className="text-zinc-950" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
