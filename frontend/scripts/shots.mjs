// Screenshots of the app at iPhone size, as a local-only guest with a given state.
// node scripts/shots.mjs <state.json> <outDir> <route[@carta|@nero]>...   (needs `npm run dev` on :5181)
import { chromium, devices } from 'playwright-core'
import fs from 'node:fs'
const [stateFile, out, ...routes] = process.argv.slice(2)
const exe = process.env.CHROME || `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell`
const state = fs.readFileSync(stateFile, 'utf8')
const b = await chromium.launch({ executablePath: exe })
fs.mkdirSync(out, { recursive: true })
for (const spec of routes) {
  const [route, scheme] = spec.split('@')
  const ctx = await b.newContext({ ...devices['iPhone 13'], colorScheme: scheme === 'nero' ? 'dark' : 'light' })
  await ctx.addInitScript(s => { if (!sessionStorage.seeded) { localStorage.setItem('gym_state_v1', s); localStorage.setItem('gym_guest', '1'); sessionStorage.seeded = 1 } }, state)
  const p = await ctx.newPage()
  p.on('pageerror', e => console.log('pageerror', route, String(e)))
  await p.goto('http://localhost:5181/#/' + route)
  await p.waitForTimeout(900)
  await p.screenshot({ path: `${out}/${route.replace(/\//g, '_')}${scheme ? '-' + scheme : ''}.png` })
  await ctx.close()
}
await b.close()
