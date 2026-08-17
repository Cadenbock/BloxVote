import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  limit,
  increment,
  arrayUnion
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
  Megaphone,
  MessageSquare,
  Send,
  Bot,
  FileText,
  Edit3,
  Bug,
  Scale,
  Zap,
  Coins,
  Hammer,
  Ban,
  ShieldAlert,
  XCircle,
  Award,
  Camera,
  MessageSquarePlus,
  Lightbulb,
  Palette,
  MessageCircle,
  Eye,
  EyeOff,
  Inbox,
  Filter,
  CheckCircle,
  Archive
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
import { Game, Activity, AdminUser, AdminChatMessage, UpdateLog, ChatFlag, CustomTitleRequest, AvatarRequest, UserFeedback, FeedbackCategory, FeedbackStatus } from '../types';
import { useToast } from './Toast';
import { logActivity } from '../lib/activity';
import { cn } from '../lib/utils';
import { filterChatMessage, DEFAULT_PROFANITY_PATTERNS } from '../lib/chatFilter';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  games: Game[];
  onVote: (gameId: string) => Promise<void>;
  customAdminTitles?: any[];
  customAdminFonts?: any[];
}

type AdminTab = 'overview' | 'games' | 'coins' | 'bans' | 'avatars' | 'titles' | 'announcement' | 'updates' | 'chat' | 'feedback' | 'admins' | 'activity';

