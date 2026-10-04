# Expense Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the offline, single-user Expense Tracker Android app described in the spec and install it on the owner's Samsung Galaxy S24 Ultra.

**Architecture:** One React + TypeScript app (Vite, Tailwind) wrapped in a Capacitor Android shell, data in IndexedDB via Dexie. Pure logic (money, periods, stats, budget, CSV, backup validation, filters, deep links, lock timing) lives in `src/lib/*.ts` with no React/Capacitor imports, and the data layer lives in `src/db/*.ts`; both are tested with Node's built-in test runner (the DB against `fake-indexeddb`). UI components and screens are thin and read through Dexie live queries. Native extras: a Downloads plugin and edge-to-edge `MainActivity` copied from `../gym-tracker`, a biometric lock plugin, and a Java home-screen widget that deep-links into the Add sheet.

**Tech Stack:** React 18, react-router-dom 6, zustand 4, Dexie 4 + dexie-react-hooks 4, recharts 2, Tailwind 3, Vite 5, TypeScript 5.9, Capacitor 8 (`@capacitor/app`, `@aparajita/capacitor-biometric-auth` 10), Node 25 `node --test`, `fake-indexeddb` 6.

**Spec:** `docs/superpowers/specs/2026-10-04-expense-tracker-design.md`

## Global Constraints

- appId `com.mardon.expensetracker`, appName `Expense Tracker`, `server.androidScheme: 'https'`. Never change these after the first install.
- Dexie database `expenseTrackerDB`, schema `version(1)`; later index changes need `version(2)` with an upgrade, never an edit of `version(1)`.
- Money: Uzbek som only, integer whole som, `> 0`, at most 12 digits (`MAX_DIGITS = 12`). Display `45 000 so'm` (thousands grouped with a non-breaking space ` `, no decimals). Expenses `−45 000`, income `+45 000` (income in emerald).
- Dates: local `YYYY-MM-DD` strings. No future-dated entries.
- A "month" (period) starts on `settings.monthStartDay` (1–31, clamped to the month's last day) and is labelled by the calendar month it starts in.
- English UI. Visual style copied from gym-tracker: Tailwind `ink-*`/`ember-*` tokens, Manrope + Fraunces, utility classes `card`, `btn-primary`, `btn-ghost`, `field`, `field-flat`, `label-eyebrow`, `tap`, `num`, `display`.
- Every relative import inside a `.ts` file includes the `.ts` extension (Node runs tests on these files directly). `.tsx` files import without extensions. Type-only imports use `import type` / inline `type` (`verbatimModuleSyntax`). No TypeScript enums, namespaces or parameter properties (`erasableSyntaxOnly`).
- Never use `window.alert` / `window.confirm`; use `useConfirm()` and `useToast()`.
- Charts: spending `#f25a0e`, income `#1baf7a` (validated on the `#0e121b` card surface); one y-axis per chart; bars ≤ 24px with 4px rounded data end; legend whenever there are two series; tooltip on every chart.
- Dev server port `5174` (gym-tracker uses 5173).
- Git: commit straight to `main` and push (owner's instruction, 2026-10-04). One logical change per commit, imperative subject, ending with the `Co-Authored-By` trailer.
- Phone safety: never `adb uninstall`, `pm clear` or clear app data. If an install fails with `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, stop and ask the owner.

## Review Focus

1. A backup file that is not JSON, from another app, from a newer schema, or with one bad row must leave every table untouched (test in Task 6).
2. Notes containing commas, double quotes, newlines and Cyrillic must survive CSV export and open correctly in Excel (BOM) (test in Task 5).
3. Hidden (archived) categories must disappear from pickers but still label old entries in History, Stats and CSV (test in Task 6).
4. The app left open across midnight or across a period boundary must switch to the new day and period without a restart (test of `msUntilMidnight` in Task 3; `useToday` in Task 7 refreshes on that timer and on returning to the foreground).
5. Editing an existing expense (amount raised, date moved into or out of the month, switched to income) must re-evaluate budget warnings from real before/after totals (test in Task 6).

## File Structure

```
package.json, vite.config.ts, tsconfig*.json, tailwind.config.js, postcss.config.js,
index.html, capacitor.config.ts, .gitignore
src/
  main.tsx                 boot: open DB → seed → prime settings/lock → render
  App.tsx                  providers, routes, bottom nav, global Add sheet, lock gate, deep links
  index.css                copied from gym-tracker (+ .no-scrollbar)
  vite-env.d.ts
  db/types.ts              Transaction, Category, Preset, Settings, icon/colour lists (no runtime imports)
  db/db.ts                 Dexie instance + schema
  db/seed.ts               DEFAULT_SETTINGS, DEFAULT_CATEGORIES, seedIfEmpty()
  db/queries.ts            every read/write the UI uses, with validation
  db/backupData.ts         createBackup(), restoreBackup(), createCsv()
  lib/money.ts             format/parse som, keypad logic
  lib/dates.ts             ISO date helpers, labels, msUntilMidnight
  lib/period.ts            custom-month math
  lib/stats.ts             totals, balance, per-category/day/period aggregates
  lib/budget.ts            budget levels, crossings, messages
  lib/csv.ts               buildCsv()
  lib/backupFormat.ts      BackupFile type, validateBackup()
  lib/filter.ts            filterTransactions(), groupByDay()
  lib/deepLink.ts          parseDeepLink()
  lib/lockTiming.ts        shouldRelock()
  lib/biometric.ts         lockAvailable(), authenticate() (Capacitor plugin wrapper)
  lib/files.ts             saveTextFile() → Downloads (native) or browser download
  lib/downloads.ts         copied: Downloads plugin bridge
  lib/navigation.ts        copied+edited: back-button routing rules
  lib/overlayStack.ts      copied: sheet/dialog stack for the back button
  lib/useAndroidBackButton.ts  copied+edited
  lib/categoryStyle.ts     badge/swatch classes, UNKNOWN_CATEGORY
  lib/version.ts           APP_VERSION from package.json
  store/useStore.ts        zustand UI state (sheet, selected period, history filter, locked)
  hooks/useToday.ts, hooks/useData.ts, hooks/useLongPress.ts, hooks/useDeepLinks.ts
  components/ui/           Sheet, ConfirmDialog, TextField, Select (copied), CalendarSheet, Toast, IconButton
  components/              Icon, BottomNav, ScreenHeader, CategoryBadge, KindToggle, AmountKeypad,
                           CategoryGrid, CategoryEditor, TransactionSheet, TransactionRow, DayGroupList,
                           BalanceCard, BudgetBar, PresetBar, PresetEditor, PeriodSwitcher, NumberSetting,
                           LockGate, LockScreen, charts/*
  screens/                 HomeScreen, HistoryScreen, StatsScreen, SettingsScreen, CategoriesScreen,
                           PresetsScreen, BootError
tests/*.test.mjs           node --test suites
scripts/gen-icons.mjs      launcher icon generator (adapted from gym-tracker)
android/                   Capacitor project + MainActivity, DownloadsPlugin, QuickAddWidget (Java)
```

---

### Task 1: Scaffold the project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `index.html`, `capacitor.config.ts`, `src/vite-env.d.ts`, `src/main.tsx`, `src/App.tsx`
- Copy from `../gym-tracker`: `tailwind.config.js`, `postcss.config.js`, `.gitignore`, `src/index.css`

**Interfaces:**
- Produces: `npm run dev` (port 5174), `npm run build` (strict tsc + vite), `npm test` (node --test over `tests/*.test.mjs`).

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "expense-tracker",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "node --test \"tests/*.test.mjs\""
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
npm install react@^18.3.1 react-dom@^18.3.1 react-router-dom@^6.26.2 zustand@^4.5.5 dexie@^4.4.6 dexie-react-hooks@^4.4.0 recharts@^2.12.7 @capacitor/core@^8.4.0 @capacitor/android@^8.4.0 @capacitor/app@^8.1.0 @capacitor/cli@^8.4.0 @aparajita/capacitor-biometric-auth@^10.0.0
npm install -D typescript@~5.9.3 vite@^5.4.21 @vitejs/plugin-react@^4.7.0 tailwindcss@^3.4.10 postcss@^8.4.45 autoprefixer@^10.4.20 @types/react@^18.3.5 @types/react-dom@^18.3.0 fake-indexeddb@^6.2.5
```

- [ ] **Step 3: Write the config files**

`vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// No PWA / service worker: the app only ships inside the Capacitor shell, and
// the browser build is just for development.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5174,
  },
});
```

`tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

`tsconfig.app.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

`capacitor.config.ts`:
```ts
import type { CapacitorConfig } from '@capacitor/cli';

// appId and androidScheme decide where IndexedDB lives on the phone.
// Changing either one after the first install orphans all data.
const config: CapacitorConfig = {
  appId: 'com.mardon.expensetracker',
  appName: 'Expense Tracker',
  webDir: 'dist',
  android: {
    backgroundColor: '#0a0d14',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
```

`index.html`:
```html
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#0a0d14" />
    <link rel="icon" type="image/png" href="/icon-192.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,300..800,0..100,0..1&family=Manrope:wght@300;400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
    <title>Expense Tracker</title>
  </head>
  <body class="bg-ink-950 text-ink-100 font-sans">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
```

- [ ] **Step 4: Copy the gym-tracker styling and ignore files**

```bash
cp ../gym-tracker/tailwind.config.js ../gym-tracker/postcss.config.js ../gym-tracker/.gitignore .
cp ../gym-tracker/src/index.css src/index.css
```

Then append to the `@layer utilities` block of `src/index.css` (before its closing `}`):
```css
  .no-scrollbar {
    scrollbar-width: none;
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
```

- [ ] **Step 5: Minimal app entry**

`src/App.tsx`:
```tsx
export default function App() {
  return <p className="p-6 display text-3xl text-ink-50">Expense Tracker</p>;
}
```

`src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 6: Verify the build**

Run: `npm run build`
Expected: exits 0, `dist/index.html` exists.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json index.html capacitor.config.ts tailwind.config.js postcss.config.js .gitignore src
git commit -m "Scaffold React + Vite + Tailwind + Capacitor project"
```

---

### Task 2: Money formatting and keypad logic

**Files:**
- Create: `src/lib/money.ts`
- Test: `tests/money.test.mjs`

**Interfaces:**
- Produces: `MAX_DIGITS = 12`; `groupDigits(n: number): string`; `formatSom(n: number): string`; `formatSigned(amount: number, kind: 'expense' | 'income'): string`; `formatNet(n: number): string`; `formatCompact(n: number): string`; `type KeypadKey = '0'…'9' | '000' | 'back'`; `applyKey(digits: string, key: KeypadKey): string`; `digitsToAmount(digits: string): number`; `amountToDigits(n: number): string`; `parseWholeNumber(text: string, allowNegative?: boolean): number | null`.

- [ ] **Step 1: Write the failing tests**

`tests/money.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_DIGITS,
  amountToDigits,
  applyKey,
  digitsToAmount,
  formatCompact,
  formatNet,
  formatSigned,
  formatSom,
  groupDigits,
  parseWholeNumber,
} from '../src/lib/money.ts';

const NB = ' ';

test('groupDigits groups thousands with non-breaking spaces', () => {
  assert.equal(groupDigits(0), '0');
  assert.equal(groupDigits(999), '999');
  assert.equal(groupDigits(1000), `1${NB}000`);
  assert.equal(groupDigits(45000), `45${NB}000`);
  assert.equal(groupDigits(1234567), `1${NB}234${NB}567`);
  assert.equal(groupDigits(-45000), `45${NB}000`);
});

test("formatSom adds so'm and a real minus sign", () => {
  assert.equal(formatSom(45000), `45${NB}000 so'm`);
  assert.equal(formatSom(0), "0 so'm");
  assert.equal(formatSom(-2000), `−2${NB}000 so'm`);
});

test('formatSigned marks expenses and income', () => {
  assert.equal(formatSigned(45000, 'expense'), `−45${NB}000`);
  assert.equal(formatSigned(5000000, 'income'), `+5${NB}000${NB}000`);
});

test('formatNet signs positive and negative, leaves zero bare', () => {
  assert.equal(formatNet(1500), `+1${NB}500`);
  assert.equal(formatNet(-1500), `−1${NB}500`);
  assert.equal(formatNet(0), '0');
});

test('formatCompact shortens large numbers for chart axes', () => {
  assert.equal(formatCompact(0), '0');
  assert.equal(formatCompact(950), '950');
  assert.equal(formatCompact(1500), '1.5K');
  assert.equal(formatCompact(45000), '45K');
  assert.equal(formatCompact(1400000), '1.4M');
  assert.equal(formatCompact(2000000), '2M');
  assert.equal(formatCompact(3000000000), '3B');
  assert.equal(formatCompact(-45000), '−45K');
});

test('applyKey builds digits, ignores leading zeros and caps length', () => {
  assert.equal(applyKey('', '0'), '');
  assert.equal(applyKey('', '000'), '');
  assert.equal(applyKey('', '5'), '5');
  assert.equal(applyKey('5', '000'), '5000');
  assert.equal(applyKey('5000', 'back'), '500');
  assert.equal(applyKey('', 'back'), '');
  const full = '9'.repeat(MAX_DIGITS);
  assert.equal(applyKey(full, '1'), full);
  const almost = '9'.repeat(MAX_DIGITS - 2);
  assert.equal(applyKey(almost, '000'), almost);
});

test('digits and amounts convert both ways', () => {
  assert.equal(digitsToAmount(''), 0);
  assert.equal(digitsToAmount('45000'), 45000);
  assert.equal(amountToDigits(45000), '45000');
  assert.equal(amountToDigits(0), '');
});

test('parseWholeNumber accepts grouped digits and optional sign', () => {
  assert.equal(parseWholeNumber('45 000'), 45000);
  assert.equal(parseWholeNumber(`45${NB}000`), 45000);
  assert.equal(parseWholeNumber('007'), 7);
  assert.equal(parseWholeNumber('0'), 0);
  assert.equal(parseWholeNumber(''), null);
  assert.equal(parseWholeNumber('1.5'), null);
  assert.equal(parseWholeNumber('12a'), null);
  assert.equal(parseWholeNumber('-5'), null);
  assert.equal(parseWholeNumber('-5', true), -5);
  assert.equal(parseWholeNumber('−5 000', true), -5000);
  assert.equal(Object.is(parseWholeNumber('-0', true), 0), true);
  assert.equal(parseWholeNumber('9'.repeat(MAX_DIGITS + 1)), null);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../src/lib/money.ts'`.

- [ ] **Step 3: Implement `src/lib/money.ts`**

```ts
// Amounts are whole Uzbek som stored as integers. The keypad caps input at
// MAX_DIGITS so every value stays far inside Number.MAX_SAFE_INTEGER.
export const MAX_DIGITS = 12;

const GROUP = ' '; // non-breaking space keeps "45 000" on one line
const MINUS = '−';

/** 45000 → "45 000" (no sign). */
export function groupDigits(n: number): string {
  return String(Math.abs(Math.trunc(n))).replace(/\B(?=(\d{3})+(?!\d))/g, GROUP);
}

/** 45000 → "45 000 so'm"; negatives get a real minus sign. */
export function formatSom(n: number): string {
  return `${n < 0 ? MINUS : ''}${groupDigits(n)} so'm`;
}

/** An entry's amount as shown in lists: expense "−45 000", income "+45 000". */
export function formatSigned(amount: number, kind: 'expense' | 'income'): string {
  return `${kind === 'expense' ? MINUS : '+'}${groupDigits(amount)}`;
}

/** A net figure: "+1 500", "−1 500" or "0". */
export function formatNet(n: number): string {
  if (n === 0) return '0';
  return `${n > 0 ? '+' : MINUS}${groupDigits(n)}`;
}

/** Short form for chart axes: 45000 → "45K", 1400000 → "1.4M". */
export function formatCompact(n: number): string {
  const sign = n < 0 ? MINUS : '';
  const a = Math.abs(n);
  const units: [number, string][] = [
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ];
  for (const [size, suffix] of units) {
    if (a >= size) return `${sign}${(a / size).toFixed(1).replace(/\.0$/, '')}${suffix}`;
  }
  return `${sign}${a}`;
}

export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '000' | 'back';

/** Applies one keypad press to the digits typed so far. */
export function applyKey(digits: string, key: KeypadKey): string {
  if (key === 'back') return digits.slice(0, -1);
  if (digits === '' && (key === '0' || key === '000')) return '';
  const next = digits + key;
  return next.length > MAX_DIGITS ? digits : next;
}

export function digitsToAmount(digits: string): number {
  return digits === '' ? 0 : Number(digits);
}

export function amountToDigits(n: number): string {
  return n > 0 ? String(n) : '';
}

/**
 * Parses typed text like "45 000" or "−5000" into whole som.
 * Returns null for anything that is not a whole number of at most MAX_DIGITS.
 */
export function parseWholeNumber(text: string, allowNegative = false): number | null {
  const cleaned = text.replace(/[\s ]/g, '').replace(/^−/, '-');
  const m = /^(-?)(\d+)$/.exec(cleaned);
  if (!m) return null;
  if (m[1] && !allowNegative) return null;
  const digits = m[2].replace(/^0+(?=\d)/, '');
  if (digits.length > MAX_DIGITS) return null;
  const n = Number(digits);
  return m[1] && n !== 0 ? -n : n;
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm test`
Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/money.ts tests/money.test.mjs
git commit -m "Add money formatting and keypad logic"
```

---

### Task 3: Dates and custom-month periods

**Files:**
- Create: `src/lib/dates.ts`, `src/lib/period.ts`
- Test: `tests/dates.test.mjs`, `tests/period.test.mjs`

**Interfaces:**
- Produces (`dates.ts`): `MONTHS_SHORT`, `MONTHS_LONG`, `pad2(n)`, `toISODate(d: Date): string`, `todayISO(now?: Date): string`, `parseISODate(iso): { y, m, d }` (m is 1–12), `daysInMonth(y, m): number`, `addDaysISO(iso, days): string`, `formatShortDate(iso): string` ("5 Oct"), `formatDayHeading(iso, today): string`, `msUntilMidnight(now: Date): number`.
- Produces (`period.ts`): `interface Period { key: string; year: number; month: number; start: string; end: string }`; `periodFor(year, month, startDay): Period`; `periodContaining(dateISO, startDay): Period`; `shiftPeriod(p, delta, startDay): Period`; `periodsEndingWith(p, count, startDay): Period[]` (oldest first); `periodLabel(p)` ("Oct 2026"); `periodShortLabel(p)` ("Oct"); `periodRangeLabel(p)` ("10 Oct – 9 Nov").

- [ ] **Step 1: Write the failing tests**

`tests/dates.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDaysISO,
  daysInMonth,
  formatDayHeading,
  formatShortDate,
  msUntilMidnight,
  parseISODate,
  toISODate,
  todayISO,
} from '../src/lib/dates.ts';

test('toISODate and todayISO use the local calendar date', () => {
  assert.equal(toISODate(new Date(2026, 9, 4, 23, 59)), '2026-10-04');
  assert.equal(todayISO(new Date(2026, 0, 1, 0, 0)), '2026-01-01');
});

test('parseISODate and daysInMonth', () => {
  assert.deepEqual(parseISODate('2026-10-04'), { y: 2026, m: 10, d: 4 });
  assert.equal(daysInMonth(2026, 2), 28);
  assert.equal(daysInMonth(2028, 2), 29);
  assert.equal(daysInMonth(2026, 12), 31);
});

test('addDaysISO crosses months and years', () => {
  assert.equal(addDaysISO('2026-10-31', 1), '2026-11-01');
  assert.equal(addDaysISO('2026-01-01', -1), '2025-12-31');
  assert.equal(addDaysISO('2028-02-28', 1), '2028-02-29');
  assert.equal(addDaysISO('2026-03-29', 3), '2026-04-01');
});

test('formatShortDate and formatDayHeading', () => {
  assert.equal(formatShortDate('2026-10-05'), '5 Oct');
  assert.equal(formatDayHeading('2026-10-04', '2026-10-04'), 'Today');
  assert.equal(formatDayHeading('2026-10-03', '2026-10-04'), 'Yesterday');
  assert.equal(formatDayHeading('2026-10-01', '2026-10-04'), 'Thu, 1 Oct');
  assert.equal(formatDayHeading('2025-12-30', '2026-10-04'), 'Tue, 30 Dec 2025');
});

test('msUntilMidnight counts down to the next local day', () => {
  assert.equal(msUntilMidnight(new Date(2026, 9, 4, 23, 59, 0)), 60_000);
  assert.equal(msUntilMidnight(new Date(2026, 9, 4, 0, 0, 0)), 24 * 3600_000);
});
```

`tests/period.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDaysISO } from '../src/lib/dates.ts';
import {
  periodContaining,
  periodFor,
  periodLabel,
  periodRangeLabel,
  periodShortLabel,
  periodsEndingWith,
  shiftPeriod,
} from '../src/lib/period.ts';

test('start day 1 gives calendar months', () => {
  assert.deepEqual(periodContaining('2026-10-04', 1), {
    key: '2026-10', year: 2026, month: 10, start: '2026-10-01', end: '2026-10-31',
  });
});

test('a payday start splits months and is labelled by the month it starts in', () => {
  assert.equal(periodContaining('2026-10-04', 10).key, '2026-09');
  assert.equal(periodContaining('2026-10-04', 10).start, '2026-09-10');
  assert.equal(periodContaining('2026-10-04', 10).end, '2026-10-09');
  assert.equal(periodContaining('2026-10-10', 10).key, '2026-10');
  assert.equal(periodContaining('2026-10-10', 10).end, '2026-11-09');
});

test('start days past the end of a month clamp to its last day', () => {
  assert.equal(periodFor(2026, 2, 31).start, '2026-02-28');
  assert.equal(periodFor(2026, 2, 31).end, '2026-03-30');
  assert.equal(periodFor(2026, 1, 31).end, '2026-02-27');
  assert.equal(periodFor(2028, 2, 31).start, '2028-02-29');
  assert.equal(periodFor(2028, 2, 30).start, '2028-02-29');
  assert.equal(periodContaining('2026-03-15', 31).key, '2026-02');
});

test('periods cross year boundaries', () => {
  const p = periodContaining('2027-01-05', 10);
  assert.equal(p.key, '2026-12');
  assert.equal(p.start, '2026-12-10');
  assert.equal(p.end, '2027-01-09');
  assert.equal(shiftPeriod(periodFor(2026, 12, 1), 1, 1).key, '2027-01');
  assert.equal(shiftPeriod(periodFor(2026, 12, 1), -12, 1).key, '2025-12');
});

test('every day belongs to exactly one period, with no gaps', () => {
  for (const startDay of [1, 15, 28, 29, 30, 31]) {
    let p = periodFor(2027, 1, startDay);
    for (let i = 0; i < 30; i++) {
      const next = shiftPeriod(p, 1, startDay);
      assert.equal(addDaysISO(p.end, 1), next.start, `start day ${startDay}, after ${p.key}`);
      assert.ok(p.start <= p.end);
      p = next;
    }
  }
});

test('changing the start day re-buckets the same date', () => {
  assert.equal(periodContaining('2026-10-15', 1).key, '2026-10');
  assert.equal(periodContaining('2026-10-15', 20).key, '2026-09');
});

test('periodsEndingWith returns the last N periods, oldest first', () => {
  const list = periodsEndingWith(periodFor(2026, 3, 1), 12, 1);
  assert.equal(list.length, 12);
  assert.equal(list[0].key, '2025-04');
  assert.equal(list[11].key, '2026-03');
});

test('labels', () => {
  const p = periodFor(2026, 10, 10);
  assert.equal(periodLabel(p), 'Oct 2026');
  assert.equal(periodShortLabel(p), 'Oct');
  assert.equal(periodRangeLabel(p), '10 Oct – 9 Nov');
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../src/lib/dates.ts'` and `.../period.ts`.

- [ ] **Step 3: Implement `src/lib/dates.ts`**

```ts
// Dates are stored as local calendar dates, "YYYY-MM-DD". Day arithmetic goes
// through UTC so daylight-saving shifts can never skip or repeat a day.

export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

export function parseISODate(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

/** m is 1–12. */
export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function addDaysISO(iso: string, days: number): string {
  const { y, m, d } = parseISODate(iso);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`;
}

/** "5 Oct" */
export function formatShortDate(iso: string): string {
  const { m, d } = parseISODate(iso);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

/** "Today", "Yesterday", "Thu, 1 Oct", or "Tue, 30 Dec 2025" for another year. */
export function formatDayHeading(iso: string, today: string): string {
  if (iso === today) return 'Today';
  if (iso === addDaysISO(today, -1)) return 'Yesterday';
  const { y, m, d } = parseISODate(iso);
  const weekday = WEEKDAYS_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const year = y === parseISODate(today).y ? '' : ` ${y}`;
  return `${weekday}, ${d} ${MONTHS_SHORT[m - 1]}${year}`;
}

/** Milliseconds from `now` until the next local midnight. */
export function msUntilMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}
```

- [ ] **Step 4: Implement `src/lib/period.ts`**

```ts
import { MONTHS_SHORT, addDaysISO, daysInMonth, formatShortDate, pad2, parseISODate } from './dates.ts';

/**
 * A budgeting "month". With start day S it begins on day min(S, days in that
 * month) and ends the day before the next one begins. It is identified and
 * labelled by the calendar month it starts in, so with S = 10, "2026-10" runs
 * 10 Oct – 9 Nov. Periods are always computed, never stored.
 */
export interface Period {
  key: string;
  year: number;
  /** 1–12 */
  month: number;
  /** First day, inclusive. */
  start: string;
  /** Last day, inclusive. */
  end: string;
}

function startOf(year: number, month: number, startDay: number): string {
  const day = Math.min(startDay, daysInMonth(year, month));
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function monthIndex(year: number, month: number): number {
  return year * 12 + (month - 1);
}

function fromIndex(index: number): [number, number] {
  return [Math.floor(index / 12), (index % 12) + 1];
}

export function periodFor(year: number, month: number, startDay: number): Period {
  const [ny, nm] = fromIndex(monthIndex(year, month) + 1);
  return {
    key: `${year}-${pad2(month)}`,
    year,
    month,
    start: startOf(year, month, startDay),
    end: addDaysISO(startOf(ny, nm, startDay), -1),
  };
}

export function periodContaining(dateISO: string, startDay: number): Period {
  const { y, m } = parseISODate(dateISO);
  const p = periodFor(y, m, startDay);
  if (dateISO >= p.start) return p;
  const [py, pm] = fromIndex(monthIndex(y, m) - 1);
  return periodFor(py, pm, startDay);
}

export function shiftPeriod(p: Period, delta: number, startDay: number): Period {
  const [y, m] = fromIndex(monthIndex(p.year, p.month) + delta);
  return periodFor(y, m, startDay);
}

/** The `count` periods ending with `p`, oldest first. */
export function periodsEndingWith(p: Period, count: number, startDay: number): Period[] {
  return Array.from({ length: count }, (_, i) => shiftPeriod(p, i - count + 1, startDay));
}

export function periodLabel(p: Period): string {
  return `${MONTHS_SHORT[p.month - 1]} ${p.year}`;
}

export function periodShortLabel(p: Period): string {
  return MONTHS_SHORT[p.month - 1];
}

export function periodRangeLabel(p: Period): string {
  return `${formatShortDate(p.start)} – ${formatShortDate(p.end)}`;
}
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `npm test`
Expected: PASS — all money, dates and period tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/dates.ts src/lib/period.ts tests/dates.test.mjs tests/period.test.mjs
git commit -m "Add date helpers and custom-month periods"
```

---
### Task 4: Data types, stats and budget rules

**Files:**
- Create: `src/db/types.ts`, `src/lib/stats.ts`, `src/lib/budget.ts`
- Test: `tests/stats.test.mjs`, `tests/budget.test.mjs`

**Interfaces:**
- Produces (`types.ts`): `type Kind = 'expense' | 'income'`; `CATEGORY_ICONS` (readonly tuple) and `type CategoryIcon`; `CATEGORY_COLORS` and `type CategoryColor`; interfaces `Transaction`, `Category`, `Preset`, `Settings` (fields exactly as below).
- Produces (`stats.ts`): `type TxLike`; `interface Totals { income; spent; net }`; `totals(txs)`; `balance(openingBalance, txs)`; `inPeriod(txs, p)`; `interface CategoryTotal { categoryId; amount; share }`; `totalsByCategory(txs, kind)`; `interface DayTotal { date; spent }`; `spendingPerDay(txs, p)`; `dailyAverage(days, today)`; `interface PeriodTotals extends Totals { key }`; `totalsPerPeriod(txs, periods)`; `interface PeriodAmount { key; amount }`; `categoryPerPeriod(txs, categoryId, periods)`.
- Produces (`budget.ts`): `type BudgetLevel = 'ok' | 'warning' | 'over'`; `WARNING_RATIO = 0.8`; `interface BudgetStatus { level; ratio; remaining }`; `budgetStatus(spent, limit)`; `budgetCrossing(before, after, limit: number | null): BudgetStatus | null`; `budgetMessage(s): string`.

- [ ] **Step 1: Write `src/db/types.ts`** (types only; needed by the tests' imports)

```ts
// Shared data types. This file has no runtime imports so Node tests can load
// anything that imports it.

export type Kind = 'expense' | 'income';

/** Icons a category can use. Each has a case in components/Icon.tsx. */
export const CATEGORY_ICONS = [
  'food', 'cart', 'transport', 'car', 'phone', 'bolt', 'home', 'health',
  'bag', 'shirt', 'coffee', 'film', 'book', 'users', 'plane', 'dots',
  'wallet', 'briefcase', 'trophy', 'gift', 'coins',
] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

/** Badge colours (Tailwind classes live in lib/categoryStyle.ts). */
export const CATEGORY_COLORS = [
  'ember', 'amber', 'lime', 'emerald', 'teal', 'sky', 'indigo', 'violet', 'pink', 'rose', 'slate',
] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export interface Transaction {
  id?: number;
  /** Always equals the kind of its category. */
  kind: Kind;
  /** Whole som, > 0, at most 12 digits. */
  amount: number;
  categoryId: number;
  /** Local date, YYYY-MM-DD, never in the future. */
  date: string;
  /** '' when empty. */
  note: string;
  /** Epoch ms; orders entries within a day. */
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id?: number;
  /** Unique per kind, case-insensitive. */
  name: string;
  /** Fixed after creation. */
  kind: Kind;
  icon: CategoryIcon;
  color: CategoryColor;
  sortOrder: number;
  /** Hidden from pickers; still labels old entries. */
  archived: boolean;
}

export interface Preset {
  id?: number;
  /** Button label, e.g. "Metro". */
  name: string;
  /** The preset's kind comes from this category. */
  categoryId: number;
  amount: number;
  sortOrder: number;
}

export interface Settings {
  id: 1;
  /** Money on hand before the first entry; may be negative. */
  openingBalance: number;
  /** 1–31; the day each budgeting month starts. */
  monthStartDay: number;
  /** null = no budget. */
  monthlyBudget: number | null;
  lockEnabled: boolean;
  /** Hides Home's "Set your starting balance" card. */
  balancePromptDismissed: boolean;
}
```

- [ ] **Step 2: Write the failing tests**

`tests/stats.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { periodFor, periodsEndingWith } from '../src/lib/period.ts';
import {
  balance,
  categoryPerPeriod,
  dailyAverage,
  inPeriod,
  spendingPerDay,
  totals,
  totalsByCategory,
  totalsPerPeriod,
} from '../src/lib/stats.ts';

const tx = (kind, amount, categoryId, date) => ({ kind, amount, categoryId, date });

test('totals and balance', () => {
  const txs = [
    tx('income', 5_000_000, 9, '2026-10-01'),
    tx('expense', 45_000, 1, '2026-10-02'),
    tx('expense', 2_000, 2, '2026-10-02'),
  ];
  assert.deepEqual(totals(txs), { income: 5_000_000, spent: 47_000, net: 4_953_000 });
  assert.equal(balance(100_000, txs), 5_053_000);
  assert.equal(balance(-20_000, []), -20_000);
});

test('inPeriod keeps entries inside the period, inclusive', () => {
  const p = periodFor(2026, 10, 10);
  const txs = [tx('expense', 1, 1, '2026-10-09'), tx('expense', 2, 1, '2026-10-10'), tx('expense', 3, 1, '2026-11-09'), tx('expense', 4, 1, '2026-11-10')];
  assert.deepEqual(inPeriod(txs, p).map((t) => t.amount), [2, 3]);
});

test('totalsByCategory: one kind, largest first, with shares', () => {
  const rows = totalsByCategory(
    [
      tx('expense', 30_000, 1, '2026-10-01'),
      tx('expense', 10_000, 2, '2026-10-01'),
      tx('expense', 20_000, 1, '2026-10-02'),
      tx('expense', 10_000, 3, '2026-10-02'),
      tx('income', 999, 9, '2026-10-02'),
    ],
    'expense',
  );
  assert.deepEqual(rows.map((r) => [r.categoryId, r.amount]), [[1, 50_000], [2, 10_000], [3, 10_000]]);
  assert.ok(Math.abs(rows[0].share - 50_000 / 70_000) < 1e-9);
  assert.deepEqual(totalsByCategory([], 'expense'), []);
});

test('spendingPerDay covers every day of the period, zeros included', () => {
  const oct = periodFor(2026, 10, 1);
  const days = spendingPerDay(
    [tx('expense', 100, 1, '2026-10-03'), tx('expense', 50, 1, '2026-10-03'), tx('income', 999, 9, '2026-10-03'), tx('expense', 7, 1, '2026-11-01')],
    oct,
  );
  assert.equal(days.length, 31);
  assert.equal(days[0].date, '2026-10-01');
  assert.equal(days[30].date, '2026-10-31');
  assert.equal(days[2].spent, 150);
  assert.equal(days[0].spent, 0);

  const payday = spendingPerDay([], periodFor(2026, 10, 10));
  assert.equal(payday.length, 31);
  assert.equal(payday[0].date, '2026-10-10');
  assert.equal(payday[30].date, '2026-11-09');
});

test('dailyAverage only counts days up to today', () => {
  const days = [
    { date: '2026-10-01', spent: 100 },
    { date: '2026-10-02', spent: 0 },
    { date: '2026-10-03', spent: 50 },
    { date: '2026-10-04', spent: 1000 },
  ];
  assert.equal(dailyAverage(days, '2026-10-02'), 50);
  assert.equal(dailyAverage(days, '2026-10-31'), 288);
  assert.equal(dailyAverage(days, '2026-09-30'), 0);
});

test('totalsPerPeriod and categoryPerPeriod bucket entries by period', () => {
  const periods = periodsEndingWith(periodFor(2026, 10, 10), 2, 10);
  const txs = [
    tx('expense', 100, 1, '2026-10-09'),
    tx('expense', 200, 1, '2026-10-10'),
    tx('income', 500, 9, '2026-10-10'),
    tx('expense', 40, 2, '2026-10-12'),
  ];
  assert.deepEqual(totalsPerPeriod(txs, periods), [
    { key: '2026-09', income: 0, spent: 100, net: -100 },
    { key: '2026-10', income: 500, spent: 240, net: 260 },
  ]);
  assert.deepEqual(categoryPerPeriod(txs, 1, periods), [
    { key: '2026-09', amount: 100 },
    { key: '2026-10', amount: 200 },
  ]);
});
```

`tests/budget.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { budgetCrossing, budgetMessage, budgetStatus } from '../src/lib/budget.ts';

test('budgetStatus: ok below 80%, warning 80–100%, over above 100%', () => {
  assert.equal(budgetStatus(0, 1000).level, 'ok');
  assert.equal(budgetStatus(799, 1000).level, 'ok');
  assert.equal(budgetStatus(800, 1000).level, 'warning');
  assert.equal(budgetStatus(1000, 1000).level, 'warning');
  assert.equal(budgetStatus(1001, 1000).level, 'over');
  assert.equal(budgetStatus(1200, 1000).remaining, -200);
  assert.equal(budgetStatus(250, 1000).ratio, 0.25);
});

test('budgetCrossing reports only upward moves', () => {
  assert.equal(budgetCrossing(700, 790, 1000), null);
  assert.equal(budgetCrossing(700, 850, 1000)?.level, 'warning');
  assert.equal(budgetCrossing(700, 1100, 1000)?.level, 'over');
  assert.equal(budgetCrossing(850, 1100, 1000)?.level, 'over');
  assert.equal(budgetCrossing(900, 950, 1000), null);
  assert.equal(budgetCrossing(1100, 900, 1000), null);
  assert.equal(budgetCrossing(0, 5000, null), null);
});

test('budgetMessage', () => {
  assert.equal(budgetMessage(budgetStatus(850, 1000)), "85% of this month's budget used");
  assert.equal(budgetMessage(budgetStatus(1500, 1000)), "Over this month's budget by 500 so'm");
});
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `npm test`
Expected: FAIL — cannot find `src/lib/stats.ts` and `src/lib/budget.ts`.

- [ ] **Step 4: Implement `src/lib/stats.ts`**

```ts
import type { Kind, Transaction } from '../db/types.ts';
import type { Period } from './period.ts';
import { addDaysISO } from './dates.ts';

/** The fields aggregation needs; real rows carry more. */
export type TxLike = Pick<Transaction, 'kind' | 'amount' | 'categoryId' | 'date'>;

export interface Totals {
  income: number;
  spent: number;
  /** income − spent */
  net: number;
}

export function totals(txs: readonly TxLike[]): Totals {
  let income = 0;
  let spent = 0;
  for (const t of txs) {
    if (t.kind === 'income') income += t.amount;
    else spent += t.amount;
  }
  return { income, spent, net: income - spent };
}

/** Money on hand: the starting balance plus all income minus all expenses. */
export function balance(openingBalance: number, txs: readonly TxLike[]): number {
  return openingBalance + totals(txs).net;
}

export function inPeriod<T extends TxLike>(txs: readonly T[], p: Period): T[] {
  return txs.filter((t) => t.date >= p.start && t.date <= p.end);
}

export interface CategoryTotal {
  categoryId: number;
  amount: number;
  /** Fraction (0–1) of all entries of this kind. */
  share: number;
}

/** Per-category sums for one kind, largest first (ties by category id). */
export function totalsByCategory(txs: readonly TxLike[], kind: Kind): CategoryTotal[] {
  const sums = new Map<number, number>();
  let all = 0;
  for (const t of txs) {
    if (t.kind !== kind) continue;
    sums.set(t.categoryId, (sums.get(t.categoryId) ?? 0) + t.amount);
    all += t.amount;
  }
  return [...sums]
    .map(([categoryId, amount]) => ({ categoryId, amount, share: all > 0 ? amount / all : 0 }))
    .sort((a, b) => b.amount - a.amount || a.categoryId - b.categoryId);
}

export interface DayTotal {
  date: string;
  spent: number;
}

/** Spending on every day of the period, including days with nothing spent. */
export function spendingPerDay(txs: readonly TxLike[], p: Period): DayTotal[] {
  const byDate = new Map<string, number>();
  for (const t of txs) {
    if (t.kind === 'expense' && t.date >= p.start && t.date <= p.end) {
      byDate.set(t.date, (byDate.get(t.date) ?? 0) + t.amount);
    }
  }
  const days: DayTotal[] = [];
  for (let d = p.start; d <= p.end; d = addDaysISO(d, 1)) {
    days.push({ date: d, spent: byDate.get(d) ?? 0 });
  }
  return days;
}

/** Average spending per day over the days up to and including `today`. */
export function dailyAverage(days: readonly DayTotal[], today: string): number {
  const elapsed = days.filter((d) => d.date <= today);
  if (elapsed.length === 0) return 0;
  return Math.round(elapsed.reduce((sum, d) => sum + d.spent, 0) / elapsed.length);
}

export interface PeriodTotals extends Totals {
  key: string;
}

export function totalsPerPeriod(txs: readonly TxLike[], periods: readonly Period[]): PeriodTotals[] {
  return periods.map((p) => ({ key: p.key, ...totals(inPeriod(txs, p)) }));
}

export interface PeriodAmount {
  key: string;
  amount: number;
}

export function categoryPerPeriod(
  txs: readonly TxLike[],
  categoryId: number,
  periods: readonly Period[],
): PeriodAmount[] {
  return periods.map((p) => ({
    key: p.key,
    amount: inPeriod(txs, p)
      .filter((t) => t.categoryId === categoryId)
      .reduce((sum, t) => sum + t.amount, 0),
  }));
}
```

- [ ] **Step 5: Implement `src/lib/budget.ts`**

```ts
import { formatSom } from './money.ts';

export type BudgetLevel = 'ok' | 'warning' | 'over';

/** From this share of the budget on, the bar turns amber and a toast warns. */
export const WARNING_RATIO = 0.8;

export interface BudgetStatus {
  level: BudgetLevel;
  /** spent / limit */
  ratio: number;
  /** limit − spent; negative when over. */
  remaining: number;
}

export function budgetStatus(spent: number, limit: number): BudgetStatus {
  const ratio = limit > 0 ? spent / limit : 0;
  const level: BudgetLevel = ratio > 1 ? 'over' : ratio >= WARNING_RATIO ? 'warning' : 'ok';
  return { level, ratio, remaining: limit - spent };
}

const RANK: Record<BudgetLevel, number> = { ok: 0, warning: 1, over: 2 };

/** The new status if spending moved from `before` to `after` raised the level; otherwise null. */
export function budgetCrossing(before: number, after: number, limit: number | null): BudgetStatus | null {
  if (limit === null || limit <= 0) return null;
  const from = budgetStatus(before, limit);
  const to = budgetStatus(after, limit);
  return RANK[to.level] > RANK[from.level] ? to : null;
}

export function budgetMessage(s: BudgetStatus): string {
  if (s.level === 'over') return `Over this month's budget by ${formatSom(-s.remaining)}`;
  return `${Math.round(s.ratio * 100)}% of this month's budget used`;
}
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/db/types.ts src/lib/stats.ts src/lib/budget.ts tests/stats.test.mjs tests/budget.test.mjs
git commit -m "Add data types, stats aggregation and budget rules"
```

---

### Task 5: CSV export, backup validation and entry filters

**Files:**
- Create: `src/lib/csv.ts`, `src/lib/backupFormat.ts`, `src/lib/filter.ts`
- Test: `tests/csv.test.mjs`, `tests/backupFormat.test.mjs`, `tests/filter.test.mjs`

**Interfaces:**
- Consumes: `Transaction`, `Category`, `Preset`, `Settings`, `Kind`, `CATEGORY_ICONS`, `CATEGORY_COLORS` from `src/db/types.ts`.
- Produces (`csv.ts`): `buildCsv(txs: readonly Transaction[], categoryName: (id: number) => string): string`.
- Produces (`backupFormat.ts`): `BACKUP_APP = 'expense-tracker'`; `BACKUP_SCHEMA_VERSION = 1`; `interface BackupFile { app; schemaVersion; exportedAt; settings; categories; presets; transactions }`; `type BackupCheck = { ok: true; backup: BackupFile } | { ok: false; error: string }`; `validateBackup(input: unknown): BackupCheck`.
- Produces (`filter.ts`): `interface TxFilter { kind: Kind | 'all'; categoryId: number | null; query: string }`; `EMPTY_FILTER`; `filterTransactions(txs, f, categoryName)`; `interface DayGroup<T> { date; items: T[]; net }`; `groupByDay(txs)`.

- [ ] **Step 1: Write the failing tests**

`tests/csv.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCsv } from '../src/lib/csv.ts';

const tx = (o) => ({ id: 1, kind: 'expense', amount: 1000, categoryId: 1, date: '2026-10-01', note: '', createdAt: 0, updatedAt: 0, ...o });
const names = (id) => ({ 1: 'Food', 2: 'Bills, utilities', 9: 'Salary' })[id];
const lines = (csv) => csv.slice(1).split('\r\n');

test('starts with a byte-order mark and a header row', () => {
  assert.equal(buildCsv([], names), '﻿Date,Type,Category,Amount,Note\r\n');
});

test('rows are sorted oldest first and typed', () => {
  const csv = buildCsv(
    [
      tx({ date: '2026-10-02', createdAt: 5, amount: 300 }),
      tx({ kind: 'income', categoryId: 9, date: '2026-10-01', createdAt: 9, amount: 5000000 }),
      tx({ date: '2026-10-02', createdAt: 1, amount: 200 }),
    ],
    names,
  );
  assert.deepEqual(lines(csv), [
    'Date,Type,Category,Amount,Note',
    '2026-10-01,Income,Salary,5000000,',
    '2026-10-02,Expense,Food,200,',
    '2026-10-02,Expense,Food,300,',
    '',
  ]);
});

test('quotes commas, quotes and newlines; keeps Cyrillic', () => {
  const csv = buildCsv([tx({ categoryId: 2, note: 'Svet, gaz "oktabr"\nоплата' })], names);
  assert.equal(lines(csv)[1], '2026-10-01,Expense,"Bills, utilities",1000,"Svet, gaz ""oktabr""\nоплата"');
});
```

Note: the expected value in the last test contains a raw `\n` inside the quoted cell, so `split('\r\n')` keeps it within one element.

`tests/backupFormat.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBackup } from '../src/lib/backupFormat.ts';

