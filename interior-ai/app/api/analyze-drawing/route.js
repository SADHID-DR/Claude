import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req) {
  try {
    const { image, mediaType } = await req.json();

    if (!image) {
      return Response.json({ error: "Missing image" }, { status: 400 });
    }

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType || "image/jpeg",
                data: image,
              },
            },
            {
              type: "text",
              text: `Is this architectural drawing a floor plan (top-down 2D view of a space layout) or an elevation (vertical wall view showing heights, materials, and details)?

Respond with ONLY valid JSON:
{
  "type": "floor-plan" or "elevation"
}`,
            },
          ],
        },
      ],
    });

    const raw = message.content[0].text.trim();
    const parsed = JSON.parse(raw);

    return Response.json(parsed);
  } catch (err) {
    console.error("Analyze drawing error:", err);
    return Response.json(
      { error: err.message || "Failed to analyze drawing" },
      { status: 500 }
    );
  }
}
