import { 
  ContentProvider, 
  SocialContent,
  UserProfile,
  Thread,
  SearchOptions,
  ContentOptions,
  ThreadOptions,
  TrendingOptions
} from '../interfaces/provider';
import config from '../../config';

// Import the Neynar SDK without type checking
// @ts-ignore
import * as neynar from '@neynar/nodejs-sdk';
// @ts-ignore
import { FeedType, FilterType } from '@neynar/nodejs-sdk/build/api';

export class FarcasterProvider implements ContentProvider {
  private client: any;
  public name = 'farcaster';
  public platform = 'farcaster';
  
  constructor() {
    console.error('Initializing FarcasterProvider');
    console.error('Neynar API Key:', config.providers.farcaster.neynarApiKey ? 'Set (not showing full key)' : 'Not set');
    
    // Check if API key is provided
    if (!config.providers.farcaster.neynarApiKey) {
      console.error('No Neynar API key provided. Farcaster provider will not function correctly.');
      console.error('Please set NEYNAR_API_KEY in your .env file or environment variables.');
      // Still initialize the client with an empty key, but it won't work for API calls
    }
    
    try {
      // Initialize the Neynar client without strict typing
      const neynarConfig = new neynar.Configuration({
        apiKey: config.providers.farcaster.neynarApiKey
      });
      console.error('Neynar configuration created successfully');
      
      this.client = new neynar.NeynarAPIClient(neynarConfig);
      console.error('Neynar client initialized successfully');
    } catch (error) {
      console.error('Error initializing Neynar client:', error);
      throw error;
    }
  }
  
