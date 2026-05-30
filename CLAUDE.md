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
- **弹窗关闭 modal close**: ✕ 按钮在 `#toolbar` 之外，需单独绑定（`[data-act=closemodal]`）；另支持 Esc 与点击背景关闭。
- **保存**: localStorage 自动保存/自动加载；JSON 文件 Import/Export 用于备份迁移。
- **画布尺寸**: 360×720（近似 Android 屏）。

## 数据结构 / Data model
```
project = { pages:[ { id, name, isHome, elements:[ {id,type,x,y,w,h,text,note,color,opacity,linkTo} ], memos:[ {id,x,y,w,h,text} ] } ], activePageId, seq }
```
- 元素类型 element types: `rect` | `textfield` | `button` | `list`
- localStorage key: `easy-xml-project-v1`

## 待办 / TODO（候选）
- [ ] 元素层级排序 z-order
- [ ] 撤销/重做 undo/redo
- [ ] 更多控件（图片 / 开关 / 顶栏）more widgets
- [ ] 多选与对齐 multi-select & align
- [ ] 直接输出可粘贴的项目快照（HTML 内嵌）
