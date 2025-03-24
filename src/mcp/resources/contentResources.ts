import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ProviderRegistry } from '../../providers/registry';
import { SocialContent } from '../../providers/interfaces/provider';
import { TrendingOptions } from '../../providers/interfaces/provider';

export function registerContentResources(server: McpServer, providerRegistry: ProviderRegistry) {
  // Search resource
  server.resource(
    "social-search",
    new ResourceTemplate("social://{platform}/{query}/search", { list: undefined }),
    async (uri, params) => {
      try {
        const platform = params.platform as string;
        const query = params.query as string;
        
        const provider = providerRegistry.getProviderForPlatform(platform);
        
        if (!provider) {
          throw new Error(`Provider for platform '${platform}' not found`);
        }
        
        const results = await provider.searchContent(query, { limit: 10 });
        
        return {
          contents: [{
            uri: uri.href,
            text: formatSearchResults(results, query, platform)
          }]
        };
      } catch (error) {
        console.error(`Error in social-search resource:`, error);
        return {
          contents: [{
            uri: uri.href,
            text: `Error searching ${params.platform} for '${params.query}': ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
  
  // User profile resource
  server.resource(
    "user-profile",
    new ResourceTemplate("social://{platform}/user/{userId}/profile", { list: undefined }),
    async (uri, params) => {
      try {
        const platform = params.platform as string;
        const userId = params.userId as string;
        
        const provider = providerRegistry.getProviderForPlatform(platform);
        
        if (!provider) {
          throw new Error(`Provider for platform '${platform}' not found`);
        }
        
        const profile = await provider.getUserProfile(userId);
        
        return {
          contents: [{
            uri: uri.href,
            text: formatUserProfile(profile)
          }]
        };
      } catch (error) {
        console.error(`Error in user-profile resource:`, error);
        return {
          contents: [{
            uri: uri.href,
            text: `Error fetching ${params.platform} user profile for '${params.userId}': ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
  
  server.resource(
    "user-profile-by-wallet",
    new ResourceTemplate("social://{platform}/wallet/{walletAddress}/profile", { list: undefined }),
    async (uri, params) => {
      try {
        const platform = params.platform as string;
        const walletAddress = params.walletAddress as string;
        
        const provider = providerRegistry.getProviderForPlatform(platform);
        
        if (!provider) {
          throw new Error(`Provider for platform '${platform}' not found`);
        }
        
        const profile = await provider.getUserProfileByWalletAddress(walletAddress);
        
        return {
          contents: [{
            uri: uri.href,
            text: formatUserProfile(profile)
          }]
        };
      } catch (error) {
        console.error(`Error in user-profile-by-wallet resource:`, error);
        return {
          contents: [{
            uri: uri.href,
            text: `Error fetching ${params.platform} user profile for wallet '${params.walletAddress}': ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
  
  // User content resource
  server.resource(
    "user-content",
    new ResourceTemplate("social://{platform}/user/{userId}/content", { list: undefined }),
    async (uri, params) => {
      try {
        const platform = params.platform as string;
        const userId = params.userId as string;
        
        const provider = providerRegistry.getProviderForPlatform(platform);
        
        if (!provider) {
          throw new Error(`Provider for platform '${platform}' not found`);
        }
        
        const content = await provider.getUserContent(userId);
        
        return {
          contents: [{
            uri: uri.href,
            text: formatUserContent(content, platform)
          }]
        };
      } catch (error) {
        console.error(`Error in user-content resource:`, error);
        return {
          contents: [{
            uri: uri.href,
            text: `Error fetching ${params.platform} content for user '${params.userId}': ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
  
  // Thread resource
  server.resource(
    "thread",
    new ResourceTemplate("social://{platform}/thread/{threadId}", { list: undefined }),
    async (uri, params) => {
      try {
        const platform = params.platform as string;
        const threadId = params.threadId as string;
        
        const provider = providerRegistry.getProviderForPlatform(platform);
        
        if (!provider) {
          throw new Error(`Provider for platform '${platform}' not found`);
        }
        
        const thread = await provider.getThread(threadId);
        
        return {
          contents: [{
            uri: uri.href,
            text: formatThread(thread)
          }]
        };
      } catch (error) {
        console.error(`Error in thread resource:`, error);
        return {
          contents: [{
            uri: uri.href,
            text: `Error fetching ${params.platform} thread '${params.threadId}': ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
  
  // Trending topics resource
  server.resource(
    "trending",
    new ResourceTemplate("social://{platform}/trending", { list: undefined }),
    async (uri, params) => {
      try {
        const platform = params.platform as string;
        
        const provider = providerRegistry.getProviderForPlatform(platform);
        
        if (!provider) {
          throw new Error(`Provider for platform '${platform}' not found`);
        }
        
        const topics = await provider.getTrendingTopics();
        
        return {
          contents: [{
            uri: uri.href,
            text: formatTrendingTopics(topics, platform)
          }]
        };
      } catch (error) {
        console.error(`Error in trending resource:`, error);
        return {
          contents: [{
            uri: uri.href,
            text: `Error fetching ${params.platform} trending topics: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Trending feed resource
  server.resource(
    "trending-feed",
    new ResourceTemplate("social://{platform}/trending-feed", { list: undefined }),
    async (uri, params) => {
      try {
        const platform = params.platform as string;
        const provider = providerRegistry.getProviderForPlatform(platform);
        
        if (!provider) {
          throw new Error(`Provider for platform '${platform}' not found`);
        }

        // Check if platform supports trending feed
        if (platform !== 'farcaster') {
          return {
            contents: [{
              uri: uri.href,
              text: `Trending feed with multiple providers is currently only supported for Farcaster. For ${platform}, please use the trending topics endpoint instead.`
            }]
          };
        }

        // Parse query parameters for options
        const options: TrendingOptions = {};
        const queryParams = uri.searchParams;
        
        if (queryParams.has('provider')) {
          options.provider = queryParams.get('provider') as 'neynar' | 'openrank' | 'mbd';
        }
        if (queryParams.has('timeWindow')) {
          options.timeWindow = queryParams.get('timeWindow') as '1h' | '6h' | '12h' | '24h' | '7d' | '30d';
        }
        if (queryParams.has('limit')) {
          options.limit = parseInt(queryParams.get('limit') || '20', 10);
        }
        
        const feed = await provider.getTrendingFeed(options);
        
        return {
          contents: [{
            uri: uri.href,
            text: formatTrendingFeed(feed, platform)
          }]
        };
      } catch (error) {
        console.error(`Error in trending feed resource:`, error);
        return {
          contents: [{
            uri: uri.href,
            text: `Error fetching ${params.platform} trending feed: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Channel search resource
  server.resource(
    "channel-search",
    new ResourceTemplate("social://{platform}/channels/search", { list: undefined }),
    async (uri, params) => {
      try {
        const platform = params.platform as string;
        const query = params.query as string;
        
        const provider = providerRegistry.getProviderForPlatform(platform);
        
        if (!provider) {
          throw new Error(`Provider for platform '${platform}' not found`);
        }

        // Check if the provider supports channel search
        if (!provider.searchChannels) {
          throw new Error(`Channel search is not supported for platform '${platform}'`);
        }
        
        const results = await provider.searchChannels(query, { limit: 10 });
        
        // Format the results
        const formattedResults = results.channels.map(channel => 
          `Channel: ${channel.name}\n` +
          `Description: ${channel.description || 'No description'}\n` +
          `Followers: ${channel.followerCount}\n` +
          `Created: ${channel.createdAt}\n` +
          `URL: ${channel.parentUrl || 'N/A'}\n`
        ).join('\n');

        let response = `Found ${results.channels.length} channels:\n\n${formattedResults}`;
        if (results.nextCursor) {
          response += `\n\nUse the cursor "${results.nextCursor}" to fetch more results.`;
        }
        
        return {
          contents: [{
            uri: uri.href,
            text: response
          }]
        };
      } catch (error) {
        console.error(`Error in channel-search resource:`, error);
        return {
          contents: [{
            uri: uri.href,
            text: `Error searching channels on ${params.platform} for '${params.query}': ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Bulk channel search resource
  server.resource(
    "bulk-channel-search",
    new ResourceTemplate("social://{platform}/channels/bulk-search", { list: undefined }),
    async (uri, params) => {
      try {
        const platform = params.platform as string;
        const provider = providerRegistry.getProviderForPlatform(platform);
        
        if (!provider) {
          throw new Error(`Provider for platform '${platform}' not found`);
        }

        // Check if the provider supports bulk channel search
        if (!provider.searchBulkChannels) {
          throw new Error(`Bulk channel search is not supported for platform '${platform}'`);
        }

        // Parse query parameters
        const queryParams = uri.searchParams;
        const queries = queryParams.get('queries')?.split(',') || [];
        const limit = queryParams.has('limit') ? parseInt(queryParams.get('limit') || '10', 10) : 10;
        const cursor = queryParams.get('cursor') || undefined;
        
        if (queries.length === 0) {
          throw new Error('No queries provided');
        }
        
        const results = await provider.searchBulkChannels(queries, { limit, cursor });
        
        // Format the results
        let response = `Search Results for ${queries.length} queries:\n\n`;
        
        for (const [query, result] of Object.entries(results)) {
          response += `Results for "${query}":\n`;
          if (result.channels.length === 0) {
            response += 'No channels found.\n';
          } else {
            const formattedChannels = result.channels.map(channel => 
              `Channel: ${channel.name}\n` +
              `Description: ${channel.description || 'No description'}\n` +
              `Followers: ${channel.followerCount}\n` +
              `Created: ${channel.createdAt}\n` +
              `URL: ${channel.parentUrl || 'N/A'}\n`
            ).join('\n');
            response += formattedChannels + '\n';
          }
          if (result.nextCursor) {
            response += `Use the cursor "${result.nextCursor}" to fetch more results for this query.\n`;
          }
          response += '\n';
        }
        
        return {
          contents: [{
            uri: uri.href,
            text: response
          }]
        };
      } catch (error) {
        console.error(`Error in bulk-channel-search resource:`, error);
        return {
          contents: [{
            uri: uri.href,
            text: `Error performing bulk channel search on ${params.platform}: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
}

// Helper functions to format content for better LLM consumption
function formatSearchResults(results: SocialContent[], query: string, platform: string): string {
  if (results.length === 0) {
    return `No results found for query: "${query}" on ${platform}`;
  }
  
  const formattedResults = results.map((result, index) => {
    return `[${index + 1}] @${result.authorUsername} (${result.authorName}): ${result.text}
    - Posted: ${new Date(result.createdAt).toLocaleString()}
    - Engagement: ${result.likes || 0} likes, ${result.reposts || 0} reposts, ${result.replies || 0} replies
    - ID: ${result.id}`;
  }).join('\n\n');
  
  return `Search Results for "${query}" on ${platform}:\n\n${formattedResults}`;
}

function formatUserProfile(profile: any): string {
  return `
User Profile: @${profile.username} (${profile.displayName})
- Platform: ${profile.platform}
- Bio: ${profile.bio || 'No bio available'}
- Followers: ${profile.followerCount || 0}
- Following: ${profile.followingCount || 0}
- Verified: ${profile.verified ? 'Yes' : 'No'}
- User ID: ${profile.id}
- `;
}

function formatUserContent(content: SocialContent[], platform: string): string {
  if (content.length === 0) {
    return `No content available for this user on ${platform}.`;
  }
  
  const formattedContent = content.map((item, index) => {
    return `[${index + 1}] ${item.text}
    - Posted: ${new Date(item.createdAt).toLocaleString()}
    - Engagement: ${item.likes || 0} likes, ${item.reposts || 0} reposts, ${item.replies || 0} replies
    - ID: ${item.id}`;
  }).join('\n\n');
  
  return `Recent Content on ${platform}:\n\n${formattedContent}`;
}

function formatThread(thread: any): string {
  const rootContent = thread.rootContent;
  const replies = thread.replies;
  
  const root = `
Original Post by @${rootContent.authorUsername} (${rootContent.authorName}):
"${rootContent.text}"
- Posted: ${new Date(rootContent.createdAt).toLocaleString()}
- Engagement: ${rootContent.likes || 0} likes, ${rootContent.reposts || 0} reposts, ${rootContent.replies || 0} replies
- ID: ${rootContent.id}
`;
  
  let repliesText = '';
  if (replies.length > 0) {
    repliesText = '\nReplies:\n\n' + replies.map((reply: SocialContent, index: number) => {
      return `[${index + 1}] @${reply.authorUsername} (${reply.authorName}): ${reply.text}
      - Posted: ${new Date(reply.createdAt).toLocaleString()}
      - Engagement: ${reply.likes || 0} likes, ${reply.reposts || 0} reposts, ${reply.replies || 0} replies
      - ID: ${reply.id}`;
    }).join('\n\n');
  } else {
    repliesText = '\nNo replies to this post.';
  }
  
  return `Thread on ${thread.platform}:\n${root}${repliesText}`;
}
function formatTrendingTopics(topics: string[], platform: string): string {
  if (topics.length === 0) {
    return `No trending topics available for ${platform}.`;
  }
  
  const formattedTopics = topics.map((topic, index) => {
    return `${index + 1}. ${topic}`;
  }).join('\n');
  
  return `Trending Topics on ${platform}:\n\n${formattedTopics}`;
}

function formatTrendingFeed(feed: SocialContent[], platform: string): string {
  if (feed.length === 0) {
    return `No trending content available for ${platform}.`;
  }
  
  const formattedFeed = feed.map((content, index) => {
    const author = content.authorName || content.authorUsername || 'Unknown Author';
    const timestamp = new Date(content.createdAt).toLocaleString();
    const engagement = [
      content.likes ? `${content.likes} likes` : '',
      content.reposts ? `${content.reposts} reposts` : '',
      content.replies ? `${content.replies} replies` : ''
    ].filter(Boolean).join(', ');

    return `${index + 1}. ${content.text}\n   - By ${author} at ${timestamp}\n   - ${engagement}\n   - URL: ${content.url || 'N/A'}\n`;
  }).join('\n');
  
  return `Trending Content on ${platform}:\n\n${formattedFeed}`;
}
