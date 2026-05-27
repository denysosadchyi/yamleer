// yaml-explorer.js — generates dist/yaml.html: a visual tree of every YAML
// in design/ and system/, with a wireframe-style structural diagram beside each.
// Run with:  node render/yaml-explorer.js

import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync } from 'node:fs'
import { join, relative, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'
import { faviconLinks, inlineMark } from '../system/lib/brand.js'

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')
const OUT  = join(ROOT, 'dist', 'index.html')

// Groups ordered simplest → most composite:
//   tokens (raw values) → primitives (atoms) → blocks (composed)
//   → templates (layouts) → screens (instances).
//
// `order`: explicit per-file ordering when convention beats raw complexity.
// Tokens follow design-system convention: foundational primitives first
// (colors → typography → spacing → radius), semantic mappings last (roles).
const SCAN = [
  {
    label: 'tokens',
    dir: 'design/tokens',
    order: ['colors.yaml', 'typography.yaml', 'spacing.yaml', 'radius.yaml', 'roles.yaml'],
  },
  { label: 'primitives', dir: 'system/primitives' },
  { label: 'blocks',     dir: 'system/blocks'     },
  { label: 'templates',  dir: 'system/templates'  },
  { label: 'screens',    dir: 'design/screens'    },
]

// Total node count of the parsed YAML — proxy for "how much is going on
// in this file". Sorts each group from simplest to most complex.
const complexity = (node) => {
  if (node === null || typeof node !== 'object') return 1
  if (Array.isArray(node)) return 1 + node.reduce((n, v) => n + complexity(v), 0)
  return 1 + Object.values(node).reduce((n, v) => n + complexity(v), 0)
}

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const collect = (group) => {
  const abs = join(ROOT, group.dir)
  let entries = []
  try { entries = readdirSync(abs) } catch { return [] }
  const order = group.order || []
  return entries
    .filter((f) => extname(f) === '.yaml' || extname(f) === '.yml')
    .map((name) => {
      const path = join(abs, name)
      const raw  = readFileSync(path, 'utf8')
      let data, err
      try { data = yaml.load(raw) } catch (e) { err = e.message }
      return {
        name, rel: relative(ROOT, path), size: statSync(path).size,
        raw, data, err,
        score: err ? Infinity : complexity(data),
      }
    })
    .sort((a, b) => {
      // explicit per-group order wins; unlisted files fall through to score
      const ai = order.indexOf(a.name)
      const bi = order.indexOf(b.name)
      if (ai !== -1 && bi !== -1) return ai - bi
      if (ai !== -1) return -1
      if (bi !== -1) return 1
      return a.score - b.score || a.name.localeCompare(b.name)
    })
}

// ---------- YAML tree (left column) ----------

const typeOf = (v) => {
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'array'
  return typeof v
}

const renderValue = (v) => {
  const t = typeOf(v)
  if (t === 'string')  return `<span class="v-str">${esc(JSON.stringify(v))}</span>`
  if (t === 'number')  return `<span class="v-num">${esc(v)}</span>`
  if (t === 'boolean') return `<span class="v-bool">${esc(v)}</span>`
  if (t === 'null')    return `<span class="v-null">null</span>`
  return ''
}

const renderNode = (node, keyLabel = null, depth = 0) => {
  const t = typeOf(node)
  if (t !== 'object' && t !== 'array') {
    return `<li class="leaf">${
      keyLabel !== null ? `<span class="k">${esc(keyLabel)}</span><span class="colon">:</span> ` : ''
    }${renderValue(node)}</li>`
  }
  const entries = t === 'array' ? node.map((v, i) => [i, v]) : Object.entries(node)
  const head = keyLabel !== null
    ? `<span class="k">${esc(keyLabel)}</span><span class="colon">:</span> <span class="meta">${t === 'array' ? `[${entries.length}]` : `{${entries.length}}`}</span>`
    : `<span class="meta">${t === 'array' ? `[${entries.length}]` : `{${entries.length}}`}</span>`
  const open = depth < 2 ? ' open' : ''
  const children = entries.map(([k, v]) => renderNode(v, k, depth + 1)).join('')
  return `<li><details${open}><summary>${head}</summary><ul>${children}</ul></details></li>`
}

// ---------- WIREFRAME primitives ----------
//
// Every "drawn" bit uses height/width to look like a UI placeholder, not text.
// Widths derive from actual content length so two cards with different headings
// look subtly different.

const widthForLen = (len, base = 92, min = 32) => {
  if (!len) return min
  // grows from min to ~base as text gets longer; saturates around ~60 chars
  const w = min + Math.min(1, len / 60) * (base - min)
  return Math.round(w)
}

const lineHash = (s) => {
  // stable pseudo-jitter so widths look natural but render identically each build
  let h = 0
  for (let i = 0; i < (s || '').length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

const wfLine = (cls, width) =>
  `<div class="wf-line wf-line--${cls}" style="width: ${width}%"></div>`

const wfTitle = (text) =>
  wfLine('title', Math.min(80, widthForLen((text || '').length, 80, 40)))

const wfHeading = (text) =>
  wfLine('heading', Math.min(72, widthForLen((text || '').length, 70, 30)))

const wfBody = (text, lineLen = 55) => {
  if (!text) return ''
  const t = String(text)
  const n = Math.min(4, Math.max(1, Math.ceil(t.length / lineLen)))
  const seed = lineHash(t)
  const out = []
  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1
    const jitter = ((seed >> (i * 3)) & 0x7) // 0..7
    const w = isLast ? 35 + jitter * 4 : 86 + jitter
    out.push(wfLine('body', Math.min(96, w)))
  }
  return out.join('')
}

const wfBtn = (intent = 'secondary', label) => {
  const w = label ? Math.max(60, Math.min(140, label.length * 7 + 28)) : 90
  return `<div class="wf-btn wf-btn--${esc(intent)}" style="width: ${w}px"></div>`
}

const wfIcon = (size = 'md') => `<div class="wf-icon wf-icon--${esc(size)}"></div>`

// ---------- WIREFRAME blocks ----------

const wfBlock = (b) => {
  if (!b || typeof b !== 'object') return ''
  const tone = esc(b.tone || 'neutral')
  const density = esc(b.density || 'comfortable')

  switch (b.block) {
    case 'hero-text': return `
      <div class="wf wf-hero" data-tone="${tone}" data-density="${density}">
        <span class="wf-tag">hero-text</span>
        ${wfTitle(b.title)}
        ${wfBody(b.lead, 60)}
        ${b.cta ? wfBtn(b.cta.intent, b.cta.label) : ''}
      </div>`

    case 'card': return `
      <div class="wf wf-card" data-tone="${tone}">
        <span class="wf-tag">card</span>
        <div class="wf-row">
          ${b.icon ? wfIcon(b.icon.size) : ''}
          <div class="wf-col">
            ${wfHeading(b.heading)}
            ${wfBody(b.body, 40)}
            ${b.cta ? wfBtn(b.cta.intent || 'ghost', b.cta.label) : ''}
          </div>
        </div>
      </div>`

    case 'section': {
      const cards = (b.slots && b.slots.body) || []
      // Row-style children (setting-row, task-item) stack vertically;
      // card-style children fill an auto-fit grid.
      const stackTypes = new Set(['setting-row', 'task-item'])
      const useStack = cards.some((c) => c && stackTypes.has(c.block))
      const layoutClass = useStack ? 'wf-rows' : 'wf-grid'
      return `
      <div class="wf wf-section" data-tone="${tone}" data-density="${density}">
        <span class="wf-tag">section</span>
        ${wfHeading(b.heading)}
        ${wfBody(b.description, 65)}
        <div class="${layoutClass}">${cards.map(wfBlock).join('')}</div>
      </div>`
    }

    case 'cta-bar': return `
      <div class="wf wf-cta" data-tone="${tone}">
        <span class="wf-tag">cta-bar</span>
        <div class="wf-row wf-row--baseline">
          <div class="wf-col">
            ${wfHeading(b.heading)}
            ${wfBody(b.body, 55)}
          </div>
          ${b.cta ? wfBtn(b.cta.intent || 'primary', b.cta.label) : ''}
        </div>
      </div>`

    case 'page-header': return `
      <div class="wf wf-page-header" data-tone="${tone}">
        <span class="wf-tag">page-header</span>
        ${b.eyebrow ? wfLine('eyebrow', Math.min(36, widthForLen((b.eyebrow || '').length, 30, 14))) : ''}
        <div class="wf-row wf-row--baseline">
          <div class="wf-col">
            ${wfTitle(b.title)}
            ${b.meta ? wfBody(b.meta, 70) : ''}
          </div>
          ${b.action ? wfBtn(b.action.intent || 'secondary', b.action.label) : ''}
        </div>
      </div>`

    case 'setting-row': {
      const control = b.control || {}
      let controlEl = ''
      if (control.primitive === 'toggle') {
        controlEl = `<div class="wf-toggle" data-on="${!!control.on}" data-state="default"></div>`
      } else if (control.primitive === 'action') {
        controlEl = wfBtn(control.intent || 'ghost', control.label)
      }
      return `
      <div class="wf wf-setting-row" data-tone="${tone}">
        <span class="wf-tag">setting-row</span>
        <div class="wf-row wf-row--baseline">
          <div class="wf-col">
            ${wfHeading(b.label)}
            ${b.description ? wfBody(b.description, 75) : ''}
          </div>
          ${controlEl}
        </div>
      </div>`
    }

    case 'task-item': {
      const done = !!b.done
      return `
      <div class="wf wf-task-item" data-tone="${tone}" data-done="${done}">
        <span class="wf-tag">task-item</span>
        <div class="wf-row wf-row--baseline">
          <div class="wf-check" data-done="${done}"></div>
          <div class="wf-col">
            ${wfHeading(b.title)}
            ${b.note ? wfBody(b.note, 70) : ''}
          </div>
          ${b.due ? `<div class="wf-meta" style="width: 48px"></div>` : ''}
        </div>
      </div>`
    }

    default:
      return `<div class="wf wf-unknown"><span class="wf-tag">${esc(b.block || '?')}</span></div>`
  }
}

// ---------- Visualization: SCREENS ----------

const visualizeScreen = (data) => {
  if (!data || typeof data !== 'object') return ''
  const tpl = esc(data.template || 'unknown')

  if (data.slots) {
    const slotOrder = ['header', 'main', 'footer']
    const slotKeys = [...new Set([...slotOrder.filter(k => k in data.slots), ...Object.keys(data.slots)])]
    const slotsHtml = slotKeys.map((slotName) => {
      const content = data.slots[slotName]
      const items = Array.isArray(content) ? content : [content]
      return `<div class="wf-zone" data-zone="${esc(slotName)}">
        <span class="wf-zone-tag">${esc(slotName)}</span>
        ${items.map(wfBlock).join('')}
      </div>`
    }).join('')
    return `<div class="wf-page">
      <span class="wf-page-tag">page · ${tpl}</span>
      ${slotsHtml}
    </div>`
  }

  if (data.blocks) {
    return `<div class="wf-page">
      <span class="wf-page-tag">page · ${tpl}</span>
      <div class="wf-stack">${data.blocks.map(wfBlock).join('')}</div>
    </div>`
  }

  return `<div class="viz-empty">no slots / blocks</div>`
}

// ---------- Visualization: SYSTEM DEFS ----------
//
// We synthesize a fake instance from the field/slot schema, then run it
// through wfBlock — so the visualization is literally what the block looks
// like when filled with placeholder content.

const SAMPLE = {
  title:       'A title that fills the hero line nicely',
  heading:     'A heading line for this block',
  lead:        'A lead paragraph that previews the body — long enough to wrap to two or three lines so the proportions read correctly.',
  body:        'Body text content. Wraps to a couple of lines so you can see what it would look like.',
  description: 'Section description copy — short enough for one or two lines.',
}

const synthFromBlockDef = (type, def) => {
  const fields = def?.fields || {}
  const slots  = def?.slots  || {}
  const out = { block: type, tone: 'neutral' }
  for (const key of ['title', 'heading', 'lead', 'body', 'description']) {
    if (fields[key]) out[key] = SAMPLE[key]
  }
  if (fields.icon) out.icon = { primitive: 'icon', size: 'md' }
  if (fields.cta)  out.cta  = { primitive: 'action', label: 'Action', intent: 'primary' }
  if (slots.body) {
    const childType = slots.body.allows?.[0] || 'card'
    out.slots = { body: [
      synthFromBlockDef(childType, blockDefIndex[childType]),
      synthFromBlockDef(childType, blockDefIndex[childType]),
      synthFromBlockDef(childType, blockDefIndex[childType]),
    ] }
  }
  return out
}

let blockDefIndex = {}

const visualizeBlockDef = (data) =>
  wfBlock(synthFromBlockDef(data.type, data))

const visualizeTemplateDef = (data) => {
  const type = esc(data.type)
  if (data.mode === 'slotted') {
    const slots = Object.entries(data.slots || {})
    return `<div class="wf-page">
      <span class="wf-page-tag">template · ${type}</span>
      ${slots.map(([name, def]) => {
        const allowed = def.allows?.[0]
        const sample  = allowed && blockDefIndex[allowed]
          ? wfBlock(synthFromBlockDef(allowed, blockDefIndex[allowed]))
          : '<div class="wf wf-unknown"><span class="wf-tag">(empty)</span></div>'
        return `<div class="wf-zone" data-zone="${esc(name)}">
          <span class="wf-zone-tag">${esc(name)}${def.required ? ' *' : ''} · allows ${(def.allows || []).map(esc).join(', ')}</span>
          ${sample}
        </div>`
      }).join('')}
    </div>`
  }
  if (data.mode === 'sequence') {
    const allowed = data.allows || []
    return `<div class="wf-page">
      <span class="wf-page-tag">template · ${type} · sequence of ${allowed.map(esc).join(', ')}</span>
      <div class="wf-stack">
        ${allowed.map((t) => blockDefIndex[t]
          ? wfBlock(synthFromBlockDef(t, blockDefIndex[t]))
          : `<div class="wf wf-unknown"><span class="wf-tag">${esc(t)}</span></div>`
        ).join('')}
      </div>
    </div>`
  }
  return `<div class="viz-empty">unknown template mode</div>`
}

const visualizePrimitiveDef = (data) => {
  const type = data.type
  if (type === 'action') {
    const intents = data.fields?.intent?.values || ['primary', 'secondary', 'ghost']
    return `<div class="wf-specimen wf-specimen--row">
      ${intents.map((i) => `<div class="wf-specimen-item">
        ${wfBtn(i, 'Sample')}
        <div class="wf-specimen-label">${esc(i)}</div>
      </div>`).join('')}
    </div>`
  }
  if (type === 'icon') {
    const sizes = data.fields?.size?.values || ['sm', 'md', 'lg']
    return `<div class="wf-specimen wf-specimen--row">
      ${sizes.map((s) => `<div class="wf-specimen-item">
        ${wfIcon(s)}
        <div class="wf-specimen-label">${esc(s)}</div>
      </div>`).join('')}
    </div>`
  }
  if (type === 'toggle') {
    return `<div class="wf-specimen wf-specimen--row">
      ${[
        { on: false, state: 'default',  label: 'off' },
        { on: true,  state: 'default',  label: 'on' },
        { on: true,  state: 'disabled', label: 'disabled' },
      ].map((s) => `<div class="wf-specimen-item">
        <div class="wf-toggle" data-on="${s.on}" data-state="${esc(s.state)}"></div>
        <div class="wf-specimen-label">${esc(s.label)}</div>
      </div>`).join('')}
    </div>`
  }
  if (type === 'text-input') {
    const states = data.fields?.state?.values || ['default', 'focused', 'error', 'disabled']
    return `<div class="wf-specimen wf-specimen--stack">
      ${states.map((s) => `<div class="wf-specimen-item wf-specimen-item--row">
        <div class="wf-input" data-state="${esc(s)}"></div>
        <div class="wf-specimen-label">${esc(s)}</div>
      </div>`).join('')}
    </div>`
  }
  // Unknown primitive — render a minimal placeholder that at least lists the
  // schema so the file isn't completely opaque.
  const fields = data.fields ? Object.entries(data.fields) : []
  return `<div class="wf-specimen wf-specimen--stack">
    <div class="def-section-label">no wireframe defined for <code>${esc(type)}</code></div>
    ${fields.length ? `<div class="def-fields">${fields.map(([k, v]) =>
      `<div class="def-field"><span class="def-field-name">${esc(k)}</span><span class="def-type">${esc(v?.type || '?')}</span>${v?.required ? ' <span class="def-req">*</span>' : ''}</div>`
    ).join('')}</div>` : ''}
  </div>`
}

// ---------- Visualization: TOKENS (kept) ----------

const visualizeColors = (data) => `<div class="swatches">${
  Object.entries(data).map(([k, v]) => `
    <div class="swatch">
      <div class="swatch-color" style="background: ${esc(v)}"></div>
      <div class="swatch-meta"><div class="swatch-name">${esc(k)}</div><div class="swatch-val">${esc(v)}</div></div>
    </div>`).join('')
}</div>`

const visualizeSpacing = (data) => `<div class="bars">${
  Object.entries(data).map(([k, v]) =>
    `<div class="bar-row">
      <span class="bar-name">${esc(k)}</span>
      <span class="bar" style="width: ${esc(v)}"></span>
      <span class="bar-val">${esc(v)}</span>
    </div>`).join('')
}</div>`

const visualizeRadius = (data) => `<div class="radii">${
  Object.entries(data).map(([k, v]) =>
    `<div class="radius-item">
      <div class="radius-shape" style="border-radius: ${esc(v)}"></div>
      <div class="radius-name">${esc(k)}</div>
      <div class="radius-val">${esc(v)}</div>
    </div>`).join('')
}</div>`

const visualizeTypography = (data) => {
  let html = ''
  if (data.family) {
    html += `<div class="type-section"><div class="def-section-label">families</div>
      <div class="families">${Object.entries(data.family).map(([k, v]) =>
        `<div class="family-row">
          <span class="family-name">${esc(k)}</span>
          <span class="family-sample" style="font-family: ${esc(v)}">The quick brown fox jumps over the lazy dog</span>
        </div>`).join('')}</div></div>`
  }
  if (data.style) {
    html += `<div class="type-section"><div class="def-section-label">styles</div>
      <div class="styles">${Object.entries(data.style).map(([k, v]) => {
        const size = v.size?.ideal || v.size?.min || 16
        const weight = v.weight || 400
        const lh = v['line-height'] || 1.5
        const ls = v['letter-spacing'] != null ? `letter-spacing: ${v['letter-spacing']}em;` : ''
        return `<div class="type-row">
          <span class="type-name">${esc(k)}</span>
          <span class="type-sample" style="font-size: ${size}px; font-weight: ${weight}; line-height: ${lh}; ${ls}">${esc(k)}</span>
          <span class="type-meta">${size}px · ${weight} · lh ${lh}</span>
        </div>`
      }).join('')}</div></div>`
  }
  return html || `<div class="viz-empty">unknown typography shape</div>`
}

const visualizeRoles = (data) => `<div class="roles">${
  Object.entries(data).map(([category, group]) =>
    `<div class="role-cat">
      <div class="def-section-label">${esc(category)}</div>
      <div class="role-rows">${Object.entries(group).map(([roleName, mappings]) => {
        const cells = Object.entries(mappings).map(([prop, ref]) => {
          const tokenName = ref && typeof ref === 'object' ? ref.token : ref
          return `<span class="role-map"><span class="role-prop">${esc(prop)}</span><span class="role-arrow">→</span><span class="role-token">${esc(tokenName)}</span></span>`
        }).join('')
        return `<div class="role-row"><span class="role-name">${esc(roleName)}</span><div class="role-maps">${cells}</div></div>`
      }).join('')}</div>
    </div>`).join('')
}</div>`

const visualizeTokens = (filename, data) => {
  if (!data || typeof data !== 'object') return ''
  switch (filename) {
    case 'colors.yaml':     return visualizeColors(data)
    case 'spacing.yaml':    return visualizeSpacing(data)
    case 'radius.yaml':     return visualizeRadius(data)
    case 'typography.yaml': return visualizeTypography(data)
    case 'roles.yaml':      return visualizeRoles(data)
    default:                return `<div class="viz-empty">no visualizer for ${esc(filename)}</div>`
  }
}

// ---------- Dispatch + file rendering ----------

const visualize = (file, groupLabel) => {
  if (file.err || !file.data) return `<div class="viz-empty">no data</div>`
  switch (groupLabel) {
    case 'screens':    return visualizeScreen(file.data)
    case 'tokens':     return visualizeTokens(file.name, file.data)
    case 'blocks':     return visualizeBlockDef(file.data)
    case 'templates':  return visualizeTemplateDef(file.data)
    case 'primitives': return visualizePrimitiveDef(file.data)
    default:           return `<div class="viz-empty">—</div>`
  }
}

const renderFile = (file, groupLabel) => {
  const idAttr = esc(file.rel.replace(/[\/.]/g, '-'))
  const sizeKb = (file.size / 1024).toFixed(1)

  if (file.err) {
    return `<article class="file" id="${idAttr}">
      <header>
        <h3>${esc(file.name)}</h3>
        <span class="path">${esc(file.rel)}</span>
        <span class="sz err">parse error</span>
      </header>
      <pre class="err-body">${esc(file.err)}</pre>
    </article>`
  }

  const tree   = `<ul class="tree">${renderNode(file.data)}</ul>`
  const visual = visualize(file, groupLabel)
  const raw    = `<pre class="raw">${esc(file.raw)}</pre>`

  return `<article class="file" id="${idAttr}" data-group="${esc(groupLabel)}">
    <header>
      <h3>${esc(file.name)}</h3>
      <span class="path">${esc(file.rel)}</span>
      <span class="score" title="YAML node count — sort key">complexity ${esc(file.score)}</span>
      <span class="sz">${sizeKb} KB</span>
      <button class="toggle" data-target="raw-${idAttr}">raw</button>
    </header>
    <div class="file-body">
      <div class="col col-tree">
        <div class="col-label">structure</div>
        ${tree}
      </div>
      <div class="col col-visual">
        <div class="col-label">wireframe</div>
        ${visual}
      </div>
    </div>
    <details id="raw-${idAttr}" class="raw-wrap"><summary>YAML source</summary>${raw}</details>
  </article>`
}

const renderGroup = (group, files) => {
  if (files.length === 0) {
    return `<section class="group" id="g-${esc(group.label)}">
      <h2>${esc(group.label)} <span class="meta">empty</span></h2>
      <p class="empty">No <code>.yaml</code> in <code>${esc(group.dir)}</code>.</p>
    </section>`
  }
  return `<section class="group" id="g-${esc(group.label)}">
    <h2>${esc(group.label)} <span class="meta">${files.length}</span> <span class="dir">${esc(group.dir)}/</span></h2>
    ${files.map((f) => renderFile(f, group.label)).join('')}
  </section>`
}

// ---------- Build the index of block defs (used by template wireframes) ----------

const groups = SCAN.map((g) => ({ ...g, files: collect(g) }))

for (const g of groups) {
  if (g.label !== 'blocks') continue
  for (const f of g.files) if (f.data?.type) blockDefIndex[f.data.type] = f.data
}

// ---------- Assemble HTML ----------

// Small groups (templates, screens) stay open. Bulky ones collapse by default.
const ALWAYS_OPEN = new Set(['templates', 'screens'])

const navHtml = groups.map((g) => {
  const items = g.files.map((f) =>
    `<li><a href="#${esc(f.rel.replace(/[\/.]/g, '-'))}">${esc(f.name)}<span class="nav-score">${esc(f.score)}</span></a></li>`
  ).join('')
  const openAttr = ALWAYS_OPEN.has(g.label) ? ' open' : ''
  return `<details class="nav-group"${openAttr}>
    <summary><h4>${esc(g.label)} <span class="meta">${g.files.length}</span></h4></summary>
    <ul>${items}</ul>
  </details>`
}).join('')

// Per-screen mockup links under the storyboard entry — each opens the
// rendered HTML in the same overlay iframe used by storyboard/architecture.
const screensGroup = groups.find((g) => g.label === 'screens')
const screenLinksHtml = (screensGroup?.files || []).map((f) => {
  const slug = f.name.replace(/\.ya?ml$/, '')
  const href = `./screens/${esc(slug)}.html`
  return `<a href="${href}" class="nav-top-link nav-top-link--sub" data-overlay="${href}">${esc(slug)}</a>`
}).join('')

const bodyHtml = groups.map((g) => renderGroup(g, g.files)).join('')

const totalFiles = groups.reduce((n, g) => n + g.files.length, 0)
const generatedAt = new Date().toISOString().replace('T', ' ').slice(0, 19)

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>yamleer — yaml explorer</title>
${faviconLinks}
<style>
  :root {
    --bg: #f5f5f1;
    --panel: #ffffff;
    --ink: #1a1a1a;
    --ink-2: #555;
    --ink-3: #888;
    --line: #e6e6e0;
    --line-2: #c8c8be;
    --accent: #2a5fb8;
    --str: #1a7f37;
    --num: #b1432b;
    --bool: #8250df;

    --wf-bg:      #ffffff;
    --wf-line:    #d6d6cf;
    --wf-line-2:  #aeaea4;
    --wf-line-3:  #4a4a44;
    --wf-border:  #d8d8d0;
    --wf-zone-bg: #faf9f5;
    --wf-page-bg: #ffffff;
    --wf-emphasis-bg:   #1f2733;
    --wf-emphasis-line: rgba(255,255,255,0.35);
    --wf-emphasis-line-strong: rgba(255,255,255,0.75);
    --wf-muted-bg: #efeee8;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: var(--bg); color: var(--ink); }
  body {
    font: 13px/1.5 ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    min-height: 100vh;
  }
  aside {
    position: sticky; top: 0; align-self: start;
    height: 100vh;
    border-right: 1px solid var(--line);
    background: var(--panel);
    font-size: 12px;
    display: flex; flex-direction: column;
  }
  .nav-scroll {
    flex: 1; overflow-y: auto;
    padding: 14px 12px 8px;
  }
  .nav-foot {
    padding: 8px 12px 12px;
    border-top: 1px solid var(--line);
    background: var(--panel);
  }
  .nav-foot .nav-top-link { margin: 0; }
  aside h1 {
    font-size: 13px; margin: 0 0 14px; letter-spacing: 0.05em;
    text-transform: uppercase; color: var(--ink-2);
    display: grid; grid-template-columns: auto 1fr; column-gap: 8px;
    align-items: center;
  }
  aside h1 .wordmark { font-size: 13px; }
  aside h1 .mark { grid-row: span 2; display: inline-flex; }
  aside h1 small { font-weight: 400; color: var(--ink-3); text-transform: none; letter-spacing: 0; margin-top: 2px; font-size: 10px; }
  .nav-top {
    display: flex; flex-direction: column; gap: 4px;
    margin-bottom: 16px; padding-bottom: 12px;
    border-bottom: 1px dashed var(--line);
  }
  .nav-top-link {
    display: block; padding: 4px 6px; border-radius: 3px;
    text-decoration: none; color: var(--ink); font-size: 11px; font-weight: 600;
    background: var(--bg);
  }
  .nav-top-link:hover { background: var(--accent); color: #fff; }
  /* Per-screen mockup links — visually nested under storyboard. */
  .nav-top-link--sub {
    background: transparent; font-weight: 400; font-size: 11px;
    padding: 2px 6px 2px 18px;
    color: var(--ink-2); position: relative;
  }
  .nav-top-link--sub::before {
    content: ""; position: absolute; left: 9px; top: 0; bottom: 0;
    border-left: 1px dotted var(--line-2);
  }
  .nav-top-link--sub:hover { background: var(--bg); color: var(--accent); }

  /* ---- overlay pane (storyboard / architecture inline) ---- */
  #overlay-pane {
    position: fixed; top: 0; right: 0; bottom: 0; left: 220px;
    z-index: 100; background: var(--bg);
    display: flex; flex-direction: column;
  }
  #overlay-pane[hidden] { display: none; }
  .overlay-bar {
    display: flex; align-items: center; gap: 12px;
    padding: 8px 16px;
    border-bottom: 1px solid var(--line);
    background: var(--panel);
  }
  .overlay-title {
    font-weight: 600; font-size: 13px;
    text-transform: lowercase; letter-spacing: 0.01em;
  }
  .overlay-newtab {
    margin-left: auto; font-size: 11px;
    color: var(--accent); text-decoration: none;
  }
  .overlay-newtab:hover { text-decoration: underline; }
  .overlay-close {
    border: 1px solid var(--line); background: var(--bg);
    font: inherit; font-size: 18px; line-height: 1; color: var(--ink-2);
    width: 28px; height: 28px; border-radius: 4px;
    cursor: pointer; padding: 0;
  }
  .overlay-close:hover { background: var(--ink); color: #fff; border-color: var(--ink); }
  .overlay-frame { flex: 1; border: none; width: 100%; background: #fff; }
  body.overlay-open { overflow: hidden; }

  .nav-group { margin-bottom: 10px; }
  .nav-group > summary {
    list-style: none; cursor: pointer; user-select: none;
    display: flex; align-items: center; gap: 6px;
    padding: 2px 6px; border-radius: 3px;
    margin-bottom: 2px;
  }
  .nav-group > summary::-webkit-details-marker { display: none; }
  .nav-group > summary > h4 {
    margin: 0; font-size: 10px; color: var(--ink-3);
    text-transform: uppercase; letter-spacing: 0.06em;
    display: inline-flex; align-items: baseline; gap: 4px;
    flex: 1;
  }
  .nav-group > summary::after {
    content: "+"; color: var(--ink-3); font-size: 13px; font-weight: 500;
    width: 12px; text-align: center; line-height: 1;
  }
  .nav-group[open] > summary::after { content: "−"; }
  .nav-group > summary:hover { background: var(--bg); }
  .nav-group > summary:hover::after { color: var(--accent); }
  .nav-group ul { list-style: none; margin: 0; padding: 0; }
  .nav-group a {
    display: block; padding: 2px 6px; border-radius: 3px;
    text-decoration: none; color: var(--ink); font-size: 11px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .nav-group a:hover { background: var(--bg); color: var(--accent); }
  .nav-group a { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  .nav-score { color: var(--ink-3); font-size: 10px; flex-shrink: 0; }

  main { padding: 20px 24px 80px; min-width: 0; }
  .group { margin-bottom: 36px; }
  .group h2 {
    font-size: 17px; margin: 0 0 14px; padding-bottom: 6px;
    border-bottom: 1px solid var(--line);
  }
  .group h2 .meta { color: var(--ink-3); font-weight: 400; font-size: 13px; }
  .group h2 .dir  { float: right; color: var(--ink-3); font-size: 11px; font-weight: 400; }

  .file {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 5px;
    padding: 10px 14px 14px;
    margin-bottom: 16px;
  }
  .file > header {
    display: flex; align-items: baseline; gap: 12px;
    margin: -2px 0 10px; padding-bottom: 6px;
    border-bottom: 1px dashed var(--line);
  }
  .file > header h3 { margin: 0; font-size: 14px; font-weight: 600; }
  .file > header .path { color: var(--ink-3); font-size: 11px; }
  .file > header .score {
    margin-left: auto; font-size: 10px; color: var(--ink-3);
    background: var(--bg); padding: 1px 6px; border-radius: 2px;
  }
  .file > header .sz  { color: var(--ink-3); font-size: 11px; }
  .file > header .sz.err { color: #b1432b; }
  .file > header .toggle {
    font: inherit; font-size: 11px;
    background: none; border: 1px solid var(--line); border-radius: 3px;
    padding: 1px 8px; cursor: pointer; color: var(--ink-2);
  }
  .file > header .toggle:hover { color: var(--accent); border-color: var(--accent); }

  .file-body {
    display: grid;
    grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
    gap: 18px;
  }
  @media (max-width: 1100px) { .file-body { grid-template-columns: 1fr; } }
  .col { min-width: 0; }
  .col-label {
    font-size: 10px; letter-spacing: 0.07em; text-transform: uppercase;
    color: var(--ink-3); margin-bottom: 8px;
  }
  .col-tree   { border-right: 1px dashed var(--line); padding-right: 18px; }
  @media (max-width: 1100px) { .col-tree { border-right: none; padding-right: 0; } }
  .col-visual { background: var(--bg); border-radius: 4px; padding: 14px; }

  /* ---- tree ---- */
  .tree, .tree ul { list-style: none; margin: 0; padding: 0 0 0 12px; border-left: 1px dotted var(--line); }
  .tree { padding-left: 0; border-left: none; }
  .tree li { padding: 1px 0; }
  .tree details > summary { cursor: pointer; user-select: none; outline: none; list-style: none; }
  .tree details > summary::-webkit-details-marker { display: none; }
  .tree details > summary::before {
    content: "▸"; display: inline-block; width: 10px; color: var(--ink-3); font-size: 8px;
  }
  .tree details[open] > summary::before { content: "▾"; }
  .tree .leaf { padding-left: 10px; }
  .tree .k     { font-weight: 500; }
  .tree .colon { color: var(--ink-3); }
  .tree .meta  { color: var(--ink-3); font-size: 10px; margin-left: 3px; }
  .tree .v-str  { color: var(--str); }
  .tree .v-num  { color: var(--num); }
  .tree .v-bool { color: var(--bool); }
  .tree .v-null { color: var(--ink-3); font-style: italic; }

  .viz-empty { color: var(--ink-3); font-style: italic; padding: 8px; }

  /* ===== WIREFRAME ===== */

  .wf-page {
    border: 1.5px solid var(--line-2);
    border-radius: 8px;
    background: var(--wf-page-bg);
    padding: 26px 14px 14px;
    position: relative;
  }
  .wf-page-tag {
    position: absolute; top: -9px; left: 14px;
    background: var(--bg); padding: 0 8px;
    font-size: 9px; color: var(--ink-3);
    text-transform: uppercase; letter-spacing: 0.07em;
  }

  .wf-zone {
    border: 1px dashed var(--line-2);
    border-radius: 5px;
    padding: 22px 12px 12px;
    margin-bottom: 14px;
    position: relative;
    background: var(--wf-zone-bg);
  }
  .wf-zone:last-child { margin-bottom: 0; }
  .wf-zone-tag {
    position: absolute; top: -8px; left: 10px;
    background: var(--wf-page-bg); padding: 0 6px;
    font-size: 9px; color: var(--ink-3);
    text-transform: uppercase; letter-spacing: 0.06em;
  }

  .wf-stack { display: flex; flex-direction: column; gap: 10px; }

  .wf {
    position: relative;
    background: var(--wf-bg);
    border: 1px solid var(--wf-border);
    border-radius: 5px;
    padding: 22px 16px 16px;
    margin-bottom: 10px;
  }
  .wf:last-child { margin-bottom: 0; }
  .wf[data-tone="muted"]    { background: var(--wf-muted-bg); }
  .wf[data-tone="emphasis"] { background: var(--wf-emphasis-bg); border-color: #0d1219; }
  .wf-tag {
    position: absolute; top: 4px; left: 8px;
    font-size: 9px; color: var(--ink-3);
    letter-spacing: 0.05em; text-transform: uppercase;
  }
  .wf[data-tone="emphasis"] .wf-tag { color: rgba(255,255,255,0.55); }

  .wf-hero    { padding: 26px 22px 22px; }
  .wf-section { padding: 24px 18px 18px; }
  .wf-cta     { padding: 22px 18px 18px; background: #f0efe8; }

  .wf-line {
    background: var(--wf-line);
    border-radius: 3px;
    margin-bottom: 8px;
  }
  .wf-line:last-child { margin-bottom: 0; }
  .wf-line--title   { height: 16px; background: var(--wf-line-3); margin-bottom: 14px; }
  .wf-line--heading { height: 11px; background: var(--wf-line-2); margin-bottom: 10px; }
  .wf-line--body    { height: 6px;  background: var(--wf-line);   margin-bottom: 5px; }
  .wf-line--eyebrow { height: 5px;  background: var(--wf-line-2); margin-bottom: 10px; opacity: 0.7; }

  .wf[data-tone="emphasis"] .wf-line--title   { background: var(--wf-emphasis-line-strong); }
  .wf[data-tone="emphasis"] .wf-line--heading { background: var(--wf-emphasis-line-strong); }
  .wf[data-tone="emphasis"] .wf-line--body    { background: var(--wf-emphasis-line); }

  .wf[data-density="compact"] .wf-line--body { margin-bottom: 3px; }
  .wf[data-density="compact"] { padding-top: 18px; padding-bottom: 12px; }

  .wf-btn {
    display: inline-block;
    height: 28px;
    background: var(--accent);
    border-radius: 3px;
    margin-top: 12px;
  }
  .wf-btn--primary   { background: var(--accent); }
  .wf-btn--secondary { background: #2d2d2d; }
  .wf-btn--ghost     {
    background: transparent;
    border: 1.5px solid var(--accent);
    height: 25px;
  }
  .wf[data-tone="emphasis"] .wf-btn--secondary { background: #f5f5f1; }
  .wf[data-tone="emphasis"] .wf-btn--ghost {
    border-color: rgba(255,255,255,0.7);
  }

  .wf-icon {
    border-radius: 50%;
    background: var(--wf-line);
    flex-shrink: 0;
  }
  .wf-icon--sm { width: 18px; height: 18px; }
  .wf-icon--md { width: 26px; height: 26px; margin-top: 2px; }
  .wf-icon--lg { width: 36px; height: 36px; }

  .wf-row { display: flex; gap: 14px; align-items: flex-start; }
  .wf-row--baseline { align-items: center; }
  .wf-col { flex: 1; min-width: 0; }

  .wf-grid {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    margin-top: 14px;
  }
  .wf[data-density="compact"] .wf-grid { gap: 8px; }

  /* Section children that are row-shaped (setting-row, task-item) stack
     vertically — auto-fit grids would chop them into awkward columns. */
  .wf-rows { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; }
  .wf[data-density="compact"] .wf-rows { gap: 6px; }

  /* Inside a baseline row, button/toggle/check should sit flush with the
     col content, not pushed down by their own stack-margin. */
  .wf-row--baseline > .wf-btn,
  .wf-row--baseline > .wf-toggle,
  .wf-row--baseline > .wf-check,
  .wf-row--baseline > .wf-meta { margin-top: 0; flex-shrink: 0; }

  /* setting-row, task-item, page-header use the .wf base; extra targeting
     only when we need to override default padding for compactness. */
  .wf-setting-row, .wf-task-item { padding: 18px 14px 14px; }
  .wf[data-density="compact"] .wf-setting-row,
  .wf[data-density="compact"] .wf-task-item { padding: 14px 14px 10px; }

  .wf-check {
    width: 16px; height: 16px; border-radius: 4px;
    border: 1.5px solid var(--line-2); background: #fff;
    position: relative;
  }
  .wf-check[data-done="true"] {
    background: var(--accent); border-color: var(--accent);
  }
  .wf-check[data-done="true"]::after {
    content: ""; position: absolute; left: 4px; top: 1px;
    width: 4px; height: 8px;
    border: solid #fff; border-width: 0 1.5px 1.5px 0;
    transform: rotate(45deg);
  }

  .wf-meta {
    height: 6px; background: var(--wf-line); border-radius: 3px;
  }

  .wf-unknown {
    padding: 30px 16px; background: #f5f5f0; border-style: dashed;
    text-align: center; color: var(--ink-3);
  }

  /* specimen — single primitive previews */
  .wf-specimen {
    background: var(--wf-bg); border: 1px solid var(--wf-border);
    border-radius: 5px; padding: 24px; display: flex; flex-wrap: wrap;
    gap: 32px; align-items: center; justify-content: center;
    min-height: 100px;
  }
  .wf-specimen--row   { gap: 28px; }
  .wf-specimen--stack { flex-direction: column; gap: 12px; align-items: stretch; min-height: 0; }
  .wf-specimen-item { display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .wf-specimen-item--row { flex-direction: row; align-items: center; gap: 12px; justify-content: flex-start; }
  .wf-specimen-label {
    font-size: 10px; color: var(--ink-3); letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .wf-specimen .wf-btn { margin-top: 0; }

  /* toggle primitive */
  .wf-toggle {
    display: inline-block; position: relative;
    width: 42px; height: 22px;
    background: #c8c8be; border-radius: 11px;
    transition: background 0.15s;
  }
  .wf-toggle::after {
    content: ""; position: absolute; top: 2px; left: 2px;
    width: 18px; height: 18px; border-radius: 50%;
    background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.18);
    transition: transform 0.15s;
  }
  .wf-toggle[data-on="true"]          { background: var(--accent); }
  .wf-toggle[data-on="true"]::after   { transform: translateX(20px); }
  .wf-toggle[data-state="disabled"]   { opacity: 0.45; }

  /* text-input primitive */
  .wf-input {
    display: inline-flex; align-items: center;
    min-width: 220px; height: 34px;
    padding: 0 12px;
    background: #fff;
    border: 1.5px solid var(--line-2); border-radius: 4px;
  }
  .wf-input::before {
    content: ""; height: 6px; width: 60%;
    background: var(--line-2); border-radius: 2px;
  }
  .wf-input[data-state="focused"] {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(42,95,184,0.18);
  }
  .wf-input[data-state="error"]    { border-color: #b1432b; background: #fff8f6; }
  .wf-input[data-state="error"]::before { background: #b1432b; }
  .wf-input[data-state="disabled"] { background: #f3f3ee; opacity: 0.55; }

  /* ---- tokens ---- */
  .swatches {
    display: grid; gap: 8px;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }
  .swatch {
    background: #fff; border: 1px solid var(--line); border-radius: 4px;
    overflow: hidden;
  }
  .swatch-color { height: 56px; border-bottom: 1px solid var(--line); }
  .swatch-meta  { padding: 5px 8px; }
  .swatch-name  { font-weight: 600; font-size: 11px; }
  .swatch-val   { font-size: 10px; color: var(--ink-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .bars { display: flex; flex-direction: column; gap: 5px; }
  .bar-row {
    display: grid; grid-template-columns: 50px 1fr 60px;
    align-items: center; gap: 8px; font-size: 11px;
  }
  .bar-name { font-weight: 600; }
  .bar      { background: var(--accent); height: 16px; border-radius: 2px; min-width: 1px; }
  .bar-val  { font-size: 10px; color: var(--ink-3); }

  .radii {
    display: grid; gap: 10px;
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  }
  .radius-item { text-align: center; }
  .radius-shape {
    width: 56px; height: 56px; background: var(--accent);
    margin: 0 auto 4px;
  }
  .radius-name { font-size: 11px; font-weight: 600; }
  .radius-val  { font-size: 10px; color: var(--ink-3); }

  .type-section { margin-bottom: 12px; }
  .families, .styles { display: flex; flex-direction: column; gap: 6px; }
  .family-row, .type-row {
    display: grid; grid-template-columns: 100px 1fr auto;
    align-items: baseline; gap: 12px; padding: 6px 8px;
    background: #fff; border-radius: 3px; border: 1px solid var(--line);
  }
  .family-name, .type-name { font-size: 11px; color: var(--ink-3); font-weight: 600; }
  .type-meta { font-size: 10px; color: var(--ink-3); }

  .roles { display: flex; flex-direction: column; gap: 12px; }
  .role-cat { background: #fff; border: 1px solid var(--line); border-radius: 4px; padding: 8px 10px; }
  .role-rows { display: flex; flex-direction: column; gap: 4px; }
  .role-row { display: flex; gap: 10px; align-items: baseline; font-size: 11px; padding: 3px 0; }
  .role-name { font-weight: 600; min-width: 70px; }
  .role-maps { display: flex; flex-wrap: wrap; gap: 8px; }
  .role-map { display: inline-flex; gap: 3px; align-items: center; }
  .role-prop, .role-arrow { color: var(--ink-3); }
  .role-token { background: var(--bg); padding: 1px 5px; border-radius: 2px; font-size: 10px; }

  .def-section-label {
    font-size: 10px; letter-spacing: 0.07em; text-transform: uppercase;
    color: var(--ink-3); margin-bottom: 6px;
  }

  /* ---- raw / errors / shared ---- */
  .raw-wrap { margin-top: 12px; }
  .raw-wrap:not([open]) { display: none; }
  .raw-wrap summary { font-size: 11px; color: var(--ink-3); cursor: pointer; padding: 4px 0; }
  pre.raw {
    background: var(--bg); border: 1px solid var(--line); border-radius: 3px;
    padding: 10px 14px; font-size: 12px; overflow-x: auto; margin: 6px 0 0;
  }
  pre.err-body {
    background: #fff3f0; color: #b1432b;
    border: 1px solid #b1432b; border-radius: 3px;
    padding: 10px 14px; font-size: 12px; overflow-x: auto;
  }
  .empty { color: var(--ink-3); font-style: italic; }
  code { background: var(--bg); padding: 1px 4px; border-radius: 2px; font-size: 12px; }
  footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 11px; color: var(--ink-3); }
</style>
</head>
<body>
<aside>
  <div class="nav-scroll">
    <h1><span class="mark">${inlineMark(28)}</span><span class="wordmark">yamleer</span><small>yaml explorer · ${esc(totalFiles)} files</small></h1>
    <nav class="nav-top">
      <a href="./storyboard.html" class="nav-top-link" data-overlay="./storyboard.html">↗ storyboard</a>
      ${screenLinksHtml}
    </nav>
    ${navHtml}
  </div>
  <div class="nav-foot">
    <a href="./architecture.html" class="nav-top-link" data-overlay="./architecture.html">↗ how it works</a>
  </div>
</aside>
<main>
  ${bodyHtml}
  <footer>Generated ${esc(generatedAt)} · <a href="./architecture.html">how it works</a> · <a href="./storyboard.html">storyboard</a></footer>
</main>

<aside id="overlay-pane" hidden>
  <header class="overlay-bar">
    <span class="overlay-title"></span>
    <a class="overlay-newtab" target="_blank" rel="noopener">open in new tab ↗</a>
    <button class="overlay-close" aria-label="close">×</button>
  </header>
  <iframe class="overlay-frame" src="about:blank"></iframe>
</aside>

<script>
  (() => {
    const overlay = document.getElementById('overlay-pane');
    const frame   = overlay.querySelector('.overlay-frame');
    const title   = overlay.querySelector('.overlay-title');
    const newtab  = overlay.querySelector('.overlay-newtab');
    const open = (url, label) => {
      frame.src = url;
      title.textContent = label;
      newtab.href = url;
      overlay.hidden = false;
      document.body.classList.add('overlay-open');
    };
    const close = () => {
      overlay.hidden = true;
      frame.src = 'about:blank';
      document.body.classList.remove('overlay-open');
    };
    document.querySelectorAll('[data-overlay]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        open(a.dataset.overlay, a.textContent.replace(/^↗\\s*/, ''));
      });
    });
    overlay.querySelector('.overlay-close').addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !overlay.hidden) close();
    });

    // Sidebar yaml-file links navigate to in-page anchors. With the overlay
    // open they look broken (you can't see the file). Close overlay on click
    // so the anchor scroll lands on a visible target.
    document.querySelectorAll('aside .nav-group a[href^="#"]').forEach((a) => {
      a.addEventListener('click', () => {
        if (!overlay.hidden) close();
      });
    });

    // The architecture diagram (loaded inside the overlay iframe) navigates
    // the top window via target=_top to anchors like /#g-tokens. The browser
    // updates the URL hash and tries to scroll the body — but the overlay
    // covers everything, so the scroll lands behind it. Listen for hash
    // changes and close the overlay; then re-trigger the scroll so the
    // target section is actually visible.
    window.addEventListener('hashchange', () => {
      if (!overlay.hidden) close();
      const id = location.hash.slice(1);
      if (id) {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    // On first visit (no hash), jump to focus-today.yaml — the production
    // primary screen. User can still hit ./storyboard.html overlay manually
    // via the storyboard nav link.
    if (!location.hash) {
      location.hash = 'design-screens-focus-today-yaml';
    }
  })();
</script>

<script>
  document.querySelectorAll('.toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const t = document.getElementById(btn.dataset.target);
      if (!t) return;
      t.open = !t.open;
    });
  });
</script>
</body>
</html>
`

mkdirSync(join(ROOT, 'dist'), { recursive: true })
writeFileSync(OUT, html)

console.log(`✓ wrote ${relative(ROOT, OUT)}  (${totalFiles} files across ${groups.length} groups)`)
for (const g of groups) console.log(`    ${g.label.padEnd(12)} ${g.files.length}`)
