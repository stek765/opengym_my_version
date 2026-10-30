/* HTTP surface for the coach — user routes and the admin's credential routes.
 * A factory over server.js's own helpers, so this module has no import cycle. */
import * as cfgStore from './config.js';
import * as oauth from './oauth.js';
import * as jobs from './jobs.js';
import { adapterFor } from './adapters/index.js';

const HTTP_FOR = { off: 503, cap: 429, consent: 403, timeout: 504, provider: 502, unusable: 502 };

export function coachRoutes({ json, readBody, readSession, requireAdmin }) {
  const user = (req, res) => {
    const u = readSession(req);
    if (!u) json(res, 401, { error: 'not signed in' });
    return u;
  };
  const fail = (res, e) => {
    if (e instanceof jobs.CoachError) return json(res, HTTP_FOR[e.code] || 400, { error: e.message, code: e.code });
    throw e;
  };

  return {
    'GET /api/coach/chat': async (req, res) => {
      const u = user(req, res); if (!u) return;
      json(res, 200, { messages: jobs.readChat(u.id), files: jobs.listFiles(u.id), cap: jobs.capState(u.id), on: cfgStore.isEnabled() && cfgStore.isConnected() });
    },

    'POST /api/coach/chat/clear': async (req, res) => {
      const u = user(req, res); if (!u) return;
      const { kind } = await readBody(req);
      jobs.clearChat(u.id, String(kind || 'chat'));
      json(res, 200, { ok: true });
    },

    'POST /api/coach/ask': async (req, res) => {
      const u = user(req, res); if (!u) return;
      const { text } = await readBody(req);
      if (!String(text || '').trim()) return json(res, 400, { error: 'scrivi qualcosa' });
      try { json(res, 200, await jobs.ask(u.id, String(text).slice(0, 4000))); } catch (e) { fail(res, e); }
    },

    'POST /api/coach/cue': async (req, res) => {
      const u = user(req, res); if (!u) return;
      const { exId } = await readBody(req);
      try { json(res, 200, await jobs.cue(u.id, String(exId || ''))); } catch (e) { fail(res, e); }
    },

    'POST /api/coach/classify': async (req, res) => {
      const u = user(req, res); if (!u) return;
      const { name } = await readBody(req);
      try { json(res, 200, await jobs.classify(u.id, String(name || '').slice(0, 120))); } catch (e) { fail(res, e); }
    },

    // Answers at once; the comment arrives later in the chat and as a notification.
    'POST /api/coach/after-workout': async (req, res) => {
      const u = user(req, res); if (!u) return;
      const { workoutId } = await readBody(req);
      jobs.afterWorkout(u.id, String(workoutId || ''));
      json(res, 202, { ok: true });
    },

    // A PDF from the nutritionist, as base64 JSON (the body limit keeps it to a few MB).
    'POST /api/coach/files': async (req, res) => {
      const u = user(req, res); if (!u) return;
      const { name, data } = await readBody(req);
      const buf = Buffer.from(String(data || ''), 'base64');
      if (buf.subarray(0, 5).toString() !== '%PDF-') return json(res, 400, { error: 'serve un PDF' });
      json(res, 200, { name: jobs.saveFile(u.id, name, buf), files: jobs.listFiles(u.id) });
    },

    /* ------------------------------ admin ------------------------------ */

    'GET /api/admin/coach': async (req, res) => {
      if (!requireAdmin(req, res)) return;
      const cfg = cfgStore.load();
      const adapter = adapterFor(cfg.provider);
      const check = adapter ? await adapter.check(cfg, cfgStore.jobEnv(process.env.TMPDIR || '/tmp')) : { ok: false, error: 'unknown provider' };
      const log = cfg.log || [];
      const today = new Date().toISOString().slice(0, 10);
      json(res, 200, {
        disabledByEnv: cfgStore.COACH_DISABLED,
        enabled: !!cfg.enabled,
        provider: cfg.provider,
        model: cfg.model,
        caps: cfg.caps,
        runtime: { ok: !!check.ok, version: check.version || null, error: check.error || null },
        auth: await oauth.liveAuthStatus(),
        // Counts and outcomes only — never intake answers, payloads or proposals (FR-12/A4).
        jobsToday: log.filter(e => (e.at || '').slice(0, 10) === today).length,
        lastSuccess: cfgStore.lastSuccess(),
        lastError: cfgStore.lastError(),
        recent: log.slice(-20).reverse().map(e => ({ at: e.at, kind: e.kind, trigger: e.trigger, outcome: e.outcome, errorClass: e.errorClass, ms: e.ms }))
      });
    },

    'POST /api/admin/coach/config': async (req, res) => {
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      const patch = {};
      if (body.enabled !== undefined) patch.enabled = !!body.enabled;
      if (body.provider !== undefined) {
        if (!cfgStore.PROVIDERS[body.provider]) return json(res, 400, { error: 'unknown provider' });
        // Credentials belong to the provider that issued them.
        if (body.provider !== cfgStore.load().provider) patch.auth = null;
        patch.provider = body.provider;
      }
      if (body.model !== undefined) patch.model = body.model ? String(body.model).slice(0, 80) : null;
      if (body.caps) {
        patch.caps = {
          perProfileDaily: Math.max(0, Math.min(200, +body.caps.perProfileDaily || 0)),
          instanceDaily: Math.max(0, Math.min(5000, +body.caps.instanceDaily || 0))
        };
      }
      cfgStore.save(patch);
      json(res, 200, { ok: true });
    },

    'POST /api/admin/coach/test': async (req, res) => {
      if (!requireAdmin(req, res)) return;
      const r = await jobs.testRun();
      json(res, 200, r);
    },

    'POST /api/admin/coach/auth/setup-token': async (req, res) => {
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      try {
        oauth.setSetupToken(body.token);
        const test = await jobs.testRun();
        json(res, 200, { ok: true, test });
      } catch (e) { json(res, 400, { error: e.message }); }
    },

    'POST /api/admin/coach/auth/disconnect': async (req, res) => {
      if (!requireAdmin(req, res)) return;
      try {
        await oauth.disconnect();
        json(res, 200, { ok: true });
      } catch (e) { json(res, 400, { error: e.message }); }
    }
  };
}
