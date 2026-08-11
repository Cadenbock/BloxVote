import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  X, 
  CheckCheck, 
  Trash2, 
  MessageSquare, 
  Coins, 
  Flame, 
  Sparkles, 
  Gamepad2, 
  Megaphone, 
  ArrowRight, 
  Inbox,
  Filter,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import CoolMerchButton from './CoolMerchButton';
import { AppNotification, NotificationType } from '../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (notificationId: string) => void;
  onClearAll: () => void;
  onExecuteAction: (
    action?: string, 
    data?: { partnerUid?: string; partnerName?: string; partnerPhoto?: string; partnerColor?: string; gameId?: string }
  ) => void;
}

export default function NotificationsModal({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onClearAll,
  onExecuteAction,
}: NotificationsModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'dm' | 'reward' | 'system'>('all');

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'unread') return !item.isRead;
    if (activeTab === 'dm') return item.type === 'dm' || item.type === 'mention';
    if (activeTab === 'reward') return item.type === 'reward' || item.type === 'streak';
    if (activeTab === 'system') return item.type === 'announcement' || item.type === 'game' || item.type === 'system';
    return true;
  });

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'dm':
      case 'mention':
        return <MessageSquare size={16} className="text-violet-400" />;
      case 'reward':
        return <Coins size={16} className="text-amber-400 fill-amber-400/20" />;
      case 'streak':
        return <Flame size={16} className="text-orange-400 fill-orange-400/20" />;
      case 'announcement':
        return <Megaphone size={16} className="text-cyan-400" />;
      case 'game':
        return <Gamepad2 size={16} className="text-emerald-400" />;
      case 'system':
      default:
        return <Sparkles size={16} className="text-blue-400" />;
    }
  };

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'Recently';
    
    let date: Date;
    if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      date = new Date();
    }

    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const handleNotificationClick = (item: AppNotification) => {
    if (!item.isRead) {
      onMarkAsRead(item.id);
    }
    if (item.linkAction) {
      onExecuteAction(item.linkAction, item.actionData);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl rounded-3xl border border-zinc-800 bg-zinc-950 text-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 p-5 bg-gradient-to-r from-zinc-900/90 to-zinc-950">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <Bell size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black tracking-tight text-white">Notifications</h2>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-black text-white shadow-sm">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400">Updates, messages, and reward alerts</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllAsRead}
                  className="hidden sm:flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:border-zinc-700 hover:text-white transition-all"
                  title="Mark all as read"
                >
                  <CheckCheck size={14} className="text-emerald-400" />
                  <span>Mark Read</span>
                </button>
              )}

              {notifications.length > 0 && (
                <button
                  onClick={onClearAll}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:border-red-900/50 hover:bg-red-950/30 hover:text-red-400 transition-all"
                  title="Clear all notifications"
                >
                  <Trash2 size={14} />
                  <span className="hidden sm:inline">Clear All</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-zinc-800 px-4 pt-2 bg-zinc-900/30 gap-1 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-1.5 py-2.5 px-3.5 font-bold text-xs rounded-xl transition-all ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              All ({notifications.length})
            </button>

            <button
              onClick={() => setActiveTab('unread')}
              className={`flex items-center gap-1.5 py-2.5 px-3.5 font-bold text-xs rounded-xl transition-all ${
                activeTab === 'unread'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              Unread ({unreadCount})
            </button>

            <button
              onClick={() => setActiveTab('dm')}
              className={`flex items-center gap-1.5 py-2.5 px-3.5 font-bold text-xs rounded-xl transition-all ${
                activeTab === 'dm'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <MessageSquare size={13} />
              Messages
            </button>

            <button
              onClick={() => setActiveTab('reward')}
              className={`flex items-center gap-1.5 py-2.5 px-3.5 font-bold text-xs rounded-xl transition-all ${
                activeTab === 'reward'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Coins size={13} />
              Rewards
            </button>

            <button
              onClick={() => setActiveTab('system')}
              className={`flex items-center gap-1.5 py-2.5 px-3.5 font-bold text-xs rounded-xl transition-all ${
                activeTab === 'system'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Sparkles size={13} />
              System
            </button>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {/* Featured Official Merch Banner */}
            <div className="my-1">
              <CoolMerchButton
                variant="banner"
                label="BloxVote Official Merch Drop!"
                sublabel="Hoodies, tees, stickers & exclusive metaverse apparel."
              />
            </div>

            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-900 border border-zinc-800 mb-3">
                  <Inbox size={28} className="text-zinc-600" />
                </div>
                <p className="font-bold text-zinc-300 text-base">No notifications found</p>
                <p className="text-xs text-zinc-500 max-w-xs mt-1">
                  {activeTab === 'unread' 
                    ? "You've read all your notifications!" 
                    : "You're all caught up! New alerts and messages will show up here."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`group relative flex items-start gap-3.5 rounded-2xl border p-3.5 transition-all cursor-pointer ${
                    !item.isRead
                      ? 'border-blue-500/40 bg-gradient-to-r from-blue-950/20 to-indigo-950/10 hover:border-blue-500/60'
                      : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/80'
                  }`}
                >
                  {/* Unread indicator dot */}
                  {!item.isRead && (
                    <span className="absolute top-3.5 right-3.5 flex h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                  )}

                  {/* Icon Container */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 shadow-sm mt-0.5">
                    {getNotificationIcon(item.type)}
                  </div>

                  {/* Body Text */}
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-xs font-bold leading-snug ${!item.isRead ? 'text-white' : 'text-zinc-300'}`}>
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {formatTimeAgo(item.timestamp)}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed break-words">
                      {item.message}
                    </p>

                    {item.linkAction && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-blue-400 group-hover:text-blue-300 transition-colors">
                        <span>Take action</span>
                        <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    )}
                  </div>

                  {/* Actions on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 self-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNotification(item.id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-950/40 text-zinc-500 hover:text-red-400 transition-colors"
                      title="Delete notification"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Info */}
          <div className="border-t border-zinc-800 p-3 px-5 bg-zinc-900/60 flex items-center justify-between text-[11px] text-zinc-500">
            <span>BloxVote Notification Hub</span>
            <span>Realtime Updates Active</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
