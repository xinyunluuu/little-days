import http from "node:http";
import https from "node:https";
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

export const AI_LIMITS = Object.freeze({
  requestBytes: 128 * 1024,
  responseBytes: 1024 * 1024,
  messages: 40,
  messageCharacters: 32_000,
  totalCharacters: 64_000,
  keyCharacters: 4096,
  modelCharacters: 200,
  minTokens: 256,
  maxTokens: 8192,
  defaultTokens: 2048,
  timeoutMs: 60_000,
});

export class AiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const fail = (code, message, status = 400) => {
  throw new AiError(status, code, message);
};
const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const unbracket = (host) => host.replace(/^\[|\]$/g, "").toLowerCase();
const explicitLoopback = (host) =>
  ["localhost", "127.0.0.1", "::1"].includes(host);

// Custom remote providers must resolve only to globally routable addresses.
// Mapped IPv6 and special/transition networks are intentionally excluded.
export function isPublicAddress(address) {
  if (isIP(address) === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  if (isIP(address) === 6) {
    const first = parseInt(address.split(":")[0], 16);
    const second = parseInt(address.split(":")[1] || "0", 16);
    return (
      first >= 0x2000 &&
      first <= 0x3fff &&
      first !== 0x2002 &&
      !(first === 0x2001 && (second <= 0x01ff || second === 0x0db8))
    );
  }
  return false;
}

export function completionUrl(baseUrl) {
  if (
    typeof baseUrl !== "string" ||
    baseUrl.length > 2048 ||
    baseUrl !== baseUrl.trim()
  ) {
    fail("INVALID_BASE_URL", "请填写有效的 API Base URL。");
  }
  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    fail("INVALID_BASE_URL", "API Base URL 格式不正确。");
  }
  const hostname = unbracket(url.hostname);
  if (url.username || url.password || url.search || url.hash) {
    fail("INVALID_BASE_URL", "API 地址不能包含账号、密码、查询参数或片段。");
  }
  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && explicitLoopback(hostname))
  ) {
    fail(
      "INVALID_BASE_URL",
      "远程 API 需要 HTTPS；本机服务可用 http://127.0.0.1 或 localhost。",
    );
  }
  if (!hostname || hostname.includes("%"))
    fail("INVALID_BASE_URL", "API 主机地址不受支持。");
  const pathname = url.pathname.replace(/\/+$/, "");
  url.pathname = pathname.endsWith("/chat/completions")
    ? pathname
    : pathname + "/chat/completions";
  return url;
}

export function validateChatRequest(input) {
  if (!isObject(input)) fail("INVALID_REQUEST", "请求需要是 JSON 对象。");
  const allowed = new Set([
    "baseUrl",
    "apiKey",
    "model",
    "messages",
    "maxTokens",
    "jsonMode",
    "tokenParameter",
  ]);
  if (Object.keys(input).some((key) => !allowed.has(key)))
    fail("INVALID_REQUEST", "请求包含不支持的字段；目前仅支持文字对话。");
  const url = completionUrl(input.baseUrl);
  const local = explicitLoopback(unbracket(url.hostname));
  const apiKey = input.apiKey ?? "";
  if (
    typeof apiKey !== "string" ||
    apiKey.length > AI_LIMITS.keyCharacters ||
    /[^\x21-\x7e]/.test(apiKey) ||
    (!local && !apiKey)
  ) {
    fail("INVALID_KEY", "请填写有效的 API Key；本机模型可以留空。");
  }
  if (
    typeof input.model !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9_.:/@+-]{0,199}$/.test(input.model)
  ) {
    fail("INVALID_MODEL", "请填写服务商提供的模型 ID（最多 200 字符）。");
  }
  if (
    !Array.isArray(input.messages) ||
    input.messages.length < 1 ||
    input.messages.length > AI_LIMITS.messages
  ) {
    fail("INVALID_MESSAGES", "每次请求需要 1 至 40 条文字消息。");
  }
  let total = 0;
  const roles = new Set(["system", "developer", "user", "assistant"]);
  const messages = input.messages.map((message) => {
    if (
      !isObject(message) ||
      Object.keys(message).some((key) => !["role", "content"].includes(key)) ||
      !roles.has(message.role) ||
      typeof message.content !== "string" ||
      !message.content.trim() ||
      message.content.length > AI_LIMITS.messageCharacters ||
      /data:image\//i.test(message.content)
    ) {
      fail("INVALID_MESSAGES", "仅接受有效的纯文字消息；不能发送图片或附件。");
    }
    total += message.content.length;
    return { role: message.role, content: message.content };
  });
  if (total > AI_LIMITS.totalCharacters)
    fail("INVALID_MESSAGES", "对话过长，请缩短本次发送的内容。");
  if (input.jsonMode !== undefined && typeof input.jsonMode !== "boolean")
    fail("INVALID_REQUEST", "jsonMode 需要是布尔值。");
  const maxTokens = input.maxTokens ?? AI_LIMITS.defaultTokens;
  if (
    !Number.isInteger(maxTokens) ||
    maxTokens < AI_LIMITS.minTokens ||
    maxTokens > AI_LIMITS.maxTokens
  ) {
    fail("INVALID_TOKENS", "输出 token 上限需要是 256 至 8192 之间的整数。");
  }
  const tokenParameter = input.tokenParameter ?? "max_tokens";
  if (!["max_tokens", "max_completion_tokens"].includes(tokenParameter))
    fail("INVALID_TOKENS", "不支持这个 token 参数。");
  const body = {
    model: input.model,
    messages,
    stream: false,
    [tokenParameter]: maxTokens,
  };
  if (input.jsonMode) body.response_format = { type: "json_object" };
  return { url, apiKey, body };
}

