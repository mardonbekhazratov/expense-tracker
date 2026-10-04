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
