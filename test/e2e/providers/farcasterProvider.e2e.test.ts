import { FarcasterProvider } from '../../../src/providers/farcaster/farcasterProvider';
import config from '../../../src/config';

// These tests use the actual Neynar API, so they require a valid API key
// Skip these tests if the API key is not set or if we're in CI
const shouldRunE2ETests = config.providers.farcaster.neynarApiKey && 
                          config.providers.farcaster.neynarApiKey !== 'test-api-key' &&
                          process.env.CI !== 'true';

// Use a longer timeout for E2E tests
jest.setTimeout(60000);

(shouldRunE2ETests ? describe : describe.skip)('FarcasterProvider E2E Tests', () => {
  let provider: FarcasterProvider;

  beforeAll(() => {
    provider = new FarcasterProvider();
  });

  describe('Search Functionality', () => {
    it('should search for content with a regular query', async () => {
      const results = await provider.searchContent('AI');
      
      // Verify we got results
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      // Verify the structure of the results
      const firstResult = results[0];
      expect(firstResult).toHaveProperty('id');
      expect(firstResult).toHaveProperty('text');
      expect(firstResult).toHaveProperty('authorId');
      expect(firstResult).toHaveProperty('authorName');
      expect(firstResult).toHaveProperty('authorUsername');
      expect(firstResult).toHaveProperty('createdAt');
      expect(firstResult).toHaveProperty('platform', 'farcaster');
      expect(firstResult).toHaveProperty('url');
    });

    it('should search for content from a specific user with from: prefix', async () => {
      // Use a known active user
      const results = await provider.searchContent('from:iamphantasm0');
      
      // Verify we got results
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      // Verify all results are from the specified user
      results.forEach(result => {
        expect(result.authorUsername).toBe('iamphantasm0');
      });
      
      // Verify the structure of the results
      const firstResult = results[0];
      expect(firstResult).toHaveProperty('id');
      expect(firstResult).toHaveProperty('text');
      expect(firstResult).toHaveProperty('authorId');
      expect(firstResult).toHaveProperty('authorName');
      expect(firstResult).toHaveProperty('createdAt');
      expect(firstResult).toHaveProperty('platform', 'farcaster');
      expect(firstResult).toHaveProperty('url');
    });

    it('should handle non-existent usernames gracefully', async () => {
      // Use a username that's unlikely to exist
      const results = await provider.searchContent('from:nonexistentuserxyz123456789');
      
      // Verify we got an empty array
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      const results = await provider.searchContent('from:aswrer2434@$$#@@@!@');
      
      // Verify we got an empty array
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });

  describe('User Profile Functionality', () => {
    it('should fetch a user profile by username', async () => {
      const profile = await provider.getUserProfile('iamphantasm0');
      
      // Verify the structure of the profile
      expect(profile).toHaveProperty('id');
      expect(profile).toHaveProperty('displayName');
      expect(profile).toHaveProperty('username', 'iamphantasm0');
      expect(profile).toHaveProperty('bio');
      expect(profile).toHaveProperty('profileImageUrl');
      expect(profile).toHaveProperty('followerCount');
      expect(profile).toHaveProperty('followingCount');
      expect(profile).toHaveProperty('platform', 'farcaster');
    });

    it('should fetch a user profile by FID', async () => {
      // Use a known FID (Vitalik's FID)
      const profile = await provider.getUserProfile('5650');
      
      // Verify the structure of the profile
      expect(profile).toHaveProperty('id', '5650');
      expect(profile).toHaveProperty('displayName');
      expect(profile).toHaveProperty('username');
      expect(profile).toHaveProperty('bio');
      expect(profile).toHaveProperty('profileImageUrl');
      expect(profile).toHaveProperty('followerCount');
      expect(profile).toHaveProperty('followingCount');
      expect(profile).toHaveProperty('platform', 'farcaster');
    });

    it('should handle non-existent usernames gracefully', async () => {
      // Use a username that's unlikely to exist
      await expect(provider.getUserProfile('nonexistentuserxyz123456789')).rejects.toThrow();
    });
  });

  describe('User Content Functionality', () => {
    it('should fetch content for a user by username', async () => {
      const content = await provider.getUserContent('iamphantasm0');
      
      // Verify we got results
      expect(content).toBeDefined();
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);
      
      // Verify all content is from the specified user
      content.forEach(item => {
        expect(item.authorUsername).toBe('iamphantasm0');
      });
      
      // Verify the structure of the content
      const firstItem = content[0];
      expect(firstItem).toHaveProperty('id');
      expect(firstItem).toHaveProperty('text');
      expect(firstItem).toHaveProperty('authorId');
      expect(firstItem).toHaveProperty('authorName');
      expect(firstItem).toHaveProperty('createdAt');
      expect(firstItem).toHaveProperty('platform', 'farcaster');
      expect(firstItem).toHaveProperty('url');
    });

    it('should fetch content for a user by FID', async () => {
      // Use a known FID (Vitalik's FID)
      const content = await provider.getUserContent('5650');
      
      // Verify we got results
      expect(content).toBeDefined();
      expect(Array.isArray(content)).toBe(true);
      
      // If we got results, verify their structure
      if (content.length > 0) {
        const firstItem = content[0];
        expect(firstItem).toHaveProperty('id');
        expect(firstItem).toHaveProperty('text');
        expect(firstItem).toHaveProperty('authorId', '5650');
        expect(firstItem).toHaveProperty('authorName');
        expect(firstItem).toHaveProperty('createdAt');
        expect(firstItem).toHaveProperty('platform', 'farcaster');
        expect(firstItem).toHaveProperty('url');
      }
    });

    it('should handle non-existent usernames gracefully', async () => {
      // Use a username that's unlikely to exist
      const content = await provider.getUserContent('nonexistentuserxyz123456789');
      
      // Verify we got an empty array
      expect(content).toBeDefined();
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBe(0);
    });
  });
}); 
