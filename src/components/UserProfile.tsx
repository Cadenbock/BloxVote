import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, ThumbsUp, ExternalLink, Calendar, Mail, Flame, Award, Trash2 } from 'lucide-react';
import { Game } from '../types';
import { User } from 'firebase/auth';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  games: Game[];
  userVotes: Record<string, boolean>;
  onVote: (gameId: string) => Promise<void>;
}

export default function UserProfile({ 
  isOpen, 
  onClose, 
  user, 
  games, 
  userVotes, 
  onVote 
}: UserProfileProps) {

  // Filter games that this user has voted for
  const votedGames = useMemo(() => {
    return games.filter(game => userVotes[game.id]);
  }, [games, userVotes]);

  // Calculate some fun profile stats
  const voteCount = votedGames.length;
  
  const creatorLoyalty = useMemo(() => {
    if (votedGames.length === 0) return 'None';
    const creators = votedGames.map(g => g.creator);
    const counts: Record<string, number> = {};
    let maxCreator = creators[0];
    let maxCount = 0;
    
    creators.forEach(c => {
      counts[c] = (counts[c] || 0) + 1;
      if (counts[c] > maxCount) {
        maxCount = counts[c];
        maxCreator = c;
      }
    });
    
    return maxCount > 1 ? `${maxCreator} (${maxCount} votes)` : maxCreator;
  }, [votedGames]);

  const accountCreatedDate = useMemo(() => {
    if (!user?.metadata?.creationTime) return 'Recent Joiner';
    try {
      const d = new Date(user.metadata.creationTime);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return 'Active Member';
    }
  }, [user]);

  // Determine user rank/tier based on vote count
  const voterTier = useMemo(() => {
    if (voteCount === 0) return { title: 'New Scout', color: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20' };
    if (voteCount <= 2) return { title: 'Active Voter', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' };
    if (voteCount <= 5) return { title: 'Experience Critic', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' };
    return { title: 'Blox Legend', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' };
  }, [voteCount]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl md:p-8"
        >
          {/* Top colored accent line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 rounded-full border border-zinc-800 bg-zinc-900/80 p-2 text-zinc-400 transition-all hover:bg-zinc-800 hover:text-white"
          >
            <X size={18} />
          </button>

          {user ? (
            <div className="flex flex-col h-full max-h-[80vh]">
              {/* User Header Details */}
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6 border-b border-zinc-900 pb-6">
                <div className="relative shrink-0">
                  <img
                    src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
                    alt={user.displayName || 'Voter'}
                    referrerPolicy="no-referrer"
                    className="h-20 w-20 rounded-2xl border-2 border-zinc-800 bg-zinc-900 object-cover"
                  />
                  <div className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500 border-2 border-zinc-950 shadow-lg text-white">
                    <Award size={14} />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-black text-white tracking-tight truncate">
                      {user.displayName || 'Anonymous Voter'}
                    </h2>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${voterTier.color}`}>
                      {voterTier.title}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-zinc-400 flex items-center gap-1.5 truncate">
                    <Mail size={14} className="text-zinc-600" />
                    {user.email || 'No public email'}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500 flex items-center gap-1.5">
                    <Calendar size={13} className="text-zinc-700" />
                    Voter since {accountCreatedDate}
                  </p>
                </div>
              </div>

              {/* Statistics Panel */}
              <div className="grid grid-cols-2 gap-4 my-6">
                <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-4">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <ThumbsUp size={14} className="text-emerald-500" />
                    <span className="text-xs font-bold uppercase tracking-wider">Total Cast Votes</span>
                  </div>
                  <p className="text-3xl font-black text-white mt-1.5">{voteCount}</p>
                </div>

                <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-4">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <Flame size={14} className="text-orange-500" />
                    <span className="text-xs font-bold uppercase tracking-wider">Favorite Creator</span>
                  </div>
                  <p className="text-lg font-bold text-zinc-200 mt-2 truncate">{creatorLoyalty}</p>
                </div>
              </div>

              {/* Voted Games Title */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <Trophy size={14} className="text-yellow-500" />
                  Your Vote History
                </h3>
                <span className="text-xs font-mono text-zinc-500">
                  {voteCount} active vote{voteCount !== 1 && 's'}
                </span>
              </div>

              {/* Voted Games List (Scrollable) */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-[35vh]">
                {votedGames.length > 0 ? (
                  votedGames.map((game) => (
                    <div
                      key={game.id}
                      className="group flex items-center gap-4 rounded-2xl border border-zinc-900 bg-zinc-900/10 p-3 hover:border-zinc-800 hover:bg-zinc-900/30 transition-all"
                    >
                      {/* Game cover thumbnail */}
                      <img
                        src={game.imageUrl}
                        alt={game.name}
                        referrerPolicy="no-referrer"
                        className="h-12 w-12 rounded-xl object-cover border border-zinc-850 bg-zinc-950 shrink-0"
                      />

                      {/* Game metadata */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                          {game.name}
                        </h4>
                        <p className="text-xs text-zinc-500 truncate mt-0.5">
                          by {game.creator}
                        </p>
                      </div>

                      {/* Vote indicator badge */}
                      <div className="text-right shrink-0 mr-1 hidden sm:block">
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1 flex items-center gap-1.5">
                          <ThumbsUp size={10} />
                          Voted
                        </span>
                      </div>

                      {/* Retract / Play controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={game.robloxUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                          title="Play Experience"
                        >
                          <ExternalLink size={14} />
                        </a>
                        <button
                          onClick={() => onVote(game.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-all"
                          title="Retract Vote"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-dashed border-zinc-900">
                    <ThumbsUp size={32} className="text-zinc-700 mb-2" />
                    <p className="text-sm text-zinc-400 font-semibold">No Votes Cast</p>
                    <p className="text-xs text-zinc-500 mt-1 max-w-[250px]">
                      Check out the Leaderboard and click the thumbs up to back your favorite Roblox games!
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-14 w-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-4">
                <X size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Access Denied</h2>
              <p className="text-sm text-zinc-500 mt-2 max-w-sm">
                You must be logged in to view your profile and voting history.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
