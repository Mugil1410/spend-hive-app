'use no memo';

import React from 'react';
import { FlexWidget, TextWidget, SvgWidget, ImageWidget } from 'react-native-android-widget';

const colors = {
  surface: '#343330',
  border: '#484742',
  textPrimary: '#FFFFFF',
  textSecondary: '#A6A59E',
  background: '#262523',
  expense: '#E86759',
  income: '#50B98A',
  gold: '#F5E59F',
} as const;

const ICON_INCOME =
  '<svg viewBox="0 0 24 24"><path d="M12 4l7 7h-4v9h-6v-9H5z" fill="#FFFFFF"/></svg>';
const ICON_EXPENSE =
  '<svg viewBox="0 0 24 24"><path d="M12 20l-7-7h4V4h6v9h4z" fill="#FFFFFF"/></svg>';
const ICON_TRANSFER =
  '<svg viewBox="0 0 24 24"><path d="M8 3l3 4H9v10H7V7H5z" fill="#262523"/><path d="M16 21l-3-4h2V7h2v10h2z" fill="#262523"/></svg>';

function TypeButton({
  type,
  backgroundColor,
  icon,
}: {
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  backgroundColor: `#${string}`;
  icon: string;
}) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: `spendhive://quickadd?type=${type}` }}
      accessibilityLabel={`Add ${type.toLowerCase()}`}
      style={{
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor,
        borderRadius: 20,
      }}
    >
      <SvgWidget svg={icon} style={{ width: 18, height: 18 }} />
    </FlexWidget>
  );
}

export function QuickAddWidget() {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <FlexWidget
        clickAction="OPEN_APP"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexGap: 8,
        }}
      >
        <ImageWidget
          image={require('../../assets/app-logo.png')}
          imageWidth={30}
          imageHeight={30}
          radius={8}
          resizeMode="contain"
        />
        <TextWidget text="SpendHive" style={{ fontSize: 15, fontWeight: 'bold', color: colors.textPrimary }} />
      </FlexWidget>

      <FlexWidget style={{ flexDirection: 'row', flexGap: 8 }}>
        <TypeButton type="INCOME" backgroundColor={colors.income} icon={ICON_INCOME} />
        <TypeButton type="EXPENSE" backgroundColor={colors.expense} icon={ICON_EXPENSE} />
        <TypeButton type="TRANSFER" backgroundColor={colors.gold} icon={ICON_TRANSFER} />
      </FlexWidget>
    </FlexWidget>
  );
}
