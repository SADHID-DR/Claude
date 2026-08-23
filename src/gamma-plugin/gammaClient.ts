import fetch from 'node-fetch';
import { GammaGenerateRequest, GammaGenerateResponse, GammaTheme, GammaStatusResponse } from './types';

export class GammaClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.gamma.app/v1';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Gamma API key is required');
    }
    this.apiKey = apiKey;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    const options: any = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gamma API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  async generate(request: GammaGenerateRequest): Promise<GammaGenerateResponse> {
    const payload = {
      text: request.text,
      format: request.format || 'gamma',
      theme: request.theme,
      cardCount: request.cardCount || 10,
      textMode: request.textMode || 'medium',
      imagery: request.imagery || 'unsplash',
      private: request.private !== false,
    };

    return this.request<GammaGenerateResponse>('POST', '/generate', payload);
  }

  async getStatus(generationId: string): Promise<GammaStatusResponse> {
    return this.request<GammaStatusResponse>('GET', `/generations/${generationId}`);
  }

  async listThemes(): Promise<GammaTheme[]> {
    return this.request<GammaTheme[]>('GET', '/themes');
  }

  async getTheme(themeId: string): Promise<GammaTheme> {
    return this.request<GammaTheme>('GET', `/themes/${themeId}`);
  }

  async listGenerations(limit: number = 10): Promise<GammaGenerateResponse[]> {
    return this.request<GammaGenerateResponse[]>('GET', `/generations?limit=${limit}`);
  }
}
