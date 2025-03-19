import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProviderRegistry } from '../../providers/registry';
import { SocialContent } from '../../providers/interfaces/provider';

export function registerContentTools(server: McpServer, providerRegistry: ProviderRegistry) {
  // Search content tool
  server.tool(
    "search-content",
    {
      platform: z.string().describe("Social platform (farcaster, twitter, telegram)"),
      query: z.string().describe("Search query"),
      limit: z.number().optional().describe("Maximum number of results to return")
    },
    async ({ platform, query, limit = 10 }) => {
      try {
        console.error(`search-content tool called for platform: ${platform}, query: ${query}`);
        const provider = providerRegistry.getProviderForPlatform(platform);
        
        if (!provider) {
          console.error(`Provider for platform '${platform}' not found or not enabled`);
          return {
            content: [{ type: "text", text: `Provider for platform '${platform}' not found or not enabled` }],
            isError: true
          };
        }
        
        // Check if the provider is available
        console.error(`Checking if provider ${provider.name} is available`);
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) {
          console.error(`Provider ${provider.name} is not available`);
          return {
            content: [{ type: "text", text: `Provider for platform '${platform}' is not available` }],
            isError: true
          };
        }
        
        console.error(`Using provider: ${provider.name} for search`);
        const results = await provider.searchContent(query, { limit });
        console.error(`Search results count: ${results.length}`);
        
        return {
          content: [{ 
            type: "text", 
            text: formatSearchResults(results, query, platform) 
          }]
        };
      } catch (error) {
        console.error(`Error in search-content tool:`, error);
        return {
          content: [{ 
            type: "text", 
            text: `Error searching ${platform} for '${query}': ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  );
  
  // Get user profile tool
  server.tool(
    "get-user-profile",
    {
      platform: z.string().describe("Social platform (farcaster, twitter, telegram)"),
      userId: z.string().describe("User ID or username on the platform")
    },
    async ({ platform, userId }) => {
      try {
        const provider = providerRegistry.getProviderForPlatform(platform);
        
        if (!provider) {
          return {
            content: [{ type: "text", text: `Provider for platform '${platform}' not found or not enabled` }],
            isError: true
          };
        }
        
        const profile = await provider.getUserProfile(userId);
        
        return {
          content: [{ 
            type: "text", 
            text: formatUserProfile(profile) 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error fetching ${platform} user profile for '${userId}': ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  );
  
  // Get wallet-based profile tool
  server.tool(
    "get-wallet-profile",
    {
      platform: z.string().describe("Social platform (farcaster, twitter, telegram)"),
      walletAddress: z.string().describe("Ethereum wallet address (0x...)")
    },
    async ({ platform, walletAddress }) => {
      try {
        const provider = providerRegistry.getProviderForPlatform(platform);
        
        if (!provider) {
          return {
            content: [{ type: "text", text: `Provider for platform '${platform}' not found or not enabled` }],
            isError: true
          };
        }
        
        const profile = await provider.getUserProfileByWalletAddress(walletAddress);
        
        return {
          content: [{ 
            type: "text", 
            text: formatUserProfile(profile) 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error fetching ${platform} profile for wallet '${walletAddress}': ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  );
  
  // Get user content tool
  server.tool(
    "get-user-content",
    {
      platform: z.string().describe("Social platform (farcaster, twitter, telegram)"),
      userId: z.string().describe("User ID or username on the platform"),
      limit: z.number().optional().describe("Maximum number of posts to return")
    },
    async ({ platform, userId, limit = 10 }) => {
      try {
        const provider = providerRegistry.getProviderForPlatform(platform);
        
        if (!provider) {
          return {
            content: [{ type: "text", text: `Provider for platform '${platform}' not found or not enabled` }],
            isError: true
          };
        }
        
        const content = await provider.getUserContent(userId, { limit });
        
        return {
          content: [{ 
            type: "text", 
            text: formatUserContent(content, platform) 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error fetching ${platform} content for user '${userId}': ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  );
  
  // Get thread tool
  server.tool(
    "get-thread",
    {
      platform: z.string().describe("Social platform (farcaster, twitter, telegram)"),
      threadId: z.string().describe("Thread or conversation ID")
    },
    async ({ platform, threadId }) => {
      try {
        const provider = providerRegistry.getProviderForPlatform(platform);
        
        if (!provider) {
          return {
            content: [{ type: "text", text: `Provider for platform '${platform}' not found or not enabled` }],
            isError: true
          };
        }
        
        const thread = await provider.getThread(threadId);
        
        return {
          content: [{ 
            type: "text", 
            text: formatThread(thread) 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error fetching ${platform} thread '${threadId}': ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  );
  
  // Get trending topics tool
  server.tool(
    "get-trending-topics",
    {
      platform: z.string().describe("Social platform (farcaster, twitter, telegram)"),
      limit: z.number().optional().describe("Maximum number of trending topics to return")
    },
    async ({ platform, limit = 10 }) => {
      try {
        const provider = providerRegistry.getProviderForPlatform(platform);
        
        if (!provider) {
          return {
            content: [{ type: "text", text: `Provider for platform '${platform}' not found or not enabled` }],
            isError: true
          };
        }
        
        const topics = await provider.getTrendingTopics({ limit });
        
        return {
          content: [{ 
            type: "text", 
            text: formatTrendingTopics(topics, platform) 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error fetching ${platform} trending topics: ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
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
Platform: ${profile.platform}
Bio: ${profile.bio || 'No bio available'}
Followers: ${profile.followerCount || 0}
Following: ${profile.followingCount || 0}
Verified: ${profile.verified ? 'Yes' : 'No'}
User ID: ${profile.id}
`;
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
  const rootContent = thread.content;
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