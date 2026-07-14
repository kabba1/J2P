import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';

type ScreenContainerProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
}>;

const DEFAULT_EDGES: Edge[] = ['top', 'left', 'right'];

export function ScreenContainer({ children, style, edges = DEFAULT_EDGES }: ScreenContainerProps) {
  return (
    <SafeAreaView edges={edges} style={styles.safeArea}>
      <View style={[styles.container, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
