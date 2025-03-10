import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.test if it exists, otherwise from .env
const envPath = path.resolve(process.cwd(), '.env.test');
const result = dotenv.config({ path: envPath });

if (result.error) {
  // Fall back to .env
  dotenv.config();
}

// Set a longer timeout for e2e tests
jest.setTimeout(30000);

// Global beforeAll and afterAll hooks can be added here
beforeAll(() => {
  // Setup code that runs before all tests
  console.log('Starting test suite');
});

afterAll(() => {
  // Cleanup code that runs after all tests
  console.log('Test suite completed');
}); 