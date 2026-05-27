// brand.js — shared logo/favicon SVG used by every renderer.
//
// Mark concept: schema brackets. Four L-shaped corner markers frame an
// implicit "schema scope", and inside sit two data points — one neutral,
// one accent blue. Reads as "structured/validated data": yamleer takes
// YAML schemas and frames them into rendered artifacts. The corner
// brackets also evoke crop marks / viewport indicators, tying in with
// the wireframe metaphor used throughout the explorer.

const MARK_BODY = `
  <rect width="32" height="32" rx="6" fill="#1a1a1a"/>
  <path d="M 6 12 L 6 6 L 12 6 L 12 8 L 8 8 L 8 12 Z" fill="#ffffff"/>
  <path d="M 20 6 L 26 6 L 26 12 L 24 12 L 24 8 L 20 8 Z" fill="#ffffff"/>
  <path d="M 6 20 L 8 20 L 8 24 L 12 24 L 12 26 L 6 26 Z" fill="#ffffff"/>
  <path d="M 24 20 L 26 20 L 26 26 L 20 26 L 20 24 L 24 24 Z" fill="#ffffff"/>
  <rect x="11.5" y="14" width="4" height="4" rx="0.5" fill="#d6d6cf"/>
  <rect x="16.5" y="14" width="4" height="4" rx="0.5" fill="#2a5fb8"/>`

// Mark only — for use as favicon (data-URI) and as the small symbol next
// to the wordmark. Self-contained, no external font/color refs.
export const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${MARK_BODY}</svg>`

// Inline mark sized for inline placement (e.g. next to a wordmark).
// Pass size in px. Returns string ready to drop into HTML.
export const inlineMark = (size = 18) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true" focusable="false">${MARK_BODY}</svg>`

// Same mark encoded as a data-URI suitable for <link rel="icon" href="...">.
// Inlined so no extra file copying is needed in the build pipeline.
const encoded = encodeURIComponent(markSvg.replace(/\s+/g, ' ').trim())
export const faviconDataUri = `data:image/svg+xml;charset=utf-8,${encoded}`

// Drop-in <link> tags for the document <head>. Includes a PNG-less fallback
// chain that modern browsers accept.
export const faviconLinks = `<link rel="icon" type="image/svg+xml" href="${faviconDataUri}">`