const aborted = () => new AiError(499, "REQUEST_CANCELLED", "请求已取消。");

function abortable(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(aborted());
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(aborted());
    signal.addEventListener("abort", onAbort, { once: true });
    promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", onAbort));
  });
}

export async function resolveTarget(url, { lookup = dnsLookup, signal } = {}) {
  const hostname = unbracket(url.hostname);
  if (explicitLoopback(hostname))
    return {
      address: hostname === "::1" ? "::1" : "127.0.0.1",
      family: hostname === "::1" ? 6 : 4,
    };
  let addresses;
  try {
    addresses = isIP(hostname)
      ? [{ address: hostname, family: isIP(hostname) }]
      : await abortable(
          Promise.resolve().then(() =>
            lookup(hostname, { all: true, verbatim: true }),
          ),
          signal,
        );
  } catch {
    if (signal?.aborted) throw aborted();
    fail("DNS_FAILED", "无法解析 API 地址，请检查 Base URL 与网络。", 502);
  }
  if (
    !Array.isArray(addresses) ||
    !addresses.length ||
    addresses.some(
      (item) =>
        !isObject(item) ||
        !isPublicAddress(item.address) ||
        ![4, 6].includes(item.family) ||
        isIP(item.address) !== item.family,
    )
  ) {
    fail(
      "BLOCKED_ADDRESS",
      "API 地址不能指向内网、链路本地或保留网络；本机模型请明确填写 localhost 或 127.0.0.1。",
    );
  }
  // Pin this exact result into the socket, avoiding a second DNS lookup.
  return addresses[0];
}

export function requestProvider({ url, address, body, apiKey, signal }) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(aborted());
      return;
    }
    const encoded = JSON.stringify(body);
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Content-Length": Buffer.byteLength(encoded),
    };
    if (apiKey) headers.Authorization = "Bearer " + apiKey;
    const protocol = url.protocol === "https:" ? https : http;
    const request = protocol.request(
      url,
      {
        method: "POST",
        headers,
        signal,
        agent: false,
        lookup(_hostname, options, callback) {
          if (typeof options === "function") {
            callback = options;
            options = {};
          }
          if (options?.all) callback(null, [address]);
          else callback(null, address.address, address.family);
        },
      },
      (response) => {
        const status = response.statusCode ?? 502;
        // Never follow redirects or read/relay a provider's error body.
        if (status < 200 || status >= 300) {
          response.destroy();
          resolve({ status, text: "" });
          return;
        }
        const chunks = [];
        let length = 0;
        response.on("data", (chunk) => {
          length += chunk.length;
          if (length > AI_LIMITS.responseBytes) {
            response.destroy();
            reject(
              new AiError(
                502,
                "UPSTREAM_TOO_LARGE",
                "模型响应过大，请缩短输出后再试。",
              ),
            );
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () =>
          resolve({ status, text: Buffer.concat(chunks).toString("utf8") }),
        );
        response.on("error", reject);
      },
    );
    request.on("error", reject);
    request.end(encoded);
  });
}

function upstreamError(status) {
  if (status >= 300 && status < 400)
    return new AiError(
      502,
      "UPSTREAM_REDIRECT",
      "API 地址返回了重定向；为保护 Key，请填写最终 API 地址。",
    );
  if (status === 401 || status === 403)
    return new AiError(
      status,
      "UPSTREAM_AUTH",
      "API Key 无效或没有该模型权限，请检查服务商设置。",
    );
  if (status === 429)
    return new AiError(
      429,
      "UPSTREAM_LIMIT",
      "服务商额度或请求频率受限，请在服务商控制台检查后手动重试。",
    );
  if (status === 400 || status === 404 || status === 422)
    return new AiError(
      400,
      "UPSTREAM_CONFIG",
      "服务商不接受当前请求，请检查 API 地址、模型 ID、token 参数与 JSON 模式。",
    );
  return new AiError(
    502,
    "UPSTREAM_FAILED",
    "模型服务暂时不可用，请稍后手动重试。",
  );
}

