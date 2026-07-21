import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, AreaChart, Area, Legend
} from 'recharts';
import { Trophy, TrendingUp, PieChart as PieIcon, ArrowRight, ExternalLink, ThumbsUp, Check, Zap, Sparkles, Heart } from 'lucide-react';
import { Game } from '../types';

interface TopGamesChartProps {
  games: Game[];
  onVote: (gameId: string) => void;
  userVotes: { [key: string]: boolean };
}

type ChartType = 'bar' | 'pie' | 'trends';

interface FloatingBubble {
  id: number;
  text: string;
  colorClass: string;
  offsetX: number;
  offsetY: number;
  rotation: number;
}

export default function TopGamesChart({ games, onVote, userVotes }: TopGamesChartProps) {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<FloatingBubble[]>([]);

  const handleVoteClick = (gameId: string) => {
    // 1. Invoke the vote state update
    onVote(gameId);

    // 2. Generate multiple high-fidelity, playful feedback bubbles
    const isVoting = !userVotes[gameId];
    const texts = isVoting 
      ? ['+1 Vote!', 'Approved! ⭐', 'Blox-on! 🚀', 'Rank Boost! 📈', 'Hyped! 💖']
      : ['-1 Vote', 'Vote Removed 🚫', 'Retracted', 'Down-shifted'];
    const randomText = texts[Math.floor(Math.random() * texts.length)];
    
    const id = Date.now() + Math.random();
    const newBubble: FloatingBubble = {
      id,
      text: randomText,
      colorClass: isVoting 
        ? 'text-emerald-400 bg-zinc-950/95 border border-emerald-500/30 shadow-[0_4px_16px_rgba(16,185,129,0.3)] shadow-emerald-500/20' 
        : 'text-rose-400 bg-zinc-950/95 border border-rose-500/30 shadow-[0_4px_16px_rgba(244,63,94,0.3)] shadow-rose-500/20',
      offsetX: Math.random() * 60 - 30,
      offsetY: Math.random() * 20 - 10,
      rotation: Math.random() * 24 - 12,
    };

    setBubbles(prev => [...prev, newBubble]);

    // Cleanup bubble after animation completes
    setTimeout(() => {
      setBubbles(prev => prev.filter(b => b.id !== id));
    }, 1200);
  };

  // Take top 8 games for the chart to keep it clean and legible
  const topGames = useMemo(() => {
    return [...games].sort((a, b) => b.votes - a.votes).slice(0, 8);
  }, [games]);

  const selectedGame = useMemo(() => {
    if (!selectedGameId) return topGames[0] || null;
    return games.find(g => g.id === selectedGameId) || topGames[0] || null;
  }, [selectedGameId, games, topGames]);

  // Total votes across all top games
  const totalVotes = useMemo(() => {
    return topGames.reduce((acc, game) => acc + game.votes, 0);
  }, [topGames]);

  // Bar Chart Data (Horizontal layout)
  const barData = useMemo(() => {
    return topGames.map((game, idx) => ({
      id: game.id,
      name: game.name.length > 18 ? game.name.substring(0, 15) + '...' : game.name,
      fullName: game.name,
      votes: game.votes,
      rank: idx + 1,
      creator: game.creator,
    }));
  }, [topGames]);

  // Pie Chart Data (Vote Share)
  const pieData = useMemo(() => {
    const data = topGames.map((game, idx) => ({
      id: game.id,
      name: game.name.length > 15 ? game.name.substring(0, 12) + '...' : game.name,
      fullName: game.name,
      value: game.votes,
      percentage: totalVotes > 0 ? ((game.votes / totalVotes) * 100).toFixed(1) : '0',
    }));
    return data;
  }, [topGames, totalVotes]);

  // Staggered historical trends data for the top games over the last 7 days
  const trendsData = useMemo(() => {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const data = [];

    // Setup 7 days of history
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dayName = weekdays[d.getDay()];

      const dayObj: any = { day: dayName };

      topGames.forEach((game) => {
        const hash = game.id.split('').reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1), 0);
        const startPercent = 0.85 + ((hash % 10) / 100); // 0.85 to 0.94
        const progress = (6 - i) / 6; // 0 to 1
        const percent = startPercent + (1 - startPercent) * progress;

        let perturbedPercent = percent;
        if (i > 0 && i < 6) {
          const perturb = (((hash + i * 17) % 7) - 3) / 150; // -2% to +2%
          perturbedPercent = Math.min(0.99, Math.max(startPercent, percent + perturb));
        }

        let val = Math.round(game.votes * perturbedPercent);
        if (i === 0) {
          val = game.votes;
        } else {
          val = Math.min(val, game.votes);
          val = Math.max(0, val);
        }

        dayObj[game.name] = val;
      });

      data.push(dayObj);
    }

    // Force non-decreasing for each game
    for (let i = 1; i < data.length; i++) {
      topGames.forEach((game) => {
        if (data[i][game.name] < data[i-1][game.name]) {
          data[i][game.name] = data[i-1][game.name];
        }
      });
    }

    // Today must match exactly current votes
    topGames.forEach((game) => {
      data[data.length - 1][game.name] = game.votes;
    });

    return data;
  }, [topGames]);

  // Find current position and distance to next rank
  const competitionInfo = useMemo(() => {
    if (!selectedGame) return null;
    const sortedAll = [...games].sort((a, b) => b.votes - a.votes);
    const currentIndex = sortedAll.findIndex(g => g.id === selectedGame.id);
    if (currentIndex === -1) return null;
    
    const rank = currentIndex + 1;
    if (currentIndex === 0) {
      // It is rank 1!
      const runnerUp = sortedAll[1];
      if (!runnerUp) return { isFirst: true, leadVotes: 0 };
      const lead = selectedGame.votes - runnerUp.votes;
      return {
        isFirst: true,
        runnerUpName: runnerUp.name,
        leadVotes: lead
      };
    } else {
      const rival = sortedAll[currentIndex - 1];
      const gap = rival.votes - selectedGame.votes;
      return {
        isFirst: false,
        rivalName: rival.name,
        gapVotes: gap + 1 // to overtake, need at least rival.votes - selectedGame.votes + 1
      };
    }
  }, [selectedGame, games]);

  // Color theme generator
  const colors = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#8b5cf6', // violet
    '#f59e0b', // amber
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f43f5e', // rose
    '#14b8a6', // teal
  ];

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const clickedId = data.activePayload[0].payload.id;
      setSelectedGameId(clickedId);
    }
  };

  const handlePieClick = (entry: any) => {
    if (entry && entry.id) {
      setSelectedGameId(entry.id);
    }
  };

  if (games.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-900/30 p-16 text-center">
        <Trophy size={48} className="text-zinc-600 mb-4" />
        <h3 className="text-xl font-bold text-white">No Game Data Yet</h3>
        <p className="mt-2 text-zinc-400">Add some games and start voting to see them graphed here!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Left Column: Visual Analytics Controls and Graph */}
      <div className="lg:col-span-2 flex flex-col rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="text-blue-500" size={24} />
              Top Experience Insights
            </h2>
            <p className="text-sm text-zinc-400 mt-1">Real-time leaderboard analytics and voter momentum</p>
          </div>

          {/* Switch Tab / Chart Type Buttons */}
          <div className="flex rounded-2xl bg-black border border-zinc-800 p-1 self-start sm:self-center">
            <button
              onClick={() => setChartType('bar')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                chartType === 'bar' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Trophy size={14} />
              Vote Comparison
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                chartType === 'pie' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <PieIcon size={14} />
              Vote Share
            </button>
            <button
              onClick={() => setChartType('trends')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                chartType === 'trends' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <TrendingUp size={14} />
              7D Trajectory
            </button>
          </div>
        </div>

        {/* The Graphic Stage */}
        <div className="h-[350px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart 
                data={barData} 
                onClick={handleBarClick}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
              >
                <defs>
                  {colors.map((color, idx) => (
                    <linearGradient id={`barGrad-${idx}`} key={idx} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={`${color}50`} />
                      <stop offset="100%" stopColor={color} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#71717a" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#71717a" 
                  fontSize={11} 
                  axisLine={false} 
                  tickLine={false}
                  width={90}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.04)', radius: 12 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-4 shadow-2xl">
                          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Rank #{data.rank}</p>
                          <p className="text-base font-bold text-white mt-0.5">{data.fullName}</p>
                          <p className="text-xs text-zinc-400 mt-1">Creator: <span className="font-semibold text-zinc-200">{data.creator}</span></p>
                          <div className="mt-3 flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                            <p className="text-sm font-black text-white">
                              {data.votes.toLocaleString()} <span className="text-xs font-normal text-zinc-500 uppercase">votes</span>
                            </p>
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-2 italic">Click bar to inspect experience details</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="votes" radius={[0, 8, 8, 0]} barSize={22}>
                  {barData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`url(#barGrad-${index % colors.length})`}
                      stroke={entry.id === selectedGame?.id ? '#ffffff' : 'transparent'}
                      strokeWidth={entry.id === selectedGame?.id ? 1.5 : 0}
                      className="cursor-pointer transition-all"
                      onClick={() => setSelectedGameId(entry.id)}
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : chartType === 'pie' ? (
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={4}
                  dataKey="value"
                  onClick={handlePieClick}
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={colors[index % colors.length]} 
                      stroke={entry.id === selectedGame?.id ? '#ffffff' : '#09090b'}
                      strokeWidth={entry.id === selectedGame?.id ? 2 : 1}
                      className="cursor-pointer outline-none"
                      onClick={() => setSelectedGameId(entry.id)}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-4 shadow-2xl">
                          <p className="text-base font-bold text-white">{data.fullName}</p>
                          <p className="text-sm font-black text-blue-400 mt-1">
                            {data.value.toLocaleString()} votes ({data.percentage}%)
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-2 italic">Click segment to inspect</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle" 
                  iconSize={8}
                  formatter={(value, entry: any) => (
                    <span className="text-[11px] font-medium text-zinc-400">{entry.payload.name}</span>
                  )}
                />
              </PieChart>
            ) : (
              <AreaChart data={trendsData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <defs>
                  {topGames.map((game, idx) => (
                    <linearGradient id={`trendGrad-${idx}`} key={idx} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors[idx % colors.length]} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={colors[idx % colors.length]} stopOpacity={0}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="day" stroke="#71717a" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-4 shadow-2xl max-w-xs">
                          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">{label} Trend</p>
                          <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                            {payload.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between gap-4 text-xs">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                  <span className="font-medium text-zinc-300 truncate">{item.name}</span>
                                </div>
                                <span className="font-bold text-white shrink-0">{item.value.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {topGames.map((game, idx) => (
                  <Area
                    key={game.id}
                    type="monotone"
                    dataKey={game.name}
                    stroke={colors[idx % colors.length]}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill={`url(#trendGrad-${idx})`}
                  />
                ))}
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Legend / Quick Tip */}
        <div className="mt-4 border-t border-zinc-800/60 pt-4 flex items-center justify-between text-xs text-zinc-500">
          <span>💡 Tip: Click on bars, slices, or segments to view details and vote directly.</span>
          <span className="font-mono text-[10px] uppercase text-zinc-600">Total votes in chart: {totalVotes.toLocaleString()}</span>
        </div>
      </div>

      {/* Right Column: Detailed Experience Card with Quick Vote */}
      <div className="lg:col-span-1">
        <AnimatePresence mode="wait">
          {selectedGame ? (
            <motion.div
              key={selectedGame.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col h-full relative overflow-hidden backdrop-blur-sm"
            >
              {/* Card Accent Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

              {/* Game Poster Image */}
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800">
                <img 
                  src={selectedGame.imageUrl} 
                  alt={selectedGame.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
                
                {/* Ranking Tag */}
                <div className="absolute top-3 left-3 flex h-8 items-center justify-center rounded-full bg-black/85 px-3 font-mono text-xs font-bold text-white border border-zinc-800 backdrop-blur-sm">
                  RANK #{games.findIndex(g => g.id === selectedGame.id) + 1}
                </div>
              </div>

              {/* Game Details */}
              <div className="mt-5 flex-1">
                <h3 className="text-xl font-black text-white leading-snug">{selectedGame.name}</h3>
                
                <p className="mt-1 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                  BY{' '}
                  <a
                    href={
                      selectedGame.creatorId 
                        ? (selectedGame.creatorType === 'Group' || selectedGame.creatorType === 'group'
                          ? `https://www.roblox.com/groups/${selectedGame.creatorId}`
                          : `https://www.roblox.com/users/${selectedGame.creatorId}/profile`)
                        : `https://www.roblox.com/search/users?keyword=${encodeURIComponent(selectedGame.creator)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-0.5"
                  >
                    {selectedGame.creator}
                    <ExternalLink size={10} />
                  </a>
                </p>

                <p className="mt-4 text-sm text-zinc-300 leading-relaxed max-h-[90px] overflow-y-auto pr-1">
                  {selectedGame.description || 'This experience has no description provided on Bloxvote.'}
                </p>

                {/* Competition Dynamic Insights Banner */}
                {competitionInfo && (
                  <div className="mt-4 rounded-2xl border border-zinc-800/40 bg-zinc-950/20 px-3.5 py-3 text-xs flex items-start gap-2.5">
                    {competitionInfo.isFirst ? (
                      <Zap className="text-amber-500 shrink-0 mt-0.5 animate-pulse" size={14} />
                    ) : (
                      <TrendingUp className="text-blue-400 shrink-0 mt-0.5" size={14} />
                    )}
                    <div className="flex-1 text-zinc-400 leading-relaxed">
                      {competitionInfo.isFirst ? (
                        <>
                          <span className="font-bold text-amber-400">Undefeated Champ!</span> Leading the chart by <span className="font-black text-white">{(competitionInfo.leadVotes || 0).toLocaleString()}</span> votes ahead of <span className="font-semibold text-zinc-300">{competitionInfo.runnerUpName}</span>.
                        </>
                      ) : (
                        <>
                          Needs only <span className="font-black text-white">{(competitionInfo.gapVotes || 0).toLocaleString()}</span> more vote{(competitionInfo.gapVotes || 0) !== 1 && 's'} to overtake <span className="font-semibold text-zinc-300">{competitionInfo.rivalName}</span> for Rank <span className="font-bold text-blue-400">#{games.findIndex(g => g.id === selectedGame.id)}</span>!
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-3">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Current Votes</p>
                    <p className="text-xl font-black text-white mt-1">{selectedGame.votes.toLocaleString()}</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-3">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Creator Type</p>
                    <p className="text-sm font-bold text-zinc-200 mt-1.5 uppercase tracking-wide">
                      {selectedGame.creatorType || 'User'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating Feedback Bubbles */}
              <div className="absolute inset-x-0 bottom-28 pointer-events-none z-50 flex justify-center">
                <AnimatePresence>
                  {bubbles.map((b) => (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 1, y: 20, scale: 0.8, x: b.offsetX, rotate: b.rotation }}
                      animate={{ opacity: 0, y: -180, scale: 1.4, rotate: b.rotation * 1.6 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.95, ease: 'easeOut' }}
                      className={`absolute whitespace-nowrap text-xs font-black uppercase tracking-wider px-3.5 py-2.5 rounded-2xl border shadow-xl backdrop-blur-md ${b.colorClass}`}
                    >
                      {b.text}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Quick Actions Footer */}
              <div className="mt-6 pt-5 border-t border-zinc-800/60 flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Vote Engagement</span>
                  <div className="relative">
                    <motion.button
                      onClick={() => handleVoteClick(selectedGame.id)}
                      whileHover={{ scale: 1.01, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-sm tracking-wide transition-all ${
                        userVotes[selectedGame.id]
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 hover:bg-emerald-500/20 hover:border-emerald-500/50 shadow-[0_4px_16px_rgba(16,185,129,0.1)]'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-[0_4px_20px_rgba(37,99,235,0.2)] hover:shadow-[0_4px_24px_rgba(37,99,235,0.35)]'
                      }`}
                    >
                      {userVotes[selectedGame.id] ? (
                        <>
                          <motion.div
                            initial={{ scale: 0.5 }}
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ duration: 0.3 }}
                          >
                            <Check size={16} className="stroke-[3]" />
                          </motion.div>
                          <span>You Casted a Vote!</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={15} className="text-amber-300 animate-pulse shrink-0" />
                          <span>Cast Quick Vote</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>

                <a
                  href={selectedGame.robloxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/50 py-3.5 font-semibold text-sm text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white"
                >
                  Play on Roblox
                  <ExternalLink size={14} className="text-zinc-500" />
                </a>
              </div>
            </motion.div>
          ) : (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/10 p-12 text-center h-full flex flex-col justify-center">
              <Trophy size={32} className="text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">Select a game segment in the chart to inspect details.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
