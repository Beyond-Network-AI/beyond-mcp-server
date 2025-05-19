import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// No default API key - users must provide their own

interface Config {
  server: {
    port: number;
    host: string;
    environment: string;
  };
  providers: {
    farcaster: {
      neynarApiKey: string;
      enabled: boolean;
    };
    twitter: {
      apiKey: string;
      apiSecret: string;
      enabled: boolean;
    };
    telegram: {
      botToken: string;
      enabled: boolean;
    };
  };
  cache: {
    enabled: boolean;
    ttl: number; // Time to live in seconds
  };
}

// Check if Farcaster should be enabled
const enableFarcaster = process.env.ENABLE_FARCASTER === 'true' || 
                        process.env.ENABLE_FARCASTER === undefined; // Default to true if not specified

// Use the API key from environment, no fallback
const neynarApiKey = process.env.NEYNAR_API_KEY || '';

// Log warning if API key is missing
if (!neynarApiKey && enableFarcaster) {
  console.error('WARNING: Farcaster is enabled but no NEYNAR_API_KEY is provided.');
  console.error('The server will not be able to interact with Farcaster.');
  console.error('Please set NEYNAR_API_KEY in your .env file or pass it as a command line argument:');
  console.error('  --neynar-api-key=YOUR_API_KEY_HERE');
  console.error('Current working directory:', process.cwd());
  console.error('__dirname:', __dirname);
}

console.error('Config initialization:');
console.error('- ENABLE_FARCASTER:', enableFarcaster);
console.error('- NEYNAR_API_KEY:', neynarApiKey ? 'Set (not showing full key)' : 'Not set');

const config: Config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  providers: {
    farcaster: {
      neynarApiKey: neynarApiKey,
      enabled: enableFarcaster
    },
    twitter: {
      apiKey: process.env.TWITTER_API_KEY || '',
      apiSecret: process.env.TWITTER_API_SECRET || '',
      enabled: process.env.ENABLE_TWITTER === 'false'
    },
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      enabled: process.env.ENABLE_TELEGRAM === 'false'
    }
  },
  cache: {
    enabled: process.env.ENABLE_CACHE === 'true',
    ttl: parseInt(process.env.CACHE_TTL || '300', 10) // 5 minutes default
  }
};

export default config; 
