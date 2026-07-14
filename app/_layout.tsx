import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { JobsProvider } from '@/state/jobs-context';
import { GeneratedAssetsProvider } from '@/state/generated-assets-context';
import { MediaProvider } from '@/state/media-context';
import { PairsProvider } from '@/state/pairs-context';

const JobToPostNavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.text,
    border: Colors.border,
    notification: Colors.danger,
  },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={JobToPostNavigationTheme}>
        <PairsProvider>
          <MediaProvider>
            <GeneratedAssetsProvider>
              <JobsProvider>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: Colors.background },
                  }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="job-camera" />
                  <Stack.Screen name="review" />
                  <Stack.Screen name="pair-review" />
                  <Stack.Screen name="create-post" options={{ gestureEnabled: false }} />
                  <Stack.Screen name="generated-asset" />
                </Stack>
                <StatusBar style="light" />
              </JobsProvider>
            </GeneratedAssetsProvider>
          </MediaProvider>
        </PairsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
