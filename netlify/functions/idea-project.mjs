// Idea Studio: turns a student's described idea into a step-by-step drawing
// project in Vaughn's teaching method, plus the numbers for a starting
// perspective diagram that the page draws. A second request carries the
// finished drawing plan into a painting process in oil, acrylic or watercolor.
//
// GET  /.netlify/functions/idea-project                      -> { enabled }
// POST /.netlify/functions/idea-project                      -> { project }
// POST /.netlify/functions/idea-project  { action: "paint" } -> { painting }
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

// ── Painting process: carry the finished drawing plan into paint ──
const PAINT_MEDIUMS = ["Oil", "Acrylic", "Watercolor"];

const PAINT_SYSTEM = `You are the studio assistant of Vaughn Tucker, a self-taught Jamaican-born fine artist with more than thirty years at the easel in oil, acrylic and watercolor, teaching at the Vaughn Tucker Art Academy. A student has already planned a drawing in the Idea Studio. Now they want to paint it. Write the painting process for THEIR picture in the medium they chose, the way Vaughn teaches:

- Build on their drawing plan: same eye level, composition and big idea. Refer to their subjects by name at each stage.
- Big shapes and values first, color second, edges third, details last. Stop before overworking.
- Respect how the medium works:
  Oil: tone the canvas, thin lean underpainting, work dark to light and thin to thick (fat over lean), soft blending, let layers dry when needed.
  Acrylic: it dries fast, so work in layers, keep paint moist on a stay-wet palette or with a mister, block in flat shapes, glaze or scumble to adjust, lights can go over darks.
  Watercolor: plan and save the whites of the paper, work light to dark, big wet washes first, let each layer dry before the next, darks and sharp edges last; no white paint needed.
- A limited palette of 5 to 8 real, common paint colors, each with its job in this picture. Give a hex color close to the paint's mass tone.
- Name a value plan: what is lightest, what is middle, what is darkest, so the big idea reads.
- Warm and clear, in plain words a beginner understands. Around 6 to 8 stages.`;

const PAINT_SCHEMA = {
  type: "object",
  properties: {
    medium: { type: "string", enum: PAINT_MEDIUMS },
    surface: { type: "string", description: "What to paint on, a suggested size, and how to prepare it." },
    palette: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, hex: { type: "string" }, use: { type: "string" } },
        required: ["name", "hex", "use"],
        additionalProperties: false,
      },
    },
    tools: { type: "array", items: { type: "string" }, description: "Brushes, mediums and other supplies." },
    color_mood: { type: "string", description: "The color idea, e.g. warm near and cool far." },
    value_plan: {
      type: "object",
      properties: { lights: { type: "string" }, mids: { type: "string" }, darks: { type: "string" } },
      required: ["lights", "mids", "darks"],
      additionalProperties: false,
    },
    stages: {
      type: "array",
      items: {
        type: "object",
        properties: { title: { type: "string" }, detail: { type: "string" } },
        required: ["title", "detail"],
        additionalProperties: false,
      },
    },
    watch_out: { type: "string", description: "The one mistake most likely to spoil this painting, and how to avoid it." },
  },
  required: ["medium", "surface", "palette", "tools", "color_mood", "value_plan", "stages", "watch_out"],
  additionalProperties: false,
};

// Keep only the parts of the drawing plan the painting step needs
function planSummary(p) {
  if (!p || typeof p !== "object") return null;
  const str = (v) => (typeof v === "string" ? v.slice(0, 600) : "");
  const steps = Array.isArray(p.steps) ? p.steps.slice(0, 10).map((s) => `- ${str(s?.title)}: ${str(s?.detail)}`) : [];
  const shapes = Array.isArray(p.diagram?.shapes) ? p.diagram.shapes.slice(0, 8).map((s) => str(s?.label)).filter(Boolean) : [];
  if (!str(p.title) || !steps.length) return null;
  return [
    `Project title: ${str(p.title)}`,
    `Perspective: ${str(p.perspective?.type)}, ${str(p.perspective?.eye_level)} eye level. ${str(p.perspective?.why)}`,
    `Big idea: ${str(p.big_idea)}`,
    `Main subjects: ${shapes.join(", ") || "see steps"}`,
    "Drawing steps:",
    ...steps,
  ].join("\n");
}

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function ask(system, schema, content) {
  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system,
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema },
    },
    messages: [{ role: "user", content }],
  });
  if (response.stop_reason === "refusal") return { status: 422, error: "We couldn't turn that into a project. Please describe a different picture." };
  if (response.stop_reason === "max_tokens") return { status: 502, error: "The answer was cut short. Please try again." };
  const text = response.content.find((b) => b.type === "text")?.text;
  return { status: 200, data: JSON.parse(text) };
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
    return json(400, { error: "Could not read your request. Please try again." });
  }
  const idea = typeof input?.idea === "string" ? input.idea.trim() : "";
  if (idea.length < 10) return json(400, { error: "Please describe your idea in a sentence or two." });
  const level = LEVELS.includes(input.level) ? input.level : "Beginner";

  try {
    let result;
    if (input.action === "paint") {
      const medium = PAINT_MEDIUMS.includes(input.medium) ? input.medium : null;
      const plan = planSummary(input.project);
      if (!medium || !plan) return json(400, { error: "Please build a drawing project first, then choose oil, acrylic or watercolor." });
      result = await ask(PAINT_SYSTEM, PAINT_SCHEMA, [
        `The student's idea: "${idea.slice(0, 800)}"`,
        `Skill level: ${level}.`,
        `Paint it in: ${medium}.`,
        "",
        plan,
      ].join("\n"));
      if (result.data) return json(200, { painting: result.data });
    } else {
      result = await ask(SYSTEM, SCHEMA, [
        `The student's idea: "${idea.slice(0, 800)}"`,
        `Medium: ${MEDIUMS.includes(input.medium) ? input.medium : "Pencil"}.`,
        `Skill level: ${level}.`,
        `View: ${VIEWS.includes(input.view) ? input.view : "Let the studio decide"}.`,
      ].join("\n"));
      if (result.data) return json(200, { project: result.data });
    }
    return json(result.status, { error: result.error });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return json(429, { error: "The studio is busy right now. Please try again in a minute." });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Anthropic API error", err.status, err.message);
      return json(502, { error: "The Idea Studio had a problem. Please try again shortly." });
    }
    console.error("Idea Studio request failed", err);
    return json(500, { error: "Something went wrong. Please try again." });
  }
};
