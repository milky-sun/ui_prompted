# easy-xml — 项目记忆 / Project Memory

> 本文件是本项目的全部记忆载体（铁则：所有记忆只用 `~/ClaudeWork/ui_prompted` 文件夹，且全部纳入 git 管理）。
> This file is the project's memory store (rule: all memory lives only in this folder, and is all under git version control).

## 铁则 / Iron rules
- 所有记忆只保存在本文件夹内，并全部纳入 git 管理。All memory stays inside this folder and is fully tracked by git.
- **零依赖优先。Dependency policy:** 1) 能自写就自写；2) 必须用 OSS 时**贴入并固定版本**（vendoring，注明出处/版本/许可证）；3) **不运行时引用 CDN/动态加载**（破坏离线、CDN 故障、版本漂移、需 SRI）。保持"单文件·离线·永久可用"。
- Git 版本管理，使用项目独立账户（非全局）。Per-project git account (not global):
  - `milky-sun` / `c21uhs016@gmail.com`
  - **必须用 `milky-sun` 账号推送，禁止使用 `gh` CLI**（gh 会用全局/默认登录账号，会推错账号）。
    **Always push as `milky-sun`; the `gh` CLI is FORBIDDEN** (it uses the global/default login → wrong account).
  - Remote（SSH 别名，确保用对私钥）：`origin = git@github_milky_sun:milky-sun/ui_prompted.git`
    → 浏览器 / browser: https://github.com/milky-sun/ui_prompted
    （`~/.ssh/config` 里 `Host github_milky_sun` → `IdentityFile ~/.ssh/github_milky_sun`；切勿改回素 `github.com`，否则会选错鍵。）
- 项目语言：代码注释可中英；但 **UI 显示一律英文（不出现中文）**。
  Project language: comments may be CN+EN, but **the UI is English-only** (decided 2026-05-30, supersedes the old "CN+EN UI" rule).

## 工作习惯 / Working preferences
- **不要自动用浏览器打开 `index.html`**，用户会自己打开/刷新。Do NOT auto-run `open index.html`; the user opens it themselves.
- **UI 文案只用英文**。新增按钮/标签/toast/prompt 等界面文字一律英文，不要再写中文。
  All NEW user-facing UI text (buttons, labels, toasts, prompts) must be English only.
- **commit message 不要写 `Co-Authored-By`**（也不要任何 AI 署名）。No `Co-Authored-By` / AI sign-off lines in commit messages.
- **记录（CLAUDE.md / commit）只写本项目，不提及任何其他项目/账号/路径。**
  Records (CLAUDE.md / commits) describe THIS project only — never reference other projects, accounts, or paths.

## 目标 / Goal
为 Android UI 建模做一个轻量草图工具：快速绘制 + 写描述 → 输出可直接喂给 AI 的 Markdown。
A lightweight sketch tool for Android UI modeling: draw fast + add descriptions → output AI-ready Markdown.

