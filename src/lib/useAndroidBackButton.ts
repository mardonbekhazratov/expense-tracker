import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { decideBackAction, HOME_PATH } from './navigation.ts';
import { closeTopOverlay } from './overlayStack.ts';
import { useStore } from '../store/useStore.ts';

// Wires Android's back button/gesture into the router. Capacitor has no
// default handling, so without this every press closes the app.
export function useAndroidBackButton(): void {
  const navigate = useNavigate();
  const location = useLocation();

  // Register the native listener once and read the latest path from a ref, so
  // navigation never leaves two listeners attached.
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;

    const listener = App.addListener('backButton', () => {
      // While locked, back sends the app to the background instead of reaching hidden screens.
      if (useStore.getState().locked) {
        void App.minimizeApp();
        return;
      }
      if (closeTopOverlay()) return;
      switch (decideBackAction(pathRef.current)) {
        case 'exit':
          void App.exitApp();
          break;
        case 'home':
          navigate(HOME_PATH);
          break;
        case 'back':
          navigate(-1);
          break;
      }
    });

    return () => {
      void listener.then((l) => l.remove());
    };
  }, [navigate]);
}
