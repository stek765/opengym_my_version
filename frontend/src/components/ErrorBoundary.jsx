import { Component } from 'react'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import { Button } from '@/components/ui/button'

/**
 * Last line of defence: one bad render used to blank the whole app, with no way back —
 * a workout referencing an exercise the build doesn't know would white-screen and, since
 * the running workout is persisted, do it again on every reload.
 *
 * Sits inside #app so the tab bar stays usable; the shell keys this subtree on the route,
 * so switching tabs re-mounts it and clears the error by itself.
 */
export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false } }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err) { console.error('openGym render error:', err) }

  render() {
    if (!this.state.failed) return this.props.children
    const active = useStore.getState().S.active
    return (
      <div className="narrow flex min-h-[70vh] flex-col items-center justify-center text-center">
        <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-raised text-muted-foreground"><Icon name="info" size={28} /></span>
        <b className="text-[20px] font-semibold">{t('Something went wrong')}</b>
        <p className="mb-8 mt-1 max-w-72 text-[15px] leading-snug text-muted-foreground">{t('This screen could not be drawn. Your data is safe on this device.')}</p>
        <div className="flex w-full flex-col gap-2.5">
          <Button size="lg" className="w-full" onClick={() => location.reload()}><Icon name="reset" />{t('Reload openGym')}</Button>
          {active && <Button size="lg" variant="destructive" className="w-full" onClick={() => {
            useStore.getState().update(s => { s.active = null })
            location.reload()
          }}><Icon name="trash" />{t('Discard the running workout')}</Button>}
        </div>
      </div>
    )
  }
}
