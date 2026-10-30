// Brings any older state up to the current shape. Only adds; never drops a field, so a
// state that went through here can still be read by the previous build.
const ADD = { exNames: {}, incr: {}, muscles: {}, threshold: 10 }

export function migrateState(S) {
  const out = { ...S }
  for (const [k, v] of Object.entries(ADD)) if (out[k] == null) out[k] = JSON.parse(JSON.stringify(v))
  out.schemaV = 2
  return out
}
