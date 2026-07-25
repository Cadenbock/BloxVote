import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { X, Sparkles, Tag, Calendar, CheckCircle2, Search, Filter, ShieldCheck, Zap, Bug, Scale } from 'lucide-react';
import { db } from '../firebase';
import { UpdateLog } from '../types';
import { cn } from '../lib/utils';

interface UpdateLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  onOpenAdminWithTab?: (tab: string) => void;
}

export default function UpdateLogsModal({ isOpen, onClose, isAdmin, onOpenAdminWithTab }: UpdateLogsModalProps) {
  const [logs, setLogs] = useState<UpdateLog[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const q = query(collection(db, 'updateLogs'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UpdateLog));
      setLogs(fetchedLogs);
    }, (err) => {
      console.warn("Update logs listener error:", err);
    });

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter(log => {
    const matchesCategory = selectedCategory === 'all' || log.category === selectedCategory;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery.trim() ||
      log.title.toLowerCase().includes(searchLower) ||
      (log.version && log.version.toLowerCase().includes(searchLower)) ||
      log.changes.some(c => c.toLowerCase().includes(searchLower));
    return matchesCategory && matchesSearch;
  });

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'major':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 px-3 py-1 text-xs font-black uppercase text-purple-400">
            <Sparkles size={12} />
            Major Update
          </span>
        );
      case 'feature':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 px-3 py-1 text-xs font-black uppercase text-blue-400">
            <Zap size={12} />
            New Feature
          </span>
        );
      case 'fix':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-black uppercase text-emerald-400">
            <Bug size={12} />
            Bug Fix
          </span>
        );
      case 'balance':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-black uppercase text-amber-400">
            <Scale size={12} />
            Adjustment
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 border border-zinc-700 px-3 py-1 text-xs font-black uppercase text-zinc-300">
            Update
          </span>
        );
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Recently';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-3xl rounded-2xl sm:rounded-[2.5rem] border border-zinc-800 bg-zinc-900/95 p-4 sm:p-8 shadow-2xl backdrop-blur-xl z-10 my-auto sm:my-8 overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-zinc-800/80 pb-4 sm:pb-6 shrink-0 gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 pr-2">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-inner shrink-0">
                <Sparkles size={22} className="sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2 truncate">
                  Update Logs & Changelog
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 line-clamp-1">
                  Discover what's new, fixed, and improved on BloxVote
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all border border-zinc-700/50 shrink-0"
              aria-label="Close Modal"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Controls Bar: Search + Category filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 my-4 sm:my-6 shrink-0">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search update logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none transition-all"
              />
            </div>

            {/* Category Pill Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none max-w-full">
              {[
                { id: 'all', label: 'All' },
                { id: 'major', label: 'Major' },
                { id: 'feature', label: 'Features' },
                { id: 'fix', label: 'Fixes' },
                { id: 'balance', label: 'Adjustments' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0 border",
                    selectedCategory === cat.id
                      ? "bg-blue-600 text-white border-blue-400 shadow-md"
                      : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content List */}
          <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 space-y-4 sm:space-y-6">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 space-y-3">
                <Sparkles size={32} className="text-zinc-600" />
                <p className="text-sm font-bold text-zinc-300">No update logs found</p>
                <p className="text-xs text-zinc-500 max-w-sm">
                  {searchQuery || selectedCategory !== 'all'
                    ? 'Try clearing your search or category filter.'
                    : 'Check back soon for new release notes and feature announcements!'}
                </p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-2xl sm:rounded-3xl border border-zinc-800 bg-zinc-950/60 p-4 sm:p-6 space-y-3 sm:space-y-4 hover:border-zinc-700/80 transition-all shadow-lg relative group"
                >
                  {/* Top Bar of Log item */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getCategoryBadge(log.category)}
                      {log.version && (
                        <span className="font-mono text-[11px] sm:text-xs font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-zinc-700">
                          {log.version}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-zinc-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} className="text-blue-400" />
                        {formatDate(log.timestamp)}
                      </span>
                      {log.authorName && (
                        <span className="text-zinc-500 truncate max-w-[120px] sm:max-w-none">
                          by <strong className="text-zinc-300">{log.authorName}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm sm:text-lg font-black text-white leading-snug">
                    {log.title}
                  </h3>

                  {/* Bulleted Changes */}
                  <div className="space-y-1.5 sm:space-y-2 pt-1 border-t border-zinc-850">
                    {log.changes.map((change, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                        <CheckCircle2 size={15} className="text-blue-400 shrink-0 mt-0.5" />
                        <span className="break-words">{change}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Admin shortcut if logged in as admin */}
          {isAdmin && onOpenAdminWithTab && (
            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between shrink-0 flex-wrap gap-2">
              <p className="text-[11px] sm:text-xs text-zinc-500 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-emerald-400" />
                Administrator active
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenAdminWithTab('updates');
                }}
                className="text-[11px] sm:text-xs font-bold text-blue-400 hover:text-blue-300 underline underline-offset-4 flex items-center gap-1 transition-colors"
              >
                + Publish or Edit in Admin Suite
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
