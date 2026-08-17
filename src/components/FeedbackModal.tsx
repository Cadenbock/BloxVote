import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  MessageSquarePlus,
  Send,
  Star,
  Bug,
  Lightbulb,
  Gamepad2,
  Palette,
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Coins,
  Loader2,
  Info,
  HelpCircle,
  Clock,
  Timer
} from 'lucide-react';
import { User } from 'firebase/auth';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { FeedbackCategory, UserFeedback, UserProfileData } from '../types';
import { filterChatMessage } from '../lib/chatFilter';
import { logActivity } from '../lib/activity';
import { playSound } from '../lib/sounds';
import { useToast } from './Toast';
import confetti from 'canvas-confetti';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  userProfileData?: UserProfileData | null;
  robloxUsername?: string | null;
  robloxId?: number | null;
  onFeedbackSubmitted?: () => void;
}

const CATEGORIES: {
  id: FeedbackCategory;
  label: string;
  desc: string;
  icon: React.ElementType;
  badgeColor: string;
  activeColor: string;
}[] = [
  {
    id: 'bug',
    label: 'Bug Report',
    desc: 'Report a glitch, broken button, or voting issue',
    icon: Bug,
    badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    activeColor: 'from-rose-600/20 to-red-600/30 border-rose-500 text-rose-300 shadow-rose-950/40',
  },
  {
    id: 'feature',
    label: 'Feature Request',
    desc: 'Suggest new features, rankings, or shop additions',
    icon: Lightbulb,
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    activeColor: 'from-amber-600/20 to-yellow-600/30 border-amber-500 text-amber-300 shadow-amber-950/40',
  },
  {
    id: 'game_suggestion',
    label: 'Game Suggestion',
    desc: 'Recommend an awesome Roblox experience we should list',
    icon: Gamepad2,
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    activeColor: 'from-emerald-600/20 to-teal-600/30 border-emerald-500 text-emerald-300 shadow-emerald-950/40',
  },
  {
    id: 'ui_improvement',
    label: 'UI & Design',
    desc: 'Visual feedback, layout polish, or dark mode tweaks',
    icon: Palette,
    badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    activeColor: 'from-purple-600/20 to-indigo-600/30 border-purple-500 text-purple-300 shadow-purple-950/40',
  },
  {
    id: 'general',
    label: 'General Feedback',
    desc: 'Share your thoughts, praise, or general questions',
    icon: MessageCircle,
    badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    activeColor: 'from-blue-600/20 to-cyan-600/30 border-blue-500 text-blue-300 shadow-blue-950/40',
  },
];

const RATING_LABELS: Record<number, { label: string; color: string; emoji: string }> = {
  1: { label: 'Needs Big Improvement', color: 'text-rose-400', emoji: '😞' },
  2: { label: 'Has Some Issues', color: 'text-amber-400', emoji: '😐' },
  3: { label: 'Decent Experience', color: 'text-yellow-400', emoji: '🙂' },
  4: { label: 'Great & Fun!', color: 'text-emerald-400', emoji: '😃' },
  5: { label: 'Absolute Perfection!', color: 'text-amber-300', emoji: '🔥' },
};

const FEEDBACK_COOLDOWN_MS = 5 * 60 * 60 * 1000; // 5 Hours (18,000,000 ms)

function formatDetailedCooldown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}h ${m}m ${s}s`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

function formatCooldownText(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h} hour${h > 1 ? 's' : ''}${m > 0 ? ` and ${m} min` : ''}`;
  }
  if (m > 0) {
    return `${m} minute${m !== 1 ? 's' : ''} and ${s} second${s !== 1 ? 's' : ''}`;
  }
  return `${s} second${s !== 1 ? 's' : ''}`;
}

