import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const STYLE_DESCRIPTIONS = {
  modern: "sleek, clean lines, neutral palettes, functional furniture, minimal clutter, bold geometric shapes",
  minimalist: "bare essentials, white and off-white tones, open space, hidden storage, zen-like calm",
  scandinavian: "warm wood tones, cozy textiles, hygge feeling, muted pastels, natural light, organic shapes",
  industrial: "exposed brick and metal, raw textures, Edison bulbs, dark palette with warm accents, loft aesthetic",
  bohemian: "layered textiles, warm earthy tones, eclectic mix of patterns, plants, vintage finds, macramé",
  "mid-century": "tapered legs, organic curves, retro color pops, teak wood, clean silhouettes from the 1950s–60s",
  japandi: "wabi-sabi philosophy, natural materials, muted earth tones, functional simplicity, Japanese-Scandinavian fusion",
  coastal: "light blues and whites, natural linen, driftwood textures, rattan furniture, airy and breezy feel",
};

export async function POST(req) {
  try {
    const { image, mediaType, style, room } = await req.json();

    if (!image || !style || !room) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const styleDesc = STYLE_DESCRIPTIONS[style] || style;
    const roomLabel = room.replace(/-/g, " ");

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
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
              text: `You are an expert interior designer. Analyze this ${roomLabel} photo and provide a ${style} style redesign recommendation.

Style characteristics: ${styleDesc}

Respond with ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "analysis": "2-3 sentence analysis of the current room and how the ${style} style would transform it",
  "recommendations": [
    "specific actionable recommendation 1",
    "specific actionable recommendation 2",
    "specific actionable recommendation 3",
    "specific actionable recommendation 4",
    "specific actionable recommendation 5"
  ],
  "colorPalette": [
    { "name": "color name", "hex": "#hexcode" },
    { "name": "color name", "hex": "#hexcode" },
    { "name": "color name", "hex": "#hexcode" },
    { "name": "color name", "hex": "#hexcode" }
  ]
}`,
            },
          ],
        },
      ],
    });

    const raw = message.content[0].text.trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error("Could not parse AI response as JSON");
      }
    }

    return Response.json(parsed);
  } catch (err) {
    console.error("Redesign API error:", err);
    return Response.json(
      { error: err.message || "Failed to generate redesign" },
      { status: 500 }
    );
  }
}
