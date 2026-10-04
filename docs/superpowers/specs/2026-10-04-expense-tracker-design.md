# Expense Tracker — design spec

Date: 2026-10-04 · Status: **approved by owner 2026-10-04** (plan: `docs/superpowers/plans/2026-10-04-expense-tracker.md`)

## 1. Goal

A personal, offline money tracker for the owner's Samsung Galaxy S24 Ultra.
It answers two questions: *where does my money go each month* and *how much
do I have left*. Logging an expense must take a few seconds, or it won't get
done.

## 2. Decisions from the owner (Q&A, 2026-10-04)

| # | Topic | Decision |
| --- | --- | --- |
| — | Users / network | Single user, fully offline, no backend, no login |
| — | Stack | Same as `../gym-tracker`: React + TypeScript + Vite + Tailwind, Capacitor (Android), Dexie (IndexedDB) |
| — | Currency | Uzbek som (UZS) only, whole som, stored as integers |
| 1 | Cash vs cards | One combined balance, no accounts |
| 2 | Balance | This period's income/spending **and** an all-time balance from a starting amount |
| 3 | Month | A "month" starts on a day the owner picks (e.g. payday) |
| 4 | Presets | Yes: one-tap preset buttons on Home, owner-editable |
| 5 | Categories | Default list is fine; owner can add their own (including from the Add screen) |
| 6 | Old data | None, start fresh |
| 7 | Stats | All four: by category, per day, income vs spending by month, one category over time |
| 8 | v1 extras | Overall monthly budget, fingerprint lock, CSV export, home-screen widget |
| 9 | Language | English |
| 10 | Look | Same visual style as gym-tracker |
| 11 | Identity | Name **Expense Tracker**, appId `com.mardon.expensetracker` |

## 3. Not in v1

Cash/card accounts and transfers, cloud sync, multiple currencies, per-category
budgets, notifications or reminders, recurring entries, bank-SMS parsing,
subcategories, amounts or presets on the widget, PWA/service worker,
future-dated entries.

## 4. Architecture

One React app inside a Capacitor Android shell, like gym-tracker. All data in
IndexedDB in the WebView. No PWA and no service worker: the web build is only
for development in a browser, so gym-tracker's stale-precache problem cannot
happen here.

```
src/
  main.tsx              boot: open DB → seedIfEmpty → render
  App.tsx               routes, bottom nav, back button, lock gate, widget deep links
  db/db.ts              Dexie schema + types
  db/queries.ts         every read/write the screens use
  db/seed.ts            default categories + settings row
  lib/period.ts         custom-month math                       (pure, tested)
  lib/money.ts          format/parse som                       (pure, tested)
  lib/stats.ts          totals, per-category, per-day, per-period aggregates (pure, tested)
  lib/budget.ts         budget status from spent/limit          (pure, tested)
  lib/csv.ts            build CSV text                          (pure, tested)
  lib/backup.ts         JSON export/import; validateBackup() is pure and tested
  lib/lock.ts           biometric wrapper + "relock after background" timing
  lib/downloads.ts, navigation.ts, overlayStack.ts, useAndroidBackButton.ts
                        copied from gym-tracker
  store/useStore.ts     zustand UI state (selected period, filters, open sheet)
  components/           AmountKeypad, CategoryGrid, CategoryEditor, TransactionRow,
                        TransactionSheet (add/edit), PresetBar, BudgetBar,
                        PeriodSwitcher, charts/*, Icon, ui/* (Sheet, ConfirmDialog,
                        TextField, Select, DatePicker copied from gym-tracker;
                        Toast is new)
  screens/              Home, History, Stats, Settings, Categories, Presets, Lock
android/                Capacitor project; Java code in
                        app/src/main/java/com/mardon/expensetracker/:
                        MainActivity, DownloadsPlugin (copied), QuickAddWidget
scripts/                gen-icons.mjs, test-*.mjs
```

