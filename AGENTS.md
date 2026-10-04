# AGENTS.md — guide for AI coding agents

Read this first. It is the source of truth for the state of this repo and how
to work in it. Human-facing docs live in `README.md`.

**Keep this file current.** Whenever a decision is made, or behavior, data
shape, commands, or file layout change, update the relevant section here in
the same change. Mark anything not yet approved by the owner as *proposed*.

---

## 0. Status (as of 2026-10-04)

**Building.** The owner approved the spec and said to go straight to
implementation (2026-10-04). Work follows the task list in the plan; tick
its checkboxes as tasks land.

- Spec: `docs/superpowers/specs/2026-10-04-expense-tracker-design.md`
- Plan: `docs/superpowers/plans/2026-10-04-expense-tracker.md` (16 tasks,
  full code per step)
- `prompt.txt` is the owner's original request; it stays untracked.

## 1. What this is

A personal, offline money tracker for the owner's **Samsung Galaxy S24
Ultra** (portrait). Single user. It tracks everyday **expenses** (food, metro,
phone bill…) and **income** (salary, competition prizes…), and answers
"where does my money go each month" and "how much do I have left".

**The spec is the full design:**
`docs/superpowers/specs/2026-10-04-expense-tracker-design.md`. Key points:

- Stack: same as `../gym-tracker`: React + TS + Vite + Tailwind, Capacitor
  Android, Dexie/IndexedDB. Android only (no PWA/service worker).
- UZS only, integer whole som. One combined balance (no cash/card accounts).
- All-time balance = starting balance + income − expenses; plus figures for
  the current "month", which starts on an owner-chosen day (e.g. payday).
- One-tap presets (e.g. Metro), editable categories (addable from the Add
  sheet), overall monthly budget with 80 %/100 % warnings, four stats charts,
  fingerprint lock, JSON backup + CSV export, two-button home-screen widget.
- English UI, gym-tracker's visual style, name "Expense Tracker", appId
  `com.mardon.expensetracker`.

## 2. Owner context and working style

- **Ask all clarifying questions in one message** (numbered, with options and
  a recommended default), not one per turn. The owner explicitly asked for
  this.
- The owner already runs `../gym-tracker` on the same phone (adb serial
  `RFCXA193X7L`). Its `AGENTS.md` documents solved Windows/Android build
  gotchas (`npx cap run android` broken on Windows, JAVA_HOME/ANDROID_HOME
  setup, backing up phone data before deploys). Read it before any Android
  build work, and copy its reusable pieces (Sheet, ConfirmDialog, back-button
  stack, DownloadsPlugin) rather than reinventing them.
- Dev machine: Windows 11, Android Studio at
  `C:\Program Files\Android\Android Studio`, SDK at
  `%LOCALAPPDATA%\Android\Sdk`, Node 25, Python 3.11. `java`/`adb` are not on
  PATH by default.

## 3. Repo and git

- GitHub remote: `origin` = `github.com/mardonbekhazratov/expense-tracker`.
- The owner allows committing straight to `main` and pushing while the
  project is new (2026-10-04). Once it grows, switch to `feat/...` branches
  and PRs. One logical change per commit, imperative subject line.

## 4. Data safety (applies from the first install on the phone)

Once installed, the phone's data is the real record. Never uninstall, clear
app data, or change the appId / `androidScheme` to make an install work. See
spec §12.
