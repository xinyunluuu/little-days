import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import https from "node:https";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import {
  AI_LIMITS,
  AiError,
  completionUrl,
  isPublicAddress,
  validateChatRequest,
  resolveTarget,
  requestProvider,
  chatCompletion,
} from "../scripts/ai-proxy.mjs";
import { createAppServer } from "../scripts/serve.mjs";

// Deterministic fixtures only. No external DNS, credentials or model API calls.
const KEY = "test-key-never-a-real-credential";
const publicLookup = async () => [{ address: "93.184.216.34", family: 4 }];
const success = (content = "一段虚构的模型回复", extra = {}) => ({
  status: 200,
  text: JSON.stringify({
    choices: [{ message: { content } }],
    model: "fixture-model",
    ...extra,
  }),
});
const body = (overrides = {}) => ({
  baseUrl: "https://provider.example/v1",
  apiKey: KEY,
  model: "fixture-model",
  messages: [{ role: "user", content: "请帮我记录一次散步。" }],
  ...overrides,
});
const rejectsCode = (promise, code) =>
  assert.rejects(
    promise,
    (error) => error instanceof AiError && error.code === code,
  );

async function fixture(t, ai = {}) {
  const calls = [];
  const server = createAppServer({
    ai: {
      lookup: publicLookup,
      transport: async (request) => {
        calls.push(request);
        return success();
      },
      ...ai,
    },
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(
    () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  );
  const origin = "http://127.0.0.1:" + server.address().port;
  const send = (data = body(), options = {}) =>
    new Promise((resolve, reject) => {
      const encoded = typeof data === "string" ? data : JSON.stringify(data);
      const request = http.request(
        origin + (options.path ?? "/api/ai/chat"),
        {
          method: options.method ?? "POST",
          agent: false,
          headers: {
            Origin: origin,
            "Content-Type": "application/json",
            ...options.headers,
          },
        },
        (response) => {
          const chunks = [];
          response.on("data", (chunk) => chunks.push(chunk));
          response.on("end", () => {
            const text = Buffer.concat(chunks).toString("utf8");
            let json;
            try {
              json = JSON.parse(text);
            } catch {
              /* static file response */
            }
            resolve({
              status: response.statusCode,
              text,
              json,
              headers: response.headers,
            });
          });
        },
      );
      request.on("error", reject);
      request.end(encoded);
    });
  return { server, origin, send, calls };
}

test("URL construction appends exactly one completions path and only permits HTTPS or explicit loopback HTTP", () => {
  assert.equal(
    completionUrl("https://provider.example/v1/").href,
    "https://provider.example/v1/chat/completions",
  );
  assert.equal(
    completionUrl("https://provider.example/v1/chat/completions/").href,
    "https://provider.example/v1/chat/completions",
  );
  assert.equal(
    completionUrl("http://127.0.0.1:11434/v1").href,
    "http://127.0.0.1:11434/v1/chat/completions",
  );
  for (const url of [
    "http://provider.example/v1",
    "file:///tmp/key",
    "https://user:pass@provider.example",
    "https://provider.example?key=x",
    "https://provider.example/#x",
  ]) {
    assert.throws(
      () => completionUrl(url),
      (error) => error.code === "INVALID_BASE_URL",
    );
  }
});

test("text-only request validates roles, sizes, model, secret, explicit token parameter and JSON mode", () => {
  const validated = validateChatRequest(
    body({
      maxTokens: 4096,
      jsonMode: true,
      tokenParameter: "max_completion_tokens",
    }),
  );
  assert.deepEqual(validated.body.response_format, { type: "json_object" });
  assert.equal(validated.body.max_completion_tokens, 4096);
  assert.equal(validated.body.max_tokens, undefined);
  assert.equal(validated.body.stream, false);
  assert.equal(validateChatRequest(body()).body.max_tokens, 2048);
  assert.equal(
    validateChatRequest(
      body({ baseUrl: "http://localhost:11434/v1", apiKey: "" }),
    ).apiKey,
    "",
  );
  const invalid = [
    { apiKey: "" },
    { apiKey: "key\ninjected" },
    { apiKey: "x".repeat(4097) },
    { model: "" },
    { model: "a".repeat(201) },
    { messages: [] },
    { messages: Array(41).fill({ role: "user", content: "x" }) },
    { messages: [{ role: "tool", content: "x" }] },
    {
      messages: [
        {
          role: "user",
          content: [{ type: "image_url", image_url: { url: "x" } }],
        },
      ],
    },
    { messages: [{ role: "user", content: "data:image/png;base64,abc" }] },
    { messages: [{ role: "user", content: "x", src: "photo.jpg" }] },
    { messages: [{ role: "user", content: "x".repeat(32001) }] },
    { messages: Array(3).fill({ role: "user", content: "x".repeat(22000) }) },
    { maxTokens: 255 },
    { maxTokens: 8193 },
    { maxTokens: "1024" },
    { maxTokens: 1024.5 },
    { jsonMode: "true" },
    { tokenParameter: "max_output_tokens" },
    { images: ["private.jpg"] },
  ];
  for (const overrides of invalid)
    assert.throws(() => validateChatRequest(body(overrides)), AiError);
});

test("private, link-local, mapped and special addresses cannot be selected as remote providers", async () => {
  const blocked = [
    "0.0.0.0",
    "10.0.0.2",
    "100.64.0.1",
    "127.0.0.2",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.1.1",
    "192.0.2.1",
    "198.18.0.1",
    "224.0.0.1",
    "255.255.255.255",
    "::",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
    "ff02::1",
    "2001:db8::1",
    "2002:7f00:1::",
  ];
  for (const address of blocked)
    assert.equal(isPublicAddress(address), false, address);
  for (const address of [
    "8.8.8.8",
    "93.184.216.34",
    "2606:4700:4700::1111",
    "2001:4860:4860::8888",
  ])
    assert.equal(isPublicAddress(address), true, address);
  await rejectsCode(
    resolveTarget(completionUrl("https://provider.example"), {
      lookup: async () => [{ address: "169.254.169.254", family: 4 }],
    }),
    "BLOCKED_ADDRESS",
  );
  await rejectsCode(
    resolveTarget(completionUrl("https://provider.example"), {
      lookup: async () => [
        { address: "93.184.216.34", family: 4 },
        { address: "10.0.0.2", family: 4 },
      ],
    }),
    "BLOCKED_ADDRESS",
  );
  await rejectsCode(
    resolveTarget(completionUrl("https://not-localhost.example"), {
      lookup: async () => [{ address: "127.0.0.1", family: 4 }],
    }),
    "BLOCKED_ADDRESS",
  );
  await rejectsCode(
    resolveTarget(completionUrl("https://192.168.1.1")),
    "BLOCKED_ADDRESS",
  );
  const lookupMustNotRun = async () => {
    throw new Error("explicit loopback must not resolve");
  };
  assert.deepEqual(
    await resolveTarget(completionUrl("http://localhost:11434/v1"), {
      lookup: lookupMustNotRun,
    }),
    { address: "127.0.0.1", family: 4 },
  );
  assert.deepEqual(
    await resolveTarget(completionUrl("http://[::1]:11434/v1"), {
      lookup: lookupMustNotRun,
    }),
    { address: "::1", family: 6 },
  );
});

test("mocked native transport pins DNS and preserves the provider Host/TLS name without following redirects", async (t) => {
  let nativeCalls = 0;
  let sentBody;
  t.mock.method(https, "request", (url, options, callback) => {
    nativeCalls++;
    assert.equal(url.hostname, "provider.example");
    assert.equal(options.agent, false);
    assert.equal(options.headers.Authorization, "Bearer " + KEY);
    options.lookup("provider.example", {}, (error, ip, family) => {
      assert.equal(error, null);
      assert.equal(ip, "93.184.216.34");
      assert.equal(family, 4);
    });
    options.lookup("provider.example", { all: true }, (error, addresses) => {
      assert.equal(error, null);
      assert.deepEqual(addresses, [{ address: "93.184.216.34", family: 4 }]);
    });
    const request = new EventEmitter();
    request.end = (encoded) => {
      sentBody = JSON.parse(encoded);
      const response = new PassThrough();
      response.statusCode = 302;
      response.headers = { location: "https://another.example/steal" };
      queueMicrotask(() => callback(response));
    };
    return request;
  });
  const request = validateChatRequest(body());
  const result = await requestProvider({
    ...request,
    address: { address: "93.184.216.34", family: 4 },
  });
  assert.equal(result.status, 302);
  assert.equal(result.text, "");
  assert.equal(nativeCalls, 1);
  assert.equal(sentBody.apiKey, undefined);
});

test("successful responses expose only content, model and numeric usage and redact an echoed key", async () => {
  const result = await chatCompletion(body(), {
    lookup: publicLookup,
    transport: async () =>
      success("reply " + KEY, {
        model: KEY,
        usage: {
          prompt_tokens: 4,
          completion_tokens: 6,
          total_tokens: 10,
          secret: KEY,
        },
        private: KEY,
      }),
  });
  assert.deepEqual(result.usage, {
    prompt_tokens: 4,
    completion_tokens: 6,
    total_tokens: 10,
  });
  assert.equal(JSON.stringify(result).includes(KEY), false);
  assert.deepEqual(Object.keys(result).sort(), ["content", "model", "usage"]);
});

test("upstream failures are sanitized and never retried", async () => {
  for (const [status, code] of [
    [302, "UPSTREAM_REDIRECT"],
    [401, "UPSTREAM_AUTH"],
    [403, "UPSTREAM_AUTH"],
    [429, "UPSTREAM_LIMIT"],
    [400, "UPSTREAM_CONFIG"],
    [404, "UPSTREAM_CONFIG"],
    [500, "UPSTREAM_FAILED"],
  ]) {
    let calls = 0;
    await assert.rejects(
      chatCompletion(body(), {
        lookup: publicLookup,
        transport: async () => {
          calls++;
          return { status, text: KEY + " private provider error" };
        },
      }),
      (error) => error.code === code && !error.message.includes(KEY),
    );
    assert.equal(calls, 1);
  }
  await rejectsCode(
    chatCompletion(body(), {
      lookup: publicLookup,
      transport: async () => {
        throw new Error(KEY);
      },
    }),
    "UPSTREAM_NETWORK",
  );
  await rejectsCode(
    chatCompletion(body(), {
      lookup: async () => {
        throw new Error(KEY);
      },
      transport: async () => assert.fail("No transport after DNS failure"),
    }),
    "DNS_FAILED",
  );
  for (const text of [
    "invalid json",
    "null",
    '{"choices":[]}',
    '{"choices":[{"message":{"content":"  "}}]}',
  ]) {
    await assert.rejects(
      chatCompletion(body(), {
        lookup: publicLookup,
        transport: async () => ({ status: 200, text }),
      }),
      AiError,
    );
  }
  await rejectsCode(
    chatCompletion(body(), {
      lookup: publicLookup,
      transport: async () => ({
        status: 200,
        text: "a".repeat(AI_LIMITS.responseBytes + 1),
      }),
    }),
    "UPSTREAM_TOO_LARGE",
  );
});

test("same-origin HTTP route works and health endpoint reports local AI capability", async (t) => {
  const f = await fixture(t);
  const response = await f.send();
  assert.equal(response.status, 200);
  assert.equal(response.json.content, "一段虚构的模型回复");
  assert.equal(response.headers["cache-control"], "no-store");
  assert.equal(response.text.includes(KEY), false);
  assert.equal(f.calls.length, 1);
  assert.equal(
    f.calls[0].url.href,
    "https://provider.example/v1/chat/completions",
  );
  const health = await f.send("", { method: "GET", path: "/api/health" });
  assert.deepEqual(health.json, { ai: true });
  const page = await f.send("", { method: "GET", path: "/" });
  assert.equal(page.status, 200);
  assert.match(page.headers["content-type"], /text\/html/);
});

test("foreign Origin, null/missing Origin, cross-site metadata and forged Host never reach transport", async (t) => {
  const f = await fixture(t);
  for (const headers of [
    { Origin: "https://attacker.example" },
    { Origin: "null" },
    { Origin: "" },
    { Origin: f.origin.replace("127.0.0.1", "localhost") },
    { "Sec-Fetch-Site": "cross-site" },
    { Host: "attacker.example" },
    { Host: "127.0.0.1:9999" },
  ])
    assert.equal((await f.send(body(), { headers })).status, 403);
  assert.equal((await f.send(body(), { method: "OPTIONS" })).status, 405);
  assert.equal(
    (
      await f.send("", {
        method: "GET",
        path: "/api/health",
        headers: { Host: "rebind.example" },
      })
    ).status,
    403,
  );
  assert.equal(f.calls.length, 0);
});

test("bad JSON, non-JSON, oversize bodies and image payloads fail before any provider call", async (t) => {
  const f = await fixture(t);
  assert.equal((await f.send("{broken")).status, 400);
  assert.equal(
    (await f.send(body(), { headers: { "Content-Type": "text/plain" } }))
      .status,
    415,
  );
  assert.equal(
    (await f.send("x".repeat(AI_LIMITS.requestBytes + 1))).status,
    413,
  );
  assert.equal(
    (
      await f.send(
        body({
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: "data:image/png;base64,secret" },
                },
              ],
            },
          ],
        }),
      )
    ).status,
    400,
  );
  assert.equal(f.calls.length, 0);
});

