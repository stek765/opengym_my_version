import { EXIDX, imgSrc } from '../lib/exercises.js'
import Icon from './Icon.jsx'

// The library picture of an exercise; exercises he invented have none, so they get an icon.
// No size: it fills its box (the routine posters).
export default function Thumb({ id, size, icon = 'dumbbell' }) {
  const ex = EXIDX[id]
  const st = size ? { width: size, height: size } : null
  return ex?.img
    ? <img className="thumb" src={imgSrc(ex)} alt="" loading="lazy" style={st} />
    : <span className="thumb none" style={st}><Icon name={icon} size={Math.round((size || 40) * .45)} /></span>
}
