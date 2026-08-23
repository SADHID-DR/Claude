# Gamma Plugin for Claude

This plugin enables Claude to generate presentations, documents, webpages, and social content using the Gamma API.

## Features

- **Generate Presentations**: Create beautifully designed presentations from text
- **Multiple Formats**: Support for gamma, document, webpage, and social formats
- **Theme Support**: Choose from multiple design themes
- **Customizable Output**: Control slide count, text density, and imagery
- **MCP Integration**: Full Model Context Protocol support for Claude Desktop
- **REST API**: HTTP endpoints for Gamma operations

## Installation

1. **Get Gamma API Key**
   - Go to [Gamma.app](https://gamma.app)
   - Sign up or log in to your account
   - Navigate to Account Settings > Developer > API Keys
   - Copy your API key

2. **Set Environment Variable**
   ```bash
   export GAMMA_API_KEY="your_api_key_here"
   ```

   Or add to `.env` file:
   ```
   GAMMA_API_KEY=your_api_key_here
   GAMMA_ENABLE_MCP=true
   GAMMA_ENABLE_REST=true
   GAMMA_REST_PATH=/api/gamma
   ```

3. **Install Dependencies**
   ```bash
   npm install @modelcontextprotocol/sdk
   ```

## Usage

### REST API

#### Generate a Presentation
```bash
curl -X POST http://localhost:3000/api/gamma/generate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Create a presentation about AI trends in 2026",
    "format": "gamma",
    "theme": "modern",
    "cardCount": 10,
    "textMode": "medium"
  }'
```

#### Check Generation Status
```bash
curl http://localhost:3000/api/gamma/status/{generationId}
```

#### List Available Themes
```bash
curl http://localhost:3000/api/gamma/themes
```

#### List Recent Generations
```bash
curl http://localhost:3000/api/gamma/generations?limit=10
```

### Claude Integration

When enabled via MCP, use Claude Desktop or Claude Code to:

```
"Create a presentation about machine learning breakthroughs"
```

Claude will automatically use the `gamma_generate` tool to create the presentation.

## Configuration

- `GAMMA_API_KEY`: Your Gamma API key (required)
- `GAMMA_ENABLE_MCP`: Enable MCP server (default: true)
- `GAMMA_ENABLE_REST`: Enable REST API endpoints (default: true)
- `GAMMA_REST_PATH`: Base path for REST endpoints (default: /api/gamma)

## API Reference

### gamma_generate

Generate a new presentation, document, or webpage.

**Parameters:**
- `text` (string, required): Content to generate from
- `format` (string): Output format - "gamma", "document", "webpage", or "social"
- `theme` (string): Theme ID to use
- `cardCount` (number): Number of slides to generate (default: 10)
- `textMode` (string): "short", "medium", or "long"
- `imagery` (string): "unsplash" or "none"
- `private` (boolean): Whether to keep private (default: true)

**Returns:** Generation ID and status

### gamma_get_status

Get the status of a generation job.

**Parameters:**
- `generationId` (string, required): Generation ID to check

**Returns:** Current status and shareable URL when complete

### gamma_list_themes

List all available themes.

**Returns:** Array of theme objects

### gamma_list_generations

List recent generations.

**Parameters:**
- `limit` (number): Maximum results (default: 10)

**Returns:** Array of generation objects

## Error Handling

The plugin includes comprehensive error handling:

- Invalid API key: Returns 401 error
- Rate limiting: Implements exponential backoff
- Network errors: Automatic retry logic
- Invalid requests: Detailed error messages

## Troubleshooting

**Plugin not working?**
1. Verify GAMMA_API_KEY is set correctly
2. Check API key hasn't expired in Gamma account settings
3. Ensure network connectivity
4. Review application logs for detailed errors

**MCP not connecting?**
1. Confirm `GAMMA_ENABLE_MCP=true`
2. Check Claude Desktop configuration
3. Verify stdio transport is available

**REST endpoints not responding?**
1. Verify `GAMMA_ENABLE_REST=true`
2. Check REST path configuration
3. Ensure Express server is running

## Credits System

Gamma uses a credit system for generations:
- Presentations/Documents: ~3-4 credits per slide
- Images: ~1 credit per generated image
- Monitor credit usage in generation responses

## Privacy & Security

- API keys are never logged or exposed
- Presentations can be marked private to restrict access
- All data transmission uses HTTPS
- Consider using environment variables for sensitive data

## Support

For issues with:
- **Gamma API**: Visit [Gamma Help Center](https://help.gamma.app)
- **This Plugin**: Check the repository issues
- **MCP Integration**: See MCP documentation

## License

This plugin is provided as-is for integration with Claude applications.
