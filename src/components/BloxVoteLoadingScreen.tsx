import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Vote, Sparkles, Trophy, ShieldCheck, Flame, RefreshCw } from 'lucide-react';

interface BloxVoteLoadingScreenProps {
  isLoading: boolean;
  onFinished?: () => void;
}

const BLOXVOTE_STAGES = [
  "INITIALIZING BLOXVOTE ENGINE",
  "CONNECTING TO ROBLOX VOTE NODES",
  "SYNCING LEADERBOARD DATA",
  "AUTHENTICATING USER PROFILE",
  "VERIFYING BLOXCOIN BALANCES",
  "PREPARING LIVE COMMUNITY SHARDS",
  "BLOXVOTE READY!"
];

const BLOXVOTE_TIPS = [
  "Cast your daily votes to earn bonus BloxCoins!",
  "Equip unique custom fonts, name colors, and titles in the Shop.",
  "Check out the Live Chat to debate top Roblox experience contenders.",
  "Custom titles require admin approval before appearing globally.",
  "Level up your account by active participation and voting!"
];

export const BloxVoteLoadingScreen: React.FC<BloxVoteLoadingScreenProps> = ({
  isLoading,
  onFinished,
}) => {
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [isFinishedInternal, setIsFinishedInternal] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setIsFinishedInternal(false);

      const duration = 2200; // 2.2 seconds complete loading screen duration
      const stepTime = 40;
      const totalSteps = duration / stepTime;
      let currentStep = 0;

      interval = setInterval(() => {
        currentStep++;
        const pct = Math.min(100, Math.floor((currentStep / totalSteps) * 100));
        setProgress(pct);

        const currentStageIdx = Math.min(
          BLOXVOTE_STAGES.length - 1,
          Math.floor((pct / 100) * BLOXVOTE_STAGES.length)
        );
        setStageIndex(currentStageIdx);

        if (pct >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsFinishedInternal(true);
            if (onFinished) onFinished();
          }, 350);
        }
      }, stepTime);
    } else {
      // Rapidly complete progress to 100% when backend finishes loading
      if (!isFinishedInternal) {
        let currentPct = progress;
        interval = setInterval(() => {
          currentPct += 15;
          if (currentPct >= 100) {
            currentPct = 100;
            setProgress(100);
            setStageIndex(BLOXVOTE_STAGES.length - 1);
            clearInterval(interval);
            setTimeout(() => {
              setIsFinishedInternal(true);
              if (onFinished) onFinished();
            }, 350);
          } else {
            setProgress(currentPct);
          }
        }, 30);
      }
    }

    return () => clearInterval(interval);
  }, [isLoading]);

  // Tip cycle
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % BLOXVOTE_TIPS.length);
    }, 1800);
    return () => clearInterval(tipInterval);
  }, []);

  if (isFinishedInternal) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-zinc-950 text-white select-none overflow-hidden font-sans"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 40%, rgba(37, 99, 235, 0.22) 0%, rgba(124, 58, 237, 0.15) 35%, rgba(9, 9, 11, 0.98) 100%),
            linear-gradient(to bottom, rgba(15, 23, 42, 0.9), rgba(9, 9, 11, 0.98))
          `
        }}
      >
        {/* Subtle grid background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

        {/* Ambient background glows */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"
        />

        {/* Center Container */}
        <div className="relative z-10 flex flex-col items-center max-w-md px-6 text-center">
          {/* BloxVote Main Badge & Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="relative mb-6"
          >
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 blur-xl opacity-40 animate-pulse" />
            
            <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border-2 border-blue-500/70 shadow-[0_0_50px_rgba(59,130,246,0.45)] flex items-center justify-center p-2.5 overflow-hidden">
              <img 
                src="/favicon.png" 
                alt="BloxVote Logo" 
                className="w-full h-full object-contain p-2 drop-shadow-[0_0_25px_rgba(59,130,246,0.9)]"
              />
            </div>
          </motion.div>

          {/* BloxVote Title */}
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase drop-shadow-md">
            BLOX<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">VOTE</span>
          </h1>

          <p className="text-xs font-bold tracking-widest text-blue-300/80 uppercase mt-1 mb-8 flex items-center justify-center gap-1.5">
            <Sparkles size={13} className="text-amber-400" />
            <span>ROBLOX VOTING 2026</span>
            <Sparkles size={13} className="text-amber-400" />
          </p>

          {/* Progress Bar Container */}
          <div className="w-full bg-zinc-950 border border-blue-500/30 rounded-2xl p-1.5 shadow-[0_0_20px_rgba(59,130,246,0.2)] mb-4">
            <div className="relative h-5 w-full bg-zinc-900/90 rounded-xl overflow-hidden flex items-center">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 rounded-xl relative shadow-[0_0_12px_rgba(99,102,241,0.8)]"
                style={{ width: `${progress}%` }}
                transition={{ ease: 'linear' }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[size:1rem_1rem]" />
              </motion.div>

              <span className="absolute inset-0 flex items-center justify-center font-black text-[11px] tracking-widest text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                {progress}%
              </span>
            </div>
          </div>

          {/* Loading Stage Status */}
          <div className="h-6 flex items-center justify-center mb-6">
            <p className="text-[11px] font-extrabold tracking-wider text-blue-300 uppercase flex items-center gap-1.5 bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20">
              <RefreshCw size={12} className="animate-spin text-blue-400" />
              <span>{BLOXVOTE_STAGES[stageIndex]}</span>
            </p>
          </div>

          {/* Rotating Tip */}
          <motion.div
            key={tipIndex}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 text-zinc-400 text-xs font-medium max-w-xs flex items-center gap-2"
          >
            <Trophy size={14} className="text-amber-400 shrink-0" />
            <span>"{BLOXVOTE_TIPS[tipIndex]}"</span>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
