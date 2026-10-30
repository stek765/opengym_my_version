import { api } from './api.js'

const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body || {}) })

export const getChat = () => api('/api/coach/chat')
export const clearChat = kind => post('/api/coach/chat/clear', { kind })
export const askCoach = text => post('/api/coach/ask', { text })
export const cue = exId => post('/api/coach/cue', { exId })
export const classify = name => post('/api/coach/classify', { name })
export const afterWorkout = workoutId => post('/api/coach/after-workout', { workoutId })

export async function uploadPdf(file) {
  const data = await new Promise((ok, ko) => {
    const r = new FileReader()
    r.onload = () => ok(String(r.result).split(',')[1])
    r.onerror = ko
    r.readAsDataURL(file)
  })
  return post('/api/coach/files', { name: file.name, data })
}
