import React from 'react';
import { registerWidgetTaskHandler, WidgetTaskHandlerProps } from 'react-native-android-widget';
import { QuickAddWidget } from './QuickAddWidget';

const nameToWidget = {
  QuickAdd: QuickAddWidget,
};

async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const Widget = nameToWidget[props.widgetInfo.widgetName as keyof typeof nameToWidget];
  if (!Widget) return;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(<Widget />);
      break;
    default:
      break;
  }
}

export function registerQuickAddWidget(): void {
  registerWidgetTaskHandler(widgetTaskHandler);
}
