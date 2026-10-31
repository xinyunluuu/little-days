# Little Days：素材与设计研究

调研日期：2026-10-31（Asia/Shanghai）。原始可机读索引见 [research-sources.json](research-sources.json)。本轮只读 GitHub 元数据、README、Skill 和许可证，没有执行远程代码、图片生成、模型评测或 API 实验。

## 产品判断

建议把 Little Days 做成「随手写，也能拼得好看」的本地手帐：打开就是今天，一句话、一张照片、几个可移动的贴纸就能完成一页。可分享的成品画面负责吸引第一次使用，自动保存、日期索引、导入导出与离线可用负责长期价值。不要把图片生成 API、注册登录、订阅付费或复杂的 SaaS 仪表盘作为起点。

这不是“已经验证会火”的结论。GitHub 热度证明开发者关注，不能替代手帐用户研究；素材 Skill 的漂亮样图也不证明编辑器易用。

## 当前口味：证据和推断分开

Pinterest 于 2026-08-25 发布的官方报告提到手作、个人小刊、纸艺和植物观察；报告列出的搜索变化包括 digital zine design +433%、scrapbooking journaling +240%、dried and pressed flowers +457%、forest journal +91%。这是全球 Pinterest 平台信号，不是中国用户调查，也不是留存或传播效果证明；页面文本提取没有显示完整统计脚注。[Pinterest 官方报告](https://newsroom.pinterest.com/news/2026-pinterest-hobbies-trend-report/)

由此作出的产品推断：让用户收集自己的日常细节，提供纸张、胶带、植物、咖啡和票根等少量易组合材料；让保存的页面能直接作为个人作品导出。把“可编辑、能带走、无需登录”做清楚，比把每个时髦装饰都塞进一个页面更适合首版。中文阅读与移动端编辑仍需真实用户验证。

## 用户提供的素材库：已整理的准确入口

星数为当日 GitHub API 快照，变化后不自动刷新。表中的许可说明用于决定是否把第三方内容放进公开仓库；“未找到许可”不等于可以自由复制。

| 用户线索 | 准确仓库 / Skill 路径 | Stars | 许可核实 | 对本项目的用法 |
| --- | --- | ---: | --- | --- |
| salt journal materials | [carolinaaafy/salt-journal-materials](https://github.com/carolinaaafy/salt-journal-materials)，根 `SKILL.md` | 6 | 树中未找到许可证 | 学习小图像点题、素材尺度差与可裁切间距；不复制 prompt 或示例素材 |
| travel memory sticker card | [carolinaaafy/travel-memory-sticker-card](https://github.com/carolinaaafy/travel-memory-sticker-card)，根 Skill | 625 | 个人非商业，限制再分发与应用捆绑 | 仅来源链接；不能当成项目内置 Skill 包 |
| travel-memory-card-duo | [carolinaaafy/travel-memory-card-duo](https://github.com/carolinaaafy/travel-memory-card-duo)，根 Skill | 172 | 个人非商业，明确限制公开复制、派生与捆绑 | 学习区分整页作品与可编辑素材这一需求；本地 PNG 导入独立实现 |
| photo-abstract-editorial | [ZzzLc0405/photo-abstract-editorial](https://github.com/ZzzLc0405/photo-abstract-editorial)，根 Skill | 6,024 | 个人/教育/研究/非商业使用，商业需授权 | 只研究概括形体、保留识别锚点的方法；不内置作者 prompt/assets |
| make-tape-collage | [sherlyryn/make-tape-collage](https://github.com/sherlyryn/make-tape-collage)，根 Skill | 158 | MIT，已读 LICENSE | 可选创作者流程；原照片、生成图形、后期排版分开，避免照片被重绘 |
| gc-minimal-zine-poster | [LiamGvchi/gc-minimal-zine-poster](https://github.com/LiamGvchi/gc-minimal-zine-poster)，根 Skill；调用名 `gc-minimal-zine-poster-v0-3` | 7,445 | MIT，已读 LICENSE | 优先参考：单一视觉焦点、留白、少量字、一处清楚的色彩；保留多种布局变化 |
| photo-to-journal-stickers | [yvonnechen202608-byte/picture-design](https://github.com/yvonnechen202608-byte/picture-design/tree/main/photo-to-journal-stickers)，子目录 `photo-to-journal-stickers/` | 12¹ | 仓库与该子目录未见许可 | 原线索不是独立同名仓库；学习按记忆点挑素材、验证 PNG 真透明，不复制脚本 |
| photo-painting | [1499374741-arch/photo-painting](https://github.com/1499374741-arch/photo-painting/tree/main/photo-editorial-poster)，子目录 `photo-editorial-poster/` | 13 | 树中未找到许可证 | 照片与关联插画分区的思路；不照搬其 canonical prompt |
| gathered-screnes-zine-skill | 最可能为 [Zeejay0/gathered-scenes-zine-skill](https://github.com/Zeejay0/gathered-scenes-zine-skill)，`skills/scenes-gathered-zine-v1-3/` | 5,581 | 个人非商业；同条款分享，商业/付费/组织用途需授权 | “screnes”应为“scenes”；与 Scraply 是两个不同项目。仅链接与研究 |
| Scraply | [Mixiaxiaoyu/Scraply](https://github.com/Mixiaxiaoyu/Scraply)，根 Skill，调用名 `scraply` | 9 | 树中未找到许可证 | 参考照片与装饰的主题关系、左右页承担不同角色；首版做真正可编辑的画布 |

¹ 多 Skill 仓库总星数，不能视作该单个 Skill 的热度。以上作者的输出主要是位图作品或图片素材，不是本地手帐应用组件。

关键许可证原文：[Travel Card](https://github.com/carolinaaafy/travel-memory-sticker-card/blob/main/LICENSE)、[Card Duo](https://github.com/carolinaaafy/travel-memory-card-duo/blob/main/LICENSE.md)、[Photo Abstract](https://github.com/ZzzLc0405/photo-abstract-editorial/blob/main/LICENSE.md)、[Gathered Scenes](https://github.com/Zeejay0/gathered-scenes-zine-skill/blob/main/LICENSE)、[GC Zine](https://github.com/LiamGvchi/gc-minimal-zine-poster/blob/main/LICENSE)、[Tape Collage](https://github.com/sherlyryn/make-tape-collage/blob/main/LICENSE)。

## 设计类来源与热度

以下是当前仓库总星数，不能推断单个 Skill 的使用人数。名称不唯一的项目明确标为候选，没有把搜索结果自动当成用户原文的作者。

| 名称 | 核实来源 | Stars | 许可 / 适配判断 |
| --- | --- | ---: | --- |
| Frontend Design | [anthropics/skills · skills/frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | 185,549¹ | 该 Skill 的 LICENSE.txt 为 Apache-2.0；轻量纯文本。以真实题材决定布局，避免无用标签和通用落地页套路 |
| Huashu Design | [alchaincyf/huashu-design](https://github.com/alchaincyf/huashu-design) | 28,252 | MIT 元数据；当前 Skill 明说生产级 Web App 不适用，适合视觉方向与原型研究 |
| Build Web App | [openai/plugins · build-web-apps](https://github.com/openai/plugins/tree/main/plugins/build-web-apps) | 7,678¹ | 可能对应用户名称，未唯一确认；前端实现与浏览器测试工作流。整库许可不能替代子包核查 |
| Build Web App 的另一同名候选 | [saasroo/build-saas](https://github.com/saasroo/build-saas) | 8 | MIT 元数据；Firebase/Stripe SaaS 流程，超出本地日记需求 |
| Hallmark | [Nutlope/hallmark · skills/hallmark](https://github.com/Nutlope/hallmark/tree/main/skills/hallmark) | 43,264 | MIT 元数据；实际内容驱动版式、token 与视觉质量检查；含脚本与可选 Together AI 路径 |
| Open Design | [nexu-io/open-design](https://github.com/nexu-io/open-design) | 105,098 | Apache-2.0 元数据；是完整设计工作台，内含社区内容需单独核查条款 |
| UI/UX Pro Max | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 143,154 | MIT 元数据；本项目最有用的是焦点、键盘、触控与响应式检查 |
| Taste Skill | [Leonxlnx/taste-skill · skills/taste-skill](https://github.com/Leonxlnx/taste-skill/tree/main/skills/taste-skill) | 106,513 | MIT 元数据；区分工作型编辑器与阅读型网页，适合约束首版风格与多宽度视觉检查 |
| GSAP Skills | [greensock/gsap-skills](https://github.com/greensock/gsap-skills) | 17,605 | 官方库，Skill 为 MIT 元数据；简单面板动效无需为了热度增加运行时 |
| PencilPlaybook | [stevembarclay/pencilplaybook](https://github.com/stevembarclay/pencilplaybook) | 53 | MIT 元数据；Pencil 工具与设置依赖，不作为本应用必需环节 |
| design-md-chrome | [bergside/design-md-chrome](https://github.com/bergside/design-md-chrome) | 3,105 | MIT 元数据与 README；实际是 Chrome 扩展，负责提取设计特征，不必安装才能设计本项目 |
| Landing Page Generator | 候选 [uxjoseph/landing-page-generator](https://github.com/uxjoseph/landing-page-generator) | 44 | 名称不唯一；README 写 MIT 但 metadata 无许可证识别。该候选用 Gemini API 输出固定宽长图，不适合作为本地编辑器底座 |
| 补充：Impeccable | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | 97,451 | Apache-2.0 元数据；简化、审阅、边界状态与可访问性方法有价值；当前 launcher 可能下载二进制，不自动运行 |
| 补充：Web Interface Guidelines | [vercel-labs/agent-skills · web-design-guidelines](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | 33,277¹ | 可作为只读交互审阅来源；本轮未核实该子目录的完整分发许可证 |

¹ 多内容仓库总星数。仓库首页或 Skill 声称的研究数量、评测效果、质量提升均按作者自述处理，本轮没有复现或背书。

## 应用于本项目的原创设计决定

1. **编辑器即首页。** 日期、日记、照片、素材在同一工作面里，不先放一个宣传型 Hero 阻挡写作。
2. **纸的感觉服务编辑。** 低对比纸面纹理、有限胶带、清晰照片与柔和阴影；按钮、文字输入和焦点仍保持容易辨认。
3. **主题少而有区别。** 可以从清爽盐系、植物观察、旅途拼贴三条方向起步；每条统一配色、纸面、字重与素材，不让所有主题只是换背景色。
4. **原创素材和用户照片优先。** 不把没有分发许可的示例图片放进应用。支持用户上传已获得权利的透明 PNG，照片与装饰保留独立层。
5. **分享形成闭环。** 整页导出让用户展示自己的作品；原始日记与照片仍保存在本机，并提供可恢复的备份。
6. **降低持续使用负担。** 不制造打卡压力，不凭空添加“连续记录天数”的奖励逻辑；空白页、自动保存、删除确认和恢复路径都应清楚。

这些决定是项目作者的综合设计选择，不是任何单个第三方 Skill 的复刻，也不是由趋势数据直接证明的唯一方案。

## 安装建议与运行边界

建议只装少量互补来源，避免十套指令互相拉扯：

- **Frontend Design**：`anthropics/skills`，路径 `skills/frontend-design`。已核实此目录仅有 Skill 和 Apache-2.0 许可证，适合作为轻量审美基线。
- **GC Minimal Zine**：`LiamGvchi/gc-minimal-zine-poster`，路径 `.`，安装目录名 `gc-minimal-zine-poster-v0-3`。MIT；审阅时树中没有 scripts。用参考分析或 prompt-only 模式可不调用图片生成。
- **Taste**（可选）：`Leonxlnx/taste-skill`，路径 `skills/taste-skill`。Skill 的调用名为 `design-taste-frontend`；有本地 Node 22+ 和浏览器脚本，`assets.mjs` 会访问网络。安装不等于批准执行脚本或发起模型调用。

可复现的审核版本：GC 为 `ddb0d66b24a94f9c4fdd1f02835a836a2db3774e`；Taste 为 `12af471f627f866411b4bd785b19646d3672784c`。安装后仍以当次实际安装日志为准。若未来比较模型、主题或 Skill 的效果，必须先按用户的 Experiment Safety Gate 保存完整预检 manifest/diff，再决定是否花费 API tokens。
