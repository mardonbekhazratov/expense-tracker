# AGENTS.md — guide for AI coding agents

Read this first. It is the source of truth for how this repo works and how to
change it safely. Owner-facing docs live in `README.md`.

**Keep this file current.** Whenever you change behaviour, data shape,
commands, file layout, or learn a gotcha, update the relevant section here
(and the owner-facing part of `README.md`) in the same change.

---

## 0. Status (as of 2026-10-04)

**v0.1.0 built and installed on the owner's phone.** All 16 tasks of the plan
are done: entry sheet, Home, History, Stats, Settings, categories, presets,
budget, fingerprint lock, JSON/CSV backup, Android app and home-screen widget.

- Design spec: `docs/superpowers/specs/2026-10-04-expense-tracker-design.md`
- Implementation plan (checklist): `docs/superpowers/plans/2026-10-04-expense-tracker.md`
- Not yet checked on the device screen (the phone was locked during the
  build): Home rendering on the device, the fingerprint prompt, and the
  widget buttons. See §7 for how to check them with the owner.

## 1. What this is

A single-user, offline money tracker. One React + TypeScript codebase wrapped
as a native Android app with Capacitor. The owner uses it on a **Samsung
Galaxy S24 Ultra** (adb serial `RFCXA193X7L`, portrait). Expenses and income
in **Uzbek som only**, stored as whole integers. No backend: all data lives in
IndexedDB inside the app's WebView.

Owner preferences:
- **Ask every clarifying question in one message** (numbered, each with
  options and a recommended default), not one per turn.
