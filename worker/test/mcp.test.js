import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { Client as LegacyClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport as LegacyTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { handleRequest } from "../src/index.js";
import { RequestGuard } from "../src/security.js";

const headers = { "content-type": "application/json", accept: "application/json, text/event-stream" };
const now = () => new Date("2026-08-03T04:30:15Z");
const call = (body, extraHeaders = {}) => handleRequest(new Request("http://localhost/mcp", { method: "POST",
  headers: { ...headers, ...extraHeaders }, body: typeof body === "string" ? body : JSON.stringify(body) }), now,
  { guard: new RequestGuard({ perMinute: 10000, burst: 10000 }) });

test("MCP enforces Origin, media negotiation, duplicate keys, bounds, and JSON-RPC envelopes", async () => {
  assert.equal((await call({}, { origin: "https://attacker.invalid" })).status, 403);
  assert.equal((await call({}, { origin: "null" })).status, 403);
  const getWithHostileOrigin = await handleRequest(new Request("http://localhost/mcp", { headers: { origin: "https://attacker.invalid" } }), now);
  assert.equal(getWithHostileOrigin.status, 403);
  assert.equal((await call({}, { accept: "application/json" })).status, 406);
  for (const body of ['[]', 'null', '{"jsonrpc":"2.0","id":null,"method":"ping"}',
    '{"jsonrpc":"2.0","id":9007199254740992,"method":"ping"}']) {
    const response = await call(body);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, -32600);
  }
  for (const body of ['{"params":{"a":1,"a":2}}', '{"params":{"a":1,"\\u0061":2}}', '{"x":' + '['.repeat(14) + '0' + ']'.repeat(14) + '}']) {
    assert.equal((await (await call(body)).json()).error.code, -32700);
  }
  assert.equal((await call(" ".repeat(16_385))).status, 413);
  assert.equal((await call({ jsonrpc: "2.0", method: "notifications/initialized" })).status, 202);
});

test("modern MCP checks required headers, encoded names, version negotiation, and per-request metadata", async () => {
  const meta = { "io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientCapabilities": {} };
  const rpc = { jsonrpc: "2.0", id: "case-1", method: "tools/call", params: { name: "calculate_almanac", arguments: { date: "2026-08-03" }, _meta: meta } };
  const good = { "mcp-protocol-version": "2026-07-28", "mcp-method": "tools/call", "mcp-name": "calculate_almanac" };
  assert.equal((await (await call(rpc, good)).json()).result.resultType, "complete");
  assert.equal((await (await call(rpc, { ...good, "mcp-name": "=?base64?Y2FsY3VsYXRlX2FsbWFuYWM=?=" })).json()).result.isError, false);
  for (const changed of [{ "mcp-name": "get_current_almanac" }, { "mcp-method": "ping" }, { "mcp-protocol-version": "2025-11-25" }]) {
    const response = await call(rpc, { ...good, ...changed });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, -32020);
  }
  const response = await call(rpc, { ...good, "mcp-protocol-version": "2099-01-01" });
  assert.equal((await response.json()).error.code, -32022);
  const parseError = await (await call("{", good)).json();
  assert.equal(parseError.error.code, -32700);
  assert.equal(Object.hasOwn(parseError, "id"), false);
});

export async function verifySdkClients(baseUrl) {
  for (const modern of [false, true]) {
    const client = modern ? new Client({ name: "wannianli-conformance", version: "1" }, { versionNegotiation: { mode: { pin: "2026-07-28" } } })
      : new LegacyClient({ name: "wannianli-conformance", version: "1" });
    const transport = modern ? new StreamableHTTPClientTransport(new URL(baseUrl + "/mcp")) : new LegacyTransport(new URL(baseUrl + "/mcp"));
    try {
      await client.connect(transport);
      const list = await client.listTools();
      assert.equal(list.tools.length, 4);
      const calculated = await client.callTool({ name: "calculate_almanac", arguments: { calendar: "lunar", date: "2020-04-01", leapMonth: true, time: "23:59:59" } });
      assert.equal(calculated.isError, false);
      assert.equal(calculated.structuredContent.gregorian.date, "2020-05-23");
      assert.deepEqual(JSON.parse(calculated.content[0].text), calculated.structuredContent);
      const range = await client.callTool({ name: "calculate_almanac_range", arguments: { startDate: "2020-05-22", endDate: "2020-05-23", time: "23:59:59" } });
      assert.equal(range.isError, false);
      assert.equal(range.structuredContent.range.quotaUnits, 2);
      assert.equal(range.structuredContent.results[1].lunar.leapMonth, true);
      const invalid = await client.callTool({ name: "calculate_almanac", arguments: { date: "2026-02-30" } });
      assert.equal(invalid.isError, true);
      const capabilities = await client.callTool({ name: "get_calendar_capabilities", arguments: {} });
      assert.equal(capabilities.structuredContent.utcOffset, "+08:00");
      const resources = await client.listResources();
      const resource = await client.readResource({ uri: resources.resources[0].uri });
      assert.deepEqual(JSON.parse(resource.contents[0].text), capabilities.structuredContent);
    } finally { await client.close(); }
  }
}

test("official legacy and 2026 SDK clients can discover, validate tool schemas, calculate, and read resources", async () => {
  if (process.env.WANNIANLI_MCP_URL) { await verifySdkClients(process.env.WANNIANLI_MCP_URL); return; }
  const guard = new RequestGuard({ perMinute: 10000, burst: 10000 });
  const server = createServer(async (incoming, outgoing) => {
    try {
      const chunks = []; for await (const chunk of incoming) chunks.push(chunk);
      const request = new Request(`http://127.0.0.1:${server.address().port}${incoming.url}`, { method: incoming.method,
        headers: incoming.headers, ...(incoming.method === "POST" ? { body: Buffer.concat(chunks) } : {}) });
      const response = await handleRequest(request, now, { guard });
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) { outgoing.writeHead(500); outgoing.end(String(error)); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try { await verifySdkClients(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
});
