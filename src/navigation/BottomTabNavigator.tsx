import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { BottomTabParamList } from './types';
import { RecordsScreen } from '@/screens/Records/RecordsScreen';
import { AnalysisScreen } from '@/screens/Analysis/AnalysisScreen';
import { BudgetsScreen } from '@/screens/Budgets/BudgetsScreen';
import { AccountsScreen } from '@/screens/Accounts/AccountsScreen';
import { CategoriesScreen } from '@/screens/Categories/CategoriesScreen';
import { CashbookScreen } from '@/screens/Cashbook/CashbookScreen';
import { SettingsScreen } from '@/screens/Settings/SettingsScreen';
import { PreferencesScreen } from '@/screens/Preferences/PreferencesScreen';

const Tab = createBottomTabNavigator<BottomTabParamList>();

const VISIBLE_ICONS: Record<string, string> = {
  Records: 'format-list-bulleted',
  Analysis: 'chart-donut',
  Budgets: 'wallet-outline',
  Accounts: 'bank-outline',
  Categories: 'shape-outline',
};

const HIDDEN_TABS: (keyof BottomTabParamList)[] = ['Cashbook', 'Settings', 'Preferences'];

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const visibleRoutes = state.routes.filter((route) => !HIDDEN_TABS.includes(route.name as keyof BottomTabParamList));

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom + 8,
        },
      ]}
    >
      {visibleRoutes.map((route) => {
        const { options } = descriptors[route.key];
        const isFocused = state.routes[state.index].key === route.key;
        const icon = VISIBLE_ICONS[route.name];
        const label = options.title ?? route.name;
        const color = isFocused ? colors.gold : colors.textSecondary;

        function onPress() {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        }

        return (
          <TouchableOpacity key={route.key} style={styles.tabButton} onPress={onPress} activeOpacity={0.7}>
            <MaterialCommunityIcons name={icon as any} color={color} size={22} />
            <Text style={[styles.tabLabel, { color }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function BottomTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Records" component={RecordsScreen} />
      <Tab.Screen name="Analysis" component={AnalysisScreen} />
      <Tab.Screen name="Budgets" component={BudgetsScreen} />
      <Tab.Screen name="Accounts" component={AccountsScreen} />
      <Tab.Screen name="Categories" component={CategoriesScreen} />
      <Tab.Screen name="Cashbook" component={CashbookScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
      <Tab.Screen name="Preferences" component={PreferencesScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 1,
    paddingTop: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  tabLabel: { fontSize: 10, fontWeight: '600' },
});