function valid() {
  return {
    app: 'expense-tracker',
    schemaVersion: 1,
    exportedAt: '2026-10-04T07:00:00.000Z',
    settings: { id: 1, openingBalance: 100000, monthStartDay: 10, monthlyBudget: null, lockEnabled: false, balancePromptDismissed: true },
    categories: [
      { id: 1, name: 'Food', kind: 'expense', icon: 'food', color: 'ember', sortOrder: 0, archived: false },
      { id: 9, name: 'Salary', kind: 'income', icon: 'wallet', color: 'emerald', sortOrder: 0, archived: false },
    ],
    presets: [{ id: 1, name: 'Lunch', categoryId: 1, amount: 35000, sortOrder: 0 }],
    transactions: [
      { id: 1, kind: 'expense', amount: 45000, categoryId: 1, date: '2026-10-03', note: 'plov', createdAt: 1, updatedAt: 1 },
      { id: 2, kind: 'income', amount: 5000000, categoryId: 9, date: '2026-10-01', note: '', createdAt: 2, updatedAt: 2 },
    ],
  };
}

function broken(mutate) {
  const b = valid();
  mutate(b);
  const r = validateBackup(b);
  assert.equal(r.ok, false);
  return r.error;
}

test('a valid backup passes unchanged', () => {
  const r = validateBackup(valid());
  assert.equal(r.ok, true);
  assert.deepEqual(r.backup, valid());
});

test('rejects files from other apps and newer versions', () => {
  assert.equal(validateBackup(null).ok, false);
  assert.equal(validateBackup([]).ok, false);
  assert.match(broken((b) => { b.app = 'workout-tracker'; }), /not an Expense Tracker backup/);
  assert.match(broken((b) => { b.schemaVersion = 2; }), /newer version/);
  assert.match(broken((b) => { delete b.presets; }), /presets is missing/);
});

test('names the first bad row', () => {
  assert.match(broken((b) => { b.transactions[1].amount = 1.5; }), /transactions\[1\]: amount/);
  assert.match(broken((b) => { b.transactions[0].amount = 0; }), /transactions\[0\]: amount/);
  assert.match(broken((b) => { b.transactions[0].categoryId = 9; }), /transactions\[0\]: kind does not match/);
  assert.match(broken((b) => { b.transactions[0].categoryId = 42; }), /transactions\[0\]: unknown category/);
  assert.match(broken((b) => { b.transactions[0].date = '3 Oct'; }), /transactions\[0\]: date/);
  assert.match(broken((b) => { b.transactions[1].id = 1; }), /transactions: duplicate id 1/);
  assert.match(broken((b) => { b.presets[0].categoryId = 42; }), /presets\[0\]: unknown category/);
  assert.match(broken((b) => { b.categories[0].icon = 'rocket'; }), /categories\[0\]: unknown icon/);
  assert.match(broken((b) => { b.categories[1].id = 1; }), /categories: duplicate id 1/);
  assert.match(broken((b) => { b.settings.monthStartDay = 0; }), /settings: month start day/);
  assert.match(broken((b) => { b.settings.monthlyBudget = -5; }), /settings: monthly budget/);
});

test('drops unknown fields', () => {
  const b = valid();
  b.transactions[0].extra = 'x';
  const r = validateBackup(b);
  assert.equal(r.ok, true);
  assert.equal('extra' in r.backup.transactions[0], false);
});
```

`tests/filter.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_FILTER, filterTransactions, groupByDay } from '../src/lib/filter.ts';

const tx = (id, o) => ({ id, kind: 'expense', amount: 1000, categoryId: 1, date: '2026-10-01', note: '', createdAt: id, updatedAt: id, ...o });
const names = (id) => ({ 1: 'Food', 2: 'Transport', 9: 'Salary' })[id] ?? '';

const txs = [
  tx(1, { note: 'ОБЕД с друзьями' }),
  tx(2, { categoryId: 2, note: 'metro' }),
  tx(3, { kind: 'income', categoryId: 9, amount: 5000000 }),
];

test('filters by kind, category and text in note or category name', () => {
  const ids = (f) => filterTransactions(txs, { ...EMPTY_FILTER, ...f }, names).map((t) => t.id);
  assert.deepEqual(ids({}), [1, 2, 3]);
  assert.deepEqual(ids({ kind: 'income' }), [3]);
  assert.deepEqual(ids({ categoryId: 2 }), [2]);
  assert.deepEqual(ids({ query: '  обед ' }), [1]);
  assert.deepEqual(ids({ query: 'TRANS' }), [2]);
  assert.deepEqual(ids({ query: 'sal', kind: 'expense' }), []);
});

