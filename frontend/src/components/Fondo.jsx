import { useEffect, useLayoutEffect, useRef } from 'react'

// The background behind every screen: black, with soft blurred patches of the section's colour that drift
// like water (Allenati light blue, Esercizi green; swapped 21/11) or rise like fire (Coach red, workout yellow). Chosen 21/11:
// «nero con mix sfumati che si muovono, come acqua o fuoco, prevalenza nero».
const SEC = {
  allenati: { c1: '#67d4ff', c2: '#0277bd', fire: 0 },
  esercizi: { c1: '#4ade80', c2: '#0f766e', fire: 0 },
  coach: { c1: '#ff5a3c', c2: '#9f1239', fire: 1 },
  allenamento: { c1: '#ffe14d', c2: '#f5a400', fire: 1, glow: 1 },   // brighter: «sfondo più giallo» (21/11)
}
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
// A dark shade of the section's deep colour (--top): the tab bar and the band iOS leaves under it.
// The page runs under the clock (black-translucent), so the moving background itself is behind the status bar.
// index.html has the same values for the first frame after a reload.
const STRIP = .3
export const stripOf = sec => '#' + rgb((SEC[sec] || SEC.allenati).c2).map(v => Math.round(v * STRIP * 255).toString(16).padStart(2, '0')).join('')

// Domain-warped noise: a field that folds on itself like smoke or water. Only its peaks get colour,
// so most of the screen stays black. Fire flows upward and is stronger toward the bottom.
const FRAG = `precision mediump float;
uniform vec2 r; uniform float t, fire, glow; uniform vec3 c1, c2;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++){ v += a*n(p); p = p*2.03 + vec2(1.7, 9.2); a *= .5; } return v; }
void main(){
  vec2 p = gl_FragCoord.xy / r.y * 1.7;
  float y = gl_FragCoord.y / r.y;   // 0 at the bottom, 1 at the top
  vec2 flow = mix(vec2(t*.035, t*.015), vec2(t*.01, -t*.11), fire);
  vec2 q = vec2(fbm(p + flow), fbm(p + vec2(5.2, 1.3) - flow*.6));
  float f = fbm(p + 2.4*q + flow);
  float m = smoothstep(.36 - glow*.14, .76 - glow*.1, f) * mix(1., 1.3 - y*(1. - glow*.5), fire);   // glow: more of the screen lit
  vec3 col = c2*(.07 + glow*.1) + mix(c2, c1, smoothstep(.5, .82, f)) * clamp(m, 0., 1.) * 1.15;   // a faint veil of colour even in the black
  gl_FragColor = vec4(col, 1.);
}`

export default function Fondo({ sec }) {
  const ref = useRef(null)
  useEffect(() => {
    const cv = ref.current, gl = cv.getContext('webgl', { antialias: false, alpha: false })
    if (!gl) return   // no WebGL: the page stays black, everything still works
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s }
    const pr = gl.createProgram()
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }'))
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr); gl.useProgram(pr)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    const u = k => gl.getUniformLocation(pr, k)
    // ponytail: drawn at a quarter of the screen and ~20 fps, upscaled by CSS; the blur hides the pixels
    const size = () => { cv.width = innerWidth / 4; cv.height = innerHeight / 4; gl.viewport(0, 0, cv.width, cv.height) }
    size(); addEventListener('resize', size)
    const s = SEC[sec] || SEC.allenati
    gl.uniform3fv(u('c1'), rgb(s.c1)); gl.uniform3fv(u('c2'), rgb(s.c2)); gl.uniform1f(u('fire'), s.fire); gl.uniform1f(u('glow'), s.glow || 0)
    let raf, last = 0
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    // Still while anything scrolls: a full-screen blurred redraw every 50 ms fights the scroll on the
    // phone (and the glass bars re-blur over it). It picks up again 200 ms after the scroll stops.
    let quiet = 0
    const scrolling = () => { quiet = performance.now() + 200 }
    addEventListener('scroll', scrolling, { capture: true, passive: true })
    const draw = ms => {
      if (ms > quiet && ms - last > 50) { last = ms; gl.uniform2f(u('r'), cv.width, cv.height); gl.uniform1f(u('t'), 30 + ms / 1000); gl.drawArrays(gl.TRIANGLES, 0, 3) }
      if (!still) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', size); removeEventListener('scroll', scrolling, { capture: true }) }
  }, [sec])
  useLayoutEffect(() => {   // before the new screen's first paint
    const c = stripOf(sec), h = document.documentElement
    h.style.background = c; h.style.setProperty('--top', c)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', c)
  }, [sec])
  return <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black">
    {/* 16px past every edge: the blur would otherwise pull black in at the borders (a dark line under the strip) */}
    <canvas ref={ref} className="absolute -left-4 -top-4 h-[calc(100%+2rem)] w-[calc(100%+2rem)] blur-md" />
  </div>
}
