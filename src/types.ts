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
  type: 'vote' | 'unvote' | 'add_game' | 'delete_game' | 'feature_game' | 'unfeature_game' | 'admin_add' | 'admin_remove' | 'admin_grant_coins' | 'chat_flagged';
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

export interface UserProfileData {
  coins: number;
  equippedColor: string;
  purchasedColors: string[];
  equippedTheme: string;
  purchasedThemes: string[];
  displayName?: string;
  photoURL?: string;
  lastDailyBonusDate?: string;
}

export interface PublicChatMessage {
  id: string;
  senderUid: string;
  senderDisplayName: string;
  senderPhotoURL?: string;
  senderColor?: string;
  senderTheme?: string;
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

