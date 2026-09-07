'use no memo';

import React from 'react';
import { FlexWidget, TextWidget, SvgWidget } from 'react-native-android-widget';

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
  '<svg viewBox="0 0 24 24"><path d="M7 7h11l-3-3 1.4-1.4L21.8 8 16.4 13.4 15 12l3-3H7zM17 17H6l3 3-1.4 1.4L2.2 16l5.4-5.4L9 12l-3 3h11z" fill="#262523"/></svg>';
const ICON_INSERT =
  '<svg viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" fill="#262523"/></svg>';

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
        flex: 1,
        width: 'match_parent',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor,
        borderRadius: 14,
      }}
    >
      <SvgWidget svg={icon} style={{ width: 20, height: 20 }} />
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
        backgroundColor: colors.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 10,
        flexGap: 10,
      }}
    >
      <FlexWidget
        style={{
          width: 64,
          height: 'match_parent',
          flexDirection: 'column',
          flexGap: 8,
        }}
      >
        <TypeButton type="INCOME" backgroundColor={colors.income} icon={ICON_INCOME} />
        <TypeButton type="EXPENSE" backgroundColor={colors.expense} icon={ICON_EXPENSE} />
        <TypeButton type="TRANSFER" backgroundColor={colors.gold} icon={ICON_TRANSFER} />
      </FlexWidget>

      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'spendhive://quickadd' }}
        accessibilityLabel="Insert transaction"
        style={{
          flex: 1,
          height: 'match_parent',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.gold,
          borderRadius: 16,
          flexGap: 6,
        }}
      >
        <SvgWidget svg={ICON_INSERT} style={{ width: 26, height: 26 }} />
        <TextWidget text="Insert" style={{ fontSize: 13, fontWeight: 'bold', color: colors.background }} />
      </FlexWidget>
    </FlexWidget>
  );
}