test('groupByDay: newest day first, newest entry first, net per day', () => {
  const groups = groupByDay([
    tx(1, { date: '2026-10-01', amount: 300 }),
    tx(2, { date: '2026-10-03', amount: 100 }),
    tx(3, { date: '2026-10-01', kind: 'income', categoryId: 9, amount: 1000 }),
    tx(4, { date: '2026-10-03', amount: 50 }),
  ]);
  assert.deepEqual(groups.map((g) => [g.date, g.items.map((t) => t.id), g.net]), [
    ['2026-10-03', [4, 2], -150],
    ['2026-10-01', [3, 1], 700],
  ]);
  assert.deepEqual(groupByDay([]), []);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm test`
Expected: FAIL — cannot find `csv.ts`, `backupFormat.ts`, `filter.ts`.

- [ ] **Step 3: Implement `src/lib/csv.ts`**

```ts
import type { Transaction } from '../db/types.ts';

const HEADER = ['Date', 'Type', 'Category', 'Amount', 'Note'];

// Excel only reads UTF-8 CSV (Uzbek/Russian notes) correctly with a byte-order mark.
const BOM = '﻿';

function cell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** RFC 4180 CSV of the given entries, oldest first. */
export function buildCsv(txs: readonly Transaction[], categoryName: (id: number) => string): string {
  const rows = [...txs].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  const lines = [HEADER.join(',')];
  for (const t of rows) {
    lines.push(
      [t.date, t.kind === 'expense' ? 'Expense' : 'Income', categoryName(t.categoryId), String(t.amount), t.note]
        .map(cell)
        .join(','),
    );
  }
  return BOM + lines.join('\r\n') + '\r\n';
}
```

- [ ] **Step 4: Implement `src/lib/backupFormat.ts`**

```ts
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  type Category,
  type CategoryColor,
  type CategoryIcon,
  type Kind,
  type Preset,
  type Settings,
  type Transaction,
} from '../db/types.ts';

export const BACKUP_APP = 'expense-tracker';
export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupFile {
  app: typeof BACKUP_APP;
  schemaVersion: number;
  exportedAt: string;
  settings: Settings;
  categories: Category[];
  presets: Preset[];
  transactions: Transaction[];
}

export type BackupCheck = { ok: true; backup: BackupFile } | { ok: false; error: string };

const MAX_AMOUNT = 999_999_999_999;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isId = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0;
const isAmount = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0 && (v as number) <= MAX_AMOUNT;
const isKind = (v: unknown): v is Kind => v === 'expense' || v === 'income';
const isText = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

function fail(message: string): never {
  throw new Error(message);
}

/**
 * Checks an imported backup completely before anything is written, so a bad
 * file can never leave the database half-replaced. Unknown fields are dropped.
 */
export function validateBackup(input: unknown): BackupCheck {
  try {
    return { ok: true, backup: check(input) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function check(input: unknown): BackupFile {
  if (!isObj(input) || input.app !== BACKUP_APP) fail('This is not an Expense Tracker backup');
  const version = input.schemaVersion;
  if (!Number.isInteger(version) || (version as number) < 1) fail('The backup has no valid schema version');
  if ((version as number) > BACKUP_SCHEMA_VERSION) fail('This backup comes from a newer version of the app');
  if (typeof input.exportedAt !== 'string') fail('exportedAt is missing');

  const settings = checkSettings(input.settings);
  const categories = list(input.categories, 'categories').map(checkCategory);
  uniqueIds(categories, 'categories');
  const kindOf = new Map(categories.map((c) => [c.id!, c.kind]));
  const presets = list(input.presets, 'presets').map((p, i) => checkPreset(p, i, kindOf));
  uniqueIds(presets, 'presets');
  const transactions = list(input.transactions, 'transactions').map((t, i) => checkTransaction(t, i, kindOf));
  uniqueIds(transactions, 'transactions');

  return {
    app: BACKUP_APP,
    schemaVersion: version as number,
    exportedAt: input.exportedAt,
    settings,
    categories,
    presets,
    transactions,
  };
}

function list(v: unknown, name: string): unknown[] {
  if (!Array.isArray(v)) fail(`${name} is missing`);
  return v;
}

function uniqueIds(items: { id?: number }[], name: string): void {
  const seen = new Set<number>();
  for (const it of items) {
    if (seen.has(it.id!)) fail(`${name}: duplicate id ${it.id}`);
    seen.add(it.id!);
  }
}

function checkSettings(v: unknown): Settings {
  const at = 'settings';
  if (!isObj(v)) fail(`${at} is missing`);
  if (!Number.isInteger(v.openingBalance) || Math.abs(v.openingBalance as number) > MAX_AMOUNT) {
    fail(`${at}: starting balance must be a whole number`);
  }
  const day = v.monthStartDay;
  if (!Number.isInteger(day) || (day as number) < 1 || (day as number) > 31) fail(`${at}: month start day must be 1–31`);
  if (v.monthlyBudget !== null && !isAmount(v.monthlyBudget)) fail(`${at}: monthly budget must be empty or a positive whole number`);
  if (typeof v.lockEnabled !== 'boolean') fail(`${at}: lockEnabled must be true or false`);
  if (typeof v.balancePromptDismissed !== 'boolean') fail(`${at}: balancePromptDismissed must be true or false`);
  return {
    id: 1,
    openingBalance: v.openingBalance as number,
    monthStartDay: day as number,
    monthlyBudget: v.monthlyBudget as number | null,
    lockEnabled: v.lockEnabled,
    balancePromptDismissed: v.balancePromptDismissed,
  };
}

function checkCategory(v: unknown, i: number): Category {
  const at = `categories[${i}]`;
  if (!isObj(v)) fail(`${at}: not an object`);
  if (!isId(v.id)) fail(`${at}: invalid id`);
  if (!isText(v.name)) fail(`${at}: name is missing`);
  if (!isKind(v.kind)) fail(`${at}: kind must be expense or income`);
  if (!(CATEGORY_ICONS as readonly unknown[]).includes(v.icon)) fail(`${at}: unknown icon`);
  if (!(CATEGORY_COLORS as readonly unknown[]).includes(v.color)) fail(`${at}: unknown color`);
  if (!Number.isInteger(v.sortOrder)) fail(`${at}: invalid sortOrder`);
  if (typeof v.archived !== 'boolean') fail(`${at}: archived must be true or false`);
  return {
    id: v.id,
    name: v.name,
    kind: v.kind,
    icon: v.icon as CategoryIcon,
    color: v.color as CategoryColor,
    sortOrder: v.sortOrder as number,
    archived: v.archived,
  };
}

function checkPreset(v: unknown, i: number, kindOf: Map<number, Kind>): Preset {
  const at = `presets[${i}]`;
  if (!isObj(v)) fail(`${at}: not an object`);
  if (!isId(v.id)) fail(`${at}: invalid id`);
  if (!isText(v.name)) fail(`${at}: name is missing`);
  if (!isId(v.categoryId) || !kindOf.has(v.categoryId)) fail(`${at}: unknown category`);
  if (!isAmount(v.amount)) fail(`${at}: amount must be a positive whole number`);
  if (!Number.isInteger(v.sortOrder)) fail(`${at}: invalid sortOrder`);
  return { id: v.id, name: v.name, categoryId: v.categoryId, amount: v.amount, sortOrder: v.sortOrder as number };
}

function checkTransaction(v: unknown, i: number, kindOf: Map<number, Kind>): Transaction {
  const at = `transactions[${i}]`;
  if (!isObj(v)) fail(`${at}: not an object`);
  if (!isId(v.id)) fail(`${at}: invalid id`);
  if (!isKind(v.kind)) fail(`${at}: kind must be expense or income`);
  if (!isAmount(v.amount)) fail(`${at}: amount must be a positive whole number`);
  if (!isId(v.categoryId) || !kindOf.has(v.categoryId)) fail(`${at}: unknown category`);
  if (kindOf.get(v.categoryId) !== v.kind) fail(`${at}: kind does not match its category`);
  if (typeof v.date !== 'string' || !DATE_RE.test(v.date)) fail(`${at}: date must be YYYY-MM-DD`);
  if (typeof v.note !== 'string') fail(`${at}: note must be text`);
  if (!Number.isFinite(v.createdAt) || !Number.isFinite(v.updatedAt)) fail(`${at}: invalid timestamps`);
  return {
    id: v.id,
    kind: v.kind,
    amount: v.amount,
    categoryId: v.categoryId,
    date: v.date,
    note: v.note,
    createdAt: v.createdAt as number,
    updatedAt: v.updatedAt as number,
  };
}
```

- [ ] **Step 5: Implement `src/lib/filter.ts`**

```ts
import type { Kind, Transaction } from '../db/types.ts';

export interface TxFilter {
  kind: Kind | 'all';
  categoryId: number | null;
  /** Matches note text or category name, case-insensitive. */
  query: string;
}

export const EMPTY_FILTER: TxFilter = { kind: 'all', categoryId: null, query: '' };

export function filterTransactions<T extends Transaction>(
  txs: readonly T[],
  f: TxFilter,
  categoryName: (id: number) => string,
): T[] {
  const q = f.query.trim().toLocaleLowerCase();
  return txs.filter(
    (t) =>
      (f.kind === 'all' || t.kind === f.kind) &&
      (f.categoryId === null || t.categoryId === f.categoryId) &&
      (q === '' ||
        t.note.toLocaleLowerCase().includes(q) ||
        categoryName(t.categoryId).toLocaleLowerCase().includes(q)),
  );
}

export interface DayGroup<T> {
  date: string;
  items: T[];
  /** Income minus spending for the entries in this group. */
  net: number;
}

/** Newest day first; newest entry first within a day. */
export function groupByDay<T extends Transaction>(txs: readonly T[]): DayGroup<T>[] {
  const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const groups: DayGroup<T>[] = [];
  for (const t of sorted) {
    let g = groups[groups.length - 1];
    if (!g || g.date !== t.date) {
      g = { date: t.date, items: [], net: 0 };
      groups.push(g);
    }
    g.items.push(t);
    g.net += t.kind === 'income' ? t.amount : -t.amount;
  }
  return groups;
}
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/csv.ts src/lib/backupFormat.ts src/lib/filter.ts tests/csv.test.mjs tests/backupFormat.test.mjs tests/filter.test.mjs
git commit -m "Add CSV export, backup validation and entry filters"
```

---

### Task 6: Database layer

**Files:**
- Create: `src/db/db.ts`, `src/db/seed.ts`, `src/db/queries.ts`, `src/db/backupData.ts`
- Test: `tests/db.test.mjs`

**Interfaces:**
- Consumes: everything from Tasks 2–5.
- Produces (`db.ts`): `DB_NAME = 'expenseTrackerDB'`; `db` (Dexie with tables `transactions`, `categories`, `presets`, `settings`).
- Produces (`seed.ts`): `DEFAULT_SETTINGS: Settings`; `DEFAULT_CATEGORIES`; `seedIfEmpty(): Promise<void>`.
- Produces (`queries.ts`): `type TransactionInput = Pick<Transaction, 'kind'|'amount'|'categoryId'|'date'|'note'>`; `addTransaction(input, now?) → Promise<number>`; `updateTransaction(id, input, now?)`; `deleteTransaction(id)`; `transactionsBetween(start, end)`; `recentTransactions(limit)`; `allTransactions()`; `periodTotals(start, end) → Promise<Totals>`; `withBudgetCheck(action, now?) → Promise<BudgetStatus | null>`; `type CategoryInput`; `listCategories(kind?, { includeArchived? })`; `addCategory(input) → Promise<number>`; `updateCategory(id, { name, icon, color })`; `setCategoryArchived(id, archived)`; `categoryUsage(id)`; `deleteCategory(id)`; `moveCategory(id, -1 | 1)`; `type PresetInput`; `listPresets()`; `addPreset(input)`; `updatePreset(id, input)`; `deletePreset(id)`; `movePreset(id, -1 | 1)`; `logPreset(presetId, now?) → Promise<number>`; `getSettings()`; `type SettingsPatch`; `updateSettings(patch)`.
- Produces (`backupData.ts`): `createBackup(now?) → Promise<BackupFile>`; `restoreBackup(text: string) → Promise<{ transactions: number }>`; `createCsv() → Promise<string>`.

- [ ] **Step 1: Write the failing tests**

`tests/db.test.mjs`:
```js
// fake-indexeddb must load before Dexie so Dexie picks up its globals.
import 'fake-indexeddb/auto';
import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/db/db.ts';
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, seedIfEmpty } from '../src/db/seed.ts';
import * as q from '../src/db/queries.ts';
import { createBackup, createCsv, restoreBackup } from '../src/db/backupData.ts';

const NOW = new Date(2026, 9, 4, 12, 0, 0); // Sun 4 Oct 2026, local noon
const at = (hour) => new Date(2026, 9, 4, hour, 0, 0);

beforeEach(async () => {
  await db.delete();
  await db.open();
  await seedIfEmpty();
});

async function cat(name, kind = 'expense') {
  const c = (await q.listCategories(kind, { includeArchived: true })).find((x) => x.name === name);
  assert.ok(c, `category ${name}`);
  return c;
}

async function addExpense(amount, categoryName = 'Food', date = '2026-10-04', note = '', now = NOW) {
  const c = await cat(categoryName);
  return q.addTransaction({ kind: 'expense', amount, categoryId: c.id, date, note }, now);
}

test('seeding creates settings and default categories once', async () => {
  assert.deepEqual(await q.getSettings(), DEFAULT_SETTINGS);
  assert.equal(await db.categories.count(), DEFAULT_CATEGORIES.length);
  await seedIfEmpty();
  assert.equal(await db.categories.count(), DEFAULT_CATEGORIES.length);
  // Deleting a default must not make it come back on the next launch.
  await q.deleteCategory((await cat('Shopping')).id);
  await seedIfEmpty();
  assert.equal(await db.categories.count(), DEFAULT_CATEGORIES.length - 1);
});

test('addTransaction rejects bad input', async () => {
  const food = await cat('Food');
  const base = { kind: 'expense', amount: 1000, categoryId: food.id, date: '2026-10-04', note: '' };
  await assert.rejects(q.addTransaction({ ...base, amount: 0 }, NOW), /positive whole number/);
  await assert.rejects(q.addTransaction({ ...base, amount: 1.5 }, NOW), /positive whole number/);
  await assert.rejects(q.addTransaction({ ...base, amount: 1e12 }, NOW), /positive whole number/);
  await assert.rejects(q.addTransaction({ ...base, kind: 'income' }, NOW), /does not match/);
  await assert.rejects(q.addTransaction({ ...base, categoryId: 999 }, NOW), /Category not found/);
  await assert.rejects(q.addTransaction({ ...base, date: '2026-10-05' }, NOW), /future/);
  assert.equal(await db.transactions.count(), 0);
});

test('addTransaction trims the note and stamps times', async () => {
  const id = await addExpense(45000, 'Food', '2026-10-04', '  plov  ');
  const t = await db.transactions.get(id);
  assert.equal(t.note, 'plov');
  assert.equal(t.createdAt, NOW.getTime());
  assert.equal(t.updatedAt, NOW.getTime());
});

test('recentTransactions orders by date, then creation time', async () => {
  const a = await addExpense(1, 'Food', '2026-10-03', '', at(8));
  const b = await addExpense(2, 'Food', '2026-10-01', '', at(9));
  const c = await addExpense(3, 'Food', '2026-10-03', '', at(10));
  assert.deepEqual((await q.recentTransactions(10)).map((t) => t.id), [c, a, b]);
  assert.deepEqual((await q.recentTransactions(2)).map((t) => t.id), [c, a]);
});

test('editing an expense into income moves it between totals', async () => {
  const id = await addExpense(50000);
  assert.deepEqual(await q.periodTotals('2026-10-01', '2026-10-31'), { income: 0, spent: 50000, net: -50000 });
  const salary = await cat('Salary', 'income');
  await q.updateTransaction(id, { kind: 'income', amount: 50000, categoryId: salary.id, date: '2026-10-04', note: '' }, NOW);
  assert.deepEqual(await q.periodTotals('2026-10-01', '2026-10-31'), { income: 50000, spent: 0, net: 50000 });
  await assert.rejects(q.updateTransaction(9999, { kind: 'income', amount: 1, categoryId: salary.id, date: '2026-10-04', note: '' }, NOW), /not found/);
});

test('withBudgetCheck reports crossings for adds, edits and date moves', async () => {
  await q.updateSettings({ monthlyBudget: 100000 });
  assert.equal(await q.withBudgetCheck(() => addExpense(70000), NOW), null);
  let id = 0;
  assert.equal((await q.withBudgetCheck(async () => { id = await addExpense(15000); }, NOW))?.level, 'warning');
  const food = await cat('Food');
  const edit = (o) => q.updateTransaction(id, { kind: 'expense', amount: 15000, categoryId: food.id, date: '2026-10-04', note: '', ...o }, NOW);
  assert.equal((await q.withBudgetCheck(() => edit({ amount: 200000 }), NOW))?.level, 'over');
  // Moving the entry out of this month drops spending: no warning.
  assert.equal(await q.withBudgetCheck(() => edit({ date: '2026-09-30' }), NOW), null);
  // Moving it back in crosses straight to "warning" again (70 000 + 15 000).
  assert.equal((await q.withBudgetCheck(() => edit({ date: '2026-10-02' }), NOW))?.level, 'warning');
  assert.equal(await q.withBudgetCheck(() => q.deleteTransaction(id), NOW), null);
});

test('category names are trimmed and unique per kind, ignoring case', async () => {
  const id = await q.addCategory({ name: '  Taxi   rides ', kind: 'expense', icon: 'car', color: 'sky' });
  assert.equal((await db.categories.get(id)).name, 'Taxi rides');
  await assert.rejects(q.addCategory({ name: 'taxi RIDES', kind: 'expense', icon: 'car', color: 'sky' }), /already exists/);
  await q.addCategory({ name: 'Taxi rides', kind: 'income', icon: 'car', color: 'sky' });
  await assert.rejects(q.addCategory({ name: '   ', kind: 'expense', icon: 'car', color: 'sky' }), /Name is required/);
  await assert.rejects(q.updateCategory(id, { name: 'food', icon: 'car', color: 'sky' }), /already exists/);
  await q.updateCategory(id, { name: 'Taxi', icon: 'car', color: 'amber' });
  assert.equal((await db.categories.get(id)).name, 'Taxi');
});

test('hidden categories leave pickers but still label old entries', async () => {
  await addExpense(45000, 'Food');
  const food = await cat('Food');
  await q.setCategoryArchived(food.id, true);
  assert.equal((await q.listCategories('expense')).some((c) => c.name === 'Food'), false);
  assert.equal((await q.listCategories('expense', { includeArchived: true })).some((c) => c.name === 'Food'), true);
  assert.match(await createCsv(), /,Expense,Food,45000,/);
  await assert.rejects(q.addCategory({ name: 'food', kind: 'expense', icon: 'food', color: 'ember' }), /hidden/);
});

test('deleteCategory refuses categories in use', async () => {
  await addExpense(1000, 'Food');
  await assert.rejects(q.deleteCategory((await cat('Food')).id), /in use/);
  const transport = await cat('Transport');
  await q.addPreset({ name: 'Metro', categoryId: transport.id, amount: 2000 });
  await assert.rejects(q.deleteCategory(transport.id), /in use/);
  const health = await cat('Health');
  await q.deleteCategory(health.id);
  assert.equal(await db.categories.get(health.id), undefined);
});

test('moveCategory swaps neighbours and ignores moves past the ends', async () => {
  const before = (await q.listCategories('expense')).map((c) => c.name);
  const second = await cat(before[1]);
  await q.moveCategory(second.id, -1);
  const after = (await q.listCategories('expense')).map((c) => c.name);
  assert.deepEqual(after.slice(0, 2), [before[1], before[0]]);
  await q.moveCategory(second.id, -1);
  assert.deepEqual((await q.listCategories('expense')).map((c) => c.name), after);
});

test('logPreset adds a dated entry with the preset name as note; undo deletes it', async () => {
  const transport = await cat('Transport');
  const metro = await q.addPreset({ name: 'Metro', categoryId: transport.id, amount: 2000 });
  const txId = await q.logPreset(metro, NOW);
  const t = await db.transactions.get(txId);
  assert.deepEqual(
    { kind: t.kind, amount: t.amount, categoryId: t.categoryId, date: t.date, note: t.note },
    { kind: 'expense', amount: 2000, categoryId: transport.id, date: '2026-10-04', note: 'Metro' },
  );
  await q.deleteTransaction(txId);
  assert.equal(await db.transactions.get(txId), undefined);

  const same = await q.addPreset({ name: 'transport', categoryId: transport.id, amount: 3000 });
  assert.equal((await db.transactions.get(await q.logPreset(same, NOW))).note, '');
  await assert.rejects(q.addPreset({ name: 'Bad', categoryId: transport.id, amount: 0 }), /positive whole number/);
});

test('movePreset reorders presets', async () => {
  const transport = await cat('Transport');
  const a = await q.addPreset({ name: 'A', categoryId: transport.id, amount: 1 });
  const b = await q.addPreset({ name: 'B', categoryId: transport.id, amount: 2 });
  await q.movePreset(b, -1);
  assert.deepEqual((await q.listPresets()).map((p) => p.id), [b, a]);
});

test('updateSettings validates values', async () => {
  await assert.rejects(q.updateSettings({ monthStartDay: 0 }), /1–31/);
  await assert.rejects(q.updateSettings({ monthStartDay: 32 }), /1–31/);
  await assert.rejects(q.updateSettings({ monthStartDay: 1.5 }), /1–31/);
  await assert.rejects(q.updateSettings({ monthlyBudget: 0 }), /positive whole number/);
  await q.updateSettings({ monthlyBudget: null, openingBalance: -50000, monthStartDay: 10 });
  const s = await q.getSettings();
  assert.equal(s.openingBalance, -50000);
  assert.equal(s.monthStartDay, 10);
  assert.equal(s.monthlyBudget, null);
});

test('restoreBackup round-trips and leaves data untouched on bad files', async () => {
  await addExpense(45000, 'Food', '2026-10-03', 'lunch');
  await q.updateSettings({ openingBalance: 250000 });
  const backup = await createBackup(NOW);
  const json = JSON.stringify(backup);

  const bad = structuredClone(backup);
  bad.transactions[0].amount = -1;
  await assert.rejects(restoreBackup('not json'), /not valid JSON/);
  await assert.rejects(restoreBackup(JSON.stringify({ ...backup, app: 'workout-tracker' })), /not an Expense Tracker backup/);
  await assert.rejects(restoreBackup(JSON.stringify({ ...backup, schemaVersion: 99 })), /newer version/);
  await assert.rejects(restoreBackup(JSON.stringify(bad)), /transactions\[0\]/);
  assert.equal((await q.allTransactions()).length, 1);

  await addExpense(1000);
  await q.updateSettings({ openingBalance: 0 });
  const result = await restoreBackup(json);
  assert.equal(result.transactions, 1);
  assert.deepEqual(await q.allTransactions(), backup.transactions);
  assert.deepEqual(await db.categories.toArray(), backup.categories);
  assert.equal((await q.getSettings()).openingBalance, 250000);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm test`
Expected: FAIL — cannot find `src/db/db.ts`.

- [ ] **Step 3: Implement `src/db/db.ts`**

```ts
import Dexie, { type EntityTable } from 'dexie';
import type { Category, Preset, Settings, Transaction } from './types.ts';

export const DB_NAME = 'expenseTrackerDB';

// Never edit a released version. To add or change an index, add
// db.version(2).stores({...}).upgrade(...) below. Adding non-indexed fields
// needs no new version.
export const db = new Dexie(DB_NAME) as Dexie & {
  transactions: EntityTable<Transaction, 'id'>;
  categories: EntityTable<Category, 'id'>;
  presets: EntityTable<Preset, 'id'>;
  settings: EntityTable<Settings, 'id'>;
};

db.version(1).stores({
  transactions: '++id, date, categoryId, [date+createdAt]',
  categories: '++id, kind',
  presets: '++id, categoryId',
  settings: 'id',
});
```

- [ ] **Step 4: Implement `src/db/seed.ts`**

```ts
import { db } from './db.ts';
import type { Category, Settings } from './types.ts';

export const DEFAULT_SETTINGS: Settings = {
  id: 1,
  openingBalance: 0,
  monthStartDay: 1,
  monthlyBudget: null,
  lockEnabled: false,
  balancePromptDismissed: false,
};

export const DEFAULT_CATEGORIES: Pick<Category, 'name' | 'kind' | 'icon' | 'color'>[] = [
  { name: 'Food', kind: 'expense', icon: 'food', color: 'ember' },
  { name: 'Transport', kind: 'expense', icon: 'transport', color: 'sky' },
  { name: 'Phone/Internet', kind: 'expense', icon: 'phone', color: 'violet' },
  { name: 'Groceries', kind: 'expense', icon: 'cart', color: 'lime' },
  { name: 'Health', kind: 'expense', icon: 'health', color: 'rose' },
  { name: 'Shopping', kind: 'expense', icon: 'bag', color: 'pink' },
  { name: 'Bills', kind: 'expense', icon: 'bolt', color: 'amber' },
  { name: 'Other', kind: 'expense', icon: 'dots', color: 'slate' },
  { name: 'Salary', kind: 'income', icon: 'wallet', color: 'emerald' },
  { name: 'Competitions', kind: 'income', icon: 'trophy', color: 'amber' },
  { name: 'Gift', kind: 'income', icon: 'gift', color: 'pink' },
  { name: 'Other', kind: 'income', icon: 'dots', color: 'slate' },
];

/**
 * First launch only: creates the settings row and the default categories.
 * Runs on every boot, so it must stay idempotent. Categories are seeded only
 * together with the settings row, so deleted defaults never come back.
 */
export async function seedIfEmpty(): Promise<void> {
  await db.transaction('rw', db.settings, db.categories, async () => {
    if (await db.settings.get(1)) return;
    await db.settings.add({ ...DEFAULT_SETTINGS });
    if ((await db.categories.count()) === 0) {
      const counters = { expense: 0, income: 0 };
      await db.categories.bulkAdd(
        DEFAULT_CATEGORIES.map((c) => ({ ...c, sortOrder: counters[c.kind]++, archived: false })),
      );
    }
  });
}
```

- [ ] **Step 5: Implement `src/db/queries.ts`**

```ts
import { db } from './db.ts';
import { DEFAULT_SETTINGS } from './seed.ts';
import type { Category, CategoryColor, CategoryIcon, Kind, Preset, Settings, Transaction } from './types.ts';
import { MAX_DIGITS } from '../lib/money.ts';
import { toISODate } from '../lib/dates.ts';
import { periodContaining } from '../lib/period.ts';
import { totals, type Totals } from '../lib/stats.ts';
import { budgetCrossing, type BudgetStatus } from '../lib/budget.ts';

// Every write the UI makes goes through this module, so the data rules from
// the spec (whole som, matching kinds, no future dates, unique names, no
// deleting used categories) hold no matter which screen calls them.

function assertAmount(amount: number, label = 'Amount'): void {
  if (!Number.isInteger(amount) || amount <= 0 || String(amount).length > MAX_DIGITS) {
    throw new Error(`${label} must be a positive whole number`);
  }
}

async function getCategory(id: number): Promise<Category> {
  const c = await db.categories.get(id);
  if (!c) throw new Error('Category not found');
  return c;
}

function byOrder(a: { sortOrder: number; id?: number }, b: { sortOrder: number; id?: number }): number {
  return a.sortOrder - b.sortOrder || (a.id ?? 0) - (b.id ?? 0);
}

/** Swaps an item with its neighbour, then renumbers the list 0..n-1. */
async function reorder<T extends { id?: number; sortOrder: number }>(
  sorted: T[],
  id: number,
  direction: -1 | 1,
  save: (id: number, sortOrder: number) => Promise<unknown>,
): Promise<void> {
  const i = sorted.findIndex((x) => x.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= sorted.length) return;
  const next = [...sorted];
  [next[i], next[j]] = [next[j], next[i]];
  await Promise.all(next.map((x, idx) => (x.sortOrder === idx ? null : save(x.id!, idx))));
}

function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

// ---------------------------------------------------------------- entries

export type TransactionInput = Pick<Transaction, 'kind' | 'amount' | 'categoryId' | 'date' | 'note'>;

async function checkTransactionInput(input: TransactionInput, now: Date): Promise<void> {
  assertAmount(input.amount);
  const category = await getCategory(input.categoryId);
  if (category.kind !== input.kind) throw new Error('Category does not match the entry type');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('Invalid date');
  if (input.date > toISODate(now)) throw new Error('Entries cannot be in the future');
}

export async function addTransaction(input: TransactionInput, now = new Date()): Promise<number> {
  await checkTransactionInput(input, now);
  const t = now.getTime();
  return db.transactions.add({
    kind: input.kind,
    amount: input.amount,
    categoryId: input.categoryId,
    date: input.date,
    note: input.note.trim(),
    createdAt: t,
    updatedAt: t,
  });
}

export async function updateTransaction(id: number, input: TransactionInput, now = new Date()): Promise<void> {
  await checkTransactionInput(input, now);
  const changed = await db.transactions.update(id, {
    kind: input.kind,
    amount: input.amount,
    categoryId: input.categoryId,
    date: input.date,
    note: input.note.trim(),
    updatedAt: now.getTime(),
  });
  if (changed === 0) throw new Error('Entry not found');
}

export async function deleteTransaction(id: number): Promise<void> {
  await db.transactions.delete(id);
}

export function transactionsBetween(start: string, end: string): Promise<Transaction[]> {
  return db.transactions.where('date').between(start, end, true, true).toArray();
}

/** Newest first: by date, then by when the entry was created. */
export function recentTransactions(limit: number): Promise<Transaction[]> {
  return db.transactions.orderBy('[date+createdAt]').reverse().limit(limit).toArray();
}

export function allTransactions(): Promise<Transaction[]> {
  return db.transactions.toArray();
}

export async function periodTotals(start: string, end: string): Promise<Totals> {
  return totals(await transactionsBetween(start, end));
}

/**
 * Runs a write and reports whether it pushed this month's spending to a higher
 * budget level (ok → warning → over). Comparing real before/after totals
 * covers adds, edits (amount, date or type) and deletes the same way.
 */
export async function withBudgetCheck(action: () => Promise<unknown>, now = new Date()): Promise<BudgetStatus | null> {
  const settings = await getSettings();
  const p = periodContaining(toISODate(now), settings.monthStartDay);
  const before = (await periodTotals(p.start, p.end)).spent;
  await action();
  const after = (await periodTotals(p.start, p.end)).spent;
  return budgetCrossing(before, after, settings.monthlyBudget);
}

// ------------------------------------------------------------- categories

export interface CategoryInput {
  name: string;
  kind: Kind;
  icon: CategoryIcon;
  color: CategoryColor;
}

/** Categories of one kind (or all kinds) in display order; hidden ones only on request. */
export async function listCategories(kind?: Kind, opts: { includeArchived?: boolean } = {}): Promise<Category[]> {
  const rows = kind ? await db.categories.where('kind').equals(kind).toArray() : await db.categories.toArray();
  return rows.filter((c) => opts.includeArchived || !c.archived).sort(byOrder);
}

async function assertNameFree(kind: Kind, name: string, exceptId?: number): Promise<void> {
  const key = name.toLocaleLowerCase();
  const clash = (await db.categories.where('kind').equals(kind).toArray()).find(
    (c) => c.id !== exceptId && c.name.toLocaleLowerCase() === key,
  );
  if (!clash) return;
  throw new Error(
    clash.archived
      ? `"${clash.name}" already exists but is hidden. Unhide it in Settings → Categories.`
      : `"${clash.name}" already exists`,
  );
}

export async function addCategory(input: CategoryInput): Promise<number> {
  const name = cleanName(input.name);
  if (!name) throw new Error('Name is required');
  return db.transaction('rw', db.categories, async () => {
    await assertNameFree(input.kind, name);
    const siblings = await db.categories.where('kind').equals(input.kind).toArray();
    const sortOrder = siblings.reduce((max, c) => Math.max(max, c.sortOrder), -1) + 1;
    return db.categories.add({ name, kind: input.kind, icon: input.icon, color: input.color, sortOrder, archived: false });
  });
}

export async function updateCategory(
  id: number,
  patch: { name: string; icon: CategoryIcon; color: CategoryColor },
): Promise<void> {
  const name = cleanName(patch.name);
  if (!name) throw new Error('Name is required');
  await db.transaction('rw', db.categories, async () => {
    const current = await getCategory(id);
    await assertNameFree(current.kind, name, id);
    await db.categories.update(id, { name, icon: patch.icon, color: patch.color });
  });
}

export async function setCategoryArchived(id: number, archived: boolean): Promise<void> {
  await db.categories.update(id, { archived });
}

export async function categoryUsage(id: number): Promise<{ transactions: number; presets: number }> {
  const [transactions, presets] = await Promise.all([
    db.transactions.where('categoryId').equals(id).count(),
    db.presets.where('categoryId').equals(id).count(),
  ]);
  return { transactions, presets };
}

/** Deletes a never-used category. Used ones can only be hidden. */
export async function deleteCategory(id: number): Promise<void> {
  await db.transaction('rw', db.categories, db.transactions, db.presets, async () => {
    const usage = await categoryUsage(id);
    if (usage.transactions > 0 || usage.presets > 0) throw new Error('This category is in use. Hide it instead.');
    await db.categories.delete(id);
  });
}

export async function moveCategory(id: number, direction: -1 | 1): Promise<void> {
  await db.transaction('rw', db.categories, async () => {
    const c = await getCategory(id);
    const siblings = (await db.categories.where('kind').equals(c.kind).toArray()).sort(byOrder);
    await reorder(siblings, id, direction, (rowId, sortOrder) => db.categories.update(rowId, { sortOrder }));
  });
}

// ---------------------------------------------------------------- presets

export interface PresetInput {
  name: string;
  categoryId: number;
  amount: number;
}

export async function listPresets(): Promise<Preset[]> {
  return (await db.presets.toArray()).sort(byOrder);
}

async function checkPresetInput(input: PresetInput): Promise<string> {
  const name = cleanName(input.name);
  if (!name) throw new Error('Name is required');
  assertAmount(input.amount);
  await getCategory(input.categoryId);
  return name;
}

export async function addPreset(input: PresetInput): Promise<number> {
  const name = await checkPresetInput(input);
  const all = await db.presets.toArray();
  const sortOrder = all.reduce((max, p) => Math.max(max, p.sortOrder), -1) + 1;
  return db.presets.add({ name, categoryId: input.categoryId, amount: input.amount, sortOrder });
}

export async function updatePreset(id: number, input: PresetInput): Promise<void> {
  const name = await checkPresetInput(input);
  await db.presets.update(id, { name, categoryId: input.categoryId, amount: input.amount });
}

export async function deletePreset(id: number): Promise<void> {
  await db.presets.delete(id);
}

export async function movePreset(id: number, direction: -1 | 1): Promise<void> {
  await db.transaction('rw', db.presets, async () => {
    const all = (await db.presets.toArray()).sort(byOrder);
    await reorder(all, id, direction, (rowId, sortOrder) => db.presets.update(rowId, { sortOrder }));
  });
}

/**
 * Logs a preset as today's entry and returns the new entry's id (for Undo).
 * The note is the preset name unless it just repeats the category name.
 */
export async function logPreset(presetId: number, now = new Date()): Promise<number> {
  const preset = await db.presets.get(presetId);
  if (!preset) throw new Error('Preset not found');
  const category = await getCategory(preset.categoryId);
  const note = preset.name.toLocaleLowerCase() === category.name.toLocaleLowerCase() ? '' : preset.name;
  return addTransaction(
    { kind: category.kind, amount: preset.amount, categoryId: preset.categoryId, date: toISODate(now), note },
    now,
  );
}

// --------------------------------------------------------------- settings

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get(1)) ?? { ...DEFAULT_SETTINGS };
}

export type SettingsPatch = Partial<Omit<Settings, 'id'>>;

export async function updateSettings(patch: SettingsPatch): Promise<void> {
  const day = patch.monthStartDay;
  if (day !== undefined && !(Number.isInteger(day) && day >= 1 && day <= 31)) {
    throw new Error('Month start day must be 1–31');
  }
  const opening = patch.openingBalance;
  if (opening !== undefined && !(Number.isInteger(opening) && String(Math.abs(opening)).length <= MAX_DIGITS)) {
    throw new Error('Starting balance must be a whole number');
  }
  if (patch.monthlyBudget !== undefined && patch.monthlyBudget !== null) assertAmount(patch.monthlyBudget, 'Budget');
  await db.transaction('rw', db.settings, async () => {
    await db.settings.put({ ...(await getSettings()), ...patch, id: 1 });
  });
}
```

- [ ] **Step 6: Implement `src/db/backupData.ts`**

```ts
import { db } from './db.ts';
import { getSettings } from './queries.ts';
import { BACKUP_APP, BACKUP_SCHEMA_VERSION, validateBackup, type BackupFile } from '../lib/backupFormat.ts';
import { buildCsv } from '../lib/csv.ts';

const ALL_TABLES = () => [db.settings, db.categories, db.presets, db.transactions];

export async function createBackup(now = new Date()): Promise<BackupFile> {
  return db.transaction('r', ALL_TABLES(), async () => ({
    app: BACKUP_APP,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    settings: await getSettings(),
    categories: await db.categories.toArray(),
    presets: await db.presets.toArray(),
    transactions: await db.transactions.toArray(),
  }));
}

/**
 * Replaces all data with a backup file's contents. The file is fully
 * validated first; if anything is wrong it throws and nothing changes.
 */
export async function restoreBackup(text: string): Promise<{ transactions: number }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('The file is not valid JSON');
  }
  const check = validateBackup(parsed);
  if (!check.ok) throw new Error(check.error);
  const b = check.backup;
  await db.transaction('rw', ALL_TABLES(), async () => {
    await Promise.all(ALL_TABLES().map((t) => t.clear()));
    await db.settings.put(b.settings);
    await db.categories.bulkAdd(b.categories);
    await db.presets.bulkAdd(b.presets);
    await db.transactions.bulkAdd(b.transactions);
  });
  return { transactions: b.transactions.length };
}

export async function createCsv(): Promise<string> {
  const [txs, categories] = await Promise.all([db.transactions.toArray(), db.categories.toArray()]);
  const names = new Map(categories.map((c) => [c.id!, c.name]));
  return buildCsv(txs, (id) => names.get(id) ?? 'Unknown');
}
```

- [ ] **Step 7: Run the tests to see them pass**

Run: `npm test`
Expected: PASS — all suites including `db.test.mjs`.

- [ ] **Step 8: Type-check**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 9: Commit**

```bash
git add src/db tests/db.test.mjs
git commit -m "Add Dexie data layer with validation, backup and CSV"
```

---
### Task 7: App shell, shared UI primitives and screenshot tool

**Files:**
- Copy from `../gym-tracker`: `src/lib/overlayStack.ts`, `src/lib/downloads.ts`, `src/components/ui/ConfirmDialog.tsx`, `src/components/ui/TextField.tsx`, `src/components/ui/Select.tsx`, `src/components/Icon.tsx` (then extend)
- Create: `src/lib/navigation.ts`, `src/lib/useAndroidBackButton.ts`, `src/lib/categoryStyle.ts`, `src/store/useStore.ts`, `src/hooks/useToday.ts`, `src/hooks/useData.ts`, `src/components/ui/Sheet.tsx`, `src/components/ui/Toast.tsx`, `src/components/ui/IconButton.tsx`, `src/components/BottomNav.tsx`, `src/components/ScreenHeader.tsx`, `src/components/CategoryBadge.tsx`, `src/screens/BootError.tsx`, placeholder screens, `scripts/ui-shot.mjs`
- Modify: `src/App.tsx`, `src/main.tsx`
- Test: `tests/navigation.test.mjs`

**Interfaces:**
- Consumes: `db`, `seedIfEmpty`, `getSettings`, `DEFAULT_SETTINGS`, `Kind`, `Transaction`, `Category`, `Settings`, `CategoryColor`, `periodContaining`, `periodFor`, `Period`, `todayISO`, `msUntilMidnight`, `EMPTY_FILTER`, `TxFilter`.
- Produces: `useStore` with `sheet: SheetState`, `openAdd(kind?)`, `openEdit(tx)`, `closeSheet()`, `selectedPeriodKey`, `setSelectedPeriodKey(key | null)`, `historyFilter`, `setHistoryFilter(patch)`, `locked`, `setLocked(b)`; `type SheetState = { mode: 'add'; kind: Kind; nonce: number } | { mode: 'edit'; tx: Transaction; nonce: number } | null`; hooks `useToday()`, `useSettings()`, `primeSettings(s)`, `useCategoryMap()`, `useCurrentPeriod()`, `useSelectedPeriod() → { period, current, isCurrent }`; components `Sheet` (props `open, onClose, title?, eyebrow?, children, maxHeightClass?, bodyMaxHeight?`), `ToastProvider` + `useToast()` → `(o: { message; detail?; actionLabel?; onAction?; durationMs? }) => void`, `IconButton`, `ScreenHeader` (props `eyebrow?, title, backTo?, right?`), `CategoryBadge` (props `category: Pick<Category,'icon'|'color'>, size?`), `Icon` with exported `type IconName`; `BADGE_CLASSES`, `SWATCH_CLASSES`, `UNKNOWN_CATEGORY`.

- [ ] **Step 1: Write the failing navigation test**

`tests/navigation.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TAB_ROOTS, decideBackAction, isTabRoot } from '../src/lib/navigation.ts';

