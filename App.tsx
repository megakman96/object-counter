import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';

import { RootStackParamList } from './src/types';
import SetupScreen from './src/screens/SetupScreen';
import CaptureScreen from './src/screens/CaptureScreen';
import ConfirmScreen from './src/screens/ConfirmScreen';
import CounterScreen from './src/screens/CounterScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync('anthropic_key').then(key => {
      setInitialRoute(key ? 'Capture' : 'Setup');
    });
  }, []);

  if (!initialRoute) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerStyle: { backgroundColor: '#0a0a0a' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: '#0a0a0a' },
          }}
        >
          <Stack.Screen
            name="Setup"
            component={SetupScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Capture"
            component={CaptureScreen}
            options={{ title: 'ObjectCounter', headerShown: false }}
          />
          <Stack.Screen
            name="Confirm"
            component={ConfirmScreen}
            options={{ title: 'Confirm Object', headerShown: false }}
          />
          <Stack.Screen
            name="Counter"
            component={CounterScreen}
            options={{ title: 'Live Counter', headerBackTitle: 'Retake' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
