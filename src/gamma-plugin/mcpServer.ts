import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, TextContent, Tool } from '@modelcontextprotocol/sdk/types.js';
import { GammaClient } from './gammaClient';

export class GammaMCPServer {
  private server: Server;
  private gammaClient: GammaClient;

  constructor(apiKey: string) {
    this.gammaClient = new GammaClient(apiKey);
    this.server = new Server({
      name: 'gamma-mcp',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, () => {
      const tools: Tool[] = [
        {
          name: 'gamma_generate',
          description: 'Generate a presentation, document, or webpage using Gamma API',
          inputSchema: {
            type: 'object' as const,
            properties: {
              text: {
                type: 'string',
                description: 'The content to generate the presentation from',
              },
              format: {
                type: 'string',
                enum: ['gamma', 'document', 'webpage', 'social'],
                description: 'Format of the output (gamma, document, webpage, or social)',
              },
              theme: {
                type: 'string',
                description: 'Theme ID to use for the presentation',
              },
              cardCount: {
                type: 'number',
                description: 'Number of slides/cards to generate (default: 10)',
              },
              textMode: {
                type: 'string',
                enum: ['short', 'medium', 'long'],
                description: 'Text density level (short, medium, or long)',
              },
              imagery: {
                type: 'string',
                enum: ['unsplash', 'none'],
                description: 'Image source (unsplash or none)',
              },
              private: {
                type: 'boolean',
                description: 'Whether the presentation should be private (default: true)',
              },
            },
            required: ['text'],
          },
        },
        {
          name: 'gamma_get_status',
          description: 'Get the status of a generation job',
          inputSchema: {
            type: 'object' as const,
            properties: {
              generationId: {
                type: 'string',
                description: 'The ID of the generation to check',
              },
            },
            required: ['generationId'],
          },
        },
        {
          name: 'gamma_list_themes',
          description: 'List available themes for presentations',
          inputSchema: {
            type: 'object' as const,
            properties: {},
          },
        },
        {
          name: 'gamma_list_generations',
          description: 'List recent generations',
          inputSchema: {
            type: 'object' as const,
            properties: {
              limit: {
                type: 'number',
                description: 'Maximum number of generations to return (default: 10)',
              },
            },
          },
        },
      ];

      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'gamma_generate': {
            const result = await this.gammaClient.generate({
              text: String(request.params.arguments?.text),
              format: request.params.arguments?.format as any,
              theme: request.params.arguments?.theme as string,
              cardCount: request.params.arguments?.cardCount as number,
              textMode: request.params.arguments?.textMode as any,
              imagery: request.params.arguments?.imagery as any,
              private: request.params.arguments?.private as boolean,
            });

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                } as TextContent,
              ],
            };
          }

          case 'gamma_get_status': {
            const result = await this.gammaClient.getStatus(
              String(request.params.arguments?.generationId)
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                } as TextContent,
              ],
            };
          }

          case 'gamma_list_themes': {
            const result = await this.gammaClient.listThemes();

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                } as TextContent,
              ],
            };
          }

          case 'gamma_list_generations': {
            const limit = (request.params.arguments?.limit as number) || 10;
            const result = await this.gammaClient.listGenerations(limit);

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                } as TextContent,
              ],
            };
          }

          default:
            return {
              content: [
                {
                  type: 'text',
                  text: `Unknown tool: ${request.params.name}`,
                } as TextContent,
              ],
              isError: true,
            };
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool: ${error instanceof Error ? error.message : String(error)}`,
            } as TextContent,
          ],
          isError: true,
        };
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Gamma MCP server running on stdio');
  }
}

// Export a singleton instance initialization
export async function initializeGammaMCPServer(apiKey?: string): Promise<void> {
  const key = apiKey || process.env.GAMMA_API_KEY;
  if (!key) {
    console.error('GAMMA_API_KEY environment variable is not set');
    return;
  }

  const server = new GammaMCPServer(key);
  await server.run();
}