test('Home exits, other tabs go Home, deeper routes go back', () => {
  assert.equal(decideBackAction('/'), 'exit');
  for (const p of ['/history', '/stats', '/settings']) assert.equal(decideBackAction(p), 'home', p);
  assert.equal(decideBackAction('/settings/categories'), 'back');
  assert.equal(decideBackAction('/settings/presets'), 'back');
  assert.equal(decideBackAction('/nope'), 'back');
});

test('isTabRoot', () => {
  for (const p of TAB_ROOTS) assert.equal(isTabRoot(p), true, p);
  assert.equal(isTabRoot('/settings/categories'), false);
});
```

Run: `npm test` → Expected: FAIL, cannot find `src/lib/navigation.ts`.

- [ ] **Step 2: Copy reusable files from gym-tracker**

```bash
mkdir -p src/lib src/components/ui src/store src/hooks src/screens scripts
cp ../gym-tracker/src/lib/overlayStack.ts ../gym-tracker/src/lib/downloads.ts src/lib/
cp ../gym-tracker/src/components/ui/ConfirmDialog.tsx ../gym-tracker/src/components/ui/TextField.tsx ../gym-tracker/src/components/ui/Select.tsx src/components/ui/
cp ../gym-tracker/src/components/Icon.tsx src/components/Icon.tsx
```

In `src/lib/downloads.ts` change the comment example `"Download/workout-tracker-2026-06-16.json"` to `"Download/expense-tracker-2026-10-04.json"`.

- [ ] **Step 3: Write `src/lib/navigation.ts` and `src/lib/useAndroidBackButton.ts`**

`src/lib/navigation.ts`:
```ts
// Top-level tab destinations (mirrors the items in components/BottomNav.tsx).
export const HOME_PATH = '/';
export const TAB_ROOTS = ['/', '/history', '/stats', '/settings'] as const;

export function isTabRoot(pathname: string): boolean {
  return (TAB_ROOTS as readonly string[]).includes(pathname);
}

// What the Android back button does for a route, once any open overlay
// (sheet/dialog) has been closed separately:
// - 'exit'  Home is the app's home; back leaves the app
// - 'home'  any other top-level tab returns to Home
// - 'back'  a deeper route (e.g. Settings → Categories) goes back one step
export type BackAction = 'exit' | 'home' | 'back';

export function decideBackAction(pathname: string): BackAction {
  if (pathname === HOME_PATH) return 'exit';
  if (isTabRoot(pathname)) return 'home';
  return 'back';
}
```

`src/lib/useAndroidBackButton.ts`:
```ts
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { decideBackAction, HOME_PATH } from './navigation.ts';
import { closeTopOverlay } from './overlayStack.ts';

// Wires Android's back button/gesture into the router. Capacitor has no
// default handling, so without this every press closes the app.
export function useAndroidBackButton(): void {
  const navigate = useNavigate();
  const location = useLocation();

  // Register the native listener once and read the latest path from a ref, so
  // navigation never leaves two listeners attached.
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;

    const listener = App.addListener('backButton', () => {
      if (closeTopOverlay()) return;
      switch (decideBackAction(pathRef.current)) {
        case 'exit':
          void App.exitApp();
          break;
        case 'home':
          navigate(HOME_PATH);
          break;
        case 'back':
          navigate(-1);
          break;
      }
    });

    return () => {
      void listener.then((l) => l.remove());
    };
  }, [navigate]);
}
```

Run: `npm test` → Expected: navigation tests PASS.

- [ ] **Step 4: Extend `src/components/Icon.tsx`**

At the top add:
```tsx
import type { CategoryIcon } from '../db/types';
```

Add these members to the `Variant` union (after `| 'today'`):
```tsx
  | 'home'
  | 'search'
  | 'lock'
  | 'backspace'
  | 'tag'
  | 'archive'
  | 'file'
  | 'chevron-up'
  | CategoryIcon;

export type IconName = Variant;
```
(and remove the `;` that ended the union after `'today'`).

Insert these cases just before `default:`:
```tsx
    case 'home':
      return (
        <svg {...common}>
          <path d="M3.5 11 12 4l8.5 7" />
          <path d="M5.5 9.5v10h13v-10" />
          <path d="M10 19.5v-5h4v5" />
        </svg>
      );

    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-4.2-4.2" />
        </svg>
      );

    case 'lock':
      return (
        <svg {...common}>
          <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
          <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
          <path d="M12 14.5v2" />
        </svg>
      );

    case 'backspace':
      return (
        <svg {...common}>
          <path d="M8.5 5.5H19a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H8.5L3 12Z" />
          <path d="m11.5 9.5 5 5m0-5-5 5" />
        </svg>
      );

    case 'tag':
      return (
        <svg {...common}>
          <path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-6.2 6.2a1.5 1.5 0 0 1-2.1 0Z" />
          <circle cx="8" cy="8" r="1.4" />
        </svg>
      );

    case 'archive':
      return (
        <svg {...common}>
          <rect x="3.5" y="4.5" width="17" height="4.5" rx="1" />
          <path d="M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9" />
          <path d="M10 13h4" />
        </svg>
      );

    case 'file':
      return (
        <svg {...common}>
          <path d="M6 3.5h8l4.5 4.5v12.5H6Z" />
          <path d="M14 3.5V8h4.5" />
          <path d="M9 13h6M9 16.5h6" />
        </svg>
      );

    case 'chevron-up':
      return (
        <svg {...common}>
          <path d="m6 15 6-6 6 6" />
        </svg>
      );

    // ---- category icons (see CATEGORY_ICONS in db/types.ts)

    case 'food':
      return (
        <svg {...common}>
          <path d="M7 3v18" />
          <path d="M4.5 3v5a2.5 2.5 0 0 0 5 0V3" />
          <path d="M17 21V3c-2 1.2-3 3.6-3 6.5V13h3" />
        </svg>
      );

    case 'cart':
      return (
        <svg {...common}>
          <path d="M3 4h2.5l2.2 10.5h10.1L20 7.5H6.3" />
          <circle cx="9.5" cy="19" r="1.4" />
          <circle cx="16.5" cy="19" r="1.4" />
        </svg>
      );

    case 'transport':
      return (
        <svg {...common}>
          <rect x="5" y="3.5" width="14" height="14" rx="3" />
          <path d="M5 10.5h14" />
          <path d="M8.5 17.5 7 20.5M15.5 17.5l1.5 3" />
          <circle cx="9" cy="14" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="14" r="1" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'car':
      return (
        <svg {...common}>
          <path d="M5 16.5V12l1.8-4.5A2 2 0 0 1 8.7 6h6.6a2 2 0 0 1 1.9 1.5L19 12v4.5" />
          <path d="M4 12h16v4.5H4Z" />
          <path d="M7 16.5V19M17 16.5V19" />
          <circle cx="7.5" cy="14.2" r=".9" fill="currentColor" stroke="none" />
          <circle cx="16.5" cy="14.2" r=".9" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'phone':
      return (
        <svg {...common}>
          <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
          <path d="M11 18.5h2" />
        </svg>
      );

    case 'bolt':
      return (
        <svg {...common}>
          <path d="M13 2.5 5 13.5h6l-1 8 8-11h-6Z" />
        </svg>
      );

    case 'health':
      return (
        <svg {...common}>
          <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z" />
          <path d="M8 12h2.2l1.3-2.2 1.8 4 1.2-1.8H16" />
        </svg>
      );

    case 'bag':
      return (
        <svg {...common}>
          <path d="M5.5 8h13l-1 12.5h-11Z" />
          <path d="M9 10V7a3 3 0 0 1 6 0v3" />
        </svg>
      );

    case 'shirt':
      return (
        <svg {...common}>
          <path d="M8.5 4 4 6.5l1.5 4 2-1V20h9V9.5l2 1 1.5-4L15.5 4a3.5 3.5 0 0 1-7 0Z" />
        </svg>
      );

    case 'coffee':
      return (
        <svg {...common}>
          <path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5Z" />
          <path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16" />
          <path d="M8.5 3.5v2.5M12 3.5v2.5" />
        </svg>
      );

    case 'film':
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
          <path d="m10 9.5 4.5 2.5-4.5 2.5Z" />
        </svg>
      );

    case 'book':
      return (
        <svg {...common}>
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5Z" />
          <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5Z" />
        </svg>
      );

    case 'users':
      return (
        <svg {...common}>
          <circle cx="9" cy="8.5" r="3" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
          <path d="M15.5 5.8a3 3 0 0 1 0 5.4" />
          <path d="M17 14.2a5.5 5.5 0 0 1 3.5 4.8" />
        </svg>
      );

    case 'plane':
      return (
        <svg {...common}>
          <path d="M21 3 3 10.5l7 2.5 2.5 7Z" />
          <path d="m10 13 4-4" />
        </svg>
      );

    case 'dots':
      return (
        <svg {...common}>
          <circle cx="6" cy="12" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="18" cy="12" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'wallet':
      return (
        <svg {...common}>
          <path d="M4 8V7a2.5 2.5 0 0 1 2.5-2.5H17V8" />
          <rect x="4" y="8" width="16" height="11.5" rx="2.5" />
          <path d="M20 12h-3.5a1.75 1.75 0 0 0 0 3.5H20" />
        </svg>
      );

    case 'briefcase':
      return (
        <svg {...common}>
          <rect x="3.5" y="7" width="17" height="12.5" rx="2.5" />
          <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
          <path d="M3.5 12.5h17" />
        </svg>
      );

    case 'trophy':
      return (
        <svg {...common}>
          <path d="M8 4h8v5a4 4 0 0 1-8 0Z" />
          <path d="M8 6H5.5a2.5 2.5 0 0 0 2.6 4M16 6h2.5a2.5 2.5 0 0 1-2.6 4" />
          <path d="M12 13v4" />
          <path d="M8.5 20.5h7" />
          <path d="M10 17h4l.5 3.5h-5Z" />
        </svg>
      );

    case 'gift':
      return (
        <svg {...common}>
          <rect x="4" y="9" width="16" height="4" rx="1" />
          <path d="M5.5 13v7.5h13V13" />
          <path d="M12 9v11.5" />
          <path d="M12 9c-1.5-3.5-5-4-5-1.5S10 9 12 9Z" />
          <path d="M12 9c1.5-3.5 5-4 5-1.5S14 9 12 9Z" />
        </svg>
      );

    case 'coins':
      return (
        <svg {...common}>
          <ellipse cx="9" cy="7" rx="5" ry="2.5" />
          <path d="M4 7v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7" />
          <path d="M10 15.5c.9 1.2 2.9 2 5 2 2.8 0 5-1.1 5-2.5v-4c0-1.4-2.2-2.5-5-2.5" />
        </svg>
      );
```

- [ ] **Step 5: Write `src/lib/categoryStyle.ts`**

```ts
import type { Category, CategoryColor } from '../db/types.ts';

// Literal class strings so Tailwind's scanner keeps them in the build.
export const BADGE_CLASSES: Record<CategoryColor, string> = {
  ember: 'bg-ember-500/15 text-ember-300',
  amber: 'bg-amber-500/15 text-amber-300',
  lime: 'bg-lime-500/15 text-lime-300',
  emerald: 'bg-emerald-500/15 text-emerald-300',
  teal: 'bg-teal-500/15 text-teal-300',
  sky: 'bg-sky-500/15 text-sky-300',
  indigo: 'bg-indigo-500/15 text-indigo-300',
  violet: 'bg-violet-500/15 text-violet-300',
  pink: 'bg-pink-500/15 text-pink-300',
  rose: 'bg-rose-500/15 text-rose-300',
  slate: 'bg-ink-500/25 text-ink-200',
};

export const SWATCH_CLASSES: Record<CategoryColor, string> = {
  ember: 'bg-ember-400',
  amber: 'bg-amber-400',
  lime: 'bg-lime-400',
  emerald: 'bg-emerald-400',
  teal: 'bg-teal-400',
  sky: 'bg-sky-400',
  indigo: 'bg-indigo-400',
  violet: 'bg-violet-400',
  pink: 'bg-pink-400',
  rose: 'bg-rose-400',
  slate: 'bg-ink-300',
};

/** Shown if an entry's category row is somehow missing (never expected). */
export const UNKNOWN_CATEGORY: Category = {
  name: 'Unknown',
  kind: 'expense',
  icon: 'dots',
  color: 'slate',
  sortOrder: 0,
  archived: false,
};
```

- [ ] **Step 6: Write the store and hooks**

`src/store/useStore.ts`:
```ts
import { create } from 'zustand';
import type { Kind, Transaction } from '../db/types.ts';
import { EMPTY_FILTER, type TxFilter } from '../lib/filter.ts';

/** The Add/Edit sheet. `nonce` changes on every open so the form state resets. */
export type SheetState =
  | { mode: 'add'; kind: Kind; nonce: number }
  | { mode: 'edit'; tx: Transaction; nonce: number }
  | null;

interface UiState {
  sheet: SheetState;
  openAdd: (kind?: Kind) => void;
  openEdit: (tx: Transaction) => void;
  closeSheet: () => void;

  /** Period ("YYYY-MM") shown on History and Stats; null = the current one. */
  selectedPeriodKey: string | null;
  setSelectedPeriodKey: (key: string | null) => void;

  historyFilter: TxFilter;
  setHistoryFilter: (patch: Partial<TxFilter>) => void;

  /** True while the fingerprint lock screen covers the app. */
  locked: boolean;
  setLocked: (locked: boolean) => void;
}

let nonce = 0;

export const useStore = create<UiState>((set) => ({
  sheet: null,
  openAdd: (kind = 'expense') => set({ sheet: { mode: 'add', kind, nonce: ++nonce } }),
  openEdit: (tx) => set({ sheet: { mode: 'edit', tx, nonce: ++nonce } }),
  closeSheet: () => set({ sheet: null }),

  selectedPeriodKey: null,
  setSelectedPeriodKey: (key) => set({ selectedPeriodKey: key }),

  historyFilter: EMPTY_FILTER,
  setHistoryFilter: (patch) => set((s) => ({ historyFilter: { ...s.historyFilter, ...patch } })),

  locked: false,
  setLocked: (locked) => set({ locked }),
}));
```

`src/hooks/useToday.ts`:
```ts
import { useEffect, useState } from 'react';
import { msUntilMidnight, todayISO } from '../lib/dates.ts';

/**
 * Today's local date. Refreshes just after midnight and whenever the app
 * returns to the foreground, so an app left open overnight rolls over to the
 * new day (and the new budgeting month) without a restart.
 */
export function useToday(): string {
  const [today, setToday] = useState(() => todayISO());

  useEffect(() => {
    const refresh = () => setToday(todayISO());
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(() => {
        refresh();
        schedule();
      }, msUntilMidnight(new Date()) + 1000);
    };
    schedule();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return today;
}
```

`src/hooks/useData.ts`:
```ts
import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.ts';
import { DEFAULT_SETTINGS } from '../db/seed.ts';
import { getSettings } from '../db/queries.ts';
import type { Category, Settings } from '../db/types.ts';
import { periodContaining, periodFor, type Period } from '../lib/period.ts';
import { useStore } from '../store/useStore.ts';
import { useToday } from './useToday.ts';

// The last settings read, used as the first-render value of useSettings() so
// screens don't flash defaults (e.g. the wrong month) before the query resolves.
let latestSettings: Settings = DEFAULT_SETTINGS;

export function primeSettings(s: Settings): void {
  latestSettings = s;
}

async function readSettings(): Promise<Settings> {
  latestSettings = await getSettings();
  return latestSettings;
}

export function useSettings(): Settings {
  return useLiveQuery(readSettings, [], latestSettings);
}

/** Every category, hidden ones included, by id — for labelling entries. */
export function useCategoryMap(): Map<number, Category> {
  const rows = useLiveQuery(() => db.categories.toArray(), [], [] as Category[]);
  return useMemo(() => new Map(rows.map((c) => [c.id!, c])), [rows]);
}

export function useCurrentPeriod(): Period {
  const today = useToday();
  const { monthStartDay } = useSettings();
  return useMemo(() => periodContaining(today, monthStartDay), [today, monthStartDay]);
}

/** The period History and Stats show; never later than the current one. */
export function useSelectedPeriod(): { period: Period; current: Period; isCurrent: boolean } {
  const current = useCurrentPeriod();
  const { monthStartDay } = useSettings();
  const key = useStore((s) => s.selectedPeriodKey);
  const period = useMemo(() => {
    if (!key || key >= current.key) return current;
    const [y, m] = key.split('-').map(Number);
    return periodFor(y, m, monthStartDay);
  }, [key, current, monthStartDay]);
  return { period, current, isCurrent: period.key === current.key };
}
```

- [ ] **Step 7: Write the UI primitives**

`src/components/ui/Sheet.tsx` (gym-tracker's Sheet, portalled, with a configurable body height):
```tsx
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useOverlay } from '../../lib/overlayStack';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  eyebrow?: string;
  children: ReactNode;
  /** Max height of the whole panel (e.g. 'max-h-[94vh]'). */
  maxHeightClass?: string;
  /** Max height of the scrolling body. */
  bodyMaxHeight?: string;
}

export function Sheet({
  open,
  onClose,
  title,
  eyebrow,
  children,
  maxHeightClass = 'max-h-[85vh]',
  bodyMaxHeight = '70vh',
}: SheetProps) {
  // Let the Android back button close this sheet before any routing happens.
  useOverlay(open, onClose);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  // Portalled to <body> so a sheet opened from inside another sheet is never
  // clipped or positioned by its parent's slide-up transform.
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-ink-950/75 backdrop-blur-sm animate-[fadeIn_180ms_ease-out]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`absolute bottom-0 inset-x-0 px-safe pb-safe
          rounded-t-[28px] bg-ink-900/95 border-t border-ink-700/60
          shadow-2xl ${maxHeightClass} overflow-hidden
          animate-[slideUp_280ms_cubic-bezier(0.32,0.72,0,1)]`}
      >
        <div className="flex justify-center pt-2">
          <span className="block h-1.5 w-10 rounded-full bg-ink-700" />
        </div>
        {(title || eyebrow) && (
          <div className="px-5 pt-3 pb-4 border-b border-ink-800/80">
            {eyebrow && <p className="label-eyebrow text-ember-400/80">{eyebrow}</p>}
            {title && <div className="display text-2xl text-ink-50 mt-0.5">{title}</div>}
          </div>
        )}
        <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: bodyMaxHeight }}>
          {children}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </div>,
    document.body,
  );
}
```

`src/components/ui/Toast.tsx`:
```tsx
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export interface ToastOptions {
  message: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

type Shown = ToastOptions & { id: number };

const ToastContext = createContext<((o: ToastOptions) => void) | null>(null);

/** One toast at a time, above the bottom nav. A new toast replaces the old one. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Shown | null>(null);
  const nextId = useRef(1);

  const show = useCallback((o: ToastOptions) => {
    setToast({ ...o, id: nextId.current++ });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), toast.durationMs ?? 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          className="fixed inset-x-0 z-[70] px-4 pointer-events-none"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 92px)' }}
        >
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto mx-auto max-w-md flex items-center gap-3 rounded-2xl
              bg-ink-800 border border-ink-700/70 px-4 py-3 shadow-2xl
              animate-[toastIn_220ms_cubic-bezier(0.32,0.72,0,1)]"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink-50">{toast.message}</p>
              {toast.detail && <p className="text-xs text-ink-300 mt-0.5">{toast.detail}</p>}
            </div>
            {toast.actionLabel && toast.onAction && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  setToast(null);
                }}
                className="tap shrink-0 rounded-xl px-3 text-sm font-bold text-ember-300 active:bg-ink-700/70"
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
          <style>{`@keyframes toastIn { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }`}</style>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
```

`src/components/ui/IconButton.tsx`:
```tsx
import { Icon, type IconName } from '../Icon';

interface Props {
  icon: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger' | 'active';
}

const TONES = {
  default: 'text-ink-300',
  danger: 'text-rose-300',
  active: 'text-ember-300',
};

export function IconButton({ icon, label, onClick, disabled, tone = 'default' }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`tap grid place-items-center w-9 shrink-0 rounded-xl active:bg-ink-800/70 disabled:opacity-25 ${TONES[tone]}`}
    >
      <Icon name={icon} size={18} />
    </button>
  );
}
```

- [ ] **Step 8: Write the layout components**

`src/components/BottomNav.tsx`:
```tsx
import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

const items: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/history', label: 'History', icon: 'history' },
  { to: '/stats', label: 'Stats', icon: 'chart' },
  { to: '/settings', label: 'Settings', icon: 'gear' },
];

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 pb-safe pl-safe pr-safe
        border-t border-ink-800/70 bg-ink-950/85 backdrop-blur-xl"
    >
      <ul className="grid grid-cols-4 max-w-xl mx-auto">
        {items.map((it) => (
          <li key={it.to}>
            <NavLink
              to={it.to}
              end={it.to === '/'}
              className={({ isActive }) =>
                `tap relative flex flex-col items-center justify-center py-2.5 text-[11px] tracking-wide font-medium
                ${isActive ? 'text-ember-400' : 'text-ink-400'}`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-b-full bg-ember-500" />
                  )}
                  <Icon name={it.icon} size={22} strokeWidth={isActive ? 2 : 1.7} />
                  <span className="mt-1">{it.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

`src/components/ScreenHeader.tsx`:
```tsx
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';

interface Props {
  eyebrow?: string;
  title: string;
  /** Shows a back arrow linking here. */
  backTo?: string;
  right?: ReactNode;
}

