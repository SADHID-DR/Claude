import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req) {
  try {
    const {
      image,
      mediaType,
      drawingType,
      spaceType,
      area,
      renderEngine,
      style,
      notes,
      perspectives,
    } = await req.json();

    if (!image || !drawingType || !perspectives.length) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const projectContext = [
      `Space: ${spaceType}`,
      area && `Area: ${area} m²`,
      `Style: ${style}`,
      `Render Engine: ${renderEngine}`,
      notes && `Notes: ${notes}`,
    ]
      .filter(Boolean)
      .join("\n");

    const perspectivesStr = perspectives.join("\n- ");

    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 2000,
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
              text: `You are an expert architectural visualization specialist. Generate highly detailed and specific render prompts for an AI image generator based on this ${drawingType === "floor-plan" ? "floor plan" : "elevation"} drawing.

PROJECT CONTEXT:
${projectContext}

RENDER PERSPECTIVES REQUESTED:
- ${perspectivesStr}

Generate detailed, professional render prompts that:
1. Reference specific elements visible in the drawing
2. Include materials, finishes, and textures from the notes
3. Specify lighting, mood, and atmosphere
4. Match the requested style and render engine capabilities
5. Are suitable for: ${renderEngine}

For each perspective requested, create a comprehensive prompt that an AI image generator would understand.

Respond with ONLY valid JSON (no markdown):
{
  "prompts": [
    {
      "perspective": "perspective name",
      "prompt": "detailed render prompt with specific materials, colors, mood, style, and any measurable details from the drawing"
    },
    ... (one for each requested perspective)
  ]
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
    console.error("Generate prompts error:", err);
    return Response.json(
      { error: err.message || "Failed to generate prompts" },
      { status: 500 }
    );
  }
}
