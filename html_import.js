"use strict";
// ====================================================================
// html_import.js — 读取现有 HTML/CSS → 拍平成草图元素
// Import existing HTML/CSS, flatten the rendered layout into sketch elements.
//
// 思想 / Philosophy（与 flattenInclude 相同的"一次性转换、安全第一"）:
//   - One-shot conversion: imported elements are plain editable elements.
//   - Flattened on purpose: scripts are ALWAYS stripped (dynamic parts become
//     whatever is statically in the markup), images become placeholder boxes
//     (src removed — only the box is measured), iframes become a linked box
//     plus a separate page (1 level deep only).
//   - Zero dependencies: DOMParser + hidden iframe + getComputedStyle only.
//
// 公开 API / Public API (project-independent — caller assigns real ids):
//   HtmlImport.importHtmlFiles(fileList, { canvasW, maxElements?, htmlFile? })
//     → Promise<{ pages: [{ key, name, elements, suggestedW, suggestedH }],
//                 title, warnings, stats }>
//   elements carry NO id/groupId — instead an import-local `groupKey`, and
//   iframe placeholder rects carry `linkToPage` = `key` of the sub-page
//   (a stable key, NOT the display name — names may collide).
// ====================================================================
(function () {

  const MAX_CANVAS = 4000;      // matches applyCanvasSize clamp / 与画布上限一致
  const MAX_DEPTH = 12;
  const TRUNCATE_DEFAULT = 300;

  // ------------------------------------------------------------------
  // Bundle resolution / 文件束解析（相对路径 → 选中的文件）
  // ------------------------------------------------------------------
  function normPath(p) { return String(p || "").replace(/\\/g, "/").replace(/^\.\//, ""); }

  function buildFileMap(files) {
    const map = new Map();   // normalized lowercase path → File
    for (const f of files) {
      const rel = normPath(f.webkitRelativePath || f.name).toLowerCase();
      map.set(rel, f);
      const base = rel.split("/").pop();
      if (!map.has(base)) map.set(base, f);
    }
    return map;
  }

  // exact path → suffix match (fewest extra segments wins) → basename
  // 先精确路径，再后缀匹配（多余前缀最短者优先，避免吸到别目录同名文件），最后按文件名
  function resolveRef(ref, fileMap) {
    if (!ref || /^(https?:|data:|blob:|javascript:|#|mailto:)/i.test(ref)) return null;
    let p = normPath(String(ref).split(/[?#]/)[0]).toLowerCase();
    while (p.startsWith("../")) p = p.slice(3);
    if (p.startsWith("/")) p = p.slice(1);
    if (!p) return null;
    if (fileMap.has(p)) return fileMap.get(p);
    let best = null, bestLen = Infinity;
    for (const [k, f] of fileMap) {
      if (k.endsWith("/" + p) && k.length < bestLen) { best = f; bestLen = k.length; }
    }
    if (best) return best;
    return fileMap.get(p.split("/").pop()) || null;
  }

  function readText(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = () => rej(r.error || new Error("read failed"));
      r.readAsText(file);
    });
  }

  // resolve @import one extra level / @import 只递归一层
  async function inlineCss(cssText, fileMap, depth, warnings) {
    if (depth > 1) return cssText;
    const re = /@import\s+(?:url\(\s*)?["']?([^"')\s]+)["']?\s*\)?[^;]*;/g;
    const jobs = [];
    let m;
    while ((m = re.exec(cssText))) jobs.push([m[0], m[1]]);
    let out = cssText;
    for (const [stmt, ref] of jobs) {
      const f = resolveRef(ref, fileMap);
      if (f) out = out.replace(stmt, await inlineCss(await readText(f), fileMap, depth + 1, warnings));
      else { out = out.replace(stmt, ""); warnings.push("Missing CSS import: " + ref); }
    }
    return out;
  }

  // make a parsed document self-contained, script-free and image-free
  // 把文档变成自包含、无脚本、无图片实体（只留框）
  async function flattenDoc(doc, fileMap, warnings) {
    doc.querySelectorAll("script, base, noscript").forEach(n => n.remove());
    // strip the remaining active-content vectors too: inline event handlers,
    // javascript: URLs, plugin tags. The measuring iframe is sandboxed, but the
    // fallback path (engines that hide contentDocument under sandbox) drops the
    // sandbox — so the markup itself must be inert.
    // 除 <script> 外的活性内容也一并拔除：内联事件、javascript: URL、插件标签。
    // 测量 iframe 有沙箱，但兜底路径会摘掉沙箱，所以标记本身必须无害。
    doc.querySelectorAll("object, embed, applet").forEach(n => n.remove());
    const URL_ATTRS = ["href", "src", "action", "formaction", "xlink:href", "data"];
    for (const el of doc.querySelectorAll("*")) {
      for (const name of el.getAttributeNames()) {
        if (/^on/i.test(name)) el.removeAttribute(name);
        else if (URL_ATTRS.includes(name) && /^\s*javascript:/i.test(el.getAttribute(name) || "")) el.removeAttribute(name);
      }
    }
    for (const lk of [...doc.querySelectorAll('link[rel~="stylesheet"]')]) {
      const href = lk.getAttribute("href");
      const f = resolveRef(href, fileMap);
      if (f) {
        const st = doc.createElement("style");
        st.textContent = await inlineCss(await readText(f), fileMap, 0, warnings);
        lk.replaceWith(st);
      } else {
        if (href && !/^https?:/i.test(href)) warnings.push("Missing stylesheet: " + href);
        lk.remove();
      }
    }
    // images become boxes: drop the bitmap, keep layout-driving attributes
    // 图片只留框：去掉位图，保留决定布局的属性
    let unsized = 0;
    doc.querySelectorAll("img").forEach(img => {
      if (!img.getAttribute("width") && !img.getAttribute("height")) unsized++;
      img.removeAttribute("src"); img.removeAttribute("srcset");
    });
    if (unsized) warnings.push(unsized + " image(s) had no width/height attributes — their boxes may be smaller than in the real page");
    // iframes must not load — content is imported separately (1 level)
    // iframe 不真正加载，内容单独导入（仅一层）
    doc.querySelectorAll("iframe").forEach(ifr => {
      const src = ifr.getAttribute("src"), sd = ifr.getAttribute("srcdoc");
      if (src) { ifr.setAttribute("data-ui-src", src); ifr.removeAttribute("src"); }
      if (sd) { ifr.setAttribute("data-ui-srcdoc", sd); ifr.removeAttribute("srcdoc"); }
    });
    return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
  }

  async function prepareHtmlFile(file, fileMap, warnings) {
    const doc = new DOMParser().parseFromString(await readText(file), "text/html");
    const t = doc.querySelector("title");
    const title = (t && t.textContent.trim()) || file.name.replace(/\.[^.]*$/, "");
    return { html: await flattenDoc(doc, fileMap, warnings), title };
  }

  async function prepareHtmlString(htmlString, fileMap, warnings) {
    const doc = new DOMParser().parseFromString(htmlString, "text/html");
    return flattenDoc(doc, fileMap, warnings);
  }

  // ------------------------------------------------------------------
  // Render & measure in a hidden iframe / 隐藏 iframe 渲染并测量
  // ------------------------------------------------------------------
  // settle layout: double-rAF, with a timeout fallback because rAF can stop
  // firing in headless/background contexts. Measurement itself is safe either
  // way — getBoundingClientRect forces a synchronous reflow.
  // 等待布局稳定：双 rAF + 超时兜底（headless/后台下 rAF 可能不触发；
  // getBoundingClientRect 本身会强制同步回流，所以兜底是安全的）。
  function nextFrame() {
    return new Promise(r => {
      let done = false;
      const fin = () => { if (!done) { done = true; r(); } };
      requestAnimationFrame(() => requestAnimationFrame(fin));
      setTimeout(fin, 60);
    });
  }

  async function renderAndMeasure(html, opts) {
    const iframe = document.createElement("iframe");
    // off-screen but laid out — display:none would skip layout / 不能用 display:none（不排版）
    iframe.style.cssText = "position:fixed;left:-100000px;top:0;visibility:hidden;border:0";
    // synchronous document.write into the iframe's about:blank document:
    // no navigation, no onload race (srcdoc navigation proved unreliable when
    // repeated). sandbox without allow-scripts keeps scripts off as a second
    // belt — the markup is already script-stripped by flattenDoc().
    // 直接向 about:blank 同步 document.write：无导航、无 onload 竞争
    // （重复 srcdoc 导航不可靠）。sandbox 仍禁脚本作为双保险。
    iframe.setAttribute("sandbox", "allow-same-origin");
    iframe.width = opts.canvasW;
    iframe.height = 1200;
    document.body.appendChild(iframe);
    try {
      let doc = null;
      try { doc = iframe.contentDocument; } catch (e) { /* sandbox quirk */ }
      if (!doc) {
        // some engines hide the doc under sandbox. Dropping the sandbox means
        // the markup sanitation in flattenDoc() is the ONLY script barrier on
        // this path — flattenDoc must stay strict (on*/javascript:/plugins).
        // 个别引擎在沙箱下拿不到 doc。摘掉沙箱后唯一的防线是 flattenDoc 的
        // 清洗（on* / javascript: / 插件标签），那边必须保持严格。
        iframe.removeAttribute("sandbox");
        doc = iframe.contentDocument;
      }
      if (!doc) throw new Error("cannot access the measuring document");
      doc.open(); doc.write(html); doc.close();
      await nextFrame();
      const contentH = Math.max(doc.documentElement.scrollHeight, doc.body ? doc.body.scrollHeight : 0, 120);
      const H = Math.min(contentH, MAX_CANVAS);
      iframe.height = H;          // settle fixed elements against final viewport / 让 fixed 元素就位
      await nextFrame();
      const res = walkDom(doc, iframe.contentWindow, opts, H);
      res.suggestedH = H;
      if (contentH > MAX_CANVAS) res.warnings.push("Page is taller than " + MAX_CANVAS + "px — bottom part was cut off");
      return res;
    } finally {
      iframe.remove();
    }
  }

  // ------------------------------------------------------------------
  // Style helpers / 样式辅助
  // ------------------------------------------------------------------
  // input is getComputedStyle output only — always rgb()/rgba(); anything else
  // (keywords, hex, color()) returns null and counts as "no background"
  // 输入仅限 getComputedStyle 的 rgb()/rgba()；其余返回 null 视作无底色
  function parseColor(c) {
    const m = String(c || "").match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const parts = m[1].split(",").map(s => parseFloat(s));
    const a = parts.length > 3 ? parts[3] : 1;
    const hex = "#" + parts.slice(0, 3).map(v =>
      Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
    return { hex, a };
  }
  function bgVisible(cs) { const c = parseColor(cs.backgroundColor); return !!(c && c.a > 0.01); }
  function borderVisible(cs) {
    return (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none") ||
           (parseFloat(cs.borderLeftWidth) > 0 && cs.borderLeftStyle !== "none") ||
           (parseFloat(cs.borderBottomWidth) > 0 && cs.borderBottomStyle !== "none");
  }
  function shadowVisible(cs) { return cs.boxShadow && cs.boxShadow !== "none"; }
  function round2(v) { return Math.round(v * 100) / 100; }

  // ------------------------------------------------------------------
  // DOM → sketch elements / DOM 拍平成草图元素（广度优先）
  // ------------------------------------------------------------------
  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "LINK", "META", "TITLE", "HEAD", "NOSCRIPT",
    "TEMPLATE", "BR", "WBR", "SOURCE", "TRACK", "PARAM", "OPTION", "OPTGROUP", "DATALIST", "MAP", "AREA"]);
  const SECTION_TAGS = new Set(["HEADER", "NAV", "MAIN", "SECTION", "FOOTER", "ASIDE", "ARTICLE", "FORM"]);
  const HEADINGS = new Set(["H1", "H2", "H3", "H4", "H5", "H6"]);
  const INLINE_TAGS = new Set(["A", "SPAN", "B", "I", "EM", "STRONG", "SMALL", "CODE", "LABEL",
    "SUP", "SUB", "U", "S", "ABBR", "TIME", "MARK", "Q", "CITE", "KBD", "VAR", "SAMP", "BDI", "BDO"]);

  function textOf(node, max) {
    const t = (node.textContent || "").replace(/\s+/g, " ").trim();
    return t.length > max ? t.slice(0, max - 1) + "…" : t;
  }

  function isTextLeaf(node) {
    if (!(node.textContent || "").trim()) return false;
    for (const c of node.children) {
      if (!INLINE_TAGS.has(c.tagName) && c.tagName !== "BR") return false;
    }
    return true;
  }

  function noteFor(node) {
    let s = node.tagName.toLowerCase();
    const cls = (node.getAttribute("class") || "").trim().split(/\s+/)[0];
    if (cls) s += "." + cls;
    return s.slice(0, 60);
  }

  function labelForControl(node, doc) {
    if (node.id) {
      const lb = doc.querySelector('label[for="' + node.id.replace(/"/g, '\\"') + '"]');
      if (lb) return textOf(lb, 40);
    }
    const p = node.closest("label");
    return p ? textOf(p, 40) : "";
  }

  function walkDom(doc, win, opts, maxY) {
    const canvasW = opts.canvasW;
    const maxElements = opts.maxElements || TRUNCATE_DEFAULT;
    const out = [], warnings = [], iframes = [];
    const rects = [];                 // emitted container boxes, for near-duplicate skip
    let groupSeq = 0, visited = 0, truncated = false;
    const sx = win.scrollX || 0, sy = win.scrollY || 0;

    const rectOf = (node) => {
      const r = node.getBoundingClientRect();
      return { x: r.left + sx, y: r.top + sy, w: r.width, h: r.height };
    };
    const push = (el) => {
      if (out.length >= maxElements) { truncated = true; return false; }
      out.push(el); return true;
    };
    const makeEl = (type, node, cs, r, groupKey, extra) => {
      const bg = parseColor(cs.backgroundColor);
      const elOp = parseFloat(cs.opacity);
      const hasBg = bg && bg.a > 0.01;
      return Object.assign({
        type,
        x: Math.max(0, Math.round(r.x)), y: Math.max(0, Math.round(r.y)),
        w: Math.max(2, Math.round(r.w)), h: Math.max(2, Math.round(r.h)),
        text: "", note: noteFor(node), textPos: null,
        color: hasBg ? bg.hex : "#ffffff",
        opacity: round2(Math.min(1, (hasBg ? bg.a : 1) * (isNaN(elOp) ? 1 : elOp))),
        linkTo: null, ref: null, groupKey: groupKey || null,
      }, extra || {});
    };
    const fgColorOf = (cs) => { const c = parseColor(cs.color); return (c && c.hex) || "#1d2330"; };

    // breadth-first: truncation keeps the shallow (structural) elements
    // 广度优先：截断时保住浅层（结构性）元素
    const queue = [];
    for (const c of doc.body.children) queue.push({ node: c, depth: 0, groupKey: null });

    while (queue.length) {
      const { node, depth, groupKey } = queue.shift();
      if (depth > MAX_DEPTH) continue;
      if (node.nodeType !== 1 || SKIP_TAGS.has(node.tagName)) continue;
      visited++;
      const cs = win.getComputedStyle(node);
      const r = rectOf(node);
      if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) continue;
      if (r.w < 2 && r.h < 2) continue;
      if (r.y >= maxY - 2) continue;            // below the cut line / 超出画布截断线
      if (r.w * r.h < 16 && !node.children.length) continue;   // tiny leaf / 极小元素
      const tag = node.tagName;

      // ---- iframe → linked box + separate page (handled by caller) ----
      if (tag === "IFRAME") {
        const el = makeEl("rect", node, cs, r, groupKey);
        el.linkToPage = "__IFRAME__" + (iframes.length + 1);   // placeholder, renamed by importHtmlFiles
        el.note = ("iframe: " + (node.getAttribute("data-ui-src") || "inline srcdoc")).slice(0, 80);
        // push() checked here (unlike the leaf branches) because the iframes[]
        // side effect must stay in sync with the emitted placeholder
        // 这里特意检查 push() 的返回值：iframes[] 必须与占位框一一对应
        if (push(el)) {
          iframes.push({
            src: node.getAttribute("data-ui-src") || null,
            srcdoc: node.getAttribute("data-ui-srcdoc") || null,
            // content-box size (the iframe's inner viewport), not the border box
            // 用内容尺寸（iframe 内部视口），不含边框
            w: Math.max(120, node.clientWidth || Math.round(r.w) || canvasW),
            h: Math.max(120, node.clientHeight || Math.round(r.h) || 600),
          });
        }
        continue;
      }

      // ---- form controls (leaves) ----
      if (tag === "INPUT") {
        const it = (node.getAttribute("type") || "text").toLowerCase();
        if (it === "hidden") continue;
        if (["button", "submit", "reset"].includes(it)) { push(makeEl("button", node, cs, r, groupKey, { text: node.value || "Button" })); continue; }
        if (it === "checkbox") { push(makeEl("checkbox", node, cs, r, groupKey, { text: labelForControl(node, doc) })); continue; }
        if (it === "radio") { push(makeEl("radio", node, cs, r, groupKey, { text: labelForControl(node, doc) })); continue; }
        if (it === "range") { push(makeEl("divider", node, cs, r, groupKey, { note: "input.range" })); continue; }
        push(makeEl("input", node, cs, r, groupKey, { text: node.getAttribute("placeholder") || node.value || "" }));
        continue;
      }
      if (tag === "TEXTAREA") { push(makeEl("textarea", node, cs, r, groupKey, { text: node.getAttribute("placeholder") || "" })); continue; }
      if (tag === "SELECT") {
        const selOpt = node.querySelector("option");
        push(makeEl("select", node, cs, r, groupKey, { text: selOpt ? textOf(selOpt, 30) : "Option" }));
        continue;
      }
      if (tag === "BUTTON") { push(makeEl("button", node, cs, r, groupKey, { text: textOf(node, 40) || "Button" })); continue; }

      // ---- media → box only (flattened, no bitmap) / 媒体一律只留框 ----
      if (tag === "VIDEO") { push(makeEl("video", node, cs, r, groupKey)); continue; }
      if (tag === "IMG" || tag === "SVG" || tag === "CANVAS" || tag === "PICTURE") {
        push(makeEl("image", node, cs, r, groupKey, { text: (node.getAttribute && node.getAttribute("alt")) || "" }));
        continue;
      }

      // ---- divider ----
      if (tag === "HR" || (r.h <= 3 && r.w >= 40 && bgVisible(cs))) {
        push(makeEl("divider", node, cs, r, groupKey));
        continue;
      }

      // ---- table → one table element with column headers (leaf) ----
      if (tag === "TABLE") {
        const heads = [...node.querySelectorAll("th")].slice(0, 6).map(th => textOf(th, 16)).filter(Boolean);
        push(makeEl("table", node, cs, r, groupKey, { text: heads.join(",") }));
        continue;
      }

      // ---- button-like links / role=button ----
      if (node.getAttribute("role") === "button" ||
          (tag === "A" && r.h <= 80 && (bgVisible(cs) || borderVisible(cs)))) {
        push(makeEl("button", node, cs, r, groupKey, { text: textOf(node, 40) || "Button" }));
        continue;
      }

      // ---- semantic bars (simplified leaves) — must run BEFORE the text-leaf
      // rule: a nav/footer with only inline links is also a "text leaf"
      // 语义性条状结构（简化为叶）——必须在文本叶规则之前：只含内联链接的
      // nav/footer 否则会被当成一行文本
      const fixedTop = cs.position === "fixed" && r.y <= 4;
      if ((tag === "NAV" || fixedTop || (tag === "HEADER" && r.h <= 120)) &&
          r.w >= canvasW * 0.8 && r.y <= 80 && r.h <= 140) {
        const links = [...node.querySelectorAll("a")].slice(0, 6).map(a => textOf(a, 14)).filter(Boolean);
        push(makeEl("navbar", node, cs, r, groupKey, { text: links.join(",") }));
        continue;
      }
      if (tag === "FOOTER" && r.w >= canvasW * 0.8) {
        push(makeEl("footer", node, cs, r, groupKey, { text: textOf(node, 60) }));
        continue;
      }

      // ---- text leaves ----
      if (isTextLeaf(node)) {
        if (bgVisible(cs) || borderVisible(cs) || shadowVisible(cs)) {
          // a boxy text leaf keeps its box: rect with the text inside
          // 有底色/边框的文本叶保留框：rect + 文字
          push(makeEl("rect", node, cs, r, groupKey, { text: textOf(node, 120) }));
          continue;
        }
        const type = HEADINGS.has(tag) ? "heading" : (tag === "A" ? "link" : "text");
        const el = makeEl(type, node, cs, r, groupKey, { text: textOf(node, 120) });
        el.color = fgColorOf(cs);                  // foreground color for text-likes / 文本类用前景色
        el.opacity = 1;
        if (HEADINGS.has(tag)) el.note = tag.toLowerCase();
        if (tag === "A" && node.getAttribute("href")) el.note = (noteFor(node) + " → " + node.getAttribute("href")).slice(0, 80);
        push(el);
        continue;
      }

      // ---- containers: visible box → rect + descend; transparent → descend only ----
      let gk = groupKey;
      if (depth <= 2 && node.children.length && (SECTION_TAGS.has(tag) || r.h >= 120)) {
        gk = "g" + (++groupSeq);                   // section-level flat group / 区块级扁平分组
      }
      const boxy = bgVisible(cs) || borderVisible(cs) || shadowVisible(cs);
      if (boxy && r.w * r.h >= 1200) {
        // skip near-duplicate of an already-emitted box / 跳过与已发出框几乎重合的框
        const dup = rects.some(q => Math.abs(q.x - r.x) <= 1 && Math.abs(q.y - r.y) <= 1 &&
                                    Math.abs(q.w - r.w) <= 1 && Math.abs(q.h - r.h) <= 1);
        if (!dup) {
          if (push(makeEl("rect", node, cs, r, gk))) rects.push({ x: r.x, y: r.y, w: r.w, h: r.h });
        }
      }
      if (out.length >= maxElements) { truncated = true; continue; }
      for (const c of node.children) queue.push({ node: c, depth: depth + 1, groupKey: gk });
    }

    if (truncated) warnings.push("Truncated at " + maxElements + " elements — page is large, deeper details were omitted");
    return { elements: out, iframes, warnings, stats: { emitted: out.length, visited, truncated } };
  }

  // ------------------------------------------------------------------
  // Entry point / 入口
  // ------------------------------------------------------------------
  async function importHtmlFiles(fileList, opts) {
    opts = Object.assign({ canvasW: 1280, maxElements: TRUNCATE_DEFAULT }, opts || {});
    const files = [...fileList];
    const fileMap = buildFileMap(files);
    const warnings = [];

    const htmls = files.filter(f => /\.html?$/i.test(f.name));
    const main = opts.htmlFile || htmls.find(f => /^index\.html?$/i.test(f.name)) || htmls[0];
    if (!main) throw new Error("no HTML file in the selection");

    const prepared = await prepareHtmlFile(main, fileMap, warnings);
    const res = await renderAndMeasure(prepared.html, opts);
    warnings.push(...res.warnings);
    // page `key` is the stable wiring handle for linkToPage (names may collide)
    // key 是 linkToPage 的稳定接线句柄（显示名可能重复）
    const pages = [{ key: "pg0", name: prepared.title, elements: res.elements, suggestedW: opts.canvasW, suggestedH: res.suggestedH }];
    const stats = { emitted: res.stats.emitted, visited: res.stats.visited, truncated: res.stats.truncated };

    // iframes → sub-pages, ONE level only (nested iframes stay plain boxes)
    // iframe → 子页面，仅一层（更深的 iframe 只留普通框）
    for (let i = 0; i < res.iframes.length; i++) {
      const info = res.iframes[i];
      const name = prepared.title + "_iframe" + (res.iframes.length > 1 ? "_" + (i + 1) : "");
      let subEls = [], subH = info.h;
      try {
        let subHtml = null;
        if (info.srcdoc) {
          subHtml = await prepareHtmlString(info.srcdoc, fileMap, warnings);
        } else if (info.src) {
          const f = resolveRef(info.src, fileMap);
          if (f) subHtml = (await prepareHtmlFile(f, fileMap, warnings)).html;
          else warnings.push("iframe content not in the selected files: " + info.src);
        }
        if (subHtml != null) {
          const subRes = await renderAndMeasure(subHtml, { canvasW: info.w, maxElements: opts.maxElements });
          warnings.push(...subRes.warnings);
          subEls = subRes.elements;
          subEls.forEach(e => { if (e.linkToPage) delete e.linkToPage; });   // depth-2: box only
          subH = subRes.suggestedH;
          stats.emitted += subEls.length;
        }
      } catch (e) {
        warnings.push("iframe import failed: " + (e && e.message ? e.message : e));
      }
      const key = "pg" + (i + 1);
      pages.push({ key, name, elements: subEls, suggestedW: info.w, suggestedH: subH });
      pages[0].elements.forEach(e => { if (e.linkToPage === "__IFRAME__" + (i + 1)) e.linkToPage = key; });
    }

    return { pages, title: prepared.title, warnings, stats };
  }

  window.HtmlImport = { importHtmlFiles };
})();
