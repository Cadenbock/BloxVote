import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, X, Sparkles, Copy, Check, ExternalLink, Gift, Shirt, Crown } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSound } from '../lib/sounds';

interface Particle {
  id: number;
  x: number;
  y: number;
  icon: string;
  angle: number;
  speed: number;
}

export default function MerchCouponModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const handleOpenModal = () => {
      playSound('merchOpen');
      setIsOpen(true);
    };

    window.addEventListener('bloxvote:open-merch-modal', handleOpenModal);
    return () => {
      window.removeEventListener('bloxvote:open-merch-modal', handleOpenModal);
    };
  }, []);

  const triggerConfettiExplosion = (e?: React.MouseEvent) => {
    // 1. Play audio feedback
    playSound('purchase');
    playSound('coin');

    // 2. High-performance Canvas Confetti (runs on HTML5 Canvas, 120 FPS)
    confetti({
      particleCount: 90,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#f59e0b', '#ec4899', '#a855f7', '#3b82f6', '#10b981', '#facc15'],
      disableForReducedMotion: true,
    });

    setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#f59e0b', '#ec4899', '#ffffff'],
        disableForReducedMotion: true,
      });
    }, 200);

    // 3. Spawn a small burst of 8 floating emoji items
    const clickX = e ? e.clientX : window.innerWidth / 2;
    const clickY = e ? e.clientY : window.innerHeight / 2;
    const icons = ['🎉', '👕', '🏷️', '✨', '30% OFF', 'BLOXVOTE', '💎', '🎁'];

    const newParticles: Particle[] = Array.from({ length: 8 }).map((_, i) => {
      const angle = (i / 8) * 360;
      return {
        id: Date.now() + i,
        x: clickX,
        y: clickY,
        icon: icons[i % icons.length],
        angle: angle * (Math.PI / 180),
        speed: Math.random() * 180 + 100,
      };
    });

    setParticles(newParticles);
    setTimeout(() => setParticles([]), 900);
  };

  const handleCopyCode = (e: React.MouseEvent) => {
    navigator.clipboard.writeText('BLOXVOTE');
    setCopied(true);
    triggerConfettiExplosion(e);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleGoToStore = () => {
    playSound('purchase');
    window.open('https://shop.bloxvote.com/', '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Emoji Particles */}
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{ x: p.x, y: p.y, opacity: 1, scale: 0.5 }}
            animate={{
              x: p.x + Math.cos(p.angle) * p.speed,
              y: p.y + Math.sin(p.angle) * p.speed - 50,
              opacity: [1, 1, 0],
              scale: [0.5, 1.4, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ left: 0, top: 0 }}
            className="fixed pointer-events-none z-[99999] text-xl font-black select-none"
          >
            {p.icon}
          </motion.span>
        ))}
      </AnimatePresence>

      {/* Main Single Modal Window */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[99990] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="relative w-full max-w-lg rounded-3xl p-[2.5px] bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 shadow-[0_0_50px_rgba(244,63,94,0.4)]"
            >
              <div className="relative rounded-[22px] bg-zinc-950 p-6 sm:p-8 text-white overflow-hidden space-y-6">
                {/* Background Ambient Glows */}
                <div className="absolute -top-20 -left-20 h-40 w-40 rounded-full bg-amber-500/20 blur-2xl pointer-events-none" />
                <div className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-purple-500/20 blur-2xl pointer-events-none" />

                {/* Top Close Button */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors z-20 cursor-pointer shadow-md"
                  title="Close Modal"
                >
                  <X size={18} />
                </button>

                {/* Header Banner */}
                <div className="text-center space-y-3 relative z-10">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 text-zinc-950 font-black shadow-xl">
                    <Shirt size={32} />
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black uppercase tracking-wider shadow-sm">
                    <Sparkles size={13} className="text-amber-400" />
                    <span>Official BloxVote Merch Drop</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    BloxVote Merch Coupon! 👕✨
                  </h2>

                  <p className="text-xs sm:text-sm text-zinc-300 max-w-sm mx-auto leading-relaxed">
                    Enjoy <strong className="text-amber-300 font-bold">30% OFF</strong> your entire order over <strong className="text-amber-300 font-bold">$25.00</strong> on the official merch store!
                  </p>
                </div>

                {/* Coupon Code Container */}
                <div className="relative z-10 p-5 rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-amber-400/40 shadow-xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider">
                    <span className="text-amber-400 flex items-center gap-1.5">
                      <Gift size={14} className="text-amber-400" />
                      Promo Code (30% OFF)
                    </span>
                    <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30">
                      Orders Over $25.00
                    </span>
                  </div>

                  {/* Code Box + Copy Button */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800 shadow-inner">
                    <div className="flex items-center gap-2">
                      <Crown size={20} className="text-amber-400" />
                      <span className="font-mono text-2xl sm:text-3xl font-black text-amber-300 tracking-widest select-all">
                        BLOXVOTE
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-black text-xs sm:text-sm transition-all active:scale-95 cursor-pointer shadow-md ${
                        copied
                          ? 'bg-emerald-500 text-zinc-950 shadow-emerald-500/50'
                          : 'bg-gradient-to-r from-amber-400 via-rose-500 to-purple-500 hover:from-amber-300 hover:to-purple-400 text-zinc-950'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check size={18} />
                          <span>COPIED TO CLIPBOARD! 🎉</span>
                        </>
                      ) : (
                        <>
                          <Copy size={18} />
                          <span>COPY CODE</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Featured Products Quick Preview */}
                <div className="relative z-10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <ShoppingBag size={14} className="text-amber-400" />
                      Featured Gear Collection
                    </span>
                    <span className="text-[10px] text-zinc-500 font-medium">
                      Heavyweight & Custom Embroidered
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { title: 'BloxVote Hoodie', price: '$49.99', icon: '🧥' },
                      { title: 'Voter Tee', price: '$24.99', icon: '👕' },
                      { title: 'Roblox Snapback', price: '$29.99', icon: '🧢' },
                      { title: 'Sticker Pack (10x)', price: '$9.99', icon: '🏷️' },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        onClick={handleGoToStore}
                        className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-amber-400/40 hover:bg-zinc-900 transition-colors flex items-center gap-2.5 cursor-pointer group"
                      >
                        <span className="text-xl p-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
                          {item.icon}
                        </span>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-white truncate">{item.title}</p>
                          <p className="text-[10px] text-amber-300 font-extrabold">{item.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Primary CTA Buttons */}
                <div className="relative z-10 space-y-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleGoToStore}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 text-zinc-950 font-black text-sm sm:text-base shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer border border-white/40"
                  >
                    <ShoppingBag size={20} className="text-zinc-950" />
                    <span>PROCEED TO MERCH STORE 🛍️</span>
                    <ExternalLink size={16} className="text-zinc-950" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-full text-center text-xs text-zinc-400 hover:text-white transition-colors py-1 cursor-pointer"
                  >
                    Close and keep browsing
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
