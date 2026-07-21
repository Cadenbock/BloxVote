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
}

export interface Vote {
  id: string;
  gameId: string;
  userId: string;
  timestamp: any;
}