export function ScreenHeader({ eyebrow, title, backTo, right }: Props) {
  return (
    <header className="px-5 pt-5 pb-4 flex items-end gap-2">
      {backTo && (
        <Link
          to={backTo}
          aria-label="Back"
          className="tap -ml-2 grid place-items-center w-10 rounded-xl text-ink-300 active:bg-ink-800/60"
        >
          <Icon name="arrow-left" size={22} />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="label-eyebrow text-ember-400/80 truncate">{eyebrow}</p>}
        <h1 className="display text-[32px] leading-none text-ink-50 mt-1 truncate">{title}</h1>
      </div>
      {right}
    </header>
  );
}
```

`src/components/CategoryBadge.tsx`:
```tsx
import type { Category } from '../db/types';
import { BADGE_CLASSES } from '../lib/categoryStyle';
import { Icon } from './Icon';

export function CategoryBadge({ category, size = 36 }: { category: Pick<Category, 'icon' | 'color'>; size?: number }) {
  return (
    <span
      className={`inline-grid place-items-center shrink-0 rounded-xl ${BADGE_CLASSES[category.color]}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Icon name={category.icon} size={Math.round(size * 0.55)} />
    </span>
  );
}
```

`src/screens/BootError.tsx`:
```tsx
export function BootError({ error }: { error: unknown }) {
  return (
    <div className="min-h-full grid place-items-center px-6 pt-safe pb-safe text-center">
      <div>
        <h1 className="display text-3xl text-ink-50">Can't open your data</h1>
        <p className="text-sm text-ink-300 mt-3">
          The app could not open its database. Nothing was deleted. Close the app completely and open it again.
        </p>
        <pre className="mt-4 text-left text-xs text-rose-300 whitespace-pre-wrap break-words">
          {error instanceof Error ? error.message : String(error)}
        </pre>
      </div>
    </div>
  );
}
```

Placeholder screens (each replaced by a later task). Create `src/screens/HomeScreen.tsx`:
```tsx
import { ScreenHeader } from '../components/ScreenHeader';

export function HomeScreen() {
  return <ScreenHeader title="Overview" />;
}
```
and the same shape for `HistoryScreen` (title "History"), `StatsScreen` ("Stats"), `SettingsScreen` ("Settings"), `CategoriesScreen` ("Categories", `backTo="/settings"`), `PresetsScreen` ("Quick add", `backTo="/settings"`).

- [ ] **Step 9: Wire `App.tsx` and `main.tsx`**

`src/App.tsx`:
```tsx
import { Route, Routes } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { ToastProvider } from './components/ui/Toast';
import { useAndroidBackButton } from './lib/useAndroidBackButton';
import { HomeScreen } from './screens/HomeScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { StatsScreen } from './screens/StatsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { CategoriesScreen } from './screens/CategoriesScreen';
import { PresetsScreen } from './screens/PresetsScreen';

export default function App() {
  useAndroidBackButton();

  return (
    <ConfirmProvider>
      <ToastProvider>
        <div className="min-h-full flex flex-col">
          {/* Soft status-bar scrim so content fades cleanly under the camera cutout */}
          <div
            className="fixed inset-x-0 top-0 z-20 pointer-events-none h-safe-top
              bg-gradient-to-b from-ink-950 via-ink-950/85 to-transparent"
          />
          <main className="flex-1 pt-safe pb-[calc(env(safe-area-inset-bottom)+84px)] px-safe">
            <Routes>
              <Route path="/" element={<HomeScreen />} />
              <Route path="/history" element={<HistoryScreen />} />
              <Route path="/stats" element={<StatsScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="/settings/categories" element={<CategoriesScreen />} />
              <Route path="/settings/presets" element={<PresetsScreen />} />
            </Routes>
          </main>
          <BottomNav />
        </div>
      </ToastProvider>
    </ConfirmProvider>
  );
}
```

`src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { BootError } from './screens/BootError';
import { db } from './db/db';
import { seedIfEmpty } from './db/seed';
import { getSettings } from './db/queries';
import { primeSettings } from './hooks/useData';
import { useStore } from './store/useStore';
import './index.css';

async function boot() {
  const root = ReactDOM.createRoot(document.getElementById('root')!);
  try {
    await db.open();
    await seedIfEmpty();
    const settings = await getSettings();
    primeSettings(settings);
    // Decide the lock before the first frame so balances never flash on screen.
    useStore.getState().setLocked(settings.lockEnabled);
  } catch (err) {
    console.error('DB init failed', err);
    root.render(<BootError error={err} />);
    return;
  }
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  );
}

void boot();
```

- [ ] **Step 10: Add the screenshot tool `scripts/ui-shot.mjs`**

```js
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
    const el = [...document.querySelectorAll('button, a, [role=radio]')]
      .find((e) => e.textContent.trim() === text || e.getAttribute('aria-label') === text);
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
```

Add `ui-shots/` to `.gitignore`.

- [ ] **Step 11: Verify**

Run: `npm test` → PASS. Run: `npm run build` → exits 0.
Run `npm run dev` in the background, then `node scripts/ui-shot.mjs <scratchpad>/shots` and open `home.png`.
Expected: dark gym-tracker styling, "Overview" header, bottom nav with Home/History/Stats/Settings, Home highlighted.

- [ ] **Step 12: Commit**

```bash
git add -A src scripts tests .gitignore
git commit -m "Add app shell, navigation, shared UI primitives and screenshot tool"
```

---

### Task 8: Add / Edit entry sheet

**Files:**
- Create: `src/components/KindToggle.tsx`, `src/components/AmountKeypad.tsx`, `src/components/CategoryGrid.tsx`, `src/components/CategoryEditor.tsx`, `src/components/ui/CalendarSheet.tsx`, `src/components/TransactionSheet.tsx`
- Modify: `src/App.tsx` (mount `<TransactionSheet />` after `</main>`)

**Interfaces:**
- Consumes: `useStore` (`sheet`, `closeSheet`), `addTransaction`, `updateTransaction`, `deleteTransaction`, `listCategories`, `withBudgetCheck`, `addCategory`, `updateCategory`, `budgetMessage`, money keypad helpers, `todayISO`, `addDaysISO`, `formatShortDate`, `parseISODate`, `daysInMonth`, `pad2`, `MONTHS_LONG`.
- Produces: `<TransactionSheet />` (global, driven by the store); `<CategoryEditor open kind category? onClose onSaved(id) />`; `<CalendarSheet open value max? onPick onClose />`; `<KindToggle value onChange />`; `<AmountKeypad onKey />`; `<CategoryGrid categories selectedId onSelect onAddNew />`.

- [ ] **Step 1: `src/components/KindToggle.tsx`**

```tsx
import type { Kind } from '../db/types';

const OPTIONS: { kind: Kind; label: string }[] = [
  { kind: 'expense', label: 'Expense' },
  { kind: 'income', label: 'Income' },
];

export function KindToggle({ value, onChange }: { value: Kind; onChange: (k: Kind) => void }) {
  return (
    <div role="radiogroup" aria-label="Entry type" className="grid grid-cols-2 gap-1 rounded-2xl bg-ink-800/60 p-1 border border-ink-700/50">
      {OPTIONS.map((o) => {
        const active = o.kind === value;
        const activeClass = o.kind === 'expense' ? 'bg-ember-500 text-white' : 'bg-emerald-500 text-ink-950';
        return (
          <button
            key={o.kind}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.kind)}
            className={`tap rounded-xl text-sm font-bold ${active ? activeClass : 'text-ink-300'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: `src/components/AmountKeypad.tsx`**

```tsx
import type { KeypadKey } from '../lib/money';
import { Icon } from './Icon';

const KEYS: KeypadKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'back'];

/** In-app number pad; som amounts are large, so "000" gets its own key. */
export function AmountKeypad({ onKey }: { onKey: (k: KeypadKey) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onKey(k)}
          aria-label={k === 'back' ? 'Delete digit' : k}
          className="tap h-14 rounded-2xl bg-ink-800/60 border border-ink-700/50 text-2xl font-semibold text-ink-50 num active:bg-ink-700/70"
        >
          {k === 'back' ? <Icon name="backspace" size={24} className="mx-auto" /> : k}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: `src/components/CategoryGrid.tsx`**

```tsx
import type { Category } from '../db/types';
import { CategoryBadge } from './CategoryBadge';
import { Icon } from './Icon';

interface Props {
  categories: Category[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAddNew: () => void;
}

export function CategoryGrid({ categories, selectedId, onSelect, onAddNew }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {categories.map((c) => {
        const active = c.id === selectedId;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id!)}
            aria-pressed={active}
            className={`tap flex flex-col items-center gap-1 rounded-2xl border px-1 py-2
              ${active ? 'bg-ember-500/15 border-ember-500/60' : 'bg-ink-800/40 border-transparent'}`}
          >
            <CategoryBadge category={c} size={32} />
            <span className={`w-full truncate text-[11px] font-semibold ${active ? 'text-ink-50' : 'text-ink-300'}`}>
              {c.name}
            </span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={onAddNew}
        className="tap flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-ink-600 px-1 py-2 text-ink-300"
      >
        <Icon name="plus" size={20} />
        <span className="text-[11px] font-semibold">New</span>
      </button>
    </div>
  );
}
```

- [ ] **Step 4: `src/components/CategoryEditor.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Sheet } from './ui/Sheet';
import { TextField } from './ui/TextField';
import { CategoryBadge } from './CategoryBadge';
import { Icon } from './Icon';
import { addCategory, updateCategory } from '../db/queries';
import { CATEGORY_COLORS, CATEGORY_ICONS, type Category, type CategoryColor, type CategoryIcon, type Kind } from '../db/types';
import { SWATCH_CLASSES } from '../lib/categoryStyle';

interface Props {
  open: boolean;
  kind: Kind;
  /** The category to edit; omit to create a new one. */
  category?: Category;
  onClose: () => void;
  onSaved: (id: number) => void;
}

export function CategoryEditor({ open, kind, category, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<CategoryIcon>('dots');
  const [color, setColor] = useState<CategoryColor>('sky');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? '');
    setIcon(category?.icon ?? 'dots');
    setColor(category?.color ?? 'sky');
    setError(null);
    setSaving(false);
  }, [open, category]);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      let id: number;
      if (category) {
        await updateCategory(category.id!, { name, icon, color });
        id = category.id!;
      } else {
        id = await addCategory({ name, kind, icon, color });
      }
      onSaved(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow={kind === 'expense' ? 'Expense category' : 'Income category'}
      title={category ? 'Edit category' : 'New category'}
    >
      <div className="px-4 pt-4 pb-5 space-y-4">
        <div className="flex items-center gap-3">
          <CategoryBadge category={{ icon, color }} size={44} />
          <div className="flex-1">
            <TextField placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
          </div>
        </div>
        <div>
          <p className="label-eyebrow mb-2">Icon</p>
          <div className="grid grid-cols-7 gap-1.5">
            {CATEGORY_ICONS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                aria-label={i}
                aria-pressed={i === icon}
                className={`tap grid place-items-center rounded-xl h-11 border
                  ${i === icon ? 'border-ember-500/60 bg-ember-500/15 text-ember-200' : 'border-transparent bg-ink-800/50 text-ink-300'}`}
              >
                <Icon name={i} size={20} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="label-eyebrow mb-2">Color</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                aria-pressed={c === color}
                className={`w-9 h-9 rounded-full grid place-items-center ${SWATCH_CLASSES[c]}
                  ${c === color ? 'ring-2 ring-offset-2 ring-offset-ink-900 ring-ink-50' : ''}`}
              >
                {c === color && <Icon name="check" size={16} className="text-ink-950" />}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || name.trim() === ''}
          className="btn-primary w-full py-3 disabled:opacity-40"
        >
          {category ? 'Save' : 'Add category'}
        </button>
      </div>
    </Sheet>
  );
}
```

- [ ] **Step 5: `src/components/ui/CalendarSheet.tsx`** (month grid from gym-tracker's DatePicker; Monday first)

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Sheet } from './Sheet';
import { Icon } from '../Icon';
import { MONTHS_LONG, daysInMonth, pad2, parseISODate, todayISO } from '../../lib/dates';

interface Props {
  open: boolean;
  value: string;
  /** Latest pickable date (inclusive). */
  max?: string;
  onPick: (iso: string) => void;
  onClose: () => void;
}

function monthOf(iso: string) {
  const { y, m } = parseISODate(iso);
  return { y, m };
}

/** ISO dates of one month in a Monday-first grid; null pads the first week. */
function buildGrid(y: number, m: number): (string | null)[] {
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= daysInMonth(y, m); d++) cells.push(`${y}-${pad2(m)}-${pad2(d)}`);
  return cells;
}

export function CalendarSheet({ open, value, max, onPick, onClose }: Props) {
  const [view, setView] = useState(() => monthOf(value));
  useEffect(() => {
    if (open) setView(monthOf(value));
  }, [open, value]);

  const today = todayISO();
  const cells = useMemo(() => buildGrid(view.y, view.m), [view]);
  const atMax = !!max && `${view.y}-${pad2(view.m)}` >= max.slice(0, 7);

  function shift(delta: number) {
    const idx = view.y * 12 + (view.m - 1) + delta;
    setView({ y: Math.floor(idx / 12), m: (idx % 12) + 1 });
  }

  return (
    <Sheet open={open} onClose={onClose} eyebrow="Date" title={`${MONTHS_LONG[view.m - 1]} ${view.y}`}>
      <div className="px-4 pt-3 pb-5">
        <div className="flex items-center justify-between mb-3">
          <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="tap rounded-full p-2 text-ink-300 active:bg-ink-800/60">
            <Icon name="chevron-left" size={20} />
          </button>
          <button type="button" onClick={() => setView(monthOf(today))} className="tap text-xs uppercase tracking-[0.18em] text-ink-400 px-3">
            Today
          </button>
          <button type="button" onClick={() => shift(1)} disabled={atMax} aria-label="Next month" className="tap rounded-full p-2 text-ink-300 active:bg-ink-800/60 disabled:opacity-30">
            <Icon name="chevron-right" size={20} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-[10px] uppercase tracking-[0.18em] text-ink-500 py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            if (!c) return <div key={i} />;
            const disabled = !!max && c > max;
            const selected = c === value;
            return (
              <button
                key={c}
                type="button"
                disabled={disabled}
                onClick={() => onPick(c)}
                className={`relative h-10 rounded-xl text-sm num
                  ${selected ? 'bg-ember-500 text-white font-bold shadow-glow' : 'text-ink-100 active:bg-ink-800/70'}
                  ${disabled ? 'opacity-30' : ''}`}
              >
                {Number(c.slice(8))}
                {c === today && !selected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-ember-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}
```

- [ ] **Step 6: `src/components/TransactionSheet.tsx`**

```tsx
import { useMemo, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Sheet } from './ui/Sheet';
import { TextField } from './ui/TextField';
import { CalendarSheet } from './ui/CalendarSheet';
import { useConfirm } from './ui/ConfirmDialog';
import { useToast } from './ui/Toast';
import { AmountKeypad } from './AmountKeypad';
import { CategoryEditor } from './CategoryEditor';
import { CategoryGrid } from './CategoryGrid';
import { KindToggle } from './KindToggle';
import { Icon } from './Icon';
import { useStore, type SheetState } from '../store/useStore';
import { addTransaction, deleteTransaction, listCategories, updateTransaction, withBudgetCheck } from '../db/queries';
import type { Category, Kind } from '../db/types';
import { amountToDigits, applyKey, digitsToAmount, groupDigits } from '../lib/money';
import { addDaysISO, formatShortDate, todayISO } from '../lib/dates';
import { budgetMessage } from '../lib/budget';

/** The one Add/Edit sheet, opened from anywhere through the store. */
export function TransactionSheet() {
  const sheet = useStore((s) => s.sheet);
  const close = useStore((s) => s.closeSheet);
  return (
    <Sheet
      open={sheet !== null}
      onClose={close}
      eyebrow={sheet?.mode === 'edit' ? 'Edit entry' : 'New entry'}
      maxHeightClass="max-h-[94vh]"
      bodyMaxHeight="86vh"
    >
      {sheet && <TransactionForm key={sheet.nonce} sheet={sheet} onDone={close} />}
    </Sheet>
  );
}

function TransactionForm({ sheet, onDone }: { sheet: NonNullable<SheetState>; onDone: () => void }) {
  const editing = sheet.mode === 'edit' ? sheet.tx : null;
  const today = useMemo(() => todayISO(), []);
  const yesterday = addDaysISO(today, -1);

  const [kind, setKind] = useState<Kind>(sheet.mode === 'edit' ? sheet.tx.kind : sheet.kind);
  const [digits, setDigits] = useState(editing ? amountToDigits(editing.amount) : '');
  const [categoryId, setCategoryId] = useState<number | null>(editing?.categoryId ?? null);
  const [date, setDate] = useState(editing?.date ?? today);
  const [note, setNote] = useState(editing?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  const all = useLiveQuery(() => listCategories(kind, { includeArchived: true }), [kind], [] as Category[]);
  // Hidden categories stay out of the grid, except one an edited entry already uses.
  const categories = all.filter((c) => !c.archived || c.id === categoryId);

  const amount = digitsToAmount(digits);
  const valid = amount > 0 && categoryId !== null && all.some((c) => c.id === categoryId);
  const otherDate = date !== today && date !== yesterday;

  function switchKind(next: Kind) {
    if (next === kind) return;
    setKind(next);
    setCategoryId(null);
  }

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    const input = { kind, amount, categoryId: categoryId!, date, note };
    try {
      const crossing = await withBudgetCheck(() =>
        editing ? updateTransaction(editing.id!, input) : addTransaction(input),
      );
      if (crossing) toast({ message: budgetMessage(crossing) });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  async function remove() {
    if (!editing) return;
    const ok = await confirm({
      title: 'Delete this entry?',
      body: 'This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    await deleteTransaction(editing.id!);
    onDone();
  }

  return (
    <div className="px-4 pt-3 pb-4 space-y-4">
      <KindToggle value={kind} onChange={switchKind} />

      <p className={`text-center text-[44px] leading-none font-bold num tracking-tighter- break-all ${digits ? 'text-ink-50' : 'text-ink-600'}`}>
        {digits ? groupDigits(amount) : '0'}
        <span className="text-lg font-semibold text-ink-400 ml-2">so'm</span>
      </p>

      <CategoryGrid
        categories={categories}
        selectedId={categoryId}
        onSelect={setCategoryId}
        onAddNew={() => setEditorOpen(true)}
      />

      <div className="flex gap-2">
        <DateChip active={date === today} onClick={() => setDate(today)}>
          Today
        </DateChip>
        <DateChip active={date === yesterday} onClick={() => setDate(yesterday)}>
          Yesterday
        </DateChip>
        <DateChip active={otherDate} onClick={() => setCalendarOpen(true)}>
          <Icon name="calendar" size={16} />
          {otherDate ? formatShortDate(date) : 'Other'}
        </DateChip>
      </div>

      <TextField
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={200}
        enterKeyHint="done"
      />

      <AmountKeypad onKey={(k) => setDigits((d) => applyKey(d, k))} />

      {error && <p className="text-sm text-rose-300 text-center">{error}</p>}

      <div className="flex gap-2">
        {editing && (
          <button type="button" onClick={() => void remove()} aria-label="Delete entry" className="btn-ghost px-4 text-rose-300">
            <Icon name="trash" size={20} />
          </button>
        )}
        <button
          type="button"
          disabled={!valid || saving}
          onClick={() => void save()}
          className="btn-primary flex-1 py-3 text-base disabled:opacity-40"
        >
          {editing ? 'Save changes' : kind === 'expense' ? 'Save expense' : 'Save income'}
        </button>
      </div>

      <CategoryEditor
        open={editorOpen}
        kind={kind}
        onClose={() => setEditorOpen(false)}
        onSaved={(id) => {
          setCategoryId(id);
          setEditorOpen(false);
        }}
      />
      <CalendarSheet
        open={calendarOpen}
        value={date}
        max={today}
        onClose={() => setCalendarOpen(false)}
        onPick={(d) => {
          setDate(d);
          setCalendarOpen(false);
        }}
      />
    </div>
  );
}

function DateChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tap flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold
        ${active ? 'bg-ember-500/15 border-ember-500/50 text-ember-200' : 'bg-ink-800/50 border-ink-700/60 text-ink-300'}`}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 7: Mount the sheet in `src/App.tsx`**

Add `import { TransactionSheet } from './components/TransactionSheet';` and render `<TransactionSheet />` between `</main>` and `<BottomNav />`.

- [ ] **Step 8: Verify in the browser**

Run: `npm run build` → exits 0.
With `npm run dev` running, write `<scratchpad>/steps-add.json`:
```json
[
  { "path": "/", "js": "const { useStore } = await import('/src/store/useStore.ts'); useStore.getState().openAdd('expense');", "shot": "add-empty.png" },
  { "js": "tap('4'); tap('5'); tap('000'); tap('Food');", "shot": "add-filled.png" },
  { "js": "tap('Save expense'); await sleep(300); const q = await import('/src/db/queries.ts'); return (await q.allTransactions()).map(t => [t.amount, t.date]);", "shot": "after-save.png" },
  { "js": "const { useStore } = await import('/src/store/useStore.ts'); useStore.getState().openAdd('expense'); await sleep(300); tap('New');", "shot": "category-editor.png" }
]
```
Run: `node scripts/ui-shot.mjs <scratchpad>/shots <scratchpad>/steps-add.json`
Expected: `add-empty.png` shows the toggle, `0 so'm`, the category grid with "New", date chips, note, keypad and a disabled Save; `add-filled.png` shows `45 000 so'm` with Food selected; the save step prints `[[45000,"<today>"]]`; `category-editor.png` shows the editor sheet over the Add sheet. Fix any layout problem (e.g. the sheet needing to scroll on a 915px-tall screen) before committing.

- [ ] **Step 9: Commit**

```bash
git add src
git commit -m "Add the Add/Edit entry sheet with keypad, categories and dates"
```

---
### Task 9: Home screen (balance, budget, presets, recent entries)

**Files:**
- Create: `src/hooks/useLongPress.ts`, `src/components/TransactionRow.tsx`, `src/components/DayGroupList.tsx`, `src/components/BalanceCard.tsx`, `src/components/BudgetBar.tsx`, `src/components/PresetEditor.tsx`, `src/components/PresetBar.tsx`
- Replace: `src/screens/HomeScreen.tsx`

**Interfaces:**
- Consumes: `useSettings`, `useCurrentPeriod`, `useCategoryMap`, `useToday`, `useStore.openAdd/openEdit`, `transactionsBetween`, `allTransactions`, `recentTransactions`, `updateSettings`, `listPresets`, `logPreset`, `deleteTransaction`, `withBudgetCheck`, `listCategories`, `addPreset`, `updatePreset`, `deletePreset`, `totals`, `balance`, `groupByDay`, `budgetStatus`, `budgetMessage`, money formatters, `periodLabel`, `periodRangeLabel`, `parseWholeNumber`.
- Produces: `<TransactionRow tx category? />`, `<DayGroupList groups categories showNet? />`, `<PresetEditor open preset? onClose />` (reused by Task 12), `useLongPress(onLongPress, onClick)`.

- [ ] **Step 1: `src/hooks/useLongPress.ts`**

```ts
import { useRef } from 'react';

const LONG_PRESS_MS = 500;

/**
 * Pointer handlers for a button that does `onClick` on a tap and
 * `onLongPress` when held. Scrolling cancels the press (pointercancel).
 */
export function useLongPress(onLongPress: () => void, onClick: () => void) {
  const timer = useRef<number | null>(null);
  const fired = useRef(false);

  const clear = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  return {
    onPointerDown: () => {
      fired.current = false;
      clear();
      timer.current = window.setTimeout(() => {
        fired.current = true;
        onLongPress();
      }, LONG_PRESS_MS);
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
    onClick: () => {
      if (fired.current) {
        fired.current = false;
        return;
      }
      onClick();
    },
  };
}
```

- [ ] **Step 2: Entry list components**

`src/components/TransactionRow.tsx`:
```tsx
import type { Category, Transaction } from '../db/types';
import { useStore } from '../store/useStore';
import { formatSigned } from '../lib/money';
import { UNKNOWN_CATEGORY } from '../lib/categoryStyle';
import { CategoryBadge } from './CategoryBadge';

export function TransactionRow({ tx, category }: { tx: Transaction; category?: Category }) {
  const openEdit = useStore((s) => s.openEdit);
  const c = category ?? UNKNOWN_CATEGORY;
  return (
    <li>
      <button
        type="button"
        onClick={() => openEdit(tx)}
        className="tap w-full flex items-center gap-3 px-3.5 py-2.5 text-left active:bg-ink-800/50"
      >
        <CategoryBadge category={c} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-ink-50">{c.name}</span>
          {tx.note && <span className="block truncate text-xs text-ink-400">{tx.note}</span>}
        </span>
        <span className={`shrink-0 font-semibold num ${tx.kind === 'income' ? 'text-emerald-300' : 'text-ink-100'}`}>
          {formatSigned(tx.amount, tx.kind)}
        </span>
      </button>
    </li>
  );
}
```

`src/components/DayGroupList.tsx`:
```tsx
import type { Category, Transaction } from '../db/types';
import type { DayGroup } from '../lib/filter';
import { formatDayHeading } from '../lib/dates';
import { formatNet } from '../lib/money';
import { useToday } from '../hooks/useToday';
import { TransactionRow } from './TransactionRow';

interface Props {
  groups: DayGroup<Transaction>[];
  categories: Map<number, Category>;
  /** Show each day's net total (only meaningful when the groups hold whole days). */
  showNet?: boolean;
}

export function DayGroupList({ groups, categories, showNet = false }: Props) {
  const today = useToday();
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <section key={g.date}>
          <div className="flex items-baseline justify-between px-1 mb-1.5">
            <h3 className="text-xs font-semibold text-ink-300">{formatDayHeading(g.date, today)}</h3>
            {showNet && (
              <span className={`text-xs font-semibold num ${g.net > 0 ? 'text-emerald-300' : 'text-ink-400'}`}>
                {formatNet(g.net)}
              </span>
            )}
          </div>
          <ul className="card divide-y divide-ink-800/80 overflow-hidden">
            {g.items.map((t) => (
              <TransactionRow key={t.id} tx={t} category={categories.get(t.categoryId)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Summary cards**

`src/components/BalanceCard.tsx`:
```tsx
import type { Totals } from '../lib/stats';
import { formatNet, formatSom, groupDigits } from '../lib/money';

export function BalanceCard({ balance, totals }: { balance: number; totals: Totals }) {
  return (
    <div className="card p-5">
      <p className="label-eyebrow">Balance</p>
      <p
        className={`mt-1 text-[clamp(28px,9vw,40px)] leading-tight font-bold tracking-tighter- break-words
          ${balance < 0 ? 'text-rose-300' : 'text-ink-50'}`}
      >
        {formatSom(balance)}
      </p>
      <p className="label-eyebrow mt-4 pt-4 border-t border-ink-800/80">This month</p>
      <div className="grid grid-cols-3 gap-2 mt-2">
        <Figure label="Income" value={groupDigits(totals.income)} className="text-emerald-300" />
        <Figure label="Spent" value={groupDigits(totals.spent)} className="text-ink-50" />
        <Figure label="Net" value={formatNet(totals.net)} className={totals.net < 0 ? 'text-rose-300' : 'text-ink-50'} />
      </div>
    </div>
  );
}

function Figure({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-ink-400 font-medium">{label}</p>
      <p className={`text-base font-semibold num break-words ${className}`}>{value}</p>
    </div>
  );
}
```

`src/components/BudgetBar.tsx`:
```tsx
import { budgetStatus, type BudgetLevel } from '../lib/budget';
import { formatSom } from '../lib/money';
import { Icon, type IconName } from './Icon';

// Status colours always come with an icon and words, never colour alone.
const LEVEL: Record<BudgetLevel, { fill: string; track: string; text: string; icon: IconName }> = {
  ok: { fill: 'bg-emerald-500', track: 'bg-emerald-500/15', text: 'text-emerald-300', icon: 'check' },
  warning: { fill: 'bg-amber-400', track: 'bg-amber-400/15', text: 'text-amber-300', icon: 'caution' },
  over: { fill: 'bg-rose-500', track: 'bg-rose-500/15', text: 'text-rose-300', icon: 'caution' },
};

export function BudgetBar({ spent, limit }: { spent: number; limit: number }) {
  const s = budgetStatus(spent, limit);
  const style = LEVEL[s.level];
  const pct = Math.round(s.ratio * 100);
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="label-eyebrow">Budget</p>
        <p className={`flex items-center gap-1 text-xs font-semibold ${style.text}`}>
          <Icon name={style.icon} size={14} />
          {s.level === 'over' ? `Over by ${formatSom(-s.remaining)}` : `${formatSom(s.remaining)} left`}
        </p>
      </div>
      <div
        className={`mt-3 h-2.5 rounded-full overflow-hidden ${style.track}`}
        role="meter"
        aria-label="Budget used"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={spent}
      >
        <div className={`h-full rounded-full ${style.fill}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <p className="mt-2 text-xs text-ink-400 num">
        {formatSom(spent)} of {formatSom(limit)} · {pct}%
      </p>
    </div>
  );
}
```

- [ ] **Step 4: `src/components/PresetEditor.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Sheet } from './ui/Sheet';
import { TextField } from './ui/TextField';
import { Select } from './ui/Select';
import { useConfirm } from './ui/ConfirmDialog';
import { addPreset, deletePreset, listCategories, updatePreset } from '../db/queries';
import type { Category, Preset } from '../db/types';
import { parseWholeNumber } from '../lib/money';

interface Props {
  open: boolean;
  /** The preset to edit; omit to create one. */
  preset?: Preset;
  onClose: () => void;
}

export function PresetEditor({ open, preset, onClose }: Props) {
  const categories = useLiveQuery(() => listCategories(undefined, { includeArchived: true }), [], [] as Category[]);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [amountText, setAmountText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();

  useEffect(() => {
    if (!open) return;
    setName(preset?.name ?? '');
    setCategoryId(preset?.categoryId ?? null);
    setAmountText(preset ? String(preset.amount) : '');
    setError(null);
    setSaving(false);
  }, [open, preset]);

  // Expense categories first, then income; hidden ones only if already chosen.
  const options = categories
    .filter((c) => !c.archived || c.id === categoryId)
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'expense' ? -1 : 1))
    .map((c) => ({ value: String(c.id), label: c.name, hint: c.kind === 'income' ? 'Income' : 'Expense' }));

  async function save() {
    if (saving) return;
    const amount = parseWholeNumber(amountText);
    if (categoryId === null) return setError('Pick a category');
    if (amount === null || amount <= 0) return setError('Enter the amount in whole som');
    setSaving(true);
    try {
      const input = { name, categoryId, amount };
      if (preset) await updatePreset(preset.id!, input);
      else await addPreset(input);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  async function remove() {
    if (!preset) return;
    const ok = await confirm({ title: `Delete "${preset.name}"?`, body: 'Entries already logged stay.', confirmLabel: 'Delete', tone: 'danger' });
    if (!ok) return;
    await deletePreset(preset.id!);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} eyebrow="Quick add" title={preset ? 'Edit preset' : 'New preset'}>
      <div className="px-4 pt-4 pb-5 space-y-3">
        <TextField eyebrow="Name" placeholder="e.g. Metro" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
        <Select
          eyebrow="Category"
          sheetTitle="Category"
          placeholder="Choose a category"
          value={categoryId === null ? '' : String(categoryId)}
          options={options}
          onChange={(v) => setCategoryId(Number(v))}
        />
        <TextField
          eyebrow="Amount (so'm)"
          inputMode="numeric"
          placeholder="2000"
          value={amountText}
          onChange={(e) => setAmountText(e.target.value)}
        />
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <div className="flex gap-2 pt-1">
          {preset && (
            <button type="button" onClick={() => void remove()} className="btn-ghost px-4 text-rose-300">
              Delete
            </button>
          )}
          <button type="button" onClick={() => void save()} disabled={saving} className="btn-primary flex-1 py-3 disabled:opacity-40">
            {preset ? 'Save' : 'Add preset'}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
```

- [ ] **Step 5: `src/components/PresetBar.tsx`**

```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useToast } from './ui/Toast';
import { CategoryBadge } from './CategoryBadge';
import { Icon } from './Icon';
import { PresetEditor } from './PresetEditor';
import { deleteTransaction, listPresets, logPreset, withBudgetCheck } from '../db/queries';
import type { Category, Preset } from '../db/types';
import { useCategoryMap } from '../hooks/useData';
import { useLongPress } from '../hooks/useLongPress';
import { budgetMessage } from '../lib/budget';
import { formatSigned, groupDigits } from '../lib/money';
import { UNKNOWN_CATEGORY } from '../lib/categoryStyle';

/** One-tap entries. Tap logs today's entry (with Undo); long-press edits. */
export function PresetBar() {
  const presets = useLiveQuery(listPresets, [], [] as Preset[]);
  const categories = useCategoryMap();
  const toast = useToast();
  const [editing, setEditing] = useState<Preset | null>(null);

  async function log(p: Preset) {
    const category = categories.get(p.categoryId) ?? UNKNOWN_CATEGORY;
    try {
      let id = 0;
      const crossing = await withBudgetCheck(async () => {
        id = await logPreset(p.id!);
      });
      toast({
        message: `${p.name} ${formatSigned(p.amount, category.kind)} so'm`,
        detail: crossing ? budgetMessage(crossing) : undefined,
        actionLabel: 'Undo',
        onAction: () => void deleteTransaction(id),
        durationMs: 5000,
      });
    } catch (e) {
      toast({ message: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between px-1 mb-2 mt-2">
        <h2 className="label-eyebrow">Quick add</h2>
        <Link to="/settings/presets" className="text-xs font-semibold text-ember-300">
          Edit
        </Link>
      </div>
      <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {presets.map((p) => (
          <PresetChip
            key={p.id}
            preset={p}
            category={categories.get(p.categoryId)}
            onTap={() => void log(p)}
            onLongPress={() => setEditing(p)}
          />
        ))}
        {presets.length === 0 && (
          <Link
            to="/settings/presets"
            className="tap shrink-0 inline-flex items-center gap-2 rounded-2xl border border-dashed border-ink-600 px-4 text-sm font-semibold text-ink-300"
          >
            <Icon name="plus" size={16} />
            Add a preset, e.g. Metro
          </Link>
        )}
      </div>
      <PresetEditor open={editing !== null} preset={editing ?? undefined} onClose={() => setEditing(null)} />
    </section>
  );
}

function PresetChip({
  preset,
  category,
  onTap,
  onLongPress,
}: {
  preset: Preset;
  category?: Category;
  onTap: () => void;
  onLongPress: () => void;
}) {
  const handlers = useLongPress(onLongPress, onTap);
  return (
    <button
      type="button"
      {...handlers}
      className="tap shrink-0 flex items-center gap-2 rounded-2xl bg-ink-800/60 border border-ink-700/50 pl-2 pr-3.5 py-2 select-none"
    >
      <CategoryBadge category={category ?? UNKNOWN_CATEGORY} size={30} />
      <span className="text-left">
        <span className="block text-sm font-semibold text-ink-50 leading-tight">{preset.name}</span>
        <span className="block text-[11px] text-ink-400 num">{groupDigits(preset.amount)}</span>
      </span>
    </button>
  );
}
```

- [ ] **Step 6: Replace `src/screens/HomeScreen.tsx`**

```tsx
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ScreenHeader } from '../components/ScreenHeader';
import { BalanceCard } from '../components/BalanceCard';
import { BudgetBar } from '../components/BudgetBar';
import { PresetBar } from '../components/PresetBar';
import { DayGroupList } from '../components/DayGroupList';
import { Icon } from '../components/Icon';
import { allTransactions, recentTransactions, transactionsBetween, updateSettings } from '../db/queries';
import type { Transaction } from '../db/types';
import { useCategoryMap, useCurrentPeriod, useSettings } from '../hooks/useData';
import { useStore } from '../store/useStore';
import { balance, totals } from '../lib/stats';
import { groupByDay } from '../lib/filter';
import { periodLabel, periodRangeLabel } from '../lib/period';

const NONE: Transaction[] = [];

export function HomeScreen() {
  const settings = useSettings();
  const period = useCurrentPeriod();
  const categories = useCategoryMap();
  const openAdd = useStore((s) => s.openAdd);
  const navigate = useNavigate();

  const periodTxs = useLiveQuery(() => transactionsBetween(period.start, period.end), [period.start, period.end], NONE);
  const everything = useLiveQuery(allTransactions, [], NONE);
  const recent = useLiveQuery(() => recentTransactions(10), [], NONE);

  const month = totals(periodTxs);

  return (
    <div className="pb-20">
      <ScreenHeader eyebrow={`${periodLabel(period)} · ${periodRangeLabel(period)}`} title="Overview" />
      <div className="px-4 space-y-3">
        {!settings.balancePromptDismissed && (
          <StartBalanceCard
            onSet={() => {
              void updateSettings({ balancePromptDismissed: true });
              navigate('/settings?focus=balance');
            }}
            onDismiss={() => void updateSettings({ balancePromptDismissed: true })}
          />
        )}
        <BalanceCard balance={balance(settings.openingBalance, everything)} totals={month} />
        {settings.monthlyBudget !== null && <BudgetBar spent={month.spent} limit={settings.monthlyBudget} />}
        <PresetBar />
        <section>
          <div className="flex items-center justify-between px-1 mb-2 mt-2">
            <h2 className="label-eyebrow">Recent</h2>
            <Link to="/history" className="text-xs font-semibold text-ember-300">
              See all
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="card p-5 text-center">
              <p className="text-ink-200 font-semibold">No entries yet</p>
              <p className="text-sm text-ink-400 mt-1">Tap + to log your first expense or income.</p>
            </div>
          ) : (
            <DayGroupList groups={groupByDay(recent)} categories={categories} />
          )}
        </section>
      </div>
      <button
        type="button"
        onClick={() => openAdd('expense')}
        aria-label="Add entry"
        className="btn-primary fixed right-5 z-30 w-16 h-16 rounded-2xl p-0"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}
      >
        <Icon name="plus" size={30} strokeWidth={2.2} />
      </button>
    </div>
  );
}

