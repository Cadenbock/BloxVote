import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, ExternalLink, ThumbsUp, Check, Sparkles, ChevronLeft, ChevronRight, Play, Flame, Award, ShieldCheck } from 'lucide-react';
import { Game } from '../types';
import { cn } from '../lib/utils';

interface FeaturedGamesBannerProps {
  featuredGames: Game[];
  onVote: (gameId: string) => void;
  userVotes: Record<string, boolean>;
}

export default function FeaturedGamesBanner({ featuredGames, onVote, userVotes }: FeaturedGamesBannerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Auto rotate featured games every 8 seconds if multiple
  useEffect(() => {
    if (!featuredGames || featuredGames.length <= 1) return;

    const timer = setInterval(() => {
      setSelectedIndex((prev) => (prev + 1) % featuredGames.length);
    }, 8000);

    return () => clearInterval(timer);
  }, [featuredGames]);

  if (!featuredGames || featuredGames.length === 0) return null;

  // Bound index safely
  const currentIndex = selectedIndex >= featuredGames.length ? 0 : selectedIndex;
  const currentGame = featuredGames[currentIndex];
  const hasVoted = !!userVotes[currentGame.id];

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev - 1 + featuredGames.length) % featuredGames.length);
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev + 1) % featuredGames.length);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-14 w-full"
    >
      {/* Header bar for Featured Section */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
            <Star size={22} className="fill-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-white tracking-tight">
                Featured Experiences Spotlight
              </h2>
              <span className="rounded-full bg-amber-400/20 border border-amber-400/40 px-3 py-0.5 text-[10px] font-black uppercase text-amber-300 tracking-wider">
                Official Curation
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Handpicked top-tier Roblox experiences highlighted by community admins
            </p>
          </div>
        </div>

        {/* Navigation & Controls */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3.5 py-1 text-xs font-bold text-amber-300">
            <Sparkles size={14} />
            {featuredGames.length} Featured
          </span>

          {featuredGames.length > 1 && (
            <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-2xl border border-zinc-800">
              <button
                onClick={handlePrev}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all"
                title="Previous Featured Game"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-xs font-mono font-bold text-zinc-400 px-2">
                {currentIndex + 1}/{featuredGames.length}
              </span>
              <button
                onClick={handleNext}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all"
                title="Next Featured Game"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MASSIVE HERO SHOWCASE CARD */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentGame.id}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden rounded-2xl sm:rounded-[2.5rem] border-2 border-amber-500/40 bg-zinc-950 shadow-[0_0_50px_rgba(245,158,11,0.12)] min-h-[360px] sm:min-h-[440px] flex flex-col justify-between"
        >
          {/* Background Ambient Cover Art with Blur Glow */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <img
              src={currentGame.imageUrl}
              alt=""
              className="h-full w-full object-cover opacity-25 filter blur-3xl scale-125"
              referrerPolicy="no-referrer"
            />
            {/* Gradient Overlays for High Contrast Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-transparent" />
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-amber-500/10 to-transparent" />
          </div>

          {/* Top Decorative Gold Line */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 z-10" />

          {/* Hero Content Grid */}
          <div className="relative z-10 p-4 sm:p-8 md:p-12 flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8 my-auto">
            
            {/* Left Column: Huge Game Image & Badge */}
            <div className="relative group shrink-0 w-full lg:w-auto flex justify-center">
              <div className="absolute -inset-2 rounded-2xl sm:rounded-[2rem] bg-gradient-to-r from-amber-500 to-yellow-400 opacity-30 blur-xl group-hover:opacity-60 transition duration-500" />
              <div className="relative h-48 w-48 sm:h-72 sm:w-72 md:h-80 md:w-80 rounded-2xl sm:rounded-[2rem] overflow-hidden border-2 border-amber-500/50 bg-zinc-900 shadow-2xl shrink-0">
                <img
                  src={currentGame.imageUrl}
                  alt={currentGame.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                />
                
                {/* Floating Featured Badge */}
                <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-amber-500 text-black px-3.5 py-1.5 text-xs font-black shadow-xl uppercase tracking-wider">
                  <Star size={14} className="fill-black" />
                  Featured
                </div>

                {/* Vote Count Badge Overlay */}
                <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-2xl bg-black/85 backdrop-blur-md border border-amber-500/40 px-4 py-2 text-amber-300 shadow-xl">
                  <Flame size={18} className="text-amber-400 fill-amber-400 animate-bounce" />
                  <span className="text-sm font-black font-mono">{currentGame.votes.toLocaleString()} Votes</span>
                </div>
              </div>
            </div>

            {/* Right Column: Title, Creator, Description, CTA Buttons */}
            <div className="flex-1 min-w-0 space-y-5 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-3.5 py-1 text-xs font-bold text-amber-300">
                <ShieldCheck size={14} className="text-amber-400" />
                Verified Community Experience
              </div>

              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-none drop-shadow-md">
                  {currentGame.name}
                </h1>
                <p className="text-sm sm:text-base text-amber-300/90 font-bold mt-2 flex items-center justify-center lg:justify-start gap-2">
                  <span>Created by <span className="text-white underline decoration-amber-500/50">{currentGame.creator}</span></span>
                </p>
              </div>

              <p className="text-zinc-300 text-sm sm:text-base leading-relaxed max-w-2xl line-clamp-3">
                {currentGame.description || `Experience "${currentGame.name}" by ${currentGame.creator}. Voted as one of Roblox's top candidate experiences by the community on BloxVote!`}
              </p>

              {/* Action Buttons Row */}
              <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-4">
                {/* Huge Vote Button */}
                <button
                  onClick={() => onVote(currentGame.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-8 py-4 text-base font-black transition-all shadow-xl active:scale-95',
                    hasVoted
                      ? 'bg-emerald-500/20 text-emerald-300 border-2 border-emerald-500/50 hover:bg-emerald-500/30'
                      : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black hover:from-amber-400 hover:to-yellow-300 shadow-amber-900/40 hover:shadow-amber-500/30'
                  )}
                >
                  {hasVoted ? (
                    <>
                      <Check size={22} className="stroke-[3]" />
                      <span>Voted for Experience</span>
                    </>
                  ) : (
                    <>
                      <ThumbsUp size={22} className="fill-black" />
                      <span>Cast Vote for Experience</span>
                    </>
                  )}
                </button>

                {/* Roblox Play Button */}
                <a
                  href={currentGame.robloxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-2xl border-2 border-zinc-700 bg-zinc-900/90 hover:bg-zinc-800 hover:border-zinc-500 px-6 py-4 text-base font-bold text-white transition-all shadow-lg active:scale-95"
                >
                  <Play size={20} className="fill-white text-white" />
                  <span>Play on Roblox</span>
                  <ExternalLink size={16} className="text-zinc-400 ml-1" />
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Thumbnails Carousel Strip if multiple featured games */}
          {featuredGames.length > 1 && (
            <div className="relative z-10 border-t border-amber-500/20 bg-zinc-950/80 backdrop-blur-md p-4 flex items-center justify-center gap-3 overflow-x-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-500/80 mr-2 shrink-0 hidden sm:inline">
                All Featured ({featuredGames.length}):
              </span>
              {featuredGames.map((game, idx) => (
                <button
                  key={game.id}
                  onClick={() => setSelectedIndex(idx)}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-2xl border p-2 text-left transition-all shrink-0',
                    idx === currentIndex
                      ? 'bg-amber-500/20 border-amber-500 shadow-md scale-105'
                      : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                  )}
                >
                  <img
                    src={game.imageUrl}
                    alt=""
                    className="h-10 w-10 rounded-xl object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="hidden md:block pr-2">
                    <p className="text-xs font-bold text-white truncate max-w-[120px]">{game.name}</p>
                    <p className="text-[10px] text-amber-400 font-mono">{game.votes} votes</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
