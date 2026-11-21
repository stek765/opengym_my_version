import { EXIDX, imgSrc } from '../lib/exercises.js'
import Icon from './Icon.jsx'

// The library drawing of an exercise on its own white tile; exercises he invented get an icon instead.
// No size: it fills its box.
export default function Thumb({ id, size, icon = 'dumbbell', className = '' }) {
  const ex = EXIDX[id]
  const st = size ? { width: size, height: size } : null
  return ex?.img
    ? <span className={'inline-flex shrink-0 overflow-hidden rounded-[10px] bg-white ' + className} style={st}><img className="size-full object-contain" src={imgSrc(ex)} alt="" loading="lazy" onError={e => { e.currentTarget.style.visibility = 'hidden' }} /></span>
    : <span className={'inline-flex shrink-0 items-center justify-center rounded-[10px] bg-raised text-muted-foreground ' + className} style={st}><Icon name={icon} size={Math.round((size || 40) * .45)} /></span>
}
