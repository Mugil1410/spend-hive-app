import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './types';

// Lets non-component code (e.g. notification taps) navigate.
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
