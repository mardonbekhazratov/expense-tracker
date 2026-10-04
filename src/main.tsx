import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { BootError } from './screens/BootError';
import { db } from './db/db';
import { seedIfEmpty } from './db/seed';
import { getSettings } from './db/queries';
import { primeSettings } from './hooks/useData';
import { useStore } from './store/useStore';
import './index.css';

async function boot() {
  const root = ReactDOM.createRoot(document.getElementById('root')!);
  try {
    await db.open();
    await seedIfEmpty();
    const settings = await getSettings();
    primeSettings(settings);
    // Decide the lock before the first frame so balances never flash on screen.
    useStore.getState().setLocked(settings.lockEnabled);
  } catch (err) {
    console.error('DB init failed', err);
    root.render(<BootError error={err} />);
    return;
  }
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  );
}

void boot();
