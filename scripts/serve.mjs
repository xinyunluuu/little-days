import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAiChatHandler, sendJson } from "./ai-proxy.mjs";

const defaultRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".md": "text/plain; charset=utf-8",
};

function localOrigin(request) {
  const port = request.socket.localPort;
  const host = request.headers.host?.toLowerCase();
  if (
    !new Set(["127.0.0.1:" + port, "localhost:" + port, "[::1]:" + port]).has(
      host,
    )
  )
    return null;
  return "http://" + host;
}

export function createAppServer({ root = defaultRoot, ai = {} } = {}) {
  const projectRoot = path.resolve(root);
  const handleAiChat = createAiChatHandler(ai);
  const server = http.createServer(async (request, response) => {
    const origin = localOrigin(request);
    if (!origin) {
      sendJson(response, 403, {
        error: "仅允许通过本机地址访问。",
        code: "INVALID_HOST",
      });
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, origin).pathname);
    } catch {
      sendJson(response, 400, {
        error: "地址格式不正确。",
        code: "INVALID_PATH",
      });
      return;
    }
    if (pathname === "/api/health" && request.method === "GET") {
      sendJson(response, 200, { ai: true });
      return;
    }
    if (pathname === "/api/ai/chat") {
      if (request.method !== "POST") {
        sendJson(response, 405, {
          error: "请使用 POST 请求。",
          code: "METHOD_NOT_ALLOWED",
        });
        return;
      }
      if (
        request.headers.origin !== origin ||
        request.headers["sec-fetch-site"] === "cross-site"
      ) {
        sendJson(response, 403, {
          error: "请从当前本机手帐页面发起 AI 请求。",
          code: "INVALID_ORIGIN",
        });
        return;
      }
      await handleAiChat(request, response);
      return;
    }
    if (pathname.startsWith("/api/")) {
      sendJson(response, 404, { error: "接口不存在。", code: "NOT_FOUND" });
      return;
    }
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405).end();
      return;
    }
    try {
      const file = path.resolve(
        projectRoot,
        "." + (pathname === "/" ? "/index.html" : pathname),
      );
      if (
        !file.startsWith(projectRoot + path.sep) ||
        pathname.split("/").some((part) => part.startsWith("."))
      ) {
        response.writeHead(403).end();
        return;
      }
      const actual = await fs.realpath(file);
      if (!actual.startsWith(projectRoot + path.sep)) {
        response.writeHead(403).end();
        return;
      }
      const bytes = await fs.readFile(actual);
      response.writeHead(200, {
        "Content-Type":
          types[path.extname(actual)] || "application/octet-stream",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(request.method === "HEAD" ? undefined : bytes);
    } catch {
      response
        .writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
        .end("Not found");
    }
  });
  server.headersTimeout = 15_000;
  server.requestTimeout = 65_000;
  return server;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const port = Number(process.env.PORT || 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT must be between 1 and 65535.");
  createAppServer().listen(port, "127.0.0.1", () =>
    console.log("Little Days · http://127.0.0.1:" + port),
  );
}
