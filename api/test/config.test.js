import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tempData, sampleState } from './helpers.mjs';

const DIR = tempData();
const cfg = await import('../coach/config.js');
const auth = await import('../coach/oauth.js');

/* ---------------- configuration ---------------- */

test('an unconfigured instance offers nothing at all', () => {
  assert.equal(cfg.isEnabled(), false);
  assert.equal(cfg.isConnected(), false);
  assert.equal(cfg.publicConfig(), null, 'no coach key in /api/config ⇒ no Coach UI anywhere');
});

test('a provider that is enabled but not signed in is still not offered', () => {
  cfg.save({ enabled: true, provider: 'claude' });
  assert.equal(cfg.isEnabled(), true);
  assert.equal(cfg.isConnected(), false);
  assert.equal(cfg.publicConfig(), null, 'half-configured is off, not broken');
});

test('credentials survive a round-trip and are unreadable in the file', () => {
  cfg.save({ enabled: true, provider: 'claude', auth: { type: 'cli-token', data: cfg.encrypt({ token: 'cli-setup-secret' }) } });
  assert.equal(cfg.isConnected(), true);
  const onDisk = fs.readFileSync(`${DIR}/coach.json`, 'utf8');
  assert.ok(!onDisk.includes('cli-setup-secret'), 'the token is not sitting in the file in the clear');
  assert.equal(cfg.decrypt(cfg.load().auth.data).token, 'cli-setup-secret');
});

test('a credential encrypted under a different secret fails closed', () => {
  const blob = cfg.encrypt({ token: 'sk-ant-secret' });
  fs.writeFileSync(`${DIR}/secret`, 'b'.repeat(64));
  cfg.reset();
  assert.equal(cfg.decrypt(blob), null, 'restoring ./data without its secret does not leak the token');
  fs.writeFileSync(`${DIR}/secret`, 'a'.repeat(64));
  cfg.reset();
});

test('a Claude Code setup token is encrypted and reaches only the Agent SDK environment', () => {
  cfg.save({ enabled: true, provider: 'claude', auth: null });
  auth.setSetupToken('cli-setup-tok');
  assert.equal(cfg.load().auth.type, 'cli-token');
  assert.equal(auth.authStatus().type, 'cli-token');
  process.env.RP_ID = 'gym.example.com';
  process.env.ADMIN_UIDS = 'someadmin';
  const env = cfg.jobEnv('/tmp/jobdir');
  assert.equal(env.CLAUDE_CODE_OAUTH_TOKEN, 'cli-setup-tok');
  assert.equal(env.HOME, '/tmp/jobdir', 'the Agent SDK writes any transient state into the job dir');
  assert.equal(env.CLAUDE_CONFIG_DIR, '/tmp/jobdir');
  assert.equal(env.CLAUDE_CODE_DISABLE_AUTO_MEMORY, '1');
  assert.equal(env.RP_ID, undefined, 'nothing is inherited from this process');
  assert.equal(env.ADMIN_UIDS, undefined);
  assert.deepEqual(Object.keys(env).sort(), ['CLAUDE_CODE_DISABLE_AUTO_MEMORY', 'CLAUDE_CODE_OAUTH_TOKEN', 'CLAUDE_CONFIG_DIR', 'HOME', 'PATH', 'TMPDIR']);
});

test('retired Gemini and Custom command configurations reset to unconfigured Claude', () => {
  cfg.save({
    enabled: true,
    provider: 'gemini',
    customCommand: '/usr/local/bin/my-coach',
    auth: { type: 'apikey', data: cfg.encrypt({ token: 'gemini-key' }) }
  });
  cfg.reset();
  const current = cfg.load();
  assert.deepEqual(Object.keys(cfg.PROVIDERS).sort(), ['claude']);
  assert.equal(current.provider, 'claude');
  assert.equal(current.auth, null);
  assert.equal(Object.hasOwn(current, 'customCommand'), false);
  assert.equal(cfg.isConnected(), false);
});

test('legacy Claude credentials are disabled until replaced with a setup token', () => {
  cfg.save({ enabled: true, provider: 'claude', auth: { type: 'apikey', data: cfg.encrypt({ token: 'sk-ant-key' }) } });
  assert.equal(cfg.isConnected(), false);
  assert.equal(auth.authStatus().state, 'replace-required');
  const env = cfg.jobEnv('/tmp/jobdir');
  assert.equal(env.ANTHROPIC_API_KEY, undefined);
  assert.equal(env.CLAUDE_CODE_OAUTH_TOKEN, undefined);
});

test('the instance job log records outcomes, never contents', () => {
  cfg.save({ log: [] });
  cfg.logJob({ at: new Date().toISOString(), uid: 'u1', kind: 'review', outcome: 'ready', ms: 1200 });
  cfg.logJob({ at: new Date().toISOString(), uid: 'u1', kind: 'review', outcome: 'failed', errorClass: 'auth', ms: 400 });
  const log = cfg.load().log;
  assert.equal(log.length, 2);
  assert.equal(cfg.lastError().errorClass, 'auth');
  assert.equal(cfg.lastSuccess().outcome, 'ready');
  assert.ok(!JSON.stringify(log).includes('changes'), 'no proposal content ever reaches the instance log');
});



const coachWith = over => ({ consent: { agreedAt: '2026-01-01T00:00:00Z' }, ...over });

test('CLAUDE_SETUP_TOKEN connects and enables the coach, stored encrypted', async () => {
  const { connectFromEnv } = await import('../coach/oauth.js');
  cfg.save({ enabled: false, auth: null });
  assert.equal(connectFromEnv(''), false);
  assert.equal(cfg.isConnected(), false);
  assert.equal(connectFromEnv('env-token'), true);
  assert.equal(cfg.isConnected(), true);
  assert.equal(cfg.decrypt(cfg.load().auth.data).token, 'env-token');
  assert.ok(!fs.readFileSync(`${DIR}/coach.json`, 'utf8').includes('env-token'));
});
