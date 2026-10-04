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