  async isAvailable(): Promise<boolean> {
    console.error('Checking if Farcaster provider is available');
    
    // If no API key is provided, return false immediately
    if (!config.providers.farcaster.neynarApiKey) {
      console.error('Farcaster provider is not available: No API key provided');
      return false;
    }
    
    // Try up to 3 times to connect to the API
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // Make a simple API call to check if Neynar is available
        console.error(`Making test API call to Neynar (attempt ${attempt} of 3)`);
        
        // Use a simple endpoint that's less likely to fail
        const response = await this.client.fetchBulkUsers({ fids: [1] });
        
        // If we get here, the API is available
        console.error('Neynar API call successful: Response received');
        return true;
      } catch (error) {
        // Check if this is a 502 Bad Gateway or other server error
        const errorString = String(error);
        if (errorString.includes('502 Bad Gateway') || 
            errorString.includes('503 Service Unavailable') ||
            errorString.includes('504 Gateway Timeout')) {
          console.error(`Neynar API server error on attempt ${attempt}: ${errorString}`);
          
          // If this isn't our last attempt, wait before retrying
          if (attempt < 3) {
            const waitTime = attempt * 1000; // Increase wait time with each attempt
            console.error(`Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        } else {
          // For other errors, log and fail immediately
          console.error('Farcaster provider unavailable:', error);
          return false;
        }
      }
    }
    
    // If we've tried 3 times and still failed, return false
    console.error('Farcaster provider unavailable after 3 attempts');
    
    // For development purposes, return true to allow testing even when API is down
    if (process.env.NODE_ENV === 'development') {
      console.error('Running in development mode - marking provider as available despite API issues');
      return true;
    }
    
    return false;
  }
  
  async searchContent(query: string, options: SearchOptions = {}): Promise<SocialContent[]> {
    // Check if API key is provided
    if (!config.providers.farcaster.neynarApiKey) {
      console.error('Cannot search Farcaster content: No API key provided');
      return [{
        id: 'error',
        text: 'Cannot search Farcaster: No API key provided. Please set NEYNAR_API_KEY in your .env file.',
        authorId: 'system',
        authorName: 'System',
        authorUsername: 'system',
        createdAt: new Date().toISOString(),
        platform: this.platform,
        metadata: { error: 'missing_api_key' }
      }];
    }

    try {
      console.error(`Searching Farcaster for: "${query}"`);
      
      // Handle special query formats
      if (query.startsWith('from:')) {
        const username = query.substring(5).trim();
        console.error(`Detected 'from:' query for username: ${username}`);
        
        try {
          // First, find the user's FID
          const userResponse = await this.client.searchUser({ q: username, limit: 1 });
          
          if (!userResponse || !userResponse.result || !userResponse.result.users || 
              !Array.isArray(userResponse.result.users) || userResponse.result.users.length === 0) {
            console.error(`User not found for query: ${query}`);
            return [];
          }
          
          const user = userResponse.result.users[0];
          if (!user || !user.fid) {
            console.error(`User has no FID for query: ${query}`);
            return [];
          }
          
          const fid = user.fid;
          console.error(`Found FID ${fid} for username ${username}, fetching casts`);
          
          // Fetch casts for this user
          const response = await this.client.fetchCastsForUser({
            fid: fid,
            limit: options.limit || 20
          });
          
          if (!response || !response.casts || !Array.isArray(response.casts)) {
            console.error('No casts found for user');
            return [];
          }
          
          console.error(`Found ${response.casts.length} casts for user ${username}`);
          
          // Map the response to our format
          return this.mapCastsToSocialContent(response.casts);
        } catch (error) {
          console.error(`Error processing 'from:' query: ${error}`);
          return [];
        }
      } else {
        // Regular search query
        console.error(`Making search API call with parameters: ${JSON.stringify({
          q: query,
          limit: options.limit || 20
        })}`);
        
        try {
          // Use the searchCasts method with the correct parameters
          const response = await this.client.searchCasts({
            q: query,
            limit: options.limit || 20
          });
          
          console.error(`Search response received: ${response ? 'Yes' : 'No'}`);
          
          if (!response || !response.result || !response.result.casts || !Array.isArray(response.result.casts)) {
            console.error('No casts found in response');
            return [];
          }
          
          console.error(`Found ${response.result.casts.length} casts`);
          
          // Map Neynar response to our standardized SocialContent format
          return this.mapCastsToSocialContent(response.result.casts);
        } catch (error) {
          console.error(`Error during search API call: ${error}`);
          
          // If the search fails, return an empty array
          return [];
        }
      }
    } catch (error) {
      console.error('Error in searchContent:', error);
      return [];
    }
  }
  
  // Helper method to map casts to SocialContent format
  private mapCastsToSocialContent(casts: any[]): SocialContent[] {
    return casts.map((cast: any) => {
      try {
        return {
          id: cast.hash || '',
          text: cast.text || '',
          authorId: cast.author?.fid ? String(cast.author.fid) : 'unknown',
          authorName: cast.author?.display_name || cast.author?.username || 'Unknown Author',
          authorUsername: cast.author?.username || 'unknown',
          createdAt: cast.timestamp ? new Date(cast.timestamp).toISOString() : new Date().toISOString(),
          platform: this.platform,
          replyToId: cast.parent_hash || undefined,
          threadId: cast.thread_hash || cast.hash || '',
          likes: cast.reactions?.likes_count || 0,
          reposts: cast.reactions?.recasts_count || 0,
          replies: cast.replies?.count || 0,
          url: cast.author?.username ? 
               `https://warpcast.com/${cast.author.username}/${cast.hash ? cast.hash.substring(0, 10) : ''}` : 
               `https://warpcast.com/~/cast/${cast.hash || ''}`,
          metadata: {
            embeds: cast.embeds || [],
            mentions: cast.mentioned_profiles || []
          }
        };
      } catch (castError) {
        console.error(`Error processing cast: ${castError}`);
        // Return a minimal valid cast object
        return {
          id: cast.hash || 'unknown',
          text: cast.text || '',
          authorId: 'unknown',
          authorName: 'Unknown Author',
          authorUsername: 'unknown',
          createdAt: new Date().toISOString(),
          platform: this.platform,
          url: '',
          metadata: {}
        };
      }
    });
  }
  
  async getUserProfile(userId: string): Promise<UserProfile> {
    // Check if API key is provided
    if (!config.providers.farcaster.neynarApiKey) {
      console.error('Cannot get Farcaster user profile: No API key provided');
      return {
        id: 'error',
        displayName: 'Error',
        username: 'error',
        bio: 'Cannot get Farcaster user profile: No API key provided. Please set NEYNAR_API_KEY in your .env file.',
        platform: this.platform,
        metadata: { error: 'missing_api_key' }
      };
    }

    try {
      console.error(`Fetching user profile for: ${userId}`);
      
      let response;
      
      // Check if userId is a numeric FID or a username
      if (/^\d+$/.test(userId)) {
        // If userId is numeric, parse it as FID
        const fid = parseInt(userId, 10);
        console.error(`Treating ${userId} as numeric FID: ${fid}`);
        
        // Fetch user by FID
        response = await this.client.fetchBulkUsers({ fids: [fid] });
      } else {
        // If userId is not numeric, try to fetch by username
        console.error(`Treating ${userId} as username`);
        
        // Use searchUser for username lookups
        response = await this.client.searchUser({ q: userId, limit: 1 });
      }
      
      console.error(`Response received: ${response ? 'Yes' : 'No'}`);
      
      let user;
      
      if (response.users && Array.isArray(response.users) && response.users.length > 0) {
        // For fetchBulkUsers response
        user = response.users[0];
      } else if (response.result && response.result.users && Array.isArray(response.result.users) && response.result.users.length > 0) {
        // For searchUser response
        user = response.result.users[0];
      }
      
      if (!user) {
        console.error(`No user found for: ${userId}`);
        throw new Error(`User with ID ${userId} not found`);
      }
      
      console.error(`User found: ${user.username || user.fname}`);
      
      return {
        id: String(user.fid),
        displayName: user.display_name || user.displayName || user.username || user.fname,
        username: user.username || user.fname,
        bio: user.profile?.bio?.text || undefined,
        profileImageUrl: user.pfp_url || user.pfp?.url || undefined,
        followerCount: user.follower_count || user.followerCount || 0,
        followingCount: user.following_count || user.followingCount || 0,
        platform: this.platform,
        verified: user.verified_addresses?.eth_addresses?.length > 0 || user.verifications?.length > 0,
        metadata: {
          verifications: user.verifications || []
        }
      };
    } catch (error) {
      console.error('Error fetching Farcaster user profile:', error);
      throw new Error(`Failed to fetch profile for user ${userId}`);
    }
  }
  
  async getUserContent(userId: string, options: ContentOptions = {}): Promise<SocialContent[]> {
    // Check if API key is provided
    if (!config.providers.farcaster.neynarApiKey) {
      console.error('Cannot get Farcaster user content: No API key provided');
      return [{
        id: 'error',
        text: 'Cannot get Farcaster user content: No API key provided. Please set NEYNAR_API_KEY in your .env file.',
        authorId: 'system',
        authorName: 'System',
        authorUsername: 'system',
        createdAt: new Date().toISOString(),
        platform: this.platform,
        metadata: { error: 'missing_api_key' }
      }];
    }

    try {
      console.error(`Fetching content for user: ${userId}`);
      
      let fid: number;
      
      // Check if userId is numeric (FID) or a username
      if (/^\d+$/.test(userId)) {
        fid = parseInt(userId, 10);
        console.error(`Using FID: ${fid}`);
      } else {
        // Treat as username, look up the FID
        console.error(`Treating ${userId} as username, looking up user`);
        try {
          // Use searchUser instead of lookupUserByUsername which is causing issues
          const userResponse = await this.client.searchUser({ q: userId, limit: 1 });
          
          if (!userResponse || !userResponse.result || !userResponse.result.users || 
              !Array.isArray(userResponse.result.users) || userResponse.result.users.length === 0) {
            throw new Error(`User not found: ${userId}`);
          }
          
          const user = userResponse.result.users[0];
          if (!user || !user.fid) {
            throw new Error(`User not found: ${userId}`);
          }
          
          fid = user.fid;
          console.error(`Found FID ${fid} for username ${userId}`);
        } catch (error) {
          console.error(`Error looking up user by username: ${error}`);
          throw new Error(`Failed to find user: ${userId}`);
        }
      }
      
      // Fetch user's casts using the correct method
      console.error(`Fetching casts for FID: ${fid}`);
      
      const response = await this.client.fetchCastsForUser({
        fid: fid,
        limit: options.limit || 20,
        cursor: options.cursor
      });
      
      console.error(`Response received: ${response ? 'Yes' : 'No'}`);
      
      if (!response || !response.casts || !Array.isArray(response.casts)) {
        console.error('No casts found in response');
        return [];
      }
      
      console.error(`Found ${response.casts.length} casts`);
      
      // Map Neynar response to our standardized SocialContent format with safe property access
      return response.casts.map((cast: any) => {
        try {
          return {
            id: cast.hash || '',
            text: cast.text || '',
            authorId: cast.author?.fid ? String(cast.author.fid) : 'unknown',
            authorName: cast.author?.display_name || cast.author?.username || 'Unknown Author',
            authorUsername: cast.author?.username || 'unknown',
            createdAt: cast.timestamp ? new Date(cast.timestamp).toISOString() : new Date().toISOString(),
            platform: this.platform,
            replyToId: cast.parent_hash || undefined,
            threadId: cast.thread_hash || cast.hash || '',
            likes: cast.reactions?.likes_count || 0,
            reposts: cast.reactions?.recasts_count || 0,
            replies: cast.replies?.count || 0,
            url: cast.author?.username ? 
                 `https://warpcast.com/${cast.author.username}/${cast.hash ? cast.hash.substring(0, 10) : ''}` : 
                 `https://warpcast.com/~/cast/${cast.hash || ''}`,
            metadata: {
              embeds: cast.embeds || [],
              mentions: cast.mentioned_profiles || []
            }
          };
        } catch (castError) {
          console.error(`Error processing cast: ${castError}`);
          // Return a minimal valid cast object
          return {
            id: cast.hash || 'unknown',
            text: cast.text || '',
            authorId: 'unknown',
            authorName: 'Unknown Author',
            authorUsername: 'unknown',
            createdAt: new Date().toISOString(),
            platform: this.platform,
            url: '',
            metadata: {}
          };
        }
      });
    } catch (error) {
      console.error('Error fetching Farcaster user content:', error);
      return [];
    }
  }
  
  async getThread(threadId: string, options: ThreadOptions = {}): Promise<Thread> {
    // Check if API key is provided
    if (!config.providers.farcaster.neynarApiKey) {
      console.error('Cannot get Farcaster thread: No API key provided');
      const errorContent: SocialContent = {
        id: 'error',
        text: 'Cannot get Farcaster thread: No API key provided. Please set NEYNAR_API_KEY in your .env file.',
        authorId: 'system',
        authorName: 'System',
        authorUsername: 'system',
        createdAt: new Date().toISOString(),
        platform: this.platform,
        metadata: { error: 'missing_api_key' }
      };
      
      return {
        id: 'error',
        content: errorContent,
        replies: [],
        platform: this.platform,
        metadata: { error: 'missing_api_key' }
      };
    }

    try {
      console.error(`Fetching thread: ${threadId}`);
      
      // Try multiple approaches to fetch the cast
      let cast = null;
      let castResponse = null;
      
      // Approach 1: Try with the provided identifier directly
      try {
        const isUrl = threadId.startsWith('http');
        let identifier = threadId;
        
        // If it's a hash, make sure it's properly formatted with 0x prefix
        if (!isUrl && !threadId.startsWith('0x')) {
          identifier = `0x${threadId}`;
        }
        
        console.error(`Trying with identifier: ${identifier}`);
        
        castResponse = await this.client.lookupCastByHashOrWarpcastUrl({
          identifier: identifier,
          type: isUrl ? 'url' : 'hash'
        });
        
        if (castResponse && castResponse.cast) {
          cast = castResponse.cast;
          console.error(`Found cast with hash: ${cast.hash}`);
        }
      } catch (error: any) {
        console.error(`First approach failed: ${error.message}`);
      }
      
      // Approach 2: Try with a constructed Warpcast URL
      if (!cast) {
        try {
          // Try with a constructed URL using 'rish' as the username
          const constructedUrl = `https://warpcast.com/rish/${threadId.replace(/^0x/, '')}`;
          console.error(`Trying with URL: ${constructedUrl}`);
          
          castResponse = await this.client.lookupCastByHashOrWarpcastUrl({
            identifier: constructedUrl,
            type: 'url'
          });
          
          if (castResponse && castResponse.cast) {
            cast = castResponse.cast;
            console.error(`Found cast with hash: ${cast.hash}`);
          }
        } catch (error: any) {
          console.error(`Second approach failed: ${error.message}`);
        }
      }
      
      // If we couldn't find the cast, return an error thread
      if (!cast) {
        console.error(`Failed to find cast with ID: ${threadId}`);
        return {
          id: threadId,
          content: {
            id: threadId,
            text: `Thread not found: ${threadId}`,
            authorId: 'unknown',
            authorName: 'Unknown Author',
            authorUsername: 'unknown',
            createdAt: new Date().toISOString(),
            platform: this.platform,
            url: '',
            metadata: {}
          },
          replies: [],
          platform: this.platform
        };
      }
      
      // Create the main content object with safe property access
      const mainContent: SocialContent = {
        id: cast.hash || '',
        text: cast.text || '',
        authorId: cast.author?.fid ? String(cast.author.fid) : 'unknown',
        authorName: cast.author?.display_name || cast.author?.username || 'Unknown Author',
        authorUsername: cast.author?.username || 'unknown',
        createdAt: cast.timestamp ? new Date(cast.timestamp).toISOString() : new Date().toISOString(),
        platform: this.platform,
        replyToId: cast.parent_hash || undefined,
        threadId: cast.thread_hash || cast.hash || '',
        likes: cast.reactions?.likes_count || 0,
        reposts: cast.reactions?.recasts_count || 0,
        replies: cast.replies?.count || 0,
        url: cast.author?.username ? 
             `https://warpcast.com/${cast.author.username}/${cast.hash ? cast.hash.substring(0, 10) : ''}` : 
             `https://warpcast.com/~/cast/${cast.hash || ''}`,
        metadata: {
          embeds: cast.embeds || [],
          mentions: cast.mentioned_profiles || []
        }
      };
      
      // Step 2: Get the conversation (replies) using lookupCastConversation
      let repliesResponse;
      try {
        console.error(`Fetching conversation for hash: ${cast.hash}`);
        repliesResponse = await this.client.lookupCastConversation({
          identifier: cast.hash,
          type: 'hash',
          limit: options.limit || 20
        });
      } catch (error: any) {
        console.error(`Error fetching replies: ${error.message}`);
        repliesResponse = null;
      }
      
      // Process replies with safe property access
      const replies: SocialContent[] = [];
      
      // Check if we have direct_replies in the conversation.cast
      if (repliesResponse?.conversation?.cast?.direct_replies && 
          Array.isArray(repliesResponse.conversation.cast.direct_replies)) {
        
        const directReplies = repliesResponse.conversation.cast.direct_replies;
        console.error(`Processing ${directReplies.length} replies`);
        
        for (const reply of directReplies) {
          try {
            const replyContent: SocialContent = {
              id: reply.hash || '',
              text: reply.text || '',
              authorId: reply.author?.fid ? String(reply.author.fid) : 'unknown',
              authorName: reply.author?.display_name || reply.author?.username || 'Unknown Author',
              authorUsername: reply.author?.username || 'unknown',
              createdAt: reply.timestamp ? new Date(reply.timestamp).toISOString() : new Date().toISOString(),
              platform: this.platform,
              replyToId: reply.parent_hash || undefined,
              threadId: reply.thread_hash || reply.hash || '',
              likes: reply.reactions?.likes_count || 0,
              reposts: reply.reactions?.recasts_count || 0,
              replies: reply.replies?.count || 0,
              url: reply.author?.username ? 
                   `https://warpcast.com/${reply.author.username}/${reply.hash ? reply.hash.substring(0, 10) : ''}` : 
                   `https://warpcast.com/~/cast/${reply.hash || ''}`,
              metadata: {
                embeds: reply.embeds || [],
                mentions: reply.mentioned_profiles || []
              }
            };
            
            replies.push(replyContent);
            
            // If this reply has direct_replies, process them as well
            if (reply.direct_replies && Array.isArray(reply.direct_replies)) {
              for (const nestedReply of reply.direct_replies) {
                try {
                  const nestedReplyContent: SocialContent = {
                    id: nestedReply.hash || '',
                    text: nestedReply.text || '',
                    authorId: nestedReply.author?.fid ? String(nestedReply.author.fid) : 'unknown',
                    authorName: nestedReply.author?.display_name || nestedReply.author?.username || 'Unknown Author',
                    authorUsername: nestedReply.author?.username || 'unknown',
                    createdAt: nestedReply.timestamp ? new Date(nestedReply.timestamp).toISOString() : new Date().toISOString(),
                    platform: this.platform,
                    replyToId: nestedReply.parent_hash || undefined,
                    threadId: nestedReply.thread_hash || nestedReply.hash || '',
                    likes: nestedReply.reactions?.likes_count || 0,
                    reposts: nestedReply.reactions?.recasts_count || 0,
                    replies: nestedReply.replies?.count || 0,
                    url: nestedReply.author?.username ? 
                         `https://warpcast.com/${nestedReply.author.username}/${nestedReply.hash ? nestedReply.hash.substring(0, 10) : ''}` : 
                         `https://warpcast.com/~/cast/${nestedReply.hash || ''}`,
                    metadata: {
                      embeds: nestedReply.embeds || [],
                      mentions: nestedReply.mentioned_profiles || []
                    }
                  };
                  
                  replies.push(nestedReplyContent);
                } catch (nestedReplyError) {
                  console.error(`Error processing nested reply: ${nestedReplyError}`);
                }
              }
            }
          } catch (replyError) {
            console.error(`Error processing reply: ${replyError}`);
          }
        }
      } else {
        console.error('No replies found in the conversation response');
      }
      
      console.error(`Total replies processed: ${replies.length}`);
      
      // Create and return the thread object
      const thread: Thread = {
        id: threadId,
        content: mainContent,
        replies: replies,
        platform: this.platform
      };
      
      return thread;
      
    } catch (error: any) {
      console.error(`Error in getThread: ${error.message}`);
      
      // Return a minimal valid thread object instead of throwing
      return {
        id: threadId,
        content: {
          id: threadId,
          text: `Error fetching farcaster thread '${threadId}': ${error.message}`,
          authorId: 'unknown',
          authorName: 'Unknown Author',
          authorUsername: 'unknown',
          createdAt: new Date().toISOString(),
          platform: this.platform,
          url: '',
          metadata: {}
        },
        replies: [],
        platform: this.platform
      };
    }
  }
  
  async getTrendingTopics(options: TrendingOptions = {}): Promise<string[]> {
    // Check if API key is provided
    if (!config.providers.farcaster.neynarApiKey) {
      console.error('Cannot get Farcaster trending topics: No API key provided');
      return ['Error: No API key provided. Please set NEYNAR_API_KEY in your .env file.'];
    }

    try {
      console.error('Fetching trending topics from Farcaster');
      
      // Fetch trending feed using the correct API method
      const response = await this.client.fetchFeed({
        feedType: FeedType.Filter,
        filterType: FilterType.GlobalTrending,
        limit: 25 // Get a good sample of trending casts
      });
      
      console.error(`Response received: ${response ? 'Yes' : 'No'}`);
      
      if (!response || !response.casts || !Array.isArray(response.casts)) {
        console.error('No trending casts found');
        return ["farcaster", "web3", "crypto", "ai"]; // Fallback to default topics
      }
      
      console.error(`Found ${response.casts.length} trending casts`);
      
      // Extract hashtags from trending casts
      const hashtags = new Set<string>();
      
      response.casts.forEach((cast: any) => {
        // Extract hashtags from cast text
        const tags = cast.text.match(/#[\w-]+/g) || [];
        tags.forEach((tag: string) => hashtags.add(tag.substring(1))); // Remove the # symbol
      });
      
      // If no hashtags found, return default ones
      if (hashtags.size === 0) {
        console.error('No hashtags found in trending casts, using defaults');
        return ["farcaster", "web3", "crypto", "ai"];
      }
      
      // Convert to array and limit by options
      const trendingTopics = Array.from(hashtags);
      const limitedTopics = trendingTopics.slice(0, options.limit || 10);
      
      console.error(`Extracted ${limitedTopics.length} trending topics`);
      return limitedTopics;
    } catch (error) {
      console.error('Error fetching trending topics:', error);
      // Fallback to default topics
      return ["farcaster", "web3", "crypto", "ai"];
    }
  }
} 