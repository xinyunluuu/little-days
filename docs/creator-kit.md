# 可选素材工具包

Little Days 自带三套原创的 Agent Skills，用来设计主题、安排照片、准备贴纸。它们是可以交给外部 Agent 使用的创作说明，不是应用运行依赖。1.1 版另外提供内置的可选 AI 搭子：用户配置兼容 API 后，可在编辑器里获取改写、排版、配色与素材方案。普通写日记、放照片、移动素材与导出仍在本地完成，不需要账号或模型服务。

## 内置 AI 与这套 Skill 怎样配合

运行 `npm run dev` 启动页面和本机代理，在「AI 搭子」中配置 Base URL、模型和 Key 即可按需发送文字。Key 只在当前页面内存中保留，刷新后需重填。默认发送对话；勾选后才附上本页文字和布局，**不会发送照片像素或图层图片来源**。提案先预览，再由用户点击应用，并支持撤销。纯静态部署没有 Node 代理，只能使用编辑功能；详细说明见 [AI API](ai-api.md)。

内置素材模式提供文字方案与提示词，不生成图片。这三套可选 Skill 可以在外部 Agent 中继续处理主题、照片构图和明确授权的图片生成；它们不会被网页自动调用。把图片交给外部 Agent 或图像服务，与应用的文字 API 连接是两个独立流程，应分别确认处理范围。

## 三套工具分别做什么

| Skill | 适用任务 | 交付 |
| --- | --- | --- |
| [little-days-theme](../skills/little-days-theme/SKILL.md) | 从心情、配色或一个主题整理页面方向 | 配色、字体建议、留白与照片位置；可选主题提案 JSON |
| [little-days-photo-story](../skills/little-days-photo-story/SKILL.md) | 用指定照片与一段回忆安排拼贴 | 主次关系、摆放顺序和构图计划；保持原照片与人物身份 |
| [little-days-sticker-sheet](../skills/little-days-sticker-sheet/SKILL.md) | 规划一组原创素材；明确要求时调用可用生图工具 | 素材清单、可选独立透明 PNG、真实透明度与完成状态 |

只要主题、提示词或构图建议时，不自动生图。贴纸生成需要所用 Agent 已有合适的图像工具；工具不可用时，交付明确标为“未生成”的提示词和素材方案。没有自动安装模型 SDK、申请密钥或运行付费批处理的步骤。

## 安装

三个目录随本仓库提供，不会在打开网页时自动运行。可以把某个 Skill 的路径直接交给支持读取 Skill 文件的 Agent；如需 Codex 自动发现，在克隆的项目根目录运行以下可选命令。已有同名 Skill 会跳过，不覆盖：

```sh
ld_skill_dest="${CODEX_HOME:-$HOME/.codex}/skills"
mkdir -p "$ld_skill_dest" || exit 1
for ld_skill_name in little-days-theme little-days-photo-story little-days-sticker-sheet; do
  if [ -e "$ld_skill_dest/$ld_skill_name" ]; then
    printf '已存在，跳过：%s\n' "$ld_skill_name"
    continue
  fi
  cp -R "skills/$ld_skill_name" "$ld_skill_dest/$ld_skill_name" || exit 1
done
```

安装后在下一轮对话中使用；也可以只复制需要的一个目录。此命令只复制本仓库的说明文件，不联网、不调用模型。

## 示例

```text
用 $little-days-theme 给“雨后散步”做一个清爽的手帐主题，只要配色和布局建议，不生图。

用 $little-days-photo-story 帮我安排这四张照片。每张都要保留，照片不要重绘；先给本地拼贴方案。

用 $little-days-sticker-sheet 规划咖啡、树叶、票根三张贴纸，只给清单和提示词。

用 $little-days-sticker-sheet 生成这三张原创贴纸，每张单独透明 PNG。
不使用我的私人照片；请检查实际透明度，保留全部文件。
```

如果确实要把私人照片交给外部图像服务，先说明目的地、照片范围与用途，再取得用户明确授权。用户已经对同一批文件、同一目的地和用途授权时，不需要重复询问。单纯要求本地构图建议不代表同意外传。