test("timeout aborts the pending mock and returns a safe message without retry", async (t) => {
  let abortedSignal = false;
  let calls = 0;
  const f = await fixture(t, {
    timeoutMs: 25,
    transport: ({ signal }) =>
      new Promise((resolve, reject) => {
        calls++;
        signal.addEventListener(
          "abort",
          () => {
            abortedSignal = true;
            reject(new Error(KEY));
          },
          { once: true },
        );
      }),
  });
  const response = await f.send();
  assert.equal(response.status, 504);
  assert.equal(response.json.code, "UPSTREAM_TIMEOUT");
  assert.equal(response.text.includes(KEY), false);
  assert.equal(abortedSignal, true);
  assert.equal(calls, 1);
});

test("disconnecting the browser aborts the outstanding upstream request", async (t) => {
  let announceStart;
  let announceAbort;
  const started = new Promise((resolve) => {
    announceStart = resolve;
  });
  const stopped = new Promise((resolve) => {
    announceAbort = resolve;
  });
  const f = await fixture(t, {
    transport: ({ signal }) =>
      new Promise((resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => {
            announceAbort();
            reject(new Error("cancelled mock"));
          },
          { once: true },
        );
        announceStart();
      }),
  });
  const request = http.request(f.origin + "/api/ai/chat", {
    method: "POST",
    agent: false,
    headers: { Origin: f.origin, "Content-Type": "application/json" },
  });
  request.on("error", () => {});
  request.end(JSON.stringify(body()));
  await started;
  request.destroy();
  await stopped;
});

test("static dot paths remain forbidden and API has no permissive CORS headers", async (t) => {
  const f = await fixture(t);
  assert.equal(
    (await f.send("", { method: "GET", path: "/.git/config" })).status,
    403,
  );
  assert.equal(
    (await f.send("", { method: "GET", path: "/%2e%2e%2fpackage.json" }))
      .status,
    403,
  );
  assert.equal(
    (await f.send("", { method: "GET", path: "/api/missing" })).status,
    404,
  );
  assert.equal(
    (await f.send()).headers["access-control-allow-origin"],
    undefined,
  );
});
