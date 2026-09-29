// Instant AI "first look" critique for the Living Studio critique station.
//
// GET  /.netlify/functions/critique  -> { enabled }  (is an API key configured?)
// POST /.netlify/functions/critique  -> { critique } for one uploaded artwork
//
// Needs the ANTHROPIC_API_KEY environment variable in Netlify
// (Project configuration → Environment variables). Without it the page hides
// the instant critique and only offers Vaughn's personal critique.

import Anthropic from "@anthropic-ai/sdk";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // the page shrinks images well below this
const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"];
const FOCUSES = ["Overall", "Composition", "Value", "Color", "Depth", "Drawing & Perspective"];
const STAGES = ["Sketch", "Block-in", "Mid-painting", "Nearly finished", "Finished"];

const SYSTEM = `You are the studio assistant of Vaughn Tucker, a self-taught Jamaican-born fine artist who has painted for more than thirty years in oil, acrylic, watercolor and pencil, and who teaches at the Vaughn Tucker Art Academy. Students upload a photo of their artwork and you give the first-look critique Vaughn would give in the studio.

How Vaughn critiques:
- Look closely at THIS artwork. Every point must refer to something actually visible in it: a named area, shape, color or edge ("the dark rock at lower left", "the sky behind the hat"). Never give advice that could apply to any painting.
- Start with what is working, sincerely and specifically. Students keep painting when they know what to keep.
- Then give ONE strong improvement: the single change that would help this piece most. Explain what to do and why, concretely enough that the student could make the change tomorrow.
- Then two or three smaller "next pass" moves, in order of importance.
- Teach the principle behind each point (values, edges, temperature, perspective, composition) in plain words a beginner understands. Avoid jargon; if you use a term, explain it.
- Warm, direct and encouraging, never flattering and never harsh. Treat the student as a serious artist at their own level.
- Respect the student's style. Loose, expressive or stylized work is judged on its own terms, not against photographic realism.
- If the student asked a question or chose a focus, answer it within the critique.
- The teacher's note is one short sentence in Vaughn's voice, such as "Make one strong improvement before five small ones."

If the image is not an artwork (a screenshot, a random photo, text), or is too blurry to judge, set is_artwork to false, explain kindly in first_impression what to upload instead, and leave the other fields short.`;

const SCHEMA = {
  type: "object",
  properties: {
    is_artwork: { type: "boolean" },
    first_impression: { type: "string", description: "Two or three sentences on how the piece reads at first glance." },
    strengths: { type: "array", items: { type: "string" }, description: "Two to five specific things that are working." },
    main_improvement: {
      type: "object",
      properties: {
        title: { type: "string", description: "A short imperative, e.g. 'Ground the figure'." },
        detail: { type: "string", description: "What to change, where, how, and why." },
      },
      required: ["title", "detail"],
      additionalProperties: false,
    },
    next_pass: { type: "array", items: { type: "string" }, description: "Two or three smaller moves, most important first." },
    teacher_note: { type: "string" },
  },
  required: ["is_artwork", "first_impression", "strengths", "main_improvement", "next_pass", "teacher_note"],
  additionalProperties: false,
};

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export default async (req) => {
  const enabled = Boolean(process.env.ANTHROPIC_API_KEY);
  if (req.method === "GET") return json(200, { enabled });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  if (!enabled) return json(503, { error: "Instant critiques are not switched on yet." });

  let input;
  try {
    input = await req.json();
  } catch {
    return json(400, { error: "Could not read the upload. Please try again." });
  }

  const { image, mediaType, focus, stage, question } = input || {};
  if (typeof image !== "string" || !MEDIA_TYPES.includes(mediaType)) {
    return json(400, { error: "Please upload a JPEG, PNG or WebP image." });
  }
  if (image.length * 0.75 > MAX_IMAGE_BYTES) {
    return json(413, { error: "That image is too large. Please try a smaller photo." });
  }

  const brief = [
    `Critique focus: ${FOCUSES.includes(focus) ? focus : "Overall"}.`,
    `Stage of the work: ${STAGES.includes(stage) ? stage : "Not stated"}.`,
    typeof question === "string" && question.trim()
      ? `The student asks: "${question.trim().slice(0, 600)}"`
      : "The student did not add a question.",
  ].join("\n");

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
            { type: "text", text: brief },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return json(422, { error: "We couldn't critique this image. Please try a different photo of your artwork." });
    }
    if (response.stop_reason === "max_tokens") {
      return json(502, { error: "The critique was cut short. Please try again." });
    }
    const text = response.content.find((b) => b.type === "text")?.text;
    return json(200, { critique: JSON.parse(text) });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return json(429, { error: "The studio is busy right now. Please try again in a minute." });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Anthropic API error", err.status, err.message);
      return json(502, { error: "The critique service had a problem. Please try again shortly." });
    }
    console.error("Critique failed", err);
    return json(500, { error: "Something went wrong. Please try again." });
  }
};
