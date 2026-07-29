import type { CSSProperties } from 'react';

export interface Game {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  votes: number;
  creator: string;
  creatorId?: number;
  creatorType?: 'User' | 'Group' | string;
  robloxUrl: string;
  createdAt: any;
  createdBy: string;
  isFeatured?: boolean;
}

export interface Vote {
  id: string;
  gameId: string;
  userId: string;
  timestamp: any;
}

export interface Activity {
  id: string;
  type: 'vote' | 'unvote' | 'add_game' | 'delete_game' | 'feature_game' | 'unfeature_game' | 'admin_add' | 'admin_remove' | 'admin_grant_coins' | 'chat_flagged' | 'custom_title_request' | 'approve_custom_title' | 'decline_custom_title' | 'shop_buy' | 'custom_theme_unlock' | 'avatar_request' | 'approve_avatar' | 'decline_avatar';
  title: string;
  description: string;
  userDisplayName?: string;
  userEmail?: string;
  userPhotoURL?: string;
  userId?: string;
  gameId?: string;
  gameName?: string;
  timestamp: any;
}

export interface ChatFlag {
  id: string;
  userUid: string;
  userDisplayName: string;
  userPhotoURL?: string;
  originalText: string;
  filteredText: string;
  flaggedWords: string[];
  wasBlocked: boolean;
  timestamp: any;
}

export interface AdminUser {
  id: string; // UID
  email: string;
  displayName?: string;
  addedAt?: any;
  addedBy?: string;
  role?: string;
}

export interface CustomThemeConfig {
  name: string;
  bgGradient: string;
  cardBorderClass: string;
  backgroundClass: string;
  accentColor: string;
  pattern?: string;
}

export interface AdminCustomTitle {
  id: string;
  title: string;
  name: string;
  price: number;
  category: string;
  tagClass: string;
  description: string;
  createdAt?: any;
  createdBy?: string;
}

export interface AdminCustomFont {
  id: string;
  name: string;
  fontFamily: string;
  price: number;
  sampleText: string;
  category: string;
  description: string;
  createdAt?: any;
  createdBy?: string;
}

export interface CustomColorConfig {
  name: string;
  type: 'solid' | 'linear' | 'radial';
  color1: string;
  color2?: string;
  color3?: string;
  glowColor?: string;
  glowIntensity?: 'none' | 'soft' | 'medium' | 'high';
  style?: CSSProperties;
  className?: string;
}

export interface CustomFontConfig {
  name: string;
  fontFamily: string;
  fontUrl?: string;
  fontDataUrl?: string;
  fontFileName?: string;
  sampleText?: string;
}

export interface UserProfileData {
  coins: number;
  equippedColor: string;
  purchasedColors: string[];
  equippedTheme: string;
  purchasedThemes: string[];
  equippedFont?: string;
  purchasedFonts?: string[];
  equippedTitle?: string;
  purchasedTitles?: string[];
  customThemeConfig?: CustomThemeConfig;
  customColorConfig?: CustomColorConfig;
  customFontConfig?: CustomFontConfig;
  displayName?: string;
  photoURL?: string;
  lastDailyBonusDate?: string;
  lastCustomTitleRequestTime?: number;
}

export interface CustomTitleRequest {
  id: string;
  userId: string;
  userDisplayName: string;
  userEmail?: string;
  userPhotoURL?: string;
  requestedTitle: string;
  status: 'pending' | 'accepted' | 'declined';
  requestedAt: any;
  reviewedAt?: any;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface AvatarRequest {
  id: string;
  userId: string;
  userDisplayName: string;
  userEmail?: string;
  userPhotoURL?: string;
  requestedPhotoURL: string;
  status: 'pending' | 'accepted' | 'declined';
  requestedAt: any;
  reviewedAt?: any;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface PublicChatMessage {
  id: string;
  senderUid: string;
  senderDisplayName: string;
  senderPhotoURL?: string;
  senderColor?: string;
  senderColorConfig?: CustomColorConfig;
  senderTheme?: string;
  senderTitle?: string;
  senderFont?: string;
  senderFontConfig?: CustomFontConfig;
  text: string;
  timestamp: any;
}

export interface UserStreakData {
  streakCount: number;
  highestStreak: number;
  lastVotedDate: string;
  totalDaysVoted: number;
}

export interface GlobalAnnouncement {
  message: string;
  enabled: boolean;
  durationSeconds?: number;
  updatedAt?: any;
  updatedBy?: string;
}

export interface AdminChatMessage {
  id: string;
  senderUid: string;
  senderEmail: string;
  senderDisplayName: string;
  senderPhotoURL?: string;
  text: string;
  timestamp: any;
}

export interface UpdateLog {
  id: string;
  version?: string;
  title: string;
  category: 'major' | 'feature' | 'fix' | 'balance';
  changes: string[];
  timestamp: any;
  authorName?: string;
  authorEmail?: string;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderUid: string;
  senderDisplayName: string;
  senderPhotoURL?: string;
  senderColor?: string;
  senderTitle?: string;
  recipientUid: string;
  recipientDisplayName: string;
  originalText: string;
  filteredText: string;
  hasProfanity?: boolean;
  translations?: Record<string, { translatedText: string; sourceLanguage: string }>;
  timestamp: any;
  isRead?: boolean;
}

export interface ConversationParticipant {
  uid: string;
  displayName: string;
  photoURL?: string;
  equippedColor?: string;
  equippedTitle?: string;
}

export interface Conversation {
  id: string;
  participantUids: string[];
  participants: Record<string, ConversationParticipant>;
  lastMessageText: string;
  lastMessageTimestamp: any;
  lastMessageSenderUid: string;
  unreadCounts: Record<string, number>;
  updatedAt: any;
}

export type NotificationType = 'dm' | 'reward' | 'streak' | 'announcement' | 'game' | 'system' | 'mention';

export interface AppNotification {
  id: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: any;
  isRead: boolean;
  linkAction?: 'open_dm' | 'open_shop' | 'open_updates' | 'open_chat' | 'open_leaderboard' | 'open_profile';
  actionData?: {
    partnerUid?: string;
    partnerName?: string;
    partnerPhoto?: string;
    partnerColor?: string;
    gameId?: string;
  };
}

