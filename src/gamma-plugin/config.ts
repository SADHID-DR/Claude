export interface GammaConfig {
  apiKey: string;
  enableMCP: boolean;
  enableREST: boolean;
  restPath?: string;
}

export function getGammaConfig(): GammaConfig {
  const apiKey = process.env.GAMMA_API_KEY;

  if (!apiKey) {
    console.warn('GAMMA_API_KEY environment variable is not set. Gamma plugin will be disabled.');
  }

  return {
    apiKey: apiKey || '',
    enableMCP: process.env.GAMMA_ENABLE_MCP !== 'false',
    enableREST: process.env.GAMMA_ENABLE_REST !== 'false',
    restPath: process.env.GAMMA_REST_PATH || '/api/gamma',
  };
}

export function isGammaEnabled(): boolean {
  return !!process.env.GAMMA_API_KEY;
}
