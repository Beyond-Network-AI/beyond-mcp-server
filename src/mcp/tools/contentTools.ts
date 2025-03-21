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
  
  // Search channels tool
  server.tool(
    "search-channels",
    {
      platform: z.string().describe("Social platform (farcaster, twitter, telegram)"),
      query: z.string().describe("Search query"),
      limit: z.number().optional().describe("Maximum number of results to return"),
      cursor: z.string().optional().describe("Pagination cursor for fetching more results"),
      includeChannels: z.boolean().optional().describe("Whether to include channel information")
    },
    async ({ platform, query, limit = 10, cursor, includeChannels }) => {
      try {
        console.error(`search-channels tool called for platform: ${platform}, query: ${query}`);
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

        // Check if the provider supports channel search
        if (!provider.searchChannels) {
          console.error(`Provider ${provider.name} does not support channel search`);
          return {
            content: [{ type: "text", text: `Channel search is not supported for platform '${platform}'` }],
            isError: true
          };
        }
        
        console.error(`Using provider: ${provider.name} for channel search`);
        const results = await provider.searchChannels(query, { limit, cursor, includeChannels });
        
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
          content: [{ type: "text", text: response }],
          isError: false
        };
      } catch (error) {
        console.error(`Error in search-channels tool:`, error);
        return {
          content: [{ 
            type: "text", 
            text: `Error searching channels on ${platform}: ${error instanceof Error ? error.message : String(error)}` 
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

  // Get trending feed tool
  server.tool(
    "get-trending-feed",
    {
      platform: z.string().describe("Social platform (farcaster, twitter, telegram)"),
      provider: z.enum(['neynar', 'openrank', 'mbd']).optional().describe("Provider to use for trending feed (default: neynar)"),
      timeWindow: z.enum(['1h', '6h', '12h', '24h', '7d', '30d']).optional().describe("Time window for trending content (default: 24h)"),
      limit: z.number().optional().describe("Maximum number of trending items to return (default: 20)")
    },
    async ({ platform, provider, timeWindow, limit = 20 }) => {
      try {
        // Check if platform supports trending feed
        if (platform !== 'farcaster') {
          return {
            content: [{ 
              type: "text", 
              text: `Trending feed with multiple providers is currently only supported for Farcaster. For ${platform}, please use the get-trending-topics tool instead.` 
            }],
            isError: true
          };
        }

        const providerInstance = providerRegistry.getProviderForPlatform(platform);
        
        if (!providerInstance) {
          return {
            content: [{ type: "text", text: `Provider for platform '${platform}' not found or not enabled` }],
            isError: true
          };
        }
        
        const feed = await providerInstance.getTrendingFeed({ provider, timeWindow, limit });
        
        return {
          content: [{ 
            type: "text", 
            text: formatTrendingFeed(feed, platform) 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error fetching ${platform} trending feed: ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  );

  // Tool for getting user balance
  server.tool(
    "get-user-balance",
    {
      platform: z.string().describe("Social platform (farcaster, twitter, telegram)"),
      userId: z.string().describe("Farcaster ID (FID) or username of the user")
    },
    async ({ platform, userId }) => {
      // Check if platform is Farcaster
      if (platform !== 'farcaster') {
        return {
          content: [{ 
            type: "text", 
            text: "User balance functionality is currently only supported for Farcaster." 
          }],
          isError: true
        };
      }

      try {
        // Get the provider for the platform
        const provider = providerRegistry.getProviderForPlatform(platform);
        if (!provider) {
          return {
            content: [{ 
              type: "text", 
              text: `Provider not found for platform: ${platform}` 
            }],
            isError: true
          };
        }

        // Get user balance (now accepts either FID or username)
        const balance = await provider.getUserBalance?.(userId);
        
        // Format the balance information
        return {
          content: [{ 
            type: "text", 
            text: formatUserBalance(balance) 
          }]
        };
      } catch (error) {
        console.error('Error fetching user balance:', error);
        return {
          content: [{ 
            type: "text", 
            text: `Failed to fetch user balance: ${error instanceof Error ? error.message : String(error)}` 
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
  const metadata = profile.metadata || {};
  const verifiedEthAddresses = metadata.verifiedEthAddresses || [];
  const verifiedSolAddresses = metadata.verifiedSolAddresses || [];
  
  let walletInfo = '';
  if (verifiedEthAddresses.length > 0 || verifiedSolAddresses.length > 0) {
    walletInfo = '\nWallet Information:';
    if (verifiedEthAddresses.length > 0) {
      walletInfo += `\n- Verified ETH Addresses: ${verifiedEthAddresses.join(', ')}`;
    }
    if (verifiedSolAddresses.length > 0) {
      walletInfo += `\n- Verified SOL Addresses: ${verifiedSolAddresses.join(', ')}`;
    }
    if (metadata.primaryEthAddress) {
      walletInfo += `\n- Primary ETH Address: ${metadata.primaryEthAddress}`;
    }
    if (metadata.primarySolAddress) {
      walletInfo += `\n- Primary SOL Address: ${metadata.primarySolAddress}`;
    }
  }

  let additionalInfo = '';
  if (metadata.custodyAddress) {
    additionalInfo += `\n- Custody Address: ${metadata.custodyAddress}`;
  }
  if (metadata.recoveryAddress) {
    additionalInfo += `\n- Recovery Address: ${metadata.recoveryAddress}`;
  }
  if (metadata.hasEmail) {
    additionalInfo += '\n- Has Email: Yes';
  }
  if (metadata.activeStatus) {
    additionalInfo += `\n- Active Status: ${metadata.activeStatus}`;
  }
  if (metadata.powerBadge) {
    additionalInfo += `\n- Power Badge: ${metadata.powerBadge}`;
  }

  return `
User Profile: @${profile.username} (${profile.displayName})
Platform: ${profile.platform}
Bio: ${profile.bio || 'No bio available'}
Followers: ${profile.followerCount || 0}
Following: ${profile.followingCount || 0}
Verified: ${profile.verified ? 'Yes' : 'No'}
User ID: ${profile.id}${walletInfo}${additionalInfo}
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

function formatTrendingFeed(feed: SocialContent[], platform: string): string {
  if (feed.length === 0) {
    return `No trending content available for ${platform}.`;
  }
  
  const formattedFeed = feed.map((item, index) => {
    return `[${index + 1}] @${item.authorUsername} (${item.authorName}): "${item.text}"
    - Posted: ${new Date(item.createdAt).toLocaleString()}
    - Engagement: ${item.likes || 0} likes, ${item.reposts || 0} reposts, ${item.replies || 0} replies
    - ID: ${item.id}`;
  }).join('\n\n');
  
  return `Trending Feed on ${platform}:\n\n${formattedFeed}`;
}

function formatUserBalance(balance: any): string {
  if (!balance) {
    return "No balance information available.";
  }

  const addressBalances = balance.address_balances || [];
  if (addressBalances.length === 0) {
    return "No verified addresses found for this user.";
  }

  let formattedText = "User Balance Information:\n";
  
  addressBalances.forEach((addrBalance: any) => {
    const verifiedAddress = addrBalance.verified_address;
    const tokenBalances = addrBalance.token_balances || [];
    
    formattedText += `\nBase Network Address: ${verifiedAddress.address}\n`;
    formattedText += "Token Balances:\n";
    
    if (tokenBalances.length === 0) {
      formattedText += "- No token balances found\n";
    } else {
      tokenBalances.forEach((tokenBalance: any) => {
        const token = tokenBalance.token;
        const balance = tokenBalance.balance;
        
        formattedText += `- ${token.symbol}: ${balance.in_token.toFixed(4)} (≈ $${balance.in_usdc.toFixed(2)} USDC)\n`;
      });
    }
  });
  
  formattedText += `\nLast Updated: ${new Date().toLocaleString()}`;
  
  return formattedText;
} 