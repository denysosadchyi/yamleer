// architecture.js — generates dist/architecture.html: a one-page visual
// explanation of how yamleer works. Five-stage pipeline + composition
// hierarchy + entry-point buttons.
//
// Run with:  node render/architecture.js

import { readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, relative, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { faviconLinks, inlineMark } from '../system/lib/brand.js'

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')
const OUT  = join(ROOT, 'dist', 'architecture.html')

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const listYaml = (dir) => {
  const abs = join(ROOT, dir)
  if (!existsSync(abs)) return []
  return readdirSync(abs)
    .filter((f) => extname(f) === '.yaml' || extname(f) === '.yml')
    .sort()
}

const listAny = (dir, filter = () => true) => {
  const abs = join(ROOT, dir)
  if (!existsSync(abs)) return []
  return readdirSync(abs).filter(filter).sort()
}

const yamlAnchor = (relPath) => relPath.replace(/[\/.]/g, '-')

const fileLink = (dir, name, dest = 'yaml') => {
  const rel = `${dir}/${name}`
  // Target _top so links navigate the outer window when this page is loaded
  // inside the explorer's overlay iframe — otherwise the explorer nests
  // itself recursively. Anchor goes straight to ./ (the explorer); the old
  // ./yaml.html shim dropped the hash on its meta-refresh redirect.
  if (dest === 'yaml') return `<a href="./#${esc(yamlAnchor(rel))}" target="_top">${esc(name)}</a>`
  return esc(name)
}

const groupRow = (label, files, dir) => `
  <div class="files-row">
    <span class="files-label">${esc(label)}</span>
    <span class="files-count">${files.length}</span>
    <ul class="files-list">${files.map((f) => `<li>${fileLink(dir, f)}</li>`).join('')}</ul>
  </div>`

const tokens     = listYaml('design/tokens')
const screens    = listYaml('design/screens')
const primitives = listYaml('system/primitives')
const blocks     = listYaml('system/blocks')
const templates  = listYaml('system/templates')
const schemas    = listAny('system/schemas', (f) => f.endsWith('.yaml') || f.endsWith('.json'))
const styles     = listAny('system/styles',  (f) => f.endsWith('.css'))
const walkers    = listAny('render/walkers', (f) => f.endsWith('.js') && f !== 'index.js')

const generatedAt = new Date().toISOString().replace('T', ' ').slice(0, 19)

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>yamleer — how it works</title>
${faviconLinks}
<style>
  :root {
    --bg: #f5f5f1;
    --panel: #ffffff;
    --ink: #1a1a1a;
    --ink-2: #555;
    --ink-3: #888;
    --line: #e0e0d8;
    --line-2: #c8c8be;
    --accent: #2a5fb8;
    --accent-dim: #d9e4f4;
    --pop: #b1432b;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: var(--bg); color: var(--ink); }
  body {
    font: 14px/1.55 ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    padding: 32px 24px 80px;
  }
  .wrap { max-width: 980px; margin: 0 auto; }

  /* ---- hero ---- */
  header.hero {
    border-bottom: 1px solid var(--line);
    padding-bottom: 24px; margin-bottom: 32px;
  }
  h1 { font-size: 28px; margin: 0 0 6px; letter-spacing: -0.02em;
       display: inline-flex; align-items: center; gap: 12px; }
  h1 .mark { display: inline-flex; }
  .tagline { color: var(--ink-2); margin: 0 0 18px; font-size: 14px; }

  /* ---- section title ---- */
  h2.section {
    font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--ink-3); margin: 36px 0 16px;
    padding-bottom: 4px; border-bottom: 1px dashed var(--line);
  }

  /* ---- pipeline ---- */
  .pipeline { display: flex; flex-direction: column; gap: 0; }

  .stage {
    background: var(--panel); border: 1px solid var(--line);
    border-radius: 6px; padding: 18px 22px 20px;
    position: relative;
  }
  .stage-head {
    display: flex; align-items: baseline; gap: 12px;
    margin-bottom: 4px; padding-bottom: 8px;
    border-bottom: 1px dashed var(--line);
  }
  .stage-num {
    display: inline-flex; align-items: center; justify-content: center;
    width: 26px; height: 26px; border-radius: 50%;
    background: var(--ink); color: #fff;
    font-size: 12px; font-weight: 700;
  }
  .stage-name {
    font-size: 16px; font-weight: 700; letter-spacing: 0.02em;
  }
  .stage-tag {
    font-size: 11px; color: var(--ink-3);
    background: var(--bg); padding: 2px 8px; border-radius: 2px;
    margin-left: auto;
  }
  .stage-desc { color: var(--ink-2); margin: 8px 0 14px; font-size: 13px; }

  .arrow {
    text-align: center; color: var(--ink-3);
    font-size: 18px; line-height: 1;
    padding: 8px 0;
    user-select: none;
  }
  .arrow::before {
    content: ""; display: inline-block;
    width: 1px; height: 14px; background: var(--line-2);
    vertical-align: middle; margin-right: 4px;
  }
  .arrow::after {
    content: ""; display: inline-block;
    width: 1px; height: 14px; background: var(--line-2);
    vertical-align: middle; margin-left: 4px;
  }

  /* ---- files inside stage ---- */
  .files { display: flex; flex-direction: column; gap: 6px; }
  .files-row {
    display: grid; grid-template-columns: 180px 30px 1fr;
    gap: 10px; align-items: baseline;
    padding: 6px 8px; background: var(--bg); border-radius: 3px;
    font-size: 12px;
  }
  .files-label { font-weight: 600; color: var(--ink); }
  .files-count {
    color: var(--ink-3); font-size: 11px; text-align: right;
  }
  .files-list { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 4px 10px; }
  .files-list li { font-size: 11px; }
  .files-list a {
    color: var(--accent); text-decoration: none;
    border-bottom: 1px dotted var(--accent-dim);
  }
  .files-list a:hover { border-bottom-style: solid; }
  .files-list .static { color: var(--ink-3); }

  .stage-scripts { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
  .stage-script {
    display: flex; gap: 12px; align-items: baseline;
    padding: 8px 10px; background: var(--bg); border-left: 3px solid var(--accent);
    border-radius: 0 3px 3px 0; font-size: 12px;
  }
  .stage-script code {
    font-weight: 600; min-width: 200px; color: var(--ink);
  }
  .stage-script-desc { color: var(--ink-2); }

  /* ---- composition pyramid ---- */
  .composition { display: flex; flex-direction: column; gap: 2px; align-items: stretch; }
  .tier {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 4px;
    padding: 12px 16px;
    display: grid; grid-template-columns: 120px 60px 1fr;
    gap: 14px; align-items: center;
    font-size: 13px;
  }
  .tier-name {
    font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.05em; font-size: 12px;
  }
  .tier-count {
    color: var(--ink-3); font-size: 11px; text-align: right;
  }
  .tier-desc { color: var(--ink-2); font-size: 12px; }

  .tier-tokens     { background: #efeae1; }
  .tier-primitives { background: #ebe9e0; }
  .tier-blocks     { background: #e7e7de; }
  .tier-templates  { background: #e2e4dc; }
  .tier-screens    { background: #dde2da; }

  .legend {
    margin-top: 14px; font-size: 11px; color: var(--ink-3);
    display: flex; gap: 12px; align-items: center;
  }
  .legend-arrow {
    flex: 1; height: 1px; background: var(--line-2); position: relative;
  }

  /* ---- footer ---- */
  footer {
    margin-top: 48px; padding-top: 18px;
    border-top: 1px solid var(--line);
    font-size: 11px; color: var(--ink-3);
    display: flex; justify-content: space-between; align-items: center;
  }
  footer nav a {
    color: var(--ink-2); text-decoration: none;
    margin-right: 14px; border-bottom: 1px dotted var(--line-2);
  }
  footer nav a:hover { color: var(--accent); border-bottom-color: var(--accent); }

  code { background: var(--bg); padding: 1px 5px; border-radius: 2px; font-size: 12px; }

  /* ---- mermaid diagrams ---- */
  .mermaid-wrap {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 24px 16px;
    margin-bottom: 8px;
    overflow-x: auto;
  }
  .mermaid-wrap--narrow { max-width: 520px; margin-left: auto; margin-right: auto; }
  .mermaid {
    display: flex; justify-content: center;
    min-height: 60px;
    /* hide raw source until mermaid renders */
    visibility: hidden;
  }
  .mermaid[data-processed="true"] { visibility: visible; }
  .mermaid svg { max-width: 100%; height: auto !important; }
  /* Mermaid wraps click-href nodes in <a> — make the whole node feel clickable
     and brighten its fill on hover so the affordance reads at a glance. */
  .mermaid svg a { cursor: pointer; text-decoration: none; }
  .mermaid svg a:hover .node rect,
  .mermaid svg a:hover .node polygon,
  .mermaid svg a:hover .node circle,
  .mermaid svg a:hover .node path { filter: brightness(0.96); }
  .mermaid svg a:focus { outline: none; }
  .mermaid svg a:focus .node rect,
  .mermaid svg a:focus .node polygon { stroke-width: 2.5px; }
  .diagram-note {
    font-size: 11px; color: var(--ink-3);
    text-align: center; margin: 6px 0 24px;
  }

  /* diagram legend */
  .legend {
    display: flex; flex-wrap: wrap;
    gap: 8px 22px;
    padding: 12px 16px;
    background: var(--bg); border: 1px solid var(--line); border-radius: 4px;
    font-size: 11px; color: var(--ink-2);
    margin: 8px 0 24px;
  }
  .legend-item { display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; }
  .legend-box {
    width: 28px; height: 18px;
    border: 1.5px solid #1a1a1a; background: #fff; border-radius: 3px;
  }
  .legend-box--linkable {
    border-color: #2a5fb8; background: #eaf1fb;
  }
  .legend-circle {
    width: 18px; height: 18px; border-radius: 50%;
    border: 1.5px solid #b1432b; background: #fff3f0; color: #b1432b;
  }
  .legend-arrow {
    position: relative; width: 36px; height: 8px;
    display: inline-block;
  }
  .legend-arrow::before {
    content: ""; position: absolute; left: 0; right: 6px; top: 50%;
    border-top: 1.5px solid #555;
  }
  .legend-arrow::after {
    content: ""; position: absolute; right: 0; top: 50%;
    margin-top: -4px;
    width: 0; height: 0;
    border-left: 6px solid #555;
    border-top: 4px solid transparent;
    border-bottom: 4px solid transparent;
  }
  .legend-arrow--thick::before { border-top-width: 3.5px; }
  .legend-arrow--dashed::before { border-top-style: dashed; }
</style>
</head>
<body>
<div class="wrap">

<header class="hero">
  <h1><span class="mark">${inlineMark(36)}</span>yamleer</h1>
  <p class="tagline">A YAML-first design pipeline. Five stages from authoring intent to static HTML — no JS runtime, no design tool, no manual sync.</p>
</header>

<h2 class="section">Pipeline · diagram</h2>
<div class="mermaid-wrap">
  <pre class="mermaid">
flowchart TD
    classDef stage fill:#fff,stroke:#1a1a1a,stroke-width:1.5px,color:#1a1a1a
    classDef ok    fill:#e3f1e6,stroke:#1a7f37,color:#1a7f37
    classDef abort fill:#fff3f0,stroke:#b1432b,color:#b1432b

    subgraph S1 [" 1 · AUTHOR — design/ "]
      direction TB
      TOK["tokens/<br/>${tokens.length} files"]:::stage
      SCR["screens/<br/>${screens.length} files"]:::stage
    end

    subgraph S2 [" 2 · CONTRACT — system/ + render/ "]
      direction TB
      PRI["primitives/<br/>${primitives.length}"]:::stage
      BLK["blocks/<br/>${blocks.length}"]:::stage
      TPL["templates/<br/>${templates.length}"]:::stage
      SCH["schemas/<br/>${schemas.length}"]:::stage
      STY["styles/<br/>${styles.length} CSS"]:::stage
      WLK["walkers/<br/>${walkers.length}"]:::stage
    end

    VAL["3 · validate.js<br/>schemas + walkers"]:::stage

    subgraph S4 [" 4 · BUILD "]
      direction TB
      T2C["tokens-to-css.js"]:::stage
      RND["render.js"]:::stage
    end

    subgraph S5 [" 5 · OUTPUT — dist/ "]
      direction TB
      DCS["styles/<br/>tokens.css + statics"]:::stage
      DSH["screens/*.html"]:::stage
      DIX["storyboard.html"]:::stage
    end

    ERR(("abort")):::abort

    %% one invisible rank edge between adjacent subgraphs — leaves
    %% each subgraph free to stack its own nodes vertically (TB)
    SCR ~~~ PRI
    WLK ~~~ VAL
    VAL ~~~ T2C
    RND ~~~ DCS

    %% real data flow
    TOK --> T2C
    SCR --> VAL
    PRI --> VAL
    BLK --> VAL
    TPL --> VAL
    SCH --> VAL
    WLK --> VAL
    VAL -.->|on error| ERR
    VAL ==>|pass| RND
    PRI --> RND
    BLK --> RND
    TPL --> RND
    STY --> DCS
    T2C --> DCS
    RND --> DSH
    RND --> DIX

    click TOK href "./#g-tokens" "Browse token YAML" _top
    click SCR href "./#g-screens" "Browse screen YAML" _top
    click PRI href "./#g-primitives" "Browse primitives" _top
    click BLK href "./#g-blocks" "Browse blocks" _top
    click TPL href "./#g-templates" "Browse templates" _top
    click DIX href "./storyboard.html" "Open storyboard" _top

    classDef linkable fill:#eaf1fb,stroke:#2a5fb8,stroke-width:1.5px,color:#1a3e7d
    class TOK,SCR,PRI,BLK,TPL,DIX linkable
  </pre>
</div>
<div class="legend">
  <span class="legend-item"><span class="legend-box"></span>stage / file</span>
  <span class="legend-item"><span class="legend-box legend-box--linkable"></span>clickable — opens in YAML explorer</span>
  <span class="legend-item"><span class="legend-circle"></span>build aborts</span>
  <span class="legend-item"><span class="legend-arrow"></span>data flow</span>
  <span class="legend-item"><span class="legend-arrow legend-arrow--thick"></span>validation pass</span>
  <span class="legend-item"><span class="legend-arrow legend-arrow--dashed"></span>error / bypass</span>
</div>

<h2 class="section">Pipeline · walkthrough</h2>

<div class="pipeline">

  <div class="stage">
    <div class="stage-head">
      <span class="stage-num">1</span>
      <span class="stage-name">AUTHOR</span>
      <span class="stage-tag">you write this by hand</span>
    </div>
    <p class="stage-desc">Two kinds of YAML: <strong>tokens</strong> declare the raw visual values; <strong>screens</strong> declare what to show using the system grammar.</p>
    <div class="files">
      ${groupRow('design/tokens/', tokens, 'design/tokens')}
      ${groupRow('design/screens/', screens, 'design/screens')}
    </div>
  </div>

  <div class="arrow">▼</div>

  <div class="stage">
    <div class="stage-head">
      <span class="stage-num">2</span>
      <span class="stage-name">CONTRACT</span>
      <span class="stage-tag">the grammar — single source of truth</span>
    </div>
    <p class="stage-desc">Every block, slot and field is declared. Screens are valid <em>only</em> if they fit this grammar. JSON Schemas catch shape errors; walker functions catch relational ones (e.g. wrong block in wrong slot).</p>
    <div class="files">
      ${groupRow('system/primitives/', primitives, 'system/primitives')}
      ${groupRow('system/blocks/', blocks, 'system/blocks')}
      ${groupRow('system/templates/', templates, 'system/templates')}
      <div class="files-row">
        <span class="files-label">system/schemas/</span>
        <span class="files-count">${schemas.length}</span>
        <ul class="files-list">${schemas.map((f) => `<li class="static">${esc(f)}</li>`).join('')}</ul>
      </div>
      <div class="files-row">
        <span class="files-label">system/styles/</span>
        <span class="files-count">${styles.length}</span>
        <ul class="files-list">${styles.map((f) => `<li class="static">${esc(f)}</li>`).join('')}</ul>
      </div>
      <div class="files-row">
        <span class="files-label">render/walkers/</span>
        <span class="files-count">${walkers.length}</span>
        <ul class="files-list">${walkers.map((f) => `<li class="static">${esc(f)}</li>`).join('')}</ul>
      </div>
    </div>
  </div>

  <div class="arrow">▼</div>

  <div class="stage">
    <div class="stage-head">
      <span class="stage-num">3</span>
      <span class="stage-name">VALIDATE</span>
      <span class="stage-tag">gate — nothing builds without this</span>
    </div>
    <p class="stage-desc">Every YAML in <code>design/</code> is run through schemas and walkers. One failure aborts the whole build with a precise error pointing at the offending path.</p>
    <div class="stage-scripts">
      <div class="stage-script">
        <code>render/validate.js</code>
        <span class="stage-script-desc">Ajv schema validation + relational walkers. Exit code 1 on any failure.</span>
      </div>
    </div>
  </div>

  <div class="arrow">▼</div>

  <div class="stage">
    <div class="stage-head">
      <span class="stage-num">4</span>
      <span class="stage-name">BUILD</span>
      <span class="stage-tag">pure transformation</span>
    </div>
    <p class="stage-desc">Tokens become CSS variables. Screens become standalone HTML using the system's renderers. No framework, no virtual DOM.</p>
    <div class="stage-scripts">
      <div class="stage-script">
        <code>render/tokens-to-css.js</code>
        <span class="stage-script-desc">design/tokens/*.yaml → dist/styles/tokens.css (CSS custom properties)</span>
      </div>
      <div class="stage-script">
        <code>render/render.js</code>
        <span class="stage-script-desc">design/screens/*.yaml + system/* → dist/screens/*.html + dist/storyboard.html</span>
      </div>
    </div>
  </div>

  <div class="arrow">▼</div>

  <div class="stage">
    <div class="stage-head">
      <span class="stage-num">5</span>
      <span class="stage-name">OUTPUT</span>
      <span class="stage-tag">static HTML + CSS — serve anywhere</span>
    </div>
    <p class="stage-desc">Plain files. <code>npm run serve</code> drops everything onto <code>http://localhost:8000</code>. Nothing to install on the client, nothing to compile at runtime.</p>
    <div class="files">
      <div class="files-row">
        <span class="files-label">dist/styles/</span>
        <span class="files-count">5</span>
        <ul class="files-list">
          <li class="static">tokens.css <em>(generated)</em></li>
          <li class="static">reset.css, base.css, blocks.css, storyboard.css <em>(copied)</em></li>
        </ul>
      </div>
      <div class="files-row">
        <span class="files-label">dist/screens/</span>
        <span class="files-count">${screens.length}</span>
        <ul class="files-list">${screens.map((f) => {
          const id = f.replace(/\.yaml$/, '')
          return `<li><a href="./screens/${esc(id)}.html" target="_top">${esc(id)}.html</a></li>`
        }).join('')}</ul>
      </div>
      <div class="files-row">
        <span class="files-label">dist/</span>
        <span class="files-count">3</span>
        <ul class="files-list">
          <li><a href="./" target="_top">index.html</a> <em>yaml explorer (home)</em></li>
          <li><a href="./storyboard.html" target="_top">storyboard.html</a> <em>rendered screens</em></li>
          <li><a href="./architecture.html" target="_top">architecture.html</a> <em>this page</em></li>
        </ul>
      </div>
    </div>
  </div>

</div>

<h2 class="section">Composition · diagram</h2>
<div class="mermaid-wrap">
  <pre class="mermaid">
flowchart TB
    classDef layer fill:#fff,stroke:#1a1a1a,stroke-width:1.5px,color:#1a1a1a,padding:8px

    TOK2["tokens<br/>${tokens.length}"]:::layer
    PRI2["primitives<br/>${primitives.length}"]:::layer
    BLK2["blocks<br/>${blocks.length}"]:::layer
    TPL2["templates<br/>${templates.length}"]:::layer
    SCR2["screens<br/>${screens.length}"]:::layer

    TOK2 -->|"referenced by"| PRI2
    PRI2 -->|"composed into"| BLK2
    BLK2 -->|"slotted into"| TPL2
    TPL2 -->|"instantiated as"| SCR2
    TOK2 -.->|"also referenced directly"| BLK2
    TOK2 -.->|"via roles/tone"| SCR2

    click TOK2 href "./#g-tokens" "Browse tokens" _top
    click PRI2 href "./#g-primitives" "Browse primitives" _top
    click BLK2 href "./#g-blocks" "Browse blocks" _top
    click TPL2 href "./#g-templates" "Browse templates" _top
    click SCR2 href "./#g-screens" "Browse screens" _top

    classDef linkable fill:#eaf1fb,stroke:#2a5fb8,stroke-width:1.5px,color:#1a3e7d
    class TOK2,PRI2,BLK2,TPL2,SCR2 linkable
  </pre>
</div>
<p class="diagram-note">▸ solid arrows = direct composition · dotted = cross-cutting token references</p>

<h2 class="section">Composition · bottom-up</h2>
<p style="color: var(--ink-2); font-size: 13px; margin: 0 0 14px;">Each layer references the layer below. Change a token → it propagates up through primitives → blocks → templates → screens. Change a block → only the screens that use it re-render.</p>

<div class="composition">
  <div class="tier tier-screens">
    <span class="tier-name">screens</span>
    <span class="tier-count">${screens.length} files</span>
    <span class="tier-desc">Instances. Concrete content slotted into a template — the only place where you write real copy and CTAs.</span>
  </div>
  <div class="tier tier-templates">
    <span class="tier-name">templates</span>
    <span class="tier-count">${templates.length} files</span>
    <span class="tier-desc">Page layouts. Either <code>sequence</code> (linear stack) or <code>slotted</code> (named zones like header/main/footer).</span>
  </div>
  <div class="tier tier-blocks">
    <span class="tier-name">blocks</span>
    <span class="tier-count">${blocks.length} files</span>
    <span class="tier-desc">Composed components with fields and refs. Some are leaves (hero-text, cta-bar); some are structural (section holds cards).</span>
  </div>
  <div class="tier tier-primitives">
    <span class="tier-name">primitives</span>
    <span class="tier-count">${primitives.length} files</span>
    <span class="tier-desc">Atoms. Single-purpose, no children. The smallest interactive or visual unit.</span>
  </div>
  <div class="tier tier-tokens">
    <span class="tier-name">tokens</span>
    <span class="tier-count">${tokens.length} files</span>
    <span class="tier-desc">Raw values: colors, typography, spacing, radius. Plus <strong>roles</strong> — semantic mappings that reference the primitive tokens above.</span>
  </div>
</div>

<footer>
  <nav>
    <a href="./" target="_top">YAML explorer</a>
    <a href="./storyboard.html" target="_top">Storyboard</a>
  </nav>
  <span>Generated ${esc(generatedAt)}</span>
</footer>

</div>

<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  mermaid.initialize({
    startOnLoad: true,
    securityLevel: 'loose',
    theme: 'base',
    themeVariables: {
      fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
      fontSize: '15px',
      primaryColor: '#ffffff',
      primaryTextColor: '#1a1a1a',
      primaryBorderColor: '#1a1a1a',
      lineColor: '#666',
      mainBkg: '#ffffff',
      clusterBkg: '#f0efe8',
      clusterBorder: '#c8c8be',
      titleColor: '#555',
      edgeLabelBackground: '#f5f5f1',
    },
    flowchart: { curve: 'basis', padding: 16, htmlLabels: true },
  });

  // Defensive: Mermaid v11 writes click-href anchors with xlink:href and
  // accepts a target as the 4th click-arg, but we set target=_top here too
  // so the links keep escaping the explorer overlay iframe even if the
  // Mermaid syntax changes upstream.
  const promoteLinks = () => {
    document.querySelectorAll('.mermaid svg a').forEach((a) => {
      if (a.getAttribute('target') !== '_top') a.setAttribute('target', '_top');
    });
  };
  const obs = new MutationObserver(promoteLinks);
  obs.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => { promoteLinks(); obs.disconnect(); }, 3000);
</script>
</body>
</html>
`

mkdirSync(join(ROOT, 'dist'), { recursive: true })
writeFileSync(OUT, html)

console.log(`✓ wrote ${relative(ROOT, OUT)}`)
console.log(`    tokens     ${tokens.length}`)
console.log(`    primitives ${primitives.length}`)
console.log(`    blocks     ${blocks.length}`)
console.log(`    templates  ${templates.length}`)
console.log(`    screens    ${screens.length}`)