- English UI; same visual style as the sibling app `../gym-tracker`.
- Commits may go straight to `main` and be pushed while the project is small
  (owner's instruction, 2026-10-04). Switch to `feat/...` branches + PRs when
  it grows.

## 2. The one rule that matters most: never lose the phone's data

Once the owner starts logging, the phone holds the only copy of real money
history.

- **Never** `adb uninstall`, `pm clear`, "Clear storage", or reinstall after an
  uninstall. `installDebug` / `adb install -r` update in place and keep data
  as long as the debug signing key matches (`~/.android/debug.keystore` on the
  owner's PC). If an install fails with `INSTALL_FAILED_UPDATE_INCOMPATIBLE`,
  stop and ask; do not uninstall.
- Keep `appId` `com.mardon.expensetracker` and `server.androidScheme: 'https'`
  in `capacitor.config.ts`. IndexedDB lives at the WebView origin
  `https://localhost`; changing either orphans the data.
- Dexie DB `expenseTrackerDB`, schema `version(1)` in `src/db/db.ts`. Adding
  **non-indexed** fields needs no schema change. Adding or changing an
  **index** needs `db.version(2).stores(...).upgrade(...)`; never edit
  version 1. Never call `db.delete()` or clear tables outside the
  Import flow (`restoreBackup`).
- `seedIfEmpty()` runs on every boot; it only acts when the settings row is
  missing (true first launch), so deleted default categories never return.
- **Back up before every deploy** (works because the debug build is debuggable):
  ```bash
  ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"
  D="/c/Users/Mardon/expense-tracker-phone-backups/$(date +%F)-before-deploy"; mkdir -p "$D"
  "$ADB" exec-out run-as com.mardon.expensetracker tar -cf - app_webview databases files shared_prefs no_backup > "$D/app-data.tar"
  ```
  Use Git Bash for `exec-out` (PowerShell redirection corrupts binary output).
- Never put test entries into the phone's real database. Use the browser dev
  server (disposable data) or `scripts/ui-shot.mjs` (fresh profile each run).

## 3. Commands

```bash
npm install
npm run dev                  # Vite dev server, http://localhost:5174 (gym-tracker uses 5173)
npm test                     # node --test over tests/*.test.mjs (Node 25 type stripping)
npm run build                # tsc -b (strict) && vite build → dist/
node scripts/ui-shot.mjs <out-dir> [steps.json]   # screenshots of the dev server, 412×915
node scripts/gen-icons.mjs   # regenerate launcher icons (wallet) + public/icon-192.png
```

`ui-shot.mjs` drives headless Edge over the DevTools protocol at the phone's
viewport. A steps file is a JSON list of `{ path?, js?, wait?, shot? }`; `js`
runs in the page with helpers `tap(text)`, `type(selector, text)`,
`sleep(ms)`, and can seed data with `await import('/src/db/queries.ts')`.
The first run after adding a dependency may fail once while Vite re-optimizes
and reloads; just rerun.

### Android build & install (Windows, PowerShell)

`npx cap run android` is broken on Windows (spawns `gradlew`, not
`gradlew.bat`). Use:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
npm run build; npx cap sync android
& "$PWD\android\gradlew.bat" -p android installDebug     # builds + installs (in place)
adb shell monkey -p com.mardon.expensetracker -c android.intent.category.LAUNCHER 1
adb shell am start -a android.intent.action.VIEW -d "expensetracker://add?kind=income" com.mardon.expensetracker
```

If `adb devices` shows `unauthorized`, ask the owner to accept the USB
debugging prompt. If the phone is locked, on-screen checks need the owner.

## 4. Architecture map

```
src/
  main.tsx              boot: db.open → seedIfEmpty → primeSettings + initial lock → render
                        (DB failure renders screens/BootError instead)
  App.tsx               providers (Confirm, Toast), LockGate, routes, global TransactionSheet,
                        BottomNav, back button, deep links
  db/types.ts           Transaction, Category, Preset, Settings, CATEGORY_ICONS/COLORS (no runtime imports)
  db/db.ts              Dexie instance + schema
  db/seed.ts            DEFAULT_SETTINGS, DEFAULT_CATEGORIES, seedIfEmpty()
  db/queries.ts         every read/write the UI uses, with all data-rule validation
  db/backupData.ts      createBackup(), restoreBackup(text), createCsv()
  lib/                  pure logic (tested): money, dates, period, stats, budget, csv,
                        backupFormat, filter, deepLink, lockTiming, navigation;
                        platform helpers: biometric, files, downloads, overlayStack,
                        useAndroidBackButton, categoryStyle, version
  store/useStore.ts     zustand UI state: Add/Edit sheet, selected period, history filter, locked
  hooks/                useToday, useData (useSettings, useCategoryMap, useCurrentPeriod,
                        useSelectedPeriod), useLongPress, useDeepLinks
  components/           TransactionSheet (+ KindToggle, AmountKeypad, CategoryGrid,
                        CategoryEditor), Home pieces (BalanceCard, BudgetBar, PresetBar,
                        PresetEditor), TransactionRow, DayGroupList, PeriodSwitcher,
                        NumberSetting, LockGate/LockScreen/LockSetting, Icon, BottomNav,
                        ScreenHeader, CategoryBadge, charts/*
  components/ui/        Sheet (portalled), ConfirmDialog, TextField, Select (copied from
                        gym-tracker), CalendarSheet, Toast, IconButton
  screens/              Home, History, Stats, Settings, Categories, Presets, BootError
tests/                  node --test suites; db.test.mjs runs the data layer on fake-indexeddb
scripts/                ui-shot.mjs, gen-icons.mjs
android/                Capacitor project; custom Java in app/src/main/java/com/mardon/expensetracker/:
                        MainActivity (edge-to-edge, registers DownloadsPlugin), DownloadsPlugin
                        (MediaStore → Download/), QuickAddWidget (home-screen widget)
```

Routes: `/` Home, `/history`, `/stats`, `/settings`, `/settings/categories`,
`/settings/presets`.

## 5. Data model & invariants

- Tables: `transactions` (`++id, date, categoryId, [date+createdAt]`),
  `categories` (`++id, kind`), `presets` (`++id, categoryId`), `settings`
  (single row, `id: 1`).
- **Amounts are whole som integers**, `> 0`, at most 12 digits.
- `transaction.kind` always equals its category's kind; a category's kind
  never changes after creation.
- **Dates** are local `YYYY-MM-DD` strings; entries can't be in the future.
  `createdAt` orders entries within a day.
- Category names are unique per kind, case-insensitive, whitespace-collapsed.
  A category with entries or presets can't be deleted, only `archived`
  (hidden from pickers, still labels old entries everywhere).
- Settings: `openingBalance` (may be negative), `monthStartDay` (1–31),
  `monthlyBudget` (`null` = off), `lockEnabled`, `balancePromptDismissed`.
- All writes go through `db/queries.ts`, which enforces the rules above.

## 6. Behaviour worth knowing

- **Periods** (`lib/period.ts`): a "month" starts on `monthStartDay`, clamped
  to the month's last day, and is labelled by the month it starts in
  (start 10 → "Oct 2026" = 10 Oct – 9 Nov). Computed, never stored, so
  changing the start day re-buckets all history.
- **Balance** = `openingBalance` + all income − all expenses.
- **Budget**: ok < 80% ≤ warning ≤ 100% < over. `withBudgetCheck(action)`
  compares the current period's spending before and after any write and the
  UI shows a toast when the level rises.
- **Presets**: tap → `logPreset` (today's date; note = preset name unless it
  equals the category name) and a 5 s Undo toast that deletes the entry.
  Long-press opens the preset editor.
- **Lock**: `@aparajita/capacitor-biometric-auth` with
  `allowDeviceCredential: true` (phone PIN fallback). The initial lock is set
  in `main.tsx` before the first render. `LockGate` relocks after ≥ 60 s in
  the background (`lib/lockTiming.ts`). If the phone has no biometrics or
  screen lock any more, the lock turns itself off so the owner can't be
  locked out. While locked, Android back minimizes the app.
- **Deep links / widget**: `expensetracker://add?kind=expense|income` opens
  the Add sheet (`hooks/useDeepLinks.ts`: `getLaunchUrl` on cold start,
  `appUrlOpen` when running). `QuickAddWidget` sends these links; it shows no
  amounts on purpose.
- **Backup**: JSON `{ app: "expense-tracker", schemaVersion: 1, exportedAt,
  settings, categories, presets, transactions }`. `validateBackup` checks
  everything before `restoreBackup` replaces all tables in one transaction.
  CSV: `Date,Type,Category,Amount,Note`, UTF-8 with BOM, RFC 4180 quoting.
- **Android back button**: closes the top sheet/dialog first, then Home →
  exit, other tabs → Home, deeper routes → back (`lib/navigation.ts`).
- **No PWA / service worker** (unlike gym-tracker). The browser build is only
  for development.

## 7. Verifying changes

- `npm test` and `npm run build` must pass.
- UI: `npm run dev` + `scripts/ui-shot.mjs`, then look at the PNGs. Check the
  412×915 layout: the Add sheet must show Save without scrolling.
- On the phone (owner present, phone unlocked): screenshot with
  `adb exec-out screencap -p > shot.png` (Git Bash). Read-only inspection of
  the WebView works through the DevTools socket while the app is in the
  foreground:
  ```bash
  PID=$("$ADB" shell pidof com.mardon.expensetracker)
  "$ADB" forward tcp:9333 localabstract:webview_devtools_remote_$PID
  # GET http://127.0.0.1:9333/json, then Runtime.evaluate over webSocketDebuggerUrl
  ```
- Still to check with the owner: Home on the device, Settings → Fingerprint
  lock (prompt + PIN fallback), and the widget's two buttons.

## 8. Conventions

- TypeScript strict, `verbatimModuleSyntax` (use `import type`),
  `erasableSyntaxOnly` (no enums/namespaces/parameter properties).
- **Relative imports in `.ts` files include the `.ts` extension**, because
  Node runs the tests on them directly. `.tsx` files import without
  extensions. Pure logic belongs in `src/lib/*.ts` with no React/Capacitor
  imports, plus a `tests/*.test.mjs`.
- Use `Sheet` for bottom sheets, `useConfirm()` for confirmations and
  `useToast()` for messages. Never use `window.alert/confirm`.
- Styling: gym-tracker's Tailwind tokens (`ink-*`, `ember-*`) and classes
  (`card`, `btn-primary`, `btn-ghost`, `field`, `field-flat`, `label-eyebrow`,
  `tap`, `num`, `display`). Income amounts are emerald.
- Charts (recharts): spending `#f25a0e`, income `#1baf7a` (validated for
  colour-blind separation on the dark card surface), one y-axis, bars ≤ 24px
  with a 4px rounded top, legend for two series, a tooltip on every chart.
- Icons come from `components/Icon.tsx`; category icons must be listed in
  `CATEGORY_ICONS` (`db/types.ts`) and have a case in `Icon.tsx`.
- Comments explain *why*, at the density of the surrounding code.

## 9. Git workflow

- Remote `origin` = `github.com/mardonbekhazratov/expense-tracker`.
- For now commit straight to `main` and push (owner's instruction). One
  logical change per commit, imperative subject line.
- `.claude/`, `.superpowers/`, `dist/`, `node_modules/`, `android/app/build`
  are not committed. Git on Windows warns about LF→CRLF; harmless.
