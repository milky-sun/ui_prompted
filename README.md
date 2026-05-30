# easy-xml

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

- **绘制 Draw**: 矩形框 Frame / 输入框 Textfield / 按钮 Button / 列表 List
  从工具栏拖拽到画布。Drag from the toolbar onto the canvas.
- **样式 Style**: 颜色 + 透明度 / color + opacity.
- **💭 Vibe Memo**: 给 AI 的自由描述，存在独立 SVG 图层，可折叠。
  Free-text notes for the AI, kept on a separate, foldable SVG layer.
- **🔗 Link**: 把元素链接到其他页面，预览模式可点击跳转。
  Link an element to another page; click to jump in Preview mode.
- **页面 Pages**: 左侧纵向页面列表，支持入口页 (Home)。
  Vertical page list on the left, with a Home entry page.
- **保存 Persistence**: 自动保存到 localStorage（刷新不丢）。
  Auto-saved to localStorage (survives reload).
- **导入/导出 Import/Export**: 整个项目以 JSON 文件备份/迁移。
  Back up / move the whole project as a JSON file.
- **⤴ Markdown**: 导出 AI prompt（XML 风结构 + Vibe Memos + Links）。
  Export an AI prompt (XML-flavored structure + memos + links).

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
