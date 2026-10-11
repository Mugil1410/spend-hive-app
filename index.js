import 'react-native-get-random-values';
import { registerRootComponent } from 'expo';
import App from './App';
import { notifee } from './src/notifications/notifeeClient';
import { onBackgroundNotificationEvent } from './src/notifications/notificationTaps';

// Must be registered outside React so taps are handled while the app is backgrounded.
notifee?.onBackgroundEvent(onBackgroundNotificationEvent);

registerRootComponent(App);
