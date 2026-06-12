# ui_prompted

> Android UI 草图工具 / Android UI sketch tool
> 快速绘制界面 → 输出可直接喂给 AI 的 Markdown。
> Sketch a UI fast → export Markdown you can paste straight into an AI prompt.

## 用法 / Usage

直接在浏览器中打开 `index.html`。无需安装、无需构建。
Just open `index.html` in a browser. No install, no build step.

```
open index.html
```

## 功能 / Features

- **三种视图 Three views**: 🎨 设计 Visual / { } 代码 Code / ▶ 预览 Preview，工具栏一键切换。
  Switch between visual editing, an editable Markdown+XML code editor, and an interactive preview.
- **绘制 Draw（通用控件 / generic, not Material-specific）**:
  基础 Basic — Text / Frame / Image / Icon / Button / Textfield / Toggle / Divider；
  组件 Components — Card / List / Top Bar / Bottom Bar / FAB / Include。
  从工具栏拖拽到画布。Drag from the toolbar onto the canvas. 元素词汇中立，可用于 Android / iOS / Web / Desktop。
- **🎯 目标平台 Target**: 选择 Android/iOS/Web/Desktop，作为提示写进导出的 Markdown（`<!-- [TARGET: …] -->`）。
  Pick a target platform; it's written into the exported Markdown as a hint for the AI.
- **样式 Style**: 颜色 + 透明度 / color + opacity.
- **📝 元素注释 Element note**: 每个元素可写说明，导出为该元素上方的 XML 注释行（AI 易读）。
  Per-element description, exported as an XML comment line above the element.
- **💭 Vibe Memo**: 给 AI 的自由描述，存在独立 SVG 图层，可折叠。
  Free-text notes for the AI, kept on a separate, foldable SVG layer.
- **🔗 Link**: 把元素链接到其他页面，预览模式可点击跳转。
  Link an element to another page; click to jump in Preview mode.
- **📦 嵌入 Include / 🧩 拍平 Flatten**: 把一整页作为元素嵌入（显示缩放快照），或"拍平"成算好坐标的普通元素副本。
  Embed a whole page as an element (scaled snapshot), or flatten it into copied primitives with computed coordinates.
- **复数选择 + 编组 Multi-select + Group**: Shift+点击 / 空白处框选多选；⌘/Ctrl+A 全选；⌘/Ctrl+G 编组、⌘/Ctrl+⇧+G 解组；可一键对齐 / 分布。组在导出里用 `<group>` 包裹。
  Shift-click or rubber-band to multi-select; ⌘/Ctrl+A select all; ⌘/Ctrl+G group, ⌘/Ctrl+⇧+G ungroup; one-click align / distribute. Groups export as `<group>` wrappers.
- **编辑基础 Editing essentials（Mac/Win 双支持）**:
  撤销/重做 Undo/Redo（⌘/Ctrl+Z, ⇧Z 或 Ctrl+Y）；复制/粘贴/副本 Copy/Paste/Duplicate（⌘/Ctrl+C/V/D）；
  方向键微移 1px、⇧+方向键 10px；层级 z-order（⌘/Ctrl+]/[，⇧ 置顶/置底，或属性面板按钮）。
- **吸附 Snap**: 网格吸附 + 智能参考线（拖动时对齐其他元素的边/中心和画布中线），工具栏可开关。
  Grid snapping + smart guides (align to other elements' edges/centers and canvas midlines) while dragging; toggle in the toolbar.
- **画面尺寸 Canvas size**: 每页可选预设或自由设定宽高。
  Per-page preset or custom width/height.
- **小窗适配 Small viewport**: 工具栏可折叠（☰ 展开），画布自动缩放适应窗口，右下角可输入缩放百分比。
  Collapsible toolbar (☰ to expand); the canvas auto-fits the window, with a zoom % box at the bottom-right.
- **页面 Pages**: 左侧纵向页面列表，支持入口页 (Home)。
  Vertical page list on the left, with a Home entry page.
- **保存 Persistence**: 自动保存到 localStorage（刷新不丢）。
  Auto-saved to localStorage (survives reload).
- **导入/导出 Import/Export**: 整个项目以 JSON 文件备份/迁移；Code 视图可复制/下载 `.md`。
  Back up / move the whole project as JSON; copy or download `.md` from the Code view.
- **代码即编辑器 Code = editor**: Markdown+XML 双向可编辑，"应用 Apply" 解析回设计，带语法高亮。
  The Markdown+XML is editable two-way; "Apply" parses it back into the design, with syntax highlighting.

## 输出格式 / Output format

Markdown 容器 + XML 风的界面结构，配合注释标记：
Markdown container + XML-flavored UI structure with comment markers:

```markdown
<!-- [HOME: Home] -->

## Home (Home)

​```xml
<screen name="Home" home="true" width="360" height="720">
  <button x="40" y="600" w="280" h="46" color="#5b9dff" opacity="1" text="Login" link="Dashboard"/>
</screen>
​```

### 💭 Vibe Memos
- `@(40,80)` make the header feel calm and modern

### 🔗 Links
- **button** "Login" → **Dashboard**
```

## License

milky-sun (c21uhs016@gmail.com)
