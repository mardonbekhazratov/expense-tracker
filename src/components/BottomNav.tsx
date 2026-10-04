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
