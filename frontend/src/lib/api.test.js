import { it, expect, vi } from 'vitest'
import { api } from './api.js'

it('a non-JSON gateway error becomes an Italian message', async () => {
  vi.stubGlobal('fetch', async () => new Response('<html>504</html>', { status: 504 }))
  await expect(api('/api/coach/ask')).rejects.toThrow('Il server non ha risposto in tempo, riprova')
})
it('a JSON error keeps the server message', async () => {
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ error: 'per oggi il coach ha finito' }), { status: 429 }))
  await expect(api('/x')).rejects.toThrow('per oggi il coach ha finito')
})
