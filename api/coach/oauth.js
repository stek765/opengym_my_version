/* Coach credential storage (legacy filename kept so imports stay stable).
 *
 * The owner creates a Claude Code setup token on a trusted machine with `claude setup-token`
 * and sets it as CLAUDE_SETUP_TOKEN in .env (or posts it to /api/admin/coach/auth/setup-token).
 * It is encrypted at rest and injected only
 * into the unprivileged Agent SDK subprocess for the life of a job. */
import { load, save, encrypt, decrypt } from './config.js';

/** Store the setup token without ever returning it to a client. */
export function setSetupToken(rawToken) {
  const token = String(rawToken || '').trim();
  if (!token) throw new Error('paste the token printed by claude setup-token');
  save({ auth: { type: 'cli-token', connectedAt: new Date().toISOString(), account: null, data: encrypt({ token }) } });
}

/** CLAUDE_SETUP_TOKEN in .env connects and turns on the coach at startup: no admin screen needed. */
export function connectFromEnv(token = process.env.CLAUDE_SETUP_TOKEN) {
  if (!token) return false;
  setSetupToken(token);
  save({ enabled: true, provider: 'claude' });
  return true;
}

export async function disconnect() { save({ auth: null }); }

/** Credential view for the admin route. Never returns the token itself. */
export function authStatus() {
  const cfg = load();
  if (!cfg.auth) return { state: 'disconnected' };
  if (!decrypt(cfg.auth.data)) return { state: 'unreadable' };   // ./data restored without its secret file
  if (cfg.auth.type !== 'cli-token') return { state: 'replace-required', type: cfg.auth.type, connectedAt: cfg.auth.connectedAt };
  if (cfg.auth.expired) return { state: 'expired', connectedAt: cfg.auth.connectedAt };
  return { state: 'connected', type: cfg.auth.type, connectedAt: cfg.auth.connectedAt };
}

export const liveAuthStatus = async () => authStatus();
