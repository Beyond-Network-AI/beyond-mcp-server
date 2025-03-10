export interface SocialContent {
  id: string;
  text: string;
  authorId: string;
  authorName?: string;
  authorUsername?: string;
  createdAt: string;
  platform: string;
  replyToId?: string;
  threadId?: string;
  likes?: number;
  reposts?: number;
  replies?: number;
  url?: string;
  metadata?: Record<string, any>;
}

export interface UserProfile {
  id: string;
  displayName?: string;
  username?: string;
  bio?: string;
  profileImageUrl?: string;
  followerCount?: number;
  followingCount?: number;
  platform: string;
  verified?: boolean;
  metadata?: Record<string, any>;
}

export interface Thread {
  id: string;
  content: SocialContent;
  replies: SocialContent[];
  platform: string;
  metadata?: Record<string, any>;
}

export interface ContentProvider {
  // Provider identification
  name: string;
  platform: string;
  
  // Core methods
  isAvailable(): Promise<boolean>;
  
  // Content search
  searchContent(query: string, options?: SearchOptions): Promise<SocialContent[]>;
  
  // User data
  getUserProfile(userId: string): Promise<UserProfile>;
  getUserContent(userId: string, options?: ContentOptions): Promise<SocialContent[]>;
  
  // Thread/conversation data
  getThread(threadId: string, options?: ThreadOptions): Promise<Thread>;
  
  // Trending information
  getTrendingTopics(options?: TrendingOptions): Promise<string[]>;
}

export interface SearchOptions {
  limit?: number;
  includeReplies?: boolean;
  startTime?: Date;
  endTime?: Date;
  sortBy?: 'recent' | 'popular';
}

export interface ContentOptions {
  limit?: number;
  includeReplies?: boolean;
  contentTypes?: string[];
  cursor?: string;
}

export interface ThreadOptions {
  limit?: number;
  includeRootContent?: boolean;
}

export interface TrendingOptions {
  limit?: number;
  category?: string;
  location?: string;
} 