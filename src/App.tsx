import React, { useState, useEffect, Component, ErrorInfo, ReactNode, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  increment,
  getDocFromServer,
  collectionGroup,
  where
} from "firebase/firestore";
import { onAuthStateChanged, User } from 'firebase/auth';
import { Trophy, Plus, LogIn, LogOut, Gamepad2, Search, TrendingUp, AlertTriangle, BarChart3, CircleUser, Download } from 'lucide-react';
import { db, auth, signIn, logout } from './firebase';
import { Game } from './types';
import GameCard from './components/GameCard';
import AddGameModal from './components/AddGameModal';
import TopGamesChart from './components/TopGamesChart';
import UserProfile from './components/UserProfile';
import { useToast } from './components/Toast';
import { cn } from './lib/utils';

// Error Handling
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const ErrorBoundary = class extends (React.Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error?.message || "");
        if (parsed.error) errorMessage = parsed.error;
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-600/20 text-red-500">
            <AlertTriangle size={40} />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-white">Application Error</h1>
          <p className="mb-8 max-w-md text-zinc-400">{errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-full bg-white px-8 py-3 font-bold text-black hover:bg-zinc-200 transition-all"
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, boolean>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'votes' | 'newest'>('votes');
  const [isLoading, setIsLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'leaderboard' | 'analytics'>('leaderboard');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Sync isProfileOpen with the URL query parameter ?profile=true

  // Check if current user is an admin
  useEffect(() => {
    const checkAdmin = async () => {
     if (!user) {
       setIsAdmin(false);
       return;
     }

     const adminDoc = await getDoc(doc(db, "admins", user.uid));
     setIsAdmin(adminDoc.exists());
    };

    checkAdmin();
  }, [user]);

  useEffect(() => {
    const checkUrlForProfile = () => {
      const params = new URLSearchParams(window.location.search);
      setIsProfileOpen(params.get('profile') === 'true');
    };

    // Run on mount
    checkUrlForProfile();

    // Listen to back/forward button navigations
    window.addEventListener('popstate', checkUrlForProfile);
    return () => window.removeEventListener('popstate', checkUrlForProfile);
  }, []);

  const openProfile = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('profile', 'true');
    window.history.pushState({}, '', url.toString());
    setIsProfileOpen(true);
  };

  const closeProfile = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('profile');
    window.history.pushState({}, '', url.toString());
    setIsProfileOpen(false);
  };

  // Test connection
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Auth listener
  const prevUserRef = useRef<User | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setUserVotes({});
      
      // Notify on successful login transition
      if (prevUserRef.current === null && currentUser) {
        toast(`Welcome back, ${currentUser.displayName || 'Voter'}! 👋`, 'success');
      }
      prevUserRef.current = currentUser;
    });
    return () => unsubscribe();
  }, [toast]);

  // Games listener
  useEffect(() => {
    const q = query(
      collection(db, 'games'),
      orderBy(sortBy === 'votes' ? 'votes' : 'createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gamesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Game[];
      setGames(gamesData);
      setIsLoading(false);

      // If empty, add some initial games - ONLY if user is authenticated
      if (gamesData.length === 0 && !isLoading && auth.currentUser) {
        seedInitialGames();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'games');
    });

    return () => unsubscribe();
  }, [sortBy, isLoading]);

  // Self-healing backfill for any games in Firestore that are missing creatorId / creatorType
  useEffect(() => {
    if (games.length === 0) return;

    // Find the first game that is missing its creatorId and has a valid robloxUrl
    const missingGame = games.find(g => !g.creatorId && g.robloxUrl);
    if (!missingGame) return;

    const backfillCreatorInfo = async () => {
      try {
        const response = await fetch(`/api/roblox-info?url=${encodeURIComponent(missingGame.robloxUrl)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.creatorId) {
            const gameRef = doc(db, 'games', missingGame.id);
            await updateDoc(gameRef, {
              creatorId: data.creatorId,
              creatorType: data.creatorType || 'User',
              description: missingGame.description || data.description || ''
            });
            console.log(`Backfilled creator info for: ${missingGame.name}`);
          } else {
            // If the API couldn't resolve it, mark it as -1 to avoid retrying
            const gameRef = doc(db, 'games', missingGame.id);
            await updateDoc(gameRef, {
              creatorId: -1,
              creatorType: 'User'
            });
          }
        } else {
          // Mark with placeholder to avoid infinite retries on error
          const gameRef = doc(db, 'games', missingGame.id);
          await updateDoc(gameRef, {
            creatorId: -1,
            creatorType: 'User'
          });
        }
      } catch (err) {
        console.error('Failed to backfill game creator info:', err);
      }
    };

    // Delay slightly to prevent heavy API calls during page load
    const timer = setTimeout(backfillCreatorInfo, 1000);
    return () => clearTimeout(timer);
  }, [games]);

  // Check votes for the user from their own subcollection (requires no composite indexes)
  useEffect(() => {
    if (!user) {
      setUserVotes({});
      return;
    }

    const q = query(collection(db, 'users', user.uid, 'votes'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const votes: Record<string, boolean> = {};
      snapshot.docs.forEach(doc => {
        votes[doc.id] = true; // doc.id is the gameId
      });
      setUserVotes(votes);
    }, (error) => {
      console.warn("Could not check user votes:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const seedInitialGames = async () => {
    const initialGames = [
      {
        name: "Adopt Me!",
        creator: "DreamCraft",
        creatorId: 2914101,
        creatorType: "Group",
        description: "Adopt and raise a variety of pets, build your own house, and explore the magical world of Adoption Island!",
        imageUrl: "https://picsum.photos/seed/adoptme/800/600",
        robloxUrl: "https://www.roblox.com/games/920587237/Adopt-Me",
        votes: 1250,
        createdAt: serverTimestamp(),
        createdBy: "system"
      },
      {
        name: "Brookhaven 🏡RP",
        creator: "Wolfpaq",
        creatorId: 45598637,
        creatorType: "User",
        description: "A place to hang out with like minded people and roleplay. Own and live in amazing houses, drive cool vehicles and explore the city.",
        imageUrl: "https://picsum.photos/seed/brookhaven/800/600",
        robloxUrl: "https://www.roblox.com/games/4924146364/Brookhaven-RP",
        votes: 980,
        createdAt: serverTimestamp(),
        createdBy: "system"
      },
      {
        name: "Blox Fruits",
        creator: "Gamer Robot Inc",
        creatorId: 4356811,
        creatorType: "Group",
        description: "Welcome to Blox Fruits! Become a master swordsman or a powerful blox fruit user as you train to become the strongest player to ever live.",
        imageUrl: "https://picsum.photos/seed/bloxfruits/800/600",
        robloxUrl: "https://www.roblox.com/games/2753915549/Blox-Fruits",
        votes: 1540,
        createdAt: serverTimestamp(),
        createdBy: "system"
      }
    ];

    for (const game of initialGames) {
      try {
        await addDoc(collection(db, 'games'), game);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'games');
      }
    }
  };

  const handleVote = async (gameId: string) => {
    if (!user) {
      signIn();
      return;
    }

    const game = games.find(g => g.id === gameId);
    const gameName = game ? game.name : 'Experience';
    const isVoted = !!userVotes[gameId];
    let currentPath = `users/${user.uid}/votes/${gameId}`;
    try {
      const gameRef = doc(db, 'games', gameId);
      const userVoteRef = doc(db, 'users', user.uid, 'votes', gameId);

      if (isVoted) {
        // Un-vote
        currentPath = `users/${user.uid}/votes/${gameId}`;
        await deleteDoc(userVoteRef);

        currentPath = `games/${gameId}`;
        await updateDoc(gameRef, {
          votes: increment(-1)
        });
        toast(`Retracted vote for ${gameName}`, 'info');
      } else {
        // Vote
        currentPath = `users/${user.uid}/votes/${gameId}`;
        await setDoc(userVoteRef, {
          votedAt: serverTimestamp()
        });

        currentPath = `games/${gameId}`;
        await updateDoc(gameRef, {
          votes: increment(1)
        });
        toast(`Successfully voted for ${gameName}! 🚀`, 'success');
      }
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, currentPath);
      toast(`Failed to update vote: ${error.message || 'Permission denied'}`, 'error');
    }
  };

  const handleAddGame = async (gameData: any) => {
    if (!user) return;

    const extractRobloxId = (url: string) => {
      const match = url.match(/games\/(\d+)/);
      return match ? match[1] : null;
    };

    const newId = extractRobloxId(gameData.robloxUrl);
    const isDuplicate = games.some(game => {
      const existingId = extractRobloxId(game.robloxUrl);
      return existingId && existingId === newId;
    });

    if (isDuplicate) {
      console.warn("Prevented duplicate game submission:", gameData.name);
      toast(`"${gameData.name}" has already been submitted!`, 'error');
      return;
    }

    // Sanitize gameData to remove any 'undefined' values which are unsupported by Firestore, and truncate to satisfy Firestore security limits
    const sanitizedGameData: Record<string, any> = {};
    Object.keys(gameData).forEach(key => {
      if (gameData[key] !== undefined) {
        let val = gameData[key];
        if (typeof val === 'string') {
          if (key === 'name' || key === 'creator') {
            val = val.substring(0, 100);
          } else if (key === 'description') {
            val = val.substring(0, 2000);
          }
        }
        sanitizedGameData[key] = val;
      }
    });

    try {
      await addDoc(collection(db, 'games'), {
        ...sanitizedGameData,
        votes: 0,
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });
      toast(`Successfully submitted "${gameData.name}"! 🎉`, 'success');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.CREATE, 'games');
      toast(`Failed to submit game: ${error.message || 'Permission denied'}`, 'error');
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!user || !isAdmin) return;

    const game = games.find(g => g.id === gameId);
    const gameName = game ? game.name : 'Experience';

    try {
      await deleteDoc(doc(db, 'games', gameId));
      toast(`Successfully deleted "${gameName}" from leaderboard`, 'success');
    } catch (error: any) {
      console.error('Error deleting game:', error);
      toast(`Failed to delete: ${error.message || 'Permission denied'}`, 'error');
    }
  };

  const downloadLeaderboardCSV = () => {
    if (games.length === 0) {
      toast("No game data to download!", "error");
      return;
    }

    const headers = ["Rank", "Game Name", "Developer/Creator", "Votes", "Roblox URL", "Image URL"];
    const rows = filteredGames.map((game, index) => [
      index + 1,
      `"${game.name.replace(/"/g, '""')}"`,
      `"${game.creator.replace(/"/g, '""')}"`,
      game.votes,
      `"${game.robloxUrl}"`,
      `"${game.imageUrl}"`
    ]);

    const csvString = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `bloxvote_leaderboard_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast("Leaderboard CSV downloaded! 📊", "success");
  };

  const filteredGames = games.filter(game => 
    game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    game.creator.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-blue-500/30 font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 border-b border-zinc-800 bg-black/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-900/20">
                <Gamepad2 className="text-white" size={24} />
              </div>
              <span className="text-2xl font-black tracking-tighter text-white">BLOXVOTE</span>
            </div>

            {/* Navigation Tabs */}
            <div className="hidden md:flex items-center gap-1 rounded-full bg-zinc-900 border border-zinc-800 p-1">
              <button
                onClick={() => setCurrentTab('leaderboard')}
                className={cn(
                  "flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-all",
                  currentTab === 'leaderboard' ? "bg-zinc-800 text-white shadow-md border border-zinc-700/30" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Trophy size={14} />
                Leaderboard
              </button>
              <button
                onClick={() => setCurrentTab('analytics')}
                className={cn(
                  "flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-all",
                  currentTab === 'analytics' ? "bg-zinc-800 text-white shadow-md border border-zinc-700/30" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <BarChart3 size={14} />
                Insights & Graphs
              </button>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-4">
                  <div 
                    onClick={openProfile}
                    className="hidden items-center gap-3 sm:flex cursor-pointer group transition-opacity duration-150"
                    title="View Profile & Vote History"
                  >
                    <div className="text-right">
                      <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Logged in as</p>
                      <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{user.displayName}</p>
                    </div>
                    <img 
                      src={user.photoURL || ''} 
                      alt={user.displayName || ''} 
                      className="h-10 w-10 rounded-full border-2 border-zinc-800 group-hover:border-blue-500/50 transition-colors"
                    />
                  </div>
                  <button
                    onClick={openProfile}
                    className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/40 px-4 py-2 text-sm font-bold text-blue-400 transition-all hover:bg-zinc-800 hover:text-blue-300 active:scale-95"
                  >
                    <CircleUser size={16} />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 rounded-full border border-zinc-800 px-4 py-2 text-sm font-bold text-zinc-400 transition-all hover:bg-zinc-800 hover:text-white active:scale-95"
                  >
                    <LogOut size={16} />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={signIn}
                  className="flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-black transition-all hover:bg-zinc-200 active:scale-95"
                >
                  <LogIn size={18} />
                  Sign In with Google
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="relative mb-16 overflow-hidden rounded-[2.5rem] bg-zinc-900 px-8 py-16 text-center sm:px-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.15),transparent_50%)]" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-4 py-1.5 text-sm font-bold text-blue-400 border border-blue-500/20">
              <TrendingUp size={16} />
              Trending in the Metaverse
            </div>
            <h1 className="mb-6 text-5xl font-black tracking-tight text-white sm:text-7xl">
              Vote for your <span className="text-blue-500 italic">favorite</span> <br className="hidden sm:block" /> Roblox experience.
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-zinc-400">
              Discover the most popular games on Roblox, voted by the community. 
              Add your favorites and help them climb the leaderboard.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => user ? setIsAddModalOpen(true) : signIn()}
                className="flex items-center gap-2 rounded-full bg-blue-600 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-blue-900/20 transition-all hover:bg-blue-500 hover:scale-105 active:scale-95"
              >
                <Plus size={24} />
                Add Your Favorite Game
              </button>
            </div>
          </motion.div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex md:hidden items-center justify-center mb-8 gap-1 rounded-2xl bg-zinc-900 border border-zinc-800 p-1">
          <button
            onClick={() => setCurrentTab('leaderboard')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all",
              currentTab === 'leaderboard' ? "bg-zinc-850 text-white shadow-sm border border-zinc-700/20" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Trophy size={16} />
            Leaderboard
          </button>
          <button
            onClick={() => setCurrentTab('analytics')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all",
              currentTab === 'analytics' ? "bg-zinc-850 text-white shadow-sm border border-zinc-700/20" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <BarChart3 size={16} />
            Insights & Graphs
          </button>
        </div>

        <AnimatePresence mode="wait">
          {currentTab === 'leaderboard' ? (
            <motion.div
              key="leaderboard-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              {/* Controls */}
              <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                  <input
                    type="text"
                    placeholder="Search games or creators..."
                    className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 py-4 pl-12 pr-4 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex rounded-2xl bg-zinc-900 border border-zinc-800 p-1">
                    <button
                      onClick={() => setSortBy('votes')}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all",
                        sortBy === 'votes' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      <Trophy size={16} />
                      Top Rated
                    </button>
                    <button
                      onClick={() => setSortBy('newest')}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all",
                        sortBy === 'newest' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      <Plus size={16} />
                      Newest
                    </button>
                  </div>

                  <button
                    onClick={downloadLeaderboardCSV}
                    title="Export Leaderboard CSV"
                    className="flex items-center gap-2 rounded-2xl bg-zinc-900 border border-zinc-800 px-4 py-3.5 text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-850 active:scale-95 transition-all"
                  >
                    <Download size={16} />
                    <span className="hidden sm:inline">Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Grid */}
              {isLoading ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-48 animate-pulse rounded-2xl bg-zinc-900/50 border border-zinc-800" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
                  <AnimatePresence mode="popLayout">
                    {filteredGames.map((game, index) => (
                      <GameCard
                        key={game.id}
                        game={game}
                        onVote={handleVote}
                        hasVoted={userVotes[game.id] || false}
                        onDelete={isAdmin ? handleDeleteGame : undefined}
                        rank={sortBy === 'votes' ? index + 1 : undefined}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {!isLoading && filteredGames.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-900 text-zinc-700">
                    <Search size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-white">No games found</h3>
                  <p className="text-zinc-500">Try adjusting your search or add a new game!</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="analytics-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <TopGamesChart
                games={games}
                onVote={handleVote}
                userVotes={userVotes}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-zinc-900 bg-black py-12">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2 opacity-50 grayscale mb-6">
            <Gamepad2 size={24} />
            <span className="text-xl font-black tracking-tighter">BLOXVOTE</span>
          </div>
          <p className="text-sm text-zinc-650">
            BloxVote is an independent community platform. Not affiliated with Roblox Corporation.
          </p>
        </div>
      </footer>

      <AddGameModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        existingGames={games}
        onAdd={handleAddGame}
      />

      <UserProfile
        isOpen={isProfileOpen}
        onClose={closeProfile}
        user={user}
        games={games}
        userVotes={userVotes}
        onVote={handleVote}
      />
    </div>
  );
}

export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
