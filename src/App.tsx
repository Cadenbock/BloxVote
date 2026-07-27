import React, { useState, useEffect, Component, ErrorInfo, ReactNode, useRef, useMemo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
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
  writeBatch,
  serverTimestamp,
  increment,
  getDocFromServer,
  collectionGroup,
  where,
  limit
} from "firebase/firestore";
import { onAuthStateChanged, User } from 'firebase/auth';
import { Trophy, Plus, LogIn, LogOut, Gamepad2, Search, TrendingUp, AlertTriangle, BarChart3, CircleUser, Download, Shield, Star, Flame, Sparkles, FileText, Coins, ShoppingBag, MessageSquare, Bell } from 'lucide-react';
import { db, auth, signIn, logout } from './firebase';
import { Game, UserStreakData, GlobalAnnouncement, UserProfileData, AppNotification, CustomTitleRequest, AdminCustomTitle, AdminCustomFont, CustomThemeConfig } from './types';
import GameCard from './components/GameCard';
import AddGameModal from './components/AddGameModal';
import TopGamesChart from './components/TopGamesChart';
import UserProfile from './components/UserProfile';
import AdminDashboard from './components/AdminDashboard';
import FeaturedGamesBanner from './components/FeaturedGamesBanner';
import AnnouncementBanner from './components/AnnouncementBanner';
import UpdateLogsModal from './components/UpdateLogsModal';
import ShopModal from './components/ShopModal';
import PublicChat from './components/PublicChat';
import DirectMessagesModal from './components/DirectMessagesModal';
import NotificationsModal from './components/NotificationsModal';
import { getNameColorStyle, getBackgroundThemeStyle, getFontItemStyle, getTitleItemStyle, NameColorItem, BackgroundThemeItem, FontItem, TitleItem } from './lib/shopData';
import { useToast } from './components/Toast';
import { logActivity } from './lib/activity';
import { recordUserVotingStreak } from './lib/streak';
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

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  props: ErrorBoundaryProps;
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
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
  const [currentTab, setCurrentTab] = useState<'leaderboard' | 'analytics' | 'chat'>('leaderboard');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [userStreak, setUserStreak] = useState<UserStreakData | null>(null);
  const [announcement, setAnnouncement] = useState<GlobalAnnouncement | null>(null);
  const [isUpdateLogsOpen, setIsUpdateLogsOpen] = useState(false);
  const [isDMOpen, setIsDMOpen] = useState(false);
  const [dmTargetUser, setDmTargetUser] = useState<{ uid: string; displayName: string; photoURL?: string; color?: string } | null>(null);
  const [previewThemeId, setPreviewThemeId] = useState<string | null>(null);
  const [previewFontId, setPreviewFontId] = useState<string | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [userProfileData, setUserProfileData] = useState<UserProfileData>({
    coins: 50,
    equippedColor: 'default',
    purchasedColors: ['default'],
    equippedTheme: 'default',
    purchasedThemes: ['default'],
    equippedFont: 'default',
    purchasedFonts: ['default'],
  });

  const featuredGames = useMemo(() => games.filter(g => g.isFeatured), [games]);

  // Realtime listener for User Profile (coins, cosmetics)
  useEffect(() => {
    if (!user) {
      setUserProfileData({
        coins: 50,
        equippedColor: 'default',
        purchasedColors: ['default'],
        equippedTheme: 'default',
        purchasedThemes: ['default'],
        equippedFont: 'default',
        purchasedFonts: ['default'],
      });
      return;
    }

    const userRef = doc(db, 'users', user.uid);

    // Sync user email & displayName to Firestore document for player search
    if (user.email || user.displayName) {
      setDoc(userRef, {
        email: user.email || '',
        displayName: user.displayName || 'Player',
        photoURL: user.photoURL || ''
      }, { merge: true }).catch(console.error);
    }

    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUserProfileData({
          coins: typeof data.coins === 'number' ? data.coins : 50,
          equippedColor: data.equippedColor || 'default',
          purchasedColors: Array.isArray(data.purchasedColors) ? data.purchasedColors : ['default'],
          equippedTheme: data.equippedTheme || 'default',
          purchasedThemes: Array.isArray(data.purchasedThemes) ? data.purchasedThemes : ['default'],
          equippedFont: data.equippedFont || 'default',
          purchasedFonts: Array.isArray(data.purchasedFonts) ? data.purchasedFonts : ['default'],
          equippedTitle: data.equippedTitle || 'default',
          purchasedTitles: Array.isArray(data.purchasedTitles) ? data.purchasedTitles : ['default'],
          customThemeConfig: data.customThemeConfig || undefined,
          displayName: data.displayName || user.displayName || '',
          photoURL: data.photoURL || user.photoURL || '',
          lastDailyBonusDate: data.lastDailyBonusDate || '',
          lastCustomTitleRequestTime: typeof data.lastCustomTitleRequestTime === 'number' ? data.lastCustomTitleRequestTime : undefined,
        });
      } else {
        const initialProfile = {
          coins: 50,
          equippedColor: 'default',
          purchasedColors: ['default'],
          equippedTheme: 'default',
          purchasedThemes: ['default'],
          equippedFont: 'default',
          purchasedFonts: ['default'],
          equippedTitle: 'default',
          purchasedTitles: ['default'],
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          email: user.email || ''
        };
        setDoc(userRef, initialProfile, { merge: true }).catch(console.error);
      }
    }, (err) => {
      console.warn("User profile listener warning:", err);
    });

    return () => unsubscribe();
  }, [user]);

  // Realtime listener for user's custom title request
  const [customTitleRequest, setCustomTitleRequest] = useState<CustomTitleRequest | null>(null);

  useEffect(() => {
    if (!user) {
      setCustomTitleRequest(null);
      return;
    }

    const q = query(
      collection(db, 'customTitleRequests'),
      where('userId', '==', user.uid),
      orderBy('requestedAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        setCustomTitleRequest({
          id: docSnap.id,
          ...docSnap.data()
        } as CustomTitleRequest);
      } else {
        setCustomTitleRequest(null);
      }
    }, (err) => {
      console.warn("Custom title request listener warning:", err);
    });

    return () => unsubscribe();
  }, [user]);

  // Realtime listener for custom admin titles and fonts
  const [customAdminTitles, setCustomAdminTitles] = useState<AdminCustomTitle[]>([]);
  const [customAdminFonts, setCustomAdminFonts] = useState<AdminCustomFont[]>([]);

  useEffect(() => {
    const qTitles = query(collection(db, 'customAdminTitles'), orderBy('createdAt', 'desc'));
    const unsubTitles = onSnapshot(qTitles, (snapshot) => {
      const list: AdminCustomTitle[] = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as AdminCustomTitle));
      setCustomAdminTitles(list);
    }, err => console.warn("Custom admin titles listener warning:", err));

    const qFonts = query(collection(db, 'customAdminFonts'), orderBy('createdAt', 'desc'));
    const unsubFonts = onSnapshot(qFonts, (snapshot) => {
      const list: AdminCustomFont[] = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as AdminCustomFont));
      setCustomAdminFonts(list);
    }, err => console.warn("Custom admin fonts listener warning:", err));

    return () => {
      unsubTitles();
      unsubFonts();
    };
  }, []);

  // Realtime listener for global announcement
  useEffect(() => {
    const annRef = doc(db, 'globalAnnouncement', 'current');
    const unsubscribe = onSnapshot(annRef, (snapshot) => {
      if (snapshot.exists()) {
        setAnnouncement(snapshot.data() as GlobalAnnouncement);
      } else {
        setAnnouncement(null);
      }
    }, (err) => {
      console.warn("Global announcement listener warning:", err);
    });

    return () => unsubscribe();
  }, []);

  // Realtime listener for user profile streak data
  useEffect(() => {
    if (!user) {
      setUserStreak(null);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUserStreak({
          streakCount: data.streakCount || 0,
          highestStreak: data.highestStreak || 0,
          lastVotedDate: data.lastVotedDate || '',
          totalDaysVoted: data.totalDaysVoted || 0
        });
      } else {
        setUserStreak(null);
      }
    }, (err) => {
      console.warn("User streak listener error:", err);
    });

    return () => unsubscribe();
  }, [user]);

  // Sync isProfileOpen and isAdminDashboardOpen with URL query parameters
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      // Owner/Super Admin email check
      if (user.email && user.email.toLowerCase() === 'mondo7108@gmail.com') {
        setIsAdmin(true);
        return;
      }

      try {
        const adminDoc = await getDoc(doc(db, "admins", user.uid));
        setIsAdmin(adminDoc.exists());
      } catch (err) {
        console.warn("Admin check warning:", err);
        setIsAdmin(false);
      }
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

  // Realtime Notification Listener & Default Sync
  useEffect(() => {
    if (!user) {
      setNotifications([
        {
          id: 'welcome-1',
          type: 'system',
          title: 'Welcome to BloxVote 2026! 🎮',
          message: 'Discover, rate, and vote for top Roblox games. Earn BloxCoins for daily voting!',
          timestamp: new Date(),
          isRead: false,
          linkAction: 'open_leaderboard',
        },
        {
          id: 'bonus-1',
          type: 'reward',
          title: 'Daily Reward Ready 🎁',
          message: 'Sign in to claim your 50 free BloxCoins daily bonus and customize your profile font & colors!',
          timestamp: new Date(Date.now() - 3600000),
          isRead: false,
          linkAction: 'open_shop',
        },
        {
          id: 'chat-1',
          type: 'announcement',
          title: 'Global Community Chat 💬',
          message: 'Join live chat and send direct messages to other Roblox gamers!',
          timestamp: new Date(Date.now() - 7200000),
          isRead: true,
          linkAction: 'open_chat',
        },
      ]);
      return;
    }

    const notifRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(notifRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const remoteNotifs: AppNotification[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        remoteNotifs.push({
          id: docSnap.id,
          userId: user.uid,
          type: data.type || 'system',
          title: data.title || '',
          message: data.message || '',
          timestamp: data.timestamp || new Date(),
          isRead: !!data.isRead,
          linkAction: data.linkAction,
          actionData: data.actionData,
        });
      });

      if (remoteNotifs.length === 0) {
        try {
          const userSnap = await getDoc(doc(db, 'users', user.uid));
          const isSeeded = userSnap.exists() && userSnap.data()?.notificationsSeeded;

          if (!isSeeded) {
            await setDoc(doc(db, 'users', user.uid), { notificationsSeeded: true }, { merge: true });

            const initialNotifs: AppNotification[] = [
              {
                id: 'init-1',
                type: 'system',
                title: 'Welcome to BloxVote 2026! 🚀',
                message: 'You are signed in as ' + (user.displayName || 'Gamer') + '. Vote daily to build your streak and earn coins.',
                timestamp: new Date(),
                isRead: false,
                linkAction: 'open_leaderboard',
              },
              {
                id: 'init-2',
                type: 'reward',
                title: 'Daily Bonus Available 🎁',
                message: 'Claim 50 free BloxCoins today in the shop!',
                timestamp: new Date(),
                isRead: false,
                linkAction: 'open_shop',
              }
            ];
            setNotifications(initialNotifs);

            for (const n of initialNotifs) {
              await setDoc(doc(db, 'users', user.uid, 'notifications', n.id), {
                type: n.type,
                title: n.title,
                message: n.message,
                timestamp: serverTimestamp(),
                isRead: n.isRead,
                linkAction: n.linkAction,
              }, { merge: true });
            }
          } else {
            setNotifications([]);
          }
        } catch (e) {
          console.warn("Error checking notification seed status:", e);
          setNotifications([]);
        }
      } else {
        setNotifications(remoteNotifs);
      }
    }, (err) => {
      console.warn("Notifications listener warning:", err);
    });

    return () => unsubscribe();
  }, [user]);

  // Realtime Listener for Unread DMs => Create DM Notifications
  useEffect(() => {
    if (!user) return;

    const convQ = query(
      collection(db, 'conversations'),
      where('participantUids', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(convQ, (snapshot) => {
      snapshot.forEach(async (docSnap) => {
        const conv = docSnap.data();
        const unreadCount = conv.unreadCounts?.[user.uid] || 0;
        if (unreadCount > 0) {
          const senderUid = conv.lastMessageSenderUid;
          if (senderUid && senderUid !== user.uid) {
            const partner = conv.participants?.[senderUid];
            const notifId = `dm-${docSnap.id}`;

            const notifData = {
              type: 'dm',
              title: `New Direct Message from ${partner?.displayName || 'User'} 💬`,
              message: conv.lastMessageText || 'You received a new direct message.',
              timestamp: serverTimestamp(),
              isRead: false,
              linkAction: 'open_dm',
              actionData: {
                partnerUid: senderUid,
                partnerName: partner?.displayName,
                partnerPhoto: partner?.photoURL,
                partnerColor: partner?.equippedColor,
              }
            };

            try {
              await setDoc(doc(db, 'users', user.uid, 'notifications', notifId), notifData, { merge: true });
            } catch (err) {
              console.warn("Error saving DM notification:", err);
            }
          }
        }
      });
    }, (err) => {
      console.warn("Conversations listener warning:", err);
    });

    return () => unsubscribe();
  }, [user]);

  // Notification Handlers
  const handleMarkNotificationAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid, 'notifications', id), { isRead: true });
      } catch (err) {
        console.warn("Failed to mark notification as read:", err);
      }
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    if (user) {
      notifications.forEach(async (n) => {
        if (!n.isRead) {
          try {
            await updateDoc(doc(db, 'users', user.uid, 'notifications', n.id), { isRead: true });
          } catch (err) {
            console.warn("Failed to mark notification as read:", err);
          }
        }
      });
    }
    toast("All notifications marked as read! 🧹", "success");
  };

  const handleDeleteNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (user) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'notifications', id));
      } catch (err) {
        console.warn("Failed to delete notification:", err);
      }
    }
  };

  const handleClearAllNotifications = async () => {
    const toDelete = [...notifications];
    setNotifications([]);
    
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { notificationsSeeded: true }, { merge: true });
      } catch (err) {
        console.warn("Failed to mark notificationsSeeded:", err);
      }

      if (toDelete.length > 0) {
        try {
          const batch = writeBatch(db);
          toDelete.forEach((n) => {
            batch.delete(doc(db, 'users', user.uid, 'notifications', n.id));
          });
          await batch.commit();
        } catch (err) {
          console.warn("Failed to batch delete notifications:", err);
          await Promise.all(
            toDelete.map((n) => deleteDoc(doc(db, 'users', user.uid, 'notifications', n.id)).catch(() => {}))
          );
        }
      }
    }
    toast("Notification box cleared! ✨", "info");
  };

  const handleExecuteNotificationAction = (
    action?: string,
    data?: { partnerUid?: string; partnerName?: string; partnerPhoto?: string; partnerColor?: string; gameId?: string }
  ) => {
    if (action === 'open_dm') {
      if (data?.partnerUid) {
        setDmTargetUser({
          uid: data.partnerUid,
          displayName: data.partnerName || 'User',
          photoURL: data.partnerPhoto,
          color: data.partnerColor,
        });
      }
      setIsDMOpen(true);
    } else if (action === 'open_shop') {
      setIsShopOpen(true);
    } else if (action === 'open_updates') {
      setIsUpdateLogsOpen(true);
    } else if (action === 'open_chat') {
      setCurrentTab('chat');
    } else if (action === 'open_leaderboard') {
      setCurrentTab('leaderboard');
    } else if (action === 'open_profile') {
      setIsProfileOpen(true);
    }
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

      const userProfileRef = doc(db, 'users', user.uid);

      if (isVoted) {
        // Un-vote
        currentPath = `users/${user.uid}/votes/${gameId}`;
        await deleteDoc(userVoteRef);

        currentPath = `games/${gameId}`;
        await updateDoc(gameRef, {
          votes: increment(-1)
        });

        // Deduct 10 coins on unvote
        await setDoc(userProfileRef, {
          coins: increment(-10)
        }, { merge: true });

        toast(`Retracted vote for ${gameName} (-10 BloxCoins 🪙)`, 'info');

        await logActivity('unvote', 'Vote Retracted', `Retracted vote for "${gameName}"`, { gameId, gameName });
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

        // Add 10 coins on vote
        await setDoc(userProfileRef, {
          coins: increment(10)
        }, { merge: true });

        // Record voting streak
        const streakResult = await recordUserVotingStreak(user.uid);
        if (streakResult.isNewStreakDay && streakResult.streakCount > 1) {
          toast(`🔥 ${streakResult.streakCount} Day Voting Streak! (+10 BloxCoins 🪙)`, 'success');
        } else {
          toast(`Successfully voted for ${gameName}! (+10 BloxCoins 🪙)`, 'success');
        }

        await logActivity('vote', 'Voted for Experience', `Casted vote for "${gameName}"`, { gameId, gameName });
      }
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, currentPath);
      toast(`Failed to update vote: ${error.message || 'Permission denied'}`, 'error');
    }
  };

  // Shop Handlers
  const handleBuyItem = async (type: 'color' | 'theme' | 'font' | 'title', item: NameColorItem | BackgroundThemeItem | FontItem | TitleItem): Promise<boolean> => {
    if (!user) {
      signIn();
      return false;
    }

    if (userProfileData.coins < item.price) {
      toast(`Not enough BloxCoins! You need ${item.price} coins.`, 'error');
      return false;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      if (type === 'color') {
        const updatedColors = Array.from(new Set([...userProfileData.purchasedColors, item.id]));
        await setDoc(userRef, {
          coins: increment(-item.price),
          purchasedColors: updatedColors,
          equippedColor: item.id,
        }, { merge: true });
        toast(`Purchased & equipped ${item.name}! 🎨`, 'success');
      } else if (type === 'theme') {
        const updatedThemes = Array.from(new Set([...userProfileData.purchasedThemes, item.id]));
        await setDoc(userRef, {
          coins: increment(-item.price),
          purchasedThemes: updatedThemes,
          equippedTheme: item.id,
        }, { merge: true });
        toast(`Purchased & equipped ${item.name} theme! 🌌`, 'success');
      } else if (type === 'font') {
        const currentFonts = userProfileData.purchasedFonts || ['default'];
        const updatedFonts = Array.from(new Set([...currentFonts, item.id]));
        await setDoc(userRef, {
          coins: increment(-item.price),
          purchasedFonts: updatedFonts,
          equippedFont: item.id,
        }, { merge: true });
        toast(`Purchased & equipped ${item.name} font! 🔤`, 'success');
      } else if (type === 'title') {
        const currentTitles = userProfileData.purchasedTitles || ['default'];
        const updatedTitles = Array.from(new Set([...currentTitles, item.id]));
        await setDoc(userRef, {
          coins: increment(-item.price),
          purchasedTitles: updatedTitles,
          equippedTitle: item.id,
        }, { merge: true });
        toast(`Purchased & equipped "${item.name}" title! 👑`, 'success');
      }
      return true;
    } catch (err: any) {
      console.error('Failed to buy item:', err);
      toast('Transaction failed. Please try again.', 'error');
      return false;
    }
  };

  const handleEquipItem = async (type: 'color' | 'theme' | 'font' | 'title', itemId: string) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      if (type === 'color') {
        await setDoc(userRef, { equippedColor: itemId }, { merge: true });
        const colorItem = getNameColorStyle(itemId);
        toast(`Equipped ${colorItem.name}! ✨`, 'success');
      } else if (type === 'theme') {
        await setDoc(userRef, { equippedTheme: itemId }, { merge: true });
        const themeItem = getBackgroundThemeStyle(itemId);
        toast(`Equipped ${themeItem.name} background! 🌌`, 'success');
      } else if (type === 'font') {
        await setDoc(userRef, { equippedFont: itemId }, { merge: true });
        const fontItem = getFontItemStyle(itemId);
        toast(`Equipped ${fontItem.name} font! 🔤`, 'success');
      } else if (type === 'title') {
        await setDoc(userRef, { equippedTitle: itemId }, { merge: true });
        const titleItem = getTitleItemStyle(itemId);
        toast(`Equipped "${titleItem.title || 'No Title'}" title! 👑`, 'success');
      }
    } catch (err) {
      console.error('Failed to equip item:', err);
      toast('Failed to equip item.', 'error');
    }
  };

  const handleRequestCustomTitle = async (requestedTitle: string): Promise<boolean> => {
    if (!user) {
      signIn();
      return false;
    }

    // Check 10 minute cooldown
    const nowMs = Date.now();
    let lastReqTime = userProfileData.lastCustomTitleRequestTime || 0;
    if (customTitleRequest?.requestedAt) {
      const ra = customTitleRequest.requestedAt;
      if (typeof ra.toMillis === 'function') {
        lastReqTime = Math.max(lastReqTime, ra.toMillis());
      } else if (typeof ra.seconds === 'number') {
        lastReqTime = Math.max(lastReqTime, ra.seconds * 1000);
      }
    }
    try {
      const local = localStorage.getItem(`lastCustomTitleRequestTime_${user.uid}`);
      if (local) {
        lastReqTime = Math.max(lastReqTime, parseInt(local, 10) || 0);
      }
    } catch (e) {}

    const COOLDOWN_MS = 10 * 60 * 1000;
    if (lastReqTime > 0 && (nowMs - lastReqTime) < COOLDOWN_MS) {
      const remainingSec = Math.ceil((COOLDOWN_MS - (nowMs - lastReqTime)) / 1000);
      const mins = Math.floor(remainingSec / 60);
      const secs = remainingSec % 60;
      toast(`Cooldown active! Please wait ${mins}m ${secs}s before creating another custom title.`, 'error');
      return false;
    }

    if (userProfileData.coins < 1000) {
      toast('Not enough BloxCoins! You need 1,000 coins to request a custom title.', 'error');
      return false;
    }

    try {
      // Deduct 1,000 coins & set cooldown timestamp
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        coins: increment(-1000),
        lastCustomTitleRequestTime: nowMs
      });

      try {
        localStorage.setItem(`lastCustomTitleRequestTime_${user.uid}`, nowMs.toString());
      } catch (e) {}

      // Submit custom title request
      await addDoc(collection(db, 'customTitleRequests'), {
        userId: user.uid,
        userDisplayName: user.displayName || 'Player',
        userEmail: user.email || '',
        requestedTitle: requestedTitle.trim(),
        status: 'pending',
        requestedAt: serverTimestamp()
      });

      await logActivity(
        'custom_title_request',
        'Requested Custom Title',
        `${user.displayName || 'Player'} submitted custom title request "${requestedTitle.trim()}" for 1,000 coins.`
      );

      toast('Submitted custom title request for 1,000 BloxCoins! Admins will review it soon. 👑', 'success');
      return true;
    } catch (err: any) {
      console.error('Failed to request custom title:', err);
      toast('Failed to submit request. Please try again.', 'error');
      return false;
    }
  };

  const handleSaveCustomTheme = async (config: CustomThemeConfig): Promise<boolean> => {
    if (!user) {
      signIn();
      return false;
    }

    const purchasedThemes = userProfileData.purchasedThemes || ['default'];
    const isAlreadyOwned = purchasedThemes.includes('custom_discord');

    if (!isAlreadyOwned && userProfileData.coins < 1000) {
      toast('Not enough BloxCoins! You need 1,000 coins to create a Custom Discord Theme.', 'error');
      return false;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      const updatedThemes = Array.from(new Set([...purchasedThemes, 'custom_discord']));

      await setDoc(userRef, {
        coins: isAlreadyOwned ? userProfileData.coins : increment(-1000),
        purchasedThemes: updatedThemes,
        equippedTheme: 'custom_discord',
        customThemeConfig: config,
      }, { merge: true });

      if (!isAlreadyOwned) {
        toast('Purchased & applied Custom Discord Theme for 1,000 BloxCoins! 🎨', 'success');
        await logActivity(
          'shop_buy',
          'Created Custom Discord Theme',
          `${user.displayName || 'Player'} unlocked a Custom Discord Theme for 1,000 coins.`
        );
      } else {
        toast('Updated & equipped Custom Discord Theme! 🎨', 'success');
      }
      return true;
    } catch (err: any) {
      console.error('Failed to save custom theme:', err);
      toast('Failed to save theme. Please try again.', 'error');
      return false;
    }
  };

  const handleClaimDailyBonus = async () => {
    if (!user) return;
    const todayStr = new Date().toISOString().split('T')[0];
    if (userProfileData.lastDailyBonusDate === todayStr) {
      toast('You have already claimed today\'s bonus!', 'info');
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        coins: increment(25),
        lastDailyBonusDate: todayStr,
      }, { merge: true });
      toast('Claimed +25 Daily BloxCoins! 🎁', 'success');
    } catch (err) {
      console.error('Failed to claim bonus:', err);
      toast('Failed to claim bonus.', 'error');
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
      const docRef = await addDoc(collection(db, 'games'), {
        ...sanitizedGameData,
        votes: 0,
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });
      toast(`Successfully submitted "${gameData.name}"! 🎉`, 'success');

      await logActivity('add_game', 'New Game Added', `Submitted "${gameData.name}" to BloxVote`, { gameId: docRef.id, gameName: gameData.name });
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

      await logActivity('delete_game', 'Experience Removed', `Deleted "${gameName}" from leaderboard`, { gameId, gameName });
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

  const handleOpenDM = (targetUser?: { uid: string; displayName: string; photoURL?: string; color?: string }) => {
    if (!user) {
      signIn();
      return;
    }
    if (targetUser) {
      setDmTargetUser(targetUser);
    }
    setIsDMOpen(true);
  };

  const filteredGames = games.filter(game => 
    (game.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (game.creator || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  const activeThemeId = previewThemeId || userProfileData.equippedTheme;
  const backgroundThemeStyle = getBackgroundThemeStyle(activeThemeId, userProfileData.customThemeConfig);

  const activeFontId = previewFontId || userProfileData.equippedFont;
  const fontStyle = getFontItemStyle(activeFontId, customAdminFonts);

  const unreadNotificationCount = notifications.filter(n => !n.isRead).length;

  return (
    <div
      style={{ ...backgroundThemeStyle.style, fontFamily: fontStyle.fontFamily }}
      className={`min-h-screen font-sans transition-all duration-500 ${backgroundThemeStyle.backgroundClass}`}
    >
      {/* Navigation */}
      <nav className="sticky top-0 z-40 border-b border-zinc-800 bg-black/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-[4rem] py-2.5 items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentTab('leaderboard')}>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-900/20 shrink-0">
                <Gamepad2 className="text-white" size={20} />
              </div>
              <span className="text-xl sm:text-2xl font-black tracking-tighter text-white">BLOXVOTE</span>
            </div>

            {/* Navigation Tabs */}
            <div className="hidden md:flex items-center gap-1 rounded-full bg-zinc-900 border border-zinc-800 p-1">
              <button
                onClick={() => setCurrentTab('leaderboard')}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs sm:text-sm font-bold transition-all",
                  currentTab === 'leaderboard' ? "bg-zinc-800 text-white shadow-md border border-zinc-700/30" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Trophy size={14} />
                Leaderboard
              </button>
              <button
                onClick={() => setCurrentTab('analytics')}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs sm:text-sm font-bold transition-all",
                  currentTab === 'analytics' ? "bg-zinc-800 text-white shadow-md border border-zinc-700/30" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <BarChart3 size={14} />
                Insights & Graphs
              </button>
              <button
                onClick={() => setCurrentTab('chat')}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs sm:text-sm font-bold transition-all relative",
                  currentTab === 'chat' ? "bg-blue-600 text-white shadow-md border border-blue-500/30" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <MessageSquare size={14} />
                Global Chat
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </button>
              <button
                onClick={() => setIsUpdateLogsOpen(true)}
                className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs sm:text-sm font-bold text-zinc-400 hover:text-white transition-all hover:bg-zinc-800/60"
                title="View Release Notes & Patch Logs"
              >
                <Sparkles size={14} className="text-blue-400" />
                Update Logs
              </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Notification Center Pill */}
              <button
                onClick={() => setIsNotificationsOpen(true)}
                className="flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 px-3.5 py-1.5 text-xs font-black text-blue-300 transition-all hover:bg-blue-600/30 active:scale-95 shadow-md shadow-blue-950/30 relative"
                title="Open Notifications Hub"
              >
                <Bell size={14} className="text-blue-400" />
                <span>Alerts</span>
                {unreadNotificationCount > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white px-1 shadow-sm animate-pulse">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>

              {/* Coins & Shop Pill */}
              <button
                onClick={() => setIsShopOpen(true)}
                className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 px-3.5 py-1.5 text-xs font-black text-amber-300 transition-all hover:bg-amber-500/30 active:scale-95 shadow-md shadow-amber-950/30"
                title="Open BloxCoins Shop & Customize"
              >
                <Coins size={15} className="text-amber-400 fill-amber-400" />
                <span>{userProfileData.coins.toLocaleString()} Coins</span>
              </button>

              {/* DMs Quick Pill */}
              {user && (
                <button
                  onClick={() => handleOpenDM()}
                  className="flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 px-3.5 py-1.5 text-xs font-black text-violet-300 transition-all hover:bg-violet-600/30 active:scale-95 shadow-md shadow-violet-950/30 relative"
                  title="Open Direct Messages"
                >
                  <MessageSquare size={14} className="text-violet-400" />
                  <span>DMs</span>
                  <span className="flex h-2 w-2 rounded-full bg-violet-400 animate-ping" />
                </button>
              )}

              {user ? (
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <div 
                    onClick={openProfile}
                    className="hidden xl:flex items-center gap-2 cursor-pointer group transition-opacity duration-150"
                    title="View Profile & Vote History"
                  >
                    <div className="text-right">
                      <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Logged in as</p>
                      <p className={`text-xs font-bold transition-colors ${getNameColorStyle(userProfileData.equippedColor).className}`}>{user.displayName}</p>
                    </div>
                    <img 
                      src={user.photoURL || ''} 
                      alt={user.displayName || ''} 
                      className="h-8 w-8 rounded-full border-2 border-zinc-800 group-hover:border-blue-500/50 transition-colors object-cover"
                    />
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => setIsAdminDashboardOpen(true)}
                      className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 transition-all hover:bg-amber-500/20 active:scale-95 shadow-md shadow-amber-900/10"
                    >
                      <Shield size={14} className="text-amber-400" />
                      <span>Admin Suite</span>
                    </button>
                  )}
                  {userStreak && userStreak.streakCount > 0 && (
                    <button
                      onClick={openProfile}
                      className="flex items-center gap-1.5 rounded-full border border-orange-500/40 bg-gradient-to-r from-orange-500/20 to-amber-500/20 px-3 py-1.5 text-xs font-black text-orange-400 transition-all hover:bg-orange-500/30 active:scale-95 shadow-md shadow-orange-950/30"
                      title="Your Voting Streak"
                    >
                      <Flame size={14} className="text-orange-400 fill-orange-400 animate-pulse" />
                      <span>{userStreak.streakCount} {userStreak.streakCount === 1 ? 'Day' : 'Days'} Streak</span>
                    </button>
                  )}
                  <button
                    onClick={openProfile}
                    className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/40 px-3 py-1.5 text-xs sm:text-sm font-bold text-blue-400 transition-all hover:bg-zinc-800 hover:text-blue-300 active:scale-95"
                  >
                    <CircleUser size={15} />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={logout}
                    className="flex items-center gap-1.5 rounded-full border border-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-400 transition-all hover:bg-zinc-800 hover:text-white active:scale-95"
                  >
                    <LogOut size={14} />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={signIn}
                  className="flex items-center gap-2 rounded-full bg-white px-5 py-2 text-xs sm:text-sm font-bold text-black transition-all hover:bg-zinc-200 active:scale-95"
                >
                  <LogIn size={16} />
                  Sign In with Google
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Global Announcement Banner */}
        <AnnouncementBanner announcement={announcement} />

        {/* Hero Section */}
        {currentTab !== 'chat' && (
          <div className="relative mb-8 sm:mb-10 overflow-hidden rounded-2xl sm:rounded-[2.5rem] bg-zinc-900 px-4 py-8 text-center sm:px-12 sm:py-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.15),transparent_50%)]" />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10"
            >
              <div className="mb-3 sm:mb-4 inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-blue-600/10 px-3 py-1 sm:px-4 text-xs sm:text-sm font-bold text-blue-400 border border-blue-500/20">
                <TrendingUp size={14} className="sm:w-[15px] sm:h-[15px]" />
                Trending in the Metaverse
              </div>
              <h1 className="mb-3 sm:mb-4 text-2xl font-black tracking-tight text-white sm:text-5xl md:text-6xl leading-tight">
                Vote for your <span className="text-blue-500 italic">favorite</span> <br className="hidden sm:block" /> Roblox experience.
              </h1>
              <p className="mx-auto mb-6 max-w-2xl text-xs sm:text-base text-zinc-400 leading-relaxed">
                Discover the most popular games on Roblox, voted by the community. 
                Earn BloxCoins by voting to buy custom name colors & background themes!
              </p>
              <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                <button
                  onClick={() => user ? setIsAddModalOpen(true) : signIn()}
                  className="flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-base font-bold text-white shadow-xl shadow-blue-900/20 transition-all hover:bg-blue-500 hover:scale-105 active:scale-95"
                >
                  <Plus size={18} className="sm:w-5 sm:h-5" />
                  Add Your Favorite Game
                </button>
                <button
                  onClick={() => setIsShopOpen(true)}
                  className="flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-base font-bold text-amber-300 transition-all hover:bg-amber-500/20 hover:scale-105 active:scale-95"
                >
                  <ShoppingBag size={18} />
                  Open Cosmetic Shop
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Mobile Tab Switcher */}
        <div className="flex md:hidden items-center justify-center mb-6 gap-1 rounded-2xl bg-zinc-900 border border-zinc-800 p-1 overflow-x-auto max-w-full scrollbar-none">
          <button
            onClick={() => setCurrentTab('leaderboard')}
            className={cn(
              "flex-1 min-w-[80px] flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all shrink-0",
              currentTab === 'leaderboard' ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/30" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <Trophy size={14} />
            Leaderboard
          </button>
          <button
            onClick={() => setCurrentTab('analytics')}
            className={cn(
              "flex-1 min-w-[80px] flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all shrink-0",
              currentTab === 'analytics' ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/30" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <BarChart3 size={14} />
            Analytics
          </button>
          <button
            onClick={() => setCurrentTab('chat')}
            className={cn(
              "flex-1 min-w-[80px] flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all shrink-0",
              currentTab === 'chat' ? "bg-blue-600 text-white shadow-sm border border-blue-500/30" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <MessageSquare size={14} />
            Chat
          </button>
          <button
            onClick={() => setIsUpdateLogsOpen(true)}
            className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold text-zinc-400 hover:text-white transition-all shrink-0"
          >
            <Sparkles size={14} className="text-blue-400" />
            Updates
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
              {/* Featured Games Showcase */}
              <FeaturedGamesBanner
                featuredGames={featuredGames}
                onVote={handleVote}
                userVotes={userVotes}
              />

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
                <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="h-48 animate-pulse rounded-2xl bg-zinc-900/50 border border-zinc-800" />
                  ))}
                </div>
              ) : (
                <LayoutGroup id="game-grid">
                  <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
                    <AnimatePresence>
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
                </LayoutGroup>
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
          ) : currentTab === 'analytics' ? (
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
          ) : (
            <motion.div
              key="chat-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <PublicChat
                user={user}
                profileData={userProfileData}
                isAdmin={isAdmin}
                onOpenDM={handleOpenDM}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-zinc-900 bg-black/80 py-12">
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
        userStreak={userStreak}
        profileData={userProfileData}
        onVote={handleVote}
        onOpenShop={() => setIsShopOpen(true)}
      />

      <ShopModal
        isOpen={isShopOpen}
        onClose={() => {
          setIsShopOpen(false);
          setPreviewThemeId(null);
          setPreviewFontId(null);
        }}
        user={user}
        profileData={userProfileData}
        onBuyItem={handleBuyItem}
        onEquipItem={handleEquipItem}
        onClaimDailyBonus={handleClaimDailyBonus}
        onRequestCustomTitle={handleRequestCustomTitle}
        customTitleRequest={customTitleRequest}
        onSaveCustomTheme={handleSaveCustomTheme}
        customAdminTitles={customAdminTitles}
        customAdminFonts={customAdminFonts}
        previewThemeId={previewThemeId}
        onPreviewTheme={setPreviewThemeId}
        previewFontId={previewFontId}
        onPreviewFont={setPreviewFontId}
      />

      <AdminDashboard
        isOpen={isAdminDashboardOpen}
        onClose={() => setIsAdminDashboardOpen(false)}
        games={games}
        onVote={handleVote}
        customAdminTitles={customAdminTitles}
        customAdminFonts={customAdminFonts}
      />

      <UpdateLogsModal
        isOpen={isUpdateLogsOpen}
        onClose={() => setIsUpdateLogsOpen(false)}
        isAdmin={isAdmin}
        onOpenAdminWithTab={(tab) => {
          setIsAdminDashboardOpen(true);
        }}
      />

      <DirectMessagesModal
        isOpen={isDMOpen}
        onClose={() => {
          setIsDMOpen(false);
          setDmTargetUser(null);
        }}
        currentUser={user}
        userProfileData={userProfileData}
        initialTargetUser={dmTargetUser}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkNotificationAsRead}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onDeleteNotification={handleDeleteNotification}
        onClearAll={handleClearAllNotifications}
        onExecuteAction={handleExecuteNotificationAction}
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
