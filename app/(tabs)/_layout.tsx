import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { getTabBarLayout } from '@/utils/tab-bar-layout';

type TabIconProps = {
  color: string;
  size: number;
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const tabBarLayout = getTabBarLayout(insets.bottom);

  return (
    <Tabs
      initialRouteName="(jobs)"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarButton: HapticTab,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: {
          height: tabBarLayout.height,
          paddingTop: 7,
          paddingBottom: tabBarLayout.paddingBottom,
          borderTopColor: Colors.border,
          backgroundColor: Colors.surface,
        },
      }}>
      <Tabs.Screen
        name="(jobs)"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <Ionicons name="briefcase" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: 'Capture',
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <Ionicons name="camera" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="content"
        options={{
          title: 'Content',
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <Ionicons name="layers" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          title: 'Settings',
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <Ionicons name="settings" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
