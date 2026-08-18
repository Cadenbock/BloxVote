import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Search, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  KeyRound,
  User,
  ExternalLink,
  Copy,
  Check,
  Settings,
  Sparkles,
  ArrowRight,
  Lock,
  RefreshCw,
  Zap,
  ChevronRight,
  ArrowLeft,
  Users,
  Shield
} from 'lucide-react';
import { RobloxAccountInfo } from '../types';
import { signInWithGoogle, signInWithRoblox, linkRobloxAccount } from '../firebase';
import { lookupRobloxAccount, searchRobloxUsers, verifyRobloxBioOwnership } from '../lib/robloxClient';
import { playSound } from '../lib/sounds';
import confetti from 'canvas-confetti';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'roblox_fast' | 'roblox_oauth' | 'google';
  isLinkingOnly?: boolean;
  onSuccess?: () => void;
  isOAuthEnabled?: boolean;
  isAdmin?: boolean;
  onToggleOAuth?: (enabled: boolean) => Promise<void>;
}

export default function SignInModal({
  isOpen,
  onClose,
  initialTab = 'roblox_fast',
  isLinkingOnly = false,
  onSuccess,
  isOAuthEnabled = false,
  isAdmin = false,
  onToggleOAuth
}: SignInModalProps) {
  const [activeTab, setActiveTab] = useState<'roblox_fast' | 'roblox_oauth' | 'google'>(initialTab);
  
  // Roblox Bio Verification state
  const [usernameInput, setUsernameInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [matchingPlayers, setMatchingPlayers] = useState<RobloxAccountInfo[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [foundUser, setFoundUser] = useState<RobloxAccountInfo | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifyingBio, setIsVerifyingBio] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Official Roblox OAuth 2.0 state
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [isTogglingOAuth, setIsTogglingOAuth] = useState(false);
  const [clientIdInput, setClientIdInput] = useState(() => {
    return localStorage.getItem('custom_roblox_client_id') || '';
  });
  const [showConfigGuide, setShowConfigGuide] = useState(false);
  const [redirectUri, setRedirectUri] = useState('');
  const [copiedRedirectUri, setCopiedRedirectUri] = useState(false);

  // Initialize and generate fresh verification code on open
  useEffect(() => {
    if (isOpen) {
      // If requested tab is oauth but oauth is disabled and not admin, default to roblox_fast
      if (initialTab === 'roblox_oauth' && !isOAuthEnabled && !isAdmin) {
        setActiveTab('roblox_fast');
      } else {
        setActiveTab(initialTab);
      }

      setOauthError(null);
      setSearchError(null);
      setVerificationSuccess(false);
      setVerificationError(null);
      setIsSubmitting(false);

      // Generate a distinct verification code (e.g. BLOXVOTE-4829)
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      setVerificationCode(`BLOXVOTE-${randomNum}`);

      // Fetch dynamic redirect URI for OAuth
      fetch('/api/roblox/oauth/config')
        .then(res => res.json())
        .then(data => {
          if (data.redirectUri) setRedirectUri(data.redirectUri);
        })
        .catch(() => {
          setRedirectUri(`${window.location.origin}/api/roblox/oauth/callback`);
        });

      // Restore last searched username
      const savedUser = localStorage.getItem('last_roblox_username');
      if (savedUser && !usernameInput) {
        setUsernameInput(savedUser);
      }
    }
  }, [isOpen, initialTab, isOAuthEnabled, isAdmin]);

  // Fallback tab if oauth becomes disabled
  useEffect(() => {
    if (activeTab === 'roblox_oauth' && !isOAuthEnabled && !isAdmin) {
      setActiveTab('roblox_fast');
    }
  }, [isOAuthEnabled, isAdmin, activeTab]);

  // Listen for OAuth postMessage events from popup
  useEffect(() => {
    const handleOAuthMessage = async (event: MessageEvent) => {
      if (!event.data) return;

      if (event.data.type === 'ROBLOX_OAUTH_SUCCESS' && event.data.user) {
        setIsOAuthLoading(false);
        const authedUser: RobloxAccountInfo = event.data.user;
        try {
          if (isLinkingOnly) {
            await linkRobloxAccount(authedUser);
          } else {
            await signInWithRoblox(authedUser);
          }
          playSound('fanfare');
          confetti({
            particleCount: 60,
            spread: 80,
            origin: { y: 0.6 }
          });
          if (onSuccess) onSuccess();
          onClose();
        } catch (err: any) {
          console.warn('OAuth session notice:', err);
          playSound('fanfare');
          if (onSuccess) onSuccess();
          onClose();
        }
      } else if (event.data.type === 'ROBLOX_OAUTH_ERROR') {
        setIsOAuthLoading(false);
        setOauthError(event.data.error || 'Roblox authorization was cancelled or encountered an error.');
        playSound('error');
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [isLinkingOnly, onSuccess, onClose]);

  // Search Roblox Players manually via Search Button or Enter key
  const handleSearchPlayers = async () => {
    const query = usernameInput.trim();
    if (!query) {
      setSearchError('Please enter a Roblox username or User ID to search.');
      playSound('error');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setFoundUser(null);
    setHasSearched(true);
    setVerificationError(null);
    setVerificationSuccess(false);
    playSound('click');

    try {
      const players = await searchRobloxUsers(query);
      setMatchingPlayers(players);

      if (players.length === 0) {
        setSearchError(`No Roblox players found matching "${query}". Try searching a different keyword or enter your exact numeric Roblox User ID.`);
        playSound('error');
      } else {
        playSound('coin');
        // Store query in local storage
        localStorage.setItem('last_roblox_username', query);
      }
    } catch (err: any) {
      setSearchError(err?.message || `Failed to search players for "${query}". Please check your internet connection and try again.`);
      playSound('error');
    } finally {
      setIsSearching(false);
    }
  };

  // Select a player from search results
  const handleSelectPlayer = (player: RobloxAccountInfo) => {
    setFoundUser(player);
    setVerificationError(null);
    setVerificationSuccess(false);
    playSound('click');
  };

  // Deselect player to search again or pick another
  const handleBackToResults = () => {
    setFoundUser(null);
    setVerificationError(null);
    setVerificationSuccess(false);
    playSound('click');
  };

  // MANDATORY Bio Verification Handler: Verifies code is in live Roblox bio before signing in
  const handleVerifyBioAndSignIn = async () => {
    if (!foundUser || isVerifyingBio) return;
    setIsVerifyingBio(true);
    setVerificationError(null);
    playSound('click');

    try {
      const result = await verifyRobloxBioOwnership(foundUser.id, verificationCode);

      if (result.verified) {
        setVerificationSuccess(true);
        playSound('fanfare');
        confetti({
          particleCount: 60,
          spread: 80,
          origin: { y: 0.6 }
        });

        const verifiedUser: RobloxAccountInfo = {
          ...foundUser,
          isVerifiedOwner: true
        };

        if (isLinkingOnly) {
          await linkRobloxAccount(verifiedUser);
        } else {
          await signInWithRoblox(verifiedUser);
        }

        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 600);
      } else {
        const bioSnippet = result.currentBio ? `"${result.currentBio}"` : '(empty)';
        setVerificationError(
          result.error || result.message || `Code "${verificationCode}" was not found in your Roblox "About" section. Current bio: ${bioSnippet}. Please paste the code, click Save on Roblox, and try again.`
        );
        playSound('error');
      }
    } catch (err: any) {
      setVerificationError(err?.message || 'Error checking Roblox bio. Please verify your connection and try again.');
      playSound('error');
    } finally {
      setIsVerifyingBio(false);
    }
  };

  const handleLaunchRobloxOAuth = () => {
    setIsOAuthLoading(true);
    setOauthError(null);
    playSound('click');

    const effectiveClientId = clientIdInput.trim() || '6105930285419261461';
    if (clientIdInput.trim()) {
      localStorage.setItem('custom_roblox_client_id', clientIdInput.trim());
    }

    const clientIdParam = `?client_id=${encodeURIComponent(effectiveClientId)}`;
    const authUrl = `/api/roblox/oauth/authorize${clientIdParam}`;

    const width = 640;
    const height = 760;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      authUrl,
      'roblox_official_oauth',
      `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no,location=yes`
    );

    if (!popup) {
      setIsOAuthLoading(false);
      setOauthError('Popup was blocked by your browser. Please allow popups or open in a new tab.');
      playSound('error');
    }
  };

  const handleCopyRedirectUri = () => {
    const uriToCopy = redirectUri || `${window.location.origin}/api/roblox/oauth/callback`;
    navigator.clipboard.writeText(uriToCopy);
    setCopiedRedirectUri(true);
    playSound('coin');
    setTimeout(() => setCopiedRedirectUri(false), 2500);
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      playSound('fanfare');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Google sign in failed:', err);
      playSound('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminToggleOAuth = async () => {
    if (!onToggleOAuth || isTogglingOAuth) return;
    setIsTogglingOAuth(true);
    try {
      await onToggleOAuth(!isOAuthEnabled);
      playSound('coin');
    } catch (err) {
      console.error('Error toggling OAuth:', err);
    } finally {
      setIsTogglingOAuth(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800/80 bg-[#111216] text-white shadow-2xl z-10 font-sans"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all active:scale-95 cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>

          {/* Top Brand Header */}
          <div className="pt-6 px-6 sm:px-8 pb-4 border-b border-zinc-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600/20 border border-red-500/30 text-red-400">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M17.07 3.23L3.23 6.93 6.93 20.77 20.77 17.07 17.07 3.23zM13.63 9.17L9.17 10.37 10.37 14.83 14.83 13.63 13.63 9.17z"/>
                  </svg>
                </div>
                <div>
                  <span className="font-black tracking-widest text-lg text-white uppercase select-none block">
                    ROBLOX VERIFICATION
                  </span>
                  <span className="text-[10px] text-amber-400 uppercase tracking-wider font-bold flex items-center gap-1">
                    <Lock size={10} /> Bio Ownership Verification Required
                  </span>
                </div>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1.5 mt-4 p-1 rounded-xl bg-zinc-950/70 border border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('roblox_fast');
                  playSound('click');
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'roblox_fast'
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 font-black'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 font-bold'
                }`}
              >
                <ShieldCheck size={14} className={activeTab === 'roblox_fast' ? 'text-black' : 'text-amber-400'} />
                <span>Player Search & Bio</span>
              </button>

              {/* Show Roblox OAuth Tab if Enabled globally OR if User is Admin */}
              {(isOAuthEnabled || isAdmin) && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('roblox_oauth');
                    playSound('click');
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
                    activeTab === 'roblox_oauth'
                      ? 'bg-red-600 text-white shadow-md font-black'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <Sparkles size={13} />
                  <span>Roblox OAuth</span>
                  {isAdmin && !isOAuthEnabled && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-amber-300 font-bold border border-amber-400/40">
                      ADMIN
                    </span>
                  )}
                </button>
              )}

              {!isLinkingOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('google');
                    playSound('click');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'google'
                      ? 'bg-zinc-800 text-white shadow-md'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <span>Google</span>
                </button>
              )}
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* TAB 1: SEARCH ROBLOX PLAYERS & BIO VERIFICATION */}
            {activeTab === 'roblox_fast' && (
              <div className="space-y-5">
                {/* Search Username Input & Explicit Search Button */}
                {!foundUser ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                        <Search size={13} className="text-amber-400" />
                        <span>Search Roblox Players</span>
                      </label>
                      <p className="text-xs text-zinc-400">
                        Type any Roblox username or User ID, then click <strong>Search Players</strong>.
                      </p>

                      <div className="flex gap-2 pt-1">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={usernameInput}
                            onChange={(e) => setUsernameInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSearchPlayers();
                              }
                            }}
                            placeholder="e.g. Cadenb00ck, Builderman, 4320852390..."
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none transition-all"
                            autoFocus
                          />
                          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                            <User size={16} />
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isSearching}
                          onClick={handleSearchPlayers}
                          className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          {isSearching ? (
                            <Loader2 size={16} className="animate-spin text-zinc-950" />
                          ) : (
                            <Search size={16} />
                          )}
                          <span>{isSearching ? 'Searching...' : 'Search Players'}</span>
                        </button>
                      </div>
                    </div>

                    {searchError && (
                      <div className="p-3 rounded-xl bg-red-950/80 text-red-200 text-xs flex flex-col gap-1 border border-red-500 shadow-md">
                        <div className="flex items-center gap-2 font-bold text-red-400">
                          <AlertCircle size={16} className="shrink-0" />
                          <span>{searchError}</span>
                        </div>
                        <p className="text-[11px] text-zinc-300 pl-6">
                          Tip: You can also enter your numeric Roblox User ID (e.g. <code>4320852390</code>) or direct Roblox profile URL.
                        </p>
                      </div>
                    )}

                    {/* Matching Players List / Grid */}
                    {hasSearched && matchingPlayers.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                            <Users size={14} />
                            <span>Matching Players ({matchingPlayers.length})</span>
                          </span>
                          <span className="text-[11px] text-zinc-400">Click your avatar to select</span>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                          {matchingPlayers.map((player) => (
                            <button
                              key={player.id}
                              type="button"
                              onClick={() => handleSelectPlayer(player)}
                              className="w-full p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-800 hover:border-amber-500/50 transition-all flex items-center gap-3 text-left group cursor-pointer shadow-md hover:scale-[1.01]"
                            >
                              <div className="relative shrink-0">
                                <div className="h-12 w-12 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-950 group-hover:border-amber-500/60 transition-colors flex items-center justify-center">
                                  {player.avatarHeadshot ? (
                                    <img
                                      src={player.avatarHeadshot}
                                      alt={player.displayName}
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <User size={20} className="text-zinc-500" />
                                  )}
                                </div>
                                {player.hasVerifiedBadge && (
                                  <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[8px]">
                                    ✓
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h5 className="font-black text-white text-sm truncate group-hover:text-amber-400 transition-colors">
                                    {player.displayName}
                                  </h5>
                                </div>
                                <p className="text-xs text-zinc-400 truncate">@{player.name}</p>
                                <p className="text-[10px] text-zinc-500">ID: {player.id}</p>
                              </div>

                              <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 group-hover:bg-amber-500 group-hover:text-zinc-950 text-amber-300 text-xs font-black transition-all flex items-center gap-1 shrink-0">
                                <span>Select</span>
                                <ChevronRight size={13} />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Found User & Mandatory 3-Step Bio Verification Box */
                  <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-5 shadow-xl">
                    {/* Selected User Header & Change Button */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className="h-12 w-12 rounded-xl overflow-hidden border-2 border-amber-500/40 bg-zinc-900 shadow-md flex items-center justify-center">
                            {foundUser.avatarHeadshot ? (
                              <img
                                src={foundUser.avatarHeadshot}
                                alt={foundUser.displayName}
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <User size={20} className="text-zinc-500" />
                            )}
                          </div>
                          {foundUser.hasVerifiedBadge && (
                            <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[8px]">
                              ✓
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <h4 className="font-bold text-white text-sm truncate">{foundUser.displayName}</h4>
                          <p className="text-xs text-zinc-400 truncate">@{foundUser.name}</p>
                          <p className="text-[10px] text-zinc-500">ID: {foundUser.id}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={handleBackToResults}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowLeft size={12} />
                          <span>Change</span>
                        </button>

                        <a
                          href={`https://www.roblox.com/users/${foundUser.id}/profile`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-colors flex items-center gap-1"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>

                    {/* Step-by-Step Bio Verification Instructions */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                          <ShieldCheck size={14} />
                          <span>Ownership Verification (Required)</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          Step 1 of 2
                        </span>
                      </div>

                      <p className="text-xs text-zinc-300 leading-relaxed">
                        To prove you own <strong className="text-white">@{foundUser.name}</strong>, paste this one-time code anywhere in your Roblox <strong className="text-amber-300">&quot;About&quot;</strong> / Bio section:
                      </p>

                      {/* Code Box with 1-Click Copy */}
                      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-zinc-950 border-2 border-dashed border-amber-500/50">
                        <div className="flex-1 px-3 py-2 font-mono text-base font-black text-amber-300 text-center tracking-wider select-all">
                          {verificationCode}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(verificationCode);
                            setCopiedCode(true);
                            playSound('coin');
                            setTimeout(() => setCopiedCode(false), 2500);
                          }}
                          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          {copiedCode ? <Check size={14} className="text-black" /> : <Copy size={14} />}
                          <span>{copiedCode ? 'COPIED!' : 'COPY CODE'}</span>
                        </button>
                      </div>

                      {/* Helper Link to Roblox Account Settings */}
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/80">
                        <span>Need to edit your bio?</span>
                        <a
                          href="https://www.roblox.com/my/account"
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-400 hover:text-amber-300 font-bold hover:underline inline-flex items-center gap-1"
                        >
                          <span>Open Roblox Account Settings</span>
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    </div>

                    {/* Verification Failure Message */}
                    {verificationError && (
                      <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/80 text-red-200 text-xs space-y-1.5">
                        <div className="flex items-center gap-2 font-bold text-red-400">
                          <AlertCircle size={15} className="shrink-0" />
                          <span>Bio Verification Incomplete</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">{verificationError}</p>
                      </div>
                    )}

                    {/* Verification Success Message */}
                    {verificationSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/80 text-emerald-200 text-xs flex items-center gap-2 font-bold">
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                        <span>Ownership Verified! Signing you in...</span>
                      </div>
                    )}

                    {/* MANDATORY PRIMARY ACTION: Check Bio & Sign In */}
                    <button
                      type="button"
                      disabled={isVerifyingBio || verificationSuccess}
                      onClick={handleVerifyBioAndSignIn}
                      className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-sm tracking-wide transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                    >
                      {isVerifyingBio ? (
                        <>
                          <Loader2 size={18} className="animate-spin text-black" />
                          <span>Checking Roblox Bio...</span>
                        </>
                      ) : verificationSuccess ? (
                        <>
                          <CheckCircle2 size={18} className="text-black" />
                          <span>Verified!</span>
                        </>
                      ) : (
                        <>
                          <KeyRound size={18} className="text-black" />
                          <span>Verify Bio &amp; Sign In</span>
                          <ArrowRight size={16} className="text-black" />
                        </>
                      )}
                    </button>

                    <p className="text-[10px] text-zinc-500 text-center leading-relaxed">
                      🔒 You can safely remove the verification code from your Roblox bio after signing in.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: OFFICIAL ROBLOX OAUTH */}
            {activeTab === 'roblox_oauth' && (isOAuthEnabled || isAdmin) && (
              <div className="space-y-5">
                {/* Admin Management Banner if Admin */}
                {isAdmin && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-900 border border-amber-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
                        <Shield size={16} />
                        <span>Admin OAuth Control</span>
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        isOAuthEnabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {isOAuthEnabled ? 'Enabled for Visitors' : 'Disabled for Visitors'}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300">
                      As an admin, you can enable or disable the official Roblox OAuth login button for public visitors.
                    </p>

                    {onToggleOAuth && (
                      <button
                        type="button"
                        disabled={isTogglingOAuth}
                        onClick={handleAdminToggleOAuth}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow ${
                          isOAuthEnabled
                            ? 'bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-500/50'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                        }`}
                      >
                        {isTogglingOAuth ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : isOAuthEnabled ? (
                          <>
                            <Lock size={14} />
                            <span>Disable Roblox OAuth for Public Visitors</span>
                          </>
                        ) : (
                          <>
                            <Zap size={14} />
                            <span>Enable Roblox OAuth for Public Visitors</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                <div className="p-4 rounded-xl bg-gradient-to-r from-red-950/40 via-zinc-900 to-zinc-900 border border-red-900/50 space-y-2">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
                    <ShieldCheck size={16} />
                    <span>Roblox Account Authorization</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    This connects directly to Roblox&apos;s official OAuth 2.0 authorization page at <code className="text-red-300 font-mono text-[11px] bg-red-950/60 px-1 py-0.5 rounded">authorize.roblox.com</code>.
                  </p>
                </div>

                {oauthError && (
                  <div className="p-3.5 rounded-xl bg-red-600/90 text-white text-xs space-y-2.5 border border-red-500 shadow-lg">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertCircle size={16} className="shrink-0" />
                      <span>Authorization Notice</span>
                    </div>
                    <p className="text-[11px] text-red-100 leading-normal">{oauthError}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('roblox_fast');
                        playSound('click');
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-white text-zinc-950 font-black text-xs hover:bg-zinc-100 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow"
                    >
                      <KeyRound size={14} className="text-amber-600" />
                      <span>Switch to Player Search &amp; Bio (Instant)</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  disabled={isOAuthLoading}
                  onClick={handleLaunchRobloxOAuth}
                  className="w-full py-4 px-6 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black text-base tracking-wide transition-all shadow-xl hover:shadow-red-600/25 active:scale-[0.99] flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
                >
                  {isOAuthLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>Connecting to authorize.roblox.com...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                        <path fillRule="evenodd" clipRule="evenodd" d="M17.07 3.23L3.23 6.93 6.93 20.77 20.77 17.07 17.07 3.23zM13.63 9.17L9.17 10.37 10.37 14.83 14.83 13.63 13.63 9.17z"/>
                      </svg>
                      <span>Authorize on Roblox</span>
                      <ArrowRight size={18} className="text-white/80" />
                    </>
                  )}
                </button>

                {/* Custom Client ID / Redirect URI Config Accordion */}
                <div className="border border-zinc-800 rounded-xl bg-zinc-900/60 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfigGuide(!showConfigGuide);
                      playSound('click');
                    }}
                    className="w-full p-3.5 flex items-center justify-between text-left text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Settings size={14} className="text-amber-400" />
                      <span>OAuth App Settings &amp; Redirect URI Guide</span>
                    </div>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {showConfigGuide ? '▲ Hide' : '▼ Setup custom app'}
                    </span>
                  </button>

                  {showConfigGuide && (
                    <div className="p-4 border-t border-zinc-800 text-xs space-y-4 bg-zinc-950/80">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                          1. Your App&apos;s Redirect URI (Required by Roblox)
                        </label>
                        <p className="text-[11px] text-zinc-400">
                          Roblox requires this exact URI to be listed in your Roblox Creator Dashboard:
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="text"
                            readOnly
                            value={redirectUri || `${window.location.origin}/api/roblox/oauth/callback`}
                            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-zinc-300 select-all"
                          />
                          <button
                            type="button"
                            onClick={handleCopyRedirectUri}
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            {copiedRedirectUri ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                            <span>{copiedRedirectUri ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                          2. Custom Roblox Client ID (Optional)
                        </label>
                        <input
                          type="text"
                          value={clientIdInput}
                          onChange={(e) => setClientIdInput(e.target.value)}
                          placeholder="e.g. 6105930285419261461"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-red-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: GOOGLE SIGN IN */}
            {activeTab === 'google' && !isLinkingOnly && (
              <div className="space-y-4 text-center">
                <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                  <p className="text-xs text-zinc-300">
                    Sign in securely with your Google account to save votes, comments, and rank up.
                  </p>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleGoogleSignIn}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white text-zinc-950 font-black text-sm hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-lg disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <Loader2 size={18} className="animate-spin text-zinc-800" />
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>Continue with Google</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
