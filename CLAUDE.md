# easy-xml — 项目记忆 / Project Memory

> 本文件是本项目的全部记忆载体（铁则：所有记忆只用 `~/ClaudeWork/easy-xml` 文件夹）。
> This file is the project's memory store (rule: all memory lives only in this folder).

## 铁则 / Iron rules
- 所有记忆只保存在本文件夹内。All memory stays inside this folder.
- Git 版本管理，使用项目独立账户（非全局）。Per-project git account (not global):
  - `milky-sun` / `c21uhs016@gmail.com`
- 项目语言：中文 + 英文。Project language: Chinese + English.

## 工作习惯 / Working preferences
- **不要自动用浏览器打开 `index.html`**，用户会自己打开/刷新。Do NOT auto-run `open index.html`; the user opens it themselves.

## 目标 / Goal
为 Android UI 建模做一个轻量草图工具：快速绘制 + 写描述 → 输出可直接喂给 AI 的 Markdown。
A lightweight sketch tool for Android UI modeling: draw fast + add descriptions → output AI-ready Markdown.

## 设计决策 / Decisions
- **形态**: 单页 `index.html`，无构建，浏览器直接打开。Single self-contained HTML, no build.
- **渲染**: SVG。元素层 `#elLayer` / 备忘层 `#memoLayer`（可折叠）/ 选中层 `#overlay`。
- **输出**: Markdown 容器 + XML 风结构（呼应项目名 easy-xml）+ Vibe Memos + Links；用 `<!-- [HOME:] -->` `<!-- [PAGE:] -->` 注释标记。
- **元素注释 element note**: 每个元素可写 `note`，导出时作为紧邻该元素上方的 XML 注释行 `<!-- … -->`（AI 易读，且与元素强绑定）。区别于画面级的 Vibe Memo。
- **视图模式 view modes**: `mode = visual | code | preview`，由 `body.mode-*` class 控制可见性；废弃了原 Markdown 弹窗。
- **Code 视图**: 可编辑的 Markdown+XML，`buildMarkdown()` 生成、`parseMarkdown()` 解析回模型（双向）。"应用 Apply" 显式回写；解析失败则留在 code 模式并 toast 报错。
- **语法高亮 highlighter**: 自写 `highlightCode()`，透明 textarea 叠在高亮 `<pre>` 上。注释先用 `~~CMT{i}~~` 占位再还原。**注意**：不要用 `\x00`/控制字符当占位符——会让文件变成二进制、破坏 grep（曾踩坑）。
- **画面尺寸 canvas size**: 每页独立 `canvasW/canvasH`，预设见 `CANVAS_PRESETS`，与 `<screen width height>` 联动。
- **页面嵌套 include**: `include` 元素引用其他页面，画布上画 1 层缩放快照（`drawShapes` 的 `depth<1` 守卫，不递归）。`wouldRecurse()` 防环。
- **拍平 flatten**: `flattenInclude()` 把 include 按算好的坐标"复制粘贴"成普通元素（类似 group 粘贴）。一次性、不联动、用 visited 集防环——**绝对安全**，比实时递归嵌套稳。
- **复数选择 multi-select**: 状态 `selection = {kind, ids[]}`。Shift+点击切换、空白处拖拽框选（rubber-band，`band`）、⌘/Ctrl+A 全选。多选时拖动整体移动；缩放手柄仅单选。
- **编组 group**: 用共享 `groupId` 标记（**不做真正的嵌套树**，数组保持扁平）。点击组内任一元素即整组选中；⌘/Ctrl+G 编组、⌘/Ctrl+⇧+G 解组。导出时用 `<group>…</group>` 包裹，解析回来重新分配 groupId。对齐 `alignSelection()`。
- **保存**: localStorage 自动保存/自动加载；JSON 文件 Import/Export 用于备份迁移。`migrate()` 兼容旧数据。
- **小窗适配 small viewport**: 工具栏可折叠（`body.tb-collapsed` → 隐藏 `#toolbar`，显示细条 `#tbMini`，含 ☰ 展开 + 视图切换）。工具栏点击监听挂在 `document` 上，使折叠后的细条按钮也生效。
- **缩放 zoom**: `zoom` + `zoomFit`（默认自动适应）。`fitZoom()` 按 `#stage` 可用区域计算（上限 100%，不放大）。`applyZoom()` 只改 SVG width/height（viewBox 不变），故拖拽/落点的 `scale = rect.width/cw()` 自动跟随缩放，无需额外换算。右下角浮动 `#zoombar`：− / % 输入 / ＋ / 适应。`window resize` 时若 fit 则重算。

## 数据结构 / Data model
```
project = { pages:[ { id, name, isHome, canvasW, canvasH,
  elements:[ {id,type,x,y,w,h,text,textPos,note,color,opacity,linkTo,ref,groupId} ],
  memos:[ {id,x,y,w,h,text} ] } ], activePageId, seq }
```
- 元素类型 element types: `rect` | `textfield` | `button` | `list` | `include`（`ref`=被嵌入页面 id）
- `groupId`：同值 = 同组（扁平标记，非嵌套）。
- `textPos`：文本在框内的 9 宫格位置（tl/tc/tr/ml/mc/mr/bl/bc/br），见 `textXY()`/`TEXT_DEFAULT_POS`；rect/textfield/button 都渲染文本。双击元素可内联编辑文本（`editTextInline`）。导出属性 `textpos`。
- localStorage key: `easy-xml-project-v1`

## 待办 / TODO（候选）
- [ ] 元素层级排序 z-order
- [ ] 撤销/重做 undo/redo
- [ ] 更多控件（图片 / 开关 / 顶栏）more widgets
- [ ] 直接输出可粘贴的项目快照（HTML 内嵌）
