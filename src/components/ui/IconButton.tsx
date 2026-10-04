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
