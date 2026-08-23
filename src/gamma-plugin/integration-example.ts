/**
 * Example integration of Gamma plugin with Express server
 *
 * Add this to your server.ts or main Express setup file:
 */

import express from 'express';
import { createGammaRouter, getGammaConfig, isGammaEnabled } from './index';

// In your main Express app setup (e.g., server.ts):
export function setupGammaIntegration(app: express.Application): void {
  const config = getGammaConfig();

  if (!isGammaEnabled()) {
    console.log('Gamma plugin disabled: GAMMA_API_KEY not configured');
    return;
  }

  // Enable REST API routes if configured
  if (config.enableREST && config.apiKey) {
    const gammaRouter = createGammaRouter(config.apiKey);
    app.use(config.restPath || '/api/gamma', gammaRouter);
    console.log(`Gamma REST API enabled at ${config.restPath || '/api/gamma'}`);
  }

  // Enable MCP server if configured
  if (config.enableMCP && config.apiKey) {
    // MCP server should be run separately as a subprocess or in a dedicated process
    // Uncomment below to start MCP server:
    /*
    import { initializeGammaMCPServer } from './mcpServer';

    // Run MCP server in a separate process or thread
    // For production, consider running this as a separate service
    initializeGammaMCPServer(config.apiKey).catch(error => {
      console.error('Failed to initialize Gamma MCP server:', error);
    });
    */
    console.log('Gamma MCP server is enabled but requires separate process initialization');
  }
}

/**
 * Example usage in your Express app:
 *
 * import express from 'express';
 * import { setupGammaIntegration } from './src/gamma-plugin/integration-example';
 *
 * const app = express();
 *
 * // ... other middleware setup ...
 *
 * // Setup Gamma integration
 * setupGammaIntegration(app);
 *
 * // ... rest of your routes ...
 *
 * app.listen(3000, () => {
 *   console.log('Server running on port 3000');
 * });
 */

/**
 * Example API calls:
 *
 * 1. Generate a presentation:
 *    POST /api/gamma/generate
 *    {
 *      "text": "Create a presentation about AI",
 *      "format": "gamma",
 *      "theme": "modern",
 *      "cardCount": 10
 *    }
 *
 * 2. Check status:
 *    GET /api/gamma/status/{generationId}
 *
 * 3. List themes:
 *    GET /api/gamma/themes
 *
 * 4. List generations:
 *    GET /api/gamma/generations?limit=10
 */
