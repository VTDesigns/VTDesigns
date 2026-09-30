# Idea Studio concept sketches

The optional Generate concept sketch button sends the saved project to `/api/idea-image`. A server-side function calls OpenAI directly using `gpt-image-2.5-flare`, one medium-quality 1024×1024 JPEG per click. Drawing and painting plans and critiques continue using their existing Claude integration. The concept image is an artistic reference, not a precision perspective diagram.

## Activation

1. In the existing Netlify project `luminous-paletas-f90806`, securely add `OPENAI_API_KEY` from the funded OpenAI project, scoped to Functions. Never paste a key into source code or chat.
2. Deploy the reviewed branch. GET `/api/idea-image` reports only `{ enabled: true/false }`, never the key.
3. Generate one sketch from a saved drawing project to verify model access, billing, latency, image display and download. Check the OpenAI usage dashboard for the charge. A configured key alone does not prove access.
4. Confirm the Netlify deploy log accepted the rate-limit rule.

## Limits and review notes

- No API request is made until the student clicks. Each image request costs money in the connected OpenAI account.
- Netlify limits the endpoint to four requests per IP/domain in 180 seconds (including availability checks). This is not a daily quota or a total spend cap. Existing one-free-project-per-day UI limits apply to plans only. Configure account spending controls before broad public use.
- Requests are capped at 16 KB. Model, quality, size and image count are fixed server-side. Cross-origin browser requests are rejected; this is not user authentication.
- The server stops waiting after 50 seconds to fit Netlify's synchronous timeout. OpenAI may still complete and charge for a timed-out request. Do not automatically retry. If real requests frequently exceed this limit, move generation into a background job with stored results before launch.
- Images remain in memory for this page visit, and can be downloaded. They are not saved in the project localStorage entry or uploaded to shared storage.
- Local tests use mocked OpenAI responses; live generation and visual quality require the configured account and a preview test.
