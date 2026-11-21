import { useState } from 'react'
import { EXIDX, gifSrc } from '../lib/exercises.js'
import { VIDEOS } from '../lib/videos.js'
import Thumb from './Thumb.jsx'
import Icon from './Icon.jsx'
import { t } from '../lib/i18n.js'

// How to do an exercise, big: a demo video when there is one (loaded only on tap: an iframe per
// exercise would weigh on the gym's mobile data), else the library's animation, else the drawing.
export default function HowTo({ id, className = '' }) {
  const [play, setPlay] = useState(false)
  const v = VIDEOS[id], ex = EXIDX[id]
  // the close sits under the video: YouTube's own controls own every corner of it
  if (v && play) return <div className={className}>
    <iframe className="aspect-video w-full rounded-xl bg-black" title={t('Come si fa')}
      src={`https://www.youtube-nocookie.com/embed/${v[0]}?autoplay=1&playsinline=1&rel=0&start=${v[1] || 0}`}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
    <button className="ml-auto mt-1 flex h-9 items-center gap-1 rounded-full px-3 text-[15px] font-medium text-muted-foreground active:opacity-60" onClick={() => setPlay(false)}><Icon name="xmark" size={18} />{t('Chiudi video')}</button>
  </div>
  if (v) return <button className={'relative block w-full ' + className} onClick={() => setPlay(true)}>
    <Thumb id={id} icon="play" className="h-44 w-full !rounded-xl" />
    <span className="absolute bottom-3 left-3 flex h-9 items-center gap-1.5 rounded-full bg-black/75 px-3.5 text-[15px] font-semibold text-white"><Icon name="play" size={16} />{t('Come si fa')}</span>
  </button>
  if (ex?.gif) return <span className={'block h-44 w-full overflow-hidden rounded-xl bg-white ' + className}><img className="size-full object-contain" src={gifSrc(ex)} alt="" /></span>
  return <Thumb id={id} className={'h-44 w-full !rounded-xl ' + className} />
}
