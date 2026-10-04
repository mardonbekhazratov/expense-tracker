import { Route, Routes } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { TransactionSheet } from './components/TransactionSheet';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { ToastProvider } from './components/ui/Toast';
import { useAndroidBackButton } from './lib/useAndroidBackButton';
import { HomeScreen } from './screens/HomeScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { StatsScreen } from './screens/StatsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { CategoriesScreen } from './screens/CategoriesScreen';
import { PresetsScreen } from './screens/PresetsScreen';

export default function App() {
  useAndroidBackButton();

  return (
    <ConfirmProvider>
      <ToastProvider>
        <div className="min-h-full flex flex-col">
          {/* Soft status-bar scrim so content fades cleanly under the camera cutout */}
          <div
            className="fixed inset-x-0 top-0 z-20 pointer-events-none h-safe-top
              bg-gradient-to-b from-ink-950 via-ink-950/85 to-transparent"
          />
          <main className="flex-1 pt-safe pb-[calc(env(safe-area-inset-bottom)+84px)] px-safe">
            <Routes>
              <Route path="/" element={<HomeScreen />} />
              <Route path="/history" element={<HistoryScreen />} />
              <Route path="/stats" element={<StatsScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="/settings/categories" element={<CategoriesScreen />} />
              <Route path="/settings/presets" element={<PresetsScreen />} />
            </Routes>
          </main>
          <TransactionSheet />
          <BottomNav />
        </div>
      </ToastProvider>
    </ConfirmProvider>
  );
}
