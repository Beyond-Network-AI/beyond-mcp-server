# Beyond MCP Server Tests

This directory contains tests for the Beyond MCP Server. The tests are organized into three categories:

## Unit Tests

Unit tests test individual components in isolation. They use mocks to avoid external dependencies.

```bash
npm run test:unit
```

## Integration Tests

Integration tests test how components work together. They still use mocks for external APIs.

```bash
npm run test:integration
```

## End-to-End Tests

End-to-end tests test the entire system with real external dependencies. These tests require a valid Neynar API key.

```bash
npm run test:e2e
```

## Test Client

There's also a test client that can be used to manually test the server:

```bash
npm run test:client
```

## Running All Tests

To run all tests:

```bash
npm test
```

## Test Coverage

To generate a test coverage report:

```bash
npm run test:coverage
```

## Test Environment

The tests use a separate environment configuration defined in `.env.test`. This allows you to use different API keys for testing.

## Mocks

Mocks for external dependencies are defined in the `test/mocks` directory. These are used by unit and integration tests to avoid making real API calls.

## Debugging Tests

To debug tests, you can use the `--inspect` flag with Node.js:

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then connect to the debugger using Chrome DevTools or your IDE. 