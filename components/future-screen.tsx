import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/ui/screen-container';
import { Colors, Radius, Spacing } from '@/constants/theme';

type FutureScreenProps = {
  title: string;
  message: string;
  icon: ComponentProps<typeof Ionicons>['name'];
};

export function FutureScreen({ title, message, icon }: FutureScreenProps) {
  return (
    <ScreenContainer>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={38} color={Colors.primary} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  iconCircle: {
    width: 82,
    height: 82,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
    marginBottom: Spacing.lg,
  },
  title: {
    color: Colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  message: {
    maxWidth: 320,
    color: Colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
