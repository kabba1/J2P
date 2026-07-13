import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';

type TabIconProps = {
  color: string;
  size: number;
};

export default function TabLayout() {
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
          minHeight: 64,
          paddingTop: 7,
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
          title: 'Settings',
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <Ionicons name="settings" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
