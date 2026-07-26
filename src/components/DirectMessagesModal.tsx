import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  setDoc,
  serverTimestamp,
  where,
  getDocs,
  getDoc,
  writeBatch,
  limit
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import {
  MessageSquare,
  X,
  Search,
  Lock,
  Send,
  Check,
  CheckCheck,
  Trash2,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import { db } from '../firebase';
import { DirectMessage, Conversation, UserProfileData } from '../types';
import { filterChatMessage, setCustomBannedWords } from '../lib/chatFilter';
import { getNameColorStyle } from '../lib/shopData';
import { useToast } from './Toast';
import { cn } from '../lib/utils';

interface DirectMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  userProfileData?: UserProfileData;
  initialTargetUser?: { uid: string; displayName: string; photoURL?: string; color?: string } | null;
}

export default function DirectMessagesModal({
  isOpen,
  onClose,
  currentUser,
  userProfileData,
  initialTargetUser
}: DirectMessagesModalProps) {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ uid: string; displayName: string; photoURL?: string; email?: string }>>([]);

  // Subscribe to live custom banned words list from Firestore
  useEffect(() => {
    const filterRef = doc(db, 'settings', 'chatFilter');
    const unsubscribe = onSnapshot(filterRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.words)) {
          setCustomBannedWords(data.words);
        }
      }
    }, (err) => console.warn('Filter listener in DM warning:', err));
    return () => unsubscribe();
  }, []);
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper to generate a deterministic conversation ID for 2 users
  const getConversationId = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('_');
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle initialTargetUser when modal opens
  useEffect(() => {
    if (!isOpen || !currentUser || !initialTargetUser) return;
    if (initialTargetUser.uid === currentUser.uid) return;

    const convId = getConversationId(currentUser.uid, initialTargetUser.uid);
    setActiveConversationId(convId);
    setMobileView('chat');

    // Create or touch conversation document in Firestore
    const convRef = doc(db, 'conversations', convId);
    setDoc(
      convRef,
      {
        id: convId,
        participantUids: [currentUser.uid, initialTargetUser.uid],
        participants: {
          [currentUser.uid]: {
            uid: currentUser.uid,
            displayName: currentUser.displayName || 'Voter',
            photoURL: currentUser.photoURL || '',
            equippedColor: userProfileData?.equippedColor || 'default'
          },
          [initialTargetUser.uid]: {
            uid: initialTargetUser.uid,
            displayName: initialTargetUser.displayName || 'Player',
            photoURL: initialTargetUser.photoURL || '',
            equippedColor: initialTargetUser.color || 'default'
          }
        },
        updatedAt: serverTimestamp()
      },
      { merge: true }
    ).catch(console.error);
  }, [isOpen, currentUser, initialTargetUser, userProfileData]);

  // Subscribe to User's Conversations
  useEffect(() => {
    if (!currentUser || !isOpen) return;

    const q = query(
      collection(db, 'conversations'),
      where('participantUids', 'array-contains', currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const convs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Conversation[];
        setConversations(convs);

        // If no active conversation set, select the top one
        if (!activeConversationId && convs.length > 0) {
          setActiveConversationId(convs[0].id);
        }
      },
      (error) => {
        console.warn('Conversations listener error:', error);
      }
    );

    return () => unsubscribe();
  }, [currentUser, isOpen, activeConversationId]);

  // Subscribe to Messages in Active Conversation & Mark as Read
  useEffect(() => {
    if (!currentUser || !activeConversationId || !isOpen) {
      setMessages([]);
      return;
    }

    const messagesRef = collection(db, 'conversations', activeConversationId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((docDoc) => ({
          id: docDoc.id,
          ...docDoc.data()
        })) as DirectMessage[];
        setMessages(msgs);

        // Mark unread as read in Firestore batch
        const convRef = doc(db, 'conversations', activeConversationId);
        updateDoc(convRef, {
          [`unreadCounts.${currentUser.uid}`]: 0
        }).catch(() => {});
      },
      (error) => {
        console.warn('Messages listener error:', error);
      }
    );

    return () => unsubscribe();
  }, [currentUser, activeConversationId, isOpen]);

  // Search users for new DM by Gmail address or display name
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2 || !currentUser) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const searchTimer = setTimeout(async () => {
      try {
        const queryLower = searchQuery.toLowerCase().trim();
        const foundMap = new Map<string, { uid: string; displayName: string; photoURL?: string; email?: string }>();

        // 1. Search in `users` collection
        try {
          const usersRef = collection(db, 'users');
          const usersSnapshot = await getDocs(query(usersRef));
          usersSnapshot.docs.forEach((d) => {
            if (d.id === currentUser.uid) return;
            const data = d.data();
            const email = (data.email || '').toLowerCase();
            const name = (data.displayName || 'Player').toLowerCase();

            if (email.includes(queryLower) || name.includes(queryLower)) {
              foundMap.set(d.id, {
                uid: d.id,
                displayName: data.displayName || 'Player',
                photoURL: data.photoURL || '',
                email: data.email || ''
              });
            }
          });
        } catch (e) {
          console.warn('Error querying users collection:', e);
        }

        // 2. Search in `activities` collection (voters, active players)
        try {
          const activitiesRef = collection(db, 'activities');
          const actSnapshot = await getDocs(query(activitiesRef, limit(100)));
          actSnapshot.docs.forEach((d) => {
            const data = d.data();
            const uid = data.userId;
            if (!uid || uid === 'guest' || uid === currentUser.uid) return;
            const email = (data.userEmail || '').toLowerCase();
            const name = (data.userDisplayName || 'Player').toLowerCase();

            if (email.includes(queryLower) || name.includes(queryLower)) {
              if (!foundMap.has(uid)) {
                foundMap.set(uid, {
                  uid,
                  displayName: data.userDisplayName || 'Player',
                  photoURL: data.userPhotoURL || '',
                  email: data.userEmail || ''
                });
              } else {
                const existing = foundMap.get(uid)!;
                if (!existing.email && data.userEmail) existing.email = data.userEmail;
                if (!existing.photoURL && data.userPhotoURL) existing.photoURL = data.userPhotoURL;
              }
            }
          });
        } catch (e) {
          console.warn('Error querying activities collection:', e);
        }

        const resultsArray = Array.from(foundMap.values());
        setSearchResults(resultsArray.slice(0, 8));
      } catch (err) {
        console.error('Error searching players for DM:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [searchQuery, currentUser]);

  // Send Direct Message handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || !currentUser || !activeConversationId || isSending) return;

    setIsSending(true);
    const rawText = messageText.trim();
    setMessageText('');

    try {
      // 1. Filter Message with chatFilter
      const filterResult = filterChatMessage(rawText);

      if (filterResult.hasLink) {
        toast('Sending links is strictly prohibited in direct messages 🚫', 'error');
        setIsSending(false);
        return;
      }

      // Identify partner UID in current active conversation
      const currentConv = conversations.find((c) => c.id === activeConversationId);
      let recipientUid = '';
      let recipientDisplayName = 'Player';

      if (currentConv) {
        recipientUid = currentConv.participantUids.find((u) => u !== currentUser.uid) || '';
        if (currentConv.participants && currentConv.participants[recipientUid]) {
          recipientDisplayName = currentConv.participants[recipientUid].displayName || 'Player';
        }
      } else if (initialTargetUser) {
        recipientUid = initialTargetUser.uid;
        recipientDisplayName = initialTargetUser.displayName;
      }

      if (!recipientUid) {
        toast('Recipient not found', 'error');
        setIsSending(false);
        return;
      }

      // 2. Add message to Firestore subcollection
      const messagesRef = collection(db, 'conversations', activeConversationId, 'messages');
      const newMsgData = {
        conversationId: activeConversationId,
        senderUid: currentUser.uid,
        senderDisplayName: currentUser.displayName || 'Voter',
        senderPhotoURL: currentUser.photoURL || '',
        senderColor: userProfileData?.equippedColor || 'default',
        recipientUid,
        recipientDisplayName,
        originalText: rawText,
        filteredText: filterResult.cleanText,
        hasProfanity: filterResult.hasProfanity,
        timestamp: serverTimestamp(),
        isRead: false
      };

      await addDoc(messagesRef, newMsgData);

      // 3. Update top-level conversation document
      const convRef = doc(db, 'conversations', activeConversationId);
      await setDoc(
        convRef,
        {
          id: activeConversationId,
          participantUids: [currentUser.uid, recipientUid],
          participants: {
            [currentUser.uid]: {
              uid: currentUser.uid,
              displayName: currentUser.displayName || 'Voter',
              photoURL: currentUser.photoURL || '',
              equippedColor: userProfileData?.equippedColor || 'default'
            },
            [recipientUid]: {
              uid: recipientUid,
              displayName: recipientDisplayName,
              photoURL: initialTargetUser?.photoURL || '',
              equippedColor: initialTargetUser?.color || 'default'
            }
          },
          lastMessageText: filterResult.cleanText,
          lastMessageTimestamp: serverTimestamp(),
          lastMessageSenderUid: currentUser.uid,
          unreadCounts: {
            [recipientUid]: (currentConv?.unreadCounts?.[recipientUid] || 0) + 1,
            [currentUser.uid]: 0
          },
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      // 4. Log profanity violation if detected
      if (filterResult.hasProfanity) {
        addDoc(collection(db, 'chatFlags'), {
          userUid: currentUser.uid,
          userDisplayName: currentUser.displayName || 'Voter',
          userPhotoURL: currentUser.photoURL || '',
          originalText: rawText,
          filteredText: filterResult.cleanText,
          flaggedWords: filterResult.flaggedWords,
          wasBlocked: filterResult.isOnlyProfanity,
          timestamp: serverTimestamp()
        }).catch(console.error);

        toast('Message sent with prohibited language filtered out 🛡️', 'info');
      }
    } catch (err) {
      console.error('Error sending DM:', err);
      toast('Failed to send DM', 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Start a new DM conversation with a selected user
  const handleStartDM = (partner: { uid: string; displayName: string; photoURL?: string }) => {
    if (!currentUser) return;
    const convId = getConversationId(currentUser.uid, partner.uid);
    setActiveConversationId(convId);
    setSearchQuery('');
    setSearchResults([]);
    setMobileView('chat');

    const convRef = doc(db, 'conversations', convId);
    setDoc(
      convRef,
      {
        id: convId,
        participantUids: [currentUser.uid, partner.uid],
        participants: {
          [currentUser.uid]: {
            uid: currentUser.uid,
            displayName: currentUser.displayName || 'Voter',
            photoURL: currentUser.photoURL || '',
            equippedColor: userProfileData?.equippedColor || 'default'
          },
          [partner.uid]: {
            uid: partner.uid,
            displayName: partner.displayName,
            photoURL: partner.photoURL || '',
            equippedColor: 'default'
          }
        },
        updatedAt: serverTimestamp()
      },
      { merge: true }
    ).catch(console.error);
  };

  // Get current active conversation partner details
  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const activePartnerUid = activeConv?.participantUids.find((u) => u !== currentUser?.uid);
  const activePartner = activeConv && activePartnerUid ? activeConv.participants?.[activePartnerUid] : null;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
        {/* Glassmorphic Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-xl"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative z-10 flex h-[90vh] max-h-[820px] w-full max-w-5xl flex-col rounded-3xl border border-violet-500/30 bg-zinc-950 shadow-2xl shadow-violet-950/40 overflow-hidden"
        >
          {/* Top Bar Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/60 px-5 py-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-950/60">
                <MessageSquare size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-white tracking-wide">Direct Messages</h2>
                  <span className="rounded-full bg-violet-500/20 border border-violet-500/40 px-2.5 py-0.5 text-[10px] font-black uppercase text-violet-300 tracking-wider">
                    Private & Secure
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Community Guideline Filtered Direct Messages
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Container: Split Pane */}
          <div className="flex flex-1 overflow-hidden relative">
            {/* Left Sidebar: Conversations & Search */}
            <div
              className={cn(
                'w-full md:w-80 lg:w-90 border-r border-zinc-800/80 bg-zinc-950/90 flex flex-col transition-all',
                mobileView === 'chat' ? 'hidden md:flex' : 'flex'
              )}
            >
              {/* Search Bar */}
              <div className="p-3.5 border-b border-zinc-800/80 space-y-2">
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search player by Gmail address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/80 pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:border-violet-500/60 focus:outline-none transition-all"
                  />
                  {isSearching && (
                    <RefreshCw size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-violet-400 animate-spin" />
                  )}
                </div>
              </div>

              {/* Search Results Dropdown overlay if active */}
              {searchResults.length > 0 && (
                <div className="bg-zinc-900 border-b border-zinc-800 p-2 space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2">Players Found:</span>
                  {searchResults.map((user) => (
                    <button
                      key={user.uid}
                      onClick={() => handleStartDM(user)}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-violet-600/20 hover:border-violet-500/30 border border-transparent text-left transition-all"
                    >
                      {user.photoURL ? (
                        <img src={user.photoURL} className="h-8 w-8 rounded-full object-cover border border-zinc-700" alt="" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-violet-600/30 text-violet-300 flex items-center justify-center font-bold text-xs border border-violet-500/30">
                          {user.displayName.substring(0, 2)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{user.displayName}</p>
                        <p className="text-[10px] text-violet-300 font-mono truncate">{user.email || 'No email recorded'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Conversations List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-zinc-500">
                    <MessageSquare size={32} className="mb-2 text-zinc-700 stroke-[1.5]" />
                    <p className="text-xs font-bold text-zinc-400">No conversations yet</p>
                    <p className="text-[11px] mt-1 text-zinc-600">
                      Search for a player above or click "Send DM" on any chat avatar in BloxVote!
                    </p>
                  </div>
                ) : (
                  conversations.map((conv) => {
                    const partnerUid = conv.participantUids.find((u) => u !== currentUser?.uid) || '';
                    const partner = conv.participants?.[partnerUid];
                    const isSelected = conv.id === activeConversationId;
                    const unread = conv.unreadCounts?.[currentUser?.uid || ''] || 0;

                    return (
                      <button
                        key={conv.id}
                        onClick={() => {
                          setActiveConversationId(conv.id);
                          setMobileView('chat');
                        }}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left relative',
                          isSelected
                            ? 'bg-violet-600/15 border-violet-500/40 text-white shadow-md shadow-violet-950/30'
                            : 'bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700 text-zinc-300'
                        )}
                      >
                        {partner?.photoURL ? (
                          <img
                            src={partner.photoURL}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover border border-violet-500/30 shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-violet-600/30 to-fuchsia-600/30 text-violet-300 flex items-center justify-center font-black text-xs border border-violet-500/30 shrink-0">
                            {(partner?.displayName || 'P').substring(0, 2)}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className="text-xs font-extrabold truncate"
                              style={getNameColorStyle(partner?.equippedColor || 'default')}
                            >
                              {partner?.displayName || 'Player'}
                            </span>
                            {unread > 0 && (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] font-black text-white shadow-sm shadow-violet-950">
                                {unread}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-mono">
                            {conv.lastMessageText || 'Direct message started...'}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Main Chat Thread Area */}
            <div
              className={cn(
                'flex-1 flex flex-col bg-zinc-950 transition-all',
                mobileView === 'list' ? 'hidden md:flex' : 'flex'
              )}
            >
              {activeConversationId && activePartner ? (
                <>
                  {/* Active Partner Header */}
                  <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/40 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setMobileView('list')}
                        className="md:hidden p-1.5 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                      >
                        <ArrowLeft size={16} />
                      </button>

                      {activePartner.photoURL ? (
                        <img
                          src={activePartner.photoURL}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover border border-violet-500/40"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-violet-600/30 text-violet-300 flex items-center justify-center font-bold text-xs border border-violet-500/30">
                          {activePartner.displayName.substring(0, 2)}
                        </div>
                      )}

                      <div>
                        <h3
                          className="text-sm font-black text-white flex items-center gap-2"
                          style={getNameColorStyle(activePartner.equippedColor || 'default')}
                        >
                          {activePartner.displayName}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Encrypted DM Session
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Message Thread Scroll View */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gradient-to-b from-zinc-950 to-zinc-900/30">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-6 text-zinc-500">
                        <Lock size={32} className="mb-2 text-violet-500/40" />
                        <p className="text-xs font-bold text-zinc-300">
                          Direct message started with {activePartner.displayName}
                        </p>
                        <p className="text-[11px] text-zinc-500 max-w-sm mt-1">
                          Messages are filtered for community guidelines to keep chats safe!
                        </p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.senderUid === currentUser?.uid;

                        return (
                          <div
                            key={msg.id}
                            className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}
                          >
                            <div className="flex items-center gap-2 mb-1 px-1">
                              <span
                                className="text-[11px] font-bold text-zinc-400"
                                style={isMe ? getNameColorStyle(userProfileData?.equippedColor || 'default') : getNameColorStyle(msg.senderColor || 'default')}
                              >
                                {isMe ? 'You' : msg.senderDisplayName}
                              </span>
                              <span className="text-[9px] font-mono text-zinc-600">
                                {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                              </span>
                            </div>

                            {/* Message Box */}
                            <div
                              className={cn(
                                'max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 border shadow-md relative group transition-all',
                                isMe
                                  ? 'bg-violet-600 text-white border-violet-500/50 rounded-tr-xs shadow-violet-950/40'
                                  : 'bg-zinc-900 text-zinc-100 border-zinc-800 rounded-tl-xs hover:border-zinc-700'
                              )}
                            >
                              {/* Display Message Content */}
                              <p className="text-xs leading-relaxed font-sans break-words whitespace-pre-wrap">
                                {msg.filteredText || msg.originalText}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Direct Message Input */}
                  <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-800 bg-zinc-900/60 backdrop-blur-md">
                    {/* Quick Emojis Bar */}
                    <div className="flex items-center gap-1 mb-2 overflow-x-auto pb-1 no-scrollbar text-xs">
                      {['🔥', '🎮', '🪙', '🏆', '✨', '👍', '😂', '🚀', '😎'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setMessageText((prev) => prev + emoji)}
                          className="px-2 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-all shrink-0 active:scale-90"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={`Message ${activePartner.displayName}...`}
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        maxLength={500}
                        className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none transition-all"
                      />

                      <button
                        type="submit"
                        disabled={!messageText.trim() || isSending}
                        className="flex h-10 px-4 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 font-extrabold text-xs text-white shadow-lg shadow-violet-950/50 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 transition-all active:scale-95 shrink-0"
                      >
                        <Send size={14} />
                        <span className="hidden sm:inline">Send</span>
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-zinc-500">
                  <MessageSquare size={40} className="mb-3 text-zinc-700 stroke-[1.5]" />
                  <h3 className="text-sm font-bold text-zinc-300">Select a player to open Direct Messages</h3>
                  <p className="text-xs text-zinc-500 max-w-xs mt-1">
                    Choose an existing conversation from the list or search for a player above.
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
