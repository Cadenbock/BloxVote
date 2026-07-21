import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Link as LinkIcon, User, Gamepad2, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { Game } from '../types';

interface AddGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingGames: Game[];
  onAdd: (game: { 
    name: string; 
    creator: string; 
    robloxUrl: string; 
    imageUrl: string; 
    description: string;
    creatorId?: number;
    creatorType?: string;
  }) => void;
}

export default function AddGameModal({ isOpen, onClose, existingGames, onAdd }: AddGameModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    creator: '',
    robloxUrl: '',
    description: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [fetchedImageUrl, setFetchedImageUrl] = useState('');
  const [fetchedCreatorId, setFetchedCreatorId] = useState<number | undefined>(undefined);
  const [fetchedCreatorType, setFetchedCreatorType] = useState<string | undefined>(undefined);

  const extractRobloxId = (url: string) => {
    const match = url.match(/games\/(\d+)/);
    return match ? match[1] : null;
  };

  // Automatically fetch Roblox details when a valid URL is typed/pasted
  useEffect(() => {
    const robloxId = extractRobloxId(formData.robloxUrl);
    if (!robloxId) {
      if (formData.robloxUrl) {
        setStatus('error');
        setErrorMessage('Invalid Roblox game URL. Please paste a standard Roblox game URL.');
      } else {
        setStatus('idle');
        setErrorMessage('');
      }
      return;
    }

    // Check for duplicate game ID in already existing games
    const isDuplicate = existingGames.some(game => {
      const existingId = extractRobloxId(game.robloxUrl);
      return existingId && existingId === robloxId;
    });

    if (isDuplicate) {
      setStatus('error');
      setErrorMessage('This game is already on the leaderboard!');
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      setStatus('fetching');
      setErrorMessage('');
      try {
        const response = await fetch(`/api/roblox-info?url=${encodeURIComponent(formData.robloxUrl)}`);
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to auto-fetch Roblox details.');
        }

        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          name: data.name || prev.name,
          creator: data.creator || prev.creator,
          description: data.description || prev.description
        }));
        setFetchedImageUrl(data.imageUrl || '');
        setFetchedCreatorId(data.creatorId || undefined);
        setFetchedCreatorType(data.creatorType || undefined);
        setStatus('success');
      } catch (err: any) {
        console.error('Error auto-fetching details:', err);
        setStatus('error');
        setErrorMessage(err.message || 'Could not fetch details. Please fill manually.');
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchDetails, 500); // Debounce fetch
    return () => clearTimeout(timeoutId);
  }, [formData.robloxUrl, existingGames]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const gameId = extractRobloxId(formData.robloxUrl);
    if (!gameId) {
      setStatus('error');
      setErrorMessage('Invalid Roblox game URL.');
      return;
    }

    const isDuplicate = existingGames.some(game => {
      const existingId = extractRobloxId(game.robloxUrl);
      return existingId && existingId === gameId;
    });

    if (isDuplicate) {
      setStatus('error');
      setErrorMessage('This game is already on the leaderboard!');
      return;
    }

    const imageUrl = fetchedImageUrl || (gameId 
      ? `https://www.roblox.com/asset-thumbnail/image?assetId=${gameId}&width=420&height=420&format=png`
      : `https://picsum.photos/seed/${formData.name}/800/600`);

    onAdd({ 
      ...formData, 
      imageUrl,
      creatorId: fetchedCreatorId,
      creatorType: fetchedCreatorType
    });
    
    // Reset state
    setFormData({ name: '', creator: '', robloxUrl: '', description: '' });
    setFetchedImageUrl('');
    setFetchedCreatorId(undefined);
    setFetchedCreatorType(undefined);
    setStatus('idle');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-500">
                  <Plus size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Add Roblox Game</h2>
                  <p className="text-xs text-zinc-500">Paste URL to automatically fetch details</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* URL Input First */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                  <LinkIcon size={16} /> Roblox URL
                </label>
                <div className="relative">
                  <input
                    required
                    type="url"
                    placeholder="https://www.roblox.com/games/920587237/Adopt-Me"
                    className="w-full rounded-xl bg-zinc-800 border border-zinc-700 p-3 pr-10 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none transition-colors"
                    value={formData.robloxUrl}
                    onChange={e => setFormData({ ...formData, robloxUrl: e.target.value })}
                  />
                  <div className="absolute right-3 top-3.5 flex items-center">
                    {status === 'fetching' && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
                    {status === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                    {status === 'idle' && <Sparkles className="h-5 w-5 text-zinc-500" />}
                  </div>
                </div>
              </div>

              {/* Status or Error Notifications */}
              {status === 'fetching' && (
                <div className="text-xs text-blue-400 bg-blue-950/40 border border-blue-900/40 rounded-xl p-3 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Auto-fetching game title, creator, description, and icon...
                </div>
              )}
              {status === 'success' && (
                <div className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 rounded-xl p-3 flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  Perfect! Successfully auto-filled game info from Roblox.
                </div>
              )}
              {status === 'error' && errorMessage && (
                <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900/40 rounded-xl p-3">
                  {errorMessage}
                </div>
              )}

              {/* Game Icon Preview */}
              {fetchedImageUrl && (
                <div className="flex items-center gap-4 bg-zinc-800/40 border border-zinc-800 p-3 rounded-xl">
                  <img
                    src={fetchedImageUrl}
                    alt="Fetched Game Icon"
                    className="h-16 w-16 object-cover rounded-lg border border-zinc-700"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Roblox Game Icon</h4>
                    <p className="text-xs text-zinc-500">Automatically parsed and linked to official Roblox servers</p>
                  </div>
                </div>
              )}

              {/* Rest of the form */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400 flex items-center justify-between">
                  <span className="flex items-center gap-2"><Gamepad2 size={16} /> Game Name</span>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Locked (Auto-filled)</span>
                </label>
                <input
                  required
                  readOnly
                  type="text"
                  placeholder="Will be auto-filled from URL"
                  className="w-full rounded-xl bg-zinc-800/50 border border-zinc-800 p-3 text-zinc-400 placeholder:text-zinc-600 focus:outline-none cursor-not-allowed opacity-80"
                  value={formData.name}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400 flex items-center justify-between">
                  <span className="flex items-center gap-2"><User size={16} /> Creator</span>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Locked (Auto-filled)</span>
                </label>
                <input
                  required
                  readOnly
                  type="text"
                  placeholder="Will be auto-filled from URL"
                  className="w-full rounded-xl bg-zinc-800/50 border border-zinc-800 p-3 text-zinc-400 placeholder:text-zinc-600 focus:outline-none cursor-not-allowed opacity-80"
                  value={formData.creator}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400 flex items-center justify-between">
                  <span>Description</span>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Locked (Auto-filled)</span>
                </label>
                <textarea
                  readOnly
                  rows={3}
                  placeholder="Will be auto-filled from URL"
                  className="w-full rounded-xl bg-zinc-800/50 border border-zinc-800 p-3 text-zinc-400 placeholder:text-zinc-600 focus:outline-none cursor-not-allowed resize-none opacity-80"
                  value={formData.description}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full rounded-xl bg-blue-600 py-4 font-bold text-white hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98]"
              >
                {loading ? 'Please wait...' : 'Submit Game'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
