import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, X } from 'lucide-react';
import { GlobalAnnouncement } from '../types';

interface AnnouncementBannerProps {
  announcement: GlobalAnnouncement | null;
  durationMs?: number; // Auto-dismiss time in ms (default 7000ms)
}

// Web Audio API notification sound generator
const playNotificationChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // First tone (D5 - 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Second tone (A5 - 880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.1);
    gain2.gain.setValueAtTime(0.15, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.5);
  } catch (e) {
    console.warn('Notification audio playback not allowed or supported:', e);
  }
};

export default function AnnouncementBanner({ announcement, durationMs = 7000 }: AnnouncementBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const lastAnnouncementId = useRef<string>('');

  const effectiveDurationMs = (announcement?.durationSeconds && announcement.durationSeconds > 0)
    ? announcement.durationSeconds * 1000
    : durationMs;

  useEffect(() => {
    if (!announcement || !announcement.enabled || !announcement.message?.trim()) {
      setIsVisible(false);
      return;
    }

    // Create unique key for current announcement to detect changes
    const currentId = `${announcement.message}_${announcement.durationSeconds || 7}_${announcement.updatedAt?.seconds || Date.now()}`;

    // Pop in whenever a new announcement is received or enabled
    if (currentId !== lastAnnouncementId.current || !isVisible) {
      lastAnnouncementId.current = currentId;
      setIsVisible(true);

      // Play notification chime
      playNotificationChime();

      // Set auto-dismiss timer
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, effectiveDurationMs);

      return () => clearTimeout(timer);
    }
  }, [announcement, effectiveDurationMs]);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && announcement && announcement.enabled && announcement.message?.trim() && (
        <motion.div
          key={lastAnnouncementId.current}
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-2xl border border-blue-500/40 bg-zinc-900/95 p-4 sm:p-5 shadow-2xl shadow-blue-950/50 backdrop-blur-xl"
        >
          {/* Top blue accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400" />

          <div className="flex items-start justify-between gap-3 pt-1">
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-inner mt-0.5">
                <Megaphone size={20} className="animate-pulse" />
              </div>

              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                    Announcement
                  </span>
                </div>
                <p className="text-sm font-medium text-zinc-100 leading-relaxed break-words">
                  {announcement.message}
                </p>
              </div>
            </div>

            {/* Manual Dismiss Button */}
            <button
              onClick={handleDismiss}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 active:scale-95 transition-all border border-zinc-700/50"
              title="Dismiss announcement"
              aria-label="Close announcement"
            >
              <X size={16} />
            </button>
          </div>

          {/* Countdown timer animation bar */}
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: effectiveDurationMs / 1000, ease: 'linear' }}
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500/70 origin-left"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
