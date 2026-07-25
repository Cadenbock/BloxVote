import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ThumbsUp, ExternalLink, Check, Trash2, TrendingUp } from 'lucide-react';
import { Game } from '../types';

interface GameCardProps {
  game: Game;
  onVote: (gameId: string) => void;
  hasVoted: boolean;
  onDelete?: (gameId: string) => void;
  rank?: number;
  key?: React.Key;
}

interface FloatingBubble {
  id: number;
  text: string;
  colorClass: string;
  offsetX: number;
}

export default function GameCard({ game, onVote, hasVoted, onDelete, rank }: GameCardProps) {
  const [bubbles, setBubbles] = useState<FloatingBubble[]>([]);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const getCreatorUrl = () => {
    if (game.creatorId) {
      if (game.creatorType === 'Group' || game.creatorType === 'group') {
        return `https://www.roblox.com/groups/${game.creatorId}`;
      }
      return `https://www.roblox.com/users/${game.creatorId}/profile`;
    }

    // Static mappings for seeded games or common creators
    const creatorLower = (game.creator || '').toLowerCase();
    if (creatorLower.includes('dreamcraft')) {
      return 'https://www.roblox.com/groups/2914101/DreamCraft';
    }
    if (creatorLower.includes('wolfpaq')) {
      return 'https://www.roblox.com/users/45598637/profile';
    }
    if (creatorLower.includes('gamer robot')) {
      return 'https://www.roblox.com/groups/4356811/Gamer-Robot-Inc';
    }

    return `https://www.roblox.com/search/users?keyword=${encodeURIComponent(game.creator)}`;
  };

  const handleVoteClick = () => {
    // 1. Trigger the actual vote callback
    onVote(game.id);

    // 2. Add floating +1 or -1 bubble
    const id = Date.now() + Math.random();
    const newBubble: FloatingBubble = {
      id,
      text: hasVoted ? '-1' : '+1',
      colorClass: hasVoted 
        ? 'text-rose-500 drop-shadow-[0_2px_8px_rgba(244,63,94,0.6)]' 
        : 'text-blue-400 drop-shadow-[0_2px_8px_rgba(59,130,246,0.6)]',
      offsetX: Math.random() * 40 - 20,
    };

    setBubbles(prev => [...prev, newBubble]);

    // 3. Clear after 800ms
    setTimeout(() => {
      setBubbles(prev => prev.filter(b => b.id !== id));
    }, 800);
  };

  return (
    <motion.div
      layout
      transition={{
        layout: { type: 'spring', stiffness: 220, damping: 26, mass: 0.8 },
        opacity: { duration: 0.2 }
      }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="group relative overflow-hidden rounded-2xl bg-zinc-900/50 border border-zinc-800 p-3.5 sm:p-4 transition-colors duration-200 hover:border-zinc-700 hover:bg-zinc-900/80 shadow-lg min-w-0"
    >
      {rank !== undefined && (
        <div className="absolute top-0 left-0 z-10 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-br-2xl bg-blue-600 font-extrabold text-white text-xs sm:text-sm shadow-lg overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.span
              key={rank}
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 8, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              #{rank}
            </motion.span>
          </AnimatePresence>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 min-w-0">
        <div className="relative h-44 w-full sm:h-28 sm:w-28 md:h-32 md:w-32 shrink-0 overflow-hidden rounded-xl bg-zinc-950">
          <img
            src={game.imageUrl}
            alt={game.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        <div className="flex flex-1 flex-col justify-between min-w-0 overflow-hidden py-0.5">
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-1.5 min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1 min-w-0 break-words pr-1">
                {game.name}
              </h3>
              <div className="flex items-center gap-1 shrink-0">
                {onDelete && (
                  <div className="flex items-center gap-1 bg-zinc-950/40 rounded-full px-1.5 py-0.5 border border-zinc-800">
                    <AnimatePresence mode="popLayout">
                      {isConfirmingDelete ? (
                        <motion.div
                          key="confirm"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-1.5"
                        >
                          <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider pl-1 select-none">
                            Del?
                          </span>
                          <button
                            onClick={() => {
                              onDelete(game.id);
                              setIsConfirmingDelete(false);
                            }}
                            className="rounded-full bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold text-white hover:bg-rose-500 transition-all"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setIsConfirmingDelete(false)}
                            className="rounded-full bg-zinc-850 px-1.5 py-0.5 text-[9px] font-bold text-zinc-400 hover:bg-zinc-750 hover:text-white transition-all"
                          >
                            No
                          </button>
                        </motion.div>
                      ) : (
                        <motion.button
                          key="trash"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setIsConfirmingDelete(true)}
                          className="rounded-full p-1 text-rose-500 hover:bg-rose-500/10 transition-all"
                          title="Remove Game"
                        >
                          <Trash2 size={15} />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                <a
                  href={game.robloxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all shrink-0"
                  title="View on Roblox"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
            <p className="mt-1 text-xs text-zinc-400 line-clamp-2 leading-relaxed break-words min-w-0">
              {game.description || "No description provided."}
            </p>
            <p className="mt-1.5 text-[11px] sm:text-xs font-medium text-zinc-500 uppercase tracking-wider truncate min-w-0">
              By{' '}
              <a
                href={getCreatorUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 hover:underline transition-colors font-bold inline-flex items-center gap-0.5 truncate"
                title={`Visit ${game.creator} on Roblox`}
              >
                {game.creator}
              </a>
            </p>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 min-w-0 w-full">
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex h-9 items-center gap-1.5 rounded-full bg-zinc-800/60 px-3 border border-zinc-700/50">
                <motion.span 
                  key={game.votes}
                  initial={{ scale: 1.25 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className={`text-xs sm:text-sm font-extrabold transition-colors ${hasVoted ? 'text-emerald-400' : 'text-blue-400'}`}
                >
                  {game.votes.toLocaleString()}
                </motion.span>
                <span className="text-[10px] sm:text-xs font-medium text-zinc-500 uppercase">Votes</span>
              </div>
            </div>

            <div className="relative shrink-0">
              {/* Floating +1 / -1 Bubbles */}
              <AnimatePresence>
                {bubbles.map((b) => (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 1, y: 0, x: b.offsetX, scale: 0.8 }}
                    animate={{ opacity: 0, y: -60, scale: 1.4 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className={`absolute z-30 -top-6 left-1/2 -translate-x-1/2 pointer-events-none select-none font-extrabold text-base ${b.colorClass}`}
                  >
                    {b.text}
                  </motion.div>
                ))}
              </AnimatePresence>

              <motion.button
                onClick={handleVoteClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-1.5 rounded-full px-4 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold transition-all active:scale-95 shrink-0 ${
                  hasVoted 
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 hover:bg-emerald-500/25 hover:text-emerald-300 shadow-[0_2px_12px_rgba(16,185,129,0.15)]' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-[0_4px_16px_rgba(37,99,235,0.25)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.4)]'
                }`}
              >
                {hasVoted ? (
                  <>
                    <Check size={16} className="text-emerald-400 stroke-[3]" />
                    Voted
                  </>
                ) : (
                  <>
                    <ThumbsUp size={14} className="text-blue-100" />
                    Vote
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
