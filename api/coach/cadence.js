/* The coach's Sunday recap: Sunday at 18:00 in the person's own timezone, once per date. */
import * as jobs from './jobs.js';
import * as cfgStore from './config.js';

const TICK_MS = 30000;

export const weeklyDue = (now, lastDate) => !!now && now.weekday === 0 && now.hhmm === '18:00' && lastDate !== now.date;

/** @param deps { users(): [{id}], userNow(tz): {date,hhmm,weekday} } */
export function startCadence(deps) {
  const timer = setInterval(() => {
    if (!cfgStore.isEnabled() || !cfgStore.isConnected()) return;
    for (const user of deps.users()) {
      const S = jobs.readState(user.id);
      if (!S?.coach?.consent?.agreedAt) continue;
      if (weeklyDue(deps.userNow(S.tz || 'Europe/Rome'), jobs.lastWeekly(user.id))) jobs.weekly(user.id);
    }
  }, TICK_MS);
  timer.unref();
  return timer;
}
