import { useEffect, useRef, type ChangeEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ScreenHeader } from '../components/ScreenHeader';
import { NumberSetting } from '../components/NumberSetting';
import { LockSetting } from '../components/LockSetting';
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
          <LockSetting enabled={settings.lockEnabled} />
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
