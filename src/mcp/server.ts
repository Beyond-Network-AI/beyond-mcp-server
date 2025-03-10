import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { ProviderRegistry } from '../providers/registry';
import { registerContentResources } from './resources/contentResources';
import { registerContentTools } from './tools/contentTools';
import { registerContentPrompts } from './prompts/contentPrompts';

export async function createMcpServer() {
  console.error('Creating MCP server');
  
  // Initialize provider registry
  const providerRegistry = new ProviderRegistry();
  
  // Initialize MCP server
  const server = new McpServer({
    name: "Beyond MCP Server",
    version: "1.0.0",
    description: "An extensible MCP server for social media context"
  });
  
  console.error('Registering MCP capabilities');
  
  // Register MCP capabilities
  registerContentResources(server, providerRegistry);
  registerContentTools(server, providerRegistry);
  registerContentPrompts(server);
  
  console.error('MCP server created successfully');
  
  return { server, providerRegistry };
}

export async function startStdioServer() {
  console.error('Starting stdio server');
  const { server, providerRegistry } = await createMcpServer();
  
  // Check available providers
  console.error('Checking available providers');
  const availableProviders = await providerRegistry.getAvailableProviders();
  console.error('Available providers:', availableProviders.map(p => p.name));
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP server connected to stdio transport');
}

export async function createSseTransport(res: any) {
  console.error('Creating SSE transport');
  const { server } = await createMcpServer();
  const transport = new SSEServerTransport('/messages', res);
  await server.connect(transport);
  return transport;
}
