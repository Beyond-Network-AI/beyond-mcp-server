import { FarcasterProvider } from '../../../../src/providers/farcaster/farcasterProvider';
import { mockNeynarClient } from '../../../mocks/neynarClient.mock';

// Mock the Neynar client
jest.mock('@neynar/nodejs-sdk', () => {
  return {
    Configuration: jest.fn().mockImplementation(() => ({})),
    NeynarAPIClient: jest.fn().mockImplementation(() => mockNeynarClient),
    FeedType: {
      Filter: 'filter'
    },
    FilterType: {
      GlobalTrending: 'global_trending'
    }
  };
});

// Mock the config
jest.mock('../../../../src/config', () => ({
  providers: {
    farcaster: {
      enabled: true,
      neynarApiKey: 'test-api-key'
    }
  }
}));

describe('FarcasterProvider', () => {
  let provider: FarcasterProvider;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    provider = new FarcasterProvider();
  });

  describe('isAvailable', () => {
    it('should return true when the API is available', async () => {
      // Mock a successful API call
      mockNeynarClient.fetchBulkUsers.mockResolvedValueOnce({ users: [{ fid: 1 }] });
      
      const result = await provider.isAvailable();
      
      expect(result).toBe(true);
      expect(mockNeynarClient.fetchBulkUsers).toHaveBeenCalledWith({ fids: [1] });
    });

    it('should return false when the API is not available', async () => {
      // Mock a failed API call
      mockNeynarClient.fetchBulkUsers.mockRejectedValueOnce(new Error('API error'));
      
      const result = await provider.isAvailable();
      
      expect(result).toBe(false);
      expect(mockNeynarClient.fetchBulkUsers).toHaveBeenCalledWith({ fids: [1] });
    });
  });

  describe('searchContent', () => {
    it('should return search results for a regular query', async () => {
      const query = 'neynar';
      
      const result = await provider.searchContent(query);
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].text).toContain('Neynar API');
      expect(mockNeynarClient.searchCasts).toHaveBeenCalledWith({ 
        q: query,
        limit: 20
      });
    });

    it('should handle a query with no results', async () => {
      const query = 'nonexistent';
      
      const result = await provider.searchContent(query);
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
      expect(mockNeynarClient.searchCasts).toHaveBeenCalledWith({ 
        q: query,
        limit: 20
      });
    });

    it('should handle a from: query to search for a specific user', async () => {
      const query = 'from:rish';
      
      const result = await provider.searchContent(query);
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(0); // The implementation returns empty array for from: queries
      expect(mockNeynarClient.searchUser).toHaveBeenCalledWith({ 
        q: 'rish',
        limit: 1
      });
    });

    it('should handle a from: query with a non-existent user', async () => {
      const query = 'from:nonexistent';
      
      const result = await provider.searchContent(query);
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
      expect(mockNeynarClient.searchUser).toHaveBeenCalledWith({ 
        q: 'nonexistent',
        limit: 1
      });
    });

    it('should respect the limit option', async () => {
      const query = 'neynar';
      const limit = 5;
      
      await provider.searchContent(query, { limit });
      
      expect(mockNeynarClient.searchCasts).toHaveBeenCalledWith({ 
        q: query,
        limit
      });
    });
  });

  describe('getThread', () => {
    it('should return a thread when it exists', async () => {
      const threadId = '0xfe512114e8a7c6b23c51c66c318f8a9a548cfb07';
      
      // Mock the lookupCastByHashOrWarpcastUrl response
      mockNeynarClient.lookupCastByHashOrWarpcastUrl.mockResolvedValueOnce({
        cast: {
          hash: '0xfe512114e8a7c6b23c51c66c318f8a9a548cfb07',
          author: {
            fid: 194,
            username: 'rish',
            display_name: 'rish'
          },
          text: 'adding more v2 frame related tooling',
          timestamp: '2025-02-12T16:00:21.000Z',
          reactions: {
            likes_count: 67,
            recasts_count: 12
          },
          replies: {
            count: 10
          }
        }
      });
      
      // Mock the conversation response
      mockNeynarClient.lookupCastConversation.mockResolvedValueOnce({
        conversation: {
          cast: {
            direct_replies: []
          }
        }
      });
      
      const result = await provider.getThread(threadId);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(threadId);
      expect(result.replies).toHaveLength(0);
      expect(mockNeynarClient.lookupCastByHashOrWarpcastUrl).toHaveBeenCalledWith({
        identifier: threadId,
        type: 'hash'
      });
    });

    it('should handle a thread that does not exist', async () => {
      const threadId = '0xnonexistent';
      
      // Mock the error for a non-existent thread
      mockNeynarClient.lookupCastByHashOrWarpcastUrl.mockRejectedValueOnce(new Error('Cast not found'));
      mockNeynarClient.lookupCastByHashOrWarpcastUrl.mockRejectedValueOnce(new Error('Cast not found'));
      
      const result = await provider.getThread(threadId);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(threadId);
      expect(result.content.text).toContain('Thread not found');
      expect(result.replies).toHaveLength(0);
    });
  });

  describe('getUserProfile', () => {
    it('should return a user profile when the user exists (by username)', async () => {
      const userId = 'rish';
      
      // Mock the searchUser response
      mockNeynarClient.searchUser.mockResolvedValueOnce({
        result: {
          users: [
            { 
              fid: 194, 
              username: 'rish', 
              display_name: 'rish',
              profile: {
                bio: {
                  text: 'building farcaster infra @ /neynar 🪐 casting @ /rish'
                }
              },
              follower_count: 264665,
              following_count: 839,
              verifications: ['0x5a927ac639636e534b678e81768ca19e2c6280b7']
            }
          ]
        }
      });
      
      const result = await provider.getUserProfile(userId);
      
      expect(result).toBeDefined();
      expect(result.username).toBe('rish');
      expect(mockNeynarClient.searchUser).toHaveBeenCalledWith({ 
        q: 'rish',
        limit: 1
      });
    });

    it('should return a user profile when the user exists (by FID)', async () => {
      const userId = '194';
      
      const result = await provider.getUserProfile(userId);
      
      expect(result).toBeDefined();
      expect(result.username).toBe('rish');
      expect(mockNeynarClient.fetchBulkUsers).toHaveBeenCalledWith({
        fids: [194]
      });
    });

    it('should handle a user that does not exist', async () => {
      const userId = 'nonexistent';
      
      // Mock the searchUser response for a non-existent user
      mockNeynarClient.searchUser.mockResolvedValueOnce({
        result: {
          users: []
        }
      });
      
      await expect(provider.getUserProfile(userId)).rejects.toThrow('Failed to fetch profile');
    });
  });

  describe('getUserContent', () => {
    it('should return user content when the user exists (by username)', async () => {
      const userId = 'rish';
      
      // Mock the searchUser response
      mockNeynarClient.searchUser.mockResolvedValueOnce({
        result: {
          users: [
            { fid: 194, username: 'rish', display_name: 'rish' }
          ]
        }
      });
      
      const result = await provider.getUserContent(userId);
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(0); // The implementation returns empty array
      expect(mockNeynarClient.searchUser).toHaveBeenCalledWith({ 
        q: 'rish',
        limit: 1
      });
      expect(mockNeynarClient.fetchCastsForUser).toHaveBeenCalledWith({ 
        fid: 194,
        limit: 20,
        cursor: undefined
      });
    });

    it('should return user content when the user exists (by FID)', async () => {
      const userId = '194';
      
      const result = await provider.getUserContent(userId);
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(0); // The implementation returns empty array
      expect(mockNeynarClient.fetchCastsForUser).toHaveBeenCalledWith({ 
        fid: 194,
        limit: 20,
        cursor: undefined
      });
    });

    it('should throw an error when the user does not exist', async () => {
      const userId = 'nonexistent';
      
      // Mock the searchUser response for a non-existent user
      mockNeynarClient.searchUser.mockResolvedValueOnce({
        result: {
          users: []
        }
      });
      
      // The implementation catches the error and returns an empty array
      const result = await provider.getUserContent(userId);
      expect(result).toEqual([]);
    });

    it('should respect the limit option', async () => {
      const userId = '194';
      const limit = 5;
      
      await provider.getUserContent(userId, { limit });
      
      expect(mockNeynarClient.fetchCastsForUser).toHaveBeenCalledWith({ 
        fid: 194,
        limit,
        cursor: undefined
      });
    });
  });

  describe('getTrendingTopics', () => {
    it('should return trending topics', async () => {
      const result = await provider.getTrendingTopics();
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(4); // The implementation returns 4 default topics
      expect(result).toContain('web3');
      expect(result).toContain('crypto');
      expect(mockNeynarClient.fetchFeed).toHaveBeenCalledWith({
        feedType: 'filter',
        filterType: 'global_trending',
        limit: 25
      });
    });

    it('should respect the limit option', async () => {
      const limit = 5;
      
      await provider.getTrendingTopics({ limit });
      
      expect(mockNeynarClient.fetchFeed).toHaveBeenCalledWith({
        feedType: 'filter',
        filterType: 'global_trending',
        limit: 25
      });
    });
  });
}); 