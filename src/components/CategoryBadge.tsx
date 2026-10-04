import type { Category } from '../db/types';
import { BADGE_CLASSES } from '../lib/categoryStyle';
import { Icon } from './Icon';

export function CategoryBadge({ category, size = 36 }: { category: Pick<Category, 'icon' | 'color'>; size?: number }) {
  return (
    <span
      className={`inline-grid place-items-center shrink-0 rounded-xl ${BADGE_CLASSES[category.color]}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Icon name={category.icon} size={Math.round(size * 0.55)} />
    </span>
  );
}
