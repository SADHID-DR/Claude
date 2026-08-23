export { GammaClient } from './gammaClient';
export { GammaMCPServer, initializeGammaMCPServer } from './mcpServer';
export type { GammaGenerateRequest, GammaGenerateResponse, GammaTheme, GammaStatusResponse } from './types';

// Express route handlers for Gamma API integration
import { Router } from 'express';
import { GammaClient } from './gammaClient';

export function createGammaRouter(apiKey: string): Router {
  const router = Router();
  const gammaClient = new GammaClient(apiKey);

  router.post('/generate', async (req, res) => {
    try {
      const { text, format, theme, cardCount, textMode, imagery, private: isPrivate } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      const result = await gammaClient.generate({
        text,
        format,
        theme,
        cardCount,
        textMode,
        imagery,
        private: isPrivate,
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  router.get('/status/:generationId', async (req, res) => {
    try {
      const result = await gammaClient.getStatus(req.params.generationId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  router.get('/themes', async (req, res) => {
    try {
      const result = await gammaClient.listThemes();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  router.get('/generations', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await gammaClient.listGenerations(limit);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  return router;
}
