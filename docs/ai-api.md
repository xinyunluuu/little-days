# 可选 AI API：本机代理

Little Days 的写作与拼贴仍可完全离线使用。打开 AI 功能后，浏览器把用户主动发送的文字交给本机 Node 服务，再由本机服务请求用户选定的兼容 API。这里没有托管代理、预置共享 Key 或模型账号。

用 `npm start` 启动即可同时运行静态页面与本机代理。直接部署到 GitHub Pages 或其他纯静态托管时，编辑器仍可使用，但不会凭空获得这个 Node API。服务器提供 `GET /api/health`，返回 `{ "ai": true }`，可供手动检查；界面不会为了测试连接而自动请求模型。

## 连接设置

| 服务 | Base URL 示例 | 模型与 token 参数 |
| --- | --- | --- |
| DeepSeek 官方 | `https://api.deepseek.com` 或 `https://api.deepseek.com/v1` | 当前官方文档列出 `deepseek-flash`；使用 `max_tokens` |
| OpenAI | `https://api.openai.com/v1` | 用户填写自己账号可用的模型 ID；使用 `max_completion_tokens` |
| 本机兼容服务，例如 Ollama | `http://127.0.0.1:11434/v1` | 用户填写本机实际安装的模型；无鉴权服务可留空 Key |
| 自定义兼容服务 | 服务商给出的 HTTPS Base URL | 自行填写模型 ID、对应 token 参数和 Key |

模型名称、账号权限和服务商参数支持可能变化。不会因 Key 或模型无效自动改用另一家服务，也不会自动列举模型、测试连接或重试。Base URL 可以包含已有的 `/chat/completions`，服务器不会重复追加。

