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
      
      // Extract wallet addresses and verifications
      const verifiedAddresses = user.verified_addresses || {};
      const ethAddresses = verifiedAddresses.eth_addresses || [];
      const solAddresses = verifiedAddresses.sol_addresses || [];
      const verifications = user.verifications || [];
      
      return {
        id: String(user.fid),
        displayName: user.display_name || user.displayName || user.username || user.fname,
        username: user.username || user.fname,
        bio: user.profile?.bio?.text || undefined,
        profileImageUrl: user.pfp_url || user.pfp?.url || undefined,
        followerCount: user.follower_count || user.followerCount || 0,
        followingCount: user.following_count || user.followingCount || 0,
        platform: this.platform,
        verified: ethAddresses.length > 0 || verifications.length > 0,
        metadata: {
          verifications: verifications,
          verifiedEthAddresses: ethAddresses,
          verifiedSolAddresses: solAddresses,
          primaryEthAddress: ethAddresses[0] || undefined,
          primarySolAddress: solAddresses[0] || undefined,
          activeStatus: user.active_status || undefined,
          viewerContext: user.viewer_context || undefined,
          profileUrl: user.profile_url || undefined,
          custodyAddress: user.custody_address || undefined,
          recoveryAddress: user.recovery_address || undefined,
          hasEmail: user.has_email || false,
          powerBadge: user.power_badge || undefined
        }
      };
    } catch (error) {
      console.error('Error fetching Farcaster user profile:', error);
      throw new Error(`Failed to fetch profile for user ${userId}`);
    }
  }

  async getUserProfileByWalletAddress(walletAddress: string): Promise<UserProfile> {
    if (!this.client) {
      console.error('Neynar client not initialized');
      throw new Error('Neynar client not initialized');
    }

    try {
      console.log(`Fetching user profile for wallet address: ${walletAddress}`);
      
      // Use the correct endpoint to fetch users by ETH address
      const response = await this.client.fetchBulkUsersByEthOrSolAddress({
        addresses: [walletAddress]
      });
      
      // The response contains a map of address to array of users
      const users = response[walletAddress.toLowerCase()];
      
      if (!users || users.length === 0) {
        console.log(`No user found for wallet address: ${walletAddress}`);
        throw new Error(`User with wallet address ${walletAddress} not found`);
      }

      // Get the most complete profile (one with username and display name)
      const user = users.find((u: { username: string }) => u.username && !u.username.startsWith('!')) || users[0];
      
      return {
        id: user.fid.toString(),
        displayName: user.display_name || '',
        username: user.username || '',
        bio: user.profile?.bio?.text || '',
        profileImageUrl: user.pfp_url || '',
        followerCount: user.follower_count || 0,
        followingCount: user.following_count || 0,
        platform: this.platform,
        metadata: {
          verifications: user.verifications || [],
          verifiedEthAddresses: user.verified_addresses?.eth_addresses || [],
          verifiedSolAddresses: user.verified_addresses?.sol_addresses || []
        }
      };
    } catch (error) {
      console.error('Error fetching Farcaster user profile by wallet:', error);
      throw new Error(`Failed to fetch profile for wallet address ${walletAddress}`);
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

  async getTrendingFeed(options: TrendingOptions = {}): Promise<SocialContent[]> {
    // Check if API key is provided
    if (!config.providers.farcaster.neynarApiKey) {
      console.error('Cannot get Farcaster trending feed: No API key provided');
      return [{
        id: 'error',
        text: 'Cannot get Farcaster trending feed: No API key provided. Please set NEYNAR_API_KEY in your .env file.',
        authorId: 'system',
        authorName: 'System',
        authorUsername: 'system',
        createdAt: new Date().toISOString(),
        platform: this.platform,
        metadata: { error: 'missing_api_key' }
      }];
    }

    try {
      console.error('Fetching trending feed from Farcaster');
      
      // Default to neynar provider if none specified
      const provider = options.provider || 'neynar';
      console.error(`Using provider: ${provider}`);

      // Prepare the request parameters
      const params: any = {
        limit: options.limit || 20,
        time_window: options.timeWindow || '24h'
      };

      // Add provider-specific parameters
      if (provider === 'mbd' && options.providerMetadata) {
        // For MBD provider, we can add custom filters
        const providerMetadata = {
          filters: {
            ...options.providerMetadata,
            // Ensure we have valid timestamps if provided
            start_timestamp: options.providerMetadata.startTimestamp,
            end_timestamp: options.providerMetadata.endTimestamp
          }
        };
        params.provider_metadata = encodeURIComponent(JSON.stringify(providerMetadata));
      }

      // Make the API call based on the provider
      let response;
      if (provider === 'neynar') {
        response = await this.client.fetchFeed({
          feedType: FeedType.Filter,
          filterType: FilterType.GlobalTrending,
          limit: params.limit
        });
      } else {
        // For openrank and mbd providers, use the trending endpoint
        const url = `https://api.neynar.com/v2/farcaster/feed/trending?${new URLSearchParams(params)}`;
        const fetchResponse = await fetch(url, {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'api_key': config.providers.farcaster.neynarApiKey
          }
        });
        response = await fetchResponse.json();
      }

      console.error(`Response received: ${response ? 'Yes' : 'No'}`);
      
      // Handle different response formats based on provider
      let casts: any[] = [];
      if (provider === 'neynar') {
        casts = response.casts || [];
      } else {
        // For openrank and mbd providers, the response format is different
        casts = response.result?.casts || [];
      }

      if (!Array.isArray(casts) || casts.length === 0) {
        console.error('No trending casts found');
        return [];
      }

      console.error(`Found ${casts.length} trending casts`);
      
      // Map the casts to our standardized SocialContent format and apply limit
      const mappedCasts = this.mapCastsToSocialContent(casts);
      return options.limit ? mappedCasts.slice(0, options.limit) : mappedCasts;
    } catch (error) {
      console.error('Error fetching trending feed:', error);
      return [];
    }
  }

  async getUserBalance(userId: string | number): Promise<any> {
    // Check if API key is provided
    if (!config.providers.farcaster.neynarApiKey) {
      console.error('Cannot get Farcaster user balance: No API key provided');
      throw new Error('Cannot get Farcaster user balance: No API key provided. Please set NEYNAR_API_KEY in your .env file.');
    }

    try {
      let fid: number;
      
      // Check if userId is a numeric FID or a username
      if (typeof userId === 'number' || /^\d+$/.test(String(userId))) {
        // If userId is numeric, parse it as FID
        fid = typeof userId === 'number' ? userId : parseInt(String(userId), 10);
        console.error(`Treating ${userId} as numeric FID: ${fid}`);
      } else {
        // If userId is not numeric, try to fetch by username
        console.error(`Treating ${userId} as username, looking up user`);
        try {
          // Use searchUser for username lookups
          const userResponse = await this.client.searchUser({ q: String(userId), limit: 1 });
          
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

      console.error(`Fetching user balance for FID: ${fid}`);
      
      // Make the API call to fetch user balance
      const response = await this.client.fetchUserBalance({
        fid: fid,
        networks: ['base'] // Currently, only 'base' is supported
      });

      console.error(`Response received: ${response ? 'Yes' : 'No'}`);
      
      if (!response || !response.user_balance) {
        console.error('No balance data found in response');
        throw new Error('No balance data found for user');
      }

      // Return the user_balance object directly
      return response.user_balance;
    } catch (error) {
      console.error('Error fetching user balance:', error);
      throw error;
    }
  }

  async searchChannels(query: string, options: { 
    limit?: number;
    cursor?: string;
    includeChannels?: boolean;
  } = {}): Promise<{
    channels: Array<{
      id: string;
      name: string;
      description?: string;
      followerCount: number;
      parentUrl?: string;
      imageUrl?: string;
      leadFid?: number;
      createdAt: string;
      updatedAt: string;
      focusAreas?: string[];
      communityStats?: {
        followers: number;
        created: string;
        lastUpdated: string;
      };
      significance?: string;
    }>;
    nextCursor?: string;
  }> {
    // Check if API key is provided
    if (!config.providers.farcaster.neynarApiKey) {
      console.error('Cannot search Farcaster channels: No API key provided');
      throw new Error('Cannot search Farcaster channels: No API key provided. Please set NEYNAR_API_KEY in your .env file.');
    }

    try {
      console.error(`Searching Farcaster channels for: "${query}"`);
      
      // Prepare the request parameters
      const params: any = {
        q: query,
        limit: options.limit || 20
      };

      // Add cursor if provided
      if (options.cursor) {
        params.cursor = options.cursor;
      }

      // Add include_channels parameter if specified
      if (options.includeChannels !== undefined) {
        params.include_channels = options.includeChannels;
      }

      // Make the API call to search channels
      const response = await this.client.searchChannels(params);

      console.error(`Response received: ${response ? 'Yes' : 'No'}`);
      
      if (!response || !response.channels || !Array.isArray(response.channels)) {
        console.error('No channels found in response');
        return {
          channels: [],
          nextCursor: undefined
        };
      }

      console.error(`Found ${response.channels.length} channels`);

      // Map the response to our standardized format with enhanced information
      const channels = response.channels.map((channel: any) => {
        // Extract focus areas from description
        const focusAreas = channel.description
          ? this.extractFocusAreas(channel.description)
          : [];

        // Format dates
        const createdAt = new Date(channel.created_at * 1000).toISOString();
        const updatedAt = channel.updated_at || createdAt;

        // Determine channel significance
        const significance = this.determineChannelSignificance(channel);

        return {
          id: channel.id || '',
          name: channel.name || '',
          description: channel.description,
          followerCount: channel.follower_count || 0,
          parentUrl: channel.parent_url,
          imageUrl: channel.image_url,
          leadFid: channel.lead_fid,
          createdAt,
          updatedAt,
          focusAreas,
          communityStats: {
            followers: channel.follower_count || 0,
            created: createdAt,
            lastUpdated: updatedAt
          },
          significance
        };
      });

      // Log detailed information about each channel
      channels.forEach((channel: {
        name: string;
        description?: string;
        focusAreas?: string[];
        followerCount: number;
        createdAt: string;
        updatedAt: string;
        significance?: string;
      }) => {
        console.error(`
Channel Details for "${query}":
- Name: ${channel.name}
- Description: ${channel.description || 'N/A'}
- Focus Areas: ${channel.focusAreas?.join(', ') || 'N/A'}
- Followers: ${channel.followerCount}
- Created: ${channel.createdAt}
- Last Updated: ${channel.updatedAt}
- Significance: ${channel.significance || 'N/A'}
        `);
      });

      return {
        channels,
        nextCursor: response.next?.cursor
      };

    } catch (error) {
      console.error('Error searching channels:', error);
      throw error;
    }
  }

  async searchBulkChannels(queries: string[], options: {
    limit?: number;
    cursor?: string;
    includeChannels?: boolean;
  } = {}): Promise<{
    [query: string]: {
      channels: Array<{
        id: string;
        name: string;
        description?: string;
        followerCount: number;
        parentUrl?: string;
        imageUrl?: string;
        leadFid?: number;
        createdAt: string;
        updatedAt: string;
        focusAreas?: string[];
        communityStats?: {
          followers: number;
          created: string;
          lastUpdated: string;
        };
        significance?: string;
      }>;
      nextCursor?: string;
    };
  }> {
    // Check if API key is provided
    if (!config.providers.farcaster.neynarApiKey) {
      console.error('Cannot search Farcaster channels: No API key provided');
      throw new Error('Cannot search Farcaster channels: No API key provided. Please set NEYNAR_API_KEY in your .env file.');
    }

    try {
      console.error(`Searching Farcaster channels for ${queries.length} queries`);
      
      // Prepare the request parameters
      const params: any = {
        limit: options.limit || 20
      };

      // Add cursor if provided
      if (options.cursor) {
        params.cursor = options.cursor;
      }

      // Add include_channels parameter if specified
      if (options.includeChannels !== undefined) {
        params.include_channels = options.includeChannels;
      }

      // Create a map to store results for each query
      const results: {
        [query: string]: {
          channels: Array<{
            id: string;
            name: string;
            description?: string;
            followerCount: number;
            parentUrl?: string;
            imageUrl?: string;
            leadFid?: number;
            createdAt: string;
            updatedAt: string;
            focusAreas?: string[];
            communityStats?: {
              followers: number;
              created: string;
              lastUpdated: string;
            };
            significance?: string;
          }>;
          nextCursor?: string;
        };
      } = {};

      // Process each query in parallel
      await Promise.all(
        queries.map(async (query) => {
          try {
            console.error(`Processing query: "${query}"`);
            
            // Add the query to the parameters
            params.q = query;

            // Make the API call to search channels
            const response = await this.client.searchChannels(params);

            console.error(`Response received for query "${query}": ${response ? 'Yes' : 'No'}`);
            
            if (!response || !response.channels || !Array.isArray(response.channels)) {
              console.error(`No channels found for query: "${query}"`);
              results[query] = {
                channels: [],
                nextCursor: undefined
              };
              return;
            }

            console.error(`Found ${response.channels.length} channels for query "${query}"`);

            // Map the response to our standardized format with enhanced information
            const channels = response.channels.map((channel: any) => {
              // Extract focus areas from description
              const focusAreas = channel.description
                ? this.extractFocusAreas(channel.description)
                : [];

              // Format dates
              const createdAt = new Date(channel.created_at * 1000).toISOString();
              const updatedAt = channel.updated_at || createdAt;

              // Determine channel significance
              const significance = this.determineChannelSignificance(channel);

              return {
                id: channel.id || '',
                name: channel.name || '',
                description: channel.description,
                followerCount: channel.follower_count || 0,
                parentUrl: channel.parent_url,
                imageUrl: channel.image_url,
                leadFid: channel.lead_fid,
                createdAt,
                updatedAt,
                focusAreas,
                communityStats: {
                  followers: channel.follower_count || 0,
                  created: createdAt,
                  lastUpdated: updatedAt
                },
                significance
              };
            });

            results[query] = {
              channels,
              nextCursor: response.next?.cursor
            };

            // Log detailed information about each channel
            channels.forEach((channel: {
              name: string;
              description?: string;
              focusAreas?: string[];
              followerCount: number;
              createdAt: string;
              updatedAt: string;
              significance?: string;
            }) => {
              console.error(`
Channel Details for "${query}":
- Name: ${channel.name}
- Description: ${channel.description || 'N/A'}
- Focus Areas: ${channel.focusAreas?.join(', ') || 'N/A'}
- Followers: ${channel.followerCount}
- Created: ${channel.createdAt}
- Last Updated: ${channel.updatedAt}
- Significance: ${channel.significance || 'N/A'}
              `);
            });

          } catch (error) {
            console.error(`Error processing query "${query}":`, error);
            results[query] = {
              channels: [],
              nextCursor: undefined
            };
          }
        })
      );

      return results;

    } catch (error) {
      console.error('Error in bulk channel search:', error);
      throw error;
    }
  }

  private extractFocusAreas(description: string): string[] {
    // Extract key topics from description
    const topics = description.toLowerCase()
      .split(/[.,;]|\band\b|\bor\b/)
      .map(topic => topic.trim())
      .filter(topic => topic.length > 0);

    // Remove common words and keep only relevant topics
    const commonWords = ['the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with'];
    return topics
      .filter(topic => !commonWords.includes(topic))
      .map(topic => topic.charAt(0).toUpperCase() + topic.slice(1));
  }

  private determineChannelSignificance(channel: {
    name: string;
    description?: string;
    follower_count?: number;
    image_url?: string;
  }): string {
    const followerCount = channel.follower_count || 0;
    const hasDescription = !!channel.description;
    const hasImage = !!channel.image_url;
    const isOfficialChannel = channel.name.toLowerCase().includes('official');

    if (isOfficialChannel) {
      return 'Official channel for platform/project updates and announcements';
    } else if (followerCount > 10000) {
      return 'Major community hub with significant following';
    } else if (followerCount > 1000) {
      return 'Growing community with active engagement';
    } else if (hasDescription && hasImage) {
      return 'Well-maintained channel with regular updates';
    } else {
      return 'Emerging channel in development';
    }
  }
} 