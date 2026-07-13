import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { JobMedia } from '@/types/media';
import { formatDate } from '@/utils/format-date';

type MediaGridItemProps = {
  media: JobMedia;
  missing?: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

export function MediaGridItem({ media, missing = false, onPress, onLongPress }: MediaGridItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${media.shotName || 'photo'}`}
      accessibilityHint="Long press to delete this photo"
      delayLongPress={450}
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {missing ? (
        <View style={styles.missing}>
          <Ionicons name="image-outline" size={34} color={Colors.textMuted} />
          <Text style={styles.missingText}>Photo file missing</Text>
        </View>
      ) : (
        <Image
          accessibilityLabel={media.shotName || 'Job photo'}
          cachePolicy="memory-disk"
          contentFit="cover"
          recyclingKey={media.id}
          source={{ uri: media.localUri }}
          style={styles.image}
          transition={120}
        />
      )}
      <View style={styles.meta}>
        <Text numberOfLines={1} style={styles.title}>
          {media.shotName || 'Untitled photo'}
        </Text>
        <Text style={styles.date}>{formatDate(media.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 2,
  },
  pressed: {
    opacity: 0.76,
  },
  image: {
    width: '100%',
    aspectRatio: 1.08,
    backgroundColor: Colors.surfaceMuted,
  },
  missing: {
    width: '100%',
    aspectRatio: 1.08,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceMuted,
  },
  missingText: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  meta: {
    padding: Spacing.md,
  },
  title: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  date: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
});
