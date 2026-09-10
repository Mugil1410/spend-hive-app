import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler, Platform, Alert } from 'react-native';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useTheme } from '@/theme/ThemeContext';
import { DrawerParamList, BottomTabParamList } from './types';
import { BottomTabNavigator } from './BottomTabNavigator';

const APP_VERSION = Constants.expoConfig?.version ?? '0.1.0';

const Drawer = createDrawerNavigator<DrawerParamList>();

const MENU_ITEMS: { route: keyof BottomTabParamList; label: string; icon: string }[] = [
  { route: 'Cashbook', label: 'Cashbook', icon: 'handshake-outline' },
  { route: 'Events', label: 'Events', icon: 'party-popper' },
  { route: 'Preferences', label: 'Preference', icon: 'tune-variant' },
  { route: 'Settings', label: 'Settings', icon: 'cog-outline' },
];

function CustomDrawerContent({ navigation, state }: DrawerContentComponentProps) {
  const { colors, typography } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const mainTabsRoute = state.routes.find((r) => r.name === 'MainTabs');
  const nestedState = mainTabsRoute?.state;
  const activeTabRoute =
    nestedState && nestedState.routes && typeof nestedState.index === 'number'
      ? nestedState.routes[nestedState.index]?.name
      : undefined;

  function handleCloseApp() {
    if (Platform.OS === 'android') {
      BackHandler.exitApp();
    } else {
      Alert.alert('Close App', 'On iOS, swipe up (or double-press Home) to close the app — apps cannot quit themselves.');
    }
  }

  return (
    <SafeAreaView style={styles.drawer}>
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <MaterialCommunityIcons name="wallet" size={26} color={colors.gold} />
        </View>
        <Text style={[typography.h1, { marginTop: 10 }]}>SpendHive</Text>
        <Text style={typography.caption}>100% Offline Finance Tracker</Text>
      </View>
      <View style={styles.menu}>
        {MENU_ITEMS.map((item) => {
          const active = item.route === activeTabRoute;
          return (
            <TouchableOpacity
              key={item.route}
              style={[styles.menuItem, active && styles.menuItemActive]}
              onPress={() => {
                navigation.navigate('MainTabs', { screen: item.route });
                navigation.closeDrawer();
              }}
            >
              <MaterialCommunityIcons
                name={item.icon as any}
                size={22}
                color={active ? colors.gold : colors.textSecondary}
              />
              <Text style={[typography.body, active && { color: colors.gold, fontWeight: '700' }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.menuItem} onPress={handleCloseApp}>
          <MaterialCommunityIcons name="exit-to-app" size={22} color={colors.expense} />
          <Text style={[typography.body, { color: colors.expense }]}>Close App</Text>
        </TouchableOpacity>
        <Text style={[typography.caption, styles.versionText]}>Version {APP_VERSION}</Text>
      </View>
    </SafeAreaView>
  );
}

export function DrawerNavigator() {
  const { colors } = useTheme();
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: colors.background, width: 280 },
        overlayColor: colors.modalBackdrop,
      }}
    >
      <Drawer.Screen name="MainTabs" component={BottomTabNavigator} />
    </Drawer.Navigator>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    drawer: { flex: 1, backgroundColor: colors.background },
    header: { alignItems: 'center', paddingVertical: 28, borderBottomWidth: 1, borderBottomColor: colors.separator },
    logoCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    menu: { flex: 1, paddingTop: 12 },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 14,
      paddingHorizontal: 20,
    },
    menuItemActive: { backgroundColor: colors.surface },
    footer: {
      borderTopWidth: 1,
      borderTopColor: colors.separator,
      paddingBottom: 8,
    },
    versionText: {
      textAlign: 'center',
      paddingVertical: 10,
    },
  });
}
