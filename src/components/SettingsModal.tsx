import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Settings as SettingsIcon, 
  User as UserIcon, 
  Check, 
  Save, 
  Copy, 
  ShieldCheck, 
  Volume2, 
  VolumeX, 
  Bell, 
  LogOut, 
  Coins, 
  Flame, 
  Sparkles,
  Camera,
  Edit3,
  Upload,
  AlertTriangle,
  ShieldAlert,
  Trash2,
  Clock,
  Type,
  Plus,
  RefreshCw
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import { UserProfileData, AdminCustomFont, CustomFontConfig } from '../types';
import { FONT_ITEMS, getFontItemStyle } from '../lib/shopData';
import { containsProfanityOrCensoredWords } from '../lib/chatFilter';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  profileData: UserProfileData;
  onUpdateProfile: (updatedFields: { displayName?: string; photoURL?: string; bio?: string }) => Promise<boolean>;
  onSignOut: () => Promise<void>;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  customAdminFonts?: AdminCustomFont[];
  onEquipFont?: (fontId: string) => Promise<void>;
  onSaveCustomFont?: (config: CustomFontConfig) => Promise<boolean>;
}

const PRESET_AVATARS = [
  { id: 'noob', name: 'Classic Noob', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80' },
  { id: 'valk', name: 'Golden Valkyrie', url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=150&auto=format&fit=crop&q=80' },
  { id: 'dominus', name: 'Shadow Dominus', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=150&auto=format&fit=crop&q=80' },
  { id: 'cyber', name: 'Cyberpunk Blox', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=150&auto=format&fit=crop&q=80' },
  { id: 'retro', name: 'Retro Gamer', url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=150&auto=format&fit=crop&q=80' },
  { id: 'neon', name: 'Neon Samurai', url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=150&auto=format&fit=crop&q=80' },
];

const INAPPROPRIATE_KEYWORDS = [
  'nsfw', 'porn', 'sex', 'naked', 'nude', 'boob', 'vagina', 'penis', 'dick', 'cock', 'pussy',
  'hentai', 'xxx', 'gore', 'blood', 'fetish', 'erotic', 'explicit', 'adult', 'racist', 'swastika', 'hitler', 'nudity'
];

const checkAvatarSafety = (input: string, fileName?: string): { safe: boolean; reason?: string } => {
  // Never test raw base64 data URLs against text keywords (random base64 substrings trigger false positives)
  if (input.startsWith('data:image/')) {
    const fn = (fileName || '').toLowerCase();
    for (const word of INAPPROPRIATE_KEYWORDS) {
      if (fn.includes(word)) {
        return { safe: false, reason: `File name contains restricted keyword "${word}"` };
      }
    }
    return { safe: true };
  }

  const combined = (input + ' ' + (fileName || '')).toLowerCase();
  for (const word of INAPPROPRIATE_KEYWORDS) {
    if (combined.includes(word)) {
      return { safe: false, reason: `Contains restricted keyword "${word}"` };
    }
  }
  return { safe: true };
};

const compressImageToDataUrl = (dataUrl: string, maxDim = 160): Promise<string> => {
  return new Promise((resolve) => {
    if (!dataUrl.startsWith('data:image/')) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        } else {
          resolve(dataUrl);
        }
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  profileData,
  onUpdateProfile,
  onSignOut,
  soundEnabled = true,
  onToggleSound,
  customAdminFonts = [],
  onEquipFont,
  onSaveCustomFont,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [copiedUid, setCopiedUid] = useState(false);
  const [activeTab, setActiveTab] = useState<'account' | 'fonts' | 'preferences'>('account');
  const [pendingAvatarReq, setPendingAvatarReq] = useState<any>(null);
  const [customFontFamily, setCustomFontFamily] = useState('');
  const [customFontName, setCustomFontName] = useState('');
  const [isSavingFont, setIsSavingFont] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || !isOpen) return;

    const q = query(
      collection(db, 'avatarRequests'),
      where('userId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setPendingAvatarReq({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setPendingAvatarReq(null);
      }
    }, (err) => {
      console.warn("Pending avatar request listener warning:", err);
    });

    return () => unsubscribe();
  }, [user, isOpen]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setPhotoURL(profileData.photoURL || user.photoURL || '');
      setBio(profileData.bio || 'Roblox gaming enthusiast & daily voter on BloxVote!');
      setModerationError(null);
    }
  }, [user, profileData, isOpen]);

  const handleCopyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setModerationError(null);

    if (!file.type.startsWith('image/')) {
      setModerationError('Please select a valid image file (PNG, JPG, WEBP, GIF).');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setModerationError('File is too large. Avatar images must be under 4MB.');
      return;
    }

    const safety = checkAvatarSafety(file.name, file.name);
    if (!safety.safe) {
      setModerationError(`⚠️ Moderation Blocked: Avatar image file name violates community guidelines (${safety.reason}).`);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      if (result) {
        const compressed = await compressImageToDataUrl(result, 160);
        setPhotoURL(compressed);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUrlChange = (url: string) => {
    setPhotoURL(url);
    setModerationError(null);

    if (url.trim()) {
      const safety = checkAvatarSafety(url);
      if (!safety.safe) {
        setModerationError(`⚠️ Moderation Alert: URL contains restricted terms (${safety.reason}).`);
      }
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setModerationError(null);

    const usernameCheck = containsProfanityOrCensoredWords(displayName);
    if (usernameCheck.isBlocked) {
      setModerationError(`⚠️ Cannot Save: Username "${displayName}" contains restricted/censored term "${usernameCheck.matchedWord}". Please choose an appropriate username.`);
      return;
    }

    if (photoURL.trim()) {
      const safety = checkAvatarSafety(photoURL);
      if (!safety.safe) {
        setModerationError(`⚠️ Cannot Save: Avatar violates community standards (${safety.reason}).`);
        return;
      }
    }

    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const ok = await onUpdateProfile({
        displayName: displayName.trim(),
        photoURL: photoURL.trim(),
        bio: bio.trim(),
      });
      if (ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-800/90 bg-zinc-950 text-white shadow-2xl my-auto"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 p-6 border-b border-zinc-800/80">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg shadow-blue-900/40 border border-blue-400/30">
                <img src="/favicon.png" alt="BloxVote" className="w-8 h-8 object-contain" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  Account Settings
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Manage your BloxVote display profile, avatar, preferences and security.
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 mt-6 flex-wrap">
              <button
                onClick={() => setActiveTab('account')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'account'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                <UserIcon size={14} />
                Profile & Account
              </button>
              <button
                onClick={() => setActiveTab('fonts')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'fonts'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                <Type size={14} />
                App Fonts
              </button>
              <button
                onClick={() => setActiveTab('preferences')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'preferences'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                <SettingsIcon size={14} />
                App Preferences
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {activeTab === 'account' && (
              <form onSubmit={handleSaveSettings} className="space-y-6">
                {/* Save Success Alert */}
                {saveSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2"
                  >
                    <Check size={18} className="text-emerald-400 shrink-0" />
                    <span>Your account settings have been updated successfully!</span>
                  </motion.div>
                )}

                {/* Avatar Preview & Custom Photo */}
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-white flex items-center gap-2">
                        <Camera size={16} className="text-blue-400" />
                        Avatar & Identity
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">Upload a custom image, paste a URL, or pick a preset. Safety filter active.</p>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                      <ShieldCheck size={12} />
                      <span>AI Moderation Active</span>
                    </div>
                  </div>

                  {/* Moderation Error Alert Banner */}
                  {moderationError && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-3.5 rounded-2xl bg-rose-950/90 border border-rose-500/60 text-rose-200 text-xs font-bold flex items-start gap-2.5 shadow-lg"
                    >
                      <ShieldAlert size={18} className="text-rose-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="block font-black text-rose-300">Avatar Moderation Alert</span>
                        <span className="block text-[11px] font-medium leading-relaxed">{moderationError}</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Pending Avatar Request Banner */}
                  {pendingAvatarReq && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-3.5 rounded-2xl bg-sky-950/80 border border-sky-500/50 text-sky-200 text-xs font-bold flex items-center justify-between gap-3 shadow-lg"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Clock size={20} className="text-sky-400 shrink-0" />
                        <div>
                          <span className="block font-black text-white">Avatar Pending Admin Review 🛡️</span>
                          <span className="block text-[11px] text-sky-300/90 font-medium leading-tight">
                            Your requested image is in the admin moderation queue. Once approved, it will update automatically.
                          </span>
                        </div>
                      </div>
                      <div className="text-center shrink-0">
                        <img
                          src={pendingAvatarReq.requestedPhotoURL}
                          alt="Pending Avatar"
                          className="w-10 h-10 rounded-full object-cover border-2 border-sky-400 bg-zinc-950 shadow-md"
                        />
                      </div>
                    </motion.div>
                  )}

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-zinc-950 border-2 border-blue-500/50 shadow-xl group">
                      <img
                        src={photoURL || profileData?.photoURL || user?.photoURL || '/favicon.png'}
                        alt={displayName || 'Avatar'}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/favicon.png';
                        }}
                      />
                      {photoURL && (
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoURL('');
                            setModerationError(null);
                          }}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold"
                          title="Clear avatar"
                        >
                          <Trash2 size={16} className="text-rose-400" />
                        </button>
                      )}
                    </div>

                    <div className="flex-1 space-y-3 w-full">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:scale-105 active:scale-95 transition-all"
                        >
                          <Upload size={14} />
                          <span>Upload Image File</span>
                        </button>
                        <span className="text-[11px] text-zinc-500 font-medium">PNG, JPG, WEBP (Max 4MB)</span>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                          Or Paste Custom Image URL
                        </label>
                        <input
                          type="url"
                          value={photoURL}
                          onChange={(e) => handleUrlChange(e.target.value)}
                          placeholder="https://example.com/my-avatar.png"
                          className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preset Quick Select */}
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 mb-2">
                      Quick Preset Avatars
                    </label>
                    <div className="grid grid-cols-6 gap-2">
                      {PRESET_AVATARS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setPhotoURL(preset.url);
                            setModerationError(null);
                          }}
                          className={`group relative h-12 rounded-xl overflow-hidden border transition-all ${
                            photoURL === preset.url
                              ? 'border-blue-500 ring-2 ring-blue-500/30 scale-105'
                              : 'border-zinc-800 hover:border-zinc-600'
                          }`}
                          title={preset.name}
                        >
                          <img src={preset.url} alt={preset.name} className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Display Name & Bio */}
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 space-y-4">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Edit3 size={16} className="text-blue-400" />
                    Public Display Details
                  </h3>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Display Name
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={30}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. RobloxMaster2026"
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Bio / Tagline
                    </label>
                    <textarea
                      rows={2}
                      maxLength={150}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Share what Roblox games you love..."
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Account Credentials */}
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 space-y-3">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    Account Info & Stats
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                      <span className="text-zinc-500 font-medium block">Google Account Email</span>
                      <span className="font-bold text-white truncate block">{user?.email || 'Not connected'}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <span className="text-zinc-500 font-medium block">User ID (UID)</span>
                        <span className="font-mono text-zinc-300 truncate block text-[11px]">{user?.uid || 'N/A'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyUid}
                        className="p-1.5 rounded-lg bg-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all shrink-0"
                        title="Copy UID"
                      >
                        {copiedUid ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center gap-2">
                      <Coins size={16} className="text-amber-400 fill-amber-400 shrink-0" />
                      <div>
                        <span className="text-zinc-500 font-medium block text-[10px]">BloxCoins Balance</span>
                        <span className="font-black text-amber-300 text-sm">{profileData.coins.toLocaleString()} Coins</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center gap-2">
                      <Flame size={16} className="text-orange-400 fill-orange-400 shrink-0" />
                      <div>
                        <span className="text-zinc-500 font-medium block text-[10px]">Voting Streak</span>
                        <span className="font-black text-orange-400 text-sm">{profileData.votingStreak || 0} Days</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit & Logout */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="flex items-center gap-2 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 px-4 py-2.5 rounded-xl border border-rose-900/40 transition-all w-full sm:w-auto justify-center"
                  >
                    <LogOut size={15} />
                    Sign Out of Account
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving || !displayName.trim()}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-900/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 w-full sm:w-auto justify-center"
                  >
                    {isSaving ? <Sparkles size={15} className="animate-spin" /> : <Save size={15} />}
                    <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'fonts' && (
              <div className="space-y-6">
                {/* Equipped Font Status */}
                <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-indigo-950/20 to-zinc-950 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Type size={14} /> Currently Equipped App Font
                    </span>
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                      Active
                    </span>
                  </div>
                  {(() => {
                    const equippedStyle = getFontItemStyle(profileData.equippedFont, customAdminFonts as any, profileData.customFontConfig);
                    return (
                      <div className="p-4 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-base font-black text-white">{equippedStyle.name}</h4>
                          <span className="text-xs font-mono text-zinc-400">{equippedStyle.fontFamily}</span>
                        </div>
                        <div 
                          className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-center text-sm font-bold text-amber-300"
                          style={{ fontFamily: equippedStyle.fontFamily }}
                        >
                          {equippedStyle.sampleText || 'ROBLOX VOTER 2026'}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Fonts Grid */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-400" />
                    Available App Fonts
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {FONT_ITEMS.map((font) => {
                      const isEquipped = profileData.equippedFont === font.id;
                      const fontStyle = getFontItemStyle(font.id);
                      return (
                        <div key={font.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-black text-white">{font.name}</h4>
                              <span className="text-[10px] font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-md">
                                {font.id === 'default' ? 'Default' : 'System Font'}
                              </span>
                            </div>
                            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 text-center text-xs font-bold text-amber-300" style={{ fontFamily: fontStyle.fontFamily }}>
                              {font.sampleText || 'ROBLOX VOTER 2026'}
                            </div>
                          </div>
                          <div className="flex justify-end pt-1">
                            {isEquipped ? (
                              <span className="rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-4 py-1.5 text-xs font-black">
                                Equipped ✓
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onEquipFont && onEquipFont(font.id)}
                                className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 text-xs font-black transition-all active:scale-95"
                              >
                                Equip Font
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Admin Custom Fonts */}
                    {customAdminFonts && customAdminFonts.map((adminFont) => {
                      const isEquipped = profileData.equippedFont === adminFont.id;
                      const fontStyle = getFontItemStyle(adminFont.id, customAdminFonts as any);
                      return (
                        <div key={adminFont.id} className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4 space-y-3 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-black text-white">{adminFont.name}</h4>
                              <span className="text-[10px] font-bold text-purple-300 bg-purple-900/50 px-2 py-0.5 rounded-md">
                                Admin Special
                              </span>
                            </div>
                            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 text-center text-xs font-bold text-amber-300" style={{ fontFamily: fontStyle.fontFamily }}>
                              {fontStyle.sampleText || 'ROBLOX VOTER 2026'}
                            </div>
                          </div>
                          <div className="flex justify-end pt-1">
                            {isEquipped ? (
                              <span className="rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-4 py-1.5 text-xs font-black">
                                Equipped ✓
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onEquipFont && onEquipFont(adminFont.id)}
                                className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 text-xs font-black transition-all active:scale-95"
                              >
                                Equip Font
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Font Studio */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-white flex items-center gap-2">
                        <Type size={16} className="text-indigo-400" />
                        Custom Font Studio
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">Enter any web font family name (e.g. 'Fredoka', 'Cinzel', 'Courier New', 'Bungee') to apply to your app.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-zinc-300 block mb-1">Font Family Name or CSS Stack</label>
                      <input
                        type="text"
                        value={customFontFamily}
                        onChange={(e) => setCustomFontFamily(e.target.value)}
                        placeholder="e.g. 'Fredoka', sans-serif"
                        className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-zinc-300 block mb-1">Display Label</label>
                      <input
                        type="text"
                        value={customFontName}
                        onChange={(e) => setCustomFontName(e.target.value)}
                        placeholder="e.g. My Favorite Gamer Font"
                        className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Preview Box */}
                    {customFontFamily.trim() && (
                      <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-center text-sm font-bold text-amber-300" style={{ fontFamily: customFontFamily }}>
                        ROBLOX VOTER 2026 - SAMPLE TEXT PREVIEW
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        disabled={isSavingFont || !customFontFamily.trim()}
                        onClick={async () => {
                          if (!onSaveCustomFont) return;
                          setIsSavingFont(true);
                          try {
                            await onSaveCustomFont({
                              name: customFontName.trim() || 'Custom Font',
                              fontFamily: customFontFamily.trim(),
                              sampleText: 'ROBLOX VOTER 2026'
                            });
                          } finally {
                            setIsSavingFont(false);
                          }
                        }}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:scale-105 transition-all disabled:opacity-50"
                      >
                        {isSavingFont ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                        <span>Save & Equip Custom Font</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 space-y-4">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <SettingsIcon size={16} className="text-blue-400" />
                    Audio & Experience Toggles
                  </h3>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                    <div className="flex items-center gap-3">
                      {soundEnabled ? (
                        <Volume2 size={20} className="text-blue-400 shrink-0" />
                      ) : (
                        <VolumeX size={20} className="text-zinc-500 shrink-0" />
                      )}
                      <div>
                        <span className="font-bold text-sm text-white block">Interactive Audio & Voting SFX</span>
                        <span className="text-xs text-zinc-400 block">Plays sound feedback when voting, opening shop, and claiming coins.</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onToggleSound}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        soundEnabled ? 'bg-blue-600' : 'bg-zinc-800'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          soundEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                    <div className="flex items-center gap-3">
                      <Bell size={20} className="text-purple-400 shrink-0" />
                      <div>
                        <span className="font-bold text-sm text-white block">Global Notification Popups</span>
                        <span className="text-xs text-zinc-400 block">Receive live alert banners when new game leaderboards or custom titles release.</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                      Enabled
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5">
                  <h3 className="text-sm font-black text-white mb-2 flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-400" />
                    BloxVote 2026 Platform
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    BloxVote is the official community leaderboard for Roblox experiences. Built with real-time Firebase Firestore database persistence, live global chat, and BloxCoin cosmetic customizations.
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
