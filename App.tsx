import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from '@/navigation/RootNavigator';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { AppSplashScreen } from '@/components/AppSplashScreen';
import { useStore } from '@/store/useStore';
import { useNotifications } from '@/notifications/useNotifications';

function AppContent() {
  const { colors, scheme } = useTheme();
  useNotifications();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <StatusBar barStyle={scheme === 'light' ? 'dark-content' : 'light-content'} />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  const [hydrated, setHydrated] = useState(useStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return;
    const unsub = useStore.persist.onFinishHydration(() => setHydrated(true));
    if (useStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, [hydrated]);

  // The native splash (MainActivity) hides on the first frame; this covers store hydration.
  if (!hydrated) {
    return <AppSplashScreen />;
  }

  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
