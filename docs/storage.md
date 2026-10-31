# 本地数据与备份

日记保存在当前浏览器、当前网站来源的 IndexedDB 数据库 `little-days` 中，无账户、无上传、无远程数据库。换浏览器或更换网站地址不会自动迁移日记。清理网站数据、删除浏览器配置或隐私模式结束可能使数据消失，请定期导出 JSON 备份。

`saveEntries(entries)` 只有在 IndexedDB **整个事务提交成功后**才完成。写入失败、空间不足、权限不可用会抛出中文错误；不会把仅存在内存里的内容称为已保存。UI 负责防抖、展示待保存/已保存/失败状态和提醒用户在保存失败时导出备份。

`loadEntries()` 在未初始化时返回 `null`；有意清空后的资料库返回 `[]`。这一区分避免清空日记后重新出现演示内容。读取既有存储也会重新执行完整校验。

多窗口使用事务内版本比较防止覆盖：`loadEntries()` 在同一只读事务读取日记及 `revision`；`saveEntries()` 在同一读写事务读取并核对已观察的版本，然后同时写入日记及递增版本。其他窗口已提交时，陈旧写入会整体中止，并抛出 `error.code === 'STALE_WRITE'` 的中文错误。UI 应保留内存内容供备份，同时禁用编辑控件并提示刷新；不要自动重读后覆盖。广播只用于及时提示，不承担数据安全保证。

同一模块的读取和保存会按调用顺序排队，失败不会阻塞后续操作。缓存版本只在完整读取或写入提交成功后更新；提交失败不会消耗版本。旧库没有 `revision` 时视作 0，无需升级数据库或重建数据。应用启动时应先调用 `loadEntries()`；直接对一个未读取过的已有版本库执行 `saveEntries()` 会被拒绝。

## 备份 API

```js
import { loadEntries, saveEntries, createBackup, validateBackup } from './src/storage.js';

const entries = await loadEntries();
await saveEntries(entries ?? []);
const json = JSON.stringify(createBackup(entries ?? []));
const imported = validateBackup(JSON.parse(json));
await saveEntries(imported);
```

`createBackup` 生成 `{ format: 'little-days', version: 1, exportedAt, entries }`。`validateBackup` 仅接受此版本的封套，并返回新的、白名单字段组成的数组。它不修改入参、不执行写入。UI 应先验证整个文件，再确认替换或合并，最后一次性写入；任何一篇校验失败时，整次导入失败，不产生部分导入。

固定画布为 720 × 900。导入的有限数值尺寸限制在 16 至画布宽/高，位置保证至少 16 像素留在画布内，旋转限制为 -180° 至 180°。`NaN`、无穷大、字符串数值会被拒绝。

限制由导出的 `STORAGE_LIMITS` 定义：最多 5000 篇，每篇 120 个拼贴元素，标题 160 字符，正文 100000 字符，元素文字 8000 字符，单张图片 data URI 最多 12 MiB 字符。文字超限明确拒绝，不静默截断。UI 的文件读取前限制为 40 MiB（界面大文件提示阈值，不是导入拒绝上限）；此限制由 `STORAGE_LIMITS.importBytes` 提供，校验器不能代替读取前的文件大小检查。

只接受真实公历日期和 ISO UTC 时间戳。日记 ID 全库唯一，元素 ID 在本篇内唯一。心情、模板、纸色、元素类型、贴纸和滤镜均使用明确枚举。颜色仅接受十六进制 CSS 颜色。

日记可选 `paperColor` 使用严格的 `#RRGGBB` 六位十六进制格式，覆盖渲染时的纸张底色。原有 `paper` 四种枚举仍必需并保留，用于兼容与回退；旧记录不会被自动添加自定义颜色。

支持 12 种模板 ID：`salt`、`film`、`letter`、`zine`、`postcard`、`botanical`、`receipt`、`polaroid`、`gallery`、`midnight`、`candy`、`minimal`。

日记可选 `layout` 控制可拖动的标题和正文。旧日记未提供 `layout` 时保持原数据结构；提供时由 `normalizeTextLayout()` 补齐缺省字段并返回新对象。`DEFAULT_TEXT_LAYOUT` 导出以下默认布局：

```json
{
  "title": { "x": 54, "y": 145, "w": 612, "h": 96, "fontSize": 38, "align": "left" },
  "body": { "x": 54, "y": 625, "w": 612, "h": 190, "fontSize": 19, "lineHeight": 34, "align": "left" }
}
```

`x` 限制为 0–700、`y` 为 0–880、宽度为 40–680、高度为 30–800、字号为 12–64、正文行高为 16–90。位置还会进一步调整，确保整个文本框留在 720 × 900 纸面内。对齐只接受 `left`、`center`、`right`。标题行高由导出和编辑器统一使用字号的 1.25 倍，不保存独立行高。未知属性移除；非有限数值、非法对齐或原型属性使整个导入失败。布局合法不代表当前文字一定放得下，PNG 导出仍会明确检查溢出。

独立 `text` 元素可选 `fontSize`（12–64）与 `align`。旧元素缺省字段保持缺省，渲染采用 20px、左对齐和字号 1.5 倍的行高。显式设置会在备份、导入和本地保存中保留。

图片仅接受 PNG/JPEG/WebP 的 base64 data URI，并检查文件头与声明格式一致；另允许项目内两张固定示例图片 `./assets/sample-landscape.jpg` 和 `./assets/sample-coffee.jpg`。不允许外部图片 URL、SVG、HTML、`javascript:` 或任意本地路径。头部检查不是完整图片解码；UI 仍需处理无效或损坏图片的加载失败状态。

照片元素的可选布尔字段 `frame` 默认补齐为 `true`；设置为 `false` 时作为无相框图片显示，适合透明底贴纸素材。备份往返和本地存储均保留显式 `false`，不会将其当作缺省值覆盖。字符串 `"false"`、数值及 `null` 会被拒绝。

所有对象拒绝 `__proto__`、`prototype`、`constructor` 属性。未知字段不会带入输出。渲染层仍必须将日记文字作为文本处理，不使用 `innerHTML` 插入用户文字。

`readSettings()` / `saveSettings(object)` 使用独立 localStorage 键，仅接受最多 40 个简单值设置项（字符串、有限数值、布尔值、null），读写失败会明确报错。设置功能可选，不能替代日记数据库。

## 本地验证

运行 `node --test tests/storage.test.js`。测试只在本机运行，不调用任何模型或付费 API。单元测试覆盖完整导入校验、12 模板、自定义布局与文字字号备份往返、旧日记兼容、拒绝不安全图片与原型属性、日期与重复标识、几何边界、事务提交与失败、空库区别、同时打开两窗口的陈旧写入拒绝、同窗口并发调用顺序、失败后的重试及设置错误。事务测试使用事件驱动且串行事务的 IndexedDB 替身；实际浏览器行为还需通过应用端的保存、刷新和导入/导出验收确认。

浏览器验收应使用独立来源（例如测试用 `http://localhost:4174`），避免测试覆盖正在使用的手帐。先创建含透明 PNG、`frame: false` 的日记，保存后刷新，确认文字、图片和无相框状态保持；导出再导入后复查；再测试清空资料库后刷新仍为空。测试存储权限失败和空间不足时，界面必须显示未保存并仍允许导出当前内容。不要在用户的正式资料库执行清空或配额破坏测试。
