import { createMcpServer } from '../../../src/mcp/server';
import config from '../../../src/config';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

// These tests use the actual Neynar API, so they require a valid API key
// Skip these tests if the API key is not set or if we're in CI
const shouldRunE2ETests = config.providers.farcaster.neynarApiKey && 
                          config.providers.farcaster.neynarApiKey !== 'test-api-key' &&
                          process.env.CI !== 'true';

// Use a longer timeout for E2E tests
jest.setTimeout(30000);

(shouldRunE2ETests ? describe : describe.skip)('MCP Server E2E Tests', () => {
  let serverProcess: ChildProcess;
  let stderrData = '';

  beforeAll(async () => {
    // Start the server in stdio mode
    const serverPath = path.resolve(process.cwd(), 'dist/index.js');
    serverProcess = spawn('node', [serverPath, '--stdio'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Collect server stderr output for verification
    if (serverProcess.stderr) {
      serverProcess.stderr.on('data', (data) => {
        const text = data.toString();
        stderrData += text;
        console.log('Server stderr:', text);
      });
    }
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('Started MCP server for E2E tests');
  });

  afterAll(() => {
    // Kill the server process
    if (serverProcess && serverProcess.pid) {
      process.kill(serverProcess.pid);
    }
    console.log('Stopped MCP server');
  });

  describe('Server Startup', () => {
    it('should start successfully', () => {
      // The server should have started without crashing
      expect(serverProcess.killed).toBeFalsy();
    });
  });

  describe('Server Output', () => {
    it('should log initialization messages', () => {
      // Check for expected log messages
      expect(stderrData).toContain('Creating MCP server');
      expect(stderrData).toContain('Registering MCP capabilities');
      expect(stderrData).toContain('MCP server created successfully');
    });
    
    it('should log available providers', () => {
      // Check that Farcaster provider is available
      expect(stderrData).toContain('Available providers:');
      expect(stderrData).toContain('farcaster');
    });
  });
}); 