function StartBalanceCard({ onSet, onDismiss }: { onSet: () => void; onDismiss: () => void }) {
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl grid place-items-center bg-ember-500/15 text-ember-300 shrink-0">
        <Icon name="wallet" size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink-50">Set your starting balance</p>
        <p className="text-sm text-ink-300 mt-0.5">Enter the money you have now, so Balance matches your wallet.</p>
        <button type="button" onClick={onSet} className="btn-primary mt-3 py-2 text-sm">
          Set balance
        </button>
      </div>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="tap -m-2 p-2 text-ink-400">
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}
```

- [ ] **Step 7: Verify in the browser**

Run: `npm run build` → exits 0.
Steps file `<scratchpad>/steps-home.json` (seeds data through the real query layer, then screenshots):
```json
[
  { "path": "/", "shot": "home-empty.png" },
  { "js": "const q = await import('/src/db/queries.ts'); const cats = await q.listCategories(); const id = (n) => cats.find(c => c.name === n).id; const d = new Date(); const iso = (o) => { const x = new Date(d); x.setDate(x.getDate() - o); return x.toISOString().slice(0,10); }; await q.updateSettings({ openingBalance: 1200000, monthlyBudget: 3000000, balancePromptDismissed: true }); await q.addTransaction({ kind: 'income', amount: 6500000, categoryId: id('Salary'), date: iso(0), note: '' }); for (const [n, a, o, note] of [['Food', 45000, 0, 'plov'], ['Transport', 2000, 0, 'metro'], ['Groceries', 180000, 1, ''], ['Phone/Internet', 85000, 2, 'Beeline']]) await q.addTransaction({ kind: 'expense', amount: a, categoryId: id(n), date: iso(o), note }); await q.addPreset({ name: 'Metro', categoryId: id('Transport'), amount: 2000 }); await q.addPreset({ name: 'Lunch', categoryId: id('Food'), amount: 35000 }); return 'seeded';", "wait": 800, "shot": "home-data.png" },
  { "js": "tap('Metro');", "wait": 600, "shot": "home-preset-toast.png" }
]
```
Expected: `home-empty.png` shows the starting-balance card, balance `0 so'm`, "Add a preset" chip and the empty state; `home-data.png` shows balance `7 388 000 so'm` (1 200 000 + 6 500 000 − 312 000), the budget bar, Metro and Lunch chips and entries grouped by day; `home-preset-toast.png` shows the "Metro −2 000 so'm · Undo" toast and the new entry at the top.

Note: the seeding script uses `toISOString()` (UTC); if a seeded date lands in the future around midnight the add throws — rerun outside 00:00–05:00 local time.

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "Add Home screen with balance, budget bar, presets and recent entries"
```

---

### Task 10: History screen

**Files:**
- Create: `src/components/PeriodSwitcher.tsx`
- Replace: `src/screens/HistoryScreen.tsx`

**Interfaces:**
- Consumes: `useSelectedPeriod`, `useSettings`, `useCategoryMap`, `useStore` (`setSelectedPeriodKey`, `historyFilter`, `setHistoryFilter`), `transactionsBetween`, `filterTransactions`, `groupByDay`, `totals`, `shiftPeriod`, `periodLabel`, `periodRangeLabel`, `Select`, `DayGroupList`.
- Produces: `<PeriodSwitcher />` (shared with Stats).

- [ ] **Step 1: `src/components/PeriodSwitcher.tsx`**

```tsx
import { Icon } from './Icon';
import { useSelectedPeriod, useSettings } from '../hooks/useData';
import { useStore } from '../store/useStore';
import { periodLabel, periodRangeLabel, shiftPeriod } from '../lib/period';

/** ‹ Oct 2026 › — shared by History and Stats. Tapping the label jumps back to now. */
export function PeriodSwitcher() {
  const { period, isCurrent } = useSelectedPeriod();
  const { monthStartDay } = useSettings();
  const setKey = useStore((s) => s.setSelectedPeriodKey);
  const go = (delta: number) => setKey(shiftPeriod(period, delta, monthStartDay).key);

  return (
    <div className="card flex items-center justify-between px-2 py-1.5">
      <button type="button" onClick={() => go(-1)} aria-label="Previous month" className="tap rounded-xl p-2 text-ink-300 active:bg-ink-800/60">
        <Icon name="chevron-left" size={22} />
      </button>
      <button type="button" onClick={() => setKey(null)} className="tap text-center min-w-0 px-2">
        <span className="block font-semibold text-ink-50">
          {periodLabel(period)}
          {isCurrent && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-ember-300">Now</span>}
        </span>
        <span className="block text-xs text-ink-400">{periodRangeLabel(period)}</span>
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        disabled={isCurrent}
        aria-label="Next month"
        className="tap rounded-xl p-2 text-ink-300 active:bg-ink-800/60 disabled:opacity-25"
      >
        <Icon name="chevron-right" size={22} />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/screens/HistoryScreen.tsx`**

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { ScreenHeader } from '../components/ScreenHeader';
import { PeriodSwitcher } from '../components/PeriodSwitcher';
import { DayGroupList } from '../components/DayGroupList';
import { Icon } from '../components/Icon';
import { Select } from '../components/ui/Select';
import { transactionsBetween } from '../db/queries';
import type { Kind, Transaction } from '../db/types';
import { useCategoryMap, useSelectedPeriod } from '../hooks/useData';
import { useStore } from '../store/useStore';
import { filterTransactions, groupByDay } from '../lib/filter';
import { totals } from '../lib/stats';
import { groupDigits } from '../lib/money';

const KINDS: { value: Kind | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Expenses' },
  { value: 'income', label: 'Income' },
];

const NONE: Transaction[] = [];

