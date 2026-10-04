// Top-level tab destinations (mirrors the items in components/BottomNav.tsx).
export const HOME_PATH = '/';
export const TAB_ROOTS = ['/', '/history', '/stats', '/settings'] as const;

export function isTabRoot(pathname: string): boolean {
  return (TAB_ROOTS as readonly string[]).includes(pathname);
}

// What the Android back button does for a route, once any open overlay
// (sheet/dialog) has been closed separately:
// - 'exit'  Home is the app's home; back leaves the app
// - 'home'  any other top-level tab returns to Home
// - 'back'  a deeper route (e.g. Settings → Categories) goes back one step
export type BackAction = 'exit' | 'home' | 'back';

export function decideBackAction(pathname: string): BackAction {
  if (pathname === HOME_PATH) return 'exit';
  if (isTabRoot(pathname)) return 'home';
  return 'back';
}
