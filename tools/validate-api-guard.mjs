import assert from "node:assert/strict";
import net from "node:net";

const port = Number(process.argv[2] ?? 18081);
assert.ok(Number.isInteger(port) && port > 0 && port <= 65535);
const path = "/api/v1/almanac/calculate";
const url = `http://127.0.0.1:${port}${path}`;
const pending = [];
const connections = [];
try {
  for (let i = 0; i < 4; i++) {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    connections.push(socket);
    let output = "";
    pending.push(new Promise((resolve, reject) => {
      socket.setEncoding("utf8");
      socket.setTimeout(8000, () => { socket.destroy(); reject(new Error("local body timeout was not enforced")); });
      socket.on("data", (chunk) => { output += chunk; });
      socket.on("error", reject);
      socket.on("end", () => resolve(output));
    }));
    await new Promise((resolve, reject) => {
      socket.once("error", reject);
      socket.once("connect", () => {
        socket.write(`POST ${path} HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Type: application/json\r\nContent-Length: 100\r\nConnection: close\r\n\r\n{`, resolve);
      });
    });
  }
  await new Promise((resolve) => setTimeout(resolve, 150));
  const input = JSON.stringify({ "历法": "公历", "年": 2026, "月": 8, "日": 3 });
  const post = () => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: input });
  const busy = await post();
  assert.equal(busy.status, 503, "fifth pending computation must be rejected");
  await busy.text();
  for (const response of await Promise.all(pending)) {
    assert.match(response, /^HTTP\/1\.1 408 /u, response);
    assert.ok(!response.includes("Exception"));
  }
  const recovered = await post();
  assert.equal(recovered.status, 200, "permits must be released after body timeouts");
  await recovered.text();
  console.log(JSON.stringify({ stalledBodies: 4, fifthRequest: 503, timeoutResponses: 408, subsequentRequest: 200, result: "passed on loopback" }));
} finally {
  connections.forEach((socket) => socket.destroy());
}