export async function chatCompletion(
  input,
  { lookup = dnsLookup, transport = requestProvider, signal } = {},
) {
  const prepared = validateChatRequest(input);
  const address = await resolveTarget(prepared.url, { lookup, signal });
  if (signal?.aborted) throw aborted();
  let response;
  try {
    response = await abortable(
      Promise.resolve().then(() => transport({ ...prepared, address, signal })),
      signal,
    );
  } catch (error) {
    if (signal?.aborted) throw aborted();
    if (error instanceof AiError) throw error;
    fail("UPSTREAM_NETWORK", "无法连接模型服务，请检查网络与 API 地址。", 502);
  }
  if (!response || !Number.isInteger(response.status))
    fail("UPSTREAM_INVALID", "模型服务返回了无法识别的响应。", 502);
  if (response.status < 200 || response.status >= 300)
    throw upstreamError(response.status);
  if (
    typeof response.text !== "string" ||
    Buffer.byteLength(response.text) > AI_LIMITS.responseBytes
  ) {
    fail("UPSTREAM_TOO_LARGE", "模型响应过大或格式不正确。", 502);
  }
  let parsed;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    fail("UPSTREAM_INVALID", "模型服务没有返回有效 JSON。", 502);
  }
  const content = parsed?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim())
    fail(
      "UPSTREAM_EMPTY",
      "模型没有返回文字；请检查模型模式或适当增加输出上限。",
      502,
    );
  // No successful response field may echo the submitted credential.
  const redact = (value) =>
    prepared.apiKey ? value.split(prepared.apiKey).join("[已隐藏凭据]") : value;
  const result = {
    content: redact(content),
    model: redact(
      typeof parsed.model === "string" && parsed.model.length <= 200
        ? parsed.model
        : prepared.body.model,
    ),
  };
  if (isObject(parsed.usage)) {
    const usage = {};
    for (const key of ["prompt_tokens", "completion_tokens", "total_tokens"]) {
      if (Number.isSafeInteger(parsed.usage[key]) && parsed.usage[key] >= 0)
        usage[key] = parsed.usage[key];
    }
    if (Object.keys(usage).length) result.usage = usage;
  }
  return result;
}

function readJson(request, signal) {
  return new Promise((resolve, reject) => {
    if (
      !/^application\/json(?:\s*;|$)/i.test(
        request.headers["content-type"] ?? "",
      )
    ) {
      reject(
        new AiError(415, "JSON_REQUIRED", "请求需要使用 application/json。"),
      );
      return;
    }
    if (
      Number(request.headers["content-length"] ?? 0) > AI_LIMITS.requestBytes
    ) {
      reject(
        new AiError(
          413,
          "REQUEST_TOO_LARGE",
          "请求超过 128 KiB，请减少发送的文字。",
        ),
      );
      return;
    }
    const chunks = [];
    let length = 0;
    const cleanup = () => {
      request.removeListener("data", onData);
      request.removeListener("end", onEnd);
      request.removeListener("error", onError);
      signal.removeEventListener("abort", onAbort);
    };
    const finish = (error, value) => {
      cleanup();
      error ? reject(error) : resolve(value);
    };
    const onData = (chunk) => {
      length += chunk.length;
      if (length > AI_LIMITS.requestBytes)
        finish(
          new AiError(
            413,
            "REQUEST_TOO_LARGE",
            "请求超过 128 KiB，请减少发送的文字。",
          ),
        );
      else chunks.push(chunk);
    };
    const onEnd = () => {
      try {
        finish(null, JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        finish(new AiError(400, "INVALID_JSON", "请求不是有效的 JSON。"));
      }
    };
    const onError = () => finish(aborted());
    const onAbort = () => finish(aborted());
    request.on("data", onData);
    request.on("end", onEnd);
    request.on("error", onError);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export function sendJson(response, status, value) {
  if (response.destroyed || response.writableEnded) return;
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(value));
}

export function createAiChatHandler({
  lookup,
  transport,
  timeoutMs = AI_LIMITS.timeoutMs,
} = {}) {
  return async function handleAiChat(request, response) {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const onAborted = () => controller.abort();
    const onClose = () => {
      if (!response.writableEnded) controller.abort();
    };
    request.on("aborted", onAborted);
    response.on("close", onClose);
    try {
      const input = await readJson(request, controller.signal);
      const result = await chatCompletion(input, {
        lookup,
        transport,
        signal: controller.signal,
      });
      sendJson(response, 200, result);
    } catch (error) {
      const safe = timedOut
        ? new AiError(
            504,
            "UPSTREAM_TIMEOUT",
            "请求已超过 60 秒，已停止等待；可稍后手动重试。",
          )
        : error instanceof AiError
          ? error
          : new AiError(
              500,
              "PROXY_FAILED",
              "本机 AI 请求未完成，请检查设置后重试。",
            );
      sendJson(response, safe.status, { error: safe.message, code: safe.code });
    } finally {
      clearTimeout(timer);
      request.removeListener("aborted", onAborted);
      response.removeListener("close", onClose);
    }
  };
}
