import type { CapacitorConfig } from '@capacitor/cli';

// appId and androidScheme decide where IndexedDB lives on the phone.
// Changing either one after the first install orphans all data.
const config: CapacitorConfig = {
  appId: 'com.mardon.expensetracker',
  appName: 'Expense Tracker',
  webDir: 'dist',
  android: {
    backgroundColor: '#0a0d14',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