DeepSeek 当前接口接受 `max_tokens`，JSON 模式使用 `response_format: { "type": "json_object" }`。其当前默认思考模式可能先消耗推理 token，因此设置过低的输出上限可能没有可见正文；本项目没有暗中改写思考参数。[DeepSeek 官方接口](https://api-docs.deepseek.com/api/create-chat-completion/)

OpenAI Chat Completions 将 `max_completion_tokens` 用于生成总量上限，包括可见内容和推理 token；具体参数是否支持取决于模型。JSON 模式仍需在消息里明确要求 JSON，也不替代应用对结果字段的校验。[OpenAI 官方接口](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)

上述文档于 2026-10-31 查阅。这里使用 Chat Completions 是为了兼容用户自选服务；不声称支持各家的全部 API 能力。

## 请求与响应

`POST /api/ai/chat`，请求为 `application/json`：

```json
{
  "baseUrl": "https://api.deepseek.com",
  "apiKey": "<用户本次提供的 Key>",
  "model": "deepseek-flash",
  "messages": [
    { "role": "system", "content": "帮助用户整理回忆，严格依据用户提供的事实。" },
    { "role": "user", "content": "今天散步时看到了雨后的树叶，想写一段很短的日记。" }
  ],
  "maxTokens": 2048,
  "jsonMode": false,
  "tokenParameter": "max_tokens"
}
```

只有上面的字段可用。消息角色接受 `system`、`developer`、`user` 和 `assistant`，具体服务商可能不支持其中某种角色。每条消息只能含 `role` 与纯字符串 `content`。当前不接受图片、附件、工具调用或流式输出，不发送日记里的图片数据、相册路径或图层 `src`。

`maxTokens` 默认 2048，范围 256–8192；`tokenParameter` 默认 `max_tokens`。只会发送选定的一个 token 参数。启用 `jsonMode` 时增加 `response_format`，消息仍需明确要求所需 JSON 格式。

成功响应只含：

```json
{
  "content": "模型返回的文字",
  "model": "服务商返回的模型 ID",
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 50,
    "total_tokens": 150
  }
}
```

此响应是结构示例，不是真实调用结果。服务商未提供有效用量时不返回 `usage`。只有三个非负整数用量字段可通过；其他上游元数据被丢弃。模型结果必须先按应用自己的方案结构校验并展示预览，不能直接执行其中的脚本、HTML 或修改指令。

失败返回 `{ "error": "可读说明", "code": "稳定错误码" }`。认证、额度、配置、重定向、超时与响应格式错误分别提示；不返回服务商原始错误体或服务器堆栈。

## Key 与文字会去哪里

Key 由前端在当前页面内存中持有，每次需要请求时交给本机代理。代理只在这次请求内构造 Authorization Header，不写配置文件、localStorage、IndexedDB、日志或响应，不读取环境中的备用 Key。

用户选择的远程服务会收到这次发送的文字以及相应 API Key。自定义服务的地址由用户决定，因此应确认地址属于预期服务商。普通本地编辑不会发送数据；点击 AI 发送属于单独的联网操作，使用和费用遵循所选服务商的账号规则。当前功能不处理图像上传。

关闭浏览器中的等待会取消本机请求并销毁活动上游连接；这不能保证服务商尚未生成内容，也不能撤回已经传输的文字或保证不计费。超时与失败都不会自动重试。

## 网络与输入边界

- 默认只监听 `127.0.0.1`。允许的 Host 是当前端口上的 `127.0.0.1`、`localhost` 或 `[::1]`；AI POST 的 Origin 必须与访问该页面的本机来源完全一致，不开启跨域访问。
- 远程服务必须使用 HTTPS。HTTP 只允许用户明确填写的 loopback 主机；普通域名即使解析为 loopback，也不会获得这个例外。
- 远程域名的所有解析结果必须可接受。私网、链路本地、映射 IPv6 和特定保留网络被拒绝；实际连接固定使用审核过的 IP，TLS 校验仍面向原服务商主机，避免再次解析带来的地址变动。
- 不跟随重定向，防止 Key 被转发到另一个地址。Base URL 不接受嵌入账号、密码、查询参数或片段。
- 请求体最多 128 KiB；最多 40 条消息，每条 32,000 字符，总量 64,000 字符。Key 最多 4096 个可打印非空白 ASCII 字符，模型 ID 最多 200 字符。
- 单次操作最多等待 60 秒，上游响应最多 1 MiB。服务商错误体直接丢弃，成功响应中如出现所提交 Key 的原文也会被替换。
- 导出的 `createAppServer()` 不自动监听端口。只有直接运行 `scripts/serve.mjs` 才会启动服务，便于测试使用随机本机端口。

这些约束为个人本机使用而设。本服务不是对公网开放的多用户网关，也没有账号、计费、共享密钥库或多租户限流。

## 本地验证记录

运行：

```sh
node --test tests/ai-proxy.test.js
```

测试通过依赖注入模拟 DNS 与上游响应；实际 HTTP 只在测试创建的 loopback 服务器之间通信。原生 HTTPS transport 的 DNS 固定与重定向行为也由内存中的 mock 验证，没有对外连接。验证覆盖输入限制、同源/Host、私网解析、凭据回显、用量白名单、错误脱敏、超时、断连和静态文件保护。

2026-10-31，本机运行 12 项测试全部通过。测试环境首次运行因沙箱禁止监听本机端口失败，开放本机端口执行权限后重跑通过；这不是模型质量评测，也没有使用真实 Key。

可机读执行记录：

```json
{
  "kind": "local-deterministic-software-validation",
  "date": "2026-10-31",
  "testFile": "tests/ai-proxy.test.js",
  "model": "fixture-model",
  "realCredentials": false,
  "externalDnsCalls": 0,
  "externalHttpCalls": 0,
  "modelApiCalls": 0,
  "modelTokensConsumed": 0,
  "imageGenerationCalls": 0,
  "transport": "injected fixtures and mocked native HTTPS request",
  "network": "ephemeral loopback HTTP only",
  "testResult": { "passed": 12, "failed": 0 },
  "benchmarkOrQualityClaim": false
}
```

没有实测远程模型的质量、延迟、可用性或费用。未来如果发起模型对比、benchmark 或其他 API/token 实验，仍须先按用户的 Experiment Safety Gate 保存完整预检 manifest/diff；本地 mock 测试结果不能代替那一步。
