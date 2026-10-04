# Expense Tracker

A personal, **offline** money tracker for Android, built for a Samsung Galaxy S24 Ultra. It logs everyday spending (food, metro, phone bill…) and income (salary, competition prizes…) in Uzbek som, and answers two questions: *where does my money go each month* and *how much do I have left*.

- No accounts, no server, no internet needed. All data stays on the phone.
- One React codebase wrapped as a native Android app with Capacitor.

> Working on the code with an AI agent? See [`AGENTS.md`](./AGENTS.md).

---

## Features

- **Fast entry**: a big number pad with a `000` key, a category grid, Today/Yesterday chips and an optional note. Logging takes a few seconds.
- **Quick-add presets**: one tap logs a fixed amount for today (e.g. *Metro*), with **Undo** for 5 seconds.
- **Balance**: your starting balance + all income − all expenses, plus this month's income, spending and net.
- **Your own month**: a month can start on any day, e.g. your payday (10th → 10 Oct – 9 Nov).
- **Monthly budget**: a progress bar on Home, and a warning when you reach 80% and when you go over.
- **History**: entries grouped by day, filter by type and category, search notes.
- **Stats**: spending by category, spending per day with the daily average, income vs spending for 12 months, and any category over 12 months.
- **Categories**: add, rename, recolour, reorder, hide. Categories that have entries can only be hidden, so old entries keep their names.
- **Fingerprint lock** (optional), with your phone PIN as a fallback. It locks again after a minute away.
- **Home-screen widget** with "− Expense" and "+ Income" buttons that open the Add screen.
- **Backup**: export everything to a JSON file in *Downloads* and import it back; export a CSV for Excel or Google Sheets.

## How to use

### Log an entry
Tap the orange **+** on Home (or a widget button). Type the amount, pick a category, change the date if it wasn't today, add a note if you like, then **Save**. Tap any entry in Home or History to edit or delete it.

### Presets
Settings → **Quick-add presets** → *New preset*: a name (e.g. *Metro*), a category and an amount. Presets appear under **Quick add** on Home. Tap one to log it; hold it to edit.

### First-time setup (Settings)
1. **Starting balance**: the money you have right now (tap **+/−** for a debt).
2. **Month starts on**: pick your payday if your budget follows your salary.
3. **Monthly budget**: leave empty for no budget.
4. **Fingerprint lock**: turn it on if you want the app locked.

### Widget
Long-press the home screen → *Widgets* → **Expense Tracker quick add**. Drag it to the home screen.

### Backup
Settings → **Export backup (JSON)** saves `expense-tracker-YYYY-MM-DD.json` to *Downloads*. Keep a copy somewhere safe (cloud drive, PC). **Import backup** replaces everything in the app with a backup file. A broken or wrong file is rejected and nothing changes. **Export CSV** writes a spreadsheet of all entries.

## Development

```bash
npm install
npm run dev      # http://localhost:5174
npm test         # node --test
npm run build    # type-check + production build
```

Building and installing the Android app is described in [`AGENTS.md`](./AGENTS.md#3-commands).
