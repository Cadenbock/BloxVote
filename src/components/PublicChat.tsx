import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { MessageSquare, Send, Trash2, LogIn, Sparkles, Smile, ShieldCheck, User as UserIcon, ShieldAlert, Clock, Ban } from 'lucide-react';
import { db, signIn } from '../firebase';
import { PublicChatMessage, UserProfileData } from '../types';
import { getNameColorStyle, getTitleItemStyle } from '../lib/shopData';
import { filterChatMessage, setCustomBannedWords } from '../lib/chatFilter';
import { useToast } from './Toast';
import { playSound } from '../lib/sounds';
import CoolMerchButton from './CoolMerchButton';

interface PublicChatProps {
  user: User | null;
  profileData: UserProfileData;
  isAdmin: boolean;
}

interface BanInfo {
  isBanned: boolean;
  bannedUntil: number | null; // -1 for permanent, or timestamp ms
  banReason?: string;
}

const QUICK_EMOJIS = ['👋', '🎮', '🔥', '🏆', '🪙', '❤️', '🚀', '💯', '✨'];

export default function PublicChat({ user, profileData, isAdmin }: PublicChatProps) {
  const [messages, setMessages] = useState<PublicChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [banInfo, setBanInfo] = useState<BanInfo>({ isBanned: false, bannedUntil: null });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Real-time listener for custom banned words settings
  useEffect(() => {
    const filterRef = doc(db, 'settings', 'chatFilter');
    const unsubscribe = onSnapshot(filterRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.words)) {
          setCustomBannedWords(data.words);
        }
      }
    }, (err) => console.warn('Filter listener in PublicChat warning:', err));
    return () => unsubscribe();
  }, []);

  // Real-time listener for current user's ban status
  useEffect(() => {
    if (!user) {
      setBanInfo({ isBanned: false, bannedUntil: null });
      return;
    }

    const unSubBan = onSnapshot(doc(db, 'bannedUsers', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const until = data.bannedUntil;
        const now = Date.now();
        const active = until === -1 || (typeof until === 'number' && until > now);

        if (active) {
          setBanInfo({
            isBanned: true,
            bannedUntil: until,
            banReason: data.banReason || 'Violation of chat safety guidelines'
          });
          return;
        }
      }
      setBanInfo({ isBanned: false, bannedUntil: null });
    }, (err) => {
      console.warn('Ban listener warning:', err);
    });

    return () => unSubBan();
  }, [user]);

  useEffect(() => {
    const q = query(
      collection(db, 'publicChat'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: PublicChatMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          senderUid: data.senderUid,
          senderDisplayName: data.senderDisplayName || 'Anonymous Player',
          senderPhotoURL: data.senderPhotoURL,
          senderColor: data.senderColor || 'default',
          senderTheme: data.senderTheme || 'default',
          senderTitle: data.senderTitle || 'default',
          text: data.text || '',
          timestamp: data.timestamp,
        });
      });
      setMessages(msgs);
      setIsLoading(false);
      setTimeout(scrollToBottom, 100);
    }, (err) => {
      console.error('Chat error:', err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) {
      toast('Please sign in to send messages.', 'error');
      return;
    }

    if (banInfo.isBanned) {
      toast('You are currently banned from sending messages in chat.', 'error');
      return;
    }

    const trimmed = inputText.trim();
    if (!trimmed) return;
    if (trimmed.length > 500) {
      toast('Message cannot exceed 500 characters.', 'error');
      return;
    }

    const { cleanText, hasProfanity, isOnlyProfanity, hasSpam, hasLink, flaggedWords } = filterChatMessage(trimmed);

    if (hasLink) {
      toast('Sending links is strictly prohibited in chat 🚫', 'error');
      return;
    }

    // If profanity or harassment is detected, log alert for admins
    if (hasProfanity || isOnlyProfanity) {
      try {
        await addDoc(collection(db, 'chatFlags'), {
          userUid: user.uid,
          userDisplayName: user.displayName || user.email?.split('@')[0] || 'Player',
          userPhotoURL: profileData?.photoURL || user.photoURL || null,
          originalText: trimmed,
          filteredText: cleanText,
          flaggedWords,
          wasBlocked: isOnlyProfanity,
          timestamp: serverTimestamp(),
        });

        await addDoc(collection(db, 'activities'), {
          type: 'chat_flagged',
          title: '🛡️ Chat Filter Violation Alert',
          description: `${user.displayName || 'Player'} used prohibited terms [${flaggedWords.join(', ')}]: "${trimmed.substring(0, 60)}"`,
          userDisplayName: user.displayName || user.email?.split('@')[0] || 'Player',
          userId: user.uid,
          timestamp: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Could not log chat flag alert:', err);
      }
    }

    if (isOnlyProfanity) {
      toast('Message blocked: Please maintain community guidelines 🛡️', 'error');
      return;
    }

    if (hasProfanity) {
      toast('Your message was automatically filtered for community guidelines 🛡️', 'info');
    }

    setIsSending(true);
    try {
      await addDoc(collection(db, 'publicChat'), {
        senderUid: user.uid,
        senderDisplayName: user.displayName || user.email?.split('@')[0] || 'Player',
        senderPhotoURL: profileData?.photoURL || user.photoURL || null,
        senderColor: profileData.equippedColor || 'default',
        senderTheme: profileData.equippedTheme || 'default',
        senderTitle: profileData.equippedTitle || 'default',
        text: cleanText,
        timestamp: serverTimestamp(),
      });
      playSound('click');
      setInputText('');
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      toast('Failed to send message. Please try again.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await deleteDoc(doc(db, 'publicChat', msgId));
      toast('Message deleted.', 'info');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast('Could not delete message.', 'error');
    }
  };

  const addEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col h-[75vh] min-h-[500px] rounded-3xl border border-zinc-800 bg-zinc-950/80 shadow-2xl overflow-hidden backdrop-blur-md">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between p-4 px-6 bg-zinc-900/90 border-b border-zinc-800 gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <MessageSquare size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              Global Roblox Community Chat 💬
            </h2>
            <p className="text-xs text-zinc-400">
              Talk with fellow players in real-time! Customize your name color in the Shop 🪙
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-950/60 px-3 py-1.5 rounded-full border border-zinc-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Room ({messages.length} msgs)</span>
          </div>

          <CoolMerchButton variant="header" label="Merch Drop" />
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0 bg-gradient-to-b from-zinc-950/40 via-zinc-950/90 to-zinc-950">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6 text-zinc-500">
            <MessageSquare size={40} className="mb-2 text-zinc-600" />
            <p className="font-bold text-sm text-zinc-300">No messages yet!</p>
            <p className="text-xs mt-1">Be the first to say hello in the global chat!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = user?.uid === msg.senderUid;
            const colorStyle = getNameColorStyle(msg.senderColor);
            const titleStyle = getTitleItemStyle(msg.senderTitle || 'default');
            const dateObj = msg.timestamp?.toDate ? msg.timestamp.toDate() : null;
            const formattedTime = dateObj
              ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Just now';

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 max-w-3xl ${isMe ? 'ml-auto flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className="shrink-0 pt-0.5">
                  {msg.senderPhotoURL ? (
                    <img
                      src={msg.senderPhotoURL}
                      alt={msg.senderDisplayName}
                      className="h-9 w-9 rounded-full object-cover border border-zinc-700 shadow"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 font-bold text-xs text-white uppercase">
                      {msg.senderDisplayName.substring(0, 2)}
                    </div>
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`flex flex-col min-w-0 ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1.5 mb-1 px-1 flex-wrap">
                    {titleStyle.title && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black tracking-tight ${titleStyle.tagClass}`}>
                        {titleStyle.title}
                      </span>
                    )}
                    <span className={`text-xs ${colorStyle.className}`}>
                      {msg.senderDisplayName}
                    </span>
                    <span className="text-[10px] text-zinc-500">{formattedTime}</span>
                    {(isMe || isAdmin) && (
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="text-zinc-600 hover:text-rose-400 transition-colors p-0.5"
                        title="Delete Message"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>

                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words shadow-md max-w-md sm:max-w-xl ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-tr-xs'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-4 bg-zinc-900/90 border-t border-zinc-800 shrink-0">
        {!user ? (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
            <span className="text-xs text-zinc-400">Sign in to participate in the global chat & earn BloxCoins!</span>
            <button
              onClick={() => signIn()}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-bold text-white transition-all shadow"
            >
              <LogIn size={14} />
              Sign In
            </button>
          </div>
        ) : banInfo.isBanned ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-bold gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0 mt-0.5 sm:mt-0">
                <ShieldAlert size={22} />
              </div>
              <div>
                <p className="font-extrabold text-sm text-white flex items-center gap-2">
                  <span>Chat Access Restricted 🔨</span>
                  <span className="bg-rose-500 text-black text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                    Banned
                  </span>
                </p>
                <p className="text-rose-300 font-medium text-xs mt-0.5">
                  {banInfo.bannedUntil === -1
                    ? 'You have been permanently banned from the community chat by an administrator.'
                    : `You are temporarily banned from chat until ${new Date(banInfo.bannedUntil!).toLocaleString()}.`}
                </p>
                {banInfo.banReason && (
                  <p className="text-rose-400/90 text-[11px] mt-1.5 font-mono bg-zinc-950/80 px-2.5 py-1 rounded-lg border border-rose-500/20 inline-block">
                    Reason: "{banInfo.banReason}"
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="space-y-2">
            {/* Quick Emoji Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider shrink-0 mr-1">Quick:</span>
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => addEmoji(emoji)}
                  className="rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 px-2 py-1 transition-all text-sm hover:scale-110 active:scale-95 shrink-0"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message to everyone..."
                maxLength={500}
                className="flex-1 rounded-2xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                type="submit"
                disabled={isSending || !inputText.trim()}
                className="flex items-center justify-center h-11 px-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {isSending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Send size={16} className="mr-1.5" />
                    Send
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