## 与应用怎样衔接

1. 主题与照片计划先作为创作说明使用，在编辑器的 12 款模板中选一个起点，设置预设或自定义纸色，再调整标题、正文和照片。标题与正文可自由移动、修改宽高、字号和对齐，正文可调行高；正文最多 1200 字符，同一天可续写多页。
2. 生成或自行准备的 PNG、JPEG、WebP 可通过应用的本地图片上传入口导入，文件作为独立图片层参与编辑。PNG 默认作为无相框图片导入，透明区域保留；选中图片后可在面板里添加或去掉相框。透明贴纸使用 PNG；“一张素材页”整体导入后仍是一层，多个独立文件才是多个可移动层。无相框状态使用 `frame: false`，在保存、备份和导出时保留。
3. 用应用的 PNG 导出保存成品画面；它是扁平图片。要保留文字、元素、位置与照片，另外导出日记 JSON 备份。

外部 Skill 输出的主题提案或照片计划 JSON **不能作为日记备份导入**，也不会自动被内置 AI 提案面板读取。当前日记备份的封套是 `{ format: "little-days", version: 1, exportedAt, entries }`；画布为 720 × 900，元素字段、枚举与图片格式要通过完整校验。需要实现新的主题或数据转换时，先读 [本地数据与备份](storage.md) 和实际实现，不向浏览器数据库写入猜测字段。

应用导入仅接受 PNG/JPEG/WebP 图片内容，不接受外部图片 URL、SVG、HTML 或任意本地路径；项目内置示例图片另有明确白名单。完整导出行为见 [图片导出说明](export.md)。

## 隐私与生成边界

照片与日记默认存在当前浏览器、当前来源的 IndexedDB 中，应用不会自动发送它们。使用内置 AI 时，主动发送的对话和选择附带的文字、布局会交给指定服务商，照片不会发送。换浏览器、换网站地址或清理站点数据不会自动迁移资料，应保留 JSON 备份。

把照片主动交给 AI Agent 分析或生成，是应用之外的创作行为，受该 Agent 和所选服务的处理方式与隐私规则约束。本工具包不把“本地日记”误称为“所有 AI 分析也绝不出设备”。

Skill 不会自行比较模型、评测生成质量或启动付费实验。目前项目的 AI 验证使用 mock，没有真实模型调用或模型费用，不代表实际生成效果已获验证。用户主动发送真实 API 请求或调用外部生图时，费用取决于所选服务。任何 benchmark、ablation 或其他 API/token 实验仍须先按用户的 Experiment Safety Gate 形成可机读预检 manifest/diff，并确认比较配置支持科学问题。日常素材制作也不会伪装成已执行的实验结果。

## 来源与原创范围

三份 Skill 的指令、任务边界与交付约定由 Little Days 项目独立编写，随项目根目录 LICENSE 发布。

继承的是常见创作思想：有限配色、文字层级、照片与笔记配合、独立素材层、透明度检查。Little Days 的本地导入方式、JSON 提案与备份的区分、隐私同意边界和失败交付规则是本项目的具体工作约定。这些不是对第三方 Skill 的逐句改写，也没有复制它们的 canonical prompts、样图、脚本或私有风格包。

外部参考只提供链接：

- [Anthropic Frontend Design](https://github.com/anthropics/skills/tree/main/skills/frontend-design)：真实题材与有意图的页面设计。
- [GC Minimal Zine Poster](https://github.com/LiamGvchi/gc-minimal-zine-poster)：纸面、视觉焦点与变化方法。
- [Make Tape Collage](https://github.com/sherlyryn/make-tape-collage)：照片与素材分别处理的创作思路。
- 其他用户提供的手帐来源与各自许可见 [设计调研](design-research.md) 和 [来源清单](research-sources.json)。

外部仓库的许可各不相同；这里的链接不表示本项目拥有其素材，也不表示作者为 Little Days 背书。