export default function AdminDashboard({ isOpen, onClose, games, onVote, customAdminTitles = [], customAdminFonts = [] }: AdminDashboardProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [searchGameQuery, setSearchGameQuery] = useState('');

  // Custom Title Requests State
  const [customTitleRequests, setCustomTitleRequests] = useState<CustomTitleRequest[]>([]);
  const [declineModalReq, setDeclineModalReq] = useState<CustomTitleRequest | null>(null);
  const [declineReason, setDeclineReason] = useState<string>('Title violates community guidelines or contains inappropriate words.');
  const [isProcessingTitleReq, setIsProcessingTitleReq] = useState<string | null>(null);

  // Avatar Requests State
  const [avatarRequests, setAvatarRequests] = useState<AvatarRequest[]>([]);
  const [declineAvatarModalReq, setDeclineAvatarModalReq] = useState<AvatarRequest | null>(null);
  const [declineAvatarReason, setDeclineAvatarReason] = useState<string>('Avatar image violates community guidelines.');
  const [isProcessingAvatarReq, setIsProcessingAvatarReq] = useState<string | null>(null);

  // User Coins & Economy State
  const [userProfiles, setUserProfiles] = useState<any[]>([]);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [isGrantingCoins, setIsGrantingCoins] = useState<string | null>(null);
  const [manualGrantUid, setManualGrantUid] = useState('');
  const [manualGrantName, setManualGrantName] = useState('');
  const [manualGrantAmount, setManualGrantAmount] = useState<number>(100);
  
  // Global Announcement state
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementEnabled, setAnnouncementEnabled] = useState(false);
  const [announcementDuration, setAnnouncementDuration] = useState<number>(7);
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);
  const [announcementUpdatedAt, setAnnouncementUpdatedAt] = useState<any>(null);
  const [announcementUpdatedBy, setAnnouncementUpdatedBy] = useState<string>('');

  // Admin Chat & Filter state
  const [chatMessages, setChatMessages] = useState<AdminChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [chatSubTab, setChatSubTab] = useState<'staff' | 'flags' | 'filter'>('staff');
  const [chatFlags, setChatFlags] = useState<ChatFlag[]>([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Custom Censored Words state
  const [customCensoredWords, setCustomCensoredWords] = useState<string[]>([]);
  const [newCensoredWordInput, setNewCensoredWordInput] = useState<string>('');
  const [filterTestInput, setFilterTestInput] = useState<string>('');
  const [searchCensoredQuery, setSearchCensoredQuery] = useState<string>('');
  const [isSavingWord, setIsSavingWord] = useState<boolean>(false);

  // User Ban State
  const [bannedUsersMap, setBannedUsersMap] = useState<Record<string, any>>({});
  const [banningUser, setBanningUser] = useState<{ uid: string; displayName: string; reason?: string } | null>(null);
  const [banDurationMinutes, setBanDurationMinutes] = useState<number>(60); // default 60m (1 hour)
  const [banReasonInput, setBanReasonInput] = useState<string>('Violation of community chat guidelines');

  // Update Logs state
  const [updateLogs, setUpdateLogs] = useState<UpdateLog[]>([]);
  const [editingLog, setEditingLog] = useState<UpdateLog | null>(null);
  const [logTitle, setLogTitle] = useState('');
  const [logVersion, setLogVersion] = useState('');
  const [logCategory, setLogCategory] = useState<'major' | 'feature' | 'fix' | 'balance'>('feature');
  const [logChangesText, setLogChangesText] = useState('');
  const [isSavingLog, setIsSavingLog] = useState(false);

  // User Feedback State
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);
  const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState<FeedbackCategory | 'all'>('all');
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<FeedbackStatus | 'all'>('all');
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [feedbackOnlyFlagged, setFeedbackOnlyFlagged] = useState(false);
  const [revealedProfanityMap, setRevealedProfanityMap] = useState<Record<string, boolean>>({});
  const [replyingFeedback, setReplyingFeedback] = useState<UserFeedback | null>(null);
  const [replyMessageInput, setReplyMessageInput] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [deletingFeedback, setDeletingFeedback] = useState<UserFeedback | null>(null);
  const [isDeletingFeedback, setIsDeletingFeedback] = useState(false);
  const [bountyFeedback, setBountyFeedback] = useState<UserFeedback | null>(null);
  const [bountyAmount, setBountyAmount] = useState<number>(100);
  const [bountyReason, setBountyReason] = useState<string>('Bug Bounty & Helpful Feedback');
  const [isGrantingBounty, setIsGrantingBounty] = useState(false);

  // Roblox OAuth 2.0 Global Setting
  const [robloxOAuthEnabled, setRobloxOAuthEnabled] = useState(false);
  const [isTogglingRobloxOAuth, setIsTogglingRobloxOAuth] = useState(false);

  // Modal states
  const [featuringGameModal, setFeaturingGameModal] = useState<Game | null>(null);
  const [featureReasonInput, setFeatureReasonInput] = useState<string>('');
  const [isSubmittingFeature, setIsSubmittingFeature] = useState<boolean>(false);
  const [deletingGame, setDeletingGame] = useState<Game | null>(null);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminUid, setNewAdminUid] = useState('');
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
  const [removingAdmin, setRemovingAdmin] = useState<AdminUser | null>(null);

  const currentUser = auth.currentUser;
  const SUPER_ADMIN_EMAIL = 'mondo7108@gmail.com';

  // Real-time Users Listener for Economy Tab
  useEffect(() => {
    if (!isOpen || activeTab !== 'coins') return;

    const usersQuery = query(collection(db, 'users'), limit(50));
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const list = snapshot.docs.map(d => ({
        uid: d.id,
        ...d.data()
      }));
      setUserProfiles(list);
    }, (err) => {
      console.warn('User profiles listener warning:', err);
    });

    return () => unsubscribe();
  }, [isOpen, activeTab]);

  // Real-time Custom Title Requests Listener
  useEffect(() => {
    if (!isOpen) return;

    const reqQuery = query(collection(db, 'customTitleRequests'), orderBy('requestedAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(reqQuery, (snapshot) => {
      const list = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as CustomTitleRequest));
      setCustomTitleRequests(list);
    }, (err) => {
      console.warn('Custom title requests listener warning:', err);
    });

    return () => unsubscribe();
  }, [isOpen]);

  const handleAcceptCustomTitleRequest = async (req: CustomTitleRequest) => {
    setIsProcessingTitleReq(req.id);
    try {
      // 1. Update request status to accepted
      await updateDoc(doc(db, 'customTitleRequests', req.id), {
        status: 'accepted',
        reviewedAt: serverTimestamp(),
        reviewedBy: currentUser?.email || 'Admin'
      });

      // 2. Grant title to user
      const userRef = doc(db, 'users', req.userId);
      await updateDoc(userRef, {
        equippedTitle: req.requestedTitle,
        purchasedTitles: arrayUnion(req.requestedTitle)
      });

      // 3. Send notification to user
      await addDoc(collection(db, 'users', req.userId, 'notifications'), {
        title: 'Custom Title Approved! 🎉',
        message: `Your custom title "${req.requestedTitle}" has been ACCEPTED by admins and equipped to your name!`,
        type: 'shop',
        read: false,
        timestamp: serverTimestamp()
      });

      await logActivity(
        'admin_add',
        'Approved Custom Title',
        `Approved custom title "${req.requestedTitle}" for ${req.userDisplayName}`
      );

      toast(`Approved custom title "${req.requestedTitle}"!`, 'success');
    } catch (err: any) {
      console.error('Failed to accept custom title:', err);
      toast(`Failed to accept title: ${err.message}`, 'error');
    } finally {
      setIsProcessingTitleReq(null);
    }
  };

  const handleDeclineCustomTitleRequest = async () => {
    if (!declineModalReq) return;
    const req = declineModalReq;
    const reason = declineReason.trim() || 'Violated community guidelines.';
    setIsProcessingTitleReq(req.id);

    try {
      // 1. Update request status to declined
      await updateDoc(doc(db, 'customTitleRequests', req.id), {
        status: 'declined',
        rejectionReason: reason,
        reviewedAt: serverTimestamp(),
        reviewedBy: currentUser?.email || 'Admin'
      });

      // 2. Refund 1,000 BloxCoins to user
      const userRef = doc(db, 'users', req.userId);
      await updateDoc(userRef, {
        coins: increment(1000)
      });

      // 3. Send notification to user
      await addDoc(collection(db, 'users', req.userId, 'notifications'), {
        title: 'Custom Title Request Declined',
        message: `Your custom title request "${req.requestedTitle}" was declined. Reason: ${reason}. Your 1,000 BloxCoins have been refunded to your balance.`,
        type: 'system',
        read: false,
        timestamp: serverTimestamp()
      });

      await logActivity(
        'admin_remove',
        'Declined Custom Title',
        `Declined title "${req.requestedTitle}" for ${req.userDisplayName}. Reason: ${reason}`
      );

      toast(`Declined custom title and refunded 1,000 coins to ${req.userDisplayName}`, 'info');
      setDeclineModalReq(null);
    } catch (err: any) {
      console.error('Failed to decline custom title:', err);
      toast(`Failed to decline title: ${err.message}`, 'error');
    } finally {
      setIsProcessingTitleReq(null);
    }
  };

  // Real-time Avatar Requests Listener
  useEffect(() => {
    if (!isOpen) return;

    const reqQuery = query(collection(db, 'avatarRequests'), orderBy('requestedAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(reqQuery, (snapshot) => {
      const list = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as AvatarRequest));
      setAvatarRequests(list);
    }, (err) => {
      console.warn('Avatar requests listener warning:', err);
    });

    return () => unsubscribe();
  }, [isOpen]);

  const handleAcceptAvatarRequest = async (req: AvatarRequest) => {
    setIsProcessingAvatarReq(req.id);
    try {
      // 1. Update request status to accepted
      await updateDoc(doc(db, 'avatarRequests', req.id), {
        status: 'accepted',
        reviewedAt: serverTimestamp(),
        reviewedBy: currentUser?.email || 'Admin'
      });

      // 2. Set user photoURL in users collection
      const userRef = doc(db, 'users', req.userId);
      await updateDoc(userRef, {
        photoURL: req.requestedPhotoURL
      });

      // 3. Send notification to user
      await addDoc(collection(db, 'users', req.userId, 'notifications'), {
        title: 'Avatar Image Approved! 🎉',
        message: `Your requested custom avatar image has been APPROVED by admins and published to your profile!`,
        type: 'system',
        read: false,
        timestamp: serverTimestamp()
      });

      await logActivity(
        'approve_avatar',
        'Approved Avatar Request',
        `Approved avatar image request for ${req.userDisplayName}`
      );

      toast(`Approved avatar request for ${req.userDisplayName}!`, 'success');
    } catch (err: any) {
      console.error('Failed to accept avatar request:', err);
      toast(`Failed to accept avatar: ${err.message}`, 'error');
    } finally {
      setIsProcessingAvatarReq(null);
    }
  };

  const handleDeclineAvatarRequest = async () => {
    if (!declineAvatarModalReq) return;
    const req = declineAvatarModalReq;
    const reason = declineAvatarReason.trim() || 'Violated community guidelines.';
    setIsProcessingAvatarReq(req.id);

    try {
      // 1. Update request status to declined
      await updateDoc(doc(db, 'avatarRequests', req.id), {
        status: 'declined',
        rejectionReason: reason,
        reviewedAt: serverTimestamp(),
        reviewedBy: currentUser?.email || 'Admin'
      });

      // 2. Send notification to user
      await addDoc(collection(db, 'users', req.userId, 'notifications'), {
        title: 'Avatar Request Declined ⚠️',
        message: `Your requested avatar image was declined by an admin. Reason: ${reason}`,
        type: 'system',
        read: false,
        timestamp: serverTimestamp()
      });

      await logActivity(
        'decline_avatar',
        'Declined Avatar Request',
        `Declined avatar image request for ${req.userDisplayName}. Reason: ${reason}`
      );

      toast(`Declined avatar request for ${req.userDisplayName}`, 'info');
      setDeclineAvatarModalReq(null);
    } catch (err: any) {
      console.error('Failed to decline avatar request:', err);
      toast(`Failed to decline avatar: ${err.message}`, 'error');
    } finally {
      setIsProcessingAvatarReq(null);
    }
  };

  // Real-time Chat Flags Listener
  useEffect(() => {
    if (!isOpen) return;

    const flagsQuery = query(collection(db, 'chatFlags'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribe = onSnapshot(flagsQuery, (snapshot) => {
      const list: ChatFlag[] = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as ChatFlag));
      setChatFlags(list);
    }, (err) => {
      console.warn('Chat flags listener warning:', err);
    });

    return () => unsubscribe();
  }, [isOpen]);

  // Real-time Banned Users Listener
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = onSnapshot(collection(db, 'bannedUsers'), (snapshot) => {
      const map: Record<string, any> = {};
      snapshot.docs.forEach((d) => {
        map[d.id] = { id: d.id, ...d.data() };
      });
      setBannedUsersMap(map);
    }, (err) => {
      console.warn('Banned users listener warning:', err);
    });

    return () => unsubscribe();
  }, [isOpen]);

  // Real-time listener for Censored Words in settings/chatFilter
  useEffect(() => {
    if (!isOpen) return;
    const filterRef = doc(db, 'settings', 'chatFilter');
    const unsubscribe = onSnapshot(filterRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data.words)) {
          setCustomCensoredWords(data.words);
        }
      }
    }, (err) => {
      console.warn('Censored words listener warning:', err);
    });

    return () => unsubscribe();
  }, [isOpen]);

  const handleAddCensoredWord = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const wordToAdd = newCensoredWordInput.trim().toLowerCase();
    if (!wordToAdd) return;

    if (customCensoredWords.includes(wordToAdd)) {
      toast(`"${wordToAdd}" is already in the censored list!`, 'info');
      return;
    }

    setIsSavingWord(true);
    const updated = [...customCensoredWords, wordToAdd];
    try {
      await setDoc(doc(db, 'settings', 'chatFilter'), { words: updated }, { merge: true });
      setCustomCensoredWords(updated);
      setNewCensoredWordInput('');
      toast(`Added "${wordToAdd}" to Global Chat & DM filter!`, 'success');
      logActivity('admin_add', 'Censored Word Added', `Added custom censored word: "${wordToAdd}"`);
    } catch (err: any) {
      toast(`Failed to add word: ${err.message}`, 'error');
    } finally {
      setIsSavingWord(false);
    }
  };

  const handleRemoveCensoredWord = async (wordToRemove: string) => {
    const updated = customCensoredWords.filter((w) => w !== wordToRemove);
    try {
      await setDoc(doc(db, 'settings', 'chatFilter'), { words: updated }, { merge: true });
      setCustomCensoredWords(updated);
      toast(`Removed "${wordToRemove}" from censored list.`, 'info');
      logActivity('admin_remove', 'Censored Word Removed', `Removed custom censored word: "${wordToRemove}"`);
    } catch (err: any) {
      toast(`Failed to update list: ${err.message}`, 'error');
    }
  };

  const handleDeleteChatFlag = async (flagId: string) => {
    try {
      await deleteDoc(doc(db, 'chatFlags', flagId));
      toast('Flag alert dismissed.', 'info');
    } catch (err: any) {
      toast(`Could not delete flag: ${err.message}`, 'error');
    }
  };

  const handleBanUser = async (targetUid: string, targetDisplayName: string, durationMinutes: number, reason: string) => {
    if (!targetUid) return;
    try {
      const now = Date.now();
      const bannedUntil = durationMinutes === -1 ? -1 : now + durationMinutes * 60 * 1000;

      const banData = {
        bannedUntil,
        banReason: reason || 'Violation of community chat guidelines',
        bannedAt: serverTimestamp(),
        bannedBy: currentUser?.displayName || currentUser?.email || 'Admin',
        userDisplayName: targetDisplayName || 'Player',
        userUid: targetUid
      };

      await setDoc(doc(db, 'bannedUsers', targetUid), banData);
      await setDoc(doc(db, 'users', targetUid), {
        isBanned: true,
        bannedUntil,
        banReason: reason || 'Violation of community chat guidelines'
      }, { merge: true });

      const durationLabel = durationMinutes === -1 ? 'permanently' : `for ${durationMinutes} minutes`;
      await logActivity(
        'admin_add',
        'User Banned 🔨',
        `${currentUser?.displayName || 'Admin'} banned ${targetDisplayName || targetUid} ${durationLabel}`
      );

      toast(`Successfully banned ${targetDisplayName || 'user'} ${durationLabel}! 🔨`, 'success');
      setBanningUser(null);
    } catch (err: any) {
      console.error('Ban error:', err);
      toast(`Failed to ban user: ${err.message}`, 'error');
    }
  };

  const handleUnbanUser = async (targetUid: string, targetDisplayName: string) => {
    try {
      await deleteDoc(doc(db, 'bannedUsers', targetUid));
      await setDoc(doc(db, 'users', targetUid), {
        isBanned: false,
        bannedUntil: null,
        banReason: null
      }, { merge: true });

      await logActivity(
        'admin_remove',
        'User Unbanned 🕊️',
        `${currentUser?.displayName || 'Admin'} unbanned ${targetDisplayName || targetUid}`
      );

      toast(`Unbanned ${targetDisplayName || 'user'}.`, 'success');
    } catch (err: any) {
      toast(`Failed to unban user: ${err.message}`, 'error');
    }
  };

  const handleGrantCoins = async (targetUid: string, targetDisplayName: string, amount: number) => {
    if (!targetUid || amount === 0) return;
    setIsGrantingCoins(targetUid);
    try {
      const userRef = doc(db, 'users', targetUid);
      await setDoc(userRef, {
        coins: increment(amount),
        displayName: targetDisplayName || 'Player'
      }, { merge: true });

      await logActivity(
        'admin_grant_coins',
        'Granted BloxCoins',
        `${currentUser?.displayName || 'Admin'} ${amount >= 0 ? 'added' : 'deducted'} ${Math.abs(amount)} BloxCoins ${amount >= 0 ? 'to' : 'from'} ${targetDisplayName || targetUid}`
      );

      toast(`Successfully ${amount >= 0 ? 'added' : 'deducted'} ${Math.abs(amount)} BloxCoins ${amount >= 0 ? 'to' : 'from'} ${targetDisplayName || 'user'}! 🪙`, 'success');
    } catch (err: any) {
      console.error('Error granting coins:', err);
      toast(`Failed to update coins: ${err.message}`, 'error');
    } finally {
      setIsGrantingCoins(null);
    }
  };

  // Real-time Update Logs listener
  useEffect(() => {
    if (!isOpen) return;

    const q = query(collection(db, 'updateLogs'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as UpdateLog));
      setUpdateLogs(logs);
    }, (err) => {
      console.warn('Update logs listener warning:', err);
    });

    return () => unsubscribe();
  }, [isOpen]);

  // Real-time Admin Chat listener
  useEffect(() => {
    if (!isOpen) return;

    const chatQuery = query(
      collection(db, 'adminChat'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(chatQuery, (snapshot) => {
      const msgs: AdminChatMessage[] = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as AdminChatMessage));
      setChatMessages(msgs);
    }, (err) => {
      console.warn('Admin chat listener warning:', err);
    });

    return () => unsubscribe();
  }, [isOpen]);

  // Scroll chat to bottom when active or messages update
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  // Real-time Global Announcement listener
  useEffect(() => {
    if (!isOpen) return;

    const annRef = doc(db, 'globalAnnouncement', 'current');
    const unsubscribe = onSnapshot(annRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAnnouncementMessage(data.message || '');
        setAnnouncementEnabled(!!data.enabled);
        setAnnouncementDuration(data.durationSeconds || 7);
        setAnnouncementUpdatedAt(data.updatedAt);
        setAnnouncementUpdatedBy(data.updatedBy || '');
      }
    }, (err) => {
      console.warn('Announcement subscription error:', err);
    });

    return () => unsubscribe();
  }, [isOpen]);

  // Real-time Roblox OAuth global setting listener
  useEffect(() => {
    if (!isOpen) return;
    const oauthDocRef = doc(db, 'settings', 'robloxOAuth');
    const unsubscribe = onSnapshot(oauthDocRef, (snap) => {
      if (snap.exists()) {
        setRobloxOAuthEnabled(Boolean(snap.data()?.enabled));
      } else {
        setRobloxOAuthEnabled(false);
      }
    }, (err) => {
      console.warn('OAuth settings listener error:', err);
    });
    return () => unsubscribe();
  }, [isOpen]);

  // Real-time User Feedbacks Listener
  useEffect(() => {
    if (!isOpen) return;

    const feedbackQuery = query(
      collection(db, 'userFeedback'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(feedbackQuery, (snapshot) => {
      const list = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as UserFeedback));
      setFeedbacks(list);
    }, (err) => {
      console.warn('User feedback listener warning:', err);
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

  const handleToggleRobloxOAuth = async () => {
    if (isTogglingRobloxOAuth) return;
    setIsTogglingRobloxOAuth(true);
    const newStatus = !robloxOAuthEnabled;
    try {
      await setDoc(doc(db, 'settings', 'robloxOAuth'), {
        enabled: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || auth.currentUser?.uid || 'Admin'
      }, { merge: true });

      await logActivity(
        'admin_action',
        `Roblox OAuth ${newStatus ? 'Enabled' : 'Disabled'}`,
        `Admin ${auth.currentUser?.email || 'Staff'} ${newStatus ? 'enabled' : 'disabled'} the Roblox OAuth 2.0 login option.`
      );

      toast(`Roblox OAuth 2.0 login has been ${newStatus ? 'ENABLED' : 'DISABLED'} for all visitors.`, 'success');
    } catch (err: any) {
      console.error('Failed to update Roblox OAuth status:', err);
      toast('Failed to update Roblox OAuth setting. Check permissions.', 'error');
    } finally {
      setIsTogglingRobloxOAuth(false);
    }
  };

  // Feedback Action Handlers
  const handleUpdateFeedbackStatus = async (feedbackId: string, newStatus: FeedbackStatus) => {
    try {
      await updateDoc(doc(db, 'userFeedback', feedbackId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.email || 'Admin'
      });
      toast(`Feedback marked as ${newStatus.toUpperCase()}!`, 'success');
    } catch (err: any) {
      console.error('Failed to update feedback status:', err);
      toast('Failed to update feedback status.', 'error');
    }
  };

  const handleSendFeedbackReply = async () => {
    if (!replyingFeedback) return;
    const msg = replyMessageInput.trim();
    if (!msg) {
      toast('Please write a reply message for the user.', 'error');
      return;
    }

    setIsSendingReply(true);
    try {
      // 1. Update feedback doc with admin response
      await updateDoc(doc(db, 'userFeedback', replyingFeedback.id), {
        adminResponse: msg,
        status: 'reviewed',
        respondedAt: serverTimestamp(),
        respondedBy: currentUser?.displayName || currentUser?.email || 'Staff Admin'
      });

      // 2. If user has a real userId, write to their notifications collection
      if (replyingFeedback.userId && !replyingFeedback.userId.startsWith('guest_')) {
        await addDoc(collection(db, 'users', replyingFeedback.userId, 'notifications'), {
          title: `Staff Response on: "${replyingFeedback.subject}" 📬`,
          message: msg,
          type: 'system',
          isRead: false,
          timestamp: serverTimestamp()
        });
      }

      await logActivity(
        'admin_action',
        'Responded to Feedback',
        `Staff responded to feedback from ${replyingFeedback.userDisplayName}: "${replyingFeedback.subject}"`
      );

      toast(`Reply sent to ${replyingFeedback.userDisplayName}!`, 'success');
      setReplyingFeedback(null);
      setReplyMessageInput('');
    } catch (err: any) {
      console.error('Failed to send feedback reply:', err);
      toast('Failed to send reply to user.', 'error');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleGrantFeedbackBounty = async () => {
    if (!bountyFeedback) return;
    if (!bountyFeedback.userId || bountyFeedback.userId.startsWith('guest_')) {
      toast('Cannot grant coins to a guest user without an account.', 'error');
      return;
    }

    setIsGrantingBounty(true);
    try {
      const userRef = doc(db, 'users', bountyFeedback.userId);
      await updateDoc(userRef, {
        coins: increment(bountyAmount)
      });

      await addDoc(collection(db, 'users', bountyFeedback.userId, 'notifications'), {
        title: `Bug Bounty / Feedback Reward! 🪙 (+${bountyAmount.toLocaleString()} Coins)`,
        message: `Admin staff rewarded you ${bountyAmount.toLocaleString()} BloxCoins for your helpful submission: "${bountyFeedback.subject}". Reason: ${bountyReason}`,
        type: 'reward',
        isRead: false,
        timestamp: serverTimestamp()
      });

      await logActivity(
        'admin_grant_coins',
        `Granted ${bountyAmount} Coin Bounty`,
        `Staff rewarded ${bountyFeedback.userDisplayName} with ${bountyAmount} coins for feedback: "${bountyFeedback.subject}"`
      );

      toast(`Granted ${bountyAmount.toLocaleString()} BloxCoins to ${bountyFeedback.userDisplayName}! 🪙`, 'success');
      setBountyFeedback(null);
    } catch (err: any) {
      console.error('Failed to grant feedback bounty:', err);
      toast('Failed to grant bonus coins.', 'error');
    } finally {
      setIsGrantingBounty(false);
    }
  };

  const handleDeleteFeedback = async () => {
    if (!deletingFeedback) return;
    setIsDeletingFeedback(true);
    try {
      await deleteDoc(doc(db, 'userFeedback', deletingFeedback.id));
      toast('Feedback removed successfully.', 'success');
      setDeletingFeedback(null);
    } catch (err: any) {
      console.error('Failed to delete feedback:', err);
      toast('Failed to delete feedback.', 'error');
    } finally {
      setIsDeletingFeedback(false);
    }
  };

  const toggleProfanityReveal = (id: string) => {
    setRevealedProfanityMap(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Feedback Computed Lists
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter(item => {
      // Category filter
      if (feedbackCategoryFilter !== 'all' && item.category !== feedbackCategoryFilter) {
        return false;
      }
      // Status filter
      if (feedbackStatusFilter !== 'all' && item.status !== feedbackStatusFilter) {
        return false;
      }
      // Only flagged profanity filter
      if (feedbackOnlyFlagged && !item.hasProfanity) {
        return false;
      }
      // Search query
      if (feedbackSearch.trim()) {
        const q = feedbackSearch.toLowerCase();
        const matchesName = (item.userDisplayName || '').toLowerCase().includes(q);
        const matchesEmail = (item.userEmail || '').toLowerCase().includes(q);
        const matchesRoblox = (item.robloxUsername || '').toLowerCase().includes(q);
        const matchesSubject = (item.subject || '').toLowerCase().includes(q);
        const matchesFilteredMsg = (item.filteredMessage || '').toLowerCase().includes(q);
        const matchesOriginalMsg = (item.originalMessage || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesRoblox && !matchesSubject && !matchesFilteredMsg && !matchesOriginalMsg) {
          return false;
        }
      }
      return true;
    });
  }, [feedbacks, feedbackCategoryFilter, feedbackStatusFilter, feedbackOnlyFlagged, feedbackSearch]);

  const pendingFeedbacksCount = useMemo(() => feedbacks.filter(f => f.status === 'pending').length, [feedbacks]);
  const averageFeedbackRating = useMemo(() => {
    if (feedbacks.length === 0) return 5;
    const sum = feedbacks.reduce((acc, f) => acc + (f.rating || 5), 0);
    return (sum / feedbacks.length).toFixed(1);
  }, [feedbacks]);

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
  const handleOpenFeatureModal = (game: Game) => {
    setFeaturingGameModal(game);
    setFeatureReasonInput(game.featuredReason || '');
  };

  const handleSaveFeature = async (newFeaturedState: boolean) => {
    if (!featuringGameModal) return;
    setIsSubmittingFeature(true);
    try {
      const reasonToSave = newFeaturedState ? (featureReasonInput.trim() || null) : null;
      await updateDoc(doc(db, 'games', featuringGameModal.id), {
        isFeatured: newFeaturedState,
        featuredReason: reasonToSave,
        featuredAt: newFeaturedState ? serverTimestamp() : null,
        featuredBy: newFeaturedState ? (currentUser?.displayName || currentUser?.email || 'Admin') : null
      });

      await logActivity(
        newFeaturedState ? 'feature_game' : 'unfeature_game',
        newFeaturedState ? 'Featured Game' : 'Unfeatured Game',
        `${currentUser?.displayName || 'Admin'} ${newFeaturedState ? 'featured' : 'unfeatured'} "${featuringGameModal.name}"${reasonToSave ? ` with note: "${reasonToSave}"` : ''}`,
        { gameId: featuringGameModal.id, gameName: featuringGameModal.name }
      );

      toast(
        newFeaturedState
          ? `"${featuringGameModal.name}" is now featured on BloxVote! ⭐`
          : `Removed feature badge from "${featuringGameModal.name}"`,
        'success'
      );
      setFeaturingGameModal(null);
      setFeatureReasonInput('');
    } catch (err: any) {
      console.error('Error updating feature state:', err);
      toast(`Failed to update game: ${err.message}`, 'error');
    } finally {
      setIsSubmittingFeature(false);
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
        durationSeconds: Math.max(1, Number(announcementDuration) || 7),
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

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingChat) return;

    const text = chatInput.trim();
    setChatInput('');
    setIsSendingChat(true);

    try {
      await addDoc(collection(db, 'adminChat'), {
        senderUid: currentUser?.uid || 'unknown',
        senderEmail: currentUser?.email || 'admin@bloxvote.com',
        senderDisplayName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Admin',
        senderPhotoURL: currentUser?.photoURL || '',
        text,
        timestamp: serverTimestamp()
      });
    } catch (err: any) {
      console.error('Failed to send admin chat message:', err);
      toast(`Failed to send message: ${err.message}`, 'error');
      setChatInput(text);
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleDeleteChatMessage = async (msgId: string) => {
    try {
      await deleteDoc(doc(db, 'adminChat', msgId));
      toast('Chat message removed', 'success');
    } catch (err: any) {
      toast(`Failed to delete message: ${err.message}`, 'error');
    }
  };

  const handleSaveUpdateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTitle.trim()) {
      toast('Please enter a title for the update log', 'error');
      return;
    }
    const changesArray = logChangesText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (changesArray.length === 0) {
      toast('Please enter at least one change bullet point', 'error');
      return;
    }

    setIsSavingLog(true);
    try {
      if (editingLog) {
        await updateDoc(doc(db, 'updateLogs', editingLog.id), {
          title: logTitle.trim(),
          version: logVersion.trim() || 'v1.0.0',
          category: logCategory,
          changes: changesArray,
          authorName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Admin',
          authorEmail: currentUser?.email || ''
        });
        await logActivity(
          'admin_add',
          'Updated Patch Note',
          `${currentUser?.displayName || 'Admin'} revised update log: "${logTitle.trim()}"`
        );
        toast('Update log saved! 📝', 'success');
      } else {
        await addDoc(collection(db, 'updateLogs'), {
          title: logTitle.trim(),
          version: logVersion.trim() || 'v1.0.0',
          category: logCategory,
          changes: changesArray,
          timestamp: serverTimestamp(),
          authorName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Admin',
          authorEmail: currentUser?.email || ''
        });
        await logActivity(
          'admin_add',
          'Published Patch Note',
          `${currentUser?.displayName || 'Admin'} published log: "${logTitle.trim()}"`
        );
        toast('New update log published! 🚀', 'success');
      }

      // Reset form
      setEditingLog(null);
      setLogTitle('');
      setLogVersion('');
      setLogCategory('feature');
      setLogChangesText('');
    } catch (err: any) {
      console.error('Error saving update log:', err);
      toast(`Failed to save update log: ${err.message}`, 'error');
    } finally {
      setIsSavingLog(false);
    }
  };

  const handleStartEditLog = (log: UpdateLog) => {
    setEditingLog(log);
    setLogTitle(log.title);
    setLogVersion(log.version || '');
    setLogCategory(log.category || 'feature');
    setLogChangesText((log.changes || []).join('\n'));
  };

  const handleCancelEditLog = () => {
    setEditingLog(null);
    setLogTitle('');
    setLogVersion('');
    setLogCategory('feature');
    setLogChangesText('');
  };

  const handleDeleteLog = async (logId: string) => {
    try {
      await deleteDoc(doc(db, 'updateLogs', logId));
      toast('Update log deleted', 'success');
      await logActivity('admin_remove', 'Deleted Patch Note', `${currentUser?.displayName || 'Admin'} removed an update log`);
    } catch (err: any) {
      toast(`Failed to delete log: ${err.message}`, 'error');
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
          className="relative z-10 w-full max-w-6xl rounded-2xl sm:rounded-[2.5rem] border border-zinc-800 bg-zinc-950/95 p-3.5 sm:p-8 shadow-2xl flex flex-col max-h-[90vh] my-auto overflow-hidden"
        >
          {/* Glowing Top Ambient Header Line */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 via-amber-500 to-indigo-600" />

          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-zinc-850 pb-4 sm:pb-6 shrink-0 relative pr-10 sm:pr-12">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/30 shrink-0">
                <Shield size={22} className="sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight truncate">BloxVote Admin Suite</h1>
                  <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase text-amber-400 tracking-wider shrink-0">
                    PRO
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs font-medium text-zinc-400 mt-0.5 truncate">
                  Live metrics, game curation, activity streaming, and staff control
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto rounded-2xl bg-zinc-900/80 border border-zinc-800 p-1 sm:p-1.5 self-start sm:self-auto max-w-full scrollbar-none">
              <button
                onClick={() => setActiveTab('overview')}
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold transition-all shrink-0 whitespace-nowrap',
                  activeTab === 'overview'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
                )}
              >
                <BarChart3 size={14} />
                Overview
              </button>

              <button
                onClick={() => setActiveTab('games')}
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold transition-all shrink-0 whitespace-nowrap',
                  activeTab === 'games'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
                )}
              >
                <Gamepad2 size={14} />
                Manage Games
              </button>

              <button
                onClick={() => setActiveTab('coins')}
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold transition-all shrink-0 whitespace-nowrap',
                  activeTab === 'coins'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-amber-400 hover:text-amber-300 hover:bg-zinc-850'
                )}
              >
                <Coins size={14} className="fill-amber-400" />
                User Coins
              </button>

              <button
                onClick={() => setActiveTab('bans')}
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold transition-all shrink-0 whitespace-nowrap',
                  activeTab === 'bans'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-rose-400 hover:text-rose-300 hover:bg-zinc-850'
                )}
              >
                <Hammer size={14} />
                User Bans ({Object.keys(bannedUsersMap).length})
              </button>

              <button
                onClick={() => setActiveTab('avatars')}
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold transition-all relative shrink-0 whitespace-nowrap',
                  activeTab === 'avatars'
                    ? 'bg-sky-500 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
                )}
              >
                <Camera size={14} />
                Avatar Requests
                {avatarRequests.filter(r => r.status === 'pending').length > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[10px] font-black text-black">
                    {avatarRequests.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('titles')}
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold transition-all relative shrink-0 whitespace-nowrap',
                  activeTab === 'titles'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
                )}
              >
                <Award size={14} />
                Title Requests
                {customTitleRequests.filter(r => r.status === 'pending').length > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-black">
                    {customTitleRequests.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('announcement')}
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold transition-all relative shrink-0 whitespace-nowrap',
                  activeTab === 'announcement'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
                )}
              >
                <Megaphone size={14} />
                Announcement
                {announcementEnabled && (
                  <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('updates')}
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold transition-all relative shrink-0 whitespace-nowrap',
                  activeTab === 'updates'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
                )}
              >
                <FileText size={14} />
                Update Logs
                {updateLogs.length > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-zinc-800 text-[10px] text-zinc-300 px-1 font-mono">
                    {updateLogs.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('chat')}
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold transition-all relative shrink-0 whitespace-nowrap',
                  activeTab === 'chat'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
                )}
              >
                <MessageSquare size={14} />
                Staff Chat & Flags
                {chatFlags.length > 0 ? (
                  <span className="flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-rose-500 text-[10px] text-white px-1 font-extrabold animate-pulse shadow-sm" title={`${chatFlags.length} flagged chat violations`}>
                    {chatFlags.length}
                  </span>
                ) : chatMessages.length > 0 ? (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white px-1 font-extrabold">
                    {chatMessages.length > 99 ? '99+' : chatMessages.length}
                  </span>
                ) : null}
              </button>

              <button
                onClick={() => setActiveTab('feedback')}
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold transition-all relative shrink-0 whitespace-nowrap',
                  activeTab === 'feedback'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
                )}
              >
                <MessageSquarePlus size={14} />
                User Feedback
                {pendingFeedbacksCount > 0 ? (
                  <span className="flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-amber-500 text-[10px] text-black px-1 font-black animate-pulse shadow-sm">
                    {pendingFeedbacksCount}
                  </span>
                ) : feedbacks.length > 0 ? (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-zinc-800 text-[10px] text-zinc-300 px-1 font-mono">
                    {feedbacks.length}
                  </span>
                ) : null}
              </button>

              <button
                onClick={() => setActiveTab('activity')}
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold transition-all relative shrink-0 whitespace-nowrap',
                  activeTab === 'activity'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
                )}
              >
                <ActivityIcon size={14} />
                Activity
                {activities.length > 0 && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('admins')}
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold transition-all shrink-0 whitespace-nowrap',
                  activeTab === 'admins'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
                )}
              >
                <Users size={14} />
                Admins ({admins.length})
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-3.5 right-3.5 sm:top-6 sm:right-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all z-20 shrink-0"
              aria-label="Close Admin Suite"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
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

                {/* 🔒 Global Roblox OAuth 2.0 Control Card */}
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600/20 border border-red-500/30 text-red-400">
                          <Shield size={18} />
                        </div>
                        <div>
                          <h4 className="text-base font-black text-white flex items-center gap-2">
                            Roblox OAuth 2.0 Public Login
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              robloxOAuthEnabled 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                              {robloxOAuthEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </h4>
                          <p className="text-xs text-zinc-400">
                            Control whether the official Roblox OAuth popup login option is visible to all regular site visitors.
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isTogglingRobloxOAuth}
                      onClick={handleToggleRobloxOAuth}
                      className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50 shrink-0 ${
                        robloxOAuthEnabled
                          ? 'bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/40'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                      }`}
                    >
                      {isTogglingRobloxOAuth ? (
                        <span>Updating...</span>
                      ) : robloxOAuthEnabled ? (
                        <>
                          <Ban size={14} />
                          <span>Disable Roblox OAuth</span>
                        </>
                      ) : (
                        <>
                          <Zap size={14} />
                          <span>Enable Roblox OAuth</span>
                        </>
                      )}
                    </button>
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
                          {game.isFeatured && game.featuredReason && (
                            <p className="text-xs text-amber-400/90 font-medium italic truncate mt-0.5">
                              "{game.featuredReason}"
                            </p>
                          )}
                          <p className="text-xs text-zinc-500 font-mono mt-0.5">
                            {game.votes.toLocaleString()} votes
                          </p>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <button
                          onClick={() => handleOpenFeatureModal(game)}
                          className={cn(
                            'flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all',
                            game.isFeatured
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                              : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 hover:text-white'
                          )}
                        >
                          <Star size={14} className={game.isFeatured ? 'fill-amber-300' : ''} />
                          {game.isFeatured ? 'Manage Feature' : 'Feature'}
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

            {/* USER COINS & ECONOMY TAB */}
            {activeTab === 'coins' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Header & Quick Summary */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-850 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Coins className="text-amber-400 fill-amber-400" size={20} />
                      BloxCoins Economy & User Management
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Grant or deduct BloxCoins for any user account on the platform
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                      <input
                        type="text"
                        placeholder="Search players..."
                        value={searchUserQuery}
                        onChange={(e) => setSearchUserQuery(e.target.value)}
                        className="rounded-xl bg-zinc-900 border border-zinc-800 pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none w-48 sm:w-64"
                      />
                    </div>
                  </div>
                </div>

                {/* Manual Grant by UID or Name */}
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5">
                  <h4 className="text-sm font-extrabold text-amber-300 flex items-center gap-2 mb-3">
                    <Plus size={16} /> Direct Coin Grant by UID or Username
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input
                      type="text"
                      placeholder="User Firebase UID (e.g. 9xJ2kL...)"
                      value={manualGrantUid}
                      onChange={(e) => setManualGrantUid(e.target.value)}
                      className="rounded-xl bg-zinc-900 border border-zinc-800 p-2.5 text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Display Name (optional)"
                      value={manualGrantName}
                      onChange={(e) => setManualGrantName(e.target.value)}
                      className="rounded-xl bg-zinc-900 border border-zinc-800 p-2.5 text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Amount (+100, -50)"
                      value={manualGrantAmount}
                      onChange={(e) => setManualGrantAmount(parseInt(e.target.value) || 0)}
                      className="rounded-xl bg-zinc-900 border border-zinc-800 p-2.5 text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none font-bold text-amber-300"
                    />
                    <button
                      onClick={() => {
                        if (!manualGrantUid.trim()) {
                          toast('Please enter a target User UID.', 'error');
                          return;
                        }
                        handleGrantCoins(manualGrantUid.trim(), manualGrantName.trim(), manualGrantAmount);
                        setManualGrantUid('');
                        setManualGrantName('');
                      }}
                      disabled={!manualGrantUid.trim() || isGrantingCoins === manualGrantUid}
                      className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold text-xs p-2.5 transition-all shadow-md active:scale-95 disabled:opacity-40"
                    >
                      {isGrantingCoins === manualGrantUid ? 'Granting...' : `Grant ${manualGrantAmount >= 0 ? '+' : ''}${manualGrantAmount} Coins 🪙`}
                    </button>
                  </div>
                </div>

                {/* Loaded Users Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                    <span>Registered User Accounts ({userProfiles.length})</span>
                    <span className="text-zinc-500 text-[11px]">Click buttons to quickly adjust balance</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {userProfiles
                      .filter(u =>
                        (u.displayName || '').toLowerCase().includes(searchUserQuery.toLowerCase()) ||
                        (u.uid || '').toLowerCase().includes(searchUserQuery.toLowerCase())
                      )
                      .map((usr) => {
                        const currentCoins = usr.coins || 0;
                        const isSelected = isGrantingCoins === usr.uid;
                        const isBanned = bannedUsersMap[usr.uid] && (
                          bannedUsersMap[usr.uid].bannedUntil === -1 ||
                          bannedUsersMap[usr.uid].bannedUntil > Date.now()
                        );

                        return (
                          <div
                            key={usr.uid}
                            className={cn(
                              "flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 transition-all",
                              isBanned
                                ? "border-rose-500/40 bg-rose-500/5"
                                : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {usr.photoURL ? (
                                <img src={usr.photoURL} alt="" className="h-10 w-10 rounded-full object-cover border border-zinc-700" />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-xs uppercase shrink-0">
                                  {(usr.displayName || 'U').substring(0, 2)}
                                </div>
                              )}

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-white text-sm truncate">{usr.displayName || 'Unnamed Player'}</span>
                                  <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-mono">
                                    UID: {usr.uid.substring(0, 8)}...
                                  </span>
                                  {isBanned && (
                                    <span className="bg-rose-500 text-black px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                                      <Hammer size={10} /> Banned
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-amber-400 font-bold mt-0.5">
                                  <Coins size={13} className="fill-amber-400" />
                                  <span>{currentCoins.toLocaleString()} BloxCoins</span>
                                </div>
                              </div>
                            </div>

                            {/* Quick Action Buttons */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                onClick={() => handleGrantCoins(usr.uid, usr.displayName, 50)}
                                disabled={isSelected}
                                className="rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1.5 text-xs font-bold text-amber-300 transition-all active:scale-95"
                              >
                                +50 🪙
                              </button>
                              <button
                                onClick={() => handleGrantCoins(usr.uid, usr.displayName, 100)}
                                disabled={isSelected}
                                className="rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1.5 text-xs font-bold text-amber-300 transition-all active:scale-95"
                              >
                                +100 🪙
                              </button>
                              <button
                                onClick={() => handleGrantCoins(usr.uid, usr.displayName, 500)}
                                disabled={isSelected}
                                className="rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-2.5 py-1.5 text-xs font-black text-amber-200 transition-all active:scale-95"
                              >
                                +500 🪙
                              </button>
                              <button
                                onClick={() => handleGrantCoins(usr.uid, usr.displayName, 1000)}
                                disabled={isSelected}
                                className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 px-3 py-1.5 text-xs font-black text-black transition-all active:scale-95 shadow-sm"
                              >
                                +1k 🪙
                              </button>

                              {isBanned ? (
                                <button
                                  onClick={() => handleUnbanUser(usr.uid, usr.displayName)}
                                  className="rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1"
                                  title="Lift Ban"
                                >
                                  <CheckCircle2 size={13} /> Unban
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setBanReasonInput('Admin decision');
                                    setBanningUser({
                                      uid: usr.uid,
                                      displayName: usr.displayName || 'Player'
                                    });
                                  }}
                                  className="rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1"
                                  title="Ban player from chat"
                                >
                                  <Hammer size={13} /> Ban
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                    {userProfiles.length === 0 && (
                      <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl">
                        <Coins size={32} className="text-zinc-600 mx-auto mb-2" />
                        <p className="text-sm font-bold text-zinc-400">No user accounts loaded yet</p>
                        <p className="text-xs text-zinc-600 mt-1">Use the Direct Grant form above to grant coins by UID anytime!</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* BANS & MODERATION TAB */}
            {activeTab === 'bans' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-850 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Hammer className="text-rose-500" size={20} />
                      Ban & Player Moderation Suite
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Issue temporary or permanent player bans to maintain a safe, friendly community on BloxVote.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 rounded-2xl bg-rose-500/10 border border-rose-500/20 px-3.5 py-2 text-xs font-bold text-rose-300">
                    <ShieldAlert size={16} />
                    <span>{Object.keys(bannedUsersMap).length} Active Player Ban(s)</span>
                  </div>
                </div>

                {/* Direct Ban Form */}
                <div className="rounded-3xl border border-rose-500/30 bg-rose-950/10 p-5 sm:p-6 space-y-4">
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <Ban size={16} className="text-rose-400" />
                    Ban Player directly by UID or Display Name
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Player UID or Username"
                      value={manualGrantUid}
                      onChange={(e) => setManualGrantUid(e.target.value)}
                      className="rounded-2xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                    />

                    <select
                      value={banDurationMinutes}
                      onChange={(e) => setBanDurationMinutes(Number(e.target.value))}
                      className="rounded-2xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                    >
                      <option value={30}>30 Minutes</option>
                      <option value={60}>1 Hour</option>
                      <option value={720}>12 Hours</option>
                      <option value={1440}>24 Hours (1 Day)</option>
                      <option value={10080}>7 Days</option>
                      <option value={-1}>Permanent Ban (Forever)</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Ban reason (e.g. Inappropriate display name)"
                      value={banReasonInput}
                      onChange={(e) => setBanReasonInput(e.target.value)}
                      className="rounded-2xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!manualGrantUid.trim()) {
                          toast('Please enter a UID or username to ban.', 'error');
                          return;
                        }
                        handleBanUser(manualGrantUid.trim(), manualGrantName || manualGrantUid.trim(), banDurationMinutes, banReasonInput);
                        setManualGrantUid('');
                        setManualGrantName('');
                      }}
                      disabled={!manualGrantUid.trim()}
                      className="rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs px-5 py-2.5 transition-all shadow-lg active:scale-95 disabled:opacity-40 flex items-center gap-1.5"
                    >
                      <Hammer size={14} />
                      <span>Apply Ban Now</span>
                    </button>
                  </div>
                </div>

                {/* Banned Players List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400">
                    Currently Banned Accounts ({Object.keys(bannedUsersMap).length})
                  </h4>

                  {Object.keys(bannedUsersMap).length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
                      <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
                      <p className="text-sm font-bold text-zinc-300">No Banned Players</p>
                      <p className="text-xs text-zinc-500 mt-1">BloxVote is currently clean and peaceful!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {Object.values(bannedUsersMap).map((bannedItem: any) => {
                        const isPerm = bannedItem.bannedUntil === -1;
                        const expiryDate = isPerm ? 'Permanent' : new Date(bannedItem.bannedUntil).toLocaleString();

                        return (
                          <div
                            key={bannedItem.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-rose-500/40 bg-rose-950/20 p-4"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-white text-sm">
                                  {bannedItem.userDisplayName || 'Player'}
                                </span>
                                <span className="text-[10px] bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded-full font-mono">
                                  UID: {bannedItem.id}
                                </span>
                                <span className="bg-rose-500 text-black px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">
                                  {isPerm ? 'PERMANENT' : 'TEMPORARY'}
                                </span>
                              </div>
                              <p className="text-xs text-rose-200/90 font-medium">
                                <strong>Reason:</strong> {bannedItem.banReason || 'Violation of guidelines'}
                              </p>
                              <p className="text-[11px] text-zinc-400">
                                Banned by: {bannedItem.bannedBy || 'Admin'} • Expires: {expiryDate}
                              </p>
                            </div>

                            <button
                              onClick={() => handleUnbanUser(bannedItem.id, bannedItem.userDisplayName)}
                              className="rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                            >
                              <CheckCircle2 size={14} /> Unban Player
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* AVATAR REQUESTS TAB */}
            {activeTab === 'avatars' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-850 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Camera className="text-sky-400" size={20} />
                      Avatar Image Moderation & Approvals
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Review custom user avatar image uploads before they appear publicly across BloxVote. Accept to publish to their profile, or Decline to reject.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 text-xs font-bold text-sky-400 flex items-center gap-1.5">
                      <Clock size={14} />
                      <span>{avatarRequests.filter(r => r.status === 'pending').length} Pending</span>
                    </div>
                  </div>
                </div>

                {/* Avatar Requests List */}
                <div className="space-y-3">
                  {avatarRequests.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20">
                      <Camera size={40} className="text-zinc-600 mx-auto mb-3" />
                      <h4 className="text-sm font-bold text-zinc-300">No Avatar Requests</h4>
                      <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                        When players upload custom profile pictures, they will appear here for admin review!
                      </p>
                    </div>
                  ) : (
                    avatarRequests.map((req: AvatarRequest) => {
                      const isPending = req.status === 'pending';
                      const isAccepted = req.status === 'accepted';
                      const isDeclined = req.status === 'declined';
                      const isProcessing = isProcessingAvatarReq === req.id;

                      return (
                        <div
                          key={req.id}
                          className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all ${
                            isPending
                              ? 'border-sky-500/50 bg-sky-950/20 shadow-lg shadow-sky-950/20'
                              : isAccepted
                              ? 'border-emerald-500/30 bg-emerald-950/10'
                              : 'border-zinc-800 bg-zinc-900/30'
                          }`}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="space-y-3 min-w-0 flex-1">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="text-sm font-black text-white">
                                  {req.userDisplayName}
                                </span>
                                <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-full">
                                  UID: {req.userId}
                                </span>
                                {isPending && (
                                  <span className="bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                    <Clock size={12} /> Pending Review
                                  </span>
                                )}
                                {isAccepted && (
                                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCircle2 size={12} /> Approved
                                  </span>
                                )}
                                {isDeclined && (
                                  <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                    <XCircle size={12} /> Declined
                                  </span>
                                )}
                              </div>

                              {/* Image Comparison */}
                              <div className="flex items-center gap-4 bg-zinc-950/80 p-3 rounded-2xl border border-zinc-800 w-fit">
                                <div className="text-center">
                                  <p className="text-[10px] font-bold text-zinc-400 mb-1">Current Avatar</p>
                                  <img
                                    src={req.userPhotoURL || '/favicon.png'}
                                    alt="Current"
                                    className="w-14 h-14 rounded-full object-cover border border-zinc-700 bg-zinc-900"
                                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/favicon.png'; }}
                                  />
                                </div>

                                <div className="text-zinc-500 text-lg font-bold">➔</div>

                                <div className="text-center">
                                  <p className="text-[10px] font-bold text-sky-400 mb-1">Requested Avatar</p>
                                  <div className="relative group cursor-pointer">
                                    <img
                                      src={req.requestedPhotoURL}
                                      alt="Requested Avatar"
                                      className="w-16 h-16 rounded-full object-cover border-2 border-sky-400 bg-zinc-900 shadow-md group-hover:scale-105 transition-all"
                                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/favicon.png'; }}
                                    />
                                  </div>
                                </div>
                              </div>

                              {isDeclined && req.rejectionReason && (
                                <p className="text-xs text-rose-300 font-medium">
                                  <strong>Rejection Reason:</strong> {req.rejectionReason}
                                </p>
                              )}

                              <p className="text-[10px] text-zinc-500">
                                Submitted: {req.requestedAt ? new Date(req.requestedAt.seconds ? req.requestedAt.seconds * 1000 : req.requestedAt).toLocaleString() : 'Recently'}
                                {req.reviewedBy && ` • Reviewed by: ${req.reviewedBy}`}
                              </p>
                            </div>

                            {/* Action Buttons */}
                            {isPending && (
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleAcceptAvatarRequest(req)}
                                  disabled={isProcessing}
                                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                                >
                                  <CheckCircle2 size={14} />
                                  <span>Approve Avatar</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setDeclineAvatarModalReq(req)}
                                  disabled={isProcessing}
                                  className="rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold px-4 py-2.5 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                                >
                                  <XCircle size={14} />
                                  <span>Decline</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}

            {/* CUSTOM TITLE REQUESTS TAB */}
            {activeTab === 'titles' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-850 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Award className="text-amber-400" size={20} />
                      Custom Title Moderation & Approvals
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Players spend 1,000 BloxCoins to request custom titles. Accept to equip the title to their name, or Decline to refund their 1,000 coins.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Clock size={14} />
                      <span>{customTitleRequests.filter(r => r.status === 'pending').length} Pending</span>
                    </div>
                  </div>
                </div>

                {/* Custom Title Requests List */}
                <div className="space-y-3">
                  {customTitleRequests.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20">
                      <Award size={40} className="text-zinc-600 mx-auto mb-3" />
                      <h4 className="text-sm font-bold text-zinc-300">No Custom Title Requests</h4>
                      <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                        When users submit custom titles in the Cosmetic Shop for 1,000 BloxCoins, they will appear here for admin review!
                      </p>
                    </div>
                  ) : (
                    customTitleRequests.map((req) => {
                      const isPending = req.status === 'pending';
                      const isAccepted = req.status === 'accepted';
                      const isDeclined = req.status === 'declined';
                      const isProcessing = isProcessingTitleReq === req.id;

                      return (
                        <div
                          key={req.id}
                          className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all ${
                            isPending
                              ? 'border-amber-500/50 bg-amber-950/20 shadow-lg shadow-amber-950/20'
                              : isAccepted
                              ? 'border-emerald-500/30 bg-emerald-950/10'
                              : 'border-zinc-800 bg-zinc-900/30'
                          }`}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="space-y-2 min-w-0">
                              {/* Header & Badges */}
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="font-extrabold text-white text-base truncate">
                                  {req.userDisplayName || 'Unknown Player'}
                                </span>
                                <span className="text-xs text-zinc-500 font-mono">({req.userEmail || req.userId})</span>

                                {isPending && (
                                  <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                    <Clock size={11} className="animate-pulse" /> Pending Review
                                  </span>
                                )}
                                {isAccepted && (
                                  <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                    <CheckCircle2 size={11} /> Approved
                                  </span>
                                )}
                                {isDeclined && (
                                  <span className="rounded-full bg-red-500/20 text-red-300 border border-red-500/40 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                    <XCircle size={11} /> Declined
                                  </span>
                                )}
                              </div>

                              {/* Requested Title Display & Live Preview */}
                              <div className="flex flex-wrap items-center gap-3 pt-1">
                                <div className="text-xs font-bold text-zinc-400">
                                  Requested Title:
                                </div>
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 shadow-inner">
                                  <span className="px-2 py-0.5 rounded text-xs bg-gradient-to-r from-amber-500/30 to-yellow-500/30 text-amber-300 border border-amber-400/60 font-black">
                                    {req.requestedTitle.startsWith('[') ? req.requestedTitle : `[${req.requestedTitle}]`}
                                  </span>
                                  <span className="text-xs font-bold text-zinc-200">
                                    {req.userDisplayName}
                                  </span>
                                </div>
                              </div>

                              {/* Rejection Reason if declined */}
                              {isDeclined && req.rejectionReason && (
                                <p className="text-xs text-red-300/80 bg-red-950/30 p-2.5 rounded-xl border border-red-500/20">
                                  <strong>Declined Reason:</strong> {req.rejectionReason} (1,000 Coins refunded)
                                </p>
                              )}

                              <div className="text-[11px] text-zinc-500">
                                Submitted: {req.requestedAt?.toDate ? req.requestedAt.toDate().toLocaleString() : 'Recently'}
                                {req.reviewedBy && ` • Reviewed by ${req.reviewedBy}`}
                              </div>
                            </div>

                            {/* Actions for Pending Requests */}
                            {isPending && (
                              <div className="flex items-center gap-2 shrink-0 self-end lg:self-center pt-2 lg:pt-0">
                                <button
                                  onClick={() => handleAcceptCustomTitleRequest(req)}
                                  disabled={isProcessing}
                                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-4 py-2 text-xs font-extrabold text-white shadow-lg shadow-emerald-950/40 transition-all active:scale-95 disabled:opacity-50"
                                >
                                  <CheckCircle2 size={15} />
                                  <span>{isProcessing ? 'Processing...' : 'Approve Title'}</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setDeclineModalReq(req);
                                    setDeclineReason('Title violates community guidelines or contains inappropriate language.');
                                  }}
                                  disabled={isProcessing}
                                  className="flex items-center gap-1.5 rounded-xl bg-red-600/80 hover:bg-red-500 px-4 py-2 text-xs font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
                                >
                                  <XCircle size={15} />
                                  <span>Decline & Refund</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
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

                  {/* Display Duration Setting */}
                  <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-blue-400" />
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                          Display Duration (Seconds)
                        </label>
                      </div>
                      <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                        {announcementDuration}s
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed">
                      How long the banner remains visible before popping out automatically:
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {[5, 7, 10, 15, 30, 60].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setAnnouncementDuration(sec)}
                          className={cn(
                            "rounded-xl px-3 py-1.5 text-xs font-bold transition-all border",
                            announcementDuration === sec
                              ? "bg-blue-600 text-white border-blue-400 shadow-sm"
                              : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700"
                          )}
                        >
                          {sec}s
                        </button>
                      ))}

                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-xs text-zinc-500">Custom:</span>
                        <input
                          type="number"
                          min={1}
                          max={300}
                          value={announcementDuration}
                          onChange={(e) => setAnnouncementDuration(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 rounded-xl bg-zinc-900 border border-zinc-800 px-2 py-1 text-center text-xs font-mono font-bold text-white focus:border-blue-500 focus:outline-none"
                        />
                        <span className="text-xs text-zinc-500">sec</span>
                      </div>
                    </div>
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

            {/* UPDATE LOGS TAB */}
            {activeTab === 'updates' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8 max-w-4xl mx-auto"
              >
                <div className="border-b border-zinc-850 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <FileText className="text-blue-500" size={20} />
                      Update Logs & Patch Notes Manager
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Publish release notes, bug fixes, and feature updates visible to all users.
                    </p>
                  </div>

                  {editingLog && (
                    <button
                      onClick={handleCancelEditLog}
                      className="text-xs font-bold text-zinc-400 hover:text-white bg-zinc-800 px-3 py-1.5 rounded-xl border border-zinc-700 transition-all self-start"
                    >
                      Cancel Editing
                    </button>
                  )}
                </div>

                {/* Form to Publish or Edit Log */}
                <form onSubmit={handleSaveUpdateLog} className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles size={16} className="text-blue-400" />
                      {editingLog ? `Editing Log: ${editingLog.title}` : 'Publish New Patch Note'}
                    </h4>
                    {editingLog && (
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-bold uppercase">
                        Edit Mode
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Title */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Update Title
                      </label>
                      <input
                        type="text"
                        value={logTitle}
                        onChange={(e) => setLogTitle(e.target.value)}
                        placeholder="e.g. Global Announcements & Auto-Dismissing Banners"
                        className="w-full rounded-2xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none transition-all"
                      />
                    </div>

                    {/* Version */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Version Tag
                      </label>
                      <input
                        type="text"
                        value={logVersion}
                        onChange={(e) => setLogVersion(e.target.value)}
                        placeholder="e.g. v1.4.0"
                        className="w-full rounded-2xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Category Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Category Badge
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'feature', label: 'New Feature', icon: Zap, color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
                        { id: 'major', label: 'Major Update', icon: Sparkles, color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
                        { id: 'fix', label: 'Bug Fix', icon: Bug, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
                        { id: 'balance', label: 'Adjustment', icon: Scale, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' }
                      ].map((cat) => {
                        const Icon = cat.icon;
                        const isSelected = logCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setLogCategory(cat.id as any)}
                            className={cn(
                              "flex items-center justify-center gap-2 rounded-2xl p-3 text-xs font-bold border transition-all",
                              isSelected
                                ? "bg-blue-600 text-white border-blue-400 shadow-md"
                                : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700"
                            )}
                          >
                            <Icon size={14} className={isSelected ? 'text-white' : ''} />
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Changes List Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Change Details (1 bullet point per line)
                    </label>
                    <textarea
                      rows={5}
                      value={logChangesText}
                      onChange={(e) => setLogChangesText(e.target.value)}
                      placeholder={`Added admin announcement banner timing controls\nImproved theme scrollbars across all modals\nOptimized real-time Firestore listeners`}
                      className="w-full rounded-2xl bg-zinc-950 border border-zinc-800 p-4 text-xs sm:text-sm font-mono text-white placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none transition-all leading-relaxed"
                    />
                    <p className="text-[11px] text-zinc-500">
                      Each line will be rendered as a bullet point in the public Update Logs view.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSavingLog}
                      className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50 transition-all shadow-lg shadow-blue-900/20"
                    >
                      {isSavingLog
                        ? 'Saving Log...'
                        : editingLog
                        ? 'Save & Revise Update Log'
                        : 'Publish Update Log Live'}
                    </button>

                    {editingLog && (
                      <button
                        type="button"
                        onClick={handleCancelEditLog}
                        className="px-5 py-3.5 rounded-2xl bg-zinc-800 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-700 transition-all border border-zinc-700"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>

                {/* Published Logs List */}
                <div className="space-y-4 pt-4 border-t border-zinc-800">
                  <h4 className="text-sm font-black text-white uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                    <span>Published Logs ({updateLogs.length})</span>
                  </h4>

                  {updateLogs.length === 0 ? (
                    <div className="text-center py-8 text-xs text-zinc-500 rounded-2xl border border-dashed border-zinc-800">
                      No update logs published yet.
                    </div>
                  ) : (
                    updateLogs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 space-y-3 relative group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black uppercase text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                              {log.category}
                            </span>
                            {log.version && (
                              <span className="font-mono text-xs font-bold text-zinc-300 bg-zinc-850 px-2.5 py-1 rounded-lg border border-zinc-750">
                                {log.version}
                              </span>
                            )}
                            <h5 className="text-sm font-extrabold text-white ml-1">
                              {log.title}
                            </h5>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleStartEditLog(log)}
                              className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors border border-zinc-700"
                              title="Edit log"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteLog(log.id)}
                              className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-zinc-700"
                              title="Delete log"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Bullets preview */}
                        <ul className="space-y-1 pl-1 text-xs text-zinc-400 list-disc list-inside">
                          {log.changes.map((c, i) => (
                            <li key={i} className="line-clamp-1">{c}</li>
                          ))}
                        </ul>

                        <div className="text-[11px] font-mono text-zinc-500 pt-1 border-t border-zinc-900 flex justify-between">
                          <span>By: {log.authorName || 'Admin'}</span>
                          <span>{formatTimeAgo(log.timestamp)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* ADMIN CHAT & FLAGS TAB */}
            {activeTab === 'chat' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col h-[60vh] min-h-[400px] max-h-[600px] rounded-2xl sm:rounded-3xl border border-zinc-800 bg-zinc-900/40 overflow-hidden"
              >
                {/* Chat Header & Sub-tab navigation */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 p-3.5 sm:px-6 sm:py-4 gap-3 shrink-0">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                      <MessageSquare size={18} className="sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 truncate">
                        Staff Chat & Global Moderation
                        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      </h3>
                      <p className="text-[11px] sm:text-xs text-zinc-400 truncate">
                        Private staff channel & real-time chat filter violation logs
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setChatSubTab('staff')}
                      className={cn(
                        'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
                        chatSubTab === 'staff'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                      )}
                    >
                      <Users size={13} />
                      Staff Chat
                    </button>

                    <button
                      type="button"
                      onClick={() => setChatSubTab('flags')}
                      className={cn(
                        'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 relative',
                        chatSubTab === 'flags'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-zinc-900 text-rose-400 hover:bg-zinc-850 border border-rose-500/30'
                      )}
                    >
                      <AlertTriangle size={13} />
                      Chat Flags
                      {chatFlags.length > 0 && (
                        <span className="bg-rose-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-black animate-pulse">
                          {chatFlags.length}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setChatSubTab('filter')}
                      className={cn(
                        'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 relative',
                        chatSubTab === 'filter'
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'bg-zinc-900 text-violet-300 hover:bg-zinc-850 border border-violet-500/30'
                      )}
                    >
                      <ShieldAlert size={13} />
                      Censored Words
                      {customCensoredWords.length > 0 && (
                        <span className="bg-violet-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-black">
                          {customCensoredWords.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Sub-tab 1: Chat Filter Flags */}
                {chatSubTab === 'flags' ? (
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-zinc-950/60">
                    <div className="flex items-center justify-between text-xs text-zinc-400 pb-1">
                      <span>Prohibited Terms & Harassment Alerts ({chatFlags.length})</span>
                      <span className="text-[11px] text-zinc-500 font-mono">Real-time chat filter detection</span>
                    </div>

                    {chatFlags.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-12 space-y-2 text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
                        <CheckCircle2 size={36} className="text-emerald-500 mb-1" />
                        <p className="text-sm font-bold text-zinc-300">No Chat Filter Violations</p>
                        <p className="text-xs text-zinc-500">All global chat messages are adhering to community guidelines!</p>
                      </div>
                    ) : (
                      chatFlags.map((flag) => {
                        const isBanned = bannedUsersMap[flag.userUid] && (
                          bannedUsersMap[flag.userUid].bannedUntil === -1 ||
                          bannedUsersMap[flag.userUid].bannedUntil > Date.now()
                        );

                        return (
                          <div
                            key={flag.id}
                            className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-3 relative transition-all hover:border-rose-500/50"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                {flag.userPhotoURL ? (
                                  <img src={flag.userPhotoURL} alt="" className="h-9 w-9 rounded-full object-cover border border-rose-500/40" />
                                ) : (
                                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-500/20 text-rose-300 font-bold text-xs border border-rose-500/30">
                                    {(flag.userDisplayName || 'U').substring(0, 2)}
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-extrabold text-white text-sm">{flag.userDisplayName || 'Unknown Player'}</span>
                                    <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md">
                                      UID: {flag.userUid?.substring(0, 8)}...
                                    </span>
                                    {isBanned ? (
                                      <span className="bg-rose-500 text-black px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                                        <Hammer size={10} /> Currently Banned
                                      </span>
                                    ) : flag.wasBlocked ? (
                                      <span className="bg-red-500/20 text-red-400 border border-red-500/40 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                                        Fully Blocked
                                      </span>
                                    ) : (
                                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                                        Auto-Censored
                                      </span>
                                    )}
                                  </div>

                                  {/* Flagged Terms Badges */}
                                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                                    <span className="text-[11px] font-bold text-rose-400">Detected terms:</span>
                                    {flag.flaggedWords.map((word, i) => (
                                      <span key={i} className="bg-rose-500 text-black font-black text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider shadow-xs">
                                        "{word}"
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                <span className="text-[10px] font-mono text-zinc-500 mr-1">
                                  {formatTimeAgo(flag.timestamp)}
                                </span>

                                {isBanned ? (
                                  <button
                                    onClick={() => handleUnbanUser(flag.userUid, flag.userDisplayName)}
                                    className="flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                                    title="Unban player"
                                  >
                                    <CheckCircle2 size={13} />
                                    Unban
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setBanReasonInput(`Prohibited terms in chat: [${flag.flaggedWords.join(', ')}]`);
                                      setBanningUser({
                                        uid: flag.userUid,
                                        displayName: flag.userDisplayName || 'Player'
                                      });
                                    }}
                                    className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950/40 px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95"
                                  >
                                    <Hammer size={13} />
                                    Ban User
                                  </button>
                                )}

                                <button
                                  onClick={() => handleDeleteChatFlag(flag.id)}
                                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition-colors"
                                  title="Dismiss Alert Log"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            {/* Original vs Filtered Text Box */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-rose-500/20">
                              <div className="rounded-xl bg-zinc-950 p-2.5 border border-zinc-800">
                                <span className="text-[10px] font-bold uppercase text-rose-400 block mb-1">Attempted Message:</span>
                                <p className="text-zinc-200 font-mono break-words">{flag.originalText}</p>
                              </div>
                              <div className="rounded-xl bg-zinc-950 p-2.5 border border-zinc-800">
                                <span className="text-[10px] font-bold uppercase text-emerald-400 block mb-1">Filtered Output:</span>
                                <p className="text-zinc-300 font-mono break-words">{flag.filteredText || '(Entirely Blocked)'}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : chatSubTab === 'filter' ? (
                  /* Sub-tab 3: Censored Words & Chat Filter Manager */
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-zinc-950/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                      <div>
                        <h4 className="text-sm font-black text-white flex items-center gap-2">
                          <ShieldAlert size={16} className="text-violet-400" />
                          Custom Prohibited Terms & Censorship Engine
                        </h4>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Add or remove custom words that will be automatically censored in Global Chat and Direct Messages.
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold text-violet-300 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-xl self-start">
                        {customCensoredWords.length} Custom Term{customCensoredWords.length === 1 ? '' : 's'} Active
                      </span>
                    </div>

                    {/* Add Word Form & Live Filter Test Box */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Form to add new term */}
                      <form onSubmit={handleAddCensoredWord} className="rounded-2xl border border-violet-500/30 bg-zinc-900/60 p-4 space-y-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-violet-300 flex items-center gap-1.5">
                          <Plus size={14} /> Add Prohibited Word or Phrase
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newCensoredWordInput}
                            onChange={(e) => setNewCensoredWordInput(e.target.value)}
                            placeholder="e.g. scam, hack, discord.gg"
                            className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-violet-500/60 focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={isSavingWord || !newCensoredWordInput.trim()}
                            className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-500 disabled:opacity-50 transition-all shadow-md shadow-violet-950/40 shrink-0"
                          >
                            <Plus size={14} /> Add
                          </button>
                        </div>
                        <p className="text-[11px] text-zinc-500">
                          Matches whole words or phrases case-insensitively across chat messages.
                        </p>
                      </form>

                      {/* Live Filter Tester Box */}
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                          <Zap size={14} className="text-amber-400" /> Live Filter Sandbox
                        </label>
                        <input
                          type="text"
                          value={filterTestInput}
                          onChange={(e) => setFilterTestInput(e.target.value)}
                          placeholder="Type test message here..."
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-500/60 focus:outline-none"
                        />
                        {filterTestInput ? (
                          <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-zinc-400">Result:</span>
                              {filterChatMessage(filterTestInput, customCensoredWords).hasProfanity ? (
                                <span className="text-rose-400 uppercase">Filtered</span>
                              ) : (
                                <span className="text-emerald-400 uppercase">Clean</span>
                              )}
                            </div>
                            <p className="text-xs font-mono text-zinc-200 break-words">
                              {filterChatMessage(filterTestInput, customCensoredWords).cleanText}
                            </p>
                          </div>
                        ) : (
                          <p className="text-[11px] text-zinc-500 italic">
                            Type above to test how words get filtered live.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Custom Words List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                          Custom Censored Words List
                        </span>
                        <div className="relative w-48 sm:w-64">
                          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                          <input
                            type="text"
                            placeholder="Filter custom words..."
                            value={searchCensoredQuery}
                            onChange={(e) => setSearchCensoredQuery(e.target.value)}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {customCensoredWords.length === 0 ? (
                        <div className="text-center py-8 text-xs text-zinc-500 rounded-2xl border border-dashed border-zinc-800">
                          No custom censored words added yet. Built-in profanity filter is active.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {customCensoredWords
                            .filter((w) => w.toLowerCase().includes(searchCensoredQuery.toLowerCase().trim()))
                            .map((word) => (
                              <div
                                key={word}
                                className="flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-violet-200 group hover:border-violet-500/50 transition-all"
                              >
                                <span className="font-mono">"{word}"</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCensoredWord(word)}
                                  className="text-zinc-400 hover:text-rose-400 p-0.5 rounded-md hover:bg-rose-500/10 transition-colors"
                                  title={`Delete "${word}"`}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Built-in Defaults Summary */}
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Shield size={14} className="text-emerald-400" /> Built-in Baseline Patterns ({DEFAULT_PROFANITY_PATTERNS.length})
                        </span>
                        <span className="text-[10px] text-zinc-500">Always Active</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        In addition to custom terms above, BloxVote automatically protects users from common profanity, slurs, harassment terms, and leetspeak substitutions (e.g. @, 1, 0, 3).
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Sub-tab 2: Staff Chat Feed & Form */
                  <>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {chatMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-3">
                          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-zinc-800/80 text-zinc-500 border border-zinc-700/50">
                            <MessageSquare size={28} />
                          </div>
                          <p className="text-sm font-bold text-zinc-300">No staff messages yet</p>
                          <p className="text-xs text-zinc-500 max-w-sm">
                            Start a conversation with fellow administrators. Share game feature ideas, operational notes, or site status updates.
                          </p>
                        </div>
                      ) : (
                        chatMessages.map((msg) => {
                          const isSelf = msg.senderUid === currentUser?.uid || msg.senderEmail === currentUser?.email;
                          return (
                            <div
                              key={msg.id}
                              className={cn(
                                'flex items-start gap-3 max-w-[82%]',
                                isSelf ? 'ml-auto flex-row-reverse' : 'mr-auto'
                              )}
                            >
                              {/* Avatar */}
                              {msg.senderPhotoURL ? (
                                <img
                                  src={msg.senderPhotoURL}
                                  alt={msg.senderDisplayName}
                                  className="h-8 w-8 rounded-full border border-zinc-700 object-cover shrink-0 mt-0.5"
                                />
                              ) : (
                                <div className={cn(
                                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black uppercase border mt-0.5',
                                  isSelf
                                    ? 'bg-blue-600 text-white border-blue-400/30'
                                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                                )}>
                                  {msg.senderDisplayName ? msg.senderDisplayName.charAt(0) : 'A'}
                                </div>
                              )}

                              {/* Message bubble */}
                              <div className="flex flex-col space-y-1 min-w-0">
                                <div className={cn(
                                  'flex items-center gap-2 text-[11px]',
                                  isSelf ? 'justify-end text-blue-300' : 'text-zinc-400'
                                )}>
                                  <span className="font-bold text-zinc-200">
                                    {isSelf ? 'You' : msg.senderDisplayName}
                                  </span>
                                  <span className="text-[10px] text-zinc-500 font-mono">
                                    {formatTimeAgo(msg.timestamp)}
                                  </span>
                                </div>

                                <div className={cn(
                                  'group relative rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed break-words shadow-sm',
                                  isSelf
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-zinc-800/90 text-zinc-100 border border-zinc-750 rounded-tl-none'
                                )}>
                                  {msg.text}

                                  {/* Delete message option */}
                                  {(isSelf || currentUser?.email === SUPER_ADMIN_EMAIL) && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteChatMessage(msg.id)}
                                      className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-red-400 p-1 rounded-lg shadow-md"
                                      title="Delete message"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Input Form */}
                    <form
                      onSubmit={handleSendChatMessage}
                      className="border-t border-zinc-800 bg-zinc-950/80 p-4 flex items-center gap-3"
                    >
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type a staff message..."
                        className="flex-1 rounded-2xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none transition-all"
                      />
                      <button
                        type="submit"
                        disabled={!chatInput.trim() || isSendingChat}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 transition-all shadow-md shadow-blue-900/20 active:scale-95"
                      >
                        <Send size={18} />
                      </button>
                    </form>
                  </>
                )}
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

            {/* 5. USER FEEDBACK TAB */}
            {activeTab === 'feedback' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Header and Stats */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-850 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <MessageSquarePlus className="text-blue-500" size={20} />
                      Community Feedback &amp; Bug Suite
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {filteredFeedbacks.length} Submissions
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Filtered bug reports, suggestions, and feature requests directly from players.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFeedbackOnlyFlagged(!feedbackOnlyFlagged)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all border',
                        feedbackOnlyFlagged
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      )}
                    >
                      <ShieldAlert size={14} className={feedbackOnlyFlagged ? 'text-amber-400' : ''} />
                      <span>{feedbackOnlyFlagged ? 'Showing Filtered Flags' : 'Filter Flags Only'}</span>
                    </button>
                  </div>
                </div>

                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3.5 space-y-1">
                    <p className="text-[10px] font-black uppercase text-zinc-500">Total Feedback</p>
                    <p className="text-2xl font-black text-white font-mono">{feedbacks.length}</p>
                    <p className="text-[10px] text-zinc-400">All-time received</p>
                  </div>

                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-1">
                    <p className="text-[10px] font-black uppercase text-amber-400 flex items-center justify-between">
                      <span>Pending Review</span>
                      {pendingFeedbacksCount > 0 && <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />}
                    </p>
                    <p className="text-2xl font-black text-amber-300 font-mono">{pendingFeedbacksCount}</p>
                    <p className="text-[10px] text-amber-400/80">Requires staff attention</p>
                  </div>

                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-1">
                    <p className="text-[10px] font-black uppercase text-emerald-400">Resolved</p>
                    <p className="text-2xl font-black text-emerald-300 font-mono">
                      {feedbacks.filter(f => f.status === 'resolved').length}
                    </p>
                    <p className="text-[10px] text-emerald-400/80">Addressed issues</p>
                  </div>

                  <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3.5 space-y-1">
                    <p className="text-[10px] font-black uppercase text-blue-400">Avg Satisfaction</p>
                    <p className="text-2xl font-black text-blue-300 font-mono flex items-center gap-1">
                      {averageFeedbackRating}
                      <Star size={16} className="fill-amber-400 text-amber-400 inline" />
                    </p>
                    <p className="text-[10px] text-blue-400/80">From 1-5 star ratings</p>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800">
                  {/* Search Input */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={15} />
                    <input
                      type="text"
                      value={feedbackSearch}
                      onChange={(e) => setFeedbackSearch(e.target.value)}
                      placeholder="Search feedback by username, subject, or message..."
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                    />
                    {feedbackSearch && (
                      <button
                        onClick={() => setFeedbackSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                    {(['all', 'bug', 'feature', 'game_suggestion', 'ui_improvement', 'general'] as const).map((cat) => {
                      const labels: Record<string, string> = {
                        all: 'All Topics',
                        bug: '🐞 Bugs',
                        feature: '💡 Features',
                        game_suggestion: '🎮 Games',
                        ui_improvement: '🎨 Design',
                        general: '💬 General'
                      };
                      const isSelected = feedbackCategoryFilter === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => setFeedbackCategoryFilter(cat)}
                          className={cn(
                            'px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
                            isSelected
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                          )}
                        >
                          {labels[cat]}
                        </button>
                      );
                    })}
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                    {(['all', 'pending', 'reviewed', 'resolved', 'archived'] as const).map((st) => {
                      const isSelected = feedbackStatusFilter === st;
                      return (
                        <button
                          key={st}
                          onClick={() => setFeedbackStatusFilter(st)}
                          className={cn(
                            'px-2.5 py-1.5 rounded-xl text-[11px] font-bold uppercase transition-all whitespace-nowrap',
                            isSelected
                              ? 'bg-zinc-200 text-black shadow-md'
                              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                          )}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Feedback Cards List */}
                <div className="space-y-3.5">
                  {filteredFeedbacks.map((item) => {
                    const isProfanityRevealed = revealedProfanityMap[item.id];
                    const isPending = item.status === 'pending';
                    const isResolved = item.status === 'resolved';

                    const categoryBadgeMap: Record<string, { label: string; color: string; icon: React.ElementType }> = {
                      bug: { label: 'Bug Report', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30', icon: Bug },
                      feature: { label: 'Feature Request', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: Lightbulb },
                      game_suggestion: { label: 'Game Suggestion', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: Gamepad2 },
                      ui_improvement: { label: 'UI & Design', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', icon: Palette },
                      general: { label: 'General Feedback', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', icon: MessageCircle },
                    };

                    const catInfo = categoryBadgeMap[item.category] || categoryBadgeMap.general;
                    const CatIcon = catInfo.icon;

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'rounded-2xl border p-4 sm:p-5 transition-all space-y-4 relative',
                          isPending
                            ? 'bg-zinc-900/60 border-amber-500/30 shadow-lg shadow-amber-950/10'
                            : isResolved
                            ? 'bg-zinc-900/30 border-emerald-500/20'
                            : 'bg-zinc-900/30 border-zinc-800'
                        )}
                      >
                        {/* Top Row: User & Category & Rating */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/60 pb-3.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.userPhotoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${item.userId || 'guest'}`}
                              alt=""
                              className="h-10 w-10 rounded-2xl border border-zinc-800 bg-zinc-950 object-cover shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-white text-sm">
                                  {item.userDisplayName}
                                </span>
                                {item.robloxUsername && (
                                  <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-lg border border-zinc-700/50">
                                    @{item.robloxUsername}
                                  </span>
                                )}
                                {item.userEmail && (
                                  <span className="text-[10px] text-zinc-500 hidden md:inline">
                                    ({item.userEmail})
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                                <Clock size={11} />
                                {formatTimeAgo(item.createdAt)}
                                {item.appVersion && <span>• {item.appVersion}</span>}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                            {/* Category Badge */}
                            <span className={cn('flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl border', catInfo.color)}>
                              <CatIcon size={13} />
                              {catInfo.label}
                            </span>

                            {/* Rating Stars */}
                            <div className="flex items-center gap-0.5 bg-zinc-950 px-2 py-1 rounded-xl border border-zinc-800">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={12}
                                  className={star <= (item.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'}
                                />
                              ))}
                              <span className="text-[10px] font-mono font-bold text-zinc-300 ml-1">
                                {item.rating || 5}/5
                              </span>
                            </div>

                            {/* Status Pill */}
                            <span
                              className={cn(
                                'text-[10px] font-black uppercase px-2.5 py-1 rounded-xl border',
                                item.status === 'pending'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                                  : item.status === 'reviewed'
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                  : item.status === 'resolved'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                              )}
                            >
                              {item.status}
                            </span>
                          </div>
                        </div>

                        {/* Middle: Subject & Message Body */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-black text-white tracking-wide">
                            {item.subject}
                          </h4>

                          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-850/80 text-xs text-zinc-200 leading-relaxed font-normal whitespace-pre-wrap">
                            {isProfanityRevealed ? (
                              <div>
                                <p className="text-rose-300 font-mono text-[11px] mb-1.5 flex items-center gap-1 font-bold">
                                  <AlertTriangle size={12} />
                                  [Admin View] Uncensored Original Text:
                                </p>
                                {item.originalMessage || item.filteredMessage}
                              </div>
                            ) : (
                              item.filteredMessage || item.originalMessage
                            )}
                          </div>

                          {/* Filtered Profanity / Safety Notice */}
                          {item.hasProfanity && (
                            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                              <div className="flex items-center gap-1.5">
                                <ShieldAlert size={14} className="text-amber-400 shrink-0" />
                                <span>
                                  Safety Filter Triggered: Harmful words masked in user view.
                                  {item.flaggedWords && item.flaggedWords.length > 0 && (
                                    <span className="font-mono text-amber-200 ml-1">
                                      ({item.flaggedWords.join(', ')})
                                    </span>
                                  )}
                                </span>
                              </div>
                              <button
                                onClick={() => toggleProfanityReveal(item.id)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-300 font-bold text-[10px] border border-amber-500/30 transition-colors shrink-0"
                              >
                                {isProfanityRevealed ? (
                                  <>
                                    <EyeOff size={12} />
                                    <span>Hide Uncensored</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye size={12} />
                                    <span>View Uncensored</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}

                          {/* Admin Staff Response display if already replied */}
                          {item.adminResponse && (
                            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-bold text-blue-300">
                                <span className="flex items-center gap-1.5">
                                  <MessageSquare size={13} className="text-blue-400" />
                                  Staff Reply by {item.respondedBy || 'Admin'}:
                                </span>
                                {item.respondedAt && (
                                  <span className="text-[10px] text-blue-400/80 font-mono">
                                    {formatTimeAgo(item.respondedAt)}
                                  </span>
                                )}
                              </div>
                              <p className="text-zinc-200 pl-4 border-l-2 border-blue-500/40">
                                {item.adminResponse}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Bottom Action Footer */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/40">
                          {/* Quick Status Controls */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase mr-1">Status:</span>

                            {item.status !== 'reviewed' && (
                              <button
                                onClick={() => handleUpdateFeedbackStatus(item.id, 'reviewed')}
                                className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 text-[11px] font-bold border border-blue-500/20 transition-colors"
                              >
                                Mark Reviewed
                              </button>
                            )}

                            {item.status !== 'resolved' && (
                              <button
                                onClick={() => handleUpdateFeedbackStatus(item.id, 'resolved')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 text-[11px] font-bold border border-emerald-500/20 transition-colors flex items-center gap-1"
                              >
                                <CheckCircle size={12} />
                                Mark Resolved
                              </button>
                            )}

                            {item.status !== 'archived' && (
                              <button
                                onClick={() => handleUpdateFeedbackStatus(item.id, 'archived')}
                                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-[11px] font-bold border border-zinc-700 transition-colors flex items-center gap-1"
                              >
                                <Archive size={12} />
                                Archive
                              </button>
                            )}

                            {item.status !== 'pending' && (
                              <button
                                onClick={() => handleUpdateFeedbackStatus(item.id, 'pending')}
                                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-400 text-[11px] font-bold border border-zinc-800 transition-colors"
                              >
                                Reopen
                              </button>
                            )}
                          </div>

                          {/* Interactive Staff Actions: Reply, Reward Bounty, Delete */}
                          <div className="flex items-center gap-2">
                            {item.userId && !item.userId.startsWith('guest_') && (
                              <button
                                onClick={() => {
                                  setBountyFeedback(item);
                                  setBountyAmount(100);
                                  setBountyReason('Helpful feedback / Bug report contribution');
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30 transition-colors"
                                title="Reward user with BloxCoins"
                              >
                                <Coins size={14} className="text-amber-400" />
                                <span>Grant Bounty</span>
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setReplyingFeedback(item);
                                setReplyMessageInput(item.adminResponse || '');
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                            >
                              <MessageSquare size={13} />
                              <span>{item.adminResponse ? 'Edit Reply' : 'Reply & Notify'}</span>
                            </button>

                            <button
                              onClick={() => setDeletingFeedback(item)}
                              className="p-1.5 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Delete Feedback"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {filteredFeedbacks.length === 0 && (
                    <div className="text-center py-16 rounded-2xl border border-dashed border-zinc-800">
                      <MessageSquarePlus size={36} className="text-zinc-600 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-zinc-400">No feedback submissions found</p>
                      <p className="text-xs text-zinc-600 mt-1">
                        {feedbacks.length === 0
                          ? 'Player feedback submitted via the Feedback modal will appear here in real-time.'
                          : 'Try changing your category or status filters to see submissions.'}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Modal: Feature Game with Optional Reason */}
        <AnimatePresence>
          {featuringGameModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setFeaturingGameModal(null)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                className="relative z-10 w-full max-w-md rounded-3xl border border-amber-500/30 bg-zinc-950 p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Star size={24} className="fill-amber-400" />
                  </div>
                  <button
                    onClick={() => setFeaturingGameModal(null)}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <h3 className="text-xl font-black text-white">
                  {featuringGameModal.isFeatured ? 'Manage Featured Experience' : 'Feature Experience'}
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Feature <span className="font-bold text-white">"{featuringGameModal.name}"</span> on the homepage Daily Featured Games spotlight.
                </p>

                {/* Selected Game Preview */}
                <div className="my-4 flex items-center gap-3 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
                  <img
                    src={featuringGameModal.imageUrl}
                    alt=""
                    className="h-12 w-12 rounded-xl object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{featuringGameModal.name}</p>
                    <p className="text-xs text-zinc-500 truncate">by {featuringGameModal.creator} • {featuringGameModal.votes} votes</p>
                  </div>
                </div>

                {/* Optional Feature Reason Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-amber-300 flex items-center justify-between">
                    <span>Admin Feature Reason (Optional)</span>
                    <span className="text-[10px] text-zinc-500 font-normal">Visible to all players</span>
                  </label>
                  <textarea
                    value={featureReasonInput}
                    onChange={(e) => setFeatureReasonInput(e.target.value)}
                    placeholder="e.g., Outstanding gameplay, huge community update, or admin recommendation!"
                    rows={3}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 p-3 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-2.5 mt-6">
                  {featuringGameModal.isFeatured && (
                    <button
                      disabled={isSubmittingFeature}
                      onClick={() => handleSaveFeature(false)}
                      className="w-full sm:w-auto rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-all disabled:opacity-50"
                    >
                      Unfeature
                    </button>
                  )}

                  <div className="flex items-center gap-2 w-full justify-end">
                    <button
                      onClick={() => setFeaturingGameModal(null)}
                      className="flex-1 sm:flex-initial rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-xs font-bold text-zinc-300 hover:bg-zinc-800 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={isSubmittingFeature}
                      onClick={() => handleSaveFeature(true)}
                      className="flex-1 sm:flex-initial rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-5 py-3 text-xs font-black text-black hover:from-amber-400 hover:to-yellow-300 transition-all shadow-lg shadow-amber-900/30 disabled:opacity-50"
                    >
                      {isSubmittingFeature
                        ? 'Saving...'
                        : featuringGameModal.isFeatured
                        ? 'Update Note & Save'
                        : 'Save & Feature'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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

        {/* Modal: Ban User */}
        <AnimatePresence>
          {banningUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setBanningUser(null)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                className="relative z-10 w-full max-w-md rounded-3xl border border-rose-500/30 bg-zinc-950 p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      <Hammer size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">Issue Chat Ban 🔨</h3>
                      <p className="text-xs text-zinc-400">
                        Target player: <span className="text-rose-300 font-bold">{banningUser.displayName}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setBanningUser(null)}
                    className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Select Ban Duration */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                      <Clock size={13} className="text-rose-400" />
                      Ban Duration
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: '15 Mins', mins: 15 },
                        { label: '1 Hour', mins: 60 },
                        { label: '24 Hours', mins: 1440 },
                        { label: '7 Days', mins: 10080 },
                        { label: '30 Days', mins: 43200 },
                        { label: 'Permanent', mins: -1 }
                      ].map((opt) => (
                        <button
                          type="button"
                          key={opt.mins}
                          onClick={() => setBanDurationMinutes(opt.mins)}
                          className={cn(
                            'px-3 py-2 rounded-xl text-xs font-extrabold border transition-all text-center',
                            banDurationMinutes === opt.mins
                              ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-950/50 scale-102'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ban Reason Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">
                      Ban Reason (shown to user & logged)
                    </label>
                    <textarea
                      rows={2}
                      value={banReasonInput}
                      onChange={(e) => setBanReasonInput(e.target.value)}
                      placeholder="e.g. Chat filter violation, harassment, or spamming..."
                      className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 p-3 text-xs text-white placeholder-zinc-600 focus:border-rose-500 focus:outline-none transition-all resize-none"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setBanningUser(null)}
                      className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900 py-3 text-xs font-bold text-zinc-300 hover:bg-zinc-850 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBanUser(banningUser.uid, banningUser.displayName, banDurationMinutes, banReasonInput)}
                      className="flex-1 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white py-3 text-xs font-black shadow-lg shadow-rose-950/50 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Hammer size={15} />
                      Confirm Ban 🔨
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: Decline Custom Title Request */}
        <AnimatePresence>
          {declineModalReq && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDeclineModalReq(null)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                className="relative z-10 w-full max-w-md rounded-3xl border border-red-500/30 bg-zinc-950 p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
                      <XCircle size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">Decline Title Request</h3>
                      <p className="text-xs text-zinc-400">
                        Player: <span className="text-amber-300 font-bold">{declineModalReq.userDisplayName}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeclineModalReq(null)}
                    className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
                    <span className="text-zinc-400">Requested Title:</span>{' '}
                    <strong className="text-amber-300 underline font-mono text-sm">{declineModalReq.requestedTitle}</strong>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">
                      Reason for Rejection (sent to user notification)
                    </label>
                    <textarea
                      rows={3}
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      placeholder="e.g. Title contains profanity or impersonates staff..."
                      className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 p-3 text-xs text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-2">
                    <Coins size={16} className="shrink-0" />
                    <span>Declining will automatically refund <strong>1,000 BloxCoins</strong> back to {declineModalReq.userDisplayName}'s balance.</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setDeclineModalReq(null)}
                      className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900 py-3 text-xs font-bold text-zinc-300 hover:bg-zinc-850 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeclineCustomTitleRequest}
                      className="flex-1 rounded-2xl bg-red-600 hover:bg-red-500 text-white py-3 text-xs font-black shadow-lg shadow-red-950/50 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <XCircle size={15} />
                      Confirm & Refund
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: Decline Avatar Request */}
        <AnimatePresence>
          {declineAvatarModalReq && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDeclineAvatarModalReq(null)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                className="relative z-10 w-full max-w-md rounded-3xl border border-sky-500/30 bg-zinc-950 p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      <XCircle size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">Decline Avatar Request</h3>
                      <p className="text-xs text-zinc-400">
                        Player: <span className="text-sky-300 font-bold">{declineAvatarModalReq.userDisplayName}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeclineAvatarModalReq(null)}
                    className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs flex items-center gap-3">
                    <span className="text-zinc-400">Requested Avatar:</span>
                    <img
                      src={declineAvatarModalReq.requestedPhotoURL}
                      alt="Requested"
                      className="w-10 h-10 rounded-full object-cover border border-sky-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">
                      Reason for Rejection (sent to user notification)
                    </label>
                    <textarea
                      rows={3}
                      value={declineAvatarReason}
                      onChange={(e) => setDeclineAvatarReason(e.target.value)}
                      placeholder="e.g. Image contains explicit or inappropriate content..."
                      className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 p-3 text-xs text-white placeholder-zinc-600 focus:border-sky-500 focus:outline-none transition-all resize-none"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setDeclineAvatarModalReq(null)}
                      className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900 py-3 text-xs font-bold text-zinc-300 hover:bg-zinc-850 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeclineAvatarRequest}
                      className="flex-1 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white py-3 text-xs font-black shadow-lg shadow-rose-950/50 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <XCircle size={15} />
                      Confirm Decline
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: Reply to User Feedback */}
        <AnimatePresence>
          {replyingFeedback && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setReplyingFeedback(null)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                className="relative z-10 w-full max-w-lg rounded-3xl border border-blue-500/30 bg-zinc-950 p-6 shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <MessageSquare size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">Reply &amp; Notify Player</h3>
                      <p className="text-xs text-zinc-400">
                        To: <span className="text-blue-300 font-bold">{replyingFeedback.userDisplayName}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setReplyingFeedback(null)}
                    className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Feedback Reference */}
                <div className="p-3 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-1 text-xs">
                  <p className="font-bold text-white flex items-center gap-2">
                    <span className="text-zinc-400 font-normal">Topic:</span>
                    {replyingFeedback.subject}
                  </p>
                  <p className="text-zinc-400 line-clamp-2 italic">
                    "{replyingFeedback.filteredMessage || replyingFeedback.originalMessage}"
                  </p>
                </div>

                {/* Staff Reply Textarea */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                    <span>Staff Response Message (Sent directly to in-app notifications)</span>
                  </label>
                  <textarea
                    rows={4}
                    value={replyMessageInput}
                    onChange={(e) => setReplyMessageInput(e.target.value)}
                    placeholder="e.g., Thank you for reporting this issue! We have deployed a patch fixing the mobile vote delay..."
                    className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 p-3.5 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none transition-all resize-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReplyingFeedback(null)}
                    className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900 py-3 text-xs font-bold text-zinc-300 hover:bg-zinc-850 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSendingReply || !replyMessageInput.trim()}
                    onClick={handleSendFeedbackReply}
                    className="flex-1 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 text-xs font-black shadow-lg shadow-blue-900/50 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSendingReply ? 'Sending...' : 'Send Staff Response 📬'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: Grant Feedback Bug Bounty */}
        <AnimatePresence>
          {bountyFeedback && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setBountyFeedback(null)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                className="relative z-10 w-full max-w-md rounded-3xl border border-amber-500/30 bg-zinc-950 p-6 shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Coins size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">Reward Bug Bounty</h3>
                      <p className="text-xs text-zinc-400">
                        Player: <span className="text-amber-300 font-bold">{bountyFeedback.userDisplayName}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setBountyFeedback(null)}
                    className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Select Bounty Reward Amount</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[50, 100, 250, 500].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setBountyAmount(amt)}
                          className={cn(
                            'py-2.5 rounded-xl font-black text-xs border transition-all',
                            bountyAmount === amt
                              ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-950/40 scale-102'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                          )}
                        >
                          +{amt} 🪙
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Reward Note / Reason</label>
                    <input
                      type="text"
                      value={bountyReason}
                      onChange={(e) => setBountyReason(e.target.value)}
                      placeholder="e.g. Critical voting bug report"
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setBountyFeedback(null)}
                    className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900 py-3 text-xs font-bold text-zinc-300 hover:bg-zinc-850 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isGrantingBounty}
                    onClick={handleGrantFeedbackBounty}
                    className="flex-1 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black py-3 text-xs font-black shadow-lg shadow-amber-900/50 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Coins size={14} />
                    {isGrantingBounty ? 'Rewarding...' : `Grant ${bountyAmount} Coins`}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: Delete Feedback Confirmation */}
        <AnimatePresence>
          {deletingFeedback && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDeletingFeedback(null)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                className="relative z-10 w-full max-w-md rounded-3xl border border-rose-500/30 bg-zinc-950 p-6 shadow-2xl space-y-4"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Delete Feedback Record</h3>
                    <p className="text-xs text-zinc-400">
                      Permanently remove this submission from the database.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
                  <span className="font-bold text-white">"{deletingFeedback.subject}"</span> by {deletingFeedback.userDisplayName}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeletingFeedback(null)}
                    className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900 py-3 text-xs font-bold text-zinc-300 hover:bg-zinc-850 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingFeedback}
                    onClick={handleDeleteFeedback}
                    className="flex-1 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white py-3 text-xs font-black shadow-lg shadow-rose-950/50 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isDeletingFeedback ? 'Deleting...' : 'Confirm Delete 🗑️'}
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
