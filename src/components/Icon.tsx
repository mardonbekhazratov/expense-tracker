import type { SVGProps } from 'react';
import type { CategoryIcon } from '../db/types';

/**
 * Hand-drawn, character-rich icon set.
 * Stroke-based with rounded joins, slightly imperfect proportions,
 * designed to look like a serious training-journal mark, not generic UI.
 */

type Variant =
  | 'dumbbell'
  | 'kettlebell'
  | 'flame'
  | 'history'
  | 'chart'
  | 'gear'
  | 'plus'
  | 'minus'
  | 'swap'
  | 'check'
  | 'close'
  | 'chevron-down'
  | 'chevron-right'
  | 'chevron-left'
  | 'trash'
  | 'edit'
  | 'caution'
  | 'protein'
  | 'calendar'
  | 'clock'
  | 'bell'
  | 'target'
  | 'weight'
  | 'arrow-left'
  | 'arrow-right'
  | 'download'
  | 'upload'
  | 'reset'
  | 'sparkle'
  | 'today'
  | 'home'
  | 'search'
  | 'lock'
  | 'backspace'
  | 'tag'
  | 'archive'
  | 'file'
  | 'chevron-up'
  | CategoryIcon;

export type IconName = Variant;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: Variant;
  size?: number | string;
  strokeWidth?: number;
}

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.7,
  className,
  ...rest
}: IconProps) {
  const sw = strokeWidth;
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: sw,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    ...rest,
  };

  switch (name) {
    case 'dumbbell':
      // Slightly off-axis dumbbell — confident, asymmetric weight plates
      return (
        <svg {...common}>
          <path d="M3.4 9.6v4.8" />
          <path d="M5.6 7.5v9" />
          <path d="M18.4 7.5v9" />
          <path d="M20.6 9.6v4.8" />
          <path d="M7.6 12h8.8" />
          <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'kettlebell':
      return (
        <svg {...common}>
          <path d="M9 5.2c-1 .4-1.6 1.3-1.6 2.3 0 .7.3 1.3.7 1.7C5.7 10.4 4 12.9 4 15.7 4 18.6 6.7 21 12 21s8-2.4 8-5.3c0-2.8-1.7-5.3-4.1-6.5.4-.4.7-1 .7-1.7 0-1-.6-1.9-1.6-2.3" />
          <path d="M10 6.4c0-.9.9-1.6 2-1.6s2 .7 2 1.6" />
        </svg>
      );

    case 'flame':
      // Editorial flame — slightly leaning, hand-drawn
      return (
        <svg {...common}>
          <path d="M12 3c.7 2.4-1 3.5-1 5.4 0 1.3 1 1.9 1.8 1.9 1.4 0 2-1.5 1.5-3 1.7 1.2 3.2 3 3.2 5.5 0 3.7-3 6.2-6.5 6.2S4.5 16.5 4.5 12.8c0-2.6 1.8-4.6 3.6-5.6-.4 1 .1 2 1.1 2 .8 0 1.4-.7 1.2-1.8C10.1 5.6 11 4.4 12 3z" />
        </svg>
      );

    case 'history':
      // Layered horizontal lines — like a stack of past sessions
      return (
        <svg {...common}>
          <path d="M4 6.5h14" />
          <path d="M4 12h12" />
          <path d="M4 17.5h9" />
          <circle cx="20" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="18" cy="12" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="17.5" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'chart':
      // Mountain trajectory — slightly hand-drawn
      return (
        <svg {...common}>
          <path d="M3.5 20h17" />
          <path d="M4 16.5l4.5-6 4 4 3.5-7.5 3.5 5.5" />
          <circle cx="8.5" cy="10.5" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="12.5" cy="14.5" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="16" cy="7" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'gear':
      // Asymmetric tabs — friendlier than a clean gear
      return (
        <svg {...common}>
          <path d="M12 4l.6 1.8 1.8-.5.5 1.8 1.7.7-.4 1.8 1.4 1.3-1 1.4.8 1.7-1.6.7v1.9l-1.8.3-.6 1.8-1.7-.6-1.5 1-1.4-1.2-1.8.2-.7-1.7L4 14.9l.5-1.7L3 12l1.3-1.4-.3-1.8L5.6 8l-.2-1.8 1.8-.4.9-1.6 1.8.5L11.4 3" />
          <circle cx="12" cy="12" r="2.6" />
        </svg>
      );

    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5.5v13" />
          <path d="M5.5 12h13" />
        </svg>
      );

    case 'minus':
      return (
        <svg {...common}>
          <path d="M5.5 12h13" />
        </svg>
      );

    case 'swap':
      // Two confident curving arrows
      return (
        <svg {...common}>
          <path d="M5 9c1.5-3 5-4 8-2.5L17 9" />
          <path d="M14 5l3.5 4-4 3" />
          <path d="M19 15c-1.5 3-5 4-8 2.5L7 15" />
          <path d="M10 19l-3.5-4 4-3" />
        </svg>
      );

    case 'check':
      return (
        <svg {...common}>
          <path d="M4.5 12.5l4.5 4.5L19.5 6" />
        </svg>
      );

    case 'close':
      return (
        <svg {...common}>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </svg>
      );

    case 'chevron-down':
      return (
        <svg {...common}>
          <path d="M6 9.5l6 6 6-6" />
        </svg>
      );

    case 'chevron-right':
      return (
        <svg {...common}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      );

    case 'chevron-left':
      return (
        <svg {...common}>
          <path d="M15 6l-6 6 6 6" />
        </svg>
      );

    case 'trash':
      // Slightly off-kilter bin with character
      return (
        <svg {...common}>
          <path d="M4.5 6.5h15" />
          <path d="M9 6.5V5c0-1 .8-1.8 1.8-1.8h2.4c1 0 1.8.8 1.8 1.8v1.5" />
          <path d="M6.2 6.5l.9 12c.1 1.2 1.1 2.1 2.3 2.1h5.2c1.2 0 2.2-.9 2.3-2.1l.9-12" />
          <path d="M10 10.5v6" />
          <path d="M14 10.5v6" />
        </svg>
      );

    case 'edit':
      return (
        <svg {...common}>
          <path d="M4 20l1-4L15.5 5.5a2 2 0 012.8 0l.2.2a2 2 0 010 2.8L8 19l-4 1z" />
          <path d="M13.5 7.5l3 3" />
        </svg>
      );

    case 'caution':
      // Triangle with bold mark and a slight droop — animated personality
      return (
        <svg {...common}>
          <path d="M11.1 4l-7.4 13c-.5.9.1 2 1.1 2h14.4c1 0 1.6-1.1 1.1-2L13 4c-.4-.8-1.5-.8-1.9 0z" />
          <path d="M12 9.5v5" />
          <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'protein':
      // Stylized egg/seed — clean abstract mark for protein, not a generic emoji
      return (
        <svg {...common}>
          <path d="M12 3.2c-3.5 0-6.2 4-6.2 8.4 0 4.6 2.8 8.2 6.2 8.2s6.2-3.6 6.2-8.2c0-4.4-2.7-8.4-6.2-8.4z" />
          <path d="M9.5 9.5c.6-1.5 1.6-2.4 2.8-2.6" />
        </svg>
      );

    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3.5" y="5.5" width="17" height="15" rx="2.2" />
          <path d="M3.5 10h17" />
          <path d="M8 3.5v3.5" />
          <path d="M16 3.5v3.5" />
          <circle cx="8.5" cy="14" r="0.8" fill="currentColor" stroke="none" />
          <circle cx="12" cy="14" r="0.8" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="14" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'today':
      // Calendar with a dot/star — for "today" badge
      return (
        <svg {...common}>
          <rect x="3.5" y="5.5" width="17" height="15" rx="2.2" />
          <path d="M3.5 10h17" />
          <path d="M8 3.5v3.5" />
          <path d="M16 3.5v3.5" />
          <circle cx="12" cy="15" r="2.2" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.2" />
          <path d="M12 7.5V12l3 2.2" />
        </svg>
      );

    case 'bell':
      return (
        <svg {...common}>
          <path d="M6.4 16.6V11a5.6 5.6 0 0 1 11.2 0v5.6l1.6 1.6H4.8z" />
          <path d="M10.1 20.4a2.1 2.1 0 0 0 3.8 0" />
        </svg>
      );

    case 'target':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.2" />
          <circle cx="12" cy="12" r="4.8" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'weight':
      // Scale-like — flat plate with notch
      return (
        <svg {...common}>
          <path d="M4 19h16" />
          <path d="M5.5 19l1.5-9.5h10L18.5 19" />
          <path d="M10 9.5l.3-2c.1-.5.6-.9 1.1-.9h1.2c.5 0 1 .4 1.1.9l.3 2" />
        </svg>
      );

    case 'arrow-left':
      return (
        <svg {...common}>
          <path d="M19 12H5" />
          <path d="M11 6l-6 6 6 6" />
        </svg>
      );

    case 'arrow-right':
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="M13 6l6 6-6 6" />
        </svg>
      );

    case 'download':
      return (
        <svg {...common}>
          <path d="M12 3v12" />
          <path d="M7 10l5 5 5-5" />
          <path d="M4.5 19.5h15" />
        </svg>
      );

    case 'upload':
      return (
        <svg {...common}>
          <path d="M12 15V3" />
          <path d="M7 8l5-5 5 5" />
          <path d="M4.5 19.5h15" />
        </svg>
      );

    case 'reset':
      return (
        <svg {...common}>
          <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
          <path d="M3.5 4v4h4" />
        </svg>
      );

    case 'sparkle':
      return (
        <svg {...common}>
          <path d="M12 3.5l1.6 4.8 4.9 1.5-4.9 1.5L12 16l-1.6-4.7-4.9-1.5 4.9-1.5L12 3.5z" />
          <path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" />
        </svg>
      );

    case 'home':
      return (
        <svg {...common}>
          <path d="M3.5 11 12 4l8.5 7" />
          <path d="M5.5 9.5v10h13v-10" />
          <path d="M10 19.5v-5h4v5" />
        </svg>
      );

    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-4.2-4.2" />
        </svg>
      );

    case 'lock':
      return (
        <svg {...common}>
          <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
          <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
          <path d="M12 14.5v2" />
        </svg>
      );

    case 'backspace':
      return (
        <svg {...common}>
          <path d="M8.5 5.5H19a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H8.5L3 12Z" />
          <path d="m11.5 9.5 5 5m0-5-5 5" />
        </svg>
      );

    case 'tag':
      return (
        <svg {...common}>
          <path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-6.2 6.2a1.5 1.5 0 0 1-2.1 0Z" />
          <circle cx="8" cy="8" r="1.4" />
        </svg>
      );

    case 'archive':
      return (
        <svg {...common}>
          <rect x="3.5" y="4.5" width="17" height="4.5" rx="1" />
          <path d="M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9" />
          <path d="M10 13h4" />
        </svg>
      );

    case 'file':
      return (
        <svg {...common}>
          <path d="M6 3.5h8l4.5 4.5v12.5H6Z" />
          <path d="M14 3.5V8h4.5" />
          <path d="M9 13h6M9 16.5h6" />
        </svg>
      );

    case 'chevron-up':
      return (
        <svg {...common}>
          <path d="m6 15 6-6 6 6" />
        </svg>
      );

    // ---- category icons (see CATEGORY_ICONS in db/types.ts)

    case 'food':
      return (
        <svg {...common}>
          <path d="M7 3v18" />
          <path d="M4.5 3v5a2.5 2.5 0 0 0 5 0V3" />
          <path d="M17 21V3c-2 1.2-3 3.6-3 6.5V13h3" />
        </svg>
      );

    case 'cart':
      return (
        <svg {...common}>
          <path d="M3 4h2.5l2.2 10.5h10.1L20 7.5H6.3" />
          <circle cx="9.5" cy="19" r="1.4" />
          <circle cx="16.5" cy="19" r="1.4" />
        </svg>
      );

    case 'transport':
      return (
        <svg {...common}>
          <rect x="5" y="3.5" width="14" height="14" rx="3" />
          <path d="M5 10.5h14" />
          <path d="M8.5 17.5 7 20.5M15.5 17.5l1.5 3" />
          <circle cx="9" cy="14" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="14" r="1" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'car':
      return (
        <svg {...common}>
          <path d="M5 16.5V12l1.8-4.5A2 2 0 0 1 8.7 6h6.6a2 2 0 0 1 1.9 1.5L19 12v4.5" />
          <path d="M4 12h16v4.5H4Z" />
          <path d="M7 16.5V19M17 16.5V19" />
          <circle cx="7.5" cy="14.2" r=".9" fill="currentColor" stroke="none" />
          <circle cx="16.5" cy="14.2" r=".9" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'phone':
      return (
        <svg {...common}>
          <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
          <path d="M11 18.5h2" />
        </svg>
      );

    case 'bolt':
      return (
        <svg {...common}>
          <path d="M13 2.5 5 13.5h6l-1 8 8-11h-6Z" />
        </svg>
      );

    case 'health':
      return (
        <svg {...common}>
          <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z" />
          <path d="M8 12h2.2l1.3-2.2 1.8 4 1.2-1.8H16" />
        </svg>
      );

    case 'bag':
      return (
        <svg {...common}>
          <path d="M5.5 8h13l-1 12.5h-11Z" />
          <path d="M9 10V7a3 3 0 0 1 6 0v3" />
        </svg>
      );

    case 'shirt':
      return (
        <svg {...common}>
          <path d="M8.5 4 4 6.5l1.5 4 2-1V20h9V9.5l2 1 1.5-4L15.5 4a3.5 3.5 0 0 1-7 0Z" />
        </svg>
      );

    case 'coffee':
      return (
        <svg {...common}>
          <path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5Z" />
          <path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16" />
          <path d="M8.5 3.5v2.5M12 3.5v2.5" />
        </svg>
      );

    case 'film':
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
          <path d="m10 9.5 4.5 2.5-4.5 2.5Z" />
        </svg>
      );

    case 'book':
      return (
        <svg {...common}>
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5Z" />
          <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5Z" />
        </svg>
      );

    case 'users':
      return (
        <svg {...common}>
          <circle cx="9" cy="8.5" r="3" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
          <path d="M15.5 5.8a3 3 0 0 1 0 5.4" />
          <path d="M17 14.2a5.5 5.5 0 0 1 3.5 4.8" />
        </svg>
      );

    case 'plane':
      return (
        <svg {...common}>
          <path d="M21 3 3 10.5l7 2.5 2.5 7Z" />
          <path d="m10 13 4-4" />
        </svg>
      );

    case 'dots':
      return (
        <svg {...common}>
          <circle cx="6" cy="12" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="18" cy="12" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'wallet':
      return (
        <svg {...common}>
          <path d="M4 8V7a2.5 2.5 0 0 1 2.5-2.5H17V8" />
          <rect x="4" y="8" width="16" height="11.5" rx="2.5" />
          <path d="M20 12h-3.5a1.75 1.75 0 0 0 0 3.5H20" />
        </svg>
      );

    case 'briefcase':
      return (
        <svg {...common}>
          <rect x="3.5" y="7" width="17" height="12.5" rx="2.5" />
          <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
          <path d="M3.5 12.5h17" />
        </svg>
      );

    case 'trophy':
      return (
        <svg {...common}>
          <path d="M8 4h8v5a4 4 0 0 1-8 0Z" />
          <path d="M8 6H5.5a2.5 2.5 0 0 0 2.6 4M16 6h2.5a2.5 2.5 0 0 1-2.6 4" />
          <path d="M12 13v4" />
          <path d="M8.5 20.5h7" />
          <path d="M10 17h4l.5 3.5h-5Z" />
        </svg>
      );

    case 'gift':
      return (
        <svg {...common}>
          <rect x="4" y="9" width="16" height="4" rx="1" />
          <path d="M5.5 13v7.5h13V13" />
          <path d="M12 9v11.5" />
          <path d="M12 9c-1.5-3.5-5-4-5-1.5S10 9 12 9Z" />
          <path d="M12 9c1.5-3.5 5-4 5-1.5S14 9 12 9Z" />
        </svg>
      );

    case 'coins':
      return (
        <svg {...common}>
          <ellipse cx="9" cy="7" rx="5" ry="2.5" />
          <path d="M4 7v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7" />
          <path d="M10 15.5c.9 1.2 2.9 2 5 2 2.8 0 5-1.1 5-2.5v-4c0-1.4-2.2-2.5-5-2.5" />
        </svg>
      );

    default:
      return null;
  }
}
