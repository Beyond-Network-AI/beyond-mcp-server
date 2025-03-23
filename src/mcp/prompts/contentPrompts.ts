import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerContentPrompts(server: McpServer) {
  // Prompt for analyzing a thread
  server.prompt(
    "analyze-thread",
    {
      platform: z.string().describe("Social platform (farcaster, twitter, telegram)"),
      threadId: z.string().describe("Thread or conversation ID to analyze")
    },
    ({ platform, threadId }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Please analyze the social media thread with ID ${threadId} from ${platform}. Provide a summary of the main discussion points, key participants, and overall sentiment. If there are any interesting insights or notable aspects of the conversation, please highlight those as well.`
        }
      }]
    })
  );
  
  // Prompt for summarizing user activity
  server.prompt(
    "summarize-user-activity",
    {
      platform: z.string().describe("Social platform (farcaster, twitter, telegram)"),
      userId: z.string().describe("User ID or username to analyze")
    },
    ({ platform, userId }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Please analyze the recent activity of user ${userId} on ${platform}. Summarize their main topics of interest, posting patterns, and overall sentiment. What are the key themes in their content? Who do they interact with most frequently? What seems to engage them the most?`
        }
      }]
    })
  );
  
  // Prompt for exploring trending topics
  server.prompt(
    "explore-trending-topics",
    {
      platform: z.string().describe("Social platform (farcaster, twitter, telegram)")
    },
    ({ platform }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `What are the current trending topics on ${platform}? Please analyze these trends and provide insights on why they might be popular right now. Are there any emerging patterns or themes across multiple trending topics? How might these trends relate to current events or community interests?`
        }
      }]
    })
  );
  
  // Prompt for exploring trending feed content
  server.prompt(
    "explore-trending-feed",
    {
      platform: z.string().describe("Social platform (farcaster, twitter, telegram)"),
      provider: z.enum(['neynar', 'openrank', 'mbd']).optional().describe("Provider to use for trending feed (default: neynar)"),
      timeWindow: z.enum(['1h', '6h', '12h', '24h', '7d', '30d']).optional().describe("Time window for trending content (default: 24h)"),
      limit: z.string().optional().describe("Maximum number of trending items to analyze (default: 20)")
    },
    (args) => {
      const { platform, provider, timeWindow, limit } = args;
      
      // Check if platform supports trending feed
      if (platform !== 'farcaster') {
        return {
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: `Trending feed with multiple providers is currently only supported for Farcaster. For ${platform}, please use the explore-trending-topics prompt instead to analyze trending topics.`
            }
          }]
        };
      }

      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Please analyze the trending content on ${platform}${provider ? ` using the ${provider} provider` : ''}${timeWindow ? ` from the last ${timeWindow}` : ''}. 
            Focus on:
            1. Key themes and topics in the trending content
            2. Most engaging posts and why they're popular
            3. Notable authors and their contributions
            4. Patterns in content types (text, media, etc.)
            5. How this trending content reflects current community interests
            
            Please provide a comprehensive analysis of the trending content and its significance.`
          }
        }]
      };
    }
  );
  
  // Prompt for content search analysis
  server.prompt(
    "analyze-search-results",
    {
      platform: z.string().describe("Social platform (farcaster, twitter, telegram)"),
      query: z.string().describe("Search query to analyze")
    },
    ({ platform, query }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Please search for content related to "${query}" on ${platform} and analyze the results. What are the key themes and perspectives? Who are the main voices in this conversation? Is there a dominant sentiment or are opinions varied? Provide a comprehensive analysis of the discussion around this topic.`
        }
      }]
    })
  );

  // Prompt for checking user balance
  server.prompt(
    "check-user-balance",
    {
      platform: z.string().describe("Social platform (farcaster, twitter, telegram)"),
      fid: z.string().describe("Farcaster ID (FID) of the user")
    },
    (args) => {
      const { platform, fid } = args;
      
      // Check if platform is Farcaster
      if (platform !== 'farcaster') {
        return {
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: `User balance functionality is currently only supported for Farcaster. Please use a different prompt for ${platform}.`
            }
          }]
        };
      }

      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Please check the balance for Farcaster user with FID ${fid}. This will show their Base network balance and associated wallet address. This information can be useful for understanding their on-chain activity and potential influence in the ecosystem.`
          }
        }]
      };
    }
  );

  // Prompt for single channel search
  server.prompt(
    "search-channels",
    "Search for a single channel on a social platform",
    {
      platform: z.string().describe("Social platform (farcaster, twitter, telegram)"),
      query: z.string().describe("Channel search query"),
      limit: z.string().optional().describe("Maximum number of results (default: 10)")
    },
    (args) => {
      const { platform, query, limit } = args;
      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Please search for a channel on ${platform} using the query: "${query}". 
            Provide:
            1. Channel name and description
            2. Number of followers
            3. Creation date
            4. Channel URL
            5. Any notable characteristics or significance
            
            Please format the results clearly and include any relevant insights about the channel found.`
          }
        }]
      };
    }
  );

  // Prompt for bulk channel search
  server.prompt(
    "search-bulk-channels",
    "Search for multiple channels on a social platform in parallel",
    {
      platform: z.string().describe("Social platform (farcaster, twitter, telegram)"),
      queries: z.string().describe("Comma-separated list of channel search queries"),
      limit: z.string().optional().describe("Maximum number of results per query (default: 10)")
    },
    (args) => {
      const { platform, queries, limit } = args;
      const queryList = queries.split(',').map(q => q.trim());
      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Please search for multiple channels on ${platform} using the following queries: ${queryList.join(', ')}. 
            For each query, provide:
            1. Channel name and description
            2. Number of followers
            3. Creation date
            4. Channel URL
            5. Any notable characteristics or significance
            
            Please format the results clearly for each query and include any relevant insights about the channels found.`
          }
        }]
      };
    }
  );
} 