export default function FeedbackModal({
  isOpen,
  onClose,
  user,
  userProfileData,
  robloxUsername,
  robloxId,
  onFeedbackSubmitted,
}: FeedbackModalProps) {
  const { toast } = useToast();

  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [rating, setRating] = useState<number>(5);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [guestName, setGuestName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [earnedCoins, setEarnedCoins] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  // Update and tick 5-hour feedback cooldown timer
  useEffect(() => {
    const updateCooldown = () => {
      try {
        const storedUntil = localStorage.getItem('bloxvote_feedback_cooldown_until');
        const localTargetTime = storedUntil ? parseInt(storedUntil, 10) : 0;
        const profileTargetTime = userProfileData?.feedbackCooldownUntil || 0;
        const targetTime = Math.max(localTargetTime, profileTargetTime);

        if (targetTime > Date.now()) {
          const remaining = Math.max(0, Math.ceil((targetTime - Date.now()) / 1000));
          setCooldownRemaining(remaining);
        } else {
          setCooldownRemaining(0);
        }
      } catch {
        setCooldownRemaining(0);
      }
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [isOpen, userProfileData?.feedbackCooldownUntil]);

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setIsSubmitted(false);
      setEarnedCoins(false);
      setSubject('');
      setMessage('');
      setCategory('bug');
      setRating(5);
      setGuestName('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Real-time filtering check on subject & message
  const subjectFilter = filterChatMessage(subject);
  const messageFilter = filterChatMessage(message);
  const hasFilterFlags = subjectFilter.hasProfanity || messageFilter.hasProfanity || subjectFilter.hasLink || messageFilter.hasLink;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!trimmedSubject) {
      toast('Please provide a short summary/subject for your feedback.', 'error');
      return;
    }

    if (cooldownRemaining > 0) {
      toast(`Feedback cooldown active! Please wait ${formatCooldownText(cooldownRemaining)} before submitting again ⏳`, 'error');
      return;
    }

    if (trimmedMessage.length < 10) {
      toast('Please provide at least 10 characters in your message to help our team.', 'error');
      return;
    }

    // Filter sanitization
    const filteredSubjectResult = filterChatMessage(trimmedSubject);
    const filteredMessageResult = filterChatMessage(trimmedMessage);

    if (filteredMessageResult.isOnlyProfanity) {
      toast('Your submission was blocked by the safety filter. Please write constructive feedback.', 'error');
      return;
    }

    setIsSubmitting(true);
    playSound('click');

    try {
      const displayName = user?.displayName || robloxUsername || guestName.trim() || 'Anonymous Voter';
      const userUid = user?.uid || 'guest_' + Math.random().toString(36).substring(2, 9);
      const userEmail = user?.email || undefined;
      const userPhoto = user?.photoURL || (robloxId ? `https://www.roblox.com/headshot-thumbnail/image?userId=${robloxId}&width=150&height=150&format=png` : undefined);

      const allFlagged = Array.from(new Set([...filteredSubjectResult.flaggedWords, ...filteredMessageResult.flaggedWords]));
      const hadProfanity = filteredSubjectResult.hasProfanity || filteredMessageResult.hasProfanity;

      const cooldownUntil = Date.now() + FEEDBACK_COOLDOWN_MS;

      // 1. Write to Firestore 'userFeedback'
      await addDoc(collection(db, 'userFeedback'), {
        userId: userUid,
        userDisplayName: displayName,
        userEmail: userEmail || null,
        userPhotoURL: userPhoto || null,
        robloxUsername: robloxUsername || (guestName.trim() ? guestName.trim() : null),
        robloxId: robloxId || null,
        category,
        rating,
        subject: filteredSubjectResult.cleanText,
        originalSubject: trimmedSubject,
        originalMessage: trimmedMessage,
        filteredMessage: filteredMessageResult.cleanText,
        hasProfanity: hadProfanity,
        flaggedWords: allFlagged,
        status: 'pending',
        createdAt: serverTimestamp(),
        appVersion: 'v2.6.0'
      });

      // 2. Grant reward coins & sync cooldown if user is authenticated
      if (user?.uid) {
        try {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            coins: increment(50),
            feedbackCooldownUntil: cooldownUntil,
            lastFeedbackSubmittedAt: serverTimestamp()
          });
          setEarnedCoins(true);

          // Add in-app notification to user
          await addDoc(collection(db, 'users', user.uid, 'notifications'), {
            title: 'Feedback Received! 📬 (+50 BloxCoins)',
            message: `Thank you for your ${category.replace('_', ' ')} submission: "${filteredSubjectResult.cleanText}". Our admin team will review it shortly!`,
            type: 'reward',
            isRead: false,
            timestamp: serverTimestamp()
          });
        } catch (coinErr) {
          console.warn('Could not grant bonus coins or sync user feedback cooldown:', coinErr);
        }
      }

      // 3. Log to activity
      await logActivity(
        'feedback_submitted',
        'New Feedback Submitted',
        `${displayName} submitted a ${category.replace('_', ' ')} report: "${filteredSubjectResult.cleanText}" (${rating}⭐)`
      );

      playSound('fanfare');
      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.6 }
      });

      setIsSubmitted(true);

      // Set 5-hour cooldown locally
      try {
        localStorage.setItem('bloxvote_feedback_cooldown_until', String(cooldownUntil));
        setCooldownRemaining(5 * 3600);
      } catch (storageErr) {
        console.warn('Could not save feedback cooldown timestamp:', storageErr);
      }

      if (onFeedbackSubmitted) onFeedbackSubmitted();
    } catch (err: any) {
      console.error('Failed to submit feedback:', err);
      toast('Failed to submit feedback. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentRatingInfo = RATING_LABELS[hoveredRating || rating] || RATING_LABELS[5];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-950 text-white shadow-2xl overflow-hidden z-10 my-auto"
        >
          {/* Top Decorative Glow Bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 animate-pulse" />

          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-900 bg-zinc-950/60 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-900/30 border border-blue-400/20">
                <MessageSquarePlus size={22} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  Community Feedback Suite
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Safe &amp; Filtered
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Help make BloxVote better! Submissions go directly to the Admin Suite.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                playSound('click');
                onClose();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
            {isSubmitted ? (
              /* Success Celebration State */
              <div className="py-8 text-center space-y-5">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 mx-auto shadow-2xl shadow-emerald-900/40">
                  <CheckCircle2 size={40} className="animate-bounce" />
                </div>

                <div className="space-y-2">
                  <h4 className="text-2xl font-black text-white">Thank You for Your Feedback!</h4>
                  <p className="text-sm text-zinc-300 max-w-md mx-auto leading-relaxed">
                    Your submission has been safely filtered and delivered straight to the BloxVote Admin Suite team for review.
                  </p>
                </div>

                {earnedCoins && (
                  <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-black text-sm animate-pulse">
                    <Coins size={18} className="text-amber-400" />
                    <span>+50 BloxCoins Granted to Your Account! 🪙</span>
                  </div>
                )}

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setIsSubmitted(false);
                      setSubject('');
                      setMessage('');
                    }}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-black text-xs transition-all border border-zinc-800"
                  >
                    Submit Another Feedback
                  </button>
                  <button
                    onClick={() => {
                      playSound('click');
                      onClose();
                    }}
                    className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs transition-all shadow-lg shadow-blue-900/40"
                  >
                    Done &amp; Close
                  </button>
                </div>
              </div>
            ) : (
              /* Feedback Submission Form */
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Category Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                    <span>1. Select Feedback Category</span>
                    <span className="text-[11px] text-zinc-500 normal-case">Choose the most relevant topic</span>
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            playSound('click');
                            setCategory(cat.id);
                          }}
                          className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                            isSelected
                              ? `bg-gradient-to-br ${cat.activeColor} border-2 shadow-lg scale-[1.02]`
                              : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon size={16} className={isSelected ? 'text-white' : 'text-zinc-400'} />
                            <span className="font-extrabold text-xs text-white">{cat.label}</span>
                          </div>
                          <span className="text-[10px] text-zinc-400 line-clamp-1">{cat.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Star Rating */}
                <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                      2. How is your overall experience?
                    </label>
                    <span className={`text-xs font-bold ${currentRatingInfo.color} flex items-center gap-1`}>
                      <span>{currentRatingInfo.emoji}</span>
                      <span>{currentRatingInfo.label}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = (hoveredRating !== null ? hoveredRating : rating) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoveredRating(star)}
                          onMouseLeave={() => setHoveredRating(null)}
                          onClick={() => {
                            playSound('click');
                            setRating(star);
                          }}
                          className="p-1.5 rounded-xl hover:bg-zinc-800 transition-transform active:scale-90"
                        >
                          <Star
                            size={26}
                            className={`transition-colors ${
                              isFilled
                                ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                                : 'text-zinc-600'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Subject / Summary */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                    <span>3. Subject / Summary *</span>
                    <span className="text-[11px] text-zinc-500 font-mono">{subject.length}/80</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Voting delay on mobile or add a speedrun category"
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {subjectFilter.hasProfanity && (
                    <p className="text-[11px] text-amber-400 flex items-center gap-1.5 pt-0.5">
                      <ShieldCheck size={13} />
                      <span>Filtered preview: <strong>"{subjectFilter.cleanText}"</strong></span>
                    </p>
                  )}
                </div>

                {/* 4. Detailed Message */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                      4. Description &amp; Details *
                    </label>
                    <span className="text-[11px] text-zinc-500 font-mono">{message.length}/1000</span>
                  </div>

                  <textarea
                    required
                    rows={4}
                    maxLength={1000}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Please explain what happened, what feature you'd like to see, or any details to help staff understand..."
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none leading-relaxed"
                  />

                  {/* Real-time Safety / Filter Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {hasFilterFlags ? (
                      <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl">
                        <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                        <span>Safety Filter Active: Inappropriate terms will be automatically masked before admin review.</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                        <ShieldCheck size={13} />
                        <span>Clean &amp; Safe Content Filter Active</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. User attribution / Guest info */}
                {!user && (
                  <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-300">
                        Your Roblox Username or Nickname (Optional)
                      </label>
                      <span className="text-[10px] text-zinc-500">Not signed in</span>
                    </div>
                    <input
                      type="text"
                      maxLength={30}
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Builderman or GuestVoter"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* Cooldown Alert Banner */}
                {cooldownRemaining > 0 && (
                  <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold animate-pulse">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                      <Clock size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="font-extrabold text-amber-200">5-Hour Feedback Cooldown Active</div>
                      <div className="text-[11px] text-amber-300/80">
                        Please wait {formatCooldownText(cooldownRemaining)} before submitting another report.
                      </div>
                    </div>
                    <div className="px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-200 font-mono font-black text-xs">
                      {formatDetailedCooldown(cooldownRemaining)}
                    </div>
                  </div>
                )}

                {/* Coin Bounty Banner */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/30 to-yellow-950/20 border border-amber-500/30 text-xs">
                  <div className="flex items-center gap-2 text-amber-300">
                    <Sparkles size={16} className="text-amber-400 shrink-0" />
                    <span>
                      {user ? 'Submitting constructive feedback grants you ' : 'Sign in to earn '}
                      <strong className="text-amber-200">+50 BloxCoins</strong>!
                    </span>
                  </div>
                  <Coins size={16} className="text-amber-400 shrink-0" />
                </div>

                {/* Submit Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      playSound('click');
                      onClose();
                    }}
                    className="px-5 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold text-xs transition-colors border border-zinc-800"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || cooldownRemaining > 0 || !subject.trim() || message.trim().length < 10}
                    className="px-7 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-xs transition-all shadow-lg shadow-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Sending to Admins...</span>
                      </>
                    ) : cooldownRemaining > 0 ? (
                      <>
                        <Clock size={15} className="animate-spin" />
                        <span>Cooldown ({formatDetailedCooldown(cooldownRemaining)})</span>
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        <span>Send to Admin Suite</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
