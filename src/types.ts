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
  type: 'vote' | 'unvote' | 'add_game' | 'delete_game' | 'feature_game' | 'unfeature_game' | 'admin_add' | 'admin_remove';
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

export interface AdminUser {
  id: string; // UID
  email: string;
  displayName?: string;
  addedAt?: any;
  addedBy?: string;
  role?: string;
}

export interface UserStreakData {
  streakCount: number;
  highestStreak: number;
  lastVotedDate: string;
  totalDaysVoted: number;
}

