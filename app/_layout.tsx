import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { JobsProvider } from '@/state/jobs-context';
import { MediaProvider } from '@/state/media-context';
import { PairsProvider } from '@/state/pairs-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={DefaultTheme}>
        <PairsProvider>
          <MediaProvider>
            <JobsProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="job-camera" />
                <Stack.Screen name="review" />
                <Stack.Screen name="pair-review" />
              </Stack>
              <StatusBar style="dark" />
            </JobsProvider>
          </MediaProvider>
        </PairsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
