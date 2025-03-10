# Beyond MCP Server

An extensible Model Context Protocol server that provides standardized access to social platform data and onchain data. Currently supports Farcaster (via Neynar API) with placeholder for Twitter integration. More platforms like Telegram including onchain data will be added soon.

## Features

- **MCP Compliant**: Fully implements the Model Context Protocol specification
- **Multi-Platform**: Designed to support multiple social media platforms
- **Extensible**: Easy to add new platform providers
- **Well-Formatted**: Optimized context formatting for LLM consumption
- **Flexible Transport**: Supports both stdio and SSE/HTTP transports


## Supported Platforms

- **Farcaster**: Full implementation via Neynar API
- **Twitter**: Placeholder (not implemented)
![Farcaster MCP Demo](https://github.com/user-attachments/assets/5689cdd2-1435-4f68-9144-d82b1ec4c4f3)

## Getting Started

### Prerequisites

- Node.js 16+
- Neynar API key (for Farcaster access) [https://neynar.com/](https://neynar.com/)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/beyond-mcp-server.git
cd beyond-mcp-server
```

2. Install dependencies
```bash
npm install
```

3. Create a .env file from the template
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. Configure your environment variables
   - **Required**: Set `NEYNAR_API_KEY` in your .env file
   - You can obtain a Neynar API key from [https://neynar.com/](https://neynar.com/)
   - Without a valid API key, Farcaster functionality will not work

5. Build and start the server
```bash
npm run build
npm start  # For stdio mode (default)
# OR
npm run start:http  # For HTTP/SSE mode
```

## Using with Claude for Desktop

1. Build the server
```bash
npm run build
```

2. Make sure your .env file is properly configured with your API keys
   - The server will look for .env in the following locations:
     - Current working directory
     - Project root directory
     - Parent directories (up to 3 levels)
   - You can also set environment variables directly in your system

3. Add the server to your Claude Desktop configuration at:
* macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
* Windows: %APPDATA%\Claude\claude_desktop_config.json

```json
{
  "mcpServers": {
    "beyond-social": {
      "command": "/usr/local/bin/node",
      "args": [
        "/full/path/to/beyond-mcp-server/dist/index.js",
        "--stdio"
      ]
    }
  }
}
```

4. Alternatively, you can pass the API key and other environment variables directly in the Claude Desktop configuration (recommended):

```json
{
  "mcpServers": {
    "beyond-social": {
      "command": "/usr/local/bin/node",
      "args": [
        "/full/path/to/beyond-mcp-server/dist/index.js",
        "--stdio"
      ],
      "env": {
        "NEYNAR_API_KEY": "YOUR_API_KEY_HERE",
        "ENABLE_FARCASTER": "true",
        "ENABLE_TWITTER": "false"
      }
    }
  }
}
```

5. Restart Claude for Desktop

## MCP Capabilities

### Resources

* `social://{platform}/{query}/search` - Search content on a platform
* `social://{platform}/user/{userId}/profile` - Get user profile
* `social://{platform}/user/{userId}/content` - Get user content
* `social://{platform}/thread/{threadId}` - Get conversation thread
* `social://{platform}/trending` - Get trending topics

### Tools

* `search-content` - Search for content on a social platform
* `get-user-profile` - Get a user's profile information
* `get-user-content` - Get content from a specific user
* `get-thread` - Get a conversation thread
* `get-trending-topics` - Get current trending topics

### Prompts

* `analyze-thread` - Analyze a social media thread
* `summarize-user-activity` - Summarize a user's activity
* `explore-trending-topics` - Explore trending topics on a platform
* `analyze-search-results` - Analyze search results for a query

## Extending with New Providers

To add a new social platform provider:

1. Create a new directory in `src/providers/`
2. Implement the `ContentProvider` interface
3. Register the provider in the registry

Example:

```typescript
import { ContentProvider } from '../interfaces/provider';

export class MyPlatformProvider implements ContentProvider {
  public name = 'myplatform';
  public platform = 'myplatform';
  
  // Implement all required methods
}
```

## Development

### Running in Development Mode

```bash
npm run dev        # stdio mode
npm run dev:http   # HTTP mode
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Changelog

   All notable changes to this project will be documented in this file.
   
   ### [1.0.0] - 2025-Mar-10
   
   #### Added
   - Initial release
   - Farcaster integration via Neynar API
   - MCP compliant server implementation
   - Support for both stdio and HTTP modes

   
