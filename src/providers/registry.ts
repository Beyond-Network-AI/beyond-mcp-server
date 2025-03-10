import { ContentProvider } from './interfaces/provider';
import { FarcasterProvider } from './farcaster/farcasterProvider';
import { TwitterProvider } from './twitter/twitterProvider';
import { TelegramProvider } from './telegram/telegramProvider';
import config from '../config';

export class ProviderRegistry {
  private providers: Map<string, ContentProvider> = new Map();
  
  constructor() {
    console.error('Initializing ProviderRegistry');
    
    // Create a sanitized config object for logging that masks API keys
    const sanitizedConfig = {
      farcaster: {
        neynarApiKey: config.providers.farcaster.neynarApiKey ? '********' : 'Not set',
        enabled: config.providers.farcaster.enabled
      },
      twitter: {
        apiKey: config.providers.twitter.apiKey ? '********' : 'Not set',
        apiSecret: config.providers.twitter.apiSecret ? '********' : 'Not set',
        enabled: config.providers.twitter.enabled
      },
      telegram: {
        botToken: config.providers.telegram.botToken ? '********' : 'Not set',
        enabled: config.providers.telegram.enabled
      }
    };
    
    console.error('Config:', JSON.stringify(sanitizedConfig, null, 2));
    this.registerDefaultProviders();
  }
  
  private registerDefaultProviders(): void {
    // Register Farcaster provider if enabled
    console.error('Checking if Farcaster provider is enabled:', config.providers.farcaster.enabled);
    if (config.providers.farcaster.enabled) {
      console.error('Registering Farcaster provider');
      try {
        const farcasterProvider = new FarcasterProvider();
        this.registerProvider(farcasterProvider);
        console.error('Farcaster provider registered successfully');
      } catch (error) {
        console.error('Error registering Farcaster provider:', error);
      }
    }
    
    // Register Twitter provider if enabled
    if (config.providers.twitter.enabled) {
      this.registerProvider(new TwitterProvider());
    }
    
    // Register Telegram provider if enabled
    if (config.providers.telegram.enabled) {
      this.registerProvider(new TelegramProvider());
    }
    
    // Log all registered providers
    console.error('Registered providers:', Array.from(this.providers.keys()));
  }
  
  registerProvider(provider: ContentProvider): void {
    this.providers.set(provider.name, provider);
    console.error(`Registered provider: ${provider.name}`);
  }
  
  getProvider(name: string): ContentProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider '${name}' not found`);
    }
    return provider;
  }
  
  getAllProviders(): ContentProvider[] {
    return Array.from(this.providers.values());
  }
  
  async getAvailableProviders(): Promise<ContentProvider[]> {
    const availabilityChecks = Array.from(this.providers.values()).map(async provider => {
      console.error(`Checking availability of provider: ${provider.name}`);
      try {
        const isAvailable = await provider.isAvailable();
        console.error(`Provider ${provider.name} availability: ${isAvailable}`);
        return { provider, isAvailable };
      } catch (error) {
        console.error(`Error checking availability of provider ${provider.name}:`, error);
        return { provider, isAvailable: false };
      }
    });
    
    const results = await Promise.all(availabilityChecks);
    return results
      .filter(result => result.isAvailable)
      .map(result => result.provider);
  }
  
  getProviderForPlatform(platform: string): ContentProvider | undefined {
    console.error(`Looking for provider for platform: ${platform}`);
    console.error(`Available providers:`, Array.from(this.providers.entries()).map(([name, provider]) => `${name} (${provider.platform})`));
    
    const provider = Array.from(this.providers.values()).find(
      provider => provider.platform.toLowerCase() === platform.toLowerCase()
    );
    
    if (provider) {
      console.error(`Found provider for platform ${platform}: ${provider.name}`);
    } else {
      console.error(`No provider found for platform: ${platform}`);
    }
    
    return provider;
  }
}
