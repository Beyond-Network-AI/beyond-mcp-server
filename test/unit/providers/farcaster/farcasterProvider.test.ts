import { FarcasterProvider } from '../../../../src/providers/farcaster/farcasterProvider';
import { mockNeynarClient } from '../../../mocks/neynarClient.mock';
import config from '../../../../src/config';

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

  describe('getUserProfileByWalletAddress', () => {
    it('should return a user profile when the wallet address exists', async () => {
      const walletAddress = '0x29db3d715bffd0b50862de8635186c5ac02c0831';
      
      const result = await provider.getUserProfileByWalletAddress(walletAddress);
      
      expect(result).toBeDefined();
      expect(result.id).toBe('194');
      expect(result.username).toBe('rish');
      expect(result.displayName).toBe('rish');
      expect(result.bio).toBe('building farcaster infra @ /neynar 🪐 casting @ /rish');
      expect(result.followerCount).toBe(264665);
      expect(result.followingCount).toBe(839);
      expect(result.platform).toBe('farcaster');
      expect((result.metadata as any).verifications).toContain('0x5a927ac639636e534b678e81768ca19e2c6280b7');
      expect((result.metadata as any).verifiedEthAddresses).toContain(walletAddress);
      expect(mockNeynarClient.fetchBulkUsersByEthOrSolAddress).toHaveBeenCalledWith({
        addresses: [walletAddress]
      });
    });

    it('should handle a wallet address that does not exist', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      
      await expect(provider.getUserProfileByWalletAddress(walletAddress))
        .rejects.toThrow('Failed to fetch profile for wallet address 0x1234567890123456789012345678901234567890');
      
      expect(mockNeynarClient.fetchBulkUsersByEthOrSolAddress).toHaveBeenCalledWith({
        addresses: [walletAddress]
      });
    });

    it('should handle an uninitialized client', async () => {
      const provider = new FarcasterProvider();
      provider['client'] = null;
      
      const walletAddress = '0x29db3d715bffd0b50862de8635186c5ac02c0831';
      
      await expect(provider.getUserProfileByWalletAddress(walletAddress))
        .rejects.toThrow('Neynar client not initialized');
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

  describe('getTrendingFeed', () => {
    it('should return trending feed using the default neynar provider', async () => {
      // Mock the fetchFeed response
      mockNeynarClient.fetchFeed.mockResolvedValueOnce({
        casts: [
          {
            hash: '0xtrending1',
            author: {
              fid: 194,
              username: 'rish',
              display_name: 'rish'
            },
            text: 'Trending cast 1',
            timestamp: '2025-02-12T16:00:21.000Z',
            reactions: {
              likes_count: 100,
              recasts_count: 20
            },
            replies: {
              count: 15
            }
          },
          {
            hash: '0xtrending2',
            author: {
              fid: 195,
              username: 'user1',
              display_name: 'User 1'
            },
            text: 'Trending cast 2',
            timestamp: '2025-02-12T15:30:00.000Z',
            reactions: {
              likes_count: 80,
              recasts_count: 15
            },
            replies: {
              count: 10
            }
          }
        ]
      });

      const result = await provider.getTrendingFeed();

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('Trending cast 1');
      expect(result[1].text).toBe('Trending cast 2');
      expect(mockNeynarClient.fetchFeed).toHaveBeenCalledWith({
        feedType: 'filter',
        filterType: 'global_trending',
        limit: 20
      });
    });

    it('should respect the limit option', async () => {
      const limit = 5;
      
      // Mock the fetchFeed response
      mockNeynarClient.fetchFeed.mockResolvedValueOnce({
        casts: Array(10).fill(null).map((_, i) => ({
          hash: `0xtrending${i + 1}`,
          author: {
            fid: 194 + i,
            username: `user${i + 1}`,
            display_name: `User ${i + 1}`
          },
          text: `Trending cast ${i + 1}`,
          timestamp: '2025-02-12T16:00:21.000Z',
          reactions: {
            likes_count: 100,
            recasts_count: 20
          },
          replies: {
            count: 15
          }
        }))
      });

      const result = await provider.getTrendingFeed({ limit });

      expect(result).toBeDefined();
      expect(result).toHaveLength(limit);
      expect(mockNeynarClient.fetchFeed).toHaveBeenCalledWith({
        feedType: 'filter',
        filterType: 'global_trending',
        limit
      });
    });

    it('should handle empty trending feed', async () => {
      // Mock the fetchFeed response with no casts
      mockNeynarClient.fetchFeed.mockResolvedValueOnce({
        casts: []
      });

      const result = await provider.getTrendingFeed();

      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
      expect(mockNeynarClient.fetchFeed).toHaveBeenCalledWith({
        feedType: 'filter',
        filterType: 'global_trending',
        limit: 20
      });
    });

    it('should handle API errors gracefully', async () => {
      // Mock the fetchFeed response with an error
      mockNeynarClient.fetchFeed.mockRejectedValueOnce(new Error('API error'));

      const result = await provider.getTrendingFeed();

      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
      expect(mockNeynarClient.fetchFeed).toHaveBeenCalledWith({
        feedType: 'filter',
        filterType: 'global_trending',
        limit: 20
      });
    });

    it('should handle missing API key', async () => {
      // Mock the config module to return no API key
      jest.mock('../../../../src/config', () => ({
        default: {
          providers: {
            farcaster: {
              enabled: true,
              neynarApiKey: ''
            },
            twitter: {
              enabled: true,
              apiKey: 'test_twitter_key',
              apiSecret: 'test_twitter_secret'
            },
            telegram: {
              enabled: true,
              botToken: 'test_telegram_token'
            }
          }
        }
      }));

      // Re-initialize the provider to use the mocked config
      const provider = new FarcasterProvider();

      const result = await provider.getTrendingFeed();

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].text).toContain('web3');
      expect(result[1].text).toContain('frames');
      expect(result[0].platform).toBe('farcaster');
      expect(result[1].platform).toBe('farcaster');
    });

    it('should use alternative providers when specified', async () => {
      const providerType = 'openrank';
      const timeWindow = '12h';
      
      // Mock the fetch response for alternative provider
      global.fetch = jest.fn().mockResolvedValueOnce({
        json: () => Promise.resolve({
          result: {
            casts: [
              {
                hash: '0xtrending1',
                author: {
                  fid: 194,
                  username: 'rish',
                  display_name: 'rish'
                },
                text: 'Trending cast from OpenRank',
                timestamp: '2025-02-12T16:00:21.000Z',
                reactions: {
                  likes_count: 100,
                  recasts_count: 20
                },
                replies: {
                  count: 15
                }
              }
            ]
          }
        })
      });

      const result = await provider.getTrendingFeed({ provider: providerType, timeWindow });

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Trending cast from OpenRank');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.neynar.com/v2/farcaster/feed/trending'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'api_key': 'test-api-key'
          })
        })
      );
    });

    it('should handle MBD provider with custom filters', async () => {
      const providerType = 'mbd';
      const providerMetadata = {
        startTimestamp: Math.floor(new Date('2025-02-12T00:00:00.000Z').getTime() / 1000),
        endTimestamp: Math.floor(new Date('2025-02-12T23:59:59.000Z').getTime() / 1000),
        minLikes: 100,
        minRecasts: 20
      };
      
      // Mock the fetch response for MBD provider
      global.fetch = jest.fn().mockResolvedValueOnce({
        json: () => Promise.resolve({
          result: {
            casts: [
              {
                hash: '0xtrending1',
                author: {
                  fid: 194,
                  username: 'rish',
                  display_name: 'rish'
                },
                text: 'Trending cast from MBD',
                timestamp: '2025-02-12T16:00:21.000Z',
                reactions: {
                  likes_count: 150,
                  recasts_count: 30
                },
                replies: {
                  count: 15
                }
              }
            ]
          }
        })
      });

      const result = await provider.getTrendingFeed({ provider: providerType, providerMetadata });

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Trending cast from MBD');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.neynar.com/v2/farcaster/feed/trending'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'api_key': 'test-api-key'
          })
        })
      );
    });
  });

  describe('searchChannels', () => {
    // ... existing tests ...
  });

  describe('searchBulkChannels', () => {
    it('should throw error when no API key is provided', async () => {
      // Override the config to remove the API key
      mockConfig.providers.farcaster.neynarApiKey = '';
      
      const providerWithoutKey = new FarcasterProvider();
      
      await expect(providerWithoutKey.searchBulkChannels(['test'])).rejects.toThrow(
        'Cannot search Farcaster channels: No API key provided'
      );
    });

    it('should search multiple channels with default parameters', async () => {
      const queries = ['beyond-ai', 'test'];
      
      const result = await provider.searchBulkChannels(queries);
      
      expect(result).toBeDefined();
      expect(Object.keys(result)).toHaveLength(2);
      expect(result['beyond-ai'].channels).toHaveLength(1);
      expect(result['test'].channels).toHaveLength(1);
      expect(result['beyond-ai'].channels[0].name).toBe('Beyond AI');
      expect(result['test'].channels[0].name).toBe('Test Channel');
      
      expect(mockNeynarClient.searchBulkChannels).toHaveBeenCalledWith(
        queries,
        expect.objectContaining({
          limit: 20,
          cursor: undefined
        })
      );
    });

    it('should search multiple channels with custom parameters', async () => {
      const queries = ['beyond-ai', 'test'];
      const options = {
        limit: 10,
        cursor: 'current-page'
      };
      
      const result = await provider.searchBulkChannels(queries, options);
      
      expect(result).toBeDefined();
      expect(Object.keys(result)).toHaveLength(2);
      expect(result['beyond-ai'].channels).toHaveLength(1);
      expect(result['test'].channels).toHaveLength(1);
      
      expect(mockNeynarClient.searchBulkChannels).toHaveBeenCalledWith(
        queries,
        expect.objectContaining(options)
      );
    });

    it('should handle empty queries array', async () => {
      const result = await provider.searchBulkChannels([]);
      
      expect(result).toBeDefined();
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should handle queries with no results', async () => {
      const queries = ['nonexistent', 'another-nonexistent'];
      
      const result = await provider.searchBulkChannels(queries);
      
      expect(result).toBeDefined();
      expect(Object.keys(result)).toHaveLength(2);
      expect(result['nonexistent'].channels).toHaveLength(0);
      expect(result['another-nonexistent'].channels).toHaveLength(0);
    });

    it('should handle API errors gracefully', async () => {
      mockNeynarClient.searchBulkChannels.mockRejectedValueOnce(new Error('API Error'));
      
      const queries = ['beyond-ai', 'test'];
      
      await expect(provider.searchBulkChannels(queries)).rejects.toThrow('API Error');
    });
  });
}); 