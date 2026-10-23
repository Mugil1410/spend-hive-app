import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from '@/navigation/RootNavigator';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { darkColors } from '@/theme/colors';
import { AppSplashScreen } from '@/components/AppSplashScreen';
import { useStore } from '@/store/useStore';
import { useNotifications } from '@/notifications/useNotifications';
import { useAppLock } from '@/security/appLockStore';
import { useAppLockLifecycle } from '@/security/useAppLockLifecycle';
import { LockScreen } from '@/security/LockScreen';
import { useRequiredUpdate, useUpdateCheck } from '@/update/updateCheck';
import { UpdateRequiredScreen } from '@/update/UpdateRequiredScreen';

function AppContent() {
  const { colors, scheme } = useTheme();
  const locked = useAppLock((s) => s.locked);
  const requiredUpdate = useRequiredUpdate((s) => s.required);
  useNotifications();
  useAppLockLifecycle();
  useUpdateCheck();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <StatusBar barStyle={scheme === 'light' ? 'dark-content' : 'light-content'} />
        <RootNavigator />
        {/* An overlay rather than a route, so locking keeps the navigation state underneath. */}
        {locked && <LockScreen />}
        {requiredUpdate && <UpdateRequiredScreen update={requiredUpdate} />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function useHydrated() {
  const check = () => useStore.persist.hasHydrated() && useAppLock.getState().hydrated;
  const [hydrated, setHydrated] = useState(check);

  useEffect(() => {
    if (hydrated) return;
    const update = () => check() && setHydrated(true);
    const unsubStore = useStore.persist.onFinishHydration(update);
    const unsubLock = useAppLock.subscribe(update);
    update();
    return () => {
      unsubStore();
      unsubLock();
    };
  }, [hydrated]);

  return hydrated;
}

export default function App() {
  // Wait for the lock state too, so a locked app never flashes its content.
  const hydrated = useHydrated();
  const [splashDone, setSplashDone] = useState(false);
  const handleSplashFinish = useCallback(() => setSplashDone(true), []);

  // The native splash (MainActivity) hides on the first frame; the animated splash then covers
  // store hydration and fades out over the app.
  return (
    <View style={{ flex: 1, backgroundColor: darkColors.background }}>
      {hydrated && (
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      )}
      {!splashDone && <AppSplashScreen ready={hydrated} onFinish={handleSplashFinish} />}
    </View>
  );
}
