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
