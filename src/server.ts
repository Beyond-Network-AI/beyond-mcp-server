import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createSseTransport } from './mcp/server';
import config from './config';

export async function createExpressServer() {
  const app = express();
  
  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });
  
  // SSE endpoint for MCP
  app.get('/sse', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Create SSE transport
    const transport = await createSseTransport(res);
    
    // Handle client disconnect
    req.on('close', () => {
      console.error('Client disconnected from SSE');
    });
  });
  
  // Message endpoint for MCP over HTTP
  app.post('/messages', async (req, res) => {
    // This would need to be implemented with proper session management
    // in a production environment
    res.status(501).json({ error: 'Not implemented' });
  });
  
  return app;
}

export async function startExpressServer() {
  const app = await createExpressServer();
  const port = config.server.port;
  
  app.listen(port, () => {
    console.error(`Beyond MCP Server listening on port ${port}`);
  });
}
