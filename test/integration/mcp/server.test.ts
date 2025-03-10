import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMcpServer } from '../../../src/mcp/server';
import { ProviderRegistry } from '../../../src/providers/registry';
import { mockNeynarClient } from '../../mocks/neynarClient.mock';

// Mock the Neynar client
jest.mock('@neynar/nodejs-sdk', () => {
  return {
    Configuration: jest.fn().mockImplementation(() => ({})),
    NeynarAPIClient: jest.fn().mockImplementation(() => mockNeynarClient)
  };
});

// Mock the config
jest.mock('../../../src/config', () => ({
  providers: {
    farcaster: {
      enabled: true,
      neynarApiKey: 'test-api-key'
    },
    twitter: {
      enabled: false
    },
    telegram: {
      enabled: false
    }
  }
}));

describe('MCP Server Integration', () => {
  let serverObj: { server: McpServer; providerRegistry: ProviderRegistry };

  beforeAll(async () => {
    // Create the MCP server
    serverObj = await createMcpServer();
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should create a server with the correct configuration', () => {
    expect(serverObj).toBeDefined();
    expect(serverObj.server).toBeDefined();
    expect(serverObj.providerRegistry).toBeDefined();
  });

  it('should have registered the Farcaster provider', () => {
    const provider = serverObj.providerRegistry.getProviderForPlatform('farcaster');
    expect(provider).toBeDefined();
    expect(provider?.name).toBe('farcaster');
  });

  it('should not have registered the Twitter provider', () => {
    const provider = serverObj.providerRegistry.getProviderForPlatform('twitter');
    expect(provider).toBeUndefined();
  });

  it('should not have registered the Telegram provider', () => {
    const provider = serverObj.providerRegistry.getProviderForPlatform('telegram');
    expect(provider).toBeUndefined();
  });

  // Test that the Farcaster provider has the expected methods
  it('should have a Farcaster provider with the expected methods', () => {
    const provider = serverObj.providerRegistry.getProviderForPlatform('farcaster');
    expect(provider).toBeDefined();
    
    // Check that the provider has the expected methods
    expect(typeof provider?.isAvailable).toBe('function');
    expect(typeof provider?.getThread).toBe('function');
    expect(typeof provider?.searchContent).toBe('function');
    expect(typeof provider?.getUserProfile).toBe('function');
    expect(typeof provider?.getUserContent).toBe('function');
    expect(typeof provider?.getTrendingTopics).toBe('function');
  });
}); 