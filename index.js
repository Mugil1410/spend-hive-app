import { registerRootComponent } from 'expo';
import App from './App';
import { registerQuickAddWidget } from './src/widget/widget-task-handler';

registerQuickAddWidget();
registerRootComponent(App);
