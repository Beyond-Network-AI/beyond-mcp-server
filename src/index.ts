import { startStdioServer } from './mcp/server';
import { startExpressServer } from './server';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Log the current working directory
console.error('Current working directory:', process.cwd());

// Try to find the .env file in multiple locations
const possibleEnvPaths = [
  // Current working directory
  path.resolve(process.cwd(), '.env'),
  // Directory where the script is located
  path.resolve(__dirname, '../.env'),
  // Try one level up from dist directory (project root)
  path.resolve(__dirname, '../../.env'),
  // Try dist directory itself
  path.resolve(__dirname, '.env'),
  // Try parent directories (up to 3 levels)
  path.resolve(process.cwd(), '../.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), '../../../.env')
];

let envLoaded = false;

for (const envPath of possibleEnvPaths) {
  console.error('Attempting to load .env from:', envPath);
  
  if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      console.error('.env file loaded successfully from:', envPath);
      envLoaded = true;
      break;
    } else {
      console.error('Error loading .env file from', envPath, ':', result.error);
    }
  } else {
    console.error('.env file not found at:', envPath);
  }
}

if (!envLoaded) {
  console.error('Could not load .env file from any location. Using fallback values.');
  console.error('Please create a .env file with your configuration. See .env.example for reference.');
}

// Set default environment variables if not already set
if (!process.env.ENABLE_FARCASTER) {
  console.error('ENABLE_FARCASTER not set, using fallback value: true');
  process.env.ENABLE_FARCASTER = 'true';
}

if (!process.env.NEYNAR_API_KEY) {
  console.error('NEYNAR_API_KEY not set. Please set this in your .env file.');
  console.error('You can get a Neynar API key from https://neynar.com/');
  console.error('The server will not function correctly without a valid API key.');
  // Not setting a fallback value, will let the application handle this case
}

// Log environment variables related to Farcaster
console.error('Environment variables after loading:');
console.error('- ENABLE_FARCASTER:', process.env.ENABLE_FARCASTER);
console.error('- NEYNAR_API_KEY:', process.env.NEYNAR_API_KEY ? 'Set (not showing full key)' : 'Not set');
console.error('- NODE_ENV:', process.env.NODE_ENV);

// Now import config after environment variables are set
import config from './config';

async function main() {
  // Check if we're in stdio mode or HTTP mode
  const args = process.argv.slice(2);
  const isStdioMode = args.includes('--stdio') || !args.includes('--http');

  // Check for API key in command line arguments
  const apiKeyArg = args.find(arg => arg.startsWith('--neynar-api-key='));
  if (apiKeyArg && !process.env.NEYNAR_API_KEY) {
    const apiKey = apiKeyArg.split('=')[1];
    if (apiKey) {
      console.error('Using Neynar API key from command line arguments');
      process.env.NEYNAR_API_KEY = apiKey;
    }
  }

  try {
    if (isStdioMode) {
      // Start server in stdio mode
      console.error('Starting Beyond MCP Server in stdio mode');
      await startStdioServer();
    } else {
      // Start server in HTTP mode
      console.error('Starting Beyond MCP Server in HTTP mode');
      await startExpressServer();
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
