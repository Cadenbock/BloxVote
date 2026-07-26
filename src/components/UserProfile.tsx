import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, ThumbsUp, ExternalLink, Calendar, Mail, Flame, Award, Trash2, Zap, Sparkles, Coins, ShoppingBag, Palette } from 'lucide-react';
import { Game, UserStreakData, UserProfileData } from '../types';
import { getNameColorStyle, getBackgroundThemeStyle, getFontItemStyle, getTitleItemStyle } from '../lib/shopData';
import { User } from 'firebase/auth';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  games: Game[];
  userVotes: Record<string, boolean>;
  userStreak?: UserStreakData | null;
  profileData?: UserProfileData;
  onVote: (gameId: string) => Promise<void>;
  onOpenShop?: () => void;
}

export default function UserProfile({ 
  isOpen, 
  onClose, 
  user, 
  games, 
  userVotes, 
  userStreak,
  profileData,
  onVote,
  onOpenShop
}: UserProfileProps) {

  // Filter games that this user has voted for
  const votedGames = useMemo(() => {
    return games.filter(game => userVotes[game.id]);
  }, [games, userVotes]);

  // Calculate some fun profile stats
  const voteCount = votedGames.length;
  
  const streakCount = userStreak?.streakCount || 0;
  const highestStreak = userStreak?.highestStreak || 0;

  const streakBadge = useMemo(() => {
    if (streakCount === 0) return { title: 'No Active Streak', badge: '❄️', color: 'text-zinc-500 bg-zinc-800/40 border-zinc-700/40' };
    if (streakCount < 3) return { title: 'Ignited', badge: '🔥', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' };
    if (streakCount < 7) return { title: 'On Fire!', badge: '⚡', color: 'text-amber-400 bg-amber-500/10 border-amber-500/40' };
    if (streakCount < 14) return { title: 'Week Warrior', badge: '🛡️', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/40' };
    if (streakCount < 30) return { title: 'Streak Legend', badge: '👑', color: 'text-purple-400 bg-purple-500/10 border-purple-500/40' };
    return { title: 'Blox God', badge: '🌟', color: 'text-yellow-300 bg-yellow-500/20 border-yellow-400/50' };
  }, [streakCount]);

  
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
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
          className="relative w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl my-auto"
        >
          {/* Top colored accent line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 z-10" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 z-20 rounded-full border border-zinc-800 bg-zinc-900/90 p-2 sm:p-2.5 text-zinc-400 transition-all hover:bg-zinc-800 hover:text-white shadow-lg"
            aria-label="Close Profile"
          >
            <X size={16} className="sm:w-4 sm:h-4" />
          </button>

          {user ? (
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 sm:space-y-6">
              {/* User Header Details */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6 border-b border-zinc-900 pb-4 sm:pb-6 pr-10 sm:pr-8">
                <div className="relative shrink-0">
                  <img
                    src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
                    alt={user.displayName || 'Voter'}
                    referrerPolicy="no-referrer"
                    className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border-2 border-zinc-800 bg-zinc-900 object-cover"
                  />
                  <div className="absolute -bottom-1.5 -right-1.5 sm:-bottom-2 sm:-right-2 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-xl bg-blue-500 border-2 border-zinc-950 shadow-lg text-white">
                    <Award size={12} className="sm:w-3.5 sm:h-3.5" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {profileData?.equippedTitle && profileData.equippedTitle !== 'default' && (() => {
                      const titleStyle = getTitleItemStyle(profileData.equippedTitle);
                      return titleStyle.title ? (
                        <span className={`px-2 py-0.5 rounded text-xs font-black tracking-tight ${titleStyle.tagClass}`}>
                          {titleStyle.title}
                        </span>
                      ) : null;
                    })()}
                    <h2 className={`text-xl sm:text-2xl font-black tracking-tight truncate ${getNameColorStyle(profileData?.equippedColor).className}`}>
                      {user.displayName || 'Anonymous Voter'}
                    </h2>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider ${voterTier.color}`}>
                      {voterTier.title}
                    </span>
                  </div>

                  <p className="mt-1 text-xs sm:text-sm text-zinc-400 flex items-center gap-1.5 truncate">
                    <Mail size={13} className="text-zinc-600 shrink-0" />
                    <span className="truncate">{user.email || 'No public email'}</span>
                  </p>

                  <p className="mt-1 text-[11px] sm:text-xs text-zinc-500 flex items-center gap-1.5">
                    <Calendar size={12} className="text-zinc-700 shrink-0" />
                    Voter since {accountCreatedDate}
                  </p>
                </div>
              </div>

              {/* 🪙 BLOXCOINS & COSMETIC SUMMARY BAR */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 p-4 rounded-2xl border border-amber-500/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                    <Coins size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">BloxCoins Balance</div>
                    <div className="text-lg font-black text-white">
                      {(profileData?.coins || 0).toLocaleString()} Coins 🪙
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-400 text-[11px]">Equipped Font:</span>
                  <span 
                    style={{ fontFamily: getFontItemStyle(profileData?.equippedFont).fontFamily }}
                    className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-amber-300 font-semibold"
                  >
                    {getFontItemStyle(profileData?.equippedFont).name}
                  </span>
                </div>

                {onOpenShop && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenShop();
                    }}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-2 text-xs font-bold text-black hover:from-amber-400 hover:to-yellow-400 transition-all shadow-md active:scale-95 shrink-0"
                  >
                    <ShoppingBag size={15} />
                    Open Shop
                  </button>
                )}
              </div>

              {/* 🔥 VOTING STREAK PROMINENT BADGE & CARD */}
              <div className="relative rounded-2xl sm:rounded-3xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-zinc-900/70 p-4 sm:p-6 shadow-xl overflow-visible">
                {/* Background Ambient Flame Icon */}
                <div className="absolute right-2 bottom-0 text-orange-500/10 pointer-events-none overflow-hidden rounded-3xl inset-0 flex justify-end items-end p-2">
                  <Flame size={90} className="sm:w-[110px] sm:h-[110px]" />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 relative z-10">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-lg shadow-orange-900/40 shrink-0">
                      <Flame size={24} className="sm:w-7 sm:h-7 animate-pulse" />
                      {streakCount > 0 && (
                        <div className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-amber-400 text-black text-[10px] sm:text-[11px] font-black border-2 border-zinc-950 shadow-md">
                          {streakCount}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-400">Voting Streak</span>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${streakBadge.color}`}>
                          <span>{streakBadge.badge}</span>
                          <span>{streakBadge.title}</span>
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5 flex items-center gap-2">
                        {streakCount} {streakCount === 1 ? 'Day' : 'Consecutive Days'}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 sm:mt-1 max-w-sm leading-relaxed">
                        {streakCount > 0 
                          ? `Vote every day to keep your flame burning! Highest streak: ${highestStreak} days.`
                          : 'Vote on any game today to start your consecutive day voting streak!'}
                      </p>
                    </div>
                  </div>

                  {/* Streak Progress Pill */}
                  <div className="flex items-center gap-2 rounded-xl sm:rounded-2xl bg-zinc-950/90 border border-zinc-800 px-3 py-2 sm:px-4 sm:py-3 shrink-0 self-start sm:self-auto shadow-md">
                    <Zap size={16} className="text-amber-400 fill-amber-400 shrink-0" />
                    <div>
                      <p className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Best Record</p>
                      <p className="text-xs sm:text-sm font-black text-amber-300 font-mono">{highestStreak} Days</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics Panel */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-zinc-900 bg-zinc-900/30 p-4">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <ThumbsUp size={14} className="text-emerald-500" />
                    <span className="text-xs font-bold uppercase tracking-wider">Total Cast Votes</span>
                  </div>
                  <p className="text-3xl font-black text-white mt-1.5">{voteCount}</p>
                </div>

                <div className="rounded-2xl border border-zinc-900 bg-zinc-900/30 p-4">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <Flame size={14} className="text-orange-500" />
                    <span className="text-xs font-bold uppercase tracking-wider">Favorite Creator</span>
                  </div>
                  <p className="text-lg font-bold text-zinc-200 mt-2 truncate">{creatorLoyalty}</p>
                </div>
              </div>

              {/* Voted Games Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <Trophy size={14} className="text-yellow-500" />
                    Your Vote History
                  </h3>
                  <span className="text-xs font-mono text-zinc-500">
                    {voteCount} active vote{voteCount !== 1 && 's'}
                  </span>
                </div>

                {/* Voted Games List */}
                <div className="space-y-2.5">
                  {votedGames.length > 0 ? (
                    votedGames.map((game) => (
                      <div
                        key={game.id}
                        className="group flex items-center gap-4 rounded-2xl border border-zinc-900 bg-zinc-900/20 p-3 hover:border-zinc-800 hover:bg-zinc-900/40 transition-all"
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
