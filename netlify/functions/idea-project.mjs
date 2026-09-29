// Idea Studio: turns a student's described idea into a step-by-step drawing
// project in Vaughn's teaching method, plus the numbers for a starting
// perspective diagram that the page draws.
//
// GET  /.netlify/functions/idea-project  -> { enabled }
// POST /.netlify/functions/idea-project  -> { project }
//
// Uses the same ANTHROPIC_API_KEY environment variable as the critique.

import Anthropic from "@anthropic-ai/sdk";

const MEDIUMS = ["Pencil", "Pen & ink", "Acrylic", "Oil", "Watercolor", "Mixed media"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const VIEWS = ["Let the studio decide", "Eye level", "Looking up", "Looking down"];
const LESSONS = {
  "perspective-lab": "Perspective Lab: eye level and vanishing points (drawing)",
  "drawing-studio": "Drawing Studio: interactive 1-, 2- and 3-point perspective exercises",
  "painting-lesson": "The Road to Brown's Town: atmosphere and using photo references (oil landscape)",
  "automated-lesson": "Jamaican Road Study: guided painting lesson, big shapes, value, color, edges",
  "art-materials": "Art Materials and colour mixing essentials (acrylic)",
};

const SYSTEM = `You are the studio assistant of Vaughn Tucker, a self-taught Jamaican-born fine artist with more than thirty years at the easel in oil, acrylic, watercolor and pencil, who teaches at the Vaughn Tucker Art Academy. In the Idea Studio a student describes a picture they have in their head, and you turn it into a drawing project they can actually carry out, the way Vaughn teaches:

- Construction before detail. Decide the eye level first, then vanishing points, then simple forms (boxes, cylinders, simple figures), then values, and only then details.
- Name the one big idea that makes this picture work, the visual tension or feeling, and design every step to serve it.
- Start with small thumbnail sketches to choose the composition.
- Be specific to THIS idea: name its subjects, where they go, which is near and which is far, how scale is shown.
- Each step is something the student can do at the table today, in plain words a beginner understands. Explain any art term you use.
- Warm, clear and encouraging. Around 5 to 8 steps.
- Suggest one short practice exercise to do first, and pick the academy lesson that best prepares the student.

Available lessons (use the id): ${Object.entries(LESSONS).map(([id, d]) => `${id} = ${d}`).join("; ")}.

The diagram: give numbers for a simple starting diagram on a canvas where x runs 0 (left edge) to 1 (right edge) and y runs 0 (top edge) to 1 (bottom edge).
- horizon: the eye level as a y value (a low eye level is about 0.7 to 0.8, a high one about 0.2 to 0.3).
- mode: 1, 2 or 3 point perspective. For 1-point, vp_left_x is the single vanishing point. For 2- and 3-point, vp_left_x and vp_right_x are the two vanishing points on the horizon; they may lie outside 0 to 1 (for example -0.3 and 1.3) when the view should look calm. vp3_y is only used in 3-point: a negative value is far above (looking up), a value above 1 is far below (looking down).
- shapes: 2 to 6 main forms. kind is "figure" for people or animals, "block" for buildings, rocks and boxy things, "cylinder" for trees, towers and columns. x is the horizontal centre, ground_y is where the shape stands on the ground (its bottom), height and width are fractions of the canvas. A standing person of normal size on the viewer's ground has their eyes on the horizon line no matter how far away they are; use that to show scale. Keep every shape inside the canvas.

If the text is not an idea for a picture, or asks for something inappropriate for an art school, set is_drawable to false, explain kindly in message what kind of idea to describe, and keep the other fields minimal.`;

const SCHEMA = {
  type: "object",
  properties: {
    is_drawable: { type: "boolean" },
    message: { type: "string", description: "One or two encouraging sentences to the student." },
    title: { type: "string", description: "A short, evocative project title." },
    perspective: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["One-point", "Two-point", "Three-point"] },
        eye_level: { type: "string", enum: ["Low", "Middle", "High"] },
        why: { type: "string" },
      },
      required: ["type", "eye_level", "why"],
      additionalProperties: false,
    },
    difficulty: { type: "string", enum: LEVELS },
    big_idea: { type: "string" },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: { title: { type: "string" }, detail: { type: "string" } },
        required: ["title", "detail"],
        additionalProperties: false,
      },
    },
    practice_first: { type: "string" },
    start_lesson: { type: "string", enum: Object.keys(LESSONS) },
    diagram: {
      type: "object",
      properties: {
        mode: { type: "integer", enum: [1, 2, 3] },
        horizon: { type: "number" },
        vp_left_x: { type: "number" },
        vp_right_x: { type: "number" },
        vp3_y: { type: "number" },
        shapes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              kind: { type: "string", enum: ["figure", "block", "cylinder"] },
              x: { type: "number" },
              ground_y: { type: "number" },
              height: { type: "number" },
              width: { type: "number" },
            },
            required: ["label", "kind", "x", "ground_y", "height", "width"],
            additionalProperties: false,
          },
        },
      },
      required: ["mode", "horizon", "vp_left_x", "vp_right_x", "vp3_y", "shapes"],
      additionalProperties: false,
    },
  },
  required: ["is_drawable", "message", "title", "perspective", "difficulty", "big_idea", "steps", "practice_first", "start_lesson", "diagram"],
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
  if (!enabled) return json(503, { error: "The Idea Studio is not switched on yet." });

  let input;
  try {
    input = await req.json();
  } catch {
    return json(400, { error: "Could not read your idea. Please try again." });
  }
  const idea = typeof input?.idea === "string" ? input.idea.trim() : "";
  if (idea.length < 10) return json(400, { error: "Please describe your idea in a sentence or two." });

  const brief = [
    `The student's idea: "${idea.slice(0, 800)}"`,
    `Medium: ${MEDIUMS.includes(input.medium) ? input.medium : "Pencil"}.`,
    `Skill level: ${LEVELS.includes(input.level) ? input.level : "Beginner"}.`,
    `View: ${VIEWS.includes(input.view) ? input.view : "Let the studio decide"}.`,
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
      messages: [{ role: "user", content: brief }],
    });

    if (response.stop_reason === "refusal") {
      return json(422, { error: "We couldn't turn that into a project. Please describe a different picture." });
    }
    if (response.stop_reason === "max_tokens") {
      return json(502, { error: "The project was cut short. Please try again." });
    }
    const text = response.content.find((b) => b.type === "text")?.text;
    return json(200, { project: JSON.parse(text) });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return json(429, { error: "The studio is busy right now. Please try again in a minute." });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Anthropic API error", err.status, err.message);
      return json(502, { error: "The Idea Studio had a problem. Please try again shortly." });
    }
    console.error("Idea project failed", err);
    return json(500, { error: "Something went wrong. Please try again." });
  }
};
