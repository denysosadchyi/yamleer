// Walker 3: token-references.
//
// Walks the YAML under validation looking for the pattern
//     { token: <identifier> }
// and verifies that <identifier> exists as a key in
// design/tokens/colors.yaml (the canonical token registry).
//
// Pattern occurs in:
//   - design/tokens/roles.yaml — tone.<x>.{surface,text,border}.token and
//     color-role.<x>.token reference color names
//   - design/screens/*.yaml (potential future) — inline color overrides
//   - design/content/*.yaml (potential future) — inline color references
//
// Schema only constrains the value to be an identifier string; it cannot
// check existence across files. This walker closes that gap.

export function tokenReferences(yamlContent, context) {
  if (!yamlContent || typeof yamlContent !== 'object') return []

  const knownTokens = new Set(Object.keys(context.tokens.colors || {}))
  const errors = []

  walk(yamlContent, (node, path) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return
    if (typeof node.token !== 'string') return

    const name = node.token
    if (!knownTokens.has(name)) {
      const sample = [...knownTokens].sort().slice(0, 6).join(', ')
      const total = knownTokens.size
      errors.push({
        walker: 'token-references',
        path: path === '' ? '/' : path,
        message: `unknown token "${name}" — not a key in design/tokens/colors.yaml (${total} known: ${sample}${total > 6 ? ', …' : ''})`,
      })
    }
  })

  return errors
}

function walk(node, callback, path = '') {
  callback(node, path)
  if (node === null || typeof node !== 'object') return
  if (Array.isArray(node)) {
    node.forEach((item, i) => walk(item, callback, `${path}[${i}]`))
    return
  }
  for (const [key, value] of Object.entries(node)) {
    walk(value, callback, path ? `${path}.${key}` : key)
  }
}