## 设计决策 / Decisions
- **形态**: 单页 `index.html`，无构建，浏览器直接打开。Single self-contained HTML, no build.
- **渲染**: SVG。元素层 `#elLayer` / 备忘层 `#memoLayer`（可折叠）/ 选中层 `#overlay`。
- **输出**: Markdown 容器 + XML 风结构（呼应项目名 easy-xml）+ Vibe Memos + Links。
- **格式分工**: **JSON = 正本**（save/load/Import/Export，无损、`JSON.parse` 即可、最稳）；**Markdown = 面向 AI 的输出**（Code 视图仍可双向编辑，靠 `## 标题`+`home="true"` 解析，不依赖控制注释）。
- **已删除控制注释**: `<!-- [PAGE:] -->`（解析器从不使用）、`<!-- [HOME:] -->`（与 `home="true"` 重复）。`target` 与入口改为**可读平文行**：`> Target: X` 和 `> Entry point (first screen shown on app launch): \`Name\``，解析器从这两行读取（兼容旧的 `[TARGET:]/[HOME:]`）。
- **入口表达 entry point**: 入口页标题为 `## Name (entry point)`，screen 保留 `home="true"`，顶部平文句明确"启动时首屏"，避免被当成"首页 tab"。
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
- **撤销/重做 undo/redo**: `undoStack`/`redoStack` 存 `JSON.stringify(project)` 快照（上限 100）。`snapshot()` 在每个改动**之前**调用：离散动作内直接调；连续手势（拖拽/缩放）在 `pointermove` 首次移动时 `drag.snapped` 守卫调一次；属性输入用 `#props` 的 `focusin` 调一次；方向键微移 `!e.repeat` 时调。`restoreState()` 复原后 `migrate()`+健全化 activePageId+`clearSel`+`render`。
- **复制/粘贴/复制副本**: `clipboard`（元素深拷贝），`cloneInto()` 重映射 groupId 为新 ID（保留粘贴内的编组）、偏移 +14、选中新元素。`copySel/pasteSel/duplicateSel`。
- **z-order**: `reorder(front|back|forward|backward)` 直接重排 `page.elements`（数组序=绘制序）。无图层面板（用户要求），分组为主要组织手段。
- **吸附 snap**: `snapGrid`(默认开)+`GRID=8`。`smartSnap()` 把选区外框吸附到其他元素的边/中心和画布 0/中/满；命中画 `drawGuide()` 粉色参考线（`pointerup` 随 overlay 清除）；未命中则网格取整。缩放仅网格取整。工具栏 `data-act="snap"` 切换。
- **快捷键（Mac/Win 双支持，`metaKey||ctrlKey`）**: Undo `Z`／Redo `⇧Z`·`Y`／Copy `C`／Paste `V`／Duplicate `D`／全选 `A`／编组 `G`·解组 `⇧G`／层级 `]`前 `[`后（`⇧`=置顶/置底）／方向键 1px·`⇧`+方向键 10px／Delete。**仅在 visual 模式且非输入聚焦时生效**（code 模式交给浏览器原生）。
- **页面菜单 page menu**: PAGES 的 `⋯` 改用非阻塞弹出菜单 `openPopmenu()`（Rename/Duplicate/Set as Home/Delete），不再用 `prompt/confirm`。Rename 为列表内联输入（`renamingPageId`）；Delete 直接删（有 Undo，提示 ⌘/Ctrl+Z）。Duplicate 见 `duplicatePage()`（深拷贝+重映射 id/groupId）。**命名用复制时刻短 hash** `Name (xxxx)`（base36 末4位），并去掉旧的 `(hash)` 避免叠加——解决"多次复制都叫 X copy"的重名（Markdown 链接按页名解析，需唯一名）。**今后避免用 alert/prompt/confirm 打断用户**，优先弹出菜单/内联编辑。
- **右键菜单 context menu**: 画布右键元素 → `openPopmenu()`（Copy/Duplicate/Paste/置顶/置底/Delete），复用同一弹出菜单。
- **性能 perf**: 拖拽重绘用 `scheduleCanvas()`（requestAnimationFrame 每帧合并一次）；`save()` 防抖 300ms（`saveNow()` 立即落盘，`beforeunload` flush）。**保持轻量，避免大改/卡顿**。
- **界面偏好 prefs**: `snapGrid/zoom/zoomFit/memoVisible/折叠状态` 存 `PREFS_KEY="easy-xml-prefs-v1"`（与项目 JSON 分开），`savePrefs/loadPrefs`，启动时应用。
- **空画布提示**: 无元素无 memo 时画 "Drag an element here"（overlay 文本）。
- **小窗适配 small viewport**: 工具栏可折叠（`body.tb-collapsed` → 隐藏 `#toolbar`，显示细条 `#tbMini`，含 ☰ 展开 + 视图切换）。工具栏点击监听挂在 `document` 上，使折叠后的细条按钮也生效。
- **缩放 zoom**: `zoom` + `zoomFit`（默认自动适应）。`fitZoom()` 按 `#stage` 可用区域计算（上限 100%，不放大）。`applyZoom()` 只改 SVG width/height（viewBox 不变），故拖拽/落点的 `scale = rect.width/cw()` 自动跟随缩放，无需额外换算。右下角浮动 `#zoombar`：− / % 输入 / ＋ / 适应。`window resize` 时若 fit 则重算。

## 数据结构 / Data model
```
project = { pages:[ { id, name, isHome, canvasW, canvasH,
  elements:[ {id,type,x,y,w,h,text,textPos,note,color,opacity,linkTo,ref,groupId} ],
  memos:[ {id,x,y,w,h,text} ] } ], activePageId, seq }
```
- 元素类型 element types（**通用命名**，非 Material 专有，适用于 Web/iOS/Desktop）:
  `text` | `rect`(Frame) | `image` | `icon` | `button` | `textfield` | `toggle` | `divider` |
  `card` | `list` | `topbar` | `bottombar` | `fab` | `include`（`ref`=被嵌入页面 id）
- `project.target`：目标平台（Android/iOS/Web/Desktop/...），导出为 `<!-- [TARGET: …] -->`，仅作为给 AI 的上下文提示，元素词汇保持中立。
- 结构性元素（topbar/bottombar/divider/fab）在 `addElement` 里自动吸附位置。`DEFAULTS[type].color` 可指定前景色（text/icon/fab 等）。
- Markdown 顶部不再写"实现 Android UI"那两句套话（用户要求去掉）。
- `groupId`：同值 = 同组（扁平标记，非嵌套）。
- `textPos`：文本在框内的 9 宫格位置（tl/tc/tr/ml/mc/mr/bl/bc/br），见 `textXY()`/`TEXT_DEFAULT_POS`；rect/textfield/button 都渲染文本。双击元素可内联编辑文本（`editTextInline`）。导出属性 `textpos`。
- localStorage key: `easy-xml-project-v1`

## 待办 / TODO（候选）
- [ ] 元素层级排序 z-order
- [ ] 撤销/重做 undo/redo
- [ ] 更多控件（图片 / 开关 / 顶栏）more widgets
- [ ] 直接输出可粘贴的项目快照（HTML 内嵌）
