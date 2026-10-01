import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/idea-image.mjs';
const url = 'https://academy.example/api/idea-image';
const input = { idea: 'A small house seen from the bottom of a hill', project: { is_drawable: true, title: 'Hill house', big_idea: 'The house rises above the viewer', perspective: { type: 'Two-point', eye_level: 'Low' } } };
function req(body = input, origin = 'https://academy.example') { return new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', origin }, body: JSON.stringify(body) }); }
test('image service validates requests, keeps secrets private, and handles provider errors', async () => {
 const originalFetch = globalThis.fetch;
 let calls = 0;
 globalThis.Netlify = { env: { get: () => undefined } };
 assert.deepEqual(await (await handler(new Request(url))).json(), { enabled: false });
 assert.equal((await handler(req())).status, 503);
 globalThis.Netlify.env.get = () => 'test-secret';
 globalThis.fetch = async (endpoint, options) => {
  calls++;
  assert.equal(endpoint, 'https://api.openai.com/v1/images/generations');
  const payload = JSON.parse(options.body);
  assert.equal(payload.n, 1); assert.equal(payload.quality, 'medium');
  assert.match(payload.prompt, /Hill house/);
  return Response.json({ data: [{ b64_json: '/9j/AA==' }] });
 };
 try {
  assert.equal((await handler(req(input, 'https://other.example'))).status, 403);
  assert.equal((await handler(req({}))).status, 400);
  assert.equal((await handler(req({ idea: 'x'.repeat(17000) }))).status, 413);
  assert.equal(calls, 0);
  const good = await handler(req());
  assert.equal(good.status, 200); assert.equal(good.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await good.json(), { image: '/9j/AA==', mediaType: 'image/jpeg' });
  globalThis.fetch = async () => Response.json({ error: { message: 'private provider details test-secret' } }, { status: 401 });
  const bad = await handler(req()); assert.equal(bad.status, 502); assert.doesNotMatch(await bad.text(), /test-secret/);
  globalThis.fetch = async () => Response.json({}, { status: 429 });
  assert.equal((await handler(req())).status, 429);
  globalThis.fetch = async () => { throw new DOMException('late', 'TimeoutError'); };
  assert.equal((await handler(req())).status, 504);
 } finally { globalThis.fetch = originalFetch; delete globalThis.Netlify; }
});
