# easy-xml — 项目记忆 / Project Memory

> 本文件是本项目的全部记忆载体（铁则：所有记忆只用 `~/ClaudeWork/easy-xml` 文件夹）。
> This file is the project's memory store (rule: all memory lives only in this folder).

## 铁则 / Iron rules
- 所有记忆只保存在本文件夹内。All memory stays inside this folder.
- Git 版本管理，使用项目独立账户（非全局）。Per-project git account (not global):
  - `milky-sun` / `c21uhs016@gmail.com`
- 项目语言：中文 + 英文。Project language: Chinese + English.

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
- **保存**: localStorage 自动保存/自动加载；JSON 文件 Import/Export 用于备份迁移。`migrate()` 兼容旧数据。

## 数据结构 / Data model
```
project = { pages:[ { id, name, isHome, canvasW, canvasH,
  elements:[ {id,type,x,y,w,h,text,note,color,opacity,linkTo,ref} ],
  memos:[ {id,x,y,w,h,text} ] } ], activePageId, seq }
```
- 元素类型 element types: `rect` | `textfield` | `button` | `list` | `include`（`ref`=被嵌入页面 id）
- localStorage key: `easy-xml-project-v1`

## 待办 / TODO（候选）
- [ ] 元素层级排序 z-order
- [ ] 撤销/重做 undo/redo
- [ ] 更多控件（图片 / 开关 / 顶栏）more widgets
- [ ] 多选与对齐 multi-select & align
- [ ] 直接输出可粘贴的项目快照（HTML 内嵌）
