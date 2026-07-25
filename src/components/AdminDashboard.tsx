import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import {
  Shield,
  Gamepad2,
  ThumbsUp,
  Users,
  Star,
  Trash2,
  Plus,
  UserPlus,
  UserMinus,
  Activity as ActivityIcon,
  Search,
  ExternalLink,
  BarChart3,
  X,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Clock,
  Megaphone
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { db, auth } from '../firebase';
import { Game, Activity, AdminUser } from '../types';
import { useToast } from './Toast';
import { logActivity } from '../lib/activity';
import { cn } from '../lib/utils';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  games: Game[];
  onVote: (gameId: string) => Promise<void>;
}

type AdminTab = 'overview' | 'games' | 'announcement' | 'admins' | 'activity';

export default function AdminDashboard({ isOpen, onClose, games, onVote }: AdminDashboardProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [searchGameQuery, setSearchGameQuery] = useState('');
  
  // Global Announcement state
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementEnabled, setAnnouncementEnabled] = useState(false);
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);
  const [announcementUpdatedAt, setAnnouncementUpdatedAt] = useState<any>(null);
  const [announcementUpdatedBy, setAnnouncementUpdatedBy] = useState<string>('');

  // Modal states
  const [deletingGame, setDeletingGame] = useState<Game | null>(null);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminUid, setNewAdminUid] = useState('');
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
  const [removingAdmin, setRemovingAdmin] = useState<AdminUser | null>(null);

  const currentUser = auth.currentUser;
  const SUPER_ADMIN_EMAIL = 'mondo7108@gmail.com';

  // Real-time Global Announcement listener
  useEffect(() => {
    if (!isOpen) return;

    const annRef = doc(db, 'globalAnnouncement', 'current');
    const unsubscribe = onSnapshot(annRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAnnouncementMessage(data.message || '');
        setAnnouncementEnabled(!!data.enabled);
        setAnnouncementUpdatedAt(data.updatedAt);
        setAnnouncementUpdatedBy(data.updatedBy || '');
      }
    }, (err) => {
      console.warn('Announcement subscription error:', err);
    });

    return () => unsubscribe();
  }, [isOpen]);

  // Real-time Activities listener
  useEffect(() => {
    if (!isOpen) return;

    const q = query(
      collection(db, 'activities'),
      orderBy('timestamp', 'desc'),
      limit(25)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const actData = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Activity[];
      setActivities(actData);
    }, (err) => {
      console.warn('Activities subscription error:', err);
    });

    return () => unsubscribe();
  }, [isOpen]);

  // Real-time Admins listener
  useEffect(() => {
    if (!isOpen) return;

    const q = query(collection(db, 'admins'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const adminList = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as AdminUser[];

      // Always ensure Super Admin is included in view
      const hasSuper = adminList.some(a => (a.email || '').toLowerCase() === SUPER_ADMIN_EMAIL);
      if (!hasSuper) {
        adminList.unshift({
          id: 'super-admin-01',
          email: SUPER_ADMIN_EMAIL,
          displayName: 'Super Admin (Owner)',
          role: 'Owner'
        });
      }

      setAdmins(adminList);
    }, (err) => {
      console.warn('Admins subscription error:', err);
    });

    return () => unsubscribe();
  }, [isOpen]);

  // Live Stats calculations
  const totalVotes = useMemo(() => games.reduce((sum, g) => sum + g.votes, 0), [games]);
  const featuredGamesCount = useMemo(() => games.filter(g => g.isFeatured).length, [games]);
  
  // Approximate unique users based on unique activity userIds or creators
  const estimatedUsersCount = useMemo(() => {
    const userSet = new Set<string>();
    activities.forEach(a => { if (a.userId) userSet.add(a.userId); });
    games.forEach(g => { if (g.createdBy) userSet.add(g.createdBy); });
    if (currentUser?.uid) userSet.add(currentUser.uid);
    return Math.max(userSet.size, 1);
  }, [activities, games, currentUser]);

  // Chart Data for Top Games
  const topGamesChartData = useMemo(() => {
    return [...games]
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 7)
      .map(g => ({
        name: g.name.length > 14 ? g.name.substring(0, 12) + '...' : g.name,
        fullName: g.name,
        votes: g.votes,
        isFeatured: !!g.isFeatured
      }));
  }, [games]);

  // Chart Data: Featured vs Regular Votes
  const pieFeaturedData = useMemo(() => {
    const featuredVotes = games.filter(g => g.isFeatured).reduce((s, g) => s + g.votes, 0);
    const regularVotes = totalVotes - featuredVotes;
    return [
      { name: 'Featured Games', value: featuredVotes, color: '#f59e0b' },
      { name: 'Standard Games', value: Math.max(regularVotes, 0), color: '#3b82f6' }
    ];
  }, [games, totalVotes]);

  // Filtered games for management tab
  const filteredGames = useMemo(() => {
    return games.filter(g =>
      (g.name || '').toLowerCase().includes((searchGameQuery || '').toLowerCase()) ||
      (g.creator || '').toLowerCase().includes((searchGameQuery || '').toLowerCase())
    );
  }, [games, searchGameQuery]);

  // Actions
  const handleToggleFeature = async (game: Game) => {
    const newFeaturedState = !game.isFeatured;
    try {
      await updateDoc(doc(db, 'games', game.id), {
        isFeatured: newFeaturedState
      });

      await logActivity(
        newFeaturedState ? 'feature_game' : 'unfeature_game',
        newFeaturedState ? 'Featured Game' : 'Unfeatured Game',
        `${currentUser?.displayName || 'Admin'} ${newFeaturedState ? 'featured' : 'unfeatured'} "${game.name}"`,
        { gameId: game.id, gameName: game.name }
      );

      toast(
        newFeaturedState ? `"${game.name}" is now featured on BloxVote! ⭐` : `Removed feature badge from "${game.name}"`,
        'success'
      );
    } catch (err: any) {
      console.error('Error toggling feature state:', err);
      toast(`Failed to update game: ${err.message}`, 'error');
    }
  };

  const handleDeleteGameConfirm = async () => {
    if (!deletingGame) return;
    try {
      await deleteDoc(doc(db, 'games', deletingGame.id));

      await logActivity(
        'delete_game',
        'Deleted Experience',
        `${currentUser?.displayName || 'Admin'} deleted "${deletingGame.name}" from leaderboard`,
        { gameId: deletingGame.id, gameName: deletingGame.name }
      );

      toast(`Successfully deleted "${deletingGame.name}"`, 'success');
      setDeletingGame(null);
    } catch (err: any) {
      console.error('Error deleting game:', err);
      toast(`Failed to delete game: ${err.message}`, 'error');
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim() && !newAdminUid.trim()) {
      toast('Please provide a user UID or email address', 'error');
      return;
    }

    setIsSubmittingAdmin(true);
    const targetUid = newAdminUid.trim() || `admin-${Date.now()}`;

    try {
      await setDoc(doc(db, 'admins', targetUid), {
        email: newAdminEmail.trim().toLowerCase(),
        uid: targetUid,
        addedAt: serverTimestamp(),
        addedBy: currentUser?.email || 'super-admin'
      });

      await logActivity(
        'admin_add',
        'Added New Admin',
        `Granted admin privileges to ${newAdminEmail.trim() || targetUid}`
      );

      toast(`Admin privileges granted to ${newAdminEmail || targetUid}! 🛡️`, 'success');
      setNewAdminEmail('');
      setNewAdminUid('');
      setIsAddAdminOpen(false);
    } catch (err: any) {
      console.error('Error adding admin:', err);
      toast(`Failed to add admin: ${err.message}`, 'error');
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  const handleRemoveAdmin = async () => {
    if (!removingAdmin) return;
    if ((removingAdmin.email || '').toLowerCase() === SUPER_ADMIN_EMAIL) {
      toast('Cannot remove the primary Super Admin account!', 'error');
      setRemovingAdmin(null);
      return;
    }

    try {
      await deleteDoc(doc(db, 'admins', removingAdmin.id));

      await logActivity(
        'admin_remove',
        'Revoked Admin Status',
        `Revoked admin privileges from ${removingAdmin.email}`
      );

      toast(`Revoked admin privileges from ${removingAdmin.email}`, 'info');
      setRemovingAdmin(null);
    } catch (err: any) {
      console.error('Error removing admin:', err);
      toast(`Failed to revoke admin: ${err.message}`, 'error');
    }
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementMessage.trim() && announcementEnabled) {
      toast('Please enter an announcement message before enabling', 'error');
      return;
    }

    setIsSavingAnnouncement(true);
    try {
      const annRef = doc(db, 'globalAnnouncement', 'current');
      await setDoc(annRef, {
        message: announcementMessage.trim(),
        enabled: announcementEnabled,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.email || currentUser?.uid || 'Admin'
      });

      await logActivity(
        'admin_add',
        'Updated Announcement',
        `${currentUser?.displayName || 'Admin'} ${announcementEnabled ? 'enabled' : 'disabled'} global announcement: "${announcementMessage.trim()}"`
      );

      toast('Global announcement saved successfully! 📢', 'success');
    } catch (err: any) {
      console.error('Error saving announcement:', err);
      toast(`Failed to save announcement: ${err.message}`, 'error');
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  // Helper for time formatting
  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/90 backdrop-blur-xl"
        />

        {/* Dashboard Main Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative z-10 w-full max-w-6xl rounded-[2rem] border border-zinc-800 bg-zinc-950/95 p-6 sm:p-8 shadow-2xl flex flex-col max-h-[90vh] my-auto overflow-hidden"
        >
          {/* Glowing Top Ambient Header Line */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 via-amber-500 to-indigo-600" />

          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-850 pb-6 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/30">
                <Shield size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-white tracking-tight">BloxVote Admin Suite</h1>
                  <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-400 tracking-wider">
                    PRO
                  </span>
                </div>
                <p className="text-xs font-medium text-zinc-400 mt-0.5">
                  Live metrics, game curation, activity streaming, and staff control
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto rounded-2xl bg-zinc-900/80 border border-zinc-800 p-1.5 self-start sm:self-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all',
                  activeTab === 'overview'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
                )}
              >
                <BarChart3 size={15} />
                Overview
              </button>

              <button
                onClick={() => setActiveTab('games')}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all',
                  activeTab === 'games'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
                )}
              >
                <Gamepad2 size={15} />
                Manage Games
              </button>

              <button
                onClick={() => setActiveTab('announcement')}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all relative',
                  activeTab === 'announcement'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
                )}
              >
                <Megaphone size={15} />
                Announcement
                {announcementEnabled && (
                  <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('activity')}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all relative',
                  activeTab === 'activity'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
                )}
              >
                <ActivityIcon size={15} />
                Activity
                {activities.length > 0 && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('admins')}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all',
                  activeTab === 'admins'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
                )}
              >
                <Users size={15} />
                Admins ({admins.length})
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* Main Body View */}
          <div className="flex-1 overflow-y-auto py-6 pr-1 space-y-6">
            {/* 1. OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* 🎮 Live Stat Cards */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {/* Total Games */}
                  <div className="relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total Games</span>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Gamepad2 size={20} />
                      </div>
                    </div>
                    <p className="mt-3 text-3xl font-black text-white">{games.length}</p>
                    <p className="mt-1 text-xs text-blue-400 flex items-center gap-1">
                      <TrendingUp size={12} /> Live indexed experiencias
                    </p>
                  </div>

                  {/* Total Votes */}
                  <div className="relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total Votes</span>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <ThumbsUp size={20} />
                      </div>
                    </div>
                    <p className="mt-3 text-3xl font-black text-white">{totalVotes.toLocaleString()}</p>
                    <p className="mt-1 text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Authenticated community votes
                    </p>
                  </div>

                  {/* Active Voters */}
                  <div className="relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Active Voters</span>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <Users size={20} />
                      </div>
                    </div>
                    <p className="mt-3 text-3xl font-black text-white">{estimatedUsersCount}</p>
                    <p className="mt-1 text-xs text-purple-400 flex items-center gap-1">
                      <Sparkles size={12} /> Unique registered voters
                    </p>
                  </div>

                  {/* Featured Games */}
                  <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5 backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-500/80">Featured Games</span>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <Star size={20} className="fill-amber-400 text-amber-400" />
                      </div>
                    </div>
                    <p className="mt-3 text-3xl font-black text-amber-300">{featuredGamesCount}</p>
                    <p className="mt-1 text-xs text-amber-400/90 flex items-center gap-1">
                      ⭐ Highlighted experience shelf
                    </p>
                  </div>
                </div>

                {/* 📈 Animated Charts Grid */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  {/* Top Voted Bar Chart */}
                  <div className="lg:col-span-2 rounded-3xl border border-zinc-800 bg-zinc-900/30 p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                          <BarChart3 className="text-blue-500" size={20} />
                          Vote Leaderboard Distribution
                        </h3>
                        <p className="text-xs text-zinc-500">Comparing total votes across top candidate experiences</p>
                      </div>
                    </div>

                    <div className="h-[260px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topGamesChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-3 shadow-xl">
                                    <p className="text-xs font-bold text-white">{data.fullName}</p>
                                    <p className="text-sm font-black text-blue-400 mt-1">
                                      {data.votes.toLocaleString()} votes
                                    </p>
                                    {data.isFeatured && (
                                      <p className="text-[10px] text-amber-400 font-bold mt-1">⭐ Featured Game</p>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="votes" radius={[8, 8, 0, 0]} barSize={28}>
                            {topGamesChartData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.isFeatured ? '#f59e0b' : '#3b82f6'}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Vote Share Donut */}
                  <div className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-6 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <Star className="text-amber-400" size={20} />
                        Featured Vote Share
                      </h3>
                      <p className="text-xs text-zinc-500">Votes given to Featured vs Regular games</p>
                    </div>

                    <div className="h-[200px] w-full my-auto">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieFeaturedData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {pieFeaturedData.map((entry, idx) => (
                              <Cell key={idx} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                  <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-2.5 text-xs">
                                    <p className="font-bold text-white">{d.name}</p>
                                    <p className="font-mono text-zinc-400 mt-0.5">{d.value.toLocaleString()} votes</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-zinc-800/60">
                      {pieFeaturedData.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-zinc-300 font-medium">{d.name}</span>
                          </div>
                          <span className="font-bold text-white">{d.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mini Activity Feed Preview */}
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <ActivityIcon className="text-emerald-400" size={20} />
                      Live Recent Activity
                    </h3>
                    <button
                      onClick={() => setActiveTab('activity')}
                      className="text-xs font-bold text-blue-400 hover:underline"
                    >
                      View All
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {activities.slice(0, 5).map((act) => (
                      <div
                        key={act.id}
                        className="flex items-center justify-between rounded-2xl border border-zinc-850 bg-zinc-950/40 p-3.5 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={act.userPhotoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${act.userId || 'guest'}`}
                            alt=""
                            className="h-8 w-8 rounded-full border border-zinc-800 bg-zinc-900 object-cover"
                          />
                          <div>
                            <p className="font-bold text-white">{act.title}</p>
                            <p className="text-zinc-400 mt-0.5">{act.description}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono shrink-0 ml-2">
                          {formatTimeAgo(act.timestamp)}
                        </span>
                      </div>
                    ))}
                    {activities.length === 0 && (
                      <p className="text-xs text-zinc-500 text-center py-6">No activity logged yet.</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. MANAGE GAMES TAB */}
            {activeTab === 'games' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Search & Filter Header */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input
                      type="text"
                      placeholder="Filter games by title or developer..."
                      value={searchGameQuery}
                      onChange={e => setSearchGameQuery(e.target.value)}
                      className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none transition-all"
                    />
                  </div>

                  <span className="text-xs text-zinc-400 font-medium">
                    Showing <span className="font-bold text-white">{filteredGames.length}</span> of {games.length} games
                  </span>
                </div>

                {/* Games Table/Card List */}
                <div className="space-y-3">
                  {filteredGames.map((game) => (
                    <div
                      key={game.id}
                      className={cn(
                        'flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4 transition-all',
                        game.isFeatured
                          ? 'bg-amber-500/5 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.05)]'
                          : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'
                      )}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <img
                          src={game.imageUrl}
                          alt={game.name}
                          className="h-14 w-14 rounded-xl object-cover border border-zinc-800 bg-zinc-950 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-base truncate">{game.name}</h4>
                            {game.isFeatured && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                                <Star size={10} className="fill-amber-300" /> Featured
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5 truncate">by {game.creator}</p>
                          <p className="text-xs text-zinc-500 font-mono mt-0.5">
                            {game.votes.toLocaleString()} votes
                          </p>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <button
                          onClick={() => handleToggleFeature(game)}
                          className={cn(
                            'flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all',
                            game.isFeatured
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                              : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 hover:text-white'
                          )}
                        >
                          <Star size={14} className={game.isFeatured ? 'fill-amber-300' : ''} />
                          {game.isFeatured ? 'Unfeature' : 'Feature'}
                        </button>

                        <a
                          href={game.robloxUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all"
                          title="View on Roblox"
                        >
                          <ExternalLink size={16} />
                        </a>

                        <button
                          onClick={() => setDeletingGame(game)}
                          className="flex items-center gap-1 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3.5 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-all"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}

                  {filteredGames.length === 0 && (
                    <div className="text-center py-12 rounded-2xl border border-dashed border-zinc-800">
                      <Gamepad2 size={32} className="text-zinc-600 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-zinc-400">No games found</p>
                      <p className="text-xs text-zinc-600 mt-1">Try refining your search query</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ANNOUNCEMENT TAB */}
            {activeTab === 'announcement' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 max-w-2xl mx-auto"
              >
                <div className="border-b border-zinc-850 pb-4">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Megaphone className="text-blue-500" size={20} />
                    Global Announcement System
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Broadcast site-wide alerts and operational updates to all visitors live.
                  </p>
                </div>

                <form onSubmit={handleSaveAnnouncement} className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
                  {/* Status Toggle */}
                  <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl font-bold transition-all",
                        announcementEnabled ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-zinc-800 text-zinc-500"
                      )}>
                        <Megaphone size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Display Announcement Banner</p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {announcementEnabled ? 'Banner is currently live for all visitors' : 'Banner is hidden'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAnnouncementEnabled(!announcementEnabled)}
                      className={cn(
                        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        announcementEnabled ? "bg-blue-600" : "bg-zinc-800"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                          announcementEnabled ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  {/* Message Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Announcement Message
                    </label>
                    <textarea
                      rows={4}
                      value={announcementMessage}
                      onChange={(e) => setAnnouncementMessage(e.target.value)}
                      placeholder="e.g. Roblox is currently experiencing API issues. Some game information may load slowly."
                      className="w-full rounded-2xl bg-zinc-950 border border-zinc-800 p-4 text-sm text-white placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none transition-all leading-relaxed"
                    />
                    <p className="text-[11px] text-zinc-500">
                      Changes publish live to all visitors instantly via Firestore.
                    </p>
                  </div>

                  {/* Live Preview Box */}
                  <div className="space-y-2 pt-2 border-t border-zinc-800/60">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Live Preview</p>
                    <div className="rounded-2xl border border-blue-500/30 bg-zinc-900/90 p-4 relative">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-l-2xl" />
                      <div className="flex items-start gap-3 pl-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <Megaphone size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase text-blue-400 mb-0.5">Announcement</p>
                          <p className="text-sm font-medium text-zinc-200">
                            {announcementMessage.trim() || 'No message set yet...'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info footer */}
                  {announcementUpdatedAt && (
                    <div className="text-[11px] text-zinc-500 flex items-center justify-between font-mono pt-2">
                      <span>Last updated by: {announcementUpdatedBy || 'Admin'}</span>
                      <span>{formatTimeAgo(announcementUpdatedAt)}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSavingAnnouncement}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50 transition-all shadow-lg shadow-blue-900/20"
                  >
                    {isSavingAnnouncement ? 'Saving Changes...' : 'Save & Publish Announcement'}
                  </button>
                </form>
              </motion.div>
            )}


            {/* 3. ACTIVITY FEED TAB */}
            {activeTab === 'activity' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ActivityIcon className="text-emerald-400" size={18} />
                    Live System & Voter Activity Stream
                  </h3>
                  <span className="text-xs text-zinc-500 font-mono">
                    Real-time updates
                  </span>
                </div>

                <div className="space-y-3">
                  {activities.map((act) => (
                    <div
                      key={act.id}
                      className="flex items-start justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-4 transition-all hover:bg-zinc-900/50"
                    >
                      <div className="flex items-start gap-3.5">
                        <img
                          src={act.userPhotoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${act.userId || 'guest'}`}
                          alt=""
                          className="h-10 w-10 rounded-full border border-zinc-800 bg-zinc-900 object-cover mt-0.5 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{act.title}</span>
                            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400 uppercase">
                              {act.type}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-300 mt-1">{act.description}</p>
                          <p className="text-[10px] text-zinc-500 mt-1">
                            By: {act.userDisplayName} ({act.userEmail || 'Guest'})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-500 shrink-0 ml-4">
                        <Clock size={12} />
                        {formatTimeAgo(act.timestamp)}
                      </div>
                    </div>
                  ))}

                  {activities.length === 0 && (
                    <div className="text-center py-16 rounded-2xl border border-dashed border-zinc-800">
                      <ActivityIcon size={32} className="text-zinc-600 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-zinc-400">No activity logged yet</p>
                      <p className="text-xs text-zinc-600 mt-1">User actions like voting or game submissions will appear here live</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 4. MANAGE ADMINS TAB */}
            {activeTab === 'admins' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-850 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Shield className="text-blue-500" size={20} />
                      Platform Administrators
                    </h3>
                    <p className="text-xs text-zinc-400">Manage user permissions and website administration staff</p>
                  </div>

                  <button
                    onClick={() => setIsAddAdminOpen(true)}
                    className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition-all shadow-md active:scale-95 self-start sm:self-auto"
                  >
                    <UserPlus size={16} />
                    Add Admin Privileges
                  </button>
                </div>

                {/* Admins Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {admins.map((admin) => {
                    const isSuper = (admin.email || '').toLowerCase() === SUPER_ADMIN_EMAIL;
                    return (
                      <div
                        key={admin.id}
                        className={cn(
                          'flex items-center justify-between rounded-2xl border p-4 transition-all',
                          isSuper
                            ? 'bg-amber-500/5 border-amber-500/30'
                            : 'bg-zinc-900/30 border-zinc-800'
                        )}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-2xl shrink-0 font-black text-sm',
                            isSuper ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          )}>
                            <Shield size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-white text-sm truncate">{admin.email}</p>
                              {isSuper && (
                                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-black uppercase text-amber-300">
                                  Owner
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 truncate mt-0.5">
                              ID: {admin.id}
                            </p>
                          </div>
                        </div>

                        {!isSuper && (
                          <button
                            onClick={() => setRemovingAdmin(admin)}
                            className="rounded-xl p-2 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all"
                            title="Revoke Admin Status"
                          >
                            <UserMinus size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Modal: Delete Game Confirmation */}
        <AnimatePresence>
          {deletingGame && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDeletingGame(null)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                className="relative z-10 w-full max-w-md rounded-3xl border border-rose-500/30 bg-zinc-950 p-6 shadow-2xl"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 mb-4">
                  <AlertTriangle size={24} />
                </div>

                <h3 className="text-xl font-black text-white">Delete Experience?</h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  Are you sure you want to delete <span className="font-bold text-white">"{deletingGame.name}"</span>?
                  This action will remove it permanently from the public leaderboard.
                </p>

                <div className="my-4 flex items-center gap-3 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
                  <img
                    src={deletingGame.imageUrl}
                    alt=""
                    className="h-12 w-12 rounded-xl object-cover shrink-0"
                  />
                  <div>
                    <p className="text-sm font-bold text-white truncate">{deletingGame.name}</p>
                    <p className="text-xs text-zinc-500">by {deletingGame.creator} • {deletingGame.votes} votes</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <button
                    onClick={() => setDeletingGame(null)}
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 py-3 text-xs font-bold text-zinc-300 hover:bg-zinc-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteGameConfirm}
                    className="flex-1 rounded-xl bg-rose-600 py-3 text-xs font-bold text-white hover:bg-rose-500 transition-all shadow-lg shadow-rose-900/20"
                  >
                    Confirm Delete
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: Add Admin */}
        <AnimatePresence>
          {isAddAdminOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAddAdminOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                className="relative z-10 w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-zinc-850 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <UserPlus className="text-blue-500" size={20} />
                    <h3 className="text-lg font-bold text-white">Grant Admin Status</h3>
                  </div>
                  <button
                    onClick={() => setIsAddAdminOpen(false)}
                    className="text-zinc-500 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleAddAdmin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">User Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. moderator@gmail.com"
                      value={newAdminEmail}
                      onChange={e => setNewAdminEmail(e.target.value)}
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-sm text-white placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Firebase User UID (Optional if email provided)</label>
                    <input
                      type="text"
                      placeholder="e.g. 8xK29vM1L..."
                      value={newAdminUid}
                      onChange={e => setNewAdminUid(e.target.value)}
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-sm text-white placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingAdmin}
                    className="w-full rounded-xl bg-blue-600 py-3.5 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50 transition-all mt-4"
                  >
                    {isSubmittingAdmin ? 'Granting Access...' : 'Confirm Grant Admin'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: Remove Admin Confirm */}
        <AnimatePresence>
          {removingAdmin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setRemovingAdmin(null)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                className="relative z-10 w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl text-center"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 mb-4">
                  <UserMinus size={24} />
                </div>

                <h3 className="text-lg font-bold text-white">Revoke Admin Status?</h3>
                <p className="text-xs text-zinc-400 mt-2">
                  Revoke administrative privileges for <span className="font-bold text-white">{removingAdmin.email}</span>?
                </p>

                <div className="flex items-center gap-3 mt-6">
                  <button
                    onClick={() => setRemovingAdmin(null)}
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 text-xs font-bold text-zinc-300 hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRemoveAdmin}
                    className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-500"
                  >
                    Revoke
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}
