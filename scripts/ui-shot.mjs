#!/usr/bin/env node
// Screenshots the dev server in headless Edge at the phone's viewport
// (S24 Ultra ≈ 412×915 CSS px), so layouts can be checked without touching
// the phone or its data. Each run uses a fresh browser profile, so its
// IndexedDB is disposable.
//
//   npm run dev                      # in another terminal (port 5174)
//   node scripts/ui-shot.mjs <out-dir> [steps.json]
//
// steps.json is a list of { path?, js?, wait?, shot? }:
//   path  navigate to BASE_URL + path first
//   js    async code run in the page; helpers: tap(text), type(selector, text),
//         sleep(ms); dynamic import('/src/db/queries.ts') etc. work in dev
//   shot  save a PNG with this name
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const EDGE = process.env.EDGE_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = process.env.BASE_URL ?? 'http://localhost:5174';
const PORT = 9399;
const [outDir = 'ui-shots', stepsFile] = process.argv.slice(2);
const steps = stepsFile ? JSON.parse(readFileSync(stepsFile, 'utf8')) : [{ path: '/', shot: 'home.png' }];
mkdirSync(outDir, { recursive: true });

const HELPERS = `
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const tap = (text) => {
    const all = [...document.querySelectorAll('button, a, [role=radio]')];
    const el =
      all.find((e) => e.textContent.trim() === text || e.getAttribute('aria-label') === text) ??
      all.find((e) => e.textContent.trim().startsWith(text));
    if (!el) throw new Error('nothing to tap: ' + text);
    el.click();
  };
  const type = (selector, text) => {
    const el = document.querySelector(selector);
    if (!el) throw new Error('no input: ' + selector);
    const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set;
    setter.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
`;

const profile = mkdtempSync(join(tmpdir(), 'ui-shot-'));
const edge = spawn(
  EDGE,
  ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', 'about:blank'],
  { stdio: 'ignore' },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function pageTarget() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page;
    } catch {
      /* not up yet */
    }
    await sleep(200);
  }
  throw new Error('Edge did not start');
}

const ws = new WebSocket((await pageTarget()).webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let nextId = 1;
const pending = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
});
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const id = nextId++;
    pending.set(id, (m) => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });

await send('Emulation.setDeviceMetricsOverride', { width: 412, height: 915, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setTouchEmulationEnabled', { enabled: true });
await send('Page.enable');
await send('Runtime.enable');

let failed = false;
for (const step of steps) {
  if (step.path) {
    await send('Page.navigate', { url: BASE + step.path });
    await sleep(step.loadWait ?? 2000);
  }
  if (step.js) {
    const r = await send('Runtime.evaluate', {
      expression: `(async () => { ${HELPERS}\n${step.js} })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails) {
      failed = true;
      console.error('step failed:', r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    } else if (r.result?.value !== undefined) {
      console.log(JSON.stringify(r.result.value));
    }
  }
  await sleep(step.wait ?? 500);
  if (step.shot) {
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(resolve(outDir, step.shot), Buffer.from(data, 'base64'));
    console.log('wrote', step.shot);
  }
}
ws.close();
edge.kill();
process.exit(failed ? 1 : 0);
