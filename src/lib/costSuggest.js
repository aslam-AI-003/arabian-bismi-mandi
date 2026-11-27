// Suggest cost prices for other sizes of the same dish from one size the
// owner already filled in: Couple = 2 x Single, Family = 4 x Single,
// Half = 2 x Quarter, Full = 4 x Quarter, "6 pcs" = 3 x "2 pcs".

export function sizeFactor(variant) {
  const v = String(variant || '').toLowerCase().trim()
  if (!v) return null
  const pcs = v.match(/(\d+)\s*pcs?\b/)
  if (pcs) return Number(pcs[1])
  if (/\b(single|quarter)\b/.test(v)) return 1
  if (/\b(couple|half)\b/.test(v)) return 2
  if (/\b(family|full)\b/.test(v)) return 4
  return null
}

/**
 * items: [{ id, name, variant }]; costs: Map/obj id -> number|''.
 * Returns Map id -> suggested cost for items with no cost yet.
 */
export function suggestCosts(items, costs) {
  const get = (id) => (costs instanceof Map ? costs.get(id) : costs[id])
  const groups = new Map()
  for (const it of items) {
    const k = it.name.trim().toLowerCase()
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(it)
  }
  const out = new Map()
  for (const list of groups.values()) {
    if (list.length < 2) continue
    const base = list
      .map((it) => ({ it, f: sizeFactor(it.variant), c: Number(get(it.id)) }))
      .filter((x) => x.f && get(x.it.id) !== '' && get(x.it.id) != null && x.c > 0)
      .sort((a, b) => a.f - b.f)[0]
    if (!base) continue
    for (const it of list) {
      const has = get(it.id)
      const f = sizeFactor(it.variant)
      if ((has === '' || has == null) && f) out.set(it.id, Math.round((base.c / base.f) * f * 100) / 100)
    }
  }
  return out
}
