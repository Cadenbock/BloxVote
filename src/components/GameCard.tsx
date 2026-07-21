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
    const creatorLower = game.creator.toLowerCase();
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden rounded-2xl bg-zinc-900/50 border border-zinc-800 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900/80"
    >
      {rank !== undefined && (
        <div className="absolute top-0 left-0 z-10 flex h-10 w-10 items-center justify-center rounded-br-2xl bg-blue-600 font-bold text-white shadow-lg">
          #{rank}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative h-48 w-full shrink-0 overflow-hidden rounded-xl sm:h-32 sm:w-32 bg-zinc-950">
          <img
            src={game.imageUrl}
            alt={game.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        <div className="flex flex-1 flex-col justify-between py-1">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                {game.name}
              </h3>
              <div className="flex items-center gap-1">
                {onDelete && (
                  <div className="flex items-center gap-1 bg-zinc-950/40 rounded-full px-2 py-1 border border-zinc-800">
                    <AnimatePresence mode="popLayout">
                      {isConfirmingDelete ? (
                        <motion.div
                          key="confirm"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-2"
                        >
                          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider pl-1 select-none">
                            Remove?
                          </span>
                          <button
                            onClick={() => {
                              onDelete(game.id);
                              setIsConfirmingDelete(false);
                            }}
                            className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-rose-500 transition-all"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setIsConfirmingDelete(false)}
                            className="rounded-full bg-zinc-850 px-2 py-0.5 text-[10px] font-bold text-zinc-400 hover:bg-zinc-750 hover:text-white transition-all"
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
                          <Trash2 size={16} />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                <a
                  href={game.robloxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all"
                  title="View on Roblox"
                >
                  <ExternalLink size={18} />
                </a>
              </div>
            </div>
            <p className="mt-1 text-sm text-zinc-400 line-clamp-2">
              {game.description || "No description provided."}
            </p>
            <p className="mt-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              By{' '}
              <a
                href={getCreatorUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 hover:underline transition-colors font-bold inline-flex items-center gap-0.5"
                title={`Visit ${game.creator} on Roblox`}
              >
                {game.creator}
              </a>
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 items-center gap-2 rounded-full bg-zinc-800/50 px-4 border border-zinc-700/50">
                <span className={`text-lg font-bold transition-colors ${hasVoted ? 'text-emerald-400' : 'text-blue-400'}`}>
                  {game.votes.toLocaleString()}
                </span>
                <span className="text-xs font-medium text-zinc-500 uppercase">Votes</span>
              </div>
            </div>

            <div className="relative">
              {/* Floating +1 / -1 Bubbles */}
              <AnimatePresence>
                {bubbles.map((b) => (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 1, y: 0, x: b.offsetX, scale: 0.8 }}
                    animate={{ opacity: 0, y: -60, scale: 1.4 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className={`absolute z-30 -top-6 left-1/2 -translate-x-1/2 pointer-events-none select-none font-extrabold text-lg ${b.colorClass}`}
                  >
                    {b.text}
                  </motion.div>
                ))}
              </AnimatePresence>

              <motion.button
                onClick={handleVoteClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 rounded-full px-6 py-2 font-bold transition-all active:scale-95 ${
                  hasVoted 
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 hover:bg-emerald-500/25 hover:text-emerald-300 shadow-[0_2px_12px_rgba(16,185,129,0.15)]' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-[0_4px_16px_rgba(37,99,235,0.25)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.4)]'
                }`}
              >
                {hasVoted ? (
                  <>
                    <Check size={18} className="text-emerald-400 stroke-[3]" />
                    Voted
                  </>
                ) : (
                  <>
                    <ThumbsUp size={16} className="text-blue-100" />
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
