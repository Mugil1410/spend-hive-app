import React from 'react';
import { NavigationContainer, DefaultTheme, LinkingOptions } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { useTheme } from '@/theme/ThemeContext';
import { RootStackParamList } from './types';
import { DrawerNavigator } from './DrawerNavigator';
import { QuickAddModal } from '@/screens/Modals/QuickAddModal';
import { AccountFormModal } from '@/screens/Modals/AccountFormModal';
import { CategoryFormModal } from '@/screens/Modals/CategoryFormModal';
import { CashbookFormModal } from '@/screens/Modals/CashbookFormModal';
import { CashbookEntryDetailScreen } from '@/screens/Cashbook/CashbookEntryDetailScreen';
import { RecordPaymentModal } from '@/screens/Modals/RecordPaymentModal';
import { FilteredTransactionsScreen } from '@/screens/Records/FilteredTransactionsScreen';

const Stack = createStackNavigator<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['spendhive://'],
  config: {
    screens: {
      QuickAdd: 'quickadd',
    },
  },
};

export function RootNavigator() {
  const { colors, scheme } = useTheme();

  const navTheme = {
    ...DefaultTheme,
    dark: scheme === 'dark',
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      primary: colors.gold,
    },
  };

  return (
    <NavigationContainer theme={navTheme} linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Drawer" component={DrawerNavigator} />
        <Stack.Group screenOptions={{ ...TransitionPresets.ModalSlideFromBottomIOS, presentation: 'modal' }}>
          <Stack.Screen name="QuickAdd" component={QuickAddModal} />
          <Stack.Screen name="AccountForm" component={AccountFormModal} />
          <Stack.Screen name="CategoryForm" component={CategoryFormModal} />
          <Stack.Screen name="CashbookForm" component={CashbookFormModal} />
          <Stack.Screen name="CashbookEntryDetail" component={CashbookEntryDetailScreen} />
          <Stack.Screen name="RecordPayment" component={RecordPaymentModal} />
          <Stack.Screen name="FilteredTransactions" component={FilteredTransactionsScreen} />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
