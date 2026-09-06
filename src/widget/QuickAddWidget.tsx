import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

const colors = {
  surface: '#343330',
  border: '#484742',
  textPrimary: '#FFFFFF',
  textSecondary: '#A6A59E',
  expense: '#E86759',
  income: '#50B98A',
} as const;

export function QuickAddWidget() {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 12,
      }}
    >
      <TextWidget
        text="SpendHive"
        style={{ fontSize: 13, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 10 }}
      />
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', flexGap: 10 }}>
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'spendhive://quickadd?type=EXPENSE' }}
          style={{
            flex: 1,
            height: 52,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.expense,
            borderRadius: 14,
          }}
        >
          <TextWidget text="+ Expense" style={{ fontSize: 14, fontWeight: 'bold', color: colors.textPrimary }} />
        </FlexWidget>
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'spendhive://quickadd?type=INCOME' }}
          style={{
            flex: 1,
            height: 52,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.income,
            borderRadius: 14,
          }}
        >
          <TextWidget text="+ Income" style={{ fontSize: 14, fontWeight: 'bold', color: colors.textPrimary }} />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
