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
} 