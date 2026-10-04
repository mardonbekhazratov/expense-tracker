import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { parseDeepLink } from '../lib/deepLink.ts';
import { useStore } from '../store/useStore.ts';

/**
 * Opens the Add sheet when the app is launched (cold start) or brought back
 * (warm start) by the widget's expensetracker://add links. If the lock is on,
 * the lock screen covers the sheet until the owner unlocks.
 */
export function useDeepLinks(): void {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    function handle(url: string | undefined) {
      const action = url ? parseDeepLink(url) : null;
      if (!action) return;
      navigate('/');
      useStore.getState().openAdd(action.kind);
    }
    void App.getLaunchUrl().then((r) => handle(r?.url));
    const sub = App.addListener('appUrlOpen', (e) => handle(e.url));
    return () => {
      void sub.then((s) => s.remove());
    };
  }, [navigate]);
}