export function HistoryScreen() {
  const { period } = useSelectedPeriod();
  const categories = useCategoryMap();
  const filter = useStore((s) => s.historyFilter);
  const setFilter = useStore((s) => s.setHistoryFilter);
  const txs = useLiveQuery(() => transactionsBetween(period.start, period.end), [period.start, period.end], NONE);

  const shown = filterTransactions(txs, filter, (id) => categories.get(id)?.name ?? '');
  const sum = totals(shown);

  const categoryOptions = [
    { value: 'all', label: 'All categories' },
    ...[...categories.values()]
      .filter((c) => filter.kind === 'all' || c.kind === filter.kind)
      .sort((a, b) => (a.kind === b.kind ? a.sortOrder - b.sortOrder : a.kind === 'expense' ? -1 : 1))
      .map((c) => ({
        value: String(c.id),
        label: c.name,
        hint: `${c.kind === 'income' ? 'Income' : 'Expense'}${c.archived ? ' · hidden' : ''}`,
      })),
  ];

  function setKind(kind: Kind | 'all') {
    const selected = filter.categoryId === null ? undefined : categories.get(filter.categoryId);
    const keepCategory = kind === 'all' || !selected || selected.kind === kind;
    setFilter({ kind, categoryId: keepCategory ? filter.categoryId : null });
  }

  return (
    <div>
      <ScreenHeader eyebrow="Entries" title="History" />
      <div className="px-4 space-y-3">
        <PeriodSwitcher />
        <div role="radiogroup" aria-label="Type" className="grid grid-cols-3 gap-1 rounded-2xl bg-ink-800/60 p-1 border border-ink-700/50">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              role="radio"
              aria-checked={filter.kind === k.value}
              onClick={() => setKind(k.value)}
              className={`tap rounded-xl text-sm font-bold ${filter.kind === k.value ? 'bg-ink-50 text-ink-950' : 'text-ink-300'}`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <Select
          eyebrow="Category"
          sheetTitle="Category"
          value={filter.categoryId === null ? 'all' : String(filter.categoryId)}
          options={categoryOptions}
          onChange={(v) => setFilter({ categoryId: v === 'all' ? null : Number(v) })}
        />
        <label className="relative block">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
          <input
            type="search"
            value={filter.query}
            onChange={(e) => setFilter({ query: e.target.value })}
            placeholder="Search notes and categories"
            enterKeyHint="search"
            className="field-flat pl-10"
          />
        </label>
        <p className="text-xs text-ink-400 px-1 num">
          {shown.length} {shown.length === 1 ? 'entry' : 'entries'} · in +{groupDigits(sum.income)} · out −{groupDigits(sum.spent)}
        </p>
        {shown.length === 0 ? (
          <div className="card p-5 text-center text-sm text-ink-400">Nothing here for this month and filter.</div>
        ) : (
          <DayGroupList groups={groupByDay(shown)} categories={categories} showNet />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify in the browser**

Run: `npm run build` → exits 0.
Steps: seed as in Task 9 Step 7 (same `js`), then `{ "path": "/history", "shot": "history.png" }`, then `{ "js": "tap('Expenses'); type('input[type=search]', 'metro');", "shot": "history-filtered.png" }`, then `{ "js": "tap('Previous month');", "shot": "history-prev.png" }`.
Expected: entries grouped by day with day net totals; filtered view shows only the metro entry; previous month shows the empty state and the › button enabled.

- [ ] **Step 4: Commit**

```bash
git add src
git commit -m "Add History screen with period switcher, filters and search"
```

---

### Task 11: Stats screen

**Files:**
- Create: `src/components/charts/chartTheme.ts`, `src/components/charts/TooltipCard.tsx`, `src/components/charts/CategoryBars.tsx`, `src/components/charts/DailySpendingChart.tsx`, `src/components/charts/IncomeVsSpendingChart.tsx`, `src/components/charts/CategoryTrendChart.tsx`
- Replace: `src/screens/StatsScreen.tsx`

**Interfaces:**
- Consumes: `useSelectedPeriod`, `useSettings`, `useCategoryMap`, `useToday`, `transactionsBetween`, `periodsEndingWith`, `periodLabel`, `periodShortLabel`, `inPeriod`, `totals`, `totalsByCategory`, `spendingPerDay`, `dailyAverage`, `totalsPerPeriod`, `categoryPerPeriod`, money formatters, `formatDayHeading`, `Select`, `PeriodSwitcher`.
- Produces: `SPEND_COLOR`, `INCOME_COLOR`; chart components as below.

- [ ] **Step 1: Chart theme and tooltip**

`src/components/charts/chartTheme.ts`:
```ts
// Series colours, validated with the dataviz palette checker against the card
// surface (#0e121b): both clear the lightness band, chroma floor, colour-blind
// separation (ΔE 10.8) and 3:1 contrast. Spending is the app's ember accent.
export const SPEND_COLOR = '#f25a0e';
export const INCOME_COLOR = '#1baf7a';

export const GRID_COLOR = '#1f2533'; // ink-700
export const AXIS_TEXT = '#9aa1b0'; // ink-300
export const AXIS_TICK = { fill: AXIS_TEXT, fontSize: 11 };
export const CURSOR_FILL = 'rgba(255,255,255,0.04)';
```

`src/components/charts/TooltipCard.tsx`:
```tsx
export interface TooltipRow {
  label: string;
  value: string;
  swatch?: string;
}

export function TooltipCard({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="rounded-xl bg-ink-800 border border-ink-700/70 px-3 py-2 shadow-xl text-xs min-w-[150px]">
      <p className="font-semibold text-ink-50 mb-1">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2 text-ink-300">
          {r.swatch && <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: r.swatch }} />}
          <span>{r.label}</span>
          <span className="ml-auto pl-3 font-semibold text-ink-50 num">{r.value}</span>
        </p>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: `src/components/charts/CategoryBars.tsx`** (spending by category — a ranked list of HTML bars, every value labelled)

```tsx
import type { Category } from '../../db/types';
import type { CategoryTotal } from '../../lib/stats';
import { groupDigits } from '../../lib/money';
import { UNKNOWN_CATEGORY } from '../../lib/categoryStyle';
import { CategoryBadge } from '../CategoryBadge';
import { SPEND_COLOR } from './chartTheme';

interface Props {
  rows: CategoryTotal[];
  categories: Map<number, Category>;
  onPick: (categoryId: number) => void;
}

export function CategoryBars({ rows, categories, onPick }: Props) {
  const max = rows[0]?.amount ?? 0;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const c = categories.get(r.categoryId) ?? UNKNOWN_CATEGORY;
        return (
          <li key={r.categoryId}>
            <button type="button" onClick={() => onPick(r.categoryId)} className="tap w-full text-left">
              <span className="flex items-center gap-2.5">
                <CategoryBadge category={c} size={28} />
                <span className="flex-1 min-w-0 truncate text-sm font-semibold text-ink-100">{c.name}</span>
                <span className="text-sm font-semibold text-ink-50 num">{groupDigits(r.amount)}</span>
                <span className="w-10 text-right text-xs text-ink-400 num">{Math.round(r.share * 100)}%</span>
              </span>
              <span className="block mt-1.5 ml-[38px] h-2 rounded-[4px] bg-ink-800">
                <span
                  className="block h-full rounded-r-[4px]"
                  style={{ width: `${max ? (r.amount / max) * 100 : 0}%`, background: SPEND_COLOR }}
                />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 3: `src/components/charts/DailySpendingChart.tsx`**

```tsx
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DayTotal } from '../../lib/stats';
import { formatCompact, formatSom } from '../../lib/money';
import { formatDayHeading } from '../../lib/dates';
import { AXIS_TEXT, AXIS_TICK, CURSOR_FILL, GRID_COLOR, SPEND_COLOR } from './chartTheme';
import { TooltipCard } from './TooltipCard';

interface Props {
  days: DayTotal[];
  average: number;
  today: string;
}

export function DailySpendingChart({ days, average, today }: Props) {
  const data = days.map((d) => ({ ...d, day: Number(d.date.slice(8)) }));
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 4, bottom: 0, left: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke={GRID_COLOR} />
          <XAxis dataKey="day" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_COLOR }} interval="preserveStartEnd" minTickGap={14} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} tickFormatter={formatCompact} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: CURSOR_FILL }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipCard
                  title={formatDayHeading(payload[0].payload.date, today)}
                  rows={[{ label: 'Spent', value: formatSom(payload[0].payload.spent), swatch: SPEND_COLOR }]}
                />
              ) : null
            }
          />
          {average > 0 && (
            <ReferenceLine
              y={average}
              stroke={AXIS_TEXT}
              strokeWidth={1}
              label={{ value: 'avg', position: 'insideTopRight', fill: AXIS_TEXT, fontSize: 10 }}
            />
          )}
          <Bar dataKey="spent" fill={SPEND_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: `src/components/charts/IncomeVsSpendingChart.tsx`** (two series → legend, tooltip, and a table view)

```tsx
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PeriodTotals } from '../../lib/stats';
import { formatCompact, formatNet, formatSom, groupDigits } from '../../lib/money';
import { AXIS_TICK, CURSOR_FILL, GRID_COLOR, INCOME_COLOR, SPEND_COLOR } from './chartTheme';
import { TooltipCard } from './TooltipCard';

export interface PeriodRow extends PeriodTotals {
  /** Axis label, e.g. "Oct". */
  label: string;
  /** Tooltip/table label, e.g. "Oct 2026". */
  title: string;
}

export function IncomeVsSpendingChart({ data }: { data: PeriodRow[] }) {
  return (
    <div>
      <div className="flex gap-4 text-xs text-ink-300 mb-2" aria-hidden>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: INCOME_COLOR }} />
          Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: SPEND_COLOR }} />
          Spending
        </span>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barGap={2} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke={GRID_COLOR} />
            <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_COLOR }} interval={0} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} tickFormatter={formatCompact} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: CURSOR_FILL }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as PeriodRow;
                return (
                  <TooltipCard
                    title={row.title}
                    rows={[
                      { label: 'Income', value: formatSom(row.income), swatch: INCOME_COLOR },
                      { label: 'Spending', value: formatSom(row.spent), swatch: SPEND_COLOR },
                      { label: 'Net', value: formatNet(row.net) },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="income" name="Income" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
            <Bar dataKey="spent" name="Spending" fill={SPEND_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3">
        <summary className="text-xs font-semibold text-ember-300 cursor-pointer">Show as table</summary>
        <table className="w-full mt-2 text-xs num">
          <thead>
            <tr className="text-ink-400 text-right">
              <th className="text-left font-medium py-1">Month</th>
              <th className="font-medium">Income</th>
              <th className="font-medium">Spent</th>
              <th className="font-medium">Net</th>
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((r) => (
              <tr key={r.key} className="text-right text-ink-100 border-t border-ink-800/80">
                <td className="text-left py-1.5">{r.title}</td>
                <td>{groupDigits(r.income)}</td>
                <td>{groupDigits(r.spent)}</td>
                <td className={r.net < 0 ? 'text-rose-300' : ''}>{formatNet(r.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
```

- [ ] **Step 5: `src/components/charts/CategoryTrendChart.tsx`**

```tsx
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCompact, formatSom } from '../../lib/money';
import { AXIS_TICK, CURSOR_FILL, GRID_COLOR } from './chartTheme';
import { TooltipCard } from './TooltipCard';

export interface TrendRow {
  key: string;
  label: string;
  title: string;
  amount: number;
}

export function CategoryTrendChart({ data, color, name }: { data: TrendRow[]; color: string; name: string }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="25%">
          <CartesianGrid vertical={false} stroke={GRID_COLOR} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_COLOR }} interval={0} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} tickFormatter={formatCompact} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: CURSOR_FILL }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as TrendRow;
              return <TooltipCard title={row.title} rows={[{ label: name, value: formatSom(row.amount), swatch: color }]} />;
            }}
          />
          <Bar dataKey="amount" fill={color} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 6: Replace `src/screens/StatsScreen.tsx`**

```tsx
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ScreenHeader } from '../components/ScreenHeader';
import { PeriodSwitcher } from '../components/PeriodSwitcher';
import { Select } from '../components/ui/Select';
import { CategoryBars } from '../components/charts/CategoryBars';
import { DailySpendingChart } from '../components/charts/DailySpendingChart';
import { IncomeVsSpendingChart } from '../components/charts/IncomeVsSpendingChart';
import { CategoryTrendChart } from '../components/charts/CategoryTrendChart';
import { INCOME_COLOR, SPEND_COLOR } from '../components/charts/chartTheme';
import { transactionsBetween } from '../db/queries';
import type { Transaction } from '../db/types';
import { useCategoryMap, useSelectedPeriod, useSettings } from '../hooks/useData';
import { useToday } from '../hooks/useToday';
import { periodLabel, periodShortLabel, periodsEndingWith } from '../lib/period';
import {
  categoryPerPeriod,
  dailyAverage,
  inPeriod,
  spendingPerDay,
  totals,
  totalsByCategory,
  totalsPerPeriod,
} from '../lib/stats';
import { formatSom } from '../lib/money';

const NONE: Transaction[] = [];

export function StatsScreen() {
  const { period } = useSelectedPeriod();
  const { monthStartDay } = useSettings();
  const categories = useCategoryMap();
  const today = useToday();
  const trendRef = useRef<HTMLDivElement>(null);
  const [trendPick, setTrendPick] = useState<number | null>(null);

  const periods = useMemo(() => periodsEndingWith(period, 12, monthStartDay), [period, monthStartDay]);
  const from = periods[0].start;
  const txs = useLiveQuery(() => transactionsBetween(from, period.end), [from, period.end], NONE);

  const current = inPeriod(txs, period);
  const byCategory = totalsByCategory(current, 'expense');
  const days = spendingPerDay(current, period);
  const average = dailyAverage(days, today);
  const perPeriod = totalsPerPeriod(txs, periods).map((row, i) => ({
    ...row,
    label: periodShortLabel(periods[i]),
    title: periodLabel(periods[i]),
  }));

  const trendId = trendPick ?? byCategory[0]?.categoryId ?? null;
  const trendCategory = trendId === null ? undefined : categories.get(trendId);
  const trend =
    trendId === null
      ? []
      : categoryPerPeriod(txs, trendId, periods).map((row, i) => ({
          ...row,
          label: periodShortLabel(periods[i]),
          title: periodLabel(periods[i]),
        }));

  const trendOptions = [...categories.values()]
    .sort((a, b) => (a.kind === b.kind ? a.sortOrder - b.sortOrder : a.kind === 'expense' ? -1 : 1))
    .map((c) => ({ value: String(c.id), label: c.name, hint: c.kind === 'income' ? 'Income' : 'Expense' }));

  return (
    <div>
      <ScreenHeader eyebrow="Where it goes" title="Stats" />
      <div className="px-4 space-y-3">
        <PeriodSwitcher />

        <Card title="Spending by category" subtitle={formatSom(totals(current).spent)}>
          {byCategory.length === 0 ? (
            <Empty />
          ) : (
            <CategoryBars
              rows={byCategory}
              categories={categories}
              onPick={(id) => {
                setTrendPick(id);
                trendRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            />
          )}
        </Card>

        <Card title="Spending per day" subtitle={`Average ${formatSom(average)} a day`}>
          <DailySpendingChart days={days} average={average} today={today} />
        </Card>

        <Card title="Income vs spending" subtitle="12 months">
          <IncomeVsSpendingChart data={perPeriod} />
        </Card>

        <div ref={trendRef} className="scroll-mt-4">
          <Card title="Category over time" subtitle="12 months">
            <Select
              eyebrow="Category"
              sheetTitle="Category"
              placeholder="Choose a category"
              value={trendId === null ? '' : String(trendId)}
              options={trendOptions}
              onChange={(v) => setTrendPick(Number(v))}
            />
            {trendCategory && (
              <div className="mt-3">
                <CategoryTrendChart
                  data={trend}
                  name={trendCategory.name}
                  color={trendCategory.kind === 'income' ? INCOME_COLOR : SPEND_COLOR}
                />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="card p-4">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="font-semibold text-ink-50">{title}</h2>
        {subtitle && <p className="text-xs text-ink-400 num">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Empty() {
  return <p className="text-sm text-ink-400 py-4 text-center">No spending this month yet.</p>;
}
```

- [ ] **Step 7: Verify in the browser**

Run: `npm run build` → exits 0.
Steps: seed as in Task 9 Step 7 plus a few entries in earlier months (dates 35 and 70 days ago), then `{ "path": "/stats", "shot": "stats-top.png" }` and `{ "js": "window.scrollTo(0, 2000);", "shot": "stats-bottom.png" }`.
Expected: category bars ranked with amounts and %; daily bars with an "avg" line; income/spending grouped bars with legend; category trend bars for the top category. Check against the dataviz anti-patterns: no dual axis, bars ≤ 24px, text never coloured with series colours, legend present for the two-series chart. Fix collisions or clipped labels before committing.

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "Add Stats screen with category, daily and monthly charts"
```

---
### Task 12: Settings, Categories and Presets screens, backup buttons

**Files:**
- Create: `src/lib/files.ts`, `src/lib/version.ts`, `src/components/NumberSetting.tsx`
- Replace: `src/screens/SettingsScreen.tsx`, `src/screens/CategoriesScreen.tsx`, `src/screens/PresetsScreen.tsx`

**Interfaces:**
- Consumes: `useSettings`, `useCurrentPeriod`, `updateSettings`, `createBackup`, `restoreBackup`, `createCsv`, `listCategories`, `moveCategory`, `setCategoryArchived`, `deleteCategory`, `listPresets`, `movePreset`, `CategoryEditor`, `PresetEditor`, `IconButton`, `Select`, `useConfirm`, `useToast`, `Downloads`, `parseWholeNumber`, `groupDigits`, `periodFor`, `periodRangeLabel`, `todayISO`.
- Produces: `saveTextFile(filename, text, mimeType): Promise<string>`; `APP_VERSION`; `<NumberSetting ... />`. Settings has a `data-section="security"` block that Task 13 fills.

- [ ] **Step 1: `src/lib/files.ts` and `src/lib/version.ts`**

`src/lib/files.ts`:
```ts
import { Capacitor } from '@capacitor/core';
import { Downloads } from './downloads.ts';

/**
 * Saves a text file. In the Android app it goes to the phone's public
 * Downloads folder (MediaStore); in a browser it is a normal download.
 * Returns where it went, for showing to the owner.
 */
export async function saveTextFile(filename: string, text: string, mimeType: string): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const { path } = await Downloads.saveToDownloads({ filename, data: text, mimeType });
    return path;
  }
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}
```

`src/lib/version.ts`:
```ts
import pkg from '../../package.json';

export const APP_VERSION: string = pkg.version;
```

- [ ] **Step 2: `src/components/NumberSetting.tsx`**

```tsx
import { useEffect, useState, type Ref } from 'react';
import { groupDigits, parseWholeNumber } from '../lib/money';

interface Props {
  label: string;
  hint?: string;
  value: number | null;
  /** What an empty field means: 0 (starting balance) or "off" (budget). */
  emptyMeans: 'zero' | 'off';
  allowNegative?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  onSave: (value: number | null) => Promise<void>;
}

