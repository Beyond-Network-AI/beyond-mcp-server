import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import readline from 'readline';

/**
 * This script demonstrates how to use stdio to interact with the Beyond MCP Server.
 * It can be used for manual testing of the server functionality.
 * 
 * Usage:
 * ts-node test/e2e/client/testClient.ts
 */

async function main() {
  // Start the server in stdio mode
  const serverPath = path.resolve(process.cwd(), 'dist/index.js');
  
  console.log('Starting MCP server...');
  const serverProcess = spawn('node', [serverPath, '--stdio'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  // Create readline interface for reading server output
  const rl = readline.createInterface({
    input: serverProcess.stdout!,
    terminal: false
  });
  
  // Handle server stderr
  serverProcess.stderr!.on('data', (data) => {
    console.log('Server log:', data.toString());
  });
  
  // Handle server stdout (JSON messages)
  rl.on('line', (line) => {
    try {
      const message = JSON.parse(line);
      console.log('Received message:', JSON.stringify(message, null, 2));
    } catch (error) {
      console.log('Received non-JSON line:', line);
    }
  });
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log('MCP server started');
  
  try {
    // Send server info request
    console.log('\nGetting server info...');
    sendMessage(serverProcess, {
      type: 'server_info_request',
      id: '1'
    });
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // List available tools
    console.log('\nListing available tools...');
    sendMessage(serverProcess, {
      type: 'list_tools_request',
      id: '2'
    });
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // List available prompts
    console.log('\nListing available prompts...');
    sendMessage(serverProcess, {
      type: 'list_prompts_request',
      id: '3'
    });
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test get-thread tool
    console.log('\nTesting get-thread tool...');
    sendMessage(serverProcess, {
      type: 'tool_call_request',
      id: '4',
      name: 'get-thread',
      parameters: {
        platform: 'farcaster',
        threadId: '0xfe512114e8a7c6b23c51c66c318f8a9a548cfb07'
      }
    });
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Kill the server process
    console.log('\nStopping MCP server...');
    if (serverProcess && serverProcess.pid) {
      process.kill(serverProcess.pid);
    }
    console.log('MCP server stopped');
  }
}

// Helper function to send a message to the server
function sendMessage(serverProcess: ChildProcess, message: any) {
  const messageStr = JSON.stringify(message) + '\n';
  serverProcess.stdin!.write(messageStr);
  console.log('Sent message:', message);
}

// Run the main function
main().catch(console.error); 