Screens read data through Dexie live queries, so totals update as soon as an
entry is saved. Pure logic lives in `lib/` modules with no runtime imports so
the Node test scripts can import them directly (gym-tracker's rule).

Routes: `/` Home, `/history`, `/stats`, `/settings`, `/settings/categories`,
`/settings/presets`. Bottom nav: Home · History · Stats · Settings.

## 5. Data model

Dexie database `expenseTrackerDB`, `version(1)`.

**transactions**: `++id, date, categoryId, [date+createdAt]`
| field | type | notes |
| --- | --- | --- |
| id | number | auto |
| kind | `'expense' \| 'income'` | always equals its category's kind |
| amount | number | integer som, > 0, at most 12 digits |
| categoryId | number | |
| date | string | local date `YYYY-MM-DD`, never in the future |
| note | string | `''` when empty |
| createdAt, updatedAt | number | epoch ms; createdAt orders entries within a day |

**categories**: `++id, kind`
| field | type | notes |
| --- | --- | --- |
| name | string | unique per kind (case-insensitive) |
| kind | `'expense' \| 'income'` | fixed after creation |
| icon | string | name from `Icon.tsx` set |
| color | string | one of ~10 palette tokens |
| sortOrder | number | |
| archived | boolean | hidden from pickers, still shown in history/stats |

**presets**: `++id, categoryId`
| field | type | notes |
| --- | --- | --- |
| name | string | button label, e.g. "Metro" |
| categoryId | number | kind comes from the category |
| amount | number | integer som |
| sortOrder | number | |

**settings**: single row, `id = 1`
| field | default | notes |
| --- | --- | --- |
| openingBalance | 0 | integer som, may be negative |
| monthStartDay | 1 | 1–31 |
| monthlyBudget | null | integer som, `null` = off |
| lockEnabled | false | |
| balancePromptDismissed | false | hides Home's "Set your starting balance" card once tapped or dismissed |

Invariants:
- A category with transactions or presets cannot be deleted, only archived.
- Volume is small (~10 entries/day ≈ 4 000/year), so aggregation is done in
  memory over the period's rows; only `date` and `categoryId` are indexed.
- Schema changes follow gym-tracker's rule: new non-indexed fields need no
  version bump; index changes need `version(2)` with an upgrade, never an edit
  of `version(1)`.

Seeded on first run:
- Expense: Food, Transport, Phone/Internet, Groceries, Health, Shopping, Bills, Other
- Income: Salary, Competitions, Gift, Other

## 6. Core rules

**Period (custom month).** With start day `S`, the period that starts in
calendar month (y, m) begins on day `min(S, daysIn(y, m))` and ends the day
before the next period begins. It is labelled by the month it starts in:
with `S = 10`, "Oct 2026" is 10 Oct – 9 Nov. With `S = 31`, February's
period starts on Feb 28 (or 29). Periods are computed, never stored, so
changing the start day re-buckets all history.

**Balance.** All-time balance = `openingBalance + Σ income − Σ expense` over
every entry. Period figures: income, spent, net = income − spent.

**Budget.** Applies to expenses in the current period. Status: *ok* under
80 %, *warning* from 80 % to 100 %, *over* above 100 %. When saving an
expense moves the status up (ok→warning or →over), show a toast such as
"85 % of this month's budget used". No system notifications.

**Money format.** `45 000 so'm`: space-grouped thousands, no decimals.
Expenses display as `−45 000`, income as `+45 000` in green.

## 7. Screens

**Home**
- Header: period label and dates ("Oct 2026 · 10 Oct – 9 Nov").
- Summary card: all-time balance (large), then this period's income, spent and net.
- Budget bar (if a budget is set): spent / limit, amount remaining, coloured by status.
- Preset bar: one chip per preset. Tap → entry saved instantly with today's
  date, toast "Metro −2 000 so'm · Undo" (5 s). Undo deletes that entry.
  The entry's note is the preset name when it differs from the category
  name (so "Metro" shows under Transport). Long-press → edit preset.
- Recent entries (last 10, grouped by day). Tap → edit.
- "+" button → Add sheet (Expense selected).
- One-time card on a fresh install: "Set your starting balance" → Settings.

**Add / Edit sheet** (bottom sheet)
- Expense / Income toggle.
- Large amount display + in-app keypad: 1–9, `000`, `0`, backspace.
- Category grid of non-archived categories for the chosen kind; last tile
  "+ New" opens the category editor inline and selects the new category.
- Date chip: Today / Yesterday / pick (no future dates).
- Optional note (system keyboard).
- Save is disabled until amount > 0 and a category is chosen. Edit mode adds
  Delete (with confirmation).

**History**
- Period switcher (‹ Oct 2026 ›), type chips (All / Expenses / Income),
  category filter (all or one category), search over note text and
  category name.
- Entries grouped by day, each day with its subtotal. Tap → edit.

**Stats** (shares the period switcher)
1. Spending by category for the period: horizontal bars, amount and %.
   Tapping a category opens chart 4 for it.
2. Spending per day in the period, with the daily average.
3. Income vs spending for the 12 periods ending with the selected one, with net.
4. One category over the same 12 periods (category picker).

Charts use recharts, as in gym-tracker.

**Settings**
- Starting balance, month start day, monthly budget (off or amount).
- Fingerprint lock toggle.
- Manage categories, manage presets.
- Backup: Export JSON, Import JSON, Export CSV.
- App version.

**Categories:** Expense / Income tabs. Add, rename, change icon and colour,
reorder, archive or unarchive, delete only if unused.

**Presets:** add, edit (name, category, amount), reorder, delete.

## 8. Android pieces

**Fingerprint lock.** `@aparajita/capacitor-biometric-auth` v10 (Capacitor 8)
with `allowDeviceCredential: true`. (`@capgo/capacitor-native-biometric` was
rejected: on Android its `verifyIdentity()` ignores the device-credential
fallback.) Off by default. Turning it on requires a successful scan first.
When on, a lock screen hides the app on cold start and after the app has been
in the background for 60 s or more. The device PIN or pattern is the fallback.
If the phone no longer has any biometric or screen lock, the app opens and
turns the lock off with a notice, so the owner can never be locked out of
their own data.

**Home-screen widget.** A native `AppWidgetProvider` (Java) with two buttons,
"− Expense" and "+ Income". Each opens the deep link
`expensetracker://add?kind=expense|income`. The app picks it up through
`@capacitor/app` (`getLaunchUrl` on cold start, `appUrlOpen` when already
running) and opens the Add sheet with that kind, after the lock screen if the
lock is on. The widget shows no amounts: that keeps balances off the home
screen when the lock is on, and the native side can't read the WebView's
IndexedDB anyway.

**Downloads, back button, edge-to-edge.** Copied from gym-tracker:
`DownloadsPlugin` (MediaStore to `Download/`), the overlay stack with back
rules (top overlay closes first; Home exits; other tabs go to Home; deeper
routes go back), and `MainActivity`'s edge-to-edge setup.

## 9. Backup and export

- **JSON export:** `Download/expense-tracker-YYYY-MM-DD.json` containing
  `{ app: "expense-tracker", schemaVersion: 1, exportedAt, settings,
  categories, presets, transactions }`.
- **JSON import:** `validateBackup()` checks app name, schema version and
  field types, then a confirmation ("This replaces all data"), then all
  tables are replaced in one transaction. On any error nothing changes.
- **CSV export:** `Download/expense-tracker-YYYY-MM-DD.csv` with columns
  `Date, Type, Category, Amount, Note`. Amounts are positive integers, and
  Type says Expense or Income. UTF-8 with BOM so Excel shows Uzbek/Russian
  notes correctly. RFC 4180 quoting. All entries.

## 10. Error handling

- DB fails to open: full-screen error with the message; nothing is cleared.
- Import errors: a message, and the database is untouched.
- Export errors: a toast with the reason.
- Biometric cancel or fail: stay on the lock screen with an "Unlock" retry button.
- The keypad caps the amount at 12 digits; the form can't save invalid entries.
- `window.alert/confirm` are never used (they block the WebView and break the
  back-button stack); use `ConfirmDialog` and toasts.

## 11. Testing and verification

- `npm run build` (strict tsc) is the type check.
- `npm test` runs `node --test` over `tests/*.test.mjs` (Node's built-in
  runner, zero test dependencies). Pure modules (`period`, `money`, `stats`,
  `budget`, `csv`, `filter`, `deepLink`, `validateBackup`) are tested
  directly; the data layer (`db/*.ts`) is tested against `fake-indexeddb`. Period math gets
  edge cases: start day 31 in February and leap years, year boundaries,
  changing the start day.
- UI is checked in the browser dev server (disposable data).
- Widget, lock, downloads and back button are checked on the phone. No fake
  entries go into the phone's real database.

## 12. Data safety (applies from the first install)

- Keep appId `com.mardon.expensetracker` and `server.androidScheme: 'https'`.
  IndexedDB lives at that origin, and changing either orphans the data.
- Never uninstall, `pm clear` or clear storage to make an install work. If
  an install fails with `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, stop and ask.
- Back up the phone's app data with `adb exec-out run-as … tar` before every
  deploy (same procedure as gym-tracker).

## 13. Choices made by the agent (owner may veto)

- Fingerprint lock is off until turned on; it relocks after 60 s in the background.
- The widget has only two buttons, with no amounts or presets.
- Presets save instantly with Undo instead of asking for confirmation.
- Budget warning thresholds are 80 % and 100 %.
- No future-dated entries.
- A category's kind (expense or income) can't change after it's created.
- Android only; the browser build is just for development.