/** A whole-som setting saved when the field loses focus or Enter is pressed. */
export function NumberSetting({ label, hint, value, emptyMeans, allowNegative = false, inputRef, onSave }: Props) {
  const [text, setText] = useState('');
  const [negative, setNegative] = useState(false);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (focused) return;
    setText(value === null || (value === 0 && emptyMeans === 'off') ? '' : groupDigits(value));
    setNegative((value ?? 0) < 0);
  }, [value, focused, emptyMeans]);

  async function commit(sign = negative) {
    const raw = text.trim();
    let next: number | null;
    if (raw === '') {
      next = emptyMeans === 'off' ? null : 0;
    } else {
      const n = parseWholeNumber(raw);
      if (n === null) {
        setError('Use digits only, in whole som');
        return;
      }
      next = sign && n !== 0 ? -n : n;
      if (emptyMeans === 'off' && next === 0) next = null;
    }
    if (next === value) {
      setError(null);
      return;
    }
    try {
      await onSave(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div>
      <p className="label-eyebrow">{label}</p>
      <div className="mt-1 flex gap-2">
        {allowNegative && (
          <button
            type="button"
            onClick={() => {
              const sign = !negative;
              setNegative(sign);
              void commit(sign);
            }}
            aria-label={negative ? 'Make positive' : 'Make negative'}
            className="btn-ghost w-12 text-lg font-bold"
          >
            {negative ? '−' : '+'}
          </button>
        )}
        <input
          ref={inputRef}
          inputMode="numeric"
          value={text}
          placeholder={emptyMeans === 'off' ? 'Off' : '0'}
          onFocus={() => setFocused(true)}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            setFocused(false);
            void commit();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          className="field-flat num flex-1"
        />
        <span className="self-center text-sm text-ink-400">so'm</span>
      </div>
      {hint && !error && <p className="text-xs text-ink-400 mt-1.5">{hint}</p>}
      {error && <p className="text-xs text-rose-300 mt-1.5">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Replace `src/screens/SettingsScreen.tsx`**

```tsx
import { useEffect, useRef, type ChangeEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ScreenHeader } from '../components/ScreenHeader';
import { NumberSetting } from '../components/NumberSetting';
import { Icon, type IconName } from '../components/Icon';
import { Select } from '../components/ui/Select';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { updateSettings } from '../db/queries';
import { createBackup, createCsv, restoreBackup } from '../db/backupData';
import { useCurrentPeriod, useSettings } from '../hooks/useData';
import { saveTextFile } from '../lib/files';
import { todayISO } from '../lib/dates';
import { periodContaining, periodRangeLabel } from '../lib/period';
import { APP_VERSION } from '../lib/version';

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: `Day ${i + 1}` }));

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function SettingsScreen() {
  const settings = useSettings();
  const period = useCurrentPeriod();
  const toast = useToast();
  const confirm = useConfirm();
  const [params] = useSearchParams();
  const balanceRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (params.get('focus') === 'balance') balanceRef.current?.focus();
  }, [params]);

  async function exportJson() {
    try {
      const where = await saveTextFile(
        `expense-tracker-${todayISO()}.json`,
        JSON.stringify(await createBackup(), null, 2),
        'application/json',
      );
      toast({ message: 'Backup saved', detail: where });
    } catch (e) {
      toast({ message: 'Export failed', detail: errorText(e) });
    }
  }

  async function exportCsv() {
    try {
      const where = await saveTextFile(`expense-tracker-${todayISO()}.csv`, await createCsv(), 'text/csv');
      toast({ message: 'CSV saved', detail: where });
    } catch (e) {
      toast({ message: 'Export failed', detail: errorText(e) });
    }
  }

  async function importFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const ok = await confirm({
      title: 'Replace all data?',
      body: `Everything in the app will be replaced with the contents of ${file.name}. This cannot be undone.`,
      confirmLabel: 'Replace',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      const { transactions } = await restoreBackup(await file.text());
      toast({ message: 'Backup restored', detail: `${transactions} entries` });
    } catch (err) {
      toast({ message: 'Import failed. Nothing was changed.', detail: errorText(err), durationMs: 6000 });
    }
  }

  return (
    <div>
      <ScreenHeader eyebrow="Expense Tracker" title="Settings" />
      <div className="px-4 space-y-3 pb-6">
        <Section title="Money">
          <NumberSetting
            label="Starting balance"
            hint="Money you had before your first entry. Tap ± for a debt."
            value={settings.openingBalance}
            emptyMeans="zero"
            allowNegative
            inputRef={balanceRef}
            onSave={(n) => updateSettings({ openingBalance: n ?? 0, balancePromptDismissed: true })}
          />
          <div>
            <Select
              eyebrow="Month starts on"
              sheetTitle="Month starts on"
              value={String(settings.monthStartDay)}
              options={DAY_OPTIONS.map((o) => ({
                ...o,
                hint: periodRangeLabel(periodContaining(todayISO(), Number(o.value))),
              }))}
              onChange={(v) => void updateSettings({ monthStartDay: Number(v) })}
            />
            <p className="text-xs text-ink-400 mt-1.5">
              This month: {periodRangeLabel(period)}. Pick your payday to match your salary cycle.
            </p>
          </div>
          <NumberSetting
            label="Monthly budget"
            hint="Leave empty to turn the budget off."
            value={settings.monthlyBudget}
            emptyMeans="off"
            onSave={(n) => updateSettings({ monthlyBudget: n })}
          />
        </Section>

        <Section title="Security">
          <div data-section="security" />
        </Section>

        <Section title="Manage">
          <NavRow to="/settings/categories" icon="tag" label="Categories" />
          <NavRow to="/settings/presets" icon="bolt" label="Quick-add presets" />
        </Section>

        <Section title="Backup">
          <ActionRow icon="download" label="Export backup (JSON)" hint="Saved to Downloads" onClick={() => void exportJson()} />
          <ActionRow icon="upload" label="Import backup" hint="Replaces all data" onClick={() => fileRef.current?.click()} />
          <ActionRow icon="file" label="Export CSV" hint="Opens in Excel or Google Sheets" onClick={() => void exportCsv()} />
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void importFile(e)} />
        </Section>

        <p className="text-center text-xs text-ink-500 pt-2">Expense Tracker {APP_VERSION}</p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card p-4 space-y-4">
      <h2 className="label-eyebrow text-ember-400/80">{title}</h2>
      {children}
    </section>
  );
}

function NavRow({ to, icon, label }: { to: string; icon: IconName; label: string }) {
  return (
    <Link to={to} className="tap flex items-center gap-3 -mx-1 px-1 rounded-xl active:bg-ink-800/50">
      <Icon name={icon} size={20} className="text-ink-300" />
      <span className="flex-1 font-semibold text-ink-100">{label}</span>
      <Icon name="chevron-right" size={18} className="text-ink-500" />
    </Link>
  );
}

function ActionRow({ icon, label, hint, onClick }: { icon: IconName; label: string; hint: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="tap w-full flex items-center gap-3 -mx-1 px-1 rounded-xl text-left active:bg-ink-800/50">
      <Icon name={icon} size={20} className="text-ink-300" />
      <span className="flex-1 min-w-0">
        <span className="block font-semibold text-ink-100">{label}</span>
        <span className="block text-xs text-ink-400">{hint}</span>
      </span>
    </button>
  );
}
```

- [ ] **Step 4: Replace `src/screens/CategoriesScreen.tsx`**

```tsx
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ScreenHeader } from '../components/ScreenHeader';
import { CategoryBadge } from '../components/CategoryBadge';
import { CategoryEditor } from '../components/CategoryEditor';
import { KindToggle } from '../components/KindToggle';
import { Icon } from '../components/Icon';
import { IconButton } from '../components/ui/IconButton';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { deleteCategory, listCategories, moveCategory, setCategoryArchived } from '../db/queries';
import type { Category, Kind } from '../db/types';

const NONE: Category[] = [];

export function CategoriesScreen() {
  const [kind, setKind] = useState<Kind>('expense');
  const rows = useLiveQuery(() => listCategories(kind, { includeArchived: true }), [kind], NONE);
  const [editing, setEditing] = useState<Category | undefined>(undefined);
  const [editorOpen, setEditorOpen] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  function openEditor(c?: Category) {
    setEditing(c);
    setEditorOpen(true);
  }

  async function remove(c: Category) {
    const ok = await confirm({ title: `Delete "${c.name}"?`, confirmLabel: 'Delete', tone: 'danger' });
    if (!ok) return;
    try {
      await deleteCategory(c.id!);
    } catch (e) {
      toast({ message: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <div>
      <ScreenHeader eyebrow="Settings" title="Categories" backTo="/settings" />
      <div className="px-4 space-y-3 pb-6">
        <KindToggle value={kind} onChange={setKind} />
        <ul className="card divide-y divide-ink-800/80 overflow-hidden">
          {rows.map((c, i) => (
            <li key={c.id} className="flex items-center gap-2 pl-3 pr-1.5 py-2">
              <CategoryBadge category={c} size={34} />
              <span className="flex-1 min-w-0">
                <span className={`block truncate font-semibold ${c.archived ? 'text-ink-400' : 'text-ink-50'}`}>{c.name}</span>
                {c.archived && <span className="block text-[10px] uppercase tracking-wider text-ink-500">Hidden</span>}
              </span>
              <IconButton icon="chevron-up" label="Move up" disabled={i === 0} onClick={() => void moveCategory(c.id!, -1)} />
              <IconButton icon="chevron-down" label="Move down" disabled={i === rows.length - 1} onClick={() => void moveCategory(c.id!, 1)} />
              <IconButton icon="edit" label="Edit" onClick={() => openEditor(c)} />
              <IconButton
                icon="archive"
                label={c.archived ? 'Unhide' : 'Hide'}
                tone={c.archived ? 'active' : 'default'}
                onClick={() => void setCategoryArchived(c.id!, !c.archived)}
              />
              <IconButton icon="trash" label="Delete" tone="danger" onClick={() => void remove(c)} />
            </li>
          ))}
        </ul>
        <p className="text-xs text-ink-400 px-1">
          Categories that have entries can't be deleted. Hide them instead: they leave the pickers but old entries keep their names.
        </p>
        <button type="button" onClick={() => openEditor()} className="btn-primary w-full py-3">
          <Icon name="plus" size={18} />
          Add {kind === 'expense' ? 'expense' : 'income'} category
        </button>
      </div>
      <CategoryEditor
        open={editorOpen}
        kind={kind}
        category={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={() => setEditorOpen(false)}
      />
    </div>
  );
}
```

- [ ] **Step 5: Replace `src/screens/PresetsScreen.tsx`**

```tsx
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ScreenHeader } from '../components/ScreenHeader';
import { CategoryBadge } from '../components/CategoryBadge';
import { PresetEditor } from '../components/PresetEditor';
import { Icon } from '../components/Icon';
import { IconButton } from '../components/ui/IconButton';
import { listPresets, movePreset } from '../db/queries';
import type { Preset } from '../db/types';
import { useCategoryMap } from '../hooks/useData';
import { formatSigned } from '../lib/money';
import { UNKNOWN_CATEGORY } from '../lib/categoryStyle';

const NONE: Preset[] = [];

export function PresetsScreen() {
  const presets = useLiveQuery(listPresets, [], NONE);
  const categories = useCategoryMap();
  const [editing, setEditing] = useState<Preset | undefined>(undefined);
  const [editorOpen, setEditorOpen] = useState(false);

  function openEditor(p?: Preset) {
    setEditing(p);
    setEditorOpen(true);
  }

  return (
    <div>
      <ScreenHeader eyebrow="Settings" title="Quick add" backTo="/settings" />
      <div className="px-4 space-y-3 pb-6">
        <p className="text-sm text-ink-300 px-1">
          Presets appear on Home. One tap logs the amount for today; hold a preset to edit it.
        </p>
        {presets.length > 0 && (
          <ul className="card divide-y divide-ink-800/80 overflow-hidden">
            {presets.map((p, i) => {
              const c = categories.get(p.categoryId) ?? UNKNOWN_CATEGORY;
              return (
                <li key={p.id} className="flex items-center gap-2 pl-3 pr-1.5 py-2">
                  <CategoryBadge category={c} size={34} />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate font-semibold text-ink-50">{p.name}</span>
                    <span className="block truncate text-xs text-ink-400 num">
                      {c.name} · {formatSigned(p.amount, c.kind)} so'm
                    </span>
                  </span>
                  <IconButton icon="chevron-up" label="Move up" disabled={i === 0} onClick={() => void movePreset(p.id!, -1)} />
                  <IconButton icon="chevron-down" label="Move down" disabled={i === presets.length - 1} onClick={() => void movePreset(p.id!, 1)} />
                  <IconButton icon="edit" label="Edit" onClick={() => openEditor(p)} />
                </li>
              );
            })}
          </ul>
        )}
        <button type="button" onClick={() => openEditor()} className="btn-primary w-full py-3">
          <Icon name="plus" size={18} />
          New preset
        </button>
      </div>
      <PresetEditor open={editorOpen} preset={editing} onClose={() => setEditorOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 6: Verify in the browser**

Run: `npm test` → PASS. Run: `npm run build` → exits 0.
Steps: `{ "path": "/settings", "shot": "settings.png" }`, `{ "path": "/settings/categories", "shot": "categories.png" }`, `{ "js": "tap('New preset')", "path": "/settings/presets", "shot": "preset-editor.png" }`, and a round trip: `{ "js": "const b = await import('/src/db/backupData.ts'); const q = await import('/src/db/queries.ts'); const cats = await q.listCategories('expense'); await q.addTransaction({ kind: 'expense', amount: 1000, categoryId: cats[0].id, date: '2026-01-01', note: 'a,\"b\"' }); const json = JSON.stringify(await b.createBackup()); await q.deleteTransaction((await q.allTransactions())[0].id); await b.restoreBackup(json); return [(await q.allTransactions()).length, (await b.createCsv()).split('\\r\\n')[1]];" }`.
Expected: settings sections render (Money, Security placeholder, Manage, Backup, version); categories list with move/edit/hide/delete buttons fits on one row at 412px; the round trip prints `[1,"2026-01-01,Expense,Food,1000,\"a,\"\"b\"\"\""]`.

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "Add Settings, Categories and Presets screens with backup and CSV export"
```

---

### Task 13: Fingerprint lock

**Files:**
- Create: `src/lib/lockTiming.ts`, `src/lib/biometric.ts`, `src/components/LockScreen.tsx`, `src/components/LockGate.tsx`, `src/components/LockSetting.tsx`
- Modify: `src/App.tsx` (wrap content in `<LockGate>`), `src/lib/useAndroidBackButton.ts` (minimize while locked), `src/screens/SettingsScreen.tsx` (render `<LockSetting />`)
- Test: `tests/lockTiming.test.mjs`

**Interfaces:**
- Consumes: `useStore.locked/setLocked`, `useSettings`, `updateSettings`, `useToast`, `@aparajita/capacitor-biometric-auth`.
- Produces: `RELOCK_AFTER_MS = 60_000`; `shouldRelock(hiddenAt: number | null, now: number, lockEnabled: boolean): boolean`; `type UnlockResult = 'ok' | 'cancelled' | 'unavailable' | 'failed'`; `lockAvailable(): Promise<boolean>`; `authenticate(reason): Promise<UnlockResult>`.

- [ ] **Step 1: Write the failing test**

`tests/lockTiming.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RELOCK_AFTER_MS, shouldRelock } from '../src/lib/lockTiming.ts';

test('relocks only when enabled and away for at least a minute', () => {
  assert.equal(RELOCK_AFTER_MS, 60_000);
  assert.equal(shouldRelock(1000, 1000 + 59_999, true), false);
  assert.equal(shouldRelock(1000, 1000 + 60_000, true), true);
  assert.equal(shouldRelock(1000, 1000 + 3_600_000, false), false);
  assert.equal(shouldRelock(null, 1e12, true), false);
});
```

Run: `npm test` → Expected: FAIL, cannot find `lockTiming.ts`.

- [ ] **Step 2: `src/lib/lockTiming.ts`**

```ts
/** Leaving the app for at least this long locks it again. */
export const RELOCK_AFTER_MS = 60_000;

/** hiddenAt: when the app went to the background (null if it never did while unlocked). */
export function shouldRelock(hiddenAt: number | null, now: number, lockEnabled: boolean): boolean {
  return lockEnabled && hiddenAt !== null && now - hiddenAt >= RELOCK_AFTER_MS;
}
```

Run: `npm test` → Expected: PASS.

- [ ] **Step 3: `src/lib/biometric.ts`**

```ts
import { BiometricAuth, BiometryError, BiometryErrorType } from '@aparajita/capacitor-biometric-auth';

export type UnlockResult = 'ok' | 'cancelled' | 'unavailable' | 'failed';

const UNAVAILABLE = new Set<string>([
  BiometryErrorType.biometryNotAvailable,
  BiometryErrorType.biometryNotEnrolled,
  BiometryErrorType.passcodeNotSet,
  BiometryErrorType.noDeviceCredential,
]);

const CANCELLED = new Set<string>([
  BiometryErrorType.userCancel,
  BiometryErrorType.systemCancel,
  BiometryErrorType.appCancel,
]);

/** True if the phone can verify the owner by fingerprint or by its screen-lock PIN/pattern. */
export async function lockAvailable(): Promise<boolean> {
  const info = await BiometricAuth.checkBiometry();
  return info.isAvailable || info.deviceIsSecure;
}

/** Shows the system fingerprint prompt, with the phone's PIN/pattern as fallback. */
export async function authenticate(reason: string): Promise<UnlockResult> {
  try {
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: 'Cancel',
      allowDeviceCredential: true,
      androidTitle: 'Expense Tracker',
      androidSubtitle: reason,
      androidConfirmationRequired: false,
    });
    return 'ok';
  } catch (e) {
    if (e instanceof BiometryError) {
      if (UNAVAILABLE.has(e.code)) return 'unavailable';
      if (CANCELLED.has(e.code)) return 'cancelled';
    }
    return 'failed';
  }
}
```

- [ ] **Step 4: `src/components/LockScreen.tsx` and `src/components/LockGate.tsx`**

`src/components/LockScreen.tsx`:
```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useToast } from './ui/Toast';
import { authenticate } from '../lib/biometric';
import { updateSettings } from '../db/queries';

/** Opaque cover shown while locked. Prompts on mount and whenever the app returns to the front. */
export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const toast = useToast();
  const busy = useRef(false);
  const [message, setMessage] = useState<string | null>(null);

  const unlock = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const result = await authenticate('Unlock to see your money');
    busy.current = false;
    if (result === 'ok') {
      onUnlock();
      return;
    }
    if (result === 'unavailable') {
      // The phone lost its fingerprint and screen lock: never lock the owner out of their data.
      await updateSettings({ lockEnabled: false });
      toast({ message: 'Fingerprint lock turned off', detail: 'This phone has no fingerprint or screen lock set up.' });
      onUnlock();
      return;
    }
    setMessage(result === 'failed' ? 'Could not verify. Try again.' : null);
  }, [onUnlock, toast]);

  useEffect(() => {
    void unlock();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void unlock();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [unlock]);

  return (
    <div className="fixed inset-0 z-[90] bg-ink-950 grid place-items-center px-8 pt-safe pb-safe">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl grid place-items-center bg-ember-500/15 text-ember-300">
          <Icon name="lock" size={32} />
        </div>
        <h1 className="display text-3xl text-ink-50 mt-5">Locked</h1>
        <p className="text-sm text-ink-300 mt-2">Use your fingerprint or phone PIN to open Expense Tracker.</p>
        {message && <p className="text-sm text-rose-300 mt-3">{message}</p>}
        <button type="button" onClick={() => void unlock()} className="btn-primary mt-6 px-8 py-3">
          Unlock
        </button>
      </div>
    </div>
  );
}
```

`src/components/LockGate.tsx`:
```tsx
import { useEffect, useRef, type ReactNode } from 'react';
import { LockScreen } from './LockScreen';
import { useSettings } from '../hooks/useData';
import { useStore } from '../store/useStore';
import { shouldRelock } from '../lib/lockTiming';

/**
 * Keeps the app mounted (an open Add sheet survives) and covers it with the
 * lock screen when locked. The first lock decision is made in main.tsx before
 * the first render; this relocks after a minute in the background.
 */
export function LockGate({ children }: { children: ReactNode }) {
  const locked = useStore((s) => s.locked);
  const setLocked = useStore((s) => s.setLocked);
  const { lockEnabled } = useSettings();
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'hidden') {
        if (!useStore.getState().locked) hiddenAt.current = Date.now();
        return;
      }
      if (shouldRelock(hiddenAt.current, Date.now(), lockEnabled)) setLocked(true);
      hiddenAt.current = null;
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [lockEnabled, setLocked]);

  return (
    <>
      {children}
      {locked && <LockScreen onUnlock={() => setLocked(false)} />}
    </>
  );
}
```

- [ ] **Step 5: `src/components/LockSetting.tsx`**

```tsx
import { useState } from 'react';
import { useToast } from './ui/Toast';
import { Icon } from './Icon';
import { updateSettings } from '../db/queries';
import { authenticate, lockAvailable } from '../lib/biometric';

export function LockSetting({ enabled }: { enabled: boolean }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (enabled) {
        await updateSettings({ lockEnabled: false });
        return;
      }
      if (!(await lockAvailable())) {
        toast({ message: 'Set up a fingerprint or screen lock on the phone first' });
        return;
      }
      // Prove it works before turning it on, so the owner can't lock themselves out.
      if ((await authenticate('Confirm to turn on the lock')) === 'ok') {
        await updateSettings({ lockEnabled: true });
        toast({ message: 'Fingerprint lock is on' });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => void toggle()}
      className="tap w-full flex items-center gap-3 -mx-1 px-1 rounded-xl text-left active:bg-ink-800/50"
    >
      <Icon name="lock" size={20} className="text-ink-300" />
      <span className="flex-1 min-w-0">
        <span className="block font-semibold text-ink-100">Fingerprint lock</span>
        <span className="block text-xs text-ink-400">Asks again after a minute away. Phone PIN works too.</span>
      </span>
      <span className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-ember-500' : 'bg-ink-700'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}
```

- [ ] **Step 6: Wire it up**

In `src/screens/SettingsScreen.tsx`: import `LockSetting` and replace `<div data-section="security" />` with `<LockSetting enabled={settings.lockEnabled} />`.

In `src/App.tsx`: import `LockGate` and wrap the `<div className="min-h-full flex flex-col">…</div>` in `<LockGate>…</LockGate>` (inside `ToastProvider`).

In `src/lib/useAndroidBackButton.ts`: add `import { useStore } from '../store/useStore.ts';` and make the first line of the `backButton` listener:
```ts
      // While locked, back sends the app to the background instead of reaching hidden screens.
      if (useStore.getState().locked) {
        void App.minimizeApp();
        return;
      }
```

- [ ] **Step 7: Verify**

Run: `npm test` → PASS. Run: `npm run build` → exits 0.
Browser check (the plugin simulates biometry on the web): steps `{ "path": "/settings", "shot": "settings-lock.png" }` then `{ "js": "tap('Fingerprint lock'); await sleep(500);", "shot": "lock-toast.png" }`.
Expected: the Security row shows the switch off; tapping it on the web shows "Set up a fingerprint or screen lock on the phone first" (no simulated biometry). The real prompt is checked on the phone in Task 14.

- [ ] **Step 8: Commit**

```bash
git add src tests/lockTiming.test.mjs
git commit -m "Add fingerprint lock with phone PIN fallback"
```

---
### Task 14: Android app, deep links and launcher icon

**Files:**
- Create: `src/lib/deepLink.ts`, `src/hooks/useDeepLinks.ts`, `scripts/gen-icons.mjs` (adapted), `android/` (generated by Capacitor)
- Replace: `android/app/src/main/java/com/mardon/expensetracker/MainActivity.java` (copied from gym-tracker), create `DownloadsPlugin.java` (copied)
- Modify: `android/app/src/main/AndroidManifest.xml` (deep-link intent filter), `android/app/src/main/res/values/styles.xml` (dark launch background), `android/app/src/main/res/values/ic_launcher_background.xml`, `src/App.tsx` (call `useDeepLinks()`)
- Test: `tests/deepLink.test.mjs`

**Interfaces:**
- Consumes: `useStore.openAdd`, `@capacitor/app` (`getLaunchUrl`, `appUrlOpen`).
- Produces: `parseDeepLink(url: string): { type: 'add'; kind: Kind } | null`; URL scheme `expensetracker://add?kind=expense|income` (Task 15's widget uses it).

- [ ] **Step 1: Write the failing test**

`tests/deepLink.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDeepLink } from '../src/lib/deepLink.ts';

test('parses the widget links', () => {
  assert.deepEqual(parseDeepLink('expensetracker://add?kind=income'), { type: 'add', kind: 'income' });
  assert.deepEqual(parseDeepLink('expensetracker://add?kind=expense'), { type: 'add', kind: 'expense' });
  assert.deepEqual(parseDeepLink('expensetracker://add'), { type: 'add', kind: 'expense' });
  assert.deepEqual(parseDeepLink('expensetracker://add?kind=weird'), { type: 'add', kind: 'expense' });
});

test('ignores anything else', () => {
  assert.equal(parseDeepLink('https://add?kind=income'), null);
  assert.equal(parseDeepLink('expensetracker://other'), null);
  assert.equal(parseDeepLink('not a url'), null);
  assert.equal(parseDeepLink(''), null);
});
```

Run: `npm test` → Expected: FAIL, cannot find `deepLink.ts`.

- [ ] **Step 2: `src/lib/deepLink.ts`**

```ts
import type { Kind } from '../db/types.ts';

export type DeepLinkAction = { type: 'add'; kind: Kind };

/** Understands expensetracker://add?kind=expense|income (sent by the home-screen widget). */
export function parseDeepLink(url: string): DeepLinkAction | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== 'expensetracker:' || u.host !== 'add') return null;
  return { type: 'add', kind: u.searchParams.get('kind') === 'income' ? 'income' : 'expense' };
}
```

Run: `npm test` → Expected: PASS.

- [ ] **Step 3: `src/hooks/useDeepLinks.ts` and wire into `App.tsx`**

```ts
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { parseDeepLink } from '../lib/deepLink.ts';
import { useStore } from '../store/useStore.ts';

/**
 * Opens the Add sheet when the app is launched (cold start) or brought back
 * (warm start) by the widget's expensetracker://add links. If the lock is on,
 * the lock screen covers the sheet until the owner unlocks.
 */
export function useDeepLinks(): void {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    function handle(url: string | undefined) {
      const action = url ? parseDeepLink(url) : null;
      if (!action) return;
      navigate('/');
      useStore.getState().openAdd(action.kind);
    }
    void App.getLaunchUrl().then((r) => handle(r?.url));
    const sub = App.addListener('appUrlOpen', (e) => handle(e.url));
    return () => {
      void sub.then((s) => s.remove());
    };
  }, [navigate]);
}
```

In `src/App.tsx` add `import { useDeepLinks } from './hooks/useDeepLinks';` and call `useDeepLinks();` right after `useAndroidBackButton();`.

Run: `npm run build` → exits 0.

- [ ] **Step 4: Generate the Android project**

```bash
npx cap add android
cp ../gym-tracker/android/app/src/main/java/com/mardon/workouttracker/MainActivity.java android/app/src/main/java/com/mardon/expensetracker/MainActivity.java
cp ../gym-tracker/android/app/src/main/java/com/mardon/workouttracker/DownloadsPlugin.java android/app/src/main/java/com/mardon/expensetracker/DownloadsPlugin.java
sed -i 's/^package com.mardon.workouttracker;/package com.mardon.expensetracker;/' android/app/src/main/java/com/mardon/expensetracker/*.java
```
Check: `grep -n "^package" android/app/src/main/java/com/mardon/expensetracker/*.java` → both `com.mardon.expensetracker`. `MainActivity` registers `DownloadsPlugin` and sets up edge-to-edge drawing.

- [ ] **Step 5: Deep-link intent filter**

In `android/app/src/main/AndroidManifest.xml`, inside the `MainActivity` `<activity>` element, after the LAUNCHER `<intent-filter>`, add:
```xml
            <!-- expensetracker://add?kind=expense|income — sent by the home-screen widget. -->
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:scheme="expensetracker" android:host="add" />
            </intent-filter>
```
(Capacitor's template already sets `android:launchMode="singleTask"`, so a widget tap on a running app arrives as `appUrlOpen`.)

- [ ] **Step 6: Launcher icon and dark launch background**

Copy the generator and replace its drawing:
```bash
cp ../gym-tracker/scripts/gen-icons.mjs scripts/gen-icons.mjs
```
In `scripts/gen-icons.mjs`:
1. Replace the four colour constants (`BG`, `BG_INNER`, `FG`, `ACCENT`) with:
```js
const BG = [0x0a, 0x0d, 0x14, 0xff]; // ink-950
const BG_INNER = [0x16, 0x1b, 0x27, 0xff]; // ink-800
const FG = [0xff, 0xff, 0xff, 0xff];
const EMBER = [0xf2, 0x5a, 0x0e, 0xff];
const EMBER_LIGHT = [0xff, 0x9d, 0x5e, 0xff];
const AQUA = [0x1b, 0xaf, 0x7a, 0xff];
```
2. Replace the whole `drawBarbell` function with `drawWallet` (same signature) and rename its call sites (`drawBarbell(` → `drawWallet(`, three places):
```js
/**
 * A wallet: ember body, lighter flap with a white clasp, and an aqua card
 * (income) peeking out of the top.
 * @param {number} size
 * @param {object} opts
 * @param {boolean} [opts.maskable]  small safe zone (PWA maskable / legacy launcher)
 * @param {boolean} [opts.foreground] transparent background + adaptive-icon safe zone
 */
function drawWallet(size, { maskable = false, foreground = false } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  if (!foreground) {
    for (let i = 0; i < size * size; i++) BG.forEach((v, k) => (buf[i * 4 + k] = v));
  }

  const safeScale = foreground ? 0.55 : maskable ? 0.62 : 0.84;
  const inset = Math.round((size * (1 - safeScale)) / 2);
  const inner = size - 2 * inset;
  const at = (f) => inset + Math.round(inner * f);
  const len = (f) => Math.max(1, Math.round(inner * f));

  if (!maskable && !foreground) {
    fillRoundRect(buf, size, at(0.02), at(0.02), len(0.96), len(0.96), Math.max(4, Math.round(size * 0.06)), BG_INNER);
  }

  fillRoundRect(buf, size, at(0.2), at(0.12), len(0.5), len(0.3), len(0.05), AQUA);
  fillRoundRect(buf, size, at(0.08), at(0.26), len(0.84), len(0.6), len(0.1), EMBER);
  fillRoundRect(buf, size, at(0.56), at(0.44), len(0.36), len(0.24), len(0.07), EMBER_LIGHT);
  fillCircle(buf, size, at(0.68), at(0.56), len(0.045), FG);

  void TRANSPARENT;
  return makePNG(size, buf);
}
```
3. In the PWA outputs loop keep only `icon-192.png` (used as the dev favicon): replace the `pwaOutputs` array with `[{ name: 'icon-192.png', size: 192, opts: {} }]`.

Run: `node scripts/gen-icons.mjs` → writes `public/icon-192.png` and the `mipmap-*` launcher PNGs.

Set the adaptive-icon background and the launch screen to the app's dark colour:
- `android/app/src/main/res/values/ic_launcher_background.xml`: colour value `#0a0d14`.
- `android/app/src/main/res/values/styles.xml`: in `AppTheme.NoActionBarLaunch` replace `<item name="android:background">@drawable/splash</item>` with
```xml
        <item name="android:background">@color/ic_launcher_background</item>
        <item name="windowSplashScreenBackground">@color/ic_launcher_background</item>
```

- [ ] **Step 7: Build the APK**

PowerShell:
```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
npm run build; npx cap sync android
& "$PWD\android\gradlew.bat" -p android assembleDebug
```
Expected: `BUILD SUCCESSFUL`, `android/app/build/outputs/apk/debug/app-debug.apk` exists.

- [ ] **Step 8: Install on the phone and check**

```powershell
adb devices                                  # expect RFCXA193X7L  device
& "$PWD\android\gradlew.bat" -p android installDebug
adb shell monkey -p com.mardon.expensetracker -c android.intent.category.LAUNCHER 1
adb exec-out screencap -p > <scratchpad>\phone-home.png     # use Git Bash for exec-out (binary)
adb shell am start -a android.intent.action.VIEW -d "expensetracker://add?kind=income" com.mardon.expensetracker
```
Expected: the app opens dark, edge-to-edge, on Home with the starting-balance card; the deep link opens the Add sheet with Income selected. Close the sheet without saving. Do **not** add test entries to the phone's database. If `adb devices` shows `unauthorized` or nothing, ask the owner to connect the phone and accept USB debugging, then continue. If the owner is around, ask them to try Settings → Fingerprint lock on the phone.

- [ ] **Step 9: Commit and push**

```bash
git add -A src scripts tests public android
git commit -m "Add Android app with deep links and launcher icon"
git push origin main
```

---

### Task 15: Home-screen widget

**Files:**
- Create: `android/app/src/main/java/com/mardon/expensetracker/QuickAddWidget.java`, `android/app/src/main/res/layout/widget_quick_add.xml`, `android/app/src/main/res/xml/quick_add_widget_info.xml`, `android/app/src/main/res/drawable/widget_background.xml`, `android/app/src/main/res/drawable/widget_button_expense.xml`, `android/app/src/main/res/drawable/widget_button_income.xml`
- Modify: `android/app/src/main/AndroidManifest.xml` (receiver), `android/app/src/main/res/values/strings.xml` (widget strings)

**Interfaces:**
- Consumes: the `expensetracker://add?kind=…` deep link and `MainActivity` from Task 14.

- [ ] **Step 1: `QuickAddWidget.java`**

```java
package com.mardon.expensetracker;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

/**
 * Home-screen widget with two buttons that open the app's Add sheet through
 * the expensetracker://add deep link. It shows no amounts: the data lives in
 * the WebView's IndexedDB (unreadable from here) and balances should not sit
 * on the home screen when the fingerprint lock is on.
 */
public class QuickAddWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        for (int widgetId : widgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quick_add);
            views.setOnClickPendingIntent(R.id.widget_add_expense, addIntent(context, "expense", 1));
            views.setOnClickPendingIntent(R.id.widget_add_income, addIntent(context, "income", 2));
            manager.updateAppWidget(widgetId, views);
        }
    }

    private static PendingIntent addIntent(Context context, String kind, int requestCode) {
        Intent intent = new Intent(
                Intent.ACTION_VIEW,
                Uri.parse("expensetracker://add?kind=" + kind),
                context,
                MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
```

- [ ] **Step 2: Layout, drawables and provider info**

`res/layout/widget_quick_add.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_background"
    android:gravity="center"
    android:orientation="horizontal"
    android:padding="8dp">

    <TextView
        android:id="@+id/widget_add_expense"
        android:layout_width="0dp"
        android:layout_height="match_parent"
        android:layout_marginEnd="4dp"
        android:layout_weight="1"
        android:background="@drawable/widget_button_expense"
        android:gravity="center"
        android:minHeight="40dp"
        android:text="@string/widget_add_expense"
        android:textColor="#FFFFFF"
        android:textSize="15sp"
        android:textStyle="bold" />

    <TextView
        android:id="@+id/widget_add_income"
        android:layout_width="0dp"
        android:layout_height="match_parent"
        android:layout_marginStart="4dp"
        android:layout_weight="1"
        android:background="@drawable/widget_button_income"
        android:gravity="center"
        android:minHeight="40dp"
        android:text="@string/widget_add_income"
        android:textColor="#0A0D14"
        android:textSize="15sp"
        android:textStyle="bold" />
</LinearLayout>
```

`res/drawable/widget_background.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#E60E121B" />
    <corners android:radius="24dp" />
</shape>
```

`res/drawable/widget_button_expense.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#F25A0E" />
    <corners android:radius="16dp" />
</shape>
```

`res/drawable/widget_button_income.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#1BAF7A" />
    <corners android:radius="16dp" />
</shape>
```

`res/xml/quick_add_widget_info.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/widget_description"
    android:initialLayout="@layout/widget_quick_add"
    android:minWidth="180dp"
    android:minHeight="50dp"
    android:minResizeWidth="110dp"
    android:minResizeHeight="40dp"
    android:previewLayout="@layout/widget_quick_add"
    android:resizeMode="horizontal|vertical"
    android:targetCellWidth="3"
    android:targetCellHeight="1"
    android:updatePeriodMillis="0"
    android:widgetCategory="home_screen" />
```

Add to `res/values/strings.xml`:
```xml
    <string name="widget_label">Expense Tracker quick add</string>
    <string name="widget_description">Add an expense or income in one tap</string>
    <string name="widget_add_expense">− Expense</string>
    <string name="widget_add_income">+ Income</string>
```

- [ ] **Step 3: Register the receiver**

In `AndroidManifest.xml`, inside `<application>` after the `<activity>`:
```xml
        <receiver
            android:name=".QuickAddWidget"
            android:exported="false"
            android:label="@string/widget_label">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/quick_add_widget_info" />
        </receiver>
```

- [ ] **Step 4: Build, install, check**

Run the PowerShell build from Task 14 Step 7, then back up (nothing to lose yet, but keep the habit from the first real entry on):
```bash
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"
D="/c/Users/Mardon/expense-tracker-phone-backups/$(date +%F)-before-deploy"; mkdir -p "$D"
"$ADB" exec-out run-as com.mardon.expensetracker tar -cf - app_webview databases files shared_prefs no_backup > "$D/app-data.tar"
```
then `installDebug` (an in-place update; never uninstall).
Check: `adb shell dumpsys appwidget | grep -i expensetracker` lists `QuickAddWidget` as an available provider. Ask the owner to add "Expense Tracker quick add" from the home-screen widget picker and tap both buttons: each should open the Add sheet with the matching type.

- [ ] **Step 5: Commit and push**

```bash
git add android
git commit -m "Add home-screen quick-add widget"
git push origin main
```

---

### Task 16: Docs and final verification

**Files:**
- Replace: `README.md`, `AGENTS.md`

- [ ] **Step 1: Write `README.md`** (owner-facing: what it is, features, how to use each screen, backup, widget, lock, and a link to AGENTS.md for agents)

- [ ] **Step 2: Rewrite `AGENTS.md`** with the gym-tracker structure, filled with this app's facts: §0 status, §1 what this is, §2 data-safety rules (appId, androidScheme, DB versioning, never uninstall, backup command with `com.mardon.expensetracker`), §3 commands (dev on 5174, build, `npm test`, `scripts/ui-shot.mjs`, Android build/install in PowerShell), §4 architecture map (the File Structure above), §5 data model and invariants, §6 behaviour worth knowing (periods, presets + undo, budget toasts, lock relock timing, deep links/widget, backup/CSV), §7 verifying changes, §8 conventions (import extensions, `import type`, no enums, `useConfirm`/`useToast`, chart colours), §9 git (commits straight to `main` for now, push to `origin`).

- [ ] **Step 3: Final checks**

Run: `npm test` → all suites PASS.
Run: `npm run build` → exits 0.
Run: `git status` → only `prompt.txt` untracked (the owner's own file).

- [ ] **Step 4: Commit and push**

```bash
git add README.md AGENTS.md
git commit -m "Document the app for the owner and for AI agents"
git push origin main
```
