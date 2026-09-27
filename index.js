import 'react-native-get-random-values';
import { AppRegistry } from 'react-native';
import notifee from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';
import { onBackgroundNotificationEvent } from './src/notifications/notificationTaps';

// Must be registered outside React so taps are handled while the app is backgrounded.
notifee.onBackgroundEvent(onBackgroundNotificationEvent);

AppRegistry.registerComponent(appName, () => App);
